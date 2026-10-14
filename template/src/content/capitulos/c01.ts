/* CAPÍTULO DE EXEMPLO: mostra os 18 tipos de bloco. Apague quando escrever os capítulos reais,
   ou use como molde. Esquema completo: references/esquema-de-dados.md e src/engine/types.ts.
   Texto do material: transcrito na íntegra, sem resumir nem "melhorar". */
import type { Chapter } from "@/engine/types"

const capitulo: Chapter = {
  id: "c1", // c1, c2… estável: nunca renomear
  num: 1,
  title: "Título do capítulo",
  kicker: "Uma linha explicando o recorte do capítulo",
  tocDesc: "Resumo curto para o índice lateral e para os cartões da capa",
  page: 3, // página no PDF de origem
  short: "Apelido curto",
  tags: ["Tema", "Outro tema"],
  intro: "Parágrafo de abertura em HTML. Aceita <b>negrito</b>, <em>itálico</em> e <i>termos técnicos</i>.",
  sections: [
    {
      id: "c1-1", // SEMPRE <idCapitulo>-<n>: o progresso salvo depende disso
      num: "1.1", // numeração do ORIGINAL
      title: "Texto corrido, listas e subtítulos",
      blocks: [
        { t: "p", html: "Parágrafo simples. O HTML inline é permitido e esperado." },
        { t: "h", text: "Subtítulo dentro da seção" },
        { t: "ul", items: ["Item de lista com <b>termo em destaque</b>.", "Outro item."] },
        { t: "aside", html: "<b>Curiosidade:</b> nota lateral discreta, para observações do texto original." },
      ],
    },
    {
      id: "c1-2", num: "1.2", title: "Tabelas e passos numerados",
      blocks: [
        {
          t: "table",
          caption: "Legenda opcional",
          filterable: false, // true acrescenta um filtro por linha (use em anexos e gabaritos)
          cols: ["Coluna A", "Coluna B"],
          rows: [
            ["Valor", "Descrição"],
            ["Valor", "Descrição"],
          ],
        },
        // Tabela livre: cada célula é um bloco solto, sem contorno externo. A 1ª coluna vira o rótulo da linha.
        // Boa para quadros curtos lado a lado; para matriz com ✓/× use <FreeTable> num esquema (figuras.tsx).
        {
          t: "table",
          variant: "livre",
          cols: ["", "Coluna A", "Coluna B"],
          rows: [
            ["Linha 1", "Texto curto", "Outro texto curto"],
            ["Linha 2", "Texto curto", "Outro texto curto"],
          ],
        },
        { t: "steps", title: "Sequência opcional", items: ["Primeiro passo.", "Segundo passo.", "Terceiro passo."] },
      ],
    },
    {
      id: "c1-3", num: "1.3", title: "Colunas, destaques, casos, esquemas e explicações",
      blocks: [
        { t: "cols", columns: [
          { title: "Coluna esquerda", blocks: [{ t: "ul", items: ["Um", "Dois"] }] },
          { title: "Coluna direita", blocks: [{ t: "ul", items: ["Três", "Quatro"] }] },
        ] },

        // Os quatro tipos de destaque: escolha pelo PAPEL do quadro no original, não pela cor.
        { t: "callout", kind: "clave", title: "Conceito-chave", blocks: [{ t: "p", html: "A ideia central que sustenta o resto do tema." }] },
        { t: "callout", kind: "examen", title: "Cai na prova", blocks: [{ t: "ul", items: ["Dado que costuma ser cobrado."] }] },
        { t: "callout", kind: "lab", title: "Na prática", blocks: [{ t: "p", html: "Procedimentos, critérios, aplicação." }] },
        { t: "callout", kind: "alerta", title: "Atenção", blocks: [{ t: "p", html: "Erro frequente ou situação crítica." }] },
        // label: o rótulo próprio do quadro no original substitui ícone e nome da legenda (a cor segue o kind)
        { t: "callout", kind: "clave", label: "◆ Definição", title: "Nome do conceito", blocks: [{ t: "p", html: "Quadro que o original já rotula por conta própria." }] },

        // Caso de casos.ts (ganha o botão "Responder por escrito no Treino")
        { t: "case", ref: "caso-1" },

        // Esquema do app registrado em figuras.tsx. Sai com a moldura "Esquema do app · não está no material".
        { t: "figure", ref: "exemplo" },

        // Diagrama Mermaid (Beautiful Mermaid). Também é acréscimo do app: diga isso na legenda.
        { t: "mermaid", caption: "Esquema do app: o procedimento em forma de fluxograma", code: [
          "flowchart LR",
          '  A{"Primeira pergunta?"} -->|sim| B[Tipo A]',
          '  A -->|não| C{"Segunda pergunta?"}',
          "  C -->|sim| D[Tipo B]",
          "  C -->|não| E[Tipo C]",
        ].join("\n") },

        // Explicação escrita pelo app (outra forma de dizer, passo a passo, intuição), sempre DEPOIS do texto
        // transcrito, nunca no lugar dele. Sai com a moldura "Explicação do app · não está no material";
        // aceita qualquer bloco dentro (p, ul, steps, table, math, figure…).
        { t: "explica", title: "O mesmo procedimento, em outras palavras", blocks: [
          { t: "p", html: "Texto do app que reexplica o trecho acima com outras palavras." },
          { t: "steps", items: ["Responda à primeira pergunta: se for sim, é o tipo A.", "Se for não, a segunda pergunta separa o tipo B do tipo C."] },
        ] },

        // Figura recortada do PDF (arquivo em public/img/). dark: "papel" mantém fundo branco no tema escuro;
        // "inverter" inverte as cores (só para desenho em preto e branco).
        { t: "img", src: "img/exemplo.svg", alt: "Descrição da figura para leitor de tela", caption: "Figura 1.1 do material", page: 4, w: 480, h: 200, dark: "papel" },
      ],
    },
    {
      id: "c1-4", num: "1.4", title: "Frases de fechamento e lista de conferência",
      blocks: [
        // Numera sozinho; bom para o anexo de revisão
        { t: "phrases", items: ["Primeira frase para levar para a prova.", "Segunda frase."] },

        // Caixas que ficam salvas. `id` único: é a chave do progresso. Itens podem ter id próprio: { id, html }.
        { t: "checklist", id: "c1-lista", items: ["Primeiro item a conferir.", "Segundo item."] },
      ],
    },
    {
      id: "c1-5", num: "1.5", title: "Fórmulas e código",
      blocks: [
        // Fórmula na linha: \( … \) dentro de qualquer texto. Use String.raw`…` para não dobrar as barras do TeX.
        { t: "p", html: String.raw`A média de \(n\) valores é \(\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i\), e a variância mede o quanto eles se afastam dela.` },

        // Fórmula em destaque (bloco próprio). Também funciona \[ … \] dentro de um parágrafo.
        { t: "math", tex: String.raw`s^2 = \frac{1}{n-1}\sum_{i=1}^{n}\left(x_i - \bar{x}\right)^2`, caption: "Equação 1.1 · variância amostral" },

        // plain: fórmula escrita em texto (Unicode, HTML inline) e mostrada em fonte mono, como no original, sem KaTeX
        { t: "math", plain: true, tex: "∀x (P(x) → Q(x))", caption: "Fórmula em texto · plain: true" },

        // Derivação passo a passo. n "0" ou uma letra = partida; "✔"/"✓" = resultado; o resto, passos. tone força o tom.
        { t: "deriv", title: "Simplificação passo a passo", rows: [
          { n: "0", step: "Fórmula de partida", html: "¬(p ∧ ¬q)" },
          { n: "1", step: "De Morgan", rule: "¬(A ∧ B) ≡ ¬A ∨ ¬B", html: "¬p ∨ ¬¬q" },
          { n: "2", step: "Dupla negação", rule: "¬¬A ≡ A", html: "¬p ∨ q", note: "Nota opcional sobre o passo." },
          { n: "✔", step: "Resultado", html: "p → q", note: "Equivalência condicional: ¬p ∨ q ≡ p → q." },
        ] },

        // Código com realce. lang: python, javascript, typescript, java, c, cpp, csharp, go, rust, sql, bash,
        // powershell, json, yaml, html, css, r, prolog (outros: acrescente em src/engine/code.tsx). Sem lang: texto puro.
        { t: "code", lang: "python", title: "media.py", caption: "Listagem 1.1 do material", code: [
          "def media(valores):",
          "    \"\"\"Média aritmética de uma lista não vazia.\"\"\"",
          "    return sum(valores) / len(valores)",
          "",
          "print(media([4, 8, 15, 16, 23, 42]))  # 18.0",
        ].join("\n") },
        { t: "code", lang: "sql", code: "SELECT curso, AVG(nota) AS media\nFROM provas\nGROUP BY curso;" },
      ],
    },
    {
      id: "c1-6", num: "1.6", title: "Algoritmos passo a passo",
      blocks: [
        { t: "p", html: "Algoritmo que o material executa (busca, ordenação, um procedimento com laço) é transcrito como texto e código; o simulador do app vem depois, com o código avançando linha a linha junto com o desenho da execução." },
        // Simuladores de figuras.tsx (exemplos 4 e 5): saem com a moldura "Esquema do app · não está no material".
        { t: "figure", ref: "largura" },
        { t: "figure", ref: "binaria" },
      ],
    },
  ],
}

export default capitulo
