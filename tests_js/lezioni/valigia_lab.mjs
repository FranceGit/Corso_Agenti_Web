// Prove della lezione PO6.1 "La valigia del laboratorio" (logica pura, entrambe le lingue).
import { componi, testoFile, apertura, esame, verifica, numeri, validaStato, aCapo, chiaviOggetti } from "../../webapp/animazioni/valigia_lab.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("valigia_lab.json"), lingua);
  const sc = L.scenario;
  const base = { ...L.segmenti[0].stato_animazione };
  const st = (d) => ({ ...base, ...d });
  const riga = (s, id) => apertura(sc, s).find((r) => r.id === id);
  const tutto = (x) => JSON.stringify(x);

  prova(`[${lingua}] valigia_lab: segmenti validi, stesse chiavi, riassunto in 3 frasi, partenza = riferimento`, () => {
    const chiavi = Object.keys(base).sort().join();
    for (const seg of L.segmenti) {
      assert.equal(Object.keys(seg.stato_animazione).sort().join(), chiavi, seg.id);
      validaStato(sc, base, seg.stato_animazione);
      assert.ok(esame(sc, seg.stato_animazione).righe.length === sc.oggetti.length);
    }
    const ult = L.segmenti.at(-1);
    assert.equal(ult.id, "riassunto");
    assert.equal(ult.narrazione.length, 3);
    assert.ok(!ult.prova);
    for (const k of Object.keys(sc.riferimento)) assert.equal(base[k], sc.riferimento[k], k);
    assert.equal(esame(sc, base).verdetto, "ok", "la valigia di riferimento e' tutta verde");
  });

  prova(`[${lingua}] valigia_lab: il file composto coincide con il kit del repo (immagine, feature, porte, segreto)`, () => {
    const f = componi(sc, base);
    assert.equal(f.image, "mcr.microsoft.com/devcontainers/python:1-3.12-bookworm");
    assert.ok("ghcr.io/devcontainers/features/docker-in-docker:2" in f.features);
    assert.equal(f.postCreateCommand, "pip install --user -r requirements.txt");
    assert.deepEqual(f.forwardPorts, [8000, 8025]);
    assert.deepEqual(f.hostRequirements, { cpus: 2 });
    assert.ok(f.secrets.GROQ_API_KEY.description.length > 10);
    assert.ok(!("containerEnv" in f), "nessun valore segreto nel file di riferimento");
    assert.deepEqual(JSON.parse(testoFile(sc, base)), f);
    // ogni oggetto tolto sparisce dal file
    assert.ok(!("features" in componi(sc, st({ docker: "no" }))));
    assert.ok(!("postCreateCommand" in componi(sc, st({ post_create: "nessuno" }))));
    assert.ok(!("secrets" in componi(sc, st({ segreto: "assente" }))));
  });

  prova(`[${lingua}] valigia_lab: ogni comando cambia l'esito atteso`, () => {
    assert.equal(riga(st({ docker: "no" }), "docker").livello, "errore");
    assert.equal(riga(st({ post_create: "nessuno" }), "post_create").livello, "errore");
    assert.equal(riga(st({ post_create: "solo_pytest" }), "post_create").livello, "avviso");
    assert.equal(riga(st({ immagine: "latest" }), "immagine").livello, "avviso");
    assert.equal(riga(st({ porte: "no" }), "porte").livello, "avviso");
    assert.equal(riga(st({ estensioni: "no" }), "estensioni").livello, "avviso");
    assert.equal(riga(st({ segreto: "assente" }), "segreto").livello, "avviso");
    assert.equal(esame(sc, st({ segreto: "in_chiaro" })).verdetto, "bloccante");
    assert.equal(esame(sc, st({ docker: "no" })).verdetto, "errore");
    assert.equal(esame(sc, st({ porte: "no" })).verdetto, "avviso");
    for (const o of sc.oggetti) {
      const testi = new Set(o.valori.map((v) => tutto([riga(st({ [o.id]: v.id }), o.id), componi(sc, st({ [o.id]: v.id }))])));
      assert.equal(testi.size, o.valori.length, `ogni variante di ${o.id} cambia terminale e file`);
    }
    // il segreto in chiaro e' bloccante anche se tutto il resto e' giusto
    const e = esame(sc, st({ segreto: "in_chiaro" }));
    assert.equal(e.conteggi.bloccante, 1);
    assert.equal(e.conteggi.ok, sc.oggetti.length - 1);
  });

  prova(`[${lingua}] valigia_lab: il file da sistemare dell'esercizio 12 e' riprodotto e bocciato`, () => {
    const p = st(sc.preset.da_sistemare);
    const f = componi(sc, p);
    assert.equal(f.image, "mcr.microsoft.com/devcontainers/python:latest");
    assert.deepEqual(f.hostRequirements, { cpus: 8 });
    assert.deepEqual(Object.keys(f.containerEnv), ["GROQ_API_KEY"]);
    assert.ok(!("features" in f) && !("postCreateCommand" in f) && !("secrets" in f));
    assert.deepEqual(f.forwardPorts, [8000]);
    assert.equal(apertura(sc, p).find((r) => r.id === "porte").livello, "avviso");
    assert.equal(esame(sc, p).verdetto, "bloccante");
    assert.ok(!/sk-|gsk_|ghp_/.test(testoFile(sc, p)), "nessuna forma di chiave vera, solo segnaposto");
  });

  prova(`[${lingua}] valigia_lab: i numeri citati coincidono con il piano gratuito (120 ore-core)`, () => {
    assert.equal(sc.quota_ore_core, 120);
    assert.deepEqual([2, 4, 8].map((c) => numeri(sc, st({ macchina: String(c) })).ore), [60, 30, 15]);
    assert.ok(riga(st({ macchina: "2" }), "macchina").terminale.includes("60"));
    assert.ok(riga(st({ macchina: "8" }), "macchina").terminale.includes("15"));
    assert.ok(sc.casi.find((c) => c.id === "k4").spiega.includes("120") && sc.casi.find((c) => c.id === "k4").testo.includes("15"));
    const narr = L.segmenti.map((x) => x.narrazione.join(" ")).join(" ");
    assert.ok(narr.includes("pytest==8.3.4") && narr.includes("docker-in-docker:2") && narr.includes("8000") && narr.includes("8025"));
  });

  prova(`[${lingua}] valigia_lab: testi che stanno nei riquadri, niente segnaposto ne' stringhe vuote`, () => {
    for (const o of sc.oggetti) for (const v of o.valori) {
      if (v.frammento) assert.ok(aCapo(v.frammento, sc.a_capo_frammento).length <= 2, `frammento lungo: ${v.frammento}`);
      for (const c of ["2", "4", "8"]) {
        const r = riga(st({ [o.id]: v.id, macchina: o.id === "macchina" ? v.id : c }), o.id);
        assert.ok(aCapo(r.terminale, sc.a_capo_terminale).length <= 2, `uscita troppo lunga: ${r.terminale}`);
        assert.ok(r.comando.length <= 56, `comando troppo lungo: ${r.comando}`);
        for (const t of [r.terminale, r.perche, r.comando]) assert.ok(t && !/\{\w+\}/.test(t), t);
      }
      assert.ok(aCapo(`${o.nome} · ${v.nome}`, 48).length === 1, `titolo della riga lungo: ${o.nome} · ${v.nome}`);
    }
    for (const c of sc.casi) assert.ok(aCapo(c.testo, sc.a_capo_sintomo).length <= 2, `sintomo ${c.id} troppo lungo`);
    const vuote = [];
    const giro = (x, p) => { if (typeof x === "string") { if (!x.trim()) vuote.push(p); } else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) giro(v, `${p}.${k}`); };
    giro({ ...sc, oggetti: sc.oggetti.map((o) => ({ ...o, valori: o.valori.map(({ frammento, ...r }) => r) })) }, "scenario");
    assert.deepEqual(vuote, []);
  });

  prova(`[${lingua}] valigia_lab: "Trova il difetto" con riscontro spiegato`, () => {
    const vuoto = verifica(sc, st({ vista: "decidi" }));
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    const migliori = Object.fromEntries(sc.casi.map((c) => [c.id, c.migliore]));
    assert.equal(verifica(sc, st({ vista: "decidi", scelte: migliori })).giuste, sc.casi.length);
    for (const c of sc.casi) assert.ok(chiaviOggetti(sc).includes(c.migliore), c.id);
    const misto = verifica(sc, st({ vista: "decidi", scelte: { ...migliori, k2: "immagine", k5: "porte" } }));
    assert.equal(misto.righe.find((r) => r.id === "k2").esito, "quasi");
    assert.equal(misto.righe.find((r) => r.id === "k5").esito, "sbagliato");
    for (const r of [...vuoto.righe, ...misto.righe]) assert.ok(!/\{\w+\}/.test(r.testo), r.testo);
  });

  prova(`[${lingua}] valigia_lab: lo stato sconosciuto viene rifiutato`, () => {
    assert.throws(() => validaStato(sc, base, { colore: "rosso" }), /chiave non prevista/);
    assert.throws(() => validaStato(sc, base, { docker: "forse" }), /valore sconosciuto/);
    assert.throws(() => validaStato(sc, base, { vista: "altro" }), /vista sconosciuta/);
    assert.throws(() => validaStato(sc, base, { scelte: { k1: "niente" } }), /oggetto sconosciuto/);
  });
}
