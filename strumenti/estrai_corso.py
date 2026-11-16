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

FONTE DI VERITA' DELLE DOMANDE (dall'upgrade del 16/11/2026): le domande vivono in dati/corso_v1.json, dove
sono state classificate, adattate al budget di lettura, tradotte e assegnate a concetto, aiuto e striscia.
Il documento benchmark resta la loro ORIGINE STORICA. Per questo, se dati/corso_v1.json esiste gia',
l'estrattore aggiorna da documento solo moduli, pillole e knowledge graph e CONSERVA le domande del JSON,
dopo aver controllato che corrispondano ancora all'origine (stessi id per pillola, stesso testo italiano
delle due domande, stessa risposta corretta, stesso tipo di livello 2). Se il documento e' cambiato su una
domanda l'estrazione si ferma e dice quale: la riconciliazione e' un lavoro d'autore, non automatico.

CORREZIONI DEL DOCUMENTO (16/11/2026): le formulazioni smentite dai contenuti verificati sono state corrette nel
documento con la marcatura "[corretto — fonte verificata: ...]", che pulisci() toglie da tutti i testi estratti
(pillole e domande): l'impronta delle domande si confronta quindi sul testo senza marcatura. Quando una
correzione tocca il testo di una domanda (es. D8.1-a, livello 2) va applicata con le stesse parole anche al JSON.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

RADICE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RADICE))

from corso.migrazioni import migra_corso  # noqa: E402
from corso.modello import VERSIONE_SCHEMA_CORSO, Corso, KnowledgeGraph  # noqa: E402

FILE_TITOLI_EN = RADICE / "strumenti" / "titoli_en.json"
FILE_TRADUZIONI_PILLOLE = RADICE / "strumenti" / "traduzioni_en_pillole.json"
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


# Marcatura editoriale delle correzioni del documento benchmark (16/11/2026, dai contenuti verificati):
# "[corretto — fonte verificata: ...]" serve a chi legge il documento, non allo studente, e si toglie dai testi.
RE_CORRETTO = re.compile(r"\s*\[corretto — fonte verificata[^\]]*\]")


def pulisci(s: str) -> str:
    """Toglie il markdown di enfasi e le marcature delle correzioni, lascia il testo leggibile."""
    s = RE_CORRETTO.sub("", s)
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
                "striscia": None,
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


RE_TUTTE = re.compile(r"tutte le pillole dei moduli (\d+)-(\d+)")


def leggi_prerequisiti(pid: str, testo_pre: str, tutte_le_pillole: list[str]) -> list[str]:
    """'nessuno' | 'P1.1, P1.2' | 'tutte le pillole dei moduli 1-8 (in particolare ...)'."""
    if testo_pre == "nessuno":
        return []
    m = RE_TUTTE.search(testo_pre)
    if m:
        primo, ultimo = int(m.group(1)), int(m.group(2))
        return [p for p in tutte_le_pillole if p != pid and primo <= int(p[1:].split(".")[0]) <= ultimo]
    ids = [x.strip() for x in testo_pre.split(",")]
    for x in ids:
        if not re.fullmatch(r"P\d+\.\d+", x):
            raise ErroreEstrazione(f"{pid}: prerequisito non riconosciuto {x!r}")
    return ids


def estrai_pillola(pid: str, righe: list[str], titoli_en: dict, tutte_le_pillole: list[str]) -> dict:
    meta = next((RE_META.match(r) for r in righe if RE_META.match(r)), None)
    if meta is None:
        raise ErroreEstrazione(f"{pid}: riga Durata/Prerequisiti/Nodi/Fonti non trovata")
    prerequisiti = leggi_prerequisiti(pid, meta.group(2).strip(), tutte_le_pillole)
    # i nodi possono avere una nota fra parentesi, es. "C79 (integra tutti i nodi)": si tiene solo l'id
    concetti = [re.sub(r"\s*\(.*\)$", "", x.strip()) for x in meta.group(3).split(",")]
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
                "nota": testo(nota, titoli_en["note_archi"].get(nota)) if nota else None,
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


def applica_traduzioni_pillole(corso: dict, traduzioni: dict) -> None:
    """Completa in inglese obiettivo, scaletta e progetto dell'animazione delle pillole tradotte."""
    pillole = {p["id"]: p for m in corso["moduli"] for p in m["pillole"]}
    for pid, tr in traduzioni.items():
        if pid.startswith("_"):
            continue
        if pid not in pillole:
            raise ErroreEstrazione(f"traduzioni: pillola {pid} inesistente")
        p = pillole[pid]
        if len(tr["scaletta"]) != len(p["scaletta"]):
            raise ErroreEstrazione(
                f"traduzioni {pid}: {len(tr['scaletta'])} voci di scaletta tradotte, il documento ne ha {len(p['scaletta'])}"
            )
        p["obiettivo"]["en"] = tr["obiettivo"]
        for voce, testo_en in zip(p["scaletta"], tr["scaletta"]):
            voce["en"] = testo_en
        p["animazione"]["progetto"]["en"] = tr["animazione"]


def estrai(percorso_md: Path) -> tuple[dict, dict]:
    righe = percorso_md.read_text(encoding="utf-8").splitlines()
    titoli_en = json.loads(FILE_TITOLI_EN.read_text(encoding="utf-8"))
    anelli = anelli_dei_moduli(righe)
    moduli, pillole, modulo_di = blocchi_pillole(righe)
    titolo_corso = re.match(r'^# CORSO BENCHMARK: "(.+)"$', next(r for r in righe if r.startswith("# CORSO"))).group(1)
    corso = {
        "versione_schema": VERSIONE_SCHEMA_CORSO,
        "id": "corso_agenti_crm_v1",
        "titolo": testo(titolo_corso, titoli_en["corso"]),
        "fonte": percorso_md.name,
        "moduli": [
            {
                "id": mid,
                "titolo": testo(titolo, titoli_en["moduli"].get(mid)),
                "anello": anelli[mid],
                "pillole": [estrai_pillola(pid, pillole[pid], titoli_en, list(pillole)) for pid in pillole if modulo_di[pid] == mid],
            }
            for mid, titolo, _ in moduli
        ],
    }
    applica_traduzioni_pillole(corso, json.loads(FILE_TRADUZIONI_PILLOLE.read_text(encoding="utf-8")))
    kg = estrai_kg(righe, anelli, titoli_en, percorso_md.name)
    Corso.model_validate(corso)
    KnowledgeGraph.model_validate(kg)
    return corso, kg


def _impronta(d: dict) -> tuple:
    """Cio' che lega una domanda alla sua origine nel documento (non cambia con l'upgrade)."""
    corretta = lambda liv: next(o["id"] for o in liv["opzioni"] if o["corretta"])  # noqa: E731
    return (d["livello1"]["domanda"]["it"], corretta(d["livello1"]),
            d["livello2"]["tipo"], d["livello2"]["domanda"]["it"], corretta(d["livello2"]))


def conserva_domande(estratto: dict, esistente: dict) -> dict:
    """Corso estratto con le domande prese dal JSON esistente (fonte di verita'), verificate contro l'origine."""
    esistente = migra_corso(esistente)
    domande_json = {p["id"]: p["domande"] for m in esistente["moduli"] for p in m["pillole"]}
    differenze: list[str] = []
    for m in estratto["moduli"]:
        for p in m["pillole"]:
            if p["id"] not in domande_json:
                differenze.append(f"{p['id']}: pillola nuova nel documento, assente dal JSON")
                continue
            dal_doc = {d["id"]: d for d in p["domande"]}
            # solo le domande nate dal documento si confrontano con il documento; le altre (origine "autori")
            # esistono solo nel JSON e si conservano cosi' come sono
            dal_json = {d["id"]: d for d in domande_json[p["id"]] if d["origine"] == "benchmark"}
            if set(dal_doc) != set(dal_json):
                differenze.append(f"{p['id']}: domande diverse (documento {sorted(dal_doc)}, JSON {sorted(dal_json)})")
                continue
            for did, d in dal_doc.items():
                if _impronta(d) != _impronta(dal_json[did]):
                    differenze.append(f"{did}: testo della domanda, risposta corretta o tipo di livello 2 cambiati nel documento")
            p["domande"] = domande_json[p["id"]]
    if differenze:
        raise ErroreEstrazione("il documento non corrisponde piu' alle domande del JSON (fonte di verita'): " + "; ".join(differenze))
    Corso.model_validate(estratto)
    return estratto


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
    if USCITA_CORSO.is_file():
        corso = conserva_domande(corso, json.loads(USCITA_CORSO.read_text(encoding="utf-8")))
        print(f"domande conservate da {USCITA_CORSO} (fonte di verita'), verificate contro il documento")
    scrivi(USCITA_CORSO, corso)
    scrivi(USCITA_KG, kg)
    n_pill = sum(len(m["pillole"]) for m in corso["moduli"])
    n_dom = sum(len(p["domande"]) for m in corso["moduli"] for p in m["pillole"])
    print(f"scritto {USCITA_CORSO}: {len(corso['moduli'])} moduli, {n_pill} pillole, {n_dom} domande")
    print(f"scritto {USCITA_KG}: {len(kg['nodi'])} concetti, {len(kg['archi'])} archi, pesi {kg['pesi_per_tipo']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
