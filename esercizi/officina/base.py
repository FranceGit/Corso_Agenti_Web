"""Base degli esercizi dell'Officina (7-12): FILE da sistemare + SCELTE chiuse, correttore deterministico.

Area di lavoro (tipo_area "officina", disegnata da esercizi/webapp/esercizi.js):
  - materiale in sola lettura (estratti del repo adottato, dei documenti, dei README);
  - file da sistemare (Dockerfile, compose, requirements.txt, JSON...), con il testo di partenza difettoso;
  - scelte chiuse (cosa hai trovato leggendo): mai domande aperte;
  - importazione del «pacchetto di consegna» prodotto in Codespaces (strumenti/pacchetto.py del repo studente).
Il voto dipende SOLO dalla fotografia: testi dei file, scelte ed eventuali fatti calcolati al momento della
fotografia (es. esiti del banco del difetto reale). I file NON vengono mai eseguiti, tranne dal banco dichiarato.
"""
from __future__ import annotations

from pathlib import Path

from corso.errori import ErroreFlusso

from ..motore.contratto import Controllo, Esercizio, Esito, testo
from ..motore.esecutore import richiedi

CARTELLA_MATERIALE = Path(__file__).parent / "materiale"
FORMATO_PACCHETTO = "consegna-officina/1"
MASSIMO_CARATTERI_FILE = 50000
MASSIMO_CARATTERI_MATERIALE = 14000

# Il CRM «pronto» dell'Officina: gli stessi 5 contatti in ogni esercizio (nomi inventati, dominio .local).
CONTATTI = [
    ("Sara", "Conti", "sara.conti@visione-tech.local", "VP Engineering", "Visione Tech", "software", 350),
    ("Marco", "Ruggeri", "m.ruggeri@salute-piu.local", "CTO", "Salute Piu", "sanita", 900),
    ("Elena", "Vitale", "elena.v@bottega-online.local", "Direttrice marketing", "Bottega Online", "ecommerce", 120),
    ("Gianni", "Kumar", "g.kumar@finanza-agile.local", "CEO", "Finanza Agile", "finanza", 40),
    ("Lisa", "Andreoli", "lisa.a@manifattura-globale.local", "Responsabile acquisti", "Manifattura Globale", "industria", 2400),
]


def leggi_materiale(percorso: str) -> str:
    f = CARTELLA_MATERIALE / percorso
    if not f.is_file():
        raise FileNotFoundError(f"materiale dell'Officina mancante: {f}")
    return f.read_text(encoding="utf-8")


def esito_si_no(ok: bool, it_ok: str, en_ok: str, it_no: str, en_no: str, frazione: float | None = None) -> Esito:
    return Esito(ok, testo(it_ok, en_ok) if ok else testo(it_no, en_no), frazione)


class EsercizioOfficina(Esercizio):
    unita: str = ""
    tipo_area = "officina"
    FILE: list[dict] = []        # {"percorso", "iniziale" (in materiale/), "linguaggio", "descrizione": Testo}
    SCELTE: list[dict] = []      # {"id", "domanda": Testo, "opzioni": [{"id", "testo": Testo}]}
    RISPOSTE: dict = {}          # id scelta -> id opzione giusta (chiave di correzione: mai al browser)
    MATERIALE: list[dict] = []   # {"titolo": Testo, "percorso" (in materiale/)}
    PERCHE_SCELTE: dict = {}     # id scelta -> Testo (spiegazione mostrata nel verbale se la scelta e' sbagliata)

    # ------------------------------------------------------------ setup

    def iniziali(self) -> dict:
        return {f["percorso"]: leggi_materiale(f["iniziale"]) for f in self.FILE}

    def prepara(self, lab) -> None:
        crm = lab.crm
        for k, (nome, cognome, email, ruolo, azienda, settore, dim) in enumerate(CONTATTI, start=1):
            crm.esegui("INSERT INTO aziende (id, nome, settore, dimensione) VALUES (?, ?, ?, ?)", (k, azienda, settore, dim))
            crm.esegui("INSERT INTO contatti (id, nome, cognome, email, ruolo, azienda_id) VALUES (?, ?, ?, ?, ?, ?)",
                       (k, nome, cognome, email, ruolo, k))
        crm.imposta("file", self.iniziali())
        crm.imposta("scelte", {})

    # ------------------------------------------------------------ area di lavoro

    def area(self, lab, lingua: str) -> dict:
        file = lab.crm.impostazione("file")
        scelte = lab.crm.impostazione("scelte")
        iniziali = self.iniziali()
        return {
            "unita": self.unita,
            "materiale": [{"titolo": m["titolo"][lingua], "percorso": m["percorso"],
                           "testo": leggi_materiale(m["percorso"])[:MASSIMO_CARATTERI_MATERIALE]} for m in self.MATERIALE],
            "file": [{"percorso": f["percorso"], "linguaggio": f["linguaggio"], "descrizione": f["descrizione"][lingua],
                      "contenuto": file[f["percorso"]], "modificato": file[f["percorso"]] != iniziali[f["percorso"]]}
                     for f in self.FILE],
            "scelte": [{"id": s["id"], "domanda": s["domanda"][lingua], "scelta": scelte.get(s["id"]),
                        "opzioni": [{"id": o["id"], "testo": o["testo"][lingua]} for o in s["opzioni"]]} for s in self.SCELTE],
            "pacchetto": {"formato": FORMATO_PACCHETTO, "comando": f"python strumenti/pacchetto.py {self.unita.lower()}"},
        }

    def azione(self, lab, nome: str, parametri: dict) -> dict:
        percorsi = [f["percorso"] for f in self.FILE]
        if nome == "salva_file":
            percorso = richiedi(parametri, "percorso", str)
            contenuto = richiedi(parametri, "contenuto", str)
            if percorso not in percorsi:
                raise ErroreFlusso("file_sconosciuto", f"il file '{percorso}' non fa parte di questo esercizio")
            if len(contenuto) > MASSIMO_CARATTERI_FILE:
                raise ErroreFlusso("file_troppo_lungo", f"il file supera {MASSIMO_CARATTERI_FILE} caratteri")
            file = lab.crm.impostazione("file")
            file[percorso] = contenuto.replace("\r\n", "\n")
            lab.crm.imposta("file", file)
            return {"fatto": "salvato", "percorso": percorso}
        if nome == "ripristina_file":
            percorso = richiedi(parametri, "percorso", str)
            if percorso not in percorsi:
                raise ErroreFlusso("file_sconosciuto", f"il file '{percorso}' non fa parte di questo esercizio")
            file = lab.crm.impostazione("file")
            file[percorso] = self.iniziali()[percorso]
            lab.crm.imposta("file", file)
            return {"fatto": "ripristinato", "percorso": percorso}
        if nome == "scegli":
            sid = richiedi(parametri, "id", str)
            valore = richiedi(parametri, "valore", str)
            scelta = next((s for s in self.SCELTE if s["id"] == sid), None)
            if scelta is None or valore not in [o["id"] for o in scelta["opzioni"]]:
                raise ErroreFlusso("scelta_non_valida", f"scelta '{sid}' = '{valore}' non prevista")
            scelte = lab.crm.impostazione("scelte")
            scelte[sid] = valore
            lab.crm.imposta("scelte", scelte)
            return {"fatto": "scelto", "id": sid}
        if nome == "importa_pacchetto":
            pacchetto = richiedi(parametri, "pacchetto", dict)
            if pacchetto.get("formato") != FORMATO_PACCHETTO:
                raise ErroreFlusso("pacchetto_non_valido", f"formato del pacchetto atteso '{FORMATO_PACCHETTO}'")
            if pacchetto.get("esercizio") != self.numero:
                raise ErroreFlusso("pacchetto_non_valido",
                                   f"il pacchetto e' dell'esercizio {pacchetto.get('esercizio')}, non del {self.numero}")
            contenuti = pacchetto.get("file")
            if not isinstance(contenuti, dict):
                raise ErroreFlusso("pacchetto_non_valido", "nel pacchetto manca l'oggetto 'file'")
            file = lab.crm.impostazione("file")
            importati, ignorati = [], []
            for percorso, contenuto in contenuti.items():
                if percorso in percorsi and isinstance(contenuto, str) and len(contenuto) <= MASSIMO_CARATTERI_FILE:
                    file[percorso] = contenuto.replace("\r\n", "\n")
                    importati.append(percorso)
                else:
                    ignorati.append(str(percorso))
            lab.crm.imposta("file", file)
            return {"fatto": "importato", "importati": sorted(importati), "ignorati": sorted(ignorati)}
        raise ErroreFlusso("azione_sconosciuta", f"azione '{nome}' non prevista nell'esercizio {self.numero}")

    # ------------------------------------------------------------ correzione

    def fatti(self, file: dict) -> dict:
        """Fatti calcolati al momento della fotografia (es. banco del difetto reale). Default: nessuno."""
        return {}

    def fotografa(self, lab) -> dict:
        file = lab.crm.impostazione("file")
        return {"file": file, "scelte": lab.crm.impostazione("scelte"), "fatti": self.fatti(file)}

    def chiave(self, seme: int) -> dict:
        return {"risposte": dict(self.RISPOSTE)}

    def controllo_scelte(self, peso: int, nome: dict | None = None, aiuto: dict | None = None) -> Controllo:
        return Controllo("scelte", nome or testo("Cosa hai trovato (scelte)", "What you found (choices)"), peso,
                         aiuto or testo("Rileggi il materiale: ogni risposta giusta sta scritta in uno dei file mostrati.",
                                        "Read the material again: every right answer is written in one of the files shown."),
                         self._c_scelte)

    def _c_scelte(self, ctx) -> Esito:
        risposte = ctx.chiave["risposte"]
        giuste = [s for s in risposte if ctx.foto["scelte"].get(s) == risposte[s]]
        sbagliate = [s for s in risposte if s not in giuste]
        n = len(risposte)
        if not sbagliate:
            return Esito(True, testo(f"Tutte le {n} scelte sono giuste.", f"All {n} choices are right."))
        dett_it = "; ".join(self._spiega_scelta(s, "it") for s in sbagliate)
        dett_en = "; ".join(self._spiega_scelta(s, "en") for s in sbagliate)
        return Esito(False, testo(f"Giuste {len(giuste)} su {n}. Da rivedere: {dett_it}.",
                                  f"Right {len(giuste)} out of {n}. To review: {dett_en}."), frazione=len(giuste) / n)

    def _spiega_scelta(self, sid: str, lingua: str) -> str:
        domanda = next(s["domanda"][lingua] for s in self.SCELTE if s["id"] == sid)
        perche = self.PERCHE_SCELTE.get(sid)
        return f"«{domanda}»" + (f" ({perche[lingua]})" if perche else "")

    # ------------------------------------------------------------ coerenza

    def valida(self) -> None:
        super().valida()
        from corso.errori import ErroreDati
        from ..motore.contratto import verifica_testo
        dove = f"esercizio {self.numero} ({self.id})"
        if not self.unita:
            raise ErroreDati(f"{dove}: manca l'unita' dell'Officina")
        for f in self.FILE:
            verifica_testo(f["descrizione"], f"{dove}.file[{f['percorso']}]")
            leggi_materiale(f["iniziale"])
        for m in self.MATERIALE:
            verifica_testo(m["titolo"], f"{dove}.materiale")
            leggi_materiale(m["percorso"])
        ids = [s["id"] for s in self.SCELTE]
        if sorted(ids) != sorted(self.RISPOSTE):
            raise ErroreDati(f"{dove}: scelte {ids} e risposte {sorted(self.RISPOSTE)} non coincidono")
        for s in self.SCELTE:
            verifica_testo(s["domanda"], f"{dove}.{s['id']}")
            opzioni = [o["id"] for o in s["opzioni"]]
            if self.RISPOSTE[s["id"]] not in opzioni or len(set(opzioni)) != len(opzioni):
                raise ErroreDati(f"{dove}.{s['id']}: risposta assente o opzioni duplicate")
            for o in s["opzioni"]:
                verifica_testo(o["testo"], f"{dove}.{s['id']}.{o['id']}")
