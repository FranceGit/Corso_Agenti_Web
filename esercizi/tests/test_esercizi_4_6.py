"""Esercizi 4-6: prompt con rubrica, email con regole di marca e approvazione, strumenti dell'agente.

Ogni esercizio: stato di partenza che non passa, soluzione di riferimento a 100, varianti sbagliate con il loro esito
(voto e controlli falliti), bloccanti, dati nascosti mai nell'area, coerenza del finto-LLM con i dati, azioni non valide.
Le soluzioni usano le STESSE azioni che fa lo studente dal browser (tests/soluzioni.py).
"""
from __future__ import annotations

import json
import re

import pytest

from corso.config import RADICE_PROGETTO
from corso.errori import ErroreFlusso
from esercizi.catalogo import e04_prompt_rubrica as e04
from esercizi.catalogo import e05_email_approvazione as e05
from esercizi.catalogo import e06_strumenti_agente as e06
from esercizi.catalogo.punteggio import classifica
from esercizi.finto_llm.simulatori import _riempi, email_marca
from esercizi.motore.llm import FintoLLM

from .conftest import ALTRA, EMAIL
from .soluzioni import (BLOCCHI_GIUSTI, PERMESSI_GIUSTI, REGOLE_E05, RICHIESTE_E06, risolvi_e04, risolvi_e05,
                        risolvi_e06)

TABELLE = json.loads((RADICE_PROGETTO / "esercizi" / "finto_llm" / "tabelle.json").read_text(encoding="utf-8"))["compiti"]


def esito(motore, n, email=EMAIL):
    v = motore.verifica(email, n)
    return v["voto"], sorted(c["id"] for c in v["controlli"] if not c["superato"]), v


# ================================================================== esercizio 4

def test_e04_segnali_del_finto_llm_coerenti_con_i_blocchi():
    p = TABELLE["punteggio_rubrica"]["parametri"]
    for bid, frase in p["segnali"].items():
        assert frase.lower() in e04.BLOCCHI[bid]["prompt"].lower(), bid
    # i pesi che il finto-LLM applica sono quelli scritti nei blocchi e quelli del direttore (esercizio 2)
    for c, peso in p["pesi"].items():
        assert f"peso {peso}%" in e04.BLOCCHI[c]["prompt"]
    assert p["pesi"] == e04.LEAD["riferimento"]["pesi"]
    m = re.search(p["soglie_regex"], e04.BLOCCHI["soglie"]["prompt"])
    assert {"alta": int(m.group(1)), "media": int(m.group(2))} == e04.BLOCCHI["soglie"]["soglie"]
    assert e04.BLOCCHI["soglie"]["soglie"] == {"alta": e04.LEAD["riferimento"]["soglia_alta"], "media": e04.LEAD["riferimento"]["soglia_media"]}


def test_e04_lead_visibili_e_nascosti_distinti_e_con_tutte_le_fasce():
    assert not set(e04.DATI["lead_visibili"]) & set(e04.DATI["lead_nascosti"])
    attese = [e04.LEAD["fascia_attesa"][i] for i in e04.DATI["lead_nascosti"]]
    assert set(attese) == {"High", "Medium", "Low"}
    assert len(e04.VISIBILI) == len(e04.NASCOSTI) == 10


@pytest.mark.parametrize("risposta, valida, motivo", [
    ('{"punteggio": 70, "fascia": "High", "motivazione": "ok"}', True, None),
    ("Direi 70, High", False, "non_json"),
    ('[1, 2]', False, "campi"),
    ('{"punteggio": 70, "fascia": "High"}', False, "campi"),
    ('{"punteggio": 70, "fascia": "High", "motivazione": "ok", "extra": 1}', False, "campi"),
    ('{"punteggio": true, "fascia": "High", "motivazione": "ok"}', False, "punteggio"),
    ('{"punteggio": 140, "fascia": "High", "motivazione": "ok"}', False, "punteggio"),
    ('{"punteggio": 70, "fascia": "Alta", "motivazione": "ok"}', False, "fascia"),
    ('{"punteggio": 70, "fascia": "High", "motivazione": 5}', False, "fascia"),
])
def test_e04_analizza_come_un_programma(risposta, valida, motivo):
    a = e04.analizza(risposta)
    assert a["valida"] is valida
    assert a.get("motivo") == motivo


def test_e04_partenza_tutti_alti_in_prosa(motore):
    voto, falliti, _ = esito(motore, 4)
    assert voto == 0 and len(falliti) == 6
    motore.azione(EMAIL, 4, "prova", {}, "it")
    area = motore.scheda(EMAIL, 4, "it")["area"]
    assert area["provata"] and area["prova_aggiornata"] and area["valide"] == 0
    numeri = [int(re.search(r"(\d+) su 100", r["risposta"]).group(1)) for r in area["righe"]]
    assert min(numeri) >= 88 and all("High" in r["risposta"] for r in area["righe"])


def test_e04_soluzione_di_riferimento_100(motore):
    risolvi_e04(motore, EMAIL)
    area = motore.scheda(EMAIL, 4, "it")["area"]
    assert area["valide"] == 10 and area["accordo"] == 10
    voto, falliti, v = esito(motore, 4)
    assert (voto, falliti) == (100, []) and v["superato"]
    assert v["esercizio"]["piano"] == 3


@pytest.mark.parametrize("accesi, voto, falliti", [
    (["contesto", "ruolo", "dimensione", "settore", "soglie", "json"], 100, []),                      # 3 criteri bastano
    (BLOCCHI_GIUSTI + ["entusiasta"], 90, ["motivazione_breve"]),                                       # motivazioni lunghe
    (BLOCCHI_GIUSTI + ["ragiona"], 10, ["accordo_direttore", "distribuzione", "fascia_coerente", "json_valido", "motivazione_breve"]),
    (BLOCCHI_GIUSTI + ["vago"], 93, ["accordo_direttore"]),                                             # punteggi gonfiati
    (["contesto", "ruolo", "dimensione", "settore", "json"], 56, ["accordo_direttore", "distribuzione", "fascia_coerente"]),
    (["contesto", "json", "soglie"], 61, ["accordo_direttore", "distribuzione", "rubrica_nel_prompt"]),
])
def test_e04_varianti_e_loro_esito(motore, accesi, voto, falliti):
    risolvi_e04(motore, EMAIL, accesi)
    assert esito(motore, 4)[:2] == (voto, falliti)


def test_e04_prova_vecchia_segnalata_e_ricorrezione_identica(motore):
    risolvi_e04(motore, EMAIL)
    motore.azione(EMAIL, 4, "blocco", {"blocco": "entusiasta", "acceso": True}, "it")
    assert motore.scheda(EMAIL, 4, "it")["area"]["prova_aggiornata"] is False
    v = motore.verifica(EMAIL, 4)
    r = motore.ricorreggi(EMAIL, 4, v["tentativo"])
    assert r["identico"] and r["voto_ricorretto"] == 90


def test_e04_nascosti_mai_nell_area(motore):
    testo = json.dumps(motore.scheda(EMAIL, 4, "en"), ensure_ascii=False)
    for l in e04.NASCOSTI:
        assert l["nome"] not in testo and f'"{l["id"]}"' not in testo
    # l'area mostra la fascia a regole dei soli visibili, calcolata come il direttore
    rif = {r["id"]: r["fascia"] for r in classifica(e04.VISIBILI, e04.LEAD["riferimento"])}
    assert {r["id"]: r["fascia_regole"] for r in motore.scheda(EMAIL, 4, "it")["area"]["righe"]} == rif


def test_e04_azioni_non_valide(motore):
    for nome, p in [("blocco", {"blocco": "magia", "acceso": True}), ("blocco", {"blocco": "json", "acceso": "si"}),
                    ("blocco", {"acceso": True}), ("vola", {})]:
        with pytest.raises(ErroreFlusso):
            motore.azione(EMAIL, 4, nome, p, "it")


# ================================================================== esercizio 5

def test_e05_regole_e_checklist_uguali_alla_lezione():
    lezione = json.loads((RADICE_PROGETTO / "dati" / "lezioni" / "email_marca.json").read_text(encoding="utf-8"))["scenario"]
    assert e05.DATI["regole_lezione"] == [{"id": r["id"], "nome": r["nome"], "effetto": r["effetto"]} for r in lezione["regole"]]
    assert e05.DATI["checklist"] == [lezione["testi"][k] for k in ("check_disiscrizione", "check_promesse", "check_vietate",
                                                                    "check_supportate", "check_destinatario")]
    assert sorted(e05.DATI["regole"]) == sorted(e05.REGOLE)
    segnali = TABELLE["email_marca"]["parametri"]["segnali"]
    for rid, frase in segnali.items():
        assert frase.lower() in e05.DATI["regole"][rid].lower(), rid
    assert set(segnali) == set(e05.REGOLE)


def test_e05_simulatore_limiti_del_modello_piccolo():
    p = TABELLE["email_marca"]["parametri"]
    sistema = e05.prompt_di(REGOLE_E05)
    paolo = next(l for l in e05.DATI["visibili"] if l["id"] == "m4")
    corpo = email_marca(sistema, json.dumps(e05.campi_lead(paolo, ["nome", "azienda", "ultimo"])), p)
    assert "sconto del 30%" in corpo, "con la regola accesa il modello promette lo sconto suggerito dal dato"
    anonimo = email_marca(sistema, json.dumps({"azienda": "Pixel Lab"}), p)
    assert anonimo.startswith(p["frasi"]["saluto_con_anonimo"]) and "senza_nome" in e05.problemi_bozza(anonimo, "Giorgio", "Pixel Lab")
    with pytest.raises(Exception):
        _riempi("{manca}", {})


def test_e05_partenza_tutti_i_campi_e_nessuna_regola(motore):
    area = motore.scheda(EMAIL, 5, "it")["area"]
    assert len(area["sensibili_accesi"]) == 2 and not any(r["acceso"] for r in area["regole"])
    motore.azione(EMAIL, 5, "genera", {}, "it")
    corpo = motore.scheda(EMAIL, 5, "it")["area"]["bozze"][0]["corpo"]
    assert "333 101 2020" in corpo and "garantito" in corpo, "telefono e parole vietate finiscono nell'email"
    voto, falliti, _ = esito(motore, 5)
    assert voto < 80 and "campi_minimi" in falliti and "regole_marca" in falliti


def test_e05_soluzione_di_riferimento_100(motore):
    risolvi_e05(motore, EMAIL)
    area = motore.scheda(EMAIL, 5, "it")["area"]
    assert len(area["posta"]) == 6
    stati = {b["nome"]: b["stato"] for b in area["bozze"]}
    assert stati["Sara Neri"] == "bloccata" and stati["Paolo Conti"] == "rifiutata"
    assert [e["azione"] for e in area["registro"]].count("blocco_optout") == 1
    voto, falliti, v = esito(motore, 5)
    assert (voto, falliti) == (100, []) and v["esercizio"]["piano"] == 5
    assert motore.ricorreggi(EMAIL, 5, v["tentativo"])["identico"]


@pytest.mark.parametrize("opzioni, voto, falliti, bloccante", [
    ({"interruttore": False}, 95, ["interruttore"], []),
    ({"approva_sempre": True}, 0, ["posta_giusta", "registro_invii", "sconto_fermato"], ["sconto_fermato"]),
    ({"approva_sconto": True}, 0, ["posta_giusta", "sconto_fermato"], ["sconto_fermato"]),
    ({"togli_sensibili": False}, 75, ["campi_minimi"], []),
    ({"rifiuta_optout": True}, 100, [], []),
    ({"invia": False}, 75, ["posta_giusta", "registro_invii"], []),
    ({"regole": [r for r in REGOLE_E05 if r != "firma"]}, 63, ["bozze_nascoste", "posta_giusta", "regole_marca"], []),
])
def test_e05_varianti_e_loro_esito(motore, opzioni, voto, falliti, bloccante):
    risolvi_e05(motore, EMAIL, **opzioni)
    v_voto, v_falliti, v = esito(motore, 5)
    assert (v_voto, v_falliti, v["bloccato_da"]) == (voto, falliti, bloccante)


def test_e05_interruttore_ferma_generazione_e_invii(motore):
    risolvi_e05(motore, EMAIL, invia=False, interruttore=False)
    motore.azione(EMAIL, 5, "interruttore", {"valore": True}, "it")
    with pytest.raises(ErroreFlusso):
        motore.azione(EMAIL, 5, "genera", {}, "it")
    r = motore.azione(EMAIL, 5, "invia", {}, "it")
    assert r["esito"]["inviate"] == 0 and r["area"]["posta"] == []
    assert r["area"]["registro"][-1]["azione"] == "blocco_interruttore"


def test_e05_email_partita_non_si_riscrive_e_non_si_ridecide(motore):
    risolvi_e05(motore, EMAIL, interruttore=False)
    prima = {b["id"]: b for b in motore.scheda(EMAIL, 5, "it")["area"]["bozze"]}
    inviata = next(b for b in prima.values() if b["stato"] == "inviata")
    with pytest.raises(ErroreFlusso):
        motore.azione(EMAIL, 5, "decidi", {"bozza": inviata["id"], "decisione": "rifiuta"}, "it")
    motore.azione(EMAIL, 5, "regola", {"regola": "firma", "acceso": False}, "it")
    area = motore.azione(EMAIL, 5, "genera", {}, "it")["area"]
    dopo = {b["nome"]: b for b in area["bozze"]}
    assert dopo[inviata["nome"]]["corpo"] == inviata["corpo"] and dopo[inviata["nome"]]["stato"] == "inviata"
    assert dopo["Paolo Conti"]["stato"] == "in_attesa" and "Luca Bassi" not in dopo["Paolo Conti"]["corpo"]
    assert area["generazione_aggiornata"] is True


def test_e05_nascosti_mai_nell_area(motore):
    risolvi_e05(motore, EMAIL)
    testo = json.dumps(motore.scheda(EMAIL, 5, "en"), ensure_ascii=False)
    for l in e05.DATI["nascosti"]:
        assert l["cognome"] not in testo and l["azienda"] not in testo


def test_e05_azioni_non_valide(motore):
    motore.azione(EMAIL, 5, "genera", {}, "it")
    for nome, p in [("regola", {"regola": "allegria", "acceso": True}), ("campo", {"campo": "iban", "acceso": True}),
                    ("decidi", {"bozza": 999, "decisione": "approva"}), ("decidi", {"bozza": 1, "decisione": "forse"}),
                    ("interruttore", {"valore": "si"}), ("vola", {})]:
        with pytest.raises(ErroreFlusso):
            motore.azione(EMAIL, 5, nome, p, "it")


# ================================================================== esercizio 6

def test_e06_ogni_richiesta_ha_un_piano_con_strumenti_noti():
    tabella = TABELLE["agente_crm"]["tabella"]
    for r in e06.DATI["visibili"] + e06.DATI["nascosti"]:
        piano = e06.leggi_piano(tabella[r["prompt"]])
        assert piano, r["id"]
        assert all(c["strumento"] in e06.STRUMENTI for c in piano), r["id"]
    massimo = max(len(json.loads(tabella[h["prompt"]])) for h in e06.DATI["nascosti"] if h["tipo"] == "necessario")
    ciclo = [len(json.loads(tabella[h["prompt"]])) for h in e06.DATI["nascosti"] if h["tipo"] == "ciclo"]
    assert massimo <= 10 < min(ciclo), "il tetto giusto esiste: basta ai compiti veri e ferma il ciclo"
    pericolosi = set(e06.DATI["chiave"]["pericolosi"])
    for h in e06.DATI["nascosti"]:
        usa = {c["strumento"] for c in json.loads(tabella[h["prompt"]])}
        assert bool(usa & pericolosi) == (h["tipo"] == "pericoloso"), h["id"]


def test_e06_orchestrazione_pura():
    cfg = e06.configurazione({**PERMESSI_GIUSTI}, 3)
    piano = [{"strumento": "cerca_lead"}, {"strumento": "invia_email"}, {"strumento": "cancella_contatto"}, {"strumento": "cerca_lead"}]
    assert [d["esito"] for d in e06.esegui_piano(piano, cfg)] == ["eseguita", "in_attesa", "rifiutata", "fermata"]
    assert e06.esegui_piano([{"strumento": "teletrasporto"}], cfg)[0]["esito"] == "rifiutata"
    for rotta in ["non json", '{"a": 1}', '[{"argomenti": {}}]', '[{"strumento": "x", "argomenti": 3}]']:
        assert e06.leggi_piano(rotta) is None


def test_e06_partenza_tutto_libero_e_bloccante(motore):
    voto, falliti, v = esito(motore, 6)
    assert voto == 0 and v["bloccato_da"] == ["pericoloso_impossibile"]
    for r in RICHIESTE_E06:
        motore.azione(EMAIL, 6, "lancia", {"richiesta": r}, "it")
    area = motore.scheda(EMAIL, 6, "it")["area"]
    assert {c["id"]: c["stato"] for c in area["contatti"]}[5] == "escluso", "la nota ostile ha fatto cancellare un contatto"
    assert len(area["posta"]) == 3, "«manda subito» ha spedito senza revisione"


def test_e06_soluzione_di_riferimento_100(motore):
    risolvi_e06(motore, EMAIL)
    area = motore.scheda(EMAIL, 6, "it")["area"]
    assert all(c["stato"] == "attivo" for c in area["contatti"]) and area["posta"] == []
    assert {c["id"]: c["fascia"] for c in area["contatti"]}[2] == "Cliente" and area["bozze"] == 1
    diario = {r["id"]: r["diario"] for r in area["richieste"]}
    assert [d["esito"] for d in diario["nota_ostile"]].count("rifiutata") == 2
    assert {d["esito"] for d in diario["manda_subito"][1:]} == {"in_attesa"}
    voto, falliti, v = esito(motore, 6)
    assert (voto, falliti) == (100, []) and v["esercizio"]["piano"] == 7
    assert motore.ricorreggi(EMAIL, 6, v["tentativo"])["identico"]


@pytest.mark.parametrize("modifica, voto, falliti", [
    ({"limite": 30}, 85, ["tetto_passi"]),
    ({"limite": 10}, 100, []),
    ({"limite": 5}, 77, ["necessario_possibile", "tetto_passi"]),
    ({"permessi": {**PERMESSI_GIUSTI, "invia_email": "libero"}}, 0, ["pericoloso_impossibile"]),
    ({"permessi": {**PERMESSI_GIUSTI, "invia_email": "no"}}, 100, []),
    ({"permessi": {**PERMESSI_GIUSTI, "cancella_contatto": "approvazione"}}, 92, ["minimo_privilegio"]),
    ({"permessi": {**PERMESSI_GIUSTI, "cerca_lead": "approvazione"}}, 90, ["letture_libere"]),
    ({"permessi": {**PERMESSI_GIUSTI, "prepara_bozza": "no"}}, 92, ["necessario_possibile"]),
    ({"lancia": False}, 90, ["diario_letto"]),
])
def test_e06_varianti_e_loro_esito(motore, modifica, voto, falliti):
    risolvi_e06(motore, EMAIL, **modifica)
    assert esito(motore, 6)[:2] == (voto, falliti)


def test_e06_cambio_dopo_il_lancio_chiede_di_rilanciare(motore):
    risolvi_e06(motore, EMAIL)
    area = motore.azione(EMAIL, 6, "limite", {"valore": 9}, "it")["area"]
    assert not any(r["aggiornato"] for r in area["richieste"])
    assert esito(motore, 6)[:2] == (90, ["diario_letto"])


def test_e06_piano_illeggibile_nessuna_azione(motore, monkeypatch):
    monkeypatch.setattr(e06, "chiedi_piano", lambda llm, cfg, r: {"risposta": "Certo! Ecco cosa farei...", "chiave": "x"})
    area = motore.azione(EMAIL, 6, "lancia", {"richiesta": "manda_subito"}, "it")["area"]
    r = next(x for x in area["richieste"] if x["id"] == "manda_subito")
    assert r["diario"] == [] and area["posta"] == []


def test_e06_nascosti_e_chiave_mai_nell_area(motore):
    risolvi_e06(motore, EMAIL)
    testo = json.dumps(motore.scheda(EMAIL, 6, "en"), ensure_ascii=False)
    for h in e06.DATI["nascosti"]:
        assert h["prompt"] not in testo and h["id"] not in testo
    for proibito in ('"pericolosi"', '"mai_necessari"', '"letture"', "partner@esterno"):
        assert proibito not in testo


def test_e06_azioni_non_valide(motore):
    for nome, p in [("permesso", {"strumento": "teletrasporto", "valore": "libero"}), ("permesso", {"strumento": "cerca_lead", "valore": "sempre"}),
                    ("limite", {"valore": 1}), ("limite", {"valore": 99}), ("lancia", {"richiesta": "segreta"}), ("vola", {})]:
        with pytest.raises(ErroreFlusso):
            motore.azione(EMAIL, 6, nome, p, "it")


# ================================================================== comuni

def test_finto_llm_simulatore_sconosciuto_si_ferma(tmp_path):
    f = tmp_path / "t.json"
    f.write_text(json.dumps({"risposta_generica": "?", "compiti": {"x": {"simulatore": "nessuno", "parametri": {}}}}), encoding="utf-8")
    with pytest.raises(Exception, match="simulatore"):
        FintoLLM(f, "finto")


@pytest.mark.parametrize("n, risolvi", [(4, risolvi_e04), (5, risolvi_e05), (6, risolvi_e06)])
def test_stesso_lavoro_due_studenti_voto_uguale_e_registro_condiviso(motore, n, risolvi):
    risolvi(motore, EMAIL)
    risolvi(motore, ALTRA)
    a, b = motore.verifica(EMAIL, n), motore.verifica(ALTRA, n)
    assert a["voto"] == b["voto"] == 100
    assert a["impronta_esito"] == b["impronta_esito"], "i dati non dipendono dallo studente: stesso lavoro, stesso verbale"
