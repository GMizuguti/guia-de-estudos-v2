/* TeX → texto simples, para a busca e para os trechos mostrados nos resultados.
   \(h(n) \le h^*(n)\) vira "h(n) ≤ h*(n)"; \(O(b^{d/2})\) vira "O(b^(d/2))"; \(2^4\) vira "2⁴".
   Não é um renderizador: cobre os comandos que aparecem nos materiais (relações, letras gregas,
   \text, \min/\max, \sum, potências e índices). A mesma conversão existe em tools/coverage.py. */

const SUP: Record<string, string> = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" }
const SUB: Record<string, string> = {
  0: "₀", 1: "₁", 2: "₂", 3: "₃", 4: "₄", 5: "₅", 6: "₆", 7: "₇", 8: "₈", 9: "₉",
  a: "ₐ", e: "ₑ", i: "ᵢ", j: "ⱼ", k: "ₖ", n: "ₙ", r: "ᵣ", "-": "₋", "+": "₊",
}

const SYM: [string, string][] = [
  ["leftrightarrow", "↔"], ["Leftrightarrow", "⇔"], ["Rightarrow", "⇒"], ["Leftarrow", "⇐"], ["rightarrow", "→"],
  ["leftarrow", "←"], ["longrightarrow", "→"], ["mapsto", "↦"], ["iff", "⇔"], ["implies", "⇒"], ["to", "→"], ["gets", "←"],
  ["le", "≤"], ["leq", "≤"], ["ge", "≥"], ["geq", "≥"], ["lt", "<"], ["gt", ">"], ["neq", "≠"], ["ne", "≠"],
  ["approx", "≈"], ["equiv", "≡"], ["times", "×"], ["div", "÷"], ["pm", "±"], ["infty", "∞"],
  ["in", "∈"], ["notin", "∉"], ["subseteq", "⊆"], ["subset", "⊂"], ["cup", "∪"], ["cap", "∩"], ["setminus", "∖"], ["emptyset", "∅"],
  ["forall", "∀"], ["exists", "∃"], ["neg", "¬"], ["land", "∧"], ["lor", "∨"], ["wedge", "∧"], ["vee", "∨"],
  ["sum", "Σ"], ["prod", "∏"], ["sqrt", "√"], ["lceil", "⌈"], ["rceil", "⌉"], ["lfloor", "⌊"], ["rfloor", "⌋"],
  ["langle", "⟨"], ["rangle", "⟩"], ["lvert", "|"], ["rvert", "|"], ["vert", "|"], ["mid", "|"],
  ["alpha", "α"], ["beta", "β"], ["gamma", "γ"], ["delta", "δ"], ["Delta", "Δ"], ["varepsilon", "ε"], ["epsilon", "ε"],
  ["theta", "θ"], ["lambda", "λ"], ["mu", "μ"], ["pi", "π"], ["sigma", "σ"], ["Sigma", "Σ"], ["omega", "ω"], ["Omega", "Ω"],
  ["min", "min"], ["max", "max"], ["log", "log"], ["dots", "..."], ["ldots", "..."], ["cdots", "..."], ["vdots", "⋮"],
  ["prime", "′"], ["star", "⋆"], ["circ", "∘"],
]

export function texPlain(tex: string) {
  let s = tex
  // \text{…} e afins: só o conteúdo
  for (let k = 0; k < 3; k++) s = s.replace(/\\(?:text|mathrm|mathit|mathbf|textit|textbf|operatorname|mathcal|boldsymbol)\s*\{([^{}]*)\}/g, "$1")
  s = s.replace(/\\(?:begin|end)\{[^}]*\}/g, " ")
  s = s.replace(/\\(?:left|right|big|Big|bigg|Bigg)(?![a-zA-Z])/g, "")
  s = s.replace(/\\(?:underbrace|overbrace)\{([^{}]*)\}_\{[^{}]*\}/g, "$1").replace(/\\(?:underbrace|overbrace)(?![a-zA-Z])/g, "")
  s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/$2")
  s = s.replace(/\\cdot(?![a-zA-Z])\s*/g, "·").replace(/\s*·/g, "·")
  for (const [k, v] of SYM) s = s.replace(new RegExp(`\\\\${k}(?![a-zA-Z])`, "g"), v)
  s = s.replace(/\\\\/g, " ").replace(/&/g, " ") // quebra de linha e alinhamento (aligned, cases)
  s = s.replace(/\\[,;:! ]|\\quad|\\qquad/g, " ").replace(/~/g, " ")
  s = s.replace(/\{,\}/g, ",").replace(/\{\.\}/g, ".").replace(/\\\{/g, "⦃").replace(/\\\}/g, "⦄") // chaves literais, protegidas
  // potências: ^* → *, ^2 → ², ^{12} → ¹², ^x → ^x, ^{d/2} → ^(d/2)
  s = s.replace(/\^\{\s*\*\s*\}|\^\*/g, "*")
  s = s.replace(/\^\{([^{}]*)\}/g, (_, x: string) => (/^\d+$/.test(x) ? [...x].map((c) => SUP[c]).join("") : x.length === 1 ? `^${x}` : `^(${x})`))
  s = s.replace(/\^(\d)/g, (_, d: string) => SUP[d])
  // índices: _1 → ₁, _i → ᵢ, _{12} → ₁₂, o resto fica _(…)
  s = s.replace(/_\{([^{}]*)\}/g, (_, x: string) => ([...x].every((c) => SUB[c]) ? [...x].map((c) => SUB[c]).join("") : `_(${x})`))
  s = s.replace(/_([0-9a-z])/g, (m, c: string) => SUB[c] ?? m)
  s = s.replace(/[{}]/g, "").replace(/⦃/g, "{").replace(/⦄/g, "}")
  s = s.replace(/\\([a-zA-Z]+)/g, "$1")
  return s.replace(/\s+/g, " ").trim()
}

/** Troca cada \( … \) e \[ … \] de um texto pela versão simples. */
export function plainMath(text: string) {
  if (!text.includes("\\(") && !text.includes("\\[")) return text
  return text.replace(/\\\[([\s\S]+?)\\\]/g, (_, t: string) => ` ${texPlain(t)} `).replace(/\\\(([\s\S]+?)\\\)/g, (_, t: string) => texPlain(t))
}
