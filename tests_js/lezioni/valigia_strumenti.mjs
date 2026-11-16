// Prove della lezione P4.4 "Tanti strumenti, poco contesto" (logica pura, entrambe le lingue).
import { contesto, sandbox, misura } from "../../webapp/animazioni/valigia_strumenti.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("valigia_strumenti.json"), lingua);
  const sc = L.scenario;
  const base = L.segmenti[0].stato_animazione;
  const st = (diff) => ({ ...base, ...diff });

  prova(`[${lingua}] valigia_strumenti: ogni segmento valido, riassunto in 3 frasi`, () => {
    for (const seg of L.segmenti) {
      const c = contesto(sc, seg.stato_animazione);
      assert.ok(c.usati > 0 && c.pct >= 0);
      assert.ok(misura(sc, seg.stato_animazione).spiega);
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });

  prova(`[${lingua}] valigia_strumenti: 22 strumenti riempiono circa meta' della valigia, 60 la fanno traboccare`, () => {
    assert.equal(base.strumenti, 22);
    const c22 = contesto(sc, st({ modalita: "tutto", strumenti: 22 }));
    assert.ok(c22.pct >= 45 && c22.pct <= 60 && !c22.trabocca, String(c22.pct));
    const c60 = contesto(sc, st({ modalita: "tutto", strumenti: 60 }));
    assert.ok(c60.trabocca && c60.qualita === 0);
    assert.ok(c60.costo > c22.costo);
  });

  prova(`[${lingua}] valigia_strumenti: con tutto caricato la qualita' cala oltre la soglia e scatta l'avviso`, () => {
    const q = (n) => contesto(sc, st({ modalita: "tutto", strumenti: n })).qualita;
    assert.ok(q(10) > q(30));
    assert.ok(!contesto(sc, st({ modalita: "tutto", strumenti: 15 })).avviso);
    assert.ok(contesto(sc, st({ modalita: "tutto", strumenti: 30 })).avviso);
  });

  prova(`[${lingua}] valigia_strumenti: lo specialista occupa poco ma copre solo i compiti del suo elenco`, () => {
    const sp = contesto(sc, st({ modalita: "specialista", strumenti: 40 }));
    assert.ok(!sp.trabocca && sp.pct < 30);
    assert.ok(sp.copertura < 20);
    assert.equal(contesto(sc, st({ modalita: "specialista", strumenti: 5 })).copertura, 100);
  });

  prova(`[${lingua}] valigia_strumenti: la scoperta progressiva resta quasi stabile da 5 a 100 strumenti`, () => {
    const p5 = contesto(sc, st({ modalita: "progressiva", strumenti: 5 }));
    const p100 = contesto(sc, st({ modalita: "progressiva", strumenti: 100 }));
    assert.ok(!p100.trabocca && p100.pct - p5.pct < 20, `${p5.pct} -> ${p100.pct}`);
    assert.ok(contesto(sc, st({ modalita: "tutto", strumenti: 100 })).trabocca);
    assert.ok(p100.blocchi.some((b) => b.tipo === "etichette") && p100.blocchi.filter((b) => b.tipo === "manuale").length === sc.parametri.manuali_aperti);
  });

  prova(`[${lingua}] valigia_strumenti: la sandbox filtra 83 trattative e al modello ne arrivano 5`, () => {
    const con = sandbox(sc, st({ filtro: true })), senza = sandbox(sc, st({ filtro: false }));
    assert.equal(con.dentro, 83);
    assert.equal(con.alModello, 5);
    assert.equal(senza.alModello, 83);
    assert.ok(senza.tokenPassi > 10 * con.tokenPassi);
  });

  prova(`[${lingua}] valigia_strumenti: dichiarato 98,7 -> ricalcolo 95,7 -> misurato 74,8, piu' lento`, () => {
    assert.deepEqual(sc.tappe.map((t) => t.pct), [98.7, 95.7, 74.8]);
    assert.ok(!misura(sc, st({ tappa: 0 })).mostraTempo && misura(sc, st({ tappa: 2 })).mostraTempo);
    const M = sc.misura_reale;
    assert.ok(M.tempo_codice > M.tempo_classico && M.costo_codice < M.costo_classico);
    assert.equal(Math.round((1 - M.costo_codice / M.costo_classico) * 1000) / 10, 69.5);
    assert.equal(Math.floor((M.tempo_codice / M.tempo_classico - 1) * 100), 42, "dichiarato «42% slower»");
    assert.throws(() => misura(sc, st({ tappa: 9 })));
  });

  prova(`[${lingua}] valigia_strumenti: deterministico, nessun segnaposto nei testi a modello`, () => {
    assert.deepEqual(contesto(sc, st({})), contesto(sc, st({})));
    for (const t of sc.tappe) assert.ok(!/\{\w+\}/.test(t.spiega));
  });
}
