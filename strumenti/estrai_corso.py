"""Estrae il contenuto reale del corso dal documento benchmark e scrive dati/corso_v1.json e dati/knowledge_graph.json.

Uso (dalla radice del progetto):
    python strumenti/estrai_corso.py <percorso di CORSO_BENCHMARK_STRUTTURA.md>

Cosa estrae:
  - 8 moduli, 40 pillole (durata, prerequisiti, nodi, fonti, obiettivo, scaletta, progetto dell'animazione);
  - 120 domande a due livelli (L1 + L2 con tipo e "perche'");
  - 79 concetti del knowledge graph con archi tipizzati e pesi (pesi letti dal documento, sezione 4.3).
Cosa NON inventa:
  - il tipo dei distrattori (quasi/poco/errata) resta null: va classificato da un autore;
  - il concetto principale di ogni domanda resta null (il documento lega le domande alla pillola, non al nodo);
  - i testi inglesi restano null, tranne i titoli brevi di strumenti/titoli_en.json.
Il risultato viene validato con il modello (corso/modello.py) prima di essere scritto.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RADICE))

from corso.modello import Corso, KnowledgeGraph  # noqa: E402

FILE_TITOLI_EN = RADICE / "strumenti" / "titoli_en.json"
USCITA_CORSO = RADICE / "dati" / "corso_v1.json"
USCITA_KG = RADICE / "dati" / "knowledge_graph.json"

RE_MODULO = re.compile(r"^### MODULO (\d+): (.+)$")
RE_PILLOLA = re.compile(r"^#### (P\d+\.\d+) (.+)$")
RE_META = re.compile(
    r"^- \*\*Durata:\*\* (\d+) min · \*\*Prerequisiti:\*\* (.+?) · \*\*Nodi:\*\* (.+?) · \*\*Fonti:\*\* (.+)$"
)
RE_DOMANDA = re.compile(r"^  - \*\*(D\d+\.\d+-[a-z])\*\* \[L1\] (.+)$")
RE_OPZ_L1 = re.compile(r"^    - ([A-G])\) (.+)$")
RE_CORR_L1 = re.compile(r"^    - \*\*Corretta: ([A-G])\*\*$")
RE_L2 = re.compile(r"^    - \[L2 · ([a-z-]+)\] (.+)$")
RE_OPZ_L2 = re.compile(r"^      - ([a-g])\) (.+)$")
RE_CORR_L2 = re.compile(r"^      - \*\*Corretta: ([a-g])\*\*(?: · \*Perché:\* (.+))?$")
RE_PESI = re.compile(r"Peso suggerito degli archi: (.+?)\.")


class ErroreEstrazione(Exception):
    pass


def testo(it: str, en: str | None = None) -> dict:
    return {"it": it.strip(), "en": en}


def pulisci(s: str) -> str:
    """Toglie il markdown di enfasi, lascia il testo leggibile."""
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)
    s = re.sub(r"(?<!\w)\*(.+?)\*(?!\w)", r"\1", s)
    return s.strip()


def blocchi_pillole(righe: list[str]) -> tuple[list[tuple[str, str, int]], dict[str, list[str]], dict[str, str]]:
    """Divide il programma in moduli e pillole. Restituisce (moduli, righe per pillola, modulo per pillola)."""
    moduli: list[tuple[str, str, int]] = []
    pillole: dict[str, list[str]] = {}
    modulo_di: dict[str, str] = {}
    corrente: str | None = None
    for riga in righe:
        if riga.startswith("## 3."):
            break
        m = RE_MODULO.match(riga)
        if m:
            moduli.append((f"M{m.group(1)}", m.group(2).strip(), len(moduli)))
            corrente = None
            continue
        p = RE_PILLOLA.match(riga)
        if p:
            corrente = p.group(1)
            pillole[corrente] = [riga]
            modulo_di[corrente] = moduli[-1][0]
            continue
        if corrente is not None:
            pillole[corrente].append(riga)
    return moduli, pillole, modulo_di


def sezione(righe: list[str], intestazione: str) -> list[str]:
    """Righe annidate sotto un punto di primo livello '- **<intestazione>...'."""
    inizio = None
    for i, r in enumerate(righe):
        if r.startswith(f"- **{intestazione}"):
            inizio = i
            break
    if inizio is None:
        raise ErroreEstrazione(f"sezione '{intestazione}' non trovata in {righe[0]}")
    fine = len(righe)
    for j in range(inizio + 1, len(righe)):
        if righe[j].startswith("- **") or righe[j].startswith("#") or righe[j].strip() == "---":
            fine = j
            break
    return righe[inizio:fine]


def estrai_scaletta(righe: list[str]) -> list[dict]:
    voci: list[list[str]] = []
    for r in sezione(righe, "Scaletta:")[1:]:
        m = re.match(r"^  \d+\. (.+)$", r)
        if m:
            voci.append([pulisci(m.group(1))])
        elif r.strip().startswith("- ") and voci:
            voci[-1].append("- " + pulisci(r.strip()[2:]))
        elif r.startswith("     ") and r.strip() and voci:
            voci[-1].append(pulisci(r.strip()))  # capoverso di continuazione della voce
        elif re.match(r"^  \S", r):
            voci.append([pulisci(r.strip())])  # capoverso conclusivo non numerato: voce a se'
        elif r.strip():
            raise ErroreEstrazione(f"riga di scaletta non riconosciuta: {r!r}")
    if not voci:
        raise ErroreEstrazione(f"scaletta vuota in {righe[0]}")
    return [testo("\n".join(v)) for v in voci]


def estrai_animazione(pid: str, righe: list[str], titoli_en: dict) -> dict:
    blocco = sezione(righe, "Animazione:")
    m = re.match(r'^- \*\*Animazione: "(.+?)"\.\*\*', blocco[0])
    if not m:
        raise ErroreEstrazione(f"titolo dell'animazione non riconosciuto: {blocco[0]!r}")
    progetto = "\n".join(pulisci(r.strip()) for r in blocco[1:] if r.strip())
    return {"titolo": testo(m.group(1), titoli_en["animazioni"].get(pid)), "progetto": testo(progetto)}


def estrai_domande(pid: str, righe: list[str], concetti: list[str]) -> list[dict]:
    domande: list[dict] = []
    corrente: dict | None = None
    for r in sezione(righe, "Verifica:")[1:]:
        if not r.strip():
            continue
        m = RE_DOMANDA.match(r)
        if m:
            corrente = {
                "id": m.group(1),
                "origine": "benchmark",
                "pillola": pid,
                "concetti": list(concetti),
                "concetto_principale": None,
                "segmento_aiuto": None,
                "livello1": {"domanda": testo(pulisci(m.group(2))), "opzioni": [], "perche": None},
                "livello2": None,
            }
            domande.append(corrente)
            continue
        if corrente is None:
            raise ErroreEstrazione(f"{pid}: riga prima della prima domanda: {r!r}")
        if (m := RE_OPZ_L1.match(r)):
            corrente["livello1"]["opzioni"].append(
                {"id": m.group(1), "testo": testo(pulisci(m.group(2))), "corretta": False, "tipo_distrattore": None, "spiegazione": None}
            )
        elif (m := RE_CORR_L1.match(r)):
            segna_corretta(corrente["livello1"], m.group(1), corrente["id"])
        elif (m := RE_L2.match(r)):
            corrente["livello2"] = {"tipo": m.group(1), "domanda": testo(pulisci(m.group(2))), "opzioni": [], "perche": None}
        elif (m := RE_OPZ_L2.match(r)):
            corrente["livello2"]["opzioni"].append(
                {"id": m.group(1), "testo": testo(pulisci(m.group(2))), "corretta": False, "tipo_distrattore": None, "spiegazione": None}
            )
        elif (m := RE_CORR_L2.match(r)):
            segna_corretta(corrente["livello2"], m.group(1), corrente["id"])
            if m.group(2):
                corrente["livello2"]["perche"] = testo(pulisci(m.group(2)))
        else:
            raise ErroreEstrazione(f"{pid}: riga di verifica non riconosciuta: {r!r}")
    return domande


def segna_corretta(livello: dict, lettera: str, did: str) -> None:
    trovate = [o for o in livello["opzioni"] if o["id"] == lettera]
    if len(trovate) != 1:
        raise ErroreEstrazione(f"{did}: lettera corretta {lettera} non presente fra le opzioni")
    trovate[0]["corretta"] = True


def estrai_pillola(pid: str, righe: list[str], titoli_en: dict) -> dict:
    meta = next((RE_META.match(r) for r in righe if RE_META.match(r)), None)
    if meta is None:
        raise ErroreEstrazione(f"{pid}: riga Durata/Prerequisiti/Nodi/Fonti non trovata")
    prerequisiti = [] if meta.group(2).strip() == "nessuno" else [x.strip() for x in meta.group(2).split(",")]
    concetti = [x.strip() for x in meta.group(3).split(",")]
    fonti = [x.strip().strip("[]") for x in meta.group(4).split(",")]
    obiettivo = next((r for r in righe if r.startswith("- **Obiettivo:**")), None)
    if obiettivo is None:
        raise ErroreEstrazione(f"{pid}: obiettivo non trovato")
    titolo = RE_PILLOLA.match(righe[0]).group(2)
    return {
        "id": pid,
        "titolo": testo(titolo, titoli_en["pillole"].get(pid)),
        "durata_min": int(meta.group(1)),
        "prerequisiti": prerequisiti,
        "concetti": concetti,
        "fonti": fonti,
        "obiettivo": testo(pulisci(obiettivo[len("- **Obiettivo:**"):])),
        "scaletta": estrai_scaletta(righe),
        "animazione": estrai_animazione(pid, righe, titoli_en),
        "domande": estrai_domande(pid, righe, concetti),
    }


def tabella(righe: list[str], titolo_sezione: str) -> list[list[str]]:
    """Righe dati di una tabella markdown che segue un'intestazione '### ...'."""
    i = next(k for k, r in enumerate(righe) if r.startswith(titolo_sezione))
    dati: list[list[str]] = []
    in_tabella = False
    for r in righe[i + 1:]:
        if r.startswith("|"):
            in_tabella = True
            celle = [c.strip() for c in r.strip().strip("|").split("|")]
            dati.append(celle)
        elif in_tabella:
            break
    return dati[2:]  # salta intestazione e separatore


def estrai_kg(righe: list[str], anello_di_modulo: dict[str, int], titoli_en: dict, fonte: str) -> dict:
    testo_completo = "\n".join(righe)
    mp = RE_PESI.search(testo_completo)
    if mp is None:
        raise ErroreEstrazione("pesi degli archi non trovati (sezione 4.3, 'Peso suggerito degli archi: ...')")
    pesi = {}
    for parte in mp.group(1).split(","):
        tipo, valore = parte.strip().split()
        pesi[tipo] = int(valore)
    nodi = []
    for celle in tabella(righe, "### 4.1 Nodi"):
        cid, nome, pill, anello = celle
        nodi.append({
            "id": cid,
            "nome": testo(nome, titoli_en["concetti"].get(cid)),
            "pillole": [p.strip() for p in pill.split(",")],
            "anello": int(anello),
        })
    archi = []
    for celle in tabella(righe, "### 4.2 Collegamenti"):
        da, tipo, a, nota = celle
        for origine in [x.strip() for x in da.split(",")]:
            archi.append({
                "da": origine, "a": a, "tipo": tipo, "peso": pesi[tipo],
                "nota": testo(nota) if nota else None,
            })
    legenda = {t: testo(v[0], v[1]) for t, v in titoli_en["legenda_archi"].items()}
    if set(legenda) != set(pesi):
        raise ErroreEstrazione(f"legenda {sorted(legenda)} e pesi {sorted(pesi)} non coincidono")
    return {"versione_schema": 1, "fonte": fonte, "pesi_per_tipo": pesi, "legenda": legenda, "nodi": nodi, "archi": archi}


def anelli_dei_moduli(righe: list[str]) -> dict[str, int]:
    """Dalla tabella 2.0: 'Anello 1 (esterno)' -> 1."""
    risultato = {}
    for celle in tabella(righe, "### 2.0 Panoramica"):
        m = re.match(r"Anello (\d+)", celle[3])
        if not m:
            raise ErroreEstrazione(f"anello non riconosciuto nella panoramica: {celle}")
        risultato[celle[0]] = int(m.group(1))
    return risultato


def estrai(percorso_md: Path) -> tuple[dict, dict]:
    righe = percorso_md.read_text(encoding="utf-8").splitlines()
    titoli_en = json.loads(FILE_TITOLI_EN.read_text(encoding="utf-8"))
    anelli = anelli_dei_moduli(righe)
    moduli, pillole, modulo_di = blocchi_pillole(righe)
    titolo_corso = re.match(r'^# CORSO BENCHMARK: "(.+)"$', next(r for r in righe if r.startswith("# CORSO"))).group(1)
    corso = {
        "versione_schema": 1,
        "id": "corso_agenti_crm_v1",
        "titolo": testo(titolo_corso, titoli_en["corso"]),
        "fonte": percorso_md.name,
        "moduli": [
            {
                "id": mid,
                "titolo": testo(titolo, titoli_en["moduli"].get(mid)),
                "anello": anelli[mid],
                "pillole": [estrai_pillola(pid, pillole[pid], titoli_en) for pid in pillole if modulo_di[pid] == mid],
            }
            for mid, titolo, _ in moduli
        ],
    }
    kg = estrai_kg(righe, anelli, titoli_en, percorso_md.name)
    Corso.model_validate(corso)
    KnowledgeGraph.model_validate(kg)
    return corso, kg


def scrivi(percorso: Path, dati: dict) -> None:
    percorso.parent.mkdir(parents=True, exist_ok=True)
    tmp = percorso.with_suffix(".tmp")
    tmp.write_text(json.dumps(dati, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    tmp.replace(percorso)


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print(__doc__)
        return 2
    corso, kg = estrai(Path(argv[1]))
    scrivi(USCITA_CORSO, corso)
    scrivi(USCITA_KG, kg)
    n_pill = sum(len(m["pillole"]) for m in corso["moduli"])
    n_dom = sum(len(p["domande"]) for m in corso["moduli"] for p in m["pillole"])
    print(f"scritto {USCITA_CORSO}: {len(corso['moduli'])} moduli, {n_pill} pillole, {n_dom} domande")
    print(f"scritto {USCITA_KG}: {len(kg['nodi'])} concetti, {len(kg['archi'])} archi, pesi {kg['pesi_per_tipo']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
