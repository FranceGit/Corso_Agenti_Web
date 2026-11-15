"""Modello SALUTE e ripasso distanziato (funzioni pure: tutti i numeri vengono dalla configurazione).

- Passaggio pulito: nessun danno.
- Passaggio con correzione: danno = danno_per_tipo_distrattore[tipo scelto] x moltiplicatore del livello.
- La salute non scende sotto zero e non blocca mai: a zero scatta la convalescenza (debriefing).
- Nei debriefing di ripasso la salute si recupera.
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta

from .config import Config
from .errori import ErroreConfigurazione


def arrotonda(valore: float) -> int:
    """Arrotondamento all'intero piu' vicino, con le meta' verso l'alto (non quello 'bancario' di round)."""
    return int(math.floor(valore + 0.5))


def danno(tipo_distrattore: str, livello: int, cfg: Config) -> int:
    tabella = cfg.prendi("salute", "danno_per_tipo_distrattore", tipo=dict)
    if tipo_distrattore not in tabella:
        raise ErroreConfigurazione(f"salute.danno_per_tipo_distrattore non definisce il tipo '{tipo_distrattore}'")
    molt = cfg.prendi("salute", "moltiplicatore_per_livello", tipo=dict)
    if str(livello) not in molt:
        raise ErroreConfigurazione(f"salute.moltiplicatore_per_livello non definisce il livello {livello}")
    return arrotonda(tabella[tipo_distrattore] * molt[str(livello)])


def applica_danno(salute: int, quanto: int) -> tuple[int, bool]:
    """Nuova salute e se e' scattata la convalescenza (salute arrivata a zero)."""
    nuova = max(0, salute - quanto)
    return nuova, nuova == 0


def recupera(salute: int, quanto: int, cfg: Config) -> int:
    return min(cfg.prendi("salute", "massima", tipo=int), salute + quanto)


def salute_fine_convalescenza(salute: int, cfg: Config) -> int:
    """A fine convalescenza la salute risale almeno al valore configurato (mai la si abbassa)."""
    return max(salute, cfg.prendi("salute", "salute_dopo_convalescenza", tipo=int))


def intervalli(cfg: Config) -> list[int]:
    valori = cfg.prendi("ripasso", "intervalli_ore", tipo=list)
    if not valori or any((not isinstance(v, int)) or v <= 0 for v in valori):
        raise ErroreConfigurazione("ripasso.intervalli_ore deve essere una lista non vuota di interi positivi")
    return valori


def scadenza(gradino: int, adesso: datetime, cfg: Config) -> datetime:
    return adesso + timedelta(hours=intervalli(cfg)[gradino])


def gradino_dopo_ripasso(gradino: int, pulito: bool, cfg: Config) -> int | None:
    """Gradino successivo dopo un ripasso: None = l'elemento esce dalla lista (imparato)."""
    if not pulito:
        return 0
    successivo = gradino + 1
    return None if successivo >= len(intervalli(cfg)) else successivo
