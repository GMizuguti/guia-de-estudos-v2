/* Navegação entre as abas (sem roteador: o app é uma janela só) */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import { actions, getState } from "./store"
import type { ViewId } from "./types"

export interface NavState {
  view: ViewId
  chapter: string
  section?: string // rolar até esta seção no manual
  focus?: string // exercício do Treino
  simFocus?: number // questão do Simulado
  profile?: string // perfil a acrescentar no comparador
  nonce: number // muda a cada navegação (dispara a rolagem)
}

export type GoTarget = { view: ViewId; chapter?: string; section?: string; focus?: string; simFocus?: number; profile?: string }

const VIEWS: ViewId[] = ["home", "manual", "mapa", "treino", "simulado", "fichas", "questoes", "comparador"]

/** Endereço direto ao abrir: #/v/<aba>[/<seção ou exercício>] (ex.: #/v/manual/c1-3, #/v/treino/ts2-1). */
function fromHash(): NavState | null {
  const m = /^#\/v\/([a-z]+)(?:\/([\w-]+))?/.exec(typeof location === "undefined" ? "" : location.hash)
  if (!m || !VIEWS.includes(m[1] as ViewId)) return null
  const view = m[1] as ViewId, arg = m[2]
  if (view === "manual" && arg) return { view, chapter: arg.split("-")[0], section: arg.includes("-") ? arg : undefined, nonce: 1 }
  if (view === "treino" && arg) return { view, chapter: getState().lastChapter || "c1", focus: arg, nonce: 1 }
  return { view, chapter: getState().lastChapter || "c1", nonce: 1 }
}

const Ctx = createContext<{ nav: NavState; go: (t: GoTarget) => void } | null>(null)

export function NavProvider({ children }: { children: ReactNode }) {
  const [nav, setNav] = useState<NavState>(() => fromHash() ?? { view: "home", chapter: getState().lastChapter || "c1", nonce: 0 })
  const go = useCallback((t: GoTarget) => {
    setNav((n) => {
      const chapter = t.chapter ?? (t.section ? t.section.split("-")[0] : n.chapter)
      return { view: t.view, chapter, section: t.section, focus: t.focus, simFocus: t.simFocus, profile: t.profile, nonce: n.nonce + 1 }
    })
    actions.setLast(t.view, t.chapter ?? (t.section ? t.section.split("-")[0] : undefined))
  }, [])
  const value = useMemo(() => ({ nav, go }), [nav, go])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNav() {
  const v = useContext(Ctx)
  if (!v) throw new Error("useNav fora do NavProvider")
  return v
}

/** Rola o contêiner principal até um elemento (ou ao topo). */
export function scrollMainTo(el?: HTMLElement | null, offset = 16) {
  const main = document.getElementById("main")
  if (!main) return
  if (!el) { main.scrollTop = 0; return }
  main.scrollTop = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - offset
}
