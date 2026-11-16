"""Esercizio 7 — Officina O1 «Docker da vicino»: sistemare Dockerfile e docker-compose.yml del CRM minimo.

Partenza (esercizi/officina/materiale/o1): immagine «latest», codice copiato prima delle dipendenze, una chiave
scritta nell'immagine, utente root; compose senza volume per i dati, porta aperta a tutta la rete, nessun
controllo di salute. Il correttore legge i file come TESTO (analisi statica, esercizi/officina/analisi.py):
nessun container viene avviato, quindi il voto e' identico in sandbox, sul PC e in Codespaces.
"""
from __future__ import annotations

from ..motore.contratto import Controllo, Esito, testo
from ..officina import analisi as A
from ..officina.base import EsercizioOfficina, esito_si_no

CARTELLA_DATI = "/app/dati"


class DockerVicino(EsercizioOfficina):
    numero = 7
    id = "officina_docker_vicino"
    versione = "1.0"
    unita = "O1"
    titolo = testo("Officina O1 · Docker da vicino", "Workshop O1 · Docker up close")
    sottotitolo = testo(
        "Il CRM minimo parte, ma la ricostruzione è lenta, una chiave finisce nell'immagine e i lead spariscono a ogni riavvio. Sistema i due file.",
        "The minimal CRM starts, but rebuilding is slow, a key ends up in the image and the leads vanish at every restart. Fix the two files.")
    consegna = [
        testo("Leggi app.py: dove salva i lead?", "Read app.py: where does it save the leads?"),
        testo("Dockerfile: immagine di base con un tag fisso, dipendenze installate prima di copiare il codice, nessuna chiave scritta, utente non root.",
              "Dockerfile: base image with a pinned tag, dependencies installed before copying the code, no key written in it, non-root user."),
        testo("docker-compose.yml: un volume per /app/dati, porta pubblicata solo su 127.0.0.1, un controllo di salute su /salute.",
              "docker-compose.yml: a volume for /app/dati, port published only on 127.0.0.1, a health check on /salute."),
        testo("Rispondi alle due domande di previsione, poi premi «Verifica». Se lavori in Codespaces: python strumenti/pacchetto.py o1 e importa il pacchetto.",
              "Answer the two prediction questions, then press «Check». If you work in Codespaces: python strumenti/pacchetto.py o1 and import the package."),
    ]
    FILE = [
        {"percorso": "Dockerfile", "iniziale": "o1/Dockerfile", "linguaggio": "dockerfile",
         "descrizione": testo("La ricetta dell'immagine del CRM minimo.", "The recipe for the minimal CRM image.")},
        {"percorso": "docker-compose.yml", "iniziale": "o1/docker-compose.yml", "linguaggio": "yaml",
         "descrizione": testo("Come si accende il servizio: porte, volumi, salute.", "How the service starts: ports, volumes, health.")},
    ]
    MATERIALE = [
        {"titolo": testo("app.py (corretto, non va cambiato)", "app.py (correct, do not change it)"), "percorso": "o1/app.py"},
        {"titolo": testo("requirements.txt (corretto)", "requirements.txt (correct)"), "percorso": "o1/requirements.txt"},
        {"titolo": testo("Comandi per provarlo", "Commands to try it"), "percorso": "o1/LEGGIMI.md"},
    ]
    SCELTE = [
        {"id": "dati_senza_volume", "domanda": testo(
            "Senza volume: aggiungi 3 lead, poi «docker compose down» e «docker compose up -d». Quanti lead restituisce GET /lead?",
            "Without a volume: add 3 leads, then «docker compose down» and «docker compose up -d». How many leads does GET /lead return?"),
         "opzioni": [{"id": "zero", "testo": testo("0: il filesystem del container è stato cancellato con lui", "0: the container's filesystem was deleted with it")},
                     {"id": "tre", "testo": testo("3: Docker salva sempre i file del container", "3: Docker always saves the container's files")},
                     {"id": "dipende_immagine", "testo": testo("Dipende dal tag dell'immagine di base", "It depends on the base image tag")}]},
        {"id": "cambio_codice", "domanda": testo(
            "Con il Dockerfile sistemato cambi solo app.py e ricostruisci. Quali passi si rifanno?",
            "With the fixed Dockerfile you change only app.py and rebuild. Which steps are redone?"),
         "opzioni": [{"id": "dalla_copia_codice", "testo": testo("Solo dalla copia del codice in poi: l'installazione delle dipendenze resta in cache", "Only from the code copy onwards: the dependency install stays cached")},
                     {"id": "tutti", "testo": testo("Tutti, dall'immagine di base", "All of them, from the base image")},
                     {"id": "nessuno", "testo": testo("Nessuno: serve «--no-cache» per vedere il cambiamento", "None: you need «--no-cache» to see the change")}]},
    ]
    RISPOSTE = {"dati_senza_volume": "zero", "cambio_codice": "dalla_copia_codice"}
    PERCHE_SCELTE = {
        "dati_senza_volume": testo("down cancella i container e il loro filesystem", "down removes the containers and their filesystem"),
        "cambio_codice": testo("uno strato si rifà solo se cambia lui o uno prima di lui", "a layer is rebuilt only if it or an earlier one changes"),
    }

    # ------------------------------------------------------------ controlli

    def controlli(self) -> list[Controllo]:
        return [
            Controllo("base_fissata", testo("Immagine di base con tag fisso", "Base image with pinned tag"), 10,
                      testo("Scrivi la versione nel FROM, per esempio python:3.12-slim: «latest» cambia da sola e una ricostruzione di domani può rompersi.",
                            "Write the version in FROM, for example python:3.12-slim: «latest» changes by itself and tomorrow's rebuild may break."),
                      self._c_base),
            Controllo("ordine_strati", testo("Dipendenze prima del codice", "Dependencies before code"), 20,
                      testo("Prima COPY requirements.txt e RUN pip install -r requirements.txt, solo dopo COPY . . : così cambiare il codice non reinstalla tutto.",
                            "First COPY requirements.txt and RUN pip install -r requirements.txt, only then COPY . . : changing the code no longer reinstalls everything."),
                      self._c_ordine),
            Controllo("nessun_segreto", testo("Nessuna chiave dentro l'immagine", "No key inside the image"), 20,
                      testo("Togli ENV/ARG con chiavi o token: chi ha l'immagine li legge con «docker history». La chiave si passa al container da fuori (variabile d'ambiente o env_file non versionato).",
                            "Remove ENV/ARG with keys or tokens: anyone with the image reads them with «docker history». The key is passed to the container from outside (environment variable or an unversioned env_file)."),
                      self._c_segreti, bloccante=True),
            Controllo("non_root", testo("Utente non root", "Non-root user"), 10,
                      testo("Crea un utente (RUN useradd ...) e passa a lui con USER prima del CMD.",
                            "Create a user (RUN useradd ...) and switch to it with USER before CMD."),
                      self._c_utente),
            Controllo("volume_dati", testo("I lead sopravvivono al container", "Leads survive the container"), 15,
                      testo(f"Nel servizio crm aggiungi un volume con destinazione {CARTELLA_DATI} (per esempio «dati_crm:{CARTELLA_DATI}») e dichiara il volume nominato in fondo, sotto «volumes:».",
                            f"In the crm service add a volume with target {CARTELLA_DATI} (for example «dati_crm:{CARTELLA_DATI}») and declare the named volume at the bottom, under «volumes:»."),
                      self._c_volume),
            Controllo("porta_locale", testo("Porta solo su questo computer", "Port only on this computer"), 10,
                      testo("Scrivi «127.0.0.1:8000:8000»: con «8000:8000» il CRM risponde a chiunque sia sulla tua rete.",
                            "Write «127.0.0.1:8000:8000»: with «8000:8000» the CRM answers anyone on your network."),
                      self._c_porta),
            Controllo("salute", testo("Controllo di salute", "Health check"), 5,
                      testo("Aggiungi «healthcheck:» al servizio (test che chiama /salute) oppure HEALTHCHECK nel Dockerfile.",
                            "Add «healthcheck:» to the service (a test that calls /salute) or HEALTHCHECK in the Dockerfile."),
                      self._c_salute),
            self.controllo_scelte(10, testo("Previsioni (scelte)", "Predictions (choices)")),
        ]

    # ------------------------------------------------------------ aiuti di lettura

    @staticmethod
    def _istr(ctx) -> list:
        return A.istruzioni_dockerfile(ctx.foto["file"]["Dockerfile"])

    @staticmethod
    def _compose(ctx) -> dict:
        return A.carica_yaml(ctx.foto["file"]["docker-compose.yml"])

    def _crm(self, ctx) -> tuple[dict | None, str | None]:
        c = self._compose(ctx)
        if "errore" in c:
            return None, c["errore"]
        s = A.servizio(c["dati"], "crm")
        return (s, None) if s is not None else (None, "nel compose manca il servizio «crm»")

    def _c_base(self, ctx) -> Esito:
        img = A.immagine_base(self._istr(ctx))
        return esito_si_no(A.tag_fissato(img), f"Immagine di base fissata: {img}.", f"Pinned base image: {img}.",
                           f"Immagine di base senza tag fisso: {img or 'nessun FROM'}.", f"Base image without a pinned tag: {img or 'no FROM'}.")

    def _c_ordine(self, ctx) -> Esito:
        o = A.ordine_strati(self._istr(ctx))
        if o["ok"]:
            return Esito(True, testo("requirements.txt è copiato e installato prima del resto del codice.",
                                     "requirements.txt is copied and installed before the rest of the code."))
        if o["pip"] is None:
            return Esito(False, testo("Non trovo un RUN pip install -r requirements.txt.", "I cannot find a RUN pip install -r requirements.txt."))
        return Esito(False, testo("Il codice viene copiato prima dell'installazione delle dipendenze (o requirements.txt non è copiato a parte).",
                                  "The code is copied before the dependency install (or requirements.txt is not copied on its own)."))

    def _c_segreti(self, ctx) -> Esito:
        nomi = A.segreti_dockerfile(self._istr(ctx))
        schemi = sorted({s for t in ctx.foto["file"].values() for s in A.segreti_nel_testo(t)})
        s, _ = self._crm(ctx)
        if s:
            nomi += [k for k, v in A.variabili_servizio(s).items() if A.valore_sembra_segreto(k, v)]
        if not nomi and not schemi:
            return Esito(True, testo("Nessuna chiave scritta nei file.", "No key written in the files."))
        elenco = ", ".join(sorted(set(nomi)) + [f"forma di chiave {x}" for x in schemi])
        return Esito(False, testo(f"Chiavi scritte nei file: {elenco}.", f"Keys written in the files: {elenco}."))

    def _c_utente(self, ctx) -> Esito:
        u = A.utente_finale(self._istr(ctx))
        return esito_si_no(A.non_root(self._istr(ctx)), f"Il container gira come «{u}».", f"The container runs as «{u}».",
                           "Il container gira come root (nessun USER, o USER root).", "The container runs as root (no USER, or USER root).")

    def _c_volume(self, ctx) -> Esito:
        s, err = self._crm(ctx)
        if err:
            return Esito(False, testo(f"Compose illeggibile: {err}.", f"Unreadable compose: {err}."))
        vol = [v for v in A.volumi_servizio(s) if v["destinazione"] == CARTELLA_DATI]
        if not vol:
            return Esito(False, testo(f"Nessun volume monta {CARTELLA_DATI}: i lead vivono nel container e muoiono con lui.",
                                      f"No volume mounts {CARTELLA_DATI}: the leads live in the container and die with it."))
        v = vol[0]
        if v["tipo"] == "anonimo":
            return Esito(False, testo("Il volume è anonimo: «docker compose down -v» o un nuovo container lo perdono. Dagli un nome.",
                                      "The volume is anonymous: «docker compose down -v» or a new container lose it. Give it a name."))
        if v["tipo"] == "nominato" and v["sorgente"] not in (self._compose(ctx)["dati"].get("volumes") or {}):
            return Esito(False, testo(f"Il volume «{v['sorgente']}» non è dichiarato sotto «volumes:» in fondo al file.",
                                      f"The volume «{v['sorgente']}» is not declared under «volumes:» at the bottom of the file."))
        return Esito(True, testo(f"{CARTELLA_DATI} è nel volume «{v['sorgente']}».", f"{CARTELLA_DATI} is in the volume «{v['sorgente']}»."))

    def _c_porta(self, ctx) -> Esito:
        s, err = self._crm(ctx)
        if err:
            return Esito(False, testo(f"Compose illeggibile: {err}.", f"Unreadable compose: {err}."))
        porte = A.porte_pubblicate(s)
        if not porte:
            return Esito(False, testo("Il servizio non pubblica nessuna porta: dal browser non lo raggiungi.",
                                      "The service publishes no port: you cannot reach it from the browser."))
        aperte = [p for p in porte if p["ip"] not in ("127.0.0.1", "localhost")]
        return esito_si_no(not aperte, "Porte pubblicate solo su 127.0.0.1.", "Ports published only on 127.0.0.1.",
                           f"{len(aperte)} porta/e aperte a tutta la rete.", f"{len(aperte)} port(s) open to the whole network.")

    def _c_salute(self, ctx) -> Esito:
        s, _ = self._crm(ctx)
        ok = A.ha_healthcheck(self._istr(ctx)) or bool(s and isinstance(s.get("healthcheck"), dict) and s["healthcheck"].get("test"))
        return esito_si_no(ok, "C'è un controllo di salute.", "There is a health check.",
                           "Nessun controllo di salute.", "No health check.")


ESERCIZIO = DockerVicino()
