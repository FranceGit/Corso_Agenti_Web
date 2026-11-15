# PROGRESSI — Corso Agenti Web

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
