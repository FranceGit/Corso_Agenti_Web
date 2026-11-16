"""Motore dello studente: percorso, spicchi, quiz a due livelli, salute, ripasso, aiuti, record.

Tutte le azioni passano da qui; il server (app.py) traduce solo HTTP <-> chiamate.
Le risposte corrette NON escono mai prima che lo studente abbia risposto: il client vede le opzioni
solo per posizione (1..n) e l'ordine mescolato resta sul server.
"""
from __future__ import annotations

from datetime import datetime
from typing import Callable

from .catalogo import Catalogo
from .errori import ErroreConfigurazione, ErroreDati, ErroreFlusso
from .lingua import risolvi
from .modello import Domanda, Opzione
from .percorsi import Anello, Strisce, genera_anelli, genera_strisce, ordine_opzioni, seme_studente
from .salute import (
    applica_danno, danno, gradino_dopo_ripasso, recupera, salute_fine_convalescenza, scadenza,
)
from .stato import (
    Archivio, DaRivedere, Debriefing, DomandaInCorso, EsitoStriscia, Padronanza, Record, StatoSpicchio,
    StatoStudente,
)


class Motore:
    def __init__(self, catalogo: Catalogo, archivio: Archivio, orologio: Callable[[], datetime]):
        self.cat = catalogo
        self.cfg = catalogo.cfg
        self.archivio = archivio
        self.adesso = orologio

    # ------------------------------------------------------------ stato

    def stato(self, email: str) -> StatoStudente:
        if self.archivio.esiste(email):
            return self.archivio.carica(email)
        st = StatoStudente(
            email=email,
            seme=seme_studente(email, self.cfg),
            creato=self.adesso(),
            salute=self.cfg.prendi("salute", "iniziale", tipo=int),
        )
        self.archivio.salva(st)
        return st

    def _seme_giro(self, st: StatoStudente) -> str:
        return st.seme if st.giro == 1 else f"{st.seme}:giro{st.giro}"

    def anelli(self, st: StatoStudente) -> list[Anello]:
        return genera_anelli(self.cat, self._seme_giro(st))

    def _strisce(self, st: StatoStudente, pid: str, tentativo: int) -> Strisce:
        return genera_strisce(self.cat, pid, self._seme_giro(st), tentativo)

    def _erogabili(self, st: StatoStudente) -> dict[str, Strisce]:
        """Per ogni pillola, le strisce del prossimo tentativo (dicono anche se lo spicchio e' erogabile)."""
        esito = {}
        for p in self.cat.corso.pillole():
            sp = st.spicchi.get(p.id)
            esito[p.id] = self._strisce(st, p.id, (sp.tentativo + 1) if sp else 1)
        return esito

    def _anelli_sbloccati(self, st: StatoStudente, anelli: list[Anello], erogabili: dict[str, Strisce]) -> dict[int, bool]:
        politica = self.cfg.prendi("percorso", "politica_sblocco", tipo=str)
        if politica == "libero":
            return {a.numero: True for a in anelli}
        if politica != "sequenziale":
            raise ErroreConfigurazione(f"percorso.politica_sblocco '{politica}' non prevista (libero | sequenziale)")
        sbloccati: dict[int, bool] = {}
        precedenti_superati = True
        for a in anelli:
            sbloccati[a.numero] = precedenti_superati
            for pid in a.spicchi:
                if erogabili[pid].erogabile or pid in st.spicchi:
                    sp = st.spicchi.get(pid)
                    if sp is None or sp.stato != "superato":
                        precedenti_superati = False
        return sbloccati

    def _verifica_sbloccato(self, st: StatoStudente, pid: str) -> None:
        self.cat.pillola(pid)
        anelli = self.anelli(st)
        sblocco = self._anelli_sbloccati(st, anelli, self._erogabili(st))
        numero = self.cat.corso.anello_di(pid)
        if not sblocco[numero]:
            raise ErroreFlusso("anello_bloccato", f"l'anello {numero} si apre dopo aver superato gli anelli precedenti")

    # ------------------------------------------------------------ viste

    def riepilogo(self, email: str, lingua: str) -> dict:
        st = self.stato(email)
        adesso = self.adesso()
        return {
            "email": st.email,
            "giro": st.giro,
            "salute": st.salute,
            "salute_massima": self.cfg.prendi("salute", "massima", tipo=int),
            "convalescenza": st.convalescenza,
            "record": st.record.model_dump(mode="json") if st.record else None,
            "percorsi_completati": st.percorsi_completati,
            "da_rivedere": {
                "totale": len(st.da_rivedere),
                "scaduti": sum(1 for x in st.da_rivedere if x.scadenza <= adesso),
            },
            "padronanza": [
                {"concetto": c, "nome": risolvi(self.cat.kg.nodo(c).nome, lingua), **p.model_dump()}
                for c, p in sorted(st.padronanza.items())
            ],
            "in_corso": {"contesto": st.in_corso.contesto, "pillola": st.in_corso.pillola} if st.in_corso else None,
            "debriefing": self._info_debriefing(st),
        }

    def vista_percorso(self, email: str, lingua: str) -> dict:
        st = self.stato(email)
        anelli = self.anelli(st)
        erogabili = self._erogabili(st)
        sblocco = self._anelli_sbloccati(st, anelli, erogabili)
        modulo_di = {p.id: m for m in self.cat.corso.moduli for p in m.pillole}
        vista = []
        for a in anelli:
            spicchi = []
            for ordine, pid in enumerate(a.spicchi):
                p = self.cat.pillola(pid)
                sp = st.spicchi.get(pid)
                strisce = erogabili[pid]
                if sp is not None:
                    stato = sp.stato
                elif strisce.erogabile:
                    stato = "da_iniziare"
                else:
                    stato = "in_preparazione"
                spicchi.append({
                    "pillola": pid,
                    "ordine": ordine,
                    "titolo": risolvi(p.titolo, lingua),
                    "modulo": modulo_di[pid].id,
                    "titolo_modulo": risolvi(modulo_di[pid].titolo, lingua),
                    "concetti": [{"id": c, "nome": risolvi(self.cat.kg.nodo(c).nome, lingua)} for c in p.concetti],
                    "erogabile": strisce.erogabile,
                    "carenze": [c.__dict__ for c in strisce.carenze],
                    "stato": stato,
                    "ha_lezione": pid in self.cat.lezioni,
                    "puliti": sum(1 for e in sp.esiti if e.pulito) if sp else 0,
                    "risposte": len(sp.esiti) if sp else 0,
                    "strisce": len(sp.strisce) if sp else 0,
                })
            vista.append({"numero": a.numero, "sbloccato": sblocco[a.numero], "spicchi": spicchi})
        return {
            "corso": risolvi(self.cat.corso.titolo, lingua),
            "giro": st.giro,
            "soglia_superamento": self.cfg.prendi("percorso", "soglia_superamento_spicchio", tipo=(int, float)),
            "anelli": vista,
        }

    def contenuto_pillola(self, email: str, pid: str, lingua: str) -> dict:
        st = self.stato(email)
        self._verifica_sbloccato(st, pid)
        p = self.cat.pillola(pid)
        dati = p.model_dump(exclude={"domande"})
        dati["concetti"] = [{"id": c, "nome": self.cat.kg.nodo(c).nome.model_dump()} for c in p.concetti]
        lez = self.cat.lezioni.get(pid)
        dati["lezione"] = lez.model_dump(exclude={"domande"}) if lez else None
        lab = self.cat.laboratori.get(pid)
        dati["laboratorio"] = lab.model_dump(exclude={"domande"}) if lab else None
        return risolvi(dati, lingua)

    # ------------------------------------------------------------ spicchi

    def inizia_spicchio(self, email: str, pid: str) -> dict:
        st = self.stato(email)
        self._no_convalescenza(st)
        self._verifica_sbloccato(st, pid)
        sp = st.spicchi.get(pid)
        if sp is not None and sp.stato == "in_corso":
            return self._vista_spicchio(sp)
        if sp is not None and sp.stato == "superato":
            raise ErroreFlusso("gia_superato", f"lo spicchio {pid} e' gia' superato")
        tentativo = (sp.tentativo + 1) if sp else 1
        strisce = self._strisce(st, pid, tentativo)
        if not strisce.erogabile:
            raise ErroreFlusso(
                "spicchio_non_erogabile",
                f"lo spicchio {pid} e' in preparazione: concetti senza abbastanza domande erogabili "
                f"{[c.__dict__ for c in strisce.carenze]}",
            )
        st.spicchi[pid] = StatoSpicchio(pillola=pid, tentativo=tentativo, strisce=strisce.domande)
        self.archivio.salva(st)
        return self._vista_spicchio(st.spicchi[pid])

    def domanda_spicchio(self, email: str, pid: str, lingua: str) -> dict:
        st = self.stato(email)
        self._no_convalescenza(st)
        sp = st.spicchi.get(pid)
        if sp is None or sp.stato != "in_corso":
            raise ErroreFlusso("spicchio_non_iniziato", f"lo spicchio {pid} non e' in corso: va iniziato")
        ic = st.in_corso
        if ic is not None and ic.contesto == "spicchio" and ic.pillola == pid:
            vista = self._vista_domanda(self.cat.domanda(ic.domanda), ic.livello, ic.ordine, lingua)
        else:
            vista = self._presenta(st, "spicchio", self.cat.domanda(sp.strisce[sp.indice]), 1, lingua)
            self.archivio.salva(st)
        vista["progresso"] = {"striscia": sp.indice + 1, "totale": len(sp.strisce)}
        return vista

    def _vista_spicchio(self, sp: StatoSpicchio) -> dict:
        puliti = sum(1 for e in sp.esiti if e.pulito)
        return {
            "pillola": sp.pillola,
            "tentativo": sp.tentativo,
            "stato": sp.stato,
            "strisce": len(sp.strisce),
            "risposte": len(sp.esiti),
            "puliti": puliti,
            "soglia": self.cfg.prendi("percorso", "soglia_superamento_spicchio", tipo=(int, float)),
        }

    def _no_convalescenza(self, st: StatoStudente) -> None:
        if st.convalescenza:
            raise ErroreFlusso("convalescenza", "salute a zero: prima il debriefing di convalescenza, poi si riprende")

    # ------------------------------------------------------------ domande

    def _livello(self, d: Domanda, livello: int):
        return d.livello1 if livello == 1 else d.livello2

    def _presenta(self, st: StatoStudente, contesto: str, d: Domanda, livello: int, lingua: str,
                  errore_precedente: bool = False, danno_accumulato: int = 0) -> dict:
        st.contatore_presentazioni += 1
        liv = self._livello(d, livello)
        ordine = ordine_opzioni([o.id for o in liv.opzioni], self._seme_giro(st), d.id, livello, st.contatore_presentazioni)
        st.in_corso = DomandaInCorso(
            contesto=contesto, pillola=d.pillola, domanda=d.id, livello=livello, ordine=ordine,
            errore_precedente=errore_precedente, danno=danno_accumulato,
        )
        return self._vista_domanda(d, livello, ordine, lingua)

    def _vista_domanda(self, d: Domanda, livello: int, ordine: list[str], lingua: str) -> dict:
        liv = self._livello(d, livello)
        per_id = {o.id: o for o in liv.opzioni}
        return {
            "pillola": d.pillola,
            "livello": livello,
            "tipo_livello2": d.livello2.tipo if livello == 2 else None,
            "testo": risolvi(liv.domanda, lingua),
            "opzioni": [{"posizione": i + 1, "testo": risolvi(per_id[oid].testo, lingua)} for i, oid in enumerate(ordine)],
        }

    def rispondi(self, email: str, posizione: int, lingua: str) -> dict:
        st = self.stato(email)
        ic = st.in_corso
        if ic is None:
            raise ErroreFlusso("nessuna_domanda", "non c'e' una domanda in corso")
        if not 1 <= posizione <= len(ic.ordine):
            raise ErroreFlusso("posizione_non_valida", f"posizione {posizione} fuori da 1..{len(ic.ordine)}")
        d = self.cat.domanda(ic.domanda)
        liv = self._livello(d, ic.livello)
        scelta = next(o for o in liv.opzioni if o.id == ic.ordine[posizione - 1])
        giusta = liv.corretta()
        esito: dict = {
            "livello": ic.livello,
            "corretta": scelta.corretta,
            "scelta": self._vista_opzione(scelta, lingua),
            "risposta_corretta": self._vista_opzione(giusta, lingua),
            "posizione_corretta": ic.ordine.index(giusta.id) + 1,
            "perche": risolvi(liv.perche, lingua),
            "danno": 0,
        }
        if not scelta.corretta:
            penalizza = ic.contesto == "spicchio" or self.cfg.prendi("salute", "danno_durante_ripasso", tipo=bool)
            if penalizza:
                esito["danno"] = danno(scelta.tipo_distrattore, ic.livello, self.cfg)
                st.salute, zero = applica_danno(st.salute, esito["danno"])
                if zero:
                    st.convalescenza = True
        danno_totale = ic.danno + esito["danno"]
        l2_comunque = self.cfg.prendi("domande", "l2_dopo_l1_errata", tipo=bool)
        if ic.livello == 1 and (scelta.corretta or l2_comunque):
            esito["prossimo"] = "livello2"
            esito["livello2"] = self._presenta(st, ic.contesto, d, 2, lingua,
                                               errore_precedente=not scelta.corretta, danno_accumulato=danno_totale)
        else:
            pulito = scelta.corretta and not ic.errore_precedente
            st.in_corso = None
            if ic.contesto == "spicchio":
                esito.update(self._chiudi_striscia(st, d, pulito, danno_totale))
            else:
                esito.update(self._chiudi_ripasso(st, d, pulito))
        esito["salute"] = st.salute
        esito["convalescenza"] = st.convalescenza
        if st.convalescenza and ic.contesto == "spicchio" and esito["prossimo"] != "livello2":
            esito["prossimo"] = "debriefing"
        self.archivio.salva(st)
        return esito

    def _vista_opzione(self, o: Opzione, lingua: str) -> dict:
        return {
            "testo": risolvi(o.testo, lingua),
            "tipo_distrattore": o.tipo_distrattore,
            "spiegazione": risolvi(o.spiegazione, lingua) if o.spiegazione else None,
        }

    def _aggiorna_padronanza(self, st: StatoStudente, concetto: str, pulito: bool) -> Padronanza:
        pad = st.padronanza.setdefault(concetto, Padronanza())
        pad.tentativi += 1
        if pulito:
            pad.puliti += 1
            pad.fallimenti_consecutivi = 0
        else:
            pad.fallimenti_consecutivi += 1
        return pad

    def _chiudi_striscia(self, st: StatoStudente, d: Domanda, pulito: bool, danno_totale: int) -> dict:
        sp = st.spicchi[d.pillola]
        sp.esiti.append(EsitoStriscia(domanda=d.id, concetto=d.concetto_principale, pulito=pulito, danno=danno_totale))
        sp.indice += 1
        pad = self._aggiorna_padronanza(st, d.concetto_principale, pulito)
        if not pulito:
            self._metti_da_rivedere(st, d)
        risultato: dict = {
            "striscia_pulita": pulito,
            "aiuto": None if pulito else self._aiuto(d, pad.fallimenti_consecutivi),
            "spicchio_concluso": False,
            "risultato_percorso": None,
        }
        if sp.indice >= len(sp.strisce):
            puliti = sum(1 for e in sp.esiti if e.pulito)
            soglia = self.cfg.prendi("percorso", "soglia_superamento_spicchio", tipo=(int, float))
            sp.stato = "superato" if puliti / len(sp.esiti) >= soglia else "non_superato"
            risultato["spicchio_concluso"] = True
            risultato["prossimo"] = "spicchio_concluso"
            risultato["risultato_percorso"] = self._forse_record(st)
        else:
            risultato["prossimo"] = "striscia_successiva"
        risultato["spicchio"] = self._vista_spicchio(sp)
        return risultato

    def _metti_da_rivedere(self, st: StatoStudente, d: Domanda) -> None:
        quando = scadenza(0, self.adesso(), self.cfg)
        for x in st.da_rivedere:
            if x.domanda == d.id:
                x.gradino = 0
                x.scadenza = quando
                return
        st.da_rivedere.append(DaRivedere(domanda=d.id, concetto=d.concetto_principale, pillola=d.pillola, gradino=0, scadenza=quando))

    def _aiuto(self, d: Domanda, fallimenti: int) -> dict | None:
        scala = sorted(self.cfg.prendi("aiuti", "scala", tipo=list), key=lambda g: g["dopo_fallimenti_consecutivi"])
        gradino = None
        for g in scala:
            if fallimenti >= g["dopo_fallimenti_consecutivi"]:
                gradino = g
        if gradino is None:
            return None
        if gradino["tipo"] == "segmento":
            if d.segmento_aiuto is None:
                raise ErroreDati(f"domanda {d.id}: la scala prevede il segmento ma la domanda non ha segmento_aiuto")
            return {"tipo": "segmento", "pillola": d.pillola, "segmento": d.segmento_aiuto, **self.cat.riferimento_aiuto(d)}
        if gradino["tipo"] == "pillola_intera":
            return {"tipo": "pillola_intera", "pillola": d.pillola}
        raise ErroreConfigurazione(f"aiuti.scala: tipo di aiuto '{gradino['tipo']}' non previsto (segmento | pillola_intera)")

    def _forse_record(self, st: StatoStudente) -> dict | None:
        """Se tutti gli spicchi erogabili sono superati il percorso e' completo: si confronta col record."""
        erogabili = [p.id for p in self.cat.corso.pillole() if p.id in st.spicchi or self._strisce(st, p.id, 1).erogabile]
        if not erogabili or any(st.spicchi.get(pid) is None or st.spicchi[pid].stato != "superato" for pid in erogabili):
            return None
        esiti = [e for pid in erogabili for e in st.spicchi[pid].esiti]
        candidato = Record(
            quota_passaggi_puliti=round(sum(1 for e in esiti if e.pulito) / len(esiti), 4),
            salute_finale=st.salute,
            giro=st.giro,
            data=self.adesso(),
        )
        criteri = self.cfg.prendi("record", "criteri", tipo=list)
        for c in criteri:
            if c not in Record.model_fields:
                raise ErroreConfigurazione(f"record.criteri: '{c}' non e' un campo del record")

        def chiave(r: Record) -> tuple:
            return tuple(getattr(r, c) for c in criteri)

        nuovo = st.record is None or chiave(candidato) > chiave(st.record)
        if nuovo:
            st.record = candidato
        st.percorsi_completati += 1
        return {
            "completato": True,
            "risultato": candidato.model_dump(mode="json"),
            "nuovo_record": nuovo,
            "record": st.record.model_dump(mode="json"),
        }

    def ricomincia(self, email: str) -> dict:
        """Nuovo giro del percorso (ordine e strisce diversi): salute piena, record e ripassi conservati."""
        st = self.stato(email)
        st.giro += 1
        st.spicchi = {}
        st.salute = self.cfg.prendi("salute", "iniziale", tipo=int)
        st.convalescenza = False
        st.in_corso = None
        st.debriefing = None
        self.archivio.salva(st)
        return {"giro": st.giro, "salute": st.salute}

    # ------------------------------------------------------------ debriefing e ripasso

    def _info_debriefing(self, st: StatoStudente) -> dict:
        scaduti = [x for x in st.da_rivedere if x.scadenza <= self.adesso()]
        motivo = "convalescenza" if st.convalescenza else ("ripasso" if scaduti else None)
        return {
            "motivo": motivo,
            "in_corso": st.debriefing is not None,
            "scaduti": len(scaduti),
            "totale": len(st.da_rivedere),
            "elementi": len(st.debriefing.elementi) if st.debriefing else None,
            "indice": st.debriefing.indice if st.debriefing else None,
        }

    def info_debriefing(self, email: str) -> dict:
        return self._info_debriefing(self.stato(email))

    def inizia_debriefing(self, email: str) -> dict:
        st = self.stato(email)
        if st.debriefing is None:
            massimo = self.cfg.prendi("ripasso", "massimo_elementi_per_debriefing", tipo=int)
            ordinati = sorted(st.da_rivedere, key=lambda x: x.scadenza)
            if st.convalescenza:
                scelti, motivo = ordinati[:massimo], "convalescenza"
            else:
                scelti = [x for x in ordinati if x.scadenza <= self.adesso()][:massimo]
                motivo = "ripasso"
                if not scelti:
                    raise ErroreFlusso("niente_da_rivedere", "non ci sono elementi da rivedere in scadenza")
            st.debriefing = Debriefing(motivo=motivo, elementi=[x.domanda for x in scelti])
            st.in_corso = None
            self.archivio.salva(st)
        return self._info_debriefing(st)

    def domanda_debriefing(self, email: str, lingua: str) -> dict:
        st = self.stato(email)
        deb = st.debriefing
        if deb is None:
            raise ErroreFlusso("debriefing_non_iniziato", "il debriefing va iniziato")
        if deb.indice >= len(deb.elementi):
            raise ErroreFlusso("debriefing_finito", "elementi del debriefing esauriti: va concluso")
        ic = st.in_corso
        if ic is not None and ic.contesto == "ripasso":
            vista = self._vista_domanda(self.cat.domanda(ic.domanda), ic.livello, ic.ordine, lingua)
        else:
            vista = self._presenta(st, "ripasso", self.cat.domanda(deb.elementi[deb.indice]), 1, lingua)
            self.archivio.salva(st)
        vista["progresso"] = {"striscia": deb.indice + 1, "totale": len(deb.elementi)}
        return vista

    def _chiudi_ripasso(self, st: StatoStudente, d: Domanda, pulito: bool) -> dict:
        deb = st.debriefing
        if deb is None:
            raise ErroreDati("risposta di ripasso senza debriefing attivo")
        voce = next((x for x in st.da_rivedere if x.domanda == d.id), None)
        if voce is None:
            raise ErroreDati(f"domanda {d.id} in ripasso ma assente dalle cose da rivedere")
        nuovo = gradino_dopo_ripasso(voce.gradino, pulito, self.cfg)
        if nuovo is None:
            st.da_rivedere.remove(voce)
        else:
            voce.gradino = nuovo
            voce.scadenza = scadenza(nuovo, self.adesso(), self.cfg)
        self._aggiorna_padronanza(st, d.concetto_principale, pulito)
        recuperato = 0
        if pulito:
            prima = st.salute
            st.salute = recupera(st.salute, self.cfg.prendi("salute", "recupero_per_ripasso_corretto", tipo=int), self.cfg)
            recuperato = st.salute - prima
            deb.recuperato += recuperato
        deb.indice += 1
        return {
            "striscia_pulita": pulito,
            "recuperato": recuperato,
            "imparato": nuovo is None,
            "prossimo": "ripasso_successivo" if deb.indice < len(deb.elementi) else "debriefing_finito",
        }

    def concludi_debriefing(self, email: str) -> dict:
        st = self.stato(email)
        deb = st.debriefing
        if deb is None:
            raise ErroreFlusso("debriefing_non_iniziato", "nessun debriefing da concludere")
        if deb.indice < len(deb.elementi):
            raise ErroreFlusso("debriefing_incompleto", f"mancano {len(deb.elementi) - deb.indice} elementi")
        if st.convalescenza:
            st.salute = salute_fine_convalescenza(st.salute, self.cfg)
            st.convalescenza = False
        st.debriefing = None
        self.archivio.salva(st)
        return {"motivo": deb.motivo, "recuperato": deb.recuperato, "salute": st.salute, "rivisti": len(deb.elementi)}
