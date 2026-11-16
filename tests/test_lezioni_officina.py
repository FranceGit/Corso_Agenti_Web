"""Lezioni e domande del livello 2 «Officina» (cantiere OFFICINA-CONTENUTI).

Stesse regole del livello 1 (tests/test_lezioni.py, tests/test_domande_autori.py), applicate al catalogo dell'Officina
(cartella delle lezioni presa da officina.cartella_lezioni, corso da officina.file_corso): una lezione per pillola,
passi con «Prova tu», riassunto in 3 frasi, al massimo parole_massime_lezione parole, moduli JS autonomi con le loro
prove Node, domande erogabili (almeno il minimo per concetto, obiettivo 3), anti-indizio, fasce di lunghezza.
"""
from __future__ import annotations

import json
import re

import pytest

from corso.catalogo import Catalogo
from corso.config import RADICE_PROGETTO as RADICE
from corso.config import Config
from corso.lingua import risolvi
from corso.motore import Motore
from corso.officina import config_officina
from corso.percorsi import genera_strisce
from corso.stato import Archivio
from tests.conftest import FILE_CONFIG

CARTELLA_ANIM = RADICE / "webapp" / "animazioni"
CARTELLA_PROVE_JS = RADICE / "tests_js" / "lezioni"
CARTELLA_LOTTI = RADICE / "strumenti" / "domande_autori"
# autorità citate come tali: vietate nei testi per lo studente (formulazioni neutre + sigle di bibliografia)
AUTORITA = re.compile(r"\b(Google|OpenAI|Anthropic|Microsoft)\s+(dice|dicono|propone|propongono|consiglia|raccomanda|says|say|proposes|recommends|suggests)\b", re.I)


@pytest.fixture(scope="module")
def cat2() -> Catalogo:
    cfg = Config(json.loads(FILE_CONFIG.read_text(encoding="utf-8")), str(FILE_CONFIG))
    return Catalogo(config_officina(cfg))


def regole(cat) -> dict:
    return cat.cfg.prendi("regole_lezioni", tipo=dict)


def lotti_officina() -> list[dict]:
    return [d for f in sorted(CARTELLA_LOTTI.glob("lotto_o*.json")) for d in json.loads(f.read_text(encoding="utf-8"))]


# ------------------------------------------------------------------ lezioni


def test_ogni_pillola_dell_officina_ha_la_sua_lezione(cat2):
    for p in cat2.corso.pillole():
        assert p.id in cat2.lezioni, f"{p.id} senza lezione interattiva"
        assert cat2.lezioni[p.id].pillola.startswith("PO")
    assert not cat2.laboratori


def test_lezioni_nella_cartella_dell_officina_e_non_nel_livello_1(cat2, catalogo_vero):
    cartella = RADICE / cat2.cfg.prendi("officina", "cartella_lezioni", tipo=str)
    nomi = {f.stem for f in cartella.glob("*.json")}
    assert nomi == {lez.componente for lez in cat2.tutte_le_lezioni()}
    assert not nomi & {lez.componente for lez in catalogo_vero.tutte_le_lezioni()}, "componente con lo stesso nome nei due livelli"
    assert not any(lez.pillola.startswith("PO") for lez in catalogo_vero.tutte_le_lezioni())


def test_passi_con_prova_e_riassunto_finale_in_tre_frasi(cat2):
    r = regole(cat2)
    for lez in cat2.tutte_le_lezioni():
        *passi, ultimo = lez.segmenti
        assert len(passi) >= 3, f"{lez.id}: troppo pochi passi"
        assert ultimo.id == r["id_segmento_riassunto"] and ultimo.prova is None, lez.id
        assert len(ultimo.narrazione) == r["frasi_riassunto"], f"{lez.id}: il riassunto non ha {r['frasi_riassunto']} frasi"
        for s in passi:
            assert s.prova is not None, f"{lez.id}/{s.id}: manca il 'Prova tu'"
            assert s.stato_animazione, f"{lez.id}/{s.id}: manca lo stato dell'animazione"
        assert len({tuple(sorted(s.stato_animazione)) for s in lez.segmenti}) == 1, f"{lez.id}: chiavi di stato diverse fra i passi"


def test_durata_della_pillola(cat2):
    massimo = regole(cat2)["parole_massime_lezione"]
    for lez in cat2.tutte_le_lezioni():
        testi = [t.it for s in lez.segmenti for t in s.narrazione] + [s.prova.it for s in lez.segmenti if s.prova]
        parole = sum(len(t.split()) for t in testi)
        assert parole <= massimo, f"{lez.id}: {parole} parole, oltre le {massimo}"


def test_concetti_dei_segmenti_appartengono_alla_pillola(cat2):
    for lez in cat2.tutte_le_lezioni():
        concetti = set(cat2.pillola(lez.pillola).concetti)
        coperti = set()
        for s in lez.segmenti:
            assert set(s.concetti) <= concetti, f"{lez.id}/{s.id}: concetti {set(s.concetti) - concetti} fuori da {lez.pillola}"
            coperti |= set(s.concetti)
        assert coperti == concetti, f"{lez.id}: concetti della pillola mai trattati {concetti - coperti}"


@pytest.mark.parametrize("lingua", ["it", "en"])
def test_testi_completi_niente_rimandi_niente_autorita(cat2, lingua):
    vietate = re.compile(r"come (gi[aà]|abbiamo) (spiegato|visto|detto)|as (already )?(explained|seen|mentioned) (before|earlier|above)", re.I)
    for lez in cat2.tutte_le_lezioni():
        testo = str(risolvi(lez.model_dump(exclude={"domande"}), lingua))
        assert not vietate.search(testo), f"{lez.id} [{lingua}]: rimando a una spiegazione precedente"
        assert not AUTORITA.search(testo), f"{lez.id} [{lingua}]: autorità citata come tale: {AUTORITA.search(testo).group(0)}"


def test_elenchi_puntati_in_ogni_lezione(cat2):
    """Regola di France: le enumerazioni vanno a punti («• » o «1. »), un paragrafo per voce."""
    for lez in cat2.tutte_le_lezioni():
        voci = [t.it for s in lez.segmenti for t in s.narrazione if re.match(r"^(• |\d+\. )", t.it)]
        assert voci, f"{lez.id}: nessun elenco puntato"
        for s in lez.segmenti:
            for t in s.narrazione:
                assert bool(re.match(r"^(• |\d+\. )", t.it)) == bool(re.match(r"^(• |\d+\. )", t.en)), f"{lez.id}/{s.id}: elenco solo in una lingua"


@pytest.mark.parametrize("lingua", ["it", "en"])
def test_ogni_lezione_si_apre_dal_motore_dell_officina(cat2, tmp_path, orologio, lingua):
    m = Motore(cat2, Archivio(tmp_path / "l2"), orologio)
    for pid, lez in cat2.lezioni.items():
        c = m.contenuto_pillola("studente@esempio.it", pid, lingua)
        assert c["lezione"]["componente"] == lez.componente and c["lezione"]["segmenti"][0]["titolo"]


def test_moduli_js_autonomi_deterministici_e_con_prove(cat2):
    for lez in cat2.tutte_le_lezioni():
        js = (CARTELLA_ANIM / f"{lez.componente}.js").read_text(encoding="utf-8")
        assert re.search(r"^export function monta\(", js, re.M), f"{lez.componente}: manca export function monta"
        assert "Math.random" not in js and not re.search(r"\bnew Date\b|\bDate\.now\b", js), f"{lez.componente}: non deterministico"
        assert not re.search(r"https?://(?!www\.w3\.org/)", js), f"{lez.componente}: risorsa esterna nel modulo"
        assert not re.search(r"^\s*import\s", js, re.M), f"{lez.componente}: il modulo importa altri file"
        assert "position: fixed" not in js and "position:fixed" not in js, f"{lez.componente}: elemento fisso"
        assert f"lz-{lez.componente}" in js, f"{lez.componente}: banco senza la classe propria lz-{lez.componente}"
        assert (CARTELLA_PROVE_JS / f"{lez.componente}.mjs").is_file(), f"{lez.componente}: mancano le prove Node"


def test_moduli_dell_officina_serviti_dopo_l_accesso(client_dentro, cat2):
    for lez in cat2.tutte_le_lezioni():
        r = client_dentro.get(f"/protetto/animazioni/{lez.componente}.js")
        assert r.status_code == 200 and r.headers["content-type"].startswith("text/javascript"), lez.componente


def test_api_officina_serve_le_lezioni(client_dentro, cat2):
    for pid, lez in cat2.lezioni.items():
        c = client_dentro.get(f"/api/officina/pillole/{pid}?lingua=en").json()
        assert c["lezione"]["componente"] == lez.componente, pid


def test_sigle_delle_fonti_in_bibliografia(cat2):
    """Le sigle citate fra parentesi quadre nelle lezioni e i campi 'fonti' delle pillole hanno la loro voce in bibliografia."""
    bib = json.loads((RADICE / "dati" / "bibliografia.json").read_text(encoding="utf-8"))
    sigle_bib = set(re.findall(r"[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+", " ".join(o["nota"]["it"] for o in bib["opere"] if "nota" in o)))
    usate = {f for p in cat2.corso.pillole() for f in p.fonti}
    for lez in cat2.tutte_le_lezioni():
        usate |= set(re.findall(r"\[([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)\]", json.dumps(lez.model_dump(), ensure_ascii=False)))
    assert usate <= sigle_bib, f"sigle senza voce in bibliografia: {sorted(usate - sigle_bib)}"


# ------------------------------------------------------------------ domande


def test_ogni_spicchio_dell_officina_e_erogabile(cat2):
    non = [p.id for p in cat2.corso.pillole() if not genera_strisce(cat2, p.id, "x", 1).erogabile]
    assert non == [], f"spicchi dell'Officina non erogabili: {non}"


def test_tre_domande_per_concetto_da_strisce_diverse(cat2):
    minimo = cat2.cfg.prendi("percorso", "strisce_per_concetto", "minimo", tipo=int)
    for p in cat2.corso.pillole():
        erogabili = cat2.domande_erogabili(p.id)
        for c in p.concetti:
            dc = [d for d in erogabili if d.concetto_principale == c]
            assert len(dc) >= max(minimo, 3), (p.id, c, [d.id for d in dc])
            assert len({d.striscia for d in dc}) == len(dc), f"{c}: due domande dalla stessa striscia"


def test_domande_dell_officina_ben_formate_e_uguali_ai_lotti(cat2):
    lotti = {d["id"]: d for d in lotti_officina()}
    corso = json.loads((RADICE / cat2.cfg.prendi("officina", "file_corso", tipo=str)).read_text(encoding="utf-8"))
    nel_corso = [d for m in corso["moduli"] for p in m["pillole"] for d in p["domande"]]
    assert len(nel_corso) >= 51 and {d["id"] for d in nel_corso} == set(lotti)
    for d in nel_corso:
        assert d == lotti[d["id"]], f"{d['id']}: corso diverso dal lotto (si inserisce solo con inserisci_domande.py)"
        assert re.fullmatch(r"DO\d+\.\d+-\d+", d["id"]) and d["id"][2:].split("-")[0] == d["pillola"][2:], d["id"]
        assert cat2.erogabile(d["id"]), (d["id"], cat2.motivi_non_erogabile[d["id"]])
        assert d["glossario"] and all(v["termine"] and v["it"] and v["en"] for v in d["glossario"]), d["id"]
        segmenti = {s.id for s in cat2.lezioni[d["pillola"]].segmenti} - {"riassunto"}
        assert d["segmento_aiuto"] in segmenti, f"{d['id']}: aiuto fuori dai passi della lezione"
        for liv in ("livello1", "livello2"):
            for o in d[liv]["opzioni"]:
                assert o.get("spiegazione") and o["spiegazione"]["it"] and o["spiegazione"]["en"], (d["id"], liv, o["id"])
        assert not AUTORITA.search(json.dumps(d, ensure_ascii=False)), d["id"]


def test_glossario_coerente(cat2):
    """Stesso termine, stessa definizione in tutta l'Officina."""
    visti: dict[str, tuple[str, str]] = {}
    for d in lotti_officina():
        for v in d["glossario"]:
            chiave = v["termine"].lower()
            assert visti.setdefault(chiave, (v["it"], v["en"])) == (v["it"], v["en"]), f"{d['id']}: «{v['termine']}» definito in due modi"


def test_anti_indizio_e_fasce_di_lunghezza():
    livelli = [d[liv] for d in lotti_officina() for liv in ("livello1", "livello2")]
    piu_lunga = sum(1 for liv in livelli if max((len(o["testo"]["it"]), o["corretta"]) for o in liv["opzioni"])[1])
    assert piu_lunga / len(livelli) < 0.3
    assert {len(liv["opzioni"]) for liv in livelli} == {3, 4, 5, 7}
    posizioni = {[o["corretta"] for o in liv["opzioni"]].index(True) for liv in livelli}
    assert len(posizioni) >= 4, "la corretta sta quasi sempre nella stessa posizione"
