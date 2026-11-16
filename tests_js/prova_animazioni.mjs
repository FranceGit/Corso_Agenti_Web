// Test della logica delle animazioni delle lezioni (solo Node, nessuna dipendenza).
// Uso, dalla radice del progetto:  node tests_js/prova_animazioni.mjs
// Qui sotto le prove delle due lezioni del dimostratore; le prove di ogni altra lezione stanno in
// tests_js/lezioni/<componente>.mjs (un file per lezione, export default function(ctx)) e vengono eseguite tutte.
// Verifica, in entrambe le lingue, che ogni segmento e ogni combinazione significativa di comandi produca
// un piano coerente: nessun segnaposto senza valore, decisioni diverse quando cambiano obiettivo o dati.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { pianifica as pianificaCiclo, calcolaPunteggio } from "../webapp/animazioni/ciclo_agente.js";
import { pianifica as pianificaStrumenti } from "../webapp/animazioni/strumenti_agente.js";

const radice = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const leggi = (nome) => JSON.parse(fs.readFileSync(path.join(radice, "dati", "lezioni", nome), "utf8"));
function risolvi(x, l) {
  if (x && typeof x === "object" && !Array.isArray(x) && Object.keys(x).sort().join() === "en,it") {
    assert.ok(x[l], `testo mancante in ${l}: ${JSON.stringify(x)}`);
    return x[l];
  }
  if (Array.isArray(x)) return x.map((v) => risolvi(v, l));
  if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, risolvi(v, l)]));
  return x;
}
let prove = 0;
const prova = (nome, fn) => { fn(); prove += 1; console.log("ok -", nome); };

for (const lingua of ["it", "en"]) {
  const A = risolvi(leggi("ciclo_agente.json"), lingua);
  const sc = A.scenario;
  const base = A.segmenti[0].stato_animazione;
  const piano = (diff) => pianificaCiclo(sc, { ...base, ...diff });

  prova(`[${lingua}] ciclo: ogni segmento produce un piano completo`, () => {
    for (const seg of A.segmenti) {
      const p = pianificaCiclo(sc, seg.stato_animazione);
      assert.ok(p.eventi.length > 0 && p.esito.testo);
      for (const ev of p.eventi) assert.ok(!/\{\w+\}/.test(ev.testo), `segnaposto non risolto: ${ev.testo}`);
    }
  });
  prova(`[${lingua}] ciclo: cambiare i dati cambia la decisione`, () => {
    assert.notEqual(piano({}).esito.testo, piano({ visite: 0, ruolo: "stagista" }).esito.testo);
    assert.equal(calcolaPunteggio(sc, { ...base, visite: 0, ruolo: "stagista" }).livello, "freddo");
    assert.equal(calcolaPunteggio(sc, { ...base, visite: 10, ruolo: "direttore", ha_risposto: true }).livello, "caldo");
  });
  prova(`[${lingua}] ciclo: cambiare l'obiettivo cambia il lavoro`, () => {
    const esiti = new Set(["qualifica", "call", "ordine"].map((o) => piano({ obiettivo: o }).esito.testo));
    assert.equal(esiti.size, 3);
    const ordine = piano({ obiettivo: "ordine" });
    assert.ok(!ordine.eventi.some((e) => e.strumento === "email" || e.strumento === "calendario"), "con 'tenere in ordine' nessun contatto");
  });
  prova(`[${lingua}] ciclo: osservare il CRM evita di scrivere a un cliente`, () => {
    const agente = piano({ gia_cliente: true });
    assert.ok(!agente.eventi.some((e) => e.strumento === "calendario"));
    const script = piano({ gia_cliente: true, modalita: "script" });
    assert.ok(script.script && script.esito.errori.length >= 1);
  });
  prova(`[${lingua}] ciclo: guasto e limite di giri fermano l'agente`, () => {
    const guasto = piano({ crm_guasto: true });
    assert.equal(guasto.eventi.filter((e) => e.stato === "errore" && e.stazione === "agisce").length, sc.tentativi_crm);
    assert.equal(guasto.esito.tipo, "avviso");
    const limite = piano({ limite_giri: 1 });
    assert.ok(limite.fermatoDalLimite);
    assert.equal(limite.eventi.filter((e) => e.stazione === "agisce").length, 1);
  });

  const B = risolvi(leggi("strumenti_agente.json"), lingua);
  const tutti = Object.fromEntries(B.scenario.strumenti.map((s) => [s.id, "collegato"]));
  const stato = (diff) => ({ compito: "qualifica", strumenti: { ...tutti }, permesso_scrittura: true, comportamento: "onesto", ...diff });
  const pB = (diff) => pianificaStrumenti(B.scenario, stato(diff));

  prova(`[${lingua}] strumenti: ogni segmento produce un piano completo`, () => {
    for (const seg of B.segmenti) {
      const p = pianificaStrumenti(B.scenario, seg.stato_animazione);
      assert.ok(p.eventi.length > 0 && p.finale);
      for (const ev of p.eventi) if (ev.testo) assert.ok(!/\{\w+\}/.test(ev.testo), `segnaposto non risolto: ${ev.testo}`);
    }
  });
  prova(`[${lingua}] strumenti: con tutto collegato ogni compito riesce`, () => {
    for (const c of B.scenario.compiti) assert.equal(pB({ compito: c.id }).finale, "ok");
  });
  prova(`[${lingua}] strumenti: strumento indispensabile mancante, facoltativo mancante, permesso, guasto`, () => {
    assert.equal(pB({ strumenti: { ...tutti, aggiorna_crm: "scollegato" } }).finale, "parziale");
    assert.equal(pB({ strumenti: { ...tutti, cerca_web: "scollegato" } }).finale, "limitato");
    assert.equal(pB({ permesso_scrittura: false }).finale, "approvazione");
    const guasto = pB({ compito: "call", strumenti: { ...tutti, calendario: "guasto" } });
    assert.equal(guasto.finale, "parziale");
    assert.equal(guasto.eventi.filter((e) => e.tipo === "esecuzione").length, 1 + B.scenario.tentativi_su_guasto);
  });
  prova(`[${lingua}] strumenti: l'agente che inventa viene smascherato`, () => {
    const p = pB({ comportamento: "inventa", strumenti: { ...tutti, aggiorna_crm: "scollegato" } });
    assert.equal(p.finale, "falso");
    assert.ok(p.spiegazioni.includes("inventato"));
  });
}

// Prove delle altre lezioni: un file per lezione, eseguito in entrambe le lingue.
const cartellaLezioni = path.join(radice, "tests_js", "lezioni");
const fileLezioni = fs.readdirSync(cartellaLezioni).filter((f) => f.endsWith(".mjs")).sort();
const componentiConLezione = fs.readdirSync(path.join(radice, "dati", "lezioni")).map((f) => JSON.parse(fs.readFileSync(path.join(radice, "dati", "lezioni", f), "utf8")).componente);
for (const comp of componentiConLezione) {
  if (["ciclo_agente", "strumenti_agente"].includes(comp)) continue;
  assert.ok(fileLezioni.includes(`${comp}.mjs`), `la lezione ${comp} non ha le sue prove in tests_js/lezioni/${comp}.mjs`);
}
for (const f of fileLezioni) {
  const mod = await import(new URL(`./lezioni/${f}`, import.meta.url));
  for (const lingua of ["it", "en"]) mod.default({ prova, risolvi, leggi, lingua, assert });
}
console.log(`\n${prove} prove superate`);
