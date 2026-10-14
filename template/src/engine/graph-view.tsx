/* Grafo em SVG para esquemas e simuladores (src/content/figuras.tsx): nós em posições fixas, de cima para
   baixo, num viewBox w × h; arestas com rótulo opcional (custo, peso); cor por papel, nunca por matéria.
   O simulador passo a passo (./stepper) recalcula os papéis a cada passo. */
import { useId } from "react"
import { cn } from "@/lib/utils"

/** Papel do nó: cur = o da vez (acento cheio) · next = em exame (tracejado) · wait = aguardando a vez
 *  (fila, pilha, fronteira) · done = já tratado · ok = objetivo, resultado · bad = erro, podado · muted = fora */
export type NodeTone = "plain" | "cur" | "next" | "wait" | "done" | "ok" | "bad" | "muted"
/** Papel da aresta: hot = em exame, caminho atual · ok = caminho ou árvore do resultado · bad = errada · muted = fora */
export type EdgeTone = "plain" | "hot" | "ok" | "bad" | "muted"

export interface GraphNode { id: string; x: number; y: number; label?: string; sub?: string; tone?: NodeTone }
export interface GraphEdge { from: string; to: string; label?: string; tone?: EdgeTone }

const NODE: Record<NodeTone, string> = {
  plain: "fill-card stroke-border-strong",
  cur: "fill-primary stroke-primary",
  next: "fill-primary-soft stroke-primary",
  wait: "fill-examen-bg stroke-examen",
  done: "fill-secondary stroke-muted-foreground",
  ok: "fill-lab-bg stroke-lab",
  bad: "fill-alerta-bg stroke-alerta",
  muted: "fill-card stroke-border",
}
const DOT: Record<NodeTone, string> = {
  plain: "bg-card border-border-strong",
  cur: "bg-primary border-primary",
  next: "bg-primary-soft border-primary border-dashed",
  wait: "bg-examen-bg border-examen",
  done: "bg-secondary border-muted-foreground",
  ok: "bg-lab-bg border-lab",
  bad: "bg-alerta-bg border-alerta",
  muted: "bg-card border-border",
}
const EDGE: Record<EdgeTone, string> = {
  plain: "stroke-border-strong",
  hot: "stroke-primary",
  ok: "stroke-lab",
  bad: "stroke-alerta",
  muted: "stroke-border",
}
const ARROW: Record<EdgeTone, string> = {
  plain: "fill-border-strong",
  hot: "fill-primary",
  ok: "fill-lab",
  bad: "fill-alerta",
  muted: "fill-border",
}
const TONES = Object.keys(EDGE) as EdgeTone[]

/** Grafo dirigido (setas) ou não dirigido (directed={false}); `sub` é um rótulo pequeno embaixo do nó (h = 3, d = 1). */
export function GraphView({ nodes, edges, w, h, r = 19, directed = true, label, className }: {
  nodes: GraphNode[]
  edges: GraphEdge[]
  w: number
  h: number
  r?: number
  directed?: boolean
  label?: string
  className?: string
}) {
  const at = new Map(nodes.map((n) => [n.id, n]))
  const uid = "g" + useId().replace(/[^a-zA-Z0-9]/g, "")
  const desc = label ?? `Grafo: ${edges.map((e) => `${e.from} ${directed ? "para" : "e"} ${e.to}${e.label ? `, ${e.label}` : ""}`).join("; ")}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("mx-auto block h-auto w-full font-sans", className)} style={{ maxWidth: w }} role="img" aria-label={desc}>
      {directed && (
        <defs>
          {TONES.map((t) => (
            <marker key={t} id={`${uid}-${t}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" className={ARROW[t]} />
            </marker>
          ))}
        </defs>
      )}
      {edges.map((e, i) => {
        const a = at.get(e.from), b = at.get(e.to)
        if (!a || !b) return null
        const t = e.tone ?? "plain"
        const stroke = cn("fill-none", EDGE[t], t === "plain" || t === "muted" ? "stroke-[1.5]" : "stroke-[2.5]")
        const marker = directed ? `url(#${uid}-${t})` : undefined
        if (a === b) {
          // laço (de um nó para ele mesmo): sai pela esquerda do topo e volta pela direita
          const d = `M${a.x - r * 0.6},${a.y - r * 0.8} C${a.x - r * 1.7},${a.y - r * 2.9} ${a.x + r * 1.7},${a.y - r * 2.9} ${a.x + r * 0.6},${a.y - r * 0.85}`
          return <path key={i} d={d} className={stroke} markerEnd={marker} />
        }
        const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1
        const ux = dx / len, uy = dy / len
        const gap = directed ? r + 3 : r
        // ida e volta (a → b e b → a): as duas viram arcos, um de cada lado, em vez de uma linha só
        const pair = directed && edges.some((o) => o.from === e.to && o.to === e.from)
        const off = pair ? 9 : 0
        const x1 = a.x + ux * r - uy * off * 0.6, y1 = a.y + uy * r + ux * off * 0.6
        const x2 = b.x - ux * gap - uy * off * 0.6, y2 = b.y - uy * gap + ux * off * 0.6
        const mx = (x1 + x2) / 2 - uy * (11 + off), my = (y1 + y2) / 2 + ux * (11 + off)
        return (
          <g key={i}>
            {pair
              ? <path d={`M${x1},${y1} Q${(x1 + x2) / 2 - uy * off * 2},${(y1 + y2) / 2 + ux * off * 2} ${x2},${y2}`} className={stroke} markerEnd={marker} />
              : <line x1={x1} y1={y1} x2={x2} y2={y2} className={stroke} markerEnd={marker} />}
            {e.label && (
              <g>
                <rect x={mx - 11} y={my - 9} width={22} height={18} rx={5} className="fill-background" />
                <text x={mx} y={my + 4.5} textAnchor="middle" className={cn("font-mono text-[12px] font-semibold", t === "bad" ? "fill-alerta" : "fill-soft-foreground")}>{e.label}</text>
              </g>
            )}
          </g>
        )
      })}
      {nodes.map((n) => {
        const t = n.tone ?? "plain"
        return (
          <g key={n.id}>
            <circle cx={n.x} cy={n.y} r={r} className={cn(NODE[t], "stroke-2")} strokeDasharray={t === "next" ? "4 3" : undefined} />
            <text x={n.x} y={n.y + 5} textAnchor="middle" className={cn("text-[14px] font-semibold", t === "cur" ? "fill-primary-foreground" : "fill-foreground")}>{n.label ?? n.id}</text>
            {n.sub && <text x={n.x} y={n.y + r + 15} textAnchor="middle" className="fill-muted-foreground font-mono text-[11.5px]">{n.sub}</text>}
          </g>
        )
      })}
    </svg>
  )
}

/** Legenda das cores dos nós, na ordem dada: [["cur", "u (o da vez)"], ["wait", "na fila"], …]. */
export function GraphLegend({ items }: { items: [NodeTone, string][] }) {
  return (
    <div className="text-muted-foreground mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 font-sans text-[12px]">
      {items.map(([t, l]) => (
        <span key={t} className="inline-flex items-center gap-1.5"><span className={cn("inline-block size-3 rounded-full border-2", DOT[t])} />{l}</span>
      ))}
    </div>
  )
}
