"""Livello 2 «Officina»: catalogo e motore propri, aperti dopo il livello 1 secondo la politica in configurazione.

L'Officina riusa TUTTO il meccanismo del livello 1 (pillole, lezioni, domande a due livelli, salute, ripasso,
esercizi con correttore deterministico) su file propri in dati/officina/, con uno stato studente separato:
salute, percorso e record dell'Officina non toccano quelli del livello 1.

Sblocco (config `officina.politica_sblocco`, motivato nel suo _why):
  - "dopo_livello1": l'Officina si apre quando il percorso del livello 1 e' completo (tutti gli spicchi
    erogabili superati) o e' stato completato almeno una volta (un nuovo giro non la richiude);
  - "libero": sempre aperta.
  `officina.deroga_alpha` = true apre comunque l'Officina finche' `alpha.modalita_alpha` e' attiva (collaudo di
  France); la vista lo dichiara ("deroga_alpha": true), non lo nasconde.
"""
from __future__ import annotations

import copy

from .config import Config
from .errori import ErroreConfigurazione, ErroreFlusso
from .lingua import risolvi
from .motore import Motore

POLITICHE = ("libero", "dopo_livello1")


def config_officina(cfg: Config) -> Config:
    """Config del livello 2: identica a quella del portale, con corso, knowledge graph e lezioni dell'Officina."""
    dati = copy.deepcopy(cfg._dati)
    for chiave, sorgente in (("corso", "file_corso"), ("knowledge_graph", "file_knowledge_graph"),
                             ("cartella_lezioni", "cartella_lezioni")):
        dati["percorsi_file"][chiave] = cfg.prendi("officina", sorgente, tipo=str)
    return Config(dati, f"{cfg.origine} [officina]")


class Cancello:
    """Decide se uno studente puo' entrare nell'Officina, leggendo il suo stato del livello 1."""

    def __init__(self, cfg: Config, motore_l1: Motore):
        self.cfg = cfg
        self.motore_l1 = motore_l1
        self.politica = cfg.prendi("officina", "politica_sblocco", tipo=str)
        if self.politica not in POLITICHE:
            raise ErroreConfigurazione(f"officina.politica_sblocco '{self.politica}' non prevista {POLITICHE}")
        self.deroga = cfg.prendi("officina", "deroga_alpha", tipo=bool)

    def _livello1(self, email: str) -> dict:
        m = self.motore_l1
        st = m.stato(email)
        erogabili = [pid for pid, s in m._erogabili(st).items() if s.erogabile or pid in st.spicchi]
        superati = [pid for pid in erogabili if st.spicchi.get(pid) is not None and st.spicchi[pid].stato == "superato"]
        completo = st.percorsi_completati >= 1 or (bool(erogabili) and len(superati) == len(erogabili))
        return {"completo": completo, "spicchi_superati": len(superati), "spicchi_erogabili": len(erogabili),
                "percorsi_completati": st.percorsi_completati}

    def stato(self, email: str) -> dict:
        l1 = self._livello1(email)
        if self.politica == "libero":
            return {"sbloccato": True, "motivo": "libero", "deroga_alpha": False, "livello1": l1}
        if l1["completo"]:
            return {"sbloccato": True, "motivo": "livello1_completo", "deroga_alpha": False, "livello1": l1}
        if self.deroga and self.motore_l1.modalita_alpha():
            return {"sbloccato": True, "motivo": "deroga_alpha", "deroga_alpha": True, "livello1": l1}
        return {"sbloccato": False, "motivo": "livello1_incompleto", "deroga_alpha": False, "livello1": l1}

    def verifica(self, email: str) -> str:
        s = self.stato(email)
        if not s["sbloccato"]:
            l1 = s["livello1"]
            raise ErroreFlusso("officina_bloccata",
                               f"l'Officina si apre a livello 1 completato: spicchi superati {l1['spicchi_superati']} "
                               f"su {l1['spicchi_erogabili']}")
        return email


def vista_livelli(cfg: Config, catalogo_l1, catalogo_l2, cancello: Cancello, email: str, lingua: str) -> dict:
    """Per la barra laterale: i due livelli, lo stato del cancello e le unita' dell'Officina con il loro esercizio."""
    esercizi = {k: v for k, v in cfg.prendi("officina", "esercizi_per_unita", tipo=dict).items() if not k.startswith("_")}
    s = cancello.stato(email)
    unita = []
    for m in catalogo_l2.corso.moduli:
        if m.id not in esercizi:
            raise ErroreConfigurazione(f"officina.esercizi_per_unita: manca l'unita' {m.id}")
        unita.append({
            "id": m.id, "titolo": risolvi(m.titolo, lingua), "esercizio": esercizi[m.id],
            "pillole": [p.id for p in m.pillole],
            "domande_erogabili": sum(len(catalogo_l2.domande_erogabili(p.id)) for p in m.pillole),
            "lezioni": sum(1 for p in m.pillole if p.id in catalogo_l2.lezioni),
        })
    return {"livelli": [
        {"numero": 1, "titolo": risolvi(catalogo_l1.corso.titolo, lingua), "sbloccato": True},
        {"numero": 2, "titolo": risolvi(catalogo_l2.corso.titolo, lingua), "sbloccato": s["sbloccato"],
         "motivo": s["motivo"], "deroga_alpha": s["deroga_alpha"], "livello1": s["livello1"], "unita": unita},
    ]}
