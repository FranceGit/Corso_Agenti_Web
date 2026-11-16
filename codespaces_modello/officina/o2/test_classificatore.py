"""Prova locale del difetto reale (O2): esegue il banco del corso sul TUO response_classifier.py.

Uso, dalla radice del repo studente:  python -m pytest officina/o2/test_classificatore.py -q
Nessuna rete, nessuna chiave: il modello e' finto e risponde sempre uguale.
"""
from pathlib import Path

from officina.banco_classificatore import CASI, esegui, valuta

FILE = Path(__file__).parent / "crm_adottato" / "app" / "agents" / "response_classifier.py"


def _esiti():
    r = esegui(FILE.read_text(encoding="utf-8"))
    assert r["ammesso"], f"il banco non puo' eseguire il file: {r['violazioni']}"
    assert r["errore"] is None, r["errore"]
    return r["esiti"]


def test_not_interested_resta_not_interested():
    esiti = _esiti()
    assert esiti["not_interested"] == "Not Interested", (
        "«Not Interested» viene classificato come " + esiti["not_interested"] + ": guarda l'ordine dei controlli")


def test_nessuna_regressione():
    v = valuta(_esiti())
    assert not v["regressione"]["sbagliati"], v["regressione"]["sbagliati"]


def test_robustezza():
    v = valuta(_esiti())
    assert not v["robustezza"]["sbagliati"], v["robustezza"]["sbagliati"]


def test_i_casi_sono_quelli_del_correttore():
    assert len(CASI) == 8
