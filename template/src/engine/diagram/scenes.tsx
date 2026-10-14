/* Cenas: estados com pilhas de blocos sobre uma mesa (mundo dos blocos, pilhas, torres) e diálogo
   (personagens com balões de fala). */
import { Fragment } from "react"
import { cn } from "@/lib/utils"
import { H } from "../html"
import { Adapt } from "./edges"
import { BOX, SOLID } from "./parts"
import type { DialogueSpec, StacksSpec } from "./types"

export function StacksView({ spec }: { spec: StacksSpec }) {
  const n = spec.states.length
  const height = Math.max(...spec.states.flatMap((s) => s.stacks.map((st) => st.length)))
  const state = (s: StacksSpec["states"][number], row: boolean) => (
    <div className="flex flex-col items-center">
      {/* lado a lado, todos os estados reservam a altura da pilha mais alta (as mesas ficam na mesma linha) */}
      <div className="flex items-end gap-3 px-3" style={{ minHeight: row ? `${height * 2.75}rem` : undefined }}>
        {s.stacks.map((st, j) => (
          <div key={j} className="flex flex-col-reverse gap-1">
            {st.map((b, k) => (
              <span key={k} className={cn("grid size-10 place-items-center rounded-[7px] border-2 text-[15px] font-bold", SOLID[spec.tones?.[b] ?? "ink"])}>{b}</span>
            ))}
          </div>
        ))}
      </div>
      <div aria-hidden className="bg-border-strong mt-1 h-2 w-full min-w-32 rounded-full" />
      {s.caption && <H as="div" html={s.caption} className="text-soft-foreground mt-2 text-center text-[12px] font-semibold" />}
    </div>
  )
  // lado a lado quando cabe (ou cabe encolhendo um pouco); senão, um estado embaixo do outro, com a ação
  // na seta que desce
  const wide = (
    <div className="mx-auto flex w-max items-end gap-2">
      {spec.states.map((s, i) => (
        <Fragment key={i}>
          {state(s, true)}
          {i < n - 1 && (
            <div className="text-lab mb-14 flex flex-col items-center gap-0.5 px-1">
              {spec.actions?.[i] && <H as="div" html={spec.actions[i]!} className="formula-font text-[12px] font-semibold whitespace-nowrap" />}
              <svg aria-hidden viewBox="0 0 48 14" className="stroke-lab fill-lab h-3.5 w-12"><path d="M0 7h40" strokeWidth={3} /><path d="M38 1l10 6-10 6z" stroke="none" /></svg>
            </div>
          )}
        </Fragment>
      ))}
    </div>
  )
  const narrow = (
    <div className="flex flex-col items-center gap-2">
      {spec.states.map((s, i) => (
        <Fragment key={i}>
          {state(s, false)}
          {i < n - 1 && (
            <div className="text-lab flex items-center gap-2 py-1">
              <svg aria-hidden viewBox="0 0 14 36" className="stroke-lab fill-lab h-9 w-3.5"><path d="M7 0v28" strokeWidth={3} /><path d="M1 26l6 10 6-10z" stroke="none" /></svg>
              {spec.actions?.[i] && <H as="div" html={spec.actions[i]!} className="formula-font text-[12px] font-semibold whitespace-nowrap" />}
            </div>
          )}
        </Fragment>
      ))}
    </div>
  )
  return <Adapt wide={wide} narrow={narrow} />
}

type Actor = DialogueSpec["actors"][number]

function Avatar({ a }: { a: Actor }) {
  return (
    <div className="flex flex-col items-center">
      <span className={cn("z-[1] grid size-9 place-items-center rounded-full border-2 text-[14px] font-bold", SOLID[a.tone ?? "plain"])}><H html={a.mark ?? ""} /></span>
      <span aria-hidden className={cn("-mt-1 h-8 w-12 rounded-t-[14px] border-2", SOLID[a.tone ?? "plain"])} />
    </div>
  )
}

/** Balão de fala com a ponta para baixo (personagem embaixo) ou para a esquerda (personagem ao lado). */
function Bubble({ a, tail }: { a: Actor; tail: "down" | "left" }) {
  const tone = BOX[a.saysTone ?? "plain"]
  return (
    <div className={cn("relative max-w-[16rem] rounded-[14px] border px-3.5 py-2 text-[13px] italic", tail === "down" ? "text-center" : "text-left", tone)}>
      <H html={a.says} />
      <span aria-hidden className={cn("absolute size-3 rotate-45", tone,
        tail === "down" ? "-bottom-[7px] left-1/2 -translate-x-1/2 border-r border-b" : "top-1/2 -left-[7px] -translate-y-1/2 border-b border-l")} />
    </div>
  )
}

const Aside = ({ a }: { a: Actor }) =>
  <H as="div" html={a.aside} className="border-border-strong text-muted-foreground rounded-[10px] border-2 border-dashed px-2.5 py-1 text-[13px] tracking-widest" />

export function DialogueView({ spec }: { spec: DialogueSpec }) {
  // lado a lado quando cabe (ou cabe encolhendo um pouco); senão, uma conversa em lista (personagem à
  // esquerda, balão ao lado)
  const wide = (
    <div className="mx-auto grid w-max grid-flow-col items-end gap-x-8" style={{ gridTemplateRows: "auto auto auto" }}>
      {spec.actors.map((a, i) => (
        <Fragment key={i}>
          <div className="flex min-h-[4.75rem] items-end justify-center pb-2.5">{a.says && <Bubble a={a} tail="down" />}</div>
          <div className="flex items-center justify-center gap-2">
            <Avatar a={a} />
            {a.aside && <Aside a={a} />}
          </div>
          <div className="text-muted-foreground mt-1 text-center text-[12px]"><H html={a.name ?? ""} /></div>
        </Fragment>
      ))}
    </div>
  )
  const narrow = (
    <div className="flex flex-col gap-3">
      {spec.actors.map((a, i) => (
        <div key={i} className="flex items-center gap-3.5">
          <div className="flex w-14 shrink-0 flex-col items-center">
            <Avatar a={a} />
            {a.name && <H as="div" html={a.name} className="text-muted-foreground mt-1 text-center text-[12px]" />}
          </div>
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            {a.says && <Bubble a={a} tail="left" />}
            {a.aside && <Aside a={a} />}
          </div>
        </div>
      ))}
    </div>
  )
  return <Adapt wide={wide} narrow={narrow} />
}
