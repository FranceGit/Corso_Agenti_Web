#!/usr/bin/env bash
# avvia_laboratorio.sh — come avvia_laboratorio.ps1, per Linux/macOS.
#   ./avvia_laboratorio.sh                 (finto-LLM)
#   ./avvia_laboratorio.sh ollama          (Ollama vero in questo PC)
#   ./avvia_laboratorio.sh aula http://192.168.1.50:11434
set -euo pipefail
MODELLO_TIPO="${1:-finto}"          # _why: finto | ollama | aula (vedi la versione .ps1)
URL_AULA="${2:-}"                   # _why: indirizzo dell'Ollama d'aula (solo con "aula")
NOME_MODELLO="${NOME_MODELLO:-qwen2.5:3b}"  # _why: modello Ollama da usare con ollama/aula
PORTA_PORTALE="${PORTA_PORTALE:-8780}"      # _why: porta del portale sul PC
ATTESA_SECONDI="${ATTESA_SECONDI:-120}"     # _why: attesa massima della prima risposta del portale
cd "$(dirname "$0")"
command -v docker >/dev/null || { echo "Docker non installato: vedi esercizi/LEGGIMI_DOCKER.md"; exit 2; }
docker info >/dev/null 2>&1 || { echo "Docker non e' acceso"; exit 2; }
PROFILO=()
case "$MODELLO_TIPO" in
  finto)  export LLM_URL=http://finto-llm:11434 MODELLO=finto-llm-v1 ;;
  ollama) export LLM_URL=http://ollama:11434 MODELLO="$NOME_MODELLO"; PROFILO=(--profile ollama) ;;
  aula)   [ -n "$URL_AULA" ] || { echo "serve l'indirizzo dell'Ollama d'aula"; exit 2; }
          export LLM_URL="$URL_AULA" MODELLO="$NOME_MODELLO" ;;
  *) echo "modello sconosciuto: $MODELLO_TIPO (finto | ollama | aula)"; exit 2 ;;
esac
export PORTA_PORTALE
docker compose "${PROFILO[@]}" up -d --build
for ((i = 0; i < ATTESA_SECONDI; i += 3)); do
  if curl -fsS "http://127.0.0.1:$PORTA_PORTALE/api/lingue" >/dev/null 2>&1; then
    echo "Laboratorio acceso: portale http://127.0.0.1:$PORTA_PORTALE · posta http://127.0.0.1:8025 · CRM http://127.0.0.1:8790/studenti"
    exit 0
  fi
  sleep 3
done
echo "Il portale non risponde: docker compose logs portale"; exit 1
