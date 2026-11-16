// Prove della lezione P4.5 "I raggi X" (logica pura, entrambe le lingue).
import { righe, valutaScelta, traccia, posizioniTraccia } from "../../webapp/animazioni/raggi_x.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("raggi_x.json"), lingua);
  const sc = L.scenario;
  const base = { vista: "agente", raggi: false, doc_aperto: "bolla", scelta: null, config: "ampi", segreti: "prompt" };
  const st = (diff) => ({ ...base, ...diff });
  const esito = (t, id) => t.passi.find((p) => p.id === id).esito;
  const senzaSegnaposto = (x) => assert.ok(!/\{\w+\}/.test(x), x);

  prova(`[${lingua}] raggi_x: dati coerenti, una sola riga ostile (nella bolla di carico), riassunto in 3 frasi`, () => {
    const ostili = sc.documenti.flatMap((d) => d.righe.filter((r) => r.ostile).map((r) => ({ doc: d.id, r })));
    assert.equal(ostili.length, 1);
    assert.equal(ostili[0].doc, "bolla");
    assert.ok(ostili[0].r.nascosta, "l'ordine ostile e' nascosto");
    for (const d of sc.documenti) for (const r of d.righe) if (r.nascosta && !r.ostile) assert.ok(r.spiega, `${r.id}: esca senza spiegazione`);
    assert.ok(sc.documenti.flatMap((d) => d.righe).filter((r) => r.nascosta && !r.ostile).length >= 3, "servono esche");
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
    for (const seg of L.segmenti) { const t = traccia(sc, seg.stato_animazione); senzaSegnaposto(t.sintesi); }
  });

  prova(`[${lingua}] raggi_x: senza raggi X le righe nascoste non si vedono, con i raggi X si`, () => {
    const spenti = righe(sc, st({ raggi: false })), accesi = righe(sc, st({ raggi: true }));
    assert.ok(spenti.some((r) => r.nascosta && !r.visibile));
    assert.ok(accesi.every((r) => r.visibile));
    assert.equal(spenti.length, accesi.length, "il testo nascosto c'e' sempre: l'agente lo legge comunque");
  });

  prova(`[${lingua}] raggi_x: gioco "scova l'iniezione" con riscontro su esca, riga visibile e riga giusta`, () => {
    const ostile = sc.documenti.find((d) => d.id === "bolla").righe.find((r) => r.ostile);
    const esca = sc.documenti.find((d) => d.id === "bolla").righe.find((r) => r.nascosta && !r.ostile);
    const visibile = sc.documenti.find((d) => d.id === "bolla").righe.find((r) => !r.nascosta);
    assert.equal(valutaScelta(sc, st({ raggi: true })).esito, "nessuna");
    assert.equal(valutaScelta(sc, st({ raggi: true, scelta: ostile.id })).esito, "giusta");
    assert.equal(valutaScelta(sc, st({ raggi: true, scelta: esca.id })).esito, "esca");
    assert.equal(valutaScelta(sc, st({ raggi: true, scelta: visibile.id })).esito, "visibile");
    for (const s of [st({}), st({ raggi: true, scelta: esca.id }), st({ scelta: ostile.id })]) senzaSegnaposto(valutaScelta(sc, s).testo);
  });

  prova(`[${lingua}] raggi_x: con permessi ampi l'agente obbedisce e i contatti escono`, () => {
    const t = traccia(sc, st({ config: "ampi", segreti: "caveau" }));
    assert.equal(esito(t, "esporta"), "ok");
    assert.equal(esito(t, "invia"), "ok");
    assert.equal(t.usciti, sc.contatti_totali);
    assert.equal(t.allarme, "rosso");
    assert.equal(t.chiave, false, "la chiave nel caveau non esce");
    assert.ok(t.passi.filter((p) => p.id === "esporta" || p.id === "invia").every((p) => p.contaminato), "il dato resta contaminato fino al punto di invio");
  });

  prova(`[${lingua}] raggi_x: minimo privilegio, gli strumenti pericolosi non esistono e il lavoro vero si fa lo stesso`, () => {
    const t = traccia(sc, st({ config: "minimo" }));
    assert.equal(esito(t, "esporta"), "inesistente");
    assert.equal(esito(t, "invia"), "inesistente");
    assert.equal(esito(t, "crm"), "ok");
    assert.equal(t.usciti, 0);
    assert.equal(t.allarme, "verde");
    assert.equal(t.anomalie, 2, "i tentativi restano nel registro");
    assert.ok(!sc.configurazioni.minimo.strumenti.includes("esporta_contatti"));
  });

  prova(`[${lingua}] raggi_x: regole fisse, tre esiti (consenti, blocca, chiedi conferma)`, () => {
    const t = traccia(sc, st({ config: "regole" }));
    assert.equal(esito(t, "crm"), "ok");
    assert.equal(esito(t, "esporta"), "bloccato");
    assert.equal(esito(t, "invia"), "conferma");
    assert.equal(t.usciti, 0);
    assert.equal(t.chiave, false);
    assert.ok(sc.configurazioni.regole.strumenti.includes("invia_email_esterna"), "gli strumenti ci sono: decide il controllore");
  });

  prova(`[${lingua}] raggi_x: la chiave esce solo se sta nel prompt (e l'agente puo' scrivere fuori)`, () => {
    for (const c of ["ampi", "minimo", "regole"]) assert.equal(traccia(sc, st({ config: c, segreti: "caveau" })).chiave, false, c);
    assert.equal(traccia(sc, st({ config: "ampi", segreti: "prompt" })).chiave, true);
    const esposta = traccia(sc, st({ config: "minimo", segreti: "prompt" }));
    assert.equal(esposta.chiave, false);
    assert.equal(esposta.chiave_esposta, true, "nel prompt la chiave resta visibile al modello");
  });

  prova(`[${lingua}] raggi_x: posizioni della traccia dentro il riquadro, deterministiche`, () => {
    for (const c of ["ampi", "minimo", "regole"]) {
      const pos = posizioniTraccia(sc, st({ config: c }));
      for (const p of pos) assert.ok(p.x >= 0 && p.x + p.w <= 720 && p.y >= 0 && p.y + p.h <= 412, JSON.stringify(p));
      assert.deepEqual(pos, posizioniTraccia(sc, st({ config: c })));
    }
    assert.deepEqual(traccia(sc, st({})), traccia(sc, st({})));
  });
}
