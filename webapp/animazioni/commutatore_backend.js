// Lezione interattiva "Il commutatore" (PO5.1, Officina O5). Il chiamante chiede con una sola funzione,
// assistente.chiedi(domanda); crea_assistente() legge assistente.json e la variabile ASSISTENTE_BACKEND e sceglie fra
// tre backend (finto / ollama / groq) che rispondono tutti con rispondi(messaggi) -> testo. Si cambia il backend e si
// vede che il chiamante non cambia, mentre cambiano rete, chiave, costo e ripetibilita' (il finto risponde sempre
// uguale). Vista "dettagli sparsi": quante parti di codice tocca una modifica se ogni chiamante conosce il backend.
// Gioco "Decidi tu": dove si cambia (configurazione, backend nuovo, chiamante). I messaggi d'errore sono quelli del
// codice vero (esercizi/assistente/); tutti i testi e i numeri arrivano dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "commutatore_backend";
const VISTE = ["commutatore", "sparso", "decidi"];
const STILI = ["interfaccia", "sparso"];
export const VIEWBOX = { w: 720, h: 390 };
const SIN = { x: 12, w: 210 };
const COM = { x: 246, y: 150, w: 114, h: 100 };
const BK = { x: 420, w: 288, y0: 48, passo: 114, h: 100 };
const SP = { x: 12, w: 340, y0: 44, passo: 84, h: 74, xm: 380, wm: 328 };
const CASO = { x: 16, y0: 50, passo: 66, w: 688, h: 56 };
const COLORE = { inchiostro: "#17203b", tenue: "#5b6684", bordo: "#cbd2e3", primario: "#4f46e5", ok: "#16a34a", male: "#e11d48", sfondo: "#fff", rosa: "#fff1f2", verde: "#f0fdf4" };

const STILE = `
.lz-commutatore_backend .cb-zona { display: grid; gap: 4px; }
.lz-commutatore_backend .cb-zona label { display: grid; gap: 3px; font-size: .8rem; margin: 4px 0; }
.lz-commutatore_backend .cb-fila { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 8px; }
.lz-commutatore_backend .cb-fila .btn { justify-content: center; }
.lz-commutatore_backend .esiti-commutatore { margin-top: 10px; border-top: 1px solid #dfe4f0; padding: 10px 4px 2px; display: grid; gap: 6px; }
.lz-commutatore_backend .esiti-commutatore h4 { margin: 0; font-size: .78rem; text-transform: uppercase; letter-spacing: .07em; color: var(--tenue); }
.lz-commutatore_backend .cb-terminale { background: #0f172a; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; font-family: ui-monospace, Consolas, monospace; font-size: .76rem; display: grid; gap: 4px; overflow-wrap: anywhere; }
.lz-commutatore_backend .cb-terminale .cb-cmd { color: #93c5fd; }
.lz-commutatore_backend .cb-terminale .cb-err { color: #fda4af; }
.lz-commutatore_backend .cb-terminale .cb-attesa { color: #94a3b8; font-style: italic; }
.lz-commutatore_backend .cb-esito { font-size: .8rem; padding: 6px 9px; border-radius: 9px; overflow-wrap: anywhere; }
.lz-commutatore_backend .cb-esito.cb-ok { background: var(--ok-chiaro); color: #166534; }
.lz-commutatore_backend .cb-esito.cb-avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-commutatore_backend .cb-esito.cb-male { background: var(--male-chiaro); color: #9f1239; }
.lz-commutatore_backend .cb-esito.cb-scelto { outline: 2px solid #4f46e5; }
.lz-commutatore_backend .cb-tabella { display: grid; gap: 4px; font-size: .8rem; margin: 6px 0; }
.lz-commutatore_backend .cb-tabella div { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px dashed #dfe4f0; padding-bottom: 3px; }
.lz-commutatore_backend .cb-tabella b { text-align: right; overflow-wrap: anywhere; min-width: 0; }
.lz-commutatore_backend .cb-nota { font-size: .78rem; color: var(--tenue); margin: 6px 0 0; }
.lz-commutatore_backend .cb-regola { margin-top: 10px; padding: 8px 10px; border-left: 4px solid #8b5cf6; background: #f5f3ff; border-radius: 0 10px 10px 0; font-weight: 700; font-size: .84rem; }
.lz-commutatore_backend .cb-punti { margin: 6px 0 0; padding-left: 18px; font-size: .8rem; }
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
/** Stima prudente della larghezza in px di un testo SVG (carattere senza grazie o a spaziatura fissa). */
export function larghezzaTesto(testo, px, peso = 400, mono = false) {
  if (mono) return String(testo).length * px * 0.62;
  let w = 0;
  for (const c of String(testo)) {
    if (" ".includes(c)) w += 0.28;
    else if ("il.,;:'|!ìíjtf()[]«»".includes(c)) w += 0.32;
    else if ("mwMW@".includes(c)) w += 0.84;
    else if (c >= "A" && c <= "Z") w += 0.66;
    else w += 0.55;
  }
  return w * px * (peso >= 700 ? 1.08 : 1);
}
/** Righe che stanno in una larghezza in px (a parole). */
export function righe(testo, larghezza, px, peso = 400, mono = false) {
  const perCar = mono ? px * 0.62 : px * 0.58 * (peso >= 700 ? 1.08 : 1);
  return aCapo(testo, Math.max(4, Math.floor(larghezza / perCar)));
}
/** Impronta deterministica (FNV-1a a 32 bit, 8 cifre esadecimali) del testo della richiesta. */
export function impronta(testo) {
  let h = 0x811c9dc5;
  for (const c of String(testo)) {
    h ^= c.codePointAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
/** Elenco nello stesso formato di Python, come lo stampa il messaggio d'errore vero: ['finto', 'ollama', 'groq']. */
export function listaPython(v) {
  return `[${v.map((x) => `'${x}'`).join(", ")}]`;
}

// ------------------------------------------------------------------ logica (pura)

const backendDi = (sc, id) => sc.backend.find((b) => b.id === id);
const domandaDi = (sc, s) => sc.domande.find((d) => d.id === s.domanda);

/** Chi sceglie il backend: la variabile d'ambiente, se impostata, altrimenti il file. Valore fuori elenco = errore. */
export function scegliBackend(sc, s) {
  const C = sc.config;
  if (s.variabile) {
    if (!C.ammessi.includes(s.variabile)) {
      return { backend: null, origine: "variabile", errore: riempi(sc.testi.err_variabile, { variabile: C.variabile_backend, valore: s.variabile, ammessi: listaPython(C.ammessi) }) };
    }
    return { backend: s.variabile, origine: "variabile", errore: null };
  }
  return { backend: s.file_backend, origine: "file", errore: null };
}
/** I messaggi che il chiamante manda: istruzioni di sistema + domanda (gli stessi per ogni backend). */
export function messaggi(sc, s) {
  return [{ role: "system", content: sc.istruzioni_sistema }, { role: "user", content: domandaDi(sc, s).testo }];
}
/** Stato di ciascun backend con le condizioni attuali (servizio acceso, chiave, rete). */
export function statoBackend(sc, s, id) {
  if (id === "ollama" && !s.ollama_acceso) return "spento";
  if (id === "groq" && !s.chiave) return "senza_chiave";
  if (id === "groq" && !s.rete) return "offline";
  return "pronto";
}
/**
 * Una esecuzione di `python -m assistente "domanda"`: dove si ferma (commutatore = scelta o creazione del backend,
 * backend = chiamata), il testo stampato e il codice di uscita. giro 1 o 2: i modelli veri possono variare, il finto no.
 */
export function esegui(sc, s, giro = 1) {
  const T = sc.testi, C = sc.config;
  const scelta = scegliBackend(sc, s);
  if (scelta.errore) return { ok: false, backend: null, origine: scelta.origine, fermo: "commutatore", testo: scelta.errore, uscita: 2 };
  const b = scelta.backend, B = backendDi(sc, b), dom = domandaDi(sc, s);
  const errore = (fermo, testo) => ({ ok: false, backend: b, origine: scelta.origine, fermo, testo, uscita: 2 });
  if (b === "groq" && !s.chiave) return errore("commutatore", riempi(T.err_chiave, { var: C.variabile_chiave }));
  if (b === "ollama" && !s.ollama_acceso) return errore("backend", riempi(T.err_ollama, { url: C.url_ollama, modello: B.modello }));
  if (b === "groq" && !s.rete) return errore("backend", T.err_rete_groq);
  let testo;
  if (b === "finto") {
    testo = dom.risposta_finto || riempi(T.eco_finto, { domanda: dom.testo.slice(0, 80), impronta: impronta(JSON.stringify(messaggi(sc, s))) });
  } else {
    testo = dom.risposte_modello[b][(giro - 1) % dom.risposte_modello[b].length];
  }
  return { ok: true, backend: b, origine: scelta.origine, fermo: null, testo, uscita: 0 };
}
/** Due esecuzioni di fila: identiche? */
export function confronto(sc, s) {
  const r1 = esegui(sc, s, 1), r2 = esegui(sc, s, 2);
  return { r1, r2, uguali: r1.testo === r2.testo };
}
/** La riga di comando che corrisponde allo stato. */
export function comando(sc, s) {
  const pre = s.variabile ? `${sc.config.variabile_backend}=${s.variabile} ` : "";
  return `$ ${pre}python -m assistente "${domandaDi(sc, s).testo}"`;
}
/** La riga che il terminale stampa per un'esecuzione. */
export function uscitaTerminale(r) {
  return r.ok ? `[${r.backend}] ${r.testo}` : `ERRORE: ${r.testo}`;
}
/** Quante tappe ha la sequenza animata: chiamante, commutatore, backend, ritorno (si ferma dove c'e' l'errore). */
export function fasiTotali(sc, s) {
  if (s.vista === "sparso") return puntiDaToccare(sc, s.stile, s.modifica).length + 1;
  if (s.vista === "decidi") return 1;
  const r = esegui(sc, s, 1);
  return r.ok ? 4 : r.fermo === "commutatore" ? 2 : 3;
}
/** Le parti da toccare per una modifica, con l'interfaccia unica o con i dettagli sparsi nei chiamanti. */
export function puntiDaToccare(sc, stile, modifica) {
  const m = sc.modifiche.find((x) => x.id === modifica);
  return m[stile];
}
/** Conteggio per il confronto: punti e chiamanti toccati. */
export function conteggio(sc, stile, modifica) {
  const p = puntiDaToccare(sc, stile, modifica);
  const chiamanti = new Set(p.filter((x) => sc.chiamanti.some((c) => c.id === x.bersaglio)).map((x) => x.bersaglio));
  return { punti: p.length, chiamanti: chiamanti.size };
}
/** Riscontro del gioco "Decidi tu". */
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

// ------------------------------------------------------------------ scena (pura): elenco di primitive da disegnare

function testo(x, y, t, px, opz = {}) {
  return { t: "text", x, y, testo: t, px, peso: opz.peso || 400, colore: opz.colore || COLORE.inchiostro, anchor: opz.anchor || "start", mono: !!opz.mono, corsivo: !!opz.corsivo, box: opz.box };
}
function blocco(out, x, y, larghezza, t, px, opz = {}) {
  const r = righe(t, larghezza, px, opz.peso, opz.mono).slice(0, opz.max || 9);
  r.forEach((riga, k) => out.push(testo(x, y + k * (px + 3.5), riga, px, { ...opz, box: [x, x + larghezza] })));
  return r.length;
}
function posizioniToken(sc, s) {
  const r = esegui(sc, s, 1);
  const i = Math.max(0, sc.backend.findIndex((b) => b.id === r.backend));
  return [
    { x: SIN.x + SIN.w - 8, y: 100 },
    { x: COM.x + COM.w / 2, y: COM.y + COM.h / 2 },
    { x: BK.x + 10, y: BK.y0 + i * BK.passo + BK.h / 2 },
    { x: SIN.x + SIN.w - 8, y: 100 },
  ];
}

/** La scena della vista commutatore alla tappa `fase` della sequenza. */
export function scenaCommutatore(sc, s, fase) {
  const E = sc.etichette, T = sc.testi, C = sc.config;
  const out = [];
  const r = esegui(sc, s, 1);
  const scelta = scegliBackend(sc, s);
  const finale = fase >= fasiTotali(sc, s) - 1;
  // chiamante
  out.push({ t: "rect", x: SIN.x, y: 48, w: SIN.w, h: 104, rx: 12, fill: COLORE.sfondo, stroke: COLORE.primario, sw: 2 });
  out.push(testo(SIN.x + 10, 66, E.chiamante, 11, { peso: 800, box: [SIN.x, SIN.x + SIN.w] }));
  sc.codice_chiamante.forEach((riga, k) => out.push(testo(SIN.x + 10, 86 + k * 14, riga, 8.5, { mono: true, box: [SIN.x, SIN.x + SIN.w] })));
  blocco(out, SIN.x + 10, 116, SIN.w - 20, riempi(T.domanda_chiamante, { domanda: domandaDi(sc, s).testo }), 8.5, { corsivo: true, colore: COLORE.tenue, max: 2 });
  blocco(out, SIN.x + 10, 144, SIN.w - 20, T.righe_cambiate, 9.5, { peso: 700, colore: COLORE.ok, max: 1 });
  // assistente.json
  const daFile = scelta.origine === "file";
  out.push({ t: "rect", x: SIN.x, y: 166, w: SIN.w, h: 100, rx: 12, fill: COLORE.sfondo, stroke: daFile ? COLORE.primario : COLORE.bordo, sw: daFile ? 2.5 : 1.5 });
  out.push(testo(SIN.x + 10, 184, C.file, 11, { peso: 800, mono: true, box: [SIN.x, SIN.x + SIN.w] }));
  out.push(testo(SIN.x + 10, 202, `"backend": "${s.file_backend}",`, 8.5, { mono: true, colore: COLORE.primario, box: [SIN.x, SIN.x + SIN.w] }));
  blocco(out, SIN.x + 10, 218, SIN.w - 20, T.why_backend_breve, 8.5, { corsivo: true, colore: COLORE.tenue, max: 4 });
  // ambiente
  const daVar = scelta.origine === "variabile";
  out.push({ t: "rect", x: SIN.x, y: 280, w: SIN.w, h: 66, rx: 12, fill: COLORE.sfondo, stroke: daVar ? (scelta.errore ? COLORE.male : COLORE.primario) : COLORE.bordo, sw: daVar ? 2.5 : 1.5 });
  out.push(testo(SIN.x + 10, 298, E.ambiente, 11, { peso: 800, box: [SIN.x, SIN.x + SIN.w] }));
  blocco(out, SIN.x + 10, 316, SIN.w - 20, s.variabile ? `${C.variabile_backend}=${s.variabile}` : riempi(T.variabile_vuota, { variabile: C.variabile_backend }), 8.5, { mono: !!s.variabile, colore: daVar ? (scelta.errore ? COLORE.male : COLORE.primario) : COLORE.tenue, max: 2 });
  // fili verso il commutatore: quello che vince e' spesso
  out.push({ t: "path", d: `M${SIN.x + SIN.w} 216 C 236 216, 236 ${COM.y + 30}, ${COM.x} ${COM.y + 30}`, stroke: daFile ? COLORE.primario : COLORE.bordo, sw: daFile ? 2.5 : 1.2, dash: daFile ? "" : "4 4" });
  out.push({ t: "path", d: `M${SIN.x + SIN.w} 313 C 236 313, 236 ${COM.y + 70}, ${COM.x} ${COM.y + 70}`, stroke: daVar ? (scelta.errore ? COLORE.male : COLORE.primario) : COLORE.bordo, sw: daVar ? 2.5 : 1.2, dash: daVar ? "" : "4 4" });
  out.push({ t: "path", d: `M${SIN.x + SIN.w} 100 C 236 100, 236 ${COM.y + 10}, ${COM.x + 30} ${COM.y}`, stroke: COLORE.tenue, sw: 1.5, dash: "3 3" });
  // commutatore
  const comErr = finale && !r.ok && r.fermo === "commutatore";
  out.push({ t: "rect", x: COM.x, y: COM.y, w: COM.w, h: COM.h, rx: 14, fill: comErr ? COLORE.rosa : "#eef2ff", stroke: comErr ? COLORE.male : COLORE.primario, sw: 2 });
  out.push(testo(COM.x + COM.w / 2, COM.y + 20, E.commutatore, 10.5, { peso: 800, anchor: "middle", box: [COM.x, COM.x + COM.w] }));
  out.push(testo(COM.x + COM.w / 2, COM.y + 36, "crea_assistente()", 8.5, { mono: true, anchor: "middle", colore: COLORE.tenue, box: [COM.x, COM.x + COM.w] }));
  const esitoCom = scelta.errore ? T.com_errore : riempi(T.com_scelto, { backend: scelta.backend });
  righe(esitoCom, COM.w - 14, 9.5, 700).slice(0, 3).forEach((riga, k) => out.push(testo(COM.x + COM.w / 2, COM.y + 58 + k * 13, riga, 9.5, { peso: 700, anchor: "middle", colore: scelta.errore ? COLORE.male : COLORE.primario, box: [COM.x, COM.x + COM.w] })));
  // leva verso il backend scelto
  sc.backend.forEach((b, i) => {
    const y = BK.y0 + i * BK.passo + BK.h / 2;
    const scelto = scelta.backend === b.id;
    out.push({ t: "path", d: `M${COM.x + COM.w} ${COM.y + COM.h / 2} L${BK.x} ${y}`, stroke: scelto ? COLORE.primario : COLORE.bordo, sw: scelto ? 3 : 1.2, dash: scelto ? "" : "3 5" });
  });
  // backend
  sc.backend.forEach((b, i) => {
    const y = BK.y0 + i * BK.passo;
    const scelto = scelta.backend === b.id;
    const st = statoBackend(sc, s, b.id);
    const err = scelto && finale && !r.ok;
    out.push({ t: "rect", x: BK.x, y, w: BK.w, h: BK.h, rx: 12, fill: err ? COLORE.rosa : scelto ? "#eef2ff" : COLORE.sfondo, stroke: err ? COLORE.male : scelto ? COLORE.primario : COLORE.bordo, sw: scelto ? 2.5 : 1.5 });
    out.push(testo(BK.x + 12, y + 18, b.nome, 11.5, { peso: 800, mono: true, box: [BK.x, BK.x + 150] }));
    out.push(testo(BK.x + BK.w - 12, y + 18, E[`stato_${st}`], 9.5, { peso: 800, anchor: "end", colore: st === "pronto" ? COLORE.ok : COLORE.male, box: [BK.x + 150, BK.x + BK.w] }));
    const dettagli = [riempi(T.riga_modello, { modello: b.modello_breve }), riempi(T.riga_rete, { rete: b.rete, chiave: b.chiave }),
      riempi(T.riga_ripetibile, { ripetibile: b.ripetibile }), riempi(T.riga_costo, { costo: b.costo })];
    dettagli.forEach((d, k) => out.push(testo(BK.x + 12, y + 37 + k * 15, d, 9.5, { colore: COLORE.tenue, box: [BK.x, BK.x + BK.w] })));
  });
  // token della richiesta
  const pos = posizioniToken(sc, s);
  const f = Math.min(fase, pos.length - 1);
  const percorso = pos.slice(0, f + 1).map((p, k) => `${k ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  if (f > 0) out.push({ t: "path", d: percorso, stroke: r.ok ? COLORE.ok : COLORE.male, sw: 2, dash: "2 4" });
  const p = pos[f];
  const coloreToken = finale ? (r.ok ? COLORE.ok : COLORE.male) : COLORE.primario;
  out.push({ t: "circle", cx: p.x, cy: p.y, r: 9, fill: coloreToken, cls: "cb-gettone" });
  out.push(testo(p.x, p.y + 3.5, finale ? (r.ok ? "✓" : "✕") : "?", 10, { peso: 800, anchor: "middle", colore: "#fff", box: [p.x - 9, p.x + 9] }));
  return { titolo: E.titolo_commutatore, elementi: out };
}

/** La scena della vista "dettagli sparsi": i punti toccati compaiono uno alla volta (fase). */
export function scenaSparso(sc, s, fase) {
  const E = sc.etichette, T = sc.testi;
  const out = [];
  const punti = puntiDaToccare(sc, s.stile, s.modifica);
  const visibili = punti.slice(0, Math.max(0, fase));
  const toccato = (id) => visibili.find((p) => p.bersaglio === id);
  sc.chiamanti.forEach((c, i) => {
    const y = SP.y0 + i * SP.passo;
    const p = toccato(c.id);
    out.push({ t: "rect", x: SP.x, y, w: SP.w, h: SP.h, rx: 12, fill: p ? COLORE.rosa : COLORE.sfondo, stroke: p ? COLORE.male : COLORE.bordo, sw: p ? 2.5 : 1.5 });
    out.push(testo(SP.x + 10, y + 16, c.nome, 10.5, { peso: 800, box: [SP.x, SP.x + 150] }));
    sc.codice_stile[s.stile].forEach((riga, k) => out.push(testo(SP.x + 10, y + 32 + k * 12, riga, 8.5, { mono: true, colore: s.stile === "sparso" ? COLORE.male : COLORE.primario, box: [SP.x, SP.x + SP.w] })));
    if (p) out.push(testo(SP.x + SP.w - 10, y + 16, p.cosa_breve, 9, { peso: 700, anchor: "end", colore: COLORE.male, box: [SP.x + 150, SP.x + SP.w] }));
    out.push({ t: "path", d: `M${SP.x + SP.w} ${y + SP.h / 2} L${SP.xm} ${s.stile === "interfaccia" ? 110 : y + SP.h / 2}`, stroke: s.stile === "interfaccia" ? COLORE.primario : COLORE.male, sw: 1.5, dash: s.stile === "interfaccia" ? "" : "4 3" });
  });
  // modulo comune (o nessuno)
  const pm = toccato("modulo");
  out.push({ t: "rect", x: SP.xm, y: 44, w: SP.wm, h: 150, rx: 12, fill: pm ? COLORE.rosa : s.stile === "interfaccia" ? "#eef2ff" : "#f8fafc", stroke: pm ? COLORE.male : s.stile === "interfaccia" ? COLORE.primario : COLORE.bordo, sw: pm ? 2.5 : 1.5, dash: s.stile === "interfaccia" ? "" : "5 4" });
  out.push(testo(SP.xm + 12, 64, E[`modulo_${s.stile}`], 10.5, { peso: 800, box: [SP.xm, SP.xm + SP.wm] }));
  blocco(out, SP.xm + 12, 84, SP.wm - 24, T[`modulo_${s.stile}`], 9.5, { colore: COLORE.tenue, max: 5 });
  if (pm) blocco(out, SP.xm + 12, 172, SP.wm - 24, pm.cosa_breve, 9.5, { peso: 700, colore: COLORE.male, max: 1 });
  // configurazione
  const pc = toccato("config");
  out.push({ t: "rect", x: SP.xm, y: 208, w: SP.wm, h: 120, rx: 12, fill: pc ? COLORE.rosa : COLORE.sfondo, stroke: pc ? COLORE.male : COLORE.bordo, sw: pc ? 2.5 : 1.5 });
  out.push(testo(SP.xm + 12, 228, sc.config.file, 10.5, { peso: 800, mono: true, box: [SP.xm, SP.xm + SP.wm] }));
  sc.codice_config.forEach((riga, k) => out.push(testo(SP.xm + 12, 248 + k * 13, riga, 8.5, { mono: true, colore: COLORE.tenue, box: [SP.xm, SP.xm + SP.wm] })));
  if (pc) blocco(out, SP.xm + 12, 312, SP.wm - 24, pc.cosa_breve, 9.5, { peso: 700, colore: COLORE.male, max: 1 });
  // conteggio
  const n = conteggio(sc, s.stile, s.modifica);
  const finale = fase >= punti.length;
  blocco(out, SP.xm, 352, SP.wm, finale ? riempi(T.conteggio, { punti: n.punti, chiamanti: n.chiamanti }) : T.conteggio_attesa, 10.5, { peso: 800, colore: n.chiamanti ? COLORE.male : COLORE.ok, max: 2 });
  return { titolo: E.titolo_sparso, elementi: out };
}

/** La scena del gioco "Decidi tu". */
export function scenaDecidi(sc, s) {
  const E = sc.etichette, T = sc.testi;
  const out = [];
  const v = s.verificato ? verifica(sc, s) : null;
  sc.casi.forEach((c, i) => {
    const y = CASO.y0 + i * CASO.passo;
    const scelta = s.scelte[c.id];
    const esito = v ? v.righe[i].esito : null;
    const bordo = esito === "giusto" ? COLORE.ok : esito ? COLORE.male : scelta ? COLORE.primario : COLORE.bordo;
    out.push({ t: "rect", x: CASO.x, y, w: CASO.w, h: CASO.h, rx: 12, fill: esito === "giusto" ? COLORE.verde : esito ? COLORE.rosa : COLORE.sfondo, stroke: bordo, sw: 1.8 });
    out.push(testo(CASO.x + 12, y + 18, riempi(T.caso, { n: i + 1 }), 10.5, { peso: 800, colore: COLORE.primario, box: [CASO.x, CASO.x + 200] }));
    if (scelta) out.push(testo(CASO.x + CASO.w - 12, y + 18, sc.risposte_gioco.find((r) => r.id === scelta).nome, 10, { peso: 800, anchor: "end", colore: bordo, box: [CASO.x + 300, CASO.x + CASO.w] }));
    blocco(out, CASO.x + 12, y + 34, CASO.w - 24, c.testo, 10.5, { max: 2 });
  });
  return { titolo: E.titolo_decidi, elementi: out };
}
export function scena(sc, s, fase) {
  return s.vista === "sparso" ? scenaSparso(sc, s, fase) : s.vista === "decidi" ? scenaDecidi(sc, s) : scenaCommutatore(sc, s, fase);
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

  const s = { vista: "commutatore", file_backend: "finto", variabile: "", domanda: sc.domande[0].id, ollama_acceso: true, chiave: true, rete: true,
    ripetizioni: 1, stile: "interfaccia", modifica: sc.modifiche[0].id, scelte: {}, verificato: false };
  let fase = 0;
  let timer = null;
  let esecuzioni = 0;

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...VISTE.map((v) => el("button", { "data-v": v, onclick: () => cambia({ vista: v }) }, E[`vista_${v}`])));
  const selDomanda = el("select", { "aria-label": E.domanda, onchange: (e) => cambia({ domanda: e.target.value }) },
    ...sc.domande.map((d) => el("option", { value: d.id }, d.testo)));
  const segFile = el("div", { class: "segmentato", role: "group", "aria-label": E.file_backend },
    ...sc.config.ammessi.map((b) => el("button", { "data-v": b, onclick: () => cambia({ file_backend: b }) }, b)));
  const selVariabile = el("select", { "aria-label": E.variabile, onchange: (e) => cambia({ variabile: e.target.value }) },
    ...sc.valori_variabile.map((v) => el("option", { value: v }, v || E.non_impostata)));
  const interruttore = (testoEt, chiave) => {
    const inp = el("input", { type: "checkbox", "aria-label": testoEt, onchange: (e) => cambia({ [chiave]: e.target.checked }) });
    return { nodo: el("label", { class: "interruttore" }, el("span", {}, testoEt), inp), inp };
  };
  const inOllama = interruttore(E.ollama_acceso, "ollama_acceso");
  const inChiave = interruttore(E.chiave, "chiave");
  const inRete = interruttore(E.rete, "rete");
  const btnChiedi = el("button", { class: "btn btn-primario", onclick: () => cambia({ ripetizioni: 1 }, true) }, E.chiedi);
  const btnDue = el("button", { class: "btn", onclick: () => cambia({ ripetizioni: 2 }, true) }, E.chiedi_due);
  const zonaCom = el("div", { class: "cb-zona" },
    el("label", {}, el("span", {}, E.domanda), selDomanda),
    el("h4", {}, E.file_backend), segFile,
    el("label", {}, el("span", {}, E.variabile), selVariabile),
    inOllama.nodo, inChiave.nodo, inRete.nodo,
    el("div", { class: "cb-fila" }, btnChiedi, btnDue));
  const segStile = el("div", { class: "segmentato", role: "group", "aria-label": E.stile },
    ...STILI.map((v) => el("button", { "data-v": v, onclick: () => cambia({ stile: v }) }, E[`stile_${v}`])));
  const segModifica = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.modifica },
    ...sc.modifiche.map((m) => el("button", { "data-v": m.id, onclick: () => cambia({ modifica: m.id }) }, m.nome)));
  const zonaSparso = el("div", { class: "cb-zona" }, el("h4", {}, E.stile), segStile, el("h4", {}, E.modifica), segModifica);
  const tendine = {};
  const zonaDecidi = el("div", { class: "cb-zona" });
  sc.casi.forEach((c, i) => {
    const sel = el("select", { "aria-label": riempi(T.scegli_per, { n: i + 1 }), onchange: (e) => scegli(c.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.risposte_gioco.map((r) => el("option", { value: r.id }, r.nome)));
    tendine[c.id] = sel;
    zonaDecidi.append(el("label", {}, el("span", {}, riempi(T.caso, { n: i + 1 })), sel));
  });
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => cambia({ verificato: true }, true) }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaCom, zonaSparso, zonaDecidi);

  // ------------------------------------------------ scena ed esiti
  const scenaNodo = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${VIEWBOX.w} ${VIEWBOX.h}`, role: "img", "aria-label": E.descrizione_scena });
  const titolo = svgEl("text", { x: VIEWBOX.w / 2, y: 26, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: COLORE.tenue, "letter-spacing": ".06em" });
  const gScena = svgEl("g");
  svg.append(titolo, gScena);
  const esiti = el("section", { class: "esiti-commutatore", "aria-live": "polite", "aria-label": E.titolo_esiti });
  scenaNodo.append(svg, esiti);
  const destra = el("aside", { class: "pannello destra" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scenaNodo, destra));

  function disegnaScena() {
    const { titolo: t, elementi } = scena(sc, s, fase);
    titolo.textContent = t;
    gScena.replaceChildren(...elementi.map((x) => {
      if (x.t === "rect") return svgEl("rect", { x: x.x, y: x.y, width: x.w, height: x.h, rx: x.rx || 0, fill: x.fill, stroke: x.stroke, "stroke-width": x.sw, ...(x.dash ? { "stroke-dasharray": x.dash } : {}) });
      if (x.t === "path") return svgEl("path", { d: x.d, fill: "none", stroke: x.stroke, "stroke-width": x.sw, ...(x.dash ? { "stroke-dasharray": x.dash } : {}) });
      if (x.t === "circle") return svgEl("circle", { cx: x.cx, cy: x.cy, r: x.r, fill: x.fill, class: x.cls || "" });
      const n = svgEl("text", { x: x.x, y: x.y, "font-size": x.px, "font-weight": x.peso, fill: x.colore, "text-anchor": x.anchor, ...(x.mono ? { "font-family": "ui-monospace, Consolas, monospace" } : {}), ...(x.corsivo ? { "font-style": "italic" } : {}) });
      n.textContent = x.testo;
      return n;
    }));
  }
  function disegnaEsiti() {
    const figli = [el("h4", {}, E.titolo_esiti)];
    const finale = fase >= fasiTotali(sc, s) - 1;
    if (s.vista === "commutatore") {
      const giri = s.ripetizioni === 2 ? [1, 2] : [1];
      const term = el("div", { class: "cb-terminale" });
      for (const g of giri) {
        term.append(el("div", { class: "cb-cmd" }, comando(sc, s)));
        const r = esegui(sc, s, g);
        if (finale) term.append(el("div", { class: r.ok ? "" : "cb-err" }, uscitaTerminale(r)), el("div", { class: "cb-attesa" }, riempi(T.codice_uscita, { n: r.uscita })));
        else term.append(el("div", { class: "cb-attesa" }, T.in_corso));
      }
      figli.push(el("div", { class: "cb-nota" }, riempi(T.esecuzione_n, { n: esecuzioni })), term);
      if (finale) {
        const r = esegui(sc, s, 1);
        figli.push(el("div", { class: `cb-esito ${r.ok ? "cb-ok" : "cb-male"}` }, r.ok ? riempi(T.esito_ok, { backend: r.backend }) : T[`esito_fermo_${r.fermo}`]));
        if (s.ripetizioni === 2 && r.ok) {
          const c = confronto(sc, s);
          figli.push(el("div", { class: `cb-esito ${c.uguali ? "cb-ok" : "cb-avviso"}` }, c.uguali ? T.confronto_uguali : T.confronto_diversi));
        }
        figli.push(el("div", { class: "cb-esito cb-ok" }, T.righe_cambiate));
      }
    } else if (s.vista === "sparso") {
      for (const st of STILI) {
        const n = conteggio(sc, st, s.modifica);
        figli.push(el("div", { class: `cb-esito ${n.chiamanti ? "cb-male" : "cb-ok"}${st === s.stile ? " cb-scelto" : ""}` },
          riempi(T.riga_confronto, { stile: E[`stile_${st}`], punti: n.punti, chiamanti: n.chiamanti })));
      }
    } else if (s.verificato) {
      const v = verifica(sc, s);
      figli.push(el("div", { class: `cb-esito ${v.giuste === v.totali ? "cb-ok" : "cb-avviso"}` }, v.sintesi),
        ...v.righe.map((r) => el("div", { class: `cb-esito ${r.esito === "giusto" ? "cb-ok" : "cb-male"}` }, r.testo)));
    } else {
      figli.push(el("div", { class: "cb-nota" }, T.decidi_istruzioni));
    }
    esiti.replaceChildren(...figli);
  }
  function disegnaDestra() {
    const figli = [];
    if (s.vista === "commutatore") {
      const sc_ = scegliBackend(sc, s);
      figli.push(el("h3", {}, E.titolo_spiegazioni));
      figli.push(el("p", {}, riempi(sc_.errore ? T.scelto_errore : T[`scelto_da_${sc_.origine}`], { backend: sc_.backend || s.variabile, variabile: sc.config.variabile_backend })));
      if (sc_.backend) {
        const b = backendDi(sc, sc_.backend);
        figli.push(el("div", { class: "cb-tabella" }, ...["modello", "dove", "rete", "chiave", "costo", "ripetibile", "attesa"].map((k) => el("div", {}, el("span", {}, E[`prop_${k}`]), el("b", {}, b[k])))));
        figli.push(el("p", { class: "cb-nota" }, riempi(T.why_sezione, { why: b.why })));
      }
    } else if (s.vista === "sparso") {
      const m = sc.modifiche.find((x) => x.id === s.modifica);
      figli.push(el("h3", {}, m.nome), el("p", {}, m.spiega));
      const p = puntiDaToccare(sc, s.stile, s.modifica);
      figli.push(el("h4", {}, E[`stile_${s.stile}`]));
      figli.push(p.length ? el("ul", { class: "cb-punti" }, ...p.map((x) => el("li", {}, x.cosa))) : el("p", { class: "cb-nota" }, T.nessun_punto));
    } else {
      figli.push(el("h3", {}, E.titolo_decidi), el("p", {}, T.decidi_istruzioni));
      for (const r of sc.risposte_gioco) figli.push(el("p", { class: "cb-nota" }, el("b", {}, r.nome), ` — ${r.quando}`));
    }
    figli.push(el("div", { class: "cb-regola" }, E.regola));
    destra.replaceChildren(...figli);
    if (!ridotto && destra.animate) destra.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 220 });
  }
  function aggiornaComandi() {
    const premi = (gruppo, valore) => gruppo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === valore)));
    premi(segVista, s.vista);
    premi(segFile, s.file_backend);
    premi(segStile, s.stile);
    premi(segModifica, s.modifica);
    selDomanda.value = s.domanda;
    selVariabile.value = s.variabile;
    inOllama.inp.checked = s.ollama_acceso;
    inChiave.inp.checked = s.chiave;
    inRete.inp.checked = s.rete;
    zonaCom.classList.toggle("nascosto", s.vista !== "commutatore");
    zonaSparso.classList.toggle("nascosto", s.vista !== "sparso");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaEsiti(); disegnaDestra(); }
  function ferma() { if (timer !== null) clearTimeout(timer); timer = null; }
  /** Sequenza animata: la richiesta attraversa chiamante, commutatore e backend (o i punti toccati compaiono uno a uno). */
  function avvia() {
    ferma();
    esecuzioni += 1;
    const totali = fasiTotali(sc, s);
    fase = ridotto ? totali - 1 : 0;
    ridisegna();
    const passo = () => {
      if (fase >= totali - 1) { timer = null; return; }
      fase += 1;
      disegnaScena();
      disegnaEsiti();
      timer = setTimeout(passo, sc.parametri.ms_fase);
    };
    if (!ridotto) timer = setTimeout(passo, sc.parametri.ms_fase);
  }
  function cambia(diff, mantieni) {
    Object.assign(s, diff);
    if (!mantieni) { s.verificato = false; if (!("ripetizioni" in diff)) s.ripetizioni = 1; }
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
    if (!sc.config.ammessi.includes(nuovo.file_backend)) throw new Error(`stato_animazione: backend del file sconosciuto «${nuovo.file_backend}»`);
    if (!sc.valori_variabile.includes(nuovo.variabile)) throw new Error(`stato_animazione: valore di variabile non previsto «${nuovo.variabile}»`);
    if (!sc.domande.some((d) => d.id === nuovo.domanda)) throw new Error(`stato_animazione: domanda sconosciuta «${nuovo.domanda}»`);
    for (const k of ["ollama_acceso", "chiave", "rete", "verificato"]) if (typeof nuovo[k] !== "boolean") throw new Error(`stato_animazione: ${k} deve essere vero o falso`);
    if (![1, 2].includes(nuovo.ripetizioni)) throw new Error(`stato_animazione: ripetizioni fuori scala «${nuovo.ripetizioni}»`);
    if (!STILI.includes(nuovo.stile)) throw new Error(`stato_animazione: stile sconosciuto «${nuovo.stile}»`);
    if (!sc.modifiche.some((m) => m.id === nuovo.modifica)) throw new Error(`stato_animazione: modifica sconosciuta «${nuovo.modifica}»`);
    for (const [id, r] of Object.entries(nuovo.scelte)) {
      if (!sc.casi.some((c) => c.id === id)) throw new Error(`stato_animazione: caso sconosciuto «${id}»`);
      if (!sc.risposte_gioco.some((x) => x.id === r)) throw new Error(`stato_animazione: risposta sconosciuta «${r}»`);
    }
    Object.assign(s, nuovo);
    avvia();
  }
  applica({});
  return {
    applica,
    distruggi() { ferma(); },
    _prova: { stato: s, fase: () => fase, esegui: (g) => esegui(sc, s, g), scegli: () => scegliBackend(sc, s), conteggio: () => conteggio(sc, s.stile, s.modifica), verifica: () => verifica(sc, s) },
  };
}
