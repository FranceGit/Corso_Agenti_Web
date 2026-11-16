# PROGRESSI — Corso Agenti Web

## Stato al 16/11/2026 — cantiere OFFICINA-CONTENUTI (livello 2: 12 lezioni interattive, 51 domande, test estesi, pulizia residua del livello 1)
Commit `d3f4215` (contenuti dell'Officina), `0a0bdbc` (pulizia del livello 1) e il commit finale di questa sezione. Lavoro diviso in 6 agenti, uno per unità; inserimento delle domande, fusioni nel corso e commit fatti solo dal coordinatore, in sequenza.

### Fatto — lezioni (una per pillola, IT+EN, tutte sotto le 500 parole, riassunto finale in 3 frasi)
| Pillola | Componente | Parole IT | Passi | Che cosa si manipola |
|---|---|---|---|---|
| PO1.1 | `pila_strati` | 451 | 5 | Dockerfile come pila di strati: modifica un file o l'ordine delle righe e guarda la ricostruzione a cascata (41 s contro 1 s); tag, utente root, chiave in ENV che resta in «docker history»; un'immagine e tre container; «Trova il difetto». |
| PO1.2 | `container_smemorato` | 452 | 5 | POST, restart, down, down -v con nessun volume, anonimo o nominato; compose CRM+Postgres con porte su 0.0.0.0 o 127.0.0.1 e linea del tempo dell'healthcheck; «Trova il difetto» su un compose ispirato a patowari. |
| PO2.1 | `mappa_repo` | 487 | 5 | Albero vero del repo patowari: aprire i file nell'ordine giusto (ingresso, dipendenze, configurazione, flusso), lente con le righe vere e 6 indizi, «Esegui subito» senza chiave, un lead seguito in 7 tappe fino a «Interested: 5, Not Interested: 0». |
| PO2.2 | `filtro_bucato` | 494 | 5 | Dipendenze oggi e fra sei mesi; chiave nel repo, nell'ambiente o assente, modello vero o finto; 8 casi tipo nei cesti secondo ordine dei controlli, confronto e normalizzazione (repo 5/8, solo ordine 7/8, ordine+normalizzazione 8/8); rosso → correzione → verde. |
| PO3.1 | `pianta_crm` | 431 | 5 | Pianta di nebula-insurance-crm: domande concrete che illuminano la sezione del BLUEPRINT, l'ADR o la matrice dove sta la risposta; moduli e proprietà delle entità; classificare frasi in blueprint, architettura, decisione, codice. |
| PO3.2 | `contratto_parti` | 480 | 5 | Richiesta POST /contacts contro il vero `contact-create-request.schema.json` (modulo web, API, database; deriva delle regole copiate a mano), risorsa salvata con i campi del server; 7 compiti da affidare ai ruoli di nebula-agents. |
| PO4.1 | `tre_prese` | 468 | 5 | Configurazione `mcpServers` che si compone riga per riga; richieste del CRM verso filesystem, fetch e memory con gli strumenti veri, o fermate alla presa vuota, allo strumento assente in sola lettura, a `MEMORY_FILE_PATH`. |
| PO4.2 | `recinto_mcp` | 486 | 6 | Radici consentite (/, home, cartella di lavoro) e sola lettura contro 6 richieste, con i messaggi d'errore veri del server; memoria nel container o nel volume; pagina scaricata che ordina di inviare il `.env`. |
| PO5.1 | `commutatore_backend` | 464 | 5 | Una sola funzione per il chiamante, backend scelto da `assistente.json` e `ASSISTENTE_BACKEND`; errori dove nascono; il finto risponde sempre uguale; «dettagli sparsi» (4 chiamanti da toccare contro 0). |
| PO5.2 | `silenzio_costoso` | 447 | 5 | Dove vive la chiave e chi la vede; guasti (chiave mancante, 401, 429, 404, rete) con l'assistente che parla contro il ripiego silenzioso di patowari (50 «Medium», email vuote inviate); limiti al minuto del piano gratuito. |
| PO6.1 | `valigia_lab` | 455 | 5 | `devcontainer.json` come valigia (immagine, docker-in-docker, estensioni, postCreateCommand, porte, segreti dichiarati); il codespace che si riapre riga per riga con l'esito di ogni mancanza; il file da sistemare dell'esercizio 12. |
| PO6.2 | `contatore_ore` | 486 | 6 | Calendario di 30 giorni con ore-core e GB-mese (120 e 15, dichiarati da riverificare): core, ore al giorno, arresto per inattività, codespace fermi, limite di spesa; O1-O5 nel codespace. |

- Ogni animazione: banco a tre finestre (la shell numera ①②③④, illumina e scrive «Hai cambiato…»), esiti dentro la scena, sequenza rilanciabile da «Rivedi l'animazione», logica pura esportata, nessuna stringa visibile nel JS, CSS prefissato `.lz-<componente>`.
- Progetto delle animazioni scritto in `corso_officina.json`; scalette riallineate alle lezioni in PO3.1, PO4.2, PO5.1 (il codice usa `chiedi`, non «completa»), PO5.2 (limiti al minuto, non al giorno) e PO6.2.
- Bibliografia: aggiunte DOCKER-DOC, NEBULA-CRM, NEBULA-AGENTS, MCP-SERVERS, CODESPACES-DOC, ASSISTENTE-OFFICINA, LAB-L1; REPO-PATOWARI sta nella voce esistente [R11] (stessa opera). Nessun URL.

### Fatto — domande (lotti `strumenti/domande_autori/lotto_o1_docker.json` … `lotto_o6_codespaces.json`, inseriti con `inserisci_domande.py`)
| Unità | Domande | Concetti (3 ciascuno, strisce diverse) |
|---|---|---|
| O1 | 12 | CO01, CO02, CO03, CO04 |
| O2 | 9 | CO05, CO06, CO07 |
| O3 | 9 | CO08, CO09, CO10 |
| O4 | 6 | CO11, CO12 |
| O5 | 9 | CO13, CO14, CO15 |
| O6 | 6 | CO16, CO17 |
| **Totale** | **51 erogabili** (obiettivo raggiunto) | 17 concetti |

- 102 livelli: 21 a 7 opzioni (sempre 2 quasi + 2 poco + 2 errate), 57 a 5, 17 a 4, 7 a 3.
- Corretta più lunga in 7 livelli su 102 (0,069; limite 0,30); posizione della corretta distribuita.
- Spiegazione per ogni opzione, glossario su tutte le 51 domande, stesso termine = stessa definizione (unificati 4 termini che due unità definivano in modo diverso). Aiuto sempre su un passo della lezione.

### Fatto — test
- `tests_js/prova_animazioni.mjs` e `tests_js/misura_testi.mjs` leggono le lezioni da entrambe le cartelle (prese dalla config); `misura_testi` carica jsdom da `JSDOM_DIR` se impostata. Prove per componente in `tests_js/lezioni/<componente>.mjs` (12 file nuovi).
- Nuovo `tests/test_lezioni_officina.py` (20 test): una lezione per pillola, passi e riassunto, parole, concetti tutti trattati, niente rimandi né autorità citate, elenchi puntati in IT e EN, moduli JS autonomi con le loro prove, serviti dopo l'accesso e da `/api/officina/pillole`, sigle in bibliografia, spicchi erogabili, 3 domande per concetto da strisce diverse, corso = lotti, glossario coerente, anti-indizio e fasce.
- Test aggiornati (dichiarati): in `tests/test_officina.py` le asserzioni «nessuna domanda / nessuna lezione / 409 a inizio spicchio / spicchi in preparazione» ora chiedono il contrario (51 domande, 12 lezioni, 200, nessuno spicchio in preparazione); in `esercizi/collaudo/flusso_officina.mjs` il passo «12 spicchi in preparazione» diventa «12 spicchi, nessuno in preparazione».
- Esiti: pytest `tests` 230 superati e 1 saltato (a lotti); con `CORSO_BENCHMARK_MD` il test di riproducibilità dell'estrazione passa (0 saltati). `esercizi/tests` 214 superati. Node: `prova_animazioni` 750, `misura_testi` 118. `prepara_codespaces.py --verifica`: allineato.
- Browser simulato contro il server vero (script in `outputs\officina_contenuti\collaudo\`):
  - 12 lezioni dell'Officina in IT e in EN: 74 passi e 1.113 azioni per lingua, canone ①②③④ senza numeri ripetuti, bordo illuminato e messaggio-guida in tutte le 12, «Rivedi l'animazione» due volte per passo, 0 difetti;
  - percorso domande completo: PO2.2 in IT (7 risposte, «Spicchio superato!») e PO4.1 in EN, con una risposta sbagliata voluta, riepilogo, riquadro «Termini», salute del livello 1 invariata (100): 0 difetti;
  - `flusso_officina.mjs`: 34 passi, 0 errori; lezioni del livello 1 ritoccate (P4.2, P6.1, P6.2, P8.2) in IT e EN: 0 difetti.

### Fatto — pulizia residua del livello 1
- (a) OpenAI non è più citato come autorità in `smistatore_rischio` e `uno_o_tanti` (IT+EN): formulazioni neutre con la sigla [OAI]. Stessa correzione per gli stessi giri di frase in `schemi_orchestrazione` («OpenAI distingue…») e `strumento_chiaro` («Secondo OpenAI…»). Restano, perché sono fatti e non appelli: «MCP presentato da Anthropic» (presa_standard) e la cifra del 98,7% attribuita alla sua fonte (valigia_strumenti). Le sigle nei perché (WP1, SEC…) restano.
- (b) 16 voci di scaletta che erano note d'autore riscritte per lo studente nel documento benchmark (con una nota in testa) e in `strumenti/traduzioni_en_pillole.json`: P1.3/6, P4.2/6 («confrontare con il testo scaricato»), P4.3/5, P5.1/5, P5.2/6, P5.3/5, P6.2/5, P6.3/4, P7.1/5, P7.2/6, P7.3/3 e /5, P7.4/2, P8.1/6, P8.2/4 e P8.3/1 («non verificato a fondo»). Ora sono rimandi «Per approfondire» con la sigla ([G2]-[G5], [NB1b]-[NB5a]) o frasi con la sigla della fonte. `estrai_corso.py` rigenerato: cambiano solo queste 16 voci (IT+EN), 298 domande conservate. Copia del documento prima delle modifiche: `outputs\officina_contenuti\CORSO_BENCHMARK_STRUTTURA.prima_officina_contenuti.md`.

### Da sapere
- In PO2.2 la lezione dice che i controlli «contiene» vanno dal più specifico al più generale e che serve normalizzare: è il principio, non il codice. Il classificatore corretto non è mai mostrato, ma la correzione minima si intuisce: se si vuole un esercizio 8 più difficile, togliere quella frase.
- Dati illustrativi dichiarati a schermo: secondi di build e tempi del database (O1), Postgres nel compose d'esempio (il CRM minimo usa un file JSON), messaggio pydantic ricostruito e tre giri del modello vero (O2), retry-after e messaggi di rete (O5), GB per codespace (O6, il materiale non lo dice).
- Restano citazioni OpenAI nelle domande benchmark di `corso_v1.json` (es. «Secondo OpenAI, quando una soluzione a regole fisse può bastare?»). Non toccate: il testo della domanda benchmark fa parte dell'impronta che l'estrattore controlla. Va deciso se neutralizzarle.
- Proposte di testo per gli esercizi (non applicate): e07 il commento del Dockerfile dice «5 difetti», la consegna ne elenca 4; e08 aggiungere «invio» alle tappe del flusso; e09 aggiungere `contact.schema.json` al materiale; e10 la lezione rende facile la scelta `sola_lettura` e il LEGGIMI potrebbe dire che i segreti non vanno nella radice consentita.

### Resta da fare
- France: giro a mano nel browser vero delle 12 lezioni dell'Officina (IT e EN) e di uno spicchio di domande; revisione di testi e domande.
- Decisione sulle citazioni OpenAI nelle domande benchmark.

## Stato al 16/11/2026 — cantiere OFFICINA-FONDAMENTA (livello 2 «Officina»: impalcatura, esercizi 7-12, assistente libero, kit Codespaces)
Commit `1dfc05c`, `ecb3664`, `8bda412` e il commit finale di questa sezione. Perimetro: impalcatura ed esercizi. **Non** scritti testi delle lezioni né domande, che spettano al cantiere contenuti secondo `CONTRATTO_CONTENUTI_OFFICINA.md`.

### Scelte architetturali (e perché)
- **Il livello 2 è un secondo catalogo con un secondo motore, non altri moduli in `corso_v1.json`.**
  - File propri: `dati/officina/corso_officina.json` (`"livello": 2`, unità O1-O6, 12 pillole PO<u>.<n>), `knowledge_graph_officina.json` (17 concetti CO<nn>), `lezioni/`.
  - Motivo: `corso_v1.json` e `knowledge_graph.json` li rigenera `estrai_corso.py` dal documento benchmark.
  - Stato studente separato (`stato_studenti/officina`): salute, percorso e record dell'Officina non toccano quelli del livello 1.
- **Riuso totale del meccanismo.** `corso/officina.py` deriva la config (`config_officina`) e `corso/app.py` monta le stesse rotte del percorso due volte (`monta_percorso("/api", …)` e `monta_percorso("/api/officina", …)`).
  - Gli indirizzi del livello 1 sono invariati.
  - Quando il cantiere contenuti inserirà lezioni e domande, si giocheranno senza altro codice.
- **Modello** (`corso/modello.py`, schemi rigenerati con `esporta_schema.py`, `git diff schema/` contiene solo questi cambi):
  - `Corso.livello` (1|2, predefinito 1: i file del livello 1 restano validi così come sono);
  - id `[MO]n`, `PO?n.n`, `CO?nn`;
  - un validatore impedisce di mescolare i prefissi fra i livelli.
- **Cancello** (`config/piattaforma.json` → `officina`, con `_why`):
  - `politica_sblocco: "dopo_livello1"`: l'Officina si apre a percorso del livello 1 completo, oppure completato almeno una volta (un nuovo giro non la richiude). Vale per lezioni, domande **ed** esercizi.
  - `deroga_alpha: true`: aperta finché `alpha.modalita_alpha` è attiva, e la vista lo dichiara («aperta per il collaudo»). In beta il cancello torna attivo da solo.
  - Motivo: l'Officina usa il vocabolario di M3/M4/M7/M8; aperta prima, gli esercizi sarebbero ricette senza perché.
- **Esercizi 7-12**: stesso `MotoreEsercizi` e stessa pagina, ma laboratorio proprio (`esercizi/config/officina.json`, stato `stato_esercizi/officina`), montato su `/api/officina/esercizi` dietro il cancello.
  - I test esistenti degli esercizi 1-6 restano identici.
  - Tipo di area unico `officina` (`esercizi/officina/base.py`): materiale in sola lettura, file da sistemare, scelte chiuse (mai domande aperte), importazione del «pacchetto di consegna» prodotto in Codespaces.
- **Correttore deterministico**:
  - i file si leggono come testo (`esercizi/officina/analisi.py`: Dockerfile, compose con PyYAML, requirements, JSON con commenti, forme di chiave);
  - l'unico codice eseguito è il `response_classifier.py` dell'esercizio 8, nel **banco** (`banco_classificatore.py`): controllo dell'albero sintattico, processo `python -I` isolato con ambiente vuoto, tempo massimo, modello finto, 8 casi fissi;
  - gli esiti stanno nella fotografia, quindi la correzione resta pura e la ricorrezione identica.
- **Webapp** (minima):
  - in `app.js` un solo punto di instradamento (`instrada`: con `S.livello === 2` le API del percorso e degli esercizi vanno su `/api/officina/…`);
  - in fondo alla barra laterale, **dopo gli 8 moduli**, la voce «Livello 2 · Officina» (lucchetto e motivo se chiusa) e, dentro l'Officina, «Torna al livello 1»;
  - mappa, pillole, quiz, debriefing ed esercizi sono le viste di sempre;
  - in `esercizi.js` il disegno dell'area `officina` (con bozze conservate fra un ridisegno e l'altro).
  - `app.css` non è toccato.
- **Assistente libero O5** (`esercizi/assistente/`, solo libreria standard):
  - backend `finto` (predefinito, deterministico), `ollama` e `groq` (piano gratuito, chiave solo da `GROQ_API_KEY`);
  - configurazione prima del codice (`assistente.json` con `_why`, validatore usato anche dal correttore dell'esercizio 11), backend scelto da fuori con `ASSISTENTE_BACKEND`;
  - errori parlanti per chiave mancante, 401/403, 429 (con retry-after), 404, rete assente; mai un ripiego silenzioso, mai la chiave nei messaggi.
- **Kit Codespaces**:
  - `codespaces_modello/` è **generata** da `strumenti/prepara_codespaces.py` partendo da `strumenti/codespaces/` (devcontainer, README, requirements fissati, .gitignore, pytest, `pacchetto.py`), dall'assistente e dal materiale di O1-O6. Contiene solo esercizi e assistente, niente corso.
  - Un test ne verifica l'allineamento con le fonti.
  - `PUBBLICA_OFFICINA.cmd` in radice:
    - crea FranceGit/corso-officina **privato** (con gh se c'è, altrimenti curl sull'API) e ci pubblica la cartella con git via HTTPS, senza mai un push forzato;
    - il token si innesta al posto di `<INCOLLA_QUI_IL_TOKEN_GITHUB>` oppure arriva da `OFFICINA_GITHUB_TOKEN`;
    - il token non viene mai stampato: lo passa un aiutante delle credenziali da variabile d'ambiente, non finisce nell'URL e i comandi di rete sono zittiti;
    - CRLF garantito da `.gitattributes`.

### Difetto reale di patowari (dettagli in CONTRATTO §5)
`app/agents/response_classifier.py` controlla `"Interested" in status_str` prima di `"Not Interested"`. Ogni «Not Interested» diventa INTERESTED: il report del repo stesso dice «Interested: 5, Not Interested: 0». L'esercizio 8 lo verifica col banco come controllo bloccante. Documentati altri 8 difetti reali secondari, fra cui il ripiego silenzioso di `LLMService` (chiave scaduta = punteggio 50 per tutti ed email vuote inviate) e il `.gitignore` che ignora `.env.example`. Il repo **non ha licenza**.

### Esercizi (partenza → soluzione di riferimento)
| N. | Unità | Partenza | Soluzione | Bloccanti |
|---|---|---|---|---|
| 7 | O1 Docker | 0 | 100 | chiave nell'immagine |
| 8 | O2 repo adottato | 0 | 100 (solo l'ordine invertito: supera, perde la robustezza) | difetto non corretto, chiave nel repo |
| 9 | O3 nebula | 13 | 100 | — |
| 10 | O4 MCP | 0 | 100 | radice del filesystem troppo larga |
| 11 | O5 assistente | 0 | 100 | chiave nel file |
| 12 | O6 Codespaces | 0 | 100 | segreto scritto nel devcontainer |

### Collaudo
- pytest `tests`: 200 test preesistenti verdi (1 saltato) più 12 nuovi in `tests/test_officina.py` (211 superati in tutto).
- pytest `esercizi/tests`: 143 preesistenti più 71 nuovi (214 in tutto), fra `test_officina.py`, `test_assistente.py` e `test_officina_kit.py`.
- Prove Node: `prova_animazioni.mjs` 548 e `misura_testi.mjs` 94, invariate e verdi.
- Browser simulato contro il server vero:
  - `esercizi/collaudo/flusso_officina.mjs`: 34 passi, 0 errori, ripetuto 3 volte (livello 2 dopo gli 8 moduli, unità, esercizio 8 corretto nel browser, pacchetto importato fino a 100 nel 7, inglese, ritorno al livello 1);
  - `flusso_browser.mjs` del livello 1: 182 passi, 0 errori.
- Nel repo studente: `pytest tests` verde senza rete; `pytest officina/o2` rosso finché il difetto c'è (voluto).
- **Difetto trovato e riparato dal collaudo**: alla prima apertura dell'Officina stato e percorso partivano in parallelo e la doppia creazione del file di stato dava un 500 casuale. Ora lo stato dell'Officina nasce all'accesso; il test di regressione è in `tests/test_officina.py`.

### Da sapere
- `requirements.txt` ora comprende `pyyaml` (MIT) per leggere i compose consegnati: sul PC di France serve `pip install -r requirements.txt`.
- jsdom va installato su disco locale (`JSDOM_DIR`): dalla cartella di rete il solo `require("jsdom")` supera i 100 secondi.
- I modelli gratuiti di Groq e i numeri del piano gratuito di Codespaces sono quelli noti a novembre 2026. Sono dichiarati «da riverificare» nei `_why`: l'elenco dei modelli si cambia in un solo punto per il correttore (`esercizi/config/officina.json`).
- Le soluzioni di O5 e O6 sono visibili nel repo studente (`assistente/assistente.json`, `.devcontainer/devcontainer.json`): sono i file veri che fanno funzionare il laboratorio. Gli esercizi chiedono di sistemare le copie difettose e di capire perché.
- Mai eseguiti in sandbox: Docker, Codespaces, Groq vero, `PUBBLICA_OFFICINA.cmd` (che richiede Windows, git e il token di France).

### Resta da fare
- **Cantiere contenuti** (contratto in radice): 12 lezioni con componenti JS e prove, almeno 34 domande (obiettivo 51) in IT+EN, test delle lezioni estesi a `dati/officina/lezioni/`.
- France:
  - creare il token ed eseguire `PUBBLICA_OFFICINA.cmd`;
  - aggiungere il segreto `GROQ_API_KEY` in Codespaces;
  - decidere sulla licenza di patowari prima di un eventuale repo pubblico.
- Prova a mano in un Codespace vero: devcontainer, docker-in-docker, O1/O2 con Docker vero.

## Stato al 16/11/2026 — cantiere CONTENUTI-REV (segnalazioni France 4, 8, 9, 10)
Commit `8197bd4` (domande) e `4e9a195` (lezioni, scalette, bibliografia). Perimetro: contenuti. Non toccati webapp, server, `corso/modello.py` (il campo `glossario` c'era già, ALPHA-FIX `74f9e7b`).

- **OpenAI non piu' citata come autorita' nelle domande (decisione France, 16/11/2026):** 6 domande neutralizzate (IT+EN) con formula generica e sigla [OAI]: DA1.1-3, DA1.1-4, DA1.4-5, DA1.5-6 e DA4.4-2 (solo il «perche'»), DA1.5-5 (testo del livello 2 e «perche'»). Opzioni e risposte corrette invariate. Il documento benchmark non contiene queste domande (sono d'autori): non toccato; modificati `dati/corso_v1.json` e i lotti `lotto_m1.json` e `lotto_m2_m4_senza_m3.json`. `estrai_corso.py`: 298 domande conservate; `inserisci_domande.py --verifica`: 57/57 erogabili; pytest `tests` 230 superati e 1 saltato (a lotti).

### Dove si corregge (vincolante)
- **Domande autori**: nei lotti `strumenti/domande_autori/lotto_*.json`, poi `python strumenti/inserisci_domande.py strumenti/domande_autori/*.json`.
- **Domande benchmark**: il docstring di `estrai_corso.py` dice che la loro fonte di verità è `dati/corso_v1.json`. Lì vivono inglese, classificazione, glossario e le opzioni aggiunte con la regola delle bande. Il documento benchmark ha solo l'italiano originale. Per questo la correzione va nel JSON e, per le opzioni che esistono anche nel documento, con lo stesso testo italiano nel documento (`F:\A\CD\Game_Development\000_PROGETTO\CORSO_BENCHMARK_STRUTTURA.md`, con una nota in testa). L'estrattore controlla l'impronta (testo della domanda, corretta, tipo di livello 2), che resta invariata.
- **Pillole** (obiettivo, scaletta, animazione): documento (IT) + `strumenti/traduzioni_en_pillole.json` (EN), poi `python strumenti/estrai_corso.py <documento>`.
- **Lezioni**: `dati/lezioni/*.json` (sono già file di origine).

### Fatto
- **(4) Distrattori**, rivisti su tutte le 298 domande: 616 riscritti in IT+EN (386 benchmark, 230 autori), con il tipo riassegnato (76 cambiano tipo) e 9 riclassificati senza riscrittura. Riempitivi tolti: meteo, colori di logo, dashboard e interfaccia, «il CRM si blocca», emoji, voto su Google, giorno della settimana. Al loro posto c'è un fraintendimento preciso. Risposte corrette, testi delle domande benchmark, lettere e numero delle opzioni sono invariati. Composizione 2/2/2 sui livelli a 7 opzioni e fasce del budget di lettura rispettate. Anti-indizio (corretta più lunga) a 0,160 (limite 0,30). Riscritte anche le spiegazioni per opzione dei distrattori cambiati. Dei 386 distrattori benchmark, 381 sono aggiornati anche nel documento; gli altri esistono solo nel JSON (regola delle bande).

  | Modulo | Distrattori riscritti | Riclassificati | Domande con distrattori nuovi | Domande con glossario (voci) |
  |---|---|---|---|---|
  | M1 | 93 | 0 | 41/51 | 49 (102) |
  | M2 | 72 | 1 | 23/26 | 26 (51) |
  | M3 | 76 | 0 | 25/33 | 33 (65) |
  | M4 | 68 | 1 | 27/35 | 33 (62) |
  | M5 | 63 | 2 | 27/37 | 37 (66) |
  | M6 | 69 | 0 | 23/26 | 21 (49) |
  | M7 | 68 | 1 | 34/40 | 40 (92) |
  | M8 | 107 | 4 | 44/50 | 48 (86) |
  | **Totale** | **616** | **9** | **244/298** | **287 (573)** |

  Dieci esempi prima → dopo (tipo):
  1. DA1.4-9 L2 d: «Il meteo del giorno in cui la cliente ha scritto» → «L'umore della cliente in quella singola chat» (poco: conserva un dato passeggero invece di una preferenza stabile).
  2. D2.1-a L1 C: «La lunghezza massima» (errata) → «Il formato di uscita» (poco: confonde il formato con un vincolo di comportamento).
  3. D3.1-a L1 D: «Il colore della dashboard» (poco) → «Come il passo ragiona al suo interno» (errata: crede che il contratto dati descriva l'interno, non l'interfaccia).
  4. DA3.1-4 L1 C: «Il voto su Google» → «Il nome azienda» (poco: una stessa azienda ha più persone).
  5. D4.3-a L1 A: «La scarsa qualità dei testi generati» (poco) → «La sicurezza dei collegamenti tra agenti e sistemi» (errata: crede che lo standard MCP garantisca la sicurezza).
  6. D5.3-b L1 C: «La procedurale riguarda solo le immagini» → «La procedurale conserva lo storico delle sessioni» (poco: confonde memoria procedurale e sessione).
  7. D6.4-a L1 C: «Un ritardo nella consegna delle email» → «Un errore di un agente che blocca tutti i successivi» (quasi: crede che la catena si fermi, invece prosegue sbagliando).
  8. D7.1-b L1 C: «Il colore dell'interfaccia» → «Se il risultato finale è corretto o no» (poco: confonde traiettoria e risultato).
  9. D8.2-b L1 E: «L'agente chiude le email» → «Se il servizio non risponde, si chiede conferma al cliente» (poco: confonde fail-closed con la conferma del cliente).
  10. D8.4-c L1 A: «Di che colore è il logo del fornitore» → «Quanto costa ogni milione di token elaborati» (poco: mette il costo prima della protezione dei dati).
- **(8) Glossari**: campo `glossario` [{termine, it, en}] su 287 domande, con 573 voci. È nei lotti per le domande autori e nel JSON per quelle benchmark. Stesso termine, stessa definizione. Restano senza glossario 11 domande che non hanno termini non ovvi.
- **(8) Citazioni**: nessun «Google» citato come autorità nel corso. Restano solo 4 «Google Maps», che è l'oggetto di un tutorial in DA3.1-2.
  - Domande: 31 testi neutralizzati.
  - Lezioni: caveau_dati, plancia_controllo, presa_standard, prototipo_produzione (anche la citazione d'apertura, ora «Chi porta agenti al lavoro vero lo riassume così: …»), rilascio_canary, smistatore_rischio, valigia_contesto.
  - Scalette di 14 pillole nel documento e nelle traduzioni EN, con formule come «guida di riferimento del settore» o «notebook di riferimento del corso». Le sigle [G1]-[G5] restano.
  - **Bibliografia**: `dati/bibliografia.json` con 31 opere (titolo, autori, anno, editore, tipo, sigla in nota), nessun URL. Dati presi dai frontespizi dei PDF e da CORSO_CONTENUTI_VERIFICATI §0. L'anno è omesso dove il documento non lo dichiara.
- **(9) Elenchi**: 26 paragrafi-elenco di 21 lezioni diventati punti elenco «• » o numerati «1. » (passi in ordine), IT+EN. Ogni voce è un paragrafo proprio, così la webapp attuale li mostra senza modifiche. Esempio: i «quattro pezzi» di P1.4 sono ora intro + 4 punti. I riassunti finali (3 frasi) non sono stati toccati e tutte le lezioni restano sotto le 500 parole.
- **(10) Versioning**: ora comprende anche i dati e i settaggi/parametri del modello.
  - Documento e EN: scalette P2.1 (5), P7.3 (4, regressione) e P8.1 (3).
  - Lezione prototipo_produzione: elenco delle cose versionate e riassunto.
  - Perché di D2.1-c, D8.1-b, DA7.3-2/5, DA8.1-2/5 e DA8.6-2.
  - La risposta corretta benchmark di D8.1-b («Istruzioni, modello, strumenti e configurazioni») non cambia: i dati compaiono nel perché.
- **Rigenerazione e test**: `inserisci_domande.py` (178/178 erogabili) poi `estrai_corso.py` (298 domande conservate e verificate contro il documento). Esiti:
  - pytest `tests`: 199 verdi, 1 saltato;
  - `esercizi/tests`: verdi;
  - prove Node: `prova_animazioni` 548 e `misura_testi` 94, verdi.

### Da sapere
- Gli strumenti del cantiere (esportazione, controllo e applicazione delle patch) e le patch per modulo restano fuori dal repo, in `outputs\rev\`, insieme alla copia del documento prima delle modifiche (`doc_backup.md`) e al registro completo prima/dopo (`registro_distrattori.json`).
- Ci sono altre citazioni a OpenAI e Anthropic («OpenAI propone…» in smistatore_rischio e uno_o_tanti) e sigle di fonte nei perché (WP1, WP4, SEC…). Non le ho toccate perché il mandato riguardava Google: va deciso se neutralizzare anche queste.
- Alcune voci di scaletta sono note d'autore finite nel testo per lo studente, per esempio P4.2 voce 6, «confrontare con il testo scaricato». Le ho solo segnalate.

## Stato al 16/11/2026 — cantiere ALPHA-FIX (interfaccia/UX dal primo playtest alpha)
Perimetro: webapp, server, config, schema. **Non** toccati i contenuti di domande e lezioni (`dati/corso_v1.json` e `dati/lezioni/*.json` sono del cantiere parallelo CONTENUTI-REV).

Il lavoro è stato scritto senza poterlo eseguire, perché lo spazio dei comandi si era bloccato per disco pieno. È stato collaudato e committato in una seconda sessione: vedi «Collaudo» più sotto (tutto verde, 2 difetti riparati).

### Fatto (fix per fix)
- **(1) Testo che sborda.**
  - CSS generale: `overflow-wrap: anywhere` su pannelli, opzioni, riscontri e modali; `min-width: 0` sui figli di griglia, sui bottoni a segmenti e sulle righe dei cursori; i bottoni vanno a capo. L'ellissi con `title` resta solo sulla voce scelta dei menu a tendina, l'unico caso inevitabile.
  - P1.3 `ciclo_agente`: l'etichetta di «Osserva» usciva a sinistra (x da −50), quella di «Ragiona» toccava gli strumenti e «Statistiche sito» usciva dal suo riquadro. Ora il centro è spostato, le didascalie vanno a capo misurate in px e i riquadri degli strumenti sono più larghi, con testo a capo. La geometria è esportata (`geometriaEtichette`) per il controllo.
  - Classi della shell che colpivano le lezioni, ora legate alla shell: `.corpo` → `#radice > .corpo` (spezzava in due colonne il corpo dell'email di P2.1); `.voce` → `.laterale .voce`; `.legenda` → `.mappa .legenda`; `.avvisi`/`.avviso` → `#avvisi`.
  - Nuovo check Node `tests_js/misura_testi.mjs`:
    - etichette di P1.3 in IT e EN, dentro la scena e dentro i riquadri;
    - regola che vieta classi «nude» della shell con posizione o griglia uguali a classi delle lezioni;
    - con jsdom e app.css: nessun elemento fisso nel banco di ogni lezione, in IT e EN, e gli esiti di P8.6 sotto la tavola.
  - Non fatto: le misure a 1280 e 1600 su un browser vero (la regola del layout a 1280 c'è).
- **(11) P8.6, esiti del blueprint.** Causa: la `div.avvisi` del componente prendeva `position: fixed` dalla regola dei toast della shell e si posava sulla tavola. Gli esiti ora stanno in un pannello proprio (`.esiti-verifica`) dentro la scena, sotto la tavola, con scorrimento interno (`max-height` 240 px). Nel pannello destro restano solo i blocchi.
- **(2) Indietro sulle domande** (solo alpha). Il motore registra ogni risposta dello spicchio (`StatoSpicchio.risposte`: domanda, livello, ordine mostrato, scelta). `GET /api/spicchi/{pid}/rivedi/{i}` restituisce la domanda con la scelta evidenziata e la giusta in verde, ed è in sola lettura: salute, esiti e domanda in corso non cambiano. Nel quiz ci sono i bottoni «Domanda precedente», «Più indietro / Più avanti» e «Torna alla domanda in corso», che ripristina anche il riscontro.
- **(3) Riepilogo di fine spicchio.** `GET /api/spicchi/{pid}/riepilogo` mostra ogni domanda (livelli 1 e 2) con la risposta data, la risposta giusta, il perché e la spiegazione della scelta sbagliata. In alpha è sempre disponibile; in beta lo regola `alpha.riepilogo_in_beta` (`solo_superato` | `sempre` | `mai`). Bottone nella testata della pillola, nel quiz e nella schermata di fine verifica.
- **(5) Acceleratori alpha** dietro `alpha.modalita_alpha` (oggi true; il `_why` dice che in beta va spenta). Stanno in una striscia tratteggiata ambra «ALPHA · strumento da collaudo»:
  - «Riassumi lo spicchio»: finestra con obiettivo, concetti, punti chiave (il segmento `riassunto` della lezione, oppure la scaletta) e passi con il loro «Prova tu»;
  - «Assumi superato (0 errori) e passa al successivo»: chiede conferma, poi `POST /api/spicchi/{pid}/assumi_superato`. Lo spicchio risulta superato senza danno e con `assunto: true`; padronanza invariata; si apre il prossimo spicchio erogabile e non superato.
- **(6) Lettura prima della manipolazione.** Barra fissa fra concetto e banco: «Completa prima la lettura dei passi: capirai cosa osservare» e «Rivedi l'animazione», che riapplica lo stato del passo corrente e rilancia la sequenza. Le lezioni restano interattive.
- **(7) Ordine di lettura canonico**, un solo componente condiviso nella shell (`applicaCanone` in `webapp/app.js`) e nessuna lezione toccata a mano:
  - finestre numerate da CSS (`::before` su `data-numero`, resiste ai ridisegni): ① concetto sopra, ② spiegazioni/diario, ③ animazione, ④ comandi;
  - a 1280 px le spiegazioni vanno sopra a tutta larghezza, poi animazione e comandi;
  - dopo una manipolazione, le finestre cambiate (rilevate con MutationObserver) si illuminano e compare «Hai cambiato «X» → osserva la finestra ③» (testi `guida_una` / `guida_piu`);
  - Avanti e concetto restano dove sono.
- **Contratto dati (rendering):**
  - (a) campo facoltativo `glossario: [{termine, it, en}]` nel modello `Domanda` (schemi `corso` e `lezione` aggiornati a mano: **da riverificare** con `python strumenti/esporta_schema.py`). Riquadro «Termini» sotto la domanda, nella revisione e nel riepilogo. Una voce senza la lingua chiesta non si mostra e il glossario non cambia l'erogabilità della domanda.
  - (b) pagina «Bibliografia» nella barra laterale, servita da `GET /api/bibliografia`. Il server toglie ogni campo diverso da titolo, autori, anno, editore, tipo e nota, quindi nessun URL. Senza `dati/bibliografia.json` mostra `config/bibliografia_esempio.json` con la scritta «Dati d'esempio».

### File toccati
`webapp/app.js`, `webapp/app.css`, `webapp/animazioni/ciclo_agente.js`, `webapp/animazioni/blueprint_crm.js`, `corso/motore.py`, `corso/stato.py`, `corso/modello.py`, `corso/app.py`, `config/piattaforma.json` (sezione `alpha`, percorsi bibliografia), `config/interfaccia.json` (+38 testi IT/EN), `config/bibliografia_esempio.json` (nuovo), `schema/corso.schema.json`, `schema/lezione.schema.json`, `tests/test_alpha_fix.py` (nuovo), `tests/test_motore.py` (dichiarato: la vista della domanda ha anche `glossario`), `tests_js/misura_testi.mjs` (nuovo).

### Collaudo (eseguito il 16/11/2026 in una seconda sessione, prima del commit)
1. `python strumenti/esporta_schema.py`: gli schemi rigenerati sono **identici byte per byte** a quelli editati a mano. `git diff schema/` mostra solo le aggiunte del glossario (+49 righe per file) rispetto al commit precedente.
2. pytest: `tests` 199 superati e 1 saltato; `esercizi/tests` 143 superati.
3. `node tests_js/prova_animazioni.mjs`: 548 prove superate. `node tests_js/misura_testi.mjs`: 94 prove superate, con la parte jsdom (tutte le lezioni IT/EN senza elementi fissi; P8.6 con gli esiti sotto la tavola). jsdom è installato con `npm install --no-save jsdom` e `node_modules/` è aggiunto a `.gitignore`.
4. Browser simulato (jsdom sulla webapp servita dal server vero; script in `outputs\alphafix\collaudo\`):
   - `lezioni.mjs`: 39 lezioni e 2 laboratori, in IT e in EN, 243 passi e 2.923 azioni per lingua. Ogni banco è in canone con le finestre ①②③④ senza numeri ripetuti, il bordo si illumina e il messaggio-guida compare in tutte le 41 schede, «Rivedi l'animazione» funziona su ogni passo, gli esiti di P8.6 sono dentro la scena e dopo la tavola. Nessun errore JS e nessun testo sospetto.
   - `alpha.mjs` (IT ed EN):
     - striscia ALPHA, «Riassumi» (finestra con punti chiave e passi; si chiude con Esc), riepilogo prima di iniziare e dopo un cambio di lingua;
     - «Domanda precedente» spento alla prima domanda e acceso dopo; revisione con la scelta evidenziata e la risposta giusta in verde; «Più indietro / Più avanti»; «Torna alla domanda in corso» con il riscontro ripristinato; salute invariata;
     - «Assumi superato» porta a P1.4 senza cambiare la salute; Bibliografia senza URL;
     - beta simulata: gli strumenti spariscono e il riepilogo compare solo a spicchio superato.
   - `fine.mjs` (IT ed EN): spicchio completo fino a «Spicchio superato!», poi riepilogo dalla schermata di fine (una risposta sbagliata segnata, il livello 2 non posto resta vuoto).
5. **Difetti trovati e riparati** (in `webapp/app.js`):
   - `apriRiepilogo` e `assumiSuperato` chiudevano il modulo della lezione *prima* della risposta del server: su un errore la lezione restava a video ma morta (comandi e canone scollegati). Ora il modulo si chiude solo a esito positivo. Coperto da `alpha.mjs` con un errore simulato.
   - Il riepilogo aperto durante la verifica non offriva un ritorno alla domanda in corso (solo «Lezione» e «Mappa»). Ora c'è «Riprendi la verifica» (`tornaAlQuiz`): se la domanda era già risposta torna col riscontro, altrimenti la ricarica dal server. Il bottone resta anche dopo un cambio di lingua e non compare se il riepilogo è aperto dalla pillola.
6. Resta da fare: le misure a 1280 e 1600 su un browser vero per P1.3 e P8.6 (nella sandbox non c'è un browser vero).
7. Nel commit entra anche la modifica precedente di `collaudo.ps1`, non ancora committata: il Read-Host richiede S/Q finché non arriva una risposta valida, perché un Invio rimasto nel buffer faceva uscire lo script.

### Da sapere
- Il campo `glossario` nel modello è codice (perimetro di questo cantiere). CONTENUTI-REV deve solo popolarlo nei dati, nel formato `[{"termine": "...", "it": "...", "en": "..."}]` con `termine` stringa.
- Il riassunto dello spicchio prende il segmento con id `riassunto` (stesso id di `regole_lezioni.id_segmento_riassunto`).
- Gli spicchi «assunti» entrano nel record come passaggi puliti: è uno strumento da collaudo, in beta si spegne con `modalita_alpha`.

## Stato al 16/11/2026 — cantiere COMPLETAMENTI: lezioni P6.4 e P8.5 + esercizi 4-6
Commit `fc1d317` (esercizi) e successivo (lezioni). Ora **ogni pillola di M1-M8 ha la sua lezione** tranne P3.3 (scelta dichiarata della fase 4).

### Fatto — lezioni
1. **P6.4 `trappole_squadra` «Le trappole della squadra di agenti»** (426 parole, 5 passi + riassunto). Contatore dei costi (chiamate, token, € per compito e al mese, attesa) e grafo dei messaggi sempre visibili:
   - telefono senza fili: catena Qualifica → Email → Evento → Report, riassunto libero che perde un fatto a ogni passaggio contro scheda strutturata, errore iniziale «Spagna», punti di controllo cliccabili sui passaggi (fermano la macchia, costano una chiamata);
   - rimpallo infinito Vendite ↔ Assistenza: limite globale 0 («nessuno»)-12 con passaggio all'operatore, ruoli chiari;
   - costo che esplode: 1-8 agenti, «tutti con tutti» n·(n−1) contro coordinatore 2·(n−1), qualità che si ferma e cala;
   - responsabilità di nessuno: registro di 3 richieste mescolate; con l'identificativo comune (trace ID, WP5 p.32, non «correlation id») si segue REQ-0412 e si dimostra chi ha sovrascritto «interessato» con «perso»;
   - «Decidi tu»: 5 guai, 5 contromisure.
2. **P8.5 `bolletta_agente` «La bolletta dell'agente»** (379 parole). Cruscotto con compiti al mese, token per chiamata, chiamate per compito, modello piccolo/medio/grande (uno per tutti o uno per ruolo: classifica, email, offerta), cache della parte ripetuta e «data e ora in testa» che la annulla. Bolletta a due righe (chiamate al modello e rilavorazioni) con barre partenza/adesso. Si vede il risparmio vero (cache, modello giusto per ruolo, meno giri a vuoto) e il falso risparmio (piccolo sull'offerta, troppo pochi giri). «Decidi tu» su 5 proposte, una sul lock-in (C78).
   - **Prezzi d'esempio dichiarati illustrativi** a schermo. Dalle fonti vengono solo i rapporti: uscita 5× l'ingresso, cache 1/10 (R10). Costo dell'errore e qualità per ruolo sono illustrativi, dichiarati [EXP].
3. **4 domande v2** (lotti `lotto_m6_trappole_squadra.json`, `lotto_m8_bolletta_agente.json`, inserite). Aiuto su un passo della lezione, corretta mai l'opzione più lunga:
   - DA6.4-1 diagnosi (telefono senza fili), DA6.4-2 contro-esempio (8 agenti «tutti con tutti»);
   - DA8.5-4 diagnosi (cache annullata dalla data in testa), DA8.5-5 esempio pratico (falso risparmio sugli sconti).
   - Fabbisogno rigenerato: 40/40 spicchi erogabili, 0 domande mancanti. P6.4 ora copre tutte e 4 le strisce (era solo definizione + esempio); C77 copre tutte e 4; C78 ne copre 3.
4. **Test**:
   - pytest `tests/` 181 verdi + 1 saltato (copertura 98%), `esercizi/tests` 143 verdi;
   - prove Node 548 (+32 delle due lezioni);
   - prova di fumo jsdom IT/EN di ogni passo e comando: 0 errori;
   - browser simulato contro il server vero (P6.4 e P8.5 in IT e EN, ogni passo con tutti i comandi toccati, aiuti verso i passi e verso la scaletta, spicchi M6-M8 tutti erogabili e con lezione): 24 passi, 314 azioni, 0 errori. Script in `C:\Users\User\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\local-agent-mode-sessions\db921416-4ab5-4b00-861b-b895d61f5223\0d0aa5bc-a6bb-4d37-ba5e-829b82276bbe\local_ee99c290-884d-4831-90dc-c89f562a3f9e\outputs\completamenti\collaudo\`.
   - Test aggiornati (dichiarati): in `tests/test_lezioni_m6_m8.py` `SENZA_LEZIONE` è ora vuoto e P6.4/P8.5 entrano in `LEZIONI_M6_M8` e `NUOVE`. Due test nuovi: trappole con trace ID; prezzi illustrativi con rapporti 5× e 1/10.

### Fatto — esercizi 4-6 (stesso motore, correttore deterministico, voto riproducibile, IT/EN; tocca solo `esercizi/`)
1. **Esercizio 4 «Chiedere all'LLM, ma con una rubrica»** (piano 3). Lo studente compone le istruzioni da 10 blocchi e le prova sui 10 lead visibili. Il correttore le manda sui 10 lead nascosti col finto-LLM (registro) e controlla JSON valido, motivazione ≤40 parole, fascia coerente con le soglie, distribuzione non degenere, accordo ≥7/10 con il direttore e criteri nel prompt. Esiti: partenza 0, giusta 100, +«ragiona» 10, +«entusiasta» 90, senza soglie 56.
2. **Esercizio 5 «Email con il freno a mano»** (piano 5+6). Usa le 6 regole e la checklist della lezione P3.4: scelta dei campi (telefono e note private danno un avviso), 8 bozze da approvare o rifiutare, invio, registro, interruttore di emergenza. Trappole: un contatto «non contattare» (bloccato dal sistema) e uno sconto promesso dal modello. Bloccante: lo sconto parte. Esiti: giusta 100, «approva sempre» 0, campi sensibili 75.
3. **Esercizio 6 «Dare gli strumenti giusti all'agente»** (piano 7). Permessi non dato / con approvazione / libero per 8 strumenti, più il tetto di passi. Diario dell'agente su 4 richieste, tra cui una nota con istruzioni nascoste. Il correttore prova la configurazione su 7 richieste nascoste: 3 necessarie, 3 pericolose e un ciclo. Bloccante: un'azione pericolosa eseguita da sola. Esiti: partenza 0, giusta 100, tetto 30 85, invia_email libero 0.
4. **Finto-LLM con compiti «simulatore»** (`esercizi/finto_llm/simulatori.py`): la risposta dipende dalle istruzioni dello studente. I segnali stanno in `esercizi/strumenti/compiti_finto_e04_e06.json`, che `genera_dati_e03.py` unisce a `tabelle.json`.
5. **Test**: 143 pytest in `esercizi/tests` (+65, copertura 97%). Browser simulato: 182 passi, 0 errori (esercizi 4-6 fino a 100 in IT, poi ricominciati e rifatti in EN). Nuovo test di sintassi ES del modulo della pagina: ha trovato una parentesi mancante che `node --check` non vedeva.

### Da sapere
- Gli esercizi seguono il contenuto chiesto (rubrica, email con approvazione, strumenti), con la numerazione del piano (3, 5+6, 7) nel campo `piano` del verbale. Restano da fare gli esercizi «memoria» e «report KPI» del piano.
- Le bozze dell'esercizio 5 restano in italiano anche nell'interfaccia inglese, con una nota a schermo, così voto e registro non dipendono dalla lingua.
- Con il tetto di passi a 5 l'esercizio 6 passa con 77 su 70, anche se un compito resta a metà: la soglia è in config.
- Verifica visiva su browser vero non fatta. Anteprima statica delle scene in `C:\Users\User\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\local-agent-mode-sessions\db921416-4ab5-4b00-861b-b895d61f5223\0d0aa5bc-a6bb-4d37-ba5e-829b82276bbe\local_ee99c290-884d-4831-90dc-c89f562a3f9e\outputs\completamenti\anteprima_lezioni.html`, da aprire nel browser.
- Se `dati/corso_v1.json` venisse rigenerato da una copia vecchia: `python strumenti/inserisci_domande.py strumenti/domande_autori/lotto_m6_trappole_squadra.json strumenti/domande_autori/lotto_m8_bolletta_agente.json`.

### Resta da fare
- Revisione di France su testi e domande delle due lezioni e sui tre esercizi.
- Collaudo visivo su browser vero.
- Prova degli esercizi con Ollama vero.

## Stato al 16/11/2026 — cantiere ESERCIZI PRATICI: fondamenta (laboratorio, correttore, esercizi 1-3)
Tocca solo `esercizi/` più agganci minimi: `corso/app.py` (monta le API se `esercizi.attivi`), `config/piattaforma.json` (sezione `esercizi`), `config/interfaccia.json` (testo `esercizi_pratici`), `webapp/app.js` (voce laterale + caricamento del modulo protetto), `pytest.ini` (`esercizi/tests`), `.gitignore` (`stato_esercizi/`).

### Fatto
1. **Laboratorio** (`esercizi/ambiente/`): `docker-compose.yml` (portale, CRM in sola lettura per il docente, finto-LLM che parla il protocollo Ollama, Mailpit, Ollama vero nel profilo `ollama`; porte solo su 127.0.0.1), `Dockerfile` unico, script-involucro `avvia_laboratorio`, `azzera_laboratorio`, `verifica_esercizio` (.ps1 per Windows e .sh), parametri in testa con `_why`. Guida per non tecnici: `esercizi/LEGGIMI_DOCKER.md`.
2. **Motore** (`esercizi/motore/`): contratto dell'esercizio (setup, consegna IT/EN, area di lavoro, azioni, fotografia, chiave, controlli con nome/peso/aiuto/bloccante), CRM SQLite per studente ed esercizio (pseudonimo, mai l'email), posta locale o Mailpit, modello finto o Ollama sempre dietro al **registro LLM** (impronta della richiesta → risposta), correttore puro con verbale JSON e impronte, ricorrezione dei tentativi salvati, CLI. Config in `esercizi/config/laboratorio.json` (soglie 80/75/80 e tolleranze parametriche).
3. **Esercizi** (`esercizi/catalogo/`):
   1. pulizia dei lead, 25 righe con variante per studente. Difetti: 3 doppioni, 2 email rotte, 1 azienda senza dimensione, 2 disiscritti. Trappola: il «non contattare» sta solo sulla riga doppia. Il controllo sui disiscritti è bloccante.
   2. punteggio a regole: cursori per pesi e soglie, 20 lead nascosti con la fascia del direttore vendite. I vincoli CEO e stagisti sono bloccanti.
   3. «trova l'errore»: lessico e correzioni del laboratorio P3.5, 15 risposte visibili più 12 nascoste. Il controllo «Not Interested → interessato» è bloccante. Si corregge lo stato finale di CRM e posta.
4. **Portale**: voce «Esercizi pratici» nella barra laterale. Pagina con schede, consegna, area di lavoro per esercizio, «Verifica», verbale leggibile con «come rimediare», «Ricorreggi» e «Ricomincia». Le API stanno sotto `/api/esercizi/*` e il modulo sotto `/protetto/esercizi/*`, tutto dietro la sessione. La chiave di correzione e i dati nascosti non escono mai dal server.
5. **Test**: 78 pytest in `esercizi/tests` (copertura 97%), compresa la riproducibilità: ricorrezione identica, manomissione rilevata, registro che tiene ferme le risposte del modello, due laboratori con stesso lavoro e stesso verbale. Esiti attesi dell'esercizio 3: bug → 0, inverti → 50, esatta → 65, giusta → 100. Collaudo nel browser simulato (jsdom) contro il server vero: `esercizi/collaudo/flusso_browser.mjs`, 49 passi e 0 errori (accesso, i tre esercizi fino al voto 100 per il 2 e il 3, unione/correzione/segmento nell'1, ricomincia, cambio lingua).

### Da sapere
- La numerazione è quella del corso: l'esercizio 3 del portale corrisponde all'esercizio 4 del piano (campo `piano` nel verbale).
- Senza Docker tutto gira con il finto-LLM e la posta locale in SQLite (`stato_esercizi/`, nel .gitignore): anche `python server.py` mostra già la pagina Esercizi.
- Mai eseguito in sandbox: Docker, Mailpit e Ollama veri. Il dialogo con Mailpit (intestazione `X-Tags` e ricerca `tag:`) è provato solo con un server finto. I tag fissati (`axllent/mailpit:v1.20.0`, `ollama/ollama:0.5.7`) sono sostituibili da `.env`.
- Nessun browser vero disponibile: verificato solo il DOM simulato.
- Nella suite generale `tests/` alcuni test falliscono per il lavoro in corso dei cantieri lezioni (P8.1 laboratorio, D8.6, griglia_test senza JS). Non dipendono dagli esercizi: verificato in una copia pulita di HEAD.

### Resta da fare
- Esercizi 4-9 del piano: prompt con rubrica e JSON, email con politica di marca, approvazioni, agente con strumenti, memoria, report KPI. (Aggiornamento: rubrica, email + approvazioni e strumenti sono fatti nel cantiere completamenti; restano memoria e report KPI.)
- Prova a secco con Ollama vero (`qwen2.5:3b`) sul PC di France.
- Collaudo visivo su browser vero.

## Stato al 16/11/2026 — fase 6: lezioni interattive M6 (multi-agente e A2A), M7 (valutazione e osservabilità), M8 (produzione e governance)
Cantiere M6-M8, in parallelo a M4-M5 ed esercizi. Tocca solo i file dei 14 componenti sotto, i lotti `strumenti/domande_autori/lotto_m6_*`, `lotto_m7_<componente>.json`, `lotto_m8_*` e `tests/test_lezioni_m6_m8.py`.

### Fatto
1. **13 lezioni + 1 laboratorio, IT/EN**, stessa architettura e regole di M1-M5: 5 passi con «Prova tu» e un gioco «Decidi tu» con riscontro spiegato, riassunto in 3 frasi, 353-489 parole, solo esempi marketing/CRM, deterministiche. Formulazioni da `CORSO_CONTENUTI_VERIFICATI.md`; contenuti senza fonte dichiarati nel testo ([EXP], [R15]); numeri dichiarati illustrativi.
   - P6.1 `uno_o_tanti` «Uno o tanti?»: cursori «condizioni se/allora» e «strumenti sovrapposti» (dato OpenAI 15 distinti / meno di 10 sovrapposti), «chiarisci i nomi», squadra di 4 specialisti con modello leggero/potente e lucchetto di scrittura sul CRM, contatori del costo di coordinamento [EXP]; «prima massimizza un agente, poi dividi».
   - P6.2 `schemi_orchestrazione` «Quattro mini-mappe e un bivio»: sequenziale, parallelo con aggregatore (e l'errore punteggio+email in parallelo), ciclo generatore-critico con limite di giri e segnale «APPROVATO», coordinatore manager / **passaggio di consegne (OpenAI)**: «Dov'è il mio ordine?» Triage → Ordini; pausa umana su qualunque schema.
   - P6.3 `due_piani_agenti` «Due piani di connessione»: MCP «fai questa cosa precisa» / A2A «raggiungi questo obiettivo», complementari; scheda dell'agente (`/.well-known/agent-card.json`); lavagna comune, agente come strumento, handoff, A2A verso il fornitore; «spegni il fornitore» (errore di rete, nessun ritentativo); bilancia A2A / sotto-agente locale.
   - P7.1 `cinque_strade` «Cinque strade, quattro lenti»: 1-5 esecuzioni (non determinismo), solo risultato / anche traiettoria, i 4 pilastri della qualità **versione cap. 1 WP4** (efficacia, efficienza, robustezza, sicurezza = cancello non negoziabile), scena «200 OK» con la scatola di vetro.
   - P7.2 `tre_pilastri` «La cascata e il filo rosso» sul caso vero `conta_lead` (1.243 invece di 10, elenco passato come testo): **log = che cosa è successo, tracce = perché, metriche = quanto bene**; identificativo comune, filo rosso, span cliccabili, due cruscotti (sistema verde, utilità −10%), redazione dei dati personali, campionamento 10%/100%.
   - P7.3 `griglia_test` «Costruire il set di valutazione»: lo studente compone il set da 18 casi (tipici/limite/avversari) con copertura; «email più brevi» + rilancio → 3 regressioni nei casi limite, invisibili al set povero; pollice giù dalla produzione → caso permanente e nuova versione del set. «20-50 casi» non usato.
   - P7.4 `giudice_bias` «Il giudice e i suoi bias»: rubrica a 4 voci, confronto a coppie e tasso di vittorie, «inverti l'ordine» (bias di posizione, unico con appiglio nelle fonti), bias di lunghezza e di stesso modello e le tre contromisure **dichiarati [EXP]**, calibrazione su 50 casi (rubrica vaga 18% / scomposta 82%, illustrativi), esperti = «riferimento calibrato sull'uomo».
   - P7.5 `metriche_impatto` «Migliorare osservando»: piramide dalla stella polare alle tracce, volume email (attività ≠ risultato, metrica vanitosa [EXP]) con metriche di rischio, gruppo di controllo contro «dicembre vs novembre», volano WP4 (ogni errore diventa un test).
   - P8.1 `prototipo_produzione` «L'ultimo miglio»: 4 fallimenti tipici WP5, ambienti con chiavi separate, cancello di valutazione con firma del Product Owner e «salta il cancello», 6 parti versionate e rollback.
   - P8.1 **laboratorio** `rilascio_canary` «Dall'1% all'incidente»: **cursore a gradini dall'1% (WP5 p.16)**, 5/25/50/100 dichiarati esempio del corso; curve v1/v2 con soglia, v2 buona/difettosa, incidente simulato (prompt injection in una risposta di un prospect → email non approvate), reazione nessuna/manuale/automatica, coppia colpevole, clienti colpiti all'1% contro il 100%.
   - P8.2 `smistatore_rischio` «Lo smistatore»: manopole OpenAI (legge/scrive, reversibile, permessi, impatto), soglie 100/500, «email sospetta», operatore dopo 3 tentativi, coda di approvazione con pausa/ripresa e «perdi l'identificativo», fail-closed marcato [R15]+[EXP], controesempio «always allow».
   - P8.3 `plancia_controllo` «Kill switch e fail-closed»: interruttori globale/cliente/agente (dichiarati [R15]: «kill switch» non è nelle fonti verificate) + strumento (circuit breaker WP5), pausa/arresto, controllo solo all'avvio contro prima di ogni azione, **fail-closed / fail-open [R15]+[EXP]**, incidente contenere/smistare/risolvere, registro delle decisioni con «Perché?».
   - P8.4 `caveau_dati` «Sicurezza e accessi»: isolamento nei dati / solo nell'interfaccia ([R15]), identità dell'agente, segreti fuori dalle istruzioni, permessi minimi, mascheramento + TTL, esfiltrazione bloccata dal controllo dell'output, locale/cloud/regione.
   - P8.6 `blueprint_crm` «Il blueprint finale» (esercizio riassuntivo): lo studente assembla regole non negoziabili + 8 sezioni scegliendo un blocco su 3 per sezione; «Verifica coerenza» con 23 regole citate (3 incrociate tra sezioni), semaforo per sezione, esempio guidato, blueprint difettoso (D8.6-a), vista SDD (sezioni 7-8 = «operazioni»).
   - Senza lezione propria (dichiarato in `tests/test_lezioni_m6_m8.py`): P6.4 (trappole multi-agente) e P8.5 (costi); le loro domande restano con l'aiuto sulla scaletta.
2. **31 domande v2** (origine `autori`, 2-3 per lezione, strisce diverse e mai «definizione», distrattori classificati con spiegazione per ogni opzione, IT/EN, aiuto su un passo della lezione; DA8.1-6/7 sul laboratorio): DA6.1-1/2, DA6.2-4/5, DA6.3-4/5, DA7.1-4/5, DA7.2-4/5, DA7.3-4/5, DA7.4-4/5, DA7.5-4/5, DA8.1-4..7, DA8.2-4/5, DA8.3-4..6, DA8.4-4..6, DA8.6-1..3. Inserite con `inserisci_domande.py`; sono entrate in `dati/corso_v1.json` con il commit `acb6551` del cantiere M4-M5 (che ha committato il file dopo l'inserimento). Tutti i 15 spicchi di M6-M8 sono erogabili.
3. **Test**: pytest tutti verdi (257 + 1 saltato, comprese le suite M4-M5 ed esercizi); nuovo `tests/test_lezioni_m6_m8.py` (copertura dei moduli, laboratorio, aggancio delle domande, log/tracce/metriche, canary dall'1%, handoff, pilastri cap. 1, marcature [EXP]/[R15]). Prove Node: 516 verdi in tutto, di cui 202 delle 14 lezioni M6-M8. Prova di fumo jsdom di ogni passo e comando dei 14 moduli in IT/EN: 0 errori. Browser simulato contro il server vero (accesso, ogni pillola M6-M8 in IT e EN, ogni passo, scheda Laboratorio di P8.1, aiuto che apre il laboratorio e un passo della lezione, P6.4/P8.5 su scaletta, spicchi erogabili): 84 passi per lingua, 0 errori. Script del collaudo in `C:\Users\User\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\local-agent-mode-sessions\db921416-4ab5-4b00-861b-b895d61f5223\0d0aa5bc-a6bb-4d37-ba5e-829b82276bbe\local_ee99c290-884d-4831-90dc-c89f562a3f9e\outputs\m678\collaudo\`.

### Da sapere
- Il componente di P6.3 si chiama `due_piani_agenti` (non `due_piani_a2a`): lo schema accetta solo `^[a-z_]+$`.
- Nella lezione P6.3 l'etichetta della lavagna è scritta `{ scheda_account }` con gli spazi, perché i controlli trattano `{parola}` come segnaposto non risolto.
- Verifica visiva su browser vero non fatta (nessun pannello di anteprima né browser disponibili): geometria controllata solo con le prove Node (posizioni dentro il riquadro).
- Se `dati/corso_v1.json` venisse rigenerato da una copia vecchia, le domande si reinseriscono con `python strumenti/inserisci_domande.py strumenti/domande_autori/lotto_m6_*.json strumenti/domande_autori/lotto_m8_*.json` più i 5 `lotto_m7_<componente>.json` (non `lotto_m7_m8.json`, già nel corso).

### Resta da fare
- Revisione di France sui testi delle 14 lezioni e delle 31 domande, e collaudo visivo su browser vero.
- ~~Eventuali lezioni per P6.4 e P8.5~~: fatte nel cantiere completamenti (`trappole_squadra`, `bolletta_agente`).

## Stato al 16/11/2026 — fase 6: lezioni interattive M4 (strumenti e MCP) e M5 (contesto, sessioni, memoria)
Cantiere M4-M5, in parallelo a M6-M8 ed esercizi. Commit `acb6551`.

### Fatto
1. **9 lezioni interattive IT/EN**, stessa architettura e stesse regole di M1-M3. Ogni lezione ha 5 passi con «Prova tu», il riassunto in 3 frasi e 390-421 parole. Gli esempi sono solo di marketing e CRM e tutte le lezioni sono deterministiche. Ora **M4 e M5 hanno una lezione per ogni pillola** (P4.1 è la lezione del dimostratore).
   - P4.2 `strumento_chiaro` «Strumento confuso contro strumento chiaro»: lo studente cambia nome e descrizione (`api_call` ↔ `trova_lead_caldi`), parametri (9 grezzi ↔ 2 tipizzati) e granularità (10 chiamate API / un compito / mega-strumento), con il misuratore «scelte corrette su 20 compiti». Poi: strumenti distinti o sovrapposti, 4 messaggi d'errore (anche lo strumento che risponde sempre «successo»), cassetti lettura / azione / orchestrazione con «Controlla», doppio clic su «invia follow-up» con e senza idempotenza.
   - P4.3 `presa_standard` «Dal groviglio alla presa standard»: 12 cavi diventano 7 pezzi; il conto N+M è dichiarato spiegazione del corso, N×M viene dalla fonte. Si aggiungono sistemi o app. Ci sono i 6 passi del collegamento, i ruoli host/client/server con un mini-gioco, il catalogo strumenti/risorse/prompt con la diffusione al 15/09/2025 (99/34/32%) e l'interruttore «server non fidato» (le etichette sono solo dichiarazioni del fornitore).
   - P4.4 `valigia_strumenti` «La valigia che scoppia» (scoperta progressiva dei tool): cursore da 5 a 100 strumenti, modalità tutto caricato / specialista / scoperta progressiva a 3 ripiani, «chiamata fallita» oltre il bordo, 83 trattative filtrate nella sandbox, pannello «dichiarato o misurato?» (98,7% → 95,7% → 74,8% su UNA domanda, tempo da 37,5 a 53,5 s).
   - P4.5 `raggi_x` «I raggi X: l'ordine nascosto nella bolla di carico»: con i raggi X lo studente scova la riga ostile bianco su bianco nella bolla di carico di un distributore; codice a barre, metadati e pixel sono esche. Poi lancia l'agente con permessi ampi / minimo privilegio / regole fisse (consenti, blocca, chiedi conferma) e segue il dato «contaminato» fino all'invio; la chiave si sposta dal prompt al caveau.
   - P5.1 `valigia_contesto` «La valigia» (metafora del whitepaper Google, formula «selezionare, riassumere, inserire», «né più né meno»): 10 oggetti in 3 famiglie e 4 lancette. La risposta all'Hotel Lago Blu cambia davvero («non lo so», prezzo inventato, senza sconto, giusto); con troppa roba arrivano il context rot e la chiamata fallita. Ci sono i 3 aiuti, il secondo turno prompt engineering ↔ context engineering e il passo «Decidi tu» (qualità ≥ 90 con spazio ≤ 60%).
   - P5.2 `linea_sessione` «La linea che si arrotola»: eventi e stato, compattazione (ultimi 10 turni / 4.000 token / riassunto), «riassunto troppo aggressivo» (dichiarato esempio didattico) che perde «non chiamatemi il lunedì», riavvio con archivio in memoria ↔ database, chiusura della sessione dove sopravvive solo ciò che va in memoria.
   - P5.3 `imbuto_ricordi` «L'imbuto dei ricordi» (la memoria che ricorda il cliente tra due sessioni): argomenti da estrarre e momento dell'estrazione (costo ↔ freschezza), saluto alla seconda chiamata con e senza memoria, provenienza (CRM ↔ dedotto), consolidamento UPDATE e il suo opposto senza consolidamento, recupero con rilevanza/recency/importanza, gioco dei cassetti dichiarativa ↔ procedurale.
   - P5.4 `mappa_significati` «La mappa dei significati» (RAG): k da 1 a 20 con precisione e richiamo dal vivo, «recupera e riordina», parole chiave ↔ significato, codici contratto simili e ricerca ibrida. Lo studente sceglie le fonti e la risposta con citazioni cambia (il listino 2024 porta un prezzo vecchio). C'è «non lo so» con e senza istruzione, e il confronto bibliotecario ↔ assistente personale.
   - P5.5 `dove_dato` «Dove si nasconde un dato»: il cellulare di Marco in 5 contenitori (elenco illustrativo) e l'oscuramento dei dati personali. Il bottone «Diritto all'oblio» con la sola memoria spuntata lascia 4 copie; poi il muro fra clienti, il ricordo avvelenato («50% di sconto») con verifica e provenienza, la scadenza automatica (TTL), l'opt-out e la revoca di una fonte (cancella tutto ↔ rigenera).
2. **20 domande v2** inserite nel corso (lotti `lotto_m4_strumenti.json`, `lotto_m4_m5_sicurezza_contesto.json`, `lotto_m5_memoria_rag_privacy.json`, `lotto_m2_formato_c21.json`). Sono 2 per pillola di M4-M5, con l'aiuto su un passo della lezione e strisce scelte fra quelle che mancavano (soprattutto diagnosi e contro-esempio), più **DA2.2-1** (esempio pratico) e **DA2.2-2** (diagnosi) per C21, che aveva solo domande «definizione». Usano tutte le bande, anche 4 e 7 opzioni; la corretta non è mai l'opzione più lunga. Ora ogni concetto di M4-M5 toccato ha 3-4 punti di vista.
3. **Test**: tutti verdi.
   - pytest (`tests/` + `esercizi/tests`, eseguiti a gruppi per il limite di tempo del comando). Nuovo `tests/test_lezioni_m4_m5.py`: ogni pillola M4-M5 ha la sua lezione, le domande nuove sono erogabili con l'aiuto su un passo, ci sono più punti di vista, C21 non è più solo definizione.
   - Prove Node: 516 (in tutto il progetto; +134 delle 9 lezioni).
   - Prova di fumo jsdom di **tutte** le lezioni del progetto in IT/EN, con ogni passo e ogni comando toccato: 9.106 azioni, 0 errori, compresi gli errori dentro i gestori degli eventi.
   - Server vero (TestClient): accesso, moduli protetti prima dell'accesso, ogni pillola M4-M5 e P2.2 in IT/EN montata in jsdom con il modulo servito e la lezione risolta dal server, 128 passi, 0 errori.
4. **Test condivisi aggiornati (dichiarati)**, perché si rompevano a ogni lezione nuova dei cantieri paralleli:
   - `test_catalogo.py::test_rapporto_erogabilita` ora controlla il minimo garantito (M1-M5, P3.3 esclusa), non un elenco chiuso.
   - `test_laboratorio.py`: P3.5 è fra i laboratori, non l'unico (è arrivato P8.1).
   - `test_upgrade_domande.py`: la pillola senza lezione per il caso «non ha lezione» passa da P8.6 (ora ha `blueprint_crm`) a P3.3.

### Da sapere
- **Numeri illustrativi**, dichiarati a schermo dove serve: scelte su 20 compiti, token per strumento, spazio della valigia, 1.240 contatti, sconto del 15%, coordinate della mappa, codici contratto, mesi di scadenza.
- **Numeri presi dalle fonti** di CORSO_CONTENUTI_VERIFICATI: 99/34/32%, 98,7/95,7/74,8%, 37,5/53,5 s, N = 10 turni, 4.000 token, 30 minuti, 7/10 e 3/6. In P5.4 gli esempi 0,7 e 0,5 sono citati in una nota, non tarati sulla mappa, perché insieme non stanno su una sola domanda.
- **Contenuti non presi dalle fonti**:
  - La **bolla di carico** di P4.5 è una richiesta di France, non viene dalle fonti; lo scenario CRM è un adattamento.
  - Il GDPR in P5.5 compare solo come diritto di chiedere la cancellazione: niente basi giuridiche né tempi legali.
  - La checklist «prima di collegare un server» di P4.3 è [EXP].
- **Copie da cancellare**: `outputs\_fork_b\` (copie di lavoro) e `outputs\anteprime_m4_m5\` (anteprime HTML statiche) sono fuori dal progetto e si possono cancellare.
- **Verifica visiva**: non fatta su un browser vero.

### Resta da fare
- Revisione di France sui testi delle 9 lezioni e delle 20 domande.
- Collaudo visivo su browser vero (in particolare le scene dense: `presa_standard`, `mappa_significati`, `dove_dato`).

## Stato al 16/11/2026 — correzioni al documento benchmark (dai contenuti verificati) + riserva M3

### Fatto
1. **Documento benchmark corretto** (`F:\A\CD\Game_Development\000_PROGETTO\CORSO_BENCHMARK_STRUTTURA.md`, fuori dal repository): correzioni chirurgiche marcate `[corretto — fonte verificata: ...]`, più un avviso in testa che le elenca (il documento non è versionato: l'elenco qui sotto è il registro delle modifiche).
   - P1.3 scaletta 6: le cinque fasi con la formulazione esatta di WP1 ("Get the Mission", "Scan the Scene", "Think It Through", "Take Action", "Observe and Iterate", ritorno alla fase 3); condizioni di arresto attribuite a OAI p.14 / OPS p.47, budget [EXP].
   - P1.5 scaletta 6: i Livelli 0-4 con i nomi esatti di WP1, dichiarati scala di CAPACITÀ diversa dallo spettro (che in WP1 p.23 va da "a sprinkle of AI" a "the LM in the driver's seat").
   - P5.1 scaletta 2 e opzione E di D5.1-a: "selezionare, ordinare e comprimere" → "selezionare, riassumere e inserire" (WP3 p.7), "né più né meno".
   - P7.3 scaletta 3: "20-50 casi" marcato [EXP] (ordine di grandezza da esperienza, nessuna fonte).
   - P7.4 scaletta 2-4: elenco dei bias del giudice come "[EXP] competenza propria: le fonti del corso non li elencano" (solo il bias di posizione ha un appiglio, LLM p.86); "doppia valutazione con ordine invertito" [EXP]; revisione umana = "riferimento calibrato sul giudizio umano", non "verità di riferimento" (WP4 p.26); stessa correzione nell'opzione D di D7.4-c.
   - P8.1 scaletta 4 e progetto dell'animazione: canary dall'1% (WP5 p.16), poi 5%, 25%, 50%, 100%; livello 2 di D8.1-a "rilascio all'1%".
   - P8.2 scaletta 4 (fail-closed) e P8.3 scaletta 1 (kill switch): attribuiti a "repo R15 (non verificato a fondo)", [EXP]; per il kill switch indicato l'equivalente documentato (circuit breaker per strumento, WP5 p.22).
   - Note 6 e 7.2 del documento ("a memoria, da verificare"): annotate come verificate.
2. **Propagazione nel corso** (`dati/corso_v1.json`, rigenerato con l'estrattore): testi IT dal documento, testi EN aggiornati in `strumenti/traduzioni_en_pillole.json` (P1.3, P1.5, P5.1, P7.3, P7.4, P8.1 + animazione, P8.2, P8.3).
3. **Domande corrette** (benchmark, IT+EN, logica e risposta corretta invariate): D5.1-a (opzione corretta E e perché: "selezionare, riassumere e inserire"); D8.1-a livello 2 (domanda "rilascio all'1%" e opzione e "Lasciare l'1% attivo"); D7.4-c (opzione corretta D e perché: "riferimento umano, non una verità perfetta", che prima contraddiceva DA7.4-2). Nessun'altra domanda contraddice le formulazioni corrette (controllate tutte quelle su cinque fasi, livelli, contesto, set di valutazione, giudice, canary, fail-closed, kill switch; DA8.1-1 usa già il 5% come distrattore contro l'1%).
4. **Meccanismo di verifica aggiornato** (dichiarato): `pulisci()` in `strumenti/estrai_corso.py` toglie la marcatura `[corretto — fonte verificata ...]` da tutti i testi estratti, così non arriva allo studente e l'impronta delle domande si confronta sul testo pulito. Nuovo test `test_marcature_delle_correzioni_tolte_dai_testi` in `tests/test_estrazione.py`.
5. **Riserva M3** (`outputs\fix\m3_riserva_fork_b.json`, 9 domande): 3 inserite con `inserisci_domande.py` nel nuovo lotto `strumenti/domande_autori/lotto_m3_riserva.json`, con id nuovi (gli id della riserva coincidevano con quelli già nel corso e l'inserimento li avrebbe SOSTITUITI) e aiuto spostato sul passo della lezione: DA3.1-4 (deduplica sul campo email + mappatura che svuota il nome azienda; aiuto `catena`), DA3.4-4 (account "di prova" con contatti veri + "always allow"; aiuto `lucchetto`), DA3.5-6 (disiscrizione incerta ferma in coda di revisione: la soglia non ritarda un obbligo; aiuto `priorita`). 6 scartate come doppioni: riserva DA3.1-1 (= DA3.1-2: cosa manca al flusso da tutorial), DA3.1-2 (stesso video Google Maps e stesso verdetto di DA3.1-2), DA3.4-1 (= DA3.4-1 + DA3.4-2: casella finta / campagna con contatti veri), DA3.4-3 (= DA3.4-3: definizione di personalizzazione tracciabile), DA3.5-1 (= DA3.5-1: risposta ironica, tentativi in disaccordo → persona), DA3.5-3 (= DA3.5-5: categorie chiuse, una sola etichetta). `dati/fabbisogno_strisce.json` rigenerato.
6. **Test**: estrazione di controllo pulita (documento ↔ JSON identici, compreso il test sul documento vero con `CORSO_BENCHMARK_MD`); pytest 167 verdi, 0 saltati. Eseguiti su una copia pulita di HEAD con le sole modifiche di questo lavoro, perché nella cartella di lavoro le lezioni in corso del cantiere M6-M8 (`cinque_strade.json` senza il suo `.js`) impediscono al catalogo di caricarsi.

### Da sapere
- Se si corregge ancora il documento su un testo di DOMANDA (livello 1 o 2), la stessa frase va messa anche nel JSON, altrimenti l'estrattore si ferma (comportamento voluto).
- Le lezioni in scrittura `giudice_bias` (P7.4) e `prototipo_produzione` (P8.1) del cantiere M6-M8 risultano già coerenti con le formulazioni corrette (1%, bias come esperienza del progettista, giudizio umano non verità perfetta).
- Restano segnalati e non corretti (fuori da questo mandato): D6.3-b pub/sub [EXP], D1.5-c e P1.5 "più costi" [EXP], D1.1-b esempio [EXP], P4.4 "15.000 token per 22 strumenti", P1.3 scaletta 5 "budget" (ora dichiarato [EXP] nella voce 6), P8.3 "controllo prima di ogni azione con effetti" senza fonte.

## Stato al 16/11/2026 — fase 5: domande degli autori + inglese completo (in parallelo alla fase 4)

### Fatto
1. **105 domande nuove** (origine `autori`, id `DA<pillola>-N`) sui contenuti verificati (`F:\A\CD\Game_Development\000_PROGETTO\CORSO_CONTENUTI_VERIFICATI.md`), per tutti i moduli tranne M3 (M3 = cantiere delle lezioni M3, lotti `lotto_m3_*`). Coprono le 45 prioritarie (tolte le 3 di M3) e proseguono fino a 3 domande per concetto: M1 33, M2 12, M4 12, M5 12, M6 6, M7 15, M8 15.
   - Strisce: privilegiati i punti di vista carenti (esempio pratico, contro-esempio, diagnosi); ogni nuova domanda di un concetto ha una striscia diversa da quelle che c'erano.
   - Regola delle lunghezze: compaiono tutte le bande (3, 4, 5, 7 opzioni); le 7 sempre 1 + 2 quasi + 2 poco + 2 errate. Controllo anti-indizio: la corretta è l'opzione più lunga in meno del 30% dei livelli (test).
   - Distrattori dai contro-esempi reali delle fonti e dei tutorial YouTube ("always allow", permessi "select all", account di prova con contatti veri, 98,7% contro le misure reali, canary al 5% invece dell'1%, statistiche promozionali, log con dati personali in chiaro).
   - Aiuto: per M1-M2 un segmento della lezione interattiva, per M4-M8 un passo della scaletta.
   - Le domande nascono nei **lotti** `strumenti/domande_autori/lotto_*.json` e si inseriscono con `python strumenti/inserisci_domande.py <lotti>` (`--verifica` per il solo controllo): scrive nel corso solo se ogni domanda è erogabile; reinserire un lotto sostituisce le domande con lo stesso id. L'estrattore conserva le domande `autori` (non le confronta col documento benchmark).
2. **Inglese completo** dei testi lunghi (obiettivo, scaletta, progetto animazione) di tutte le 29 pillole che ne erano prive (M3-M8), più le note degli archi del knowledge graph (`strumenti/titoli_en.json`, chiave `note_archi`). Zero testi `en` null in corso, KG, lezioni e interfaccia: nessun "traduzione mancante" nei percorsi utente standard (test su tutte le pillole in IT e EN).
3. **Fabbisogno** (`dati/fabbisogno_strisce.json`, rigenerato insieme ai 15 domande M3 del cantiere parallelo): **40 spicchi erogabili su 40**, 0 domande mancanti per erogare e 0 per l'obiettivo di 3 domande per concetto.
4. **Test**: 166 pytest (165 verdi + 1 saltato, copertura 98%; comprende i test del cantiere M3), 178 prove Node verdi (112 di prima + quelle delle lezioni M3). Nuovo `tests/test_domande_autori.py` (ogni spicchio erogabile, minimo per concetto, domande autori erogabili e uguali ai lotti, anti-indizio, bande, estrattore che le conserva, strumento di inserimento). Test aggiornati (dichiarati): i test che usavano P1.1 come spicchio "in preparazione" ora lo ricostruiscono togliendo le domande autori da una copia del corso (`senza_autori` in conftest); il caso "traduzione mancante" si riproduce togliendo un testo inglese a una copia; i conteggi contano le domande per origine (120 benchmark, 11 dimostratore, autori ≥105); `copia_dati` copia tutte le lezioni vere; la politica sequenziale supera tutti gli spicchi erogabili dell'anello 1.

### Da sapere
- `tests/test_domande_autori.py` pretende che tutti gli spicchi siano erogabili; l'insieme `IN_SCRITTURA` (oggi vuoto) serve solo a dichiarare uno spicchio le cui domande sono in scrittura.
- Le 9 domande M3 scritte in questo lotto prima di sapere del cantiere M3 non sono state inserite (M3 è di quel cantiere): restano come riserva fuori dal progetto in `C:\Users\User\AppData\Local\Claude-Data\claude_pzs8sxrjxfjjc\local-agent-mode-sessions\db921416-4ab5-4b00-861b-b895d61f5223\0d0aa5bc-a6bb-4d37-ba5e-829b82276bbe\local_ee99c290-884d-4831-90dc-c89f562a3f9e\outputs\fix\m3_riserva_fork_b.json`.
- Contraddizioni fra il benchmark e i contenuti verificati (solo segnalate, non corrette): canary al 5% in P8.1 (D8.1-a L2, scaletta 4; fonte: 1%); "selezionare, ordinare e comprimere" in P5.1 scaletta 2 (fonte: "selezionare, riassumere, inserire"); P7.4 bias del giudice senza fonte e revisione umana come "verità"; P7.3 "20-50 casi" senza fonte; D6.3-b pub/sub [EXP]; D1.5-c "più costi" [EXP]; D1.1-b esempio [EXP]; P4.4 "15.000 token per 22 strumenti" incoerente col repo; concetti fail-closed/kill switch a tre livelli solo da [R15]. Le traduzioni inglesi sono fedeli all'italiano attuale, quindi riportano anche questi punti: vanno corretti nel documento benchmark.
- Revisione umana di France consigliata su un campione delle domande autori.

### Resta da fare
- Correggere nel benchmark le formulazioni contraddette (sopra) e riestrarre.
- Domande autori per gli spicchi già erogabili che restano sotto 3 punti di vista diversi (es. P2.2 C21: 3 domande ma tutte "definizione").

## Stato al 16/11/2026 — fase 4: lezioni interattive del modulo M3 (caso guidato: lead generation)

### Fatto
1. **Laboratorio** (nuovo nel modello): una pillola può avere, oltre alla lezione, una seconda lezione facoltativa `"tipo": "laboratorio"` (al massimo una, solo se c'è la lezione principale). Nella webapp compare la scheda «Laboratorio» / «Lab»; l'aiuto di una domanda può portare a un passo del laboratorio (`riferimento_aiuto` → `{"scheda": "laboratorio"}`); `rapporto()` elenca `laboratori`; il collaudo li elenca.
2. **5 lezioni interattive IT/EN** (stessa architettura e regole: 5 passi con "Prova tu" + riassunto in 3 frasi, 394-423 parole, solo esempi marketing/CRM, deterministiche):
   - P3.1 `pipeline_lead` «la pipeline completa»: il lead Giulia (modulo web con difetti) percorre 6 stazioni (pulizia → arricchimento → punteggio → email con approvazione → classificazione della risposta → CRM); contratto dati di ogni stazione con l'origine di ogni campo; stazioni da spegnere (input mancante + danno di business), «flusso da tutorial» contro flusso completo, «prova tutta la catena» che trova l'errore di mappatura che nessuna stazione vede.
   - P3.2 `punteggio_lead` «il punteggio dei lead»: 10 lead, regole a cursori (settore, dimensione, comportamento, ruolo + soglie) contro giudizio LLM; istruzioni vaghe = tutti 90-92 «alta» (difetto del repo 11), criteri espliciti + «valuta 5 volte» (nuvola stretta, gemelli), confronto dove lo studente marca «aiuta» (note scritte) / «inventa» (motivazioni senza fonte), soluzione mista e calibrazione con chi è diventato cliente.
   - P3.4 `email_marca` «scrivere l'email giusta»: frasi collegate al dato che le giustifica (rosse se inventate, gialle se ipotesi scritte come fatto), 6 regole di marca da accendere (l'email cambia davvero), prova (casella finta) / produzione (lucchetto con checklist), approva o rimanda, «approva sempre» come tranello.
   - P3.5 `leggere_risposte` «leggere le risposte»: 11 risposte nei raccoglitori + vassoio «a una persona», accordo su 5 tentativi, soglia con lavoro umano contro errori, regola «la disiscrizione vince sempre», gioco su 4 casi ambigui con «passa a un umano», modalità in ombra e ritorno dei dati al CRM e al punteggio.
   - P3.5 laboratorio `trova_errore` «TROVA L'ERRORE»: il bug reale del repo 11 (`if "Interested" in status` controllato prima di "Not Interested"): report 5/5 interessati a 90-92 → festeggi o controlli → etichetti le risposte vere → segui il dato e clicchi la stazione dove diventa sbagliato (la conversione, non l'LLM) → scegli la correzione (confronto esatto su elenco chiuso + sconosciuti a una persona + regola fissa disiscrizione) → report vero e abitudini anti-errore.
   - P3.3 (arricchimento) resta senza lezione propria: il suo nucleo è già manipolabile in P2.4; dichiarato in `tests/test_lezioni.py` (`PILLOLE_M3_SENZA_LEZIONE`).
3. **15 domande v2** (origine `autori`, striscia, distrattori classificati con spiegazione per ogni opzione, IT+EN, aiuto su un passo della lezione/laboratorio; P3.3 su `scaletta-N`), lotti `strumenti/domande_autori/lotto_m3_*.json`, inserite con `inserisci_domande.py`: P3.1 ×3 (DA3.1-1..3), P3.2 ×2, P3.3 ×2, P3.4 ×3, P3.5 ×5 (3 della lezione + 2 del laboratorio). **Tutti e 5 gli spicchi di M3 sono erogabili.**
4. **Test**: pytest tutti verdi (nuovo `tests/test_laboratorio.py`; `test_lezioni.py` esteso a laboratori e M3); prove Node 178 (+66 delle 5 lezioni M3); prova di fumo jsdom di tutti i 16 moduli in IT/EN, ogni passo e ogni comando: 0 errori; flusso completo della webapp contro il server vero (accesso, ogni pillola con lezione in IT e EN, ogni passo, scheda Laboratorio, aiuto che apre il laboratorio, P3.3 su scaletta): 186 passi, 0 errori.

### Da sapere
- Le etichette «Interested» / «Not Interested» restano in inglese anche nella lezione italiana: sono le parole del programma (la lezione lo spiega).
- Numeri nelle lezioni M3 (punteggi, ore, conteggi di calibrazione) dichiarati illustrativi; contenuti [EXP] usati come da CORSO_CONTENUTI_VERIFICATI (categorie delle risposte, regola della disiscrizione, soglie).
- Se `dati/corso_v1.json` venisse rigenerato da una copia vecchia, le domande M3 si reinseriscono con `python strumenti/inserisci_domande.py strumenti/domande_autori/lotto_m3_*.json`.
- Verifica su browser vero non fatta (solo DOM simulato + server vero).

### Resta da fare
- Revisione di France sui testi delle 5 lezioni M3 e delle 15 domande.
- Eventuale lezione propria per P3.3 (strati della scheda, tempo che invecchia i dati, costo dell'arricchimento).

## Stato al 16/11/2026 — fase 3: batch 1 di lezioni interattive (moduli M1 e M2)

### Fatto
1. **9 lezioni interattive nuove**, IT/EN, stessa architettura del dimostratore (un modulo JS per lezione in `webapp/animazioni/`, un JSON in `dati/lezioni/`, registrazione automatica nel catalogo, niente librerie esterne, tutto deterministico). Ogni lezione: 4-5 passi con "Prova tu" + riassunto finale in 3 frasi; 345-444 parole di testo (pillola da 5-6 minuti).
   - P1.1 `chatbot_agente`: la stessa richiesta entra in due corsie (chatbot / agente); 4 richieste, interruttori "conteggio passi" e "l'agente ha gli strumenti"; lo studente approva o scarta le proposte (una è un tranello).
   - P1.2 `parola_successiva`: tre scene. Token e istogramma della parola successiva con la temperatura e "Genera 5 volte"; finestra di contesto che taglia l'email del cliente (lo sconto esce e la risposta sbaglia); data di conoscenza con i fatti CRM di oggi da trascinare nel contesto.
   - P1.4 `anatomia_agente`: esploso in 4 blocchi da spegnere (modello, strumenti, orchestrazione, memoria) con il guasto tipico di ciascuno; modalità "Trova il guasto" (sintomo misterioso, lo studente clicca il blocco rotto).
   - P1.5 `spettro_autonomia`: cursore a 5 tacche che trasforma il processo CRM, 4 indicatori; gioco con 5 scenari da posare sulla tacca minima che basta.
   - P1.6 `funnel_crm`: funnel a 6 stadi con schede degli agenti, volume giornaliero → ore risparmiate, dati in ordine, costo dell'errore → lucchetti; modalità "Decidi tu" con controllo stadio per stadio.
   - P2.1 `costruttore_istruzioni`: 6 blocchi da accendere e riordinare, email che si ricompone con i difetti in rosso, "Genera 5 volte"; l'errore classico dell'istruzione ambigua e di quella contraddittoria (solo lì l'ordine cambia l'esito).
   - P2.2 `cancello_validazione`: la frase si incastra al cancello; con il formato imposto i dati (schede chiave→valore, JSON grezzo a richiesta) compilano da soli la scheda CRM; "Rompi l'output", nuovi tentativi o passaggio a una persona.
   - P2.3 `react_piano`: ReAct con card Pensiero/Azione/Osservazione collegate, "Indovina la prossima mossa", imprevisti, dato fuorviante; modalità Piano con ripianificazione evidenziata; contatori passi/approvazioni.
   - P2.4 `revisore_allucinazioni`: scheda lead arricchita con semafori (verificato/ipotesi/inventato/non lo so), fonti 0-3, "non lo so", citazioni, agente onesto/che inventa; modalità Revisore con verdetto campo per campo e segnale che tradiva il dato.
2. **Traduzioni EN** dei testi lunghi (obiettivo, scaletta, progetto dell'animazione) delle 9 pillole in `strumenti/traduzioni_en_pillole.json`, applicate con l'estrattore (che conserva le domande): ora le pillole dei moduli 1-2 si aprono anche in inglese.
3. **Test**: 142 pytest verdi (copertura 98%); nuovo `tests/test_lezioni.py` (ogni pillola di M1-M2 ha la lezione, passi con "Prova tu", riassunto in 3 frasi, durata, concetti della pillola, niente "come già spiegato", apertura IT/EN, moduli autonomi e deterministici, serviti dopo l'accesso); regole in config `regole_lezioni`. Prove Node: 112 (18 del dimostratore + 94 delle nuove lezioni, un file per lezione in `tests_js/lezioni/`). Prova di fumo in DOM simulato (jsdom) di tutte le 11 lezioni in IT e EN, ogni passo e ogni comando toccato: 0 errori.
4. **Collaudo**: `collaudo.ps1` esegue anche le prove delle nuove lezioni ed elenca le lezioni da provare.

### Da sapere
- Le nuove lezioni **non portano domande proprie** (`"domande": []`): la verifica di una pillola si apre solo se le domande benchmark bastano (oggi, fra queste 9, solo P2.2). Le altre restano "in preparazione" per la verifica, ma la lezione si apre e si usa.
- Le domande benchmark di queste pillole hanno l'aiuto su un passo della scaletta (`scaletta-N`): resta valido; si può spostarlo sul segmento giusto della lezione quando si scrivono le domande nuove.
- Le due lezioni del dimostratore (P1.3, P4.1) non hanno ancora il riassunto in 3 frasi (escluse dalla regola in config `regole_lezioni.componenti_senza_riassunto`).
- Verifica visiva su browser vero **non fatta** (qui nessun browser disponibile): solo DOM simulato.

### Resta da fare
- Domande delle 9 pillole (servono almeno 2 per concetto: vedi `dati/fabbisogno_strisce.json`), con `striscia` e aiuto sul segmento della lezione.
- Riassunto in 3 frasi anche per P1.3 e P4.1.
- Lezioni dei moduli M3-M8.

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
- Testi lunghi delle pillole (obiettivo, scaletta, progetto animazione) ancora senza inglese tranne i moduli 1-2 e P4.1 (moduli 1-2 tradotti nella fase 3): in inglese l'aiuto "scaletta" di quelle pillole risponde "traduzione mancante".
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
