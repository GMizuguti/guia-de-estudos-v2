/* Leitor do material: capítulo, seções com ferramentas (lido, marcador, nota), índice lateral e paginação */
import { useEffect, useRef, useState } from "react"
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Check, NotebookPen } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { Blocks } from "../blocks"
import { allSectionIds, C, chapterById, chapterLabel, words } from "../core"
import { H } from "../html"
import { scrollMainTo, useNav } from "../nav"
import { actions, useStore } from "../store"
import type { Section } from "../types"

function Ring({ pct }: { pct: number }) {
  const r = 8, c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 22 22" className="size-5 shrink-0 -rotate-90" aria-hidden>
      <circle cx="11" cy="11" r={r} fill="none" strokeWidth="2.5" className="stroke-muted" />
      <circle cx="11" cy="11" r={r} fill="none" strokeWidth="2.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} className={pct >= 1 ? "stroke-lab" : "stroke-primary"} />
    </svg>
  )
}

export function ChapterList({ onPick }: { onPick?: () => void }) {
  const { nav, go } = useNav()
  const read = useStore((s) => s.read)
  const readAll = allSectionIds.filter((id) => read[id]).length
  const pct = allSectionIds.length ? readAll / allSectionIds.length : 0
  return (
    <div className="grid gap-4">
      <div className="bg-muted/40 rounded-xl border p-3">
        <div className="flex items-baseline justify-between text-xs"><span className="font-medium">Progresso de leitura</span><span className="font-mono">{Math.round(pct * 100)}%</span></div>
        <div className="bg-muted mt-2 h-1.5 overflow-hidden rounded-full"><div className="bg-primary h-full rounded-full" style={{ width: `${pct * 100}%` }} /></div>
        <div className="text-muted-foreground mt-1.5 text-[11px]">{readAll} de {allSectionIds.length} {words.sectionsRead}</div>
      </div>
      <nav className="grid gap-1" aria-label={`${words.chapters} do ${words.doc}`}>
        {C.chapters.map((ch) => {
          const n = ch.sections.filter((s) => read[s.id]).length
          const active = nav.view === "manual" && nav.chapter === ch.id
          return (
            <button key={ch.id} type="button" aria-current={active || undefined} onClick={() => { go({ view: "manual", chapter: ch.id }); onPick?.() }}
              className={cn("flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors", active ? "bg-muted" : "hover:bg-muted/60")}>
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-md font-mono text-xs", active ? "bg-primary text-primary-foreground" : "bg-muted")}>{ch.badge ?? (ch.isAnnex ? "Ax" : ch.num)}</span>
              <span className="min-w-0 flex-1"><H as="span" html={ch.title} className="block text-[13px] leading-snug font-medium" /><H as="span" html={ch.tocDesc} className="text-muted-foreground line-clamp-2 block text-[11px]" /></span>
              <Ring pct={ch.sections.length ? n / ch.sections.length : 0} />
            </button>
          )
        })}
      </nav>
    </div>
  )
}

function SectionView({ sec }: { sec: Section }) {
  const read = useStore((s) => !!s.read[sec.id])
  const marked = useStore((s) => !!s.bookmarks[sec.id])
  const note = useStore((s) => s.notes[sec.id] ?? "")
  const [noteOpen, setNoteOpen] = useState(!!note)
  const tool = (label: string, pressed: boolean, onChange: () => void, icon: React.ReactNode, tone?: "lab") => (
    <Tooltip>
      <TooltipTrigger render={<Toggle size="sm" variant="outline" pressed={pressed} onPressedChange={onChange} aria-label={label}
        className={cn("text-muted-foreground bg-card size-8 min-w-8 px-0", tone === "lab" ? "data-pressed:border-lab-line data-pressed:bg-lab-bg data-pressed:text-lab" : "data-pressed:border-primary-line data-pressed:bg-primary-soft data-pressed:text-primary")} />}>{icon}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
  return (
    <section id={sec.id} data-section={sec.id} className="scroll-mt-4 pt-2 pb-8">
      <div className="mb-3 flex items-start gap-3">
        <span className="border-primary-line bg-primary-soft text-primary mt-1 shrink-0 rounded-[7px] border px-2 py-0.5 font-mono text-xs font-medium">{sec.num}</span>
        <H as="h2" html={sec.title} className="min-w-0 flex-1 text-xl font-semibold tracking-tight [overflow-wrap:anywhere]" />
        <div className="flex shrink-0 gap-1" data-print="hide">
          {tool("Marcar como lido", read, () => actions.setRead(sec.id, !read), <Check />, "lab")}
          {tool("Salvar nos marcadores", marked, () => { const on = actions.toggleBookmark(sec.id); toast(on ? "Salvo nos marcadores" : "Marcador removido") }, marked ? <BookmarkCheck /> : <Bookmark />)}
          {tool("Nota pessoal", noteOpen || !!note, () => setNoteOpen((o) => !o), <NotebookPen />)}
        </div>
      </div>
      <div className="prose-manual"><Blocks blocks={sec.blocks} /></div>
      {(noteOpen || note) && (
        <div className="bg-muted/30 mt-3 rounded-xl border border-dashed p-3" data-print="hide">
          <div className="text-muted-foreground mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase"><NotebookPen className="size-3.5" />Sua nota</div>
          <Textarea defaultValue={note} onChange={(e) => actions.setNote(sec.id, e.target.value)} placeholder="Escreva aqui o que quiser lembrar desta parte…" className="bg-background" />
        </div>
      )}
    </section>
  )
}

export function Reader() {
  const { nav, go } = useNav()
  const ch = chapterById(nav.chapter)
  const read = useStore((s) => s.read)
  const idx = C.chapters.indexOf(ch)
  const prev = C.chapters[idx - 1]
  const next = C.chapters[idx + 1]
  const [active, setActive] = useState<string | null>(null)
  const root = useRef<HTMLDivElement>(null)

  // rola até a seção pedida (ou ao topo) a cada navegação
  useEffect(() => {
    requestAnimationFrame(() => scrollMainTo(nav.section ? document.getElementById(nav.section) : null))
  }, [nav.nonce, nav.section, ch.id])

  // índice lateral acompanha a rolagem
  useEffect(() => {
    const main = document.getElementById("main")
    const obs = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) setActive(e.target.id) }), { root: main, rootMargin: "-10% 0px -75% 0px" })
    root.current?.querySelectorAll("section[data-section]").forEach((s) => obs.observe(s))
    return () => obs.disconnect()
  }, [ch.id])

  return (
    <div ref={root} className="mx-auto grid max-w-6xl gap-10 px-5 py-8 md:px-8 xl:grid-cols-[minmax(0,1fr)_220px]">
      <article className="min-w-0">
        <header className="mb-8 border-b pb-6">
          <Badge variant="secondary" className="font-mono">{ch.label ?? (ch.isAnnex ? "Anexo final" : chapterLabel(ch))} · pág. {ch.page}</Badge>
          <H as="h1" html={ch.title} className="mt-3 text-3xl leading-tight font-semibold tracking-tight md:text-4xl" />
          <H as="p" html={ch.kicker} className="text-muted-foreground mt-2 text-base" />
          {ch.intro && <H as="div" html={ch.intro} className="prose-manual mt-5 rounded-xl border-l-4 border-l-primary/40 bg-muted/30 px-5 py-4" />}
          {ch.tags && <div className="mt-4 flex flex-wrap gap-1.5">{ch.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</div>}
        </header>
        {ch.sections.map((s) => <SectionView key={s.id} sec={s} />)}
        <nav className="mt-6 grid gap-3 border-t pt-6 sm:grid-cols-2" data-print="hide">
          <button type="button" disabled={!prev} onClick={() => prev && go({ view: "manual", chapter: prev.id })} className="hover:bg-muted flex items-center gap-3 rounded-xl border p-4 text-left disabled:opacity-40">
            <ArrowLeft className="size-4" /><span><span className="text-muted-foreground block text-xs">Anterior</span><H as="span" html={prev ? prev.title : `Início do ${words.doc}`} className="block text-sm font-medium" /></span>
          </button>
          <button type="button" disabled={!next} onClick={() => next && go({ view: "manual", chapter: next.id })} className="hover:bg-muted flex items-center justify-end gap-3 rounded-xl border p-4 text-right disabled:opacity-40">
            <span><span className="text-muted-foreground block text-xs">Próxima</span><H as="span" html={next ? next.title : `Fim do ${words.doc}`} className="block text-sm font-medium" /></span><ArrowRight className="size-4" />
          </button>
        </nav>
      </article>
      <aside className="hidden xl:block" aria-label="Índice do capítulo" data-print="hide">
        <div className="sticky top-4">
          <div className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase">{words.inChapter}</div>
          <div className="grid gap-0.5 border-l">
            {ch.sections.map((s) => (
              <button key={s.id} type="button" onClick={() => scrollMainTo(document.getElementById(s.id))}
                className={cn("-ml-px flex gap-2 border-l-2 px-3 py-1.5 text-left text-xs transition-colors", active === s.id ? "border-primary text-foreground font-medium" : "text-muted-foreground hover:text-foreground border-transparent")}>
                {read[s.id] && <Check className="text-lab mt-0.5 size-3 shrink-0" />}<span>{s.num} <H html={s.title} /></span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  )
}
