# Esquema de dados (v2)

A fonte da verdade é **`template/src/engine/types.ts`**: todo o conteúdo é
tipado, e o `tsc` acusa campo errado, alternativa faltando ou bloco
desconhecido antes de o app abrir. Este documento explica o que cada campo faz.

O motor (`src/engine`) é genérico e importa um único objeto `Content` de
`@/content` (default de `src/content/index.ts`). Tudo o que é da matéria mora
em `src/content`:

```
src/content/
  index.ts          monta o Content (não tem texto)
  meta.ts           identidade, vocabulário, capa, roteiro, legenda, rodapé
  capitulos/        c01.ts … cNN.ts + index.ts (ordem do material)
  auxiliares.ts     cases, cards, quiz, compare (separe em arquivos se crescer)
  eixos.ts          axes, axesConflict, selfCheck
  treino.ts         drillSets, drills, slotLabels, drillExam, drillInterpret
  simulado.ts       simulado | null
  mapa.ts           mapa | null
  figuras.tsx       esquemas do app (componentes React)
```

Em matéria grande vale separar o **texto transcrito** (gerado ou copiado do
PDF, "não editar sem conferir o PDF") da **montagem** (código que junta,
calcula ou acrescenta): ex. `dados/simulado-dados.ts` + `simulado.ts`.

**Import circular:** `figuras.tsx` importa `@/engine/figure-kit`, que importa
`@/engine/core`, que importa `@/content`. Por isso `main.tsx` importa
`@/engine/core` primeiro, e nenhum arquivo de `src/content` pode importar
`@/engine/core` (use os próprios dados: `axes[eixo].options…`). `import type`
de `@/engine/types` é sempre seguro.

---

## meta.ts

| Campo | Uso |
|---|---|
| `slug` | chave do `localStorage` (`<slug>.v1`). Única por matéria; **nunca mude** depois de publicar. Migrando da v1, mantenha a mesma chave e o mesmo `identifier` do Tauri: o progresso continua |
| `appTitle`, `brandTitle`, `brandSub` | janela e barra superior |
| `brandIcon` | componente do `lucide-react` (`Network`, `FlaskConical`, `Scale`, `Atom`…), importado no topo |
| `words` | vocabulário: `chapter`, `chapterShort`, `chapters`, `sections`, `sectionOne`, `sectionsRead`, `doc` (substantivo **masculino**: manual, guia), `docTab`, `compareNoun`, `rightChoices` (contagem e selo do Treino: "escolhas certas", "nomes certos"), `inChapter` (título do índice lateral do leitor; o padrão sai de `chapter`: "Neste capítulo", "Nesta parte", "Nesta unidade", "Neste trecho" para "Seção") |
| `heroEyebrow`, `heroTitle`, `heroEmphasis`, `heroLead` | capa |
| `searchHints` | sugestões da busca com o campo vazio |
| `examDate` (`"AAAA-MM-DD"`), `examDateLabel` | liga o cartão "roteiro de hoje"; `""` desliga |
| `roteiro` | `{ title, before, beforeActions, examDayNote, steps: [{ days, momento, texto, actions }] }`; ação: `{ label, view }` ou `{ label, section }` |
| `howToUse` | "Como usar este aplicativo"; `null` oculta |
| `legend` | 4 itens `{ kind, name, desc }`; o `name` vira o rótulo dos quadros no texto |
| `footerNote` | rodapé dos ajustes (procedência e ressalvas) |

---

## Capítulo e seção

```ts
const capitulo: Chapter = {
  id: "c1",        // estável para sempre; o progresso depende dele
  num: 1,          // a numeração do ORIGINAL
  title, kicker, tocDesc, page, short,
  isAnnex?: true,  // troca "Cap. N" por "Anexo"
  label?: "Apêndice A",  // rótulo próprio no lugar de "Capítulo N" / "Anexo" (capa, leitor, busca)
  badge?: "A",     // marca curta no índice lateral; padrão: o número, ou "Ax" no anexo
  tags?: [],
  intro: "HTML de abertura, ou \"\"",
  sections: [{ id: "c1-1", num: "1.1", title, blocks: [] }],
}
export default capitulo
```

`id` de seção **sempre** `<idCapitulo>-<n>`. Trecho sem número próprio no
original usa o `num` do capítulo (`"2"`).

---

## Os 20 tipos de bloco

Todo campo `html`, `text`, item de lista e célula aceita HTML inline
(`<b>`, `<em>`, `<i>`, `<br>`, `<code>`, `<mark>`) e fórmula na linha com
`\( … \)` (ou em destaque com `\[ … \]`), renderizada pelo KaTeX.

| `t` | Forma | Uso |
|---|---|---|
| `p` | `{ t: "p", html }` | parágrafo |
| `h` | `{ t: "h", text }` | subtítulo dentro da seção |
| `ul` | `{ t: "ul", items }` | lista |
| `steps` | `{ t: "steps", title?, items }` | sequência numerada |
| `table` | `{ t: "table", caption?, filterable?, variant?, cols, rows }` | toda linha com o nº de células de `cols`; `filterable` põe um filtro (anexos, gabaritos); `variant: "livre"` desenha cada célula como bloco solto (1ª coluna = rótulo da linha) |
| `cols` | `{ t: "cols", columns: [{ title?, blocks }] }` | "de um lado X, do outro Y"; empilha em tela estreita |
| `aside` | `{ t: "aside", html }` | nota lateral; citação/exemplo recuado do original |
| `callout` | `{ t: "callout", kind, title?, label?, blocks }` | destaque; `kind` = `clave` · `examen` · `lab` · `alerta`, pelo **papel** no original; `label` (HTML) troca ícone e nome da legenda pelo rótulo próprio do quadro no original ("◆ Definição") |
| `phrases` | `{ t: "phrases", items }` | frases numeradas de fechamento |
| `case` | `{ t: "case", ref }` | caso de `cases`, com perguntas em acordeão e botão para o Treino |
| `figure` | `{ t: "figure", ref, title? }` | componente de `figuras.tsx`, com a moldura "Esquema do app · não está no material"; `title` diz o que fazer com ele ("Monte a tabela-verdade de qualquer fórmula…") |
| `checklist` | `{ t: "checklist", id, items }` | caixas que ficam salvas; `id` único; item pode ser `{ id, html }` para ter chave própria |
| `mermaid` | `{ t: "mermaid", code, caption? }` | diagrama Mermaid (Beautiful Mermaid); é acréscimo do app, diga isso na legenda |
| `math` | `{ t: "math", tex, caption?, plain? }` | fórmula em destaque (KaTeX), centralizada num cartão; TeX com `String.raw`. `plain: true`: `tex` é texto (Unicode e HTML inline, `∀x (P(x) → Q(x))`) em fonte mono, sem KaTeX, como no original |
| `deriv` | `{ t: "deriv", title?, rows: [{ n, step, rule?, html, note?, tone? }] }` | derivação passo a passo (prova, simplificação, resolução), em linha do tempo: marcador com o `n`, nome do passo, regra num chip, fórmula em mono (aceita `<mark>` e `\( … \)`), nota. `tone` padrão: `n` = `0` ou uma letra → `start` (marcador vazado: fórmula de partida), `✔`/`✓` → `done` (marcador verde e fórmula emoldurada: o resultado), senão `step`. `n` pode ser largo (`"2–5"`, `"5b"`): a coluna se ajusta |
| `code` | `{ t: "code", code, lang?, title?, caption?, numbers? }` | código com realce (Shiki), botão Copiar, linhas numeradas a partir de 4 linhas (`numbers` força); `title` = nome do arquivo; trecho de uma linha sem título sai leve, sem cabeçalho; `lang: "pseudo"` realça pseudocódigo em português (se, enquanto, retorne…) |
| `codes` | `{ t: "codes", items: [{ title?, lang?, code, caption? }] }` | códigos lado a lado para comparar (o mesmo problema em estilos ou linguagens), cartões compactos de mesma altura; empilham em tela estreita |
| `diagram` | `{ t: "diagram", spec, caption?, page? }` | figura do material **redesenhada** pelo app (árvore, fluxo, cadeia, conjuntos, grafo…: ver "Quando usar `diagram`"); a legenda ganha "redesenhada da pág. N" |
| `img` | `{ t: "img", src, alt, caption?, page?, w?, h?, dark? }` | foto ou gráfico recortado do PDF, arquivo em `public/img/`; clique amplia; `dark: "papel"` mantém fundo branco no tema escuro, `"inverter"` inverte (só desenho P&B). Desenho que dá para refazer vai como `diagram` |
| `explica` | `{ t: "explica", title?, blocks }` | explicação escrita pelo app, com a moldura "Explicação do app · não está no material"; aceita qualquer bloco dentro (`figure` e `mermaid` de dentro saem sem moldura própria: a do `explica` já diz que é do app) |

Parágrafo com início em negrito no original: mantenha no `html`
(`"<b>Cuidado:</b> …"`) em vez de mover para o `title` do callout.

**Quando usar `diagram`:** toda figura do material que é desenho de caixas,
setas, regiões ou marcas. Um arquivo por figura em `src/content/diagramas/`
(`f3-1.ts` exporta `default` o bloco; o capítulo importa), o que deixa o
capítulo legível e o desenho fácil de revisar. O formato de cada `kind` está
comentado em `src/engine/diagram/types.ts`:

| `kind` | Serve para | Em tela estreita |
|---|---|---|
| `tree` | árvore sintática, de decisão, de prova (árvore E: `and`), de busca SLD (`badge` = ordem das respostas, `cut` = ramo podado), genealógica (`links` extras tracejados); rótulo da ligação em `edge` (`edgeSide` para ao lado da linha), anotação embaixo do nó em `below`, frase final em `foot` | encolhe um pouco; se faltar muito, vira sumário indentado (├ └) |
| `flow` | grade de caixas com ligações (anatomia de sistema, linha de montagem em serpentina, ciclo com retorno): `at`/`span`, `heads`, `tag` + `tagTone` (etiqueta sob a caixa), `items` (caixas dentro de outra), `sameHeight`, `route: "elbow"` (ângulos retos), `foot` (faixa de conclusão) | encolhe um pouco; senão, transposta (colunas viram linhas, setas descem) |
| `chain` | sequência de etapas/itens: `seps` (texto ou caixa, como um operador num círculo), `brackets` (chave sob um trecho), `below`, `itemW` | quebra em linhas com seta de retorno; com espaço para um item, coluna |
| `strip` | faixa ordenada de forte a fraco (precedência) | — |
| `sets` | conjuntos/regiões: elipse, caixa, moldura, uma dentro da outra (`row` = texto ao lado das de dentro), elementos em círculo (`strong` = cheio), `foot`, `below` | caixas empilham |
| `graph` | grafo com posições fixas, um ou mais painéis, laço (from = to), nó `strong` | painéis empilham |
| `groups` | um grupo com blocos separados por um operador (FND/FNC) | blocos encolhem |
| `arcs` | fichas em linha com arcos de dependência acima/abaixo | encolhe |
| `stacks` | estados com pilhas de blocos e ações entre eles | encolhe; senão, um estado embaixo do outro |
| `timeline` · `cells` · `recursion` · `dialogue` | linha do tempo · lista encadeada · chamadas que descem e valores que sobem · personagens com balões (`saysTone`) | lista vertical · quebra a linha · recuo menor · conversa em lista |

Regras: todo texto da figura, com a grafia e os símbolos do original (o
`coverage.py` precisa receber `"src/content/diagramas/*.ts"` também); nada
inventado; cor pelo papel (`tone`: `ink` escuro/principal, `accent` acento,
`ok` verdadeiro/sucesso, `bad` falso/falha, `warn` em exame/regra, `info`
conceito, `muted` podado; `strong` = cor cheia). A caixa alta vem do texto,
nunca de CSS (caixa alta mudaria `∀x P(x)` para `∀X P(X)`). Confira cada
figura com `tools/shot.mjs` (ver SKILL.md) em 828, 649 e 360 px, claro e
escuro. Se faltar recurso, acrescente uma opção genérica em
`diagram/types.ts` e no componente, documentada em comentário.

**Quando usar `img`:** foto, gráfico com dados ou desenho que a biblioteca
não consegue representar. O `figuras.txt`
do `extract-pdf.py` lista imagens e desenhos de cada página com o retângulo;
confira na `pNN.png` e recorte com
`python -X utf8 tools/crop-figure.py "material.pdf" 5 x0 y0 x1 y1 public/img/p05-nome.png`,
que imprime o bloco pronto (com `w`/`h`, que evitam salto de layout, e `page`). Texto que é texto continua transcrito:
imagem de parágrafo não é busca nem cobertura.

**Fórmulas (`math` e `\( … \)`):** TeX do KaTeX (quase todo o LaTeX de
matemática: `\frac`, `\sum`, `\int`, matrizes com `\begin{pmatrix}`, `\mathbb`).
Escreva com ``String.raw`…` `` para não dobrar as barras. Erro de sintaxe não
quebra a página: o TeX sai em vermelho e o `__check()` não acusa, então olhe a
seção. Fórmula numerada no original: o número vai na `caption` ("Equação 2.3").

**Código (`code`):** `lang` aceita `python`, `javascript`, `typescript`, `java`,
`c`, `cpp`, `csharp`, `go`, `rust`, `sql`, `bash`, `powershell`, `json`, `yaml`,
`html`, `css`, `r`, `prolog` e apelidos (`py`, `js`, `ts`, `c++`, `sh`, `pl`…); sem `lang` ou
outra linguagem sai como texto puro. Outra linguagem: acrescente uma linha em
`LANGS` de `src/engine/code.tsx` (nome do pacote `@shikijs/langs`). Escreva o
código como array de linhas com `.join("\n")` ou template literal, mantendo a
indentação do original.

**Quando usar `mermaid`:** fluxo, hierarquia ou sequência que o material
descreve em texto e fica mais claro desenhado. `flowchart LR` cabe melhor na
coluna de leitura que `TD`. Setas `-.->` tracejadas destacam o caminho
especial. Rótulos com acento ou pontuação entre aspas: `A{"1ª pergunta?"}`.

**Quando usar `explica`:** texto que **você** escreve para ensinar o trecho:
outra forma de dizer, passo a passo, intuição, notação geral, exemplo novo,
o erro que costuma derrubar nota. Vem logo **depois** do trecho transcrito
que explica, nunca no lugar dele (o texto do material continua inteiro e
fiel). A busca indexa o `explica` como o resto da seção.

---

## auxiliares.ts

```ts
export const cases: CaseItem[] = [{ id: "caso-1", label: "Caso 1", chapter: "c6", section: "c6-15",
  title: "Resumo em uma linha (texto do app)", stem: "Enunciado completo",
  questions: [{ q: "Pergunta?", a: "Resposta do material." }] }]

export const cards: Card[] = [{ id: "f1", ch: "c1", sec: "c1-1", front: "Pergunta", back: "Resposta" }]

export const quiz: QuizItem[] = [{ id: "q1", ch: "c1", sec: "c1-1", q: "Enunciado?",
  opts: ["A", "B", "C", "D"], a: 1, why: "Explicação." }]   // opts é tupla de 4: o tsc recusa 3 ou 5

export const compare: CompareData = {
  fields: [{ key: "campo1", label: "Rótulo" }],
  profiles: [{ id: "ent1", name: "Nome", ch: "c1", group: "Grupo", campo1: "valor" }],
}
```

- Caso que nenhum exercício do Treino referencia vira exercício sozinho (set
  `"casos"`): uma parte escrita por pergunta, com `a` como modelo do material.
- Fichas: SM-2 simplificado, guardado por `id` (mudar o `id` zera a ficha).
- Questões: o app embaralha as alternativas a cada rodada.
- Comparador: até 4 perfis lado a lado; campo sem dado `"—"`; `profiles: []`
  esconde a aba. A busca mostra o primeiro campo como resumo.

---

## eixos.ts

```ts
export const axes: Record<string, Axis> = {
  abordagem: { label: "Abordagem", tone: "accent",   // "accent" | "ink" | "select"
    ask: "Qual é a abordagem? Justifique.",            // pergunta padrão dos exercícios do eixo (texto do material)
    hint: "<p><b>1ª</b> …</p>",                       // "Dica" do Treino
    checks: [["ev", "…"], ["li", "…"], ["de", "…"]],  // autoavaliação própria (opcional)
    placeholder: "Escolha…", textPlaceholder: "…",
    options: [{ v: "sup", l: "Supervisionada", sec: "c3-1", skeleton: "<p>…</p>" }] },
}
export function axesConflict(ch: Record<string, string>): Html | null { return null }
export const selfCheck: [string, Html][] | null = null  // padrão: dado, raciocínio, descarte
```

Cores aceitas dentro de `skeleton`/`hint` (classes do Tailwind do projeto):
`text-clave`, `text-examen`, `text-lab`, `text-alerta`.

## treino.ts

```ts
export const drillSets: DrillSet[] = [
  { id: "guia", name: "Exercícios do guia", origin: "material" },
  { id: "objetivos", name: "Dois objetivos", origin: "app", desc: "…" },   // vai para "Extras"
]
export const drills: Drill[] = [
  { id: "ex-1", set: "guia", slot: "abordagem", case: "ex-1",
    parts: [{ axis: "abordagem", ans: "semi", alt: ["sup"], altNote: "…", model: "…" }] },
  { id: "x-1", set: "objetivos", slot: "tarefa", ch: "c7", sec: "c7-1",
    title: "…", stem: "…", ask: "…", proposal: "texto a criticar", gab: "gabarito", note: "depois da correção",
    parts: [{ label: "Objetivo A", axis: "tarefa", ans: "classificacao", model: "…" }] },
]
export const slotLabels: Record<string, string> = {}   // ex.: { formulacao: "A1 · Formulação" }
export const drillExam: DrillExam | null = { minutes: 105, title, intro,
  pick: [{ set: "guia", slot: "abordagem", n: 3 }] }       // ou [[…], […]]: composições alternativas
export const drillInterpret: DrillInterpret | null = { set: "guia", title, fn: (certos, total) => "…" }
```

Parte: `axis` (`null` = só escrita), `ans`, `alt`, `altNote`, `model`,
`text: false` (sem campo), `placeholder`, `checks` (`[]` esconde a caixa de
autoavaliação, para parte só de escolha), `fromMaterial` (etiqueta
"Resposta do material" em vez de "escrita pelo app"). Progresso gravado por
`id` do exercício e índice da parte.

`slot` vira um filtro do Treino, com o nome `slotLabels[slot]`, senão o
`label` do eixo de mesma chave, senão o próprio slot. Use `slotLabels` quando
o slot não é eixo (exercícios agrupados pelas questões de uma prova, por
exemplo); com todos os slots sendo eixos, deixe `{}`.

## simulado.ts

```ts
export const simulado: Simulado | null = {
  homeTitle, homeDesc, header: [], kicker, title, subtitle, course, note, minutes,
  intro: ["<b>…</b> …"], warning, peekConfirm,
  formFields: [{ label: "Nome", auto: "nome" }, { label, auto: "data" | "tempo" | "nota" }],
  parts: [{ title, instr, questions: [1, 2] }],
  questions: [{ n, label?: "A1 · Tema", pts: "1,0 ponto", max: 1, sec, stem: [""], blocks?: [], quote?, after?, prompt?,
    fields: [{ k: "a", label, pick?: "eixo", ans?, alt?, text: true, placeholder? }],
    gab: { head, answer?, lead?, blocks?: [], items: [] }, appNote? }],
  endNote, gabaritoTitle, gabaritoWarn, gabaritoIntro,
  scoring: { max: 10, step: 0.1, anchor: "simAuto", hint, leitura: { cols, rows, min: [9, 7, 5, 0] } },
  folha: { items: [{ t: "…", detect: (ans, { words }) => null | "frase" }] },
  sections: [{ id?, title, blocks: [ …, { t: "sim-leitura" }, { t: "sim-folha" } ] }],
}
```

`ans[n].choice[k]` e `ans[n].text[k]` guardam as respostas; `words(texto)`
conta palavras.

- `n` é a chave interna (respostas, nota, `parts`, `detect`); `label` é o
  rótulo do original e substitui o número na tela e na busca: `"A1 · Tema"`
  sai "Questão A1 · Tema (1,0 ponto)". Sem `label`: "Questão 1".
- `blocks`: blocos do manual depois dos parágrafos de `stem` (tabela a
  completar com células `""`, grafo ou árvore em `code` sem `lang`, fórmula).
  Entram na busca, como o resto do enunciado.
- `gab.blocks`: blocos do gabarito (a tabela preenchida, por exemplo),
  mostrados depois de `answer`/`lead` e antes de `items`.
- `scoring.step`: passo das notas de cada questão (padrão 0,1). Critério com
  quartos de ponto pede `0.05`; passo menor que 0,1 mostra as notas e o total
  com duas casas (0,25 · 7,75).

## figuras.tsx

```tsx
function Eixos() { return <div className="grid gap-3 md:grid-cols-2">…<Cat axis="abordagem" v="sup" />…</div> }
export const figures: Record<string, ComponentType> = { eixos: Eixos }
```

Kit em `@/engine/figure-kit`: `<Cat axis v />` chip da opção na cor do eixo ·
`<Skeleton axis v />` esqueleto da opção · `<Flow steps resultN resultQ result />`
procedimento clicável (`steps: [{ n, key, q, clears?, showIf?, opts: [{ val, label, out, note? }] }]`,
`result: (st) => ReactNode`) · `<Verdict ok>` faixa verde/vermelha ·
`<FreeTable cols rows corner? />` tabela livre (`rows: [{ head, cells: [{ content, tone?, span?, align? }] }]`,
`tone` `"ok" | "no" | "plain"`), com os atalhos `okCell(exemplo?)` e `noCell()` para matrizes ✓/×. Vale usar
qualquer componente de `@/components/ui` (Table, Badge, Card…). `H` (HTML com `\( … \)`) também sai do kit.

### Grafo

`<GraphView nodes edges w h r? directed? label? />`: nós em posições fixas
(`{ id, x, y, label?, sub?, tone? }`, de cima para baixo num viewBox `w × h`),
arestas `{ from, to, label?, tone? }` com seta (`directed={false}` tira).
`sub` é o rótulo pequeno embaixo do nó (`h=3`, `d=1`). Cor por papel:
nó `cur` (o da vez) · `next` (em exame, tracejado) · `wait` (fila, pilha,
fronteira) · `done` (já tratado) · `ok` (objetivo) · `bad` · `muted` ·
`plain`; aresta `hot` (em exame) · `ok` (caminho, árvore) · `bad` · `muted` ·
`plain`. `<GraphLegend items={[["cur", "u (retirado)"], …]} />` explica as cores.
Aresta de um nó para ele mesmo (`from === to`) vira laço sobre o nó; ida e
volta (a → b e b → a) viram dois arcos, um de cada lado.

**Simuladores da matéria** (exemplos em projetos já feitos, como o de Lógica
para Programação: tabela-verdade, laboratório de quantificadores, unificação,
motor Prolog SLD, forward chaining): a lógica do domínio fica num módulo puro
em `src/content/sims/*.ts` (testável no Node: `npx esbuild arquivo.ts --bundle
--format=esm --platform=node` e um script que importa), a interface num
`.tsx` ao lado, e `figuras.tsx` só registra (`ref` → componente). Os
resultados do simulador precisam bater com os do material: teste com os
exemplos dele antes de publicar.

### Simulador passo a passo

```tsx
type Passo = Step & { fila: string[]; u?: string }       // Step = { line?, note, stage?, tone? }
function executar(dados: Dados, variante: string): Passo[] { … }  // pura: devolve todos os passos

const CODIGO: CodeLine[] = [                               // { id, html, indent?, off? }
  { id: "loop", html: "enquanto a fila não estiver vazia:" },
  { id: "pop", html: String.raw`\(u \gets\) retira o primeiro da fila`, indent: 1 },
]

function Simulador() {
  const [v, setV] = useState("a")
  const steps = useMemo(() => executar(DADOS, v), [v])   // estável (useMemo): senão recomeça sem parar
  const sim = useStepper(steps)                          // volta ao passo 0 quando steps muda
  const cols = stageColumns(steps, sim.k, (p, live, j) => ({ head, sub, live, cells, empty }))
  return (
    <Stepper sim={sim} code={CODIGO} visual={<GraphView … />} top={<Pills label value onChange options />}>
      <StageTable columns={cols} rowHead={(r) => ({ head: String(r + 1), sub: r === 0 ? "próximo a sair" : undefined })} />
      <ChipList label="Explorados" items={sim.step.explorados} />
      <Stats items={[{ label: "Nós gerados", value: 7 }, { label: "Resultado", value: "custo 4", tone: "ok" }]} />
    </Stepper>
  )
}
```

- **Passo:** `line` é o `id` da linha do código em execução (destacada; as
  ainda não executadas ficam apagadas); `note` diz o que acontece (HTML, com
  KaTeX); `stage: true` abre uma etapa (uma volta do laço: "Próxima etapa"
  para nele, e a tabela tira um retrato); `tone` pinta a nota: `ok` (achou),
  `no` (falhou), `warn` (achou com ressalva). O resto do passo é o estado
  que as vistas desenham. Escreva cada passo com um retrato completo
  (`[...fila]`), nunca com referência ao objeto que a execução continua
  mudando.
- **`<Stepper sim code? codeTitle? mono? visual? stack? top? nextLabel?>`:**
  a vista fica ao lado do código a partir de 576 px de largura (`stack` a põe
  em cima, para vetor ou tabela larga); embaixo do código, "passo k/n" e a
  nota; depois os botões (voltar, próxima linha, próxima etapa, reproduzir,
  até o fim, recomeçar; ← e → com o foco nos botões, Shift+→ pula etapa); os
  `children` vêm por último. `mono` mostra código de verdade em fonte mono.
  `CodeLine.off` apaga uma linha que não vale nesta variante e diz por quê.
- **`stageColumns(steps, k, make, { since?, at? })`:** `at: "start"` (padrão)
  tira o retrato de cada passo que abre etapa, mais a coluna do agora (`live`)
  no meio de uma etapa: fila, pilha, fronteira. `at: "end"` dá uma coluna por
  etapa com o último passo dela até `k` (e uma para o que vem antes da
  primeira): teste de mesa. `since` recomeça as colunas (iteração nova).
- **`<StageTable columns rowHead corner? minRows? />`:** uma coluna por etapa,
  uma linha por posição ou por variável; célula `{ html, sub?, tone?, tag? }`
  com `tone` `hot` (sai, o da vez), `new` (chegou nesta etapa), `ok`, `no`,
  `muted`, e `tag` curta ("sai", "novo"). Rola na horizontal com a primeira
  coluna fixa e acompanha a última coluna.
- Peças soltas: `CodePanel`, `StepNote`, `StepControls`, `PanelLabel`,
  `Stats`, `ChipList`, `Pills`, para montar outro arranjo.
- Exemplos completos em `src/content/figuras.tsx`: `largura` (grafo + fila
  por etapa) e `binaria` (vetor em vista própria + teste de mesa).

## mapa.ts

```ts
export const mapa: Mapa | null = { title, lead, homeDesc,
  parts: [{ id: "m-1", title, src: "Seção 2", blocks: [] }] }
```

No Mapa, `figure` entra sem moldura (a aba inteira já se apresenta como condensada pelo app).

---

## O que a busca indexa

Capítulos, seções (texto de todos os blocos, células inclusive), fichas,
questões, casos, exercícios do Treino que não vêm de caso, **só os
enunciados** do simulado (parágrafos e `blocks`) e os perfis do comparador.
Insensível a acentos e caixa; resultados agrupados por destino (texto,
Treino, Simulado, Fichas, Questões, Comparador). Fórmulas TeX entram como
texto simples (`src/engine/tex-plain.ts`): `\(h(n) \le h^*(n)\)` vira
"h(n) ≤ h*(n)" no índice e no trecho mostrado no resultado.

## Estado salvo (`localStorage`, chave `<slug>.v1`)

`read`, `bookmarks`, `notes` (por id de seção), `srs` (por id de ficha),
`quiz`, `drills` (por id de exercício), `exam`, `sim`, `checks` (por
`<id da checklist>-<índice ou id do item>`), `lastChapter`, `lastView`,
`prefs`. Mesmo formato da v1: um app migrado lê o progresso antigo. Tema:
chave `<slug>.theme`.
