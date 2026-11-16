// Prove della lezione P3.5 "Classificare le risposte e chiudere il ciclo" (logica pura, entrambe le lingue).
import { smista, verifica, posizioni, voti, destinazioni } from "../../webapp/animazioni/leggere_risposte.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("leggere_risposte.json"), lingua);
  const sc = L.scenario;
  const base = { vista: "smista", soglia: 3, priorita: true, modalita: "attiva", scelte: {}, verificato: false, carta_aperta: "r01" };
  const st = (diff) => ({ ...base, ...diff });
  const dest = (c, id) => c.righe.find((x) => x.id === id).dest;
  const gioco = sc.risposte.filter((r) => r.gioco);

  prova(`[${lingua}] leggere_risposte: dati coerenti, ogni segmento valido, riassunto in 3 frasi`, () => {
    const ids = sc.categorie.map((c) => c.id);
    for (const r of sc.risposte) {
      assert.equal(r.tentativi.length, sc.tentativi_totali, r.id);
      assert.ok(ids.includes(r.giusta), r.id);
      assert.ok(!voti(sc, r).pari, `${r.id}: pareggio fra tentativi`);
    }
    assert.equal(gioco.length, 4);
    for (const seg of L.segmenti) {
      const c = smista(sc, seg.stato_animazione);
      assert.equal(c.righe.length, sc.risposte.length);
      for (const x of c.righe) assert.ok(destinazioni(sc).includes(x.dest));
      assert.ok(sc.risposte.some((r) => r.id === seg.stato_animazione.carta_aperta));
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });

  prova(`[${lingua}] leggere_risposte: soglia piu' alta = piu' lavoro umano e meno errori`, () => {
    const c3 = smista(sc, st({ soglia: 3 })), c4 = smista(sc, st({ soglia: 4 })), c5 = smista(sc, st({ soglia: 5 }));
    assert.ok(c3.umano < c4.umano && c4.umano < c5.umano);
    assert.ok(c3.errori > c4.errori && c4.errori > c5.errori);
    assert.equal(c5.errori, 0);
    assert.ok(c3.ore < c5.ore);
  });

  prova(`[${lingua}] leggere_risposte: la regola di priorita' salva la disiscrizione con doppio segnale`, () => {
    assert.equal(dest(smista(sc, st({ priorita: false })), "r06"), "ricontattare");
    assert.equal(smista(sc, st({ priorita: false })).gravi, 1);
    const con = smista(sc, st({ priorita: true }));
    assert.equal(dest(con, "r06"), "disiscrizione");
    assert.equal(con.righe.find((x) => x.id === "r06").motivo, "regola");
    assert.equal(con.gravi, 0);
    for (const so of [3, 4, 5]) assert.equal(dest(smista(sc, st({ soglia: so })), "r06"), "disiscrizione", "la regola vince a ogni soglia");
  });

  prova(`[${lingua}] leggere_risposte: casi ambigui (gentile ma negativa, ironica)`, () => {
    assert.equal(dest(smista(sc, st({ soglia: 3 })), "r04"), "interessato", "la cortesia inganna il modello");
    assert.equal(dest(smista(sc, st({ soglia: 4 })), "r04"), "umano");
    for (const so of [3, 4, 5]) assert.equal(dest(smista(sc, st({ soglia: so })), "r08"), "umano", "l'ironica va sempre a una persona");
    assert.ok(voti(sc, sc.risposte.find((r) => r.id === "r08")).diverse >= 3);
  });

  prova(`[${lingua}] leggere_risposte: in ombra nessun errore arriva ai clienti, ma la persona legge tutto`, () => {
    const att = smista(sc, st({ modalita: "attiva" })), omb = smista(sc, st({ modalita: "ombra" }));
    assert.ok(att.arrivati > 0);
    assert.equal(omb.arrivati, 0);
    assert.equal(omb.scoperti, att.errori);
    assert.equal(omb.umano, omb.tot);
    assert.deepEqual(omb.per_dest, att.per_dest, "la classificazione non cambia, cambiano solo le azioni");
  });

  prova(`[${lingua}] leggere_risposte: gioco "Decidi tu" con riscontro spiegato`, () => {
    const vuoto = verifica(sc, st({ vista: "decidi" }));
    assert.ok(vuoto.righe.every((x) => x.esito === "vuoto"));
    const migliori = Object.fromEntries(gioco.map((r) => [r.id, r.gioco.migliore]));
    const perfetto = verifica(sc, st({ vista: "decidi", scelte: migliori }));
    assert.equal(perfetto.giuste, perfetto.totali);
    assert.equal(migliori.r08, "umano", "passare a una persona e' la scelta migliore per l'ironica");
    const misto = verifica(sc, st({ vista: "decidi", scelte: { ...migliori, r06: "umano", r04: "interessato" } }));
    assert.equal(misto.righe.find((x) => x.id === "r06").esito, "quasi");
    assert.equal(misto.righe.find((x) => x.id === "r04").esito, "sbagliato");
    for (const x of [...vuoto.righe, ...misto.righe]) assert.ok(!/\{\w+\}/.test(x.testo), x.testo);
    assert.ok(!/\{\w+\}/.test(misto.sintesi));
  });

  prova(`[${lingua}] leggere_risposte: posizioni nella scena dentro il riquadro, deterministiche`, () => {
    for (const s of [st({}), st({ soglia: 5, priorita: false }), st({ vista: "decidi", scelte: { r04: "umano" } })]) {
      const pos = posizioni(sc, s);
      for (const p of Object.values(pos)) assert.ok(p.x >= 0 && p.x + 104 <= 720 && p.y >= 0 && p.y + 44 <= 412, JSON.stringify(p));
      assert.deepEqual(pos, posizioni(sc, s));
    }
    assert.equal(Object.keys(posizioni(sc, st({ vista: "decidi" }))).length, 4);
  });
}
