// Prove della lezione P1.4 "Anatomia di un agente" (logica pura del modulo anatomia_agente.js).
import { esegui, diagnostica, prossimoMistero, blocchiEffettivi } from "../../webapp/animazioni/anatomia_agente.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("anatomia_agente.json"), lingua);
  const sc = L.scenario;
  const tutto = { modello: true, strumenti: true, orchestrazione: true, memoria: true, modalita: "prova", mistero: "memoria" };
  const e = (diff) => esegui(sc, { ...tutto, ...diff });
  const sintomi = (r) => r.sintomi.map((x) => x.blocco);

  prova(`[${lingua}] anatomia_agente: ogni segmento produce un'esecuzione completa`, () => {
    for (const seg of L.segmenti) {
      const r = esegui(sc, seg.stato_animazione);
      assert.ok(r.eventi.length > 0 && r.esito.testo);
      for (const ev of r.eventi) assert.ok(!/\{\w+\}/.test(ev.testo), `segnaposto non risolto: ${ev.testo}`);
    }
  });
  prova(`[${lingua}] anatomia_agente: con tutti i pezzi nessun sintomo e il doppione viene saltato`, () => {
    const r = e({});
    assert.equal(r.esito.tipo, "ok");
    assert.deepEqual(r.sintomi, []);
    assert.ok(r.statiLead.includes("saltato"));
    assert.ok(!r.statiLead.includes("doppio") && !r.statiLead.includes("in_coda"));
  });
  prova(`[${lingua}] anatomia_agente: ogni pezzo spento produce il suo guasto tipico`, () => {
    const st = e({ strumenti: false });
    assert.deepEqual(sintomi(st), ["strumenti"]);
    assert.ok(st.statiLead.includes("ipotesi") && !st.statiLead.includes("fatto"));
    const orc = e({ orchestrazione: false });
    assert.deepEqual(sintomi(orc), ["orchestrazione"]);
    assert.equal(orc.statiLead.filter((x) => x === "in_coda").length, sc.arrivi.length - 1);
    const mem = e({ memoria: false });
    assert.deepEqual(sintomi(mem), ["memoria"]);
    assert.equal(mem.statiLead.filter((x) => x === "doppio").length, 1);
    const mod = e({ modello: false });
    assert.deepEqual(sintomi(mod), ["modello"]);
    assert.ok(mod.statiLead.every((x) => x === "fermo"));
  });
  prova(`[${lingua}] anatomia_agente: in diagnosi il blocco misterioso è rotto e si scopre dal sintomo`, () => {
    for (const m of ["modello", "strumenti", "orchestrazione", "memoria"]) {
      const s = { ...tutto, modalita: "diagnosi", mistero: m };
      assert.equal(Object.values(blocchiEffettivi(s)).filter((x) => !x).length, 1);
      assert.deepEqual(sintomi(esegui(sc, s)), [m], `il mistero ${m} deve mostrare il suo sintomo`);
      assert.equal(diagnostica(sc, s, m).giusto, true);
      const altro = prossimoMistero(m);
      const d = diagnostica(sc, s, altro);
      assert.equal(d.giusto, false);
      assert.ok(d.testo && !/\{\w+\}/.test(d.testo));
    }
    assert.throws(() => diagnostica(sc, tutto, "modello"), "fuori dalla diagnosi non si indovina");
  });
  prova(`[${lingua}] anatomia_agente: nuovo mistero fa il giro dei quattro blocchi; deterministico`, () => {
    let m = "modello";
    const visti = new Set();
    for (let i = 0; i < 4; i++) { visti.add(m); m = prossimoMistero(m); }
    assert.equal(visti.size, 4);
    assert.deepEqual(e({ memoria: false }), e({ memoria: false }));
    assert.throws(() => e({ modalita: "boh" }));
  });
}
