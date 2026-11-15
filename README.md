# Corso Agenti Web

Piattaforma web del corso **"Costruire agenti AI per CRM, marketing e lead generation"**, per persone di marketing e manager senza formazione tecnica.

- Erogazione **solo web**: i contenuti restano sul server e si vedono solo dopo l'accesso (nessun file da scaricare).
- Tutto **bilingue IT/EN** nel modello dati; se un testo manca in una lingua il server lo dichiara (mai l'altra lingua al suo posto).
- La lezione **è** l'animazione interattiva: lo studente cambia i comandi e vede l'agente comportarsi in modo diverso.
- Verifiche **mai aperte**: livello 1 (la risposta) e livello 2 (il perché), entrambi a scelta multipla.
- **Salute** al posto del punteggio, **record personale** al posto delle classifiche.
- **Config-first**: ogni numero sta in `config/piattaforma.json` con il suo `_why`; nessun valore di ripiego silenzioso.

## Provarlo (Windows, PowerShell)

Un solo comando: crea l'ambiente, installa, esegue i test, poi chiede se avviare il server.

```powershell
powershell -ExecutionPolicy Bypass -File C:\Claude_desktop\Game_Development\Corso_Agenti_Web\collaudo.ps1
```

Il browser **non** si apre da solo: il server stampa `Apri nel tuo browser: http://127.0.0.1:8780`. Per entrare: email qualsiasi, codice `DEMO-AGENTI` (stub, in `config/piattaforma.json` → `account.codici_stub`). L'esito dei test finisce in `C:\Claude_desktop\Game_Development\Corso_Agenti_Web\collaudo_esito.txt`.

## Struttura

| Percorso | Contenuto |
|---|---|
| `config/piattaforma.json` | tutti i parametri (salute, budget di lettura, percorsi, aiuti, ripasso, account, protezione) con `_why` |
| `config/interfaccia.json` | testi dell'interfaccia IT/EN |
| `dati/corso_v1.json` | 8 moduli, 40 pillole, 120 domande estratte dal documento benchmark |
| `dati/knowledge_graph.json` | 79 concetti, 128 archi tipizzati (PRE/APP/CON/ES/MIT) con pesi |
| `dati/lezioni/*.json` | lezioni interattive complete (testi, scenario dell'animazione, domande) |
| `schema/*.schema.json` | schemi JSON generati dal modello (`strumenti/esporta_schema.py`) |
| `corso/` | modello dati, catalogo, regole delle domande, generatore di percorso, salute, motore, account, server |
| `webapp/` | shell pubblica (`index.html`, `app.js`, `app.css`) |
| `webapp/animazioni/` | moduli delle animazioni, serviti solo dopo l'accesso da `/protetto/animazioni/` |
| `strumenti/estrai_corso.py` | estrattore dal documento benchmark (`titoli_en.json`, `traduzioni_en_pillole.json` per l'inglese) |
| `tests/`, `tests_js/` | test pytest e test Node della logica delle animazioni |
| `server.py` | avvio del server locale (controlla la porta, stampa l'indirizzo) |
| `collaudo.ps1` | collaudo in un comando |
| `PROGRESSI.md` | stato del lavoro |

## Come funziona, in breve

- **Erogabilità.** Una domanda viene servita solo se rispetta tutte le regole: distrattori classificati (quasi/poco/errata), numero di opzioni coerente con il budget di lettura (3/4/5/7 secondo la lunghezza media), composizione 1+2+2+2 per le domande a 7 opzioni, concetto principale, segmento di aiuto, testi completi in IT e EN. Le 120 domande del benchmark sono nel modello ma non ancora erogabili: il motivo è nel rapporto (`GET /api/rapporto`, e nel collaudo).
- **Percorso.** Anelli (moduli) dall'esterno all'interno; spicchi (pillole) tutti presenti, in un ordine che dipende dal seme dello studente, rispetta i prerequisiti e preferisce i legami forti del knowledge graph; strisce (domande) da 2 a 7 per concetto. Uno spicchio senza abbastanza domande è "in preparazione" e la carenza è dichiarata.
- **Salute.** Passaggio pulito: nessun danno. Correzione: danno secondo il tipo di distrattore scelto (ridotto al livello 2). A zero: convalescenza con debriefing, poi si riparte. Il ripasso distanziato (24h, 72h, 7gg, 14gg) fa recuperare salute.
- **Aiuti.** Due fallimenti consecutivi sullo stesso concetto: il segmento pertinente della lezione; al terzo: la pillola intera.
- **Protezione.** Contenuti solo via API dopo l'accesso (cookie HttpOnly), intestazioni `no-store`, nessuna cartella `dati/` servita, documentazione automatica dell'API disattivata. Nota onesta: ciò che il browser mostra può sempre essere fotografato; la protezione impedisce la distribuzione dei file, non la visione.

## Comandi utili (dalla cartella del progetto, ambiente `.venv`)

Rigenerare i dati dal documento benchmark:

```powershell
C:\Claude_desktop\Game_Development\Corso_Agenti_Web\.venv\Scripts\python.exe C:\Claude_desktop\Game_Development\Corso_Agenti_Web\strumenti\estrai_corso.py F:\A\CD\Game_Development\000_PROGETTO\CORSO_BENCHMARK_STRUTTURA.md
```

Rigenerare gli schemi JSON dopo una modifica al modello:

```powershell
C:\Claude_desktop\Game_Development\Corso_Agenti_Web\.venv\Scripts\python.exe C:\Claude_desktop\Game_Development\Corso_Agenti_Web\strumenti\esporta_schema.py
```

## Licenze

Solo dipendenze gratuite e permissive: FastAPI (MIT), Uvicorn (BSD), Pydantic (MIT), HTTPX (BSD), pytest (MIT). Nessuna libreria o font da CDN: tutto è servito localmente.
