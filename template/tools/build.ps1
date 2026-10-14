# Gera os instaladores de Windows (NSIS e MSI): npm run build (Vite) + cargo tauri build.
# Mensagens sem acento de proposito: o Windows PowerShell 5.1 le arquivo UTF-8 sem BOM como ANSI.
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "Falta Node.js (npm). Instale com:  winget install --id OpenJS.NodeJS.LTS" -ForegroundColor Yellow
  exit 1
}
if (-not (Get-Command cargo -ErrorAction SilentlyContinue)) {
  Write-Host "Falta Rust. Instale com:  winget install --id Rustlang.Rustup   (e abra um terminal novo)" -ForegroundColor Yellow
  Write-Host "Sem Rust, o app ja funciona no navegador:  npm run dev" -ForegroundColor Cyan
  exit 1
}
$null = (& cargo tauri --version) 2>$null
if (-not $?) {
  Write-Host "Instalando a CLI do Tauri (so na primeira vez)..." -ForegroundColor Cyan
  cargo install tauri-cli --version "^2.0" --locked
}

if (-not (Test-Path (Join-Path $root 'node_modules'))) {
  Write-Host "Instalando as dependencias do frontend (npm ci)..." -ForegroundColor Cyan
  npm ci
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

# BOM no tauri.conf.json quebra o build ("expected value at line 1 column 1")
$utf8 = New-Object System.Text.UTF8Encoding($false)
Get-ChildItem (Join-Path $root 'src-tauri') -Include *.json, *.toml -Recurse -File |
  Where-Object { $_.FullName -notmatch '\\target\\' } | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
      [System.IO.File]::WriteAllText($_.FullName, [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3), $utf8)
      Write-Host "BOM removido: $($_.Name)"
    }
  }

# cargo pinta stderr de vermelho mesmo em sucesso: vale o exit code
cargo tauri build
if ($LASTEXITCODE -ne 0) { Write-Host "Falhou (exit $LASTEXITCODE)." -ForegroundColor Red; exit $LASTEXITCODE }

$bundle = Join-Path $root 'src-tauri\target\release\bundle'
Write-Host ""
Write-Host "Instaladores gerados:" -ForegroundColor Green
Get-ChildItem $bundle -Recurse -Include *.exe, *.msi | ForEach-Object { Write-Host "  $($_.FullName)" }
