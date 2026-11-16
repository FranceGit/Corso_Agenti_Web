# PROGRESSI — Corso Agenti Web

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
