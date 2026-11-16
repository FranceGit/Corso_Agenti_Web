"""Pagina Esercizi nel portale: API protette come il resto, flusso completo via HTTP, nessuna fuga di dati nascosti."""
from __future__ import annotations

import json

import pytest

from esercizi.catalogo import e03_trova_errore as e03

from .conftest import EMAIL, entra

ROTTE_GET = ["/api/esercizi?lingua=it", "/api/esercizi/1?lingua=it", "/api/esercizi/1/tentativi",
             "/api/esercizi/1/tentativi/1", "/protetto/esercizi/esercizi.js", "/protetto/esercizi/esercizi.css"]
ROTTE_POST = ["/api/esercizi/1/azione?lingua=it", "/api/esercizi/1/verifica", "/api/esercizi/1/ricomincia?lingua=it",
              "/api/esercizi/1/tentativi/1/ricorreggi"]


def test_senza_accesso_tutto_chiuso(client):
    for url in ROTTE_GET:
        assert client.get(url).status_code == 401, url
    for url in ROTTE_POST:
        assert client.post(url, json={"nome": "x", "parametri": {}}).status_code == 401, url


def test_elenco_e_testi_bilingui(client):
    entra(client)
    it = client.get("/api/esercizi?lingua=it").json()
    en = client.get("/api/esercizi?lingua=en").json()
    assert [e["numero"] for e in it["esercizi"]] == [1, 2, 3, 4, 5, 6]
    assert it["testi"]["verifica"] == "Verifica" and en["testi"]["verifica"] == "Check"
    assert en["esercizi"][2]["titolo"].startswith("Find the bug")
    assert all(e["ultimo_voto"] is None and e["tentativi"] == 0 for e in it["esercizi"])
    assert client.get("/api/esercizi?lingua=fr").status_code == 400


def test_modulo_della_pagina_servito_dopo_l_accesso(client):
    entra(client)
    r = client.get("/protetto/esercizi/esercizi.js")
    assert r.status_code == 200 and "export function monta" in r.text and r.headers["cache-control"].startswith("no-store")
    assert client.get("/protetto/esercizi/esercizi.css").status_code == 200
    assert client.get("/protetto/esercizi/segreti.json").status_code == 404
    # la shell contiene la voce "Esercizi pratici" e il testo esiste in IT e EN
    assert "apriEsercizi" in client.get("/shell/app.js").text
    assert client.get("/api/interfaccia?lingua=en").json()["testi"]["esercizi_pratici"] == "Hands-on exercises"


def test_flusso_completo_esercizio_3_via_http(client):
    entra(client)
    s = client.get("/api/esercizi/3?lingua=it").json()
    assert s["tipo_area"] == "pipeline_risposte" and s["area"]["report"]["interessato"] == 15
    assert len(s["consegna"]) == 5 and s["soglia"] == 80
    azione = lambda nome, **p: client.post("/api/esercizi/3/azione?lingua=it", json={"nome": nome, "parametri": p})  # noqa: E731
    for v in e03.DATI["visibili"]:
        assert azione("etichetta", risposta=v["chiave"], valore=v["giusta"]).status_code == 200
    azione("stazione", valore="conversione")
    azione("correzione", valore="esatta_disiscrizione")
    r = azione("rilancia").json()
    assert r["esito"]["email_inviate"] == 4 and r["area"]["report"]["interessato"] == 4
    v = client.post("/api/esercizi/3/verifica").json()
    assert v["voto"] == 100 and v["superato"] and v["tentativo"] == 1
    assert client.post("/api/esercizi/3/tentativi/1/ricorreggi").json()["identico"] is True
    assert client.get("/api/esercizi/3/tentativi").json()["tentativi"][0]["voto"] == 100
    assert client.get("/api/esercizi/3/tentativi/1").json()["impronta_esito"] == v["impronta_esito"]
    elenco = client.get("/api/esercizi?lingua=it").json()["esercizi"]
    assert elenco[2]["superato"] and elenco[2]["ultimo_voto"] == 100
    # la scheda riaperta mostra l'ultimo verbale
    assert client.get("/api/esercizi/3?lingua=en").json()["ultimo_verbale"]["voto"] == 100
    # ricominciare riporta ai dati di partenza ma i tentativi restano
    s = client.post("/api/esercizi/3/ricomincia?lingua=it").json()
    assert s["area"]["report"]["interessato"] == 15 and s["area"]["posta"] == []
    assert len(client.get("/api/esercizi/3/tentativi").json()["tentativi"]) == 1


def test_errori_leggibili(client):
    entra(client)
    r = client.post("/api/esercizi/1/azione?lingua=it", json={"nome": "segmento", "parametri": {"contatto": 1, "valore": "XL"}})
    assert r.status_code == 409 and "segmento" in r.json()["messaggio"]
    assert client.get("/api/esercizi/9?lingua=it").status_code == 404
    assert client.post("/api/esercizi/1/tentativi/5/ricorreggi").status_code == 404


def test_studenti_separati(client):
    entra(client, EMAIL)
    client.post("/api/esercizi/1/azione?lingua=it", json={"nome": "escludi", "parametri": {"contatto": 1}})
    assert client.get("/api/esercizi/1?lingua=it").json()["area"]["contatori"]["esclusi"] == 1
    client.post("/api/uscita")
    entra(client, "altro@esempio.it")
    assert client.get("/api/esercizi/1?lingua=it").json()["area"]["contatori"]["esclusi"] == 0


@pytest.mark.parametrize("numero", [1, 2, 3, 4, 5, 6])
def test_nessuna_chiave_di_correzione_esce_dalle_api(client, numero):
    entra(client)
    testo = json.dumps(client.get(f"/api/esercizi/{numero}?lingua=it").json(), ensure_ascii=False)
    testo += json.dumps(client.post(f"/api/esercizi/{numero}/verifica").json(), ensure_ascii=False)
    for proibito in ('"chiave_persone"', '"fascia_attesa"', '"nascosti"', '"stazione_giusta"', '"giusta"', "Noemi Silvestri"):
        assert proibito not in testo, proibito


def test_flusso_esercizio_5_via_http_e_niente_dati_nascosti(client):
    entra(client)
    azione = lambda nome, **p: client.post("/api/esercizi/5/azione?lingua=en", json={"nome": nome, "parametri": p})  # noqa: E731
    for r in ("tono", "vietate", "sconto", "dati", "disiscrizione", "firma"):
        assert azione("regola", regola=r, acceso=True).status_code == 200
    for c in ("telefono", "note_private"):
        azione("campo", campo=c, acceso=False)
    bozze = azione("genera").json()["area"]["bozze"]
    for b in bozze:
        azione("decidi", bozza=b["id"], decisione="rifiuta" if "sconto del" in b["corpo"] else "approva")
    r = azione("invia").json()
    assert r["esito"] == {"fatto": "inviate", "inviate": 6, "bloccate": 1}
    azione("interruttore", valore=True)
    v = client.post("/api/esercizi/5/verifica").json()
    assert v["voto"] == 100 and v["riassunto"]["en"].startswith("Passed")
    assert azione("genera").status_code == 409, "con l'interruttore acceso l'agente non scrive"
    testo = json.dumps(client.get("/api/esercizi/5?lingua=en").json(), ensure_ascii=False) + json.dumps(v, ensure_ascii=False)
    for proibito in ("Irene", "Pasticceria Dolce Vita", '"nascoste"', '"sensibili"', '"umano"'):
        assert proibito not in testo, proibito


@pytest.mark.parametrize("numero, proibiti", [
    (4, ["Valentina Fontana", '"fascia_attesa"', '"soglie_blocchi"', '"parole_rubrica"']),
    (6, ["Beatrice Rinaldi", "partner@esterno", '"pericolosi"', '"mai_necessari"', "h_ciclo"]),
])
def test_chiave_degli_esercizi_4_e_6_mai_nelle_api(client, numero, proibiti):
    entra(client)
    testo = json.dumps(client.get(f"/api/esercizi/{numero}?lingua=it").json(), ensure_ascii=False)
    testo += json.dumps(client.post(f"/api/esercizi/{numero}/verifica").json(), ensure_ascii=False)
    for p in proibiti:
        assert p not in testo, p


def test_modulo_della_pagina_e_un_modulo_es_valido(tmp_path):
    """Il browser carica esercizi.js come modulo ES: un errore di sintassi spegnerebbe tutta la pagina."""
    import shutil
    import subprocess
    from corso.config import RADICE_PROGETTO
    node = shutil.which("node")
    if node is None:  # pragma: no cover - dipende dalla macchina
        pytest.skip("node non installato")
    copia = tmp_path / "esercizi.mjs"
    copia.write_text((RADICE_PROGETTO / "esercizi" / "webapp" / "esercizi.js").read_text(encoding="utf-8"), encoding="utf-8")
    r = subprocess.run([node, "--check", str(copia)], capture_output=True, text=True, timeout=60)
    assert r.returncode == 0, r.stderr
