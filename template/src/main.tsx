// O motor precisa ser avaliado antes do conteúdo (o conteúdo importa peças do motor): mantenha este import primeiro.
import { M } from "@/engine/core"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"

// em desenvolvimento: window.__check() no console confere ids, alternativas e referências do conteúdo
if (import.meta.env.DEV) {
  import("@/engine/check").then(({ checkContent }) => {
    Object.assign(window, { __check: checkContent })
  })
}

const root = createRoot(document.getElementById("root")!)

// em desenvolvimento: #/spot/<seção>/<bloco> e #/fig/<nome> mostram um bloco sozinho (ver src/engine/spot.tsx)
if (import.meta.env.DEV && /^#\/(spot|fig)\//.test(location.hash)) {
  import("@/engine/spot").then(({ Spot }) => root.render(<Spot hash={location.hash} />))
} else {
  root.render(
    <StrictMode>
      <ThemeProvider storageKey={`${M.slug}.theme`}>
        <App />
      </ThemeProvider>
    </StrictMode>
  )
}
