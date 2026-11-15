"""Caricamento della configurazione con accesso stretto: una chiave mancante e' un errore che la nomina."""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .errori import ErroreConfigurazione

RADICE_PROGETTO = Path(__file__).resolve().parent.parent
FILE_CONFIG = RADICE_PROGETTO / "config" / "piattaforma.json"


class Config:
    """Vista in sola lettura su un dizionario di configurazione.

    `cfg.prendi("salute", "massima")` restituisce il valore oppure solleva ErroreConfigurazione con il
    percorso completo della chiave. Non esiste un parametro 'default': e' una scelta voluta.
    """

    def __init__(self, dati: dict[str, Any], origine: str):
        if not isinstance(dati, dict):
            raise ErroreConfigurazione(f"{origine}: la radice deve essere un oggetto JSON")
        self._dati = dati
        self.origine = origine

    def prendi(self, *chiavi: str, tipo: type | tuple[type, ...] | None = None) -> Any:
        nodo: Any = self._dati
        percorso: list[str] = []
        for chiave in chiavi:
            percorso.append(chiave)
            if not isinstance(nodo, dict) or chiave not in nodo:
                raise ErroreConfigurazione(f"{self.origine}: manca la chiave '{'.'.join(percorso)}'")
            nodo = nodo[chiave]
        if tipo is not None and not isinstance(nodo, tipo):
            raise ErroreConfigurazione(
                f"{self.origine}: la chiave '{'.'.join(percorso)}' deve essere di tipo {tipo}, trovato {type(nodo).__name__}"
            )
        return nodo

    def percorso_file(self, chiave: str) -> Path:
        """Percorso assoluto di un file/cartella dichiarato in percorsi_file (relativo alla radice)."""
        return RADICE_PROGETTO / self.prendi("percorsi_file", chiave, tipo=str)

    def lingue(self) -> list[str]:
        return self.prendi("lingue", "disponibili", tipo=list)

    def verifica_lingua(self, lingua: str) -> str:
        if lingua not in self.lingue():
            raise ErroreConfigurazione(f"lingua '{lingua}' non prevista: disponibili {self.lingue()}")
        return lingua


def leggi_json(percorso: Path) -> Any:
    if not percorso.is_file():
        raise ErroreConfigurazione(f"file non trovato: {percorso}")
    with percorso.open(encoding="utf-8") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError as e:
            raise ErroreConfigurazione(f"{percorso}: JSON non valido ({e})") from e


def carica_config(percorso: Path = FILE_CONFIG) -> Config:
    return Config(leggi_json(percorso), str(percorso))
