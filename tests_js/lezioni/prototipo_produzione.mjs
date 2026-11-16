// Prove della lezione P8.1 "Dal prototipo alla produzione" (logica pura, entrambe le lingue).
import { pipeline, versioni, messaggioPipeline, guasti, ambiente, verifica, posizioneCard } from "../../webapp/animazioni/prototipo_produzione.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("prototipo_produzione.json"), lingua);
  const sc = L.scenario;
  const base = L.segmenti[1].stato_animazione;
  const st = (diff) => ({ ...base, ...diff });
  const aperti = (t) => assert.ok(!/\{\w+\}/.test(t), t);

  prova(`[${lingua}] prototipo_produzione: dati coerenti, ogni segmento valido, riassunto in 3 frasi`, () => {
    assert.equal(sc.versioni.length, 6, "le sei parti versionate della fonte");
    assert.deepEqual(sc.versioni.map((v) => v.id), ["codice", "istruzioni", "modello", "strumenti", "memoria", "set_prove"]);
    assert.equal(sc.protezioni.length, 4, "i quattro fallimenti tipici");
    assert.equal(sc.fasi.length, 4);
    for (const seg of L.segmenti) {
      const s = seg.stato_animazione;
      pipeline(sc, s); ambiente(sc, s); guasti(sc, s);
      aperti(messaggioPipeline(sc, s).testo);
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
    assert.ok(guasti(sc, L.segmenti[0].stato_animazione).length >= 1, "il primo passo mostra subito un guasto");
  });

  prova(`[${lingua}] prototipo_produzione: ogni protezione spenta mostra il suo guasto`, () => {
    assert.deepEqual(guasti(sc, st({})), []);
    for (const p of sc.protezioni) {
      assert.deepEqual(guasti(sc, st({ protezioni: { ...base.protezioni, [p.id]: false } })), [p.id]);
      assert.ok(p.guasto.length > 20);
    }
  });

  prova(`[${lingua}] prototipo_produzione: le chiavi condivise portano le email di prova ai clienti veri`, () => {
    assert.equal(ambiente(sc, st({ ambiente: "staging" })).clienti_veri, false);
    assert.equal(ambiente(sc, st({ ambiente: "staging", credenziali_condivise: true })).rischio, true);
    assert.equal(ambiente(sc, st({ ambiente: "sviluppo", credenziali_condivise: true })).clienti_veri, true);
    assert.equal(ambiente(sc, st({ ambiente: "produzione" })).reale, true);
    assert.equal(ambiente(sc, st({ ambiente: "produzione", credenziali_condivise: true })).rischio, false);
  });

  prova(`[${lingua}] prototipo_produzione: il cancello ferma la regressione, saltarlo la porta ai clienti`, () => {
    const buona = pipeline(sc, st({ modifica: "buona" }));
    assert.equal(buona.cancello, "firmato");
    assert.equal(buona.regressione_ai_clienti, false);
    const chiuso = pipeline(sc, st({ modifica: "regressione" }));
    assert.equal(chiuso.cancello, "chiuso");
    assert.equal(chiuso.rossi, 3);
    assert.equal(chiuso.posizione, "cancello");
    const saltato = pipeline(sc, st({ modifica: "regressione", salta_cancello: true }));
    assert.equal(saltato.regressione_ai_clienti, true);
    assert.equal(messaggioPipeline(sc, st({ modifica: "regressione", salta_cancello: true })).tipo, "male");
    assert.equal(pipeline(sc, st({ modifica: "buona", salta_cancello: true })).cancello, "firmato", "senza prove rosse il cancello non si salta: si firma");
  });

  prova(`[${lingua}] prototipo_produzione: il rollback riporta tutte e sei le parti allo stato noto`, () => {
    const prima = versioni(sc, st({ modifica: "regressione", salta_cancello: true }));
    assert.equal(prima.find((v) => v.id === "istruzioni").in_produzione, "v14");
    assert.ok(prima.some((v) => v.cambiata));
    const dopo = versioni(sc, st({ modifica: "regressione", salta_cancello: true, annullato: true }));
    for (const v of dopo) assert.equal(v.in_produzione, sc.versioni.find((x) => x.id === v.id).stabile);
    assert.equal(pipeline(sc, st({ modifica: "regressione", salta_cancello: true, annullato: true })).regressione_ai_clienti, false);
    const m = messaggioPipeline(sc, st({ modifica: "regressione", salta_cancello: true, annullato: true }));
    assert.ok(m.testo.includes("v13") && m.testo.includes("M-2"), "istruzioni e modello registrati insieme");
  });

  prova(`[${lingua}] prototipo_produzione: gioco "Decidi tu" con riscontro spiegato`, () => {
    const vuoto = verifica(sc, st({}));
    assert.ok(vuoto.righe.every((x) => x.esito === "vuoto"));
    const migliori = Object.fromEntries(sc.gioco.map((g) => [g.id, g.migliore]));
    const perfetto = verifica(sc, st({ scelte: migliori }));
    assert.equal(perfetto.giuste, sc.gioco.length);
    const misto = verifica(sc, st({ scelte: { ...migliori, g_modello: "solo_modello", g_cancello: "salta" } }));
    assert.equal(misto.righe.find((x) => x.id === "g_modello").esito, "quasi");
    assert.equal(misto.righe.find((x) => x.id === "g_cancello").esito, "sbagliato");
    for (const x of [...vuoto.righe, ...misto.righe]) aperti(x.testo);
    aperti(misto.sintesi);
    for (const g of sc.gioco) for (const q of g.quasi) assert.ok(g.opzioni.some((o) => o.id === q) && q !== g.migliore);
  });

  prova(`[${lingua}] prototipo_produzione: la card resta nel riquadro ed e' deterministica`, () => {
    for (const s of [st({}), st({ modifica: "regressione" }), st({ modifica: "regressione", salta_cancello: true })]) {
      const p = posizioneCard(sc, s);
      assert.ok(p.x >= 0 && p.x + 150 <= 720 && p.y >= 0 && p.y + 30 <= 430, JSON.stringify(p));
      assert.deepEqual(p, posizioneCard(sc, s));
    }
    assert.ok(posizioneCard(sc, st({ modifica: "regressione" })).x < posizioneCard(sc, st({ modifica: "buona" })).x);
  });
}
