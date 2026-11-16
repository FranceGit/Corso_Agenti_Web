// Lezione interattiva "Il contatore delle ore" (PO6.2, Officina O6). Un mese di Codespaces sul piano gratuito con i
// numeri del materiale (120 ore-core, 15 GB-mese, arresto a 30 minuti, conservazione 30 giorni, limite di spesa 0):
// lo studente sceglie macchina (2/4/8 core), ore e giorni di lavoro, arresto per inattivita' (o fermo a mano),
// codespace tenuti fermi e spazio di ognuno (ipotesi dichiarata), limite di spesa. Il calendario si riempie giorno per
// giorno (sequenza rilanciabile) con le due barre del contatore: si vede il giorno in cui il gratuito finisce, che cosa
// consuma spazio a codespace fermo e che cosa succede dopo (fermo senza addebito o a pagamento). Vista "O1-O5 nel
// codespace": stessi comandi, percorsi /workspaces, conservazione di 30 giorni e commit/push. Gioco "Decidi tu".
// Tutti i testi e i numeri vengono dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "contatore_ore";
const VISTE = ["contatore", "trasloco", "decidi"];
const LIMITI = ["zero", "sopra"];
const CURSORI = ["ore_giorno", "giorni", "inattivita", "tenuti", "gb", "assenza"];
const W = 720, H = 440;
const BAR = { x: 150, w: 400, h: 16, y1: 48, y2: 84 };
const CAL = { x0: 20, passo: 22.6, w: 20.6, y: 132, h: 34 };
const CS = { x0: 20, passo: 114, y: 238, w: 104, h: 82 };
const UNI = { x: 20, w: 680, y0: 40, passo: 46, h: 40 };
const LINEA = { x0: 40, x1: 680, y: 312 };
const CASO = { x: 20, y0: 56, passo: 74, w: 680, h: 64 };
const EPS = 1e-9;

const STILE = `
.lz-contatore_ore .co-pulsanti { display: grid; gap: 6px; margin: 8px 0; }
.lz-contatore_ore .co-pulsanti .btn { justify-content: center; }
.lz-contatore_ore .co-conto { display: grid; gap: 6px; font-size: .84rem; }
.lz-contatore_ore .co-conto .co-riga { display: flex; justify-content: space-between; gap: 8px; }
.lz-contatore_ore .co-conto .co-rientro { padding-left: 12px; color: var(--tenue); font-size: .8rem; }
.lz-contatore_ore .co-conto b { font-variant-numeric: tabular-nums; }
.lz-contatore_ore .co-nota { font-size: .76rem; color: var(--tenue); margin: 6px 0 0; }
.lz-contatore_ore .co-passi { display: grid; gap: 4px; font-size: .82rem; margin: 6px 0; }
.lz-contatore_ore .co-regola { margin-top: 10px; padding: 8px 10px; border-left: 4px solid #4f46e5; background: #eef2ff; border-radius: 0 10px 10px 0; font-weight: 700; font-size: .84rem; }
.lz-contatore_ore .esiti-contatore { margin-top: 10px; border-top: 1px solid #dfe4f0; padding: 10px 4px 2px; }
.lz-contatore_ore .esiti-contatore h4 { margin: 0 0 6px; font-size: .8rem; text-transform: uppercase; letter-spacing: .07em; color: var(--tenue); }
.lz-contatore_ore .co-elenco { display: grid; gap: 5px; margin-top: 6px; max-height: 230px; overflow-y: auto; padding-right: 4px; }
.lz-contatore_ore .co-elenco div { font-size: .78rem; padding: 6px 9px; border-radius: 9px; overflow-wrap: anywhere; }
.lz-contatore_ore .co-elenco .co-ok { background: var(--ok-chiaro); color: #166534; }
.lz-contatore_ore .co-elenco .co-avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-contatore_ore .co-elenco .co-male { background: var(--male-chiaro); color: #9f1239; }
.lz-contatore_ore .co-scelta { display: grid; gap: 3px; margin: 8px 0; font-size: .82rem; }
.lz-contatore_ore .co-verifica { display: grid; gap: 6px; }
.lz-contatore_ore .co-verifica div { font-size: .82rem; padding: 7px 10px; border-radius: 10px; }
.lz-contatore_ore .co-verifica .co-giusto { background: var(--ok-chiaro); color: #166534; }
.lz-contatore_ore .co-verifica .co-quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-contatore_ore .co-verifica .co-sbagliato, .lz-contatore_ore .co-verifica .co-vuoto { background: var(--male-chiaro); color: #9f1239; }
.lz-contatore_ore .co-barra { transition: width .2s linear; }
.lz-contatore_ore.co-ridotto .co-barra { transition: none; }
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

// ------------------------------------------------------------------ logica (pura)

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
/** Una giornata di lavoro: ore di lavoro, ore accese a vuoto (pause lasciate aperte fino all'arresto), ore-core. */
export function giornata(sc, s) {
  const vuoto = s.ferma_a_mano ? 0 : (sc.pause_al_giorno * s.inattivita) / 60;
  const acceso = s.ore_giorno + vuoto;
  return { lavoro: s.ore_giorno, vuoto, acceso, ore_core: acceso * s.core };
}
/** Quali giorni del mese sono di lavoro: `giorni` giorni distribuiti in modo uniforme sui giorni del mese. */
export function giorniLavoro(sc, s) {
  const n = sc.giorni_mese;
  return Array.from({ length: n }, (_, i) => Math.floor(((i + 1) * s.giorni) / n) > Math.floor((i * s.giorni) / n));
}
/** Ore di lavoro gratuite al mese con una macchina: quota ÷ core. */
export function oreGratis(sc, core) {
  return sc.quota_ore_core / core;
}
/**
 * Il mese giorno per giorno: ore-core e GB-mese cumulati (richiesti, non tagliati), giorno di fine del gratuito
 * (il primo che supera una delle due quote), causa e stato di ogni giorno (lavoro, riposo, fermo, pagamento).
 */
export function mese(sc, s) {
  const gio = giornata(sc, s);
  const lavori = giorniLavoro(sc, s);
  const gbGiorno = ((s.tenuti + 1) * s.gb) / sc.giorni_mese;
  let ore = 0, gb = 0, fine = null, causa = null;
  const giorni = lavori.map((lavoro, i) => {
    if (lavoro) ore += gio.ore_core;
    gb += gbGiorno;
    if (fine === null) {
      const oltreOre = ore > sc.quota_ore_core + EPS, oltreGb = gb > sc.quota_gb_mese + EPS;
      if (oltreOre || oltreGb) { fine = i + 1; causa = oltreOre ? "ore" : "spazio"; }
    }
    const dopo = fine !== null;
    return { g: i + 1, lavoro, ore_cum: ore, gb_cum: gb, stato: dopo ? (s.limite === "zero" ? "fermo" : "pagamento") : lavoro ? "lavoro" : "riposo" };
  });
  const nLavoro = lavori.filter(Boolean).length;
  return {
    giorni, fine, causa, giornata: gio, giorni_lavoro: nLavoro,
    ore_tot: ore, gb_tot: gb, vuoto_tot: gio.vuoto * s.core * nLavoro, gb_fermi: s.tenuti * s.gb,
    avanzo: Math.max(0, sc.quota_ore_core - ore), ore_gratis: oreGratis(sc, s.core),
  };
}
/** Esiti del mese (macchina, ore, spazio, inattivita', limite) e verdetto, con i testi dello scenario. */
export function esitiMese(sc, s, num) {
  const T = sc.testi;
  const f = num || ((x) => String(Math.round(x * 10) / 10));
  const m = mese(sc, s);
  const righe = [];
  righe.push(s.core === Math.min(...sc.macchine)
    ? { id: "macchina", livello: "ok", testo: riempi(T.es_macchina_ok, { core: s.core, ore: f(m.ore_gratis) }) }
    : { id: "macchina", livello: "avviso", testo: riempi(T.es_macchina_grande, { core: s.core, ore: f(m.ore_gratis), ore2: f(oreGratis(sc, Math.min(...sc.macchine))) }) });
  righe.push(m.causa === "ore" || m.ore_tot > sc.quota_ore_core + EPS
    ? { id: "ore", livello: "male", testo: riempi(T.es_ore_finite, { usate: f(m.ore_tot), quota: f(sc.quota_ore_core), g: giornoFine(m, "ore", sc) }) }
    : { id: "ore", livello: "ok", testo: riempi(T.es_ore_ok, { usate: f(m.ore_tot), quota: f(sc.quota_ore_core), avanzo: f(m.avanzo) }) });
  if (m.gb_tot > sc.quota_gb_mese + EPS) righe.push({ id: "spazio", livello: "male", testo: riempi(T.es_spazio_finito, { usati: f(m.gb_tot), quota: f(sc.quota_gb_mese), g: giornoFine(m, "spazio", sc) }) });
  else if (s.tenuti > 0) righe.push({ id: "spazio", livello: "avviso", testo: riempi(T.es_spazio_fermi, { usati: f(m.gb_tot), quota: f(sc.quota_gb_mese), n: s.tenuti, fermi: f(m.gb_fermi) }) });
  else righe.push({ id: "spazio", livello: "ok", testo: riempi(T.es_spazio_ok, { usati: f(m.gb_tot), quota: f(sc.quota_gb_mese) }) });
  if (s.ferma_a_mano) righe.push({ id: "inattivita", livello: "ok", testo: T.es_mano });
  else righe.push(s.inattivita > sc.inattivita_predefinita
    ? { id: "inattivita", livello: "avviso", testo: riempi(T.es_inattivita_alta, { min: s.inattivita, vuoto: f(m.vuoto_tot), pred: sc.inattivita_predefinita }) }
    : { id: "inattivita", livello: "ok", testo: riempi(T.es_inattivita_ok, { min: s.inattivita, vuoto: f(m.vuoto_tot) }) });
  righe.push(s.limite === "zero" ? { id: "limite", livello: "ok", testo: T.es_limite_zero } : { id: "limite", livello: "avviso", testo: T.es_limite_sopra });
  const verdetto = m.fine === null ? { livello: "ok", testo: T.verdetto_basta }
    : s.limite === "zero" ? { livello: "avviso", testo: riempi(T.verdetto_fermo, { g: m.fine }) }
    : { livello: "male", testo: riempi(T.verdetto_paga, { g: m.fine }) };
  return { righe, verdetto, mese: m };
}
/** Primo giorno in cui la quota indicata (ore o spazio) viene superata, anche se l'altra e' finita prima. */
export function giornoFine(m, quale, sc) {
  const d = m.giorni.find((x) => (quale === "ore" ? x.ore_cum > sc.quota_ore_core + EPS : x.gb_cum > sc.quota_gb_mese + EPS));
  return d ? d.g : null;
}
/** Il codespace lasciato fermo: salvo (lavoro spinto), perso (cancellato dopo la conservazione), a rischio. */
export function trasloco(sc, s) {
  const T = sc.testi;
  const cancellato = s.assenza >= sc.conservazione_giorni;
  if (s.push) return { esito: "salvo", livello: "ok", cancellato, testo: T.tr_salvo };
  if (cancellato) return { esito: "perso", livello: "male", cancellato, testo: riempi(T.tr_perso, { g: s.assenza, c: sc.conservazione_giorni }) };
  return { esito: "rischio", livello: "avviso", cancellato, testo: riempi(T.tr_rischio, { r: sc.conservazione_giorni - s.assenza }) };
}
/** Riscontro del gioco "Decidi tu". */
export function verifica(sc, s) {
  const T = sc.testi;
  const nome = (id) => sc.azioni.find((a) => a.id === id).nome;
  const righe = sc.casi.map((c, i) => {
    const scelta = s.scelte[c.id] || "";
    const esito = !scelta ? "vuoto" : scelta === c.migliore ? "giusto" : c.quasi.includes(scelta) ? "quasi" : "sbagliato";
    return { id: c.id, esito, testo: riempi(T[`ver_${esito}`], { n: i + 1, migliore: nome(c.migliore), spiega: c.spiega }) };
  });
  const giuste = righe.filter((r) => r.esito === "giusto").length;
  return { righe, giuste, totali: righe.length, sintesi: giuste === righe.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righe.length }) };
}
/** Larghezza di una barra del contatore: la quota sta a meta' della barra, oltre il doppio si taglia. */
export function larghezzaBarra(valore, quota) {
  return Math.min(BAR.w, (valore / (2 * quota)) * BAR.w);
}
/** Controlla uno stato: chiavi note e valori ammessi. Restituisce lo stato normalizzato. */
export function validaStato(sc, base, stato) {
  const ammessi = Object.keys(base);
  for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
  const n = { ...base, ...(stato || {}) };
  n.scelte = { ...(n.scelte || {}) };
  if (!VISTE.includes(n.vista)) throw new Error(`stato_animazione: vista sconosciuta «${n.vista}»`);
  if (!sc.macchine.includes(n.core)) throw new Error(`stato_animazione: macchina sconosciuta «${n.core}»`);
  if (!LIMITI.includes(n.limite)) throw new Error(`stato_animazione: limite sconosciuto «${n.limite}»`);
  for (const k of CURSORI) if (!(typeof n[k] === "number" && n[k] >= sc[k].min && n[k] <= sc[k].max)) throw new Error(`stato_animazione: ${k} fuori scala «${n[k]}»`);
  for (const k of ["ferma_a_mano", "push", "verificato"]) if (typeof n[k] !== "boolean") throw new Error(`stato_animazione: ${k} deve essere vero o falso`);
  for (const [id, r] of Object.entries(n.scelte)) {
    if (!sc.casi.some((c) => c.id === id)) throw new Error(`stato_animazione: situazione sconosciuta «${id}»`);
    if (!sc.azioni.some((a) => a.id === r)) throw new Error(`stato_animazione: mossa sconosciuta «${r}»`);
  }
  return n;
}
export const DIMENSIONI = { w: W, h: H, barra: BAR, calendario: CAL, codespace: CS, unita: UNI, linea: LINEA, caso: CASO };

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

  const s = { vista: VISTE[0], ...sc.riferimento, scelte: {}, verificato: false };
  let giornoVisto = sc.giorni_mese; // giorni del calendario gia' mostrati (sequenza)
  let assenzaVista = s.assenza; // giorni di assenza gia' percorsi sulla linea (sequenza)
  let timer = [];
  const ferma = () => { for (const t of timer) clearTimeout(t); timer = []; };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...VISTE.map((v) => el("button", { "data-v": v, onclick: () => cambia({ vista: v }) }, E[`vista_${v}`])));
  const segCore = el("div", { class: "segmentato", role: "group", "aria-label": E.macchina },
    ...sc.macchine.map((c) => el("button", { "data-v": String(c), onclick: () => cambia({ core: c }) }, riempi(E.core, { n: c }))));
  const segLimite = el("div", { class: "segmentato", role: "group", "aria-label": E.limite },
    ...LIMITI.map((l) => el("button", { "data-v": l, onclick: () => cambia({ limite: l }) }, E[`limite_${l}`])));
  const cursori = {};
  for (const k of CURSORI) {
    const def = sc[k];
    const val = el("b", {});
    const inp = el("input", { type: "range", min: def.min, max: def.max, step: def.passo, "aria-label": def.etichetta });
    inp.addEventListener("input", () => cambia({ [k]: Number(inp.value) }));
    cursori[k] = { nodo: el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, def.etichetta), val), inp), val, inp };
  }
  const casella = (testo, chiave) => {
    const inp = el("input", { type: "checkbox", onchange: (e) => cambia({ [chiave]: e.target.checked }) });
    return { nodo: el("label", { class: "interruttore" }, el("span", {}, testo), inp), inp };
  };
  const cMano = casella(E.ferma_a_mano, "ferma_a_mano");
  const cPush = casella(E.push, "push");
  const btnRifai = el("button", { class: "btn btn-primario", onclick: () => cambia({}) }, E.rifai);
  const zonaContatore = el("div", {}, el("h4", {}, E.macchina), segCore, cursori.ore_giorno.nodo, cursori.giorni.nodo, cursori.inattivita.nodo, cMano.nodo,
    cursori.tenuti.nodo, cursori.gb.nodo, el("h4", {}, E.limite), segLimite);
  const zonaTrasloco = el("div", {}, cPush.nodo, cursori.assenza.nodo);
  const tendine = {};
  const zonaDecidi = el("div", {});
  sc.casi.forEach((c, i) => {
    const sel = el("select", { "aria-label": riempi(T.scegli_per, { n: i + 1 }), onchange: (e) => scegli(c.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.azioni.map((a) => el("option", { value: a.id }, a.nome)));
    tendine[c.id] = sel;
    zonaDecidi.append(el("label", { class: "co-scelta" }, el("span", {}, riempi(T.situazione, { n: i + 1 })), sel));
  });
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => cambia({ verificato: true }) }, E.controlla));
  const zonaRifai = el("div", { class: "co-pulsanti" }, btnRifai);
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaContatore, zonaTrasloco, zonaDecidi, zonaRifai);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  const gScena = svgEl("g");
  svg.append(gScena);
  const esiti = el("section", { class: "esiti-contatore", "aria-live": "polite", "aria-label": E.titolo_esiti });
  scena.append(svg, esiti);
  const destra = el("aside", { class: "pannello destra", "aria-live": "polite" });
  const banco = el("div", { class: `banco lz-${COMPONENTE}${ridotto ? " co-ridotto" : ""}` }, comandi, scena, destra);
  radice.replaceChildren(banco);
  let gVivo = null; // parte della scena ridisegnata a ogni passo della sequenza

  const titolo = (g, testo) => g.append(testoSvg({ x: W / 2, y: 24, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".05em" }, testo));
  const COL_STATO = { lavoro: "#4f46e5", riposo: "#e2e8f0", fermo: "#fecdd3", pagamento: "#fde68a", nascosto: "#f8fafc" };

  function disegnaVivoContatore() {
    gVivo.replaceChildren();
    const g = gVivo;
    const m = mese(sc, s);
    const d = m.giorni[Math.max(0, giornoVisto - 1)];
    const ore = giornoVisto ? d.ore_cum : 0, gb = giornoVisto ? d.gb_cum : 0;
    // due barre
    for (const [y, etichetta, valore, quota, modello] of [[BAR.y1, E.barra_ore, ore, sc.quota_ore_core, T.barra_ore], [BAR.y2, E.barra_gb, gb, sc.quota_gb_mese, T.barra_gb]]) {
      const oltre = valore > quota + EPS;
      g.append(testoSvg({ x: 20, y: y + 12, "font-size": 10.5, "font-weight": 800, fill: "#17203b" }, etichetta),
        svgEl("rect", { x: BAR.x, y, width: BAR.w, height: BAR.h, rx: 8, fill: "#eef1f8" }),
        svgEl("rect", { class: "co-barra", x: BAR.x, y, width: larghezzaBarra(valore, quota), height: BAR.h, rx: 8, fill: oltre ? "#e11d48" : "#4f46e5" }),
        svgEl("line", { x1: BAR.x + BAR.w / 2, y1: y - 4, x2: BAR.x + BAR.w / 2, y2: y + BAR.h + 4, stroke: "#17203b", "stroke-width": 2, "stroke-dasharray": "3 2" }),
        testoSvg({ x: BAR.x + BAR.w / 2 + 4, y: y - 2, "font-size": 8, fill: "#5b6684" }, E.gratis_fino),
        testoSvg({ x: 700, y: y + 12, "text-anchor": "end", "font-size": 10, "font-weight": 700, fill: oltre ? "#e11d48" : "#17203b" },
          riempi(modello, { usate: num(valore), usati: num(valore), quota: num(quota) })));
    }
    // giornata tipo
    const gio = m.giornata;
    g.append(testoSvg({ x: 20, y: 120, "font-size": 10, fill: "#334155" },
      riempi(T.giorno_tipo, { ore: num(gio.lavoro), vuoto: num(gio.vuoto), acceso: num(gio.acceso), core: s.core, totale: num(gio.ore_core) })));
    // calendario
    m.giorni.forEach((x, i) => {
      const cx = CAL.x0 + i * CAL.passo;
      const visto = i < giornoVisto;
      const stato = visto ? x.stato : "nascosto";
      const fineQui = m.fine === x.g && visto;
      g.append(svgEl("rect", { x: cx, y: CAL.y, width: CAL.w, height: CAL.h, rx: 4, fill: COL_STATO[stato], stroke: fineQui ? "#e11d48" : "#cbd2e3", "stroke-width": fineQui ? 2.2 : 1 }),
        testoSvg({ x: cx + CAL.w / 2, y: CAL.y + 12, "text-anchor": "middle", "font-size": 8.5, "font-weight": 700, fill: stato === "lavoro" ? "#fff" : "#475569" }, String(x.g)));
      if (visto && (x.stato === "fermo" || x.stato === "pagamento")) g.append(testoSvg({ x: cx + CAL.w / 2, y: CAL.y + 27, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: x.stato === "fermo" ? "#be123c" : "#92400e" }, x.stato === "fermo" ? E.segno_fermo : E.segno_paga));
      else if (visto && x.lavoro) g.append(svgEl("circle", { cx: cx + CAL.w / 2, cy: CAL.y + 24, r: 3, fill: "#c7d2fe" }));
    });
    // fine del gratuito
    const fineTesto = m.fine === null ? riempi(T.basta, { avanzo: num(m.avanzo), ore: num(m.avanzo / s.core), core: s.core })
      : riempi(T.fine_e_dopo, { fine: riempi(m.causa === "ore" ? T.fine_ore : T.fine_spazio, { g: m.fine }), dopo: s.limite === "zero" ? T.dopo_fermo : T.dopo_paga });
    const finito = giornoVisto >= sc.giorni_mese;
    aCapo(fineTesto, 110).slice(0, 2).forEach((r, k) => g.append(testoSvg({ x: 20, y: 184 + k * 13, "font-size": 10.5, "font-weight": 800, fill: !finito ? "#94a3b8" : m.fine === null ? "#16a34a" : s.limite === "zero" ? "#be123c" : "#92400e" }, r)));
    // legenda
    let lx = 20;
    for (const [stato, testo] of [["lavoro", E.legenda_lavoro], ["riposo", E.legenda_riposo], ["fermo", E.legenda_fermo], ["pagamento", E.legenda_paga]]) {
      g.append(svgEl("rect", { x: lx, y: 208, width: 10, height: 10, rx: 2, fill: COL_STATO[stato], stroke: "#cbd2e3" }), testoSvg({ x: lx + 14, y: 217, "font-size": 9, fill: "#5b6684" }, testo));
      lx += 26 + testo.length * 5.2;
    }
  }
  function disegnaContatore(g) {
    titolo(g, E.titolo_contatore);
    gVivo = svgEl("g");
    g.append(gVivo);
    disegnaVivoContatore();
    // codespace tenuti
    g.append(testoSvg({ x: 20, y: CS.y - 6, "font-size": 10.5, "font-weight": 800, fill: "#17203b" }, E.i_tuoi_codespace));
    for (let i = 0; i <= s.tenuti; i++) {
      const x = CS.x0 + i * CS.passo, attivo = i === 0;
      g.append(svgEl("rect", { x, y: CS.y, width: CS.w, height: CS.h, rx: 10, fill: attivo ? "#ecfdf5" : "#f1f5f9", stroke: attivo ? "#16a34a" : "#94a3b8", "stroke-width": 1.6, "stroke-dasharray": attivo ? "" : "5 3" }),
        svgEl("rect", { x: x + 10, y: CS.y + 10, width: 30, height: 20, rx: 3, fill: attivo ? "#16a34a" : "#cbd5e1" }),
        svgEl("rect", { x: x + 48, y: CS.y + 12, width: 14 + s.gb * 3.6, height: 8, rx: 3, fill: "#a78bfa" }));
      aCapo(riempi(attivo ? T.cs_attivo : T.cs_fermo, { gb: num(s.gb) }), sc.a_capo_codespace).slice(0, 3).forEach((r, k) =>
        g.append(testoSvg({ x: x + 10, y: CS.y + 46 + k * 11, "font-size": 9, "font-weight": attivo ? 700 : 500, fill: attivo ? "#166534" : "#475569" }, r)));
    }
    // note: numeri da riverificare e ipotesi del contatore
    const note = [...aCapo(T.nota_numeri, sc.a_capo_nota), ...aCapo(T.nota_ipotesi, sc.a_capo_nota)];
    note.slice(0, 6).forEach((r, k) => g.append(testoSvg({ x: 20, y: 352 + k * 13, "font-size": 9, "font-style": "italic", fill: "#5b6684" }, r)));
  }
  function disegnaVivoTrasloco() {
    gVivo.replaceChildren();
    const g = gVivo;
    const t = trasloco(sc, { ...s, assenza: assenzaVista });
    const max = sc.assenza.max;
    const xg = (d) => LINEA.x0 + (d / max) * (LINEA.x1 - LINEA.x0);
    g.append(svgEl("rect", { x: LINEA.x0, y: LINEA.y, width: xg(assenzaVista) - LINEA.x0, height: 10, rx: 5, fill: t.cancellato ? "#fda4af" : "#a5b4fc" }),
      svgEl("path", { d: `M${xg(assenzaVista)} ${LINEA.y - 4} l-6 -9 h12 z`, fill: "#17203b" }));
    // stato del codespace e del repo
    const scatola = (x, nome, testo, buono) => g.append(svgEl("rect", { x, y: 350, width: 320, height: 46, rx: 10, fill: buono ? "#ecfdf5" : "#fff1f2", stroke: buono ? "#16a34a" : "#e11d48", "stroke-width": 1.6 }),
      testoSvg({ x: x + 12, y: 368, "font-size": 10, "font-weight": 800, fill: "#17203b" }, nome),
      testoSvg({ x: x + 12, y: 386, "font-size": 10, fill: buono ? "#166534" : "#9f1239" }, testo));
    scatola(20, E.codespace, t.cancellato ? E.cs_cancellato : E.cs_esiste, !t.cancellato);
    scatola(380, E.repo, s.push ? E.repo_spinto : E.repo_non_spinto, s.push);
    aCapo(t.testo, 120).slice(0, 2).forEach((r, k) => g.append(testoSvg({ x: 20, y: 416 + k * 13, "font-size": 10, "font-weight": 700, fill: { ok: "#166534", avviso: "#92400e", male: "#be123c" }[t.livello] }, r)));
  }
  function disegnaTrasloco(g) {
    titolo(g, E.titolo_trasloco);
    sc.unita.forEach((u, i) => {
      const y = UNI.y0 + i * UNI.passo;
      g.append(svgEl("rect", { x: UNI.x, y, width: UNI.w, height: UNI.h, rx: 10, fill: "#fff", stroke: "#cbd2e3" }),
        svgEl("circle", { cx: UNI.x + 22, cy: y + UNI.h / 2, r: 13, fill: "#4f46e5" }),
        testoSvg({ x: UNI.x + 22, y: y + UNI.h / 2 + 4, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: "#fff" }, u.id),
        testoSvg({ x: UNI.x + 44, y: y + 16, "font-size": 9, "font-family": "ui-monospace, Consolas, monospace", fill: "#475569" }, u.cartella),
        testoSvg({ x: UNI.x + 44, y: y + 31, "font-size": 9.5, "font-weight": 700, "font-family": "ui-monospace, Consolas, monospace", fill: "#17203b" }, riempi(T.prompt, { c: u.comando })));
      aCapo(u.nota, sc.a_capo_unita).slice(0, 2).forEach((r, k) => g.append(testoSvg({ x: UNI.x + 330, y: y + 16 + k * 13, "font-size": 9, fill: "#334155" }, r)));
    });
    // linea della conservazione
    const max = sc.assenza.max;
    const xg = (d) => LINEA.x0 + (d / max) * (LINEA.x1 - LINEA.x0);
    g.append(testoSvg({ x: 20, y: LINEA.y - 34, "font-size": 10.5, "font-weight": 800, fill: "#17203b" }, E.timeline),
      svgEl("rect", { x: LINEA.x0, y: LINEA.y, width: LINEA.x1 - LINEA.x0, height: 10, rx: 5, fill: "#eef1f8" }),
      svgEl("line", { x1: xg(sc.conservazione_giorni), y1: LINEA.y - 6, x2: xg(sc.conservazione_giorni), y2: LINEA.y + 18, stroke: "#e11d48", "stroke-width": 2, "stroke-dasharray": "4 3" }),
      testoSvg({ x: xg(sc.conservazione_giorni), y: LINEA.y + 30, "text-anchor": "middle", "font-size": 9, "font-weight": 700, fill: "#be123c" }, riempi(T.tr_soglia, { c: sc.conservazione_giorni })),
      testoSvg({ x: LINEA.x0, y: LINEA.y + 24, "text-anchor": "middle", "font-size": 8.5, fill: "#5b6684" }, "0"),
      testoSvg({ x: LINEA.x1, y: LINEA.y + 24, "text-anchor": "middle", "font-size": 8.5, fill: "#5b6684" }, String(max)));
    // traguardo scelto: dove arriva l'assenza (la freccia piena lo raggiunge durante la sequenza)
    g.append(svgEl("path", { d: `M${xg(s.assenza)} ${LINEA.y - 4} l-6 -9 h12 z`, fill: "none", stroke: "#17203b", "stroke-width": 1.4, "stroke-dasharray": "2 2" }),
      testoSvg({ x: Math.min(Math.max(xg(s.assenza), 90), 630), y: LINEA.y - 16, "text-anchor": "middle", "font-size": 9.5, "font-weight": 800, fill: "#17203b" }, riempi(T.tr_assenza, { g: s.assenza })));
    gVivo = svgEl("g");
    g.append(gVivo);
    disegnaVivoTrasloco();
  }
  function disegnaDecidi(g) {
    titolo(g, E.titolo_decidi);
    const v = s.verificato ? verifica(sc, s) : null;
    sc.casi.forEach((c, i) => {
      const y = CASO.y0 + i * CASO.passo;
      const scelta = s.scelte[c.id];
      const esito = v ? v.righe[i].esito : null;
      const bordo = esito === "giusto" ? "#16a34a" : esito === "quasi" ? "#d97706" : esito ? "#dc2626" : scelta ? "#4f46e5" : "#cbd2e3";
      g.append(svgEl("rect", { x: CASO.x, y, width: CASO.w, height: CASO.h, rx: 12, fill: "#fff", stroke: bordo, "stroke-width": esito ? 2.2 : 1.5 }),
        testoSvg({ x: CASO.x + 12, y: y + 18, "font-size": 10.5, "font-weight": 800, fill: "#4f46e5" }, riempi(T.situazione, { n: i + 1 })));
      aCapo(c.testo, sc.a_capo_situazione).slice(0, 2).forEach((r, k) => g.append(testoSvg({ x: CASO.x + 12, y: y + 35 + k * 14, "font-size": 10.5, fill: "#17203b" }, r)));
      if (scelta) g.append(testoSvg({ x: CASO.x + CASO.w - 12, y: y + 18, "text-anchor": "end", "font-size": 10, "font-weight": 800, fill: bordo }, sc.azioni.find((a) => a.id === scelta).nome));
    });
  }
  function disegnaScena() {
    gScena.replaceChildren();
    gVivo = null;
    ({ contatore: disegnaContatore, trasloco: disegnaTrasloco, decidi: disegnaDecidi })[s.vista](gScena);
  }
  function disegnaEsiti() {
    const figli = [el("h4", {}, E.titolo_esiti)];
    const cl = { ok: "ok", avviso: "avviso", male: "male" };
    if (s.vista === "contatore") {
      const e = esitiMese(sc, s, num);
      figli.push(el("div", { class: `esito-scheda ${cl[e.verdetto.livello]}` }, el("div", {}, e.verdetto.testo)),
        el("div", { class: "co-elenco" }, ...e.righe.map((r) => el("div", { class: `co-${r.livello}` }, r.testo))));
    } else if (s.vista === "trasloco") {
      const t = trasloco(sc, s);
      figli.push(el("div", { class: `esito-scheda ${cl[t.livello]}` }, el("div", {}, t.testo)),
        el("div", { class: "co-elenco" }, ...sc.unita.map((u) => el("div", { class: "co-ok" }, riempi(T.riga_unita, { id: u.id, comando: u.comando, nota: u.nota })))));
    } else figli.push(el("p", { class: "co-nota" }, s.verificato ? verifica(sc, s).sintesi : T.nota_decidi));
    esiti.replaceChildren(...figli);
  }
  function disegnaDestra() {
    const figli = [];
    if (s.vista === "contatore") {
      const m = mese(sc, s);
      const riga = (et, val, cl) => el("div", { class: `co-riga ${cl || ""}` }, el("span", {}, et), el("b", {}, val));
      figli.push(el("h3", {}, E.titolo_conto), el("div", { class: "co-conto" },
        riga(E.riga_usate, riempi(T.barra_ore, { usate: num(m.ore_tot), quota: num(sc.quota_ore_core) })),
        riga(E.riga_vuoto, num(m.vuoto_tot), "co-rientro"),
        riga(E.riga_lavoro, riempi(T.valore_ore, { n: num(m.ore_gratis) })),
        riga(E.riga_gb, riempi(T.barra_gb, { usati: num(m.gb_tot), quota: num(sc.quota_gb_mese) })),
        riga(E.riga_fine, m.fine === null ? E.mai : riempi(E.giorno, { g: m.fine }))),
        el("p", { class: "co-nota" }, T.nota_numeri));
    } else if (s.vista === "trasloco") {
      figli.push(el("h3", {}, E.titolo_trasloco_destra), el("div", { class: "co-passi" }, ...E.passi_trasloco.map((p) => el("div", {}, p))), el("p", { class: "co-nota" }, T.nota_numeri));
    } else {
      figli.push(el("h3", {}, E.titolo_verifica));
      if (s.verificato) {
        const v = verifica(sc, s);
        figli.push(el("div", { class: "co-verifica" },
          el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
          ...v.righe.map((r) => el("div", { class: `co-${r.esito}` }, r.testo))));
      } else figli.push(el("p", { class: "co-nota" }, T.nota_decidi));
    }
    figli.push(el("div", { class: "co-regola" }, E.regola));
    destra.replaceChildren(...figli);
  }
  function aggiornaComandi() {
    const premi = (gruppo, valore) => gruppo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === valore)));
    premi(segVista, s.vista);
    premi(segCore, String(s.core));
    premi(segLimite, s.limite);
    const formato = { ore_giorno: T.valore_ore, giorni: T.valore_n, inattivita: T.valore_min, tenuti: T.valore_n, gb: T.valore_gb, assenza: T.valore_n };
    for (const k of CURSORI) { cursori[k].inp.value = s[k]; cursori[k].val.textContent = riempi(formato[k], { n: num(s[k]) }); }
    cMano.inp.checked = s.ferma_a_mano;
    cPush.inp.checked = s.push;
    cursori.inattivita.inp.disabled = s.ferma_a_mano;
    zonaContatore.classList.toggle("nascosto", s.vista !== "contatore");
    zonaTrasloco.classList.toggle("nascosto", s.vista !== "trasloco");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    zonaRifai.classList.toggle("nascosto", s.vista === "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }
  // sequenza: il calendario si riempie giorno per giorno; la linea dell'assenza avanza fino al giorno scelto
  function avvia() {
    ferma();
    if (ridotto || s.vista === "decidi") {
      giornoVisto = sc.giorni_mese; assenzaVista = s.assenza;
      if (gVivo) (s.vista === "contatore" ? disegnaVivoContatore : disegnaVivoTrasloco)();
      return;
    }
    if (s.vista === "contatore") {
      giornoVisto = 0;
      disegnaVivoContatore();
      const passo = () => { giornoVisto += 1; if (gVivo) disegnaVivoContatore(); if (giornoVisto < sc.giorni_mese) timer.push(setTimeout(passo, sc.ms_giorno)); };
      timer.push(setTimeout(passo, sc.ms_giorno));
    } else {
      assenzaVista = 0;
      disegnaVivoTrasloco();
      const passo = () => { assenzaVista += 1; if (gVivo) disegnaVivoTrasloco(); if (assenzaVista < s.assenza) timer.push(setTimeout(passo, sc.ms_assenza)); };
      if (s.assenza > 0) timer.push(setTimeout(passo, sc.ms_assenza));
    }
  }
  function ridisegna() { ferma(); giornoVisto = sc.giorni_mese; assenzaVista = s.assenza; aggiornaComandi(); disegnaScena(); disegnaEsiti(); disegnaDestra(); avvia(); }
  function cambia(diff) {
    Object.assign(s, diff);
    if (!("verificato" in diff)) s.verificato = false;
    ridisegna();
  }
  function scegli(id, valore) {
    const scelte = { ...s.scelte };
    if (valore) scelte[id] = valore; else delete scelte[id];
    cambia({ scelte });
  }
  function applica(stato) {
    Object.assign(s, validaStato(sc, s, stato));
    ridisegna();
  }
  applica({});
  return {
    applica,
    distruggi() { ferma(); },
    _prova: { stato: s, mese: () => mese(sc, s), esiti: () => esitiMese(sc, s), trasloco: () => trasloco(sc, s), verifica: () => verifica(sc, s), giornoVisto: () => giornoVisto },
  };
}
