// Prove della lezione P6.3 "Due piani di connessione" (logica pura, entrambe le lingue).
import { percorso, bilancia, angolo, collegamenti, verifica, geometriaPasso, aCapo } from "../../webapp/animazioni/due_piani_agenti.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("due_piani_agenti.json"), lingua);
  const sc = L.scenario;
  const base = { vista: "modi", modo: "lavagna", agente_aperto: "catalogo", fornitore_acceso: true, fattori: { team: "altro", latenza: "accettabile", contratto: "formale" }, scelte: {}, verificato: false };
  const st = (d) => ({ ...base, ...d });

  prova(`[${lingua}] due_piani_agenti: dati coerenti, segmenti validi, riassunto in 3 frasi`, () => {
    assert.deepEqual(sc.modi.map((m) => m.id), ["lavagna", "strumento", "handoff", "a2a"]);
    for (const a of sc.agenti) for (const t of a.strumenti) assert.ok(sc.strumenti.some((x) => x.id === t), t);
    const card = sc.agenti.find((a) => a.esterno).scheda.join(" ");
    for (const pezzo of ["product_catalog_agent", "/.well-known/agent-card.json", "0.3.0"]) assert.ok(card.includes(pezzo), pezzo);
    for (const seg of L.segmenti) {
      const p = percorso(sc, seg.stato_animazione);
      assert.ok(p.passi.length >= 1);
      assert.ok(["a2a", "locale"].includes(bilancia(sc, seg.stato_animazione).verdetto));
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });

  prova(`[${lingua}] due_piani_agenti: agente come strumento resta al comando, con il passaggio di consegne risponde lo specialista`, () => {
    const str = percorso(sc, st({ modo: "strumento" })), hand = percorso(sc, st({ modo: "handoff" }));
    const m = (id) => sc.modi.find((x) => x.id === id);
    assert.equal(str.parla, m("strumento").a);
    assert.equal(hand.parla, m("handoff").b);
    assert.ok(str.passi.some((p) => p.da === "b" && p.verso === "a"), "la risposta torna a chi chiama");
    assert.ok(!hand.passi.some((p) => p.da === "b" && p.verso === "a"), "con il passaggio di consegne non torna indietro");
    assert.equal(hand.passi.at(-1).da, "b");
    assert.ok(percorso(sc, st({})).passi.some((p) => p.verso === "lavagna"));
  });

  prova(`[${lingua}] due_piani_agenti: spegnere il fornitore produce un errore di rete solo dove c'e' A2A`, () => {
    const ok = percorso(sc, st({ modo: "a2a" })), ko = percorso(sc, st({ modo: "a2a", fornitore_acceso: false }));
    assert.equal(ok.errore, false);
    assert.equal(ko.errore, true);
    assert.equal(ko.passi.at(-1).errore, true);
    assert.ok(ko.passi.length < ok.passi.length, "nessun ritentativo: il percorso si ferma");
    assert.equal(ko.parla, null);
    for (const modo of ["lavagna", "strumento", "handoff"]) assert.equal(percorso(sc, st({ modo, fornitore_acceso: false })).errore, false, modo);
    const c = collegamenti(sc, st({ fornitore_acceso: false }));
    assert.ok(c.a2a.every((k) => !k.attivo));
    assert.ok(c.mcp.filter((k) => k.agente !== "catalogo").every((k) => k.attivo));
  });

  prova(`[${lingua}] due_piani_agenti: la bilancia sceglie A2A per collaborazioni formali tra aziende`, () => {
    assert.equal(bilancia(sc, st({})).verdetto, "a2a");
    assert.equal(bilancia(sc, st({ fattori: { team: "tuo", latenza: "bassa", contratto: "interno" } })).verdetto, "locale");
    assert.equal(bilancia(sc, st({ fattori: { team: "altro", latenza: "bassa", contratto: "formale" } })).verdetto, "a2a");
    assert.ok(angolo(sc, st({})) > 0);
    assert.ok(angolo(sc, st({ fattori: { team: "tuo", latenza: "bassa", contratto: "interno" } })) < 0);
  });

  prova(`[${lingua}] due_piani_agenti: gioco "Decidi tu" con riscontro spiegato`, () => {
    const vuoto = verifica(sc, st({ vista: "decidi" }));
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    const migliori = Object.fromEntries(sc.casi.map((c) => [c.id, c.migliore]));
    assert.equal(verifica(sc, st({ scelte: migliori })).giuste, 4);
    assert.deepEqual(Object.values(migliori).sort(), ["a2a", "handoff", "mcp", "strumento"]);
    const misto = verifica(sc, st({ scelte: { ...migliori, c3: "a2a", c1: "handoff" } }));
    assert.equal(misto.righe.find((r) => r.id === "c3").esito, "quasi");
    assert.equal(misto.righe.find((r) => r.id === "c1").esito, "sbagliato");
    for (const r of [...vuoto.righe, ...misto.righe]) assert.ok(!/\{\w+\}/.test(r.testo));
    for (const c of sc.casi) assert.ok(aCapo(c.testo, 92).length <= 2, c.id);
  });

  prova(`[${lingua}] due_piani_agenti: curve dei passi dentro la scena e senza segnaposto`, () => {
    for (const m of sc.modi) for (const p of m.passi) {
      const g = geometriaPasso(p);
      for (const q of [g.A, g.B, g.c]) assert.ok(q.x > 0 && q.x < 720 && q.y > 0 && q.y < 420, `${m.id}: ${JSON.stringify(q)}`);
      assert.ok(!/\{\w+\}/.test(p.etichetta), p.etichetta);
      assert.deepEqual(g, geometriaPasso(p));
    }
  });
}
