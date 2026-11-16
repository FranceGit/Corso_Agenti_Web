// Lezione interattiva "Il contratto fra le parti" (PO3.2, Officina O3).
// Vista "contratto": lo studente compone una richiesta POST /contacts (campo per campo, piu' un campo in piu') e la
// vede attraversare le parti: chi invia -> modulo web (AJV) -> API .NET (NJsonSchema) -> database. Ogni parte applica
// lo schema contact-create-request preso dallo scenario (validatore puro, sottoinsieme di JSON Schema: required,
// type, format uuid/email, minLength, maxLength, pattern, additionalProperties). La chiamata diretta salta il modulo;
// la "copia a mano" (opzione scartata dall'ADR-001) sostituisce lo schema lato server e lascia passare dati fuori
// contratto. Se la richiesta passa, compare la risorsa salvata (schema Contact): id del server, campi mascherati se il
// broker e' inattivo, campi solo nel database, evento di timeline.
// Vista "squadra": i ruoli di nebula-agents con i perimetri di scrittura di agent-map.yaml; ogni compito assegnato a
// un ruolo fa partire una freccia verso la zona da scrivere: dentro il perimetro, fuori (spetta a...), posto sbagliato.
// Tutti i testi vengono dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "contratto_parti";
const VISTE = ["contratto", "squadra"];
const CANALI = ["modulo", "diretta"];
const PARTI = ["client", "modulo", "api", "database"];
const W = 720, H = 440;
const PARTE = { x0: 16, passo: 180, y: 44, w: 152, h: 74, binario: 136 };
const SCHEDA = { y: 156, h: 276, w: 336, xRichiesta: 16, xRisorsa: 368, riga: 15 };
const RUOLO = { x: 16, w: 196, h: 46, y0: 56, passo: 56 };
const ZONA = { x: 330, w: 360, h: 28, y0: 66, passoY: 32 };
const CORNICE = { prodotto: { x: 300, y: 40, w: 404, h: 296 }, framework: { x: 300, y: 346, w: 404, h: 58 } };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STILE = `
.lz-contratto_parti .campo-cp { display: grid; gap: 3px; margin: 5px 0; font-size: .8rem; }
.lz-contratto_parti .campo-cp code { font-size: .78rem; color: #3730a3; }
.lz-contratto_parti .nota-cp { font-size: .78rem; color: var(--tenue); margin: 6px 0 0; }
.lz-contratto_parti .regole-cp { display: grid; gap: 4px; font-size: .78rem; margin: 6px 0; }
.lz-contratto_parti .regole-cp code { display: block; padding: 4px 7px; border-radius: 7px; background: #f4f6fb; color: #17203b; overflow-wrap: anywhere; }
.lz-contratto_parti .regole-cp code.viol { background: var(--male-chiaro); color: #9f1239; font-weight: 700; }
.lz-contratto_parti .scheda-cp { font-size: .84rem; display: grid; gap: 6px; }
.lz-contratto_parti .scheda-cp code { font-size: .76rem; color: #3730a3; overflow-wrap: anywhere; }
.lz-contratto_parti .regola-cp { margin-top: 10px; padding: 8px 10px; border-left: 4px solid #0ea5e9; background: #f0f9ff; border-radius: 0 10px 10px 0; font-weight: 700; font-size: .82rem; }
.lz-contratto_parti .esiti-cp { margin-top: 10px; border-top: 1px solid #dfe4f0; padding: 10px 4px 2px; }
.lz-contratto_parti .esiti-cp h4 { margin: 0 0 6px; font-size: .8rem; text-transform: uppercase; letter-spacing: .07em; color: var(--tenue); }
.lz-contratto_parti .righe-cp { display: grid; gap: 5px; margin-top: 6px; max-height: 220px; overflow-y: auto; padding-right: 4px; }
.lz-contratto_parti .righe-cp div { font-size: .78rem; padding: 6px 9px; border-radius: 9px; overflow-wrap: anywhere; background: #f4f6fb; }
.lz-contratto_parti .righe-cp .ok-cp { background: var(--ok-chiaro); color: #166534; }
.lz-contratto_parti .righe-cp .fuori-cp, .lz-contratto_parti .righe-cp .posto-cp { background: var(--male-chiaro); color: #9f1239; }
.lz-contratto_parti .righe-cp .avviso-cp { background: var(--avviso-chiaro); color: #92400e; }
.lz-contratto_parti .righe-cp .aperto-cp { outline: 2px solid #4f46e5; }
.lz-contratto_parti .pacchetto-cp { transition: transform .35s cubic-bezier(.2,.8,.2,1); }
.lz-contratto_parti.ferma .pacchetto-cp { transition: none; }
`;

function svgEl(tag, attr) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attr || {})) e.setAttribute(k, v);
  return e;
}
function t(attr, testo) {
  const x = svgEl("text", attr);
  x.textContent = testo;
  return x;
}
function el(tag, attr, ...figli) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attr || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") e.className = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const f of figli.flat()) if (f !== null && f !== undefined && f !== false) e.append(f instanceof Node ? f : document.createTextNode(String(f)));
  return e;
}

// ------------------------------------------------------------------ logica (pura)

export function riempi(modello, valori) {
  return modello.replace(/\{(\w+)\}/g, (_, k) => {
    if (!(k in valori)) throw new Error(`segnaposto {${k}} senza valore`);
    return valori[k];
  });
}
/** Spezza un testo in righe di al massimo n caratteri (a parole). */
export function aCapo(testo, n) {
  const righe = [];
  let riga = "";
  for (const p of String(testo).split(" ")) {
    if (riga && (riga + " " + p).length > n) { righe.push(riga); riga = p; } else riga = riga ? `${riga} ${p}` : p;
  }
  if (riga) righe.push(riga);
  return righe;
}
/** Valore concreto di una variante ({ripeti, volte} = stringa lunga; null = campo assente). */
export function valoreVariante(v) {
  if (v.valore && typeof v.valore === "object") return v.valore.ripeti.repeat(v.valore.volte);
  return v.valore;
}
/** La richiesta come oggetto JSON, dai nomi delle varianti scelte (campi assenti esclusi; campo in piu' in fondo). */
export function costruisciRichiesta(sc, richiesta) {
  const obj = {};
  for (const c of sc.campi_richiesta) {
    const v = c.varianti.find((x) => x.id === richiesta[c.campo]);
    if (!v) throw new Error(`variante sconosciuta «${richiesta[c.campo]}» per ${c.campo}`);
    const val = valoreVariante(v);
    if (val !== null) obj[c.campo] = val;
  }
  const ex = sc.extra.find((x) => x.id === richiesta.extra);
  if (!ex) throw new Error(`campo in piu' sconosciuto «${richiesta.extra}»`);
  if (ex.campo) obj[ex.campo] = valoreVariante(ex);
  return obj;
}
function tipoDi(v) { return v === null ? "null" : typeof v === "number" ? "number" : typeof v; }
/** Validatore puro di un sottoinsieme di JSON Schema (draft-07): l'elenco delle violazioni, in ordine stabile. */
export function validaSchema(schema, obj) {
  const errori = [];
  for (const c of schema.required || []) if (!(c in obj)) errori.push({ campo: c, regola: "required" });
  for (const [c, p] of Object.entries(schema.properties || {})) {
    if (!(c in obj)) continue;
    const v = obj[c];
    const tipi = Array.isArray(p.type) ? p.type : [p.type];
    if (p.type && !tipi.includes(tipoDi(v))) { errori.push({ campo: c, regola: "type", tipo: tipi.join(" | ") }); continue; }
    if (typeof v !== "string") continue;
    if (p.format === "uuid" && !UUID.test(v)) errori.push({ campo: c, regola: "format", formato: "uuid" });
    if (p.format === "email" && !EMAIL.test(v)) errori.push({ campo: c, regola: "format", formato: "email" });
    if (p.minLength !== undefined && v.length < p.minLength) errori.push({ campo: c, regola: "minLength", n: p.minLength });
    if (p.maxLength !== undefined && v.length > p.maxLength) errori.push({ campo: c, regola: "maxLength", n: p.maxLength });
    if (p.pattern !== undefined && !new RegExp(p.pattern).test(v)) errori.push({ campo: c, regola: "pattern" });
  }
  if (schema.additionalProperties === false) for (const c of Object.keys(obj)) if (!(c in (schema.properties || {}))) errori.push({ campo: c, regola: "additional" });
  return errori;
}
/** La copia delle regole scritta a mano (opzione scartata dall'ADR-001): controlla meno cose dello schema. */
export function validaCopia(sc, obj) {
  const errori = [];
  for (const c of sc.copia_a_mano.obbligatori) if (!(c in obj)) errori.push({ campo: c, regola: "required" });
  for (const [c, segno] of Object.entries(sc.copia_a_mano.contiene)) if (c in obj && !String(obj[c]).includes(segno)) errori.push({ campo: c, regola: "contiene", segno });
  return errori;
}
/** Testo leggibile di una violazione. */
export function testoErrore(T, e) {
  const chiave = e.regola === "additional" ? "err_additional" : e.regola === "contiene" ? "err_contiene" : `err_${e.regola}`;
  return riempi(T[chiave], { campo: e.campo, tipo: e.tipo || "", formato: e.formato || "", n: e.n === undefined ? "" : e.n, segno: e.segno || "" });
}
/** La risorsa salvata (schema Contact): id del server, campi mascherati, campi passati fuori contratto. */
export function costruisciRisorsa(sc, s, obj) {
  const r = { id: obj.id !== undefined ? obj.id : sc.id_server };
  if ("brokerId" in obj) r.brokerId = obj.brokerId;
  r.accountId = null;
  if ("fullName" in obj) r.fullName = obj.fullName;
  r.email = s.broker_inattivo ? null : obj.email === undefined ? null : obj.email;
  r.phone = s.broker_inattivo ? null : obj.phone === undefined ? null : obj.phone;
  if ("role" in obj) r.role = obj.role;
  for (const [k, v] of Object.entries(obj)) if (!(k in r)) r[k] = v;
  return r;
}
/**
 * Il viaggio della richiesta fra le parti: per ogni parte lo stato (ok, respinta, saltata, salvata), le violazioni,
 * l'esito complessivo, il codice HTTP, la risorsa salvata (se c'e') e le note (deriva, id dal client, risorsa rotta).
 */
export function percorri(sc, s) {
  const obj = costruisciRichiesta(sc, s.richiesta);
  const contratto = validaSchema(sc.schema_richiesta, obj);
  const server = s.copia_a_mano ? validaCopia(sc, obj) : contratto;
  const tappe = [{ parte: "client", stato: "ok", errori: [] }];
  let esito, http = null, n = 0;
  const deriva = s.copia_a_mano && (contratto.length === 0) !== (server.length === 0);
  if (s.canale === "modulo" && contratto.length) {
    tappe.push({ parte: "modulo", stato: "respinta", errori: contratto }, { parte: "api", stato: "attesa", errori: [] }, { parte: "database", stato: "attesa", errori: [] });
    esito = "respinta_modulo"; n = contratto.length;
  } else {
    tappe.push({ parte: "modulo", stato: s.canale === "diretta" ? "saltata" : "ok", errori: [] });
    if (server.length) {
      tappe.push({ parte: "api", stato: "respinta", errori: server }, { parte: "database", stato: "attesa", errori: [] });
      esito = "respinta_api"; http = 400; n = server.length;
    } else {
      tappe.push({ parte: "api", stato: "ok", errori: [] }, { parte: "database", stato: "salvata", errori: [] });
      http = 201;
      esito = contratto.length ? "fuori_contratto" : "salvata"; n = contratto.length;
    }
  }
  const risorsa = http === 201 ? costruisciRisorsa(sc, s, obj) : null;
  const errori_risorsa = risorsa ? validaSchema(sc.schema_risorsa, risorsa) : [];
  return { richiesta: obj, contratto, tappe, esito, http, n, deriva, risorsa, errori_risorsa, id_client: Boolean(risorsa && obj.id !== undefined) };
}
/** Giudizio su un compito affidato a un ruolo: vuoto, ok (dentro il perimetro), fuori (spetta ad altri), posto sbagliato. */
export function assegna(sc, compitoId, ruoloId) {
  const c = sc.compiti.find((x) => x.id === compitoId);
  if (!c) throw new Error(`compito sconosciuto «${compitoId}»`);
  if (!ruoloId) return { esito: "vuoto", compito: c };
  const r = sc.ruoli.find((x) => x.id === ruoloId);
  if (!r) throw new Error(`ruolo sconosciuto «${ruoloId}»`);
  if (!c.proprietario) return { esito: "posto", compito: c, ruolo: r };
  if (r.scrive.includes(c.zona)) return { esito: "ok", compito: c, ruolo: r };
  return { esito: "fuori", compito: c, ruolo: r, proprietario: sc.ruoli.find((x) => x.id === c.proprietario), nota: (c.note && c.note[r.id]) || "" };
}
/** Riscontro di tutte le assegnazioni: una riga per compito e quanti compiti stanno nel perimetro giusto. */
export function verificaSquadra(sc, assegnazioni) {
  const T = sc.testi;
  const zona = (id) => sc.zone.find((z) => z.id === id).nome;
  const righe = sc.compiti.map((c, i) => {
    const a = assegna(sc, c.id, assegnazioni[c.id] || "");
    const n = i + 1;
    const testo = a.esito === "vuoto" ? riempi(T.da_assegnare, { n, compito: c.testo })
      : a.esito === "ok" ? riempi(T.esito_ok, { n, ruolo: a.ruolo.nome, zona: zona(c.zona) })
      : a.esito === "posto" ? riempi(T.esito_posto, { n })
      : riempi(T.esito_fuori, { n, ruolo: a.ruolo.nome, zona: zona(c.zona), proprietario: a.proprietario.nome, nota: a.nota }).trim();
    return { id: c.id, esito: a.esito, testo };
  });
  const giusti = righe.filter((r) => r.esito === "ok").length;
  const tot = sc.compiti.filter((c) => c.proprietario).length;
  return { righe, giusti, tot, sintesi: riempi(T.punteggio, { n: giusti, tot }) };
}
/** Posizioni di ruoli e zone nella vista squadra. */
export function posizioniSquadra(sc) {
  const ruoli = Object.fromEntries(sc.ruoli.map((r, i) => [r.id, { x: RUOLO.x, y: RUOLO.y0 + i * RUOLO.passo, w: RUOLO.w, h: RUOLO.h }]));
  const zone = {};
  let k = 0;
  for (const z of sc.zone) {
    if (z.repo === "framework") zone[z.id] = { x: ZONA.x, y: CORNICE.framework.y + 22, w: ZONA.w, h: ZONA.h };
    else { zone[z.id] = { x: ZONA.x, y: ZONA.y0 + k * ZONA.passoY, w: ZONA.w, h: ZONA.h }; k += 1; }
  }
  return { ruoli, zone };
}
export const DIMENSIONI = { w: W, h: H, scheda: SCHEDA, parte: PARTE, cornice: CORNICE };

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const lingua = contesto && contesto.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));
  const ruolo = Object.fromEntries(sc.ruoli.map((x) => [x.id, x]));
  const zona = Object.fromEntries(sc.zone.map((x) => [x.id, x]));
  const compito = Object.fromEntries(sc.compiti.map((x) => [x.id, x]));
  const PS = posizioniSquadra(sc);
  const CAMPI = [...sc.campi_richiesta.map((c) => c.campo), "extra"];

  const iniziale = Object.fromEntries(sc.campi_richiesta.map((c) => [c.campo, c.varianti[0].id]));
  const s = { vista: "contratto", richiesta: { ...iniziale, extra: sc.extra[0].id }, canale: "modulo", copia_a_mano: false, broker_inattivo: false, assegnazioni: {}, compito_aperto: sc.compiti[0].id };
  let fase = Infinity; // passi della sequenza gia' mostrati
  let timer = [];
  const pulisci = () => { timer.forEach((x) => clearTimeout(x)); timer = []; };
  const dopo = (ms, fn) => { timer.push(setTimeout(fn, ms)); };

  // ------------------------------------------------ comandi
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...VISTE.map((v) => el("button", { "data-v": v, onclick: () => cambia({ vista: v }) }, E[`vista_${v}`])));
  const tendine = {};
  const zonaContratto = el("div", {}, el("h4", {}, E.titolo_richiesta));
  for (const c of sc.campi_richiesta) {
    const sel = el("select", { "aria-label": c.campo, onchange: (e) => cambia({ richiesta: { ...s.richiesta, [c.campo]: e.target.value } }) },
      ...c.varianti.map((v) => el("option", { value: v.id }, v.nome)));
    tendine[c.campo] = sel;
    zonaContratto.append(el("label", { class: "campo-cp" }, el("code", {}, c.campo), sel));
  }
  const selExtra = el("select", { "aria-label": E.campo_extra, onchange: (e) => cambia({ richiesta: { ...s.richiesta, extra: e.target.value } }) },
    ...sc.extra.map((v) => el("option", { value: v.id }, v.nome)));
  tendine.extra = selExtra;
  const segCanale = el("div", { class: "segmentato", role: "group", "aria-label": E.canale },
    ...CANALI.map((v) => el("button", { "data-v": v, onclick: () => cambia({ canale: v }) }, E[`canale_${v}`])));
  const interruttore = (testo, chiave) => {
    const inp = el("input", { type: "checkbox", onchange: (e) => cambia({ [chiave]: e.target.checked }) });
    return { nodo: el("label", { class: "interruttore" }, el("span", {}, testo), inp), inp };
  };
  const inCopia = interruttore(E.copia_a_mano, "copia_a_mano");
  const inInattivo = interruttore(E.broker_inattivo, "broker_inattivo");
  const btnInvia = el("button", { class: "btn btn-primario", style: "width:100%;justify-content:center;margin-top:8px", onclick: () => avvia() }, E.invia);
  zonaContratto.append(el("label", { class: "campo-cp" }, el("span", {}, E.campo_extra), selExtra), el("h4", {}, E.canale), segCanale, inCopia.nodo, inInattivo.nodo, btnInvia);
  const tendineCompiti = {};
  const zonaSquadra = el("div", {}, el("h4", {}, E.titolo_compiti));
  sc.compiti.forEach((c, i) => {
    const sel = el("select", { "aria-label": riempi(T.scegli_ruolo, { n: i + 1 }), onchange: (e) => assegnaRuolo(c.id, e.target.value) },
      el("option", { value: "" }, E.nessun_ruolo), ...sc.ruoli.map((r) => el("option", { value: r.id }, r.nome)));
    tendineCompiti[c.id] = sel;
    zonaSquadra.append(el("label", { class: "campo-cp" }, el("span", {}, `${riempi(T.compito_n, { n: i + 1 })} · ${c.testo}`), sel));
  });
  const btnAzzera = el("button", { class: "btn", style: "width:100%;justify-content:center;margin-top:8px", onclick: () => cambia({ assegnazioni: {} }) }, E.azzera);
  zonaSquadra.append(btnAzzera);
  const comandi = el("aside", { class: "pannello" }, el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaContratto, zonaSquadra);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs><marker id="cp-punta-ok" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#16a34a"/></marker><marker id="cp-punta-ko" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#dc2626"/></marker></defs>`;
  const titolo = t({ x: W / 2, y: 24, "text-anchor": "middle", "font-size": 11.5, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".05em" }, "");
  const gScena = svgEl("g");
  svg.append(titolo, gScena);
  const esiti = el("section", { class: "esiti-cp", "aria-live": "polite", "aria-label": E.titolo_esiti });
  scena.append(svg, esiti);
  const destra = el("aside", { class: "pannello destra", "aria-live": "polite" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}${ridotto ? " ferma" : ""}` }, comandi, scena, destra));

  const mostra = (v) => {
    if (v === null) return "null";
    const str = String(v);
    return str.length > sc.max_valore ? riempi(T.lunga, { inizio: str.slice(0, 12), n: str.length }) : JSON.stringify(str);
  };
  const righeJson = (obj) => Object.entries(obj).map(([k, v], i, a) => ({ campo: k, testo: `"${k}": ${mostra(v)}${i < a.length - 1 ? "," : ""}` }));
  function disegnaSchedaJson(g, x, intestazione, obj, sbagliati) {
    g.append(svgEl("rect", { x, y: SCHEDA.y, width: SCHEDA.w, height: SCHEDA.h, rx: 12, fill: "#fff", stroke: "#cbd2e3", "stroke-width": 1.5 }),
      t({ x: x + 12, y: SCHEDA.y + 18, "font-size": 10.5, "font-weight": 800, fill: "#17203b" }, intestazione));
    const righe = [{ campo: "", testo: "{" }, ...righeJson(obj), { campo: "", testo: "}" }];
    righe.forEach((r, i) => {
      const male = r.campo && sbagliati.has(r.campo);
      g.append(t({ x: x + (r.campo ? 24 : 12), y: SCHEDA.y + 38 + i * SCHEDA.riga, "font-size": 9, "font-family": "monospace", fill: male ? "#dc2626" : "#334155", "font-weight": male ? 700 : 400 }, r.testo));
      if (male) g.append(t({ x: x + SCHEDA.w - 12, y: SCHEDA.y + 38 + i * SCHEDA.riga, "text-anchor": "end", "font-size": 10, "font-weight": 800, fill: "#dc2626" }, "✗"));
    });
    return SCHEDA.y + 38 + righe.length * SCHEDA.riga;
  }

  function disegnaContratto(g) {
    const v = percorri(sc, s);
    const visibili = Math.min(fase, v.tappe.length);
    const colore = { ok: "#16a34a", respinta: "#dc2626", saltata: "#94a3b8", salvata: "#16a34a", attesa: "#cbd2e3" };
    g.append(svgEl("line", { x1: PARTE.x0 + PARTE.w / 2, y1: PARTE.binario, x2: PARTE.x0 + 3 * PARTE.passo + PARTE.w / 2, y2: PARTE.binario, stroke: "#e2e8f0", "stroke-width": 6, "stroke-linecap": "round" }));
    v.tappe.forEach((tp, i) => {
      const x = PARTE.x0 + i * PARTE.passo;
      const stato = i < visibili ? tp.stato : "attesa";
      const strumento = tp.parte === "api" && s.copia_a_mano ? E.strumento_api_copia : E[`strumento_${tp.parte}`];
      g.append(svgEl("rect", { x, y: PARTE.y, width: PARTE.w, height: PARTE.h, rx: 12, fill: stato === "respinta" ? "#fff1f2" : stato === "salvata" ? "#ecfdf5" : "#fff", stroke: colore[stato], "stroke-width": stato === "attesa" ? 1.5 : 2.5, "stroke-dasharray": stato === "saltata" ? "5 4" : "none" }),
        t({ x: x + PARTE.w / 2, y: PARTE.y + 20, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#17203b" }, E[`parte_${tp.parte}`]),
        t({ x: x + PARTE.w / 2, y: PARTE.y + 36, "text-anchor": "middle", "font-size": 9.5, fill: tp.parte === "api" && s.copia_a_mano ? "#dc2626" : "#5b6684" }, strumento),
        t({ x: x + PARTE.w / 2, y: PARTE.y + 60, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: colore[stato] === "#cbd2e3" ? "#94a3b8" : colore[stato] }, E[`stato_${stato}`]));
      if (i > 0) g.append(svgEl("path", { d: `M${x - 24} ${PARTE.y + PARTE.h / 2} l18 0 m-6 -6 l6 6 l-6 6`, fill: "none", stroke: "#7c86a2", "stroke-width": 2 }));
    });
    // il pacchetto della richiesta si ferma sull'ultima parte raggiunta
    const fermo = Math.max(0, visibili - 1);
    const rag = v.tappe.slice(0, visibili).filter((x) => x.stato !== "attesa").length - 1;
    const xp = PARTE.x0 + Math.max(0, Math.min(fermo, rag)) * PARTE.passo + PARTE.w / 2;
    const pacchetto = svgEl("g", { class: "pacchetto-cp" });
    pacchetto.style.transform = `translate(${xp}px, ${PARTE.binario}px)`;
    pacchetto.setAttribute("transform", `translate(${xp},${PARTE.binario})`);
    const finito = visibili >= v.tappe.length;
    const rosso = finito && (v.esito === "respinta_modulo" || v.esito === "respinta_api" || v.esito === "fuori_contratto");
    pacchetto.append(svgEl("circle", { r: 12, fill: rosso ? "#dc2626" : "#4f46e5", stroke: "#fff", "stroke-width": 2.5 }),
      t({ y: 4, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: "#fff", "font-family": "monospace" }, "{ }"));
    g.append(pacchetto);
    // le due schede: richiesta inviata e risorsa salvata
    const sbagliati = new Set(v.contratto.map((e) => e.campo));
    disegnaSchedaJson(g, SCHEDA.xRichiesta, E.scheda_richiesta, v.richiesta, sbagliati);
    if (!finito) return;
    if (!v.risorsa) {
      g.append(svgEl("rect", { x: SCHEDA.xRisorsa, y: SCHEDA.y, width: SCHEDA.w, height: SCHEDA.h, rx: 12, fill: "#f8fafc", stroke: "#cbd2e3", "stroke-width": 1.5, "stroke-dasharray": "5 4" }));
      aCapo(E.nessuna_risorsa, 48).forEach((r, k) => g.append(t({ x: SCHEDA.xRisorsa + SCHEDA.w / 2, y: SCHEDA.y + 120 + k * 15, "text-anchor": "middle", "font-size": 10.5, "font-style": "italic", fill: "#5b6684" }, r)));
      if (v.http) g.append(t({ x: SCHEDA.xRisorsa + SCHEDA.w / 2, y: SCHEDA.y + 96, "text-anchor": "middle", "font-size": 20, "font-weight": 900, fill: "#dc2626" }, String(v.http)));
      return;
    }
    const rotti = new Set(v.errori_risorsa.map((e) => e.campo));
    if (v.id_client) rotti.add("id");
    const yFine = disegnaSchedaJson(g, SCHEDA.xRisorsa, E.scheda_risorsa, v.risorsa, rotti);
    g.append(t({ x: SCHEDA.xRisorsa + 12, y: yFine + 10, "font-size": 9.5, "font-weight": 800, fill: "#5b6684" }, E.solo_database));
    aCapo(sc.solo_database.join(", "), 50).forEach((r, k) => g.append(t({ x: SCHEDA.xRisorsa + 12, y: yFine + 24 + k * 13, "font-size": 9.5, "font-family": "monospace", fill: "#3730a3" }, r)));
    g.append(t({ x: SCHEDA.xRisorsa + 12, y: SCHEDA.y + SCHEDA.h - 12, "font-size": 9.5, "font-weight": 800, fill: "#16a34a" }, E.timeline));
  }

  function disegnaSquadra(g) {
    const aperto = compito[s.compito_aperto];
    const scelto = s.assegnazioni[aperto.id] || "";
    const a = assegna(sc, aperto.id, scelto);
    for (const [k, c] of Object.entries(CORNICE)) {
      g.append(svgEl("rect", { x: c.x, y: c.y, width: c.w, height: c.h, rx: 14, fill: k === "framework" ? "#fff7ed" : "#f5f3ff", stroke: k === "framework" ? "#fdba74" : "#c7d2fe", "stroke-width": 1.5 }),
        t({ x: c.x + 12, y: c.y + 16, "font-size": 9.5, "font-weight": 800, fill: k === "framework" ? "#9a3412" : "#3730a3", "font-family": "monospace" }, E[`repo_${k === "framework" ? "framework" : "prodotto"}`]));
    }
    const perimetro = fase >= 1 && scelto ? ruolo[scelto].scrive : [];
    for (const z of sc.zone) {
      const p = PS.zone[z.id];
      const bersaglio = z.id === aperto.zona;
      const dentro = perimetro.includes(z.id);
      g.append(svgEl("rect", { x: p.x, y: p.y, width: p.w, height: p.h, rx: 9, fill: dentro ? "#ecfdf5" : "#fff", stroke: bersaglio ? "#4f46e5" : dentro ? "#16a34a" : "#cbd2e3", "stroke-width": bersaglio ? 2.5 : dentro ? 2 : 1.2, "stroke-dasharray": dentro && !bersaglio ? "5 3" : "none" }));
      g.append(t({ x: p.x + 10, y: p.y + 18, "font-size": 9.5, "font-weight": 700, fill: "#17203b", "font-family": "monospace" }, z.nome));
    }
    const cf = CORNICE.framework;
    g.append(t({ x: cf.x + cf.w - 12, y: cf.y + 16, "text-anchor": "end", "font-size": 9, fill: "#9a3412", "font-family": "monospace" }, "validate-genericness.py"));
    sc.ruoli.forEach((r) => {
      const p = PS.ruoli[r.id];
      const attivo = r.id === scelto;
      const prop = a.esito === "fuori" && fase >= 3 && r.id === aperto.proprietario;
      g.append(svgEl("rect", { x: p.x, y: p.y, width: p.w, height: p.h, rx: 10, fill: attivo ? "#eef2ff" : "#fff", stroke: attivo ? "#4f46e5" : prop ? "#16a34a" : "#cbd2e3", "stroke-width": attivo || prop ? 2.5 : 1.5 }),
        t({ x: p.x + 12, y: p.y + 19, "font-size": 11, "font-weight": 800, fill: "#17203b" }, r.nome),
        t({ x: p.x + 12, y: p.y + 35, "font-size": 9, fill: "#5b6684", "font-family": "monospace" }, riempi(T.skill_path, { ruolo: r.id })));
    });
    // la freccia del compito aperto: dal ruolo scelto alla zona da scrivere
    const zp = PS.zone[aperto.zona];
    if (scelto && fase >= 2) {
      const rp = PS.ruoli[scelto];
      const colore = a.esito === "ok" ? "#16a34a" : "#dc2626";
      const x1 = rp.x + rp.w, y1 = rp.y + rp.h / 2, x2 = zp.x - 2, y2 = zp.y + zp.h / 2;
      g.append(svgEl("path", { d: `M${x1} ${y1} C${x1 + 50} ${y1}, ${x2 - 50} ${y2}, ${x2} ${y2}`, fill: "none", stroke: colore, "stroke-width": 2.5, "marker-end": a.esito === "ok" ? "url(#cp-punta-ok)" : "url(#cp-punta-ko)" }));
      if (fase >= 3) {
        g.append(svgEl("circle", { cx: zp.x + zp.w - 14, cy: zp.y + zp.h / 2, r: 10, fill: colore }),
          t({ x: zp.x + zp.w - 14, y: zp.y + zp.h / 2 + 4, "text-anchor": "middle", "font-size": 11, "font-weight": 900, fill: "#fff" }, a.esito === "ok" ? "✓" : "✗"));
        if (a.esito === "fuori") {
          const op = PS.ruoli[aperto.proprietario];
          g.append(svgEl("path", { d: `M${op.x + op.w} ${op.y + op.h / 2} C${op.x + op.w + 50} ${op.y + op.h / 2}, ${x2 - 50} ${y2 + 8}, ${x2} ${y2 + 8}`, fill: "none", stroke: "#16a34a", "stroke-width": 1.8, "stroke-dasharray": "5 4", "marker-end": "url(#cp-punta-ok)" }));
        }
      }
    }
    aCapo(aperto.testo, 108).slice(0, 2).forEach((r, k) => g.append(t({ x: 16, y: 421 + k * 14, "font-size": 10.5, "font-weight": 700, fill: "#17203b" }, r)));
  }

  function disegnaScena() {
    titolo.textContent = E[`titolo_scena_${s.vista}`];
    gScena.replaceChildren();
    (s.vista === "contratto" ? disegnaContratto : disegnaSquadra)(gScena);
  }

  function disegnaEsiti() {
    const figli = [el("h4", {}, E.titolo_esiti)];
    if (s.vista === "contratto") {
      const v = percorri(sc, s);
      if (fase < v.tappe.length) figli.push(el("div", { class: "esito-scheda neutro" }, el("div", {}, E.stato_attesa)));
      else {
        const classe = { salvata: "ok", respinta_modulo: "avviso", respinta_api: "avviso", fuori_contratto: "male" }[v.esito];
        figli.push(el("div", { class: `esito-scheda ${classe}` }, el("div", {}, riempi(T[`esito_${v.esito}`], { n: v.n }))));
        const righe = [];
        const tappaFerma = v.tappe.find((x) => x.stato === "respinta");
        const elenco = tappaFerma ? tappaFerma.errori : v.esito === "fuori_contratto" ? v.contratto : [];
        for (const e of elenco) righe.push(el("div", { class: v.esito === "fuori_contratto" ? "fuori-cp" : "avviso-cp" }, `${E[`parte_${tappaFerma ? tappaFerma.parte : "database"}`]}: ${testoErrore(T, e)}`));
        if (v.deriva) righe.push(el("div", { class: "fuori-cp" }, T.nota_deriva));
        if (v.risorsa) {
          righe.push(el("div", { class: v.id_client ? "fuori-cp" : "ok-cp" }, v.id_client ? T.nota_id_client : T.nota_id_server));
          if (s.broker_inattivo) righe.push(el("div", { class: "ok-cp" }, T.nota_mascherati));
          if (v.errori_risorsa.length) righe.push(el("div", { class: "fuori-cp" }, riempi(T.nota_risorsa_rotta, { errori: v.errori_risorsa.map((e) => testoErrore(T, e)).join("; ") })));
        }
        if (righe.length) figli.push(el("div", { class: "righe-cp" }, righe));
      }
    } else {
      const v = verificaSquadra(sc, s.assegnazioni);
      const nessuno = !Object.keys(s.assegnazioni).length;
      figli.push(el("div", { class: `esito-scheda ${nessuno ? "neutro" : v.giusti === v.tot ? "ok" : "avviso"}` }, el("div", {}, nessuno ? T.nessuno_scelto : v.sintesi)));
      const mostrate = v.righe.filter((r) => r.esito !== "vuoto" || r.id === s.compito_aperto);
      figli.push(el("div", { class: "righe-cp" }, mostrate.map((r) => el("div", { class: `${r.esito === "vuoto" ? "" : `${r.esito}-cp`}${r.id === s.compito_aperto ? " aperto-cp" : ""}`.trim() || null }, r.testo))));
    }
    esiti.replaceChildren(...figli);
  }

  function disegnaDestra() {
    const figli = [];
    if (s.vista === "contratto") {
      const sch = sc.schema_richiesta;
      const v = percorri(sc, s);
      const viol = new Set(v.contratto.map((e) => (e.regola === "required" ? "#required" : e.regola === "additional" ? "#additional" : e.campo)));
      figli.push(el("h3", {}, E.titolo_destra_contratto), el("div", { class: "regole-cp" },
        el("code", { class: viol.has("#required") ? "viol" : null }, riempi(T.regola_required, { campi: sch.required.join(", ") })),
        ...Object.entries(sch.properties).map(([c, p]) => el("code", { class: viol.has(c) ? "viol" : null },
          riempi(T.regola_campo, { campo: c, vincoli: Object.entries(p).map(([k, x]) => `${k} ${x}`).join(" · ") }))),
        el("code", { class: viol.has("#additional") ? "viol" : null }, T.regola_chiuso)));
      figli.push(el("div", { class: "regola-cp" }, E.regola_contratto));
    } else {
      const aperto = compito[s.compito_aperto];
      const id = s.assegnazioni[aperto.id] || "";
      figli.push(el("h3", {}, E.titolo_destra_squadra));
      if (!id) figli.push(el("p", { class: "nota-cp" }, T.nessuno_scelto));
      else {
        const r = ruolo[id];
        figli.push(el("div", { class: "scheda-cp" }, el("b", {}, r.nome), el("code", {}, riempi(T.skill_path, { ruolo: r.id })), el("div", {}, r.non_fa),
          el("div", {}, el("b", {}, E.scrive), ` ${r.scrive.map((z) => zona[z].nome).join(", ")}`)));
      }
      figli.push(el("div", { class: "regola-cp" }, E.regola_squadra));
    }
    destra.replaceChildren(...figli);
    if (!ridotto && destra.animate) destra.animate([{ opacity: 0.5 }, { opacity: 1 }], { duration: 200 });
  }

  function aggiornaComandi() {
    const premi = (gruppo, valore) => gruppo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === valore)));
    premi(segVista, s.vista);
    premi(segCanale, s.canale);
    for (const k of CAMPI) tendine[k].value = s.richiesta[k];
    inCopia.inp.checked = s.copia_a_mano;
    inInattivo.inp.checked = s.broker_inattivo;
    for (const [id, sel] of Object.entries(tendineCompiti)) sel.value = s.assegnazioni[id] || "";
    btnAzzera.disabled = !Object.keys(s.assegnazioni).length;
    zonaContratto.classList.toggle("nascosto", s.vista !== "contratto");
    zonaSquadra.classList.toggle("nascosto", s.vista !== "squadra");
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaEsiti(); disegnaDestra(); }

  // ------------------------------------------------ sequenza animata
  /** Riparte dallo stato: la richiesta viaggia parte per parte, oppure la freccia del compito si disegna a passi. */
  function avvia() {
    pulisci();
    const passi = s.vista === "contratto" ? percorri(sc, s).tappe.length : 3;
    const ms = s.vista === "contratto" ? sc.ms_tappa : sc.ms_freccia;
    if (ridotto) { fase = Infinity; ridisegna(); return; }
    fase = s.vista === "contratto" ? 1 : 0;
    ridisegna();
    for (let k = fase + 1; k <= passi; k++) dopo((k - fase) * ms, () => { fase = k === passi ? Infinity : k; ridisegna(); });
  }

  // ------------------------------------------------ interazioni
  function cambia(diff) {
    Object.assign(s, diff);
    avvia();
  }
  function assegnaRuolo(id, valore) {
    const assegnazioni = { ...s.assegnazioni };
    if (valore) assegnazioni[id] = valore; else delete assegnazioni[id];
    cambia({ assegnazioni, compito_aperto: id });
  }
  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const n = { ...s, ...(stato || {}) };
    n.richiesta = { ...(n.richiesta || {}) };
    n.assegnazioni = { ...(n.assegnazioni || {}) };
    if (!VISTE.includes(n.vista)) throw new Error(`stato_animazione: vista sconosciuta «${n.vista}»`);
    if (!CANALI.includes(n.canale)) throw new Error(`stato_animazione: canale sconosciuto «${n.canale}»`);
    if (Object.keys(n.richiesta).sort().join() !== [...CAMPI].sort().join()) throw new Error(`stato_animazione: richiesta deve avere i campi ${CAMPI.join(", ")}`);
    for (const c of sc.campi_richiesta) if (!c.varianti.some((v) => v.id === n.richiesta[c.campo])) throw new Error(`stato_animazione: variante sconosciuta «${n.richiesta[c.campo]}» per ${c.campo}`);
    if (!sc.extra.some((v) => v.id === n.richiesta.extra)) throw new Error(`stato_animazione: campo in piu' sconosciuto «${n.richiesta.extra}»`);
    if (typeof n.copia_a_mano !== "boolean" || typeof n.broker_inattivo !== "boolean") throw new Error("stato_animazione: copia_a_mano e broker_inattivo sono booleani");
    for (const [c, r] of Object.entries(n.assegnazioni)) {
      if (!compito[c]) throw new Error(`stato_animazione: compito sconosciuto «${c}»`);
      if (!ruolo[r]) throw new Error(`stato_animazione: ruolo sconosciuto «${r}»`);
    }
    if (!compito[n.compito_aperto]) throw new Error(`stato_animazione: compito sconosciuto «${n.compito_aperto}»`);
    Object.assign(s, n);
    avvia();
  }

  applica({});
  return {
    applica,
    distruggi() { pulisci(); },
    _prova: { stato: s, percorri: () => percorri(sc, s), squadra: () => verificaSquadra(sc, s.assegnazioni), fase: () => fase },
  };
}
