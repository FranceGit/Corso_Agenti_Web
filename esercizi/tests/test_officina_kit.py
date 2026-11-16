"""Kit Codespaces: codespaces_modello allineata alle fonti, senza chiavi ne' corso; PUBBLICA_OFFICINA.cmd sicuro."""
from __future__ import annotations

import importlib.util
import json
import re
import subprocess
import sys

import pytest

from corso.config import RADICE_PROGETTO
from esercizi.officina import analisi as A

MODELLO = RADICE_PROGETTO / "codespaces_modello"
CMD = RADICE_PROGETTO / "PUBBLICA_OFFICINA.cmd"


def _prepara():
    spec = importlib.util.spec_from_file_location("prepara_codespaces", RADICE_PROGETTO / "strumenti" / "prepara_codespaces.py")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def test_codespaces_modello_allineata_alle_fonti():
    m = _prepara()
    assert m.differenze(m.piano()) == [], "rigenera con: python strumenti/prepara_codespaces.py"


def test_contenuto_del_repo_studente():
    presenti = {p.relative_to(MODELLO).as_posix() for p in MODELLO.rglob("*") if p.is_file() and "__pycache__" not in p.parts}
    for atteso in (".devcontainer/devcontainer.json", "README.md", "requirements.txt", ".gitignore", "assistente/__init__.py",
                   "assistente/assistente.json", "strumenti/pacchetto.py", "officina/banco_classificatore.py",
                   "officina/o2/crm_adottato/app/agents/response_classifier.py", "officina/o2/PROVENIENZA.md",
                   "officina/o4/mcp.json", "officina/o6/devcontainer.json", "tests/test_assistente.py"):
        assert atteso in presenti, atteso
    # solo esercizi e assistente: niente corso, portale, domande o lezioni
    assert not any(p.startswith(("corso/", "dati/", "webapp/", "config/", "stato_")) for p in presenti)
    assert not any(p.endswith(".git") or "/.git/" in p for p in presenti)


def test_nessuna_chiave_nel_repo_studente_e_nella_radice():
    for f in list(MODELLO.rglob("*")) + [CMD, RADICE_PROGETTO / "esercizi" / "assistente" / "assistente.json"]:
        if f.is_file() and f.suffix not in (".pyc",):
            assert A.segreti_nel_testo(f.read_text(encoding="utf-8", errors="replace")) == [], f


def test_devcontainer_del_kit_rispetta_le_regole_dell_esercizio_12():
    d = A.carica_jsonc((MODELLO / ".devcontainer" / "devcontainer.json").read_text(encoding="utf-8"))["dati"]
    assert A.tag_fissato(d["image"]) and "latest" not in d["image"]
    assert d["hostRequirements"]["cpus"] <= 2 and "-r requirements.txt" in d["postCreateCommand"]
    assert any("docker-in-docker" in k for k in d["features"]) and "description" in d["secrets"]["GROQ_API_KEY"]
    assert "containerEnv" not in d and "remoteEnv" not in d


def test_requisiti_del_kit_fissati():
    req = A.requisiti((MODELLO / "requirements.txt").read_text(encoding="utf-8"))
    assert req and all(r["fissato"] for r in req)


def test_gitignore_del_kit_tiene_fuori_i_segreti():
    righe = (MODELLO / ".gitignore").read_text(encoding="utf-8").splitlines()
    assert ".env" in righe and "consegne/" in righe


def test_test_del_repo_studente_girano_senza_rete(tmp_path):
    """I test dell'assistente nel repo studente passano; quelli di O2 falliscono finche' il difetto c'e' (voluto)."""
    env = {"PATH": "", "SYSTEMROOT": __import__("os").environ.get("SYSTEMROOT", "")}
    r = subprocess.run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", "tests"], cwd=MODELLO,
                       capture_output=True, text=True, timeout=120, env=env)
    assert r.returncode == 0, r.stdout + r.stderr
    r = subprocess.run([sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", "officina/o2"], cwd=MODELLO,
                       capture_output=True, text=True, timeout=120, env=env)
    assert r.returncode == 1 and "test_not_interested_resta_not_interested" in r.stdout
    for cache in MODELLO.rglob("__pycache__"):
        for f in cache.iterdir():
            f.unlink()
        cache.rmdir()


def test_pacchetto_del_repo_studente(tmp_path, monkeypatch):
    spec = importlib.util.spec_from_file_location("pacchetto", MODELLO / "strumenti" / "pacchetto.py")
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    p = m.pacchetto("o1")
    assert p["formato"] == "consegna-officina/1" and p["esercizio"] == 7 and set(p["file"]) == {"Dockerfile", "docker-compose.yml"}
    assert [m.UNITA[u][0] for u in ("o1", "o2", "o3", "o4", "o5", "o6")] == [7, 8, 9, 10, 11, 12]
    with pytest.raises(SystemExit, match=r"\.env\.example"):
        m.pacchetto("o2")  # va creato dallo studente copiando env.example.iniziale
    with pytest.raises(SystemExit):
        m.pacchetto("o9")
    # una chiave nei file ferma il pacchetto
    finto = tmp_path / "officina" / "o4"
    finto.mkdir(parents=True)
    (finto / "mcp.json").write_text('{"k": "gsk_' + "x" * 30 + '"}', encoding="utf-8")
    monkeypatch.setattr(m, "RADICE", tmp_path)
    with pytest.raises(SystemExit, match="chiave"):
        m.pacchetto("o4")


# ---------------------------------------------------------------- PUBBLICA_OFFICINA.cmd


def test_pubblica_officina_segnaposto_e_token_mai_stampato():
    testo = CMD.read_text(encoding="ascii")
    righe = [r.strip() for r in testo.replace("\r\n", "\n").split("\n")]
    assert righe[0].lower() == "@echo off"
    assert 'set "OFFICINA_TOKEN=<INCOLLA_QUI_IL_TOKEN_GITHUB>"' in righe
    assert "FranceGit" in testo and "corso-officina" in testo and 'set "VISIBILITA=private"' in righe
    # nessuna riga che stampi il token (echo, o comandi senza redirezione che lo contengano nei parametri visibili)
    for r in righe:
        if r.lower().startswith("rem") or not r:
            continue
        if re.match(r"(?i)^(@?echo|>.*echo)", r):
            assert "OFFICINA_TOKEN%" not in r and "GH_TOKEN%" not in r and "OFFICINA_GITHUB_TOKEN%" not in r, r
    # il token non entra nell'URL del remoto: niente https://<qualcosa>@github.com
    assert not re.search(r"https://[^\s\"/]*@github\.com", testo)
    # i comandi git che toccano la rete sono zittiti, il token arriva dall'aiutante delle credenziali
    for r in righe:
        if re.match(r"^git .*(clone|push)", r):
            assert "credential.helper=%AIUTANTE%" in r and r.endswith(">nul 2>&1"), r
    assert "$OFFICINA_TOKEN" in testo and "push --force" not in testo and " -f " not in testo
    assert 'set "OFFICINA_TOKEN="' in righe  # pulizia finale


def test_pubblica_officina_blocchi_if_sintatticamente_sicuri():
    """Dentro un blocco if (...) una echo con parentesi non protette chiuderebbe il blocco prima del tempo."""
    profondita = 0
    for r in CMD.read_text(encoding="ascii").replace("\r\n", "\n").split("\n"):
        s = r.strip()
        if not s or s.lower().startswith("rem"):
            continue
        if profondita and s.lower().startswith("echo"):
            assert not re.search(r"(?<!\^)[()]", s), s
        if s.startswith(")"):
            profondita -= 1
        if re.search(r"\(\s*$", s):
            profondita += 1
    assert profondita == 0


def test_gitattributes_crlf_per_i_cmd():
    assert "*.cmd text eol=crlf" in (RADICE_PROGETTO / ".gitattributes").read_text(encoding="utf-8")
