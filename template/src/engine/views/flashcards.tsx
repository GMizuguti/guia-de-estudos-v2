/* Fichas de repetição espaçada */
import { useCallback, useEffect, useMemo, useState } from "react"
import { BookOpenText, HelpCircle, Lightbulb, PartyPopper, RefreshCw, Shuffle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { C, chapterById, chapterLabel, shuffle } from "../core"
import { H } from "../html"
import { useNav } from "../nav"
import { grade, intervalLabel } from "../srs"
import { actions, getState, useStore } from "../store"
import type { Card } from "../types"
import { dueCount } from "./home"

const GRADES = [
  { g: 0 as const, label: "De novo", cls: "text-alerta" },
  { g: 1 as const, label: "Difícil", cls: "text-examen" },
  { g: 2 as const, label: "Bom", cls: "text-clave" },
  { g: 3 as const, label: "Fácil", cls: "text-lab" },
]

function buildDeck(deck: string): Card[] {
  const now = Date.now()
  const srs = getState().srs
  return shuffle(C.cards.filter((c) => deck === "all" || (deck === "due" ? !srs[c.id] || srs[c.id].due <= now : c.ch === deck)))
}

export function Flashcards() {
  const { go } = useNav()
  const srs = useStore((s) => s.srs)
  const [deck, setDeck] = useState("due")
  const [queue, setQueue] = useState<Card[]>(() => buildDeck("due"))
  const [i, setI] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const card = queue[i]

  const decks = useMemo(() => {
    const items: Record<string, string> = { due: `Pendentes hoje (${dueCount(srs)})`, all: `Todas as fichas (${C.cards.length})` }
    for (const ch of C.chapters) {
      const n = C.cards.filter((c) => c.ch === ch.id).length
      if (n) items[ch.id] = `${chapterLabel(ch, true)} · ${ch.title.replace(/<[^>]+>/g, "")} (${n})`
    }
    return items
  }, [srs])

  const restart = useCallback((d: string) => { setDeck(d); setQueue(buildDeck(d)); setI(0); setFlipped(false) }, [])

  const rate = useCallback((g: 0 | 1 | 2 | 3) => {
    if (!card) return
    actions.setSrs(card.id, grade(getState().srs[card.id], g))
    setFlipped(false)
    if (i + 1 >= queue.length) { setQueue([]); setI(0); toast("Baralho concluído") } else setI(i + 1)
  }, [card, i, queue.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select, [role=combobox], [role=listbox]")) return
      if (!card) return
      if (e.key === " ") { e.preventDefault(); setFlipped((f) => !f) }
      else if (flipped && e.key >= "1" && e.key <= "4") rate((Number(e.key) - 1) as 0 | 1 | 2 | 3)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [card, flipped, rate])

  const ch = card ? chapterById(card.ch) : null
  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Select items={decks} value={deck} onValueChange={(v) => v && restart(v)}>
          <SelectTrigger className="min-w-0 flex-1" aria-label="Baralho"><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(decks).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline" onClick={() => restart(deck)}><Shuffle />Embaralhar</Button>
        <span className="text-muted-foreground ml-auto font-mono text-xs">{queue.length ? `${i + 1} / ${queue.length}` : "0 / 0"}</span>
      </div>

      {!card ? (
        <div className="bg-card rounded-xl border p-10 text-center">
          <PartyPopper className="text-muted-foreground mx-auto size-9" />
          <h3 className="mt-3 font-semibold">Nada pendente</h3>
          <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">Você revisou todas as fichas deste baralho. Escolha outro baralho ou volte mais tarde: as fichas reaparecem conforme o calendário de repetição espaçada.</p>
          <Button variant="outline" className="mt-4" onClick={() => restart("all")}><RefreshCw />Revisar todas mesmo assim</Button>
        </div>
      ) : (
        <>
          <div className="flip" data-flipped={flipped}>
            <div className="flip__inner">
              <button type="button" onClick={() => setFlipped(true)} className="flip__face bg-card flex flex-col rounded-2xl border p-6 text-left shadow-sm" aria-label="Virar ficha">
                <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase"><HelpCircle className="size-3.5" />Pergunta</span>
                <H as="div" html={card.front} className="my-auto py-6 text-xl leading-snug font-medium" />
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs"><BookOpenText className="size-3.5" />{ch && `${chapterLabel(ch)} · ${ch.title.replace(/<[^>]+>/g, "")}`}</span>
              </button>
              <div className="flip__face flip__face--back bg-card flex flex-col rounded-2xl border p-6 shadow-sm">
                <span className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase"><Lightbulb className="size-3.5" />Resposta</span>
                <H as="div" html={card.back} className="my-auto py-6 text-base leading-relaxed" />
                <Button variant="link" size="sm" className="self-start px-0" onClick={() => go({ view: "manual", chapter: card.ch, section: card.sec })}>Ver no material →</Button>
              </div>
            </div>
          </div>
          {flipped ? (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GRADES.map((x) => (
                <Button key={x.g} variant="outline" className="h-auto flex-col py-2.5" onClick={() => rate(x.g)}>
                  <span className={cn("font-semibold", x.cls)}>{x.label}</span>
                  <span className="text-muted-foreground font-mono text-[11px]">{intervalLabel(srs[card.id], x.g)}</span>
                </Button>
              ))}
            </div>
          ) : (
            <Button size="lg" className="mt-4 w-full" onClick={() => setFlipped(true)}><RefreshCw />Mostrar resposta</Button>
          )}
          <p className="text-muted-foreground mt-3 text-center text-xs">{flipped ? <><Kbd>1</Kbd> <Kbd>2</Kbd> <Kbd>3</Kbd> <Kbd>4</Kbd> para avaliar</> : <>Aperte <Kbd>espaço</Kbd> para virar a ficha</>}</p>
        </>
      )}
    </div>
  )
}
