// Prove della lezione P8.3 "Kill switch e fail-closed: la plancia di controllo" (logica pura, entrambe le lingue).
import { calcola, verifica, posizioni, righeRegistro, piuRestrittivo, DIMENSIONI } from "../../webapp/animazioni/plancia_controllo.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("plancia_controllo.json"), lingua);
  const sc = L.scenario;
  const base = L.segmenti[0].stato_animazione;
  const st = (diff) => ({ ...base, ...diff, clienti: { ...base.clienti, ...(diff.clienti || {}) }, agenti: { ...base.agenti, ...(diff.agenti || {}) }, strumenti: { ...base.strumenti, ...(diff.strumenti || {}) } });
  const cella = (c, a, k) => c.celle[a][k];

  prova(`[${lingua}] plancia_controllo: dati coerenti, segmenti validi, riassunto in 3 frasi`, () => {
    const esiti = new Set(sc.esiti.map((e) => e.id));
    for (const seg of L.segmenti) {
      const c = calcola(sc, seg.stato_animazione);
      assert.equal(c.tot, sc.agenti.length * sc.clienti.length * sc.carte_per_cella);
      for (const e of Object.values(c.celle).flatMap((r) => Object.values(r).flat())) assert.ok(esiti.has(e), e);
      assert.ok(sc.registro.some((r) => r.id === seg.stato_animazione.riga_aperta));
    }
    for (const a of sc.agenti) assert.ok(sc.strumenti.some((t) => t.id === a.strumento));
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
    for (const x of sc.situazioni) { assert.ok(x.opzioni.includes(x.migliore)); for (const q of x.quasi) assert.ok(x.opzioni.includes(q)); for (const o of x.opzioni) assert.ok(sc.opzioni_gioco[o], o); }
  });

  prova(`[${lingua}] plancia_controllo: i livelli fermano solo cio' che devono`, () => {
    assert.equal(calcola(sc, st({})).lavoro, calcola(sc, st({})).tot);
    const cli = calcola(sc, st({ clienti: { c2: "arresto" } }));
    for (const a of sc.agenti) { assert.ok(cella(cli, a.id, "c2").every((e) => e === "non_eseguita")); assert.ok(cella(cli, a.id, "c1").every((e) => e === "eseguita")); }
    const ag = calcola(sc, st({ agenti: { bozze: "arresto" } }));
    for (const c of sc.clienti) { assert.ok(cella(ag, "bozze", c.id).every((e) => e === "non_eseguita")); assert.ok(cella(ag, "qualifica", c.id).every((e) => e === "eseguita")); }
    const glob = calcola(sc, st({ globale: "arresto" }));
    assert.equal(glob.lavoro, 0);
    assert.equal(piuRestrittivo(sc, "esecuzione", "pausa", "esecuzione"), "pausa");
    assert.equal(piuRestrittivo(sc, "pausa", "arresto"), "arresto");
  });

  prova(`[${lingua}] plancia_controllo: circuit breaker sullo strumento, il resto continua`, () => {
    const c = calcola(sc, st({ strumenti: { invia_email: false } }));
    for (const cl of sc.clienti) { assert.ok(cella(c, "bozze", cl.id).every((e) => e === "spenta")); assert.ok(cella(c, "qualifica", cl.id).every((e) => e === "eseguita")); }
    // vale anche con il controllo solo all'avvio: lo strumento e' spento alla fonte
    const avvio = calcola(sc, st({ controllo: "avvio", strumenti: { invia_email: false } }));
    assert.ok(cella(avvio, "bozze", "c1").every((e) => e === "spenta"));
  });

  prova(`[${lingua}] plancia_controllo: pausa finisce la card in corso, arresto non esegue nulla`, () => {
    const p = calcola(sc, st({ clienti: { c1: "pausa" } }));
    assert.deepEqual(cella(p, "crm", "c1"), ["finita", "in_pausa", "in_pausa"]);
    const a = calcola(sc, st({ clienti: { c1: "arresto" } }));
    assert.deepEqual(cella(a, "crm", "c1"), ["non_eseguita", "non_eseguita", "non_eseguita"]);
  });

  prova(`[${lingua}] plancia_controllo: controllo solo all'avvio = arresto ignorato`, () => {
    const avvio = calcola(sc, st({ controllo: "avvio", globale: "arresto" }));
    assert.ok(avvio.problema > 0);
    assert.ok(cella(avvio, "bozze", "c1").every((e) => e === "violazione"));
    assert.ok(cella(avvio, "qualifica", "c1").every((e) => e === "eseguita"), "la sola lettura non e' una violazione");
    assert.equal(calcola(sc, st({ controllo: "ogni_azione", globale: "arresto" })).problema, 0);
  });

  prova(`[${lingua}] plancia_controllo: fail-closed nega gli effetti, fail-open lascia passare l'arresto`, () => {
    const closed = calcola(sc, st({ servizio_giu: true, guasto: "fail_closed", clienti: { c3: "arresto" } }));
    assert.equal(closed.problema, 0);
    assert.ok(cella(closed, "bozze", "c1").every((e) => e === "bloccata"));
    assert.ok(cella(closed, "qualifica", "c1").every((e) => e === "eseguita"));
    const open = calcola(sc, st({ servizio_giu: true, guasto: "fail_open", clienti: { c3: "arresto" } }));
    assert.ok(cella(open, "bozze", "c3").every((e) => e === "senza_controllo"));
    assert.ok(open.problema > 0);
  });

  prova(`[${lingua}] plancia_controllo: incidente contenere, smistare, risolvere`, () => {
    const allarme = calcola(sc, st({ incidente: true }));
    assert.ok(cella(allarme, "bozze", "c2").every((e) => e === "pericolo"));
    assert.ok(!allarme.fasi.contenere && !allarme.fasi.smistare && !allarme.fasi.risolvere);
    const contenuto = calcola(sc, st({ incidente: true, strumenti: { invia_email: false } }));
    assert.equal(contenuto.problema, 0);
    assert.ok(contenuto.fasi.contenere && contenuto.qualificaEseguite > 0, "la qualifica continua");
    const smistato = calcola(sc, st({ incidente: true, coda_umana: true }));
    assert.ok(cella(smistato, "bozze", "c2").every((e) => e === "coda_umana"));
    const risolto = calcola(sc, st({ incidente: true, correzione: true }));
    assert.ok(risolto.fasi.risolvere && risolto.fasi.contenere && risolto.problema === 0);
    assert.ok(!righeRegistro(sc, st({})).some((r) => r.incidente));
    assert.ok(righeRegistro(sc, st({ incidente: true })).some((r) => r.incidente));
  });

  prova(`[${lingua}] plancia_controllo: gioco con riscontro spiegato`, () => {
    const vuoto = verifica(sc, st({ vista: "decidi" }));
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    const migliori = Object.fromEntries(sc.situazioni.map((x) => [x.id, x.migliore]));
    assert.equal(verifica(sc, st({ scelte: migliori })).giuste, sc.situazioni.length);
    const misto = verifica(sc, st({ scelte: { ...migliori, s1: "cliente_arresto", s4: "fail_open" } }));
    assert.equal(misto.righe.find((r) => r.id === "s1").esito, "quasi");
    assert.equal(misto.righe.find((r) => r.id === "s4").esito, "sbagliato");
    for (const r of [...vuoto.righe, ...misto.righe]) assert.ok(!/\{\w+\}/.test(r.testo), r.testo);
  });

  prova(`[${lingua}] plancia_controllo: card dentro la scena, deterministiche`, () => {
    const p = posizioni(sc);
    for (const q of Object.values(p)) assert.ok(q.x >= 0 && q.x + DIMENSIONI.cartaW <= DIMENSIONI.w && q.y >= 0 && q.y + DIMENSIONI.cartaH <= DIMENSIONI.h, JSON.stringify(q));
    assert.deepEqual(p, posizioni(sc));
    assert.deepEqual(calcola(sc, st({ globale: "pausa" })), calcola(sc, st({ globale: "pausa" })));
  });
}
