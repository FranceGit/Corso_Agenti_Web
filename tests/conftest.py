"""Fixture comuni: configurazione vera, varianti modificate, orologio controllabile, motore e client HTTP."""
from __future__ import annotations

import copy
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from corso.app import crea_app
from corso.catalogo import Catalogo
from corso.config import FILE_CONFIG, Config
from corso.motore import Motore
from corso.stato import Archivio

EMAIL = "studente@esempio.it"


class Orologio:
    """Orologio finto: parte da un istante fisso e si sposta solo quando lo dice il test."""

    def __init__(self):
        self.ora = datetime(2026, 11, 16, 9, 0, tzinfo=timezone.utc)

    def __call__(self) -> datetime:
        return self.ora

    def avanza(self, ore: float) -> None:
        self.ora += timedelta(hours=ore)


@pytest.fixture
def dati_config() -> dict:
    return json.loads(FILE_CONFIG.read_text(encoding="utf-8"))


def config_da(dati: dict) -> Config:
    return Config(copy.deepcopy(dati), "config di prova")


def config_con_corso(dati_config: dict, tmp_path: Path, modifica) -> Config:
    """Config che punta a una copia modificata del corso vero (KG, lezioni e webapp restano quelli veri)."""
    corso = json.loads(config_da(dati_config).percorso_file("corso").read_text(encoding="utf-8"))
    modifica(corso)
    f = tmp_path / "corso_modificato.json"
    f.write_text(json.dumps(corso, ensure_ascii=False), encoding="utf-8")
    dati = copy.deepcopy(dati_config)
    dati["percorsi_file"]["corso"] = str(f)
    return config_da(dati)


def senza_autori(*pillole: str):
    """Modifica del corso: toglie le domande scritte dagli autori (origine 'autori') nelle pillole indicate.

    Riporta quegli spicchi allo stato "in preparazione" di prima delle domande nuove: serve ai test che
    verificano il comportamento con uno spicchio non erogabile, ora che nel corso vero lo sono tutti.
    """
    def modifica(corso: dict) -> None:
        for m in corso["moduli"]:
            for p in m["pillole"]:
                if p["id"] in pillole:
                    p["domande"] = [d for d in p["domande"] if d["origine"] != "autori"]
    return modifica


@pytest.fixture
def cfg(dati_config) -> Config:
    return config_da(dati_config)


@pytest.fixture(scope="session")
def catalogo_vero() -> Catalogo:
    return Catalogo(Config(json.loads(FILE_CONFIG.read_text(encoding="utf-8")), str(FILE_CONFIG)))


@pytest.fixture
def orologio() -> Orologio:
    return Orologio()


@pytest.fixture
def motore(catalogo_vero, tmp_path, orologio) -> Motore:
    return Motore(catalogo_vero, Archivio(tmp_path / "stato"), orologio)


def motore_con(dati_config: dict, tmp_path: Path, orologio, **modifiche) -> Motore:
    """Motore con una configurazione modificata: modifiche = {"sezione.chiave": valore}."""
    dati = copy.deepcopy(dati_config)
    for percorso, valore in modifiche.items():
        nodo = dati
        parti = percorso.split(".")
        for p in parti[:-1]:
            nodo = nodo[p]
        nodo[parti[-1]] = valore
    return Motore(Catalogo(config_da(dati)), Archivio(tmp_path / "stato_mod"), orologio)


def posizione(motore: Motore, email: str, giusta: bool, tipo: str | None = None) -> int:
    """Posizione (1..n) di un'opzione della domanda in corso: la giusta, oppure un distrattore (del tipo dato)."""
    st = motore.stato(email)
    ic = st.in_corso
    d = motore.cat.domanda(ic.domanda)
    liv = d.livello1 if ic.livello == 1 else d.livello2
    per_id = {o.id: o for o in liv.opzioni}
    for i, oid in enumerate(ic.ordine):
        o = per_id[oid]
        if giusta and o.corretta:
            return i + 1
        if not giusta and not o.corretta and (tipo is None or o.tipo_distrattore == tipo):
            return i + 1
    raise AssertionError(f"nessuna opzione {'giusta' if giusta else tipo} nella domanda {d.id}")


def striscia_pulita(motore: Motore, email: str, pid: str, lingua: str = "it") -> dict:
    motore.domanda_spicchio(email, pid, lingua)
    e1 = motore.rispondi(email, posizione(motore, email, True), lingua)
    assert e1["prossimo"] == "livello2"
    return motore.rispondi(email, posizione(motore, email, True), lingua)


@pytest.fixture
def client(tmp_path, orologio) -> TestClient:
    return TestClient(crea_app(cartella_stato=tmp_path / "stato_http", orologio=orologio))


def codice_valido() -> str:
    return json.loads(FILE_CONFIG.read_text(encoding="utf-8"))["account"]["codici_stub"][0]


@pytest.fixture
def client_dentro(client) -> TestClient:
    r = client.post("/api/accesso", json={"email": EMAIL, "codice": codice_valido()})
    assert r.status_code == 200
    return client


def client_dentro_con(cfg: Config, tmp_path: Path, orologio) -> TestClient:
    """Client gia' entrato, su un'app costruita con una configurazione data (es. un corso modificato)."""
    c = TestClient(crea_app(cfg=cfg, cartella_stato=tmp_path / "stato_http_mod", orologio=orologio))
    assert c.post("/api/accesso", json={"email": EMAIL, "codice": codice_valido()}).status_code == 200
    return c
