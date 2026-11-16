// Prove della lezione P3.2 "Lead scoring con un LLM" (logica pura, entrambe le lingue).
import { calcola, verifica, punteggioRegole, fascia, testoFonte } from "../../webapp/animazioni/punteggio_lead.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("punteggio_lead.json"), lingua);
  const sc = L.scenario;
  const base = L.segmenti[0].stato_animazione;
  const st = (diff) => ({ ...base, ...diff });
  const riga = (c, id) => c.righe.find((r) => r.id === id);
  const lead = (id) => sc.lead.find((x) => x.id === id);

  prova(`[${lingua}] punteggio_lead: ogni segmento produce 10 righe valide e il riassunto ha 3 frasi`, () => {
    for (const seg of L.segmenti) {
      const c = calcola(sc, seg.stato_animazione);
      assert.equal(c.righe.length, 10);
      assert.equal(new Set(c.ordine).size, 10);
      for (const r of c.righe) assert.ok(Number.isInteger(r.regole) && r.regole >= 0 && r.regole <= 100);
      assert.ok(sc.lead.some((x) => x.id === seg.stato_animazione.lead_aperto));
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });
  prova(`[${lingua}] punteggio_lead: il peso del ruolo fa scendere lo stagista dalla fascia alta`, () => {
    assert.equal(riga(calcola(sc, base), "marco").fReg, "alta");
    const pesante = calcola(sc, st({ pesi: { ...base.pesi, ruolo: 5 } }));
    assert.notEqual(riga(pesante, "marco").fReg, "alta");
    assert.equal(punteggioRegole(sc, { settore: 0, dimensione: 0, comportamento: 0, ruolo: 0 }, lead("laura")), 0);
    assert.equal(fascia(70, 70, 40), "alta");
    assert.equal(fascia(39, 70, 40), "bassa");
  });
  prova(`[${lingua}] punteggio_lead: istruzioni vaghe = tutti 90-92 in fascia alta, nessuna distinzione`, () => {
    const c = calcola(sc, st({ llm: "vaghe" }));
    for (const r of c.righe) assert.ok(r.llm >= 90 && r.llm <= 92, `${r.id}: ${r.llm}`);
    assert.deepEqual(c.distribuzione.modello, { alta: 10, media: 0, bassa: 0 });
    assert.ok(c.accordo.vaghe < c.accordo.regole);
  });
  prova(`[${lingua}] punteggio_lead: criteri espliciti stringono la nuvola dei 5 tentativi e i gemelli concordano`, () => {
    const v = calcola(sc, st({ llm: "vaghe", cinque_volte: true }));
    const e = calcola(sc, st({ llm: "esplicite", cinque_volte: true }));
    for (const id of sc.lead.map((x) => x.id)) assert.ok(riga(e, id).scarto < riga(v, id).scarto, id);
    assert.ok(Math.max(...e.righe.map((r) => r.scarto)) <= 5);
    assert.ok(Math.min(...v.righe.map((r) => r.scarto)) >= 20);
    assert.equal(riga(e, "davide").fLlm, riga(e, "marta").fLlm);
    assert.ok(Math.abs(riga(e, "davide").llm - riga(e, "marta").llm) <= 3);
  });
  prova(`[${lingua}] punteggio_lead: confronto con 4 disaccordi, 2 dove il modello aiuta e 2 dove inventa`, () => {
    const conf = L.segmenti.find((x) => x.id === "confronto").stato_animazione;
    const c = calcola(sc, conf);
    const dis = c.righe.filter((r) => r.disaccordo);
    assert.equal(dis.length, 4);
    assert.deepEqual(dis.filter((r) => r.fonte === "nota").map((r) => r.id).sort(), ["paolo", "sara"]);
    assert.deepEqual(dis.filter((r) => r.fonte === "nessuna").map((r) => r.id).sort(), ["chiara", "elena"]);
    const vuota = verifica(sc, conf);
    assert.equal(vuota.giusti, 0);
    assert.ok(vuota.righe.every((r) => r.classe === "manca"));
    const giuste = Object.fromEntries(vuota.righe.map((r) => [r.id, r.atteso]));
    assert.equal(verifica(sc, { ...conf, marcature: giuste }).giusti, 4);
    const sbagliate = verifica(sc, { ...conf, marcature: { ...giuste, elena: "aiuta" } });
    assert.equal(sbagliate.righe.find((r) => r.id === "elena").classe, "no");
    for (const r of [...vuota.righe, ...sbagliate.righe]) assert.ok(!/\{\w+\}/.test(r.testo), r.testo);
    for (const ld of sc.lead) assert.ok(!/\{\w+\}/.test(testoFonte(sc, ld)));
  });
  prova(`[${lingua}] punteggio_lead: la soluzione mista indovina piu' lead di ogni metodo da solo; determinismo`, () => {
    const mista = L.segmenti.find((x) => x.id === "mista").stato_animazione;
    const A = calcola(sc, mista).accordo;
    assert.equal(A.mista, A.totale);
    assert.ok(A.mista > A.regole && A.mista > A.esplicite && A.esplicite > A.vaghe);
    assert.equal(calcola(sc, mista).ordine[0], "laura");
    assert.deepEqual(calcola(sc, mista), calcola(sc, mista));
  });
}
