"""Cantiere ALPHA-FIX: domanda precedente in sola lettura, riepilogo di fine spicchio, acceleratori alpha,
glossario delle domande, bibliografia senza URL."""
from __future__ import annotations

import copy
import json

import pytest

from corso.app import carica_bibliografia
from corso.errori import ErroreFlusso

from tests.conftest import EMAIL, config_con_corso, config_da, motore_con, posizione, striscia_pulita

PID = "P1.3"


def _salute(motore) -> int:
    return motore.stato(EMAIL).salute


def test_config_alpha_dichiarata(dati_config):
    a = dati_config["alpha"]
    assert a["modalita_alpha"] is True
    assert "beta" in a["_why"] and "false" in a["_why"]  # il _why dice che in beta va spenta
    assert a["riepilogo_in_beta"] in ("solo_superato", "sempre", "mai")


def test_riepilogo_studente_porta_i_flag_alpha(motore):
    r = motore.riepilogo(EMAIL, "it")
    assert r["alpha"] == {"modalita_alpha": True, "riepilogo_in_beta": "solo_superato"}


# ---------------------------------------------------------------- (2) domanda precedente

def test_rivedere_una_risposta_non_tocca_la_salute(motore):
    motore.inizia_spicchio(EMAIL, PID)
    motore.domanda_spicchio(EMAIL, PID, "it")
    sbagliata = posizione(motore, EMAIL, False)
    esito = motore.rispondi(EMAIL, sbagliata, "it")
    assert esito["danno"] > 0
    dopo = _salute(motore)
    prossima = motore.domanda_spicchio(EMAIL, PID, "it")
    assert prossima["progresso"]["risposte_date"] == 1
    prima_file = motore.archivio._file(EMAIL).read_text(encoding="utf-8")

    v = motore.rivedi_risposta(EMAIL, PID, 0, "it")
    assert v["posizione_scelta"] == sbagliata
    assert v["posizione_corretta"] == esito["posizione_corretta"]
    assert v["corretta"] is False and v["perche"] and v["indice"] == 0 and v["totale"] == 1
    assert v["opzioni"] and v["scelta"]["testo"]
    # nessuna scrittura: salute, domanda in corso e file di stato identici
    assert _salute(motore) == dopo
    assert motore.archivio._file(EMAIL).read_text(encoding="utf-8") == prima_file
    assert motore.domanda_spicchio(EMAIL, PID, "it") == prossima
    # in inglese stessa risposta, testi tradotti
    ven = motore.rivedi_risposta(EMAIL, PID, 0, "en")
    assert ven["posizione_scelta"] == sbagliata and ven["testo"] != v["testo"]


def test_rivedere_fuori_indice_o_senza_risposte(motore):
    motore.inizia_spicchio(EMAIL, PID)
    with pytest.raises(ErroreFlusso, match="non ci sono ancora risposte"):
        motore.rivedi_risposta(EMAIL, PID, 0, "it")
    striscia_pulita(motore, EMAIL, PID)
    assert motore.rivedi_risposta(EMAIL, PID, 1, "it")["livello"] == 2
    with pytest.raises(ErroreFlusso, match="fuori"):
        motore.rivedi_risposta(EMAIL, PID, 2, "it")


def test_strumenti_alpha_spenti_in_beta(dati_config, tmp_path, orologio):
    m = motore_con(dati_config, tmp_path, orologio, **{"alpha.modalita_alpha": False})
    m.inizia_spicchio(EMAIL, PID)
    striscia_pulita(m, EMAIL, PID)
    with pytest.raises(ErroreFlusso, match="alpha"):
        m.rivedi_risposta(EMAIL, PID, 0, "it")
    with pytest.raises(ErroreFlusso, match="alpha"):
        m.assumi_superato(EMAIL, PID)


# ---------------------------------------------------------------- (3) riepilogo di fine spicchio

def test_riepilogo_in_alpha_sempre_disponibile(motore):
    prima = motore.riepilogo_spicchio(EMAIL, PID, "it")  # anche prima di iniziare
    assert prima["stato"] == "da_iniziare" and prima["voci"]
    assert all(L["risposta_data"] is None for v in prima["voci"] for L in v["livelli"])
    motore.inizia_spicchio(EMAIL, PID)
    striscia_pulita(motore, EMAIL, PID)
    r = motore.riepilogo_spicchio(EMAIL, PID, "it")
    sp = motore.stato(EMAIL).spicchi[PID]
    assert [v["domanda"] for v in r["voci"]] == sp.strisce
    v1 = r["voci"][0]
    assert [L["livello"] for L in v1["livelli"]] == [1, 2]
    for L in v1["livelli"]:
        assert L["corretta"] is True and L["risposta_data"]["testo"] == L["risposta_giusta"] and L["perche"]
    assert all(L["risposta_data"] is None for v in r["voci"][1:] for L in v["livelli"])


def test_riepilogo_in_beta_solo_a_spicchio_superato(dati_config, tmp_path, orologio):
    m = motore_con(dati_config, tmp_path, orologio, **{"alpha.modalita_alpha": False})
    m.inizia_spicchio(EMAIL, PID)
    with pytest.raises(ErroreFlusso, match="riepilogo"):
        m.riepilogo_spicchio(EMAIL, PID, "it")
    totale = len(m.stato(EMAIL).spicchi[PID].strisce)
    for _ in range(totale):
        ultimo = striscia_pulita(m, EMAIL, PID)
    assert ultimo["prossimo"] == "spicchio_concluso" and ultimo["spicchio"]["stato"] == "superato"
    r = m.riepilogo_spicchio(EMAIL, PID, "en")
    assert len(r["voci"]) == totale and r["modalita_alpha"] is False


@pytest.mark.parametrize("regola, disponibile", [("sempre", True), ("mai", False)])
def test_riepilogo_in_beta_regole(dati_config, tmp_path, orologio, regola, disponibile):
    m = motore_con(dati_config, tmp_path, orologio, **{"alpha.modalita_alpha": False, "alpha.riepilogo_in_beta": regola})
    m.inizia_spicchio(EMAIL, PID)
    if disponibile:
        assert m.riepilogo_spicchio(EMAIL, PID, "it")["voci"]
    else:
        with pytest.raises(ErroreFlusso):
            m.riepilogo_spicchio(EMAIL, PID, "it")


# ---------------------------------------------------------------- (5) assumi superato

def test_assumi_superato_zero_errori_e_prossimo_spicchio(motore):
    salute = _salute(motore)
    r = motore.assumi_superato(EMAIL, PID)
    st = motore.stato(EMAIL)
    sp = st.spicchi[PID]
    assert sp.stato == "superato" and sp.assunto is True
    assert len(sp.esiti) == len(sp.strisce) and all(e.pulito and e.danno == 0 for e in sp.esiti)
    assert st.salute == salute and st.in_corso is None and st.padronanza == {}
    assert r["prossimo_spicchio"] not in (None, PID)
    vista = motore.vista_percorso(EMAIL, "it")
    stati = {s["pillola"]: s for a in vista["anelli"] for s in a["spicchi"]}
    assert stati[PID]["stato"] == "superato"
    assert stati[r["prossimo_spicchio"]]["stato"] != "superato" and stati[r["prossimo_spicchio"]]["erogabile"]
    assert motore.riepilogo_spicchio(EMAIL, PID, "it")["assunto"] is True


def test_assumi_superato_a_meta_spicchio(motore):
    motore.inizia_spicchio(EMAIL, PID)
    motore.domanda_spicchio(EMAIL, PID, "it")
    motore.assumi_superato(EMAIL, PID)
    st = motore.stato(EMAIL)
    assert st.in_corso is None and st.spicchi[PID].stato == "superato"


# ---------------------------------------------------------------- (a) glossario delle domande

def _con_glossario(corso: dict) -> None:
    for m in corso["moduli"]:
        for p in m["pillole"]:
            if p["id"] == PID:
                for d in p["domande"]:
                    d["glossario"] = [
                        {"termine": "agente", "it": "Programma che persegue un obiettivo usando strumenti.", "en": "Program that pursues a goal using tools."},
                        {"termine": "CRM", "it": "Archivio dei clienti.", "en": None},
                    ]


def test_glossario_nella_domanda(dati_config, tmp_path, orologio, catalogo_vero):
    from corso.catalogo import Catalogo
    from corso.motore import Motore
    from corso.stato import Archivio

    cfg = config_con_corso(dati_config, tmp_path, _con_glossario)
    cat = Catalogo(cfg)
    m = Motore(cat, Archivio(tmp_path / "st"), orologio)
    did = cat.corso.pillola(PID).domande[0].id
    d = cat.domanda(did)
    assert len(d.glossario) == 2
    # il glossario non cambia l'erogabilita' (una definizione inglese mancante non blocca la domanda)
    assert cat.erogabile(did) == catalogo_vero.erogabile(did)
    ordine = [o.id for o in d.livello1.opzioni]
    it = m._vista_domanda(d, 1, ordine, "it")["glossario"]
    en = m._vista_domanda(d, 1, ordine, "en")["glossario"]
    assert [g["termine"] for g in it] == ["agente", "CRM"]
    assert [g["termine"] for g in en] == ["agente"]  # senza inglese la voce non si mostra (mai l'italiano al suo posto)
    assert en[0]["definizione"].startswith("Program")
    assert catalogo_vero.domanda(did).glossario is None  # nel corso vero il campo resta facoltativo


def test_glossario_campo_facoltativo_del_modello():
    from corso.modello import VoceGlossario
    v = VoceGlossario(termine="token", it="Pezzo di testo.")
    assert v.en is None
    with pytest.raises(Exception):
        VoceGlossario(termine="", it="x")


# ---------------------------------------------------------------- (b) bibliografia

def test_bibliografia_esempio_quando_manca_il_file(dati_config, tmp_path):
    dati = copy.deepcopy(dati_config)
    dati["percorsi_file"]["bibliografia"] = str(tmp_path / "non_esiste.json")
    b = carica_bibliografia(config_da(dati), "it")
    assert b["esempio"] is True and b["opere"]
    assert all("url" not in o and "http" not in json.dumps(o) for o in b["opere"])


def test_bibliografia_vera_senza_url(dati_config, tmp_path):
    f = tmp_path / "bibliografia.json"
    f.write_text(json.dumps({"opere": [
        {"id": "wp1", "titolo": {"it": "Agenti", "en": "Agents"}, "autori": ["A. Rossi", "B. Bianchi"], "anno": 2025, "url": "https://x.invalid", "link": "y"},
        {"titolo": {"it": "Solo italiano", "en": None}},
        "Titolo semplice",
    ]}), encoding="utf-8")
    dati = copy.deepcopy(dati_config)
    dati["percorsi_file"]["bibliografia"] = str(f)
    cfg = config_da(dati)
    it = carica_bibliografia(cfg, "it")
    en = carica_bibliografia(cfg, "en")
    assert it["esempio"] is False
    assert [o["titolo"] for o in it["opere"]] == ["Agenti", "Solo italiano", "Titolo semplice"]
    assert [o["titolo"] for o in en["opere"]] == ["Agents", "Titolo semplice"]
    assert it["opere"][0]["autori"] == "A. Rossi, B. Bianchi"
    assert all(set(o) <= {"id", "titolo", "autori", "anno", "editore", "tipo", "nota"} for o in it["opere"] + en["opere"])


# ---------------------------------------------------------------- API

def test_api_alpha_fix(client_dentro):
    c = client_dentro
    assert c.get("/api/stato?lingua=it").json()["alpha"]["modalita_alpha"] is True
    assert c.post(f"/api/spicchi/{PID}/inizia").status_code == 200
    d = c.get(f"/api/spicchi/{PID}/domanda?lingua=it").json()
    assert d["progresso"]["risposte_date"] == 0 and "glossario" in d
    assert c.get(f"/api/spicchi/{PID}/rivedi/0?lingua=it").status_code == 409
    e = c.post("/api/risposta?lingua=it", json={"posizione": 1}).json()
    salute = e["salute"]
    v = c.get(f"/api/spicchi/{PID}/rivedi/0?lingua=en")
    assert v.status_code == 200 and v.json()["posizione_scelta"] == 1
    assert c.get("/api/stato?lingua=it").json()["salute"] == salute
    r = c.get(f"/api/spicchi/{PID}/riepilogo?lingua=it")
    assert r.status_code == 200 and r.json()["voci"][0]["livelli"][0]["risposta_data"] is not None
    a = c.post(f"/api/spicchi/{PID}/assumi_superato")
    assert a.status_code == 200 and a.json()["spicchio"]["stato"] == "superato"
    b = c.get("/api/bibliografia?lingua=en")
    assert b.status_code == 200 and "opere" in b.json()


def test_testi_della_shell_tutti_in_interfaccia():
    """Ogni t("chiave") della shell esiste in IT e EN (niente «[chiave]» a schermo)."""
    import re

    from corso.config import RADICE_PROGETTO
    js = (RADICE_PROGETTO / "webapp" / "app.js").read_text(encoding="utf-8")
    testi = json.loads((RADICE_PROGETTO / "config" / "interfaccia.json").read_text(encoding="utf-8"))
    usate = {k for k in re.findall(r'\bt\("([a-z0-9_]+)"', js) if not k.endswith("_")}  # "stato_" + x: prefissi composti
    mancanti = sorted(k for k in usate if k not in testi or not testi[k].get("it") or not testi[k].get("en"))
    assert not mancanti, mancanti


def test_api_bibliografia_richiede_accesso(client):
    assert client.get("/api/bibliografia?lingua=it").status_code == 401
