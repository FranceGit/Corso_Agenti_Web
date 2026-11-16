// Prove della lezione PO2.1 "La mappa del repo" (Officina O2; logica pura, entrambe le lingue).
import {
  esitoApertura, tappeCoperte, salti, indiziTrovati, esitoEsecuzione, mappaCompleta, percorsoLead, righeAlbero,
  eventi, eventiApertura, verifica, aCapo, rangoFile, fileDi,
} from "../../webapp/animazioni/mappa_repo.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const grezza = leggi("mappa_repo.json");
  const L = risolvi(grezza, lingua);
  const sc = L.scenario;
  const base = { ...L.segmenti[0].stato_animazione };
  const st = (d) => ({ ...base, ...d });
  const narr = (id) => L.segmenti.find((x) => x.id === id).narrazione.join(" ");
  const ORDINE_GIUSTO = ["main", "requirements", "config", "scoring"];

  prova(`[${lingua}] mappa_repo: segmenti validi, stesse chiavi, riassunto in 3 frasi senza prova`, () => {
    const chiavi = Object.keys(base).sort().join();
    for (const seg of L.segmenti) {
      assert.equal(Object.keys(seg.stato_animazione).sort().join(), chiavi, seg.id);
      for (const id of seg.stato_animazione.aperti) fileDi(sc, id);
      assert.ok(eventi(sc, seg.stato_animazione).every((e) => e.testo && !/\{\w+\}/.test(e.testo)), seg.id);
      assert.deepEqual(seg.concetti, ["CO05"]);
    }
    const ultimo = L.segmenti.at(-1);
    assert.equal(ultimo.id, "riassunto");
    assert.equal(ultimo.narrazione.length, 3);
    assert.ok(!ultimo.prova);
    assert.ok(L.segmenti.length - 1 >= 4 && L.segmenti.length - 1 <= 6);
  });

  prova(`[${lingua}] mappa_repo: i numeri del testo coincidono con i dati dello scenario`, () => {
    assert.ok(narr("lead").includes(String(sc.attesa_lead_secondi)), "6 secondi di sleep");
    assert.ok(narr("lead").includes("92"), "punteggio di Sarah");
    assert.ok(sc.lead.tappe.find((t) => t.file === "scoring").valore.includes("92"));
    assert.ok(narr("lead").includes("56"), "il commento alla riga 56");
    assert.equal(sc.lead.tappe.length, 7);
    const parole = { it: ["sei", "dieci", "tre"], en: ["six", "ten", "three"] }[lingua];
    for (const p of parole) assert.ok(narr("indizi").includes(p), p);
    assert.equal(sc.indizi.length, 6);
    assert.ok(narr("decidi_sintomo").includes(`${sc.numero_lead}`));
    const req = fileDi(sc, "requirements");
    assert.ok(req.nota.includes("10"));
    assert.equal(sc.casi.length, 6);
    assert.ok(narr("decidi_sintomo").includes({ it: "sei", en: "six" }[lingua]));
  });

  prova(`[${lingua}] mappa_repo: ordine di lettura (ingresso, dipendenze, configurazione, flusso) e salti`, () => {
    assert.equal(esitoApertura(sc, [], "main").tipo, "ok");
    assert.equal(esitoApertura(sc, [], "readme").tipo, "documento");
    const salto = esitoApertura(sc, [], "classifier");
    assert.equal(salto.tipo, "salto");
    assert.deepEqual(salto.mancanti, ["ingresso", "dipendenze", "configurazione"]);
    assert.deepEqual(esitoApertura(sc, ["main"], "config").mancanti, ["dipendenze"]);
    assert.equal(esitoApertura(sc, ["main"], "main").tipo, "ripasso");
    assert.ok(mappaCompleta(sc, ORDINE_GIUSTO));
    assert.equal(salti(sc, ORDINE_GIUSTO), 0);
    assert.ok(!mappaCompleta(sc, ["scoring", "main", "requirements", "config"]), "con un salto la mappa non e' completa");
    assert.equal(salti(sc, ["scoring", "main", "config"]), 2);
    assert.deepEqual(tappeCoperte(sc, ["readme"]), []);
    for (const f of sc.file) assert.ok(rangoFile(sc, f.id) >= 0 && rangoFile(sc, f.id) <= 4, f.id);
  });

  prova(`[${lingua}] mappa_repo: gli indizi si accendono con i file giusti (due chiedono due file)`, () => {
    assert.deepEqual(indiziTrovati(sc, []), []);
    assert.deepEqual(indiziTrovati(sc, ["config"]), ["chiave_import"]);
    assert.ok(!indiziTrovati(sc, ["llm"]).includes("modello"), "il modello del README chiede anche il README");
    assert.ok(indiziTrovati(sc, ["llm", "readme"]).includes("modello"));
    assert.ok(!indiziTrovati(sc, ["classifier"]).includes("ordine"));
    assert.ok(indiziTrovati(sc, ["classifier", "summary"]).includes("ordine"));
    assert.equal(sc.indizi.filter((d) => d.richiede.length === 2).length, 2);
    assert.equal(indiziTrovati(sc, sc.file.map((f) => f.id)).length, sc.indizi.length);
    const ev = eventiApertura(sc, ["classifier"], "summary");
    assert.ok(ev.some((e) => e.testo.includes(sc.indizi.find((d) => d.id === "ordine").testo)));
  });

  prova(`[${lingua}] mappa_repo: «Esegui subito» senza leggere e' un errore, dopo config.py un avviso`, () => {
    assert.equal(esitoEsecuzione(sc, []), "errore");
    assert.equal(esitoEsecuzione(sc, ["main", "config"]), "avviso");
    const e1 = eventi(sc, st({ eseguito: true })), e2 = eventi(sc, st({ eseguito: true, aperti: ["config"] }));
    assert.equal(e1.at(-1).tipo, "male");
    assert.equal(e2.at(-1).tipo, "avviso");
    assert.notEqual(e1.at(-1).testo, e2.at(-1).testo);
    assert.ok(sc.errore_avvio.includes("GROQ_API_KEY"));
  });

  prova(`[${lingua}] mappa_repo: il lead percorre l'albero da main.py al report, dentro la scena`, () => {
    const p = percorsoLead(sc);
    assert.equal(p[0].file, "leads");
    assert.equal(p.at(-1).file, "summary");
    assert.ok(p.at(-1).valore.includes("Not Interested: 0"));
    const righe = righeAlbero(sc);
    assert.ok(righe.at(-1).y < 450 - 8, "l'albero sta nella scena");
    for (const r of righe) assert.ok(aCapo(r.nome, 30).length === 1, r.nome);
    for (const t of p) assert.ok(aCapo(t.codice, 54).length <= 3 && aCapo(t.spiega, 66).length <= 3, t.file);
    assert.ok(eventi(sc, st({ lead: true })).length === 2);
  });

  prova(`[${lingua}] mappa_repo: i testi della lente stanno nei loro riquadri`, () => {
    for (const f of sc.file) {
      assert.ok(f.righe.length >= 1 && f.righe.length <= 3, f.id);
      for (const r of f.righe) assert.ok(aCapo(r.codice, 54).length <= 2, `${f.id} riga ${r.n}`);
      assert.ok(aCapo(f.nota, 66).length <= 3, `nota di ${f.id}: ${f.nota}`);
    }
    for (const d of sc.indizi) assert.ok(aCapo(`⚑ ${d.testo}`, 66).length <= 2, d.id);
    for (const c of sc.casi) assert.ok(aCapo(c.testo, 104).length <= 2, c.id);
    for (const t of sc.lead.tappe) assert.ok(aCapo(t.valore, 46).length === 1, t.valore);
    for (const t of sc.tappe) assert.ok(`${t.rango}. ${t.nome}`.length <= 17, t.nome);
    assert.ok(aCapo(sc.testi.esegui_errore, 66).length <= 5 && aCapo(sc.testi.esegui_avviso, 66).length <= 5);
  });

  prova(`[${lingua}] mappa_repo: gioco «Decidi tu» con riscontro spiegato, il report e' un sintomo`, () => {
    const vuoto = verifica(sc, st({ vista: "decidi" }));
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    const migliori = Object.fromEntries(sc.casi.map((c) => [c.id, c.migliore]));
    assert.equal(verifica(sc, st({ vista: "decidi", scelte: migliori })).giuste, sc.casi.length);
    assert.equal(migliori.k1, "difetto");
    assert.equal(migliori.k2, "innocuo");
    const misto = verifica(sc, st({ vista: "decidi", scelte: { ...migliori, k1: "innocuo" } }));
    assert.equal(misto.righe[0].esito, "sbagliato");
    assert.equal(misto.giuste, sc.casi.length - 1);
    for (const r of [...vuoto.righe, ...misto.righe]) assert.ok(!/\{\w+\}/.test(r.testo) && r.testo.length > 10, r.testo);
  });

  prova(`[${lingua}] mappa_repo: nessun testo vuoto o segnaposto rimasto nello scenario (IT e EN)`, () => {
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
  });
}
