# Laboratorio degli esercizi con Docker: istruzioni passo passo

Questa guida serve per accendere sul tuo PC il **laboratorio vero** degli esercizi pratici: il portale del corso, il CRM didattico, la posta finta (Mailpit) e, se vuoi, un modello linguistico vero (Ollama).

> **Prima di tutto: per provare gli esercizi Docker non serve.**
> Il server normale del corso (`collaudo.ps1` oppure `python server.py`) contiene già la pagina **Esercizi pratici**. In quel caso usa il finto-LLM e una posta finta interna. Docker serve solo per avere il laboratorio completo con Mailpit e Ollama, uguale a quello che useranno gli studenti.

Tutti i comandi vanno scritti in **PowerShell**. Per aprirlo: tasto Windows, scrivi `PowerShell`, premi Invio.

---

## Passo 1 — Installare Docker Desktop (una volta sola, circa 20 minuti)

### 1.1 Controlla che il PC sia pronto

1. Premi `Ctrl + Maiusc + Esc` per aprire Gestione attività.
2. Vai su **Prestazioni** e poi su **CPU**.
3. In basso a destra deve esserci scritto **Virtualizzazione: Abilitato**.
   - Se c'è scritto *Disabilitato*, la virtualizzazione va attivata nel BIOS del PC. È un'impostazione del produttore: cerca "attivare virtualizzazione BIOS" più il modello del tuo PC, oppure chiedi a un tecnico.
4. RAM:
   - per il laboratorio con il **finto-LLM** bastano 8 GB;
   - per **Ollama** sullo stesso PC ne servono almeno 16.

### 1.2 Scarica e installa

1. Apri nel browser **https://www.docker.com/products/docker-desktop/**.
2. Premi **Download for Windows – AMD64**. Scegli *ARM64* solo se il tuo PC ha un processore Snapdragon.
3. Apri il file scaricato, `Docker Desktop Installer.exe`, e rispondi **Sì** alla richiesta di Windows.
4. Nella prima schermata lascia spuntata la voce **Use WSL 2 instead of Hyper-V (recommended)** e premi **Ok**.
5. Alla fine premi **Close and restart**: il PC si riavvia.

### 1.3 Primo avvio

1. Dopo il riavvio Docker Desktop si apre da solo. Se non si apre, cercalo nel menu Start.
2. Accetta il contratto di servizio (**Accept**).
   - **Nota sulla licenza:** Docker Desktop è gratuito per uso personale, istruzione e aziende con meno di 250 dipendenti **e** meno di 10 milioni di dollari di fatturato. Se il corso è erogato da un'organizzazione più grande, verifica la licenza.
3. Se chiede di accedere con un account, premi **Continue without signing in** (o *Skip*). Salta anche il questionario.
4. A volte compare il messaggio *"WSL needs updating"*. In quel caso:
   - apri PowerShell **come amministratore** (tasto destro sull'icona → *Esegui come amministratore*);
   - scrivi `wsl --update`;
   - riavvia Docker Desktop.
5. Aspetta che in basso a sinistra compaia **Engine running**, con la balena verde.

### 1.4 Verifica

In PowerShell scrivi:

```powershell
docker version
docker compose version
```

Se entrambi rispondono con dei numeri di versione, Docker è pronto.

---

## Passo 2 — Accendere il laboratorio

Scrivi questi due comandi:

```powershell
cd C:\Claude_desktop\Game_Development\Corso_Agenti_Web\esercizi\ambiente
powershell -ExecutionPolicy Bypass -File .\avvia_laboratorio.ps1
```

- La **prima volta** ci vogliono alcuni minuti: Docker scarica Python e Mailpit e prepara l'immagine del laboratorio. Le volte successive bastano pochi secondi.
- Alla fine compare **Laboratorio acceso** con tre indirizzi da aprire nel browser:

| Cosa | Indirizzo | Per chi |
|---|---|---|
| Portale del corso, con la pagina **Esercizi pratici** | http://127.0.0.1:8780 | studenti (codice di prova `DEMO-AGENTI`) |
| Posta finta (Mailpit): le email "inviate" dagli esercizi | http://127.0.0.1:8025 | docente |
| CRM didattico (sola lettura, dati degli studenti) | http://127.0.0.1:8790/studenti | docente |

Tutti gli indirizzi funzionano solo da questo PC (`127.0.0.1`). Il laboratorio non è visibile dalla rete e nessuna email esce davvero.

> Se il server normale del corso (`python server.py`) è acceso, occupa la porta 8780. In quel caso chiudi la sua finestra, oppure avvia il laboratorio su un'altra porta: `.\avvia_laboratorio.ps1 -PortaPortale 8781`.

### Spegnere e riaccendere

```powershell
cd C:\Claude_desktop\Game_Development\Corso_Agenti_Web\esercizi\ambiente
docker compose stop
```

Per riaccendere rilancia `avvia_laboratorio.ps1`. Il lavoro degli studenti resta salvato nei volumi di Docker.

---

## Passo 3 — Correggere e azzerare da terminale (facoltativo)

Il bottone **Verifica** del portale fa già tutto. Questi comandi servono a te come docente.

```powershell
# correggere l'esercizio 3 di uno studente (stesso verbale del bottone Verifica)
powershell -ExecutionPolicy Bypass -File .\verifica_esercizio.ps1 -N 3 -Studente rossi@scuola.it
# lo stesso, con il verbale completo in JSON
powershell -ExecutionPolicy Bypass -File .\verifica_esercizio.ps1 -N 3 -Studente rossi@scuola.it -Json
# riportare l'esercizio 1 di uno studente ai dati di partenza
powershell -ExecutionPolicy Bypass -File .\azzera_laboratorio.ps1 -Esercizio 1 -Studente rossi@scuola.it
# cancellare il lavoro di TUTTI gli studenti (chiede di scrivere SI)
powershell -ExecutionPolicy Bypass -File .\azzera_laboratorio.ps1 -Tutto
```

Senza Docker c'è il server normale con il `.venv` creato da `collaudo.ps1`. Basta aggiungere `-Locale`:

```powershell
powershell -ExecutionPolicy Bypass -File .\verifica_esercizio.ps1 -N 2 -Studente prova@prova.it -Locale
```

---

## Passo 4 — Usare un modello vero (Ollama) al posto del finto-LLM (facoltativo)

Il finto-LLM risponde da tabelle fisse. Basta per gli esercizi 1–3: l'1 e il 2 non usano il modello, il 3 ne usa solo le etichette. Per vedere un modello vero le strade sono due.

### A) Ollama dentro il laboratorio, su questo PC

```powershell
powershell -ExecutionPolicy Bypass -File .\avvia_laboratorio.ps1 -Modello ollama
```

- La prima volta scarica il modello `qwen2.5:3b` (circa 2 GB). Per seguire l'avanzamento: `docker compose logs -f ollama-modello`.
- Per un modello migliore, se hai abbastanza RAM: `-Modello ollama -NomeModello qwen2.5:7b` (circa 5 GB, servono 16 GB di RAM o più).
- Sui PC con scheda video NVIDIA il modello è molto più veloce. In `docker-compose.yml`, sotto il servizio `ollama`, togli il `#` davanti a `gpus: all`.

### B) Ollama condiviso d'aula su un altro PC

1. Sul PC del docente installa Ollama da **https://ollama.com/download** (versione per Windows).
2. Scarica il modello: `ollama pull qwen2.5:7b`.
3. Rendi Ollama raggiungibile dagli altri PC:
   - da *Impostazioni di sistema → Variabili d'ambiente*, aggiungi la variabile `OLLAMA_HOST` con valore `0.0.0.0`;
   - riavvia Ollama;
   - consenti l'accesso quando lo chiede Windows Firewall.
4. Sul PC del laboratorio (sostituisci l'indirizzo con quello del PC del docente):

```powershell
powershell -ExecutionPolicy Bypass -File .\avvia_laboratorio.ps1 -Modello aula -UrlAula http://192.168.1.50:11434 -NomeModello qwen2.5:7b
```

Ogni risposta del modello viene salvata nel **registro**. Se un tentativo viene ricorretto, il voto è identico anche se nel frattempo il modello è cambiato o è spento.

---

## Se qualcosa non va

| Sintomo | Cosa fare |
|---|---|
| `docker` non è riconosciuto come comando | Docker Desktop non è installato o il PC non è stato riavviato dopo l'installazione: rifai il passo 1 |
| "Docker è installato ma non è acceso" | Apri Docker Desktop e aspetta *Engine running* |
| `manifest unknown` o `not found` su `axllent/mailpit` o `ollama/ollama` | La versione fissata non esiste più. In `esercizi\ambiente` copia `.env.esempio` come `.env` e metti `MAILPIT_VERSIONE=latest` (oppure `OLLAMA_VERSIONE=latest`) |
| Il portale non risponde dopo 2 minuti | `docker compose logs portale` mostra l'errore: copialo e mandamelo |
| Nella scheda dell'esercizio 3 la posta inviata resta vuota con Docker (ma funziona senza) | Il collegamento con Mailpit (etichette `X-Tags` e ricerca `tag:`) non si è potuto provare in sandbox: mandami `docker compose logs portale mailpit` |
| La porta 8025, 8780, 8790 o 11434 è occupata | Copia `.env.esempio` come `.env` e cambia la porta corrispondente |

## Disinstallare tutto

1. Cancella il laboratorio e i suoi dati:

```powershell
cd C:\Claude_desktop\Game_Development\Corso_Agenti_Web\esercizi\ambiente
docker compose --profile ollama down -v --rmi local
```

2. Se vuoi togliere anche Docker Desktop: *Impostazioni di Windows → App → App installate → Docker Desktop → Disinstalla*.

---

## Cosa c'è dentro, per chi è curioso

| Servizio | Immagine | A cosa serve |
|---|---|---|
| `portale` | costruita dal progetto (`esercizi/ambiente/Dockerfile`, Python 3.12) | Il sito del corso con la pagina Esercizi, il correttore e i CRM degli studenti (SQLite, uno per studente e per esercizio) |
| `crm` | la stessa | Vista del docente in sola lettura sui CRM |
| `finto-llm` | la stessa | Finge di essere Ollama e risponde da tabelle: nessuna GPU, risposte sempre uguali |
| `mailpit` | `axllent/mailpit` | Trattiene e mostra le email "inviate" |
| `ollama` e `ollama-modello` | `ollama/ollama` (solo con `-Modello ollama`) | Il modello vero e il suo primo scaricamento |

I dati degli studenti stanno nei volumi Docker `corso-laboratorio_stato` e `corso-laboratorio_stato_studenti`. Sul disco gli studenti hanno nomi pseudonimi, mai l'email in chiaro.
