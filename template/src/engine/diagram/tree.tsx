/* Árvore: cada folha ganha uma coluna da grade e cada nó fica centrado sobre as folhas que estão abaixo
   dele (uma linha por nível). As ligações descem do pé do pai para o topo do filho. Serve para árvore
   sintática, de decisão, de prova (árvore E), de busca SLD com backtracking, genealógica…
   Em tela estreita demais para as folhas lado a lado, vira um sumário indentado (fios ├ └ ligando cada
   nó aos filhos), com os mesmos rótulos, cores, ramos E e ramos cortados. */
import { useRef } from "react"
import { Scissors } from "lucide-react"
import { cn } from "@/lib/utils"
import { H } from "../html"
import { Box, EDGE_TEXT, Foot, Legend, STROKE } from "./parts"
import { EdgeLayer, Fit, edgeGeom, fitScale, useNodeRects, useWidth, type ExtraPath } from "./edges"
import type { DEdge, ETone, TreeNode, TreeSpec } from "./types"

const REM = 16

interface Placed { n: TreeNode; id: string; depth: number; col: number; span: number; parent?: string }

function place(root: TreeNode) {
  const list: Placed[] = []
  let leaf = 0, depth = 0
  const walk = (n: TreeNode, d: number, parent: string | undefined, path: string) => {
    const id = n.id ?? "t" + path
    depth = Math.max(depth, d)
    if (!n.children?.length) {
      list.push({ n, id, depth: d, col: leaf, span: 1, parent })
      leaf++
      return
    }
    const start = leaf
    const me: Placed = { n, id, depth: d, col: start, span: 0, parent }
    list.push(me)
    n.children.forEach((c, i) => walk(c, d + 1, id, `${path}-${i}`))
    me.span = leaf - start
  }
  walk(root, 0, undefined, "0")
  return { list, leaves: Math.max(1, leaf), levels: depth + 1 }
}

export function TreeView({ spec }: { spec: TreeSpec }) {
  const outer = useRef<HTMLDivElement>(null)
  const w = useWidth(outer)
  const placed = place(spec.root)
  const leafW = spec.leafW ?? 8.5
  // largura que o desenho pede (folhas + vãos + a margem do marcador de ordem); faltando pouco, encolhe;
  // faltando muito, vira sumário
  const need = (placed.leaves * leafW + (placed.leaves - 1) * 0.75) * REM + 20
  const scale = spec.narrow === "scroll" ? 1 : fitScale(w, need)
  return (
    <div ref={outer}>
      {scale === 0 ? <Outline spec={spec} list={placed.list} /> : <Fit scale={scale} width={need}><TreeGrid spec={spec} {...placed} /></Fit>}
      {spec.legend && <Legend items={spec.legend} />}
      <Foot html={spec.foot} />
    </div>
  )
}

/* ---------- árvore desenhada (folhas lado a lado) ---------- */

function TreeGrid({ spec, list, leaves, levels }: { spec: TreeSpec } & ReturnType<typeof place>) {
  const ref = useRef<HTMLDivElement>(null)
  const rects = useNodeRects(ref, list.length)
  const leafW = spec.leafW ?? 8.5
  const labeled = list.some((p) => p.n.edge)
  const route = spec.edges === "straight" ? "straight" : spec.edges === "elbow" ? "elbow" : "curve"

  const edges: DEdge[] = list.filter((p) => p.parent).map((p) => ({
    from: p.parent!, to: p.id, label: p.n.edge, tone: p.n.edgeTone, dash: p.n.edgeDash, cut: p.n.cut,
    fromSide: "bottom", toSide: "top", arrow: spec.arrows ?? true, labelSide: p.n.edgeSide,
  }))

  // árvore E: um arco tracejado cruzando as ligações que saem do nó, logo abaixo dele
  const extra: ExtraPath[] = []
  for (const p of list) {
    if (!p.n.and) continue
    const kids = list.filter((c) => c.parent === p.id).sort((a, b) => a.col - b.col)
    const a = rects[p.id]
    if (kids.length < 2 || !a) continue
    const pts = kids.map((k) => (rects[k.id] ? edgeGeom(a, rects[k.id], { fromSide: "bottom", toSide: "top" }, route).at(0.28) : null)).filter((x): x is [number, number] => !!x)
    if (pts.length < 2) continue
    const [l, r] = [pts[0], pts[pts.length - 1]]
    const cy = Math.max(...pts.map((q) => q[1])) + 10
    extra.push({ d: `M${l[0]},${l[1]} Q${(l[0] + r[0]) / 2},${cy} ${r[0]},${r[1]}`, tone: "warn", dash: true })
  }

  return (
    // px: espaço para o marcador de ordem (badge), que sai um pouco para fora da caixa
    <div className="overflow-x-auto px-2.5 pt-2.5 pb-1">
      <div ref={ref} className="relative mx-auto grid"
        style={{
          gridTemplateColumns: `repeat(${leaves}, minmax(${leafW}rem, 1fr))`,
          gridTemplateRows: `repeat(${levels}, auto)`,
          columnGap: "0.75rem",
          rowGap: labeled ? "3.6rem" : "2.6rem",
          minWidth: `${leaves * leafW + (leaves - 1) * 0.75}rem`,
          maxWidth: `${leaves * leafW * 2.1}rem`,
        }}>
        {list.map((p) => (
          <div key={p.id} className="flex flex-col items-center"
            style={{ gridColumn: `${p.col + 1} / span ${p.span}`, gridRow: p.depth + 1 }}>
            <Box b={p.n} node={p.id} />
            {p.n.below && <H as="div" html={p.n.below} className="text-soft-foreground mt-1.5 text-center text-[12px] leading-snug" />}
          </div>
        ))}
        <EdgeLayer rects={rects} edges={[...edges, ...(spec.links ?? [])]} route={route} arrows={spec.arrows ?? true} extra={extra} spread={false} />
      </div>
    </div>
  )
}

/* ---------- sumário indentado (tela estreita) ---------- */

const LINE: Record<ETone, string> = {
  plain: "border-border-strong", accent: "border-primary", ok: "border-lab", bad: "border-alerta",
  warn: "border-examen", info: "border-clave", muted: "border-border",
}

function OutlineKids({ n }: { n: TreeNode }) {
  const kids = n.children ?? []
  return (
    <div className="mt-1">
      {kids.map((c, i) => {
        const last = i === kids.length - 1
        // filhos de um nó E: fio tracejado âmbar (o "arco E" do desenho grande)
        const tone: ETone = c.cut ? "bad" : c.edgeTone ?? (n.and ? "warn" : "plain")
        const line = cn(LINE[tone], c.cut || c.edgeDash || n.and ? "border-dashed" : "border-solid")
        return (
          <div key={i} className="relative pt-2 pl-6">
            {/* fio vertical (no último filho, só até o tique) e tique horizontal até o nó */}
            <span aria-hidden className={cn("absolute top-0 left-2 w-0 border-l-2", line, last ? "h-[1.75rem]" : "bottom-0")} />
            <span aria-hidden className={cn("absolute top-[1.75rem] left-2 w-3 border-t-2", line)} />
            {(c.edge || c.cut) && (
              <div className={cn("mb-1 flex min-h-[1.1rem] items-center gap-1 text-[11.5px] leading-tight font-medium", EDGE_TEXT[tone])}>
                {c.cut && <Scissors className="size-3.5 shrink-0" aria-label="ramo cortado" />}
                {c.edge && <H html={c.edge} />}
              </div>
            )}
            <Box b={c} className="w-fit" />
            {c.below && <H as="div" html={c.below} className="text-soft-foreground mt-1 text-[12px] leading-snug" />}
            {c.children?.length ? <OutlineKids n={c} /> : null}
          </div>
        )
      })}
    </div>
  )
}

function Outline({ spec, list }: { spec: TreeSpec; list: Placed[] }) {
  const name = new Map(list.map((p) => [p.id, p.n.label ?? p.id]))
  return (
    <div>
      <Box b={spec.root} className="w-fit" />
      <OutlineKids n={spec.root} />
      {/* ligações extras (fora da hierarquia), como lista: "Pedro ⇢ Ana: avô" */}
      {spec.links?.length ? (
        <div className="mt-3 grid gap-1">
          {spec.links.map((l, i) => (
            <div key={i} className={cn("flex flex-wrap items-center gap-1.5 text-[12px]", EDGE_TEXT[l.tone ?? "plain"])}>
              <H html={name.get(l.from) ?? l.from} className="text-foreground font-semibold" />
              <svg width="26" height="8" aria-hidden><line x1="1" y1="4" x2="25" y2="4" className={STROKE[l.tone ?? "plain"]} strokeWidth={2} strokeDasharray={l.dash ? "4 3" : undefined} /></svg>
              <H html={name.get(l.to) ?? l.to} className="text-foreground font-semibold" />
              {l.label && <H html={`: ${l.label}`} className="font-medium" />}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}
