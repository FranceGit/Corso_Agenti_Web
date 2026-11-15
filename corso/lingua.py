"""Risoluzione dei testi bilingui nella lingua chiesta, senza mai ripiegare sull'altra lingua."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from .errori import TraduzioneMancante
from .modello import Testo


def _e_testo(d: Any) -> bool:
    return isinstance(d, dict) and set(d.keys()) == {"it", "en"}


def risolvi(dato: Any, lingua: str) -> Any:
    """Sostituisce ogni testo {it, en} (dict o Testo) con la stringa nella lingua chiesta.

    Raccoglie TUTTI i testi mancanti e solleva una sola TraduzioneMancante con i loro percorsi,
    cosi' l'autore vede in un colpo solo cosa resta da tradurre.
    """
    mancanti: list[str] = []
    risultato = _risolvi(dato, lingua, "$", mancanti)
    if mancanti:
        raise TraduzioneMancante(lingua, mancanti)
    return risultato


def _risolvi(dato: Any, lingua: str, percorso: str, mancanti: list[str]) -> Any:
    if isinstance(dato, Testo):
        dato = dato.model_dump()
    elif isinstance(dato, BaseModel):
        dato = dato.model_dump()
    if _e_testo(dato):
        valore = dato[lingua]
        if valore is None:
            mancanti.append(percorso)
        return valore
    if isinstance(dato, dict):
        return {k: _risolvi(v, lingua, f"{percorso}.{k}", mancanti) for k, v in dato.items()}
    if isinstance(dato, list):
        return [_risolvi(v, lingua, f"{percorso}[{i}]", mancanti) for i, v in enumerate(dato)]
    return dato


def testi_mancanti(dato: Any, lingua: str) -> list[str]:
    """Percorsi dei testi che non esistono nella lingua indicata (lista vuota = completo)."""
    mancanti: list[str] = []
    _risolvi(dato, lingua, "$", mancanti)
    return mancanti
