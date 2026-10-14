/* Blocos de código com realce de sintaxe (Shiki, motor JavaScript: sem WebAssembly nem eval, passa na CSP do Tauri).
   O Shiki e cada linguagem só são carregados quando um bloco aparece. As cores vêm em duas versões
   (github-light / github-dark) e o CSS troca pelo tema, sem redesenhar.
   Bloco: { t: "code", code, lang?, title?, caption?, numbers? } */
import { useEffect, useState } from "react"
import { Check, Copy } from "lucide-react"
import { toast } from "sonner"
import type { HighlighterCore } from "shiki/core"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import "./code.css"
import { withMath } from "./math"

// Linguagens empacotadas (cada uma vira um pedaço separado, carregado sob demanda).
// Para outra, acrescente aqui: o nome é o do pacote @shikijs/langs.
const LANGS: Record<string, () => Promise<unknown>> = {
  python: () => import("@shikijs/langs/python"),
  javascript: () => import("@shikijs/langs/javascript"),
  typescript: () => import("@shikijs/langs/typescript"),
  java: () => import("@shikijs/langs/java"),
  c: () => import("@shikijs/langs/c"),
  cpp: () => import("@shikijs/langs/cpp"),
  csharp: () => import("@shikijs/langs/csharp"),
  go: () => import("@shikijs/langs/go"),
  rust: () => import("@shikijs/langs/rust"),
  sql: () => import("@shikijs/langs/sql"),
  bash: () => import("@shikijs/langs/bash"),
  powershell: () => import("@shikijs/langs/powershell"),
  json: () => import("@shikijs/langs/json"),
  yaml: () => import("@shikijs/langs/yaml"),
  html: () => import("@shikijs/langs/html"),
  css: () => import("@shikijs/langs/css"),
  r: () => import("@shikijs/langs/r"),
  prolog: () => import("@shikijs/langs/prolog"),
}
const ALIAS: Record<string, string> = {
  py: "python", js: "javascript", ts: "typescript", "c++": "cpp", cs: "csharp", "c#": "csharp",
  sh: "bash", shell: "bash", ps1: "powershell", yml: "yaml", golang: "go", rs: "rust", pl: "prolog", pro: "prolog",
  pseudocodigo: "pseudo", "pseudocódigo": "pseudo",
}
// rótulo do cabeçalho quando o bloco não tem título
const LABEL: Record<string, string> = {
  python: "Python", javascript: "JavaScript", typescript: "TypeScript", java: "Java", c: "C", cpp: "C++", csharp: "C#",
  go: "Go", rust: "Rust", sql: "SQL", bash: "Shell", powershell: "PowerShell", json: "JSON", yaml: "YAML", html: "HTML",
  css: "CSS", r: "R", prolog: "Prolog", pseudo: "Pseudocódigo", text: "Texto",
}

export const langOf = (lang?: string) => {
  const l = (lang ?? "").toLowerCase()
  const k = ALIAS[l] ?? l
  return LANGS[k] || k === "pseudo" ? k : "text"
}

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

/* Pseudocódigo em português: realce próprio, sem gramática do Shiki. Palavras-chave no acento, operadores
   de atribuição e comparação apagados, comentários (// ou %) em cinza. Mesmo HTML do Shiki (pre > code >
   span.line), para herdar a numeração e o estilo dos blocos de código. */
const PSEUDO_KW = /(?<![\p{L}\d_])(para cada|para todo|enquanto|se|senão|então|retorne|retorna|repita|até|faça|fim|função|procedimento|início|em|verdadeiro|falso)(?![\p{L}\d_])/gu
function pseudo(code: string) {
  const lines = code.split("\n").map((l) => {
    const [body, ...rest] = l.split(/(?=\/\/|%)/)
    const hl = escape(body)
      .replace(PSEUDO_KW, '<span class="pseudo-kw">$1</span>')
      .replace(/(←|:=|≥|≤|≠|&lt;=|&gt;=)/g, '<span class="pseudo-op">$1</span>')
    const comment = rest.length ? `<span class="pseudo-cm">${escape(rest.join(""))}</span>` : ""
    return `<span class="line">${hl}${comment}</span>`
  })
  return `<pre class="shiki"><code>${lines.join("\n")}</code></pre>`
}

let highlighter: Promise<HighlighterCore> | null = null
const loaded = new Set<string>()

async function highlight(code: string, lang: string): Promise<string> {
  highlighter ??= (async () => {
    const [{ createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([import("shiki/core"), import("shiki/engine/javascript")])
    return createHighlighterCore({
      themes: [import("@shikijs/themes/github-light"), import("@shikijs/themes/github-dark")],
      langs: [],
      engine: createJavaScriptRegexEngine(),
    })
  })()
  if (lang === "pseudo") return pseudo(code)
  const hl = await highlighter
  if (lang !== "text" && !loaded.has(lang)) {
    await hl.loadLanguage((await LANGS[lang]()) as Parameters<HighlighterCore["loadLanguage"]>[0])
    loaded.add(lang)
  }
  return hl.codeToHtml(code, { lang, themes: { light: "github-light", dark: "github-dark" }, defaultColor: false })
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    // fora de contexto seguro a API do clipboard pode faltar: cópia pelo jeito antigo
    const ta = document.createElement("textarea")
    ta.value = text
    ta.style.position = "fixed"
    ta.style.opacity = "0"
    document.body.appendChild(ta)
    ta.select()
    document.execCommand("copy")
    ta.remove()
  }
}

/** `compact` (lado a lado, bloco `codes`): cabeçalho com o título (`heading`, HTML) e a linguagem num chip,
 *  sem números de linha (a menos que `numbers`), a legenda dentro do cartão e altura que acompanha os vizinhos. */
export function CodeBlock({ code, lang, title, caption, numbers, compact, heading }: { code: string; lang?: string; title?: string; caption?: string; numbers?: boolean; compact?: boolean; heading?: string }) {
  const k = langOf(lang)
  const text = code.replace(/^\n+|\s+$/g, "")
  const [html, setHtml] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const showNumbers = numbers ?? (!compact && text.split("\n").length > 3)

  useEffect(() => {
    let alive = true
    highlight(text, k).then((h) => { if (alive) setHtml(h) }).catch(() => { /* fica o texto sem realce */ })
    return () => { alive = false }
  }, [text, k])

  const copy = async () => {
    await copyText(text)
    setCopied(true)
    toast("Código copiado")
    window.setTimeout(() => setCopied(false), 1500)
  }

  // antes do realce carregar: o mesmo texto, sem cor, já com as linhas (não pula o layout)
  const plain = `<pre class="shiki"><code>${text.split("\n").map((l) => `<span class="line">${escape(l)}</span>`).join("\n")}</code></pre>`

  // trecho de uma linha, sem título nem legenda: só a linha, num fundo leve, com o Copiar ao passar o mouse
  if (!compact && !title && !caption && !text.includes("\n")) {
    return (
      <figure className="group relative my-3 max-w-none font-sans">
        <div className="code-block code-bare bg-secondary/70 overflow-x-auto rounded-[10px] border py-2 pr-9 text-[13px] leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html ?? plain }} />
        <Button variant="ghost" size="icon-xs" onClick={copy} aria-label="Copiar código"
          className="text-muted-foreground absolute top-1/2 right-1 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100">
          {copied ? <Check /> : <Copy />}
        </Button>
      </figure>
    )
  }

  if (compact) {
    // o chip da linguagem só aparece se o título não a disser ("Lógico (Prolog)" já diz)
    const plainHeading = (heading ?? "").replace(/<[^>]+>/g, "").toLowerCase()
    const chip = heading && k !== "text" && !plainHeading.includes((LABEL[k] ?? k).toLowerCase())
    return (
      <figure className="bg-card my-0 flex h-full max-w-none min-w-0 flex-col overflow-hidden rounded-[14px] border font-sans">
        <div className="bg-secondary flex items-center gap-2 border-b py-1 pr-1 pl-3.5">
          <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold">{heading ? <span dangerouslySetInnerHTML={{ __html: withMath(heading) }} /> : title ?? LABEL[k] ?? k}</span>
          {chip && <span className="text-muted-foreground border-border bg-card rounded-full border px-2 py-px font-mono text-[10.5px]">{LABEL[k] ?? k}</span>}
          <Button variant="ghost" size="icon-xs" onClick={copy} aria-label="Copiar código" className="text-muted-foreground">{copied ? <Check /> : <Copy />}</Button>
        </div>
        <div className={cn("code-block flex-1 overflow-x-auto py-3 text-[12.5px] leading-relaxed", showNumbers && "code-lines")}
          dangerouslySetInnerHTML={{ __html: html ?? plain }} />
        {caption && <figcaption className="text-soft-foreground bg-secondary/40 border-t px-3.5 py-2.5 text-[12.5px] leading-snug" dangerouslySetInnerHTML={{ __html: withMath(caption) }} />}
      </figure>
    )
  }

  return (
    <figure className="my-5 max-w-none font-sans">
      <div className="bg-card overflow-hidden rounded-[14px] border">
        <div className="bg-secondary flex items-center gap-2 border-b py-1 pr-1.5 pl-4">
          <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs">{title ?? LABEL[k] ?? k}</span>
          <Button variant="ghost" size="xs" onClick={copy} aria-label="Copiar código" className="text-muted-foreground">
            {copied ? <Check /> : <Copy />}{copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
        <div className={cn("code-block overflow-x-auto py-3 text-[13px] leading-relaxed", showNumbers && "code-lines")}
          dangerouslySetInnerHTML={{ __html: html ?? plain }} />
      </div>
      {caption && <figcaption className="text-muted-foreground mt-2 text-center text-xs" dangerouslySetInnerHTML={{ __html: withMath(caption) }} />}
    </figure>
  )
}
