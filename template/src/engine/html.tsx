/* HTML inline do material (<b>, <em>, <br>…). O conteúdo é local e empacotado, não vem de usuário.
   Fórmulas \( … \) e \[ … \] dentro do texto saem renderizadas pelo KaTeX (./math). */
import type { ElementType } from "react"
import { cn } from "@/lib/utils"
import { withMath } from "./math"

export function H({ html, as: Tag = "span", className }: { html?: string | null; as?: ElementType; className?: string }) {
  if (!html) return null
  return <Tag className={cn(className)} dangerouslySetInnerHTML={{ __html: withMath(html) }} />
}
