// Lezione interattiva "I raggi X" (P4.5): l'agente di classificazione legge tre contenuti esterni (un'email, la bolla
// di carico allegata a un riordino, la pagina web di un lead). Nella bolla c'e' un'istruzione ostile scritta in bianco
// su bianco (prompt injection indiretta), mescolata a righe nascoste innocue (esche). Lo studente accende i raggi X,
// scova la riga ostile, poi lancia l'agente con tre configurazioni (permessi ampi / minimo privilegio / regole fisse
// con conferma umana) e sposta la chiave del CRM dal prompt al caveau. Logica pura e deterministica; testi nello scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "raggi_x";
const FOGLIO = { x: 40, y: 58, w: 640, h: 344, riga0: 104, passo: 40 };
const TRACCIA = { x: 24, y0: 66, w: 430, h: 50, passo: 62 };
const USCITA = { x: 478, y: 66, w: 222, h: 298 };
const CONFIG = ["ampi", "minimo", "regole"];

const STILE = `
.lz-raggi_x .riga-doc { cursor: pointer; }
.lz-raggi_x .riga-doc:focus-visible rect { stroke: #4f46e5; stroke-width: 2.5; }
.lz-raggi_x .elenco-strumenti { display: flex; flex-wrap: wrap; gap: 5px; margin: 6px 0 10px; }
.lz-raggi_x .elenco-strumenti code { font-family: var(--mono); font-size: .74rem; padding: .15em .5em; border-radius: 7px; background: #eef1f8; }
.lz-raggi_x .elenco-strumenti code.azione { background: #fff1e6; color: #9a3412; }
.lz-raggi_x .prompt { font-family: var(--mono); font-size: .74rem; background: #0f172a; color: #e2e8f0; border-radius: 10px; padding: 9px 10px; display: grid; gap: 3px; }
.lz-raggi_x .prompt .chiave { color: #fda4af; font-weight: 700; }
.lz-raggi_x .caveau { margin-top: 6px; font-size: .8rem; padding: 7px 10px; border-radius: 10px; background: #ecfdf5; color: #065f46; border: 1px dashed #34d399; }
.lz-raggi_x .etichetta-piccola { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--tenue-2, #7a849e); margin-top: 10px; }
.lz-raggi_x .nota { font-size: .78rem; color: var(--tenue); margin: 6px 0 0; }
.lz-raggi_x .passo-traccia { font-size: .8rem; padding: 6px 9px; border-radius: 9px; background: #f7f8fe; margin-top: 5px; }
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

/** Righe del documento aperto: con i raggi X spenti le righe nascoste ci sono ma non si vedono (bianco su bianco). */
export function righe(sc, s) {
  const doc = sc.documenti.find((d) => d.id === s.doc_aperto);
  return doc.righe.map((r, i) => ({ ...r, indice: i, visibile: !r.nascosta || s.raggi }));
}

/** Riscontro sulla riga scelta dallo studente nel gioco "scova l'iniezione". */
export function valutaScelta(sc, s) {
  const T = sc.testi;
  if (!s.scelta) return { esito: "nessuna", testo: s.raggi ? T.scova_invito : T.scova_spento };
  const doc = sc.documenti.find((d) => d.righe.some((r) => r.id === s.scelta));
  const r = doc.righe.find((x) => x.id === s.scelta);
  if (r.ostile) return { esito: "giusta", testo: riempi(T.scova_giusta, { documento: doc.nome }) };
  if (r.nascosta) return { esito: "esca", testo: riempi(T.scova_esca, { spiega: r.spiega }) };
  return { esito: "visibile", testo: T.scova_visibile };
}

/** Cosa succede quando l'agente legge la bolla di carico, con la configurazione scelta. */
export function traccia(sc, s) {
  const T = sc.testi;
  const cfg = sc.configurazioni[s.config];
  const ha = (id) => cfg.strumenti.includes(id);
  const chiaveNelPrompt = s.segreti === "prompt";
  const passi = [];
  passi.push({ id: "leggi", strumento: "leggi_documento", esito: "ok", contaminato: true, testo: T.p_leggi });
  passi.push({ id: "modello", strumento: null, esito: "ok", contaminato: true, testo: T.p_modello });
  passi.push({ id: "crm", strumento: "aggiorna_crm", esito: "ok", contaminato: false, testo: T.p_crm });
  let usciti = 0;
  let chiave = false;
  let anomalie = 0;
  // 1) esportare tutti i contatti
  let esitoExport;
  if (!ha("esporta_contatti")) { esitoExport = "inesistente"; anomalie += 1; }
  else if (cfg.regole) { esitoExport = "bloccato"; anomalie += 1; }
  else esitoExport = "ok";
  passi.push({ id: "esporta", strumento: "esporta_contatti", esito: esitoExport, contaminato: true,
    testo: riempi(T[`p_esporta_${esitoExport}`], { n: sc.contatti_totali }) });
  // 2) inviare all'indirizzo esterno scritto nella riga nascosta
  let esitoInvio;
  if (!ha("invia_email_esterna")) { esitoInvio = "inesistente"; anomalie += 1; }
  else if (cfg.regole) { esitoInvio = "conferma"; anomalie += 1; }
  else esitoInvio = "ok";
  if (esitoInvio === "ok") {
    usciti = esitoExport === "ok" ? sc.contatti_totali : 0;
    chiave = chiaveNelPrompt;
  }
  passi.push({ id: "invia", strumento: "invia_email_esterna", esito: esitoInvio, contaminato: true,
    testo: riempi(T[`p_invia_${esitoInvio}`], { n: usciti, chiave: chiave ? T.con_chiave : "" }) });
  const allarme = usciti > 0 || chiave ? "rosso" : "verde";
  const chiave_esposta = chiaveNelPrompt; // il modello la vede: e' a rischio anche se oggi non esce
  const sintesi = allarme === "rosso"
    ? riempi(chiave ? T.esito_rosso_chiave : T.esito_rosso, { n: usciti })
    : riempi(T[`esito_${s.config}`], { anomalie });
  return { passi, usciti, chiave, chiave_esposta, anomalie, allarme, sintesi, lavoro_fatto: true };
}

/** Coordinate dei passi della traccia nella scena: dentro il riquadro 720 x 412. */
export function posizioniTraccia(sc, s) {
  return traccia(sc, s).passi.map((p, i) => ({ id: p.id, x: TRACCIA.x, y: TRACCIA.y0 + i * TRACCIA.passo, w: TRACCIA.w, h: TRACCIA.h }));
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  if (!contesto || !contesto.lingua) throw new Error("contesto.lingua mancante");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));

  const s = { vista: "documenti", raggi: false, doc_aperto: "bolla", scelta: null, config: "ampi", segreti: "prompt" };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    el("button", { "data-v": "documenti", onclick: () => cambia({ vista: "documenti" }) }, E.vista_documenti),
    el("button", { "data-v": "agente", onclick: () => cambia({ vista: "agente" }) }, E.vista_agente));
  const segDoc = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.documento },
    ...sc.documenti.map((d) => el("button", { "data-v": d.id, onclick: () => cambia({ doc_aperto: d.id }) }, d.nome)));
  const inRaggi = el("input", { type: "checkbox", onchange: (e) => cambia({ raggi: e.target.checked }) });
  const zonaDoc = el("div", {}, el("h4", {}, E.documento), segDoc,
    el("label", { class: "interruttore" }, el("span", {}, E.raggi), inRaggi),
    el("p", { class: "nota" }, T.nota_raggi));
  const segConfig = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.permessi },
    ...CONFIG.map((c) => el("button", { "data-v": c, onclick: () => cambia({ config: c }) }, sc.configurazioni[c].nome)));
  const segSegreti = el("div", { class: "segmentato", role: "group", "aria-label": E.segreti },
    el("button", { "data-v": "prompt", onclick: () => cambia({ segreti: "prompt" }) }, E.segreti_prompt),
    el("button", { "data-v": "caveau", onclick: () => cambia({ segreti: "caveau" }) }, E.segreti_caveau));
  const notaConfig = el("p", { class: "nota" });
  const zonaAgente = el("div", {}, el("h4", {}, E.permessi), segConfig, notaConfig, el("h4", {}, E.segreti), segSegreti);
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaDoc, zonaAgente);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: "0 0 720 412", role: "img", "aria-label": E.descrizione_scena });
  const titoloScena = testoSvg({ x: 360, y: 30, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, "");
  const gDoc = svgEl("g");
  const gAgente = svgEl("g");
  svg.append(titoloScena, gDoc, gAgente);
  scena.append(svg);

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  const esito = el("div", { "aria-live": "polite" });
  const dettagli = el("div", {});
  destra.append(el("h3", {}, E.titolo_scheda), esito, dettagli);
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  function disegnaDocumento() {
    const doc = sc.documenti.find((d) => d.id === s.doc_aperto);
    const figli = [];
    figli.push(svgEl("rect", { x: FOGLIO.x, y: FOGLIO.y, width: FOGLIO.w, height: FOGLIO.h, rx: 10, fill: "#ffffff", stroke: s.raggi ? "#7c3aed" : "#d5dbea", "stroke-width": s.raggi ? 2 : 1.2 }));
    figli.push(testoSvg({ x: FOGLIO.x + 18, y: FOGLIO.y + 22, "font-size": 10.5, fill: "#5b6684", "font-weight": 700 }, `${E.da}: ${doc.mittente}`));
    figli.push(testoSvg({ x: FOGLIO.x + FOGLIO.w - 18, y: FOGLIO.y + 22, "text-anchor": "end", "font-size": 10.5, fill: s.raggi ? "#7c3aed" : "#94a3b8", "font-weight": 800 }, s.raggi ? E.raggi_accesi : E.raggi_spenti));
    for (const r of righe(sc, s)) {
      const y = FOGLIO.riga0 + r.indice * FOGLIO.passo;
      const scelta = s.scelta === r.id;
      const g = svgEl("g", { class: "riga-doc", tabindex: "0", role: "button", "aria-label": r.visibile ? riempi(T.scegli_riga, { testo: r.testo }) : T.riga_vuota });
      const evid = r.nascosta && s.raggi;
      g.append(svgEl("rect", { x: FOGLIO.x + 10, y: y - 20, width: FOGLIO.w - 20, height: 30, rx: 7,
        fill: scelta ? (r.ostile ? "#fdecef" : "#fff5e6") : evid ? "#f5f3ff" : "#ffffff",
        stroke: scelta ? (r.ostile ? "#e11d48" : "#d97706") : evid ? "#a78bfa" : "transparent", "stroke-dasharray": evid && !scelta ? "4 3" : "" }));
      // bianco su bianco: senza raggi X il testo nascosto e' davvero bianco
      g.append(testoSvg({ x: FOGLIO.x + 22, y, "font-size": r.indice === 0 ? 12.5 : 11.5, "font-weight": r.indice === 0 ? 800 : 500,
        fill: r.nascosta ? (s.raggi ? "#5b21b6" : "#ffffff") : "#17203b" }, accorcia(r.testo, 92)));
      if (evid) g.append(testoSvg({ x: FOGLIO.x + FOGLIO.w - 22, y: y - 4, "text-anchor": "end", "font-size": 8.5, "font-weight": 800, fill: "#7c3aed" }, E.nascosto));
      const scegli = () => cambia({ scelta: r.id }, true);
      g.addEventListener("click", scegli);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); scegli(); } });
      figli.push(g);
    }
    gDoc.replaceChildren(...figli);
  }

  const COLORE = { ok: "#16a34a", inesistente: "#64748b", bloccato: "#0ea5e9", conferma: "#d97706" };
  function disegnaAgente() {
    const t = traccia(sc, s);
    const pos = posizioniTraccia(sc, s);
    const figli = [];
    t.passi.forEach((p, i) => {
      const P = pos[i];
      const pericolo = p.esito === "ok" && (p.id === "esporta" || p.id === "invia");
      const colore = pericolo ? "#e11d48" : COLORE[p.esito];
      figli.push(svgEl("rect", { x: P.x, y: P.y, width: P.w, height: P.h, rx: 10, fill: "#fff", stroke: colore, "stroke-width": pericolo ? 2.5 : 1.5 }));
      figli.push(svgEl("rect", { x: P.x, y: P.y, width: 6, height: P.h, rx: 3, fill: colore }));
      figli.push(testoSvg({ x: P.x + 16, y: P.y + 19, "font-size": 11, "font-weight": 800, fill: "#17203b", "font-family": p.strumento ? "monospace" : "" }, p.strumento || E.modello));
      figli.push(testoSvg({ x: P.x + 16, y: P.y + 37, "font-size": 10, fill: "#5b6684" }, accorcia(p.testo, 74)));
      figli.push(testoSvg({ x: P.x + P.w - 10, y: P.y + 19, "text-anchor": "end", "font-size": 9.5, "font-weight": 800, fill: colore }, pericolo ? E.esito_pericolo : E[`esito_${p.esito}`]));
      if (p.contaminato) figli.push(svgEl("circle", { cx: P.x + P.w - 12, cy: P.y + 34, r: 5, fill: "#f97316" }));
      if (i < t.passi.length - 1) figli.push(svgEl("line", { x1: P.x + 30, y1: P.y + P.h, x2: P.x + 30, y2: P.y + TRACCIA.passo, stroke: "#cbd2e3", "stroke-width": 2 }));
    });
    const rosso = t.allarme === "rosso";
    figli.push(svgEl("rect", { x: USCITA.x, y: USCITA.y, width: USCITA.w, height: USCITA.h, rx: 14, fill: rosso ? "#fdecef" : "#ecfdf5", stroke: rosso ? "#e11d48" : "#34d399", "stroke-width": 2, "stroke-dasharray": "6 4" }));
    figli.push(testoSvg({ x: USCITA.x + USCITA.w / 2, y: USCITA.y + 26, "text-anchor": "middle", "font-size": 11.5, "font-weight": 800, fill: "#17203b" }, E.uscita));
    figli.push(testoSvg({ x: USCITA.x + USCITA.w / 2, y: USCITA.y + 110, "text-anchor": "middle", "font-size": 40, "font-weight": 900, fill: rosso ? "#e11d48" : "#16a34a" }, String(t.usciti)));
    figli.push(testoSvg({ x: USCITA.x + USCITA.w / 2, y: USCITA.y + 134, "text-anchor": "middle", "font-size": 10.5, fill: "#5b6684" }, E.contatti_usciti));
    figli.push(testoSvg({ x: USCITA.x + USCITA.w / 2, y: USCITA.y + 190, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: t.chiave ? "#e11d48" : t.chiave_esposta ? "#d97706" : "#16a34a" }, t.chiave ? E.chiave_uscita : t.chiave_esposta ? E.chiave_esposta : E.chiave_salva));
    figli.push(testoSvg({ x: USCITA.x + USCITA.w / 2, y: USCITA.y + 250, "text-anchor": "middle", "font-size": 10.5, fill: "#5b6684" }, riempi(T.anomalie, { n: t.anomalie })));
    figli.push(svgEl("circle", { cx: USCITA.x + 22, cy: USCITA.y + USCITA.h + 26, r: 5, fill: "#f97316" }));
    figli.push(testoSvg({ x: USCITA.x + 32, y: USCITA.y + USCITA.h + 30, "font-size": 9.5, fill: "#5b6684" }, E.legenda_contaminato));
    gAgente.replaceChildren(...figli);
    if (!ridotto && rosso) gAgente.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 300 });
  }

  function disegnaDestra() {
    if (s.vista === "documenti") {
      const v = valutaScelta(sc, s);
      const classe = v.esito === "giusta" ? "ok" : v.esito === "nessuna" ? "neutro" : "avviso";
      esito.replaceChildren(el("div", { class: `esito-scheda ${classe}` }, el("div", {}, v.testo)));
      const doc = sc.documenti.find((d) => d.id === s.doc_aperto);
      const nascoste = doc.righe.filter((r) => r.nascosta).length;
      dettagli.replaceChildren(el("p", { class: "nota" }, s.raggi ? riempi(T.conta_nascoste, { n: nascoste }) : T.nota_documento));
      return;
    }
    const t = traccia(sc, s);
    esito.replaceChildren(el("div", { class: `esito-scheda ${t.allarme === "rosso" ? "male" : "ok"}` }, el("div", {}, t.sintesi)));
    const cfg = sc.configurazioni[s.config];
    const prompt = el("div", { class: "prompt" }, ...sc.prompt.map((r) => el("div", {}, r)));
    if (s.segreti === "prompt") prompt.append(el("div", { class: "chiave" }, `${E.chiave_crm}: ${sc.chiave}`));
    dettagli.replaceChildren(
      el("div", { class: "etichetta-piccola" }, E.strumenti_agente),
      el("div", { class: "elenco-strumenti" }, ...cfg.strumenti.map((id) => el("code", { class: sc.strumenti_azione.includes(id) ? "azione" : "" }, id))),
      el("div", { class: "etichetta-piccola" }, E.cosa_vede),
      prompt,
      s.segreti === "caveau" ? el("div", { class: "caveau" }, T.nota_caveau) : el("p", { class: "nota", style: "color:#9f1239" }, T.nota_prompt),
      el("div", { class: "etichetta-piccola" }, E.traccia),
      ...t.passi.filter((p) => p.id === "esporta" || p.id === "invia").map((p) => el("div", { class: "passo-traccia" }, el("b", {}, `${p.strumento}: `), p.testo)));
  }

  function aggiornaComandi() {
    const premi = (seg, v) => seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
    premi(segVista, s.vista); premi(segDoc, s.doc_aperto); premi(segConfig, s.config); premi(segSegreti, s.segreti);
    inRaggi.checked = s.raggi;
    notaConfig.textContent = sc.configurazioni[s.config].spiega;
    zonaDoc.classList.toggle("nascosto", s.vista !== "documenti");
    zonaAgente.classList.toggle("nascosto", s.vista !== "agente");
    gDoc.setAttribute("display", s.vista === "documenti" ? "inline" : "none");
    gAgente.setAttribute("display", s.vista === "agente" ? "inline" : "none");
    titoloScena.textContent = s.vista === "documenti" ? E.titolo_documenti : E.titolo_agente;
  }

  function ridisegna() {
    aggiornaComandi();
    if (s.vista === "documenti") disegnaDocumento(); else disegnaAgente();
    disegnaDestra();
  }
  function cambia(diff) {
    Object.assign(s, diff);
    ridisegna();
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    if (!["documenti", "agente"].includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!sc.documenti.some((d) => d.id === nuovo.doc_aperto)) throw new Error(`stato_animazione: documento sconosciuto «${nuovo.doc_aperto}»`);
    if (nuovo.scelta !== null && !sc.documenti.some((d) => d.righe.some((r) => r.id === nuovo.scelta))) throw new Error(`stato_animazione: riga sconosciuta «${nuovo.scelta}»`);
    if (!CONFIG.includes(nuovo.config)) throw new Error(`stato_animazione: configurazione sconosciuta «${nuovo.config}»`);
    if (!["prompt", "caveau"].includes(nuovo.segreti)) throw new Error(`stato_animazione: segreti «${nuovo.segreti}» non previsto`);
    if (typeof nuovo.raggi !== "boolean") throw new Error("stato_animazione: raggi deve essere vero o falso");
    Object.assign(s, nuovo);
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo */ },
    _prova: { stato: s, traccia: () => traccia(sc, s), valutaScelta: () => valutaScelta(sc, s) },
  };
}
