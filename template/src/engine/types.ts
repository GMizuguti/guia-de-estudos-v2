/* Esquema de dados do manual de estudo (v2).
   O motor (src/engine) só conhece estes tipos; a matéria vive em src/content.
   Campos `Html` aceitam HTML inline do material (<b>, <em>, <i>, <br>, <code>). */
import type { ComponentType } from "react"
import type { LucideIcon } from "lucide-react"
import type { DiagramSpec } from "./diagram/types"

export type Html = string

/* ---------------- blocos ---------------- */

export type CalloutKind = "clave" | "examen" | "lab" | "alerta"
export type ChecklistItem = Html | { id: string; html: Html }

export type Block =
  | { t: "p"; html: Html }
  | { t: "h"; text: Html }
  | { t: "ul"; items: Html[] }
  | { t: "steps"; title?: Html; items: Html[] }
  | { t: "table"; caption?: Html; filterable?: boolean; variant?: "livre"; cols: Html[]; rows: Html[][] }
    // variant "livre": cada célula é um bloco solto, sem contorno externo (matrizes, quadros curtos)
  | { t: "cols"; columns: { title?: Html; blocks: Block[] }[] }
  | { t: "aside"; html: Html }
  | { t: "callout"; kind: CalloutKind; title?: Html; label?: Html; blocks: Block[] }
    // label: rótulo próprio do quadro no original ("◆ Definição — Proposição"); substitui ícone e nome da legenda
  | { t: "phrases"; items: Html[] }
  | { t: "case"; ref: string }
  | { t: "figure"; ref: string; title?: Html } // esquema/simulador do app (src/content/figuras.tsx); title: o que fazer com ele
  | { t: "checklist"; id: string; items: ChecklistItem[] }
  | { t: "mermaid"; code: string; caption?: Html }
  | { t: "math"; tex: string; caption?: Html; plain?: boolean } // fórmula em destaque (KaTeX); na linha use \( … \) dentro do HTML
    // plain: a fórmula é texto (Unicode, HTML inline) em fonte mono, como no original, e não TeX
  | { t: "deriv"; title?: Html; rows: DerivRow[] } // derivação passo a passo: nº, passo (e regra), resultado, nota
  | { t: "code"; code: string; lang?: string; title?: string; caption?: Html; numbers?: boolean } // código com realce (Shiki)
  | { t: "img"; src: string; alt: string; caption?: Html; page?: number; w?: number; h?: number; dark?: "papel" | "inverter" }
  | { t: "diagram"; spec: DiagramSpec; caption?: Html; page?: number; alt?: string }
    // figura do material redesenhada (árvore, fluxo, conjuntos, linha do tempo…: ver ./diagram/types.ts), sem imagem
  | { t: "codes"; items: { title?: Html; lang?: string; code: string; caption?: Html }[] }
    // códigos lado a lado para comparar (mesmo problema em estilos ou linguagens diferentes)
  | { t: "explica"; title?: Html; blocks: Block[] }
    // explicação escrita pelo app (outra forma de dizer, passo a passo, intuição), com a moldura
    // "Explicação do app · não está no material"; aceita qualquer bloco dentro, inclusive figure

/** Linha de uma derivação. `n` é o rótulo do passo ("0", "1", "2–5", "a", "✔"); `tone` padrão:
 *  "start" quando n é 0 ou uma letra (a fórmula de partida), "done" quando n é ✔ ou ✓ (o resultado). */
export interface DerivRow { n: string; step: Html; rule?: Html; html: Html; note?: Html; tone?: "start" | "step" | "done" }

/* ---------------- manual ---------------- */

export interface Section {
  id: string // <idCapitulo>-<n>; nunca renomear
  num: string // numeração do ORIGINAL
  title: Html
  blocks: Block[]
}

export interface Chapter {
  id: string // c1, c2…; nunca renomear
  num: number
  title: Html
  kicker: Html
  tocDesc: Html
  page: number
  short: string
  isAnnex?: boolean
  label?: string // rótulo próprio no lugar de "Capítulo N" / "Anexo" (ex.: "Apêndice A", "Introdução")
  badge?: string // marca curta no índice lateral (ex.: "A"); padrão: o número, ou "Ax" no anexo
  tags?: string[]
  intro: Html
  sections: Section[]
}

/* ---------------- auxiliares ---------------- */

export interface Card { id: string; ch: string; sec: string; front: Html; back: Html }

export interface QuizItem {
  id: string; ch: string; sec: string
  q: Html
  opts: [Html, Html, Html, Html]
  a: 0 | 1 | 2 | 3
  why: Html
}

export interface CaseItem {
  id: string; label: string; chapter: string; section: string
  title: Html; stem: Html
  questions: { q: Html; a: Html }[]
}

export interface CompareData {
  fields: { key: string; label: string }[]
  profiles: ({ id: string; name: string; ch: string; group: string } & Record<string, string>)[]
}

/* ---------------- eixos e treino ---------------- */

export interface AxisOption { v: string; l: string; sec?: string; skeleton?: Html }

export interface Axis {
  label: string
  ask?: Html // pergunta padrão dos exercícios deste eixo (ex.: "Qual é a abordagem? Justifique.")
  tone: "accent" | "ink" | "select"
  hint?: Html
  checks?: [string, Html][]
  placeholder?: string
  textPlaceholder?: string
  options: AxisOption[]
}

export interface DrillPart {
  label?: Html
  axis?: string | null
  ans?: string
  alt?: string[]
  altNote?: Html
  model?: Html
  text?: boolean // false = sem campo de texto
  placeholder?: string
  checks?: [string, Html][] // [] = sem caixa de autoavaliação (parte só de escolha)
  fromMaterial?: boolean // modelo transcrito do material (senão: escrito pelo app)
}

export interface Drill {
  id: string
  set: string
  slot?: string
  case?: string
  label?: string
  title?: Html
  stem?: Html
  proposal?: Html
  ask?: Html
  gab?: Html
  ch?: string
  sec?: string
  note?: Html
  parts: DrillPart[]
}

export interface DrillSet { id: string; name: string; origin: "material" | "app"; desc?: Html }

export interface DrillPickRule { set?: string; slot?: string; n?: number }

export interface DrillExam {
  minutes: number
  title?: string
  intro?: Html
  /** Regras de sorteio em ordem, ou várias composições alternativas (uma é escolhida ao acaso). */
  pick: DrillPickRule[] | DrillPickRule[][]
}

export interface DrillInterpret { set: string; title?: string; fn: (right: number, total: number) => Html }

/* ---------------- simulado ---------------- */

export interface SimField { k: string; label: Html; pick?: string; ans?: string; alt?: string[]; text?: boolean; placeholder?: string }

export interface SimQuestion {
  n: number; pts?: string; max?: number; sec?: string
  label?: string // rótulo próprio no lugar do número ("A1" → "Questão A1"); padrão: n
  stem: Html[]; quote?: Html; after?: Html; prompt?: Html
  blocks?: Block[] // blocos do enunciado depois dos parágrafos (grafo ou árvore em mono, tabela a completar)
  fields: SimField[]
  gab: { head?: Html; answer?: Html; lead?: Html; items?: Html[]; blocks?: Block[] } // blocks: tabelas do gabarito, antes dos itens
  appNote?: Html
}

export type SimAnswers = Record<string, { choice: Record<string, string>; text: Record<string, string> }>
export type SimBlock = Block | { t: "sim-leitura" } | { t: "sim-folha" }

export interface Simulado {
  homeTitle?: string; homeDesc?: string
  header?: Html[]; kicker?: Html; title: Html; subtitle?: Html; course?: Html; note?: Html
  minutes: number
  intro?: Html[]; warning?: Html; peekConfirm?: string
  formCols?: [string, string]
  formFields?: { label: Html; auto?: "nome" | "data" | "tempo" | "nota" }[]
  parts?: { title?: Html; instr?: Html; questions: number[] }[]
  questions: SimQuestion[]
  endNote?: Html; gabaritoTitle?: Html; gabaritoWarn?: Html; gabaritoIntro?: Html
  scoring?: { max?: number; step?: number; anchor?: string; hint?: Html; leitura?: { cols: Html[]; rows: Html[][]; min: number[] } }
  folha?: { items: { t: Html; detect?: (ans: SimAnswers, h: { words: (t?: string) => number }) => string | null }[] }
  sections?: { id?: string; title: Html; blocks: SimBlock[] }[]
}

/* ---------------- mapa e meta ---------------- */

export interface Mapa { title?: string; lead?: Html; homeDesc?: string; parts: { id: string; title: string; src?: string; blocks: Block[] }[] }

export type ViewId = "home" | "manual" | "mapa" | "treino" | "simulado" | "fichas" | "questoes" | "comparador"

export interface Meta {
  slug: string // chave do localStorage; única por matéria
  appTitle: string
  brandTitle: string
  brandSub: string
  brandIcon: LucideIcon
  words?: Partial<Record<"chapter" | "chapterShort" | "chapters" | "sections" | "sectionOne" | "sectionsRead" | "doc" | "docTab" | "compareNoun" | "rightChoices" | "inChapter", string>>
  heroEyebrow: Html; heroTitle: Html; heroEmphasis?: Html; heroLead: Html
  searchHints?: string[]
  examDate?: string // AAAA-MM-DD
  examDateLabel?: string
  roteiro?: {
    title?: string; before?: Html; examDayNote?: Html
    beforeActions?: RoteiroAction[]
    steps: { days: number; momento: string; texto: Html; actions?: RoteiroAction[] }[]
  } | null
  howToUse?: Html | null
  legend?: { kind: CalloutKind; name: string; desc: Html }[] | null
  footerNote: Html
}

export type RoteiroAction = { label: string; view: ViewId } | { label: string; section: string }

/* ---------------- tudo junto ---------------- */

export interface Content {
  meta: Meta
  chapters: Chapter[]
  cases: CaseItem[]
  cards: Card[]
  quiz: QuizItem[]
  compare: CompareData
  axes: Record<string, Axis>
  axesConflict?: ((choice: Record<string, string>) => Html | null) | null
  selfCheck?: [string, Html][] | null
  drillSets: DrillSet[]
  drills: Drill[]
  slotLabels?: Record<string, string> // nome do filtro de cada slot do Treino que não é eixo (padrão: o label do eixo, ou o próprio slot)
  drillExam?: DrillExam | null
  drillInterpret?: DrillInterpret | null
  simulado: Simulado | null
  mapa: Mapa | null
  figures: Record<string, ComponentType>
}
