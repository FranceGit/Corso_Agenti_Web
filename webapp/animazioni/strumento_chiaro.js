// Lezione interattiva "Progettare buoni strumenti" (P4.2): la scheda di uno strumento (nome, descrizione, parametri,
// granularita') cambia quante volte il modello sceglie bene su 20 compiti (valori illustrativi dello scenario);
// strumenti distinti o sovrapposti; 4 messaggi d'errore e la reazione dell'agente; cassetti lettura / azione /
// orchestrazione da riempire con riscontro; idempotenza con il doppio clic su "invia follow-up".
// Tutti i testi e i numeri arrivano dallo scenario della lezione.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "strumento_chiaro";
const VISTE = ["scheda", "errore", "azioni"];
const GRANULARITA = ["api", "compito", "multi"];

const STILE = `
.lz-strumento_chiaro .traccia { display: grid; gap: 6px; }
.lz-strumento_chiaro .passo-traccia { font-size: .82rem; padding: 7px 10px; border-radius: 10px; border-left: 4px solid; }
.lz-strumento_chiaro .passo-traccia.ok { background: var(--ok-chiaro); border-color: var(--ok); color: #166534; }
.lz-strumento_chiaro .passo-traccia.avviso { background: var(--avviso-chiaro); border-color: var(--avviso); color: #92400e; }
.lz-strumento_chiaro .passo-traccia.male { background: var(--male-chiaro); border-color: var(--male); color: #9f1239; }
.lz-strumento_chiaro .nota { font-size: .78rem; color: var(--tenue); margin: 6px 0 0; }
.lz-strumento_chiaro .messaggio { font-family: var(--mono); font-size: .78rem; background: #0f172a; color: #e2e8f0; padding: 8px 10px; border-radius: 10px; }
.lz-strumento_chiaro .scelta-gioco { display: grid; gap: 3px; margin: 6px 0; font-size: .82rem; }
.lz-strumento_chiaro .scelta-gioco code { font-family: var(--mono); font-size: .78rem; }
.lz-strumento_chiaro .verifica { display: grid; gap: 6px; margin-top: 8px; }
.lz-strumento_chiaro .verifica .riga { font-size: .8rem; padding: 6px 9px; border-radius: 9px; }
.lz-strumento_chiaro .verifica .riga.giusto { background: var(--ok-chiaro); color: #166534; }
.lz-strumento_chiaro .verifica .riga.sbagliato, .lz-strumento_chiaro .verifica .riga.vuoto { background: var(--male-chiaro); color: #9f1239; }
.lz-strumento_chiaro .grande { font-size: 1.6rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.lz-strumento_chiaro .btn-largo { width: 100%; justify-content: center; margin-top: 8px; }
.lz-strumento_chiaro .entra-svg { animation: lzsc-entra .35s ease; }
@keyframes lzsc-entra { from { opacity: 0; } to { opacity: 1; } }
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
/** Spezza un testo in righe di al massimo n caratteri (a parole intere). */
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

/** Scelte corrette su 20 compiti con la scheda attuale (penalita' illustrative dello scenario). */
export function punteggio(sc, s) {
  const P = sc.penalita;
  const voci = [];
  if (s.nome === "vago") voci.push({ chiave: "nome", penalita: P.nome_vago });
  if (s.descrizione === "vaga") voci.push({ chiave: "descrizione", penalita: P.descrizione_vaga });
  if (s.parametri === "grezzi") voci.push({ chiave: "parametri", penalita: P.parametri_grezzi });
  if (s.granularita === "api") voci.push({ chiave: "api", penalita: P.granularita_api });
  if (s.granularita === "multi") voci.push({ chiave: "multi", penalita: P.granularita_multi });
  // non conta il numero di strumenti, conta quanto si somigliano (OpenAI: >15 distinti si gestiscono, <10 sovrapposti no)
  if (s.sovrapposti) voci.push({ chiave: "sovrapposti", penalita: P.sovrapposti_base + Math.floor(s.strumenti / P.sovrapposti_ogni) });
  const totale = sc.compiti_totali;
  const corrette = Math.max(P.minimo, totale - voci.reduce((a, v) => a + v.penalita, 0));
  return { corrette, totale, voci, ciclo: s.sovrapposti };
}

/** Che cosa fa l'agente sul compito, passo per passo, con la scheda attuale. */
export function traccia(sc, s) {
  const T = sc.testi;
  const nome = sc.nomi[s.nome];
  const passi = [];
  if (s.nome === "vago" || s.descrizione === "vaga") passi.push({ tipo: "male", testo: riempi(T.tr_dubbio, { nome }) });
  else passi.push({ tipo: "ok", testo: riempi(T.tr_capisce, { nome }) });
  if (s.parametri === "grezzi") passi.push({ tipo: "avviso", testo: riempi(T.tr_param_grezzi, { n: sc.parametri.grezzi.length }) });
  else passi.push({ tipo: "ok", testo: T.tr_param_ok });
  if (s.granularita === "api") passi.push({ tipo: "male", testo: T.tr_api });
  else if (s.granularita === "multi") passi.push({ tipo: "avviso", testo: T.tr_multi });
  else passi.push({ tipo: "ok", testo: riempi(T.tr_compito, { nome }) });
  if (s.sovrapposti) passi.push({ tipo: "male", testo: riempi(T.tr_ciclo, { n: s.strumenti }) });
  return passi;
}

/** Reazione dell'agente al messaggio d'errore scelto. */
export function esitoErrore(sc, s) {
  const e = sc.errori.find((x) => x.id === s.errore);
  if (!e) throw new Error(`errore sconosciuto «${s.errore}»`);
  return e;
}

/** Email che arrivano al cliente dopo i clic su "invia follow-up". */
export function emailInviate(s) {
  if (s.clic === 0) return 0;
  return s.idempotenza ? 1 : s.clic;
}

/** Riscontro dei cassetti lettura / azione / orchestrazione. */
export function verificaCassetti(sc, s) {
  const T = sc.testi;
  const nomeCassetto = (id) => sc.cassetti.find((c) => c.id === id).nome;
  const righe = sc.utensili.map((u) => {
    const scelta = s.scelte[u.id] || "";
    const esito = !scelta ? "vuoto" : scelta === u.giusto ? "giusto" : "sbagliato";
    return { id: u.id, esito, testo: riempi(T[`cas_${esito}`], { nome: u.nome, cassetto: nomeCassetto(u.giusto), spiega: u.spiega }) };
  });
  const giuste = righe.filter((r) => r.esito === "giusto").length;
  const sintesi = giuste === righe.length ? T.cas_tutto_giusto : riempi(T.cas_punteggio, { giuste, totali: righe.length });
  return { righe, giuste, totali: righe.length, sintesi };
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  if (!contesto || !contesto.lingua) throw new Error("contesto.lingua mancante");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));

  const s = {
    vista: "scheda", nome: "vago", descrizione: "vaga", parametri: "grezzi", granularita: "api",
    strumenti: sc.strumenti.min, sovrapposti: false, errore: sc.errori[0].id,
    idempotenza: false, clic: 0, scelte: {}, verificato: false,
  };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segmento = (chiave, voci, verticale) => {
    const g = el("div", { class: `segmentato${verticale ? " verticale" : ""}`, role: "group", "aria-label": E[`grp_${chiave}`] },
      ...voci.map(([v, testo]) => el("button", { "data-v": v, onclick: () => cambia({ [chiave]: v }) }, testo)));
    g.dataset.chiave = chiave;
    return g;
  };
  const segVista = segmento("vista", VISTE.map((v) => [v, E[`vista_${v}`]]));
  const segNome = segmento("nome", [["vago", sc.nomi.vago], ["chiaro", sc.nomi.chiaro]]);
  const segDesc = segmento("descrizione", [["vaga", E.vaga], ["chiara", E.chiara]]);
  const segPar = segmento("parametri", [["grezzi", riempi(E.par_grezzi, { n: sc.parametri.grezzi.length })], ["tipizzati", riempi(E.par_tipizzati, { n: sc.parametri.tipizzati.length })]]);
  const segGran = segmento("granularita", GRANULARITA.map((g) => [g, E[`gran_${g}`]]), true);
  const valStrumenti = el("b", {});
  const inStrumenti = el("input", { type: "range", min: sc.strumenti.min, max: sc.strumenti.max, step: 1, "aria-label": E.strumenti });
  inStrumenti.addEventListener("input", () => cambia({ strumenti: Number(inStrumenti.value) }));
  const inSovr = el("input", { type: "checkbox", onchange: (e) => cambia({ sovrapposti: e.target.checked }) });
  const zonaScheda = el("div", {},
    el("h4", {}, E.grp_nome), segNome, el("h4", {}, E.grp_descrizione), segDesc,
    el("h4", {}, E.grp_parametri), segPar, el("h4", {}, E.grp_granularita), segGran,
    el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, E.strumenti), valStrumenti), inStrumenti),
    el("label", { class: "interruttore pericolo" }, el("span", {}, E.sovrapposti), inSovr));
  const segErr = segmento("errore", sc.errori.map((e) => [e.id, e.nome]), true);
  const zonaErrore = el("div", {}, el("p", { class: "nota" }, T.nota_errore), segErr);
  const tendine = {};
  const zonaAzioni = el("div", {}, el("p", { class: "nota" }, T.nota_cassetti));
  for (const u of sc.utensili) {
    const sel = el("select", { class: "scelta", "aria-label": riempi(T.cassetto_per, { nome: u.nome }), onchange: (e) => scegli(u.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.cassetti.map((c) => el("option", { value: c.id }, c.nome)));
    tendine[u.id] = sel;
    zonaAzioni.append(el("label", { class: "scelta-gioco" }, el("code", {}, u.nome), sel));
  }
  const inIdem = el("input", { type: "checkbox", onchange: (e) => cambia({ idempotenza: e.target.checked }) });
  zonaAzioni.append(
    el("button", { class: "btn btn-primario btn-largo", onclick: () => { s.verificato = true; ridisegna(); } }, E.controlla),
    el("h4", {}, E.titolo_idem),
    el("label", { class: "interruttore" }, el("span", {}, E.idempotenza), inIdem),
    el("button", { class: "btn btn-largo", onclick: () => cambia({ clic: 2 }) }, E.doppio_clic),
    el("button", { class: "btn btn-largo", onclick: () => cambia({ clic: 0 }) }, E.ricomincia));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaScheda, zonaErrore, zonaAzioni);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: "0 0 720 420", role: "img", "aria-label": E.descrizione_scena });
  const gScena = svgEl("g");
  svg.append(gScena);
  scena.append(svg);

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  const titoloDestra = el("h3", {});
  const corpo = el("div", { "aria-live": "polite" });
  destra.append(titoloDestra, corpo);
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno
  function scritta(x, y, testo, attr) {
    return testoSvg({ x, y, "font-size": 11, fill: "#17203b", ...attr }, testo);
  }
  function disegnaScheda(g) {
    const p = punteggio(sc, s);
    // la scheda dello strumento
    g.append(svgEl("rect", { x: 16, y: 40, width: 360, height: 340, rx: 16, fill: "#fff", stroke: "#cbd2e3", "stroke-width": 1.5 }));
    g.append(svgEl("rect", { x: 16, y: 40, width: 360, height: 44, rx: 16, fill: s.nome === "vago" ? "#fde68a" : "#c7f9d4" }));
    g.append(scritta(32, 68, sc.nomi[s.nome], { "font-size": 16, "font-weight": 800, "font-family": "monospace" }));
    g.append(scritta(32, 106, E.lbl_descrizione, { "font-size": 9.5, "font-weight": 800, fill: "#5b6684" }));
    aCapo(sc.descrizioni[s.descrizione], 52).slice(0, 4).forEach((r, i) => g.append(scritta(32, 124 + i * 15, r, { "font-size": 11 })));
    g.append(scritta(32, 200, E.lbl_parametri, { "font-size": 9.5, "font-weight": 800, fill: "#5b6684" }));
    const par = s.parametri === "grezzi" ? sc.parametri.grezzi : sc.parametri.tipizzati;
    par.forEach((v, i) => g.append(scritta(32 + (s.parametri === "grezzi" ? (i % 3) * 112 : 0), 220 + (s.parametri === "grezzi" ? Math.floor(i / 3) * 18 : i * 20), v, { "font-size": 10.5, "font-family": "monospace", fill: s.parametri === "grezzi" ? "#92400e" : "#166534" })));
    g.append(scritta(32, 300, E.lbl_granularita, { "font-size": 9.5, "font-weight": 800, fill: "#5b6684" }));
    aCapo(T[`desc_gran_${s.granularita}`], 52).slice(0, 3).forEach((r, i) => g.append(scritta(32, 318 + i * 15, r, { "font-size": 11, fill: s.granularita === "compito" ? "#166534" : "#9f1239" })));
    // misuratore: 20 compiti
    g.append(scritta(548, 40, E.lbl_misuratore, { "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#5b6684" }));
    for (let i = 0; i < p.totale; i++) {
      const cx = 468 + (i % 5) * 40, cy = 70 + Math.floor(i / 5) * 34;
      g.append(svgEl("circle", { cx, cy, r: 13, fill: i < p.corrette ? "#16a34a" : "#e11d48", "fill-opacity": i < p.corrette ? ".85" : ".75" }));
      g.append(scritta(cx, cy + 4, i < p.corrette ? "✓" : "✗", { "text-anchor": "middle", fill: "#fff", "font-weight": 800 }));
    }
    g.append(scritta(548, 225, riempi(T.su_venti, { n: p.corrette, tot: p.totale }), { "text-anchor": "middle", "font-size": 20, "font-weight": 800 }));
    g.append(scritta(548, 242, E.illustrativo, { "text-anchor": "middle", "font-size": 9.5, fill: "#5b6684" }));
    // la cassetta degli attrezzi
    g.append(scritta(548, 272, riempi(T.cassetta, { n: s.strumenti }), { "text-anchor": "middle", "font-size": 10.5, "font-weight": 700, fill: "#5b6684" }));
    const colori = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#e11d48", "#6366f1", "#14b8a6", "#f97316"];
    for (let i = 0; i < s.strumenti; i++) {
      const x = 420 + (i % 10) * 26, y = 284 + Math.floor(i / 10) * 26;
      g.append(svgEl("rect", { x, y, width: 20, height: 20, rx: 5, fill: s.sovrapposti ? "#94a3b8" : colori[i % colori.length] }));
    }
    if (p.ciclo) {
      g.append(svgEl("path", { d: "M 640 352 a 22 22 0 1 1 -6 -15", fill: "none", stroke: "#e11d48", "stroke-width": 4 }));
      g.append(svgEl("path", { d: "M 628 330 l 9 7 l -10 5 z", fill: "#e11d48" }));
      g.append(scritta(548, 404, E.ciclo, { "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#e11d48" }));
    }
  }
  function disegnaErrore(g) {
    const e = esitoErrore(sc, s);
    const colore = { ok: "#16a34a", avviso: "#d97706", male: "#e11d48" }[e.esito];
    const box = (x, titolo, sotto, fill) => {
      g.append(svgEl("rect", { x, y: 70, width: 170, height: 80, rx: 14, fill, stroke: "#cbd2e3", "stroke-width": 1.5 }));
      g.append(scritta(x + 85, 104, titolo, { "text-anchor": "middle", "font-size": 13, "font-weight": 800 }));
      g.append(scritta(x + 85, 124, sotto, { "text-anchor": "middle", "font-size": 10, fill: "#5b6684" }));
    };
    box(20, E.agente, E.agente_sotto, "#eef0ff");
    box(275, E.strumento, sc.nomi.chiaro_crm, "#fff");
    box(530, E.crm, E.crm_sotto, "#f1f5f9");
    g.append(svgEl("path", { d: "M 190 100 L 270 100", stroke: "#4f46e5", "stroke-width": 2.5, "marker-end": "url(#sc-freccia)" }));
    g.append(svgEl("path", { d: "M 445 100 L 525 100", stroke: "#4f46e5", "stroke-width": 2.5, "marker-end": "url(#sc-freccia)" }));
    g.append(scritta(360, 50, T.chiamata, { "text-anchor": "middle", "font-size": 11, "font-family": "monospace", fill: "#3730a3" }));
    if (e.id === "sempre_ok") g.append(scritta(615, 170, E.contatto_assente, { "text-anchor": "middle", "font-size": 10.5, "font-weight": 800, fill: "#e11d48" }));
    // il messaggio torna al modello
    g.append(svgEl("rect", { x: 40, y: 200, width: 640, height: 92, rx: 14, fill: "#0f172a" }));
    g.append(scritta(56, 222, E.torna_al_modello, { "font-size": 9.5, "font-weight": 800, fill: "#94a3b8" }));
    aCapo(e.messaggio, 92).slice(0, 4).forEach((r, i) => g.append(scritta(56, 242 + i * 15, r, { "font-size": 11, "font-family": "monospace", fill: "#e2e8f0" })));
    g.append(svgEl("path", { d: "M 360 196 L 360 156", stroke: "#94a3b8", "stroke-width": 2, "stroke-dasharray": "4 3" }));
    g.append(svgEl("rect", { x: 40, y: 312, width: 640, height: 80, rx: 14, fill: "#fff", stroke: colore, "stroke-width": 2.5 }));
    g.append(scritta(56, 334, E.cosa_fa, { "font-size": 9.5, "font-weight": 800, fill: colore }));
    aCapo(e.reazione, 96).slice(0, 3).forEach((r, i) => g.append(scritta(56, 354 + i * 15, r, { "font-size": 11 })));
  }
  function disegnaAzioni(g) {
    sc.cassetti.forEach((c, i) => {
      const x = 16 + i * 236;
      g.append(svgEl("rect", { x, y: 30, width: 220, height: 220, rx: 14, fill: c.colore, "fill-opacity": ".08", stroke: c.colore, "stroke-width": 1.5 }));
      g.append(svgEl("rect", { x, y: 30, width: 220, height: 6, rx: 3, fill: c.colore }));
      g.append(scritta(x + 110, 58, c.nome, { "text-anchor": "middle", "font-size": 13, "font-weight": 800 }));
      aCapo(c.spiega, 36).slice(0, 2).forEach((r, k) => g.append(scritta(x + 110, 76 + k * 13, r, { "text-anchor": "middle", "font-size": 9.5, fill: "#5b6684" })));
      sc.utensili.filter((u) => s.scelte[u.id] === c.id).forEach((u, k) => {
        const esito = s.verificato ? (u.giusto === c.id ? "#16a34a" : "#e11d48") : "#cbd2e3";
        g.append(svgEl("rect", { x: x + 14, y: 110 + k * 32, width: 192, height: 26, rx: 8, fill: "#fff", stroke: esito, "stroke-width": 2 }));
        g.append(scritta(x + 110, 127 + k * 32, u.nome, { "text-anchor": "middle", "font-size": 10.5, "font-family": "monospace" }));
      });
    });
    // idempotenza: la casella del cliente
    const n = emailInviate(s);
    g.append(svgEl("rect", { x: 16, y: 270, width: 688, height: 130, rx: 14, fill: "#fff", stroke: n > 1 ? "#e11d48" : "#cbd2e3", "stroke-width": n > 1 ? 2.5 : 1.5 }));
    g.append(scritta(32, 294, T.casella, { "font-size": 12, "font-weight": 800 }));
    for (let i = 0; i < n; i++) {
      const x = 40 + i * 90;
      g.append(svgEl("rect", { x, y: 310, width: 70, height: 46, rx: 6, fill: "#eef0ff", stroke: "#4f46e5", "stroke-width": 1.5 }));
      g.append(svgEl("path", { d: `M ${x} 310 L ${x + 35} 336 L ${x + 70} 310`, fill: "none", stroke: "#4f46e5", "stroke-width": 1.5 }));
    }
    g.append(scritta(260, 330, riempi(T.email_arrivate, { n }), { "font-size": 13, "font-weight": 800, fill: n > 1 ? "#e11d48" : "#17203b" }));
    g.append(scritta(260, 350, s.idempotenza ? T.chiave_idem : T.senza_idem, { "font-size": 10.5, fill: "#5b6684" }));
    g.append(scritta(32, 388, riempi(T.clic_fatti, { n: s.clic }), { "font-size": 10, fill: "#5b6684" }));
  }
  function disegnaScena() {
    gScena.replaceChildren();
    gScena.append(svgEl("defs", {}, `<marker id="sc-freccia" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#4f46e5"/></marker>`));
    const g = svgEl("g", { class: ridotto ? "" : "entra-svg" });
    gScena.append(g);
    g.append(scritta(360, 20, E[`titolo_scena_${s.vista}`], { "text-anchor": "middle", "font-size": 11.5, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }));
    if (s.vista === "scheda") disegnaScheda(g);
    else if (s.vista === "errore") disegnaErrore(g);
    else disegnaAzioni(g);
  }
  function disegnaDestra() {
    if (s.vista === "scheda") {
      titoloDestra.textContent = E.titolo_traccia;
      const p = punteggio(sc, s);
      corpo.replaceChildren(
        el("p", { class: "nota" }, riempi(T.compito, { compito: sc.compito })),
        el("div", { class: "traccia" }, traccia(sc, s).map((x) => el("div", { class: `passo-traccia ${x.tipo}` }, x.testo))),
        el("p", { class: "nota" }, riempi(T.sintesi_punteggio, { n: p.corrette, tot: p.totale })),
        el("p", { class: "nota" }, T.equilibrio));
    } else if (s.vista === "errore") {
      titoloDestra.textContent = E.titolo_errore;
      const e = esitoErrore(sc, s);
      corpo.replaceChildren(el("div", { class: "messaggio" }, e.messaggio),
        el("div", { class: `esito-scheda ${e.esito === "ok" ? "ok" : e.esito === "avviso" ? "avviso" : "male"}`, style: "margin-top:10px" }, el("div", {}, e.reazione)),
        el("p", { class: "nota" }, T.nota_errore_destra));
    } else {
      titoloDestra.textContent = E.titolo_azioni;
      const figli = [];
      if (s.verificato) {
        const v = verificaCassetti(sc, s);
        figli.push(el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
          el("div", { class: "verifica" }, v.righe.map((r) => el("div", { class: `riga ${r.esito}` }, r.testo))));
      } else figli.push(el("p", { class: "nota" }, T.nota_cassetti_destra));
      const n = emailInviate(s);
      figli.push(el("h4", {}, E.titolo_idem), el("div", { class: "grande" }, String(n)),
        el("p", { class: "nota" }, n > 1 ? T.doppione : s.idempotenza ? T.idem_ok : T.idem_spiega));
      corpo.replaceChildren(...figli);
    }
    if (!ridotto) corpo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
  }
  function aggiornaComandi() {
    for (const g of [segVista, segNome, segDesc, segPar, segGran, segErr]) {
      g.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === String(s[g.dataset.chiave]))));
    }
    inStrumenti.value = s.strumenti;
    valStrumenti.textContent = String(s.strumenti);
    inSovr.checked = s.sovrapposti;
    inIdem.checked = s.idempotenza;
    zonaScheda.classList.toggle("nascosto", s.vista !== "scheda");
    zonaErrore.classList.toggle("nascosto", s.vista !== "errore");
    zonaAzioni.classList.toggle("nascosto", s.vista !== "azioni");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }
  function ridisegna() {
    aggiornaComandi();
    disegnaScena();
    disegnaDestra();
  }
  function cambia(diff) {
    Object.assign(s, diff);
    if ("scelte" in diff) s.verificato = false;
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
    if (!(nuovo.nome in sc.nomi) || !["vago", "chiaro"].includes(nuovo.nome)) throw new Error(`stato_animazione: nome sconosciuto «${nuovo.nome}»`);
    if (!["vaga", "chiara"].includes(nuovo.descrizione)) throw new Error(`stato_animazione: descrizione sconosciuta «${nuovo.descrizione}»`);
    if (!["grezzi", "tipizzati"].includes(nuovo.parametri)) throw new Error(`stato_animazione: parametri sconosciuti «${nuovo.parametri}»`);
    if (!GRANULARITA.includes(nuovo.granularita)) throw new Error(`stato_animazione: granularita sconosciuta «${nuovo.granularita}»`);
    if (!(nuovo.strumenti >= sc.strumenti.min && nuovo.strumenti <= sc.strumenti.max)) throw new Error(`stato_animazione: strumenti fuori scala «${nuovo.strumenti}»`);
    if (!sc.errori.some((e) => e.id === nuovo.errore)) throw new Error(`stato_animazione: errore sconosciuto «${nuovo.errore}»`);
    if (![0, 1, 2].includes(nuovo.clic)) throw new Error(`stato_animazione: clic fuori scala «${nuovo.clic}»`);
    for (const [id, c] of Object.entries(nuovo.scelte)) {
      if (!sc.utensili.some((u) => u.id === id)) throw new Error(`stato_animazione: «${id}» non e' uno strumento del gioco`);
      if (!sc.cassetti.some((x) => x.id === c)) throw new Error(`stato_animazione: cassetto sconosciuto «${c}»`);
    }
    Object.assign(s, nuovo);
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo */ },
    _prova: { stato: s, punteggio: () => punteggio(sc, s), traccia: () => traccia(sc, s), verifica: () => verificaCassetti(sc, s) },
  };
}
