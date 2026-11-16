// Prove della lezione P7.1 "Cinque strade, quattro lenti" (logica pura, entrambe le lingue).
import { visibili, esitiLenti, lentiAttive, valuta, verifica, esaminaVetro, puntiPercorso } from "../../webapp/animazioni/cinque_strade.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("cinque_strade.json"), lingua);
  const sc = L.scenario;
  const tutte = sc.lenti.map((l) => l.id);
  const base = { vista: "strade", esecuzioni: 5, valuta: "traiettoria", lenti: tutte, scatola: "nera", scelte: {}, verificato: false, percorso_aperto: "A", passo_vetro: "" };
  const st = (diff) => ({ ...base, ...diff });
  const verd = (r, id) => r.righe.find((x) => x.id === id).verdetto;

  prova(`[${lingua}] cinque_strade: dati coerenti, segmenti validi, riassunto in 3 frasi`, () => {
    const nodi = new Set(sc.nodi.map((n) => n.id));
    for (const p of sc.percorsi) {
      for (const id of [...p.sequenza, ...p.giri]) assert.ok(nodi.has(id), `${p.id}: nodo ${id}`);
      assert.ok(sc.gioco[p.id], p.id);
    }
    assert.deepEqual([...sc.ordine_esecuzioni].sort(), sc.percorsi.map((p) => p.id).sort());
    for (const seg of L.segmenti) {
      const r = valuta(sc, seg.stato_animazione);
      assert.equal(r.tot, seg.stato_animazione.esecuzioni);
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
    assert.equal(sc.vetro.passi.filter((p) => p.colpevole).length, 1);
  });

  prova(`[${lingua}] cinque_strade: con un solo lancio sembra tutto perfetto (non determinismo)`, () => {
    const uno = valuta(sc, st({ esecuzioni: 1 }));
    assert.equal(uno.tot, 1);
    assert.equal(uno.verdi, 1, "il primo lancio e' quello fortunato");
    const cinque = valuta(sc, st({ esecuzioni: 5 }));
    assert.ok(cinque.verdi < cinque.tot);
    assert.equal(visibili(sc, st({ esecuzioni: 2 })).length, 2);
  });

  prova(`[${lingua}] cinque_strade: solo risultato 3 verdi, anche la strada 1 verde`, () => {
    const ris = valuta(sc, st({ valuta: "risultato" }));
    assert.deepEqual(lentiAttive(sc, st({ valuta: "risultato" })), ["efficacia"]);
    assert.equal(ris.verdi, 3);
    assert.deepEqual(ris.righe.filter((r) => r.verde).map((r) => r.id).sort(), ["A", "B", "C"]);
    const tra = valuta(sc, st({}));
    assert.equal(tra.verdi, 1);
    assert.equal(verd(tra, "A"), "promosso");
    assert.equal(verd(tra, "B"), "inefficiente");
    assert.equal(verd(tra, "C"), "rischioso");
    assert.equal(verd(tra, "D"), "fallito");
    assert.equal(verd(tra, "E"), "fallito");
  });

  prova(`[${lingua}] cinque_strade: ogni lente boccia il percorso giusto`, () => {
    const P = (id) => sc.percorsi.find((p) => p.id === id);
    assert.deepEqual(esitiLenti(sc, P("A")), { efficacia: true, efficienza: true, robustezza: true, sicurezza: true });
    assert.equal(esitiLenti(sc, P("B")).efficienza, false);
    assert.equal(esitiLenti(sc, P("C")).sicurezza, false);
    assert.equal(esitiLenti(sc, P("D")).robustezza, false);
    assert.equal(esitiLenti(sc, P("E")).efficacia, false);
    assert.equal(verd(valuta(sc, st({ lenti: ["efficacia"] })), "B"), "promosso");
    assert.equal(verd(valuta(sc, st({ lenti: ["efficacia", "efficienza"] })), "B"), "inefficiente");
    assert.equal(verd(valuta(sc, st({ lenti: ["efficacia"] })), "C"), "promosso");
    assert.equal(verd(valuta(sc, st({ lenti: ["efficacia", "sicurezza"] })), "C"), "rischioso");
  });

  prova(`[${lingua}] cinque_strade: gioco "Decidi tu" con riscontro spiegato`, () => {
    const vuoto = verifica(sc, st({ vista: "decidi" }));
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    const giuste = Object.fromEntries(sc.ordine_esecuzioni.map((id) => [id, sc.gioco[id].migliore]));
    const tutto = verifica(sc, st({ vista: "decidi", scelte: giuste }));
    assert.equal(tutto.giuste, 5);
    assert.equal(tutto.sintesi, sc.testi.ver_tutto_giusto);
    const errore = verifica(sc, st({ vista: "decidi", scelte: { ...giuste, C: "promosso" } }));
    assert.equal(errore.righe.find((r) => r.id === "C").esito, "sbagliato");
    for (const r of [...vuoto.righe, ...errore.righe]) assert.ok(!/\{\w+\}/.test(r.testo), r.testo);
    // il verdetto atteso del gioco coincide con quello delle quattro lenti
    const tra = valuta(sc, st({}));
    for (const id of sc.ordine_esecuzioni) assert.equal(sc.gioco[id].migliore, verd(tra, id), id);
  });

  prova(`[${lingua}] cinque_strade: scena 200 OK, scatola nera e scatola di vetro`, () => {
    const nera = esaminaVetro(sc, st({ vista: "vetro", scatola: "nera", passo_vetro: "v2" }));
    assert.equal(nera.aperta, false);
    assert.equal(nera.passo, null, "a scatola chiusa i passi non si vedono");
    const invito = esaminaVetro(sc, st({ vista: "vetro", scatola: "vetro" }));
    assert.equal(invito.testo, sc.testi.vetro_invito);
    const no = esaminaVetro(sc, st({ vista: "vetro", scatola: "vetro", passo_vetro: "v3" }));
    assert.equal(no.trovato, false);
    const si = esaminaVetro(sc, st({ vista: "vetro", scatola: "vetro", passo_vetro: "v2" }));
    assert.equal(si.trovato, true);
    for (const x of [no, si]) assert.ok(!/\{\w+\}/.test(x.testo));
    assert.ok(sc.vetro.passi.every((p) => p.esito === "200 OK"), "ogni passo dice 200 OK: il guasto e' silenzioso");
  });

  prova(`[${lingua}] cinque_strade: strade dentro il riquadro e deterministiche`, () => {
    for (const p of sc.percorsi) {
      const k = sc.ordine_esecuzioni.indexOf(p.id);
      const pts = puntiPercorso(sc, p, k);
      for (const q of pts) assert.ok(q.x >= 0 && q.x <= 720 && q.y >= 50 && q.y <= 370, JSON.stringify(q));
      assert.deepEqual(pts, puntiPercorso(sc, p, k));
    }
    for (const n of sc.nodi) assert.ok(n.x - 50 >= 0 && n.x + 50 <= 720, n.id);
  });
}
