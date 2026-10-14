/* Diagrama declarativo: escolhe o desenho pelo `kind`, emoldura como figura do material (com legenda e a
   página de onde veio) e extrai o texto para a busca. Ver ./types.ts para o formato de cada desenho. */
import { H } from "../html"
import type { Html } from "../types"
import { ArcsView } from "./arcs"
import { FlowView } from "./flow"
import { GraphPanels } from "./graph"
import { CellsView, ChainView, RecursionView, StripView, TimelineView } from "./linear"
import { GroupsView, SetsView } from "./regions"
import { DialogueView, StacksView } from "./scenes"
import { TreeView } from "./tree"
import type { DBox, DiagramSpec, SetRegion, TreeNode } from "./types"

export * from "./types"
export { Box, Legend } from "./parts"

export function DiagramView({ spec }: { spec: DiagramSpec }) {
  switch (spec.kind) {
    case "tree": return <TreeView spec={spec} />
    case "flow": return <FlowView spec={spec} />
    case "chain": return <ChainView spec={spec} />
    case "strip": return <StripView spec={spec} />
    case "sets": return <SetsView spec={spec} />
    case "graph": return <GraphPanels spec={spec} />
    case "groups": return <GroupsView spec={spec} />
    case "arcs": return <ArcsView spec={spec} />
    case "stacks": return <StacksView spec={spec} />
    case "timeline": return <TimelineView spec={spec} />
    case "cells": return <CellsView spec={spec} />
    case "recursion": return <RecursionView spec={spec} />
    case "dialogue": return <DialogueView spec={spec} />
  }
}

/** Figura do material redesenhada: o desenho num cartão e a legenda do original embaixo. `framed={false}`
 *  (no Mapa, dentro de uma explicação): só o desenho e a legenda. */
export function DiagramFigure({ spec, caption, page, alt, framed = true }: { spec: DiagramSpec; caption?: Html; page?: number; alt?: string; framed?: boolean }) {
  return (
    <figure className="my-5 max-w-none font-sans" aria-label={alt ?? diagramText(spec).slice(0, 300)}>
      <div className={framed ? "bg-card rounded-[14px] border px-3 py-4 sm:px-5 sm:py-5" : ""}>
        <DiagramView spec={spec} />
      </div>
      {(caption || page) && (
        <figcaption className="text-muted-foreground mt-2 text-center text-xs leading-relaxed">
          <H html={caption} />
          {/* bloco inteiro: no celular, "· redesenhada da pág. N" desce junto, sem deixar o "·" sozinho */}
          {page ? <span className="inline-block font-mono whitespace-nowrap">{caption ? " · " : ""}redesenhada da pág. {page}</span> : null}
        </figcaption>
      )}
    </figure>
  )
}

const box = (b?: DBox) => (b ? [b.eyebrow, b.label, b.sub] : [])
const tree = (n: TreeNode): (string | undefined)[] => [n.edge, ...box(n), n.below, ...(n.children ?? []).flatMap(tree)]
const region = (r: SetRegion): (string | undefined)[] => [r.title, r.sub, r.html, ...(r.items ?? []).map((i) => i.label), ...(r.children ?? []).flatMap(region), r.foot, r.below]

/** Todo o texto de um desenho (rótulos, ligações, legendas), para a busca e a descrição acessível. */
export function diagramText(s: DiagramSpec): string {
  let parts: (string | undefined | null)[] = []
  switch (s.kind) {
    case "tree": parts = [...tree(s.root), ...(s.links ?? []).map((l) => l.label), ...(s.legend ?? []).map((l) => l.label), s.foot]; break
    case "flow": parts = [...(s.heads ?? []), ...s.nodes.flatMap((n) => [...box(n), n.tag, ...(n.items ?? []).flatMap(box)]), ...s.edges.map((e) => e.label), ...box(s.foot), ...(s.legend ?? []).map((l) => l.label)]; break
    case "chain": parts = [...s.items.flatMap((i) => [...box(i), i.below]), ...(s.seps ?? []).map((x) => (x && typeof x === "object" ? x.label : x)), ...(s.brackets ?? []).map((b) => b.label), s.foot]; break
    case "strip": parts = [...s.items, s.from, s.to]; break
    case "sets": parts = [...s.regions.flatMap(region), ...(s.legend ?? []).map((l) => l.label)]; break
    case "graph": parts = s.panels.flatMap((p) => [p.title, p.sub, p.below, ...p.nodes.map((n) => n.label ?? n.id), ...p.edges.map((e) => e.label)]); break
    case "groups": parts = [s.title, ...s.blocks.flatMap((b) => [b.title, ...b.items])]; break
    case "arcs": parts = [...s.tokens.map((t) => t.label), ...s.arcs.map((a) => a.label)]; break
    case "stacks": parts = [...s.states.flatMap((x) => [x.caption, ...x.stacks.flat()]), ...(s.actions ?? [])]; break
    case "timeline": parts = s.events.flatMap((e) => [e.when, e.title, e.sub]); break
    case "cells": parts = [...s.cells.map((c) => c.value), s.end, ...(s.labels ?? []), s.foot]; break
    case "recursion": parts = [...s.frames.flatMap((f) => [f.call, f.result]), s.base, s.foot]; break
    case "dialogue": parts = s.actors.flatMap((a) => [a.name, a.mark, a.says, a.aside]); break
  }
  return parts.filter(Boolean).join(" · ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}
