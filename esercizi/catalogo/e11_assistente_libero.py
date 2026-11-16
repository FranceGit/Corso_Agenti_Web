"""Esercizio 11 — Officina O5 «L'assistente libero»: configurare l'assistente a tre backend senza chiavi nel repo.

Lo studente sistema assistente.json (partenza: backend groq nel file, una chiave scritta, un modello fuori dal
piano gratuito, perche' mancanti) e risponde a 3 scelte sugli errori parlanti. Il correttore usa lo STESSO
validatore dell'assistente (esercizi/assistente/configurazione.py) piu' controlli propri; i modelli gratuiti
ammessi stanno nei parametri dell'esercizio (esercizi/config/officina.json), non nel codice.
"""
from __future__ import annotations

import json

from ..assistente.configurazione import _segreti, valida
from ..motore.contratto import Controllo, Esito, testo
from ..officina import analisi as A
from ..officina.base import EsercizioOfficina, esito_si_no

FILE = "assistente.json"


def _o(id_: str, it: str, en: str) -> dict:
    return {"id": id_, "testo": testo(it, en)}


class AssistenteLibero(EsercizioOfficina):
    numero = 11
    id = "officina_assistente_libero"
    versione = "1.0"
    unita = "O5"
    titolo = testo("Officina O5 · L'assistente libero", "Workshop O5 · The free assistant")
    sottotitolo = testo(
        "Un assistente, tre motori: finto per i test, Ollama sul tuo PC, Groq gratis in rete. La configurazione di partenza però porta una chiave nel repo.",
        "One assistant, three engines: fake for tests, Ollama on your PC, Groq free over the network. The starting configuration, though, puts a key in the repo.")
    consegna = [
        testo("Leggi l'assistente (assistente/__init__.py e backend.py): chi sceglie il backend, da dove arriva la chiave, cosa succede se manca.",
              "Read the assistant (assistente/__init__.py and backend.py): who chooses the backend, where the key comes from, what happens if it is missing."),
        testo(f"Sistema {FILE}: nel repo il backend resta «finto», nessuna chiave scritta (solo il nome della variabile), modello Groq del piano gratuito, un perché per ogni scelta.",
              f"Fix {FILE}: in the repo the backend stays «finto», no key written (only the variable name), a free-plan Groq model, a reason for every choice."),
        testo("Prova: python -m assistente \"ciao\"; poi, con il segreto GROQ_API_KEY, ASSISTENTE_BACKEND=groq python -m assistente \"ciao\". Rispondi alle scelte.",
              "Try: python -m assistente \"ciao\"; then, with the GROQ_API_KEY secret, ASSISTENTE_BACKEND=groq python -m assistente \"ciao\". Answer the choices."),
    ]
    FILE = [{"percorso": FILE, "iniziale": "o5/assistente.iniziale.json", "linguaggio": "json",
             "descrizione": testo("La configurazione dell'assistente (finisce nel repo).", "The assistant configuration (it ends up in the repo).")}]
    MATERIALE = [
        {"titolo": testo("Come si usa l'assistente", "How to use the assistant"), "percorso": "o5/LEGGIMI.md"},
    ]
    SCELTE = [
        {"id": "chiave_assente", "domanda": testo("Backend groq e GROQ_API_KEY assente: che cosa fa l'assistente?",
                                                   "Groq backend and GROQ_API_KEY missing: what does the assistant do?"),
         "opzioni": [_o("errore_parlante", "Si ferma subito con un errore che nomina GROQ_API_KEY e dice come impostarla", "It stops at once with an error that names GROQ_API_KEY and says how to set it"),
                     _o("ripiega", "Passa da solo al backend finto", "It switches to the fake backend by itself"),
                     _o("vuota", "Risponde con una stringa vuota", "It answers with an empty string"),
                     _o("incorporata", "Usa una chiave di prova incorporata", "It uses a built-in test key")]},
        {"id": "limite_429", "domanda": testo("Groq risponde HTTP 429. Che cosa deve fare l'assistente?", "Groq answers HTTP 429. What must the assistant do?"),
         "opzioni": [_o("dire_e_attendere", "Dire che il limite gratuito è raggiunto e fra quanto riprovare, senza inventare una risposta", "Say the free limit is reached and when to retry, without inventing an answer"),
                     _o("finto_muto", "Rispondere col backend finto senza dirlo", "Answer with the fake backend without saying so"),
                     _o("ritenta", "Riprovare subito, all'infinito", "Retry at once, forever"),
                     _o("pagamento", "Passare a un modello a pagamento", "Switch to a paid model")]},
        {"id": "perche_finto", "domanda": testo("Perché test e correttore usano il backend finto?", "Why do tests and the grader use the fake backend?"),
         "opzioni": [_o("riproducibile", "Dà sempre la stessa risposta, senza rete né costi: il voto si ripete identico", "It always gives the same answer, with no network or cost: the score repeats identically"),
                     _o("migliore", "Risponde meglio del modello vero", "It answers better than the real model"),
                     _o("vietato", "Groq vieta di usare il piano gratuito per i test", "Groq forbids using the free plan for tests"),
                     _o("veloce", "È più veloce da scrivere", "It is quicker to write")]},
    ]
    RISPOSTE = {"chiave_assente": "errore_parlante", "limite_429": "dire_e_attendere", "perche_finto": "riproducibile"}
    PERCHE_SCELTE = {"chiave_assente": testo("BackendGroq.chiave()", "BackendGroq.chiave()"),
                     "limite_429": testo("mai un ripiego silenzioso", "never a silent fallback"),
                     "perche_finto": testo("e' lo stesso principio del registro del livello 1", "same principle as the level 1 log")}

    def controlli(self) -> list[Controllo]:
        return [
            Controllo("config_valida", testo("La configurazione passa il validatore dell'assistente", "The configuration passes the assistant's validator"), 20,
                      testo("Il verbale elenca i problemi del validatore: sono gli stessi che vedresti con python -m assistente.",
                            "The report lists the validator's problems: they are the same you would see with python -m assistente."),
                      self._c_valida),
            Controllo("nessuna_chiave", testo("Nessuna chiave nel file", "No key in the file"), 20,
                      testo("Togli il campo con la chiave: per Groq resta solo \"variabile_chiave\": \"GROQ_API_KEY\". La chiave vive nel segreto di Codespaces o nella variabile d'ambiente.",
                            "Remove the field holding the key: for Groq only \"variabile_chiave\": \"GROQ_API_KEY\" remains. The key lives in the Codespaces secret or in the environment variable."),
                      self._c_chiave, bloccante=True),
            Controllo("backend_finto", testo("Nel repo il backend è «finto»", "In the repo the backend is «finto»"), 15,
                      testo("\"backend\": \"finto\". Groq si accende da fuori con ASSISTENTE_BACKEND=groq, senza cambiare il file versionato.",
                            "\"backend\": \"finto\". Groq is switched on from outside with ASSISTENTE_BACKEND=groq, without changing the versioned file."),
                      self._c_finto),
            Controllo("groq_gratuito", testo("Groq: modello del piano gratuito", "Groq: free-plan model"), 15,
                      testo("Scegli un modello dell'elenco gratuito (es. llama-3.1-8b-instant) e lascia l'URL ufficiale https://api.groq.com/...",
                            "Choose a model from the free list (e.g. llama-3.1-8b-instant) and keep the official URL https://api.groq.com/..."),
                      self._c_groq),
            Controllo("perche", testo("Un perché per ogni scelta", "A reason for every choice"), 10,
                      testo("Servono _why in testa, _why_backend, _why_temperatura e un _why in ogni sezione (finto, ollama, groq).",
                            "You need _why at the top, _why_backend, _why_temperatura and a _why in every section (finto, ollama, groq)."),
                      self._c_perche),
            self.controllo_scelte(20, testo("Errori parlanti (scelte)", "Talking errors (choices)")),
        ]

    @staticmethod
    def _dati(ctx):
        try:
            return json.loads(ctx.foto["file"][FILE])
        except ValueError:
            return None

    def _c_valida(self, ctx) -> Esito:
        d = self._dati(ctx)
        if d is None:
            return Esito(False, testo(f"{FILE} non è JSON valido.", f"{FILE} is not valid JSON."))
        problemi = valida(d)
        if not problemi:
            return Esito(True, testo("Il validatore dell'assistente non trova problemi.", "The assistant's validator finds no problems."))
        elenco = "; ".join(problemi[:4]) + ("…" if len(problemi) > 4 else "")
        return Esito(False, testo(f"{len(problemi)} problemi: {elenco}.", f"{len(problemi)} problems (in Italian, as printed by the assistant): {elenco}."),
                     frazione=max(0.0, 1 - len(problemi) / 6))

    def _c_chiave(self, ctx) -> Esito:
        d = self._dati(ctx)
        campi = _segreti(d) if d is not None else []
        schemi = A.segreti_nel_testo(ctx.foto["file"][FILE])
        if not campi and not schemi:
            return Esito(True, testo("Nessuna chiave nel file.", "No key in the file."))
        elenco = ", ".join(campi + [f"forma di chiave {s}" for s in schemi])
        return Esito(False, testo(f"Valori segreti nel file: {elenco}.", f"Secret values in the file: {elenco}."))

    def _c_finto(self, ctx) -> Esito:
        d = self._dati(ctx) or {}
        b = d.get("backend")
        return esito_si_no(b == "finto", "Backend del repo: finto.", "Repo backend: finto.",
                           f"Backend del repo: {b}. Test e correttore non sarebbero più ripetibili.", f"Repo backend: {b}. Tests and grader would no longer be repeatable.")

    def _c_groq(self, ctx) -> Esito:
        d = self._dati(ctx) or {}
        g = d.get("groq") if isinstance(d.get("groq"), dict) else {}
        ammessi = ctx.parametri["modelli_groq_gratuiti"]
        modello, url = g.get("modello"), str(g.get("url", ""))
        ok_m, ok_u = modello in ammessi, url.startswith(ctx.parametri["url_groq"])
        return esito_si_no(ok_m and ok_u, f"Modello gratuito {modello} sull'URL ufficiale.", f"Free model {modello} on the official URL.",
                           f"Modello «{modello}» {'ok' if ok_m else 'fuori dal piano gratuito'}; URL {'ok' if ok_u else 'non ufficiale'}.",
                           f"Model «{modello}» {'ok' if ok_m else 'outside the free plan'}; URL {'ok' if ok_u else 'not official'}.",
                           None if ok_m and ok_u else (ok_m + ok_u) / 2)

    def _c_perche(self, ctx) -> Esito:
        d = self._dati(ctx) or {}
        richiesti = {"_why": d, "_why_backend": d, "_why_temperatura": d}
        mancano = [k for k, nodo in richiesti.items() if not str(nodo.get(k, "")).strip()]
        mancano += [f"{s}._why" for s in ("finto", "ollama", "groq") if not (isinstance(d.get(s), dict) and str(d[s].get("_why", "")).strip())]
        return esito_si_no(not mancano, "Ogni scelta ha il suo perché.", "Every choice has its reason.",
                           f"Perché mancanti: {', '.join(mancano)}.", f"Missing reasons: {', '.join(mancano)}.",
                           None if not mancano else max(0.0, 1 - len(mancano) / 6))


ESERCIZIO = AssistenteLibero()
