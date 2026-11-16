// Lezione interattiva "La pila degli strati" (PO1.1, Officina O1). Tre viste sullo stesso CRM minimo dell'esercizio 7:
//  - build: il Dockerfile diventa una pila di strati (FROM in basso). Si sceglie l'ordine delle righe (codice prima o
//    dipendenze prima), il tag dell'immagine di base, l'utente e una chiave in ENV; poi una modifica (app.py,
//    requirements.txt, nuova python:latest...). La ricostruzione scorre strato per strato dal basso: chi viene dalla
//    cache e chi si rifa' (a cascata), con i secondi di build d'esempio. A destra «docker history» mostra che cosa
//    resta scritto negli strati (la chiave compresa).
//  - contenitori: una sola immagine in sola lettura, fino a tre container con il loro strato scrivibile: docker run,
//    scrittura di un lead, docker rm (lo strato sparisce, l'immagine no).
//  - difetto: il Dockerfile di un collega, da segnare riga per riga, con il perche' di ogni riga.
// Tutti i testi e i numeri vengono dallo scenario; le righe di codice sono identiche nelle due lingue.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "pila_strati";
const VISTE = ["build", "contenitori", "difetto"];
const ORDINI = ["codice_prima", "dipendenze_prima"];
const UTENTI = ["root", "app"];
const W = 720, H = 420;
// larghezza media di un carattere = fattore x corpo (stima prudente: monospace 0.6, grassetto 0.62)
const CAR = { mono: 0.6, testo: 0.62 };
const PILA = { x: 24, w: 452, base: 404, h: 28, gap: 4, stato_x: 486, stato_w: 210, corpo_codice: 10, corpo_stato: 10, corpo_causa: 9 };
const CONT = { img_x: 24, img_w: 220, img_y: 84, img_h: 22, x0: 268, passo: 148, w: 136, y: 84, corpo: 10 };
const RIGA = { x: 24, w: 672, y0: 54, passo: 36, h: 30, corpo: 10.5, marca_w: 168 };

const STILE = `
.lz-pila_strati .nota { font-size: .76rem; color: var(--tenue); margin: 6px 0 0; }
.lz-pila_strati .spiega { font-size: .84rem; margin: 0 0 8px; }
.lz-pila_strati .storia { font-family: ui-monospace, Consolas, monospace; font-size: .74rem; background: #0f172a; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; display: grid; gap: 3px; overflow-wrap: anywhere; }
.lz-pila_strati .storia .pericolo { color: #fda4af; font-weight: 700; }
.lz-pila_strati .storia .tenue { color: #94a3b8; }
.lz-pila_strati .regola { margin-top: 10px; padding: 8px 10px; border-left: 4px solid #0ea5e9; background: #f0f9ff; border-radius: 0 10px 10px 0; font-weight: 700; font-size: .84rem; }
.lz-pila_strati .esiti-pila { margin-top: 8px; border-top: 1px solid #dfe4f0; padding: 8px 4px 2px; }
.lz-pila_strati .esiti-pila h4 { margin: 0 0 6px; font-size: .78rem; text-transform: uppercase; letter-spacing: .07em; color: var(--tenue); }
.lz-pila_strati .esiti-elenco { display: grid; gap: 5px; max-height: 230px; overflow-y: auto; padding-right: 4px; }
.lz-pila_strati .esiti-elenco div { font-size: .8rem; padding: 6px 9px; border-radius: 9px; overflow-wrap: anywhere; }
.lz-pila_strati .esiti-elenco .ok { background: var(--ok-chiaro); color: #166534; }
.lz-pila_strati .esiti-elenco .avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-pila_strati .esiti-elenco .errore { background: var(--male-chiaro); color: #9f1239; }
.lz-pila_strati .esiti-elenco .neutro { background: #f1f5f9; color: #334155; }
.lz-pila_strati .fila-ct { display: grid; grid-template-columns: auto 1fr 1fr; gap: 4px; align-items: center; margin: 4px 0; font-size: .8rem; }
.lz-pila_strati .fila-ct .btn { justify-content: center; padding: .35em .5em; font-size: .78rem; }
.lz-pila_strati .modifiche { display: grid; gap: 4px; }
.lz-pila_strati .modifiche button { text-align: left; font-size: .8rem; padding: 6px 9px; border-radius: 10px; border: 1.5px solid #dfe4f0; background: #fff; cursor: pointer; }
.lz-pila_strati .modifiche button[aria-pressed="true"] { border-color: #0ea5e9; background: #e0f2fe; font-weight: 700; }
.lz-pila_strati .righe-difetto { display: grid; gap: 4px; }
.lz-pila_strati .righe-difetto label { display: flex; gap: 6px; align-items: flex-start; font-size: .76rem; font-family: ui-monospace, Consolas, monospace; overflow-wrap: anywhere; }
.lz-pila_strati .pulsanti-pila { display: grid; gap: 6px; margin-top: 8px; }
.lz-pila_strati .pulsanti-pila .btn { justify-content: center; }
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
/** Caratteri che stanno in una larghezza, dato il corpo e il tipo di carattere. */
export function caratteriIn(larghezza, corpo, tipo) {
  return Math.floor(larghezza / (corpo * CAR[tipo]));
}

// ------------------------------------------------------------------ logica (pura)

const istruzione = (sc, id) => {
  const i = sc.istruzioni.find((x) => x.id === id);
  if (!i) throw new Error(`istruzione sconosciuta «${id}»`);
  return i;
};

/** Le righe del Dockerfile nell'ordine scelto, con base, utente e chiave: dal FROM (strato 1, in basso) al CMD. */
export function righeDockerfile(sc, s) {
  const ids = [];
  for (const id of sc.composizione[s.ordine]) {
    ids.push(id);
    if (id === sc.dopo_workdir_se_utente.dopo && s.utente === "app") ids.push(...sc.dopo_workdir_se_utente.righe);
  }
  if (s.segreto) ids.push(...sc.righe_segreto);
  if (s.utente === "app") ids.push(...sc.righe_utente_finale);
  ids.push(...sc.righe_finali);
  return ids.map((id) => {
    const i = istruzione(sc, id);
    const base = sc.basi.find((b) => b.id === s.base);
    return { ...i, riga: id === "from" ? base.riga : i.riga, breve: id === "from" ? base.riga : i.breve };
  });
}

/** Che cosa e' cambiato dall'ultima build: "tutto" (cache vuota) oppure l'insieme di file/base toccati. */
export function cambiati(sc, s) {
  const m = sc.modifiche.find((x) => x.id === s.modifica);
  if (m.tutto) return { tutto: true, file: new Set() };
  if (m.solo_con_base && s.base !== m.solo_con_base) return { tutto: false, file: new Set() };
  return { tutto: false, file: new Set(m.cambia) };
}

/**
 * La ricostruzione: per ogni strato (dal basso) "cache" o "rifatto", la causa (il file cambiato, la base, la cache vuota
 * o la cascata da uno strato sotto) e i secondi spesi. Uno strato si rifa' se legge qualcosa che e' cambiato oppure se
 * uno strato sotto di lui e' stato rifatto.
 */
export function ricostruisci(sc, s) {
  const ch = cambiati(sc, s);
  let rotto = false;
  const strati = righeDockerfile(sc, s).map((r) => {
    let causa = null;
    if (ch.tutto) causa = { tipo: "prima" };
    else if (rotto) causa = { tipo: "cascata" };
    else {
      const letto = r.legge.find((f) => ch.file.has(f));
      if (letto !== undefined) causa = letto === "base" ? { tipo: "base" } : { tipo: "file", file: letto };
    }
    if (causa) rotto = true;
    return { ...r, stato: causa ? "rifatto" : "cache", causa, spesi: causa ? r.secondi : 0 };
  });
  const rifatti = strati.filter((x) => x.stato === "rifatto");
  const pip = strati.find((x) => x.id === sc.strato_lento);
  return {
    strati,
    rifatti: rifatti.length,
    totale: rifatti.reduce((a, x) => a + x.spesi, 0),
    primo: strati.findIndex((x) => x.stato === "rifatto"),
    // l'installazione delle dipendenze rifatta senza che requirements.txt (o la base) sia cambiato
    lento_inutile: Boolean(pip && pip.stato === "rifatto" && !ch.tutto && !ch.file.has("requirements.txt") && !ch.file.has("base")),
  };
}

/** Esito principale della build (tipo ok/avviso/errore e testo gia' risolto). */
export function esitoBuild(sc, s) {
  const T = sc.testi;
  const r = ricostruisci(sc, s);
  const m = sc.modifiche.find((x) => x.id === s.modifica);
  const v = { n: r.rifatti, s: r.totale };
  if (m.tutto) return { tipo: "neutro", testo: riempi(T.build_prima, v) };
  if (m.solo_con_base) return s.base === m.solo_con_base ? { tipo: "avviso", testo: riempi(T.build_latest, v) } : { tipo: "ok", testo: T.build_fissa_ferma };
  if (r.rifatti === 0) return { tipo: "ok", testo: T.build_tutto_cache };
  if (r.lento_inutile) return { tipo: "avviso", testo: riempi(T.build_lento_inutile, v) };
  return { tipo: "ok", testo: riempi(T.build_giusto, v) };
}

/** Le tre trappole che restano nell'immagine: tag, utente, chiave. Ognuna ok o no, con il perche'. */
export function trappole(sc, s) {
  const T = sc.testi;
  const base = sc.basi.find((b) => b.id === s.base);
  return [
    s.base === "latest" ? { id: "tag", tipo: "avviso", testo: T.trappola_latest } : { id: "tag", tipo: "ok", testo: riempi(T.ok_tag, { immagine: base.riga }) },
    s.utente === "root" ? { id: "utente", tipo: "avviso", testo: T.trappola_root } : { id: "utente", tipo: "ok", testo: T.ok_utente },
    s.segreto ? { id: "chiave", tipo: "errore", testo: T.trappola_chiave } : { id: "chiave", tipo: "ok", testo: T.ok_chiave },
  ];
}

/** «docker history»: gli strati dall'ultimo al primo, come li stampa Docker; la chiave resta leggibile. */
export function storia(sc, s) {
  return righeDockerfile(sc, s).slice().reverse().map((r) => ({ riga: r.riga, pericolo: Boolean(r.pericolo) }));
}

/** Un'azione sui container (slot fissi: null = libero, numero = lead scritti nel suo strato). */
export function azioneContainer(sc, contenitori, azione, k) {
  const T = sc.testi;
  if (!Number.isInteger(k) || k < 0 || k >= contenitori.length) throw new Error(`container fuori scala «${k}»`);
  const c = contenitori.slice();
  const n = k + 1;
  if (azione === "run") {
    if (c[k] !== null) throw new Error(`il container c${n} e' gia' in esecuzione`);
    c[k] = 0;
    return { contenitori: c, esito: { tipo: "ok", testo: riempi(T.ct_run, { n }) } };
  }
  if (azione === "scrivi") {
    if (c[k] === null) throw new Error(`il container c${n} non esiste`);
    c[k] += 1;
    return { contenitori: c, esito: { tipo: "neutro", testo: riempi(T.ct_scrivi, { n, k: c[k] }) } };
  }
  if (azione === "rm") {
    if (c[k] === null) throw new Error(`il container c${n} non esiste`);
    const persi = c[k];
    c[k] = null;
    return { contenitori: c, esito: { tipo: persi > 0 ? "errore" : "neutro", testo: riempi(T.ct_rm, { n, k: persi }) } };
  }
  throw new Error(`azione sui container sconosciuta «${azione}»`);
}

/** Esito di partenza della vista contenitori (senza un'azione appena fatta). */
export function esitoContenitori(sc, contenitori) {
  const attivi = contenitori.filter((x) => x !== null).length;
  return attivi ? { tipo: "neutro", testo: riempi(sc.testi.ct_iniziale, { n: attivi }) } : { tipo: "neutro", testo: sc.testi.ct_nessuno };
}

/** Riscontro del «trova il difetto»: per ogni riga selezionabile trovato / mancato / falso allarme / giusta. */
export function verificaDifetto(sc, scelte) {
  const T = sc.testi;
  const righe = [];
  sc.difetto.righe.forEach((r, i) => {
    if (!r.selezionabile) return;
    const segnata = Boolean(scelte[r.id]);
    const esito = r.difetto ? (segnata ? "trovato" : "mancato") : (segnata ? "falso" : "giusto");
    righe.push({ id: r.id, esito, tipo: { trovato: "ok", mancato: "errore", falso: "avviso", giusto: "neutro" }[esito], testo: riempi(T[`dif_${esito}`], { n: i + 1, spiega: r.spiega }) });
  });
  const difetti = sc.difetto.righe.filter((r) => r.difetto).length;
  const trovati = righe.filter((r) => r.esito === "trovato").length;
  const falsi = righe.filter((r) => r.esito === "falso").length;
  const perfetto = trovati === difetti && falsi === 0;
  return { righe, difetti, trovati, falsi, perfetto, sintesi: perfetto ? T.dif_perfetto : riempi(T.dif_sintesi, { trovati, difetti, falsi }) };
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const P = sc.parametri;
  const lingua = contesto && contesto.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));

  const vuoti = () => Array.from({ length: P.max_contenitori }, () => null);
  const s = { vista: VISTE[0], ordine: ORDINI[0], base: sc.basi[0].id, modifica: sc.modifiche[0].id, segreto: false, utente: UTENTI[0], contenitori: vuoti(), scelte: {}, verificato: false };
  let ultimo = null; // esito dell'ultima azione sui container (non fa parte dello stato del passo)
  let timer = [];
  const pulisci = () => { timer.forEach(clearTimeout); timer = []; };
  /** Esegue i passi uno dopo l'altro (sequenza animata); con «riduci movimento» tutti subito. */
  function sequenza(passi, ms) {
    pulisci();
    if (ridotto) { passi.forEach((f) => f()); return; }
    passi.forEach((f, i) => timer.push(setTimeout(f, ms * (i + 1))));
  }

  // ------------------------------------------------ comandi (sinistra)
  const comandi = el("aside", { class: "pannello" });
  const segmentato = (etichetta, voci, chiave) => el("div", { class: "segmentato", role: "group", "aria-label": etichetta },
    ...voci.map(([v, testo]) => el("button", { "data-v": v, onclick: () => cambia({ [chiave]: v }) }, testo)));
  const segVista = segmentato(E.vista, VISTE.map((v) => [v, E[`vista_${v}`]]), "vista");
  const segOrdine = segmentato(E.ordine, ORDINI.map((v) => [v, E[`ordine_${v}`]]), "ordine");
  const segBase = segmentato(E.base, sc.basi.map((b) => [b.id, b.nome]), "base");
  const listaModifiche = el("div", { class: "modifiche", role: "group", "aria-label": E.modifica },
    ...sc.modifiche.map((m) => el("button", { "data-v": m.id, onclick: () => cambia({ modifica: m.id }) }, m.nome)));
  const interruttore = (testo, onchange) => {
    const inp = el("input", { type: "checkbox", onchange });
    return { nodo: el("label", { class: "interruttore" }, el("span", {}, testo), inp), inp };
  };
  const inSegreto = interruttore(E.segreto, (e) => cambia({ segreto: e.target.checked }));
  const inUtente = interruttore(E.utente, (e) => cambia({ utente: e.target.checked ? "app" : "root" }));
  const btnRifai = el("button", { class: "btn btn-primario", onclick: () => ridisegna() }, E.ricostruisci);
  const zonaBuild = el("div", {},
    el("h4", {}, E.modifica), listaModifiche,
    el("h4", {}, E.ordine), segOrdine,
    el("h4", {}, E.base), segBase,
    el("h4", {}, E.trappole), inSegreto.nodo, inUtente.nodo,
    el("div", { class: "pulsanti-pila" }, btnRifai));
  const fileCt = [];
  const zonaCt = el("div", {}, el("h4", {}, E.titolo_comandi_contenitori));
  for (let k = 0; k < P.max_contenitori; k++) {
    const nome = riempi(T.c_nome, { n: k + 1 });
    const bRun = el("button", { class: "btn", onclick: () => agisci(s.contenitori[k] === null ? "run" : "rm", k) }, "");
    const bScrivi = el("button", { class: "btn", onclick: () => agisci("scrivi", k), "aria-label": riempi(T.scrivi_in, { c: nome }) }, E.scrivi);
    fileCt.push({ bRun, bScrivi, nome });
    zonaCt.append(el("div", { class: "fila-ct" }, el("b", {}, nome), bRun, bScrivi));
  }
  const casella = {};
  const zonaDifetto = el("div", {}, el("h4", {}, E.segna_righe));
  const elencoRighe = el("div", { class: "righe-difetto" });
  sc.difetto.righe.forEach((r, i) => {
    if (!r.selezionabile) return;
    const inp = el("input", { type: "checkbox", "aria-label": riempi(T.segna_riga, { n: i + 1 }), onchange: (e) => segna(r.id, e.target.checked) });
    casella[r.id] = inp;
    elencoRighe.append(el("label", {}, inp, el("span", {}, `${i + 1}  ${r.codice.trim()}`)));
  });
  zonaDifetto.append(elencoRighe, el("div", { class: "pulsanti-pila" },
    el("button", { class: "btn btn-primario", onclick: () => cambia({ verificato: true }, true) }, E.controlla),
    el("button", { class: "btn", onclick: () => cambia({ scelte: {}, verificato: false }) }, E.ricomincia)));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaBuild, zonaCt, zonaDifetto);

  // ------------------------------------------------ scena (centro): SVG + esiti sotto
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  const titolo = testoSvg({ x: 24, y: 26, "font-size": 11, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".05em" }, "");
  const orologio = testoSvg({ x: W - 24, y: 26, "text-anchor": "end", "font-size": 13, "font-weight": 800, fill: "#0f172a" }, "");
  const gScena = svgEl("g");
  svg.append(titolo, orologio, gScena);
  const esiti = el("section", { class: "esiti-pila", "aria-live": "polite", "aria-label": E.titolo_esiti });
  scena.append(svg, esiti);
  const destra = el("aside", { class: "pannello destra" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  const COLORE = { cache: { fondo: "#ecfdf5", bordo: "#10b981", testo: "#047857" }, rifatto: { fondo: "#fff7ed", bordo: "#f97316", testo: "#c2410c" }, attesa: { fondo: "#f8fafc", bordo: "#cbd5e1", testo: "#64748b" } };
  const maxCodice = caratteriIn(PILA.w - 40, PILA.corpo_codice, "mono");
  const maxStato = caratteriIn(PILA.stato_w - 16, PILA.corpo_stato, "testo");
  const maxCausa = caratteriIn(PILA.stato_w - 16, PILA.corpo_causa, "testo");

  function testoCausa(st) {
    if (st.pericolo) return E.causa_pericolo;
    if (!st.causa) return E.causa_nessuna;
    if (st.causa.tipo === "file") return riempi(T.causa_file, { file: st.causa.file });
    return E[`causa_${st.causa.tipo}`];
  }

  function disegnaBuild(g) {
    const r = ricostruisci(sc, s);
    const passi = [];
    let cumulati = 0;
    orologio.textContent = riempi(T.orologio, { n: 0 });
    r.strati.forEach((st, i) => {
      const y = PILA.base - (i + 1) * (PILA.h + PILA.gap);
      const gS = svgEl("g", {});
      const rect = svgEl("rect", { x: PILA.x, y, width: PILA.w, height: PILA.h, rx: 7, fill: COLORE.attesa.fondo, stroke: COLORE.attesa.bordo, "stroke-width": 1.5 });
      const num = testoSvg({ x: PILA.x + 14, y: y + 18.5, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: "#64748b" }, String(i + 1));
      const codice = testoSvg({ x: PILA.x + 30, y: y + 18.5, "font-size": PILA.corpo_codice, "font-family": "ui-monospace, Consolas, monospace", fill: st.pericolo ? "#be123c" : "#0f172a", "font-weight": st.pericolo ? 700 : 400 }, st.riga.slice(0, maxCodice));
      const fondoStato = svgEl("rect", { x: PILA.stato_x, y, width: PILA.stato_w, height: PILA.h, rx: 7, fill: COLORE.attesa.fondo, stroke: COLORE.attesa.bordo, "stroke-width": 1 });
      const tStato = testoSvg({ x: PILA.stato_x + 8, y: y + 12, "font-size": PILA.corpo_stato, "font-weight": 800, fill: COLORE.attesa.testo }, E.in_attesa.slice(0, maxStato));
      const tCausa = testoSvg({ x: PILA.stato_x + 8, y: y + 24, "font-size": PILA.corpo_causa, fill: "#64748b" }, "");
      gS.append(rect, num, codice, fondoStato, tStato, tCausa);
      g.append(gS);
      passi.push(() => {
        const c = COLORE[st.stato];
        rect.setAttribute("fill", c.fondo); rect.setAttribute("stroke", st.pericolo ? "#e11d48" : c.bordo);
        fondoStato.setAttribute("fill", c.fondo); fondoStato.setAttribute("stroke", c.bordo);
        tStato.setAttribute("fill", c.testo);
        tStato.textContent = riempi(T[`stato_${st.stato}`], { n: st.spesi }).slice(0, maxStato);
        tCausa.textContent = testoCausa(st).slice(0, maxCausa);
        tCausa.setAttribute("fill", st.pericolo ? "#be123c" : "#64748b");
        cumulati += st.spesi;
        orologio.textContent = riempi(T.orologio, { n: cumulati });
        if (!ridotto && st.stato === "rifatto" && gS.animate) gS.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 260 });
      });
    });
    // freccia del senso di costruzione e didascalia
    const yTop = PILA.base - r.strati.length * (PILA.h + PILA.gap);
    g.append(testoSvg({ x: PILA.x, y: yTop - 8, "font-size": 9.5, fill: "#64748b" }, E.verso_build));
    sequenza(passi, P.ms_strato);
  }

  function disegnaContenitori(g) {
    orologio.textContent = "";
    const righe = righeDockerfile(sc, s);
    const maxBreve = caratteriIn(CONT.img_w - 16, 9, "mono");
    const maxCt = caratteriIn(CONT.w - 12, CONT.corpo, "testo");
    // immagine: pila compatta in sola lettura (FROM in basso)
    const hImg = righe.length * CONT.img_h;
    const yImg0 = CONT.img_y + 26;
    aCapo(E.immagine, caratteriIn(CONT.img_w, 10.5, "testo")).slice(0, 2).forEach((riga, k) =>
      g.append(testoSvg({ x: CONT.img_x, y: CONT.img_y + k * 13, "font-size": 10.5, "font-weight": 800, fill: "#1e3a8a" }, riga)));
    righe.forEach((r, i) => {
      const y = yImg0 + hImg - (i + 1) * CONT.img_h;
      g.append(svgEl("rect", { x: CONT.img_x, y, width: CONT.img_w, height: CONT.img_h - 3, rx: 5, fill: "#eff6ff", stroke: "#93c5fd" }),
        testoSvg({ x: CONT.img_x + 8, y: y + 13.5, "font-size": 9, "font-family": "ui-monospace, Consolas, monospace", fill: "#1e3a8a" }, r.breve.slice(0, maxBreve)));
    });
    const passi = [];
    s.contenitori.forEach((lead, k) => {
      const x = CONT.x0 + k * CONT.passo, y = CONT.y;
      const gC = svgEl("g", {});
      const nome = riempi(T.c_nome, { n: k + 1 });
      if (lead === null) {
        gC.append(svgEl("rect", { x, y, width: CONT.w, height: 210, rx: 12, fill: "none", stroke: "#cbd5e1", "stroke-dasharray": "6 5", "stroke-width": 1.5 }),
          testoSvg({ x: x + CONT.w / 2, y: y + 22, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#94a3b8" }, nome));
        aCapo(E.posto_libero, maxCt).slice(0, 4).forEach((riga, j) => gC.append(testoSvg({ x: x + CONT.w / 2, y: y + 96 + j * 14, "text-anchor": "middle", "font-size": CONT.corpo, fill: "#94a3b8" }, riga)));
      } else {
        const pieno = lead > 0;
        gC.append(svgEl("rect", { x, y, width: CONT.w, height: 210, rx: 12, fill: "#fff", stroke: "#0ea5e9", "stroke-width": 2 }),
          testoSvg({ x: x + CONT.w / 2, y: y + 20, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#0369a1" }, nome),
          testoSvg({ x: x + CONT.w / 2, y: y + 34, "text-anchor": "middle", "font-size": 9.5, fill: "#0369a1" }, E.in_esecuzione.slice(0, maxCt)),
          // strato scrivibile del container
          svgEl("rect", { x: x + 8, y: y + 46, width: CONT.w - 16, height: 70, rx: 8, fill: pieno ? "#fef9c3" : "#fefce8", stroke: "#eab308", "stroke-dasharray": "4 3" }));
        aCapo(E.strato_scrivibile, maxCt).slice(0, 2).forEach((riga, j) => gC.append(testoSvg({ x: x + CONT.w / 2, y: y + 62 + j * 12, "text-anchor": "middle", "font-size": 9.5, "font-weight": 700, fill: "#854d0e" }, riga)));
        gC.append(testoSvg({ x: x + CONT.w / 2, y: y + 102, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#854d0e" }, riempi(T.lead_n, { n: lead }).slice(0, maxCt)));
        // immagine condivisa sotto (sola lettura)
        gC.append(svgEl("rect", { x: x + 8, y: y + 124, width: CONT.w - 16, height: 76, rx: 8, fill: "#eff6ff", stroke: "#93c5fd" }));
        aCapo(E.immagine_condivisa, maxCt - 2).slice(0, 3).forEach((riga, j) => gC.append(testoSvg({ x: x + CONT.w / 2, y: y + 150 + j * 13, "text-anchor": "middle", "font-size": 9.5, fill: "#1e3a8a" }, riga)));
        g.append(svgEl("path", { d: `M${CONT.img_x + CONT.img_w} ${yImg0 + hImg / 2} C ${x - 20} ${yImg0 + hImg / 2}, ${x - 30} ${y + 162}, ${x + 8} ${y + 162}`, fill: "none", stroke: "#93c5fd", "stroke-width": 1.5, "stroke-dasharray": "4 4" }));
      }
      gC.setAttribute("opacity", ridotto ? "1" : "0.15");
      g.append(gC);
      passi.push(() => gC.setAttribute("opacity", "1"));
    });
    const attivi = s.contenitori.filter((x) => x !== null).length;
    aCapo(riempi(T.ct_conteggio, { n: attivi }), caratteriIn(W - 48, 10.5, "testo")).slice(0, 2).forEach((riga, j) =>
      g.append(testoSvg({ x: 24, y: 372 + j * 14, "font-size": 10.5, "font-weight": 700, fill: "#334155" }, riga)));
    sequenza(passi, P.ms_container);
  }

  function disegnaDifetto(g) {
    orologio.textContent = "";
    const v = s.verificato ? verificaDifetto(sc, s.scelte) : null;
    const maxCodice = caratteriIn(RIGA.w - RIGA.marca_w - 44, RIGA.corpo, "mono");
    const passi = [];
    sc.difetto.righe.forEach((r, i) => {
      const y = RIGA.y0 + i * RIGA.passo;
      const segnata = Boolean(s.scelte[r.id]);
      const esito = v && v.righe.find((x) => x.id === r.id);
      const colore = esito ? { trovato: "#16a34a", mancato: "#e11d48", falso: "#d97706", giusto: "#94a3b8" }[esito.esito] : segnata ? "#f97316" : "#cbd5e1";
      const rect = svgEl("rect", { x: RIGA.x, y, width: RIGA.w, height: RIGA.h, rx: 7, fill: segnata ? "#fff7ed" : "#fff", stroke: segnata ? "#f97316" : "#cbd5e1", "stroke-width": segnata ? 2 : 1.2 });
      g.append(rect,
        testoSvg({ x: RIGA.x + 14, y: y + 19.5, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: "#64748b" }, String(i + 1)),
        testoSvg({ x: RIGA.x + 32, y: y + 19.5, "font-size": RIGA.corpo, "font-family": "ui-monospace, Consolas, monospace", fill: r.selezionabile ? "#0f172a" : "#94a3b8" }, r.codice.slice(0, maxCodice)));
      const etichetta = esito ? E[`marca_${esito.esito}`] : segnata ? E.marca_segnata : "";
      const marca = testoSvg({ x: RIGA.x + RIGA.w - 10, y: y + 19.5, "text-anchor": "end", "font-size": 10, "font-weight": 800, fill: colore }, etichetta.slice(0, caratteriIn(RIGA.marca_w, 10, "testo")));
      g.append(marca);
      if (esito) {
        marca.setAttribute("opacity", ridotto ? "1" : "0");
        passi.push(() => { marca.setAttribute("opacity", "1"); rect.setAttribute("stroke", colore); });
      }
    });
    sequenza(passi, P.ms_strato / 2);
  }

  function disegnaScena() {
    titolo.textContent = E[`titolo_${s.vista}`];
    gScena.replaceChildren();
    ({ build: disegnaBuild, contenitori: disegnaContenitori, difetto: disegnaDifetto })[s.vista](gScena);
  }

  function disegnaEsiti() {
    const righe = [];
    if (s.vista === "build") {
      righe.push(esitoBuild(sc, s), ...trappole(sc, s));
    } else if (s.vista === "contenitori") {
      righe.push(ultimo || esitoContenitori(sc, s.contenitori));
    } else if (s.verificato) {
      const v = verificaDifetto(sc, s.scelte);
      righe.push({ tipo: v.perfetto ? "ok" : "avviso", testo: v.sintesi }, ...v.righe);
    } else {
      righe.push({ tipo: "neutro", testo: riempi(T.dif_segnate, { n: Object.keys(s.scelte).length }) });
    }
    esiti.replaceChildren(el("h4", {}, E.titolo_esiti), el("div", { class: "esiti-elenco" }, ...righe.map((r) => el("div", { class: r.tipo }, r.testo))));
  }

  function disegnaDestra() {
    const figli = [el("h3", {}, E[`destra_${s.vista}`]), el("p", { class: "spiega" }, T[`spiega_${s.vista}`])];
    if (s.vista === "build") {
      figli.push(el("h4", {}, E.titolo_storia), el("div", { class: "storia" },
        ...storia(sc, s).map((x) => el("div", { class: x.pericolo ? "pericolo" : "" }, x.riga))));
      figli.push(el("p", { class: "nota" }, T.nota_tempi));
    } else if (s.vista === "contenitori") {
      const attivi = s.contenitori.map((lead, k) => ({ lead, k })).filter((x) => x.lead !== null);
      figli.push(el("h4", {}, E.titolo_ps), el("div", { class: "storia" },
        el("div", { class: "tenue" }, E.intestazione_ps),
        ...(attivi.length ? attivi.map((x) => el("div", {}, riempi(T.riga_ps, { c: riempi(T.c_nome, { n: x.k + 1 }), n: x.lead }))) : [el("div", { class: "tenue" }, E.ps_vuoto)])));
    }
    figli.push(el("div", { class: "regola" }, E[`regola_${s.vista}`]));
    destra.replaceChildren(...figli);
  }

  function aggiornaComandi() {
    const premi = (gruppo, valore) => gruppo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === valore)));
    premi(segVista, s.vista);
    premi(segOrdine, s.ordine);
    premi(segBase, s.base);
    premi(listaModifiche, s.modifica);
    inSegreto.inp.checked = s.segreto;
    inUtente.inp.checked = s.utente === "app";
    fileCt.forEach((f, k) => {
      const c = s.contenitori[k];
      f.bRun.textContent = c === null ? E.run : E.rm;
      f.bRun.setAttribute("aria-label", riempi(c === null ? T.run_per : T.rm_per, { c: f.nome }));
      f.bScrivi.disabled = c === null;
    });
    for (const [id, inp] of Object.entries(casella)) inp.checked = Boolean(s.scelte[id]);
    zonaBuild.classList.toggle("nascosto", s.vista !== "build");
    zonaCt.classList.toggle("nascosto", s.vista !== "contenitori");
    zonaDifetto.classList.toggle("nascosto", s.vista !== "difetto");
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaEsiti(); disegnaDestra(); }
  function cambia(diff, mantieni) {
    Object.assign(s, diff);
    if (!mantieni) s.verificato = "verificato" in diff ? diff.verificato : false;
    if ("vista" in diff) ultimo = null;
    ridisegna();
  }
  function agisci(azione, k) {
    const r = azioneContainer(sc, s.contenitori, azione, k);
    ultimo = r.esito;
    s.contenitori = r.contenitori;
    ridisegna();
  }
  function segna(id, si) {
    const scelte = { ...s.scelte };
    if (si) scelte[id] = true; else delete scelte[id];
    cambia({ scelte });
  }
  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    if (!VISTE.includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!ORDINI.includes(nuovo.ordine)) throw new Error(`stato_animazione: ordine sconosciuto «${nuovo.ordine}»`);
    if (!sc.basi.some((b) => b.id === nuovo.base)) throw new Error(`stato_animazione: base sconosciuta «${nuovo.base}»`);
    if (!sc.modifiche.some((m) => m.id === nuovo.modifica)) throw new Error(`stato_animazione: modifica sconosciuta «${nuovo.modifica}»`);
    if (typeof nuovo.segreto !== "boolean") throw new Error(`stato_animazione: segreto deve essere vero/falso`);
    if (!UTENTI.includes(nuovo.utente)) throw new Error(`stato_animazione: utente sconosciuto «${nuovo.utente}»`);
    if (!Array.isArray(nuovo.contenitori) || nuovo.contenitori.length !== P.max_contenitori || !nuovo.contenitori.every((x) => x === null || (Number.isInteger(x) && x >= 0)))
      throw new Error(`stato_animazione: contenitori deve avere ${P.max_contenitori} posti (null o numero di lead)`);
    nuovo.contenitori = nuovo.contenitori.slice();
    nuovo.scelte = { ...(nuovo.scelte || {}) };
    for (const [id, v] of Object.entries(nuovo.scelte)) {
      const r = sc.difetto.righe.find((x) => x.id === id);
      if (!r || !r.selezionabile || v !== true) throw new Error(`stato_animazione: riga da segnare sconosciuta «${id}»`);
    }
    if (typeof nuovo.verificato !== "boolean") throw new Error(`stato_animazione: verificato deve essere vero/falso`);
    Object.assign(s, nuovo);
    ultimo = null;
    ridisegna();
  }
  applica({});
  return {
    applica,
    distruggi() { pulisci(); },
    _prova: { stato: s, ricostruisci: () => ricostruisci(sc, s), esitoBuild: () => esitoBuild(sc, s), trappole: () => trappole(sc, s), verifica: () => verificaDifetto(sc, s.scelte), timerAttivi: () => timer.length },
  };
}
