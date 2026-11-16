// Prove della lezione PO1.2 "Il container che dimentica" (Officina O1, logica pura, entrambe le lingue).
import { simula, yamlVolume, yamlCompose, avvio, esitoAvvio, raggiungibilita, verificaDifetto, caratteriIn, aCapo, riempi } from "../../webapp/animazioni/container_smemorato.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("container_smemorato.json"), lingua);
  const sc = L.scenario;
  const seg = (id) => L.segmenti.find((x) => x.id === id);
  const narr = (id) => seg(id).narrazione.join(" ") + " " + (seg(id).prova || "");
  const base = { ...seg("porte").stato_animazione };
  const st = (d) => ({ ...base, ...d });
  const segnaposto = /\{\w+\}/;
  const tre = ["post", "post", "post"];

  prova(`[${lingua}] container_smemorato: segmenti validi, stesse chiavi, riassunto in 3 frasi senza prova`, () => {
    const chiavi = Object.keys(L.segmenti[0].stato_animazione).sort().join();
    for (const s of L.segmenti) {
      const a = s.stato_animazione;
      assert.equal(Object.keys(a).sort().join(), chiavi, s.id);
      const sim = simula(sc, a.montaggio, a.azioni);
      for (const p of sim.passi) assert.ok(!segnaposto.test(p.testo), p.testo);
      for (const e of avvio(sc, a).eventi) assert.ok(!segnaposto.test(e.testo), e.testo);
      for (const c of s.concetti) assert.ok(["CO03", "CO04"].includes(c), `${s.id}: concetto ${c} fuori pillola`);
    }
    const ultimo = L.segmenti.at(-1);
    assert.equal(ultimo.id, "riassunto");
    assert.equal(ultimo.narrazione.length, 3);
    assert.ok(!ultimo.prova);
    for (const s of L.segmenti.slice(0, -1)) assert.ok(s.prova, `${s.id}: manca il Prova tu`);
  });

  prova(`[${lingua}] container_smemorato: i numeri del testo sono quelli dello scenario`, () => {
    const A = sc.avvio;
    assert.equal(A.db_pronto_s, 8);
    assert.equal(A.crm_avvio_s + A.crm_collega_dopo_s, 2);
    assert.equal(A.intervallo_s, 2);
    assert.ok(narr("salute").includes(`${A.db_pronto_s}`) && narr("salute").includes(`${A.intervallo_s}`));
    const crm = avvio(sc, st({ attesa: "nessuna" })).eventi.find((e) => e.tipo === "errore");
    assert.equal(crm.t, A.crm_avvio_s + A.crm_collega_dopo_s);
    assert.ok(narr("smemorato").includes("3") && seg("smemorato").stato_animazione.azioni.length === 3);
    assert.ok(narr("porte").includes(`db:${sc.porte.db}`) && narr("porte").includes(`127.0.0.1:${sc.porte.crm}:${sc.porte.crm}`));
    assert.ok(/illustrativ|illustration/i.test(sc.testi.nota_tempi));
  });

  prova(`[${lingua}] container_smemorato: senza volume restart conserva, down cancella`, () => {
    const s = simula(sc, "nessuno", [...tre, "restart", "down_up"]);
    assert.deepEqual(s.passi.map((p) => p.visibili), [1, 2, 3, 3, 0]);
    assert.equal(s.passi[3].tipo, "ok");
    assert.equal(s.passi[4].persi, 3);
    assert.equal(s.passi[4].tipo, "errore");
    assert.equal(s.finale.gen, 2, "down + up crea un container nuovo");
  });

  prova(`[${lingua}] container_smemorato: volume anonimo orfano, nominato che sopravvive, down -v che cancella`, () => {
    const an = simula(sc, "anonimo", [...tre, "down_up"]);
    assert.equal(an.finale.visibili, 0);
    assert.equal(an.finale.orfani, 3);
    const anV = simula(sc, "anonimo", [...tre, "down_v_up"]);
    assert.equal(anV.finale.orfani, 0);
    assert.equal(anV.passi.at(-1).persi, 3);
    const no = simula(sc, "nominato", [...tre, "down_up", "restart"]);
    assert.equal(no.finale.visibili, 3);
    assert.equal(no.passi[3].tipo, "ok");
    const noV = simula(sc, "nominato", [...tre, "down_v_up"]);
    assert.equal(noV.finale.visibili, 0);
    assert.equal(noV.passi.at(-1).tipo, "avviso");
    assert.equal(simula(sc, "nominato", []).passi.length, 0);
    assert.throws(() => simula(sc, "nominato", ["boh"]));
    // ogni montaggio da' un esito diverso alla stessa sequenza
    const esiti = new Set(["nessuno", "anonimo", "nominato"].map((m) => simula(sc, m, [...tre, "down_up"]).passi.at(-1).testo));
    assert.equal(esiti.size, 3);
  });

  prova(`[${lingua}] container_smemorato: YAML coerente con le scelte`, () => {
    assert.ok(!yamlVolume(sc, "nessuno").some((r) => r.includes("volumes")));
    assert.ok(yamlVolume(sc, "anonimo").includes("      - /app/dati"));
    const nom = yamlVolume(sc, "nominato");
    assert.ok(nom.includes("      - dati_crm:/app/dati") && nom.includes("  dati_crm:"));
    const y = (d) => yamlCompose(sc, st(d)).join("\n");
    assert.ok(y({ porta: "locale" }).includes("127.0.0.1:8000:8000") && !y({ porta: "tutte" }).includes("127.0.0.1"));
    assert.ok(y({ attesa: "salute" }).includes("condition: service_healthy") && y({ attesa: "salute" }).includes(`interval: ${sc.avvio.intervallo_s}s`));
    assert.ok(!y({ attesa: "nessuna" }).includes("condition") && y({ attesa: "nessuna" }).includes("depends_on: [db]"));
    assert.ok(y({ porta_db: "tutte" }).includes("5432:5432") && !y({ porta_db: "nessuna" }).includes("5432:5432"));
    assert.ok(y({ salute_crm: true }).includes("/salute") && !y({ salute_crm: false }).includes("/salute"));
    for (const d of [{}, { attesa: "salute", salute_crm: true, porta_db: "tutte" }]) assert.ok(!segnaposto.test(y(d)));
    assert.ok(yamlCompose(sc, st({ attesa: "salute", salute_crm: true, porta_db: "tutte" })).length * 13 + 30 + 40 <= 420, "YAML dentro la scena");
  });

  prova(`[${lingua}] container_smemorato: senza condizione il CRM parte troppo presto, con la salute aspetta`, () => {
    const no = avvio(sc, st({ attesa: "nessuna" }));
    assert.equal(no.finale.crm, "uscito");
    assert.ok(!no.finale.ok);
    assert.equal(esitoAvvio(sc, st({ attesa: "nessuna" }))[0].tipo, "errore");
    const si = avvio(sc, st({ attesa: "salute", salute_crm: false }));
    assert.ok(si.finale.ok);
    const parte = si.eventi.find((e) => e.servizio === "crm" && e.stato === "avviato");
    assert.ok(parte.t >= sc.avvio.db_pronto_s, "il CRM parte solo dopo che il db e' pronto");
    assert.equal(si.eventi.filter((e) => e.servizio === "db" && e.stato === "non_pronto").length, sc.avvio.db_pronto_s / sc.avvio.intervallo_s);
    assert.equal(esitoAvvio(sc, st({ attesa: "salute", salute_crm: false }))[1].tipo, "avviso");
    const sano = avvio(sc, st({ attesa: "salute", salute_crm: true }));
    assert.equal(sano.finale.crm, "healthy");
    assert.ok(sano.eventi.at(-1).t <= sc.avvio.durata_s, "gli eventi stanno nella linea del tempo");
    for (const e of [...no.eventi, ...sano.eventi]) assert.ok(e.t >= 0 && e.t <= sc.avvio.durata_s);
  });

  prova(`[${lingua}] container_smemorato: chi raggiunge chi`, () => {
    const r = (d) => Object.fromEntries(raggiungibilita(sc, st(d)).map((x) => [x.id, x]));
    assert.ok(r({ porta: "tutte" }).altro_crm.ok && r({ porta: "tutte" }).altro_crm.tipo === "avviso");
    assert.ok(!r({ porta: "locale" }).altro_crm.ok && r({ porta: "locale" }).tu_crm.ok);
    assert.ok(r({}).crm_db.ok, "il CRM raggiunge il db per nome anche senza porte pubblicate");
    assert.equal(r({ porta_db: "tutte" }).fuori_db.tipo, "errore");
    assert.ok(!r({ porta_db: "nessuna" }).fuori_db.ok);
    for (const x of raggiungibilita(sc, st({}))) assert.ok(!segnaposto.test(x.testo));
  });

  prova(`[${lingua}] container_smemorato: «trova il difetto» sul compose`, () => {
    const difetti = sc.difetto.righe.filter((r) => r.difetto).map((r) => r.id);
    assert.deepEqual(difetti, ["d4", "d6", "d7", "d14"]);
    assert.ok(sc.difetto.righe.filter((r) => r.difetto).every((r) => r.selezionabile));
    const giusto = verificaDifetto(sc, Object.fromEntries(difetti.map((d) => [d, true])));
    assert.ok(giusto.perfetto);
    const falso = verificaDifetto(sc, { d4: true, d15: true, d12: true });
    assert.equal(falso.trovati, 1);
    assert.equal(falso.falsi, 2);
    assert.ok(!segnaposto.test(falso.sintesi));
    assert.equal(verificaDifetto(sc, {}).righe.length, sc.difetto.righe.filter((r) => r.selezionabile).length);
  });

  prova(`[${lingua}] container_smemorato: i testi della scena stanno nei loro riquadri (stima dei caratteri)`, () => {
    const E = sc.etichette, T = sc.testi;
    const maxNodo = caratteriIn(168 - 12, 10, "testo");
    for (const k of ["servizio_db", "servizio_crm", "stato_coda", "stato_attende", "stato_non_pronto", "stato_pronto", "stato_healthy", "stato_avviato", "stato_running", "stato_uscito"]) assert.ok(E[k].length <= maxNodo, `${k}: ${E[k]}`);
    for (const k of ["client_tu", "client_altro"]) assert.ok(aCapo(E[k], caratteriIn(120 - 10, 9.5, "testo")).length <= 2, k);
    for (const a of sc.azioni) assert.ok(a.breve.length <= caratteriIn(64 - 6, 9, "mono"), a.id);
    assert.ok(riempi(T.chip_get, { n: 10 }).length <= caratteriIn(64 - 6, 10, "testo"));
    assert.ok(riempi(T.contenitore_n, { n: 11 }).length <= caratteriIn(138, 10, "testo"));
    for (const k of ["volume_anonimo", "volume_nominato"]) assert.ok(E[k].length <= caratteriIn(120, 10, "testo"), k);
    assert.ok(E.orfano.length <= caratteriIn(118, 9.5, "testo") && aCapo(E.nessun_volume, caratteriIn(130, 9.5, "testo")).length <= 4);
    for (const r of sc.difetto.righe) assert.ok(r.codice.length <= caratteriIn(688 - 150 - 40, 10, "mono"), r.id);
    const tutte = yamlCompose(sc, st({ attesa: "salute", salute_crm: true, porta_db: "tutte" }));
    for (const r of [...tutte, ...yamlVolume(sc, "nominato")]) assert.ok(r.length <= caratteriIn(318 - 16, 9.5, "mono"), r);
    assert.ok(E.linea_tempo.length <= caratteriIn(696 - 352, 9.5, "testo") && E.rete.length <= caratteriIn(196 - 16, 9.5, "testo"));
  });

  prova(`[${lingua}] container_smemorato: nessun testo vuoto e nessun appello ad autorita'`, () => {
    const tutto = JSON.stringify(L);
    const vuote = [];
    const visita = (x, dove) => { if (typeof x === "string") { if (!x.trim()) vuote.push(dove); } else if (x && typeof x === "object") for (const [k, v] of Object.entries(x)) visita(v, `${dove}.${k}`); };
    visita(L, "lezione");
    assert.deepEqual(vuote, [], "stringhe vuote");
    assert.ok(!/(Google|OpenAI|Anthropic|Microsoft) (dice|propone|says)/i.test(tutto));
    assert.ok(!/come (gi[aà]|abbiamo) (spiegato|visto|detto)|as (already )?(explained|seen|mentioned)/i.test(tutto));
  });
}
