"""Estrattore del corso: documento sintetico (tutti i casi del formato) e, se disponibile, il documento vero.

Il documento vero sta fuori dal repository: il test di riproducibilita' gira solo se la variabile d'ambiente
CORSO_BENCHMARK_MD ne indica il percorso (collaudo.ps1 la imposta), altrimenti viene saltato dichiarandolo.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

import strumenti.esporta_schema as esporta
import strumenti.estrai_corso as ec
from corso.config import RADICE_PROGETTO

PILLOLA = """#### P1.{n} Titolo {n}
- **Durata:** 5 min · **Prerequisiti:** {pre} · **Nodi:** {nodi} · **Fonti:** [G1], [EXP]
- **Obiettivo:** capire *bene* la cosa {n}.
- **Scaletta:**
  1. Primo **punto**.
     - sotto-punto
  2. Secondo punto
     che continua a capo.

  Nota finale non numerata.
- **Animazione: "Anim {n}".**
  - **Cosa si vede:** qualcosa.
- **Verifica:**
  - **D1.{n}-a** [L1] Domanda uno?
    - A) alfa
    - B) beta
    - **Corretta: B**
    - [L2 · motivazione] Perche'?
      - a) uno
      - b) due
      - **Corretta: a** · *Perché:* spiegazione.
  - **D1.{n}-b** [L1] Domanda due?
    - A) alfa
    - B) beta
    - **Corretta: A**
    - [L2 · diagnosi] Diagnosi?
      - a) uno
      - b) due
      - **Corretta: b**
"""

DOCUMENTO = """# CORSO BENCHMARK: "Corso di prova"

## 2. Programma

### 2.0 Panoramica

| Modulo | Titolo | Pillole | Anello (versione gamificata) |
|---|---|---|---|
| M1 | Fondamenti | P1.1-P1.2 | Anello 1 (esterno) |

### MODULO 1: Fondamenti

{p1}
{p2}
---

## 3. Domande di verifica

## 4. Knowledge graph

### 4.1 Nodi (concetti)
| ID | Concetto | Pillola | Anello |
|---|---|---|---|
| C01 | Uno | P1.1 | 1 |
| C02 | Due | P1.1, P1.2 | 1 |
| C03 | Tre | P1.2 | 1 |

### 4.2 Collegamenti (archi tipizzati)
| Da | Rel. | A | Nota |
|---|---|---|---|
| C01 | CON | C02 | testo vs azione |
| C01, C02 | PRE | C03 | |

### 4.3 Dal grafo agli anelli
Peso suggerito degli archi: PRE 3, CON 2, MIT 2, APP 2, ES 1. Fine.
"""


def documento(**sostituzioni) -> str:
    p1 = PILLOLA.format(n=1, pre="nessuno", nodi="C01, C02")
    p2 = PILLOLA.format(n=2, pre="tutte le pillole dei moduli 1-1 (in particolare P1.1)", nodi="C02 (nota), C03")
    testo = DOCUMENTO.format(p1=p1, p2=p2)
    for vecchio, nuovo in sostituzioni.items():
        testo = testo.replace(vecchio, nuovo)
    return testo


@pytest.fixture
def senza_traduzioni(monkeypatch, tmp_path):
    vuoto = tmp_path / "trad.json"
    vuoto.write_text("{}", encoding="utf-8")
    monkeypatch.setattr(ec, "FILE_TRADUZIONI_PILLOLE", vuoto)


def test_documento_sintetico_tutti_i_casi(tmp_path, senza_traduzioni):
    md = tmp_path / "corso.md"
    md.write_text(documento(), encoding="utf-8")
    corso, kg = ec.estrai(md)
    p1, p2 = corso["moduli"][0]["pillole"]
    assert corso["titolo"]["it"] == "Corso di prova" and corso["moduli"][0]["anello"] == 1
    assert p1["obiettivo"]["it"] == "capire bene la cosa 1."
    assert [s["it"] for s in p1["scaletta"]] == ["Primo punto.\n- sotto-punto", "Secondo punto\nche continua a capo.", "Nota finale non numerata."]
    assert p1["animazione"]["titolo"]["it"] == "Anim 1" and "Cosa si vede" in p1["animazione"]["progetto"]["it"]
    assert p2["prerequisiti"] == ["P1.1"] and p2["concetti"] == ["C02", "C03"]
    d = p1["domande"]
    assert [o["corretta"] for o in d[0]["livello1"]["opzioni"]] == [False, True]
    assert d[0]["livello2"]["perche"]["it"] == "spiegazione." and d[1]["livello2"]["perche"] is None
    assert d[1]["livello2"]["tipo"] == "diagnosi"
    assert all(o["tipo_distrattore"] is None for o in d[0]["livello1"]["opzioni"])  # mai inventati
    assert kg["pesi_per_tipo"] == {"PRE": 3, "CON": 2, "MIT": 2, "APP": 2, "ES": 1}
    assert [(a["da"], a["tipo"], a["a"]) for a in kg["archi"]] == [("C01", "CON", "C02"), ("C01", "PRE", "C03"), ("C02", "PRE", "C03")]
    assert kg["archi"][1]["nota"] is None and kg["nodi"][1]["pillole"] == ["P1.1", "P1.2"]


def test_marcature_delle_correzioni_tolte_dai_testi(tmp_path, senza_traduzioni):
    """Le correzioni del documento portano "[corretto — fonte verificata: ...]": la marcatura serve al lettore del
    documento, non entra nei testi del corso e non cambia l'impronta delle domande (16/11/2026)."""
    assert ec.pulisci("Si parte dall'1% degli utenti. [corretto — fonte verificata: WP5 p.16]") == "Si parte dall'1% degli utenti."
    assert ec.pulisci("prima [corretto — fonte verificata] dopo") == "prima dopo"
    md = tmp_path / "corso.md"
    pulito = documento()
    marcato = documento(**{"capire *bene* la cosa 1.": "capire *bene* la cosa 1. [corretto — fonte verificata: X p.1]"})
    assert marcato != pulito
    md.write_text(marcato, encoding="utf-8")
    corso_marcato, _ = ec.estrai(md)
    md.write_text(pulito, encoding="utf-8")
    corso_pulito, _ = ec.estrai(md)
    assert corso_marcato == corso_pulito
    assert "corretto" not in json.dumps(corso_marcato, ensure_ascii=False)


@pytest.mark.parametrize("vecchio, nuovo, messaggio", [
    ("    - **Corretta: B**", "    - **Corretta: G**", "non presente"),
    ("    - B) beta\n    - **Corretta: B**", "    - B) beta\n    ? riga strana\n    - **Corretta: B**", "non riconosciuta"),
    ("- **Obiettivo:** capire *bene* la cosa 1.", "", "obiettivo"),
    ("  Nota finale non numerata.", "\tstrana", "scaletta"),
    ("Peso suggerito degli archi", "Pesi", "pesi degli archi"),
    ('- **Animazione: "Anim 1".**', "- **Animazione: senza virgolette**", "titolo dell'animazione"),
    ("| M1 | Fondamenti | P1.1-P1.2 | Anello 1 (esterno) |", "| M1 | Fondamenti | P1.1-P1.2 | Cerchio 1 |", "anello non riconosciuto"),
    ("**Prerequisiti:** nessuno", "**Prerequisiti:** la prima", "prerequisito non riconosciuto"),
    ("- **Durata:** 5 min · **Prerequisiti:** nessuno", "- **Durata:** cinque minuti · **Prerequisiti:** nessuno", "Durata"),
])
def test_formati_non_riconosciuti_fermano_l_estrazione(tmp_path, senza_traduzioni, vecchio, nuovo, messaggio):
    md = tmp_path / "corso.md"
    md.write_text(documento(**{vecchio: nuovo}), encoding="utf-8")
    with pytest.raises((ec.ErroreEstrazione, StopIteration, Exception), match=messaggio):
        ec.estrai(md)


def test_sezione_mancante_e_riga_prima_della_domanda():
    with pytest.raises(ec.ErroreEstrazione, match="non trovata"):
        ec.sezione(["#### P1.1 X", "- **Obiettivo:** y"], "Scaletta:")
    with pytest.raises(ec.ErroreEstrazione, match="prima della prima domanda"):
        ec.estrai_domande("P1.1", ["#### P1.1 X", "- **Verifica:**", "    - A) orfana"], ["C01"])
    with pytest.raises(ec.ErroreEstrazione, match="scaletta vuota"):
        ec.estrai_scaletta(["#### P1.1 X", "- **Scaletta:**", "- **Animazione: \"a\".**"])


def test_traduzioni_applicate_e_controllate(senza_traduzioni):
    corso = {"moduli": [{"pillole": [{"id": "P1.1", "obiettivo": {"it": "o", "en": None}, "scaletta": [{"it": "s", "en": None}],
                                     "animazione": {"progetto": {"it": "p", "en": None}}}]}]}
    ec.applica_traduzioni_pillole(corso, {"_why": "x", "P1.1": {"obiettivo": "O", "scaletta": ["S"], "animazione": "P"}})
    p = corso["moduli"][0]["pillole"][0]
    assert (p["obiettivo"]["en"], p["scaletta"][0]["en"], p["animazione"]["progetto"]["en"]) == ("O", "S", "P")
    with pytest.raises(ec.ErroreEstrazione, match="voci di scaletta"):
        ec.applica_traduzioni_pillole(corso, {"P1.1": {"obiettivo": "O", "scaletta": ["S", "T"], "animazione": "P"}})
    with pytest.raises(ec.ErroreEstrazione, match="inesistente"):
        ec.applica_traduzioni_pillole(corso, {"P9.9": {"obiettivo": "O", "scaletta": [], "animazione": "P"}})


def test_main_scrive_i_due_file(tmp_path, monkeypatch, senza_traduzioni, capsys):
    md = tmp_path / "corso.md"
    md.write_text(documento(), encoding="utf-8")
    monkeypatch.setattr(ec, "USCITA_CORSO", tmp_path / "out" / "corso.json")
    monkeypatch.setattr(ec, "USCITA_KG", tmp_path / "out" / "kg.json")
    assert ec.main(["x", str(md)]) == 0
    assert json.loads((tmp_path / "out" / "corso.json").read_text(encoding="utf-8"))["id"] == "corso_agenti_crm_v1"
    assert "2 pillole" in capsys.readouterr().out
    assert ec.main(["x"]) == 2


def test_esporta_schema_main(tmp_path, monkeypatch):
    monkeypatch.setattr(esporta, "RADICE", tmp_path)
    assert esporta.main() == 0
    assert sorted(p.name for p in (tmp_path / "schema").iterdir()) == sorted(esporta.SCHEMI)


DOC_VERO = os.environ.get("CORSO_BENCHMARK_MD")


@pytest.mark.skipif(not DOC_VERO, reason="CORSO_BENCHMARK_MD non impostata: documento benchmark fuori dal repository")
def test_estrazione_del_documento_vero_riproducibile():
    """Moduli, pillole e KG si riestraggono identici; le domande vivono nel JSON (fonte di verita' dall'upgrade)
    e il documento resta la loro origine storica: si verifica che corrispondano ancora all'origine."""
    corso, kg = ec.estrai(Path(DOC_VERO))
    su_disco_corso = json.loads((RADICE_PROGETTO / "dati" / "corso_v1.json").read_text(encoding="utf-8"))
    su_disco_kg = json.loads((RADICE_PROGETTO / "dati" / "knowledge_graph.json").read_text(encoding="utf-8"))
    unito = ec.conserva_domande(json.loads(json.dumps(corso)), su_disco_corso)
    assert unito == su_disco_corso, "dati/corso_v1.json non corrisponde al documento: rilanciare l'estrattore"
    assert kg == su_disco_kg
