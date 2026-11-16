// Prove della lezione P5.2 "La linea che si arrotola" (sessioni, stato, compattazione; logica pura, entrambe le lingue).
import { eventi, statoSessione, compatta, prossimaMossa, fine, posizioni, persa } from "../../webapp/animazioni/linea_sessione.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("linea_sessione.json"), lingua);
  const sc = L.scenario;
  const base = { turni: 13, strategia: "nessuna", trigger: "conteggio", aggressivo: false, archivio: "database", evento: "attiva", memoria: [], turno_aperto: "t1" };
  const st = (diff) => ({ ...base, ...diff });
  const C = sc.compattazione;

  prova(`[${lingua}] linea_sessione: dati coerenti, 4 tipi di evento, segmenti validi, riassunto in 3 frasi`, () => {
    const tipi = new Set(sc.turni.flatMap((t) => eventi(t).map((e) => e.tipo)));
    assert.deepEqual([...tipi].sort(), ["agente", "risultato", "strumento", "utente"]);
    assert.equal(sc.turni.filter((t) => t.decisione).length, 1);
    assert.ok(sc.turni.reduce((a, t) => a + t.token, 0) > C.tetto_token, "la sessione intera supera il tetto");
    for (const seg of L.segmenti) {
      const s = seg.stato_animazione;
      compatta(sc, s); fine(sc, s); statoSessione(sc, s);
      const m = prossimaMossa(sc, s);
      if (m) assert.ok(!/\{\w+\}/.test(m.testo));
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });

  prova(`[${lingua}] linea_sessione: la storia cresce in coda, lo stato si sovrascrive`, () => {
    const s3 = statoSessione(sc, st({ turni: 3 })), s13 = statoSessione(sc, st({ turni: 13 }));
    assert.notEqual(s3.fase, s13.fase, "la fase si aggiorna");
    assert.equal(s13.lead_id, s3.lead_id);
    assert.equal(statoSessione(sc, st({ turni: 7 })).ultimo_errore, sc.turni[6].stato.ultimo_errore, "l'errore del magazzino compare al turno 7");
    assert.notEqual(statoSessione(sc, st({ turni: 8 })).ultimo_errore, sc.turni[6].stato.ultimo_errore, "e viene sovrascritto quando si risolve");
    assert.ok(compatta(sc, st({ turni: 8 })).token_archivio > compatta(sc, st({ turni: 4 })).token_archivio);
  });

  prova(`[${lingua}] linea_sessione: le tre strategie riducono i token, l'archivio resta completo`, () => {
    const intera = compatta(sc, st({}));
    assert.ok(!intera.scattata);
    assert.equal(intera.token_contesto, intera.token_archivio);
    for (const strategia of ["ultimi", "tetto", "riassunto"]) {
      const c = compatta(sc, st({ strategia }));
      assert.ok(c.scattata, strategia);
      assert.ok(c.token_contesto < c.token_archivio, strategia);
      assert.equal(c.token_archivio, intera.token_archivio, "la compattazione non cancella l'archivio");
    }
    assert.equal(compatta(sc, st({ strategia: "ultimi" })).tenuti.length, C.ultimi_n);
    assert.ok(compatta(sc, st({ strategia: "tetto" })).token_contesto <= C.tetto_token);
  });

  prova(`[${lingua}] linea_sessione: chi ricorda il lunedi'? il taglio a 10 turni e il riassunto aggressivo lo perdono`, () => {
    assert.equal(prossimaMossa(sc, st({})).ok, true);
    assert.equal(prossimaMossa(sc, st({ strategia: "ultimi" })).ok, false, "gli ultimi 10 turni non contengono il turno 3");
    assert.equal(prossimaMossa(sc, st({ strategia: "riassunto" })).ok, true, "un buon riassunto tiene le decisioni");
    assert.equal(prossimaMossa(sc, st({ strategia: "riassunto", aggressivo: true })).ok, false);
    assert.equal(prossimaMossa(sc, st({ turni: 12 })), null, "prima del turno della domanda non c'e' mossa");
    const aggr = compatta(sc, st({ strategia: "riassunto", aggressivo: true })), buono = compatta(sc, st({ strategia: "riassunto" }));
    assert.ok(aggr.capsula.token < buono.capsula.token);
  });

  prova(`[${lingua}] linea_sessione: il momento della compattazione (conteggio, tempo, evento)`, () => {
    const scatta = (trigger, turni) => compatta(sc, st({ strategia: "riassunto", trigger, turni })).scattata;
    assert.ok(!scatta("conteggio", C.ultimi_n) && scatta("conteggio", C.ultimi_n + 1));
    assert.ok(!scatta("tempo", C.pausa_dopo_turno) && scatta("tempo", C.pausa_dopo_turno + 1));
    assert.ok(!scatta("evento", C.evento_al_turno) && scatta("evento", C.evento_al_turno + 1));
  });

  prova(`[${lingua}] linea_sessione: riavvio (memoria contro database) e chiusura con le sole card salvate`, () => {
    assert.ok(persa(st({ evento: "riavviata", archivio: "memoria" })));
    assert.ok(!persa(st({ evento: "riavviata", archivio: "database" })));
    const chiusa = fine(sc, st({ turni: 14, evento: "chiusa", memoria: ["lunedi", "canale"] }));
    assert.ok(chiusa.persa);
    assert.deepEqual(chiusa.sopravvive, ["lunedi", "canale"]);
    assert.deepEqual(fine(sc, st({ turni: 14, evento: "chiusa" })).sopravvive, [], "senza memoria non resta nulla");
    const presto = sc.memoria.find((m) => m.turno > 2);
    assert.deepEqual(fine(sc, st({ turni: 2, evento: "chiusa", memoria: [presto.id] })).sopravvive, [], "non si salva un fatto non ancora detto");
    assert.ok(sc.memoria.some((m) => m.inutile), "c'e' una card che non vale la pena ricordare");
    assert.equal(prossimaMossa(sc, st({ evento: "chiusa" })), null);
  });

  prova(`[${lingua}] linea_sessione: posizioni dentro il riquadro, deterministiche`, () => {
    for (const s of [st({ turni: 1 }), st({ turni: sc.turni.length })]) {
      const p = posizioni(sc, s);
      for (const r of p.righe) assert.ok(r.y >= 0 && r.y + r.h <= 412);
      for (const c of p.card) assert.ok(c.x >= 0 && c.x + c.w <= 720 && c.y + c.h <= 412);
      assert.deepEqual(p, posizioni(sc, s));
    }
  });
}
