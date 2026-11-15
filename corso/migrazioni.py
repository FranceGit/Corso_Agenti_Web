"""Migrazioni del file del corso fra versioni dello schema.

Ogni passo porta i dati da una versione alla successiva; `migra_corso` li applica in catena fino alla
versione corrente del modello. Una versione sconosciuta e' un errore esplicito (mai un'interpretazione
silenziosa).
"""
from __future__ import annotations

import copy
from typing import Any, Callable

from .errori import ErroreDati
from .modello import VERSIONE_SCHEMA_CORSO


def _v1_a_v2(dati: dict[str, Any]) -> dict[str, Any]:
    """v2 aggiunge a ogni domanda il campo 'striscia' (punto di vista); in v1 non esisteva: null = da assegnare."""
    for m in dati["moduli"]:
        for p in m["pillole"]:
            for d in p["domande"]:
                if "striscia" in d:
                    raise ErroreDati(f"domanda {d.get('id')}: campo 'striscia' gia' presente in un file dichiarato v1")
                d["striscia"] = None
    dati["versione_schema"] = 2
    return dati


PASSI: dict[int, Callable[[dict[str, Any]], dict[str, Any]]] = {1: _v1_a_v2}


def migra_corso(dati: dict[str, Any]) -> dict[str, Any]:
    """Restituisce una copia dei dati portata alla versione corrente dello schema del corso."""
    if not isinstance(dati, dict) or "versione_schema" not in dati:
        raise ErroreDati("file del corso senza versione_schema")
    risultato = copy.deepcopy(dati)
    while risultato["versione_schema"] != VERSIONE_SCHEMA_CORSO:
        versione = risultato["versione_schema"]
        if versione not in PASSI:
            raise ErroreDati(f"versione_schema {versione} del corso non migrabile (corrente: {VERSIONE_SCHEMA_CORSO})")
        risultato = PASSI[versione](risultato)
    return risultato
