/* Simulado: uma prova simulada que o professor entregou À PARTE (outro PDF), transcrita na íntegra.
   Sem simulado: export const simulado = null (a aba e o atalho da capa somem).

   Fidelidade: enunciados, gabarito comentado, tabelas de critério e leitura da nota entram como estão.
   Só os rótulos dos campos de resposta (fields[].label) são do app. Divergência com o material
   principal vira `appNote` na questão ("Nota do app, não está no PDF: …"), nunca correção no texto. */
import type { Simulado } from "@/engine/types"

export const simulado: Simulado | null = {
  homeTitle: "Simulado do professor", // atalho da capa e título na busca
  homeDesc: "Prova simulada com relógio, gabarito comentado e autoavaliação pelo critério da prova",
  header: ["{{INSTITUICAO}}", "{{CURSO}}"],
  kicker: "PROVA SIMULADA",
  title: "{{TITULO_DO_SIMULADO}}",
  subtitle: "",
  course: "{{DISCIPLINA}} | {{PROFESSOR}}",
  note: "",
  minutes: 60,
  intro: ["<b>Para que serve este simulado.</b> Texto de apresentação transcrito do PDF."],
  warning: "<b>Não leia o gabarito antes.</b> Aviso transcrito do PDF, se houver.",
  peekConfirm: "Ver o gabarito sem fazer o simulado?",
  // Folha de rosto. auto: "nome" (campo editável) | "data" | "tempo" | "nota" (preenchidos pelo app)
  formFields: [
    { label: "Nome", auto: "nome" },
    { label: "Data em que fiz o simulado", auto: "data" },
    { label: "Tempo que levei", auto: "tempo" },
    { label: "Pontuação obtida", auto: "nota" },
  ],

  parts: [
    { title: "Parte A (0,5 ponto)", instr: "Instrução da parte, transcrita.", questions: [1] },
    { title: "Parte B (0,5 ponto)", instr: "Instrução da parte, transcrita.", questions: [2] },
  ],

  // Questão: { n, label, pts, max, sec, stem: [parágrafos], blocks, quote, after, prompt, fields, gab, appNote }
  //   n:      número interno (chave das respostas e da nota); nunca mude depois de publicar
  //   label:  rótulo do original no lugar do número ("A1 · Tipo" → "Questão A1 · Tipo"); sem label: "Questão 1"
  //   blocks: blocos do manual depois dos parágrafos do enunciado (tabela a completar, grafo ou árvore em `code`)
  //   fields: [{ k, label, pick (eixo de eixos.ts), ans, alt, text }]
  //   gab:    { head, answer, lead, blocks (tabelas do gabarito, antes dos itens), items: [itens do gabarito comentado] }
  questions: [
    {
      n: 1, label: "A1 · Tipo", pts: "0,5 ponto", max: 0.5, sec: "c1-1",
      stem: ["Enunciado transcrito. Complete a tabela e classifique o caso."],
      blocks: [{ t: "table", cols: ["Critério", "Valor no caso"], rows: [["Primeiro critério", ""], ["Segundo critério", ""]] }],
      prompt: "Tipo: ______________ Justifique:",
      fields: [
        { k: "t", label: "Sua tabela (um critério por linha)", text: true, placeholder: "Primeiro critério: …\nSegundo critério: …" },
        { k: "a", label: "Tipo", pick: "tipo", ans: "a", text: true },
      ],
      gab: { head: "Questão A1", answer: "Resposta: tipo A.",
        blocks: [{ t: "table", cols: ["Critério", "Valor no caso"], rows: [["Primeiro critério", "Valor transcrito do gabarito"], ["Segundo critério", "Valor transcrito do gabarito"]] }],
        items: [
          "<b>Justificativa completa:</b> transcrita do gabarito.",
          "<b>Erro mais provável:</b> transcrito.",
        ] },
    },
    {
      n: 2, label: "B1 · Proposta com erro", pts: "0,5 ponto", max: 0.5, sec: "c1-2",
      stem: ["Leia a afirmação abaixo:"],
      quote: "Proposta citada no enunciado.",
      after: "<b>Identifique o erro e dê a formulação correta.</b>",
      fields: [
        { k: "a", label: "O erro", text: true },
        { k: "b", label: "Formulação correta", pick: "saida", ans: "y", text: true },
      ],
      gab: { head: "Questão B1", lead: "<b>O erro:</b> transcrito.", items: ["<b>Pontuação:</b> transcrita."] },
      appNote: "<b>Nota do app, não está no PDF:</b> use só para apontar divergência com o material principal.",
    },
  ],

  endNote: "Fim do simulado. Frase de fechamento transcrita.",
  gabaritoTitle: "Gabarito comentado",
  gabaritoWarn: "Só leia daqui em diante depois de ter respondido.",
  gabaritoIntro: "",

  // Autoavaliação. hint: lembrete curto ao lado da nota de cada questão (texto seu, resumindo o critério).
  // leitura: tabela "sua pontuação → o que fazer" do PDF; min = limite inferior de cada linha, na ordem.
  // anchor: id da seção com o critério completo (vira o botão "Critério de autoavaliação").
  // step: passo das notas de cada questão. Padrão 0.1; critério com 0,25 pede 0.05 (passo menor que 0,1
  // mostra as notas e o total com duas casas: 0,25 · 0,75).
  scoring: {
    max: 1, step: 0.05, anchor: "simAuto",
    hint: "Critério da prova: <b>0,5</b> resposta completa · <b>0,25</b> sem justificativa.",
    leitura: {
      cols: ["Sua pontuação", "Leitura", "O que fazer agora"],
      rows: [["0,8 a 1,0", "Domínio", "Texto transcrito"], ["Abaixo de 0,8", "Rever", "Texto transcrito"]],
      min: [0.8, 0],
    },
  },

  // Lista "confira na sua folha". detect(ans, { words }) devolve uma frase quando acha o padrão
  // nas respostas (ans[n].choice[k], ans[n].text[k]) ou null.
  folha: { items: [
    { t: "Item transcrito do PDF.", detect: (ans) => (ans[2]?.choice.b ? null : "Você não marcou a formulação correta na questão B1.") },
    { t: "Outro item transcrito.", detect: (ans, { words }) => (words(ans[1]?.text.a) < 10 ? "Sua justificativa da questão A1 tem menos de 10 palavras." : null) },
  ] },

  // Seções depois das questões, na ordem do PDF. Blocos do manual, mais { t: "sim-leitura" }
  // (tabela de leitura com a linha da sua nota destacada) e { t: "sim-folha" }.
  sections: [
    { id: "simAuto", title: "Como se autoavaliar", blocks: [
      { t: "p", html: "Texto transcrito." },
      { t: "table", cols: ["Situação", "Pontuação"], rows: [["Resposta completa", "0,5"], ["Sem justificativa", "0,25"]] },
      { t: "sim-leitura" },
    ] },
    { title: "Erros para conferir na sua própria folha", blocks: [
      { t: "p", html: "Introdução transcrita." },
      { t: "sim-folha" },
      { t: "p", html: "<i>Fechamento transcrito.</i>" },
    ] },
  ],
}
