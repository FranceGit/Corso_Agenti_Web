// Prove della lezione P1.2 "Come funziona un LLM" (logica pura del modulo parola_successiva.js).
import { probabilita, genera, tokenizza, tokenFrase, finestraContesto, conoscenza } from "../../webapp/animazioni/parola_successiva.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("parola_successiva.json"), lingua);
  const sc = L.scenario;
  const base = L.segmenti[0].stato_animazione;
  const st = (diff) => ({ ...base, ...diff, nel_contesto: [...(diff.nel_contesto || base.nel_contesto)] });

  prova(`[${lingua}] parola_successiva: ogni segmento produce scene complete`, () => {
    for (const seg of L.segmenti) {
      const s = st(seg.stato_animazione);
      assert.ok(tokenFrase(sc, s.frase).length > 0);
      const g = genera(sc, { ...s, lancio: 1 });
      assert.equal(g.parole.length, sc.generazioni);
      assert.ok(finestraContesto(sc, s).risposta.testo);
      assert.ok(conoscenza(sc, s).risposta.testo);
    }
    for (const f of sc.frasi) assert.equal(f.candidati.length, 6);
  });
  prova(`[${lingua}] parola_successiva: la temperatura rimodella le probabilità`, () => {
    for (const f of sc.frasi) {
      const zero = probabilita(sc, f.id, 0).map((x) => x.p);
      assert.equal(zero[0], 1, "a temperatura 0 vince sempre il primo");
      const bassa = probabilita(sc, f.id, 0.5).map((x) => x.p);
      const alta = probabilita(sc, f.id, 2).map((x) => x.p);
      assert.ok(Math.abs(alta.reduce((a, b) => a + b, 0) - 1) < 1e-9);
      assert.ok(Math.max(...alta) < Math.max(...bassa), "ad alta temperatura le barre si livellano");
    }
  });
  prova(`[${lingua}] parola_successiva: a temperatura 0 cinque risposte uguali, a 2 più varietà`, () => {
    for (const f of sc.frasi) {
      assert.equal(genera(sc, st({ frase: f.id, temperatura: 0, lancio: 3 })).diverse, 1);
      const varie = Math.max(...[1, 2, 3, 4, 5].map((k) => genera(sc, st({ frase: f.id, temperatura: 2, lancio: k })).diverse));
      assert.ok(varie >= 3, `a temperatura 2 servono almeno 3 finali diversi (trovati ${varie})`);
    }
  });
  prova(`[${lingua}] parola_successiva: generazioni deterministiche (stesso seme, stessi finali)`, () => {
    const s = st({ temperatura: 1.3, lancio: 7 });
    assert.deepEqual(genera(sc, s).scelte, genera(sc, s).scelte);
    assert.deepEqual(tokenizza("Il lead ha aperto", 5), tokenizza("Il lead ha aperto", 5));
  });
  prova(`[${lingua}] parola_successiva: la finestra stretta fa uscire lo sconto e la risposta sbaglia`, () => {
    const F = sc.finestra;
    const larga = finestraContesto(sc, st({ finestra: F.max }));
    assert.ok(F.max >= larga.totale, "alla finestra massima l'email intera ci sta");
    assert.equal(larga.stato, "dentro");
    assert.equal(larga.risposta.tipo, "ok");
    const stretta = finestraContesto(sc, st({ finestra: F.min }));
    assert.equal(stretta.stato, "fuori");
    assert.equal(stretta.risposta.tipo, "male");
    assert.throws(() => finestraContesto(sc, st({ finestra: F.max + 100 })));
  });
  prova(`[${lingua}] parola_successiva: i fatti di oggi nel contesto aggiornano la risposta`, () => {
    assert.equal(conoscenza(sc, st({ nel_contesto: [] })).risposta.tipo, "male");
    const tutti = sc.cutoff.fatti.map((f) => f.id);
    assert.equal(conoscenza(sc, st({ nel_contesto: tutti })).risposta.tipo, "ok");
    assert.equal(conoscenza(sc, st({ nel_contesto: [...tutti].reverse() })).risposta.testo, conoscenza(sc, st({ nel_contesto: tutti })).risposta.testo);
    for (const f of tutti) assert.equal(conoscenza(sc, st({ nel_contesto: [f] })).risposta.tipo, "avviso");
    assert.throws(() => conoscenza(sc, st({ nel_contesto: ["boh"] })));
  });
}
