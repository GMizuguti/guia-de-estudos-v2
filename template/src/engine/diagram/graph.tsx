/* Grafo de nós redondos em posições fixas (viewBox w × h), um ou mais painéis lado a lado: relação
   "x ama y", dependências… Aresta de um nó para ele mesmo vira laço por cima do nó. */
import { useId } from "react"
import { cn } from "@/lib/utils"
import { H } from "../html"
import { ARROW_FILL, BOX, ETONES, STROKE, TEXT } from "./parts"
import type { DTone, GEdge, GNode, GraphSpec } from "./types"

// nó comum: fundo do cartão e contorno na cor do papel (contrasta com o fundo colorido do painel);
// nó `strong`: cor cheia, para o destaque da figura
const NODE: Record<DTone, string> = {
  plain: "fill-card stroke-border-strong",
  soft: "fill-card stroke-primary-line",
  accent: "fill-card stroke-primary",
  ink: "fill-card stroke-foreground",
  ok: "fill-card stroke-lab",
  bad: "fill-card stroke-alerta",
  warn: "fill-card stroke-examen",
  info: "fill-card stroke-clave",
  muted: "fill-card stroke-border",
  note: "fill-transparent stroke-transparent",
}
const STRONG: Record<DTone, string> = {
  plain: "fill-muted-foreground stroke-muted-foreground",
  soft: "fill-primary-line stroke-primary-line",
  accent: "fill-primary stroke-primary",
  ink: "fill-foreground stroke-foreground",
  ok: "fill-lab stroke-lab",
  bad: "fill-alerta stroke-alerta",
  warn: "fill-examen stroke-examen",
  info: "fill-clave stroke-clave",
  muted: "fill-border-strong stroke-border-strong",
  note: "fill-transparent stroke-transparent",
}
const STRONG_LABEL: Partial<Record<DTone, string>> = { accent: "fill-primary-foreground", soft: "fill-foreground", muted: "fill-foreground", note: "fill-foreground" }

function Panel({ p }: { p: GraphSpec["panels"][number] }) {
  const uid = "g" + useId().replace(/[^a-zA-Z0-9]/g, "")
  const at = new Map(p.nodes.map((n) => [n.id, n]))
  const directed = p.directed ?? true
  const rOf = (n: GNode) => n.r ?? 22
  const edge = (e: GEdge, i: number) => {
    const a = at.get(e.from), b = at.get(e.to)
    if (!a || !b) return null
    const t = e.tone ?? "plain"
    const cls = cn("fill-none", STROKE[t])
    const marker = directed ? `url(#${uid}-${t})` : undefined
    if (a === b) {
      // laço: sai pela esquerda do topo e volta pela direita
      const r = rOf(a)
      const s = [a.x - r * 0.6, a.y - r * 0.8], f = [a.x + r * 0.6, a.y - r * 0.8 - 1]
      const d = `M${s[0]},${s[1]} C${a.x - r * 1.6},${a.y - r * 2.8} ${a.x + r * 1.6},${a.y - r * 2.8} ${f[0]},${f[1]}`
      return <path key={i} d={d} className={cls} strokeWidth={2} strokeDasharray={e.dash ? "5 4" : undefined} markerEnd={marker} />
    }
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1
    const ux = dx / len, uy = dy / len
    const x1 = a.x + ux * rOf(a), y1 = a.y + uy * rOf(a), x2 = b.x - ux * (rOf(b) + 2), y2 = b.y - uy * (rOf(b) + 2)
    const mx = (x1 + x2) / 2 - uy * 12, my = (y1 + y2) / 2 + ux * 12
    return (
      <g key={i}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} className={cls} strokeWidth={2} strokeDasharray={e.dash ? "5 4" : undefined} markerEnd={marker} />
        {e.label && (
          <g>
            <rect x={mx - 13} y={my - 9} width={26} height={18} rx={5} className="fill-card" />
            <text x={mx} y={my + 4.5} textAnchor="middle" className="fill-soft-foreground font-mono text-[12px] font-semibold">{e.label}</text>
          </g>
        )}
      </g>
    )
  }
  const desc = p.edges.map((e) => `${e.from} → ${e.to}`).join("; ")
  return (
    <div className={cn("flex min-w-0 flex-col items-center rounded-[14px] border px-3 pt-3 pb-2", BOX[p.tone ?? "plain"])}>
      {p.title && <H as="div" html={p.title} className={cn("formula-font text-center text-[14px] font-bold", TEXT[p.tone ?? "plain"])} />}
      {p.sub && <H as="div" html={p.sub} className="text-soft-foreground text-center text-[12px]" />}
      <svg viewBox={`0 0 ${p.w} ${p.h}`} className="mt-1 block h-auto w-full font-sans" style={{ maxWidth: p.w }} role="img" aria-label={desc}>
        {directed && (
          <defs>
            {ETONES.map((t) => (
              <marker key={t} id={`${uid}-${t}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className={ARROW_FILL[t]} />
              </marker>
            ))}
          </defs>
        )}
        {p.edges.map(edge)}
        {p.nodes.map((n) => {
          const t = n.tone ?? "plain"
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={rOf(n)} className={cn(n.strong ? STRONG[t] : NODE[t], "stroke-2")} />
              <text x={n.x} y={n.y + (n.strong ? 5.5 : 4.5)} textAnchor="middle"
                className={cn("font-bold", n.strong ? ["text-[16px]", STRONG_LABEL[t] ?? "fill-background"] : "fill-foreground text-[13px]")}>{n.label ?? n.id}</text>
            </g>
          )
        })}
      </svg>
      {p.below && <H as="div" html={p.below} className={cn("text-center text-[12px] font-medium", TEXT[p.tone ?? "plain"])} />}
    </div>
  )
}

export function GraphPanels({ spec }: { spec: GraphSpec }) {
  return (
    <div className={cn("grid gap-3", spec.panels.length > 1 && "sm:grid-cols-2")}>
      {spec.panels.map((p, i) => <Panel key={i} p={p} />)}
    </div>
  )
}
