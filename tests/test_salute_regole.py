"""Salute, ripasso distanziato e regole delle domande (budget di lettura, composizione)."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

from corso.errori import ErroreConfigurazione
from corso.modello import Livello
from corso.regole_domande import fascia_budget, violazioni_livello
from corso.salute import (
    applica_danno, arrotonda, danno, gradino_dopo_ripasso, intervalli, recupera, salute_fine_convalescenza, scadenza,
)
from tests.conftest import config_da


def test_danno_dipende_dal_tipo_e_dal_livello(cfg):
    assert danno("quasi", 1, cfg) == 8
    assert danno("poco", 1, cfg) == 15
    assert danno("errata", 1, cfg) == 25
    assert danno("errata", 2, cfg) == 15  # 25 x 0.6
    assert danno("quasi", 2, cfg) == 5  # 8 x 0.6 = 4.8 -> 5
    assert danno("quasi", 1, cfg) < danno("poco", 1, cfg) < danno("errata", 1, cfg)


def test_danno_tipi_e_livelli_ignoti_errore_esplicito(cfg):
    with pytest.raises(ErroreConfigurazione, match="tipo 'boh'"):
        danno("boh", 1, cfg)
    with pytest.raises(ErroreConfigurazione, match="livello 3"):
        danno("quasi", 3, cfg)


def test_arrotondamento_meta_in_su():
    assert arrotonda(4.5) == 5 and arrotonda(5.5) == 6 and arrotonda(4.49) == 4


def test_salute_mai_negativa_e_convalescenza_a_zero():
    assert applica_danno(30, 10) == (20, False)
    assert applica_danno(10, 25) == (0, True)
    assert applica_danno(0, 0) == (0, True)


def test_recupero_limitato_al_massimo_e_fine_convalescenza(cfg):
    assert recupera(95, 10, cfg) == 100
    assert recupera(40, 10, cfg) == 50
    assert salute_fine_convalescenza(0, cfg) == 60
    assert salute_fine_convalescenza(80, cfg) == 80


def test_ripasso_distanziato(cfg):
    t0 = datetime(2026, 1, 1, tzinfo=timezone.utc)
    assert (scadenza(0, t0, cfg) - t0).total_seconds() == 24 * 3600
    assert (scadenza(3, t0, cfg) - t0).total_seconds() == 336 * 3600
    assert gradino_dopo_ripasso(0, True, cfg) == 1
    assert gradino_dopo_ripasso(2, False, cfg) == 0
    assert gradino_dopo_ripasso(3, True, cfg) is None  # imparato: esce dalla lista


def test_intervalli_non_validi(dati_config):
    dati_config["ripasso"]["intervalli_ore"] = [24, -1]
    with pytest.raises(ErroreConfigurazione, match="intervalli_ore"):
        intervalli(config_da(dati_config))


# ---------------------------------------------------------------- budget di lettura


def test_fasce_del_budget(cfg):
    assert fascia_budget(10, cfg) == ("molto_brevi", 7)
    assert fascia_budget(30, cfg) == ("molto_brevi", 7)
    assert fascia_budget(31, cfg) == ("normali", 5)
    assert fascia_budget(120, cfg) == ("lunghe", 4)
    assert fascia_budget(400, cfg) == ("lunghissime", 3)


@pytest.mark.parametrize("fasce, messaggio", [
    ([], "vuoto"),
    ([{"nome": "a", "fino_a_caratteri": None, "numero_opzioni": 3}, {"nome": "b", "fino_a_caratteri": 10, "numero_opzioni": 5}], "solo l'ultima"),
    ([{"nome": "a", "fino_a_caratteri": 50, "numero_opzioni": 5}, {"nome": "b", "fino_a_caratteri": 20, "numero_opzioni": 7}], "crescenti"),
    ([{"nome": "a", "fino_a_caratteri": 5, "numero_opzioni": 7}], "null"),
])
def test_fasce_incoerenti(dati_config, fasce, messaggio):
    dati_config["domande"]["budget_lettura"]["fasce"] = fasce
    with pytest.raises(ErroreConfigurazione, match=messaggio):
        fascia_budget(40, config_da(dati_config))


def livello(testi_e_tipi):
    return Livello.model_validate({
        "domanda": {"it": "domanda", "en": "question"},
        "opzioni": [{"id": str(i), "testo": {"it": t, "en": t}, "corretta": tipo == "ok", "tipo_distrattore": None if tipo in ("ok", None) else tipo}
                    for i, (t, tipo) in enumerate(testi_e_tipi)],
    })


def test_sette_opzioni_brevi_con_composizione_giusta(cfg):
    lv = livello([("corta", "ok"), ("aa", "quasi"), ("bb", "quasi"), ("cc", "poco"), ("dd", "poco"), ("ee", "errata"), ("ff", "errata")])
    assert violazioni_livello(lv, "livello 1", cfg) == []


def test_sette_opzioni_con_composizione_sbagliata(cfg):
    lv = livello([("corta", "ok"), ("aa", "quasi"), ("bb", "quasi"), ("cc", "quasi"), ("dd", "poco"), ("ee", "errata"), ("ff", "errata")])
    assert any("composizione" in m for m in violazioni_livello(lv, "livello 1", cfg))


def test_numero_di_opzioni_contro_budget_e_distrattori_non_classificati(cfg):
    lv = livello([("x" * 20, "ok"), ("y" * 20, None), ("z" * 20, "poco"), ("w" * 20, "errata"), ("k" * 20, "errata")])
    motivi = violazioni_livello(lv, "livello 1", cfg)
    assert any("senza tipo" in m for m in motivi)
    assert any("ne chiede 7" in m for m in motivi)


def test_numero_di_opzioni_non_dichiarato_in_composizione(cfg):
    lv = livello([("x" * 200, "ok"), ("y" * 200, "quasi")])
    with pytest.raises(ErroreConfigurazione, match="2 opzioni"):
        violazioni_livello(lv, "livello 1", cfg)


def test_tipo_distrattore_non_previsto_in_configurazione(dati_config):
    dati_config["domande"]["tipi_distrattore"] = ["quasi", "poco"]
    lv = livello([("x" * 200, "ok"), ("y" * 200, "quasi"), ("z" * 200, "errata")])
    motivi = violazioni_livello(lv, "livello 1", config_da(dati_config))
    assert any("non previsti" in m for m in motivi)
