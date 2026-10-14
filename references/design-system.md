# Design system (v2)

Componentes do **shadcn/ui** (estilo `base-nova`, primitivas **Base UI**,
ícones **lucide**) vestidos com o visual da v1: base de **pedra quente**, **um
acento** por matéria, quatro tons semânticos, controles com folga. Tudo em
`src/index.css`; nos `.tsx`, cor sempre por token (`bg-primary`,
`text-soft-foreground`, `border-lab-line`). Valor de cor escrito à mão num
`.tsx` é erro.

## Cor

### Base e acento

Os tokens do shadcn (`--background`, `--card`, `--primary`, `--secondary`,
`--border`…) recebem a paleta da v1, em hex, em `:root` (claro) e `.dark`
(escuro). Quatro tokens a mais, com utilitários do Tailwind:

| Token | Utilitário | Uso |
|---|---|---|
| `--primary-soft` | `bg-primary-soft` | fundo de item ativo (aba, número do procedimento, chip do eixo "accent") |
| `--primary-line` | `border-primary-line`, `ring-primary-line` | borda desse item ativo |
| `--soft-foreground` | `text-soft-foreground` | texto secundário de leitura (células, opções, esqueletos) |
| `--border-strong` | `border-border-strong` | borda no hover, chip de tinta, célula × tracejada |

`--muted-foreground` fica para legendas e rótulos pequenos (mais apagado que
`--soft-foreground`).

**Escuro sem preto no preto:** degraus de cinza quente (`#161615` fundo,
`#1e1e1c` cartões, `#262624` superfícies secundárias, `#33332f` bordas). O
preto quase puro do shadcn padrão foi recusado pelo usuário.

**Um acento por matéria, numa variável só.** O acento é `--brand` (hex) no
`:root` de `src/index.css`; o template vem em petróleo (`#0f5f6b`). Todo o
resto é derivado dele com cor relativa em OKLCH, mantendo o matiz:

| Token | Claro | Escuro |
|---|---|---|
| `--primary` | o próprio `--brand`, escurecido até claridade 0,5 se for claro demais (texto branco em cima continua legível) | claridade 0,77, saturação ×1,16 (máx. 0,15): o acento **clareia** |
| `--primary-foreground` | branco | claridade 0,25 na mesma família (texto escuro sobre o acento claro) |
| `--primary-soft` | claridade 0,95, saturação ×0,18 | claridade 0,255, saturação ×0,4 |
| `--primary-line` | claridade 0,875, saturação ×0,42 | claridade 0,37, saturação ×0,62 |
| `--ring`, `--chart-1`, `--sidebar-primary*` | seguem `--primary` | idem |

Os números foram ajustados para reproduzir o petróleo feito à mão na v1
(diferença de milésimos). Para trocar o acento: `novo-projeto.ps1 -Acento`, ou
a linha `--brand` + `tools/make-icons.ps1 -Accent` com a mesma cor. Fuja de
roxo-de-IA e de bege+latão; verde-floresta, cobalto, terracota, carmim e
petróleo funcionam. Se o acento colidir com um tom semântico (verde contra
`lab`, vermelho contra `alerta`, âmbar contra `examen`), troque o acento.

### Os quatro tons semânticos

| Token | Cor | Papel no texto | Papel nos módulos |
|---|---|---|---|
| `clave` | azul | conceito-chave | resposta-modelo, gabarito |
| `examen` | âmbar | cai na prova | "aceita se argumentada", cartão do roteiro, `<mark>` da busca |
| `lab` | verde | na prática | certo, compatível, seção lida |
| `alerta` | vermelho | atenção, erro comum | errado, armadilha, proposta a criticar |

Cada um tem `text-x`, `bg-x-bg`, `border-x-line`. Não os realinhe com o
acento. No texto anotado por cores (evidência/ligação/descarte), use
`text-clave`/`text-lab`/`text-examen` **sempre com a etiqueta escrita ao
lado**: a cor nunca é a única pista.

### Mermaid (Beautiful Mermaid)

A biblioteca usa `--bg`, `--fg`, `--line`, `--accent`, `--muted`, `--surface`,
`--border` **dentro do SVG**, os mesmos nomes do shadcn: passar `var(--muted)`
direto cria referência circular (nós cinza-médio, texto some). As cores chegam
pelos apelidos `--mm-*` de `index.css` (setas no acento). Não troque por
`var(--x)` direto em `mermaid.tsx`.

## Tamanhos: nada de texto sufocado

Os componentes do shadcn foram alargados para as medidas da v1 (em
`src/components/ui/`, que são do projeto):

| Controle | Medida |
|---|---|
| `Button` padrão / `sm` / `lg` / `icon` / `icon-sm` | 40 / 36 / 44 / 40 / 36 px de altura, `px-4` / `px-3.5` / `px-5`, ícone 18 px |
| `Toggle` padrão / `sm` | 36 / 32 px |
| `Input`, `Select` | 36 px |
| aba da barra superior | `Button size="sm"`, 13,5 px, ativa em `bg-primary-soft text-primary border-primary-line` |
| chip de seleção (`chip` de `@/engine/styles`) | pílula `px-3 py-1.5`, 12,5 px; marcado vira acento cheio; **com ícone** ✓ quando marcado e + quando não (Comparador) |
| opção de resposta (`optionPill(tone)`) | pílula de 34 px, `px-3.5`, 13 px; eixo "accent" marca no acento, os outros em tinta cheia |
| aba (`Tabs`, subabas do Treino) | lista em `bg-secondary` com borda e folga de 4 px; aba ativa em `bg-card` com **texto no acento** |
| ícone dos cartões da capa, número da seção, número do procedimento | caixinha em `bg-primary-soft`, `border-primary-line`, ícone/número em `text-primary` |
| chip de categoria (`<Cat>`) | pílula `px-2.5 py-0.5`, 12,5 px semibold; "accent" em `primary-soft`, os outros em `secondary` com `border-strong` |

Botões levam ícone à esquerda do texto, como na v1 (inclusive atalhos do
roteiro e links de ação). Tudo que é clicável mostra a **mão**: regra
`cursor: pointer` global em `index.css` para `button`, `[role=tab|option|checkbox…]`,
`[cmdk-item]`, `summary`, `label` com controle e `a[href]`.

## Tabelas: duas formas

- **Normal** (bloco `table`, `<Table>` do shadcn): **sem contorno externo**,
  cabeçalho em versalete pequeno (11 px, `tracking-[.07em]`, `uppercase`)
  sobre faixa `bg-secondary`, linhas separadas por borda, células
  `px-4 py-3` com entrelinha folgada, primeira coluna em `text-foreground`.
  É o padrão para qualquer tabela do material.
- **Livre** (bloco `table` com `variant: "livre"`, ou `<FreeTable>` num
  esquema): cada célula é um bloco solto, com espaço entre elas e sem contorno
  externo. Para matrizes (`okCell(exemplo)` verde com ✓, `noCell()` tracejada
  com ×) e quadros curtos lado a lado. A 1ª coluna vira rótulo da linha; uma
  célula pode ocupar a linha inteira (`span`).

O Comparador é a exceção que fica num cartão com borda (colunas largas e
coluna de campos fixa à esquerda).

## Fórmulas e código

- Fórmula em destaque: cartão `bg-card` com borda e raio de 14 px, fórmula
  centralizada, legenda pequena embaixo (como as figuras). Na linha, o KaTeX
  segue o tamanho do texto (1,08 em).
- Fórmula escrita como texto (`math` com `plain` e a fórmula do `deriv`):
  classe `formula-font` de `src/engine/formula.css`, letras na mono e setas
  da Cambria Math / Segoe UI Symbol do Windows (a Consolas desenha → e ↔
  minúsculas). Fica fora do `index.css`, que muda por matéria.
- Derivação (`deriv`): linha do tempo, num cartão com o título numa faixa
  `bg-secondary` (como o código). Marcador redondo por passo, ligado ao
  seguinte por um fio: partida vazada, passo no acento suave
  (`primary-soft`), resultado em verde cheio. A partir de `sm`, três colunas
  (marcador · passo com a regra num chip mono · fórmula), com as fórmulas
  alinhadas umas sob as outras; abaixo de `sm`, o passo fica em cima da
  fórmula. A fórmula do resultado sai emoldurada em `lab-bg`.
- Código: cartão com faixa de cabeçalho `bg-secondary` (nome do arquivo ou da
  linguagem em mono, botão **Copiar** com ícone), corpo em `font-mono` 13 px,
  números de linha apagados à esquerda, rolagem horizontal dentro do cartão.
  Cores do realce: GitHub claro/escuro, pela classe `.dark`.

## Simulador passo a passo (`@/engine/stepper`, `@/engine/graph-view`)

- Vista (grafo, vetor) à esquerda e código à direita a partir de 576 px de
  largura do bloco (container query `@xl`); abaixo, empilhados. `stack` põe
  uma vista larga em cima.
- Código: cartão `bg-card`, linhas numeradas em mono pequeno; a linha da vez
  em `bg-primary-soft` com filete `border-l-primary` de 3 px; linhas ainda
  não executadas a 45 % de opacidade; recuo de 0,9 rem por nível, e a linha
  longa quebra alinhada ao próprio texto.
- Nota do passo: faixa `bg-secondary` com "passo k/n" em mono; o tom pinta a
  faixa (`lab` achou, `alerta` falhou, `examen` com ressalva).
- Botões `size="sm"`, ícone à esquerda; só "Próxima linha" é cheio (acento)
  e leva a seta à direita; "Recomeçar" é `ghost`.
- Grafo: nó da vez cheio no acento, em exame tracejado em `primary-soft`,
  aguardando em âmbar (`examen`), já tratado em `secondary`, objetivo em
  verde; aresta em exame no acento, caminho/árvore do resultado em verde.
  Sempre com `GraphLegend`.
- Tabela por etapa: bordas separadas (não `collapse`), para a borda da
  primeira coluna, fixa, acompanhar a rolagem; coluna do agora em
  `primary-soft`; célula que sai com etiqueta "sai" no acento, a que chegou
  com "novo" em âmbar.
- Números (`Stats`): caixinhas `bg-secondary`, rótulo em versalete 10,5 px,
  valor em mono 15 px; de 2 a 4 por linha conforme a largura.

## Tipografia

- **Geist Variable**: interface e títulos
- **Source Serif 4 Variable**: modo de leitura opcional, ligado nos ajustes
- `font-mono` para números, seções e rótulos técnicos

Fontes do npm, embutidas pelo Vite: nada de CDN. A Beautiful Mermaid injeta um
`@import` do Google Fonts no SVG; `mermaid.tsx` remove.

## Leitura

Fonte, tamanho (14–22 px), entrelinha e largura da coluna nos ajustes viram
`--read-font`, `--read-size`, `--read-lh`, `--read-measure` no `<html>`;
`.prose-manual` os respeita. Não fixe tamanho de fonte dentro da prosa.

## Forma e movimento

Raios da v1: cartões e painéis 14 px (`rounded-[14px]`), controles 10 px
(`rounded-[10px]`), chips em pílula. Transições do shadcn e `tw-animate-css`;
ficha vira em 0,55 s; `prefers-reduced-motion` desliga. Nenhum loop infinito.

## Layout

- Barra superior de 60 px em `bg-card/90` com desfoque; rótulos das abas a
  partir de `xl` (1280 px), abaixo só ícones com `Tooltip`; abaixo de `md`
  (768 px) as abas descem para uma barra inferior. Aba nova: meça transbordo
  em 1280 e 1380 px.
- Índice do leitor em `bg-sidebar` (292 px) a partir de `lg`; abaixo, `Sheet`.
- `<main id="main">` é o contêiner que rola: use `scrollMainTo(el, offset)`.
- Tabela larga rola dentro do próprio contêiner, nunca a página.
- Título de seção longo quebra (`min-w-0` + `overflow-wrap:anywhere`).

## Armadilhas já pagas

- **`dark:bg-…` vencendo o estado marcado:** uma classe `dark:` no controle
  tem a mesma especificidade de `data-pressed:` e ganhou pela ordem: o chip
  marcado ficou sem fundo no escuro. Não ponha `dark:bg-*` em chip/opção.
- **Título flex empurrando botões:** filho `flex-1` sem `min-w-0` estoura 375 px.
- **Toggle escolhido apagado depois de corrigir:** `optionPill` já traz
  `data-pressed:disabled:opacity-100`.
- **Margem de `li` dentro do texto:** `.prose-manual li` (fora de camada)
  vence qualquer utilitário do Tailwind; componente com `<li>` que precisa
  encostar no vizinho (o fio do `deriv`) usa `my-0!`.
