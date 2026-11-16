#!/usr/bin/env bash
# azzera_laboratorio.sh — come azzera_laboratorio.ps1, per Linux/macOS.
#   ./azzera_laboratorio.sh esercizio 3 rossi@scuola.it   (un esercizio di uno studente)
#   ./azzera_laboratorio.sh tutto                         (tutti gli studenti, chiede conferma)
set -euo pipefail
URL_MAILPIT="${URL_MAILPIT:-http://127.0.0.1:8025}"   # _why: API di Mailpit sul PC
cd "$(dirname "$0")"
case "${1:-}" in
  esercizio)
    docker compose exec -T portale python -m esercizi.motore.cli ricomincia "${2:?numero}" --studente "${3:?email}" ;;
  tutto)
    read -r -p "Cancellare il lavoro di TUTTI gli studenti? Scrivi SI: " r
    [ "$r" = "SI" ] || { echo "Annullato."; exit 0; }
    docker compose exec -T portale python -m esercizi.motore.cli azzera --conferma
    curl -fsS -X DELETE "$URL_MAILPIT/api/v1/messages" >/dev/null || echo "Mailpit non raggiungibile"
    docker compose restart portale ;;
  *) echo "uso: $0 esercizio N email | tutto"; exit 2 ;;
esac
