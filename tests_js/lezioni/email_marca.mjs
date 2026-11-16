// Prove della lezione P3.4 "Outreach personalizzato e invio sicuro" (logica pura, entrambe le lingue).
import { componi, checklist, esito, conteggio, aCapo } from "../../webapp/animazioni/email_marca.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("email_marca.json"), lingua);
  const sc = L.scenario;
  const tutte = Object.fromEntries(sc.regole.map((r) => [r.id, true]));
  const nessuna = Object.fromEntries(sc.regole.map((r) => [r.id, false]));
  const base = { regole: tutte, ambiente: "produzione", approva_sempre: false, destinatario: "giusto", frase_aperta: "invito", inviato: true, decisione: "nessuna" };
  const st = (diff) => ({ ...base, ...diff });
  const senzaSegnaposto = (t) => assert.ok(!/\{\w+\}/.test(t), t);

  prova(`[${lingua}] email_marca: ogni segmento produce email ed esito validi; riassunto in 3 frasi`, () => {
    for (const seg of L.segmenti) {
      const frasi = componi(sc, seg.stato_animazione.regole);
      assert.ok(frasi.length >= 6);
      for (const f of frasi) assert.ok(f.testo && !/\{\w+\}/.test(f.testo));
      senzaSegnaposto(esito(sc, seg.stato_animazione).testo);
      assert.ok(sc.frasi.some((f) => f.id === seg.stato_animazione.frase_aperta));
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });
  prova(`[${lingua}] email_marca: senza regole ci sono frasi rosse e gialle, con tutte le regole nessuna`, () => {
    const c0 = conteggio(componi(sc, nessuna));
    assert.ok(c0.non_supportata >= 1 && c0.ipotesi >= 1 && c0.vietata >= 1 && c0.promessa >= 1);
    assert.ok(!c0.disiscrizione);
    const c1 = conteggio(componi(sc, tutte));
    for (const k of ["non_supportata", "ipotesi", "vietata", "promessa", "tono"]) assert.ok(!c1[k], k);
    assert.equal(c1.disiscrizione, 1);
    assert.ok(c1.domanda >= 1, "l'ipotesi diventa una domanda");
  });
  prova(`[${lingua}] email_marca: ogni regola cambia davvero l'email`, () => {
    const testo = (r) => componi(sc, r).map((f) => f.testo).join("|");
    for (const r of sc.regole) assert.notEqual(testo({ ...nessuna, [r.id]: true }), testo(nessuna), r.id);
    const dati = componi(sc, { ...nessuna, dati: true });
    assert.ok(!dati.some((f) => f.stato === "non_supportata" || f.stato === "ipotesi"));
  });
  prova(`[${lingua}] email_marca: le frasi con dato puntano a un campo della scheda, le inventate a nessuno`, () => {
    for (const f of componi(sc, nessuna)) {
      if (["dato", "ipotesi", "domanda"].includes(f.stato)) assert.ok(sc.lead.campi.some((c) => c.id === f.campo), f.id);
      if (f.stato === "non_supportata") assert.equal(f.campo, "");
      if (f.stato === "ipotesi") assert.equal(sc.lead.campi.find((c) => c.id === f.campo).origine, "dedotto");
    }
  });
  prova(`[${lingua}] email_marca: checklist del lucchetto`, () => {
    const ok = checklist(sc, componi(sc, tutte), "giusto");
    assert.ok(ok.every((v) => v.ok));
    const ko = checklist(sc, componi(sc, { ...tutte, sconto: false, disiscrizione: false }), "sbagliato");
    assert.deepEqual(ko.filter((v) => !v.ok).map((v) => v.id).sort(), ["destinatario", "disiscrizione", "promesse"]);
  });
  prova(`[${lingua}] email_marca: prova, lucchetto, decisione e "approva sempre"`, () => {
    assert.equal(esito(sc, st({ inviato: false })).codice, "bozza");
    assert.equal(esito(sc, st({ ambiente: "prova", regole: nessuna })).codice, "casella_finta");
    assert.equal(esito(sc, st({})).codice, "in_attesa");
    assert.ok(esito(sc, st({})).lucchetto && !esito(sc, st({ approva_sempre: true })).lucchetto);
    assert.equal(esito(sc, st({ decisione: "approva" })).codice, "partita_ok");
    assert.equal(esito(sc, st({ decisione: "rimanda" })).codice, "rimandata_inutile");
    const rotta = { regole: { ...tutte, sconto: false }, destinatario: "sbagliato" };
    assert.equal(esito(sc, st({ ...rotta, decisione: "approva" })).codice, "approvata_con_errori");
    assert.equal(esito(sc, st({ ...rotta, decisione: "rimanda" })).codice, "rimandata_giusto");
    assert.equal(esito(sc, st({ ...rotta, approva_sempre: true })).codice, "danno");
    assert.equal(esito(sc, st({ approva_sempre: true })).codice, "senza_controllo");
    assert.equal(esito(sc, st({ ...rotta, decisione: "rimanda" })).problemi, 2);
    const seg = L.segmenti.find((s) => s.id === "lucchetto").stato_animazione;
    assert.ok(esito(sc, { ...seg, inviato: true }).problemi >= 2, "il passo del lucchetto parte con un'email da rimandare");
  });
  prova(`[${lingua}] email_marca: a capo e determinismo`, () => {
    for (const r of aCapo("uno due tre quattro cinque sei sette otto nove dieci", 12)) assert.ok(r.length <= 12);
    assert.deepEqual(componi(sc, tutte), componi(sc, tutte));
    assert.deepEqual(esito(sc, st({})), esito(sc, st({})));
    assert.throws(() => esito(sc, st({ decisione: "boh" })));
  });
}
