"""Regole di France sulle domande: budget di lettura (quante opzioni) e composizione della plausibilita'."""
from __future__ import annotations

from collections import Counter

from .config import Config
from .errori import ErroreConfigurazione
from .modello import Livello


def fascia_budget(media_caratteri: float, cfg: Config) -> tuple[str, int]:
    """Restituisce (nome della fascia, numero di opzioni richiesto) per una media di caratteri."""
    fasce = cfg.prendi("domande", "budget_lettura", "fasce", tipo=list)
    if not fasce:
        raise ErroreConfigurazione("domande.budget_lettura.fasce e' vuoto")
    precedente = 0
    for i, f in enumerate(fasce):
        limite = f["fino_a_caratteri"]
        if limite is None:
            if i != len(fasce) - 1:
                raise ErroreConfigurazione("solo l'ultima fascia del budget di lettura puo' avere fino_a_caratteri null")
            return f["nome"], f["numero_opzioni"]
        if limite <= precedente:
            raise ErroreConfigurazione("le fasce del budget di lettura devono avere limiti crescenti")
        precedente = limite
        if media_caratteri <= limite:
            return f["nome"], f["numero_opzioni"]
    raise ErroreConfigurazione("l'ultima fascia del budget di lettura deve avere fino_a_caratteri null (nessun limite)")


def media_caratteri(livello: Livello, cfg: Config) -> float:
    lingua = cfg.prendi("domande", "budget_lettura", "lingua_misura", tipo=str)
    testi = [getattr(o.testo, lingua) for o in livello.opzioni]
    if any(t is None for t in testi):
        raise ErroreConfigurazione(f"budget di lettura misurato in '{lingua}' ma alcune opzioni non hanno quel testo")
    return sum(len(t) for t in testi) / len(testi)


def violazioni_livello(livello: Livello, nome_livello: str, cfg: Config) -> list[str]:
    """Elenco leggibile delle regole violate da un livello di domanda (vuoto = conforme)."""
    motivi: list[str] = []
    tipi_ammessi = cfg.prendi("domande", "tipi_distrattore", tipo=list)
    distrattori = livello.distrattori()
    non_classificati = [o.id for o in distrattori if o.tipo_distrattore is None]
    if non_classificati:
        motivi.append(f"{nome_livello}: distrattori senza tipo (quasi/poco/errata): {non_classificati}")
    fuori = [o.id for o in distrattori if o.tipo_distrattore is not None and o.tipo_distrattore not in tipi_ammessi]
    if fuori:
        motivi.append(f"{nome_livello}: tipi di distrattore non previsti dalla configurazione: {fuori}")
    media = media_caratteri(livello, cfg)
    nome_fascia, richieste = fascia_budget(media, cfg)
    n = len(livello.opzioni)
    if n != richieste:
        motivi.append(
            f"{nome_livello}: {n} opzioni ma il budget di lettura ne chiede {richieste} "
            f"(fascia '{nome_fascia}', media {media:.0f} caratteri)"
        )
    composizioni = cfg.prendi("domande", "composizione_plausibilita", tipo=dict)
    chiave = str(n)
    if chiave not in composizioni:
        raise ErroreConfigurazione(f"domande.composizione_plausibilita non dichiara il caso di {n} opzioni")
    attesa = composizioni[chiave]
    if attesa is not None and not non_classificati:
        trovata = Counter(o.tipo_distrattore for o in distrattori)
        if dict(trovata) != attesa:
            motivi.append(f"{nome_livello}: composizione {dict(trovata)} diversa da quella richiesta {attesa}")
    return motivi
