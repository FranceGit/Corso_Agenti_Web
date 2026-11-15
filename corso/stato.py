"""Stato dello studente e suo archivio su disco (un file JSON per studente, scrittura atomica).

Il nome del file e' l'impronta SHA-256 dell'email: l'email non compare nei nomi dei file.
"""
from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Literal, Optional

from pydantic import Field, ValidationError

from .errori import ErroreDati
from .modello import Base


class EsitoStriscia(Base):
    domanda: str
    concetto: str
    pulito: bool
    danno: int


class StatoSpicchio(Base):
    pillola: str
    tentativo: int
    strisce: list[str]
    indice: int = 0
    esiti: list[EsitoStriscia] = Field(default_factory=list)
    stato: Literal["in_corso", "superato", "non_superato"] = "in_corso"


class Padronanza(Base):
    tentativi: int = 0
    puliti: int = 0
    fallimenti_consecutivi: int = 0


class DaRivedere(Base):
    domanda: str
    concetto: str
    pillola: str
    gradino: int
    scadenza: datetime


class DomandaInCorso(Base):
    contesto: Literal["spicchio", "ripasso"]
    pillola: str
    domanda: str
    livello: Literal[1, 2]
    ordine: list[str]  # id delle opzioni nell'ordine mostrato (posizione 1 = primo)
    errore_precedente: bool = False  # vero se il livello 1 era sbagliato (solo con l2_dopo_l1_errata)
    danno: int = 0


class Debriefing(Base):
    motivo: Literal["convalescenza", "ripasso"]
    elementi: list[str]  # id delle domande da rivedere
    indice: int = 0
    recuperato: int = 0


class Record(Base):
    quota_passaggi_puliti: float
    salute_finale: int
    giro: int
    data: datetime


class StatoStudente(Base):
    versione: Literal[1] = 1
    email: str
    seme: str
    creato: datetime
    giro: int = 1
    salute: int
    convalescenza: bool = False
    contatore_presentazioni: int = 0
    spicchi: dict[str, StatoSpicchio] = Field(default_factory=dict)
    padronanza: dict[str, Padronanza] = Field(default_factory=dict)
    da_rivedere: list[DaRivedere] = Field(default_factory=list)
    in_corso: Optional[DomandaInCorso] = None
    debriefing: Optional[Debriefing] = None
    record: Optional[Record] = None
    percorsi_completati: int = 0


class Archivio:
    def __init__(self, cartella: Path):
        self.cartella = cartella
        self.cartella.mkdir(parents=True, exist_ok=True)

    def _file(self, email: str) -> Path:
        impronta = hashlib.sha256(email.strip().lower().encode("utf-8")).hexdigest()
        return self.cartella / f"{impronta}.json"

    def esiste(self, email: str) -> bool:
        return self._file(email).is_file()

    def carica(self, email: str) -> StatoStudente:
        f = self._file(email)
        if not f.is_file():
            raise ErroreDati(f"nessuno stato salvato per questo studente ({f.name})")
        try:
            return StatoStudente.model_validate(json.loads(f.read_text(encoding="utf-8")))
        except (json.JSONDecodeError, ValidationError) as e:
            raise ErroreDati(f"stato dello studente illeggibile ({f.name}): {e}") from e

    def salva(self, stato: StatoStudente) -> None:
        f = self._file(stato.email)
        tmp = f.with_suffix(".tmp")
        tmp.write_text(stato.model_dump_json(indent=1), encoding="utf-8")
        os.replace(tmp, f)
