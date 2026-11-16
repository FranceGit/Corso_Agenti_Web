#!/usr/bin/env bash
# verifica_esercizio.sh N email [--json] [--locale] — come verifica_esercizio.ps1, per Linux/macOS.
# Esce con 0 se superato, 1 se non ancora, 2 per errori.
set -euo pipefail
N="${1:?numero esercizio}"     # _why: 1 pulizia lead, 2 punteggio a regole, 3 trova l'errore
STUDENTE="${2:?email dello studente}" # _why: email con cui lo studente entra nel portale
shift 2
ARGS=(-m esercizi.motore.cli verifica "$N" --studente "$STUDENTE")
LOCALE=0
for a in "$@"; do
  case "$a" in
    --json) ARGS+=(--json) ;;
    --locale) LOCALE=1 ;;   # _why: senza Docker, con il Python del progetto (finto-LLM, posta locale)
  esac
done
cd "$(dirname "$0")"
if [ "$LOCALE" = 1 ]; then
  cd ../.. && exec "${PYTHON:-python3}" "${ARGS[@]}"
fi
exec docker compose exec -T portale python "${ARGS[@]}"
