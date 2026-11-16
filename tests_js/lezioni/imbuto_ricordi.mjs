// Prove della lezione P5.3 "L'imbuto dei ricordi" (logica pura, entrambe le lingue).
import { estrai, archivio, saluto, prossimaAzione, costi, recupera, verificaCassetti, posizioni } from "../../webapp/animazioni/imbuto_ricordi.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("imbuto_ricordi.json"), lingua);
  const sc = L.scenario;
  const base = L.segmenti[0].stato_animazione;
  const st = (diff) => ({ ...base, ...diff });
  const tutti = sc.argomenti.map((a) => a.id);
  const senzaSegnaposto = (t) => assert.ok(!/\{\w+\}/.test(t), t);

  prova(`[${lingua}] imbuto_ricordi: segmenti validi, riassunto in 3 frasi, stesse chiavi di stato`, () => {
    for (const seg of L.segmenti) {
      const s = seg.stato_animazione;
      assert.ok(archivio(sc, s).length >= 1);
      senzaSegnaposto(recupera(sc, s).risposta);
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });

  prova(`[${lingua}] imbuto_ricordi: l'estrazione tiene solo gli argomenti scelti; solo convenevoli = nessun ricordo`, () => {
    const solo = (arg) => archivio(sc, st({ argomenti: arg })).filter((c) => c.operazione !== "CRM");
    assert.equal(solo([]).length, 0, "senza argomenti scelti nessun ricordo");
    assert.equal(solo(tutti).length, sc.frasi1.filter((f) => f.ricordo).length);
    assert.ok(solo(["budget"]).every((c) => c.argomento === "budget"));
    assert.ok(!solo(base.argomenti).some((c) => c.argomento === "chiacchiere"));
    const saluti = sc.frasi1.filter((f) => !f.ricordo);
    assert.equal(estrai(saluti, tutti, "x").length, 0, "le frasi di soli saluti non producono card");
  });

  prova(`[${lingua}] imbuto_ricordi: con la memoria il saluto usa i ricordi della chiamata 1, senza riparte da zero`, () => {
    const con = saluto(sc, st({ sessione: 2, memoria: true }));
    const senza = saluto(sc, st({ sessione: 2, memoria: false }));
    assert.ok(con.ricordi >= 3 && senza.ricordi === 0);
    assert.notEqual(con.testo, senza.testo);
    assert.ok(con.testo.length > senza.testo.length / 2);
    for (const t of [con.testo, senza.testo]) senzaSegnaposto(t);
  });

  prova(`[${lingua}] imbuto_ricordi: consolidamento = UPDATE e canale giusto; senza = conflitto e canale sbagliato`, () => {
    const con = archivio(sc, st({ sessione: 2, consolidamento: true }));
    const vecchia = con.find((c) => c.id === sc.frasi2.find((f) => f.sostituisce).sostituisce);
    assert.equal(vecchia.stato, "superata");
    assert.equal(vecchia.superata_il, sc.date.s2);
    assert.ok(con.some((c) => c.operazione === "UPDATE"));
    const az = prossimaAzione(sc, st({ sessione: 2, consolidamento: true }));
    assert.equal(az.esito, "ok");
    assert.equal(az.canale, sc.canale_giusto);
    const no = prossimaAzione(sc, st({ sessione: 2, consolidamento: false }));
    assert.ok(no.conflitto && no.esito === "male" && no.canale !== sc.canale_giusto);
    assert.equal(archivio(sc, st({ sessione: 2, consolidamento: false })).filter((c) => c.argomento === "contatto" && c.stato === "attiva").length, 2);
    senzaSegnaposto(no.testo);
  });

  prova(`[${lingua}] imbuto_ricordi: provenienza CRM ad alta fiducia presente anche per un cliente appena arrivato`, () => {
    const a = archivio(sc, st({ argomenti: [] }));
    assert.ok(a.length >= 1 && a.every((c) => c.fonte === "crm"));
    assert.ok(archivio(sc, st({})).some((c) => c.fonte !== "crm"));
  });

  prova(`[${lingua}] imbuto_ricordi: estrarre piu' spesso costa di piu' ma il ricordo e' piu' fresco`, () => {
    const c = sc.trigger.map((t) => costi(sc, t.id));
    for (let i = 1; i < c.length; i++) {
      assert.ok(c[i].chiamate > c[i - 1].chiamate);
      assert.ok(c[i].quota_freschezza > c[i - 1].quota_freschezza);
    }
    assert.throws(() => costi(sc, "mai"));
  });

  prova(`[${lingua}] imbuto_ricordi: con la sola rilevanza riaffiora il ricordo di due anni fa; con le 3 manopole no`, () => {
    const solo = recupera(sc, st({ vista: "recupero", manopole: { rilevanza: 1, recency: 0, importanza: 0 } }));
    assert.equal(solo.scelti.length, sc.recupero.quanti);
    assert.ok(solo.vecchi >= 1);
    const tre = recupera(sc, st({ vista: "recupero", manopole: { rilevanza: 1, recency: 1, importanza: 1 } }));
    assert.equal(tre.vecchi, 0);
    const zero = recupera(sc, st({ manopole: { rilevanza: 0, recency: 0, importanza: 0 } }));
    assert.equal(zero.scelti.length, 0);
    assert.equal(zero.risposta, sc.testi.rinnovo_vuoto);
  });

  prova(`[${lingua}] imbuto_ricordi: gioco dei cassetti e posizioni dentro la scena`, () => {
    const giuste = Object.fromEntries(sc.cassetti.map((c) => [c.id, c.giusto]));
    assert.equal(verificaCassetti(sc, st({ scelte: giuste })).giuste, sc.cassetti.length);
    assert.ok(sc.cassetti.some((c) => c.giusto === "procedurale") && sc.cassetti.some((c) => c.giusto === "dichiarativa"));
    const vuoto = verificaCassetti(sc, st({}));
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    for (const r of vuoto.righe) senzaSegnaposto(r.testo);
    const tuttiDich = Object.fromEntries(sc.cassetti.map((c) => [c.id, "dichiarativa"]));
    for (const s of [st({ argomenti: tutti, sessione: 2 }), st({ scelte: tuttiDich }), st({})]) {
      const p = posizioni(sc, s);
      for (const gruppo of Object.values(p)) for (const q of Object.values(gruppo)) assert.ok(q.x >= 0 && q.y >= 0 && q.x + q.w <= 720 && q.y + q.h <= 412, JSON.stringify(q));
      assert.deepEqual(p, posizioni(sc, s));
    }
  });
}
