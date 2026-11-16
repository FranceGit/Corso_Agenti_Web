"""Domande scritte dagli autori (origine "autori"): erogabilita' degli spicchi, coerenza con i lotti, strumento di inserimento."""
from __future__ import annotations

import copy
import json
from pathlib import Path

import pytest

import strumenti.estrai_corso as ec
import strumenti.inserisci_domande as ins
from corso.config import RADICE_PROGETTO
from tests.conftest import senza_autori

DATI = RADICE_PROGETTO / "dati"
CARTELLA_LOTTI = RADICE_PROGETTO / "strumenti" / "domande_autori"

# Pillole le cui domande sono dichiaratamente in scrittura in un altro cantiere (vuoto = TUTTI gli spicchi
# devono essere erogabili). Dal 16/11/2026, con i lotti M3 inseriti, e' vuoto.
IN_SCRITTURA: set[str] = set()


def corso_su_disco() -> dict:
    return json.loads((DATI / "corso_v1.json").read_text(encoding="utf-8"))


def domande_autori(corso: dict) -> list[dict]:
    return [d for m in corso["moduli"] for p in m["pillole"] for d in p["domande"] if d["origine"] == "autori"]


def test_ogni_spicchio_e_erogabile(catalogo_vero):
    from corso.percorsi import genera_strisce
    non_erogabili = {p.id for p in catalogo_vero.corso.pillole() if not genera_strisce(catalogo_vero, p.id, "x", 1).erogabile}
    assert non_erogabili <= IN_SCRITTURA, f"spicchi non erogabili fuori dai cantieri dichiarati: {sorted(non_erogabili - IN_SCRITTURA)}"


def test_ogni_concetto_ha_almeno_il_minimo_di_domande(catalogo_vero):
    minimo = catalogo_vero.cfg.prendi("percorso", "strisce_per_concetto", "minimo", tipo=int)
    for p in catalogo_vero.corso.pillole():
        if p.id in IN_SCRITTURA:
            continue
        erogabili = catalogo_vero.domande_erogabili(p.id)
        for c in p.concetti:
            domande = [d for d in erogabili if d.concetto_principale == c]
            assert len(domande) >= minimo, (p.id, c, [d.id for d in domande])


def test_domande_autori_erogabili_e_ben_formate(catalogo_vero):
    autori = domande_autori(corso_su_disco())
    assert len(autori) >= 105
    for d in autori:
        assert d["id"].startswith("DA") and d["id"][2:].split("-")[0] == d["pillola"][1:], d["id"]
        assert catalogo_vero.erogabile(d["id"]), (d["id"], catalogo_vero.motivi_non_erogabile[d["id"]])
        assert d["concetto_principale"] in d["concetti"]


def test_domande_autori_del_corso_coincidono_con_i_lotti():
    """I lotti in strumenti/domande_autori/ sono l'origine delle domande autori: corso e lotti non divergono."""
    nei_lotti = {d["id"]: d for f in sorted(CARTELLA_LOTTI.glob("*.json")) for d in json.loads(f.read_text(encoding="utf-8"))}
    for d in domande_autori(corso_su_disco()):
        assert d["id"] in nei_lotti, f"{d['id']} e' nel corso ma in nessun lotto"
        assert d == nei_lotti[d["id"]], f"{d['id']} nel corso diverso dal suo lotto"


def test_la_corretta_non_e_quasi_sempre_la_piu_lunga():
    """Indizio da evitare: se la risposta giusta e' quasi sempre la piu' lunga, si indovina senza capire."""
    livelli = [d[liv] for d in domande_autori(corso_su_disco()) for liv in ("livello1", "livello2")]
    piu_lunga = 0
    for liv in livelli:
        lunghezze = [(len(o["testo"]["it"]), o["corretta"]) for o in liv["opzioni"]]
        if max(lunghezze)[1]:
            piu_lunga += 1
    assert piu_lunga / len(livelli) < 0.3


def test_tutte_le_bande_di_lunghezza_compaiono():
    numeri = {len(d[liv]["opzioni"]) for d in domande_autori(corso_su_disco()) for liv in ("livello1", "livello2")}
    assert numeri == {3, 4, 5, 7}


def test_estrattore_conserva_le_domande_autori():
    """Il documento benchmark non conosce le domande autori: riestraendo, l'estrattore le tiene cosi' come sono."""
    esistente = corso_su_disco()
    dal_documento = copy.deepcopy(esistente)
    senza_autori(*[p["id"] for m in dal_documento["moduli"] for p in m["pillole"]])(dal_documento)
    unito = ec.conserva_domande(dal_documento, esistente)
    assert domande_autori(unito) == domande_autori(esistente)


# ---------------------------------------------------------------- strumento di inserimento


def domanda_di_prova(did: str = "DA8.6-99") -> dict:
    """Una domanda autori valida: copia di una domanda benchmark erogabile di P8.6, con id e origine nuovi."""
    corso = corso_su_disco()
    p86 = next(p for m in corso["moduli"] for p in m["pillole"] if p["id"] == "P8.6")
    d = copy.deepcopy(next(x for x in p86["domande"] if x["origine"] == "benchmark"))
    d.update(id=did, origine="autori")
    return d


def scrivi_lotto(tmp_path: Path, domande: list[dict], nome: str = "lotto.json") -> Path:
    f = tmp_path / nome
    f.write_text(json.dumps(domande, ensure_ascii=False), encoding="utf-8")
    return f


@pytest.fixture
def corso_temporaneo(tmp_path, monkeypatch):
    """Lo strumento scrive su una copia del corso, mai su dati/corso_v1.json."""
    f = tmp_path / "corso.json"
    f.write_text(json.dumps(corso_su_disco(), ensure_ascii=False), encoding="utf-8")
    vero = ins.leggi_json

    def leggi(percorso):
        dati = vero(percorso)
        if Path(percorso).name == "piattaforma.json":
            dati["percorsi_file"]["corso"] = str(f)
        return dati
    monkeypatch.setattr(ins, "leggi_json", leggi)
    return f


def test_inserimento_scrive_solo_se_tutto_e_erogabile(tmp_path, corso_temporaneo, capsys):
    lotto = scrivi_lotto(tmp_path, [domanda_di_prova()])
    prima = corso_temporaneo.read_text(encoding="utf-8")
    assert ins.main(["x", "--verifica", str(lotto)]) == 0
    assert corso_temporaneo.read_text(encoding="utf-8") == prima  # solo verifica
    assert ins.main(["x", str(lotto)]) == 0
    assert "DA8.6-99" in [d["id"] for d in domande_autori(json.loads(corso_temporaneo.read_text(encoding="utf-8")))]
    # reinserire lo stesso lotto sostituisce la domanda, non la duplica
    assert ins.main(["x", str(lotto)]) == 0
    ids = [d["id"] for d in domande_autori(json.loads(corso_temporaneo.read_text(encoding="utf-8")))]
    assert ids.count("DA8.6-99") == 1
    assert "erogabili: 1" in capsys.readouterr().out


def test_inserimento_rifiuta_domande_non_erogabili(tmp_path, corso_temporaneo, capsys):
    d = domanda_di_prova()
    d["striscia"] = None
    prima = corso_temporaneo.read_text(encoding="utf-8")
    assert ins.main(["x", str(scrivi_lotto(tmp_path, [d]))]) == 1
    assert "NON EROGABILE DA8.6-99" in capsys.readouterr().out
    assert corso_temporaneo.read_text(encoding="utf-8") == prima


@pytest.mark.parametrize("modifica, messaggio", [
    (lambda d: d.update(origine="benchmark"), "origine"),
    (lambda d: d.update(pillola="P9.9"), "inesistente"),
    (lambda d: d.update(id="D8.6-a"), "gia' usato"),
])
def test_inserimento_errori_espliciti(modifica, messaggio):
    d = domanda_di_prova()
    modifica(d)
    with pytest.raises(ins.ErroreInserimento, match=messaggio):
        ins.inserisci(corso_su_disco(), [d])


def test_lotti_con_id_ripetuti_o_non_lista(tmp_path):
    a = scrivi_lotto(tmp_path, [domanda_di_prova()], "a.json")
    b = scrivi_lotto(tmp_path, [domanda_di_prova()], "b.json")
    with pytest.raises(ins.ErroreInserimento, match="ripetuti"):
        ins.leggi_lotti([a, b])
    c = tmp_path / "c.json"
    c.write_text("{}", encoding="utf-8")
    with pytest.raises(ins.ErroreInserimento, match="lista"):
        ins.leggi_lotti([c])


def test_uso_senza_lotti(capsys):
    assert ins.main(["x"]) == 2
    assert "Uso" in capsys.readouterr().out
