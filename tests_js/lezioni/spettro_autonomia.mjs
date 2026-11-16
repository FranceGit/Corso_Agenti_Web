// Prove della lezione P1.5 "Lo spettro dell'autonomia" (logica pura, entrambe le lingue).
import { indicatori, valuta, riepilogo } from "../../webapp/animazioni/spettro_autonomia.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("spettro_autonomia.json"), lingua);
  const sc = L.scenario;
  const tacche = sc.livelli.map((l) => l.n);

  prova(`[${lingua}] spettro_autonomia: ogni segmento parte da una tacca valida e il riassunto ha 3 frasi`, () => {
    for (const seg of L.segmenti) {
      assert.ok(tacche.includes(seg.stato_animazione.livello));
      assert.deepEqual(Object.keys(seg.stato_animazione).sort(), ["assegnazioni", "livello", "scheda_attiva"]);
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });
  prova(`[${lingua}] spettro_autonomia: salendo di tacca flessibilita', costo e rischio crescono, la prevedibilita' cala`, () => {
    for (let i = 1; i < tacche.length; i++) {
      const prima = Object.fromEntries(indicatori(sc, tacche[i - 1]).map((x) => [x.id, x.valore]));
      const dopo = Object.fromEntries(indicatori(sc, tacche[i]).map((x) => [x.id, x.valore]));
      assert.ok(dopo.flessibilita > prima.flessibilita && dopo.costo > prima.costo && dopo.rischio > prima.rischio);
      assert.ok(dopo.prevedibilita < prima.prevedibilita);
    }
  });
  prova(`[${lingua}] spettro_autonomia: ogni scenario ha un riscontro motivato su ogni tacca, senza segnaposto`, () => {
    for (const scen of sc.scenari) for (const n of tacche) {
      const v = valuta(sc, scen.id, n);
      assert.equal(v.esito, n === scen.giusto ? "giusto" : n > scen.giusto ? "troppo" : "poco");
      assert.ok(v.testo.length > 20 && !/\{\w+\}/.test(v.testo), v.testo);
    }
  });
  prova(`[${lingua}] spettro_autonomia: regola del livello minimo (newsletter a regole, preventivi ad agente)`, () => {
    assert.equal(valuta(sc, "newsletter", 1).esito, "giusto");
    assert.equal(valuta(sc, "newsletter", 4).esito, "troppo");
    assert.equal(valuta(sc, "preventivi", 3).esito, "poco");
    assert.equal(valuta(sc, "preventivi", 4).esito, "giusto");
    assert.equal(valuta(sc, "preventivi", 5).esito, "troppo");
  });
  prova(`[${lingua}] spettro_autonomia: riepilogo del gioco e determinismo`, () => {
    const giuste = Object.fromEntries(sc.scenari.map((x) => [x.id, x.giusto]));
    const r = riepilogo(sc, giuste);
    assert.ok(r.completo && r.giuste === sc.scenari.length);
    const vuoto = riepilogo(sc, {});
    assert.equal(vuoto.giuste, 0);
    assert.ok(!vuoto.completo && !/\{\w+\}/.test(vuoto.testo));
    assert.deepEqual(riepilogo(sc, { newsletter: 3 }), riepilogo(sc, { newsletter: 3 }));
    assert.throws(() => valuta(sc, "inesistente", 1));
    assert.throws(() => indicatori(sc, 9));
  });
}
