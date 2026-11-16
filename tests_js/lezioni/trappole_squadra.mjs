// Prove della lezione P6.4 "Le trappole della squadra di agenti" (logica pura, entrambe le lingue).
import { catena, rimpallo, esplode, registro, archiColpa, verdetto, chiamate, costo, verifica, posizioni, aCapo } from "../../webapp/animazioni/trappole_squadra.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("trappole_squadra.json"), lingua);
  const sc = L.scenario;
  const base = L.segmenti[0].stato_animazione;
  const st = (d) => ({ ...base, ...d });

  prova(`[${lingua}] trappole_squadra: segmenti validi, riassunto in 3 frasi, contatore in ogni scena`, () => {
    for (const seg of L.segmenti) {
      const s = seg.stato_animazione;
      if (s.vista !== "decidi") assert.ok(costo(sc, s).chiamate > 0, seg.id);
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
    assert.equal(costo(sc, st({ vista: "decidi" })), null);
  });

  prova(`[${lingua}] trappole_squadra: il telefono senza fili perde i fatti a ogni passaggio`, () => {
    const r = catena(sc, st({}));
    assert.equal(r.intatti, 1, "con il riassunto al report arriva solo il paese");
    assert.ok(r.agenti.slice(1).every((a) => a.macchiato));
    assert.equal(r.agenti[1].ricevuti.vincolo, "perso");
    const scheda = catena(sc, st({ passaggio: "scheda" }));
    assert.equal(scheda.intatti, scheda.totale);
    assert.ok(scheda.agenti.every((a) => !a.macchiato));
  });

  prova(`[${lingua}] trappole_squadra: l'errore iniziale corre lungo la catena, il controllo lo ferma`, () => {
    const e = catena(sc, st({ errore: true, passaggio: "scheda" }));
    assert.ok(e.agenti.every((a) => a.macchiato), "senza controlli la macchia arriva al report");
    assert.ok(e.agenti[1].prodotto.includes(sc.catena.derivati.lingua.errato));
    assert.ok(e.agenti[2].prodotto.includes(sc.catena.derivati.citta.errato));
    const c1 = catena(sc, st({ errore: true, passaggio: "scheda", controlli: [1] }));
    assert.deepEqual(c1.avvisi, [1]);
    assert.ok(c1.agenti[0].macchiato && c1.agenti.slice(1).every((a) => !a.macchiato));
    const c3 = catena(sc, st({ errore: true, passaggio: "scheda", controlli: [3] }));
    assert.equal(c3.agenti.filter((a) => a.macchiato).length, 3, "un controllo tardivo lascia passare i danni prima");
    assert.equal(chiamate(sc, st({ controlli: [1, 2] })), sc.catena.agenti.length + 2 * sc.catena.chiamate_per_controllo);
    for (const a of c3.agenti) assert.ok(!/\{\w+\}/.test(a.prodotto), a.prodotto);
  });

  prova(`[${lingua}] trappole_squadra: rimpallo infinito, limite con persona, ruoli chiari`, () => {
    const inf = rimpallo(sc, st({ vista: "rimpallo" }));
    assert.equal(inf.esito, "infinito");
    assert.equal(inf.passaggi, sc.rimpallo.simulazione_max);
    const lim = rimpallo(sc, st({ vista: "rimpallo", limite: 4 }));
    assert.equal(lim.esito, "persona");
    assert.equal(lim.archi.reduce((t, a) => t + (a.a === "persona" ? 0 : a.n), 0), 4);
    assert.ok(lim.archi.some((a) => a.a === "persona"));
    const ruoli = rimpallo(sc, st({ vista: "rimpallo", ruoli_chiari: true }));
    assert.equal(ruoli.esito, "risolto");
    assert.ok(costo(sc, st({ vista: "rimpallo" })).euro_mese > costo(sc, st({ vista: "rimpallo", limite: 4 })).euro_mese);
    assert.ok(costo(sc, st({ vista: "rimpallo", limite: 4 })).euro_mese > costo(sc, st({ vista: "rimpallo", ruoli_chiari: true })).euro_mese);
  });

  prova(`[${lingua}] trappole_squadra: con tutti con tutti i messaggi esplodono, la qualita' no`, () => {
    assert.equal(esplode(sc, st({ vista: "esplode", agenti: 8 })).messaggi, 56);
    assert.ok(L.segmenti.find((x) => x.id === "esplode").narrazione[0].includes("56"), "la narrazione cita il conto giusto");
    assert.equal(esplode(sc, st({ vista: "esplode", agenti: 8, topologia: "coordinatore" })).messaggi, 14);
    assert.equal(esplode(sc, st({ vista: "esplode", agenti: 1 })).messaggi, 0);
    assert.ok(!esplode(sc, st({ vista: "esplode", agenti: 3 })).spreco);
    assert.ok(esplode(sc, st({ vista: "esplode", agenti: 8 })).spreco);
    assert.equal(esplode(sc, st({ vista: "esplode", agenti: 6 })).archi.length, 15);
    const c2 = costo(sc, st({ vista: "esplode", agenti: 2 })).euro_mese, c8 = costo(sc, st({ vista: "esplode", agenti: 8 })).euro_mese;
    assert.ok(c8 > 10 * c2, "il costo cresce molto piu' degli agenti");
  });

  prova(`[${lingua}] trappole_squadra: senza identificativo il colpevole non si dimostra`, () => {
    const K = sc.colpa;
    assert.equal(verdetto(sc, st({ vista: "colpa" })), null);
    assert.equal(verdetto(sc, st({ vista: "colpa", sospettato: K.colpevole })).esito, "non_dimostrabile");
    assert.equal(verdetto(sc, st({ vista: "colpa", traccia: true, sospettato: K.colpevole })).esito, "giusto");
    const sb = verdetto(sc, st({ vista: "colpa", traccia: true, sospettato: "report" }));
    assert.equal(sb.esito, "sbagliato");
    assert.ok(!/\{\w+\}/.test(sb.testo));
    assert.ok(registro(sc, st({ vista: "colpa" })).every((r) => !r.evidenziata && !r.req_visibile));
    const tr = registro(sc, st({ vista: "colpa", traccia: true })).filter((r) => r.evidenziata);
    assert.ok(tr.length >= 3 && tr.every((r) => r.req === K.richiesta));
    assert.ok(tr.some((r) => r.agente === K.colpevole));
    const tutti = archiColpa(sc, st({ vista: "colpa" })).reduce((t, a) => t + a.n, 0);
    const nostra = archiColpa(sc, st({ vista: "colpa", traccia: true })).reduce((t, a) => t + a.n, 0);
    assert.ok(tutti > nostra && nostra === tr.length - 1);
    assert.ok(new Set(K.eventi.map((e) => e.req)).size === 3);
  });

  prova(`[${lingua}] trappole_squadra: gioco "Decidi tu" con riscontro spiegato`, () => {
    const vuoto = verifica(sc, st({ vista: "decidi" }));
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    const migliori = Object.fromEntries(sc.casi.map((c) => [c.id, c.migliore]));
    assert.equal(verifica(sc, st({ vista: "decidi", scelte: migliori })).giuste, sc.casi.length);
    assert.equal(new Set(Object.values(migliori)).size, sc.risposte_gioco.length, "ogni contromisura e' la migliore per un caso");
    const misto = verifica(sc, st({ vista: "decidi", scelte: { ...migliori, k2: "ruoli", k3: "semplice" } }));
    assert.equal(misto.righe.find((r) => r.id === "k2").esito, "quasi");
    assert.equal(misto.righe.find((r) => r.id === "k3").esito, "sbagliato");
    for (const r of [...vuoto.righe, ...misto.righe]) assert.ok(!/\{\w+\}/.test(r.testo), r.testo);
    for (const c of sc.casi) assert.ok(aCapo(c.testo, 92).length <= 2, `caso ${c.id} troppo lungo per la card`);
  });

  prova(`[${lingua}] trappole_squadra: nodi del grafo dentro il riquadro e deterministici`, () => {
    const casi = [st({}), st({ vista: "rimpallo" }), st({ vista: "colpa" }), ...[1, 2, 5, 8].flatMap((n) => [st({ vista: "esplode", agenti: n }), st({ vista: "esplode", agenti: n, topologia: "coordinatore" })])];
    for (const s of casi) {
      const pos = posizioni(sc, s);
      assert.ok(Object.keys(pos).length > 0);
      for (const p of Object.values(pos)) {
        if ("cx" in p) assert.ok(p.cx - p.r >= 0 && p.cx + p.r <= 720 && p.cy - p.r >= 40 && p.cy + p.r + 16 <= 420, JSON.stringify(p));
        else assert.ok(p.x >= 0 && p.x + p.w <= 720 && p.y >= 40 && p.y + p.h <= 420, JSON.stringify(p));
      }
      assert.deepEqual(pos, posizioni(sc, s));
    }
    // registro e chip dentro la scena
    assert.ok(140 + (sc.colpa.eventi.length - 1) * 26 + 8 <= 420);
    const ordine = sc.colpa.agenti.map((a) => a.id);
    for (const a of archiColpa(sc, st({ vista: "colpa" }))) assert.equal(ordine.indexOf(a.a) - ordine.indexOf(a.da), 1, `freccia non fra vicini: ${a.da}>${a.a}`);
    assert.ok(196 + (sc.catena.fatti.length - 1) * 26 + 22 <= 318 - 10);
  });
}
