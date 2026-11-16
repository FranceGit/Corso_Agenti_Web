"""Lezioni interattive dei moduli M6 (multi-agente e A2A), M7 (valutazione e osservabilita') e M8 (produzione e
governance), il laboratorio del rilascio canarino (P8.1) e le domande v2 scritte con loro.

Le regole generali delle lezioni (passi con "Prova tu", riassunto in 3 frasi, durata, concetti della pillola, IT/EN,
moduli JS autonomi e deterministici) le controlla tests/test_lezioni.py su tutte le lezioni; qui si controllano la
copertura dei tre moduli, l'aggancio delle domande nuove ai passi delle lezioni e le formulazioni verificate che le
lezioni devono riportare (CORSO_CONTENUTI_VERIFICATI.md).
"""
from __future__ import annotations

import re

from corso.lingua import risolvi

LEZIONI_M6_M8 = {
    "P6.1": "uno_o_tanti",
    "P6.2": "schemi_orchestrazione",
    "P6.3": "due_piani_agenti",
    "P6.4": "trappole_squadra",
    "P7.1": "cinque_strade",
    "P7.2": "tre_pilastri",
    "P7.3": "griglia_test",
    "P7.4": "giudice_bias",
    "P7.5": "metriche_impatto",
    "P8.1": "prototipo_produzione",
    "P8.2": "smistatore_rischio",
    "P8.3": "plancia_controllo",
    "P8.4": "caveau_dati",
    "P8.5": "bolletta_agente",
    "P8.6": "blueprint_crm",
}
LABORATORI_M6_M8 = {"P8.1": "rilascio_canary"}

# Pillole senza lezione propria: nessuna. P6.4 (trappole del multi-agente) e P8.5 (costi) erano rimaste sulla
# scaletta nella fase 6 e hanno avuto la loro lezione nel cantiere dei completamenti (trappole_squadra,
# bolletta_agente). Le loro domande benchmark conservano l'aiuto sulla scaletta, che resta valido.
SENZA_LEZIONE: set[str] = set()

# domande v2 scritte insieme alle lezioni (lotti strumenti/domande_autori/lotto_m6_*, lotto_m7_*, lotto_m8_*)
NUOVE = {
    "P6.1": ["DA6.1-1", "DA6.1-2"], "P6.2": ["DA6.2-4", "DA6.2-5"], "P6.3": ["DA6.3-4", "DA6.3-5"],
    "P7.1": ["DA7.1-4", "DA7.1-5"], "P7.2": ["DA7.2-4", "DA7.2-5"], "P7.3": ["DA7.3-4", "DA7.3-5"],
    "P7.4": ["DA7.4-4", "DA7.4-5"], "P7.5": ["DA7.5-4", "DA7.5-5"],
    "P8.1": ["DA8.1-4", "DA8.1-5", "DA8.1-6", "DA8.1-7"], "P8.2": ["DA8.2-4", "DA8.2-5"],
    "P8.3": ["DA8.3-4", "DA8.3-5", "DA8.3-6"], "P8.4": ["DA8.4-4", "DA8.4-5", "DA8.4-6"],
    "P8.6": ["DA8.6-1", "DA8.6-2", "DA8.6-3"],
    # cantiere dei completamenti
    "P6.4": ["DA6.4-1", "DA6.4-2"], "P8.5": ["DA8.5-4", "DA8.5-5"],
}
AIUTO_NEL_LABORATORIO = {"DA8.1-6", "DA8.1-7"}


def testo(lez, lingua: str) -> str:
    return str(risolvi(lez.model_dump(exclude={"domande"}), lingua))


def test_ogni_pillola_di_m6_m7_m8_ha_la_sua_lezione(catalogo_vero):
    for modulo in catalogo_vero.corso.moduli:
        if modulo.id not in ("M6", "M7", "M8"):
            continue
        for p in modulo.pillole:
            if p.id in SENZA_LEZIONE:
                assert p.id not in LEZIONI_M6_M8
                continue
            assert p.id in catalogo_vero.lezioni, f"{p.id} senza lezione interattiva"
            assert catalogo_vero.lezioni[p.id].componente == LEZIONI_M6_M8[p.id]


def test_laboratorio_del_rilascio_canarino(catalogo_vero):
    for pid, comp in LABORATORI_M6_M8.items():
        lab = catalogo_vero.laboratori[pid]
        assert lab.componente == comp and lab.tipo == "laboratorio"
        principale = {s.id for s in catalogo_vero.lezioni[pid].segmenti} - {"riassunto"}
        assert not principale & {s.id for s in lab.segmenti}, "stesso id in lezione e laboratorio: l'aiuto sarebbe ambiguo"
    assert "P8.1" in catalogo_vero.rapporto()["laboratori"]


def test_domande_nuove_erogabili_con_aiuto_su_un_passo(catalogo_vero):
    for pid, ids in NUOVE.items():
        for qid in ids:
            d = catalogo_vero.domanda(qid)
            assert d.pillola == pid and d.origine == "autori", qid
            assert catalogo_vero.erogabile(qid), (qid, catalogo_vero.motivi_non_erogabile.get(qid))
            rif = catalogo_vero.riferimento_aiuto(d)
            scheda = "laboratorio" if qid in AIUTO_NEL_LABORATORIO else "lezione"
            fonte = catalogo_vero.laboratori[pid] if scheda == "laboratorio" else catalogo_vero.lezioni[pid]
            passi = {s.id for s in fonte.segmenti} - {"riassunto"}
            assert rif["scheda"] == scheda and rif["segmento"] in passi, (qid, rif)


def test_domande_nuove_con_punti_di_vista_diversi(catalogo_vero):
    for pid, ids in NUOVE.items():
        strisce = [catalogo_vero.domanda(q).striscia for q in ids]
        assert len(set(strisce)) >= 2, (pid, strisce)
        assert all(s != "definizione" for s in strisce), (pid, strisce)


def test_pillole_senza_lezione_restano_sulla_scaletta(catalogo_vero):
    for pid in SENZA_LEZIONE:
        assert pid not in catalogo_vero.lezioni
        for d in catalogo_vero.pillola(pid).domande:
            assert catalogo_vero.riferimento_aiuto(d)["scheda"] == "scaletta", d.id


def test_formulazioni_verificate_dei_tre_pilastri(catalogo_vero):
    """P7.2: log = cosa, tracce = perche', metriche = quanto bene (WP4 p.43)."""
    lez = catalogo_vero.lezioni["P7.2"]
    it, en = testo(lez, "it").lower(), testo(lez, "en").lower()
    for parola in ("log", "tracc", "metrich"):
        assert parola in it
    assert re.search(r"che cosa|cosa", it) and "perché" in it and "quanto bene" in it
    assert "what happened" in en and "why" in en and "how well" in en


def test_canary_parte_dall_1_per_cento(catalogo_vero):
    """P8.1: il rilascio canarino parte dall'1% degli utenti (WP5 p.16), non dal 5%."""
    lab = catalogo_vero.laboratori["P8.1"]
    for lingua in ("it", "en"):
        assert re.search(r"\b1\s?%", testo(lab, lingua)), lingua
    gradini = lab.scenario["gradini"]
    assert gradini[0] == 1 and gradini == sorted(gradini) and gradini[-1] == 100


def test_handoff_e_quattro_pilastri_della_qualita(catalogo_vero):
    """P6.2/P6.3: il passaggio di consegne di OpenAI; P7.1: i pilastri della qualita' nella versione del cap. 1 di WP4."""
    for pid in ("P6.2", "P6.3"):
        assert "handoff" in testo(catalogo_vero.lezioni[pid], "en").lower(), pid
    it = testo(catalogo_vero.lezioni["P7.1"], "it").lower()
    for pilastro in ("efficacia", "efficienza", "robustezza", "sicurezza"):
        assert pilastro in it, pilastro


def test_contenuti_senza_fonte_dichiarati(catalogo_vero):
    """Bias del giudice di lunghezza e auto-preferenza [EXP]; kill switch e fail-closed dal benchmark [R15]."""
    marcatura = re.compile(r"\[EXP\]|\[R15\]|non (è|e') (nelle|scritt)|non compa|fonti? non|competenza|esperienza del progettista|benchmark", re.I)
    for pid in ("P6.4", "P7.4", "P8.2", "P8.3", "P8.4", "P8.5"):
        assert marcatura.search(testo(catalogo_vero.lezioni[pid], "it")), pid


def test_trappole_del_multi_agente(catalogo_vero):
    """P6.4: le quattro trappole (telefono senza fili, rimpallo, costo, colpa) con contatore e grafo dei messaggi;
    l'identificativo comune si chiama trace ID (WP5 p.32), non correlation id."""
    lez = catalogo_vero.lezioni["P6.4"]
    viste = {s.stato_animazione["vista"] for s in lez.segmenti}
    assert {"catena", "rimpallo", "esplode", "colpa", "decidi"} <= viste
    en = testo(lez, "en").lower()
    assert "trace id" in en and "correlation" not in en
    sc = lez.scenario
    assert sc["rimpallo"]["limite"]["min"] == 0, "deve esistere lo stato senza limite (il ciclo infinito)"
    assert sc["colpa"]["colpevole"] in {a["id"] for a in sc["colpa"]["agenti"]}


def test_costi_con_prezzi_dichiarati_illustrativi(catalogo_vero):
    """P8.5: prezzi d'esempio dichiarati illustrativi; rapporti dalle fonti (uscita 5x ingresso, cache un decimo)."""
    lez = catalogo_vero.lezioni["P8.5"]
    sc = lez.scenario
    assert re.search(r"illustrativ", str(sc["testi"]["nota_prezzi"]["it"]), re.I)
    assert re.search(r"illustrati", str(sc["testi"]["nota_prezzi"]["en"]), re.I)
    for m in sc["modelli"]:
        assert m["euro_uscita"] == 5 * m["euro_ingresso"], m["id"]
    assert sc["cache"]["rapporto_prezzo"] == 0.1
    assert [m["id"] for m in sc["modelli"]] == ["piccolo", "medio", "grande"]
    concetti = {c for s in lez.segmenti for c in s.concetti}
    assert concetti == set(catalogo_vero.pillola("P8.5").concetti)
