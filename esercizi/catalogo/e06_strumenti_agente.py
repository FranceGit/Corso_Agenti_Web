"""Esercizio 6 — «Dare gli strumenti giusti all'agente»: strumenti, permessi e tetto di passi (esercizio 7 del piano).

Lo studente sceglie per ognuno degli 8 strumenti del CRM un permesso (non dato / con approvazione / libero) e il tetto
di passi dell'agente, poi lancia l'agente su 4 richieste visibili e legge il diario dei passi. L'agente (finto-LLM,
compito 'agente_crm', sempre attraverso il registro) propone un piano di chiamate, anche verso strumenti che non ha o
che fanno danni (una nota con istruzioni nascoste, «manda subito a tutti»): e' l'ORCHESTRAZIONE a eseguire, fermare
in attesa di una persona o rifiutare ogni chiamata secondo i permessi, e a fermarsi al tetto di passi.
Il correttore ripete lo stesso meccanismo su 7 richieste nascoste e controlla che l'agente possa fare il necessario e
NON possa fare il pericoloso da solo (bloccante), il minimo privilegio, le letture libere, il tetto di passi e che il
diario sia stato guardato con la configurazione finale.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

from corso.errori import ErroreFlusso

from ..motore.contratto import Controllo, Esercizio, Esito, testo
from ..motore.esecutore import richiedi

DATI = json.loads((Path(__file__).parent / "dati" / "e06_strumenti.json").read_text(encoding="utf-8"))
STRUMENTI = [s["id"] for s in DATI["strumenti"]]
PERMESSI = [p["id"] for p in DATI["permessi"]]
LIMITE = DATI["limite_passi"]
VISIBILI = {s["id"]: s for s in DATI["visibili"]}
COMPITO = "COMPITO: agente_crm"

# esiti di una chiamata nel diario
ESEGUITA, IN_ATTESA, RIFIUTATA, FERMATA = "eseguita", "in_attesa", "rifiutata", "fermata"


def configurazione(permessi: dict, limite: int) -> dict:
    return {"permessi": {s: permessi[s] for s in STRUMENTI}, "limite": limite}


def impronta_config(cfg: dict) -> str:
    return hashlib.sha256(json.dumps(cfg, sort_keys=True).encode("utf-8")).hexdigest()[:16]


def prompt_di(cfg: dict) -> str:
    dati = [f"{s} ({'chiede approvazione' if cfg['permessi'][s] == 'approvazione' else 'libero'})"
            for s in STRUMENTI if cfg["permessi"][s] != "no"]
    return "\n".join([COMPITO, DATI["istruzione_compito"], "Strumenti disponibili: " + (", ".join(dati) or "nessuno"),
                      f"Tetto di passi: {cfg['limite']}"])


def chiedi_piano(llm, cfg: dict, richiesta: str) -> dict:
    return llm.completa([{"role": "system", "content": prompt_di(cfg)}, {"role": "user", "content": richiesta}])


def leggi_piano(risposta: str) -> list[dict] | None:
    """Il piano proposto dal modello: elenco di {strumento, argomenti}. None se la risposta non si legge."""
    try:
        piano = json.loads(risposta)
    except ValueError:
        return None
    if not isinstance(piano, list) or not all(isinstance(c, dict) and isinstance(c.get("strumento"), str)
                                               and isinstance(c.get("argomenti", {}), dict) for c in piano):
        return None
    return piano


def esegui_piano(piano: list[dict], cfg: dict) -> list[dict]:
    """L'orchestrazione: decide l'esito di ogni chiamata. Pura (nessun effetto): gli effetti li applica chi la usa."""
    diario = []
    for i, c in enumerate(piano):
        s = c["strumento"]
        if i >= cfg["limite"]:
            diario.append({"passo": i + 1, "strumento": s, "argomenti": c.get("argomenti", {}), "esito": FERMATA})
            break
        permesso = cfg["permessi"].get(s, "no")
        esito = ESEGUITA if permesso == "libero" else IN_ATTESA if permesso == "approvazione" else RIFIUTATA
        diario.append({"passo": i + 1, "strumento": s, "argomenti": c.get("argomenti", {}), "esito": esito})
    return diario


def _nomi(voci: list[str], quanti: int = 4) -> str:
    return ", ".join(voci[:quanti]) + ("…" if len(voci) > quanti else "")


class StrumentiAgente(Esercizio):
    numero = 6
    id = "strumenti_agente"
    versione = "1.0"
    tipo_area = "strumenti_agente"
    titolo = testo("Dare gli strumenti giusti all'agente", "Giving the agent the right tools")
    sottotitolo = testo(
        "L'agente del CRM parte con tutti gli strumenti liberi, anche quelli che cancellano e che spediscono. Scegli tu che cosa può usare, con quale permesso, e per quanti passi.",
        "The CRM agent starts with every tool free, even the ones that delete and send. You choose what it may use, with which permission, and for how many steps.")
    consegna = [
        testo("Per ogni strumento scegli il permesso: non dato, con approvazione (una persona decide ogni volta) o libero.",
              "For each tool choose the permission: not given, with approval (a person decides each time) or free."),
        testo("Scegli il tetto di passi: abbastanza per finire i compiti veri, non tanti da lasciar girare a vuoto l'agente.",
              "Choose the step limit: enough to finish the real tasks, not so many that the agent can go round in circles."),
        testo("Lancia l'agente sulle 4 richieste e leggi il diario: quale strumento ha chiamato e che cosa è successo. Guarda anche il CRM e la posta.",
              "Run the agent on the 4 requests and read the diary: which tool it called and what happened. Look at the CRM and the mail too."),
        testo("Quando l'agente fa il necessario e niente di pericoloso, rilancia le 4 richieste con la configurazione finale e premi «Verifica»: il correttore prova la tua configurazione su 7 richieste che non vedi.",
              "When the agent does what is needed and nothing dangerous, run the 4 requests again with the final configuration and press «Check»: the grader tries your configuration on 7 requests you cannot see."),
    ]

    # ------------------------------------------------------------ setup

    def prepara(self, lab) -> None:
        crm = lab.crm
        aziende = sorted({c["azienda"] for c in DATI["contatti"]})
        id_az = {a: i + 1 for i, a in enumerate(aziende)}
        for a, i in id_az.items():
            settore = next(c["settore"] for c in DATI["contatti"] if c["azienda"] == a)
            crm.esegui("INSERT INTO aziende (id, nome, settore, dimensione) VALUES (?, ?, ?, NULL)", (i, a, settore))
        for c in DATI["contatti"]:
            crm.esegui("INSERT INTO contatti (id, nome, cognome, email, ruolo, azienda_id, fascia) VALUES (?, ?, ?, ?, 'Lead', ?, ?)",
                       (c["id"], c["nome"], c["cognome"], c["email"], id_az[c["azienda"]], c["fascia"]))
        for a in DATI["attivita_iniziali"]:
            crm.esegui("INSERT INTO attivita (contatto_id, tipo, nota) VALUES (?, ?, ?)", (a["contatto"], a["tipo"], a["nota"]["it"]))
        crm.imposta("permessi", {s: DATI["permesso_iniziale"] for s in STRUMENTI})
        crm.imposta("limite", LIMITE["iniziale"])
        crm.imposta("diari", {})

    # ------------------------------------------------------------ configurazione e lancio

    @staticmethod
    def _cfg(crm) -> dict:
        return configurazione(crm.impostazione("permessi"), crm.impostazione("limite"))

    def _applica(self, lab, diario: list[dict]) -> None:
        """Effetti delle sole chiamate eseguite sul CRM e sulla posta del laboratorio."""
        crm = lab.crm
        for d in diario:
            if d["esito"] != ESEGUITA:
                continue
            a, s = d["argomenti"], d["strumento"]
            cid = a.get("contatto")
            esiste = cid is not None and crm.valore("SELECT COUNT(*) FROM contatti WHERE id = ? AND stato = 'attivo'", (cid,))
            if s == "crea_attivita" and esiste:
                crm.esegui("INSERT INTO attivita (contatto_id, tipo, nota) VALUES (?, ?, ?)",
                           (cid, a.get("tipo", ""), f"creata dall'agente: {a.get('quando', '')}".strip()))
            elif s == "aggiorna_campo" and esiste and a.get("campo") == "fascia":
                crm.esegui("UPDATE contatti SET fascia = ? WHERE id = ?", (str(a.get("valore", "")), cid))
            elif s == "prepara_bozza" and esiste:
                crm.esegui("INSERT INTO bozze (contatto_id, oggetto, corpo, stato) VALUES (?, ?, ?, 'bozza')",
                           (cid, "Risposta", "Bozza preparata dall'agente."))
            elif s == "invia_email":
                dest = a.get("indirizzo") or (crm.valore("SELECT email FROM contatti WHERE id = ?", (cid,)) if esiste else None)
                if dest:
                    lab.posta.invia(lab.etichetta_posta, dest, a.get("oggetto", ""), "Email inviata dall'agente senza revisione.")
            elif s == "cancella_contatto" and esiste:
                crm.esegui("UPDATE contatti SET stato = 'escluso' WHERE id = ?", (cid,))
            elif s == "esporta_contatti":
                crm.audit("esportazione", {"campi": a.get("campi", [])})

    def _lancia(self, lab, sid: str) -> dict:
        crm = lab.crm
        cfg = self._cfg(crm)
        r = chiedi_piano(lab.llm, cfg, VISIBILI[sid]["prompt"])
        piano = leggi_piano(r["risposta"])
        diario = esegui_piano(piano, cfg) if piano is not None else []
        self._applica(lab, diario)
        diari = crm.impostazione("diari")
        diari[sid] = {"config": impronta_config(cfg), "diario": diario, "leggibile": piano is not None}
        crm.imposta("diari", diari)
        return diari[sid]

    # ------------------------------------------------------------ area di lavoro

    def area(self, lab, lingua: str) -> dict:
        crm = lab.crm
        cfg = self._cfg(crm)
        attuale = impronta_config(cfg)
        diari = crm.impostazione("diari")
        return {
            "strumenti": [{"id": s["id"], "tipo": s["tipo"], "descrizione": s["descrizione"][lingua], "permesso": cfg["permessi"][s["id"]]}
                          for s in DATI["strumenti"]],
            "permessi": [{"id": p["id"], "nome": p["nome"][lingua]} for p in DATI["permessi"]],
            "limite": cfg["limite"], "limiti": {k: LIMITE[k] for k in ("min", "max", "passo")},
            "richieste": [{"id": v["id"], "testo": v["richiesta"][lingua],
                           "diario": diari.get(v["id"], {}).get("diario"),
                           "aggiornato": diari.get(v["id"], {}).get("config") == attuale} for v in DATI["visibili"]],
            "contatti": crm.righe("SELECT c.id, c.nome || ' ' || c.cognome AS nome, a.nome AS azienda, c.fascia, c.stato, "
                                  "(SELECT COUNT(*) FROM attivita t WHERE t.contatto_id = c.id) AS attivita "
                                  "FROM contatti c JOIN aziende a ON a.id = c.azienda_id ORDER BY c.id"),
            "bozze": crm.valore("SELECT COUNT(*) FROM bozze"),
            "posta": [{"a": m["a"], "oggetto": m["oggetto"]} for m in lab.posta.elenco(lab.etichetta_posta)],
        }

    def azione(self, lab, nome: str, parametri: dict) -> dict:
        crm = lab.crm
        if nome == "permesso":
            s, p = richiedi(parametri, "strumento", str), richiedi(parametri, "valore", str)
            if s not in STRUMENTI:
                raise ErroreFlusso("strumento_inesistente", f"lo strumento '{s}' non esiste: {STRUMENTI}")
            if p not in PERMESSI:
                raise ErroreFlusso("permesso_non_valido", f"permesso '{p}' non previsto: {PERMESSI}")
            permessi = crm.impostazione("permessi")
            permessi[s] = p
            crm.imposta("permessi", permessi)
            return {"fatto": "permesso"}
        if nome == "limite":
            v = richiedi(parametri, "valore", int)
            if not LIMITE["min"] <= v <= LIMITE["max"]:
                raise ErroreFlusso("limite_non_valido", f"il tetto di passi va da {LIMITE['min']} a {LIMITE['max']}")
            crm.imposta("limite", v)
            return {"fatto": "limite"}
        if nome == "lancia":
            sid = richiedi(parametri, "richiesta", str)
            if sid not in VISIBILI:
                raise ErroreFlusso("richiesta_inesistente", f"la richiesta '{sid}' non esiste: {sorted(VISIBILI)}")
            d = self._lancia(lab, sid)
            return {"fatto": "lanciata", "passi": len(d["diario"])}
        raise ErroreFlusso("azione_sconosciuta", f"azione '{nome}' non prevista nell'esercizio 6")

    # ------------------------------------------------------------ correzione

    def fotografa(self, lab) -> dict:
        crm = lab.crm
        cfg = self._cfg(crm)
        nascosti = []
        for h in DATI["nascosti"]:
            r = chiedi_piano(lab.llm, cfg, h["prompt"])
            nascosti.append({"id": h["id"], "risposta": r["risposta"], "registro": r["chiave"]})
        diari = crm.impostazione("diari")
        return {"config": cfg, "impronta_config": impronta_config(cfg),
                "prove": {k: v["config"] for k, v in sorted(diari.items())}, "nascosti": nascosti, "modello": lab.llm.nome}

    def chiave(self, seme: int) -> dict:
        return {"nascosti": {h["id"]: {"tipo": h["tipo"], "nome": h["nome"]} for h in DATI["nascosti"]},
                "visibili": sorted(VISIBILI), **{k: v for k, v in DATI["chiave"].items() if not k.startswith("_")}}

    def controlli(self) -> list[Controllo]:
        return [
            Controllo("pericoloso_impossibile", testo("L'agente non può fare da solo niente di pericoloso", "The agent cannot do anything dangerous on its own"), 25,
                      testo("Errore bloccante: con uno strumento pericoloso lasciato libero l'agente ha cancellato, spedito o esportato dati senza che nessuno decidesse. Non dare cancella_contatto ed esporta_contatti; invia_email al massimo con approvazione.",
                            "Blocking error: with a dangerous tool left free the agent deleted, sent or exported data without anyone deciding. Do not give cancella_contatto and esporta_contatti; invia_email at most with approval."),
                      self._c_pericoloso, bloccante=True),
            Controllo("necessario_possibile", testo("L'agente può fare i compiti veri", "The agent can do the real tasks"), 25,
                      testo("Un agente senza gli strumenti che servono non finisce il lavoro: per follow-up, bozze e aggiornamenti servono cerca_lead, leggi_attivita, crea_attivita, prepara_bozza e aggiorna_campo, e abbastanza passi.",
                            "An agent without the tools it needs does not finish the job: follow-ups, drafts and updates need cerca_lead, leggi_attivita, crea_attivita, prepara_bozza and aggiorna_campo, and enough steps."),
                      self._c_necessario),
            Controllo("minimo_privilegio", testo("Minimo privilegio: niente strumenti che non servono", "Least privilege: no tools that are not needed"), 15,
                      testo("Uno strumento che nessun compito usa è solo un rischio in più: cancella_contatto ed esporta_contatti vanno lasciati «non dato», anche con approvazione.",
                            "A tool that no task uses is just one more risk: cancella_contatto and esporta_contatti should be left «not given», even with approval."),
                      self._c_privilegio),
            Controllo("letture_libere", testo("Le letture non disturbano la persona", "Reads do not bother the person"), 10,
                      testo("Chiedere approvazione per ogni lettura fa perdere tempo e abitua ad approvare senza leggere: cerca_lead e leggi_attivita possono essere libere.",
                            "Asking approval for every read wastes time and gets people used to approving without reading: cerca_lead and leggi_attivita can be free."),
                      self._c_letture),
            Controllo("tetto_passi", testo("Tetto di passi giusto", "Right step limit"), 15,
                      testo("Il tetto deve bastare al compito vero più lungo e fermare presto un agente che gira a vuoto (al massimo 10 passi).",
                            "The limit must be enough for the longest real task and stop early an agent that goes round in circles (at most 10 steps)."),
                      self._c_tetto),
            Controllo("diario_letto", testo("Diario guardato con la configurazione finale", "Diary looked at with the final configuration"), 10,
                      testo("Dopo l'ultima modifica a permessi o tetto rilancia le 4 richieste e leggi il diario: si verifica quello che si è provato.",
                            "After the last change to permissions or limit run the 4 requests again and read the diary: you check what you have tried."),
                      self._c_diario),
        ]

    # --- helpers
    def _diari(self, ctx) -> list[dict]:
        cfg = ctx.foto["config"]
        out = []
        for r in ctx.foto["nascosti"]:
            k = ctx.chiave["nascosti"][r["id"]]
            piano = leggi_piano(r["risposta"])
            out.append({"id": r["id"], "tipo": k["tipo"], "nome": k["nome"], "piano": piano or [],
                        "diario": esegui_piano(piano, cfg) if piano is not None else []})
        return out

    def _c_pericoloso(self, ctx) -> Esito:
        pericolosi = set(ctx.chiave["pericolosi"])
        fatti = []
        for d in self._diari(ctx):
            danni = sorted({p["strumento"] for p in d["diario"] if p["strumento"] in pericolosi and p["esito"] == ESEGUITA})
            if danni:
                fatti.append((d["nome"], danni))
        if not fatti:
            return Esito(True, testo("Sulle richieste nascoste nessuna azione pericolosa è partita senza una persona.",
                                     "On the hidden requests no dangerous action went ahead without a person."))
        return Esito(False, testo("L'agente ha fatto da solo azioni pericolose: " + "; ".join(f"{n['it']} ({', '.join(s)})" for n, s in fatti) + ".",
                                  "The agent did dangerous actions on its own: " + "; ".join(f"{n['en']} ({', '.join(s)})" for n, s in fatti) + "."))

    def _c_necessario(self, ctx) -> Esito:
        necessari = [d for d in self._diari(ctx) if d["tipo"] == "necessario"]
        falliti = []
        for d in necessari:
            bloccati = sorted({p["strumento"] for p in d["diario"] if p["esito"] == RIFIUTATA})
            fermato = any(p["esito"] == FERMATA for p in d["diario"]) or not d["piano"]
            if bloccati or fermato:
                falliti.append((d["nome"], bloccati, fermato))
        n = len(necessari)
        if not falliti:
            return Esito(True, testo(f"L'agente porta a termine tutti i {n} compiti veri nascosti.", f"The agent completes all {n} hidden real tasks."))
        def riga(l):
            parti = []
            for nome, bl, fe in falliti:
                motivo = []
                if bl:
                    motivo.append(("manca " if l == "it" else "missing ") + ", ".join(bl))
                if fe:
                    motivo.append("fermato dal tetto di passi" if l == "it" else "stopped by the step limit")
                parti.append(f"{nome[l]} ({'; '.join(motivo)})")
            return "; ".join(parti)
        return Esito(False, testo(f"Compiti veri non finiti: {riga('it')}.", f"Real tasks not finished: {riga('en')}."),
                     frazione=(n - len(falliti)) / n)

    def _c_privilegio(self, ctx) -> Esito:
        dati = [s for s in ctx.chiave["mai_necessari"] if ctx.foto["config"]["permessi"][s] != "no"]
        n = len(ctx.chiave["mai_necessari"])
        if not dati:
            return Esito(True, testo("Gli strumenti che nessun compito usa non sono dati all'agente.", "The tools no task uses are not given to the agent."))
        return Esito(False, testo(f"Strumenti dati ma inutili ai compiti: {', '.join(dati)}.", f"Tools given but useless for the tasks: {', '.join(dati)}."),
                     frazione=(n - len(dati)) / n)

    def _c_letture(self, ctx) -> Esito:
        non_libere = [s for s in ctx.chiave["letture"] if ctx.foto["config"]["permessi"][s] != "libero"]
        if not non_libere:
            return Esito(True, testo("Le letture sono libere: la persona approva solo ciò che cambia qualcosa.", "Reads are free: the person only approves what changes something."))
        return Esito(False, testo(f"Letture non libere: {', '.join(non_libere)}.", f"Reads that are not free: {', '.join(non_libere)}."))

    def _c_tetto(self, ctx) -> Esito:
        limite = ctx.foto["config"]["limite"]
        diari = self._diari(ctx)
        serve = max(len(d["piano"]) for d in diari if d["tipo"] == "necessario")
        massimo = ctx.parametri["tetto_massimo_passi"]
        ciclo = [d for d in diari if d["tipo"] == "ciclo"]
        if serve <= limite <= massimo:
            dett_it = "; ".join(f"«{d['nome']['it']}» si ferma dopo {limite} passi invece di {len(d['piano'])}" for d in ciclo)
            dett_en = "; ".join(f"«{d['nome']['en']}» stops after {limite} steps instead of {len(d['piano'])}" for d in ciclo)
            return Esito(True, testo(f"Tetto di {limite} passi: bastano per i compiti veri ({serve}) e {dett_it}.",
                                     f"Limit of {limite} steps: enough for the real tasks ({serve}) and {dett_en}."))
        if limite < serve:
            return Esito(False, testo(f"Tetto di {limite} passi troppo basso: il compito vero più lungo ne chiede {serve}.",
                                      f"Limit of {limite} steps too low: the longest real task needs {serve}."))
        return Esito(False, testo(f"Tetto di {limite} passi troppo alto: un agente che gira a vuoto consuma fino a {limite} chiamate (massimo {massimo}).",
                                  f"Limit of {limite} steps too high: an agent going round in circles uses up to {limite} calls (maximum {massimo})."))

    def _c_diario(self, ctx) -> Esito:
        attuale = ctx.foto["impronta_config"]
        mancano = [v for v in ctx.chiave["visibili"] if ctx.foto["prove"].get(v) != attuale]
        if not mancano:
            return Esito(True, testo("Hai lanciato tutte le richieste con la configurazione finale.", "You ran all the requests with the final configuration."))
        return Esito(False, testo(f"Da rilanciare con la configurazione finale: {len(mancano)} richieste su {len(ctx.chiave['visibili'])}.",
                                  f"To run again with the final configuration: {len(mancano)} requests out of {len(ctx.chiave['visibili'])}."))


ESERCIZIO = StrumentiAgente()
