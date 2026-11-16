// Prove della lezione P6.1 "Uno o tanti?" (logica pura, entrambe le lingue).
import { precisione, consiglio, costi, verifica, posizioni, nomeStrumento, sovrappostiAttivi, aCapo } from "../../webapp/animazioni/uno_o_tanti.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("uno_o_tanti.json"), lingua);
  const sc = L.scenario;
  const base = { vista: "uno", condizioni: 2, sovrapposti: 0, nomi_chiari: false, agente_aperto: "pianificatore", scelte: {}, verificato: false };
  const st = (d) => ({ ...base, ...d });

  prova(`[${lingua}] uno_o_tanti: dati coerenti, segmenti validi, riassunto in 3 frasi`, () => {
    assert.equal(sc.strumenti.length, 16);
    assert.equal(sc.strumenti.filter((t) => t.simile).length, sc.sovrapposti.max);
    for (const t of sc.strumenti) assert.ok(sc.agenti.some((a) => a.id === t.agente), t.id);
    assert.equal(sc.agenti.filter((a) => a.scrive_crm).length, 1, "un solo agente scrive nel CRM");
    for (const seg of L.segmenti) {
      const s = seg.stato_animazione;
      assert.ok(precisione(sc, s).valore >= sc.parametri.precisione_minima);
      assert.ok(sc.testi[`consiglio_${consiglio(sc, s)}`]);
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });

  prova(`[${lingua}] uno_o_tanti: strumenti simili e condizioni abbassano le scelte corrette`, () => {
    assert.ok(precisione(sc, st({})).valore >= sc.parametri.soglia_dividi);
    assert.equal(consiglio(sc, st({})), "ok");
    assert.ok(precisione(sc, st({ sovrapposti: 9 })).valore < precisione(sc, st({ sovrapposti: 3 })).valore);
    assert.ok(precisione(sc, st({ condizioni: 12 })).valore < precisione(sc, st({ condizioni: 4 })).valore);
    assert.equal(sovrappostiAttivi(sc, st({ sovrapposti: 4 })).length, 4);
  });

  prova(`[${lingua}] uno_o_tanti: chiarire i nomi cura la somiglianza, non la logica complessa`, () => {
    assert.equal(consiglio(sc, st({ sovrapposti: 7 })), "chiarisci");
    assert.equal(consiglio(sc, st({ sovrapposti: 7, nomi_chiari: true })), "ok");
    assert.equal(consiglio(sc, st({ condizioni: 12, sovrapposti: 7, nomi_chiari: true })), "dividi_logica");
    assert.equal(consiglio(sc, st({ condizioni: 10 })), "dividi_logica");
    const t = sc.strumenti[0];
    assert.equal(nomeStrumento(sc, st({ sovrapposti: 1 }), t).tipo, "simile");
    assert.equal(nomeStrumento(sc, st({ sovrapposti: 1, nomi_chiari: true }), t).tipo, "chiarito");
  });

  prova(`[${lingua}] uno_o_tanti: la squadra sceglie meglio ma costa coordinamento`, () => {
    const uno = costi(sc, st({})), sq = costi(sc, st({ vista: "squadra" }));
    assert.ok(sq.chiamate > uno.chiamate && sq.secondi > uno.secondi && sq.messaggi > uno.messaggi);
    assert.equal(uno.messaggi, 0);
    assert.ok(precisione(sc, st({ vista: "squadra", condizioni: 12, sovrapposti: 9 })).valore > precisione(sc, st({ condizioni: 12, sovrapposti: 9 })).valore);
    assert.equal(consiglio(sc, st({ vista: "squadra" })), "squadra");
  });

  prova(`[${lingua}] uno_o_tanti: gioco "Decidi tu" con riscontro spiegato`, () => {
    const vuoto = verifica(sc, st({ vista: "decidi" }));
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    const migliori = Object.fromEntries(sc.casi.map((c) => [c.id, c.migliore]));
    assert.equal(verifica(sc, st({ vista: "decidi", scelte: migliori })).giuste, sc.casi.length);
    assert.equal(migliori.k2, "chiarisci");
    assert.equal(migliori.k5, "uno", "18 strumenti distinti: un agente basta");
    const misto = verifica(sc, st({ vista: "decidi", scelte: { ...migliori, k2: "squadra", k1: "squadra" } }));
    assert.equal(misto.righe.find((r) => r.id === "k2").esito, "quasi");
    assert.equal(misto.righe.find((r) => r.id === "k1").esito, "sbagliato");
    for (const r of [...vuoto.righe, ...misto.righe]) assert.ok(!/\{\w+\}/.test(r.testo), r.testo);
    for (const c of sc.casi) assert.ok(aCapo(c.testo, 92).length <= 2, `caso ${c.id} troppo lungo per la card`);
  });

  prova(`[${lingua}] uno_o_tanti: posizioni dentro il riquadro e deterministiche`, () => {
    for (const s of [st({}), st({ vista: "squadra" })]) {
      const pos = posizioni(sc, s);
      assert.equal(Object.keys(pos).length, 16);
      for (const p of Object.values(pos)) assert.ok(p.x >= 0 && p.x + 150 <= 720 && p.y >= 0 && p.y + 22 <= 420, JSON.stringify(p));
      assert.deepEqual(pos, posizioni(sc, s));
      const chiavi = new Set(Object.values(pos).map((p) => `${p.x},${p.y}`));
      assert.equal(chiavi.size, 16, "due strumenti nello stesso posto");
    }
    assert.equal(Object.keys(posizioni(sc, st({ vista: "decidi" }))).length, 0);
  });
}
