/* Arcos de dependência: fichas em linha (um prefixo de quantificadores, palavras de uma frase, etapas) e
   arcos de uma ficha para outra(s), por cima ou por baixo, com rótulo no alto do arco. */
import { useId, useRef } from "react"
import { cn } from "@/lib/utils"
import { H } from "../html"
import { useNodeRects, useWidth } from "./edges"
import { ARROW_FILL, Box, EDGE_TEXT, ETONES, STROKE } from "./parts"
import type { ArcsSpec, ETone } from "./types"

// meia largura estimada de um rótulo (12 px, seminegrito), pela linha mais longa: para mantê-lo dentro do desenho
const halfOf = (html: string) => Math.max(...html.split(/<br\s*\/?>/i).map((s) => s.replace(/<[^>]+>/g, "").length)) * 3.3 + 4

export function ArcsView({ spec }: { spec: ArcsSpec }) {
  const ref = useRef<HTMLDivElement>(null)
  const rects = useNodeRects(ref, spec.tokens.length)
  const W = useWidth(ref)
  const uid = "a" + useId().replace(/[^a-zA-Z0-9]/g, "")
  const top = spec.arcs.some((a) => (a.side ?? "top") === "top")
  const bottom = spec.arcs.some((a) => a.side === "bottom")
  const ready = Object.keys(rects).length > 0

  let needTop = 0, needBottom = 0 // altura dos arcos, para reservar espaço acima e abaixo das fichas
  const paths: { d: string; tone: ETone }[] = []
  const labels: { x: number; y: number; html: string; tone: ETone; below: boolean }[] = []
  if (ready) {
    for (const a of spec.arcs) {
      const from = rects["k" + a.from]
      if (!from) continue
      const below = a.side === "bottom"
      const tone = a.tone ?? "accent"
      let apex: { x: number; y: number } | null = null
      for (const t of Array.isArray(a.to) ? a.to : [a.to]) {
        const to = rects["k" + t]
        if (!to) continue
        const x1 = from.x + from.w / 2, x2 = to.x + to.w / 2
        const y = below ? from.y + from.h : from.y
        const y2 = below ? to.y + to.h + 2 : to.y - 2
        const h = 18 + Math.abs(x2 - x1) * 0.22
        const cy = below ? y + h * 2 : y - h * 2
        paths.push({ d: `M${x1},${y} Q${(x1 + x2) / 2},${cy} ${x2},${y2}`, tone })
        const ay = below ? y + h : y - h // altura do arco no meio (a curva quadrática chega à metade do controle)
        if (below) needBottom = Math.max(needBottom, h); else needTop = Math.max(needTop, h)
        if (!apex || (below ? ay > apex.y : ay < apex.y)) apex = { x: (x1 + x2) / 2, y: ay }
      }
      if (apex && a.label) {
        const half = halfOf(a.label)
        const x = W > 2 * half ? Math.min(Math.max(apex.x, half), W - half) : apex.x
        labels.push({ x, y: apex.y, html: a.label, tone, below })
      }
    }
  }

  return (
    <div className="overflow-x-auto">
      <div ref={ref} className="relative mx-auto flex w-max max-w-full items-center gap-4 px-2 sm:gap-10 sm:px-10"
        style={{ paddingTop: top ? (ready ? needTop + 40 : 96) : undefined, paddingBottom: bottom ? (ready ? needBottom + 40 : 96) : undefined }}>
        {spec.tokens.map((t, i) => (
          <Box key={i} node={"k" + i} b={{ label: t.label, tone: t.tone ?? "plain", strong: t.strong, mono: spec.mono ?? true, size: "lg" }} className="min-w-14 px-4 py-2.5 sm:min-w-24 sm:px-5" />
        ))}
        {ready && (
          <svg aria-hidden className="pointer-events-none absolute inset-0 size-full overflow-visible">
            <defs>
              {ETONES.map((t) => (
                <marker key={t} id={`${uid}-${t}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
                  <path d="M0,0.8 L10,5 L0,9.2 z" className={ARROW_FILL[t]} />
                </marker>
              ))}
            </defs>
            {paths.map((p, i) => <path key={i} d={p.d} className={cn("fill-none", STROKE[p.tone])} strokeWidth={2} markerEnd={`url(#${uid}-${p.tone})`} />)}
          </svg>
        )}
        {labels.map((l, i) => (
          <div key={i} style={{ left: l.x, top: l.y }}
            className={cn("pointer-events-none absolute max-w-[15rem] -translate-x-1/2 text-center text-[12px] leading-tight font-semibold whitespace-nowrap", l.below ? "translate-y-1.5" : "-translate-y-[calc(100%+6px)]", EDGE_TEXT[l.tone])}>
            <H html={l.html} />
          </div>
        ))}
      </div>
    </div>
  )
}
