"""Test dell'assistente nel repo dell'Officina: girano senza rete e senza chiavi (backend finto)."""
import json

import pytest

from assistente import ErroreAssistente, crea_assistente, valida
from assistente.configurazione import FILE_PREDEFINITO


def test_predefinito_finto_e_deterministico():
    a = crea_assistente(ambiente={})
    assert a.nome_backend == "finto"
    assert a.chiedi("una domanda") == a.chiedi("una domanda")


def test_configurazione_del_repo_valida_e_senza_chiavi():
    assert valida(json.loads(FILE_PREDEFINITO.read_text(encoding="utf-8"))) == []


def test_groq_senza_chiave_errore_parlante():
    with pytest.raises(ErroreAssistente, match="GROQ_API_KEY"):
        crea_assistente(ambiente={"ASSISTENTE_BACKEND": "groq"})
