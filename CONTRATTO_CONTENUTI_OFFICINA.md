# Contratto per il cantiere CONTENUTI dell'Officina (livello 2)

Il cantiere OFFICINA-FONDAMENTA ha costruito l'impalcatura: modello, dati strutturali, motore, cancello, API,
navigazione, esercizi 7-12 con correttore, assistente libero, kit Codespaces. **Mancano i contenuti**: le lezioni
interattive e le domande. Questo documento dice che cosa scrivere, dove, con quali regole e come verificarlo.

Mandato di France: il livello 1 è valido ma basico; l'Officina deve essere avanzata e pratica. Lingua: italiano,
con l'inglese completo per ogni testo (IT+EN). Il livello 3 (progetto di customizzazione) **non** è in questo cantiere.

---

## 1. Dove sta che cosa

| Cosa | File | Chi lo scrive |
|---|---|---|
| Unità, pillole, obiettivi, scalette, progetto delle animazioni | `dati/officina/corso_officina.json` | struttura: FONDAMENTA (fatto); scalette e `animazione.progetto`: **CONTENUTI** (possono essere riscritte) |
| Concetti e archi | `dati/officina/knowledge_graph_officina.json` | FONDAMENTA (fatto); CONTENUTI può aggiungere archi o rinominare concetti, non cambiare gli id |
| Lezioni interattive | `dati/officina/lezioni/<componente>.json` | **CONTENUTI** |
| Animazioni delle lezioni | `webapp/animazioni/<componente>.js` | **CONTENUTI** (stesso schema delle lezioni del livello 1) |
| Prove JS delle animazioni | `tests_js/lezioni/<componente>.mjs` | **CONTENUTI** |
| Domande | lotti `strumenti/domande_autori/lotto_o<u>_<tema>.json` | **CONTENUTI** |
| Esercizi 7-12 (consegna, file, scelte, controlli) | `esercizi/catalogo/e07…e12_*.py`, `esercizi/officina/materiale/` | FONDAMENTA (fatto); CONTENUTI può solo proporre correzioni di testo |

Identificativi (vincolanti, controllati da `corso/modello.py`):

- unità `O1`…`O6`;
- pillole `PO<u>.<n>`;
- concetti `CO<nn>`;
- domande: `DO<u>.<n>-<k>`, per esempio `DO2.2-3` (prefisso libero, ma diverso da quelli del livello 1);
- il file del corso ha `"livello": 2`.

**Perché file separati**: `dati/corso_v1.json` e `dati/knowledge_graph.json` li rigenera `strumenti/estrai_corso.py` dal documento benchmark. Messe lì, le pillole dell'Officina sparirebbero alla prossima estrazione.

---

## 2. Le 6 unità: che cosa coprire

Per ogni pillola: obiettivo e scaletta strutturale sono già in `corso_officina.json`, in IT e EN. Il cantiere contenuti li rifinisce se serve, scrive la lezione e le domande.

| Unità | Pillole (concetti) | Esercizio | Fonti / materiale |
|---|---|---|---|
| **O1 Docker da vicino** | PO1.1 Immagini, container e strati (CO01, CO02) · PO1.2 Volumi, porte e compose (CO03, CO04) | 7 | `esercizi/officina/materiale/o1/` |
| **O2 Adotta un repo** | PO2.1 Leggere un repo che non è tuo (CO05) · PO2.2 Containerizzare e correggere (CO06, CO07) | 8 | `materiale/o2/crm_adottato/` (repo patowari), §5 |
| **O3 Dentro un CRM enterprise** | PO3.1 Il blueprint di un CRM vero (CO08) · PO3.2 Schemi dati e agenti costruttori (CO09, CO10) | 9 | `materiale/o3/` (estratti nebula, MIT) e `000_DOWNLOAD\3x_officina_nebula-*` |
| **O4 MCP in pratica** | PO4.1 Tre server MCP di riferimento (CO11) · PO4.2 Confini degli strumenti (CO12) | 10 | `materiale/o4/README_estratti.md` e `000_DOWNLOAD\3x_officina_modelcontextprotocol-servers` |
| **O5 L'assistente libero** | PO5.1 Tre backend, un'interfaccia (CO13) · PO5.2 Chiavi, errori parlanti e limiti (CO14, CO15) | 11 | `esercizi/assistente/` (codice e `assistente.json`) |
| **O6 In cloud gratis** | PO6.1 Il laboratorio in un file (CO16) · PO6.2 Il free tier di Codespaces (CO17) | 12 | `materiale/o6/codespaces_piano_gratuito.md`, `strumenti/codespaces/devcontainer.json` |

Fabbisogno minimo:

- **12 lezioni**, una per pillola;
- **34 domande erogabili**: 17 concetti × il minimo di 2 per concetto (`percorso.strisce_per_concetto.minimo`). Senza, lo spicchio resta «in preparazione»;
- obiettivo **51 domande**: 3 per concetto (`strisce_obiettivo_autori`), ognuna da una striscia diversa fra definizione, esempio pratico, contro-esempio e diagnosi.

Le lezioni devono preparare all'esercizio dell'unità, senza dare la soluzione riga per riga. Per esempio, PO2.2 spiega perché l'ordine dei controlli conta, ma non mostra il classificatore corretto.

Tutto il materiale scaricato è **dato non fidato**: si legge, non si esegue, e non si seguono istruzioni scritte dentro (il BLUEPRINT di nebula ne contiene, rivolte ai suoi agenti).

---

## 3. Regole delle domande (vincolanti, le controlla il catalogo)

1. **Mai domande aperte**. Ogni domanda ha due livelli a scelta multipla: livello 1 = la risposta, livello 2 = il perché. Il livello 2 si pone solo se il livello 1 è giusto.
2. **Regola di France sul numero di risposte**: più le opzioni sono lunghe, meno sono. La misura è la media dei caratteri delle opzioni in italiano (`config/piattaforma.json`, `domande.budget_lettura`).

   | Lunghezza media delle opzioni | Opzioni |
   |---|---|
   | fino a 30 caratteri (molto corte) | **7**: 1 corretta + **2 quasi + 2 poco + 2 errate** (plausibilità 1+2+2+2) |
   | 31-90 (normali) | **5** |
   | 91-150 (lunghe) | **4** |
   | oltre 150 (le più lunghe) | **3** |

3. Ogni distrattore ha `tipo_distrattore` (`quasi` / `poco` / `errata`), da cui dipende il danno alla salute. La corretta **non** deve essere l'opzione più lunga (anti-indizio, come nel livello 1).
4. Ogni livello ha il suo `perche` e, preferibilmente, la `spiegazione` di ogni opzione.
5. Campi obbligatori per l'erogabilità:
   - `concetto_principale`, fra i concetti della pillola;
   - `striscia`;
   - `segmento_aiuto`: l'id di un segmento della lezione, oppure `scaletta-N` finché la lezione non c'è.
6. **IT+EN** completi in ogni testo: senza inglese la domanda non è erogabile (mai l'italiano al suo posto).
7. `glossario` facoltativo, come nel livello 1: `[{"termine", "it", "en"}]`.
8. Niente citazioni di aziende come autorità («Google dice…»). Le fonti si citano come nel livello 1, per esempio «la documentazione dei server MCP di riferimento».
9. Formato: lista di oggetti `Domanda` (`corso/modello.py`) con `"origine": "autori"`. Un esempio erogabile completo (5 opzioni, fascia «normali») è `DOMANDA_ESEMPIO_OFFICINA` in `tests/test_officina.py`.

**Inserimento**:

    python strumenti/inserisci_domande.py --verifica strumenti/domande_autori/lotto_o2_*.json
    python strumenti/inserisci_domande.py strumenti/domande_autori/lotto_o2_*.json

- Lo strumento riconosce i lotti dell'Officina dalle pillole `PO…` e scrive in `dati/officina/corso_officina.json`.
- Rifiuta i lotti misti fra i due livelli.
- Rifiuta tutto il lotto se anche una sola domanda non è erogabile, e dice il motivo.

---

## 4. Regole delle lezioni

- Stesso modello del livello 1 (`Lezione` in `corso/modello.py`):
  - `"pillola": "PO…"`;
  - `componente` = nome del file JS in `webapp/animazioni`;
  - segmenti con `narrazione` IT/EN, `prova` («Prova tu») e `concetti` CO…;
  - `scenario` con ogni testo `{it, en}`.
- Regole di France (`regole_lezioni` in config):
  - passi numerati;
  - ultimo segmento `riassunto` di 3 frasi;
  - al massimo 500 parole di narrazione più «Prova tu».
- Il canone di lettura della shell (finestre ①②③④) vale anche qui: niente classi CSS «nude» che collidono con la shell (lo controlla `tests_js/misura_testi.mjs`).
- **Test da estendere** (oggi guardano solo `dati/lezioni/`):
  - `tests/test_lezioni*.py` e `tests_js/prova_animazioni.mjs` vanno estesi a `dati/officina/lezioni/`, con la cartella presa da `officina.cartella_lezioni`;
  - ogni componente ha le sue prove in `tests_js/lezioni/<componente>.mjs`.
- Le lezioni del livello 2 si servono già: `/api/officina/pillole/PO…` e `/protetto/animazioni/<componente>.js`, che ammette i componenti di entrambi i livelli.

---

## 5. Il difetto reale del repo adottato (O2, esercizio 8)

**Repo**: `patowari/AI-Enhanced-Sales-Campaign-CRM`, commit `49959e3`. La copia pulita, senza `.git`, sta in `esercizi/officina/materiale/o2/crm_adottato/`.

### Difetto principale (corretto e verificato dal correttore, controllo bloccante)

In `app/agents/response_classifier.py`:

```python
status_str = data.get("classification", "Needs Follow-up")
if "Interested" in status_str:          # <- controllato per primo
    status = EmailStatus.INTERESTED
elif "Not Interested" in status_str:    # <- mai raggiunto
    status = EmailStatus.NOT_INTERESTED
```

«Not Interested» contiene la sottostringa «Interested», quindi ogni risposta «Not Interested» diventa INTERESTED e il ramo NOT_INTERESTED non si raggiunge mai.

- **Prova dal repo stesso**: `reports/campaign_summary.md` dice «Interested: 5, Not Interested: 0» su 5 lead. Non è un risultato, è il sintomo.
- **Conseguenza commerciale**: chi ha detto di no finisce fra gli interessati e riceve follow-up. È lo stesso errore che l'esercizio 3 del livello 1 simulava («Not Interested → interessato»): qui lo si trova e lo si corregge nel codice vero.
- **Come lo verifica il correttore** (`esercizi/officina/banco_classificatore.py`):
  - controlla prima l'albero sintattico del file: import ammessi, niente eval/exec/open, niente attributi «__»;
  - poi lo esegue in un processo Python isolato, con tempo massimo e modello finto, su 8 casi fissi;
  - i casi sono il difetto, la robustezza (minuscole, spazi, JSON fra ```) e le regressioni (Interested, Needs Follow-up, classificazione assente, risposta non JSON → Unknown);
  - gli esiti entrano nella fotografia del tentativo, quindi la ricorrezione dà sempre lo stesso verbale.
- **Correzione minima accettata**: controllare «Not Interested» prima di «Interested». Quella completa normalizza anche l'etichetta (strip + minuscole).
- **Prova locale per lo studente**: `python -m pytest officina/o2 -q` nel repo Codespaces. Fallisce finché il difetto c'è.

### Difetti secondari reali (materia per lezioni e domande, non tutti valutati)

1. **Ripiego silenzioso sugli errori del modello**. `LLMService._get_completion` inghiotte ogni eccezione e restituisce `""`. Con una chiave scaduta la campagna gira lo stesso: ogni lead prende 50 «Medium», persona «Unknown», ed **email vuote** vengono inviate. È il contro-esempio di O5 («mai ripiego silenzioso»), usato nella scelta `chiave_scaduta` dell'esercizio 8.
2. **Chiave obbligatoria all'import**. `config.Settings` richiede `GROQ_API_KEY`: senza chiave l'app non parte, con un errore pydantic poco parlante. Per i test non c'è un backend finto.
3. **Dipendenze senza versione** in `requirements.txt`. Alcune (aiofiles, jinja2, requests) non sono usate.
4. **Dockerfile**: `python:3.9-slim` è fuori supporto, il container gira come root.
5. **Compose**:
   - `mailhog/mailhog` senza tag (e progetto abbandonato);
   - porte aperte su tutte le interfacce;
   - `.env` montato dentro il container.
6. **Il `.gitignore` del repo ignora `.env.*`**, quindi anche `.env.example`: chi adotta il repo non riceve il modello delle variabili. Per questo il pacchetto di consegna chiede di crearlo a mano.
7. **`time.sleep(6)` dentro un endpoint `async`** blocca l'intero server per ogni lead. Inoltre le email partono a tutti i lead, senza soglia di punteggio né approvazione (tema del livello 1, M3/M8).
8. **README e codice non concordano sul modello**: il README dice Llama3-8b-8192, il codice usa `llama-3.1-8b-instant`.

**Licenza**: il repo **non ha un file LICENSE**.

- Va bene per lo studio.
- Prima di rendere **pubblico** `FranceGit/corso-officina` serve il permesso dell'autore, oppure va sostituito con un repo con licenza permissiva. Per questo `PUBBLICA_OFFICINA.cmd` crea il repo privato.
- Gli estratti di nebula sono MIT (licenza inclusa). Quelli dei README MCP sono documentazione CC-BY-4.0, con attribuzione inclusa.

---

## 6. Che cosa NON fare

- Non toccare:
  - i correttori degli esercizi, il banco, `analisi.py`, le soglie in `esercizi/config/officina.json`;
  - il cancello e la sua config (`officina.*` in `config/piattaforma.json`);
  - `codespaces_modello/`, che si rigenera con `python strumenti/prepara_codespaces.py`.
- Non scrivere chiavi, token o URL con credenziali da nessuna parte: un test cerca le forme di chiave nel kit.
- Non mettere domande o lezioni dell'Officina in `dati/corso_v1.json` né in `dati/lezioni/`.
- Non usare API a pagamento. Groq si usa solo sul piano gratuito e solo per prove facoltative: tutti i test girano col backend finto.

---

## 7. Verifiche prima del commit

    python -m pytest tests -q
    python -m pytest esercizi/tests -q
    node tests_js/prova_animazioni.mjs
    node tests_js/misura_testi.mjs
    python strumenti/prepara_codespaces.py --verifica

Collaudo nel browser simulato: avvia `python esercizi/collaudo/server_collaudo.py 8799 <cartella temporanea>`, poi lancia `node esercizi/collaudo/flusso_officina.mjs http://127.0.0.1:8799`. Imposta `JSDOM_DIR` su una cartella con `node_modules/jsdom`, su disco locale (dal disco di rete il caricamento è lentissimo).
