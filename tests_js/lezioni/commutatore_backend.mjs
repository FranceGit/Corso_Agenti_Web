// Prove della lezione PO5.1 "Il commutatore" (Officina O5, logica pura, entrambe le lingue).
import { scegliBackend, esegui, confronto, comando, uscitaTerminale, fasiTotali, puntiDaToccare, conteggio, verifica, scena, larghezzaTesto, impronta, listaPython, VIEWBOX } from "../../webapp/animazioni/commutatore_backend.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const grezza = leggi("commutatore_backend.json");
  const L = risolvi(grezza, lingua);
  const sc = L.scenario;
  const base = { ...L.segmenti[0].stato_animazione };
  const st = (d) => ({ ...base, ...d });
  const narr = (id) => L.segmenti.find((x) => x.id === id).narrazione.join(" ");
  const testi = (x) => (typeof x === "string" ? [x] : Array.isArray(x) ? x.flatMap(testi) : x && typeof x === "object" ? Object.values(x).flatMap(testi) : []);

  prova(`[${lingua}] commutatore_backend: segmenti validi, stesse chiavi di stato, riassunto in 3 frasi`, () => {
    const chiavi = Object.keys(base).sort().join();
    for (const seg of L.segmenti) {
      assert.equal(Object.keys(seg.stato_animazione).sort().join(), chiavi, seg.id);
      assert.ok(fasiTotali(sc, seg.stato_animazione) >= 1);
      assert.ok(scena(sc, seg.stato_animazione, 99).elementi.length > 5, seg.id);
      if (seg.id !== "riassunto") assert.ok(seg.prova && seg.prova.length > 10, `prova mancante in ${seg.id}`);
    }
    const ultimo = L.segmenti.at(-1);
    assert.equal(ultimo.id, "riassunto");
    assert.equal(ultimo.narrazione.length, 3);
    assert.ok(!ultimo.prova);
    assert.ok(L.segmenti.length >= 5 && L.segmenti.length <= 7);
  });

  prova(`[${lingua}] commutatore_backend: nessun testo vuoto, nessun segnaposto non risolto nei testi mostrati`, () => {
    for (const t of testi(L)) assert.ok(t.trim().length > 0 || t === "", "testo vuoto");
    for (const seg of L.segmenti) for (const p of [...seg.narrazione, seg.prova || ""]) assert.ok(!/\{\w+\}/.test(p), p);
    const stati = [st({}), st({ variabile: "openai" }), st({ variabile: "groq", chiave: false }), st({ variabile: "groq", rete: false }), st({ variabile: "ollama", ollama_acceso: false }), st({ domanda: "lead" })];
    for (const s of stati) {
      for (const g of [1, 2]) {
        const r = esegui(sc, s, g);
        assert.ok(r.testo && !/\{\w+\}|undefined|NaN/.test(r.testo), r.testo);
      }
      for (const x of scena(sc, s, 99).elementi) if (x.t === "text") assert.ok(!/\{\w+\}|undefined|NaN/.test(x.testo), x.testo);
    }
  });

  prova(`[${lingua}] commutatore_backend: i numeri e i nomi citati coincidono con la configurazione vera`, () => {
    const C = sc.config;
    assert.deepEqual(C.ammessi, ["finto", "ollama", "groq"]);
    assert.equal(C.limiti_groq.richieste_al_minuto, 30);
    assert.equal(C.limiti_groq.token_al_minuto, 6000);
    assert.ok(narr("tre_motori").includes(String(C.limiti_groq.richieste_al_minuto)) && narr("tre_motori").includes(String(C.limiti_groq.token_al_minuto)));
    assert.ok(narr("configurazione").includes(String(C.max_token)) && narr("configurazione").includes(String(C.temperatura)));
    const b = Object.fromEntries(sc.backend.map((x) => [x.id, x]));
    assert.equal(b.ollama.modello, "qwen2.5:3b");
    assert.equal(b.groq.modello, "llama-3.1-8b-instant");
    assert.ok(narr("tre_motori").includes(b.ollama.modello) && narr("tre_motori").includes(b.groq.modello));
    assert.ok(narr("tre_motori").includes(C.url_ollama.replace("http://", "")));
    assert.equal(listaPython(C.ammessi), "['finto', 'ollama', 'groq']");
  });

  prova(`[${lingua}] commutatore_backend: la variabile vince sul file, un valore fuori elenco ferma tutto`, () => {
    assert.deepEqual(scegliBackend(sc, st({ file_backend: "ollama" })), { backend: "ollama", origine: "file", errore: null });
    assert.equal(scegliBackend(sc, st({ file_backend: "finto", variabile: "groq" })).backend, "groq");
    const no = scegliBackend(sc, st({ variabile: "openai" }));
    assert.equal(no.backend, null);
    assert.ok(no.errore.includes("ASSISTENTE_BACKEND='openai'") && no.errore.includes("['finto', 'ollama', 'groq']"));
    const r = esegui(sc, st({ variabile: "openai" }));
    assert.equal(r.fermo, "commutatore");
    assert.equal(r.uscita, 2);
    assert.ok(uscitaTerminale(r).startsWith("ERRORE: "));
    assert.equal(fasiTotali(sc, st({ variabile: "openai" })), 2);
    assert.ok(comando(sc, st({ variabile: "groq" })).startsWith("$ ASSISTENTE_BACKEND=groq python -m assistente"));
    assert.ok(comando(sc, st({})).startsWith("$ python -m assistente"));
  });

  prova(`[${lingua}] commutatore_backend: il finto e' ripetibile, i modelli veri no; errori parlanti per ogni condizione`, () => {
    for (const d of sc.domande) assert.ok(confronto(sc, st({ domanda: d.id })).uguali, `finto ${d.id}`);
    for (const b of ["ollama", "groq"]) for (const d of sc.domande) assert.ok(!confronto(sc, st({ variabile: b, domanda: d.id })).uguali, `${b} ${d.id}`);
    const eco = esegui(sc, st({ domanda: "lead" }));
    assert.match(eco.testo, /[0-9a-f]{8}/);
    assert.equal(eco.testo, esegui(sc, st({ domanda: "lead" })).testo);
    assert.equal(impronta("abc"), impronta("abc"));
    assert.notEqual(impronta("abc"), impronta("abd"));
    const senzaChiave = esegui(sc, st({ variabile: "groq", chiave: false }));
    assert.equal(senzaChiave.fermo, "commutatore");
    assert.ok(senzaChiave.testo.includes("GROQ_API_KEY") && senzaChiave.testo.includes("ASSISTENTE_BACKEND=finto"));
    const spento = esegui(sc, st({ variabile: "ollama", ollama_acceso: false }));
    assert.equal(spento.fermo, "backend");
    assert.ok(spento.testo.includes("ollama serve") && spento.testo.includes("qwen2.5:3b"));
    assert.equal(esegui(sc, st({ variabile: "ollama", rete: false })).ok, true, "Ollama e' locale: la rete non serve");
    assert.equal(esegui(sc, st({ variabile: "groq", rete: false })).fermo, "backend");
    assert.equal(esegui(sc, st({ file_backend: "finto", chiave: false, rete: false, ollama_acceso: false })).ok, true, "il finto non dipende da niente");
  });

  prova(`[${lingua}] commutatore_backend: dettagli sparsi moltiplicano i punti, l'interfaccia unica non tocca i chiamanti`, () => {
    for (const m of sc.modifiche) {
      const i = conteggio(sc, "interfaccia", m.id), s = conteggio(sc, "sparso", m.id);
      assert.equal(i.chiamanti, 0, m.id);
      assert.equal(s.chiamanti, sc.chiamanti.length, m.id);
      assert.ok(s.punti > i.punti, m.id);
      assert.equal(fasiTotali(sc, st({ vista: "sparso", stile: "sparso", modifica: m.id })), s.punti + 1);
    }
    assert.equal(conteggio(sc, "interfaccia", "cambia_modello").punti, 1);
    assert.equal(conteggio(sc, "interfaccia", "nuovo_backend").punti, 2);
    assert.equal(puntiDaToccare(sc, "interfaccia", "test_offline").length, 0);
    assert.ok(narr("dettagli_sparsi").includes("uno o due") || narr("dettagli_sparsi").includes("one or two"));
    // la scena cambia con lo stile e con la modifica
    const a = JSON.stringify(scena(sc, st({ vista: "sparso", stile: "sparso" }), 99));
    assert.notEqual(a, JSON.stringify(scena(sc, st({ vista: "sparso", stile: "interfaccia" }), 99)));
    assert.notEqual(a, JSON.stringify(scena(sc, st({ vista: "sparso", stile: "sparso", modifica: "nuovo_backend" }), 99)));
  });

  prova(`[${lingua}] commutatore_backend: ogni comando cambia la scena`, () => {
    const s0 = st({});
    const sig = (s, f = 99) => JSON.stringify(scena(sc, s, f));
    const diff = [{ file_backend: "ollama" }, { variabile: "groq" }, { variabile: "openai" }, { domanda: "lead" }, { vista: "sparso" }, { vista: "decidi" }];
    for (const d of diff) assert.notEqual(sig({ ...s0, ...d }), sig(s0), JSON.stringify(d));
    assert.notEqual(sig({ ...s0, variabile: "ollama", ollama_acceso: false }), sig({ ...s0, variabile: "ollama" }));
    assert.notEqual(sig({ ...s0, variabile: "groq", chiave: false }), sig({ ...s0, variabile: "groq" }));
    assert.notEqual(sig({ ...s0, variabile: "groq", rete: false }), sig({ ...s0, variabile: "groq" }));
    assert.notEqual(sig(s0, 0), sig(s0, 3), "la sequenza muove la richiesta");
    assert.notEqual(sig({ ...s0, vista: "decidi", scelte: { prova_groq: "backend" } }), sig({ ...s0, vista: "decidi" }));
  });

  prova(`[${lingua}] commutatore_backend: Decidi tu, risposte e perché`, () => {
    const tutte = Object.fromEntries(sc.casi.map((c) => [c.id, c.giusta]));
    const v = verifica(sc, st({ vista: "decidi", scelte: tutte }));
    assert.equal(v.giuste, sc.casi.length);
    const vuota = verifica(sc, st({ vista: "decidi", scelte: {} }));
    assert.equal(vuota.giuste, 0);
    assert.ok(vuota.righe.every((r) => r.esito === "vuoto"));
    const tuttoConfig = verifica(sc, st({ vista: "decidi", scelte: Object.fromEntries(sc.casi.map((c) => [c.id, "configurazione"])) }));
    assert.ok(tuttoConfig.giuste > 0 && tuttoConfig.giuste < sc.casi.length, "rispondere sempre «configurazione» non basta");
    assert.ok(new Set(sc.casi.map((c) => c.giusta)).size === sc.risposte_gioco.length, "ogni risposta del gioco serve almeno una volta");
    for (const r of v.righe) assert.ok(!/\{\w+\}/.test(r.testo));
  });

  prova(`[${lingua}] commutatore_backend: i testi della scena stanno nei loro riquadri e nella tavola`, () => {
    const stati = [st({}), st({ variabile: "openai" }), st({ variabile: "groq", chiave: false }), st({ variabile: "ollama", ollama_acceso: false }),
      ...sc.modifiche.flatMap((m) => ["interfaccia", "sparso"].map((stile) => st({ vista: "sparso", stile, modifica: m.id }))),
      st({ vista: "decidi", scelte: Object.fromEntries(sc.casi.map((c) => [c.id, "chiamante"])), verificato: true })];
    for (const s of stati) {
      for (let f = 0; f <= 5; f++) {
        for (const x of scena(sc, s, f).elementi.filter((e) => e.t === "text")) {
          const w = larghezzaTesto(x.testo, x.px, x.peso, x.mono);
          const [a, b] = x.anchor === "middle" ? [x.x - w / 2, x.x + w / 2] : x.anchor === "end" ? [x.x - w, x.x] : [x.x, x.x + w];
          assert.ok(x.box, `testo senza riquadro: ${x.testo}`);
          assert.ok(a >= x.box[0] - 0.5 && b <= x.box[1] + 0.5, `«${x.testo}» esce dal riquadro (${a.toFixed(0)}-${b.toFixed(0)} fuori da ${x.box})`);
          assert.ok(b <= VIEWBOX.w && x.y <= VIEWBOX.h, `«${x.testo}» fuori dalla tavola`);
        }
      }
    }
  });
}
