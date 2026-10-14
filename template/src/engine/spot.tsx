/* Só em desenvolvimento: um bloco sozinho numa página em branco, para tirar screenshot e comparar com o PDF
   (tools/shot.mjs). Endereços:
     #/spot/<seção>/<caminho>        bloco de uma seção do manual (ou de uma parte do Mapa, pelo id da parte)
     #/fig/<nome>                    esquema de figuras.tsx, com a moldura do app
   <caminho>: índice do bloco na seção ("3"); dentro de callout, explica ou cols, mais um nível ("3.1";
   em cols, "3.0.1" = coluna 0, bloco 1). Parâmetros depois de "?": w (largura em px, padrão 820),
   tema (claro | escuro). */
import { TooltipProvider } from "@/components/ui/tooltip"
import { BlockView, Figure } from "./blocks"
import { C } from "./core"
import { NavProvider } from "./nav"
import type { Block } from "./types"

function find(where: string, path: string): Block | null {
  const sec = C.chapters.flatMap((c) => c.sections).find((s) => s.id === where)
  let list: Block[] | undefined = sec?.blocks ?? C.mapa?.parts.find((p) => p.id === where)?.blocks
  let b: Block | null = null
  const idx = path.split(".").map(Number)
  for (let i = 0; i < idx.length && list; i++) {
    b = list[idx[i]] ?? null
    if (!b) return null
    if (b.t === "cols") { const col = b.columns[idx[++i]]; list = col?.blocks; if (i === idx.length - 1) return b; continue }
    list = b.t === "callout" || b.t === "explica" ? b.blocks : undefined
  }
  return b
}

export function Spot({ hash }: { hash: string }) {
  const [route, query = ""] = hash.replace(/^#\//, "").split("?")
  const q = new URLSearchParams(query)
  const w = Number(q.get("w") ?? 820)
  const dark = q.get("tema") === "escuro"
  document.documentElement.classList.toggle("dark", dark)
  document.documentElement.classList.toggle("light", !dark)
  const [kind, a, b] = route.split("/")
  let body: React.ReactNode = <p>Endereço inválido: {hash}</p>
  if (kind === "fig" && a) body = <Figure refName={decodeURIComponent(a)} />
  if (kind === "spot" && a) {
    const blk = find(decodeURIComponent(a), b ?? "0")
    body = blk ? <BlockView b={blk} /> : <p>Bloco não encontrado: {a} / {b}</p>
  }
  return (
    <TooltipProvider>
      <NavProvider>
        <div className="bg-background text-foreground min-h-screen p-5">
          <div id="spot" className="prose-manual mx-auto" style={{ width: w, maxWidth: "100%" }}>{body}</div>
        </div>
      </NavProvider>
    </TooltipProvider>
  )
}
