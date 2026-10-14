/* Fluxo em grade: caixas em posições fixas de uma grade (coluna, linha), ligações automáticas entre elas.
   Um nó pode ser um grupo com caixas dentro (`items`), cada uma alvo de ligação. Serve para anatomia de um
   sistema, linha de montagem com retorno, ciclo com decisão, entrada → função → saída…
   Em tela estreita, se a grade não cabe, ela é transposta: cada coluna vira uma linha (o título da coluna
   vem antes dela) e as ligações passam a descer; os lados fixos das ligações são espelhados junto. */
import { useRef } from "react"
import { cn } from "@/lib/utils"
import { H } from "../html"
import { BOX, Box, Legend, TEXT } from "./parts"
import { EdgeLayer, Fit, fitScale, useNodeRects, useWidth } from "./edges"
import type { DEdge, FlowSpec, Side } from "./types"

const ALIGN = { start: "items-start", center: "items-center", end: "items-end", stretch: "items-stretch" }
const REM = 16
// espelho pela diagonal: o que era à esquerda fica em cima, o que era embaixo fica à direita
const MIRROR: Record<Side, Side> = { left: "top", top: "left", right: "bottom", bottom: "right" }
const MIRROR_LABEL = { on: "on", above: "left", left: "above", below: "right", right: "below" } as const

export function FlowView({ spec }: { spec: FlowSpec }) {
  const outer = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLDivElement>(null)
  const w = useWidth(outer)
  const colW = spec.colW ?? 9
  const gap = spec.colGap ?? 1.75
  const rowGap = spec.rowGap ?? 2.5
  const rowsN = Math.max(1, ...spec.nodes.map((n) => n.at[1] + (n.span?.[1] ?? 1) - 1))
  const needW = (spec.cols * colW + (spec.cols - 1) * gap) * REM
  // na transposta as colunas podem ser mais estreitas (as caixas ficam uma embaixo da outra)
  const needT = (rowsN * Math.min(colW, 8) + (rowsN - 1) * rowGap) * REM
  // cabe: grade normal; falta pouco: a grade encolhe um pouco (Fit); falta muito: transposta, se couber
  const scale = spec.narrow === "scroll" ? 1 : fitScale(w, needW)
  const tr = scale === 0 && needT <= w
  const rects = useNodeRects(ref, `${spec.nodes.length}-${tr}`)

  // na grade transposta, cada coluna original vira uma linha, precedida do seu título (se houver)
  const rowOf: number[] = []
  const headRow: number[] = []
  if (tr) {
    let r = 1
    for (let c = 1; c <= spec.cols; c++) {
      if (spec.heads?.[c - 1]) headRow[c] = r++
      rowOf[c] = r++
    }
  }
  // vão vertical da transposta: as ligações descem por ele (e passam por trás das etiquetas, se houver)
  const gapT = Math.max(gap, spec.nodes.some((n) => n.tag) ? 3.25 : 2.25)

  const edges: DEdge[] = tr
    ? spec.edges.map((e) => ({
      ...e, fromSide: e.fromSide && MIRROR[e.fromSide], toSide: e.toSide && MIRROR[e.toSide], bend: e.bend && -e.bend,
      labelSide: e.labelSide && MIRROR_LABEL[e.labelSide],
    }))
    : spec.edges

  const place = (at: [number, number], span: [number, number]) => {
    const [c, r] = at, [cs, rs] = span
    if (!tr) return { gridColumn: `${c} / span ${cs}`, gridRow: `${r + (spec.heads ? 1 : 0)} / span ${rs}` }
    return { gridColumn: `${r} / span ${rs}`, gridRow: `${rowOf[c]} / ${rowOf[Math.min(spec.cols, c + cs - 1)] + 1}` }
  }

  // a etiqueta fica pendurada embaixo da caixa (fora do fluxo, para não desalinhar a linha): na última
  // linha da grade, reserva espaço para ela
  const lastTagged = spec.nodes.some((n) => n.tag && (tr ? n.at[0] + (n.span?.[0] ?? 1) - 1 === spec.cols : n.at[1] + (n.span?.[1] ?? 1) - 1 === rowsN))

  return (
    <div ref={outer} className="overflow-x-auto pb-1">
      <Fit scale={tr || !scale ? 1 : scale} width={needW}>
      <div ref={ref} className="relative mx-auto grid"
        style={tr ? {
          gridTemplateColumns: `repeat(${rowsN}, minmax(0, 1fr))`,
          columnGap: `${rowGap}rem`,
          rowGap: `${gapT}rem`,
          paddingBottom: lastTagged ? "2rem" : undefined,
        } : {
          gridTemplateColumns: `repeat(${spec.cols}, minmax(${colW}rem, 1fr))`,
          columnGap: `${gap}rem`,
          rowGap: `${rowGap}rem`,
          minWidth: `${spec.cols * colW + (spec.cols - 1) * gap}rem`,
          maxWidth: `${spec.cols * colW * 2}rem`,
          paddingBottom: lastTagged ? "2rem" : undefined,
        }}>
        {spec.heads?.map((h, i) => h ? (
          <div key={"h" + i} style={tr ? { gridColumn: "1 / -1", gridRow: headRow[i + 1], marginBottom: `${0.4 - gapT}rem` } : { gridColumn: i + 1, gridRow: 1 }}
            className="text-muted-foreground -mb-1 self-end text-center text-[11px] font-semibold tracking-[.04em]">
            <H html={h} />
          </div>
        ) : null)}
        {spec.nodes.map((n) => {
          const stretch = n.align === "stretch"
          // mesma altura só para quem ocupa uma linha da grade (na transposta, as linhas são as colunas)
          const same = spec.sameHeight && (n.span?.[tr ? 0 : 1] ?? 1) === 1
          return (
            <div key={n.id} className={cn("flex min-w-0 flex-col justify-center", ALIGN[n.align ?? "center"])}
              style={place(n.at, n.span ?? [1, 1])}>
              <Box b={n} node={n.id} className={cn(stretch && "w-full max-w-none!", n.items && "px-3 pt-2.5 pb-3", same && "flex flex-1 flex-col justify-center")}>
                {n.items && (
                  <div className="mt-2.5 grid gap-2 text-left">
                    {n.items.map((it, i) => <Box key={i} b={{ tone: "plain", ...it }} node={it.id} className="max-w-none! text-left" />)}
                  </div>
                )}
                {/* etiqueta pendurada sob a caixa, por cima das ligações: uma seta que desce passa "por trás" dela */}
                {n.tag && <H as="div" html={n.tag} className={cn("absolute top-full left-1/2 z-[2] mt-2 -translate-x-1/2 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
                  n.tagTone ? [BOX[n.tagTone], TEXT[n.tagTone]] : "border-border bg-secondary text-soft-foreground")} />}
              </Box>
            </div>
          )
        })}
        <EdgeLayer rects={rects} edges={edges} route={spec.route} />
      </div>
      </Fit>
      {spec.foot && <div className="mt-4 flex justify-center"><Box b={{ maxW: 44, ...spec.foot }} /></div>}
      {spec.legend && <Legend items={spec.legend} />}
    </div>
  )
}
