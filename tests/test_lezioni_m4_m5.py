"""Lezioni interattive dei moduli M4 (strumenti e MCP) e M5 (contesto, sessioni, memoria) e loro domande v2.

Le regole generali delle lezioni (passi, riassunto in 3 frasi, durata, IT/EN, moduli autonomi) le controlla
tests/test_lezioni.py su tutte le lezioni; qui si controlla la copertura dei due moduli e l'aggancio delle
domande nuove ai passi delle lezioni.
"""
from __future__ import annotations

LEZIONI_M4_M5 = {
    "P4.1": "strumenti_agente",  # lezione del dimostratore
    "P4.2": "strumento_chiaro",
    "P4.3": "presa_standard",
    "P4.4": "valigia_strumenti",
    "P4.5": "raggi_x",
    "P5.1": "valigia_contesto",
    "P5.2": "linea_sessione",
    "P5.3": "imbuto_ricordi",
    "P5.4": "mappa_significati",
    "P5.5": "dove_dato",
}

# domande scritte insieme alle lezioni M4-M5: due per pillola, con striscia scelta fra quelle che mancavano
NUOVE = {
    "P4.2": ["DA4.2-4", "DA4.2-5"], "P4.3": ["DA4.3-4", "DA4.3-5"], "P4.4": ["DA4.4-4", "DA4.4-5"],
    "P4.5": ["DA4.5-4", "DA4.5-5"], "P5.1": ["DA5.1-1", "DA5.1-2"], "P5.2": ["DA5.2-4", "DA5.2-5"],
    "P5.3": ["DA5.3-4", "DA5.3-5"], "P5.4": ["DA5.4-4", "DA5.4-5"], "P5.5": ["DA5.5-4", "DA5.5-5"],
}


def test_ogni_pillola_di_m4_e_m5_ha_la_sua_lezione(catalogo_vero):
    for modulo in catalogo_vero.corso.moduli:
        if modulo.id not in ("M4", "M5"):
            continue
        for p in modulo.pillole:
            assert p.id in catalogo_vero.lezioni, f"{p.id} senza lezione interattiva"
            assert catalogo_vero.lezioni[p.id].componente == LEZIONI_M4_M5[p.id]


def test_domande_nuove_erogabili_con_aiuto_su_un_passo_della_lezione(catalogo_vero):
    for pid, ids in NUOVE.items():
        passi = {s.id for s in catalogo_vero.lezioni[pid].segmenti} - {"riassunto"}
        for qid in ids:
            d = catalogo_vero.domanda(qid)
            assert d.origine == "autori" and catalogo_vero.erogabile(qid), (qid, catalogo_vero.motivi_non_erogabile.get(qid))
            rif = catalogo_vero.riferimento_aiuto(d)
            assert rif["scheda"] == "lezione" and rif["segmento"] in passi, (qid, rif)


def test_le_domande_nuove_portano_punti_di_vista_che_mancavano(catalogo_vero):
    """Ogni concetto di M4-M5 toccato dalle domande nuove ha almeno 3 punti di vista diversi."""
    for pid, ids in NUOVE.items():
        p = catalogo_vero.pillola(pid)
        for c in {catalogo_vero.domanda(q).concetto_principale for q in ids}:
            strisce = {d.striscia for d in p.domande if d.concetto_principale == c}
            assert len(strisce) >= 3, (pid, c, strisce)


def test_output_strutturato_c21_non_e_solo_definizione(catalogo_vero):
    """P2.2 / C21 aveva 3 domande tutte 'definizione': ora ha anche esempio pratico e diagnosi, con aiuto nella lezione."""
    p = catalogo_vero.pillola("P2.2")
    strisce = {d.striscia for d in p.domande if d.concetto_principale == "C21"}
    assert {"definizione", "esempio_pratico", "diagnosi"} <= strisce
    for qid in ("DA2.2-1", "DA2.2-2"):
        assert catalogo_vero.erogabile(qid)
        assert catalogo_vero.riferimento_aiuto(catalogo_vero.domanda(qid))["scheda"] == "lezione"
