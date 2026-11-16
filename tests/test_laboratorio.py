"""Laboratorio: seconda lezione facoltativa di una pillola (tipo "laboratorio"), es. "Trova l'errore" in P3.5."""
from __future__ import annotations

import copy
import json
import shutil

import pytest

from corso.catalogo import Catalogo
from corso.config import RADICE_PROGETTO
from corso.errori import ErroreDati
from tests.conftest import config_da

LEZIONI = RADICE_PROGETTO / "dati" / "lezioni"


def config_con_lezioni(tmp_path, dati_config, aggiungi: dict[str, dict] | None = None, togli: tuple[str, ...] = ()):
    """Copia TUTTE le lezioni vere in tmp_path (le domande del corso rimandano ai loro segmenti), con aggiunte e tolte."""
    cartella = tmp_path / "lezioni"
    shutil.copytree(LEZIONI, cartella)
    for nome in togli:
        (cartella / nome).unlink()
    for nome, dati in (aggiungi or {}).items():
        (cartella / nome).write_text(json.dumps(dati, ensure_ascii=False), encoding="utf-8")
    dati = copy.deepcopy(dati_config)
    dati["percorsi_file"]["cartella_lezioni"] = str(cartella)
    return config_da(dati)


def laboratorio_vero() -> dict:
    return json.loads((LEZIONI / "trova_errore.json").read_text(encoding="utf-8"))


def test_il_laboratorio_e_separato_dalla_lezione(catalogo_vero):
    assert catalogo_vero.laboratori["P3.5"].id == "L_trova_errore"
    assert catalogo_vero.lezioni["P3.5"].tipo == "lezione"
    assert all(lez.tipo == "lezione" for lez in catalogo_vero.lezioni.values())
    assert "P3.5" in catalogo_vero.rapporto()["laboratori"]  # altri laboratori arrivano dai cantieri paralleli (es. P8.1)
    componenti = [lez.componente for lez in catalogo_vero.tutte_le_lezioni()]
    assert "trova_errore" in componenti and len(componenti) == len(set(componenti))


def test_due_laboratori_per_la_stessa_pillola(tmp_path, dati_config):
    doppio = laboratorio_vero() | {"id": "L_altro_laboratorio"}
    with pytest.raises(ErroreDati, match="due laboratori per la pillola P3.5"):
        Catalogo(config_con_lezioni(tmp_path, dati_config, aggiungi={"zz_doppio.json": doppio}))


def test_laboratorio_senza_lezione_principale(tmp_path, dati_config):
    # una pillola con domande che rimandano solo alla scaletta: il laboratorio da solo non basta
    orfano = laboratorio_vero() | {"id": "L_orfano", "pillola": "P3.3"}
    with pytest.raises(ErroreDati, match="non ha la lezione principale"):
        Catalogo(config_con_lezioni(tmp_path, dati_config, aggiungi={"zz_orfano.json": orfano}))


def test_aiuto_che_porta_al_laboratorio(catalogo_vero):
    d = catalogo_vero.domanda("DA3.5-3")
    assert catalogo_vero.riferimento_aiuto(d) == {"scheda": "laboratorio", "segmento": d.segmento_aiuto}
    finta = d.model_copy(update={"segmento_aiuto": "non_esiste"})
    with pytest.raises(ErroreDati, match="ne' nel laboratorio L_trova_errore"):
        catalogo_vero.riferimento_aiuto(finta)


@pytest.mark.parametrize("lingua", ["it", "en"])
def test_api_pillola_con_laboratorio(client_dentro, lingua):
    r = client_dentro.get(f"/api/pillole/P3.5?lingua={lingua}")
    assert r.status_code == 200
    c = r.json()
    assert c["lezione"]["componente"] == "leggere_risposte"
    assert c["laboratorio"]["componente"] == "trova_errore" and c["laboratorio"]["tipo"] == "laboratorio"
    assert all(isinstance(s["titolo"], str) and s["titolo"] for s in c["laboratorio"]["segmenti"])
    assert client_dentro.get("/api/pillole/P3.3?lingua=it").json()["laboratorio"] is None
    js = client_dentro.get("/protetto/animazioni/trova_errore.js")
    assert js.status_code == 200 and js.headers["content-type"].startswith("text/javascript")


def test_modulo_del_laboratorio_non_servito_senza_accesso(client):
    assert client.get("/protetto/animazioni/trova_errore.js").status_code == 401
