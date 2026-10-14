/* Desenhos em sequência: cadeia de etapas, faixa ordenada (precedência), linha do tempo, lista encadeada
   (células "valor | ponteiro") e recursão (chamadas que descem, valores que sobem). Viram coluna quando
   não cabem na largura. */
import { Fragment, useRef } from "react"
import { cn } from "@/lib/utils"
import { H } from "../html"
import { EdgeLayer, useNodeRects, useWidth, type ExtraPath } from "./edges"
import { Box, Foot, SOLID } from "./parts"
import type { CellsSpec, ChainSpec, RecursionSpec, StripSpec, TimelineSpec } from "./types"

const REM = 16

/** Seta entre dois itens: para a direita em linha, para baixo em coluna. */
function Arrow({ down, className }: { down?: boolean; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={cn("stroke-muted-foreground size-5 shrink-0 fill-none", down && "rotate-90", className)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12h15M13 6l6 6-6 6" />
    </svg>
  )
}

/* ---------- cadeia ---------- */

export function ChainView({ spec }: { spec: ChainSpec }) {
  const ref = useRef<HTMLDivElement>(null)
  const w = useWidth(ref)
  const n = spec.items.length
  const itemW = spec.itemW ?? 7.5
  // quantos itens cabem lado a lado: todos (uma linha), alguns (linhas ligadas por uma seta de retorno)
  // ou um só (coluna)
  const fit = w === 0 || w >= (spec.rowFrom ?? n * itemW) * REM ? n : Math.floor(w / (itemW * REM))
  const mode = fit >= n ? "row" : fit >= 2 && spec.wrap !== false ? "wrap" : "col"
  const rows = mode === "wrap" ? Math.ceil(n / fit) : 1
  const k = Math.ceil(n / rows) // itens por linha, equilibrado (6 em 2 linhas: 3 + 3)
  const rects = useNodeRects(ref, `${mode}-${k}`)
  const sep = (i: number) => {
    const s = spec.seps?.[i]
    if (s && typeof s === "object") return <Box b={{ shape: "circle", size: "lg", ...s }} />
    if (s) return <H html={s} className="formula-font text-soft-foreground px-1 text-[20px] font-semibold" />
    return <Arrow down={mode === "col"} />
  }
  const sepText = (i: number) => {
    const s = spec.seps?.[i]
    return s && typeof s === "object" ? s.label : s
  }
  // cada linha da cadeia ocupa 4 linhas da grade: caixas, textos de baixo, chaves e o vão até a próxima
  const at = (i: number) => ({ r: Math.floor(i / k), c: i % k })
  const brackets = (spec.brackets ?? []).map((b) => ({ ...b, inRow: mode !== "col" && at(b.from).r === at(b.to).r }))

  // seta de retorno: sai do último item da linha pela direita, desce pelo vão da direita, volta por baixo
  // da linha e entra por cima no primeiro item da linha seguinte (com o separador, se houver, como rótulo)
  const extra: ExtraPath[] = []
  for (let r = 0; mode === "wrap" && r < rows - 1; r++) {
    const last = (r + 1) * k - 1
    const a = rects["i" + last], b = rects["i" + (last + 1)], gap = rects["gap" + r]
    if (!a || !b || !gap) continue
    const R = 8
    const x1 = a.x + a.w, y1 = a.y + a.h / 2, gx = x1 + 10, ym = gap.y + gap.h / 2, x2 = b.x + b.w / 2, y2 = b.y
    const s = sepText(last)
    extra.push({
      d: `M${x1},${y1} H${gx - R} Q${gx},${y1} ${gx},${y1 + R} V${ym - R} Q${gx},${ym} ${gx - R},${ym} H${x2 + R} Q${x2},${ym} ${x2},${ym + R} V${y2}`,
      arrow: true, at: [(gx + x2) / 2, ym],
      label: s ? <H html={s} className="formula-font text-[15px] font-semibold" /> : undefined,
    })
  }

  return (
    <div ref={ref} className="relative">
      {mode !== "col" ? (
        // linha(s): uma grade só, com as caixas de cada linha lado a lado (mesma altura) e os textos de
        // baixo na linha seguinte; as colunas são as mesmas em todas as linhas, então tudo se alinha
        <div className="grid items-stretch" style={{
          gridTemplateColumns: Array.from({ length: k }, () => "minmax(0,1fr)").join(" auto ") + (mode === "wrap" ? " 1.25rem" : ""),
          gridTemplateRows: Array.from({ length: rows }, (_, r) => (r < rows - 1 ? "auto auto auto 2rem" : "auto auto auto")).join(" "),
        }}>
          {spec.items.map((it, i) => {
            const { r, c } = at(i)
            return (
              <Fragment key={i}>
                <div className="flex min-w-0 justify-center" style={{ gridColumn: c * 2 + 1, gridRow: r * 4 + 1 }}>
                  <Box node={"i" + i} b={{ maxW: 40, ...it }} className="flex w-full flex-col justify-center" />
                </div>
                {c < k - 1 && i < n - 1 && <div className="grid place-items-center px-1.5" style={{ gridColumn: c * 2 + 2, gridRow: r * 4 + 1 }}>{sep(i)}</div>}
                {it.below && (
                  <div className="mt-1.5" style={{ gridColumn: c * 2 + 1, gridRow: r * 4 + 2 }}>
                    <H as="div" html={it.below} className="text-muted-foreground text-center text-[11.5px] leading-snug" />
                  </div>
                )}
              </Fragment>
            )
          })}
          {brackets.map((b, j) => b.inRow && (
            <div key={"b" + j} className="mt-2 px-2" style={{ gridColumn: `${at(b.from).c * 2 + 1} / ${at(b.to).c * 2 + 2}`, gridRow: at(b.from).r * 4 + 3 }}>
              <div aria-hidden className="border-border-strong h-2 rounded-b-md border-x-2 border-b-2" />
              <H as="div" html={b.label} className="text-muted-foreground mt-1 text-center text-[12px] leading-snug" />
            </div>
          ))}
          {Array.from({ length: rows - 1 }, (_, r) => <div key={"g" + r} data-node={"gap" + r} style={{ gridColumn: "1 / -1", gridRow: r * 4 + 4 }} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1.5">
          {spec.items.map((it, i) => (
            <Fragment key={i}>
              <div className="flex w-full max-w-[22rem] flex-col items-center">
                <Box b={{ maxW: 22, ...it }} className="w-full" />
                {it.below && <H as="div" html={it.below} className="text-muted-foreground mt-1 text-center text-[11.5px] leading-snug" />}
              </div>
              {i < n - 1 && sep(i)}
            </Fragment>
          ))}
        </div>
      )}
      {extra.length > 0 && <EdgeLayer rects={rects} edges={[]} extra={extra} />}
      {/* chave que não cabe numa linha só (ou na coluna): vira nota embaixo */}
      {brackets.map((b, j) => !b.inRow && <Foot key={"bf" + j} html={b.label} />)}
      <Foot html={spec.foot} />
    </div>
  )
}

/* ---------- faixa ordenada ---------- */

export function StripView({ spec }: { spec: StripSpec }) {
  const n = spec.items.length
  return (
    <div>
      <div className="flex overflow-hidden rounded-[12px] border">
        {spec.items.map((x, i) => {
          // do acento cheio (o mais forte) ao acento suave (o mais fraco)
          const pct = n > 1 ? Math.round(100 - (i / (n - 1)) * 82) : 100
          return (
            <div key={i} className={cn("flex-1 py-3 text-center text-[20px] font-semibold", pct > 52 ? "text-primary-foreground" : "text-primary", spec.mono && "formula-font")}
              style={{ background: `color-mix(in oklch, var(--primary) ${pct}%, var(--primary-soft))` }}>
              <H html={x} />
            </div>
          )
        })}
      </div>
      {(spec.from || spec.to) && (
        <div className="text-soft-foreground mt-2 flex justify-between gap-4 text-[12px] font-semibold">
          <H html={spec.from} /><H html={spec.to} className="text-right" />
        </div>
      )}
    </div>
  )
}

/* ---------- linha do tempo ---------- */

export function TimelineView({ spec }: { spec: TimelineSpec }) {
  const ref = useRef<HTMLDivElement>(null)
  const w = useWidth(ref)
  const n = spec.events.length
  const row = w === 0 || w >= n * 6.6 * REM
  return (
    <div ref={ref}>
      {row ? (
        <ol className="relative grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0,1fr))` }}>
          <span aria-hidden className="bg-alerta-line absolute top-[2.15rem] right-[calc(50%/var(--n))] left-[calc(50%/var(--n))] h-1 rounded-full" style={{ ["--n" as string]: n }} />
          {spec.events.map((e, i) => (
            <li key={i} className="relative my-0! flex flex-col items-center px-1 text-center">
              <H as="div" html={e.when} className={cn("font-mono text-[13px] font-bold", e.highlight ? "text-examen text-[14px]" : "text-alerta")} />
              <span aria-hidden className={cn("my-1.5 grid place-items-center rounded-full border-2", e.highlight ? "bg-examen border-examen size-5" : "bg-alerta border-alerta size-4")} />
              <H as="div" html={e.title} className="text-[12.5px] leading-snug font-semibold" />
              {e.sub && <H as="div" html={e.sub} className="text-muted-foreground mt-0.5 text-[11.5px] leading-snug" />}
            </li>
          ))}
        </ol>
      ) : (
        <ol className="border-alerta-line relative ml-2 grid gap-3 border-l-4 pl-5">
          {spec.events.map((e, i) => (
            <li key={i} className="relative my-0!">
              <span aria-hidden className={cn("absolute top-1 -left-[1.95rem] rounded-full border-2", e.highlight ? "bg-examen border-examen size-5 -left-[2.05rem]" : "bg-alerta border-alerta size-4")} />
              <H as="span" html={e.when} className={cn("mr-2 font-mono text-[13px] font-bold", e.highlight ? "text-examen" : "text-alerta")} />
              <H as="span" html={e.title} className="text-[13px] font-semibold" />
              {e.sub && <H as="div" html={e.sub} className="text-muted-foreground text-[12px]" />}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

/* ---------- células encadeadas ---------- */

export function CellsView({ spec }: { spec: CellsSpec }) {
  const labelCount = spec.labelCount ?? (spec.labels ? 2 : 0)
  return (
    <div>
      <div className="pb-1">
        {/* em tela estreita a cadeia continua na linha de baixo (a seta no fim da linha indica a continuação) */}
        <div className="flex flex-wrap items-start justify-center gap-y-3">
          {spec.cells.map((c, i) => (
            <Fragment key={i}>
              <div className="flex flex-col items-center">
                <div className="flex">
                  <div className={cn("grid h-11 min-w-11 place-items-center rounded-l-[10px] border-2 px-3 font-mono text-[15px] font-bold", SOLID[c.tone ?? "ink"])}><H html={c.value} /></div>
                  <div className="border-border-strong bg-secondary grid h-11 w-11 place-items-center rounded-r-[10px] border-2 border-l-0"><span className="bg-foreground size-2.5 rounded-full" /></div>
                </div>
                {spec.labels && i < labelCount && (
                  <div className="text-muted-foreground mt-1 grid w-full grid-cols-2 gap-1 text-[11px]">
                    <H html={spec.labels[0]} className="text-center" /><H html={spec.labels[1]} className="text-center" />
                  </div>
                )}
              </div>
              <div className="flex h-11 items-center px-1"><Arrow /></div>
            </Fragment>
          ))}
          <div className="border-alerta-line bg-alerta-bg text-alerta grid h-11 place-items-center rounded-[10px] border-2 px-3 font-mono text-[15px] font-bold"><H html={spec.end ?? "[ ]"} /></div>
        </div>
      </div>
      {spec.foot && <H as="div" html={spec.foot} className="formula-font text-primary mt-3 text-center text-[15px] font-semibold" />}
    </div>
  )
}

/* ---------- recursão ---------- */

export function RecursionView({ spec }: { spec: RecursionSpec }) {
  const rows = spec.frames.length
  return (
    <div>
      {/* recuo em escada: 1,5 rem por nível, menos em tela estreita (min com vw) */}
      <div className="mx-auto grid w-fit grid-cols-[auto_auto] items-center gap-x-4 gap-y-1 sm:gap-x-8">
        {spec.frames.map((f, i) => (
          <Fragment key={i}>
            <div style={{ marginLeft: `min(${i * 1.5}rem, ${i * 4}vw)` }}>
              <Box b={{ label: f.call, mono: true, tone: "warn", maxW: 22 }} className="text-left" />
            </div>
            <H as="div" html={f.result ?? ""} className="formula-font text-lab text-[14px] font-semibold" />
            {/* desce para a próxima chamada · o valor sobe da próxima linha */}
            <div aria-hidden className="text-alerta text-[18px] leading-none font-bold" style={{ marginLeft: `calc(min(${i * 1.5}rem, ${i * 4}vw) + 0.6rem)` }}>↘</div>
            <div aria-hidden className="text-lab pl-6 text-[18px] leading-none font-bold">↑</div>
          </Fragment>
        ))}
        <div style={{ marginLeft: `min(${rows * 1.5}rem, ${rows * 4}vw)` }}>
          <Box b={{ label: spec.base, mono: true, tone: "ok", maxW: 22 }} className="text-left" />
        </div>
        <div aria-hidden className="text-lab pl-6 text-[18px] leading-none font-bold">⤴</div>
      </div>
      <Foot html={spec.foot} />
    </div>
  )
}
