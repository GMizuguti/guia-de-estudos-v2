/* Fórmulas com KaTeX, embutido (fontes e CSS vão no pacote; nada de CDN).
   - Bloco: { t: "math", tex, caption? } → fórmula em destaque, centralizada.
   - Dentro de qualquer texto HTML: \( … \) para fórmula na linha e \[ … \] para fórmula em destaque.
   No conteúdo, escreva o TeX com String.raw`…` para não dobrar as barras: String.raw`\frac{a}{b}`. */
import katex from "katex"
import "katex/dist/katex.min.css"
import "./formula.css"

const cache = new Map<string, string>()

/** TeX → HTML do KaTeX. Erro de sintaxe não derruba a página: sai o TeX em vermelho com a mensagem no title. */
export function renderTex(tex: string, display = false): string {
  const key = (display ? "D:" : "I:") + tex
  let out = cache.get(key)
  if (out === undefined) {
    out = katex.renderToString(tex, { displayMode: display, throwOnError: false, strict: "ignore", output: "htmlAndMathml" })
    cache.set(key, out)
  }
  return out
}

// o TeX dentro de um campo HTML pode ter vindo com entidades (&lt; &gt; &amp;)
const decode = (s: string) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&")

const INLINE = /\\\(([\s\S]+?)\\\)/g
const DISPLAY = /\\\[([\s\S]+?)\\\]/g

/** Troca \( … \) e \[ … \] de um HTML pelas fórmulas renderizadas. Sem delimitador, devolve o mesmo texto. */
export function withMath(html: string): string {
  if (!html.includes("\\(") && !html.includes("\\[")) return html
  return html
    .replace(DISPLAY, (_, t: string) => renderTex(decode(t), true))
    .replace(INLINE, (_, t: string) => renderTex(decode(t), false))
}

/** plain: a fórmula já é texto (Unicode e HTML inline, como ∀x (P(x) → Q(x))), em fonte mono e sem KaTeX. */
export function MathBlock({ tex, caption, plain }: { tex: string; caption?: string; plain?: boolean }) {
  return (
    <figure className="my-5 max-w-none">
      {plain
        ? <div className="math-plain formula-font bg-card rounded-[14px] border px-5 py-4 text-center text-[1.02em] font-semibold [overflow-wrap:anywhere]" dangerouslySetInnerHTML={{ __html: withMath(tex) }} />
        : <div className="math-block bg-card overflow-x-auto rounded-[14px] border px-5 py-4" dangerouslySetInnerHTML={{ __html: renderTex(tex, true) }} />}
      {caption && <figcaption className="text-muted-foreground mt-2 text-center font-sans text-xs" dangerouslySetInnerHTML={{ __html: withMath(caption) }} />}
    </figure>
  )
}
