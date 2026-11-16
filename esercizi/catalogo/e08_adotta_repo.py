"""Esercizio 8 — Officina O2 «Adotta un repo»: il CRM patowari containerizzato e il suo DIFETTO REALE corretto.

Repo adottato (esercizi/officina/materiale/o2/crm_adottato, copia pulita del commit 49959e3, vedi PROVENIENZA.md).
Difetto reale, trovato leggendo il codice: in app/agents/response_classifier.py il controllo
`"Interested" in status_str` viene PRIMA di `"Not Interested" in status_str`, quindi ogni «Not Interested»
diventa INTERESTED (il report del repo: «Interested: 5, Not Interested: 0»).
Il correttore:
  - esegue il response_classifier.py consegnato nel BANCO (esercizi/officina/banco_classificatore.py: controllo
    dell'albero sintattico, processo isolato, modello finto, tempo massimo) al momento della fotografia;
  - legge Dockerfile, requirements.txt, .env.example e docker-compose.yml come testo (analisi statica).
"""
from __future__ import annotations

from ..motore.contratto import Controllo, Esito, testo
from ..officina import analisi as A
from ..officina import banco_classificatore as banco
from ..officina.base import EsercizioOfficina, esito_si_no

CLASSIFICATORE = "app/agents/response_classifier.py"
PACCHETTI_NECESSARI = ["fastapi", "uvicorn", "pandas", "pydantic", "pydantic-settings", "groq"]
PYTHON_MINIMO = (3, 10)


class AdottaRepo(EsercizioOfficina):
    numero = 8
    id = "officina_adotta_repo"
    versione = "1.0"
    unita = "O2"
    titolo = testo("Officina O2 · Adotta un repo", "Workshop O2 · Adopt a repo")
    sottotitolo = testo(
        "Un CRM con agenti trovato su GitHub: dipendenze senza versione, una chiave a portata di commit e un difetto che rende tutti «interessati». Adottalo davvero.",
        "An agent CRM found on GitHub: unversioned dependencies, a key one commit away and a defect that makes everyone «interested». Adopt it for real.")
    consegna = [
        testo("Leggi main.py e segui un lead: punteggio, arricchimento, email, risposta simulata, report.",
              "Read main.py and follow a lead: score, enrichment, email, simulated reply, report."),
        testo("Guarda reports/campaign_summary.md: «Not Interested: 0» su 5 lead. Trova nel codice perché non può che essere 0.",
              "Look at reports/campaign_summary.md: «Not Interested: 0» out of 5 leads. Find in the code why it can only be 0."),
        testo("Correggi app/agents/response_classifier.py senza rompere gli altri casi (Interested, Needs Follow-up, risposta non JSON).",
              "Fix app/agents/response_classifier.py without breaking the other cases (Interested, Needs Follow-up, non-JSON reply)."),
        testo("requirements.txt con versioni fissate (==) per i pacchetti che il codice importa davvero; Dockerfile con Python ≥ 3.10 fissato, dipendenze prima del codice, utente non root.",
              "requirements.txt with pinned versions (==) for the packages the code really imports; Dockerfile with pinned Python ≥ 3.10, dependencies before code, non-root user."),
        testo(".env.example con GROQ_API_KEY vuota; compose con immagini fissate e porte solo su 127.0.0.1. In Codespaces: python -m pytest officina/o2 -q, poi python strumenti/pacchetto.py o2.",
              ".env.example with an empty GROQ_API_KEY; compose with pinned images and ports only on 127.0.0.1. In Codespaces: python -m pytest officina/o2 -q, then python strumenti/pacchetto.py o2."),
    ]
    FILE = [
        {"percorso": CLASSIFICATORE, "iniziale": "o2/crm_adottato/app/agents/response_classifier.py", "linguaggio": "python",
         "descrizione": testo("Il classificatore delle risposte: qui sta il difetto reale.", "The reply classifier: the real defect is here.")},
        {"percorso": "requirements.txt", "iniziale": "o2/crm_adottato/requirements.txt", "linguaggio": "text",
         "descrizione": testo("Le dipendenze: oggi senza versione.", "The dependencies: unversioned today.")},
        {"percorso": "Dockerfile", "iniziale": "o2/crm_adottato/Dockerfile", "linguaggio": "dockerfile",
         "descrizione": testo("L'immagine del CRM (Python 3.9, fuori supporto).", "The CRM image (Python 3.9, out of support).")},
        {"percorso": "docker-compose.yml", "iniziale": "o2/crm_adottato/docker-compose.yml", "linguaggio": "yaml",
         "descrizione": testo("CRM + server di posta finto.", "CRM + fake mail server.")},
        {"percorso": ".env.example", "iniziale": "o2/env.example.iniziale", "linguaggio": "text",
         "descrizione": testo("Il modello del file .env da mettere nel repo (il .env vero mai).", "The template of the .env file to put in the repo (never the real .env).")},
    ]
    MATERIALE = [
        {"titolo": testo("Provenienza e licenza", "Origin and licence"), "percorso": "o2/PROVENIENZA.md"},
        {"titolo": testo("reports/campaign_summary.md (il sintomo)", "reports/campaign_summary.md (the symptom)"), "percorso": "o2/crm_adottato/reports/campaign_summary.md"},
        {"titolo": testo("app/main.py (il flusso)", "app/main.py (the flow)"), "percorso": "o2/crm_adottato/app/main.py"},
        {"titolo": testo("app/services/llm_service.py (le chiamate a Groq)", "app/services/llm_service.py (the Groq calls)"), "percorso": "o2/crm_adottato/app/services/llm_service.py"},
        {"titolo": testo("app/models.py", "app/models.py"), "percorso": "o2/crm_adottato/app/models.py"},
        {"titolo": testo("app/config.py", "app/config.py"), "percorso": "o2/crm_adottato/app/config.py"},
    ]
    SCELTE = [
        {"id": "sintomo", "domanda": testo("Il report dice «Not Interested: 0» su 5 lead. Perché?",
                                            "The report says «Not Interested: 0» out of 5 leads. Why?"),
         "opzioni": [
             {"id": "ordine_controlli", "testo": testo("Il controllo «Interested» viene prima, e «Not Interested» contiene «Interested»", "The «Interested» check comes first, and «Not Interested» contains «Interested»")},
             {"id": "tutti_interessati", "testo": testo("I 5 lead erano davvero tutti interessati", "The 5 leads really were all interested")},
             {"id": "groq_mai", "testo": testo("Il modello di Groq non risponde mai «Not Interested»", "The Groq model never answers «Not Interested»")},
             {"id": "csv_tronca", "testo": testo("Il CSV di uscita tronca la colonna delle risposte", "The output CSV truncates the replies column")}]},
        {"id": "chiave_scaduta", "domanda": testo("Con una chiave Groq scaduta, cosa produce la campagna?",
                                                   "With an expired Groq key, what does the campaign produce?"),
         "opzioni": [
             {"id": "silenzio", "testo": testo("Gira lo stesso: punteggio 50 «Medium» per tutti ed email vuote inviate", "It runs anyway: score 50 «Medium» for everyone and empty emails sent")},
             {"id": "si_ferma", "testo": testo("Si ferma con un errore che dice che la chiave non vale", "It stops with an error saying the key is invalid")},
             {"id": "riserva", "testo": testo("Passa a un modello locale di riserva", "It switches to a local backup model")},
             {"id": "salta", "testo": testo("Salta i lead e non invia nulla", "It skips the leads and sends nothing")}]},
        {"id": "dove_chiave", "domanda": testo("In Codespaces, dove deve stare GROQ_API_KEY?", "In Codespaces, where should GROQ_API_KEY live?"),
         "opzioni": [
             {"id": "segreto", "testo": testo("In un segreto di Codespaces, che arriva come variabile d'ambiente", "In a Codespaces secret, which arrives as an environment variable")},
             {"id": "env_repo", "testo": testo("In un .env salvato nel repo", "In a .env saved in the repo")},
             {"id": "dockerfile", "testo": testo("Nel Dockerfile, con ENV", "In the Dockerfile, with ENV")},
             {"id": "config_py", "testo": testo("In config.py come valore predefinito", "In config.py as a default value")}]},
    ]
    RISPOSTE = {"sintomo": "ordine_controlli", "chiave_scaduta": "silenzio", "dove_chiave": "segreto"}
    PERCHE_SCELTE = {
        "sintomo": testo("rileggi l'if/elif del classificatore", "reread the classifier's if/elif"),
        "chiave_scaduta": testo("_get_completion inghiotte l'errore e restituisce \"\": ogni agente usa il suo valore di ripiego", "_get_completion swallows the error and returns \"\": every agent uses its fallback value"),
        "dove_chiave": testo("un segreto non entra mai nel repo ne' nell'immagine", "a secret never enters the repo or the image"),
    }

    # ------------------------------------------------------------ fotografia: il banco del difetto reale

    def fatti(self, file: dict) -> dict:
        r = banco.esegui(file[CLASSIFICATORE])
        return {"banco": {"ammesso": r["ammesso"], "violazioni": r["violazioni"], "errore": r["errore"], "esiti": r["esiti"]}}

    # ------------------------------------------------------------ controlli

    def controlli(self) -> list[Controllo]:
        return [
            Controllo("difetto_corretto", testo("«Not Interested» resta «Not Interested»", "«Not Interested» stays «Not Interested»"), 25,
                      testo("Controlla «Not Interested» PRIMA di «Interested» (o confronta l'etichetta intera, senza «contiene»). Prova: python -m pytest officina/o2 -q.",
                            "Check «Not Interested» BEFORE «Interested» (or compare the whole label, without «contains»). Try: python -m pytest officina/o2 -q."),
                      self._c_difetto, bloccante=True),
            Controllo("robustezza", testo("Etichette scritte in modo diverso", "Labels written differently"), 10,
                      testo("Il modello può scrivere «not interested», mettere spazi o recintare il JSON fra ```: normalizza (strip, minuscole) prima di confrontare.",
                            "The model may write «not interested», add spaces or fence the JSON in ```: normalise (strip, lower case) before comparing."),
                      self._c_robustezza),
            Controllo("nessuna_regressione", testo("Gli altri casi funzionano come prima", "The other cases work as before"), 15,
                      testo("Interested → Interested, Needs Follow-up → Needs Follow-up, classificazione assente → Needs Follow-up, risposta non JSON → Unknown.",
                            "Interested → Interested, Needs Follow-up → Needs Follow-up, missing classification → Needs Follow-up, non-JSON reply → Unknown."),
                      self._c_regressione),
            Controllo("requisiti_fissati", testo("Dipendenze fissate e complete", "Pinned and complete dependencies"), 15,
                      testo(f"Ogni riga con «==versione» e almeno i pacchetti importati dal codice: {', '.join(PACCHETTI_NECESSARI)}. In un container pulito: pip install ... poi pip freeze.",
                            f"Every line with «==version» and at least the packages the code imports: {', '.join(PACCHETTI_NECESSARI)}. In a clean container: pip install ... then pip freeze."),
                      self._c_requisiti),
            Controllo("dockerfile_sano", testo("Dockerfile da adottare", "An adoptable Dockerfile"), 10,
                      testo("FROM python:3.12-slim (Python 3.9 è fuori supporto), COPY requirements.txt e pip install prima di COPY . ., poi USER non root.",
                            "FROM python:3.12-slim (Python 3.9 is out of support), COPY requirements.txt and pip install before COPY . ., then a non-root USER."),
                      self._c_dockerfile),
            Controllo("compose_sano", testo("Compose: immagini fissate, porte locali", "Compose: pinned images, local ports"), 10,
                      testo("mailhog/mailhog senza tag cambia da solo (ed è abbandonato: axllent/mailpit:v1.20.0 fa lo stesso); scrivi «127.0.0.1:» davanti a ogni porta.",
                            "mailhog/mailhog without a tag changes by itself (and is abandoned: axllent/mailpit:v1.20.0 does the same); write «127.0.0.1:» in front of every port."),
                      self._c_compose),
            Controllo("chiave_fuori", testo("Nessuna chiave nel repo", "No key in the repo"), 5,
                      testo("Nel .env.example la riga resta «GROQ_API_KEY=» senza valore; la chiave vera va nel .env (ignorato da git) o in un segreto di Codespaces.",
                            "In .env.example the line stays «GROQ_API_KEY=» with no value; the real key goes in .env (ignored by git) or in a Codespaces secret."),
                      self._c_chiave, bloccante=True),
            self.controllo_scelte(10, testo("Diagnosi (scelte)", "Diagnosis (choices)")),
        ]

    # ------------------------------------------------------------ banco

    @staticmethod
    def _banco(ctx) -> dict:
        return ctx.foto["fatti"]["banco"]

    def _non_eseguibile(self, ctx) -> Esito | None:
        b = self._banco(ctx)
        if not b["ammesso"]:
            v = "; ".join(b["violazioni"][:3])
            return Esito(False, testo(f"Il banco non esegue il file: {v}.", f"The test bench does not run the file: {v}."))
        if b["errore"]:
            return Esito(False, testo(f"Il file non si è potuto provare: {b['errore']}.", f"The file could not be tried: {b['errore']}."))
        return None

    def _gruppo(self, ctx, gruppo: str) -> tuple[list, dict]:
        v = banco.valuta(self._banco(ctx)["esiti"])[gruppo]
        return v["giusti"], v["sbagliati"]

    def _c_difetto(self, ctx) -> Esito:
        blocco = self._non_eseguibile(ctx)
        if blocco:
            return blocco
        _, sbagliati = self._gruppo(ctx, "difetto")
        if not sbagliati:
            return Esito(True, testo("Una risposta «Not Interested» ora è classificata NOT_INTERESTED.",
                                     "A «Not Interested» reply is now classified NOT_INTERESTED."))
        uscito = sbagliati["not_interested"]
        return Esito(False, testo(f"Una risposta «Not Interested» è ancora classificata «{uscito}».",
                                  f"A «Not Interested» reply is still classified «{uscito}»."))

    def _casi(self, ctx, gruppo: str, it_ok: str, en_ok: str) -> Esito:
        blocco = self._non_eseguibile(ctx)
        if blocco:
            return blocco
        giusti, sbagliati = self._gruppo(ctx, gruppo)
        n = len(giusti) + len(sbagliati)
        if not sbagliati:
            return Esito(True, testo(it_ok, en_ok))
        dett = ", ".join(f"{c} → {u}" for c, u in sbagliati.items())
        return Esito(False, testo(f"Casi sbagliati {len(sbagliati)} su {n}: {dett}.", f"Wrong cases {len(sbagliati)} out of {n}: {dett}."),
                     frazione=len(giusti) / n)

    def _c_robustezza(self, ctx) -> Esito:
        return self._casi(ctx, "robustezza", "Minuscole, spazi e JSON recintato sono classificati bene.",
                          "Lower case, spaces and fenced JSON are classified correctly.")

    def _c_regressione(self, ctx) -> Esito:
        return self._casi(ctx, "regressione", "Interested, Needs Follow-up, classificazione assente e risposta non JSON funzionano come prima.",
                          "Interested, Needs Follow-up, missing classification and non-JSON reply work as before.")

    # ------------------------------------------------------------ file

    def _c_requisiti(self, ctx) -> Esito:
        req = A.requisiti(ctx.foto["file"]["requirements.txt"])
        nomi = {r["nome"]: r for r in req}
        mancanti = [p for p in PACCHETTI_NECESSARI if p not in nomi]
        liberi = [r["nome"] for r in req if not r["fissato"]]
        punti = (len(PACCHETTI_NECESSARI) - len(mancanti)) / len(PACCHETTI_NECESSARI) * 0.5 + (0.5 if req and not liberi else 0)
        if not mancanti and not liberi and req:
            return Esito(True, testo(f"{len(req)} dipendenze, tutte con versione fissata.", f"{len(req)} dependencies, all pinned."))
        parti_it, parti_en = [], []
        if mancanti:
            parti_it.append(f"mancano {', '.join(mancanti)}")
            parti_en.append(f"missing {', '.join(mancanti)}")
        if liberi:
            parti_it.append(f"senza versione fissata: {', '.join(liberi[:6])}")
            parti_en.append(f"not pinned: {', '.join(liberi[:6])}")
        return Esito(False, testo("; ".join(parti_it).capitalize() + ".", "; ".join(parti_en).capitalize() + "."), frazione=punti)

    def _c_dockerfile(self, ctx) -> Esito:
        istr = A.istruzioni_dockerfile(ctx.foto["file"]["Dockerfile"])
        img = A.immagine_base(istr)
        ver = A.versione_python(img)
        prove = {
            "python": A.tag_fissato(img) and ver is not None and ver >= PYTHON_MINIMO,
            "ordine": A.ordine_strati(istr)["ok"],
            "utente": A.non_root(istr),
        }
        nomi_it = {"python": f"Python ≥ {PYTHON_MINIMO[0]}.{PYTHON_MINIMO[1]} fissato (ora: {img})", "ordine": "dipendenze prima del codice", "utente": "utente non root"}
        nomi_en = {"python": f"pinned Python ≥ {PYTHON_MINIMO[0]}.{PYTHON_MINIMO[1]} (now: {img})", "ordine": "dependencies before code", "utente": "non-root user"}
        manca = [k for k, ok in prove.items() if not ok]
        if not manca:
            return Esito(True, testo(f"Base {img}, dipendenze prima del codice, utente non root.", f"Base {img}, dependencies before code, non-root user."))
        return Esito(False, testo("Manca: " + ", ".join(nomi_it[k] for k in manca) + ".", "Missing: " + ", ".join(nomi_en[k] for k in manca) + "."),
                     frazione=(3 - len(manca)) / 3)

    def _c_compose(self, ctx) -> Esito:
        c = A.carica_yaml(ctx.foto["file"]["docker-compose.yml"])
        if "errore" in c:
            return Esito(False, testo(f"Compose illeggibile: {c['errore']}.", f"Unreadable compose: {c['errore']}."))
        servizi = c["dati"].get("services") or {}
        sciolte = [f"{n} ({s['image']})" for n, s in servizi.items() if isinstance(s, dict) and s.get("image") and not A.tag_fissato(str(s["image"]))]
        aperte = [f"{n} {p['host']}" for n, s in servizi.items() if isinstance(s, dict)
                  for p in A.porte_pubblicate(s) if p["ip"] not in ("127.0.0.1", "localhost")]
        if not sciolte and not aperte:
            return Esito(True, testo("Immagini con tag fisso e porte solo su 127.0.0.1.", "Images with pinned tags and ports only on 127.0.0.1."))
        it = "; ".join(x for x in [f"immagini senza tag fisso: {', '.join(sciolte)}" if sciolte else "",
                                   f"porte aperte alla rete: {', '.join(aperte)}" if aperte else ""] if x)
        en = "; ".join(x for x in [f"images without a pinned tag: {', '.join(sciolte)}" if sciolte else "",
                                   f"ports open to the network: {', '.join(aperte)}" if aperte else ""] if x)
        return Esito(False, testo(it.capitalize() + ".", en.capitalize() + "."), frazione=0.5 if (not sciolte or not aperte) else 0)

    def _c_chiave(self, ctx) -> Esito:
        schemi = sorted({s for t in ctx.foto["file"].values() for s in A.segreti_nel_testo(t)})
        righe = {}
        for r in ctx.foto["file"][".env.example"].splitlines():
            r = r.strip()
            if r and not r.startswith("#") and "=" in r:
                nome, _, valore = r.partition("=")
                righe[nome.strip()] = valore.split("#", 1)[0].strip()
        if "GROQ_API_KEY" not in righe:
            return Esito(False, testo("Nel .env.example manca la riga GROQ_API_KEY= (chi adotta il repo non sa che serve).",
                                      "The .env.example lacks the GROQ_API_KEY= line (whoever adopts the repo does not know it is needed)."))
        piene = [n for n, v in righe.items() if A.valore_sembra_segreto(n, v)]
        if schemi or piene:
            elenco = ", ".join(piene + [f"forma di chiave {s}" for s in schemi])
            return Esito(False, testo(f"Valori da segreto scritti nei file: {elenco}.", f"Secret-like values written in the files: {elenco}."))
        return Esito(True, testo("GROQ_API_KEY è dichiarata ma vuota; nessuna chiave nei file.", "GROQ_API_KEY is declared but empty; no key in the files."))


ESERCIZIO = AdottaRepo()
