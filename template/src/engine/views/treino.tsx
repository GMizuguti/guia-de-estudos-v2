/* Treino com resposta escrita + prova aleatória com relógio */
import { useEffect, useMemo, useState } from "react"
import { Check, CircleCheck, CircleX, Flag, PencilLine, Play, RotateCcw, Scale, Signpost, Timer, Trash2, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { axisOption, C, countWords, optionName, shuffle, words } from "../core"
import { useConfirm } from "../confirm"
import { drillById, drills, drillSets, setOf, tabOf } from "../drills"
import { Cat } from "../figure-kit"
import { H } from "../html"
import { scrollMainTo, useNav } from "../nav"
import { actions, EMPTY_DRILL, getState, useStore, type DrillRec } from "../store"
import { chip, optionPill } from "../styles"
import type { Drill, DrillPart, DrillPickRule } from "../types"

const DEFAULT_CHECKS: [string, string][] = [
  ["ev", "Citei o <b>dado do enunciado</b> que sustenta a resposta"],
  ["li", "Expliquei o <b>raciocínio</b> que liga o dado à resposta"],
  ["de", "Disse por que a <b>alternativa mais próxima</b> não serve"],
]

type Mode = "" | "exam"
const keyOf = (d: Drill, mode: Mode) => (mode === "exam" ? "e:" : "") + d.id

function grade(p: DrillPart, v?: string) {
  if (!p.axis) return null
  if (!v) return "vazio"
  if (v === p.ans) return "ok"
  if (p.alt?.includes(v)) return "alt"
  return "bad"
}

function info(d: Drill) {
  const c = d.case ? C.cases.find((x) => x.id === d.case) : undefined
  const withAxis = d.parts.some((p) => p.axis)
  const axisAsk = C.axes[d.slot ?? d.parts.find((p) => p.axis)?.axis ?? ""]?.ask
  return {
    title: d.title ?? c?.title ?? "",
    stem: d.stem ?? c?.stem ?? "",
    ask: d.ask ?? (c && !withAxis ? "" : axisAsk ?? "Responda e justifique."),
    gab: d.gab ?? (c && withAxis && c.questions.length === 1 ? c.questions[0].a : ""),
    ch: d.ch ?? c?.chapter ?? "",
    sec: d.sec ?? c?.section ?? "",
  }
}

function label(d: Drill) {
  if (d.label) return d.label
  const c = d.case ? C.cases.find((x) => x.id === d.case) : undefined
  if (c) return c.label
  const s = setOf(d)
  return `${s.origin === "app" ? "Extra · " : ""}${s.name} ${drills.filter((x) => x.set === d.set).indexOf(d) + 1}`
}

/* ---------------- uma parte ---------------- */

function PartView({ d, p, i, rec, done, onChange }: { d: Drill; p: DrillPart; i: number; rec: DrillRec; done: boolean; onChange: (r: DrillRec) => void }) {
  const ax = p.axis ? C.axes[p.axis] : undefined
  const chosen = rec.choice[i] ?? ""
  const text = rec.text[i] ?? ""
  const set = (patch: Partial<DrillRec>) => onChange({ ...rec, ...patch })
  const g = grade(p, chosen)
  const checks = p.checks ?? ax?.checks ?? C.selfCheck ?? DEFAULT_CHECKS
  const self = rec.self[i] ?? {}
  const items = ax ? Object.fromEntries(ax.options.map((o) => [o.v, o.l])) : {}

  return (
    <div className="grid gap-2.5 border-t pt-4">
      {(p.label || ax) && (
        <div className="text-sm font-semibold">
          {p.label && <H html={p.label} />}{p.label && ax && " · "}{ax && <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">{ax.label}</span>}
        </div>
      )}
      {ax && ax.tone === "select" && (
        <Select items={items} value={chosen || null} onValueChange={(v) => set({ choice: { ...rec.choice, [i]: v ?? "" } })} disabled={done}>
          <SelectTrigger className="w-full max-w-xl"><SelectValue placeholder={ax.placeholder ?? "Escolha…"} /></SelectTrigger>
          <SelectContent>{ax.options.map((o) => <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}</SelectContent>
        </Select>
      )}
      {ax && ax.tone !== "select" && (
        <ToggleGroup variant="outline" spacing={1.5} className="flex-wrap" value={chosen ? [chosen] : []} disabled={done}
          onValueChange={(v) => set({ choice: { ...rec.choice, [i]: v[0] ?? "" } })} aria-label={ax.label}>
          {ax.options.map((o) => (
            <ToggleGroupItem key={o.v} value={o.v} className={optionPill(ax.tone)}>{o.l}</ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
      {p.text !== false && (
        <>
          <Textarea value={text} readOnly={done} rows={3} className="font-(family-name:--read-font) text-[15px]"
            placeholder={p.placeholder ?? ax?.textPlaceholder ?? (ax ? "Justifique: o dado do enunciado, o raciocínio e por que a alternativa próxima não serve…" : "Escreva a sua resposta…")}
            onChange={(e) => set({ text: { ...rec.text, [i]: e.target.value } })} />
          <div className="text-muted-foreground text-right font-mono text-[11px]">{countWords(text)} palavra{countWords(text) === 1 ? "" : "s"}</div>
        </>
      )}

      {done && (
        <>
          {g === "ok" && <Result tone="ok" icon={<CircleCheck />}>Correto: <b>{optionName(p.axis, p.ans)}</b></Result>}
          {g === "alt" && <Result tone="alt" icon={<Scale />}>Aceita se bem argumentada. Resposta principal: <b>{optionName(p.axis, p.ans)}</b>. <H html={p.altNote} /></Result>}
          {(g === "bad" || g === "vazio") && (
            <Result tone="bad" icon={<CircleX />}>
              {chosen ? <>Você marcou <b>{optionName(p.axis, chosen)}</b>. </> : "Sem resposta. "}Resposta: <b>{optionName(p.axis, p.ans)}</b>
              {p.alt && <> (também aceita, se argumentada: {p.alt.map((v) => optionName(p.axis, v)).join(", ")})</>}.
            </Result>
          )}
          {p.text !== false && !text.trim() && <Result tone="bad" icon={<TriangleAlert />}>Você não escreveu nada. Escrever a resposta é o que fixa o raciocínio e o que a prova corrige.</Result>}
          {i === 0 && info(d).gab && (
            <div className="bg-muted/40 rounded-lg border p-3 text-sm"><Tag>Gabarito do material</Tag><H as="div" html={info(d).gab} /></div>
          )}
          {p.model && (
            <div className="border-clave-line bg-clave-bg rounded-lg border border-l-4 border-l-clave p-3 font-(family-name:--read-font) text-[15px]">
              <Tag className="text-clave">{p.fromMaterial ? "Resposta do material" : "Resposta-modelo · escrita pelo app"}</Tag><H as="div" html={p.model} />
            </div>
          )}
          {checks.length > 0 && <div className="rounded-lg border border-dashed p-3">
            <Tag>Compare com o modelo e marque o que a sua resposta tem</Tag>
            <div className="grid gap-1.5">
              {checks.map(([k, l]) => (
                <Label key={k} className="flex items-start gap-2.5 font-normal">
                  <Checkbox checked={!!self[k]} className="mt-0.5" onCheckedChange={(v) => set({ self: { ...rec.self, [i]: { ...self, [k]: !!v } } })} />
                  <H html={l} />
                </Label>
              ))}
            </div>
          </div>}
        </>
      )}
    </div>
  )
}

const Tag = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("text-muted-foreground mb-1 block text-[10.5px] font-semibold tracking-wider uppercase", className)}>{children}</span>
)

function Result({ tone, icon, children }: { tone: "ok" | "alt" | "bad"; icon: React.ReactNode; children: React.ReactNode }) {
  const cls = tone === "ok" ? "border-lab-line bg-lab-bg [&>svg]:text-lab" : tone === "alt" ? "border-examen-line bg-examen-bg [&>svg]:text-examen" : "border-alerta-line bg-alerta-bg [&>svg]:text-alerta"
  return <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0", cls)}>{icon}<span>{children}</span></div>
}

/* ---------------- um exercício ---------------- */

function conflictOf(d: Drill, rec: DrillRec) {
  if (!C.axesConflict) return null
  const axes = new Set(d.parts.map((p) => p.axis).filter(Boolean))
  if (axes.size < 2) return null
  const ch: Record<string, string> = {}
  d.parts.forEach((p, i) => { if (p.axis && rec.choice[i] && !ch[p.axis]) ch[p.axis] = rec.choice[i] })
  return C.axesConflict(ch)
}

/** Selo do estado do exercício (v1): verde quando certo, vermelho para rever, neutro para rascunho. */
function Status({ tone, children }: { tone?: "ok" | "bad"; children: React.ReactNode }) {
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap",
      tone === "ok" ? "border-lab-line bg-lab-bg text-lab" : tone === "bad" ? "border-alerta-line bg-alerta-bg text-alerta" : "text-muted-foreground")}>
      {children}
    </span>
  )
}

function DrillCard({ d, mode, num, examDone }: { d: Drill; mode: Mode; num?: number; examDone?: boolean }) {
  const { go } = useNav()
  const key = keyOf(d, mode)
  const rec = useStore((s) => s.drills[key]) ?? EMPTY_DRILL
  const [hint, setHint] = useState(false)
  const I = info(d)
  const done = mode === "exam" ? !!examDone : !!rec.done
  const save = (r: DrillRec) => actions.setDrill(key, { ...r, at: Date.now() })
  const graded = d.parts.map((p, i) => grade(p, rec.choice[i])).filter(Boolean)
  const allRight = graded.every((g) => g === "ok" || g === "alt")
  const conflict = mode === "exam" && !done ? null : conflictOf(d, rec)
  const hints = [...new Set(d.parts.map((p) => p.axis).filter(Boolean))].map((a) => C.axes[a!]?.hint).filter(Boolean)
  const p0 = d.parts[0]
  const o = d.parts.length === 1 && p0?.axis ? axisOption(p0.axis, p0.ans) : null

  return (
    <Card id={`drill-${d.id}`} className="scroll-mt-4">
      <CardContent className="grid gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-examen inline-flex items-center gap-1.5 text-[10.5px] font-semibold tracking-[.1em] uppercase"><PencilLine className="size-3.5" aria-hidden />{num ? `Questão ${num} · ` : ""}{label(d)}</span>
          {done ? (graded.length ? <Status tone={allRight ? "ok" : "bad"}>{allRight ? words.rightChoices : "rever"}</Status> : <Status tone="ok">corrigido</Status>)
            : Object.keys(rec.choice).length || Object.keys(rec.text).length ? <Status>rascunho</Status> : null}
        </div>
        {I.title && <H as="p" html={I.title} className="-mb-1 text-[15px] font-semibold" />}
        <H as="div" html={I.stem} className="text-soft-foreground font-(family-name:--read-font) text-(length:--read-size) leading-[1.6] font-normal [&_b]:font-semibold [&_b]:text-foreground" />
        {d.proposal && (
          <div className="border-alerta-line bg-alerta-bg rounded-lg border border-l-4 border-l-alerta p-3 italic"><Tag className="not-italic">Proposta apresentada</Tag>"<H html={d.proposal} />"</div>
        )}
        {I.ask && <H as="p" html={I.ask} className="text-foreground mt-1 text-[13.5px] font-semibold" />}
        {d.parts.map((p, i) => <PartView key={i} d={d} p={p} i={i} rec={rec} done={done} onChange={save} />)}
        {conflict && <Result tone="bad" icon={<TriangleAlert />}><H html={conflict} /></Result>}
        {done && d.note && <H as="div" html={d.note} className="bg-muted/50 text-muted-foreground rounded-r-lg border-l-2 px-3 py-2 text-sm" />}
        {mode !== "exam" && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {done ? (
              <Button variant="outline" size="sm" onClick={() => actions.setDrill(key, null)}><RotateCcw />Refazer</Button>
            ) : (
              <>
                {hints.length > 0 && <Button variant="outline" size="sm" onClick={() => setHint((h) => !h)}><Signpost />Dica</Button>}
                <Button size="sm" onClick={() => save({ ...rec, done: true })}><Check />Corrigir</Button>
              </>
            )}
            {done && (o?.sec || I.sec) && (
              <Button variant="link" size="sm" className="ml-auto" onClick={() => go({ view: "manual", section: o?.sec ?? I.sec })}>{o?.sec ? `Reler: ${o.l}` : "Ler o trecho relacionado"} →</Button>
            )}
          </div>
        )}
        {hint && !done && (
          <div className="border-lab-line bg-lab-bg grid gap-1.5 rounded-lg border p-3 text-sm [&_p]:m-0"><Tag className="text-lab">Dica</Tag>{hints.map((h, k) => <H key={k} as="div" html={h} />)}</div>
        )}
      </CardContent>
    </Card>
  )
}

/* ---------------- estatísticas ---------------- */

function useStats(filter?: (d: Drill) => boolean) {
  const recs = useStore((s) => s.drills)
  return useMemo(() => {
    const s = { items: 0, done: 0, parts: 0, right: 0, texts: 0, full: 0, conf: {} as Record<string, number> }
    for (const d of drills) {
      if (filter && !filter(d)) continue
      s.items++
      const r = recs[d.id]
      if (!r?.done) continue
      s.done++
      d.parts.forEach((p, i) => {
        const g = grade(p, r.choice[i])
        if (g) {
          s.parts++
          if (g === "ok" || g === "alt") s.right++
          else if (r.choice[i] && C.axes[p.axis!]?.tone !== "select") { const k = `${p.axis}:${r.choice[i]}>${p.ans}`; s.conf[k] = (s.conf[k] ?? 0) + 1 }
        }
        if (p.text !== false) { s.texts++; if (Object.values(r.self?.[i] ?? {}).filter(Boolean).length >= 3) s.full++ }
      })
    }
    return s
  }, [recs, filter])
}

const Stat = ({ v, l }: { v: string; l: string }) => (
  <Card size="sm"><CardContent><div className="font-mono text-xl font-semibold">{v}</div><div className="text-muted-foreground mt-1 text-xs">{l}</div></CardContent></Card>
)

function PracticeStats({ tab }: { tab: string }) {
  const { go } = useNav()
  const filter = useMemo(() => (d: Drill) => tabOf(d) === tab, [tab])
  const s = useStats(filter)
  const all = useStats()
  const I = C.drillInterpret
  const iFilter = useMemo(() => (d: Drill) => d.set === I?.set, [I])
  const si = useStats(iFilter)
  const conf = Object.keys(all.conf).sort((a, b) => all.conf[b] - all.conf[a]).slice(0, 4)
  const iTab = I ? drills.find((d) => d.set === I.set) : undefined
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat v={`${s.done} / ${s.items}`} l="exercícios corrigidos" />
        <Stat v={s.parts ? `${s.right} / ${s.parts}` : "—"} l={words.rightChoices} />
        <Stat v={s.texts ? `${Math.round((s.full / s.texts) * 100)}%` : "—"} l="respostas com todos os itens da autoavaliação" />
      </div>
      {I && iTab && tabOf(iTab) === tab && si.items > 0 && si.done === si.items && (
        <div className="border-examen-line bg-examen-bg rounded-xl border border-l-4 border-l-examen p-4 text-sm">
          <Tag className="text-examen">{I.title ?? "Seu resultado"}</Tag><b>{si.right} de {si.parts}.</b> <H html={I.fn(si.right, si.parts)} />
        </div>
      )}
      {conf.length > 0 && (
        <Card size="sm"><CardContent className="grid gap-1.5">
          <Tag>Suas confusões mais frequentes no treino</Tag>
          {conf.map((k) => {
            const axis = k.split(":")[0]
            const [a, b] = k.split(":")[1].split(">")
            const opt = axisOption(axis, b)
            return (
              <div key={k} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="flex flex-wrap items-center gap-1.5">Marcou <Cat axis={axis} v={a} /> quando era <Cat axis={axis} v={b} /> <span className="text-muted-foreground font-mono text-xs">{all.conf[k]}×</span></span>
                {opt?.sec && <Button variant="link" size="sm" className="h-auto px-0" onClick={() => go({ view: "manual", section: opt.sec })}>Reler →</Button>}
              </div>
            )
          })}
        </CardContent></Card>
      )}
    </div>
  )
}

/* ---------------- prova aleatória ---------------- */

function newExam() {
  const X = C.drillExam!
  const comps = Array.isArray(X.pick[0]) ? (X.pick as DrillPickRule[][]) : [X.pick as DrillPickRule[]]
  const rules = comps[Math.floor(Math.random() * comps.length)]
  const ids: string[] = []
  for (const r of rules) {
    const pool = drills.filter((d) => (!r.set || d.set === r.set) && (!r.slot || d.slot === r.slot) && !ids.includes(d.id))
    ids.push(...shuffle(pool).slice(0, r.n ?? 1).map((d) => d.id))
  }
  actions.clearExamDrills()
  actions.setExam({ ids: shuffle(ids), started: Date.now(), submitted: 0 })
}

function clockText(started: number, submitted: number, minutes: number) {
  const secs = Math.floor(((submitted || Date.now()) - started) / 1000)
  if (submitted) return `${Math.max(1, Math.round(secs / 60))} min`
  const left = minutes * 60 - secs
  if (left <= 0) return "Tempo esgotado"
  const h = Math.floor(left / 3600), m = Math.floor((left % 3600) / 60), s = left % 60
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

export function useClock(started: number, submitted: number, minutes: number) {
  const [, tick] = useState(0)
  useEffect(() => {
    if (!started || submitted) return
    const t = window.setInterval(() => tick((x) => x + 1), 1000)
    return () => window.clearInterval(t)
  }, [started, submitted])
  return clockText(started, submitted, minutes)
}

function ExamView() {
  const exam = useStore((s) => s.exam)
  const recs = useStore((s) => s.drills)
  const confirm = useConfirm()
  const X = C.drillExam!
  const clock = useClock(exam?.started ?? 0, exam?.submitted ?? 0, X.minutes)
  if (!exam) {
    return (
      <Card><CardContent className="grid gap-3">
        <h3 className="flex items-center gap-2 text-lg font-semibold"><Timer className="size-5" />{X.title ?? "Prova aleatória"}</h3>
        <H as="p" html={X.intro ?? "Questões sorteadas do treino, com relógio."} className="text-muted-foreground text-sm" />
        <p className="text-muted-foreground text-sm">Sem dicas e sem consulta. A correção aparece só quando você entregar.</p>
        <Button className="justify-self-start" onClick={newExam}><Play />Começar a prova</Button>
      </CardContent></Card>
    )
  }
  const list = exam.ids.map((id) => drillById.get(id)).filter((d): d is Drill => !!d)
  let parts = 0, answered = 0, right = 0
  for (const d of list) d.parts.forEach((p, i) => { const g = grade(p, recs["e:" + d.id]?.choice[i]); if (!g) return; parts++; if (g !== "vazio") answered++; if (g === "ok" || g === "alt") right++ })
  const submit = async () => {
    if (await confirm({ title: "Entregar a prova?", description: answered < parts ? `Há ${parts - answered} escolha(s) sem marcar.` : "A correção aparece em seguida.", action: "Entregar" })) {
      actions.setExam({ ...getState().exam!, submitted: Date.now() }); scrollMainTo(null)
    }
  }
  const again = async () => {
    if (exam.submitted || (await confirm({ title: "Descartar a prova em andamento?", action: "Começar outra", destructive: true }))) { newExam(); scrollMainTo(null) }
  }
  return (
    <div className="grid gap-4">
      {!exam.submitted ? (
        <div className="bg-card/95 sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-xl border p-3 shadow-sm backdrop-blur">
          <span className={cn("flex items-center gap-1.5 font-mono text-lg", clock === "Tempo esgotado" && "text-destructive")}><Timer className="size-4" />{clock}</span>
          <span className="text-muted-foreground flex-1 text-xs">{answered} de {parts} escolhas marcadas · sem consulta</span>
          <Button size="sm" onClick={submit}><Flag />Entregar</Button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3"><Stat v={`${right} / ${parts}`} l={words.rightChoices} /><Stat v={clock} l={`tempo usado de ${X.minutes} min`} /><Stat v={String(list.length)} l="questões" /></div>
          <p className="text-muted-foreground text-sm">A nota real depende de quem corrige. Aqui a escolha é conferida automaticamente e a resposta escrita pela sua autoavaliação, comparando com o modelo.</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={again}><RotateCcw />Nova prova</Button>
            <Button size="sm" variant="outline" onClick={() => { actions.clearExamDrills(); actions.setExam(null) }}><Trash2 />Descartar esta prova</Button>
          </div>
        </>
      )}
      {list.map((d, i) => <DrillCard key={d.id} d={d} mode="exam" num={i + 1} examDone={!!exam.submitted} />)}
    </div>
  )
}

/* ---------------- a aba ---------------- */

export function Treino() {
  const { nav } = useNav()
  const tabs = useMemo(() => {
    const t: [string, string, number | null][] = []
    const nMat = drills.filter((d) => tabOf(d) === "material").length
    const nExt = drills.filter((d) => tabOf(d) === "extras").length
    if (nMat) t.push(["material", "Do material", nMat])
    if (nExt) t.push(["extras", "Extras", nExt])
    if (C.drillExam) t.push(["prova", "Prova aleatória", null])
    return t
  }, [])
  const [tab, setTab] = useState(tabs[0]?.[0] ?? "material")
  const [filter, setFilter] = useState("todos")
  const recs = useStore((s) => s.drills)

  // foco vindo da busca, de um caso do manual ou do roteiro: a aba se ajusta já na renderização…
  const [seen, setSeen] = useState(nav.nonce)
  if (seen !== nav.nonce) {
    setSeen(nav.nonce)
    const d = nav.focus ? drillById.get(nav.focus) : undefined
    if (d) { setTab(tabOf(d)); setFilter("todos") }
  }
  // …e a rolagem, que mexe no DOM, fica no efeito
  useEffect(() => {
    const d = nav.focus ? drillById.get(nav.focus) : undefined
    requestAnimationFrame(() => requestAnimationFrame(() => scrollMainTo(d ? document.getElementById(`drill-${d.id}`) : null)))
  }, [nav.nonce, nav.focus])

  const slots = [...new Set(drills.filter((d) => tabOf(d) === tab && d.slot).map((d) => d.slot!))]
  const ok = (d: Drill) => {
    const r = recs[d.id]
    if (filter === "afazer") return !r?.done
    if (filter === "errados") return !!r?.done && d.parts.some((p, i) => { const g = grade(p, r.choice[i]); return g === "bad" || g === "vazio" })
    if (filter.startsWith("slot:")) return d.slot === filter.slice(5)
    return true
  }
  const sets = drillSets.filter((s) => (s.origin === "app" ? "extras" : "material") === tab)

  return (
    <div className="mx-auto grid max-w-3xl gap-4 px-5 py-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Treino com resposta escrita</h2>
        <span className="text-muted-foreground text-sm">{drills.length} exercícios</span>
      </div>
      <p className="text-muted-foreground -mt-2 text-sm">
        Escolha, <b className="text-foreground">escreva</b> a resposta e só então corrija: você vê o gabarito, uma resposta-modelo e marca o que a sua tinha.
        {tab === "extras" && " Os extras foram elaborados pelo app com os critérios do material; não fazem parte dele."}
      </p>
      {tabs.length > 1 && (
        <Tabs value={tab} onValueChange={(v) => { setTab(String(v)); setFilter("todos") }}>
          <TabsList className="w-full">
            {tabs.map(([v, l, n]) => <TabsTrigger key={v} value={v}>{l}{n !== null && <span className="text-muted-foreground font-mono text-xs">{n}</span>}</TabsTrigger>)}
          </TabsList>
        </Tabs>
      )}
      {tab === "prova" ? <ExamView /> : (
        <>
          <PracticeStats tab={tab} />
          <ToggleGroup variant="outline" size="sm" spacing={2} className="flex-wrap" value={[filter]} onValueChange={(v) => v[0] && setFilter(v[0])} aria-label="Filtro">
            <ToggleGroupItem value="todos" className={chip}>Todos</ToggleGroupItem>
            <ToggleGroupItem value="afazer" className={chip}>A fazer</ToggleGroupItem>
            <ToggleGroupItem value="errados" className={chip}>Para rever</ToggleGroupItem>
            {slots.map((s) => <ToggleGroupItem key={s} value={`slot:${s}`} className={chip}>{C.slotLabels?.[s] ?? C.axes[s]?.label ?? s}</ToggleGroupItem>)}
          </ToggleGroup>
          {sets.map((set) => {
            const items = drills.filter((d) => d.set === set.id && ok(d))
            return (
              <div key={set.id} className="grid gap-3">
                {(sets.length > 1 || set.desc) && <div className="mt-2"><h3 className="font-semibold">{set.name}</h3>{set.desc && <H as="p" html={set.desc} className="text-muted-foreground text-sm" />}</div>}
                {items.length ? items.map((d) => <DrillCard key={d.id} d={d} mode="" />) : <p className="text-muted-foreground text-sm">Nada com esse filtro.</p>}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
