"""Avvio del server locale della piattaforma del corso.

Uso (dalla radice del progetto, con l'ambiente virtuale attivo):
    python server.py
Il server NON apre il browser: stampa l'indirizzo da copiare nel browser che preferisci.
Se la porta e' gia' occupata (per esempio da un server rimasto acceso) lo dice e si ferma.
"""
from __future__ import annotations

import socket
import sys

import uvicorn

from corso.app import crea_app
from corso.config import carica_config


def porta_libera(host: str, porta: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind((host, porta))
        except OSError:
            return False
    return True


def main() -> int:
    cfg = carica_config()
    host = cfg.prendi("server", "host", tipo=str)
    porta = cfg.prendi("server", "porta", tipo=int)
    if not porta_libera(host, porta):
        print(f"La porta {porta} su {host} e' gia' occupata: probabilmente un altro server e' ancora acceso.")
        print("Chiudi quella finestra (o cambia server.porta in config/piattaforma.json) e rilancia.")
        return cfg.prendi("server", "codice_uscita_porta_occupata", tipo=int)
    app = crea_app(cfg)
    rapporto = app.state.catalogo.rapporto()
    print(f"Contenuti: {rapporto['pillole']} pillole, {rapporto['concetti']} concetti, "
          f"{rapporto['domande_erogabili']} domande erogabili su {rapporto['domande_totali']}, "
          f"lezioni interattive: {', '.join(rapporto['lezioni_interattive'])}")
    print(f"Apri nel tuo browser: http://{host}:{porta}")
    print("Per fermare il server: Ctrl+C in questa finestra.")
    uvicorn.run(app, host=host, port=porta, log_level=cfg.prendi("server", "livello_log", tipo=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
