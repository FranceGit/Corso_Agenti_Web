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
from .config import RADICE_PROGETTO, Config, carica_config, leggi_json
from .errori import (
    ErroreAccesso, ErroreConfigurazione, ErroreDati, ErroreFlusso, ErroreNonTrovato, TraduzioneMancante,
)
from .lingua import testi_mancanti
from .motore import Motore
from .officina import Cancello, config_officina, vista_livelli
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


CAMPI_OPERA = ("titolo", "autori", "anno", "editore", "tipo", "nota")


def _testo_opera(valore, lingua: str):
    """Un campo di un'opera: stringa/numero cosi' com'e', testo {it, en} nella lingua chiesta (None se manca)."""
    if isinstance(valore, dict) and set(valore) <= {"it", "en"}:
        return valore.get(lingua) or None
    if isinstance(valore, list):
        return ", ".join(str(v) for v in valore if v)
    return valore


def carica_bibliografia(cfg: Config, lingua: str) -> dict:
    """Opere della pagina Bibliografia, SENZA indirizzi web (nessun campo url/link esce dal server).

    File vero: dati/bibliografia.json (cantiere CONTENUTI-REV), come elenco di opere o oggetto {"opere": [...]}.
    Se non c'e' ancora: voci d'esempio di config, dichiarate con esempio = true.
    """
    vero = cfg.percorso_file("bibliografia")
    esempio = not vero.is_file()
    dati = leggi_json(cfg.percorso_file("bibliografia_esempio") if esempio else vero)
    opere_grezze = dati.get("opere") if isinstance(dati, dict) else dati
    if not isinstance(opere_grezze, list):
        raise ErroreDati(f"bibliografia: atteso un elenco di opere (o {{\"opere\": [...]}}) in {vero}")
    opere = []
    for i, o in enumerate(opere_grezze):
        if isinstance(o, str):
            o = {"titolo": o}
        if not isinstance(o, dict):
            raise ErroreDati(f"bibliografia: l'opera {i} non e' un oggetto")
        voce = {k: _testo_opera(o[k], lingua) for k in CAMPI_OPERA if o.get(k) not in (None, "", [])}
        if not voce.get("titolo"):
            continue  # titolo assente nella lingua chiesta: la voce non si mostra (mai l'altra lingua al suo posto)
        voce["id"] = str(o.get("id", i + 1))
        opere.append(voce)
    return {"esempio": esempio, "opere": opere}


def crea_app(cfg: Config | None = None, orologio: Callable[[], datetime] = orologio_utc,
             cartella_stato: Path | None = None, cartella_esercizi: Path | None = None) -> FastAPI:
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

    @app.get("/api/lingue")
    def api_lingue():
        return {"lingue": cfg.lingue(), "predefinita": cfg.prendi("lingue", "predefinita", tipo=str)}

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
        if getattr(app.state, "motore_officina", None) is not None:
            # stato dell'Officina creato qui, una volta sola: la prima apertura fa richieste in parallelo
            # (stato + percorso) e due creazioni simultanee dello stesso file si scontrerebbero
            app.state.motore_officina.stato(email)
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
        componenti = {lez.componente for lez in catalogo.tutte_le_lezioni()}
        if getattr(app.state, "catalogo_officina", None) is not None:
            componenti |= {lez.componente for lez in app.state.catalogo_officina.tutte_le_lezioni()}
        if nome not in componenti:
            raise ErroreNonTrovato(f"animazione '{nome}' inesistente")
        return FileResponse(cartella_anim / f"{nome}.js", media_type="text/javascript")

    def monta_percorso(base: str, motore: Motore, catalogo: Catalogo, chi: Callable) -> None:
        """Rotte del percorso (stato, pillole, spicchi, quiz, debriefing, riepilogo) di UN livello.

        Livello 1 su /api (indirizzi storici invariati), Officina su /api/officina con la dipendenza del cancello.
        """
        @app.get(f"{base}/stato")
        def api_stato(lingua: str = Depends(lingua_valida), email: str = Depends(chi)):
            return motore.riepilogo(email, lingua)

        @app.get(f"{base}/percorso")
        def api_percorso(lingua: str = Depends(lingua_valida), email: str = Depends(chi)):
            return motore.vista_percorso(email, lingua)

        @app.post(f"{base}/percorso/ricomincia")
        def api_ricomincia(email: str = Depends(chi)):
            return motore.ricomincia(email)

        @app.get(f"{base}/pillole/{{pid}}")
        def api_pillola(pid: str, lingua: str = Depends(lingua_valida), email: str = Depends(chi)):
            return motore.contenuto_pillola(email, pid, lingua)

        @app.post(f"{base}/spicchi/{{pid}}/inizia")
        def api_inizia(pid: str, email: str = Depends(chi)):
            return motore.inizia_spicchio(email, pid)

        @app.get(f"{base}/spicchi/{{pid}}/domanda")
        def api_domanda(pid: str, lingua: str = Depends(lingua_valida), email: str = Depends(chi)):
            return motore.domanda_spicchio(email, pid, lingua)

        @app.post(f"{base}/risposta")
        def api_risposta(dati: Risposta, lingua: str = Depends(lingua_valida), email: str = Depends(chi)):
            return motore.rispondi(email, dati.posizione, lingua)

        @app.get(f"{base}/debriefing")
        def api_debriefing(email: str = Depends(chi)):
            return motore.info_debriefing(email)

        @app.post(f"{base}/debriefing/inizia")
        def api_debriefing_inizia(email: str = Depends(chi)):
            return motore.inizia_debriefing(email)

        @app.get(f"{base}/debriefing/domanda")
        def api_debriefing_domanda(lingua: str = Depends(lingua_valida), email: str = Depends(chi)):
            return motore.domanda_debriefing(email, lingua)

        @app.post(f"{base}/debriefing/concludi")
        def api_debriefing_concludi(email: str = Depends(chi)):
            return motore.concludi_debriefing(email)

        @app.get(f"{base}/rapporto")
        def api_rapporto(email: str = Depends(chi)):
            return catalogo.rapporto()

        # -------------------------------------------------------- collaudo alpha, riepilogo (ALPHA-FIX)

        @app.get(f"{base}/spicchi/{{pid}}/rivedi/{{indice}}")
        def api_rivedi(pid: str, indice: int, lingua: str = Depends(lingua_valida), email: str = Depends(chi)):
            return motore.rivedi_risposta(email, pid, indice, lingua)

        @app.get(f"{base}/spicchi/{{pid}}/riepilogo")
        def api_riepilogo(pid: str, lingua: str = Depends(lingua_valida), email: str = Depends(chi)):
            return motore.riepilogo_spicchio(email, pid, lingua)

        @app.post(f"{base}/spicchi/{{pid}}/assumi_superato")
        def api_assumi_superato(pid: str, email: str = Depends(chi)):
            return motore.assumi_superato(email, pid)

    monta_percorso("/api", motore, catalogo, studente)

    # ------------------------------------------------------------ livello 2 «Officina» (corso/officina.py)

    officina_attiva = cfg.prendi("officina", "attiva", tipo=bool)
    if officina_attiva:
        catalogo_l2 = Catalogo(config_officina(cfg))
        stato_l2 = cartella_stato.with_name(cartella_stato.name + "_officina") if cartella_stato else RADICE_PROGETTO / cfg.prendi("officina", "cartella_stato", tipo=str)
        motore_l2 = Motore(catalogo_l2, Archivio(stato_l2), orologio)
        cancello = Cancello(cfg, motore)
        app.state.catalogo_officina = catalogo_l2
        app.state.motore_officina = motore_l2
        app.state.cancello_officina = cancello

        def studente_officina(request: Request) -> str:
            return cancello.verifica(studente(request))

        monta_percorso("/api/officina", motore_l2, catalogo_l2, studente_officina)

    @app.get("/api/livelli")
    def api_livelli(lingua: str = Depends(lingua_valida), email: str = Depends(studente)):
        if not officina_attiva:
            return {"livelli": [{"numero": 1, "titolo": catalogo.corso.titolo.model_dump()[lingua], "sbloccato": True}]}
        return vista_livelli(cfg, catalogo, catalogo_l2, cancello, email, lingua)

    # ------------------------------------------------------------ bibliografia (ALPHA-FIX)

    @app.get("/api/bibliografia")
    def api_bibliografia(lingua: str = Depends(lingua_valida), email: str = Depends(studente)):
        return carica_bibliografia(cfg, lingua)

    # ------------------------------------------------------------ esercizi pratici (cantiere esercizi/)

    if cfg.prendi("esercizi", "attivi", tipo=bool):
        from esercizi.motore.portale import monta_esercizi
        monta_esercizi(app, cfg, studente, lingua_valida, orologio,
                       cartella_esercizi or (cartella_stato / "esercizi" if cartella_stato else None))
        if officina_attiva:
            # esercizi dell'Officina (7-12): stesso motore e stessa pagina, laboratorio e stato propri, dietro il cancello
            base = cartella_esercizi or (cartella_stato / "esercizi" if cartella_stato else None)
            app.state.esercizi_officina = monta_esercizi(
                app, cfg, studente_officina, lingua_valida, orologio, (base / "officina") if base else None,
                prefisso="/api/officina/esercizi", file_laboratorio=cfg.prendi("officina", "file_laboratorio", tipo=str),
                con_pagina=False, attributo_stato="esercizi_officina")

    return app
