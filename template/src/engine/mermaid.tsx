/* Diagramas Mermaid com a Beautiful Mermaid (Craft).
   A biblioteca (e o ELK, ~1,6 MB) só é carregada quando um diagrama aparece na tela.
   As cores apontam para as variáveis do tema: o diagrama acompanha claro/escuro sem redesenhar. */
import { useEffect, useState } from "react"

type Render = (code: string, opts: Record<string, unknown>) => string
let loader: Promise<Render> | null = null
const load = () => (loader ??= import("beautiful-mermaid").then((m) => m.renderMermaidSVG as Render))

// A Beautiful Mermaid usa --bg, --fg, --muted, --surface, --border… dentro do SVG, os mesmos nomes do shadcn:
// passar var(--muted) direto criaria referência circular. Por isso as cores chegam pelos apelidos --mm-* (index.css).
const OPTS = {
  bg: "var(--mm-bg)",
  fg: "var(--mm-fg)",
  line: "var(--mm-line)",
  accent: "var(--mm-accent)",
  muted: "var(--mm-muted)",
  surface: "var(--mm-surface)",
  border: "var(--mm-border)",
  font: "Geist Variable",
  transparent: true,
  padding: 16,
}

// O SVG vem com @import do Google Fonts: o app é offline e já embute a Geist.
const clean = (svg: string) => svg.replace(/@import url\([^)]*\);?/g, "")

export function Mermaid({ code }: { code: string }) {
  const [svg, setSvg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    load()
      .then((render) => { if (alive) setSvg(clean(render(code, OPTS))) })
      .catch((e: unknown) => { if (alive) setErr(String(e)) })
    return () => { alive = false }
  }, [code])
  if (err) return <pre className="text-destructive text-xs whitespace-pre-wrap">Diagrama inválido: {err}</pre>
  if (!svg) return <div className="text-muted-foreground py-8 text-center text-sm">Desenhando o diagrama…</div>
  return <div className="mermaid-svg" role="img" dangerouslySetInnerHTML={{ __html: svg }} />
}
