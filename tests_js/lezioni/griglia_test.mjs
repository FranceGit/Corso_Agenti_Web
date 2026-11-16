// Prove della lezione P7.3 "Costruire il set di valutazione" (logica pura, entrambe le lingue).
import { casiDisponibili, casiNelSet, versione, copertura, esitoCaso, rilancio, verifica, posizioni } from "../../webapp/animazioni/griglia_test.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("griglia_test.json"), lingua);
  const sc = L.scenario;
  const completo = sc.casi.map((c) => c.id);
  const base = { vista: "griglia", set: [...sc.set_povero], modifica: false, rilanciato: false, produzione: false, caso_aperto: "t1", scelte: {}, verificato: false };
  const st = (diff) => ({ ...base, ...diff });

  prova(`[${lingua}] griglia_test: dati coerenti, segmenti validi, riassunto in 3 frasi`, () => {
    const fam = new Set(sc.famiglie.map((f) => f.id));
    for (const c of [...sc.casi, sc.caso_produzione]) {
      assert.ok(fam.has(c.famiglia), c.id);
      for (const t of c.strumenti) assert.ok(sc.nomi_strumenti[t], `${c.id}: ${t}`);
      if (c.regredisce || c.fallisce) assert.ok(c.effettivo, `${c.id}: manca l'esito ottenuto`);
    }
    assert.ok(sc.set_povero.every((id) => sc.casi.find((c) => c.id === id).famiglia === "tipico"), "il set povero ha solo casi tipici");
    for (const seg of L.segmenti) assert.ok(rilancio(sc, seg.stato_animazione).tot > 0);
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });

  prova(`[${lingua}] griglia_test: copertura delle tre famiglie`, () => {
    const povero = copertura(sc, st({}));
    assert.equal(povero.completa, false);
    assert.deepEqual(povero.mancano.sort(), ["avversario", "limite"]);
    const pieno = copertura(sc, st({ set: completo }));
    assert.equal(pieno.completa, true);
    assert.ok(Object.values(pieno.per).every((n) => n >= 1));
  });

  prova(`[${lingua}] griglia_test: la regressione si vede solo con i casi limite`, () => {
    const pieno = rilancio(sc, st({ set: completo, modifica: true, rilanciato: true }));
    assert.equal(pieno.regressioni, 3);
    assert.equal(pieno.rossi, 3);
    assert.equal(pieno.verdi, pieno.tot - 3);
    const povero = rilancio(sc, st({ modifica: true, rilanciato: true }));
    assert.equal(povero.rossi, 0, "il set povero promuove tutto");
    assert.equal(povero.cieco, true);
    const senzaModifica = rilancio(sc, st({ set: completo, rilanciato: true }));
    assert.equal(senzaModifica.rossi, 0, "prima della modifica tutto funzionava");
    for (const c of sc.casi.filter((x) => x.regredisce)) assert.equal(c.famiglia, "limite");
  });

  prova(`[${lingua}] griglia_test: dopo una modifica i risultati vecchi non valgono (rilanciare)`, () => {
    const c = sc.casi.find((x) => x.id === "l1");
    assert.equal(esitoCaso(sc, st({ set: completo, modifica: true }), c), "dubbio");
    assert.equal(esitoCaso(sc, st({ set: completo, modifica: true, rilanciato: true }), c), "rosso");
    assert.equal(esitoCaso(sc, st({ set: completo }), c), "ok");
    assert.equal(esitoCaso(sc, st({}), c), "fuori");
  });

  prova(`[${lingua}] griglia_test: il pollice giu' diventa un caso permanente e il set sale di versione`, () => {
    assert.equal(versione(sc, st({})), sc.versione_iniziale);
    const s = st({ set: completo, produzione: true, rilanciato: true });
    assert.equal(versione(sc, s), sc.versione_iniziale + 1);
    assert.ok(casiNelSet(sc, s).includes(sc.caso_produzione.id));
    assert.ok(casiNelSet(sc, st({ set: [], produzione: true })).includes(sc.caso_produzione.id), "il caso di produzione resta anche svuotando il set");
    assert.equal(esitoCaso(sc, s, sc.caso_produzione), "rosso");
    assert.equal(casiDisponibili(sc, s).length, sc.casi.length + 1);
  });

  prova(`[${lingua}] griglia_test: gioco "quando si rilancia" con riscontro`, () => {
    const vuoto = verifica(sc, st({ vista: "decidi" }));
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    const giuste = Object.fromEntries(sc.situazioni.map((x) => [x.id, x.migliore]));
    assert.equal(verifica(sc, st({ vista: "decidi", scelte: giuste })).giuste, sc.situazioni.length);
    assert.equal(giuste.s1, "rilancia", "anche il solo cambio di istruzioni richiede il rilancio");
    const sb = verifica(sc, st({ vista: "decidi", scelte: { ...giuste, s1: "non_serve" } }));
    assert.equal(sb.righe.find((r) => r.id === "s1").esito, "sbagliato");
    for (const r of [...vuoto.righe, ...sb.righe]) assert.ok(!/\{\w+\}/.test(r.testo), r.testo);
  });

  prova(`[${lingua}] griglia_test: caselle dentro il riquadro, senza sovrapposizioni, deterministiche`, () => {
    const s = st({ produzione: true });
    const pos = posizioni(sc, s);
    const v = Object.values(pos);
    for (const p of v) assert.ok(p.x >= 0 && p.x + p.w <= 720 && p.y >= 80 && p.y + p.h <= 380, JSON.stringify(p));
    for (let i = 0; i < v.length; i++) for (let j = i + 1; j < v.length; j++) {
      const a = v[i], b = v[j];
      assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, "caselle sovrapposte");
    }
    assert.deepEqual(pos, posizioni(sc, s));
  });
}
