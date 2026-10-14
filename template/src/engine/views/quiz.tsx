/* Questões de múltipla escolha, com alternativas embaralhadas a cada rodada */
import { useState } from "react"
import { ArrowRight, BookOpenText, CircleCheck, Info, Play, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { C, chapterById, chapterLabel, findSection, shuffle, words } from "../core"
import { H } from "../html"
import { useNav } from "../nav"
import { actions, useStore } from "../store"
import type { QuizItem } from "../types"

type Q = Omit<QuizItem, "opts" | "a"> & { opts: string[]; a: number }
const L = ["A", "B", "C", "D"]

export function Quiz() {
  const { go } = useNav()
  const stats = useStore((s) => s.quiz)
  const [scope, setScope] = useState("all")
  const [len, setLen] = useState(10)
  const [onlyMissed, setOnlyMissed] = useState(false)
  const [pool, setPool] = useState<Q[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [missed, setMissed] = useState<string[]>([])
  const [done, setDone] = useState(false)

  const scopes: Record<string, string> = { all: `Todo o ${words.doc} (${C.quiz.length} questões)` }
  for (const ch of C.chapters) {
    const n = C.quiz.filter((q) => q.ch === ch.id).length
    if (n) scopes[ch.id] = `${chapterLabel(ch, true)} · ${ch.title.replace(/<[^>]+>/g, "")} (${n})`
  }
  const missedCount = Object.keys(stats.missed).length

  const start = () => {
    const base = C.quiz.filter((q) => (!onlyMissed || stats.missed[q.id]) && (scope === "all" || q.ch === scope))
    const picked = shuffle(base).slice(0, len).map((q) => {
      const order = shuffle([0, 1, 2, 3])
      return { ...q, opts: order.map((o) => q.opts[o]), a: order.indexOf(q.a) }
    })
    setPool(picked); setIdx(0); setPicked(null); setScore(0); setMissed([]); setDone(false)
  }
  const answer = (i: number) => {
    if (picked !== null || !pool) return
    setPicked(i)
    if (i === pool[idx].a) setScore((s) => s + 1); else setMissed((m) => [...m, pool[idx].id])
  }
  const next = () => {
    if (!pool) return
    if (idx + 1 >= pool.length) { actions.recordQuiz(score, pool.length, missed); setDone(true) }
    else { setIdx(idx + 1); setPicked(null) }
  }

  if (!pool) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-8">
        <Card><CardContent className="grid gap-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Questões de múltipla escolha</h2>
            <p className="text-muted-foreground mt-1 text-sm">Montadas só com o conteúdo do {words.doc}, com explicação e link para o trecho de origem. Aqui você treina o reconhecimento; a resposta escrita se treina no Treino.</p>
          </div>
          <div className="grid gap-2">
            <Label>Conteúdo</Label>
            <Select items={scopes} value={scope} onValueChange={(v) => v && setScope(v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(scopes).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-3">
            <Label>Número de questões: {len}</Label>
            <Slider min={5} max={50} step={5} value={[len]} onValueChange={(v) => setLen(Array.isArray(v) ? v[0] : (v as number))} />
          </div>
          {missedCount > 0 && (
            <Label className="flex items-center gap-2 font-normal"><Checkbox checked={onlyMissed} onCheckedChange={(v) => setOnlyMissed(!!v)} />Só as {missedCount} que errei antes</Label>
          )}
          <Button size="lg" onClick={start}><Play />Começar</Button>
          {stats.runs > 0 && <p className="text-muted-foreground text-center text-xs">Melhor resultado: <b className="text-foreground">{stats.best}%</b> em {stats.runs} tentativas</p>}
        </CardContent></Card>
      </div>
    )
  }

  if (done) {
    const pct = Math.round((score / pool.length) * 100)
    const msg = pct >= 90 ? "Você domina o conteúdo. Revise só os erros." : pct >= 70 ? "Bom nível. Volte aos trechos em que errou." : pct >= 50 ? "No caminho certo, mas vale reler as partes envolvidas." : "Hora de reler. Comece pelas partes das questões erradas."
    const wrong = missed.map((id) => C.quiz.find((q) => q.id === id)!).filter(Boolean)
    return (
      <div className="mx-auto max-w-2xl px-5 py-8">
        <Card><CardContent className="text-center">
          <div className="font-mono text-5xl font-semibold">{pct}%</div>
          <div className="text-muted-foreground mt-1 text-sm">{score} acertos de {pool.length}</div>
          <p className="mt-3">{msg}</p>
          <div className="mt-4 flex justify-center gap-2">
            <Button onClick={() => setPool(null)}><RotateCcw />Outra rodada</Button>
            <Button variant="outline" onClick={() => go({ view: "manual" })}><BookOpenText />Voltar ao {words.doc}</Button>
          </div>
          {wrong.length > 0 && (
            <div className="mt-6 grid gap-2 text-left">
              {wrong.map((q) => {
                const s = findSection(q.sec)
                return (
                  <div key={q.id} className="rounded-lg border p-3 text-sm">
                    <H as="div" html={q.q} className="font-medium" />
                    <H as="div" html={q.opts[q.a]} className="text-lab mt-1" />
                    <Button variant="link" size="sm" className="h-auto px-0" onClick={() => go({ view: "manual", chapter: q.ch, section: q.sec })}>{s ? `${s.section.num} ` : ""}{s ? s.section.title.replace(/<[^>]+>/g, "") : "Ler"} →</Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent></Card>
      </div>
    )
  }

  const q = pool[idx]
  const ch = chapterById(q.ch)
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <Card><CardContent className="grid gap-4">
        <div className="flex gap-2"><Badge variant="secondary">{chapterLabel(ch, true)}</Badge><Badge variant="outline">Questão {idx + 1} de {pool.length}</Badge></div>
        <H as="h2" html={q.q} className="text-lg leading-snug font-semibold" />
        <div className="grid gap-2">
          {q.opts.map((o, i) => (
            <button key={i} type="button" disabled={picked !== null} onClick={() => answer(i)}
              className={cn("flex items-start gap-3 rounded-lg border px-3.5 py-3 text-left text-sm transition-colors",
                picked === null && "hover:bg-muted",
                picked !== null && i === q.a && "border-lab-line bg-lab-bg",
                picked === i && i !== q.a && "border-alerta-line bg-alerta-bg")}>
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-md border font-mono text-xs",
                picked !== null && i === q.a && "bg-lab border-lab text-white", picked === i && i !== q.a && "bg-alerta border-alerta text-white")}>{L[i]}</span>
              <H html={o} />
            </button>
          ))}
        </div>
        {picked !== null && (
          <div className="border-clave-line bg-clave-bg rounded-lg border border-l-4 border-l-clave p-3 text-sm">
            <div className="text-clave mb-1 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">{picked === q.a ? <CircleCheck className="size-3.5" /> : <Info className="size-3.5" />}{picked === q.a ? "Correto" : `A resposta correta é a ${L[q.a]}`}</div>
            <H html={q.why} />
            <div><Button variant="link" size="sm" className="h-auto px-0" onClick={() => go({ view: "manual", chapter: q.ch, section: q.sec })}>Ler: {chapterLabel(ch)} →</Button></div>
          </div>
        )}
        <div className="flex items-center gap-3">
          <div className="flex-1"><Progress value={(idx / pool.length) * 100} /><div className="text-muted-foreground mt-1 font-mono text-xs">Acertos: {score} / {idx + (picked !== null ? 1 : 0)}</div></div>
          <Button disabled={picked === null} onClick={next}><ArrowRight />{idx + 1 >= pool.length ? "Ver resultado" : "Próxima"}</Button>
        </div>
      </CardContent></Card>
    </div>
  )
}
