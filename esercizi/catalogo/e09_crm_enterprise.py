"""Esercizio 9 — Officina O3 «Dentro un CRM enterprise»: lettura guidata di nebula-insurance-crm e nebula-agents.

Lo studente legge gli estratti (BLUEPRINT, uno schema JSON, BOUNDARY-POLICY; licenza MIT) e:
  - risponde a 7 scelte chiuse sui fatti scritti nei documenti (dominio, forma architetturale, autorizzazione,
    audit, ruolo del server MCP, cosa sta in agents/, effetto di additionalProperties false);
  - scrive lo schema JSON della richiesta di creazione di un lead con le stesse convenzioni di Nebula.
Correzione statica e deterministica: nessun validatore esterno, solo il testo JSON consegnato.
"""
from __future__ import annotations

import json

from ..motore.contratto import Controllo, Esito, testo
from ..officina.base import EsercizioOfficina, esito_si_no

SCHEMA = "lead-create-request.schema.json"
OBBLIGATORI = ["nome", "email", "azienda"]
DRAFT = "http://json-schema.org/draft-07/schema#"


def _o(id_: str, it: str, en: str) -> dict:
    return {"id": id_, "testo": testo(it, en)}


class CrmEnterprise(EsercizioOfficina):
    numero = 9
    id = "officina_crm_enterprise"
    versione = "1.0"
    unita = "O3"
    titolo = testo("Officina O3 · Dentro un CRM enterprise", "Workshop O3 · Inside an enterprise CRM")
    sottotitolo = testo(
        "Un CRM vero si progetta prima di scriverlo: blueprint, confini, contratti dati. Leggi quello di Nebula e scrivi un contratto alla sua maniera.",
        "A real CRM is designed before it is written: blueprint, boundaries, data contracts. Read Nebula's and write a contract in its style.")
    consegna = [
        testo("Leggi gli estratti: BLUEPRINT (contesto, entità, piattaforma, confini, autorizzazione), lo schema contact-create-request e la BOUNDARY-POLICY di nebula-agents.",
              "Read the excerpts: BLUEPRINT (context, entities, platform, boundaries, authorisation), the contact-create-request schema and the nebula-agents BOUNDARY-POLICY."),
        testo("Rispondi alle 7 scelte: ogni risposta è scritta negli estratti.", "Answer the 7 choices: every answer is written in the excerpts."),
        testo(f"Scrivi {SCHEMA}: draft-07, $id, title, tipo oggetto, campi obbligatori nome, email e azienda, email con formato email, nessun campo in più ammesso.",
              f"Write {SCHEMA}: draft-07, $id, title, object type, required fields nome, email and azienda, email with email format, no extra field allowed."),
    ]
    FILE = [
        {"percorso": SCHEMA, "iniziale": "o3/lead-create-request.iniziale.json", "linguaggio": "json",
         "descrizione": testo("Il contratto della richiesta «crea lead» del CRM dell'Officina.", "The contract of the Workshop CRM «create lead» request.")},
    ]
    MATERIALE = [
        {"titolo": testo("BLUEPRINT (estratto)", "BLUEPRINT (excerpt)"), "percorso": "o3/BLUEPRINT_estratto.md"},
        {"titolo": testo("contact-create-request.schema.json (modello da imitare)", "contact-create-request.schema.json (model to imitate)"), "percorso": "o3/contact-create-request.schema.json"},
        {"titolo": testo("nebula-agents: BOUNDARY-POLICY (estratto)", "nebula-agents: BOUNDARY-POLICY (excerpt)"), "percorso": "o3/BOUNDARY-POLICY_estratto.md"},
        {"titolo": testo("Licenza MIT degli estratti", "MIT licence of the excerpts"), "percorso": "o3/LICENZA_nebula.txt"},
    ]
    SCELTE = [
        {"id": "dominio", "domanda": testo("Che cosa gestisce Nebula?", "What does Nebula manage?"), "opzioni": [
            _o("assicurazioni", "Rapporti con broker e MGA per assicurazioni danni commerciali", "Broker and MGA relationships for commercial P&C insurance"),
            _o("dettaglio", "Vendite al dettaglio di un negozio online", "Retail sales of an online shop"),
            _o("ospedale", "Pazienti e appuntamenti di un ospedale", "Patients and appointments of a hospital"),
            _o("logistica", "Spedizioni e magazzini", "Shipments and warehouses")]},
        {"id": "forma", "domanda": testo("Che forma ha l'architettura?", "What shape does the architecture have?"), "opzioni": [
            _o("monolite_modulare", "Un monolite modulare: un solo deployable con moduli dai confini netti", "A modular monolith: a single deployable with clean module boundaries"),
            _o("microservizi", "Un microservizio per ogni entità", "One microservice per entity"),
            _o("serverless", "Funzioni serverless indipendenti", "Independent serverless functions"),
            _o("desktop", "Un'applicazione desktop", "A desktop application")]},
        {"id": "autorizzazione", "domanda": testo("Dove si applica l'autorizzazione?", "Where is authorisation enforced?"), "opzioni": [
            _o("server_abac", "Solo lato server, con politiche ABAC (Casbin)", "Server-side only, with ABAC policies (Casbin)"),
            _o("frontend", "Nel frontend, nascondendo i pulsanti", "In the frontend, by hiding the buttons"),
            _o("database", "Nel database, con viste filtrate", "In the database, with filtered views"),
            _o("idp", "Solo nel fornitore di identità", "Only in the identity provider")]},
        {"id": "audit", "domanda": testo("Come si trattano le tabelle di audit, timeline e transizioni?", "How are the audit, timeline and transition tables treated?"), "opzioni": [
            _o("append_only", "Solo in aggiunta: non si modificano né si cancellano", "Append-only: never modified or deleted"),
            _o("pulizia", "Si svuotano ogni mese", "They are emptied every month"),
            _o("facoltative", "Si scrivono solo per le modifiche importanti", "They are written only for important changes"),
            _o("riscritte", "Si riscrivono a ogni transizione", "They are rewritten at each transition")]},
        {"id": "mcp", "domanda": testo("Che ruolo ha il server MCP in Python?", "What role does the Python MCP server have?"), "opzioni": [
            _o("secondaria", "Un'interfaccia secondaria, che arriva dopo e non è mai la fonte di verità", "A secondary interface, coming later and never the source of truth"),
            _o("fonte", "La fonte di verità dei dati", "The source of truth for the data"),
            _o("unica", "L'unica via d'accesso al CRM", "The only way into the CRM"),
            _o("assente", "Non è previsto", "It is not planned")]},
        {"id": "agents", "domanda": testo("In nebula-agents, che cosa sta nella cartella agents/?", "In nebula-agents, what goes in the agents/ folder?"), "opzioni": [
            _o("generico", "Ruoli e pratiche generici, validi per qualsiasi progetto, senza termini di dominio", "Generic roles and practices, valid for any project, with no domain terms"),
            _o("regole", "Le regole di business del CRM assicurativo", "The insurance CRM's business rules"),
            _o("personas", "Le personas degli assicuratori", "The underwriters' personas"),
            _o("codice", "Il codice del backend .NET", "The .NET backend code")]},
        {"id": "campo_extra", "domanda": testo("contact-create-request ha additionalProperties false. Una richiesta con un campo in più…",
                                               "contact-create-request has additionalProperties false. A request with an extra field…"), "opzioni": [
            _o("rifiutata", "…viene rifiutata dalla validazione", "…is rejected by validation"),
            _o("salvata", "…viene salvata con il campo in più", "…is saved with the extra field"),
            _o("ignorata", "…passa e il campo viene ignorato in silenzio", "…passes and the field is silently ignored"),
            _o("nota", "…passa e il campo diventa una nota", "…passes and the field becomes a note")]},
    ]
    RISPOSTE = {"dominio": "assicurazioni", "forma": "monolite_modulare", "autorizzazione": "server_abac",
                "audit": "append_only", "mcp": "secondaria", "agents": "generico", "campo_extra": "rifiutata"}
    PERCHE_SCELTE = {
        "dominio": testo("BLUEPRINT §1.1", "BLUEPRINT §1.1"), "forma": testo("BLUEPRINT §4.1", "BLUEPRINT §4.1"),
        "autorizzazione": testo("BLUEPRINT §2 e §4.4", "BLUEPRINT §2 and §4.4"), "audit": testo("BLUEPRINT §2, vincoli", "BLUEPRINT §2, constraints"),
        "mcp": testo("BLUEPRINT §2, «Agentic ops»", "BLUEPRINT §2, «Agentic ops»"), "agents": testo("BOUNDARY-POLICY, regola 1", "BOUNDARY-POLICY, rule 1"),
        "campo_extra": testo("è il senso di un contratto chiuso", "that is the point of a closed contract"),
    }

    def controlli(self) -> list[Controllo]:
        return [
            self.controllo_scelte(42, testo("Lettura del blueprint (scelte)", "Blueprint reading (choices)"),
                                  testo("Ogni scelta ha la sua sezione fra parentesi nel verbale: rileggila nell'estratto.",
                                        "Each choice has its section in brackets in the report: reread it in the excerpt.")),
            Controllo("json_valido", testo("Lo schema è JSON valido", "The schema is valid JSON"), 8,
                      testo("Controlla virgole e virgolette: JSON non ammette commenti né virgole finali.",
                            "Check commas and quotes: JSON allows neither comments nor trailing commas."), self._c_json),
            Controllo("intestazione", testo("$schema, $id e title", "$schema, $id and title"), 10,
                      testo(f"Copia l'intestazione di contact-create-request: \"$schema\": \"{DRAFT}\", un $id che finisce con {SCHEMA} e \"title\": \"LeadCreateRequest\".",
                            f"Copy the contact-create-request header: \"$schema\": \"{DRAFT}\", an $id ending with {SCHEMA} and \"title\": \"LeadCreateRequest\"."),
                      self._c_intestazione),
            Controllo("obbligatori", testo("Campi obbligatori", "Required fields"), 15,
                      testo(f"\"required\": {json.dumps(OBBLIGATORI)}, e ognuno descritto in \"properties\".",
                            f"\"required\": {json.dumps(OBBLIGATORI)}, each one described in \"properties\"."), self._c_obbligatori),
            Controllo("tipi", testo("Ogni campo ha un tipo; email ha formato email", "Every field has a type; email has the email format"), 15,
                      testo("Ogni proprietà con \"type\"; per email anche \"format\": \"email\"; per le stringhe libere un \"maxLength\" (Nebula usa 255).",
                            "Every property with \"type\"; for email also \"format\": \"email\"; for free strings a \"maxLength\" (Nebula uses 255)."),
                      self._c_tipi),
            Controllo("chiuso", testo("Nessun campo in più ammesso", "No extra field allowed"), 10,
                      testo("\"additionalProperties\": false, come in tutti gli schemi di richiesta di Nebula.",
                            "\"additionalProperties\": false, as in all of Nebula's request schemas."), self._c_chiuso),
        ]

    @staticmethod
    def _schema(ctx) -> dict | None:
        try:
            dati = json.loads(ctx.foto["file"][SCHEMA])
        except ValueError:
            return None
        return dati if isinstance(dati, dict) else None

    def _con_schema(self, ctx, verifica) -> Esito:
        s = self._schema(ctx)
        if s is None:
            return Esito(False, testo("Lo schema non è un oggetto JSON valido.", "The schema is not a valid JSON object."))
        return verifica(s)

    def _c_json(self, ctx) -> Esito:
        return esito_si_no(self._schema(ctx) is not None, "JSON valido.", "Valid JSON.", "JSON non valido.", "Invalid JSON.")

    def _c_intestazione(self, ctx) -> Esito:
        def v(s):
            prove = [s.get("$schema") == DRAFT, str(s.get("$id", "")).endswith(SCHEMA), bool(str(s.get("title", "")).strip()),
                     s.get("type") == "object"]
            ok = sum(prove)
            return esito_si_no(ok == 4, "Intestazione completa e tipo oggetto.", "Complete header and object type.",
                               f"Intestazione: {ok} elementi su 4 ($schema draft-07, $id, title, type object).",
                               f"Header: {ok} items out of 4 ($schema draft-07, $id, title, type object).", None if ok == 4 else ok / 4)
        return self._con_schema(ctx, v)

    def _c_obbligatori(self, ctx) -> Esito:
        def v(s):
            req = s.get("required") if isinstance(s.get("required"), list) else []
            props = s.get("properties") if isinstance(s.get("properties"), dict) else {}
            mancano = [c for c in OBBLIGATORI if c not in req or c not in props]
            return esito_si_no(not mancano, f"Obbligatori: {', '.join(OBBLIGATORI)}.", f"Required: {', '.join(OBBLIGATORI)}.",
                               f"Non obbligatori o non descritti: {', '.join(mancano)}.", f"Not required or not described: {', '.join(mancano)}.",
                               None if not mancano else (len(OBBLIGATORI) - len(mancano)) / len(OBBLIGATORI))
        return self._con_schema(ctx, v)

    def _c_tipi(self, ctx) -> Esito:
        def v(s):
            props = s.get("properties") if isinstance(s.get("properties"), dict) else {}
            senza_tipo = [n for n, p in props.items() if not (isinstance(p, dict) and p.get("type"))]
            email = props.get("email") if isinstance(props.get("email"), dict) else {}
            nome = props.get("nome") if isinstance(props.get("nome"), dict) else {}
            prove = {"tipi": bool(props) and not senza_tipo, "email": email.get("format") == "email",
                     "lunghezza": isinstance(nome.get("maxLength"), int) and nome.get("maxLength") > 0}
            manca = [k for k, ok in prove.items() if not ok]
            it = {"tipi": f"campi senza type: {', '.join(senza_tipo) or 'nessun campo'}", "email": "email senza format email", "lunghezza": "nome senza maxLength"}
            en = {"tipi": f"fields without type: {', '.join(senza_tipo) or 'no field'}", "email": "email without email format", "lunghezza": "nome without maxLength"}
            return esito_si_no(not manca, "Tipi, formato email e lunghezza massima a posto.", "Types, email format and maximum length in place.",
                               "; ".join(it[k] for k in manca).capitalize() + ".", "; ".join(en[k] for k in manca).capitalize() + ".",
                               None if not manca else (3 - len(manca)) / 3)
        return self._con_schema(ctx, v)

    def _c_chiuso(self, ctx) -> Esito:
        return self._con_schema(ctx, lambda s: esito_si_no(
            s.get("additionalProperties") is False, "Contratto chiuso: additionalProperties false.", "Closed contract: additionalProperties false.",
            "Lo schema ammette campi in più.", "The schema allows extra fields."))


ESERCIZIO = CrmEnterprise()
