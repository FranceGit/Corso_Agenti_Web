"""CRM didattico su SQLite: un file per studente e per esercizio.

Tabelle dal piano (sezione 3.1): aziende, contatti, attivita, optout (lista di chi ha chiesto di non essere
contattato), campagne, risposte, bozze (email preparate dall'agente, con stato e approvatore), impostazioni (le SCELTE dello studente: pesi, soglie, stazione, correzione),
registro_audit (ogni azione dello studente, in ordine). Nessun orario nelle tabelle: lo stato e' deterministico.
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any, Iterable

SCHEMA = """
CREATE TABLE IF NOT EXISTS aziende (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    settore TEXT NOT NULL,
    dimensione INTEGER
);
CREATE TABLE IF NOT EXISTS contatti (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL,
    cognome TEXT NOT NULL,
    email TEXT NOT NULL,
    ruolo TEXT NOT NULL,
    seniority TEXT NOT NULL DEFAULT '',
    azienda_id INTEGER REFERENCES aziende(id),
    segmento TEXT NOT NULL DEFAULT '',
    stato TEXT NOT NULL DEFAULT 'attivo' CHECK (stato IN ('attivo', 'unito', 'escluso')),
    unito_in INTEGER REFERENCES contatti(id),
    da_completare INTEGER NOT NULL DEFAULT 0,
    optout INTEGER NOT NULL DEFAULT 0,
    visite INTEGER NOT NULL DEFAULT 0,
    download INTEGER NOT NULL DEFAULT 0,
    punteggio INTEGER,
    fascia TEXT NOT NULL DEFAULT '',
    categoria TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS attivita (
    id INTEGER PRIMARY KEY,
    contatto_id INTEGER NOT NULL REFERENCES contatti(id),
    tipo TEXT NOT NULL,
    nota TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS optout (
    email TEXT PRIMARY KEY,
    motivo TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS campagne (
    id INTEGER PRIMARY KEY,
    nome TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS risposte (
    id INTEGER PRIMARY KEY,
    campagna_id INTEGER NOT NULL REFERENCES campagne(id),
    contatto_id INTEGER NOT NULL REFERENCES contatti(id),
    chiave TEXT NOT NULL UNIQUE,
    testo_it TEXT NOT NULL,
    testo_en TEXT NOT NULL,
    etichetta_llm TEXT NOT NULL DEFAULT '',
    categoria TEXT NOT NULL DEFAULT '',
    etichetta_studente TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS bozze (
    id INTEGER PRIMARY KEY,
    contatto_id INTEGER NOT NULL REFERENCES contatti(id),
    oggetto TEXT NOT NULL,
    corpo TEXT NOT NULL,
    stato TEXT NOT NULL DEFAULT 'in_attesa',
    approvato_da TEXT NOT NULL DEFAULT '',
    approvazione INTEGER,
    registro TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS impostazioni (
    chiave TEXT PRIMARY KEY,
    valore TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS registro_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    azione TEXT NOT NULL,
    dettagli TEXT NOT NULL
);
"""


class CRM:
    """Accesso minimo al database di un esercizio. Ogni scrittura e' una transazione."""

    def __init__(self, percorso: Path):
        self.percorso = percorso
        percorso.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(percorso, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.db.execute("PRAGMA foreign_keys = ON")
        self.db.executescript(SCHEMA)

    def chiudi(self) -> None:
        self.db.close()

    # ------------------------------------------------------------ lettura

    def righe(self, sql: str, parametri: Iterable[Any] = ()) -> list[dict]:
        return [dict(r) for r in self.db.execute(sql, tuple(parametri)).fetchall()]

    def riga(self, sql: str, parametri: Iterable[Any] = ()) -> dict | None:
        r = self.db.execute(sql, tuple(parametri)).fetchone()
        return dict(r) if r else None

    def valore(self, sql: str, parametri: Iterable[Any] = ()) -> Any:
        r = self.db.execute(sql, tuple(parametri)).fetchone()
        return r[0] if r else None

    def vuoto(self) -> bool:
        return not self.valore("SELECT COUNT(*) FROM contatti")

    def impostazione(self, chiave: str) -> Any:
        r = self.valore("SELECT valore FROM impostazioni WHERE chiave = ?", (chiave,))
        return None if r is None else json.loads(r)

    def impostazioni(self) -> dict:
        return {r["chiave"]: json.loads(r["valore"]) for r in self.righe("SELECT * FROM impostazioni ORDER BY chiave")}

    # ------------------------------------------------------------ scrittura

    def esegui(self, sql: str, parametri: Iterable[Any] = ()) -> int:
        with self.db:
            cur = self.db.execute(sql, tuple(parametri))
            return cur.lastrowid

    def esegui_molti(self, sql: str, righe: Iterable[Iterable[Any]]) -> None:
        with self.db:
            self.db.executemany(sql, [tuple(r) for r in righe])

    def imposta(self, chiave: str, valore: Any) -> None:
        self.esegui("INSERT INTO impostazioni (chiave, valore) VALUES (?, ?) "
                    "ON CONFLICT(chiave) DO UPDATE SET valore = excluded.valore",
                    (chiave, json.dumps(valore, ensure_ascii=False, sort_keys=True)))

    def audit(self, azione: str, dettagli: dict) -> None:
        self.esegui("INSERT INTO registro_audit (azione, dettagli) VALUES (?, ?)",
                    (azione, json.dumps(dettagli, ensure_ascii=False, sort_keys=True)))
