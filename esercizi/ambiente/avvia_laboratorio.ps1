# avvia_laboratorio.ps1 — accende il laboratorio degli esercizi (portale + CRM + posta finta + modello).
#
# Esempi:
#   powershell -ExecutionPolicy Bypass -File avvia_laboratorio.ps1                 (finto-LLM, nessuna GPU)
#   powershell -ExecutionPolicy Bypass -File avvia_laboratorio.ps1 -Modello ollama (Ollama vero in questo PC)
#   powershell -ExecutionPolicy Bypass -File avvia_laboratorio.ps1 -Modello aula -UrlAula http://192.168.1.50:11434
param(
    # _why: "finto" = risposte da tabelle, gira su qualunque PC; "ollama" = modello vero in un container
    #       di questo PC (serve RAM: 8 GB liberi per qwen2.5:3b); "aula" = Ollama condiviso su un altro PC.
    [ValidateSet("finto", "ollama", "aula")] [string]$Modello = "finto",
    # _why: nome del modello Ollama da scaricare/usare (con -Modello ollama o aula). 3b = leggero, 7b = migliore.
    [string]$NomeModello = "qwen2.5:3b",
    # _why: indirizzo dell'Ollama d'aula (solo con -Modello aula), es. http://192.168.1.50:11434
    [string]$UrlAula = "",
    # _why: porta del portale sul PC (deve coincidere con PORTA_PORTALE del docker-compose)
    [int]$PortaPortale = 8780,
    # _why: quanti secondi aspettare che il portale risponda prima di dichiarare un problema
    [int]$AttesaSecondi = 120
)
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Host "Docker non e' installato (o non e' nel PATH). Segui esercizi\LEGGIMI_DOCKER.md, passo 1." -ForegroundColor Red
    exit 2
}
docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker e' installato ma non e' acceso: apri Docker Desktop, aspetta la balena verde e rilancia." -ForegroundColor Red
    exit 2
}

$profilo = @()
switch ($Modello) {
    "finto"  { $env:LLM_URL = "http://finto-llm:11434"; $env:MODELLO = "finto-llm-v1" }
    "ollama" { $env:LLM_URL = "http://ollama:11434";    $env:MODELLO = $NomeModello; $profilo = @("--profile", "ollama") }
    "aula"   {
        if (-not $UrlAula) { Write-Host "Con -Modello aula serve -UrlAula (es. http://192.168.1.50:11434)" -ForegroundColor Red; exit 2 }
        $env:LLM_URL = $UrlAula; $env:MODELLO = $NomeModello
    }
}
$env:PORTA_PORTALE = "$PortaPortale"

Write-Host "Accendo il laboratorio (modello: $Modello / $($env:MODELLO))... la prima volta ci vogliono alcuni minuti." -ForegroundColor Cyan
docker compose @profilo up -d --build
if ($LASTEXITCODE -ne 0) { Write-Host "docker compose non e' riuscito: leggi i messaggi qui sopra." -ForegroundColor Red; exit 1 }

$url = "http://127.0.0.1:$PortaPortale"
$pronto = $false
for ($i = 0; $i -lt $AttesaSecondi; $i += 3) {
    try { Invoke-WebRequest -UseBasicParsing "$url/api/lingue" -TimeoutSec 3 | Out-Null; $pronto = $true; break } catch { Start-Sleep -Seconds 3 }
}
if (-not $pronto) {
    Write-Host "Il portale non risponde dopo $AttesaSecondi secondi. Guarda i messaggi con: docker compose logs portale" -ForegroundColor Red
    exit 1
}
if ($Modello -eq "ollama") {
    Write-Host "Il modello $NomeModello si sta scaricando (solo la prima volta, qualche GB). Avanzamento: docker compose logs -f ollama-modello" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "Laboratorio acceso." -ForegroundColor Green
Write-Host "  Portale del corso (studenti):  $url   (codice di prova: DEMO-AGENTI)"
Write-Host "  Posta finta (Mailpit):          http://127.0.0.1:8025"
Write-Host "  CRM didattico (docente):        http://127.0.0.1:8790/studenti"
Write-Host "Per spegnere: docker compose stop   (dalla cartella esercizi\ambiente)"
