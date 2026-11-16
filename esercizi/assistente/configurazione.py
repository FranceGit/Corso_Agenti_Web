"""Configurazione dell'assistente libero (O5): prima la configurazione, poi il codice; ogni scelta col suo _why.

Regole (controllate da `valida`, usate anche dal correttore dell'esercizio 11):
  - backend fra quelli ammessi: "finto" (predefinito, deterministico, per test e correttore), "ollama" (locale),
    "groq" (piano gratuito, in rete);
  - NESSUNA chiave nel file: per Groq si scrive solo il NOME della variabile d'ambiente (variabile_chiave);
  - l'unica sostituzione da fuori e' il backend, dalla variabile indicata in `variabile_backend`
    (es. ASSISTENTE_BACKEND=groq), cosi' il file nel repo resta sul backend finto;
  - nessun valore di ripiego nel codice: una chiave mancante e' un errore che la nomina.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Mapping

FILE_PREDEFINITO = Path(__file__).parent / "assistente.json"
BACKEND = ("finto", "ollama", "groq")
NOME_VARIABILE = re.compile(r"^[A-Z_][A-Z0-9_]*$")
NOME_SEGRETO = re.compile(r"(KEY|TOKEN|SECRET|PASSWORD|CHIAVE)", re.IGNORECASE)
FORMA_CHIAVE = re.compile(r"(gsk_[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_\w{30,}|sk-[A-Za-z0-9_-]{20,})")
CAMPI_SEZIONE = {
    "finto": {"risposte": dict, "risposta_predefinita": str},
    "ollama": {"url": str, "modello": str},
    "groq": {"url": str, "modello": str, "variabile_chiave": str, "modelli_free": list},
}
CAMPI_RADICE = {"backend": str, "backend_ammessi": list, "variabile_backend": str, "istruzioni_sistema": str,
                "temperatura": (int, float), "max_token": int, "timeout_secondi": (int, float)}


class ErroreAssistente(Exception):
    """Errore PARLANTE: dice cosa manca o cosa e' andato storto e come rimediare. Mai un ripiego silenzioso."""


def _segreti(nodo, percorso: str = "") -> list[str]:
    """Campi che contengono (o sembrano contenere) una chiave. variabile_chiave e' ammessa: contiene un NOME."""
    out = []
    if isinstance(nodo, dict):
        for k, v in nodo.items():
            dove = f"{percorso}.{k}" if percorso else k
            if isinstance(v, str) and not k.startswith("_"):
                if FORMA_CHIAVE.search(v):
                    out.append(dove)
                elif NOME_SEGRETO.search(k) and k != "variabile_chiave" and v.strip():
                    out.append(dove)
            out += _segreti(v, dove)
    elif isinstance(nodo, list):
        for i, v in enumerate(nodo):
            out += _segreti(v, f"{percorso}[{i}]")
    return out


def valida(dati) -> list[str]:
    """Elenco dei problemi (vuoto = configurazione valida). Non solleva mai: e' usata anche per correggere."""
    if not isinstance(dati, dict):
        return ["la configurazione deve essere un oggetto JSON"]
    problemi = []
    if not str(dati.get("_why", "")).strip():
        problemi.append("manca '_why' (perche' esiste questa configurazione)")
    for chiave, tipo in CAMPI_RADICE.items():
        if chiave not in dati:
            problemi.append(f"manca la chiave '{chiave}'")
        elif not isinstance(dati[chiave], tipo) or isinstance(dati[chiave], bool):
            problemi.append(f"'{chiave}' ha un tipo sbagliato")
        elif not str(dati.get(f"_why_{chiave}", "")).strip() and chiave in ("backend", "variabile_backend", "temperatura", "max_token"):
            problemi.append(f"manca '_why_{chiave}' (il perche' della scelta)")
    ammessi = dati.get("backend_ammessi") if isinstance(dati.get("backend_ammessi"), list) else []
    if any(b not in BACKEND for b in ammessi) or not ammessi:
        problemi.append(f"backend_ammessi deve contenere solo valori fra {list(BACKEND)}")
    if dati.get("backend") not in ammessi:
        problemi.append(f"backend '{dati.get('backend')}' non e' fra i backend_ammessi {ammessi}")
    if isinstance(dati.get("variabile_backend"), str) and not NOME_VARIABILE.match(dati["variabile_backend"]):
        problemi.append("variabile_backend deve essere un nome di variabile d'ambiente (MAIUSCOLE_E_TRATTINI)")
    if isinstance(dati.get("temperatura"), (int, float)) and not 0 <= dati["temperatura"] <= 2:
        problemi.append("temperatura fuori da 0..2")
    if isinstance(dati.get("max_token"), int) and not 1 <= dati["max_token"] <= 8192:
        problemi.append("max_token fuori da 1..8192")
    if isinstance(dati.get("timeout_secondi"), (int, float)) and not 1 <= dati["timeout_secondi"] <= 300:
        problemi.append("timeout_secondi fuori da 1..300")
    for sezione, campi in CAMPI_SEZIONE.items():
        s = dati.get(sezione)
        if not isinstance(s, dict):
            problemi.append(f"manca la sezione '{sezione}'")
            continue
        if not str(s.get("_why", "")).strip():
            problemi.append(f"la sezione '{sezione}' non ha '_why'")
        for chiave, tipo in campi.items():
            if not isinstance(s.get(chiave), tipo):
                problemi.append(f"'{sezione}.{chiave}' mancante o di tipo sbagliato")
    g = dati.get("groq") if isinstance(dati.get("groq"), dict) else {}
    if isinstance(g.get("url"), str) and not g["url"].startswith("https://"):
        problemi.append("groq.url deve essere https://")
    if isinstance(g.get("variabile_chiave"), str) and not NOME_VARIABILE.match(g["variabile_chiave"]):
        problemi.append("groq.variabile_chiave deve essere il NOME di una variabile d'ambiente, non la chiave")
    if isinstance(g.get("modello"), str) and isinstance(g.get("modelli_free"), list) and g["modello"] not in g["modelli_free"]:
        problemi.append(f"groq.modello '{g['modello']}' non e' fra i modelli_free dichiarati")
    for dove in _segreti(dati):
        problemi.append(f"'{dove}' contiene una chiave o un valore segreto: le chiavi stanno nelle variabili d'ambiente")
    return problemi


def carica(percorso: Path | str | None = None, ambiente: Mapping[str, str] | None = None) -> dict:
    """Legge e valida la configurazione; applica il backend da variabile d'ambiente. Errori espliciti."""
    f = Path(percorso) if percorso else FILE_PREDEFINITO
    if not f.is_file():
        raise ErroreAssistente(f"configurazione dell'assistente non trovata: {f}")
    try:
        dati = json.loads(f.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        raise ErroreAssistente(f"{f}: JSON non valido alla riga {e.lineno} ({e.msg})") from e
    problemi = valida(dati)
    if problemi:
        raise ErroreAssistente(f"{f}: configurazione non valida: " + "; ".join(problemi))
    env = os.environ if ambiente is None else ambiente
    scelto = env.get(dati["variabile_backend"])
    if scelto:
        if scelto not in dati["backend_ammessi"]:
            raise ErroreAssistente(f"{dati['variabile_backend']}='{scelto}' non ammesso: scegli fra {dati['backend_ammessi']}")
        dati["backend"] = scelto
    return dati
