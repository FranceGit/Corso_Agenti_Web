"""Esecuzione riproducibile degli esercizi: laboratorio per studente, correzione, verbale JSON, ricorrezione.

La correzione e' una funzione PURA di (fotografia, chiave, parametri, soglia): la fotografia viene salvata con il
verbale, quindi un tentativo si puo' ricorreggere in ogni momento e deve dare lo stesso verbale (stessa impronta).
"""
from __future__ import annotations

import hashlib
import importlib
import json
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from corso.errori import ErroreFlusso, ErroreNonTrovato, ErroreDati

from .configurazione import ConfigLaboratorio
from .contratto import Contesto, Esercizio, testo
from .crm import CRM
from .llm import ModelloConRegistro, crea_modello
from .posta import Posta, crea_posta

VERSIONE_MOTORE = "1.0"
FORMATO_VERBALE = "verbale-esercizio/1"


def canonico(dato) -> str:
    return json.dumps(dato, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def impronta(dato) -> str:
    return hashlib.sha256(canonico(dato).encode("utf-8")).hexdigest()


def pseudonimo(email: str) -> str:
    """Nome della cartella dello studente: mai l'email in chiaro sul disco del laboratorio."""
    return hashlib.sha256(f"corso-esercizi:{email.strip().lower()}".encode("utf-8")).hexdigest()[:16]


def seme_studente(cfg: ConfigLaboratorio, sid: str) -> int:
    base = cfg.prendi("seme_base", tipo=int)
    if not cfg.prendi("variante_per_studente", tipo=bool):
        return base
    return int(hashlib.sha256(f"{base}:{sid}".encode("utf-8")).hexdigest()[:8], 16)


@dataclass
class Laboratorio:
    """Tutto cio' che un esercizio puo' toccare per UNO studente."""
    sid: str
    numero: int
    seme: int
    crm: CRM
    posta: Posta
    etichetta_posta: str
    llm: ModelloConRegistro
    cartella: Path


def correggi(esercizio: Esercizio, foto: dict, chiave: dict, parametri: dict, soglia: int) -> dict:
    """Il cuore del correttore: nessun accesso a database, rete o orologio."""
    ctx = Contesto(foto=foto, chiave=chiave, parametri=parametri)
    righe, bloccanti, falliti = [], [], []
    for c in esercizio.controlli():
        esito = c.verifica(ctx)
        punti = round(c.peso * esito.quota(), 1)
        if not esito.superato:
            falliti.append(c.id)
            if c.bloccante:
                bloccanti.append(c.id)
        righe.append({
            "id": c.id, "nome": c.nome, "peso": c.peso, "punti": punti, "superato": esito.superato,
            "bloccante": c.bloccante, "spiegazione": esito.spiegazione, "aiuto": c.aiuto,
        })
    voto = 0 if bloccanti else int(round(sum(r["punti"] for r in righe)))
    superato = voto >= soglia and not bloccanti
    nomi = {r["id"]: r["nome"] for r in righe}
    if superato:
        riassunto = testo(f"Superato: {voto}/100 (soglia {soglia}).", f"Passed: {voto}/100 (pass mark {soglia}).")
    elif bloccanti:
        elenco_it = ", ".join(nomi[i]["it"] for i in bloccanti)
        elenco_en = ", ".join(nomi[i]["en"] for i in bloccanti)
        riassunto = testo(f"Voto 0/100: c'e' un errore bloccante ({elenco_it}). Sistemalo e riprova.",
                          f"Score 0/100: there is a blocking error ({elenco_en}). Fix it and try again.")
    else:
        elenco_it = ", ".join(nomi[i]["it"] for i in falliti)
        elenco_en = ", ".join(nomi[i]["en"] for i in falliti)
        riassunto = testo(f"Non ancora: {voto}/100 (soglia {soglia}). Da rivedere: {elenco_it}.",
                          f"Not yet: {voto}/100 (pass mark {soglia}). To review: {elenco_en}.")
    ingresso = {"esercizio": esercizio.id, "versione": esercizio.versione, "foto": foto,
                "parametri": parametri, "soglia": soglia, "motore": VERSIONE_MOTORE}
    esito = {"voto": voto, "soglia": soglia, "superato": superato, "bloccato_da": bloccanti,
             "falliti": falliti, "controlli": righe, "riassunto": riassunto}
    return {**esito, "impronta_ingresso": impronta(ingresso), "impronta_esito": impronta({"ingresso": impronta(ingresso), **esito})}


def carica_esercizio(modulo: str) -> Esercizio:
    m = importlib.import_module(f"esercizi.catalogo.{modulo}")
    es = getattr(m, "ESERCIZIO", None)
    if not isinstance(es, Esercizio):
        raise ErroreDati(f"esercizi.catalogo.{modulo}: manca ESERCIZIO (istanza di Esercizio)")
    es.valida()
    return es


class MotoreEsercizi:
    def __init__(self, cfg: ConfigLaboratorio, orologio: Callable[[], datetime] | None = None,
                 modello: ModelloConRegistro | None = None, posta: Posta | None = None):
        self.cfg = cfg
        self.orologio = orologio or (lambda: datetime.now(timezone.utc))
        self.radice = cfg.cartella_stato()
        self.radice.mkdir(parents=True, exist_ok=True)
        self.modello = modello or crea_modello(cfg)
        self.posta = posta or crea_posta(cfg)
        self.esercizi: dict[int, Esercizio] = {}
        self.piano: dict[int, int] = {}
        for voce in cfg.prendi("esercizi", "attivi", tipo=list):
            es = carica_esercizio(voce["modulo"])
            if es.numero != voce["numero"]:
                raise ErroreDati(f"{voce['modulo']}: numero {es.numero} diverso da quello in configurazione {voce['numero']}")
            cfg.soglia(es.numero)  # la soglia deve esistere: errore esplicito all'avvio, non alla prima verifica
            cfg.parametri(es.numero)
            self.esercizi[es.numero] = es
            self.piano[es.numero] = voce["piano"]
        self._crm: dict[tuple[str, int], CRM] = {}
        self._blocchi: dict[tuple[str, int], threading.Lock] = {}
        self._blocco = threading.Lock()

    # ------------------------------------------------------------ laboratorio

    def esercizio(self, numero: int) -> Esercizio:
        if numero not in self.esercizi:
            raise ErroreNonTrovato(f"esercizio {numero} inesistente (attivi: {sorted(self.esercizi)})")
        return self.esercizi[numero]

    def blocco(self, sid: str, numero: int) -> threading.Lock:
        with self._blocco:
            return self._blocchi.setdefault((sid, numero), threading.Lock())

    def cartella(self, sid: str) -> Path:
        return self.radice / "studenti" / sid

    def laboratorio(self, email: str, numero: int) -> Laboratorio:
        es = self.esercizio(numero)
        sid = pseudonimo(email)
        chiave = (sid, numero)
        if chiave not in self._crm:
            self._crm[chiave] = CRM(self.cartella(sid) / f"e{numero:02d}.sqlite")
        lab = Laboratorio(sid=sid, numero=numero, seme=seme_studente(self.cfg, sid), crm=self._crm[chiave],
                          posta=self.posta, etichetta_posta=f"s-{sid}-e{numero:02d}", llm=self.modello,
                          cartella=self.cartella(sid))
        if lab.crm.vuoto():
            es.prepara(lab)
        return lab

    def ricomincia(self, email: str, numero: int) -> None:
        sid = pseudonimo(email)
        with self.blocco(sid, numero):
            crm = self._crm.pop((sid, numero), None)
            if crm:
                crm.chiudi()
            f = self.cartella(sid) / f"e{numero:02d}.sqlite"
            if f.exists():
                f.unlink()
            self.posta.svuota(f"s-{sid}-e{numero:02d}")
            self.laboratorio(email, numero)

    # ------------------------------------------------------------ viste per il portale

    def elenco(self, email: str, lingua: str) -> list[dict]:
        sid = pseudonimo(email)
        voci = []
        for n, es in sorted(self.esercizi.items()):
            ultimo = self._ultimo_tentativo(sid, n)
            voci.append({
                "numero": n, "id": es.id, "titolo": es.titolo[lingua], "sottotitolo": es.sottotitolo[lingua],
                "soglia": self.cfg.soglia(n), "tentativi": self._conta_tentativi(sid, n),
                "ultimo_voto": ultimo["verbale"]["voto"] if ultimo else None,
                "superato": any(t["verbale"]["superato"] for t in self._tentativi(sid, n)),
            })
        return voci

    def scheda(self, email: str, numero: int, lingua: str) -> dict:
        es = self.esercizio(numero)
        lab = self.laboratorio(email, numero)
        with self.blocco(lab.sid, numero):
            area = es.area(lab, lingua)
        ultimo = self._ultimo_tentativo(lab.sid, numero)
        return {
            "numero": numero, "id": es.id, "versione": es.versione, "tipo_area": es.tipo_area,
            "titolo": es.titolo[lingua], "sottotitolo": es.sottotitolo[lingua],
            "consegna": [p[lingua] for p in es.consegna], "soglia": self.cfg.soglia(numero),
            "controlli": [{"id": c.id, "nome": c.nome[lingua], "peso": c.peso, "bloccante": c.bloccante}
                          for c in es.controlli()],
            "area": area, "ultimo_verbale": ultimo["verbale"] if ultimo else None,
        }

    def azione(self, email: str, numero: int, nome: str, parametri: dict, lingua: str) -> dict:
        es = self.esercizio(numero)
        lab = self.laboratorio(email, numero)
        with self.blocco(lab.sid, numero):
            esito = es.azione(lab, nome, parametri or {})
            lab.crm.audit(nome, parametri or {})
            return {"esito": esito, "area": es.area(lab, lingua)}

    # ------------------------------------------------------------ correzione

    def verifica(self, email: str, numero: int) -> dict:
        es = self.esercizio(numero)
        lab = self.laboratorio(email, numero)
        with self.blocco(lab.sid, numero):
            foto = es.fotografa(lab)
            foto = json.loads(canonico(foto))  # come sara' riletta dal disco: niente tuple, chiavi ordinate
            nucleo = correggi(es, foto, es.chiave(lab.seme), self.cfg.parametri(numero), self.cfg.soglia(numero))
            k = self._conta_tentativi(lab.sid, numero) + 1
            verbale = {
                "formato": FORMATO_VERBALE, "versione_motore": VERSIONE_MOTORE,
                "esercizio": {"numero": numero, "id": es.id, "versione": es.versione, "titolo": es.titolo,
                              "piano": self.piano[numero]},
                "studente": lab.sid, "tentativo": k, "data": self.orologio().isoformat(timespec="seconds"),
                **nucleo,
            }
            cartella = self.cartella(lab.sid) / "tentativi"
            cartella.mkdir(parents=True, exist_ok=True)
            (cartella / f"e{numero:02d}_{k:04d}.json").write_text(
                json.dumps({"seme": lab.seme, "foto": foto, "verbale": verbale}, ensure_ascii=False, indent=1),
                encoding="utf-8")
            return verbale

    def ricorreggi(self, email: str, numero: int, tentativo: int) -> dict:
        """Ricorregge un tentativo salvato: deve dare lo stesso esito (impronte identiche)."""
        es = self.esercizio(numero)
        sid = pseudonimo(email)
        f = self.cartella(sid) / "tentativi" / f"e{numero:02d}_{tentativo:04d}.json"
        if not f.is_file():
            raise ErroreNonTrovato(f"tentativo {tentativo} dell'esercizio {numero} inesistente")
        salvato = json.loads(f.read_text(encoding="utf-8"))
        nucleo = correggi(es, salvato["foto"], es.chiave(salvato["seme"]), self.cfg.parametri(numero), self.cfg.soglia(numero))
        originale = salvato["verbale"]
        identico = (nucleo["impronta_ingresso"] == originale["impronta_ingresso"]
                    and nucleo["impronta_esito"] == originale["impronta_esito"])
        return {"identico": identico, "tentativo": tentativo, "voto_originale": originale["voto"],
                "voto_ricorretto": nucleo["voto"], "impronta_esito": nucleo["impronta_esito"]}

    def tentativi(self, email: str, numero: int) -> list[dict]:
        self.esercizio(numero)
        return [{"tentativo": t["verbale"]["tentativo"], "data": t["verbale"]["data"], "voto": t["verbale"]["voto"],
                 "superato": t["verbale"]["superato"]} for t in self._tentativi(pseudonimo(email), numero)]

    def verbale(self, email: str, numero: int, tentativo: int) -> dict:
        f = self.cartella(pseudonimo(email)) / "tentativi" / f"e{numero:02d}_{tentativo:04d}.json"
        if not f.is_file():
            raise ErroreNonTrovato(f"tentativo {tentativo} dell'esercizio {numero} inesistente")
        return json.loads(f.read_text(encoding="utf-8"))["verbale"]

    def _tentativi(self, sid: str, numero: int) -> list[dict]:
        cartella = self.cartella(sid) / "tentativi"
        if not cartella.is_dir():
            return []
        return [json.loads(f.read_text(encoding="utf-8")) for f in sorted(cartella.glob(f"e{numero:02d}_*.json"))]

    def _conta_tentativi(self, sid: str, numero: int) -> int:
        cartella = self.cartella(sid) / "tentativi"
        return len(list(cartella.glob(f"e{numero:02d}_*.json"))) if cartella.is_dir() else 0

    def _ultimo_tentativo(self, sid: str, numero: int) -> dict | None:
        t = self._tentativi(sid, numero)
        return t[-1] if t else None

    def chiudi(self) -> None:
        for crm in self._crm.values():
            crm.chiudi()
        self._crm.clear()


def richiedi(parametri: dict, chiave: str, tipo):
    """Parametro obbligatorio di un'azione dello studente: se manca e' un errore di flusso leggibile."""
    if chiave not in parametri:
        raise ErroreFlusso("parametro_mancante", f"manca il parametro '{chiave}'")
    v = parametri[chiave]
    if tipo is int and isinstance(v, bool) or not isinstance(v, tipo):
        raise ErroreFlusso("parametro_non_valido", f"il parametro '{chiave}' ha un tipo non valido")
    return v
