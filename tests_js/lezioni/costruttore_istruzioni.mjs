// Prove della lezione P2.1 "Le istruzioni di sistema" (logica pura, entrambe le lingue).
import { componi, sposta, testoBlocco } from "../../webapp/animazioni/costruttore_istruzioni.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("costruttore_istruzioni.json"), lingua);
  const sc = L.scenario;
  const tutti = Object.fromEntries(sc.blocchi.map((b) => [b.id, true]));
  const ordine = sc.blocchi.map((b) => b.id);
  const st = (diff) => ({ attivi: { ...tutti }, ordine: ordine.slice(), vincoli_testo: "chiaro", lead: "con_nome", ...diff });
  const senza = (id, diff) => st({ attivi: { ...tutti, [id]: false }, ...(diff || {}) });
  const testo = (r) => r.righe.map((x) => x.testo).join("\n");

  prova(`[${lingua}] costruttore_istruzioni: ogni segmento compone un'email completa, senza segnaposto irrisolti`, () => {
    for (const seg of L.segmenti) {
      const r = componi(sc, seg.stato_animazione);
      assert.ok(r.righe.length >= 3 && r.generazioni.length === 5);
      for (const x of [...r.righe.map((y) => y.testo), ...r.spiegazioni.map((y) => y.testo)]) assert.ok(!/\{\w+\}/.test(x), x);
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });
  prova(`[${lingua}] costruttore_istruzioni: tutti i blocchi accesi = nessun difetto, entro il limite di parole, 1 sola versione`, () => {
    const r = componi(sc, st({}));
    assert.deepEqual(r.difetti, []);
    assert.ok(r.parole <= sc.parametri.limite_parole);
    assert.equal(r.variabilita, 1);
  });
  prova(`[${lingua}] costruttore_istruzioni: ogni blocco spento produce il suo difetto visibile`, () => {
    const sconto = componi(sc, senza("vincoli"));
    assert.ok(sconto.difetti.includes("sconto") && sconto.righe.some((x) => x.difetto === "sconto"));
    const formato = componi(sc, senza("formato"));
    assert.ok(formato.difetti.includes("formato") && !formato.righe.some((x) => x.tipo === "oggetto" || x.tipo === "firma"));
    assert.ok(componi(sc, senza("ruolo")).difetti.includes("tono"));
    const obiettivo = componi(sc, senza("obiettivo"));
    assert.ok(obiettivo.difetti.includes("senza_cta") && !obiettivo.righe.some((x) => x.chiave === "cta"));
    const placeholder = componi(sc, senza("dubbio", { lead: "senza_nome" }));
    assert.ok(placeholder.difetti.includes("segnaposto") && /\[/.test(placeholder.righe.find((x) => x.tipo === "saluto").testo));
    const neutro = componi(sc, st({ lead: "senza_nome" }));
    assert.ok(!neutro.difetti.includes("segnaposto") && neutro.righe.some((x) => x.tipo === "nota"));
    assert.ok(!componi(sc, senza("dubbio")).difetti.length, "con il nome presente il blocco dubbio non serve");
  });
  prova(`[${lingua}] costruttore_istruzioni: senza esempi o con «sii breve» la variabilita' sale`, () => {
    const con = componi(sc, st({})), senzaEs = componi(sc, senza("esempi"));
    assert.ok(senzaEs.variabilita >= sc.parametri.soglia_variabilita_alta && senzaEs.variabilita > con.variabilita);
    const amb = componi(sc, st({ vincoli_testo: "ambiguo" }));
    assert.ok(amb.difetti.includes("ambiguo") && amb.variabilita >= sc.parametri.soglia_variabilita_alta);
    const l = amb.generazioni.map((g) => g.parole);
    assert.ok(Math.max(...l) - Math.min(...l) > 100);
  });
  prova(`[${lingua}] costruttore_istruzioni: l'ordine conta SOLO con istruzioni in contrasto; determinismo`, () => {
    const giu = sposta(ordine, "formato", 0); // formato prima di vincoli
    for (const v of ["chiaro", "ambiguo"]) {
      assert.deepEqual(componi(sc, st({ vincoli_testo: v })), componi(sc, st({ vincoli_testo: v, ordine: giu })), `con «${v}» l'ordine non deve cambiare nulla`);
      assert.deepEqual(componi(sc, senza("esempi", { vincoli_testo: v })), componi(sc, senza("esempi", { vincoli_testo: v, ordine: giu })));
    }
    const a = componi(sc, st({ vincoli_testo: "contraddittorio" }));
    const b = componi(sc, st({ vincoli_testo: "contraddittorio", ordine: sposta(ordine, "vincoli", ordine.length - 1) }));
    assert.ok(a.conflitto && b.conflitto && a.difetti.includes("conflitto"));
    assert.equal(a.vince, "formato");
    assert.equal(b.vince, "vincoli");
    assert.notEqual(testo(a), testo(b));
    assert.ok(a.parole > b.parole);
    assert.notEqual(testoBlocco(sc, st({ vincoli_testo: "contraddittorio" }), "formato"), testoBlocco(sc, st({}), "formato"));
    assert.deepEqual(componi(sc, st({ vincoli_testo: "ambiguo" })), componi(sc, st({ vincoli_testo: "ambiguo" })));
    assert.throws(() => componi(sc, st({ ordine: ["ruolo"] })));
  });
}
