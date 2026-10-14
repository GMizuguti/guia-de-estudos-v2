/* Peças comuns dos diagramas: cor por papel, a caixa padrão, o marcador de ordem e a legenda. */
import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"
import { H } from "../html"
import type { Html } from "../types"
import type { DBox, DLegend, DTone, ETone } from "./types"

/** Caixa: fundo, borda e texto do papel. */
export const BOX: Record<DTone, string> = {
  plain: "bg-card border-border-strong text-foreground",
  soft: "bg-primary-soft border-primary-line text-foreground",
  accent: "bg-primary border-primary text-primary-foreground",
  ink: "bg-foreground border-foreground text-background",
  ok: "bg-lab-bg border-lab-line text-foreground",
  bad: "bg-alerta-bg border-alerta-line text-foreground",
  warn: "bg-examen-bg border-examen-line text-foreground",
  info: "bg-clave-bg border-clave-line text-foreground",
  muted: "bg-card border-border border-dashed text-muted-foreground",
  note: "border-transparent bg-transparent text-soft-foreground",
}

/** Cor do eyebrow (linha fina de cima) em cada papel. */
export const EYEBROW: Record<DTone, string> = {
  plain: "text-muted-foreground",
  soft: "text-primary",
  accent: "text-primary-foreground/80",
  ink: "text-background/75",
  ok: "text-lab",
  bad: "text-alerta",
  warn: "text-examen",
  info: "text-clave",
  muted: "text-muted-foreground",
  note: "text-muted-foreground",
}

/** Cor da linha de baixo (sub). */
export const SUB: Record<DTone, string> = {
  plain: "text-muted-foreground",
  soft: "text-soft-foreground",
  accent: "text-primary-foreground/85",
  ink: "text-background/80",
  ok: "text-soft-foreground",
  bad: "text-soft-foreground",
  warn: "text-soft-foreground",
  info: "text-soft-foreground",
  muted: "text-muted-foreground",
  note: "text-muted-foreground",
}

/** Cor cheia do papel (bolinha de legenda, elemento de conjunto, ponto da linha do tempo). */
export const FILL: Record<DTone, string> = {
  plain: "bg-card border-border-strong",
  soft: "bg-primary-soft border-primary",
  accent: "bg-primary border-primary",
  ink: "bg-foreground border-foreground",
  ok: "bg-lab-bg border-lab",
  bad: "bg-alerta-bg border-alerta",
  warn: "bg-examen-bg border-examen",
  info: "bg-clave-bg border-clave",
  muted: "bg-card border-border border-dashed",
  note: "bg-transparent border-transparent",
}

/** Texto na cor do papel (título de região, operador, rótulo forte). */
export const TEXT: Record<DTone, string> = {
  plain: "text-foreground",
  soft: "text-primary",
  accent: "text-primary",
  ink: "text-foreground",
  ok: "text-lab",
  bad: "text-alerta",
  warn: "text-examen",
  info: "text-clave",
  muted: "text-muted-foreground",
  note: "text-soft-foreground",
}

/** Cor cheia e forte (bloco empilhado, personagem, região forte): fundo do papel e texto contrastante. */
export const SOLID: Record<DTone, string> = {
  plain: "bg-muted-foreground border-muted-foreground text-background",
  soft: "bg-primary-line border-primary-line text-foreground",
  accent: "bg-primary border-primary text-primary-foreground",
  ink: "bg-foreground border-foreground text-background",
  ok: "bg-lab border-lab text-background",
  bad: "bg-alerta border-alerta text-background",
  warn: "bg-examen border-examen text-background",
  info: "bg-clave border-clave text-background",
  muted: "bg-border-strong border-border-strong text-foreground",
  note: "bg-transparent border-transparent text-foreground",
}

/** Traço (stroke) e ponta de seta (fill) de cada cor de ligação, em classes do Tailwind para SVG. */
export const STROKE: Record<ETone, string> = {
  plain: "stroke-muted-foreground",
  accent: "stroke-primary",
  ok: "stroke-lab",
  bad: "stroke-alerta",
  warn: "stroke-examen",
  info: "stroke-clave",
  muted: "stroke-border-strong",
}
export const ARROW_FILL: Record<ETone, string> = {
  plain: "fill-muted-foreground",
  accent: "fill-primary",
  ok: "fill-lab",
  bad: "fill-alerta",
  warn: "fill-examen",
  info: "fill-clave",
  muted: "fill-border-strong",
}
export const ETONES = Object.keys(STROKE) as ETone[]

/** Texto de rótulo de ligação, na cor da ligação. */
export const EDGE_TEXT: Record<ETone, string> = {
  plain: "text-soft-foreground",
  accent: "text-primary",
  ok: "text-lab",
  bad: "text-alerta",
  warn: "text-examen",
  info: "text-clave",
  muted: "text-muted-foreground",
}

/** Caixa padrão de diagrama. `node`: id para as ligações (data-node). */
export function Box({ b, node, className, style, children }: { b: DBox; node?: string; className?: string; style?: CSSProperties; children?: ReactNode }) {
  const tone = b.tone ?? "plain"
  const shape = b.shape ?? "box"
  return (
    <div data-node={node} style={{ maxWidth: shape === "circle" ? undefined : `${b.maxW ?? 15}rem`, minWidth: b.minW ? `${b.minW}rem` : undefined, ...style }}
      className={cn("relative border text-center leading-snug",
        shape === "circle" ? "grid size-11 shrink-0 place-items-center rounded-full p-0 text-[13px] font-semibold"
          : shape === "pill" ? (b.size === "xs" ? "rounded-full px-2.5 py-1" : "rounded-full px-3.5 py-1.5")
          : b.size === "xs" ? "rounded-[9px] px-2 py-1.5" : "rounded-[10px] px-3 py-2",
        tone === "note" && "px-1 py-0 text-left",
        b.badge && shape !== "circle" && "pl-5", // o marcador de ordem fica no canto sem cobrir o texto
        b.strong ? SOLID[tone] : BOX[tone], className)}>
      {b.badge && (
        <span aria-label={`ordem ${b.badge}`} className="bg-examen text-background absolute -top-2.5 -left-2.5 grid size-6 place-items-center rounded-full border-2 border-card font-mono text-[11px] font-bold">{b.badge}</span>
      )}
      {/* sem uppercase forçado: a grafia é a do original (quem quer caixa alta escreve em caixa alta) */}
      {b.eyebrow && <H as="div" html={b.eyebrow} className={cn("text-[10.5px] font-semibold tracking-[.08em]", b.strong ? "opacity-80" : EYEBROW[tone])} />}
      {b.label && <H as="div" html={b.label} className={cn(b.mono && "formula-font", b.size === "lg" ? "text-[17px]" : b.size === "sm" ? "text-[12.5px]" : b.size === "xs" ? "text-[11.5px]" : b.mono ? "text-[13px]" : "text-[13.5px]",
        "font-semibold [overflow-wrap:anywhere]", tone === "note" && "font-normal")} />}
      {b.sub && <H as="div" html={b.sub} className={cn("mt-0.5 text-[11.5px] [overflow-wrap:anywhere]", b.strong ? "opacity-85" : SUB[tone])} />}
      {children}
    </div>
  )
}

/** Legenda embaixo do diagrama: amostra do papel (caixa, ligação cheia ou tracejada) + texto. */
export function Legend({ items }: { items: DLegend[] }) {
  return (
    <div className="text-muted-foreground mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[12px]">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          {it.tone === "edge" || it.tone === "dash"
            ? <svg width="22" height="8" aria-hidden><line x1="1" y1="4" x2="21" y2="4" className={STROKE[it.edgeTone ?? "plain"]} strokeWidth={2} strokeDasharray={it.tone === "dash" ? "4 3" : undefined} /></svg>
            : <span className={cn("inline-block size-3 rounded-[4px] border-2", FILL[it.tone])} />}
          <H html={it.label} />
        </span>
      ))}
    </div>
  )
}

/** Nota pequena e centralizada embaixo de um desenho. */
export function Foot({ html }: { html?: Html }) {
  if (!html) return null
  return <H as="div" html={html} className="text-muted-foreground mt-3 text-center text-[12.5px] leading-snug" />
}

