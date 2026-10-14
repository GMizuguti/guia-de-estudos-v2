/* Peças para os esquemas da matéria (src/content/figuras.tsx): chip de opção de eixo,
   esqueleto de resposta, o procedimento clicável, a tabela livre e, de ./stepper e ./graph-view,
   o simulador passo a passo (código + execução) e o grafo em SVG. */
import { useState, type ReactNode } from "react"
import { ArrowRight, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { C, axisOption } from "./core"
import { H } from "./html"

export { FreeTable, noCell, okCell, type FreeCell, type FreeRow, type FreeTone } from "./free-table"
export { H } from "./html"
export { GraphLegend, GraphView, type EdgeTone, type GraphEdge, type GraphNode, type NodeTone } from "./graph-view"
export {
  ChipList, CodePanel, PanelLabel, Pills, StageTable, Stats, StepControls, StepNote, Stepper, stageColumns, useStepper,
  type CodeLine, type Sim, type StageCell, type StageColumn, type StatItem, type Step, type Tone,
} from "./stepper"

/** Chip de uma opção de eixo: eixo "accent" no acento suave, os outros em tinta neutra. */
export function Cat({ axis, v, className }: { axis: string; v: string; className?: string }) {
  const a = C.axes[axis]
  const o = axisOption(axis, v)
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 font-sans text-[12.5px] leading-normal font-semibold whitespace-nowrap",
      a?.tone === "accent" ? "border-primary-line bg-primary-soft text-primary" : "border-border-strong bg-secondary text-foreground", className)}>
      {o?.l ?? v}
    </span>
  )
}

/** Esqueleto de resposta de uma opção (campo `skeleton` do eixo). */
export function Skeleton({ axis, v }: { axis: string; v: string }) {
  const o = axisOption(axis, v)
  if (!o?.skeleton) return null
  return (
    <div className="bg-secondary rounded-[10px] border px-3.5 py-3 text-[13px] leading-relaxed">
      <div className="text-muted-foreground mb-2 flex items-center gap-2 text-[11px] tracking-[.08em] uppercase"><Cat axis={axis} v={v} />esqueleto de resposta</div>
      <H as="div" html={o.skeleton} className="text-soft-foreground grid gap-1.5 [&_p]:m-0" />
    </div>
  )
}

export interface FlowStep {
  n: string
  key: string
  q: ReactNode
  clears?: string[]
  showIf?: (st: Record<string, string>) => boolean
  opts: { val: string; label: ReactNode; out?: ReactNode; note?: ReactNode }[]
}

/** Procedimento clicável: cada passo tem opções; o resultado é calculado pela matéria. */
export function Flow({ steps, resultN = "=", resultQ, result }: {
  steps: FlowStep[]
  resultN?: string
  resultQ?: ReactNode
  result?: (st: Record<string, string>) => ReactNode
}) {
  const [st, setSt] = useState<Record<string, string>>({})
  const pick = (step: FlowStep, val: string) =>
    setSt((s) => {
      const n = { ...s, [step.key]: s[step.key] === val ? "" : val }
      for (const k of step.clears ?? []) n[k] = ""
      return n
    })
  return (
    <div className="grid gap-2.5 font-sans">
      {steps.map((s) => {
        const off = s.showIf ? !s.showIf(st) : false
        return (
          <div key={s.key} className={cn("grid grid-cols-[2.375rem_minmax(0,1fr)] gap-3 transition-opacity", off && "opacity-40")}>
            <div className="border-primary-line bg-primary-soft text-primary grid size-[34px] place-items-center rounded-[10px] border font-mono text-[13px] font-semibold">{s.n}</div>
            <div className="bg-card rounded-[14px] border px-4 py-3.5">
              <div className="mb-3 text-[14.5px] leading-snug font-semibold">{s.q}</div>
              <div className="grid gap-2">
                {s.opts.map((o) => {
                  const on = st[s.key] === o.val
                  return (
                    <button key={o.val} type="button" aria-pressed={on} onClick={() => pick(s, o.val)}
                      className={cn("grid cursor-pointer items-center gap-2.5 rounded-[10px] border px-3.5 py-2.5 text-left text-[13.5px] leading-snug transition-colors sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
                        on ? "border-primary bg-primary-soft text-foreground ring-primary-line ring-2" : "bg-secondary text-soft-foreground hover:border-border-strong hover:text-foreground")}>
                      <span>{o.label}</span>
                      <ArrowRight className="text-muted-foreground hidden size-4 sm:block" aria-hidden />
                      <span className="flex flex-col items-start gap-1">{o.out}{o.note && <small className="text-muted-foreground text-[11.5px] leading-snug">{o.note}</small>}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
      {result && (
        <div className="grid grid-cols-[2.375rem_minmax(0,1fr)] gap-3">
          <div className="border-primary-line bg-primary-soft text-primary grid size-[34px] place-items-center rounded-[10px] border font-mono text-[13px] font-semibold">{resultN}</div>
          <div className="bg-card rounded-[14px] border px-4 py-3.5">
            {resultQ && <div className="mb-3 text-[14.5px] leading-snug font-semibold">{resultQ}</div>}
            {result(st)}
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setSt({})}><RotateCcw data-icon="inline-start" />Recomeçar</Button>
      </div>
    </div>
  )
}

/** Veredito colorido (compatível/incompatível) para o resultado de um procedimento. */
export function Verdict({ ok, children }: { ok?: boolean | null; children: ReactNode }) {
  return (
    <div className={cn("bg-secondary text-soft-foreground flex flex-wrap items-center gap-2 rounded-[10px] border px-3.5 py-2.5 text-[13.5px] leading-relaxed",
      ok === true && "border-lab-line bg-lab-bg [&>svg]:text-lab", ok === false && "border-alerta-line bg-alerta-bg [&>svg]:text-alerta")}>{children}</div>
  )
}
