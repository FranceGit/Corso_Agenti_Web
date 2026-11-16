"""Server del collaudo nel browser simulato: il portale vero, con stato in una cartella temporanea.

Le lezioni sono copiate solo se il loro modulo JS esiste (i cantieri paralleli delle lezioni lasciano a volte
file a meta' lavoro): cosi' il collaudo degli esercizi non dipende dal loro stato intermedio.
Uso: python esercizi/collaudo/server_collaudo.py PORTA CARTELLA_TEMPORANEA
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import uvicorn  # noqa: E402

from corso.app import crea_app  # noqa: E402
from esercizi.tests.conftest import config_portale  # noqa: E402


def main() -> int:
    porta, cartella = int(sys.argv[1]), Path(sys.argv[2])
    cartella.mkdir(parents=True, exist_ok=True)
    app = crea_app(config_portale(cartella), cartella_stato=cartella / "studenti", cartella_esercizi=cartella / "esercizi")
    uvicorn.run(app, host="127.0.0.1", port=porta, log_level="warning")
    return 0


if __name__ == "__main__":
    sys.exit(main())
