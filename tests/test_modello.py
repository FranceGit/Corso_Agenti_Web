"""Modello dati: validazioni, dati estratti, schemi JSON aggiornati."""
from __future__ import annotations

import copy
import json

import pytest
from pydantic import ValidationError

from corso.config import RADICE_PROGETTO
from corso.modello import Corso, KnowledgeGraph, Lezione, Livello, Opzione, Testo
from strumenti.esporta_schema import SCHEMI, testo_schema

DATI = RADICE_PROGETTO / "dati"


def carica(nome):
    return json.loads((DATI / nome).read_text(encoding="utf-8"))


def opz(i, corretta, tipo=None):
    return {"id": i, "testo": {"it": f"opzione {i}", "en": f"option {i}"}, "corretta": corretta, "tipo_distrattore": tipo}


def test_testo_bilingue_e_manca():
    t = Testo(it="ciao", en=None)
    assert t.manca("en") and not t.manca("it")
    with pytest.raises(ValidationError):
        Testo(it="", en="x")
    with pytest.raises(ValidationError):
        Testo(it="a", en="b", fr="c")  # campi extra vietati


def test_opzione_corretta_senza_tipo_distrattore():
    with pytest.raises(ValidationError, match="corretta"):
        Opzione.model_validate(opz("a", True, "quasi"))


def test_livello_una_sola_corretta_e_id_unici():
    Livello.model_validate({"domanda": {"it": "d"}, "opzioni": [opz("a", True), opz("b", False, "poco")]})
    with pytest.raises(ValidationError, match="esattamente 1"):
        Livello.model_validate({"domanda": {"it": "d"}, "opzioni": [opz("a", True), opz("b", True)]})
    with pytest.raises(ValidationError, match="duplicati"):
        Livello.model_validate({"domanda": {"it": "d"}, "opzioni": [opz("a", True), opz("a", False, "poco")]})


def test_corso_estratto_completo():
    c = Corso.model_validate(carica("corso_v1.json"))
    assert len(c.moduli) == 8
    assert len(c.pillole()) == 40
    assert sum(len(p.domande) for p in c.pillole()) == 120
    # dopo l'upgrade il numero di opzioni segue il budget di lettura (3/4/5/7), non piu' il 5+4 del documento
    assert all(len(liv.opzioni) in (3, 4, 5, 7) for p in c.pillole() for d in p.domande for liv in (d.livello1, d.livello2))
    assert c.anello_di("P1.1") == 1 and c.anello_di("P8.6") == 6
    with pytest.raises(KeyError):
        c.pillola("P9.9")
    with pytest.raises(KeyError):
        c.anello_di("P9.9")
    # i testi inglesi lunghi mancano (da completare) tranne le pillole del dimostratore
    assert c.pillola("P1.1").scaletta[0].en is None
    assert c.pillola("P1.3").scaletta[0].en is not None
    assert c.pillola("P1.1").titolo.en == "From chatbot to agent"


def test_corso_rifiuta_duplicati_e_pillola_sbagliata():
    dati = carica("corso_v1.json")
    doppio = copy.deepcopy(dati)
    doppio["moduli"][0]["pillole"].append(copy.deepcopy(doppio["moduli"][0]["pillole"][0]))
    with pytest.raises(ValidationError, match="pillola duplicati"):
        Corso.model_validate(doppio)
    dom = copy.deepcopy(dati)
    dom["moduli"][0]["pillole"][1]["domande"].append(copy.deepcopy(dom["moduli"][0]["pillole"][0]["domande"][0]))
    with pytest.raises(ValidationError, match="domanda duplicati"):
        Corso.model_validate(dom)
    sbagliata = copy.deepcopy(dati)
    sbagliata["moduli"][0]["pillole"][0]["domande"][0]["pillola"] = "P1.2"
    with pytest.raises(ValidationError, match="dichiara pillola"):
        Corso.model_validate(sbagliata)
    principale = copy.deepcopy(dati)
    principale["moduli"][0]["pillole"][0]["domande"][0]["concetto_principale"] = "C99"
    with pytest.raises(ValidationError, match="concetto_principale"):
        Corso.model_validate(principale)


def test_knowledge_graph_79_concetti_archi_pesati():
    kg = KnowledgeGraph.model_validate(carica("knowledge_graph.json"))
    assert len(kg.nodi) == 79
    assert kg.pesi_per_tipo == {"PRE": 3, "CON": 2, "MIT": 2, "APP": 2, "ES": 1}
    assert len(kg.archi) == 128  # 120 righe + la riga "C16, C27, ... PRE C79" espansa in 8 archi
    assert all(a.peso == kg.pesi_per_tipo[a.tipo] for a in kg.archi)
    assert kg.nodo("C07").pillole == ["P1.2", "P2.4"]
    with pytest.raises(KeyError):
        kg.nodo("C99")


def test_knowledge_graph_rifiuta_incoerenze():
    dati = carica("knowledge_graph.json")
    peso = copy.deepcopy(dati)
    peso["archi"][0]["peso"] = 99
    with pytest.raises(ValidationError, match="peso"):
        KnowledgeGraph.model_validate(peso)
    nodo = copy.deepcopy(dati)
    nodo["archi"][0]["a"] = "C98"
    with pytest.raises(ValidationError, match="inesistente"):
        KnowledgeGraph.model_validate(nodo)
    doppio = copy.deepcopy(dati)
    doppio["nodi"].append(copy.deepcopy(doppio["nodi"][0]))
    with pytest.raises(ValidationError, match="duplicati"):
        KnowledgeGraph.model_validate(doppio)


def test_lezioni_valide_e_segmenti_unici():
    for f in (DATI / "lezioni").glob("*.json"):
        lez = Lezione.model_validate(json.loads(f.read_text(encoding="utf-8")))
        assert lez.domande and lez.segmenti
    dati = json.loads((DATI / "lezioni" / "ciclo_agente.json").read_text(encoding="utf-8"))
    dati["segmenti"].append(copy.deepcopy(dati["segmenti"][0]))
    with pytest.raises(ValidationError, match="segmento duplicati"):
        Lezione.model_validate(dati)


@pytest.mark.parametrize("nome", sorted(SCHEMI))
def test_schemi_json_allineati_al_modello(nome):
    su_disco = (RADICE_PROGETTO / "schema" / nome).read_text(encoding="utf-8")
    assert su_disco == testo_schema(SCHEMI[nome]), "schema non aggiornato: lanciare python strumenti/esporta_schema.py"
