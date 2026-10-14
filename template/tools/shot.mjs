// Screenshot de uma tela do app em desenvolvimento, com o Edge (ou Chrome) sem janela, para conferir
// figuras e layout sem depender do painel do navegador. Fala com o navegador pelo protocolo de depuração
// (DevTools): a largura da tela fica fixa desde o início (sem o redimensionamento de última hora do
// --screenshot, que fotografava as setas dos diagramas onde as caixas estavam antes) e a foto só sai depois
// das fontes e de uma pausa para as medições assentarem. Sem dependências: usa o WebSocket do Node 22+.
//
//   node tools/shot.mjs "#/spot/c1-3/2?w=828" saida.png [--w 900] [--h 1200] [--escuro] [--porta 5173]
//   node tools/shot.mjs "#/v/manual/c4-2" saida.png --w 1380 --h 2400 [--inteira] [--espera 800]
//
// O endereço pode ser um hash do app (#/spot/…, #/fig/…, #/v/…) ou uma URL completa. Em #/spot a largura
// do bloco vem de ?w= no hash; --w é a largura da tela (pode ser estreita como um celular: --w 400).
// --inteira: fotografa a página toda, não só a altura da tela. O servidor (npm run dev) precisa estar no ar.
import { spawn, spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"

const args = process.argv.slice(2)
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d }
const flag = (k) => args.includes(k)
const VAL = new Set(["--w", "--h", "--porta", "--espera"])
const [target, outArg] = args.filter((a, i) => !a.startsWith("--") && !VAL.has(args[i - 1]))
if (!target || !outArg) {
  console.error('uso: node tools/shot.mjs "#/spot/<seção>/<bloco>" saida.png [--w 900] [--h 1200] [--escuro] [--inteira]')
  process.exit(1)
}
const W = Number(opt("--w", "900")), H = Number(opt("--h", "1200"))
const dark = flag("--escuro")
const full = flag("--inteira")
const wait = Number(opt("--espera", "800"))
const port = opt("--porta", "5173")
let url = target.startsWith("http") ? target : `http://localhost:${port}/${target.startsWith("#") ? target : "#" + target}`
if (dark && url.includes("#/spot") && !url.includes("tema=")) url += (url.includes("?") ? "&" : "?") + "tema=escuro"
const out = resolve(outArg)
mkdirSync(dirname(out), { recursive: true })

const candidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/google-chrome", "/usr/bin/chromium", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
]
const browser = candidates.find((p) => existsSync(p))
if (!browser) { console.error("Edge/Chrome não encontrado"); process.exit(1) }

// um perfil por execução: dá para tirar vários screenshots em paralelo
const profile = join(tmpdir(), `manual-shot-${process.pid}-${Date.now()}`)
mkdirSync(profile, { recursive: true })
const proc = spawn(browser, [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check",
  `--user-data-dir=${profile}`, "--remote-debugging-port=0", `--window-size=${Math.max(W, 500)},${H}`,
  ...(dark ? ["--force-dark-mode"] : []), "about:blank",
], { stdio: "ignore" })

// fechar o navegador inteiro é essencial: senão os processos (abas, GPU…) se acumulam a cada screenshot.
// No Windows o msedge.exe iniciado aqui é só um lançador que sai logo, então o pid dele não serve: pede
// Browser.close pelo protocolo e, por garantia, mata todo processo que use o perfil desta execução.
let dbg, ws
async function closeBrowser() {
  if (!dbg) return
  try {
    const ver = await (await fetch(`http://127.0.0.1:${dbg}/json/version`)).json()
    const bws = new WebSocket(ver.webSocketDebuggerUrl)
    await new Promise((ok, err) => { bws.onopen = ok; bws.onerror = err })
    bws.send(JSON.stringify({ id: 1, method: "Browser.close" }))
    await new Promise((r) => setTimeout(r, 600))
  } catch { /* segue para o kill */ }
}
function killByProfile() {
  if (process.platform === "win32") {
    const tag = profile.split(/[\\/]/).pop()
    spawnSync("powershell", ["-NoProfile", "-Command",
      `Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*${tag}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`], { stdio: "ignore" })
  } else try { proc.kill("SIGKILL") } catch { /* já saiu */ }
}
const fail = async (msg) => { console.error(msg); await closeBrowser(); killByProfile(); process.exit(1) }
const timer = setTimeout(() => fail("tempo esgotado: " + out), 45000)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function poll(fn, tries = 100, every = 100) {
  for (let i = 0; i < tries; i++) {
    try { const v = await fn(); if (v) return v } catch { /* ainda não */ }
    await sleep(every)
  }
  return null
}

// qualquer erro daqui até a foto salva (arquivo de saída sem permissão, aba que caiu) passa pelo catch, que
// fecha o navegador: com await no nível de cima, o erro não chega aos tratadores do process
try {
// o navegador grava a porta de depuração no perfil
dbg = await poll(() => {
  const f = join(profile, "DevToolsActivePort")
  return existsSync(f) ? readFileSync(f, "utf8").split("\n")[0].trim() : null
})
if (!dbg) await fail("o navegador não abriu a porta de depuração")
const tab = await poll(async () => (await (await fetch(`http://127.0.0.1:${dbg}/json/list`)).json()).find((t) => t.type === "page"))
if (!tab) await fail("nenhuma aba no navegador")

ws = new WebSocket(tab.webSocketDebuggerUrl)
await new Promise((ok, err) => { ws.onopen = ok; ws.onerror = () => err(new Error("websocket")) })
let seq = 0
const pending = new Map()
const events = []
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  else if (m.method) events.forEach((f) => f(m))
}
const send = (method, params = {}) => new Promise((ok) => { const id = ++seq; pending.set(id, ok); ws.send(JSON.stringify({ id, method, params })) })
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.result?.value

await send("Page.enable")
await send("Runtime.enable")
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false })
if (dark) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] })
const loaded = new Promise((ok) => events.push((m) => { if (m.method === "Page.loadEventFired") ok() }))
await send("Page.navigate", { url })
await loaded
// fontes carregadas, dois quadros desenhados e uma pausa para as medições (setas dos diagramas) assentarem
await evaluate(`document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, ${wait})))))`)

if (full) {
  // página inteira: a tela emulada ganha a altura do conteúdo (o captureBeyondViewport do Chrome às vezes
  // repete pedaços da página na foto)
  const h = await evaluate("Math.ceil(document.documentElement.scrollHeight)")
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: Math.max(h, 50), deviceScaleFactor: 1, mobile: false })
  await evaluate("new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 250))))")
}
const shot = await send("Page.captureScreenshot", { format: "png" })
if (!shot.result?.data) await fail("o screenshot falhou: " + JSON.stringify(shot.error ?? {}))
writeFileSync(out, Buffer.from(shot.result.data, "base64"))
console.log(out)
} catch (e) {
  await fail(String(e?.stack ?? e))
}

clearTimeout(timer)
// pede ao navegador para fechar (o Browser.close encerra todos os processos dele)
await closeBrowser()
ws.close()
// o Edge ainda segura arquivos do perfil por um instante depois de fechar
setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }) } catch { /* fica no temp */ } process.exit(0) }, 500)
