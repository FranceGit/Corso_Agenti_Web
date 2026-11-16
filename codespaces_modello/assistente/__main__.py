"""python -m assistente "domanda" [--config percorso]  — risponde con il backend configurato (predefinito: finto).

Esce con 0 se ha risposto, 2 con un messaggio chiaro se la configurazione o il backend non vanno.
"""
from __future__ import annotations

import argparse
import sys

from . import ErroreAssistente, crea_assistente


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="assistente", description="Assistente libero dell'Officina (finto / ollama / groq)")
    p.add_argument("domanda", nargs="+")
    p.add_argument("--config", default=None, help="percorso di assistente.json (predefinito: quello del pacchetto)")
    a = p.parse_args(argv)
    try:
        assistente = crea_assistente(a.config)
        print(f"[{assistente.nome_backend}] {assistente.chiedi(' '.join(a.domanda))}")
    except ErroreAssistente as e:
        print(f"ERRORE: {e}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
