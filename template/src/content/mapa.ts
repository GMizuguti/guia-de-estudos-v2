/* Mapa de revisão: o essencial do material em uma tela, para a véspera e o dia da prova.
   É CONDENSADO pelo app (o texto integral continua no manual); cada parte cita a seção de origem.
   Sem mapa: export const mapa = null (a aba e o atalho da capa somem).
   Blocos: os mesmos do manual, incluindo figure, mermaid e checklist. */
import type { Mapa } from "@/engine/types"

export const mapa: Mapa | null = {
  title: "Mapa de revisão",
  lead: "O essencial em uma tela. Não substitui o texto completo, que está na aba Manual.",
  homeDesc: "O essencial do material em uma tela, com esquemas e o procedimento clicável",
  parts: [
    { id: "m-eixos", title: "Os dois eixos", src: "Cap. 1", blocks: [{ t: "figure", ref: "exemplo" }] },
    { id: "m-matriz", title: "Combinações possíveis", src: "Cap. 1", blocks: [{ t: "figure", ref: "matriz" }] },
    { id: "m-proc", title: "Procedimento", src: "Cap. 1", blocks: [
      { t: "p", html: "A visão geral mostra o caminho inteiro; abaixo, clique nas respostas pensando em um enunciado." },
      { t: "mermaid", caption: "Visão geral do procedimento", code: [
        "flowchart LR",
        '  A{"1ª pergunta?"} -->|sim| B[Tipo A]',
        '  A -->|não| C{"2ª pergunta?"}',
        "  C -->|sim| D[Tipo B]",
        "  C -.->|não| E[Tipo C]",
      ].join("\n") },
      { t: "figure", ref: "procedimento" },
    ] },
    { id: "m-check", title: "Antes de entregar", src: "Cap. 1", blocks: [
      { t: "checklist", id: "mapa-lista", items: ["Item transcrito da lista de conferência.", "Outro item."] },
    ] },
  ],
}
