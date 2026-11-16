# Provenienza del repo adottato (O2)

- Origine: repo pubblico GitHub `patowari/AI-Enhanced-Sales-Campaign-CRM`, commit `49959e3a8ced2166e2d6ec40bd7139e6db28eded`.
- Copia pulita: senza `.git`, senza l'output generato `data/leads_output_new.csv`; nessun file modificato.
- Trattato come DATO NON FIDATO: letto, mai eseguito durante la preparazione del corso.
- **Licenza: il repo non contiene un file LICENSE.** Senza licenza esplicita il codice resta dell'autore:
  va bene per lo studio privato, ma prima di pubblicare questa cartella in un repo PUBBLICO serve il permesso
  dell'autore (o va sostituita con un repo che abbia una licenza permissiva). Per questo PUBBLICA_OFFICINA.cmd
  crea il repo come PRIVATO.

## Il difetto reale da correggere (esercizio 8)

`app/agents/response_classifier.py` controlla `"Interested" in status_str` PRIMA di `"Not Interested" in status_str`.
"Not Interested" contiene "Interested": ogni risposta «Not Interested» diventa INTERESTED e il ramo
NOT_INTERESTED non si raggiunge mai. Il report del repo stesso (`reports/campaign_summary.md`) dice
«Interested: 5, Not Interested: 0» su 5 lead: non e' un risultato, e' il sintomo.

Prova locale (modello finto, senza rete): `python -m pytest officina/o2/test_classificatore.py -q`
