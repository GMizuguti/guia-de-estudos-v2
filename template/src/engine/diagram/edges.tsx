/* Ligações entre caixas: as caixas são HTML (o texto quebra e segue a fonte e o tema); este módulo mede
   onde cada [data-node] ficou, relativo ao contêiner, e desenha as setas em SVG por cima, de novo a cada
   mudança de tamanho (janela, fonte, tema). Rótulos das ligações são HTML posicionado no meio do traço. */
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react"
import { Scissors } from "lucide-react"
import { cn } from "@/lib/utils"
import { H } from "../html"
import { ARROW_FILL, EDGE_TEXT, ETONES, STROKE } from "./parts"
import type { DEdge, ETone, Side } from "./types"

export interface Rect { x: number; y: number; w: number; h: number }
export type Pt = [number, number]

const same = (a: Record<string, Rect>, b: Record<string, Rect>) => {
  const ka = Object.keys(a), kb = Object.keys(b)
  if (ka.length !== kb.length) return false
  return ka.every((k) => { const p = a[k], q = b[k]; return q && Math.abs(p.x - q.x) < 0.5 && Math.abs(p.y - q.y) < 0.5 && Math.abs(p.w - q.w) < 0.5 && Math.abs(p.h - q.h) < 0.5 })
}

/** Posição de cada [data-node] dentro de `ref`, remedida quando o contêiner ou qualquer caixa muda de tamanho. */
export function useNodeRects(ref: RefObject<HTMLElement | null>, key?: unknown) {
  const [rects, setRects] = useState<Record<string, Rect>>({})
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const base = el.getBoundingClientRect()
      // desenho encolhido por um ancestral (transform: scale): mede na tela e volta à escala do próprio
      // contêiner, que é onde o SVG das ligações desenha
      const k = el.offsetWidth ? base.width / el.offsetWidth : 1
      const out: Record<string, Rect> = {}
      el.querySelectorAll<HTMLElement>("[data-node]").forEach((n) => {
        const r = n.getBoundingClientRect()
        if (n.dataset.node) out[n.dataset.node] = { x: (r.left - base.left) / k, y: (r.top - base.top) / k, w: r.width / k, h: r.height / k }
      })
      setRects((prev) => (same(prev, out) ? prev : out))
    }
    // o ResizeObserver chama measure logo ao observar (e depois a cada mudança): não há setState síncrono aqui
    const ro = new ResizeObserver(() => measure())
    ro.observe(el)
    el.querySelectorAll("[data-node]").forEach((n) => ro.observe(n))
    let alive = true
    const again = () => { if (alive) measure() }
    // garantia: uma caixa pode mudar de lugar sem mudar de tamanho (a fonte de um vizinho carregou), e
    // isso o ResizeObserver não vê; remede quando as fontes terminam e logo depois de montar
    document.fonts?.ready.then(again)
    document.fonts?.addEventListener?.("loadingdone", again)
    const timers = [150, 600, 1500].map((ms) => window.setTimeout(again, ms))
    return () => {
      alive = false
      ro.disconnect()
      document.fonts?.removeEventListener?.("loadingdone", again)
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [ref, key])
  return rects
}

/** Desenho com largura fixa `width` (px) encolhido por `scale` (< 1) para caber, sem mudar o arranjo: o
 *  texto fica um pouco menor, mas a figura continua a mesma. Com scale ≥ 1, só repassa o conteúdo. */
export function Fit({ scale, width, children }: { scale: number; width: number; children: ReactNode }) {
  const inner = useRef<HTMLDivElement>(null)
  const [h, setH] = useState(0)
  useEffect(() => {
    const el = inner.current
    if (!el) return
    const ro = new ResizeObserver(() => setH(el.offsetHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [scale])
  // a mesma estrutura com ou sem escala: trocar de uma para a outra não pode remontar o desenho (as
  // ligações ficariam medindo o elemento antigo)
  const on = scale < 1
  return (
    <div className={on ? "mx-auto overflow-hidden" : undefined} style={on ? { width: width * scale, height: h ? h * scale : undefined } : undefined}>
      <div ref={inner} style={on ? { width, transform: `scale(${scale})`, transformOrigin: "top left" } : undefined}>{children}</div>
    </div>
  )
}

/** Escolhe o arranjo pela largura natural do desenho largo (medida numa cópia invisível): cabe → o largo;
 *  falta pouco → o largo encolhido (até `min`); falta muito → `narrow` (ou o largo encolhido, se não houver). */
export function Adapt({ wide, narrow, min = 0.8 }: { wide: ReactNode; narrow?: ReactNode; min?: number }) {
  const box = useRef<HTMLDivElement>(null)
  const probe = useRef<HTMLDivElement>(null)
  const w = useWidth(box)
  const [need, setNeed] = useState(0)
  useEffect(() => {
    const el = probe.current
    if (!el) return
    const ro = new ResizeObserver(() => setNeed(Math.ceil(el.scrollWidth)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const s = !w || !need ? 1 : fitScale(w, need, narrow ? min : 0)
  return (
    <div ref={box} className="relative overflow-hidden">
      <div ref={probe} aria-hidden inert className="pointer-events-none invisible absolute top-0 left-0 w-max">{wide}</div>
      {s === 0 && narrow ? narrow : <Fit scale={s || 1} width={need}>{wide}</Fit>}
    </div>
  )
}

/** Quanto encolher um desenho que precisa de `need` px num espaço de `w` px: 1 se cabe, o fator se faltar
 *  pouco (até `min`), 0 se faltar muito (aí o desenho troca de arranjo). */
export function fitScale(w: number, need: number, min = 0.8) {
  if (!w || w >= need) return 1
  const s = w / need
  return s >= min ? s : 0
}

/** Largura atual de um elemento (para trocar de arranjo: linha ↔ coluna). */
export function useWidth(ref: RefObject<HTMLElement | null>) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((es) => setW(Math.round(es[0].contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return w
}

/* ---------- geometria ---------- */

/** Ponto de um lado da caixa: `f` é a fração ao longo do lado (0,5 = o meio). */
function anchor(r: Rect, s: Side, f = 0.5): { p: Pt; n: Pt } {
  switch (s) {
    case "top": return { p: [r.x + r.w * f, r.y], n: [0, -1] }
    case "bottom": return { p: [r.x + r.w * f, r.y + r.h], n: [0, 1] }
    case "left": return { p: [r.x, r.y + r.h * f], n: [-1, 0] }
    case "right": return { p: [r.x + r.w, r.y + r.h * f], n: [1, 0] }
  }
}

/** Lados automáticos: pelo vão maior entre as caixas (vertical → de baixo para cima; horizontal → de lado). */
export function autoSides(a: Rect, b: Rect): [Side, Side] {
  const dy = b.y + b.h / 2 - (a.y + a.h / 2), dx = b.x + b.w / 2 - (a.x + a.w / 2)
  const vgap = dy > 0 ? b.y - (a.y + a.h) : a.y - (b.y + b.h)
  const hgap = dx > 0 ? b.x - (a.x + a.w) : a.x - (b.x + b.w)
  if (vgap >= hgap) return dy > 0 ? ["bottom", "top"] : ["top", "bottom"]
  return dx > 0 ? ["right", "left"] : ["left", "right"]
}

export type Route = "curve" | "straight" | "elbow"

export interface EdgeGeom { d: string; at: (t: number) => Pt; start: Pt; end: Pt }

/** Caminho SVG de uma ligação entre dois retângulos. `bend` desvia a curva para a esquerda (+) ou direita (-).
 *  `fa`/`fb`: onde, ao longo do lado de saída e do de chegada, a ligação encosta (0,5 = no meio). */
export function edgeGeom(a: Rect, b: Rect, e: Pick<DEdge, "fromSide" | "toSide" | "bend">, route: Route = "curve", fa = 0.5, fb = 0.5): EdgeGeom {
  const [sa, sb] = autoSides(a, b)
  const A = anchor(a, e.fromSide ?? sa, fa), B = anchor(b, e.toSide ?? sb, fb)
  const [x1, y1] = A.p, [x2, y2] = B.p
  const dist = Math.hypot(x2 - x1, y2 - y1) || 1
  // perpendicular à esquerda de quem anda de A para B
  const px = -(y2 - y1) / dist, py = (x2 - x1) / dist
  const bend = (e.bend ?? 0) * dist * 0.5
  if (route === "straight") {
    if (!bend) return { d: `M${x1},${y1} L${x2},${y2}`, at: (t) => [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t], start: A.p, end: B.p }
    const cx = (x1 + x2) / 2 + px * bend, cy = (y1 + y2) / 2 + py * bend
    return { d: `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`, at: (t) => quad([x1, y1], [cx, cy], [x2, y2], t), start: A.p, end: B.p }
  }
  if (route === "elbow") {
    // ângulos retos, com cantos arredondados: sai na direção do lado de saída e chega na do lado de chegada
    const va = A.n[1] !== 0, vb = B.n[1] !== 0
    let pts: Pt[]
    if (va && !vb) pts = [[x1, y1], [x1, y2], [x2, y2]]
    else if (!va && vb) pts = [[x1, y1], [x2, y1], [x2, y2]]
    else if (va) {
      // mesmo lado nas duas pontas (de baixo para baixo): um "U" além das duas caixas
      const my = A.n[1] === B.n[1] ? (A.n[1] > 0 ? Math.max(y1, y2) + 18 : Math.min(y1, y2) - 18) : (y1 + y2) / 2
      pts = [[x1, y1], [x1, my], [x2, my], [x2, y2]]
    } else {
      const mx = A.n[0] === B.n[0] ? (A.n[0] > 0 ? Math.max(x1, x2) + 18 : Math.min(x1, x2) - 18) : (x1 + x2) / 2
      pts = [[x1, y1], [mx, y1], [mx, y2], [x2, y2]]
    }
    return { d: rounded(pts, 9), at: (t) => poly(pts, t), start: A.p, end: B.p }
  }
  const k = Math.max(14, Math.min(90, dist * 0.42))
  const c1: Pt = [x1 + A.n[0] * k + px * bend, y1 + A.n[1] * k + py * bend]
  const c2: Pt = [x2 + B.n[0] * k + px * bend, y2 + B.n[1] * k + py * bend]
  return {
    d: `M${x1},${y1} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${x2},${y2}`,
    at: (t) => cubic([x1, y1], c1, c2, [x2, y2], t),
    start: A.p, end: B.p,
  }
}

const quad = (p: Pt, c: Pt, q: Pt, t: number): Pt => {
  const u = 1 - t
  return [u * u * p[0] + 2 * u * t * c[0] + t * t * q[0], u * u * p[1] + 2 * u * t * c[1] + t * t * q[1]]
}
const cubic = (p: Pt, c1: Pt, c2: Pt, q: Pt, t: number): Pt => {
  const u = 1 - t
  return [
    u * u * u * p[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * q[0],
    u * u * u * p[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * q[1],
  ]
}
/** Poligonal com os cantos arredondados (raio `r`, menor se o trecho for curto). */
function rounded(pts: Pt[], r: number) {
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1], [cx, cy] = pts[i], [nx, ny] = pts[i + 1]
    const l1 = Math.hypot(cx - px, cy - py), l2 = Math.hypot(nx - cx, ny - cy)
    if (l1 < 0.5 || l2 < 0.5) { d += ` L${cx},${cy}`; continue }
    const rr = Math.min(r, l1 / 2, l2 / 2)
    d += ` L${cx - ((cx - px) / l1) * rr},${cy - ((cy - py) / l1) * rr} Q${cx},${cy} ${cx + ((nx - cx) / l2) * rr},${cy + ((ny - cy) / l2) * rr}`
  }
  const last = pts[pts.length - 1]
  return `${d} L${last[0]},${last[1]}`
}

/** Ponto a uma fração `t` do comprimento de uma poligonal. */
function poly(pts: Pt[], t: number): Pt {
  const segs = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]))
  let left = segs.reduce((a, b) => a + b, 0) * t
  for (let i = 0; i < segs.length; i++) {
    if (left <= segs[i] || i === segs.length - 1) {
      const f = segs[i] ? Math.min(1, left / segs[i]) : 0
      return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f]
    }
    left -= segs[i]
  }
  return pts[pts.length - 1]
}

/* ---------- desenho ---------- */

export interface ExtraPath { d: string; tone?: ETone; dash?: boolean; arrow?: boolean; label?: ReactNode; at?: Pt }

// rótulo em cima da linha (padrão) ou ao lado dela, sem cobrir uma seta curta (o fundo do cartão continua:
// numa ligação diagonal, a linha passa por trás do texto em vez de riscá-lo)
const LABEL_AT = {
  on: "-translate-x-1/2 -translate-y-1/2",
  above: "-translate-x-1/2 -translate-y-[calc(100%+3px)]",
  below: "-translate-x-1/2 translate-y-[3px]",
  left: "-translate-x-[calc(100%+5px)] -translate-y-1/2",
  right: "translate-x-[5px] -translate-y-1/2",
}

/** Onde cada ligação encosta na caixa: quando várias usam o mesmo lado da mesma caixa, as pontas se
 *  espalham ao longo do lado (na ordem da outra ponta), em vez de chegarem todas ao mesmo ponto. */
function spreadAnchors(rects: Record<string, Rect>, edges: DEdge[]) {
  const frac = edges.map(() => ({ from: 0.5, to: 0.5 }))
  const sides = edges.map((e) => {
    const a = rects[e.from], b = rects[e.to]
    if (!a || !b) return null
    const [sa, sb] = autoSides(a, b)
    return { from: e.fromSide ?? sa, to: e.toSide ?? sb }
  })
  const groups = new Map<string, { i: number; end: "from" | "to"; key: number }[]>()
  edges.forEach((e, i) => {
    const s = sides[i]
    if (!s) return
    for (const [end, node, side, other] of [["from", e.from, s.from, e.to], ["to", e.to, s.to, e.from]] as const) {
      const o = rects[other]
      const key = side === "left" || side === "right" ? o.y + o.h / 2 : o.x + o.w / 2
      const g = groups.get(node + "|" + side) ?? []
      g.push({ i, end, key })
      groups.set(node + "|" + side, g)
    }
  })
  for (const list of groups.values()) {
    if (list.length < 2) continue
    list.sort((p, q) => p.key - q.key)
    const span = Math.min(0.6, 0.3 * (list.length - 1))
    list.forEach((p, j) => { frac[p.i][p.end] = 0.5 - span / 2 + (span * j) / (list.length - 1) })
  }
  return frac
}

/** Camada das ligações (SVG por cima das caixas, sem capturar o mouse) e dos seus rótulos. O pai precisa
 *  ser `relative`. `extra`: caminhos já calculados (arcos, laços) desenhados com as mesmas cores.
 *  `spread={false}`: ligações que saem do mesmo lado partem do mesmo ponto (leque de uma árvore). */
export function EdgeLayer({ rects, edges, route = "curve", arrows = true, extra = [], spread = true }: {
  rects: Record<string, Rect>
  edges: DEdge[]
  route?: Route
  arrows?: boolean
  extra?: ExtraPath[]
  spread?: boolean
}) {
  const uid = "e" + useId().replace(/[^a-zA-Z0-9]/g, "")
  const frac = spread ? spreadAnchors(rects, edges) : null
  const drawn = edges.flatMap((e, i) => {
    const a = rects[e.from], b = rects[e.to]
    if (!a || !b) return []
    const g = edgeGeom(a, b, e, e.route ?? route, e.fromAt ?? frac?.[i].from, e.toAt ?? frac?.[i].to)
    const tone: ETone = e.cut ? "bad" : e.tone ?? "plain"
    return [{ e, g, tone, key: i }]
  })
  if (!Object.keys(rects).length) return null
  return (
    <>
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
        <defs>
          {ETONES.map((t) => (
            <marker key={t} id={`${uid}-${t}`} viewBox="0 0 10 10" refX="9.2" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
              <path d="M0,0.8 L10,5 L0,9.2 z" className={ARROW_FILL[t]} />
            </marker>
          ))}
        </defs>
        {drawn.map(({ e, g, tone, key }) => (
          <path key={key} d={g.d} className={cn("fill-none", STROKE[tone])} strokeWidth={tone === "muted" ? 1.25 : 1.75}
            strokeDasharray={e.dash || e.cut ? "5 4" : undefined} strokeLinecap="round"
            markerEnd={(e.arrow ?? arrows) ? `url(#${uid}-${tone})` : undefined} />
        ))}
        {extra.map((x, i) => (
          <path key={"x" + i} d={x.d} className={cn("fill-none", STROKE[x.tone ?? "plain"])} strokeWidth={1.75}
            strokeDasharray={x.dash ? "5 4" : undefined} strokeLinecap="round" markerEnd={x.arrow ? `url(#${uid}-${x.tone ?? "plain"})` : undefined} />
        ))}
      </svg>
      {drawn.map(({ e, g, tone, key }) => {
        if (!e.label && !e.cut) return null
        const [x, y] = g.at(e.at ?? 0.5)
        return (
          <div key={"l" + key} style={{ left: x, top: y }}
            className={cn("pointer-events-none absolute z-[1] flex max-w-[13rem] items-center gap-1 rounded-md bg-card px-1.5 py-0.5 text-center text-[11.5px] leading-tight font-medium",
              LABEL_AT[e.labelSide ?? "on"], EDGE_TEXT[tone])}>
            {e.cut && <Scissors className="size-3.5 shrink-0" aria-label="ramo cortado" />}
            {e.label && <H html={e.label} className="[overflow-wrap:anywhere]" />}
          </div>
        )
      })}
      {extra.map((x, i) => x.label && x.at ? (
        <div key={"xl" + i} style={{ left: x.at[0], top: x.at[1] }}
          className={cn("pointer-events-none absolute z-[1] max-w-[14rem] -translate-x-1/2 -translate-y-1/2 rounded-md bg-card px-1.5 py-0.5 text-center text-[11.5px] leading-tight font-medium", EDGE_TEXT[x.tone ?? "plain"])}>
          {x.label}
        </div>
      ) : null)}
    </>
  )
}
