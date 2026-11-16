// Laboratorio "Il rilascio canarino" (P8.1): cento pallini rappresentano il traffico delle richieste dei lead, diviso tra
// la versione in uso (v1) e la nuova (v2) con un cursore a gradini (1% dalla fonte, poi 5-25-50-100% illustrativi).
// Sotto, le curve giornaliere delle risposte riuscite con la soglia; una v2 difettosa cade in un incidente (prompt
// injection in una risposta di un prospect) e manda email non approvate. Reazione: nessuna, a mano il giorno dopo,
// automatica (rollback nello stesso giorno). Gioco "Decidi tu" su quattro momenti del rilascio. Testi dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "rilascio_canary";
const VB = { w: 720, h: 420 };
const GRIGLIA = { x0: 26, y0: 50, passo: 16, raggio: 6, colonne: 20 };
const BOX = { x: 380, w: 324, h: 40, y1: 34, y2: 82 };
const GRAF = { x0: 70, x1: 690, y0: 172, y1: 392 };
const COLORI = { v1: "#4f46e5", v2: "#0d9488", male: "#e11d48", avviso: "#d97706", ok: "#16a34a", vuoto: "#e3e7f1", testo: "#17203b", tenue: "#5b6684", griglia: "#e3e7f1" };

const STILE = `
.lz-rilascio_canary .puntino { transition: fill .45s ease, stroke .45s ease; }
.lz-rilascio_canary .puntino.v2 { animation: lz-rc-pulsa 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
@keyframes lz-rc-pulsa { 50% { transform: scale(1.25); } }
@media (prefers-reduced-motion: reduce) { .lz-rilascio_canary .puntino.v2 { animation: none; } }
.lz-rilascio_canary .dettaglio { display: grid; gap: 10px; font-size: .85rem; }
.lz-rilascio_canary .contatore .riga { display: flex; justify-content: space-between; gap: 8px; font-size: .82rem; }
.lz-rilascio_canary .contatore b { font-variant-numeric: tabular-nums; }
.lz-rilascio_canary .riga-msg { padding: 7px 10px; border-radius: 10px; background: var(--primario-chiaro); color: #3730a3; }
.lz-rilascio_canary .riga-msg.ok { background: var(--ok-chiaro); color: #166534; }
.lz-rilascio_canary .riga-msg.male { background: var(--male-chiaro); color: #9f1239; font-weight: 600; }
.lz-rilascio_canary .riga-msg.avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-rilascio_canary .etichetta-piccola { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--tenue-2, #7a849e); }
.lz-rilascio_canary .bottone-largo { margin-top: 10px; width: 100%; justify-content: center; }
.lz-rilascio_canary .scelta-gioco { display: grid; gap: 3px; margin: 8px 0; font-size: .82rem; }
.lz-rilascio_canary .verifica { display: grid; gap: 6px; }
.lz-rilascio_canary .verifica .riga { font-size: .82rem; padding: 7px 10px; border-radius: 10px; }
.lz-rilascio_canary .verifica .riga.giusto { background: var(--ok-chiaro); color: #166534; }
.lz-rilascio_canary .verifica .riga.quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-rilascio_canary .verifica .riga.sbagliato, .lz-rilascio_canary .verifica .riga.vuoto { background: var(--male-chiaro); color: #9f1239; }
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

// ------------------------------------------------------------------ logica (pura)

/** Cinque giorni di rilascio con la quota di traffico, la versione e la reazione scelte. */
export function simula(sc, s) {
  const v2 = sc.versioni_v2[s.versione_v2];
  if (!v2) throw new Error(`versione v2 sconosciuta «${s.versione_v2}»`);
  if (!sc.gradini.includes(s.traffico)) throw new Error(`traffico fuori dai gradini «${s.traffico}»`);
  const req2 = Math.round((sc.richieste_giorno * s.traffico) / 100);
  let sotto = null;
  v2.successo.forEach((x, i) => { if (sotto === null && x < sc.soglia_successo) sotto = i; });
  let rollback = null;
  if (sotto !== null && s.reazione !== "nessuna") {
    const g = sotto + (s.reazione === "manuale" ? sc.ritardo_manuale_giorni : 0);
    if (g <= sc.giorni - 1) rollback = g;
  }
  const ultimo = rollback === null ? sc.giorni - 1 : rollback;
  const giorni = v2.successo.map((x, i) => {
    const attivo = i <= ultimo;
    return { indice: i, v1: sc.v1.successo[i], v2: attivo ? x : null, attivo, colpiti: attivo ? Math.round(req2 * v2.tasso_problemi[i]) : 0 };
  });
  const colpiti = giorni.reduce((a, g) => a + g.colpiti, 0);
  const inc = v2.incidente;
  return {
    req2, req1: sc.richieste_giorno - req2, sotto, rollback, giorni, colpiti,
    email_non_approvate: colpiti, reclami: Math.round(colpiti * sc.quota_reclami),
    traffico_finale: rollback === null ? s.traffico : 0,
    incidente_visto: Boolean(inc) && inc.giorno - 1 <= ultimo,
    etichetta_v2: v2.etichetta,
  };
}

/** Lo stato dei cento pallini a fine periodo: v1, v2 o "ritirato" (era alla v2, tornato alla v1 con il rollback). */
export function puntini(sc, s) {
  const r = simula(sc, s);
  return Array.from({ length: sc.puntini }, (_, i) => (i < r.traffico_finale ? "v2" : (i < s.traffico && r.rollback !== null ? "ritirato" : "v1")));
}

/** Coordinate delle curve nel grafico (dentro il riquadro). */
export function grafico(sc, s) {
  const r = simula(sc, s);
  const { min, max } = sc.scala_successo;
  const x = (i) => GRAF.x0 + (i * (GRAF.x1 - GRAF.x0)) / (sc.giorni - 1);
  const y = (v) => GRAF.y1 - ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * (GRAF.y1 - GRAF.y0);
  return {
    v1: r.giorni.map((g) => ({ x: x(g.indice), y: y(g.v1) })),
    v2: r.giorni.filter((g) => g.attivo).map((g) => ({ x: x(g.indice), y: y(g.v2), sotto: g.v2 < sc.soglia_successo })),
    soglia_y: y(sc.soglia_successo),
    rollback_x: r.rollback === null ? null : x(r.rollback),
    x_giorni: r.giorni.map((g) => x(g.indice)),
    y_scala: [min, (min + max) / 2, max].map((v) => ({ v, y: y(v) })),
  };
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

  const s = { vista: "fiume", versione_v2: "buona", traffico: sc.gradini[0], reazione: "automatica", scelte: {}, verificato: false };

  // ------------------------------------------------ comandi (sinistra)
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    el("button", { "data-v": "fiume", onclick: () => cambia({ vista: "fiume" }) }, E.vista_fiume),
    el("button", { "data-v": "decidi", onclick: () => cambia({ vista: "decidi" }) }, E.vista_decidi));
  const valoreTraffico = el("b", {});
  const inTraffico = el("input", { type: "range", min: 0, max: sc.gradini.length - 1, step: 1, "aria-label": E.traffico });
  inTraffico.addEventListener("input", () => cambia({ traffico: sc.gradini[Number(inTraffico.value)] }));
  const segVer = el("div", { class: "segmentato", role: "group", "aria-label": E.versione_v2 },
    ...Object.entries(sc.versioni_v2).map(([id, v]) => el("button", { "data-v": id, onclick: () => cambia({ versione_v2: id }) }, v.nome)));
  const segReaz = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.reazione },
    ...sc.reazioni.map((r) => el("button", { "data-v": r.id, onclick: () => cambia({ reazione: r.id }) }, r.nome)));
  const zonaFiume = el("div", {},
    el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, E.traffico), valoreTraffico), inTraffico),
    el("h4", {}, E.versione_v2), segVer, el("h4", {}, E.reazione), segReaz);
  const tendine = {};
  const zonaDecidi = el("div", {});
  for (const g of sc.gioco) {
    const sel = el("select", { class: "scelta", "aria-label": g.domanda, onchange: (e) => scegli(g.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...g.opzioni.map((o) => el("option", { value: o.id }, o.testo)));
    tendine[g.id] = sel;
    zonaDecidi.append(el("label", { class: "scelta-gioco" }, el("span", {}, g.domanda), sel));
  }
  zonaDecidi.append(el("button", { class: "btn btn-primario bottone-largo", onclick: () => controlla() }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaFiume, zonaDecidi);

  // ------------------------------------------------ scena (centro)
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${VB.w} ${VB.h}`, role: "img", "aria-label": E.descrizione_scena });
  const titoloSt = { "font-size": 11, "font-weight": 800, fill: COLORI.tenue, "letter-spacing": ".06em" };
  svg.append(testoSvg({ x: GRIGLIA.x0 - 6, y: 30, ...titoloSt }, E.titolo_fiume));
  const PT = [];
  for (let i = 0; i < sc.puntini; i++) {
    const c = svgEl("circle", { class: "puntino", cx: GRIGLIA.x0 + (i % GRIGLIA.colonne) * GRIGLIA.passo, cy: GRIGLIA.y0 + Math.floor(i / GRIGLIA.colonne) * GRIGLIA.passo, r: GRIGLIA.raggio, "stroke-width": 2 });
    PT.push(c);
    svg.append(c);
  }
  const etichettaRollback = testoSvg({ x: GRIGLIA.x0 - 6, y: GRIGLIA.y0 + 5 * GRIGLIA.passo + 6, "font-size": 10.5, "font-weight": 800, fill: COLORI.avviso }, "");
  svg.append(etichettaRollback);
  function scatola(y, colore) {
    const g = svgEl("g");
    g.append(svgEl("rect", { x: BOX.x, y, width: BOX.w, height: BOX.h, rx: 10, fill: "#fff", stroke: colore, "stroke-width": 1.8 }));
    g.append(svgEl("rect", { x: BOX.x, y, width: 6, height: BOX.h, rx: 3, fill: colore }));
    const t1 = testoSvg({ x: BOX.x + 14, y: y + 16, "font-size": 10.5, "font-weight": 800, fill: COLORI.testo }, "");
    const t2 = testoSvg({ x: BOX.x + 14, y: y + 32, "font-size": 10, fill: COLORI.tenue }, "");
    g.append(t1, t2);
    svg.append(g);
    return { t1, t2 };
  }
  const box1 = scatola(BOX.y1, COLORI.v1);
  const box2 = scatola(BOX.y2, COLORI.v2);
  // grafico
  svg.append(testoSvg({ x: GRIGLIA.x0 - 6, y: GRAF.y0 - 18, ...titoloSt }, E.titolo_curve));
  const gAssi = svgEl("g");
  svg.append(gAssi);
  const linSoglia = svgEl("line", { x1: GRAF.x0, x2: GRAF.x1, stroke: COLORI.male, "stroke-width": 1.5, "stroke-dasharray": "6 4" });
  const testoSoglia = testoSvg({ x: GRAF.x1, "text-anchor": "end", "font-size": 10, "font-weight": 700, fill: COLORI.male }, E.soglia);
  const linRollback = svgEl("line", { y1: GRAF.y0, y2: GRAF.y1, stroke: COLORI.avviso, "stroke-width": 2 });
  const testoRollback = testoSvg({ y: GRAF.y0 - 4, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: COLORI.avviso }, E.rollback);
  const curva1 = svgEl("polyline", { fill: "none", stroke: COLORI.v1, "stroke-width": 3, "stroke-linejoin": "round" });
  const curva2 = svgEl("polyline", { fill: "none", stroke: COLORI.v2, "stroke-width": 3, "stroke-linejoin": "round" });
  const gPunti = svgEl("g");
  const incidente = svgEl("g");
  const incCerchio = svgEl("circle", { r: 11, fill: COLORI.male });
  const incTesto = testoSvg({ "text-anchor": "middle", "font-size": 13, "font-weight": 900, fill: "#fff" }, "!");
  incidente.append(incCerchio, incTesto);
  svg.append(linSoglia, testoSoglia, curva1, curva2, gPunti, linRollback, testoRollback, incidente);
  svg.append(svgEl("rect", { x: GRAF.x1 - 190, y: GRAF.y0 - 30, width: 12, height: 4, fill: COLORI.v1 }),
    testoSvg({ x: GRAF.x1 - 174, y: GRAF.y0 - 25, "font-size": 10, fill: COLORI.tenue }, E.legenda_v1),
    svgEl("rect", { x: GRAF.x1 - 90, y: GRAF.y0 - 30, width: 12, height: 4, fill: COLORI.v2 }),
    testoSvg({ x: GRAF.x1 - 74, y: GRAF.y0 - 25, "font-size": 10, fill: COLORI.tenue }, E.legenda_v2));
  scena.append(svg);

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  const dettaglio = el("div", { class: "dettaglio", "aria-live": "polite" });
  destra.append(el("h3", {}, E.titolo_contatori), dettaglio);
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno
  function disegnaScena() {
    const r = simula(sc, s);
    const p = puntini(sc, s);
    p.forEach((stato, i) => {
      const c = PT[i];
      c.setAttribute("fill", stato === "v2" ? COLORI.v2 : (stato === "ritirato" ? "#fff" : COLORI.v1));
      c.setAttribute("stroke", stato === "ritirato" ? COLORI.avviso : "none");
      c.classList.toggle("v2", stato === "v2" && !ridotto);
    });
    etichettaRollback.textContent = r.rollback === null ? "" : riempi(T.rollback_giorno, { g: r.rollback + 1 });
    box1.t1.textContent = sc.v1.etichetta;
    box1.t2.textContent = riempi(T.richieste_v1, { n: num(sc.richieste_giorno - Math.round((sc.richieste_giorno * r.traffico_finale) / 100)) });
    box2.t1.textContent = r.etichetta_v2;
    box2.t2.textContent = riempi(T.richieste_v2, { n: num(Math.round((sc.richieste_giorno * r.traffico_finale) / 100)) });
    const G = grafico(sc, s);
    gAssi.replaceChildren(
      ...G.y_scala.map((t) => svgEl("line", { x1: GRAF.x0, x2: GRAF.x1, y1: t.y, y2: t.y, stroke: COLORI.griglia })),
      ...G.y_scala.map((t) => testoSvg({ x: GRAF.x0 - 10, y: t.y + 4, "text-anchor": "end", "font-size": 10, fill: COLORI.tenue }, num(t.v))),
      ...G.x_giorni.map((x, i) => testoSvg({ x, y: GRAF.y1 + 16, "text-anchor": "middle", "font-size": 10, fill: COLORI.tenue }, riempi(T.giorno, { n: i + 1 }))));
    linSoglia.setAttribute("y1", G.soglia_y);
    linSoglia.setAttribute("y2", G.soglia_y);
    testoSoglia.setAttribute("y", G.soglia_y - 5);
    curva1.setAttribute("points", G.v1.map((q) => `${q.x},${q.y}`).join(" "));
    curva2.setAttribute("points", G.v2.map((q) => `${q.x},${q.y}`).join(" "));
    gPunti.replaceChildren(...G.v2.map((q) => svgEl("circle", { cx: q.x, cy: q.y, r: 4.5, fill: q.sotto ? COLORI.male : COLORI.v2, stroke: "#fff", "stroke-width": 1.5 })));
    if (G.rollback_x === null) { linRollback.setAttribute("display", "none"); testoRollback.setAttribute("display", "none"); }
    else {
      for (const n of [linRollback, testoRollback]) n.removeAttribute("display");
      linRollback.setAttribute("x1", G.rollback_x + 14);
      linRollback.setAttribute("x2", G.rollback_x + 14);
      testoRollback.setAttribute("x", G.rollback_x + 14);
    }
    const inc = sc.versioni_v2[s.versione_v2].incidente;
    if (inc && r.incidente_visto) {
      const xi = G.x_giorni[inc.giorno - 1];
      incidente.removeAttribute("display");
      incCerchio.setAttribute("cx", xi);
      incCerchio.setAttribute("cy", GRAF.y0 + 14);
      incTesto.setAttribute("x", xi);
      incTesto.setAttribute("y", GRAF.y0 + 19);
    } else incidente.setAttribute("display", "none");
  }

  function contatore(etichetta, valore, colore) {
    return el("div", { class: "contatore" }, el("div", { class: "riga" }, el("span", {}, etichetta), el("b", { style: `color:${colore}` }, num(valore))));
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
    const r = simula(sc, s);
    const v2 = sc.versioni_v2[s.versione_v2];
    const colore = r.colpiti ? COLORI.male : COLORI.ok;
    const figli = [
      contatore(E.email_non_approvate, r.email_non_approvate, colore),
      contatore(E.reclami, r.reclami, colore),
      contatore(E.clienti_colpiti, r.colpiti, colore),
    ];
    if (r.sotto === null) figli.push(el("div", { class: "riga-msg ok" }, riempi(T.sempre_sopra, { soglia: sc.soglia_successo })));
    else {
      figli.push(el("div", { class: "riga-msg avviso" }, riempi(T.sotto_soglia, { g: r.sotto + 1, valore: v2.successo[r.sotto], soglia: sc.soglia_successo })));
      if (r.incidente_visto) figli.push(el("div", {}, el("div", { class: "etichetta-piccola" }, E.incidente), el("div", { class: "riga-msg male" }, v2.incidente.testo)));
      figli.push(el("div", { class: `riga-msg ${r.rollback === null ? "male" : "avviso"}` }, r.rollback === null ? riempi(T.nessun_rollback, { giorni: sc.giorni }) : riempi(T.rollback_giorno, { g: r.rollback + 1 })));
      figli.push(el("div", { class: "riga-msg" }, riempi(T.colpevole, { etichetta: r.etichetta_v2 })));
      const uno = simula(sc, { ...s, traffico: sc.gradini[0] }).colpiti;
      const cento = simula(sc, { ...s, traffico: sc.gradini.at(-1) }).colpiti;
      figli.push(el("div", { class: "riga-msg" }, riempi(T.confronto, { uno: num(uno), cento: num(cento) })));
    }
    dettaglio.replaceChildren(...figli);
  }

  function aggiornaComandi() {
    segVista.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.vista)));
    segVer.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.versione_v2)));
    segReaz.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.reazione)));
    inTraffico.value = sc.gradini.indexOf(s.traffico);
    valoreTraffico.textContent = riempi(T.formato_traffico, { n: num(s.traffico) });
    zonaFiume.classList.toggle("nascosto", s.vista !== "fiume");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }

  function ridisegna() {
    aggiornaComandi();
    disegnaScena();
    disegnaDettaglio();
  }

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
    nuovo.scelte = { ...(nuovo.scelte || {}) };
    for (const [id, o] of Object.entries(nuovo.scelte)) {
      const g = sc.gioco.find((x) => x.id === id);
      if (!g) throw new Error(`stato_animazione: «${id}» non e' un momento del gioco`);
      if (!g.opzioni.some((x) => x.id === o)) throw new Error(`stato_animazione: mossa sconosciuta «${o}»`);
    }
    if (!["fiume", "decidi"].includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!(nuovo.versione_v2 in sc.versioni_v2)) throw new Error(`stato_animazione: versione sconosciuta «${nuovo.versione_v2}»`);
    if (!sc.gradini.includes(nuovo.traffico)) throw new Error(`stato_animazione: traffico fuori dai gradini «${nuovo.traffico}»`);
    if (!sc.reazioni.some((r) => r.id === nuovo.reazione)) throw new Error(`stato_animazione: reazione sconosciuta «${nuovo.reazione}»`);
    Object.assign(s, nuovo);
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* solo animazioni CSS: si fermano con la rimozione dei nodi */ },
    _prova: { stato: s, simula: () => simula(sc, s), verifica: () => verifica(sc, s) },
  };
}
