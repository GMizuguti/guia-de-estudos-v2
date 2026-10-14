// Converte o conteúdo de um app feito com a skill v1 (src/data/*.js, que penduram objetos em window.BACT)
// em módulos TypeScript em src/content/ deste projeto. Não reescreve texto: serializa os mesmos objetos.
//
// Uso:  node tools/convert-v1.mjs "C:/caminho/do/app-v1"
//
// O que sai pronto: capítulos, casos, fichas, questões, comparador, treino, eixos (dados), mapa, simulado
// (dados) e meta. O que NÃO dá para converter sozinho fica listado em src/content/PORTAR.md:
//   - funções (axesConflict, drillInterpret.fn, detect do simulado): ficam de fora + código original no PORTAR.md
//   - esquemas de data/figuras.js (HTML montado com F.*): viram componentes provisórios em figuras.tsx
//   - brandIcon (classe Phosphor): vira BookOpen do lucide-react
// Depois: npx tsc -b (campos que o tipo da v2 não conhece aparecem como erro), window.__check() e coverage.py.
import fs from "node:fs"
import path from "node:path"
import vm from "node:vm"

const V1 = process.argv[2]
if (!V1) {
  console.error('uso: node tools/convert-v1.mjs "caminho/do/app-v1"')
  process.exit(1)
}
const ROOT = path.resolve(import.meta.dirname, "..")
const OUT = path.join(ROOT, "src", "content")

// ---- carrega os dados na ordem do index.html da v1
const html = fs.readFileSync(path.join(V1, "src", "index.html"), "utf8")
const dataFiles = [...html.matchAll(/<script src="(data\/[^"]+\.js)"/g)].map((m) => m[1])
const ctx = { window: {} }
vm.createContext(ctx)
for (const f of dataFiles) vm.runInContext(fs.readFileSync(path.join(V1, "src", f), "utf8"), ctx, { filename: f })
const B = ctx.window.BACT
const store = fs.readFileSync(path.join(V1, "src", "js", "store.js"), "utf8")
const slug = (store.match(/KEY\s*=\s*"([^"]+)\.v1"/) ?? [])[1] ?? "TROCAR-SLUG"

// ---- serializador: objeto JS → literal TypeScript legível. Funções viram undefined com comentário;
// fns() as coleta à parte para o PORTAR.md.
const todo = []
const IDENT = /^[A-Za-z_$][\w$]*$/
const NL = "\n"
function lit(v, ind = "") {
  if (v === null || v === undefined) return "null"
  if (typeof v === "string") return JSON.stringify(v)
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  if (typeof v === "function") return "undefined /* TODO: função da v1, ver PORTAR.md */"
  const next = ind + "  "
  if (Array.isArray(v)) {
    if (!v.length) return "[]"
    const flat = v.every((x) => typeof x !== "object" || x === null)
    const one = "[" + v.map((x) => lit(x)).join(", ") + "]"
    if (flat && one.length + ind.length < 110) return one
    return "[" + NL + v.map((x) => next + lit(x, next)).join("," + NL) + NL + ind + "]"
  }
  const keys = Object.keys(v).filter((k) => v[k] !== undefined)
  if (!keys.length) return "{}"
  const key = (k) => (IDENT.test(k) ? k : JSON.stringify(k))
  const one = "{ " + keys.map((k) => key(k) + ": " + lit(v[k])).join(", ") + " }"
  if (one.length + ind.length < 110 && !one.includes(NL) && !one.includes("TODO")) return one
  return "{" + NL + keys.map((k) => next + key(k) + ": " + lit(v[k], next)).join("," + NL) + NL + ind + "}"
}
function fns(v, where) {
  if (typeof v === "function") todo.push({ where, code: v.toString() })
  else if (Array.isArray(v)) v.forEach((x, i) => fns(x, `${where}[${i}]`))
  else if (v && typeof v === "object") for (const k of Object.keys(v)) fns(v[k], `${where}.${k}`)
}
// devolve o próprio objeto, registrando as funções que houver nele
const data = (o, where) => {
  fns(o, where)
  return o
}

const HEAD = "// Gerado por tools/convert-v1.mjs a partir da v1. Texto do material: não editar sem conferir o PDF." + NL
function write(name, body) {
  const file = path.join(OUT, name)
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, HEAD + body + NL)
  console.log("ok", path.relative(ROOT, file))
}

// ---- capítulos (substitui os de exemplo)
const chapters = data(B.chapters ?? [], "chapters")
const nn = (ch) => "c" + String(ch.num).padStart(2, "0")
const capDir = path.join(OUT, "capitulos")
if (fs.existsSync(capDir)) for (const f of fs.readdirSync(capDir)) fs.rmSync(path.join(capDir, f))
for (const ch of chapters) {
  write(`capitulos/${nn(ch)}.ts`, `import type { Chapter } from "@/engine/types"${NL}${NL}const capitulo: Chapter = ${lit(ch)}${NL}${NL}export default capitulo`)
}
write("capitulos/index.ts",
  chapters.map((ch) => `import ${nn(ch)} from "./${nn(ch)}"`).join(NL) +
  `${NL}import type { Chapter } from "@/engine/types"${NL}${NL}export const chapters: Chapter[] = [${chapters.map(nn).join(", ")}]`)

// ---- auxiliares
write("auxiliares.ts", [
  `import type { Card, CaseItem, CompareData, QuizItem } from "@/engine/types"`,
  `export const cases: CaseItem[] = ${lit(data(B.cases ?? [], "cases"))}`,
  `export const cards: Card[] = ${lit(data(B.cards ?? [], "cards"))}`,
  `export const quiz: QuizItem[] = ${lit(data(B.quiz ?? [], "quiz"))}`,
  `export const compare: CompareData = ${lit({ fields: B.compareFields ?? [], profiles: B.compare ?? [] })}`,
].join(NL + NL))

// ---- eixos
if (B.axesConflict) fns(B.axesConflict, "axesConflict")
write("eixos.ts", [
  `import type { Axis, Html } from "@/engine/types"`,
  `export const axes: Record<string, Axis> = ${lit(data(B.axes ?? {}, "axes"))}`,
  `export const axesConflict: ((choice: Record<string, string>) => Html | null) | null = null${B.axesConflict ? " // TODO: portar (PORTAR.md)" : ""}`,
  `export const selfCheck: [string, Html][] | null = ${lit(data(B.selfCheck ?? null, "selfCheck"))}`,
].join(NL + NL))

// ---- treino
write("treino.ts", [
  `import type { Drill, DrillExam, DrillInterpret, DrillSet } from "@/engine/types"`,
  `export const drillSets: DrillSet[] = ${lit(data(B.drillSets ?? [], "drillSets"))}`,
  `export const drills: Drill[] = ${lit(data(B.drills ?? [], "drills"))}`,
  `export const drillExam: DrillExam | null = ${lit(data(B.drillExam ?? null, "drillExam"))}`,
  // drillInterpret sem a função não serve para nada: fica null e o código vai para o PORTAR.md
  `export const drillInterpret: DrillInterpret | null = null${B.drillInterpret ? " // TODO: portar (PORTAR.md)" : ""}`,
  // a v1 não tinha nome de slot: o filtro do Treino usa o label do eixo (ou o próprio slot)
  `export const slotLabels: Record<string, string> = {}`,
].join(NL + NL))
if (B.drillInterpret) fns(B.drillInterpret, "drillInterpret")

// ---- mapa e simulado
write("mapa.ts", `import type { Mapa } from "@/engine/types"${NL}${NL}export const mapa: Mapa | null = ${lit(data(B.mapa ?? null, "mapa"))}`)
write("simulado.ts", `import type { Simulado } from "@/engine/types"${NL}${NL}export const simulado: Simulado | null = ${lit(data(B.simulado ?? null, "simulado"))}`)

// ---- meta: brandIcon vira ícone do lucide; atalhos do roteiro perdem o ícone Phosphor
const meta = data(B.meta ?? {}, "meta")
const phosphor = meta.brandIcon
delete meta.brandIcon
for (const a of [...(meta.roteiro?.beforeActions ?? []), ...(meta.roteiro?.steps ?? []).flatMap((s) => s.actions ?? [])]) delete a.icon
const metaLit = lit({ slug, ...meta }).replace("{" + NL, "{" + NL + `  brandIcon: BookOpen, // era "${phosphor}" (Phosphor): troque por um ícone do lucide-react` + NL)
write("meta.ts", [
  `import { BookOpen } from "lucide-react"${NL}import type { Meta } from "@/engine/types"`,
  `// slug "${slug}": a mesma chave da v1, então o progresso salvo continua valendo${NL}export const meta: Meta = ${metaLit}`,
].join(NL + NL))

// ---- figuras: provisórias, para compilar; porte cada uma à mão com @/engine/figure-kit
const figs = Object.keys(B.figures ?? {})
for (const f of figs) todo.push({ where: `figura "${f}"`, code: B.figures[f].toString() })
write("figuras.tsx", [
  `import type { ComponentType } from "react"`,
  `// TODO: porte cada esquema da v1 (HTML com F.*) para um componente React; o código original está no PORTAR.md${NL}` +
  `const provisoria = (nome: string) => () => <p className="text-muted-foreground text-sm">Esquema "{nome}" ainda não portado para a v2.</p>`,
  `export const figures: Record<string, ComponentType> = {${NL}${figs.map((f) => `  ${IDENT.test(f) ? f : JSON.stringify(f)}: provisoria(${JSON.stringify(f)}),`).join(NL)}${NL}}`,
].join(NL + NL))

// ---- lista do que falta
const FENCE = "```"
fs.writeFileSync(path.join(OUT, "PORTAR.md"),
  `# O que portar à mão depois da conversão${NL}${NL}Gerado por tools/convert-v1.mjs. Apague este arquivo quando tudo estiver portado.${NL}${NL}` +
  (todo.map((t) => `## ${t.where}${NL}${NL}${FENCE}js${NL}${t.code}${NL}${FENCE}${NL}`).join(NL) || "Nada: nenhuma função nos dados." + NL))
console.log(`${NL}${chapters.length} capítulos · ${todo.length} item(ns) para portar em src/content/PORTAR.md · slug "${slug}"`)
