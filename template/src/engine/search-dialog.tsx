/* Busca global (Ctrl K ou /) com o Command do shadcn; a pontuação é a do nosso índice */
import { useMemo, useState } from "react"
import { BookOpenText, ClipboardList, Columns3, Layers, ListChecks, PencilLine, Search, TextAlignStart } from "lucide-react"
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { M, words } from "./core"
import { useNav } from "./nav"
import { highlight, query, strip, type Entry } from "./search"

const ICON: Record<string, typeof Search> = {
  book: BookOpenText, text: TextAlignStart, cards: Layers, quiz: ListChecks, pencil: PencilLine, clipboard: ClipboardList, columns: Columns3,
}

// grupos na ordem em que aparecem: o texto do material primeiro
const GROUPS: [string, string[]][] = [
  [`No ${words.doc}`, ["book", "text"]],
  ["Treino", ["pencil"]],
  ["Simulado", ["clipboard"]],
  ["Fichas", ["cards"]],
  ["Questões", ["quiz"]],
  ["Comparador", ["columns"]],
]

export function SearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { go } = useNav()
  const [q, setQ] = useState("")
  const res = useMemo(() => query(q, 60), [q])
  const pick = (e: Entry) => {
    onOpenChange(false)
    const t = e.go
    if (t.view === "manual") go({ view: "manual", chapter: t.chapter, section: t.section })
    else if (t.view === "treino") go({ view: "treino", focus: t.focus })
    else if (t.view === "simulado") go({ view: "simulado", simFocus: t.focus })
    else go({ view: "comparador", profile: t.profile })
  }
  return (
    <CommandDialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setQ("") }} title="Buscar" description="Busca em todo o material" className="sm:max-w-2xl">
      <Command shouldFilter={false}>
        <CommandInput value={q} onValueChange={setQ} placeholder="Buscar no material, nas fichas, nas questões…" />
        <CommandList className="max-h-[60vh]">
          {!q.trim() ? (
            <CommandGroup heading="Sugestões">
              {(M.searchHints ?? []).map((s) => (
                <CommandItem key={s} value={"sug-" + s} onSelect={() => setQ(s)}><Search />{s}</CommandItem>
              ))}
            </CommandGroup>
          ) : (
            <>
              <CommandEmpty>Nenhum resultado para «{q}».</CommandEmpty>
              {GROUPS.map(([heading, icons]) => {
                const rows = res.filter((r) => icons.includes(r.item.icon))
                if (!rows.length) return null
                return (
                  <CommandGroup key={heading} heading={`${heading} · ${rows.length}`}>
                    {rows.map((r) => {
                      const Icon = ICON[r.item.icon] ?? Search
                      const key = "r" + res.indexOf(r)
                      return (
                        <CommandItem key={key} value={key} onSelect={() => pick(r.item)} className="items-start gap-3 py-2">
                          <Icon className="mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium" dangerouslySetInnerHTML={{ __html: highlight(strip(r.item.title), q) }} />
                            <div className="text-muted-foreground line-clamp-2 text-xs" dangerouslySetInnerHTML={{ __html: highlight(r.excerpt, q) }} />
                          </div>
                          <span className="text-muted-foreground shrink-0 text-[11px]">{r.item.kind}</span>
                        </CommandItem>
                      )
                    })}
                  </CommandGroup>
                )
              })}
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}
