# Componentes (shadcn/ui com Base UI) e bibliotecas

Só entram no template os componentes do shadcn que o app **usa**, ou que
substituem algo que a v1 fazia à mão com resultado pior. Para acrescentar outro:

```bash
npx shadcn@latest add <nome>
```

O `components.json` já aponta para o estilo `base-nova` (primitivas Base UI) e
para os aliases `@/components/ui`, `@/lib/utils`. O arquivo cai em
`src/components/ui/` e é **seu**: pode editar. Os do template já foram
editados (alturas e folgas maiores, `cursor-pointer`, tabela sem contorno com
cabeçalho em versalete; ver design-system.md). Componente novo: ajuste as
alturas da mesma forma antes de usar.

## O que está instalado e onde é usado

| Componente | Onde | Substituiu da v1 |
|---|---|---|
| `button` | tudo | `.btn` |
| `card` | capa, fichas, questões, treino, simulado | `.card`, `.panel` |
| `badge` | chips de eixo (`Cat`), número da seção, etiquetas | `.cat`, `.pill` |
| `tabs` | subabas do Treino | abas feitas à mão |
| `dialog` | ampliar imagem (`img`) | (novo) |
| `alert-dialog` | `useConfirm()`: entregar prova, apagar progresso, ver gabarito | `window.confirm()` |
| `sheet` | ajustes de leitura, índice do leitor em tela estreita | gaveta feita à mão |
| `command` (cmdk) | busca global Ctrl K, com grupos por destino | lista de busca feita à mão |
| `select` | baralho das fichas, conteúdo das questões, eixo `tone: "select"`, nota do simulado | `<select>` nativo |
| `checkbox` | autoavaliação, lista de conferência | `<input type=checkbox>` |
| `progress` | progresso de leitura, placar | barras em CSS |
| `slider` | tamanho, entrelinha, largura; nº de questões | `<input type=range>` |
| `toggle-group` / `toggle` | opções de eixo, filtros, comparador, tema, ferramentas da seção | botões com `aria-pressed` à mão |
| `accordion` | perguntas de um caso | `<details>` |
| `tooltip` | ícones da barra, ferramentas da seção | atributo `title` |
| `table` | bloco `table`, comparador, esquemas | `<table>` com CSS próprio |
| (próprio) `FreeTable` em `@/engine/free-table` | tabela livre: bloco `table` com `variant: "livre"`, matrizes dos esquemas | `table.mx` da v1 |
| `input`, `input-group`, `textarea`, `label` | filtro de tabela, respostas, nome no simulado | campos nativos |
| `separator`, `kbd` | ajustes, atalhos | |
| `sonner` | avisos curtos ("salvo nos marcadores", "no máximo quatro") | (novo) |

Classes compartilhadas em `@/engine/styles`: `chip` (pílula de seleção do
Comparador e dos filtros do Treino) e `optionPill(tone)` (opção de resposta do
Treino e do Simulado). Use-as em vez de repetir classes.

`theme-provider.tsx` (claro, escuro, sistema; tecla **D** alterna) vem do
scaffold do shadcn para Vite. O `sonner.tsx` gerado importa `next-themes`:
troque por `useTheme` de `@/components/theme-provider` (o template já está
trocado; `next-themes` não é dependência).

## Base UI: diferenças que já custaram tempo

A API é a do Base UI, não a do Radix:

- **`render` em vez de `asChild`:** `<TooltipTrigger render={<Button … />}>ícone</TooltipTrigger>`.
  Mesma coisa em `DialogTrigger`, `SheetTrigger`.
- **ToggleGroup:** `value` é **sempre array** (`string[]`), `onValueChange(v: string[])`;
  seleção múltipla com a prop `multiple`. Um só valor: `value={x ? [x] : []}`,
  `onValueChange={(v) => set(v[0] ?? "")}`.
- **Toggle:** `pressed` / `onPressedChange`. Estado marcado sai em
  `data-pressed` (estilize com `data-pressed:bg-primary`).
- **Select:** passe `items` (lista `{ value, label }`) para o gatilho mostrar o
  rótulo, não o valor; `onValueChange(v: T | null)`.
- **Accordion:** `multiple` e `value` em array.
- **Slider:** `value` em array; `onValueChange(v: number | readonly number[])`.
- **Card** aceita `size="sm"`.
- **CommandDialog** (cmdk) precisa de um `<Command shouldFilter={false}>`
  dentro quando o filtro é seu (o nosso índice pontua e agrupa).

## KaTeX (fórmulas)

`katex` desenha TeX em HTML+MathML, sem `eval` e com as fontes no pacote (o
Vite copia `katex/dist/fonts`). `src/engine/math.tsx` exporta `renderTex`,
`withMath` (troca `\( … \)` e `\[ … \]` dentro de um HTML; o `<H>` já chama) e
`MathBlock`. Erro de sintaxe vira o TeX em vermelho (`throwOnError: false`).

## Shiki (código)

`shiki/core` com o **motor JavaScript** (`shiki/engine/javascript`): o motor
padrão usa WebAssembly, que a CSP do Tauri bloqueia sem `wasm-unsafe-eval`. O
destacador e cada linguagem são carregados sob demanda (um pedaço por
linguagem, de 20 a 70 kB). Temas `github-light` e `github-dark` com
`defaultColor: false`: cada trecho traz `--shiki-light` e `--shiki-dark`, e o
CSS escolhe pelo tema, sem redesenhar. O fundo é o cartão do app.

## Beautiful Mermaid (Craft)

`beautiful-mermaid` desenha Mermaid como SVG **sem `eval`** (passa na CSP do
Tauri) e com cores em variáveis CSS. É ESM e traz o ELK (~1,6 MB): por isso
`src/engine/mermaid.tsx` só a importa (`import()`) quando um bloco `mermaid`
aparece, e o Vite separa num pedaço próprio. Opções em `OPTS`:
`bg/fg/line/accent/muted/surface/border` pelos apelidos `--mm-*`
(ver design-system.md), `font: "Geist Variable"`, `transparent: true`,
`padding: 16`. Tipos suportados: flowchart, sequence, state, class, ER, xychart.

## Outras dependências

| Pacote | Para quê |
|---|---|
| `react` 19, `react-dom` | interface |
| `vite` 8 + `@vitejs/plugin-react` | servidor de desenvolvimento e build |
| `tailwindcss` 4 + `@tailwindcss/vite`, `tw-animate-css` | estilos |
| `@base-ui/react` | primitivas acessíveis dos componentes |
| `cn` | `cn()` para juntar classes (reexportado em `@/lib/utils`) |
| `class-variance-authority` | variantes dos componentes |
| `lucide-react` | ícones (inclusive `meta.brandIcon`) |
| `cmdk`, `sonner` | busca e avisos |
| `katex` | fórmulas |
| `shiki` | realce de código |
| `@fontsource-variable/geist`, `@fontsource-variable/source-serif-4` | fontes embutidas |
| `shadcn` | CLI e o `shadcn/tailwind.css` importado em `index.css` |

Nada de roteador: o app é uma janela só; a navegação é o estado de
`@/engine/nav` (`useNav().go({ view, chapter?, section?, focus?, simFocus?, profile? })`).
