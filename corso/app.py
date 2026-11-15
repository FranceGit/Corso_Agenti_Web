"""Server FastAPI: erogazione protetta dei contenuti, account stub, stato dello studente, quiz, percorso.

Regole di protezione:
  - i contenuti (pillole, lezioni, domande) escono SOLO dalle API, dopo l'accesso, con intestazioni no-store;
  - dati/ non e' mai servita come cartella statica; della webapp sono pubblici solo i file della shell
    (index.html, app.js, app.css): i moduli delle animazioni si caricano da /protetto/ con la sessione.
"""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from fastapi import Depends, FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from pydantic import BaseModel

from .account import Sessioni, verifica_credenziali
from .catalogo import Catalogo
from .config import Config, carica_config, leggi_json
from .errori import (
    ErroreAccesso, ErroreConfigurazione, ErroreDati, ErroreFlusso, ErroreNonTrovato, TraduzioneMancante,
)
from .lingua import testi_mancanti
from .motore import Motore
from .stato import Archivio

FILE_SHELL = {"index.html": "text/html", "app.js": "text/javascript", "app.css": "text/css"}


class Accesso(BaseModel):
    email: str
    codice: str


class Risposta(BaseModel):
    posizione: int


def orologio_utc() -> datetime:
    return datetime.now(timezone.utc)


def carica_interfaccia(cfg: Config) -> dict:
    dati = leggi_json(cfg.percorso_file("interfaccia"))
    testi = {k: v for k, v in dati.items() if not k.startswith("_")}
    for lingua in cfg.lingue():
        mancanti = testi_mancanti(testi, lingua)
        if mancanti:
            raise ErroreDati(f"interfaccia: testi senza traduzione '{lingua}': {mancanti}")
    return testi


def crea_app(cfg: Config | None = None, orologio: Callable[[], datetime] = orologio_utc,
             cartella_stato: Path | None = None) -> FastAPI:
    cfg = cfg or carica_config()
    catalogo = Catalogo(cfg)
    archivio = Archivio(cartella_stato or cfg.percorso_file("cartella_stato_studenti"))
    motore = Motore(catalogo, archivio, orologio)
    sessioni = Sessioni(cfg, orologio)
    interfaccia = carica_interfaccia(cfg)
    nome_cookie = cfg.prendi("account", "nome_cookie", tipo=str)
    intestazioni = cfg.prendi("protezione_contenuti", "intestazioni", tipo=dict)
    cartella_webapp = cfg.percorso_file("cartella_webapp")
    cartella_anim = cfg.percorso_file("cartella_animazioni")

    app = FastAPI(title=cfg.prendi("server", "titolo_api", tipo=str), docs_url=None, redoc_url=None, openapi_url=None)
    app.state.motore = motore
    app.state.catalogo = catalogo
    app.state.sessioni = sessioni

    @app.middleware("http")
    async def protezione(request: Request, call_next):
        risposta = await call_next(request)
        for k, v in intestazioni.items():
            risposta.headers[k] = v
        return risposta

    # ------------------------------------------------------------ errori espliciti

    @app.exception_handler(ErroreAccesso)
    async def _accesso(_: Request, e: ErroreAccesso):
        return JSONResponse({"errore": "accesso", "messaggio": str(e)}, status_code=401)

    @app.exception_handler(ErroreFlusso)
    async def _flusso(_: Request, e: ErroreFlusso):
        return JSONResponse({"errore": e.codice, "messaggio": str(e)}, status_code=409)

    @app.exception_handler(TraduzioneMancante)
    async def _traduzione(_: Request, e: TraduzioneMancante):
        return JSONResponse(
            {"errore": "traduzione_mancante", "lingua": e.lingua, "percorsi": e.percorsi, "messaggio": str(e)},
            status_code=409,
        )

    @app.exception_handler(ErroreNonTrovato)
    async def _non_trovato(_: Request, e: ErroreNonTrovato):
        return JSONResponse({"errore": "non_trovato", "messaggio": str(e)}, status_code=404)

    @app.exception_handler(ErroreConfigurazione)
    async def _config(_: Request, e: ErroreConfigurazione):
        return JSONResponse({"errore": "configurazione", "messaggio": str(e)}, status_code=400)

    @app.exception_handler(ErroreDati)
    async def _dati(_: Request, e: ErroreDati):
        return JSONResponse({"errore": "dati", "messaggio": str(e)}, status_code=500)

    # ------------------------------------------------------------ dipendenze

    def studente(request: Request) -> str:
        return sessioni.email_di(request.cookies.get(nome_cookie))

    def lingua_valida(lingua: str) -> str:
        return cfg.verifica_lingua(lingua)

    # ------------------------------------------------------------ shell pubblica

    @app.get("/")
    def pagina():
        return FileResponse(cartella_webapp / "index.html", media_type="text/html")

    @app.get("/shell/{nome}")
    def shell(nome: str):
        if nome not in FILE_SHELL:
            raise ErroreNonTrovato(f"file di shell '{nome}' inesistente")
        return FileResponse(cartella_webapp / nome, media_type=FILE_SHELL[nome])

    @app.get("/api/interfaccia")
    def api_interfaccia(lingua: str = Depends(lingua_valida)):
        return {
            "lingua": lingua,
            "lingue": cfg.lingue(),
            "testi": {k: v[lingua] for k, v in interfaccia.items()},
        }

    # ------------------------------------------------------------ account

    @app.post("/api/accesso")
    def api_accesso(dati: Accesso):
        email = verifica_credenziali(dati.email, dati.codice, cfg)
        motore.stato(email)
        token = sessioni.crea(email)
        risposta = JSONResponse({"email": email})
        risposta.set_cookie(nome_cookie, token, httponly=True, samesite="strict",
                            max_age=int(sessioni.durata.total_seconds()))
        return risposta

    @app.post("/api/uscita")
    def api_uscita(request: Request):
        sessioni.chiudi(request.cookies.get(nome_cookie))
        risposta = JSONResponse({"uscito": True})
        risposta.delete_cookie(nome_cookie)
        return risposta

    # ------------------------------------------------------------ contenuti protetti

    @app.get("/protetto/animazioni/{nome}.js")
    def animazione(nome: str, email: str = Depends(studente)):
        componenti = {lez.componente for lez in catalogo.lezioni.values()}
        if nome not in componenti:
            raise ErroreNonTrovato(f"animazione '{nome}' inesistente")
        return FileResponse(cartella_anim / f"{nome}.js", media_type="text/javascript")

    @app.get("/api/stato")
    def api_stato(lingua: str = Depends(lingua_valida), email: str = Depends(studente)):
        return motore.riepilogo(email, lingua)

    @app.get("/api/percorso")
    def api_percorso(lingua: str = Depends(lingua_valida), email: str = Depends(studente)):
        return motore.vista_percorso(email, lingua)

    @app.post("/api/percorso/ricomincia")
    def api_ricomincia(email: str = Depends(studente)):
        return motore.ricomincia(email)

    @app.get("/api/pillole/{pid}")
    def api_pillola(pid: str, lingua: str = Depends(lingua_valida), email: str = Depends(studente)):
        return motore.contenuto_pillola(email, pid, lingua)

    @app.post("/api/spicchi/{pid}/inizia")
    def api_inizia(pid: str, email: str = Depends(studente)):
        return motore.inizia_spicchio(email, pid)

    @app.get("/api/spicchi/{pid}/domanda")
    def api_domanda(pid: str, lingua: str = Depends(lingua_valida), email: str = Depends(studente)):
        return motore.domanda_spicchio(email, pid, lingua)

    @app.post("/api/risposta")
    def api_risposta(dati: Risposta, lingua: str = Depends(lingua_valida), email: str = Depends(studente)):
        return motore.rispondi(email, dati.posizione, lingua)

    @app.get("/api/debriefing")
    def api_debriefing(email: str = Depends(studente)):
        return motore.info_debriefing(email)

    @app.post("/api/debriefing/inizia")
    def api_debriefing_inizia(email: str = Depends(studente)):
        return motore.inizia_debriefing(email)

    @app.get("/api/debriefing/domanda")
    def api_debriefing_domanda(lingua: str = Depends(lingua_valida), email: str = Depends(studente)):
        return motore.domanda_debriefing(email, lingua)

    @app.post("/api/debriefing/concludi")
    def api_debriefing_concludi(email: str = Depends(studente)):
        return motore.concludi_debriefing(email)

    @app.get("/api/rapporto")
    def api_rapporto(email: str = Depends(studente)):
        return catalogo.rapporto()

    return app
