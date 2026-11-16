// Lezione interattiva "Il giudice e i suoi bias" (P7.4): un LLM giudice confronta a coppie due bozze di risposta a un
// cliente con una rubrica a 4 voci. Il giudice e' simulato in modo deterministico: punteggio = qualita' (media dei voti
// degli esperti) + spinte dei bias (posizione, lunghezza, stesso modello), con i pesi letti dallo scenario.
// Comandi: inverti l'ordine, frasi di cortesia vuote nella bozza B, tre contromisure (doppia valutazione, "la lunghezza
// non conta", giudice di un altro modello), rubrica vaga/scomposta con il grafico di calibrazione su 50 casi, campione
// per la revisione umana, gioco "Decidi tu" sulle contromisure. Tutti i testi arrivano dallo scenario della lezione.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "giudice_bias";
const VB = { w: 720, h: 430 };
const CARTA = { y: 54, w: 334, h: 158, x: [16, 370], riga: 12.5, caratteri: 56 };
const BARRE = { y0: 226, passo: 17, centroSx: 292, centroDx: 428, scala: 40, alt: 11 };
const BILANCIA = { cx: 360, cy: 352, braccio: 150, maxGradi: 12, gradiPerPunto: 18 };
const GRAFICO = { x0: 96, x1: 640, y0: 52, y1: 390 };
const SITUAZIONE = { x: 20, y0: 48, h: 84, passo: 92, w: 680, caratteri: 100 };
const PARK = { m: 2147483647, a: 16807 };
const COLORE = { A: "#4f46e5", B: "#0891b2", bias: "#f59e0b", pari: "#64748b", incerto: "#7c3aed" };

const STILE = `
.lz-giudice_bias .carta { transition: transform .6s cubic-bezier(.2,.8,.2,1); }
.lz-giudice_bias .trave { transition: transform .6s cubic-bezier(.2,.8,.2,1); }
.lz-giudice_bias .punto { transition: transform .6s ease; }
.lz-giudice_bias.senza-moto .carta, .lz-giudice_bias.senza-moto .trave, .lz-giudice_bias.senza-moto .punto { transition: none; }
.lz-giudice_bias .uscita { font-family: ui-monospace, Consolas, monospace; font-size: .76rem; background: #0f172a; color: #e2e8f0; border-radius: 10px; padding: 10px 12px; white-space: pre-wrap; word-break: break-word; margin: 0; }
.lz-giudice_bias .riga-punti { font-size: .8rem; color: var(--tenue); margin: 4px 0 0; }
.lz-giudice_bias .segnale { font-size: .8rem; padding: 6px 9px; border-radius: 9px; background: var(--avviso-chiaro); color: #92400e; margin-top: 6px; }
.lz-giudice_bias .segnale.ok { background: var(--ok-chiaro); color: #166534; }
.lz-giudice_bias .segnale.male { background: var(--male-chiaro); color: #9f1239; }
.lz-giudice_bias .elenco-coppie { display: grid; gap: 4px; margin-top: 8px; }
.lz-giudice_bias .elenco-coppie button { display: flex; align-items: center; gap: 8px; text-align: left; border: 1px solid #dde3f0; background: #fff; border-radius: 9px; padding: 5px 8px; font-size: .8rem; cursor: pointer; }
.lz-giudice_bias .elenco-coppie button[aria-pressed="true"] { border-color: #4f46e5; box-shadow: 0 0 0 2px #c7d2fe; }
.lz-giudice_bias .pallino { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }
.lz-giudice_bias .barra-vittorie { display: flex; height: 12px; border-radius: 8px; overflow: hidden; margin: 6px 0 4px; background: #eef1f8; }
.lz-giudice_bias .barra-vittorie span { display: block; height: 100%; transition: width .5s ease; }
.lz-giudice_bias .nota { font-size: .76rem; color: var(--tenue); margin: 6px 0 0; }
.lz-giudice_bias .grande { font-size: 1.05rem; font-weight: 800; }
.lz-giudice_bias .scelta-gioco { display: grid; gap: 3px; margin: 8px 0; font-size: .8rem; }
.lz-giudice_bias .verifica { display: grid; gap: 6px; margin-top: 10px; }
.lz-giudice_bias .verifica .riga { font-size: .8rem; padding: 7px 10px; border-radius: 10px; }
.lz-giudice_bias .verifica .riga.giusto { background: var(--ok-chiaro); color: #166534; }
.lz-giudice_bias .verifica .riga.quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-giudice_bias .verifica .riga.sbagliato, .lz-giudice_bias .verifica .riga.vuoto { background: var(--male-chiaro); color: #9f1239; }
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

const ALTRA = { A: "B", B: "A" };
const tondo = (x) => Math.round(x * 100) / 100;

/** Qualita' di una risposta secondo gli esperti: media dei voti della rubrica. */
export function qualita(sc, risposta) {
  return sc.voci.reduce((t, v) => t + risposta.voti[v.id], 0) / sc.voci.length;
}

/** Spinte dei bias su una risposta (lettera A/B) letta per prima o per seconda. */
export function spinte(sc, s, coppia, lettera, primo) {
  const P = sc.parametri;
  const parole = coppia[lettera].parole + (lettera === "B" ? s.imbottitura * P.parole_frase_riempimento : 0);
  const posizione = primo ? P.bias_posizione : 0;
  const lunghezza = s.regola_lunghezza ? 0 : P.bias_lunghezza_parola * parole;
  const auto = !s.giudice_diverso && lettera === sc.stesso_modello ? P.bias_auto : 0;
  return { posizione, lunghezza, auto, totale: posizione + lunghezza + auto, parole };
}

/** Un solo giudizio del giudice simulato, con un ordine di lettura dato ("AB" o "BA"). */
export function giudizio(sc, s, coppia, ordine) {
  const primo = ordine[0];
  const out = { punti: {}, spinte: {}, qualita: {} };
  for (const l of ["A", "B"]) {
    out.qualita[l] = qualita(sc, coppia[l]);
    out.spinte[l] = spinte(sc, s, coppia, l, l === primo);
    out.punti[l] = out.qualita[l] + out.spinte[l].totale;
  }
  out.diff = out.punti.A - out.punti.B;
  out.vincitore = Math.abs(out.diff) < sc.parametri.pari ? "pari" : out.diff > 0 ? "A" : "B";
  return out;
}

/** Verdetto finale: un giudizio, oppure (doppia valutazione) due giudizi in ordini opposti; se discordano e' "incerto". */
export function verdetto(sc, s, coppia) {
  if (!s.doppia) return giudizio(sc, s, coppia, s.ordine).vincitore;
  const v1 = giudizio(sc, s, coppia, "AB").vincitore;
  const v2 = giudizio(sc, s, coppia, "BA").vincitore;
  return v1 === v2 ? v1 : "incerto";
}

/** Verdetto dei commerciali esperti: la qualita' piu' alta vince, sotto la soglia "pari" e' pari. */
export function esperti(sc, coppia) {
  const d = qualita(sc, coppia.A) - qualita(sc, coppia.B);
  return Math.abs(d) < sc.parametri.pari ? "pari" : d > 0 ? "A" : "B";
}

/** Quali bias decidono il verdetto corrente (confronto con il verdetto senza quel bias). */
export function segnali(sc, s, coppia) {
  const v = verdetto(sc, s, coppia);
  const inv = { ...s, ordine: ALTRA[s.ordine[0]] + s.ordine[0] };
  return {
    posizione: !s.doppia && giudizio(sc, s, coppia, s.ordine).vincitore !== giudizio(sc, inv, coppia, inv.ordine).vincitore,
    lunghezza: !s.regola_lunghezza && v !== verdetto(sc, { ...s, regola_lunghezza: true }, coppia),
    auto: !s.giudice_diverso && v !== verdetto(sc, { ...s, giudice_diverso: true }, coppia),
    esperti: v !== "incerto" && v !== esperti(sc, coppia),
  };
}

/** Motivo scritto dal giudice: la voce della rubrica con il vantaggio piu' grande del vincitore. */
export function motivo(sc, s, coppia, v) {
  const T = sc.testi;
  if (v === "pari") return T.rationale_pari;
  if (v === "incerto") return T.rationale_incerto;
  let migliore = null, scarto = 0;
  for (const voce of sc.voci) {
    const d = coppia[v].voti[voce.id] - coppia[ALTRA[v]].voti[voce.id];
    if (d > scarto) { scarto = d; migliore = voce; }
  }
  return migliore ? riempi(T.rationale, { vincente: v, voce: migliore.nome }) : riempi(T.rationale_vuoto, { vincente: v });
}

/** Confronto a coppie su tutte le coppie: la nuova versione (A) contro quella in uso (B). */
export function vittorie(sc, s) {
  const c = { nuova: 0, vecchia: 0, pari: 0, incerte: 0 };
  const per = {};
  for (const cp of sc.coppie) {
    const v = verdetto(sc, s, cp);
    per[cp.id] = v;
    if (v === "A") c.nuova += 1; else if (v === "B") c.vecchia += 1; else if (v === "pari") c.pari += 1; else c.incerte += 1;
  }
  const tot = sc.coppie.length;
  return { ...c, tot, per, tasso: Math.round((c.nuova / tot) * 100) };
}

/** 50 casi illustrativi deterministici (generatore di Park-Miller con seme fisso): voto esperti e voto del giudice. */
export function calibrazione(sc, rubrica) {
  const C = sc.calibrazione;
  const R = C[rubrica];
  if (!R) throw new Error(`rubrica sconosciuta «${rubrica}»`);
  const max = sc.parametri.voto_max;
  let x = C.seme;
  const u = () => { x = (x * PARK.a) % PARK.m; return x / PARK.m; };
  const punti = [];
  for (let i = 0; i < C.casi; i++) {
    const esp = 1 + (max - 1) * u();
    const rum = (u() * 2 - 1) * R.rumore;
    const giu = Math.min(max, Math.max(1, esp + R.ottimismo + rum));
    punti.push({ esperti: tondo(esp), giudice: tondo(giu) });
  }
  const accordo = Math.round((punti.filter((p) => Math.abs(p.giudice - p.esperti) <= C.tolleranza).length / punti.length) * 100);
  const media = (k) => tondo(punti.reduce((t, p) => t + p[k], 0) / punti.length);
  return { punti, accordo, media_giudice: media("giudice"), media_esperti: media("esperti") };
}

/** Lavoro della revisione umana: campione (percentuale delle risposte del giorno) + casi segnalati. */
export function revisione(sc, s) {
  const P = sc.parametri;
  const campione = Math.round((P.risposte_giorno * s.campione) / 100);
  const totale = campione + P.segnalati_giorno;
  return { campione, segnalati: P.segnalati_giorno, totale, ore: Math.round(((totale * P.minuti_revisione) / 60) * 10) / 10 };
}

/** Riscontro del gioco "Decidi tu" sulle contromisure. */
export function verifica(sc, s) {
  const T = sc.testi;
  const nome = (id) => sc.contromisure.find((c) => c.id === id).nome;
  const righe = sc.situazioni.map((sit, i) => {
    const scelta = s.scelte[sit.id] || "";
    const esito = !scelta ? "vuoto" : scelta === sit.migliore ? "giusto" : sit.quasi.includes(scelta) ? "quasi" : "sbagliato";
    return { id: sit.id, esito, testo: riempi(T[`ver_${esito}`], { n: i + 1, migliore: nome(sit.migliore), spiega: sit.spiega }) };
  });
  const giuste = righe.filter((r) => r.esito === "giusto").length;
  return { righe, giuste, totali: righe.length, sintesi: giuste === righe.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righe.length }) };
}

/** Geometria della scena (pura): posizione delle due carte, inclinazione della bilancia, punti del grafico. */
export function geometria(sc, s) {
  const cp = sc.coppie.find((c) => c.id === s.coppia);
  const primo = s.ordine[0];
  const carte = { [primo]: { x: CARTA.x[0], y: CARTA.y }, [ALTRA[primo]]: { x: CARTA.x[1], y: CARTA.y } };
  const g = giudizio(sc, s, cp, s.ordine);
  const v = verdetto(sc, s, cp);
  const pesoSx = g.punti[primo] - g.punti[ALTRA[primo]];
  const gradi = v === "incerto" || v === "pari" ? 0 : -Math.max(-BILANCIA.maxGradi, Math.min(BILANCIA.maxGradi, pesoSx * BILANCIA.gradiPerPunto));
  const max = sc.parametri.voto_max;
  const px = (val) => GRAFICO.x0 + ((val - 1) / (max - 1)) * (GRAFICO.x1 - GRAFICO.x0);
  const py = (val) => GRAFICO.y1 - ((val - 1) / (max - 1)) * (GRAFICO.y1 - GRAFICO.y0);
  const punti = calibrazione(sc, s.rubrica).punti.map((p) => ({ x: px(p.esperti), y: py(p.giudice) }));
  return { carte, gradi, punti, px, py };
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
  const num = (x, cifre) => x.toLocaleString(lingua, { minimumFractionDigits: cifre, maximumFractionDigits: cifre });
  const coppia = () => sc.coppie.find((c) => c.id === s.coppia);
  const nomeVerdetto = (v) => (v === "pari" ? T.verdetto_pari : v === "incerto" ? T.verdetto_incerto : riempi(T.verdetto_vince, { lettera: v, versione: sc.versioni[v] }));
  const coloreVerdetto = (v) => COLORE[v];

  const s = {
    vista: "coppia", coppia: sc.coppie[0].id, ordine: "AB", imbottitura: sc.imbottitura.min,
    doppia: false, regola_lunghezza: false, giudice_diverso: false, rubrica: "vaga", campione: sc.campione.min, scelte: {}, verificato: false,
  };

  // ------------------------------------------------ comandi (sinistra)
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...["coppia", "calibra", "decidi"].map((v) => el("button", { "data-v": v, onclick: () => cambia({ vista: v }) }, E[`vista_${v}`])));
  const btnInverti = el("button", { class: "btn btn-primario", style: "width:100%;justify-content:center;margin-top:8px", onclick: () => cambia({ ordine: ALTRA[s.ordine[0]] + s.ordine[0] }) }, E.inverti);
  const notaOrdine = el("p", { class: "nota" });
  const valImb = el("b", {});
  const inImb = el("input", { type: "range", min: sc.imbottitura.min, max: sc.imbottitura.max, step: sc.imbottitura.passo, "aria-label": sc.imbottitura.etichetta });
  inImb.addEventListener("input", () => cambia({ imbottitura: Number(inImb.value) }));
  const interr = {};
  const nodoInterr = (k) => {
    const i = el("input", { type: "checkbox", onchange: (e) => cambia({ [k]: e.target.checked }) });
    interr[k] = i;
    return el("label", { class: "interruttore" }, el("span", {}, E[k]), i);
  };
  const elencoCoppie = el("div", { class: "elenco-coppie" });
  const bottoniCoppie = {};
  for (const cp of sc.coppie) {
    const pall = el("span", { class: "pallino" });
    const b = el("button", { "aria-label": riempi(T.apri_coppia, { nome: cp.nome }), onclick: () => cambia({ coppia: cp.id }) }, pall, cp.nome);
    bottoniCoppie[cp.id] = { b, pall };
    elencoCoppie.append(b);
  }
  const zonaCoppia = el("div", {}, btnInverti, notaOrdine,
    el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, sc.imbottitura.etichetta), valImb), inImb),
    el("h4", {}, E.contromisure), nodoInterr("doppia"), nodoInterr("regola_lunghezza"), nodoInterr("giudice_diverso"),
    el("p", { class: "nota" }, E.nota_exp), elencoCoppie);
  const segRubrica = el("div", { class: "segmentato", role: "group", "aria-label": E.rubrica },
    ...["vaga", "scomposta"].map((r) => el("button", { "data-v": r, onclick: () => cambia({ rubrica: r }) }, E[r])));
  const valCamp = el("b", {});
  const inCamp = el("input", { type: "range", min: sc.campione.min, max: sc.campione.max, step: sc.campione.passo, "aria-label": sc.campione.etichetta });
  inCamp.addEventListener("input", () => cambia({ campione: Number(inCamp.value) }));
  const zonaCalibra = el("div", {}, el("h4", {}, E.rubrica), segRubrica,
    el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, sc.campione.etichetta), valCamp), inCamp));
  const tendine = {};
  const zonaDecidi = el("div", {});
  sc.situazioni.forEach((sit, i) => {
    const sel = el("select", { "aria-label": riempi(T.scegli_per, { n: i + 1 }), onchange: (e) => scegli(sit.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.contromisure.map((c) => el("option", { value: c.id }, c.nome)));
    tendine[sit.id] = sel;
    zonaDecidi.append(el("label", { class: "scelta-gioco" }, el("span", {}, riempi(T.caso, { n: i + 1 })), sel));
  });
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => controlla() }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaCoppia, zonaCalibra, zonaDecidi);

  // ------------------------------------------------ scena (centro)
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${VB.w} ${VB.h}`, role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs><filter id="gb-ombra" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#17203b" flood-opacity=".13"/></filter></defs>`;
  const gCoppia = svgEl("g");
  const gCalibra = svgEl("g");
  const gDecidi = svgEl("g");
  svg.append(gCoppia, gCalibra, gDecidi);
  scena.append(svg);

  // vista coppia: richiesta, etichette delle posizioni, due carte, barre della rubrica, bilancia
  gCoppia.append(svgEl("rect", { x: 16, y: 6, width: 688, height: 34, rx: 10, fill: "#eef2ff" }));
  gCoppia.append(testoSvg({ x: 28, y: 20, "font-size": 9, "font-weight": 800, fill: "#4338ca", "letter-spacing": ".06em" }, E.richiesta));
  const tRichiesta = testoSvg({ x: 28, y: 34, "font-size": 11.5, "font-weight": 600, fill: "#17203b" }, "");
  gCoppia.append(tRichiesta);
  CARTA.x.forEach((x, i) => gCoppia.append(testoSvg({ x: x + CARTA.w / 2, y: 50, "text-anchor": "middle", "font-size": 9, "font-weight": 800, fill: "#7a849e", "letter-spacing": ".06em" }, i === 0 ? E.prima : E.seconda)));
  const CA = {};
  for (const l of ["A", "B"]) {
    const g = svgEl("g", { class: "carta" });
    g.append(svgEl("rect", { x: 0, y: 0, width: CARTA.w, height: CARTA.h, rx: 12, fill: "#fff", stroke: COLORE[l], "stroke-width": 1.6, filter: "url(#gb-ombra)" }));
    g.append(svgEl("rect", { x: 0, y: 0, width: CARTA.w, height: 6, rx: 3, fill: COLORE[l] }));
    g.append(testoSvg({ x: 14, y: 24, "font-size": 12, "font-weight": 800, fill: COLORE[l] }, `${l} · ${sc.versioni[l]}`));
    const corpo = svgEl("text", { x: 14, y: 42, "font-size": 10.5, fill: "#17203b" });
    g.append(corpo);
    gCoppia.append(g);
    CA[l] = { g, corpo };
  }
  const gBarre = svgEl("g");
  gCoppia.append(gBarre);
  const righeBarre = [...sc.voci.map((v) => ({ id: v.id, nome: v.nome })), { id: "_spinta", nome: E.spinta }];
  const BR = righeBarre.map((r, i) => {
    const y = BARRE.y0 + i * BARRE.passo;
    gBarre.append(testoSvg({ x: 360, y: y + 9, "text-anchor": "middle", "font-size": 9.5, "font-weight": 700, fill: r.id === "_spinta" ? "#b45309" : "#5b6684" }, r.nome));
    const sx = svgEl("rect", { y, height: BARRE.alt, rx: 4 });
    const dx = svgEl("rect", { y, height: BARRE.alt, rx: 4, x: BARRE.centroDx });
    const vsx = testoSvg({ y: y + 9, "font-size": 9, "text-anchor": "end", fill: "#5b6684" }, "");
    const vdx = testoSvg({ y: y + 9, "font-size": 9, fill: "#5b6684" }, "");
    gBarre.append(sx, dx, vsx, vdx);
    return { id: r.id, sx, dx, vsx, vdx };
  });
  const gBil = svgEl("g");
  gCoppia.append(gBil);
  gBil.append(svgEl("polygon", { points: `${BILANCIA.cx},${BILANCIA.cy} ${BILANCIA.cx - 16},${BILANCIA.cy + 42} ${BILANCIA.cx + 16},${BILANCIA.cy + 42}`, fill: "#94a3b8" }));
  const trave = svgEl("g", { class: "trave" });
  trave.append(svgEl("rect", { x: BILANCIA.cx - BILANCIA.braccio, y: BILANCIA.cy - 3, width: BILANCIA.braccio * 2, height: 6, rx: 3, fill: "#475569" }));
  const piatti = [-1, 1].map((lato) => {
    const x = BILANCIA.cx + lato * BILANCIA.braccio;
    const gp = svgEl("g");
    gp.append(svgEl("line", { x1: x, y1: BILANCIA.cy, x2: x, y2: BILANCIA.cy + 22, stroke: "#475569", "stroke-width": 1.5 }));
    const disco = svgEl("rect", { x: x - 30, y: BILANCIA.cy + 22, width: 60, height: 20, rx: 8, fill: "#e2e8f0" });
    const lett = testoSvg({ x, y: BILANCIA.cy + 36, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#fff" }, "");
    gp.append(disco, lett);
    trave.append(gp);
    return { disco, lett };
  });
  gBil.append(trave);
  gBil.append(svgEl("circle", { cx: BILANCIA.cx, cy: BILANCIA.cy, r: 5, fill: "#1e293b" }));
  const tVerdetto = testoSvg({ x: BILANCIA.cx, y: VB.h - 12, "text-anchor": "middle", "font-size": 13, "font-weight": 800, fill: "#17203b" }, "");
  gBil.append(tVerdetto);

  // vista calibrazione: grafico a dispersione
  gCalibra.append(testoSvg({ x: 360, y: 24, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, E.titolo_calibra));
  const banda = svgEl("polygon", { fill: "#16a34a", "fill-opacity": ".09" });
  gCalibra.append(banda);
  gCalibra.append(svgEl("rect", { x: GRAFICO.x0, y: GRAFICO.y0, width: GRAFICO.x1 - GRAFICO.x0, height: GRAFICO.y1 - GRAFICO.y0, fill: "none", stroke: "#cbd2e3" }));
  const diagonale = svgEl("line", { stroke: "#16a34a", "stroke-dasharray": "5 4", "stroke-width": 1.5 });
  gCalibra.append(diagonale);
  const tacche = svgEl("g");
  gCalibra.append(tacche);
  gCalibra.append(testoSvg({ x: (GRAFICO.x0 + GRAFICO.x1) / 2, y: GRAFICO.y1 + 32, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "#5b6684" }, E.asse_esperti));
  gCalibra.append(testoSvg({ x: 24, y: (GRAFICO.y0 + GRAFICO.y1) / 2, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "#5b6684", transform: `rotate(-90 24 ${(GRAFICO.y0 + GRAFICO.y1) / 2})` }, E.asse_giudice));
  const gPunti = svgEl("g");
  gCalibra.append(gPunti);
  const PUNTI = Array.from({ length: sc.calibrazione.casi }, () => {
    const c = svgEl("circle", { class: "punto", cx: 0, cy: 0, r: 5, fill: "#4f46e5", "fill-opacity": ".7", stroke: "#fff" });
    gPunti.append(c);
    return c;
  });

  // vista decidi: le situazioni
  gDecidi.append(testoSvg({ x: 360, y: 26, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, E.titolo_decidi));
  const SIT = sc.situazioni.map((sit, i) => {
    const y = SITUAZIONE.y0 + i * SITUAZIONE.passo;
    const fondo = svgEl("rect", { x: SITUAZIONE.x, y, width: SITUAZIONE.w, height: SITUAZIONE.h, rx: 12, fill: "#fff", stroke: "#cbd2e3", "stroke-width": 1.5, filter: "url(#gb-ombra)" });
    gDecidi.append(fondo);
    gDecidi.append(svgEl("circle", { cx: SITUAZIONE.x + 24, cy: y + 24, r: 13, fill: "#4f46e5" }));
    gDecidi.append(testoSvg({ x: SITUAZIONE.x + 24, y: y + 28.5, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#fff" }, String(i + 1)));
    const t = svgEl("text", { x: SITUAZIONE.x + 48, y: y + 22, "font-size": 11.5, fill: "#17203b" });
    aCapo(sit.testo, SITUAZIONE.caratteri).forEach((r, k) => { const ts = svgEl("tspan", { x: SITUAZIONE.x + 48, dy: k ? 15 : 0 }); ts.textContent = r; t.append(ts); });
    gDecidi.append(t);
    const scelta = testoSvg({ x: SITUAZIONE.x + 48, y: y + SITUAZIONE.h - 12, "font-size": 11, "font-weight": 800, fill: "#4f46e5" }, "");
    gDecidi.append(scelta);
    return { fondo, scelta };
  });

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno
  function scriviCarta(l, cp) {
    const C = CA[l];
    C.corpo.replaceChildren();
    const righe = aCapo(cp[l].testo, CARTA.caratteri).map((r) => ({ r, vuota: false }));
    if (l === "B") for (const f of sc.riempimento.slice(0, s.imbottitura)) for (const r of aCapo(f, CARTA.caratteri)) righe.push({ r, vuota: true });
    righe.forEach((x, k) => {
      const ts = svgEl("tspan", { x: 14, dy: k ? CARTA.riga : 0, fill: x.vuota ? "#b45309" : "#17203b", "font-style": x.vuota ? "italic" : "normal" });
      ts.textContent = x.r;
      C.corpo.append(ts);
    });
  }

  function disegnaCoppia() {
    const cp = coppia();
    const geo = geometria(sc, s);
    tRichiesta.textContent = `«${cp.richiesta}»`;
    for (const l of ["A", "B"]) {
      scriviCarta(l, cp);
      const p = geo.carte[l];
      CA[l].g.style.transform = `translate(${p.x}px, ${p.y}px)`;
      CA[l].g.setAttribute("transform", `translate(${p.x},${p.y})`);
    }
    const primo = s.ordine[0], secondo = ALTRA[primo];
    const g = giudizio(sc, s, cp, s.ordine);
    for (const r of BR) {
      const val = (l) => (r.id === "_spinta" ? g.spinte[l].totale : cp[l].voti[r.id]);
      const col = (l) => (r.id === "_spinta" ? COLORE.bias : COLORE[l]);
      const wsx = val(primo) * BARRE.scala, wdx = val(secondo) * BARRE.scala;
      r.sx.setAttribute("x", BARRE.centroSx - wsx); r.sx.setAttribute("width", Math.max(0, wsx)); r.sx.setAttribute("fill", col(primo));
      r.dx.setAttribute("width", Math.max(0, wdx)); r.dx.setAttribute("fill", col(secondo));
      r.vsx.setAttribute("x", BARRE.centroSx - wsx - 4); r.vsx.textContent = num(val(primo), r.id === "_spinta" ? 2 : 0);
      r.vdx.setAttribute("x", BARRE.centroDx + wdx + 4); r.vdx.textContent = num(val(secondo), r.id === "_spinta" ? 2 : 0);
    }
    const v = verdetto(sc, s, cp);
    trave.style.transform = `rotate(${geo.gradi}deg)`;
    trave.style.transformOrigin = `${BILANCIA.cx}px ${BILANCIA.cy}px`;
    trave.setAttribute("transform", `rotate(${geo.gradi} ${BILANCIA.cx} ${BILANCIA.cy})`);
    [primo, secondo].forEach((l, i) => { piatti[i].disco.setAttribute("fill", COLORE[l]); piatti[i].lett.textContent = l; });
    tVerdetto.textContent = nomeVerdetto(v);
    tVerdetto.setAttribute("fill", coloreVerdetto(v));
  }

  function disegnaCalibra() {
    const geo = geometria(sc, s);
    const max = sc.parametri.voto_max, tol = sc.calibrazione.tolleranza;
    diagonale.setAttribute("x1", geo.px(1)); diagonale.setAttribute("y1", geo.py(1));
    diagonale.setAttribute("x2", geo.px(max)); diagonale.setAttribute("y2", geo.py(max));
    const pts = [[1, 1 + tol], [max - tol, max], [max, max], [max, max - tol], [1 + tol, 1], [1, 1]].map(([a, b]) => `${geo.px(a)},${geo.py(b)}`).join(" ");
    banda.setAttribute("points", pts);
    tacche.replaceChildren();
    for (let k = 1; k <= max; k++) {
      tacche.append(testoSvg({ x: geo.px(k), y: GRAFICO.y1 + 16, "text-anchor": "middle", "font-size": 10, fill: "#7a849e" }, num(k, 0)));
      tacche.append(testoSvg({ x: GRAFICO.x0 - 10, y: geo.py(k) + 4, "text-anchor": "end", "font-size": 10, fill: "#7a849e" }, num(k, 0)));
    }
    geo.punti.forEach((p, i) => {
      PUNTI[i].style.transform = `translate(${p.x}px, ${p.y}px)`;
      PUNTI[i].setAttribute("transform", `translate(${p.x},${p.y})`);
      PUNTI[i].setAttribute("fill", s.rubrica === "vaga" ? "#e11d48" : "#4f46e5");
    });
  }

  function disegnaDecidi() {
    const v = s.verificato ? verifica(sc, s) : null;
    sc.situazioni.forEach((sit, i) => {
      const scelta = s.scelte[sit.id];
      SIT[i].scelta.textContent = scelta ? `→ ${sc.contromisure.find((c) => c.id === scelta).nome}` : E.scegli;
      const esito = v ? v.righe[i].esito : null;
      SIT[i].fondo.setAttribute("stroke", esito === "giusto" ? "#16a34a" : esito === "quasi" ? "#d97706" : esito ? "#e11d48" : "#cbd2e3");
    });
  }

  function disegnaDestra() {
    if (s.vista === "coppia") {
      const cp = coppia();
      const v = verdetto(sc, s, cp);
      const g = giudizio(sc, s, cp, s.ordine);
      const sg = segnali(sc, s, cp);
      const uscita = JSON.stringify({ winner: v === "pari" ? "tie" : v === "incerto" ? "uncertain" : v, rationale: motivo(sc, s, cp, v) }, null, 1);
      const segn = [];
      if (sg.posizione) segn.push(el("div", { class: "segnale" }, E.seg_posizione));
      if (sg.lunghezza) segn.push(el("div", { class: "segnale" }, E.seg_lunghezza));
      if (sg.auto) segn.push(el("div", { class: "segnale" }, E.seg_auto));
      if (sg.esperti) segn.push(el("div", { class: "segnale male" }, E.seg_esperti));
      if (!segn.length) segn.push(el("div", { class: "segnale ok" }, E.seg_nessuno));
      const vt = vittorie(sc, s);
      const quota = (n) => `${(n / vt.tot) * 100}%`;
      destra.replaceChildren(
        el("h3", {}, E.titolo_uscita),
        el("pre", { class: "uscita", "aria-live": "polite" }, uscita),
        ...["A", "B"].map((l) => el("p", { class: "riga-punti" }, riempi(T.punteggio, { lettera: l, qualita: num(g.qualita[l], 2), spinta: num(g.spinte[l].totale, 2), totale: num(g.punti[l], 2) }))),
        el("p", { class: "riga-punti" }, riempi(T.esperti, { verdetto: nomeVerdetto(esperti(sc, cp)) })),
        el("h3", { style: "margin-top:14px" }, E.titolo_segnali), ...segn,
        el("h3", { style: "margin-top:14px" }, E.titolo_vittorie),
        el("div", { class: "grande" }, riempi(T.tasso, { tasso: vt.tasso })),
        el("div", { class: "barra-vittorie" },
          el("span", { style: `width:${quota(vt.nuova)};background:${COLORE.A}` }), el("span", { style: `width:${quota(vt.vecchia)};background:${COLORE.B}` }),
          el("span", { style: `width:${quota(vt.pari)};background:${COLORE.pari}` }), el("span", { style: `width:${quota(vt.incerte)};background:${COLORE.incerto}` })),
        el("p", { class: "nota" }, riempi(T.vittorie, vt)));
      for (const c of sc.coppie) {
        bottoniCoppie[c.id].pall.style.background = coloreVerdetto(vt.per[c.id]);
        bottoniCoppie[c.id].b.setAttribute("aria-pressed", String(c.id === s.coppia));
      }
    } else if (s.vista === "calibra") {
      const c = calibrazione(sc, s.rubrica);
      const r = revisione(sc, s);
      destra.replaceChildren(
        el("h3", {}, E.titolo_calibra_destra),
        el("div", { class: "grande", "aria-live": "polite" }, riempi(T.accordo, { tolleranza: num(sc.calibrazione.tolleranza, 1), accordo: c.accordo })),
        el("p", { class: "riga-punti" }, riempi(T.medie, { giudice: num(c.media_giudice, 1), esperti: num(c.media_esperti, 1) })),
        el("h3", { style: "margin-top:14px" }, E.titolo_revisione),
        el("p", { class: "riga-punti" }, riempi(T.revisioni, { campione: num(r.campione, 0), segnalati: num(r.segnalati, 0), ore: num(r.ore, 1) })),
        el("div", { class: "segnale ok" }, E.nota_riferimento));
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
    segRubrica.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.rubrica)));
    notaOrdine.textContent = E[`ordine_${s.ordine}`];
    inImb.value = s.imbottitura;
    valImb.textContent = riempi(T.formato_imbottitura, { n: s.imbottitura });
    inCamp.value = s.campione;
    valCamp.textContent = riempi(T.formato_campione, { n: s.campione });
    for (const k of Object.keys(interr)) interr[k].checked = s[k];
    zonaCoppia.classList.toggle("nascosto", s.vista !== "coppia");
    zonaCalibra.classList.toggle("nascosto", s.vista !== "calibra");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
    gCoppia.setAttribute("display", s.vista === "coppia" ? "inline" : "none");
    gCalibra.setAttribute("display", s.vista === "calibra" ? "inline" : "none");
    gDecidi.setAttribute("display", s.vista === "decidi" ? "inline" : "none");
  }

  function ridisegna() {
    aggiornaComandi();
    if (s.vista === "coppia") disegnaCoppia();
    if (s.vista === "calibra") disegnaCalibra();
    if (s.vista === "decidi") disegnaDecidi();
    disegnaDestra();
    radice.querySelector(".banco").classList.toggle("senza-moto", ridotto);
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
  function controlla() { cambia({ verificato: true }); }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    nuovo.scelte = { ...(nuovo.scelte || {}) };
    if (!["coppia", "calibra", "decidi"].includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!sc.coppie.some((c) => c.id === nuovo.coppia)) throw new Error(`stato_animazione: coppia sconosciuta «${nuovo.coppia}»`);
    if (!["AB", "BA"].includes(nuovo.ordine)) throw new Error(`stato_animazione: ordine sconosciuto «${nuovo.ordine}»`);
    if (!(nuovo.imbottitura >= sc.imbottitura.min && nuovo.imbottitura <= sc.imbottitura.max)) throw new Error(`stato_animazione: imbottitura fuori scala «${nuovo.imbottitura}»`);
    if (!(nuovo.campione >= sc.campione.min && nuovo.campione <= sc.campione.max)) throw new Error(`stato_animazione: campione fuori scala «${nuovo.campione}»`);
    if (!sc.calibrazione[nuovo.rubrica] || !["vaga", "scomposta"].includes(nuovo.rubrica)) throw new Error(`stato_animazione: rubrica sconosciuta «${nuovo.rubrica}»`);
    for (const k of ["doppia", "regola_lunghezza", "giudice_diverso", "verificato"]) if (typeof nuovo[k] !== "boolean") throw new Error(`stato_animazione: «${k}» deve essere vero o falso`);
    for (const [id, c] of Object.entries(nuovo.scelte)) {
      if (!sc.situazioni.some((x) => x.id === id)) throw new Error(`stato_animazione: «${id}» non e' una situazione del gioco`);
      if (!sc.contromisure.some((x) => x.id === c)) throw new Error(`stato_animazione: contromisura sconosciuta «${c}»`);
    }
    Object.assign(s, nuovo);
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo: le transizioni CSS si fermano da sole */ },
    _prova: { stato: s, vittorie: () => vittorie(sc, s), verdetto: () => verdetto(sc, s, coppia()) },
  };
}
