// Prove della lezione P3.1 "Mappare il processo e i contratti dati" (logica pura, entrambe le lingue).
import { percorri, esito, provaCatena } from "../../webapp/animazioni/pipeline_lead.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("pipeline_lead.json"), lingua);
  const sc = L.scenario;
  const tutte = Object.fromEntries(sc.stazioni.map((x) => [x.id, true]));
  const base = { passo: 6, attive: tutte, flusso: "completo", mappatura: "giusta", prova_catena: false, stazione_aperta: "pulizia" };
  const st = (diff) => ({ ...base, ...diff, attive: { ...tutte, ...(diff.attive || {}) } });
  const stato = (p, id) => p.stazioni.find((x) => x.id === id).stato;
  const senzaSegnaposto = (t) => assert.ok(!/\{\w+\}/.test(t), t);

  prova(`[${lingua}] pipeline_lead: ogni segmento produce un viaggio valido; riassunto in 3 frasi; contratti coerenti`, () => {
    for (const seg of L.segmenti) {
      const p = percorri(sc, seg.stato_animazione);
      assert.equal(p.stazioni.length, sc.stazioni.length);
      const e = esito(sc, seg.stato_animazione, p);
      senzaSegnaposto(e.testo);
      e.righe.forEach(senzaSegnaposto);
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
    // ogni campo richiesto da una stazione nasce nel modulo o in una stazione precedente
    const visti = new Set(sc.ingresso);
    for (const s of sc.stazioni) {
      for (const c of s.ingresso) assert.ok(visti.has(c), `${s.id} richiede ${c} che nessuno consegna prima`);
      s.uscita.forEach((c) => visti.add(c));
    }
  });
  prova(`[${lingua}] pipeline_lead: tutte accese, il lead arriva nel CRM e la scheda cresce passo dopo passo`, () => {
    const lunghezze = [0, 1, 2, 3, 4, 5, 6].map((k) => percorri(sc, st({ passo: k })).scheda.length);
    for (let k = 1; k < lunghezze.length; k++) assert.ok(lunghezze[k] > lunghezze[k - 1], `la scheda non cresce al passo ${k}`);
    const fine = percorri(sc, st({}));
    assert.ok(fine.stazioni.every((x) => x.stato === "ok"));
    assert.equal(esito(sc, base, fine).tipo, "ok");
    assert.equal(esito(sc, st({ passo: 2 }), percorri(sc, st({ passo: 2 }))).tipo, "in_corso");
  });
  prova(`[${lingua}] pipeline_lead: spegnere una stazione accende di rosso quella dopo e ferma il lead`, () => {
    const p = percorri(sc, st({ attive: { arricchimento: false } }));
    assert.equal(stato(p, "arricchimento"), "spenta");
    assert.equal(stato(p, "punteggio"), "mancante");
    assert.deepEqual(p.stazioni.find((x) => x.id === "punteggio").mancanti, ["settore", "dimensione", "gia_cliente"]);
    assert.equal(stato(p, "crm"), "non_raggiunta");
    const e = esito(sc, st({ attive: { arricchimento: false } }), p);
    assert.equal(e.tipo, "fermo");
    assert.equal(e.righe.length, 1);
    const c = percorri(sc, st({ attive: { classificazione: false } }));
    assert.equal(stato(c, "crm"), "mancante");
    assert.equal(p.posizione, 3, "il lead si ferma alla stazione rossa");
    // prima di arrivarci il lead non sa ancora di essere fermo
    assert.equal(esito(sc, st({ passo: 1, attive: { arricchimento: false } }), percorri(sc, st({ passo: 1, attive: { arricchimento: false } }))).tipo, "in_corso");
  });
  prova(`[${lingua}] pipeline_lead: CRM spento = arriva in fondo con un avviso; la prova della catena trova il campo mancante`, () => {
    const s = st({ attive: { crm: false } });
    assert.equal(esito(sc, s, percorri(sc, s)).tipo, "avviso");
    const c = provaCatena(sc, s);
    assert.equal(c.esito, "ko");
    c.righe.forEach(senzaSegnaposto);
    assert.equal(provaCatena(sc, st({ attive: { pulizia: false } })).esito, "interrotta");
  });
  prova(`[${lingua}] pipeline_lead: flusso da tutorial, stazioni assenti e danni elencati`, () => {
    const s = st({ flusso: "tutorial" });
    const p = percorri(sc, s);
    for (const id of sc.tutorial.assenti) assert.equal(stato(p, id), "assente");
    assert.ok(p.stazioni.filter((x) => !sc.tutorial.assenti.includes(x.id)).every((x) => x.stato === "ok"));
    const e = esito(sc, s, p);
    assert.equal(e.tipo, "tutorial");
    assert.equal(e.righe.length, sc.tutorial.assenti.length);
    assert.ok(!p.disponibili.has("categoria"), "senza classificazione la risposta non ha categoria");
    assert.notEqual(p.disponibili.get("stato_crm").valore, percorri(sc, base).disponibili.get("stato_crm").valore);
    assert.equal(provaCatena(sc, s).esito, "ko");
  });
  prova(`[${lingua}] pipeline_lead: mappatura sbagliata, tutto verde ma la catena trova l'errore alla radice; determinismo`, () => {
    const s = st({ mappatura: "sbagliata" });
    const p = percorri(sc, s);
    assert.ok(p.stazioni.every((x) => x.stato === "ok"), "ogni stazione supera il suo controllo");
    const c = provaCatena(sc, s);
    assert.equal(c.esito, "ko");
    assert.equal(c.radice, "pulizia");
    c.righe.forEach(senzaSegnaposto);
    assert.equal(provaCatena(sc, base).esito, "ok");
    assert.deepEqual(percorri(sc, s).scheda, percorri(sc, s).scheda);
  });
}
