"""Ambiente del laboratorio senza Docker: file del compose, script-involucro, CLI e app CRM in sola lettura."""
from __future__ import annotations

import re

from fastapi.testclient import TestClient

from corso.config import RADICE_PROGETTO
from esercizi.ambiente.crm_servizio import crea_app as crea_crm
from esercizi.motore import cli
from esercizi.motore.esecutore import pseudonimo

from .conftest import EMAIL
from .soluzioni import risolvi_e03

AMBIENTE = RADICE_PROGETTO / "esercizi" / "ambiente"


def test_compose_dichiara_i_servizi_e_porte_solo_locali():
    testo = (AMBIENTE / "docker-compose.yml").read_text(encoding="utf-8")
    for servizio in ("portale:", "crm:", "finto-llm:", "mailpit:", "ollama:", "ollama-modello:"):
        assert f"\n  {servizio}" in testo, servizio
    porte = re.findall(r'- "([^"]+:\d+)"', testo)
    assert porte and all(p.startswith("127.0.0.1:") for p in porte), porte
    assert 'profiles: ["ollama"]' in testo
    # ogni variabile CORSO_LAB_* usata dal compose e' fra quelle ammesse dalla configurazione
    import json
    ammesse = json.loads((RADICE_PROGETTO / "esercizi" / "config" / "laboratorio.json").read_text(encoding="utf-8"))["variabili_ambiente"]
    for v in set(re.findall(r"(CORSO_LAB_\w+):", testo)):
        assert v in ammesse, v
    assert (AMBIENTE / "Dockerfile").is_file() and (AMBIENTE / "Dockerfile.dockerignore").is_file()


def test_script_involucro_con_parametri_in_testa():
    for nome in ("avvia_laboratorio", "azzera_laboratorio", "verifica_esercizio"):
        ps = (AMBIENTE / f"{nome}.ps1").read_text(encoding="utf-8")
        sh = (AMBIENTE / f"{nome}.sh").read_text(encoding="utf-8")
        assert "param(" in ps[:2500] and ps.count("# _why") >= 2, nome
        assert sh.startswith("#!/usr/bin/env bash") and "_why" in sh, nome


def test_cli_verifica_ricorreggi_ricomincia(tmp_path, monkeypatch, capsys):
    monkeypatch.setenv("CORSO_LAB_CARTELLA_STATO", str(tmp_path / "stato"))
    assert cli.main(["elenco"]) == 0
    assert "Trova l'errore" in capsys.readouterr().out
    assert cli.main(["verifica", "3", "--studente", EMAIL]) == 1  # stato iniziale: non superato
    out = capsys.readouterr().out
    assert "Voto 0/100" in out and "come rimediare" in out
    assert cli.main(["ricorreggi", "3", "1", "--studente", EMAIL]) == 0
    assert '"identico": true' in capsys.readouterr().out
    assert cli.main(["verifica", "1", "--studente", EMAIL, "--json", "--lingua", "en"]) == 1
    assert '"formato": "verbale-esercizio/1"' in capsys.readouterr().out
    assert cli.main(["ricomincia", "1", "--studente", EMAIL]) == 0
    assert cli.main(["azzera"]) == 2
    assert cli.main(["azzera", "--conferma"]) == 0
    assert not (tmp_path / "stato").exists()


def test_app_crm_docente_in_sola_lettura(motore, cfg_lab):
    risolvi_e03(motore, EMAIL)
    crm = TestClient(crea_crm(cfg_lab.cartella_stato()))
    sid = pseudonimo(EMAIL)
    assert crm.get("/studenti").json()["studenti"] == [{"pseudonimo": sid, "esercizi": [3]}]
    tabelle = crm.get(f"/studenti/{sid}/esercizi/3").json()
    assert len(tabelle["risposte"]) == 15 and len(tabelle["optout"]) == 2
    assert crm.get(f"/studenti/{sid}/esercizi/1").status_code == 404
    assert crm.get("/studenti/..%2F..%2Fetc/esercizi/1").status_code in (400, 404)
    assert all(r.methods <= {"GET", "HEAD"} for r in crea_crm(cfg_lab.cartella_stato()).routes if hasattr(r, "methods"))
