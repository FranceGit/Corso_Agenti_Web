// Prove della lezione P7.5 "Migliorare osservando: dalle metriche al risultato" (logica pura, entrambe le lingue).
import { valori, catena, esperimento, gruppi, volano, verifica, posizioni, curve } from "../../webapp/animazioni/metriche_impatto.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("metriche_impatto.json"), lingua);
  const sc = L.scenario;
  const base = L.segmenti[0].stato_animazione;
  const st = (diff) => ({ ...base, ...diff });
  const segnaposto = /\{\w+\}/;
  const ultimo = sc.volume.livelli.length - 1;

  prova(`[${lingua}] metriche_impatto: dati coerenti, ogni segmento valido, riassunto in 3 frasi`, () => {
    const ids = new Set(sc.metriche.map((m) => m.id));
    for (const [a, b] of sc.collegamenti) assert.ok(ids.has(a) && ids.has(b), `${a}->${b}`);
    const chiavi = JSON.stringify(Object.keys(base).sort());
    for (const seg of L.segmenti) {
      assert.equal(JSON.stringify(Object.keys(seg.stato_animazione).sort()), chiavi, seg.id);
      assert.ok(ids.has(seg.stato_animazione.evidenza), seg.id);
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
    for (const c of sc.casi) {
      assert.ok(sc.numeri.some((x) => x.id === c.migliore), c.id);
      for (const q of c.quasi) assert.ok(sc.numeri.some((x) => x.id === q) && q !== c.migliore, c.id);
    }
    assert.equal(sc.esperimento.serie_agente.length, sc.settimane.max);
    assert.equal(sc.esperimento.serie_controllo.length, sc.settimane.max);
  });

  prova(`[${lingua}] metriche_impatto: la catena dalla latenza arriva alla pipeline, le email non sono collegate`, () => {
    const lat = catena(sc, "latenza");
    for (const id of ["prima_risposta", "opportunita", "pipeline"]) assert.ok(lat.su.includes(id), id);
    assert.ok(lat.giu.includes("tracce"));
    assert.ok(!lat.su.includes("tasso_obiettivi"), "la latenza non spinge il tasso di obiettivi in questo schema");
    for (const id of ["email", "foglio", "disiscrizioni"]) assert.ok(catena(sc, id).isolata, id);
    const pip = catena(sc, "pipeline");
    assert.equal(pip.su.length, 0);
    assert.ok(pip.giu.includes("tracce") && pip.giu.includes("latenza"));
    assert.ok(lat.archi.length >= 4);
  });

  prova(`[${lingua}] metriche_impatto: piu' email = piu' attivita' e rischio, ma opportunita' piatte (metrica vanitosa)`, () => {
    const v0 = valori(sc, 0), v4 = valori(sc, ultimo);
    assert.equal(v4.email / v0.email, sc.volume.livelli[ultimo]);
    assert.equal(v4.foglio, 2000, "i 2.000 lead nel foglio dei tutorial");
    assert.ok(Math.abs(v4.opportunita - v0.opportunita) / v0.opportunita < 0.15, "conversioni piatte");
    assert.ok(v4.disiscrizioni > v0.disiscrizioni * 10 && v4.reclami > v0.reclami * 10, "il rischio cresce molto piu' delle email");
    let massimo = 0;
    for (let k = 0; k <= ultimo; k++) massimo = Math.max(massimo, valori(sc, k).opportunita);
    assert.ok(massimo > v4.opportunita, "oltre la soglia di fastidio le opportunita' calano");
    assert.equal(v4.pipeline, v4.opportunita * sc.modello.valore_opportunita);
    assert.throws(() => valori(sc, ultimo + 1));
  });

  prova(`[${lingua}] metriche_impatto: il +20% apparente non e' l'effetto vero; il gruppo di controllo lo isola col tempo`, () => {
    const presto = esperimento(sc, st({ confronto: "controllo", settimane: 2 }));
    assert.equal(presto.apparente, 20);
    assert.ok(!presto.chiaro, "dopo 2 settimane e' troppo presto");
    for (let t = 1; t <= 8; t++) assert.ok(!esperimento(sc, st({ settimane: t })).chiaro, `settimana ${t}`);
    const tardi = esperimento(sc, st({ confronto: "controllo", settimane: 12 }));
    assert.ok(tardi.chiaro);
    assert.ok(tardi.banda < presto.banda);
    assert.ok(tardi.effetto_finale < 1 && tardi.effetto_finale > 0, "effetto vero piccolo ma reale");
    assert.ok(sc.esperimento.dicembre_controllo > sc.esperimento.novembre, "anche senza agente dicembre vende di piu'");
  });

  prova(`[${lingua}] metriche_impatto: lead divisi a caso in modo deterministico e bilanciato; curve dentro il grafico`, () => {
    const g = gruppi(sc);
    assert.equal(g.length, sc.esperimento.lead_puntini);
    assert.deepEqual(gruppi(sc), g);
    const n = g.filter((x) => x === "agente").length;
    assert.ok(Math.abs(n - (g.length - n)) <= 8, `${n} contro ${g.length - n}`);
    for (const t of [1, 6, 12]) {
      const cv = curve(sc, t);
      for (const k of ["agente", "controllo"]) {
        assert.equal(cv[k].linea.length, t);
        for (const [x, y] of [...cv[k].linea, ...cv[k].banda]) assert.ok(x >= 0 && x <= 720 && y >= 0 && y <= 430, `${x},${y}`);
      }
    }
  });

  prova(`[${lingua}] metriche_impatto: il volano trasforma l'errore in un test e migliora i numeri`, () => {
    const v0 = volano(sc, 0), v3 = volano(sc, 3), v4 = volano(sc, sc.volano.passi.length);
    assert.equal(v0.casi, sc.volano.casi_set);
    assert.equal(v3.casi, sc.volano.casi_set, "finche' l'errore non diventa test il set non cresce");
    assert.equal(v4.casi, sc.volano.casi_set + 1);
    assert.ok(v4.corrette > v0.corrette && v4.risposte > v0.risposte);
    assert.ok(v4.finito && !v3.finito);
  });

  prova(`[${lingua}] metriche_impatto: gioco "quale numero" con riscontro spiegato`, () => {
    const vuoto = verifica(sc, st({ vista: "decidi" }));
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    const migliori = Object.fromEntries(sc.casi.map((c) => [c.id, c.migliore]));
    assert.equal(verifica(sc, st({ scelte: migliori })).giuste, sc.casi.length);
    const misto = verifica(sc, st({ scelte: { ...migliori, c_veloce: "prima_risposta", c_dicembre: "conv_mese" } }));
    assert.equal(misto.righe.find((r) => r.id === "c_veloce").esito, "quasi");
    assert.equal(misto.righe.find((r) => r.id === "c_dicembre").esito, "sbagliato");
    for (const r of [...vuoto.righe, ...misto.righe]) assert.ok(!segnaposto.test(r.testo), r.testo);
    assert.ok(!segnaposto.test(misto.sintesi));
    assert.ok(new Set(sc.casi.map((c) => c.migliore)).size === sc.casi.length, "ogni caso ha un numero migliore diverso");
  });

  prova(`[${lingua}] metriche_impatto: le card del cruscotto stanno nel riquadro e non si sovrappongono`, () => {
    const pos = posizioni(sc);
    assert.equal(Object.keys(pos).length, sc.metriche.length);
    const r = Object.entries(pos);
    for (const [id, p] of r) assert.ok(p.x >= 0 && p.x + p.w <= 720 && p.y >= 0 && p.y + p.h <= 430, id);
    for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
      const [a, pa] = r[i], [b, pb] = r[j];
      const separate = pa.x + pa.w <= pb.x || pb.x + pb.w <= pa.x || pa.y + pa.h <= pb.y || pb.y + pb.h <= pa.y;
      assert.ok(separate, `${a} e ${b} si sovrappongono`);
    }
  });
}
