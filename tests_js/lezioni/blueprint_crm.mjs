// Prove della lezione P8.6 "Il blueprint finale: assembla l'agente CRM" (logica pura, entrambe le lingue).
import { valutaBlueprint, tratti, posizioni, aCapo, DIMENSIONI } from "../../webapp/animazioni/blueprint_crm.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("blueprint_crm.json"), lingua);
  const sc = L.scenario;
  const ids = sc.sezioni.map((x) => x.id);
  const esempio = sc.preset.esempio;

  prova(`[${lingua}] blueprint_crm: dati coerenti, segmenti validi, riassunto in 3 frasi`, () => {
    assert.equal(sc.sezioni.length, 9, "regole non negoziabili + 8 sezioni");
    const tuttiTratti = new Set(sc.sezioni.flatMap((s) => s.blocchi.flatMap((b) => b.tratti)));
    for (const r of sc.regole) {
      for (const x of [...r.quando, ...r.salvo]) assert.ok(tuttiTratti.has(x), `${r.id}: tratto ${x} inesistente`);
      for (const s of r.sezioni) assert.ok(ids.includes(s), `${r.id}: sezione ${s}`);
      assert.ok(r.fonte && ["rosso", "giallo"].includes(r.gravita));
    }
    for (const [nome, p] of Object.entries(sc.preset)) for (const [s, b] of Object.entries(p)) assert.ok(sc.sezioni.find((x) => x.id === s).blocchi.some((x) => x.id === b), `${nome}: ${s}/${b}`);
    for (const seg of L.segmenti) valutaBlueprint(sc, seg.stato_animazione.scelte);
    assert.deepEqual(sc.sdd.flatMap((c) => c.sezioni).sort(), [...ids].sort(), "ogni parte ha una colonna nella vista SDD");
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });

  prova(`[${lingua}] blueprint_crm: l'esempio guidato e' coerente, il vuoto no`, () => {
    const v = valutaBlueprint(sc, esempio);
    assert.ok(v.coerente, JSON.stringify(v.avvisi.map((r) => r.id)));
    assert.equal(v.avvisi.length, 0);
    const vuoto = valutaBlueprint(sc, {});
    assert.equal(vuoto.verdi, 0);
    assert.ok(Object.values(vuoto.semafori).every((x) => x === "vuoto"));
  });

  prova(`[${lingua}] blueprint_crm: il blueprint difettoso (D8.6-a) accende gli avvisi giusti`, () => {
    const v = valutaBlueprint(sc, sc.preset.difettoso);
    const scattate = new Set(v.avvisi.map((r) => r.id));
    for (const id of ["r_invio_auto", "r_registro", "r_nessun_set", "r_segreto", "r_memoria_scadenza", "r_scrittura_senza_rischio", "r_rilascio_totale", "r_rischio_kpi", "r_budget"]) assert.ok(scattate.has(id), id);
    assert.equal(v.semafori.autonomia, "rosso");
    assert.equal(v.semafori.governance, "rosso");
    assert.equal(v.semafori.kpi, "giallo");
    assert.ok(!v.coerente);
  });

  prova(`[${lingua}] blueprint_crm: regole incrociate tra sezioni`, () => {
    const cross = valutaBlueprint(sc, { ...esempio, strumenti: "str_tutti" });
    assert.ok(cross.avvisi.some((r) => r.id === "r_approvazione_senza_rischio"));
    assert.equal(cross.semafori.autonomia, "rosso", "l'autonomia diventa rossa per colpa degli strumenti");
    const versioni = valutaBlueprint(sc, { ...esempio, istruzioni: "istr_libere" });
    assert.ok(versioni.avvisi.some((r) => r.id === "r_canary_senza_versioni"));
    assert.equal(versioni.semafori.governance, "rosso");
    const privacy = valutaBlueprint(sc, { ...esempio, memoria: "mem_condivisa" });
    assert.equal(privacy.semafori.regole, "rosso", "le regole dichiarano la privacy ma la memoria la contraddice");
  });

  prova(`[${lingua}] blueprint_crm: cambiare un blocco cambia il semaforo della sua parte`, () => {
    for (const sez of sc.sezioni) {
      const colori = new Set(sez.blocchi.map((b) => valutaBlueprint(sc, { ...esempio, [sez.id]: b.id }).semafori[sez.id]));
      assert.ok(colori.has("verde") && colori.size >= 2, `${sez.id}: ${[...colori]}`);
    }
    const kpi = (b) => valutaBlueprint(sc, { ...esempio, kpi: b }).semafori.kpi;
    assert.equal(kpi("kpi_vanitoso"), "rosso");
    assert.equal(kpi("kpi_solo"), "giallo");
    assert.ok(tratti(sc, { governance: "gov_buona" }).has("budget"));
  });

  prova(`[${lingua}] blueprint_crm: parti dentro la scena in entrambe le viste, a capo corretto`, () => {
    for (const vista of ["tavola", "sdd"]) {
      const p = posizioni(sc, vista);
      assert.deepEqual(Object.keys(p).sort(), [...ids].sort());
      for (const q of Object.values(p)) assert.ok(q.x >= 0 && q.x + DIMENSIONI.boxW <= DIMENSIONI.w && q.y >= 0 && q.y + DIMENSIONI.boxH <= DIMENSIONI.h, `${vista} ${JSON.stringify(q)}`);
      assert.deepEqual(p, posizioni(sc, vista));
    }
    for (const s of sc.sezioni) for (const b of s.blocchi) for (const r of aCapo(b.breve, sc.a_capo_caratteri, 2)) assert.ok(r.length <= sc.a_capo_caratteri, r);
    assert.deepEqual(aCapo("uno due tre", 7, 2), ["uno due", "tre"]);
    assert.equal(aCapo("aaaa bbbb cccc dddd", 4, 2).length, 2);
  });
}
