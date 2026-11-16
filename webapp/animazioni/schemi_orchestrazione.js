// Lezione interattiva "Quattro mini-mappe e un bivio" (P6.2): quattro schemi di orchestrazione (sequenziale,
// parallelo con aggregatore, ciclo generatore-critico, coordinatore) percorsi da un gettone. Contatori tempo e
// chiamate (illustrativi). Comandi: limite di giri e segnale di uscita del ciclo, variante del coordinatore
// (manager / passaggio di consegne), pausa umana inseribile in ogni schema, esempio sbagliato "punteggio ed email
// in parallelo", gioco "Decidi tu" che assegna i processi CRM agli schemi. Tutti i testi dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "schemi_orchestrazione";
const VISTE = ["esplora", "assegna"];
const MODI = ["manager", "handoff"];
const W = 720, H = 420;
const PANNELLI = [{ x: 14, y: 62 }, { x: 366, y: 62 }, { x: 14, y: 244 }, { x: 366, y: 244 }];
const PW = 340, PH = 170;
const NODO = { w: 84, h: 26 };
const PASSO_MS = 750;
const UMANO = "__umano";

const STILE = `
.lz-schemi_orchestrazione .pann { cursor: pointer; }
.lz-schemi_orchestrazione .pann:focus-visible rect.cornice { stroke: #4f46e5; stroke-width: 3.5; }
.lz-schemi_orchestrazione .gettone { transition: transform .5s cubic-bezier(.2,.8,.2,1); }
.lz-schemi_orchestrazione.ridotto .gettone { transition: none; }
.lz-schemi_orchestrazione .dettaglio { display: grid; gap: 8px; font-size: .84rem; }
.lz-schemi_orchestrazione .dettaglio .nome { font-weight: 800; font-size: .95rem; }
.lz-schemi_orchestrazione .numeri { display: flex; gap: 10px; }
.lz-schemi_orchestrazione .numeri div { flex: 1; background: #f3f6fd; border-radius: 10px; padding: 6px 8px; text-align: center; }
.lz-schemi_orchestrazione .numeri b { display: block; font-size: 1.15rem; font-variant-numeric: tabular-nums; }
.lz-schemi_orchestrazione .esito { padding: 7px 10px; border-radius: 10px; background: var(--primario-chiaro); color: #3730a3; font-weight: 600; }
.lz-schemi_orchestrazione .esito.errore { background: var(--male-chiaro); color: #9f1239; }
.lz-schemi_orchestrazione .esito.avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-schemi_orchestrazione .nota { font-size: .76rem; color: var(--tenue); margin: 0; }
.lz-schemi_orchestrazione .scelta-gioco { display: grid; gap: 3px; margin: 8px 0; font-size: .8rem; }
.lz-schemi_orchestrazione .verifica { display: grid; gap: 6px; margin-top: 10px; }
.lz-schemi_orchestrazione .verifica .riga { font-size: .82rem; padding: 7px 10px; border-radius: 10px; }
.lz-schemi_orchestrazione .verifica .giusto { background: var(--ok-chiaro); color: #166534; }
.lz-schemi_orchestrazione .verifica .quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-schemi_orchestrazione .verifica .sbagliato, .lz-schemi_orchestrazione .verifica .vuoto { background: var(--male-chiaro); color: #9f1239; }
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

// ------------------------------------------------------------------ logica (pura)

/** Giri del ciclo generatore-critico e come finisce: "ok" (approvato ed esce), "limite", "senza_uscita". */
export function giriCiclo(sc, s) {
  const approvato = sc.parametri.giro_approvato;
  if (approvato > s.max_giri) return { giri: s.max_giri, fine: "limite", rifiniture: s.max_giri - 1 };
  if (s.segnale_uscita) return { giri: approvato, fine: "ok", rifiniture: approvato - 1 };
  return { giri: s.max_giri, fine: "senza_uscita", rifiniture: s.max_giri - 1 };
}

/** Simula uno schema nello stato dato: tempo, chiamate, fotogrammi del gettone, esito testuale. */
export function simula(sc, s, id) {
  const sch = sc.schemi.find((x) => x.id === id);
  if (!sch) throw new Error(`schema sconosciuto «${id}»`);
  const T = sc.testi;
  const n = sch.nodi;
  let tempo, chiamate, fotogrammi, esito, tipo = "ok", parla = null;
  if (id === "sequenziale") {
    tempo = n.reduce((a, x) => a + x.secondi, 0);
    chiamate = n.filter((x) => x.secondi > 0).length;
    fotogrammi = n.map((x) => [x.id]);
    esito = T.esito_seq;
  } else if (id === "parallelo") {
    const [partenza, ...resto] = n;
    const aggregatore = resto.pop();
    tempo = partenza.secondi + Math.max(...resto.map((x) => x.secondi)) + aggregatore.secondi;
    chiamate = resto.length + 1;
    fotogrammi = [[partenza.id], resto.map((x) => x.id), [aggregatore.id]];
    esito = s.dipendenza ? T.esito_par_dipendenza : T.esito_par;
    if (s.dipendenza) tipo = "errore";
  } else if (id === "ciclo") {
    const [scrittore, critico, rifinitore, uscita] = n;
    const c = giriCiclo(sc, s);
    tempo = scrittore.secondi + c.giri * critico.secondi + c.rifiniture * rifinitore.secondi;
    chiamate = 1 + c.giri + c.rifiniture;
    fotogrammi = [[scrittore.id]];
    for (let g = 1; g <= c.giri; g++) {
      fotogrammi.push([critico.id]);
      if (g < c.giri) fotogrammi.push([rifinitore.id]);
    }
    fotogrammi.push([uscita.id]);
    const v = { giro: sc.parametri.giro_approvato, giri: c.giri };
    esito = riempi(T[`esito_ciclo_${c.fine}`], v);
    if (c.fine !== "ok") tipo = "avviso";
  } else {
    const [cliente, triage] = n;
    const spec = n.find((x) => x.id === sch.specialista);
    if (s.modo_coordinatore === "manager") {
      tempo = triage.secondi + spec.secondi + sc.parametri.secondi_ricomposizione;
      chiamate = 3;
      fotogrammi = [[cliente.id], [triage.id], [spec.id], [triage.id], [cliente.id]];
      parla = triage.nome;
    } else {
      tempo = triage.secondi + spec.secondi;
      chiamate = 2;
      fotogrammi = [[cliente.id], [triage.id], [spec.id], [cliente.id]];
      parla = spec.nome;
    }
    esito = T[`esito_${s.modo_coordinatore}`];
  }
  if (s.pausa_umana) fotogrammi.splice(fotogrammi.length - 1, 0, [UMANO]);
  return { tempo, chiamate, fotogrammi, esito, tipo, parla };
}

/** Riscontro del gioco "Decidi tu". */
export function verifica(sc, s) {
  const T = sc.testi;
  const nome = (id) => sc.schemi.find((x) => x.id === id).nome;
  const righe = sc.processi.map((p, i) => {
    const scelta = s.assegnazioni[p.id] || "";
    const esito = !scelta ? "vuoto" : scelta === p.giusto ? "giusto" : p.quasi.includes(scelta) ? "quasi" : "sbagliato";
    return { id: p.id, esito, testo: riempi(T[`ver_${esito}`], { n: i + 1, migliore: nome(p.giusto), spiega: p.spiega }) };
  });
  const giuste = righe.filter((r) => r.esito === "giusto").length;
  return { righe, giuste, totali: righe.length, sintesi: giuste === righe.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righe.length }) };
}

/** Centro (assoluto) di un nodo o della pausa umana per lo schema di indice i nel fotogramma k. */
export function punto(sc, s, i, nodoId, fotogrammi, k) {
  const sch = sc.schemi[i];
  const P = PANNELLI[i];
  if (nodoId === UMANO) {
    const a = punto(sc, s, i, fotogrammi[k - 1][0], fotogrammi, k - 1);
    const b = punto(sc, s, i, fotogrammi[k + 1][0], fotogrammi, k + 1);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 + 30 };
  }
  const nd = sch.nodi.find((x) => x.id === nodoId);
  return { x: P.x + nd.x, y: P.y + nd.y };
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
  const IDS = sc.schemi.map((x) => x.id);

  const s = { vista: "esplora", schema_attivo: IDS[0], max_giri: sc.max_giri.min, segnale_uscita: true, modo_coordinatore: "manager", pausa_umana: false, dipendenza: false, assegnazioni: {}, verificato: false };
  let fotogramma = 0;
  let timer = null;

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...VISTE.map((v) => el("button", { "data-v": v, onclick: () => cambia({ vista: v }) }, E[`vista_${v}`])));
  const segSchema = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.schema },
    ...sc.schemi.map((x) => el("button", { "data-v": x.id, onclick: () => cambia({ schema_attivo: x.id }) }, x.nome)));
  const valGiri = el("b", {});
  const inGiri = el("input", { type: "range", min: sc.max_giri.min, max: sc.max_giri.max, step: sc.max_giri.passo, "aria-label": sc.max_giri.etichetta });
  inGiri.addEventListener("input", () => cambia({ max_giri: Number(inGiri.value) }));
  const inUscita = el("input", { type: "checkbox", onchange: (e) => cambia({ segnale_uscita: e.target.checked }) });
  const segModo = el("div", { class: "segmentato", role: "group", "aria-label": E.coordinatore },
    ...MODI.map((m) => el("button", { "data-v": m, onclick: () => cambia({ modo_coordinatore: m }) }, E[m])));
  const inPausa = el("input", { type: "checkbox", onchange: (e) => cambia({ pausa_umana: e.target.checked }) });
  const inDip = el("input", { type: "checkbox", onchange: (e) => cambia({ dipendenza: e.target.checked }) });
  const zonaEsplora = el("div", {},
    el("h4", {}, E.schema), segSchema,
    el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, sc.max_giri.etichetta), valGiri), inGiri),
    el("label", { class: "interruttore" }, el("span", {}, E.segnale_uscita), inUscita),
    el("h4", {}, E.coordinatore), segModo,
    el("label", { class: "interruttore" }, el("span", {}, E.pausa_umana), inPausa),
    el("label", { class: "interruttore" }, el("span", {}, E.dipendenza), inDip));
  const tendine = {};
  const zonaAssegna = el("div", {});
  sc.processi.forEach((p, i) => {
    const sel = el("select", { "aria-label": riempi(T.scegli_per, { n: i + 1 }), onchange: (e) => assegna(p.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.schemi.map((x) => el("option", { value: x.id }, x.nome)));
    tendine[p.id] = sel;
    zonaAssegna.append(el("label", { class: "scelta-gioco" }, el("span", {}, `${riempi(T.processo, { n: i + 1 })} — ${p.testo}`), sel));
  });
  zonaAssegna.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => { s.verificato = true; disegnaDestra(); } }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaEsplora, zonaAssegna);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs><marker id="so-freccia" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#94a3b8"/></marker></defs>`;
  svg.append(testoSvg({ x: W / 2, y: 30, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, E.titolo_scena));
  const PAN = sc.schemi.map((sch, i) => {
    const P = PANNELLI[i];
    const g = svgEl("g", { class: "pann", tabindex: "0", role: "button", "aria-label": riempi(T.seleziona, { nome: sch.nome }) });
    const cornice = svgEl("rect", { class: "cornice", x: P.x, y: P.y, width: PW, height: PH, rx: 14, fill: "#fff", stroke: sch.colore, "stroke-width": 1.5 });
    const titolo = testoSvg({ x: P.x + 12, y: P.y + 17, "font-size": 11.5, "font-weight": 800, fill: sch.colore }, sch.nome);
    const archi = svgEl("g");
    const nodi = svgEl("g");
    const extra = svgEl("g");
    const contatori = testoSvg({ x: P.x + PW - 12, y: P.y + PH - 9, "text-anchor": "end", "font-size": 10, "font-weight": 700, fill: "#5b6684" }, "");
    const assegnati = testoSvg({ x: P.x + PW - 12, y: P.y + 17, "text-anchor": "end", "font-size": 10, "font-weight": 800, fill: "#4f46e5" }, "");
    const gettoni = svgEl("g");
    for (const nd of sch.nodi) {
      nodi.append(svgEl("rect", { x: P.x + nd.x - NODO.w / 2, y: P.y + nd.y - NODO.h / 2, width: NODO.w, height: NODO.h, rx: 8, fill: "#f8fafc", stroke: sch.colore, "stroke-width": 1.3 }),
        testoSvg({ x: P.x + nd.x, y: P.y + nd.y + 4, "text-anchor": "middle", "font-size": 9.5, "font-weight": 700, fill: "#17203b" }, nd.nome));
    }
    g.append(cornice, titolo, assegnati, archi, nodi, extra, gettoni, contatori);
    const scegli = () => cambia({ schema_attivo: sch.id });
    g.addEventListener("click", scegli);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); scegli(); } });
    svg.append(g);
    return { cornice, archi, extra, contatori, assegnati, gettoni };
  });
  scena.append(svg);

  const destra = el("aside", { class: "pannello destra" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}${ridotto ? " ridotto" : ""}` }, comandi, scena, destra));

  function linea(g, a, b, attr) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1;
    const ox = (NODO.w / 2 + 2) * Math.abs(dx / L) > (NODO.h / 2 + 2) * Math.abs(dy / L) ? (NODO.w / 2 + 2) / Math.abs(dx / L) : (NODO.h / 2 + 2) / Math.abs(dy / L);
    const k = Math.min(ox / L, 0.45);
    g.append(svgEl("line", { x1: a.x + dx * k, y1: a.y + dy * k, x2: b.x - dx * k, y2: b.y - dy * k, stroke: "#94a3b8", "stroke-width": 1.4, "marker-end": "url(#so-freccia)", ...(attr || {}) }));
  }
  function centro(i, id) {
    const P = PANNELLI[i];
    const nd = sc.schemi[i].nodi.find((x) => x.id === id);
    return { x: P.x + nd.x, y: P.y + nd.y };
  }

  function disegnaArchi() {
    sc.schemi.forEach((sch, i) => {
      const A = PAN[i].archi;
      const X = PAN[i].extra;
      A.replaceChildren(); X.replaceChildren();
      const id = (k) => sch.nodi[k].id;
      const c = (k) => centro(i, id(k));
      if (sch.id === "sequenziale") { linea(A, c(0), c(1)); linea(A, c(1), c(2)); }
      if (sch.id === "parallelo") {
        for (const k of [1, 2, 3]) { linea(A, c(0), c(k)); linea(A, c(k), c(4)); }
        if (s.dipendenza) {
          const p = PANNELLI[i];
          X.append(svgEl("rect", { x: p.x + 220, y: p.y + PH - 26, width: 108, height: 18, rx: 9, fill: "#fdecef", stroke: "#e11d48" }),
            testoSvg({ x: p.x + 274, y: p.y + PH - 13, "text-anchor": "middle", "font-size": 9.5, "font-weight": 800, fill: "#9f1239" }, E.conflitto));
        }
      }
      if (sch.id === "ciclo") {
        linea(A, c(0), c(1));
        const a = c(1), b = c(2);
        linea(A, { x: a.x - 14, y: a.y }, { x: b.x - 14, y: b.y });
        linea(A, { x: b.x + 14, y: b.y }, { x: a.x + 14, y: a.y });
        linea(A, c(1), c(3), s.segnale_uscita ? {} : { "stroke-dasharray": "4 4", "stroke-opacity": ".5" });
        X.append(testoSvg({ x: (a.x + c(3).x) / 2 + 6, y: (a.y + c(3).y) / 2 - 8, "text-anchor": "middle", "font-size": 8.5, "font-weight": 800, fill: s.segnale_uscita ? "#16a34a" : "#94a3b8", "text-decoration": s.segnale_uscita ? "" : "line-through" }, E.approvato));
      }
      if (sch.id === "coordinatore") {
        linea(A, c(0), c(1));
        for (const k of [2, 3, 4]) linea(A, c(1), c(k));
        const spec = centro(i, sch.specialista);
        const cl = c(0);
        X.append(testoSvg({ x: cl.x, y: cl.y + 30, "text-anchor": "middle", "font-size": 8.5, fill: "#5b6684" }, T.domanda_cliente));
        if (s.modo_coordinatore === "handoff") {
          X.append(svgEl("path", { d: `M${spec.x - NODO.w / 2} ${spec.y - 6} Q ${(spec.x + cl.x) / 2} ${spec.y - 34} ${cl.x} ${cl.y - NODO.h / 2 - 2}`, fill: "none", stroke: "#f59e0b", "stroke-width": 1.8, "stroke-dasharray": "5 4", "marker-end": "url(#so-freccia)" }),
            testoSvg({ x: (spec.x + cl.x) / 2, y: spec.y - 24, "text-anchor": "middle", "font-size": 9, "font-weight": 800, fill: "#b45309" }, E.risponde));
        }
      }
    });
  }

  function disegnaGettoni() {
    sc.schemi.forEach((sch, i) => {
      const r = simula(sc, s, sch.id);
      const k = sch.id === s.schema_attivo ? Math.min(fotogramma, r.fotogrammi.length - 1) : (ridotto ? r.fotogrammi.length - 1 : 0);
      const ids = r.fotogrammi[k];
      const G = PAN[i].gettoni;
      while (G.childNodes.length < 3) {
        const gg = svgEl("g", { class: "gettone" });
        gg.append(svgEl("circle", { r: 7, fill: "#facc15", stroke: "#a16207", "stroke-width": 1.5 }));
        G.append(gg);
      }
      [...G.childNodes].forEach((gg, j) => {
        if (j >= ids.length) { gg.setAttribute("opacity", "0"); return; }
        gg.setAttribute("opacity", "1");
        const p = punto(sc, s, i, ids[j], r.fotogrammi, k);
        const y = ids[j] === UMANO ? p.y : p.y - NODO.h / 2 - 2;
        gg.style.transform = `translate(${p.x}px, ${y}px)`;
        gg.setAttribute("transform", `translate(${p.x},${y})`);
      });
      // icona della pausa umana sul tratto finale
      const vecchia = PAN[i].extra.querySelector(".umano");
      if (vecchia) vecchia.remove();
      if (s.pausa_umana) {
        const u = r.fotogrammi.findIndex((f) => f[0] === UMANO);
        const p = punto(sc, s, i, UMANO, r.fotogrammi, u);
        const g = svgEl("g", { class: "umano" });
        g.append(svgEl("circle", { cx: p.x - 22, cy: p.y - 5, r: 4, fill: "#7c3aed" }), svgEl("path", { d: `M${p.x - 29} ${p.y + 7} q7 -11 14 0`, fill: "#7c3aed" }),
          testoSvg({ x: p.x - 12, y: p.y + 4, "font-size": 9, "font-weight": 800, fill: "#7c3aed" }, E.umano));
        PAN[i].extra.append(g);
      }
    });
  }

  function disegnaScena() {
    disegnaArchi();
    sc.schemi.forEach((sch, i) => {
      const r = simula(sc, s, sch.id);
      PAN[i].contatori.textContent = riempi(T.contatori, { tempo: num(r.tempo), chiamate: num(r.chiamate) });
      PAN[i].cornice.setAttribute("stroke-width", sch.id === s.schema_attivo && s.vista === "esplora" ? "3.5" : "1.5");
      const nums = sc.processi.map((p, k) => (s.assegnazioni[p.id] === sch.id ? riempi(T.processo, { n: k + 1 }) : null)).filter(Boolean);
      PAN[i].assegnati.textContent = s.vista === "assegna" ? nums.join(" · ") : "";
    });
    disegnaGettoni();
  }

  function disegnaDestra() {
    if (s.vista === "assegna") {
      const figli = [el("h3", {}, E.titolo_scheda)];
      if (s.verificato) {
        const v = verifica(sc, s);
        figli.push(el("div", { class: "verifica", "aria-live": "polite" },
          el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
          ...v.righe.map((r) => el("div", { class: `riga ${r.esito}` }, r.testo))));
      }
      destra.replaceChildren(...figli);
      return;
    }
    const sch = sc.schemi.find((x) => x.id === s.schema_attivo);
    const r = simula(sc, s, sch.id);
    const figli = [el("h3", {}, E.titolo_scheda), el("div", { class: "dettaglio", "aria-live": "polite" },
      el("div", { class: "nome", style: `color:${sch.colore}` }, sch.nome),
      el("div", {}, sch.descrizione),
      el("div", { class: "numeri" }, el("div", {}, el("b", {}, riempi(T.tempo, { n: num(r.tempo) })), E.lbl_tempo), el("div", {}, el("b", {}, num(r.chiamate)), E.lbl_chiamate)),
      el("div", { class: `esito ${r.tipo === "ok" ? "" : r.tipo}` }, r.esito),
      r.parla ? el("div", {}, riempi(T.parla_cliente, { chi: r.parla })) : null,
      s.pausa_umana ? el("div", { class: "esito avviso" }, T.esito_pausa) : null,
      el("p", { class: "nota" }, T.nota_illustrativa))];
    destra.replaceChildren(...figli);
  }

  function aggiornaComandi() {
    segVista.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.vista)));
    segSchema.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.schema_attivo)));
    segModo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.modo_coordinatore)));
    inGiri.value = s.max_giri; valGiri.textContent = num(s.max_giri);
    inUscita.checked = s.segnale_uscita; inPausa.checked = s.pausa_umana; inDip.checked = s.dipendenza;
    zonaEsplora.classList.toggle("nascosto", s.vista !== "esplora");
    zonaAssegna.classList.toggle("nascosto", s.vista !== "assegna");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.assegnazioni[id] || "";
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaDestra(); }
  function avvia() {
    if (timer) clearInterval(timer);
    timer = null;
    fotogramma = 0;
    if (ridotto) { fotogramma = Number.MAX_SAFE_INTEGER; return; }
    timer = setInterval(() => {
      const n = simula(sc, s, s.schema_attivo).fotogrammi.length;
      fotogramma = fotogramma >= n + 1 ? 0 : fotogramma + 1;
      disegnaGettoni();
    }, PASSO_MS);
  }
  function cambia(diff) {
    Object.assign(s, diff);
    if (!("verificato" in diff)) s.verificato = false;
    avvia();
    ridisegna();
  }
  function assegna(id, valore) {
    const a = { ...s.assegnazioni };
    if (valore) a[id] = valore; else delete a[id];
    cambia({ assegnazioni: a });
  }
  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    nuovo.assegnazioni = { ...(nuovo.assegnazioni || {}) };
    if (!VISTE.includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!IDS.includes(nuovo.schema_attivo)) throw new Error(`stato_animazione: schema sconosciuto «${nuovo.schema_attivo}»`);
    if (!MODI.includes(nuovo.modo_coordinatore)) throw new Error(`stato_animazione: variante sconosciuta «${nuovo.modo_coordinatore}»`);
    if (!(nuovo.max_giri >= sc.max_giri.min && nuovo.max_giri <= sc.max_giri.max)) throw new Error(`stato_animazione: max_giri fuori scala «${nuovo.max_giri}»`);
    for (const [p, x] of Object.entries(nuovo.assegnazioni)) {
      if (!sc.processi.some((q) => q.id === p)) throw new Error(`stato_animazione: processo sconosciuto «${p}»`);
      if (!IDS.includes(x)) throw new Error(`stato_animazione: schema sconosciuto «${x}»`);
    }
    Object.assign(s, nuovo);
    avvia();
    ridisegna();
  }
  applica({});
  return {
    applica,
    distruggi() { if (timer) clearInterval(timer); timer = null; },
    _prova: { stato: s, simula: (id) => simula(sc, s, id), verifica: () => verifica(sc, s) },
  };
}
