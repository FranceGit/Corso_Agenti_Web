// Prove della lezione P2.2 "Output strutturati" (logica pura del modulo cancello_validazione.js).
import { simula, valida, datiAgente } from "../../webapp/animazioni/cancello_validazione.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("cancello_validazione.json"), lingua);
  const sc = L.scenario;
  const base = { formato: true, guasto: "nessuno", ritenta: true, tentativi_max: 2, json_grezzo: false };
  const sim = (diff) => simula(sc, { ...base, ...diff });

  prova(`[${lingua}] cancello_validazione: ogni segmento produce un viaggio completo`, () => {
    for (const seg of L.segmenti) {
      const r = simula(sc, seg.stato_animazione);
      assert.ok(r.eventi.length > 0 && r.esito.testo);
      for (const ev of r.eventi) assert.ok(!/\{\w+\}/.test(ev.testo), `segnaposto non risolto: ${ev.testo}`);
    }
  });
  prova(`[${lingua}] cancello_validazione: senza formato la frase non passa mai, con il formato la scheda si compila`, () => {
    const frase = sim({ formato: false, tentativi_max: 3 });
    assert.equal(frase.compilato, null);
    assert.equal(frase.eventi.filter((e) => e.tipo === "cancello" && !e.ok).length, 3);
    assert.ok(frase.eventi.some((e) => e.tipo === "persona"));
    const ok = sim({});
    assert.equal(ok.esito.tipo, "ok");
    assert.equal(ok.tentativi, 1);
    assert.deepEqual(Object.keys(ok.compilato), sc.schema.map((c) => c.id));
  });
  prova(`[${lingua}] cancello_validazione: ogni guasto viene fermato sul campo giusto`, () => {
    const attesi = { fascia: "fascia", mancante: "motivazione", testo: "punteggio", fuori_scala: "punteggio" };
    for (const [g, campo] of Object.entries(attesi)) {
      const errori = valida(sc, datiAgente(sc, { ...base, guasto: g }, 1));
      assert.equal(errori.length, 1, `guasto ${g}`);
      assert.equal(errori[0].campo, campo);
      assert.ok(!/\{\w+\}/.test(errori[0].testo));
    }
    assert.deepEqual(valida(sc, datiAgente(sc, base, 1)), []);
  });
  prova(`[${lingua}] cancello_validazione: con il nuovo tentativo l'agente corregge, senza passa a una persona`, () => {
    const ritenta = sim({ guasto: "fascia" });
    assert.equal(ritenta.esito.tipo, "ok");
    assert.equal(ritenta.tentativi, 2);
    assert.ok(ritenta.eventi.some((e) => e.tipo === "ritorno"));
    const persona = sim({ guasto: "mancante", ritenta: false });
    assert.equal(persona.compilato, null);
    assert.equal(persona.esito.tipo, "avviso");
    assert.ok(!persona.eventi.some((e) => e.tipo === "compila"));
  });
  prova(`[${lingua}] cancello_validazione: deterministico e stati non previsti rifiutati`, () => {
    assert.deepEqual(sim({ guasto: "testo" }), sim({ guasto: "testo" }));
    assert.throws(() => sim({ guasto: "boh" }));
    assert.throws(() => sim({ tentativi_max: 0 }));
    assert.equal(sim({ json_grezzo: true }).esito.testo, sim({}).esito.testo, "la vista JSON non cambia il risultato");
  });
}
