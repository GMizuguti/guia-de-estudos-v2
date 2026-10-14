/* Esquemas visuais do app: acréscimos que NÃO estão no material (a moldura avisa isso ao aluno).
   Cada esquema é um componente React. Referencie com { t: "figure", ref: "nome" } no manual ou no Mapa.
   Peças prontas em @/engine/figure-kit:
     <Cat axis v />       chip de uma opção de eixos.ts, na cor do eixo
     <Skeleton axis v />  esqueleto de resposta da opção (campo `skeleton`)
     <Flow steps result /> procedimento clicável
     <FreeTable cols rows /> tabela livre (células soltas); okCell(exemplo) / noCell() para ✓ e ×
     <Verdict ok />       veredito colorido (compatível / incompatível)
     <GraphView nodes edges /> grafo em SVG, com cor por papel; <GraphLegend items />
     Simulador passo a passo (exemplos 4 e 5): useStepper(passos) + <Stepper sim code visual>, com
     <StageTable> (fila por etapa, teste de mesa), <ChipList>, <Stats> e <Pills> para trocar a variante.
   Componentes do shadcn (Table, Badge, Card…) e as cores semânticas (text-clave, bg-lab-bg…) valem aqui. */
import { useMemo, useState, type ComponentType, type ReactNode } from "react"
import { Check } from "lucide-react"
import {
  Cat, ChipList, Flow, FreeTable, GraphLegend, GraphView, H, noCell, okCell, PanelLabel, Pills, Skeleton, StageTable, Stats, Stepper,
  stageColumns, useStepper, Verdict, type CodeLine, type GraphEdge, type GraphNode, type NodeTone, type StageCell, type Step,
} from "@/engine/figure-kit"
import { cn } from "@/lib/utils"
import { axes } from "./eixos"

const Note = ({ children }: { children: ReactNode }) => <p className="text-muted-foreground mt-3 text-[13px] leading-relaxed">{children}</p>

/* Exemplo 1: dois eixos lado a lado */
function Exemplo() {
  const col = (k: string, q: ReactNode, axis: string, top: string) => (
    <div className={`bg-muted/30 rounded-xl border border-t-4 p-4 ${top}`}>
      <div className="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">{k}</div>
      <p className="my-2 text-sm">{q}</p>
      <div className="flex flex-wrap gap-1.5">{axes[axis].options.map((o) => <Cat key={o.v} axis={axis} v={o.v} />)}</div>
    </div>
  )
  return (
    <>
      <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
        {col("Eixo A", <>A pergunta que este eixo responde</>, "tipo", "border-t-primary")}
        <div className="text-muted-foreground self-center text-center font-mono text-xl" aria-hidden>×</div>
        {col("Eixo B", <>A pergunta que este outro eixo responde</>, "saida", "border-t-border")}
      </div>
      <Note>Nota curta dizendo de onde o esquema foi tirado (ex.: "resume a tabela da seção 2").</Note>
    </>
  )
}

/* Exemplo 2: matriz de combinações em tabela livre (✓ compatível com exemplo, × incompatível) */
function Matriz() {
  return (
    <>
      <FreeTable
        cols={axes.saida.options.map((o) => <Cat key={o.v} axis="saida" v={o.v} />)}
        rows={[
          { head: <Cat axis="tipo" v="a" />, cells: [okCell("exemplo do material"), okCell()] },
          { head: <Cat axis="tipo" v="b" />, cells: [okCell(), noCell()] },
          { head: <Cat axis="tipo" v="c" />, cells: [noCell(), okCell("outro exemplo")] },
        ]}
      />
      <Note>Uma célula pode ocupar a linha inteira: {"{ span: 2, align: \"center\", content: … }"}.</Note>
    </>
  )
}

/* Exemplo 3: procedimento clicável. `showIf` apaga um passo que não se aplica; `clears` limpa os dependentes. */
function Procedimento() {
  return (
    <Flow
      steps={[
        { n: "1ª", key: "q1", q: "Primeira pergunta do procedimento?", clears: ["q2"], opts: [
          { val: "sim", label: "Sim", out: <Cat axis="tipo" v="a" /> },
          { val: "nao", label: "Não", out: <span className="text-muted-foreground text-xs italic">vá para a 2ª pergunta</span> },
        ] },
        { n: "2ª", key: "q2", q: "Segunda pergunta?", showIf: (st) => st.q1 === "nao", opts: [
          { val: "sim", label: "Sim", out: <Cat axis="tipo" v="b" />, note: "observação curta" },
          { val: "nao", label: "Não", out: <Cat axis="tipo" v="c" /> },
        ] },
      ]}
      resultN="✓"
      resultQ="Resultado"
      result={(st) => {
        const v = st.q1 === "sim" ? "a" : st.q2 === "sim" ? "b" : st.q2 === "nao" ? "c" : null
        if (!v) return <p className="text-muted-foreground text-sm">Clique nas respostas acima: o resultado e um esqueleto de resposta aparecem aqui.</p>
        return (
          <div className="grid gap-2">
            <Verdict ok><Check className="size-4" aria-hidden /><Cat axis="tipo" v={v} /></Verdict>
            <Skeleton axis="tipo" v={v} />
          </div>
        )
      }}
    />
  )
}

/* ---------- simuladores passo a passo ----------
   A execução é uma função pura que devolve a lista de passos: cada passo diz a linha do código em
   execução (line), o que acontece (note) e guarda o estado que as vistas desenham. Nada é escrito à
   mão: trocar os dados ou a variante refaz a execução inteira. */

const M = (t: string) => String.raw`\(${t}\)` // fórmula na linha (KaTeX)

/* Exemplo 4: busca em largura num grafo não dirigido. Vista: o grafo; tabela: a fila, uma coluna por etapa. */

type PassoL = Step & {
  fila: string[] // na ordem de saída: [0] é o próximo a sair
  marcados: string[]
  d: Record<string, number>
  pai: Record<string, string>
  u?: string
  v?: string
  novos: string[] // entraram na fila nesta etapa (no retrato: na etapa anterior)
  etapa: number
  pico: number
  exam: number
}

const GL = {
  pos: { A: [150, 30], B: [80, 110], C: [220, 110], D: [40, 195], E: [150, 195], F: [260, 195] } as Record<string, [number, number]>,
  arestas: [["A", "B"], ["A", "C"], ["B", "D"], ["B", "E"], ["C", "E"], ["C", "F"], ["E", "F"]] as [string, string][],
}
const vizinhos = (x: string) => GL.arestas.flatMap(([a, b]) => (a === x ? [b] : b === x ? [a] : [])).sort()

function largura(s: string): PassoL[] {
  const out: PassoL[] = []
  const fila = [s], marcados = [s]
  const d: Record<string, number> = { [s]: 0 }, pai: Record<string, string> = {}
  let etapa = 0, pico = 1, exam = 0, novos: string[] = []
  const passo = (p: Partial<PassoL> & Pick<PassoL, "note">) =>
    out.push({ fila: [...fila], marcados: [...marcados], d: { ...d }, pai: { ...pai }, etapa, pico, exam, novos: [...novos], ...p })

  passo({ line: "init", note: `A fila começa só com ${s}, já marcado, com ${M(`d(${s}) = 0`)}.` })
  for (;;) {
    etapa++
    const antes = novos
    novos = []
    if (!fila.length) {
      passo({ line: "loop", stage: true, novos: antes, note: "A fila está vazia: o laço termina." })
      break
    }
    passo({ line: "loop", stage: true, novos: antes, note: `A fila tem ${fila.length} vértice${fila.length > 1 ? "s" : ""}: começa a etapa ${etapa}.` })
    const u = fila.shift()!
    passo({ line: "pop", u, note: `Retira ${u}, o primeiro da fila (o mais antigo), com ${M(`d(${u}) = ${d[u]}`)}.` })
    const vs = vizinhos(u)
    passo({ line: "for", u, note: `${u} tem ${vs.length === 1 ? "um vizinho" : `${vs.length} vizinhos`}: ${vs.join(", ")}.` })
    for (const v of vs) {
      exam++
      if (marcados.includes(v)) {
        passo({ line: "seen", u, v, note: `${v} já foi marcado: ignora.` })
        continue
      }
      passo({ line: "seen", u, v, note: `${v} ainda não foi marcado.` })
      marcados.push(v)
      d[v] = d[u] + 1
      pai[v] = u
      fila.push(v)
      novos.push(v)
      pico = Math.max(pico, fila.length)
      passo({ line: "push", u, v, note: `Marca ${v}, com ${M(`d(${v}) = d(${u}) + 1 = ${d[v]}`)}, e o põe no fim da fila.` })
    }
  }
  passo({ line: "end", tone: "ok", note: `Fim: ${marcados.length} vértices marcados, na ordem ${marcados.join(", ")}; ${M("d")} é o número de arestas até ${s}.` })
  return out
}

const CODIGO_L: CodeLine[] = [
  { id: "init", html: String.raw`fila \(\gets [s]\); marca \(s\); \(d(s) \gets 0\)` },
  { id: "loop", html: "enquanto a fila não estiver vazia:" },
  { id: "pop", html: String.raw`\(u \gets\) retira o primeiro da fila`, indent: 1 },
  { id: "for", html: String.raw`para cada vizinho \(v\) de \(u\):`, indent: 1 },
  { id: "seen", html: String.raw`se \(v\) já foi marcado: ignora \(v\)`, indent: 2 },
  { id: "push", html: String.raw`marca \(v\); \(d(v) \gets d(u) + 1\); põe \(v\) no fim da fila`, indent: 2 },
  { id: "end", html: String.raw`fim: todo vértice alcançável a partir de \(s\) foi marcado` },
]

function Largura() {
  const [s, setS] = useState("A")
  const steps = useMemo(() => largura(s), [s])
  const sim = useStepper(steps)
  const p = sim.step
  const fim = sim.k === sim.last
  const nodes: GraphNode[] = Object.entries(GL.pos).map(([id, [x, y]]) => {
    let tone: NodeTone = "plain"
    if (p.marcados.includes(id)) tone = "done"
    if (p.fila.includes(id)) tone = "wait"
    if (!fim && p.v === id) tone = "next"
    if (!fim && p.u === id) tone = "cur"
    return { id, x, y, tone, sub: p.d[id] === undefined ? undefined : `d=${p.d[id]}` }
  })
  // arestas da árvore da busca (quem marcou quem) em verde; a aresta em exame no acento
  const edges: GraphEdge[] = GL.arestas.map(([a, b]) => {
    const hot = !fim && ((p.u === a && p.v === b) || (p.u === b && p.v === a))
    const arvore = p.pai[b] === a || p.pai[a] === b
    return { from: a, to: b, tone: hot ? "hot" : arvore ? "ok" : "plain" }
  })
  const cols = stageColumns(steps, sim.k, (q, live, j) => ({
    head: !live ? `Etapa ${q.etapa}` : q.line === "init" ? "Início" : q.line === "end" ? "Fim" : "Agora",
    sub: !live ? (q.fila.length ? (j < sim.k ? `sai ${q.fila[0]}` : `próximo: ${q.fila[0]}`) : "vazia: fim")
      : q.line === "init" ? "antes do laço" : q.line === "end" ? "fila vazia" : `etapa ${q.etapa}, em andamento`,
    live,
    empty: "vazia",
    cells: q.fila.map((x, r): StageCell => {
      const sai = !live && r === 0
      const novo = !sai && q.novos.includes(x)
      return { html: x, sub: M(`d = ${q.d[x]}`), tone: sai ? "hot" : novo ? "new" : undefined, tag: sai ? "sai" : novo ? "novo" : undefined }
    }),
  }))
  return (
    <Stepper sim={sim} code={CODIGO_L}
      top={<Pills label="Vértice de partida" value={s} onChange={setS} options={["A", "D"].map((v) => ({ v, l: <>Começar em {v}</> }))} />}
      visual={
        <>
          <GraphView w={300} h={240} directed={false} nodes={nodes} edges={edges} />
          <GraphLegend items={[["cur", "u (retirado)"], ["next", "v (em exame)"], ["wait", "na fila"], ["done", "já marcado"]]} />
        </>
      }>
      <div className="grid gap-1.5">
        <PanelLabel>Fila, etapa por etapa</PanelLabel>
        <p className="text-soft-foreground text-[13px] leading-relaxed"><b>Fila FIFO:</b> quem chega entra no fim; sai sempre a posição 1, a mais antiga.</p>
        <StageTable columns={cols} rowHead={(r) => ({ head: String(r + 1), sub: r === 0 ? "próximo a sair" : undefined })} />
      </div>
      <ChipList label="Marcados, na ordem" items={p.marcados} />
      <Stats items={[
        { label: "Marcados", value: `${p.marcados.length} de ${Object.keys(GL.pos).length}`, tone: fim ? "ok" : undefined },
        { label: "Na fila agora", value: p.fila.length },
        { label: "Pico da fila", value: p.pico },
        { label: "Vizinhos examinados", value: p.exam },
      ]} />
      <Note>Use “Próxima etapa” para pular de uma volta do laço para a outra. Com o foco nos botões, as setas ← e → também andam.</Note>
    </Stepper>
  )
}

/* Exemplo 5: busca binária num vetor ordenado. Vista própria (o vetor, em cima, na largura toda);
   tabela: teste de mesa, uma coluna por iteração (stageColumns com at: "end"). */

type PassoB = Step & {
  it: number // iteração (0 = antes do laço)
  lo0: number // lo e hi no começo da iteração (o teste de mesa mostra estes)
  hi0: number
  lo: number
  hi: number
  m?: number
  am?: number
  decisao?: "=" | "<" | ">" | "vazio"
  achou?: number
  comps: number
}

const VETOR = [2, 5, 8, 12, 16, 23, 38, 45, 56, 72, 91]

function binaria(a: number[], x: number): PassoB[] {
  const out: PassoB[] = []
  let lo = 0, hi = a.length - 1, it = 0, comps = 0, lo0 = lo, hi0 = hi
  const passo = (p: Partial<PassoB> & Pick<PassoB, "note">) => out.push({ it, lo0, hi0, lo, hi, comps, ...p })

  passo({ line: "init", note: `${M(String.raw`lo = 0,\ hi = ${hi}`)}: o intervalo é o vetor inteiro.` })
  for (;;) {
    it++
    lo0 = lo
    hi0 = hi
    if (lo > hi) {
      passo({ line: "loop", stage: true, note: `${M(String.raw`lo = ${lo} \gt hi = ${hi}`)}: o intervalo ficou vazio, o laço termina.` })
      passo({ line: "fail", decisao: "vazio", tone: "no", note: `${M(`x = ${x}`)} não está no vetor, depois de ${comps} comparações.` })
      return out
    }
    passo({ line: "loop", stage: true, note: `${M(String.raw`lo = ${lo} \le hi = ${hi}`)}: ainda há ${hi - lo + 1} elemento${hi > lo ? "s" : ""} no intervalo.` })
    const m = Math.floor((lo + hi) / 2)
    passo({ line: "mid", m, am: a[m], note: `${M(String.raw`m = \lfloor (${lo} + ${hi}) / 2 \rfloor = ${m}`)}, e ${M(`A[${m}] = ${a[m]}`)}.` })
    comps++
    if (a[m] === x) {
      passo({ line: "eq", m, am: a[m], decisao: "=", achou: m, tone: "ok", note: `${M(`A[${m}] = ${x}`)}: achou na posição ${m}, com ${comps} comparaç${comps === 1 ? "ão" : "ões"}.` })
      return out
    }
    passo({ line: "eq", m, am: a[m], note: `${M(String.raw`A[${m}] = ${a[m]} \ne ${x}`)}.` })
    if (a[m] < x) {
      lo = m + 1
      passo({ line: "lt", m, am: a[m], decisao: "<", note: `${M(String.raw`${a[m]} \lt ${x}`)}: o ${M("x")} só pode estar à direita, ${M(String.raw`lo \gets ${lo}`)}.` })
    } else {
      hi = m - 1
      passo({ line: "else", m, am: a[m], decisao: ">", note: `${M(String.raw`${a[m]} \gt ${x}`)}: o ${M("x")} só pode estar à esquerda, ${M(String.raw`hi \gets ${hi}`)}.` })
    }
  }
}

const CODIGO_B: CodeLine[] = [
  { id: "init", html: String.raw`\(lo \gets 0\); \(hi \gets n - 1\)` },
  { id: "loop", html: String.raw`enquanto \(lo \le hi\):` },
  { id: "mid", html: String.raw`\(m \gets \lfloor (lo + hi) / 2 \rfloor\)`, indent: 1 },
  { id: "eq", html: String.raw`se \(A[m] = x\): devolve \(m\)`, indent: 1 },
  { id: "lt", html: String.raw`se \(A[m] \lt x\): \(lo \gets m + 1\)`, indent: 1 },
  { id: "else", html: String.raw`senão: \(hi \gets m - 1\)`, indent: 1 },
  { id: "fail", html: "devolve “não está”" },
]

const DECISAO: Record<NonNullable<PassoB["decisao"]>, StageCell> = {
  "=": { html: "achou", tone: "ok" },
  "<": { html: "vai à direita" },
  ">": { html: "vai à esquerda" },
  vazio: { html: "intervalo vazio", tone: "no" },
}

/** O vetor: fora do intervalo fica apagado; m no acento; achou em verde; lo, m e hi embaixo. */
function Vetor({ a, p }: { a: number[]; p: PassoB }) {
  const cols = { gridTemplateColumns: `repeat(${a.length}, minmax(0, 1fr))` }
  return (
    <div className="grid gap-1 font-sans" role="img" aria-label={`Vetor ${a.join(", ")}; intervalo de ${p.lo} a ${p.hi}${p.m === undefined ? "" : `; m = ${p.m}`}`}>
      <div className="grid gap-1" style={cols}>
        {a.map((x, i) => (
          <div key={i} className={cn("grid place-items-center rounded-md border py-1.5 font-mono text-[13px] font-semibold transition-colors",
            p.achou === i ? "border-lab bg-lab-bg text-lab"
              : p.m === i ? "border-primary bg-primary text-primary-foreground"
                : i < p.lo || i > p.hi ? "bg-card text-muted-foreground border-dashed opacity-60" : "bg-card")}>{x}</div>
        ))}
      </div>
      <div className="text-muted-foreground grid gap-1 text-center font-mono text-[10.5px]" style={cols}>{a.map((_, i) => <span key={i}>{i}</span>)}</div>
      <div className="text-primary grid min-h-4 gap-1 text-center font-mono text-[11px] font-semibold" style={cols}>
        {a.map((_, i) => <span key={i}>{[i === p.lo && "lo", i === p.m && "m", i === p.hi && "hi"].filter(Boolean).join(" ")}</span>)}
      </div>
    </div>
  )
}

function Binaria() {
  const [x, setX] = useState("45")
  const steps = useMemo(() => binaria(VETOR, Number(x)), [x])
  const sim = useStepper(steps)
  const p = sim.step
  const linhas = [M("lo"), M("hi"), M("m"), M("A[m]"), "decisão"]
  const cols = stageColumns(steps, sim.k, (q, live) => ({
    head: q.it === 0 ? "Início" : `Iteração ${q.it}`,
    live,
    cells: [
      { html: String(q.lo0) },
      { html: String(q.hi0) },
      q.m === undefined ? null : { html: String(q.m), tone: "hot" },
      q.am === undefined ? null : { html: String(q.am) },
      q.decisao ? DECISAO[q.decisao] : null,
    ],
  }), { at: "end" })
  const resultado = p.achou !== undefined ? `posição ${p.achou}` : p.decisao === "vazio" ? "não está" : "…"
  return (
    <Stepper sim={sim} code={CODIGO_B} stack
      top={<Pills label="Valor procurado" value={x} onChange={setX} options={["45", "12", "40"].map((v) => ({ v, l: <H html={M(`x = ${v}`)} /> }))} />}
      visual={<Vetor a={VETOR} p={p} />}>
      <div className="grid gap-1.5">
        <PanelLabel>Teste de mesa, iteração por iteração</PanelLabel>
        <StageTable columns={cols} corner="Variável" minRows={linhas.length} rowHead={(r) => ({ head: linhas[r] })} />
      </div>
      <Stats items={[
        { label: "Comparações", value: p.comps },
        { label: "Elementos no intervalo", value: Math.max(0, p.hi - p.lo + 1) },
        { label: "Resultado", value: resultado, tone: p.achou !== undefined ? "ok" : p.decisao === "vazio" ? "no" : undefined },
      ]} />
    </Stepper>
  )
}

export const figures: Record<string, ComponentType> = {
  exemplo: Exemplo,
  matriz: Matriz,
  procedimento: Procedimento,
  largura: Largura,
  binaria: Binaria,
}
