// Lezione interattiva "Dal prototipo alla produzione" (P8.1): una modifica alle istruzioni dell'agente di qualificazione
// lead percorre la catena prove -> staging -> cancello (firma del Product Owner) -> produzione. Sotto: tre ambienti
// separati con dati e chiavi propri, quattro protezioni dell'"ultimo miglio" da spegnere (ognuna mostra il guasto tipico
// descritto da Google) e le sei parti versionate con il tasto "annulla" (rollback). Gioco "Decidi tu" con riscontro.
// Tutti i testi arrivano dallo scenario della lezione; qui solo costanti di disegno.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "prototipo_produzione";
const VB = { w: 720, h: 430 };
const STAZ = { x0: 16, passo: 176, w: 160, y: 50, h: 100 };
const CARD = { w: 150, h: 30, y: 158 };
const AMB = { x0: 16, passo: 236, w: 216, y: 222, h: 64 };
const PROT = { x0: 16, passo: 176, w: 160, y: 312, h: 36 };
const VER = { x0: 16, passo: 116, w: 108, y: 374, h: 44 };
const QUADRETTO = { lato: 6, passo: 7.5, perRiga: 20 };
const COLORI = { ok: "#16a34a", male: "#e11d48", avviso: "#d97706", primario: "#4f46e5", spento: "#cbd2e3", testo: "#17203b", tenue: "#5b6684" };

const STILE = `
.lz-prototipo_produzione .card-mod { transition: transform .6s cubic-bezier(.2,.8,.2,1); }
.lz-prototipo_produzione .dettaglio { display: grid; gap: 10px; font-size: .85rem; }
.lz-prototipo_produzione .blocco { display: grid; gap: 4px; }
.lz-prototipo_produzione .etichetta-piccola { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--tenue-2, #7a849e); }
.lz-prototipo_produzione .riga-msg { padding: 7px 10px; border-radius: 10px; background: var(--primario-chiaro); color: #3730a3; }
.lz-prototipo_produzione .riga-msg.ok { background: var(--ok-chiaro); color: #166534; }
.lz-prototipo_produzione .riga-msg.male { background: var(--male-chiaro); color: #9f1239; font-weight: 600; }
.lz-prototipo_produzione .riga-msg.avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-prototipo_produzione .fonte { font-size: .76rem; color: var(--tenue); font-style: italic; }
.lz-prototipo_produzione .bottone-largo { margin-top: 10px; width: 100%; justify-content: center; }
.lz-prototipo_produzione .scelta-gioco { display: grid; gap: 3px; margin: 8px 0; font-size: .82rem; }
.lz-prototipo_produzione .verifica { display: grid; gap: 6px; }
.lz-prototipo_produzione .verifica .riga { font-size: .82rem; padding: 7px 10px; border-radius: 10px; }
.lz-prototipo_produzione .verifica .riga.giusto { background: var(--ok-chiaro); color: #166534; }
.lz-prototipo_produzione .verifica .riga.quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-prototipo_produzione .verifica .riga.sbagliato, .lz-prototipo_produzione .verifica .riga.vuoto { background: var(--male-chiaro); color: #9f1239; }
`;

function svgEl(tag, attr) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attr || {})) e.setAttribute(k, v);
  return e;
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
function testoSvg(attr, testo) {
  const t = svgEl("text", attr);
  t.textContent = testo;
  return t;
}
export function riempi(modello, valori) {
  return modello.replace(/\{(\w+)\}/g, (_, k) => {
    if (!(k in valori)) throw new Error(`segnaposto {${k}} senza valore`);
    return valori[k];
  });
}
function accorcia(t, n) {
  return t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`;
}

// ------------------------------------------------------------------ logica (pura)

/** Dove arriva la modifica: prove rosse, stato del cancello, che cosa vedono i clienti. */
export function pipeline(sc, s) {
  const m = sc.modifiche[s.modifica];
  if (!m) throw new Error(`modifica sconosciuta «${s.modifica}»`);
  const rossi = m.casi_rossi;
  let cancello, posizione;
  if (rossi === 0) { cancello = "firmato"; posizione = "produzione"; }
  else if (s.salta_cancello) { cancello = "saltato"; posizione = "produzione"; }
  else { cancello = "chiuso"; posizione = "cancello"; }
  const nuova_in_produzione = posizione === "produzione" && !s.annullato;
  return { rossi, verdi: sc.casi_totali - rossi, totali: sc.casi_totali, cancello, posizione, nuova_in_produzione, regressione_ai_clienti: nuova_in_produzione && rossi > 0 };
}

/** Le sei parti versionate: quale versione gira in produzione. Il rollback riporta TUTTE allo stato stabile. */
export function versioni(sc, s) {
  const p = pipeline(sc, s);
  return sc.versioni.map((v) => ({ id: v.id, nome: v.nome, in_produzione: p.nuova_in_produzione ? v.nuova : v.stabile, cambiata: p.nuova_in_produzione && v.nuova !== v.stabile }));
}

/** Messaggio sullo stato della catena (sempre senza segnaposto aperti). */
export function messaggioPipeline(sc, s) {
  const T = sc.testi;
  const p = pipeline(sc, s);
  const v = Object.fromEntries(versioni(sc, s).map((x) => [x.id, x.in_produzione]));
  const esempio = sc.modifiche[s.modifica].esempio;
  if (s.annullato && p.posizione === "produzione") return { tipo: "avviso", testo: riempi(T.stato_annullato, { istruzioni: v.istruzioni, modello: v.modello }) };
  if (p.cancello === "firmato") return { tipo: "ok", testo: riempi(T.stato_firmato, { totali: p.totali, istruzioni: v.istruzioni }) };
  if (p.cancello === "saltato") return { tipo: "male", testo: riempi(T.stato_saltato, { esempio }) };
  return { tipo: "avviso", testo: riempi(T.stato_chiuso, { rossi: p.rossi, totali: p.totali, esempio }) };
}

/** Guasti dell'ultimo miglio: uno per ogni protezione spenta. */
export function guasti(sc, s) {
  return sc.protezioni.filter((p) => !s.protezioni[p.id]).map((p) => p.id);
}

/** Dove finiscono le email di prova nell'ambiente scelto. */
export function ambiente(sc, s) {
  const a = sc.ambienti.find((x) => x.id === s.ambiente);
  if (!a) throw new Error(`ambiente sconosciuto «${s.ambiente}»`);
  const reale = a.id === sc.ambiente_reale;
  const rischio = !reale && s.credenziali_condivise;
  return { ambiente: a, reale, rischio, clienti_veri: reale || rischio };
}

/** Riscontro del gioco "Decidi tu". */
export function verifica(sc, s) {
  const T = sc.testi;
  const righe = sc.gioco.map((g) => {
    const scelta = s.scelte[g.id] || "";
    let esito;
    if (!scelta) esito = "vuoto";
    else if (scelta === g.migliore) esito = "giusto";
    else if (g.quasi.includes(scelta)) esito = "quasi";
    else esito = "sbagliato";
    const migliore = g.opzioni.find((o) => o.id === g.migliore).testo;
    return { id: g.id, esito, testo: riempi(T[`ver_${esito}`], { situazione: g.breve, migliore, spiega: g.spiega }) };
  });
  const giuste = righe.filter((x) => x.esito === "giusto").length;
  return { righe, giuste, totali: righe.length, sintesi: giuste === righe.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righe.length }) };
}

/** Posizione x della card della modifica sul binario delle stazioni. */
export function posizioneCard(sc, s) {
  const p = pipeline(sc, s);
  const i = sc.fasi.findIndex((f) => f.id === p.posizione);
  return { x: STAZ.x0 + i * STAZ.passo + (STAZ.w - CARD.w) / 2, y: CARD.y, indice: i };
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const lingua = contesto && contesto.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante: serve per scrivere i numeri nel formato della lingua");
  const num = (x) => x.toLocaleString(lingua);
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));

  const s = {
    vista: "pipeline",
    protezioni: Object.fromEntries(sc.protezioni.map((p) => [p.id, true])),
    ambiente: sc.ambienti[1].id,
    credenziali_condivise: false,
    modifica: "buona",
    salta_cancello: false,
    annullato: false,
    scelte: {},
    verificato: false,
  };
  let primoDisegno = true;

  // ------------------------------------------------ comandi (sinistra)
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    el("button", { "data-v": "pipeline", onclick: () => cambia({ vista: "pipeline" }) }, E.vista_pipeline),
    el("button", { "data-v": "decidi", onclick: () => cambia({ vista: "decidi" }) }, E.vista_decidi));
  const inProt = {};
  const nodoProt = el("div", {});
  for (const p of sc.protezioni) {
    inProt[p.id] = el("input", { type: "checkbox", onchange: (e) => cambia({ protezioni: { ...s.protezioni, [p.id]: e.target.checked } }) });
    nodoProt.append(el("label", { class: "interruttore" }, el("span", {}, p.nome), inProt[p.id]));
  }
  const segAmb = el("div", { class: "segmentato", role: "group", "aria-label": E.ambiente },
    ...sc.ambienti.map((a) => el("button", { "data-v": a.id, onclick: () => cambia({ ambiente: a.id }) }, a.nome)));
  const inChiavi = el("input", { type: "checkbox", onchange: (e) => cambia({ credenziali_condivise: e.target.checked }) });
  const segMod = el("div", { class: "segmentato", role: "group", "aria-label": E.modifica },
    ...Object.entries(sc.modifiche).map(([id, m]) => el("button", { "data-v": id, onclick: () => cambia({ modifica: id, annullato: false }) }, m.nome)));
  const inSalta = el("input", { type: "checkbox", onchange: (e) => cambia({ salta_cancello: e.target.checked, annullato: false }) });
  const btnAnnulla = el("button", { class: "btn bottone-largo", onclick: () => cambia({ annullato: !s.annullato }) }, "");
  const zonaSistema = el("div", {},
    el("h4", {}, E.protezioni), nodoProt,
    el("h4", {}, E.ambiente), segAmb, el("label", { class: "interruttore pericolo" }, el("span", {}, E.credenziali_condivise), inChiavi),
    el("h4", {}, E.modifica), segMod, el("label", { class: "interruttore pericolo" }, el("span", {}, E.salta_cancello), inSalta),
    btnAnnulla);
  const tendine = {};
  const zonaDecidi = el("div", {});
  for (const g of sc.gioco) {
    const sel = el("select", { class: "scelta", "aria-label": g.domanda, onchange: (e) => scegli(g.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...g.opzioni.map((o) => el("option", { value: o.id }, o.testo)));
    tendine[g.id] = sel;
    zonaDecidi.append(el("label", { class: "scelta-gioco" }, el("span", {}, g.domanda), sel));
  }
  zonaDecidi.append(el("button", { class: "btn btn-primario bottone-largo", onclick: () => controlla() }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaSistema, zonaDecidi);

  // ------------------------------------------------ scena (centro)
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${VB.w} ${VB.h}`, role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs><filter id="pp-ombra" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#17203b" flood-opacity=".14"/></filter></defs>`;
  const titoloSt = { "font-size": 11, "font-weight": 800, fill: COLORI.tenue, "letter-spacing": ".06em" };
  svg.append(testoSvg({ x: 16, y: 30, ...titoloSt }, E.titolo_scena));
  // stazioni della catena
  const ST = {};
  sc.fasi.forEach((f, i) => {
    const x = STAZ.x0 + i * STAZ.passo;
    const fondo = svgEl("rect", { x, y: STAZ.y, width: STAZ.w, height: STAZ.h, rx: 12, fill: "#fff", stroke: COLORI.spento, "stroke-width": 1.5 });
    svg.append(fondo);
    svg.append(testoSvg({ x: x + 10, y: STAZ.y + 20, "font-size": 12, "font-weight": 800, fill: COLORI.testo }, accorcia(f.nome, 22)));
    svg.append(testoSvg({ x: x + 10, y: STAZ.y + 35, "font-size": 9.5, fill: COLORI.tenue }, accorcia(f.sotto, 30)));
    if (i < sc.fasi.length - 1) svg.append(svgEl("path", { d: `M${x + STAZ.w + 2} ${STAZ.y + STAZ.h / 2} l12 0 m-5 -4 l5 4 l-5 4`, stroke: COLORI.tenue, "stroke-width": 1.6, fill: "none" }));
    const extra = svgEl("g");
    svg.append(extra);
    ST[f.id] = { fondo, extra, x };
  });
  // quadretti delle prove nella prima stazione
  const quadretti = [];
  for (let k = 0; k < sc.casi_totali; k++) {
    const q = svgEl("rect", { x: ST[sc.fasi[0].id].x + 6 + (k % QUADRETTO.perRiga) * QUADRETTO.passo, y: STAZ.y + 48 + Math.floor(k / QUADRETTO.perRiga) * QUADRETTO.passo, width: QUADRETTO.lato, height: QUADRETTO.lato, rx: 1.5, fill: COLORI.ok });
    quadretti.push(q);
    ST[sc.fasi[0].id].extra.append(q);
  }
  const testoProve = testoSvg({ x: ST[sc.fasi[0].id].x + 10, y: STAZ.y + 88, "font-size": 10, "font-weight": 700, fill: COLORI.tenue }, "");
  ST[sc.fasi[0].id].extra.append(testoProve);
  // timbro del cancello
  const xCanc = ST.cancello ? ST.cancello.x : ST[sc.fasi[2].id].x;
  const timbro = svgEl("g", { transform: `translate(${xCanc + STAZ.w / 2}, ${STAZ.y + 70}) rotate(-8)` });
  const timbroBordo = svgEl("rect", { x: -48, y: -14, width: 96, height: 26, rx: 6, fill: "none", "stroke-width": 2.5 });
  const timbroTesto = testoSvg({ x: 0, y: 4, "text-anchor": "middle", "font-size": 12, "font-weight": 900, "letter-spacing": ".08em" }, "");
  timbro.append(timbroBordo, timbroTesto);
  svg.append(timbro);
  const allarmeProd = testoSvg({ x: ST[sc.fasi[3].id].x + STAZ.w / 2, y: STAZ.y + 72, "text-anchor": "middle", "font-size": 22, "font-weight": 900 }, "");
  svg.append(allarmeProd);
  // card della modifica
  const card = svgEl("g", { class: "card-mod" });
  const cardFondo = svgEl("rect", { x: 0, y: 0, width: CARD.w, height: CARD.h, rx: 8, fill: "#fff", "stroke-width": 2, filter: "url(#pp-ombra)" });
  card.append(cardFondo, testoSvg({ x: 8, y: 19, "font-size": 9.5, "font-weight": 700, fill: COLORI.testo }, accorcia(T.titolo_card, 30)));
  svg.append(card);
  // ambienti
  svg.append(testoSvg({ x: 16, y: AMB.y - 8, ...titoloSt }, E.titolo_ambienti));
  const AM = {};
  sc.ambienti.forEach((a, i) => {
    const x = AMB.x0 + i * AMB.passo;
    const fondo = svgEl("rect", { x, y: AMB.y, width: AMB.w, height: AMB.h, rx: 12, fill: "#fff", stroke: COLORI.spento, "stroke-width": 1.5 });
    svg.append(fondo);
    svg.append(testoSvg({ x: x + 10, y: AMB.y + 19, "font-size": 12, "font-weight": 800, fill: COLORI.testo }, a.nome));
    svg.append(testoSvg({ x: x + 10, y: AMB.y + 36, "font-size": 9.5, fill: COLORI.tenue }, accorcia(a.dati, 38)));
    const chiavi = testoSvg({ x: x + 10, y: AMB.y + 52, "font-size": 9.5, "font-weight": 700, fill: COLORI.tenue }, accorcia(a.chiavi, 38));
    svg.append(chiavi);
    AM[a.id] = { fondo, chiavi, x };
  });
  const filoChiavi = svgEl("path", { fill: "none", stroke: COLORI.male, "stroke-width": 2.2, "stroke-dasharray": "6 4" });
  svg.append(filoChiavi);
  // protezioni
  svg.append(testoSvg({ x: 16, y: PROT.y - 8, ...titoloSt }, E.titolo_protezioni));
  const PR = {};
  sc.protezioni.forEach((p, i) => {
    const x = PROT.x0 + i * PROT.passo;
    const fondo = svgEl("rect", { x, y: PROT.y, width: PROT.w, height: PROT.h, rx: 10, "stroke-width": 1.5 });
    const scudo = svgEl("path", { d: `M${x + 18} ${PROT.y + 8} l9 3 v7 c0 6 -4 9 -9 11 c-5 -2 -9 -5 -9 -11 v-7 z`, "stroke-width": 1.5 });
    const nome = testoSvg({ x: x + 36, y: PROT.y + 16, "font-size": 10.5, "font-weight": 800, fill: COLORI.testo }, accorcia(p.breve, 18));
    const stato = testoSvg({ x: x + 36, y: PROT.y + 29, "font-size": 9.5, "font-weight": 700 }, "");
    svg.append(fondo, scudo, nome, stato);
    PR[p.id] = { fondo, scudo, stato };
  });
  // versioni
  svg.append(testoSvg({ x: 16, y: VER.y - 8, ...titoloSt }, E.titolo_versioni));
  const VE = {};
  sc.versioni.forEach((v, i) => {
    const x = VER.x0 + i * VER.passo;
    const fondo = svgEl("rect", { x, y: VER.y, width: VER.w, height: VER.h, rx: 10, fill: "#fff", "stroke-width": 1.5 });
    const nome = testoSvg({ x: x + VER.w / 2, y: VER.y + 17, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: COLORI.tenue }, accorcia(v.nome, 16));
    const ver = testoSvg({ x: x + VER.w / 2, y: VER.y + 35, "text-anchor": "middle", "font-size": 13, "font-weight": 900 }, "");
    svg.append(fondo, nome, ver);
    VE[v.id] = { fondo, ver };
  });
  scena.append(svg);

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  const dettaglio = el("div", { class: "dettaglio", "aria-live": "polite" });
  destra.append(el("h3", {}, E.titolo_dettaglio), dettaglio);

  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno
  function disegnaScena() {
    const p = pipeline(sc, s);
    const pos = posizioneCard(sc, s);
    const regress = p.regressione_ai_clienti;
    quadretti.forEach((q, k) => q.setAttribute("fill", k >= p.verdi ? COLORI.male : COLORI.ok));
    testoProve.textContent = riempi(T.prove_esito, { verdi: p.verdi, rossi: p.rossi });
    sc.fasi.forEach((f, i) => {
      const attivo = i === pos.indice;
      let colore = attivo ? COLORI.primario : COLORI.spento;
      if (attivo && f.id === sc.fasi[3].id) colore = regress ? COLORI.male : (s.annullato ? COLORI.avviso : COLORI.ok);
      if (attivo && p.cancello === "chiuso") colore = COLORI.avviso;
      ST[f.id].fondo.setAttribute("stroke", colore);
      ST[f.id].fondo.setAttribute("stroke-width", attivo ? 2.5 : 1.5);
    });
    const coloreTimbro = { firmato: COLORI.ok, chiuso: COLORI.avviso, saltato: COLORI.male }[p.cancello];
    timbroBordo.setAttribute("stroke", coloreTimbro);
    timbroTesto.setAttribute("fill", coloreTimbro);
    timbroTesto.textContent = E[p.cancello];
    allarmeProd.textContent = regress ? "!" : "";
    allarmeProd.setAttribute("fill", COLORI.male);
    card.classList.toggle("nascosto", p.posizione === "produzione" && s.annullato);
    cardFondo.setAttribute("stroke", regress ? COLORI.male : (p.cancello === "chiuso" ? COLORI.avviso : COLORI.primario));
    card.style.transition = ridotto || primoDisegno ? "none" : "";
    card.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
    card.setAttribute("transform", `translate(${pos.x},${pos.y})`);
    const a = ambiente(sc, s);
    for (const amb of sc.ambienti) {
      const sel = amb.id === s.ambiente;
      AM[amb.id].fondo.setAttribute("stroke", sel ? (a.rischio ? COLORI.male : COLORI.primario) : COLORI.spento);
      AM[amb.id].fondo.setAttribute("stroke-width", sel ? 2.5 : 1.5);
      AM[amb.id].chiavi.setAttribute("fill", sel && a.rischio ? COLORI.male : COLORI.tenue);
      AM[amb.id].chiavi.textContent = accorcia(sel && a.rischio ? E.chiave_vera : amb.chiavi, 38);
    }
    if (a.rischio) {
      const xr = AM[sc.ambiente_reale].x + 60, xs = AM[s.ambiente].x + 60, y = AMB.y + AMB.h;
      filoChiavi.setAttribute("d", `M${xr} ${y} C ${xr} ${y + 14}, ${xs} ${y + 14}, ${xs} ${y}`);
      filoChiavi.removeAttribute("display");
    } else filoChiavi.setAttribute("display", "none");
    for (const pr of sc.protezioni) {
      const on = s.protezioni[pr.id];
      const c = on ? COLORI.ok : COLORI.male;
      PR[pr.id].fondo.setAttribute("fill", on ? "#f1fbf4" : "#fdecef");
      PR[pr.id].fondo.setAttribute("stroke", c);
      PR[pr.id].scudo.setAttribute("fill", on ? c : "none");
      PR[pr.id].scudo.setAttribute("stroke", c);
      PR[pr.id].stato.setAttribute("fill", c);
      PR[pr.id].stato.textContent = on ? E.acceso : E.spento;
    }
    for (const v of versioni(sc, s)) {
      VE[v.id].ver.textContent = v.in_produzione;
      VE[v.id].ver.setAttribute("fill", v.cambiata ? (regress ? COLORI.male : COLORI.primario) : COLORI.testo);
      VE[v.id].fondo.setAttribute("stroke", v.cambiata ? (regress ? COLORI.male : COLORI.primario) : (s.annullato ? COLORI.avviso : COLORI.spento));
    }
    primoDisegno = false;
  }

  function blocco(titolo, ...figli) {
    return el("div", { class: "blocco" }, el("div", { class: "etichetta-piccola" }, titolo), ...figli);
  }

  function disegnaDettaglio() {
    if (s.vista === "decidi") {
      const figli = [];
      if (s.verificato) {
        const v = verifica(sc, s);
        figli.push(el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
          el("div", { class: "verifica" }, v.righe.map((x) => el("div", { class: `riga ${x.esito}` }, x.testo))));
      }
      dettaglio.replaceChildren(...figli);
      return;
    }
    const m = messaggioPipeline(sc, s);
    const g = guasti(sc, s);
    const a = ambiente(sc, s);
    const v = Object.fromEntries(versioni(sc, s).map((x) => [x.id, x.in_produzione]));
    const datiAmb = { ambiente: a.ambiente.nome, dati: a.ambiente.dati, chiavi: a.ambiente.chiavi, clienti: num(sc.parametri.clienti_toccati_per_errore) };
    const testoAmb = a.reale ? riempi(T.amb_reale, datiAmb) : riempi(a.rischio ? T.amb_rischio : T.amb_sicuro, datiAmb);
    dettaglio.replaceChildren(
      el("div", { class: `riga-msg ${m.tipo}` }, m.testo),
      blocco(E.guasti, ...(g.length
        ? [...g.map((id) => el("div", { class: "riga-msg male" }, sc.protezioni.find((p) => p.id === id).guasto)), el("div", { class: "fonte" }, T.fonte_guasti)]
        : [el("div", { class: "riga-msg ok" }, T.nessun_guasto)])),
      blocco(E.titolo_ambiente, el("div", { class: `riga-msg ${a.rischio ? "male" : (a.reale ? "avviso" : "ok")}` }, testoAmb)),
      blocco(E.titolo_versioni_dx, el("div", {}, riempi(T.registrati_insieme, { istruzioni: v.istruzioni, modello: v.modello }))));
    if (!ridotto) dettaglio.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 250 });
  }

  function aggiornaComandi() {
    segVista.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.vista)));
    segAmb.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.ambiente)));
    segMod.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.modifica)));
    for (const p of sc.protezioni) inProt[p.id].checked = s.protezioni[p.id];
    inChiavi.checked = s.credenziali_condivise;
    inSalta.checked = s.salta_cancello;
    btnAnnulla.textContent = s.annullato ? E.ripristina : E.annulla;
    zonaSistema.classList.toggle("nascosto", s.vista !== "pipeline");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }

  function ridisegna() {
    aggiornaComandi();
    disegnaScena();
    disegnaDettaglio();
  }

  // ------------------------------------------------ interazioni
  function cambia(diff) {
    Object.assign(s, diff);
    if (!("verificato" in diff)) s.verificato = false;
    ridisegna();
  }
  function scegli(id, valore) {
    const scelte = { ...s.scelte };
    if (valore) scelte[id] = valore; else delete scelte[id];
    cambia({ scelte });
  }
  function controlla() {
    s.verificato = true;
    disegnaDettaglio();
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    nuovo.protezioni = { ...s.protezioni, ...(nuovo.protezioni || {}) };
    for (const k of Object.keys(nuovo.protezioni)) if (!sc.protezioni.some((p) => p.id === k)) throw new Error(`stato_animazione: protezione sconosciuta «${k}»`);
    nuovo.scelte = { ...(nuovo.scelte || {}) };
    for (const [id, o] of Object.entries(nuovo.scelte)) {
      const g = sc.gioco.find((x) => x.id === id);
      if (!g) throw new Error(`stato_animazione: «${id}» non e' una situazione del gioco`);
      if (!g.opzioni.some((x) => x.id === o)) throw new Error(`stato_animazione: opzione sconosciuta «${o}»`);
    }
    if (!["pipeline", "decidi"].includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!sc.ambienti.some((a) => a.id === nuovo.ambiente)) throw new Error(`stato_animazione: ambiente sconosciuto «${nuovo.ambiente}»`);
    if (!(nuovo.modifica in sc.modifiche)) throw new Error(`stato_animazione: modifica sconosciuta «${nuovo.modifica}»`);
    Object.assign(s, nuovo);
    primoDisegno = true;
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo: le transizioni CSS si fermano da sole */ },
    _prova: { stato: s, pipeline: () => pipeline(sc, s), verifica: () => verifica(sc, s) },
  };
}
