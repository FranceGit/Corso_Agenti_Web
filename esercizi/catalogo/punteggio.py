"""Motore di punteggio a regole (nessun LLM), condiviso dall'esercizio 2 e dal generatore dei suoi dati.

punteggio = somma su ogni criterio di (peso del criterio x valore del lead su quel criterio, fra 0 e 1).
Con pesi che sommano 100 il punteggio va da 0 a 100. Fascia: High se punteggio >= soglia_alta,
Medium se >= soglia_media, altrimenti Low. Lessico allineato alla lezione P3.2 «punteggio_lead».
"""
from __future__ import annotations

CRITERI = ["ruolo", "dimensione", "settore", "comportamento"]
VALORE_SENIORITY = {"c_level": 1.0, "vp": 0.85, "director": 0.7, "manager": 0.5, "specialista": 0.25, "stagista": 0.0}
SETTORI_PRIORITARI = {"software", "ecommerce"}
VALORE_SETTORE = {"prioritario": 1.0, "altro": 0.2}
FASCE_DIMENSIONE = [(10, 0.1), (50, 0.4), (500, 0.7)]  # (fino a, valore); oltre 500: 1.0
PIENO_COMPORTAMENTO = 15  # visite + 3 x guide scaricate: a 15 il comportamento vale il massimo
PESO_DOWNLOAD = 3


def valori(lead: dict) -> dict:
    dim = 1.0
    for fino_a, v in FASCE_DIMENSIONE:
        if lead["dipendenti"] <= fino_a:
            dim = v
            break
    comp = min(1.0, (lead["visite"] + PESO_DOWNLOAD * lead["download"]) / PIENO_COMPORTAMENTO)
    return {
        "ruolo": VALORE_SENIORITY[lead["seniority"]],
        "dimensione": dim,
        "settore": VALORE_SETTORE["prioritario" if lead["settore"] in SETTORI_PRIORITARI else "altro"],
        "comportamento": round(comp, 4),
    }


def punteggio(lead: dict, pesi: dict) -> int:
    v = valori(lead)
    return int(round(sum(pesi[c] * v[c] for c in CRITERI)))


def fascia(p: int, soglia_alta: int, soglia_media: int) -> str:
    if p >= soglia_alta:
        return "High"
    if p >= soglia_media:
        return "Medium"
    return "Low"


def classifica(leads: list[dict], regole: dict) -> list[dict]:
    out = []
    for lead in leads:
        p = punteggio(lead, regole["pesi"])
        out.append({**lead, "punteggio": p, "fascia": fascia(p, regole["soglia_alta"], regole["soglia_media"])})
    return out


def vincolo_high(lead: dict) -> bool:
    """CEO/CTO (C-level) di aziende con oltre 500 persone nel settore prioritario: sempre High."""
    return lead["seniority"] == "c_level" and lead["dipendenti"] > 500 and lead["settore"] in SETTORI_PRIORITARI


def vincolo_mai_high(lead: dict) -> bool:
    """Stagisti e studenti: mai High."""
    return lead["seniority"] == "stagista"
