# GitHub Codespaces: il piano gratuito in breve (account personale)

> Sintesi scritta per il corso (novembre 2026) dalla documentazione pubblica di GitHub su fatturazione e
> configurazione di Codespaces. I numeri vanno riverificati sulla pagina ufficiale prima della beta.

- **Quota mensile gratuita** (account personale GitHub Free): **120 ore-core** di calcolo e **15 GB-mese** di spazio.
- **Ore-core**: le ore di calcolo si moltiplicano per i core della macchina. Macchina da 2 core = 120 / 2 = **60 ore**
  di lavoro al mese; da 4 core = 30 ore; da 8 core = 15 ore. Per gli esercizi dell'Officina bastano 2 core.
- **Spazio**: conta anche quando il codespace è **fermo** (il disco resta). Cancella i codespace che non usi.
- **Arresto per inattività**: dopo 30 minuti senza attività (valore predefinito, modificabile nelle impostazioni)
  il codespace si ferma e smette di consumare ore di calcolo.
- **Conservazione**: un codespace fermo e inutilizzato viene cancellato dopo un periodo di conservazione
  (predefinito 30 giorni). Quello che conta va committato e spinto sul repo.
- **Limite di spesa**: per un account personale senza metodo di pagamento il limite è 0: finita la quota,
  i codespace non si avviano più fino al mese successivo. **Nessun addebito**.
- **Segreti**: Settings del profilo → Codespaces → Secrets. Ogni segreto (es. `GROQ_API_KEY`) si abilita per i
  repo scelti e arriva nel codespace come **variabile d'ambiente**. Nel `devcontainer.json` si può solo
  *dichiarare* che serve (proprietà `secrets`, con una descrizione): il valore non si scrive mai nel repo.
- **Docker dentro il codespace**: la feature `ghcr.io/devcontainers/features/docker-in-docker:2`.
