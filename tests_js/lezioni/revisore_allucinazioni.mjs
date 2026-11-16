// Prove della lezione P2.4 "Allucinazioni e grounding" (logica pura del modulo revisore_allucinazioni.js).
import { arricchisci, correggi } from "../../webapp/animazioni/revisore_allucinazioni.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("revisore_allucinazioni.json"), lingua);
  const sc = L.scenario;
  const base = { fonti: 3, non_so: true, citazioni: true, agente: "onesto", revisore: false };
  const A = (diff) => arricchisci(sc, { ...base, ...diff });
  const origini = (r) => Object.fromEntries(r.campi.map((c) => [c.id, c.origine]));

  prova(`[${lingua}] revisore_allucinazioni: ogni segmento produce una scheda completa`, () => {
    for (const seg of L.segmenti) {
      const r = arricchisci(sc, seg.stato_animazione);
      assert.equal(r.campi.length, sc.campi.length);
      for (const c of r.campi) {
        assert.ok(c.valore && c.segnale, `campo ${c.id} incompleto`);
        assert.ok(!/\{\w+\}/.test(c.segnale + r.riepilogo), `segnaposto non risolto in ${c.id}`);
      }
    }
  });
  prova(`[${lingua}] revisore_allucinazioni: più fonti, più campi verificati; senza fonti e senza «non lo so» si inventa`, () => {
    const verificati = [0, 1, 2, 3].map((f) => A({ fonti: f }).conteggi.verificato);
    for (let i = 1; i < verificati.length; i++) assert.ok(verificati[i] > verificati[i - 1], `fonti ${i}: ${verificati}`);
    assert.equal(verificati[0], 0);
    const zero = A({ fonti: 0, non_so: false });
    assert.ok(zero.conteggi.inventato >= 3);
    const zeroNonSo = A({ fonti: 0, non_so: true });
    assert.equal(zeroNonSo.conteggi.inventato, 0, "con «non lo so» l'agente onesto non inventa");
    assert.equal(zeroNonSo.conteggi.sconosciuto, zero.conteggi.inventato);
  });
  prova(`[${lingua}] revisore_allucinazioni: le citazioni indicano il documento vero; l'agente che inventa cita una fonte falsa`, () => {
    const con = A({ fonti: 2 });
    for (const c of con.campi.filter((x) => x.origine === "verificato")) assert.ok(sc.documenti.some((d) => d.nome === c.citazione));
    assert.ok(A({ fonti: 2, citazioni: false }).campi.every((c) => c.citazione === null));
    const inv = A({ fonti: 1, agente: "inventa" });
    assert.ok(inv.conteggi.inventato > A({ fonti: 1 }).conteggi.inventato, "l'agente che inventa ignora «non lo so»");
    assert.ok(inv.campi.some((c) => c.falsa && c.citazione === sc.fonte_falsa));
    const ipo = inv.campi.find((c) => c.id === "fatturato");
    assert.equal(ipo.origine, "ipotesi");
    assert.equal(ipo.valore, sc.campi.find((c) => c.id === "fatturato").ipotesi_fatto, "l'ipotesi è presentata come un fatto");
  });
  prova(`[${lingua}] revisore_allucinazioni: la revisione premia le etichette giuste e spiega il segnale`, () => {
    const s = { ...base, fonti: 1, agente: "inventa", revisore: true };
    const vere = Object.fromEntries(arricchisci(sc, s).campi.filter((c) => c.origine !== "sconosciuto").map((c) => [c.id, c.origine]));
    const tutto = correggi(sc, s, vere);
    assert.equal(tutto.giusti, tutto.totale);
    assert.equal(tutto.esito.tipo, "ok");
    const tuttoVerificato = Object.fromEntries(Object.keys(vere).map((k) => [k, "verificato"]));
    const male = correggi(sc, s, tuttoVerificato);
    assert.ok(male.giusti < male.totale && male.esito.tipo !== "ok");
    for (const r of male.risultati.filter((x) => !x.giusto)) assert.ok(r.testo.includes(r.segnale));
    assert.throws(() => correggi(sc, s, {}), "servono tutte le etichette");
  });
  prova(`[${lingua}] revisore_allucinazioni: deterministico e stati non previsti rifiutati`, () => {
    assert.deepEqual(A({ fonti: 1, agente: "inventa" }), A({ fonti: 1, agente: "inventa" }));
    assert.deepEqual(origini(A({ revisore: true })), origini(A({})), "la modalità revisore non cambia i dati");
    assert.throws(() => A({ agente: "boh" }));
    assert.throws(() => A({ fonti: 7 }));
  });
}
