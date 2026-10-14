/* Comparador: até quatro perfis lado a lado */
import { useState } from "react"
import { Check, Columns3, Plus } from "lucide-react"
import { toast } from "sonner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { C, chapterById, chapterLabel, words } from "../core"
import { H } from "../html"
import { useNav } from "../nav"
import { chip } from "../styles"

export function Compare() {
  const { nav } = useNav()
  const { fields, profiles } = C.compare
  const [sel, setSel] = useState<string[]>(() => [...new Set(profiles.map((p) => p.group))].length ? profiles.filter((p) => p.group === profiles[0].group).slice(0, 4).map((p) => p.id) : [])

  // perfil pedido pela busca: acrescenta na renderização (sem efeito)
  const [seen, setSeen] = useState(nav.nonce)
  if (seen !== nav.nonce) {
    setSeen(nav.nonce)
    const id = nav.profile
    if (id && !sel.includes(id)) setSel([...sel.slice(-3), id])
  }

  const groups = [...new Set(profiles.map((p) => p.group))]
  const chosen = sel.map((id) => profiles.find((p) => p.id === id)).filter((p): p is (typeof profiles)[number] => !!p)
  const change = (group: string, v: string[]) => {
    const others = sel.filter((id) => profiles.find((p) => p.id === id)?.group !== group)
    const next = [...others, ...v]
    if (next.length > 4) { toast("No máximo quatro por vez"); return }
    setSel(next)
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Comparador de {words.compareNoun}</h2>
        <span className="text-muted-foreground text-sm">{sel.length} de 4 selecionados</span>
      </div>
      <div className="mt-5 grid gap-4">
        {groups.map((g) => (
          <div key={g}>
            <div className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-[.08em] uppercase">{g}</div>
            <ToggleGroup multiple variant="outline" size="sm" spacing={2} className="flex-wrap"
              value={sel.filter((id) => profiles.find((p) => p.id === id)?.group === g)} onValueChange={(v) => change(g, v)}>
              {profiles.filter((p) => p.group === g).map((p) => (
                <ToggleGroupItem key={p.id} value={p.id} className={chip}>{sel.includes(p.id) ? <Check aria-hidden /> : <Plus aria-hidden />}{p.name}</ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        ))}
      </div>
      <div className="mt-6">
        {!chosen.length ? (
          <div className="text-muted-foreground rounded-xl border border-dashed p-12 text-center text-sm">
            <Columns3 className="mx-auto mb-3 size-8" />Selecione de dois a quatro {words.compareNoun} para vê-los lado a lado, campo a campo.
          </div>
        ) : (
          <div className="bg-card overflow-x-auto rounded-[14px] border">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 w-44 border-r">Campo</TableHead>
                  {chosen.map((p) => <TableHead key={p.id} className="text-foreground min-w-52 py-3.5 text-sm tracking-normal normal-case"><span className="font-semibold">{p.name}</span><span className="text-muted-foreground mt-0.5 block font-mono text-[11px] font-normal">{chapterLabel(chapterById(p.ch), true)}</span></TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((f) => (
                  <TableRow key={f.key}>
                    <TableHead className="sticky left-0 z-10 border-r py-3 align-top leading-snug whitespace-normal">{f.label}</TableHead>
                    {chosen.map((p) => {
                      const v = p[f.key] || "—"
                      return <TableCell key={p.id} className={cn(v === "—" && "text-muted-foreground")}><H html={v} /></TableCell>
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  )
}
