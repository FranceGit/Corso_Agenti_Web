// Prove della lezione P8.2 "Lo smistatore" (logica pura, entrambe le lingue).
import { fattori, livelloDaFattori, livelloDaImporto, smista, operatore, approvazione, verifica, posizioni } from "../../webapp/animazioni/smistatore_rischio.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("smistatore_rischio.json"), lingua);
  const sc = L.scenario;
  const base = L.segmenti[0].stato_animazione;
  const st = (diff) => ({ ...base, ...diff });
  const riga = (s, id) => smista(sc, s).righe.find((r) => r.id === id);
  const aperti = (t) => assert.ok(!/\{\w+\}/.test(t), t);

  prova(`[${lingua}] smistatore_rischio: dati coerenti, ogni segmento valido, riassunto in 3 frasi`, () => {
    for (const seg of L.segmenti) {
      const c = smista(sc, seg.stato_animazione);
      assert.equal(c.righe.length, sc.carte.length);
      for (const r of c.righe) assert.ok(sc.uscite.some((u) => u.id === r.uscita));
    }
    assert.deepEqual(sc.livelli.map((l) => l.uscita), ["consenti", "conferma", "approvazione"]);
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });

  prova(`[${lingua}] smistatore_rischio: le quattro manopole danno basso, medio e alto`, () => {
    assert.equal(riga(st({}), "aggiorna_nota").livello, "basso");
    assert.equal(riga(st({}), "email_500").livello, "medio");
    assert.equal(riga(st({}), "sconto_30").livello, "alto");
    assert.equal(riga(st({}), "cancella_contatto").uscita, "approvazione");
    const reversibile = st({ ritocchi: { cancella_contatto: { reversibile: true } } });
    assert.equal(riga(reversibile, "cancella_contatto").livello, "medio", "renderla reversibile abbassa il livello");
    assert.equal(livelloDaFattori(sc, { scrive: false, reversibile: true, permessi: "base", impatto: "nessuno" }).punti, 0);
    assert.equal(fattori(sc, reversibile, "cancella_contatto").permessi, "ampi", "il ritocco cambia solo il fattore toccato");
  });

  prova(`[${lingua}] smistatore_rischio: soglie d'importo 100/500 ed email sospetta`, () => {
    assert.equal(livelloDaImporto(sc, 60), "basso");
    assert.equal(livelloDaImporto(sc, 100), "medio");
    assert.equal(livelloDaImporto(sc, 500), "medio");
    assert.equal(livelloDaImporto(sc, 510), "alto");
    assert.equal(riga(st({ importo: 800 }), "rimborso").uscita, "approvazione");
    assert.equal(riga(st({ importo: 800, ritocchi: { rimborso: { impatto: "nessuno" } } }), "rimborso").uscita, "approvazione", "per il rimborso decide l'importo");
    assert.equal(riga(st({}), "risposta_cliente").uscita, "consenti");
    const sosp = riga(st({ email_sospetta: true }), "risposta_cliente");
    assert.equal(sosp.uscita, "conferma");
    assert.equal(sosp.motivo, "sospetta");
    assert.equal(riga(st({ email_sospetta: true }), "aggiorna_nota").uscita, "consenti", "vale solo per le azioni verso l'esterno");
  });

  prova(`[${lingua}] smistatore_rischio: tentativi falliti e coda di approvazione con identificativo`, () => {
    assert.equal(operatore(sc, st({ tentativi: 2 })).passa, false);
    assert.equal(operatore(sc, st({ tentativi: sc.soglia_tentativi })).passa, true);
    assert.equal(approvazione(sc, st({})).stato, "attesa");
    assert.equal(approvazione(sc, st({})).carta, "sconto_30");
    assert.equal(approvazione(sc, st({ approvazione: "approvata" })).esecuzioni, 1);
    assert.equal(approvazione(sc, st({ approvazione: "approvata", perdi_id: true })).esecuzioni, 2, "senza identificativo parte un'esecuzione nuova");
    assert.equal(approvazione(sc, st({ approvazione: "respinta" })).esecuzioni, 0);
  });

  prova(`[${lingua}] smistatore_rischio: fail-closed ferma tutto, fail-open e "approva sempre" fanno scattare l'allarme`, () => {
    const chiuso = smista(sc, st({ servizio_regole: false, fail_closed: true }));
    assert.equal(chiuso.per_uscita.fermo, sc.carte.length);
    assert.equal(chiuso.allarmi, 0);
    const aperto = smista(sc, st({ servizio_regole: false, fail_closed: false }));
    assert.equal(aperto.per_uscita.consenti, sc.carte.length);
    assert.ok(aperto.righe.find((r) => r.id === "cancella_contatto").allarme);
    assert.ok(aperto.allarmi >= 3);
    const sempre = smista(sc, st({ sempre_consenti: true }));
    assert.equal(sempre.per_uscita.consenti, sc.carte.length);
    assert.equal(sempre.allarmi, aperto.allarmi);
    assert.equal(approvazione(sc, st({ servizio_regole: false })).stato, "nessuna");
  });

  prova(`[${lingua}] smistatore_rischio: gioco "Decidi tu" con riscontro spiegato`, () => {
    const vuoto = verifica(sc, st({ vista: "decidi" }));
    assert.ok(vuoto.righe.every((x) => x.esito === "vuoto"));
    const migliori = Object.fromEntries(sc.gioco.map((g) => [g.id, g.migliore]));
    assert.equal(verifica(sc, st({ vista: "decidi", scelte: migliori })).giuste, sc.gioco.length);
    const misto = verifica(sc, st({ vista: "decidi", scelte: { ...migliori, a_sconto: "conferma", a_massa: "consenti" } }));
    assert.equal(misto.righe.find((x) => x.id === "a_sconto").esito, "quasi");
    assert.equal(misto.righe.find((x) => x.id === "a_massa").esito, "sbagliato");
    for (const x of [...vuoto.righe, ...misto.righe]) aperti(x.testo);
    aperti(misto.sintesi);
  });

  prova(`[${lingua}] smistatore_rischio: chip dentro il riquadro, deterministici`, () => {
    for (const s of [st({}), st({ servizio_regole: false }), st({ sempre_consenti: true }), st({ vista: "decidi" }), st({ vista: "decidi", scelte: { a_nota: "consenti" } })]) {
      const pos = posizioni(sc, s);
      for (const p of Object.values(pos)) assert.ok(p.x >= 0 && p.x + 152 <= 720 && p.y >= 0 && p.y + 34 <= 430, JSON.stringify(p));
      assert.deepEqual(pos, posizioni(sc, s));
    }
    assert.equal(Object.keys(posizioni(sc, st({ vista: "decidi" }))).length, sc.gioco.length);
  });
}
