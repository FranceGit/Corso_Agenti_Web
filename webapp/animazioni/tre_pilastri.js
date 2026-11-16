// Lezione interattiva "Osservabilita': log, tracce, metriche" (P7.2) su un caso vero adattato al CRM (dal notebook
// Google di osservabilita'): l'agente risponde "1.243 lead caldi" invece di 10 perche' lo strumento conta_lead
// riceve l'elenco come un unico testo e conta le lettere. Tre viste: log (che cosa e' successo; identificativo
// comune), traccia a cascata (perche' e' successo; cartellini isolati -> filo rosso; span cliccabili), metriche
// (quanto bene va; cruscotto di sistema verde e cruscotto della qualita' in calo). Redazione dei dati personali,
// campionamento delle tracce, gioco "quale pilastro apri". Testi e numeri tutti dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "tre_pilastri";
const VB = { w: 720, h: 400 };
const RIGA = { y0: 46, passo: 40, h: 34, x: 10, w: 700, maxCar: 92 };
const CASCATA = { x0: 190, x1: 700, y0: 58, passo: 46, h: 26, assi: 356 };
const CARTELLINO = { w: 250, h: 46 };
const GRAFICO = { x0: 400, x1: 690, y0: 96, y1: 300, min: 3.5, max: 4.7 };
const TILE = { x: 24, y0: 84, passo: 82, w: 300, h: 66 };
const CARTA = { x0: 30, passo: 225, y: 110, w: 210, h: 170 };

const STILE = `
.lz-tre_pilastri .span-barra, .lz-tre_pilastri .punto-calo { cursor: pointer; }
.lz-tre_pilastri .span-barra:focus-visible rect, .lz-tre_pilastri .punto-calo:focus-visible { stroke: #4f46e5; stroke-width: 3.5; }
.lz-tre_pilastri .riga-log { transition: opacity .35s ease; }
.lz-tre_pilastri .nota { font-size: .78rem; color: var(--tenue); margin: 4px 0 0; }
.lz-tre_pilastri .riquadro { padding: 7px 10px; border-radius: 10px; font-size: .82rem; margin-bottom: 6px; }
.lz-tre_pilastri .riquadro.ok { background: var(--ok-chiaro); color: #166534; }
.lz-tre_pilastri .riquadro.male { background: var(--male-chiaro); color: #9f1239; }
.lz-tre_pilastri .riquadro.avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-tre_pilastri .riquadro.neutro { background: var(--primario-chiaro); color: #3730a3; }
.lz-tre_pilastri .formula { font-weight: 800; font-size: .9rem; margin-bottom: 8px; }
.lz-tre_pilastri .etichetta-piccola { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--tenue-2, #7a849e); }
.lz-tre_pilastri .dettaglio { display: grid; gap: 4px; font-size: .82rem; margin-bottom: 8px; }
.lz-tre_pilastri .dettaglio code { white-space: normal; background: #f4f6fb; padding: 4px 6px; border-radius: 6px; font-size: .78rem; }
.lz-tre_pilastri .scelta-gioco { display: grid; gap: 3px; margin: 6px 0; font-size: .82rem; }
.lz-tre_pilastri .elenco-tracce { display: flex; flex-wrap: wrap; gap: 4px; margin: 4px 0 8px; }
.lz-tre_pilastri .elenco-tracce span { font-size: .74rem; font-weight: 700; padding: .15em .5em; border-radius: 6px; background: #eef1f8; }
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

/** Sostituisce i dati personali con i segnaposto (redazione), se attiva. */
export function redigi(sc, testo, attiva) {
  if (!attiva) return testo;
  return sc.dati_personali.reduce((t, d) => t.split(d.chiaro).join(d.redatto), testo);
}
export function contienePII(sc, testo) {
  return sc.dati_personali.some((d) => testo.includes(d.chiaro));
}

/** Righe di log come le vede lo studente: testo (redatto o no), richiesta visibile solo con l'identificativo comune. */
export function righeLog(sc, s) {
  const righe = sc.log.map((r) => ({
    ora: r.ora,
    richiesta: s.id_comune ? r.richiesta : null,
    testo: redigi(sc, r.testo, s.redazione),
    pii_in_chiaro: !s.redazione && contienePII(sc, r.testo),
    del_caso: r.richiesta === sc.richiesta_caso,
    evidenziata: s.id_comune && r.richiesta === sc.richiesta_caso,
  }));
  return { righe, del_caso: righe.filter((r) => r.del_caso).length, pii: righe.filter((r) => r.pii_in_chiaro).length, tot: righe.length };
}

/** Geometria delle barre della traccia a cascata (proporzionali al tempo). */
export function barre(sc) {
  const scala = (CASCATA.x1 - CASCATA.x0) / sc.durata_totale;
  return sc.span.map((sp, i) => ({ id: sp.id, x: CASCATA.x0 + sp.inizio * scala, w: Math.max(4, sp.durata * scala), y: CASCATA.y0 + i * CASCATA.passo }));
}

/** Lo span aperto e che cosa insegna: sintomo, causa o passo sano. */
export function esaminaSpan(sc, s) {
  if (s.pilastro !== "traccia" || !s.filo || !s.span_aperto) return null;
  const sp = sc.span.find((x) => x.id === s.span_aperto);
  return { span: sp, causa: !!sp.causa, sintomo: sp.tipo === "errore", ingresso: redigi(sc, sp.ingresso, s.redazione), uscita: sp.uscita };
}

/** Il calo del cruscotto della qualita': ultimo giorno contro il giorno prima. */
export function calo(sc) {
  const q = sc.metriche.qualita;
  const prima = q.at(-2), dopo = q.at(-1);
  return { prima, dopo, percento: Math.round(((dopo - prima) / prima) * 100) };
}

/** Quante tracce si conservano al giorno con la politica scelta. */
export function archivio(sc, s) {
  const M = sc.metriche;
  if (s.campionamento === "tutto") return { n: M.richieste_giorno, errori: M.errori_giorno, successi: M.richieste_giorno - M.errori_giorno };
  const successi = Math.round((M.richieste_giorno - M.errori_giorno) * M.quota_successi_campione);
  return { n: successi + M.errori_giorno, errori: M.errori_giorno, successi };
}

/** Riscontro del gioco "quale pilastro apri". */
export function verifica(sc, s) {
  const T = sc.testi;
  const nome = (id) => sc.pilastri.find((p) => p.id === id).nome;
  const righe = sc.domande.map((d) => {
    const scelta = s.scelte[d.id] || "";
    const esito = !scelta ? "vuoto" : scelta === d.migliore ? "giusto" : "sbagliato";
    return { id: d.id, esito, testo: riempi(T[`ver_${esito}`], { domanda: d.testo, migliore: nome(d.migliore), spiega: d.spiega }) };
  });
  const giuste = righe.filter((r) => r.esito === "giusto").length;
  return { righe, giuste, totali: righe.length, sintesi: giuste === righe.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righe.length }) };
}

/** Coordinate dei punti del grafico della qualita'. */
export function puntiQualita(sc) {
  const q = sc.metriche.qualita;
  const dx = (GRAFICO.x1 - GRAFICO.x0) / (q.length - 1);
  return q.map((v, i) => ({ x: GRAFICO.x0 + i * dx, y: GRAFICO.y1 - ((v - GRAFICO.min) / (GRAFICO.max - GRAFICO.min)) * (GRAFICO.y1 - GRAFICO.y0) }));
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const lingua = contesto && contesto.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));
  const num = (x) => x.toLocaleString(lingua);
  const pil = (id) => sc.pilastri.find((p) => p.id === id);

  const s = { vista: "pilastri", pilastro: "log", id_comune: false, filo: false, span_aperto: "", calo_aperto: false, redazione: true, campionamento: "tutto", scelte: {}, verificato: false };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const seg = (chiave, voci, etichetta) => el("div", { class: "segmentato", role: "group", "aria-label": etichetta },
    ...voci.map(([v, t]) => el("button", { "data-v": v, onclick: () => cambia({ [chiave]: v }) }, t)));
  const segVista = seg("vista", [["pilastri", E.vista_pilastri], ["decidi", E.vista_decidi]], E.vista);
  const segPil = seg("pilastro", sc.pilastri.map((p) => [p.id, p.nome]), E.pilastro);
  const interr = (chiave, testo) => {
    const c = el("input", { type: "checkbox", onchange: (e) => cambia({ [chiave]: e.target.checked }) });
    return [el("label", { class: "interruttore" }, el("span", {}, testo), c), c];
  };
  const [nIdc, cIdc] = interr("id_comune", E.id_comune);
  const [nFilo, cFilo] = interr("filo", E.filo);
  const [nRed, cRed] = interr("redazione", E.redazione);
  const segCamp = seg("campionamento", [["tutto", E.tutto], ["campione", E.campione]], E.campionamento);
  const btnCalo = el("button", { class: "btn btn-fantasma", style: "width:100%;justify-content:center;margin-top:8px", onclick: () => cambia({ pilastro: "metriche", calo_aperto: true }) }, E.apri_calo);
  const zonaPil = el("div", {}, el("h4", {}, E.pilastro), segPil, nIdc, nFilo, nRed, el("h4", {}, E.campionamento), segCamp, btnCalo);
  const tendine = {};
  const zonaDecidi = el("div", {});
  for (const d of sc.domande) {
    const sel = el("select", { "aria-label": riempi(T.scegli_per, { domanda: d.testo }), onchange: (e) => scegli(d.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.pilastri.map((p) => el("option", { value: p.id }, p.nome)));
    tendine[d.id] = sel;
    zonaDecidi.append(el("label", { class: "scelta-gioco" }, el("span", {}, d.testo), sel));
  }
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => { s.verificato = true; disegnaDestra(); } }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaPil, zonaDecidi);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${VB.w} ${VB.h}`, role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs><filter id="tp-ombra" x="-10%" y="-20%" width="120%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#17203b" flood-opacity=".15"/></filter></defs>`;
  const titolo = testoSvg({ x: VB.w / 2, y: 26, "text-anchor": "middle", "font-size": 12.5, "font-weight": 800, "letter-spacing": ".06em" }, "");
  const gLog = svgEl("g"), gTraccia = svgEl("g"), gMetriche = svgEl("g"), gDecidi = svgEl("g");
  svg.append(titolo, gLog, gTraccia, gMetriche, gDecidi);

  // log
  const RL = sc.log.map((r, i) => {
    const y = RIGA.y0 + i * RIGA.passo;
    const g = svgEl("g", { class: "riga-log" });
    const fondo = svgEl("rect", { x: RIGA.x, y, width: RIGA.w, height: RIGA.h, rx: 8, fill: "#fff", stroke: "#e3e7f1" });
    const segno = svgEl("rect", { x: RIGA.x, y, width: 5, height: RIGA.h, rx: 2.5, fill: "#cbd2e3" });
    const ora = testoSvg({ x: RIGA.x + 14, y: y + 21, "font-size": 10.5, "font-weight": 700, fill: "#5b6684", "font-family": "monospace" }, r.ora);
    const badge = svgEl("rect", { x: RIGA.x + 84, y: y + 8, width: 64, height: 18, rx: 9, fill: "#e3e7f1" });
    const idTesto = testoSvg({ x: RIGA.x + 116, y: y + 21, "text-anchor": "middle", "font-size": 9.5, "font-weight": 800, fill: "#fff" }, "");
    const testo = testoSvg({ x: RIGA.x + 158, y: y + 21, "font-size": 10.5, fill: "#17203b" }, "");
    g.append(fondo, segno, ora, badge, idTesto, testo);
    gLog.append(g);
    return { g, fondo, segno, badge, idTesto, testo };
  });

  // traccia: cartellini isolati
  const gCart = svgEl("g");
  for (const c of sc.cartellini) {
    const g = svgEl("g", { transform: `rotate(${c.ruota} ${c.x + CARTELLINO.w / 2} ${c.y + CARTELLINO.h / 2})` });
    g.append(svgEl("rect", { x: c.x, y: c.y, width: CARTELLINO.w, height: CARTELLINO.h, rx: 6, fill: "#fffbeb", stroke: "#f59e0b", filter: "url(#tp-ombra)" }));
    g.append(svgEl("circle", { cx: c.x + CARTELLINO.w / 2, cy: c.y + 4, r: 4, fill: "#e11d48" }));
    g.append(testoSvg({ x: c.x + 14, y: c.y + 29, "font-size": 11.5, "font-weight": 700, fill: "#78350f" }, c.testo));
    gCart.append(g);
  }
  // traccia: cascata
  const gCascata = svgEl("g");
  const colTipo = { radice: "#94a3b8", modello: "#6366f1", strumento: "#0d9488", errore: "#e11d48" };
  const SB = {};
  barre(sc).forEach((b, i) => {
    const sp = sc.span[i];
    const g = svgEl("g", { class: "span-barra", tabindex: "0", role: "button", "aria-label": riempi(T.apri_span, { nome: sp.nome }) });
    const etichetta = testoSvg({ x: 14 + sp.livello * 16, y: b.y + CASCATA.h / 2 + 4, "font-size": 11, "font-weight": 700, fill: "#17203b", "font-family": "monospace" }, sp.nome);
    const r = svgEl("rect", { x: b.x, y: b.y, width: b.w, height: CASCATA.h, rx: 6, fill: colTipo[sp.tipo], stroke: "none" });
    g.append(svgEl("rect", { x: 6, y: b.y - 4, width: VB.w - 12, height: CASCATA.h + 8, fill: "transparent" }), etichetta, r);
    const apri = () => cambia({ span_aperto: sp.id }, true);
    g.addEventListener("click", apri);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(); } });
    gCascata.append(g);
    SB[sp.id] = r;
  });
  for (let t = 0; t <= Math.floor(sc.durata_totale); t++) {
    const x = CASCATA.x0 + (t * (CASCATA.x1 - CASCATA.x0)) / sc.durata_totale;
    gCascata.append(svgEl("line", { x1: x, y1: CASCATA.y0 - 8, x2: x, y2: CASCATA.assi - 12, stroke: "#e3e7f1", "stroke-dasharray": "3 3" }));
    gCascata.append(testoSvg({ x, y: CASCATA.assi, "text-anchor": "middle", "font-size": 10, fill: "#5b6684" }, `${num(t)} s`));
  }
  const filoRosso = svgEl("path", { fill: "none", stroke: "#e11d48", "stroke-width": 2.5, "stroke-dasharray": "6 4" });
  gCascata.append(filoRosso);
  gTraccia.append(gCart, gCascata);

  // metriche
  gMetriche.append(testoSvg({ x: TILE.x, y: 62, "font-size": 10.5, "font-weight": 800, fill: "#166534", "letter-spacing": ".05em" }, E.titolo_sistema));
  sc.metriche.sistema.forEach((m, i) => {
    const y = TILE.y0 + i * TILE.passo;
    gMetriche.append(svgEl("rect", { x: TILE.x, y, width: TILE.w, height: TILE.h, rx: 10, fill: "#ecfdf5", stroke: "#16a34a" }));
    gMetriche.append(testoSvg({ x: TILE.x + 14, y: y + 22, "font-size": 10.5, "font-weight": 700, fill: "#166534" }, m.nome));
    gMetriche.append(testoSvg({ x: TILE.x + 14, y: y + 50, "font-size": 18, "font-weight": 800, fill: "#14532d" }, m.valore));
  });
  gMetriche.append(testoSvg({ x: GRAFICO.x0 - 30, y: 62, "font-size": 10.5, "font-weight": 800, fill: "#9f1239", "letter-spacing": ".05em" }, E.titolo_qualita));
  gMetriche.append(testoSvg({ x: GRAFICO.x0 - 30, y: 80, "font-size": 10, fill: "#5b6684" }, sc.metriche.qualita_nome));
  gMetriche.append(svgEl("rect", { x: GRAFICO.x0 - 30, y: GRAFICO.y0 - 8, width: GRAFICO.x1 - GRAFICO.x0 + 50, height: GRAFICO.y1 - GRAFICO.y0 + 44, rx: 10, fill: "#fff", stroke: "#e3e7f1" }));
  const pq = puntiQualita(sc);
  gMetriche.append(svgEl("polyline", { points: pq.map((p) => `${p.x},${p.y}`).join(" "), fill: "none", stroke: "#6366f1", "stroke-width": 2.5 }));
  pq.forEach((p, i) => {
    const ultimo = i === pq.length - 1;
    gMetriche.append(testoSvg({ x: p.x, y: GRAFICO.y1 + 26, "text-anchor": "middle", "font-size": 9.5, fill: "#5b6684" }, sc.metriche.giorni[i]));
    gMetriche.append(testoSvg({ x: p.x, y: p.y - 10, "text-anchor": "middle", "font-size": 9, fill: ultimo ? "#be123c" : "#5b6684", "font-weight": ultimo ? 800 : 400 }, num(sc.metriche.qualita[i])));
    if (!ultimo) gMetriche.append(svgEl("circle", { cx: p.x, cy: p.y, r: 4, fill: "#6366f1" }));
  });
  const ult = pq.at(-1);
  const puntoCalo = svgEl("circle", { class: "punto-calo", cx: ult.x, cy: ult.y, r: 8, fill: "#e11d48", tabindex: "0", role: "button", "aria-label": E.apri_calo });
  puntoCalo.addEventListener("click", () => cambia({ calo_aperto: true }, true));
  puntoCalo.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cambia({ calo_aperto: true }, true); } });
  gMetriche.append(puntoCalo, testoSvg({ x: VB.w / 2, y: 388, "text-anchor": "middle", "font-size": 10, fill: "#5b6684" }, E.nota_numeri));

  // decidi
  gDecidi.append(testoSvg({ x: VB.w / 2, y: 80, "text-anchor": "middle", "font-size": 11, fill: "#5b6684" }, ""));
  sc.pilastri.forEach((p, i) => {
    const x = CARTA.x0 + i * CARTA.passo;
    gDecidi.append(svgEl("rect", { x, y: CARTA.y, width: CARTA.w, height: CARTA.h, rx: 16, fill: "#fff", stroke: p.colore, "stroke-width": 2.5 }));
    gDecidi.append(svgEl("rect", { x, y: CARTA.y, width: CARTA.w, height: 10, rx: 5, fill: p.colore }));
    gDecidi.append(testoSvg({ x: x + CARTA.w / 2, y: CARTA.y + 70, "text-anchor": "middle", "font-size": 24, "font-weight": 900, fill: p.colore }, p.nome));
    gDecidi.append(testoSvg({ x: x + CARTA.w / 2, y: CARTA.y + 112, "text-anchor": "middle", "font-size": 11.5, "font-weight": 700, fill: "#17203b" }, accorcia(p.formula, 32)));
  });
  scena.append(svg);

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  const corpo = el("div", { "aria-live": "polite" });
  destra.append(el("h3", {}, E.titolo_dettaglio), corpo);
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno
  function disegnaScena() {
    const p = pil(s.pilastro);
    titolo.textContent = s.vista === "decidi" ? E.titolo_decidi : p.formula.toLocaleUpperCase(lingua);
    titolo.setAttribute("fill", s.vista === "decidi" ? "#5b6684" : p.colore);
    gLog.setAttribute("display", s.vista === "pilastri" && s.pilastro === "log" ? "inline" : "none");
    gTraccia.setAttribute("display", s.vista === "pilastri" && s.pilastro === "traccia" ? "inline" : "none");
    gMetriche.setAttribute("display", s.vista === "pilastri" && s.pilastro === "metriche" ? "inline" : "none");
    gDecidi.setAttribute("display", s.vista === "decidi" ? "inline" : "none");
    const L = righeLog(sc, s);
    L.righe.forEach((r, i) => {
      const R = RL[i];
      R.testo.textContent = accorcia(r.testo, RIGA.maxCar);
      R.testo.setAttribute("fill", r.pii_in_chiaro ? "#be123c" : "#17203b");
      R.segno.setAttribute("fill", r.pii_in_chiaro ? "#e11d48" : r.evidenziata ? sc.colori_richieste[sc.richiesta_caso] : "#cbd2e3");
      R.badge.setAttribute("fill", r.richiesta ? sc.colori_richieste[r.richiesta] : "#e3e7f1");
      R.idTesto.textContent = r.richiesta || "";
      R.fondo.setAttribute("fill", r.evidenziata ? "#eef2ff" : "#fff");
      R.g.setAttribute("opacity", s.id_comune && !r.del_caso ? ".4" : "1");
    });
    gCart.setAttribute("display", s.filo ? "none" : "inline");
    gCascata.setAttribute("display", s.filo ? "inline" : "none");
    const bb = barre(sc);
    for (const sp of sc.span) SB[sp.id].setAttribute("stroke", sp.id === s.span_aperto ? "#17203b" : "none");
    for (const sp of sc.span) SB[sp.id].setAttribute("stroke-width", sp.id === s.span_aperto ? "3" : "0");
    const iCausa = sc.span.findIndex((x) => x.causa), iErr = sc.span.findIndex((x) => x.tipo === "errore");
    const a = bb[iErr], c = bb[iCausa];
    const vedeFilo = s.span_aperto && (sc.span.find((x) => x.id === s.span_aperto).causa || sc.span.find((x) => x.id === s.span_aperto).tipo === "errore");
    filoRosso.setAttribute("d", `M${a.x + a.w / 2} ${a.y} C ${a.x + a.w / 2} ${a.y - 30}, ${c.x + c.w / 2} ${c.y + CASCATA.h + 30}, ${c.x + c.w / 2} ${c.y + CASCATA.h}`);
    filoRosso.setAttribute("display", vedeFilo ? "inline" : "none");
    puntoCalo.setAttribute("r", s.calo_aperto ? "11" : "8");
  }

  function disegnaDestra() {
    if (s.vista === "decidi") {
      const figli = [];
      if (s.verificato) {
        const v = verifica(sc, s);
        figli.push(el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}`, style: "margin-bottom:8px" }, el("div", {}, v.sintesi)),
          ...v.righe.map((x) => el("div", { class: `riquadro ${x.esito === "giusto" ? "ok" : "male"}` }, x.testo)));
      } else figli.push(...sc.pilastri.map((p) => el("div", { class: "riquadro neutro" }, p.formula)));
      corpo.replaceChildren(...figli);
      return;
    }
    const p = pil(s.pilastro);
    const figli = [el("div", { class: "formula", style: `color:${p.colore}` }, p.formula)];
    if (s.pilastro === "log") {
      const L = righeLog(sc, s);
      figli.push(el("div", { class: `riquadro ${s.id_comune ? "neutro" : "avviso"}` }, s.id_comune ? riempi(T.righe_caso, { id: sc.richiesta_caso, n: L.del_caso, tot: L.tot }) : T.senza_id));
    } else if (s.pilastro === "traccia") {
      const x = esaminaSpan(sc, s);
      if (!s.filo) figli.push(el("div", { class: "riquadro avviso" }, T.filo_spento));
      else if (!x) figli.push(el("div", { class: "riquadro neutro" }, T.invito_span));
      else {
        figli.push(el("div", { class: "dettaglio" },
          el("b", {}, x.span.nome),
          el("span", { class: "etichetta-piccola" }, T.ingresso), el("code", {}, x.ingresso),
          el("span", { class: "etichetta-piccola" }, T.uscita), el("code", {}, x.uscita),
          el("span", { class: "nota" }, riempi(T.durata, { s: num(x.span.durata) }))));
        figli.push(el("div", { class: `riquadro ${x.causa ? "ok" : x.sintomo ? "male" : "neutro"}` }, x.span.spiega));
      }
    } else {
      const k = calo(sc);
      if (!s.calo_aperto) figli.push(el("div", { class: "riquadro neutro" }, T.invito_calo));
      else {
        figli.push(el("div", { class: "riquadro male" }, riempi(T.calo, { prima: num(k.prima), dopo: num(k.dopo), calo: num(k.percento) })));
        figli.push(el("span", { class: "etichetta-piccola" }, E.tracce_calo), el("div", { class: "elenco-tracce" }, sc.metriche.tracce_calo.map((id) => el("span", {}, id))));
        figli.push(el("button", { class: "btn btn-primario", style: "width:100%;justify-content:center", onclick: () => cambia({ pilastro: "traccia", filo: true, span_aperto: "" }) }, riempi(T.apri_traccia, { id: sc.richiesta_caso })));
      }
    }
    const L = righeLog(sc, s);
    figli.push(el("div", { class: `riquadro ${L.pii ? "male" : "ok"}`, style: "margin-top:10px" }, L.pii ? riempi(T.pii_chiaro, { n: L.pii }) : T.pii_redatti));
    const A = archivio(sc, s);
    const M = sc.metriche;
    figli.push(el("span", { class: "etichetta-piccola" }, E.titolo_archivio),
      el("p", { class: "nota" }, s.campionamento === "tutto" ? riempi(T.archivio_tutto, { tot: num(M.richieste_giorno) }) : riempi(T.archivio_campione, { n: num(A.n), tot: num(M.richieste_giorno), succ: num(A.successi), err: num(A.errori) })));
    corpo.replaceChildren(...figli);
    if (!ridotto) corpo.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 250 });
  }

  function aggiornaComandi() {
    for (const [g, k] of [[segVista, "vista"], [segPil, "pilastro"], [segCamp, "campionamento"]]) g.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s[k])));
    cIdc.checked = s.id_comune; cFilo.checked = s.filo; cRed.checked = s.redazione;
    zonaPil.classList.toggle("nascosto", s.vista !== "pilastri");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }

  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaDestra(); }

  function cambia(diff, soloScheda) {
    Object.assign(s, diff);
    if (!soloScheda) s.verificato = false;
    if (!s.filo) s.span_aperto = "";
    ridisegna();
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
    if (!["pilastri", "decidi"].includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!sc.pilastri.some((p) => p.id === nuovo.pilastro)) throw new Error(`stato_animazione: pilastro sconosciuto «${nuovo.pilastro}»`);
    if (!["tutto", "campione"].includes(nuovo.campionamento)) throw new Error(`stato_animazione: campionamento sconosciuto «${nuovo.campionamento}»`);
    if (nuovo.span_aperto && !sc.span.some((x) => x.id === nuovo.span_aperto)) throw new Error(`stato_animazione: span sconosciuto «${nuovo.span_aperto}»`);
    for (const [id, v] of Object.entries(nuovo.scelte)) {
      if (!sc.domande.some((d) => d.id === id)) throw new Error(`stato_animazione: domanda sconosciuta «${id}»`);
      if (!sc.pilastri.some((p) => p.id === v)) throw new Error(`stato_animazione: pilastro sconosciuto «${v}»`);
    }
    Object.assign(s, nuovo, { scelte: { ...nuovo.scelte } });
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo */ },
    _prova: { stato: s, righeLog: () => righeLog(sc, s), span: () => esaminaSpan(sc, s), archivio: () => archivio(sc, s), verifica: () => verifica(sc, s) },
  };
}
