"""Esercizio 3 — «Trova l'errore»: il report che diceva «15 risposte, 15 interessati» (esercizio 4 del piano).

E' il bug reale del repo 11, con lo stesso lessico del laboratorio della lezione P3.5 (dati/lezioni/trova_errore.json):
la conversione dell'etichetta dell'LLM in una categoria del CRM controlla «contiene Interested» PRIMA di
«Not Interested», quindi tutti diventano interessati. Lo studente, dal browser:
  1. etichetta a mano le 15 risposte (dati grezzi);
  2. indica la stazione della pipeline in cui nasce l'errore;
  3. sceglie la correzione fra le opzioni della lezione;
  4. preme «Applica e rilancia»: la pipeline riconverte le etichette, aggiorna il CRM (categorie, «non
     contattare», promemoria) e manda la seconda email della campagna ai soli interessati (posta finta).
Il correttore guarda le SCELTE (etichette, stazione, correzione) e lo STATO FINALE di CRM e posta; prova la
correzione anche su 12 risposte nascoste, classificate dal modello attraverso il registro (ricorrezione identica).
"""
from __future__ import annotations

import json
from pathlib import Path

from corso.errori import ErroreDati, ErroreFlusso

from ..motore.contratto import Controllo, Esercizio, Esito, testo
from ..motore.esecutore import richiedi
from ..motore.llm import normalizza

DATI = json.loads((Path(__file__).parent / "dati" / "e03_risposte.json").read_text(encoding="utf-8"))
CATEGORIE = [c["id"] for c in DATI["categorie"]]
CORREZIONI = {c["id"]: c for c in DATI["correzioni"]}
STAZIONI = [s["id"] for s in DATI["stazioni"]]
PROMPT_SISTEMA = (
    "COMPITO: classifica_risposta\n"
    "Sei l'assistente di un CRM. Leggi la risposta di un cliente a un'email commerciale e rispondi con UNA sola "
    "etichetta in inglese, scelta fra: Interested, Not Interested, Maybe Interested, Out of Office. "
    "Non aggiungere altre parole."
)
NOME_CAMPAGNA = "Campagna autunno - prima email"
OGGETTO_SEGUITO = "Proposta di demo per {azienda}"
CORPO_SEGUITO = ("Gentile {nome},\ngrazie per la risposta. Come promesso le proponiamo una demo di 20 minuti: "
                 "risponda con il giorno che preferisce.\nIl team commerciale")


def chiede_disiscrizione(testo_cliente: str) -> bool:
    t = normalizza(testo_cliente)
    return any(normalizza(f) in t for f in DATI["frasi_disiscrizione"])


def converti(regole: dict, etichetta_llm: str, testo_cliente: str) -> str:
    """La stazione «conversione»: stessa logica del laboratorio della lezione (regoleDi/converti in trova_errore.js)."""
    if regole["disiscrizione_fissa"] and chiede_disiscrizione(testo_cliente):
        return "disiscrizione"
    for parola, categoria in regole["ordine"]:
        if regole["confronto"] == "contiene" and parola in etichetta_llm:
            return categoria
        if regole["confronto"] == "esatto" and etichetta_llm.strip() == parola:
            return categoria
    return regole["sconosciuta"]


def regole_di(correzione: str | None) -> dict:
    return CORREZIONI[correzione]["regole"] if correzione else DATI["regole_bug"]


def classifica_llm(llm, testo_it: str) -> str:
    return llm.completa([{"role": "system", "content": PROMPT_SISTEMA}, {"role": "user", "content": testo_it}])["risposta"]


def _nomi(voci: list[str], quanti: int = 4) -> str:
    return ", ".join(voci[:quanti]) + ("…" if len(voci) > quanti else "")


class TrovaErrore(Esercizio):
    numero = 3
    id = "trova_errore"
    versione = "1.0"
    tipo_area = "pipeline_risposte"
    titolo = testo("Trova l'errore: «15 risposte, 15 interessati»", "Find the bug: «15 replies, 15 interested»")
    sottotitolo = testo(
        "Il report della campagna è perfetto. Troppo. Controlla i dati grezzi, trova la stazione rotta della pipeline, scegli la correzione e rilancia.",
        "The campaign report is perfect. Too perfect. Check the raw data, find the broken station of the pipeline, choose the fix and run it again.")
    consegna = [
        testo("Leggi le 15 risposte dei clienti e dai a ognuna l'etichetta giusta (è il controllo sui dati grezzi).",
              "Read the 15 customer replies and give each one the right label (this is the check on the raw data)."),
        testo("Confronta le tue etichette con quelle del CRM e indica la stazione della pipeline in cui il dato diventa sbagliato.",
              "Compare your labels with the CRM ones and point to the station of the pipeline where the data becomes wrong."),
        testo("Scegli la correzione fra quelle proposte.", "Choose the fix among the ones offered."),
        testo("Premi «Applica e rilancia»: il CRM si aggiorna e parte la seconda email, solo verso chi è davvero interessato. Controlla report e posta inviata.",
              "Press «Apply and run again»: the CRM is updated and the second email goes out, only to people who are really interested. Check the report and the sent mail."),
        testo("Quando report e posta ti convincono, premi «Verifica». Il correttore prova la tua correzione anche su 12 risposte che non vedi.",
              "When the report and the mail convince you, press «Check». The grader also tries your fix on 12 replies you cannot see."),
    ]

    # ------------------------------------------------------------ setup

    def prepara(self, lab) -> None:
        crm = lab.crm
        crm.esegui("INSERT INTO campagne (id, nome) VALUES (1, ?)", (NOME_CAMPAGNA,))
        aziende = sorted({v["azienda"] for v in DATI["visibili"]})
        id_az = {a: i + 1 for i, a in enumerate(aziende)}
        crm.esegui_molti("INSERT INTO aziende (id, nome, settore, dimensione) VALUES (?, ?, 'servizi', NULL)",
                         [(i, a) for a, i in id_az.items()])
        for k, v in enumerate(DATI["visibili"]):
            nome, cognome = v["nome"].split(" ", 1)
            cid = k + 1
            crm.esegui("INSERT INTO contatti (id, nome, cognome, email, ruolo, azienda_id) VALUES (?, ?, ?, ?, 'Titolare', ?)",
                       (cid, nome, cognome, f"{v['chiave']}@{v['azienda'].lower().replace(' ', '')}.local", id_az[v["azienda"]]))
            etichetta = classifica_llm(lab.llm, v["testo"]["it"])
            crm.esegui("INSERT INTO risposte (campagna_id, contatto_id, chiave, testo_it, testo_en, etichetta_llm) "
                       "VALUES (1, ?, ?, ?, ?, ?)", (cid, v["chiave"], v["testo"]["it"], v["testo"]["en"], etichetta))
        # la pipeline com'e' oggi (col bug): converte e scrive nel CRM, ma la seconda email non e' ancora partita
        self._converti_nel_crm(lab, regole_di(None))
        crm.imposta("rilancio_con", "originale")

    # ------------------------------------------------------------ pipeline

    def _converti_nel_crm(self, lab, regole: dict) -> None:
        crm = lab.crm
        crm.esegui("UPDATE contatti SET categoria = '', optout = 0")
        crm.esegui("DELETE FROM optout")
        crm.esegui("DELETE FROM attivita WHERE tipo IN ('promemoria', 'da_leggere')")
        for r in crm.righe("SELECT * FROM risposte ORDER BY id"):
            cat = converti(regole, r["etichetta_llm"], r["testo_it"])
            crm.esegui("UPDATE risposte SET categoria = ? WHERE id = ?", (cat, r["id"]))
            crm.esegui("UPDATE contatti SET categoria = ? WHERE id = ?", (cat, r["contatto_id"]))
            if cat == "disiscrizione":
                crm.esegui("UPDATE contatti SET optout = 1 WHERE id = ?", (r["contatto_id"],))
                email = crm.valore("SELECT email FROM contatti WHERE id = ?", (r["contatto_id"],))
                crm.esegui("INSERT OR IGNORE INTO optout (email, motivo) VALUES (?, 'regola fissa: disiscrizione')", (email,))
            elif cat == "da_ricontattare":
                crm.esegui("INSERT INTO attivita (contatto_id, tipo, nota) VALUES (?, 'promemoria', 'Ricontattare alla data chiesta')", (r["contatto_id"],))
            elif cat == "umano":
                crm.esegui("INSERT INTO attivita (contatto_id, tipo, nota) VALUES (?, 'da_leggere', 'Una persona legge la risposta e decide')", (r["contatto_id"],))

    def _rilancia(self, lab) -> None:
        correzione = lab.crm.impostazione("correzione")
        self._converti_nel_crm(lab, regole_di(correzione))
        lab.posta.svuota(lab.etichetta_posta)
        for c in lab.crm.righe("SELECT c.nome, c.email, c.optout, a.nome AS azienda FROM contatti c "
                               "JOIN aziende a ON a.id = c.azienda_id WHERE c.categoria = 'interessato' ORDER BY c.id"):
            if c["optout"]:
                continue  # la lista dei «non contattare» vince sempre sull'invio
            lab.posta.invia(lab.etichetta_posta, c["email"], OGGETTO_SEGUITO.format(azienda=c["azienda"]),
                            CORPO_SEGUITO.format(nome=c["nome"]))
        lab.crm.imposta("rilancio_con", correzione or "originale")

    # ------------------------------------------------------------ area di lavoro

    def area(self, lab, lingua: str) -> dict:
        crm = lab.crm
        risposte = crm.righe("SELECT r.chiave, r.testo_it, r.testo_en, r.etichetta_llm, r.categoria, r.etichetta_studente, "
                             "c.nome || ' ' || c.cognome AS nome, a.nome AS azienda, c.email, c.optout FROM risposte r "
                             "JOIN contatti c ON c.id = r.contatto_id JOIN aziende a ON a.id = c.azienda_id ORDER BY r.id")
        vista = [{"chiave": r["chiave"], "nome": r["nome"], "azienda": r["azienda"], "email": r["email"],
                  "testo": r["testo_it"] if lingua == "it" else r["testo_en"], "testo_originale": r["testo_it"],
                  "etichetta_llm": r["etichetta_llm"], "categoria_crm": r["categoria"],
                  "etichetta_studente": r["etichetta_studente"], "optout": bool(r["optout"])} for r in risposte]
        report = {c: sum(1 for r in risposte if r["categoria"] == c) for c in CATEGORIE}
        correzione = crm.impostazione("correzione")
        return {
            "campagna": NOME_CAMPAGNA, "risposte": vista, "report": report, "totale": len(risposte),
            "categorie": [{"id": c["id"], "nome": c["nome"][lingua], "colore": c["colore"], "azione": c["azione"][lingua]}
                          for c in DATI["categorie"]],
            "stazioni": [{"id": s["id"], "nome": s["nome"][lingua]} for s in DATI["stazioni"]],
            "correzioni": [{"id": c["id"], "testo": c["testo"][lingua]} for c in DATI["correzioni"]],
            "stazione": crm.impostazione("stazione") or "", "correzione": correzione or "",
            "rilancio_con": crm.impostazione("rilancio_con"),
            "rilancio_aggiornato": crm.impostazione("rilancio_con") == (correzione or "originale"),
            "posta": [{"a": m["a"], "oggetto": m["oggetto"]} for m in lab.posta.elenco(lab.etichetta_posta)],
            "lista_optout": [r["email"] for r in crm.righe("SELECT email FROM optout ORDER BY email")],
            "attivita": crm.righe("SELECT t.tipo, c.nome || ' ' || c.cognome AS nome FROM attivita t "
                                  "JOIN contatti c ON c.id = t.contatto_id ORDER BY t.id"),
        }

    def azione(self, lab, nome: str, parametri: dict) -> dict:
        crm = lab.crm
        if nome == "etichetta":
            chiave, valore = richiedi(parametri, "risposta", str), richiedi(parametri, "valore", str)
            if valore not in CATEGORIE + [""]:
                raise ErroreFlusso("categoria_non_valida", f"categoria '{valore}' non prevista: {CATEGORIE}")
            if crm.valore("SELECT COUNT(*) FROM risposte WHERE chiave = ?", (chiave,)) != 1:
                raise ErroreFlusso("risposta_inesistente", f"la risposta '{chiave}' non esiste")
            crm.esegui("UPDATE risposte SET etichetta_studente = ? WHERE chiave = ?", (valore, chiave))
            return {"fatto": "etichetta"}
        if nome == "stazione":
            valore = richiedi(parametri, "valore", str)
            if valore not in STAZIONI:
                raise ErroreFlusso("stazione_non_valida", f"stazione '{valore}' non prevista: {STAZIONI}")
            crm.imposta("stazione", valore)
            return {"fatto": "stazione"}
        if nome == "correzione":
            valore = richiedi(parametri, "valore", str)
            if valore not in CORREZIONI:
                raise ErroreFlusso("correzione_non_valida", f"correzione '{valore}' non prevista: {sorted(CORREZIONI)}")
            crm.imposta("correzione", valore)
            return {"fatto": "correzione"}
        if nome == "rilancia":
            self._rilancia(lab)
            return {"fatto": "rilanciata", "email_inviate": len(lab.posta.elenco(lab.etichetta_posta))}
        raise ErroreFlusso("azione_sconosciuta", f"azione '{nome}' non prevista nell'esercizio 3")

    # ------------------------------------------------------------ correzione

    def fotografa(self, lab) -> dict:
        crm = lab.crm
        nascosti = []
        for v in DATI["nascosti"]:
            r = lab.llm.completa([{"role": "system", "content": PROMPT_SISTEMA}, {"role": "user", "content": v["testo"]["it"]}])
            nascosti.append({"chiave": v["chiave"], "etichetta_llm": r["risposta"], "registro": r["chiave"]})
        return {
            "scelte": {"stazione": crm.impostazione("stazione"), "correzione": crm.impostazione("correzione"),
                       "rilancio_con": crm.impostazione("rilancio_con")},
            "risposte": crm.righe("SELECT r.chiave, r.etichetta_llm, r.categoria, r.etichetta_studente, c.email, c.optout "
                                  "FROM risposte r JOIN contatti c ON c.id = r.contatto_id ORDER BY r.id"),
            "lista_optout": [r["email"] for r in crm.righe("SELECT email FROM optout ORDER BY email")],
            "posta": lab.posta.elenco(lab.etichetta_posta),
            "nascosti_llm": nascosti,
            "modello": lab.llm.nome,
        }

    def chiave(self, seme: int) -> dict:
        return {"visibili": {v["chiave"]: {"giusta": v["giusta"], "nome": v["nome"], "testo": v["testo"]["it"]} for v in DATI["visibili"]},
                "nascosti": {v["chiave"]: {"giusta": v["giusta"], "nome": v["nome"], "testo": v["testo"]["it"]} for v in DATI["nascosti"]},
                "stazione_giusta": DATI["stazione_giusta"]}

    def controlli(self) -> list[Controllo]:
        return [
            Controllo("etichette_a_mano", testo("Dati grezzi etichettati a mano", "Raw data labelled by hand"), 15,
                      testo("Leggi il testo del cliente, non l'etichetta dell'LLM. «Richiamatemi a gennaio» è da ricontattare; «toglietemi dalla lista» è una disiscrizione; un messaggio automatico di assenza va a una persona.",
                            "Read the customer's text, not the LLM label. «Call me back in January» is call back later; «take me off the list» is an unsubscribe; an automatic out-of-office message goes to a person."),
                      self._c_etichette),
            Controllo("stazione", testo("Stazione dell'errore", "Station of the bug"), 15,
                      testo("Segui una risposta passo per passo: il testo del cliente è giusto, l'etichetta dell'LLM («Not Interested») è giusta… dove diventa «interessato»?",
                            "Follow one reply step by step: the customer's text is right, the LLM label («Not Interested») is right… where does it become «interested»?"),
                      self._c_stazione),
            Controllo("not_interested_mai_interessato", testo("Nessun «Not Interested» diventa interessato", "No «Not Interested» becomes interested"), 15,
                      testo("Errore bloccante: con la correzione scelta qualche cliente che ha detto no verrebbe passato al commerciale come interessato. Cerca una correzione che non usi «contiene Interested» come prima regola.",
                            "Blocking error: with the chosen fix some customers who said no would be passed to the salesperson as interested. Look for a fix that does not use «contains Interested» as the first rule."),
                      self._c_bloccante, bloccante=True),
            Controllo("accordo_nascosti", testo("La correzione regge su risposte nuove", "The fix holds on new replies"), 20,
                      testo("Una correzione buona sistema anche le risposte che non hai visto: etichette mai viste vanno a una persona e chi chiede la disiscrizione va tolto dalle liste anche se l'LLM sbaglia etichetta.",
                            "A good fix also sorts out replies you have not seen: never-seen labels go to a person and whoever asks to unsubscribe is removed from the lists even if the LLM gets the label wrong."),
                      self._c_accordo),
            Controllo("disiscritti_nel_crm", testo("Chi chiede la disiscrizione ha «non contattare» nel CRM", "Whoever asks to unsubscribe has «do not contact» in the CRM"), 15,
                      testo("La disiscrizione è una regola fissa che vince su qualunque etichetta dell'LLM: dopo il rilancio, nel CRM quelle persone devono avere «non contattare».",
                            "Unsubscribing is a fixed rule that wins over any LLM label: after the new run, those people must have «do not contact» in the CRM."),
                      self._c_optout),
            Controllo("posta_giusta", testo("Seconda email solo agli interessati", "Second email only to interested people"), 15,
                      testo("Guarda «Posta inviata»: la proposta di demo deve arrivare a chi ha detto sì e a nessun altro, mai a chi ha chiesto di non essere contattato.",
                            "Look at «Sent mail»: the demo proposal must reach the people who said yes and nobody else, never anyone who asked not to be contacted."),
                      self._c_posta),
            Controllo("rilancio_aggiornato", testo("Pipeline rilanciata con la correzione scelta", "Pipeline run again with the chosen fix"), 5,
                      testo("Dopo aver scelto (o cambiato) la correzione premi «Applica e rilancia»: CRM e posta devono riflettere la scelta attuale.",
                            "After choosing (or changing) the fix press «Apply and run again»: CRM and mail must reflect the current choice."),
                      self._c_rilancio),
        ]

    # --- helpers
    @staticmethod
    def _regole(ctx) -> dict:
        return regole_di(ctx.foto["scelte"]["correzione"])

    def _conversioni(self, ctx) -> list[dict]:
        """Visibili + nascoste convertite con la correzione scelta (etichette LLM dalla fotografia)."""
        regole = self._regole(ctx)
        out = []
        for r in ctx.foto["risposte"]:
            k = ctx.chiave["visibili"][r["chiave"]]
            out.append({"chiave": r["chiave"], "nome": k["nome"], "llm": r["etichetta_llm"], "giusta": k["giusta"],
                        "categoria": converti(regole, r["etichetta_llm"], k["testo"]), "nascosta": False})
        for r in ctx.foto["nascosti_llm"]:
            k = ctx.chiave["nascosti"][r["chiave"]]
            out.append({"chiave": r["chiave"], "nome": k["nome"], "llm": r["etichetta_llm"], "giusta": k["giusta"],
                        "categoria": converti(regole, r["etichetta_llm"], k["testo"]), "nascosta": True})
        return out

    def _c_etichette(self, ctx) -> Esito:
        att = ctx.chiave["visibili"]
        mancanti = [att[r["chiave"]]["nome"] for r in ctx.foto["risposte"] if not r["etichetta_studente"]]
        sbagliate = [att[r["chiave"]]["nome"] for r in ctx.foto["risposte"]
                     if r["etichetta_studente"] and r["etichetta_studente"] != att[r["chiave"]]["giusta"]]
        n = len(ctx.foto["risposte"])
        giuste = n - len(mancanti) - len(sbagliate)
        minimo = ctx.parametri["accordo_minimo_etichette_mano"]
        if giuste >= minimo:
            return Esito(True, testo(f"Hai etichettato bene {giuste} risposte su {n}.", f"You labelled {giuste} replies out of {n} correctly."))
        extra_it = f" Mancano: {_nomi(mancanti)}." if mancanti else ""
        extra_en = f" Missing: {_nomi(mancanti)}." if mancanti else ""
        return Esito(False, testo(f"Etichette giuste: {giuste} su {n} (ne servono {minimo}). Da rileggere: {_nomi(sbagliate) or '—'}.{extra_it}",
                                  f"Right labels: {giuste} out of {n} ({minimo} needed). Read again: {_nomi(sbagliate) or '—'}.{extra_en}"),
                     frazione=giuste / minimo)

    def _c_stazione(self, ctx) -> Esito:
        scelta = ctx.foto["scelte"]["stazione"]
        if scelta == ctx.chiave["stazione_giusta"]:
            return Esito(True, testo("Giusto: l'errore nasce nella conversione dell'etichetta in categoria del CRM.",
                                     "Right: the bug starts in the conversion of the label into a CRM category."))
        if not scelta:
            return Esito(False, testo("Non hai ancora indicato la stazione dell'errore.", "You have not pointed to the station of the bug yet."))
        return Esito(False, testo(f"Hai indicato «{scelta}», ma lì il dato è ancora giusto (o è già sbagliato da prima).",
                                  f"You pointed to «{scelta}», but there the data is still right (or it was already wrong before)."))

    def _c_bloccante(self, ctx) -> Esito:
        casi = [c for c in self._conversioni(ctx) if c["llm"].strip() == "Not Interested" and c["categoria"] == "interessato"]
        if not casi:
            return Esito(True, testo("Con la correzione scelta nessun «Not Interested» diventa interessato.",
                                     "With the chosen fix no «Not Interested» becomes interested."))
        visibili = [c["nome"] for c in casi if not c["nascosta"]]
        nascosti = sum(1 for c in casi if c["nascosta"])
        return Esito(False, testo(f"{len(casi)} risposte «Not Interested» finirebbero fra gli interessati ({_nomi(visibili) or 'solo fra le nascoste'}; {nascosti} fra le nascoste).",
                                  f"{len(casi)} «Not Interested» replies would end up as interested ({_nomi(visibili) or 'only among the hidden ones'}; {nascosti} among the hidden ones)."))

    def _c_accordo(self, ctx) -> Esito:
        nascoste = [c for c in self._conversioni(ctx) if c["nascosta"]]
        giuste = sum(1 for c in nascoste if c["categoria"] == c["giusta"])
        minimo, n = ctx.parametri["accordo_minimo_nascosti"], len(nascoste)
        if giuste >= minimo:
            return Esito(True, testo(f"Sulle {n} risposte nascoste la tua correzione ne mette {giuste} nella categoria giusta.",
                                     f"On the {n} hidden replies your fix puts {giuste} in the right category."))
        sbagli = {}
        for c in nascoste:
            if c["categoria"] != c["giusta"]:
                sbagli[(c["giusta"], c["categoria"])] = sbagli.get((c["giusta"], c["categoria"]), 0) + 1
        nome = {c["id"]: c["nome"] for c in DATI["categorie"]}
        dett = {l: "; ".join(f"{q}× {nome[g][l]} → {nome[f][l]}" for (g, f), q in sorted(sbagli.items())) for l in ("it", "en")}
        return Esito(False, testo(f"Sulle {n} risposte nascoste solo {giuste} finiscono nella categoria giusta (ne servono {minimo}). Errori: {dett['it']}.",
                                  f"On the {n} hidden replies only {giuste} end up in the right category ({minimo} needed). Mistakes: {dett['en']}."))

    def _c_optout(self, ctx) -> Esito:
        att = ctx.chiave["visibili"]
        lista = set(ctx.foto["lista_optout"])
        persi = [att[r["chiave"]]["nome"] for r in ctx.foto["risposte"]
                 if att[r["chiave"]]["giusta"] == "disiscrizione" and not (r["optout"] and r["email"] in lista)]
        if not persi:
            return Esito(True, testo("Tutti quelli che hanno chiesto la disiscrizione hanno «non contattare» nel CRM.",
                                     "Everyone who asked to unsubscribe has «do not contact» in the CRM."))
        return Esito(False, testo(f"{len(persi)} persone hanno chiesto di non essere più contattate ma nel CRM non risulta: {_nomi(persi)}.",
                                  f"{len(persi)} people asked not to be contacted again but the CRM does not say so: {_nomi(persi)}."))

    def _c_posta(self, ctx) -> Esito:
        if ctx.foto["scelte"]["rilancio_con"] == "originale" and not ctx.foto["posta"]:
            return Esito(False, testo("La seconda email non è ancora partita: scegli la correzione e premi «Applica e rilancia».",
                                      "The second email has not gone out yet: choose the fix and press «Apply and run again»."))
        att = ctx.chiave["visibili"]
        email_di = {r["email"]: att[r["chiave"]] for r in ctx.foto["risposte"]}
        destinatari = {m["a"] for m in ctx.foto["posta"]}
        attesi = {e for e, k in email_di.items() if k["giusta"] == "interessato"}
        di_troppo = sorted(email_di[e]["nome"] if e in email_di else e for e in destinatari - attesi)
        mancati = sorted(email_di[e]["nome"] for e in attesi - destinatari)
        a_disiscritti = sorted(email_di[e]["nome"] for e in destinatari if e in email_di and email_di[e]["giusta"] == "disiscrizione")
        if not di_troppo and not mancati:
            return Esito(True, testo(f"La proposta di demo è partita verso i {len(attesi)} interessati e nessun altro.",
                                     f"The demo proposal went to the {len(attesi)} interested people and nobody else."))
        parti_it, parti_en = [], []
        if a_disiscritti:
            parti_it.append(f"{len(a_disiscritti)} email a chi aveva chiesto di non essere contattato ({_nomi(a_disiscritti)})")
            parti_en.append(f"{len(a_disiscritti)} emails to people who had asked not to be contacted ({_nomi(a_disiscritti)})")
        altri = [n for n in di_troppo if n not in a_disiscritti]
        if altri:
            parti_it.append(f"{len(altri)} email a chi non era interessato ({_nomi(altri)})")
            parti_en.append(f"{len(altri)} emails to people who were not interested ({_nomi(altri)})")
        if mancati:
            parti_it.append(f"{len(mancati)} interessati senza email ({_nomi(mancati)})")
            parti_en.append(f"{len(mancati)} interested people with no email ({_nomi(mancati)})")
        return Esito(False, testo("Posta inviata da rivedere: " + "; ".join(parti_it) + ".", "Sent mail to review: " + "; ".join(parti_en) + "."))

    def _c_rilancio(self, ctx) -> Esito:
        s = ctx.foto["scelte"]
        if not s["correzione"]:
            return Esito(False, testo("Non hai ancora scelto una correzione.", "You have not chosen a fix yet."))
        if s["rilancio_con"] != s["correzione"]:
            return Esito(False, testo("Hai cambiato la correzione ma non hai rilanciato: CRM e posta mostrano ancora la pipeline di prima.",
                                      "You changed the fix but did not run again: CRM and mail still show the previous pipeline."))
        validi = all(r["categoria"] in CATEGORIE for r in ctx.foto["risposte"])
        if not validi:
            raise ErroreDati("esercizio 3: categoria fuori dall'elenco chiuso nel CRM")
        return Esito(True, testo("CRM e posta riflettono la correzione scelta, con categorie dall'elenco chiuso.",
                                 "CRM and mail reflect the chosen fix, with categories from the closed list."))


ESERCIZIO = TrovaErrore()
