# PROGRESSI — Corso Agenti Web

## Stato al 16/11/2026 — fase 2: upgrade delle 120 domande benchmark

### Fatto
1. **Tutte le 120 domande** (livello 1 + livello 2) portate nel formato della piattaforma: **131 domande erogabili su 131** (120 benchmark + 11 del dimostratore).
   - **Distrattori classificati tutti** (1004): 239 quasi giusti, 400 improbabili (`poco`), 365 errati. La classificazione decide il danno alla salute (config `salute.danno_per_tipo_distrattore`).
   - **Concetto principale** e **aiuto** assegnati a ogni domanda. Per le pillole senza lezione interattiva l'aiuto è un passo della scaletta (`scaletta-N`, prefisso in config `aiuti.prefisso_passo_scaletta`); per P1.3 e P4.1 è un segmento della lezione.
   - **Regola delle bande** applicata: 137 livelli riscritti aggiungendo distrattori (115 livelli 2 da 4 a 5 opzioni; 22 livelli con opzioni molto brevi portati a 7, con la composizione 1 + 2 quasi + 2 poco + 2 errate: 17 livelli 1 e 5 livelli 2). Testo della domanda e risposta corretta mai cambiati.
   - **Inglese completo** per domanda, opzioni e "perché" (registro semplice). Scritto anche il "perché" del livello 1 (prima mancava a tutte) e dei 117 livelli 2 che non lo avevano.
   - **Striscia** (punto di vista) per ogni domanda: 75 definizione, 24 esempio pratico, 14 diagnosi, 7 contro-esempio; assegnata anche alle 11 domande del dimostratore.
2. **Schema del corso v2** (`corso/modello.py`): campo `striscia` nelle domande, migrazione automatica da v1 (`corso/migrazioni.py`), schemi JSON rigenerati. Una domanda senza striscia non è erogabile (motivo dichiarato nel rapporto).
3. **Fonte di verità**: le domande ora vivono in `dati/corso_v1.json`; il documento benchmark resta l'origine storica. L'estrattore aggiorna solo moduli, pillole e knowledge graph e conserva le domande del JSON, dopo aver verificato che corrispondano ancora al documento (stessi id, stesso testo, stessa corretta); se no si ferma e nomina la domanda. Il test di riestrazione dal documento vero è stato aggiornato di conseguenza e passa.
4. **Webapp**: l'aiuto "passo di scaletta" apre la scheda scaletta ed evidenzia il passo.
5. **Fabbisogno di strisce** (`strumenti/fabbisogno_strisce.py` → `dati/fabbisogno_strisce.json`, obiettivo in config `percorso.strisce_obiettivo_autori` = 3).
6. **Test**: 133 (i 112 di prima, tutti verdi, + 21 nuovi su bande, classificazione completa, completezza, migrazione, aiuto su scaletta, estrattore, fabbisogno). Copertura 98%. Prove Node: 18.

### Test aggiornati (dichiarati)
I test che fotografavano lo stato "domande benchmark non erogabili" sono stati aggiornati al nuovo stato, mantenendo ciò che verificano: rapporto (131 erogabili), motivi di non erogabilità (ora su una domanda riportata allo stato grezzo), carenze di P1.1 (C01 e C03), 5+4 opzioni → bande 3/4/5/7, record e sblocco sequenziale (ora vanno superati tutti gli spicchi erogabili, non solo P1.3 e P4.1). Due test che sceglievano un distrattore "quasi" ora ne scelgono uno qualunque (non ogni domanda ha un "quasi").

### Fabbisogno di nuove domande (strisce)
- Spicchi erogabili oggi: **9 su 40** (P1.3, P2.2, P3.2, P3.3, P4.1, P5.1, P6.1, P6.4, P8.6). Gli altri 31 hanno 3 domande per 2-4 concetti: almeno un concetto resta sotto il minimo di 2.
- Concetti per numero di domande: 5 con 0, 35 con 1, 29 con 2, 9 con 3, 2 con 5-6.
- **45 nuove domande** per rendere erogabili tutti gli spicchi (minimo 2 per concetto); **114** per arrivare a 3 strisce per concetto.
- Elenco per spicchio (concetto +per erogare/+per obiettivo, punti di vista da scrivere): dettaglio completo in `dati/fabbisogno_strisce.json`.
  - Senza nessuna domanda: C01 (P1.1), C04, C07 in P1.2, C10 (P1.4), C15 (P1.5): servono 2 domande ciascuno.
  - Con una sola domanda (servono +1 per erogare, +2 per l'obiettivo): C03, C06, C11, C12, C13, C16, C18, C20, C23, C07 in P2.4, C24, C25, C26, C31, C33, C37, C39, C40, C42, C46, C48, C49, C51, C55, C56, C59, C62, C64, C66, C68, C70, C72, C74, C75, C78.
  - Punti di vista mancanti più frequenti: esempio pratico e contro-esempio (oggi il 62% delle domande è "definizione").

### Resta da fare
- Scrivere le 45 domande (poi le altre 69) indicate dal fabbisogno, con punti di vista diversi.
- Le lezioni nuove in costruzione (altro cantiere) devono dare `striscia` alle loro domande, altrimenti non sono erogabili.
- Testi lunghi delle pillole (obiettivo, scaletta, progetto animazione) ancora senza inglese tranne P1.3 e P4.1: in inglese l'aiuto "scaletta" di quelle pillole risponde "traduzione mancante".
- Revisione umana di France su un campione della classificazione dei distrattori e delle traduzioni.

## Stato al 16/11/2026 — fase 1: scheletro + dimostratore

### Fatto
1. **Repository pulito** in `C:\Claude_desktop\Game_Development\Corso_Agenti_Web\` (git locale, ramo `main`, `.gitignore` pronto per un repo GitHub distinto; `stato_studenti/` e `.venv/` esclusi).
2. **Modello dati** (`corso/modello.py`, schemi in `schema/`): corso → moduli → pillole → concetti; domande a 2 livelli con tipo di distrattore e spiegazione per opzione; lezioni con segmenti e scenario; ogni testo `{it, en}`.
3. **Estrazione del contenuto reale** dal documento benchmark (`strumenti/estrai_corso.py`):
   - `dati/corso_v1.json`: 8 moduli, 40 pillole, 120 domande (L1 a 5 opzioni, L2 a 4 con tipo e, dove presente, il perché);
   - `dati/knowledge_graph.json`: 79 concetti, 128 archi tipizzati con pesi letti dal documento (PRE 3, CON 2, MIT 2, APP 2, ES 1);
   - inglese: titoli di corso/moduli/pillole/animazioni e nomi dei concetti tradotti; testi lunghi tradotti solo per P1.3 e P4.1; il resto `en: null` (dichiarato "da completare").
4. **Server FastAPI** (`corso/app.py`, `server.py`): accesso stub email+codice con cookie HttpOnly, contenuti solo via API con intestazioni no-store, moduli delle animazioni protetti, stato studente su file, quiz a due livelli, salute, debriefing, ripasso, aiuti, record, generatore di percorso con seme.
5. **Webapp** (`webapp/`): accesso, mappa a bersaglio (anelli/spicchi con stato), elenco missioni, pannello pillola (lezione a segmenti + scaletta), quiz con riscontro spiegato e danno animato, convalescenza/ripasso, commutatore IT/EN.
6. **Dimostratore**: due lezioni interattive complete IT/EN con 11 domande conformi alle regole di France:
   - P1.3 "Che cos'è un agente AI": giro percepisce → ragiona → agisce → osserva, con obiettivo, dati del lead, situazione (già cliente, CRM guasto), limite di giri e confronto con lo script fisso;
   - P4.1 "Gli strumenti dell'agente": collega/scollega/guasta 5 strumenti, permesso di scrittura, agente onesto vs agente che inventa, busta che passa dal controllo dell'orchestrazione, esiti e spiegazioni.
7. **Test**: 112 test pytest (copertura 99%), 18 prove Node della logica delle animazioni, prova del flusso completo dell'interfaccia in un DOM simulato (jsdom) senza errori.

### Decisioni prese in autonomia (parametriche, da confermare)
- Le due lezioni del dimostratore sono agganciate alle pillole **P1.3** e **P4.1** del benchmark (campo `pillola` del file della lezione): le pillole e le domande del benchmark restano identiche.
- Valori di partenza in config: danno quasi/poco/errata = 8/15/25, livello 2 al 60%; salute dopo convalescenza 60; recupero per ripasso 10; ripasso a 24h/72h/7gg/14gg; soglia spicchio 70%; aiuti dopo 2 e 3 fallimenti consecutivi; fasce del budget di lettura ≤30/≤90/≤150/oltre caratteri medi.
- `politica_sblocco = "libero"` per il dimostratore (France apre subito le due pillole); in produzione `"sequenziale"`.

### Resta da fare (fasi successive)
- Classificare i distrattori delle 120 domande benchmark (quasi/poco/errata), assegnare il concetto principale e il segmento di aiuto, adattarle al budget di lettura (oggi tutte a 5+4 opzioni), tradurle in inglese.
- Scrivere le altre 38 lezioni interattive e il secondo/terzo set di domande per avere 2–7 strisce per concetto.
- Instradamento su errore verso uno spicchio collegato (archi CON/MIT/APP/ES) e ripartenza dopo n errori, come da PROGETTO_MASTER 4.4.2.
- Account veri (codice via email come CWEG), archivio su database, deploy.
- Telemetria per il confronto benchmark/gamificato (sezione 6 del documento benchmark).
- Revisione visiva delle animazioni su più schermi (qui verificate solo in DOM simulato, non a occhio).
