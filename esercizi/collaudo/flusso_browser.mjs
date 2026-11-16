// Collaudo della pagina Esercizi in un browser simulato (jsdom) contro il server VERO.
// Uso: node esercizi/collaudo/flusso_browser.mjs http://127.0.0.1:8799
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
const scegli = (el, valore) => { el.value = valore; el.dispatchEvent(new w.Event("change", { bubbles: true })); };

await importa("/shell/app.js");
try {

// ---------------------------------------------------------------- accesso
await aspetta(() => $("#email"), "pagina di accesso");
$("#email").value = "collaudo@esempio.it";
$("#codice").value = "DEMO-AGENTI";
$("form").dispatchEvent(new w.Event("submit", { bubbles: true, cancelable: true }));
await aspetta(() => $("#voce-esercizi"), "dopo l'accesso c'e' la voce Esercizi nella barra laterale");
controlla($("#voce-esercizi").textContent.includes("Esercizi pratici"), "voce in italiano");

// ---------------------------------------------------------------- elenco
$("#voce-esercizi").click();
await aspetta(() => $$(".es-carta").length === 3, "elenco con 3 schede di esercizio");
controlla($(".es-titolo").textContent === "Esercizi pratici", "titolo della pagina");
controlla(!!d.getElementById("stile-esercizi"), "foglio di stile degli esercizi caricato");

// ---------------------------------------------------------------- esercizio 3
$$(".es-carta")[2].querySelector("button").click();
await aspetta(() => $$("#es-risposte tbody tr").length === 15, "esercizio 3: 15 risposte");
controlla($("#es-report").textContent.includes("15/15"), "report iniziale: 15 interessati su 15");
const giuste = { giulia: "interessato", marco: "non_interessato", sara: "disiscrizione", paolo: "da_ricontattare", elena: "non_interessato",
  luca: "interessato", chiara: "umano", matteo: "da_ricontattare", irene: "non_interessato", davide: "interessato", marta: "disiscrizione",
  simone: "da_ricontattare", anna: "umano", fabio: "non_interessato", silvia: "interessato" };
for (const [k, v] of Object.entries(giuste)) {
  scegli($(`tr[data-risposta="${k}"] select`), v);
  await aspetta(() => $(`tr[data-risposta="${k}"] select`).value === v, `etichetta di ${k} salvata`, 3000);
}
$('[data-stazione="conversione"]').click();
await aspetta(() => $('[data-stazione="conversione"]').classList.contains("scelta"), "stazione «conversione» scelta");
const radio = $('input[name="correzione"][value="esatta_disiscrizione"]');
radio.checked = true;
radio.dispatchEvent(new w.Event("change", { bubbles: true }));
await aspetta(() => $('input[name="correzione"][value="esatta_disiscrizione"]').checked && $(".es-rilancio .es-errore"), "correzione scelta, avviso «da rilanciare»");
$("#es-rilancia").click();
await aspetta(() => $$("#es-posta li").length === 4, "dopo il rilancio: 4 email nella posta inviata");
controlla(!$(".es-rilancio .es-errore"), "avviso «da rilanciare» sparito");
$("#es-verifica").click();
await aspetta(() => $(".es-verbale")?.dataset.voto === "100", "verifica: verbale con voto 100");
controlla($$(".es-controlli li.ok").length === 7 && $$(".es-controlli li.male").length === 0, "7 controlli superati nel verbale");
$("#es-ricorreggi").click();
await aspetta(() => $("#es-ricorrezione").textContent.includes("stesso voto"), "ricorrezione identica");

// ---------------------------------------------------------------- esercizio 2
$(".es-indietro").click();
await aspetta(() => $$(".es-carta").length === 3 && $$(".es-carta")[2].textContent.includes("100/100"), "elenco aggiornato: ultimo voto 100 sull'esercizio 3");
$$(".es-carta")[1].querySelector("button").click();
await aspetta(() => $("#es-classifica") && $$("#es-classifica tbody tr").length === 22, "esercizio 2: classifica di 22 lead");
const valori = { peso_ruolo: 40, peso_dimensione: 25, peso_settore: 20, peso_comportamento: 15, soglia_alta: 65, soglia_media: 40 };
for (const [nome, v] of Object.entries(valori)) {
  const c = $(`input[name="${nome}"]`);
  c.value = String(v);
  c.dispatchEvent(new w.Event("input", { bubbles: true }));
}
controlla($("#es-somma").textContent.endsWith("100"), "somma dei pesi mostrata subito: 100");
await aspetta(() => $(`input[name="peso_ruolo"]`).value === "40" && $(".es-fasce").textContent.includes("High: 6"), "classifica ricalcolata dal server (6 High)", 3000);
$("#es-applica").click();
await aspetta(() => $(".es-ok"), "applicata al CRM");
$("#es-verifica").click();
await aspetta(() => $(".es-verbale")?.dataset.voto === "100", "esercizio 2: voto 100");

// ---------------------------------------------------------------- esercizio 1
$(".es-indietro").click();
await aspetta(() => $$(".es-carta").length === 3, "di nuovo l'elenco");
$$(".es-carta")[0].querySelector("button").click();
await aspetta(() => $$("#es-tabella-lead tbody tr").length === 25, "esercizio 1: 25 righe importate");
controlla($$(".es-email.rotta").length === 2, "2 email segnalate come scritte male");
const sel = $$("input.es-sel");
sel[0].checked = true; sel[0].dispatchEvent(new w.Event("change", { bubbles: true }));
sel[1].checked = true; sel[1].dispatchEvent(new w.Event("change", { bubbles: true }));
await aspetta(() => $$('#es-unione [data-azione="unisci"]').length === 2, "due righe selezionate: compaiono i bottoni di unione");
$$('#es-unione [data-azione="unisci"]')[0].click();
await aspetta(() => $(".es-contatori").textContent.includes("1 uniti"), "unione eseguita: 1 unito");
const rotta = $(".es-email.rotta");
const riga = rotta.closest("tr");
rotta.value = "nuova.email@esempio.it";
riga.querySelector('[data-azione="correggi_email"]').click();
await aspetta(() => $$(".es-email.rotta").length === 1, "email corretta e salvata");
scegli($$('select[data-azione="segmento"]').find((s) => !s.disabled), "PMI");
await aspetta(() => $$('select[data-azione="segmento"]').some((s) => s.value === "PMI"), "segmento salvato");
$("#es-verifica").click();
await aspetta(() => $(".es-verbale") && $$(".es-controlli li").length === 6, "esercizio 1: verbale con 6 controlli");
controlla($$(".es-aiuto").length >= 1, "i controlli falliti mostrano «come rimediare»");
$("#es-ricomincia").click();
await aspetta(() => $(".es-contatori") && $(".es-contatori").textContent.includes("0 uniti"), "ricomincia: dati di partenza");

// ---------------------------------------------------------------- inglese
const en = $$(".lingue button").find((b) => b.textContent === "EN");
en.click();
await aspetta(() => $(".es-titolo")?.textContent === "Hands-on exercises", "cambio lingua: pagina in inglese");
controlla($("#voce-esercizi").textContent.includes("Hands-on exercises"), "voce laterale in inglese");
$$(".es-carta")[2].querySelector("button").click();
await aspetta(() => $(".es-verbale") && $(".es-riassunto").textContent.startsWith("Passed"), "verbale salvato riletto in inglese");

} catch (e) {
  errori.push("interrotto: " + e.message + " " + String(e.stack || "").split("\n")[1]);
  const area = d.querySelector("#es-area");
  console.log("AREA:", area ? area.innerHTML.slice(0, 400) : "(nessuna)");
}
for (const p of passi) console.log(p);
console.log(`\n${passi.length} passi, ${errori.length} errori`);
for (const e of errori) console.log("ERRORE:", e);
process.exit(errori.length ? 1 : 0);
