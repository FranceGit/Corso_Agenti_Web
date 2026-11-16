"""Esercizi dell'Officina (7-12): contratto, partenza bocciata, soluzione a 100, bloccanti, ricorrezione, banco."""
from __future__ import annotations

import json

import pytest

from corso.config import RADICE_PROGETTO
from corso.errori import ErroreFlusso
from esercizi.motore.configurazione import carica_laboratorio
from esercizi.motore.esecutore import MotoreEsercizi
from esercizi.officina import analisi as A
from esercizi.officina import banco_classificatore as banco
from esercizi.officina.base import FORMATO_PACCHETTO
from esercizi.tests.conftest import EMAIL, orologio
from esercizi.tests.soluzioni_officina import (CLASSIFICATORE_ORIGINALE, CLASSIFICATORE_SOLO_ORDINE, SOLUZIONI, risolvi)

NUMERI = [7, 8, 9, 10, 11, 12]


@pytest.fixture
def officina(tmp_path):
    cfg = carica_laboratorio(RADICE_PROGETTO / "esercizi" / "config" / "officina.json",
                             sostituzioni={"cartella_stato": str(tmp_path / "officina")}, ambiente={})
    m = MotoreEsercizi(cfg, orologio)
    yield m
    m.chiudi()


def falliti(v):
    return set(v["falliti"])


def test_catalogo_officina_completo(officina):
    assert sorted(officina.esercizi) == NUMERI
    assert [officina.piano[n] for n in NUMERI] == ["O1", "O2", "O3", "O4", "O5", "O6"]
    for n in NUMERI:
        s = officina.scheda(EMAIL, n, "en")
        assert s["tipo_area"] == "officina" and s["area"]["file"] and s["area"]["pacchetto"]["formato"] == FORMATO_PACCHETTO
        assert all(set(x) >= {"percorso", "contenuto", "descrizione"} for x in s["area"]["file"])
        # la chiave (risposte giuste) non esce mai verso il browser
        assert all(set(o) == {"id", "testo"} for sc in s["area"]["scelte"] for o in sc["opzioni"])
        assert set(s["area"]) == {"unita", "materiale", "file", "scelte", "pacchetto"}


@pytest.mark.parametrize("numero", NUMERI)
def test_partenza_non_supera(officina, numero):
    v = officina.verifica(EMAIL, numero)
    assert not v["superato"] and v["voto"] < officina.cfg.soglia(numero)


@pytest.mark.parametrize("numero", NUMERI)
def test_soluzione_di_riferimento_100_e_ricorrezione_identica(officina, numero):
    risolvi(officina, EMAIL, numero)
    v = officina.verifica(EMAIL, numero)
    assert v["voto"] == 100 and v["superato"], [(c["id"], c["spiegazione"]["it"]) for c in v["controlli"] if not c["superato"]]
    r = officina.ricorreggi(EMAIL, numero, v["tentativo"])
    assert r["identico"] and r["voto_ricorretto"] == 100


def test_e07_chiave_nell_immagine_blocca(officina):
    dockerfile = SOLUZIONI[7][0]["Dockerfile"].replace("WORKDIR /app", "WORKDIR /app\nENV GROQ_API_KEY=abc123")
    risolvi(officina, EMAIL, 7, file={"Dockerfile": dockerfile})
    v = officina.verifica(EMAIL, 7)
    assert v["voto"] == 0 and v["bloccato_da"] == ["nessun_segreto"]


def test_e07_senza_volume_e_porta_aperta(officina):
    compose = SOLUZIONI[7][0]["docker-compose.yml"].replace('"127.0.0.1:8000:8000"', '"8000:8000"').replace("      - dati_crm:/app/dati\n", "")
    risolvi(officina, EMAIL, 7, file={"docker-compose.yml": compose})
    v = officina.verifica(EMAIL, 7)
    assert falliti(v) == {"volume_dati", "porta_locale"} and v["voto"] == 75 and not v["superato"]


def test_e08_difetto_non_corretto_blocca(officina):
    risolvi(officina, EMAIL, 8, file={"app/agents/response_classifier.py": CLASSIFICATORE_ORIGINALE})
    v = officina.verifica(EMAIL, 8)
    assert v["voto"] == 0 and "difetto_corretto" in v["bloccato_da"]
    riga = next(c for c in v["controlli"] if c["id"] == "difetto_corretto")
    assert "Interested" in riga["spiegazione"]["it"]


def test_e08_solo_ordine_corregge_il_difetto_ma_non_la_robustezza(officina):
    risolvi(officina, EMAIL, 8, file={"app/agents/response_classifier.py": CLASSIFICATORE_SOLO_ORDINE})
    v = officina.verifica(EMAIL, 8)
    assert "difetto_corretto" not in falliti(v) and "nessuna_regressione" not in falliti(v)
    assert "robustezza" in falliti(v) and v["superato"]  # 10 punti persi in parte: sopra la soglia di 80


def test_e08_chiave_nel_env_example_blocca(officina):
    risolvi(officina, EMAIL, 8, file={".env.example": "GROQ_API_KEY=gsk_" + "a" * 40 + "\n"})
    v = officina.verifica(EMAIL, 8)
    assert v["voto"] == 0 and "chiave_fuori" in v["bloccato_da"]


def test_e08_file_che_importa_os_non_viene_eseguito(officina):
    risolvi(officina, EMAIL, 8, file={"app/agents/response_classifier.py": "import os\nos.system('echo ciao')\n"})
    foto = officina.esercizio(8).fotografa(officina.laboratorio(EMAIL, 8))
    assert not foto["fatti"]["banco"]["ammesso"] and "os" in foto["fatti"]["banco"]["violazioni"][0]


def test_e09_schema_aperto_e_senza_formato(officina):
    s = json.loads(SOLUZIONI[9][0]["lead-create-request.schema.json"])
    s.pop("additionalProperties")
    s["properties"]["email"].pop("format")
    risolvi(officina, EMAIL, 9, file={"lead-create-request.schema.json": json.dumps(s)})
    assert falliti(officina.verifica(EMAIL, 9)) == {"chiuso", "tipi"}


def test_e10_radice_del_disco_blocca(officina):
    m = json.loads(SOLUZIONI[10][0]["mcp.json"])
    m["mcpServers"]["filesystem"]["args"][-1] = "/"
    risolvi(officina, EMAIL, 10, file={"mcp.json": json.dumps(m)})
    v = officina.verifica(EMAIL, 10)
    assert v["voto"] == 0 and "radici_minime" in v["bloccato_da"] and "simulazione" in falliti(v)


def test_e10_fetch_senza_protezioni(officina):
    m = json.loads(SOLUZIONI[10][0]["mcp.json"])
    m["mcpServers"]["fetch"]["args"].append("--allow-private-ips")
    risolvi(officina, EMAIL, 10, file={"mcp.json": json.dumps(m)})
    assert falliti(officina.verifica(EMAIL, 10)) == {"fetch_prudente"}


def test_e11_backend_groq_nel_file_e_modello_fuori_piano(officina):
    c = json.loads(SOLUZIONI[11][0]["assistente.json"])
    c["backend"] = "groq"
    c["groq"]["modello"] = "llama3-70b-8192"
    c["groq"]["modelli_free"].append("llama3-70b-8192")  # dichiararlo non basta: il correttore usa i suoi parametri
    risolvi(officina, EMAIL, 11, file={"assistente.json": json.dumps(c)})
    assert falliti(officina.verifica(EMAIL, 11)) == {"backend_finto", "groq_gratuito"}


def test_e12_otto_core_e_segreto_scritto(officina):
    d = A.carica_jsonc(SOLUZIONI[12][0]["devcontainer.json"])["dati"]
    d["hostRequirements"]["cpus"] = 8
    d["remoteEnv"] = {"GROQ_API_KEY": "la-mia-chiave"}
    risolvi(officina, EMAIL, 12, file={"devcontainer.json": json.dumps(d)})
    v = officina.verifica(EMAIL, 12)
    assert v["voto"] == 0 and v["bloccato_da"] == ["nessun_segreto"] and "macchina_piccola" in falliti(v)


def test_importa_pacchetto_e_errori(officina):
    file, _ = SOLUZIONI[7]
    r = officina.azione(EMAIL, 7, "importa_pacchetto", {"pacchetto": {"formato": FORMATO_PACCHETTO, "esercizio": 7,
                                                                     "file": {**file, "estraneo.txt": "x"}}}, "it")
    assert r["esito"]["importati"] == ["Dockerfile", "docker-compose.yml"] and r["esito"]["ignorati"] == ["estraneo.txt"]
    assert all(f["modificato"] for f in r["area"]["file"])
    with pytest.raises(ErroreFlusso):
        officina.azione(EMAIL, 7, "importa_pacchetto", {"pacchetto": {"formato": FORMATO_PACCHETTO, "esercizio": 8, "file": {}}}, "it")
    with pytest.raises(ErroreFlusso):
        officina.azione(EMAIL, 7, "salva_file", {"percorso": "../../segreto", "contenuto": "x"}, "it")
    with pytest.raises(ErroreFlusso):
        officina.azione(EMAIL, 7, "scegli", {"id": "dati_senza_volume", "valore": "inventata"}, "it")
    officina.azione(EMAIL, 7, "ripristina_file", {"percorso": "Dockerfile"}, "it")
    area = officina.scheda(EMAIL, 7, "it")["area"]
    assert not next(f for f in area["file"] if f["percorso"] == "Dockerfile")["modificato"]


# ---------------------------------------------------------------- banco e analisi


def test_banco_trova_il_difetto_reale_sul_file_originale():
    r = banco.esegui(CLASSIFICATORE_ORIGINALE)
    assert r["ammesso"] and r["errore"] is None
    assert r["esiti"]["not_interested"] == "Interested"  # il difetto: «Not Interested» diventa «Interested»
    v = banco.valuta(r["esiti"])
    assert not v["regressione"]["sbagliati"]


@pytest.mark.parametrize("codice, motivo", [
    ("import subprocess\n", "subprocess"),
    ("x = open('f')\n", "open"),
    ("x = ().__class__\n", "__class__"),
    ("from os import path\n", "os"),
    ("def f(:\n", "sintassi"),
])
def test_banco_rifiuta_codice_pericoloso(codice, motivo):
    r = banco.esegui(codice)
    assert not r["ammesso"] and motivo in " ".join(r["violazioni"])


def test_banco_ciclo_infinito_fermato():
    r = banco.esegui("while True:\n    pass\n", timeout_secondi=2)
    assert r["ammesso"] and "tempo scaduto" in r["errore"]


def test_banco_file_senza_classe():
    r = banco.esegui("x = 1\n")
    assert r["ammesso"] and "ResponseClassifierAgent" in r["errore"]


def test_analisi_dockerfile_e_compose():
    istr = A.istruzioni_dockerfile("FROM python:3.12-slim AS base\nRUN apt-get update \\\n  && apt-get install -y curl\n# commento\nENV A=1 TOKEN=\"\"\nUSER 0\n")
    assert [i for i, _ in istr] == ["FROM", "RUN", "ENV", "USER"] and A.immagine_base(istr) == "python:3.12-slim"
    assert A.segreti_dockerfile(istr) == [] and not A.non_root(istr)
    assert A.segreti_dockerfile(A.istruzioni_dockerfile("ENV API_KEY segretissimo")) == ["API_KEY"]
    assert not A.tag_fissato("python") and not A.tag_fissato("python:latest") and A.tag_fissato("registry:5000/x/python:3.12")
    assert A.tag_fissato("python@sha256:abc")
    porte = A.porte_pubblicate({"ports": ["127.0.0.1:8000:8000", "9000:9000", "7000", {"host_ip": "127.0.0.1", "published": 1, "target": 2}]})
    assert [p["ip"] for p in porte] == ["127.0.0.1", "", "", "127.0.0.1"]
    vol = A.volumi_servizio({"volumes": ["dati:/app/dati", "./x:/y", "/anonimo", {"source": "v", "target": "/z/"}]})
    assert [v["tipo"] for v in vol] == ["nominato", "cartella", "anonimo", "nominato"] and vol[3]["destinazione"] == "/z"
    assert "errore" in A.carica_yaml("services: [") and "errore" in A.carica_yaml("- solo una lista")
    assert A.variabili_servizio({"environment": ["A=1", "B"]}) == {"A": "1", "B": None}


def test_analisi_requisiti_jsonc_segreti():
    r = A.requisiti("# commento\nFastAPI==0.115.6\npydantic_settings>=2\n-r altro.txt\nuvicorn[standard]==0.34 ; python_version>'3'\n")
    assert [(x["nome"], x["fissato"]) for x in r] == [("fastapi", True), ("pydantic-settings", False), ("uvicorn", True)]
    d = A.carica_jsonc('// c\n{"a": "http://x//y", /* b */ "b": [1, 2,],}')
    assert d["dati"] == {"a": "http://x//y", "b": [1, 2]}
    assert "errore" in A.carica_jsonc("{") and "errore" in A.carica_jsonc("[1]")
    assert A.segreti_nel_testo("x = 'gsk_" + "B" * 24 + "'") == ["groq"] and A.segreti_nel_testo("gsk_...") == []
    assert not A.valore_sembra_segreto("GROQ_API_KEY", "") and not A.valore_sembra_segreto("GROQ_API_KEY", "${localEnv:GROQ_API_KEY}")
    assert A.valore_sembra_segreto("GROQ_API_KEY", "gsk_...") and not A.valore_sembra_segreto("SMTP_HOST", "mailpit")
