// Prove della lezione P7.4 "Il giudice e i suoi bias" (logica pura, entrambe le lingue).
import { verdetto, giudizio, esperti, segnali, motivo, vittorie, calibrazione, revisione, verifica, geometria, aCapo } from "../../webapp/animazioni/giudice_bias.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("giudice_bias.json"), lingua);
  const sc = L.scenario;
  const base = L.segmenti[0].stato_animazione;
  const st = (diff) => ({ ...base, ...diff });
  const cp = (id) => sc.coppie.find((c) => c.id === id);
  const V = (diff, id) => verdetto(sc, st(diff), cp(id));
  const segnaposto = /\{\w+\}/;

  prova(`[${lingua}] giudice_bias: dati coerenti, ogni segmento valido, riassunto in 3 frasi`, () => {
    for (const c of sc.coppie) for (const l of ["A", "B"]) {
      assert.ok(Number.isInteger(c[l].parole) && c[l].parole > 0, `${c.id}/${l}: parole`);
      for (const v of sc.voci) assert.ok(c[l].voti[v.id] >= 1 && c[l].voti[v.id] <= sc.parametri.voto_max, `${c.id}/${l}/${v.id}`);
    }
    const chiavi = JSON.stringify(Object.keys(base).sort());
    for (const seg of L.segmenti) {
      assert.equal(JSON.stringify(Object.keys(seg.stato_animazione).sort()), chiavi, seg.id);
      assert.ok(sc.coppie.some((c) => c.id === seg.stato_animazione.coppia), seg.id);
      assert.ok(vittorie(sc, seg.stato_animazione).tot === sc.coppie.length);
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
    for (const sit of sc.situazioni) {
      assert.ok(sc.contromisure.some((c) => c.id === sit.migliore), sit.id);
      for (const q of sit.quasi) assert.ok(sc.contromisure.some((c) => c.id === q) && q !== sit.migliore, sit.id);
    }
  });

  prova(`[${lingua}] giudice_bias: il caso della demo vince A in ogni ordine e la nuova versione vince quasi sempre`, () => {
    for (const o of ["AB", "BA"]) assert.equal(V({ ordine: o }, "demo"), "A");
    assert.equal(esperti(sc, cp("demo")), "A");
    assert.equal(V({}, "utenti"), "B", "una coppia in cui la versione in uso e' migliore");
    assert.ok(vittorie(sc, st({})).tasso > 50);
  });

  prova(`[${lingua}] giudice_bias: invertire l'ordine cambia il verdetto della coppia alla pari (bias di posizione)`, () => {
    assert.equal(V({ ordine: "AB" }, "preventivo"), "A");
    assert.equal(V({ ordine: "BA" }, "preventivo"), "B");
    assert.equal(esperti(sc, cp("preventivo")), "pari");
    assert.ok(segnali(sc, st({}), cp("preventivo")).posizione);
    assert.ok(!segnali(sc, st({}), cp("demo")).posizione);
    assert.ok(vittorie(sc, st({ ordine: "AB" })).tasso > vittorie(sc, st({ ordine: "BA" })).tasso, "l'ordine sposta anche il tasso di vittorie");
  });

  prova(`[${lingua}] giudice_bias: la doppia valutazione rende incerti i verdetti che dipendono dall'ordine`, () => {
    assert.equal(V({ doppia: true }, "preventivo"), "incerto");
    assert.equal(V({ doppia: true, ordine: "BA" }, "preventivo"), "incerto");
    assert.equal(V({ doppia: true }, "demo"), "A");
    assert.ok(vittorie(sc, st({ doppia: true })).incerte >= 1);
    assert.ok(!segnali(sc, st({ doppia: true }), cp("preventivo")).posizione);
  });

  prova(`[${lingua}] giudice_bias: frasi vuote spostano il giudice; "la lunghezza non conta" lo riporta al contenuto`, () => {
    assert.equal(V({ imbottitura: 0 }, "offerta"), "A");
    assert.equal(V({ imbottitura: sc.imbottitura.max }, "offerta"), "B");
    assert.equal(esperti(sc, cp("offerta")), "A");
    const s3 = st({ imbottitura: sc.imbottitura.max });
    assert.ok(segnali(sc, s3, cp("offerta")).lunghezza && segnali(sc, s3, cp("offerta")).esperti);
    assert.equal(V({ imbottitura: sc.imbottitura.max, regola_lunghezza: true }, "offerta"), "A");
    const g0 = giudizio(sc, st({}), cp("offerta"), "AB"), gd = giudizio(sc, st({ giudice_diverso: true }), cp("offerta"), "AB");
    assert.ok(gd.spinte.A.auto === 0 && g0.spinte.A.auto > 0, "giudice di un altro modello: niente auto-preferenza");
    assert.ok(vittorie(sc, st({ imbottitura: sc.imbottitura.max })).tasso < vittorie(sc, st({})).tasso);
  });

  prova(`[${lingua}] giudice_bias: uscita del giudice e motivo sempre scritti`, () => {
    for (const c of sc.coppie) for (const d of [{}, { ordine: "BA" }, { doppia: true }, { imbottitura: 3 }]) {
      const v = verdetto(sc, st(d), c);
      assert.ok(["A", "B", "pari", "incerto"].includes(v));
      const m = motivo(sc, st(d), c, v);
      assert.ok(m && !segnaposto.test(m), m);
    }
  });

  prova(`[${lingua}] giudice_bias: la rubrica scomposta stringe la nuvola e toglie l'ottimismo`, () => {
    const vaga = calibrazione(sc, "vaga"), scomp = calibrazione(sc, "scomposta");
    assert.equal(vaga.punti.length, sc.calibrazione.casi);
    assert.ok(scomp.accordo > vaga.accordo + 30, `${vaga.accordo} -> ${scomp.accordo}`);
    assert.ok(vaga.media_giudice - vaga.media_esperti > 0.8, "rubrica vaga: giudice troppo generoso");
    assert.ok(Math.abs(scomp.media_giudice - scomp.media_esperti) < 0.3);
    assert.ok(scomp.accordo < 100, "anche con la rubrica scomposta l'accordo non e' perfetto");
    assert.deepEqual(calibrazione(sc, "vaga"), vaga, "deterministico");
    for (const p of [...vaga.punti, ...scomp.punti]) assert.ok(p.giudice >= 1 && p.giudice <= sc.parametri.voto_max && p.esperti >= 1);
    assert.throws(() => calibrazione(sc, "boh"));
  });

  prova(`[${lingua}] giudice_bias: revisione umana a campione + casi segnalati`, () => {
    const r0 = revisione(sc, st({ campione: 0 })), r20 = revisione(sc, st({ campione: 20 }));
    assert.equal(r0.campione, 0);
    assert.equal(r0.totale, sc.parametri.segnalati_giorno, "i casi segnalati si rivedono sempre");
    assert.ok(r20.totale > r0.totale && r20.ore > r0.ore);
  });

  prova(`[${lingua}] giudice_bias: gioco "Decidi tu" con riscontro spiegato`, () => {
    const vuoto = verifica(sc, st({ vista: "decidi" }));
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    const migliori = Object.fromEntries(sc.situazioni.map((x) => [x.id, x.migliore]));
    assert.equal(verifica(sc, st({ scelte: migliori })).giuste, sc.situazioni.length);
    const misto = verifica(sc, st({ scelte: { ...migliori, s_generoso: "campione", s_ordine: "fidati" } }));
    assert.equal(misto.righe.find((r) => r.id === "s_generoso").esito, "quasi");
    assert.equal(misto.righe.find((r) => r.id === "s_ordine").esito, "sbagliato");
    for (const r of [...vuoto.righe, ...misto.righe]) assert.ok(!segnaposto.test(r.testo), r.testo);
    assert.ok(!segnaposto.test(misto.sintesi));
  });

  prova(`[${lingua}] giudice_bias: geometria dentro il riquadro, carte che si scambiano, testi che stanno nelle carte`, () => {
    const ab = geometria(sc, st({ coppia: "preventivo" })), ba = geometria(sc, st({ coppia: "preventivo", ordine: "BA" }));
    assert.deepEqual(ab.carte.A, ba.carte.B);
    assert.ok(ab.gradi < 0 && ba.gradi < 0, "in tutti e due gli ordini vince chi e' letto per primo: il piatto di sinistra scende");
    assert.ok(geometria(sc, st({ coppia: "utenti" })).gradi > 0, "vince B, letta per seconda: scende il piatto di destra");
    assert.equal(geometria(sc, st({ coppia: "preventivo", doppia: true })).gradi, 0, "incerto: bilancia in equilibrio");
    for (const r of ["vaga", "scomposta"]) for (const p of geometria(sc, st({ rubrica: r })).punti) assert.ok(p.x >= 0 && p.x <= 720 && p.y >= 0 && p.y <= 430);
    for (const c of sc.coppie) for (const l of ["A", "B"]) {
      const righe = aCapo(c[l].testo, 56).length + (l === "B" ? sc.riempimento.reduce((t, f) => t + aCapo(f, 56).length, 0) : 0);
      assert.ok(righe <= 9, `${c.id}/${l}: ${righe} righe non stanno nella carta`);
    }
    assert.deepEqual(geometria(sc, st({})).carte, geometria(sc, st({})).carte);
  });
}
