/* Eixos de resposta: os conjuntos de opções que o aluno escolhe no Treino e no Simulado.
   Ex.: "abordagem" (supervisionada, não supervisionada…), "tarefa", "gênero do agente", "tipo de erro".
   Matéria sem classificação a escolher: axes = {} e o Treino fica só com resposta escrita.

   Cada eixo:
     label            nome curto exibido acima das opções
     ask              pergunta padrão dos exercícios do eixo, com o texto do material ("Qual é a abordagem? Justifique.")
     tone             "accent" (destaque) | "ink" (neutro) | "select" (lista suspensa, para listas longas)
     hint             HTML da "Dica" do Treino (ex.: as perguntas do procedimento de decisão do material)
     checks           itens de autoavaliação próprios deste eixo (opcional; ver selfCheck)
     placeholder      texto da lista suspensa (tone "select")
     textPlaceholder  ajuda do campo de resposta escrita das partes deste eixo
     options          { v, l, sec, skeleton }: sec = seção que explica a opção (vira "Reler");
                      skeleton = HTML de um esqueleto de resposta (usado pelo procedimento clicável) */
import type { Axis, Html } from "@/engine/types"

export const axes: Record<string, Axis> = {
  tipo: {
    label: "Tipo",
    ask: "Qual é o tipo? Justifique.", // pergunta padrão dos exercícios deste eixo
    tone: "accent",
    hint: "<p><b>1ª</b> Pergunta que decide o tipo…</p>",
    options: [
      { v: "a", l: "Tipo A", sec: "c1-1", skeleton: "<p>Cite o trecho que mostra que … ; ou seja, … ; isso descarta o tipo B, porque …</p>" },
      { v: "b", l: "Tipo B", sec: "c1-2" },
      { v: "c", l: "Tipo C", sec: "c1-3" },
    ],
  },
  saida: {
    label: "Saída",
    tone: "ink",
    options: [
      { v: "x", l: "Saída X", sec: "c1-2" },
      { v: "y", l: "Saída Y", sec: "c1-3" },
    ],
  },
  erro: {
    label: "erro",
    tone: "select",
    placeholder: "Escolha o erro no catálogo…",
    textPlaceholder: "Por que é erro, e qual seria a formulação correta…",
    checks: [["ev", "<b>Identifiquei</b> o erro"], ["li", "<b>Expliquei</b> por que é erro"], ["de", "Dei a <b>formulação correta</b>"]],
    options: [
      { v: "e1", l: "Erro 1 do catálogo do material", sec: "c1-4" },
      { v: "e2", l: "Erro 2 do catálogo do material", sec: "c1-4" },
    ],
  },
}

// Checagem de compatibilidade entre eixos num mesmo exercício (a que o material ensinar).
// Recebe { eixo: valorEscolhido } e devolve null (compatível) ou uma mensagem em HTML.
export function axesConflict(ch: Record<string, string>): Html | null {
  if (ch.tipo === "c" && ch.saida === "x") return "<b>Checagem:</b> o tipo C não combina com a saída X (seção 1.3)."
  return null
}

// Itens da autoavaliação da resposta escrita, se o material define o que é uma resposta completa.
// null usa o padrão: dado do enunciado, raciocínio e descarte da alternativa próxima.
export const selfCheck: [string, Html][] | null = null
