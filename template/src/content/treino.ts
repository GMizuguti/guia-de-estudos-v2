/* Treino com resposta escrita.
   drillSets: grupos. origin "material" (exercícios do próprio material) ou "app" (extras escritos com
              os critérios do material: aparecem na subaba "Extras", marcados como do app).
   drills:    exercícios. Casos de auxiliares.ts sem exercício próprio entram sozinhos (set "casos").

   Exercício: { id, set, slot, case, title, stem, proposal, ask, gab, ch, sec, note, label, parts }
     case      id de um caso: reaproveita título e enunciado
     slot      eixo principal ou grupo (vira filtro e alimenta a prova aleatória); slot que não é eixo
               ganha nome em slotLabels
     proposal  proposta a criticar ("encontre o erro")
     gab       gabarito do material, em HTML
     note      observação exibida depois da correção
   Parte:      { label, axis, ans, alt, altNote, model, text, placeholder, fromMaterial, checks }
     axis      chave de eixos.ts; null = só resposta escrita
     ans/alt   resposta, e alternativas aceitas se bem argumentadas
     model     resposta-modelo (etiqueta "escrita pelo app", a menos que fromMaterial: true)
     text      false = sem campo de texto (só a escolha) */
import type { Drill, DrillExam, DrillInterpret, DrillSet } from "@/engine/types"

export const drillSets: DrillSet[] = [
  { id: "material", name: "Exercícios do material", origin: "material" },
  { id: "extras", name: "Proposta mal enquadrada", origin: "app", desc: "Identifique o erro, explique e dê a formulação correta." },
]

export const drills: Drill[] = [
  {
    id: "ex-1", set: "material", slot: "tipo", case: "caso-1",
    parts: [{
      axis: "tipo", ans: "a", alt: ["b"], altNote: "Aceita se você argumentar …",
      model: "Tipo A. O enunciado informa que …, ou seja, … Isso descarta o tipo B, que exigiria …",
    }],
  },
  {
    id: "x-1", set: "extras", slot: "saida", ch: "c1", sec: "c1-3",
    title: "Resumo do cenário em uma linha",
    stem: "Enunciado elaborado pelo app, seguindo o padrão dos exercícios do material.",
    proposal: "Proposta com um erro de enquadramento.",
    ask: "Identifique o erro, explique por que é erro e dê a formulação correta.",
    parts: [
      { label: "Erro da proposta", axis: "erro", ans: "e1", model: "A proposta cometeu o erro 1 porque …" },
      { label: "Tipo correto", axis: "tipo", ans: "c", model: "Tipo C, porque …" },
      { label: "Saída correta", axis: "saida", ans: "y", model: "Saída Y, porque …" },
    ],
    note: "Observação exibida depois da correção.",
  },
]

// Nome do filtro de cada slot que não é eixo (slot que é eixo já usa o label do eixo; sem nome, o próprio slot).
// Ex.: exercícios agrupados pelas questões de uma prova: { formulacao: "A1 · Formulação", jogo: "B1 · Jogos" }
export const slotLabels: Record<string, string> = {}

// Prova aleatória com relógio (null desliga a subaba). pick: regras de sorteio em ordem,
// ou uma lista de composições alternativas ([[...], [...]]) das quais uma é sorteada.
export const drillExam: DrillExam | null = {
  minutes: 30,
  title: "Prova aleatória",
  intro: "Questões sorteadas do treino, fora de ordem, com relógio.",
  pick: [{ set: "material", n: 1 }, { set: "extras", n: 1 }],
}

// Leitura do resultado quando um set inteiro foi corrigido. Use o texto do próprio material.
export const drillInterpret: DrillInterpret | null = null
/* exemplo:
export const drillInterpret: DrillInterpret = { set: "material", title: "Seu resultado nos exercícios",
  fn: (right, total) => (right >= total * 0.9 ? "…" : right >= total * 0.7 ? "…" : "…") } */
