# Collaudo della piattaforma web del corso sugli agenti AI (Windows PowerShell).
# Uso, da qualunque cartella:
#   powershell -ExecutionPolicy Bypass -File C:\Claude_desktop\Game_Development\Corso_Agenti_Web\collaudo.ps1
# Cosa fa:
#   1. crea l'ambiente virtuale .venv nella cartella del progetto (solo la prima volta)
#   2. installa le dipendenze di requirements.txt (solo librerie gratuite e permissive)
#   3. esegue TUTTI i test Python (con copertura) e, se Node e' installato, i test delle animazioni
#      (tests_js\prova_animazioni.mjs: le 2 lezioni del dimostratore + un file per lezione in tests_js\lezioni);
#      scrive tutto in collaudo_esito.txt (da passare a Claude se qualcosa e' rosso)
#   4. chiede se avviare il server: S = avvia, Q = esci. Lo script NON apre nessun browser:
#      il server stampa la riga "Apri nel tuo browser: http://127.0.0.1:8780" e l'indirizzo lo apri tu.
$ErrorActionPreference = "Stop"
$Radice = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Radice
$env:PYTHONUTF8 = "1"
$Esito = Join-Path $Radice "collaudo_esito.txt"
$Py = Join-Path $Radice ".venv\Scripts\python.exe"
# Documento benchmark da cui sono stati estratti i dati: se esiste, un test verifica che l'estrazione sia riproducibile.
$DocumentoBenchmark = "F:\A\CD\Game_Development\000_PROGETTO\CORSO_BENCHMARK_STRUTTURA.md"

if (-not (Test-Path $Py)) {
    Write-Host "Creo l'ambiente virtuale .venv ..."
    if (Get-Command py -ErrorAction SilentlyContinue) { py -3 -m venv .venv } else { python -m venv .venv }
}
Write-Host "Installo le dipendenze (requirements.txt) ..."
& $Py -m pip install --quiet --disable-pip-version-check -r requirements.txt

if (Test-Path $DocumentoBenchmark) {
    $env:CORSO_BENCHMARK_MD = $DocumentoBenchmark
} else {
    Write-Host "Documento benchmark non trovato in $DocumentoBenchmark : il test di riproducibilita' dell'estrazione verra' saltato (lo dice pytest)." -ForegroundColor Yellow
}

"COLLAUDO CORSO AGENTI WEB - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Out-File $Esito -Encoding utf8
function Passo($Titolo, [scriptblock]$Comando) {
    Write-Host "== $Titolo"
    "`n==================== $Titolo ====================" | Out-File $Esito -Append -Encoding utf8
    $uscita = & $Comando 2>&1 | Out-String
    $codice = $LASTEXITCODE
    $uscita | Out-File $Esito -Append -Encoding utf8
    "codice d'uscita: $codice" | Out-File $Esito -Append -Encoding utf8
    Write-Host "   codice d'uscita: $codice"
    return $codice
}

$ErrorActionPreference = "Continue"
$t = Passo "TEST PYTHON (pytest + copertura)" { & $Py -m pytest -q -p no:cacheprovider --cov=corso --cov=strumenti --cov-report=term-missing tests }
$c = Passo "CONTROLLO CONTENUTI (rapporto di erogabilita')" { & $Py -c "import json; from corso.config import carica_config; from corso.catalogo import Catalogo; print(json.dumps(Catalogo(carica_config()).rapporto(), ensure_ascii=False, indent=1))" }
if (Get-Command node -ErrorAction SilentlyContinue) {
    $j = Passo "TEST ANIMAZIONI (Node)" { node tests_js\prova_animazioni.mjs }
} else {
    "`n==================== TEST ANIMAZIONI (Node) ====================`nSALTATO: Node non e' installato su questo PC (facoltativo)." | Out-File $Esito -Append -Encoding utf8
    Write-Host "== TEST ANIMAZIONI (Node): saltato, Node non installato (facoltativo)" -ForegroundColor Yellow
    $j = 0
}

Write-Host ""
Write-Host "Risultati scritti in: $Esito"
if ($t -eq 0 -and $c -eq 0 -and $j -eq 0) {
    Write-Host "TUTTO VERDE." -ForegroundColor Green
} else {
    Write-Host "QUALCOSA E' ROSSO: passa collaudo_esito.txt a Claude." -ForegroundColor Red
}
Write-Host ""
Write-Host "Lezioni interattive da provare (distintivo 'interattiva' nell'elenco a sinistra):" -ForegroundColor Cyan
& $Py -c "import sys; sys.stdout.reconfigure(encoding='utf-8'); from corso.config import carica_config; from corso.catalogo import Catalogo; c = Catalogo(carica_config()); [print('  ' + pid + '  ' + l.titolo.it) for pid, l in sorted(c.lezioni.items())]"
$Codice = & $Py -c "import json; print(json.load(open('config/piattaforma.json', encoding='utf-8'))['account']['codici_stub'][0])"
Write-Host ""
Write-Host "Per entrare nel corso: email = una qualsiasi (es. prova@esempio.it), codice = $Codice" -ForegroundColor Cyan
$scelta = Read-Host "Premi S per avviare il server, Q per uscire"
if ($scelta -match '^[sS]') {
    Write-Host "Server in avvio: per fermarlo premi Ctrl+C in questa finestra."
    Write-Host "Nessun browser si apre da solo: copia l'indirizzo della riga 'Apri nel tuo browser' nel browser che preferisci." -ForegroundColor Yellow
    $CodicePorta = & $Py -c "import json; print(json.load(open('config/piattaforma.json', encoding='utf-8'))['server']['codice_uscita_porta_occupata'])"
    & $Py server.py
    if ($LASTEXITCODE -eq [int]$CodicePorta) {
        Write-Host "La porta e' occupata da un altro server (vedi il messaggio sopra): chiudi quella finestra e rilancia." -ForegroundColor Red
    }
}
