---
name: manual-de-estudo-v2
description: Transforma um PDF, apostila ou conjunto de slides de uma matéria em um aplicativo de estudo offline (Tauri 2 + React 19 + TypeScript + shadcn/ui com Base UI + Beautiful Mermaid) com leitor completo, figuras do PDF, diagramas Mermaid, treino com resposta escrita e autoavaliação, mapa de revisão com esquemas clicáveis, simulado do professor com relógio e gabarito, fichas de repetição espaçada, banco de questões, comparador e busca global. Use quando o usuário quiser estudar um material, pedir um "app de estudo", "manual interativo", "guia de revisão", entregar um PDF dizendo que precisa aprender aquilo para uma prova, pedir para acrescentar um simulado a um app já feito, ou migrar um app da skill manual-de-estudo (v1) para a v2. Prefira esta à v1 para apps novos, salvo se o usuário pedir um app sem npm nem etapa de build.
---

# Manual de estudo a partir de um material (v2)

Gera um app de desktop que contém **todo** o material original, mais as
ferramentas de estudo em cima dele. Roda 100 % offline: fontes, ícones e dados
vão embutidos no binário. Interface em **português (pt-BR)**.

A v2 troca o HTML/JS clássico da v1 por React + TypeScript + Vite, com os
componentes do **shadcn/ui (estilo `base-nova`, primitivas Base UI)** vestidos
com o visual da v1 (pedra quente, um acento, controles com folga) e diagramas
pela **Beautiful Mermaid** (Craft). O conteúdo é tipado: o `tsc`
recusa bloco desconhecido, questão com 3 alternativas ou campo com nome errado
antes de o app abrir. O motor (`src/engine`) é genérico; a matéria inteira mora
em `src/content`.

## As três regras que não se negociam

**1. Fidelidade total ao original.** O objetivo é estudar para uma prova sobre
*aquele* material, não sobre o assunto em geral.

- Não resuma, não corte, não "melhore" o texto do manual.
- Não corrija o conteúdo contra fontes externas, nem que esteja desatualizado.
  O aluno será avaliado pelo que o professor deu. Ressalva vai no rodapé
  (`meta.footerNote`), não no corpo.
- Preserve a pontuação do original, travessões inclusive. A regra que proíbe
  travessão vale para o texto que **você** escreve, não para o transcrito.
- Texto é transcrito como texto. Figura desenhada (árvore, fluxo, cadeia,
  conjuntos, grafo, linha do tempo…) é **redesenhada** como bloco `diagram`,
  com todo o texto dela; imagem (`img`) só para foto, gráfico com dados ou
  desenho que a biblioteca de diagramas não represente.
- Ao final, rode a **checagem de cobertura linha a linha** (passo 7).

**2. Tudo o que o app acrescenta aparece marcado como do app.** O aluno precisa
saber o que é do professor e o que não é.

- Esquemas (`figure`) saem com a moldura "Esquema do app · não está no
  material". Diagramas `mermaid` dizem isso na legenda. O Mapa inteiro se
  apresenta como "condensado pelo app".
- Explicação sua (outra forma de dizer, passo a passo, intuição, exemplo
  novo) vai num bloco `explica`, com a moldura "Explicação do app · não está
  no material": sempre **depois** do trecho transcrito, nunca no lugar dele.
- Respostas-modelo escritas por você levam a etiqueta "escrita pelo app";
  exercícios extras ficam na subaba "Extras", com aviso.
- Divergência entre dois materiais do mesmo professor: transcreva os dois como
  estão e ponha uma `appNote` ("Nota do app, não está no PDF: …") junto do
  trecho. Avise o usuário na resposta final.

**3. Motor genérico, conteúdo tipado, nada de rede.**

- Tudo o que é da matéria vai em `src/content`. Se uma matéria parece pedir
  mudança no motor, **generalize** (campo novo opcional em `types.ts`, com
  padrão que mantém o comportamento atual), nunca um `if` com o nome da matéria.
- `npx tsc -b` e `npx eslint src` limpos antes de compilar.
- Nada de CDN, `fetch` externo ou fonte do Google: fontes vêm do npm
  (`@fontsource-variable/*`) e o Vite embute tudo no `dist/`. A CSP do Tauri
  bloqueia o resto.
- Componente do shadcn só entra se o app usar (ver `references/componentes.md`).

## Fluxo

### 1. Extrair

```bash
python -X utf8 tools/extract-pdf.py "material.pdf" "<scratchpad>/material"
```

Gera `texto.txt` (layout), `tabelas.txt` (tabelas célula por célula, via
PyMuPDF), `enfase.txt` (negrito, itálico, cor), `figuras.txt` (imagens e
desenhos com o retângulo de cada um) e `pNN.png` (cada página).
Requer `pip install pymupdf`. Sem PDF (slides, .docx), converta antes.

### 2. Ler o material inteiro, antes de escrever qualquer coisa

Leia o `texto.txt` do começo ao fim. Não comece a codar pelo capítulo 1.

**Tabelas: nunca monte `rows` a partir do `pdftotext`.** Ele desalinha colunas
e desloca linhas sem avisar, produzindo conteúdo **errado**, não faltante. Use
`tabelas.txt` e confira a tabela na imagem da página. Tabela que atravessa
página vira uma só.

**Ênfase:** `enfase.txt` mostra os destaques. Parágrafo com início em negrito
mantém o negrito; texto em vermelho vira `callout` `alerta`; bloco recuado em
itálico vira `aside` com `<em>`.

**Figuras:** olhe as `pNN.png` e o `figuras.txt`. Figura que é desenho
(árvore, fluxo, ciclo, cadeia de etapas, conjuntos, grafo, linha do tempo,
pilhas, diálogo, arcos de dependência…) vira bloco **`diagram`**, desenhado
pelo app com a biblioteca `src/engine/diagram` (HTML + SVG, tema claro e
escuro, texto pesquisável), um arquivo por figura em `src/content/diagramas/`.
Fidelidade total: todo texto da figura, com a mesma grafia e os mesmos
símbolos (confira na `pNN.png`: o PDF às vezes usa ✔ e não ✓); mesmos nós,
ligações e ordem; cores pelo papel, não copiadas. Se a figura pede algo que a
biblioteca não tem, **estenda a biblioteca** (opção genérica em
`diagram/types.ts`), não desista para a imagem. Ver
`references/esquema-de-dados.md`, "Quando usar `diagram`".

Só foto, gráfico com dados ou desenho irreprodutível vira `img`:

```bash
python -X utf8 tools/crop-figure.py "material.pdf" 5 72 140 520 380 public/img/p05-curva.png
```

imprime o bloco pronto para colar (preencha `alt` e `caption`). Fluxo ou
hierarquia descritos em texto podem ganhar um `mermaid` do app, além do texto
transcrito.

**Conferir uma figura (ou qualquer bloco):** com o `npm run dev` no ar,
`node tools/shot.mjs "#/spot/<seção>/<índice do bloco>?w=828" saida.png --w 868 --h 400 --inteira`
fotografa o bloco sozinho (`&tema=escuro` para o escuro). Confira em três
larguras de coluna: **828** (tela grande), **649** (notebook de 1280 px, a
coluna mais estreita no computador) e **360** (celular, `--w 400`). Abra os
PNGs e compare com a `pNN.png`.

Depois de ler, planeje: capítulos e seções, o que é anexo, quais entidades são
comparáveis, e **como a prova é corrigida** (passo 6).

### 3. Instanciar o template

Escolha o **slug** (minúsculas e hífen; vira a chave do progresso salvo e
**não muda nunca mais**) e um **acento** que converse com a matéria (fuja de
roxo-de-IA e de bege+latão; se colidir com verde/vermelho/âmbar dos destaques,
troque). Depois, da pasta `template/` da skill:

```powershell
powershell -ExecutionPolicy Bypass -File tools\novo-projeto.ps1 -Destino "C:\Users\<user>\Desktop\calculo2" `
  -Slug calculo2 -Titulo "Manual de Cálculo II" -Autor "<nome>" -Descricao "Manual interativo de Cálculo II" `
  -Acento "#1F5E3D" -Sigla "C2"
```

O script copia o template **sem** `node_modules`, `dist` e `target` (o template
da skill pode ter `node_modules` de desenvolvimento: nunca copie a pasta à
mão), preenche título, produto sem acento, identificador, autor e descrições
em `index.html`, `tauri.conf.json`, `Cargo.toml`, `lib.rs`, `package.json` e
`meta.ts`, troca o acento (`--brand` em `src/index.css`: o resto da paleta,
claro e escuro, deriva dele), gera os ícones, cria o `.claude/launch.json` do
preview (`npm run dev`, porta 5173), roda `npm ci` e **lista os placeholders
que sobraram**: são os textos da matéria em `meta.ts` e `simulado.ts`, que você
escreve no passo 4.

Reescreva `src/content/meta.ts` inteiro (identidade, `brandIcon` do
lucide-react, `words`, `searchHints`, `legend`, `examDate`/`roteiro`). Para
trocar o acento depois: só a linha `--brand` e
`tools\make-icons.ps1 -Accent "<hex>" -Glyph "<sigla>"`.

**Idioma:** material em outra língua: traduza as strings de `src/App.tsx` e
`src/engine/**/*.tsx` e `languages` do NSIS em `tauri.conf.json`.

### 4. Escrever o conteúdo

Um arquivo por capítulo em `src/content/capitulos/` (`c01.ts`, `c02.ts`…),
registrado em `capitulos/index.ts` na ordem. Esquema dos **20 tipos de bloco**
e de todos os arquivos: **`references/esquema-de-dados.md`**; a fonte da
verdade é `src/engine/types.ts`. O conteúdo de exemplo do template usa tudo.

- Numere como o original: se o material diz "seção 4.4", o capítulo 4 tem a
  seção de `num: "4.4"`.
- `id` de capítulo `c1`, `c2`…; de seção `<idCapitulo>-<n>`. **Nunca renomeie
  um id publicado**: progresso, marcadores, notas e treino são gravados por id.
- `callout` só aceita `clave`, `examen`, `lab`, `alerta`, pelo papel do quadro
  no original. Tabelas de revisão/gabarito: `filterable: true`.
- Nenhum arquivo de `src/content` importa `@/engine/core` (import circular);
  `import type` de `@/engine/types` e peças de `@/engine/figure-kit` podem.
- Escreva arquivos de conteúdo com a ferramenta Write, não com heredoc no
  Bash: o shell come barras invertidas e aspas.
- **Fórmulas** viram TeX: bloco `math` para fórmula em destaque e `\( … \)`
  dentro do texto. Escreva com ``String.raw`\frac{a}{b}` `` para
  não dobrar as barras. O `pdftotext` desmonta fórmulas (índices soltos,
  símbolos trocados): transcreva olhando a `pNN.png`, não o texto extraído.
- **Código** do material vai em bloco `code` com `lang`, linha a linha como
  no original (indentação inclusive). Nunca "corrija" o código do professor;
  erro aparente vira `appNote`/`aside` do app, como qualquer divergência.

### 5. Auxiliares de reconhecimento

Derivados do conteúdo, nunca de conhecimento externo (`auxiliares.ts`, ou um
arquivo por tipo em matéria grande):

- **Fichas**: 2 a 3 por seção; uma ficha = um fato verificável.
- **Questões**: exatamente 4 alternativas, `a` = índice da correta, `why`
  explica. O app embaralha a cada rodada, mas distribua a resposta certa mesmo
  assim. Distratores do próprio material (o erro comum que o texto cita, a
  palavra do eixo errado).
- **Casos**: exercícios resolvidos do original, perguntas separadas.
- **Comparador**: só com entidades paralelas. Campo que o material não
  informa: `"—"`. Sem entidades: `profiles: []`.

### 6. Módulos de estudo: decida pelo material e pela prova

Leia o que o material diz sobre a prova e ligue o que ajuda. Cada módulo some
sozinho se o dado for `null`/vazio.

| Módulo | Arquivos | Quando ligar |
|---|---|---|
| **Treino** com resposta escrita | `eixos.ts`, `treino.ts` | Sempre que houver exercícios ou casos (casos sem exercício entram sozinhos). Essencial quando a prova é discursiva ou a justificativa vale ponto. |
| **Mapa** de revisão | `mapa.ts`, `figuras.tsx` | Material com estrutura que cabe em uma tela: eixos, classificações, procedimento de decisão, catálogo de erros, lista de conferência. |
| **Simulado** do professor | `simulado.ts` | O usuário entregou uma prova simulada à parte. Transcreva na íntegra. |
| **Roteiro de hoje** | `meta.examDate`, `meta.roteiro` | Há data de prova e o material traz um plano de estudo. |

**Treino.** Cada exercício: escolher (se houver eixo), **escrever**, corrigir,
comparar com o modelo, marcar a autoavaliação.
- Eixos são as classificações que a prova pede. `axesConflict` implementa a
  checagem de compatibilidade que o material ensinar.
- Nos exercícios do material, `ans` tem de bater com o gabarito do material.
  Alternativas aceitas "se bem argumentadas" vão em `alt` + `altNote`.
- Respostas-modelo seguem o formato que o material ensina; `selfCheck` usa os
  mesmos itens.
- **Extras** (`origin: "app"`) só para tipos de questão que o material anuncia
  e não exercita. Cenários novos, critérios do material. Uns 15 a 20 bastam.
- `drillExam` monta uma prova aleatória no formato da oficial; `pick` aceita
  composições alternativas (`[[…], […]]`).
- `slot` que não é eixo (exercícios agrupados pelas questões de uma prova,
  por exemplo) ganha o nome do filtro em `slotLabels` (`treino.ts`).

**Mapa.** Condensado, com a seção de origem em cada parte. Esquemas são
componentes React em `figuras.tsx` com o kit `@/engine/figure-kit` (`Cat`,
`Skeleton`, `Flow`, `Verdict`) e os componentes do shadcn. Visão geral de um
procedimento: `mermaid` `flowchart LR` seguido do `<Flow>` clicável.
Exemplo completo: **`references/exemplo-classificacao.md`**.

**Simulador passo a passo.** Algoritmo ou procedimento com laço que o
material executa (busca, ordenação, minimax, escalonamento): depois do texto
transcrito, um esquema do app em que o código avança linha a linha junto com o
desenho da execução. A matéria escreve só a **execução**, uma função pura que
devolve os passos (`line`, `note`, `stage` e o estado de cada passo); o
tocador, o código com a linha da vez, os botões, o grafo, a tabela por etapa
e os números vêm do kit (`useStepper`, `Stepper`, `GraphView`,
`StageTable`, `Stats`, `ChipList`, `Pills`, em `@/engine/figure-kit`). Nada
escrito à mão: os números saem da execução, e trocar a variante refaz tudo.
Pseudocódigo com KaTeX; a cada volta do laço o destaque volta ao "enquanto";
fila, pilha ou fronteira numa tabela por etapa (posição 1 = próximo a sair),
ou teste de mesa (uma coluna por iteração). Exemplos prontos, busca em largura
e busca binária, em `src/content/figuras.tsx`; API em
`references/esquema-de-dados.md`.

**Simulado.** Gabarito oculto até entregar; relógio que não trava; nota por
autoavaliação com o critério do PDF; tabela de leitura com a linha da nota
destacada; lista "confira na sua folha" com `detect`. A busca indexa só os
enunciados. Questão com rótulo próprio no original ("A1") usa `label`;
tabela a completar ou grafo do enunciado vai em `blocks`, e a tabela do
gabarito em `gab.blocks`. Critério com 0,25 pede `scoring.step: 0.05`.

### 7. Verificar antes de compilar

```bash
npx tsc -b
npx eslint src
npm run dev
```

No console do app aberto em `http://localhost:5173`:

```js
__check()
```

Tudo que começa com `bad` tem de sair vazio e `dup` zerado (ids de seção,
fichas, questões, casos, exercícios, eixos e alternativas, referências de
`case`/`figure`, checklists duplicadas). Confira também, por script, que o
`ans` de cada exercício do material bate com o texto do gabarito do material.

**Cobertura linha a linha**, uma vez para cada PDF:

```bash
python -X utf8 tools/coverage.py "material.pdf" "src/content/capitulos/*.ts" "src/content/diagramas/*.ts" src/content/auxiliares.ts
python -X utf8 tools/coverage.py "simulado.pdf" src/content/simulado.ts
```

O script converte o TeX do conteúdo em texto (`\(h(n) \le h^*(n)\)` vira
"h(n) ≤ h*(n)", como no PDF) e as entidades HTML (`&gt;`) no caractere.
Ausências aceitáveis: rodapés, títulos numerados (viram `num` + `title`),
rótulos montados pela interface ("Questão 1 (1,0 ponto)") e fórmulas que o
PDF quebra em pedaços (índices e frações em linhas soltas; confira essas na
imagem da página). Qualquer outra é texto perdido: corrija.

Depois percorra **todas as abas nos dois temas**, faça um exercício, uma prova
aleatória e o simulado por script, abra a busca e siga um resultado de cada
grupo, e meça estouro horizontal em 375, 880 e 1380 px
(`main.scrollWidth - main.clientWidth` para cada aba e cada capítulo). Limpe o
`localStorage` no fim. Screenshot do painel é instável: confira por JS
(`innerText`, `getComputedStyle`, atributos `data-pressed`/`aria-current`).

### 8. Compilar

```bash
powershell -ExecutionPolicy Bypass -File tools\build.ps1
```

Instala as dependências se faltar, remove BOM de `src-tauri/`, roda
`cargo tauri build` (que chama `npm run build`) e lista os instaladores
(`.exe` NSIS, instala sem admin, e `.msi`) em `src-tauri/target/release/bundle/`.
Ambiente: Node, Rust + MSVC Build Tools + WebView2. Sem Rust, `npm run dev`
já entrega o app no navegador: diga isso em vez de travar.

**Smoke test sem tocar nos dados do usuário:** rode o `.exe` com
`$env:WEBVIEW2_USER_DATA_FOLDER` apontando para uma pasta do scratchpad, espere
uns segundos, ache o processo por **nome e horário de início**, confira o
`MainWindowTitle` e que `<pasta>\EBWebView\Default\Local Storage\leveldb`
foi criado nesta execução. Encerre só o processo que você abriu.

## Migrar um app da v1

```bash
node tools/convert-v1.mjs "C:/caminho/do/app-v1"
```

Converte capítulos, casos, fichas, questões, comparador, treino, eixos, mapa,
simulado e meta para `src/content/`, mantendo o `slug` da v1 (mantenha também
o `identifier` do Tauri: o progresso salvo continua). Funções
(`axesConflict`, `drillInterpret`, `detect`) e esquemas de `figuras.js` ficam
listados em `src/content/PORTAR.md` com o código original, e as figuras viram
componentes provisórios. Porte cada um, rode `tsc`, `__check()` e a cobertura
de novo, e apague o `PORTAR.md`.

## Design e componentes

- Cor, tipografia, leitura, layout: **`references/design-system.md`**.
- Componentes do shadcn instalados, o que cada um substituiu, diferenças da API
  do Base UI e a Beautiful Mermaid: **`references/componentes.md`**.

## Armadilhas já pagas

- **Mermaid cinza e ilegível:** a Beautiful Mermaid usa `--muted`, `--border`…
  dentro do SVG, os mesmos nomes do shadcn. Cores só pelos apelidos `--mm-*`
  de `index.css`.
- **Vite caindo com `EBUSY … src-tauri\target\…build_script_build.exe`:** o
  observador de arquivos varria o target do Rust durante o `cargo build`. O
  `vite.config.ts` ignora `src-tauri/**`; não remova.
- **`base: "./"` no `vite.config.ts`:** o `dist/` sai com caminhos relativos
  e abre tanto no Tauri quanto numa subpasta (GitHub Pages). Por isso o `src`
  de `img` é relativo (`img/p05-curva.png`, sem `/` na frente); não remova.
- **Página em branco no primeiro `npm run dev`:** o Vite ainda estava
  pré-compilando as dependências. Recarregue. Em branco **depois de editar**
  um arquivo da engine ou de `figuras.tsx`, com "useNav fora do NavProvider"
  ou "Cannot access … before initialization" no console: a troca a quente
  esbarrou no import circular (figure-kit → core → content → figuras). Também
  é só recarregar.
- **`failed to remove file …\manual.exe (os error 5)`:** o app está aberto, e
  pode ser o usuário estudando nele. Não encerre o processo: pergunte, ou
  renomeie o `.exe` (o Windows permite renomear executável em uso) e compile.
- **Import circular:** `main.tsx` importa `@/engine/core` antes de tudo.
- **`text-[var(--x)]` vira cor, não tamanho:** no Tailwind v4 o valor
  arbitrário com `var()` em `text-` é lido como cor (o enunciado do Treino
  perdeu o tamanho de leitura e o cinza). Para tamanho use
  `text-(length:--read-size)`; para fonte, `font-(family-name:--read-font)`.
- **`set-state-in-effect` do lint** ao reagir a navegação: ajuste o estado
  durante a renderização comparando `nav.nonce` com o último visto; deixe no
  efeito só o que mexe no DOM (rolagem).
- **Atalho de teclado quebrando com evento sintético:** `e.target` pode ser o
  `window`; teste `e.target instanceof Element` antes de `closest`.
- **BOM em `tauri.conf.json`** quebra o build ("expected value at line 1
  column 1"). O `build.ps1` remove.
- **PowerShell 5.1** lê `.ps1` UTF-8 sem BOM como ANSI: mensagens de
  `Write-Host` sem acento.
- `cargo tauri build` pinta stderr de vermelho mesmo em sucesso: vale o exit code.
- Pastas no OneDrive podem migrar quando o backup da Área de Trabalho é
  desligado: se arquivos "sumirem", procure em `C:\Users\<user>\Desktop`.
