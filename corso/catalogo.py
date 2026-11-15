"""Catalogo dei contenuti: carica corso, knowledge graph e lezioni, li incrocia e decide cosa e' erogabile.

Una domanda e' EROGABILE solo se rispetta tutte le regole (distrattori classificati, budget di lettura,
concetto principale, segmento di aiuto, testi completi in tutte le lingue). Le altre restano nel modello
ma non vengono mai servite: il motivo e' scritto nel rapporto, mai taciuto.
"""
from __future__ import annotations

import re
from pathlib import Path

from .config import Config, leggi_json
from .errori import ErroreDati, ErroreNonTrovato
from .lingua import testi_mancanti
from .modello import Corso, Domanda, KnowledgeGraph, Lezione, Pillola
from .regole_domande import violazioni_livello


class Catalogo:
    def __init__(self, cfg: Config):
        self.cfg = cfg
        self.corso = Corso.model_validate(leggi_json(cfg.percorso_file("corso")))
        self.kg = KnowledgeGraph.model_validate(leggi_json(cfg.percorso_file("knowledge_graph")))
        self.lezioni: dict[str, Lezione] = self._carica_lezioni(cfg.percorso_file("cartella_lezioni"))
        self._domande: dict[str, Domanda] = {}
        self._banca: dict[str, list[Domanda]] = {}
        self._verifica_incroci()
        self.motivi_non_erogabile: dict[str, list[str]] = {did: self._motivi(d) for did, d in self._domande.items()}

    # ------------------------------------------------------------ caricamento

    def _carica_lezioni(self, cartella: Path) -> dict[str, Lezione]:
        if not cartella.is_dir():
            raise ErroreDati(f"cartella delle lezioni non trovata: {cartella}")
        lezioni: dict[str, Lezione] = {}
        for f in sorted(cartella.glob("*.json")):
            lez = Lezione.model_validate(leggi_json(f))
            if lez.pillola in lezioni:
                raise ErroreDati(f"due lezioni per la pillola {lez.pillola}: {lezioni[lez.pillola].id} e {lez.id}")
            lezioni[lez.pillola] = lez
        return lezioni

    def _verifica_incroci(self) -> None:
        nodi = {n.id for n in self.kg.nodi}
        pillole = {p.id for p in self.corso.pillole()}
        for p in self.corso.pillole():
            for c in p.concetti:
                if c not in nodi:
                    raise ErroreDati(f"pillola {p.id}: concetto {c} assente dal knowledge graph")
                if p.id not in self.kg.nodo(c).pillole:
                    raise ErroreDati(f"pillola {p.id}: il concetto {c} nel knowledge graph non cita questa pillola")
            for pre in p.prerequisiti:
                if pre not in pillole:
                    raise ErroreDati(f"pillola {p.id}: prerequisito {pre} inesistente")
            self._banca[p.id] = list(p.domande)
        for n in self.kg.nodi:
            for pid in n.pillole:
                if pid not in pillole:
                    raise ErroreDati(f"concetto {n.id}: pillola {pid} inesistente")
        cartella_anim = self.cfg.percorso_file("cartella_animazioni")
        for pid, lez in self.lezioni.items():
            if pid not in pillole:
                raise ErroreDati(f"lezione {lez.id}: pillola {pid} inesistente")
            if not (cartella_anim / f"{lez.componente}.js").is_file():
                raise ErroreDati(f"lezione {lez.id}: componente {lez.componente}.js assente in {cartella_anim}")
            segmenti = {s.id for s in lez.segmenti}
            for s in lez.segmenti:
                for c in s.concetti:
                    if c not in nodi:
                        raise ErroreDati(f"lezione {lez.id}, segmento {s.id}: concetto {c} inesistente")
            for d in lez.domande:
                if d.pillola != pid:
                    raise ErroreDati(f"lezione {lez.id}: la domanda {d.id} dichiara la pillola {d.pillola}")
                if d.segmento_aiuto is not None and d.segmento_aiuto not in segmenti:
                    raise ErroreDati(f"domanda {d.id}: segmento_aiuto {d.segmento_aiuto} inesistente nella lezione {lez.id}")
            self._banca[pid].extend(lez.domande)
        for pid, domande in self._banca.items():
            for d in domande:
                for c in d.concetti:
                    if c not in nodi:
                        raise ErroreDati(f"domanda {d.id}: concetto {c} inesistente")
                if d.id in self._domande:
                    raise ErroreDati(f"id di domanda duplicato fra corso e lezioni: {d.id}")
                self._domande[d.id] = d

    # ------------------------------------------------------------ erogabilita'

    def _motivi(self, d: Domanda) -> list[str]:
        motivi: list[str] = []
        pillola = self.corso.pillola(d.pillola)
        if d.concetto_principale is None:
            motivi.append("concetto principale non assegnato")
        elif d.concetto_principale not in pillola.concetti:
            motivi.append(f"concetto principale {d.concetto_principale} non appartiene alla pillola {pillola.id}")
        motivi += violazioni_livello(d.livello1, "livello 1", self.cfg)
        motivi += violazioni_livello(d.livello2, "livello 2", self.cfg)
        for liv_nome, liv in (("livello 1", d.livello1), ("livello 2", d.livello2)):
            if liv.perche is None:
                motivi.append(f"{liv_nome}: manca il perche' (spiegazione della risposta corretta)")
        tipi_aiuto = [g["tipo"] for g in self.cfg.prendi("aiuti", "scala", tipo=list)]
        if "segmento" in tipi_aiuto and d.segmento_aiuto is None:
            motivi.append("manca il segmento di aiuto (la scala degli aiuti prevede il segmento)")
        for lingua in self.cfg.lingue():
            mancanti = testi_mancanti(d.model_dump(), lingua)
            if mancanti:
                motivi.append(f"{len(mancanti)} testi senza traduzione '{lingua}'")
        return motivi

    def erogabile(self, did: str) -> bool:
        return not self.motivi_non_erogabile[did]

    def domanda(self, did: str) -> Domanda:
        if did not in self._domande:
            raise ErroreNonTrovato(f"domanda {did} inesistente")
        return self._domande[did]

    def domande_erogabili(self, pid: str) -> list[Domanda]:
        return [d for d in self._banca[pid] if self.erogabile(d.id)]

    def pillola(self, pid: str) -> Pillola:
        try:
            return self.corso.pillola(pid)
        except KeyError:
            raise ErroreNonTrovato(f"pillola {pid} inesistente") from None

    def rapporto(self) -> dict:
        """Riepilogo per autori e collaudo: quante domande sono erogabili e perche' le altre no."""
        per_motivo: dict[str, int] = {}
        for motivi in self.motivi_non_erogabile.values():
            for m in motivi:
                chiave = re.sub(r"^livello \d: ", "", m)
                chiave = re.split(r"[:(]", chiave)[0].strip()
                chiave = re.sub(r"\d+", "N", chiave)
                per_motivo[chiave] = per_motivo.get(chiave, 0) + 1
        return {
            "pillole": len(self.corso.pillole()),
            "concetti": len(self.kg.nodi),
            "archi": len(self.kg.archi),
            "lezioni_interattive": sorted(self.lezioni),
            "domande_totali": len(self._domande),
            "domande_erogabili": sum(1 for d in self._domande if self.erogabile(d)),
            "motivi_non_erogabile": dict(sorted(per_motivo.items(), key=lambda kv: -kv[1])),
        }
