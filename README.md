# manual-de-estudo-v2

Skill do Claude Code que transforma um PDF de matéria (apostila, guia de
revisão, slides) num aplicativo de estudo **offline** para Windows, com o
material transcrito na íntegra e ferramentas de estudo em cima. Versão 2:
React 19 + TypeScript + Vite, componentes **shadcn/ui** (primitivas Base UI)
com o visual da v1 (pedra quente e um acento por matéria), diagramas
**Beautiful Mermaid** e casca **Tauri 2**.

- leitor completo, com marcadores, notas, progresso e ajustes de leitura;
- figuras do PDF redesenhadas pelo app (árvores, fluxos, conjuntos, grafos… em HTML + SVG, nos dois temas,
  com texto pesquisável e arranjo próprio no celular), recortes só para foto e gráfico, e diagramas Mermaid;
- fórmulas (KaTeX) e blocos de código com realce de sintaxe (Shiki), offline;
- **Treino** com resposta escrita, resposta-modelo e autoavaliação, e prova aleatória com relógio;
- **Mapa** de revisão com esquemas e procedimento de decisão clicável;
- **simuladores passo a passo**: o pseudocódigo avança linha a linha junto com o desenho da execução (grafo, vetor), com a fila ou o teste de mesa em tabela por etapa;
- **Simulado** do professor (PDF à parte) com relógio, gabarito oculto até entregar e nota pelo critério da prova;
- fichas de repetição espaçada, questões de múltipla escolha, comparador;
- busca global (Ctrl K) com resultados agrupados por destino;
- cartão "roteiro de hoje" a partir da data da prova; tema claro/escuro; barra inferior no celular.

Tudo o que o app acrescenta ao material aparece marcado como do app (esquemas,
diagramas, explicações, respostas-modelo e exercícios extras).

## O que mudou em relação à v1

| | v1 (`manual-de-estudo`) | v2 |
|---|---|---|
| Frontend | HTML/CSS/JS clássicos, sem build | React + TypeScript + Vite |
| Componentes | feitos à mão | shadcn/ui (`base-nova`, Base UI), só os usados, com as medidas e cores da v1 |
| Conteúdo | objetos em `window.BACT` | módulos TypeScript tipados (`tsc` acusa erro de dado) |
| Diagramas | esquemas em HTML | esquemas em React + Mermaid (Beautiful Mermaid) |
| Figuras do PDF | não | bloco `img` + `tools/crop-figure.py` |
| Fórmulas e código | não | blocos `math` (KaTeX) e `code` (Shiki), e `\( … \)` no texto |
| Checagem | script colado no console | `window.__check()` em desenvolvimento |
| Migração | | `tools/convert-v1.mjs` converte um app da v1 e mantém o progresso salvo |

A v1 continua útil quando não se quer npm nem etapa de build.

## Instalação

Clone dentro da pasta de skills do Claude Code:

```bash
git clone https://github.com/<usuario>/manual-de-estudo-v2.git ~/.claude/skills/manual-de-estudo-v2
```

No Windows, `~` é `C:\Users\<usuario>`. A skill aparece como `/manual-de-estudo-v2`.

## Uso

No Claude Code, anexe o PDF e chame a skill:

```
@"C:\caminho\material.pdf"
/manual-de-estudo-v2
```

Para acrescentar um simulado a um app já feito, anexe o PDF do simulado e peça
"adiciona esse simulado em outra aba". Para migrar um app da v1, peça
"migra este app para a v2".

## Requisitos

| Para | Precisa |
|---|---|
| extrair e conferir o PDF | Python 3 + `pip install pymupdf` (o `pdftotext` do Poppler é opcional) |
| ver o app no navegador | Node.js 20+ (`npm ci`, `npm run dev`) |
| gerar o `.exe` / `.msi` | Rust, MSVC Build Tools, WebView2 e `cargo install tauri-cli` |

## Estrutura

```
SKILL.md                      instruções que o Claude segue
references/
  esquema-de-dados.md         arquivos de conteúdo e os 20 tipos de bloco
  design-system.md            cor, tipografia, leitura, layout e armadilhas
  componentes.md              componentes shadcn instalados, API do Base UI, Beautiful Mermaid
  exemplo-classificacao.md    exemplo trabalhado de uma prova "classifique e justifique"
template/                     o app, copiado para cada matéria nova
  src/engine/                 o motor genérico (tipos, leitor, treino, simulado, busca, simulador passo a passo…)
  src/content/                a matéria (é o que se reescreve); vem com um exemplo de tudo
  src/components/ui/          componentes do shadcn
  public/                     favicon, img/ (figuras do PDF), LICENSES/
  src-tauri/                  casca Tauri 2
  tools/                      novo-projeto.ps1, extract-pdf.py, crop-figure.py, coverage.py,
                              convert-v1.mjs, build.ps1, dev.ps1, make-icons.ps1
```

## Desenvolver a skill

O `template/` é um projeto completo: dá para rodar e alterar no lugar.

```powershell
cd ~/.claude/skills/manual-de-estudo-v2/template
npm ci          # node_modules fica só aqui, fora do Git
npm run dev     # http://localhost:5173, com o conteúdo de exemplo
npx tsc -b; npx eslint src; npm run build
```

Projetos novos saem do `tools/novo-projeto.ps1`, que copia o template sem
`node_modules`, `dist` e `target`. Ao subir a skill manualmente para o GitHub,
deixe de fora `template/node_modules` e `template/dist` (o `.gitignore` já
cuida disso para quem usa `git`).

## Licenças de terceiros

Fontes Geist e Source Serif 4 (SIL OFL 1.1), ícones Lucide (ISC), Beautiful
Mermaid, KaTeX e Shiki (MIT) vêm do npm; os textos das licenças vão junto do
app em `template/public/LICENSES/`. As demais dependências são MIT.
