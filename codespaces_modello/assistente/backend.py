"""I tre backend dell'assistente libero, dietro la stessa interfaccia `rispondi(messaggi) -> str`.

  - BackendFinto: deterministico, nessuna rete, nessuna chiave. Risposte da tabella o eco riconoscibile.
    Basta a far girare TUTTI i test e il correttore.
  - BackendOllama: modello locale via HTTP (/api/chat). Gratis, sul tuo PC.
  - BackendGroq: piano gratuito di Groq (API compatibile OpenAI), chiave SOLO da variabile d'ambiente.
Nessun ripiego silenzioso: se un backend non puo' rispondere solleva ErroreAssistente con il motivo e il rimedio.
Solo libreria standard (urllib): niente dipendenze da installare.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import unicodedata
import urllib.error
import urllib.request
from typing import Callable, Mapping

from .configurazione import ErroreAssistente

# trasporto(url, intestazioni, corpo_json, timeout) -> (stato_http, intestazioni_risposta, testo_risposta)
Trasporto = Callable[[str, dict, dict, float], tuple[int, dict, str]]


def trasporto_urllib(url: str, intestazioni: dict, corpo: dict, timeout: float) -> tuple[int, dict, str]:
    dati = json.dumps(corpo).encode("utf-8")
    richiesta = urllib.request.Request(url, data=dati, method="POST",
                                       headers={"Content-Type": "application/json", **intestazioni})
    try:
        with urllib.request.urlopen(richiesta, timeout=timeout) as r:  # noqa: S310 - url dalla configurazione
            return r.status, dict(r.headers), r.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers or {}), e.read().decode("utf-8", "replace")
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise ConnectionError(str(getattr(e, "reason", e))) from e


def _normalizza(t: str) -> str:
    return re.sub(r"\s+", " ", unicodedata.normalize("NFKC", t).lower()).strip()


def ultimo_utente(messaggi: list[dict]) -> str:
    return next((m.get("content", "") for m in reversed(messaggi) if m.get("role") == "user"), "")


class BackendFinto:
    nome = "finto"

    def __init__(self, sezione: dict):
        self.tabella = {_normalizza(k): v for k, v in sezione["risposte"].items()}
        self.predefinita = sezione["risposta_predefinita"]

    def rispondi(self, messaggi: list[dict]) -> str:
        domanda = ultimo_utente(messaggi)
        if _normalizza(domanda) in self.tabella:
            return self.tabella[_normalizza(domanda)]
        impronta = hashlib.sha256(json.dumps(messaggi, sort_keys=True, ensure_ascii=False).encode("utf-8")).hexdigest()[:8]
        return self.predefinita.format(domanda=domanda[:80], impronta=impronta)


class BackendOllama:
    nome = "ollama"

    def __init__(self, sezione: dict, temperatura: float, max_token: int, timeout: float, trasporto: Trasporto | None = None):
        self.url = sezione["url"].rstrip("/") + "/api/chat"
        self.modello = sezione["modello"]
        self.opzioni = {"temperature": temperatura, "num_predict": max_token}
        self.timeout = timeout
        self.trasporto = trasporto or trasporto_urllib

    def rispondi(self, messaggi: list[dict]) -> str:
        corpo = {"model": self.modello, "messages": messaggi, "stream": False, "options": self.opzioni}
        try:
            stato, _, testo = self.trasporto(self.url, {}, corpo, self.timeout)
        except ConnectionError as e:
            raise ErroreAssistente(f"Ollama non risponde su {self.url} ({e}). È acceso? Avvialo con «ollama serve» "
                                   f"e scarica il modello con «ollama pull {self.modello}», oppure usa il backend finto.") from e
        if stato == 404:
            raise ErroreAssistente(f"Ollama non conosce il modello '{self.modello}': scaricalo con «ollama pull {self.modello}».")
        if stato != 200:
            raise ErroreAssistente(f"Ollama ha risposto HTTP {stato}: {testo[:200]}")
        try:
            return json.loads(testo)["message"]["content"].strip()
        except (ValueError, KeyError, TypeError) as e:
            raise ErroreAssistente(f"risposta di Ollama non leggibile: {testo[:200]}") from e


class BackendGroq:
    nome = "groq"

    def __init__(self, sezione: dict, temperatura: float, max_token: int, timeout: float,
                 ambiente: Mapping[str, str] | None = None, trasporto: Trasporto | None = None):
        self.url = sezione["url"]
        self.modello = sezione["modello"]
        self.variabile = sezione["variabile_chiave"]
        self.temperatura, self.max_token, self.timeout = temperatura, max_token, timeout
        self.ambiente = os.environ if ambiente is None else ambiente
        self.trasporto = trasporto or trasporto_urllib
        self.chiave()  # errore subito, alla creazione: meglio fermarsi prima che a meta' lavoro

    def chiave(self) -> str:
        k = (self.ambiente.get(self.variabile) or "").strip()
        if not k:
            raise ErroreAssistente(
                f"backend 'groq' scelto ma la variabile d'ambiente {self.variabile} è vuota o assente. "
                f"Crea una chiave gratuita su console.groq.com, poi: in Codespaces aggiungila come segreto {self.variabile} "
                f"(Settings → Codespaces → Secrets) e riapri il codespace; sul PC: set {self.variabile}=... (Windows) "
                f"o export {self.variabile}=... (Linux/macOS). Per lavorare senza rete: ASSISTENTE_BACKEND=finto. "
                f"La chiave non va MAI scritta nei file del repo.")
        return k

    def rispondi(self, messaggi: list[dict]) -> str:
        corpo = {"model": self.modello, "messages": messaggi, "temperature": self.temperatura, "max_tokens": self.max_token}
        try:
            stato, intestazioni, testo = self.trasporto(self.url, {"Authorization": f"Bearer {self.chiave()}"}, corpo, self.timeout)
        except ConnectionError as e:
            raise ErroreAssistente(f"Groq non raggiungibile ({e}): sei in rete? Per lavorare offline usa il backend finto o ollama.") from e
        if stato in (401, 403):
            raise ErroreAssistente(f"Groq ha rifiutato la chiave in {self.variabile} (HTTP {stato}): è scaduta, revocata o copiata male. "
                                   "Generane una nuova su console.groq.com e aggiorna la variabile (mai nel repo).")
        if stato == 429:
            attesa = {k.lower(): v for k, v in intestazioni.items()}.get("retry-after", "qualche")
            raise ErroreAssistente(f"limite del piano gratuito di Groq raggiunto (richieste o token): riprova fra {attesa} secondi. "
                                   "Nessuna risposta inventata al suo posto.")
        if stato == 404:
            raise ErroreAssistente(f"Groq non conosce il modello '{self.modello}': controlla l'elenco dei modelli gratuiti e aggiorna assistente.json.")
        if stato != 200:
            raise ErroreAssistente(f"Groq ha risposto HTTP {stato}: {testo[:200]}")
        try:
            return json.loads(testo)["choices"][0]["message"]["content"].strip()
        except (ValueError, KeyError, IndexError, TypeError) as e:
            raise ErroreAssistente(f"risposta di Groq non leggibile: {testo[:200]}") from e
