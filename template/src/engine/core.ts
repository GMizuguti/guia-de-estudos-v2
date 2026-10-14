/* Acesso ao conteúdo da matéria e utilidades comuns do motor */
import content from "@/content"
import type { Axis, Chapter, Section } from "./types"

export const C = content
export const M = content.meta

const W = M.words ?? {}
export const words = {
  chapter: W.chapter ?? "Capítulo",
  chapterShort: W.chapterShort ?? "Cap.",
  chapters: W.chapters ?? "capítulos",
  sections: W.sections ?? "seções",
  sectionOne: W.sectionOne ?? "seção",
  sectionsRead: W.sectionsRead ?? "seções lidas",
  doc: W.doc ?? "manual", // substantivo masculino: "do manual", "ao guia"
  docTab: W.docTab ?? "Manual",
  compareNoun: W.compareNoun ?? "perfis",
  rightChoices: W.rightChoices ?? "escolhas certas", // contagem e selo do Treino (ex.: "nomes certos")
  // título do índice lateral do leitor; padrão: "Neste capítulo", "Nesta parte", "Nesta unidade", "Neste trecho" (seção)
  inChapter: W.inChapter ?? inChapterOf(W.chapter ?? "Capítulo"),
}

function inChapterOf(ch: string) {
  const c = ch.toLowerCase()
  if (c === "seção") return "Neste trecho"
  return `${/(a|ção|são|dade|parte|gem)$/.test(c) ? "Nesta" : "Neste"} ${c}`
}

export function chapterById(id?: string | null): Chapter {
  return content.chapters.find((c) => c.id === id) ?? content.chapters[0]
}

export function chapterLabel(ch: Chapter, short = false) {
  if (ch.label) return ch.label
  return ch.isAnnex ? "Anexo" : `${short ? words.chapterShort : words.chapter} ${ch.num}`
}

const sectionMap = new Map<string, { chapter: Chapter; section: Section }>()
for (const ch of content.chapters) for (const s of ch.sections) sectionMap.set(s.id, { chapter: ch, section: s })

export function findSection(id?: string | null) {
  return id ? sectionMap.get(id) ?? null : null
}

export const allSectionIds = content.chapters.flatMap((c) => c.sections.map((s) => s.id))

export function axisOption(axis: string | null | undefined, v: string | undefined) {
  const a: Axis | undefined = axis ? content.axes[axis] : undefined
  return a?.options.find((o) => o.v === v) ?? null
}

export function optionName(axis: string | null | undefined, v: string | undefined) {
  return axisOption(axis, v)?.l ?? v ?? ""
}

export function countWords(t?: string) {
  const s = (t ?? "").trim()
  return s ? s.split(/\s+/).length : 0
}

export function shuffle<T>(a: T[]): T[] {
  const r = a.slice()
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[r[i], r[j]] = [r[j], r[i]]
  }
  return r
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`
}

export const decimal = (v: number | string) => String(v).replace(".", ",")
