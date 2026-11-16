// Prove della lezione P2.3 "Ragionare e pianificare" (logica pura del modulo react_piano.js).
import { pianifica, pianificaReact, pianificaPiano, valutaMossa } from "../../webapp/animazioni/react_piano.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("react_piano.json"), lingua);
  const sc = L.scenario;
  const base = { modalita: "react", imprevisto: "nessuno", guasto_passo3: false, indovina: false, dato_sbagliato: false };
  const R = (diff) => pianificaReact(sc, { ...base, ...diff });
  const Pn = (diff) => pianificaPiano(sc, { ...base, modalita: "piano", ...diff });

  prova(`[${lingua}] react_piano: ogni segmento produce un lavoro completo`, () => {
    for (const seg of L.segmenti) {
      const p = pianifica(sc, seg.stato_animazione);
      assert.ok(p.eventi.length > 0 && p.esito.testo && p.contatori.passi > 0);
      for (const ev of p.eventi) {
        for (const t of [ev.testo, ev.citaTesto, ev.nota]) if (t) assert.ok(!/\{\w+\}/.test(t), `segnaposto non risolto: ${t}`);
      }
    }
  });
  prova(`[${lingua}] react_piano: in ReAct si alternano pensiero, azione, osservazione e ogni pensiero cita l'ultima osservazione`, () => {
    const p = R({});
    const tipi = p.eventi.map((c) => c.tipo);
    assert.equal(tipi[0], "pensiero");
    assert.equal(tipi[tipi.length - 1], "fine");
    p.eventi.forEach((c, i) => {
      if (c.tipo === "azione") assert.equal(p.eventi[i + 1].tipo, "osservazione");
      if ((c.tipo === "pensiero" || c.tipo === "fine") && i > 0) {
        assert.equal(p.eventi[c.cita].tipo, "osservazione");
        assert.equal(c.cita, i - 1, "cita proprio l'osservazione appena fatta");
      }
    });
    assert.deepEqual(p.contatori, { passi: 5, approvazioni: 1 });
  });
  prova(`[${lingua}] react_piano: gli imprevisti aggiungono un passo di adattamento, il dato fuorviante accende l'allarme`, () => {
    const zero = R({ imprevisto: "zero_lead" });
    assert.ok(zero.eventi.some((c) => c.mossa === "cerca_punteggio"));
    assert.equal(zero.contatori.passi, 6);
    const email = R({ imprevisto: "email_mancante" });
    assert.ok(email.eventi.some((c) => c.mossa === "chiedi"));
    assert.equal(email.contatori.approvazioni, 2);
    const sbagliato = R({ dato_sbagliato: true });
    assert.equal(sbagliato.eventi.filter((c) => c.allarme).length, 1);
    assert.equal(sbagliato.esito.tipo, "avviso");
  });
  prova(`[${lingua}] react_piano: il piano si riscrive dove fallisce e ha più punti di approvazione`, () => {
    const liscio = Pn({});
    assert.deepEqual(liscio.contatori, { passi: 5, approvazioni: 2 });
    assert.equal(liscio.ripiani, 0);
    const guasto = Pn({ guasto_passo3: true });
    assert.equal(guasto.ripiani, 1);
    const rip = guasto.eventi.find((e) => e.tipo === "ripiano");
    assert.equal(rip.voci[2].stato, "tolto");
    assert.ok(rip.voci[3].nuovo && rip.voci[3].id === "q3a");
    assert.deepEqual(guasto.contatori, { passi: 6, approvazioni: 3 });
    assert.ok(Pn({ imprevisto: "email_mancante" }).eventi.find((e) => e.tipo === "ripiano").voci.some((v) => v.id === "q5b" && v.nuovo));
    assert.ok(guasto.contatori.approvazioni > R({}).contatori.approvazioni, "il piano offre più punti di controllo");
  });
  prova(`[${lingua}] react_piano: indovinare la mossa dà riscontro; deterministico; stati non previsti rifiutati`, () => {
    for (const [id, m] of Object.entries(sc.mosse)) {
      assert.equal(m.scelte.length, 3);
      assert.equal(m.scelte.filter((x) => x.giusta).length, 1, `una sola mossa giusta per ${id}`);
      for (const x of m.scelte) {
        const r = valutaMossa(sc, id, x.id);
        assert.equal(r.giusta, x.giusta);
        assert.ok(r.testo.includes(x.perche));
      }
    }
    assert.deepEqual(R({ imprevisto: "zero_lead" }), R({ imprevisto: "zero_lead" }));
    assert.throws(() => R({ modalita: "boh" }));
    assert.throws(() => Pn({ imprevisto: "boh" }));
  });
}
