/* Tabela livre: cada célula é um bloco solto, com espaço entre elas e sem contorno externo.
   Boa para matrizes (combinações possíveis × impossíveis) e quadros curtos lado a lado.
   Usada pelo bloco { t: "table", variant: "livre" } e pelos esquemas de src/content/figuras.tsx. */
import type { ReactNode } from "react"
import { CircleCheck, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type FreeTone = "ok" | "no" | "plain"
export interface FreeCell { content?: ReactNode; tone?: FreeTone; span?: number; align?: "left" | "center" }
export interface FreeRow { head: ReactNode; cells: FreeCell[] }

const TONE: Record<FreeTone, string> = {
  ok: "bg-lab-bg border border-lab-line text-lab",
  no: "bg-secondary border border-dashed border-border-strong text-muted-foreground",
  plain: "bg-secondary border text-soft-foreground",
}

/** Célula "combina": ícone de certo e, se houver, um exemplo curto embaixo. */
export const okCell = (example?: ReactNode): FreeCell => ({
  tone: "ok",
  content: (
    <>
      <CircleCheck className="mx-auto mb-1 size-[18px]" aria-label="compatível" />
      {example && <span className="text-soft-foreground block text-[11.5px] leading-snug">{example}</span>}
    </>
  ),
})

/** Célula "não combina": só o × em tracejado. */
export const noCell = (): FreeCell => ({ tone: "no", content: <X className="mx-auto size-4" aria-label="incompatível" /> })

export function FreeTable({ cols, rows, corner, headWidth = 170, minWidth = 520, className }: {
  cols: ReactNode[]
  rows: FreeRow[]
  corner?: ReactNode
  headWidth?: number
  minWidth?: number
  className?: string
}) {
  return (
    <div className={cn("-mx-1.5 overflow-x-auto", className)}>
      <table className="w-full table-fixed border-separate border-spacing-1.5 font-sans text-[13px]" style={{ minWidth }}>
        <thead>
          <tr>
            <th className="p-1 text-left align-bottom text-[11px] font-semibold tracking-[.07em] text-muted-foreground uppercase" style={{ width: headWidth }}>{corner}</th>
            {cols.map((c, i) => <th key={i} className="p-1 text-center align-bottom font-medium">{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <th scope="row" className="p-1 text-left align-middle font-medium">{r.head}</th>
              {r.cells.map((c, j) => (
                <td key={j} colSpan={c.span}
                  className={cn("rounded-[10px] p-2.5 align-middle leading-relaxed", TONE[c.tone ?? "plain"],
                    (c.align ?? (c.tone === "plain" || !c.tone ? "left" : "center")) === "center" ? "text-center" : "text-left")}>
                  {c.content}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
