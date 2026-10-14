/* Repetição espaçada: SM-2 simplificado (De novo = 6 min · Difícil · Bom · Fácil) */
import type { SrsRec } from "./store"

const DAY = 86400000
export const NEW_REC: SrsRec = { ease: 2.5, interval: 0, due: 0, reps: 0, lapses: 0 }

export function grade(prev: SrsRec | undefined, g: 0 | 1 | 2 | 3): SrsRec {
  const r = { ...(prev ?? NEW_REC) }
  if (g === 0) {
    r.lapses += 1; r.reps = 0; r.interval = 0
    r.ease = Math.max(1.3, r.ease - 0.2)
    r.due = Date.now() + 6 * 60000
    return r
  }
  r.reps += 1
  if (g === 1) { r.ease = Math.max(1.3, r.ease - 0.15); r.interval = r.interval ? Math.max(1, r.interval * 1.2) : 1 }
  else if (g === 2) r.interval = r.reps === 1 ? 1 : r.reps === 2 ? 4 : r.interval * r.ease
  else { r.ease = Math.min(3, r.ease + 0.15); r.interval = r.reps === 1 ? 3 : r.reps === 2 ? 7 : r.interval * r.ease * 1.25 }
  r.interval = Math.min(r.interval, 365)
  r.due = Date.now() + Math.round(r.interval * DAY)
  return r
}

export function intervalLabel(prev: SrsRec | undefined, g: 0 | 1 | 2 | 3) {
  if (g === 0) return "6 min"
  const iv = Math.round(grade(prev, g).interval)
  return iv < 1 ? "1 d" : iv >= 30 ? `${Math.round(iv / 30)} ${iv >= 60 ? "meses" : "mês"}` : `${iv} d`
}
