// Lezione interattiva "Perche' valutare un agente e' diverso" (P7.1): lo stesso compito CRM lanciato piu' volte
// prende strade diverse su una mappa di strumenti. Comandi: numero di esecuzioni (non determinismo), valutazione
// del solo risultato o anche della strada (traiettoria), le quattro lenti della qualita' (efficacia, efficienza,
// robustezza, sicurezza: versione del cap. 1 del whitepaper Google sulla qualita'), gioco "Decidi tu" sui verdetti,
// scena "200 OK" con scatola nera / scatola di vetro (metodo dall'esterno all'interno). Testi tutti dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "cinque_strade";
const VB = { w: 720, h: 400 };
const NODO = { w: 100, h: 34 };
const SCARTO = 4;
const GIRO = { r: 9, dy: 27 };
const VETRO = { x: 40, y: 58, w: 640, h: 330, tile: { y: 78, h: 58, w: 190, x0: 60, passo: 205 }, passi: { y: 196, h: 96, w: 140, x0: 55, passo: 155 }, coperchio: { y: 170, h: 200 } };

const STILE = `
.lz-cinque_strade .strada { transition: opacity .35s ease, stroke-width .25s ease; }
.lz-cinque_strade .nodo-passo { cursor: pointer; }
.lz-cinque_strade .nodo-passo:focus-visible rect { stroke: #4f46e5; stroke-width: 3.5; }
.lz-cinque_strade .coperchio { transition: opacity .5s ease; }
.lz-cinque_strade .lista-strade { display: grid; gap: 6px; }
.lz-cinque_strade .voce-strada { display: grid; gap: 4px; padding: 7px 9px; border-radius: 10px; border: 1.5px solid #e3e7f1; background: #fff; cursor: pointer; text-align: left; font: inherit; }
.lz-cinque_strade .voce-strada.aperta { border-color: #4f46e5; }
.lz-cinque_strade .voce-strada .testa { display: flex; justify-content: space-between; gap: 6px; font-size: .82rem; font-weight: 700; }
.lz-cinque_strade .pill { font-size: .7rem; font-weight: 700; padding: .12em .55em; border-radius: 999px; color: #fff; white-space: nowrap; }
.lz-cinque_strade .lenti-strada { display: flex; flex-wrap: wrap; gap: 3px; }
.lz-cinque_strade .lente { font-size: .66rem; padding: .1em .45em; border-radius: 6px; background: #eef1f8; color: #5b6684; }
.lz-cinque_strade .lente.ok { background: var(--ok-chiaro); color: #166534; }
.lz-cinque_strade .lente.no { background: var(--male-chiaro); color: #9f1239; }
.lz-cinque_strade .nota { font-size: .78rem; color: var(--tenue); margin: 4px 0 0; }
.lz-cinque_strade .scheda { font-size: .84rem; display: grid; gap: 6px; margin-bottom: 10px; }
.lz-cinque_strade .scheda blockquote { margin: 0; padding: 8px 10px; border-left: 4px solid #c7d2fe; background: #f7f8fe; border-radius: 0 10px 10px 0; font-style: italic; }
.lz-cinque_strade .riquadro { padding: 7px 10px; border-radius: 10px; font-size: .82rem; }
.lz-cinque_strade .riquadro.ok { background: var(--ok-chiaro); color: #166534; }
.lz-cinque_strade .riquadro.male { background: var(--male-chiaro); color: #9f1239; }
.lz-cinque_strade .riquadro.avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-cinque_strade .riquadro.neutro { background: var(--primario-chiaro); color: #3730a3; }
.lz-cinque_strade .scelta-gioco { display: grid; gap: 3px; margin: 6px 0; font-size: .82rem; }
.lz-cinque_strade .verifica { display: grid; gap: 6px; margin-top: 10px; }
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

/** Percorsi mostrati: i primi n lanci, nell'ordine dello scenario (il primo lancio e' quello "fortunato"). */
export function visibili(sc, s) {
  return sc.ordine_esecuzioni.slice(0, s.esecuzioni).map((id) => sc.percorsi.find((p) => p.id === id));
}

/** Esito di un percorso per ciascuna delle quattro lenti. */
export function esitiLenti(sc, p) {
  const nodo = (id) => sc.nodi.find((n) => n.id === id);
  const arrivo = nodo(p.sequenza.at(-1));
  return {
    efficacia: !p.fermo && p.risultato === "giusto" && arrivo.tipo === "traguardo",
    efficienza: p.passi <= sc.parametri.passi_massimi_efficienti,
    robustezza: !p.fermo,
    sicurezza: !p.sequenza.some((id) => nodo(id).tipo === "rischioso"),
  };
}

/** Lenti usate per il giudizio: solo l'efficacia se si guarda il risultato, altrimenti quelle accese. */
export function lentiAttive(sc, s) {
  if (s.valuta === "risultato") return ["efficacia"];
  return sc.lenti.map((l) => l.id).filter((id) => s.lenti.includes(id));
}

/** Verdetto di ogni percorso visibile con le lenti attive. */
export function valuta(sc, s) {
  const attive = lentiAttive(sc, s);
  const righe = visibili(sc, s).map((p) => {
    const e = esitiLenti(sc, p);
    const boccia = (id) => attive.includes(id) && !e[id];
    let verdetto = "promosso";
    if (boccia("sicurezza")) verdetto = "rischioso";
    else if (boccia("efficacia") || boccia("robustezza")) verdetto = "fallito";
    else if (boccia("efficienza")) verdetto = "inefficiente";
    return { id: p.id, esiti: e, verdetto, verde: verdetto === "promosso" };
  });
  return { righe, attive, verdi: righe.filter((r) => r.verde).length, tot: righe.length };
}

/** Riscontro del gioco "Decidi tu" sui verdetti dei cinque percorsi. */
export function verifica(sc, s) {
  const T = sc.testi;
  const nome = (v) => sc.verdetti.find((x) => x.id === v).nome;
  const righe = sc.ordine_esecuzioni.map((id) => {
    const g = sc.gioco[id];
    const scelta = s.scelte[id] || "";
    const esito = !scelta ? "vuoto" : scelta === g.migliore ? "giusto" : "sbagliato";
    return { id, esito, testo: riempi(T[`ver_${esito}`], { id, migliore: nome(g.migliore), spiega: g.spiega }) };
  });
  const giuste = righe.filter((r) => r.esito === "giusto").length;
  return { righe, giuste, totali: righe.length, sintesi: giuste === righe.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righe.length }) };
}

/** Scena "200 OK": che cosa si vede con la scatola nera o di vetro e con il passo scelto. */
export function esaminaVetro(sc, s) {
  const V = sc.vetro;
  const aperta = s.scatola === "vetro";
  const passo = aperta ? V.passi.find((p) => p.id === s.passo_vetro) || null : null;
  const trovato = !!(passo && passo.colpevole);
  let testo;
  if (!aperta) testo = sc.testi.vetro_nera;
  else if (!passo) testo = sc.testi.vetro_invito;
  else testo = riempi(trovato ? sc.testi.vetro_trovato : sc.testi.vetro_non_qui, { strumento: passo.strumento, spiega: passo.spiega });
  return { aperta, passo, trovato, testo };
}

/** Punti della polilinea di un percorso (con uno scarto verticale per lancio, per non sovrapporre le strade). */
export function puntiPercorso(sc, p, k) {
  const dy = (k - 2) * SCARTO;
  return p.sequenza.map((id) => { const n = sc.nodi.find((x) => x.id === id); return { x: n.x, y: n.y + dy }; });
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
  const P = (id) => sc.percorsi.find((p) => p.id === id);
  const verd = (id) => sc.verdetti.find((v) => v.id === id);
  const nomeLente = (id) => sc.lenti.find((l) => l.id === id).nome;

  const s = { vista: "strade", esecuzioni: sc.esecuzioni.min, valuta: "risultato", lenti: ["efficacia"], scatola: "nera", scelte: {}, verificato: false, percorso_aperto: sc.ordine_esecuzioni[0], passo_vetro: "" };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const seg = (chiave, voci, etichetta) => el("div", { class: "segmentato", role: "group", "aria-label": etichetta },
    ...voci.map(([v, t]) => el("button", { "data-v": v, onclick: () => cambia({ [chiave]: v }) }, t)));
  const segVista = seg("vista", [["strade", E.vista_strade], ["decidi", E.vista_decidi], ["vetro", E.vista_vetro]], E.vista);
  const valEsec = el("b", {});
  const inEsec = el("input", { type: "range", min: sc.esecuzioni.min, max: sc.esecuzioni.max, step: sc.esecuzioni.passo, "aria-label": sc.esecuzioni.etichetta });
  inEsec.addEventListener("input", () => cambia({ esecuzioni: Number(inEsec.value) }));
  const segValuta = seg("valuta", [["risultato", E.risultato], ["traiettoria", E.traiettoria]], E.valuta);
  const caselle = {};
  const zonaLenti = el("div", {});
  for (const l of sc.lenti) {
    const c = el("input", { type: "checkbox", onchange: (e) => {
      const lenti = sc.lenti.map((x) => x.id).filter((id) => (id === l.id ? e.target.checked : s.lenti.includes(id)));
      cambia({ lenti });
    } });
    caselle[l.id] = c;
    zonaLenti.append(el("label", { class: "interruttore", title: l.domanda }, el("span", {}, l.nome), c));
  }
  const zonaStrade = el("div", {}, el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, sc.esecuzioni.etichetta), valEsec), inEsec),
    el("h4", {}, E.valuta), segValuta, el("h4", {}, E.lenti), zonaLenti);
  const tendine = {};
  const zonaDecidi = el("div", {});
  for (const id of sc.ordine_esecuzioni) {
    const sel = el("select", { "aria-label": riempi(T.scegli_per, { id }), onchange: (e) => scegli(id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.verdetti.map((v) => el("option", { value: v.id }, v.nome)));
    tendine[id] = sel;
    zonaDecidi.append(el("label", { class: "scelta-gioco" }, el("span", {}, `${id} — ${P(id).descrizione}`), sel));
  }
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => { s.verificato = true; disegnaDestra(); } }, E.controlla));
  const segScatola = seg("scatola", [["nera", E.nera], ["vetro", E.di_vetro]], E.scatola);
  const zonaVetro = el("div", {}, el("h4", {}, E.scatola), segScatola);
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaStrade, zonaDecidi, zonaVetro);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${VB.w} ${VB.h}`, role: "img", "aria-label": E.descrizione_scena });
  const gMappa = svgEl("g");
  const gVetro = svgEl("g");
  svg.append(gMappa, gVetro);
  const titolo = testoSvg({ x: VB.w / 2, y: 24, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, E.titolo_mappa);
  const legenda = testoSvg({ x: VB.w / 2, y: 42, "text-anchor": "middle", "font-size": 10.5, fill: "#5b6684" }, E.legenda);
  const compito = testoSvg({ x: VB.w / 2, y: 384, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "#17203b" }, sc.compito);
  const gStrade = svgEl("g");
  const gNodi = svgEl("g");
  const gSegni = svgEl("g");
  gMappa.append(titolo, legenda, gStrade, gNodi, gSegni, compito);
  for (const n of sc.nodi) {
    const g = svgEl("g", { transform: `translate(${n.x - NODO.w / 2},${n.y - NODO.h / 2})` });
    const colori = { partenza: ["#eef2ff", "#4f46e5"], strumento: ["#fff", "#94a3b8"], rischioso: ["#fff1f2", "#e11d48"], traguardo: ["#ecfdf5", "#16a34a"], sbagliato: ["#f5f3ff", "#7c3aed"] }[n.tipo];
    g.append(svgEl("rect", { width: NODO.w, height: NODO.h, rx: 10, fill: colori[0], stroke: colori[1], "stroke-width": 1.6, "stroke-dasharray": n.tipo === "rischioso" ? "5 3" : "" }));
    g.append(testoSvg({ x: NODO.w / 2, y: NODO.h / 2 + 3.5, "text-anchor": "middle", "font-size": 9.5, "font-weight": 700, fill: "#17203b" }, n.nome));
    gNodi.append(g);
  }
  const STR = {};
  sc.percorsi.forEach((p) => {
    const linea = svgEl("polyline", { class: "strada", fill: "none", stroke: p.colore, "stroke-width": 2.5, "stroke-linejoin": "round", "stroke-linecap": "round" });
    const giri = svgEl("g");
    gStrade.append(linea, giri);
    STR[p.id] = { linea, giri };
  });

  // scena "200 OK"
  const coperchioTesto = testoSvg({ x: VB.w / 2, y: VETRO.coperchio.y + VETRO.coperchio.h / 2, "text-anchor": "middle", "font-size": 30, "font-weight": 900, fill: "#e5e7eb" }, "?");
  gVetro.append(svgEl("rect", { x: VETRO.x, y: VETRO.y, width: VETRO.w, height: VETRO.h, rx: 16, fill: "#f8fafc", stroke: "#334155", "stroke-width": 2 }));
  gVetro.append(testoSvg({ x: VB.w / 2, y: 24, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, E.titolo_cruscotto));
  sc.vetro.cruscotto.forEach((c, i) => {
    const x = VETRO.tile.x0 + i * VETRO.tile.passo;
    gVetro.append(svgEl("rect", { x, y: VETRO.tile.y, width: VETRO.tile.w, height: VETRO.tile.h, rx: 10, fill: "#ecfdf5", stroke: "#16a34a" }));
    gVetro.append(testoSvg({ x: x + 12, y: VETRO.tile.y + 20, "font-size": 10, "font-weight": 700, fill: "#166534" }, c.nome));
    gVetro.append(testoSvg({ x: x + 12, y: VETRO.tile.y + 44, "font-size": 15, "font-weight": 800, fill: "#14532d" }, c.valore));
  });
  gVetro.append(testoSvg({ x: VETRO.x + 20, y: VETRO.passi.y - 12, "font-size": 10.5, "font-weight": 800, fill: "#475569", "letter-spacing": ".05em" }, E.titolo_passi));
  const PV = {};
  sc.vetro.passi.forEach((p, i) => {
    const x = VETRO.passi.x0 + i * VETRO.passi.passo;
    const g = svgEl("g", { class: "nodo-passo", tabindex: "0", role: "button", "aria-label": riempi(T.apri_passo, { strumento: p.strumento }) });
    const r = svgEl("rect", { x, y: VETRO.passi.y, width: VETRO.passi.w, height: VETRO.passi.h, rx: 12, fill: "#fff", stroke: "#94a3b8", "stroke-width": 1.6 });
    g.append(r, testoSvg({ x: x + VETRO.passi.w / 2, y: VETRO.passi.y + 34, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#17203b" }, p.strumento));
    g.append(testoSvg({ x: x + VETRO.passi.w / 2, y: VETRO.passi.y + 60, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "#16a34a" }, p.esito));
    if (i < sc.vetro.passi.length - 1) gVetro.append(svgEl("path", { d: `M${x + VETRO.passi.w + 3} ${VETRO.passi.y + VETRO.passi.h / 2} h ${VETRO.passi.passo - VETRO.passi.w - 6}`, stroke: "#94a3b8", "stroke-width": 2 }));
    const apri = () => { if (s.scatola === "vetro") cambia({ passo_vetro: p.id }); };
    g.addEventListener("click", apri);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(); } });
    gVetro.append(g);
    PV[p.id] = r;
  });
  const coperchio = svgEl("g", { class: "coperchio" });
  coperchio.append(svgEl("rect", { x: VETRO.x + 10, y: VETRO.coperchio.y, width: VETRO.w - 20, height: VETRO.coperchio.h, rx: 12, fill: "#1f2937" }), coperchioTesto);
  gVetro.append(coperchio);
  scena.append(svg);

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  const titoloDestra = el("h3", {});
  const corpoDestra = el("div", { "aria-live": "polite" });
  destra.append(titoloDestra, corpoDestra);
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno
  function disegnaMappa() {
    const ris = valuta(sc, s);
    const vis = visibili(sc, s).map((p) => p.id);
    gSegni.replaceChildren();
    sc.percorsi.forEach((p) => {
      const k = sc.ordine_esecuzioni.indexOf(p.id);
      const { linea, giri } = STR[p.id];
      const mostra = vis.includes(p.id);
      linea.setAttribute("display", mostra ? "inline" : "none");
      giri.setAttribute("display", mostra ? "inline" : "none");
      if (!mostra) return;
      const pts = puntiPercorso(sc, p, k);
      linea.setAttribute("points", pts.map((q) => `${q.x},${q.y}`).join(" "));
      const r = ris.righe.find((x) => x.id === p.id);
      const giudicato = s.vista === "strade";
      linea.setAttribute("stroke-dasharray", giudicato && !r.verde ? "6 5" : "");
      linea.setAttribute("opacity", giudicato && !r.verde ? ".45" : "1");
      linea.setAttribute("stroke-width", p.id === s.percorso_aperto ? "5" : "2.5");
      giri.replaceChildren(...p.giri.map((id) => {
        const n = sc.nodi.find((x) => x.id === id);
        return svgEl("circle", { cx: n.x + (k - 2) * SCARTO, cy: n.y - GIRO.dy, r: GIRO.r, fill: "none", stroke: p.colore, "stroke-width": 2 });
      }));
      const fine = pts.at(-1);
      const dx = p.fermo ? NODO.w / 2 + 12 : NODO.w / 2 + 2;
      const cx = Math.min(VB.w - 9, fine.x + (p.fermo ? dx : -dx + 10 + k * 15));
      const cy = p.fermo ? fine.y : fine.y + NODO.h / 2 + 10;
      const colore = giudicato ? verd(r.verdetto).colore : p.colore;
      gSegni.append(svgEl("circle", { cx, cy, r: 8, fill: colore }), testoSvg({ x: cx, y: cy + 3.5, "text-anchor": "middle", "font-size": 9.5, "font-weight": 900, fill: "#fff" }, p.id));
      if (p.fermo) gSegni.append(testoSvg({ x: cx, y: cy - 12, "text-anchor": "middle", "font-size": 9, "font-weight": 800, fill: "#64748b" }, E.fermo));
    });
  }

  function disegnaVetro() {
    const v = esaminaVetro(sc, s);
    coperchio.setAttribute("opacity", v.aperta ? "0" : "1");
    coperchio.style.pointerEvents = v.aperta ? "none" : "auto";
    for (const p of sc.vetro.passi) {
      const scelto = v.passo && v.passo.id === p.id;
      PV[p.id].setAttribute("stroke", scelto ? (p.colpevole ? "#e11d48" : "#d97706") : "#94a3b8");
      PV[p.id].setAttribute("stroke-width", scelto ? "3.5" : "1.6");
      PV[p.id].setAttribute("fill", scelto && p.colpevole ? "#fff1f2" : "#fff");
    }
  }

  function voceStrada(r) {
    const p = P(r.id);
    const attive = lentiAttive(sc, s);
    const lenti = sc.lenti.map((l) => {
      const accesa = attive.includes(l.id);
      const cls = !accesa ? "lente" : r.esiti[l.id] ? "lente ok" : "lente no";
      const mod = !accesa ? T.spenta_lente : r.esiti[l.id] ? T.promosso_lente : T.bocciato_lente;
      return el("span", { class: cls, title: riempi(mod, { lente: l.nome }) }, l.nome);
    });
    const v = verd(r.verdetto);
    return el("button", { class: `voce-strada${r.id === s.percorso_aperto ? " aperta" : ""}`, "aria-label": riempi(T.apri_percorso, { id: r.id }), onclick: () => cambia({ percorso_aperto: r.id }, true) },
      el("div", { class: "testa" }, el("span", { style: `color:${p.colore}` }, riempi(T.lancio, { n: sc.ordine_esecuzioni.indexOf(r.id) + 1 }) + ` · ${r.id}`), el("span", { class: "pill", style: `background:${v.colore}` }, v.nome)),
      el("div", { class: "lenti-strada" }, lenti));
  }

  function disegnaDestra() {
    if (s.vista === "vetro") {
      const v = esaminaVetro(sc, s);
      titoloDestra.textContent = E.titolo_bozza;
      const figli = [el("div", { class: "scheda" }, el("blockquote", {}, sc.vetro.bozza), el("div", { class: "riquadro ok" }, E.risultato_ok)),
        el("div", { class: `riquadro ${v.trovato ? "ok" : v.passo ? "avviso" : "neutro"}` }, v.testo)];
      if (v.passo) figli.splice(1, 0, el("div", { class: "riquadro neutro" }, v.passo.testo));
      if (v.trovato) figli.push(el("div", { class: "riquadro male", style: "margin-top:6px" }, sc.vetro.verita));
      corpoDestra.replaceChildren(...figli);
      return;
    }
    titoloDestra.textContent = E.titolo_scheda;
    const aperto = P(s.percorso_aperto);
    const scheda = el("div", { class: "scheda" },
      el("b", { style: `color:${aperto.colore}` }, `${aperto.id} — ${aperto.descrizione}`),
      el("span", { class: "nota" }, riempi(T.passi, { passi: aperto.passi, fallite: aperto.fallite, autocorrezioni: aperto.autocorrezioni })));
    if (s.vista === "decidi") {
      const figli = [scheda];
      if (s.verificato) {
        const v = verifica(sc, s);
        figli.push(el("div", { class: "verifica" }, el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
          ...v.righe.map((x) => el("div", { class: `riquadro ${x.esito === "giusto" ? "ok" : "male"}` }, x.testo))));
      }
      corpoDestra.replaceChildren(...figli);
      return;
    }
    const ris = valuta(sc, s);
    const figli = [scheda, el("div", { class: "riquadro neutro" }, riempi(T.verde, { n: ris.verdi, tot: ris.tot })),
      el("div", { class: "lista-strade", style: "margin-top:8px" }, ris.righe.map(voceStrada))];
    if (s.esecuzioni === 1) figli.push(el("p", { class: "nota" }, T.solo_uno));
    if (s.valuta === "risultato") figli.push(el("p", { class: "nota" }, T.nota_risultato));
    if (ris.righe.some((r) => r.verdetto === "rischioso")) figli.push(el("p", { class: "nota", style: "color:#9f1239;font-weight:700" }, T.nota_cancello));
    corpoDestra.replaceChildren(...figli);
    if (!ridotto) corpoDestra.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 250 });
  }

  function aggiornaComandi() {
    for (const [g, k] of [[segVista, "vista"], [segValuta, "valuta"], [segScatola, "scatola"]]) g.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s[k])));
    inEsec.value = s.esecuzioni;
    valEsec.textContent = String(s.esecuzioni);
    for (const [id, c] of Object.entries(caselle)) { c.checked = s.lenti.includes(id); c.disabled = s.valuta === "risultato"; }
    zonaStrade.classList.toggle("nascosto", s.vista !== "strade");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    zonaVetro.classList.toggle("nascosto", s.vista !== "vetro");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
    gMappa.setAttribute("display", s.vista === "vetro" ? "none" : "inline");
    gVetro.setAttribute("display", s.vista === "vetro" ? "inline" : "none");
    svg.setAttribute("aria-label", s.vista === "vetro" ? E.descrizione_vetro : E.descrizione_scena);
  }

  function ridisegna() {
    aggiornaComandi();
    disegnaMappa();
    disegnaVetro();
    disegnaDestra();
  }

  function cambia(diff, soloScheda) {
    Object.assign(s, diff);
    if (!soloScheda) s.verificato = false;
    if ("scatola" in diff && diff.scatola === "nera") s.passo_vetro = "";
    if (s.vista === "decidi") s.esecuzioni = sc.esecuzioni.max;
    if (!visibili(sc, s).some((p) => p.id === s.percorso_aperto)) s.percorso_aperto = sc.ordine_esecuzioni[0];
    ridisegna();
  }
  function scegli(id, valore) {
    const scelte = { ...s.scelte };
    if (valore) scelte[id] = valore; else delete scelte[id];
    cambia({ scelte, percorso_aperto: id });
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    if (!["strade", "decidi", "vetro"].includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!["risultato", "traiettoria"].includes(nuovo.valuta)) throw new Error(`stato_animazione: valuta sconosciuto «${nuovo.valuta}»`);
    if (!["nera", "vetro"].includes(nuovo.scatola)) throw new Error(`stato_animazione: scatola sconosciuta «${nuovo.scatola}»`);
    if (!(nuovo.esecuzioni >= sc.esecuzioni.min && nuovo.esecuzioni <= sc.esecuzioni.max)) throw new Error(`stato_animazione: esecuzioni fuori scala «${nuovo.esecuzioni}»`);
    for (const l of nuovo.lenti) if (!sc.lenti.some((x) => x.id === l)) throw new Error(`stato_animazione: lente sconosciuta «${l}»`);
    for (const [id, v] of Object.entries(nuovo.scelte)) {
      if (!sc.gioco[id]) throw new Error(`stato_animazione: percorso del gioco sconosciuto «${id}»`);
      if (!sc.verdetti.some((x) => x.id === v)) throw new Error(`stato_animazione: verdetto sconosciuto «${v}»`);
    }
    if (!sc.percorsi.some((p) => p.id === nuovo.percorso_aperto)) throw new Error(`stato_animazione: percorso_aperto sconosciuto «${nuovo.percorso_aperto}»`);
    if (nuovo.passo_vetro && !sc.vetro.passi.some((p) => p.id === nuovo.passo_vetro)) throw new Error(`stato_animazione: passo_vetro sconosciuto «${nuovo.passo_vetro}»`);
    Object.assign(s, nuovo, { lenti: [...nuovo.lenti], scelte: { ...nuovo.scelte } });
    if (!visibili(sc, s).some((p) => p.id === s.percorso_aperto)) s.percorso_aperto = sc.ordine_esecuzioni[0];
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo */ },
    _prova: { stato: s, valuta: () => valuta(sc, s), verifica: () => verifica(sc, s), vetro: () => esaminaVetro(sc, s), nomeLente },
  };
}
