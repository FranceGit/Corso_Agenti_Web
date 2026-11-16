// Prove della lezione P5.5 "Dove si nasconde un dato" (logica pura, entrambe le lingue).
import { contenitori, prove, revoca, clienti, posizioni } from "../../webapp/animazioni/dove_dato.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("dove_dato.json"), lingua);
  const sc = L.scenario;
  const base = L.segmenti[0].stato_animazione;
  const st = (diff) => ({ ...base, ...diff });
  const tutti = sc.contenitori.map((c) => c.id);
  const senzaSegnaposto = (t) => assert.ok(!/\{\w+\}/.test(t), t);

  prova(`[${lingua}] dove_dato: segmenti validi, testi senza segnaposto, riassunto in 3 frasi`, () => {
    for (const seg of L.segmenti) {
      const s = seg.stato_animazione;
      const p = prove(sc, s);
      for (const t of [p.richiama.testo, p.collega.testo, p.oblio ? p.oblio.testo : ""]) senzaSegnaposto(t);
      const c = clienti(sc, s);
      senzaSegnaposto(c.risposta_b.testo);
      senzaSegnaposto(c.preventivo_a.testo);
    }
    assert.equal(sc.contenitori.length, 5);
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });

  prova(`[${lingua}] dove_dato: senza oscuramento il cellulare e' in chiaro in 5 posti; la memoria ricorda Marco`, () => {
    const c = contenitori(sc, st({}));
    assert.equal(c.filter((x) => x.personale).length, 5);
    const p = prove(sc, st({}));
    assert.equal(p.richiama.esito, "ok");
    assert.equal(p.collega.esito, "male");
    const osc = prove(sc, st({ oscuramento: true }));
    assert.equal(osc.collega.esito, "ok", "oscurato prima di salvare: niente da far trapelare");
    assert.equal(osc.richiama.esito, "ok", "la preferenza utile resta");
  });

  prova(`[${lingua}] dove_dato: diritto all'oblio solo sulla memoria = 4 copie restano; su tutto = nessuna`, () => {
    const solo = prove(sc, st({ cancella: ["memoria"], oblio: true }));
    assert.equal(solo.rimaste, 4);
    assert.equal(solo.oblio.esito, "male");
    assert.equal(solo.collega.esito, "male", "il numero si trova ancora nel log, nella cache...");
    const ovunque = prove(sc, st({ cancella: tutti, oblio: true }));
    assert.equal(ovunque.rimaste, 0);
    assert.equal(ovunque.oblio.esito, "ok");
    assert.equal(ovunque.collega.esito, "ok");
    assert.equal(ovunque.richiama.testo, sc.testi.richiama_oblio);
    assert.equal(prove(sc, st({ cancella: tutti, oblio: false })).rimaste, 5, "spuntare non basta: serve la richiesta");
  });

  prova(`[${lingua}] dove_dato: scadenza automatica e opt-out`, () => {
    const mai = contenitori(sc, st({ ttl: false, mesi: 24 }));
    assert.ok(mai.every((c) => c.presente), "senza TTL il dato resta per sempre");
    const breve = contenitori(sc, st({ ttl: true, mesi: 3 }));
    assert.ok(breve.find((c) => c.id === "cache").scaduto && breve.find((c) => c.id === "log").scaduto);
    assert.ok(breve.find((c) => c.id === "memoria").presente);
    assert.ok(contenitori(sc, st({ ttl: true, mesi: 24 })).every((c) => !c.presente));
    const opt = st({ optout: true });
    assert.ok(!contenitori(sc, opt).find((c) => c.id === "memoria").entrato);
    assert.equal(prove(sc, opt).richiama.testo, sc.testi.richiama_optout);
  });

  prova(`[${lingua}] dove_dato: revoca di una fonte, cancellare tutto perde ricordi validi, rigenerare costa`, () => {
    const tutto = revoca(sc, st({ revoca: "tutto" }));
    const rig = revoca(sc, st({ revoca: "rigenera" }));
    assert.ok(tutto.persi_validi >= 1 && tutto.costo === 0);
    assert.equal(rig.persi_validi, 0);
    assert.ok(rig.costo > 0);
    assert.ok(rig.ricordi.some((r) => r.stato === "cancellato"), "cio' che viene solo dalla fonte revocata sparisce comunque");
    assert.ok(revoca(sc, st({ revoca: "nessuna" })).ricordi.every((r) => r.stato === "tenuto"));
  });

  prova(`[${lingua}] dove_dato: isolamento per cliente e memoria avvelenata`, () => {
    assert.equal(clienti(sc, st({ isolamento: true })).risposta_b.fuga, false);
    assert.equal(clienti(sc, st({ isolamento: false })).risposta_b.fuga, true);
    const vel = clienti(sc, st({ verifica: false }));
    assert.ok(vel.preventivo_a.avvelenato && vel.archivio_a.some((r) => r.avvelenato));
    const ok = clienti(sc, st({ verifica: true }));
    assert.ok(!ok.preventivo_a.avvelenato && ok.anomalia && !ok.archivio_a.some((r) => r.avvelenato));
    assert.ok(!ok.archivio_b.some((r) => ok.archivio_a.includes(r)), "archivi separati");
  });

  prova(`[${lingua}] dove_dato: contenitori dentro la scena, calcoli deterministici`, () => {
    for (const p of Object.values(posizioni(sc))) assert.ok(p.x >= 0 && p.y >= 40 && p.x + p.w <= 720 && p.y + p.h <= 412, JSON.stringify(p));
    const s = st({ oblio: true, cancella: ["memoria", "log"], ttl: true, mesi: 6 });
    assert.deepEqual(contenitori(sc, s), contenitori(sc, s));
  });
}
