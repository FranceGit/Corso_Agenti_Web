# Immagine unica del laboratorio: portale + esercizi, app CRM (sola lettura) e finto-LLM.
# Contesto di build = radice del progetto (vedi docker-compose.yml). Solo librerie gratuite e permissive.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY server.py ./
COPY corso ./corso
COPY config ./config
COPY dati ./dati
COPY webapp ./webapp
COPY esercizi ./esercizi

# utente senza privilegi: i dati degli studenti stanno nel volume /stato
RUN useradd --create-home laboratorio && mkdir -p /stato /app/stato_studenti && chown -R laboratorio /stato /app/stato_studenti
USER laboratorio

EXPOSE 8780 8790 11434
CMD ["python", "esercizi/ambiente/avvia_portale_container.py"]
