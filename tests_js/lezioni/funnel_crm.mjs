// Prove della lezione P1.6 "Perche' il CRM e' un terreno ideale per gli agenti" (logica pura, entrambe le lingue).
import { calcola, verifica } from "../../webapp/animazioni/funnel_crm.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("funnel_crm.json"), lingua);
  const sc = L.scenario;
  const base = { volume: 1000, costo_errore: 3, dati_puliti: true, modalita: "auto", lucchetti: {}, stadio_aperto: "lead", verificato: false };
  const st = (diff) => ({ ...base, ...diff });
  const ore = (c, id) => c.stadi.find((x) => x.id === id).ore;
  const chiusi = (c) => c.stadi.filter((x) => x.lucchetto).map((x) => x.id);

  prova(`[${lingua}] funnel_crm: ogni segmento produce numeri validi e il riassunto ha 3 frasi`, () => {
    for (const seg of L.segmenti) {
      const c = calcola(sc, seg.stato_animazione);
      assert.equal(c.stadi.length, sc.stadi.length);
      for (const x of c.stadi) assert.ok(Number.isFinite(x.ore) && x.ore >= 0 && x.lead >= 0);
      assert.ok(sc.stadi.some((x) => x.id === seg.stato_animazione.stadio_aperto));
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });
  prova(`[${lingua}] funnel_crm: piu' volume = piu' tempo risparmiato in ogni stadio`, () => {
    const poco = calcola(sc, st({ volume: 200 })), tanto = calcola(sc, st({ volume: 2000 }));
    for (const x of sc.stadi) assert.ok(ore(tanto, x.id) >= ore(poco, x.id));
    assert.ok(tanto.totale > poco.totale * 5);
  });
  prova(`[${lingua}] funnel_crm: dati sporchi riducono il risparmio`, () => {
    assert.ok(calcola(sc, st({ dati_puliti: false })).totale < calcola(sc, st({})).totale);
  });
  prova(`[${lingua}] funnel_crm: il costo di un errore fa comparire i lucchetti dagli stadi piu' rischiosi`, () => {
    assert.deepEqual(chiusi(calcola(sc, st({ costo_errore: 1 }))), []);
    assert.deepEqual(chiusi(calcola(sc, st({ costo_errore: 3 }))), ["opportunita"]);
    const molti = chiusi(calcola(sc, st({ costo_errore: 6 })));
    assert.ok(molti.includes("mql") && molti.includes("opportunita") && !molti.includes("visitatore"));
    assert.ok(ore(calcola(sc, st({ costo_errore: 3 })), "opportunita") < ore(calcola(sc, st({ costo_errore: 1 })), "opportunita"), "il controllo umano costa tempo");
  });
  prova(`[${lingua}] funnel_crm: "Decidi tu" segnala lucchetti mancanti e inutili; determinismo`, () => {
    const decidi = st({ modalita: "decidi", costo_errore: 6 });
    const nessuno = verifica(sc, decidi);
    assert.ok(nessuno.righe.some((r) => r.esito === "manca"));
    const giusti = Object.fromEntries(calcola(sc, decidi).stadi.map((x) => [x.id, x.consigliato]));
    const perfetto = verifica(sc, { ...decidi, lucchetti: giusti });
    assert.equal(perfetto.giuste, perfetto.totali);
    const inutile = verifica(sc, { ...decidi, lucchetti: { ...giusti, visitatore: true } });
    assert.equal(inutile.righe.find((r) => r.id === "visitatore").esito, "inutile");
    for (const r of [...nessuno.righe, ...inutile.righe]) assert.ok(!/\{\w+\}/.test(r.testo), r.testo);
    assert.ok(!/\{\w+\}/.test(nessuno.sintesi));
    assert.deepEqual(calcola(sc, decidi), calcola(sc, decidi));
  });
}
