// Prove della lezione PO1.1 "La pila degli strati" (Officina O1, logica pura, entrambe le lingue).
import { righeDockerfile, ricostruisci, esitoBuild, trappole, storia, azioneContainer, esitoContenitori, verificaDifetto, caratteriIn, aCapo, riempi } from "../../webapp/animazioni/pila_strati.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const grezza = leggi("pila_strati.json");
  const L = risolvi(grezza, lingua);
  const sc = L.scenario;
  const seg = (id) => L.segmenti.find((x) => x.id === id);
  const narr = (id) => seg(id).narrazione.join(" ") + " " + (seg(id).prova || "");
  const base = { ...seg("strati").stato_animazione };
  const st = (d) => ({ ...base, ...d });
  const segnaposto = /\{\w+\}/;

  prova(`[${lingua}] pila_strati: segmenti validi, stesse chiavi, riassunto in 3 frasi senza prova`, () => {
    const chiavi = Object.keys(L.segmenti[0].stato_animazione).sort().join();
    for (const s of L.segmenti) {
      assert.equal(Object.keys(s.stato_animazione).sort().join(), chiavi, s.id);
      const r = ricostruisci(sc, s.stato_animazione);
      assert.equal(r.strati.length, righeDockerfile(sc, s.stato_animazione).length);
      assert.ok(esitoBuild(sc, s.stato_animazione).testo && !segnaposto.test(esitoBuild(sc, s.stato_animazione).testo), s.id);
      for (const c of s.concetti) assert.ok(["CO01", "CO02"].includes(c), `${s.id}: concetto ${c} fuori pillola`);
    }
    const ultimo = L.segmenti.at(-1);
    assert.equal(ultimo.id, "riassunto");
    assert.equal(ultimo.narrazione.length, 3);
    assert.ok(!ultimo.prova);
    for (const s of L.segmenti.slice(0, -1)) assert.ok(s.prova, `${s.id}: manca il Prova tu`);
    assert.ok(L.segmenti.length - 1 >= 4 && L.segmenti.length - 1 <= 6);
  });

  prova(`[${lingua}] pila_strati: i secondi citati nel testo sono quelli della ricostruzione`, () => {
    const codiceApp = ricostruisci(sc, st({ ordine: "codice_prima", modifica: "app_py" })).totale;
    const dipApp = ricostruisci(sc, st({ ordine: "dipendenze_prima", modifica: "app_py" })).totale;
    const dipReq = ricostruisci(sc, st({ ordine: "dipendenze_prima", modifica: "requirements" })).totale;
    const dipNulla = ricostruisci(sc, st({ ordine: "dipendenze_prima", modifica: "nessuna" })).totale;
    assert.equal(codiceApp, 41); assert.equal(dipApp, 1); assert.equal(dipReq, 42); assert.equal(dipNulla, 0);
    assert.ok(narr("strati").includes(`${codiceApp}`) && narr("strati").includes(` ${dipApp}`));
    for (const n of [dipApp, dipReq, dipNulla]) assert.ok(narr("ordine").includes(`${n}`), `il passo ordine non cita ${n}`);
    assert.ok(/illustrativ|illustration/i.test(sc.testi.nota_tempi));
    // le righe citate esistono davvero nello scenario
    const righe = sc.istruzioni.map((i) => i.riga).join("\n") + sc.basi.map((b) => b.riga).join("\n");
    for (const r of ["COPY . .", "RUN pip install", "FROM python:latest", "python:3.12-slim", "ENV GROQ_API_KEY="]) assert.ok(righe.includes(r), r);
  });

  prova(`[${lingua}] pila_strati: la cache si invalida a cascata dal primo strato toccato`, () => {
    for (const ordine of ["codice_prima", "dipendenze_prima"]) for (const m of sc.modifiche) for (const b of sc.basi) {
      const r = ricostruisci(sc, st({ ordine, modifica: m.id, base: b.id }));
      if (r.primo >= 0) r.strati.slice(r.primo).forEach((x) => assert.equal(x.stato, "rifatto", `${ordine}/${m.id}: ${x.id}`));
      r.strati.slice(0, Math.max(r.primo, 0)).forEach((x) => assert.equal(x.stato, r.primo < 0 ? "cache" : "cache"));
      assert.equal(r.totale, r.strati.reduce((a, x) => a + x.spesi, 0));
    }
    const prima = ricostruisci(sc, st({ modifica: "prima" }));
    assert.equal(prima.rifatti, prima.strati.length);
    assert.equal(ricostruisci(sc, st({ modifica: "nessuna" })).rifatti, 0);
    const pip = (s) => ricostruisci(sc, s).strati.find((x) => x.id === sc.strato_lento).stato;
    assert.equal(pip(st({ ordine: "codice_prima", modifica: "app_py" })), "rifatto");
    assert.equal(pip(st({ ordine: "dipendenze_prima", modifica: "app_py" })), "cache");
    assert.equal(pip(st({ ordine: "dipendenze_prima", modifica: "requirements" })), "rifatto");
    assert.ok(ricostruisci(sc, st({ ordine: "codice_prima", modifica: "app_py" })).lento_inutile);
    assert.ok(!ricostruisci(sc, st({ ordine: "codice_prima", modifica: "requirements" })).lento_inutile);
    // la causa del primo strato rifatto e' il file cambiato
    const r = ricostruisci(sc, st({ ordine: "dipendenze_prima", modifica: "requirements" }));
    assert.deepEqual(r.strati[r.primo].causa, { tipo: "file", file: "requirements.txt" });
  });

  prova(`[${lingua}] pila_strati: latest si sposta da sola, il tag fisso no`, () => {
    const latest = ricostruisci(sc, st({ base: "latest", modifica: "base_aggiornata" }));
    const fissa = ricostruisci(sc, st({ base: "fissa", modifica: "base_aggiornata" }));
    assert.equal(latest.rifatti, latest.strati.length);
    assert.equal(fissa.rifatti, 0);
    assert.equal(esitoBuild(sc, st({ base: "latest", modifica: "base_aggiornata" })).tipo, "avviso");
    assert.equal(esitoBuild(sc, st({ base: "fissa", modifica: "base_aggiornata" })).tipo, "ok");
    assert.equal(righeDockerfile(sc, st({ base: "latest" }))[0].riga, "FROM python:latest");
  });

  prova(`[${lingua}] pila_strati: ogni comando di build cambia l'esito o le trappole`, () => {
    const esiti = new Set(sc.modifiche.map((m) => esitoBuild(sc, st({ ordine: "codice_prima", modifica: m.id, base: "latest" })).testo));
    assert.ok(esiti.size >= 4, "le modifiche devono dare esiti diversi");
    assert.notEqual(esitoBuild(sc, st({ ordine: "codice_prima", modifica: "app_py" })).testo, esitoBuild(sc, st({ ordine: "dipendenze_prima", modifica: "app_py" })).testo);
    const t = (d) => Object.fromEntries(trappole(sc, st(d)).map((x) => [x.id, x.tipo]));
    assert.deepEqual(t({ base: "fissa", utente: "app", segreto: false }), { tag: "ok", utente: "ok", chiave: "ok" });
    assert.deepEqual(t({ base: "latest", utente: "root", segreto: true }), { tag: "avviso", utente: "avviso", chiave: "errore" });
    // la chiave compare in «docker history» solo se e' scritta in un ENV
    assert.ok(storia(sc, st({ segreto: true })).some((x) => x.pericolo && x.riga.includes("GROQ_API_KEY")));
    assert.ok(!storia(sc, st({ segreto: false })).some((x) => x.riga.includes("GROQ_API_KEY")));
    assert.equal(storia(sc, st({}))[0].riga, righeDockerfile(sc, st({})).at(-1).riga, "history parte dall'ultimo strato");
    // USER app compare solo con l'utente non root, e useradd viene prima delle copie (resta in cache)
    const righe = righeDockerfile(sc, st({ utente: "app", ordine: "dipendenze_prima" })).map((x) => x.id);
    assert.ok(righe.indexOf("useradd") < righe.indexOf("copy_req") && righe.indexOf("user") > righe.indexOf("copy_tutto"));
    assert.ok(!righeDockerfile(sc, st({ utente: "root" })).some((x) => x.id === "user"));
  });

  prova(`[${lingua}] pila_strati: container dalla stessa immagine, strato scrivibile che sparisce con rm`, () => {
    let c = [null, null, null];
    assert.ok(esitoContenitori(sc, c).testo);
    c = azioneContainer(sc, c, "run", 0).contenitori;
    c = azioneContainer(sc, c, "run", 1).contenitori;
    c = azioneContainer(sc, c, "scrivi", 0).contenitori;
    const r = azioneContainer(sc, c, "scrivi", 0);
    assert.deepEqual(r.contenitori, [2, 0, null]);
    const rm = azioneContainer(sc, r.contenitori, "rm", 0);
    assert.deepEqual(rm.contenitori, [null, 0, null]);
    assert.equal(rm.esito.tipo, "errore");
    assert.ok(rm.esito.testo.includes("2"));
    assert.throws(() => azioneContainer(sc, rm.contenitori, "scrivi", 0));
    assert.throws(() => azioneContainer(sc, rm.contenitori, "run", 1));
    assert.throws(() => azioneContainer(sc, rm.contenitori, "boh", 2));
    assert.throws(() => azioneContainer(sc, rm.contenitori, "run", 3));
  });

  prova(`[${lingua}] pila_strati: «trova il difetto» con perche' per ogni riga`, () => {
    const difetti = sc.difetto.righe.filter((r) => r.difetto).map((r) => r.id);
    assert.deepEqual(difetti, ["r1", "r3", "r5"]);
    const vuoto = verificaDifetto(sc, {});
    assert.equal(vuoto.trovati, 0);
    assert.equal(vuoto.righe.filter((r) => r.esito === "mancato").length, 3);
    const giusto = verificaDifetto(sc, Object.fromEntries(difetti.map((d) => [d, true])));
    assert.ok(giusto.perfetto);
    const falso = verificaDifetto(sc, { r1: true, r9: true });
    assert.equal(falso.falsi, 1);
    assert.equal(falso.righe.find((r) => r.id === "r9").esito, "falso");
    assert.ok(!falso.perfetto);
    for (const r of [...vuoto.righe, ...falso.righe, giusto]) assert.ok(!segnaposto.test(r.testo || r.sintesi));
    for (const r of sc.difetto.righe) assert.ok(r.spiega.length > 20, r.id);
  });

  prova(`[${lingua}] pila_strati: i testi della scena stanno nei loro riquadri (stima dei caratteri)`, () => {
    const E = sc.etichette, T = sc.testi;
    const maxStato = caratteriIn(210 - 16, 10, "testo"), maxCausa = caratteriIn(210 - 16, 9, "testo");
    for (const n of [0, 1, 15, 40]) for (const k of ["stato_cache", "stato_rifatto"]) assert.ok(riempi(T[k], { n }).length <= maxStato, k);
    for (const k of ["causa_pericolo", "causa_nessuna", "causa_prima", "causa_base", "causa_cascata", "in_attesa"]) assert.ok(E[k].length <= maxCausa, `${k}: ${E[k]}`);
    assert.ok(riempi(T.causa_file, { file: "requirements.txt" }).length <= maxCausa);
    for (const i of sc.istruzioni) assert.ok(i.riga.length <= caratteriIn(452 - 40, 10, "mono") && i.breve.length <= caratteriIn(220 - 16, 9, "mono"), i.id);
    for (const r of sc.difetto.righe) assert.ok(r.codice.length <= caratteriIn(672 - 168 - 44, 10.5, "mono"), r.id);
    const maxCt = caratteriIn(136 - 12, 10, "testo");
    assert.ok(aCapo(E.posto_libero, maxCt).length <= 4 && aCapo(E.strato_scrivibile, maxCt).length <= 2 && aCapo(E.immagine_condivisa, maxCt - 2).length <= 3);
    assert.ok(riempi(T.lead_n, { n: 99 }).length <= maxCt && E.in_esecuzione.length <= maxCt);
    for (const k of ["marca_trovato", "marca_mancato", "marca_falso", "marca_giusto", "marca_segnata"]) assert.ok(E[k].length <= caratteriIn(168, 10, "testo"));
    for (const k of ["titolo_build", "titolo_contenitori", "titolo_difetto"]) assert.ok(E[k].length * 11 * 0.68 < 720 - 24 - 110, k);
  });

  prova(`[${lingua}] pila_strati: nessun testo vuoto e nessun appello ad autorita'`, () => {
    const tutto = JSON.stringify(L);
    const vuote = [];
    const visita = (x, dove) => { if (typeof x === "string") { if (!x.trim()) vuote.push(dove); } else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) visita(v, `${dove}.${k}`); };
    visita(L, "lezione");
    assert.deepEqual(vuote, [], "stringhe vuote");
    assert.ok(!/(Google|OpenAI|Anthropic|Microsoft) (dice|propone|says)/i.test(tutto));
    assert.ok(!/come (gi[aà]|abbiamo) (spiegato|visto|detto)|as (already )?(explained|seen|mentioned)/i.test(tutto));
  });
}
