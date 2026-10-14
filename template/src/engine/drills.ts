/* Lista final do Treino: exercícios da matéria + casos sem exercício próprio (resposta do material como modelo) */
import { C } from "./core"
import type { Drill, DrillSet } from "./types"

const used = new Set(C.drills.map((d) => d.case).filter(Boolean))
const auto: Drill[] = C.cases.filter((c) => !used.has(c.id) && !C.drills.some((d) => d.id === c.id)).map((c) => ({
  id: c.id, set: "casos", case: c.id,
  parts: c.questions.map((q) => ({ label: q.q, axis: null, model: q.a, fromMaterial: true })),
}))

export const drills: Drill[] = [...C.drills, ...auto]
export const drillSets: DrillSet[] = auto.length && !C.drillSets.some((s) => s.id === "casos")
  ? [...C.drillSets, { id: "casos", name: "Casos do material", origin: "material" }]
  : C.drillSets
export const drillById = new Map(drills.map((d) => [d.id, d]))

export function setOf(d: Drill): DrillSet {
  return drillSets.find((s) => s.id === d.set) ?? { id: d.set, name: d.set, origin: "material" }
}
export const tabOf = (d: Drill) => (setOf(d).origin === "app" ? "extras" : "material")
