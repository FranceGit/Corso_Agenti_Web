"""Motore del correttore: contratto, configurazione, registro LLM, posta, verbale, riproducibilita'."""
from __future__ import annotations

import json
import smtplib

import httpx
import pytest
from fastapi.testclient import TestClient

from corso.errori import ErroreConfigurazione, ErroreDati, ErroreFlusso, ErroreNonTrovato
from esercizi.ambiente.finto_llm_servizio import crea_app as crea_finto
from esercizi.catalogo.e01_pulizia_lead import ESERCIZIO as E1
from esercizi.motore.configurazione import FILE_LABORATORIO, carica_laboratorio
from esercizi.motore.contratto import Controllo, Esercizio, Esito, testo
from esercizi.motore.esecutore import (FORMATO_VERBALE, MotoreEsercizi, correggi, pseudonimo, seme_studente)
from esercizi.motore.llm import (ClientOllama, FintoLLM, ModelloConRegistro, RegistroLLM, compito_di)
from esercizi.motore.posta import PostaLocale, PostaMailpit

from .conftest import ALTRA, EMAIL, orologio
from .soluzioni import risolvi_e03

TABELLE = FILE_LABORATORIO.parent.parent / "finto_llm" / "tabelle.json"
SISTEMA = {"role": "system", "content": "COMPITO: classifica_risposta\nistruzioni"}


# ------------------------------------------------------------------ configurazione

def test_configurazione_completa_e_variabili_ambiente(tmp_path):
    cfg = carica_laboratorio(ambiente={"CORSO_LAB_LLM_BACKEND": "ollama", "CORSO_LAB_LLM_URL": "http://x:1",
                                       "CORSO_LAB_POSTA_BACKEND": "mailpit", "CORSO_LAB_CARTELLA_STATO": str(tmp_path)})
    assert cfg.prendi("llm", "backend") == "ollama" and cfg.prendi("llm", "url") == "http://x:1"
    assert cfg.prendi("posta", "backend") == "mailpit" and cfg.cartella_stato() == tmp_path
    assert cfg.soglia(1) == 80 and cfg.soglia(2) == 75 and cfg.soglia(3) == 80
    assert "_why_segmenti_errori_ammessi" not in cfg.parametri(1)


def test_backend_non_ammesso_si_ferma_con_errore_esplicito():
    with pytest.raises(ErroreConfigurazione, match="llm.backend 'gpt' non ammesso"):
        carica_laboratorio(ambiente={"CORSO_LAB_LLM_BACKEND": "gpt"})


def test_chiave_mancante_nominata(tmp_path):
    dati = json.loads(FILE_LABORATORIO.read_text(encoding="utf-8"))
    del dati["soglie"]["2"]
    f = tmp_path / "lab.json"
    f.write_text(json.dumps(dati), encoding="utf-8")
    cfg = carica_laboratorio(f, ambiente={}, sostituzioni={"cartella_stato": str(tmp_path / "s")})
    with pytest.raises(ErroreConfigurazione, match="soglie.2"):
        MotoreEsercizi(cfg, orologio)


# ------------------------------------------------------------------ contratto

class Finto(Esercizio):
    numero, id, versione, tipo_area = 9, "finto", "1", "nessuna"
    titolo = testo("Titolo", "Title")
    sottotitolo = testo("Sotto", "Sub")
    consegna = [testo("Fai", "Do")]

    def __init__(self, pesi=(60, 40), bloccante=False, esiti=(True, True)):
        self._pesi, self._bloccante, self._esiti = pesi, bloccante, esiti

    def prepara(self, lab): ...
    def area(self, lab, lingua): return {}
    def azione(self, lab, nome, parametri): return {}
    def fotografa(self, lab): return {}
    def chiave(self, seme): return {}

    def controlli(self):
        return [Controllo("a", testo("A", "A"), self._pesi[0], testo("aiuto", "help"),
                          lambda ctx: Esito(self._esiti[0], testo("a", "a"), frazione=None if self._esiti[0] else 0.5)),
                Controllo("b", testo("B", "B"), self._pesi[1], testo("aiuto", "help"),
                          lambda ctx: Esito(self._esiti[1], testo("b", "b")), bloccante=self._bloccante)]


def test_contratto_pesi_che_non_sommano_100():
    with pytest.raises(ErroreDati, match="sommare 100"):
        Finto(pesi=(60, 30)).valida()


def test_contratto_testo_senza_inglese():
    f = Finto()
    f.titolo = {"it": "solo italiano", "en": ""}
    with pytest.raises(ErroreDati, match="titolo"):
        f.valida()


def test_correggi_frazione_soglia_e_riassunto():
    v = correggi(Finto(esiti=(False, True)), {}, {}, {}, 70)
    assert v["voto"] == 70 and v["superato"] is True  # 30 (meta' di 60) + 40
    assert v["controlli"][0]["punti"] == 30.0 and v["falliti"] == ["a"]
    v = correggi(Finto(esiti=(False, True)), {}, {}, {}, 80)
    assert not v["superato"] and "Da rivedere: A" in v["riassunto"]["it"] and "To review: A" in v["riassunto"]["en"]


def test_controllo_bloccante_azzera_il_voto():
    v = correggi(Finto(bloccante=True, esiti=(True, False)), {}, {}, {}, 50)
    assert v["voto"] == 0 and not v["superato"] and v["bloccato_da"] == ["b"]
    assert "bloccante" in v["riassunto"]["it"]


def test_correggi_e_puro_e_le_impronte_dipendono_dall_ingresso():
    a = correggi(Finto(), {"x": 1}, {}, {}, 50)
    b = correggi(Finto(), {"x": 1}, {}, {}, 50)
    c = correggi(Finto(), {"x": 2}, {}, {}, 50)
    assert a == b
    assert a["impronta_ingresso"] != c["impronta_ingresso"] and a["impronta_esito"] != c["impronta_esito"]


def test_tutti_gli_esercizi_attivi_rispettano_il_contratto(motore):
    assert sorted(motore.esercizi) == [1, 2, 3]
    assert motore.piano == {1: 1, 2: 2, 3: 4}
    for es in motore.esercizi.values():
        es.valida()
        assert sum(c.peso for c in es.controlli()) == 100


# ------------------------------------------------------------------ finto-LLM e registro

def test_finto_llm_tabella_regole_ripiego():
    f = FintoLLM(TABELLE, "finto")
    assert f.rispondi([SISTEMA, {"role": "user", "content": "Grazie, ma per ora siamo a posto così."}]) == "Not Interested"
    assert f.rispondi([SISTEMA, {"role": "user", "content": "  GRAZIE, ma per ora   siamo a posto così. "}]) == "Not Interested"
    assert f.rispondi([SISTEMA, {"role": "user", "content": "Vi richiamerò io"}]) == "Maybe Interested"
    assert f.rispondi([SISTEMA, {"role": "user", "content": "Boh"}]) == "Interested"  # ripiego ottimista, come un modello piccolo
    assert f.rispondi([{"role": "user", "content": "ciao"}]) == "Non ho capito la richiesta."
    assert compito_di([SISTEMA]) == "classifica_risposta"


def test_registro_rende_identica_la_seconda_risposta(tmp_path):
    class Contatore:
        nome = "conta"

        def __init__(self):
            self.n = 0

        def rispondi(self, messaggi):
            self.n += 1
            return f"risposta {self.n}"

    base = Contatore()
    m = ModelloConRegistro(base, RegistroLLM(tmp_path / "r.sqlite"), {"temperatura": 0, "seme": 42})
    msg = [SISTEMA, {"role": "user", "content": "x"}]
    r1, r2 = m.completa(msg), m.completa(msg)
    assert r1["risposta"] == r2["risposta"] == "risposta 1" and base.n == 1
    assert not r1["dal_registro"] and r2["dal_registro"] and r1["chiave"] == r2["chiave"]
    # cambia anche solo un'opzione: e' un'altra richiesta
    m2 = ModelloConRegistro(base, RegistroLLM(tmp_path / "r.sqlite"), {"temperatura": 0, "seme": 43})
    assert m2.completa(msg)["risposta"] == "risposta 2"


def test_client_ollama_parla_con_il_servizio_finto():
    http = TestClient(crea_finto(TABELLE))
    c = ClientOllama("http://finto", "qualunque", 0, 42, 5, client=http)
    assert c.rispondi([SISTEMA, {"role": "user", "content": "Non siamo interessati, grazie."}]) == "Not Interested"
    assert http.get("/").text.strip('"') == "Ollama is running"
    assert http.get("/api/tags").json()["models"][0]["name"]
    r = http.post("/v1/chat/completions", json={"model": "x", "messages": [SISTEMA, {"role": "user", "content": "Perfetto, prenotiamo una call martedì alle 10?"}]})
    assert r.json()["choices"][0]["message"]["content"] == "Interested"
    r = http.post("/api/generate", json={"prompt": "Out of office: rientro lunedì.", "system": SISTEMA["content"]})
    assert r.json()["response"] == "Out of Office"


def test_client_ollama_irraggiungibile_da_errore_leggibile():
    def rotto(request):
        raise httpx.ConnectError("rifiutata")
    c = ClientOllama("http://nessuno:1", "m", 0, 42, 1, client=httpx.Client(transport=httpx.MockTransport(rotto), base_url="http://nessuno:1"))
    with pytest.raises(ErroreConfigurazione, match="non raggiungibile"):
        c.rispondi([{"role": "user", "content": "x"}])


# ------------------------------------------------------------------ posta

def test_posta_locale_separa_le_etichette_e_ordina(tmp_path):
    p = PostaLocale(tmp_path / "p.sqlite", "m@x.local")
    p.invia("s1", "b@x", "o", "c")
    p.invia("s1", "a@x", "o", "c")
    p.invia("s2", "z@x", "o", "c")
    assert [m["a"] for m in p.elenco("s1")] == ["a@x", "b@x"]
    p.svuota("s1")
    assert p.elenco("s1") == [] and len(p.elenco("s2")) == 1


def test_posta_mailpit_smtp_e_api():
    inviati, cancellati = [], []

    class FintoSMTP:
        def __init__(self, host, porta, timeout):
            assert (host, porta) == ("mailpit", 1025)

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def send_message(self, msg):
            inviati.append(msg)

    def api(request: httpx.Request):
        if request.method == "DELETE":
            cancellati.append(request.url.params["query"])
            return httpx.Response(200, json={})
        if request.url.path == "/api/v1/search":
            assert request.url.params["query"] == "tag:s-abc-e03"
            return httpx.Response(200, json={"messages": [{"ID": "1", "To": [{"Address": "b@x"}], "Subject": "Demo"}]})
        return httpx.Response(200, json={"Text": "corpo\n"})

    p = PostaMailpit("mailpit", 1025, "http://mailpit:8025", "m@x.local", 5,
                     client=httpx.Client(transport=httpx.MockTransport(api), base_url="http://mailpit:8025"), smtp_factory=FintoSMTP)
    p.invia("s-abc-e03", "b@x", "Demo", "corpo")
    assert inviati[0]["X-Tags"] == "s-abc-e03" and inviati[0]["To"] == "b@x"
    assert p.elenco("s-abc-e03") == [{"a": "b@x", "oggetto": "Demo", "corpo": "corpo"}]
    p.svuota("s-abc-e03")
    assert cancellati == ["tag:s-abc-e03"]


def test_posta_mailpit_spenta_da_errore_leggibile():
    def rifiuta(*a, **k):
        raise ConnectionRefusedError("spento")
    p = PostaMailpit("mailpit", 1025, "http://mailpit:8025", "m@x.local", 1, smtp_factory=rifiuta)
    with pytest.raises(ErroreConfigurazione, match="avvia_laboratorio"):
        p.invia("e", "a@x", "o", "c")
    assert smtplib  # il modulo vero resta quello di default fuori dai test


# ------------------------------------------------------------------ laboratorio, verbale, riproducibilita'

def test_pseudonimo_e_seme_per_studente(cfg_lab):
    s1, s2 = pseudonimo(EMAIL), pseudonimo(ALTRA)
    assert EMAIL not in s1 and len(s1) == 16 and s1 != s2
    assert pseudonimo(" Studente@Esempio.it ") == s1
    assert seme_studente(cfg_lab, s1) == seme_studente(cfg_lab, s1) != seme_studente(cfg_lab, s2)


def test_verbale_json_completo_e_salvato(motore, cfg_lab):
    v = motore.verifica(EMAIL, 1)
    assert v["formato"] == FORMATO_VERBALE and v["tentativo"] == 1 and v["data"] == "2026-11-16T09:00:00+00:00"
    assert v["esercizio"]["numero"] == 1 and v["studente"] == pseudonimo(EMAIL)
    for c in v["controlli"]:
        assert set(c) == {"id", "nome", "peso", "punti", "superato", "bloccante", "spiegazione", "aiuto"}
        assert c["spiegazione"]["it"] and c["spiegazione"]["en"]
    salvato = cfg_lab.cartella_stato() / "studenti" / pseudonimo(EMAIL) / "tentativi" / "e01_0001.json"
    assert json.loads(salvato.read_text(encoding="utf-8"))["verbale"] == v
    assert EMAIL not in salvato.read_text(encoding="utf-8")
    assert motore.verbale(EMAIL, 1, 1) == v
    assert motore.tentativi(EMAIL, 1) == [{"tentativo": 1, "data": v["data"], "voto": v["voto"], "superato": v["superato"]}]


def test_ricorrezione_identica_e_manomissione_rilevata(motore, cfg_lab):
    risolvi_e03(motore, EMAIL)
    v = motore.verifica(EMAIL, 3)
    r = motore.ricorreggi(EMAIL, 3, 1)
    assert r["identico"] and r["voto_ricorretto"] == v["voto"] == 100
    f = cfg_lab.cartella_stato() / "studenti" / pseudonimo(EMAIL) / "tentativi" / "e03_0001.json"
    dati = json.loads(f.read_text(encoding="utf-8"))
    dati["foto"]["scelte"]["correzione"] = "inverti"
    f.write_text(json.dumps(dati), encoding="utf-8")
    r = motore.ricorreggi(EMAIL, 3, 1)
    assert not r["identico"] and r["voto_ricorretto"] < 100
    with pytest.raises(ErroreNonTrovato):
        motore.ricorreggi(EMAIL, 3, 99)


def test_stesso_lavoro_in_due_laboratori_diversi_stesso_verbale(tmp_path):
    impronte = []
    for nome in ("a", "b"):
        cfg = carica_laboratorio(sostituzioni={"cartella_stato": str(tmp_path / nome)}, ambiente={})
        m = MotoreEsercizi(cfg, orologio)
        risolvi_e03(m, EMAIL, correzione="esatta")
        impronte.append([m.verifica(EMAIL, n)["impronta_esito"] for n in (1, 2, 3)])
        m.chiudi()
    assert impronte[0] == impronte[1]


def test_ricomincia_riporta_ai_dati_di_partenza_e_svuota_la_posta(motore):
    iniziale = motore.scheda(EMAIL, 3, "it")["area"]
    risolvi_e03(motore, EMAIL)
    assert motore.scheda(EMAIL, 3, "it")["area"]["posta"]
    motore.ricomincia(EMAIL, 3)
    assert motore.scheda(EMAIL, 3, "it")["area"] == iniziale


def test_esercizio_inesistente_e_azione_sconosciuta(motore):
    with pytest.raises(ErroreNonTrovato):
        motore.scheda(EMAIL, 42, "it")
    with pytest.raises(ErroreFlusso, match="non prevista"):
        motore.azione(EMAIL, 1, "cancella_tutto", {}, "it")
    with pytest.raises(ErroreFlusso, match="manca il parametro"):
        motore.azione(EMAIL, 1, "escludi", {}, "it")
    with pytest.raises(ErroreFlusso, match="tipo non valido"):
        motore.azione(EMAIL, 1, "escludi", {"contatto": True}, "it")


def test_ogni_azione_finisce_nel_registro_audit(motore):
    motore.azione(EMAIL, 1, "escludi", {"contatto": 1}, "it")
    lab = motore.laboratorio(EMAIL, 1)
    audit = lab.crm.righe("SELECT azione, dettagli FROM registro_audit")
    assert audit == [{"azione": "escludi", "dettagli": '{"contatto": 1}'}]


def test_e1_valida_il_contratto_anche_da_solo():
    E1.valida()
