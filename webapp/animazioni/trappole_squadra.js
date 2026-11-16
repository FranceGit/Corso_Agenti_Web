// Lezione interattiva "Le trappole della squadra di agenti" (P6.4). Quattro scene con il grafo dei messaggi sempre
// visibile e il contatore dei costi (valori illustrativi dallo scenario):
//  - catena: telefono senza fili (riassunto che perde fatti a ogni passaggio, errore iniziale «Spagna» che si
//    propaga) e punti di controllo al passaggio che confrontano i dati con il CRM;
//  - rimpallo: due agenti che si passano la stessa richiesta; limite globale di passaggi con passaggio a una
//    persona, ruoli chiari;
//  - esplode: messaggi per compito con n agenti "tutti con tutti" (n·(n-1)) o con un coordinatore (2·(n-1));
//  - colpa: registro di tre richieste mescolate; con l'identificativo comune si segue una sola richiesta e si
//    trova chi ha sovrascritto lo stato.
// Gioco "Decidi tu": la contromisura per cinque guai. Tutti i testi e i numeri vengono dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "trappole_squadra";
const VISTE = ["catena", "rimpallo", "esplode", "colpa", "decidi"];
const PASSAGGI = ["riassunto", "scheda"];
const TOPOLOGIE = ["tutti", "coordinatore"];
const W = 720, H = 420;
const NODO = { w: 128, h: 50 };
const CAT = { x0: 30, passo: 175, y: 128, chipY0: 196, chipPasso: 26, chipW: 128, chipH: 22, prodottoY: 318, crmY: 58 };
const RIM = { vendite: { x: 90, y: 170 }, assistenza: { x: 502, y: 170 }, persona: { x: 296, y: 316 }, richiestaY: 70 };
const ESP = { cx: 360, cy: 236, r: 140, rNodo: 24 };
const COL = { x0: 30, passo: 175, y: 58, rigaY0: 140, rigaPasso: 26, rigaX: 30, rigaW: 660 };
const CASO = { x: 20, y0: 62, passo: 70, w: 680, h: 60, caratteri: 92 };

const STILE = `
.lz-trappole_squadra .nodo, .lz-trappole_squadra .ckp, .lz-trappole_squadra .sosp { cursor: pointer; }
.lz-trappole_squadra .ckp:focus-visible path, .lz-trappole_squadra .sosp:focus-visible rect { stroke: #4f46e5; stroke-width: 3.5; }
.lz-trappole_squadra .flusso { stroke-dasharray: 5 6; animation: trs-flusso 1.2s linear infinite; }
.lz-trappole_squadra.ridotto .flusso { animation: none; }
@keyframes trs-flusso { to { stroke-dashoffset: -22; } }
.lz-trappole_squadra .contatori { display: grid; gap: 6px; font-size: .82rem; }
.lz-trappole_squadra .contatori .riga { display: flex; justify-content: space-between; gap: 8px; }
.lz-trappole_squadra .contatori b { font-variant-numeric: tabular-nums; }
.lz-trappole_squadra .grande { font-size: 1.3rem; }
.lz-trappole_squadra .nota { font-size: .76rem; color: var(--tenue); margin: 4px 0 0; }
.lz-trappole_squadra .esito { padding: 7px 10px; border-radius: 10px; font-weight: 600; font-size: .84rem; margin-top: 10px; }
.lz-trappole_squadra .esito.ok { background: var(--ok-chiaro); color: #166534; }
.lz-trappole_squadra .esito.avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-trappole_squadra .esito.male { background: var(--male-chiaro); color: #9f1239; }
.lz-trappole_squadra .battute { display: grid; gap: 4px; margin-top: 10px; font-size: .8rem; }
.lz-trappole_squadra .regola { margin-top: 10px; padding: 8px 10px; border-left: 4px solid #8b5cf6; background: #f5f3ff; border-radius: 0 10px 10px 0; font-weight: 700; font-size: .84rem; }
.lz-trappole_squadra .scelta-gioco { display: grid; gap: 3px; margin: 8px 0; font-size: .82rem; }
.lz-trappole_squadra .verifica { display: grid; gap: 6px; }
.lz-trappole_squadra .verifica .riga { font-size: .82rem; padding: 7px 10px; border-radius: 10px; }
.lz-trappole_squadra .verifica .giusto { background: var(--ok-chiaro); color: #166534; }
.lz-trappole_squadra .verifica .quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-trappole_squadra .verifica .sbagliato, .lz-trappole_squadra .verifica .vuoto { background: var(--male-chiaro); color: #9f1239; }
.lz-trappole_squadra .bottoni-sosp { display: grid; gap: 4px; margin-top: 6px; }
`;

function svgEl(tag, attr) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attr || {})) e.setAttribute(k, v);
  return e;
}
function testoSvg(attr, testo) {
  const t = svgEl("text", attr);
  t.textContent = testo;
  return t;
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
  for (const p of testo.split(" ")) {
    if (riga && (riga + " " + p).length > n) { righe.push(riga); riga = p; } else riga = riga ? `${riga} ${p}` : p;
  }
  if (riga) righe.push(riga);
  return righe;
}

// ------------------------------------------------------------------ logica (pura)

/**
 * Telefono senza fili: che cosa riceve ogni agente della catena.
 * Ogni fatto e' "ok", "errato" o "perso". Il primo agente legge il CRM (con l'errore iniziale scrive il paese
 * sbagliato); al passaggio k il riassunto libero perde i fatti con perso_al = k; un controllo sul passaggio k
 * confronta i dati con il CRM, li corregge e lascia un avviso.
 */
export function catena(sc, s) {
  const C = sc.catena;
  const dati = Object.fromEntries(C.fatti.map((f) => [f.id, "ok"]));
  if (s.errore) for (const f of C.fatti) if (f.errato) dati[f.id] = "errato";
  const avvisi = [];
  const agenti = C.agenti.map((a, j) => {
    if (j > 0) {
      if (s.passaggio === "riassunto") for (const f of C.fatti) if (f.perso_al === j && dati[f.id] === "ok") dati[f.id] = "perso";
      if (s.controlli.includes(j)) {
        if (Object.values(dati).some((v) => v !== "ok")) avvisi.push(j);
        for (const k of Object.keys(dati)) dati[k] = "ok";
      }
    }
    const ricevuti = { ...dati };
    const macchiato = a.usa.some((id) => ricevuti[id] !== "ok");
    const paeseErrato = ricevuti.paese === "errato";
    const valori = { paese: C.fatti.find((f) => f.id === "paese")[paeseErrato ? "errato" : "valore"] };
    for (const [k, d] of Object.entries(C.derivati)) valori[k] = d[paeseErrato ? "errato" : "giusto"];
    return { id: a.id, ricevuti, macchiato, prodotto: riempi(a.prodotto, valori) };
  });
  const ultimo = agenti.at(-1).ricevuti;
  return { agenti, avvisi, intatti: Object.values(ultimo).filter((v) => v === "ok").length, totale: C.fatti.length };
}

/** Rimpallo: quanti passaggi, come finisce, quanti messaggi su ogni freccia. */
export function rimpallo(sc, s) {
  const R = sc.rimpallo;
  let passaggi, esito;
  if (s.ruoli_chiari) { passaggi = R.passaggi_con_ruoli; esito = "risolto"; }
  else if (s.limite === 0) { passaggi = R.simulazione_max; esito = "infinito"; }
  else { passaggi = s.limite; esito = "persona"; }
  const archi = [
    { da: "vendite", a: "assistenza", n: Math.ceil(passaggi / 2) },
    { da: "assistenza", a: "vendite", n: Math.floor(passaggi / 2) },
  ];
  if (esito === "persona") archi.push({ da: passaggi % 2 ? "assistenza" : "vendite", a: "persona", n: 1 });
  return { passaggi, esito, archi: archi.filter((x) => x.n > 0) };
}

/** Costo che esplode: messaggi per compito con n agenti e qualita' illustrativa. */
export function esplode(sc, s) {
  const E = sc.esplode;
  const n = s.agenti;
  const messaggi = s.topologia === "tutti" ? n * (n - 1) : 2 * (n - 1);
  const qualita = E.qualita[n - 1];
  const spreco = n > 1 && qualita <= Math.max(...E.qualita.slice(0, n - 1));
  const archi = [];
  if (s.topologia === "tutti") { for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) archi.push({ da: i, a: j, n: 2 }); }
  else for (let i = 1; i < n; i++) archi.push({ da: 0, a: i, n: 2 });
  return { n, messaggi, qualita, spreco, archi };
}

/** Registro della squadra: righe in ordine di tempo; con la traccia si vede la richiesta e si segue la nostra. */
export function registro(sc, s) {
  const K = sc.colpa;
  return K.eventi.map((e) => ({ ...e, evidenziata: s.traccia && e.req === K.richiesta, req_visibile: s.traccia }));
}
/** Messaggi fra agenti consecutivi della stessa richiesta (tutte le richieste o solo la nostra con la traccia). */
export function archiColpa(sc, s) {
  const K = sc.colpa;
  const conta = {};
  const richieste = [...new Set(K.eventi.map((e) => e.req))].filter((r) => !s.traccia || r === K.richiesta);
  for (const r of richieste) {
    const ev = K.eventi.filter((e) => e.req === r);
    for (let i = 1; i < ev.length; i++) {
      const k = `${ev[i - 1].agente}>${ev[i].agente}`;
      conta[k] = (conta[k] || 0) + 1;
    }
  }
  return Object.entries(conta).map(([k, n]) => { const [da, a] = k.split(">"); return { da, a, n }; });
}
/** Verdetto su chi ha sbagliato: senza traccia non si puo' dimostrare. */
export function verdetto(sc, s) {
  const K = sc.colpa;
  if (!s.sospettato) return null;
  if (!s.traccia) return { esito: "non_dimostrabile", testo: K.spiega.non_dimostrabile };
  if (s.sospettato === K.colpevole) return { esito: "giusto", testo: K.spiega.giusto };
  const nome = K.agenti.find((a) => a.id === s.sospettato).nome;
  return { esito: "sbagliato", testo: riempi(K.spiega.sbagliato, { req: K.richiesta, nome }) };
}

/** Chiamate al modello per compito nella scena corrente (null nel gioco). */
export function chiamate(sc, s) {
  if (s.vista === "catena") return sc.catena.agenti.length + s.controlli.length * sc.catena.chiamate_per_controllo;
  if (s.vista === "rimpallo") return 1 + rimpallo(sc, s).passaggi;
  if (s.vista === "esplode") return s.agenti + esplode(sc, s).messaggi;
  if (s.vista === "colpa") return sc.colpa.eventi.filter((e) => e.req === sc.colpa.richiesta).length;
  return null;
}
/** Contatore dei costi (illustrativo): token, euro per compito e al mese, attesa. */
export function costo(sc, s) {
  const n = chiamate(sc, s);
  if (n === null) return null;
  const K = sc.costo;
  const token = n * K.token_per_chiamata;
  const euro = (token * K.euro_per_milione_token) / 1e6;
  return { chiamate: n, token, euro_compito: euro, euro_mese: euro * K.compiti_mese, secondi: n * K.secondi_per_chiamata };
}

/** Riscontro del gioco "Decidi tu". */
export function verifica(sc, s) {
  const T = sc.testi;
  const nome = (id) => sc.risposte_gioco.find((r) => r.id === id).nome;
  const righe = sc.casi.map((c, i) => {
    const scelta = s.scelte[c.id] || "";
    const esito = !scelta ? "vuoto" : scelta === c.migliore ? "giusto" : c.quasi.includes(scelta) ? "quasi" : "sbagliato";
    return { id: c.id, esito, testo: riempi(T[`ver_${esito}`], { n: i + 1, migliore: nome(c.migliore), spiega: c.spiega }) };
  });
  const giuste = righe.filter((r) => r.esito === "giusto").length;
  return { righe, giuste, totali: righe.length, sintesi: giuste === righe.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righe.length }) };
}

/** Posizione (angolo in alto a sinistra o centro) dei nodi del grafo nella scena corrente. */
export function posizioni(sc, s) {
  const pos = {};
  if (s.vista === "catena") sc.catena.agenti.forEach((a, j) => { pos[a.id] = { x: CAT.x0 + j * CAT.passo, y: CAT.y, w: NODO.w, h: NODO.h }; });
  else if (s.vista === "rimpallo") for (const nd of sc.rimpallo.nodi) pos[nd.id] = { ...RIM[nd.id], w: NODO.w, h: NODO.h };
  else if (s.vista === "esplode") {
    const n = s.agenti;
    for (let i = 0; i < n; i++) {
      if (s.topologia === "coordinatore" && i === 0) { pos[i] = { cx: ESP.cx, cy: ESP.cy, r: ESP.rNodo }; continue; }
      const k = s.topologia === "coordinatore" ? i - 1 : i;
      const tot = s.topologia === "coordinatore" ? n - 1 : n;
      const ang = -Math.PI / 2 + (2 * Math.PI * k) / Math.max(tot, 1);
      const r = n === 1 ? 0 : ESP.r;
      pos[i] = { cx: Math.round(ESP.cx + r * Math.cos(ang)), cy: Math.round(ESP.cy + r * Math.sin(ang)), r: ESP.rNodo };
    }
  } else if (s.vista === "colpa") sc.colpa.agenti.forEach((a, j) => { pos[a.id] = { x: COL.x0 + j * COL.passo, y: COL.y, w: NODO.w, h: NODO.h }; });
  return pos;
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const lingua = contesto && contesto.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante: serve per scrivere i numeri nel formato della lingua");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));
  const num = (x, cifre) => x.toLocaleString(lingua, cifre === undefined ? {} : { minimumFractionDigits: cifre, maximumFractionDigits: cifre });
  const C = sc.catena;

  const s = { vista: VISTE[0], errore: false, passaggio: PASSAGGI[0], controlli: [], limite: sc.rimpallo.limite.min, ruoli_chiari: false,
    agenti: sc.esplode.agenti.min, topologia: TOPOLOGIE[0], traccia: false, sospettato: "", scelte: {}, verificato: false };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...VISTE.map((v) => el("button", { "data-v": v, onclick: () => cambia({ vista: v }) }, E[`vista_${v}`])));
  function segmentato(etichetta, valori, chiave) {
    return el("div", { class: "segmentato", role: "group", "aria-label": etichetta },
      ...valori.map((v) => el("button", { "data-v": v, onclick: () => cambia({ [chiave]: v }) }, E[`${chiave}_${v}`])));
  }
  function cursore(def, chiave, formato) {
    const val = el("b", {});
    const inp = el("input", { type: "range", min: def.min, max: def.max, step: def.passo, "aria-label": def.etichetta });
    inp.addEventListener("input", () => cambia({ [chiave]: Number(inp.value) }));
    return { nodo: el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, def.etichetta), val), inp), val, inp, formato };
  }
  const interruttore = (testo, chiave) => {
    const inp = el("input", { type: "checkbox", onchange: (e) => cambia({ [chiave]: e.target.checked }) });
    return { nodo: el("label", { class: "interruttore" }, el("span", {}, testo), inp), inp };
  };
  // catena
  const inErrore = interruttore(E.errore, "errore");
  const segPassaggio = segmentato(E.passaggio, PASSAGGI, "passaggio");
  const inControlli = C.agenti.slice(0, -1).map((a, j) => {
    const inp = el("input", { type: "checkbox", onchange: () => commutaControllo(j + 1) });
    return { nodo: el("label", { class: "interruttore" }, el("span", {}, riempi(T.controllo_dopo, { nome: a.nome })), inp), inp, k: j + 1 };
  });
  const zonaCatena = el("div", {}, inErrore.nodo, el("h4", {}, E.passaggio), segPassaggio, ...inControlli.map((c) => c.nodo));
  // rimpallo
  const cLimite = cursore(sc.rimpallo.limite, "limite");
  const inRuoli = interruttore(E.ruoli_chiari, "ruoli_chiari");
  const zonaRimpallo = el("div", {}, cLimite.nodo, inRuoli.nodo);
  // esplode
  const cAgenti = cursore(sc.esplode.agenti, "agenti");
  const segTopologia = segmentato(E.topologia, TOPOLOGIE, "topologia");
  const zonaEsplode = el("div", {}, cAgenti.nodo, el("h4", {}, E.topologia), segTopologia);
  // colpa
  const inTraccia = interruttore(E.traccia, "traccia");
  const bottoniSosp = el("div", { class: "bottoni-sosp" }, ...sc.colpa.agenti.map((a) =>
    el("button", { class: "btn", "data-a": a.id, onclick: () => cambia({ sospettato: a.id }, true) }, riempi(T.indica, { nome: a.nome }))));
  const zonaColpa = el("div", {}, inTraccia.nodo, el("h4", {}, T.chi_ha_sbagliato), bottoniSosp);
  // decidi
  const tendine = {};
  const zonaDecidi = el("div", {});
  sc.casi.forEach((c, i) => {
    const sel = el("select", { "aria-label": riempi(T.scegli_per, { n: i + 1 }), onchange: (e) => scegli(c.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.risposte_gioco.map((r) => el("option", { value: r.id }, r.nome)));
    tendine[c.id] = sel;
    zonaDecidi.append(el("label", { class: "scelta-gioco" }, el("span", {}, riempi(T.caso, { n: i + 1 })), sel));
  });
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => { s.verificato = true; disegnaDestra(); } }, E.controlla));
  const zone = { catena: zonaCatena, rimpallo: zonaRimpallo, esplode: zonaEsplode, colpa: zonaColpa, decidi: zonaDecidi };
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, ...Object.values(zone));

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  const defs = svgEl("defs");
  for (const [id, colore] of [["trs-freccia", "#7c86a2"], ["trs-freccia-rossa", "#e11d48"]]) {
    const m = svgEl("marker", { id, viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" });
    m.append(svgEl("path", { d: "M0 0 L10 5 L0 10 z", fill: colore }));
    defs.append(m);
  }
  const titolo = testoSvg({ x: W / 2, y: 28, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, "");
  const gScena = svgEl("g");
  svg.append(defs, titolo, gScena);
  scena.append(svg);
  const destra = el("aside", { class: "pannello destra" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}${ridotto ? " ridotto" : ""}` }, comandi, scena, destra));

  function freccia(g, x1, y1, x2, y2, n, rossa, sfalsa) {
    const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1;
    const ox = sfalsa ? (-dy / l) * sfalsa : 0, oy = sfalsa ? (dx / l) * sfalsa : 0;
    const colore = rossa ? "#e11d48" : "#7c86a2";
    g.append(svgEl("line", { class: "flusso", x1: x1 + ox, y1: y1 + oy, x2: x2 + ox, y2: y2 + oy, stroke: colore, "stroke-width": rossa ? 2.4 : 1.6, "marker-end": `url(#${rossa ? "trs-freccia-rossa" : "trs-freccia"})` }));
    if (n !== null) {
      const mx = (x1 + x2) / 2 + ox * 1.9, my = (y1 + y2) / 2 + oy * 1.9;
      g.append(svgEl("circle", { cx: mx, cy: my, r: 10, fill: "#fff", stroke: colore }),
        testoSvg({ x: mx, y: my + 3.5, "text-anchor": "middle", "font-size": 9.5, "font-weight": 800, fill: colore }, num(n)));
    }
  }
  function scatola(g, p, nome, colore, macchia, extra) {
    g.append(svgEl("rect", { x: p.x, y: p.y, width: p.w, height: p.h, rx: 12, fill: macchia ? "#fff1f2" : "#fff", stroke: macchia ? "#e11d48" : colore, "stroke-width": macchia ? 3 : 2 }),
      testoSvg({ x: p.x + p.w / 2, y: p.y + (extra ? 21 : 30), "text-anchor": "middle", "font-size": 11.5, "font-weight": 800, fill: "#17203b" }, nome));
    if (extra) g.append(testoSvg({ x: p.x + p.w / 2, y: p.y + 38, "text-anchor": "middle", "font-size": 9.5, fill: colore, "font-weight": 700 }, extra));
  }

  function disegnaCatena(g) {
    const r = catena(sc, s);
    const pos = posizioni(sc, s);
    g.append(testoSvg({ x: CAT.x0, y: CAT.crmY, "font-size": 10, "font-weight": 800, fill: "#5b6684" }, E.dati_crm),
      testoSvg({ x: CAT.x0, y: CAT.crmY + 16, "font-size": 10, fill: "#17203b" }, C.fatti.map((f) => `${f.etichetta}: ${f.valore}`).join(" · ")));
    C.agenti.forEach((a, j) => {
      const p = pos[a.id];
      const ag = r.agenti[j];
      if (j > 0) {
        const prec = pos[C.agenti[j - 1].id];
        const rossa = Object.values(ag.ricevuti).some((v) => v !== "ok");
        freccia(g, prec.x + prec.w, p.y + p.h / 2, p.x, p.y + p.h / 2, 1, rossa, 0);
        // punto di controllo sul passaggio (cliccabile)
        const mx = (prec.x + prec.w + p.x) / 2, my = p.y - 16;
        const attivo = s.controlli.includes(j);
        const ck = svgEl("g", { class: "ckp", tabindex: "0", role: "button", "aria-pressed": String(attivo), "aria-label": riempi(T.controllo_dopo, { nome: C.agenti[j - 1].nome }) });
        ck.append(svgEl("path", { d: `M${mx} ${my - 11} L${mx + 11} ${my} L${mx} ${my + 11} L${mx - 11} ${my} z`, fill: attivo ? "#16a34a" : "#fff", stroke: attivo ? "#166534" : "#cbd2e3", "stroke-width": 1.6, "stroke-dasharray": attivo ? "" : "3 2" }),
          testoSvg({ x: mx, y: my + 4, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: attivo ? "#fff" : "#94a3b8" }, "✓"));
        const commuta = () => commutaControllo(j);
        ck.addEventListener("click", commuta);
        ck.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); commuta(); } });
        g.append(ck);
      }
      scatola(g, p, a.nome, a.colore, ag.macchiato, null);
      C.fatti.forEach((f, k) => {
        const st = ag.ricevuti[f.id];
        const y = CAT.chipY0 + k * CAT.chipPasso;
        const colore = st === "ok" ? "#16a34a" : st === "errato" ? "#e11d48" : "#94a3b8";
        const valore = st === "ok" ? f.valore : st === "errato" ? f.errato : T.perso;
        g.append(svgEl("rect", { x: p.x, y, width: CAT.chipW, height: CAT.chipH, rx: 7, fill: st === "ok" ? "#f0fdf4" : st === "errato" ? "#fff1f2" : "#f1f5f9", stroke: colore }),
          testoSvg({ x: p.x + 6, y: y + 15, "font-size": 9, fill: colore, "text-decoration": st === "perso" ? "line-through" : "none" }, aCapo(`${f.etichetta}: ${valore}`, 26)[0]));
      });
      aCapo(ag.prodotto, 22).slice(0, 2).forEach((riga, k) => g.append(testoSvg({ x: p.x + p.w / 2, y: CAT.prodottoY + k * 14, "text-anchor": "middle", "font-size": 10.5, "font-weight": 700, fill: ag.macchiato ? "#e11d48" : "#166534" }, riga)));
    });
  }
  function disegnaRimpallo(g) {
    const R = sc.rimpallo;
    const r = rimpallo(sc, s);
    const pos = posizioni(sc, s);
    aCapo(R.richiesta, 90).forEach((riga, k) => g.append(testoSvg({ x: W / 2, y: RIM.richiestaY + k * 15, "text-anchor": "middle", "font-size": 11.5, "font-weight": 700, fill: "#17203b" }, riga)));
    const centro = (id) => ({ x: pos[id].x + pos[id].w / 2, y: pos[id].y + pos[id].h / 2 });
    for (const a of r.archi) {
      const p1 = centro(a.da), p2 = centro(a.a);
      const verso = a.a === "persona" ? 0 : a.da === "vendite" ? -14 : 14;
      const bordo = (p, q) => ({ x: p.x + Math.sign(q.x - p.x) * NODO.w / 2, y: p.y + (a.a === "persona" ? NODO.h / 2 : 0) });
      const b1 = bordo(p1, p2), b2 = a.a === "persona" ? { x: p2.x, y: pos.persona.y } : bordo(p2, p1);
      freccia(g, b1.x, b1.y, b2.x, b2.y, a.n, r.esito === "infinito", verso);
    }
    for (const nd of R.nodi) {
      if (nd.id === "persona" && r.esito !== "persona") continue;
      scatola(g, pos[nd.id], nd.nome, nd.colore, r.esito === "infinito" && nd.id !== "persona", null);
    }
  }
  function disegnaEsplode(g) {
    const r = esplode(sc, s);
    const pos = posizioni(sc, s);
    for (const a of r.archi) {
      const p = pos[a.da], q = pos[a.a];
      g.append(svgEl("line", { x1: p.cx, y1: p.cy, x2: q.cx, y2: q.cy, stroke: r.spreco ? "#e11d48" : "#7c86a2", "stroke-opacity": ".55", "stroke-width": 1.4 }));
    }
    for (let i = 0; i < r.n; i++) {
      const p = pos[i];
      g.append(svgEl("circle", { cx: p.cx, cy: p.cy, r: p.r, fill: i === 0 && s.topologia === "coordinatore" ? "#8b5cf6" : "#4f46e5" }),
        testoSvg({ x: p.cx, y: p.cy + p.r + 13, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: "#17203b" }, sc.esplode.nomi[i]));
    }
    g.append(testoSvg({ x: W / 2, y: 48, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: r.spreco ? "#e11d48" : "#4f46e5" }, riempi(T.messaggi_compito, { n: num(r.messaggi) })));
  }
  function disegnaColpa(g) {
    const K = sc.colpa;
    const pos = posizioni(sc, s);
    const archi = archiColpa(sc, s);
    const centro = (id) => pos[id];
    for (const a of archi) {
      const p = centro(a.da), q = centro(a.a);
      const avanti = q.x > p.x;
      freccia(g, avanti ? p.x + p.w : p.x, p.y + p.h / 2, avanti ? q.x : q.x + q.w, q.y + q.h / 2, a.n, s.traccia && a.a === K.colpevole, 0);
    }
    for (const a of K.agenti) {
      const p = pos[a.id];
      const sel = s.sospettato === a.id;
      const gg = svgEl("g", { class: "sosp", tabindex: "0", role: "button", "aria-label": riempi(T.indica, { nome: a.nome }) });
      scatola(gg, p, a.nome, a.colore, false, null);
      if (sel) gg.append(svgEl("rect", { x: p.x - 4, y: p.y - 4, width: p.w + 8, height: p.h + 8, rx: 14, fill: "none", stroke: "#4f46e5", "stroke-width": 2.5, "stroke-dasharray": "5 4" }));
      const scegliA = () => cambia({ sospettato: a.id }, true);
      gg.addEventListener("click", scegliA);
      gg.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); scegliA(); } });
      g.append(gg);
    }
    registro(sc, s).forEach((riga, i) => {
      const y = COL.rigaY0 + i * COL.rigaPasso;
      const a = K.agenti.find((x) => x.id === riga.agente);
      const spenta = s.traccia && !riga.evidenziata;
      g.append(svgEl("rect", { x: COL.rigaX, y: y - 15, width: COL.rigaW, height: 22, rx: 6, fill: riga.evidenziata ? "#eef2ff" : "#fff", stroke: riga.evidenziata ? "#4f46e5" : "#e2e6f0" }),
        testoSvg({ x: COL.rigaX + 8, y: y, "font-size": 10, "font-family": "Consolas, monospace", fill: spenta ? "#b6bdd0" : "#17203b" },
          `${riga.ora}  ${riga.req_visibile ? riga.req + "  " : ""}${a.nome}: ${riga.testo}`));
    });
  }
  function disegnaDecidi(g) {
    sc.casi.forEach((c, i) => {
      const y = CASO.y0 + i * CASO.passo;
      const scelta = s.scelte[c.id];
      g.append(svgEl("rect", { x: CASO.x, y, width: CASO.w, height: CASO.h, rx: 12, fill: "#fff", stroke: scelta ? "#4f46e5" : "#cbd2e3", "stroke-width": 1.5 }),
        testoSvg({ x: CASO.x + 12, y: y + 18, "font-size": 10.5, "font-weight": 800, fill: "#4f46e5" }, riempi(T.caso, { n: i + 1 })));
      aCapo(c.testo, CASO.caratteri).slice(0, 2).forEach((r, k) => g.append(testoSvg({ x: CASO.x + 12, y: y + 34 + k * 14, "font-size": 10.5, fill: "#17203b" }, r)));
      if (scelta) g.append(testoSvg({ x: CASO.x + CASO.w - 12, y: y + 18, "text-anchor": "end", "font-size": 10, "font-weight": 800, fill: "#4f46e5" }, sc.risposte_gioco.find((r) => r.id === scelta).nome));
    });
  }
  const DISEGNA = { catena: disegnaCatena, rimpallo: disegnaRimpallo, esplode: disegnaEsplode, colpa: disegnaColpa, decidi: disegnaDecidi };
  function disegnaScena() {
    titolo.textContent = E[`titolo_${s.vista}`];
    gScena.replaceChildren();
    DISEGNA[s.vista](gScena);
  }

  function contatore() {
    const c = costo(sc, s);
    const riga = (etichetta, valore, grande) => el("div", { class: "riga" }, el("span", {}, etichetta), el("b", { class: grande ? "grande" : null }, valore));
    return el("div", { class: "contatori", "aria-live": "polite" },
      riga(E.chiamate, num(c.chiamate), true),
      riga(E.token, num(c.token)),
      riga(E.costo_compito, riempi(T.euro, { n: num(c.euro_compito, 4) })),
      riga(riempi(E.costo_mese, { n: num(sc.costo.compiti_mese) }), riempi(T.euro, { n: num(Math.round(c.euro_mese)) }), true),
      riga(E.attesa, riempi(T.secondi, { n: num(c.secondi, 1) })),
      el("p", { class: "nota" }, sc.costo.nota));
  }
  function disegnaDestra() {
    const figli = [el("h3", {}, E.titolo_scheda)];
    if (s.vista === "decidi") {
      if (s.verificato) {
        const v = verifica(sc, s);
        figli.push(el("div", { class: "verifica", "aria-live": "polite" },
          el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
          ...v.righe.map((r) => el("div", { class: `riga ${r.esito}` }, r.testo))));
      }
    } else {
      figli.push(contatore());
      if (s.vista === "catena") {
        const r = catena(sc, s);
        const macchiati = r.agenti.filter((a) => a.macchiato).map((a) => C.agenti.find((x) => x.id === a.id).nome);
        figli.push(el("div", { class: "contatori", style: "margin-top:10px" },
          el("div", {}, riempi(T.fatti_intatti, { n: num(r.intatti), totale: num(r.totale) })),
          el("div", {}, riempi(T.avvisi, { n: num(r.avvisi.length) })),
          ...r.avvisi.map((k) => el("div", { class: "nota" }, riempi(T.avviso_controllo, { nome: C.agenti[k - 1].nome })))),
          el("div", { class: `esito ${macchiati.length ? "male" : "ok"}` }, macchiati.length ? riempi(T.esito_catena_male, { elenco: macchiati.join(", ") }) : T.esito_catena_ok));
      } else if (s.vista === "rimpallo") {
        const r = rimpallo(sc, s);
        const B = sc.rimpallo.battute;
        const battute = r.esito === "risolto" ? [B.ruoli] : Array.from({ length: Math.min(r.passaggi, 4) }, (_, k) => (k % 2 ? B.assistenza : B.vendite));
        figli.push(el("div", { class: "contatori", style: "margin-top:10px" }, el("b", {}, riempi(r.esito === "infinito" ? T.passaggi_infiniti : T.passaggi, { n: num(r.passaggi) }))),
          el("div", { class: "battute" }, ...battute.map((b) => el("div", {}, b))),
          el("div", { class: `esito ${r.esito === "infinito" ? "male" : r.esito === "persona" ? "avviso" : "ok"}` }, T[`esito_${r.esito}`]));
      } else if (s.vista === "esplode") {
        const r = esplode(sc, s);
        figli.push(el("div", { class: "contatori", style: "margin-top:10px" },
          el("div", {}, riempi(T.messaggi_compito, { n: num(r.messaggi) })),
          el("div", {}, riempi(T.qualita, { n: num(r.qualita) }))),
          el("div", { class: `esito ${r.spreco ? "male" : "ok"}` }, r.spreco ? T.consiglio_esplode_spreco : T.consiglio_esplode_ok));
      } else if (s.vista === "colpa") {
        const v = verdetto(sc, s);
        const n = sc.colpa.eventi.length;
        figli.push(el("div", { class: "nota", style: "margin-top:10px" }, s.traccia ? riempi(T.registro_tracciato, { req: sc.colpa.richiesta }) : riempi(T.registro_mescolato, { n: num(n) })));
        if (v) figli.push(el("div", { class: `esito ${v.esito === "giusto" ? "ok" : v.esito === "sbagliato" ? "male" : "avviso"}` }, v.testo));
      }
    }
    figli.push(el("div", { class: "regola" }, E.regola));
    destra.replaceChildren(...figli);
    if (!ridotto && destra.animate) destra.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 220 });
  }

  function aggiornaComandi() {
    segVista.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.vista)));
    segPassaggio.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.passaggio)));
    segTopologia.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.topologia)));
    bottoniSosp.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.a === s.sospettato)));
    inErrore.inp.checked = s.errore;
    inRuoli.inp.checked = s.ruoli_chiari;
    inTraccia.inp.checked = s.traccia;
    for (const c of inControlli) c.inp.checked = s.controlli.includes(c.k);
    cLimite.inp.value = s.limite;
    cLimite.val.textContent = s.limite === 0 ? T.nessun_limite : riempi(T.formato_valore, { n: num(s.limite) });
    cAgenti.inp.value = s.agenti;
    cAgenti.val.textContent = riempi(T.formato_valore, { n: num(s.agenti) });
    for (const [v, z] of Object.entries(zone)) z.classList.toggle("nascosto", v !== s.vista);
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaDestra(); }
  function cambia(diff, tieniSospetto) {
    Object.assign(s, diff);
    s.verificato = false;
    if (!tieniSospetto && ("traccia" in diff || "vista" in diff)) s.sospettato = diff.sospettato || "";
    ridisegna();
  }
  function commutaControllo(k) {
    const controlli = s.controlli.includes(k) ? s.controlli.filter((x) => x !== k) : [...s.controlli, k].sort((a, b) => a - b);
    cambia({ controlli });
  }
  function scegli(id, valore) {
    const scelte = { ...s.scelte };
    if (valore) scelte[id] = valore; else delete scelte[id];
    cambia({ scelte });
  }
  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    nuovo.scelte = { ...(nuovo.scelte || {}) };
    nuovo.controlli = [...(nuovo.controlli || [])];
    if (!VISTE.includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!PASSAGGI.includes(nuovo.passaggio)) throw new Error(`stato_animazione: passaggio sconosciuto «${nuovo.passaggio}»`);
    if (!TOPOLOGIE.includes(nuovo.topologia)) throw new Error(`stato_animazione: topologia sconosciuta «${nuovo.topologia}»`);
    for (const k of nuovo.controlli) if (!(Number.isInteger(k) && k >= 1 && k < C.agenti.length)) throw new Error(`stato_animazione: controllo fuori dalla catena «${k}»`);
    for (const [k, def] of [["limite", sc.rimpallo.limite], ["agenti", sc.esplode.agenti]]) {
      if (!(nuovo[k] >= def.min && nuovo[k] <= def.max)) throw new Error(`stato_animazione: ${k} fuori scala «${nuovo[k]}»`);
    }
    if (nuovo.sospettato && !sc.colpa.agenti.some((a) => a.id === nuovo.sospettato)) throw new Error(`stato_animazione: agente sconosciuto «${nuovo.sospettato}»`);
    for (const [id, r] of Object.entries(nuovo.scelte)) {
      if (!sc.casi.some((c) => c.id === id)) throw new Error(`stato_animazione: caso sconosciuto «${id}»`);
      if (!sc.risposte_gioco.some((x) => x.id === r)) throw new Error(`stato_animazione: risposta sconosciuta «${r}»`);
    }
    Object.assign(s, nuovo);
    ridisegna();
  }
  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo attivo: le animazioni CSS si fermano con il DOM */ },
    _prova: { stato: s, catena: () => catena(sc, s), rimpallo: () => rimpallo(sc, s), esplode: () => esplode(sc, s), costo: () => costo(sc, s), verdetto: () => verdetto(sc, s), verifica: () => verifica(sc, s) },
  };
}
