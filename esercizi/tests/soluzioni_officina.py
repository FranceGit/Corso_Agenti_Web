"""Soluzioni di riferimento degli esercizi dell'Officina (7-12), applicate con le STESSE azioni del browser."""
from __future__ import annotations

import json
from pathlib import Path

from corso.config import RADICE_PROGETTO

DOCKERFILE_O1 = """FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd --create-home officina && mkdir -p /app/dati && chown -R officina /app/dati
USER officina
EXPOSE 8000
HEALTHCHECK CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/salute')"
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
"""
COMPOSE_O1 = """services:
  crm:
    build: .
    ports:
      - "127.0.0.1:8000:8000"
    volumes:
      - dati_crm:/app/dati
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/salute')"]
      interval: 30s
    restart: unless-stopped
volumes:
  dati_crm:
"""
CLASSIFICATORE_ORIGINALE = (RADICE_PROGETTO / "esercizi/officina/materiale/o2/crm_adottato/app/agents/response_classifier.py").read_text(encoding="utf-8")
VECCHIO_IF = '''            if "Interested" in status_str:
                status = EmailStatus.INTERESTED
            elif "Not Interested" in status_str:
                status = EmailStatus.NOT_INTERESTED'''
NUOVO_IF = '''            etichetta = str(status_str).strip().lower()
            if "not interested" in etichetta:
                status = EmailStatus.NOT_INTERESTED
            elif "interested" in etichetta:
                status = EmailStatus.INTERESTED'''
SOLO_ORDINE = '''            if "Not Interested" in status_str:
                status = EmailStatus.NOT_INTERESTED
            elif "Interested" in status_str:
                status = EmailStatus.INTERESTED'''
assert VECCHIO_IF in CLASSIFICATORE_ORIGINALE
CLASSIFICATORE_GIUSTO = CLASSIFICATORE_ORIGINALE.replace(VECCHIO_IF, NUOVO_IF)
CLASSIFICATORE_SOLO_ORDINE = CLASSIFICATORE_ORIGINALE.replace(VECCHIO_IF, SOLO_ORDINE)
REQUISITI_O2 = """fastapi==0.115.6
uvicorn==0.34.0
pandas==2.2.3
pydantic==2.10.4
pydantic-settings==2.7.1
python-dotenv==1.0.1
groq==0.13.1
"""
DOCKERFILE_O2 = """FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN useradd --create-home crm && chown -R crm /app
USER crm
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
"""
COMPOSE_O2 = """services:
  app:
    build: .
    ports:
      - "127.0.0.1:8000:8000"
    env_file:
      - .env
    volumes:
      - ./data:/app/data
      - ./reports:/app/reports
    depends_on:
      - mailpit
    environment:
      - SMTP_HOST=mailpit
      - SMTP_PORT=1025
  mailpit:
    image: axllent/mailpit:v1.20.0
    ports:
      - "127.0.0.1:8025:8025"
"""
ENV_O2 = """# Copia in .env e metti la tua chiave li' (il .env non va mai nel repo)
GROQ_API_KEY=
SMTP_HOST=mailpit
SMTP_PORT=1025
"""
SCHEMA_O3 = json.dumps({
    "$schema": "http://json-schema.org/draft-07/schema#",
    "$id": "https://officina.local/schemas/lead-create-request.schema.json",
    "title": "LeadCreateRequest", "description": "Richiesta di creazione di un lead.", "type": "object",
    "required": ["nome", "email", "azienda"],
    "properties": {"nome": {"type": "string", "minLength": 1, "maxLength": 255},
                   "email": {"type": "string", "format": "email"},
                   "azienda": {"type": "string", "minLength": 1, "maxLength": 255},
                   "ruolo": {"type": "string", "maxLength": 100}},
    "additionalProperties": False}, indent=2)
REPO = "/workspaces/corso-officina"
MCP_O4 = json.dumps({"mcpServers": {
    "filesystem": {"command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem@2026.1.0", f"{REPO}/officina/o4/dati"]},
    "fetch": {"command": "uvx", "args": ["mcp-server-fetch==2026.1.0"]},
    "memory": {"command": "npx", "args": ["-y", "@modelcontextprotocol/server-memory@2026.1.0"],
               "env": {"MEMORY_FILE_PATH": f"{REPO}/officina/o4/memoria/memoria.jsonl"}}}}, indent=2)
ASSISTENTE_O5 = (RADICE_PROGETTO / "esercizi/assistente/assistente.json").read_text(encoding="utf-8")
DEVCONTAINER_O6 = (RADICE_PROGETTO / "strumenti/codespaces/devcontainer.json").read_text(encoding="utf-8")

SOLUZIONI = {
    7: ({"Dockerfile": DOCKERFILE_O1, "docker-compose.yml": COMPOSE_O1}, {"dati_senza_volume": "zero", "cambio_codice": "dalla_copia_codice"}),
    8: ({"app/agents/response_classifier.py": CLASSIFICATORE_GIUSTO, "requirements.txt": REQUISITI_O2, "Dockerfile": DOCKERFILE_O2,
         "docker-compose.yml": COMPOSE_O2, ".env.example": ENV_O2},
        {"sintomo": "ordine_controlli", "chiave_scaduta": "silenzio", "dove_chiave": "segreto"}),
    9: ({"lead-create-request.schema.json": SCHEMA_O3},
        {"dominio": "assicurazioni", "forma": "monolite_modulare", "autorizzazione": "server_abac", "audit": "append_only",
         "mcp": "secondaria", "agents": "generico", "campo_extra": "rifiutata"}),
    10: ({"mcp.json": MCP_O4}, {"quali_cartelle": "list_allowed_directories", "sola_lettura": "sparisce",
                               "memoria_default": "node_modules", "pagina_ostile": "dato", "metadati": "rifiuta"}),
    11: ({"assistente.json": ASSISTENTE_O5}, {"chiave_assente": "errore_parlante", "limite_429": "dire_e_attendere", "perche_finto": "riproducibile"}),
    12: ({"devcontainer.json": DEVCONTAINER_O6}, {"ore_2core": "60", "fermo": "spazio", "dove_segreto": "segreti_profilo", "quota_finita": "si_ferma"}),
}


def risolvi(motore, email, numero, file=None, scelte=None, salta_scelte=False):
    """Salva i file e fa le scelte della soluzione (o quelli passati, che sostituiscono i giusti)."""
    f_giusti, s_giuste = SOLUZIONI[numero]
    for percorso, contenuto in {**f_giusti, **(file or {})}.items():
        motore.azione(email, numero, "salva_file", {"percorso": percorso, "contenuto": contenuto}, "it")
    if not salta_scelte:
        for sid, valore in {**s_giuste, **(scelte or {})}.items():
            motore.azione(email, numero, "scegli", {"id": sid, "valore": valore}, "it")
