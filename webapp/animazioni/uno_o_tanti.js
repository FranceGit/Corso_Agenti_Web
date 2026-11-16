// Lezione interattiva "Uno o tanti?" (P6.1): un agente CRM con 16 strumenti. Due cursori (condizioni se/allora nel
// prompt, strumenti sovrapposti) abbassano l'indicatore "scelte corrette dello strumento" (valori illustrativi);
// "chiarisci i nomi" corregge la somiglianza ma non la logica complessa. La vista "Squadra" divide il lavoro in 4
// specialisti (gli strumenti volano sotto il loro agente) con modello leggero/potente e un solo agente che scrive nel
// CRM; i contatori mostrano il prezzo del coordinamento. Gioco "Decidi tu" su 5 casi. Testi e numeri dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "uno_o_tanti";
const VISTE = ["uno", "squadra", "decidi"];
const W = 720, H = 420;
const CHIP = { w: 150, h: 22 };
const UNO = { xs: 12, xd: 558, y0: 70, passo: 40, cx: 360, cy: 250, r: 46, promptX: 330, promptW: 60, promptFondo: 192, promptMin: 20, promptPasso: 8 };
const SQ = { capo: { x: 285, y: 62, w: 150, h: 50 }, ys: 170, xs: [30, 285, 540], w: 150, h: 50, chipY0: 232, chipPasso: 28, capoChip: [[30, 62], [30, 90], [540, 62], [540, 90]] };
const CASO = { x: 20, y0: 62, passo: 70, w: 680, h: 60, caratteri: 92 };

const STILE = `
.lz-uno_o_tanti .chip { transition: transform .6s cubic-bezier(.2,.8,.2,1), opacity .4s; }
.lz-uno_o_tanti.ridotto .chip { transition: none; }
.lz-uno_o_tanti .agente-sq { cursor: pointer; }
.lz-uno_o_tanti .agente-sq:focus-visible rect { stroke: #4f46e5; stroke-width: 3.5; }
.lz-uno_o_tanti .flusso { stroke-dasharray: 5 6; animation: uot-flusso 1.2s linear infinite; }
.lz-uno_o_tanti.ridotto .flusso { animation: none; }
@keyframes uot-flusso { to { stroke-dashoffset: -22; } }
.lz-uno_o_tanti .indicatore { display: grid; gap: 6px; }
.lz-uno_o_tanti .indicatore .riga { display: flex; justify-content: space-between; font-size: .84rem; }
.lz-uno_o_tanti .indicatore b { font-size: 1.3rem; font-variant-numeric: tabular-nums; }
.lz-uno_o_tanti .barra { height: 10px; border-radius: 10px; background: #eef1f8; overflow: hidden; }
.lz-uno_o_tanti .barra span { display: block; height: 100%; border-radius: 10px; transition: width .5s ease, background .3s; }
.lz-uno_o_tanti .consiglio { padding: 7px 10px; border-radius: 10px; font-weight: 600; font-size: .84rem; }
.lz-uno_o_tanti .consiglio.ok { background: var(--ok-chiaro); color: #166534; }
.lz-uno_o_tanti .consiglio.avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-uno_o_tanti .consiglio.male { background: var(--male-chiaro); color: #9f1239; }
.lz-uno_o_tanti .contatori { display: grid; gap: 6px; margin-top: 12px; font-size: .82rem; }
.lz-uno_o_tanti .contatori .riga { display: flex; justify-content: space-between; gap: 8px; }
.lz-uno_o_tanti .contatori b { font-variant-numeric: tabular-nums; }
.lz-uno_o_tanti .nota { font-size: .76rem; color: var(--tenue); margin: 4px 0 0; }
.lz-uno_o_tanti .regola { margin-top: 10px; padding: 8px 10px; border-left: 4px solid #8b5cf6; background: #f5f3ff; border-radius: 0 10px 10px 0; font-weight: 700; font-size: .84rem; }
.lz-uno_o_tanti .scheda-agente { margin-top: 12px; display: grid; gap: 4px; font-size: .82rem; }
.lz-uno_o_tanti .scheda-agente .nome { font-weight: 800; font-size: .92rem; }
.lz-uno_o_tanti .scelta-gioco { display: grid; gap: 3px; margin: 8px 0; font-size: .82rem; }
.lz-uno_o_tanti .verifica { display: grid; gap: 6px; }
.lz-uno_o_tanti .verifica .riga { font-size: .82rem; padding: 7px 10px; border-radius: 10px; }
.lz-uno_o_tanti .verifica .giusto { background: var(--ok-chiaro); color: #166534; }
.lz-uno_o_tanti .verifica .quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-uno_o_tanti .verifica .sbagliato, .lz-uno_o_tanti .verifica .vuoto { background: var(--male-chiaro); color: #9f1239; }
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

/** Strumenti che contano come sovrapposti: i primi `sovrapposti` di quelli che hanno un gemello simile. */
export function sovrappostiAttivi(sc, s) {
  return sc.strumenti.filter((t) => t.simile).slice(0, s.sovrapposti).map((t) => t.id);
}
/** Sovrapposti che restano dopo il chiarimento dei nomi (la somiglianza vera non sparisce del tutto). */
export function sovrappostiEffettivi(sc, s) {
  return s.nomi_chiari ? Math.min(s.sovrapposti, sc.parametri.sovrapposti_dopo_chiarimento) : s.sovrapposti;
}
/** Indicatore illustrativo "scelte corrette dello strumento" (in %) e motivo principale del calo. */
export function precisione(sc, s) {
  const P = sc.parametri;
  if (s.vista === "squadra") return { valore: P.precisione_squadra, causa: null };
  const daLogica = s.condizioni * P.penalita_condizione;
  const daStrumenti = sovrappostiEffettivi(sc, s) * P.penalita_sovrapposto;
  const valore = Math.max(P.precisione_minima, P.precisione_base - daLogica - daStrumenti);
  return { valore, causa: daLogica >= daStrumenti ? "logica" : "strumenti" };
}
/** Consiglio mostrato sotto l'indicatore: ok, chiarisci, dividi (per logica o per strumenti), squadra. */
export function consiglio(sc, s) {
  if (s.vista === "squadra") return "squadra";
  const p = precisione(sc, s);
  if (p.valore >= sc.parametri.soglia_dividi) return "ok";
  if (p.causa === "strumenti") return s.nomi_chiari ? "dividi_strumenti" : "chiarisci";
  return "dividi_logica";
}
/** Contatori del coordinamento (illustrativi): chiamate, secondi, messaggi. */
export function costi(sc, s) {
  return sc.costi[s.vista === "squadra" ? "squadra" : "uno"];
}
/** Nome visibile di uno strumento nello stato dato. */
export function nomeStrumento(sc, s, t) {
  const sovr = s.vista === "uno" && sovrappostiAttivi(sc, s).includes(t.id);
  if (sovr && !s.nomi_chiari) return { nome: t.simile, tipo: "simile" };
  return { nome: t.chiaro, tipo: sovr ? "chiarito" : "normale" };
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
/** Posizione di ogni strumento nella scena (anello dell'agente unico o sotto il suo specialista). */
export function posizioni(sc, s) {
  const pos = {};
  if (s.vista === "uno") {
    sc.strumenti.forEach((t, i) => {
      const lato = i < 8 ? 0 : 1;
      pos[t.id] = { x: lato ? UNO.xd : UNO.xs, y: UNO.y0 + (i % 8) * UNO.passo };
    });
  } else if (s.vista === "squadra") {
    const specialisti = sc.agenti.slice(1).map((a) => a.id);
    const conta = {};
    for (const t of sc.strumenti) {
      const k = conta[t.agente] = (conta[t.agente] || 0) + 1;
      if (t.agente === sc.agenti[0].id) {
        const [x, y] = SQ.capoChip[k - 1];
        pos[t.id] = { x, y };
      } else {
        pos[t.id] = { x: SQ.xs[specialisti.indexOf(t.agente)], y: SQ.chipY0 + (k - 1) * SQ.chipPasso };
      }
    }
  }
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
  const num = (x) => x.toLocaleString(lingua);
  const agente = (id) => sc.agenti.find((a) => a.id === id);

  const s = { vista: "uno", condizioni: sc.condizioni.min, sovrapposti: sc.sovrapposti.min, nomi_chiari: false, agente_aperto: sc.agenti[0].id, scelte: {}, verificato: false };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...VISTE.map((v) => el("button", { "data-v": v, onclick: () => cambia({ vista: v }) }, E[`vista_${v}`])));
  function cursore(def, chiave) {
    const val = el("b", {});
    const inp = el("input", { type: "range", min: def.min, max: def.max, step: def.passo, "aria-label": def.etichetta });
    inp.addEventListener("input", () => cambia({ [chiave]: Number(inp.value) }));
    return { nodo: el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, def.etichetta), val), inp), val, inp };
  }
  const cCond = cursore(sc.condizioni, "condizioni");
  const cSov = cursore(sc.sovrapposti, "sovrapposti");
  const inChiari = el("input", { type: "checkbox", onchange: (e) => cambia({ nomi_chiari: e.target.checked }) });
  const zonaUno = el("div", {}, cCond.nodo, cSov.nodo, el("label", { class: "interruttore" }, el("span", {}, E.chiarisci), inChiari));
  const tendine = {};
  const zonaDecidi = el("div", {});
  sc.casi.forEach((c, i) => {
    const sel = el("select", { "aria-label": riempi(T.scegli_per, { n: i + 1 }), onchange: (e) => scegli(c.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.risposte_gioco.map((r) => el("option", { value: r.id }, r.nome)));
    tendine[c.id] = sel;
    zonaDecidi.append(el("label", { class: "scelta-gioco" }, el("span", {}, riempi(T.caso, { n: i + 1 })), sel));
  });
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => { s.verificato = true; disegnaDestra(); } }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaUno, zonaDecidi);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  const titolo = testoSvg({ x: W / 2, y: 28, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, "");
  const legenda = testoSvg({ x: W / 2, y: 46, "text-anchor": "middle", "font-size": 10.5, fill: "#5b6684" }, E.legenda);
  const gLinee = svgEl("g");
  const gUno = svgEl("g");
  const gSquadra = svgEl("g");
  const gChip = svgEl("g");
  const gCasi = svgEl("g");
  svg.append(titolo, legenda, gLinee, gUno, gSquadra, gChip, gCasi);
  // agente unico + colonna delle istruzioni
  const promptRect = svgEl("rect", { x: UNO.promptX, width: UNO.promptW, rx: 6, fill: "#ede9fe", stroke: "#8b5cf6", "stroke-width": 1.2 });
  const promptRighe = svgEl("g");
  gUno.append(promptRect, promptRighe,
    testoSvg({ x: UNO.cx, y: UNO.promptFondo + 12, "text-anchor": "middle", "font-size": 9.5, fill: "#6d28d9", "font-weight": 700 }, E.prompt),
    svgEl("circle", { cx: UNO.cx, cy: UNO.cy, r: UNO.r, fill: "#4f46e5" }),
    testoSvg({ x: UNO.cx, y: UNO.cy + 4, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#fff" }, E.agente_unico));
  // squadra
  const SQBOX = {};
  const specialisti = sc.agenti.slice(1);
  const boxDi = (a, i) => (i < 0 ? SQ.capo : { x: SQ.xs[i], y: SQ.ys, w: SQ.w, h: SQ.h });
  for (const [i, a] of [[-1, sc.agenti[0]], ...specialisti.map((a, k) => [k, a])]) {
    const b = boxDi(a, i);
    if (i >= 0) gSquadra.append(svgEl("line", { class: "flusso", x1: SQ.capo.x + SQ.capo.w / 2, y1: SQ.capo.y + SQ.capo.h, x2: b.x + b.w / 2, y2: b.y, stroke: a.colore, "stroke-width": 2 }));
    const g = svgEl("g", { class: "agente-sq", tabindex: "0", role: "button", "aria-label": riempi(T.apri_agente, { nome: a.nome }) });
    const r = svgEl("rect", { x: b.x, y: b.y, width: b.w, height: b.h, rx: 12, fill: "#fff", stroke: a.colore, "stroke-width": 2 });
    g.append(r, testoSvg({ x: b.x + b.w / 2, y: b.y + 21, "text-anchor": "middle", "font-size": 11.5, "font-weight": 800, fill: "#17203b" }, a.nome),
      testoSvg({ x: b.x + b.w / 2, y: b.y + 38, "text-anchor": "middle", "font-size": 9.5, fill: a.colore, "font-weight": 700 }, sc.modelli[a.modello]));
    if (a.scrive_crm) {
      const lx = b.x + b.w - 6, ly = b.y - 8;
      g.append(svgEl("rect", { x: lx - 58, y: ly - 9, width: 64, height: 16, rx: 8, fill: "#fef3c7", stroke: "#f59e0b" }),
        svgEl("rect", { x: lx - 54, y: ly - 4, width: 8, height: 7, rx: 1.5, fill: "#b45309" }),
        svgEl("path", { d: `M${lx - 52.5} ${ly - 4} v-2.5 a2.5 2.5 0 0 1 5 0 v2.5`, fill: "none", stroke: "#b45309", "stroke-width": 1.4 }),
        testoSvg({ x: lx - 42, y: ly + 3, "font-size": 9, "font-weight": 800, fill: "#92400e" }, E.scrive_crm));
    }
    const apri = () => cambia({ agente_aperto: a.id }, true);
    g.addEventListener("click", apri);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(); } });
    gSquadra.append(g);
    SQBOX[a.id] = r;
  }
  // strumenti
  const CH = {};
  for (const t of sc.strumenti) {
    const g = svgEl("g", { class: "chip" });
    const fondo = svgEl("rect", { width: CHIP.w, height: CHIP.h, rx: 7, fill: "#fff", stroke: "#cbd2e3", "stroke-width": 1.3 });
    const testo = testoSvg({ x: 8, y: 15, "font-size": 10, "font-family": "Consolas, monospace", fill: "#17203b" }, "");
    g.append(fondo, testo);
    gChip.append(g);
    CH[t.id] = { g, fondo, testo };
  }
  scena.append(svg);

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}${ridotto ? " ridotto" : ""}` }, comandi, scena, destra));

  function disegnaScena() {
    titolo.textContent = E[`titolo_${s.vista}`];
    legenda.classList.toggle("nascosto", s.vista !== "uno");
    gUno.classList.toggle("nascosto", s.vista !== "uno");
    gSquadra.classList.toggle("nascosto", s.vista !== "squadra");
    gCasi.classList.toggle("nascosto", s.vista !== "decidi");
    // colonna delle istruzioni: piu' condizioni, colonna piu' alta
    const h = UNO.promptMin + s.condizioni * UNO.promptPasso;
    promptRect.setAttribute("y", UNO.promptFondo - h);
    promptRect.setAttribute("height", h);
    promptRighe.replaceChildren(...Array.from({ length: Math.floor(h / 6) - 1 }, (_, k) => svgEl("line", { x1: UNO.promptX + 8, x2: UNO.promptX + UNO.promptW - 8 - (k % 3) * 8, y1: UNO.promptFondo - h + 6 + k * 6, y2: UNO.promptFondo - h + 6 + k * 6, stroke: "#a78bfa", "stroke-width": 1.4 })));
    const pos = posizioni(sc, s);
    gLinee.replaceChildren();
    for (const t of sc.strumenti) {
      const C = CH[t.id];
      const p = pos[t.id];
      if (!p) { C.g.setAttribute("opacity", "0"); continue; }
      C.g.setAttribute("opacity", "1");
      C.g.style.transform = `translate(${p.x}px, ${p.y}px)`;
      C.g.setAttribute("transform", `translate(${p.x},${p.y})`);
      const n = nomeStrumento(sc, s, t);
      C.testo.textContent = n.nome;
      const colore = n.tipo === "simile" ? "#f59e0b" : n.tipo === "chiarito" ? "#16a34a" : s.vista === "squadra" ? agente(t.agente).colore : "#cbd2e3";
      C.fondo.setAttribute("stroke", colore);
      C.fondo.setAttribute("fill", n.tipo === "simile" ? "#fff7ed" : n.tipo === "chiarito" ? "#f0fdf4" : "#fff");
      if (s.vista === "uno") {
        const x1 = p.x < UNO.cx ? p.x + CHIP.w : p.x;
        gLinee.append(svgEl("line", { x1, y1: p.y + CHIP.h / 2, x2: UNO.cx, y2: UNO.cy, stroke: colore, "stroke-opacity": ".55", "stroke-width": 1 }));
      }
    }
    for (const [id, r] of Object.entries(SQBOX)) r.setAttribute("stroke-width", id === s.agente_aperto ? "3.5" : "2");
    gCasi.replaceChildren();
    sc.casi.forEach((c, i) => {
      const y = CASO.y0 + i * CASO.passo;
      const scelta = s.scelte[c.id];
      gCasi.append(svgEl("rect", { x: CASO.x, y, width: CASO.w, height: CASO.h, rx: 12, fill: "#fff", stroke: scelta ? "#4f46e5" : "#cbd2e3", "stroke-width": 1.5 }),
        testoSvg({ x: CASO.x + 12, y: y + 18, "font-size": 10.5, "font-weight": 800, fill: "#4f46e5" }, riempi(T.caso, { n: i + 1 })));
      aCapo(c.testo, CASO.caratteri).slice(0, 2).forEach((r, k) => gCasi.append(testoSvg({ x: CASO.x + 12, y: y + 34 + k * 14, "font-size": 10.5, fill: "#17203b" }, r)));
      if (scelta) gCasi.append(testoSvg({ x: CASO.x + CASO.w - 12, y: y + 18, "text-anchor": "end", "font-size": 10, "font-weight": 800, fill: "#4f46e5" }, sc.risposte_gioco.find((r) => r.id === scelta).nome));
    });
  }

  function disegnaDestra() {
    if (s.vista === "decidi") {
      const figli = [el("h3", {}, E.titolo_scheda)];
      if (s.verificato) {
        const v = verifica(sc, s);
        figli.push(el("div", { class: "verifica", "aria-live": "polite" },
          el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
          ...v.righe.map((r) => el("div", { class: `riga ${r.esito}` }, r.testo))));
      }
      figli.push(el("div", { class: "regola" }, E.regola));
      destra.replaceChildren(...figli);
      return;
    }
    const p = precisione(sc, s);
    const k = consiglio(sc, s);
    const classe = k === "ok" || k === "squadra" ? "ok" : k === "chiarisci" ? "avviso" : "male";
    const colore = classe === "ok" ? "#16a34a" : classe === "avviso" ? "#d97706" : "#e11d48";
    const c = costi(sc, s);
    const figli = [
      el("h3", {}, E.titolo_scheda),
      el("div", { class: "indicatore", "aria-live": "polite" },
        el("div", { class: "riga" }, el("span", {}, E.scelte_corrette), el("b", {}, riempi(T.precisione, { n: num(p.valore) }))),
        el("div", { class: "barra" }, el("span", { style: `width:${p.valore}%;background:${colore}` })),
        el("div", { class: `consiglio ${classe}` }, T[`consiglio_${k}`]),
        el("p", { class: "nota" }, T.nota_indicatore)),
      el("div", { class: "contatori" },
        el("div", { class: "riga" }, el("span", {}, E.chiamate), el("b", {}, num(c.chiamate))),
        el("div", { class: "riga" }, el("span", {}, E.tempo), el("b", {}, riempi(T.secondi, { n: num(c.secondi) }))),
        el("div", { class: "riga" }, el("span", {}, E.messaggi), el("b", {}, num(c.messaggi))),
        el("p", { class: "nota" }, T.nota_costi)),
    ];
    if (s.vista === "squadra") {
      const a = agente(s.agente_aperto);
      const elenco = sc.strumenti.filter((t) => t.agente === a.id).map((t) => t.chiaro).join(", ");
      figli.push(el("div", { class: "scheda-agente", "aria-live": "polite" },
        el("div", { class: "nome", style: `color:${a.colore}` }, a.nome),
        el("div", {}, a.ruolo),
        el("div", {}, riempi(T.strumenti_agente, { elenco })),
        el("div", {}, riempi(T.modello_agente, { modello: sc.modelli[a.modello] })),
        el("div", {}, a.scrive_crm ? T.crm_si : T.crm_no)));
    }
    figli.push(el("div", { class: "regola" }, E.regola));
    destra.replaceChildren(...figli);
    if (!ridotto && destra.animate) destra.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 220 });
  }

  function aggiornaComandi() {
    segVista.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.vista)));
    cCond.inp.value = s.condizioni; cCond.val.textContent = riempi(T.formato_valore, { n: num(s.condizioni) });
    cSov.inp.value = s.sovrapposti; cSov.val.textContent = riempi(T.formato_valore, { n: num(s.sovrapposti) });
    inChiari.checked = s.nomi_chiari;
    zonaUno.classList.toggle("nascosto", s.vista !== "uno");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaDestra(); }
  function cambia(diff, soloScheda) {
    Object.assign(s, diff);
    if (!soloScheda) s.verificato = false;
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
    for (const [k, def] of [["condizioni", sc.condizioni], ["sovrapposti", sc.sovrapposti]]) {
      if (!(nuovo[k] >= def.min && nuovo[k] <= def.max)) throw new Error(`stato_animazione: ${k} fuori scala «${nuovo[k]}»`);
    }
    if (!agente(nuovo.agente_aperto)) throw new Error(`stato_animazione: agente sconosciuto «${nuovo.agente_aperto}»`);
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
    distruggi() { /* nessun ciclo attivo: transizioni e animazioni CSS si fermano con il DOM */ },
    _prova: { stato: s, precisione: () => precisione(sc, s), consiglio: () => consiglio(sc, s), verifica: () => verifica(sc, s), posizioni: () => posizioni(sc, s) },
  };
}
