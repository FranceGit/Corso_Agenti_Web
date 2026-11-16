// Prove della lezione P4.3 "MCP: un connettore standard" (logica pura, entrambe le lingue).
import { conteggio, costoAggiunta, cavi, ordinate, verificaRuolo, catalogo } from "../../webapp/animazioni/presa_standard.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("presa_standard.json"), lingua);
  const sc = L.scenario;
  const base = L.segmenti[0].stato_animazione;
  const st = (diff) => ({ ...base, ...diff });

  prova(`[${lingua}] presa_standard: ogni segmento valido, riassunto in 3 frasi`, () => {
    for (const seg of L.segmenti) {
      const s = seg.stato_animazione;
      assert.equal(cavi(sc, s).length, s.standard ? s.app + s.sistemi : s.app * s.sistemi);
      assert.ok(catalogo(sc, s).cassetti.length === 3);
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });

  prova(`[${lingua}] presa_standard: 3 app x 4 sistemi = 12 integrazioni; con lo standard 7 componenti`, () => {
    assert.equal(sc.app_base, 3);
    assert.equal(sc.sistemi_base, 4);
    assert.equal(conteggio(3, 4, false).pezzi, 12);
    assert.deepEqual(conteggio(3, 4, true), { pezzi: 7, client: 3, server: 4 });
  });

  prova(`[${lingua}] presa_standard: aggiungere un sistema costa 1 server con lo standard, N cavi senza`, () => {
    assert.equal(costoAggiunta(3, 4, false, "sistema"), 3);
    assert.equal(costoAggiunta(3, 4, false, "app"), 4);
    assert.equal(costoAggiunta(3, 4, true, "sistema"), 1);
    assert.equal(conteggio(3, 5, true).pezzi - conteggio(3, 4, true).pezzi, 1);
    assert.equal(conteggio(3, 5, false).pezzi - conteggio(3, 4, false).pezzi, 3);
    const max = st({ app: sc.app.length, sistemi: sc.sistemi.length });
    assert.equal(cavi(sc, max).length, sc.app.length * sc.sistemi.length);
    assert.equal(cavi(sc, { ...max, standard: true }).length, sc.app.length + sc.sistemi.length);
  });

  prova(`[${lingua}] presa_standard: i nodi restano nel riquadro, disegno deterministico`, () => {
    for (let k = 1; k <= 6; k++) for (const y of ordinate(k)) assert.ok(y >= 80 && y + 40 <= 400, `${k}: ${y}`);
    assert.deepEqual(cavi(sc, st({})), cavi(sc, st({})));
  });

  prova(`[${lingua}] presa_standard: il gioco dei ruoli, l'host applica le regole di sicurezza`, () => {
    assert.equal(verificaRuolo(sc, st({ risposta_ruolo: null })), null);
    assert.equal(sc.gioco_ruolo.giusta, "host");
    assert.ok(verificaRuolo(sc, st({ risposta_ruolo: "host" })).giusto);
    for (const r of ["client", "server"]) {
      const v = verificaRuolo(sc, st({ risposta_ruolo: r }));
      assert.ok(!v.giusto && !/\{\w+\}/.test(v.testo));
    }
    for (const r of ["host", "client", "server"]) assert.ok(sc.ruoli[r]);
  });

  prova(`[${lingua}] presa_standard: sei passi di collegamento, la scoperta annuncia gli strumenti`, () => {
    assert.equal(sc.passi.length, 6);
    const scoperta = sc.passi[2].testo;
    for (const t of sc.strumenti_annunciati) assert.ok(scoperta.includes(t), t);
  });

  prova(`[${lingua}] presa_standard: oggi MCP = strumenti; con server non fidato nessuna etichetta e' garantita`, () => {
    const c = catalogo(sc, st({}));
    const [str, ris, pro] = c.cassetti;
    assert.equal(str.diffusione, 99);
    assert.ok(str.diffusione > ris.diffusione && str.diffusione > pro.diffusione);
    for (const x of sc.sistemi.filter((y) => y.catalogo)) {
      const cat = catalogo(sc, st({ server_aperto: x.id, non_fidato: true }));
      assert.ok(cat.cassetti[0].voci.length >= 1);
      assert.ok(cat.cassetti.every((k) => k.voci.every((v) => !v.garantita)));
      assert.ok(catalogo(sc, st({ server_aperto: x.id })).cassetti[0].voci.some((v) => v.etichetta && v.garantita));
    }
    assert.throws(() => catalogo(sc, st({ server_aperto: "nessuno" })));
  });
}
