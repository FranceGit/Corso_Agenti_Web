"""Soluzioni di riferimento (e varianti sbagliate) eseguite con le STESSE azioni che fa lo studente dal browser."""
from __future__ import annotations

from esercizi.catalogo.e01_pulizia_lead import genera
from esercizi.catalogo.e03_trova_errore import DATI as DATI_E03
from esercizi.motore.esecutore import pseudonimo, seme_studente

PESI_GIUSTI = {"pesi": {"ruolo": 40, "dimensione": 25, "settore": 20, "comportamento": 15}, "soglia_alta": 65, "soglia_media": 40}


def chiave_e01(motore, email):
    return genera(seme_studente(motore.cfg, pseudonimo(email)))["chiave"]


def risolvi_e01(motore, email, *, salta=(), principale_sbagliato=False, segmenti_sbagliati=0):
    """Pulizia completa. `salta` toglie dei passi: 'unisci', 'email', 'segmenti', 'da_completare', 'optout'."""
    a = lambda nome, **p: motore.azione(email, 1, nome, p, "it")  # noqa: E731
    chiave = chiave_e01(motore, email)
    righe = {r["id"]: r for r in motore.scheda(email, 1, "it")["area"]["righe"]}
    for p in chiave["persone"]:
        tieni = p["ids"][0]
        if p["duplicato"]:
            x, y = p["ids"]
            # tiene la riga SENZA «non contattare» se principale_sbagliato (il caso trappola)
            if principale_sbagliato and p["optout"]:
                tieni, togli = (x, y) if not righe[x]["optout"] else (y, x)
            else:
                tieni, togli = (x, y) if righe[x]["optout"] or not righe[y]["optout"] else (y, x)
            if "unisci" not in salta:
                a("unisci", principale=tieni, duplicato=togli)
        if p["malformata"] and "email" not in salta:
            a("correggi_email", contatto=tieni, email=p["email"])
        if p["duplicato"] and "email" not in salta and "unisci" not in salta:
            a("correggi_email", contatto=tieni, email=p["email"])
        if p["segmento"] and "segmenti" not in salta:
            a("segmento", contatto=tieni, valore=p["segmento"])
        if p["da_completare"] and "da_completare" not in salta:
            a("da_completare", contatto=tieni, valore=True)
    if segmenti_sbagliati:
        noti = [p for p in chiave["persone"] if p["segmento"] and not p["duplicato"]][:segmenti_sbagliati]
        for p in noti:
            altro = "Enterprise" if p["segmento"] != "Enterprise" else "PMI"
            a("segmento", contatto=p["ids"][0], valore=altro)
    return chiave


def risolvi_e02(motore, email, regole=None, applica=True):
    motore.azione(email, 2, "imposta_regole", regole or PESI_GIUSTI, "it")
    if applica:
        motore.azione(email, 2, "applica_al_crm", {}, "it")


def risolvi_e03(motore, email, correzione="esatta_disiscrizione", stazione="conversione", etichette_giuste=15, rilancia=True):
    for i, v in enumerate(DATI_E03["visibili"]):
        valore = v["giusta"] if i < etichette_giuste else ("interessato" if v["giusta"] != "interessato" else "non_interessato")
        motore.azione(email, 3, "etichetta", {"risposta": v["chiave"], "valore": valore}, "it")
    if stazione:
        motore.azione(email, 3, "stazione", {"valore": stazione}, "it")
    if correzione:
        motore.azione(email, 3, "correzione", {"valore": correzione}, "it")
    if rilancia:
        motore.azione(email, 3, "rilancia", {}, "it")
