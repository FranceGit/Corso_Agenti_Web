"""Genera codespaces_modello/: il contenuto del repo che lo studente apre in GitHub Codespaces (FranceGit/corso-officina).

Uso (dalla radice del progetto):
    python strumenti/prepara_codespaces.py            # rigenera la cartella
    python strumenti/prepara_codespaces.py --verifica # esce con 1 se la cartella non corrisponde alle fonti

Fonti (uniche fonti di verita', la cartella generata NON si modifica a mano):
  - strumenti/codespaces/          devcontainer, README, requirements, .gitignore, pytest, pacchetto.py, test dell'assistente
  - esercizi/assistente/           l'assistente libero (O5), diventa assistente/ in radice
  - esercizi/officina/materiale/   materiale e file di partenza delle unita' O1-O6, diventa officina/o1..o6
  - esercizi/officina/banco_classificatore.py   il banco del difetto reale, per la prova locale di O2
Solo esercizi e assistente: NON il corso (lezioni, domande, portale restano sul server).
Un test (esercizi/tests/test_officina_kit.py) verifica che la cartella sia allineata alle fonti.
"""
from __future__ import annotations

import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
DESTINAZIONE = RADICE / "codespaces_modello"
KIT = RADICE / "strumenti" / "codespaces"
MATERIALE = RADICE / "esercizi" / "officina" / "materiale"
SALTA = {"__pycache__", ".pytest_cache"}

INIZIO_OFFICINA = '"""Esercizi dell\'Officina (O1-O6): materiale, file di partenza e banco del difetto reale di O2."""\n'
# copie di lavoro: il file di partenza difettoso, col nome che lo studente modifica (e che pacchetto.py raccoglie)
COPIE_DI_LAVORO = {
    "officina/o3/lead-create-request.schema.json": "o3/lead-create-request.iniziale.json",
    "officina/o4/mcp.json": "o4/mcp.iniziale.json",
    "officina/o5/assistente.json": "o5/assistente.iniziale.json",
    "officina/o6/devcontainer.json": "o6/devcontainer_da_sistemare.json",
}


def _file_di(cartella: Path) -> list[Path]:
    return sorted(p for p in cartella.rglob("*") if p.is_file() and not (set(p.relative_to(cartella).parts) & SALTA))


def piano() -> dict[str, bytes]:
    """percorso relativo nella destinazione -> contenuto."""
    out: dict[str, bytes] = {}

    def da(f: Path) -> bytes:
        return f.read_bytes()

    out[".devcontainer/devcontainer.json"] = da(KIT / "devcontainer.json")
    out["README.md"] = da(KIT / "README.md")
    out["requirements.txt"] = da(KIT / "requirements.txt")
    out[".gitignore"] = da(KIT / "gitignore")
    out["pytest.ini"] = da(KIT / "pytest_kit.ini")
    out["conftest.py"] = da(KIT / "conftest_kit.py")
    out["strumenti/pacchetto.py"] = da(KIT / "pacchetto.py")
    out["tests/test_assistente.py"] = da(KIT / "test_assistente_kit.py")
    for f in _file_di(RADICE / "esercizi" / "assistente"):
        out["assistente/" + f.relative_to(RADICE / "esercizi" / "assistente").as_posix()] = da(f)
    out["officina/__init__.py"] = INIZIO_OFFICINA.encode("utf-8")
    out["officina/banco_classificatore.py"] = da(RADICE / "esercizi" / "officina" / "banco_classificatore.py")
    for f in _file_di(MATERIALE):
        out["officina/" + f.relative_to(MATERIALE).as_posix()] = da(f)
    for dest, sorgente in COPIE_DI_LAVORO.items():
        out[dest] = da(MATERIALE / sorgente)
    return out


def differenze(atteso: dict[str, bytes]) -> list[str]:
    presenti = {f.relative_to(DESTINAZIONE).as_posix() for f in _file_di(DESTINAZIONE)} if DESTINAZIONE.is_dir() else set()
    diff = [f"manca {p}" for p in sorted(set(atteso) - presenti)]
    diff += [f"in piu' {p}" for p in sorted(presenti - set(atteso))]
    diff += [f"diverso {p}" for p in sorted(set(atteso) & presenti)
             if (DESTINAZIONE / p).read_bytes().replace(b"\r\n", b"\n") != atteso[p].replace(b"\r\n", b"\n")]
    return diff


def scrivi(atteso: dict[str, bytes]) -> None:
    if DESTINAZIONE.is_dir():
        for f in _file_di(DESTINAZIONE):
            if f.relative_to(DESTINAZIONE).as_posix() not in atteso:
                f.unlink()
    for p, contenuto in atteso.items():
        f = DESTINAZIONE / p
        f.parent.mkdir(parents=True, exist_ok=True)
        f.write_bytes(contenuto)
    for d in sorted((d for d in DESTINAZIONE.rglob("*") if d.is_dir()), key=lambda d: -len(d.parts)):
        if not any(d.iterdir()):
            d.rmdir()


def main(argv: list[str]) -> int:
    atteso = piano()
    if "--verifica" in argv:
        diff = differenze(atteso)
        for d in diff:
            print(d)
        print("codespaces_modello allineato alle fonti" if not diff else f"{len(diff)} differenze: rigenera con python strumenti/prepara_codespaces.py")
        return 1 if diff else 0
    scrivi(atteso)
    print(f"scritti {len(atteso)} file in {DESTINAZIONE}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
