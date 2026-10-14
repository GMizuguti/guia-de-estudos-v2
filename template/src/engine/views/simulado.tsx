/* Simulado do professor: fazer com relógio, entregar, ler o gabarito e se autoavaliar */
import { useEffect } from "react"
import { CircleCheck, CircleX, Eye, Flag, ListChecks, RotateCcw, Scale, Search, Timer, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { Blocks, BlockView } from "../blocks"
import { C, countWords, decimal, findSection, optionName } from "../core"
import { useConfirm } from "../confirm"
import { H } from "../html"
import { optionPill } from "../styles"
import { scrollMainTo, useNav } from "../nav"
import { actions, getState, useStore, type SimState } from "../store"
import type { SimField, SimQuestion, Simulado as Sim } from "../types"
import { useClock } from "./treino"

const fresh = (nome = ""): SimState => ({ started: 0, submitted: 0, peek: false, nome, ans: {}, score: {} })

function grade(f: SimField, v?: string) {
  if (!v) return "vazio"
  if (v === f.ans) return "ok"
  if (f.alt?.includes(v)) return "alt"
  return "bad"
}

function totals(S: Sim, s: SimState) {
  let sum = 0, rated = 0, names = 0, namesOk = 0
  for (const q of S.questions) {
    const sc = s.score[q.n]
    if (sc) { sum += parseFloat(sc); rated++ }
    for (const f of q.fields) {
      if (!f.pick) continue
      names++
      const g = grade(f, s.ans[q.n]?.choice[f.k])
      if (g === "ok" || g === "alt") namesOk++
    }
  }
  return { sum: Math.round(sum * 100) / 100, rated, names, namesOk }
}

/** Casas decimais da nota: 2 quando o passo do critério é menor que 0,1 (ex.: 0,05). */
const places = (S: Sim) => ((S.scoring?.step ?? 0.1) < 0.1 ? 2 : 1)

function leituraIdx(S: Sim, sum: number) {
  const L = S.scoring?.leitura
  if (!L) return -1
  const i = L.min.findIndex((m) => sum >= m)
  return i === -1 ? L.min.length - 1 : i
}

function DataTable({ cols, rows, hi = -1 }: { cols: string[]; rows: string[][]; hi?: number }) {
  return (
    <div className="my-3 overflow-x-auto rounded-xl border">
      <Table>
        <TableHeader><TableRow>{cols.map((c, i) => <TableHead key={i} className="bg-muted/40"><H html={c} /></TableHead>)}</TableRow></TableHeader>
        <TableBody>{rows.map((r, i) => <TableRow key={i} className={cn(i === hi && "bg-primary/10 font-semibold")}>{r.map((c, j) => <TableCell key={j} className="whitespace-normal"><H html={c} /></TableCell>)}</TableRow>)}</TableBody>
      </Table>
    </div>
  )
}

function FieldView({ q, f, s, locked }: { q: SimQuestion; f: SimField; s: SimState; locked: boolean }) {
  const ax = f.pick ? C.axes[f.pick] : undefined
  const a = s.ans[q.n] ?? { choice: {}, text: {} }
  const chosen = a.choice[f.k] ?? ""
  const text = a.text[f.k] ?? ""
  const setAns = (patch: Partial<typeof a>) => {
    const cur = getState().sim!
    actions.setSim({ ...cur, ans: { ...cur.ans, [q.n]: { ...(cur.ans[q.n] ?? { choice: {}, text: {} }), ...patch } } })
  }
  const g = grade(f, chosen)
  return (
    <div className="grid gap-2 border-t pt-3">
      <H as="div" html={f.label} className="text-sm font-semibold" />
      {ax && (
        <ToggleGroup variant="outline" spacing={1.5} className="flex-wrap" value={chosen ? [chosen] : []} disabled={locked}
          onValueChange={(v) => setAns({ choice: { ...a.choice, [f.k]: v[0] ?? "" } })} aria-label={ax.label}>
          {ax.options.map((o) => (
            <ToggleGroupItem key={o.v} value={o.v} className={optionPill(ax.tone)}>{o.l}</ToggleGroupItem>
          ))}
        </ToggleGroup>
      )}
      {f.text && (
        <>
          <Textarea value={text} readOnly={locked} rows={3} className="font-(family-name:--read-font) text-[15px]"
            placeholder={f.placeholder ?? (ax ? "Justifique: evidência do enunciado, ligação e descarte da alternativa próxima…" : "Escreva a sua resposta…")}
            onChange={(e) => setAns({ text: { ...a.text, [f.k]: e.target.value } })} />
          <div className="text-muted-foreground text-right font-mono text-[11px]">{countWords(text)} palavra{countWords(text) === 1 ? "" : "s"}</div>
        </>
      )}
      {locked && ax && (
        <div className={cn("flex items-start gap-2 rounded-lg border px-3 py-2 text-sm [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
          g === "ok" ? "border-lab-line bg-lab-bg [&>svg]:text-lab" : g === "alt" ? "border-examen-line bg-examen-bg [&>svg]:text-examen" : "border-alerta-line bg-alerta-bg [&>svg]:text-alerta")}>
          {g === "ok" ? <><CircleCheck /><span>Correto: <b>{optionName(f.pick, f.ans)}</b></span></>
            : g === "alt" ? <><Scale /><span>Também aceita se bem argumentada. Resposta esperada: <b>{optionName(f.pick, f.ans)}</b>.</span></>
            : <><CircleX /><span>{chosen ? <>Você marcou <b>{optionName(f.pick, chosen)}</b>. </> : "Sem resposta. "}Resposta esperada: <b>{optionName(f.pick, f.ans)}</b>.</span></>}
        </div>
      )}
    </div>
  )
}

function QuestionCard({ S, q, s, review }: { S: Sim; q: SimQuestion; s: SimState; review: boolean }) {
  const { go } = useNav()
  const sec = findSection(q.sec)
  const max = q.max ?? 1
  const step = S.scoring?.step ?? 0.1
  const scores: Record<string, string> = {}
  for (let x = Math.round(max / step); x >= 0; x--) { const v = (x * step).toFixed(places(S)); scores[v] = decimal(v) }
  return (
    <Card id={`simq-${q.n}`} className="scroll-mt-20">
      <CardContent className="grid gap-3">
        <div className="flex items-center justify-between">
          <span className="text-examen text-[11px] font-semibold tracking-wider uppercase">Questão {q.label ?? q.n}{q.pts && ` (${q.pts})`}</span>
          {review && s.score[q.n] && <span className="bg-muted rounded-full px-2 py-0.5 font-mono text-xs">{decimal(s.score[q.n])}</span>}
        </div>
        <div className="grid gap-2 font-(family-name:--read-font) text-(length:--read-size) leading-[1.6]">{q.stem.map((p, i) => <H key={i} as="p" html={p} />)}</div>
        {q.blocks && <div className="prose-manual [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"><Blocks blocks={q.blocks} /></div>}
        {q.quote && <H as="blockquote" html={q.quote} className="border-clave-line bg-clave-bg rounded-r-lg border-l-4 border-l-clave px-4 py-2.5 font-(family-name:--read-font) italic" />}
        {q.after && <H as="p" html={q.after} className="font-(family-name:--read-font)" />}
        {q.prompt && <H as="p" html={q.prompt} className="text-sm font-semibold" />}
        {q.fields.map((f) => <FieldView key={f.k} q={q} f={f} s={s} locked={review} />)}
        {review && (
          <>
            <div className="border-clave-line bg-clave-bg rounded-lg border border-l-4 border-l-clave p-3 text-sm">
              {q.gab.head && <H as="div" html={q.gab.head} className="text-clave mb-1.5 text-[11px] font-semibold tracking-wider uppercase" />}
              {q.gab.answer && <H as="p" html={q.gab.answer} className="mb-1.5 font-semibold" />}
              {q.gab.lead && <H as="p" html={q.gab.lead} className="mb-1.5" />}
              {q.gab.blocks && <div className="[&>*:first-child]:mt-0"><Blocks blocks={q.gab.blocks} /></div>}
              {q.gab.items && <ul className="grid list-disc gap-1 pl-5">{q.gab.items.map((i, k) => <H key={k} as="li" html={i} />)}</ul>}
              {q.appNote && <H as="div" html={q.appNote} className="bg-background/60 text-muted-foreground mt-2.5 rounded-md border-l-2 px-3 py-2" />}
              {sec && <Button variant="link" size="sm" className="h-auto px-0 pt-1.5" onClick={() => go({ view: "manual", section: sec.section.id })}>Abrir {sec.section.num} {sec.section.title.replace(/<[^>]+>/g, "")} →</Button>}
            </div>
            <div className="grid items-start gap-3 rounded-lg border border-dashed p-3 sm:grid-cols-[auto_1fr]">
              <div className="grid gap-1">
                <span className="text-muted-foreground text-[10.5px] font-semibold tracking-wider uppercase">Sua nota nesta questão</span>
                <Select items={scores} value={s.score[q.n] ?? null} onValueChange={(v) => {
                  const cur = getState().sim!
                  const score = { ...cur.score }
                  if (v) score[q.n] = v; else delete score[q.n]
                  actions.setSim({ ...cur, score })
                }}>
                  <SelectTrigger className="w-28"><SelectValue placeholder="Avaliar…" /></SelectTrigger>
                  <SelectContent>{Object.entries(scores).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <p className="text-muted-foreground text-xs leading-relaxed"><H html={S.scoring?.hint ?? "Use o critério de autoavaliação do simulado."} /> Seja rigoroso: conta só o que está escrito.</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export function Simulado() {
  const S = C.simulado!
  const { nav } = useNav()
  const s = useStore((st) => st.sim)
  const confirm = useConfirm()
  const phase = !s || (!s.started && !s.peek) ? "intro" : s.submitted || s.peek ? "review" : "doing"
  const clock = useClock(s?.started ?? 0, s?.submitted ?? 0, S.minutes)
  const t = s ? totals(S, s) : null

  useEffect(() => {
    requestAnimationFrame(() => scrollMainTo(nav.simFocus ? document.getElementById(`simq-${nav.simFocus}`) : null, 80))
  }, [nav.nonce, nav.simFocus])

  const start = () => { actions.setSim({ ...fresh(s?.nome), started: Date.now() }); scrollMainTo(null) }
  const peek = async () => {
    if (await confirm({ title: "Ver o gabarito sem fazer?", description: S.peekConfirm ?? "Ver o gabarito sem fazer o simulado?", action: "Ver o gabarito" })) actions.setSim({ ...fresh(s?.nome), peek: true })
  }
  const submit = async () => {
    if (await confirm({ title: "Entregar o simulado?", description: "O gabarito comentado aparece embaixo de cada questão.", action: "Entregar" })) { actions.setSim({ ...getState().sim!, submitted: Date.now() }); scrollMainTo(null) }
  }
  const reset = async () => {
    if (!s?.submitted || (await confirm({ title: "Refazer o simulado?", description: "Apaga as respostas e as notas deste simulado.", action: "Refazer", destructive: true }))) { actions.setSim(fresh(s?.nome)); scrollMainTo(null) }
  }
  const formValue = (auto?: string) => {
    if (auto === "nome") return <Input value={s?.nome ?? ""} placeholder="Seu nome" aria-label="Nome" className="h-8" onChange={(e) => actions.setSim({ ...(getState().sim ?? fresh()), nome: e.target.value })} />
    if (auto === "data") return s?.submitted ? new Date(s.submitted).toLocaleDateString("pt-BR") : "—"
    if (auto === "tempo") return s?.submitted ? clock : "—"
    if (auto === "nota") return phase === "review" && t?.rated ? `${decimal(t.sum.toFixed(places(S)))} de ${decimal(S.scoring?.max ?? S.questions.length)}${t.rated < S.questions.length ? ` (${t.rated} de ${S.questions.length} questões avaliadas)` : ""}` : "—"
    return ""
  }
  const byN = new Map(S.questions.map((q) => [q.n, q]))
  const parts = S.parts ?? [{ questions: S.questions.map((q) => q.n) }]
  let marked = 0, need = 0
  if (s) for (const q of S.questions) for (const f of q.fields) { need++; const a = s.ans[q.n]; if ((f.pick && a?.choice[f.k]) || (!f.pick && countWords(a?.text[f.k]))) marked++ }

  return (
    <div className="mx-auto grid max-w-3xl gap-4 px-5 py-8">
      <header className="text-center">
        {S.header && <div className="text-muted-foreground text-xs leading-relaxed">{S.header.map((h, i) => <H key={i} as="div" html={h} />)}</div>}
        {S.kicker && <H as="div" html={S.kicker} className="mt-3 text-xs font-semibold tracking-widest" />}
        <H as="h1" html={S.title} className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl" />
        {S.subtitle && <H as="p" html={S.subtitle} className="text-muted-foreground mt-1 font-serif italic" />}
        {S.course && <H as="p" html={S.course} className="mt-3 text-sm font-semibold" />}
        {S.note && <H as="p" html={S.note} className="text-muted-foreground text-xs" />}
      </header>
      <div className="prose-manual">
        {S.intro?.map((p, i) => <H key={i} as="p" html={p} />)}
        {S.warning && <H as="p" html={S.warning} className="text-destructive [&_b]:text-destructive" />}
      </div>
      {S.formFields && (
        <div className="overflow-x-auto rounded-xl border">
          <Table>
            <TableHeader><TableRow><TableHead>{S.formCols?.[0] ?? "Campo"}</TableHead><TableHead>{S.formCols?.[1] ?? "Preenchimento"}</TableHead></TableRow></TableHeader>
            <TableBody>{S.formFields.map((f, i) => <TableRow key={i}><TableCell className="w-2/5"><H html={f.label} /></TableCell><TableCell>{formValue(f.auto)}</TableCell></TableRow>)}</TableBody>
          </Table>
        </div>
      )}

      {phase === "intro" && (
        <div className="flex flex-wrap items-center gap-2">
          <Button size="lg" onClick={start}><Timer />Começar o simulado · {S.minutes} minutos</Button>
          <Button size="lg" variant="outline" onClick={peek}><Eye />Ver o gabarito sem fazer</Button>
          <p className="text-muted-foreground w-full text-sm">As questões aparecem quando você começa. As respostas ficam salvas neste computador; o relógio conta o tempo mas não trava a prova. Ao entregar, o gabarito comentado aparece embaixo de cada questão.</p>
        </div>
      )}

      {phase === "doing" && (
        <div className="bg-card/95 sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-xl border p-3 shadow-sm backdrop-blur">
          <span className={cn("flex items-center gap-1.5 font-mono text-lg", clock === "Tempo esgotado" && "text-destructive")}><Timer className="size-4" />{clock}</span>
          <span className="text-muted-foreground flex-1 text-xs">{marked} de {need} campos respondidos · sem consulta</span>
          <Button size="sm" onClick={submit}><Flag />Entregar</Button>
        </div>
      )}

      {phase === "review" && s && t && (
        <>
          <h2 className="mt-2 text-xl font-semibold tracking-tight"><H html={S.gabaritoTitle ?? "Gabarito comentado"} /></h2>
          {S.gabaritoWarn && <H as="p" html={S.gabaritoWarn} className="text-destructive -mt-2 font-semibold" />}
          {S.gabaritoIntro && <H as="p" html={S.gabaritoIntro} className="text-muted-foreground -mt-2 text-sm" />}
          <div className="grid gap-3 sm:grid-cols-3">
            <Card size="sm"><CardContent><div className="font-mono text-xl font-semibold">{t.rated ? decimal(t.sum.toFixed(places(S))) : "—"}</div><div className="text-muted-foreground mt-1 text-xs">sua nota de {decimal(S.scoring?.max ?? S.questions.length)} · {t.rated} de {S.questions.length} avaliadas</div></CardContent></Card>
            <Card size="sm"><CardContent><div className="font-mono text-xl font-semibold">{t.names ? `${t.namesOk} / ${t.names}` : "—"}</div><div className="text-muted-foreground mt-1 text-xs">escolhas certas (conferidas pelo app)</div></CardContent></Card>
            <Card size="sm"><CardContent><div className="font-mono text-xl font-semibold">{s.submitted ? clock : "—"}</div><div className="text-muted-foreground mt-1 text-xs">tempo usado de {S.minutes} min</div></CardContent></Card>
          </div>
          {(() => {
            const L = S.scoring?.leitura
            const i = leituraIdx(S, t.sum)
            if (L && t.rated === S.questions.length && i >= 0) {
              const row = L.rows[i]
              return <div className="border-examen-line bg-examen-bg rounded-xl border border-l-4 border-l-examen p-4 text-sm"><div className="text-examen mb-1 text-[11px] font-semibold tracking-wider uppercase"><H html={row.slice(0, -1).join(" · ")} /></div><H html={row[row.length - 1] + "."} /></div>
            }
            return <p className="text-muted-foreground text-sm">Leia o gabarito embaixo de cada questão e dê a sua nota com o critério do simulado.{L && " Com todas avaliadas, a leitura da nota aparece aqui."}</p>
          })()}
          {s.peek && !s.submitted && <p className="text-sm font-semibold">Você abriu o gabarito sem fazer o simulado.</p>}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={reset}><RotateCcw />{s.submitted ? "Refazer o simulado" : "Fazer o simulado"}</Button>
            {S.scoring?.anchor && <Button variant="outline" size="sm" onClick={() => scrollMainTo(document.getElementById(S.scoring!.anchor!))}><ListChecks />Critério de autoavaliação</Button>}
          </div>
        </>
      )}

      {phase !== "intro" && s && (
        <>
          {parts.map((p, i) => (
            <div key={i} className="grid gap-3">
              {p.title && <div className="mt-3"><H as="h3" html={p.title} className="font-semibold" />{p.instr && <H as="p" html={p.instr} className="text-muted-foreground text-sm" />}</div>}
              {p.questions.map((n) => byN.get(n)).filter((q): q is SimQuestion => !!q).map((q) => <QuestionCard key={q.n} S={S} q={q} s={s} review={phase === "review"} />)}
            </div>
          ))}
          {S.endNote && <H as="p" html={S.endNote} className="text-muted-foreground my-2 text-center text-sm italic" />}
          {phase === "doing" && <Button size="lg" className="justify-self-center" onClick={submit}><Flag />Entregar e ver o gabarito</Button>}
          {phase === "review" && S.sections?.map((sec, i) => (
            <section key={i} id={sec.id} className="mt-6 scroll-mt-4 border-t pt-6">
              <H as="h3" html={sec.title} className="mb-3 text-lg font-semibold tracking-tight" />
              <div className="prose-manual">
                {sec.blocks.map((b, k) => {
                  if (b.t === "sim-leitura") {
                    const L = S.scoring?.leitura
                    return L ? <DataTable key={k} cols={L.cols} rows={L.rows} hi={t?.rated ? leituraIdx(S, t.sum) : -1} /> : null
                  }
                  if (b.t === "sim-folha") {
                    return (
                      <div key={k} className="my-3 grid gap-2 font-sans">
                        {(S.folha?.items ?? []).map((it, j) => {
                          const flag = it.detect?.(s.ans, { words: countWords }) ?? null
                          return (
                            <div key={j} className={cn("flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm", flag ? "border-alerta-line bg-alerta-bg" : "bg-card")}>
                              {flag ? <TriangleAlert className="text-alerta mt-0.5 size-4 shrink-0" /> : <Search className="text-muted-foreground mt-0.5 size-4 shrink-0" />}
                              <span><H html={it.t} />{flag && <small className="text-alerta mt-1 block font-medium">Detectado no seu simulado: {flag}</small>}</span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  }
                  return <BlockView key={k} b={b} />
                })}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  )
}
