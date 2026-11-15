"""Generatore di percorso: copertura garantita degli spicchi, prerequisiti, strisce variabili, determinismo."""
from __future__ import annotations

from collections import Counter

import pytest

from corso.catalogo import Catalogo
from corso.errori import ErroreConfigurazione, ErroreGrafo
from corso.percorsi import genera_anelli, genera_strisce, ordine_opzioni, peso_legame, seme_studente
from tests.conftest import config_da

SEMI = [f"seme-{i}" for i in range(150)]


def test_tutti_gli_spicchi_coperti_una_volta_per_ogni_seme(catalogo_vero):
    tutte = sorted(p.id for p in catalogo_vero.corso.pillole())
    for seme in SEMI:
        anelli = genera_anelli(catalogo_vero, seme)
        visti = [pid for a in anelli for pid in a.spicchi]
        assert sorted(visti) == tutte, f"seme {seme}: spicchi mancanti o doppi"
        assert [a.numero for a in anelli] == sorted(a.numero for a in anelli)
        for a in anelli:
            assert all(catalogo_vero.corso.anello_di(pid) == a.numero for pid in a.spicchi)


def test_prerequisiti_rispettati_dentro_l_anello(catalogo_vero):
    for seme in SEMI:
        for a in genera_anelli(catalogo_vero, seme):
            pos = {pid: i for i, pid in enumerate(a.spicchi)}
            for pid in a.spicchi:
                for pre in catalogo_vero.pillola(pid).prerequisiti:
                    if pre in pos:
                        assert pos[pre] < pos[pid], f"seme {seme}: {pre} deve precedere {pid}"


def test_chiusura_p86_sempre_ultima(catalogo_vero):
    # P8.6 richiede "tutte le pillole dei moduli 1-8": nel suo anello e' sempre l'ultimo spicchio
    for seme in SEMI:
        assert genera_anelli(catalogo_vero, seme)[-1].spicchi[-1] == "P8.6"


def test_ordine_deterministico_e_variabile(catalogo_vero):
    a1 = [x.spicchi for x in genera_anelli(catalogo_vero, "abc")]
    a2 = [x.spicchi for x in genera_anelli(catalogo_vero, "abc")]
    assert a1 == a2
    ordini_anello2 = {tuple(genera_anelli(catalogo_vero, s)[1].spicchi) for s in SEMI}
    assert len(ordini_anello2) > 10, "l'ordine dentro l'anello deve cambiare con il seme"


def test_seme_studente_stabile_e_indipendente_da_maiuscole(cfg):
    assert seme_studente("A@B.it", cfg) == seme_studente(" a@b.it ", cfg)
    assert seme_studente("a@b.it", cfg) != seme_studente("c@b.it", cfg)


def test_peso_legame_somma_archi(catalogo_vero):
    # P1.1 (C01,C02,C03) e P1.3 (C08,C09): unico arco C02 PRE C08 = 3
    assert peso_legame(catalogo_vero, "P1.1", "P1.3") == 3
    assert peso_legame(catalogo_vero, "P1.3", "P1.1") == 3


def test_strisce_per_concetto_nei_limiti_e_variabili(catalogo_vero):
    cfg = catalogo_vero.cfg
    minimo = cfg.prendi("percorso", "strisce_per_concetto", "minimo")
    massimo = cfg.prendi("percorso", "strisce_per_concetto", "massimo")
    quantita = set()
    for pid in catalogo_vero.lezioni:
        for seme in SEMI:
            for tentativo in (1, 2):
                s = genera_strisce(catalogo_vero, pid, seme, tentativo)
                assert s.erogabile and not s.carenze
                assert len(set(s.domande)) == len(s.domande)
                per_concetto = Counter(catalogo_vero.domanda(d).concetto_principale for d in s.domande)
                assert set(per_concetto) == set(catalogo_vero.pillola(pid).concetti), "ogni concetto ha le sue strisce"
                for c, n in per_concetto.items():
                    assert minimo <= n <= massimo
                quantita.add(len(s.domande))
    assert len(quantita) > 1, "il numero di strisce deve variare"


def test_strisce_deterministiche_per_tentativo(catalogo_vero):
    a = genera_strisce(catalogo_vero, "P1.3", "x", 1).domande
    assert a == genera_strisce(catalogo_vero, "P1.3", "x", 1).domande
    diversi = {tuple(genera_strisce(catalogo_vero, "P1.3", "x", t).domande) for t in range(1, 15)}
    assert len(diversi) > 1, "un nuovo tentativo deve proporre strisce diverse"


def test_carenze_dichiarate_per_spicchi_senza_domande_erogabili(catalogo_vero):
    s = genera_strisce(catalogo_vero, "P1.1", "x", 1)
    assert not s.erogabile and s.domande == []
    # P1.1 ha 3 domande: 2 su C02 (bastano), 1 su C03, nessuna su C01 -> carenze dichiarate su C01 e C03
    assert [(c.concetto, c.disponibili, c.minimo) for c in s.carenze] == [("C01", 0, 2), ("C03", 1, 2)]


def test_strisce_configurazione_incoerente(dati_config):
    dati_config["percorso"]["strisce_per_concetto"] = {"minimo": 5, "massimo": 2}
    cat = Catalogo(config_da(dati_config))
    with pytest.raises(ErroreConfigurazione, match="minimo"):
        genera_strisce(cat, "P1.3", "x", 1)


def test_peso_base_non_positivo_rifiutato(dati_config):
    dati_config["percorso"]["peso_base_candidato"] = 0
    with pytest.raises(ErroreConfigurazione, match="peso_base"):
        genera_anelli(Catalogo(config_da(dati_config)), "x")


def test_prerequisiti_ciclici_errore_esplicito(dati_config):
    cat = Catalogo(config_da(dati_config))
    cat.corso.pillola("P1.1").prerequisiti.append("P1.2")  # P1.2 richiede gia' P1.1: ciclo
    with pytest.raises(ErroreGrafo, match="ciclici"):
        genera_anelli(cat, "x")


def test_prerequisito_verso_anello_interno_errore_esplicito(dati_config):
    cat = Catalogo(config_da(dati_config))
    cat.corso.pillola("P1.1").prerequisiti.append("P8.1")
    with pytest.raises(ErroreGrafo, match="piu' interno"):
        genera_anelli(cat, "x")


def test_ordine_opzioni_riproducibile():
    ids = list("abcdefg")
    o1 = ordine_opzioni(ids, "s", "D1", 1, 3)
    assert o1 == ordine_opzioni(ids, "s", "D1", 1, 3)
    assert sorted(o1) == ids
    assert len({tuple(ordine_opzioni(ids, "s", "D1", 1, k)) for k in range(30)}) > 5
