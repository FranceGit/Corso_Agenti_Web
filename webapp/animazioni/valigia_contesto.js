// Lezione interattiva "La valigia" (P5.1, context engineering). La valigia e' la finestra di contesto (metafora del
// whitepaper Google): lo studente sceglie quali oggetti mettere (istruzioni, strumenti, esempi, scheda cliente, listino,
// risultati, storico, appunti, domanda), con tre aiuti (riassumi lo storico, togli i vecchi risultati, carica solo gli
// strumenti utili). La risposta al cliente cambia davvero in base al contenuto: pezzi mancanti, oggetti in fondo che
// sbiadiscono (context rot), valigia che non si chiude (chiamata fallita). Secondo turno: prompt engineering (cambia
// solo il foglio delle istruzioni) contro context engineering (la valigia si rifa' a ogni turno). Logica pura.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "valigia_contesto";
const VALIGIA = { x: 446, y: 104, w: 250, scala: 2.4 };
const CHIP = { x0: 12, passoX: 140, w: 128, h: 36, y0: 98, passoY: 48 };
const FAMIGLIE = ["guida", "prove", "conversazione"];
const AIUTI = ["riassunto", "togli_vecchi", "strumenti_utili"];

const STILE = `
.lz-valigia_contesto .chip { cursor: pointer; }
.lz-valigia_contesto .chip:focus-visible rect.fondo { stroke: #4f46e5; stroke-width: 3; }
.lz-valigia_contesto .blocco { transition: opacity .4s ease; }
.lz-valigia_contesto .fumetto { padding: 8px 11px; border-radius: 12px; font-size: .86rem; margin: 6px 0; }
.lz-valigia_contesto .fumetto.cliente { background: #eef1f8; border-bottom-left-radius: 3px; }
.lz-valigia_contesto .fumetto.agente { background: var(--ok-chiaro); color: #14532d; border-bottom-right-radius: 3px; }
.lz-valigia_contesto .fumetto.agente.medio { background: var(--avviso-chiaro); color: #7c2d12; }
.lz-valigia_contesto .fumetto.agente.male { background: var(--male-chiaro); color: #881337; }
.lz-valigia_contesto .chi { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--tenue-2, #7a849e); }
.lz-valigia_contesto .difetto { font-size: .8rem; color: #9f1239; margin: 2px 0; }
.lz-valigia_contesto .lancette { display: grid; gap: 8px; margin-top: 12px; }
.lz-valigia_contesto .lancetta { font-size: .8rem; }
.lz-valigia_contesto .lancetta .riga { display: flex; justify-content: space-between; }
.lz-valigia_contesto .lancetta b { font-variant-numeric: tabular-nums; }
.lz-valigia_contesto .barra { height: 8px; border-radius: 8px; background: #eef1f8; overflow: hidden; margin-top: 3px; }
.lz-valigia_contesto .barra span { display: block; height: 100%; border-radius: 8px; transition: width .45s ease; }
.lz-valigia_contesto .nota { font-size: .78rem; color: var(--tenue); margin: 6px 0 0; }
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

/** Contenuto della valigia nel turno scelto: oggetti in ordine di imballo, dimensione, inizio, sbiadito. */
export function valigia(sc, s) {
  const rifatta = s.turno === 2 && s.modo === "contesto";
  const ids = rifatta ? sc.turno2.oggetti : s.oggetti;
  const aiuti = rifatta ? Object.fromEntries(AIUTI.map((a) => [a, true])) : s;
  const blocchi = [];
  let inizio = 0;
  for (const id of sc.ordine_imballo) {
    if (!ids.includes(id)) continue;
    const o = sc.oggetti.find((x) => x.id === id);
    const ridotto = Boolean(o.ridotto && aiuti[o.ridotto.chiave]);
    const dimensione = ridotto ? o.ridotto.dimensione : o.dimensione;
    blocchi.push({ id, famiglia: o.famiglia, dimensione, ridotto, inizio });
    inizio += dimensione;
  }
  const spazio = inizio;
  const rot = spazio > sc.soglia_rot;
  for (const b of blocchi) b.sbiadito = rot && b.inizio >= sc.soglia_rot;
  return { blocchi, spazio, rot, fallita: spazio > sc.capienza, rifatta, aiuti };
}

/** Risposta dell'agente, qualita' (illustrativa), difetti e lancette. */
export function calcola(sc, s) {
  const v = valigia(sc, s);
  const c = (id) => v.blocchi.some((b) => b.id === id && !b.sbiadito);
  const P = sc.parametri;
  const difetti = [];
  let risposta;
  let qualita;
  if (v.fallita) { risposta = "fallita"; qualita = 0; }
  else if (!c("domanda")) { risposta = "senza_domanda"; qualita = 5; }
  else if (s.turno === 1) {
    if (!c("listino")) { risposta = c("istruzioni") ? "non_so" : "inventato"; qualita = c("istruzioni") ? 35 : 10; difetti.push("manca_listino"); }
    else if (!c("scheda")) { risposta = "senza_sconto"; qualita = 55; difetti.push(v.blocchi.some((b) => b.id === "scheda") ? "scheda_sbiadita" : "manca_scheda"); }
    else { risposta = "giusta"; qualita = 100; }
  } else {
    // nel secondo turno serve il calendario (tra gli strumenti) e lo storico, dove il cliente ha detto quando e' libero
    const calendario = c("strumenti") && (!v.aiuti.strumenti_utili || v.rifatta);
    const storico = c("storico");
    if (calendario && storico) { risposta = "demo_giusta"; qualita = 100; }
    else if (calendario) { risposta = "demo_mattina"; qualita = 45; difetti.push("manca_storico"); }
    else { risposta = "demo_inventata"; qualita = 15; difetti.push("manca_calendario"); if (!storico) difetti.push("manca_storico"); }
  }
  if (!v.fallita && qualita >= 45) {
    if (!c("istruzioni")) { qualita -= 10; difetti.push("manca_istruzioni"); }
    if (!c("esempi")) { qualita -= 5; difetti.push("mancano_esempi"); }
    if (v.rot) { qualita -= 10; difetti.push("rot"); }
    if (v.spazio > sc.soglia_rumore) { qualita -= 5; difetti.push("rumore"); }
  }
  qualita = Math.max(0, qualita);
  const token = v.spazio * P.token_per_unita;
  const secondi = Math.round((P.secondi_base + v.spazio * P.secondi_per_unita) * 10) / 10;
  const percento = Math.round((v.spazio / sc.capienza) * 100);
  const obiettivo = s.turno === 1 && qualita >= sc.obiettivo.qualita_min && percento <= sc.obiettivo.spazio_max;
  return { ...v, risposta, qualita, difetti, token, secondi, percento, obiettivo };
}

/** Posizioni dei blocchi nella valigia (dall'alto verso il fondo) e dei pezzi fuori: dentro 720 x 412. */
export function posizioni(sc, s) {
  const v = valigia(sc, s);
  const blocchi = v.blocchi.map((b) => ({ id: b.id, x: VALIGIA.x + 8, y: VALIGIA.y + b.inizio * VALIGIA.scala, w: VALIGIA.w - 16, h: b.dimensione * VALIGIA.scala }));
  const chip = {};
  for (const f of FAMIGLIE) {
    sc.oggetti.filter((o) => o.famiglia === f).forEach((o, k) => {
      chip[o.id] = { x: CHIP.x0 + FAMIGLIE.indexOf(f) * CHIP.passoX, y: CHIP.y0 + k * CHIP.passoY, w: CHIP.w, h: CHIP.h };
    });
  }
  return { blocchi, chip, fondo: VALIGIA.y + sc.capienza * VALIGIA.scala };
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
  const ogg = (id) => sc.oggetti.find((o) => o.id === id);

  const s = { oggetti: [], riassunto: false, togli_vecchi: false, strumenti_utili: false, modo: "contesto", turno: 1, obiettivo: false };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const inAiuti = {};
  const zonaAiuti = el("div", {});
  for (const a of AIUTI) {
    inAiuti[a] = el("input", { type: "checkbox", onchange: (e) => cambia({ [a]: e.target.checked }) });
    zonaAiuti.append(el("label", { class: "interruttore" }, el("span", {}, E[`aiuto_${a}`]), inAiuti[a]));
  }
  const segTurno = el("div", { class: "segmentato", role: "group", "aria-label": E.turno },
    el("button", { "data-v": "1", onclick: () => cambia({ turno: 1 }) }, E.turno_1),
    el("button", { "data-v": "2", onclick: () => cambia({ turno: 2 }) }, E.turno_2));
  const segModo = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.modo },
    el("button", { "data-v": "prompt", onclick: () => cambia({ modo: "prompt" }) }, E.modo_prompt),
    el("button", { "data-v": "contesto", onclick: () => cambia({ modo: "contesto" }) }, E.modo_contesto));
  const notaModo = el("p", { class: "nota" });
  const svuota = el("button", { class: "btn", style: "margin-top:10px;width:100%;justify-content:center", onclick: () => cambia({ oggetti: [] }) }, E.svuota);
  comandi.append(el("h3", {}, E.titolo_comandi), el("p", { class: "nota" }, T.nota_clic), el("h4", {}, E.aiuti), zonaAiuti,
    el("h4", {}, E.turno), segTurno, el("h4", {}, E.modo), segModo, notaModo, svuota);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: "0 0 720 412", role: "img", "aria-label": E.descrizione_scena });
  const gFisso = svgEl("g");
  const gChip = svgEl("g");
  const gValigia = svgEl("g");
  svg.append(gFisso, gChip, gValigia);
  gFisso.append(testoSvg({ x: 200, y: 30, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, E.fuori));
  const titoloValigia = testoSvg({ x: VALIGIA.x + VALIGIA.w / 2, y: 30, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, "");
  gFisso.append(titoloValigia);
  FAMIGLIE.forEach((f, i) => {
    gFisso.append(testoSvg({ x: CHIP.x0 + i * CHIP.passoX + CHIP.w / 2, y: 80, "text-anchor": "middle", "font-size": 10.5, "font-weight": 800, fill: sc.famiglie[f].colore }, sc.famiglie[f].nome));
  });
  const fondo = VALIGIA.y + sc.capienza * VALIGIA.scala;
  gFisso.append(svgEl("rect", { x: VALIGIA.x, y: VALIGIA.y - 4, width: VALIGIA.w, height: fondo - VALIGIA.y + 8, rx: 16, fill: "#fbf7f0", stroke: "#a16207", "stroke-width": 3 }));
  gFisso.append(svgEl("rect", { x: VALIGIA.x + VALIGIA.w / 2 - 30, y: VALIGIA.y - 22, width: 60, height: 16, rx: 7, fill: "none", stroke: "#a16207", "stroke-width": 3 }));
  const yRot = VALIGIA.y + sc.soglia_rot * VALIGIA.scala;
  gFisso.append(svgEl("line", { x1: VALIGIA.x - 6, y1: yRot, x2: VALIGIA.x + VALIGIA.w + 6, y2: yRot, stroke: "#d97706", "stroke-dasharray": "5 4", "stroke-width": 1.5 }));
  gFisso.append(testoSvg({ x: VALIGIA.x - 10, y: yRot + 4, "text-anchor": "end", "font-size": 9, fill: "#b45309", "font-weight": 700 }, E.linea_attenzione));
  const CH = {};
  for (const o of sc.oggetti) {
    const g = svgEl("g", { class: "chip", tabindex: "0", role: "button" });
    const r = svgEl("rect", { class: "fondo", width: CHIP.w, height: CHIP.h, rx: 9, "stroke-width": 1.6 });
    const nome = testoSvg({ x: 9, y: 15, "font-size": 10, "font-weight": 800, fill: "#17203b" }, "");
    const info = testoSvg({ x: 9, y: 29, "font-size": 9, fill: "#5b6684" }, "");
    g.append(r, nome, info);
    const tocca = () => alterna(o.id);
    g.addEventListener("click", tocca);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tocca(); } });
    gChip.append(g);
    CH[o.id] = { g, r, nome, info };
  }
  scena.append(svg);

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  const dialogo = el("div", { "aria-live": "polite" });
  const lancette = el("div", { class: "lancette" });
  const zonaObiettivo = el("div", {});
  destra.append(el("h3", {}, E.titolo_scheda), dialogo, zonaObiettivo, lancette, el("p", { class: "nota" }, T.nota_illustrativi));
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  function nomeOggetto(id, ridottoFlag) {
    const o = ogg(id);
    if (id === "domanda" && s.turno === 2) return o.nome_turno2;
    return ridottoFlag ? o.ridotto.nome : o.nome;
  }

  function disegnaScena() {
    const c = calcola(sc, s);
    const pos = posizioni(sc, s);
    titoloValigia.textContent = c.rifatta ? E.valigia_rifatta : E.valigia;
    for (const o of sc.oggetti) {
      const C = CH[o.id];
      const p = pos.chip[o.id];
      const dentro = s.oggetti.includes(o.id);
      const col = sc.famiglie[o.famiglia].colore;
      C.g.setAttribute("transform", `translate(${p.x},${p.y})`);
      C.g.setAttribute("aria-label", riempi(dentro ? T.togli : T.metti, { nome: nomeOggetto(o.id, false) }));
      C.r.setAttribute("fill", dentro ? col : "#ffffff");
      C.r.setAttribute("fill-opacity", dentro ? ".16" : "1");
      C.r.setAttribute("stroke", col);
      C.r.setAttribute("stroke-dasharray", dentro ? "" : "4 3");
      C.nome.textContent = accorcia(nomeOggetto(o.id, false), 21);
      const rid = o.ridotto && s[o.ridotto.chiave];
      C.info.textContent = riempi(dentro ? T.chip_dentro : T.chip_fuori, { n: rid ? o.ridotto.dimensione : o.dimensione });
    }
    const figli = [];
    c.blocchi.forEach((b, i) => {
      const P = pos.blocchi[i];
      const col = sc.famiglie[b.famiglia].colore;
      const oltre = b.inizio + b.dimensione > sc.capienza;
      const g = svgEl("g", { class: "blocco", opacity: b.sbiadito ? ".3" : "1" });
      g.append(svgEl("rect", { x: P.x, y: P.y + 0.6, width: P.w, height: Math.max(1, P.h - 1.2), rx: 4, fill: col, "fill-opacity": oltre ? ".45" : ".85", stroke: oltre ? "#e11d48" : "#fff", "stroke-width": oltre ? 2 : 1 }));
      if (P.h >= 11) g.append(testoSvg({ x: P.x + 8, y: P.y + Math.min(P.h / 2 + 4, 15), "font-size": 9.5, "font-weight": 700, fill: "#fff" }, accorcia(nomeOggetto(b.id, b.ridotto), 34)));
      figli.push(g);
    });
    figli.push(testoSvg({ x: VALIGIA.x + VALIGIA.w / 2, y: Math.min(406, fondo + 20), "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: c.fallita ? "#e11d48" : "#5b6684" }, c.fallita ? E.non_chiude : riempi(T.spazio_valigia, { p: c.percento })));
    gValigia.replaceChildren(...figli);
  }

  function lancetta(nome, valore, testo, colore) {
    return el("div", { class: "lancetta" }, el("div", { class: "riga" }, el("span", {}, nome), el("b", {}, testo)),
      el("div", { class: "barra" }, el("span", { style: `width:${Math.min(100, Math.max(0, valore))}%;background:${colore}` })));
  }

  function disegnaDestra() {
    const c = calcola(sc, s);
    const classe = c.qualita >= 80 ? "" : c.qualita >= 40 ? "medio" : "male";
    dialogo.replaceChildren(
      el("div", { class: "chi" }, E.cliente),
      el("div", { class: "fumetto cliente" }, s.turno === 1 ? T.domanda_1 : T.domanda_2),
      el("div", { class: "chi" }, E.agente),
      el("div", { class: `fumetto agente ${classe}` }, T[`r_${c.risposta}`]),
      ...c.difetti.map((d) => el("div", { class: "difetto" }, `• ${T[`d_${d}`]}`)));
    if (!ridotto) dialogo.lastElementChild && dialogo.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 250 });
    lancette.replaceChildren(
      lancetta(E.l_spazio, c.percento, `${c.percento}%`, c.fallita ? "#e11d48" : "#a16207"),
      lancetta(E.l_costo, (c.token / (sc.capienza * sc.parametri.token_per_unita * 1.25)) * 100, riempi(T.token, { n: num(c.token) }), "#7c3aed"),
      lancetta(E.l_tempo, (c.secondi / 8) * 100, riempi(T.secondi, { n: num(c.secondi) }), "#0ea5e9"),
      lancetta(E.l_qualita, c.qualita, `${c.qualita}/100`, c.qualita >= 80 ? "#16a34a" : c.qualita >= 40 ? "#d97706" : "#e11d48"));
    if (s.obiettivo) {
      const testo = c.obiettivo ? T.obiettivo_ok : s.turno === 2 ? T.obiettivo_turno : riempi(T.obiettivo_invito, { q: sc.obiettivo.qualita_min, p: sc.obiettivo.spazio_max });
      zonaObiettivo.replaceChildren(el("div", { class: `esito-scheda ${c.obiettivo ? "ok" : "neutro"}` }, el("div", {}, testo)));
    } else zonaObiettivo.replaceChildren();
  }

  function aggiornaComandi() {
    const premi = (seg, v) => seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === String(v))));
    premi(segTurno, s.turno); premi(segModo, s.modo);
    for (const a of AIUTI) inAiuti[a].checked = s[a];
    notaModo.textContent = s.turno === 1 ? T.nota_turno1 : s.modo === "contesto" ? T.nota_contesto : T.nota_prompt;
  }

  function ridisegna() {
    aggiornaComandi();
    disegnaScena();
    disegnaDestra();
  }
  function cambia(diff) {
    Object.assign(s, diff);
    ridisegna();
  }
  function alterna(id) {
    const oggetti = s.oggetti.includes(id) ? s.oggetti.filter((x) => x !== id) : [...s.oggetti, id];
    cambia({ oggetti });
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    if (!Array.isArray(nuovo.oggetti)) throw new Error("stato_animazione: oggetti deve essere un elenco");
    for (const id of nuovo.oggetti) if (!sc.oggetti.some((o) => o.id === id)) throw new Error(`stato_animazione: oggetto sconosciuto «${id}»`);
    if (![1, 2].includes(nuovo.turno)) throw new Error(`stato_animazione: turno «${nuovo.turno}» non previsto`);
    if (!["prompt", "contesto"].includes(nuovo.modo)) throw new Error(`stato_animazione: modo sconosciuto «${nuovo.modo}»`);
    for (const a of [...AIUTI, "obiettivo"]) if (typeof nuovo[a] !== "boolean") throw new Error(`stato_animazione: ${a} deve essere vero o falso`);
    Object.assign(s, nuovo, { oggetti: [...nuovo.oggetti] });
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo */ },
    _prova: { stato: s, calcola: () => calcola(sc, s), posizioni: () => posizioni(sc, s) },
  };
}
