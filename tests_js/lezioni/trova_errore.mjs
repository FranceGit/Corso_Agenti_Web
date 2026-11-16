// Prove del laboratorio P3.5 "Trova l'errore" (logica pura, entrambe le lingue).
import { regoleDi, converti, report, confronta, puntoErrore, valutaStazione, valoriStazioni, valutaCorrezione, valutaAbitudini, righeRegole } from "../../webapp/animazioni/trova_errore.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("trova_errore.json"), lingua);
  const sc = L.scenario;
  const giusti = Object.fromEntries(sc.risposte.map((r) => [r.id, r.giusta]));
  const senzaSegnaposto = (t) => assert.ok(!/\{\w+\}/.test(t), t);

  prova(`[${lingua}] trova_errore: laboratorio con segmenti "errore_", stati validi e riassunto in 3 frasi`, () => {
    assert.equal(L.tipo, "laboratorio");
    for (const seg of L.segmenti.slice(0, -1)) assert.ok(seg.id.startsWith("errore_"), seg.id);
    for (const seg of L.segmenti) {
      const r = report(sc, regoleDi(sc, seg.stato_animazione.correzione));
      assert.equal(r.n, sc.risposte.length);
      assert.ok(sc.risposte.some((x) => x.id === seg.stato_animazione.risposta_aperta));
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });
  prova(`[${lingua}] trova_errore: il bug reale, "Not Interested" contiene "Interested" e il report dice 100% interessati`, () => {
    const r = report(sc, sc.regole_bug);
    assert.equal(r.perc, 100);
    assert.ok(r.tuttiUguali);
    assert.ok(r.min >= 90 && r.max <= 92, "punteggi tutti fra 90 e 92 come nel report del repo");
    const marco = sc.risposte.find((x) => x.etichetta_llm === "Not Interested");
    const c = converti(sc.regole_bug, marco);
    assert.equal(c.categoria, "interessato");
    assert.equal(c.regola, 1, "la prima regola cattura anche Not Interested");
    const righe = righeRegole(sc, sc.regole_bug);
    assert.equal(righe[0].classe, "colpevole");
    assert.ok(righe.some((x) => x.mai), "almeno una regola non viene mai raggiunta");
    for (const x of righe) senzaSegnaposto(x.testo);
  });
  prova(`[${lingua}] trova_errore: le etichette dello studente si confrontano con il CRM`, () => {
    const vuoto = confronta(sc, {});
    assert.equal(vuoto.fatte, 0);
    assert.equal(vuoto.sbagliateCrm, 4, "4 risposte su 5 sono sbagliate nel CRM");
    const tutto = confronta(sc, giusti);
    assert.equal(tutto.giuste, tutto.totali);
  });
  prova(`[${lingua}] trova_errore: l'errore nasce nella conversione, non nell'LLM`, () => {
    for (const r of sc.risposte) {
      const p = puntoErrore(sc, r.id);
      if (r.giusta === "interessato") assert.equal(p, "");
      else assert.equal(p, "conversione", r.id);
      for (const st of sc.stazioni) senzaSegnaposto(valutaStazione(sc, r.id, st.id).testo);
      const v = valoriStazioni(sc, r.id);
      assert.equal(v.length, sc.stazioni.length);
      for (const x of v) senzaSegnaposto(x.valore);
    }
    assert.equal(valutaStazione(sc, "marco", "conversione").esito, "giusto");
    assert.equal(valutaStazione(sc, "marco", "llm").esito, "prima");
    assert.equal(valutaStazione(sc, "marco", "crm").esito, "dopo");
    assert.equal(valutaStazione(sc, "giulia", "crm").esito, "nessun_errore");
    assert.equal(valutaStazione(sc, "marco", "").esito, "scegli");
  });
  prova(`[${lingua}] trova_errore: solo la correzione completa sistema tutte le risposte`, () => {
    const esiti = Object.fromEntries(sc.correzioni.map((c) => [c.id, valutaCorrezione(sc, c.id)]));
    assert.equal(esiti.chiedi_llm.giuste, 1, "chiedere all'LLM non cambia nulla");
    assert.equal(esiti.rifai_report.giuste, 1);
    assert.equal(esiti.inverti.giuste, 3, "invertire l'ordine e' un mezzo rimedio: Maybe Interested e la disiscrizione restano sbagliate");
    assert.equal(esiti.esatta.giuste, 4, "senza la regola fissa la disiscrizione resta 'non interessato'");
    assert.equal(esiti.esatta_disiscrizione.giuste, 5);
    assert.equal(sc.correzioni.filter((c) => c.tipo === "giusta").length, 1);
    const vero = report(sc, regoleDi(sc, "esatta_disiscrizione"));
    assert.ok(!vero.tuttiUguali);
    assert.equal(vero.conteggi.disiscrizione, 1);
  });
  prova(`[${lingua}] trova_errore: un'etichetta mai vista va a una persona con il confronto esatto`, () => {
    const strana = { etichetta_llm: "interested ", chiede_disiscrizione: false };
    assert.equal(converti(regoleDi(sc, "esatta_disiscrizione"), strana).categoria, "umano");
    assert.equal(converti(sc.regole_bug, { etichetta_llm: "Not interested at all", chiede_disiscrizione: false }).categoria, "interessato");
    const disiscritta = { etichetta_llm: "Interested", chiede_disiscrizione: true };
    assert.equal(converti(regoleDi(sc, "esatta_disiscrizione"), disiscritta).categoria, "disiscrizione", "la regola fissa vince su qualunque etichetta");
  });
  prova(`[${lingua}] trova_errore: abitudini anti-errore e determinismo`, () => {
    const tutte = Object.fromEntries(sc.abitudini.map((a) => [a.id, true]));
    const a = valutaAbitudini(sc, tutte);
    assert.equal(a.buone, a.totaliBuone);
    assert.ok(a.cattive > 0);
    assert.deepEqual(valutaAbitudini(sc, {}).righe, []);
    assert.deepEqual(report(sc, sc.regole_bug), report(sc, sc.regole_bug));
  });
}
