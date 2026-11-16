// Prove della lezione P5.1 "La valigia" (context engineering; logica pura, entrambe le lingue).
import { valigia, calcola, posizioni } from "../../webapp/animazioni/valigia_contesto.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("valigia_contesto.json"), lingua);
  const sc = L.scenario;
  const base = { oggetti: [], riassunto: false, togli_vecchi: false, strumenti_utili: false, modo: "contesto", turno: 1, obiettivo: false };
  const st = (diff) => ({ ...base, ...diff });
  const tutti = sc.oggetti.map((o) => o.id);
  const essenziali = ["istruzioni", "esempi", "scheda", "listino", "appunti", "domanda"];

  prova(`[${lingua}] valigia_contesto: dati coerenti, ogni segmento produce una risposta scritta, riassunto in 3 frasi`, () => {
    assert.deepEqual([...sc.ordine_imballo].sort(), [...tutti].sort());
    for (const id of sc.turno2.oggetti) assert.ok(tutti.includes(id));
    for (const seg of L.segmenti) {
      const c = calcola(sc, seg.stato_animazione);
      assert.ok(sc.testi[`r_${c.risposta}`], c.risposta);
      for (const d of c.difetti) assert.ok(sc.testi[`d_${d}`], d);
    }
    for (const k of Object.keys(sc.testi)) assert.ok(!/\{(?!n\}|p\}|q\}|nome\})\w+\}/.test(sc.testi[k]), `${k}: segnaposto inatteso`);
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });

  prova(`[${lingua}] valigia_contesto: selezionare, se manca il listino o la scheda la risposta sbaglia`, () => {
    assert.equal(calcola(sc, st({ oggetti: ["istruzioni", "domanda"] })).risposta, "non_so");
    assert.equal(calcola(sc, st({ oggetti: ["domanda"] })).risposta, "inventato", "senza istruzioni il modello inventa il prezzo");
    assert.equal(calcola(sc, st({ oggetti: ["istruzioni", "domanda", "listino"] })).risposta, "senza_sconto");
    const giusta = calcola(sc, st({ oggetti: essenziali }));
    assert.equal(giusta.risposta, "giusta");
    assert.equal(giusta.qualita, 100);
    assert.equal(calcola(sc, st({ oggetti: ["istruzioni", "listino", "scheda"] })).risposta, "senza_domanda");
  });

  prova(`[${lingua}] valigia_contesto: troppo, gli oggetti in fondo sbiadiscono (la scheda perde lo sconto) e oltre il bordo la chiamata fallisce`, () => {
    const stipata = calcola(sc, st({ oggetti: tutti.filter((x) => x !== "storico") }));
    assert.ok(stipata.rot && !stipata.fallita);
    assert.ok(stipata.blocchi.find((b) => b.id === "scheda").sbiadito, "la scheda in fondo sbiadisce");
    assert.equal(stipata.risposta, "senza_sconto");
    assert.ok(stipata.difetti.includes("scheda_sbiadita"));
    const tutto = calcola(sc, st({ oggetti: tutti }));
    assert.ok(tutto.fallita);
    assert.equal(tutto.risposta, "fallita");
    assert.equal(tutto.qualita, 0);
  });

  prova(`[${lingua}] valigia_contesto: riassumere, i tre aiuti riducono spazio, costo e tempo e la qualita' sale`, () => {
    const passi = [{}, { riassunto: true }, { riassunto: true, togli_vecchi: true }, { riassunto: true, togli_vecchi: true, strumenti_utili: true }]
      .map((a) => calcola(sc, st({ oggetti: tutti, ...a })));
    for (let i = 1; i < passi.length; i++) {
      assert.ok(passi[i].spazio < passi[i - 1].spazio && passi[i].token < passi[i - 1].token && passi[i].secondi < passi[i - 1].secondi);
      assert.ok(passi[i].qualita > passi[i - 1].qualita, `qualita' al passo ${i}`);
    }
    assert.equal(passi.at(-1).risposta, "giusta");
    assert.equal(passi.at(-1).qualita, 100);
  });

  prova(`[${lingua}] valigia_contesto: inserire a ogni turno, con il solo foglio delle istruzioni il secondo turno sbaglia`, () => {
    const comune = { oggetti: essenziali.concat("strumenti"), strumenti_utili: true, turno: 2 };
    const pe = calcola(sc, st({ ...comune, modo: "prompt" }));
    const ce = calcola(sc, st({ ...comune, modo: "contesto" }));
    assert.equal(pe.risposta, "demo_inventata");
    assert.ok(!pe.rifatta && ce.rifatta);
    assert.equal(ce.risposta, "demo_giusta");
    assert.ok(ce.qualita >= 90 && ce.percento < 40, "la valigia rifatta e' piccola e giusta");
    // in prompt engineering la valigia del secondo turno e' quella del primo
    assert.deepEqual(valigia(sc, st({ ...comune, modo: "prompt" })).blocchi.map((b) => b.id), valigia(sc, st({ ...comune, turno: 1 })).blocchi.map((b) => b.id));
  });

  prova(`[${lingua}] valigia_contesto: "Decidi tu", l'obiettivo si raggiunge con poco spazio e non con tutto`, () => {
    const piccola = calcola(sc, st({ oggetti: essenziali, obiettivo: true }));
    assert.ok(piccola.obiettivo);
    assert.ok(piccola.percento <= sc.obiettivo.spazio_max);
    assert.ok(!calcola(sc, st({ oggetti: tutti, riassunto: true, obiettivo: true })).obiettivo);
    assert.ok(!calcola(sc, st({ oggetti: [], obiettivo: true })).obiettivo);
  });

  prova(`[${lingua}] valigia_contesto: posizioni dentro il riquadro, deterministiche`, () => {
    for (const s of [st({ oggetti: tutti }), st({ oggetti: essenziali }), st({ turno: 2, oggetti: tutti, modo: "prompt" })]) {
      const p = posizioni(sc, s);
      for (const b of p.blocchi) assert.ok(b.x >= 0 && b.x + b.w <= 720 && b.y >= 0 && b.y + b.h <= 412, JSON.stringify(b));
      for (const c of Object.values(p.chip)) assert.ok(c.x >= 0 && c.x + c.w <= 720 && c.y + c.h <= 412);
      assert.deepEqual(p, posizioni(sc, s));
    }
  });
}
