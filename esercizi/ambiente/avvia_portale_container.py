"""Avvio del portale DENTRO il container: come server.py, ma in ascolto su tutte le interfacce del container.

Dentro Docker 127.0.0.1 sarebbe irraggiungibile dal PC; l'esposizione verso l'esterno la decide il
docker-compose (che pubblica la porta solo su 127.0.0.1 del PC di France). Il resto viene da config/.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import uvicorn  # noqa: E402

from corso.app import crea_app  # noqa: E402
from corso.config import carica_config  # noqa: E402

HOST_CONTAINER = "0.0.0.0"  # _why: in ascolto su tutte le interfacce DEL CONTAINER; fuori lo limita il compose


def main() -> int:
    cfg = carica_config()
    porta = cfg.prendi("server", "porta", tipo=int)
    app = crea_app(cfg)
    print(f"Portale nel container sulla porta {porta}; esercizi: {sorted(app.state.esercizi.esercizi)}; "
          f"modello: {os.environ.get('CORSO_LAB_LLM_MODELLO', 'da config')}")
    uvicorn.run(app, host=HOST_CONTAINER, port=porta, log_level=cfg.prendi("server", "livello_log", tipo=str))
    return 0


if __name__ == "__main__":
    sys.exit(main())
