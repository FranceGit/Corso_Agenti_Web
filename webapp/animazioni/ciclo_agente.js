// Lezione interattiva "Che cos'e' un agente AI": il giro percepisce -> ragiona -> agisce -> osserva.
// Lo studente cambia obiettivo, dati del lead e situazione; l'agente ripianifica e la scena mostra la nuova
// decisione passo per passo. Tutti i testi e i numeri arrivano dallo scenario della lezione (API protetta).

const NS = "http://www.w3.org/2000/svg";
const STAZIONI = ["percepisce", "ragiona", "agisce", "osserva"];
const ANGOLO = { percepisce: -90, ragiona: 0, agisce: 90, osserva: 180 };
const COLORE = { percepisce: "#0ea5e9", ragiona: "#8b5cf6", agisce: "#f59e0b", osserva: "#10b981" };
// ALPHA-FIX (1): centro spostato a destra e didascalie a capo, perche' l'etichetta di «Osserva» (a sinistra)
// usciva dal riquadro e quella di «Ragiona» toccava gli strumenti. Geometria verificata da tests_js/misura_testi.mjs.
const CENTRO = { x: 290, y: 238 };
const RAGGIO = 156;
const STRUMENTO = { cx: 628, w: 128, h: 78, xTesto: -24, margine: 6 };
const LARGHEZZA_DIDASCALIA = 70; // px massimi di una riga della didascalia delle stazioni laterali

/** Larghezza stimata (px) di un testo SVG: stima prudente per caratteri (nessuna misura dal browser, deterministica). */
export function larghezzaTesto(testo, px, grassetto) {
  let em = 0;
  for (const c of String(testo)) {
    if ("il.,:;'|!ìíI".includes(c)) em += 0.3;
    else if ("ftjr()[]- ".includes(c)) em += 0.38;
    else if ("mwMW@".includes(c)) em += 0.9;
    else if (c >= "A" && c <= "Z") em += 0.7;
    else em += 0.58;
  }
  return em * px * (grassetto ? 1.08 : 1);
}

/** A capo per parole entro `max` px (una parola troppo lunga resta da sola sulla sua riga). */
export function aCapoPx(testo, px, grassetto, max) {
  const righe = [];
  let cur = "";
  for (const p of String(testo).split(" ")) {
    const prova = cur ? `${cur} ${p}` : p;
    if (!cur || larghezzaTesto(prova, px, grassetto) <= max) cur = prova;
    else { righe.push(cur); cur = p; }
  }
  if (cur) righe.push(cur);
  return righe;
}

/** Righe e coordinate delle etichette (stazioni e strumenti), usate dal disegno e dal controllo dei bordi. */
export function geometriaEtichette(sc) {
  const out = [];
  for (const st of sc.stazioni) {
    const p = punto(ANGOLO[st.id], RAGGIO);
    const lato = { percepisce: [0, -52, "middle"], agisce: [0, 60, "middle"], osserva: [-44, -4, "end"], ragiona: [44, -4, "start"] }[st.id];
    const laterale = lato[2] !== "middle";
    const righe = laterale ? aCapoPx(st.breve, 11, false, LARGHEZZA_DIDASCALIA) : [st.breve];
    out.push({ id: st.id, x: p.x + lato[0], y: p.y + lato[1], anchor: lato[2], testo: st.nome, px: 15, grassetto: true });
    righe.forEach((r, i) => out.push({ id: st.id, x: p.x + lato[0], y: p.y + lato[1] + 16 + i * 13, anchor: lato[2], testo: r, px: 11, grassetto: false, didascalia: true }));
  }
  sc.strumenti.forEach((st, i) => {
    const y = 78 + i * 104;
    const max = STRUMENTO.w / 2 - STRUMENTO.xTesto - STRUMENTO.margine;
    const nome = aCapoPx(st.nome, 12.5, true, max);
    const spiega = aCapoPx(st.spiega, 10.5, false, max);
    const tutte = [...nome.map((r) => ({ r, px: 12.5, g: true })), ...spiega.map((r) => ({ r, px: 10.5, g: false }))];
    const y0 = -((tutte.length - 1) * 13) / 2 + 4;
    tutte.forEach((x, k) => out.push({ id: st.id, strumento: true, x: STRUMENTO.cx + STRUMENTO.xTesto, y: y + y0 + k * 13, anchor: "start", testo: x.r, px: x.px, grassetto: x.g, riquadro: { x0: STRUMENTO.cx - STRUMENTO.w / 2, x1: STRUMENTO.cx + STRUMENTO.w / 2 } }));
  });
  return out;
}
export const VIEWBOX = { w: 720, h: 476 };

const ICONE_STAZIONE = {
  percepisce: '<path d="M-13,0 C-8,-8 8,-8 13,0 C8,8 -8,8 -13,0Z" fill="none" stroke="currentColor" stroke-width="2.4"/><circle r="4.2" fill="currentColor"/>',
  ragiona: '<path d="M-7,6 C-12,2 -12,-9 0,-11 C12,-9 12,2 7,6 L6,10 L-6,10Z" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linejoin="round"/><path d="M-4,14 h8" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"/>',
  agisce: '<path d="M2,-13 L-8,2 H0 L-2,13 L8,-2 H0Z" fill="currentColor"/>',
  osserva: '<circle cx="-2" cy="-2" r="8" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M4,4 L11,11" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
};
const ICONE_STRUMENTO = {
  crm: '<ellipse cx="0" cy="-8" rx="10" ry="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-10,-8 v14 c0,5 20,5 20,0 v-14 M-10,-1 c0,5 20,5 20,0" fill="none" stroke="currentColor" stroke-width="2"/>',
  web: '<path d="M-11,9 h22 M-8,9 v-7 M-2,9 v-13 M4,9 v-9 M10,9 v-16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  calendario: '<rect x="-10" y="-8" width="20" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-10,-2 h20 M-5,-11 v5 M5,-11 v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="3" cy="4" r="2" fill="currentColor"/>',
  email: '<rect x="-11" y="-8" width="22" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-10,-6 L0,2 L10,-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
};

function svgEl(tag, attr, html) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attr || {})) el.setAttribute(k, v);
  if (html) el.innerHTML = html;
  return el;
}
function el(tag, attr, ...figli) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attr || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const f of figli.flat()) if (f !== null && f !== undefined && f !== false) e.append(f instanceof Node ? f : document.createTextNode(String(f)));
  return e;
}
function riempi(modello, valori) {
  return modello.replace(/\{(\w+)\}/g, (_, k) => {
    if (!(k in valori)) throw new Error(`segnaposto {${k}} senza valore`);
    return valori[k];
  });
}
function punto(angoloGradi, r) {
  const a = (angoloGradi * Math.PI) / 180;
  return { x: CENTRO.x + r * Math.cos(a), y: CENTRO.y + r * Math.sin(a) };
}
const attendi = (ms) => new Promise((ok) => setTimeout(ok, ms));
const morbido = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// ------------------------------------------------------------------ logica dell'agente (pura)

export function calcolaPunteggio(sc, s) {
  const p = sc.punteggio;
  const ruolo = sc.lead.ruoli.find((r) => r.id === s.ruolo);
  if (!ruolo) throw new Error(`ruolo sconosciuto: ${s.ruolo}`);
  const parti = [];
  const pDip = s.dipendenti >= p.soglia_dipendenti ? p.punti_dipendenti : 0;
  const pVis = Math.min(p.massimo_punti_visite, s.visite * p.punti_per_visita);
  const pDec = ruolo.decide ? p.punti_decisore : 0;
  const pRis = s.ha_risposto ? p.punti_risposta : 0;
  parti.push({ chiave: "det_dipendenti", valori: { dipendenti: s.dipendenti, punti: pDip } });
  parti.push({ chiave: "det_visite", valori: { visite: s.visite, punti: pVis } });
  parti.push(ruolo.decide ? { chiave: "det_decide", valori: { punti: pDec } } : { chiave: "det_non_decide", valori: {} });
  if (s.ha_risposto) parti.push({ chiave: "det_risposta", valori: { punti: pRis } });
  const totale = pDip + pVis + pDec + pRis;
  const livello = totale >= p.soglia_caldo ? "caldo" : totale >= p.soglia_tiepido ? "tiepido" : "freddo";
  return { totale, livello, parti, ruolo };
}

export function pianifica(sc, s) {
  const T = sc.testi;
  const tx = (k, v) => riempi(T[k], v || {});
  const obiettivo = sc.obiettivi.find((o) => o.id === s.obiettivo);
  if (!obiettivo) throw new Error(`obiettivo sconosciuto: ${s.obiettivo}`);
  const calc = calcolaPunteggio(sc, s);
  const base = { azienda: sc.lead.azienda, dipendenti: s.dipendenti, ruolo: calc.ruolo.nome, visite: s.visite };

  if (s.modalita === "script") {
    const eventi = ["scr_1", "scr_2", "scr_3"].map((k, i) => ({
      stazione: "agisce", testo: tx(k), strumento: i === 2 ? "calendario" : "email", stato: "ok", giro: i + 1, script: true,
    }));
    const errori = [];
    if (s.gia_cliente) errori.push(tx("scr_err_cliente"));
    if (s.crm_guasto) errori.push(tx("scr_err_guasto"));
    if (!calc.ruolo.decide) errori.push(tx("scr_err_ruolo"));
    if (calc.livello === "freddo") errori.push(tx("scr_err_freddo"));
    if (s.obiettivo === "ordine") errori.push(tx("scr_err_ordine"));
    return { eventi, esito: { tipo: errori.length ? "male" : "avviso", testo: tx("scr_esito"), errori }, script: true };
  }

  // Ogni giro: percepisce -> ragiona -> (agisce -> osserva). L'ultimo giro non agisce: chiude.
  const giri = [];
  const g = (perc, rag, agi, oss, extra) => giri.push({ perc, rag, agi, oss, ...(extra || {}) });
  const fattoDi = (k, v) => tx(k, v);

  g([tx("perc_obiettivo", { obiettivo: obiettivo.frase }), tx("perc_lead", base)], { testo: tx("rag_controllo", base) },
    { strumento: "crm", testo: tx("agi_cerca", base), stato: s.crm_guasto ? "errore" : "ok" },
    s.crm_guasto ? { testo: tx("oss_errore"), fatto: fattoDi("fatto_errore") }
      : s.gia_cliente ? { testo: tx("oss_cliente", base), fatto: fattoDi("fatto_cliente") }
        : { testo: tx("oss_non_cliente", base), fatto: fattoDi("fatto_non_cliente") });

  let esito;
  if (s.crm_guasto) {
    for (let k = 2; k <= sc.tentativi_crm; k++) {
      g([tx("perc_aggiorno", { fatto: fattoDi("fatto_errore") })], { testo: tx("rag_riprovo") },
        { strumento: "crm", testo: tx("agi_cerca", base), stato: "errore" }, { testo: tx("oss_errore") });
    }
    g([tx("perc_aggiorno", { fatto: fattoDi("fatto_errore") })], { testo: tx("rag_arrendo") });
    esito = { tipo: "avviso", testo: tx("esito_guasto") };
  } else if (s.gia_cliente) {
    if (s.obiettivo === "ordine") {
      g([tx("perc_aggiorno", { fatto: fattoDi("fatto_cliente") })], { testo: tx("rag_cliente_ordine") },
        { strumento: "crm", testo: tx("agi_segna_cliente"), stato: "ok" }, { testo: tx("oss_salvato"), fatto: fattoDi("fatto_salvato") });
      g([tx("perc_aggiorno", { fatto: fattoDi("fatto_salvato") })], { testo: tx("rag_fine") });
      esito = { tipo: "ok", testo: tx("esito_cliente_ordine") };
    } else {
      g([tx("perc_aggiorno", { fatto: fattoDi("fatto_cliente") })], { testo: tx("rag_cliente") },
        { strumento: "email", testo: tx("agi_avviso", base), stato: "ok" }, { testo: tx("oss_avviso"), fatto: fattoDi("fatto_avviso") });
      g([tx("perc_aggiorno", { fatto: fattoDi("fatto_avviso") })], { testo: tx("rag_fine") });
      esito = { tipo: "neutro", testo: tx("esito_cliente") };
    }
  } else {
    g([tx("perc_aggiorno", { fatto: fattoDi("fatto_non_cliente") })], { testo: tx("rag_dati") },
      { strumento: "web", testo: tx("agi_visite"), stato: "ok" }, { testo: tx("oss_visite", base), fatto: fattoDi("fatto_visite", base) });
    const livelloTesto = sc.livelli[calc.livello];
    const dettaglio = calc.parti.map((p) => tx(p.chiave, p.valori)).join(", ");
    const ragPunteggio = tx("rag_punteggio", { dettaglio, punteggio: calc.totale, massimo: sc.punteggio.massimo, livello: livelloTesto });
    const fattoPunteggio = fattoDi("fatto_punteggio", { punteggio: calc.totale, livello: livelloTesto });
    const misura = { valore: calc.totale, massimo: sc.punteggio.massimo, soglie: [sc.punteggio.soglia_tiepido, sc.punteggio.soglia_caldo], livello: calc.livello };
    const percVisite = [tx("perc_aggiorno", { fatto: fattoDi("fatto_visite", base) })];
    if (s.obiettivo === "qualifica") {
      g(percVisite, { testo: `${ragPunteggio} ${tx("rag_q_" + calc.livello)}`, fatto: fattoPunteggio, misura },
        { strumento: "crm", testo: tx("agi_q_" + calc.livello), stato: "ok" }, { testo: tx("oss_salvato"), fatto: fattoDi("fatto_salvato") });
      g([tx("perc_aggiorno", { fatto: fattoDi("fatto_salvato") })], { testo: tx("rag_fine") });
      esito = { tipo: calc.livello === "caldo" ? "ok" : "neutro", testo: tx("esito_q_" + calc.livello) };
    } else if (s.obiettivo === "call") {
      if (calc.livello === "caldo") {
        g(percVisite, { testo: `${ragPunteggio} ${tx("rag_c_caldo")}`, fatto: fattoPunteggio, misura },
          { strumento: "calendario", testo: tx("agi_slot"), stato: "ok" }, { testo: tx("oss_slot"), fatto: fattoDi("fatto_slot") });
        g([tx("perc_aggiorno", { fatto: fattoDi("fatto_slot") })], { testo: tx("rag_bozza") },
          { strumento: "email", testo: tx("agi_bozza"), stato: "ok" }, { testo: tx("oss_bozza"), fatto: fattoDi("fatto_bozza") });
        g([tx("perc_aggiorno", { fatto: fattoDi("fatto_bozza") })], { testo: tx("rag_fine") });
        esito = { tipo: "ok", testo: tx("esito_c_caldo") };
      } else {
        g(percVisite, { testo: `${ragPunteggio} ${tx("rag_c_no")}`, fatto: fattoPunteggio, misura },
          { strumento: "crm", testo: tx("agi_c_no"), stato: "ok" }, { testo: tx("oss_salvato"), fatto: fattoDi("fatto_salvato") });
        g([tx("perc_aggiorno", { fatto: fattoDi("fatto_salvato") })], { testo: tx("rag_fine") });
        esito = { tipo: "neutro", testo: tx("esito_c_no") };
      }
    } else {
      g(percVisite, { testo: `${ragPunteggio} ${tx(calc.livello === "caldo" ? "rag_o_caldo" : "rag_o_altro")}`, fatto: fattoPunteggio, misura },
        { strumento: "crm", testo: tx("agi_o", { punteggio: calc.totale }), stato: "ok" }, { testo: tx("oss_salvato"), fatto: fattoDi("fatto_salvato") });
      g([tx("perc_aggiorno", { fatto: fattoDi("fatto_salvato") })], { testo: tx("rag_fine") });
      esito = { tipo: "ok", testo: tx("esito_o") };
    }
  }

  // Appiattimento in eventi, con il freno del numero massimo di giri.
  const eventi = [];
  let azioni = 0;
  let ultimoFatto = null;
  for (const giro of giri) {
    if (giro.agi && azioni >= s.limite_giri) {
      eventi.push({ stazione: "percepisce", testo: ultimoFatto ? tx("perc_aggiorno", { fatto: ultimoFatto }) : giro.perc[0], giro: azioni });
      eventi.push({ stazione: "ragiona", testo: tx("rag_limite", { massimo: s.limite_giri }), giro: azioni, stop: true });
      return { eventi, esito: { tipo: "avviso", testo: tx("esito_limite") }, fermatoDalLimite: true };
    }
    const n = giro.agi ? azioni + 1 : azioni;
    eventi.push({ stazione: "percepisce", testo: giro.perc.join(" "), giro: Math.max(n, 1) });
    eventi.push({ stazione: "ragiona", testo: giro.rag.testo, fatto: giro.rag.fatto, misura: giro.rag.misura, giro: Math.max(n, 1) });
    if (giro.agi) {
      azioni += 1;
      eventi.push({ stazione: "agisce", testo: giro.agi.testo, strumento: giro.agi.strumento, stato: giro.agi.stato, giro: azioni });
      eventi.push({ stazione: "osserva", testo: giro.oss.testo, fatto: giro.oss.fatto, stato: giro.agi.stato, giro: azioni });
      if (giro.oss.fatto) ultimoFatto = giro.oss.fatto;
    }
  }
  return { eventi, esito };
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const tempi = sc.tempi;
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const s = {
    obiettivo: sc.obiettivi[0].id,
    dipendenti: sc.lead.dipendenti.min,
    visite: sc.lead.visite.min,
    ruolo: sc.lead.ruoli[0].id,
    ha_risposto: false,
    gia_cliente: false,
    crm_guasto: false,
    limite_giri: sc.limite_giri.max,
    modalita: "agente",
  };
  let piano = null;
  let indice = 0;
  let inRiproduzione = false;
  let generazione = 0;
  let angoloToken = ANGOLO.percepisce;
  let velocita = tempi.velocita_iniziale;
  const durata = (ms) => (ridotto ? 1 : ms / velocita);

  // ------------------------------------------------ comandi (sinistra)
  const comandi = el("aside", { class: "pannello" });
  const segObiettivo = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.obiettivo });
  sc.obiettivi.forEach((o) => segObiettivo.append(el("button", { "data-v": o.id, onclick: () => cambia({ obiettivo: o.id }) }, o.nome)));
  const cursore = (chiave, conf, formatta) => {
    const valore = el("b", {});
    const input = el("input", { type: "range", min: conf.min, max: conf.max, step: conf.passo || 1, "aria-label": conf.etichetta });
    input.addEventListener("input", () => { valore.textContent = formatta(Number(input.value)); });
    input.addEventListener("change", () => cambia({ [chiave]: Number(input.value) }));
    const nodo = el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, conf.etichetta), valore), input);
    return { nodo, imposta: (v) => { input.value = v; valore.textContent = formatta(v); } };
  };
  const cDip = cursore("dipendenti", sc.lead.dipendenti, (v) => String(v));
  const cVis = cursore("visite", sc.lead.visite, (v) => String(v));
  const cLim = cursore("limite_giri", sc.limite_giri, (v) => String(v));
  const selRuolo = el("select", { class: "scelta", "aria-label": sc.lead.etichetta_ruolo, onchange: (e) => cambia({ ruolo: e.target.value }) },
    sc.lead.ruoli.map((r) => el("option", { value: r.id }, r.nome)));
  const interruttore = (chiave, etichetta, pericolo) => {
    const input = el("input", { type: "checkbox", onchange: (e) => cambia({ [chiave]: e.target.checked }) });
    return { nodo: el("label", { class: `interruttore ${pericolo ? "pericolo" : ""}` }, el("span", {}, etichetta), input), input };
  };
  const iRisp = interruttore("ha_risposto", sc.lead.etichetta_risposta);
  const iCli = interruttore("gia_cliente", sc.situazione.etichetta_gia_cliente);
  const iGua = interruttore("crm_guasto", sc.situazione.etichetta_crm_guasto, true);
  const segModo = el("div", { class: "segmentato", role: "group", "aria-label": E.modalita },
    el("button", { "data-v": "agente", onclick: () => cambia({ modalita: "agente" }) }, E.agente),
    el("button", { "data-v": "script", onclick: () => cambia({ modalita: "script" }) }, E.script));
  const avvisoCambio = el("div", { class: "avviso-cambio", "aria-live": "polite" });
  comandi.append(
    el("h3", {}, E.titolo_comandi),
    el("h4", {}, E.obiettivo), segObiettivo,
    el("h4", {}, `${E.lead}: ${sc.lead.azienda}`), cDip.nodo, cVis.nodo,
    el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, sc.lead.etichetta_ruolo)), selRuolo),
    iRisp.nodo,
    el("h4", {}, E.situazione), iCli.nodo, iGua.nodo, cLim.nodo,
    el("h4", {}, E.modalita), segModo, avvisoCambio);

  // ------------------------------------------------ scena (centro)
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: "0 0 720 476", role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `
    <defs>
      <radialGradient id="ca-nucleo" cx="40%" cy="35%"><stop offset="0" stop-color="#818cf8"/><stop offset=".6" stop-color="#6366f1"/><stop offset="1" stop-color="#4338ca"/></radialGradient>
      <radialGradient id="ca-nucleo-s" cx="40%" cy="35%"><stop offset="0" stop-color="#cbd5e1"/><stop offset="1" stop-color="#64748b"/></radialGradient>
      <filter id="ca-bagliore" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <filter id="ca-ombra" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#17203b" flood-opacity=".14"/></filter>
      <linearGradient id="ca-scia" gradientUnits="userSpaceOnUse" x1="100" y1="80" x2="420" y2="400"><stop offset="0" stop-color="#0ea5e9"/><stop offset=".35" stop-color="#8b5cf6"/><stop offset=".7" stop-color="#f59e0b"/><stop offset="1" stop-color="#10b981"/></linearGradient>
    </defs>`;
  const gPista = svgEl("g");
  const pista = svgEl("circle", { cx: CENTRO.x, cy: CENTRO.y, r: RAGGIO, fill: "none", stroke: "#e3e8f4", "stroke-width": 16 });
  const pistaInterna = svgEl("circle", { cx: CENTRO.x, cy: CENTRO.y, r: RAGGIO, fill: "none", stroke: "#fff", "stroke-width": 2, "stroke-dasharray": "2 10", opacity: ".9" });
  gPista.append(pista, pistaInterna);
  for (const a of [-45, 45, 135, 225]) {
    const p = punto(a, RAGGIO);
    gPista.append(svgEl("path", { d: "M-5,-6 L4,0 L-5,6", fill: "none", stroke: "#b8c2db", "stroke-width": 2.4, "stroke-linecap": "round", "stroke-linejoin": "round", transform: `translate(${p.x},${p.y}) rotate(${a + 90})` }));
  }
  const scia = svgEl("path", { fill: "none", stroke: "url(#ca-scia)", "stroke-width": 16, "stroke-linecap": "round", opacity: 0 });
  gPista.append(scia);
  svg.append(gPista);

  // linee verso gli strumenti
  const POS_STR = {};
  const gLinee = svgEl("g");
  const gStrumenti = svgEl("g");
  const nodoAgisce = punto(ANGOLO.agisce, RAGGIO);
  const etichette = geometriaEtichette(sc);
  const bordoSx = STRUMENTO.cx - STRUMENTO.w / 2;
  sc.strumenti.forEach((st, i) => {
    const y = 78 + i * 104;
    POS_STR[st.id] = { x: STRUMENTO.cx, y };
    const d = `M${nodoAgisce.x + 28},${nodoAgisce.y} C${nodoAgisce.x + 180},${nodoAgisce.y} ${bordoSx - 14},${y} ${bordoSx - 2},${y}`;
    const linea = svgEl("path", { d, fill: "none", stroke: "#d6dcea", "stroke-width": 2, "stroke-dasharray": "5 6", "data-str": st.id });
    gLinee.append(linea);
    POS_STR[st.id].linea = linea;
    const g = svgEl("g", { transform: `translate(${STRUMENTO.cx},${y})`, filter: "url(#ca-ombra)" });
    const box = svgEl("rect", { x: -STRUMENTO.w / 2, y: -STRUMENTO.h / 2, width: STRUMENTO.w, height: STRUMENTO.h, rx: 14, fill: "#fff", stroke: "#dde3f0", "stroke-width": 1.5 });
    const ic = svgEl("g", { transform: `translate(${-STRUMENTO.w / 2 + 20},0)`, color: "#64748b" }, ICONE_STRUMENTO[st.id] || "");
    const testi = etichette.filter((x) => x.strumento && x.id === st.id).map((x) => {
      const nodo = svgEl("text", { x: STRUMENTO.xTesto, y: x.y - y, "font-size": x.px, "font-weight": x.grassetto ? 700 : 400, fill: x.grassetto ? "#17203b" : "#64748b" });
      nodo.textContent = x.testo;
      return nodo;
    });
    const segno = svgEl("g", { transform: `translate(${STRUMENTO.w / 2 - 6},${-STRUMENTO.h / 2 + 4})`, opacity: 0 });
    segno.append(svgEl("circle", { r: 10, fill: "#e11d48" }), Object.assign(svgEl("text", { y: 4.5, "text-anchor": "middle", "font-size": 13, "font-weight": 900, fill: "#fff" }), { textContent: "!" }));
    g.append(box, ic, ...testi, segno);
    gStrumenti.append(g);
    Object.assign(POS_STR[st.id], { g, box, ic, segno });
  });
  svg.append(gLinee, gStrumenti);

  // stazioni
  const NODI = {};
  const gStazioni = svgEl("g");
  sc.stazioni.forEach((st) => {
    const p = punto(ANGOLO[st.id], RAGGIO);
    const g = svgEl("g", { transform: `translate(${p.x},${p.y})` });
    const alone = svgEl("circle", { r: 44, fill: COLORE[st.id], opacity: 0 });
    const disco = svgEl("circle", { r: 30, fill: "#fff", stroke: COLORE[st.id], "stroke-width": 3.5, filter: "url(#ca-ombra)" });
    const ic = svgEl("g", { color: COLORE[st.id] }, ICONE_STAZIONE[st.id]);
    const etichetta = svgEl("g");
    const mie = etichette.filter((x) => !x.strumento && x.id === st.id);
    const nodiTesto = mie.map((x) => {
      const nodo = svgEl("text", { x: x.x - p.x, y: x.y - p.y, "text-anchor": x.anchor, "font-size": x.px, "font-weight": x.grassetto ? 800 : 400, fill: x.didascalia ? "#64748b" : COLORE[st.id] });
      nodo.textContent = x.testo;
      return nodo;
    });
    const ultima = mie[mie.length - 1];
    const ySaltato = st.id === "percepisce" ? mie[0].y - p.y - 18 : ultima.y - p.y + 15;
    const saltato = svgEl("text", { x: mie[0].x - p.x, y: ySaltato, "text-anchor": mie[0].anchor, "font-size": 10.5, "font-weight": 800, fill: "#e11d48", opacity: 0 });
    saltato.textContent = `— ${sc.testi.scr_salta} —`;
    etichetta.append(...nodiTesto, saltato);
    g.append(alone, disco, ic, etichetta);
    gStazioni.append(g);
    NODI[st.id] = { g, alone, disco, ic, saltato, p };
  });
  svg.append(gStazioni);

  // nucleo
  const gNucleo = svgEl("g", { transform: `translate(${CENTRO.x},${CENTRO.y})` });
  const anelloGiri = svgEl("circle", { r: 74, fill: "none", stroke: "#e3e8f4", "stroke-width": 6 });
  const arcoGiri = svgEl("circle", { r: 74, fill: "none", stroke: "#6366f1", "stroke-width": 6, "stroke-linecap": "round", transform: "rotate(-90)", "stroke-dasharray": `0 ${2 * Math.PI * 74}` });
  const nucleo = svgEl("circle", { r: 60, fill: "url(#ca-nucleo)", filter: "url(#ca-ombra)" });
  const testoNucleo = svgEl("text", { y: -8, "text-anchor": "middle", "font-size": 15, "font-weight": 900, fill: "#fff", "letter-spacing": "1.5" });
  const testoGiri = svgEl("text", { y: 14, "text-anchor": "middle", "font-size": 12, fill: "#e0e7ff" });
  const simboloEsito = svgEl("g", { opacity: 0, transform: "translate(0,34)" });
  gNucleo.append(anelloGiri, arcoGiri, nucleo, testoNucleo, testoGiri, simboloEsito);
  svg.append(gNucleo);

  // gettone
  const gettone = svgEl("g", { filter: "url(#ca-bagliore)" });
  const gettoneDisco = svgEl("circle", { r: 9, fill: "#fff", stroke: "#6366f1", "stroke-width": 3.5 });
  gettone.append(gettoneDisco);
  svg.append(gettone);
  const pacchetto = svgEl("g", { opacity: 0 });
  pacchetto.append(svgEl("rect", { x: -11, y: -8, width: 22, height: 16, rx: 4, fill: "#f59e0b" }), svgEl("path", { d: "M-7,-3 L0,2 L7,-3", fill: "none", stroke: "#fff", "stroke-width": 2 }));
  svg.append(pacchetto);

  const btnAvvia = el("button", { class: "btn btn-primario", onclick: () => (inRiproduzione ? pausa() : riproduci()) });
  const btnPasso = el("button", { class: "btn", onclick: () => passoSingolo() }, E.passo);
  const btnCapo = el("button", { class: "btn", onclick: () => { reimposta(); } }, E.ricomincia);
  const vel = el("input", { type: "range", min: tempi.velocita_min, max: tempi.velocita_max, step: 0.25, value: velocita, "aria-label": E.velocita, oninput: (e) => { velocita = Number(e.target.value); } });
  const barra = el("div", { class: "barra-riproduzione" }, btnAvvia, btnPasso, btnCapo, el("label", { class: "velocita" }, E.velocita, vel));
  scena.append(svg, barra);

  // ------------------------------------------------ diario (destra)
  const destra = el("aside", { class: "pannello destra" });
  const diario = el("div", { class: "diario", "aria-live": "polite" });
  const fatti = el("div", { class: "fatti" });
  const esitoBox = el("div", {});
  destra.append(el("h3", {}, E.diario), diario, el("h3", { style: "margin-top:14px" }, E.sa), fatti, el("div", { style: "margin-top:12px" }, esitoBox));

  radice.replaceChildren(el("div", { class: "banco" }, comandi, scena, destra));

  // ------------------------------------------------ sincronizzazione comandi
  function aggiornaComandi() {
    segObiettivo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.obiettivo)));
    segModo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.modalita)));
    cDip.imposta(s.dipendenti); cVis.imposta(s.visite); cLim.imposta(s.limite_giri);
    selRuolo.value = s.ruolo;
    iRisp.input.checked = s.ha_risposto; iCli.input.checked = s.gia_cliente; iGua.input.checked = s.crm_guasto;
    btnAvvia.textContent = inRiproduzione ? E.pausa : E.avvia;
  }

  function cambia(diff) {
    Object.assign(s, diff);
    avvisoCambio.textContent = E.cambiato;
    reimposta();
    riproduci();
  }

  // ------------------------------------------------ animazione
  function tween(ms, passo) {
    const gen = generazione;
    return new Promise((ok) => {
      const t0 = performance.now();
      const frame = (ora) => {
        if (gen !== generazione) return ok(false);
        const x = Math.min(1, (ora - t0) / ms);
        passo(morbido(x));
        if (x < 1) requestAnimationFrame(frame); else ok(true);
      };
      requestAnimationFrame(frame);
    });
  }

  function posizionaGettone(angolo) {
    const p = punto(angolo, RAGGIO);
    gettone.setAttribute("transform", `translate(${p.x},${p.y})`);
  }

  function arcoPath(a1, a2) {
    const p1 = punto(a1, RAGGIO), p2 = punto(a2, RAGGIO);
    const grande = a2 - a1 > 180 ? 1 : 0;
    return `M${p1.x},${p1.y} A${RAGGIO},${RAGGIO} 0 ${grande} 1 ${p2.x},${p2.y}`;
  }

  async function muoviVerso(stazione, colore) {
    const meta = ANGOLO[stazione];
    let delta = ((meta - angoloToken) % 360 + 360) % 360;
    gettoneDisco.setAttribute("stroke", colore);
    if (delta === 0) return true;
    const inizio = angoloToken;
    scia.setAttribute("opacity", ".9");
    const ok = await tween(durata(tempi.ms_viaggio * (delta / 90)), (x) => {
      const a = inizio + delta * x;
      posizionaGettone(a);
      scia.setAttribute("d", arcoPath(Math.max(inizio, a - 70), a + 0.01));
    });
    angoloToken = ((meta % 360) + 360) % 360;
    if (angoloToken > 180) angoloToken -= 360;
    scia.animate([{ opacity: 0.9 }, { opacity: 0 }], { duration: durata(500), fill: "forwards" });
    return ok;
  }

  function accendi(stazione) {
    for (const k of STAZIONI) NODI[k].alone.setAttribute("opacity", "0");
    const n = NODI[stazione];
    n.alone.animate([{ opacity: 0.35, r: 30 }, { opacity: 0.12, r: 46 }], { duration: durata(700), fill: "forwards", easing: "ease-out" });
    n.disco.animate([{ transform: "scale(1)" }, { transform: "scale(1.16)" }, { transform: "scale(1)" }], { duration: durata(520), easing: "ease-out" });
  }

  async function viaggioStrumento(id, stato) {
    const S = POS_STR[id];
    if (!S) throw new Error(`strumento sconosciuto nello scenario: ${id}`);
    const linea = S.linea;
    const lunghezza = linea.getTotalLength();
    linea.setAttribute("stroke", COLORE.agisce);
    linea.setAttribute("stroke-width", "3");
    pacchetto.setAttribute("opacity", "1");
    pacchetto.querySelector("rect").setAttribute("fill", COLORE.agisce);
    let ok = await tween(durata(tempi.ms_viaggio), (x) => {
      const p = linea.getPointAtLength(lunghezza * x);
      pacchetto.setAttribute("transform", `translate(${p.x},${p.y})`);
    });
    if (!ok) return false;
    const errore = stato === "errore";
    S.box.setAttribute("stroke", errore ? "#e11d48" : COLORE.agisce);
    S.box.setAttribute("stroke-width", "3");
    S.ic.setAttribute("color", errore ? "#e11d48" : COLORE.agisce);
    S.g.animate(errore
      ? [{ transform: `translate(628px,${S.y}px)` }, { transform: `translate(622px,${S.y}px)` }, { transform: `translate(634px,${S.y}px)` }, { transform: `translate(628px,${S.y}px)` }]
      : [{ transform: `translate(628px,${S.y}px) scale(1)` }, { transform: `translate(628px,${S.y}px) scale(1.08)` }, { transform: `translate(628px,${S.y}px) scale(1)` }],
    { duration: durata(420) });
    if (errore) S.segno.setAttribute("opacity", "1");
    pacchetto.querySelector("rect").setAttribute("fill", errore ? "#e11d48" : COLORE.osserva);
    ok = await tween(durata(tempi.ms_viaggio), (x) => {
      const p = linea.getPointAtLength(lunghezza * (1 - x));
      pacchetto.setAttribute("transform", `translate(${p.x},${p.y})`);
    });
    pacchetto.setAttribute("opacity", "0");
    linea.setAttribute("stroke", "#d6dcea");
    linea.setAttribute("stroke-width", "2");
    S.box.setAttribute("stroke", "#dde3f0");
    S.box.setAttribute("stroke-width", "1.5");
    S.ic.setAttribute("color", "#64748b");
    return ok;
  }

  function aggiornaGiri(giro) {
    const circ = 2 * Math.PI * 74;
    const quota = Math.min(1, giro / s.limite_giri);
    arcoGiri.setAttribute("stroke-dasharray", `${circ * quota} ${circ}`);
    arcoGiri.setAttribute("stroke", giro >= s.limite_giri ? "#f59e0b" : "#6366f1");
    testoGiri.textContent = s.modalita === "script" ? "" : `${E.giro} ${giro} ${E.di_max} ${s.limite_giri}`;
  }

  function vocePerEvento(ev) {
    const nomi = Object.fromEntries(sc.stazioni.map((x) => [x.id, x.nome]));
    const v = el("div", { class: `voce-diario ${ev.stato === "errore" ? "errore" : ""}` },
      el("div", { class: "chip", style: `background:${COLORE[ev.stazione]}`, html: `<svg viewBox="-16 -16 32 32" style="color:#fff">${ICONE_STAZIONE[ev.stazione]}</svg>` }),
      el("div", {}, el("div", { class: "chi", style: `color:${COLORE[ev.stazione]}` }, nomi[ev.stazione]), el("div", { class: "testo" }, ev.testo)));
    if (ev.misura) v.querySelector("div:last-child").append(misuratore(ev.misura));
    return v;
  }

  function misuratore(m) {
    const w = 220, h = 30;
    const x = (v) => (v / m.massimo) * w;
    const colore = { caldo: "#e11d48", tiepido: "#f59e0b", freddo: "#0ea5e9" }[m.livello];
    const box = el("div", { style: "margin-top:6px" });
    box.innerHTML = `<svg viewBox="0 0 ${w} ${h}" width="100%" style="max-width:${w}px" role="img" aria-label="${m.valore}/${m.massimo}">
      <rect x="0" y="8" width="${x(m.soglie[0])}" height="10" rx="5" fill="#bae6fd"/>
      <rect x="${x(m.soglie[0])}" y="8" width="${x(m.soglie[1]) - x(m.soglie[0])}" height="10" fill="#fde68a"/>
      <rect x="${x(m.soglie[1])}" y="8" width="${w - x(m.soglie[1])}" height="10" rx="5" fill="#fecdd3"/>
      <g class="ago"><path d="M0,3 L5,-4 L-5,-4Z" transform="translate(0,7)" fill="${colore}"/><rect x="-1.5" y="6" width="3" height="14" fill="${colore}"/></g>
      <text x="${w}" y="30" text-anchor="end" font-size="10" font-weight="800" fill="${colore}">${m.valore}/${m.massimo}</text></svg>`;
    const ago = box.querySelector(".ago");
    ago.animate([{ transform: "translateX(0px)" }, { transform: `translateX(${x(m.valore)}px)` }], { duration: durata(900), easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
    return box;
  }

  function aggiungiFatto(testo) {
    const vuoto = fatti.querySelector(".vuoto");
    if (vuoto) vuoto.remove();
    fatti.append(el("span", {}, testo));
  }

  function mostraEsito() {
    const e = piano.esito;
    const icone = {
      ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7"/></svg>',
      neutro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/></svg>',
      avviso: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"><path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z"/><path d="M12 8v5M12 16.5v.5" stroke-linecap="round"/></svg>',
      male: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    };
    const scheda = el("div", { class: `esito-scheda ${e.tipo}`, html: icone[e.tipo] }, el("div", {}, el("div", { style: "font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;opacity:.8" }, E.esito), e.testo,
      e.errori && e.errori.length ? el("div", {}, el("div", { style: "margin-top:8px;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em" }, E.attenzione), el("ul", { class: "elenco-errori" }, e.errori.map((x) => el("li", {}, x)))) : null));
    esitoBox.replaceChildren(scheda);
    const colori = { ok: "#16a34a", neutro: "#6366f1", avviso: "#d97706", male: "#e11d48" };
    simboloEsito.innerHTML = `<circle r="11" fill="#fff"/><g transform="translate(-8,-8) scale(.67)" color="${colori[e.tipo]}">${icone[e.tipo]}</g>`;
    simboloEsito.animate([{ opacity: 0, transform: "translate(0px,34px) scale(.4)" }, { opacity: 1, transform: "translate(0px,34px) scale(1)" }], { duration: durata(450), fill: "forwards", easing: "cubic-bezier(.3,1.6,.5,1)" });
    if (e.tipo === "avviso" || e.tipo === "male") nucleo.animate([{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }], { duration: durata(600), iterations: 2 });
  }

  async function eseguiEvento(ev) {
    const gen = generazione;
    if (ev.script) {
      gettoneDisco.setAttribute("stroke", COLORE.agisce);
      const p = NODI.agisce.p;
      const da = { x: CENTRO.x, y: CENTRO.y };
      gettone.setAttribute("opacity", "1");
      await tween(durata(tempi.ms_viaggio), (x) => gettone.setAttribute("transform", `translate(${da.x + (p.x - da.x) * x},${da.y + (p.y - da.y) * x})`));
      if (gen !== generazione) return false;
    } else if (!(await muoviVerso(ev.stazione, COLORE[ev.stazione]))) return false;
    if (gen !== generazione) return false;
    accendi(ev.stazione);
    aggiornaGiri(ev.giro);
    diario.append(vocePerEvento(ev));
    diario.scrollTop = diario.scrollHeight;
    if (ev.fatto && ev.stazione !== "osserva") aggiungiFatto(ev.fatto);
    if (ev.stazione === "agisce" && ev.strumento) {
      if (!(await viaggioStrumento(ev.strumento, ev.stato))) return false;
    }
    if (ev.stazione === "osserva" && ev.fatto) aggiungiFatto(ev.fatto);
    return true;
  }

  async function riproduci() {
    if (!piano) return;
    if (indice >= piano.eventi.length) reimposta();
    inRiproduzione = true;
    aggiornaComandi();
    const gen = generazione;
    while (inRiproduzione && gen === generazione && indice < piano.eventi.length) {
      const ev = piano.eventi[indice];
      indice += 1;
      if (!(await eseguiEvento(ev))) return;
      if (indice >= piano.eventi.length) break;
      await attendi(durata(tempi.ms_per_fase - tempi.ms_viaggio));
    }
    if (gen !== generazione) return;
    if (indice >= piano.eventi.length) mostraEsito();
    inRiproduzione = false;
    aggiornaComandi();
  }

  function pausa() {
    inRiproduzione = false;
    aggiornaComandi();
  }

  let occupato = false;
  async function passoSingolo() {
    if (!piano || occupato) return;
    inRiproduzione = false;
    aggiornaComandi();
    if (indice >= piano.eventi.length) reimposta();
    occupato = true;
    const ev = piano.eventi[indice];
    indice += 1;
    const ok = await eseguiEvento(ev);
    occupato = false;
    if (ok && indice >= piano.eventi.length) mostraEsito();
  }

  function reimposta() {
    generazione += 1;
    inRiproduzione = false;
    occupato = false;
    piano = pianifica(sc, s);
    indice = 0;
    angoloToken = ANGOLO.percepisce;
    posizionaGettone(angoloToken);
    gettone.setAttribute("opacity", "1");
    gettoneDisco.setAttribute("stroke", COLORE.percepisce);
    scia.setAttribute("opacity", "0");
    pacchetto.setAttribute("opacity", "0");
    simboloEsito.setAttribute("opacity", "0");
    simboloEsito.getAnimations().forEach((a) => a.cancel());
    for (const k of STAZIONI) {
      NODI[k].alone.getAnimations().forEach((a) => a.cancel());
      NODI[k].alone.setAttribute("opacity", "0");
      const saltata = piano.script && k !== "agisce";
      NODI[k].g.setAttribute("opacity", saltata ? "0.35" : "1");
      NODI[k].saltato.setAttribute("opacity", saltata ? "1" : "0");
    }
    for (const st of Object.values(POS_STR)) st.segno.setAttribute("opacity", "0");
    pista.setAttribute("stroke-dasharray", piano.script ? "4 10" : "none");
    nucleo.setAttribute("fill", piano.script ? "url(#ca-nucleo-s)" : "url(#ca-nucleo)");
    testoNucleo.textContent = piano.script ? E.script_centro : E.agente_centro;
    aggiornaGiri(0);
    diario.replaceChildren(el("div", { class: "vuoto" }, E.vuoto));
    fatti.replaceChildren(el("span", { class: "vuoto" }, E.nessun_fatto));
    esitoBox.replaceChildren();
    aggiornaComandi();
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) {
      if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    }
    Object.assign(s, stato || {});
    avvisoCambio.textContent = "";
    reimposta();
  }

  reimposta();
  return {
    applica,
    distruggi() { generazione += 1; inRiproduzione = false; },
    _prova: { pianifica: () => pianifica(sc, s), stato: s },
  };
}
