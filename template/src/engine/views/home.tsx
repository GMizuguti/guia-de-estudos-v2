/* Capa: resumo do progresso, roteiro de hoje, ferramentas, conteúdo e marcadores */
import { BookOpenText, Bookmark, CalendarCheck, ClipboardList, Columns3, FlaskConical, GraduationCap, Layers, Lightbulb, ListChecks, Map as MapIcon, NotebookPen, PencilLine, TriangleAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { allSectionIds, C, chapterById, chapterLabel, findSection, M, words } from "../core"
import { drills } from "../drills"
import { H } from "../html"
import { useNav, type GoTarget } from "../nav"
import { useStore, type State } from "../store"
import type { CalloutKind, RoteiroAction, ViewId } from "../types"

// ícone de cada aba, para os atalhos do roteiro
const VIEW_ICON: Partial<Record<ViewId, typeof BookOpenText>> = {
  manual: BookOpenText, mapa: MapIcon, treino: PencilLine, simulado: ClipboardList, fichas: Layers, questoes: ListChecks, comparador: Columns3,
}

export function dueCount(srs: State["srs"]) {
  const now = Date.now()
  return C.cards.filter((c) => !srs[c.id] || srs[c.id].due <= now).length
}

function daysToExam() {
  const d = (M.examDate ?? "").split("-")
  if (d.length !== 3) return null
  const now = new Date()
  return Math.round((Date.UTC(+d[0], +d[1] - 1, +d[2]) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)
}

function actionTarget(a: RoteiroAction): GoTarget {
  return "section" in a ? { view: "manual", section: a.section } : { view: a.view }
}

export function TodayCard() {
  const { go } = useNav()
  const n = daysToExam()
  if (n === null) return null
  const R = M.roteiro
  if (n < 0) {
    return (
      <Card className="mt-6"><CardContent className="text-muted-foreground flex items-center gap-3 text-sm"><CalendarCheck className="size-5" />
        <span><b className="text-foreground">A prova foi em {M.examDateLabel ?? M.examDate}.</b> O conteúdo continua aqui para revisão.</span></CardContent></Card>
    )
  }
  const step = R?.steps.find((s) => s.days === n)
  const title = n === 0 ? "A prova é hoje" : `Faltam ${n} dia${n === 1 ? "" : "s"} para a prova`
  const acts = step?.actions ?? R?.beforeActions ?? []
  return (
    <div className="border-examen-line bg-examen-bg mt-6 rounded-xl border border-l-4 border-l-examen p-5">
      <div className="text-examen flex items-center gap-2 text-[11px] font-semibold tracking-wider uppercase"><CalendarCheck className="size-4" />{R?.title ?? "Roteiro de estudo"}{step && ` · ${step.momento}`}</div>
      <div className="mt-1.5 text-xl font-semibold tracking-tight">{title}</div>
      <H as="p" html={step?.texto ?? R?.before ?? "Siga lendo o material e fazendo os exercícios sem consultar."} className="text-muted-foreground mt-1.5 max-w-prose text-sm" />
      {n === 0 && R?.examDayNote && <H as="p" html={R.examDayNote} className="text-muted-foreground mt-1.5 max-w-prose text-sm" />}
      {acts.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {acts.map((a) => {
            const Icon = "view" in a ? VIEW_ICON[a.view] ?? BookOpenText : BookOpenText
            return <Button key={a.label} variant="outline" size="sm" onClick={() => go(actionTarget(a))}><Icon />{a.label}</Button>
          })}
        </div>
      )}
    </div>
  )
}

const LEGEND_ICON: Record<CalloutKind, { icon: typeof Lightbulb; cls: string }> = {
  clave: { icon: Lightbulb, cls: "border-clave-line bg-clave-bg text-clave" },
  examen: { icon: GraduationCap, cls: "border-examen-line bg-examen-bg text-examen" },
  lab: { icon: FlaskConical, cls: "border-lab-line bg-lab-bg text-lab" },
  alerta: { icon: TriangleAlert, cls: "border-alerta-line bg-alerta-bg text-alerta" },
}

function Tool({ icon: Icon, title, desc, onClick }: { icon: typeof Lightbulb; title: string; desc: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="bg-card hover:border-primary-line flex gap-3.5 rounded-[14px] border p-[17px] text-left transition-colors active:translate-y-px">
      <span className="border-primary-line bg-primary-soft text-primary grid size-9 shrink-0 place-items-center rounded-[10px] border"><Icon className="size-[19px]" /></span>
      <span><span className="block text-sm font-semibold">{title}</span><span className="text-muted-foreground mt-1 block text-[12.5px] leading-relaxed">{desc}</span></span>
    </button>
  )
}

export function Home() {
  const { go } = useNav()
  const read = useStore((s) => s.read)
  const srs = useStore((s) => s.srs)
  const quiz = useStore((s) => s.quiz)
  const drillRecs = useStore((s) => s.drills)
  const bookmarks = useStore((s) => s.bookmarks)
  const notes = useStore((s) => s.notes)
  const lastChapter = useStore((s) => s.lastChapter)

  const readN = allSectionIds.filter((id) => read[id]).length
  const pct = allSectionIds.length ? Math.round((readN / allSectionIds.length) * 100) : 0
  const due = dueCount(srs)
  const last = chapterById(lastChapter)
  let dDone = 0, parts = 0, right = 0
  for (const d of drills) {
    const r = drillRecs[d.id]
    if (!r?.done) continue
    dDone++
    d.parts.forEach((p, i) => { if (!p.axis) return; parts++; const v = r.choice[i]; if (v && (v === p.ans || p.alt?.includes(v))) right++ })
  }
  const marks = [...new Set([...Object.keys(bookmarks), ...Object.keys(notes)])].filter((id) => findSection(id))

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      <section className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <Badge variant="secondary" className="mb-4 h-auto max-w-full shrink justify-start text-left font-mono whitespace-normal">{M.heroEyebrow}</Badge>
          <h1 className="text-4xl leading-tight font-semibold tracking-tight md:text-5xl">
            <H html={M.heroTitle} />{M.heroEmphasis && <> <i className="font-normal"><H html={M.heroEmphasis} /></i></>}
          </h1>
          <H as="p" html={M.heroLead} className="text-muted-foreground mt-4 max-w-xl text-base leading-relaxed" />
          <div className="mt-6 flex flex-wrap gap-2">
            <Button size="lg" onClick={() => go({ view: "manual", chapter: last.id })}><BookOpenText />{readN > 0 ? `Continuar: ${chapterLabel(last)}` : "Começar a ler"}</Button>
            {drills.length > 0 && <Button size="lg" variant="outline" onClick={() => go({ view: "treino" })}><PencilLine />Treinar com resposta escrita</Button>}
            <Button size="lg" variant="outline" onClick={() => go({ view: "fichas" })}><Layers />Revisar {due} fichas</Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Card size="sm"><CardContent><div className="font-mono text-2xl font-semibold">{pct}%</div><div className="text-muted-foreground mt-1 text-xs">{words.docTab} lido · {readN} de {allSectionIds.length} {words.sections}</div><Progress value={pct} className="mt-2" /></CardContent></Card>
          {drills.length > 0 ? (
            <>
              <Card size="sm"><CardContent><div className="font-mono text-2xl font-semibold">{dDone} / {drills.length}</div><div className="text-muted-foreground mt-1 text-xs">Exercícios do treino corrigidos</div></CardContent></Card>
              <Card size="sm"><CardContent><div className="font-mono text-2xl font-semibold">{parts ? Math.round((right / parts) * 100) + "%" : "—"}</div><div className="text-muted-foreground mt-1 text-xs">Escolhas certas no treino</div></CardContent></Card>
            </>
          ) : (
            <>
              <Card size="sm"><CardContent><div className="font-mono text-2xl font-semibold">{C.cards.length}</div><div className="text-muted-foreground mt-1 text-xs">Fichas de revisão</div></CardContent></Card>
              <Card size="sm"><CardContent><div className="font-mono text-2xl font-semibold">{C.quiz.length}</div><div className="text-muted-foreground mt-1 text-xs">Questões</div></CardContent></Card>
            </>
          )}
          <Card size="sm"><CardContent><div className="font-mono text-2xl font-semibold">{quiz.best === null ? "—" : quiz.best + "%"}</div><div className="text-muted-foreground mt-1 text-xs">Melhor rodada de questões · {quiz.runs} rodadas</div></CardContent></Card>
        </div>
      </section>

      <TodayCard />

      <h2 className="mt-10 mb-4 text-lg font-semibold tracking-tight">Ferramentas de estudo</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {C.simulado && <Tool icon={ClipboardList} title={C.simulado.homeTitle ?? "Simulado"} desc={C.simulado.homeDesc ?? "Prova simulada com relógio, gabarito comentado e autoavaliação"} onClick={() => go({ view: "simulado" })} />}
        {C.mapa && <Tool icon={MapIcon} title={C.mapa.title ?? "Mapa de revisão"} desc={C.mapa.homeDesc ?? "O essencial em uma tela"} onClick={() => go({ view: "mapa" })} />}
        {drills.length > 0 && <Tool icon={PencilLine} title="Treino com resposta escrita" desc={`${drills.length} exercícios com resposta-modelo e autoavaliação${C.drillExam ? ` · prova aleatória de ${C.drillExam.minutes} minutos` : ""}`} onClick={() => go({ view: "treino" })} />}
        <Tool icon={Layers} title="Fichas de revisão" desc={`${due} pendentes hoje · repetição espaçada sobre ${C.cards.length} fichas`} onClick={() => go({ view: "fichas" })} />
        <Tool icon={ListChecks} title="Questões de múltipla escolha" desc={`${C.quiz.length} questões com explicação e link para o trecho de origem`} onClick={() => go({ view: "questoes" })} />
        {C.compare.profiles.length > 0 && <Tool icon={Columns3} title="Comparador" desc={`Até quatro ${words.compareNoun} lado a lado, campo a campo`} onClick={() => go({ view: "comparador" })} />}
      </div>

      {(M.howToUse || M.legend) && (
        <>
          <h2 className="mt-10 mb-3 text-lg font-semibold tracking-tight">Como usar este aplicativo</h2>
          {M.howToUse && <H as="p" html={M.howToUse} className="text-muted-foreground mb-4 max-w-3xl text-sm leading-relaxed" />}
          {M.legend && (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {M.legend.map((l) => {
                const L = LEGEND_ICON[l.kind]
                return (
                  <div key={l.kind} className={cn("flex gap-3 rounded-xl border p-3", L.cls)}>
                    <L.icon className="mt-0.5 size-4.5 shrink-0" />
                    <div><div className="text-sm font-semibold">{l.name}</div><H as="div" html={l.desc} className="text-muted-foreground mt-0.5 text-xs leading-relaxed" /></div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      <div className="mt-10 mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Conteúdo do {words.doc}</h2>
        <span className="text-muted-foreground text-sm">{C.chapters.length} {words.chapters}</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {C.chapters.map((ch) => {
          const n = ch.sections.filter((s) => read[s.id]).length
          const p = ch.sections.length ? Math.round((n / ch.sections.length) * 100) : 0
          return (
            <button key={ch.id} type="button" onClick={() => go({ view: "manual", chapter: ch.id })} className="bg-card hover:border-foreground/20 flex flex-col gap-2 rounded-xl border p-4 text-left transition-colors">
              <div className="text-muted-foreground flex justify-between font-mono text-xs"><span>{ch.label ? ch.label.toUpperCase() : ch.isAnnex ? "ANEXO" : String(ch.num).padStart(2, "0")}</span><span>{p}%</span></div>
              <H as="div" html={ch.title} className="text-sm leading-snug font-semibold" />
              <H as="div" html={ch.tocDesc} className="text-muted-foreground flex-1 text-xs" />
              <Progress value={p} />
            </button>
          )
        })}
      </div>

      {marks.length > 0 && (
        <>
          <h2 className="mt-10 mb-4 text-lg font-semibold tracking-tight">Seus marcadores e notas</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {marks.map((id) => {
              const e = findSection(id)!
              return (
                <button key={id} type="button" onClick={() => go({ view: "manual", section: id })} className="bg-card hover:border-foreground/20 flex flex-col gap-1.5 rounded-xl border p-4 text-left">
                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs">{bookmarks[id] ? <Bookmark className="size-3.5" /> : <NotebookPen className="size-3.5" />}{bookmarks[id] && notes[id] ? "marcador e nota" : bookmarks[id] ? "marcador" : "nota"} · {e.section.num}</div>
                  <H as="div" html={e.section.title} className="text-sm font-semibold" />
                  <div className="text-muted-foreground line-clamp-2 text-xs">{notes[id] ?? `${chapterLabel(e.chapter, true)} · ${e.chapter.title}`}</div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
