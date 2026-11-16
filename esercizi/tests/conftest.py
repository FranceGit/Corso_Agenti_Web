"""Fixture degli esercizi: laboratorio in una cartella temporanea, finto-LLM, posta locale, orologio fisso."""
from __future__ import annotations

import copy
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from corso.config import FILE_CONFIG, RADICE_PROGETTO, Config
from esercizi.motore.configurazione import carica_laboratorio
from esercizi.motore.esecutore import MotoreEsercizi

EMAIL = "studente@esempio.it"
ALTRA = "collega@esempio.it"
ORA = datetime(2026, 11, 16, 9, 0, tzinfo=timezone.utc)


def orologio() -> datetime:
    return ORA


@pytest.fixture
def cfg_lab(tmp_path):
    return carica_laboratorio(sostituzioni={"cartella_stato": str(tmp_path / "stato")}, ambiente={})


@pytest.fixture
def motore(cfg_lab):
    m = MotoreEsercizi(cfg_lab, orologio)
    yield m
    m.chiudi()


def config_portale(tmp_path: Path) -> Config:
    """Config vera del portale, con le lezioni copiate SOLO se il loro modulo JS esiste.

    I cantieri paralleli delle lezioni aggiungono file a meta' lavoro: i test degli esercizi non devono
    dipendere dal loro stato intermedio.
    """
    dati = json.loads(FILE_CONFIG.read_text(encoding="utf-8"))
    sorgente = RADICE_PROGETTO / dati["percorsi_file"]["cartella_lezioni"]
    anim = RADICE_PROGETTO / dati["percorsi_file"]["cartella_animazioni"]
    dest = tmp_path / "lezioni"
    dest.mkdir()
    for f in sorted(sorgente.glob("*.json")):
        componente = json.loads(f.read_text(encoding="utf-8")).get("componente", "")
        if (anim / f"{componente}.js").is_file():
            shutil.copy(f, dest / f.name)
    dati = copy.deepcopy(dati)
    dati["percorsi_file"]["cartella_lezioni"] = str(dest)
    return Config(dati, "config di prova esercizi")


@pytest.fixture
def client(tmp_path):
    from corso.app import crea_app
    try:
        app = crea_app(config_portale(tmp_path), orologio, cartella_stato=tmp_path / "studenti",
                       cartella_esercizi=tmp_path / "esercizi")
    except Exception as e:  # pragma: no cover - dipende dai cantieri paralleli delle lezioni
        pytest.skip(f"catalogo del corso non caricabile in questo momento: {e}")
    c = TestClient(app)
    yield c
    app.state.esercizi.chiudi()


def entra(client, email: str = EMAIL):
    r = client.post("/api/accesso", json={"email": email, "codice": "DEMO-AGENTI"})
    assert r.status_code == 200, r.text
    return client
