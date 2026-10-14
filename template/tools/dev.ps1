# Abre o aplicativo em modo de desenvolvimento (janela nativa com recarga a quente).
# Sem Rust, cai para o navegador (npm run dev, http://localhost:5173).
# Mensagens sem acento de proposito: o Windows PowerShell 5.1 le arquivo UTF-8 sem BOM como ANSI.
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "Falta Node.js (npm). Instale com:  winget install --id OpenJS.NodeJS.LTS" -ForegroundColor Yellow
  exit 1
}
if (-not (Test-Path (Join-Path $root 'node_modules'))) { npm ci; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }

if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  Write-Host "Rust nao encontrado: abrindo no navegador. Para a janela nativa: winget install --id Rustlang.Rustup" -ForegroundColor Cyan
  npm run dev
  exit $LASTEXITCODE
}
$null = (& cargo tauri --version) 2>$null
if (-not $?) {
  Write-Host "Instalando a CLI do Tauri (so na primeira vez)..." -ForegroundColor Cyan
  cargo install tauri-cli --version "^2.0" --locked
}
cargo tauri dev
