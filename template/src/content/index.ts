/* A matéria inteira, no formato que o motor espera (src/engine/types.ts → Content).
   O motor (src/engine) é genérico; tudo o que é da matéria mora em src/content. */
import type { Content } from "@/engine/types"
import { cards, cases, compare, quiz } from "./auxiliares"
import { chapters } from "./capitulos"
import { axes, axesConflict, selfCheck } from "./eixos"
import { figures } from "./figuras"
import { mapa } from "./mapa"
import { meta } from "./meta"
import { simulado } from "./simulado"
import { drillExam, drillInterpret, drills, drillSets, slotLabels } from "./treino"

const content: Content = {
  meta, chapters, cases, cards, quiz, compare,
  axes, axesConflict, selfCheck,
  drillSets, drills, drillExam, drillInterpret, slotLabels,
  simulado, mapa, figures,
}

export default content
