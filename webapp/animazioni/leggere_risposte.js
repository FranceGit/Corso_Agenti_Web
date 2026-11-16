// Lezione interattiva "Classificare le risposte e chiudere il ciclo" (P3.5): le risposte dei clienti a una campagna
// cadono in 5 raccoglitori (interessato, non interessato, da ricontattare, fuori sede, disiscrizione) o nel vassoio
// "a una persona". Ogni card porta i 5 tentativi del modello (precalcolati, deterministici) e il loro accordo.
// Comandi: soglia di accordo (3-5 su 5), regola fissa "la disiscrizione vince sempre", modalita' attiva / in ombra,
// gioco "Decidi tu" sui casi ambigui con riscontro spiegato. Tutti i testi arrivano dallo scenario della lezione.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "leggere_risposte";
const UMANO = "umano";
const VASSOIO = { x0: 6, passo: 119, w: 112, y: 66, h: 340, testa: 46 };
const CHIP = { w: 104, h: 44, y0: 118, fondo: 398, passoMax: 50 };
const ATTESA = { y: 10, x0: 40, passo: 166 };

const STILE = `
.lz-leggere_risposte .chip { cursor: pointer; }
.lz-leggere_risposte .chip.mobile { transition: transform .55s cubic-bezier(.2,.8,.2,1); }
.lz-leggere_risposte .chip:focus-visible rect.fondo { stroke: #4f46e5; stroke-width: 3.5; }
.lz-leggere_risposte .scheda-risposta { display: grid; gap: 8px; font-size: .86rem; }
.lz-leggere_risposte .scheda-risposta .chi { font-weight: 800; font-size: .95rem; }
.lz-leggere_risposte .scheda-risposta .azienda { color: var(--tenue); font-size: .8rem; }
.lz-leggere_risposte .scheda-risposta blockquote { margin: 0; padding: 8px 10px; border-left: 4px solid #c7d2fe; background: #f7f8fe; border-radius: 0 10px 10px 0; font-style: italic; }
.lz-leggere_risposte .tentativi { display: flex; flex-wrap: wrap; gap: 4px; }
.lz-leggere_risposte .tentativo { font-size: .72rem; font-weight: 700; padding: .15em .55em; border-radius: 999px; color: #fff; }
.lz-leggere_risposte .etichetta-piccola { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--tenue-2, #7a849e); }
.lz-leggere_risposte .decisione { padding: 7px 10px; border-radius: 10px; background: var(--primario-chiaro); color: #3730a3; font-weight: 600; }
.lz-leggere_risposte .decisione.errore { background: var(--male-chiaro); color: #9f1239; }
.lz-leggere_risposte .decisione.scoperto { background: var(--avviso-chiaro); color: #92400e; }
.lz-leggere_risposte .contatori { display: grid; gap: 10px; margin-top: 14px; }
.lz-leggere_risposte .contatore { font-size: .82rem; }
.lz-leggere_risposte .contatore .riga { display: flex; justify-content: space-between; gap: 8px; }
.lz-leggere_risposte .contatore b { font-variant-numeric: tabular-nums; }
.lz-leggere_risposte .barra { height: 9px; border-radius: 9px; background: #eef1f8; overflow: hidden; margin-top: 4px; }
.lz-leggere_risposte .barra span { display: block; height: 100%; border-radius: 9px; transition: width .5s ease; }
.lz-leggere_risposte .nota { font-size: .78rem; color: var(--tenue); margin: 4px 0 0; }
.lz-leggere_risposte .ciclo { margin-top: 12px; padding: 10px 12px; border-radius: 12px; background: linear-gradient(90deg, #ecfdf5, #eff6ff); font-size: .82rem; display: grid; gap: 4px; }
.lz-leggere_risposte .ciclo b { font-size: .86rem; }
.lz-leggere_risposte .scelta-gioco { display: grid; gap: 3px; margin: 8px 0; font-size: .82rem; }
.lz-leggere_risposte .verifica { display: grid; gap: 6px; margin-top: 10px; }
.lz-leggere_risposte .verifica .riga { font-size: .82rem; padding: 7px 10px; border-radius: 10px; }
.lz-leggere_risposte .verifica .riga.giusto { background: var(--ok-chiaro); color: #166534; }
.lz-leggere_risposte .verifica .riga.quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-leggere_risposte .verifica .riga.sbagliato, .lz-leggere_risposte .verifica .riga.vuoto { background: var(--male-chiaro); color: #9f1239; }
`;

function svgEl(tag, attr, html) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attr || {})) e.setAttribute(k, v);
  if (html) e.innerHTML = html;
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

/** Destinazioni possibili: le 5 categorie chiuse + il vassoio "a una persona". */
export function destinazioni(sc) {
  return [...sc.categorie.map((c) => c.id), UMANO];
}

/** Conta i 5 tentativi del modello: etichetta piu' votata e quanti tentativi sono d'accordo con lei. */
export function voti(sc, risposta) {
  const conteggi = Object.fromEntries(sc.categorie.map((c) => [c.id, 0]));
  for (const t of risposta.tentativi) {
    if (!(t in conteggi)) throw new Error(`risposta ${risposta.id}: tentativo con categoria sconosciuta «${t}»`);
    conteggi[t] += 1;
  }
  let maggioranza = sc.categorie[0].id;
  for (const c of sc.categorie) if (conteggi[c.id] > conteggi[maggioranza]) maggioranza = c.id;
  const pari = sc.categorie.filter((c) => conteggi[c.id] === conteggi[maggioranza]).length > 1;
  return { conteggi, maggioranza, accordo: conteggi[maggioranza], pari, diverse: Object.values(conteggi).filter((n) => n > 0).length };
}

/** Dove finisce ogni risposta con la soglia, la regola di priorita' e la modalita' scelte; contatori del compromesso. */
export function smista(sc, s) {
  const righe = sc.risposte.map((r) => {
    const v = voti(sc, r);
    let dest, motivo;
    if (s.priorita && r.disiscrizione) { dest = "disiscrizione"; motivo = "regola"; }
    else if (v.accordo >= s.soglia && !v.pari) { dest = v.maggioranza; motivo = "accordo"; }
    else { dest = UMANO; motivo = "dubbio"; }
    const errore = dest !== UMANO && dest !== r.giusta;
    const grave = errore && r.giusta === "disiscrizione";
    return { id: r.id, dest, motivo, ...v, errore, grave };
  });
  const tot = righe.length;
  const errori = righe.filter((x) => x.errore).length;
  const gravi = righe.filter((x) => x.grave).length;
  const dubbi = righe.filter((x) => x.dest === UMANO).length;
  // in ombra una persona controlla TUTTE le risposte e nessuna azione parte: gli errori si scoprono senza danni
  const umano = s.modalita === "ombra" ? tot : dubbi;
  const arrivati = s.modalita === "ombra" ? 0 : errori;
  const scoperti = s.modalita === "ombra" ? errori : 0;
  const P = sc.parametri;
  const ore = Math.round(((umano / tot) * P.risposte_giorno * P.minuti_revisione / 60) * 10) / 10;
  const per_dest = Object.fromEntries(destinazioni(sc).map((d) => [d, righe.filter((x) => x.dest === d).length]));
  return { righe, tot, errori, gravi, dubbi, umano, arrivati, scoperti, ore, per_dest };
}

/** Riscontro del gioco "Decidi tu" sulle risposte ambigue. */
export function verifica(sc, s) {
  const T = sc.testi;
  const nome = (d) => (d === UMANO ? sc.umano.nome : sc.categorie.find((c) => c.id === d).nome);
  const righe = sc.risposte.filter((r) => r.gioco).map((r) => {
    const scelta = s.scelte[r.id] || "";
    let esito;
    if (!scelta) esito = "vuoto";
    else if (scelta === r.gioco.migliore) esito = "giusto";
    else if (r.gioco.quasi.includes(scelta)) esito = "quasi";
    else esito = "sbagliato";
    const testo = riempi(T[`ver_${esito}`], { mittente: r.mittente, migliore: nome(r.gioco.migliore), spiega: r.gioco.spiega });
    return { id: r.id, esito, testo };
  });
  const giuste = righe.filter((x) => x.esito === "giusto").length;
  const sintesi = giuste === righe.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righe.length });
  return { righe, giuste, totali: righe.length, sintesi };
}

/** Posizione (x, y) di ogni card nella scena: vassoio di destinazione, o fila "da decidere" nel gioco. */
export function posizioni(sc, s) {
  const dest = destinazioni(sc);
  const visibili = s.vista === "decidi" ? sc.risposte.filter((r) => r.gioco) : sc.risposte;
  const calc = smista(sc, s);
  const dove = {};
  const inAttesa = [];
  for (const r of visibili) {
    const d = s.vista === "decidi" ? (s.scelte[r.id] || null) : calc.righe.find((x) => x.id === r.id).dest;
    if (d === null) inAttesa.push(r.id);
    else (dove[d] = dove[d] || []).push(r.id);
  }
  const pos = {};
  for (const [d, ids] of Object.entries(dove)) {
    const i = dest.indexOf(d);
    const n = ids.length;
    const passo = n <= 1 ? 0 : Math.min(CHIP.passoMax, (CHIP.fondo - CHIP.y0 - CHIP.h) / (n - 1));
    ids.forEach((id, k) => { pos[id] = { x: VASSOIO.x0 + i * VASSOIO.passo + (VASSOIO.w - CHIP.w) / 2, y: CHIP.y0 + k * passo, vassoio: d }; });
  }
  inAttesa.forEach((id, k) => { pos[id] = { x: ATTESA.x0 + k * ATTESA.passo, y: ATTESA.y, vassoio: null }; });
  return pos;
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const P = sc.parametri;
  const lingua = contesto && contesto.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante: serve per scrivere i numeri nel formato della lingua");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));
  const DEST = destinazioni(sc);
  const info = (d) => (d === UMANO ? sc.umano : sc.categorie.find((c) => c.id === d));
  const gioco = sc.risposte.filter((r) => r.gioco);
  const num = (x) => x.toLocaleString(lingua);

  const s = {
    vista: "smista",
    soglia: sc.soglia.min,
    priorita: true,
    modalita: "attiva",
    scelte: {},
    verificato: false,
    carta_aperta: sc.risposte[0].id,
  };
  let primoDisegno = true;

  // ------------------------------------------------ comandi (sinistra)
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    el("button", { "data-v": "smista", onclick: () => cambia({ vista: "smista" }) }, E.vista_smista),
    el("button", { "data-v": "decidi", onclick: () => cambia({ vista: "decidi" }) }, E.vista_decidi));
  const valoreSoglia = el("b", {});
  const inSoglia = el("input", { type: "range", min: sc.soglia.min, max: sc.soglia.max, step: sc.soglia.passo, "aria-label": sc.soglia.etichetta });
  inSoglia.addEventListener("input", () => cambia({ soglia: Number(inSoglia.value) }));
  const nodoSoglia = el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, sc.soglia.etichetta), valoreSoglia), inSoglia);
  const inPriorita = el("input", { type: "checkbox", onchange: (e) => cambia({ priorita: e.target.checked }) });
  const segModo = el("div", { class: "segmentato", role: "group", "aria-label": E.modalita },
    el("button", { "data-v": "attiva", onclick: () => cambia({ modalita: "attiva" }) }, E.attiva),
    el("button", { "data-v": "ombra", onclick: () => cambia({ modalita: "ombra" }) }, E.ombra));
  const notaModo = el("p", { class: "nota" });
  const zonaSmista = el("div", {}, nodoSoglia, el("label", { class: "interruttore" }, el("span", {}, E.priorita), inPriorita),
    el("h4", {}, E.modalita), segModo, notaModo);
  const tendine = {};
  const zonaDecidi = el("div", {}, el("p", { class: "nota" }, T.nota_decidi));
  for (const r of gioco) {
    const sel = el("select", { class: "scelta", "aria-label": riempi(T.scegli_per, { mittente: r.mittente }), onchange: (e) => scegli(r.id, e.target.value) },
      el("option", { value: "" }, E.scegli),
      ...DEST.map((d) => el("option", { value: d }, info(d).nome)));
    tendine[r.id] = sel;
    zonaDecidi.append(el("label", { class: "scelta-gioco" }, el("span", {}, `${r.mittente} — «${accorcia(r.testo, 42)}»`), sel));
  }
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => controlla() }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaSmista, zonaDecidi);

  // ------------------------------------------------ scena (centro)
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: "0 0 720 412", role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs><filter id="lr-ombra" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#17203b" flood-opacity=".14"/></filter></defs>`;
  const gTesta = svgEl("g");
  const gVassoi = svgEl("g");
  const gChip = svgEl("g");
  svg.append(gTesta, gVassoi, gChip);
  const titoloScena = testoSvg({ x: 360, y: 30, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, "");
  const legenda = testoSvg({ x: 360, y: 48, "text-anchor": "middle", "font-size": 10.5, fill: "#5b6684" }, E.legenda);
  gTesta.append(titoloScena, legenda);
  const VAS = {};
  DEST.forEach((d, i) => {
    const x = VASSOIO.x0 + i * VASSOIO.passo;
    const c = info(d);
    const g = svgEl("g");
    const fondo = svgEl("rect", { x, y: VASSOIO.y, width: VASSOIO.w, height: VASSOIO.h, rx: 14, fill: c.colore, "fill-opacity": d === UMANO ? ".1" : ".07", stroke: c.colore, "stroke-opacity": ".45", "stroke-width": 1.5, "stroke-dasharray": d === UMANO ? "5 4" : "" });
    g.append(fondo, svgEl("rect", { x, y: VASSOIO.y, width: VASSOIO.w, height: 6, rx: 3, fill: c.colore }));
    g.append(testoSvg({ x: x + VASSOIO.w / 2, y: VASSOIO.y + 24, "text-anchor": "middle", "font-size": 11.5, "font-weight": 800, fill: "#17203b" }, accorcia(c.nome, 17)));
    const azione = testoSvg({ x: x + VASSOIO.w / 2, y: VASSOIO.y + 39, "text-anchor": "middle", "font-size": 9.5, fill: c.colore, "font-weight": 700 }, "");
    const conta = testoSvg({ x: x + VASSOIO.w / 2, y: VASSOIO.y + VASSOIO.h - 8, "text-anchor": "middle", "font-size": 10, fill: "#5b6684", "font-weight": 700 }, "");
    g.append(azione, conta);
    gVassoi.append(g);
    VAS[d] = { azione, conta, fondo };
  });
  const CH = {};
  for (const r of sc.risposte) {
    const g = svgEl("g", { class: "chip", tabindex: "0", role: "button", "aria-label": riempi(T.apri_risposta, { mittente: r.mittente }) });
    const fondo = svgEl("rect", { class: "fondo", x: 0, y: 0, width: CHIP.w, height: CHIP.h, rx: 9, fill: "#fff", stroke: "#cbd2e3", "stroke-width": 1.5, filter: "url(#lr-ombra)" });
    const banda = svgEl("rect", { x: 0, y: 0, width: 5, height: CHIP.h, rx: 2.5, fill: "#cbd2e3" });
    const nome = testoSvg({ x: 11, y: 17, "font-size": 10.5, "font-weight": 800, fill: "#17203b" }, accorcia(r.mittente, 16));
    const v = voti(sc, r);
    const colore = info(v.maggioranza).colore;
    const puntini = svgEl("g");
    for (let k = 0; k < sc.tentativi_totali; k++) puntini.append(svgEl("circle", { cx: 15 + k * 10, cy: 31, r: 3.4, fill: k < v.accordo ? colore : "#e3e7f1" }));
    const regola = testoSvg({ x: CHIP.w - 9, y: 35, "text-anchor": "end", "font-size": 9, "font-weight": 800, fill: "#be123c" }, "");
    const badge = svgEl("g", { transform: `translate(${CHIP.w - 4},4)`, opacity: 0 });
    const disco = svgEl("circle", { r: 7.5, fill: "#e11d48" });
    badge.append(disco, testoSvg({ x: 0, y: 3.6, "text-anchor": "middle", "font-size": 10.5, "font-weight": 900, fill: "#fff" }, "!"));
    g.append(fondo, banda, nome, puntini, regola, badge);
    const apri = () => cambia({ carta_aperta: r.id }, true);
    g.addEventListener("click", apri);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(); } });
    gChip.append(g);
    CH[r.id] = { g, fondo, banda, regola, badge, disco };
  }
  scena.append(svg);

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  const scheda = el("div", { class: "scheda-risposta", "aria-live": "polite" });
  const contatori = el("div", { class: "contatori", "aria-live": "polite" });
  const ciclo = el("div", { class: "ciclo" });
  const zonaVerifica = el("div", { class: "verifica", "aria-live": "polite" });
  destra.append(el("h3", {}, E.titolo_scheda), scheda, zonaVerifica, contatori, ciclo);

  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno
  function disegnaScena() {
    const calc = smista(sc, s);
    const pos = posizioni(sc, s);
    titoloScena.textContent = s.vista === "decidi" ? E.titolo_decidi : E.titolo_smista;
    legenda.textContent = s.vista === "decidi" ? (Object.keys(s.scelte).length < gioco.length ? E.legenda_decidi : E.legenda) : E.legenda;
    for (const d of DEST) {
      VAS[d].azione.textContent = s.modalita === "ombra" && s.vista === "smista" ? accorcia(E.azione_sospesa, 20) : accorcia(info(d).azione_breve, 20);
      const n = Object.values(pos).filter((p) => p.vassoio === d).length;
      VAS[d].conta.textContent = n ? riempi(T.conta_vassoio, { n }) : "";
    }
    for (const r of sc.risposte) {
      const C = CH[r.id];
      const p = pos[r.id];
      if (!p) { C.g.setAttribute("display", "none"); continue; }
      C.g.removeAttribute("display");
      C.g.classList.toggle("mobile", !ridotto && !primoDisegno);
      C.g.style.transform = `translate(${p.x}px, ${p.y}px)`;
      C.g.setAttribute("transform", `translate(${p.x},${p.y})`);
      const colore = p.vassoio ? info(p.vassoio).colore : "#cbd2e3";
      C.banda.setAttribute("fill", colore);
      C.fondo.setAttribute("stroke", r.id === s.carta_aperta ? "#4f46e5" : colore);
      C.fondo.setAttribute("stroke-width", r.id === s.carta_aperta ? "3" : "1.5");
      const riga = calc.righe.find((x) => x.id === r.id);
      C.regola.textContent = s.vista === "smista" && riga.motivo === "regola" ? E.sigla_regola : "";
      const mostraErrore = s.vista === "smista" && riga.errore;
      C.badge.setAttribute("opacity", mostraErrore ? "1" : "0");
      C.disco.setAttribute("fill", s.modalita === "ombra" ? "#d97706" : "#e11d48");
    }
    primoDisegno = false;
  }

  function disegnaScheda() {
    const visibili = s.vista === "decidi" ? gioco : sc.risposte;
    const r = visibili.find((x) => x.id === s.carta_aperta) || visibili[0];
    const calc = smista(sc, s);
    const riga = calc.righe.find((x) => x.id === r.id);
    const pills = r.tentativi.map((t) => el("span", { class: "tentativo", style: `background:${info(t).colore}` }, info(t).nome));
    const figli = [
      el("div", {}, el("div", { class: "chi" }, r.mittente), el("div", { class: "azienda" }, r.azienda)),
      el("blockquote", {}, r.testo),
      el("div", { class: "etichetta-piccola" }, riempi(T.tentativi, { accordo: riga.accordo, totali: sc.tentativi_totali })),
      el("div", { class: "tentativi" }, pills),
    ];
    if (s.vista === "smista") {
      const nomeDest = info(riga.dest).nome;
      const motivo = riempi(T[`mot_${riga.motivo}`], { categoria: info(riga.maggioranza).nome, accordo: riga.accordo, soglia: s.soglia, totali: sc.tentativi_totali });
      figli.push(el("div", { class: "decisione" }, riempi(T.decisione, { destinazione: nomeDest, motivo })));
      figli.push(el("div", {}, el("span", { class: "etichetta-piccola" }, `${E.azione} `), s.modalita === "ombra" ? E.azione_sospesa_lunga : info(riga.dest).azione));
      if (riga.errore) {
        const testo = riempi(riga.grave ? T.errore_grave : T.errore, { giusta: info(r.giusta).nome });
        figli.push(el("div", { class: `decisione ${s.modalita === "ombra" ? "scoperto" : "errore"}` }, s.modalita === "ombra" ? riempi(T.errore_scoperto, { giusta: info(r.giusta).nome }) : testo));
      }
    }
    scheda.replaceChildren(...figli);
    if (!ridotto) scheda.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: 280 });
  }

  function barra(valore, totale, colore) {
    return el("div", { class: "barra" }, el("span", { style: `width:${Math.round((valore / totale) * 100)}%;background:${colore}` }));
  }

  function disegnaContatori() {
    if (s.vista === "decidi") { contatori.replaceChildren(); ciclo.classList.add("nascosto"); return; }
    const c = smista(sc, s);
    const righe = [
      el("div", { class: "contatore" },
        el("div", { class: "riga" }, el("span", {}, E.lavoro_umano), el("b", {}, riempi(T.su, { n: c.umano, tot: c.tot }))),
        barra(c.umano, c.tot, "#7c3aed"),
        el("p", { class: "nota" }, riempi(T.ore_giorno, { ore: num(c.ore), giorno: num(P.risposte_giorno) }))),
    ];
    if (s.modalita === "ombra") {
      righe.push(el("div", { class: "contatore" },
        el("div", { class: "riga" }, el("span", {}, E.errori_arrivati), el("b", {}, riempi(T.su, { n: c.arrivati, tot: c.tot }))),
        barra(c.arrivati, c.tot, "#e11d48"),
        el("p", { class: "nota" }, riempi(T.errori_scoperti, { n: c.scoperti }))));
    } else {
      righe.push(el("div", { class: "contatore" },
        el("div", { class: "riga" }, el("span", {}, E.errori_arrivati), el("b", {}, riempi(T.su, { n: c.arrivati, tot: c.tot }))),
        barra(c.arrivati, c.tot, "#e11d48"),
        c.gravi ? el("p", { class: "nota", style: "color:#9f1239;font-weight:700" }, riempi(T.errori_gravi, { n: c.gravi })) : null));
    }
    contatori.replaceChildren(...righe);
    ciclo.classList.remove("nascosto");
    const voci = sc.categorie.map((k) => `${k.nome}: ${c.per_dest[k.id]}`).join(" · ");
    ciclo.replaceChildren(
      el("b", {}, E.titolo_ciclo),
      el("div", {}, riempi(T.ciclo_crm, { voci, attesa: c.per_dest[UMANO] })),
      el("div", {}, s.modalita === "ombra" ? T.ciclo_ombra : riempi(T.ciclo_punteggio, { interessati: c.per_dest.interessato, non_interessati: c.per_dest.non_interessato })));
  }

  function disegnaVerifica() {
    if (s.vista !== "decidi" || !s.verificato) { zonaVerifica.replaceChildren(); return; }
    const v = verifica(sc, s);
    zonaVerifica.replaceChildren(
      el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
      ...v.righe.map((x) => el("div", { class: `riga ${x.esito}` }, x.testo)));
  }

  function aggiornaComandi() {
    segVista.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.vista)));
    segModo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.modalita)));
    inSoglia.value = s.soglia;
    valoreSoglia.textContent = riempi(T.formato_soglia, { n: s.soglia, totali: sc.tentativi_totali });
    inPriorita.checked = s.priorita;
    notaModo.textContent = s.modalita === "ombra" ? T.nota_ombra : T.nota_attiva;
    zonaSmista.classList.toggle("nascosto", s.vista !== "smista");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }

  function ridisegna() {
    aggiornaComandi();
    disegnaScena();
    disegnaScheda();
    disegnaVerifica();
    disegnaContatori();
  }

  // ------------------------------------------------ interazioni
  function cambia(diff, soloScheda) {
    Object.assign(s, diff);
    if (!soloScheda && !("verificato" in diff)) s.verificato = false;
    if (s.vista === "decidi" && !gioco.some((r) => r.id === s.carta_aperta)) s.carta_aperta = gioco[0].id;
    ridisegna();
  }
  function scegli(id, valore) {
    const scelte = { ...s.scelte };
    if (valore) scelte[id] = valore; else delete scelte[id];
    cambia({ scelte, carta_aperta: id });
  }
  function controlla() {
    s.verificato = true;
    disegnaVerifica();
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    nuovo.scelte = { ...(nuovo.scelte || {}) };
    for (const [id, d] of Object.entries(nuovo.scelte)) {
      if (!gioco.some((r) => r.id === id)) throw new Error(`stato_animazione: «${id}» non e' una risposta del gioco`);
      if (!DEST.includes(d)) throw new Error(`stato_animazione: destinazione sconosciuta «${d}»`);
    }
    if (!sc.risposte.some((r) => r.id === nuovo.carta_aperta)) throw new Error(`stato_animazione: carta_aperta sconosciuta «${nuovo.carta_aperta}»`);
    if (!["smista", "decidi"].includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!["attiva", "ombra"].includes(nuovo.modalita)) throw new Error(`stato_animazione: modalita sconosciuta «${nuovo.modalita}»`);
    if (!(nuovo.soglia >= sc.soglia.min && nuovo.soglia <= sc.soglia.max)) throw new Error(`stato_animazione: soglia fuori scala «${nuovo.soglia}»`);
    Object.assign(s, nuovo);
    if (s.vista === "decidi" && !gioco.some((r) => r.id === s.carta_aperta)) s.carta_aperta = gioco[0].id;
    primoDisegno = true;
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo: le transizioni CSS si fermano da sole */ },
    _prova: { stato: s, smista: () => smista(sc, s), verifica: () => verifica(sc, s), posizioni: () => posizioni(sc, s) },
  };
}
