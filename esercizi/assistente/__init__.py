"""Assistente libero dell'Officina (O5): un'interfaccia, tre backend (finto / ollama / groq), configurazione prima del codice.

Uso:
    from assistente import crea_assistente          # nel repo studente
    a = crea_assistente()                            # legge assistente.json (+ ASSISTENTE_BACKEND dall'ambiente)
    print(a.chiedi("Che cosa fa il classificatore delle risposte?"))
Da terminale:  python -m assistente "domanda"
"""
from __future__ import annotations

from pathlib import Path
from typing import Mapping

from .backend import BackendFinto, BackendGroq, BackendOllama, Trasporto
from .configurazione import ErroreAssistente, carica, valida

__all__ = ["Assistente", "crea_assistente", "ErroreAssistente", "valida"]


class Assistente:
    def __init__(self, config: dict, backend):
        self.config = config
        self.backend = backend

    @property
    def nome_backend(self) -> str:
        return self.backend.nome

    def messaggi(self, domanda: str, storia: list[dict] | None = None) -> list[dict]:
        return [{"role": "system", "content": self.config["istruzioni_sistema"]}, *(storia or []),
                {"role": "user", "content": domanda}]

    def chiedi(self, domanda: str, storia: list[dict] | None = None) -> str:
        if not domanda or not domanda.strip():
            raise ErroreAssistente("domanda vuota: scrivi che cosa vuoi chiedere")
        risposta = self.backend.rispondi(self.messaggi(domanda, storia))
        if not risposta:
            raise ErroreAssistente(f"il backend '{self.nome_backend}' ha restituito una risposta vuota (nessun ripiego silenzioso)")
        return risposta


def crea_assistente(percorso: Path | str | None = None, ambiente: Mapping[str, str] | None = None,
                    trasporto: Trasporto | None = None) -> Assistente:
    cfg = carica(percorso, ambiente)
    b, t, m, s = cfg["backend"], float(cfg["temperatura"]), int(cfg["max_token"]), float(cfg["timeout_secondi"])
    if b == "finto":
        backend = BackendFinto(cfg["finto"])
    elif b == "ollama":
        backend = BackendOllama(cfg["ollama"], t, m, s, trasporto)
    else:
        backend = BackendGroq(cfg["groq"], t, m, s, ambiente, trasporto)
    return Assistente(cfg, backend)
