"""I tre esercizi collaudati con il finto-LLM: soluzione di riferimento, errori tipici, dati nascosti."""
from __future__ import annotations

import json

import pytest

from corso.config import RADICE_PROGETTO
from corso.errori import ErroreFlusso
from esercizi.catalogo import e02_punteggio_regole as e02
from esercizi.catalogo import e03_trova_errore as e03
from esercizi.catalogo.e01_pulizia_lead import RE_EMAIL, genera, segmento_atteso
from esercizi.catalogo.punteggio import classifica, vincolo_high, vincolo_mai_high

from .conftest import ALTRA, EMAIL
from .soluzioni import PESI_GIUSTI, chiave_e01, risolvi_e01, risolvi_e02, risolvi_e03


def esiti(v) -> dict:
    return {c["id"]: c["superato"] for c in v["controlli"]}


# ================================================================== esercizio 1: pulizia dei lead

@pytest.mark.parametrize("seme", [1, 2, 3, 20261116, 987654321])
def test_e01_ogni_variante_ha_i_difetti_dichiarati(seme):
    d = genera(seme)
    righe, persone = d["righe"], d["chiave"]["persone"]
    assert len(righe) == 25 and len(persone) == 22
    assert sum(p["duplicato"] for p in persone) == 3 and sum(p["malformata"] for p in persone) == 2
    assert sum(p["da_completare"] for p in persone) == 1 and sum(p["optout"] for p in persone) == 2
    assert sum(1 for r in righe if not RE_EMAIL.match(r["email"])) == 2
    # una delle due persone disiscritte ha il «non contattare» SOLO sulla riga doppia (la trappola)
    trappola = [p for p in persone if p["optout"] and p["duplicato"]]
    assert len(trappola) == 1
    flag = [r["optout"] for r in righe if r["id"] in trappola[0]["ids"]]
    assert sorted(flag) == [False, True]
    assert genera(seme) == d  # deterministico


def test_e01_varianti_diverse_per_studenti_diversi(motore):
    assert chiave_e01(motore, EMAIL) != chiave_e01(motore, ALTRA)


def test_e01_confini_dei_segmenti():
    assert [segmento_atteso(x) for x in (1, 50, 51, 500, 501, None)] == ["PMI", "PMI", "Mid-market", "Mid-market", "Enterprise", None]


def test_e01_stato_iniziale_non_passa_e_spiega(motore):
    v = motore.verifica(EMAIL, 1)
    assert v["voto"] == 0 and v["bloccato_da"] == ["disiscritti"]
    assert "seconda riga attiva" in next(c for c in v["controlli"] if c["id"] == "disiscritti")["spiegazione"]["it"]


def test_e01_soluzione_di_riferimento_100(motore):
    risolvi_e01(motore, EMAIL)
    v = motore.verifica(EMAIL, 1)
    assert v["voto"] == 100 and v["superato"], v["riassunto"]
    area = motore.scheda(EMAIL, 1, "it")["area"]
    assert area["contatori"] == {"totali": 25, "attivi": 22, "uniti": 3, "esclusi": 0}


def test_e01_trappola_disiscritto_perso_nell_unione_e_bloccante(motore):
    chiave = risolvi_e01(motore, EMAIL, principale_sbagliato=True)
    v = motore.verifica(EMAIL, 1)
    assert v["voto"] == 0 and v["bloccato_da"] == ["disiscritti"]
    nome = next(p["nome"] for p in chiave["persone"] if p["optout"] and p["duplicato"])
    assert nome in next(c for c in v["controlli"] if c["id"] == "disiscritti")["spiegazione"]["it"]
    # rimedio indicato dall'aiuto: riaccendere «non contattare» sulla riga tenuta
    persona = next(p for p in chiave["persone"] if p["optout"] and p["duplicato"])
    attiva = next(r["id"] for r in motore.scheda(EMAIL, 1, "it")["area"]["righe"] if r["id"] in persona["ids"] and r["stato"] == "attivo")
    motore.azione(EMAIL, 1, "optout", {"contatto": attiva, "valore": True}, "it")
    assert motore.verifica(EMAIL, 1)["voto"] == 100


def test_e01_escludere_invece_di_unire_perde_la_storia(motore):
    chiave = risolvi_e01(motore, EMAIL, salta=("unisci",))
    for p in chiave["persone"]:
        if p["duplicato"]:
            righe = {r["id"]: r for r in motore.scheda(EMAIL, 1, "it")["area"]["righe"]}
            togli = p["ids"][1] if not righe[p["ids"][1]]["optout"] else p["ids"][0]
            motore.azione(EMAIL, 1, "escludi", {"contatto": togli}, "it")
            tieni = [i for i in p["ids"] if i != togli][0]
            motore.azione(EMAIL, 1, "correggi_email", {"contatto": tieni, "email": p["email"]}, "it")
            if p["optout"]:
                motore.azione(EMAIL, 1, "optout", {"contatto": tieni, "valore": True}, "it")
    v = motore.verifica(EMAIL, 1)
    e = esiti(v)
    assert e["contatti_attivi"] and not e["duplicati_uniti"] and v["voto"] == 80


def test_e01_escludere_le_email_rotte_costa_caro(motore):
    chiave = risolvi_e01(motore, EMAIL, salta=("email",))
    for p in chiave["persone"]:
        if p["malformata"]:
            motore.azione(EMAIL, 1, "escludi", {"contatto": p["ids"][0]}, "it")
    v = motore.verifica(EMAIL, 1)
    e = esiti(v)
    assert e["email_valide"] and not e["contatti_attivi"] and not e["segmenti"]
    assert "solo 20 contatti attivi" in next(c for c in v["controlli"] if c["id"] == "contatti_attivi")["spiegazione"]["it"]
    assert not v["superato"]


def test_e01_un_segmento_sbagliato_e_tollerato_due_no(motore):
    risolvi_e01(motore, EMAIL, segmenti_sbagliati=1)
    assert esiti(motore.verifica(EMAIL, 1))["segmenti"]
    motore.ricomincia(EMAIL, 1)
    risolvi_e01(motore, EMAIL, segmenti_sbagliati=2)
    v = motore.verifica(EMAIL, 1)
    assert not esiti(v)["segmenti"] and v["voto"] < 100


def test_e01_dato_mancante_non_segnalato(motore):
    risolvi_e01(motore, EMAIL, salta=("da_completare",))
    v = motore.verifica(EMAIL, 1)
    assert not esiti(v)["da_completare"] and v["voto"] == 90 and v["superato"]


def test_e01_azioni_non_valide(motore):
    with pytest.raises(ErroreFlusso, match="segmento"):
        motore.azione(EMAIL, 1, "segmento", {"contatto": 1, "valore": "Gigante"}, "it")
    with pytest.raises(ErroreFlusso, match="due righe diverse"):
        motore.azione(EMAIL, 1, "unisci", {"principale": 1, "duplicato": 1}, "it")
    with pytest.raises(ErroreFlusso, match="non esiste"):
        motore.azione(EMAIL, 1, "escludi", {"contatto": 999}, "it")
    motore.azione(EMAIL, 1, "unisci", {"principale": 1, "duplicato": 2}, "it")
    with pytest.raises(ErroreFlusso, match="unita"):
        motore.azione(EMAIL, 1, "escludi", {"contatto": 2}, "it")
    with pytest.raises(ErroreFlusso, match="righe attive"):
        motore.azione(EMAIL, 1, "unisci", {"principale": 3, "duplicato": 2}, "it")


# ================================================================== esercizio 2: punteggio a regole

def test_e02_dati_generati_coerenti_e_rigenerabili():
    import importlib.util
    spec = importlib.util.spec_from_file_location("gen02", RADICE_PROGETTO / "esercizi" / "strumenti" / "genera_dati_e02.py")
    gen = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gen)
    assert gen.genera() == {k: v for k, v in e02.DATI.items()}  # il file su disco e' esattamente quello generato
    att = e02.DATI["fascia_attesa"]
    assert len(e02.DATI["visibili"]) == 22 and len(e02.DATI["nascosti"]) == 20
    assert set(att.values()) == {"High", "Medium", "Low"}
    assert sum(vincolo_high(l) for l in e02.DATI["nascosti"]) >= 2 and sum(vincolo_mai_high(l) for l in e02.DATI["nascosti"]) >= 2


def test_e02_partenza_col_difetto_tutti_high(motore):
    area = motore.scheda(EMAIL, 2, "it")["area"]
    assert area["conteggio"]["High"] >= 18 and area["somma_pesi"] == 100
    v = motore.verifica(EMAIL, 2)
    assert not v["superato"] and not esiti(v)["fasce_non_degeneri"]


def test_e02_regole_del_direttore_100(motore):
    risolvi_e02(motore, EMAIL)
    v = motore.verifica(EMAIL, 2)
    assert v["voto"] == 100, v["riassunto"]


def test_e02_dimenticare_applica_al_crm(motore):
    risolvi_e02(motore, EMAIL, applica=False)
    v = motore.verifica(EMAIL, 2)
    assert v["voto"] == 90 and esiti(v) == {**{k: True for k in esiti(v)}, "classifica_applicata": False}
    assert not motore.scheda(EMAIL, 2, "it")["area"]["applicata"]


def test_e02_pesi_uguali_mettono_stagisti_in_high_bloccante(motore):
    risolvi_e02(motore, EMAIL, {"pesi": {"ruolo": 25, "dimensione": 25, "settore": 25, "comportamento": 25}, "soglia_alta": 70, "soglia_media": 40})
    v = motore.verifica(EMAIL, 2)
    assert v["voto"] == 0 and v["bloccato_da"] == ["vincolo_stagista"]
    assert "stagisti o studenti sono finiti in fascia High" in next(c for c in v["controlli"] if c["id"] == "vincolo_stagista")["spiegazione"]["it"]


def test_e02_comportamento_troppo_pesante_tradisce_i_ceo(motore):
    risolvi_e02(motore, EMAIL, {"pesi": {"ruolo": 10, "dimensione": 20, "settore": 20, "comportamento": 50}, "soglia_alta": 60, "soglia_media": 30})
    v = motore.verifica(EMAIL, 2)
    assert v["voto"] == 0 and "vincolo_ceo" in v["bloccato_da"]


def test_e02_somma_diversa_da_100(motore):
    risolvi_e02(motore, EMAIL, {"pesi": {"ruolo": 45, "dimensione": 25, "settore": 20, "comportamento": 15}, "soglia_alta": 65, "soglia_media": 40})
    v = motore.verifica(EMAIL, 2)
    assert not esiti(v)["somma_pesi"] and "105" in v["controlli"][0]["spiegazione"]["it"]


def test_e02_nascosti_mai_nell_area(motore):
    testo_area = json.dumps(motore.scheda(EMAIL, 2, "it"), ensure_ascii=False)
    for lead in e02.DATI["nascosti"]:
        assert lead["nome"] not in testo_area
    assert "fascia_attesa" not in testo_area and "riferimento" not in testo_area


def test_e02_valori_fuori_limite_rifiutati(motore):
    with pytest.raises(ErroreFlusso, match="fuori|da 0"):
        motore.azione(EMAIL, 2, "imposta_regole", {**PESI_GIUSTI, "soglia_alta": 120}, "it")
    with pytest.raises(ErroreFlusso, match="criteri"):
        motore.azione(EMAIL, 2, "imposta_regole", {"pesi": {"ruolo": 100}, "soglia_alta": 60, "soglia_media": 30}, "it")
    with pytest.raises(ErroreFlusso, match="intero"):
        motore.azione(EMAIL, 2, "imposta_regole", {"pesi": {**PESI_GIUSTI["pesi"], "ruolo": "40"}, "soglia_alta": 60, "soglia_media": 30}, "it")


def test_e02_classifica_dell_area_uguale_al_motore(motore):
    risolvi_e02(motore, EMAIL)
    area = motore.scheda(EMAIL, 2, "en")["area"]
    attese = {r["nome"]: r["fascia"] for r in classifica(e02.DATI["visibili"], PESI_GIUSTI)}
    assert {r["nome"]: r["fascia"] for r in area["classifica"]} == attese
    assert all(r["fascia"] == r["fascia_crm"] for r in area["classifica"])
    assert area["criteri"][0]["nome"] == "Role (seniority)"


# ================================================================== esercizio 3: trova l'errore

def test_e03_lessico_allineato_al_laboratorio_della_lezione():
    lezione = json.loads((RADICE_PROGETTO / "dati" / "lezioni" / "trova_errore.json").read_text(encoding="utf-8"))["scenario"]
    assert e03.DATI["categorie"] == lezione["categorie"]
    assert e03.DATI["stazioni"] == lezione["stazioni"]
    assert e03.DATI["regole_bug"] == lezione["regole_bug"]
    assert [(c["id"], c["regole"]) for c in e03.DATI["correzioni"]] == [(c["id"], c["regole"]) for c in lezione["correzioni"]]
    # le 5 risposte della lezione sono anche nell'esercizio, con la stessa categoria giusta
    giuste = {v["chiave"]: v["giusta"] for v in e03.DATI["visibili"]}
    for r in lezione["risposte"]:
        assert giuste[r["id"]] == r["giusta"]


def test_e03_dati_rigenerabili():
    import importlib.util
    spec = importlib.util.spec_from_file_location("gen03", RADICE_PROGETTO / "esercizi" / "strumenti" / "genera_dati_e03.py")
    gen = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gen)
    dati, tabelle = gen.genera()
    assert dati == e03.DATI
    assert tabelle == json.loads((RADICE_PROGETTO / "esercizi" / "finto_llm" / "tabelle.json").read_text(encoding="utf-8"))


def test_e03_regola_fissa_riconosce_solo_le_disiscrizioni():
    for v in e03.DATI["visibili"] + e03.DATI["nascosti"]:
        assert e03.chiede_disiscrizione(v["testo"]["it"]) == (v["giusta"] == "disiscrizione"), v["chiave"]


def test_e03_partenza_15_risposte_15_interessati(motore):
    area = motore.scheda(EMAIL, 3, "it")["area"]
    assert area["totale"] == 15 and area["report"]["interessato"] == 15
    assert area["posta"] == [] and area["rilancio_con"] == "originale"
    etichette = {r["chiave"]: r["etichetta_llm"] for r in area["risposte"]}
    assert etichette["marco"] == "Not Interested" and etichette["sara"] == "Not Interested" and etichette["marta"] == "Unsubscribe"


@pytest.mark.parametrize("correzione, voto, falliti", [
    ("chiedi_llm", 0, {"not_interested_mai_interessato", "accordo_nascosti", "disiscritti_nel_crm", "posta_giusta"}),
    ("rifai_report", 0, {"not_interested_mai_interessato", "accordo_nascosti", "disiscritti_nel_crm", "posta_giusta"}),
    ("inverti", 50, {"accordo_nascosti", "disiscritti_nel_crm", "posta_giusta"}),
    ("esatta", 65, {"accordo_nascosti", "disiscritti_nel_crm"}),
    ("esatta_disiscrizione", 100, set()),
])
def test_e03_ogni_correzione_ha_il_suo_esito(motore, correzione, voto, falliti):
    risolvi_e03(motore, EMAIL, correzione=correzione)
    v = motore.verifica(EMAIL, 3)
    assert v["voto"] == voto and set(v["falliti"]) == falliti, v["riassunto"]
    assert v["superato"] == (voto >= 80)


def test_e03_stato_finale_di_crm_e_posta_con_la_correzione_giusta(motore):
    risolvi_e03(motore, EMAIL)
    area = motore.scheda(EMAIL, 3, "it")["area"]
    assert area["report"] == {"interessato": 4, "non_interessato": 4, "da_ricontattare": 3, "disiscrizione": 2, "umano": 2}
    destinatari = sorted(m["a"].split("@")[0] for m in area["posta"])
    assert destinatari == ["davide", "giulia", "luca", "silvia"]
    assert sorted(e.split("@")[0] for e in area["lista_optout"]) == ["marta", "sara"]
    tipi = sorted(a["tipo"] for a in area["attivita"])
    assert tipi == ["da_leggere"] * 2 + ["promemoria"] * 3


def test_e03_correzione_cambiata_senza_rilancio(motore):
    risolvi_e03(motore, EMAIL, correzione="esatta_disiscrizione")
    motore.azione(EMAIL, 3, "correzione", {"valore": "inverti"}, "it")
    area = motore.scheda(EMAIL, 3, "it")["area"]
    assert not area["rilancio_aggiornato"]
    v = motore.verifica(EMAIL, 3)
    assert not esiti(v)["rilancio_aggiornato"]


def test_e03_senza_rilancio_la_posta_e_vuota_e_lo_dice(motore):
    risolvi_e03(motore, EMAIL, rilancia=False)
    v = motore.verifica(EMAIL, 3)
    posta = next(c for c in v["controlli"] if c["id"] == "posta_giusta")
    assert not posta["superato"] and "non è ancora partita" in posta["spiegazione"]["it"]


def test_e03_stazione_sbagliata_ed_etichette_a_mano(motore):
    risolvi_e03(motore, EMAIL, stazione="llm", etichette_giuste=12)
    v = motore.verifica(EMAIL, 3)
    e = esiti(v)
    assert not e["stazione"] and not e["etichette_a_mano"] and e["posta_giusta"]
    assert v["voto"] == 84 and v["superato"]  # 13.8 (12 etichette su 13) + 70: la stazione sbagliata costa 15 punti


def test_e03_nascosti_e_risposte_giuste_mai_nell_area(motore):
    testo_area = json.dumps(motore.scheda(EMAIL, 3, "en"), ensure_ascii=False)
    for v in e03.DATI["nascosti"]:
        assert v["testo"]["it"] not in testo_area and v["nome"] not in testo_area
    assert '"giusta"' not in testo_area and "stazione_giusta" not in testo_area and '"tipo"' not in testo_area
    assert "spiega" not in testo_area  # la spiegazione delle correzioni (quale e' giusta) resta nella lezione


def test_e03_registro_tiene_ferme_le_risposte_del_modello(motore):
    """Se il modello cambiasse idea dopo la prima correzione, la ricorrezione e le verifiche successive non cambiano."""
    risolvi_e03(motore, EMAIL)
    v1 = motore.verifica(EMAIL, 3)
    finto = motore.modello.modello
    originale = finto.rispondi
    finto.rispondi = lambda messaggi: "Interested"  # un modello "nuovo" che direbbe sempre Interested
    try:
        assert motore.ricorreggi(EMAIL, 3, 1)["identico"]
        v2 = motore.verifica(EMAIL, 3)
        assert v2["impronta_esito"] == v1["impronta_esito"] and v2["voto"] == 100
    finally:
        finto.rispondi = originale


def test_e03_valori_non_validi(motore):
    with pytest.raises(ErroreFlusso):
        motore.azione(EMAIL, 3, "stazione", {"valore": "cucina"}, "it")
    with pytest.raises(ErroreFlusso):
        motore.azione(EMAIL, 3, "correzione", {"valore": "magia"}, "it")
    with pytest.raises(ErroreFlusso):
        motore.azione(EMAIL, 3, "etichetta", {"risposta": "nessuno", "valore": "interessato"}, "it")
    with pytest.raises(ErroreFlusso):
        motore.azione(EMAIL, 3, "etichetta", {"risposta": "marco", "valore": "forse"}, "it")
