/* Renderização dos blocos de conteúdo */
import { useMemo, useState } from "react"
import { FlaskConical, GraduationCap, Lightbulb, Map as MapIcon, MessageSquareText, PencilLine, Search, TriangleAlert, ZoomIn } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { C, M } from "./core"
import { FreeTable } from "./free-table"
import { CodeBlock } from "./code"
import { DiagramFigure } from "./diagram"
import { H } from "./html"
import { MathBlock } from "./math"
import { Mermaid } from "./mermaid"
import { useNav } from "./nav"
import { fold, strip } from "./search"
import { actions, useStore } from "./store"
import type { Block, CalloutKind, DerivRow, Html } from "./types"

/* ---------- destaques ---------- */

const CALLOUT: Record<CalloutKind, { icon: typeof Lightbulb; label: string; box: string; fg: string }> = {
  clave: { icon: Lightbulb, label: "Ideia central", box: "border-clave-line bg-clave-bg border-l-clave", fg: "text-clave" },
  examen: { icon: GraduationCap, label: "Cai na prova", box: "border-examen-line bg-examen-bg border-l-examen", fg: "text-examen" },
  lab: { icon: FlaskConical, label: "Na prática", box: "border-lab-line bg-lab-bg border-l-lab", fg: "text-lab" },
  alerta: { icon: TriangleAlert, label: "Atenção", box: "border-alerta-line bg-alerta-bg border-l-alerta", fg: "text-alerta" },
}
for (const l of M.legend ?? []) if (CALLOUT[l.kind]) CALLOUT[l.kind].label = l.name
export const calloutMeta = CALLOUT

function Callout({ b }: { b: Extract<Block, { t: "callout" }> }) {
  const m = CALLOUT[b.kind]
  const Icon = m.icon
  return (
    <aside role="note" className={cn("my-4 max-w-none rounded-xl border border-l-4 px-4 py-3", m.box)}>
      <div className={cn("mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase", m.fg)}>
        {b.label ? <H html={b.label} /> : <><Icon className="size-4" aria-hidden />{m.label}</>}
      </div>
      {b.title && <H as="p" html={b.title} className="font-semibold" />}
      <Blocks blocks={b.blocks} />
    </aside>
  )
}

/* ---------- tabela ---------- */

function FreeTableBlock({ b }: { b: Extract<Block, { t: "table" }> }) {
  return (
    <figure className="my-5 max-w-none font-sans">
      {b.caption && <H as="figcaption" html={b.caption} className="text-muted-foreground mb-1 text-xs font-semibold" />}
      <FreeTable
        corner={<H html={b.cols[0] ?? ""} />}
        cols={b.cols.slice(1).map((c, i) => <H key={i} html={c} className="text-muted-foreground text-[11px] font-semibold tracking-[.07em] uppercase" />)}
        rows={b.rows.map((r) => ({ head: <H html={r[0]} className="text-[13.5px]" />, cells: r.slice(1).map((c) => ({ content: <H html={c} /> })) }))}
      />
    </figure>
  )
}

function TableBlock({ b }: { b: Extract<Block, { t: "table" }> }) {
  if (b.variant === "livre") return <FreeTableBlock b={b} />
  return <NormalTable b={b} />
}

function NormalTable({ b }: { b: Extract<Block, { t: "table" }> }) {
  const [q, setQ] = useState("")
  const needle = fold(q.trim())
  const rows = useMemo(() => b.rows.map((r) => ({ r, key: fold(r.map(strip).join(" ")) })), [b.rows])
  const shown = needle ? rows.filter((x) => x.key.includes(needle)) : rows
  return (
    <div className="my-5 max-w-none overflow-hidden rounded-lg">
      {b.caption && <H as="div" html={b.caption} className="text-soft-foreground px-1 pb-2 text-xs font-semibold" />}
      {b.filterable && (
        <div className="mb-2 flex items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrar linhas desta tabela…" aria-label="Filtrar tabela" className="pl-9" />
          </div>
          <span className="text-muted-foreground shrink-0 font-mono text-xs">{shown.length} de {rows.length} linhas</span>
        </div>
      )}
      <Table className="font-sans text-[13.5px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">{b.cols.map((c, i) => <TableHead key={i} className="whitespace-normal"><H html={c} /></TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>
          {shown.map(({ r }, i) => (
            <TableRow key={i}>{r.map((c, j) => <TableCell key={j} className={cn(j === 0 && "text-foreground font-medium")}><H html={c} /></TableCell>)}</TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

/* ---------- derivação passo a passo ---------- */

function derivTone(r: DerivRow) {
  if (r.tone) return r.tone
  if (/^[✔✓]$/.test(r.n.trim())) return "done"
  if (/^(0|[a-z])$/.test(r.n.trim())) return "start"
  return "step"
}

// marcador do passo: partida vazada, passo no acento suave, resultado em verde cheio
const DERIV_DOT = {
  start: "border-border-strong bg-card text-soft-foreground",
  step: "border-primary-line bg-primary-soft text-primary",
  done: "border-lab bg-lab text-white dark:text-background",
}

/* Linha do tempo: cada marcador ligado ao seguinte por um fio. A partir de sm, três colunas
   (marcador · passo e regra · fórmula), com as fórmulas alinhadas umas sob as outras; abaixo,
   o passo vai em cima da fórmula. A fórmula é texto do material, na fonte das fórmulas; o
   resultado sai emoldurado em verde. As colunas são subgrid: um rótulo largo ("2–5") alarga a
   coluna do marcador em todas as linhas. Alinhamento com o centro do marcador (20 px do topo da
   linha): passo pt-2.5 + entrelinha 20 px; fórmula pt-2 + entrelinha 24 px. */
function Deriv({ b }: { b: Extract<Block, { t: "deriv" }> }) {
  const last = b.rows.length - 1
  return (
    <figure className="bg-card my-5 max-w-none overflow-hidden rounded-[14px] border font-sans">
      {b.title && <H as="figcaption" html={b.title} className="bg-secondary text-soft-foreground border-b px-4 py-2 text-[13px] font-semibold" />}
      <ol className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 px-4 pt-3 pb-1 sm:grid-cols-[auto_minmax(0,11rem)_minmax(0,1fr)] sm:gap-x-4">
        {b.rows.map((r, i) => {
          const tone = derivTone(r)
          return (
            // my-0!: o .prose-manual li dá margem a todo item de lista, e ela cortaria o fio
            <li key={i} className="col-span-full my-0! grid grid-cols-subgrid">
              <div className="row-span-2 flex flex-col items-center sm:row-span-1">
                <span aria-hidden className={cn("h-1.5 w-px", i > 0 && "bg-border")} />
                <span className={cn("grid h-7 min-w-7 place-items-center rounded-full border px-1.5 font-mono text-xs font-semibold", DERIV_DOT[tone])}>{r.n}</span>
                <span aria-hidden className={cn("w-px flex-1", i < last && "bg-border")} />
              </div>
              <div className="min-w-0 pt-2.5 sm:pb-3.5">
                <H as="div" html={r.step} className={cn("text-[13px] leading-5 font-semibold", tone === "done" ? "text-lab" : "text-soft-foreground")} />
                {r.rule && <H as="div" html={r.rule} className="formula-font bg-secondary text-muted-foreground mt-1 w-fit max-w-full rounded-md px-1.5 py-0.5 text-xs [overflow-wrap:anywhere]" />}
              </div>
              <div className="min-w-0 pt-1 pb-3.5 sm:pt-2">
                <H as="div" html={r.html} className={cn("formula-font text-[15px] leading-6 [overflow-wrap:anywhere]",
                  tone === "done" && "border-lab-line bg-lab-bg mt-0.5 w-fit max-w-full rounded-lg border px-2.5 py-1 sm:-my-1")} />
                {r.note && <H as="div" html={r.note} className="text-muted-foreground mt-1.5 text-[12.5px] leading-snug" />}
              </div>
            </li>
          )
        })}
      </ol>
    </figure>
  )
}

/* ---------- caso ---------- */

export function drillForCase(caseId: string) {
  return C.drills.find((d) => d.id === caseId || d.case === caseId)?.id ?? (C.cases.some((c) => c.id === caseId) ? caseId : null)
}

function CaseBlock({ id }: { id: string }) {
  const { go } = useNav()
  const c = C.cases.find((x) => x.id === id)
  if (!c) return null
  const drill = drillForCase(c.id)
  return (
    <div className="bg-card my-4 max-w-none overflow-hidden rounded-xl border font-sans">
      <div className="bg-muted/40 border-b px-4 py-3">
        <div className="text-examen mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase"><PencilLine className="size-3.5" aria-hidden />{c.label}</div>
        <H as="p" html={c.title} className="text-sm font-semibold" />
      </div>
      <H as="div" html={c.stem} className="px-4 pt-3" />
      <Accordion multiple className="px-4 pb-2">
        {c.questions.map((q, i) => (
          <AccordionItem key={i} value={String(i)}>
            <AccordionTrigger><H html={q.q} /></AccordionTrigger>
            <AccordionContent><H as="div" html={q.a} className="text-muted-foreground" /></AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
      {drill && (
        <div className="px-4 pb-3">
          <Button variant="link" size="sm" className="px-0" onClick={() => go({ view: "treino", focus: drill })}><PencilLine />Responder por escrito no Treino →</Button>
        </div>
      )}
    </div>
  )
}

/* ---------- esquema do app ---------- */

export function Figure({ refName, title, framed = true }: { refName: string; title?: Html; framed?: boolean }) {
  const F = C.figures[refName]
  if (!F) return null
  const head = title && <H as="p" html={title} className="mt-0 mb-3 font-sans text-[15px] font-semibold" />
  if (!framed) return <>{head}<F /></>
  return (
    <figure className="bg-card my-5 max-w-none rounded-xl border border-dashed p-4 font-sans">
      <figcaption className="text-muted-foreground mb-3 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase"><MapIcon className="size-3.5" aria-hidden />Esquema do app · não está no material</figcaption>
      {head}
      <F />
    </figure>
  )
}

/* ---------- explicação do app ---------- */

function Explica({ b }: { b: Extract<Block, { t: "explica" }> }) {
  return (
    <aside role="note" className="border-primary-line bg-primary-soft/40 my-5 max-w-none rounded-xl border border-dashed px-4 py-3.5">
      <div className="text-primary mb-2 flex items-center gap-1.5 font-sans text-[11px] font-semibold tracking-wider uppercase">
        <MessageSquareText className="size-3.5" aria-hidden />Explicação do app · não está no material
      </div>
      {b.title && <H as="p" html={b.title} className="font-semibold" />}
      <Blocks blocks={b.blocks} framed={false} />
    </aside>
  )
}

function MermaidBlock({ b, framed = true }: { b: Extract<Block, { t: "mermaid" }>; framed?: boolean }) {
  return (
    <figure className={cn("my-5 max-w-none font-sans", framed && "bg-card rounded-xl border border-dashed p-4")}>
      {framed && <figcaption className="text-muted-foreground mb-3 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase"><MapIcon className="size-3.5" aria-hidden />Esquema do app · não está no material</figcaption>}
      <Mermaid code={b.code} />
      {b.caption && <H as="p" html={b.caption} className="text-muted-foreground mt-2 text-center text-xs" />}
    </figure>
  )
}

/* ---------- lista de conferência ---------- */

function Checklist({ b }: { b: Extract<Block, { t: "checklist" }> }) {
  const checks = useStore((s) => s.checks)
  return (
    <div className="my-4 grid max-w-none gap-2 font-sans">
      {b.items.map((it, i) => {
        const key = `${b.id}-${typeof it === "string" ? i : it.id}`
        const html = typeof it === "string" ? it : it.html
        const on = !!checks[key]
        return (
          <label key={key} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors", on ? "border-lab-line bg-lab-bg" : "bg-card hover:bg-muted/50")}>
            <Checkbox checked={on} onCheckedChange={(v) => actions.setCheck(key, !!v)} className="mt-0.5" />
            <H html={html} />
          </label>
        )
      })}
    </div>
  )
}

/* ---------- imagem do material ---------- */

function ImgBlock({ b }: { b: Extract<Block, { t: "img" }> }) {
  const [open, setOpen] = useState(false)
  return (
    <figure className="my-5 max-w-none font-sans">
      <button type="button" onClick={() => setOpen(true)} className={cn("group relative block w-full overflow-hidden rounded-xl border", b.dark !== "inverter" && "bg-white p-3")} aria-label={`Ampliar: ${b.alt}`}>
        <img src={b.src} alt={b.alt} width={b.w} height={b.h} loading="lazy" className={cn("mx-auto h-auto max-w-full", b.dark === "inverter" && "dark:invert dark:hue-rotate-180")} />
        <ZoomIn className="bg-background/80 absolute top-2 right-2 size-7 rounded-md p-1.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </button>
      {(b.caption || b.page) && (
        <figcaption className="text-muted-foreground mt-2 text-center text-xs">
          <H html={b.caption} />{b.page ? <span className="font-mono"> · pág. {b.page}</span> : null}
        </figcaption>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92vh] max-w-[92vw] overflow-auto sm:max-w-[92vw]">
          <DialogTitle className="sr-only">{b.alt}</DialogTitle>
          <img src={b.src} alt={b.alt} className="mx-auto h-auto max-w-none rounded-md bg-white" />
        </DialogContent>
      </Dialog>
    </figure>
  )
}

/* ---------- despacho ---------- */

/** Colunas por quantidade, pela largura do bloco (container query): 2 lado a lado a partir de 36 rem,
 *  3 a partir de 42 rem, 4 em 2 × 2 a partir de 32 rem. */
const COLS: Record<number, string> = { 1: "", 2: "@xl:grid-cols-2", 3: "@2xl:grid-cols-3", 4: "@lg:grid-cols-2" }

export function BlockView({ b, framed = true }: { b: Block; framed?: boolean }) {
  switch (b.t) {
    case "p": return <H as="p" html={b.html} />
    case "h": return <H as="h4" html={b.text} />
    case "ul": return <ul>{b.items.map((i, k) => <H key={k} as="li" html={i} />)}</ul>
    case "steps":
      return (
        <div className="bg-muted/30 my-4 max-w-none rounded-xl border p-4">
          {b.title && <H as="div" html={b.title} className="mb-2 font-sans text-sm font-semibold" />}
          <ol className="grid gap-2">
            {b.items.map((i, k) => (
              <li key={k} className="flex gap-3"><span className="bg-primary text-primary-foreground grid size-6 shrink-0 place-items-center rounded-full font-mono text-xs">{k + 1}</span><H html={i} /></li>
            ))}
          </ol>
        </div>
      )
    case "table": return <TableBlock b={b} />
    case "math": return <MathBlock tex={b.tex} caption={b.caption} plain={b.plain} />
    case "deriv": return <Deriv b={b} />
    case "code": return <CodeBlock code={b.code} lang={b.lang} title={b.title} caption={b.caption} numbers={b.numbers} />
    case "codes":
      return (
        <div className="@container my-5 max-w-none">
          <div className={cn("grid gap-3", COLS[Math.min(b.items.length, 4)])}>
            {b.items.map((c, k) => <CodeBlock key={k} compact code={c.code} lang={c.lang} heading={c.title} caption={c.caption} />)}
          </div>
        </div>
      )
    case "diagram": return <DiagramFigure spec={b.spec} caption={b.caption} page={b.page} alt={b.alt} />
    case "cols":
      return (
        <div className="@container my-4 max-w-none">
          <div className={cn("grid gap-3", COLS[Math.min(b.columns.length, 4)])}>
            {b.columns.map((c, k) => (
              <div key={k} className="bg-card min-w-0 rounded-xl border px-4 py-3.5 [&>*:last-child]:mb-0">
                {c.title && <H as="div" html={c.title} className="mb-1.5 font-sans text-sm font-semibold" />}
                <Blocks blocks={c.blocks} />
              </div>
            ))}
          </div>
        </div>
      )
    case "aside": return <H as="div" html={b.html} className="bg-muted/50 text-muted-foreground my-4 rounded-r-lg border-l-2 px-4 py-2.5 text-[0.95em]" />
    case "callout": return <Callout b={b} />
    case "phrases":
      return (
        <div className="my-4 grid max-w-none gap-3">
          {b.items.map((t, k) => (
            <div key={k} className="bg-card flex gap-4 rounded-xl border p-4"><span className="text-primary font-mono text-lg font-semibold">{k + 1}</span><H html={t} /></div>
          ))}
        </div>
      )
    case "case": return <CaseBlock id={b.ref} />
    case "figure": return <Figure refName={b.ref} title={b.title} framed={framed} />
    case "checklist": return <Checklist b={b} />
    case "mermaid": return <MermaidBlock b={b} framed={framed} />
    case "img": return <ImgBlock b={b} />
    case "explica": return <Explica b={b} />
  }
}

export function Blocks({ blocks, framed = true }: { blocks: Block[]; framed?: boolean }) {
  return <>{blocks.map((b, i) => <BlockView key={i} b={b} framed={framed} />)}</>
}
