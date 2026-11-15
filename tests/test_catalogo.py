"""Catalogo: incroci fra corso, knowledge graph e lezioni; erogabilita' dichiarata; lingua; configurazione."""
from __future__ import annotations

import copy
import json

import pytest

from corso.catalogo import Catalogo
from corso.config import RADICE_PROGETTO, Config, carica_config, leggi_json
from corso.errori import ErroreConfigurazione, ErroreDati, ErroreNonTrovato, TraduzioneMancante
from corso.lingua import risolvi, testi_mancanti
from corso.modello import Testo
from tests.conftest import config_da

DATI = RADICE_PROGETTO / "dati"


def test_rapporto_erogabilita(catalogo_vero):
    r = catalogo_vero.rapporto()
    assert r["pillole"] == 40 and r["concetti"] == 79 and r["archi"] == 128
    assert r["lezioni_interattive"] == ["P1.3", "P4.1"]
    assert r["domande_totali"] == 131
    assert r["domande_erogabili"] == 11  # tutte e sole le domande del dimostratore
    assert r["motivi_non_erogabile"]["concetto principale non assegnato"] == 120
    for d in catalogo_vero.domande_erogabili("P1.3") + catalogo_vero.domande_erogabili("P4.1"):
        assert d.origine == "dimostratore"


def test_domande_benchmark_non_erogabili_con_motivi_espliciti(catalogo_vero):
    motivi = catalogo_vero.motivi_non_erogabile["D1.1-a"]
    testo = " | ".join(motivi)
    assert "distrattori senza tipo" in testo
    assert "concetto principale non assegnato" in testo
    assert "segmento di aiuto" in testo
    assert "traduzione 'en'" in testo
    assert not catalogo_vero.erogabile("D1.1-a")
    assert catalogo_vero.erogabile("DX1.3-1")


def test_identificativi_inesistenti(catalogo_vero):
    with pytest.raises(ErroreNonTrovato):
        catalogo_vero.domanda("ZZZ")
    with pytest.raises(ErroreNonTrovato):
        catalogo_vero.pillola("P9.9")


def copia_dati(tmp_path, dati_config, modifica_corso=None, modifica_kg=None, modifica_lezione=None, componente_assente=False):
    """Copia corso, KG e lezioni in tmp_path applicando modifiche, e restituisce una Config che li punta."""
    corso = json.loads((DATI / "corso_v1.json").read_text(encoding="utf-8"))
    kg = json.loads((DATI / "knowledge_graph.json").read_text(encoding="utf-8"))
    lez = json.loads((DATI / "lezioni" / "ciclo_agente.json").read_text(encoding="utf-8"))
    for f, d in ((modifica_corso, corso), (modifica_kg, kg), (modifica_lezione, lez)):
        if f:
            f(d)
    (tmp_path / "lezioni").mkdir()
    (tmp_path / "corso.json").write_text(json.dumps(corso, ensure_ascii=False), encoding="utf-8")
    (tmp_path / "kg.json").write_text(json.dumps(kg, ensure_ascii=False), encoding="utf-8")
    (tmp_path / "lezioni" / "a.json").write_text(json.dumps(lez, ensure_ascii=False), encoding="utf-8")
    dati = copy.deepcopy(dati_config)
    dati["percorsi_file"]["corso"] = str(tmp_path / "corso.json")
    dati["percorsi_file"]["knowledge_graph"] = str(tmp_path / "kg.json")
    dati["percorsi_file"]["cartella_lezioni"] = str(tmp_path / "lezioni")
    if componente_assente:
        dati["percorsi_file"]["cartella_animazioni"] = str(tmp_path)
    return config_da(dati)


def pillola(corso, pid):
    return next(p for m in corso["moduli"] for p in m["pillole"] if p["id"] == pid)


@pytest.mark.parametrize("descr, opzioni, messaggio", [
    ("concetto assente dal KG", {"modifica_corso": lambda c: pillola(c, "P1.1")["concetti"].append("C99")}, "assente dal knowledge graph"),
    ("concetto che non cita la pillola", {"modifica_corso": lambda c: pillola(c, "P1.1")["concetti"].append("C79")}, "non cita questa pillola"),
    ("prerequisito inesistente", {"modifica_corso": lambda c: pillola(c, "P1.2")["prerequisiti"].append("P9.9")}, "prerequisito P9.9"),
    ("nodo con pillola inesistente", {"modifica_kg": lambda k: k["nodi"][0]["pillole"].append("P9.9")}, "pillola P9.9 inesistente"),
    ("lezione su pillola inesistente", {"modifica_lezione": lambda l: l.update(pillola="P9.9")}, "pillola P9.9 inesistente"),
    ("componente mancante", {"componente_assente": True}, "componente"),
    ("segmento con concetto inesistente", {"modifica_lezione": lambda l: l["segmenti"][0]["concetti"].append("C99")}, "concetto C99"),
    ("domanda di altra pillola", {"modifica_lezione": lambda l: l["domande"][0].update(pillola="P1.1")}, "dichiara la pillola"),
    ("segmento di aiuto inesistente", {"modifica_lezione": lambda l: l["domande"][0].update(segmento_aiuto="boh")}, "segmento_aiuto boh"),
    ("concetto di domanda inesistente", {"modifica_lezione": lambda l: l["domande"][0]["concetti"].append("C99")}, "concetto C99"),
    ("id duplicato fra corso e lezione", {"modifica_lezione": lambda l: l["domande"][0].update(id="D1.3-a")}, "duplicato"),
])
def test_incroci_incoerenti_fermano_il_caricamento(tmp_path, dati_config, descr, opzioni, messaggio):
    cfg = copia_dati(tmp_path, dati_config, **opzioni)
    with pytest.raises(ErroreDati, match=messaggio):
        Catalogo(cfg)


def test_due_lezioni_per_la_stessa_pillola(tmp_path, dati_config):
    cfg = copia_dati(tmp_path, dati_config)
    lez = (tmp_path / "lezioni" / "a.json").read_text(encoding="utf-8")
    (tmp_path / "lezioni" / "b.json").write_text(lez.replace("L_ciclo_agente", "L_altra"), encoding="utf-8")
    with pytest.raises(ErroreDati, match="due lezioni"):
        Catalogo(cfg)


def test_cartella_lezioni_mancante(dati_config):
    dati = copy.deepcopy(dati_config)
    dati["percorsi_file"]["cartella_lezioni"] = "non_esiste_davvero"
    with pytest.raises(ErroreDati, match="cartella delle lezioni"):
        Catalogo(config_da(dati))


# ---------------------------------------------------------------- lingua


def test_risolvi_nella_lingua_e_mai_ripiego():
    dati = {"a": {"it": "uno", "en": "one"}, "b": [Testo(it="due", en="two")], "n": 3}
    assert risolvi(dati, "en") == {"a": "one", "b": ["two"], "n": 3}
    mancante = {"a": {"it": "uno", "en": None}, "b": [{"it": "x", "en": None}]}
    with pytest.raises(TraduzioneMancante) as e:
        risolvi(mancante, "en")
    assert e.value.percorsi == ["$.a", "$.b[0]"]
    assert testi_mancanti(mancante, "it") == []


def test_testi_delle_lezioni_completi_in_entrambe_le_lingue(catalogo_vero):
    for lez in catalogo_vero.lezioni.values():
        for lingua in ("it", "en"):
            assert testi_mancanti(lez.model_dump(), lingua) == [], f"{lez.id}: testi mancanti in {lingua}"


# ---------------------------------------------------------------- configurazione


def test_config_chiave_mancante_e_tipo_sbagliato(cfg):
    with pytest.raises(ErroreConfigurazione, match="salute.inesistente"):
        cfg.prendi("salute", "inesistente")
    with pytest.raises(ErroreConfigurazione, match="tipo"):
        cfg.prendi("salute", "massima", tipo=str)
    with pytest.raises(ErroreConfigurazione, match="lingua 'fr'"):
        cfg.verifica_lingua("fr")
    with pytest.raises(ErroreConfigurazione, match="radice"):
        Config([], "x")


def test_config_file_assente_o_rotto(tmp_path):
    with pytest.raises(ErroreConfigurazione, match="non trovato"):
        carica_config(tmp_path / "manca.json")
    rotto = tmp_path / "rotto.json"
    rotto.write_text("{non json", encoding="utf-8")
    with pytest.raises(ErroreConfigurazione, match="JSON non valido"):
        leggi_json(rotto)


def test_ogni_sezione_della_config_ha_il_suo_perche():
    dati = json.loads((RADICE_PROGETTO / "config" / "piattaforma.json").read_text(encoding="utf-8"))
    assert "_why" in dati
    for nome, sezione in dati.items():
        if isinstance(sezione, dict):
            assert "_why" in sezione, f"sezione {nome} senza _why"
