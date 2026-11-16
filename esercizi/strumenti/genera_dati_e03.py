"""Genera i dati dell'esercizio 3 («trova l'errore») e la tabella del finto-LLM per la classificazione.

Fonti:
  - esercizi/strumenti/risposte_e03.json: risposte dei clienti scritte a mano (visibili e nascoste);
  - dati/lezioni/trova_errore.json (SOLA LETTURA, cantiere lezioni): categorie, stazioni, regole col bug e
    correzioni, cosi' l'esercizio usa lo stesso lessico del laboratorio della lezione P3.5.
Scrive:
  - esercizi/catalogo/dati/e03_risposte.json
  - esercizi/finto_llm/tabelle.json (compito 'classifica_risposta')
Uso: python esercizi/strumenti/genera_dati_e03.py   (deterministico)
"""
from __future__ import annotations

import json
from pathlib import Path

RADICE = Path(__file__).resolve().parents[2]


def leggi(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def scrivi(p: Path, dati) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(dati, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def genera() -> tuple[dict, dict]:
    sorgente = leggi(RADICE / "esercizi" / "strumenti" / "risposte_e03.json")
    lezione = leggi(RADICE / "dati" / "lezioni" / "trova_errore.json")["scenario"]

    def voci(righe):
        return [{"chiave": k, "nome": n, "azienda": a, "testo": {"it": it, "en": en}, "giusta": g, "etichetta_finto": e}
                for k, n, a, it, en, g, e in righe]

    dati = {
        "_why": "Generato da esercizi/strumenti/genera_dati_e03.py (non modificare a mano). Lessico (categorie, stazioni, regole, correzioni) copiato dal laboratorio della lezione P3.5; un test segnala se la lezione cambia. 'nascosti' e le categorie giuste non escono mai dal server.",
        "categorie": lezione["categorie"],
        "stazioni": lezione["stazioni"],
        "stazione_giusta": "conversione",
        "regole_bug": lezione["regole_bug"],
        "correzioni": [{k: c[k] for k in ("id", "tipo", "testo", "regole", "spiega")} for c in lezione["correzioni"]],
        "frasi_disiscrizione": sorgente["frasi_disiscrizione"],
        "visibili": voci(sorgente["visibili"]),
        "nascosti": voci(sorgente["nascosti"]),
    }
    tabella = {v["testo"]["it"]: v["etichetta_finto"] for v in dati["visibili"] + dati["nascosti"]}
    tabelle = {
        "_why": "Risposte del finto-LLM, deterministiche. Per ogni compito: prima la tabella esatta (testo normalizzato -> risposta), poi le regole di ripiego (prima frase contenuta -> risposta), poi la risposta di ripiego. Imita un modello piccolo con i suoi difetti (per esempio chi chiede la disiscrizione diventa spesso 'Not Interested'). Generato da esercizi/strumenti/genera_dati_e03.py.",
        "versione": 1,
        "risposta_generica": "Non ho capito la richiesta.",
        "compiti": {
            "classifica_risposta": {
                "tabella": tabella,
                "regole": [["fuori ufficio", "Out of Office"], ["risposta automatica", "Out of Office"],
                           ["messaggio automatico", "Out of Office"], ["out of office", "Out of Office"],
                           ["in ferie", "Out of Office"], ["toglietemi", "Not Interested"],
                           ["cancellatemi", "Unsubscribe"], ["non ci interessa", "Not Interested"],
                           ["non siamo interessati", "Not Interested"], ["no grazie", "Not Interested"],
                           ["richiam", "Maybe Interested"], ["più avanti", "Maybe Interested"],
                           ["demo", "Interested"], ["interess", "Interested"]],
                "ripiego": "Interested",
            }
        },
    }
    return dati, tabelle


if __name__ == "__main__":
    dati, tabelle = genera()
    scrivi(RADICE / "esercizi" / "catalogo" / "dati" / "e03_risposte.json", dati)
    scrivi(RADICE / "esercizi" / "finto_llm" / "tabelle.json", tabelle)
    print(f"scritti e03_risposte.json ({len(dati['visibili'])} visibili, {len(dati['nascosti'])} nascoste) e tabelle.json")
