"""Analisi STATICHE dei file che lo studente consegna nell'Officina: nessun file viene eseguito.

Dockerfile, docker-compose.yml, requirements.txt, JSON con commenti (devcontainer.json), ricerca di segreti.
Ogni funzione e' pura (testo -> dati) e non solleva mai su un file scritto male: restituisce un esito leggibile
(es. {"errore": "..."}), perche' un file rotto e' un risultato da correggere, non un guasto del correttore.
"""
from __future__ import annotations

import json
import re
import shlex

# ---------------------------------------------------------------- segreti

# Forme tipiche di chiavi vere. Volutamente prudente: meglio un falso allarme che una chiave nel repo.
SCHEMI_SEGRETI = {
    "groq": re.compile(r"gsk_[A-Za-z0-9]{20,}"),
    "github_classico": re.compile(r"gh[pousr]_[A-Za-z0-9]{30,}"),
    "github_fine": re.compile(r"github_pat_[A-Za-z0-9_]{30,}"),
    "openai_simile": re.compile(r"sk-[A-Za-z0-9_-]{20,}"),
    "aws": re.compile(r"AKIA[0-9A-Z]{16}"),
    "chiave_privata": re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
}
NOME_SEGRETO = re.compile(r"(KEY|TOKEN|SECRET|PASSWORD|PASSWD|CHIAVE)", re.IGNORECASE)
# Valori che dichiarano di NON essere una chiave (segnaposto, rimando a una variabile, vuoto)
SEGNAPOSTO = re.compile(r"^(|<[^>]*>|\$\{[^}]*\}|\$[A-Z_][A-Z0-9_]*|changeme|xxx+|\.\.\.)$", re.IGNORECASE)


def segreti_nel_testo(testo: str) -> list[str]:
    """Nomi degli schemi di chiave trovati nel testo (mai la chiave stessa)."""
    return sorted(nome for nome, rx in SCHEMI_SEGRETI.items() if rx.search(testo or ""))


def valore_sembra_segreto(nome: str, valore) -> bool:
    """Una variabile dal nome «da segreto» con un valore che non e' un segnaposto dichiarato."""
    if not NOME_SEGRETO.search(nome or ""):
        return False
    v = "" if valore is None else str(valore).strip().strip("'\"")
    return not SEGNAPOSTO.match(v)


# ---------------------------------------------------------------- Dockerfile


def istruzioni_dockerfile(testo: str) -> list[tuple[str, str]]:
    """[(ISTRUZIONE, argomenti)] con le righe continuate da '\\' unite e i commenti tolti."""
    righe, buffer = [], ""
    for grezza in (testo or "").splitlines():
        riga = grezza.rstrip()
        if not buffer and (not riga.strip() or riga.lstrip().startswith("#")):
            continue
        if riga.endswith("\\"):
            buffer += riga[:-1] + " "
            continue
        buffer += riga
        righe.append(buffer.strip())
        buffer = ""
    if buffer.strip():
        righe.append(buffer.strip())
    out = []
    for r in righe:
        parti = r.split(None, 1)
        out.append((parti[0].upper(), parti[1].strip() if len(parti) > 1 else ""))
    return out


def immagine_base(istruzioni: list[tuple[str, str]]) -> str | None:
    """Immagine dell'ULTIMO FROM (quella che va in produzione), senza 'AS nome' e senza --platform."""
    froms = [a for i, a in istruzioni if i == "FROM"]
    if not froms:
        return None
    parti = [p for p in froms[-1].split() if not p.startswith("--")]
    return parti[0] if parti else None


def tag_fissato(immagine: str | None) -> bool:
    """Tag esplicito diverso da 'latest' (o digest sha256)."""
    if not immagine:
        return False
    if "@sha256:" in immagine:
        return True
    nome = immagine.rsplit("/", 1)[-1]
    if ":" not in nome:
        return False
    return nome.split(":", 1)[1].lower() not in ("latest", "")


def versione_python(immagine: str | None) -> tuple[int, int] | None:
    """(3, 12) da python:3.12-slim; None se l'immagine non e' una python con versione leggibile."""
    if not immagine:
        return None
    m = re.search(r"python:(\d+)\.(\d+)", immagine)
    return (int(m.group(1)), int(m.group(2))) if m else None


def _sorgenti_copy(argomenti: str) -> list[str]:
    try:
        parti = json.loads(argomenti) if argomenti.startswith("[") else shlex.split(argomenti)
    except (ValueError, json.JSONDecodeError):
        parti = argomenti.split()
    parti = [p for p in parti if not str(p).startswith("--")]
    return [str(p) for p in parti[:-1]]


def ordine_strati(istruzioni: list[tuple[str, str]], file_requisiti: str = "requirements.txt") -> dict:
    """Le dipendenze si installano PRIMA di copiare tutto il codice (la cache resta valida se cambia solo il codice)."""
    idx_pip = next((k for k, (i, a) in enumerate(istruzioni) if i == "RUN" and "pip" in a and file_requisiti in a), None)
    idx_copia_req = next((k for k, (i, a) in enumerate(istruzioni) if i in ("COPY", "ADD")
                          and any(s.rstrip("/").endswith(file_requisiti) for s in _sorgenti_copy(a))), None)
    idx_tutto = next((k for k, (i, a) in enumerate(istruzioni) if i in ("COPY", "ADD")
                      and any(s in (".", "./", "*") for s in _sorgenti_copy(a))), None)
    ok = (idx_pip is not None and idx_copia_req is not None and idx_copia_req < idx_pip
          and (idx_tutto is None or idx_tutto > idx_pip))
    return {"ok": ok, "pip": idx_pip, "copia_requisiti": idx_copia_req, "copia_tutto": idx_tutto}


def utente_finale(istruzioni: list[tuple[str, str]]) -> str | None:
    utenti = [a.split(":")[0].strip() for i, a in istruzioni if i == "USER"]
    return utenti[-1] if utenti else None


def non_root(istruzioni: list[tuple[str, str]]) -> bool:
    u = utente_finale(istruzioni)
    return u is not None and u not in ("root", "0")


def segreti_dockerfile(istruzioni: list[tuple[str, str]]) -> list[str]:
    """Nomi delle variabili ENV/ARG «da segreto» con un valore scritto nel file (finirebbero nell'immagine)."""
    trovati = []
    for i, a in istruzioni:
        if i not in ("ENV", "ARG"):
            continue
        coppie = re.findall(r"([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(\"[^\"]*\"|'[^']*'|\S+)", a)
        if not coppie and i == "ENV":  # forma vecchia: ENV NOME valore
            parti = a.split(None, 1)
            if len(parti) == 2:
                coppie = [(parti[0], parti[1])]
        for nome, valore in coppie:
            if valore_sembra_segreto(nome, valore):
                trovati.append(nome)
    return trovati


def ha_healthcheck(istruzioni: list[tuple[str, str]]) -> bool:
    return any(i == "HEALTHCHECK" and not a.upper().startswith("NONE") for i, a in istruzioni)


# ---------------------------------------------------------------- compose


def carica_yaml(testo: str) -> dict:
    """{"dati": ...} oppure {"errore": "..."}. Serve PyYAML (requirements.txt)."""
    try:
        import yaml  # PyYAML: MIT
    except ImportError as e:  # pragma: no cover - dipende dall'installazione
        raise RuntimeError("serve PyYAML per leggere docker-compose.yml: pip install -r requirements.txt") from e
    try:
        dati = yaml.safe_load(testo or "")
    except yaml.YAMLError as e:
        return {"errore": f"YAML non valido: {str(e).splitlines()[0]}"}
    if not isinstance(dati, dict):
        return {"errore": "il file non descrive un oggetto (servono almeno 'services:')"}
    return {"dati": dati}


def servizio(compose: dict, nome: str) -> dict | None:
    s = (compose.get("services") or {}).get(nome)
    return s if isinstance(s, dict) else None


def porte_pubblicate(serv: dict) -> list[dict]:
    """[{ip, host, container}] dalle forme corte ("127.0.0.1:8000:8000", "8000:8000", "8000") e lunghe."""
    out = []
    for p in serv.get("ports") or []:
        if isinstance(p, dict):
            out.append({"ip": str(p.get("host_ip", "")), "host": str(p.get("published", "")), "container": str(p.get("target", ""))})
            continue
        testo = str(p).split("/")[0]
        parti = testo.rsplit(":", 2) if testo.count(":") >= 2 else testo.split(":")
        if len(parti) == 3:
            out.append({"ip": parti[0].strip("[]"), "host": parti[1], "container": parti[2]})
        elif len(parti) == 2:
            out.append({"ip": "", "host": parti[0], "container": parti[1]})
        else:
            out.append({"ip": "", "host": "", "container": parti[0]})
    return out


def volumi_servizio(serv: dict) -> list[dict]:
    """[{sorgente, destinazione, tipo}] con tipo 'nominato' | 'cartella' | 'anonimo'."""
    out = []
    for v in serv.get("volumes") or []:
        if isinstance(v, dict):
            sorg, dest = str(v.get("source", "")), str(v.get("target", ""))
        else:
            parti = str(v).split(":")
            if len(parti) == 1:
                sorg, dest = "", parti[0]
            elif len(parti) >= 3 and len(parti[0]) == 1:  # C:\cartella:/dest su Windows
                sorg, dest = parti[0] + ":" + parti[1], parti[2]
            else:
                sorg, dest = parti[0], parti[1]
        tipo = "anonimo" if not sorg else ("cartella" if sorg.startswith((".", "/", "~")) or ":" in sorg else "nominato")
        out.append({"sorgente": sorg, "destinazione": dest.rstrip("/"), "tipo": tipo})
    return out


def variabili_servizio(serv: dict) -> dict:
    env = serv.get("environment") or {}
    if isinstance(env, list):
        coppie = {}
        for voce in env:
            nome, _, valore = str(voce).partition("=")
            coppie[nome] = valore if "=" in str(voce) else None
        return coppie
    return {str(k): v for k, v in env.items()} if isinstance(env, dict) else {}


# ---------------------------------------------------------------- requirements.txt


def requisiti(testo: str) -> list[dict]:
    """[{nome (minuscolo, '_' -> '-'), fissato (==), riga}] saltando commenti, righe vuote e opzioni (-r, --index-url)."""
    out = []
    for grezza in (testo or "").splitlines():
        riga = grezza.split("#", 1)[0].strip()
        if not riga or riga.startswith("-"):
            continue
        m = re.match(r"^([A-Za-z0-9][A-Za-z0-9._-]*)(\[[^\]]*\])?\s*(.*)$", riga)
        if not m:
            continue
        vincolo = m.group(3).split(";")[0].strip()
        out.append({"nome": m.group(1).lower().replace("_", "-"), "fissato": bool(re.match(r"^===?\s*[0-9]", vincolo)), "riga": riga})
    return out


# ---------------------------------------------------------------- JSON con commenti (devcontainer.json)


def carica_jsonc(testo: str) -> dict:
    """JSON con commenti // e /* */ e virgole finali (il formato di devcontainer.json). {"dati"} o {"errore"}."""
    t = testo or ""
    out, i, n, in_str = [], 0, len(t), False
    while i < n:
        c = t[i]
        if in_str:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(t[i + 1])
                i += 2
                continue
            if c == '"':
                in_str = False
            i += 1
            continue
        if c == '"':
            in_str = True
            out.append(c)
            i += 1
        elif t.startswith("//", i):
            j = t.find("\n", i)
            i = n if j < 0 else j
        elif t.startswith("/*", i):
            j = t.find("*/", i + 2)
            i = n if j < 0 else j + 2
        else:
            out.append(c)
            i += 1
    pulito = re.sub(r",(\s*[}\]])", r"\1", "".join(out))
    try:
        dati = json.loads(pulito)
    except json.JSONDecodeError as e:
        return {"errore": f"JSON non valido alla riga {e.lineno}: {e.msg}"}
    if not isinstance(dati, dict):
        return {"errore": "serve un oggetto JSON { ... }"}
    return {"dati": dati}
