/* Índice de busca: manual, fichas, questões, casos, treino, enunciados do simulado e comparador.
   Insensível a acentos e caixa. O gabarito do simulado fica de fora de propósito. */
import { C, chapterLabel, words } from "./core"
import { diagramText } from "./diagram"
import { plainMath, texPlain } from "./tex-plain"
import type { Block, SimBlock } from "./types"

export type Target =
  | { view: "manual"; chapter: string; section?: string }
  | { view: "treino"; focus: string }
  | { view: "simulado"; focus?: number }
  | { view: "comparador"; profile: string }

export interface Entry { kind: string; icon: string; title: string; sub: string; raw?: string; text: string; go: Target; weight: number }

export function strip(html: string) {
  const text = String(html).replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  return plainMath(text) // fórmulas \( … \) viram texto simples: "h(n) ≤ h*(n)"
    .replace(/\s+/g, " ").replace(/\s+([,.;:!?»)\]])/g, "$1").replace(/([«([])\s+/g, "$1").trim()
}

export function fold(s: string) {
  return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

function blockText(b: Block | SimBlock, out: string[]) {
  switch (b.t) {
    case "p": case "aside": out.push(strip(b.html)); break
    case "h": out.push(strip(b.text)); break
    case "ul": case "phrases": b.items.forEach((i) => out.push(strip(i))); break
    case "steps": if (b.title) out.push(strip(b.title)); b.items.forEach((i) => out.push(strip(i))); break
    case "cols": b.columns.forEach((c) => { if (c.title) out.push(strip(c.title)); c.blocks.forEach((x) => blockText(x, out)) }); break
    case "table": if (b.caption) out.push(strip(b.caption)); out.push(b.cols.map(strip).join(" ")); b.rows.forEach((r) => out.push(r.map(strip).join(" "))); break
    case "callout": if (b.label) out.push(strip(b.label)); if (b.title) out.push(strip(b.title)); b.blocks.forEach((x) => blockText(x, out)); break
    case "explica": if (b.title) out.push(strip(b.title)); b.blocks.forEach((x) => blockText(x, out)); break
    case "deriv": if (b.title) out.push(strip(b.title)); b.rows.forEach((r) => out.push([r.n, r.step, r.rule ?? "", r.html, r.note ?? ""].map(strip).join(" "))); break
    case "checklist": b.items.forEach((i) => out.push(strip(typeof i === "string" ? i : i.html))); break
    case "img": out.push(strip(b.caption ?? ""), b.alt); break
    case "mermaid": if (b.caption) out.push(strip(b.caption)); break
    case "math": out.push(b.plain ? strip(b.tex) : texPlain(b.tex)); if (b.caption) out.push(strip(b.caption)); break
    case "diagram": out.push(diagramText(b.spec)); if (b.caption) out.push(strip(b.caption)); break
    case "codes": b.items.forEach((c) => { out.push(c.code); if (c.title) out.push(strip(c.title)); if (c.caption) out.push(strip(c.caption)) }); break
    case "code": out.push(b.code); if (b.title) out.push(b.title); if (b.caption) out.push(strip(b.caption)); break
    case "case": {
      const c = C.cases.find((x) => x.id === b.ref)
      if (c) { out.push(strip(c.title), strip(c.stem)); c.questions.forEach((q) => out.push(strip(q.q) + " " + strip(q.a))) }
    }
  }
}

let index: Entry[] | null = null

function build(): Entry[] {
  const idx: Entry[] = []
  for (const ch of C.chapters) {
    idx.push({ kind: words.chapter.toLowerCase(), icon: "book", title: `${chapterLabel(ch)} · ${strip(ch.title)}`, sub: strip(ch.kicker),
      text: fold([ch.title, ch.kicker, ch.tocDesc, ch.intro, (ch.tags ?? []).join(" ")].map(strip).join(" ")),
      go: { view: "manual", chapter: ch.id }, weight: 3 })
    for (const sec of ch.sections) {
      const parts: string[] = []
      sec.blocks.forEach((b) => blockText(b, parts))
      const body = parts.join("  ")
      idx.push({ kind: `${words.sectionOne} ${sec.num}`, icon: "text", title: strip(sec.title),
        sub: `${chapterLabel(ch, true)} · ${strip(ch.title)} — ${body.slice(0, 220)}`, raw: body,
        text: fold(`${sec.num} ${strip(sec.title)} ${body}`), go: { view: "manual", chapter: ch.id, section: sec.id }, weight: 2 })
    }
  }
  for (const c of C.cards) idx.push({ kind: "ficha", icon: "cards", title: strip(c.front), sub: strip(c.back),
    text: fold(strip(c.front) + " " + strip(c.back)), go: { view: "manual", chapter: c.ch, section: c.sec }, weight: 1 })
  for (const q of C.quiz) idx.push({ kind: "questão", icon: "quiz", title: strip(q.q), sub: `Resposta: ${strip(q.opts[q.a])} — ${strip(q.why)}`,
    text: fold(`${strip(q.q)} ${q.opts.map(strip).join(" ")} ${strip(q.why)}`), go: { view: "manual", chapter: q.ch, section: q.sec }, weight: 1 })
  for (const c of C.cases) idx.push({ kind: "caso", icon: "pencil", title: strip(c.title), sub: strip(c.stem),
    text: fold(`${strip(c.title)} ${strip(c.stem)} ${c.questions.map((q) => strip(q.q) + " " + strip(q.a)).join(" ")}`),
    go: { view: "treino", focus: c.id }, weight: 2 })
  for (const d of C.drills) {
    if (d.case || !d.title) continue
    idx.push({ kind: "treino", icon: "pencil", title: strip(d.title), sub: strip(d.stem ?? ""),
      text: fold(`${strip(d.title)} ${strip(d.stem ?? "")} ${strip(d.proposal ?? "")} ${d.parts.map((p) => strip(p.model ?? "")).join(" ")}`),
      go: { view: "treino", focus: d.id }, weight: 1 })
  }
  for (const q of C.simulado?.questions ?? []) {
    const extra: string[] = []
    q.blocks?.forEach((b) => blockText(b, extra))
    const body = strip(`${q.stem.join(" ")} ${extra.join(" ")} ${q.quote ?? ""} ${q.after ?? ""}`)
    idx.push({ kind: "simulado", icon: "clipboard", title: `${C.simulado?.homeTitle ?? "Simulado"} · Questão ${q.label ?? q.n}`, sub: body,
      text: fold(`simulado questao ${q.label ?? q.n} ${body}`), go: { view: "simulado", focus: q.n }, weight: 1 })
  }
  const first = C.compare.fields[0]?.key
  for (const a of C.compare.profiles) idx.push({ kind: "comparador", icon: "columns", title: a.name, sub: `${a.group} — ${strip(first ? a[first] ?? "" : "")}`,
    text: fold(`${a.name} ${a.group} ${C.compare.fields.map((f) => strip(a[f.key] ?? "")).join(" ")}`), go: { view: "comparador", profile: a.id }, weight: 2 })
  return idx
}

function excerpt(item: Entry, terms: string[]) {
  const source = item.raw ?? item.sub
  const f = fold(source)
  let pos = -1
  for (let i = 0; i < terms.length && pos === -1; i++) pos = f.indexOf(terms[i])
  if (pos === -1) return source.slice(0, 160)
  const start = Math.max(0, pos - 60)
  return (start > 0 ? "…" : "") + source.slice(start, start + 200) + (start + 200 < source.length ? "…" : "")
}

export function query(q: string, limit = 40) {
  index ??= build()
  const needle = fold(q).trim()
  if (!needle) return []
  const terms = needle.split(/\s+/).filter(Boolean)
  const out: { item: Entry; score: number }[] = []
  for (const it of index) {
    let score = 0
    let ok = true
    for (const t of terms) {
      const pos = it.text.indexOf(t)
      if (pos === -1) { ok = false; break }
      score += 100 - Math.min(pos, 90) / 10
      if (fold(it.title).includes(t)) score += 60
    }
    if (ok) out.push({ item: it, score: score + it.weight * 12 })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit).map((r) => ({ item: r.item, excerpt: excerpt(r.item, terms) }))
}

export function escapeHtml(s: string) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** Texto escapado com <mark> nos termos buscados (para dangerouslySetInnerHTML). */
export function highlight(text: string, q: string) {
  const terms = fold(q).split(/\s+/).filter((t) => t.length > 1)
  const safe = escapeHtml(text)
  if (!terms.length) return safe
  const folded = fold(safe)
  const marks: [number, number][] = []
  for (const t of terms) {
    let from = 0
    let at: number
    while ((at = folded.indexOf(t, from)) !== -1) { marks.push([at, at + t.length]); from = at + t.length }
  }
  if (!marks.length) return safe
  marks.sort((a, b) => a[0] - b[0])
  const merged: [number, number][] = []
  let cur = marks[0]
  for (const m of marks.slice(1)) { if (m[0] <= cur[1]) cur[1] = Math.max(cur[1], m[1]); else { merged.push(cur); cur = m } }
  merged.push(cur)
  let out = ""
  let last = 0
  for (const [a, b] of merged) { out += safe.slice(last, a) + "<mark>" + safe.slice(a, b) + "</mark>"; last = b }
  return out + safe.slice(last)
}
