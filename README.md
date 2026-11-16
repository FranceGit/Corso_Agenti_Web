# Corso Agenti Web

Piattaforma web del corso **«Costruire agenti AI per CRM, marketing e lead generation»**, per persone di marketing e manager senza formazione tecnica.

Documenti del progetto:

| File | Per che cosa |
|---|---|
| `README.md` | questo file: che cos'è, come si avvia, dove sta che cosa |
| `ARCHITETTURA.md` | i pezzi, i loro confini, file generati e file di origine, il livello 2, le regole del progetto |
| `MANUTENZIONE.md` | ricette passo-passo (domande, testi, lezioni, esercizi, repo studente, collaudo) e cosa non fare |
| `CONTRATTO_CONTENUTI_OFFICINA.md` | regole vincolanti per scrivere lezioni e domande del livello 2 |
| `PROGRESSI.md` | storia del lavoro, cantiere per cantiere, con esiti dei test e punti aperti |

## Che cos'è

- **Solo web, protetto.** I contenuti restano sul server ed escono solo dalle API, dopo l'accesso (cookie HttpOnly, intestazioni `no-store`). La cartella `dati/` non è mai servita. Non c'è niente da scaricare. Ciò che il browser mostra si può sempre fotografare: la protezione impedisce la distribuzione dei file, non la visione.
- **Bilingue IT/EN.** Ogni testo del modello è `{it, en}`. Se un testo manca in una lingua il server lo dichiara: non mostra mai l'altra lingua al suo posto.
- **La lezione è l'animazione interattiva.** Ogni pillola ha un banco a quattro finestre numerate (① concetto, ② spiegazioni, ③ animazione, ④ comandi): lo studente cambia i comandi e vede l'agente comportarsi in modo diverso. Passi numerati con «Prova tu», riassunto finale in 3 frasi, al massimo 500 parole.
- **Verifiche mai aperte.** Ogni domanda ha due livelli a scelta multipla: livello 1 la risposta, livello 2 il perché (posto solo se il livello 1 è giusto).
- **Salute al posto del punteggio**, record personale al posto delle classifiche, ripasso distanziato.
- **Due livelli.**

  | Livello | Contenuto | Numeri |
  |---|---|---|
  | 1 | 8 moduli M1-M8 (dall'agente alla produzione e governance) + esercizi pratici 1-6 | 40 pillole, 39 lezioni + 2 laboratori, 309 domande erogabili (298 in `corso_v1.json` + 11 nelle due lezioni del dimostratore), 79 concetti |
  | 2 «Officina» | 6 unità O1-O6 (Docker, repo adottato, CRM enterprise, MCP, assistente libero, Codespaces) + esercizi 7-12 | 12 pillole, 12 lezioni, 51 domande, 17 concetti |

  L'Officina si apre dopo il livello 1 (in modalità alpha è aperta per il collaudo e lo dichiara).

## Avvio rapido (Windows, PowerShell)

Un solo comando crea l'ambiente `.venv`, installa le dipendenze, esegue i test Python, il rapporto di erogabilità e le prove Node delle animazioni, poi chiede se avviare il server:

```powershell
powershell -ExecutionPolicy Bypass -File C:\Claude_desktop\Game_Development\Corso_Agenti_Web\collaudo.ps1
```

- L'esito completo finisce in `collaudo_esito.txt` (nella radice, escluso da git).
- Se esiste `F:\A\CD\Game_Development\000_PROGETTO\CORSO_BENCHMARK_STRUTTURA.md`, un test in più verifica che l'estrazione dal documento sia riproducibile; altrimenti quel test viene saltato e pytest lo dice.
- Alla domanda finale: `S` avvia il server, `Q` esce.

Avvio del server senza collaudo:

```powershell
cd C:\Claude_desktop\Game_Development\Corso_Agenti_Web
.\.venv\Scripts\python.exe server.py
```

Il browser **non** si apre da solo: il server stampa `Apri nel tuo browser: http://127.0.0.1:8780`. Se la porta è occupata lo dice ed esce (codice 3).

**Accesso**: email qualsiasi, codice `DEMO-AGENTI`. È un accesso provvisorio (stub): i codici validi sono in `config/piattaforma.json` → `account.codici_stub`.

## Struttura del progetto

```
Corso_Agenti_Web/
├── server.py                     avvio del server locale (controlla la porta, stampa l'indirizzo)
├── collaudo.ps1                  collaudo in un comando (ambiente, test, rapporto, server)
├── PUBBLICA_OFFICINA.cmd         pubblica codespaces_modello/ sul repo studente FranceGit/corso-officina
├── requirements.txt              dipendenze Python (solo licenze permissive)
├── pytest.ini                    raccoglie tests/ ed esercizi/tests
│
├── config/
│   ├── piattaforma.json          TUTTI i parametri, ognuno con il suo _why (salute, domande, percorso, officina, alpha...)
│   ├── interfaccia.json          testi dell'interfaccia IT/EN
│   └── bibliografia_esempio.json voci d'esempio se manca dati/bibliografia.json
│
├── corso/                        il server del corso (Python, FastAPI + Pydantic)
│   ├── modello.py                modello dati: unica fonte di verità degli schemi
│   ├── catalogo.py               carica e incrocia corso, knowledge graph, lezioni; decide cosa è erogabile
│   ├── regole_domande.py         regola di France sul numero di opzioni e sulla plausibilità
│   ├── percorsi.py               generatore di percorso (anelli, spicchi, strisce), deterministico per seme
│   ├── motore.py                 motore dello studente: quiz a due livelli, salute, ripasso, aiuti, record
│   ├── salute.py                 funzioni pure della salute e del ripasso
│   ├── stato.py                  stato dello studente su file (nome = impronta SHA-256 dell'email)
│   ├── officina.py               livello 2: config derivata, cancello di sblocco
│   ├── app.py                    rotte HTTP (/api, /api/officina, /protetto), protezione dei contenuti
│   ├── account.py                accesso stub (email + codice, sessioni in memoria)
│   ├── config.py, errori.py      config ad accesso stretto, errori espliciti
│   ├── lingua.py                 risoluzione IT/EN senza ripiego sull'altra lingua
│   └── migrazioni.py             migrazioni del file del corso fra versioni dello schema
│
├── dati/                         contenuti (MAI serviti come file statici)
│   ├── corso_v1.json             GENERATO: livello 1 (moduli, pillole, domande)
│   ├── knowledge_graph.json      GENERATO: concetti e archi del livello 1
│   ├── lezioni/*.json            lezioni del livello 1 (file di origine)
│   ├── bibliografia.json         opere citate (nessun URL)
│   ├── fabbisogno_strisce.json   GENERATO da strumenti/fabbisogno_strisce.py
│   └── officina/                 livello 2, separato
│       ├── corso_officina.json   unità, pillole, domande dell'Officina
│       ├── knowledge_graph_officina.json
│       └── lezioni/*.json
│
├── schema/                       GENERATO da strumenti/esporta_schema.py (corso, lezione, knowledge graph)
│
├── strumenti/                    riga di comando
│   ├── estrai_corso.py           documento benchmark → corso_v1.json + knowledge_graph.json
│   ├── inserisci_domande.py      lotti di domande → corso (livello 1 o Officina)
│   ├── esporta_schema.py         modello → schema/
│   ├── fabbisogno_strisce.py     quante domande mancano per concetto
│   ├── prepara_codespaces.py     fonti → codespaces_modello/ (--verifica per il solo controllo)
│   ├── domande_autori/lotto_*.json   FONTE delle domande d'autore (m* livello 1, o* Officina)
│   ├── traduzioni_en_pillole.json    FONTE dell'inglese dei testi lunghi delle pillole
│   ├── titoli_en.json                FONTE dell'inglese di titoli, concetti e note degli archi
│   └── codespaces/               FONTE del kit Codespaces (devcontainer, README, requirements, pacchetto.py)
│
├── webapp/                       interfaccia
│   ├── index.html, app.js, app.css   shell pubblica (unici file serviti senza accesso)
│   └── animazioni/<componente>.js    un modulo per lezione, servito solo da /protetto/animazioni/
│
├── esercizi/                     esercizi pratici con correttore deterministico
│   ├── motore/                   contratto dell'esercizio, CRM SQLite, posta, registro LLM, portale, CLI
│   ├── catalogo/e01…e12_*.py     un modulo per esercizio
│   ├── officina/                 area «officina» (e07-e12): analisi dei file, banco isolato di e08, materiale O1-O6
│   ├── assistente/               assistente libero O5 (backend finto / ollama / groq)
│   ├── finto_llm/                modello finto deterministico
│   ├── ambiente/                 docker-compose, Dockerfile, script del laboratorio (.ps1 e .sh)
│   ├── config/                   laboratorio.json (e01-e06), officina.json (e07-e12), testi
│   ├── webapp/                   pagina «Esercizi pratici» (servita da /protetto/esercizi/)
│   ├── collaudo/                 browser simulato: server_collaudo.py, flusso_browser.mjs, flusso_officina.mjs
│   ├── tests/                    pytest degli esercizi
│   └── LEGGIMI_DOCKER.md         guida al laboratorio Docker per non tecnici
│
├── codespaces_modello/           GENERATO: contenuto del repo studente (solo esercizi e assistente, niente corso)
├── tests/                        pytest della piattaforma
├── tests_js/                     prove Node: prova_animazioni.mjs, misura_testi.mjs, lezioni/<componente>.mjs
│
├── stato_studenti/, stato_esercizi/   dati degli studenti a runtime (esclusi da git)
└── node_modules/                 jsdom per misura_testi (escluso da git)
```

Fuori dal repo, in `F:\A\CD\Game_Development\000_PROGETTO\`: `CORSO_BENCHMARK_STRUTTURA.md` (documento benchmark, fonte italiana di moduli, pillole e knowledge graph del livello 1) e `CORSO_CONTENUTI_VERIFICATI.md` (fonti verificate da cui nascono le domande d'autore).

## I due repository

| Repository | Visibilità | Contenuto | Come si aggiorna |
|---|---|---|---|
| `github.com/FranceGit/Corso_Agenti_Web` | privato | **questo**: piattaforma completa (corso, contenuti, esercizi, strumenti, test) | commit e push di France |
| `github.com/FranceGit/corso-officina` | privato | repo dello studente per GitHub Codespaces: esercizi dell'Officina, materiale, assistente libero, devcontainer. Nessun contenuto del corso | `python strumenti/prepara_codespaces.py`, poi `PUBBLICA_OFFICINA.cmd` (token GitHub da `OFFICINA_GITHUB_TOKEN` o incollato e poi rimosso; mai push forzato) |

Il repo studente resta privato perché contiene la copia del CRM patowari, che non ha licenza: pubblico solo con il permesso dell'autore o dopo averlo sostituito. Gli studenti si invitano come collaboratori.

## Licenze

Solo dipendenze gratuite e permissive: FastAPI (MIT), Uvicorn (BSD), Pydantic (MIT), HTTPX (BSD), pytest e pytest-cov (MIT), PyYAML (MIT); jsdom (MIT) solo per le prove. Nessuna libreria o font da CDN: tutto è servito localmente. Estratti di terzi nel materiale dell'Officina: nebula (MIT, licenza inclusa), README dei server MCP (CC-BY-4.0, con attribuzione); patowari senza licenza (vedi sopra).
