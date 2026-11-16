"""CRM minimo dell'Officina (O1): un elenco di lead salvato in /app/dati/lead.json.

Serve solo a vedere Docker da vicino: se /app/dati non sta in un volume, i lead spariscono con il container.
Avvio nel container: uvicorn app:app --host 0.0.0.0 --port 8000
"""
import json
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel

DATI = Path("/app/dati/lead.json")
app = FastAPI(title="CRM minimo dell'Officina")


class Lead(BaseModel):
    nome: str
    email: str
    azienda: str


def _leggi() -> list[dict]:
    return json.loads(DATI.read_text(encoding="utf-8")) if DATI.is_file() else []


@app.get("/salute")
def salute():
    return {"ok": True}


@app.get("/lead")
def elenco():
    return _leggi()


@app.post("/lead")
def aggiungi(lead: Lead):
    lead_salvati = _leggi() + [lead.model_dump()]
    DATI.parent.mkdir(parents=True, exist_ok=True)
    DATI.write_text(json.dumps(lead_salvati, ensure_ascii=False, indent=1), encoding="utf-8")
    return {"totale": len(lead_salvati)}
