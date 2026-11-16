// Lezione interattiva "Migliorare osservando: dalle metriche al risultato" (P7.5).
// Quattro viste: (1) cruscotto a piramide collegato (stella polare di business in cima, obiettivi, metriche tecniche,
// tracce) con le metriche di attivita' e di rischio a lato e il cursore del volume di email; (2) esperimento: dicembre
// contro novembre oppure gruppo di controllo nello stesso periodo, con le curve settimanali e la banda d'incertezza;
// (3) il volano della qualita' in quattro passi; (4) gioco "Decidi tu: quale numero dimostra il valore?".
// Numeri e testi arrivano tutti dallo scenario della lezione (illustrativi); qui solo logica e costanti di disegno.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "metriche_impatto";
const VB = { w: 720, h: 430 };
const PIRAMIDE = { cx: 240, chipW: 118, chipH: 44, passo: 128, alti: [40, 118, 196, 274], altezza: 70, semi: [[132, 160], [160, 190], [190, 230], [230, 250]] };
const LATO = { x: 525, w: 160, h: 44, attivita: [60, 110], rischio: [206, 256], testaAtt: 50, testaRis: 196 };
const INDICI = { x: 205, y: [352, 378, 404], alt: 16, perUnita: 60, max: 470 };
const BARRE = { base: 190, alt: 140, w: 90, x: [60, 190, 320] };
const PUNTINI = { x0: 500, y0: 64, passo: 26, colonne: 6 };
const GRAF = { x0: 70, x1: 690, y0: 250, y1: 390 };
const VOLANO = { cx: 220, cy: 238, r: 135, nodo: 46, caratteri: 14, centro: 24 };
const ESITI = { x: 405, y0: 46, passo: 72, w: 300, h: 64, caratteri: 50 };
const SITUAZIONE = { x: 20, y0: 48, h: 84, passo: 92, w: 680, caratteri: 100 };
const PARK = { m: 2147483647, a: 16807 };
const COL = { agente: "#4f46e5", controllo: "#94a3b8", rischio: "#e11d48", attivita: "#f59e0b", luce: "#f59e0b", spento: "#cbd2e3" };

const STILE = `
.lz-metriche_impatto .chip { cursor: pointer; }
.lz-metriche_impatto .chip:focus-visible rect { stroke: #4f46e5; stroke-width: 3.5; }
.lz-metriche_impatto .anim { transition: opacity .4s ease, width .5s ease, height .5s ease, y .5s ease, fill .3s; }
.lz-metriche_impatto.senza-moto .anim { transition: none; }
.lz-metriche_impatto .grande { font-size: 1.05rem; font-weight: 800; }
.lz-metriche_impatto .riga-val { font-size: .8rem; color: var(--tenue); margin: 4px 0 0; }
.lz-metriche_impatto .riga-val.rischio { color: #9f1239; font-weight: 700; }
.lz-metriche_impatto .nota { font-size: .76rem; color: var(--tenue); margin: 6px 0 0; }
.lz-metriche_impatto .segnale { font-size: .8rem; padding: 6px 9px; border-radius: 9px; background: var(--avviso-chiaro); color: #92400e; margin-top: 6px; }
.lz-metriche_impatto .segnale.ok { background: var(--ok-chiaro); color: #166534; }
.lz-metriche_impatto .scelta-gioco { display: grid; gap: 3px; margin: 8px 0; font-size: .8rem; }
.lz-metriche_impatto .verifica { display: grid; gap: 6px; margin-top: 10px; }
.lz-metriche_impatto .verifica .riga { font-size: .8rem; padding: 7px 10px; border-radius: 10px; }
.lz-metriche_impatto .verifica .riga.giusto { background: var(--ok-chiaro); color: #166534; }
.lz-metriche_impatto .verifica .riga.quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-metriche_impatto .verifica .riga.sbagliato, .lz-metriche_impatto .verifica .riga.vuoto { background: var(--male-chiaro); color: #9f1239; }
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
function testoACapo(attr, testo, n, interlinea) {
  const t = svgEl("text", attr);
  aCapo(testo, n).forEach((r, k) => { const ts = svgEl("tspan", { x: attr.x, dy: k ? interlinea : 0 }); ts.textContent = r; t.append(ts); });
  return t;
}
export function riempi(modello, valori) {
  return modello.replace(/\{(\w+)\}/g, (_, k) => {
    if (!(k in valori)) throw new Error(`segnaposto {${k}} senza valore`);
    return valori[k];
  });
}
/** Spezza un testo in righe di al massimo n caratteri, senza tagliare le parole. */
export function aCapo(testo, n) {
  const righe = [];
  let riga = "";
  for (const p of testo.split(/\s+/)) {
    if (riga && (riga + " " + p).length > n) { righe.push(riga); riga = p; } else riga = riga ? `${riga} ${p}` : p;
  }
  if (riga) righe.push(riga);
  return righe;
}

// ------------------------------------------------------------------ logica (pura)

const LIVELLI_PIRAMIDE = ["stella", "obiettivi", "tecniche", "tracce"];

/** Valori delle metriche al livello di volume scelto (indice in scenario.volume.livelli). */
export function valori(sc, volume) {
  const f = sc.volume.livelli[volume];
  if (f === undefined) throw new Error(`volume fuori scala «${volume}»`);
  const M = sc.modello;
  const email = M.email_base * f;
  const opportunita = Math.round(M.opportunita_base * (1 + M.guadagno * (1 - 1 / f)) - M.calo_per_livello * Math.max(0, f - M.soglia_fastidio));
  const v = {
    email, foglio: M.foglio_base * f, opportunita, pipeline: opportunita * M.valore_opportunita,
    disiscrizioni: Math.round(email * M.tasso_disiscrizione * f), reclami: Math.round(email * M.tasso_reclami * f),
  };
  for (const m of sc.metriche) if (m.valore !== undefined) v[m.id] = m.valore;
  return v;
}

/** Metriche collegate a quella scelta: chi spinge (sotto) e chi e' spinto (sopra), seguendo i collegamenti. */
export function catena(sc, id) {
  const su = new Set(), giu = new Set();
  const visita = (da, verso, insieme) => {
    for (const [a, b] of sc.collegamenti) {
      const [x, y] = verso === "su" ? [a, b] : [b, a];
      if (x === da && !insieme.has(y)) { insieme.add(y); visita(y, verso, insieme); }
    }
  };
  visita(id, "su", su);
  visita(id, "giu", giu);
  const archi = sc.collegamenti.filter(([a, b]) => (a === id || su.has(a)) && (su.has(b)) || (b === id || giu.has(b)) && giu.has(a));
  return { su: [...su], giu: [...giu], archi, isolata: su.size === 0 && giu.size === 0 };
}

/** Esperimento: effetto apparente (mese contro mese) e confronto con il gruppo di controllo dopo t settimane. */
export function esperimento(sc, s) {
  const X = sc.esperimento;
  const t = s.settimane;
  const agente = X.serie_agente[t - 1], controllo = X.serie_controllo[t - 1];
  const banda = X.banda_base / Math.sqrt(t);
  const diff = Math.round((agente - controllo) * 100) / 100;
  return {
    apparente: Math.round((X.dicembre_agente / X.novembre - 1) * 100),
    agente, controllo, diff, banda: Math.round(banda * 100) / 100,
    chiaro: diff > 2 * banda,
    effetto_finale: Math.round((X.dicembre_agente - X.dicembre_controllo) * 100) / 100,
  };
}

/** Lead divisi "a caso" (generatore deterministico con seme fisso) tra gruppo con agente e gruppo di controllo. */
export function gruppi(sc) {
  const X = sc.esperimento;
  let x = X.seme;
  return Array.from({ length: X.lead_puntini }, () => { x = (x * PARK.a) % PARK.m; return x / PARK.m < 0.5 ? "agente" : "controllo"; });
}

/** Stato del volano dopo n passi completati. */
export function volano(sc, n) {
  const V = sc.volano;
  const finito = n >= V.passi.length;
  return { fatti: n, tot: V.passi.length, casi: V.casi_set + (finito ? 1 : 0), corrette: finito ? V.corrette_dopo : V.corrette_prima, risposte: finito ? V.risposte_dopo : V.risposte_prima, finito };
}

/** Riscontro del gioco "quale numero dimostra il valore". */
export function verifica(sc, s) {
  const T = sc.testi;
  const nome = (id) => sc.numeri.find((x) => x.id === id).nome;
  const righe = sc.casi.map((c, i) => {
    const scelta = s.scelte[c.id] || "";
    const esito = !scelta ? "vuoto" : scelta === c.migliore ? "giusto" : c.quasi.includes(scelta) ? "quasi" : "sbagliato";
    return { id: c.id, esito, testo: riempi(T[`ver_${esito}`], { n: i + 1, migliore: nome(c.migliore), spiega: c.spiega }) };
  });
  const giuste = righe.filter((r) => r.esito === "giusto").length;
  return { righe, giuste, totali: righe.length, sintesi: giuste === righe.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righe.length }) };
}

/** Posizione di ogni metrica nella scena del cruscotto. */
export function posizioni(sc) {
  const pos = {};
  LIVELLI_PIRAMIDE.forEach((liv, i) => {
    const ms = sc.metriche.filter((m) => m.livello === liv);
    ms.forEach((m, k) => { pos[m.id] = { x: PIRAMIDE.cx + (k - (ms.length - 1) / 2) * PIRAMIDE.passo - PIRAMIDE.chipW / 2, y: PIRAMIDE.alti[i] + 20, w: PIRAMIDE.chipW, h: PIRAMIDE.chipH }; });
  });
  for (const [liv, ys] of [["attivita", LATO.attivita], ["rischio", LATO.rischio]]) {
    sc.metriche.filter((m) => m.livello === liv).forEach((m, k) => { pos[m.id] = { x: LATO.x, y: ys[k], w: LATO.w, h: LATO.h }; });
  }
  return pos;
}

/** Coordinate del grafico settimanale (curve e bande) fino alla settimana t. */
export function curve(sc, t) {
  const X = sc.esperimento;
  const px = (k) => GRAF.x0 + (k / (X.serie_agente.length - 1)) * (GRAF.x1 - GRAF.x0);
  const py = (v) => GRAF.y1 - ((Math.min(X.grafico_max, Math.max(X.grafico_min, v)) - X.grafico_min) / (X.grafico_max - X.grafico_min)) * (GRAF.y1 - GRAF.y0);
  const out = {};
  for (const g of ["agente", "controllo"]) {
    const serie = X[`serie_${g}`].slice(0, t);
    const sopra = serie.map((v, k) => [px(k), py(v + X.banda_base / Math.sqrt(k + 1))]);
    const sotto = serie.map((v, k) => [px(k), py(v - X.banda_base / Math.sqrt(k + 1))]);
    out[g] = { linea: serie.map((v, k) => [px(k), py(v)]), banda: [...sopra, ...sotto.reverse()] };
  }
  return out;
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
  const num = (x, cifre = 0) => x.toLocaleString(lingua, { minimumFractionDigits: cifre, maximumFractionDigits: cifre });
  const metrica = (id) => sc.metriche.find((m) => m.id === id);
  const formatta = (m, v) => {
    if (m.formato === "nessuno") return "";
    if (m.formato === "euro") return riempi(T.formato_euro, { n: num(v) });
    if (m.formato === "euro2") return riempi(T.formato_euro, { n: num(v, 2) });
    if (m.formato === "percento") return riempi(T.formato_percento, { n: num(v) });
    if (m.formato === "percento1") return riempi(T.formato_percento, { n: num(v, 1) });
    if (m.formato === "minuti") return riempi(T.formato_minuti, { n: num(v) });
    if (m.formato === "secondi") return riempi(T.formato_secondi, { n: num(v, 1) });
    if (m.formato === "intero") return riempi(T.formato_intero, { n: num(v) });
    throw new Error(`formato sconosciuto «${m.formato}»`);
  };
  const VISTE = ["cruscotto", "esperimento", "volano", "decidi"];

  const s = { vista: "cruscotto", evidenza: sc.metriche[0].id, volume: 0, rischio: false, confronto: "prima_dopo", settimane: sc.settimane.min, volano: 0, scelte: {}, verificato: false };

  // ------------------------------------------------ comandi (sinistra)
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...VISTE.map((v) => el("button", { "data-v": v, onclick: () => cambia({ vista: v }) }, E[`vista_${v}`])));
  const valVol = el("b", {});
  const inVol = el("input", { type: "range", min: 0, max: sc.volume.livelli.length - 1, step: 1, "aria-label": sc.volume.etichetta });
  inVol.addEventListener("input", () => cambia({ volume: Number(inVol.value) }));
  const inRischio = el("input", { type: "checkbox", onchange: (e) => cambia({ rischio: e.target.checked }) });
  const zonaCruscotto = el("div", {},
    el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, sc.volume.etichetta), valVol), inVol),
    el("label", { class: "interruttore" }, el("span", {}, E.rischio), inRischio),
    el("p", { class: "nota" }, E.nota_exp));
  const segConfronto = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.confronto },
    ...["prima_dopo", "controllo"].map((c) => el("button", { "data-v": c, onclick: () => cambia({ confronto: c }) }, E[c])));
  const valSett = el("b", {});
  const inSett = el("input", { type: "range", min: sc.settimane.min, max: sc.settimane.max, step: sc.settimane.passo, "aria-label": sc.settimane.etichetta });
  inSett.addEventListener("input", () => cambia({ settimane: Number(inSett.value) }));
  const zonaEsperimento = el("div", {}, el("h4", {}, E.confronto), segConfronto,
    el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, sc.settimane.etichetta), valSett), inSett));
  const btnGira = el("button", { class: "btn btn-primario", style: "width:100%;justify-content:center;margin-top:8px", onclick: () => cambia({ volano: Math.min(sc.volano.passi.length, s.volano + 1) }) }, E.gira);
  const zonaVolano = el("div", {}, btnGira,
    el("button", { class: "btn", style: "width:100%;justify-content:center;margin-top:6px", onclick: () => cambia({ volano: 0 }) }, E.ricomincia));
  const tendine = {};
  const zonaDecidi = el("div", {});
  sc.casi.forEach((c, i) => {
    const sel = el("select", { "aria-label": riempi(T.scegli_per, { n: i + 1 }), onchange: (e) => scegli(c.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.numeri.map((x) => el("option", { value: x.id }, x.nome)));
    tendine[c.id] = sel;
    zonaDecidi.append(el("label", { class: "scelta-gioco" }, el("span", {}, riempi(T.caso, { n: i + 1 })), sel));
  });
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => cambia({ verificato: true }) }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaCruscotto, zonaEsperimento, zonaVolano, zonaDecidi);

  // ------------------------------------------------ scena (centro)
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${VB.w} ${VB.h}`, role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs><filter id="mi-ombra" x="-10%" y="-10%" width="120%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#17203b" flood-opacity=".13"/></filter>
<marker id="mi-freccia" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#94a3b8"/></marker>
<marker id="mi-freccia-luce" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${COL.luce}"/></marker></defs>`;
  const G = Object.fromEntries(VISTE.map((v) => { const g = svgEl("g"); svg.append(g); return [v, g]; }));
  scena.append(svg);
  const titolo = (g, testo) => g.append(testoSvg({ x: 360, y: 22, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, testo));

  // cruscotto
  titolo(G.cruscotto, E.titolo_scena_cruscotto);
  LIVELLI_PIRAMIDE.forEach((id, i) => {
    const liv = sc.livelli.find((l) => l.id === id);
    const [a, b] = PIRAMIDE.semi[i], y0 = PIRAMIDE.alti[i], y1 = y0 + PIRAMIDE.altezza - 6, cx = PIRAMIDE.cx;
    G.cruscotto.append(svgEl("polygon", { points: `${cx - a},${y0} ${cx + a},${y0} ${cx + b},${y1} ${cx - b},${y1}`, fill: liv.colore, "fill-opacity": ".09", stroke: liv.colore, "stroke-opacity": ".35" }));
    G.cruscotto.append(testoSvg({ x: cx, y: y0 + 13, "text-anchor": "middle", "font-size": 8.5, "font-weight": 800, fill: liv.colore, "letter-spacing": ".06em" }, liv.nome));
  });
  G.cruscotto.append(testoSvg({ x: LATO.x + LATO.w / 2, y: LATO.testaAtt, "text-anchor": "middle", "font-size": 8.5, "font-weight": 800, fill: "#b45309", "letter-spacing": ".06em" }, E.attivita));
  const testaRischio = testoSvg({ x: LATO.x + LATO.w / 2, y: LATO.testaRis, "text-anchor": "middle", "font-size": 8.5, "font-weight": 800, fill: COL.rischio, "letter-spacing": ".06em" }, E.rischio_maiuscolo);
  G.cruscotto.append(testaRischio);
  const POS = posizioni(sc);
  const gArchi = svgEl("g");
  G.cruscotto.append(gArchi);
  const ARCHI = sc.collegamenti.map(([a, b]) => {
    const pa = POS[a], pb = POS[b];
    const l = svgEl("line", { x1: pa.x + pa.w / 2, y1: pa.y, x2: pb.x + pb.w / 2, y2: pb.y + pb.h, stroke: "#94a3b8", "stroke-width": 1.4, "marker-end": "url(#mi-freccia)", class: "anim" });
    gArchi.append(l);
    return { a, b, l };
  });
  const CHIP = {};
  for (const m of sc.metriche) {
    const p = POS[m.id];
    const colore = m.livello === "rischio" ? COL.rischio : m.livello === "attivita" ? COL.attivita : sc.livelli.find((l) => l.id === m.livello).colore;
    const g = svgEl("g", { class: "chip anim", tabindex: "0", role: "button", "aria-label": riempi(T.apri_metrica, { nome: m.nome }) });
    const fondo = svgEl("rect", { x: p.x, y: p.y, width: p.w, height: p.h, rx: 9, fill: "#fff", stroke: colore, "stroke-width": 1.5, filter: "url(#mi-ombra)" });
    const nome = testoACapo({ x: p.x + 8, y: p.y + 14, "font-size": 9.5, "font-weight": 800, fill: "#17203b" }, m.nome, m.livello === "attivita" || m.livello === "rischio" ? 28 : 20, 11);
    const val = testoSvg({ x: p.x + p.w - 8, y: p.y + p.h - 7, "text-anchor": "end", "font-size": 12, "font-weight": 800, fill: colore }, "");
    g.append(fondo, nome, val);
    const apri = () => cambia({ evidenza: m.id });
    g.addEventListener("click", apri);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(); } });
    G.cruscotto.append(g);
    CHIP[m.id] = { g, fondo, val, colore };
  }
  const IND = ["email", "opportunita", "disiscrizioni"].map((id, k) => {
    const y = INDICI.y[k];
    const lab = testoSvg({ x: INDICI.x - 8, y: y + 12, "text-anchor": "end", "font-size": 10, "font-weight": 700, fill: "#5b6684" }, "");
    const barra = svgEl("rect", { x: INDICI.x, y, height: INDICI.alt, rx: 5, class: "anim", fill: id === "email" ? COL.attivita : id === "opportunita" ? "#16a34a" : COL.rischio });
    const val = testoSvg({ y: y + 12, "font-size": 10, "font-weight": 800, fill: "#17203b" }, "");
    G.cruscotto.append(lab, barra, val);
    return { id, lab, barra, val };
  });

  // esperimento
  titolo(G.esperimento, E.titolo_scena_esperimento);
  G.esperimento.append(svgEl("line", { x1: 40, y1: BARRE.base, x2: 440, y2: BARRE.base, stroke: "#cbd2e3" }));
  const BAR = ["novembre", "dicembre", "controllo"].map((id, k) => {
    const x = BARRE.x[k];
    const r = svgEl("rect", { x, width: BARRE.w, rx: 6, class: "anim", fill: id === "dicembre" ? COL.agente : COL.controllo });
    const v = testoSvg({ x: x + BARRE.w / 2, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#17203b" }, "");
    const etichetta = testoACapo({ x: x + BARRE.w / 2, y: BARRE.base + 14, "text-anchor": "middle", "font-size": 9.5, fill: "#5b6684" }, T[`barra_${id}`], 18, 11);
    const g = svgEl("g", { class: "anim" });
    g.append(r, v, etichetta);
    G.esperimento.append(g);
    return { id, r, v, g };
  });
  const gPuntini = svgEl("g", { class: "anim" });
  G.esperimento.append(gPuntini);
  gPuntini.append(testoSvg({ x: PUNTINI.x0 + (PUNTINI.colonne - 1) * PUNTINI.passo / 2, y: 46, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: "#5b6684" }, E.divisi_a_caso));
  gruppi(sc).forEach((g, k) => gPuntini.append(svgEl("circle", { cx: PUNTINI.x0 + (k % PUNTINI.colonne) * PUNTINI.passo, cy: PUNTINI.y0 + Math.floor(k / PUNTINI.colonne) * PUNTINI.passo, r: 8, fill: COL[g] })));
  const gGraf = svgEl("g");
  G.esperimento.append(gGraf);
  gGraf.append(svgEl("rect", { x: GRAF.x0, y: GRAF.y0, width: GRAF.x1 - GRAF.x0, height: GRAF.y1 - GRAF.y0, fill: "#fff", stroke: "#e3e7f1" }));
  const bande = { agente: svgEl("polygon", { fill: COL.agente, "fill-opacity": ".14" }), controllo: svgEl("polygon", { fill: COL.controllo, "fill-opacity": ".25" }) };
  const linee = { agente: svgEl("polyline", { fill: "none", stroke: COL.agente, "stroke-width": 2.5 }), controllo: svgEl("polyline", { fill: "none", stroke: COL.controllo, "stroke-width": 2.5 }) };
  gGraf.append(bande.controllo, bande.agente, linee.controllo, linee.agente);
  sc.esperimento.serie_agente.forEach((_, k) => gGraf.append(testoSvg({ x: GRAF.x0 + (k / (sc.esperimento.serie_agente.length - 1)) * (GRAF.x1 - GRAF.x0), y: GRAF.y1 + 14, "text-anchor": "middle", "font-size": 9, fill: "#7a849e" }, String(k + 1))));
  gGraf.append(testoSvg({ x: GRAF.x1, y: GRAF.y1 + 30, "text-anchor": "end", "font-size": 10, fill: "#5b6684" }, E.asse_settimane));
  const legAg = testoSvg({ x: GRAF.x0 + 8, y: GRAF.y0 + 16, "font-size": 10.5, "font-weight": 800, fill: COL.agente }, E.con_agente);
  const legCt = testoSvg({ x: GRAF.x0 + 8, y: GRAF.y0 + 30, "font-size": 10.5, "font-weight": 800, fill: "#64748b" }, E.senza_agente);
  gGraf.append(legAg, legCt);
  const notaPD = testoACapo({ x: (GRAF.x0 + GRAF.x1) / 2, y: GRAF.y0 + 55, "text-anchor": "middle", "font-size": 12, "font-weight": 700, fill: "#92400e" }, T.nota_prima_dopo, 70, 17);
  G.esperimento.append(notaPD);

  // volano
  titolo(G.volano, E.titolo_scena_volano);
  G.volano.append(svgEl("circle", { cx: VOLANO.cx, cy: VOLANO.cy, r: VOLANO.r, fill: "none", stroke: "#cbd2e3", "stroke-width": 6, "stroke-dasharray": "2 10", "stroke-linecap": "round" }));
  const angolo = (i) => (-90 + i * 360 / sc.volano.passi.length) * Math.PI / 180;
  const NODI = sc.volano.passi.map((p, i) => {
    const x = VOLANO.cx + VOLANO.r * Math.cos(angolo(i)), y = VOLANO.cy + VOLANO.r * Math.sin(angolo(i));
    const g = svgEl("g", { class: "chip", tabindex: "0", role: "button", "aria-label": p.nome });
    const c = svgEl("circle", { cx: x, cy: y, r: VOLANO.nodo, fill: "#fff", stroke: COL.spento, "stroke-width": 3, class: "anim" });
    const n = testoSvg({ x, y: y - 14, "text-anchor": "middle", "font-size": 13, "font-weight": 900, fill: "#4f46e5" }, String(i + 1));
    const t = testoACapo({ x, y: y + 2, "text-anchor": "middle", "font-size": 9.5, "font-weight": 700, fill: "#17203b" }, p.nome, VOLANO.caratteri, 11);
    g.append(c, n, t);
    g.addEventListener("click", () => cambia({ volano: i + 1 }));
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cambia({ volano: i + 1 }); } });
    G.volano.append(g);
    return { c };
  });
  G.volano.append(testoACapo({ x: VOLANO.cx, y: VOLANO.cy - 18, "text-anchor": "middle", "font-size": 10.5, "font-style": "italic", fill: "#5b6684" }, sc.volano.osservazione, VOLANO.centro, 13));
  const ESI = sc.volano.passi.map((p, i) => {
    const y = ESITI.y0 + i * ESITI.passo;
    const g = svgEl("g", { class: "anim" });
    g.append(svgEl("rect", { x: ESITI.x, y, width: ESITI.w, height: ESITI.h, rx: 10, fill: "#f0fdf4", stroke: "#86efac" }));
    g.append(testoSvg({ x: ESITI.x + 10, y: y + 16, "font-size": 10, "font-weight": 800, fill: "#166534" }, `${i + 1}. ${p.nome}`));
    g.append(testoACapo({ x: ESITI.x + 10, y: y + 32, "font-size": 10, fill: "#17203b" }, p.esito, ESITI.caratteri, 12));
    G.volano.append(g);
    return g;
  });
  const barraCorrette = svgEl("rect", { x: ESITI.x, y: 352, height: 16, rx: 6, fill: "#16a34a", class: "anim" });
  const testoCorrette = testoSvg({ x: ESITI.x, y: 344, "font-size": 11, "font-weight": 800, fill: "#17203b" }, "");
  const testoSet = testoSvg({ x: ESITI.x, y: 392, "font-size": 11, "font-weight": 700, fill: "#5b6684" }, "");
  G.volano.append(svgEl("rect", { x: ESITI.x, y: 352, width: ESITI.w, height: 16, rx: 6, fill: "#eef1f8" }), barraCorrette, testoCorrette, testoSet);

  // decidi
  titolo(G.decidi, E.titolo_scena_decidi);
  const SIT = sc.casi.map((c, i) => {
    const y = SITUAZIONE.y0 + i * SITUAZIONE.passo;
    const fondo = svgEl("rect", { x: SITUAZIONE.x, y, width: SITUAZIONE.w, height: SITUAZIONE.h, rx: 12, fill: "#fff", stroke: "#cbd2e3", "stroke-width": 1.5, filter: "url(#mi-ombra)" });
    G.decidi.append(fondo, svgEl("circle", { cx: SITUAZIONE.x + 24, cy: y + 24, r: 13, fill: "#4f46e5" }));
    G.decidi.append(testoSvg({ x: SITUAZIONE.x + 24, y: y + 28.5, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#fff" }, String(i + 1)));
    G.decidi.append(testoACapo({ x: SITUAZIONE.x + 48, y: y + 22, "font-size": 11.5, fill: "#17203b" }, c.testo, SITUAZIONE.caratteri, 15));
    const scelta = testoSvg({ x: SITUAZIONE.x + 48, y: y + SITUAZIONE.h - 12, "font-size": 11, "font-weight": 800, fill: "#4f46e5" }, "");
    G.decidi.append(scelta);
    return { fondo, scelta };
  });

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}${ridotto ? " senza-moto" : ""}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno
  function disegnaCruscotto() {
    const v = valori(sc, s.volume), v0 = valori(sc, 0);
    const ct = catena(sc, s.evidenza);
    const acceso = new Set([s.evidenza, ...ct.su, ...ct.giu]);
    for (const m of sc.metriche) {
      const C = CHIP[m.id];
      C.val.textContent = m.id in v ? formatta(m, v[m.id]) : "";
      const nascosta = m.livello === "rischio" && !s.rischio;
      C.g.setAttribute("opacity", nascosta ? "0.15" : acceso.has(m.id) || s.evidenza === "" ? "1" : "0.55");
      C.fondo.setAttribute("stroke-width", m.id === s.evidenza ? "3.5" : acceso.has(m.id) ? "2.5" : "1.5");
      C.fondo.setAttribute("fill", m.id === s.evidenza ? "#fffbeb" : "#fff");
    }
    testaRischio.setAttribute("opacity", s.rischio ? "1" : "0.25");
    const archiAccesi = new Set(ct.archi.map(([a, b]) => `${a}>${b}`));
    for (const A of ARCHI) {
      const on = archiAccesi.has(`${A.a}>${A.b}`);
      A.l.setAttribute("stroke", on ? COL.luce : "#cbd2e3");
      A.l.setAttribute("stroke-width", on ? "3" : "1.4");
      A.l.setAttribute("marker-end", on ? "url(#mi-freccia-luce)" : "url(#mi-freccia)");
    }
    for (const I of IND) {
      const indice = v[I.id] / v0[I.id];
      const w = Math.min(INDICI.max - INDICI.x, indice * INDICI.perUnita);
      I.barra.setAttribute("width", w);
      I.lab.textContent = metrica(I.id).nome;
      I.val.setAttribute("x", INDICI.x + w + 6);
      I.val.textContent = riempi(T.formato_indice, { n: num(indice, 1) });
      const vis = I.id !== "disiscrizioni" || s.rischio;
      for (const n of [I.barra, I.lab, I.val]) n.setAttribute("opacity", vis ? "1" : "0");
    }
  }

  function disegnaEsperimento() {
    const X = sc.esperimento;
    const ctl = s.confronto === "controllo";
    const vals = { novembre: X.novembre, dicembre: X.dicembre_agente, controllo: X.dicembre_controllo };
    for (const B of BAR) {
      const h = (vals[B.id] / X.scala_max) * BARRE.alt;
      B.r.setAttribute("y", BARRE.base - h); B.r.setAttribute("height", h);
      B.v.setAttribute("y", BARRE.base - h - 6);
      B.v.textContent = riempi(T.formato_percento, { n: num(vals[B.id], 1) });
      B.g.setAttribute("opacity", B.id === "controllo" && !ctl ? "0" : "1");
    }
    gPuntini.setAttribute("opacity", ctl ? "1" : "0");
    gGraf.setAttribute("opacity", ctl ? "1" : "0.12");
    notaPD.setAttribute("opacity", ctl ? "0" : "1");
    const cv = curve(sc, s.settimane);
    for (const g of ["agente", "controllo"]) {
      linee[g].setAttribute("points", cv[g].linea.map((p) => p.join(",")).join(" "));
      bande[g].setAttribute("points", cv[g].banda.map((p) => p.join(",")).join(" "));
    }
  }

  function disegnaVolano() {
    const st = volano(sc, s.volano);
    NODI.forEach((N, i) => {
      N.c.setAttribute("stroke", i < st.fatti ? "#16a34a" : i === st.fatti ? COL.luce : COL.spento);
      N.c.setAttribute("fill", i < st.fatti ? "#f0fdf4" : "#fff");
    });
    ESI.forEach((g, i) => g.setAttribute("opacity", i < st.fatti ? "1" : "0"));
    barraCorrette.setAttribute("width", (st.corrette / 100) * ESITI.w);
    testoCorrette.textContent = riempi(T.volano_corrette, { n: num(st.corrette, st.corrette % 1 ? 1 : 0) });
    testoSet.textContent = riempi(T.volano_set, { n: st.casi });
  }

  function disegnaDecidi() {
    const v = s.verificato ? verifica(sc, s) : null;
    sc.casi.forEach((c, i) => {
      const scelta = s.scelte[c.id];
      SIT[i].scelta.textContent = scelta ? `→ ${sc.numeri.find((x) => x.id === scelta).nome}` : E.scegli;
      const esito = v ? v.righe[i].esito : null;
      SIT[i].fondo.setAttribute("stroke", esito === "giusto" ? "#16a34a" : esito === "quasi" ? "#d97706" : esito ? "#e11d48" : "#cbd2e3");
    });
  }

  function disegnaDestra() {
    if (s.vista === "cruscotto") {
      const m = metrica(s.evidenza);
      const v = valori(sc, s.volume), v0 = valori(sc, 0);
      const ct = catena(sc, s.evidenza);
      const nomi = (ids) => ids.map((id) => metrica(id).nome).join(", ");
      const delta = (id) => { const d = Math.round((v[id] / v0[id] - 1) * 100); return `${d >= 0 ? "+" : ""}${num(d)}%`; };
      const righe = ["email", "foglio", "opportunita", "pipeline"].map((id) => el("p", { class: "riga-val" }, riempi(T.variazione, { nome: metrica(id).nome, valore: formatta(metrica(id), v[id]), delta: delta(id) })));
      if (s.rischio) for (const id of ["disiscrizioni", "reclami"]) righe.push(el("p", { class: "riga-val rischio" }, riempi(T.variazione, { nome: metrica(id).nome, valore: formatta(metrica(id), v[id]), delta: delta(id) })));
      destra.replaceChildren(...[
        el("h3", {}, E.titolo_metrica),
        el("div", { class: "grande", "aria-live": "polite" }, m.nome),
        el("p", { class: "riga-val" }, m.spiega),
        ct.isolata ? el("div", { class: "segnale" }, T.nessun_collegamento) : null,
        ct.su.length ? el("p", { class: "riga-val" }, riempi(T.collegata_a, { nomi: nomi(ct.su) })) : null,
        ct.giu.length ? el("p", { class: "riga-val" }, riempi(T.spinta_da, { nomi: nomi(ct.giu) })) : null,
        el("h3", { style: "margin-top:14px" }, E.titolo_valori), ...righe,
        s.volume > 0 ? el("div", { class: "segnale" }, E.nota_attivita) : null].filter(Boolean));
    } else if (s.vista === "esperimento") {
      const x = esperimento(sc, s);
      const figli = [el("h3", {}, E.titolo_esperimento), el("div", { class: "grande" }, riempi(T.effetto_apparente, { delta: num(x.apparente) }))];
      if (s.confronto === "prima_dopo") figli.push(el("div", { class: "segnale" }, T.nota_prima_dopo));
      else {
        figli.push(el("p", { class: "riga-val", "aria-live": "polite" }, riempi(T.effetto_vero, { settimane: s.settimane, diff: num(x.diff, 2), banda: num(x.banda, 2) })));
        figli.push(el("div", { class: `segnale${x.chiaro ? " ok" : ""}` }, x.chiaro ? riempi(T.verdetto_chiaro, { diff: num(x.effetto_finale, 1) }) : T.verdetto_presto));
      }
      destra.replaceChildren(...figli);
    } else if (s.vista === "volano") {
      const st = volano(sc, s.volano);
      destra.replaceChildren(el("h3", {}, E.titolo_volano),
        el("p", { class: "riga-val" }, sc.volano.osservazione),
        el("div", { class: "grande", "aria-live": "polite" }, riempi(T.volano_passo, { n: st.fatti, tot: st.tot })),
        el("p", { class: "riga-val" }, riempi(T.volano_set, { n: st.casi })),
        el("p", { class: "riga-val" }, riempi(T.volano_corrette, { n: num(st.corrette, st.corrette % 1 ? 1 : 0) })),
        el("p", { class: "riga-val" }, riempi(T.volano_business, { n: num(st.risposte, 1) })));
    } else {
      const figli = [el("h3", {}, E.titolo_verifica)];
      if (s.verificato) {
        const v = verifica(sc, s);
        figli.push(el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
          el("div", { class: "verifica", "aria-live": "polite" }, ...v.righe.map((x) => el("div", { class: `riga ${x.esito}` }, x.testo))));
      }
      destra.replaceChildren(...figli);
    }
  }

  function aggiornaComandi() {
    segVista.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.vista)));
    segConfronto.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.confronto)));
    inVol.value = s.volume;
    valVol.textContent = riempi(T.formato_volume, { n: num(valori(sc, s.volume).email) });
    inRischio.checked = s.rischio;
    inSett.value = s.settimane;
    valSett.textContent = riempi(T.formato_settimane, { n: s.settimane });
    btnGira.disabled = s.volano >= sc.volano.passi.length;
    zonaCruscotto.classList.toggle("nascosto", s.vista !== "cruscotto");
    zonaEsperimento.classList.toggle("nascosto", s.vista !== "esperimento");
    zonaVolano.classList.toggle("nascosto", s.vista !== "volano");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
    for (const v of VISTE) G[v].setAttribute("display", v === s.vista ? "inline" : "none");
  }

  function ridisegna() {
    aggiornaComandi();
    if (s.vista === "cruscotto") disegnaCruscotto();
    if (s.vista === "esperimento") disegnaEsperimento();
    if (s.vista === "volano") disegnaVolano();
    if (s.vista === "decidi") disegnaDecidi();
    disegnaDestra();
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

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    nuovo.scelte = { ...(nuovo.scelte || {}) };
    if (!VISTE.includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!sc.metriche.some((m) => m.id === nuovo.evidenza)) throw new Error(`stato_animazione: metrica sconosciuta «${nuovo.evidenza}»`);
    if (!(Number.isInteger(nuovo.volume) && nuovo.volume >= 0 && nuovo.volume < sc.volume.livelli.length)) throw new Error(`stato_animazione: volume fuori scala «${nuovo.volume}»`);
    if (!["prima_dopo", "controllo"].includes(nuovo.confronto)) throw new Error(`stato_animazione: confronto sconosciuto «${nuovo.confronto}»`);
    if (!(nuovo.settimane >= sc.settimane.min && nuovo.settimane <= sc.settimane.max)) throw new Error(`stato_animazione: settimane fuori scala «${nuovo.settimane}»`);
    if (!(Number.isInteger(nuovo.volano) && nuovo.volano >= 0 && nuovo.volano <= sc.volano.passi.length)) throw new Error(`stato_animazione: volano fuori scala «${nuovo.volano}»`);
    for (const k of ["rischio", "verificato"]) if (typeof nuovo[k] !== "boolean") throw new Error(`stato_animazione: «${k}» deve essere vero o falso`);
    for (const [id, n] of Object.entries(nuovo.scelte)) {
      if (!sc.casi.some((c) => c.id === id)) throw new Error(`stato_animazione: «${id}» non e' un caso del gioco`);
      if (!sc.numeri.some((x) => x.id === n)) throw new Error(`stato_animazione: numero sconosciuto «${n}»`);
    }
    Object.assign(s, nuovo);
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo: le transizioni CSS si fermano da sole */ },
    _prova: { stato: s, valori: () => valori(sc, s.volume), esperimento: () => esperimento(sc, s) },
  };
}
