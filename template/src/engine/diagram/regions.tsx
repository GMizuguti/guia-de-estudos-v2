/* Regiões: diagrama de Euler (conjuntos como elipses ou caixas, uns dentro dos outros, com elementos
   soltos) e grupos (um grande grupo com blocos separados por um operador, como OU de Es na FND). */
import { Fragment } from "react"
import { cn } from "@/lib/utils"
import { H } from "../html"
import { BOX, FILL, Legend, SOLID, TEXT } from "./parts"
import type { GroupsSpec, SetRegion, SetsSpec } from "./types"

function Region({ r, depth }: { r: SetRegion; depth: number }) {
  const tone = r.tone ?? "plain"
  const shape = r.shape ?? (depth === 0 && r.children?.length ? "frame" : "ellipse")
  const frame = shape === "frame"
  // moldura (e caixa no nível de cima, lado a lado com outras) ocupa a largura e a mesma altura das
  // vizinhas; elipse e caixa dentro de outra região ficam do tamanho do conteúdo
  const fill = frame || (shape === "box" && depth === 0)
  const text = (
    <>
      {r.title && (
        // sem uppercase: título pode ser fórmula ("∀x P(x)"), e caixa alta mudaria a variável
        <H as="div" html={r.title} className={cn("text-[13px] font-bold tracking-[.02em]",
          frame ? "text-muted-foreground self-start" : r.strong ? "" : TEXT[tone])} />
      )}
      {r.sub && <H as="div" html={r.sub} className={cn("-mt-1.5 text-[11.5px]", r.strong ? "opacity-85" : "text-soft-foreground")} />}
      {r.html && <H as="div" html={r.html} className={cn("formula-font text-[12.5px] leading-snug", r.strong ? "" : "text-foreground")} />}
    </>
  )
  const kids = r.children && (
    <div className={cn("flex flex-wrap items-center justify-center gap-4", !r.row && "w-full")}>
      {r.children.map((c, i) => <Region key={i} r={c} depth={depth + 1} />)}
    </div>
  )
  return (
    <div className={cn("flex min-w-0 flex-col items-center", fill && "h-full w-full")}>
      <div className={cn("flex flex-col items-center justify-center gap-2 text-center",
        frame && "bg-secondary/40 w-full rounded-[14px] border px-4 pt-3 pb-5",
        shape === "box" && "rounded-[14px] border-2 px-5 py-4", fill && shape === "box" && "w-full flex-1",
        shape === "ellipse" && "min-h-[7rem] min-w-[9rem] rounded-[50%] border-2 px-8 py-8 sm:px-12",
        !frame && (r.strong ? SOLID[tone] : BOX[tone]))}>
        {r.row && kids ? (
          // texto de um lado, regiões de dentro do outro (como "válidas" dentro de "satisfatíveis"); quebra
          // para coluna quando não cabe
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <div className="flex flex-col items-center gap-2">{text}</div>
            {kids}
          </div>
        ) : text}
        {r.items && (
          <div className="flex max-w-[22rem] flex-wrap items-center justify-center gap-3">
            {r.items.map((it, i) => (
              <span key={i} className={cn("grid size-10 place-items-center rounded-full border-2 text-[15px] font-bold",
                it.strong ? SOLID[it.tone ?? "plain"] : [FILL[it.tone ?? "plain"], TEXT[it.tone ?? "plain"]])}>
                <H html={it.label ?? ""} />
              </span>
            ))}
          </div>
        )}
        {!r.row && kids}
        {r.foot && <H as="div" html={r.foot} className={cn("text-[12.5px] leading-snug", r.strong ? "" : TEXT[tone])} />}
      </div>
      {r.below && <H as="div" html={r.below} className={cn("mt-2 text-center text-[12px] leading-snug font-medium", r.tone ? TEXT[r.tone] : "text-muted-foreground")} />}
    </div>
  )
}

export function SetsView({ spec }: { spec: SetsSpec }) {
  return (
    <div>
      <div className="flex flex-wrap items-stretch justify-center gap-4">
        {spec.regions.map((r, i) => <div key={i} className={cn("flex min-w-0 justify-center", spec.regions.length > 1 ? "flex-1 basis-60" : "w-full")}><Region r={r} depth={0} /></div>)}
      </div>
      {spec.legend && <Legend items={spec.legend} />}
    </div>
  )
}

export function GroupsView({ spec }: { spec: GroupsSpec }) {
  const tone = spec.tone ?? "warn"
  return (
    <div className={cn("mx-auto w-fit max-w-full rounded-[18px] border-2 px-3 pt-3 pb-4 sm:px-4", FILL[tone])}>
      {spec.title && <H as="div" html={spec.title} className={cn("mb-3 text-center text-[13px] font-bold", TEXT[tone])} />}
      {/* blocos de mesma largura e altura, numa linha só (no celular eles encolhem em vez de quebrar a linha) */}
      <div className="flex items-stretch justify-center gap-2 sm:gap-3">
        {spec.blocks.map((b, i) => (
          <Fragment key={i}>
            <div className={cn("flex min-w-0 flex-1 basis-0 flex-col rounded-[12px] border-2 px-2 py-2.5 text-center sm:min-w-[7.5rem] sm:px-4",
              b.tone ? FILL[b.tone] : "border-border-strong", "bg-card")}>
              {b.title && <H as="div" html={b.title} className={cn("mb-1.5 text-[11.5px] font-bold", TEXT[b.tone ?? tone])} />}
              <div className={cn("grid flex-1 content-center gap-1 text-[14px] font-semibold", spec.mono !== false && "formula-font")}>
                {b.items.map((x, j) => <H key={j} html={x} />)}
              </div>
            </div>
            {i < spec.blocks.length - 1 && spec.op && <H html={spec.op} className={cn("formula-font self-center text-[20px] font-bold", TEXT[tone])} />}
          </Fragment>
        ))}
      </div>
    </div>
  )
}
