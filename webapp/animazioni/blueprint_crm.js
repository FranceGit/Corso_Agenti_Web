// Lezione interattiva "Il blueprint finale: assembla l'agente CRM" (P8.6), esercizio riassuntivo del corso.
// Una tavola con le regole non negoziabili e 8 sezioni; per ogni parte lo studente sceglie un blocco da una tavolozza
// (buono, quasi, sbagliato: il tipo non e' mostrato). "Verifica coerenza" applica le regole dello scenario: ogni regola
// scatta quando tutti i suoi "tratti" sono presenti nel blueprint e nessuno dei tratti "salvo"; alcune sono incrociate tra
// sezioni (es. approvazione dichiarata ma strumenti senza livello di rischio). Semaforo per parte, avvisi con la fonte,
// esempio guidato, blueprint difettoso, vista SDD che raggruppa le parti (valutazione e governance restano "operazioni").
// Tutti i testi arrivano dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "blueprint_crm";
const VISTE = ["tavola", "sdd"];
const W = 720, H = 430;
const BOX = { w: 132, h: 104 };
const TAV = { yRegole: 40, yRiga1: 160, yRiga2: 286, passo: 172, x0: 22 };
const SDD = { x0: 8, passo: 142, yTesta: 44, y0: 62, passoY: 112 };
const COLORI = { verde: "#16a34a", giallo: "#d97706", rosso: "#dc2626", vuoto: "#cbd2e3", attesa: "#94a3b8" };

const STILE = `
.lz-blueprint_crm .parte { cursor: pointer; transition: transform .6s cubic-bezier(.2,.8,.2,1); }
.lz-blueprint_crm .parte:focus-visible rect.fondo { stroke: #4f46e5; stroke-width: 3.5; }
.lz-blueprint_crm .ferma .parte { transition: none; }
.lz-blueprint_crm .nota { font-size: .78rem; color: var(--tenue); margin: 6px 0 0; }
.lz-blueprint_crm .pulsanti { display: grid; gap: 6px; margin: 8px 0; }
.lz-blueprint_crm .pulsanti .btn { justify-content: center; }
.lz-blueprint_crm .blocchi { display: grid; gap: 6px; margin: 8px 0; }
.lz-blueprint_crm .blocchi button { text-align: left; font-size: .8rem; padding: 7px 9px; border-radius: 10px; border: 1.5px solid #dfe4f0; background: #fff; cursor: pointer; }
.lz-blueprint_crm .blocchi button[aria-pressed="true"] { border-color: #4f46e5; background: var(--primario-chiaro); }
.lz-blueprint_crm .riepilogo { font-size: .82rem; }
.lz-blueprint_crm .esiti-verifica { margin-top: 10px; border-top: 1px solid #dfe4f0; padding: 10px 4px 2px; }
.lz-blueprint_crm .esiti-verifica h4 { margin: 0 0 6px; font-size: .8rem; text-transform: uppercase; letter-spacing: .07em; color: var(--tenue); }
.lz-blueprint_crm .esiti-elenco { display: grid; gap: 5px; margin-top: 8px; max-height: 240px; overflow-y: auto; padding-right: 4px; }
.lz-blueprint_crm .esiti-elenco div { font-size: .78rem; padding: 6px 9px; border-radius: 9px; overflow-wrap: anywhere; }
.lz-blueprint_crm .esiti-elenco .rosso { background: var(--male-chiaro); color: #9f1239; }
.lz-blueprint_crm .esiti-elenco .giallo { background: var(--avviso-chiaro); color: #92400e; }
.lz-blueprint_crm .punteggio { font-weight: 800; font-size: .86rem; }
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
function t(attr, testo) {
  const x = svgEl("text", attr);
  x.textContent = testo;
  return x;
}
export function riempi(modello, valori) {
  return modello.replace(/\{(\w+)\}/g, (_, k) => {
    if (!(k in valori)) throw new Error(`segnaposto {${k}} senza valore`);
    return valori[k];
  });
}

// ------------------------------------------------------------------ logica (pura)

/** Spezza un testo in righe di al massimo `max` caratteri (per parole); al massimo `righe` righe, l'ultima accorciata. */
export function aCapo(testo, max, righe) {
  const out = [];
  let cur = "";
  for (const p of testo.split(" ")) {
    if (!cur) cur = p;
    else if ((cur + " " + p).length <= max) cur += " " + p;
    else { out.push(cur); cur = p; }
  }
  if (cur) out.push(cur);
  if (out.length > righe) {
    const tagliate = out.slice(0, righe);
    tagliate[righe - 1] = `${tagliate[righe - 1].slice(0, max - 1).trimEnd()}…`;
    return tagliate;
  }
  return out;
}

/** Insieme dei tratti dei blocchi scelti. */
export function tratti(sc, scelte) {
  const out = new Set();
  for (const sez of sc.sezioni) {
    const b = sez.blocchi.find((x) => x.id === scelte[sez.id]);
    if (b) for (const tr of b.tratti) out.add(tr);
  }
  return out;
}

/** Verifica di coerenza: avvisi (regole scattate), semaforo per parte, conteggio delle parti verdi. */
export function valutaBlueprint(sc, scelte) {
  const tr = tratti(sc, scelte);
  const avvisi = sc.regole.filter((r) => r.quando.every((x) => tr.has(x)) && !r.salvo.some((x) => tr.has(x)));
  const semafori = {};
  for (const sez of sc.sezioni) {
    if (!scelte[sez.id]) { semafori[sez.id] = "vuoto"; continue; }
    const suoi = avvisi.filter((r) => r.sezioni.includes(sez.id));
    semafori[sez.id] = suoi.some((r) => r.gravita === "rosso") ? "rosso" : suoi.length ? "giallo" : "verde";
  }
  const verdi = Object.values(semafori).filter((x) => x === "verde").length;
  return { avvisi, semafori, verdi, totale: sc.sezioni.length, coerente: verdi === sc.sezioni.length };
}

/** Posizione di ogni parte nelle due viste. */
export function posizioni(sc, vista) {
  const pos = {};
  if (vista === "tavola") {
    const [regole, ...otto] = sc.sezioni;
    pos[regole.id] = { x: (W - BOX.w) / 2, y: TAV.yRegole };
    otto.forEach((s, i) => { pos[s.id] = { x: TAV.x0 + (i % 4) * TAV.passo, y: i < 4 ? TAV.yRiga1 : TAV.yRiga2 }; });
  } else {
    sc.sdd.forEach((col, i) => col.sezioni.forEach((id, k) => { pos[id] = { x: SDD.x0 + i * SDD.passo, y: SDD.y0 + k * SDD.passoY }; }));
  }
  return pos;
}
export const DIMENSIONI = { w: W, h: H, boxW: BOX.w, boxH: BOX.h };

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
  const sezione = Object.fromEntries(sc.sezioni.map((x) => [x.id, x]));

  const s = { vista: "tavola", scelte: {}, sezione_aperta: sc.sezioni[0].id, verificato: false };

  // ------------------------------------------------ comandi
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    el("button", { "data-v": "tavola", onclick: () => cambia({ vista: "tavola" }) }, E.vista_tavola),
    el("button", { "data-v": "sdd", onclick: () => cambia({ vista: "sdd" }) }, E.vista_sdd));
  const comandi = el("aside", { class: "pannello" },
    el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista,
    el("div", { class: "pulsanti" },
      el("button", { class: "btn", onclick: () => cambia({ scelte: { ...sc.preset.esempio } }) }, E.esempio),
      el("button", { class: "btn", onclick: () => cambia({ scelte: { ...sc.preset.difettoso } }) }, E.difettoso),
      el("button", { class: "btn", onclick: () => cambia({ scelte: {}, verificato: false }) }, E.svuota),
      el("button", { class: "btn btn-primario", onclick: () => cambia({ verificato: true }) }, E.verifica)),
    el("p", { class: "nota" }, E.nota_comandi),
    el("p", { class: "nota" }, T.nota_exp));

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  const titolo = t({ x: W / 2, y: 22, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".04em" }, E.titolo_scena);
  const gLinee = svgEl("g"), gTeste = svgEl("g"), gParti = svgEl("g");
  svg.append(titolo, gLinee, gTeste, gParti);
  const PARTI = {};
  for (const sez of sc.sezioni) {
    const g = svgEl("g", { class: "parte", tabindex: "0", role: "button", "aria-label": riempi(T.apri_sezione, { nome: sez.nome }) });
    const fondo = svgEl("rect", { class: "fondo", width: BOX.w, height: BOX.h, rx: 12, fill: "#fff", "stroke-width": 2 });
    const numero = t({ x: 10, y: 17, "font-size": 11, "font-weight": 900, fill: "#4f46e5" }, sez.numero);
    const nome = aCapo(sez.nome, sc.a_capo_nome, 2).map((r, i) => t({ x: 24, y: 17 + i * 13, "font-size": 9.5, "font-weight": 800, fill: "#17203b" }, r));
    const breve = [0, 1].map((i) => t({ x: 10, y: 54 + i * 12, "font-size": 9, fill: "#334155" }, ""));
    const coll = t({ x: 10, y: BOX.h - 9, "font-size": 8, fill: "#7a849e" }, riempi(T.collegamento, { pillole: sez.pillole }));
    const luce = svgEl("circle", { cx: BOX.w - 11, cy: BOX.h - 12, r: 6 });
    g.append(fondo, numero, ...nome, ...breve, coll, luce);
    const apri = () => cambia({ sezione_aperta: sez.id }, true);
    g.addEventListener("click", apri);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(); } });
    gParti.append(g);
    PARTI[sez.id] = { g, fondo, breve, luce };
  }
  // esiti della verifica: pannello proprio SOTTO la tavola (mai sopra i blocchi), con scorrimento interno se lunghi
  const esiti = el("section", { class: "esiti-verifica", "aria-live": "polite", "aria-label": E.titolo_avvisi });
  scena.append(svg, esiti);

  const destra = el("aside", { class: "pannello destra", "aria-live": "polite" });
  const banco = el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra);
  radice.replaceChildren(banco);
  let primo = true;

  function disegnaScena() {
    const v = valutaBlueprint(sc, s.scelte);
    const pos = posizioni(sc, s.vista);
    banco.classList.toggle("ferma", ridotto || primo);
    gLinee.replaceChildren();
    gTeste.replaceChildren();
    if (s.vista === "tavola") {
      const r = pos[sc.sezioni[0].id];
      for (const sez of sc.sezioni.slice(1)) {
        const p = pos[sez.id];
        gLinee.append(svgEl("line", { x1: r.x + BOX.w / 2, y1: r.y + BOX.h, x2: p.x + BOX.w / 2, y2: p.y, stroke: "#c7d2fe", "stroke-width": 1.2, "stroke-dasharray": "4 4" }));
      }
    } else {
      sc.sdd.forEach((col, i) => {
        const x = SDD.x0 + i * SDD.passo;
        gTeste.append(svgEl("rect", { x: x - 2, y: SDD.yTesta - 14, width: BOX.w + 4, height: H - SDD.yTesta + 8, rx: 12, fill: col.operazioni ? "#fff7ed" : "#eef2ff", stroke: col.operazioni ? "#fdba74" : "#c7d2fe", "stroke-dasharray": col.operazioni ? "6 4" : "" }));
        aCapo(col.nome, sc.a_capo_nome, 2).forEach((riga, k) => gTeste.append(t({ x: x + BOX.w / 2, y: SDD.yTesta + k * 11 - 3, "text-anchor": "middle", "font-size": 9.5, "font-weight": 800, fill: col.operazioni ? "#9a3412" : "#3730a3" }, riga)));
        if (!col.sezioni.length) aCapo(T.tasks_nota, sc.a_capo_nome, 3).forEach((riga, k) => gTeste.append(t({ x: x + BOX.w / 2, y: SDD.y0 + 30 + k * 12, "text-anchor": "middle", "font-size": 9, fill: "#5b6684" }, riga)));
      });
    }
    for (const sez of sc.sezioni) {
      const P = PARTI[sez.id];
      const p = pos[sez.id];
      P.g.style.transform = `translate(${p.x}px, ${p.y}px)`;
      P.g.setAttribute("transform", `translate(${p.x},${p.y})`);
      const b = sez.blocchi.find((x) => x.id === s.scelte[sez.id]);
      const righe = b ? aCapo(b.breve, sc.a_capo_caratteri, 2) : aCapo(T.vuota, sc.a_capo_caratteri, 2);
      P.breve.forEach((x, i) => { x.textContent = righe[i] || ""; x.setAttribute("fill", b ? "#334155" : "#94a3b8"); x.setAttribute("font-style", b ? "normal" : "italic"); });
      const stato = s.verificato ? v.semafori[sez.id] : (b ? "attesa" : "vuoto");
      P.luce.setAttribute("fill", COLORI[stato]);
      P.fondo.setAttribute("stroke", sez.id === s.sezione_aperta ? "#4f46e5" : (s.verificato && b ? COLORI[stato] : "#cbd2e3"));
      P.fondo.setAttribute("stroke-dasharray", b ? "" : "5 4");
      P.fondo.setAttribute("fill", sez.id === sc.sezioni[0].id ? "#f5f3ff" : "#fff");
    }
    primo = false;
  }

  function disegnaDestra() {
    const sez = sezione[s.sezione_aperta];
    const v = valutaBlueprint(sc, s.scelte);
    const figli = [
      el("h3", {}, E.titolo_destra),
      el("div", { class: "riepilogo" }, el("b", {}, `${sez.numero} · ${sez.nome}`), el("div", {}, sez.riepilogo)),
      el("div", { class: "blocchi", role: "group", "aria-label": sez.nome },
        ...sez.blocchi.map((b) => el("button", { "aria-pressed": String(s.scelte[sez.id] === b.id), onclick: () => cambia({ scelte: { ...s.scelte, [sez.id]: b.id } }) }, b.testo))),
      el("p", { class: "nota" }, riempi(T.collegamento, { pillole: sez.pillole })),
    ];
    destra.replaceChildren(...figli);
    if (!ridotto) destra.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 220 });
    disegnaEsiti(v);
  }

  function disegnaEsiti(v) {
    const figli = [el("h4", {}, E.titolo_avvisi)];
    if (!s.verificato) figli.push(el("p", { class: "nota" }, T.non_verificato));
    else {
      figli.push(el("div", { class: "punteggio" }, riempi(T.verdi, { n: num(v.verdi), tot: num(v.totale) })));
      if (v.coerente) figli.push(el("div", { class: "esito-scheda ok" }, el("div", {}, T.coerente)));
      const nomi = (ids) => ids.map((id) => sezione[id].nome).join(", ");
      const vuote = sc.sezioni.filter((x) => v.semafori[x.id] === "vuoto");
      figli.push(el("div", { class: "esiti-elenco" },
        ...v.avvisi.map((r) => el("div", { class: r.gravita }, `${r.gravita === "rosso" ? E.gravita_rosso : E.gravita_giallo}: ${riempi(T.avviso, { testo: r.testo, sezioni: nomi(r.sezioni), fonte: r.fonte })}`)),
        ...vuote.map((x) => el("div", { class: "giallo" }, `${x.nome}: ${T.vuota}`))));
    }
    esiti.replaceChildren(...figli);
  }

  function aggiornaComandi() {
    segVista.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.vista)));
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaDestra(); }
  function cambia(diff) {
    Object.assign(s, diff);
    ridisegna();
  }

  function applica(nuovo) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(nuovo || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const n = { ...s, ...(nuovo || {}) };
    if (!VISTE.includes(n.vista)) throw new Error(`stato_animazione: vista sconosciuta «${n.vista}»`);
    if (!sezione[n.sezione_aperta]) throw new Error(`stato_animazione: sezione sconosciuta «${n.sezione_aperta}»`);
    for (const [id, b] of Object.entries(n.scelte || {})) {
      if (!sezione[id]) throw new Error(`stato_animazione: sezione sconosciuta «${id}»`);
      if (!sezione[id].blocchi.some((x) => x.id === b)) throw new Error(`stato_animazione: blocco sconosciuto «${b}» in «${id}»`);
    }
    Object.assign(s, n, { scelte: { ...(n.scelte || {}) } });
    primo = true;
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo: le transizioni CSS si fermano da sole */ },
    _prova: { stato: s, valuta: () => valutaBlueprint(sc, s.scelte) },
  };
}
