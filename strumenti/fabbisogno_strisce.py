"""Fabbisogno di nuove domande per avere abbastanza strisce (punti di vista) per ogni concetto di ogni spicchio.

Uso (dalla radice del progetto):
    python strumenti/fabbisogno_strisce.py

Per ogni pillola (spicchio) e per ogni suo concetto conta le domande erogabili che hanno quel concetto come
principale (corso + lezioni) e i punti di vista gia' coperti. Se un concetto ha meno domande del minimo per
erogare (percorso.strisce_per_concetto.minimo) o dell'obiettivo per gli autori (percorso.strisce_obiettivo_autori),
dice quante ne mancano e quali punti di vista non sono ancora coperti. Scrive il risultato in
dati/fabbisogno_strisce.json e stampa un riepilogo.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import get_args

RADICE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RADICE))

from corso.catalogo import Catalogo  # noqa: E402
from corso.config import carica_config  # noqa: E402
from corso.modello import Striscia  # noqa: E402

USCITA = RADICE / "dati" / "fabbisogno_strisce.json"


def fabbisogno(cat: Catalogo) -> dict:
    minimo = cat.cfg.prendi("percorso", "strisce_per_concetto", "minimo", tipo=int)
    obiettivo = cat.cfg.prendi("percorso", "strisce_obiettivo_autori", tipo=int)
    punti_di_vista = list(get_args(Striscia))
    pillole = []
    tot_minimo = tot_obiettivo = 0
    for p in cat.corso.pillole():
        erogabili = cat.domande_erogabili(p.id)
        concetti = []
        for c in p.concetti:
            domande = [d for d in erogabili if d.concetto_principale == c]
            coperti = sorted({d.striscia for d in domande}, key=punti_di_vista.index)
            mancano_minimo = max(0, minimo - len(domande))
            mancano_obiettivo = max(0, obiettivo - len(domande))
            tot_minimo += mancano_minimo
            tot_obiettivo += mancano_obiettivo
            concetti.append({
                "concetto": c,
                "nome": cat.kg.nodo(c).nome.it,
                "domande": [d.id for d in domande],
                "strisce_coperte": coperti,
                "mancano_per_erogare": mancano_minimo,
                "mancano_per_obiettivo": mancano_obiettivo,
                "strisce_da_scrivere": [v for v in punti_di_vista if v not in coperti][:mancano_obiettivo],
            })
        pillole.append({"pillola": p.id, "erogabile": all(x["mancano_per_erogare"] == 0 for x in concetti), "concetti": concetti})
    return {
        "minimo_per_erogare": minimo,
        "obiettivo_autori": obiettivo,
        "punti_di_vista": punti_di_vista,
        "pillole_erogabili": sum(1 for p in pillole if p["erogabile"]),
        "pillole_totali": len(pillole),
        "nuove_domande_per_erogare_tutto": tot_minimo,
        "nuove_domande_per_obiettivo": tot_obiettivo,
        "pillole": pillole,
    }


def main() -> int:
    f = fabbisogno(Catalogo(carica_config()))
    USCITA.write_text(json.dumps(f, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"pillole erogabili: {f['pillole_erogabili']} su {f['pillole_totali']}")
    print(f"nuove domande per rendere erogabili tutti gli spicchi (minimo {f['minimo_per_erogare']} per concetto): {f['nuove_domande_per_erogare_tutto']}")
    print(f"nuove domande per l'obiettivo di {f['obiettivo_autori']} strisce per concetto: {f['nuove_domande_per_obiettivo']}")
    print(f"scritto {USCITA}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
