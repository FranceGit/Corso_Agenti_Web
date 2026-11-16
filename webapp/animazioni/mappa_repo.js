// Lezione interattiva "La mappa del repo" (PO2.1, Officina O2). L'albero dei file del repo adottato
// (patowari/AI-Enhanced-Sales-Campaign-CRM, copia in esercizi/officina/materiale/o2/crm_adottato): lo studente apre i
// file e la mappa si colora per tappa (ingresso, dipendenze, configurazione, flusso); aprire un file saltando una
// tappa da' un avviso. Una lente mostra le righe chiave vere del file aperto; «Esegui subito» mostra che cosa succede
// a lanciare il repo senza averlo letto; «Segui un lead» fa percorrere a Sarah Chen il repo, da main.py al report,
// riempiendo la sua scheda. Gli indizi veri (chiave all'import, ripiego silenzioso, sleep in un endpoint async,
// dipendenze senza versione, README contro codice, ordine dei controlli) si accendono quando si aprono i file giusti.
// Gioco finale "Decidi tu": sei osservazioni, difetto da segnalare o dettaglio innocuo. Tutti i testi dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "mappa_repo";
const VISTE = ["mappa", "decidi"];
const W = 720, H = 450;
const ALB = { x: 14, y0: 54, passo: 16, rientro: 14, pista: 266 };
const LENTE = { x: 292, y: 44, w: 414, h: 196, codice: 54, nota: 66 };
const TAPPE_UI = { y: 250, h: 30, scarto: 8 };
const SCHEDA = { y: 290, h: 150, valore: 46 };
const CASO = { x: 20, y0: 50, passo: 66, w: 680, h: 58, caratteri: 104 };
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const COLORI = { ok: "#16a34a", avviso: "#d97706", male: "#e11d48", tenue: "#5b6684", scuro: "#17203b", bordo: "#cbd2e3" };

const STILE = `
.lz-mappa_repo .comandi-file { display: grid; gap: 6px; margin: 6px 0 10px; }
.lz-mappa_repo .comandi-file select { width: 100%; }
.lz-mappa_repo .fila-btn-mr { display: grid; gap: 6px; }
.lz-mappa_repo .fila-btn-mr .btn { justify-content: center; }
.lz-mappa_repo .riga-albero { cursor: pointer; }
.lz-mappa_repo .riga-albero:focus-visible rect { stroke: #4f46e5; stroke-width: 2; }
.lz-mappa_repo .esiti-mappa { margin-top: 10px; border-top: 1px solid #dfe4f0; padding: 10px 4px 2px; }
.lz-mappa_repo .esiti-mappa h4 { margin: 0 0 6px; font-size: .8rem; text-transform: uppercase; letter-spacing: .07em; color: var(--tenue); }
.lz-mappa_repo .esiti-elenco-mr { display: grid; gap: 5px; max-height: 200px; overflow-y: auto; padding-right: 4px; }
.lz-mappa_repo .esiti-elenco-mr div { font-size: .78rem; padding: 6px 9px; border-radius: 9px; overflow-wrap: anywhere; }
.lz-mappa_repo .esiti-elenco-mr .ok { background: var(--ok-chiaro); color: #166534; }
.lz-mappa_repo .esiti-elenco-mr .avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-mappa_repo .esiti-elenco-mr .male { background: var(--male-chiaro); color: #9f1239; }
.lz-mappa_repo .esiti-elenco-mr .neutro { background: #f1f5f9; color: #334155; }
.lz-mappa_repo .tappe-mr { list-style: none; padding: 0; margin: 4px 0 10px; display: grid; gap: 4px; font-size: .84rem; }
.lz-mappa_repo .tappe-mr li { display: flex; gap: 8px; align-items: baseline; }
.lz-mappa_repo .tappe-mr .segno-mr { width: 1.1em; font-weight: 800; flex: 0 0 auto; }
.lz-mappa_repo .tappe-mr .fatta .segno-mr { color: var(--ok); }
.lz-mappa_repo .indizi-mr { display: grid; gap: 5px; margin: 4px 0 10px; }
.lz-mappa_repo .indizi-mr div { font-size: .8rem; padding: 6px 9px; border-radius: 9px; background: var(--avviso-chiaro); color: #92400e; }
.lz-mappa_repo .contatore-mr { font-weight: 700; font-size: .86rem; margin: 6px 0 2px; }
.lz-mappa_repo .nota-mr { font-size: .8rem; color: var(--tenue); margin: 4px 0; }
.lz-mappa_repo .regola-mr { margin-top: 10px; padding: 8px 10px; border-left: 4px solid #4f46e5; background: #eef2ff; border-radius: 0 10px 10px 0; font-weight: 700; font-size: .84rem; }
.lz-mappa_repo .scelta-mr { display: grid; gap: 3px; margin: 8px 0; font-size: .82rem; }
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
/** Spezza un testo in righe di al massimo n caratteri (a parole; una parola piu' lunga di n viene spezzata). */
export function aCapo(testo, n) {
  const righe = [];
  let riga = "";
  for (let p of String(testo).split(" ")) {
    while (p.length > n) { if (riga) { righe.push(riga); riga = ""; } righe.push(p.slice(0, n)); p = p.slice(n); }
    if (riga && (riga + " " + p).length > n) { righe.push(riga); riga = p; } else riga = riga ? `${riga} ${p}` : p;
  }
  if (riga) righe.push(riga);
  return righe;
}

// ------------------------------------------------------------------ logica (pura)

export function fileDi(sc, id) {
  const f = sc.file.find((x) => x.id === id);
  if (!f) throw new Error(`file sconosciuto «${id}»`);
  return f;
}
export function tappaDi(sc, id) {
  return sc.tappe.find((t) => t.id === id);
}
/** Rango di lettura del file: 0 documento, 1 ingresso, 2 dipendenze, 3 configurazione, 4 flusso. */
export function rangoFile(sc, id) {
  return tappaDi(sc, fileDi(sc, id).tappa).rango;
}
/** Le tappe di codice (rango >= 1), in ordine. */
export function tappeCodice(sc) {
  return sc.tappe.filter((t) => t.rango >= 1).sort((a, b) => a.rango - b.rango);
}
/** Esito dell'apertura di un file dopo i file gia' aperti: ok, documento, salto (con le tappe mancanti) o ripasso. */
export function esitoApertura(sc, precedenti, id) {
  if (precedenti.includes(id)) return { tipo: "ripasso", mancanti: [] };
  const r = rangoFile(sc, id);
  if (r === 0) return { tipo: "documento", mancanti: [] };
  const coperti = new Set(precedenti.map((p) => rangoFile(sc, p)));
  const mancanti = tappeCodice(sc).filter((t) => t.rango < r && !coperti.has(t.rango)).map((t) => t.id);
  return { tipo: mancanti.length ? "salto" : "ok", mancanti };
}
/** Tappe di codice coperte dai file aperti. */
export function tappeCoperte(sc, aperti) {
  const ranghi = new Set(aperti.map((id) => rangoFile(sc, id)));
  return tappeCodice(sc).filter((t) => ranghi.has(t.rango)).map((t) => t.id);
}
/** Quanti file sono stati aperti saltando una tappa. */
export function salti(sc, aperti) {
  return aperti.filter((id, i) => esitoApertura(sc, aperti.slice(0, i), id).tipo === "salto").length;
}
/** Indizi trovati: quelli di cui sono aperti tutti i file richiesti. */
export function indiziTrovati(sc, aperti) {
  return sc.indizi.filter((d) => d.richiede.every((f) => aperti.includes(f))).map((d) => d.id);
}
/** «Esegui subito»: errore se non hai letto la configurazione, avviso (stesso errore, ma sai perche') se l'hai letta. */
export function esitoEsecuzione(sc, aperti) {
  return aperti.includes(sc.file_configurazione) ? "avviso" : "errore";
}
/** Mappa completa: tutte le tappe di codice coperte, senza salti. */
export function mappaCompleta(sc, aperti) {
  return tappeCoperte(sc, aperti).length === tappeCodice(sc).length && salti(sc, aperti) === 0;
}
/** Righe dell'albero con la loro y. */
export function righeAlbero(sc) {
  return sc.albero.map((r, i) => ({ ...r, y: ALB.y0 + i * ALB.passo }));
}
/** Le tappe del lead con la y della riga del file nell'albero (per la pista disegnata a destra dell'albero). */
export function percorsoLead(sc) {
  const righe = righeAlbero(sc);
  return sc.lead.tappe.map((t) => {
    const r = righe.find((x) => x.file === t.file);
    if (!r) throw new Error(`tappa del lead su un file fuori dall'albero: ${t.file}`);
    return { ...t, y: r.y };
  });
}
/** Eventi (esiti) prodotti dall'apertura di un file: l'esito della tappa e gli eventuali indizi nuovi. */
export function eventiApertura(sc, precedenti, id) {
  const T = sc.testi;
  const f = fileDi(sc, id);
  const e = esitoApertura(sc, precedenti, id);
  if (e.tipo === "ripasso") return [];
  const tappa = tappaDi(sc, f.tappa).nome;
  const out = [];
  if (e.tipo === "ok") out.push({ tipo: "ok", testo: riempi(T.apri_ok, { percorso: f.percorso, tappa }) });
  else if (e.tipo === "documento") out.push({ tipo: "neutro", testo: riempi(T.apri_documento, { percorso: f.percorso }) });
  else out.push({ tipo: "avviso", testo: riempi(T.apri_salto, { percorso: f.percorso, mancanti: e.mancanti.map((m) => tappaDi(sc, m).nome).join(", ") }) });
  const prima = new Set(indiziTrovati(sc, precedenti));
  for (const d of sc.indizi) if (!prima.has(d.id) && d.richiede.every((x) => [...precedenti, id].includes(x))) out.push({ tipo: "avviso", testo: riempi(T.indizio_nuovo, { testo: d.testo }) });
  return out;
}
export function eventoEsecuzione(sc, aperti) {
  const tipo = esitoEsecuzione(sc, aperti);
  return { tipo: tipo === "errore" ? "male" : "avviso", testo: sc.testi[`esegui_${tipo}`] };
}
/** Tutti gli eventi di uno stato, nell'ordine della sequenza animata: aperture, esecuzione, lead. */
export function eventi(sc, s) {
  const out = [];
  s.aperti.forEach((id, i) => out.push(...eventiApertura(sc, s.aperti.slice(0, i), id)));
  if (s.eseguito) out.push(eventoEsecuzione(sc, s.aperti));
  if (s.lead) {
    out.push({ tipo: "neutro", testo: riempi(sc.testi.lead_partito, { nome: sc.lead.nome, n: sc.lead.tappe.length }) });
    out.push({ tipo: "avviso", testo: riempi(sc.testi.lead_fine, { nome: sc.lead.nome }) });
  }
  return out;
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

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  if (!contesto || !contesto.lingua) throw new Error("contesto.lingua mancante");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));

  const s = { vista: VISTE[0], aperti: [], eseguito: false, lead: false, scelte: {}, verificato: false };
  // stato della sequenza animata (non fa parte dello stato del passo)
  let visibili = 0;        // quanti file aperti sono gia' comparsi
  let tappaLead = -1;      // -1 = lead non partito; 0..n-1 = tappa corrente; n = arrivato
  let lente = null;        // { tipo: "file", id } | { tipo: "esegui" } | { tipo: "lead" }
  let diario = [];
  let generazione = 0;
  let timer = [];
  const ferma = () => { generazione += 1; timer.forEach(clearTimeout); timer = []; };
  const nTappe = sc.lead.tappe.length;

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...VISTE.map((v) => el("button", { "data-v": v, onclick: () => cambiaVista(v) }, E[`vista_${v}`])));
  const selFile = el("select", { "aria-label": E.apri, onchange: (e) => { const id = e.target.value; e.target.value = ""; if (id) apri(id); } },
    el("option", { value: "" }, E.scegli_file), ...sc.file.map((f) => el("option", { value: f.id }, f.percorso)));
  const btnEsegui = el("button", { class: "btn", onclick: esegui }, E.esegui);
  const btnSegui = el("button", { class: "btn btn-primario", onclick: segui }, E.segui);
  const btnRicomincia = el("button", { class: "btn btn-fantasma", onclick: ricomincia }, E.ricomincia);
  const zonaMappa = el("div", {}, el("h4", {}, E.apri), el("div", { class: "comandi-file" }, selFile),
    el("div", { class: "fila-btn-mr" }, btnEsegui, btnSegui, btnRicomincia));
  const tendine = {};
  const zonaDecidi = el("div", {}, el("p", { class: "nota-mr" }, E.decidi_intro));
  sc.casi.forEach((c, i) => {
    const sel = el("select", { "aria-label": riempi(T.scegli_per, { n: i + 1 }), onchange: (e) => scegli(c.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.risposte_gioco.map((r) => el("option", { value: r.id }, r.nome)));
    tendine[c.id] = sel;
    zonaDecidi.append(el("label", { class: "scelta-mr" }, el("span", {}, riempi(T.caso, { n: i + 1 })), sel));
  });
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => { s.verificato = true; ridisegna(); } }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaMappa, zonaDecidi);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  const titolo = testoSvg({ x: W / 2, y: 24, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: COLORI.tenue, "letter-spacing": ".06em" }, "");
  const gScena = svgEl("g");
  svg.append(titolo, gScena);
  const esiti = el("section", { class: "esiti-mappa", "aria-live": "polite", "aria-label": E.esiti });
  scena.append(svg, esiti);
  const destra = el("aside", { class: "pannello destra" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}${ridotto ? " ridotto" : ""}` }, comandi, scena, destra));

  const apertiVisibili = () => s.aperti.slice(0, visibili);

  function disegnaAlbero(g) {
    const aperti = apertiVisibili();
    const ordine = Object.fromEntries(aperti.map((id, i) => [id, i]));
    const percorso = tappaLead >= 0 ? percorsoLead(sc) : [];
    const fileLead = new Set(percorso.slice(0, Math.min(tappaLead + 1, nTappe)).map((t) => t.file));
    for (const r of righeAlbero(sc)) {
      const x = ALB.x + r.livello * ALB.rientro;
      if (!r.file) {
        g.append(testoSvg({ x, y: r.y + 4, "font-size": 10.5, "font-weight": 800, fill: COLORI.tenue, "font-family": MONO }, r.nome));
        continue;
      }
      const f = fileDi(sc, r.file);
      const tappa = tappaDi(sc, f.tappa);
      const aperto = r.file in ordine;
      const esito = aperto ? esitoApertura(sc, aperti.slice(0, ordine[r.file]), r.file) : null;
      const attivo = lente && lente.tipo === "file" && lente.id === r.file;
      const gr = svgEl("g", { class: "riga-albero", role: "button", tabindex: "0", "aria-label": `${E.apri}: ${f.percorso}` });
      gr.addEventListener("click", () => apri(r.file));
      gr.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); apri(r.file); } });
      gr.append(svgEl("rect", { x: x - 4, y: r.y - 8, width: ALB.pista - x - 2, height: 15, rx: 4,
        fill: attivo ? "#eef2ff" : fileLead.has(r.file) ? "#f0fdf4" : "transparent", stroke: attivo ? "#4f46e5" : "none" }));
      gr.append(svgEl("circle", { cx: x + 3, cy: r.y - 1, r: 4.5, fill: aperto ? tappa.colore : "#fff", stroke: esito && esito.tipo === "salto" ? COLORI.male : tappa.colore, "stroke-width": esito && esito.tipo === "salto" ? 2.2 : 1.4 }));
      gr.append(testoSvg({ x: x + 12, y: r.y + 3, "font-size": 10.5, "font-family": MONO, "font-weight": aperto ? 700 : 400, fill: aperto ? COLORI.scuro : COLORI.tenue }, r.nome));
      if (aperto) gr.append(testoSvg({ x: ALB.pista - 26, y: r.y + 3, "text-anchor": "end", "font-size": 9, "font-weight": 800, fill: esito.tipo === "salto" ? COLORI.male : tappa.colore }, String(ordine[r.file] + 1)));
      g.append(gr);
    }
    // pista del lead
    if (percorso.length) {
      const ys = percorso.map((t) => t.y), y0 = Math.min(...ys), y1 = Math.max(...ys);
      g.append(svgEl("line", { x1: ALB.pista - 10, y1: y0, x2: ALB.pista - 10, y2: y1, stroke: "#bbf7d0", "stroke-width": 4, "stroke-linecap": "round" }));
      percorso.forEach((t, k) => g.append(svgEl("circle", { cx: ALB.pista - 10, cy: t.y - 1, r: 4, fill: k <= tappaLead ? COLORI.ok : "#fff", stroke: COLORI.ok, "stroke-width": 1.5 })));
      const k = Math.min(tappaLead, nTappe - 1);
      const gettone = svgEl("circle", { cx: ALB.pista - 10, cy: percorso[k].y - 1, r: 7, fill: "#4f46e5", stroke: "#fff", "stroke-width": 2 });
      g.append(gettone);
      if (!ridotto && k > 0 && tappaLead < nTappe && gettone.animate) {
        gettone.animate([{ transform: `translateY(${percorso[k - 1].y - percorso[k].y}px)` }, { transform: "translateY(0)" }], { duration: sc.ms.tappa_lead * 0.6, easing: "ease-in-out" });
      }
    }
  }

  function disegnaLente(g) {
    const L = LENTE;
    g.append(svgEl("rect", { x: L.x, y: L.y, width: L.w, height: L.h, rx: 12, fill: "#fff", stroke: COLORI.bordo, "stroke-width": 1.5 }));
    let y = L.y + 20;
    const scrivi = (righe, attr, passo) => righe.forEach((riga) => { g.append(testoSvg({ x: L.x + 12, y, ...attr }, riga)); y += passo; });
    if (!lente) {
      g.append(testoSvg({ x: L.x + 12, y, "font-size": 10, "font-weight": 800, fill: COLORI.tenue, "letter-spacing": ".06em" }, E.lente.toUpperCase()));
      y += 22;
      scrivi(aCapo(E.lente_vuota, L.nota), { "font-size": 10.5, fill: COLORI.tenue }, 14);
      return;
    }
    if (lente.tipo === "esegui") {
      g.append(svgEl("rect", { x: L.x + 8, y: L.y + 8, width: L.w - 16, height: 92, rx: 8, fill: "#0f172a" }));
      g.append(testoSvg({ x: L.x + 18, y: L.y + 26, "font-size": 9.5, "font-weight": 800, fill: "#94a3b8", "letter-spacing": ".06em" }, E.terminale.toUpperCase()));
      g.append(testoSvg({ x: L.x + 18, y: L.y + 46, "font-size": 10.5, "font-family": MONO, fill: "#e2e8f0" }, `$ ${sc.comando_avvio}`));
      aCapo(sc.errore_avvio, 54).forEach((riga, k) => g.append(testoSvg({ x: L.x + 18, y: L.y + 64 + k * 14, "font-size": 10.5, "font-family": MONO, fill: "#fda4af" }, riga)));
      const ev = eventoEsecuzione(sc, s.aperti);
      y = L.y + 120;
      scrivi(aCapo(ev.testo, L.nota).slice(0, 5), { "font-size": 10.5, "font-weight": 700, fill: ev.tipo === "male" ? COLORI.male : COLORI.avviso }, 14);
      return;
    }
    if (lente.tipo === "lead") {
      const k = Math.min(Math.max(tappaLead, 0), nTappe - 1);
      const t = sc.lead.tappe[k];
      const f = fileDi(sc, t.file);
      g.append(testoSvg({ x: L.x + 12, y, "font-size": 10, "font-weight": 800, fill: COLORI.ok, "letter-spacing": ".04em" }, riempi(T.tappa_lead, { n: k + 1, totale: nTappe, percorso: f.percorso })));
      y += 22;
      g.append(testoSvg({ x: L.x + 12, y, "font-size": 9.5, fill: COLORI.tenue }, `app/main.py · ${riempi(T.riga, { n: t.riga })}`));
      y += 15;
      scrivi(aCapo(t.codice, L.codice).slice(0, 3), { "font-size": 10.5, "font-family": MONO, fill: "#3730a3" }, 14);
      y += 6;
      scrivi(aCapo(t.spiega, L.nota).slice(0, 3), { "font-size": 10.5, fill: COLORI.scuro }, 14);
      y += 4;
      scrivi(aCapo(riempi(T.attesa, { n: sc.attesa_lead_secondi }), L.nota).slice(0, 2), { "font-size": 10, "font-style": "italic", fill: COLORI.avviso }, 13);
      return;
    }
    const f = fileDi(sc, lente.id);
    const tappa = tappaDi(sc, f.tappa);
    g.append(testoSvg({ x: L.x + 12, y, "font-size": 11, "font-weight": 800, "font-family": MONO, fill: COLORI.scuro }, f.percorso));
    g.append(svgEl("rect", { x: L.x + L.w - 112, y: y - 12, width: 100, height: 17, rx: 8, fill: tappa.colore }));
    g.append(testoSvg({ x: L.x + L.w - 62, y: y + 0.5, "text-anchor": "middle", "font-size": 9.5, "font-weight": 800, fill: "#fff" }, tappa.nome));
    y += 20;
    for (const r of f.righe) {
      const righe = aCapo(r.codice, L.codice).slice(0, 2);
      g.append(testoSvg({ x: L.x + 12, y, "font-size": 9, fill: COLORI.tenue }, riempi(T.riga, { n: r.n })));
      righe.forEach((riga, k) => g.append(testoSvg({ x: L.x + 58, y: y + k * 13, "font-size": 10.5, "font-family": MONO, fill: "#3730a3" }, riga)));
      y += righe.length * 13 + 4;
    }
    y += 6;
    scrivi(aCapo(f.nota, L.nota).slice(0, 3), { "font-size": 10.5, fill: COLORI.scuro }, 14);
    const nuovi = sc.indizi.filter((d) => d.richiede.includes(f.id) && indiziTrovati(sc, apertiVisibili()).includes(d.id));
    if (nuovi.length) {
      y += 2;
      scrivi(aCapo(`⚑ ${nuovi[0].testo}`, L.nota).slice(0, 2), { "font-size": 10, "font-weight": 700, fill: COLORI.avviso }, 13);
    }
  }

  function disegnaTappe(g) {
    const coperte = new Set(tappeCoperte(sc, apertiVisibili()));
    const tappe = tappeCodice(sc);
    const w = (LENTE.w - TAPPE_UI.scarto * (tappe.length - 1)) / tappe.length;
    tappe.forEach((t, i) => {
      const x = LENTE.x + i * (w + TAPPE_UI.scarto);
      const fatta = coperte.has(t.id);
      g.append(svgEl("rect", { x, y: TAPPE_UI.y, width: w, height: TAPPE_UI.h, rx: 9, fill: fatta ? t.colore : "#fff", stroke: t.colore, "stroke-width": 1.5 }));
      g.append(testoSvg({ x: x + w / 2, y: TAPPE_UI.y + 19.5, "text-anchor": "middle", "font-size": 9, "font-weight": 800, fill: fatta ? "#fff" : t.colore }, `${t.rango}. ${t.nome}`));
    });
  }

  function disegnaScheda(g) {
    const x = LENTE.x, y = SCHEDA.y;
    g.append(svgEl("rect", { x, y, width: LENTE.w, height: SCHEDA.h, rx: 12, fill: tappaLead >= 0 ? "#f0fdf4" : "#f8fafc", stroke: tappaLead >= 0 ? "#86efac" : COLORI.bordo, "stroke-width": 1.5 }));
    g.append(testoSvg({ x: x + 12, y: y + 18, "font-size": 10, "font-weight": 800, fill: COLORI.tenue, "letter-spacing": ".06em" }, `${E.scheda_lead.toUpperCase()} · ${sc.lead.nome}`));
    sc.lead.tappe.forEach((t, k) => {
      const ry = y + 36 + k * 16;
      const fatto = k <= tappaLead;
      const ultima = k === nTappe - 1;
      g.append(testoSvg({ x: x + 12, y: ry, "font-size": 10, "font-weight": 700, fill: fatto ? COLORI.scuro : "#94a3b8" }, t.campo));
      g.append(testoSvg({ x: x + 140, y: ry, "font-size": 10, fill: fatto ? (ultima ? COLORI.male : COLORI.scuro) : "#cbd5e1", "font-weight": ultima && fatto ? 800 : 400 },
        fatto ? aCapo(t.valore, SCHEDA.valore)[0] : "…"));
    });
  }

  function disegnaDecidi(g) {
    sc.casi.forEach((c, i) => {
      const y = CASO.y0 + i * CASO.passo;
      const scelta = s.scelte[c.id];
      const v = s.verificato ? verifica(sc, s).righe[i].esito : null;
      const bordo = v === "giusto" ? COLORI.ok : v ? COLORI.male : scelta ? "#4f46e5" : COLORI.bordo;
      g.append(svgEl("rect", { x: CASO.x, y, width: CASO.w, height: CASO.h, rx: 12, fill: "#fff", stroke: bordo, "stroke-width": v ? 2.2 : 1.5 }),
        testoSvg({ x: CASO.x + 12, y: y + 18, "font-size": 10.5, "font-weight": 800, fill: "#4f46e5" }, riempi(T.caso, { n: i + 1 })));
      aCapo(c.testo, CASO.caratteri).slice(0, 2).forEach((r, k) => g.append(testoSvg({ x: CASO.x + 12, y: y + 34 + k * 14, "font-size": 10.5, fill: COLORI.scuro }, r)));
      if (scelta) g.append(testoSvg({ x: CASO.x + CASO.w - 12, y: y + 18, "text-anchor": "end", "font-size": 10, "font-weight": 800, fill: bordo }, `${v === "giusto" ? "✓ " : v ? "✗ " : ""}${sc.risposte_gioco.find((r) => r.id === scelta).nome}`));
    });
  }

  function disegnaScena() {
    titolo.textContent = E[`titolo_${s.vista}`];
    gScena.replaceChildren();
    if (s.vista === "decidi") disegnaDecidi(gScena);
    else { disegnaAlbero(gScena); disegnaLente(gScena); disegnaTappe(gScena); disegnaScheda(gScena); }
  }

  function disegnaEsiti() {
    const righe = s.vista === "decidi"
      ? (s.verificato ? verifica(sc, s).righe.map((r) => ({ tipo: r.esito === "giusto" ? "ok" : r.esito === "quasi" ? "avviso" : "male", testo: r.testo })) : [])
      : [...diario].reverse();
    const vuoto = s.vista === "decidi" ? E.decidi_intro : T.nessuna_azione;
    esiti.replaceChildren(el("h4", {}, E.esiti), el("div", { class: "esiti-elenco-mr" },
      ...(righe.length ? righe.map((r) => el("div", { class: r.tipo }, r.testo)) : [el("div", { class: "neutro" }, vuoto)])));
  }

  function disegnaDestra() {
    const figli = [];
    if (s.vista === "decidi") {
      figli.push(el("h3", {}, E.titolo_decidi), el("p", { class: "nota-mr" }, E.decidi_intro));
      if (s.verificato) {
        const v = verifica(sc, s);
        figli.push(el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}`, "aria-live": "polite" }, el("div", {}, v.sintesi)));
      }
    } else {
      const aperti = apertiVisibili();
      const coperte = new Set(tappeCoperte(sc, aperti));
      const tappe = tappeCodice(sc);
      figli.push(el("h3", {}, E.tappe),
        el("ul", { class: "tappe-mr" }, ...tappe.map((t) => el("li", { class: coperte.has(t.id) ? "fatta" : "" }, el("span", { class: "segno-mr" }, coperte.has(t.id) ? "✓" : "○"), el("span", {}, `${t.rango}. ${t.nome}`)))),
        el("p", { class: "contatore-mr" }, riempi(T.tappe_contatore, { n: coperte.size, totale: tappe.length })),
        el("p", { class: "nota-mr" }, riempi(T.salti, { n: salti(sc, aperti) })));
      if (mappaCompleta(sc, aperti)) figli.push(el("div", { class: "esito-scheda ok" }, el("div", {}, T.mappa_completa)));
      const trovati = indiziTrovati(sc, aperti);
      figli.push(el("h3", {}, E.indizi), el("p", { class: "contatore-mr" }, riempi(T.indizi_contatore, { n: trovati.length, totale: sc.indizi.length })),
        el("div", { class: "indizi-mr" }, ...(trovati.length ? sc.indizi.filter((d) => trovati.includes(d.id)).map((d) => el("div", {}, d.testo)) : [el("p", { class: "nota-mr" }, E.nessun_indizio)])));
      const doppi = sc.indizi.filter((d) => d.richiede.length === 2 && !trovati.includes(d.id) && d.richiede.some((f) => aperti.includes(f)));
      for (const d of doppi) figli.push(el("p", { class: "nota-mr" }, riempi(T.richiede_due, { a: fileDi(sc, d.richiede[0]).percorso, b: fileDi(sc, d.richiede[1]).percorso })));
    }
    figli.push(el("div", { class: "regola-mr" }, E.regola));
    destra.replaceChildren(...figli);
  }

  function aggiornaComandi() {
    segVista.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.vista)));
    zonaMappa.classList.toggle("nascosto", s.vista !== "mappa");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaEsiti(); disegnaDestra(); }

  // ------------------------------------------------ azioni
  function completaSequenza() {
    // porta subito la sequenza in corso alla fine (prima di una nuova azione dello studente)
    if (visibili < s.aperti.length || (s.lead && tappaLead < nTappe)) {
      ferma();
      visibili = s.aperti.length;
      if (s.lead) tappaLead = nTappe;
      diario = eventi(sc, s);
    }
  }
  function apri(id) {
    completaSequenza();
    if (s.vista !== "mappa") s.vista = "mappa";
    const nuovi = eventiApertura(sc, s.aperti, id);
    if (!s.aperti.includes(id)) s.aperti = [...s.aperti, id];
    visibili = s.aperti.length;
    diario.push(...nuovi);
    lente = { tipo: "file", id };
    ridisegna();
  }
  function esegui() {
    completaSequenza();
    s.eseguito = true;
    diario.push(eventoEsecuzione(sc, s.aperti));
    lente = { tipo: "esegui" };
    ridisegna();
  }
  function segui() {
    completaSequenza();
    s.lead = true;
    diario.push({ tipo: "neutro", testo: riempi(T.lead_partito, { nome: sc.lead.nome, n: nTappe }) });
    corriLead(generazione);
  }
  function corriLead(gen) {
    lente = { tipo: "lead" };
    if (ridotto) { tappaLead = nTappe; diario.push({ tipo: "avviso", testo: riempi(T.lead_fine, { nome: sc.lead.nome }) }); ridisegna(); return; }
    tappaLead = 0;
    ridisegna();
    const passo = () => {
      if (gen !== generazione) return;
      tappaLead += 1;
      if (tappaLead >= nTappe) { tappaLead = nTappe; diario.push({ tipo: "avviso", testo: riempi(T.lead_fine, { nome: sc.lead.nome }) }); ridisegna(); return; }
      ridisegna();
      timer.push(setTimeout(passo, sc.ms.tappa_lead));
    };
    timer.push(setTimeout(passo, sc.ms.tappa_lead));
  }
  function ricomincia() {
    ferma();
    Object.assign(s, { aperti: [], eseguito: false, lead: false });
    visibili = 0; tappaLead = -1; lente = null; diario = [];
    ridisegna();
  }
  function cambiaVista(v) {
    completaSequenza();
    s.vista = v;
    s.verificato = false;
    ridisegna();
  }
  function scegli(id, valore) {
    const scelte = { ...s.scelte };
    if (valore) scelte[id] = valore; else delete scelte[id];
    s.scelte = scelte;
    s.verificato = false;
    ridisegna();
  }

  // ------------------------------------------------ applica (sequenza rilanciabile)
  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    if (!VISTE.includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!Array.isArray(nuovo.aperti)) throw new Error("stato_animazione: aperti deve essere una lista");
    for (const id of nuovo.aperti) fileDi(sc, id);
    if (new Set(nuovo.aperti).size !== nuovo.aperti.length) throw new Error("stato_animazione: file aperti ripetuti");
    for (const k of ["eseguito", "lead", "verificato"]) if (typeof nuovo[k] !== "boolean") throw new Error(`stato_animazione: ${k} deve essere vero/falso`);
    nuovo.scelte = { ...(nuovo.scelte || {}) };
    for (const [id, r] of Object.entries(nuovo.scelte)) {
      if (!sc.casi.some((c) => c.id === id)) throw new Error(`stato_animazione: osservazione sconosciuta «${id}»`);
      if (!sc.risposte_gioco.some((x) => x.id === r)) throw new Error(`stato_animazione: risposta sconosciuta «${r}»`);
    }
    ferma();
    Object.assign(s, nuovo, { aperti: [...nuovo.aperti] });
    const gen = generazione;
    const finale = () => {
      visibili = s.aperti.length;
      lente = s.lead ? { tipo: "lead" } : s.eseguito ? { tipo: "esegui" } : s.aperti.length ? { tipo: "file", id: s.aperti.at(-1) } : null;
    };
    if (ridotto || s.vista !== "mappa") {
      finale();
      tappaLead = s.lead ? nTappe : -1;
      diario = eventi(sc, s);
      ridisegna();
      return;
    }
    visibili = 0; tappaLead = -1; lente = null; diario = [];
    ridisegna();
    const passi = s.aperti.map((id, i) => () => {
      diario.push(...eventiApertura(sc, s.aperti.slice(0, i), id));
      visibili = i + 1;
      lente = { tipo: "file", id };
      ridisegna();
    });
    if (s.eseguito) passi.push(() => { diario.push(eventoEsecuzione(sc, s.aperti)); lente = { tipo: "esegui" }; ridisegna(); });
    const avanti = () => {
      if (gen !== generazione) return;
      const p = passi.shift();
      if (p) { p(); timer.push(setTimeout(avanti, sc.ms.apertura)); return; }
      if (s.lead) { diario.push({ tipo: "neutro", testo: riempi(T.lead_partito, { nome: sc.lead.nome, n: nTappe }) }); corriLead(gen); }
    };
    timer.push(setTimeout(avanti, sc.ms.apertura));
  }
  applica({});
  return {
    applica,
    distruggi() { ferma(); },
    _prova: {
      stato: s,
      apri, esegui, segui, ricomincia, completaSequenza,
      lente: () => lente, tappaLead: () => tappaLead, visibili: () => visibili, diario: () => diario.slice(),
    },
  };
}
