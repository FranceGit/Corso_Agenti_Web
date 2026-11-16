// Prove della lezione P7.2 "Log, tracce, metriche" (logica pura, entrambe le lingue).
import { redigi, contienePII, righeLog, barre, esaminaSpan, calo, archivio, verifica, puntiQualita } from "../../webapp/animazioni/tre_pilastri.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("tre_pilastri.json"), lingua);
  const sc = L.scenario;
  const base = { vista: "pilastri", pilastro: "log", id_comune: false, filo: false, span_aperto: "", calo_aperto: false, redazione: true, campionamento: "tutto", scelte: {}, verificato: false };
  const st = (diff) => ({ ...base, ...diff });

  prova(`[${lingua}] tre_pilastri: dati coerenti, segmenti validi, riassunto in 3 frasi`, () => {
    for (const r of sc.log) assert.ok(sc.colori_richieste[r.richiesta], r.ora);
    assert.equal(sc.span.filter((x) => x.causa).length, 1);
    assert.equal(sc.span.filter((x) => x.tipo === "errore").length, 1);
    const iC = sc.span.findIndex((x) => x.causa), iE = sc.span.findIndex((x) => x.tipo === "errore");
    assert.ok(iC < iE, "la causa viene prima del sintomo");
    for (const seg of L.segmenti) {
      assert.ok(righeLog(sc, seg.stato_animazione).tot === sc.log.length);
      if (seg.stato_animazione.span_aperto) assert.ok(esaminaSpan(sc, seg.stato_animazione));
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
    assert.deepEqual(sc.pilastri.map((p) => p.id), ["log", "traccia", "metriche"]);
  });

  prova(`[${lingua}] tre_pilastri: l'identificativo comune separa le righe della richiesta`, () => {
    const senza = righeLog(sc, st({}));
    assert.ok(senza.righe.every((r) => r.richiesta === null && !r.evidenziata), "senza id le righe non dicono a chi appartengono");
    const con = righeLog(sc, st({ id_comune: true }));
    assert.equal(con.righe.filter((r) => r.evidenziata).length, sc.log.filter((r) => r.richiesta === sc.richiesta_caso).length);
    assert.ok(con.del_caso >= 3 && con.del_caso < con.tot);
  });

  prova(`[${lingua}] tre_pilastri: la redazione toglie ogni dato personale`, () => {
    const red = righeLog(sc, st({ redazione: true }));
    assert.equal(red.pii, 0);
    for (const r of red.righe) assert.ok(!contienePII(sc, r.testo), r.testo);
    const chiaro = righeLog(sc, st({ redazione: false }));
    assert.ok(chiaro.pii >= 3);
    const t = redigi(sc, sc.log[0].testo, true);
    for (const d of sc.dati_personali.filter((x) => sc.log[0].testo.includes(x.chiaro))) assert.ok(t.includes(d.redatto));
    const sp = esaminaSpan(sc, st({ pilastro: "traccia", filo: true, span_aperto: "s1", redazione: true }));
    assert.ok(!contienePII(sc, sp.ingresso), "anche l'ingresso dello span e' redatto");
  });

  prova(`[${lingua}] tre_pilastri: traccia, sintomo e causa (filo rosso)`, () => {
    assert.equal(esaminaSpan(sc, st({ pilastro: "traccia", filo: false, span_aperto: "s4" })), null, "senza filo solo cartellini isolati");
    const causa = esaminaSpan(sc, st({ pilastro: "traccia", filo: true, span_aperto: "s4" }));
    assert.equal(causa.causa, true);
    const sintomo = esaminaSpan(sc, st({ pilastro: "traccia", filo: true, span_aperto: "s5" }));
    assert.equal(sintomo.sintomo, true);
    assert.equal(sintomo.causa, false);
    const b = barre(sc);
    for (const x of b) assert.ok(x.x >= 180 && x.x + x.w <= 701 && x.y + 26 <= 345, JSON.stringify(x));
    const radice = b[0], figli = b.slice(1);
    for (const f of figli) assert.ok(f.x >= radice.x && f.x + f.w <= radice.x + radice.w + 0.01, "gli span stanno dentro la richiesta");
  });

  prova(`[${lingua}] tre_pilastri: metriche, calo del 10% e campionamento`, () => {
    const k = calo(sc);
    assert.equal(k.percento, -10);
    const tutto = archivio(sc, st({}));
    assert.equal(tutto.n, sc.metriche.richieste_giorno);
    const camp = archivio(sc, st({ campionamento: "campione" }));
    assert.equal(camp.errori, sc.metriche.errori_giorno, "il 100% degli errori resta");
    assert.ok(camp.n < tutto.n / 5);
    for (const p of puntiQualita(sc)) assert.ok(p.y >= 90 && p.y <= 305 && p.x <= 690, JSON.stringify(p));
  });

  prova(`[${lingua}] tre_pilastri: gioco "quale pilastro apri" con riscontro`, () => {
    const vuoto = verifica(sc, st({ vista: "decidi" }));
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    const giuste = Object.fromEntries(sc.domande.map((d) => [d.id, d.migliore]));
    assert.equal(verifica(sc, st({ vista: "decidi", scelte: giuste })).giuste, sc.domande.length);
    assert.deepEqual(new Set(sc.domande.map((d) => d.migliore)), new Set(["log", "traccia", "metriche"]));
    const sb = verifica(sc, st({ vista: "decidi", scelte: { ...giuste, q2: "log" } }));
    assert.equal(sb.righe.find((r) => r.id === "q2").esito, "sbagliato");
    for (const r of [...vuoto.righe, ...sb.righe]) assert.ok(!/\{\w+\}/.test(r.testo), r.testo);
    assert.deepEqual(barre(sc), barre(sc));
  });
}
