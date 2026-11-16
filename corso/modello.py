"""Modello dati del corso (unica fonte di verita': gli schemi JSON in schema/ sono generati da qui).

Gerarchia: Corso -> Moduli -> Pillole -> (concetti del knowledge graph, domande a due livelli).
Ogni testo e' bilingue {it, en}: 'en' puo' essere null solo come "da completare" e il server non lo
sostituisce mai con l'italiano.
"""
from __future__ import annotations

import re
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

TipoDistrattore = Literal["quasi", "poco", "errata"]
TipoL2 = Literal["motivazione", "trasferimento", "contro-esempio", "diagnosi"]
TipoArco = Literal["PRE", "APP", "CON", "ES", "MIT"]
# benchmark = dal documento del corso classico; dimostratore = delle due lezioni campione;
# autori = scritte dopo, sui contenuti verificati, per coprire i concetti scoperti (vivono solo nel JSON)
Origine = Literal["benchmark", "dimostratore", "autori"]
# Striscia = punto di vista con cui una domanda guarda il suo concetto (piu' strisce = piu' punti di vista).
Striscia = Literal["definizione", "esempio_pratico", "contro_esempio", "diagnosi"]
VERSIONE_SCHEMA_CORSO = 2  # v2: campo 'striscia' nelle domande (migrazione da v1 in corso/migrazioni.py)
# Livello del corso: 1 = Fondamenta (M1-M8, pillole P<m>.<n>, concetti C<nn>);
# 2 = Officina (unita' O1-O6, pillole PO<u>.<n>, concetti CO<nn>), in un file a parte (dati/officina/).
LivelloCorso = Literal[1, 2]
PREFISSI_LIVELLO = {1: ("M", "P"), 2: ("O", "PO")}


class Base(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=False)


class Testo(Base):
    """Testo bilingue. 'en' null = traduzione da completare (dichiarata, non nascosta)."""

    it: str = Field(min_length=1)
    en: Optional[str] = Field(default=None, min_length=1)

    def manca(self, lingua: str) -> bool:
        return getattr(self, lingua) is None


# ---------------------------------------------------------------- domande


class Opzione(Base):
    id: str = Field(min_length=1)
    testo: Testo
    corretta: bool
    tipo_distrattore: Optional[TipoDistrattore] = None
    spiegazione: Optional[Testo] = None  # perche' questa opzione e' giusta o sbagliata

    @model_validator(mode="after")
    def _coerenza(self) -> "Opzione":
        if self.corretta and self.tipo_distrattore is not None:
            raise ValueError(f"opzione {self.id}: la risposta corretta non puo' avere un tipo di distrattore")
        return self


class Livello(Base):
    domanda: Testo
    opzioni: list[Opzione] = Field(min_length=2)
    perche: Optional[Testo] = None

    @model_validator(mode="after")
    def _una_corretta(self) -> "Livello":
        corrette = [o for o in self.opzioni if o.corretta]
        if len(corrette) != 1:
            raise ValueError(f"serve esattamente 1 opzione corretta, trovate {len(corrette)}")
        ids = [o.id for o in self.opzioni]
        if len(set(ids)) != len(ids):
            raise ValueError(f"id di opzione duplicati: {ids}")
        return self

    def corretta(self) -> Opzione:
        return next(o for o in self.opzioni if o.corretta)

    def distrattori(self) -> list[Opzione]:
        return [o for o in self.opzioni if not o.corretta]


class Livello2(Livello):
    tipo: TipoL2


# Voce del glossario di una domanda (contratto dati ALPHA-FIX, popolato dal cantiere CONTENUTI-REV):
# il termine come appare nel testo e la sua definizione succinta in ogni lingua. 'en' null = da tradurre:
# in inglese la voce non viene mostrata (mai la definizione italiana al suo posto).
class VoceGlossario(Base):
    termine: str = Field(min_length=1)
    it: str = Field(min_length=1)
    en: Optional[str] = Field(default=None, min_length=1)


class Domanda(Base):
    id: str = Field(min_length=1)
    origine: Origine
    pillola: str
    concetti: list[str] = Field(min_length=1)
    concetto_principale: Optional[str] = None  # null = da assegnare (la domanda non e' ancora erogabile)
    segmento_aiuto: Optional[str] = None  # segmento della lezione, o passo della scaletta, da proporre come primo aiuto
    striscia: Optional[Striscia] = None  # null = punto di vista da assegnare (la domanda non e' ancora erogabile)
    livello1: Livello
    livello2: Livello2
    glossario: Optional[list[VoceGlossario]] = None  # riquadro "Termini" sotto la domanda (facoltativo)

    @model_validator(mode="after")
    def _principale_fra_concetti(self) -> "Domanda":
        if self.concetto_principale is not None and self.concetto_principale not in self.concetti:
            raise ValueError(f"{self.id}: concetto_principale {self.concetto_principale} non e' fra i concetti {self.concetti}")
        return self


# ---------------------------------------------------------------- pillole e corso


class Animazione(Base):
    titolo: Testo
    progetto: Testo  # descrizione di progetto dell'animazione (dal documento del corso)


class Pillola(Base):
    id: str = Field(pattern=r"^PO?\d+\.\d+$")  # P3.2 nel livello 1, PO2.1 nell'Officina
    titolo: Testo
    durata_min: int = Field(gt=0)
    prerequisiti: list[str]
    concetti: list[str] = Field(min_length=1)
    fonti: list[str]
    obiettivo: Testo
    scaletta: list[Testo] = Field(min_length=1)
    animazione: Animazione
    domande: list[Domanda]


class Modulo(Base):
    id: str = Field(pattern=r"^[MO]\d+$")  # M<n> nel livello 1, O<n> (unita') nell'Officina
    titolo: Testo
    anello: int = Field(ge=1)
    pillole: list[Pillola] = Field(min_length=1)


class Corso(Base):
    versione_schema: Literal[2]
    id: str
    livello: LivelloCorso = 1  # assente nei file del livello 1 (nati prima dell'Officina)
    titolo: Testo
    fonte: str  # documento da cui il contenuto e' stato estratto
    moduli: list[Modulo] = Field(min_length=1)

    @model_validator(mode="after")
    def _id_unici(self) -> "Corso":
        pid = [p.id for m in self.moduli for p in m.pillole]
        if len(set(pid)) != len(pid):
            raise ValueError("id di pillola duplicati")
        pref_modulo, pref_pillola = PREFISSI_LIVELLO[self.livello]
        for m in self.moduli:
            if not re.fullmatch(rf"{pref_modulo}\d+", m.id):
                raise ValueError(f"livello {self.livello}: il modulo {m.id} deve chiamarsi {pref_modulo}<numero>")
            for p in m.pillole:
                if not re.fullmatch(rf"{pref_pillola}\d+\.\d+", p.id):
                    raise ValueError(f"livello {self.livello}: la pillola {p.id} deve chiamarsi {pref_pillola}<n>.<n>")
        did = [d.id for m in self.moduli for p in m.pillole for d in p.domande]
        if len(set(did)) != len(did):
            raise ValueError("id di domanda duplicati")
        for m in self.moduli:
            for p in m.pillole:
                for d in p.domande:
                    if d.pillola != p.id:
                        raise ValueError(f"domanda {d.id} dichiara pillola {d.pillola} ma sta in {p.id}")
        return self

    def pillole(self) -> list[Pillola]:
        return [p for m in self.moduli for p in m.pillole]

    def pillola(self, pid: str) -> Pillola:
        for p in self.pillole():
            if p.id == pid:
                return p
        raise KeyError(pid)

    def anello_di(self, pid: str) -> int:
        for m in self.moduli:
            for p in m.pillole:
                if p.id == pid:
                    return m.anello
        raise KeyError(pid)


# ---------------------------------------------------------------- knowledge graph


class Nodo(Base):
    id: str = Field(pattern=r"^CO?\d{2}$")  # C<nn> nel livello 1, CO<nn> nell'Officina
    nome: Testo
    pillole: list[str] = Field(min_length=1)
    anello: int = Field(ge=1)


class Arco(Base):
    da: str
    a: str
    tipo: TipoArco
    peso: int = Field(gt=0)
    nota: Optional[Testo] = None


class KnowledgeGraph(Base):
    versione_schema: Literal[1]
    fonte: str
    pesi_per_tipo: dict[TipoArco, int]
    legenda: dict[TipoArco, Testo]
    nodi: list[Nodo] = Field(min_length=1)
    archi: list[Arco]

    @model_validator(mode="after")
    def _coerenza(self) -> "KnowledgeGraph":
        ids = {n.id for n in self.nodi}
        if len(ids) != len(self.nodi):
            raise ValueError("id di nodo duplicati")
        for a in self.archi:
            for estremo in (a.da, a.a):
                if estremo not in ids:
                    raise ValueError(f"arco {a.da}-{a.tipo}->{a.a}: nodo {estremo} inesistente")
            if a.peso != self.pesi_per_tipo[a.tipo]:
                raise ValueError(f"arco {a.da}-{a.tipo}->{a.a}: peso {a.peso} diverso da pesi_per_tipo[{a.tipo}]")
        return self

    def nodo(self, cid: str) -> Nodo:
        for n in self.nodi:
            if n.id == cid:
                return n
        raise KeyError(cid)


# ---------------------------------------------------------------- lezioni interattive


class Segmento(Base):
    """Un passo della lezione: narrazione semplice + stato dell'animazione da cui partire."""

    id: str = Field(min_length=1)
    titolo: Testo
    narrazione: list[Testo] = Field(min_length=1)
    prova: Optional[Testo] = None  # "Prova tu: ..." (l'azione da fare sull'animazione)
    concetti: list[str] = Field(min_length=1)
    stato_animazione: dict[str, Any] = Field(default_factory=dict)


class Lezione(Base):
    id: str = Field(min_length=1)
    pillola: str = Field(pattern=r"^PO?\d+\.\d+$")
    componente: str = Field(pattern=r"^[a-z_]+$")  # nome del modulo JS in webapp/animazioni
    # "lezione" = la lezione interattiva della pillola (al massimo una); "laboratorio" = una seconda lezione
    # facoltativa della stessa pillola, aperta in una scheda a parte (es. "Trova l'errore" su un caso reale)
    tipo: Literal["lezione", "laboratorio"] = "lezione"
    titolo: Testo
    sottotitolo: Testo
    segmenti: list[Segmento] = Field(min_length=1)
    scenario: dict[str, Any]  # dati dell'animazione: ogni testo e' un oggetto {it, en}
    domande: list[Domanda]

    @field_validator("segmenti")
    @classmethod
    def _segmenti_unici(cls, v: list[Segmento]) -> list[Segmento]:
        ids = [s.id for s in v]
        if len(set(ids)) != len(ids):
            raise ValueError(f"id di segmento duplicati: {ids}")
        return v
