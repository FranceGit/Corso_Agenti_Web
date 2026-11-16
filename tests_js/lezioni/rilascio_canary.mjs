// Prove del laboratorio P8.1 "Il rilascio canarino" (logica pura, entrambe le lingue).
import { simula, puntini, grafico, verifica } from "../../webapp/animazioni/rilascio_canary.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("rilascio_canary.json"), lingua);
  const sc = L.scenario;
  const base = L.segmenti[0].stato_animazione;
  const st = (diff) => ({ ...base, ...diff });
  const aperti = (t) => assert.ok(!/\{\w+\}/.test(t), t);

  prova(`[${lingua}] rilascio_canary: laboratorio coerente, si parte dall'1%, riassunto in 3 frasi`, () => {
    assert.equal(L.tipo, "laboratorio");
    assert.equal(sc.gradini[0], 1, "la fonte (WP5 p.16) fa partire il canary dall'1%");
    assert.deepEqual([...sc.gradini].sort((a, b) => a - b), sc.gradini);
    for (const v of [sc.v1, ...Object.values(sc.versioni_v2)]) assert.equal(v.successo.length, sc.giorni);
    for (const v of Object.values(sc.versioni_v2)) assert.equal(v.tasso_problemi.length, sc.giorni);
    for (const seg of L.segmenti) simula(sc, seg.stato_animazione);
    assert.equal(L.segmenti[0].stato_animazione.traffico, 1);
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });

  prova(`[${lingua}] rilascio_canary: il cursore sposta le richieste e i pallini verso la v2`, () => {
    const uno = simula(sc, st({ traffico: 1 })), cento = simula(sc, st({ traffico: 100 }));
    assert.equal(uno.req2, sc.richieste_giorno / 100);
    assert.equal(cento.req2, sc.richieste_giorno);
    assert.equal(puntini(sc, st({ traffico: 25 })).filter((x) => x === "v2").length, 25);
    assert.equal(puntini(sc, st({ traffico: 1 })).length, sc.puntini);
  });

  prova(`[${lingua}] rilascio_canary: la v2 buona resta sopra soglia, la difettosa scende e fa danni`, () => {
    const b = simula(sc, st({ versione_v2: "buona", traffico: 100 }));
    assert.equal(b.sotto, null);
    assert.equal(b.colpiti, 0);
    assert.equal(b.rollback, null);
    const d = simula(sc, st({ versione_v2: "difettosa", traffico: 25, reazione: "nessuna" }));
    assert.equal(d.sotto, 1);
    assert.ok(d.email_non_approvate > 0 && d.reclami > 0);
    assert.ok(d.incidente_visto);
  });

  prova(`[${lingua}] rilascio_canary: lo stesso difetto all'1% colpisce cento volte meno clienti`, () => {
    for (const reazione of ["nessuna", "manuale", "automatica"]) {
      const uno = simula(sc, st({ versione_v2: "difettosa", traffico: 1, reazione })).colpiti;
      const cento = simula(sc, st({ versione_v2: "difettosa", traffico: 100, reazione })).colpiti;
      assert.ok(uno > 0);
      assert.equal(cento, uno * 100, reazione);
    }
  });

  prova(`[${lingua}] rilascio_canary: il rollback automatico ferma il danno prima di quello a mano`, () => {
    const d = (reazione) => simula(sc, st({ versione_v2: "difettosa", traffico: 25, reazione }));
    assert.equal(d("automatica").rollback, d("automatica").sotto, "rollback nello stesso giorno");
    assert.equal(d("manuale").rollback, d("manuale").sotto + sc.ritardo_manuale_giorni);
    assert.ok(d("automatica").colpiti < d("manuale").colpiti && d("manuale").colpiti < d("nessuna").colpiti);
    assert.equal(d("automatica").traffico_finale, 0);
    const p = puntini(sc, st({ versione_v2: "difettosa", traffico: 25, reazione: "automatica" }));
    assert.equal(p.filter((x) => x === "v2").length, 0);
    assert.equal(p.filter((x) => x === "ritirato").length, 25);
    assert.ok(d("nessuna").etichetta_v2.includes("v14"), "l'etichetta indica la combinazione colpevole");
  });

  prova(`[${lingua}] rilascio_canary: gioco "Decidi tu" con riscontro spiegato`, () => {
    const vuoto = verifica(sc, st({}));
    assert.ok(vuoto.righe.every((x) => x.esito === "vuoto"));
    const migliori = Object.fromEntries(sc.gioco.map((g) => [g.id, g.migliore]));
    assert.equal(verifica(sc, st({ scelte: migliori })).giuste, sc.gioco.length);
    assert.equal(migliori.m_soglia, "torna");
    assert.equal(migliori.m_ripartenza, "da_1");
    const misto = verifica(sc, st({ scelte: { ...migliori, m_giorno1: "sali_100", m_soglia: "scendi_5" } }));
    assert.equal(misto.righe.find((x) => x.id === "m_giorno1").esito, "sbagliato");
    assert.equal(misto.righe.find((x) => x.id === "m_soglia").esito, "quasi");
    for (const x of [...vuoto.righe, ...misto.righe]) aperti(x.testo);
    aperti(misto.sintesi);
    for (const t of Object.values(sc.testi)) assert.ok(typeof t === "string" && t.length > 0);
  });

  prova(`[${lingua}] rilascio_canary: curve dentro il riquadro, deterministiche`, () => {
    for (const s of [st({}), st({ versione_v2: "difettosa", traffico: 100, reazione: "nessuna" }), st({ versione_v2: "difettosa", reazione: "manuale" })]) {
      const G = grafico(sc, s);
      for (const q of [...G.v1, ...G.v2]) assert.ok(q.x >= 0 && q.x <= 720 && q.y >= 0 && q.y <= 420, JSON.stringify(q));
      assert.ok(G.soglia_y > 0 && G.soglia_y < 420);
      if (G.rollback_x !== null) assert.ok(G.rollback_x + 14 <= 720);
      assert.deepEqual(G, grafico(sc, s));
    }
    assert.equal(grafico(sc, st({ versione_v2: "difettosa", reazione: "automatica" })).v2.length, 2, "la curva v2 si ferma al rollback");
  });
}
