/* Moldura do aplicativo: barra superior, navegação entre as abas, busca, ajustes e atalhos */
import { useEffect, useState } from "react"
import { BookOpenText, ClipboardList, Columns3, House, Layers, ListChecks, Map as MapIcon, Menu, Monitor, Moon, PencilLine, Search, SlidersHorizontal, Sun } from "lucide-react"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { ConfirmProvider } from "@/engine/confirm"
import { C, M, words } from "@/engine/core"
import { drills } from "@/engine/drills"
import { NavProvider, useNav } from "@/engine/nav"
import { SearchDialog } from "@/engine/search-dialog"
import { SettingsSheet } from "@/engine/settings"
import { useStore } from "@/engine/store"
import type { ViewId } from "@/engine/types"
import { Compare } from "@/engine/views/compare"
import { Flashcards } from "@/engine/views/flashcards"
import { Home } from "@/engine/views/home"
import { Mapa } from "@/engine/views/mapa"
import { Quiz } from "@/engine/views/quiz"
import { ChapterList, Reader } from "@/engine/views/reader"
import { Simulado } from "@/engine/views/simulado"
import { Treino } from "@/engine/views/treino"

const NAV_ALL: { view: ViewId; label: string; short?: string; icon: typeof House; show: boolean }[] = [
  { view: "home", label: "Início", icon: House, show: true },
  { view: "manual", label: words.docTab, icon: BookOpenText, show: true },
  { view: "mapa", label: "Mapa", icon: MapIcon, show: !!C.mapa },
  { view: "treino", label: "Treino", icon: PencilLine, show: drills.length > 0 },
  { view: "simulado", label: "Simulado", icon: ClipboardList, show: !!C.simulado },
  { view: "fichas", label: "Fichas", icon: Layers, show: C.cards.length > 0 },
  { view: "questoes", label: "Questões", icon: ListChecks, show: C.quiz.length > 0 },
  { view: "comparador", label: "Comparador", short: "Comparar", icon: Columns3, show: C.compare.profiles.length > 0 },
]
const NAV = NAV_ALL.filter((n) => n.show)

function View({ view }: { view: ViewId }) {
  switch (view) {
    case "manual": return <Reader />
    case "mapa": return <Mapa />
    case "treino": return <Treino />
    case "simulado": return <Simulado />
    case "fichas": return <Flashcards />
    case "questoes": return <Quiz />
    case "comparador": return <Compare />
    default: return <Home />
  }
}

function Shell() {
  const { nav, go } = useNav()
  const { theme, setTheme } = useTheme()
  const prefs = useStore((s) => s.prefs)
  const [searchOpen, setSearchOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tocOpen, setTocOpen] = useState(false)
  const Brand = M.brandIcon

  // preferências de leitura viram variáveis CSS
  useEffect(() => {
    const r = document.documentElement.style
    r.setProperty("--read-font", prefs.readFont === "serif" ? "var(--font-serif)" : "var(--font-sans)")
    r.setProperty("--read-size", prefs.readSize + "px")
    r.setProperty("--read-lh", String(prefs.readLh))
    r.setProperty("--read-measure", prefs.measure + "ch")
  }, [prefs])

  useEffect(() => { document.title = M.appTitle }, [])

  // atalhos: Ctrl K ou / para buscar; ← → entre capítulos no leitor
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable=true], [role=combobox]")
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); return }
      if (typing || document.querySelector("[role=dialog], [role=alertdialog]")) return
      if (e.key === "/") { e.preventDefault(); setSearchOpen(true); return }
      if (nav.view === "manual" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        const i = C.chapters.findIndex((c) => c.id === nav.chapter)
        const t = C.chapters[i + (e.key === "ArrowRight" ? 1 : -1)]
        if (t) go({ view: "manual", chapter: t.id })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [nav.view, nav.chapter, go])

  const nextTheme = theme === "system" ? "light" : theme === "light" ? "dark" : "system"
  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor

  return (
    <div className="flex h-svh flex-col">
      <header className="bg-card/90 flex h-[60px] shrink-0 items-center gap-2 border-b px-3 backdrop-blur-md backdrop-saturate-150 md:gap-3.5 md:px-4">
        {nav.view === "manual" && (
          <Button variant="outline" size="icon-sm" className="lg:hidden" onClick={() => setTocOpen(true)} aria-label={`Abrir índice de ${words.chapters}`}><Menu /></Button>
        )}
        <button type="button" onClick={() => go({ view: "home" })} className="flex shrink-0 items-center gap-2.5 text-left">
          <span className="bg-primary text-primary-foreground grid size-[30px] place-items-center rounded-[9px]"><Brand className="size-[17px]" /></span>
          <span className="hidden leading-tight sm:block"><span className="block text-[13.5px] font-semibold tracking-tight">{M.brandTitle}</span><span className="text-muted-foreground mt-0.5 hidden text-[11px] 2xl:block">{M.brandSub}</span></span>
        </button>
        <nav className="ml-1.5 hidden min-w-0 flex-1 items-center gap-0.5 md:flex" aria-label="Seções do aplicativo">
          {NAV.map((n) => {
            const active = nav.view === n.view
            return (
              <Tooltip key={n.view}>
                <TooltipTrigger render={
                  <Button variant="ghost" size="sm" aria-current={active ? "page" : undefined} onClick={() => go({ view: n.view })}
                    className={cn("shrink-0 text-[13.5px]", active ? "border-primary-line bg-primary-soft text-primary hover:bg-primary-soft hover:text-primary dark:hover:bg-primary-soft" : "text-soft-foreground")} />
                }>
                  <n.icon /><span className="hidden xl:inline">{n.label}</span>
                </TooltipTrigger>
                <TooltipContent className="xl:hidden">{n.label}</TooltipContent>
              </Tooltip>
            )
          })}
        </nav>
        <div className="flex-1 md:hidden" />
        <Button variant="outline" size="sm" className="text-muted-foreground bg-secondary dark:bg-secondary shrink-0 font-normal lg:min-w-[190px] lg:justify-start" onClick={() => setSearchOpen(true)} aria-label="Buscar">
          <Search /><span className="hidden lg:inline">Buscar no {words.doc}</span><Kbd className="ml-auto hidden lg:inline-flex">Ctrl K</Kbd>
        </Button>
        <Tooltip>
          <TooltipTrigger render={<Button variant="outline" size="icon-sm" className="bg-secondary dark:bg-secondary" onClick={() => setTheme(nextTheme)} aria-label="Alternar tema" />}><ThemeIcon /></TooltipTrigger>
          <TooltipContent>Tema: {theme === "system" ? "do sistema" : theme === "light" ? "claro" : "escuro"}</TooltipContent>
        </Tooltip>
        <Button variant="outline" size="icon-sm" className="bg-secondary dark:bg-secondary" onClick={() => setSettingsOpen(true)} aria-label="Ajustes de leitura"><SlidersHorizontal /></Button>
      </header>

      <div className="flex min-h-0 flex-1">
        {nav.view === "manual" && (
          <aside className="bg-sidebar hidden w-[292px] shrink-0 overflow-y-auto border-r p-4 lg:block" data-print="hide"><ChapterList /></aside>
        )}
        <main id="main" className={cn("min-w-0 flex-1 overflow-y-auto")}>
          <View view={nav.view} />
        </main>
      </div>

      {/* telas estreitas: as abas descem para uma barra inferior, todas visíveis */}
      <nav className="bg-card grid shrink-0 border-t pb-[env(safe-area-inset-bottom)] md:hidden" style={{ gridTemplateColumns: `repeat(${NAV.length}, minmax(0, 1fr))` }} aria-label="Seções do aplicativo" data-print="hide">
        {NAV.map((n) => {
          const active = nav.view === n.view
          return (
            <button key={n.view} type="button" onClick={() => go({ view: n.view })} aria-current={active ? "page" : undefined}
              className={cn("flex min-w-0 flex-col items-center gap-0.5 py-1.5 text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
              <span className={cn("grid h-7 w-11 place-items-center rounded-full transition-colors", active && "bg-primary-soft text-primary")}><n.icon className="size-4" /></span>
              <span className="w-full truncate text-center">{n.short ?? n.label}</span>
            </button>
          )
        })}
      </nav>

      <Sheet open={tocOpen} onOpenChange={setTocOpen}>
        <SheetContent side="left" className="w-80 overflow-y-auto">
          <SheetHeader><SheetTitle>{words.chapters.charAt(0).toUpperCase() + words.chapters.slice(1)}</SheetTitle></SheetHeader>
          <div className="px-4 pb-4"><ChapterList onPick={() => setTocOpen(false)} /></div>
        </SheetContent>
      </Sheet>
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  )
}

export default function App() {
  return (
    <NavProvider>
      <ConfirmProvider>
        <TooltipProvider>
          <Shell />
        </TooltipProvider>
      </ConfirmProvider>
      <Toaster position="bottom-center" />
    </NavProvider>
  )
}
