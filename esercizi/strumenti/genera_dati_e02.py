"""Genera esercizi/catalogo/dati/e02_lead.json: 22 lead visibili e 20 nascosti con la fascia del «direttore vendite».

La fascia attesa dei nascosti e' quella che il direttore vendite darebbe applicando la SUA tabella (regole di
riferimento qui sotto, mai mostrate allo studente). Si scartano i lead a meno di MARGINE punti da una soglia:
il direttore non firmerebbe una fascia su un caso al limite, e lo studente non deve indovinare al punto.
Uso: python esercizi/strumenti/genera_dati_e02.py   (deterministico: stesso file a ogni esecuzione)
"""
from __future__ import annotations

import json
import random
import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RADICE))

from esercizi.catalogo.punteggio import classifica, vincolo_high, vincolo_mai_high  # noqa: E402

SEME = 2026
MARGINE = 4
RIFERIMENTO = {"pesi": {"ruolo": 40, "dimensione": 25, "settore": 20, "comportamento": 15},
               "soglia_alta": 65, "soglia_media": 40}

RUOLI = {
    "c_level": [("CEO", "CEO"), ("CTO", "CTO"), ("Amministratrice delegata", "Managing director")],
    "vp": [("VP vendite", "VP of Sales"), ("VP marketing", "VP of Marketing")],
    "director": [("Direttore commerciale", "Sales director"), ("Direttrice marketing", "Marketing director")],
    "manager": [("Marketing manager", "Marketing manager"), ("Responsabile acquisti", "Purchasing manager")],
    "specialista": [("Specialista CRM", "CRM specialist"), ("Analista dati", "Data analyst")],
    "stagista": [("Stagista marketing", "Marketing intern"), ("Studente in tesi", "Thesis student")],
}
SETTORI = ["software", "ecommerce", "retail", "logistica", "ristorazione", "manifattura"]
DIPENDENTI = [6, 18, 40, 85, 220, 450, 700, 1500, 4000]
NOMI = ["Laura", "Marco", "Giulia", "Paolo", "Sara", "Luca", "Elena", "Andrea", "Chiara", "Matteo", "Irene",
        "Davide", "Marta", "Simone", "Anna", "Fabio", "Silvia", "Nicola", "Beatrice", "Giorgio", "Federica",
        "Stefano", "Valentina", "Alessio", "Martina", "Roberto", "Claudia", "Pietro", "Sofia", "Tommaso",
        "Alice", "Riccardo", "Camilla", "Edoardo", "Greta", "Filippo", "Noemi", "Lorenzo", "Aurora", "Enrico",
        "Ilaria", "Daniele", "Viola", "Gabriele"]
COGNOMI = ["Bianchi", "Rossi", "Neri", "Conti", "Galli", "Ferri", "Costa", "Greco", "Marino", "Villa", "Serra",
           "Sala", "Testa", "Leone", "Longo", "Fabbri", "Gentile", "Rinaldi", "Caruso", "Moretti", "Barbieri",
           "Lombardi", "Fontana", "Mancini", "Vitale", "Martini", "Pellegrini", "Ferrara", "Bruno", "Ricci",
           "Romano", "Colombo", "Gallo", "Esposito", "Bellini", "Riva", "Monti", "Grassi", "Sartori", "Orlando",
           "Parisi", "Cattaneo", "Silvestri", "Benedetti"]
AZIENDE = ["Nuvola Dati", "ShopModa", "CasaVerde Online", "Logica Software", "Trasporti Alpini", "Meccanica Padana",
           "Ottica Sole", "Pasticceria Dolce Vita", "Ferramenta Rapida", "Gruppo Alimentare Sud", "Pixel Lab",
           "Mercato Facile", "Rete Corrieri", "Officine Lario", "Bottega Digitale", "Cantina dei Colli"]


def lead_casuale(rng: random.Random, i: int, seniority: str | None = None, **forzati) -> dict:
    sen = seniority or rng.choice(list(RUOLI))
    it, en = rng.choice(RUOLI[sen])
    lead = {"id": f"L{i:02d}", "nome": f"{NOMI[i % len(NOMI)]} {COGNOMI[(i * 7) % len(COGNOMI)]}",
            "ruolo": {"it": it, "en": en}, "seniority": sen, "azienda": rng.choice(AZIENDE),
            "settore": rng.choice(SETTORI), "dipendenti": rng.choice(DIPENDENTI),
            "visite": rng.randrange(0, 13), "download": rng.randrange(0, 4)}
    lead.update(forzati)
    return lead


def lontano_dalle_soglie(lead: dict) -> bool:
    p = classifica([lead], RIFERIMENTO)[0]["punteggio"]
    return all(abs(p - s) >= MARGINE for s in (RIFERIMENTO["soglia_alta"], RIFERIMENTO["soglia_media"]))


def genera() -> dict:
    rng = random.Random(SEME)
    i = 0

    def nuovo(**kw):
        nonlocal i
        i += 1
        return lead_casuale(rng, i, **kw)

    def serie(quote, obbligati):
        """Riempie le quote per fascia (secondo il direttore) partendo dai casi obbligati dei vincoli."""
        out = list(obbligati)
        restano = dict(quote)
        for r in classifica(out, RIFERIMENTO):
            restano[r["fascia"]] -= 1
        while any(v > 0 for v in restano.values()):
            cand = nuovo()
            f = classifica([cand], RIFERIMENTO)[0]["fascia"]
            if restano[f] > 0 and lontano_dalle_soglie(cand) and not vincolo_high(cand) and not vincolo_mai_high(cand):
                out.append(cand)
                restano[f] -= 1
        return out

    visibili = serie({"High": 6, "Medium": 9, "Low": 7}, [
        nuovo(seniority="c_level", settore="software", dipendenti=1500, visite=1, download=0),
        nuovo(seniority="stagista", settore="ecommerce", dipendenti=700, visite=12, download=3),
    ])
    nascosti = serie({"High": 6, "Medium": 7, "Low": 7}, [
        nuovo(seniority="c_level", settore="ecommerce", dipendenti=4000, visite=0, download=0),
        nuovo(seniority="c_level", settore="software", dipendenti=700, visite=4, download=1),
        nuovo(seniority="stagista", settore="software", dipendenti=1500, visite=12, download=3),
        nuovo(seniority="stagista", settore="ecommerce", dipendenti=4000, visite=10, download=2),
    ])
    rng.shuffle(visibili)
    rng.shuffle(nascosti)
    # identificativi e nomi assegnati DOPO la scelta: unici e in ordine, qualunque sia il numero di scarti
    for k, lead in enumerate(visibili + nascosti):
        lead["id"] = (f"V{k + 1:02d}" if k < len(visibili) else f"N{k - len(visibili) + 1:02d}")
        lead["nome"] = f"{NOMI[k]} {COGNOMI[(k * 7) % len(COGNOMI)]}"
    attesi = {r["id"]: r["fascia"] for r in classifica(nascosti, RIFERIMENTO)}
    return {
        "_why": "Generato da esercizi/strumenti/genera_dati_e02.py (non modificare a mano). 'nascosti' e 'fascia_attesa' non escono mai dal server.",
        "visibili": visibili,
        "nascosti": nascosti,
        "fascia_attesa": attesi,
        "riferimento": RIFERIMENTO,
    }


if __name__ == "__main__":
    dati = genera()
    f = RADICE / "esercizi" / "catalogo" / "dati" / "e02_lead.json"
    f.parent.mkdir(parents=True, exist_ok=True)
    f.write_text(json.dumps(dati, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    fasce_vis = [r["fascia"] for r in classifica(dati["visibili"], RIFERIMENTO)]
    print(f"scritto {f}: visibili {len(dati['visibili'])} {dict((x, fasce_vis.count(x)) for x in set(fasce_vis))}, "
          f"nascosti {len(dati['nascosti'])} {dict((x, list(dati['fascia_attesa'].values()).count(x)) for x in set(dati['fascia_attesa'].values()))}")
