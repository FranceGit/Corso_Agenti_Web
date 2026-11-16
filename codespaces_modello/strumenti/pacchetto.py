"""Pacchetto di consegna dell'Officina: raccoglie i file di un'unita' in un JSON da importare nel portale.

Uso, dalla radice del repo:   python strumenti/pacchetto.py o2
Scrive consegne/consegna_o2.json (cartella ignorata da git) e lo stampa: copialo nel portale, esercizio
dell'unita', riquadro «Importa il pacchetto». Il voto lo da' il portale; qui si controlla solo che i file ci
siano e che non contengano chiavi (se ne trova una, si ferma: una chiave non deve uscire dal codespace).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
FORMATO = "consegna-officina/1"
UNITA = {
    "o1": (7, {"Dockerfile": "officina/o1/Dockerfile", "docker-compose.yml": "officina/o1/docker-compose.yml"}),
    "o2": (8, {"app/agents/response_classifier.py": "officina/o2/crm_adottato/app/agents/response_classifier.py",
               "requirements.txt": "officina/o2/crm_adottato/requirements.txt",
               "Dockerfile": "officina/o2/crm_adottato/Dockerfile",
               "docker-compose.yml": "officina/o2/crm_adottato/docker-compose.yml",
               ".env.example": "officina/o2/crm_adottato/.env.example"}),
    "o3": (9, {"lead-create-request.schema.json": "officina/o3/lead-create-request.schema.json"}),
    "o4": (10, {"mcp.json": "officina/o4/mcp.json"}),
    "o5": (11, {"assistente.json": "officina/o5/assistente.json"}),
    "o6": (12, {"devcontainer.json": "officina/o6/devcontainer.json"}),
}
FORME_CHIAVE = re.compile(r"(gsk_[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_\w{30,}|sk-[A-Za-z0-9_-]{20,})")


def pacchetto(unita: str) -> dict:
    if unita not in UNITA:
        raise SystemExit(f"unita' '{unita}' sconosciuta: scegli fra {', '.join(UNITA)}")
    numero, mappa = UNITA[unita]
    file = {}
    for nome, percorso in mappa.items():
        f = RADICE / percorso
        if not f.is_file():
            aiuto = " (copialo da officina/o2/env.example.iniziale e sistemalo)" if nome == ".env.example" else ""
            raise SystemExit(f"manca {percorso}{aiuto}")
        testo = f.read_text(encoding="utf-8")
        if FORME_CHIAVE.search(testo):
            raise SystemExit(f"{percorso} contiene qualcosa che sembra una chiave: toglila prima di consegnare (va nei segreti, non nei file)")
        file[nome] = testo
    return {"formato": FORMATO, "esercizio": numero, "unita": unita.upper(), "file": file}


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 2
    p = pacchetto(argv[1].lower())
    uscita = RADICE / "consegne" / f"consegna_{argv[1].lower()}.json"
    uscita.parent.mkdir(exist_ok=True)
    testo = json.dumps(p, ensure_ascii=False, indent=1)
    uscita.write_text(testo, encoding="utf-8")
    print(testo)
    print(f"\n# salvato in {uscita.relative_to(RADICE)}: copia il JSON qui sopra nel portale (esercizio {p['esercizio']})", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
