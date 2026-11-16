"""Simulatori del finto-LLM: compiti in cui la risposta dipende dalle ISTRUZIONI, non solo dal dato.

Per i compiti a tabella (classificazione, piano dell'agente) basta il testo dell'utente. Negli esercizi 4 e 5
invece lo studente compone le istruzioni: il finto-LLM deve «leggerle». Ogni simulatore cerca nel messaggio di
sistema i SEGNALI dichiarati in tabelle.json (frasi dei blocchi o delle regole) e costruisce la risposta che
darebbe un modello piccolo e ubbidiente, compresi i suoi limiti tipici (motivazioni prolisse se glielo chiedi,
JSON rotto se gli chiedi anche di ragionare ad alta voce, uno sconto promesso se il dato glielo suggerisce).
Tutto deterministico: stessa richiesta, stessa risposta. Nessun valore qui: frasi, pesi e modelli di testo
stanno nei parametri del compito (tabelle.json).
"""
from __future__ import annotations

import json
import re
from typing import Callable

from corso.errori import ErroreDati

from ..catalogo.punteggio import valori


def _norm(t: str) -> str:
    return re.sub(r"\s+", " ", t.lower()).strip()


def _presenti(sistema: str, segnali: dict) -> set[str]:
    s = _norm(sistema)
    return {k for k, frase in segnali.items() if _norm(frase) in s}


def _riempi(modello: str, valori_testo: dict) -> str:
    def sost(m):
        k = m.group(1)
        if k not in valori_testo:
            raise ErroreDati(f"finto-LLM: segnaposto {{{k}}} senza valore")
        return str(valori_testo[k])
    return re.sub(r"\{(\w+)\}", sost, modello)


# ------------------------------------------------------------------ esercizio 4: punteggio con rubrica

def rubrica_punteggio(sistema: str, utente: str, p: dict) -> str:
    """Punteggio di un lead secondo la rubrica che trova nelle istruzioni.

    - criteri: usa solo quelli presenti, con i pesi del blocco (riportati in p['pesi']), riscalati a 100;
    - nessun criterio: giudizio «a sentimento», sempre fra p['vago']['base'] e base + ampiezza (tutti alti);
    - blocco vago insieme ai criteri: aggiunge p['vago']['bonus'] (generosita');
    - soglie: le legge dal testo con l'espressione p['soglie_regex']; senza soglie usa quelle implicite;
    - formato: JSON solo se c'e' il segnale 'json'; con 'ragiona' prima del JSON scrive il ragionamento;
    - motivazione: breve, o lunga se c'e' 'entusiasta'.
    """
    lead = json.loads(utente)
    accesi = _presenti(sistema, p["segnali"])
    criteri = [c for c in p["pesi"] if c in accesi]
    v = valori(lead)
    if criteri:
        somma = sum(p["pesi"][c] for c in criteri)
        punti = round(sum(p["pesi"][c] * v[c] for c in criteri) * 100 / somma)
        if "vago" in accesi:
            punti = min(p["massimo"], punti + p["vago"]["bonus"])
        principale = max(criteri, key=lambda c: (p["pesi"][c] * v[c], -criteri.index(c)))
    else:
        punti = p["vago"]["base"] + sum(map(ord, lead["nome"])) % (p["vago"]["ampiezza"] + 1)
        principale = None
    m = re.search(p["soglie_regex"], sistema, flags=re.I | re.S)
    alta, media = (int(m.group(1)), int(m.group(2))) if m else (p["soglie_implicite"]["alta"], p["soglie_implicite"]["media"])
    fascia = "High" if punti >= alta else "Medium" if punti >= media else "Low"
    if principale is None:
        motivo = p["testi"]["motivo_vago"]
    else:
        chiave = "motivo_lungo" if "entusiasta" in accesi else "motivo_breve"
        motivo = _riempi(p["testi"][chiave], {"criterio": p["nomi_criteri"][principale], "nome": lead["nome"],
                                               "azienda": lead["azienda"]})
    if "json" not in accesi:
        return _riempi(p["testi"]["prosa"], {"punti": punti, "fascia": fascia, "motivo": motivo})
    corpo = json.dumps({"punteggio": punti, "fascia": fascia, "motivazione": motivo}, ensure_ascii=False)
    if "ragiona" in accesi:
        return _riempi(p["testi"]["ragionamento"], {"nome": lead["nome"]}) + "\n" + corpo
    return corpo


# ------------------------------------------------------------------ esercizio 5: email con regole di marca

def email_marca(sistema: str, utente: str, p: dict) -> str:
    """Bozza di email costruita frase per frase dai campi ricevuti e dalle regole accese (lessico della lezione P3.4)."""
    campi = json.loads(utente)
    regole = _presenti(sistema, p["segnali"])
    F = p["frasi"]
    val = {k: v for k, v in campi.items()}
    saluto = ("saluto_con" if "tono" in regole else "saluto_senza") + ("" if "nome" in campi else "_anonimo")
    righe = [_riempi(F[saluto], val)]
    righe.append(_riempi(F["aggancio_con"], val) if "ultimo" in campi else F["aggancio_senza"])
    if "azienda" in campi:
        righe.append(_riempi(F["azienda"], val))
    if "problema" in campi:
        righe.append(_riempi(F["problema_domanda"] if "dati" in regole else F["problema_fatto"], val))
    if "dati" not in regole:
        righe.append(F["statistica"])
    righe.append(F["promessa_con"] if "vietate" in regole else F["promessa_senza"])
    # limite del modello piccolo: se il dato parla di sconto, lo promette anche con la regola accesa
    chiesto = "ultimo" in campi and any(_norm(x) in _norm(campi["ultimo"]) for x in p["indizi_sconto"])
    if chiesto:
        righe.append(F["sconto_chiesto"])
    elif "sconto" not in regole:
        righe.append(F["sconto"])
    if "telefono" in campi:
        righe.append(_riempi(F["telefono"], val))
    if "note_private" in campi:
        righe.append(_riempi(F["note_private"], val))
    righe.append(F["invito"])
    righe.append(F["firma_con"] if "firma" in regole else F["firma_senza"])
    if "disiscrizione" in regole:
        righe.append(F["disiscrizione"])
    return "\n".join(righe)


SIMULATORI: dict[str, Callable[[str, str, dict], str]] = {
    "rubrica_punteggio": rubrica_punteggio,
    "email_marca": email_marca,
}
