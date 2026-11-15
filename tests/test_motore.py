"""Motore dello studente: quiz a due livelli, salute, convalescenza, ripasso, aiuti, record, sblocco."""
from __future__ import annotations

import pytest

from corso.errori import ErroreConfigurazione, ErroreDati, ErroreFlusso
from tests.conftest import EMAIL, motore_con, posizione, striscia_pulita


def completa_pulito(motore, pid):
    motore.inizia_spicchio(EMAIL, pid)
    e = None
    while True:
        e = striscia_pulita(motore, EMAIL, pid)
        if e["prossimo"] != "striscia_successiva":
            return e


def test_stato_iniziale(motore):
    r = motore.riepilogo(EMAIL, "it")
    assert r["salute"] == r["salute_massima"] == 100
    assert r["convalescenza"] is False and r["record"] is None and r["in_corso"] is None
    assert r["debriefing"]["motivo"] is None


def test_domanda_non_rivela_la_risposta(motore):
    motore.inizia_spicchio(EMAIL, "P1.3")
    v = motore.domanda_spicchio(EMAIL, "P1.3", "it")
    assert set(v) == {"pillola", "livello", "tipo_livello2", "testo", "opzioni", "progresso"}
    assert all(set(o) == {"posizione", "testo"} for o in v["opzioni"])
    # richiederla di nuovo non rimescola: stessa presentazione
    assert motore.domanda_spicchio(EMAIL, "P1.3", "it") == v
    # in inglese stessa domanda e stesso ordine, testi tradotti
    ven = motore.domanda_spicchio(EMAIL, "P1.3", "en")
    assert len(ven["opzioni"]) == len(v["opzioni"]) and ven["testo"] != v["testo"]


def test_passaggio_pulito_nessun_danno_e_livello2(motore):
    motore.inizia_spicchio(EMAIL, "P1.3")
    motore.domanda_spicchio(EMAIL, "P1.3", "it")
    e1 = motore.rispondi(EMAIL, posizione(motore, EMAIL, True), "it")
    assert e1["corretta"] and e1["danno"] == 0 and e1["prossimo"] == "livello2"
    assert e1["livello2"]["livello"] == 2 and e1["livello2"]["tipo_livello2"]
    e2 = motore.rispondi(EMAIL, posizione(motore, EMAIL, True), "it")
    assert e2["striscia_pulita"] and e2["danno"] == 0 and e2["salute"] == 100 and e2["aiuto"] is None


@pytest.mark.parametrize("tipo, atteso", [("quasi", 8), ("poco", 15), ("errata", 25)])
def test_danno_dal_tipo_di_distrattore_al_livello1(motore, tipo, atteso):
    motore.inizia_spicchio(EMAIL, "P1.3")
    motore.domanda_spicchio(EMAIL, "P1.3", "it")
    e = motore.rispondi(EMAIL, posizione(motore, EMAIL, False, tipo), "it")
    assert not e["corretta"] and e["scelta"]["tipo_distrattore"] == tipo
    assert e["danno"] == atteso and e["salute"] == 100 - atteso
    assert e["scelta"]["spiegazione"] and e["risposta_corretta"]["testo"] and e["perche"]
    assert e["prossimo"] == "striscia_successiva"  # niente livello 2 dopo un livello 1 sbagliato
    assert e["striscia_pulita"] is False


def test_errore_al_livello2_danno_ridotto(motore):
    motore.inizia_spicchio(EMAIL, "P1.3")
    motore.domanda_spicchio(EMAIL, "P1.3", "it")
    motore.rispondi(EMAIL, posizione(motore, EMAIL, True), "it")
    e = motore.rispondi(EMAIL, posizione(motore, EMAIL, False, "errata"), "it")
    assert e["danno"] == 15 and e["striscia_pulita"] is False


def test_livello2_anche_dopo_errore_se_configurato(dati_config, tmp_path, orologio):
    m = motore_con(dati_config, tmp_path, orologio, **{"domande.l2_dopo_l1_errata": True})
    m.inizia_spicchio(EMAIL, "P1.3")
    m.domanda_spicchio(EMAIL, "P1.3", "it")
    e1 = m.rispondi(EMAIL, posizione(m, EMAIL, False, "quasi"), "it")
    assert e1["prossimo"] == "livello2"
    e2 = m.rispondi(EMAIL, posizione(m, EMAIL, True), "it")
    assert e2["striscia_pulita"] is False  # giusto al livello 2 ma con correzione al livello 1


def test_spicchio_superato_e_record_finale(motore):
    e = completa_pulito(motore, "P1.3")
    assert e["spicchio_concluso"] and e["spicchio"]["stato"] == "superato"
    assert e["risultato_percorso"] is None  # manca ancora P4.1
    e = completa_pulito(motore, "P4.1")
    rp = e["risultato_percorso"]
    assert rp["completato"] and rp["nuovo_record"]
    assert rp["record"]["quota_passaggi_puliti"] == 1.0 and rp["record"]["salute_finale"] == 100
    with pytest.raises(ErroreFlusso, match="superato"):
        motore.inizia_spicchio(EMAIL, "P1.3")
    r = motore.riepilogo(EMAIL, "it")
    assert r["percorsi_completati"] == 1 and r["record"]["giro"] == 1
    # nuovo giro: salute piena, record conservato, ordine diverso possibile
    g = motore.ricomincia(EMAIL)
    assert g == {"giro": 2, "salute": 100}
    assert motore.riepilogo(EMAIL, "it")["record"]["quota_passaggi_puliti"] == 1.0


def test_record_non_peggiora(motore):
    completa_pulito(motore, "P1.3")
    completa_pulito(motore, "P4.1")
    motore.ricomincia(EMAIL)
    # secondo giro con un errore iniziale: quota piu' bassa, il record resta quello del primo giro
    motore.inizia_spicchio(EMAIL, "P1.3")
    motore.domanda_spicchio(EMAIL, "P1.3", "it")
    motore.rispondi(EMAIL, posizione(motore, EMAIL, False, "quasi"), "it")
    while True:
        e = striscia_pulita(motore, EMAIL, "P1.3")
        if e["prossimo"] != "striscia_successiva":
            break
    assert e["spicchio"]["stato"] in ("superato", "non_superato")
    if e["spicchio"]["stato"] == "superato":
        e = completa_pulito(motore, "P4.1")
        assert e["risultato_percorso"]["nuovo_record"] is False
        assert e["risultato_percorso"]["record"]["giro"] == 1


def test_spicchio_non_superato_e_nuovo_tentativo(motore):
    motore.inizia_spicchio(EMAIL, "P1.3")
    while True:
        motore.domanda_spicchio(EMAIL, "P1.3", "it")
        e = motore.rispondi(EMAIL, posizione(motore, EMAIL, False, "quasi"), "it")
        if e["prossimo"] in ("spicchio_concluso", "debriefing"):
            break
    st = motore.stato(EMAIL)
    if st.convalescenza:
        pytest.skip("con questo seme la salute arriva a zero prima della fine: coperto dal test di convalescenza")
    assert e["spicchio"]["stato"] == "non_superato"
    nuovo = motore.inizia_spicchio(EMAIL, "P1.3")
    assert nuovo["tentativo"] == 2 and nuovo["risposte"] == 0


def test_scala_degli_aiuti(motore):
    motore.inizia_spicchio(EMAIL, "P1.3")
    aiuti = []
    concetti = []
    for _ in range(4):
        st = motore.stato(EMAIL)
        sp = st.spicchi["P1.3"]
        if sp.indice >= len(sp.strisce):
            break
        motore.domanda_spicchio(EMAIL, "P1.3", "it")
        concetti.append(motore.cat.domanda(motore.stato(EMAIL).in_corso.domanda).concetto_principale)
        e = motore.rispondi(EMAIL, posizione(motore, EMAIL, False, "quasi"), "it")
        aiuti.append(e["aiuto"])
    pad = motore.stato(EMAIL).padronanza
    for c, a in zip(concetti, aiuti):
        pass
    # il primo errore su un concetto non da' aiuti; il secondo consecutivo propone il segmento; il terzo la pillola
    visti = {}
    for c, a in zip(concetti, aiuti):
        visti[c] = visti.get(c, 0) + 1
        n = visti[c]
        if n == 1:
            assert a is None
        elif n == 2:
            assert a["tipo"] == "segmento" and a["pillola"] == "P1.3" and a["segmento"]
        else:
            assert a == {"tipo": "pillola_intera", "pillola": "P1.3"}
    assert sum(p.fallimenti_consecutivi for p in pad.values()) == len(concetti)


def test_aiuto_con_tipo_non_previsto(dati_config, tmp_path, orologio):
    m = motore_con(dati_config, tmp_path, orologio, **{"aiuti.scala": [{"dopo_fallimenti_consecutivi": 1, "tipo": "video_magico"}]})
    m.inizia_spicchio(EMAIL, "P1.3")
    m.domanda_spicchio(EMAIL, "P1.3", "it")
    with pytest.raises(ErroreConfigurazione, match="video_magico"):
        m.rispondi(EMAIL, posizione(m, EMAIL, False, "quasi"), "it")


def test_convalescenza_non_bloccante_e_debriefing(motore):
    motore.inizia_spicchio(EMAIL, "P1.3")
    e = None
    for _ in range(20):
        st = motore.stato(EMAIL)
        if st.convalescenza:
            break
        sp = st.spicchi["P1.3"]
        if sp.stato != "in_corso":
            motore.inizia_spicchio(EMAIL, "P1.3")
        motore.domanda_spicchio(EMAIL, "P1.3", "it")
        e = motore.rispondi(EMAIL, posizione(motore, EMAIL, False, "errata"), "it")
    assert e["convalescenza"] and e["salute"] == 0 and e["prossimo"] == "debriefing"
    with pytest.raises(ErroreFlusso, match="debriefing"):
        motore.domanda_spicchio(EMAIL, "P1.3", "it")
    with pytest.raises(ErroreFlusso):
        motore.inizia_spicchio(EMAIL, "P4.1")
    info = motore.info_debriefing(EMAIL)
    assert info["motivo"] == "convalescenza" and info["totale"] >= 1
    with pytest.raises(ErroreFlusso, match="iniziato"):
        motore.domanda_debriefing(EMAIL, "it")
    inizio = motore.inizia_debriefing(EMAIL)
    assert inizio["in_corso"] and inizio["elementi"] >= 1
    assert motore.inizia_debriefing(EMAIL) == inizio  # idempotente
    with pytest.raises(ErroreFlusso, match="mancano"):
        motore.concludi_debriefing(EMAIL)
    recuperato = 0
    while True:
        v = motore.domanda_debriefing(EMAIL, "it")
        assert v == motore.domanda_debriefing(EMAIL, "it")
        motore.rispondi(EMAIL, posizione(motore, EMAIL, True), "it")
        r = motore.rispondi(EMAIL, posizione(motore, EMAIL, True), "it")
        recuperato += r["recuperato"]
        if r["prossimo"] == "debriefing_finito":
            break
    assert recuperato > 0
    with pytest.raises(ErroreFlusso, match="esauriti"):
        motore.domanda_debriefing(EMAIL, "it")
    fine = motore.concludi_debriefing(EMAIL)
    assert fine["motivo"] == "convalescenza" and fine["salute"] >= 60
    st = motore.stato(EMAIL)
    assert not st.convalescenza and st.debriefing is None
    with pytest.raises(ErroreFlusso, match="nessun debriefing"):
        motore.concludi_debriefing(EMAIL)


def test_ripasso_distanziato_recupera_salute(motore, orologio):
    motore.inizia_spicchio(EMAIL, "P1.3")
    motore.domanda_spicchio(EMAIL, "P1.3", "it")
    motore.rispondi(EMAIL, posizione(motore, EMAIL, False, "poco"), "it")
    assert motore.stato(EMAIL).salute == 85
    assert motore.info_debriefing(EMAIL)["motivo"] is None  # non ancora scaduto
    with pytest.raises(ErroreFlusso, match="da rivedere"):
        motore.inizia_debriefing(EMAIL)
    orologio.avanza(25)
    assert motore.info_debriefing(EMAIL) == {"motivo": "ripasso", "in_corso": False, "scaduti": 1, "totale": 1, "elementi": None, "indice": None}
    motore.inizia_debriefing(EMAIL)
    motore.domanda_debriefing(EMAIL, "it")
    motore.rispondi(EMAIL, posizione(motore, EMAIL, True), "it")
    r = motore.rispondi(EMAIL, posizione(motore, EMAIL, True), "it")
    assert r["recuperato"] == 10 and r["salute"] == 95 and r["imparato"] is False
    voce = motore.stato(EMAIL).da_rivedere[0]
    assert voce.gradino == 1 and (voce.scadenza - orologio()).total_seconds() == 72 * 3600
    assert motore.concludi_debriefing(EMAIL)["recuperato"] == 10


def test_ripasso_sbagliato_riporta_al_primo_gradino_senza_danno(motore, orologio):
    motore.inizia_spicchio(EMAIL, "P1.3")
    motore.domanda_spicchio(EMAIL, "P1.3", "it")
    motore.rispondi(EMAIL, posizione(motore, EMAIL, False, "poco"), "it")
    orologio.avanza(25)
    motore.inizia_debriefing(EMAIL)
    motore.domanda_debriefing(EMAIL, "it")
    r = motore.rispondi(EMAIL, posizione(motore, EMAIL, False, "errata"), "it")
    assert r["danno"] == 0 and r["salute"] == 85 and r["recuperato"] == 0
    assert motore.stato(EMAIL).da_rivedere[0].gradino == 0


def test_flussi_fuori_sequenza(motore):
    with pytest.raises(ErroreFlusso, match="non c'e'"):
        motore.rispondi(EMAIL, 1, "it")
    with pytest.raises(ErroreFlusso, match="va iniziato"):
        motore.domanda_spicchio(EMAIL, "P1.3", "it")
    with pytest.raises(ErroreFlusso, match="in preparazione"):
        motore.inizia_spicchio(EMAIL, "P1.1")
    motore.inizia_spicchio(EMAIL, "P1.3")
    assert motore.inizia_spicchio(EMAIL, "P1.3")["tentativo"] == 1  # gia' in corso: continua
    motore.domanda_spicchio(EMAIL, "P1.3", "it")
    with pytest.raises(ErroreFlusso, match="fuori"):
        motore.rispondi(EMAIL, 99, "it")


def test_vista_percorso(motore):
    v = motore.vista_percorso(EMAIL, "en")
    assert v["corso"].startswith("Building AI agents")
    spicchi = {s["pillola"]: s for a in v["anelli"] for s in a["spicchi"]}
    assert len(spicchi) == 40
    assert spicchi["P1.3"]["stato"] == "da_iniziare" and spicchi["P1.3"]["ha_lezione"] and spicchi["P1.3"]["erogabile"]
    assert spicchi["P1.1"]["stato"] == "in_preparazione" and spicchi["P1.1"]["carenze"]
    assert all(a["sbloccato"] for a in v["anelli"])  # politica "libero" del dimostratore


def test_politica_sequenziale(dati_config, tmp_path, orologio):
    m = motore_con(dati_config, tmp_path, orologio, **{"percorso.politica_sblocco": "sequenziale"})
    v = m.vista_percorso(EMAIL, "it")
    sblocco = {a["numero"]: a["sbloccato"] for a in v["anelli"]}
    assert sblocco[1] and not sblocco[2]
    with pytest.raises(ErroreFlusso, match="anello 3"):
        m.inizia_spicchio(EMAIL, "P4.1")
    with pytest.raises(ErroreFlusso):
        m.contenuto_pillola(EMAIL, "P4.1", "it")
    completa_pulito(m, "P1.3")
    sblocco = {a["numero"]: a["sbloccato"] for a in m.vista_percorso(EMAIL, "it")["anelli"]}
    # l'anello 2 non ha spicchi erogabili (nulla da superare): si apre anche il 3, che contiene P4.1
    assert sblocco[2] and sblocco[3] and not sblocco[4]
    completa_pulito(m, "P4.1")
    sblocco = {a["numero"]: a["sbloccato"] for a in m.vista_percorso(EMAIL, "it")["anelli"]}
    assert all(sblocco.values())


def test_politica_sconosciuta(dati_config, tmp_path, orologio):
    m = motore_con(dati_config, tmp_path, orologio, **{"percorso.politica_sblocco": "a_caso"})
    with pytest.raises(ErroreConfigurazione, match="a_caso"):
        m.vista_percorso(EMAIL, "it")


def test_criterio_record_non_valido(dati_config, tmp_path, orologio):
    m = motore_con(dati_config, tmp_path, orologio, **{"record.criteri": ["simpatia"]})
    completa_pulito(m, "P1.3")
    m.inizia_spicchio(EMAIL, "P4.1")
    with pytest.raises(ErroreConfigurazione, match="simpatia"):
        while True:
            striscia_pulita(m, EMAIL, "P4.1")


def test_contenuto_pillola_senza_domande(motore):
    c = motore.contenuto_pillola(EMAIL, "P4.1", "en")
    assert "domande" not in c and "domande" not in c["lezione"]
    assert c["lezione"]["componente"] == "strumenti_agente"
    assert c["concetti"][0]["nome"] == "Function calling"


def test_stato_corrotto_errore_esplicito(motore):
    motore.stato(EMAIL)
    f = next(motore.archivio.cartella.glob("*.json"))
    f.write_text("{rotto", encoding="utf-8")
    with pytest.raises(ErroreDati, match="illeggibile"):
        motore.stato(EMAIL)
    with pytest.raises(ErroreDati, match="nessuno stato"):
        motore.archivio.carica("altro@esempio.it")
