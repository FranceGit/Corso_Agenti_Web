"""Upgrade delle domande benchmark: bande di lunghezza, distrattori classificati, concetto/aiuto/striscia,
inglese completo, migrazione dello schema v1 -> v2, aiuto su passo di scaletta, estrattore che conserva le
domande del JSON (fonte di verita') e calcolo del fabbisogno di strisce."""
from __future__ import annotations

import copy
import json
from collections import Counter

import pytest

import strumenti.estrai_corso as ec
import strumenti.fabbisogno_strisce as fs
from corso.catalogo import Catalogo
from corso.config import RADICE_PROGETTO
from corso.errori import ErroreDati
from corso.lingua import testi_mancanti
from corso.migrazioni import migra_corso
from corso.modello import VERSIONE_SCHEMA_CORSO, Domanda
from corso.percorsi import genera_strisce
from corso.regole_domande import fascia_budget, media_caratteri
from tests.conftest import EMAIL, posizione
from tests.test_catalogo import copia_dati, pillola
from tests.test_estrazione import documento

DATI = RADICE_PROGETTO / "dati"


def tutte_le_domande(cat: Catalogo) -> list[Domanda]:
    return [cat.domanda(did) for did in cat.motivi_non_erogabile]


def livelli(d: Domanda):
    return (("livello 1", d.livello1), ("livello 2", d.livello2))


# ---------------------------------------------------------------- regole di France sulle domande


def test_bande_di_lunghezza_rispettate(catalogo_vero):
    """Ogni livello ha il numero di opzioni chiesto dalla sua fascia (3 lunghissime / 4 lunghe / 5 normali / 7 brevi)."""
    viste = Counter()
    for d in tutte_le_domande(catalogo_vero):
        for nome, liv in livelli(d):
            fascia, richieste = fascia_budget(media_caratteri(liv, catalogo_vero.cfg), catalogo_vero.cfg)
            assert len(liv.opzioni) == richieste, f"{d.id} {nome}: {len(liv.opzioni)} opzioni, la fascia '{fascia}' ne chiede {richieste}"
            viste[fascia] += 1
    assert viste["molto_brevi"] > 0 and viste["normali"] > 0  # i casi reali esercitano piu' di una fascia


def test_classificazione_completa_dei_distrattori(catalogo_vero):
    """Nessun distrattore senza tipo; la corretta non ha tipo; con 7 opzioni la composizione e' quella di France."""
    cfg = catalogo_vero.cfg
    ammessi = set(cfg.prendi("domande", "tipi_distrattore"))
    composizioni = cfg.prendi("domande", "composizione_plausibilita")
    for d in tutte_le_domande(catalogo_vero):
        for nome, liv in livelli(d):
            assert liv.corretta().tipo_distrattore is None
            tipi = [o.tipo_distrattore for o in liv.distrattori()]
            assert all(t in ammessi for t in tipi), f"{d.id} {nome}: tipi {tipi}"
            attesa = composizioni[str(len(liv.opzioni))]
            if attesa is not None:
                assert dict(Counter(tipi)) == attesa, f"{d.id} {nome}: composizione {Counter(tipi)}"


def test_domande_benchmark_complete(catalogo_vero):
    """Concetto principale della pillola, aiuto che porta da qualche parte, striscia, perche' e inglese completo."""
    benchmark = [d for d in tutte_le_domande(catalogo_vero) if d.origine == "benchmark"]
    assert len(benchmark) == 120
    for d in benchmark:
        assert d.concetto_principale in catalogo_vero.pillola(d.pillola).concetti
        assert catalogo_vero.riferimento_aiuto(d)["scheda"] in ("scaletta", "lezione")
        assert d.striscia is not None
        assert d.livello1.perche is not None and d.livello2.perche is not None
        assert testi_mancanti(d.model_dump(), "en") == []
        assert catalogo_vero.erogabile(d.id)
    # P1.3 e P4.1 (lezioni del dimostratore) rimandano ai segmenti della lezione; un passo di scaletta resta valido
    # anche quando una pillola riceve la sua lezione, quindi per le altre non si impone nulla
    assert {catalogo_vero.riferimento_aiuto(d)["scheda"] for d in benchmark if d.pillola in ("P1.3", "P4.1")} == {"lezione"}


# ---------------------------------------------------------------- migrazione dello schema


def corso_v1() -> dict:
    dati = json.loads((DATI / "corso_v1.json").read_text(encoding="utf-8"))
    dati["versione_schema"] = 1
    for m in dati["moduli"]:
        for p in m["pillole"]:
            for d in p["domande"]:
                del d["striscia"]
    return dati


def test_migrazione_v1_v2():
    v1 = corso_v1()
    v2 = migra_corso(v1)
    assert v2["versione_schema"] == VERSIONE_SCHEMA_CORSO == 2
    assert all(d["striscia"] is None for m in v2["moduli"] for p in m["pillole"] for d in p["domande"])
    assert v1["versione_schema"] == 1  # l'originale non viene toccato
    attuale = json.loads((DATI / "corso_v1.json").read_text(encoding="utf-8"))
    assert migra_corso(attuale) == attuale  # gia' alla versione corrente: invariato


@pytest.mark.parametrize("guasto, messaggio", [
    (lambda d: d.update(versione_schema=99), "non migrabile"),
    (lambda d: d.pop("versione_schema"), "senza versione_schema"),
    (lambda d: d["moduli"][0]["pillole"][0]["domande"][0].update(striscia="definizione"), "gia' presente"),
])
def test_migrazione_rifiuta_dati_incoerenti(guasto, messaggio):
    dati = corso_v1()
    guasto(dati)
    with pytest.raises(ErroreDati, match=messaggio):
        migra_corso(dati)


def test_catalogo_carica_un_corso_v1(tmp_path, dati_config):
    """Un file ancora in v1 si carica (migrato al volo); le domande senza striscia non sono erogabili."""
    def a_v1(c):
        c.clear()
        c.update(corso_v1())
    cat = Catalogo(copia_dati(tmp_path, dati_config, modifica_corso=a_v1))
    assert cat.corso.versione_schema == 2
    assert "striscia non assegnata" in " ".join(cat.motivi_non_erogabile["D1.1-a"])
    assert cat.erogabile("DX1.3-1")


# ---------------------------------------------------------------- aiuto su passo di scaletta


def test_riferimento_aiuto(catalogo_vero):
    assert catalogo_vero.riferimento_aiuto(catalogo_vero.domanda("D1.1-a")) == {"scheda": "scaletta", "passo": 1}
    assert catalogo_vero.riferimento_aiuto(catalogo_vero.domanda("D1.3-a")) == {"scheda": "lezione", "segmento": "fasi"}
    senza = catalogo_vero.domanda("D1.1-a").model_copy(update={"segmento_aiuto": None})
    with pytest.raises(ErroreDati, match="non assegnato"):
        catalogo_vero.riferimento_aiuto(senza)


@pytest.mark.parametrize("riferimento, messaggio", [
    ("scaletta-99", "fuori dalla scaletta"),
    ("scaletta-0", "fuori dalla scaletta"),
    ("scaletta-x", "fuori dalla scaletta"),
    ("fasi", "non ha lezione"),
])
def test_riferimento_aiuto_invalido_ferma_il_caricamento(tmp_path, dati_config, riferimento, messaggio):
    # P3.3 resta senza lezione interattiva per scelta (vedi tests/test_lezioni.py): copia_dati copia tutte le
    # lezioni vere, e le altre pillole (prima P1.1, poi P8.6) via via ne hanno ricevuta una
    cfg = copia_dati(tmp_path, dati_config, modifica_corso=lambda c: pillola(c, "P3.3")["domande"][0].update(segmento_aiuto=riferimento))
    with pytest.raises(ErroreDati, match=messaggio):
        Catalogo(cfg)


def test_aiuto_su_pillola_senza_lezione_porta_al_passo_di_scaletta(motore):
    """P2.2 non ha lezione interattiva: il primo aiuto apre la scaletta al passo indicato dalla domanda."""
    motore.inizia_spicchio(EMAIL, "P2.2")
    aiuti = []
    for _ in range(2):
        motore.domanda_spicchio(EMAIL, "P2.2", "it")
        d = motore.cat.domanda(motore.stato(EMAIL).in_corso.domanda)
        e = motore.rispondi(EMAIL, posizione(motore, EMAIL, False), "it")
        aiuti.append((d, e["aiuto"]))
    (_, primo), (d, secondo) = aiuti
    assert primo is None  # un solo errore: nessun aiuto
    passo = int(d.segmento_aiuto.split("-")[1]) - 1
    assert secondo == {"tipo": "segmento", "pillola": "P2.2", "segmento": d.segmento_aiuto, "scheda": "scaletta", "passo": passo}


# ---------------------------------------------------------------- estrattore: il JSON e' la fonte di verita'


def estratto_e_json(tmp_path, monkeypatch):
    vuoto = tmp_path / "trad.json"
    vuoto.write_text("{}", encoding="utf-8")
    monkeypatch.setattr(ec, "FILE_TRADUZIONI_PILLOLE", vuoto)
    md = tmp_path / "corso.md"
    md.write_text(documento(), encoding="utf-8")
    estratto, _ = ec.estrai(md)
    curato = copy.deepcopy(estratto)
    d = curato["moduli"][0]["pillole"][0]["domande"][0]
    d.update(concetto_principale="C01", segmento_aiuto="scaletta-1", striscia="definizione")
    d["livello1"]["domanda"]["en"] = "Question one?"
    d["livello1"]["opzioni"][0]["tipo_distrattore"] = "poco"
    return md, estratto, curato


def test_conserva_domande_del_json(tmp_path, monkeypatch):
    _, estratto, curato = estratto_e_json(tmp_path, monkeypatch)
    estratto["moduli"][0]["pillole"][0]["obiettivo"]["it"] = "obiettivo aggiornato nel documento"
    unito = ec.conserva_domande(copy.deepcopy(estratto), curato)
    p = unito["moduli"][0]["pillole"][0]
    assert p["obiettivo"]["it"] == "obiettivo aggiornato nel documento"  # pillola dal documento
    assert p["domande"][0]["striscia"] == "definizione"  # domande dal JSON
    assert p["domande"][0]["livello1"]["domanda"]["en"] == "Question one?"


@pytest.mark.parametrize("guasto, messaggio", [
    (lambda c: c["moduli"][0]["pillole"][0]["domande"][0]["livello1"]["domanda"].update(it="Cambiata?"), "D1.1-a: testo della domanda"),
    (lambda c: c["moduli"][0]["pillole"][0]["domande"].pop(), "domande diverse"),
    (lambda c: c["moduli"][0]["pillole"].pop(), "pillola nuova nel documento"),
])
def test_conserva_domande_si_ferma_se_il_documento_e_cambiato(tmp_path, monkeypatch, guasto, messaggio):
    _, estratto, curato = estratto_e_json(tmp_path, monkeypatch)
    guasto(curato)
    with pytest.raises(ec.ErroreEstrazione, match=messaggio):
        ec.conserva_domande(estratto, curato)


def test_main_conserva_le_domande_esistenti(tmp_path, monkeypatch, capsys):
    md, _, curato = estratto_e_json(tmp_path, monkeypatch)
    uscita = tmp_path / "out" / "corso.json"
    uscita.parent.mkdir()
    uscita.write_text(json.dumps(curato, ensure_ascii=False), encoding="utf-8")
    monkeypatch.setattr(ec, "USCITA_CORSO", uscita)
    monkeypatch.setattr(ec, "USCITA_KG", tmp_path / "out" / "kg.json")
    assert ec.main(["x", str(md)]) == 0
    scritto = json.loads(uscita.read_text(encoding="utf-8"))
    assert scritto["moduli"][0]["pillole"][0]["domande"][0]["striscia"] == "definizione"
    assert "fonte di verita'" in capsys.readouterr().out


# ---------------------------------------------------------------- fabbisogno di strisce


def test_fabbisogno_coerente_con_il_generatore_di_strisce(catalogo_vero):
    f = fs.fabbisogno(catalogo_vero)
    for p in f["pillole"]:
        assert p["erogabile"] == genera_strisce(catalogo_vero, p["pillola"], "x", 1).erogabile
        for c in p["concetti"]:
            assert c["mancano_per_erogare"] == max(0, f["minimo_per_erogare"] - len(c["domande"]))
            assert len(c["strisce_da_scrivere"]) <= c["mancano_per_obiettivo"]
            assert not set(c["strisce_da_scrivere"]) & set(c["strisce_coperte"])
    assert f["nuove_domande_per_erogare_tutto"] == sum(c["mancano_per_erogare"] for p in f["pillole"] for c in p["concetti"])
    p11 = next(p for p in f["pillole"] if p["pillola"] == "P1.1")
    # con le domande degli autori (16/11/2026) P1.1 ha almeno 2 domande per ogni concetto
    assert [(c["concetto"], c["mancano_per_erogare"]) for c in p11["concetti"]] == [("C01", 0), ("C02", 0), ("C03", 0)]


def test_fabbisogno_main(tmp_path, monkeypatch, capsys):
    monkeypatch.setattr(fs, "USCITA", tmp_path / "fabbisogno.json")
    assert fs.main() == 0
    scritto = json.loads((tmp_path / "fabbisogno.json").read_text(encoding="utf-8"))
    assert scritto["pillole_totali"] == 40
    assert "pillole erogabili" in capsys.readouterr().out
