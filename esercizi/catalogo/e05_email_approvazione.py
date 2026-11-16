"""Esercizio 5 — «Email con il freno a mano»: regole di marca, campi minimi e approvazione umana (esercizi 5 e 6 del piano).

Stesso lessico della lezione P3.4 «email_marca» (le 6 regole, la checklist del lucchetto, il tranello «approva sempre»).
Lo studente, dal browser:
  1. accende le regole di marca (le istruzioni che arrivano al modello) e sceglie quali campi del lead passargli;
  2. genera le bozze per gli 8 lead in fascia alta (finto-LLM simulato attraverso il registro: stesse istruzioni,
     stessa bozza);
  3. le legge e le approva o le rifiuta: fra queste c'e' una bozza a chi ha chiesto di non essere contattato e una
     che promette uno sconto (il modello lo promette perche' il dato «ultimo contatto» gliene parla);
  4. invia gli approvati (posta finta), poi attiva l'interruttore di emergenza.
Il sistema blocca sempre gli invii verso la lista «non contattare» e lo scrive nel registro. Il correttore guarda le
SCELTE (regole, campi, approvazioni), lo STATO FINALE di bozze, posta e registro, e prova la scheda di marca su 8 lead
nascosti controllando solo proprieta' verificabili delle bozze (lunghezza, nome e azienda, parole vietate, firma,
riga di disiscrizione, nessuno sconto).
"""
from __future__ import annotations

import json
from pathlib import Path

from corso.errori import ErroreFlusso

from ..motore.contratto import Controllo, Esercizio, Esito, testo
from ..motore.esecutore import richiedi

DATI = json.loads((Path(__file__).parent / "dati" / "e05_email.json").read_text(encoding="utf-8"))
REGOLE = [r["id"] for r in DATI["regole_lezione"]]
CAMPI = {c["id"]: c for c in DATI["campi"]}
ORDINE_CAMPI = [c["id"] for c in DATI["campi"]]
SENSIBILI = [c["id"] for c in DATI["campi"] if c["sensibile"]]
COMPITO = "COMPITO: email_marca"
DECISIONI = ("approva", "rifiuta")
MODIFICABILI = ("in_attesa", "approvata", "rifiutata")
EVENTI = ("approvazione", "invio", "blocco_optout", "blocco_interruttore")


def prompt_di(regole: list[str]) -> str:
    return "\n".join([COMPITO, DATI["istruzione_compito"]] + [DATI["regole"][r] for r in REGOLE if r in regole])


def campi_lead(lead: dict, campi: list[str]) -> dict:
    """Solo i campi scelti, in italiano (la lingua dei clienti e del registro)."""
    out = {}
    for c in ORDINE_CAMPI:
        if c in campi:
            v = lead[c]
            out[c] = v["it"] if isinstance(v, dict) else v
    return out


def genera_bozza(llm, regole: list[str], campi: list[str], lead: dict) -> dict:
    return llm.completa([{"role": "system", "content": prompt_di(regole)},
                         {"role": "user", "content": json.dumps(campi_lead(lead, campi), ensure_ascii=False, sort_keys=True)}])


def problemi_bozza(corpo: str, nome: str, azienda: str) -> list[str]:
    """Proprieta' verificabili di una bozza (mai la prosa): codici dei problemi trovati."""
    t = corpo.lower()
    M = DATI["marcatori"]
    out = []
    if len(corpo.split()) > DATI["parole_massime"]:
        out.append("lunga")
    if nome.lower() not in t:
        out.append("senza_nome")
    if azienda.lower() not in t:
        out.append("senza_azienda")
    if any(p.lower() in t for p in DATI["parole_vietate"]):
        out.append("vietate")
    if M["disiscrizione"].lower() not in t:
        out.append("senza_disiscrizione")
    if M["firma"].lower() not in t:
        out.append("senza_firma")
    if any(m.lower() in t for m in M["sconto"]):
        out.append("sconto")
    return out


PROBLEMI = {
    "lunga": testo("troppo lunga", "too long"), "senza_nome": testo("senza il nome", "no name"),
    "senza_azienda": testo("senza l'azienda", "no company"), "vietate": testo("parole vietate", "banned words"),
    "senza_disiscrizione": testo("senza riga di disiscrizione", "no unsubscribe line"), "senza_firma": testo("senza firma", "no signature"),
    "sconto": testo("promette uno sconto", "promises a discount"),
}


def _nomi(voci: list[str], quanti: int = 4) -> str:
    return ", ".join(voci[:quanti]) + ("…" if len(voci) > quanti else "")


class EmailApprovazione(Esercizio):
    numero = 5
    id = "email_approvazione"
    versione = "1.0"
    tipo_area = "email_marca"
    titolo = testo("Email con il freno a mano: regole di marca e approvazione", "Emails with the handbrake on: brand rules and approval")
    sottotitolo = testo(
        "L'agente scrive le prime email agli 8 lead più caldi. Tu decidi le regole di marca, che cosa può leggere della scheda e quali email partono davvero.",
        "The agent writes the first emails to the 8 hottest leads. You decide the brand rules, what it may read from the record and which emails really go out.")
    consegna = [
        testo("Accendi le regole di marca che l'agente deve seguire (sono le stesse della lezione «scrivere l'email giusta»).",
              "Switch on the brand rules the agent must follow (the same as in the lesson «writing the right email»)."),
        testo("Scegli quali campi della scheda passare al modello: solo quelli che servono a scrivere l'email.",
              "Choose which record fields to pass to the model: only the ones needed to write the email."),
        testo("Premi «Genera le bozze» e leggi ogni bozza con la checklist: approva quelle in regola, rifiuta le altre. Puoi cambiare regole e campi e rigenerare.",
              "Press «Generate the drafts» and read each draft with the checklist: approve the ones that are fine, reject the others. You can change rules and fields and generate again."),
        testo("Premi «Invia gli approvati»: un'email partita non si ritira. Lascia spento «Approva sempre».",
              "Press «Send the approved ones»: an email that has gone out cannot be recalled. Leave «Always approve» off."),
        testo("Alla fine attiva l'interruttore di emergenza «Ferma tutti gli agenti» e premi «Verifica». Il correttore prova la tua scheda di marca anche su 8 lead che non vedi.",
              "At the end switch on the emergency switch «Stop all agents» and press «Check». The grader also tries your brand sheet on 8 leads you cannot see."),
    ]

    # ------------------------------------------------------------ setup

    def prepara(self, lab) -> None:
        crm = lab.crm
        for k, l in enumerate(DATI["visibili"]):
            crm.esegui("INSERT INTO aziende (id, nome, settore, dimensione) VALUES (?, ?, 'servizi', NULL)", (k + 1, l["azienda"]))
            crm.esegui("INSERT INTO contatti (id, nome, cognome, email, ruolo, azienda_id, optout, fascia) VALUES (?, ?, ?, ?, ?, ?, ?, 'High')",
                       (k + 1, l["nome"], l["cognome"], l["email"], l["ruolo"]["it"], k + 1, int(l["optout"])))
            if l["optout"]:
                crm.esegui("INSERT INTO optout (email, motivo) VALUES (?, 'richiesta del cliente')", (l["email"],))
        crm.imposta("regole", [r for r in REGOLE if r in DATI["regole_iniziali"]])
        crm.imposta("campi", [c for c in ORDINE_CAMPI if c in DATI["campi_iniziali"]])
        crm.imposta("approva_sempre", False)
        crm.imposta("interruttore", False)
        crm.imposta("generazione", None)

    # ------------------------------------------------------------ dati comodi

    @staticmethod
    def _lead_di(contatto_id: int) -> dict:
        return DATI["visibili"][contatto_id - 1]

    @staticmethod
    def _evento(crm, azione: str, dettagli: dict) -> int:
        return crm.esegui("INSERT INTO registro_audit (azione, dettagli) VALUES (?, ?)",
                          (azione, json.dumps(dettagli, ensure_ascii=False, sort_keys=True)))

    @staticmethod
    def _eventi(crm) -> list[dict]:
        segnaposto = ",".join("?" * len(EVENTI))
        return [{"id": r["id"], "azione": r["azione"], **json.loads(r["dettagli"])}
                for r in crm.righe(f"SELECT * FROM registro_audit WHERE azione IN ({segnaposto}) ORDER BY id", EVENTI)]

    # ------------------------------------------------------------ area di lavoro

    def area(self, lab, lingua: str) -> dict:
        crm = lab.crm
        regole, campi = crm.impostazione("regole"), crm.impostazione("campi")
        bozze = []
        for b in crm.righe("SELECT * FROM bozze ORDER BY contatto_id"):
            l = self._lead_di(b["contatto_id"])
            bozze.append({"id": b["id"], "nome": f"{l['nome']} {l['cognome']}", "email": l["email"], "azienda": l["azienda"],
                          "optout": l["optout"], "oggetto": b["oggetto"], "corpo": b["corpo"], "stato": b["stato"],
                          "approvato_da": b["approvato_da"]})
        return {
            "regole": [{"id": r["id"], "nome": r["nome"][lingua], "effetto": r["effetto"][lingua], "acceso": r["id"] in regole}
                       for r in DATI["regole_lezione"]],
            "campi": [{"id": c["id"], "nome": c["nome"][lingua], "sensibile": c["sensibile"], "acceso": c["id"] in campi}
                      for c in DATI["campi"]],
            "sensibili_accesi": [CAMPI[c]["nome"][lingua] for c in campi if c in SENSIBILI],
            "lead": [{"nome": f"{l['nome']} {l['cognome']}", "azienda": l["azienda"], "ruolo": l["ruolo"][lingua],
                      "ultimo": l["ultimo"][lingua], "optout": l["optout"]} for l in DATI["visibili"]],
            "checklist": [c[lingua] for c in DATI["checklist"]],
            "bozze": bozze, "generate": bool(bozze),
            "generazione_aggiornata": crm.impostazione("generazione") == {"regole": regole, "campi": campi},
            "approva_sempre": crm.impostazione("approva_sempre"), "interruttore": crm.impostazione("interruttore"),
            "posta": [{"a": m["a"], "oggetto": m["oggetto"]} for m in lab.posta.elenco(lab.etichetta_posta)],
            "registro": [{k: v for k, v in e.items() if k != "id"} for e in self._eventi(crm) if e["azione"] != "approvazione"],
            "lista_optout": [r["email"] for r in crm.righe("SELECT email FROM optout ORDER BY email")],
        }

    def azione(self, lab, nome: str, parametri: dict) -> dict:
        crm = lab.crm
        if nome == "regola":
            rid, acceso = richiedi(parametri, "regola", str), richiedi(parametri, "acceso", bool)
            if rid not in REGOLE:
                raise ErroreFlusso("regola_inesistente", f"la regola '{rid}' non esiste: {REGOLE}")
            att = set(crm.impostazione("regole"))
            crm.imposta("regole", [r for r in REGOLE if r in (att | {rid} if acceso else att - {rid})])
            return {"fatto": "regola"}
        if nome == "campo":
            cid, acceso = richiedi(parametri, "campo", str), richiedi(parametri, "acceso", bool)
            if cid not in CAMPI:
                raise ErroreFlusso("campo_inesistente", f"il campo '{cid}' non esiste: {ORDINE_CAMPI}")
            att = set(crm.impostazione("campi"))
            crm.imposta("campi", [c for c in ORDINE_CAMPI if c in (att | {cid} if acceso else att - {cid})])
            return {"fatto": "campo"}
        if nome == "genera":
            if crm.impostazione("interruttore"):
                raise ErroreFlusso("agenti_fermi", "l'interruttore di emergenza è acceso: l'agente non scrive bozze")
            regole, campi = crm.impostazione("regole"), crm.impostazione("campi")
            fisse = {r["contatto_id"] for r in crm.righe("SELECT contatto_id FROM bozze WHERE stato NOT IN ('in_attesa', 'approvata', 'rifiutata')")}
            crm.esegui("DELETE FROM bozze WHERE stato IN ('in_attesa', 'approvata', 'rifiutata')")
            for k, l in enumerate(DATI["visibili"]):
                if k + 1 in fisse:
                    continue  # gia' partita (o bloccata): un'email inviata non si riscrive
                r = genera_bozza(lab.llm, regole, campi, l)
                crm.esegui("INSERT INTO bozze (contatto_id, oggetto, corpo, registro) VALUES (?, ?, ?, ?)",
                           (k + 1, DATI["oggetto"].format(azienda=l["azienda"]), r["risposta"], r["chiave"]))
            crm.imposta("generazione", {"regole": regole, "campi": campi})
            return {"fatto": "generate"}
        if nome == "decidi":
            bid, decisione = richiedi(parametri, "bozza", int), richiedi(parametri, "decisione", str)
            if decisione not in DECISIONI:
                raise ErroreFlusso("decisione_non_valida", f"decisione '{decisione}' non prevista: {list(DECISIONI)}")
            b = crm.riga("SELECT * FROM bozze WHERE id = ?", (bid,))
            if b is None:
                raise ErroreFlusso("bozza_inesistente", f"la bozza {bid} non esiste")
            if b["stato"] not in MODIFICABILI:
                raise ErroreFlusso("bozza_chiusa", f"la bozza {bid} è già '{b['stato']}': non si può più cambiare")
            stato = "approvata" if decisione == "approva" else "rifiutata"
            n = self._evento(crm, "approvazione", {"bozza": bid, "decisione": stato, "da": DATI["approvatore_umano"]})
            crm.esegui("UPDATE bozze SET stato = ?, approvato_da = ?, approvazione = ? WHERE id = ?",
                       (stato, DATI["approvatore_umano"] if stato == "approvata" else "", n if stato == "approvata" else None, bid))
            return {"fatto": stato}
        if nome in ("approva_sempre", "interruttore"):
            crm.imposta(nome, richiedi(parametri, "valore", bool))
            return {"fatto": nome}
        if nome == "invia":
            return self._invia(lab)
        raise ErroreFlusso("azione_sconosciuta", f"azione '{nome}' non prevista nell'esercizio 5")

    def _invia(self, lab) -> dict:
        crm = lab.crm
        sempre = crm.impostazione("approva_sempre")
        stati = ("approvata", "in_attesa") if sempre else ("approvata",)
        candidate = [b for b in crm.righe("SELECT * FROM bozze ORDER BY contatto_id") if b["stato"] in stati]
        if crm.impostazione("interruttore"):
            self._evento(crm, "blocco_interruttore", {"bozze": [b["id"] for b in candidate]})
            return {"fatto": "fermo", "inviate": 0}
        inviate = bloccate = 0
        for b in candidate:
            l = self._lead_di(b["contatto_id"])
            if b["stato"] == "in_attesa":  # solo con «approva sempre»: nessuno l'ha letta
                crm.esegui("UPDATE bozze SET approvato_da = ? WHERE id = ?", (DATI["approvatore_automatico"], b["id"]))
                b = {**b, "approvato_da": DATI["approvatore_automatico"], "approvazione": None}
            in_lista = crm.valore("SELECT COUNT(*) FROM optout WHERE email = ?", (l["email"],))
            if in_lista:
                crm.esegui("UPDATE bozze SET stato = 'bloccata' WHERE id = ?", (b["id"],))
                self._evento(crm, "blocco_optout", {"bozza": b["id"], "a": l["email"]})
                bloccate += 1
                continue
            lab.posta.invia(lab.etichetta_posta, l["email"], b["oggetto"], b["corpo"])
            crm.esegui("UPDATE bozze SET stato = 'inviata' WHERE id = ?", (b["id"],))
            self._evento(crm, "invio", {"bozza": b["id"], "a": l["email"], "approvato_da": b["approvato_da"],
                                        "approvazione": b["approvazione"]})
            inviate += 1
        return {"fatto": "inviate", "inviate": inviate, "bloccate": bloccate}

    # ------------------------------------------------------------ correzione

    def fotografa(self, lab) -> dict:
        crm = lab.crm
        regole, campi = crm.impostazione("regole"), crm.impostazione("campi")
        nascoste = []
        for l in DATI["nascosti"]:
            r = genera_bozza(lab.llm, regole, campi, l)
            nascoste.append({"id": l["id"], "corpo": r["risposta"], "registro": r["chiave"]})
        bozze = [{"a": self._lead_di(b["contatto_id"])["email"], "id": b["id"], "stato": b["stato"], "corpo": b["corpo"],
                  "approvato_da": b["approvato_da"], "approvazione": b["approvazione"]}
                 for b in crm.righe("SELECT * FROM bozze ORDER BY contatto_id")]
        interruttore = crm.impostazione("interruttore")
        return {
            "regole": regole, "campi": campi, "generazione": crm.impostazione("generazione"),
            "approva_sempre": crm.impostazione("approva_sempre"), "interruttore": interruttore,
            # invio automatico simulato dal correttore: passa solo se l'interruttore e' spento (nessun effetto reale)
            "tentativo_automatico": "rifiutato" if interruttore else "eseguito",
            "bozze": bozze, "posta": lab.posta.elenco(lab.etichetta_posta), "eventi": self._eventi(crm),
            "nascoste": nascoste, "modello": lab.llm.nome,
        }

    def chiave(self, seme: int) -> dict:
        return {"visibili": {l["email"]: {"nome": l["nome"], "cognome": l["cognome"], "azienda": l["azienda"], "optout": l["optout"]}
                             for l in DATI["visibili"]},
                "nascosti": {l["id"]: {"nome": l["nome"], "cognome": l["cognome"], "azienda": l["azienda"]} for l in DATI["nascosti"]},
                "sensibili": SENSIBILI, "regole": REGOLE, "umano": DATI["approvatore_umano"]}

    def controlli(self) -> list[Controllo]:
        return [
            Controllo("regole_marca", testo("Le 6 regole di marca sono accese", "The 6 brand rules are on"), 10,
                      testo("Tono, parole vietate, niente sconti, ogni frase da un dato, riga di disiscrizione, firma: senza una di queste l'email esce fuori marca.",
                            "Tone, banned words, no discounts, every sentence from data, unsubscribe line, signature: without one of them the email goes out off-brand."),
                      self._c_regole),
            Controllo("campi_minimi", testo("Al modello solo i campi che servono", "Only the fields that are needed go to the model"), 25,
                      testo("Togli la spunta a telefono e note private: non servono a scrivere l'email e, una volta dentro il prompt, possono finire nel testo inviato al cliente. Poi rigenera le bozze.",
                            "Untick phone and private notes: they are not needed to write the email and, once inside the prompt, they can end up in the text sent to the customer. Then generate the drafts again."),
                      self._c_campi),
            Controllo("bozze_nascoste", testo("La scheda di marca regge su lead nuovi", "The brand sheet holds on new leads"), 15,
                      testo("Sui lead nascosti ogni bozza deve avere nome e azienda, firma e riga di disiscrizione, al massimo 150 parole, nessuna parola vietata e nessuno sconto: accendi tutte le regole e passa nome, azienda e ultimo contatto.",
                            "On the hidden leads every draft must have name and company, signature and unsubscribe line, at most 150 words, no banned word and no discount: switch on all the rules and pass name, company and last contact."),
                      self._c_nascoste),
            Controllo("sconto_fermato", testo("Nessuna promessa di sconto è partita", "No discount promise went out"), 10,
                      testo("Errore bloccante: una email partita prometteva uno sconto che solo una persona autorizzata può decidere. Leggi ogni bozza prima di approvarla e non usare «Approva sempre».",
                            "Blocking error: an email that went out promised a discount only an authorised person can decide. Read every draft before approving it and do not use «Always approve»."),
                      self._c_sconto, bloccante=True),
            Controllo("posta_giusta", testo("Partono esattamente le bozze in regola", "Exactly the drafts that are fine go out"), 20,
                      testo("Approva e invia le bozze in regola (nome, azienda, firma, disiscrizione, niente parole vietate né sconti) e solo quelle. Il controllo serve, ma non a bloccare tutto.",
                            "Approve and send the drafts that are fine (name, company, signature, unsubscribe line, no banned words or discounts) and only those. The check is useful, but not to block everything."),
                      self._c_posta),
            Controllo("optout_protetto", testo("Nessuna email a chi ha chiesto di non essere contattato", "No email to anyone who asked not to be contacted"), 10,
                      testo("Chi è nella lista «non contattare» non riceve email, anche se qualcuno approva la bozza: il blocco deve comparire nel registro.",
                            "Anyone on the «do not contact» list receives no email, even if someone approves the draft: the block must appear in the log."),
                      self._c_optout),
            Controllo("registro_invii", testo("Ogni invio ha chi l'ha approvato e quando", "Every send records who approved it and when"), 5,
                      testo("Ogni email partita deve avere nel registro l'approvazione di una persona. Con «Approva sempre» nessuno l'ha letta.",
                            "Every email sent must have a person's approval in the log. With «Always approve» nobody read it."),
                      self._c_registro),
            Controllo("interruttore", testo("L'interruttore di emergenza ferma gli invii automatici", "The emergency switch stops automatic sends"), 5,
                      testo("Attiva «Ferma tutti gli agenti»: il correttore prova un invio automatico e deve essere rifiutato.",
                            "Switch on «Stop all agents»: the grader tries an automatic send and it must be refused."),
                      self._c_interruttore),
        ]

    # --- helpers
    def _visibili_con_problemi(self, ctx) -> list[dict]:
        out = []
        for b in ctx.foto["bozze"]:
            k = ctx.chiave["visibili"][b["a"]]
            out.append({**b, "nome": f"{k['nome']} {k['cognome']}", "optout": k["optout"],
                        "problemi": problemi_bozza(b["corpo"], k["nome"], k["azienda"])})
        return out

    def _c_regole(self, ctx) -> Esito:
        spente = [r for r in ctx.chiave["regole"] if r not in ctx.foto["regole"]]
        n = len(ctx.chiave["regole"])
        if not spente:
            return Esito(True, testo("Tutte le 6 regole di marca sono accese.", "All 6 brand rules are on."))
        return Esito(False, testo(f"Regole spente: {', '.join(spente)}.", f"Rules switched off: {', '.join(spente)}."),
                     frazione=(n - len(spente)) / n)

    def _c_campi(self, ctx) -> Esito:
        ora = [c for c in ctx.foto["campi"] if c in ctx.chiave["sensibili"]]
        gen = ctx.foto["generazione"]
        prima = [c for c in (gen["campi"] if gen else []) if c in ctx.chiave["sensibili"]]
        if not ora and not prima:
            return Esito(True, testo("Telefono e note private non arrivano al modello.", "Phone and private notes do not reach the model."))
        it = {"telefono": "telefono", "note_private": "note private"}
        en = {"telefono": "phone", "note_private": "private notes"}
        tutti = sorted(set(ora) | set(prima))
        dove_it = "nella scheda attuale" if ora else "nelle bozze generate (rigenerale)"
        dove_en = "in the current settings" if ora else "in the generated drafts (generate them again)"
        return Esito(False, testo(f"Al modello arrivano dati che non servono ({', '.join(it[c] for c in tutti)}) {dove_it}.",
                                  f"Data that is not needed reaches the model ({', '.join(en[c] for c in tutti)}) {dove_en}."))

    def _c_nascoste(self, ctx) -> Esito:
        minimo = ctx.parametri["bozze_nascoste_minime"]
        problemi = {}
        buone = 0
        for b in ctx.foto["nascoste"]:
            k = ctx.chiave["nascosti"][b["id"]]
            p = problemi_bozza(b["corpo"], k["nome"], k["azienda"])
            buone += not p
            for x in p:
                problemi[x] = problemi.get(x, 0) + 1
        n = len(ctx.foto["nascoste"])
        if buone >= minimo:
            return Esito(True, testo(f"Tutte le {n} bozze sui lead nascosti sono in regola.", f"All {n} drafts on the hidden leads are fine."))
        dett = {l: ", ".join(f"{q}× {PROBLEMI[x][l]}" for x, q in sorted(problemi.items())) for l in ("it", "en")}
        return Esito(False, testo(f"Bozze in regola sui lead nascosti: {buone} su {n} ({dett['it']}).",
                                  f"Drafts that are fine on the hidden leads: {buone} out of {n} ({dett['en']})."), frazione=buone / minimo)

    def _c_sconto(self, ctx) -> Esito:
        M = [m.lower() for m in DATI["marcatori"]["sconto"]]
        partite = sorted({m["a"] for m in ctx.foto["posta"] if any(x in m["corpo"].lower() for x in M)})
        if not partite:
            return Esito(True, testo("Nessuna email partita promette uno sconto.", "No email that went out promises a discount."))
        nomi = [f"{ctx.chiave['visibili'][a]['nome']} {ctx.chiave['visibili'][a]['cognome']}" if a in ctx.chiave["visibili"] else a for a in partite]
        return Esito(False, testo(f"È partita una promessa di sconto verso {_nomi(nomi)}: ora è nella casella di un cliente vero.",
                                  f"A discount promise went out to {_nomi(nomi)}: it is now in a real customer's inbox."))

    def _c_posta(self, ctx) -> Esito:
        bozze = self._visibili_con_problemi(ctx)
        if not bozze:
            return Esito(False, testo("Nessuna bozza generata: premi «Genera le bozze».", "No draft generated: press «Generate the drafts»."))
        attesi = {b["a"] for b in bozze if not b["problemi"] and not b["optout"]}
        if not attesi:
            return Esito(False, testo("Nessuna bozza è in regola: sistema regole e campi e rigenera.", "No draft is fine: fix rules and fields and generate again."))
        partiti = {m["a"] for m in ctx.foto["posta"]}
        nome = {b["a"]: b["nome"] for b in bozze}
        di_troppo = sorted(nome.get(a, a) for a in partiti - attesi)
        mancati = sorted(nome[a] for a in attesi - partiti)
        if not di_troppo and not mancati:
            return Esito(True, testo(f"Sono partite le {len(attesi)} bozze in regola, e nessun'altra.", f"The {len(attesi)} drafts that are fine went out, and no other."))
        parti_it, parti_en = [], []
        if di_troppo:
            parti_it.append(f"partite bozze con problemi ({_nomi(di_troppo)})")
            parti_en.append(f"drafts with problems went out ({_nomi(di_troppo)})")
        if mancati:
            parti_it.append(f"bozze in regola mai partite ({_nomi(mancati)})")
            parti_en.append(f"drafts that were fine never went out ({_nomi(mancati)})")
        return Esito(False, testo("Posta da rivedere: " + "; ".join(parti_it) + ".", "Mail to review: " + "; ".join(parti_en) + "."))

    def _c_optout(self, ctx) -> Esito:
        optout = {a for a, k in ctx.chiave["visibili"].items() if k["optout"]}
        verso = sorted(m["a"] for m in ctx.foto["posta"] if m["a"] in optout)
        if verso:
            return Esito(False, testo(f"Sono partite email verso la lista «non contattare»: {_nomi(verso)}.",
                                      f"Emails went out to the «do not contact» list: {_nomi(verso)}."))
        bloccate = {e["bozza"] for e in ctx.foto["eventi"] if e["azione"] == "blocco_optout"}
        senza_traccia = [b for b in ctx.foto["bozze"] if b["a"] in optout and b["stato"] == "bloccata" and b["id"] not in bloccate]
        if senza_traccia:
            return Esito(False, testo("Una bozza verso la lista «non contattare» risulta bloccata ma il blocco non è nel registro.",
                                      "A draft to the «do not contact» list is blocked but the block is not in the log."))
        if any(b["a"] in optout and b["stato"] == "bloccata" for b in ctx.foto["bozze"]):
            return Esito(True, testo("Hai approvato una bozza per chi non vuole essere contattato, ma il sistema l'ha fermata e l'ha scritto nel registro.",
                                     "You approved a draft for someone who does not want to be contacted, but the system stopped it and wrote it in the log."))
        return Esito(True, testo("Nessuna email verso la lista «non contattare».", "No email to the «do not contact» list."))

    def _c_registro(self, ctx) -> Esito:
        invii = [e for e in ctx.foto["eventi"] if e["azione"] == "invio"]
        if not invii:
            return Esito(False, testo("Nel registro non c'è nessun invio.", "There is no send in the log."))
        approvazioni = {e["id"] for e in ctx.foto["eventi"] if e["azione"] == "approvazione" and e["decisione"] == "approvata"}
        senza = [e["a"] for e in invii if e["approvato_da"] != ctx.chiave["umano"] or e["approvazione"] not in approvazioni]
        if senza or len(invii) != len(ctx.foto["posta"]):
            return Esito(False, testo(f"{len(senza)} invii senza l'approvazione di una persona nel registro.",
                                      f"{len(senza)} sends without a person's approval in the log."))
        return Esito(True, testo(f"Tutti i {len(invii)} invii hanno nel registro l'approvazione di una persona.",
                                 f"All {len(invii)} sends have a person's approval in the log."))

    def _c_interruttore(self, ctx) -> Esito:
        if ctx.foto["tentativo_automatico"] == "rifiutato":
            return Esito(True, testo("Con l'interruttore acceso il tentativo di invio automatico è stato rifiutato.",
                                     "With the switch on the automatic send attempt was refused."))
        return Esito(False, testo("L'interruttore di emergenza è spento: il tentativo di invio automatico è passato.",
                                  "The emergency switch is off: the automatic send attempt went through."))


ESERCIZIO = EmailApprovazione()
