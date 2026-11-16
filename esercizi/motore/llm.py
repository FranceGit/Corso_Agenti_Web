"""Modello linguistico del laboratorio, sempre dietro al REGISTRO delle risposte.

  - FintoLLM: deterministico, risposte da tabelle (esercizi/finto_llm/tabelle.json). Nessuna GPU, nessuna rete.
    Imita un modello piccolo, compresi i suoi limiti (per esempio chiama "Not Interested" anche chi chiede la
    disiscrizione): cosi' gli esercizi si collaudano per intero anche in sandbox.
  - ClientOllama: protocollo Ollama /api/chat (temperatura 0, seme fisso). Lo stesso protocollo lo parla il
    servizio finto-llm del docker-compose: il portale non sa se dall'altra parte c'e' il modello vero.
  - RegistroLLM: impronta della richiesta (modello + messaggi + opzioni) -> risposta. Una risposta gia' data non
    si richiede: ricorreggere un tentativo da' lo stesso voto anche se il modello, nel frattempo, cambiasse.

Convenzione dei prompt: la prima riga del messaggio di sistema e' "COMPITO: <nome>" (al modello vero non da'
fastidio, al finto dice quale tabella usare); l'ultimo messaggio dell'utente e' il dato da elaborare.
"""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import threading
import unicodedata
from pathlib import Path

import httpx

from corso.config import leggi_json
from corso.errori import ErroreConfigurazione, ErroreDati


def normalizza(testo: str) -> str:
    t = unicodedata.normalize("NFKC", testo).lower()
    t = t.replace("’", "'")
    return re.sub(r"\s+", " ", t).strip()


def compito_di(messaggi: list[dict]) -> str:
    for m in messaggi:
        if m.get("role") == "system":
            prima = m.get("content", "").strip().splitlines()[0] if m.get("content", "").strip() else ""
            if prima.upper().startswith("COMPITO:"):
                return prima.split(":", 1)[1].strip()
    return ""


def ultimo_utente(messaggi: list[dict]) -> str:
    for m in reversed(messaggi):
        if m.get("role") == "user":
            return m.get("content", "")
    return ""


class FintoLLM:
    def __init__(self, percorso_tabelle: Path, nome_modello: str):
        dati = leggi_json(percorso_tabelle)
        self.nome = nome_modello
        self.compiti = dati["compiti"]
        self.generica = dati["risposta_generica"]
        for nome, c in self.compiti.items():
            for chiave in ("tabella", "regole", "ripiego"):
                if chiave not in c:
                    raise ErroreDati(f"finto-LLM: il compito '{nome}' non ha '{chiave}'")
            c["_tabella_norm"] = {normalizza(k): v for k, v in c["tabella"].items()}

    def rispondi(self, messaggi: list[dict]) -> str:
        compito = self.compiti.get(compito_di(messaggi))
        if compito is None:
            return self.generica
        testo = normalizza(ultimo_utente(messaggi))
        if testo in compito["_tabella_norm"]:
            return compito["_tabella_norm"][testo]
        for frase, risposta in compito["regole"]:
            if normalizza(frase) in testo:
                return risposta
        return compito["ripiego"]


class ClientOllama:
    def __init__(self, url: str, modello: str, temperatura: float, seme: int, timeout: float,
                 client: httpx.Client | None = None):
        self.nome = modello
        self.opzioni = {"temperature": temperatura, "seed": seme}
        self.http = client or httpx.Client(base_url=url, timeout=timeout)
        self.url = url

    def rispondi(self, messaggi: list[dict]) -> str:
        corpo = {"model": self.nome, "messages": messaggi, "stream": False, "options": self.opzioni}
        try:
            r = self.http.post("/api/chat", json=corpo)
        except httpx.HTTPError as e:
            raise ErroreConfigurazione(
                f"modello linguistico non raggiungibile su {self.url} ({e}): il laboratorio e' acceso? "
                "Per lavorare senza modello imposta llm.backend = 'finto'") from e
        if r.status_code != 200:
            raise ErroreConfigurazione(f"il modello '{self.nome}' ha risposto HTTP {r.status_code}: {r.text[:200]}")
        return r.json()["message"]["content"].strip()


class RegistroLLM:
    def __init__(self, percorso: Path):
        percorso.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(percorso, check_same_thread=False)
        self.blocco = threading.Lock()
        self.db.execute("CREATE TABLE IF NOT EXISTS registro (chiave TEXT PRIMARY KEY, modello TEXT NOT NULL, "
                        "richiesta TEXT NOT NULL, risposta TEXT NOT NULL)")
        self.db.commit()

    @staticmethod
    def impronta(modello: str, messaggi: list[dict], opzioni: dict) -> tuple[str, str]:
        richiesta = json.dumps({"modello": modello, "messaggi": messaggi, "opzioni": opzioni},
                               ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(richiesta.encode("utf-8")).hexdigest(), richiesta

    def leggi(self, chiave: str) -> str | None:
        with self.blocco:
            r = self.db.execute("SELECT risposta FROM registro WHERE chiave = ?", (chiave,)).fetchone()
        return r[0] if r else None

    def scrivi(self, chiave: str, modello: str, richiesta: str, risposta: str) -> None:
        with self.blocco, self.db:
            self.db.execute("INSERT OR IGNORE INTO registro (chiave, modello, richiesta, risposta) VALUES (?, ?, ?, ?)",
                            (chiave, modello, richiesta, risposta))

    def quante(self) -> int:
        return self.db.execute("SELECT COUNT(*) FROM registro").fetchone()[0]


class ModelloConRegistro:
    """Quello che usano gli esercizi: chiede al registro, e solo se manca al modello."""

    def __init__(self, modello, registro: RegistroLLM, opzioni: dict):
        self.modello, self.registro, self.opzioni = modello, registro, opzioni

    @property
    def nome(self) -> str:
        return self.modello.nome

    def completa(self, messaggi: list[dict]) -> dict:
        chiave, richiesta = RegistroLLM.impronta(self.modello.nome, messaggi, self.opzioni)
        salvata = self.registro.leggi(chiave)
        if salvata is not None:
            return {"risposta": salvata, "chiave": chiave, "dal_registro": True}
        risposta = self.modello.rispondi(messaggi)
        self.registro.scrivi(chiave, self.modello.nome, richiesta, risposta)
        return {"risposta": risposta, "chiave": chiave, "dal_registro": False}


def crea_modello(cfg) -> ModelloConRegistro:
    backend = cfg.prendi("llm", "backend", tipo=str)
    temperatura = cfg.prendi("llm", "temperatura", tipo=(int, float))
    seme = cfg.prendi("llm", "seme", tipo=int)
    registro = RegistroLLM(cfg.cartella_stato() / cfg.prendi("llm", "file_registro", tipo=str))
    if backend == "finto":
        modello = FintoLLM(cfg.percorso_progetto("llm", "file_tabelle_finto"), cfg.prendi("llm", "modello_finto", tipo=str))
    elif backend == "ollama":
        modello = ClientOllama(cfg.prendi("llm", "url", tipo=str), cfg.prendi("llm", "modello", tipo=str),
                               temperatura, seme, float(cfg.prendi("llm", "timeout_secondi")))
    else:
        raise ErroreConfigurazione(f"llm.backend '{backend}' sconosciuto")
    return ModelloConRegistro(modello, registro, {"temperatura": temperatura, "seme": seme})
