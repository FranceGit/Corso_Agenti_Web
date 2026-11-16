"""Esercizio 1 — «Il mio primo CRM»: pulire i lead (duplicati, campi rotti, disiscritti da rispettare).

Dati: 25 righe importate = 22 persone + 3 doppioni. Difetti voluti (piano, esercizio 1): 3 duplicati, 2 email
malformate, 1 azienda senza dimensione; in piu' 2 persone disiscritte, una delle quali con il «non contattare»
scritto SOLO sulla riga doppia (se si tiene l'altra riga e non lo si riporta, il no del cliente va perso).
Ogni studente riceve una variante (persone e posizioni diverse) generata in modo deterministico dal suo seme.
"""
from __future__ import annotations

import random
import re
import unicodedata

from corso.errori import ErroreFlusso

from ..motore.contratto import Controllo, Esercizio, Esito, testo
from ..motore.esecutore import richiedi

RE_EMAIL = re.compile(r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$")
SEGMENTI = ["PMI", "Mid-market", "Enterprise"]

NOMI = ["Marco", "Giulia", "Luca", "Sara", "Paolo", "Elena", "Andrea", "Chiara", "Matteo", "Francesca",
        "Davide", "Valentina", "Simone", "Federica", "Stefano", "Martina", "Alessio", "Silvia", "Roberto",
        "Laura", "Giorgio", "Anna", "Fabio", "Irene", "Nicola", "Beatrice", "Claudio", "Marta"]
COGNOMI = ["Rossi", "Bianchi", "Ferri", "Costa", "Greco", "Galli", "Conti", "Marino", "Fontana", "Moretti",
           "Barbieri", "Lombardi", "Rinaldi", "Caruso", "Ferrara", "Testa", "Villa", "Serra", "Mancini",
           "Gentile", "Longo", "Leone", "Martini", "Vitale", "Sala", "De Luca", "Pellegrini", "Fabbri"]
AZIENDE = [("Ottica Sole", "retail"), ("Pasticceria Dolce Vita", "ristorazione"), ("Studio Verde", "servizi"),
           ("Palestra Forma", "servizi"), ("Agenzia Viaggi Mare", "turismo"), ("ShopModa", "ecommerce"),
           ("CasaVerde Online", "ecommerce"), ("Logica Software", "software"), ("Trasporti Alpini", "logistica"),
           ("Banca del Borgo", "finanza"), ("Meccanica Padana", "manifattura"), ("Nuvola Dati", "software"),
           ("Gruppo Alimentare Sud", "manifattura"), ("Ferramenta Rapida", "retail"), ("Clinica San Luca", "sanita")]
# Dimensioni delle 12 aziende con dimensione nota: anche i valori al confine (50/51, 500/501) per far leggere la regola.
DIMENSIONI = [8, 23, 50, 51, 140, 500, 501, 900, 2400, 35, 260, 75]
RUOLI = ["Responsabile marketing", "Titolare", "Direttore commerciale", "Marketing manager", "CEO",
         "Responsabile acquisti", "Direttrice operativa", "Specialista CRM", "Office manager", "CTO"]
TIPI_ATTIVITA = [("chiamata", "Prima telefonata di presentazione"), ("email", "Inviata la brochure"),
                 ("riunione", "Demo online di 20 minuti"), ("nota", "Interessato al piano annuale")]

N_PERSONE = 22
N_DUPLICATI = 3


def segmento_atteso(dimensione: int | None) -> str | None:
    if dimensione is None:
        return None
    if dimensione <= 50:
        return "PMI"
    if dimensione <= 500:
        return "Mid-market"
    return "Enterprise"


def _ascii(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", s.lower())


def genera(seme: int) -> dict:
    """Variante deterministica: righe del CRM + chiave di correzione. Stesso seme, stessi dati."""
    rng = random.Random(seme)
    nomi = rng.sample(NOMI, N_PERSONE)
    cognomi = rng.sample(COGNOMI, N_PERSONE)
    scelte_aziende = rng.sample(AZIENDE, 13)
    dimensioni = DIMENSIONI[:]
    rng.shuffle(dimensioni)
    aziende = []
    for i, (nome, settore) in enumerate(scelte_aziende):
        aziende.append({"id": i + 1, "nome": nome, "settore": settore,
                        "dimensione": dimensioni[i] if i < 12 else None,
                        "dominio": _ascii(nome) + ".it"})
    # l'azienda senza dimensione (la 13a) ha un solo contatto; le altre 21 persone sulle 12 aziende note
    aziende_persona = [aziende[12]] + [aziende[i % 12] for i in range(N_PERSONE - 1)]
    persone = []
    for i in range(N_PERSONE):
        az = aziende_persona[i]
        email = f"{_ascii(nomi[i])}.{_ascii(cognomi[i])}@{az['dominio']}"
        persone.append({"p": i, "nome": nomi[i], "cognome": cognomi[i], "email": email, "azienda": az,
                        "ruolo": RUOLI[rng.randrange(len(RUOLI))]})
    # ruoli dei difetti (indici di persona, mai sovrapposti tranne optout+duplicato voluto)
    altri = list(range(1, N_PERSONE))  # la persona 0 e' quella dell'azienda senza dimensione
    rng.shuffle(altri)
    duplicati, malformate, optout_solo = altri[0:3], altri[3:5], altri[5]
    optout_duplicato = duplicati[0]
    righe = []
    for pers in persone:
        email_grezza = pers["email"]
        if pers["p"] == malformate[0]:
            email_grezza = email_grezza.replace("@", "@@")
        elif pers["p"] == malformate[1]:
            email_grezza = email_grezza.replace("@", "(at)")
        righe.append({"p": pers["p"], "doppione": False, "nome": pers["nome"], "cognome": pers["cognome"],
                      "email": email_grezza, "optout": pers["p"] == optout_solo})
    varianti = [
        lambda r: {**r, "cognome": r["cognome"].upper(), "email": r["email"].upper()},
        lambda r: {**r, "nome": r["nome"][0] + "."},
        lambda r: {**r, "email": r["email"].replace(".", "_", 1)},
    ]
    for k, p in enumerate(duplicati):
        base = next(r for r in righe if r["p"] == p and not r["doppione"])
        doppia = varianti[k](dict(base))
        doppia.update({"doppione": True, "optout": p == optout_duplicato})
        righe.append(doppia)
    rng.shuffle(righe)
    attivita = []
    for i, r in enumerate(righe):
        r["id"] = i + 1
        pers = persone[r["p"]]
        r["azienda_id"], r["ruolo"] = pers["azienda"]["id"], pers["ruolo"]
        tipo, nota = TIPI_ATTIVITA[rng.randrange(len(TIPI_ATTIVITA))]
        attivita.append({"id": len(attivita) + 1, "contatto_id": r["id"], "tipo": tipo, "nota": nota})
    chiave_persone = []
    for pers in persone:
        ids = sorted(r["id"] for r in righe if r["p"] == pers["p"])
        chiave_persone.append({
            "p": pers["p"], "ids": ids, "nome": f"{pers['nome']} {pers['cognome']}", "email": pers["email"],
            "segmento": segmento_atteso(pers["azienda"]["dimensione"]),
            "da_completare": pers["azienda"]["dimensione"] is None,
            "optout": pers["p"] in (optout_solo, optout_duplicato),
            "duplicato": pers["p"] in duplicati, "malformata": pers["p"] in malformate,
            "attivita": sorted(a["id"] for a in attivita if a["contatto_id"] in ids),
        })
    return {"aziende": aziende, "righe": righe, "attivita": attivita,
            "optout": sorted({persone[p]["email"] for p in (optout_solo, optout_duplicato)}),
            "chiave": {"persone": chiave_persone, "attivi_attesi": N_PERSONE}}


def _nomi(voci: list[str], quanti: int = 4) -> str:
    return ", ".join(voci[:quanti]) + ("…" if len(voci) > quanti else "")


class PuliziaLead(Esercizio):
    numero = 1
    id = "pulizia_lead"
    versione = "1.0"
    tipo_area = "tabella_lead"
    titolo = testo("Il mio primo CRM: ripulire i lead", "My first CRM: cleaning the leads")
    sottotitolo = testo(
        "25 lead appena importati, con difetti veri: doppioni, email rotte, un'azienda senza dimensione e clienti che hanno detto «non scrivetemi».",
        "25 freshly imported leads with real defects: duplicates, broken emails, a company with no size and customers who said «do not write to me».")
    consegna = [
        testo("Trova i 3 doppioni (stessa persona scritta due volte) e UNISCILI: le attività di entrambe le righe devono restare.",
              "Find the 3 duplicates (the same person written twice) and MERGE them: the activities of both rows must stay."),
        testo("Correggi le 2 email scritte male (non escludere quelle persone: sono lead buoni).",
              "Fix the 2 badly written emails (do not exclude those people: they are good leads)."),
        testo("Assegna a ogni contatto il segmento in base alla dimensione dell'azienda: 1–50 persone PMI, 51–500 Mid-market, oltre 500 Enterprise.",
              "Give every contact the segment based on company size: 1–50 people SME (PMI), 51–500 Mid-market, over 500 Enterprise."),
        testo("Se un'azienda non ha la dimensione, non inventarla: segna il contatto «da completare» e lascialo attivo.",
              "If a company has no size, do not make it up: mark the contact «to complete» and keep it active."),
        testo("Rispetta i disiscritti: chi ha chiesto di non essere contattato deve restare nel CRM con il «non contattare» acceso, anche dopo un'unione.",
              "Respect the unsubscribed: whoever asked not to be contacted must stay in the CRM with «do not contact» on, even after a merge."),
        testo("Quando hai finito premi «Verifica».", "When you are done press «Check»."),
    ]

    # ------------------------------------------------------------ setup

    def prepara(self, lab) -> None:
        dati = genera(lab.seme)
        crm = lab.crm
        crm.esegui_molti("INSERT INTO aziende (id, nome, settore, dimensione) VALUES (?, ?, ?, ?)",
                         [(a["id"], a["nome"], a["settore"], a["dimensione"]) for a in dati["aziende"]])
        crm.esegui_molti("INSERT INTO contatti (id, nome, cognome, email, ruolo, azienda_id, optout) VALUES (?, ?, ?, ?, ?, ?, ?)",
                         [(r["id"], r["nome"], r["cognome"], r["email"], r["ruolo"], r["azienda_id"], int(r["optout"]))
                          for r in sorted(dati["righe"], key=lambda r: r["id"])])
        crm.esegui_molti("INSERT INTO attivita (id, contatto_id, tipo, nota) VALUES (?, ?, ?, ?)",
                         [(a["id"], a["contatto_id"], a["tipo"], a["nota"]) for a in dati["attivita"]])
        crm.esegui_molti("INSERT INTO optout (email, motivo) VALUES (?, ?)",
                         [(e, "richiesta del cliente") for e in dati["optout"]])

    # ------------------------------------------------------------ area di lavoro

    def area(self, lab, lingua: str) -> dict:
        righe = lab.crm.righe(
            "SELECT c.id, c.nome, c.cognome, c.email, c.ruolo, c.segmento, c.stato, c.unito_in, c.da_completare, "
            "c.optout, a.nome AS azienda, a.settore, a.dimensione, "
            "(SELECT COUNT(*) FROM attivita t WHERE t.contatto_id = c.id) AS attivita "
            "FROM contatti c JOIN aziende a ON a.id = c.azienda_id ORDER BY c.id")
        for r in righe:
            r["email_valida"] = bool(RE_EMAIL.match(r["email"]))
            r["da_completare"], r["optout"] = bool(r["da_completare"]), bool(r["optout"])
        stati = [r["stato"] for r in righe]
        return {
            "righe": righe, "segmenti": SEGMENTI,
            "lista_optout": [r["email"] for r in lab.crm.righe("SELECT email FROM optout ORDER BY email")],
            "contatori": {"totali": len(righe), "attivi": stati.count("attivo"), "uniti": stati.count("unito"),
                          "esclusi": stati.count("escluso")},
            "regola_segmenti": testo("1–50 persone: PMI · 51–500: Mid-market · oltre 500: Enterprise",
                                     "1–50 people: SME (PMI) · 51–500: Mid-market · over 500: Enterprise")[lingua],
        }

    def _contatto(self, lab, cid) -> dict:
        r = lab.crm.riga("SELECT * FROM contatti WHERE id = ?", (cid,))
        if r is None:
            raise ErroreFlusso("contatto_inesistente", f"il contatto {cid} non esiste")
        return r

    def azione(self, lab, nome: str, parametri: dict) -> dict:
        crm = lab.crm
        if nome == "unisci":
            p, d = richiedi(parametri, "principale", int), richiedi(parametri, "duplicato", int)
            if p == d:
                raise ErroreFlusso("unione_non_valida", "scegli due righe diverse")
            rp, rd = self._contatto(lab, p), self._contatto(lab, d)
            if rp["stato"] != "attivo" or rd["stato"] != "attivo":
                raise ErroreFlusso("unione_non_valida", "si uniscono solo righe attive")
            # come nei CRM veri: la riga principale tiene i SUOI campi; le attivita' passano tutte alla principale
            crm.esegui("UPDATE attivita SET contatto_id = ? WHERE contatto_id = ?", (p, d))
            crm.esegui("UPDATE contatti SET stato = 'unito', unito_in = ? WHERE id = ?", (p, d))
            return {"fatto": "unito", "principale": p, "duplicato": d}
        if nome == "correggi_email":
            cid, email = richiedi(parametri, "contatto", int), richiedi(parametri, "email", str).strip()
            self._contatto(lab, cid)
            crm.esegui("UPDATE contatti SET email = ? WHERE id = ?", (email, cid))
            return {"fatto": "email", "valida": bool(RE_EMAIL.match(email))}
        if nome == "segmento":
            cid, valore = richiedi(parametri, "contatto", int), richiedi(parametri, "valore", str)
            if valore not in SEGMENTI + [""]:
                raise ErroreFlusso("segmento_non_valido", f"segmento '{valore}' non previsto: {SEGMENTI}")
            self._contatto(lab, cid)
            crm.esegui("UPDATE contatti SET segmento = ? WHERE id = ?", (valore, cid))
            return {"fatto": "segmento"}
        if nome in ("escludi", "riattiva"):
            cid = richiedi(parametri, "contatto", int)
            r = self._contatto(lab, cid)
            if r["stato"] == "unito":
                raise ErroreFlusso("contatto_unito", "una riga unita non si esclude: ricomincia l'esercizio per annullare l'unione")
            crm.esegui("UPDATE contatti SET stato = ? WHERE id = ?", ("escluso" if nome == "escludi" else "attivo", cid))
            return {"fatto": nome}
        if nome in ("da_completare", "optout"):
            cid, valore = richiedi(parametri, "contatto", int), richiedi(parametri, "valore", bool)
            r = self._contatto(lab, cid)
            crm.esegui(f"UPDATE contatti SET {nome} = ? WHERE id = ?", (int(valore), cid))
            if nome == "optout":
                email = r["email"].strip().lower()
                if valore:
                    crm.esegui("INSERT OR IGNORE INTO optout (email, motivo) VALUES (?, ?)", (email, "segnato dallo studente"))
            return {"fatto": nome}
        raise ErroreFlusso("azione_sconosciuta", f"azione '{nome}' non prevista nell'esercizio 1")

    # ------------------------------------------------------------ correzione

    def fotografa(self, lab) -> dict:
        return {
            "contatti": lab.crm.righe("SELECT id, email, stato, unito_in, segmento, da_completare, optout "
                                      "FROM contatti ORDER BY id"),
            "attivita": lab.crm.righe("SELECT id, contatto_id FROM attivita ORDER BY id"),
            "lista_optout": [r["email"] for r in lab.crm.righe("SELECT email FROM optout ORDER BY email")],
        }

    def chiave(self, seme: int) -> dict:
        return genera(seme)["chiave"]

    @staticmethod
    def _attiva(ctx, persona) -> dict | None:
        """La riga attiva che rappresenta la persona (None se nessuna o se piu' d'una)."""
        per_id = {c["id"]: c for c in ctx.foto["contatti"]}
        attive = [per_id[i] for i in persona["ids"] if per_id[i]["stato"] == "attivo"]
        return attive[0] if len(attive) == 1 else None

    def controlli(self) -> list[Controllo]:
        return [
            Controllo("contatti_attivi", testo("22 contatti attivi", "22 active contacts"), 20,
                      testo("Dopo la pulizia restano 25 − 3 doppioni = 22 persone. Non escludere chi ha solo un campo da sistemare.",
                            "After cleaning there are 25 − 3 duplicates = 22 people. Do not exclude people who only need one field fixed."),
                      self._c_attivi),
            Controllo("email_valide", testo("Email scritte bene", "Well-formed emails"), 15,
                      testo("Un'email valida ha una sola @, un nome prima e un dominio dopo (es. nome.cognome@azienda.it). «(at)» e «@@» non vanno bene.",
                            "A valid email has one @, a name before and a domain after (e.g. name.surname@company.it). «(at)» and «@@» are not valid."),
                      self._c_email),
            Controllo("duplicati_uniti", testo("Doppioni uniti, non cancellati", "Duplicates merged, not deleted"), 20,
                      testo("Usa «Unisci» sulle due righe della stessa persona: così la storia (telefonate, email, demo) resta tutta sulla riga che tieni. Escludere un doppione butta via la sua storia.",
                            "Use «Merge» on the two rows of the same person: the history (calls, emails, demos) stays on the row you keep. Excluding a duplicate throws its history away."),
                      self._c_duplicati),
            Controllo("segmenti", testo("Segmento coerente con la dimensione", "Segment consistent with size"), 20,
                      testo("Guarda la colonna «Dimensione»: fino a 50 è PMI, da 51 a 500 Mid-market, oltre 500 Enterprise. Attenzione ai confini: 50 è PMI, 500 è Mid-market.",
                            "Look at the «Size» column: up to 50 is SME (PMI), 51 to 500 Mid-market, over 500 Enterprise. Mind the edges: 50 is SME, 500 is Mid-market."),
                      self._c_segmenti),
            Controllo("da_completare", testo("Dato mancante segnalato", "Missing data flagged"), 10,
                      testo("Se manca la dimensione dell'azienda non si inventa e non si butta il lead: lo si segna «da completare» e resta attivo.",
                            "If the company size is missing you do not make it up or drop the lead: you mark it «to complete» and keep it active."),
                      self._c_da_completare),
            Controllo("disiscritti", testo("Disiscritti rispettati", "Unsubscribed respected"), 15,
                      testo("Chi ha chiesto di non essere contattato resta nel CRM con «non contattare» acceso (serve a ricordarsi del suo no). Quando unisci due righe, la principale tiene i suoi campi: se il «non contattare» era sull'altra, riaccendilo.",
                            "Whoever asked not to be contacted stays in the CRM with «do not contact» on (it is how you remember their no). When you merge two rows the main one keeps its own fields: if «do not contact» was on the other one, switch it on again."),
                      self._c_disiscritti, bloccante=True),
        ]

    def _c_attivi(self, ctx) -> Esito:
        n = sum(1 for c in ctx.foto["contatti"] if c["stato"] == "attivo")
        attesi = ctx.chiave["attivi_attesi"]
        if n == attesi:
            return Esito(True, testo(f"Ci sono {n} contatti attivi, come previsto.", f"There are {n} active contacts, as expected."))
        if n > attesi:
            return Esito(False, testo(f"Ci sono {n} contatti attivi invece di {attesi}: restano {n - attesi} righe di troppo (doppioni non uniti?).",
                                      f"There are {n} active contacts instead of {attesi}: {n - attesi} rows too many (duplicates not merged?)."))
        return Esito(False, testo(f"Ci sono solo {n} contatti attivi invece di {attesi}: {attesi - n} persone sono state escluse senza motivo.",
                                  f"There are only {n} active contacts instead of {attesi}: {attesi - n} people were excluded for no reason."))

    def _c_email(self, ctx) -> Esito:
        rotte = [c["email"] for c in ctx.foto["contatti"] if c["stato"] == "attivo" and not RE_EMAIL.match(c["email"])]
        if not rotte:
            return Esito(True, testo("Tutte le email dei contatti attivi sono scritte bene.", "All active contacts' emails are well formed."))
        return Esito(False, testo(f"{len(rotte)} email scritte male: {_nomi(rotte)}.", f"{len(rotte)} badly written emails: {_nomi(rotte)}."))

    def _c_duplicati(self, ctx) -> Esito:
        per_id = {c["id"]: c for c in ctx.foto["contatti"]}
        att = {}
        for a in ctx.foto["attivita"]:
            att.setdefault(a["contatto_id"], set()).add(a["id"])
        doppi = [p for p in ctx.chiave["persone"] if p["duplicato"]]
        ok, male = 0, []
        for p in doppi:
            righe = [per_id[i] for i in p["ids"]]
            attive = [r for r in righe if r["stato"] == "attivo"]
            unite = [r for r in righe if r["stato"] == "unito"]
            if len(attive) == 1 and len(unite) == 1 and unite[0]["unito_in"] == attive[0]["id"] \
                    and set(p["attivita"]) <= att.get(attive[0]["id"], set()):
                ok += 1
            else:
                male.append(p["nome"])
        if not male:
            return Esito(True, testo(f"I {ok} doppioni sono stati uniti e la loro storia è conservata.",
                                     f"The {ok} duplicates were merged and their history is kept."))
        return Esito(False, testo(f"{len(male)} doppioni su {len(doppi)} non sono uniti correttamente: {_nomi(male)}.",
                                  f"{len(male)} duplicates out of {len(doppi)} are not merged correctly: {_nomi(male)}."),
                     frazione=ok / len(doppi))

    def _c_segmenti(self, ctx) -> Esito:
        noti = [p for p in ctx.chiave["persone"] if p["segmento"] is not None]
        sbagliati = []
        for p in noti:
            r = self._attiva(ctx, p)
            if r is None or r["segmento"] != p["segmento"]:
                sbagliati.append(p["nome"])
        ammessi = ctx.parametri["segmenti_errori_ammessi"]
        giusti = len(noti) - len(sbagliati)
        if len(sbagliati) <= ammessi:
            extra_it = f" (uno sbaglio tollerato: {sbagliati[0]})" if sbagliati else ""
            extra_en = f" (one mistake allowed: {sbagliati[0]})" if sbagliati else ""
            return Esito(True, testo(f"Segmento giusto per {giusti} contatti su {len(noti)}{extra_it}.",
                                     f"Right segment for {giusti} contacts out of {len(noti)}{extra_en}."))
        minimo = len(noti) - ammessi
        return Esito(False, testo(f"Segmento giusto solo per {giusti} contatti su {len(noti)} (ne servono {minimo}). Da rivedere: {_nomi(sbagliati)}.",
                                  f"Right segment for only {giusti} contacts out of {len(noti)} ({minimo} needed). To review: {_nomi(sbagliati)}."),
                     frazione=giusti / minimo)

    def _c_da_completare(self, ctx) -> Esito:
        p = next(p for p in ctx.chiave["persone"] if p["da_completare"])
        r = self._attiva(ctx, p)
        if r is not None and r["da_completare"]:
            return Esito(True, testo(f"{p['nome']} è attivo e segnato «da completare».", f"{p['nome']} is active and marked «to complete»."))
        if r is None:
            return Esito(False, testo(f"{p['nome']} è stato escluso: manca solo la dimensione dell'azienda, il lead è buono.",
                                      f"{p['nome']} was excluded: only the company size is missing, the lead is good."))
        return Esito(False, testo(f"{p['nome']} non è segnato «da completare»: la sua azienda non ha la dimensione.",
                                  f"{p['nome']} is not marked «to complete»: their company has no size."))

    def _c_disiscritti(self, ctx) -> Esito:
        persi, doppi = [], []
        lista = {e.strip().lower() for e in ctx.foto["lista_optout"]}
        per_id = {c["id"]: c for c in ctx.foto["contatti"]}
        for p in ctx.chiave["persone"]:
            if not p["optout"]:
                continue
            attive = [per_id[i] for i in p["ids"] if per_id[i]["stato"] == "attivo"]
            if len(attive) > 1 and any(not r["optout"] for r in attive):
                doppi.append(p["nome"])
            elif len(attive) != 1 or not attive[0]["optout"] or p["email"] not in lista:
                persi.append(p["nome"])
        if not persi and not doppi:
            return Esito(True, testo("Tutti i disiscritti sono nel CRM con «non contattare» acceso.",
                                     "All unsubscribed people are in the CRM with «do not contact» on."))
        it, en = [], []
        if persi:
            it.append(f"{len(persi)} persone che avevano chiesto di non essere contattate hanno perso il «non contattare» (o non sono più nel CRM): {_nomi(persi)}")
            en.append(f"{len(persi)} people who had asked not to be contacted lost «do not contact» (or are no longer in the CRM): {_nomi(persi)}")
        if doppi:
            it.append(f"{len(doppi)} disiscritti hanno ancora una seconda riga attiva senza «non contattare»: {_nomi(doppi)}")
            en.append(f"{len(doppi)} unsubscribed people still have a second active row without «do not contact»: {_nomi(doppi)}")
        return Esito(False, testo("; ".join(it) + ". Con questi dati riceverebbero la prossima campagna.",
                                  "; ".join(en) + ". With this data they would get the next campaign."))


ESERCIZIO = PuliziaLead()
