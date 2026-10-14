/* Classes compartilhadas para os controles em pílula (medidas da v1, sobre o Toggle do shadcn). */
import { cn } from "@/lib/utils"

/** Chip de seleção (comparador, filtros): contorno neutro; marcado vira acento cheio. */
export const chip = cn(
  "h-auto min-h-8 gap-1.5 rounded-full border-border bg-card px-3 py-1.5 text-[12.5px] font-normal text-soft-foreground",
  "hover:border-border-strong hover:bg-card hover:text-foreground",
  "data-pressed:border-primary data-pressed:bg-primary data-pressed:font-medium data-pressed:text-primary-foreground",
  "data-pressed:hover:bg-primary data-pressed:hover:text-primary-foreground [&_svg:not([class*='size-'])]:size-3.5",
)

/** Opção de resposta (Treino, Simulado): eixo "accent" marca no acento; os outros em tinta cheia.
 *  Depois de corrigir, a escolhida continua visível (o disabled do shadcn apagaria). */
export const optionPill = (tone?: string) => cn(
  "h-[34px] rounded-full border-border bg-secondary px-3.5 text-[13px] font-medium text-soft-foreground",
  "hover:border-border-strong hover:bg-secondary hover:text-foreground data-pressed:disabled:opacity-100",
  tone === "accent"
    ? "data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground data-pressed:hover:bg-primary"
    : "data-pressed:border-foreground data-pressed:bg-foreground data-pressed:text-background data-pressed:hover:bg-foreground",
)
