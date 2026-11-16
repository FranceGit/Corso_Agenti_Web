# O1 — Docker da vicino

File di partenza: `Dockerfile` e `docker-compose.yml` (con difetti voluti), `app.py` e `requirements.txt` (corretti).

Comandi utili (in Codespaces o sul PC con Docker):

    docker compose up -d --build
    curl -X POST localhost:8000/lead -H "Content-Type: application/json" -d '{"nome":"Ada","email":"ada@esempio.local","azienda":"Esempio"}'
    curl localhost:8000/lead
    docker compose down && docker compose up -d
    curl localhost:8000/lead        # i lead ci sono ancora?

Quando hai finito: `python strumenti/pacchetto.py o1` e incolla il pacchetto nel portale (esercizio 7).
