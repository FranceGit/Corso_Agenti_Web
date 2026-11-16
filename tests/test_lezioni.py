"""Lezioni interattive: regole di France (passi, riassunto in 3 frasi, durata), moduli JS autonomi, contenuti in IT e EN."""
from __future__ import annotations

import re

import pytest

from corso.config import RADICE_PROGETTO as RADICE
from corso.lingua import risolvi

CARTELLA_ANIM = RADICE / "webapp" / "animazioni"
CARTELLA_PROVE_JS = RADICE / "tests_js" / "lezioni"


def regole(catalogo_vero) -> dict:
    return catalogo_vero.cfg.prendi("regole_lezioni", tipo=dict)


def lezioni_con_riassunto(catalogo_vero):
    escluse = regole(catalogo_vero)["componenti_senza_riassunto"]
    return [lez for lez in catalogo_vero.tutte_le_lezioni() if lez.componente not in escluse]


def test_ogni_pillola_dei_moduli_1_e_2_ha_la_sua_lezione(catalogo_vero):
    for modulo in catalogo_vero.corso.moduli[:2]:
        for p in modulo.pillole:
            assert p.id in catalogo_vero.lezioni, f"{p.id} senza lezione interattiva"


# P3.3 (arricchimento) resta senza lezione propria: il suo nucleo (dato da fonte / ipotesi / inventato) e' gia'
# manipolabile nella lezione di P2.4; al suo posto M3 ha il laboratorio "Trova l'errore" in P3.5.
PILLOLE_M3_SENZA_LEZIONE = {"P3.3"}


def test_modulo_3_lezioni_e_laboratorio_trova_l_errore(catalogo_vero):
    for p in catalogo_vero.corso.moduli[2].pillole:
        if p.id not in PILLOLE_M3_SENZA_LEZIONE:
            assert p.id in catalogo_vero.lezioni, f"{p.id} senza lezione interattiva"
    lab = catalogo_vero.laboratori["P3.5"]
    assert lab.componente == "trova_errore" and lab.tipo == "laboratorio"
    principale = {s.id for s in catalogo_vero.lezioni["P3.5"].segmenti} - {"riassunto"}
    assert not principale & {s.id for s in lab.segmenti}, "segmenti con lo stesso id in lezione e laboratorio: l'aiuto sarebbe ambiguo"


def test_domande_del_modulo_3_erogabili_con_aiuto_nella_lezione(catalogo_vero):
    """Le domande scritte per M3 (origine autori) sono erogabili e il loro aiuto porta a un passo della lezione o del laboratorio."""
    for p in catalogo_vero.corso.moduli[2].pillole:
        nuove = [d for d in p.domande if d.origine == "autori"]
        assert len(nuove) >= 2, f"{p.id}: meno di 2 domande nuove"
        for d in nuove:
            assert catalogo_vero.erogabile(d.id), f"{d.id}: {catalogo_vero.motivi_non_erogabile[d.id]}"
            rif = catalogo_vero.riferimento_aiuto(d)
            if p.id in PILLOLE_M3_SENZA_LEZIONE:
                assert rif["scheda"] == "scaletta"
            else:
                assert rif["scheda"] in ("lezione", "laboratorio") and rif["segmento"] != "riassunto", d.id
    assert catalogo_vero.riferimento_aiuto(catalogo_vero.domanda("DA3.5-3"))["scheda"] == "laboratorio"
    assert catalogo_vero.riferimento_aiuto(catalogo_vero.domanda("DA3.5-1"))["scheda"] == "lezione"


def test_passi_con_prova_e_riassunto_finale_in_tre_frasi(catalogo_vero):
    r = regole(catalogo_vero)
    lezioni = lezioni_con_riassunto(catalogo_vero)
    assert lezioni, "nessuna lezione soggetta alla regola del riassunto"
    for lez in lezioni:
        *passi, ultimo = lez.segmenti
        assert passi, f"{lez.id}: nessun passo prima del riassunto"
        assert ultimo.id == r["id_segmento_riassunto"], f"{lez.id}: l'ultimo segmento non e' il riassunto"
        assert len(ultimo.narrazione) == r["frasi_riassunto"], f"{lez.id}: il riassunto non ha {r['frasi_riassunto']} frasi"
        for s in passi:
            assert s.prova is not None, f"{lez.id}/{s.id}: manca il 'Prova tu'"
            assert s.stato_animazione, f"{lez.id}/{s.id}: manca lo stato dell'animazione"
        chiavi = {tuple(sorted(s.stato_animazione)) for s in passi}
        assert len(chiavi) == 1, f"{lez.id}: i passi non danno all'animazione le stesse chiavi di stato"


def test_durata_della_pillola(catalogo_vero):
    massimo = regole(catalogo_vero)["parole_massime_lezione"]
    for lez in lezioni_con_riassunto(catalogo_vero):
        testi = [t.it for s in lez.segmenti for t in s.narrazione] + [s.prova.it for s in lez.segmenti if s.prova]
        parole = sum(len(t.split()) for t in testi)
        assert parole <= massimo, f"{lez.id}: {parole} parole, oltre le {massimo} di una pillola da 5-6 minuti"


def test_concetti_dei_segmenti_appartengono_alla_pillola(catalogo_vero):
    # le lezioni del dimostratore citano anche concetti prerequisiti (es. C02 in P1.3): la regola vale per le nuove
    for lez in lezioni_con_riassunto(catalogo_vero):
        pid = lez.pillola
        concetti = set(catalogo_vero.pillola(pid).concetti)
        for s in lez.segmenti:
            assert set(s.concetti) <= concetti, f"{lez.id}/{s.id}: concetti {set(s.concetti) - concetti} fuori dalla pillola {pid}"


def test_niente_rimandi_a_spiegazioni_precedenti(catalogo_vero):
    """Regola di France: mai 'come gia' spiegato', si rispiega nel nuovo contesto."""
    vietate = re.compile(r"come (gi[aà]|abbiamo) (spiegato|visto|detto)|as (already )?(explained|seen|mentioned) (before|earlier|above)", re.I)
    for lez in catalogo_vero.tutte_le_lezioni():
        for lingua in ("it", "en"):
            testo = str(risolvi(lez.model_dump(exclude={"domande"}), lingua))
            assert not vietate.search(testo), f"{lez.id} [{lingua}]: rimando a una spiegazione precedente"


@pytest.mark.parametrize("lingua", ["it", "en"])
def test_ogni_pillola_con_lezione_si_apre_in_entrambe_le_lingue(motore, lingua):
    for pid, lez in motore.cat.lezioni.items():
        c = motore.contenuto_pillola("studente@esempio.it", pid, lingua)
        assert c["lezione"]["componente"] == lez.componente
        assert c["lezione"]["segmenti"][0]["titolo"]
        lab = motore.cat.laboratori.get(pid)
        assert (c["laboratorio"] or {}).get("componente") == (lab.componente if lab else None)
        if lab:
            assert c["laboratorio"]["segmenti"][0]["titolo"] and c["laboratorio"]["tipo"] == "laboratorio"


def test_moduli_js_autonomi_e_deterministici(catalogo_vero):
    for lez in catalogo_vero.tutte_le_lezioni():
        js = (CARTELLA_ANIM / f"{lez.componente}.js").read_text(encoding="utf-8")
        assert re.search(r"^export function monta\(", js, re.M), f"{lez.componente}: manca export function monta"
        assert "Math.random" not in js and not re.search(r"\bnew Date\b|\bDate\.now\b", js), f"{lez.componente}: non deterministico"
        assert not re.search(r"https?://(?!www\.w3\.org/)", js), f"{lez.componente}: risorsa esterna (CDN) nel modulo"
        assert not re.search(r"^\s*import\s", js, re.M), f"{lez.componente}: il modulo importa altri file"
        if lez.componente not in ("ciclo_agente", "strumenti_agente"):
            assert (CARTELLA_PROVE_JS / f"{lez.componente}.mjs").is_file(), f"{lez.componente}: mancano le prove Node"


def test_moduli_delle_lezioni_serviti_dopo_l_accesso(client_dentro):
    for lez in client_dentro.app.state.catalogo.tutte_le_lezioni():
        r = client_dentro.get(f"/protetto/animazioni/{lez.componente}.js")
        assert r.status_code == 200 and r.headers["content-type"].startswith("text/javascript"), lez.componente
