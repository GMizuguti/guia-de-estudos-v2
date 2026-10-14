/* Auxiliares de reconhecimento, derivados do conteúdo do manual (nunca de fonte externa).
   Em matéria grande, separe em arquivos (fichas.ts, questoes.ts, casos.ts, comparador.ts). */
import type { Card, CaseItem, CompareData, QuizItem } from "@/engine/types"

/* Casos / exercícios resolvidos do ORIGINAL. Aparecem no capítulo ({ t: "case", ref }) e no Treino:
   caso que nenhum exercício de treino.ts referencia vira exercício de resposta escrita sozinho,
   uma parte por pergunta, com a resposta do material como modelo. */
export const cases: CaseItem[] = [
  {
    id: "caso-1",
    label: "Caso 1",
    chapter: "c1",
    section: "c1-3", // seção onde o caso aparece no texto
    title: "Enunciado resumido em uma linha",
    stem: "Enunciado completo em HTML, com os dados que o aluno precisa para responder.",
    questions: [
      { q: "Primeira pergunta?", a: "Resposta com o <b>ponto-chave</b> em destaque." },
      { q: "Segunda pergunta?", a: "Resposta." },
    ],
  },
]

/* Fichas de repetição espaçada: 2 a 3 por seção. Uma ficha = um fato verificável.
   `ch` e `sec` geram o link "ver no manual" e precisam existir. */
export const cards: Card[] = [
  { id: "f1", ch: "c1", sec: "c1-1", front: "Pergunta curta e sem ambiguidade", back: "Resposta com o <b>dado exato</b> que precisa ser memorizado." },
  { id: "f2", ch: "c1", sec: "c1-2", front: "Outra pergunta", back: "Outra resposta." },
]

/* Questões de múltipla escolha: exatamente 4 alternativas; `a` = índice (0-3) da correta; `why` explica.
   O app embaralha as alternativas a cada rodada. Distratores tirados do próprio material. */
export const quiz: QuizItem[] = [
  {
    id: "q1", ch: "c1", sec: "c1-1",
    q: "Enunciado da questão?",
    opts: ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
    a: 1,
    why: "Explicação de por que B está certa. Se ajudar, diga também por que as outras não estão.",
  },
]

/* Comparador: só com entidades paralelas no material (organismos, algoritmos, autores, categorias).
   Campo que o material não informa: "—", nunca inventado. Sem entidades: profiles: [] (a aba some). */
export const compare: CompareData = {
  fields: [
    { key: "campo1", label: "Primeiro atributo" },
    { key: "campo2", label: "Segundo atributo" },
    { key: "campo3", label: "Terceiro atributo" },
  ],
  profiles: [
    { id: "ent1", name: "Entidade 1", ch: "c1", group: "Família / categoria", campo1: "Valor", campo2: "Valor com <b>destaque</b>", campo3: "—" },
    { id: "ent2", name: "Entidade 2", ch: "c1", group: "Família / categoria", campo1: "Valor", campo2: "Valor", campo3: "Valor" },
  ],
}
