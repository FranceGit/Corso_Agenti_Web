// Prove della lezione PO5.2 "Il silenzio che costa" (Officina O5, logica pura, entrambe le lingue).
import { chiave, campagna, assistente, repoAdottato, leadDopoLimiti, passiTotali, verifica, scena, larghezzaTesto, numero, VIEWBOX } from "../../webapp/animazioni/silenzio_costoso.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("silenzio_costoso.json"), lingua);
  const sc = L.scenario;
  const base = { ...L.segmenti[0].stato_animazione };
  const st = (d) => ({ ...base, ...d });
  const narr = (id) => L.segmenti.find((x) => x.id === id).narrazione.join(" ");
  const pulito = (t) => !/\{\w+\}|undefined|NaN/.test(t);

  prova(`[${lingua}] silenzio_costoso: segmenti validi, stesse chiavi di stato, riassunto in 3 frasi`, () => {
    const chiavi = Object.keys(base).sort().join();
    for (const seg of L.segmenti) {
      assert.equal(Object.keys(seg.stato_animazione).sort().join(), chiavi, seg.id);
      assert.ok(scena(sc, seg.stato_animazione, 99).elementi.length > 5, seg.id);
      if (seg.id !== "riassunto") assert.ok(seg.prova && seg.prova.length > 10, seg.id);
      for (const p of [...seg.narrazione, seg.prova || ""]) assert.ok(pulito(p), p);
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
    assert.ok(!L.segmenti.at(-1).prova);
    assert.deepEqual({ pausa: base.pausa, durata: base.durata, token_chiamata: base.token_chiamata }, sc.riferimento);
  });

  prova(`[${lingua}] silenzio_costoso: i numeri del testo coincidono con i dati e con il materiale`, () => {
    assert.equal(sc.limiti.richieste_al_minuto, 30);
    assert.equal(sc.limiti.token_al_minuto, 6000);
    assert.equal(sc.limiti.pausa_repo, 6);
    assert.equal(sc.chiamate.length, 4);
    assert.equal(sc.lead.length, 5);
    const t = narr("limiti");
    for (const n of ["30", "6000", "4", "6", "600"]) assert.ok(t.includes(n), n);
    assert.ok(narr("campagna_falsa").includes("50") && narr("campagna_falsa").includes(String(sc.lead.length)));
    assert.ok(sc.valori.api.includes(`"leads_processed": ${sc.lead.length}`));
    // «all'undicesima chiamata, sul terzo lead»: dal calcolo
    const c = campagna(sc, st({}));
    assert.equal(c.primo.n, 11);
    assert.equal(c.primo.lead, 2);
    assert.equal(c.primo.motivo, "token");
  });

  prova(`[${lingua}] silenzio_costoso: dove vive la chiave`, () => {
    assert.equal(chiave(sc, st({ dove: "codice" })).esito, "male");
    assert.equal(chiave(sc, st({ dove: "env_committato" })).esito, "male");
    assert.equal(chiave(sc, st({ dove: "variabile" })).esito, "ok");
    assert.equal(chiave(sc, st({ dove: "segreto" })).esito, "ok");
    assert.ok(chiave(sc, st({ dove: "codice" })).controllo.includes("'groq.api_key'"), "messaggio del validatore vero");
    for (const d of sc.dove) assert.equal(passiTotali(sc, st({ vista: "chiave", dove: d.id })), d.chi_vede.length);
    // segnaposto, mai una chiave che sembri vera
    const tutto = JSON.stringify(L);
    assert.ok(!/gsk_[A-Za-z0-9]{8,}|sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}/.test(tutto));
    assert.ok(tutto.includes("<LA_TUA_CHIAVE>"));
  });

  prova(`[${lingua}] silenzio_costoso: errori parlanti dell'assistente, uno per guasto`, () => {
    assert.equal(assistente(sc, st({ guasto: "nessuno" })).ok, true);
    const testi = new Set();
    for (const g of sc.guasti.filter((x) => x.id !== "nessuno")) {
      const a = assistente(sc, st({ guasto: g.id }));
      assert.equal(a.ok, false);
      assert.equal(a.uscita, 2);
      assert.ok(a.testo.startsWith("ERRORE: ") && pulito(a.testo), a.testo);
      testi.add(a.testo);
    }
    assert.equal(testi.size, sc.guasti.length - 1, "ogni guasto ha il suo messaggio");
    assert.equal(assistente(sc, st({ guasto: "chiave_mancante" })).fermo, "creazione");
    assert.ok(assistente(sc, st({ guasto: "chiave_scaduta" })).testo.includes("401"));
    assert.ok(assistente(sc, st({ guasto: "limite" })).testo.includes("37"), "retry-after dal primo 429 della campagna");
    assert.ok(assistente(sc, st({ guasto: "limite", token_chiamata: 300 })).testo.includes(String(sc.config.retry_after_esempio)));
    assert.ok(assistente(sc, st({ guasto: "modello" })).testo.includes(sc.config.modello_sbagliato));
  });

  prova(`[${lingua}] silenzio_costoso: il ripiego silenzioso fa «riuscire» una campagna falsa`, () => {
    const ok = repoAdottato(sc, st({ guasto: "nessuno" }));
    assert.equal(ok.tipo, "ok");
    assert.equal(ok.email_vuote, 0);
    assert.equal(repoAdottato(sc, st({ guasto: "chiave_mancante" })).tipo, "non_parte");
    for (const g of ["chiave_scaduta", "limite", "modello", "rete"]) {
      const r = repoAdottato(sc, st({ guasto: g }));
      assert.equal(r.tipo, "silenzio", g);
      assert.equal(r.elaborati, sc.lead.length);
      assert.equal(r.email_vuote, sc.lead.length);
      assert.equal(r.punteggi_50, sc.lead.length);
      assert.ok(r.lead.every((l) => l.punteggio.startsWith("50") && l.persona === "Unknown"));
    }
  });

  prova(`[${lingua}] silenzio_costoso: limiti del piano gratuito, dove spariscono i 429`, () => {
    const c = campagna(sc, st({}));
    assert.equal(c.chiamate.length, sc.lead.length * sc.chiamate.length);
    assert.equal(c.primo.t, 23);
    assert.equal(c.primo.attesa, 37);
    assert.equal(c.rifiutate, 10);
    assert.ok(c.picco.r <= sc.limiti.richieste_al_minuto, "con la pausa di 6 s non e' il limite di richieste a scattare");
    assert.ok(c.picco.tok > sc.limiti.token_al_minuto);
    assert.equal(campagna(sc, st({ token_chiamata: 300 })).primo, null, "300 token per chiamata: nessun 429");
    assert.equal(campagna(sc, st({ pausa: 24 })).primo, null, "pausa di 24 s: nessun 429");
    assert.ok(campagna(sc, st({ pausa: 20 })).primo, "pausa di 20 s non basta");
    assert.equal(campagna(sc, st({ pausa: 0, token_chiamata: 100 })).primo, null, "20 chiamate in tutto: il limite di 30 richieste non scatta mai");
    const ld = leadDopoLimiti(sc, st({}));
    assert.deepEqual(ld[2].rotte, ["email", "risposta"]);
    assert.equal(ld[0].rotte.length, 0);
    assert.ok(ld[3].punteggio.startsWith("50") && ld[4].email === sc.valori.email_ripiego);
    assert.equal(numero(sc, 22.5), lingua === "it" ? "22,5" : "22.5");
  });

  prova(`[${lingua}] silenzio_costoso: ogni comando cambia la scena`, () => {
    const sig = (s, p = 99) => JSON.stringify(scena(sc, s, p));
    for (const d of sc.dove.slice(1)) assert.notEqual(sig(st({ dove: d.id })), sig(st({})), d.id);
    const g0 = st({ vista: "guasti", guasto: "nessuno" });
    for (const g of sc.guasti.slice(1)) assert.notEqual(sig({ ...g0, guasto: g.id }), sig(g0), g.id);
    const l0 = st({ vista: "limiti" });
    for (const d of [{ pausa: 7 }, { durata: 1 }, { token_chiamata: 700 }]) assert.notEqual(sig({ ...l0, ...d }), sig(l0), JSON.stringify(d));
    assert.notEqual(sig(l0, 3), sig(l0, 99), "la sequenza aggiunge le chiamate");
    assert.notEqual(sig(g0, 0), sig(g0, 99), "la sequenza aggiunge i lead");
    const dec = st({ vista: "decidi" });
    assert.notEqual(sig({ ...dec, scelte: { api_key_file: "va_bene" } }), sig(dec));
    for (const v of ["chiave", "guasti", "limiti", "decidi"]) assert.ok(pulito(sig(st({ vista: v }))));
  });

  prova(`[${lingua}] silenzio_costoso: Trova il difetto`, () => {
    const giuste = Object.fromEntries(sc.casi.map((c) => [c.id, c.giusta]));
    assert.equal(verifica(sc, st({ scelte: giuste })).giuste, sc.casi.length);
    assert.equal(verifica(sc, st({ scelte: {} })).giuste, 0);
    for (const r of sc.risposte_gioco) {
      const v = verifica(sc, st({ scelte: Object.fromEntries(sc.casi.map((c) => [c.id, r.id])) }));
      assert.ok(v.giuste === 2, `rispondere sempre «${r.id}» ne indovina solo 2`);
    }
  });

  prova(`[${lingua}] silenzio_costoso: i testi della scena stanno nei loro riquadri`, () => {
    const stati = [
      ...sc.dove.map((d) => st({ dove: d.id })),
      ...sc.guasti.map((g) => st({ vista: "guasti", guasto: g.id })),
      st({ vista: "limiti" }), st({ vista: "limiti", pausa: 30, durata: 4, token_chiamata: 1500 }), st({ vista: "limiti", pausa: 0, durata: 0.5, token_chiamata: 100 }), st({ vista: "limiti", token_chiamata: 300 }),
      st({ vista: "decidi", scelte: Object.fromEntries(sc.casi.map((c) => [c.id, "chiave_esposta"])), verificato: true }),
    ];
    for (const s of stati) {
      for (const p of [0, 1, 3, 99]) {
        for (const x of scena(sc, s, p).elementi.filter((e) => e.t === "text")) {
          const w = larghezzaTesto(x.testo, x.px, x.peso, x.mono);
          const [a, b] = x.anchor === "middle" ? [x.x - w / 2, x.x + w / 2] : x.anchor === "end" ? [x.x - w, x.x] : [x.x, x.x + w];
          assert.ok(x.box, `testo senza riquadro: ${x.testo}`);
          assert.ok(a >= x.box[0] - 0.5 && b <= x.box[1] + 0.5, `«${x.testo}» esce dal riquadro (${a.toFixed(0)}-${b.toFixed(0)} fuori da ${x.box}) in ${s.vista}`);
          assert.ok(b <= VIEWBOX.w && x.y <= VIEWBOX.h - 4, `«${x.testo}» fuori dalla tavola (y ${x.y})`);
        }
      }
    }
  });
}
