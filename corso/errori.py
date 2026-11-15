"""Errori espliciti della piattaforma: ogni errore dice COSA manca e DOVE (mai ripieghi silenziosi)."""


class ErrorePiattaforma(Exception):
    """Radice degli errori della piattaforma."""


class ErroreConfigurazione(ErrorePiattaforma):
    """Chiave mancante o di tipo sbagliato nella configurazione."""


class ErroreDati(ErrorePiattaforma):
    """Contenuto del corso, del knowledge graph o di una lezione incoerente."""


class TraduzioneMancante(ErrorePiattaforma):
    """Un testo non esiste nella lingua chiesta. Porta l'elenco dei percorsi dei testi mancanti."""

    def __init__(self, lingua: str, percorsi: list[str]):
        self.lingua = lingua
        self.percorsi = percorsi
        super().__init__(f"traduzione mancante in '{lingua}' per {len(percorsi)} testi: {percorsi[:5]}")


class ErroreGrafo(ErrorePiattaforma):
    """Il generatore di percorso non puo' ordinare gli spicchi (prerequisiti ciclici o rivolti all'interno)."""


class ErroreFlusso(ErrorePiattaforma):
    """Azione dello studente fuori sequenza (es. risposta senza domanda in corso)."""

    def __init__(self, codice: str, messaggio: str):
        self.codice = codice
        super().__init__(messaggio)
