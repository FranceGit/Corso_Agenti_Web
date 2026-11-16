"""Aggancio degli esercizi al server del portale: API protette (stessa sessione del resto) e moduli della pagina.

Tutte le rotte richiedono l'accesso (dipendenza `studente` del portale). La chiave di correzione e i dati
nascosti non escono mai: le API danno solo consegna, area di lavoro, esito delle azioni e verbale.
"""
from __future__ import annotations

from pathlib import Path
from typing import Callable

from fastapi import Depends, FastAPI
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from corso.config import RADICE_PROGETTO, leggi_json
from corso.errori import ErroreDati, ErroreNonTrovato
from corso.lingua import testi_mancanti

from .configurazione import carica_laboratorio
from .esecutore import MotoreEsercizi

FILE_PAGINA = {"esercizi.js": "text/javascript", "esercizi.css": "text/css"}
CARTELLA_PAGINA = RADICE_PROGETTO / "esercizi" / "webapp"


class Azione(BaseModel):
    nome: str = Field(max_length=40)
    parametri: dict = Field(default_factory=dict)


def carica_testi(percorso: Path, lingue: list[str]) -> dict:
    dati = {k: v for k, v in leggi_json(percorso).items() if not k.startswith("_")}
    for lingua in lingue:
        mancanti = testi_mancanti(dati, lingua)
        if mancanti:
            raise ErroreDati(f"interfaccia esercizi: testi senza traduzione '{lingua}': {mancanti}")
    return dati


def monta_esercizi(app: FastAPI, cfg, studente: Callable, lingua_valida: Callable, orologio: Callable,
                   cartella_stato: Path | None = None, *, prefisso: str = "/api/esercizi",
                   file_laboratorio: str | None = None, con_pagina: bool = True,
                   attributo_stato: str = "esercizi") -> MotoreEsercizi:
    """Monta un laboratorio di esercizi sotto `prefisso`.

    Livello 1: /api/esercizi con esercizi/config/laboratorio.json (indirizzi storici). Officina: /api/officina/esercizi
    con il suo laboratorio e la dipendenza `studente` del cancello; la pagina JS (/protetto/esercizi/*) e' una sola.
    """
    sostituzioni = {"cartella_stato": str(cartella_stato)} if cartella_stato else None
    file_lab = file_laboratorio or cfg.prendi("esercizi", "file_laboratorio", tipo=str)
    cfg_lab = carica_laboratorio(RADICE_PROGETTO / file_lab, sostituzioni=sostituzioni)
    motore = MotoreEsercizi(cfg_lab, orologio)
    testi = carica_testi(RADICE_PROGETTO / cfg.prendi("esercizi", "file_interfaccia", tipo=str), cfg.lingue())
    setattr(app.state, attributo_stato, motore)

    if con_pagina:
        @app.get("/protetto/esercizi/{nome}")
        def pagina_esercizi(nome: str, email: str = Depends(studente)):
            if nome not in FILE_PAGINA:
                raise ErroreNonTrovato(f"file '{nome}' inesistente")
            return FileResponse(CARTELLA_PAGINA / nome, media_type=FILE_PAGINA[nome])

    @app.get(prefisso)
    def api_esercizi(lingua: str = Depends(lingua_valida), email: str = Depends(studente)):
        return {"esercizi": motore.elenco(email, lingua), "testi": {k: v[lingua] for k, v in testi.items()}}

    @app.get(f"{prefisso}/{{numero}}")
    def api_esercizio(numero: int, lingua: str = Depends(lingua_valida), email: str = Depends(studente)):
        return motore.scheda(email, numero, lingua)

    @app.post(f"{prefisso}/{{numero}}/azione")
    def api_azione(numero: int, dati: Azione, lingua: str = Depends(lingua_valida), email: str = Depends(studente)):
        return motore.azione(email, numero, dati.nome, dati.parametri, lingua)

    @app.post(f"{prefisso}/{{numero}}/verifica")
    def api_verifica(numero: int, email: str = Depends(studente)):
        return motore.verifica(email, numero)

    @app.post(f"{prefisso}/{{numero}}/ricomincia")
    def api_ricomincia(numero: int, lingua: str = Depends(lingua_valida), email: str = Depends(studente)):
        motore.ricomincia(email, numero)
        return motore.scheda(email, numero, lingua)

    @app.get(f"{prefisso}/{{numero}}/tentativi")
    def api_tentativi(numero: int, email: str = Depends(studente)):
        return {"tentativi": motore.tentativi(email, numero)}

    @app.get(f"{prefisso}/{{numero}}/tentativi/{{k}}")
    def api_verbale(numero: int, k: int, email: str = Depends(studente)):
        return motore.verbale(email, numero, k)

    @app.post(f"{prefisso}/{{numero}}/tentativi/{{k}}/ricorreggi")
    def api_ricorreggi(numero: int, k: int, email: str = Depends(studente)):
        return motore.ricorreggi(email, numero, k)

    return motore
