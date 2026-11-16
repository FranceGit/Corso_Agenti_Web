// Lezione interattiva "Tre prese, tre strumenti" (PO4.1). Un client MCP con tre prese: filesystem, fetch, memory.
// Si collegano e scollegano i server, si accende --read-only sul filesystem e MEMORY_FILE_PATH su memory: la
// configurazione del client (JSON stile «mcpServers») si compone nella scena, riga per riga. Poi una richiesta
// del CRM viaggia dal client alla presa, al server e allo strumento che risponde (nomi veri dai README), oppure si
// ferma dove nessuno puo' rispondere, con il perche'. Gioco "Decidi tu": quale presa e quale strumento.
// Tutti i testi visibili e i dati (comandi, pacchetti, strumenti) vengono dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "tre_prese";
const VISTE = ["banco", "decidi"];
const SERVER_ID = ["filesystem", "fetch", "memory"];
const W = 720, H = 400;
const CLIENT = { x: 16, y: 46, w: 200, h: 312 };
const PRESA = { x: 216, w: 20, h: 34 };
const SRV = { x: 410, y0: 42, passo: 120, w: 294, h: 108 };
const CHIP = { w: 136, h: 18, font: 8.5, scarto: 6 };
const CASO = { x: 20, y0: 48, passo: 68, w: 680, h: 60, caratteri: 100 };
const A_CAPO = { richiesta: 26, breve: 30, comando: 46 };
const MS = { riga: 40, fase: 380 };

const STILE = `
.lz-tre_prese .tp-esiti { margin-top: 8px; border-top: 1px solid #dfe4f0; padding: 8px 4px 2px; display: grid; gap: 8px; }
.lz-tre_prese .tp-esiti h4 { margin: 0; font-size: .74rem; text-transform: uppercase; letter-spacing: .07em; color: var(--tenue); }
.lz-tre_prese .tp-config { margin: 0; padding: 8px 10px; background: #0f172a; color: #cbd5e1; border-radius: 10px; font-family: var(--mono); font-size: .72rem; line-height: 1.45; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 260px; overflow-y: auto; }
.lz-tre_prese .tp-config span { display: block; border-radius: 4px; padding: 0 4px; transition: background .4s, color .4s; }
.lz-tre_prese .tp-config span.tp-nascosta { visibility: hidden; }
.lz-tre_prese .tp-config span.tp-nuova { background: #854d0e; color: #fef9c3; }
.lz-tre_prese .tp-config span.tp-attiva { background: #1e3a8a; color: #e0e7ff; }
.lz-tre_prese .tp-esito { padding: 8px 10px; border-radius: 10px; font-size: .82rem; font-weight: 600; overflow-wrap: anywhere; }
.lz-tre_prese .tp-esito.ok { background: var(--ok-chiaro); color: #166534; }
.lz-tre_prese .tp-esito.avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-tre_prese .tp-esito.male { background: var(--male-chiaro); color: #9f1239; }
.lz-tre_prese .tp-esito.attesa { background: #eef1f8; color: var(--tenue); }
.lz-tre_prese .tp-chiamata { font-family: var(--mono); font-size: .72rem; color: #334155; overflow-wrap: anywhere; }
.lz-tre_prese .tp-server { display: grid; gap: 6px; margin: 8px 0; }
.lz-tre_prese .tp-server div { font-size: .8rem; padding: 6px 8px; border-left: 4px solid #cbd2e3; border-radius: 0 8px 8px 0; background: #f7f9fd; }
.lz-tre_prese .tp-server div.spento { opacity: .55; }
.lz-tre_prese .tp-diario { display: grid; gap: 5px; margin: 6px 0; }
.lz-tre_prese .tp-diario div { font-size: .78rem; padding: 5px 8px; border-radius: 8px; overflow-wrap: anywhere; }
.lz-tre_prese .tp-diario .ok { background: var(--ok-chiaro); color: #166534; }
.lz-tre_prese .tp-diario .avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-tre_prese .tp-diario .male { background: var(--male-chiaro); color: #9f1239; }
.lz-tre_prese .tp-diario .vuoto { color: var(--tenue-2); }
.lz-tre_prese .tp-regola { margin-top: 10px; padding: 8px 10px; border-left: 4px solid #0284c7; background: #f0f9ff; border-radius: 0 10px 10px 0; font-weight: 700; font-size: .82rem; }
.lz-tre_prese .tp-scelta { display: grid; gap: 3px; margin: 8px 0; font-size: .82rem; }
.lz-tre_prese .tp-verifica { display: grid; gap: 6px; }
.lz-tre_prese .tp-verifica .riga { font-size: .8rem; padding: 7px 10px; border-radius: 10px; }
.lz-tre_prese .tp-verifica .giusto { background: var(--ok-chiaro); color: #166534; }
.lz-tre_prese .tp-verifica .quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-tre_prese .tp-verifica .sbagliato, .lz-tre_prese .tp-verifica .vuoto { background: var(--male-chiaro); color: #9f1239; }
.lz-tre_prese .tp-gettone { transition: transform .35s ease; }
.lz-tre_prese.ridotto .tp-gettone, .lz-tre_prese.ridotto .tp-config span { transition: none; }
`;

function svgEl(tag, attr) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attr || {})) if (v !== "" && v !== null && v !== undefined) e.setAttribute(k, v);
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
  for (const p of String(testo).split(" ")) {
    if (riga && (riga + " " + p).length > n) { righe.push(riga); riga = p; } else riga = riga ? `${riga} ${p}` : p;
  }
  if (riga) righe.push(riga);
  return righe;
}

// ------------------------------------------------------------------ logica (pura)

const server = (sc, id) => sc.server.find((x) => x.id === id);
const richiesta = (sc, id) => sc.richieste.find((x) => x.id === id);

/** Strumenti che un server espone al client: nessuno se scollegato; con --read-only il filesystem perde quelli che scrivono. */
export function strumentiOfferti(sc, s, id) {
  if (!s.collegati[id]) return [];
  return server(sc, id).strumenti.filter((t) => !(id === "filesystem" && s.sola_lettura && t.scrive)).map((t) => t.nome);
}
/** Quanti strumenti vede il modello in tutto. */
export function strumentiVisti(sc, s) {
  return sc.server.reduce((n, x) => n + strumentiOfferti(sc, s, x.id).length, 0);
}
/** La configurazione del client, come oggetto: una voce per ogni server collegato. */
export function configurazione(sc, s) {
  const voci = {};
  for (const srv of sc.server) {
    if (!s.collegati[srv.id]) continue;
    const args = [...srv.args];
    if (srv.id === "filesystem") {
      if (s.sola_lettura) args.push(sc.opzione_sola_lettura);
      args.push(sc.cartella_lavoro);
    }
    const voce = { command: srv.comando, args };
    if (srv.id === "memory" && s.memoria_file) voce.env = { [sc.variabile_memoria]: sc.file_memoria };
    voci[srv.id] = voce;
  }
  return { [sc.chiave_config]: voci };
}
/** La configurazione scritta riga per riga (array in linea, come nei README), con il server a cui appartiene ogni riga. */
export function righeConfig(sc, s) {
  const q = JSON.stringify;
  const voci = configurazione(sc, s)[sc.chiave_config];
  const ids = Object.keys(voci);
  const righe = [{ testo: "{", server: null }];
  if (!ids.length) righe.push({ testo: `  ${q(sc.chiave_config)}: {}`, server: null });
  else {
    righe.push({ testo: `  ${q(sc.chiave_config)}: {`, server: null });
    ids.forEach((id, i) => {
      const v = voci[id];
      righe.push({ testo: `    ${q(id)}: {`, server: id });
      righe.push({ testo: `      "command": ${q(v.command)},`, server: id });
      righe.push({ testo: `      "args": [${v.args.map((a) => q(a)).join(", ")}]${v.env ? "," : ""}`, server: id });
      if (v.env) righe.push({ testo: `      "env": { ${Object.entries(v.env).map(([k, x]) => `${q(k)}: ${q(x)}`).join(", ")} }`, server: id });
      righe.push({ testo: `    }${i < ids.length - 1 ? "," : ""}`, server: id });
    });
    righe.push({ testo: "  }", server: null });
  }
  righe.push({ testo: "}", server: null });
  return righe;
}
/**
 * Dove va una richiesta e come finisce: tipo (ok, avviso_memoria, scollegato, sconosciuto, nessuno), classe
 * (ok/avviso/male), server, strumento, testo dell'esito, etichetta breve per la scena e la chiamata con gli argomenti.
 */
export function instrada(sc, s, idRichiesta) {
  const r = richiesta(sc, idRichiesta);
  const T = sc.testi;
  let tipo;
  if (!r.server) tipo = "nessuno";
  else if (!s.collegati[r.server]) tipo = "scollegato";
  else if (!strumentiOfferti(sc, s, r.server).includes(r.strumento)) tipo = "sconosciuto";
  else if (r.server === "memory" && !s.memoria_file) tipo = "avviso_memoria";
  else tipo = "ok";
  const classe = tipo === "ok" ? "ok" : tipo === "avviso_memoria" ? "avviso" : "male";
  const valori = { server: r.server || "", strumento: r.strumento || "", risposta: r.risposta };
  return {
    tipo, classe, server: r.server, strumento: r.strumento,
    testo: riempi(T[`esito_${tipo}`], valori),
    breve: riempi(T[`breve_${tipo}`], valori),
    chiamata: r.strumento ? `${r.strumento} ${JSON.stringify(r.argomenti)}` : "",
    risponde: tipo === "ok" || tipo === "avviso_memoria",
  };
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
/** Centro verticale della presa (e del server) di indice i. */
export function centroPresa(i) {
  return SRV.y0 + i * SRV.passo + SRV.h / 2;
}
/** Posizione del gettone della richiesta per ogni fase (0 nel client, 1 alla presa, 2 allo strumento, 3 di ritorno). */
export function percorsoGettone(sc, s, idRichiesta) {
  const e = instrada(sc, s, idRichiesta);
  const i = SERVER_ID.indexOf(e.server);
  const yc = CLIENT.y + CLIENT.h / 2;
  const partenza = { x: CLIENT.x + CLIENT.w - 18, y: i >= 0 ? centroPresa(i) : yc };
  if (e.tipo === "nessuno") return [partenza, { x: PRESA.x - 14, y: yc }, { x: PRESA.x - 14, y: yc }, { x: PRESA.x - 14, y: yc }];
  const presa = { x: PRESA.x + PRESA.w / 2, y: centroPresa(i) };
  if (e.tipo === "scollegato") return [partenza, presa, presa, presa];
  const strumento = { x: SRV.x + 8, y: centroPresa(i) };
  if (e.tipo === "sconosciuto") return [partenza, presa, strumento, strumento];
  return [partenza, presa, strumento, partenza];
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

  const s = { vista: "banco", collegati: { filesystem: true, fetch: true, memory: true }, sola_lettura: false, memoria_file: true, richiesta: sc.richieste[0].id, scelte: {}, verificato: false };
  // stato della sequenza animata (non fa parte dello stato del passo)
  let fase = 3, righeVisibili = Infinity, righePrima = null, timer = [], diario = [];
  const fermaTimer = () => { timer.forEach(clearTimeout); timer = []; };
  const dopo = (ms, fn) => timer.push(setTimeout(fn, ms));

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...VISTE.map((v) => el("button", { "data-v": v, onclick: () => cambia({ vista: v }) }, E[`vista_${v}`])));
  const interruttore = (testo, su) => {
    const inp = el("input", { type: "checkbox", "aria-label": testo, onchange: (e) => su(e.target.checked) });
    return { nodo: el("label", { class: "interruttore" }, el("span", {}, testo), inp), inp };
  };
  const prese = {};
  for (const srv of sc.server) prese[srv.id] = interruttore(riempi(T.collega, { nome: srv.nome }), (v) => cambia({ collegati: { ...s.collegati, [srv.id]: v } }, true));
  const inLettura = interruttore(E.sola_lettura, (v) => cambia({ sola_lettura: v }, true));
  const inMemoria = interruttore(E.memoria_file, (v) => cambia({ memoria_file: v }, true));
  const segRichiesta = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.richiesta },
    ...sc.richieste.map((r) => el("button", { "data-v": r.id, onclick: () => cambia({ richiesta: r.id }, true) }, r.testo)));
  const btnRimanda = el("button", { class: "btn", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => manda(true) }, E.rimanda);
  const zonaBanco = el("div", {}, el("h4", {}, E.prese), ...Object.values(prese).map((p) => p.nodo), el("h4", {}, E.opzioni), inLettura.nodo, inMemoria.nodo,
    el("h4", {}, E.richiesta), segRichiesta, btnRimanda);
  const tendine = {};
  const zonaDecidi = el("div", {});
  sc.casi.forEach((c, i) => {
    const sel = el("select", { class: "scelta", "aria-label": riempi(T.scegli_per, { n: i + 1 }), onchange: (e) => scegli(c.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.risposte_gioco.map((r) => el("option", { value: r.id }, r.nome)));
    tendine[c.id] = sel;
    zonaDecidi.append(el("label", { class: "tp-scelta" }, el("span", {}, riempi(T.caso, { n: i + 1 })), sel));
  });
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => { s.verificato = true; disegnaScena(); disegnaDestra(); } }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaBanco, zonaDecidi);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  const titolo = testoSvg({ x: W / 2, y: 24, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, "");
  const gScena = svgEl("g");
  const gettone = svgEl("g", { class: "tp-gettone" });
  gettone.append(svgEl("circle", { r: 8, fill: "#f59e0b", stroke: "#fff", "stroke-width": 2 }));
  svg.append(titolo, gScena, gettone);
  const preConfig = el("pre", { class: "tp-config", "aria-label": E.config_titolo });
  const boxEsito = el("div", { class: "tp-esito attesa", "aria-live": "polite" });
  const rigaChiamata = el("div", { class: "tp-chiamata" });
  const esiti = el("section", { class: "tp-esiti" }, el("h4", {}, E.config_titolo), preConfig, el("h4", {}, E.esito_titolo), boxEsito, rigaChiamata);
  const elencoVerifica = el("div", { class: "tp-diario", "aria-live": "polite" });
  const esitiVerifica = el("section", { class: "tp-esiti" }, el("h4", {}, E.esito_titolo), elencoVerifica);
  scena.append(svg, esiti, esitiVerifica);
  const destra = el("aside", { class: "pannello destra" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}${ridotto ? " ridotto" : ""}` }, comandi, scena, destra));

  function chip(g, x, y, nome, stato, colore) {
    const fondo = stato === "attivo" ? colore : stato === "tolto" ? "#f1f5f9" : "#fff";
    const bordo = stato === "tolto" ? "#cbd2e3" : colore;
    g.append(svgEl("rect", { x, y, width: CHIP.w, height: CHIP.h, rx: 6, fill: fondo, stroke: bordo, "stroke-width": 1.2, "stroke-dasharray": stato === "tolto" ? "3 3" : "" }),
      testoSvg({ x: x + 6, y: y + 12.5, "font-size": CHIP.font, "font-family": "monospace", fill: stato === "attivo" ? "#fff" : stato === "tolto" ? "#94a3b8" : "#17203b" }, nome));
    if (stato === "tolto") g.append(svgEl("line", { x1: x + 4, y1: y + CHIP.h / 2, x2: x + CHIP.w - 4, y2: y + CHIP.h / 2, stroke: "#e11d48", "stroke-width": 1.4 }));
  }

  function disegnaBanco(g) {
    const e = instrada(sc, s, s.richiesta);
    const r = richiesta(sc, s.richiesta);
    // client
    g.append(svgEl("rect", { x: CLIENT.x, y: CLIENT.y, width: CLIENT.w, height: CLIENT.h, rx: 14, fill: "#fff", stroke: "#17203b", "stroke-width": 2 }),
      testoSvg({ x: CLIENT.x + 14, y: CLIENT.y + 24, "font-size": 13, "font-weight": 800, fill: "#17203b" }, E.client),
      testoSvg({ x: CLIENT.x + 14, y: CLIENT.y + 40, "font-size": 10, fill: "#5b6684" }, E.client_sotto),
      testoSvg({ x: CLIENT.x + 14, y: CLIENT.y + 70, "font-size": 9.5, "font-weight": 700, fill: "#5b6684" }, E.richiesta_in_corso));
    const fumetto = aCapo(r.testo, A_CAPO.richiesta).slice(0, 4);
    g.append(svgEl("rect", { x: CLIENT.x + 10, y: CLIENT.y + 78, width: CLIENT.w - 20, height: 14 + fumetto.length * 14, rx: 10, fill: fase >= 0 ? "#fff7ed" : "#fff", stroke: "#f59e0b" }));
    fumetto.forEach((riga, k) => g.append(testoSvg({ x: CLIENT.x + 18, y: CLIENT.y + 96 + k * 14, "font-size": 11, fill: "#17203b" }, riga)));
    const yEsito = CLIENT.y + 108 + fumetto.length * 14;
    if (fase >= 3) {
      const col = e.classe === "ok" ? "#16a34a" : e.classe === "avviso" ? "#d97706" : "#e11d48";
      aCapo(e.breve, A_CAPO.breve - 6).slice(0, 2).forEach((riga, k) =>
        g.append(testoSvg({ x: CLIENT.x + 14, y: yEsito + k * 13, "font-size": 10.5, "font-weight": 800, fill: col }, riga)));
    }
    aCapo(riempi(T.strumenti_visti, { n: strumentiVisti(sc, s) }), A_CAPO.breve - 4).slice(0, 2).forEach((riga, k) =>
      g.append(testoSvg({ x: CLIENT.x + 14, y: CLIENT.y + CLIENT.h - 30 + k * 13, "font-size": 10.5, "font-weight": 700, fill: "#4f46e5" }, riga)));
    // prese, cavi e server
    sc.server.forEach((srv, i) => {
      const cy = centroPresa(i);
      const on = s.collegati[srv.id];
      const bersaglio = e.server === srv.id && fase >= 1;
      g.append(svgEl("rect", { x: PRESA.x, y: cy - PRESA.h / 2, width: PRESA.w, height: PRESA.h, rx: 5, fill: on ? srv.colore : "#e2e8f0", stroke: "#17203b", "stroke-width": 1.5 }),
        svgEl("circle", { cx: PRESA.x + PRESA.w / 2, cy: cy - 7, r: 2.6, fill: "#17203b" }), svgEl("circle", { cx: PRESA.x + PRESA.w / 2, cy: cy + 7, r: 2.6, fill: "#17203b" }));
      if (on) {
        g.append(svgEl("path", { d: `M ${PRESA.x + PRESA.w} ${cy} L ${SRV.x} ${cy}`, stroke: bersaglio ? "#f59e0b" : srv.colore, "stroke-width": bersaglio ? 4 : 2.5, fill: "none" }),
          svgEl("rect", { x: PRESA.x + PRESA.w, y: cy - 9, width: 16, height: 18, rx: 3, fill: srv.colore }));
      } else {
        g.append(svgEl("path", { d: `M ${PRESA.x + PRESA.w + 70} ${cy + 22} C ${PRESA.x + 140} ${cy + 40}, ${SRV.x - 80} ${cy + 10}, ${SRV.x} ${cy}`, stroke: "#94a3b8", "stroke-width": 2, "stroke-dasharray": "5 4", fill: "none" }),
          svgEl("rect", { x: PRESA.x + PRESA.w + 56, y: cy + 13, width: 16, height: 18, rx: 3, fill: "#94a3b8" }));
      }
      const y = SRV.y0 + i * SRV.passo;
      g.append(svgEl("rect", { x: SRV.x, y, width: SRV.w, height: SRV.h, rx: 12, fill: on ? "#fff" : "#f8fafc", stroke: on ? srv.colore : "#cbd2e3", "stroke-width": bersaglio ? 3 : 1.8, "stroke-dasharray": on ? "" : "6 4" }),
        testoSvg({ x: SRV.x + 12, y: y + 19, "font-size": 13, "font-weight": 800, fill: on ? srv.colore : "#94a3b8" }, srv.nome));
      const n = strumentiOfferti(sc, s, srv.id).length;
      const conta = !on ? T.n_scollegato : srv.id === "filesystem" && s.sola_lettura ? riempi(T.n_strumenti_lettura, { n }) : n === 1 ? T.n_strumento : riempi(T.n_strumenti, { n });
      g.append(testoSvg({ x: SRV.x + SRV.w - 12, y: y + 19, "text-anchor": "end", "font-size": 9.5, "font-weight": 700, fill: on ? "#17203b" : "#94a3b8" }, conta));
      const comando = `${srv.comando} ${srv.args.filter((a) => !a.startsWith("-")).join(" ")}`;
      aCapo(comando, A_CAPO.comando).slice(0, 1).forEach((riga) => g.append(testoSvg({ x: SRV.x + 12, y: y + 35, "font-size": 9, "font-family": "monospace", fill: "#5b6684" }, riga)));
      const offerti = strumentiOfferti(sc, s, srv.id);
      srv.vetrina.forEach((nome, k) => {
        const cx = SRV.x + 10 + (k % 2) * (CHIP.w + CHIP.scarto);
        const cyc = y + 46 + Math.floor(k / 2) * (CHIP.h + 6);
        const attivo = bersaglio && fase >= 2 && e.strumento === nome && offerti.includes(nome);
        const tolto = on && !offerti.includes(nome);
        chip(g, cx, cyc, nome, attivo ? "attivo" : tolto ? "tolto" : "normale", on ? srv.colore : "#cbd2e3");
      });
      if (srv.nota && srv.vetrina.length <= 2) aCapo(srv.nota, A_CAPO.comando).slice(0, 2).forEach((riga, k) =>
        g.append(testoSvg({ x: SRV.x + 12, y: y + 80 + k * 12, "font-size": 9.5, "font-style": "italic", fill: on ? "#5b6684" : "#94a3b8" }, riga)));
      if (bersaglio && fase >= 2 && e.tipo === "sconosciuto") g.append(testoSvg({ x: SRV.x + SRV.w - 12, y: y + SRV.h - 8, "text-anchor": "end", "font-size": 10, "font-weight": 800, fill: "#e11d48" }, e.breve));
    });
    if (fase >= 2 && e.tipo === "scollegato") {
      const cy = centroPresa(SERVER_ID.indexOf(e.server));
      g.append(testoSvg({ x: PRESA.x + PRESA.w + 8, y: cy - 10, "font-size": 10, "font-weight": 800, fill: "#e11d48" }, e.breve));
    }
  }

  function disegnaDecidi(g) {
    const v = s.verificato ? verifica(sc, s) : null;
    sc.casi.forEach((c, i) => {
      const y = CASO.y0 + i * CASO.passo;
      const scelta = s.scelte[c.id];
      const esito = v ? v.righe[i].esito : null;
      const bordo = esito === "giusto" ? "#16a34a" : esito === "quasi" ? "#d97706" : esito ? "#e11d48" : scelta ? "#4f46e5" : "#cbd2e3";
      g.append(svgEl("rect", { x: CASO.x, y, width: CASO.w, height: CASO.h, rx: 12, fill: "#fff", stroke: bordo, "stroke-width": esito ? 2.2 : 1.5 }),
        testoSvg({ x: CASO.x + 12, y: y + 18, "font-size": 10.5, "font-weight": 800, fill: "#4f46e5" }, riempi(T.caso, { n: i + 1 })));
      aCapo(c.testo, CASO.caratteri).slice(0, 2).forEach((r, k) => g.append(testoSvg({ x: CASO.x + 12, y: y + 34 + k * 14, "font-size": 10.5, fill: "#17203b" }, r)));
      if (scelta) g.append(testoSvg({ x: CASO.x + CASO.w - 12, y: y + 18, "text-anchor": "end", "font-size": 10, "font-weight": 800, "font-family": "monospace", fill: bordo }, sc.risposte_gioco.find((r) => r.id === scelta).nome));
    });
  }

  function disegnaScena() {
    titolo.textContent = E[`titolo_scena_${s.vista}`];
    gScena.replaceChildren();
    const banco = s.vista === "banco";
    (banco ? disegnaBanco : disegnaDecidi)(gScena);
    gettone.style.display = banco && fase >= 0 && fase < 3 ? "" : "none";
    if (banco) {
      const p = percorsoGettone(sc, s, s.richiesta)[Math.max(0, Math.min(3, fase))];
      gettone.setAttribute("transform", `translate(${p.x},${p.y})`);
    }
    esiti.classList.toggle("nascosto", !banco);
    esitiVerifica.classList.toggle("nascosto", banco);
    if (!banco) {
      const v = s.verificato ? verifica(sc, s) : null;
      elencoVerifica.replaceChildren(...(v ? v.righe.map((r) => el("div", { class: r.esito === "giusto" ? "ok" : r.esito === "quasi" ? "avviso" : "male" }, r.testo)) : [el("div", { class: "vuoto" }, E.consegna_decidi)]));
    }
    disegnaEsiti();
  }

  function disegnaEsiti() {
    const righe = righeConfig(sc, s);
    const e = instrada(sc, s, s.richiesta);
    const prima = righePrima ? new Set(righePrima.map((r) => r.testo)) : null;
    preConfig.replaceChildren(...righe.map((r, k) => {
      const classi = [];
      if (k >= righeVisibili) classi.push("tp-nascosta");
      else if (prima && !prima.has(r.testo)) classi.push("tp-nuova");
      else if (fase >= 1 && fase < 3 && r.server && r.server === e.server) classi.push("tp-attiva");
      return el("span", { class: classi.join(" ") || null }, r.testo);
    }));
    if (fase >= 3) {
      boxEsito.className = `tp-esito ${e.classe}`;
      boxEsito.textContent = e.testo;
      rigaChiamata.textContent = e.chiamata ? `${E.chiamata}: ${e.chiamata}` : "";
    } else {
      boxEsito.className = "tp-esito attesa";
      boxEsito.textContent = richiesta(sc, s.richiesta).testo;
      rigaChiamata.textContent = "";
    }
  }

  function disegnaDestra() {
    const figli = [];
    if (s.vista === "decidi") {
      figli.push(el("h3", {}, E.titolo_decidi));
      if (s.verificato) {
        const v = verifica(sc, s);
        figli.push(el("div", { class: "tp-verifica", "aria-live": "polite" },
          el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)), el("p", {}, E.vedi_sotto)));
      } else figli.push(el("p", {}, E.consegna_decidi));
    } else {
      const e = instrada(sc, s, s.richiesta);
      figli.push(el("h3", {}, E.titolo_destra));
      figli.push(el("div", { class: `esito-scheda ${fase >= 3 ? e.classe === "ok" ? "ok" : e.classe === "avviso" ? "avviso" : "male" : "neutro"}`, "aria-live": "polite" },
        el("div", {}, fase >= 3 ? e.testo : richiesta(sc, s.richiesta).testo)));
      figli.push(el("h4", {}, E.titolo_server), el("div", { class: "tp-server" },
        ...sc.server.map((srv) => el("div", { class: s.collegati[srv.id] ? null : "spento", style: `border-left-color:${srv.colore}` }, el("b", {}, srv.nome), " — ", srv.ruolo))));
      figli.push(el("h4", {}, E.diario), el("div", { class: "tp-diario" },
        ...(diario.length ? diario.map((d) => el("div", { class: d.classe }, `${d.testo} → ${d.breve}`)) : [el("div", { class: "vuoto" }, E.diario_vuoto)])));
    }
    figli.push(el("div", { class: "tp-regola" }, E.regola));
    destra.replaceChildren(...figli);
  }

  function aggiornaComandi() {
    const premi = (gruppo, valore) => gruppo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === valore)));
    premi(segVista, s.vista);
    premi(segRichiesta, s.richiesta);
    for (const id of SERVER_ID) prese[id].inp.checked = s.collegati[id];
    inLettura.inp.checked = s.sola_lettura;
    inMemoria.inp.checked = s.memoria_file;
    zonaBanco.classList.toggle("nascosto", s.vista !== "banco");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaDestra(); }

  /** Fa viaggiare la richiesta: client → presa → strumento → ritorno. Con movimento ridotto mostra subito l'esito. */
  function viaggia(dopoMs, annota) {
    const fine = () => {
      fase = 3;
      if (annota) {
        const e = instrada(sc, s, s.richiesta);
        diario = [{ testo: richiesta(sc, s.richiesta).testo, breve: e.breve, classe: e.classe }, ...diario].slice(0, 5);
      }
      ridisegna();
    };
    if (ridotto) { fine(); return; }
    fase = 0;
    ridisegna();
    [1, 2].forEach((f, k) => dopo(dopoMs + (k + 1) * MS.fase, () => { fase = f; disegnaScena(); disegnaDestra(); }));
    dopo(dopoMs + 3 * MS.fase, fine);
  }
  function manda(annota) {
    fermaTimer();
    righeVisibili = Infinity;
    viaggia(0, annota);
  }
  function cambia(diff, rimanda) {
    fermaTimer();
    righePrima = righeConfig(sc, s);
    Object.assign(s, diff);
    s.verificato = false;
    righeVisibili = Infinity;
    if (rimanda && s.vista === "banco") viaggia(0, true);
    else { fase = 3; ridisegna(); }
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
    nuovo.collegati = { ...(nuovo.collegati || {}) };
    nuovo.scelte = { ...(nuovo.scelte || {}) };
    if (!VISTE.includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (Object.keys(nuovo.collegati).sort().join() !== [...SERVER_ID].sort().join()) throw new Error(`stato_animazione: collegati deve avere ${SERVER_ID.join(", ")}`);
    for (const [k, v] of Object.entries(nuovo.collegati)) if (typeof v !== "boolean") throw new Error(`stato_animazione: collegati.${k} non booleano`);
    for (const k of ["sola_lettura", "memoria_file", "verificato"]) if (typeof nuovo[k] !== "boolean") throw new Error(`stato_animazione: ${k} non booleano`);
    if (!richiesta(sc, nuovo.richiesta)) throw new Error(`stato_animazione: richiesta sconosciuta «${nuovo.richiesta}»`);
    for (const [id, r] of Object.entries(nuovo.scelte)) {
      if (!sc.casi.some((c) => c.id === id)) throw new Error(`stato_animazione: caso sconosciuto «${id}»`);
      if (!sc.risposte_gioco.some((x) => x.id === r)) throw new Error(`stato_animazione: risposta sconosciuta «${r}»`);
    }
    fermaTimer();
    Object.assign(s, nuovo);
    diario = [];
    righePrima = null;
    if (ridotto || s.vista !== "banco") { righeVisibili = Infinity; fase = 3; ridisegna(); return; }
    // sequenza: la configurazione si scrive riga per riga, poi la richiesta parte
    const n = righeConfig(sc, s).length;
    righeVisibili = 0;
    fase = -1;
    ridisegna();
    for (let k = 1; k <= n; k++) dopo(k * MS.riga, () => { righeVisibili = k; disegnaEsiti(); });
    dopo(n * MS.riga + MS.fase, () => viaggia(0, false));
  }
  applica({});
  return {
    applica,
    distruggi() { fermaTimer(); },
    _prova: { stato: s, instrada: () => instrada(sc, s, s.richiesta), configurazione: () => configurazione(sc, s), verifica: () => verifica(sc, s), fase: () => fase },
  };
}
