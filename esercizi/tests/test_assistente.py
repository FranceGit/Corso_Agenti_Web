"""Assistente libero (O5): tre backend, configurazione validata, errori parlanti, nessun ripiego silenzioso, nessuna rete."""
from __future__ import annotations

import json

import pytest

from esercizi.assistente import Assistente, ErroreAssistente, crea_assistente, valida
from esercizi.assistente.__main__ import main as cli
from esercizi.assistente.backend import BackendFinto, BackendGroq, BackendOllama
from esercizi.assistente.configurazione import FILE_PREDEFINITO, carica


def config(**modifiche) -> dict:
    d = json.loads(FILE_PREDEFINITO.read_text(encoding="utf-8"))
    for k, v in modifiche.items():
        d[k] = v
    return d


def scrivi(tmp_path, dati) -> str:
    f = tmp_path / "assistente.json"
    f.write_text(json.dumps(dati), encoding="utf-8")
    return str(f)


class Trasporto:
    """Trasporto finto: registra le richieste e risponde come gli si dice (nessuna rete)."""

    def __init__(self, stato=200, corpo=None, intestazioni=None, errore=None):
        self.stato, self.corpo, self.intestazioni, self.errore = stato, corpo, intestazioni or {}, errore
        self.richieste = []

    def __call__(self, url, intestazioni, corpo, timeout):
        self.richieste.append((url, intestazioni, corpo, timeout))
        if self.errore:
            raise self.errore
        return self.stato, self.intestazioni, self.corpo if isinstance(self.corpo, str) else json.dumps(self.corpo)


def test_configurazione_del_repo_valida_finta_e_senza_chiavi():
    d = config()
    assert valida(d) == [] and d["backend"] == "finto"
    assert "gsk_" not in FILE_PREDEFINITO.read_text(encoding="utf-8")


def test_finto_deterministico_tabella_ed_eco():
    a = crea_assistente(ambiente={})
    assert isinstance(a, Assistente) and a.nome_backend == "finto"
    assert a.chiedi("  CIAO ") == a.chiedi("ciao") and "finto" in a.chiedi("ciao")
    r1, r2 = a.chiedi("una domanda qualsiasi"), a.chiedi("una domanda qualsiasi")
    assert r1 == r2 and "una domanda qualsiasi" in r1 and "impronta" in r1
    assert a.chiedi("altra domanda") != r1
    with pytest.raises(ErroreAssistente, match="vuota"):
        a.chiedi("   ")


def test_backend_da_variabile_d_ambiente_e_valore_non_ammesso():
    with pytest.raises(ErroreAssistente, match="non ammesso"):
        crea_assistente(ambiente={"ASSISTENTE_BACKEND": "openai"})
    t = Trasporto(corpo={"message": {"content": " dal modello locale "}})
    a = crea_assistente(ambiente={"ASSISTENTE_BACKEND": "ollama"}, trasporto=t)
    assert a.nome_backend == "ollama" and a.chiedi("ciao") == "dal modello locale"
    url, _, corpo, _ = t.richieste[0]
    assert url.endswith("/api/chat") and corpo["model"] == "qwen2.5:3b" and corpo["options"]["temperature"] == 0
    assert corpo["messages"][0]["role"] == "system" and corpo["messages"][-1]["content"] == "ciao"


def test_groq_senza_chiave_si_ferma_subito_e_dice_come_rimediare():
    for ambiente in ({"ASSISTENTE_BACKEND": "groq"}, {"ASSISTENTE_BACKEND": "groq", "GROQ_API_KEY": "  "}):
        with pytest.raises(ErroreAssistente) as e:
            crea_assistente(ambiente=ambiente, trasporto=Trasporto())
        msg = str(e.value)
        assert "GROQ_API_KEY" in msg and "Codespaces" in msg and "ASSISTENTE_BACKEND=finto" in msg


def test_groq_con_chiave_manda_bearer_e_non_la_stampa():
    t = Trasporto(corpo={"choices": [{"message": {"content": "risposta"}}]})
    a = crea_assistente(ambiente={"ASSISTENTE_BACKEND": "groq", "GROQ_API_KEY": "chiave-di-prova"}, trasporto=t)
    assert a.chiedi("ciao") == "risposta"
    url, intestazioni, corpo, _ = t.richieste[0]
    assert url.startswith("https://api.groq.com/") and intestazioni["Authorization"] == "Bearer chiave-di-prova"
    assert corpo["model"] == "llama-3.1-8b-instant" and corpo["max_tokens"] == 512


@pytest.mark.parametrize("stato, intestazioni, attesa", [
    (401, {}, "rifiutato la chiave"),
    (403, {}, "rifiutato la chiave"),
    (429, {"Retry-After": "17"}, "riprova fra 17 secondi"),
    (404, {}, "non conosce il modello"),
    (500, {}, "HTTP 500"),
])
def test_groq_errori_http_parlanti_mai_ripiego(stato, intestazioni, attesa):
    t = Trasporto(stato=stato, corpo="dettaglio", intestazioni=intestazioni)
    a = crea_assistente(ambiente={"ASSISTENTE_BACKEND": "groq", "GROQ_API_KEY": "chiave-segreta-xyz"}, trasporto=t)
    with pytest.raises(ErroreAssistente) as e:
        a.chiedi("ciao")
    assert attesa in str(e.value) and "chiave-segreta-xyz" not in str(e.value)


def test_rete_assente_e_risposte_illeggibili():
    giu = Trasporto(errore=ConnectionError("rifiutata"))
    with pytest.raises(ErroreAssistente, match="ollama serve"):
        crea_assistente(ambiente={"ASSISTENTE_BACKEND": "ollama"}, trasporto=giu).chiedi("ciao")
    with pytest.raises(ErroreAssistente, match="non raggiungibile"):
        crea_assistente(ambiente={"ASSISTENTE_BACKEND": "groq", "GROQ_API_KEY": "k"}, trasporto=giu).chiedi("ciao")
    with pytest.raises(ErroreAssistente, match="non leggibile"):
        crea_assistente(ambiente={"ASSISTENTE_BACKEND": "groq", "GROQ_API_KEY": "k"}, trasporto=Trasporto(corpo={"x": 1})).chiedi("ciao")
    with pytest.raises(ErroreAssistente, match="ollama pull"):
        crea_assistente(ambiente={"ASSISTENTE_BACKEND": "ollama"}, trasporto=Trasporto(stato=404, corpo="")).chiedi("ciao")
    with pytest.raises(ErroreAssistente, match="risposta vuota"):
        crea_assistente(ambiente={"ASSISTENTE_BACKEND": "ollama"}, trasporto=Trasporto(corpo={"message": {"content": "  "}})).chiedi("ciao")


@pytest.mark.parametrize("modifica, problema", [
    (lambda d: d.update(backend="openai"), "non e' fra i backend_ammessi"),
    (lambda d: d["groq"].update(api_key="abc"), "groq.api_key"),
    (lambda d: d["groq"].update(modello="llama3-70b-8192"), "non e' fra i modelli_free"),
    (lambda d: d["groq"].update(url="http://api.groq.com/x"), "https"),
    (lambda d: d["groq"].update(variabile_chiave="gsk_" + "a" * 30), "variabile_chiave"),
    (lambda d: d.pop("_why_backend"), "_why_backend"),
    (lambda d: d["ollama"].pop("_why"), "'ollama' non ha '_why'"),
    (lambda d: d.update(temperatura=5), "temperatura"),
    (lambda d: d.update(max_token=True), "max_token"),
    (lambda d: d.pop("finto"), "sezione 'finto'"),
    (lambda d: d["finto"].update(risposta_predefinita="sk-" + "x" * 30), "finto.risposta_predefinita"),
])
def test_validatore(modifica, problema):
    d = config()
    modifica(d)
    assert any(problema in p for p in valida(d)), valida(d)


def test_carica_errori_espliciti(tmp_path):
    with pytest.raises(ErroreAssistente, match="non trovata"):
        carica(tmp_path / "manca.json")
    (tmp_path / "rotto.json").write_text("{", encoding="utf-8")
    with pytest.raises(ErroreAssistente, match="JSON non valido"):
        carica(tmp_path / "rotto.json")
    d = config()
    d["groq"]["token"] = "x"
    with pytest.raises(ErroreAssistente, match="configurazione non valida"):
        carica(scrivi(tmp_path, d))
    assert valida([]) == ["la configurazione deve essere un oggetto JSON"]


def test_classi_backend_dirette():
    sez = config()
    assert BackendFinto(sez["finto"]).nome == "finto"
    assert BackendOllama(sez["ollama"], 0, 10, 5, Trasporto()).url == "http://127.0.0.1:11434/api/chat"
    with pytest.raises(ErroreAssistente):
        BackendGroq(sez["groq"], 0, 10, 5, ambiente={}, trasporto=Trasporto())


def test_riga_di_comando(capsys, tmp_path, monkeypatch):
    monkeypatch.delenv("ASSISTENTE_BACKEND", raising=False)
    assert cli(["ciao"]) == 0 and capsys.readouterr().out.startswith("[finto] ")
    monkeypatch.setenv("ASSISTENTE_BACKEND", "groq")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    assert cli(["ciao"]) == 2 and "GROQ_API_KEY" in capsys.readouterr().err
