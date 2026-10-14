# Cria um projeto novo a partir do template da skill: copia (sem node_modules, dist e target do Rust),
# preenche os placeholders de identidade, troca o acento, gera os icones e instala as dependencias.
# No fim lista os placeholders que sobraram: sao os textos da materia, que o Claude escreve no conteudo.
# Mensagens sem acento de proposito: o Windows PowerShell 5.1 le arquivo UTF-8 sem BOM como ANSI.
#
# Uso (da pasta do template da skill):
#   powershell -ExecutionPolicy Bypass -File tools\novo-projeto.ps1 -Destino "C:\Users\voce\Desktop\calculo2" `
#     -Slug calculo2 -Titulo "Manual de Calculo II" -Autor "Fulano" -Descricao "Manual interativo de Calculo II" `
#     -Acento "#1F5E3D" -Sigla "C2"
# Opcionais: -Produto (nome do binario, sem acento; padrao: o titulo sem acentos), -Identificador
# (padrao: com.estudo.<slug>), -DescricaoLonga, -Copyright, -SemInstalar (pula o npm ci).
# Aspas duplas dentro de um valor se perdem na passagem de argumentos do PowerShell 5.1:
# use aspas tipograficas no titulo, se precisar delas.
param(
  [Parameter(Mandatory = $true)] [string]$Destino,
  [Parameter(Mandatory = $true)] [string]$Slug,
  [Parameter(Mandatory = $true)] [string]$Titulo,
  [string]$Produto = "",
  [string]$Identificador = "",
  [string]$Autor = "",
  [string]$Descricao = "",
  [string]$DescricaoLonga = "",
  [string]$Copyright = "",
  [string]$Acento = "",
  [string]$Sigla = "",
  [switch]$SemInstalar
)
$ErrorActionPreference = 'Stop'
$tpl = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

# ---- validacoes
if ($Slug -notmatch '^[a-z0-9][a-z0-9-]*$') { throw "Slug invalido: use minusculas, numeros e hifen (ex.: calculo2). Ele vira a chave do progresso salvo." }
if ($Acento -and $Acento -notmatch '^#[0-9a-fA-F]{6}$') { throw "Acento invalido: use hex com 6 digitos (ex.: #1F5E3D)." }
if ((Test-Path $Destino) -and @(Get-ChildItem -Force $Destino).Count -gt 0) { throw "A pasta de destino ja existe e nao esta vazia: $Destino" }

function Remove-Diacritics([string]$s) {
  $d = $s.Normalize([Text.NormalizationForm]::FormD)
  $sb = New-Object Text.StringBuilder
  foreach ($ch in $d.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch) -ne [Globalization.UnicodeCategory]::NonSpacingMark) { [void]$sb.Append($ch) }
  }
  return $sb.ToString().Normalize([Text.NormalizationForm]::FormC)
}
if (-not $Produto) { $Produto = ((Remove-Diacritics $Titulo) -replace '[^A-Za-z0-9 ._-]', '' -replace '\s+', ' ').Trim() }
if (-not $Identificador) { $Identificador = "com.estudo." + ($Slug -replace '-', '') }
if (-not $Descricao) { $Descricao = $Titulo }
if (-not $DescricaoLonga) { $DescricaoLonga = $Descricao }
if (-not $Copyright) { $Copyright = $Autor }

# ---- copia (robocopy: exit code < 8 e sucesso)
Write-Host "Copiando o template para $Destino ..." -ForegroundColor Cyan
& robocopy $tpl $Destino /E /XD node_modules dist target gen .vite /XF *.log *.tsbuildinfo /NFL /NDL /NJH /NJS /NP | Out-Null
if ($LASTEXITCODE -ge 8) { throw "robocopy falhou (exit $LASTEXITCODE)" }
$Destino = (Resolve-Path $Destino).Path

# ---- placeholders de identidade (valores escapados para strings JSON/TS/TOML/Rust; no HTML, entidades)
$utf8 = New-Object Text.UTF8Encoding($false)
function Esc([string]$v) { return $v.Replace('\', '\\').Replace('"', '\"') }
function EscHtml([string]$v) { return $v.Replace('&', '&amp;').Replace('<', '&lt;').Replace('>', '&gt;') }
$map = [ordered]@{
  '{{SLUG}}' = $Slug; '{{TITULO_COMPLETO}}' = $Titulo; '{{NOME_PRODUTO_ASCII}}' = $Produto
  '{{com.exemplo.materia}}' = $Identificador; '{{DESCRICAO_CURTA}}' = $Descricao; '{{DESCRICAO_LONGA}}' = $DescricaoLonga
  '{{AUTOR}}' = $Autor; '{{COPYRIGHT}}' = $Copyright
}
$files = @('index.html', 'package.json', 'package-lock.json', 'src-tauri\tauri.conf.json', 'src-tauri\Cargo.toml', 'src-tauri\src\lib.rs', 'src\content\meta.ts')
foreach ($rel in $files) {
  $f = Join-Path $Destino $rel
  if (-not (Test-Path $f)) { continue }
  $txt = [IO.File]::ReadAllText($f)
  foreach ($k in $map.Keys) {
    $v = if ($rel -eq 'index.html') { EscHtml $map[$k] } else { Esc $map[$k] }
    $txt = $txt.Replace($k, $v)
  }
  if ($rel -like 'package*.json') {
    # nome do pacote npm = slug (so as duas primeiras ocorrencias, que sao o proprio projeto)
    $re = New-Object Text.RegularExpressions.Regex('"name": "manual-de-estudo"')
    $txt = $re.Replace($txt, '"name": "' + $Slug + '"', 2)
  }
  [IO.File]::WriteAllText($f, $txt, $utf8)
}

# ---- preview do Claude Code (npm run dev na porta fixa do vite.config.ts)
$claudeDir = Join-Path $Destino '.claude'
New-Item -ItemType Directory -Force $claudeDir | Out-Null
$launch = '{' + "`n" + '  "version": "0.0.1",' + "`n" + '  "configurations": [' + "`n" +
  '    { "name": "' + $Slug + '", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173 }' + "`n" + '  ]' + "`n" + '}' + "`n"
[IO.File]::WriteAllText((Join-Path $claudeDir 'launch.json'), $launch, $utf8)

# ---- acento e icones
if ($Acento) {
  $css = Join-Path $Destino 'src\index.css'
  $txt = [IO.File]::ReadAllText($css)
  $txt = [Text.RegularExpressions.Regex]::Replace($txt, '--brand: #[0-9a-fA-F]{6};', "--brand: $($Acento.ToLower());")
  [IO.File]::WriteAllText($css, $txt, $utf8)
  $glyph = if ($Sigla) { $Sigla } else { $Slug.Substring(0, 1).ToUpper() }
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $Destino 'tools\make-icons.ps1') -Accent $Acento -Glyph $glyph | Out-Null
  Write-Host "Acento $Acento aplicado (src/index.css, --brand) e icones gerados com '$glyph'." -ForegroundColor Cyan
}

# ---- dependencias
if (-not $SemInstalar) {
  if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "Instalando as dependencias (npm ci)..." -ForegroundColor Cyan
    Push-Location $Destino; try { & npm ci --no-audit --no-fund | Out-Null } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) { Write-Host "npm ci falhou (exit $LASTEXITCODE). Rode de novo dentro do projeto." -ForegroundColor Yellow }
  } else {
    Write-Host "npm nao encontrado: instale o Node.js e rode 'npm ci' dentro do projeto." -ForegroundColor Yellow
  }
}

# ---- o que falta preencher
Write-Host ""
Write-Host "Projeto criado em $Destino" -ForegroundColor Green
Write-Host "  slug: $Slug   identificador: $Identificador   produto: $Produto"
$left = Get-ChildItem $Destino -Recurse -File -Include *.ts, *.tsx, *.html, *.json, *.toml, *.rs, *.css |
  Where-Object { $_.FullName -notmatch '\\(node_modules|dist|target)\\' } |
  Select-String -Pattern '\{\{[A-Za-z0-9_.]+\}\}' -AllMatches -CaseSensitive
if ($left) {
  Write-Host ""
  Write-Host "Placeholders que faltam (textos da materia):" -ForegroundColor Yellow
  $left | Group-Object Path | ForEach-Object {
    $names = ($_.Group | ForEach-Object { $_.Matches } | ForEach-Object { $_.Value } | Select-Object -Unique) -join ', '
    Write-Host ("  " + $_.Name.Substring($Destino.Length).TrimStart('\') + ": " + $names)
  }
}
Write-Host ""
Write-Host "Proximo passo: escrever o conteudo em src\content e rodar 'npm run dev'." -ForegroundColor Cyan
