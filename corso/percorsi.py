"""Generatore di percorso: anelli -> spicchi -> strisce, deterministico per seme.

- Anello = gruppo di pillole (dal modulo), dall'esterno (1) verso l'interno.
- Spicchio = una pillola. TUTTI gli spicchi compaiono sempre, ognuno una sola volta.
  L'ordine dentro l'anello cambia con il seme, rispetta i prerequisiti della pillola e preferisce
  (senza obbligare) gli spicchi legati piu' forte al precedente nel knowledge graph.
- Striscia = una domanda erogabile su un concetto dello spicchio. Per ogni concetto si estrae un numero
  di strisce fra minimo e massimo (configurazione); se il concetto non ha abbastanza domande erogabili lo
  spicchio NON e' erogabile e la carenza viene dichiarata (mai riempita in silenzio).

Il seme e' una stringa: random.Random(str) e' deterministico fra esecuzioni e macchine.
"""
from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass, field

from .catalogo import Catalogo
from .config import Config
from .errori import ErroreConfigurazione, ErroreGrafo


@dataclass(frozen=True)
class Carenza:
    concetto: str
    disponibili: int
    minimo: int


@dataclass
class Strisce:
    domande: list[str]
    carenze: list[Carenza] = field(default_factory=list)

    @property
    def erogabile(self) -> bool:
        return not self.carenze and bool(self.domande)


@dataclass
class Anello:
    numero: int
    spicchi: list[str]  # id delle pillole, nell'ordine del percorso


def seme_studente(email: str, cfg: Config) -> str:
    sale = cfg.prendi("percorso", "sale_seme", tipo=str)
    return hashlib.sha256(f"{sale}:{email.strip().lower()}".encode("utf-8")).hexdigest()[:16]


def peso_legame(catalogo: Catalogo, p1: str, p2: str) -> int:
    """Somma dei pesi degli archi fra i concetti delle due pillole (in entrambe le direzioni)."""
    c1 = set(catalogo.pillola(p1).concetti)
    c2 = set(catalogo.pillola(p2).concetti)
    return sum(a.peso for a in catalogo.kg.archi if (a.da in c1 and a.a in c2) or (a.da in c2 and a.a in c1))


def genera_anelli(catalogo: Catalogo, seme: str) -> list[Anello]:
    cfg = catalogo.cfg
    peso_base = cfg.prendi("percorso", "peso_base_candidato", tipo=int)
    if peso_base <= 0:
        raise ErroreConfigurazione("percorso.peso_base_candidato deve essere positivo (altrimenti un candidato non legato non e' mai scelto)")
    per_anello: dict[int, list[str]] = {}
    for m in catalogo.corso.moduli:
        per_anello.setdefault(m.anello, []).extend(p.id for p in m.pillole)
    anelli: list[Anello] = []
    for numero in sorted(per_anello):
        membri = per_anello[numero]
        for pid in membri:
            for pre in catalogo.pillola(pid).prerequisiti:
                if catalogo.corso.anello_di(pre) > numero:
                    raise ErroreGrafo(f"{pid} (anello {numero}) richiede {pre}, che sta in un anello piu' interno")
        rng = random.Random(f"{seme}:anello:{numero}")
        ordine: list[str] = []
        restanti = list(membri)
        while restanti:
            pronti = [
                p for p in restanti
                if all(pre in ordine or pre not in membri for pre in catalogo.pillola(p).prerequisiti)
            ]
            if not pronti:
                raise ErroreGrafo(f"anello {numero}: prerequisiti ciclici fra {sorted(restanti)}")
            if ordine:
                pesi = [peso_base + peso_legame(catalogo, ordine[-1], p) for p in pronti]
            else:
                pesi = [peso_base for _ in pronti]
            scelto = rng.choices(pronti, weights=pesi, k=1)[0]
            ordine.append(scelto)
            restanti.remove(scelto)
        anelli.append(Anello(numero=numero, spicchi=ordine))
    return anelli


def genera_strisce(catalogo: Catalogo, pid: str, seme: str, tentativo: int) -> Strisce:
    cfg = catalogo.cfg
    minimo = cfg.prendi("percorso", "strisce_per_concetto", "minimo", tipo=int)
    massimo = cfg.prendi("percorso", "strisce_per_concetto", "massimo", tipo=int)
    if not 1 <= minimo <= massimo:
        raise ErroreConfigurazione("percorso.strisce_per_concetto: serve 1 <= minimo <= massimo")
    rng = random.Random(f"{seme}:strisce:{pid}:{tentativo}")
    erogabili = catalogo.domande_erogabili(pid)
    scelte: list[str] = []
    carenze: list[Carenza] = []
    for concetto in catalogo.pillola(pid).concetti:
        bacino = sorted(d.id for d in erogabili if d.concetto_principale == concetto)
        if len(bacino) < minimo:
            carenze.append(Carenza(concetto=concetto, disponibili=len(bacino), minimo=minimo))
            continue
        quante = rng.randint(minimo, min(massimo, len(bacino)))
        scelte.extend(rng.sample(bacino, quante))
    if carenze:
        return Strisce(domande=[], carenze=carenze)
    rng.shuffle(scelte)
    return Strisce(domande=scelte)


def ordine_opzioni(ids: list[str], seme: str, domanda: str, livello: int, contatore: int) -> list[str]:
    """Ordine di presentazione delle opzioni (mescolato, riproducibile dal seme registrato)."""
    ordine = list(ids)
    random.Random(f"{seme}:opzioni:{domanda}:{livello}:{contatore}").shuffle(ordine)
    return ordine
