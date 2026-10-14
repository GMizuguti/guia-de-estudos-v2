import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  // caminhos relativos: funciona no Tauri e em subpasta (GitHub Pages)
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  // o Tauri abre o app pela porta fixa; se ela estiver ocupada, falhar é melhor que trocar de porta
  server: {
    port: 5173,
    strictPort: true,
    // o target do Rust tem milhares de arquivos e executáveis travados durante o cargo build:
    // observá-los derruba o servidor com EBUSY
    watch: { ignored: ["**/src-tauri/**"] },
  },
  clearScreen: false,
  build: {
    // app de desktop, lido do disco: pedaços grandes não custam rede
    chunkSizeWarningLimit: 2000,
  },
})
