"""App CRM didattica (vista del docente): FastAPI in sola lettura sui database SQLite degli studenti.

Gli studenti lavorano dal portale (pagina Esercizi); questa app serve al docente per guardare dentro i CRM:
elenco degli studenti (pseudonimi), tabelle di un esercizio, posta finta locale. Nel docker-compose e'
pubblicata solo su 127.0.0.1 (il PC del docente). Nessuna scrittura.
Avvio: uvicorn esercizi.ambiente.crm_servizio:app --host 0.0.0.0 --port 8790
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

from fastapi import FastAPI, HTTPException

from esercizi.motore.configurazione import carica_laboratorio

TABELLE = ["aziende", "contatti", "attivita", "optout", "campagne", "risposte", "impostazioni", "registro_audit"]


def crea_app(cartella: Path | None = None) -> FastAPI:
    radice = cartella or carica_laboratorio().cartella_stato()
    app = FastAPI(title="CRM didattico (sola lettura)", docs_url=None, redoc_url=None)

    def apri(sid: str, numero: int) -> sqlite3.Connection:
        if not sid.isalnum():
            raise HTTPException(400, "pseudonimo non valido")
        f = radice / "studenti" / sid / f"e{numero:02d}.sqlite"
        if not f.is_file():
            raise HTTPException(404, "CRM inesistente per questo studente ed esercizio")
        db = sqlite3.connect(f"file:{f}?mode=ro", uri=True)
        db.row_factory = sqlite3.Row
        return db

    @app.get("/")
    def salute():
        return {"servizio": "crm-didattico", "cartella": str(radice)}

    @app.get("/studenti")
    def studenti():
        base = radice / "studenti"
        if not base.is_dir():
            return {"studenti": []}
        return {"studenti": [{"pseudonimo": d.name, "esercizi": sorted(int(f.stem[1:]) for f in d.glob("e*.sqlite"))}
                             for d in sorted(base.iterdir()) if d.is_dir()]}

    @app.get("/studenti/{sid}/esercizi/{numero}")
    def crm(sid: str, numero: int):
        db = apri(sid, numero)
        try:
            return {t: [dict(r) for r in db.execute(f"SELECT * FROM {t} ORDER BY 1")] for t in TABELLE}
        finally:
            db.close()

    return app


app = crea_app()
