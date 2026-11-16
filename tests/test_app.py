"""Server HTTP: accesso, protezione dei contenuti, lingue, flusso del quiz via API."""
from __future__ import annotations

from datetime import timedelta

import pytest

from corso.account import Sessioni, verifica_credenziali
from corso.errori import ErroreAccesso, ErroreConfigurazione
from tests.conftest import EMAIL, client_dentro_con, codice_valido, config_con_corso, config_da, senza_autori


def test_shell_pubblica_e_contenuti_protetti(client):
    assert client.get("/").status_code == 200
    assert client.get("/shell/app.js").status_code == 200
    assert client.get("/shell/app.css").status_code == 200
    assert client.get("/shell/segreto.json").status_code == 404
    for url in ["/api/stato?lingua=it", "/api/percorso?lingua=it", "/api/pillole/P1.3?lingua=it",
                "/protetto/animazioni/ciclo_agente.js", "/api/rapporto", "/api/debriefing"]:
        r = client.get(url)
        assert r.status_code == 401, url
        assert r.json()["errore"] == "accesso"
    # i dati del corso non sono mai serviti come file
    for url in ["/dati/corso_v1.json", "/dati/lezioni/ciclo_agente.json", "/webapp/animazioni/ciclo_agente.js", "/shell/../dati/corso_v1.json"]:
        assert client.get(url).status_code == 404, url


def test_intestazioni_no_store(client_dentro):
    r = client_dentro.get("/api/pillole/P1.3?lingua=it")
    assert r.headers["cache-control"].startswith("no-store")
    assert r.headers["x-frame-options"] == "DENY"
    assert r.headers["content-disposition"] == "inline"
    assert "attachment" not in r.headers.get("content-disposition", "")


def test_accesso_errato(client):
    assert client.post("/api/accesso", json={"email": "non-una-email", "codice": codice_valido()}).status_code == 401
    assert client.post("/api/accesso", json={"email": EMAIL, "codice": "SBAGLIATO"}).status_code == 401
    r = client.post("/api/accesso", json={"email": EMAIL, "codice": codice_valido()})
    assert r.status_code == 200
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=strict" in cookie


def test_uscita_chiude_la_sessione(client_dentro):
    assert client_dentro.get("/api/stato?lingua=it").status_code == 200
    client_dentro.post("/api/uscita")
    assert client_dentro.get("/api/stato?lingua=it").status_code == 401


def test_animazioni_solo_dopo_accesso_e_solo_quelle_previste(client_dentro):
    r = client_dentro.get("/protetto/animazioni/ciclo_agente.js")
    assert r.status_code == 200 and "javascript" in r.headers["content-type"]
    assert client_dentro.get("/protetto/animazioni/nonesiste.js").status_code == 404


def test_lingue_interfaccia_e_lingua_non_prevista(client, client_dentro):
    assert client.get("/api/lingue").json() == {"lingue": ["it", "en"], "predefinita": "it"}
    it = client.get("/api/interfaccia?lingua=it").json()
    en = client.get("/api/interfaccia?lingua=en").json()
    assert set(it["testi"]) == set(en["testi"]) and it["testi"]["entra"] != en["testi"]["entra"]
    r = client_dentro.get("/api/percorso?lingua=fr")
    assert r.status_code == 400 and r.json()["errore"] == "configurazione"


def test_traduzione_mancante_esplicita(dati_config, tmp_path, orologio):
    # dal 16/11/2026 tutte le pillole hanno l'inglese: il caso si riproduce togliendo un testo a una copia del corso
    def togli_en(corso):
        p31 = next(p for m in corso["moduli"] for p in m["pillole"] if p["id"] == "P3.1")
        p31["scaletta"][0]["en"] = None
    c = client_dentro_con(config_con_corso(dati_config, tmp_path, togli_en), tmp_path, orologio)
    r = c.get("/api/pillole/P3.1?lingua=en")
    assert r.status_code == 409
    corpo = r.json()
    assert corpo["errore"] == "traduzione_mancante" and corpo["lingua"] == "en" and "$.scaletta[0]" in corpo["percorsi"]
    assert c.get("/api/pillole/P3.1?lingua=it").status_code == 200
    assert c.get("/api/pillole/P1.1?lingua=en").status_code == 200


def test_tutte_le_pillole_si_aprono_in_inglese(client_dentro, catalogo_vero):
    """Percorso utente standard: nessuna pillola risponde 'traduzione mancante', in nessuna lingua."""
    for p in catalogo_vero.corso.pillole():
        for lingua in catalogo_vero.cfg.lingue():
            r = client_dentro.get(f"/api/pillole/{p.id}?lingua={lingua}")
            assert r.status_code == 200, (p.id, lingua, r.json())


def test_pillola_inesistente(client_dentro):
    r = client_dentro.get("/api/pillole/P9.9?lingua=it")
    assert r.status_code == 404 and r.json()["errore"] == "non_trovato"


def test_flusso_quiz_via_api(client_dentro, dati_config, tmp_path, orologio):
    # uno spicchio senza abbastanza domande (qui P1.1 senza le domande degli autori) non si apre
    ridotto = client_dentro_con(config_con_corso(dati_config, tmp_path, senza_autori("P1.1")), tmp_path, orologio)
    assert ridotto.post("/api/spicchi/P1.1/inizia").json()["errore"] == "spicchio_non_erogabile"
    assert client_dentro.post("/api/spicchi/P1.3/inizia").status_code == 200
    d = client_dentro.get("/api/spicchi/P1.3/domanda?lingua=en").json()
    assert d["livello"] == 1 and d["progresso"]["striscia"] == 1
    e = client_dentro.post("/api/risposta?lingua=en", json={"posizione": 1}).json()
    assert "corretta" in e and "perche" in e and "salute" in e
    stato = client_dentro.get("/api/stato?lingua=en").json()
    assert stato["salute"] == e["salute"]
    r = client_dentro.post("/api/risposta?lingua=en", json={"posizione": 1})
    if e["prossimo"] != "livello2":
        assert r.status_code == 409 and r.json()["errore"] == "nessuna_domanda"
    assert client_dentro.get("/api/debriefing").json()["in_corso"] is False
    assert client_dentro.post("/api/debriefing/inizia").json()["errore"] == "niente_da_rivedere"
    assert client_dentro.get("/api/debriefing/domanda?lingua=it").json()["errore"] == "debriefing_non_iniziato"
    assert client_dentro.post("/api/debriefing/concludi").json()["errore"] == "debriefing_non_iniziato"
    assert client_dentro.post("/api/percorso/ricomincia").json()["giro"] == 2
    r = client_dentro.get("/api/rapporto").json()
    assert r["domande_erogabili"] == r["domande_totali"]


def test_sessione_scade(cfg, orologio):
    s = Sessioni(cfg, orologio)
    token = s.crea(EMAIL)
    assert s.email_di(token) == EMAIL
    orologio.avanza(cfg.prendi("account", "durata_sessione_ore") + 0.01)
    with pytest.raises(ErroreAccesso, match="scaduta"):
        s.email_di(token)
    with pytest.raises(ErroreAccesso):
        s.email_di(None)
    s.chiudi(None)


def test_modalita_account_non_implementata(dati_config):
    dati_config["account"]["modalita"] = "email_vera"
    with pytest.raises(ErroreConfigurazione, match="email_vera"):
        verifica_credenziali(EMAIL, "x", config_da(dati_config))
