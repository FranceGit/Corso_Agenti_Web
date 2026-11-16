// Prove della lezione PO6.2 "Il contatore delle ore" (logica pura, entrambe le lingue).
import { mese, giornata, giorniLavoro, oreGratis, esitiMese, giornoFine, trasloco, verifica, larghezzaBarra, validaStato, aCapo, DIMENSIONI } from "../../webapp/animazioni/contatore_ore.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("contatore_ore.json"), lingua);
  const sc = L.scenario;
  const base = { ...L.segmenti[0].stato_animazione };
  const st = (d) => ({ ...base, ...d });
  const narr = (id) => L.segmenti.find((x) => x.id === id).narrazione.join(" ");
  const tutti = L.segmenti.map((x) => x.narrazione.join(" ")).join(" ");

  prova(`[${lingua}] contatore_ore: segmenti validi, stesse chiavi, riassunto in 3 frasi, partenza = riferimento`, () => {
    const chiavi = Object.keys(base).sort().join();
    for (const seg of L.segmenti) {
      assert.equal(Object.keys(seg.stato_animazione).sort().join(), chiavi, seg.id);
      validaStato(sc, base, seg.stato_animazione);
      assert.equal(mese(sc, seg.stato_animazione).giorni.length, sc.giorni_mese);
    }
    const ult = L.segmenti.at(-1);
    assert.equal(ult.id, "riassunto");
    assert.equal(ult.narrazione.length, 3);
    assert.ok(!ult.prova);
    for (const k of Object.keys(sc.riferimento)) assert.equal(base[k], sc.riferimento[k], k);
  });

  prova(`[${lingua}] contatore_ore: i numeri del materiale (da riverificare) sono quelli dello scenario e del testo`, () => {
    assert.equal(sc.quota_ore_core, 120);
    assert.equal(sc.quota_gb_mese, 15);
    assert.equal(sc.inattivita_predefinita, 30);
    assert.equal(sc.conservazione_giorni, 30);
    assert.deepEqual(sc.macchine.map((c) => oreGratis(sc, c)), [60, 30, 15]);
    for (const n of ["120", "15", "60", "30"]) assert.ok(narr("ore_core").includes(n), n);
    assert.ok(/riverific|checked again/.test(narr("ore_core")), "la lezione dice che i numeri vanno riverificati");
    assert.ok(/riverific|checked again/.test(sc.testi.nota_numeri));
    assert.ok(narr("inattivita").includes("30") && narr("inattivita").includes("240"));
    // 2 pause lasciate aperte con arresto a 240 minuti = 8 ore a vuoto (numero citato nel testo)
    assert.equal(giornata(sc, st({ inattivita: 240 })).vuoto, 8);
    assert.ok(narr("inattivita").includes("8"));
    assert.ok(narr("trasloco").includes(String(sc.conservazione_giorni)));
    assert.ok(tutti.includes("python -m pytest officina/o2 -q") && tutti.includes("/workspaces/"));
  });

  prova(`[${lingua}] contatore_ore: ore-core = ore accese x core, giorni di lavoro distribuiti`, () => {
    for (const g of [1, 7, 16, 30]) assert.equal(giorniLavoro(sc, st({ giorni: g })).filter(Boolean).length, g);
    const m = mese(sc, base);
    assert.equal(giornata(sc, base).ore_core, 2 * (2 + 2 * 0.5));
    assert.equal(m.ore_tot, 96);
    assert.equal(m.fine, null);
    assert.equal(m.avanzo, 24);
    assert.equal(mese(sc, st({ core: 4 })).ore_tot, 192);
    assert.equal(mese(sc, st({ core: 8 })).ore_tot, 384);
    assert.equal(mese(sc, st({ ferma_a_mano: true })).ore_tot, 64);
    assert.equal(mese(sc, st({ ferma_a_mano: true })).vuoto_tot, 0);
    assert.equal(mese(sc, st({ inattivita: 240 })).ore_tot, 320);
  });

  prova(`[${lingua}] contatore_ore: piu' core finiscono prima il gratuito`, () => {
    const f4 = mese(sc, st({ core: 4 })), f8 = mese(sc, st({ core: 8 }));
    assert.ok(f4.fine !== null && f8.fine !== null && f8.fine < f4.fine);
    assert.equal(f4.causa, "ore");
    // la fine cade nel primo giorno in cui il cumulato supera 120
    const g = f4.giorni[f4.fine - 1], prima = f4.giorni[f4.fine - 2];
    assert.ok(g.ore_cum > 120 && prima.ore_cum <= 120);
    assert.equal(giornoFine(f4, "ore", sc), f4.fine);
  });

  prova(`[${lingua}] contatore_ore: lo spazio dei codespace fermi conta anche senza ore`, () => {
    const m = mese(sc, st({ tenuti: 5 }));
    assert.equal(m.ore_tot, mese(sc, base).ore_tot, "i codespace fermi non consumano ore");
    assert.equal(m.gb_tot, 18);
    assert.equal(m.fine, 26);
    assert.equal(m.causa, "spazio");
    assert.equal(mese(sc, st({ tenuti: 4 })).fine, null, "15 GB-mese esatti non superano la quota");
    const e = esitiMese(sc, st({ tenuti: 2 }));
    assert.equal(e.righe.find((r) => r.id === "spazio").livello, "avviso");
    assert.equal(esitiMese(sc, st({ tenuti: 5 })).righe.find((r) => r.id === "spazio").livello, "male");
  });

  prova(`[${lingua}] contatore_ore: limite a zero ferma senza addebito, sopra zero si paga`, () => {
    const zero = mese(sc, st({ core: 8 })), sopra = mese(sc, st({ core: 8, limite: "sopra" }));
    assert.equal(zero.fine, sopra.fine);
    assert.ok(zero.giorni.slice(zero.fine - 1).every((d) => d.stato === "fermo"));
    assert.ok(sopra.giorni.slice(sopra.fine - 1).every((d) => d.stato === "pagamento"));
    assert.ok(zero.giorni.slice(0, zero.fine - 1).every((d) => d.stato === "lavoro" || d.stato === "riposo"));
    assert.equal(esitiMese(sc, st({ core: 8 })).verdetto.livello, "avviso");
    assert.equal(esitiMese(sc, st({ core: 8, limite: "sopra" })).verdetto.livello, "male");
    assert.equal(esitiMese(sc, base).verdetto.livello, "ok");
  });

  prova(`[${lingua}] contatore_ore: ogni comando cambia l'esito atteso`, () => {
    const firma = (s) => JSON.stringify(esitiMese(sc, s));
    const b = firma(base);
    for (const d of [{ core: 4 }, { core: 8 }, { ore_giorno: 5 }, { giorni: 25 }, { inattivita: 120 }, { ferma_a_mano: true }, { tenuti: 1 }, { gb: 6 }, { limite: "sopra" }]) assert.notEqual(firma(st(d)), b, JSON.stringify(d));
    assert.equal(trasloco(sc, st({ push: true, assenza: 45 })).esito, "salvo");
    assert.equal(trasloco(sc, st({ push: false, assenza: 45 })).esito, "perso");
    assert.equal(trasloco(sc, st({ push: false, assenza: 30 })).esito, "perso");
    assert.equal(trasloco(sc, st({ push: false, assenza: 29 })).esito, "rischio");
    assert.ok(trasloco(sc, st({ push: false, assenza: 29 })).testo.includes("1"));
  });

  prova(`[${lingua}] contatore_ore: testi nei riquadri, niente segnaposto ne' stringhe vuote`, () => {
    for (const s of [base, st({ core: 8 }), st({ tenuti: 5, gb: 10 }), st({ ore_giorno: 10, giorni: 30, inattivita: 240, limite: "sopra" }), st({ ore_giorno: 0.5, giorni: 1, ferma_a_mano: true })]) {
      const e = esitiMese(sc, s);
      for (const r of [...e.righe, e.verdetto]) assert.ok(r.testo && !/\{\w+\}/.test(r.testo) && !/undefined|NaN/.test(r.testo), r.testo);
      assert.ok(larghezzaBarra(e.mese.ore_tot, sc.quota_ore_core) <= DIMENSIONI.barra.w);
    }
    for (const u of sc.unita) {
      assert.ok(aCapo(u.nota, sc.a_capo_unita).length <= 2, `nota di ${u.id} troppo lunga`);
      assert.ok(u.cartella.length <= 46 && u.comando.length <= 46, u.id);
    }
    for (const c of sc.casi) assert.ok(aCapo(c.testo, sc.a_capo_situazione).length <= 2, `situazione ${c.id} troppo lunga`);
    assert.ok(aCapo(sc.testi.nota_numeri, sc.a_capo_nota).length + aCapo(sc.testi.nota_ipotesi, sc.a_capo_nota).length <= 6);
    for (const t of [sc.testi.cs_attivo, sc.testi.cs_fermo]) assert.ok(aCapo(t.replace("{gb}", "10"), sc.a_capo_codespace).length <= 3, t);
    const vuote = [];
    const giro = (x, p) => { if (typeof x === "string") { if (!x.trim()) vuote.push(p); } else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) giro(v, `${p}.${k}`); };
    giro(sc, "scenario");
    assert.deepEqual(vuote, []);
  });

  prova(`[${lingua}] contatore_ore: "Decidi tu" con riscontro spiegato, stato sconosciuto rifiutato`, () => {
    const vuoto = verifica(sc, st({ vista: "decidi" }));
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    const migliori = Object.fromEntries(sc.casi.map((c) => [c.id, c.migliore]));
    assert.equal(verifica(sc, st({ scelte: migliori })).giuste, sc.casi.length);
    const misto = verifica(sc, st({ scelte: { ...migliori, k1: "arresto", k3: "cancella" } }));
    assert.equal(misto.righe.find((r) => r.id === "k1").esito, "quasi");
    assert.equal(misto.righe.find((r) => r.id === "k3").esito, "sbagliato");
    for (const r of [...vuoto.righe, ...misto.righe]) assert.ok(!/\{\w+\}/.test(r.testo), r.testo);
    // il caso k1 usa i numeri veri: 20 ore-core rimaste = 2,5 ore su 8 core, 10 ore su 2 core
    assert.equal((120 - 100) / 8, 2.5);
    assert.equal((120 - 100) / 2, 10);
    assert.throws(() => validaStato(sc, base, { colore: 1 }), /chiave non prevista/);
    assert.throws(() => validaStato(sc, base, { core: 3 }), /macchina sconosciuta/);
    assert.throws(() => validaStato(sc, base, { inattivita: 999 }), /fuori scala/);
    assert.throws(() => validaStato(sc, base, { limite: "poco" }), /limite sconosciuto/);
  });
}
