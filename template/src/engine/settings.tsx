/* Ajustes de leitura, tema e progresso (Sheet lateral) */
import { useRef } from "react"
import { Download, Monitor, Moon, Printer, Sun, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { allSectionIds, M, words } from "./core"
import { useConfirm } from "./confirm"
import { H } from "./html"
import { actions, useStore } from "./store"

const first = (v: number | readonly number[]) => (Array.isArray(v) ? v[0] : (v as number))

export function SettingsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { theme, setTheme } = useTheme()
  const prefs = useStore((s) => s.prefs)
  const read = useStore((s) => s.read)
  const bookmarks = useStore((s) => s.bookmarks)
  const notes = useStore((s) => s.notes)
  const srs = useStore((s) => s.srs)
  const fileRef = useRef<HTMLInputElement>(null)
  const confirm = useConfirm()
  const readN = allSectionIds.filter((id) => read[id]).length

  const download = () => {
    const blob = new Blob([actions.exportJson()], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `progresso-${M.slug}-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1500)
    toast.success("Progresso exportado")
  }
  const onImport = (f?: File) => {
    if (!f) return
    f.text().then((t) => { try { actions.importJson(t); toast.success("Progresso importado") } catch { toast.error("Arquivo inválido") } })
  }
  const reset = async () => {
    if (await confirm({ title: "Apagar todo o progresso?", description: "Serão apagados o progresso de leitura, as fichas, as notas, os marcadores, o treino e o simulado. Esta ação não pode ser desfeita.", action: "Apagar tudo", destructive: true })) {
      actions.reset(); toast("Tudo apagado")
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Ajustes de leitura</SheetTitle>
          <SheetDescription>Tudo fica salvo só neste computador.</SheetDescription>
        </SheetHeader>
        <div className="grid gap-6 px-4 pb-6">
          <div className="grid gap-2">
            <Label>Tema</Label>
            <ToggleGroup variant="outline" value={[theme]} onValueChange={(v) => v[0] && setTheme(v[0] as typeof theme)}>
              <ToggleGroupItem value="system"><Monitor />Sistema</ToggleGroupItem>
              <ToggleGroupItem value="light"><Sun />Claro</ToggleGroupItem>
              <ToggleGroupItem value="dark"><Moon />Escuro</ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div className="grid gap-2">
            <Label>Fonte do texto</Label>
            <ToggleGroup variant="outline" value={[prefs.readFont]} onValueChange={(v) => v[0] && actions.setPref("readFont", v[0] as "sans" | "serif")}>
              <ToggleGroupItem value="sans">Sans</ToggleGroupItem>
              <ToggleGroupItem value="serif" className="font-serif">Serif</ToggleGroupItem>
            </ToggleGroup>
            <p className="text-muted-foreground text-xs">A serif (Source Serif 4) costuma cansar menos em leitura corrida longa.</p>
          </div>
          <div className="grid gap-3">
            <Label>Tamanho do texto · {prefs.readSize} px</Label>
            <Slider min={14} max={22} step={1} value={[prefs.readSize]} onValueChange={(v) => actions.setPref("readSize", first(v))} />
          </div>
          <div className="grid gap-3">
            <Label>Entrelinha · {prefs.readLh.toFixed(2)}</Label>
            <Slider min={140} max={210} step={2} value={[Math.round(prefs.readLh * 100)]} onValueChange={(v) => actions.setPref("readLh", first(v) / 100)} />
          </div>
          <div className="grid gap-3">
            <Label>Largura da coluna · {prefs.measure} caracteres</Label>
            <Slider min={52} max={100} step={2} value={[prefs.measure]} onValueChange={(v) => actions.setPref("measure", first(v))} />
          </div>
          <Separator />
          <div className="grid gap-2">
            <Label>Seu progresso</Label>
            <p className="text-muted-foreground text-xs">
              {words.sectionsRead.charAt(0).toUpperCase() + words.sectionsRead.slice(1)}: {readN} · marcadores: {Object.keys(bookmarks).length} · notas: {Object.keys(notes).length} · fichas em andamento: {Object.keys(srs).length}
            </p>
            <Button variant="outline" onClick={download}><Download />Exportar progresso (JSON)</Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}><Upload />Importar progresso</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => { onImport(e.target.files?.[0]); e.target.value = "" }} />
            <Button variant="outline" onClick={() => window.print()}><Printer />Imprimir a tela atual</Button>
            <Button variant="destructive" onClick={reset}><Trash2 />Apagar todo o progresso</Button>
          </div>
          <Separator />
          <div className="grid gap-2 text-sm">
            <Label>Atalhos de teclado</Label>
            <div className="text-muted-foreground grid gap-1.5 text-xs">
              <span><Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> ou <Kbd>/</Kbd> · buscar</span>
              <span><Kbd>←</Kbd> <Kbd>→</Kbd> · {words.chapter.toLowerCase()} anterior ou seguinte</span>
              <span><Kbd>espaço</Kbd> · virar a ficha · <Kbd>1</Kbd>-<Kbd>4</Kbd> · avaliar</span>
              <span><Kbd>D</Kbd> · alternar tema</span>
            </div>
          </div>
          <Separator />
          <H as="p" html={M.footerNote} className="text-muted-foreground text-xs leading-relaxed" />
        </div>
      </SheetContent>
    </Sheet>
  )
}
