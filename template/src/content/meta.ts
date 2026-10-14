/* Identidade da matéria: o único arquivo com texto "da casa" fora dos dados. Reescreva-o inteiro.
   Use o idioma do material. */
import { BookOpen } from "lucide-react"
import type { Meta } from "@/engine/types"

export const meta: Meta = {
  // Chave do localStorage (progresso, notas, treino). Única por matéria e NUNCA mude depois de publicar.
  slug: "{{SLUG}}",
  appTitle: "{{TITULO_COMPLETO}}",

  // Barra superior. brandIcon: qualquer ícone do lucide-react (Network, FlaskConical, Scale, Atom, Landmark…)
  brandTitle: "{{MARCA}}",
  brandSub: "{{SUBTITULO_CURTO}}",
  brandIcon: BookOpen,

  // Vocabulário do material. `doc` tem de ser substantivo masculino (manual, guia, resumo).
  // Para um guia dividido em "seções" numeradas, por exemplo:
  //   { chapter: "Seção", chapterShort: "Seção", chapters: "seções", sections: "tópicos",
  //     sectionOne: "tópico", sectionsRead: "tópicos lidos", doc: "guia", docTab: "Guia", compareNoun: "categorias" }
  words: {
    chapter: "Capítulo", chapterShort: "Cap.", chapters: "capítulos",
    sections: "seções", sectionOne: "seção", sectionsRead: "seções lidas",
    doc: "manual", docTab: "Manual", compareNoun: "perfis",
    rightChoices: "escolhas certas", // contagem e selo do Treino; ex.: "nomes certos" quando se escolhe o nome da categoria
    // inChapter: título do índice lateral do leitor. Padrão tirado de `chapter`: "Neste capítulo",
    // "Nesta parte", "Nesta unidade", "Neste trecho" (para "Seção"). Só preencha se o padrão soar errado.
  },

  // Capa
  heroEyebrow: "{{LINHA_FINA}}", // ex.: "Guia de estudo · 2º semestre de 2026"
  heroTitle: "{{TITULO}}", // parte em peso normal
  heroEmphasis: "{{ENFASE}}", // parte em itálico; "" para omitir
  heroLead: "{{RESUMO_UMA_FRASE}}",

  // Sugestões da busca (Ctrl K) com o campo vazio: termos distintivos do material
  searchHints: ["{{TERMO_1}}", "{{TERMO_2}}", "{{TERMO_3}}"],

  // Data da prova ("AAAA-MM-DD") para o cartão "roteiro de hoje" da capa. "" desliga o cartão.
  examDate: "",
  examDateLabel: "", // ex.: "28/09/2026"

  // Roteiro da última semana, se o material trouxer um (texto transcrito do material).
  // steps: o passo exibido quando faltam `days` dias; actions: atalhos para uma aba ({ view }) ou seção ({ section }).
  roteiro: null,
  /* exemplo:
  roteiro: {
    title: "Roteiro da seção 10",
    before: "O roteiro começa cinco dias antes da prova.",
    beforeActions: [{ label: "Treino", view: "treino" }],
    examDayNote: "São 105 minutos para dez questões.",
    steps: [
      { days: 1, momento: "Um dia antes", texto: "Reler apenas a seção 7…", actions: [{ label: "Seção 7", section: "c7-1" }] },
      { days: 0, momento: "No dia", texto: "Leia as dez questões antes…", actions: [{ label: "Mapa", view: "mapa" }] },
    ],
  }, */

  // "Como usar este aplicativo" na capa. null oculta.
  howToUse: "{{COMO_USAR}}",

  // Os quatro tipos de destaque. Mantenha os quatro `kind` (são as chaves de cor em index.css),
  // troque `name` e `desc`. O `name` também vira o rótulo dos quadros no texto. null oculta a legenda.
  legend: [
    { kind: "clave", name: "{{NOME_CONCEITO}}", desc: "{{DESC}}" },
    { kind: "examen", name: "{{NOME_EXAME}}", desc: "{{DESC}}" },
    { kind: "lab", name: "{{NOME_PRATICA}}", desc: "{{DESC}}" },
    { kind: "alerta", name: "{{NOME_ALERTA}}", desc: "{{DESC}}" },
  ],

  // Rodapé do painel de ajustes. Aceita HTML.
  footerNote: "{{PROCEDENCIA}} <b>Material de estudo</b>: {{RESSALVA}}",
}
