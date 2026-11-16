"""Inserisce nel corso (dati/corso_v1.json, fonte di verita') le domande scritte dagli autori.

Uso (dalla radice del progetto):
    python strumenti/inserisci_domande.py --verifica strumenti/domande_autori/lotto_a.json [altri lotti...]
    python strumenti/inserisci_domande.py strumenti/domande_autori/*.json

Un lotto e' un file JSON con una lista di domande nel formato del corso (corso/modello.py, classe Domanda),
con "origine": "autori". Ogni domanda va nella pillola che dichiara; se una domanda con lo stesso id e
origine "autori" c'e' gia', viene sostituita (cosi' un lotto si puo' correggere e reinserire).

Prima di scrivere si costruisce il corso con le domande inserite e si carica il catalogo vero su quella
copia: si scrive SOLO se ogni domanda del lotto e' erogabile (distrattori classificati, regola delle bande,
concetto principale, aiuto valido, striscia, testi IT/EN completi). Altrimenti si stampa, per ogni domanda,
il motivo, e il corso non cambia. Con --verifica si controlla soltanto.
"""
from __future__ import annotations

import copy
import json
import sys
import tempfile
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RADICE))

from corso.catalogo import Catalogo  # noqa: E402
from corso.config import FILE_CONFIG, Config, leggi_json  # noqa: E402
from corso.modello import Domanda  # noqa: E402

ORIGINE = "autori"


class ErroreInserimento(Exception):
    pass


def leggi_lotti(percorsi: list[Path]) -> list[dict]:
    domande: list[dict] = []
    for p in percorsi:
        dati = leggi_json(p)
        if not isinstance(dati, list):
            raise ErroreInserimento(f"{p}: un lotto deve essere una lista di domande")
        domande.extend(dati)
    ids = [d.get("id") for d in domande]
    doppi = sorted({i for i in ids if ids.count(i) > 1})
    if doppi:
        raise ErroreInserimento(f"id ripetuti nei lotti: {doppi}")
    return domande


def inserisci(corso: dict, domande: list[dict]) -> dict:
    """Copia del corso con le domande inserite (o sostituite, se gia' presenti con origine 'autori')."""
    nuovo = copy.deepcopy(corso)
    pillole = {p["id"]: p for m in nuovo["moduli"] for p in m["pillole"]}
    esistenti = {d["id"]: (p["id"], d) for p in pillole.values() for d in p["domande"]}
    for d in domande:
        Domanda.model_validate(d)
        if d["origine"] != ORIGINE:
            raise ErroreInserimento(f"{d['id']}: origine '{d['origine']}', attesa '{ORIGINE}'")
        if d["pillola"] not in pillole:
            raise ErroreInserimento(f"{d['id']}: pillola {d['pillola']} inesistente")
        if d["id"] in esistenti:
            pid, vecchia = esistenti[d["id"]]
            if vecchia["origine"] != ORIGINE:
                raise ErroreInserimento(f"{d['id']}: id gia' usato da una domanda con origine '{vecchia['origine']}'")
            pillole[pid]["domande"] = [x for x in pillole[pid]["domande"] if x["id"] != d["id"]]
        pillole[d["pillola"]]["domande"].append(d)
    return nuovo


def catalogo_su(corso: dict, dati_config: dict) -> Catalogo:
    """Catalogo vero caricato su una copia del corso (file temporaneo), senza toccare dati/."""
    cartella = Path(tempfile.mkdtemp(prefix="inserisci_domande_"))
    f = cartella / "corso.json"
    f.write_text(json.dumps(corso, ensure_ascii=False), encoding="utf-8")
    dati = copy.deepcopy(dati_config)
    dati["percorsi_file"]["corso"] = str(f)  # percorso assoluto: Path(radice) / assoluto = assoluto
    return Catalogo(Config(dati, "config con corso temporaneo"))


def verifica(corso: dict, domande: list[dict], dati_config: dict) -> tuple[dict, dict[str, list[str]]]:
    """(corso con le domande, motivi di non erogabilita' per ciascuna domanda del lotto)."""
    nuovo = inserisci(corso, domande)
    cat = catalogo_su(nuovo, dati_config)
    return nuovo, {d["id"]: cat.motivi_non_erogabile[d["id"]] for d in domande}


def main(argv: list[str]) -> int:
    args = argv[1:]
    solo_verifica = "--verifica" in args
    lotti = [Path(a) for a in args if a != "--verifica"]
    if not lotti:
        print(__doc__)
        return 2
    dati_config = leggi_json(FILE_CONFIG)
    file_corso = RADICE / dati_config["percorsi_file"]["corso"]
    corso = leggi_json(file_corso)
    domande = leggi_lotti(lotti)
    nuovo, motivi = verifica(corso, domande, dati_config)
    errori = {did: m for did, m in motivi.items() if m}
    for did, m in errori.items():
        print(f"NON EROGABILE {did}: " + "; ".join(m))
    print(f"domande nei lotti: {len(domande)}, erogabili: {len(domande) - len(errori)}")
    if errori:
        print("corso NON modificato")
        return 1
    if solo_verifica:
        print("solo verifica: corso non modificato")
        return 0
    tmp = file_corso.with_suffix(".tmp")
    tmp.write_text(json.dumps(nuovo, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    tmp.replace(file_corso)
    print(f"scritto {file_corso}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
