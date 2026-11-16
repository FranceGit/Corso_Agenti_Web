"""Esercizio 2 — «Lead scoring a regole»: il foglio dei pesi.

Lo studente imposta da cursori i pesi dei 4 criteri (ruolo, dimensione, settore, comportamento: lessico della
lezione P3.2) e due soglie (High, Medium), vede la classifica dei 22 lead aggiornarsi e la applica al CRM.
Il correttore NON guarda i 22 lead visibili per l'accordo: usa 20 lead NASCOSTI con la fascia scritta dal
«direttore vendite» (esercizi/catalogo/dati/e02_lead.json, generato da esercizi/strumenti/genera_dati_e02.py).
Nessun LLM: e' un motore deterministico.
"""
from __future__ import annotations

import json
from pathlib import Path

from corso.errori import ErroreFlusso

from ..motore.contratto import Controllo, Esercizio, Esito, testo
from ..motore.esecutore import richiedi
from .punteggio import (CRITERI, SETTORI_PRIORITARI, classifica, vincolo_high, vincolo_mai_high)

DATI = json.loads((Path(__file__).parent / "dati" / "e02_lead.json").read_text(encoding="utf-8"))
REGOLE_INIZIALI = {"pesi": {"ruolo": 25, "dimensione": 25, "settore": 25, "comportamento": 25},
                   "soglia_alta": 30, "soglia_media": 15}
# Le regole iniziali riproducono il difetto del repo 11: soglie basse, quasi tutti «High».
NOMI_CRITERI = {
    "ruolo": testo("Ruolo (seniority)", "Role (seniority)"),
    "dimensione": testo("Dimensione aziendale", "Company size"),
    "settore": testo("Settore prioritario", "Priority sector"),
    "comportamento": testo("Comportamento (visite e guide)", "Behaviour (visits and guides)"),
}
SPIEGA_CRITERI = {
    "ruolo": testo("C-level vale tutto il peso, VP 85%, Director 70%, Manager 50%, specialista 25%, stagista o studente 0.",
                   "C-level gets the full weight, VP 85%, Director 70%, Manager 50%, specialist 25%, intern or student 0."),
    "dimensione": testo("Fino a 10 persone 10%, fino a 50 40%, fino a 500 70%, oltre 500 tutto il peso.",
                        "Up to 10 people 10%, up to 50 40%, up to 500 70%, over 500 the full weight."),
    "settore": testo("Software ed e-commerce (prioritari) valgono tutto il peso, gli altri settori 20%.",
                     "Software and e-commerce (priority) get the full weight, other sectors 20%."),
    "comportamento": testo("Visite al sito + 3 per ogni guida scaricata: a 15 si prende tutto il peso.",
                           "Website visits + 3 for each guide downloaded: at 15 you get the full weight."),
}
LIMITI = {"min": 0, "max": 100, "passo": 5}


def _nomi(voci: list[str], quanti: int = 4) -> str:
    return ", ".join(voci[:quanti]) + ("…" if len(voci) > quanti else "")


class PunteggioRegole(Esercizio):
    numero = 2
    id = "punteggio_regole"
    versione = "1.0"
    tipo_area = "foglio_pesi"
    titolo = testo("Lead scoring a regole: il foglio dei pesi", "Rule-based lead scoring: the weights sheet")
    sottotitolo = testo(
        "Il punteggio di partenza mette quasi tutti in fascia alta: non distingue nessuno. Scegli tu pesi e soglie, come farebbe un direttore vendite.",
        "The starting score puts almost everyone in the high band: it tells nobody apart. You choose weights and thresholds, like a sales director would.")
    consegna = [
        testo("Muovi i cursori dei 4 criteri: i pesi devono sommare esattamente 100.",
              "Move the sliders of the 4 criteria: the weights must add up to exactly 100."),
        testo("Imposta le due soglie: High da X punti in su, Medium da Y in su (sotto Y è Low).",
              "Set the two thresholds: High from X points up, Medium from Y up (below Y is Low)."),
        testo("Guarda la classifica dei 22 lead: deve esserci almeno un lead in ogni fascia.",
              "Look at the ranking of the 22 leads: there must be at least one lead in each band."),
        testo("Due regole del direttore non si discutono: un CEO/CTO di un'azienda con oltre 500 persone in un settore prioritario è sempre High; uno stagista o uno studente non è mai High.",
              "Two of the director's rules are not up for debate: a CEO/CTO of a company with over 500 people in a priority sector is always High; an intern or a student is never High."),
        testo("Premi «Applica al CRM» per scrivere punteggi e fasce nelle schede, poi «Verifica». Il correttore prova le tue regole anche su 20 lead che non vedi.",
              "Press «Apply to the CRM» to write scores and bands into the records, then «Check». The grader also tries your rules on 20 leads you cannot see."),
    ]

    # ------------------------------------------------------------ setup

    def prepara(self, lab) -> None:
        crm = lab.crm
        aziende = sorted({(l["azienda"], l["settore"], l["dipendenti"]) for l in DATI["visibili"]})
        id_az = {a: i + 1 for i, a in enumerate(aziende)}
        crm.esegui_molti("INSERT INTO aziende (id, nome, settore, dimensione) VALUES (?, ?, ?, ?)",
                         [(i, a[0], a[1], a[2]) for a, i in id_az.items()])
        righe = []
        for k, l in enumerate(DATI["visibili"]):
            nome, cognome = l["nome"].split(" ", 1)
            righe.append((k + 1, nome, cognome, f"{nome.lower()}.{cognome.lower()}@esempio.local", l["ruolo"]["it"],
                          l["seniority"], id_az[(l["azienda"], l["settore"], l["dipendenti"])], l["visite"], l["download"]))
        crm.esegui_molti("INSERT INTO contatti (id, nome, cognome, email, ruolo, seniority, azienda_id, visite, download) "
                         "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", righe)
        crm.imposta("regole", REGOLE_INIZIALI)

    # ------------------------------------------------------------ area di lavoro

    @staticmethod
    def _regole(lab) -> dict:
        return lab.crm.impostazione("regole")

    def area(self, lab, lingua: str) -> dict:
        regole = self._regole(lab)
        crm_fasce = {r["id"]: (r["punteggio"], r["fascia"]) for r in lab.crm.righe("SELECT id, punteggio, fascia FROM contatti")}
        righe = []
        for k, r in enumerate(classifica(DATI["visibili"], regole)):
            p_crm, f_crm = crm_fasce[k + 1]
            righe.append({"id": k + 1, "nome": r["nome"], "ruolo": r["ruolo"][lingua], "azienda": r["azienda"],
                          "settore": r["settore"], "prioritario": r["settore"] in SETTORI_PRIORITARI,
                          "dipendenti": r["dipendenti"], "visite": r["visite"], "download": r["download"],
                          "punteggio": r["punteggio"], "fascia": r["fascia"], "fascia_crm": f_crm, "punteggio_crm": p_crm})
        righe.sort(key=lambda r: (-r["punteggio"], r["nome"]))
        fasce = [r["fascia"] for r in righe]
        applicate = lab.crm.impostazione("regole_applicate")
        return {
            "criteri": [{"id": c, "nome": NOMI_CRITERI[c][lingua], "spiega": SPIEGA_CRITERI[c][lingua]} for c in CRITERI],
            "regole": regole, "limiti": LIMITI, "somma_pesi": sum(regole["pesi"].values()),
            "conteggio": {f: fasce.count(f) for f in ("High", "Medium", "Low")},
            "classifica": righe, "applicata": applicate == regole,
        }

    def azione(self, lab, nome: str, parametri: dict) -> dict:
        if nome == "imposta_regole":
            pesi = richiedi(parametri, "pesi", dict)
            if sorted(pesi) != sorted(CRITERI):
                raise ErroreFlusso("pesi_non_validi", f"servono esattamente i criteri {CRITERI}")
            regole = {"pesi": {}, "soglia_alta": richiedi(parametri, "soglia_alta", int),
                      "soglia_media": richiedi(parametri, "soglia_media", int)}
            for c in CRITERI:
                v = pesi[c]
                if isinstance(v, bool) or not isinstance(v, int):
                    raise ErroreFlusso("pesi_non_validi", f"il peso di '{c}' deve essere un numero intero")
                regole["pesi"][c] = v
            for v in list(regole["pesi"].values()) + [regole["soglia_alta"], regole["soglia_media"]]:
                if not LIMITI["min"] <= v <= LIMITI["max"]:
                    raise ErroreFlusso("fuori_limiti", f"ogni valore va da {LIMITI['min']} a {LIMITI['max']}")
            lab.crm.imposta("regole", regole)
            return {"fatto": "regole"}
        if nome == "applica_al_crm":
            regole = self._regole(lab)
            for k, r in enumerate(classifica(DATI["visibili"], regole)):
                lab.crm.esegui("UPDATE contatti SET punteggio = ?, fascia = ? WHERE id = ?", (r["punteggio"], r["fascia"], k + 1))
            lab.crm.imposta("regole_applicate", regole)
            return {"fatto": "applicata"}
        raise ErroreFlusso("azione_sconosciuta", f"azione '{nome}' non prevista nell'esercizio 2")

    # ------------------------------------------------------------ correzione

    def fotografa(self, lab) -> dict:
        return {"regole": self._regole(lab), "regole_applicate": lab.crm.impostazione("regole_applicate"),
                "crm": lab.crm.righe("SELECT id, punteggio, fascia FROM contatti ORDER BY id")}

    def chiave(self, seme: int) -> dict:
        return {"visibili": DATI["visibili"], "nascosti": DATI["nascosti"], "fascia_attesa": DATI["fascia_attesa"]}

    def controlli(self) -> list[Controllo]:
        return [
            Controllo("somma_pesi", testo("Pesi che sommano 100", "Weights adding up to 100"), 15,
                      testo("Con pesi che sommano 100 il punteggio va da 0 a 100 e ogni peso si legge come «quanti punti su 100 vale questo criterio».",
                            "With weights adding up to 100 the score goes from 0 to 100 and each weight reads as «how many points out of 100 this criterion is worth»."),
                      self._c_somma),
            Controllo("fasce_non_degeneri", testo("Almeno un lead in ogni fascia", "At least one lead in each band"), 15,
                      testo("Se tutti finiscono nella stessa fascia il punteggio non serve a scegliere chi chiamare: alza la soglia High o abbassa la Medium.",
                            "If everyone ends up in the same band the score does not help choose whom to call: raise the High threshold or lower the Medium one."),
                      self._c_fasce),
            Controllo("accordo_nascosti", testo("Accordo con il direttore vendite (lead nascosti)", "Agreement with the sales director (hidden leads)"), 35,
                      testo("Il direttore conta soprattutto CHI decide (ruolo), poi quanto è grande l'azienda, poi il settore; il comportamento conta meno. Prova a dare più peso al ruolo.",
                            "The director cares most about WHO decides (role), then company size, then sector; behaviour counts less. Try giving more weight to the role."),
                      self._c_accordo),
            Controllo("vincolo_ceo", testo("CEO/CTO di grandi aziende prioritarie sempre High", "CEO/CTO of large priority companies always High"), 15,
                      testo("Un CEO di un'azienda con oltre 500 persone in un settore prioritario prende già il massimo su ruolo, dimensione e settore: se non è High, la soglia High è troppo alta o il comportamento pesa troppo.",
                            "A CEO of a company with over 500 people in a priority sector already gets the maximum on role, size and sector: if they are not High, the High threshold is too high or behaviour weighs too much."),
                      self._c_ceo, bloccante=True),
            Controllo("vincolo_stagista", testo("Stagisti e studenti mai High", "Interns and students never High"), 10,
                      testo("Uno stagista prende 0 sul ruolo ma può prendere il massimo su tutto il resto: perché non arrivi a High, il ruolo deve pesare abbastanza (o la soglia High deve essere più alta).",
                            "An intern gets 0 on role but can get the maximum on everything else: to keep them out of High, role must weigh enough (or the High threshold must be higher)."),
                      self._c_stagista, bloccante=True),
            Controllo("classifica_applicata", testo("Classifica applicata al CRM", "Ranking applied to the CRM"), 10,
                      testo("Dopo l'ultima modifica premi «Applica al CRM»: finché non lo fai, nelle schede dei commerciali ci sono ancora i punteggi vecchi.",
                            "After your last change press «Apply to the CRM»: until you do, the salespeople's records still show the old scores."),
                      self._c_applicata),
        ]

    def _c_somma(self, ctx) -> Esito:
        s = sum(ctx.foto["regole"]["pesi"].values())
        if s == 100:
            return Esito(True, testo("I pesi sommano 100.", "The weights add up to 100."))
        return Esito(False, testo(f"I pesi sommano {s}, non 100.", f"The weights add up to {s}, not 100."))

    def _c_fasce(self, ctx) -> Esito:
        fasce = [r["fascia"] for r in classifica(ctx.chiave["visibili"], ctx.foto["regole"])]
        vuote = [f for f in ("High", "Medium", "Low") if f not in fasce]
        conteggio = ", ".join(f"{f} {fasce.count(f)}" for f in ("High", "Medium", "Low"))
        if not vuote:
            return Esito(True, testo(f"Le fasce sono tutte usate ({conteggio}).", f"All bands are used ({conteggio})."))
        return Esito(False, testo(f"Nessun lead in fascia {', '.join(vuote)} ({conteggio}).", f"No lead in band {', '.join(vuote)} ({conteggio})."))

    def _c_accordo(self, ctx) -> Esito:
        att = ctx.chiave["fascia_attesa"]
        risultato = classifica(ctx.chiave["nascosti"], ctx.foto["regole"])
        giusti = sum(1 for r in risultato if r["fascia"] == att[r["id"]])
        n, minimo = len(risultato), ctx.parametri["accordo_minimo_nascosti"]
        troppo_alti = sum(1 for r in risultato if (r["fascia"], att[r["id"]]) in (("High", "Medium"), ("High", "Low"), ("Medium", "Low")))
        if giusti >= minimo:
            return Esito(True, testo(f"Sui {n} lead nascosti la tua fascia coincide con quella del direttore in {giusti} casi (ne servivano {minimo}).",
                                     f"On the {n} hidden leads your band matches the director's in {giusti} cases ({minimo} needed)."))
        return Esito(False, testo(f"Sui {n} lead nascosti la tua fascia coincide con quella del direttore solo in {giusti} casi (ne servono {minimo}); in {troppo_alti} casi la tua fascia è più alta della sua.",
                                  f"On the {n} hidden leads your band matches the director's in only {giusti} cases ({minimo} needed); in {troppo_alti} cases your band is higher than theirs."),
                     frazione=giusti / minimo)

    def _tutti(self, ctx) -> list[dict]:
        return classifica(ctx.chiave["visibili"] + ctx.chiave["nascosti"], ctx.foto["regole"])

    def _c_ceo(self, ctx) -> Esito:
        casi = [r for r in self._tutti(ctx) if vincolo_high(r)]
        fuori = [f"{r['nome']} ({r['punteggio']} punti, {r['fascia']})" for r in casi if r["fascia"] != "High"]
        if not fuori:
            return Esito(True, testo(f"I {len(casi)} CEO/CTO di grandi aziende prioritarie sono tutti High.",
                                     f"The {len(casi)} CEOs/CTOs of large priority companies are all High."))
        return Esito(False, testo(f"{len(fuori)} CEO/CTO di grandi aziende prioritarie non sono High: {_nomi(fuori)}.",
                                  f"{len(fuori)} CEOs/CTOs of large priority companies are not High: {_nomi(fuori)}."))

    def _c_stagista(self, ctx) -> Esito:
        casi = [r for r in self._tutti(ctx) if vincolo_mai_high(r)]
        dentro = [f"{r['nome']} ({r['punteggio']} punti)" for r in casi if r["fascia"] == "High"]
        if not dentro:
            return Esito(True, testo(f"Nessuno dei {len(casi)} stagisti o studenti è High.", f"None of the {len(casi)} interns or students is High."))
        return Esito(False, testo(f"{len(dentro)} stagisti o studenti sono finiti in fascia High: {_nomi(dentro)}.",
                                  f"{len(dentro)} interns or students ended up in the High band: {_nomi(dentro)}."))

    def _c_applicata(self, ctx) -> Esito:
        attese = classifica(ctx.chiave["visibili"], ctx.foto["regole"])
        diverse = [a["nome"] for a, c in zip(attese, ctx.foto["crm"]) if (a["punteggio"], a["fascia"]) != (c["punteggio"], c["fascia"])]
        if not diverse:
            return Esito(True, testo("Le schede del CRM mostrano punteggi e fasce delle tue regole attuali.",
                                     "The CRM records show the scores and bands of your current rules."))
        return Esito(False, testo(f"In {len(diverse)} schede del CRM punteggio o fascia non corrispondono alle regole attuali (es. {_nomi(diverse, 3)}): premi «Applica al CRM».",
                                  f"In {len(diverse)} CRM records score or band do not match the current rules (e.g. {_nomi(diverse, 3)}): press «Apply to the CRM»."))


ESERCIZIO = PunteggioRegole()
