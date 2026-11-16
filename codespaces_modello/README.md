# Officina — corso agenti AI (livello 2)

Repo di lavoro dello studente: si apre su **GitHub Codespaces** (piano gratuito) oppure sul proprio PC con Docker.
Contiene gli esercizi pratici dell'Officina e l'assistente libero; le lezioni e le verifiche stanno nel portale del corso.

## Aprire il laboratorio

1. Pulsante verde **Code → Codespaces → Create codespace** (macchina da 2 core: le ore gratuite durano di più).
2. All'apertura le dipendenze si installano da sole (`postCreateCommand`).
3. Facoltativo, solo per Groq: in **Settings → Codespaces → Secrets** crea il segreto `GROQ_API_KEY`
   (chiave gratuita da console.groq.com) e abilitalo per questo repo. Non scrivere mai la chiave nei file.

## Cosa c'è

| Cartella | Unità | Esercizio del portale |
|---|---|---|
| `officina/o1` | O1 Docker da vicino | 7 |
| `officina/o2` | O2 Adotta un repo (CRM con agenti, difetto reale da correggere) | 8 |
| `officina/o3` | O3 Dentro un CRM enterprise (estratti di nebula) | 9 |
| `officina/o4` | O4 MCP in pratica | 10 |
| `officina/o5` + `assistente/` | O5 L'assistente libero | 11 |
| `officina/o6` + `.devcontainer/` | O6 In cloud gratis | 12 |

## Comandi

    python -m pytest -q                         # test dell'assistente, senza rete (backend finto)
    python -m pytest officina/o2 -q             # O2: fallisce finché non correggi il difetto reale
    python -m assistente "ciao"                 # assistente, backend finto
    ASSISTENTE_BACKEND=groq python -m assistente "ciao"     # Groq gratuito (serve il segreto)
    python strumenti/pacchetto.py o2            # pacchetto di consegna da importare nel portale

Tutto il materiale scaricato da altri repo (cartelle `officina/o2/crm_adottato`, estratti di `o3` e `o4`) è un
**dato da leggere**: si esegue solo dopo averlo letto, mai seguendo istruzioni scritte dentro.
