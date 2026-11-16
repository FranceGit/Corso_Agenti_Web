// Lezione interattiva "Due piani di connessione" (P6.3): piano degli strumenti (MCP, "fai questa cosa precisa") e
// piano degli agenti (A2A, "raggiungi questo obiettivo"), con la scheda dell'agente (agent card) del fornitore.
// Quattro modi di passarsi il lavoro (lavagna comune, agente come strumento, passaggio di consegne, A2A) con un
// gettone che percorre i passi; interruttore "fornitore acceso" (spento = errore di rete, nessun ritentativo nella
// demo); bilancia A2A / sotto-agente locale con tre fattori; gioco "Decidi tu". Tutti i testi dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "due_piani_agenti";
const VISTE = ["piani", "modi", "bilancia", "decidi"];
const W = 720, H = 420;
const BOX = { w: 132, h: 40 };
const PIANI = {
  agenti: { y: 125, pianoY: [70, 180], posti: { vendite: 140, assistenza: 330, catalogo: 572 } },
  strumenti: { y: 322, pianoY: [262, 380], posti: { crm: 120, email: 260, archivio: 400, magazzino: 572 } },
};
const MODI_POS = { cliente: { x: 80, y: 196 }, a: { x: 300, y: 196 }, b: { x: 540, y: 196 }, lavagna: { x: 420, y: 332 } };
const CURVA = 34;
const BIL = { cx: 360, cy: 230, braccio: 220, gradi: 18 };
const CASO = { x: 20, y0: 64, passo: 84, w: 680, h: 70, caratteri: 92 };
const PASSO_MS = 900;

const STILE = `
.lz-due_piani_agenti .agente { cursor: pointer; }
.lz-due_piani_agenti .agente:focus-visible rect { stroke: #4f46e5; stroke-width: 3.5; }
.lz-due_piani_agenti .gettone { transition: transform .6s cubic-bezier(.2,.8,.2,1); }
.lz-due_piani_agenti .ago { transition: transform .6s cubic-bezier(.2,.8,.2,1); transform-box: view-box; }
.lz-due_piani_agenti.ridotto .gettone, .lz-due_piani_agenti.ridotto .ago { transition: none; }
.lz-due_piani_agenti .card { display: grid; gap: 4px; font-size: .8rem; }
.lz-due_piani_agenti .card .codice { font-family: var(--mono); font-size: .74rem; background: #f3f6fd; border-radius: 8px; padding: 6px 8px; display: grid; gap: 3px; }
.lz-due_piani_agenti .card .nome { font-weight: 800; font-size: .92rem; }
.lz-due_piani_agenti .frase { font-size: .8rem; padding: 6px 8px; border-radius: 8px; margin-top: 8px; font-weight: 700; }
.lz-due_piani_agenti .frase.mcp { background: #ecfeff; color: #0e7490; }
.lz-due_piani_agenti .frase.a2a { background: #f5f3ff; color: #6d28d9; }
.lz-due_piani_agenti .riga-info { font-size: .84rem; padding: 6px 0; }
.lz-due_piani_agenti .errore { padding: 7px 10px; border-radius: 10px; background: var(--male-chiaro); color: #9f1239; font-weight: 600; font-size: .82rem; }
.lz-due_piani_agenti .verdetto { padding: 8px 10px; border-radius: 10px; background: var(--primario-chiaro); color: #3730a3; font-weight: 700; }
.lz-due_piani_agenti .scelta-gioco { display: grid; gap: 3px; margin: 8px 0; font-size: .8rem; }
.lz-due_piani_agenti .verifica { display: grid; gap: 6px; }
.lz-due_piani_agenti .verifica .riga { font-size: .82rem; padding: 7px 10px; border-radius: 10px; }
.lz-due_piani_agenti .verifica .giusto { background: var(--ok-chiaro); color: #166534; }
.lz-due_piani_agenti .verifica .quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-due_piani_agenti .verifica .sbagliato, .lz-due_piani_agenti .verifica .vuoto { background: var(--male-chiaro); color: #9f1239; }
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

/** Percorso del modo scelto: passi (con errore se il fornitore e' spento), chi comanda, chi parla col cliente. */
export function percorso(sc, s) {
  const m = sc.modi.find((x) => x.id === s.modo);
  if (!m) throw new Error(`modo sconosciuto «${s.modo}»`);
  const guasto = m.esterno && !s.fornitore_acceso;
  const passi = [];
  for (const p of m.passi) {
    const versoEsterno = p.verso === "b" && m.esterno;
    if (guasto && versoEsterno) { passi.push({ ...p, errore: true }); break; }
    passi.push({ ...p, errore: false });
  }
  const nomeDi = (r) => (r === "a" ? m.a : r === "b" ? m.b : r);
  return { passi, comando: m.comando, parla: guasto ? null : nomeDi(m.parla), errore: guasto, modo: m };
}
/** Bilancia A2A / sotto-agente locale: quanti fattori spingono verso A2A e verdetto. */
export function bilancia(sc, s) {
  const punti = sc.fattori.filter((f) => f.valori.find((v) => v.id === s.fattori[f.id]).verso_a2a).length;
  return { punti, tot: sc.fattori.length, verdetto: punti >= sc.soglia_a2a ? "a2a" : "locale" };
}
/** Angolo dell'ago (gradi): negativo verso il sotto-agente locale (sinistra), positivo verso A2A (destra). */
export function angolo(sc, s) {
  const b = bilancia(sc, s);
  return ((b.punti - b.tot / 2) / (b.tot / 2)) * BIL.gradi;
}
/** Il piano degli agenti: quali collegamenti MCP e A2A sono attivi (A2A rotto se il fornitore e' spento). */
export function collegamenti(sc, s) {
  const mcp = sc.agenti.flatMap((a) => a.strumenti.map((t) => ({ agente: a.id, strumento: t, attivo: !(a.esterno && !s.fornitore_acceso) })));
  const esterni = sc.agenti.filter((a) => a.esterno).map((a) => a.id);
  const a2a = esterni.map((id) => ({ da: "assistenza", verso: id, attivo: s.fornitore_acceso }));
  return { mcp, a2a };
}
export function verifica(sc, s) {
  const T = sc.testi;
  const nome = (id) => sc.collegamenti.find((c) => c.id === id).nome;
  const righe = sc.casi.map((c, i) => {
    const scelta = s.scelte[c.id] || "";
    const esito = !scelta ? "vuoto" : scelta === c.migliore ? "giusto" : c.quasi.includes(scelta) ? "quasi" : "sbagliato";
    return { id: c.id, esito, testo: riempi(T[`ver_${esito}`], { n: i + 1, migliore: nome(c.migliore), spiega: c.spiega }) };
  });
  const giuste = righe.filter((r) => r.esito === "giusto").length;
  return { righe, giuste, totali: righe.length, sintesi: giuste === righe.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righe.length }) };
}
/** Geometria di un passo nella vista "modi": estremi e punto di controllo della curva. */
export function geometriaPasso(p) {
  const A = MODI_POS[p.da], B = MODI_POS[p.verso];
  const dx = B.x - A.x, dy = B.y - A.y;
  const L = Math.hypot(dx, dy) || 1;
  const segno = A.x < B.x || (A.x === B.x && A.y < B.y) ? -1 : 1;
  const c = { x: (A.x + B.x) / 2 + (-dy / L) * CURVA * segno, y: (A.y + B.y) / 2 + (dx / L) * CURVA * segno };
  return { A, B, c };
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
  const num = (x) => x.toLocaleString(lingua);
  const agente = (id) => sc.agenti.find((a) => a.id === id);

  const s = {
    vista: "piani", modo: sc.modi[0].id, agente_aperto: sc.agenti[0].id, fornitore_acceso: true,
    fattori: Object.fromEntries(sc.fattori.map((f) => [f.id, f.valori[0].id])), scelte: {}, verificato: false,
  };
  let fotogramma = 0;
  let timer = null;

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...VISTE.map((v) => el("button", { "data-v": v, onclick: () => cambia({ vista: v }) }, E[`vista_${v}`])));
  const segModo = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.modo },
    ...sc.modi.map((m) => el("button", { "data-v": m.id, onclick: () => cambia({ modo: m.id }) }, m.nome)));
  const inForn = el("input", { type: "checkbox", onchange: (e) => cambia({ fornitore_acceso: e.target.checked }) });
  const nodoForn = el("label", { class: "interruttore" }, el("span", {}, E.fornitore), inForn);
  const zonaModi = el("div", {}, el("h4", {}, E.modo), segModo);
  const segFattori = {};
  const zonaBilancia = el("div", {});
  for (const f of sc.fattori) {
    const seg = el("div", { class: "segmentato verticale", role: "group", "aria-label": f.nome },
      ...f.valori.map((v) => el("button", { "data-v": v.id, onclick: () => cambia({ fattori: { ...s.fattori, [f.id]: v.id } }) }, v.nome)));
    segFattori[f.id] = seg;
    zonaBilancia.append(el("h4", {}, f.nome), seg);
  }
  const tendine = {};
  const zonaDecidi = el("div", {});
  sc.casi.forEach((c, i) => {
    const sel = el("select", { "aria-label": riempi(T.scegli_per, { n: i + 1 }), onchange: (e) => scegli(c.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.collegamenti.map((x) => el("option", { value: x.id }, x.nome)));
    tendine[c.id] = sel;
    zonaDecidi.append(el("label", { class: "scelta-gioco" }, el("span", {}, riempi(T.situazione, { n: i + 1 })), sel));
  });
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => { s.verificato = true; disegnaDestra(); } }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaModi, nodoForn, zonaBilancia, zonaDecidi);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs><marker id="dp-freccia" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>`;
  const titolo = testoSvg({ x: W / 2, y: 30, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, "");
  const gPiani = svgEl("g"), gModi = svgEl("g"), gBil = svgEl("g"), gCasi = svgEl("g");
  svg.append(titolo, gPiani, gModi, gBil, gCasi);
  scena.append(svg);

  // piano: struttura fissa
  const piano = (y0, y1, colore) => svgEl("polygon", { points: `60,${y0} 700,${y0} 660,${y1} 20,${y1}`, fill: colore, "fill-opacity": ".08", stroke: colore, "stroke-opacity": ".35" });
  const gPianiFissi = svgEl("g"), gCavi = svgEl("g"), gAgenti = svgEl("g"), gStrumenti = svgEl("g");
  gPianiFissi.append(piano(...PIANI.agenti.pianoY, "#7c3aed"), piano(...PIANI.strumenti.pianoY, "#0891b2"),
    testoSvg({ x: 70, y: PIANI.agenti.pianoY[0] + 16, "font-size": 9.5, "font-weight": 800, fill: "#6d28d9", "letter-spacing": ".06em" }, E.piano_agenti),
    testoSvg({ x: 70, y: PIANI.strumenti.pianoY[0] + 16, "font-size": 9.5, "font-weight": 800, fill: "#0e7490", "letter-spacing": ".06em" }, E.piano_strumenti),
    testoSvg({ x: W / 2, y: 404, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#0e7490" }, T.mcp_frase),
    testoSvg({ x: 451, y: 102, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: "#6d28d9" }, T.a2a_frase));
  const xc = PIANI.agenti.posti.catalogo;
  gPianiFissi.append(svgEl("rect", { x: xc - 80, y: 78, width: 160, height: 290, rx: 14, fill: "none", stroke: "#94a3b8", "stroke-dasharray": "6 5" }),
    testoSvg({ x: xc, y: 93, "text-anchor": "middle", "font-size": 9, "font-weight": 800, fill: "#64748b" }, E.altra_azienda),
    testoSvg({ x: 235, y: 93, "text-anchor": "middle", "font-size": 9, "font-weight": 800, fill: "#64748b" }, E.tua_azienda));
  gPiani.append(gPianiFissi, gCavi, gStrumenti, gAgenti);
  const RA = {}, RS = {};
  for (const a of sc.agenti) {
    const x = PIANI.agenti.posti[a.id], y = PIANI.agenti.y;
    const g = svgEl("g", { class: "agente", tabindex: "0", role: "button", "aria-label": riempi(T.apri_agente, { nome: a.nome }) });
    const r = svgEl("rect", { x: x - BOX.w / 2, y: y - BOX.h / 2, width: BOX.w, height: BOX.h, rx: 12, fill: "#fff", stroke: "#7c3aed", "stroke-width": 2, "stroke-dasharray": a.esterno ? "5 3" : "" });
    g.append(r, testoSvg({ x, y: y + 4, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#17203b" }, a.nome));
    const apri = () => cambia({ agente_aperto: a.id }, true);
    g.addEventListener("click", apri);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(); } });
    gAgenti.append(g);
    RA[a.id] = { g, r };
  }
  for (const t of sc.strumenti) {
    const x = PIANI.strumenti.posti[t.id], y = PIANI.strumenti.y;
    const g = svgEl("g");
    g.append(svgEl("rect", { x: x - 56, y: y - 16, width: 112, height: 32, rx: 8, fill: "#ecfeff", stroke: "#0891b2", "stroke-width": 1.5 }),
      testoSvg({ x, y: y + 4, "text-anchor": "middle", "font-size": 10.5, "font-weight": 700, fill: "#164e63" }, t.nome));
    gStrumenti.append(g);
    RS[t.id] = g;
  }
  // bilancia: struttura fissa
  const ago = svgEl("g", { class: "ago" });
  const gPiatti = svgEl("g");
  ago.append(svgEl("line", { x1: BIL.cx - BIL.braccio, y1: BIL.cy, x2: BIL.cx + BIL.braccio, y2: BIL.cy, stroke: "#334155", "stroke-width": 4, "stroke-linecap": "round" }), gPiatti);
  gBil.append(svgEl("path", { d: `M${BIL.cx - 30} ${BIL.cy + 130} L${BIL.cx} ${BIL.cy} L${BIL.cx + 30} ${BIL.cy + 130} Z`, fill: "#cbd5e1" }), ago,
    svgEl("circle", { cx: BIL.cx, cy: BIL.cy, r: 8, fill: "#334155" }));
  // modi: gettone
  const gPassi = svgEl("g"), gAttori = svgEl("g");
  const gettone = svgEl("g", { class: "gettone" });
  gettone.append(svgEl("circle", { r: 8, fill: "#facc15", stroke: "#a16207", "stroke-width": 1.5 }));
  gModi.append(gAttori, gPassi, gettone);

  const destra = el("aside", { class: "pannello destra" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}${ridotto ? " ridotto" : ""}` }, comandi, scena, destra));

  function disegnaPiani() {
    const c = collegamenti(sc, s);
    gCavi.replaceChildren();
    for (const k of c.mcp) {
      const x1 = PIANI.agenti.posti[k.agente], x2 = PIANI.strumenti.posti[k.strumento];
      gCavi.append(svgEl("line", { x1, y1: PIANI.agenti.y + BOX.h / 2, x2, y2: PIANI.strumenti.y - 16, stroke: k.attivo ? "#0891b2" : "#cbd5e1", "stroke-width": 2, "stroke-dasharray": k.attivo ? "" : "4 4" }),
        testoSvg({ x: (x1 + x2) / 2 + 4, y: (PIANI.agenti.y + PIANI.strumenti.y) / 2 + 4, "font-size": 8.5, "font-weight": 800, fill: k.attivo ? "#0e7490" : "#94a3b8" }, E.mcp));
    }
    for (const k of c.a2a) {
      const x1 = PIANI.agenti.posti[k.da] + BOX.w / 2, x2 = PIANI.agenti.posti[k.verso] - BOX.w / 2;
      gCavi.append(svgEl("line", { x1: x1 + 2, y1: PIANI.agenti.y, x2: x2 - 4, y2: PIANI.agenti.y, stroke: k.attivo ? "#7c3aed" : "#e11d48", "stroke-width": 3, "stroke-dasharray": k.attivo ? "" : "6 4", "marker-end": "url(#dp-freccia)", "marker-start": "url(#dp-freccia)" }));
      if (!k.attivo) gCavi.append(testoSvg({ x: (x1 + x2) / 2, y: PIANI.agenti.y + 32, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: "#be123c" }, T.fornitore_spento));
    }
    for (const a of sc.agenti) {
      const spento = a.esterno && !s.fornitore_acceso;
      RA[a.id].g.setAttribute("opacity", spento ? ".45" : "1");
      RA[a.id].r.setAttribute("stroke-width", a.id === s.agente_aperto ? "3.5" : "2");
    }
    for (const t of sc.strumenti) {
      const proprietario = sc.agenti.find((a) => a.strumenti.includes(t.id));
      RS[t.id].setAttribute("opacity", proprietario.esterno && !s.fornitore_acceso ? ".45" : "1");
    }
  }

  function disegnaModi() {
    const p = percorso(sc, s);
    const m = p.modo;
    gAttori.replaceChildren();
    const nomi = { cliente: E.cliente, a: m.a, b: m.b, lavagna: E.lavagna };
    const usati = new Set(m.passi.flatMap((x) => [x.da, x.verso]));
    if (m.esterno) {
      const B = MODI_POS.b;
      gAttori.append(svgEl("rect", { x: B.x - 90, y: B.y - 70, width: 180, height: 140, rx: 14, fill: "none", stroke: "#94a3b8", "stroke-dasharray": "6 5" }),
        testoSvg({ x: B.x, y: B.y - 54, "text-anchor": "middle", "font-size": 9, "font-weight": 800, fill: "#64748b" }, E.altra_azienda));
    }
    for (const [r, pos] of Object.entries(MODI_POS)) {
      if (!usati.has(r)) continue;
      const spento = r === "b" && p.errore;
      const g = svgEl("g", { opacity: spento ? ".45" : "1" });
      if (r === "cliente") g.append(svgEl("circle", { cx: pos.x, cy: pos.y - 10, r: 12, fill: "#64748b" }), svgEl("path", { d: `M${pos.x - 20} ${pos.y + 22} q20 -28 40 0`, fill: "#64748b" }));
      else g.append(svgEl("rect", { x: pos.x - BOX.w / 2, y: pos.y - BOX.h / 2, width: BOX.w, height: BOX.h, rx: r === "lavagna" ? 4 : 12, fill: r === "lavagna" ? "#1e293b" : "#fff", stroke: r === "lavagna" ? "#1e293b" : "#7c3aed", "stroke-width": 2 }));
      g.append(testoSvg({ x: pos.x, y: r === "cliente" ? pos.y + 40 : pos.y + 4, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: r === "lavagna" ? "#fff" : "#17203b" }, nomi[r]));
      gAttori.append(g);
    }
    gPassi.replaceChildren();
    p.passi.forEach((x, k) => {
      const { A, B, c } = geometriaPasso(x);
      const colore = x.errore ? "#e11d48" : "#475569";
      gPassi.append(svgEl("path", { d: `M${A.x} ${A.y} Q ${c.x} ${c.y} ${B.x} ${B.y}`, fill: "none", stroke: colore, "stroke-width": 1.8, "stroke-dasharray": x.errore ? "6 4" : "", "marker-end": "url(#dp-freccia)", opacity: ".8" }));
      const lx = (A.x + 2 * c.x + B.x) / 4, ly = (A.y + 2 * c.y + B.y) / 4;
      gPassi.append(svgEl("circle", { cx: lx - 4, cy: ly - 4, r: 8, fill: colore }),
        testoSvg({ x: lx - 4, y: ly, "text-anchor": "middle", "font-size": 9.5, "font-weight": 800, fill: "#fff" }, num(k + 1)),
        testoSvg({ x: lx + 8, y: ly, "font-size": 9.5, "font-weight": 700, fill: x.errore ? "#be123c" : "#334155" }, x.errore ? T.fornitore_spento : x.etichetta));
    });
    disegnaGettone();
  }
  function disegnaGettone() {
    const p = percorso(sc, s);
    const k = Math.min(fotogramma, p.passi.length);
    const pos = k === 0 ? MODI_POS[p.passi[0].da] : MODI_POS[p.passi[k - 1].verso];
    const y = pos.y - BOX.h / 2 - 6;
    gettone.style.transform = `translate(${pos.x}px, ${y}px)`;
    gettone.setAttribute("transform", `translate(${pos.x},${y})`);
  }

  function disegnaBilancia() {
    ago.style.transform = `rotate(${angolo(sc, s)}deg)`;
    ago.style.transformOrigin = `${BIL.cx}px ${BIL.cy}px`;
    gPiatti.replaceChildren();
    const lati = [{ a2a: false, x: BIL.cx - BIL.braccio, nome: E.locale }, { a2a: true, x: BIL.cx + BIL.braccio, nome: E.a2a }];
    for (const l of lati) {
      gPiatti.append(svgEl("line", { x1: l.x, y1: BIL.cy, x2: l.x, y2: BIL.cy + 30, stroke: "#334155", "stroke-width": 2 }),
        svgEl("rect", { x: l.x - 85, y: BIL.cy + 30, width: 170, height: 8, rx: 4, fill: "#334155" }),
        testoSvg({ x: l.x, y: BIL.cy + 58, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: l.a2a ? "#6d28d9" : "#0e7490" }, l.nome));
      let k = 0;
      for (const f of sc.fattori) {
        const v = f.valori.find((x) => x.id === s.fattori[f.id]);
        if (v.verso_a2a !== l.a2a) continue;
        gPiatti.append(svgEl("rect", { x: l.x - 80, y: BIL.cy + 6 - (k + 1) * 26, width: 160, height: 22, rx: 11, fill: l.a2a ? "#ede9fe" : "#cffafe", stroke: l.a2a ? "#7c3aed" : "#0891b2" }),
          testoSvg({ x: l.x, y: BIL.cy + 21 - (k + 1) * 26, "text-anchor": "middle", "font-size": 9.5, "font-weight": 700, fill: "#17203b" }, v.nome));
        k += 1;
      }
    }
  }

  function disegnaCasi() {
    gCasi.replaceChildren();
    sc.casi.forEach((c, i) => {
      const y = CASO.y0 + i * CASO.passo;
      const scelta = s.scelte[c.id];
      gCasi.append(svgEl("rect", { x: CASO.x, y, width: CASO.w, height: CASO.h, rx: 12, fill: "#fff", stroke: scelta ? "#4f46e5" : "#cbd2e3", "stroke-width": 1.5 }),
        testoSvg({ x: CASO.x + 12, y: y + 19, "font-size": 10.5, "font-weight": 800, fill: "#4f46e5" }, riempi(T.situazione, { n: i + 1 })));
      aCapo(c.testo, CASO.caratteri).slice(0, 2).forEach((r, k) => gCasi.append(testoSvg({ x: CASO.x + 12, y: y + 38 + k * 15, "font-size": 10.5, fill: "#17203b" }, r)));
      if (scelta) gCasi.append(testoSvg({ x: CASO.x + CASO.w - 12, y: y + 19, "text-anchor": "end", "font-size": 10, "font-weight": 800, fill: "#4f46e5" }, sc.collegamenti.find((x) => x.id === scelta).nome));
    });
  }

  function disegnaScena() {
    titolo.textContent = s.vista === "piani" ? E.complementari.toUpperCase() : s.vista === "modi" ? percorso(sc, s).modo.nome.toUpperCase() : s.vista === "bilancia" ? E.titolo_bilancia : E.titolo_decidi;
    gPiani.classList.toggle("nascosto", s.vista !== "piani");
    gModi.classList.toggle("nascosto", s.vista !== "modi");
    gBil.classList.toggle("nascosto", s.vista !== "bilancia");
    gCasi.classList.toggle("nascosto", s.vista !== "decidi");
    if (s.vista === "piani") disegnaPiani();
    if (s.vista === "modi") disegnaModi();
    if (s.vista === "bilancia") disegnaBilancia();
    if (s.vista === "decidi") disegnaCasi();
  }

  function disegnaDestra() {
    const figli = [el("h3", {}, E.titolo_scheda)];
    if (s.vista === "piani") {
      const a = agente(s.agente_aperto);
      figli.push(el("div", { class: "card", "aria-live": "polite" },
        el("div", { class: "nome" }, a.esterno ? E.titolo_scheda_agente : a.nome),
        a.esterno ? el("div", { class: "codice" }, ...a.scheda.map((r) => el("div", {}, r))) : a.scheda.map((r) => el("div", {}, r)),
        a.esterno && !s.fornitore_acceso ? el("div", { class: "errore" }, T.errore_rete) : null),
        el("div", { class: "frase mcp" }, T.mcp_frase), el("div", { class: "frase a2a" }, T.a2a_frase));
    } else if (s.vista === "modi") {
      const p = percorso(sc, s);
      figli.push(el("div", { "aria-live": "polite" },
        el("div", { class: "riga-info" }, riempi(T.comando, { chi: p.comando })),
        p.parla ? el("div", { class: "riga-info" }, riempi(T.parla, { chi: p.parla })) : null,
        p.errore ? el("div", { class: "errore" }, T.errore_rete) : null));
    } else if (s.vista === "bilancia") {
      const b = bilancia(sc, s);
      figli.push(el("div", { "aria-live": "polite" },
        el("div", { class: "riga-info" }, riempi(T.punti, { n: num(b.punti), tot: num(b.tot) })),
        el("div", { class: "verdetto" }, T[`verdetto_${b.verdetto}`])));
    } else if (s.verificato) {
      const v = verifica(sc, s);
      figli.push(el("div", { class: "verifica", "aria-live": "polite" },
        el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
        ...v.righe.map((r) => el("div", { class: `riga ${r.esito}` }, r.testo))));
    }
    destra.replaceChildren(...figli);
  }

  function aggiornaComandi() {
    const premi = (seg, v) => seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
    premi(segVista, s.vista);
    premi(segModo, s.modo);
    for (const f of sc.fattori) premi(segFattori[f.id], s.fattori[f.id]);
    inForn.checked = s.fornitore_acceso;
    zonaModi.classList.toggle("nascosto", s.vista !== "modi");
    nodoForn.classList.toggle("nascosto", !["piani", "modi"].includes(s.vista));
    zonaBilancia.classList.toggle("nascosto", s.vista !== "bilancia");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaDestra(); }
  function avvia() {
    if (timer) clearInterval(timer);
    timer = null;
    fotogramma = ridotto ? Number.MAX_SAFE_INTEGER : 0;
    if (ridotto) return;
    timer = setInterval(() => {
      if (s.vista !== "modi") return;
      const n = percorso(sc, s).passi.length;
      fotogramma = fotogramma >= n + 1 ? 0 : fotogramma + 1;
      disegnaGettone();
    }, PASSO_MS);
  }
  function cambia(diff, soloScheda) {
    Object.assign(s, diff);
    if (!soloScheda) s.verificato = false;
    avvia();
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
    nuovo.fattori = { ...s.fattori, ...(nuovo.fattori || {}) };
    if (!VISTE.includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!sc.modi.some((m) => m.id === nuovo.modo)) throw new Error(`stato_animazione: modo sconosciuto «${nuovo.modo}»`);
    if (!agente(nuovo.agente_aperto)) throw new Error(`stato_animazione: agente sconosciuto «${nuovo.agente_aperto}»`);
    for (const [f, v] of Object.entries(nuovo.fattori)) {
      const def = sc.fattori.find((x) => x.id === f);
      if (!def || !def.valori.some((x) => x.id === v)) throw new Error(`stato_animazione: fattore non valido «${f}=${v}»`);
    }
    for (const [id, r] of Object.entries(nuovo.scelte)) {
      if (!sc.casi.some((c) => c.id === id)) throw new Error(`stato_animazione: caso sconosciuto «${id}»`);
      if (!sc.collegamenti.some((x) => x.id === r)) throw new Error(`stato_animazione: collegamento sconosciuto «${r}»`);
    }
    Object.assign(s, nuovo);
    avvia();
    ridisegna();
  }
  applica({});
  return {
    applica,
    distruggi() { if (timer) clearInterval(timer); timer = null; },
    _prova: { stato: s, percorso: () => percorso(sc, s), bilancia: () => bilancia(sc, s), verifica: () => verifica(sc, s) },
  };
}
