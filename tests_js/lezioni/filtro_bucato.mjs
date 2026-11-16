// Prove della lezione PO2.2 "Il filtro bucato" (Officina O2; logica pura, entrambe le lingue).
import {
  classifica, eseguiTest, percheRosso, regressioni, ciclo, codiceDi, righeRequisiti, riepilogoDipendenze, giriTest, giudizioGiri,
  cestoDi, aCapo,
} from "../../webapp/animazioni/filtro_bucato.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const grezza = leggi("filtro_bucato.json");
  const L = risolvi(grezza, lingua);
  const sc = L.scenario;
  const base = { ...L.segmenti[0].stato_animazione };
  const st = (d) => ({ ...base, ...d });
  const narr = (id) => L.segmenti.find((x) => x.id === id).narrazione.join(" ");
  const REPO = sc.codice_repo;
  const cod = (d) => ({ ...REPO, ...d });
  const verdi = (d) => eseguiTest(sc, cod(d)).verdi;
  const rossi = (d) => eseguiTest(sc, cod(d)).casi.filter((c) => !c.verde).map((c) => c.id);

  prova(`[${lingua}] filtro_bucato: segmenti validi, stesse chiavi, riassunto in 3 frasi senza prova`, () => {
    const chiavi = Object.keys(base).sort().join();
    for (const seg of L.segmenti) {
      assert.equal(Object.keys(seg.stato_animazione).sort().join(), chiavi, seg.id);
      assert.ok(sc.viste.includes(seg.stato_animazione.vista), seg.id);
      assert.ok(seg.concetti.every((c) => ["CO06", "CO07"].includes(c)), seg.id);
      assert.ok(eseguiTest(sc, codiceDi(seg.stato_animazione)).totale === 8);
    }
    const ultimo = L.segmenti.at(-1);
    assert.equal(ultimo.id, "riassunto");
    assert.equal(ultimo.narrazione.length, 3);
    assert.ok(!ultimo.prova);
    assert.ok(L.segmenti.length - 1 >= 4 && L.segmenti.length - 1 <= 6);
    for (const k of Object.keys(REPO)) assert.equal(L.segmenti[0].stato_animazione[k], REPO[k], `il primo passo parte dal codice del repo: ${k}`);
  });

  prova(`[${lingua}] filtro_bucato: il codice del repo riproduce il difetto (5 verdi su 8, «Not Interested» → Interested)`, () => {
    const r = eseguiTest(sc, REPO);
    assert.equal(r.verdi, 5);
    assert.deepEqual(rossi({}), ["not_interested", "not_interested_minuscolo", "not_interested_recintato"]);
    const ni = r.casi.find((c) => c.id === "not_interested");
    assert.equal(ni.uscito, sc.classi.interested);
    assert.equal(ni.passo, "primo");
    assert.ok(r.gruppi.find((g) => g.id === "regressione").verdi === 4, "le regressioni sono verdi gia' nel repo");
    assert.ok(percheRosso(sc, ni).includes("Interested"));
    assert.equal(sc.casi.length, 8);
    assert.deepEqual(sc.gruppi.map((g) => sc.casi.filter((c) => c.gruppo === g.id).length), [1, 3, 4]);
    assert.ok(sc.righe_repo.some((x) => x.n === 19 && x.codice.includes("\"Interested\" in")) && sc.righe_repo.some((x) => x.n === 21 && x.codice.includes("\"Not Interested\" in")));
  });

  prova(`[${lingua}] filtro_bucato: ordine, normalizzazione e confronto cambiano i verdi come dice la lezione`, () => {
    assert.equal(verdi({ ordine: "not_prima" }), 7, "solo l'ordine: 7 su 8");
    assert.deepEqual(rossi({ ordine: "not_prima" }), ["not_interested_minuscolo"]);
    assert.equal(verdi({ ordine: "not_prima", normalizza: true }), 8, "ordine + normalizzazione: 8 su 8");
    assert.equal(verdi({ confronto: "uguale" }), 6, "uguale senza normalizzare: qualche caso resta rosso");
    assert.equal(verdi({ confronto: "uguale", normalizza: true }), 8);
    assert.equal(verdi({ confronto: "uguale", normalizza: true, ordine: "not_prima" }), 8, "con l'uguale l'ordine non conta");
    assert.equal(verdi({ normalizza: true }), 5, "normalizzare senza cambiare l'ordine non basta");
    assert.ok(rossi({ normalizza: true }).includes("not_interested"));
    const senzaPulizia = rossi({ ordine: "not_prima", normalizza: true, pulisci: false });
    assert.deepEqual(senzaPulizia, ["not_interested_recintato"], "togliere la pulizia rompe il caso recintato");
    assert.equal(classifica(sc, cod({ ordine: "not_prima", normalizza: true, pulisci: false }), sc.casi[2].risposta).etichetta, sc.classi.unknown);
    assert.ok(narr("ordine").includes("Unknown"));
  });

  prova(`[${lingua}] filtro_bucato: regressioni e ciclo rosso → correzione → verde`, () => {
    const lancio = (d) => ({ codice: cod(d), esiti: eseguiTest(sc, cod(d)) });
    const repo = lancio({}), solo = lancio({ ordine: "not_prima" }), giusto = lancio({ ordine: "not_prima", normalizza: true });
    const rotto = lancio({ ordine: "not_prima", normalizza: true, pulisci: false });
    const id = sc.caso_dei_giri;
    assert.deepEqual(ciclo([], REPO, id), { rosso: false, correzione: false, verde: false });
    assert.deepEqual(ciclo([repo], REPO, id), { rosso: true, correzione: false, verde: false });
    assert.deepEqual(ciclo([repo], cod({ ordine: "not_prima" }), id), { rosso: true, correzione: true, verde: false });
    assert.deepEqual(ciclo([repo, solo], cod({ ordine: "not_prima" }), id), { rosso: true, correzione: true, verde: false });
    assert.deepEqual(ciclo([repo, solo, giusto], codiceDi(st(giusto.codice)), id), { rosso: true, correzione: true, verde: true });
    assert.deepEqual(ciclo([giusto], giusto.codice, id), { rosso: false, correzione: false, verde: false }, "senza un rosso il ciclo non parte");
    assert.deepEqual(regressioni(giusto, rotto).map((c) => c.id), ["not_interested_recintato"]);
    assert.deepEqual(regressioni(null, rotto), []);
    assert.deepEqual(regressioni(repo, giusto), []);
  });

  prova(`[${lingua}] filtro_bucato: dipendenze (10 righe, 3 mai importate, fissate = garantite)`, () => {
    assert.equal(sc.requisiti.length, 10);
    assert.ok(narr("fissate").includes("10"));
    const inutili = sc.requisiti.filter((r) => r.uso === "inutile").map((r) => r.nome);
    assert.deepEqual(inutili, ["aiofiles", "jinja2", "requests"]);
    for (const n of inutili) assert.ok(narr("fissate").includes(n), n);
    assert.deepEqual(riepilogoDipendenze(sc, st({})).garantite, 0);
    const pulite = riepilogoDipendenze(sc, st({ fissate: true, pulite: true }));
    assert.equal(pulite.righe, 7);
    assert.equal(pulite.garantite, 7);
    assert.equal(pulite.inutili, 0);
    assert.equal(riepilogoDipendenze(sc, st({ pulite: true })).libere, 7);
    assert.ok(righeRequisiti(sc, st({ pulite: true })).filter((r) => r.tolta).length === 3);
    assert.ok(!sc.basi.find((b) => b.id === "vecchia").supportata && sc.basi.find((b) => b.id === "supportata").supportata);
    assert.ok(narr("fissate").includes(sc.basi.find((b) => b.id === "vecchia").immagine));
    const req = ["fastapi", "uvicorn", "pandas", "pydantic", "pydantic-settings", "groq"];
    for (const n of req) assert.ok(sc.requisiti.some((r) => r.nome === n && r.uso !== "inutile"), n);
  });

  prova(`[${lingua}] filtro_bucato: chiave e modello, tre giri del test`, () => {
    assert.ok(narr("chiave_finto").includes(sc.temperatura));
    assert.equal(giudizioGiri(giriTest(sc, st({ modello: "vero" }))), "variabili");
    assert.equal(giudizioGiri(giriTest(sc, st({ modello: "vero", chiave: "assente" }))), "errore");
    assert.equal(giudizioGiri(giriTest(sc, st({ modello: "finto" }))), "stabili_rossi", "col modello finto il difetto si vede sempre");
    assert.equal(giudizioGiri(giriTest(sc, st({ modello: "finto", chiave: "assente" }))), "stabili_rossi", "al modello finto la chiave non serve");
    assert.equal(giudizioGiri(giriTest(sc, st({ modello: "finto", ordine: "not_prima" }))), "stabili_verdi");
    assert.equal(giriTest(sc, st({})).length, 3);
    for (const k of ["repo", "ambiente", "assente"]) assert.ok(sc.testi[`chiave_${k}`]);
    assert.ok(!/gsk_|sk-[A-Za-z0-9]{8}/.test(JSON.stringify(grezza)), "nessuna forma di chiave nel file");
  });

  prova(`[${lingua}] filtro_bucato: i testi stanno nei riquadri della scena`, () => {
    for (const c of sc.casi) {
      assert.ok(aCapo(c.etichetta, 14).length <= 2, c.etichetta);
      assert.ok(cestoDi(sc, c.atteso), c.atteso);
    }
    const T = sc.testi;
    const box = [T.box_pulisci, T.box_json, T.box_normalizza, T.box_altrimenti];
    for (const [conf, et] of [["contiene", "Not Interested"], ["uguale", "not interested"], ["contiene", "Interested"]]) box.push(T.box_controllo.replace("{n}", "1").replace("{confronto}", T[`confronto_${conf}`]).replace("{etichetta}", et));
    for (const b of box) assert.ok(aCapo(b, 19).length <= 4, b);
    for (const b of [T.box_pulisci, T.box_normalizza]) assert.ok(aCapo(b, 19).length <= 3, b);
    for (const u of Object.values(sc.usi)) assert.ok(u.length <= 27, u);
    for (const t of [T.cella_libera_oggi, T.cella_libera_poi, T.cella_fissata_oggi, T.cella_fissata_poi, T.cella_non_costruita]) assert.ok(t.length <= 27, t);
    for (const k of ["variabili", "errore", "stabili_rossi", "stabili_verdi"]) assert.ok(aCapo(T[`giri_${k}`], 110).length <= 2, k);
    for (const c of sc.casi) assert.ok(`${c.etichetta}`.length <= 24 && T.uscito.replace("{x}", "Needs Follow-up").length <= 28, c.id);
    assert.ok(aCapo(sc.etichette.test_caso, 30).length <= 4);
    for (const b of sc.basi) assert.ok(aCapo(T.esito_base_vecchia.replace("{immagine}", b.immagine).replace("{minimo}", sc.python_minimo), 86).length <= 2, b.id);
    for (const c of sc.casi) assert.ok(`${c.etichetta}`.length <= 26, `etichetta troppo lunga per la cella: ${c.etichetta}`);
  });

  prova(`[${lingua}] filtro_bucato: nessun testo vuoto o segnaposto rimasto (IT e EN), nessun codice corretto mostrato`, () => {
    const visita = (x, via) => {
      if (x && typeof x === "object" && !Array.isArray(x) && Object.keys(x).sort().join() === "en,it") {
        for (const l of ["it", "en"]) assert.ok(typeof x[l] === "string" && x[l].trim(), `${via} vuoto in ${l}`);
        return;
      }
      if (Array.isArray(x)) x.forEach((v, i) => visita(v, `${via}[${i}]`));
      else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) visita(v, `${via}.${k}`);
    };
    visita(grezza, "lezione");
    for (const seg of L.segmenti) for (const t of [...seg.narrazione, seg.prova || ""]) assert.ok(!/\{\w+\}/.test(t) && !/undefined|NaN/.test(t), t);
    const testo = JSON.stringify(L);
    assert.ok(!/\.lower\(\)|\.strip\(\)|if\s+"Not Interested"/.test(testo), "la lezione non mostra il classificatore corretto");
    for (const c of eseguiTest(sc, REPO).casi.filter((x) => !x.verde)) assert.ok(!/\{\w+\}/.test(percheRosso(sc, c)));
  });
}
