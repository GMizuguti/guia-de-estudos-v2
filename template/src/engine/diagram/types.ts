/* Diagramas declarativos: figuras do material redesenhadas em HTML + SVG, com as cores do tema (claro e
   escuro), texto pesquisável e sem imagem. O conteúdo descreve o desenho (nós, ligações, rótulos); o
   motor calcula a posição e desenha. Bloco: { t: "diagram", spec, caption?, page? }.

   Cor por PAPEL, nunca por matéria:
     plain  neutro (cartão)               soft   destaque leve (acento suave)
     accent destaque forte (acento cheio)  ink    caixa escura (tinta: o "motor", a consulta)
     ok     verde (verdadeiro, fato, sucesso)          bad   vermelho (falso, falha, erro)
     warn   âmbar (em exame, regra, atenção)           info  azul (conceito, definição)
     muted  apagado e tracejado (descartado, podado)   note  sem caixa: texto solto do desenho */
import type { Html } from "../types"

export type DTone = "plain" | "soft" | "accent" | "ink" | "ok" | "bad" | "warn" | "info" | "muted" | "note"
/** Cor de uma ligação: plain (neutra) · accent · ok · bad · warn · info · muted (fina e apagada). */
export type ETone = "plain" | "accent" | "ok" | "bad" | "warn" | "info" | "muted"
export type Side = "top" | "bottom" | "left" | "right"

/** Caixa de um diagrama: rótulo principal (HTML, aceita <code> e \( … \)), linha fina em cima (eyebrow,
 *  versalete), linha de baixo (sub), forma e cor. `mono`: rótulo em fonte de fórmula/código. */
export interface DBox {
  label?: Html
  eyebrow?: Html
  sub?: Html
  tone?: DTone
  shape?: "box" | "pill" | "circle"
  mono?: boolean
  /** marcador redondo no canto (ordem das respostas: "1", "2"…), em âmbar */
  badge?: string
  /** largura máxima em rem (padrão 15) */
  maxW?: number
  /** largura mínima em rem (caixas irmãs do mesmo tamanho, mesmo com textos curtos) */
  minW?: number
  /** tamanho do rótulo: xs (11,5 px, margem menor: árvores densas), sm (12,5 px), padrão (13,5 px),
   *  lg (17 px, para fichas e símbolos) */
  size?: "xs" | "sm" | "lg"
  /** cor cheia do papel, com texto contrastante (operador em destaque, resultado final) */
  strong?: boolean
}

/** Ligação entre dois nós (pelos ids). Lado de saída e de chegada automáticos (pela posição relativa),
 *  ou fixos. `bend`: curva para o lado (-1…1, + = à esquerda de quem anda de `from` para `to`).
 *  `cut`: ramo podado (tracejado vermelho com tesoura). `arrow: false` tira a seta. */
export interface DEdge {
  from: string
  to: string
  label?: Html
  tone?: ETone
  dash?: boolean
  arrow?: boolean
  fromSide?: Side
  toSide?: Side
  bend?: number
  cut?: boolean
  /** onde fica o rótulo ao longo da ligação (0 = início, 1 = fim; padrão 0,5) */
  at?: number
  /** rótulo em cima da linha (padrão) ou ao lado: acima, abaixo, à esquerda, à direita (não cobre a seta) */
  labelSide?: "on" | "above" | "below" | "left" | "right"
  /** onde a ligação encosta ao longo do lado de saída / de chegada (0 a 1; 0,5 = no meio), para não
   *  chegar no mesmo ponto que outra seta */
  fromAt?: number
  toAt?: number
  /** forma desta ligação, se diferente das demais (ex.: arco curvo numa árvore de linhas retas) */
  route?: "curve" | "straight" | "elbow"
}

/** Item de legenda: amostra da cor do papel (ou de uma ligação cheia/tracejada, na cor `edgeTone`) + texto. */
export interface DLegend { tone: DTone | "edge" | "dash"; edgeTone?: ETone; label: Html }

/* ---------------- árvore ---------------- */

/** Nó de árvore. O rótulo da ligação que CHEGA neste nó vem em `edge` (e seu estilo em edgeTone, edgeDash,
 *  cut). `and`: arco tracejado ligando as ligações dos filhos ("todas as submetas", árvore E). */
export interface TreeNode extends DBox {
  id?: string
  edge?: Html
  edgeTone?: ETone
  edgeDash?: boolean
  /** rótulo da ligação ao lado da linha (à direita, à esquerda…) em vez de em cima dela */
  edgeSide?: DEdge["labelSide"]
  cut?: boolean
  and?: boolean
  /** anotação embaixo da caixa, fora dela (ex.: a substituição θ obtida) */
  below?: Html
  children?: TreeNode[]
}

export interface TreeSpec {
  kind: "tree"
  root: TreeNode
  /** forma das ligações: curva (padrão), reta ou cotovelo */
  edges?: "curve" | "straight" | "elbow"
  /** seta na ponta das ligações (padrão: sim) */
  arrows?: boolean
  /** ligações extras, fora da hierarquia (ex.: as deduzidas, tracejadas) */
  links?: DEdge[]
  /** largura mínima de cada folha em rem (padrão 8,5): abaixo disso, a árvore vira sumário indentado */
  leafW?: number
  /** tela estreita demais para as folhas lado a lado: "outline" (padrão; sumário indentado com fios ├ └)
   *  ou "scroll" (mantém o desenho e rola na horizontal) */
  narrow?: "outline" | "scroll"
  legend?: DLegend[]
  /** frase embaixo da árvore (a conclusão da figura) */
  foot?: Html
}

/* ---------------- fluxo em grade ---------------- */

/** Nó de um fluxo, numa grade de `cols` colunas (posição `at` = [coluna, linha], a partir de 1).
 *  `items`: caixas empilhadas dentro deste nó (um grupo, como a "Base de Conhecimento" com fatos e
 *  regras); cada item tem id próprio e pode receber ligações. `tag`: etiqueta embaixo da caixa. */
export interface FlowNode extends DBox {
  id: string
  at: [number, number]
  span?: [number, number]
  /** etiqueta embaixo da caixa (a forma obtida numa estação, um rótulo de saída) */
  tag?: Html
  /** cor da etiqueta (padrão: neutra) */
  tagTone?: DTone
  items?: (DBox & { id?: string })[]
  /** alinhamento na célula (padrão: centro) */
  align?: "start" | "center" | "end" | "stretch"
}

export interface FlowSpec {
  kind: "flow"
  cols: number
  /** tela estreita demais para a grade: "transpose" (padrão; colunas viram linhas e as ligações descem,
   *  se a transposta couber) ou "scroll" (mantém a grade e rola na horizontal) */
  narrow?: "transpose" | "scroll"
  /** caixas da mesma linha com a mesma altura (estações de uma linha de montagem) */
  sameHeight?: boolean
  /** forma das ligações: curva (padrão), reta ou em ângulo reto (cotovelo, para ciclos e retornos) */
  route?: "curve" | "straight" | "elbow"
  /** caixa embaixo da grade inteira (uma faixa de conclusão: "ponto fixo: o processo para") */
  foot?: DBox
  /** títulos das colunas, numa linha acima de tudo ("ENTRADA", "SAÍDA") */
  heads?: (Html | null)[]
  nodes: FlowNode[]
  edges: DEdge[]
  /** largura mínima de cada coluna em rem (padrão 9): abaixo disso, rola na horizontal */
  colW?: number
  /** folga entre linhas em rem (padrão 2,5; aumente quando houver rótulo em ligação vertical) */
  rowGap?: number
  colGap?: number
  legend?: DLegend[]
}

/* ---------------- cadeia ---------------- */

/** Sequência em linha (etapas, unidades, um encadeamento). Quando não cabe numa linha, quebra em linhas
 *  equilibradas (6 itens: 3 + 3), ligadas por uma seta de retorno; com espaço para um item só, vira coluna.
 *  `seps`: o que vai entre um item e o seguinte (padrão: seta): texto curto como "⇒", ou uma caixa (um
 *  operador num círculo: `{ label: "∧", tone: "warn", strong: true }`; a forma padrão aí é círculo). */
export interface ChainSpec {
  kind: "chain"
  items: (DBox & { below?: Html })[]
  seps?: (Html | DBox | null)[]
  /** chave embaixo de um trecho de itens, com um texto (ex.: itens 0 a 1, "atômicas + operador") */
  brackets?: { from: number; to: number; label: Html }[]
  /** nota embaixo de todos os itens */
  foot?: Html
  /** largura mínima confortável de cada item, em rem (padrão 7,5): decide quantos cabem lado a lado */
  itemW?: number
  /** a partir de que largura (rem) fica tudo numa linha (padrão: itemW × número de itens) */
  rowFrom?: number
  /** false: em vez de quebrar em várias linhas, vira coluna direto */
  wrap?: boolean
}

/* ---------------- faixa ordenada ---------------- */

/** Itens em ordem numa faixa que vai de forte a fraco (precedência, intensidade). */
export interface StripSpec {
  kind: "strip"
  items: Html[]
  from?: Html
  to?: Html
  mono?: boolean
}

/* ---------------- conjuntos ---------------- */

/** Elemento de um conjunto: um círculo com rótulo (pode ser vazio) e cor. */
/** Elemento de um conjunto (círculo). `strong`: cor cheia (o elemento que satisfaz, em destaque). */
export interface SetItem { label?: Html; tone?: DTone; strong?: boolean }

/** Região: elipse ou caixa com título, texto, elementos soltos e regiões dentro (diagrama de Euler). */
export interface SetRegion {
  title?: Html
  sub?: Html
  /** fórmula (fonte de fórmula) logo abaixo do título */
  html?: Html
  tone?: DTone
  shape?: "ellipse" | "box" | "frame"
  items?: SetItem[]
  children?: SetRegion[]
  /** frase dentro da região, embaixo dos elementos */
  foot?: Html
  /** texto (título, sub, fórmula) de um lado e as regiões de dentro do outro, em vez de empilhados */
  row?: boolean
  /** texto embaixo da região, fora dela */
  below?: Html
  /** cor cheia (região dentro de outra do mesmo papel, como "válidas" dentro de "satisfatíveis") */
  strong?: boolean
}

export interface SetsSpec {
  kind: "sets"
  regions: SetRegion[]
  legend?: DLegend[]
}

/* ---------------- grafo ---------------- */

/** Nó de grafo: círculo de raio `r` (padrão 22) em (x, y). `strong`: cor cheia (o destaque da figura). */
export interface GNode { id: string; x: number; y: number; label?: string; tone?: DTone; r?: number; strong?: boolean }
export interface GEdge { from: string; to: string; label?: string; tone?: ETone; dash?: boolean }

/** Um ou mais grafos lado a lado, com posições fixas num viewBox w × h (aresta de um nó para ele mesmo
 *  vira laço). */
export interface GraphSpec {
  kind: "graph"
  panels: { title?: Html; sub?: Html; below?: Html; tone?: DTone; w: number; h: number; nodes: GNode[]; edges: GEdge[]; directed?: boolean }[]
}

/* ---------------- grupos ---------------- */

/** Um grande grupo (OU externo) com blocos dentro (E), separados por um operador; cada bloco lista itens. */
export interface GroupsSpec {
  kind: "groups"
  title?: Html
  tone?: DTone
  op?: Html
  blocks: { title?: Html; items: Html[]; tone?: DTone }[]
  mono?: boolean
}

/* ---------------- arcos de dependência ---------------- */

/** Fichas em linha com arcos de uma para outra(s), acima ou abaixo, com rótulo (quem depende de quem). */
export interface ArcsSpec {
  kind: "arcs"
  /** `strong`: ficha em cor cheia */
  tokens: { label: Html; tone?: DTone; strong?: boolean }[]
  arcs: { from: number; to: number | number[]; side?: "top" | "bottom"; label?: Html; tone?: ETone }[]
  mono?: boolean
}

/* ---------------- pilhas de blocos ---------------- */

/** Estados lado a lado, cada um com pilhas de blocos sobre uma mesa; ação entre um estado e o seguinte. */
export interface StacksSpec {
  kind: "stacks"
  states: { stacks: string[][]; caption?: Html }[]
  actions?: (Html | null)[]
  /** cor de cada bloco pelo rótulo ({ A: "info", B: "warn" }) */
  tones?: Record<string, DTone>
}

/* ---------------- linha do tempo ---------------- */

export interface TimelineSpec {
  kind: "timeline"
  events: { when: Html; title: Html; sub?: Html; highlight?: boolean }[]
}

/* ---------------- células encadeadas ---------------- */

/** Lista encadeada: cada célula é "valor | ponteiro" para a seguinte; termina em `end`. */
export interface CellsSpec {
  kind: "cells"
  cells: { value: Html; tone?: DTone }[]
  end?: Html
  /** rótulos embaixo das duas partes da célula ("Head", "Tail→"), mostrados nas primeiras `labelCount` */
  labels?: [Html, Html]
  labelCount?: number
  foot?: Html
}

/* ---------------- recursão ---------------- */

/** Chamadas que descem até o caso base e valores que sobem: cada nível uma chamada e o seu resultado. */
export interface RecursionSpec {
  kind: "recursion"
  frames: { call: Html; result?: Html }[]
  /** a última chamada (o caso base), destacada */
  base: Html
  foot?: Html
}

/* ---------------- diálogo ---------------- */

/** Personagens em linha com balões de fala acima (`says`, na cor `saysTone`) e, ao lado, um balão
 *  tracejado (`aside`: resposta inaudível, pensamento). */
export interface DialogueSpec {
  kind: "dialogue"
  actors: { name?: Html; mark?: Html; tone?: DTone; says?: Html; saysTone?: DTone; aside?: Html }[]
}

export type DiagramSpec =
  | TreeSpec | FlowSpec | ChainSpec | StripSpec | SetsSpec | GraphSpec | GroupsSpec
  | ArcsSpec | StacksSpec | TimelineSpec | CellsSpec | RecursionSpec | DialogueSpec
