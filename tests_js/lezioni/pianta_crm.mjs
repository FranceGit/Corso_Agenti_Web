// Prove della lezione PO3.1 "Il CRM in pianta" (logica pura, entrambe le lingue).
import { valutaIpotesi, percorso, verifica, posizioniStanze, posizioniModuli, aCapo, riempi, DIMENSIONI } from "../../webapp/animazioni/pianta_crm.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("pianta_crm.json"), lingua);
  const sc = L.scenario;
  const ids = (xs) => xs.map((x) => x.id);
  const narr = (id) => L.segmenti.find((x) => x.id === id).narrazione.join(" ");
  const testi = [];
  const raccogli = (x) => { if (typeof x === "string") testi.push(x); else if (Array.isArray(x)) x.forEach(raccogli); else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) if (k !== "stato_animazione") raccogli(v); };
  raccogli(L);

  prova(`[${lingua}] pianta_crm: segmenti validi, stesse chiavi di stato, riassunto in 3 frasi senza prova`, () => {
    const chiavi = Object.keys(L.segmenti[0].stato_animazione).sort().join();
    for (const seg of L.segmenti) {
      assert.equal(Object.keys(seg.stato_animazione).sort().join(), chiavi, seg.id);
      const st = seg.stato_animazione;
      if (st.domanda) assert.ok(sc.domande.some((d) => d.id === st.domanda), seg.id);
      if (st.ipotesi) assert.ok(sc.stanze.some((x) => x.id === st.ipotesi), seg.id);
      assert.ok(sc.moduli.some((m) => m.id === st.modulo_aperto), seg.id);
      assert.deepEqual(seg.concetti, ["CO08"]);
      if (seg.id !== "riassunto") assert.ok(seg.prova && seg.prova.length > 10, `${seg.id}: manca «Prova tu»`);
    }
    const ultimo = L.segmenti.at(-1);
    assert.equal(ultimo.id, "riassunto");
    assert.equal(ultimo.narrazione.length, 3);
    assert.ok(!ultimo.prova);
    assert.ok(L.segmenti.length - 1 >= 4 && L.segmenti.length - 1 <= 6);
  });

  prova(`[${lingua}] pianta_crm: nessuna stringa vuota, nessun segnaposto o undefined nei testi`, () => {
    for (const x of testi) {
      assert.ok(x.trim().length > 0, "stringa vuota");
      assert.ok(!/undefined|NaN/.test(x), x);
    }
    for (const x of [...L.segmenti.flatMap((s) => [...s.narrazione, s.prova || ""]), ...Object.values(sc.etichette)]) assert.ok(!/\{\w+\}/.test(x), `segnaposto nel testo: ${x}`);
  });

  prova(`[${lingua}] pianta_crm: i numeri del testo coincidono con i dati dello scenario`, () => {
    assert.ok(narr("pianta").includes("980"));
    assert.ok(narr("moduli").includes("12"));
    const dashboard = sc.moduli.find((m) => m.id === "dashboard");
    assert.equal(dashboard.entita.length, 0, "Dashboard non possiede entita'");
    assert.equal(dashboard.legge.length, 5);
    assert.ok(/cinque|five/.test(narr("moduli")));
    assert.ok(narr("decisioni").includes("39"));
    assert.ok(sc.stanze.find((x) => x.id === "adr").contiene.includes("39"));
    assert.ok(sc.stanze.find((x) => x.id === "schemi").contiene.includes("182"));
    assert.ok(sc.stanze.find((x) => x.id === "bp_contesto").contiene.includes("12"));
    assert.equal(sc.frasi.length, 8);
    assert.ok(/Otto|Eight/.test(narr("classifica")));
    for (const m of sc.moduli) for (const id of m.legge) assert.ok(sc.moduli.some((x) => x.id === id), `${m.id} legge da ${id}`);
  });

  prova(`[${lingua}] pianta_crm: ogni domanda ha una risposta, vicine distinte e un percorso che finisce sulla risposta`, () => {
    const stanze = new Set(ids(sc.stanze));
    for (const d of sc.domande) {
      assert.ok(stanze.has(d.risposta), d.id);
      assert.ok(!d.vicine.includes(d.risposta), d.id);
      for (const v of d.vicine) assert.ok(stanze.has(v), `${d.id}: ${v}`);
      const tp = percorso(sc, d.id);
      assert.ok(tp.length >= 2, `${d.id}: percorso troppo corto`);
      assert.equal(tp.at(-1).stanza, d.risposta, d.id);
      for (const x of tp) assert.ok(stanze.has(x.stanza) && x.nota, d.id);
    }
    assert.deepEqual(percorso(sc, ""), []);
  });

  prova(`[${lingua}] pianta_crm: la stanza cliccata cambia l'esito (giusta, vicina, lontana, libera)`, () => {
    assert.equal(valutaIpotesi(sc, "broker", "sicurezza"), "giusta");
    assert.equal(valutaIpotesi(sc, "broker", "adr"), "vicina");
    assert.equal(valutaIpotesi(sc, "broker", "bp_autorizzazione"), "vicina");
    assert.equal(valutaIpotesi(sc, "broker", "codice"), "lontana");
    assert.equal(valutaIpotesi(sc, "authentik", "bp_piattaforma"), "vicina");
    assert.equal(valutaIpotesi(sc, "authentik", "adr"), "giusta");
    assert.equal(valutaIpotesi(sc, "", "adr"), "libera");
    assert.equal(valutaIpotesi(sc, "broker", ""), null);
    assert.throws(() => valutaIpotesi(sc, "inventata", "adr"));
    // il percorso della regola sul broker scende di livello: principio, meccanismo, regola puntuale
    assert.deepEqual(percorso(sc, "broker").map((x) => x.stanza), ["bp_autorizzazione", "adr", "sicurezza"]);
    for (const d of sc.domande) {
      const esiti = new Set(sc.stanze.map((x) => valutaIpotesi(sc, d.id, x.id)));
      assert.ok(esiti.has("giusta") && esiti.has("lontana"), d.id);
    }
  });

  prova(`[${lingua}] pianta_crm: gioco «Decidi tu» con riscontro spiegato`, () => {
    const vuoto = verifica(sc, {});
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    const migliori = Object.fromEntries(sc.frasi.map((f) => [f.id, f.migliore]));
    assert.equal(verifica(sc, migliori).giuste, sc.frasi.length);
    const usate = new Set(sc.frasi.map((f) => f.migliore));
    assert.equal(usate.size, sc.categorie.length, "ogni categoria ha almeno una frase");
    const misto = verifica(sc, { ...migliori, f2: "blueprint", f4: "decisione" });
    assert.equal(misto.righe.find((r) => r.id === "f2").esito, "quasi");
    assert.equal(misto.righe.find((r) => r.id === "f4").esito, "sbagliato");
    assert.equal(misto.giuste, sc.frasi.length - 2);
    for (const r of [...vuoto.righe, ...misto.righe]) assert.ok(!/\{\w+\}/.test(r.testo), r.testo);
    for (const f of sc.frasi) for (const q of f.quasi) assert.ok(q !== f.migliore && sc.categorie.some((c) => c.id === q), f.id);
  });

  prova(`[${lingua}] pianta_crm: geometria, ogni testo SVG sta nel suo riquadro`, () => {
    const pos = posizioniStanze(sc);
    const r = Object.values(pos);
    for (const p of r) assert.ok(p.x >= 0 && p.y >= 30 && p.x + p.w <= DIMENSIONI.w && p.y + p.h <= 380, JSON.stringify(p));
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
      const a = r[i], b = r[j];
      assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, "stanze sovrapposte");
    }
    const larg = (s, px, mono) => s.length * px * (mono ? 0.6 : 0.58);
    for (const st of sc.stanze) {
      assert.equal(aCapo(st.nome, sc.a_capo.nome_stanza).length, 1, st.nome);
      assert.ok(larg(st.nome, 11) < pos[st.id].w - 44, `nome lungo: ${st.nome}`);
      assert.ok(larg(st.file, 9.5, true) < pos[st.id].w - 44, `file lungo: ${st.file}`);
    }
    const pm = posizioniModuli(sc);
    for (const m of sc.moduli) {
      assert.ok(aCapo(m.nome, sc.a_capo.nome_modulo).length <= 2);
      assert.ok(aCapo(m.entita.join(", "), sc.a_capo.entita).length <= 5);
      assert.ok(pm[m.id].x + pm[m.id].w <= 706 && pm[m.id].y + pm[m.id].h <= 412);
      for (const riga of aCapo(m.entita.join(", "), sc.a_capo.entita)) assert.ok(larg(riga, 10) <= pm[m.id].w - 16, riga);
    }
    for (const f of sc.frasi) assert.ok(aCapo(f.testo, sc.a_capo.frase).length <= 2, `frase ${f.id} troppo lunga`);
    for (const d of sc.domande) assert.ok(aCapo(d.testo, 110).length <= 3);
    assert.ok(larg(riempi(sc.testi.tappa, { n: 1, stanza: "x", nota: "y" }), 10) > 0);
  });
}
