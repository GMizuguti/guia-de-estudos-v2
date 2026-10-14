/* Checagem de integridade do conteúdo. Em desenvolvimento fica em window.__check(): rode no console.
   Tudo que começa com "bad" tem de sair vazio e "dup" zerado antes de compilar. */
import { C } from "./core"
import { drills } from "./drills"
import type { DiagramSpec, TreeNode } from "./diagram/types"
import type { Block, SimBlock } from "./types"

/** Ligações de um desenho que apontam para ids inexistentes (fluxo: nós e itens; árvore: links). */
function diagramRefs(s: DiagramSpec): string[] {
  const missing = (ids: Set<string>, es: { from: string; to: string }[]) =>
    es.flatMap((e) => [e.from, e.to].filter((x) => !ids.has(x)).map((x) => `ligação ${e.from} → ${e.to}: id "${x}" não existe`))
  if (s.kind === "flow") return missing(new Set(s.nodes.flatMap((n) => [n.id, ...(n.items ?? []).flatMap((i) => (i.id ? [i.id] : []))])), s.edges)
  if (s.kind === "tree") {
    const ids = new Set<string>()
    const walk = (n: TreeNode) => { if (n.id) ids.add(n.id); n.children?.forEach(walk) }
    walk(s.root)
    return missing(ids, s.links ?? [])
  }
  if (s.kind === "arcs") return s.arcs.flatMap((a) => [a.from, ...[a.to].flat()].filter((i) => i < 0 || i >= s.tokens.length).map((i) => `arco: ficha ${i} não existe`))
  return []
}

export function checkContent() {
  const ids = new Set(C.chapters.flatMap((c) => c.sections.map((s) => s.id)))
  const optOk = (axis: string | null | undefined, v?: string) => !axis || !v || !!C.axes[axis]?.options.some((o) => o.v === v)
  const dup = (a: { id: string }[]) => a.length - new Set(a.map((x) => x.id)).size

  // referências dentro dos blocos (manual, mapa, simulado)
  const refs: string[] = []
  const walk = (bs: (Block | SimBlock)[], where: string) => {
    for (const b of bs) {
      if (b.t === "case" && !C.cases.some((c) => c.id === b.ref)) refs.push(`${where}: caso "${b.ref}"`)
      if (b.t === "figure" && !C.figures[b.ref]) refs.push(`${where}: figura "${b.ref}"`)
      if (b.t === "cols") b.columns.forEach((col) => walk(col.blocks, where))
      if (b.t === "callout" || b.t === "explica") walk(b.blocks, where)
      if (b.t === "diagram") refs.push(...diagramRefs(b.spec).map((r) => `${where}: ${r}`))
    }
  }
  C.chapters.forEach((ch) => ch.sections.forEach((s) => walk(s.blocks, s.id)))
  C.mapa?.parts.forEach((p) => walk(p.blocks, p.id))
  C.simulado?.sections?.forEach((s) => walk(s.blocks, `simulado/${s.title}`))
  C.simulado?.questions.forEach((q) => walk([...(q.blocks ?? []), ...(q.gab.blocks ?? [])], `simulado/${q.label ?? q.n}`))

  const checklistIds = [
    ...C.chapters.flatMap((ch) => ch.sections.flatMap((s) => s.blocks)),
    ...(C.mapa?.parts.flatMap((p) => p.blocks) ?? []),
  ].flatMap((b) => (b.t === "checklist" ? [b.id] : []))

  return {
    chapters: C.chapters.length,
    sections: ids.size,
    cards: C.cards.length,
    quiz: C.quiz.length,
    cases: C.cases.length,
    drills: drills.length,
    badSectionIds: C.chapters.flatMap((ch) => ch.sections.filter((s) => !s.id.startsWith(ch.id + "-")).map((s) => s.id)),
    badCards: C.cards.filter((c) => !ids.has(c.sec) || !c.sec.startsWith(c.ch + "-")).map((c) => c.id),
    badQuiz: C.quiz.filter((q) => !ids.has(q.sec) || !q.sec.startsWith(q.ch + "-")).map((q) => q.id),
    badOpts: C.quiz.filter((q) => q.opts.length !== 4 || q.a < 0 || q.a > 3).map((q) => q.id),
    badCases: C.cases.filter((c) => !ids.has(c.section)).map((c) => c.id),
    badDrills: drills.filter((d) => (d.sec && !ids.has(d.sec)) || (d.case && !C.cases.some((c) => c.id === d.case))
      || !C.drillSets.concat({ id: "casos", name: "", origin: "material" }).some((s) => s.id === d.set)
      || d.parts.some((p) => (p.axis && !C.axes[p.axis]) || !optOk(p.axis, p.ans) || (p.alt ?? []).some((a) => !optOk(p.axis, a)))).map((d) => d.id),
    badAxisSecs: Object.entries(C.axes).flatMap(([k, ax]) => ax.options.filter((o) => o.sec && !ids.has(o.sec)).map((o) => `${k}/${o.v}`)),
    badSim: (C.simulado?.questions ?? []).filter((q) => (q.sec && !ids.has(q.sec))
      || q.fields.some((f) => (f.pick && !C.axes[f.pick]) || !optOk(f.pick, f.ans))).map((q) => q.n),
    badRefs: refs,
    dup: { cards: dup(C.cards), quiz: dup(C.quiz), cases: dup(C.cases), drills: dup(drills), checklists: checklistIds.length - new Set(checklistIds).size },
  }
}
