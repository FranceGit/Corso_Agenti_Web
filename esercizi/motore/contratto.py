"""Contratto di un esercizio.

Ogni esercizio dichiara:
  - SETUP: `prepara(lab)` semina il CRM (e, se serve, la posta) in modo deterministico dal seme dello studente;
  - CONSEGNA: titolo, sottotitolo e consegna allo studente in IT e EN;
  - AREA DI LAVORO: `area(lab, lingua)` (cosa vede lo studente) e `azione(lab, nome, parametri)` (cosa puo' fare);
  - FOTOGRAFIA: `fotografa(lab)` congela in un dizionario tutto cio' che si corregge (scelte dello studente,
    stato finale del CRM e della posta, risposte del modello prese dal registro). Il voto dipende SOLO da questo;
  - CHIAVE: `chiave(seme)` la chiave di correzione (mai inviata al browser);
  - CONTROLLI: elenco di Controllo con nome, peso, messaggio di aiuto, eventuale "bloccante" e la funzione che
    restituisce un Esito (superato, frazione dei punti, spiegazione in linguaggio semplice IT/EN).
Il correttore non legge mai il testo libero del modello: solo scelte, stati ed etichette di elenchi chiusi.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Callable

from corso.errori import ErroreDati

Testo = dict  # {"it": "...", "en": "..."}


def testo(it: str, en: str) -> Testo:
    return {"it": it, "en": en}


def verifica_testo(t: Any, dove: str) -> None:
    if not isinstance(t, dict) or set(t) != {"it", "en"} or not all(isinstance(v, str) and v.strip() for v in t.values()):
        raise ErroreDati(f"{dove}: serve un testo con 'it' ed 'en' entrambi non vuoti, trovato {t!r}")


@dataclass(frozen=True)
class Esito:
    superato: bool
    spiegazione: Testo
    frazione: float | None = None  # quota dei punti (0..1); None = tutto o niente secondo 'superato'

    def quota(self) -> float:
        if self.frazione is None:
            return 1.0 if self.superato else 0.0
        return max(0.0, min(1.0, float(self.frazione)))


@dataclass(frozen=True)
class Contesto:
    foto: dict
    chiave: dict
    parametri: dict


@dataclass(frozen=True)
class Controllo:
    id: str
    nome: Testo
    peso: int
    aiuto: Testo
    verifica: Callable[[Contesto], Esito]
    bloccante: bool = False


class Esercizio(ABC):
    numero: int = 0
    id: str = ""
    versione: str = ""
    titolo: Testo
    sottotitolo: Testo
    consegna: list  # elenco di Testo (passi numerati)
    tipo_area: str = ""  # quale vista disegna la webapp

    # --- setup
    @abstractmethod
    def prepara(self, lab) -> None: ...

    # --- area di lavoro
    @abstractmethod
    def area(self, lab, lingua: str) -> dict: ...

    @abstractmethod
    def azione(self, lab, nome: str, parametri: dict) -> dict: ...

    # --- correzione
    @abstractmethod
    def fotografa(self, lab) -> dict: ...

    @abstractmethod
    def chiave(self, seme: int) -> dict: ...

    @abstractmethod
    def controlli(self) -> list[Controllo]: ...

    # --- coerenza del contratto (chiamata dal catalogo all'avvio)
    def valida(self) -> None:
        dove = f"esercizio {self.numero} ({self.id})"
        if not self.id or not self.versione or self.numero < 1 or not self.tipo_area:
            raise ErroreDati(f"{dove}: id, versione, numero e tipo_area sono obbligatori")
        for nome in ("titolo", "sottotitolo"):
            verifica_testo(getattr(self, nome), f"{dove}.{nome}")
        if not self.consegna:
            raise ErroreDati(f"{dove}: consegna vuota")
        for i, passo in enumerate(self.consegna):
            verifica_testo(passo, f"{dove}.consegna[{i}]")
        controlli = self.controlli()
        ids = [c.id for c in controlli]
        if len(ids) != len(set(ids)):
            raise ErroreDati(f"{dove}: id dei controlli ripetuti {ids}")
        if sum(c.peso for c in controlli) != 100:
            raise ErroreDati(f"{dove}: i pesi dei controlli devono sommare 100, trovato {sum(c.peso for c in controlli)}")
        for c in controlli:
            if c.peso < 0:
                raise ErroreDati(f"{dove}: peso negativo nel controllo {c.id}")
            verifica_testo(c.nome, f"{dove}.{c.id}.nome")
            verifica_testo(c.aiuto, f"{dove}.{c.id}.aiuto")
