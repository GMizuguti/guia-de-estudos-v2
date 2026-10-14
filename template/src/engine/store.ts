/* Persistência local do progresso: leitura, marcadores, notas, fichas, questões, treino, simulado e preferências.
   Estado imutável + useSyncExternalStore. A chave vem de meta.slug (única por matéria) e o formato é o
   mesmo da v1, então o progresso salvo por um app v1 continua valendo. */
import { useSyncExternalStore } from "react"
import { M } from "./core"
import type { SimAnswers } from "./types"

export interface SrsRec { ease: number; interval: number; due: number; reps: number; lapses: number }
export interface DrillRec { choice: Record<string, string>; text: Record<string, string>; self: Record<string, Record<string, boolean>>; done?: boolean; at?: number }
export interface ExamState { ids: string[]; started: number; submitted: number }
export interface SimState { started: number; submitted: number; peek: boolean; nome: string; ans: SimAnswers; score: Record<string, string> }
export interface Prefs { readFont: "sans" | "serif"; readSize: number; readLh: number; measure: number }

export interface State {
  read: Record<string, true>
  bookmarks: Record<string, true>
  notes: Record<string, string>
  srs: Record<string, SrsRec>
  quiz: { best: number | null; runs: number; missed: Record<string, number> }
  drills: Record<string, DrillRec>
  exam: ExamState | null
  sim: SimState | null
  checks: Record<string, true>
  lastChapter: string
  lastView: string
  prefs: Prefs
}

const KEY = `${M.slug}.v1`

const DEFAULTS: State = {
  read: {}, bookmarks: {}, notes: {}, srs: {},
  quiz: { best: null, runs: 0, missed: {} },
  drills: {}, exam: null, sim: null, checks: {},
  lastChapter: "c1", lastView: "home",
  prefs: { readFont: "sans", readSize: 16, readLh: 1.68, measure: 74 },
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(DEFAULTS)
    const p = JSON.parse(raw) as Partial<State>
    return { ...structuredClone(DEFAULTS), ...p, quiz: { ...DEFAULTS.quiz, ...p.quiz }, prefs: { ...DEFAULTS.prefs, ...p.prefs } }
  } catch {
    return structuredClone(DEFAULTS)
  }
}

let state = load()
const listeners = new Set<() => void>()
let timer: number | undefined

function persist() {
  window.clearTimeout(timer)
  timer = window.setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* modo privado: perde-se ao fechar */ }
  }, 180)
}

export function getState() { return state }

export function setState(fn: (s: State) => State) {
  state = fn(state)
  persist()
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Lê uma fatia do estado. O seletor deve devolver uma referência já existente (não crie objetos nele). */
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state))
}

/* ---------- atalhos de escrita ---------- */

function toggleKey<T extends Record<string, unknown>>(o: T, k: string, on: boolean, v: unknown = true): T {
  const n = { ...o } as Record<string, unknown>
  if (on) n[k] = v; else delete n[k]
  return n as T
}

export const actions = {
  setRead: (id: string, on: boolean) => setState((s) => ({ ...s, read: toggleKey(s.read, id, on) })),
  toggleBookmark: (id: string) => {
    const on = !state.bookmarks[id]
    setState((s) => ({ ...s, bookmarks: toggleKey(s.bookmarks, id, on) }))
    return on
  },
  setNote: (id: string, txt: string) => setState((s) => ({ ...s, notes: toggleKey(s.notes, id, !!txt.trim(), txt) })),
  setSrs: (id: string, rec: SrsRec) => setState((s) => ({ ...s, srs: { ...s.srs, [id]: rec } })),
  recordQuiz: (score: number, total: number, missedIds: string[]) =>
    setState((s) => {
      const pct = total ? Math.round((score / total) * 100) : 0
      const missed = { ...s.quiz.missed }
      missedIds.forEach((id) => { missed[id] = (missed[id] ?? 0) + 1 })
      return { ...s, quiz: { runs: s.quiz.runs + 1, best: s.quiz.best === null || pct > s.quiz.best ? pct : s.quiz.best, missed } }
    }),
  setDrill: (key: string, rec: DrillRec | null) => setState((s) => ({ ...s, drills: toggleKey(s.drills, key, !!rec, rec) })),
  clearExamDrills: () => setState((s) => ({ ...s, drills: Object.fromEntries(Object.entries(s.drills).filter(([k]) => !k.startsWith("e:"))) })),
  setExam: (e: ExamState | null) => setState((s) => ({ ...s, exam: e })),
  setSim: (sim: SimState | null) => setState((s) => ({ ...s, sim })),
  setCheck: (k: string, on: boolean) => setState((s) => ({ ...s, checks: toggleKey(s.checks, k, on) })),
  setLast: (view: string, chapter?: string) => setState((s) => ({ ...s, lastView: view, lastChapter: chapter ?? s.lastChapter })),
  setPref: <K extends keyof Prefs>(k: K, v: Prefs[K]) => setState((s) => ({ ...s, prefs: { ...s.prefs, [k]: v } })),
  reset: () => {
    try { localStorage.removeItem(KEY) } catch { /* nada */ }
    setState(() => structuredClone(DEFAULTS))
  },
  exportJson: () => JSON.stringify({ app: M.slug, version: 1, exported: new Date().toISOString(), data: state }, null, 2),
  importJson: (text: string) => {
    const parsed = JSON.parse(text)
    const payload = parsed?.data ?? parsed
    if (!payload || typeof payload !== "object") throw new Error("Formato não reconhecido")
    setState(() => ({ ...structuredClone(DEFAULTS), ...payload, prefs: { ...DEFAULTS.prefs, ...payload.prefs } }))
  },
}

export const EMPTY_DRILL: DrillRec = { choice: {}, text: {}, self: {} }
