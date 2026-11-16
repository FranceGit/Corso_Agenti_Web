# O5 — L'assistente libero

Il pacchetto `assistente/` del repo ha tre backend dietro la stessa funzione `chiedi`:
`finto` (predefinito: deterministico, per test e correttore), `ollama` (locale), `groq` (piano gratuito).

    python -m assistente "ciao"                          # backend finto
    ASSISTENTE_BACKEND=groq python -m assistente "ciao"  # serve il segreto GROQ_API_KEY
    python -m pytest tests -q                            # tutti i test, senza rete

Esercizio 11: sistema `assistente.json` (la versione di partenza ha 5 problemi) e rispondi alle scelte.
