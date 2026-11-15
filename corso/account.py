"""Account minimi (STUB): email + codice, sessioni in memoria con scadenza.

Nella fase successiva il codice verra' inviato per email come in CWEG; qui un codice e' valido se e'
elencato in config account.codici_stub. Il token di sessione viaggia solo in un cookie HttpOnly.
"""
from __future__ import annotations

import re
import secrets
from datetime import datetime, timedelta
from typing import Callable

from .config import Config
from .errori import ErroreAccesso, ErroreConfigurazione

RE_EMAIL = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def verifica_credenziali(email: str, codice: str, cfg: Config) -> str:
    """Restituisce l'email normalizzata oppure solleva ErroreAccesso."""
    modalita = cfg.prendi("account", "modalita", tipo=str)
    if modalita != "stub":
        raise ErroreConfigurazione(f"account.modalita '{modalita}' non ancora implementata (disponibile: stub)")
    email = email.strip().lower()
    if len(email) > cfg.prendi("account", "lunghezza_massima_email", tipo=int) or not RE_EMAIL.match(email):
        raise ErroreAccesso("email non valida")
    if codice.strip() not in cfg.prendi("account", "codici_stub", tipo=list):
        raise ErroreAccesso("codice di accesso non valido")
    return email


class Sessioni:
    def __init__(self, cfg: Config, orologio: Callable[[], datetime]):
        self.durata = timedelta(hours=cfg.prendi("account", "durata_sessione_ore", tipo=(int, float)))
        self.byte_token = cfg.prendi("account", "lunghezza_token_byte", tipo=int)
        self.adesso = orologio
        self._attive: dict[str, tuple[str, datetime]] = {}

    def crea(self, email: str) -> str:
        token = secrets.token_urlsafe(self.byte_token)
        self._attive[token] = (email, self.adesso() + self.durata)
        return token

    def email_di(self, token: str | None) -> str:
        if not token or token not in self._attive:
            raise ErroreAccesso("accesso richiesto")
        email, scade = self._attive[token]
        if self.adesso() >= scade:
            del self._attive[token]
            raise ErroreAccesso("sessione scaduta: accedi di nuovo")
        return email

    def chiudi(self, token: str | None) -> None:
        if token:
            self._attive.pop(token, None)
