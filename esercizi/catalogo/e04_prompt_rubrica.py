"""Esercizio 4 — «Chiedere all'LLM, ma con una rubrica»: istruzioni a blocchi e uscita strutturata (esercizio 3 del piano).

Lo studente compone le istruzioni dell'agente accendendo dei blocchi (contesto, rubrica, fasce, formato, stile):
parte dal prompt del repo 11 («assegna un punteggio 0-100»), che mette tutti in fascia alta e risponde in prosa.
Prova le istruzioni sui 10 lead visibili e le confronta con le fasce a regole del direttore (esercizio 2).
Il correttore manda le STESSE istruzioni sui 10 lead nascosti attraverso il registro LLM (ricorrezione identica) e
controlla solo proprieta' verificabili dell'uscita: JSON valido secondo lo schema, motivazione breve, fascia
coerente con le soglie dichiarate nel prompt, distribuzione non degenere, accordo con il direttore, criteri della
rubrica presenti nel prompt. Mai la prosa del modello.
"""
from __future__ import annotations

import json
from pathlib import Path

from corso.errori import ErroreFlusso

from ..motore.contratto import Controllo, Esercizio, Esito, testo
from ..motore.esecutore import richiedi
from .punteggio import classifica, fascia

CARTELLA = Path(__file__).parent / "dati"
DATI = json.loads((CARTELLA / "e04_prompt.json").read_text(encoding="utf-8"))
LEAD = json.loads((CARTELLA / "e02_lead.json").read_text(encoding="utf-8"))
BLOCCHI = {b["id"]: b for b in DATI["blocchi"]}
ORDINE = [b["id"] for b in DATI["blocchi"]]
COMPITO = "COMPITO: punteggio_rubrica"
_per_id = {l["id"]: l for l in LEAD["visibili"] + LEAD["nascosti"]}
VISIBILI = [_per_id[i] for i in DATI["lead_visibili"]]
NASCOSTI = [_per_id[i] for i in DATI["lead_nascosti"]]
SCHEMA = DATI["schema"]


def prompt_di(accesi: list[str]) -> str:
    """Istruzioni inviate al modello: i blocchi accesi nell'ordine del catalogo, sempre in italiano."""
    return "\n".join([COMPITO] + [BLOCCHI[b]["prompt"] for b in ORDINE if b in accesi])


def messaggio_lead(lead: dict) -> str:
    dati = {"nome": lead["nome"], "ruolo": lead["ruolo"]["it"], "seniority": lead["seniority"], "azienda": lead["azienda"],
            "settore": lead["settore"], "dipendenti": lead["dipendenti"], "visite": lead["visite"], "download": lead["download"]}
    return json.dumps(dati, ensure_ascii=False, sort_keys=True)


def chiedi(llm, accesi: list[str], lead: dict) -> dict:
    return llm.completa([{"role": "system", "content": prompt_di(accesi)}, {"role": "user", "content": messaggio_lead(lead)}])


def analizza(risposta: str) -> dict:
    """Legge una risposta del modello come farebbe un programma: JSON valido secondo lo schema, o niente."""
    try:
        obj = json.loads(risposta)
    except ValueError:
        return {"valida": False, "motivo": "non_json"}
    if not isinstance(obj, dict) or sorted(obj) != SCHEMA["chiavi"]:
        return {"valida": False, "motivo": "campi"}
    p, f, m = obj["punteggio"], obj["fascia"], obj["motivazione"]
    if isinstance(p, bool) or not isinstance(p, int) or not SCHEMA["punteggio_min"] <= p <= SCHEMA["punteggio_max"]:
        return {"valida": False, "motivo": "punteggio"}
    if f not in SCHEMA["fasce"] or not isinstance(m, str):
        return {"valida": False, "motivo": "fascia"}
    return {"valida": True, "punteggio": p, "fascia": f, "motivazione": m, "parole": len(m.split())}


def soglie_dichiarate(accesi: list[str]) -> dict | None:
    for b in ORDINE:
        if b in accesi and "soglie" in BLOCCHI[b]:
            return BLOCCHI[b]["soglie"]
    return None


MOTIVI = {
    "non_json": testo("non è JSON", "not JSON"), "campi": testo("campi sbagliati", "wrong fields"),
    "punteggio": testo("punteggio fuori schema", "score outside the schema"), "fascia": testo("fascia fuori elenco", "band not in the list"),
}


class PromptRubrica(Esercizio):
    numero = 4
    id = "prompt_rubrica"
    versione = "1.0"
    tipo_area = "blocchi_prompt"
    titolo = testo("Chiedere all'LLM, ma con una rubrica", "Asking the LLM, but with a rubric")
    sottotitolo = testo(
        "Il prompt di partenza dice solo «dai un punteggio da 0 a 100»: tutti i lead escono «High» e le risposte sono frasi che nessun programma sa leggere. Componi tu le istruzioni.",
        "The starting prompt only says «give a score from 0 to 100»: every lead comes out «High» and the answers are sentences no program can read. You write the instructions.")
    consegna = [
        testo("Premi «Prova sui 10 lead» con le istruzioni di partenza e guarda che cosa risponde il modello.",
              "Press «Try on the 10 leads» with the starting instructions and look at what the model answers."),
        testo("Accendi e spegni i blocchi: una rubrica con i criteri, le fasce con le soglie, il formato JSON richiesto. Attenzione ai blocchi che sembrano utili ma rompono il formato o allungano le risposte.",
              "Switch the blocks on and off: a rubric with the criteria, the bands with their thresholds, the required JSON format. Watch out for blocks that look useful but break the format or make the answers longer."),
        testo("Riprova e confronta le fasce del modello con quelle a regole del direttore vendite (esercizio 2).",
              "Try again and compare the model's bands with the sales director's rule-based ones (exercise 2)."),
        testo("Quando le risposte sono JSON valido, brevi e d'accordo con il direttore, premi «Verifica»: il correttore manda le tue istruzioni su 10 lead che non vedi.",
              "When the answers are valid JSON, short and in line with the director, press «Check»: the grader sends your instructions on 10 leads you cannot see."),
    ]

    # ------------------------------------------------------------ setup

    def prepara(self, lab) -> None:
        crm = lab.crm
        crm.esegui("INSERT INTO aziende (id, nome, settore, dimensione) VALUES (1, 'Campagna lead', 'servizi', NULL)")
        for k, l in enumerate(VISIBILI):
            nome, cognome = l["nome"].split(" ", 1)
            crm.esegui("INSERT INTO contatti (id, nome, cognome, email, ruolo, seniority, azienda_id, visite, download) "
                       "VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)",
                       (k + 1, nome, cognome, f"{nome.lower()}.{cognome.lower()}@esempio.local", l["ruolo"]["it"],
                        l["seniority"], l["visite"], l["download"]))
        crm.imposta("blocchi", [b for b in ORDINE if b in DATI["blocchi_iniziali"]])
        crm.imposta("prova", None)

    # ------------------------------------------------------------ area di lavoro

    def area(self, lab, lingua: str) -> dict:
        accesi = lab.crm.impostazione("blocchi")
        prova = lab.crm.impostazione("prova")
        riferimento = {r["id"]: r for r in classifica(VISIBILI, LEAD["riferimento"])}
        righe = []
        for l in VISIBILI:
            r = {"id": l["id"], "nome": l["nome"], "ruolo": l["ruolo"][lingua], "azienda": l["azienda"], "settore": l["settore"],
                 "dipendenti": l["dipendenti"], "fascia_regole": riferimento[l["id"]]["fascia"],
                 "punteggio_regole": riferimento[l["id"]]["punteggio"], "risposta": None}
            if prova:
                esito = prova["risposte"][l["id"]]
                a = analizza(esito)
                r.update({"risposta": esito, "valida": a["valida"], "punteggio": a.get("punteggio"), "fascia": a.get("fascia"),
                          "parole": a.get("parole"), "motivo": MOTIVI[a["motivo"]][lingua] if not a["valida"] else ""})
            righe.append(r)
        return {
            "gruppi": [{"id": g["id"], "nome": g["nome"][lingua],
                        "blocchi": [{"id": b["id"], "testo": b["testo"][lingua], "acceso": b["id"] in accesi}
                                    for b in DATI["blocchi"] if b["gruppo"] == g["id"]]} for g in DATI["gruppi"]],
            "anteprima": [BLOCCHI[b]["testo"][lingua] for b in ORDINE if b in accesi],
            "provata": bool(prova), "prova_aggiornata": bool(prova) and prova["blocchi"] == accesi,
            "righe": righe,
            "valide": sum(1 for r in righe if r.get("valida")),
            "conteggio": {f: sum(1 for r in righe if r.get("fascia") == f) for f in SCHEMA["fasce"]},
            "accordo": sum(1 for r in righe if r.get("valida") and r["fascia"] == r["fascia_regole"]),
            "totale": len(righe),
        }

    def azione(self, lab, nome: str, parametri: dict) -> dict:
        crm = lab.crm
        if nome == "blocco":
            bid, acceso = richiedi(parametri, "blocco", str), richiedi(parametri, "acceso", bool)
            if bid not in BLOCCHI:
                raise ErroreFlusso("blocco_inesistente", f"il blocco '{bid}' non esiste: {ORDINE}")
            accesi = set(crm.impostazione("blocchi"))
            accesi = accesi | {bid} if acceso else accesi - {bid}
            crm.imposta("blocchi", [b for b in ORDINE if b in accesi])
            return {"fatto": "blocco"}
        if nome == "prova":
            accesi = crm.impostazione("blocchi")
            risposte = {l["id"]: chiedi(lab.llm, accesi, l)["risposta"] for l in VISIBILI}
            crm.imposta("prova", {"blocchi": accesi, "risposte": risposte})
            return {"fatto": "prova", "valide": sum(1 for r in risposte.values() if analizza(r)["valida"])}
        raise ErroreFlusso("azione_sconosciuta", f"azione '{nome}' non prevista nell'esercizio 4")

    # ------------------------------------------------------------ correzione

    def fotografa(self, lab) -> dict:
        accesi = lab.crm.impostazione("blocchi")
        nascosti = []
        for l in NASCOSTI:
            r = chiedi(lab.llm, accesi, l)
            nascosti.append({"id": l["id"], "risposta": r["risposta"], "registro": r["chiave"]})
        return {"blocchi": accesi, "prompt": prompt_di(accesi), "nascosti": nascosti, "modello": lab.llm.nome}

    def chiave(self, seme: int) -> dict:
        return {"nascosti": {l["id"]: {"giusta": LEAD["fascia_attesa"][l["id"]]} for l in NASCOSTI},
                "soglie_blocchi": {b["id"]: b["soglie"] for b in DATI["blocchi"] if "soglie" in b},
                "parole_rubrica": DATI["parole_rubrica"]}

    def controlli(self) -> list[Controllo]:
        return [
            Controllo("json_valido", testo("Risposte in JSON valido secondo lo schema", "Answers in valid JSON following the schema"), 25,
                      testo("Accendi il blocco del formato JSON e togli quelli che fanno scrivere testo prima o dopo il JSON (per esempio «spiega il ragionamento passo per passo»): un programma deve poter leggere la risposta così com'è.",
                            "Switch on the JSON format block and remove the ones that make the model write text before or after the JSON (for example «explain your reasoning step by step»): a program must be able to read the answer as it is."),
                      self._c_json),
            Controllo("motivazione_breve", testo("Motivazioni entro il limite di parole", "Reasons within the word limit"), 10,
                      testo("Lo schema chiede una motivazione breve: un blocco di stile che chiede testi «ricchi ed entusiasti» la fa sforare.",
                            "The schema asks for a short reason: a style block asking for «rich and enthusiastic» texts makes it run over."),
                      self._c_motivazione),
            Controllo("fascia_coerente", testo("Fascia coerente con le soglie dichiarate", "Band consistent with the declared thresholds"), 15,
                      testo("Scrivi nel prompt le soglie delle fasce (da quanti punti si è High, da quanti Medium): senza soglie il modello decide «a occhio» e la fascia non si può controllare.",
                            "Write the band thresholds in the prompt (from how many points a lead is High, from how many Medium): without thresholds the model decides «by eye» and the band cannot be checked."),
                      self._c_coerenza),
            Controllo("distribuzione", testo("Distribuzione non degenere", "Distribution not degenerate"), 15,
                      testo("Un punteggio che mette quasi tutti nella stessa fascia non aiuta il commerciale: servono criteri espliciti e soglie, non «alto se ti sembra interessante».",
                            "A score that puts almost everyone in the same band does not help the salesperson: you need explicit criteria and thresholds, not «high if it looks interesting»."),
                      self._c_distribuzione),
            Controllo("accordo_direttore", testo("D'accordo con le fasce del direttore vendite", "In line with the sales director's bands"), 25,
                      testo("Confronta nella prova le fasce del modello con quelle a regole: se non coincidono, manca qualche criterio della rubrica o c'è un blocco che gonfia i punteggi.",
                            "In the trial compare the model's bands with the rule-based ones: if they do not match, some rubric criterion is missing or a block is inflating the scores."),
                      self._c_accordo),
            Controllo("rubrica_nel_prompt", testo("Il prompt contiene i criteri della rubrica", "The prompt contains the rubric criteria"), 10,
                      testo("La rubrica deve dire al modello su che cosa giudicare: ruolo (seniority), dimensione dell'azienda, settore.",
                            "The rubric must tell the model what to judge on: role (seniority), company size, sector."),
                      self._c_rubrica),
        ]

    # --- helpers
    @staticmethod
    def _analisi(ctx) -> list[dict]:
        return [{"id": r["id"], **analizza(r["risposta"])} for r in ctx.foto["nascosti"]]

    def _c_json(self, ctx) -> Esito:
        a = self._analisi(ctx)
        valide, n = sum(1 for x in a if x["valida"]), len(a)
        if valide == n:
            return Esito(True, testo(f"Tutte le {n} risposte sui lead nascosti sono JSON valido secondo lo schema.",
                                     f"All {n} answers on the hidden leads are valid JSON following the schema."))
        motivi = {}
        for x in a:
            if not x["valida"]:
                motivi[x["motivo"]] = motivi.get(x["motivo"], 0) + 1
        dett = {l: ", ".join(f"{q}× {MOTIVI[m][l]}" for m, q in sorted(motivi.items())) for l in ("it", "en")}
        return Esito(False, testo(f"Solo {valide} risposte su {n} sono JSON valido ({dett['it']}).",
                                  f"Only {valide} answers out of {n} are valid JSON ({dett['en']})."), frazione=valide / n)

    def _c_motivazione(self, ctx) -> Esito:
        massimo = ctx.parametri["parole_massime_motivazione"]
        valide = [x for x in self._analisi(ctx) if x["valida"]]
        if not valide:
            return Esito(False, testo("Nessuna risposta valida: non si può misurare la motivazione.", "No valid answer: the reason cannot be measured."))
        lunghe = [x["parole"] for x in valide if x["parole"] > massimo]
        if not lunghe:
            return Esito(True, testo(f"Tutte le motivazioni stanno entro {massimo} parole.", f"All reasons stay within {massimo} words."))
        return Esito(False, testo(f"{len(lunghe)} motivazioni su {len(valide)} superano {massimo} parole (la più lunga ne ha {max(lunghe)}).",
                                  f"{len(lunghe)} reasons out of {len(valide)} go over {massimo} words (the longest has {max(lunghe)})."))

    def _c_coerenza(self, ctx) -> Esito:
        soglie = next((ctx.chiave["soglie_blocchi"][b] for b in ctx.foto["blocchi"] if b in ctx.chiave["soglie_blocchi"]), None)
        if soglie is None:
            return Esito(False, testo("Il prompt non dichiara le soglie delle fasce: la fascia non si può controllare.",
                                      "The prompt does not declare the band thresholds: the band cannot be checked."))
        a = self._analisi(ctx)
        coerenti = [x for x in a if x["valida"] and x["fascia"] == fascia(x["punteggio"], soglie["alta"], soglie["media"])]
        n = len(a)
        if len(coerenti) == n:
            return Esito(True, testo(f"Ogni fascia rispetta le soglie del prompt (High da {soglie['alta']}, Medium da {soglie['media']}).",
                                     f"Every band follows the prompt's thresholds (High from {soglie['alta']}, Medium from {soglie['media']})."))
        return Esito(False, testo(f"Fascia coerente con le soglie in {len(coerenti)} risposte su {n} (le risposte non valide non contano come coerenti).",
                                  f"Band consistent with the thresholds in {len(coerenti)} answers out of {n} (invalid answers do not count as consistent)."),
                     frazione=len(coerenti) / n)

    def _c_distribuzione(self, ctx) -> Esito:
        a = self._analisi(ctx)
        n = len(a)
        fasce = [x["fascia"] for x in a if x["valida"]]
        if not fasce:
            return Esito(False, testo("Nessuna risposta valida: nessuna fascia da contare.", "No valid answer: no band to count."))
        conta = {f: fasce.count(f) for f in SCHEMA["fasce"]}
        quota = ctx.parametri["quota_massima_fascia"]
        piena = max(conta, key=lambda f: conta[f])
        dett = ", ".join(f"{f} {q}" for f, q in conta.items())
        diverse = sum(1 for q in conta.values() if q)
        if diverse >= ctx.parametri["fasce_diverse_minime"] and conta[piena] <= quota * n:
            return Esito(True, testo(f"Fasce ben distribuite sui {n} lead nascosti: {dett}.", f"Bands well spread over the {n} hidden leads: {dett}."))
        return Esito(False, testo(f"Distribuzione degenere: {dett}. Nessuna fascia deve superare il {round(quota * 100)}% dei lead.",
                                  f"Degenerate distribution: {dett}. No band may go over {round(quota * 100)}% of the leads."))

    def _c_accordo(self, ctx) -> Esito:
        a = self._analisi(ctx)
        giuste = [x for x in a if x["valida"] and x["fascia"] == ctx.chiave["nascosti"][x["id"]]["giusta"]]
        minimo, n = ctx.parametri["accordo_minimo_nascosti"], len(a)
        if len(giuste) >= minimo:
            return Esito(True, testo(f"Sui {n} lead nascosti la fascia del modello coincide con quella del direttore in {len(giuste)} casi.",
                                     f"On the {n} hidden leads the model's band matches the director's in {len(giuste)} cases."))
        # i nomi dei lead nascosti non si mostrano: si dice solo in che direzione sbaglia il modello
        ordine = {f: i for i, f in enumerate(SCHEMA["fasce"])}
        alte = sum(1 for x in a if x["valida"] and ordine[x["fascia"]] < ordine[ctx.chiave["nascosti"][x["id"]]["giusta"]])
        basse = sum(1 for x in a if x["valida"] and ordine[x["fascia"]] > ordine[ctx.chiave["nascosti"][x["id"]]["giusta"]])
        illeggibili = sum(1 for x in a if not x["valida"])
        return Esito(False, testo(f"Fascia uguale a quella del direttore solo in {len(giuste)} casi su {n} (ne servono {minimo}): {alte} troppo alte, {basse} troppo basse, {illeggibili} illeggibili.",
                                  f"Band equal to the director's only in {len(giuste)} cases out of {n} ({minimo} needed): {alte} too high, {basse} too low, {illeggibili} unreadable."),
                     frazione=len(giuste) / minimo)

    def _c_rubrica(self, ctx) -> Esito:
        prompt = ctx.foto["prompt"].lower()
        mancanti = [v["nome"] for k, v in sorted(ctx.chiave["parole_rubrica"].items()) if not any(p in prompt for p in v["parole"])]
        tot = len(ctx.chiave["parole_rubrica"])
        if not mancanti:
            return Esito(True, testo("Il prompt nomina tutti i criteri della rubrica.", "The prompt names all the rubric criteria."))
        return Esito(False, testo(f"Nel prompt mancano dei criteri: {', '.join(m['it'] for m in mancanti)}.",
                                  f"Some criteria are missing from the prompt: {', '.join(m['en'] for m in mancanti)}."),
                     frazione=(tot - len(mancanti)) / tot)


ESERCIZIO = PromptRubrica()
