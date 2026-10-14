/* Mapa de revisão: o essencial em uma tela (condensado pelo app) */
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Blocks } from "../blocks"
import { C } from "../core"
import { H } from "../html"
import { scrollMainTo, useNav } from "../nav"

export function Mapa() {
  const P = C.mapa!
  const { nav } = useNav()
  useEffect(() => { scrollMainTo(null) }, [nav.nonce])
  return (
    <div className="mx-auto max-w-5xl px-5 py-8 md:px-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{P.title ?? "Mapa de revisão"}</h2>
        <span className="text-muted-foreground text-sm">Condensado do material pelo app</span>
      </div>
      {P.lead && <H as="p" html={P.lead} className="text-muted-foreground mt-1 max-w-3xl text-sm" />}
      <nav className="bg-background/95 sticky top-0 z-10 -mx-1 mt-4 flex flex-wrap gap-1.5 px-1 py-2.5 backdrop-blur" aria-label="Partes do mapa">
        {P.parts.map((p, i) => (
          <Button key={p.id} variant="outline" size="sm" className="rounded-full" onClick={() => scrollMainTo(document.getElementById(p.id), 64)}>
            <span className="text-muted-foreground font-mono">{i + 1}</span>{p.title}
          </Button>
        ))}
      </nav>
      {P.parts.map((p) => (
        <section key={p.id} id={p.id} className="mt-4 scroll-mt-16 border-t pt-6">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h3 className="text-lg font-semibold tracking-tight">{p.title}</h3>
            {p.src && <span className="text-muted-foreground font-mono text-xs">{p.src}</span>}
          </div>
          {/* no Mapa os esquemas entram sem a moldura "não está no material": a aba inteira já é do app */}
          <div className="prose-manual [&>*]:max-w-none"><Blocks blocks={p.blocks} framed={false} /></div>
        </section>
      ))}
    </div>
  )
}
