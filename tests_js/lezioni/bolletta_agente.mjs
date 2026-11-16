// Prove della lezione P8.5 "La bolletta dell'agente" (logica pura, entrambe le lingue).
import { bolletta, qualita, giri, falsoRisparmio, tokenIngressoEffettivi, verifica, barre, aCapo } from "../../webapp/animazioni/bolletta_agente.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("bolletta_agente.json"), lingua);
  const sc = L.scenario;
  const base = { ...L.segmenti[0].stato_animazione };
  const st = (d) => ({ ...base, ...d });
  const ruoli = (c, e, o, d) => st({ modalita: "ruoli", modelli_ruolo: { classifica: c, email: e, offerta: o }, cache: true, ...d });
  const prezzo = Object.fromEntries(sc.modelli.map((m) => [m.id, m]));
  const narr = (id) => L.segmenti.find((x) => x.id === id).narrazione.join(" ");

  prova(`[${lingua}] bolletta_agente: segmenti validi, riassunto in 3 frasi, partenza = riferimento`, () => {
    for (const seg of L.segmenti) assert.ok(bolletta(sc, seg.stato_animazione).totale > 0, seg.id);
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
    const rif = sc.riferimento;
    for (const k of Object.keys(rif)) assert.deepEqual(L.segmenti[0].stato_animazione[k], rif[k], k);
  });

  prova(`[${lingua}] bolletta_agente: i numeri citati nel testo coincidono con i dati`, () => {
    assert.equal(prezzo.grande.euro_ingresso / prezzo.piccolo.euro_ingresso, 60);
    assert.ok(narr("conto").includes("60") && narr("conto").includes("5"));
    for (const m of sc.modelli) assert.equal(m.euro_uscita / m.euro_ingresso, 5, m.id);
    assert.equal(sc.cache.rapporto_prezzo, 0.1);
    assert.equal(sc.cache.quota_ripetuta, 0.75);
    assert.ok(narr("giri").includes(String(sc.chiamate_necessarie)));
    const offerta = sc.ruoli.find((r) => r.id === "offerta");
    assert.ok(100 - offerta.qualita.piccolo > 100 / 3, "piu' di un'offerta su tre sbagliata");
    assert.ok(/illustrativ|illustration/i.test(sc.testi.nota_prezzi), "prezzi dichiarati illustrativi");
  });

  prova(`[${lingua}] bolletta_agente: costo = chiamate x token x prezzo x volume`, () => {
    const b = bolletta(sc, st({}));
    const m = prezzo.medio;
    const atteso = base.volume * base.chiamate * (base.token * m.euro_ingresso + sc.token_uscita * m.euro_uscita) / 1e6;
    assert.ok(Math.abs(b.modello - atteso) < 1e-6);
    assert.ok(Math.abs(bolletta(sc, st({ volume: base.volume * 2 })).modello - 2 * b.modello) < 1e-6);
    assert.ok(bolletta(sc, st({ token: 6000 })).modello > b.modello);
    assert.ok(bolletta(sc, st({ modello_unico: "grande" })).modello > b.modello && bolletta(sc, st({ modello_unico: "piccolo" })).modello < b.modello);
    assert.equal(b.token_mese, base.volume * base.chiamate * (base.token + sc.token_uscita));
  });

  prova(`[${lingua}] bolletta_agente: la cache risparmia, la data in testa la annulla, la qualita' non cambia`, () => {
    const senza = bolletta(sc, st({})), con = bolletta(sc, st({ cache: true })), data = bolletta(sc, st({ cache: true, data_in_testa: true }));
    assert.ok(con.modello < senza.modello && con.risparmio_cache > 0);
    assert.equal(data.modello, senza.modello);
    assert.equal(data.risparmio_cache, 0);
    assert.equal(con.rilavorazioni, senza.rilavorazioni);
    assert.ok(Math.abs(tokenIngressoEffettivi(sc, st({ cache: true })) - base.token * (1 - 0.75 * 0.9)) < 1e-9);
  });

  prova(`[${lingua}] bolletta_agente: il modello giusto per ruolo batte "uno per tutti", il piccolo ovunque e' falso risparmio`, () => {
    const giusto = bolletta(sc, ruoli("piccolo", "medio", "grande")).totale;
    for (const m of sc.modelli) assert.ok(giusto < bolletta(sc, st({ cache: true, modello_unico: m.id })).totale, m.id);
    assert.ok(giusto < bolletta(sc, ruoli("piccolo", "medio", "medio")).totale, "il grande sull'offerta conviene");
    assert.ok(bolletta(sc, ruoli("piccolo", "grande", "grande")).totale < bolletta(sc, ruoli("grande", "grande", "grande")).totale, "piccolo sulla classificazione: si risparmia");
    assert.ok(!bolletta(sc, ruoli("piccolo", "grande", "grande")).ruoli[0].sotto_soglia, "la classificazione resta verde");
    const male = ruoli("piccolo", "medio", "piccolo");
    assert.ok(bolletta(sc, male).ruoli[2].sotto_soglia);
    assert.ok(bolletta(sc, male).totale > bolletta(sc, ruoli("piccolo", "medio", "grande")).totale);
    assert.ok(falsoRisparmio(sc, st({ modello_unico: "piccolo" })));
    assert.ok(!falsoRisparmio(sc, ruoli("piccolo", "medio", "grande")));
  });

  prova(`[${lingua}] bolletta_agente: meno giri risparmia, troppo pochi costa`, () => {
    const s8 = ruoli("piccolo", "medio", "grande", { chiamate: 8 });
    const s4 = { ...s8, chiamate: sc.chiamate_necessarie }, s2 = { ...s8, chiamate: 2 };
    assert.equal(giri(sc, s8).tipo, "vuoto");
    assert.equal(giri(sc, s4).tipo, "giusti");
    assert.equal(giri(sc, s2).tipo, "pochi");
    assert.equal(qualita(sc, s8, "email"), qualita(sc, s4, "email"), "i giri a vuoto non migliorano niente");
    assert.ok(qualita(sc, s2, "email") < qualita(sc, s4, "email"));
    assert.ok(bolletta(sc, s4).totale < bolletta(sc, s8).totale);
    assert.ok(bolletta(sc, s2).totale > bolletta(sc, s4).totale && bolletta(sc, s2).modello < bolletta(sc, s4).modello);
    assert.ok(qualita(sc, { ...s8, chiamate: 1 }, "classifica") >= 0);
  });

  prova(`[${lingua}] bolletta_agente: barre sulla stessa scala, dentro la scena`, () => {
    for (const s of [st({}), st({ modello_unico: "piccolo" }), ruoli("piccolo", "medio", "grande", { chiamate: 4 }), st({ volume: 100000, token: 8000, chiamate: 12, modello_unico: "grande" })]) {
      const [a, b] = barre(sc, s);
      const alta = Math.max(a.modello + a.rilavorazioni, b.modello + b.rilavorazioni);
      assert.ok(Math.abs(alta - 300) < 1e-6, "la barra piu' alta riempie lo spazio");
      assert.ok(a.x >= 0 && b.x + 60 <= 720);
      assert.deepEqual(barre(sc, s), barre(sc, s));
    }
  });

  prova(`[${lingua}] bolletta_agente: gioco "Decidi tu" con riscontro spiegato`, () => {
    const vuoto = verifica(sc, st({ vista: "decidi" }));
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    const migliori = Object.fromEntries(sc.casi.map((c) => [c.id, c.migliore]));
    assert.equal(verifica(sc, st({ vista: "decidi", scelte: migliori })).giuste, sc.casi.length);
    assert.equal(migliori.k1, "falso");
    const misto = verifica(sc, st({ vista: "decidi", scelte: { ...migliori, k3: "dipende", k2: "falso" } }));
    assert.equal(misto.righe.find((r) => r.id === "k3").esito, "quasi");
    assert.equal(misto.righe.find((r) => r.id === "k2").esito, "sbagliato");
    for (const r of [...vuoto.righe, ...misto.righe]) assert.ok(!/\{\w+\}/.test(r.testo), r.testo);
    for (const c of sc.casi) assert.ok(aCapo(c.testo, 92).length <= 2, `proposta ${c.id} troppo lunga per la card`);
  });
}
