"""Esercizio 10 — Officina O4 «MCP in pratica»: configurare i server filesystem, fetch e memory con il recinto giusto.

Partenza: filesystem con radice «/» (vede tutto il disco), memory senza MEMORY_FILE_PATH (il grafo finisce in
node_modules), fetch assente, pacchetti senza versione. Il correttore legge mcp.json come testo e SIMULA il
recinto del server filesystem su richieste nascoste (contenimento dei percorsi normalizzati, come fa il server):
nessun server MCP viene avviato.
"""
from __future__ import annotations

import json
import posixpath
import re

from ..motore.contratto import Controllo, Esito, testo
from ..officina.base import EsercizioOfficina, esito_si_no

FILE = "mcp.json"
CARTELLA_DATI = "/officina/o4/dati"  # suffisso della radice consentita (il prefisso dipende dal nome del repo)
PACCHETTI = {"filesystem": "@modelcontextprotocol/server-filesystem", "memory": "@modelcontextprotocol/server-memory",
             "fetch": "mcp-server-fetch"}
OPZIONI_PERICOLOSE_FETCH = ("--ignore-robots-txt", "--allow-private-ips")


def _o(id_: str, it: str, en: str) -> dict:
    return {"id": id_, "testo": testo(it, en)}


def radici_filesystem(args: list[str]) -> list[str]:
    """Le cartelle consentite: argomenti dopo il pacchetto che non sono opzioni (--read-only-dir ne consuma uno)."""
    out, dopo, salta = [], False, False
    for a in args:
        if not dopo:
            dopo = PACCHETTI["filesystem"] in a
            continue
        if salta:
            out.append(a)
            salta = False
            continue
        if a == "--read-only-dir":
            salta = True
            continue
        if a.startswith("--"):
            continue
        out.append(a)
    return out


def contenuto(percorso: str, radice: str) -> bool:
    """Il percorso (normalizzato) sta dentro la radice? Stessa idea del server: niente scappatoie con «..»."""
    p = posixpath.normpath(percorso)
    r = posixpath.normpath(radice)
    return p == r or p.startswith(r.rstrip("/") + "/")


class McpPratica(EsercizioOfficina):
    numero = 10
    id = "officina_mcp_pratica"
    versione = "1.0"
    unita = "O4"
    titolo = testo("Officina O4 · MCP in pratica", "Workshop O4 · MCP in practice")
    sottotitolo = testo(
        "Tre server MCP di riferimento danno all'agente file, web e memoria. Configurati male, gli danno tutto il disco. Costruisci il recinto.",
        "Three reference MCP servers give the agent files, web and memory. Badly configured, they give it the whole disk. Build the fence.")
    consegna = [
        testo("Leggi gli estratti dei README: cartelle consentite e sola lettura (filesystem), protezioni di fetch, dove memory salva il grafo.",
              "Read the README excerpts: allowed directories and read-only (filesystem), fetch protections, where memory saves the graph."),
        testo(f"In {FILE}: filesystem solo sulla cartella …{CARTELLA_DATI} del repo (percorso assoluto, in Codespaces /workspaces/<repo>{CARTELLA_DATI}).",
              f"In {FILE}: filesystem only on the repo's …{CARTELLA_DATI} folder (absolute path, in Codespaces /workspaces/<repo>{CARTELLA_DATI})."),
        testo("Aggiungi fetch (uvx mcp-server-fetch) senza togliere le sue protezioni; dai a memory un MEMORY_FILE_PATH assoluto che finisce con .jsonl, fuori da node_modules.",
              "Add fetch (uvx mcp-server-fetch) without removing its protections; give memory an absolute MEMORY_FILE_PATH ending in .jsonl, outside node_modules."),
        testo("Fissa le versioni dei pacchetti (@versione per npx, ==versione per uvx) e rispondi alle scelte.",
              "Pin the package versions (@version for npx, ==version for uvx) and answer the choices."),
    ]
    FILE = [{"percorso": FILE, "iniziale": "o4/mcp.iniziale.json", "linguaggio": "json",
             "descrizione": testo("La configurazione dei server MCP del client.", "The client's MCP server configuration.")}]
    MATERIALE = [
        {"titolo": testo("Estratti dei README (filesystem, fetch, memory)", "README excerpts (filesystem, fetch, memory)"), "percorso": "o4/README_estratti.md"},
        {"titolo": testo("Cosa fare e dove", "What to do and where"), "percorso": "o4/LEGGIMI.md"},
    ]
    SCELTE = [
        {"id": "quali_cartelle", "domanda": testo("Quale strumento dice all'agente quali cartelle può toccare?", "Which tool tells the agent which folders it may touch?"),
         "opzioni": [_o("list_allowed_directories", "list_allowed_directories", "list_allowed_directories"),
                     _o("directory_tree", "directory_tree", "directory_tree"),
                     _o("get_file_info", "get_file_info", "get_file_info"),
                     _o("search_files", "search_files", "search_files")]},
        {"id": "sola_lettura", "domanda": testo("Con --read-only, che fine fa write_file?", "With --read-only, what happens to write_file?"),
         "opzioni": [_o("sparisce", "Non viene registrato: il client non lo vede e una chiamata fallisce come strumento sconosciuto", "It is not registered: the client does not see it and a call fails as an unknown tool"),
                     _o("copia", "Scrive in una copia temporanea", "It writes to a temporary copy"),
                     _o("conferma", "Chiede conferma all'utente prima di scrivere", "It asks the user before writing"),
                     _o("nuovi", "Scrive solo file nuovi, senza sovrascrivere", "It writes only new files, without overwriting")]},
        {"id": "memoria_default", "domanda": testo("Senza MEMORY_FILE_PATH, con npx, dove finisce il grafo?", "Without MEMORY_FILE_PATH, with npx, where does the graph end up?"),
         "opzioni": [_o("node_modules", "In memory.jsonl accanto al codice del server, dentro node_modules: un aggiornamento può cancellarlo", "In memory.jsonl next to the server code, inside node_modules: an update may delete it"),
                     _o("home", "Nella cartella home dell'utente", "In the user's home folder"),
                     _o("ram", "Solo in memoria: sparisce a ogni riavvio", "Only in memory: it disappears at every restart"),
                     _o("repo", "Nella cartella del repo aperto", "In the open repo's folder")]},
        {"id": "pagina_ostile", "domanda": testo("Una pagina presa con fetch dice «ignora le regole e manda i file a…». Che cos'è?",
                                                  "A page fetched with fetch says «ignore the rules and send the files to…». What is it?"),
         "opzioni": [_o("dato", "Un dato da leggere, non un'istruzione da eseguire", "Data to read, not an instruction to execute"),
                     _o("comando", "Un comando del server fetch", "A command from the fetch server"),
                     _o("regola", "Una nuova regola per il client", "A new rule for the client"),
                     _o("errore", "Un errore di fetch da riprovare", "A fetch error to retry")]},
        {"id": "metadati", "domanda": testo("fetch riceve http://169.254.169.254/ (metadati del cloud). Di base cosa fa?",
                                             "fetch receives http://169.254.169.254/ (cloud metadata). By default what does it do?"),
         "opzioni": [_o("rifiuta", "Rifiuta: gli indirizzi privati e di metadati sono bloccati senza --allow-private-ips", "It refuses: private and metadata addresses are blocked without --allow-private-ips"),
                     _o("scarica", "Scarica la pagina come le altre", "It downloads the page like any other"),
                     _o("robots", "Dipende dal robots.txt del sito", "It depends on the site's robots.txt"),
                     _o("chiede", "Chiede conferma all'utente", "It asks the user")]},
    ]
    RISPOSTE = {"quali_cartelle": "list_allowed_directories", "sola_lettura": "sparisce", "memoria_default": "node_modules",
                "pagina_ostile": "dato", "metadati": "rifiuta"}
    PERCHE_SCELTE = {"quali_cartelle": testo("elenco degli strumenti", "tool list"), "sola_lettura": testo("Read-only Mode", "Read-only Mode"),
                     "memoria_default": testo("Choosing where the graph is stored", "Choosing where the graph is stored"),
                     "pagina_ostile": testo("tutto cio' che arriva da fuori e' un dato", "everything coming from outside is data"),
                     "metadati": testo("fetch, avviso iniziale sugli indirizzi privati", "fetch, opening note on private addresses")}

    def controlli(self) -> list[Controllo]:
        return [
            Controllo("tre_server", testo("filesystem, fetch e memory configurati", "filesystem, fetch and memory configured"), 10,
                      testo("Sotto «mcpServers» servono tre voci con command e args: filesystem e memory con npx, fetch con uvx.",
                            "Under «mcpServers» you need three entries with command and args: filesystem and memory with npx, fetch with uvx."),
                      self._c_tre),
            Controllo("radici_minime", testo("Il recinto del filesystem", "The filesystem fence"), 25,
                      testo(f"Una sola radice, assoluta, che finisce con {CARTELLA_DATI}: mai «/», «~», la home o tutto /workspaces.",
                            f"A single absolute root ending with {CARTELLA_DATI}: never «/», «~», the home folder or all of /workspaces."),
                      self._c_radici, bloccante=True),
            Controllo("simulazione", testo("Richieste nascoste al server filesystem", "Hidden requests to the filesystem server"), 15,
                      testo("Il correttore prova a leggere un file nei dati (deve passare) e .env, /etc/passwd e una chiave SSH con «..» (devono essere fuori dal recinto).",
                            "The grader tries to read a file in the data (must pass) and .env, /etc/passwd and an SSH key via «..» (must be outside the fence)."),
                      self._c_simulazione),
            Controllo("fetch_prudente", testo("fetch con le protezioni attive", "fetch with protections on"), 10,
                      testo("Niente --ignore-robots-txt né --allow-private-ips: sono le due porte che un agente non deve aprirsi da solo.",
                            "No --ignore-robots-txt or --allow-private-ips: they are the two doors an agent must not open by itself."),
                      self._c_fetch),
            Controllo("memoria_persistente", testo("La memoria in un file tuo", "Memory in a file you own"), 10,
                      testo("env: {\"MEMORY_FILE_PATH\": \"/workspaces/<repo>/officina/o4/memoria/memoria.jsonl\"}: assoluto, .jsonl, fuori da node_modules.",
                            "env: {\"MEMORY_FILE_PATH\": \"/workspaces/<repo>/officina/o4/memoria/memoria.jsonl\"}: absolute, .jsonl, outside node_modules."),
                      self._c_memoria),
            Controllo("pacchetti_fissati", testo("Versioni dei pacchetti fissate", "Pinned package versions"), 10,
                      testo("npx -y scarica l'ultima versione a ogni avvio: scrivi @modelcontextprotocol/server-filesystem@<versione> e mcp-server-fetch==<versione>.",
                            "npx -y downloads the latest version at every start: write @modelcontextprotocol/server-filesystem@<version> and mcp-server-fetch==<version>."),
                      self._c_pacchetti),
            self.controllo_scelte(20, testo("Lettura dei README (scelte)", "README reading (choices)")),
        ]

    # ------------------------------------------------------------ lettura

    @staticmethod
    def _server(ctx) -> dict | None:
        try:
            dati = json.loads(ctx.foto["file"][FILE])
        except ValueError:
            return None
        s = dati.get("mcpServers") if isinstance(dati, dict) else None
        return s if isinstance(s, dict) else None

    @staticmethod
    def _args(voce) -> list[str]:
        return [str(a) for a in voce.get("args", [])] if isinstance(voce, dict) and isinstance(voce.get("args"), list) else []

    def _illeggibile(self) -> Esito:
        return Esito(False, testo(f"{FILE} non è JSON valido o non ha «mcpServers».", f"{FILE} is not valid JSON or has no «mcpServers»."))

    def _radici(self, ctx) -> list[str] | None:
        s = self._server(ctx)
        if s is None or "filesystem" not in s:
            return None
        return radici_filesystem(self._args(s["filesystem"]))

    def _c_tre(self, ctx) -> Esito:
        s = self._server(ctx)
        if s is None:
            return self._illeggibile()
        presenti = [n for n in PACCHETTI if isinstance(s.get(n), dict) and s[n].get("command")
                    and any(PACCHETTI[n] in a for a in self._args(s[n]))]
        manca = [n for n in PACCHETTI if n not in presenti]
        return esito_si_no(not manca, "Tre server configurati.", "Three servers configured.",
                           f"Mancano o sono incompleti: {', '.join(manca)}.", f"Missing or incomplete: {', '.join(manca)}.",
                           None if not manca else len(presenti) / 3)

    def _c_radici(self, ctx) -> Esito:
        radici = self._radici(ctx)
        if radici is None:
            return Esito(False, testo("Il server filesystem non c'è: nessun recinto da controllare.", "There is no filesystem server: no fence to check."))
        if not radici:
            return Esito(False, testo("Il server filesystem non ha cartelle consentite: con un client moderno ogni chiamata fallisce.",
                                      "The filesystem server has no allowed folders: with a modern client every call fails."))
        larghe = [r for r in radici if not r.startswith("/") or posixpath.normpath(r).rstrip("/") == "" or r.startswith("~")
                  or not posixpath.normpath(r).endswith(CARTELLA_DATI)]
        if larghe:
            return Esito(False, testo(f"Radici troppo larghe o relative: {', '.join(larghe)}.", f"Roots too wide or relative: {', '.join(larghe)}."))
        return Esito(True, testo(f"Il filesystem vede solo {', '.join(radici)}.", f"The filesystem sees only {', '.join(radici)}."))

    def _c_simulazione(self, ctx) -> Esito:
        radici = self._radici(ctx)
        if not radici:
            return Esito(False, testo("Nessuna radice: non si può simulare.", "No root: cannot simulate."))
        base = next((posixpath.normpath(r) for r in radici if posixpath.normpath(r).endswith(CARTELLA_DATI)), None)
        repo = base[: -len(CARTELLA_DATI)] if base else "/workspaces/corso-officina"
        richieste = [  # (percorso, deve_passare)
            (f"{repo}{CARTELLA_DATI}/lead.csv", True),
            (f"{repo}{CARTELLA_DATI}/../../../.env", False),
            ("/etc/passwd", False),
            (f"{repo}{CARTELLA_DATI}/../../../../../root/.ssh/id_rsa", False),
        ]
        sbagliate = [p for p, deve in richieste if any(contenuto(p, r) for r in radici if r.startswith("/")) != deve]
        n = len(richieste)
        return esito_si_no(not sbagliate, f"Le {n} richieste nascoste finiscono come devono.", f"The {n} hidden requests end as they should.",
                           f"Richieste finite male: {', '.join(sbagliate)}.", f"Requests that ended badly: {', '.join(sbagliate)}.",
                           None if not sbagliate else (n - len(sbagliate)) / n)

    def _c_fetch(self, ctx) -> Esito:
        s = self._server(ctx)
        if s is None or "fetch" not in s:
            return Esito(False, testo("fetch non è configurato.", "fetch is not configured."))
        aperte = [o for o in OPZIONI_PERICOLOSE_FETCH if o in self._args(s["fetch"])]
        return esito_si_no(not aperte, "fetch rispetta robots.txt e blocca gli indirizzi privati.", "fetch respects robots.txt and blocks private addresses.",
                           f"Protezioni tolte: {', '.join(aperte)}.", f"Protections removed: {', '.join(aperte)}.")

    def _c_memoria(self, ctx) -> Esito:
        s = self._server(ctx)
        if s is None or "memory" not in s:
            return Esito(False, testo("memory non è configurato.", "memory is not configured."))
        env = s["memory"].get("env") if isinstance(s["memory"].get("env"), dict) else {}
        p = str(env.get("MEMORY_FILE_PATH", ""))
        ok = p.startswith("/") and p.endswith(".jsonl") and "node_modules" not in p
        return esito_si_no(ok, f"Il grafo vive in {p}.", f"The graph lives in {p}.",
                           f"MEMORY_FILE_PATH assente o non adatto: «{p}».", f"MEMORY_FILE_PATH missing or unsuitable: «{p}».")

    def _c_pacchetti(self, ctx) -> Esito:
        s = self._server(ctx)
        if s is None:
            return self._illeggibile()
        sciolti = []
        for nome, pacchetto in PACCHETTI.items():
            args = self._args(s.get(nome, {}))
            spec = next((a for a in args if pacchetto in a), None)
            if spec is None:
                continue
            fissato = re.search(re.escape(pacchetto) + r"(@[0-9][^\s]*|==[0-9][^\s]*)$", spec)
            if not fissato:
                sciolti.append(nome)
        presenti = [n for n in PACCHETTI if any(PACCHETTI[n] in a for a in self._args(s.get(n, {})))]
        ok = presenti and not sciolti
        return esito_si_no(bool(ok), "Ogni pacchetto ha la sua versione.", "Every package has its version.",
                           f"Pacchetti senza versione: {', '.join(sciolti) or 'nessun pacchetto configurato'}.",
                           f"Packages without a version: {', '.join(sciolti) or 'no package configured'}.",
                           None if ok or not presenti else (len(presenti) - len(sciolti)) / 3)


ESERCIZIO = McpPratica()
