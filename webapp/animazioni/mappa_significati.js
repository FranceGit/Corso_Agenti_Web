// Lezione interattiva "La mappa dei significati" (P5.4): il RAG su documenti aziendali di marketing e vendita.
// Ogni porzione (chunk) di documento e' un puntino su una mappa 2D (gli embedding veri hanno centinaia di
// dimensioni): porzioni con significato vicino stanno vicine. Lo studente sceglie la domanda, le fonti da
// indicizzare, il numero k di porzioni da recuperare, il modo di ricerca (parole chiave / significato / ibrida),
// il "recupera e riordina" e l'istruzione "se non sai, di' non lo so". Vede le porzioni recuperate collegate alla
// domanda, precisione e richiamo calcolati dal vivo e la risposta con le citazioni [n] (giusta, sbagliata perche'
// presa da una porzione simile ma errata, "non lo so" o inventata). Tutti i testi arrivano dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "mappa_significati";
const W = 720, H = 412;
const MODI = ["parole", "significato", "ibrida"];
const QUANTI_RIORDINO = 20;
const TENUTI_RIORDINO = 3;

const STILE = `
.lz-mappa_significati .punto { transition: opacity .35s ease; cursor: default; }
.lz-mappa_significati .filo { transition: opacity .35s ease; }
.lz-mappa_significati .risposta { margin: 0; padding: 9px 11px; border-radius: 10px; font-size: .88rem; background: #f7f8fe; border-left: 4px solid #c7d2fe; }
.lz-mappa_significati .risposta.giusta { background: var(--ok-chiaro); border-left-color: #16a34a; }
.lz-mappa_significati .risposta.sbagliata, .lz-mappa_significati .risposta.inventata { background: var(--male-chiaro); border-left-color: #e11d48; }
.lz-mappa_significati .risposta.non_so { background: var(--primario-chiaro); border-left-color: #4f46e5; }
.lz-mappa_significati .esito { font-size: .78rem; font-weight: 700; margin-top: 4px; }
.lz-mappa_significati .elenco { display: grid; gap: 4px; margin-top: 6px; max-height: 190px; overflow-y: auto; }
.lz-mappa_significati .elenco div { font-size: .76rem; padding: 4px 7px; border-radius: 8px; background: #f3f5fb; }
.lz-mappa_significati .elenco div.citata { background: #eef0ff; font-weight: 700; }
.lz-mappa_significati .elenco div.utile { border-left: 3px solid #16a34a; }
.lz-mappa_significati .etichetta-piccola { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--tenue-2, #7a849e); margin-top: 10px; }
.lz-mappa_significati .misure { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px; font-size: .8rem; }
.lz-mappa_significati .misure b { font-variant-numeric: tabular-nums; font-size: 1rem; }
.lz-mappa_significati .barra { height: 8px; border-radius: 8px; background: #eef1f8; overflow: hidden; margin-top: 3px; }
.lz-mappa_significati .barra span { display: block; height: 100%; border-radius: 8px; transition: width .4s ease; }
.lz-mappa_significati .nota { font-size: .76rem; color: var(--tenue); margin: 4px 0 0; }
.lz-mappa_significati .confronto { margin-top: 10px; padding: 9px 11px; border-radius: 12px; background: linear-gradient(90deg, #eff6ff, #f5f3ff); font-size: .78rem; display: grid; gap: 3px; }
.lz-mappa_significati .btn.premuto { background: var(--primario); color: #fff; border-color: var(--primario); }
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

export function distanza(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function domandaDi(sc, id) {
  const q = sc.domande.find((d) => d.id === id);
  if (!q) throw new Error(`domanda sconosciuta «${id}»`);
  return q;
}

/** Ordina le porzioni indicizzate secondo il modo di ricerca, poi tiene le prime k (o 20 riordinate fino a 3). */
export function cerca(sc, s) {
  const q = domandaDi(sc, s.domanda);
  const pool = sc.porzioni.filter((p) => s.fonti.includes(p.fonte));
  const d = (p) => distanza(p, q);
  const comuni = (p) => p.parole.filter((w) => q.parole.includes(w)).length;
  let ordine;
  if (s.modo === "parole") {
    ordine = pool.filter((p) => comuni(p) > 0).sort((a, b) => comuni(b) - comuni(a) || d(a) - d(b));
  } else {
    ordine = [...pool].sort((a, b) => d(a) - d(b) || a.id.localeCompare(b.id));
    if (s.modo === "ibrida" && q.filtro_esatto) {
      // ricerca ibrida: la parola esatta (un codice) fa da filtro e passa davanti al significato
      const esatti = ordine.filter((p) => p.parole.includes(q.filtro_esatto));
      ordine = [...esatti, ...ordine.filter((p) => !esatti.includes(p))];
    }
  }
  let lista;
  if (s.riordino) {
    // recupera molti candidati (richiamo alto), poi il riordino tiene i migliori sul tema della domanda
    const candidati = ordine.slice(0, QUANTI_RIORDINO);
    lista = candidati.filter((p) => q.temi.includes(p.tema)).slice(0, TENUTI_RIORDINO);
  } else {
    lista = ordine.slice(0, s.k);
  }
  return lista.map((p) => p.id);
}

/** Precisione = porzioni utili tra le trovate; richiamo = porzioni utili trovate tra tutte quelle utili. */
export function misura(sc, s) {
  const q = domandaDi(sc, s.domanda);
  const lista = cerca(sc, s);
  const utili = lista.filter((id) => q.pertinenti.includes(id)).length;
  return {
    trovate: lista.length, utili,
    precisione: lista.length ? utili / lista.length : null,
    richiamo: q.pertinenti.length ? utili / q.pertinenti.length : null,
  };
}

/** La risposta del modello con le citazioni [n] delle porzioni usate (il numero e' la posizione nella lista). */
export function rispondi(sc, s) {
  const q = domandaDi(sc, s.domanda);
  const T = sc.testi;
  const lista = cerca(sc, s);
  const porz = lista.map((id) => sc.porzioni.find((p) => p.id === id));
  const k = porz.findIndex((p) => p.risponde && p.risponde[q.id]);
  if (k < 0) {
    if (s.non_so) return { esito: "non_so", testo: T.non_so, citazioni: [], nota: T.nota_non_so };
    return { esito: "inventata", testo: q.inventata, citazioni: [], nota: T.nota_inventata };
  }
  const r = porz[k].risponde[q.id];
  const supporto = porz.map((p, i) => (i !== k && q.pertinenti.includes(p.id) ? i + 1 : null)).filter((x) => x !== null);
  const citazioni = [k + 1, ...supporto];
  const testo = `${r.testo} ${citazioni.map((c) => `[${c}]`).join(" ")}`;
  return { esito: r.giusto ? "giusta" : "sbagliata", testo, citazioni, nota: r.giusto ? T.nota_giusta : riempi(T.nota_sbagliata, { perche: r.nota }) };
}

/** Coordinate dei puntini nella scena (gia' dentro il riquadro 720x412). */
export function posizioni(sc) {
  const pos = {};
  for (const p of sc.porzioni) pos[p.id] = { x: p.x, y: p.y };
  for (const q of sc.domande) pos[q.id] = { x: q.x, y: q.y };
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
  const temaDi = (id) => sc.temi.find((t) => t.id === id);
  const fonteDi = (id) => sc.fonti.find((f) => f.id === id);
  const num = (x) => (x === null ? "—" : x.toLocaleString(lingua, { maximumFractionDigits: 2 }));

  const s = { domanda: sc.domande[0].id, fonti: sc.fonti.map((f) => f.id), k: 3, modo: "significato", riordino: false, non_so: true };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segDomanda = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.domanda },
    ...sc.domande.map((q) => el("button", { "data-v": q.id, onclick: () => cambia({ domanda: q.id }) }, q.testo)));
  const segModo = el("div", { class: "segmentato", role: "group", "aria-label": E.modo },
    ...MODI.map((m) => el("button", { "data-v": m, onclick: () => cambia({ modo: m }) }, E[`modo_${m}`])));
  const valoreK = el("b", {});
  const inK = el("input", { type: "range", min: sc.k.min, max: sc.k.max, step: 1, "aria-label": E.k });
  inK.addEventListener("input", () => cambia({ k: Number(inK.value), riordino: false }));
  const btnRiordino = el("button", { class: "btn", style: "width:100%;justify-content:center;margin-top:4px", onclick: () => cambia({ riordino: !s.riordino }) }, E.riordino);
  const inFonti = {};
  const zonaFonti = el("div", {});
  for (const f of sc.fonti) {
    inFonti[f.id] = el("input", { type: "checkbox", "aria-label": f.nome, onchange: (e) => cambia({ fonti: e.target.checked ? [...s.fonti, f.id] : s.fonti.filter((x) => x !== f.id) }) });
    zonaFonti.append(el("label", { class: "interruttore" }, el("span", {}, f.nome), inFonti[f.id]));
  }
  const inNonSo = el("input", { type: "checkbox", "aria-label": E.non_so, onchange: (e) => cambia({ non_so: e.target.checked }) });
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.domanda), segDomanda, el("h4", {}, E.modo), segModo,
    el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, E.k), valoreK), inK), btnRiordino,
    el("h4", {}, E.fonti), zonaFonti, el("label", { class: "interruttore" }, el("span", {}, E.non_so), inNonSo));

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  const titolo = testoSvg({ x: W / 2, y: 24, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, E.titolo_scena);
  const gTemi = svgEl("g");
  const gFili = svgEl("g");
  const gPunti = svgEl("g");
  const gDomanda = svgEl("g");
  svg.append(titolo, gTemi, gFili, gPunti, gDomanda);
  svg.append(testoSvg({ x: W / 2, y: H - 8, "text-anchor": "middle", "font-size": 9.5, fill: "#7a849e" }, E.avviso_dimensioni));
  for (const t of sc.temi) gTemi.append(testoSvg({ x: t.x, y: t.y, "text-anchor": "middle", "font-size": 10.5, "font-weight": 800, fill: t.colore, "letter-spacing": ".05em" }, t.nome));
  const PUNTI = {};
  for (const p of sc.porzioni) {
    const g = svgEl("g", { class: "punto" });
    const c = svgEl("circle", { cx: p.x, cy: p.y, r: 7, fill: temaDi(p.tema).colore, stroke: "#fff", "stroke-width": 1.5 });
    const anello = svgEl("circle", { cx: p.x, cy: p.y, r: 11, fill: "none", stroke: "#4f46e5", "stroke-width": 2, opacity: 0 });
    const vecchio = fonteDi(p.fonte).vecchia ? svgEl("text", { x: p.x, y: p.y + 3.5, "text-anchor": "middle", "font-size": 9, "font-weight": 900, fill: "#fff" }) : null;
    if (vecchio) vecchio.textContent = "!";
    const rango = testoSvg({ x: p.x + 10, y: p.y - 9, "font-size": 9.5, "font-weight": 900, fill: "#4338ca" }, "");
    const tit = svgEl("title");
    tit.textContent = `${fonteDi(p.fonte).nome}: ${p.testo}`;
    g.append(tit, anello, c);
    if (vecchio) g.append(vecchio);
    g.append(rango);
    gPunti.append(g);
    PUNTI[p.id] = { g, anello, rango };
  }
  scena.append(svg);

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  const corpo = el("div", { "aria-live": "polite" });
  destra.append(el("h3", {}, E.titolo_destra), corpo);

  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  function barra(v, colore) {
    return el("div", { class: "barra" }, el("span", { style: `width:${Math.round((v || 0) * 100)}%;background:${colore}` }));
  }

  function disegna() {
    // comandi
    segDomanda.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.domanda)));
    segModo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.modo)));
    inK.value = s.k;
    valoreK.textContent = s.riordino ? riempi(T.k_riordino, { n: QUANTI_RIORDINO, m: TENUTI_RIORDINO }) : String(s.k);
    btnRiordino.classList.toggle("premuto", s.riordino);
    btnRiordino.setAttribute("aria-pressed", String(s.riordino));
    for (const f of sc.fonti) inFonti[f.id].checked = s.fonti.includes(f.id);
    inNonSo.checked = s.non_so;
    // scena
    const q = domandaDi(sc, s.domanda);
    const lista = cerca(sc, s);
    const r = rispondi(sc, s);
    gFili.replaceChildren();
    for (const p of sc.porzioni) {
      const P = PUNTI[p.id];
      const indicizzata = s.fonti.includes(p.fonte);
      const k = lista.indexOf(p.id);
      P.g.setAttribute("opacity", indicizzata ? (k >= 0 ? "1" : ".55") : ".12");
      P.anello.setAttribute("opacity", k >= 0 ? "1" : "0");
      P.anello.setAttribute("stroke", k >= 0 && r.citazioni[0] === k + 1 ? (r.esito === "giusta" ? "#16a34a" : "#e11d48") : "#4f46e5");
      P.rango.textContent = k >= 0 ? `[${k + 1}]` : "";
      if (k >= 0) gFili.append(svgEl("line", { class: "filo", x1: q.x, y1: q.y, x2: p.x, y2: p.y, stroke: "#4f46e5", "stroke-opacity": ".45", "stroke-width": 1.4, "stroke-dasharray": s.modo === "parole" ? "2 3" : "" }));
    }
    gDomanda.replaceChildren(
      svgEl("rect", { x: q.x - 8, y: q.y - 8, width: 16, height: 16, rx: 3, fill: "#17203b", transform: `rotate(45 ${q.x} ${q.y})` }),
      testoSvg({ x: q.x, y: q.y + 24, "text-anchor": "middle", "font-size": 9.5, "font-weight": 800, fill: "#17203b" }, E.punto_domanda));
    if (!ridotto && svg.animate) gFili.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    // destra
    const m = misura(sc, s);
    const elenco = lista.map((id, i) => {
      const p = sc.porzioni.find((x) => x.id === id);
      const classi = [r.citazioni.includes(i + 1) ? "citata" : "", q.pertinenti.includes(id) ? "utile" : ""].join(" ").trim();
      return el("div", { class: classi }, `[${i + 1}] ${fonteDi(p.fonte).nome} — ${p.testo}`);
    });
    corpo.replaceChildren(
      el("div", { class: "etichetta-piccola", style: "margin-top:0" }, E.risposta),
      el("p", { class: `risposta ${r.esito}` }, r.testo),
      el("div", { class: "esito" }, r.nota),
      el("div", { class: "etichetta-piccola" }, riempi(T.recuperate, { n: lista.length })),
      lista.length ? el("div", { class: "elenco" }, elenco) : el("p", { class: "nota" }, T.nessuna_porzione),
      el("div", { class: "misure" },
        el("div", {}, el("div", {}, E.precisione), el("b", {}, num(m.precisione)), barra(m.precisione, "#4f46e5")),
        el("div", {}, el("div", {}, E.richiamo), el("b", {}, num(m.richiamo)), barra(m.richiamo, "#16a34a"))),
      el("p", { class: "nota" }, T.nota_misure),
      el("div", { class: "confronto" }, el("b", {}, E.titolo_confronto), el("div", {}, T.confronto_rag), el("div", {}, T.confronto_memoria)));
  }

  function cambia(diff) {
    Object.assign(s, diff);
    disegna();
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    domandaDi(sc, nuovo.domanda);
    if (!MODI.includes(nuovo.modo)) throw new Error(`stato_animazione: modo sconosciuto «${nuovo.modo}»`);
    if (!(nuovo.k >= sc.k.min && nuovo.k <= sc.k.max)) throw new Error(`stato_animazione: k fuori scala «${nuovo.k}»`);
    for (const f of nuovo.fonti) if (!fonteDi(f)) throw new Error(`stato_animazione: fonte sconosciuta «${f}»`);
    Object.assign(s, nuovo, { fonti: [...nuovo.fonti] });
    disegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo */ },
    _prova: { stato: s, cerca: () => cerca(sc, s), misura: () => misura(sc, s), rispondi: () => rispondi(sc, s) },
  };
}
