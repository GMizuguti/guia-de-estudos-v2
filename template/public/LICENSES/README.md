# Licenças de terceiros embutidas no aplicativo

Estes arquivos acompanham o app (o Vite copia `public/` para o pacote final) porque
as licenças pedem que o aviso siga junto de cada cópia.

| Item | Uso no app | Licença |
|---|---|---|
| Geist (Vercel) | fonte da interface | SIL Open Font License 1.1 (`Geist-OFL.txt`) |
| Source Serif 4 (Adobe) | fonte do modo de leitura | SIL Open Font License 1.1 (`SourceSerif4-OFL.txt`) |
| Lucide | ícones | ISC (`Lucide-ISC.txt`) |
| Beautiful Mermaid (Craft) | diagramas | `BeautifulMermaid-LICENSE.txt` |
| KaTeX (fontes incluídas) | fórmulas | MIT (`KaTeX-MIT.txt`) |
| Shiki, temas GitHub e gramáticas | realce de código | MIT (`Shiki-MIT.txt`) |

As demais bibliotecas (React, Base UI, shadcn/ui, Tailwind, cmdk, sonner) são MIT.
O build do Vite não preserva os comentários de licença; para distribuir o app além do
uso pessoal, gere a lista completa das dependências de produção (ex.:
`npx license-checker --production --out public/LICENSES/terceiros.txt`).
