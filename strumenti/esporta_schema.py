"""Rigenera gli schemi JSON in schema/ dal modello dati (corso/modello.py, unica fonte di verita').

Uso (dalla radice del progetto):
    python strumenti/esporta_schema.py
Un test (tests/test_modello.py) verifica che gli schemi su disco coincidano con il modello.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RADICE))

from corso.modello import Corso, KnowledgeGraph, Lezione  # noqa: E402

SCHEMI = {
    "corso.schema.json": Corso,
    "knowledge_graph.schema.json": KnowledgeGraph,
    "lezione.schema.json": Lezione,
}


def testo_schema(modello) -> str:
    return json.dumps(modello.model_json_schema(), ensure_ascii=False, indent=1, sort_keys=True) + "\n"


def main() -> int:
    cartella = RADICE / "schema"
    cartella.mkdir(exist_ok=True)
    for nome, modello in SCHEMI.items():
        (cartella / nome).write_text(testo_schema(modello), encoding="utf-8")
        print(f"scritto {cartella / nome}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
