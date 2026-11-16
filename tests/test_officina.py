"""Livello 2 «Officina»: modello (livello, id), dati propri, cancello dopo il livello 1, API /api/officina/*."""
from __future__ import annotations

import copy
import json

import pytest
from pydantic import ValidationError

from corso.catalogo import Catalogo
from corso.config import RADICE_PROGETTO, Config
from corso.errori import ErroreConfigurazione, ErroreFlusso
from corso.modello import Corso, KnowledgeGraph
from corso.motore import Motore
from corso.officina import Cancello, config_officina
from corso.stato import Archivio
from tests.conftest import EMAIL, client_dentro_con, config_da

FILE_CORSO_L2 = RADICE_PROGETTO / "dati" / "officina" / "corso_officina.json"
FILE_KG_L2 = RADICE_PROGETTO / "dati" / "officina" / "knowledge_graph_officina.json"


def dati_l2() -> dict:
    return json.loads(FILE_CORSO_L2.read_text(encoding="utf-8"))


def test_struttura_officina_6_unita():
    c = Corso.model_validate(dati_l2())
    assert c.livello == 2 and [m.id for m in c.moduli] == ["O1", "O2", "O3", "O4", "O5", "O6"]
    assert all(p.id.startswith("PO") for p in c.pillole()) and len(c.pillole()) == 12
    assert all(p.domande == [] for p in c.pillole())  # le domande le scrive il cantiere contenuti
    kg = KnowledgeGraph.model_validate(json.loads(FILE_KG_L2.read_text(encoding="utf-8")))
    assert all(n.id.startswith("CO") for n in kg.nodi)
    # testi strutturali completi in IT e EN
    for p in c.pillole():
        assert p.titolo.en and p.obiettivo.en and all(s.en for s in p.scaletta)


def test_livello_1_invariato_e_coerenza_dei_prefissi():
    l1 = json.loads((RADICE_PROGETTO / "dati" / "corso_v1.json").read_text(encoding="utf-8"))
    assert "livello" not in l1 and Corso.model_validate(l1).livello == 1
    mescolato = dati_l2()
    mescolato["livello"] = 1
    with pytest.raises(ValidationError, match="livello 1"):
        Corso.model_validate(mescolato)
    sbagliato = dati_l2()
    sbagliato["moduli"][0]["pillole"][0]["id"] = "P9.1"
    for d in sbagliato["moduli"][0]["pillole"][0]["domande"]:
        d["pillola"] = "P9.1"
    with pytest.raises(ValidationError, match="PO"):
        Corso.model_validate(sbagliato)


def test_catalogo_officina_si_carica_con_la_config_derivata(dati_config):
    cfg2 = config_officina(config_da(dati_config))
    cat = Catalogo(cfg2)
    r = cat.rapporto()
    assert r["pillole"] == 12 and r["concetti"] == 17 and r["domande_totali"] == 0 and r["lezioni_interattive"] == []
    # il file del livello 1 non e' toccato dalla config derivata
    assert config_da(dati_config).percorso_file("corso").name == "corso_v1.json"


def test_esercizi_per_unita_coprono_tutte_le_unita(dati_config):
    mappa = {k: v for k, v in dati_config["officina"]["esercizi_per_unita"].items() if not k.startswith("_")}
    assert mappa == {"O1": 7, "O2": 8, "O3": 9, "O4": 10, "O5": 11, "O6": 12}
    lab = json.loads((RADICE_PROGETTO / dati_config["officina"]["file_laboratorio"]).read_text(encoding="utf-8"))
    assert [e["numero"] for e in lab["esercizi"]["attivi"]] == sorted(mappa.values())


# ---------------------------------------------------------------- cancello


def cancello_con(dati_config, tmp_path, orologio, catalogo_vero, politica="dopo_livello1", deroga=True, alpha=True):
    dati = copy.deepcopy(dati_config)
    dati["officina"]["politica_sblocco"] = politica
    dati["officina"]["deroga_alpha"] = deroga
    dati["alpha"]["modalita_alpha"] = alpha
    cfg = config_da(dati)
    m1 = Motore(Catalogo(cfg), Archivio(tmp_path / "l1"), orologio)
    return Cancello(cfg, m1), m1


def test_cancello_politiche(dati_config, tmp_path, orologio, catalogo_vero):
    c, _ = cancello_con(dati_config, tmp_path, orologio, catalogo_vero, deroga=False)
    s = c.stato(EMAIL)
    assert not s["sbloccato"] and s["motivo"] == "livello1_incompleto" and s["livello1"]["spicchi_erogabili"] == 40
    with pytest.raises(ErroreFlusso, match="livello 1 completato"):
        c.verifica(EMAIL)
    c, _ = cancello_con(dati_config, tmp_path, orologio, catalogo_vero, deroga=True, alpha=True)
    assert c.stato(EMAIL)["motivo"] == "deroga_alpha" and c.stato(EMAIL)["deroga_alpha"]
    c, _ = cancello_con(dati_config, tmp_path, orologio, catalogo_vero, deroga=True, alpha=False)
    assert not c.stato(EMAIL)["sbloccato"]  # in beta la deroga non vale
    c, _ = cancello_con(dati_config, tmp_path, orologio, catalogo_vero, politica="libero", deroga=False, alpha=False)
    assert c.stato(EMAIL)["sbloccato"] and c.stato(EMAIL)["motivo"] == "libero"
    with pytest.raises(ErroreConfigurazione):
        cancello_con(dati_config, tmp_path, orologio, catalogo_vero, politica="a_caso")


def test_cancello_si_apre_a_livello_1_completato_e_resta_aperto(dati_config, tmp_path, orologio, catalogo_vero):
    c, m1 = cancello_con(dati_config, tmp_path, orologio, catalogo_vero, deroga=False, alpha=True)
    for p in m1.cat.corso.pillole():
        m1.assumi_superato(EMAIL, p.id)  # strumento alpha: tutti gli spicchi superati
    assert c.stato(EMAIL)["motivo"] == "livello1_completo"
    st = m1.stato(EMAIL)
    st.percorsi_completati = 1
    m1.archivio.salva(st)
    m1.ricomincia(EMAIL)  # nuovo giro: spicchi azzerati, ma l'Officina resta aperta
    assert c.stato(EMAIL)["sbloccato"]


# ---------------------------------------------------------------- API


def test_api_livelli_e_officina_in_alpha(client_dentro):
    r = client_dentro.get("/api/livelli?lingua=it").json()["livelli"]
    assert [l["numero"] for l in r] == [1, 2]
    l2 = r[1]
    assert l2["sbloccato"] and l2["deroga_alpha"] and [u["id"] for u in l2["unita"]] == ["O1", "O2", "O3", "O4", "O5", "O6"]
    assert [u["esercizio"] for u in l2["unita"]] == [7, 8, 9, 10, 11, 12] and all(u["domande_erogabili"] == 0 for u in l2["unita"])
    p = client_dentro.get("/api/officina/percorso?lingua=en").json()
    assert len(p["anelli"]) == 6 and all(s["stato"] == "in_preparazione" for a in p["anelli"] for s in a["spicchi"])
    assert p["corso"] == "Workshop: agents at the workbench"
    assert client_dentro.get("/api/officina/pillole/PO2.2?lingua=it").json()["titolo"] == "Containerizzare e correggere"
    assert client_dentro.get("/api/officina/stato?lingua=it").json()["salute"] == 100
    # stato separato: la salute dell'Officina non e' quella del livello 1
    assert client_dentro.post("/api/officina/spicchi/PO1.1/inizia").status_code == 409  # nessuna domanda ancora
    es = client_dentro.get("/api/officina/esercizi?lingua=it").json()["esercizi"]
    assert [e["numero"] for e in es] == [7, 8, 9, 10, 11, 12]
    assert [e["numero"] for e in client_dentro.get("/api/esercizi?lingua=it").json()["esercizi"]] == [1, 2, 3, 4, 5, 6]
    s = client_dentro.get("/api/officina/esercizi/8?lingua=it").json()
    assert s["tipo_area"] == "officina" and any(f["percorso"] == "app/agents/response_classifier.py" for f in s["area"]["file"])


def test_api_officina_bloccata_in_beta(dati_config, tmp_path, orologio):
    dati = copy.deepcopy(dati_config)
    dati["alpha"]["modalita_alpha"] = False
    c = client_dentro_con(config_da(dati), tmp_path, orologio)
    l2 = c.get("/api/livelli?lingua=it").json()["livelli"][1]
    assert not l2["sbloccato"] and l2["motivo"] == "livello1_incompleto"
    for metodo, url in [("GET", "/api/officina/percorso?lingua=it"), ("GET", "/api/officina/pillole/PO1.1?lingua=it"),
                        ("GET", "/api/officina/esercizi?lingua=it"), ("POST", "/api/officina/esercizi/7/verifica")]:
        r = c.request(metodo, url)
        assert r.status_code == 409 and r.json()["errore"] == "officina_bloccata", url
    assert c.get("/api/percorso?lingua=it").status_code == 200  # il livello 1 resta aperto


def test_api_officina_richiede_accesso(client):
    for url in ["/api/livelli?lingua=it", "/api/officina/percorso?lingua=it", "/api/officina/esercizi?lingua=it"]:
        assert client.get(url).status_code == 401


def test_officina_spenta(dati_config, tmp_path, orologio):
    dati = copy.deepcopy(dati_config)
    dati["officina"]["attiva"] = False
    c = client_dentro_con(config_da(dati), tmp_path, orologio)
    assert [l["numero"] for l in c.get("/api/livelli?lingua=it").json()["livelli"]] == [1]
    assert c.get("/api/officina/percorso?lingua=it").status_code == 404


def test_accesso_crea_anche_lo_stato_dell_officina(client, tmp_path):
    """La prima apertura dell'Officina fa stato + percorso in parallelo: lo stato deve esistere gia' (niente corsa sul file)."""
    assert client.post("/api/accesso", json={"email": EMAIL, "codice": "DEMO-AGENTI"}).status_code == 200
    assert client.app.state.motore_officina.archivio.esiste(EMAIL)


DOMANDA_ESEMPIO_OFFICINA = {
    "id": "DO1.1-esempio", "origine": "autori", "pillola": "PO1.1", "concetti": ["CO02"], "concetto_principale": "CO02",
    "segmento_aiuto": "scaletta-3", "striscia": "esempio_pratico",
    "livello1": {
        "domanda": {"it": "Cambi solo app.py e ricostruisci l'immagine. Quale Dockerfile riusa la cache delle dipendenze?",
                    "en": "You change only app.py and rebuild the image. Which Dockerfile reuses the dependency cache?"},
        "opzioni": [
            {"id": "A", "testo": {"it": "Copia requirements.txt, installa, poi copia il resto del codice",
                                  "en": "Copies requirements.txt, installs, then copies the rest of the code"}, "corretta": True},
            {"id": "B", "testo": {"it": "Copia tutto il codice e poi installa le dipendenze",
                                  "en": "Copies all the code and then installs the dependencies"}, "corretta": False, "tipo_distrattore": "quasi"},
            {"id": "C", "testo": {"it": "Installa le dipendenze con un tag latest sull'immagine",
                                  "en": "Installs the dependencies with a latest tag on the image"}, "corretta": False, "tipo_distrattore": "poco"},
            {"id": "D", "testo": {"it": "Usa un volume al posto del Dockerfile per il codice",
                                  "en": "Uses a volume instead of the Dockerfile for the code"}, "corretta": False, "tipo_distrattore": "errata"},
            {"id": "E", "testo": {"it": "Scrive tutto in una sola istruzione RUN molto lunga",
                                  "en": "Writes everything in one very long RUN instruction"}, "corretta": False, "tipo_distrattore": "poco"},
        ],
        "perche": {"it": "Uno strato si rifà solo se cambia lui o uno prima: le dipendenze restano in cache.",
                   "en": "A layer is rebuilt only if it or an earlier one changes: dependencies stay cached."},
    },
    "livello2": {
        "tipo": "motivazione",
        "domanda": {"it": "Perché quell'ordine fa risparmiare tempo?", "en": "Why does that order save time?"},
        "opzioni": [
            {"id": "A", "testo": {"it": "Gli strati prima del cambiamento restano validi e Docker li riusa",
                                  "en": "The layers before the change stay valid and Docker reuses them"}, "corretta": True},
            {"id": "B", "testo": {"it": "Docker installa le dipendenze in parallelo al codice copiato",
                                  "en": "Docker installs the dependencies in parallel with the copied code"}, "corretta": False, "tipo_distrattore": "quasi"},
            {"id": "C", "testo": {"it": "L'immagine finale pesa meno e quindi si scarica prima",
                                  "en": "The final image weighs less and so it downloads sooner"}, "corretta": False, "tipo_distrattore": "poco"},
            {"id": "D", "testo": {"it": "Il container parte senza Python e lo aggiunge dopo",
                                  "en": "The container starts without Python and adds it later"}, "corretta": False, "tipo_distrattore": "errata"},
            {"id": "E", "testo": {"it": "requirements.txt viene letto una volta sola per sempre",
                                  "en": "requirements.txt is read only once, forever"}, "corretta": False, "tipo_distrattore": "poco"},
        ],
        "perche": {"it": "La cache vale per strato, nell'ordine del Dockerfile.", "en": "The cache works per layer, in Dockerfile order."},
    },
}


def test_inserisci_domande_riconosce_l_officina(dati_config):
    """Il cantiere contenuti usera' strumenti/inserisci_domande.py: un lotto di pillole PO va nel corso dell'Officina."""
    import importlib.util
    spec = importlib.util.spec_from_file_location("inserisci_domande", RADICE_PROGETTO / "strumenti" / "inserisci_domande.py")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    assert m.livello_dei_lotti([DOMANDA_ESEMPIO_OFFICINA]) == 2
    with pytest.raises(m.ErroreInserimento, match="misti"):
        m.livello_dei_lotti([DOMANDA_ESEMPIO_OFFICINA, {**DOMANDA_ESEMPIO_OFFICINA, "id": "x", "pillola": "P1.1"}])
    cfg2 = m.config_del_livello(dati_config, 2)
    corso = json.loads(FILE_CORSO_L2.read_text(encoding="utf-8"))
    nuovo, motivi = m.verifica(corso, [DOMANDA_ESEMPIO_OFFICINA], cfg2)
    assert motivi == {"DO1.1-esempio": []}, motivi
    assert any(d["id"] == "DO1.1-esempio" for p in nuovo["moduli"][0]["pillole"] for d in p["domande"])
