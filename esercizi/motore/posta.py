"""Posta finta: nessuna email esce davvero.

Due realizzazioni con la stessa interfaccia:
  - PostaLocale: un file SQLite condiviso (sviluppo, collaudo, sandbox senza container);
  - PostaMailpit: invio SMTP a Mailpit e lettura dalla sua API web (laboratorio Docker).
Ogni messaggio porta un'ETICHETTA (studente + esercizio): il correttore legge e svuota solo quella.
L'elenco restituito e' ordinato (destinatario, oggetto, corpo): due letture dello stesso stato sono identiche.
"""
from __future__ import annotations

import smtplib
import sqlite3
from abc import ABC, abstractmethod
from email.message import EmailMessage
from pathlib import Path

import httpx

from corso.errori import ErroreConfigurazione


def _ordina(messaggi: list[dict]) -> list[dict]:
    return sorted(messaggi, key=lambda m: (m["a"], m["oggetto"], m["corpo"]))


class Posta(ABC):
    @abstractmethod
    def invia(self, etichetta: str, a: str, oggetto: str, corpo: str) -> None: ...

    @abstractmethod
    def elenco(self, etichetta: str) -> list[dict]: ...

    @abstractmethod
    def svuota(self, etichetta: str) -> None: ...


class PostaLocale(Posta):
    def __init__(self, percorso: Path, mittente: str):
        percorso.parent.mkdir(parents=True, exist_ok=True)
        self.mittente = mittente
        self.db = sqlite3.connect(percorso, check_same_thread=False)
        self.db.execute("CREATE TABLE IF NOT EXISTS messaggi (id INTEGER PRIMARY KEY AUTOINCREMENT, "
                        "etichetta TEXT NOT NULL, mittente TEXT NOT NULL, a TEXT NOT NULL, "
                        "oggetto TEXT NOT NULL, corpo TEXT NOT NULL)")
        self.db.commit()

    def invia(self, etichetta, a, oggetto, corpo):
        with self.db:
            self.db.execute("INSERT INTO messaggi (etichetta, mittente, a, oggetto, corpo) VALUES (?, ?, ?, ?, ?)",
                            (etichetta, self.mittente, a, oggetto, corpo))

    def elenco(self, etichetta):
        righe = self.db.execute("SELECT a, oggetto, corpo FROM messaggi WHERE etichetta = ?", (etichetta,)).fetchall()
        return _ordina([{"a": a, "oggetto": o, "corpo": c} for a, o, c in righe])

    def svuota(self, etichetta):
        with self.db:
            self.db.execute("DELETE FROM messaggi WHERE etichetta = ?", (etichetta,))


class PostaMailpit(Posta):
    """Mailpit: SMTP sulla porta 1025, API web sulla 8025. L'etichetta viaggia nell'intestazione X-Tags."""

    LIMITE = 1000  # un esercizio manda al massimo qualche decina di email: 1000 e' un tetto di sicurezza

    def __init__(self, smtp_host: str, smtp_porta: int, api_url: str, mittente: str, timeout: float,
                 client: httpx.Client | None = None, smtp_factory=smtplib.SMTP):
        self.smtp_host, self.smtp_porta, self.mittente, self.timeout = smtp_host, smtp_porta, mittente, timeout
        self.http = client or httpx.Client(base_url=api_url, timeout=timeout)
        self.smtp_factory = smtp_factory

    @staticmethod
    def _query(etichetta: str) -> str:
        return f"tag:{etichetta}"

    def invia(self, etichetta, a, oggetto, corpo):
        msg = EmailMessage()
        msg["From"], msg["To"], msg["Subject"], msg["X-Tags"] = self.mittente, a, oggetto, etichetta
        msg.set_content(corpo)
        try:
            with self.smtp_factory(self.smtp_host, self.smtp_porta, timeout=self.timeout) as s:
                s.send_message(msg)
        except OSError as e:
            raise ErroreConfigurazione(
                f"posta Mailpit non raggiungibile su {self.smtp_host}:{self.smtp_porta} ({e}): "
                "il laboratorio e' acceso? (avvia_laboratorio)") from e

    def _get(self, url: str, **params) -> dict:
        try:
            r = self.http.get(url, params=params)
        except httpx.HTTPError as e:
            raise ErroreConfigurazione(f"API di Mailpit non raggiungibile ({e})") from e
        r.raise_for_status()
        return r.json()

    def elenco(self, etichetta):
        dati = self._get("/api/v1/search", query=self._query(etichetta), limit=self.LIMITE)
        messaggi = []
        for m in dati.get("messages", []):
            corpo = self._get(f"/api/v1/message/{m['ID']}").get("Text", "")
            for dest in m.get("To", []):
                messaggi.append({"a": dest["Address"], "oggetto": m.get("Subject", ""), "corpo": corpo.strip()})
        return _ordina(messaggi)

    def svuota(self, etichetta):
        try:
            r = self.http.request("DELETE", "/api/v1/search", params={"query": self._query(etichetta)})
        except httpx.HTTPError as e:
            raise ErroreConfigurazione(f"API di Mailpit non raggiungibile ({e})") from e
        r.raise_for_status()


def crea_posta(cfg) -> Posta:
    backend = cfg.prendi("posta", "backend", tipo=str)
    mittente = cfg.prendi("posta", "mittente", tipo=str)
    if backend == "locale":
        return PostaLocale(cfg.cartella_stato() / cfg.prendi("posta", "file_locale", tipo=str), mittente)
    if backend == "mailpit":
        return PostaMailpit(cfg.prendi("posta", "smtp_host", tipo=str), int(cfg.prendi("posta", "smtp_porta")),
                            cfg.prendi("posta", "api_url", tipo=str), mittente,
                            float(cfg.prendi("posta", "timeout_secondi")))
    raise ErroreConfigurazione(f"posta.backend '{backend}' sconosciuto")
