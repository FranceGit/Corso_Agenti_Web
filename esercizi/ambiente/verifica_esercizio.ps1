# verifica_esercizio.ps1 — corregge un esercizio di uno studente (come il bottone «Verifica» del portale).
#
# Esempi:
#   ... verifica_esercizio.ps1 -N 1 -Studente rossi@scuola.it            (nel laboratorio Docker acceso)
#   ... verifica_esercizio.ps1 -N 3 -Studente rossi@scuola.it -Json      (verbale completo in JSON)
#   ... verifica_esercizio.ps1 -N 2 -Studente prova@prova.it -Locale     (senza Docker, con il .venv del progetto)
# Esce con 0 se l'esercizio e' superato, 1 se non ancora, 2 per errori.
param(
    # _why: numero dell'esercizio (1 pulizia lead, 2 punteggio a regole, 3 trova l'errore)
    [Parameter(Mandatory = $true)] [int]$N,
    # _why: email con cui lo studente entra nel portale (sul disco diventa uno pseudonimo)
    [Parameter(Mandatory = $true)] [string]$Studente,
    # _why: stampa il verbale JSON intero invece del riassunto leggibile
    [switch]$Json,
    # _why: lingua del riassunto leggibile
    [ValidateSet("it", "en")] [string]$Lingua = "it",
    # _why: esegue fuori da Docker con l'ambiente Python del progetto (finto-LLM e posta locale)
    [switch]$Locale
)
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot
$argomenti = @("-m", "esercizi.motore.cli", "verifica", "$N", "--studente", $Studente, "--lingua", $Lingua)
if ($Json) { $argomenti += "--json" }

if ($Locale) {
    $radice = Resolve-Path (Join-Path $PSScriptRoot "..\..")
    $python = Join-Path $radice ".venv\Scripts\python.exe"
    if (-not (Test-Path $python)) { Write-Host "Manca ${python} - esegui prima collaudo.ps1 nella cartella del progetto." -ForegroundColor Red; exit 2 }
    Push-Location $radice
    & $python @argomenti
    $codice = $LASTEXITCODE
    Pop-Location
    exit $codice
}
docker compose exec -T portale python @argomenti
exit $LASTEXITCODE
