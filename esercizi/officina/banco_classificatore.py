"""Banco di prova del DIFETTO REALE del repo adottato (O2, esercizio 8): app/agents/response_classifier.py.

Il difetto (repo patowari AI-Enhanced-Sales-Campaign-CRM, commit 49959e3): il classificatore controlla
`"Interested" in status_str` PRIMA di `"Not Interested" in status_str`. Poiche' "Not Interested" contiene
"Interested", ogni risposta «Not Interested» diventa INTERESTED: il ramo NOT_INTERESTED non si raggiunge mai
(il report del repo stesso dice «Not Interested: 0» su 5 lead).

Il banco ESEGUE il file dello studente, quindi:
  1. prima lo controlla sull'albero sintattico (import ammessi, niente eval/exec/open, niente attributi «__»);
  2. poi lo esegue in un processo Python separato e isolato (-I), con un tempo massimo, senza rete ne' file,
     contro moduli finti di app.models e app.services.llm_service;
  3. restituisce SOLO etichette chiuse per caso (Interested / Not Interested / Needs Follow-up / Unknown / errore).
Gli esiti finiscono nella fotografia del tentativo: la correzione resta una funzione pura e la ricorrezione
identica, anche se il banco cambiasse in futuro.
"""
from __future__ import annotations

import ast
import json
import subprocess
import sys

IMPORT_AMMESSI = {"__future__", "json", "re", "typing", "enum", "app.models", "app.services.llm_service",
                  "app.services", "app"}
NOMI_VIETATI = {"eval", "exec", "compile", "open", "__import__", "getattr", "setattr", "delattr", "globals",
                "locals", "vars", "input", "breakpoint", "exit", "quit", "memoryview", "help", "__builtins__"}
LUNGHEZZA_MASSIMA = 20000

# Risposte del modello finto (cio' che classify_response restituisce) e classificazione attesa.
CASI = {
    "not_interested": ('{"response_text": "No thanks, not for us.", "classification": "Not Interested"}', "Not Interested"),
    "not_interested_minuscolo": ('{"response_text": "We will pass.", "classification": "not interested"}', "Not Interested"),
    "not_interested_recintato": ('```json\n{"response_text": "Not now.", "classification": "Not Interested"}\n```', "Not Interested"),
    "interested": ('{"response_text": "Sounds great, let us talk.", "classification": "Interested"}', "Interested"),
    "interested_spazi": ('{"response_text": "Yes!", "classification": "  Interested "}', "Interested"),
    "follow_up": ('{"response_text": "Ask me next quarter.", "classification": "Needs Follow-up"}', "Needs Follow-up"),
    "senza_classificazione": ('{"response_text": "Hmm."}', "Needs Follow-up"),
    "non_json": ("Sorry, I cannot answer in JSON.", "Unknown"),
}
GRUPPI = {
    "difetto": ["not_interested"],
    "robustezza": ["not_interested_minuscolo", "not_interested_recintato", "interested_spazi"],
    "regressione": ["interested", "follow_up", "senza_classificazione", "non_json"],
}


def violazioni(codice: str) -> list[str]:
    """Cosa impedisce di eseguire il file (elenco vuoto = ammesso)."""
    if len(codice) > LUNGHEZZA_MASSIMA:
        return [f"file troppo lungo ({len(codice)} caratteri, massimo {LUNGHEZZA_MASSIMA})"]
    try:
        albero = ast.parse(codice)
    except SyntaxError as e:
        return [f"errore di sintassi alla riga {e.lineno}: {e.msg}"]
    out = []
    for nodo in ast.walk(albero):
        if isinstance(nodo, ast.Import):
            for a in nodo.names:
                if a.name not in IMPORT_AMMESSI:
                    out.append(f"riga {nodo.lineno}: import di '{a.name}' non ammesso")
        elif isinstance(nodo, ast.ImportFrom):
            if (nodo.module or "") not in IMPORT_AMMESSI or nodo.level:
                out.append(f"riga {nodo.lineno}: import da '{nodo.module}' non ammesso")
        elif isinstance(nodo, ast.Name) and nodo.id in NOMI_VIETATI:
            out.append(f"riga {nodo.lineno}: '{nodo.id}' non ammesso")
        elif isinstance(nodo, ast.Attribute) and nodo.attr.startswith("__"):
            out.append(f"riga {nodo.lineno}: attributo '{nodo.attr}' non ammesso")
        elif isinstance(nodo, ast.Constant) and isinstance(nodo.value, str) and "__" in nodo.value and "import" in nodo.value:
            out.append(f"riga {nodo.lineno}: stringa sospetta")
    return out


def _ambiente_minimo() -> dict:
    """Nessuna variabile del portale (chiavi comprese) passa al figlio; su Windows Python ha bisogno di SYSTEMROOT."""
    import os
    return {k: os.environ[k] for k in ("SYSTEMROOT",) if k in os.environ}


def esegui(codice: str, timeout_secondi: float = 10.0) -> dict:
    """{"ammesso": bool, "violazioni": [...], "esiti": {caso: etichetta}, "errore": str|None}."""
    v = violazioni(codice)
    if v:
        return {"ammesso": False, "violazioni": v, "esiti": {}, "errore": None}
    ingresso = json.dumps({"codice": codice, "casi": {k: c[0] for k, c in CASI.items()}})
    try:
        r = subprocess.run([sys.executable, "-I", __file__], input=ingresso, capture_output=True, text=True,
                           timeout=timeout_secondi, env=_ambiente_minimo(), encoding="utf-8")
    except subprocess.TimeoutExpired:
        return {"ammesso": True, "violazioni": [], "esiti": {}, "errore": f"tempo scaduto ({timeout_secondi:g} s): c'e' un ciclo infinito?"}
    try:
        uscita = json.loads(r.stdout.strip().splitlines()[-1])
    except (ValueError, IndexError):
        return {"ammesso": True, "violazioni": [], "esiti": {}, "errore": "il file non si e' caricato: " + (r.stderr.strip().splitlines() or ["?"])[-1][:200]}
    return {"ammesso": True, "violazioni": [], "esiti": uscita.get("esiti", {}), "errore": uscita.get("errore")}


def valuta(esiti: dict) -> dict:
    """Per gruppo: casi giusti e sbagliati (con cosa e' uscito)."""
    out = {}
    for gruppo, casi in GRUPPI.items():
        giusti = [c for c in casi if esiti.get(c) == CASI[c][1]]
        out[gruppo] = {"giusti": giusti, "sbagliati": {c: esiti.get(c, "nessun esito") for c in casi if c not in giusti}}
    return out


# ---------------------------------------------------------------- processo figlio (python -I banco_classificatore.py)

def _figlio() -> None:  # pragma: no cover - eseguito in un processo separato, coperto dai test tramite esegui()
    import builtins
    import enum
    import types

    dati = json.loads(sys.stdin.read())

    class EmailStatus(str, enum.Enum):  # stessi valori di app/models.py del repo adottato
        INTERESTED = "Interested"
        NOT_INTERESTED = "Not Interested"
        NEEDS_FOLLOW_UP = "Needs Follow-up"
        UNKNOWN = "Unknown"

    class Lead:
        def __init__(self, **campi):
            for k, v in campi.items():
                setattr(self, k, v)

    class LLMService:
        risposta = ""

        def classify_response(self, email_content, lead_info):
            return LLMService.risposta

    app = types.ModuleType("app")
    modelli = types.ModuleType("app.models")
    modelli.EmailStatus, modelli.Lead = EmailStatus, Lead
    servizi = types.ModuleType("app.services")
    llm = types.ModuleType("app.services.llm_service")
    llm.LLMService = LLMService
    sys.modules.update({"app": app, "app.models": modelli, "app.services": servizi, "app.services.llm_service": llm})

    esegui_codice, compila = builtins.exec, builtins.compile
    for nome in ("open", "eval", "exec", "compile", "input", "breakpoint", "help"):
        setattr(builtins, nome, None)
    spazio: dict = {"__name__": "response_classifier"}
    try:
        esegui_codice(compila(dati["codice"], "response_classifier.py", "exec"), spazio)  # codice gia' controllato
        classe = spazio["ResponseClassifierAgent"]
        agente = classe(LLMService())
    except Exception as e:
        print(json.dumps({"esiti": {}, "errore": f"il file non definisce un ResponseClassifierAgent utilizzabile ({type(e).__name__}: {e})"}))
        return
    lead = Lead(name="Ada Rossi", email="ada@esempio.local", company="Esempio Srl", job_title="CTO",
                industry="SaaS", company_size="51-200")
    esiti = {}
    for caso, risposta in dati["casi"].items():
        LLMService.risposta = risposta
        try:
            r = agente.simulate_response(lead, "Ciao Ada, ...")
            c = r.get("classification") if isinstance(r, dict) else None
            esiti[caso] = c.value if isinstance(c, enum.Enum) else str(c)
        except Exception as e:
            esiti[caso] = f"errore: {type(e).__name__}"
    print(json.dumps({"esiti": esiti, "errore": None}))


if __name__ == "__main__":  # pragma: no cover
    _figlio()
