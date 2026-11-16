// Prove della lezione PO4.1 "Tre prese, tre strumenti" (logica pura, entrambe le lingue).
import { strumentiOfferti, strumentiVisti, configurazione, righeConfig, instrada, verifica, percorsoGettone, aCapo } from "../../webapp/animazioni/tre_prese.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("tre_prese.json"), lingua);
  const sc = L.scenario;
  const base = { ...L.segmenti[0].stato_animazione };
  const st = (d) => ({ ...base, ...d, collegati: { ...base.collegati, ...((d && d.collegati) || {}) } });
  const narr = (id) => L.segmenti.find((x) => x.id === id).narrazione.join(" ");
  const tutto = (x) => JSON.stringify(x);

  prova(`[${lingua}] tre_prese: segmenti validi, stesse chiavi, riassunto in 3 frasi senza prova`, () => {
    const chiavi = Object.keys(base).sort().join();
    for (const seg of L.segmenti) {
      assert.equal(Object.keys(seg.stato_animazione).sort().join(), chiavi, seg.id);
      assert.ok(instrada(sc, seg.stato_animazione, seg.stato_animazione.richiesta).testo);
      if (seg.id !== "riassunto") assert.ok(seg.prova, `${seg.id}: manca la prova`);
    }
    const r = L.segmenti.at(-1);
    assert.equal(r.id, "riassunto");
    assert.equal(r.narrazione.length, 3);
    assert.ok(!r.prova);
    assert.ok(L.segmenti.length - 1 >= 4 && L.segmenti.length - 1 <= 6);
  });

  prova(`[${lingua}] tre_prese: i numeri del testo coincidono con i dati (15 + 1 + 9 = 25, 9 in sola lettura, 5000 caratteri)`, () => {
    const n = (id) => sc.server.find((x) => x.id === id).strumenti.length;
    assert.equal(n("filesystem"), 15);
    assert.equal(n("fetch"), 1);
    assert.equal(n("memory"), 9);
    assert.ok(narr("prese").includes("15") && narr("prese").includes("9"));
    assert.equal(strumentiVisti(sc, st({})), 25);
    assert.equal(strumentiVisti(sc, st({ collegati: { fetch: false } })), 24);
    assert.ok(L.segmenti[0].prova.includes("25") && L.segmenti[0].prova.includes("24"));
    assert.equal(strumentiOfferti(sc, st({ sola_lettura: true }), "filesystem").length, 9);
    assert.ok(narr("filesystem").includes("9"));
    assert.equal(sc.max_length_fetch, 5000);
    assert.ok(narr("fetch").includes(String(sc.max_length_fetch)));
    assert.ok(narr("filesystem").includes(sc.cartella_lavoro));
  });

  prova(`[${lingua}] tre_prese: la configurazione si compone dalle prese e dalle opzioni`, () => {
    const c = configurazione(sc, st({}))[sc.chiave_config];
    assert.deepEqual(Object.keys(c), ["filesystem", "fetch", "memory"]);
    assert.equal(c.filesystem.command, "npx");
    assert.equal(c.fetch.command, "uvx");
    assert.deepEqual(c.fetch.args, ["mcp-server-fetch"]);
    assert.equal(c.filesystem.args.at(-1), sc.cartella_lavoro);
    assert.ok(!c.filesystem.args.includes("--read-only"));
    assert.equal(c.memory.env.MEMORY_FILE_PATH, sc.file_memoria);
    assert.ok(sc.file_memoria.startsWith("/") && sc.file_memoria.endsWith(".jsonl") && !sc.file_memoria.includes("node_modules"));
    const ro = configurazione(sc, st({ sola_lettura: true, memoria_file: false, collegati: { fetch: false } }))[sc.chiave_config];
    assert.ok(ro.filesystem.args.includes("--read-only"));
    assert.ok(!("fetch" in ro));
    assert.ok(!("env" in ro.memory));
    const vuota = righeConfig(sc, st({ collegati: { filesystem: false, fetch: false, memory: false } }));
    assert.equal(vuota.length, 3);
    // le righe sono JSON valido e coincidono con l'oggetto
    for (const s of [st({}), st({ sola_lettura: true, memoria_file: false }), st({ collegati: { memory: false } })]) {
      assert.deepEqual(JSON.parse(righeConfig(sc, s).map((r) => r.testo).join("\n")), configurazione(sc, s));
    }
  });

  prova(`[${lingua}] tre_prese: ogni comando cambia l'esito atteso della richiesta`, () => {
    assert.equal(instrada(sc, st({}), "listino").tipo, "ok");
    assert.equal(instrada(sc, st({}), "listino").strumento, "read_text_file");
    assert.equal(instrada(sc, st({}), "riepilogo").tipo, "ok");
    assert.equal(instrada(sc, st({ sola_lettura: true }), "riepilogo").tipo, "sconosciuto");
    assert.equal(instrada(sc, st({ sola_lettura: true }), "listino").tipo, "ok", "leggere resta possibile");
    assert.equal(instrada(sc, st({}), "pagina").strumento, "fetch");
    assert.equal(instrada(sc, st({ collegati: { fetch: false } }), "pagina").tipo, "scollegato");
    assert.equal(instrada(sc, st({}), "ricorda").strumento, "create_entities");
    assert.equal(instrada(sc, st({ memoria_file: false }), "ricorda").tipo, "avviso_memoria");
    assert.equal(instrada(sc, st({ memoria_file: false }), "ricorda").classe, "avviso");
    assert.equal(instrada(sc, st({}), "chi").strumento, "search_nodes");
    assert.equal(instrada(sc, st({ collegati: { memory: false } }), "chi").tipo, "scollegato");
    for (const s of [st({}), st({ collegati: { filesystem: false, fetch: false, memory: false } })]) assert.equal(instrada(sc, s, "mail").tipo, "nessuno");
    // ogni strumento chiamato esiste davvero nel suo server
    for (const r of sc.richieste.filter((x) => x.server)) assert.ok(sc.server.find((x) => x.id === r.server).strumenti.some((t) => t.nome === r.strumento), r.id);
  });

  prova(`[${lingua}] tre_prese: il gettone si ferma dove la richiesta si ferma`, () => {
    const ok = percorsoGettone(sc, st({}), "listino");
    assert.deepEqual(ok[3], ok[0], "con esito ok torna al client");
    const via = percorsoGettone(sc, st({ collegati: { fetch: false } }), "pagina");
    assert.deepEqual(via[1], via[3], "presa vuota: resta alla presa");
    const nessuno = percorsoGettone(sc, st({}), "mail");
    assert.ok(nessuno.every((p) => p.x < 216), "nessuna presa: non esce dal client");
    for (const r of sc.richieste) for (const p of percorsoGettone(sc, st({}), r.id)) assert.ok(p.x >= 0 && p.x <= 720 && p.y >= 0 && p.y <= 400);
  });

  prova(`[${lingua}] tre_prese: Decidi tu, risposte coerenti con i server e riscontro completo`, () => {
    const ids = sc.risposte_gioco.map((r) => r.id);
    for (const c of sc.casi) {
      assert.ok(ids.includes(c.migliore), c.id);
      for (const q of c.quasi) assert.ok(ids.includes(q) && q !== c.migliore, c.id);
    }
    const nomeStrumento = (id) => { const r = sc.risposte_gioco.find((x) => x.id === id); return typeof r.nome === "string" ? r.nome.split(" · ") : null; };
    for (const r of sc.risposte_gioco) {
      const p = nomeStrumento(r.id);
      if (p && p.length === 2) assert.ok(sc.server.find((x) => x.id === p[0]).strumenti.some((t) => t.nome === p[1]), r.id);
    }
    const tutte = Object.fromEntries(sc.casi.map((c) => [c.id, c.migliore]));
    assert.equal(verifica(sc, st({ scelte: tutte })).giuste, sc.casi.length);
    const v0 = verifica(sc, st({ scelte: {} }));
    assert.equal(v0.giuste, 0);
    assert.ok(v0.righe.every((r) => r.esito === "vuoto"));
    const quasi = verifica(sc, st({ scelte: { k1: "fs_tree", k5: "fs_read" } }));
    assert.equal(quasi.righe[0].esito, "quasi");
    assert.equal(quasi.righe[4].esito, "sbagliato");
  });

  prova(`[${lingua}] tre_prese: nessun segnaposto aperto, nessun testo vuoto, testi della scena dentro i riquadri`, () => {
    const testi = [];
    const raccogli = (x) => { if (typeof x === "string") testi.push(x); else if (Array.isArray(x)) x.forEach(raccogli); else if (x && typeof x === "object") Object.values(x).forEach(raccogli); };
    raccogli(L.segmenti);
    raccogli(sc.etichette);
    raccogli(sc.casi);
    for (const t of testi) { assert.ok(t.trim().length > 0); assert.ok(!/\{\w+\}/.test(t), `segnaposto in «${t}»`); }
    for (const seg of L.segmenti) for (const r of sc.richieste) {
      const e = instrada(sc, { ...seg.stato_animazione, sola_lettura: true, memoria_file: false }, r.id);
      for (const t of [e.testo, e.breve]) assert.ok(t && !/\{\w+\}|undefined|NaN/.test(t), t);
    }
    // richieste nel fumetto del client: al massimo 4 righe da 26 caratteri; etichette brevi in 2 righe da 24
    for (const r of sc.richieste) {
      assert.ok(aCapo(r.testo, 26).length <= 4, r.testo);
      assert.ok(aCapo(r.testo, 26).every((x) => x.length <= 26), r.testo);
    }
    for (const k of Object.keys(sc.testi).filter((x) => x.startsWith("breve_"))) {
      const t = sc.testi[k].replace("{strumento}", "list_allowed_directories");
      assert.ok(aCapo(t, 24).length <= 2, t);
    }
    for (const c of sc.casi) assert.ok(aCapo(c.testo, 100).length <= 2, c.testo);
    // nomi degli strumenti in vetrina: stanno nel loro gettone (monospace 8,5 px, circa 5,1 px a carattere, gettone 136 px)
    for (const srv of sc.server) for (const n of srv.vetrina) { assert.ok(n.length * 5.1 + 12 <= 136, n); assert.ok(srv.strumenti.some((t) => t.nome === n)); }
  });
}
