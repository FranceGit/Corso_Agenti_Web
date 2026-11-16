# Dockerfile di partenza dell'esercizio O1: funziona, ma ha 5 difetti. Trovali e correggili.
FROM python:latest

WORKDIR /app
COPY . .
RUN pip install -r requirements.txt

ENV GROQ_API_KEY=incolla-qui-la-tua-chiave

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
