/* Simulador passo a passo: o código de um algoritmo avança junto com uma representação da execução.
   A matéria escreve só a execução, uma função pura que devolve a lista de passos (nada escrito à mão),
   e escolhe as vistas; o tocador, o código com a linha da vez, a nota, os botões e as tabelas são daqui.

   Passo (Step) = { line?, note, stage?, tone? } + o estado que a matéria quiser guardar em cada passo:
     line   id da linha do código em execução (destacada no CodePanel)
     note   o que acontece neste passo (HTML; aceita \( … \))
     stage  este passo abre uma etapa (uma volta do laço): "Próxima etapa" para nele, e a tabela por
            etapa (stageColumns) tira um retrato dele
     tone   cor da nota: "ok" (achou), "no" (falhou), "warn" (achou, com ressalva)

   Uso (exemplos completos em src/content/figuras.tsx):
     const steps = useMemo(() => executar(dados, variante), [variante])  // estável: useMemo
     const sim = useStepper(steps)        // volta ao passo 0 sozinho quando steps muda
     <Stepper sim={sim} code={CODIGO} visual={<GraphView … />} top={<Pills … />}>
       <StageTable … />  <ChipList … />  <Stats … />                    // embaixo dos botões
     </Stepper>
   Teclado: com o foco nos botões, ← volta, → avança, Shift+→ pula para a próxima etapa. */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { ChevronLeft, ChevronRight, ChevronsRight, Pause, Play, RotateCcw, SkipForward } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"
import { H } from "./html"
import { chip } from "./styles"
import type { Html } from "./types"

export type Tone = "ok" | "no" | "warn"
export interface Step { line?: string; note: Html; stage?: boolean; tone?: Tone }

const TONE_BOX: Record<Tone, string> = { ok: "border-lab-line bg-lab-bg", no: "border-alerta-line bg-alerta-bg", warn: "border-examen-line bg-examen-bg" }
const TONE_TEXT: Record<Tone, string> = { ok: "text-lab", no: "text-alerta", warn: "text-examen" }

/* ---------- tocador ---------- */

export interface Sim<S extends Step = Step> {
  steps: S[]
  k: number // passo atual
  last: number
  step: S
  playing: boolean
  reached: Set<string> // linhas do código já executadas até aqui
  go: (j: number) => void
  back: () => void
  next: () => void
  nextStage: () => void
  toggle: () => void // reproduzir / pausar (no fim, recomeça)
  end: () => void
  reset: () => void
}

/** Estado do tocador. `steps` precisa ser estável (useMemo): um array novo a cada render recomeçaria sem parar. */
export function useStepper<S extends Step>(steps: S[], speed = 700): Sim<S> {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [seen, setSeen] = useState(steps)
  if (seen !== steps) {
    // outra execução (o aluno trocou a variante ou os dados): volta ao começo
    setSeen(steps)
    setI(0)
    setPlaying(false)
  }
  const last = Math.max(0, steps.length - 1)
  const k = Math.min(i, last)
  const running = playing && k < last
  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => setI(k + 1), speed)
    return () => clearTimeout(t)
  }, [running, k, speed])
  const go = (j: number) => { setPlaying(false); setI(Math.max(0, Math.min(last, j))) }
  const reached = new Set<string>()
  for (let j = 0; j <= k; j++) { const l = steps[j]?.line; if (l) reached.add(l) }
  return {
    steps, k, last, step: steps[k], playing: running, reached, go,
    back: () => go(k - 1),
    next: () => go(k + 1),
    nextStage: () => { let j = k + 1; while (j < last && !steps[j].stage) j++; go(j) },
    toggle: () => { if (running) setPlaying(false); else { if (k >= last) setI(0); setPlaying(true) } },
    end: () => go(last),
    reset: () => go(0),
  }
}

/* ---------- layout ---------- */

/** Vista ao lado do código (a partir de 576 px de largura; `stack` põe a vista em cima, na largura toda,
 *  para vetores e tabelas largas), nota do passo embaixo do código, botões, e os painéis extras (children)
 *  embaixo dos botões. `top`: seletores de variante, acima de tudo. */
export function Stepper({ sim, code, codeTitle, mono, visual, stack, top, nextLabel, children }: {
  sim: Sim
  code?: CodeLine[]
  codeTitle?: ReactNode
  mono?: boolean
  visual?: ReactNode
  stack?: boolean
  top?: ReactNode
  nextLabel?: string
  children?: ReactNode
}) {
  if (!sim.step) return null
  const side = (
    <div className="grid min-w-0 gap-2">
      {code && <CodePanel lines={code} active={sim.step.line} reached={sim.reached} title={codeTitle} mono={mono} />}
      <StepNote sim={sim} />
    </div>
  )
  return (
    <div className="@container grid gap-3 font-sans">
      {top}
      {visual && code && !stack ? (
        <div className="grid gap-3 @xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] @xl:items-start">
          <div className="min-w-0">{visual}</div>
          {side}
        </div>
      ) : <>{visual}{side}</>}
      <StepControls sim={sim} nextLabel={nextLabel ?? (code ? "Próxima linha" : "Próximo passo")} />
      {children}
    </div>
  )
}

/* ---------- código com a linha da vez ---------- */

/** Linha do código: `indent` em níveis; `off` apaga a linha e diz por quê ("só na busca em grafo"). */
export interface CodeLine { id: string; html: Html; indent?: number; off?: Html }

/** Pseudocódigo (ou código, com mono) com a linha em execução destacada; linhas ainda não executadas ficam apagadas. */
export function CodePanel({ lines, active, reached, title = "Pseudocódigo", mono }: {
  lines: CodeLine[]
  active?: string
  reached?: Set<string>
  title?: ReactNode
  mono?: boolean
}) {
  return (
    <div className="grid gap-1.5">
      {title && <PanelLabel>{title}</PanelLabel>}
      <ol className={cn("bg-card grid gap-px overflow-hidden rounded-[12px] border py-1.5 leading-snug", mono ? "font-mono text-[12.5px]" : "text-[13px]")}>
        {lines.map((ln, j) => {
          const on = ln.id === active
          return (
            // my-0!: o .prose-manual li dá margem a todo item de lista
            <li key={ln.id} aria-current={on ? "step" : undefined}
              className={cn("my-0! grid grid-cols-[1.6rem_minmax(0,1fr)] items-start border-l-[3px] px-2 py-1 transition-colors",
                on ? "bg-primary-soft text-foreground border-l-primary font-medium" : "border-l-transparent",
                !on && reached && !reached.has(ln.id) && "opacity-45", ln.off && "opacity-40")}>
              <span className="text-muted-foreground pt-px font-mono text-[11px]">{j + 1}</span>
              <span style={{ paddingLeft: `${(ln.indent ?? 0) * 0.9}rem` }}>
                <H html={ln.html} />
                {ln.off && <H html={`(${ln.off})`} className="text-muted-foreground ml-1 font-sans text-[11px] italic" />}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** "passo k/n" e a nota do passo, na cor do tom. */
export function StepNote({ sim }: { sim: Sim }) {
  const t = sim.step.tone
  return (
    <div aria-live="polite" className={cn("bg-secondary text-soft-foreground rounded-[10px] border px-3.5 py-2.5 text-[13.5px] leading-relaxed", t && TONE_BOX[t])}>
      <span className="text-muted-foreground mr-1.5 font-mono text-xs">passo {sim.k}/{sim.last}</span><H html={sim.step.note} />
    </div>
  )
}

/** Voltar · próxima linha · próxima etapa (se algum passo abre etapa) · reproduzir · até o fim · recomeçar. */
export function StepControls({ sim, nextLabel = "Próxima linha" }: { sim: Sim; nextLabel?: string }) {
  const atEnd = sim.k >= sim.last
  const stages = sim.steps.some((s) => s.stage)
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") { e.preventDefault(); if (e.shiftKey && stages) sim.nextStage(); else sim.next() }
    else if (e.key === "ArrowLeft") { e.preventDefault(); sim.back() }
  }
  return (
    <div role="group" aria-label="Controles da simulação" aria-keyshortcuts="ArrowLeft ArrowRight Shift+ArrowRight" onKeyDown={onKey} className="flex flex-wrap gap-1.5">
      <Button size="sm" variant="outline" disabled={sim.k === 0} onClick={sim.back}><ChevronLeft data-icon="inline-start" />Voltar</Button>
      <Button size="sm" disabled={atEnd} onClick={sim.next}>{nextLabel}<ChevronRight data-icon="inline-end" /></Button>
      {stages && <Button size="sm" variant="outline" disabled={atEnd} onClick={sim.nextStage}><SkipForward data-icon="inline-start" />Próxima etapa</Button>}
      <Button size="sm" variant="outline" onClick={sim.toggle}>
        {sim.playing ? <><Pause data-icon="inline-start" />Pausar</> : <><Play data-icon="inline-start" />Reproduzir</>}
      </Button>
      <Button size="sm" variant="outline" disabled={atEnd} onClick={sim.end}><ChevronsRight data-icon="inline-start" />Até o fim</Button>
      <Button size="sm" variant="ghost" onClick={sim.reset}><RotateCcw data-icon="inline-start" />Recomeçar</Button>
    </div>
  )
}

/* ---------- tabela por etapa ---------- */

/** Célula: `tone` hot = sai / o da vez (acento) · new = chegou nesta etapa (âmbar) · ok · no · muted; `tag` = rótulo curto ("sai", "novo"). */
export interface StageCell { html: Html; sub?: Html; tone?: "plain" | "hot" | "new" | "ok" | "no" | "muted"; tag?: string }
/** Coluna: uma etapa (retrato) ou o agora (`live`, no meio de uma etapa). `empty` aparece na 1ª linha se não houver células. */
export interface StageColumn { head: Html; sub?: Html; live?: boolean; cells: (StageCell | null | undefined)[]; empty?: Html }

const CELL: Record<NonNullable<StageCell["tone"]>, string> = {
  plain: "bg-card",
  hot: "border-primary bg-primary-soft",
  new: "border-examen-line bg-examen-bg",
  ok: "border-lab-line bg-lab-bg",
  no: "border-alerta-line bg-alerta-bg",
  muted: "bg-card text-muted-foreground border-dashed",
}
const TAG: Record<NonNullable<StageCell["tone"]>, string> = {
  plain: "text-muted-foreground", hot: "text-primary", new: "text-examen", ok: "text-lab", no: "text-alerta", muted: "text-muted-foreground",
}

/** Colunas da tabela por etapa até o passo k.
 *  at "start" (padrão; fila, pilha, fronteira): um retrato em cada passo que abre etapa e, se o passo atual
 *    está no meio de uma etapa, mais uma coluna com o agora (live).
 *  at "end" (teste de mesa): uma coluna por etapa, e uma para o que vem antes da primeira, com o último
 *    passo dela até k; a etapa ainda em andamento sai como live.
 *  `since`: primeiro passo considerado (ex.: o começo da iteração atual, num algoritmo que recomeça).
 *  `make(passo, live, j)`: j é o índice do passo que abre a coluna. */
export function stageColumns<S extends Step>(steps: S[], k: number, make: (s: S, live: boolean, j: number) => StageColumn,
  { since = 0, at = "start" }: { since?: number; at?: "start" | "end" } = {}): StageColumn[] {
  const cols: StageColumn[] = []
  if (at === "start") {
    for (let j = since; j <= k; j++) if (steps[j]?.stage) cols.push(make(steps[j], false, j))
    if (steps[k] && !steps[k].stage) cols.push(make(steps[k], true, k))
    return cols
  }
  for (let j = since; j <= k;) {
    let e = j + 1
    while (e < steps.length && !steps[e].stage) e++ // e: onde começa a próxima etapa
    cols.push(make(steps[Math.min(e - 1, k)], e - 1 > k, j))
    j = e
  }
  return cols
}

/** Tabela com uma coluna por etapa e uma linha por posição (fila, pilha, fronteira) ou por variável
 *  (teste de mesa). Rola na horizontal e acompanha a última coluna. */
export function StageTable({ columns, rowHead, corner = "Posição", minRows = 1 }: {
  columns: StageColumn[]
  rowHead: (r: number) => { head: Html; sub?: Html }
  corner?: Html
  minRows?: number
}) {
  const rows = Math.max(minRows, ...columns.map((c) => c.cells.length))
  const scroller = useRef<HTMLDivElement>(null)
  useEffect(() => {
    // mostra a última coluna inteira e encosta a borda de uma coluna na coluna fixa: rolar até o fim exato
    // deixaria uma coluna cortada embaixo da fixa, com o texto escondido e só o resto das caixas à vista
    const el = scroller.current
    const ths = el ? [...el.querySelectorAll<HTMLElement>("thead th")] : []
    const lastTh = ths[ths.length - 1]
    if (!el || ths.length < 2 || !lastTh) return
    const stick = ths[0].offsetWidth
    const end = lastTh.offsetLeft + lastTh.offsetWidth
    const first = ths.slice(1).find((th) => end - th.offsetLeft <= el.clientWidth - stick) ?? lastTh
    el.scrollLeft = Math.max(0, first.offsetLeft - stick)
  }, [columns.length])
  // bordas separadas (não collapse): a borda da coluna fixa acompanha a coluna, e o que rola passa por baixo dela
  return (
    <div ref={scroller} className="overflow-x-auto rounded-[12px] border">
      <table className="w-max min-w-full border-separate border-spacing-0 font-sans text-[12.5px]">
        <thead>
          <tr className="bg-secondary">
            <th className="bg-secondary sticky left-0 z-10 border-r px-2.5 py-1.5 text-left text-[11px] font-semibold tracking-wide uppercase"><H html={corner} /></th>
            {columns.map((c, j) => (
              <th key={j} className={cn("min-w-24 border-r px-2.5 py-1.5 text-left align-top font-normal last:border-r-0", c.live && "bg-primary-soft")}>
                <H as="div" html={c.head} className="text-[11px] font-semibold tracking-wide uppercase" />
                {c.sub && <H as="div" html={c.sub} className="text-muted-foreground text-[11px]" />}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => {
            const rh = rowHead(r)
            return (
              <tr key={r}>
                <th scope="row" className="bg-card sticky left-0 z-10 border-t border-r px-2.5 py-1.5 text-left align-top font-normal">
                  <H as="div" html={rh.head} className="text-[12px] font-semibold" />
                  {rh.sub && <H as="div" html={rh.sub} className="text-muted-foreground text-[11px]" />}
                </th>
                {columns.map((c, j) => {
                  const x = c.cells[r]
                  const tone = x?.tone ?? "plain"
                  return (
                    <td key={j} className={cn("border-t border-r px-1.5 py-1 align-top last:border-r-0", c.live && "bg-primary-soft/40")}>
                      {x ? (
                        <div className={cn("rounded-md border px-2 py-1", CELL[tone])}>
                          <H html={x.html} className="font-semibold" />
                          {x.tag && <span className={cn("ml-1 text-[10px] font-semibold uppercase", TAG[tone])}>{x.tag}</span>}
                          {x.sub && <H as="div" html={x.sub} className="text-muted-foreground text-[11px]" />}
                        </div>
                      ) : r === 0 && c.empty ? <H html={c.empty} className="text-muted-foreground px-1 text-[11.5px] italic" /> : null}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ---------- peças pequenas ---------- */

/** Rótulo de painel, em versalete pequeno. */
export function PanelLabel({ children }: { children: ReactNode }) {
  return <div className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">{children}</div>
}

/** Números do passo atual (gerados, pico, resultado…), dois a quatro por linha conforme a largura. */
export interface StatItem { label: Html; value: ReactNode; tone?: Tone }
export function Stats({ items }: { items: StatItem[] }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2">
      {items.map((s, i) => (
        <div key={i} className={cn("bg-secondary rounded-[10px] border px-3 py-2", s.tone && TONE_BOX[s.tone])}>
          <H as="div" html={s.label} className="text-muted-foreground text-[10.5px] font-semibold tracking-wider uppercase" />
          <div className={cn("font-mono text-[15px] font-semibold", s.tone && TONE_TEXT[s.tone])}>{s.value}</div>
        </div>
      ))}
    </div>
  )
}

/** Lista de pílulas com rótulo (visitados, explorados, saída…). */
export function ChipList({ label, items, empty = "nenhum ainda" }: { label: ReactNode; items: Html[]; empty?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-[12.5px]">
      <span className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">{label}:</span>
      {items.length
        ? items.map((x, i) => <H key={i} html={x} className="bg-secondary rounded-full border px-2 py-0.5 font-mono" />)
        : <span className="text-muted-foreground">{empty}</span>}
    </div>
  )
}

/** Escolha única em pílulas (variante do algoritmo, modo, dados de entrada). */
export function Pills<T extends string>({ value, onChange, options, label, className }: {
  value: T
  onChange: (v: T) => void
  options: { v: T; l: ReactNode }[]
  label: string
  className?: string
}) {
  return (
    <ToggleGroup spacing={1.5} className={cn("flex-wrap", className)} value={[value]} aria-label={label}
      onValueChange={(v) => { if (v[0]) onChange(v[0] as T) }}>
      {options.map((o) => <ToggleGroupItem key={o.v} value={o.v} className={chip}>{o.l}</ToggleGroupItem>)}
    </ToggleGroup>
  )
}
