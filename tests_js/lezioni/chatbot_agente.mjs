// Prove della lezione P1.1 "Dal chatbot all'agente" (logica pura del modulo chatbot_agente.js).
import { confronta, valutaScelta, riepilogoScelte } from "../../webapp/animazioni/chatbot_agente.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("chatbot_agente.json"), lingua);
  const sc = L.scenario;
  const p = (diff) => confronta(sc, { richiesta: "followup", mostra_passi: true, strumenti: true, ...diff });
  const senzaSegnaposto = (t) => assert.ok(!/\{\w+\}/.test(t), `segnaposto non risolto: ${t}`);

  prova(`[${lingua}] chatbot_agente: ogni segmento e ogni richiesta producono un confronto completo`, () => {
    for (const seg of L.segmenti) {
      const r = confronta(sc, seg.stato_animazione);
      assert.ok(r.chatbot.testo && r.eventi.length > 0 && r.esito.testo);
    }
    for (const r of sc.richieste) for (const strumenti of [true, false]) {
      const c = p({ richiesta: r.id, strumenti });
      for (const ev of c.eventi) senzaSegnaposto(ev.testo);
      senzaSegnaposto(c.esito.testo);
    }
  });
  prova(`[${lingua}] chatbot_agente: richieste di solo testo = 1 passo in entrambe le corsie, nessuno strumento`, () => {
    for (const r of sc.richieste.filter((x) => x.tipo === "testo")) {
      const c = p({ richiesta: r.id });
      assert.equal(c.passi, 1);
      assert.equal(c.chatbot.passi, 1);
      assert.ok(!c.eventi.some((e) => e.tipo === "chiamata"));
      assert.equal(c.proposte.length, 0);
    }
  });
  prova(`[${lingua}] chatbot_agente: richieste di azione = N passi con strumenti e proposte da approvare`, () => {
    for (const r of sc.richieste.filter((x) => x.tipo === "azione")) {
      const c = p({ richiesta: r.id });
      assert.ok(c.passi > 1, "l'agente fa più di un passo");
      assert.ok(c.eventi.some((e) => e.tipo === "chiamata"));
      assert.ok(c.proposte.length > 0 && c.proposte.some((x) => x.giusta === "scarta"), "c'è almeno un tranello da scartare");
      assert.equal(c.esito.tipo, "ok");
    }
  });
  prova(`[${lingua}] chatbot_agente: senza strumenti l'agente torna a scrivere solo testo`, () => {
    const c = p({ strumenti: false });
    assert.equal(c.passi, 1);
    assert.ok(!c.eventi.some((e) => e.tipo === "chiamata"));
    assert.equal(c.esito.tipo, "avviso");
  });
  prova(`[${lingua}] chatbot_agente: approva/scarta dà il riscontro giusto e il riepilogo conta le scelte`, () => {
    const c = p({});
    const trappola = c.proposte.findIndex((x) => x.giusta === "scarta");
    assert.equal(valutaScelta(c.proposte[trappola], "approva").giusta, false);
    assert.equal(valutaScelta(c.proposte[trappola], "scarta").giusta, true);
    assert.throws(() => valutaScelta(c.proposte[0], "forse"));
    const tutte = Object.fromEntries(c.proposte.map((x, i) => [i, x.giusta]));
    const r = riepilogoScelte(sc, c.proposte, tutte);
    assert.ok(r.completo && r.tutte);
    senzaSegnaposto(r.testo);
    assert.equal(riepilogoScelte(sc, c.proposte, { 0: "approva" }).completo, false);
  });
  prova(`[${lingua}] chatbot_agente: deterministico`, () => {
    assert.deepEqual(p({}), p({}));
    assert.throws(() => p({ richiesta: "boh" }));
  });
}
