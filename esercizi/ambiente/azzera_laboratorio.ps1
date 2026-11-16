# azzera_laboratorio.ps1 — riporta il laboratorio allo stato iniziale.
#
# Esempi:
#   ... azzera_laboratorio.ps1 -Esercizio 3 -Studente rossi@scuola.it   (solo quell'esercizio di quello studente)
#   ... azzera_laboratorio.ps1 -Tutto                                    (TUTTI gli studenti: chiede conferma)
#   ... azzera_laboratorio.ps1 -Tutto -Volumi                            (spegne e cancella anche i volumi Docker)
param(
    # _why: numero dell'esercizio da ripristinare per UNO studente (1, 2, 3)
    [int]$Esercizio = 0,
    # _why: email con cui lo studente entra nel portale (serve con -Esercizio)
    [string]$Studente = "",
    # _why: cancella lo stato degli esercizi di tutti gli studenti e la posta finta
    [switch]$Tutto,
    # _why: con -Tutto spegne il laboratorio e cancella anche i volumi (modello Ollama scaricato compreso)
    [switch]$Volumi,
    # _why: salta la domanda di conferma (per gli script del docente)
    [switch]$SenzaConferma,
    # _why: indirizzo dell'API di Mailpit sul PC
    [string]$UrlMailpit = "http://127.0.0.1:8025"
)
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

if ($Esercizio -gt 0) {
    if (-not $Studente) { Write-Host "Con -Esercizio serve anche -Studente (l'email dello studente)." -ForegroundColor Red; exit 2 }
    docker compose exec -T portale python -m esercizi.motore.cli ricomincia $Esercizio --studente $Studente
    exit $LASTEXITCODE
}
if (-not $Tutto) {
    Write-Host "Indica -Esercizio N -Studente email oppure -Tutto. Esempi in testa al file." -ForegroundColor Yellow
    exit 2
}
if (-not $SenzaConferma) {
    $r = Read-Host "Cancellare il lavoro di TUTTI gli studenti negli esercizi? Scrivi SI per confermare"
    if ($r -ne "SI") { Write-Host "Annullato."; exit 0 }
}
if ($Volumi) {
    docker compose --profile ollama down -v
    Write-Host "Laboratorio spento e volumi cancellati. Riaccendi con avvia_laboratorio.ps1" -ForegroundColor Green
    exit $LASTEXITCODE
}
docker compose exec -T portale python -m esercizi.motore.cli azzera --conferma
try { Invoke-WebRequest -UseBasicParsing -Method Delete "$UrlMailpit/api/v1/messages" | Out-Null } catch { Write-Host "Mailpit non raggiungibile: posta non svuotata." -ForegroundColor Yellow }
docker compose restart portale
Write-Host "Esercizi azzerati per tutti gli studenti." -ForegroundColor Green
