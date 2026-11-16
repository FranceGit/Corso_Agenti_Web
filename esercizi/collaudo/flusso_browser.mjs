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


const spunta = (el, valore) => { el.checked = valore; el.dispatchEvent(new w.Event("change", { bubbles: true })); };
const TESTI = {
  it: { prova: "Prova sui 10 lead", genera: "Genera le bozze", lancia: "Lancia l'agente", superato: "Superato" },
  en: { prova: "Try on the 10 leads", genera: "Generate the drafts", lancia: "Run the agent", superato: "Passed" },
};

async function apriEsercizio(n) {
  if ($(".es-indietro")) $(".es-indietro").click();
  await aspetta(() => $$(".es-carta").length === 6, `elenco con 6 esercizi (verso il ${n})`);
  $(`.es-carta[data-esercizio="${n}"] button`).click();
  await aspetta(() => $(`[data-scheda="${n}"]`) && $("#es-area").children.length > 0, `esercizio ${n} aperto`);
}

async function verificaCento(n, lingua) {
  $("#es-verbale").replaceChildren();  // il verbale di un tentativo precedente non deve far passare il controllo
  $("#es-verifica").click();
  await aspetta(() => $(".es-verbale")?.dataset.voto === "100", `[${lingua}] esercizio ${n}: verifica con voto 100`, 8000);
  controlla($(".es-riassunto").textContent.startsWith(TESTI[lingua].superato), `[${lingua}] esercizio ${n}: riassunto nella lingua giusta`);
  const falliti = $$(".es-controlli li.male").map((li) => `${li.dataset.controllo}: ${li.querySelector(".es-controllo-spiega").textContent}`);
  controlla(falliti.length === 0, `[${lingua}] esercizio ${n}: nessun controllo fallito ${falliti.join(" | ")}`);
}

async function flussoE4(lingua) {
  await aspetta(() => $("#es-blocchi"), `[${lingua}] e4: blocchi delle istruzioni`);
  controlla($("#es-prova").textContent === TESTI[lingua].prova, `[${lingua}] e4: bottone di prova tradotto`);
  $("#es-prova").click();
  await aspetta(() => $("#es-riepilogo"), `[${lingua}] e4: prova con le istruzioni di partenza`);
  controlla($$("#es-prova-tabella .es-badge.male").length === 10, `[${lingua}] e4: partenza, 10 risposte illeggibili`);
  const voluti = { vago: false, ruolo: true, dimensione: true, settore: true, comportamento: true, soglie: true, json: true };
  for (const [b, v] of Object.entries(voluti)) {
    spunta($(`input[data-blocco="${b}"]`), v);
    await aspetta(() => $(`input[data-blocco="${b}"]`).checked === v && $(`input[data-blocco="${b}"]`).closest("label").classList.contains("acceso") === v, `[${lingua}] e4: blocco ${b} ${v ? "acceso" : "spento"}`, 3000);
  }
  controlla(!!$(".es-rilancio .es-errore"), `[${lingua}] e4: avviso «prova da rifare»`);
  $("#es-prova").click();
  await aspetta(() => $$("#es-prova-tabella .es-badge.ok").length === 10 && !$(".es-rilancio .es-errore"), `[${lingua}] e4: 10 risposte JSON valide`);
  await verificaCento(4, lingua);
}

async function flussoE5(lingua) {
  await aspetta(() => $("#es-regole"), `[${lingua}] e5: regole di marca`);
  controlla($("#es-genera").textContent === TESTI[lingua].genera, `[${lingua}] e5: bottone «genera» tradotto`);
  controlla(!!$("#es-avviso-campi"), `[${lingua}] e5: avviso sui dati personali spuntati`);
  for (const r of ["tono", "vietate", "sconto", "dati", "disiscrizione", "firma"]) {
    spunta($(`input[data-regola="${r}"]`), true);
    await aspetta(() => $(`input[data-regola="${r}"]`).closest("label").classList.contains("acceso"), `[${lingua}] e5: regola ${r}`, 3000);
  }
  for (const c of ["telefono", "note_private"]) {
    spunta($(`input[data-campo="${c}"]`), false);
    await aspetta(() => !$(`input[data-campo="${c}"]`).closest("label").classList.contains("acceso"), `[${lingua}] e5: campo ${c} tolto`, 3000);
  }
  controlla(!$("#es-avviso-campi"), `[${lingua}] e5: avviso sparito`);
  $("#es-genera").click();
  await aspetta(() => $$(".es-bozza").length === 8, `[${lingua}] e5: 8 bozze generate`);
  const ids = $$(".es-bozza").map((b) => b.dataset.bozza);
  for (const id of ids) {
    const corpo = $(`.es-bozza[data-bozza="${id}"] .es-corpo`).textContent;
    const decisione = corpo.includes("sconto del") ? "rifiuta" : "approva";
    $(`.es-bozza[data-bozza="${id}"] [data-decisione="${decisione}"]`).click();
    const stato = decisione === "approva" ? "approvata" : "rifiutata";
    await aspetta(() => $(`.es-bozza[data-bozza="${id}"] [data-stato]`)?.dataset.stato === stato, `[${lingua}] e5: bozza ${id} ${stato}`, 3000);
  }
  $("#es-invia").click();
  await aspetta(() => $$("#es-posta li").length === 6, `[${lingua}] e5: 6 email partite`);
  controlla($$('#es-registro li[data-evento="blocco_optout"]').length === 1, `[${lingua}] e5: blocco «non contattare» nel registro`);
  spunta($("#es-interruttore"), true);
  await aspetta(() => $("#es-interruttore").checked && $("#es-genera").disabled, `[${lingua}] e5: interruttore acceso, generazione ferma`);
  await verificaCento(5, lingua);
}

async function flussoE6(lingua) {
  await aspetta(() => $("#es-strumenti"), `[${lingua}] e6: tabella degli strumenti`);
  const permessi = { invia_email: "approvazione", cancella_contatto: "no", esporta_contatti: "no" };
  for (const [s, p] of Object.entries(permessi)) {
    scegli($(`select[data-strumento="${s}"]`), p);
    await aspetta(() => $(`[data-strumento-riga="${s}"]`).classList.contains(`perm-${p}`), `[${lingua}] e6: ${s} → ${p}`, 3000);
  }
  const c = $('input[name="limite"]');
  c.value = "8";
  c.dispatchEvent(new w.Event("input", { bubbles: true }));
  await aspetta(() => $("#es-area").dataset.limite === "8" && $("#es-limite-valore").textContent === "8", `[${lingua}] e6: tetto 8 salvato dal server`, 3000);
  controlla($('[data-azione="lancia"]').textContent === TESTI[lingua].lancia, `[${lingua}] e6: bottone «lancia» tradotto`);
  for (const r of ["follow_up", "aggiorna", "nota_ostile", "manda_subito"]) {
    $(`[data-richiesta="${r}"] [data-azione="lancia"]`).click();
    await aspetta(() => $$(`[data-richiesta="${r}"] .es-diario li`).length > 0 && !$(`[data-richiesta="${r}"] .es-errore`), `[${lingua}] e6: diario di ${r}`, 3000);
  }
  controlla($$('[data-richiesta="nota_ostile"] li[data-esito="rifiutata"]').length === 2, `[${lingua}] e6: cancellazioni della nota ostile rifiutate`);
  controlla($$('[data-richiesta="manda_subito"] li[data-esito="in_attesa"]').length === 3, `[${lingua}] e6: invii in attesa di una persona`);
  controlla($$("#es-posta li").length === 0 && !$("#es-crm .stato-escluso"), `[${lingua}] e6: nessuna email partita, nessun contatto cancellato`);
  await verificaCento(6, lingua);
}

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
await aspetta(() => $$(".es-carta").length === 6, "elenco con 6 schede di esercizio");
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
await aspetta(() => $$(".es-carta").length === 6 && $$(".es-carta")[2].textContent.includes("100/100"), "elenco aggiornato: ultimo voto 100 sull'esercizio 3");
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
await aspetta(() => $$(".es-carta").length === 6, "di nuovo l'elenco");
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

// ---------------------------------------------------------------- esercizi 4-6 in italiano
for (const [n, flusso] of [[4, flussoE4], [5, flussoE5], [6, flussoE6]]) {
  await apriEsercizio(n);
  await flusso("it");
}

// ---------------------------------------------------------------- inglese
const en = $$(".lingue button").find((b) => b.textContent === "EN");
en.click();
await aspetta(() => $(".es-titolo")?.textContent === "Hands-on exercises", "cambio lingua: pagina in inglese");
controlla($("#voce-esercizi").textContent.includes("Hands-on exercises"), "voce laterale in inglese");
$$(".es-carta")[2].querySelector("button").click();
await aspetta(() => $(".es-verbale") && $(".es-riassunto").textContent.startsWith("Passed"), "verbale salvato riletto in inglese");
// esercizi 4-6 rifatti da capo in inglese
for (const [n, flusso] of [[4, flussoE4], [5, flussoE5], [6, flussoE6]]) {
  await apriEsercizio(n);
  $("#es-ricomincia").click();
  const ripartito = { 4: () => $("#es-blocchi") && !$("#es-riepilogo"), 5: () => $("#es-regole") && !$(".es-bozza"), 6: () => $("#es-strumenti") && !$(".es-diario") };
  await aspetta(ripartito[n], `[en] esercizio ${n}: ricominciato dai dati di partenza`);
  await flusso("en");
}

} catch (e) {
  errori.push("interrotto: " + e.message + " " + String(e.stack || "").split("\n")[1]);
  const area = d.querySelector("#es-area");
  console.log("AREA:", area ? area.innerHTML.slice(0, 400) : "(nessuna)");
}
for (const p of passi) console.log(p);
console.log(`\n${passi.length} passi, ${errori.length} errori`);
for (const e of errori) console.log("ERRORE:", e);
process.exit(errori.length ? 1 : 0);
