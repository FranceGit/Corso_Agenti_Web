// Prove della lezione P6.2 "Quattro mini-mappe e un bivio" (logica pura, entrambe le lingue).
import { simula, giriCiclo, verifica, punto } from "../../webapp/animazioni/schemi_orchestrazione.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("schemi_orchestrazione.json"), lingua);
  const sc = L.scenario;
  const base = { vista: "esplora", schema_attivo: "sequenziale", max_giri: 3, segnale_uscita: true, modo_coordinatore: "manager", pausa_umana: false, dipendenza: false, assegnazioni: {}, verificato: false };
  const st = (d) => ({ ...base, ...d });
  const ids = sc.schemi.map((x) => x.id);

  prova(`[${lingua}] schemi_orchestrazione: dati coerenti, segmenti validi, riassunto in 3 frasi`, () => {
    assert.deepEqual(ids, ["sequenziale", "parallelo", "ciclo", "coordinatore"]);
    for (const p of sc.processi) assert.ok(ids.includes(p.giusto));
    for (const seg of L.segmenti) for (const id of ids) {
      const r = simula(sc, seg.stato_animazione, id);
      assert.ok(r.tempo > 0 && r.chiamate > 0 && r.fotogrammi.length >= 3);
      assert.ok(!/\{\w+\}/.test(r.esito), r.esito);
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });

  prova(`[${lingua}] schemi_orchestrazione: il parallelo e' piu' veloce, ma senza stato condiviso`, () => {
    const seq = simula(sc, st({}), "sequenziale"), par = simula(sc, st({}), "parallelo");
    assert.ok(par.tempo < seq.tempo);
    assert.equal(par.fotogrammi[1].length, 3, "le tre fonti partono insieme");
    const dip = simula(sc, st({ dipendenza: true }), "parallelo");
    assert.equal(dip.tipo, "errore");
    assert.notEqual(dip.esito, par.esito);
  });

  prova(`[${lingua}] schemi_orchestrazione: ciclo con segnale di uscita e limite di giri`, () => {
    const ok = giriCiclo(sc, st({ max_giri: 5 }));
    assert.equal(ok.fine, "ok");
    assert.equal(ok.giri, sc.parametri.giro_approvato);
    const senza = giriCiclo(sc, st({ max_giri: 5, segnale_uscita: false }));
    assert.equal(senza.fine, "senza_uscita");
    assert.equal(senza.giri, 5);
    assert.ok(simula(sc, st({ max_giri: 5, segnale_uscita: false }), "ciclo").chiamate > simula(sc, st({ max_giri: 5 }), "ciclo").chiamate, "senza uscita: chiamate sprecate");
    assert.equal(giriCiclo(sc, st({ max_giri: 1 })).fine, "limite");
    assert.equal(simula(sc, st({ max_giri: 1 }), "ciclo").tipo, "avviso");
  });

  prova(`[${lingua}] schemi_orchestrazione: manager contro passaggio di consegne`, () => {
    const man = simula(sc, st({}), "coordinatore"), hand = simula(sc, st({ modo_coordinatore: "handoff" }), "coordinatore");
    const nome = (id) => sc.schemi[3].nodi.find((n) => n.id === id).nome;
    assert.equal(man.parla, nome("triage"));
    assert.equal(hand.parla, nome("ordini"));
    assert.equal(man.fotogrammi.at(-2)[0], "triage", "col manager la risposta torna al Triage");
    assert.equal(hand.fotogrammi.at(-2)[0], "ordini", "con il passaggio di consegne risponde Ordini");
    assert.ok(hand.chiamate < man.chiamate);
  });

  prova(`[${lingua}] schemi_orchestrazione: la pausa umana si inserisce prima dell'ultima mossa in ogni schema`, () => {
    for (const id of ids) {
      const senza = simula(sc, st({}), id), con = simula(sc, st({ pausa_umana: true }), id);
      assert.equal(con.fotogrammi.length, senza.fotogrammi.length + 1);
      assert.equal(con.fotogrammi.at(-2)[0], "__umano");
      assert.equal(con.tempo, senza.tempo);
    }
  });

  prova(`[${lingua}] schemi_orchestrazione: gioco "Decidi tu" con riscontro spiegato`, () => {
    const vuoto = verifica(sc, st({ vista: "assegna" }));
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    const giuste = Object.fromEntries(sc.processi.map((p) => [p.id, p.giusto]));
    assert.equal(verifica(sc, st({ assegnazioni: giuste })).giuste, 4);
    const misto = verifica(sc, st({ assegnazioni: { ...giuste, q2: "sequenziale", q4: "parallelo" } }));
    assert.equal(misto.righe.find((r) => r.id === "q2").esito, "quasi");
    assert.equal(misto.righe.find((r) => r.id === "q4").esito, "sbagliato");
    for (const r of [...vuoto.righe, ...misto.righe]) assert.ok(!/\{\w+\}/.test(r.testo));
  });

  prova(`[${lingua}] schemi_orchestrazione: gettoni e nodi dentro la scena, deterministici`, () => {
    for (const s of [st({}), st({ pausa_umana: true, max_giri: 5, segnale_uscita: false, modo_coordinatore: "handoff" })]) {
      ids.forEach((id, i) => {
        const r = simula(sc, s, id);
        r.fotogrammi.forEach((f, k) => f.forEach((n) => {
          const p = punto(sc, s, i, n, r.fotogrammi, k);
          assert.ok(p.x > 0 && p.x < 720 && p.y > 0 && p.y < 420, `${id}/${n}: ${JSON.stringify(p)}`);
        }));
        assert.deepEqual(r, simula(sc, s, id));
      });
    }
    for (const sch of sc.schemi) for (const n of sch.nodi) assert.ok(n.x - 42 >= 0 && n.x + 42 <= 340 && n.y - 13 >= 22 && n.y + 13 <= 150, `${sch.id}/${n.id}`);
  });
}
