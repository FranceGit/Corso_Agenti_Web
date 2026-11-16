// ALPHA-FIX (1) e (11): controllo che il testo non sbordi dai riquadri e che nessuna regola della shell finisca
// sopra le lezioni. Uso, dalla radice del progetto:  node tests_js/misura_testi.mjs
//
// Tre parti:
//  1. geometria (sempre): le etichette del ciclo di P1.3 (il caso del primo screenshot di France) misurate con la
//     stima dei caratteri del componente, in IT e EN, contro il riquadro della scena e i riquadri degli strumenti;
//  2. regole CSS (sempre): una classe della shell scritta "nuda" (es. .avvisi, .corpo) con posizione fissa o griglia
//     non deve coincidere con una classe usata dai componenti delle lezioni (il caso del secondo screenshot: la
//     .avvisi del blueprint P8.6 prendeva position:fixed dalla shell e copriva la tavola);
//  3. DOM simulato (se jsdom e' installato): ogni lezione montata in IT e EN con app.css, nessun elemento del banco
//     in posizione fissa; nel blueprint gli esiti della verifica stanno in un pannello proprio SOTTO la tavola,
//     con scorrimento interno.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const radice = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// lezioni del livello 1 e dell'Officina: cartelle lette dalla config (percorsi_file e officina)
const configPiattaforma = JSON.parse(fs.readFileSync(path.join(radice, "config", "piattaforma.json"), "utf8"));
const CARTELLE_LEZIONI = [configPiattaforma.percorsi_file.cartella_lezioni, configPiattaforma.officina.cartella_lezioni].map((c) => path.join(radice, c));
const fileLezione = (nome) => CARTELLE_LEZIONI.map((c) => path.join(c, nome)).find((f) => fs.existsSync(f));
const leggi = (nome) => JSON.parse(fs.readFileSync(fileLezione(nome), "utf8"));
function risolvi(x, l) {
  if (x && typeof x === "object" && !Array.isArray(x) && Object.keys(x).sort().join() === "en,it") return x[l];
  if (Array.isArray(x)) return x.map((v) => risolvi(v, l));
  if (x && typeof x === "object") return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, risolvi(v, l)]));
  return x;
}
let prove = 0;
const prova = async (nome, fn) => { await fn(); prove += 1; console.log("ok -", nome); };

// ------------------------------------------------------------------ 1. geometria delle etichette di P1.3

const ciclo = await import(pathToFileURL(path.join(radice, "webapp", "animazioni", "ciclo_agente.js")).href);
const estremi = (e) => {
  const w = ciclo.larghezzaTesto(e.testo, e.px, e.grassetto);
  if (e.anchor === "end") return [e.x - w, e.x];
  if (e.anchor === "middle") return [e.x - w / 2, e.x + w / 2];
  return [e.x, e.x + w];
};
for (const lingua of ["it", "en"]) {
  const sc = risolvi(leggi("ciclo_agente.json"), lingua).scenario;
  const et = ciclo.geometriaEtichette(sc);
  await prova(`[${lingua}] P1.3: ogni etichetta del ciclo sta dentro la scena (0-${ciclo.VIEWBOX.w})`, () => {
    for (const e of et) {
      const [x0, x1] = estremi(e);
      assert.ok(x0 >= 2 && x1 <= ciclo.VIEWBOX.w - 2, `«${e.testo}» (${e.id}) va da ${x0.toFixed(0)} a ${x1.toFixed(0)}`);
      assert.ok(e.y >= 10 && e.y <= ciclo.VIEWBOX.h - 3, `«${e.testo}» fuori in verticale (${e.y})`);
    }
  });
  await prova(`[${lingua}] P1.3: nomi e spiegazioni degli strumenti stanno nel loro riquadro`, () => {
    for (const e of et.filter((x) => x.strumento)) {
      const [x0, x1] = estremi(e);
      assert.ok(x0 >= e.riquadro.x0 && x1 <= e.riquadro.x1 - 4, `«${e.testo}» esce dal riquadro di ${e.id}: ${x1.toFixed(0)} > ${e.riquadro.x1}`);
    }
  });
  await prova(`[${lingua}] P1.3: la didascalia di «Ragiona» non tocca gli strumenti`, () => {
    const bordo = Math.min(...et.filter((x) => x.strumento).map((x) => x.riquadro.x0));
    for (const e of et.filter((x) => x.id === "ragiona")) assert.ok(estremi(e)[1] < bordo, `«${e.testo}» arriva a ${estremi(e)[1].toFixed(0)} (strumenti da ${bordo})`);
  });
}
await prova("P1.3: la misura riconosce il caso segnalato (vecchia geometria: «guarda il risultato» usciva a sinistra)", () => {
  // prima: centro x 262, raggio 156, etichetta a 44 px dal nodo, ancorata a destra => x = 62, una sola riga
  const w = ciclo.larghezzaTesto("guarda il risultato", 11, false);
  assert.ok(62 - w < 0, "con la vecchia geometria la didascalia doveva risultare fuori");
});

// ------------------------------------------------------------------ 2. regole CSS della shell contro le classi delle lezioni

const css = fs.readFileSync(path.join(radice, "webapp", "app.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const cartellaAnim = path.join(radice, "webapp", "animazioni");
const classiLezioni = new Set();
for (const f of fs.readdirSync(cartellaAnim).filter((x) => x.endsWith(".js"))) {
  const js = fs.readFileSync(path.join(cartellaAnim, f), "utf8");
  for (const m of js.matchAll(/class:\s*(["`])([^"`]*)\1/g)) for (const c of m[2].split(/\s+/)) if (/^[a-z][\w-]*$/.test(c)) classiLezioni.add(c);
}
// classi comuni della shell PENSATE per le lezioni (pannelli, comandi, diario...): possono avere regole proprie
const CONDIVISE = new Set(["banco", "pannello", "scena", "segmentato", "verticale", "cursore", "riga", "interruttore", "pericolo", "diario", "voce-diario",
  "chip", "chi", "testo", "fatti", "esito-scheda", "ok", "avviso", "male", "neutro", "elenco-errori", "avviso-cambio", "barra-riproduzione", "velocita",
  "prova-tu", "entra", "nascosto", "sr", "btn", "btn-primario", "btn-fantasma", "scelta", "icona-stato", "vuoto", "errore", "falso", "destra", "scheda", "grande"]);
const PERICOLOSE = /position\s*:\s*(fixed|absolute|sticky)|grid-template-columns|min-height\s*:\s*calc/;
await prova("CSS: nessuna classe 'nuda' della shell con posizione o griglia coincide con una classe delle lezioni", () => {
  const conflitti = [];
  for (const m of css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    const corpo = m[2];
    if (!PERICOLOSE.test(corpo)) continue;
    for (const sel of m[1].split(",").map((s) => s.trim())) {
      const nudo = sel.match(/^\.([\w-]+)$/);
      if (nudo && classiLezioni.has(nudo[1]) && !CONDIVISE.has(nudo[1])) conflitti.push(`${sel} { ${corpo.trim().slice(0, 60)} }`);
    }
  }
  assert.deepEqual(conflitti, [], `regole della shell che colpiscono le lezioni:\n${conflitti.join("\n")}`);
});
await prova("CSS: i casi segnalati sono legati alla shell (#avvisi, #radice > .corpo, .laterale .voce)", () => {
  assert.ok(!/(^|\})\s*\.avvisi\s*\{/.test(css), ".avvisi nuda ancora presente");
  assert.ok(!/(^|\})\s*\.corpo\s*\{/.test(css), ".corpo nuda ancora presente");
  assert.ok(/#avvisi\s*\{[^}]*position\s*:\s*fixed/.test(css));
});
await prova("CSS: cura generale del testo (overflow-wrap, min-width dei figli di griglia e dei bottoni a segmenti)", () => {
  assert.match(css, /\.pannello,[^{]*\.opzione[^{]*\{[^}]*overflow-wrap:\s*anywhere/);
  assert.match(css, /\.segmentato button\s*\{[^}]*min-width:\s*0/);
  assert.match(css, /\.banco > \*\s*\{[^}]*min-width:\s*0/);
});

// ------------------------------------------------------------------ 3. DOM simulato con app.css (jsdom)

let JSDOM = null;
// JSDOM_DIR = cartella (su disco locale) che contiene node_modules/jsdom: dal disco di rete il caricamento e' lentissimo
try {
  if (process.env.JSDOM_DIR) ({ JSDOM } = createRequire(path.join(process.env.JSDOM_DIR, "/"))("jsdom"));
  else ({ JSDOM } = await import("jsdom"));
} catch (e) { console.log("jsdom non installato: parte 3 (DOM simulato) saltata"); }
if (JSDOM) {
  const cssTesto = fs.readFileSync(path.join(radice, "webapp", "app.css"), "utf8");
  const dom = new JSDOM(`<!doctype html><html><head><style>${cssTesto}</style></head><body><div id="radice"><div id="banco"></div></div><div id="avvisi" class="avvisi"></div></body></html>`, { pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  w.Element.prototype.animate = function () { return { cancel() {}, finished: Promise.resolve(), onfinish: null }; };
  w.Element.prototype.getAnimations = function () { return []; };
  w.SVGElement.prototype.getTotalLength = function () { return 100; };
  w.SVGElement.prototype.getPointAtLength = function (d) { return { x: d, y: d }; };
  w.SVGElement.prototype.getBBox = function () { return { x: 0, y: 0, width: 10, height: 10 }; };
  w.HTMLCanvasElement.prototype.getContext = function () { return null; };
  for (const k of ["window", "document", "Node", "HTMLElement", "SVGElement", "Element", "Event", "MouseEvent", "getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"]) {
    if (k === "window") globalThis.window = w;
    else if (w[k] !== undefined) globalThis[k] = typeof w[k] === "function" && /^[a-z]/.test(k) ? w[k].bind(w) : w[k];
  }
  const contenitore = w.document.getElementById("banco");
  const fileLezioni = CARTELLE_LEZIONI.flatMap((c) => fs.existsSync(c) ? fs.readdirSync(c).filter((f) => f.endsWith(".json")).sort() : []);
  for (const f of fileLezioni) {
    const grezza = leggi(f);
    const mod = await import(pathToFileURL(path.join(cartellaAnim, `${grezza.componente}.js`)).href);
    for (const lingua of ["it", "en"]) {
      const lez = risolvi(grezza, lingua);
      await prova(`[${lingua}] DOM ${grezza.componente}: nessun elemento del banco in posizione fissa`, () => {
        const m = mod.monta(contenitore, lez, { lingua });
        try {
          for (const seg of lez.segmenti) {
            if (m && m.applica) m.applica(seg.stato_animazione);
            const fissi = [...contenitore.querySelectorAll("*")].filter((x) => w.getComputedStyle(x).position === "fixed");
            assert.deepEqual(fissi.map((x) => x.className.baseVal ?? x.className), [], `passo ${seg.id}`);
          }
        } finally { if (m && m.distruggi) m.distruggi(); contenitore.replaceChildren(); }
      });
    }
  }
  for (const lingua of ["it", "en"]) {
    await prova(`[${lingua}] DOM P8.6: gli esiti della verifica stanno sotto la tavola, mai sopra i blocchi`, async () => {
      const mod = await import(pathToFileURL(path.join(cartellaAnim, "blueprint_crm.js")).href);
      const lez = risolvi(leggi("blueprint_crm.json"), lingua);
      const m = mod.monta(contenitore, lez, { lingua });
      try {
        m.applica({ scelte: { ...lez.scenario.preset.difettoso }, verificato: true });
        const scena = contenitore.querySelector(".scena");
        const esiti = scena.querySelector(".esiti-verifica");
        assert.ok(esiti, "pannello degli esiti assente");
        assert.equal(esiti.previousElementSibling.tagName.toLowerCase(), "svg", "gli esiti devono seguire la tavola");
        const elenco = esiti.querySelector(".esiti-elenco");
        assert.ok(elenco && elenco.children.length > 0, "nessun esito mostrato per il blueprint difettoso");
        for (const x of [esiti, elenco]) assert.notEqual(w.getComputedStyle(x).position, "fixed");
        assert.equal(w.getComputedStyle(elenco).overflowY, "auto");
        assert.ok(!contenitore.querySelector(".pannello.destra .esiti-elenco"), "gli esiti non vanno nel pannello dei blocchi");
      } finally { m.distruggi(); contenitore.replaceChildren(); }
    });
  }
}

console.log(`\n${prove} prove superate`);
process.exit(0); // i componenti montati possono lasciare timer di animazione: si chiude esplicitamente
