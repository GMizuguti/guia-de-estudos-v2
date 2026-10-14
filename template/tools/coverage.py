"""Checagem de cobertura linha a linha: toda linha do PDF precisa existir nos arquivos de dados.

Uso:  python -X utf8 tools/coverage.py "material.pdf" "src/content/capitulos/*.ts" src/content/auxiliares.ts
      python -X utf8 tools/coverage.py "simulado.pdf" src/content/simulado.ts

Normaliza os dois lados (tags e entidades HTML, aspas escapadas, espaços, caixa), converte as
fórmulas TeX do conteúdo em texto como o PDF as escreve ("h(n) ≤ h*(n)") e procura cada linha do PDF
com 6+ caracteres. Cabeçalhos e rodapés que se repetem em 3+ páginas são ignorados
sozinhos. Ausências esperadas: títulos numerados ("3.1 Título" vira num + title),
rótulos que a interface monta ("Questão 1 (1,0 ponto)"). Qualquer outra ausência é texto perdido
ou alterado: corrija antes de compilar. Linha quebrada com hífen no PDF ("megawatts-\\nhora")
também aparece; confira e siga.
Requer: pip install pymupdf
"""
import glob
import html
import io
import re
import sys

import pymupdf


INLINE = r"</?(b|i|em|strong|code|mark|span|sub|sup|small)\b[^>]*>"  # tags de linha somem sem deixar espaço

# TeX → texto, para comparar fórmulas do conteúdo (\( h(n) \le h^*(n) \)) com o texto do PDF (h(n) ≤ h*(n)).
# Mesma conversão de src/engine/tex-plain.ts, mais o sinal de menos (− fora de \text{…}).
SUP = str.maketrans("0123456789", "⁰¹²³⁴⁵⁶⁷⁸⁹")
SUB = dict(zip("0123456789aeijknr-+", "₀₁₂₃₄₅₆₇₈₉ₐₑᵢⱼₖₙᵣ₋₊"))
SYM = [
    ("leftrightarrow", "↔"), ("Leftrightarrow", "⇔"), ("Rightarrow", "⇒"), ("Leftarrow", "⇐"), ("rightarrow", "→"),
    ("leftarrow", "←"), ("longrightarrow", "→"), ("mapsto", "↦"), ("iff", "⇔"), ("implies", "⇒"), ("to", "→"), ("gets", "←"),
    ("le", "≤"), ("leq", "≤"), ("ge", "≥"), ("geq", "≥"), ("lt", "<"), ("gt", ">"), ("neq", "≠"), ("ne", "≠"),
    ("approx", "≈"), ("equiv", "≡"), ("times", "×"), ("div", "÷"), ("pm", "±"), ("infty", "∞"),
    ("in", "∈"), ("notin", "∉"), ("subseteq", "⊆"), ("subset", "⊂"), ("cup", "∪"), ("cap", "∩"), ("setminus", "∖"), ("emptyset", "∅"),
    ("forall", "∀"), ("exists", "∃"), ("neg", "¬"), ("land", "∧"), ("lor", "∨"), ("wedge", "∧"), ("vee", "∨"),
    ("sum", "Σ"), ("prod", "∏"), ("sqrt", "√"), ("lceil", "⌈"), ("rceil", "⌉"), ("lfloor", "⌊"), ("rfloor", "⌋"),
    ("langle", "⟨"), ("rangle", "⟩"), ("lvert", "|"), ("rvert", "|"), ("vert", "|"), ("mid", "|"),
    ("alpha", "α"), ("beta", "β"), ("gamma", "γ"), ("delta", "δ"), ("Delta", "Δ"), ("varepsilon", "ε"), ("epsilon", "ε"),
    ("theta", "θ"), ("lambda", "λ"), ("mu", "μ"), ("pi", "π"), ("sigma", "σ"), ("Sigma", "Σ"), ("omega", "ω"), ("Omega", "Ω"),
    ("min", "min"), ("max", "max"), ("log", "log"), ("dots", "..."), ("ldots", "..."), ("cdots", "..."), ("vdots", "⋮"),
    ("prime", "′"), ("star", "⋆"), ("circ", "∘"),
]


def tex_plain(t):
    kept = []

    def keep(m):
        kept.append(m.group(1))
        return "\x00%d\x00" % (len(kept) - 1)

    for _ in range(3):
        t = re.sub(r"\\(?:text|mathrm|mathit|mathbf|textit|textbf|operatorname|mathcal|boldsymbol)\s*\{([^{}]*)\}", keep, t)
    t = re.sub(r"\\(?:begin|end)\{[^}]*\}", " ", t)
    t = re.sub(r"\\(?:left|right|big|Big|bigg|Bigg)(?![a-zA-Z])", "", t)
    t = re.sub(r"\\(?:underbrace|overbrace)\{([^{}]*)\}_\{[^{}]*\}", r"\1", t)
    t = re.sub(r"\\(?:underbrace|overbrace)(?![a-zA-Z])", "", t)
    t = re.sub(r"\\frac\{([^{}]*)\}\{([^{}]*)\}", r"\1/\2", t)
    t = re.sub(r"\s*\\cdot(?![a-zA-Z])\s*", "·", t)
    for k, v in SYM:
        t = re.sub(r"\\" + k + r"(?![a-zA-Z])", v, t)
    t = t.replace("\\\\", " ").replace("&", " ")
    t = re.sub(r"\\[,;:! ]|\\qquad|\\quad", " ", t).replace("~", " ")
    t = t.replace("{,}", ",").replace("{.}", ".").replace("\\{", "\x01").replace("\\}", "\x02")
    t = re.sub(r"\^\{\s*\*\s*\}|\^\*", "*", t)
    t = re.sub(r"\^\{([^{}]*)\}", lambda m: m.group(1).translate(SUP) if m.group(1).isdigit() else ("^" + m.group(1) if len(m.group(1)) == 1 else "^(" + m.group(1) + ")"), t)
    t = re.sub(r"\^(\d)", lambda m: m.group(1).translate(SUP), t)
    t = re.sub(r"_\{([^{}]*)\}", lambda m: "".join(SUB[c] for c in m.group(1)) if all(c in SUB for c in m.group(1)) else "_(" + m.group(1) + ")", t)
    t = re.sub(r"_([0-9a-z])", lambda m: SUB.get(m.group(1), m.group(0)), t)
    t = re.sub(r"[{}]", "", t).replace("\x01", "{").replace("\x02", "}")
    t = re.sub(r"\\([a-zA-Z]+)", r"\1", t)
    t = t.replace("-", "−")  # menos da matemática; o "-" de \text{TERMINAL-TEST} está guardado
    t = re.sub(r"\x00(\d+)\x00", lambda m: kept[int(m.group(1))], t)
    return re.sub(r"\s+", " ", t).strip()


def plain_math(s):
    s = re.sub(r"\\\[(.+?)\\\]", lambda m: " " + tex_plain(m.group(1)) + " ", s, flags=re.S)
    s = re.sub(r"\\\((.+?)\\\)", lambda m: tex_plain(m.group(1)), s, flags=re.S)
    return re.sub(r"tex:\s*String\.raw`([^`]*)`", lambda m: tex_plain(m.group(1)), s)


def norm(s, tex=False):
    s = s.replace('\\"', '"').replace("\\\\", "\\")
    if tex:
        s = plain_math(s)
    s = re.sub(INLINE, "", s)
    s = re.sub(r"</?[a-zA-Z][^>]*>", " ", s)  # só tag de verdade: "x < y" não é tag
    s = html.unescape(s).replace("\xa0", " ")  # &gt;, &lt;, &amp;, &nbsp; viram o caractere
    s = s.replace("•", " ")
    s = re.sub(r"_{3,}", " ", s)
    s = re.sub(r"\s+", " ", s)
    s = re.sub(r"\s+([,.;:!?)\]])", r"\1", s)  # "x ." vira "x."
    s = re.sub(r"([(\[])\s+", r"\1", s)
    return s.strip().lower()


pdf, patterns = sys.argv[1], sys.argv[2:]
files = [f for p in patterns for f in glob.glob(p)]
data = " ".join(io.open(f, encoding="utf-8-sig").read() for f in files)
data = re.sub(r'"\s*\+\s*\n?\s*"', "", data)   # junta strings JS concatenadas
D = norm(data, tex=True)

doc = pymupdf.open(pdf)
pages = [[norm(l) for l in p.get_text().split("\n")] for p in doc]

# cabeçalhos e rodapés corridos: a mesma linha (ignorando números) em 3 ou mais páginas
seen = {}
for i, pg in enumerate(pages):
    for l in set(pg):
        seen.setdefault(re.sub(r"\d+", "#", l), set()).add(i)
running = {k for k, v in seen.items() if len(v) >= 3 and len(k) >= 6}

lines = [l for pg in pages for l in pg if len(l) >= 6 and re.sub(r"\d+", "#", l) not in running]
miss = [l for l in lines if l.strip(" -") not in D]
# sem a numeração do começo ("3.1 ", "12. "), que no app fica em campo separado
real = [m for m in miss if re.sub(r"^\d+(\.\d+)*\.?\s+", "", m).strip() not in D]

print("arquivos:", len(files), "· linhas do PDF:", len(lines), "· ausentes:", len(real))
for m in real:
    print("  AUSENTE:", m)
