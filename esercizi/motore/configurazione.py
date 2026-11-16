"""Configurazione del laboratorio: stessa disciplina del portale (chiave mancante = errore che la nomina).

Le sole sostituzioni dall'esterno sono le variabili d'ambiente dichiarate in `variabili_ambiente` (servono a
docker-compose per spostare posta e modello sui servizi veri). Nessun altro valore viene da fuori.
"""
from __future__ import annotations

import copy
import os
from pathlib import Path
from typing import Mapping

from corso.config import RADICE_PROGETTO, Config, leggi_json
from corso.errori import ErroreConfigurazione

FILE_LABORATORIO = RADICE_PROGETTO / "esercizi" / "config" / "laboratorio.json"


def _applica_ambiente(dati: dict, ambiente: Mapping[str, str]) -> dict:
    dati = copy.deepcopy(dati)
    mappa = {k: v for k, v in dati.get("variabili_ambiente", {}).items() if not k.startswith("_")}
    for variabile, percorso in mappa.items():
        if variabile not in ambiente:
            continue
        nodo = dati
        for chiave in percorso[:-1]:
            if chiave not in nodo:
                raise ErroreConfigurazione(f"variabile {variabile}: la chiave '{'.'.join(percorso)}' non esiste")
            nodo = nodo[chiave]
        if percorso[-1] not in nodo:
            raise ErroreConfigurazione(f"variabile {variabile}: la chiave '{'.'.join(percorso)}' non esiste")
        nodo[percorso[-1]] = ambiente[variabile]
    for sezione in ("llm", "posta"):
        valore = dati[sezione]["backend"]
        ammessi = dati[sezione]["backend_ammessi"]
        if valore not in ammessi:
            raise ErroreConfigurazione(f"{sezione}.backend '{valore}' non ammesso: scegli fra {ammessi}")
    return dati


class ConfigLaboratorio(Config):
    """Config del laboratorio con i percorsi risolti rispetto alla radice del progetto."""

    def cartella_stato(self) -> Path:
        p = Path(self.prendi("cartella_stato", tipo=str))
        return p if p.is_absolute() else RADICE_PROGETTO / p

    def percorso_progetto(self, *chiavi: str) -> Path:
        return RADICE_PROGETTO / self.prendi(*chiavi, tipo=str)

    def soglia(self, numero: int) -> int:
        return self.prendi("soglie", str(numero), tipo=int)

    def parametri(self, numero: int) -> dict:
        p = self.prendi("parametri_esercizi", str(numero), tipo=dict)
        return {k: v for k, v in p.items() if not k.startswith("_")}


def carica_laboratorio(percorso: Path = FILE_LABORATORIO, ambiente: Mapping[str, str] | None = None,
                       sostituzioni: dict | None = None) -> ConfigLaboratorio:
    """Carica laboratorio.json; `sostituzioni` (solo test) cambia chiavi di primo/secondo livello."""
    dati = leggi_json(percorso)
    if sostituzioni:
        for k, v in sostituzioni.items():
            if isinstance(v, dict) and isinstance(dati.get(k), dict):
                dati[k] = {**dati[k], **v}
            else:
                dati[k] = v
    dati = _applica_ambiente(dati, os.environ if ambiente is None else ambiente)
    return ConfigLaboratorio(dati, str(percorso))
