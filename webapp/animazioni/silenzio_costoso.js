// Lezione interattiva "Il silenzio che costa" (PO5.2, Officina O5). Quattro viste:
//  - chiave: dove vive GROQ_API_KEY (nel codice, in un .env committato, in una variabile d'ambiente, in un segreto di
//    Codespaces) e chi la vede;
//  - guasti: due colonne affiancate sullo stesso guasto (chiave mancante, 401, 429, 404, rete): a sinistra l'assistente
//    dell'Officina con l'errore parlante del codice vero, a destra il repo adottato (patowari) con il ripiego
//    silenzioso di LLMService._get_completion: 50 «Medium», persona «Unknown», email vuote inviate, campagna «riuscita»;
//  - limiti: la campagna del repo adottato (5 lead, 4 chiamate per lead, pausa) contro i limiti indicativi del piano
//    gratuito (richieste e token al minuto): dove scatta il primo 429 e che cosa ne fa ciascuno;
//  - decidi: "Trova il difetto" su sei frammenti.
// Tutti i testi e i numeri arrivano dallo scenario; i messaggi d'errore sono quelli di esercizi/assistente/backend.py.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "silenzio_costoso";
const VISTE = ["chiave", "guasti", "limiti", "decidi"];
export const VIEWBOX = { w: 720, h: 400 };
const COLORE = { inchiostro: "#17203b", tenue: "#5b6684", bordo: "#cbd2e3", primario: "#4f46e5", ok: "#16a34a", male: "#e11d48", avviso: "#d97706", sfondo: "#fff", rosa: "#fff1f2", verde: "#f0fdf4", notte: "#0f172a", grigio: "#94a3b8" };
const SIN = { x: 12, w: 252 };
const DES = { x: 280, w: 428 };
const COL = [{ k: "lead", w: 112 }, { k: "punteggio", w: 78 }, { k: "persona", w: 70 }, { k: "email", w: 96 }, { k: "risposta", w: 72 }];
const LINEA = { x0: 44, x1: 700, y: 84 };
const CASO = { x: 16, y0: 46, passo: 57, w: 688, h: 50 };

const STILE = `
.lz-silenzio_costoso .sc-zona { display: grid; gap: 4px; }
.lz-silenzio_costoso .sc-zona label { display: grid; gap: 3px; font-size: .8rem; margin: 4px 0; }
.lz-silenzio_costoso .esiti-silenzio { margin-top: 10px; border-top: 1px solid #dfe4f0; padding: 10px 4px 2px; display: grid; gap: 6px; }
.lz-silenzio_costoso .esiti-silenzio h4 { margin: 0; font-size: .78rem; text-transform: uppercase; letter-spacing: .07em; color: var(--tenue); }
.lz-silenzio_costoso .sc-esito { font-size: .8rem; padding: 6px 9px; border-radius: 9px; overflow-wrap: anywhere; }
.lz-silenzio_costoso .sc-esito.sc-ok { background: var(--ok-chiaro); color: #166534; }
.lz-silenzio_costoso .sc-esito.sc-avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-silenzio_costoso .sc-esito.sc-male { background: var(--male-chiaro); color: #9f1239; }
.lz-silenzio_costoso .sc-due { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.lz-silenzio_costoso .sc-mono { font-family: ui-monospace, Consolas, monospace; font-size: .74rem; }
.lz-silenzio_costoso .sc-nota { font-size: .78rem; color: var(--tenue); margin: 6px 0 0; }
.lz-silenzio_costoso .sc-regola { margin-top: 10px; padding: 8px 10px; border-left: 4px solid #8b5cf6; background: #f5f3ff; border-radius: 0 10px 10px 0; font-weight: 700; font-size: .84rem; }
.lz-silenzio_costoso .sc-elenco { margin: 6px 0 0; padding-left: 18px; font-size: .8rem; }
.lz-silenzio_costoso .sc-btn { width: 100%; justify-content: center; margin-top: 8px; }
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

// ------------------------------------------------------------------ utilita' pure

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
  for (const p of String(testo).split(" ")) {
    if (riga && (riga + " " + p).length > n) { righe.push(riga); riga = p; } else riga = riga ? `${riga} ${p}` : p;
  }
  if (riga) righe.push(riga);
  return righe;
}
/** Stima prudente della larghezza in px di un testo SVG. */
export function larghezzaTesto(testo, px, peso = 400, mono = false) {
  if (mono) return String(testo).length * px * 0.62;
  let w = 0;
  for (const c of String(testo)) {
    if (c === " ") w += 0.28;
    else if ("il.,;:'|!ìíjtf()[]«»".includes(c)) w += 0.32;
    else if ("mwMW@".includes(c)) w += 0.84;
    else if (c >= "A" && c <= "Z") w += 0.66;
    else w += 0.55;
  }
  return w * px * (peso >= 700 ? 1.08 : 1);
}
export function righe(testo, larghezza, px, peso = 400, mono = false) {
  const perCar = mono ? px * 0.62 : px * 0.58 * (peso >= 700 ? 1.08 : 1);
  return aCapo(testo, Math.max(4, Math.floor(larghezza / perCar)));
}

/** Numero con al piu' un decimale e il separatore della lingua (dallo scenario). */
export function numero(sc, x) {
  return String(Math.round(x * 10) / 10).replace(".", sc.separatore_decimale);
}

// ------------------------------------------------------------------ logica (pura)

const doveDi = (sc, id) => sc.dove.find((d) => d.id === id);
const guastoDi = (sc, id) => sc.guasti.find((g) => g.id === id);

/** Dove vive la chiave: esito (ok / male), chi la vede, che cosa dice il controllo. */
export function chiave(sc, s) {
  const d = doveDi(sc, s.dove);
  return { esito: d.esito, chi_vede: d.chi_vede, perche: d.perche, controllo: d.controllo, posto: d.posto };
}

/**
 * La campagna del repo adottato contro i limiti del piano gratuito: 5 lead, 4 chiamate per lead, pausa prima di ogni
 * lead (time.sleep), durata di ogni chiamata. Conteggio per minuto (finestre fisse di 60 s, semplificato): una
 * chiamata oltre il limite di richieste o di token riceve HTTP 429 e non consuma il minuto.
 */
export function campagna(sc, s) {
  const L = sc.limiti;
  const nLead = sc.lead.length, k = sc.chiamate.length;
  const ciclo = s.pausa + k * s.durata;
  const usate = new Map(), richieste = new Map();
  const chiamate = [];
  for (let i = 0; i < nLead; i++) {
    for (let j = 0; j < k; j++) {
      const t = i * ciclo + s.pausa + j * s.durata;
      const m = Math.floor(t / 60);
      const u = usate.get(m) || { r: 0, tok: 0 };
      const tent = richieste.get(m) || { r: 0, tok: 0 };
      richieste.set(m, { r: tent.r + 1, tok: tent.tok + s.token_chiamata });
      const ok = u.r + 1 <= L.richieste_al_minuto && u.tok + s.token_chiamata <= L.token_al_minuto;
      if (ok) usate.set(m, { r: u.r + 1, tok: u.tok + s.token_chiamata });
      const motivo = ok ? null : u.r + 1 > L.richieste_al_minuto ? "richieste" : "token";
      chiamate.push({ n: chiamate.length + 1, lead: i, chiamata: sc.chiamate[j].id, t, minuto: m, ok, motivo, attesa: Math.ceil(60 * (m + 1) - t) });
    }
  }
  const primo = chiamate.find((c) => !c.ok) || null;
  const picco = [...richieste.values()].reduce((a, b) => ({ r: Math.max(a.r, b.r), tok: Math.max(a.tok, b.tok) }), { r: 0, tok: 0 });
  const durataTot = chiamate.at(-1).t + s.durata;
  const leadRotti = sc.lead.map((_, i) => chiamate.filter((c) => c.lead === i && !c.ok).map((c) => c.chiamata));
  return { chiamate, primo, picco, durata: durataTot, minuti: Math.max(1, Math.ceil(durataTot / 60)), lead_rotti: leadRotti, rifiutate: chiamate.filter((c) => !c.ok).length };
}

/** Che cosa dice l'assistente dell'Officina per un guasto (testi del codice vero). */
export function assistente(sc, s) {
  const T = sc.testi, C = sc.config;
  const g = s.guasto;
  if (g === "nessuno") return { ok: true, fermo: null, testo: `[groq] ${T.risposta_ok}`, uscita: 0 };
  const c = campagna(sc, s);
  const attesa = c.primo ? c.primo.attesa : C.retry_after_esempio;
  const testi = {
    chiave_mancante: riempi(T.err_chiave, { var: C.variabile_chiave }),
    chiave_scaduta: riempi(T.err_401, { var: C.variabile_chiave, stato: 401 }),
    limite: riempi(T.err_429, { attesa }),
    modello: riempi(T.err_404, { modello: C.modello_sbagliato }),
    rete: T.err_rete,
  };
  return { ok: false, fermo: g === "chiave_mancante" ? "creazione" : "chiamata", testo: `ERRORE: ${testi[g]}`, uscita: 2 };
}

/** Che cosa fa il repo adottato con lo stesso guasto: campagna vera, app che non parte o ripiego silenzioso. */
export function repoAdottato(sc, s) {
  const tipo = guastoDi(sc, s.guasto).repo;
  const n = sc.lead.length;
  if (tipo === "non_parte") return { tipo, lead: [], email_vuote: 0, punteggi_50: 0, classificate: 0, elaborati: 0 };
  const lead = sc.lead.map((l) => {
    if (tipo === "ok") return { nome: l.nome, punteggio: l.punteggio, persona: sc.valori.persona_ok, email: sc.valori.email_ok, risposta: sc.valori.risposta_ok, vuota: false };
    return { nome: l.nome, punteggio: sc.valori.punteggio_ripiego, persona: sc.valori.persona_ripiego, email: sc.valori.email_ripiego, risposta: sc.valori.risposta_ripiego, vuota: true };
  });
  const silenzio = tipo === "silenzio";
  return { tipo, lead, email_vuote: silenzio ? n : 0, punteggi_50: silenzio ? n : 0, classificate: silenzio ? 0 : n, elaborati: n };
}

/** Il ripiego silenzioso durante la campagna con i limiti: che cosa diventa ogni lead (dalle chiamate rifiutate). */
export function leadDopoLimiti(sc, s) {
  const c = campagna(sc, s), V = sc.valori;
  return sc.lead.map((l, i) => {
    const rotte = c.lead_rotti[i];
    return {
      nome: l.nome, rotte,
      punteggio: rotte.includes("punteggio") ? V.punteggio_ripiego : l.punteggio,
      persona: rotte.includes("persona") ? V.persona_ripiego : V.persona_ok,
      email: rotte.includes("email") ? V.email_ripiego : V.email_ok,
      risposta: rotte.includes("risposta") ? V.risposta_ripiego : V.risposta_ok,
    };
  });
}

/** Tappe della sequenza animata per la vista. */
export function passiTotali(sc, s) {
  if (s.vista === "chiave") return chiave(sc, s).chi_vede.length;
  if (s.vista === "guasti") return sc.lead.length;
  if (s.vista === "limiti") return campagna(sc, s).chiamate.length;
  return 0;
}

/** Riscontro del gioco "Trova il difetto". */
export function verifica(sc, s) {
  const T = sc.testi;
  const nome = (id) => sc.risposte_gioco.find((r) => r.id === id).nome;
  const righeV = sc.casi.map((c, i) => {
    const scelta = s.scelte[c.id] || "";
    const esito = !scelta ? "vuoto" : scelta === c.giusta ? "giusto" : "sbagliato";
    return { id: c.id, esito, testo: riempi(T[`ver_${esito}`], { n: i + 1, giusta: nome(c.giusta), spiega: c.spiega }) };
  });
  const giuste = righeV.filter((r) => r.esito === "giusto").length;
  return { righe: righeV, giuste, totali: righeV.length, sintesi: giuste === righeV.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righeV.length }) };
}

// ------------------------------------------------------------------ scena (pura): primitive da disegnare

function testo(x, y, t, px, opz = {}) {
  return { t: "text", x, y, testo: t, px, peso: opz.peso || 400, colore: opz.colore || COLORE.inchiostro, anchor: opz.anchor || "start", mono: !!opz.mono, corsivo: !!opz.corsivo, box: opz.box };
}
function blocco(out, x, y, larghezza, t, px, opz = {}) {
  const r = righe(t, larghezza, px, opz.peso, opz.mono).slice(0, opz.max || 12);
  const passo = opz.passo || px + 3.5;
  r.forEach((riga, k) => out.push(testo(x, y + k * passo, riga, px, { ...opz, box: [x, x + larghezza] })));
  return r.length;
}

export function scenaChiave(sc, s, passo) {
  const E = sc.etichette, T = sc.testi;
  const out = [];
  const c = chiave(sc, s);
  const rosso = c.esito === "male";
  const posti = { repo: { x: 12, w: 330 }, pc: { x: 356, w: 170 }, codespace: { x: 540, w: 168 } };
  for (const [id, p] of Object.entries(posti)) {
    const qui = c.posto === id || (id === "repo" && (s.dove === "codice" || s.dove === "env_committato"));
    out.push({ t: "rect", x: p.x, y: 46, w: p.w, h: 200, rx: 12, fill: qui ? (rosso ? COLORE.rosa : COLORE.verde) : COLORE.sfondo, stroke: qui ? (rosso ? COLORE.male : COLORE.ok) : COLORE.bordo, sw: qui ? 2.5 : 1.5 });
    blocco(out, p.x + 10, 64, p.w - 20, E[`posto_${id}`], 10.5, { peso: 800, max: 2 });
  }
  // file del repo
  sc.file_repo.forEach((f, j) => {
    const y = 96 + j * 48;
    const conChiave = f.dove === s.dove;
    out.push({ t: "rect", x: 22, y, w: 310, h: 40, rx: 8, fill: conChiave ? "#ffe4e6" : "#f8fafc", stroke: conChiave ? COLORE.male : COLORE.bordo, sw: 1.2 });
    out.push(testo(32, y + 15, f.nome, 9.5, { peso: 700, mono: true, box: [22, 332] }));
    out.push(testo(32, y + 31, conChiave ? f.con_chiave : f.normale, 8.5, { mono: true, colore: conChiave ? COLORE.male : COLORE.tenue, box: [22, 332] }));
  });
  // PC e codespace
  const pc = s.dove === "variabile";
  blocco(out, 366, 108, 150, pc ? T.pc_con_chiave : T.pc_senza, 8.5, { mono: pc, colore: pc ? COLORE.ok : COLORE.tenue, max: 6 });
  const cs = s.dove === "segreto";
  blocco(out, 550, 108, 148, cs ? T.cs_con_chiave : T.cs_senza, 8.5, { mono: false, colore: cs ? COLORE.ok : COLORE.tenue, max: 7 });
  // il segnaposto della chiave, dove sta
  const badge = { variabile: [441, 222], segreto: [624, 222] }[s.dove];
  if (badge) out.push({ t: "rect", x: badge[0] - 62, y: badge[1] - 10, w: 124, h: 18, rx: 9, fill: rosso ? COLORE.male : COLORE.ok, stroke: "none", sw: 0, cls: "sc-chiave" });
  if (badge) out.push(testo(badge[0], badge[1] + 3, sc.config.segnaposto, 8.5, { peso: 700, mono: true, anchor: "middle", colore: "#fff", box: [badge[0] - 62, badge[0] + 62] }));
  // chi la vede, una voce alla volta
  out.push(testo(12, 272, E.chi_vede, 11, { peso: 800, colore: rosso ? COLORE.male : COLORE.ok, box: [12, 300] }));
  c.chi_vede.slice(0, passo).forEach((v, i) => {
    const x = 12 + (i % 2) * 352, y = 284 + Math.floor(i / 2) * 36;
    out.push({ t: "rect", x, y, w: 344, h: 28, rx: 14, fill: rosso ? COLORE.rosa : COLORE.verde, stroke: rosso ? COLORE.male : COLORE.ok, sw: 1.2 });
    blocco(out, x + 14, y + 18, 316, v, 9.5, { peso: 700, colore: rosso ? "#9f1239" : "#166534", max: 1 });
  });
  return { titolo: E.titolo_chiave, elementi: out };
}

export function scenaGuasti(sc, s, passo) {
  const E = sc.etichette, T = sc.testi, V = sc.valori;
  const out = [];
  const a = assistente(sc, s), r = repoAdottato(sc, s);
  const visti = Math.min(passo, sc.lead.length);
  // sinistra: l'assistente
  out.push({ t: "rect", x: SIN.x, y: 44, w: SIN.w, h: 340, rx: 12, fill: COLORE.sfondo, stroke: a.ok ? COLORE.ok : COLORE.primario, sw: 2 });
  blocco(out, SIN.x + 10, 62, SIN.w - 20, E.colonna_assistente, 10.5, { peso: 800, max: 2 });
  out.push({ t: "rect", x: SIN.x + 8, y: 88, w: SIN.w - 16, h: 246, rx: 8, fill: COLORE.notte, stroke: "none", sw: 0 });
  sc.comando.forEach((riga, k) => out.push(testo(SIN.x + 16, 104 + k * 11, riga, 7.5, { mono: true, colore: "#93c5fd", box: [SIN.x + 8, SIN.x + SIN.w - 8] })));
  if (visti >= 1) {
    const n = blocco(out, SIN.x + 16, 134, SIN.w - 32, a.testo, 7.5, { mono: true, colore: a.ok ? "#bbf7d0" : "#fda4af", max: 16, passo: 11 });
    out.push(testo(SIN.x + 16, 134 + n * 11 + 6, riempi(T.codice_uscita, { n: a.uscita }), 7.5, { mono: true, colore: COLORE.grigio, box: [SIN.x + 8, SIN.x + SIN.w - 8] }));
  }
  blocco(out, SIN.x + 10, 352, SIN.w - 20, visti >= 1 ? (a.ok ? T.sx_ok : riempi(T.sx_fermo, { n: sc.lead.length })) : T.in_corso, 9.5, { peso: 800, colore: a.ok ? COLORE.ok : COLORE.primario, max: 2 });
  // destra: il repo adottato
  const silenzio = r.tipo === "silenzio";
  out.push({ t: "rect", x: DES.x, y: 44, w: DES.w, h: 340, rx: 12, fill: COLORE.sfondo, stroke: silenzio ? COLORE.male : r.tipo === "non_parte" ? COLORE.avviso : COLORE.ok, sw: 2 });
  blocco(out, DES.x + 10, 62, DES.w - 20, E.colonna_repo, 10.5, { peso: 800, max: 1 });
  let x = DES.x + 4;
  COL.forEach((c) => { out.push(testo(x + 4, 84, E[`col_${c.k}`], 9, { peso: 800, colore: COLORE.tenue, box: [x, x + c.w] })); x += c.w; });
  if (r.tipo === "non_parte") {
    out.push({ t: "rect", x: DES.x + 10, y: 100, w: DES.w - 20, h: 120, rx: 10, fill: "#fffbeb", stroke: COLORE.avviso, sw: 1.5 });
    if (visti >= 1) blocco(out, DES.x + 20, 120, DES.w - 40, T.non_parte, 9, { mono: true, colore: "#92400e", max: 8, passo: 12 });
  } else {
    r.lead.slice(0, visti).forEach((l, i) => {
      const y = 94 + i * 30;
      out.push({ t: "rect", x: DES.x + 4, y, w: DES.w - 8, h: 26, rx: 6, fill: l.vuota ? COLORE.rosa : COLORE.verde, stroke: "none", sw: 0 });
      let xc = DES.x + 4;
      COL.forEach((c) => {
        const v = c.k === "lead" ? l.nome : l[c.k];
        blocco(out, xc + 4, y + 17, c.w - 8, v, 9, { peso: c.k === "lead" ? 700 : 400, colore: l.vuota && c.k !== "lead" ? COLORE.male : COLORE.inchiostro, max: 1 });
        xc += c.w;
      });
    });
  }
  if (visti >= sc.lead.length) {
    const fondo = r.tipo === "non_parte" ? T.dx_non_parte : silenzio ? T.dx_silenzio : T.dx_ok;
    if (r.tipo !== "non_parte") blocco(out, DES.x + 10, 258, DES.w - 20, V.api, 8, { mono: true, colore: COLORE.inchiostro, max: 2, passo: 11 });
    if (r.tipo !== "non_parte") blocco(out, DES.x + 10, 290, DES.w - 20, silenzio ? V.report_ripiego : V.report_ok, 8.5, { colore: silenzio ? COLORE.male : COLORE.tenue, max: 2 });
    if (silenzio) blocco(out, DES.x + 10, 320, DES.w - 20, V.console, 8, { mono: true, colore: COLORE.grigio, max: 2, passo: 11 });
    blocco(out, DES.x + 10, 352, DES.w - 20, fondo, 9.5, { peso: 800, colore: silenzio ? COLORE.male : r.tipo === "non_parte" ? COLORE.avviso : COLORE.ok, max: 2 });
  } else {
    blocco(out, DES.x + 10, 352, DES.w - 20, riempi(T.dx_in_corso, { n: visti, tot: sc.lead.length }), 9.5, { peso: 700, colore: COLORE.tenue, max: 1 });
  }
  return { titolo: E.titolo_guasti, elementi: out };
}

export function scenaLimiti(sc, s, passo) {
  const E = sc.etichette, T = sc.testi, L = sc.limiti;
  const out = [];
  const c = campagna(sc, s);
  const secondi = c.minuti * 60;
  const xDi = (t) => LINEA.x0 + (t / secondi) * (LINEA.x1 - LINEA.x0);
  out.push({ t: "path", d: `M${LINEA.x0} ${LINEA.y} L${LINEA.x1} ${LINEA.y}`, stroke: COLORE.tenue, sw: 1.5, dash: "" });
  for (let m = 0; m <= c.minuti; m++) {
    const x = xDi(m * 60);
    out.push({ t: "path", d: `M${x} ${LINEA.y - 34} L${x} ${LINEA.y + 30}`, stroke: COLORE.bordo, sw: 1, dash: "3 3" });
    if (m < c.minuti) out.push(testo(x + 4, LINEA.y - 26, riempi(T.minuto, { n: m + 1 }), 9, { peso: 700, colore: COLORE.tenue, box: [x, xDi((m + 1) * 60)] }));
  }
  out.push(testo(LINEA.x0, LINEA.y + 44, T.secondi_zero, 8.5, { colore: COLORE.tenue, box: [LINEA.x0, LINEA.x0 + 60] }));
  out.push(testo(LINEA.x1, LINEA.y + 44, riempi(T.secondi_fine, { n: numero(sc, secondi) }), 8.5, { anchor: "end", colore: COLORE.tenue, box: [LINEA.x1 - 80, LINEA.x1] }));
  // le chiamate, una alla volta
  c.chiamate.slice(0, passo).forEach((ch) => {
    const x = xDi(ch.t);
    out.push({ t: "rect", x: x - 1.5, y: LINEA.y - 14, w: 3, h: 28, rx: 1, fill: ch.ok ? COLORE.ok : COLORE.male, stroke: "none", sw: 0 });
  });
  sc.lead.forEach((l, i) => {
    const ch = c.chiamate.find((x) => x.lead === i);
    if (c.chiamate.indexOf(ch) < passo) out.push(testo(xDi(ch.t), LINEA.y + 28, riempi(T.etichetta_lead, { n: i + 1 }), 8.5, { peso: 700, anchor: "middle", colore: COLORE.inchiostro, box: [xDi(ch.t) - 14, xDi(ch.t) + 14] }));
  });
  // barre: minuto piu' carico contro i limiti
  const finale = passo >= c.chiamate.length;
  const barra = (y, etichetta, valore, limite) => {
    const scala = 380 / Math.max(limite * 2, valore);
    const sopra = valore > limite;
    out.push(testo(12, y + 12, etichetta, 10, { peso: 800, box: [12, 290] }));
    out.push({ t: "rect", x: 300, y, w: 380, h: 18, rx: 6, fill: "#eef1f8", stroke: "none", sw: 0 });
    out.push({ t: "rect", x: 300, y, w: Math.max(2, valore * scala), h: 18, rx: 6, fill: sopra ? COLORE.male : COLORE.ok, stroke: "none", sw: 0, cls: "sc-barra" });
    out.push({ t: "path", d: `M${300 + limite * scala} ${y - 5} L${300 + limite * scala} ${y + 23}`, stroke: COLORE.inchiostro, sw: 2, dash: "" });
    out.push(testo(12, y + 28, riempi(T.valore_limite, { valore, limite }), 9.5, { colore: sopra ? COLORE.male : COLORE.tenue, peso: 700, box: [12, 290] }));
  };
  barra(150, E.barra_richieste, c.picco.r, L.richieste_al_minuto);
  barra(204, E.barra_token, c.picco.tok, L.token_al_minuto);
  // verdetto
  if (finale) {
    if (c.primo) {
      const lead = c.primo.lead + 1, nomeCh = sc.chiamate.find((x) => x.id === c.primo.chiamata).nome;
      blocco(out, 12, 268, 696, riempi(T.primo_429, { n: c.primo.n, lead, chiamata: nomeCh, t: numero(sc, c.primo.t), motivo: E[`motivo_${c.primo.motivo}`] }), 10.5, { peso: 800, colore: COLORE.male, max: 2 });
      blocco(out, 12, 304, 340, riempi(T.limiti_assistente, { attesa: c.primo.attesa }), 9.5, { colore: COLORE.primario, peso: 700, max: 5 });
      const rotti = c.lead_rotti.filter((x) => x.length).length;
      blocco(out, 368, 304, 340, riempi(T.limiti_repo, { lead: rotti, rifiutate: c.rifiutate, tot: sc.lead.length }), 9.5, { colore: COLORE.male, peso: 700, max: 5 });
    } else {
      blocco(out, 12, 268, 696, riempi(T.nessun_429, { minuti: c.minuti }), 10.5, { peso: 800, colore: COLORE.ok, max: 2 });
    }
  } else {
    blocco(out, 12, 268, 696, riempi(T.chiamate_in_corso, { n: passo, tot: c.chiamate.length }), 10, { colore: COLORE.tenue, max: 1 });
  }
  return { titolo: E.titolo_limiti, elementi: out };
}

export function scenaDecidi(sc, s) {
  const E = sc.etichette, T = sc.testi;
  const out = [];
  const v = s.verificato ? verifica(sc, s) : null;
  sc.casi.forEach((c, i) => {
    const y = CASO.y0 + i * CASO.passo;
    const scelta = s.scelte[c.id];
    const esito = v ? v.righe[i].esito : null;
    const bordo = esito === "giusto" ? COLORE.ok : esito ? COLORE.male : scelta ? COLORE.primario : COLORE.bordo;
    out.push({ t: "rect", x: CASO.x, y, w: CASO.w, h: CASO.h, rx: 10, fill: esito === "giusto" ? COLORE.verde : esito ? COLORE.rosa : COLORE.sfondo, stroke: bordo, sw: 1.8 });
    out.push(testo(CASO.x + 12, y + 16, riempi(T.caso, { n: i + 1 }), 10, { peso: 800, colore: COLORE.primario, box: [CASO.x, CASO.x + 200] }));
    if (scelta) out.push(testo(CASO.x + CASO.w - 12, y + 16, sc.risposte_gioco.find((r) => r.id === scelta).nome, 10, { peso: 800, anchor: "end", colore: bordo, box: [CASO.x + 300, CASO.x + CASO.w] }));
    blocco(out, CASO.x + 12, y + 31, CASO.w - 24, c.testo, 9.5, { max: 2, mono: false, passo: 12 });
  });
  return { titolo: E.titolo_decidi, elementi: out };
}
export function scena(sc, s, passo) {
  if (s.vista === "chiave") return scenaChiave(sc, s, passo);
  if (s.vista === "guasti") return scenaGuasti(sc, s, passo);
  if (s.vista === "limiti") return scenaLimiti(sc, s, passo);
  return scenaDecidi(sc, s);
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
  const num = (x) => Number(x).toLocaleString(lingua, { maximumFractionDigits: 1 });

  const R = sc.riferimento;
  const s = { vista: "chiave", dove: sc.dove[0].id, guasto: sc.guasti[0].id, pausa: R.pausa, durata: R.durata, token_chiamata: R.token_chiamata, scelte: {}, verificato: false };
  let passo = 0;
  let timer = null;
  let lanci = 0;

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...VISTE.map((v) => el("button", { "data-v": v, onclick: () => cambia({ vista: v }) }, E[`vista_${v}`])));
  const segDove = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.dove },
    ...sc.dove.map((d) => el("button", { "data-v": d.id, onclick: () => cambia({ dove: d.id }) }, d.nome)));
  const zonaChiave = el("div", { class: "sc-zona" }, el("h4", {}, E.dove), segDove);
  const segGuasto = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.guasto },
    ...sc.guasti.map((g) => el("button", { "data-v": g.id, onclick: () => cambia({ guasto: g.id }) }, g.nome)));
  const btnRilancia = el("button", { class: "btn btn-primario sc-btn", onclick: () => cambia({}, true) }, E.rilancia);
  const zonaGuasti = el("div", { class: "sc-zona" }, el("h4", {}, E.guasto), segGuasto, btnRilancia);
  function cursore(def, chiave) {
    const val = el("b", {});
    const inp = el("input", { type: "range", min: def.min, max: def.max, step: def.passo, "aria-label": def.etichetta });
    inp.addEventListener("input", () => cambia({ [chiave]: Number(inp.value) }));
    return { nodo: el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, def.etichetta), val), inp), val, inp, def };
  }
  const cursori = { pausa: cursore(sc.cursori.pausa, "pausa"), durata: cursore(sc.cursori.durata, "durata"), token_chiamata: cursore(sc.cursori.token_chiamata, "token_chiamata") };
  const btnRiparti = el("button", { class: "btn sc-btn", onclick: () => cambia({ pausa: R.pausa, durata: R.durata, token_chiamata: R.token_chiamata }) }, E.come_il_repo);
  const zonaLimiti = el("div", { class: "sc-zona" }, cursori.pausa.nodo, cursori.durata.nodo, cursori.token_chiamata.nodo, btnRiparti);
  const tendine = {};
  const zonaDecidi = el("div", { class: "sc-zona" });
  sc.casi.forEach((c, i) => {
    const sel = el("select", { "aria-label": riempi(T.scegli_per, { n: i + 1 }), onchange: (e) => scegli(c.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.risposte_gioco.map((r) => el("option", { value: r.id }, r.nome)));
    tendine[c.id] = sel;
    zonaDecidi.append(el("label", {}, el("span", {}, riempi(T.caso, { n: i + 1 })), sel));
  });
  zonaDecidi.append(el("button", { class: "btn btn-primario sc-btn", onclick: () => cambia({ verificato: true }, true) }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaChiave, zonaGuasti, zonaLimiti, zonaDecidi);

  // ------------------------------------------------ scena ed esiti
  const scenaNodo = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${VIEWBOX.w} ${VIEWBOX.h}`, role: "img", "aria-label": E.descrizione_scena });
  const titolo = svgEl("text", { x: VIEWBOX.w / 2, y: 26, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: COLORE.tenue, "letter-spacing": ".06em" });
  const gScena = svgEl("g");
  svg.append(titolo, gScena);
  const esiti = el("section", { class: "esiti-silenzio", "aria-live": "polite", "aria-label": E.titolo_esiti });
  scenaNodo.append(svg, esiti);
  const destra = el("aside", { class: "pannello destra" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scenaNodo, destra));

  function disegnaScena() {
    const { titolo: t, elementi } = scena(sc, s, passo);
    titolo.textContent = t;
    gScena.replaceChildren(...elementi.map((x) => {
      if (x.t === "rect") return svgEl("rect", { x: x.x, y: x.y, width: x.w, height: x.h, rx: x.rx || 0, fill: x.fill, stroke: x.stroke, "stroke-width": x.sw, class: x.cls || "" });
      if (x.t === "path") return svgEl("path", { d: x.d, fill: "none", stroke: x.stroke, "stroke-width": x.sw, ...(x.dash ? { "stroke-dasharray": x.dash } : {}) });
      const n = svgEl("text", { x: x.x, y: x.y, "font-size": x.px, "font-weight": x.peso, fill: x.colore, "text-anchor": x.anchor, ...(x.mono ? { "font-family": "ui-monospace, Consolas, monospace" } : {}), ...(x.corsivo ? { "font-style": "italic" } : {}) });
      n.textContent = x.testo;
      return n;
    }));
  }
  function disegnaEsiti() {
    const figli = [el("h4", {}, E.titolo_esiti)];
    const finale = passo >= passiTotali(sc, s);
    if (s.vista === "chiave") {
      const c = chiave(sc, s);
      figli.push(el("div", { class: `sc-esito ${c.esito === "ok" ? "sc-ok" : "sc-male"}` }, c.perche));
      figli.push(el("div", { class: "sc-esito sc-avviso" }, c.controllo));
    } else if (s.vista === "guasti") {
      const a = assistente(sc, s), r = repoAdottato(sc, s);
      figli.push(el("div", { class: "sc-nota" }, riempi(T.lancio_n, { n: lanci })));
      if (!finale) figli.push(el("div", { class: "sc-esito sc-avviso" }, riempi(T.dx_in_corso, { n: passo, tot: sc.lead.length })));
      else {
        figli.push(el("div", { class: "sc-due" },
          el("div", { class: `sc-esito ${a.ok ? "sc-ok" : "sc-avviso"}` }, a.ok ? T.esito_sx_ok : T.esito_sx_errore),
          el("div", { class: `sc-esito ${r.tipo === "silenzio" ? "sc-male" : r.tipo === "non_parte" ? "sc-avviso" : "sc-ok"}` },
            r.tipo === "silenzio" ? riempi(T.esito_dx_silenzio, { email: r.email_vuote, punteggi: r.punteggi_50, tot: sc.lead.length }) : r.tipo === "non_parte" ? T.esito_dx_non_parte : T.esito_dx_ok)));
      }
    } else if (s.vista === "limiti") {
      const c = campagna(sc, s);
      figli.push(el("div", { class: "sc-nota" }, riempi(T.lancio_n, { n: lanci })));
      figli.push(el("div", { class: "sc-nota" }, riempi(T.riepilogo_limiti, { pausa: num(s.pausa), durata: num(s.durata), token: num(s.token_chiamata), durata_tot: num(c.durata) })));
      if (finale) {
        if (c.primo) {
          const righeLead = leadDopoLimiti(sc, s).filter((l) => l.rotte.length);
          figli.push(el("div", { class: "sc-esito sc-male" }, riempi(T.esito_limiti_repo, { lead: righeLead.length, elenco: righeLead.map((l) => `${l.nome} (${l.rotte.map((k) => sc.chiamate.find((x) => x.id === k).nome).join(", ")})`).join("; ") })));
          figli.push(el("div", { class: "sc-esito sc-avviso" }, riempi(T.esito_limiti_assistente, { attesa: c.primo.attesa })));
        } else figli.push(el("div", { class: "sc-esito sc-ok" }, T.esito_limiti_ok));
      }
    } else if (s.verificato) {
      const v = verifica(sc, s);
      figli.push(el("div", { class: `sc-esito ${v.giuste === v.totali ? "sc-ok" : "sc-avviso"}` }, v.sintesi),
        ...v.righe.map((r) => el("div", { class: `sc-esito ${r.esito === "giusto" ? "sc-ok" : "sc-male"}` }, r.testo)));
    } else figli.push(el("div", { class: "sc-nota" }, T.decidi_istruzioni));
    esiti.replaceChildren(...figli);
  }
  function disegnaDestra() {
    const figli = [];
    if (s.vista === "chiave") {
      const d = doveDi(sc, s.dove);
      figli.push(el("h3", {}, d.nome), el("p", {}, d.spiega), el("p", { class: "sc-nota" }, T.nota_nome));
    } else if (s.vista === "guasti") {
      const g = guastoDi(sc, s.guasto);
      figli.push(el("h3", {}, g.nome), el("p", {}, g.spiega));
      if (g.repo === "silenzio") figli.push(el("p", { class: "sc-mono" }, sc.codice_ripiego.join(" ")), el("p", { class: "sc-nota" }, T.nota_ripiego));
    } else if (s.vista === "limiti") {
      figli.push(el("h3", {}, E.titolo_spiega_limiti), el("p", {}, T.spiega_limiti), el("p", { class: "sc-nota" }, T.nota_limiti));
    } else {
      figli.push(el("h3", {}, E.titolo_decidi), el("p", {}, T.decidi_istruzioni));
      for (const r of sc.risposte_gioco) figli.push(el("p", { class: "sc-nota" }, el("b", {}, r.nome), ` — ${r.quando}`));
    }
    figli.push(el("div", { class: "sc-regola" }, E.regola));
    destra.replaceChildren(...figli);
    if (!ridotto && destra.animate) destra.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 220 });
  }
  function aggiornaComandi() {
    const premi = (gruppo, valore) => gruppo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === valore)));
    premi(segVista, s.vista);
    premi(segDove, s.dove);
    premi(segGuasto, s.guasto);
    for (const [k, c] of Object.entries(cursori)) {
      c.inp.value = s[k];
      c.val.textContent = riempi(c.def.formato, { n: num(s[k]) });
    }
    zonaChiave.classList.toggle("nascosto", s.vista !== "chiave");
    zonaGuasti.classList.toggle("nascosto", s.vista !== "guasti");
    zonaLimiti.classList.toggle("nascosto", s.vista !== "limiti");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaEsiti(); disegnaDestra(); }
  function ferma() { if (timer !== null) clearTimeout(timer); timer = null; }
  /** Sequenza animata: chi vede la chiave, i lead uno a uno, le chiamate sulla linea del tempo. */
  function avvia() {
    ferma();
    lanci += 1;
    const totali = passiTotali(sc, s);
    passo = ridotto ? totali : 0;
    ridisegna();
    const ms = sc.parametri[`ms_${s.vista}`] || sc.parametri.ms_chiave;
    const avanti = () => {
      if (passo >= totali) { timer = null; return; }
      passo += 1;
      disegnaScena();
      disegnaEsiti();
      timer = setTimeout(avanti, ms);
    };
    if (!ridotto && totali > 0) timer = setTimeout(avanti, ms);
  }
  function cambia(diff, mantieni) {
    Object.assign(s, diff);
    if (!mantieni) s.verificato = false;
    avvia();
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
    if (!doveDi(sc, nuovo.dove)) throw new Error(`stato_animazione: posto della chiave sconosciuto «${nuovo.dove}»`);
    if (!guastoDi(sc, nuovo.guasto)) throw new Error(`stato_animazione: guasto sconosciuto «${nuovo.guasto}»`);
    for (const k of Object.keys(cursori)) {
      const d = sc.cursori[k];
      if (!(typeof nuovo[k] === "number" && nuovo[k] >= d.min && nuovo[k] <= d.max)) throw new Error(`stato_animazione: ${k} fuori scala «${nuovo[k]}»`);
    }
    if (typeof nuovo.verificato !== "boolean") throw new Error("stato_animazione: verificato deve essere vero o falso");
    for (const [id, r] of Object.entries(nuovo.scelte)) {
      if (!sc.casi.some((c) => c.id === id)) throw new Error(`stato_animazione: frammento sconosciuto «${id}»`);
      if (!sc.risposte_gioco.some((x) => x.id === r)) throw new Error(`stato_animazione: risposta sconosciuta «${r}»`);
    }
    Object.assign(s, nuovo);
    avvia();
  }
  applica({});
  return {
    applica,
    distruggi() { ferma(); },
    _prova: { stato: s, passo: () => passo, campagna: () => campagna(sc, s), assistente: () => assistente(sc, s), repo: () => repoAdottato(sc, s), verifica: () => verifica(sc, s) },
  };
}
