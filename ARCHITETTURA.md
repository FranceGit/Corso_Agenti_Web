# Architettura — Corso Agenti Web

Questo documento descrive i pezzi della piattaforma, che cosa fa ciascuno e dove finisce la sua responsabilità. Per le procedure operative vedi `MANUTENZIONE.md`; per la storia delle decisioni vedi `PROGRESSI.md`.

## 1. Il percorso di un contenuto

```
fonti (documento benchmark, lotti, traduzioni, lezioni)
   │  strumenti/estrai_corso.py, strumenti/inserisci_domande.py
   ▼
dati/*.json  ──validati da──▶  corso/modello.py  ──esporta_schema.py──▶  schema/*.schema.json
   │
   ▼
corso/catalogo.py   carica, incrocia, decide che cosa è EROGABILE (regole_domande.py)
   │
   ▼
corso/percorsi.py + corso/motore.py   percorso dello studente, quiz, salute, ripasso, aiuti
   │                 │
   │                 └── corso/stato.py   un file JSON per studente (stato_studenti/)
   ▼
corso/app.py   rotte HTTP dietro l'accesso  ──▶  webapp/ (shell)  +  /protetto/animazioni/<componente>.js
```

## 2. I pezzi e i loro confini

| Pezzo | File | Fa | Non fa |
|---|---|---|---|
| **Modello** | `corso/modello.py` (+ `migrazioni.py`) | Definisce con Pydantic corso → moduli → pillole → domande a due livelli, lezioni, knowledge graph. Valida id (`M`/`P`/`C` per il livello 1, `O`/`PO`/`CO` per il livello 2; vietato mescolarli), testi `{it, en}`, livello del corso. È l'unica fonte degli schemi JSON. | Non decide se una domanda si può servire: un dato può essere valido e non erogabile. |
| **Catalogo** | `corso/catalogo.py`, `corso/regole_domande.py` | Carica corso, knowledge graph e lezioni; li incrocia (concetti esistenti, aiuti che puntano a segmenti veri, lezioni agganciate a pillole vere); per ogni domanda decide l'erogabilità e, se no, scrive il motivo nel rapporto (`GET /api/rapporto`). | Non conosce gli studenti. |
| **Percorso** | `corso/percorsi.py` | Anelli (moduli, dall'esterno all'interno), spicchi (pillole, tutte presenti, ordine che dipende dal seme dello studente e rispetta i prerequisiti), strisce (domande, da 2 a 7 per concetto). Uno spicchio senza abbastanza domande è «in preparazione» e la carenza è dichiarata. Deterministico per seme. | Non salva nulla. |
| **Motore** | `corso/motore.py`, `corso/salute.py` | Tutte le azioni dello studente: inizio spicchio, domanda, risposta, livello 2, danno alla salute secondo il tipo di distrattore, convalescenza e debriefing, ripasso distanziato, aiuti (al secondo fallimento il segmento della lezione, al terzo la pillola), record. Le risposte corrette non escono mai prima della risposta: il client vede solo posizioni. | Non parla HTTP. |
| **Stato** | `corso/stato.py` | Un file JSON per studente, nome = impronta SHA-256 dell'email, scrittura atomica. | Non contiene l'email nel nome del file. |
| **App** | `corso/app.py`, `corso/account.py`, `corso/lingua.py` | Traduce HTTP ↔ chiamate del motore; accesso stub con cookie HttpOnly; intestazioni `no-store`; serve pubblicamente solo `index.html`, `app.js`, `app.css`; i moduli JS delle lezioni e della pagina esercizi solo da `/protetto/` con sessione; documentazione automatica dell'API disattivata. | Non serve mai `dati/` come cartella statica. |
| **Webapp** | `webapp/app.js`, `app.css`, `index.html`, `webapp/animazioni/*.js` | Shell (mappa a bersaglio, pillola, quiz, riepilogo, bibliografia, esercizi) e canone di lettura ①②③④ condiviso (`applicaCanone`). Ogni animazione è un modulo autonomo: logica pura esportata (provata in Node) + `monta`, nessun import, nessuna stringa visibile nel JS (i testi stanno nel JSON della lezione), CSS prefissato `.lz-<componente>`, deterministico (niente `Math.random` né date). | Le animazioni non chiamano il server. |
| **Esercizi** | `esercizi/` | Laboratorio (CRM SQLite per studente, posta locale o Mailpit, modello finto o Ollama dietro un registro), contratto dell'esercizio, correttore puro con verbale JSON e impronte, ricorrezione identica. Montati su `/api/esercizi` (1-6) e `/api/officina/esercizi` (7-12). La chiave di correzione e i dati nascosti non escono mai dal server. | Non toccano lo stato del corso. |

Configurazione: `corso/config.py` legge `config/piattaforma.json` con accesso stretto (una chiave mancante è un errore che la nomina). Errori: `corso/errori.py` (ogni errore dice che cosa manca e dove).

## 3. File generati e file di origine

Principio: **un file generato non si modifica a mano.** Si corregge la fonte e si rigenera. Una modifica manuale a un file generato sparisce alla rigenerazione successiva o rompe un controllo d'impronta.

| File | Tipo | Fonte | Strumento |
|---|---|---|---|
| `dati/corso_v1.json` — moduli, pillole (obiettivo, scaletta, progetto dell'animazione) | **generato** | `F:\A\CD\Game_Development\000_PROGETTO\CORSO_BENCHMARK_STRUTTURA.md` (italiano) + `strumenti/traduzioni_en_pillole.json` e `strumenti/titoli_en.json` (inglese) | `strumenti/estrai_corso.py` |
| `dati/knowledge_graph.json` | **generato** | documento benchmark (sezione 4.3 per i pesi) + `titoli_en.json` | `estrai_corso.py` |
| `dati/corso_v1.json` — domande d'autore (`origine: "autori"`, id `DA…`) | **generato** | `strumenti/domande_autori/lotto_m*.json` | `strumenti/inserisci_domande.py` |
| `dati/corso_v1.json` — 120 domande benchmark (id `D…`) | **eccezione dichiarata** | vivono nel JSON (inglese, classificazione dei distrattori, glossario, opzioni aggiunte con la regola delle bande esistono solo lì); il documento benchmark ne resta l'origine storica | `estrai_corso.py` le **conserva** e controlla l'impronta (id, testo italiano delle due domande, corretta, tipo del livello 2): se il documento è cambiato su una domanda si ferma e la nomina |
| `dati/officina/corso_officina.json` — domande | **generato** | `strumenti/domande_autori/lotto_o*.json` | `inserisci_domande.py` (riconosce i lotti `PO…`) |
| `dati/officina/corso_officina.json` — unità, pillole, scalette; `knowledge_graph_officina.json` | origine | — (l'estrattore non li tocca: per questo il livello 2 sta in file separati) | a mano |
| `dati/lezioni/*.json`, `dati/officina/lezioni/*.json` (comprese le 11 domande delle lezioni del dimostratore `ciclo_agente` e `strumenti_agente`) | origine | — | a mano |
| `dati/fabbisogno_strisce.json` | **generato** | corso + lezioni | `strumenti/fabbisogno_strisce.py` |
| `schema/*.schema.json` | **generato** | `corso/modello.py` | `strumenti/esporta_schema.py` (un test confronta gli schemi su disco con il modello) |
| `codespaces_modello/` | **generato** | `strumenti/codespaces/`, `esercizi/assistente/`, `esercizi/officina/materiale/` | `strumenti/prepara_codespaces.py` (un test ne verifica l'allineamento; `--verifica` esce con 1 se non allineata) |

Come lavorano i due strumenti principali:

- **`estrai_corso.py <documento>`** rilegge il documento benchmark, toglie le marcature `[corretto — fonte verificata: …]`, applica l'inglese dalle traduzioni, valida con il modello e scrive corso e knowledge graph. Se `corso_v1.json` esiste conserva tutte le domande del JSON (benchmark verificate per impronta, d'autore senza confronto).
- **`inserisci_domande.py [--verifica] <lotti>`** costruisce una copia del corso con le domande dei lotti, carica il catalogo vero su quella copia e scrive **solo** se ogni domanda è erogabile; altrimenti stampa il motivo per ciascuna e non cambia nulla. Una domanda con lo stesso id e origine `autori` viene sostituita (un lotto si corregge e si reinserisce). Rifiuta i lotti misti fra i due livelli.

Ordine quando si toccano entrambi: prima `inserisci_domande.py`, poi `estrai_corso.py` (che conserva le domande appena inserite).

## 4. Il Livello 2 «Officina»

### Perché file separati

`dati/corso_v1.json` e `dati/knowledge_graph.json` li riscrive `estrai_corso.py` dal documento benchmark: unità, pillole e concetti dell'Officina messi lì sparirebbero alla prossima estrazione. Quindi il livello 2 ha file propri in `dati/officina/` (`"livello": 2`, unità `O1`-`O6`, pillole `PO<u>.<n>`, concetti `CO<nn>`) e uno **stato studente separato** (`stato_studenti/officina`): salute, percorso e record dell'Officina non toccano quelli del livello 1.

### Stesso meccanismo, montato due volte

- `corso/officina.py` deriva una config per il livello 2 (`config_officina`) e definisce il cancello.
- `corso/app.py` crea un secondo `Catalogo` e un secondo `Motore` e monta le stesse rotte del percorso due volte: `monta_percorso("/api", …)` e `monta_percorso("/api/officina", …)` (stato, percorso, pillole, spicchi, risposta, debriefing, rapporto, rivedi, riepilogo). Gli indirizzi del livello 1 non sono cambiati.
- `GET /api/livelli` dà alla barra laterale i due livelli, lo stato del cancello e le unità con il loro esercizio.
- Nella webapp un solo punto di instradamento (`instrada` in `app.js`): con `S.livello === 2` le API del percorso e degli esercizi vanno su `/api/officina/…`. La voce «Livello 2 · Officina» sta in fondo alla barra laterale, dopo gli 8 moduli.

### Cancello

Config `officina.*` in `config/piattaforma.json`:

- `politica_sblocco: "dopo_livello1"`: l'Officina si apre quando il percorso del livello 1 è completo o è stato completato almeno una volta (un nuovo giro non la richiude). Vale per lezioni, domande ed esercizi. Motivo: l'Officina presuppone il vocabolario di M3, M4, M7 e M8.
- `deroga_alpha: true`: aperta finché `alpha.modalita_alpha` è attiva, e la vista lo dichiara («aperta per il collaudo»). Spenta la modalità alpha, il cancello torna attivo da solo.
- A cancello chiuso le rotte rispondono con l'errore esplicito `officina_bloccata` (spicchi superati su erogabili).

### Esercizi 7-12

| N. | Unità | Tema | Controllo bloccante |
|---|---|---|---|
| 7 | O1 | Dockerfile e compose da sistemare | chiave nell'immagine |
| 8 | O2 | repo adottato (patowari): correggere il classificatore | difetto non corretto, chiave nel repo |
| 9 | O3 | CRM enterprise (nebula): schemi e ruoli | — |
| 10 | O4 | configurazione di server MCP | radice del filesystem troppo larga |
| 11 | O5 | configurazione dell'assistente libero | chiave nel file |
| 12 | O6 | devcontainer di Codespaces | segreto scritto nel devcontainer |

- Stesso `MotoreEsercizi` e stessa pagina del livello 1, laboratorio proprio (`esercizi/config/officina.json`, stato `stato_esercizi/officina`), dietro il cancello.
- Un solo tipo di area, `officina` (`esercizi/officina/base.py`): materiale in sola lettura, file da sistemare, scelte chiuse (mai domande aperte), importazione del «pacchetto di consegna» prodotto in Codespaces.
- Il correttore legge i file **come testo** (`esercizi/officina/analisi.py`: Dockerfile, compose con PyYAML, requirements, JSON con commenti, forme di chiave). Non esegue Docker né altro.

### Banco isolato dell'esercizio 8

L'unico codice dello studente che viene eseguito è il `response_classifier.py` dell'esercizio 8, in `esercizi/officina/banco_classificatore.py`:

1. controllo dell'albero sintattico (import ammessi, niente `eval`/`exec`/`open`, niente attributi `__`);
2. esecuzione in un processo `python -I` isolato, con ambiente vuoto, tempo massimo e modello finto;
3. 8 casi fissi: il difetto («Not Interested» letto come «Interested»), la robustezza (minuscole, spazi, JSON fra ```), le regressioni.

Gli esiti entrano nella fotografia del tentativo: la correzione resta una funzione pura e la ricorrezione dà sempre lo stesso verbale. Dettagli del difetto in `CONTRATTO_CONTENUTI_OFFICINA.md` §5.

### Assistente libero (O5)

`esercizi/assistente/`, solo libreria standard. Una funzione per il chiamante, tre backend:

| Backend | Uso | Note |
|---|---|---|
| `finto` | predefinito, test e correttore | deterministico, senza rete né costi |
| `ollama` | modello locale | |
| `groq` | piano gratuito | chiave solo dalla variabile `GROQ_API_KEY`, mai in un file |

- Configurazione prima del codice: `assistente.json` con `_why`; il suo validatore è usato anche dal correttore dell'esercizio 11.
- Il backend si sceglie da fuori con `ASSISTENTE_BACKEND`, senza toccare il file.
- Errori parlanti per chiave mancante, 401/403, 429 (con retry-after), 404, rete assente. Mai un ripiego silenzioso, mai la chiave nei messaggi.

### Repo dello studente

`codespaces_modello/` (generata) contiene solo esercizi, materiale e assistente, con devcontainer e un `pacchetto.py` che produce il pacchetto di consegna da importare nel portale. `PUBBLICA_OFFICINA.cmd` la pubblica su `FranceGit/corso-officina` (privato).

## 5. Regole del progetto

1. **Config-first con `_why`.** Ogni numero e ogni scelta stanno in `config/piattaforma.json` (o nei file di config degli esercizi e dell'assistente) accompagnati da un `_why` che dice perché. Il codice non contiene valori di comodo. `null` significa «nessun vincolo», dichiarato in config, non dedotto dal codice.
2. **Errori espliciti, mai ripieghi silenziosi.** Una chiave di config mancante, un testo senza traduzione, una domanda non erogabile, un'Officina chiusa: ognuno produce un errore o un motivo che dice che cosa manca e dove. Il server non mostra mai l'italiano al posto dell'inglese. Una domanda non conforme resta nel modello, non viene servita, e il motivo sta nel rapporto. Unica eccezione dichiarata (nel `_why`): la bibliografia mostra le voci d'esempio con la scritta «Dati d'esempio» se manca `dati/bibliografia.json`.
3. **Grader deterministici.** Il correttore è una funzione pura della fotografia del tentativo: stesso lavoro, stesso verbale, anche ricorretto mesi dopo; le manomissioni sono rilevate dalle impronte. Le risposte del modello passano dal registro LLM (impronta della richiesta → risposta). Anche animazioni e percorso sono deterministici (seme).
4. **Licenze permissive.** Solo dipendenze gratuite con licenza MIT/BSD o simili, niente CDN, niente API a pagamento (Groq solo sul piano gratuito e solo per prove facoltative: tutti i test girano col backend finto). Il materiale di terzi entra solo con licenza compatibile e attribuzione; patowari, senza licenza, è il motivo per cui il repo studente è privato.
5. **Regola di France sul numero di risposte.** Più le opzioni sono lunghe, meno sono (`domande.budget_lettura`, misura = media dei caratteri delle opzioni in italiano):

   | Lunghezza media | Opzioni |
   |---|---|
   | fino a 30 caratteri | **7** |
   | 31-90 | **5** |
   | 91-150 | **4** |
   | oltre 150 | **3** |

   Con 7 opzioni la plausibilità è fissata: **1 corretta + 2 quasi + 2 poco + 2 errate** (`domande.composizione_plausibilita`). Ogni distrattore ha `tipo_distrattore` (`quasi`/`poco`/`errata`), da cui dipende il danno alla salute. La corretta non deve essere l'opzione più lunga (anti-indizio: un test pretende che lo sia in meno del 30% dei livelli).
6. **Due livelli a scelta multipla, mai domande aperte.** Livello 1 = la risposta, livello 2 = il perché. Ogni livello ha il suo `perche` e la spiegazione di ogni opzione. Vale anche per gli esercizi: scelte chiuse, file da sistemare, mai testo libero da valutare.
7. **Erogabilità.** Una domanda si serve solo se ha: distrattori classificati, numero di opzioni coerente con la fascia, `concetto_principale` fra i concetti della pillola, `striscia` (definizione, esempio pratico, contro-esempio, diagnosi), `segmento_aiuto` valido (segmento della lezione o `scaletta-N`), testi IT/EN completi.
8. **Lezioni.** Passi numerati con «Prova tu», ultimo segmento `riassunto` di 3 frasi, al massimo 500 parole (`regole_lezioni`). Esempi solo di marketing e CRM. Niente aziende citate come autorità («Google dice…»): le fonti si citano con la sigla della bibliografia. Numeri non presi dalle fonti dichiarati illustrativi a schermo.
9. **Protezione.** Contenuti solo via API dopo l'accesso; stato degli studenti mai nel repository.
