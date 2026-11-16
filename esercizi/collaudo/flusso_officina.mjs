// Collaudo dell'Officina (livello 2) in un browser simulato (jsdom) contro il server VERO.
// Uso: node esercizi/collaudo/flusso_officina.mjs http://127.0.0.1:8799  (server: esercizi/collaudo/server_collaudo.py)
// jsdom non fa parte del progetto: si indica dove trovarlo con JSDOM_DIR (cartella che contiene node_modules/jsdom).
// La shell e i moduli sono scaricati dal server come li scarica il browser (con il cookie di sessione); gli
// import() dinamici della shell passano dallo stesso fetch con cookie.
import { createRequire } from "node:module";

const BASE = process.argv[2] || "http://127.0.0.1:8799";
const require = createRequire((process.env.JSDOM_DIR || process.cwd()) + "/");
const { JSDOM, VirtualConsole } = require("jsdom");

const fetchNativo = globalThis.fetch;
let cookie = "";
const errori = [];
const passi = [];
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchConCookie(url, opzioni = {}) {
  const assoluto = new URL(url, BASE).href;
  const headers = new Headers(opzioni.headers || {});
  if (cookie) headers.set("cookie", cookie);
  const r = await fetchNativo(assoluto, { ...opzioni, headers });
  if (process.env.COLLAUDO_DIRETTO || (r.status >= 400 && !url.endsWith("/api/stato?lingua=it"))) console.log("  fetch", opzioni.method || "GET", url, r.status);
  const nuovi = r.headers.getSetCookie ? r.headers.getSetCookie() : [];
  for (const c of nuovi) {
    const [coppia] = c.split(";");
    cookie = coppia.endsWith("=") || /max-age=0|expires=Thu, 01 Jan 1970/i.test(c) ? "" : coppia;
  }
  return r;
}

async function importa(url) {
  const r = await fetchConCookie(url);
  if (!r.ok) throw new Error(`import ${url}: HTTP ${r.status}`);
  const sorgente = (await r.text()).replaceAll("import(", "globalThis.__importa(");
  return import("data:text/javascript;base64," + Buffer.from(sorgente).toString("base64"));
}

function controlla(cond, descrizione) {
  passi.push(`${cond ? "OK " : "NO "} ${descrizione}`);
  if (process.env.COLLAUDO_DIRETTO) console.log(passi[passi.length - 1]);
  if (!cond) errori.push(descrizione);
}

async function aspetta(cond, descrizione, ms = 4000) {
  const fine = Date.now() + ms;
  while (Date.now() < fine) {
    try { if (cond()) { controlla(true, descrizione); return true; } } catch (e) { /* non ancora */ }
    await pausa(40);
  }
  controlla(false, descrizione);
  return false;
}

const vc = new VirtualConsole();
vc.on("error", (...a) => errori.push("console.error: " + a.join(" ")));
vc.on("jsdomError", (e) => errori.push("jsdom: " + e.message));
const html = await (await fetchConCookie("/")).text();
const dom = new JSDOM(html, { url: BASE, pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window;
w.Element.prototype.scrollIntoView = function () {};
w.confirm = () => true;
for (const k of ["window", "document", "Node", "HTMLElement", "Event", "localStorage", "requestAnimationFrame", "cancelAnimationFrame", "getComputedStyle"]) {
  globalThis[k] = k === "window" ? w : (typeof w[k] === "function" && k !== "Node" && k !== "HTMLElement" && k !== "Event" ? w[k].bind(w) : w[k]);
}
globalThis.fetch = fetchConCookie;
w.fetch = fetchConCookie;
globalThis.__importa = importa;
const d = w.document;
const $ = (s) => d.querySelector(s);
const $$ = (s) => [...d.querySelectorAll(s)];

// una scelta e' salvata quando il server ha risposto e l'area e' stata ridisegnata (nuovo elemento, gia' spuntato)
async function scegliEAttendi(sid, valore) {
  const sel = `fieldset[data-scelta="${sid}"] input[value="${valore}"]`;
  const r = $(sel);
  r.checked = true;
  r.dispatchEvent(new w.Event("change", { bubbles: true }));
  await aspetta(() => $(sel) !== r && $(sel).checked, `scelta ${sid} salvata dal server`, 6000);
}
const vai = (sel) => { const el = $(sel); if (!el) throw new Error(`manca ${sel}`); el.click(); };
const CLASSIFICATORE_FIX = (testo) => testo.replace(
  '            if "Interested" in status_str:\n                status = EmailStatus.INTERESTED\n            elif "Not Interested" in status_str:\n                status = EmailStatus.NOT_INTERESTED',
  '            etichetta = str(status_str).strip().lower()\n            if "not interested" in etichetta:\n                status = EmailStatus.NOT_INTERESTED\n            elif "interested" in etichetta:\n                status = EmailStatus.INTERESTED');

await importa("/shell/app.js");

try {
// ---------------------------------------------------------------- accesso
await aspetta(() => $("#email"), "pagina di accesso");
$("#email").value = "officina@esempio.it";
$("#codice").value = "DEMO-AGENTI";
$("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
await aspetta(() => $("#voce-livello-2"), "dopo gli 8 moduli c'e' la voce del livello 2 (Officina)");
const gruppi = $$(".laterale .gruppo-anello");
controlla(gruppi[gruppi.length - 1].classList.contains("gruppo-livelli"), "la voce dell'Officina sta dopo tutti i gruppi del livello 1");
controlla(!$("#voce-livello-2").disabled && $("#voce-livello-2").textContent.includes("aperta per il collaudo"), "in alpha l'Officina e' aperta e lo dichiara");

// ---------------------------------------------------------------- passaggio al livello 2
vai("#voce-livello-2");
await aspetta(() => $("#voce-livello-1") && $(".sottotitolo")?.textContent.startsWith("Officina"), "livello 2: testata con il titolo dell'Officina", 10000);
controlla($$(".laterale .gruppo-anello:not(.gruppo-livelli)").length === 6, "livello 2: 6 anelli, uno per unita' O1-O6");
controlla($$(".laterale .voce .sigla").map((s) => s.textContent).every((x) => x.startsWith("PO")), "livello 2: solo pillole PO");
controlla($$(".laterale .voce.in_preparazione").length === 0 && $$(".laterale .voce .sigla").filter((s) => s.textContent.startsWith("PO")).length === 12, "livello 2: 12 spicchi, nessuno in preparazione (lezioni e domande del cantiere contenuti)");

// ---------------------------------------------------------------- esercizi dell'Officina
vai("#voce-esercizi");
await aspetta(() => $$(".es-carta").length === 6 && $('.es-carta[data-esercizio="7"]'), "Esercizi nel livello 2: le schede 7-12");
controlla(!$('.es-carta[data-esercizio="1"]'), "gli esercizi 1-6 non compaiono nell'Officina");
vai('.es-carta[data-esercizio="8"] button');
await aspetta(() => $('[data-scheda="8"]') && $('textarea[data-file="app/agents/response_classifier.py"]'), "esercizio 8: area con i file da sistemare");
controlla($$("textarea[data-file]").length === 5, "esercizio 8: 5 file");
controlla($$("#es-materiale .es-materiale-voce").length === 6, "esercizio 8: 6 voci di materiale in sola lettura");
// partenza: verifica con voto 0 (difetto reale non corretto, bloccante)
vai("#es-verifica");
await aspetta(() => $(".es-verbale")?.dataset.voto === "0" && $('li[data-controllo="difetto_corretto"].male'), "esercizio 8: partenza bocciata dal difetto reale");
// correzione nel browser: modifica, bozza conservata durante un altro salvataggio, poi salva
const ta = $('textarea[data-file="app/agents/response_classifier.py"]');
ta.value = CLASSIFICATORE_FIX(ta.value);
ta.dispatchEvent(new w.Event("input", { bubbles: true }));
const tr = $('textarea[data-file="requirements.txt"]');
tr.value = "fastapi==0.115.6\nuvicorn==0.34.0\npandas==2.2.3\npydantic==2.10.4\npydantic-settings==2.7.1\ngroq==0.13.1\n";
tr.dispatchEvent(new w.Event("input", { bubbles: true }));
$('section[data-percorso="requirements.txt"] [data-azione="salva"]').click();
await aspetta(() => $('section[data-percorso="requirements.txt"] .es-badge'), "requirements.txt salvato (segnato «modificato»)");
controlla($('textarea[data-file="app/agents/response_classifier.py"]').value.includes("not interested"), "la bozza non salvata del classificatore sopravvive al ridisegno");
$('section[data-percorso="app/agents/response_classifier.py"] [data-azione="salva"]').click();
await aspetta(() => $('section[data-percorso="app/agents/response_classifier.py"] .es-badge'), "classificatore salvato");
for (const [sid, valore] of [["sintomo", "ordine_controlli"], ["chiave_scaduta", "silenzio"], ["dove_chiave", "segreto"]]) {
  await scegliEAttendi(sid, valore);
}
$("#es-verbale").replaceChildren();
vai("#es-verifica");
await aspetta(() => $(".es-verbale") && $('li[data-controllo="difetto_corretto"].ok'), "esercizio 8: il difetto reale risulta corretto", 15000);
controlla($('li[data-controllo="requisiti_fissati"].ok') && $('li[data-controllo="scelte"].ok'), "esercizio 8: requisiti fissati e diagnosi giusti");
controlla($(".es-verbale").dataset.voto === "0" && $('li[data-controllo="chiave_fuori"].male') && $('li[data-controllo="dockerfile_sano"].male'),
  "esercizio 8: voto ancora 0, bloccato dalla chiave d'esempio nel .env.example (Dockerfile da sistemare)");

// ---------------------------------------------------------------- pacchetto di consegna (esercizio 7)
vai(".es-indietro");
await aspetta(() => $('.es-carta[data-esercizio="7"]'), "di nuovo l'elenco dell'Officina");
vai('.es-carta[data-esercizio="7"] button');
await aspetta(() => $("#es-pacchetto"), "esercizio 7: riquadro del pacchetto");
$("#es-pacchetto").value = "non e' json";
vai("#es-importa");
await aspetta(() => [...d.querySelectorAll("#avvisi .avviso.male")].some((a) => a.textContent.includes("JSON")), "pacchetto rotto: avviso, nessuna chiamata");
$("#es-pacchetto").value = JSON.stringify({ formato: "consegna-officina/1", esercizio: 7, unita: "O1",
  file: { "Dockerfile": "FROM python:3.12-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install -r requirements.txt\nCOPY . .\nRUN useradd u\nUSER u\nHEALTHCHECK CMD true\nCMD [\"uvicorn\", \"app:app\"]\n",
          "docker-compose.yml": "services:\n  crm:\n    build: .\n    ports:\n      - \"127.0.0.1:8000:8000\"\n    volumes:\n      - dati_crm:/app/dati\nvolumes:\n  dati_crm:\n" } });
vai("#es-importa");
await aspetta(() => $$(".es-file .es-badge").length === 2, "pacchetto importato: 2 file modificati");
for (const [sid, valore] of [["dati_senza_volume", "zero"], ["cambio_codice", "dalla_copia_codice"]]) {
  await scegliEAttendi(sid, valore);
}
vai("#es-verifica");
await aspetta(() => $(".es-verbale")?.dataset.voto === "100", "esercizio 7: voto 100 dal pacchetto importato", 8000);

// ---------------------------------------------------------------- inglese e ritorno al livello 1
const en = $$(".lingue button").find((b) => b.textContent === "EN");
en.click();
await aspetta(() => $(".es-titolo")?.textContent === "Hands-on exercises" && $('.es-carta[data-esercizio="12"]'), "[en] in inglese restano gli esercizi dell'Officina");
await aspetta(() => $("#voce-livello-1")?.textContent.includes("Back to level 1"), "[en] voce di ritorno al livello 1 tradotta");
vai("#voce-livello-1");
await aspetta(() => $("#voce-livello-2") && $$(".laterale .voce .sigla").some((s) => s.textContent === "P1.1"), "ritorno al livello 1: pillole P1.x di nuovo nella barra");
vai("#voce-esercizi");
await aspetta(() => $('.es-carta[data-esercizio="1"]') && !$('.es-carta[data-esercizio="7"]'), "livello 1: di nuovo gli esercizi 1-6");

} catch (e) {
  errori.push("interrotto: " + e.message + " " + String(e.stack || "").split("\n")[1]);
}
for (const p of passi) console.log(p);
console.log(`\n${passi.length} passi, ${errori.length} errori`);
for (const e of errori) console.log("ERRORE:", e);
process.exit(errori.length ? 1 : 0);
