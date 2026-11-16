"""Esercizio 12 — Officina O6 «In cloud gratis»: un devcontainer.json che rispetta il piano gratuito di Codespaces.

Partenza: immagine «latest», macchina da 8 core (le 120 ore-core gratuite durano 15 ore), una chiave scritta in
containerEnv, niente installazione dei requisiti, niente Docker dentro. Correzione statica del JSON con commenti
(esercizi/officina/analisi.carica_jsonc) piu' 4 scelte sul piano gratuito: nessun codespace viene creato.
"""
from __future__ import annotations

from ..motore.contratto import Controllo, Esito, testo
from ..officina import analisi as A
from ..officina.base import EsercizioOfficina, esito_si_no

FILE = "devcontainer.json"
SEGRETO = "GROQ_API_KEY"


def _o(id_: str, it: str, en: str) -> dict:
    return {"id": id_, "testo": testo(it, en)}


class Codespaces(EsercizioOfficina):
    numero = 12
    id = "officina_codespaces"
    versione = "1.0"
    unita = "O6"
    titolo = testo("Officina O6 · In cloud gratis", "Workshop O6 · In the cloud for free")
    sottotitolo = testo(
        "Il laboratorio in un file: chi apre il repo in Codespaces trova Python, Docker e i requisiti pronti. Ma 8 core e una chiave nel file bruciano il piano gratuito e la sicurezza.",
        "The lab in one file: whoever opens the repo in Codespaces finds Python, Docker and the requirements ready. But 8 cores and a key in the file burn the free plan and security.")
    consegna = [
        testo("Leggi il riassunto del piano gratuito e confronta il .devcontainer/devcontainer.json del repo con quello da sistemare.",
              "Read the free-plan summary and compare the repo's .devcontainer/devcontainer.json with the one to fix."),
        testo("Immagine con tag fisso, postCreateCommand che installa requirements.txt, la feature docker-in-docker.",
              "Image with a pinned tag, a postCreateCommand that installs requirements.txt, the docker-in-docker feature."),
        testo(f"Nessun valore segreto in containerEnv/remoteEnv: dichiara {SEGRETO} sotto «secrets» con una descrizione. Al massimo 2 core.",
              f"No secret value in containerEnv/remoteEnv: declare {SEGRETO} under «secrets» with a description. At most 2 cores."),
        testo("Rispondi alle 4 scelte sul piano gratuito.", "Answer the 4 choices about the free plan."),
    ]
    FILE = [{"percorso": FILE, "iniziale": "o6/devcontainer_da_sistemare.json", "linguaggio": "jsonc",
             "descrizione": testo("La configurazione del codespace (JSON con commenti).", "The codespace configuration (JSON with comments).")}]
    MATERIALE = [
        {"titolo": testo("Il piano gratuito in breve", "The free plan in short"), "percorso": "o6/codespaces_piano_gratuito.md"},
        {"titolo": testo("Cosa fare", "What to do"), "percorso": "o6/LEGGIMI.md"},
    ]
    SCELTE = [
        {"id": "ore_2core", "domanda": testo("Con 120 ore-core gratuite al mese, quante ore lavori su una macchina da 2 core?",
                                              "With 120 free core-hours a month, how many hours do you work on a 2-core machine?"),
         "opzioni": [_o("60", "60", "60"), _o("120", "120", "120"), _o("30", "30", "30"), _o("240", "240", "240")]},
        {"id": "fermo", "domanda": testo("Un codespace fermo consuma ancora il piano gratuito?", "Does a stopped codespace still use the free plan?"),
         "opzioni": [_o("spazio", "Sì, lo spazio su disco: conviene cancellare quelli che non servono", "Yes, disk storage: delete the ones you do not need"),
                     _o("niente", "No, niente", "No, nothing"),
                     _o("ore", "Sì, ore-core come se fosse acceso", "Yes, core-hours as if it were running"),
                     _o("porte", "Solo se ha porte inoltrate", "Only if it has forwarded ports")]},
        {"id": "dove_segreto", "domanda": testo(f"Dove imposti {SEGRETO} per i tuoi codespace?", f"Where do you set {SEGRETO} for your codespaces?"),
         "opzioni": [_o("segreti_profilo", "Nei segreti di Codespaces del profilo, abilitati per il repo", "In the profile's Codespaces secrets, enabled for the repo"),
                     _o("container_env", "In containerEnv del devcontainer.json", "In the devcontainer.json containerEnv"),
                     _o("env_repo", "In un file .env nel repo", "In a .env file in the repo"),
                     _o("readme", "Nel README, così lo trovano tutti", "In the README, so everyone finds it")]},
        {"id": "quota_finita", "domanda": testo("Finite le ore gratuite, con limite di spesa 0, che cosa succede?",
                                                 "Once the free hours are used up, with a spending limit of 0, what happens?"),
         "opzioni": [_o("si_ferma", "I codespace non si avviano più fino al mese dopo: nessun addebito", "Codespaces no longer start until next month: no charge"),
                     _o("addebito", "Parte un addebito automatico", "An automatic charge starts"),
                     _o("cancella", "GitHub cancella il repo", "GitHub deletes the repo"),
                     _o("un_core", "Il codespace continua su 1 core", "The codespace continues on 1 core")]},
    ]
    RISPOSTE = {"ore_2core": "60", "fermo": "spazio", "dove_segreto": "segreti_profilo", "quota_finita": "si_ferma"}
    PERCHE_SCELTE = {"ore_2core": testo("ore-core = ore x core", "core-hours = hours x cores"),
                     "fermo": testo("lo spazio si conta in GB-mese", "storage is counted in GB-months"),
                     "dove_segreto": testo("il valore non entra mai nel repo", "the value never enters the repo"),
                     "quota_finita": testo("limite di spesa 0 = nessun addebito", "spending limit 0 = no charge")}

    def controlli(self) -> list[Controllo]:
        return [
            Controllo("immagine_fissata", testo("Immagine con tag fisso", "Image with pinned tag"), 15,
                      testo("Per esempio mcr.microsoft.com/devcontainers/python:1-3.12-bookworm: con «latest» il codespace di domani non è quello di oggi.",
                            "For example mcr.microsoft.com/devcontainers/python:1-3.12-bookworm: with «latest» tomorrow's codespace is not today's."),
                      self._c_immagine),
            Controllo("installa_requisiti", testo("Requisiti installati alla creazione", "Requirements installed on creation"), 15,
                      testo("\"postCreateCommand\": \"pip install -r requirements.txt\": chi apre il codespace trova tutto pronto.",
                            "\"postCreateCommand\": \"pip install -r requirements.txt\": whoever opens the codespace finds everything ready."),
                      self._c_requisiti),
            Controllo("docker_dentro", testo("Docker dentro il codespace", "Docker inside the codespace"), 10,
                      testo("\"features\": {\"ghcr.io/devcontainers/features/docker-in-docker:2\": {}} per gli esercizi O1 e O2.",
                            "\"features\": {\"ghcr.io/devcontainers/features/docker-in-docker:2\": {}} for exercises O1 and O2."),
                      self._c_docker),
            Controllo("nessun_segreto", testo("Nessun valore segreto nel file", "No secret value in the file"), 20,
                      testo("Togli la chiave da containerEnv: il segreto di Codespaces arriva da solo come variabile d'ambiente.",
                            "Remove the key from containerEnv: the Codespaces secret arrives by itself as an environment variable."),
                      self._c_segreti, bloccante=True),
            Controllo("segreto_dichiarato", testo(f"{SEGRETO} dichiarato sotto «secrets»", f"{SEGRETO} declared under «secrets»"), 10,
                      testo(f"\"secrets\": {{\"{SEGRETO}\": {{\"description\": \"Chiave gratuita di Groq (solo per ASSISTENTE_BACKEND=groq)\"}}}}: Codespaces la chiede all'apertura.",
                            f"\"secrets\": {{\"{SEGRETO}\": {{\"description\": \"Free Groq key (only for ASSISTENTE_BACKEND=groq)\"}}}}: Codespaces asks for it on opening."),
                      self._c_dichiarato),
            Controllo("macchina_piccola", testo("Macchina da 2 core", "2-core machine"), 10,
                      testo("Togli hostRequirements o scrivi \"cpus\": 2: le ore gratuite durano il doppio che su 4 core.",
                            "Remove hostRequirements or write \"cpus\": 2: the free hours last twice as long as on 4 cores."),
                      self._c_macchina),
            self.controllo_scelte(20, testo("Piano gratuito (scelte)", "Free plan (choices)")),
        ]

    def _dati(self, ctx) -> dict | None:
        r = A.carica_jsonc(ctx.foto["file"][FILE])
        return r.get("dati")

    def _con_dati(self, ctx, verifica) -> Esito:
        d = self._dati(ctx)
        if d is None:
            err = A.carica_jsonc(ctx.foto["file"][FILE])["errore"]
            return Esito(False, testo(f"devcontainer.json illeggibile: {err}.", f"Unreadable devcontainer.json: {err}."))
        return verifica(d)

    def _c_immagine(self, ctx) -> Esito:
        def v(d):
            if "image" not in d and isinstance(d.get("build"), dict):
                return Esito(True, testo("Immagine costruita da un Dockerfile del repo.", "Image built from a repo Dockerfile."))
            img = str(d.get("image", ""))
            return esito_si_no(A.tag_fissato(img), f"Immagine fissata: {img}.", f"Pinned image: {img}.",
                               f"Immagine senza tag fisso: {img or 'nessuna'}.", f"Image without a pinned tag: {img or 'none'}.")
        return self._con_dati(ctx, v)

    def _c_requisiti(self, ctx) -> Esito:
        def v(d):
            cmd = d.get("postCreateCommand", "")
            if isinstance(cmd, dict):
                cmd = " ".join(str(x) if not isinstance(x, list) else " ".join(x) for x in cmd.values())
            elif isinstance(cmd, list):
                cmd = " ".join(str(x) for x in cmd)
            ok = "pip" in str(cmd) and "-r requirements.txt" in str(cmd)
            return esito_si_no(ok, "I requisiti si installano alla creazione.", "Requirements are installed on creation.",
                               "Nessun postCreateCommand che installi requirements.txt.", "No postCreateCommand installing requirements.txt.")
        return self._con_dati(ctx, v)

    def _c_docker(self, ctx) -> Esito:
        def v(d):
            f = d.get("features") if isinstance(d.get("features"), dict) else {}
            ok = any("docker-in-docker" in k or "docker-outside-of-docker" in k for k in f)
            return esito_si_no(ok, "Docker disponibile nel codespace.", "Docker available in the codespace.",
                               "Manca la feature docker-in-docker.", "The docker-in-docker feature is missing.")
        return self._con_dati(ctx, v)

    def _c_segreti(self, ctx) -> Esito:
        schemi = A.segreti_nel_testo(ctx.foto["file"][FILE])
        d = self._dati(ctx) or {}
        nomi = [f"{sez}.{k}" for sez in ("containerEnv", "remoteEnv") if isinstance(d.get(sez), dict)
                for k, val in d[sez].items() if A.valore_sembra_segreto(k, val)]
        if not schemi and not nomi:
            return Esito(True, testo("Nessun valore segreto nel file.", "No secret value in the file."))
        elenco = ", ".join(nomi + [f"forma di chiave {s}" for s in schemi])
        return Esito(False, testo(f"Valori segreti scritti: {elenco}.", f"Secret values written: {elenco}."))

    def _c_dichiarato(self, ctx) -> Esito:
        def v(d):
            s = d.get("secrets") if isinstance(d.get("secrets"), dict) else {}
            voce = s.get(SEGRETO)
            ok = isinstance(voce, dict) and bool(str(voce.get("description", "")).strip())
            return esito_si_no(ok, f"{SEGRETO} dichiarato con descrizione.", f"{SEGRETO} declared with a description.",
                               f"{SEGRETO} non dichiarato sotto «secrets» (con «description»).", f"{SEGRETO} not declared under «secrets» (with «description»).")
        return self._con_dati(ctx, v)

    def _c_macchina(self, ctx) -> Esito:
        def v(d):
            h = d.get("hostRequirements") if isinstance(d.get("hostRequirements"), dict) else {}
            cpus = h.get("cpus")
            ok = cpus is None or (isinstance(cpus, int) and cpus <= 2)
            return esito_si_no(ok, "Macchina da 2 core: 60 ore gratuite al mese.", "2-core machine: 60 free hours a month.",
                               f"Richiesti {cpus} core: le ore gratuite durano {120 // cpus if isinstance(cpus, int) and cpus else '?'} ore.",
                               f"{cpus} cores requested: the free hours last {120 // cpus if isinstance(cpus, int) and cpus else '?'} hours.")
        return self._con_dati(ctx, v)


ESERCIZIO = Codespaces()
