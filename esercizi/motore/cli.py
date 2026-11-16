"""Comandi da terminale del laboratorio (li usano gli script verifica_esercizio / azzera_laboratorio).

  python -m esercizi.motore.cli elenco
  python -m esercizi.motore.cli verifica N --studente email [--json]
  python -m esercizi.motore.cli ricorreggi N K --studente email
  python -m esercizi.motore.cli ricomincia N --studente email
  python -m esercizi.motore.cli azzera --conferma           (cancella TUTTO lo stato degli esercizi)
Esce con 0 se l'esercizio e' superato (o il comando e' riuscito), 1 se non superato, 2 per errori d'uso.
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys

from corso.errori import ErrorePiattaforma

from .configurazione import carica_laboratorio
from .esecutore import MotoreEsercizi


def stampa_verbale(v: dict, lingua: str) -> None:
    print(f"Esercizio {v['esercizio']['numero']} - {v['esercizio']['titolo'][lingua]} - tentativo {v['tentativo']}")
    print(v["riassunto"][lingua])
    for c in v["controlli"]:
        segno = "OK " if c["superato"] else "NO "
        print(f"  {segno} {c['nome'][lingua]} ({c['punti']}/{c['peso']}): {c['spiegazione'][lingua]}")
        if not c["superato"]:
            print(f"       come rimediare: {c['aiuto'][lingua]}")
    print(f"Impronta: {v['impronta_esito']}")


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="esercizi", description="Laboratorio degli esercizi pratici")
    sub = p.add_subparsers(dest="comando", required=True)
    sub.add_parser("elenco")
    for nome in ("verifica", "ricomincia"):
        s = sub.add_parser(nome)
        s.add_argument("numero", type=int)
        s.add_argument("--studente", required=True)
        s.add_argument("--json", action="store_true")
        s.add_argument("--lingua", default="it", choices=["it", "en"])
    s = sub.add_parser("ricorreggi")
    s.add_argument("numero", type=int)
    s.add_argument("tentativo", type=int)
    s.add_argument("--studente", required=True)
    s = sub.add_parser("azzera")
    s.add_argument("--conferma", action="store_true")
    a = p.parse_args(argv)

    cfg = carica_laboratorio()
    try:
        if a.comando == "azzera":
            if not a.conferma:
                print("Serve --conferma: il comando cancella lo stato di TUTTI gli studenti degli esercizi.")
                return 2
            cartella = cfg.cartella_stato()
            if cartella.exists():
                shutil.rmtree(cartella)
            print(f"Stato degli esercizi cancellato: {cartella}")
            return 0
        motore = MotoreEsercizi(cfg)
        if a.comando == "elenco":
            for n, es in sorted(motore.esercizi.items()):
                print(f"{n}. {es.titolo['it']} (soglia {cfg.soglia(n)}, esercizio {motore.piano[n]} del piano)")
            return 0
        if a.comando == "verifica":
            v = motore.verifica(a.studente, a.numero)
            if a.json:
                print(json.dumps(v, ensure_ascii=False, indent=1))
            else:
                stampa_verbale(v, a.lingua)
            return 0 if v["superato"] else 1
        if a.comando == "ricomincia":
            motore.ricomincia(a.studente, a.numero)
            print(f"Esercizio {a.numero} riportato ai dati di partenza per {a.studente}.")
            return 0
        if a.comando == "ricorreggi":
            r = motore.ricorreggi(a.studente, a.numero, a.tentativo)
            print(json.dumps(r, ensure_ascii=False, indent=1))
            return 0 if r["identico"] else 1
    except ErrorePiattaforma as e:
        print(f"ERRORE: {e}", file=sys.stderr)
        return 2
    return 2


if __name__ == "__main__":
    sys.exit(main())
