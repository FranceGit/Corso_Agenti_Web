// Prove della lezione P4.2 "Progettare buoni strumenti" (logica pura, entrambe le lingue).
import { punteggio, traccia, esitoErrore, emailInviate, verificaCassetti, aCapo } from "../../webapp/animazioni/strumento_chiaro.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("strumento_chiaro.json"), lingua);
  const sc = L.scenario;
  const base = L.segmenti[0].stato_animazione;
  const st = (diff) => ({ ...base, ...diff });
  const buono = st({ nome: "chiaro", descrizione: "chiara", parametri: "tipizzati", granularita: "compito" });
  const senzaSegnaposto = (t) => assert.ok(!/\{\w+\}/.test(t), t);

  prova(`[${lingua}] strumento_chiaro: ogni segmento valido, riassunto in 3 frasi`, () => {
    for (const seg of L.segmenti) {
      const p = punteggio(sc, seg.stato_animazione);
      assert.ok(p.corrette >= 0 && p.corrette <= p.totale);
      for (const x of traccia(sc, seg.stato_animazione)) senzaSegnaposto(x.testo);
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });

  prova(`[${lingua}] strumento_chiaro: la scheda chiara batte quella confusa, ogni miglioria conta`, () => {
    const confusa = punteggio(sc, st({})).corrette;
    assert.equal(punteggio(sc, buono).corrette, sc.compiti_totali);
    assert.ok(confusa < punteggio(sc, st({ nome: "chiaro" })).corrette);
    assert.ok(punteggio(sc, st({ nome: "chiaro" })).corrette < punteggio(sc, st({ nome: "chiaro", descrizione: "chiara" })).corrette);
    assert.ok(confusa <= sc.compiti_totali / 2);
  });

  prova(`[${lingua}] strumento_chiaro: compiti, non chiamate API, ma niente multi-strumento`, () => {
    const c = punteggio(sc, buono).corrette;
    assert.ok(punteggio(sc, { ...buono, granularita: "api" }).corrette < c);
    assert.ok(punteggio(sc, { ...buono, granularita: "multi" }).corrette < c);
    assert.equal(traccia(sc, { ...buono, granularita: "multi" }).find((x) => x.tipo === "avviso").testo, sc.testi.tr_multi);
  });

  prova(`[${lingua}] strumento_chiaro: conta la somiglianza, non il numero (15+ distinti ok, sovrapposti no)`, () => {
    assert.equal(punteggio(sc, { ...buono, strumenti: 20 }).corrette, punteggio(sc, { ...buono, strumenti: 5 }).corrette);
    const sovr8 = punteggio(sc, { ...buono, strumenti: 8, sovrapposti: true });
    assert.ok(sovr8.ciclo && sovr8.corrette < punteggio(sc, { ...buono, strumenti: 20 }).corrette);
    assert.ok(punteggio(sc, { ...buono, strumenti: 20, sovrapposti: true }).corrette < sovr8.corrette);
    assert.ok(traccia(sc, { ...buono, sovrapposti: true }).some((x) => x.tipo === "male"));
  });

  prova(`[${lingua}] strumento_chiaro: solo l'errore con istruzione porta l'agente a rimediare`, () => {
    assert.equal(esitoErrore(sc, { errore: "istruzione" }).esito, "ok");
    assert.equal(esitoErrore(sc, { errore: "e500" }).esito, "male");
    assert.equal(esitoErrore(sc, { errore: "sempre_ok" }).esito, "male");
    assert.equal(esitoErrore(sc, { errore: "nessun_dato" }).esito, "avviso");
    assert.throws(() => esitoErrore(sc, { errore: "boh" }));
  });

  prova(`[${lingua}] strumento_chiaro: idempotenza = una sola email anche con due clic`, () => {
    assert.equal(emailInviate({ clic: 2, idempotenza: false }), 2);
    assert.equal(emailInviate({ clic: 2, idempotenza: true }), 1);
    assert.equal(emailInviate({ clic: 0, idempotenza: true }), 0);
  });

  prova(`[${lingua}] strumento_chiaro: cassetti con riscontro spiegato`, () => {
    const vuoto = verificaCassetti(sc, st({ vista: "azioni" }));
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    const giusti = Object.fromEntries(sc.utensili.map((u) => [u.id, u.giusto]));
    const tutto = verificaCassetti(sc, st({ scelte: giusti }));
    assert.equal(tutto.giuste, tutto.totali);
    assert.equal(giusti.passa_ticket_a_umano, "azione");
    assert.equal(giusti.agente_ricerca, "orchestrazione");
    const misto = verificaCassetti(sc, st({ scelte: { ...giusti, invia_email: "lettura" } }));
    assert.equal(misto.righe.find((r) => r.id === "invia_email").esito, "sbagliato");
    for (const r of [...vuoto.righe, ...misto.righe]) senzaSegnaposto(r.testo);
    senzaSegnaposto(misto.sintesi);
  });

  prova(`[${lingua}] strumento_chiaro: testi della scena entro la larghezza, deterministico`, () => {
    for (const d of Object.values(sc.descrizioni)) assert.ok(aCapo(d, 52).length <= 4, d);
    for (const e of sc.errori) { assert.ok(aCapo(e.messaggio, 92).length <= 4); assert.ok(aCapo(e.reazione, 96).length <= 3, e.reazione); }
    assert.deepEqual(punteggio(sc, buono), punteggio(sc, buono));
  });
}
