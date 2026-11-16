"""Servizio FINTO-LLM: parla il protocollo di Ollama (e quello compatibile OpenAI) ma risponde da tabelle.

Serve al laboratorio Docker senza GPU: il portale lo chiama esattamente come chiamerebbe Ollama.
Risposte deterministiche (esercizi/finto_llm/tabelle.json), qualunque sia il nome del modello chiesto.
Avvio nel container: uvicorn esercizi.ambiente.finto_llm_servizio:app --host 0.0.0.0 --port 11434
"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel, Field

from esercizi.motore.llm import FintoLLM

RADICE = Path(__file__).resolve().parents[2]
TABELLE = Path(os.environ.get("FINTO_LLM_TABELLE", str(RADICE / "esercizi" / "finto_llm" / "tabelle.json")))
NOME = os.environ.get("FINTO_LLM_NOME", "finto-llm-v1")


class Messaggio(BaseModel):
    role: str
    content: str


class RichiestaChat(BaseModel):
    model: str = NOME
    messages: list[Messaggio]
    stream: bool = False
    options: dict = Field(default_factory=dict)


class RichiestaGenera(BaseModel):
    model: str = NOME
    prompt: str
    system: str = ""
    stream: bool = False


def crea_app(tabelle: Path = TABELLE) -> FastAPI:
    finto = FintoLLM(tabelle, NOME)
    app = FastAPI(title="finto-llm", docs_url=None, redoc_url=None)

    @app.get("/")
    def salute():
        return "Ollama is running"  # stessa risposta di Ollama: gli script di controllo funzionano con entrambi

    @app.get("/api/tags")
    def modelli():
        return {"models": [{"name": NOME, "model": NOME, "details": {"family": "tabelle"}}]}

    @app.post("/api/chat")
    def chat(r: RichiestaChat):
        testo = finto.rispondi([m.model_dump() for m in r.messages])
        return {"model": r.model, "message": {"role": "assistant", "content": testo}, "done": True}

    @app.post("/api/generate")
    def genera(r: RichiestaGenera):
        messaggi = ([{"role": "system", "content": r.system}] if r.system else []) + [{"role": "user", "content": r.prompt}]
        return {"model": r.model, "response": finto.rispondi(messaggi), "done": True}

    @app.post("/v1/chat/completions")
    def openai(r: RichiestaChat):
        testo = finto.rispondi([m.model_dump() for m in r.messages])
        return {"object": "chat.completion", "model": r.model,
                "choices": [{"index": 0, "message": {"role": "assistant", "content": testo}, "finish_reason": "stop"}]}

    return app


app = crea_app()
