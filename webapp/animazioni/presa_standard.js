// Lezione interattiva "MCP: un connettore standard tra agenti e sistemi" (P4.3): app AI e sistemi aziendali
// collegati da cavi su misura (N x M) o da prese e adattatori uguali (client e server: il conto N + M e' la
// spiegazione del corso); i tre ruoli host / client / server e i sei passi di un collegamento; il catalogo di un
// server (strumenti, risorse, prompt) con la loro diffusione reale e l'interruttore "server non fidato".
// Tutti i testi e i numeri arrivano dallo scenario della lezione.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "presa_standard";
const VISTE = ["groviglio", "collegamento", "catalogo"];
const RUOLI = ["host", "client", "server"];
const X_APP = 24, W_APP = 150, X_SIS = 546, W_SIS = 150, H_NODO = 40, BUS = 360;

const STILE = `
.lz-presa_standard .nodo-cliccabile { cursor: pointer; }
.lz-presa_standard .nodo-cliccabile:focus-visible rect { stroke: #4f46e5; stroke-width: 3.5; }
.lz-presa_standard .conti { display: grid; gap: 8px; }
.lz-presa_standard .conto { padding: 8px 10px; border-radius: 10px; background: var(--superficie-2); font-size: .82rem; }
.lz-presa_standard .conto b { font-size: 1.25rem; font-variant-numeric: tabular-nums; display: block; }
.lz-presa_standard .conto.attivo { outline: 2px solid var(--primario); background: var(--primario-chiaro); }
.lz-presa_standard .nota { font-size: .78rem; color: var(--tenue); margin: 6px 0 0; }
.lz-presa_standard .passi { margin: 0; padding-left: 20px; display: grid; gap: 5px; font-size: .82rem; }
.lz-presa_standard .passi li.fatto { color: var(--inchiostro); }
.lz-presa_standard .passi li.futuro { color: var(--tenue-2); }
.lz-presa_standard .passi li.ora { font-weight: 700; color: #3730a3; }
.lz-presa_standard .btn-largo { width: 100%; justify-content: center; margin-top: 8px; }
.lz-presa_standard .ruolo { padding: 8px 10px; border-radius: 10px; background: var(--primario-chiaro); color: #3730a3; font-size: .84rem; margin-top: 8px; }
.lz-presa_standard .entra-svg { animation: lzps-entra .35s ease; }
@keyframes lzps-entra { from { opacity: 0; } to { opacity: 1; } }
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

/** Quanti pezzi servono: N x M integrazioni su misura, oppure N client + M server con lo standard. */
export function conteggio(n, m, standard) {
  return standard ? { pezzi: n + m, client: n, server: m } : { pezzi: n * m, client: 0, server: 0 };
}

/** Quanti pezzi nuovi costa aggiungere un sistema o un'app. */
export function costoAggiunta(n, m, standard, cosa) {
  if (standard) return 1;
  return cosa === "sistema" ? n : m;
}

/** Ordinate dei nodi di una colonna, centrate nel riquadro. */
export function ordinate(k, alto = 92, basso = 392) {
  const passo = Math.min((basso - alto - H_NODO) / Math.max(1, k - 1), 70);
  const inizio = alto + (basso - alto - H_NODO - (k - 1) * passo) / 2;
  return Array.from({ length: k }, (_, i) => inizio + i * passo);
}

/** I collegamenti da disegnare: un cavo per coppia senza standard, un tratto verso la presa comune con lo standard. */
export function cavi(sc, s) {
  const ya = ordinate(s.app), ys = ordinate(s.sistemi);
  const lista = [];
  if (!s.standard) {
    ya.forEach((a, i) => ys.forEach((b, j) => {
      const y1 = a + H_NODO / 2, y2 = b + H_NODO / 2;
      lista.push({ tipo: "su_misura", app: i, sistema: j, d: `M ${X_APP + W_APP} ${y1} C ${BUS + 40 - j * 18} ${y2 + (i - 1) * 30}, ${BUS - 40 + i * 18} ${y1 - (j - 1.5) * 30}, ${X_SIS} ${y2}` });
    }));
  } else {
    ya.forEach((a, i) => lista.push({ tipo: "client", app: i, d: `M ${X_APP + W_APP + 22} ${a + H_NODO / 2} L ${BUS} ${a + H_NODO / 2}` }));
    ys.forEach((b, j) => lista.push({ tipo: "server", sistema: j, d: `M ${BUS} ${b + H_NODO / 2} L ${X_SIS - 22} ${b + H_NODO / 2}` }));
  }
  return lista;
}

/** Riscontro del mini-gioco "quale pezzo applica le regole di sicurezza?". */
export function verificaRuolo(sc, s) {
  if (!s.risposta_ruolo) return null;
  const giusto = s.risposta_ruolo === sc.gioco_ruolo.giusta;
  return { giusto, testo: riempi(giusto ? sc.testi.ruolo_giusto : sc.testi.ruolo_sbagliato, { spiega: sc.gioco_ruolo.spiega[s.risposta_ruolo] }) };
}

/** Il catalogo di un server, con le etichette di comportamento e quanto sono garantite. */
export function catalogo(sc, s) {
  const sis = sc.sistemi.find((x) => x.id === s.server_aperto);
  if (!sis || !sis.catalogo) throw new Error(`server senza catalogo «${s.server_aperto}»`);
  const cassetti = ["strumenti", "risorse", "prompt"].map((k) => ({
    id: k, voci: sis.catalogo[k].map((v) => ({ ...v, garantita: !s.non_fidato })), diffusione: sc.diffusione[k],
  }));
  return { sistema: sis, cassetti };
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  if (!contesto || !contesto.lingua) throw new Error("contesto.lingua mancante");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));
  const conCatalogo = sc.sistemi.filter((x) => x.catalogo);

  const s = {
    vista: "groviglio", standard: false, app: sc.app_base, sistemi: sc.sistemi_base,
    passo: 0, pezzo: null, risposta_ruolo: null, server_aperto: conCatalogo[0].id, non_fidato: false,
  };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...VISTE.map((v) => el("button", { "data-v": v, onclick: () => cambia({ vista: v }) }, E[`vista_${v}`])));
  const inStandard = el("input", { type: "checkbox", onchange: (e) => cambia({ standard: e.target.checked }) });
  const btnSis = el("button", { class: "btn btn-largo", onclick: () => cambia({ sistemi: Math.min(sc.sistemi.length, s.sistemi + 1) }) }, E.aggiungi_sistema);
  const btnApp = el("button", { class: "btn btn-largo", onclick: () => cambia({ app: Math.min(sc.app.length, s.app + 1) }) }, E.aggiungi_app);
  const zonaGroviglio = el("div", {},
    el("label", { class: "interruttore" }, el("span", {}, E.standard), inStandard), btnSis, btnApp,
    el("button", { class: "btn btn-largo", onclick: () => cambia({ app: sc.app_base, sistemi: sc.sistemi_base }) }, E.ricomincia));
  const btnPasso = el("button", { class: "btn btn-primario btn-largo", onclick: () => cambia({ passo: Math.min(sc.passi.length, s.passo + 1) }) }, E.passo_successivo);
  const segRuolo = el("div", { class: "segmentato", role: "group", "aria-label": sc.gioco_ruolo.domanda },
    ...RUOLI.map((r) => el("button", { "data-v": r, onclick: () => cambia({ risposta_ruolo: r }) }, E[`ruolo_${r}`])));
  const zonaCollegamento = el("div", {}, btnPasso,
    el("button", { class: "btn btn-largo", onclick: () => cambia({ passo: 0 }) }, E.ricomincia),
    el("h4", {}, E.gioco), el("p", { class: "nota" }, sc.gioco_ruolo.domanda), segRuolo);
  const segServer = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.apri_server },
    ...conCatalogo.map((x) => el("button", { "data-v": x.id, onclick: () => cambia({ server_aperto: x.id }) }, riempi(T.server_di, { sistema: x.nome }))));
  const inFidato = el("input", { type: "checkbox", onchange: (e) => cambia({ non_fidato: e.target.checked }) });
  const zonaCatalogo = el("div", {}, el("h4", {}, E.apri_server), segServer,
    el("label", { class: "interruttore pericolo" }, el("span", {}, E.non_fidato), inFidato));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaGroviglio, zonaCollegamento, zonaCatalogo);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: "0 0 720 420", role: "img", "aria-label": E.descrizione_scena });
  const gScena = svgEl("g");
  svg.append(gScena);
  scena.append(svg);

  const destra = el("aside", { class: "pannello destra" });
  const titoloDestra = el("h3", {});
  const corpo = el("div", { "aria-live": "polite" });
  destra.append(titoloDestra, corpo);
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno
  const scritta = (x, y, testo, attr) => testoSvg({ x, y, "font-size": 11, fill: "#17203b", ...attr }, testo);
  const colori = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#e11d48"];

  function nodo(g, x, y, w, testo, fill, stroke) {
    g.append(svgEl("rect", { x, y, width: w, height: H_NODO, rx: 10, fill, stroke, "stroke-width": 1.5 }));
    g.append(scritta(x + w / 2, y + 25, testo, { "text-anchor": "middle", "font-size": 11.5, "font-weight": 700 }));
  }
  function disegnaGroviglio(g) {
    const c = conteggio(s.app, s.sistemi, s.standard);
    g.append(scritta(360, 50, riempi(s.standard ? T.contatore_standard : T.contatore_groviglio, { n: s.app, m: s.sistemi, pezzi: c.pezzi }), { "text-anchor": "middle", "font-size": 16, "font-weight": 800, fill: s.standard ? "#166534" : "#9f1239" }));
    g.append(scritta(X_APP + W_APP / 2, 78, E.app_ai, { "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: "#5b6684" }));
    g.append(scritta(X_SIS + W_SIS / 2, 78, E.sistemi, { "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: "#5b6684" }));
    for (const k of cavi(sc, s)) {
      const col = k.tipo === "su_misura" ? colori[k.app % colori.length] : "#4f46e5";
      g.append(svgEl("path", { d: k.d, fill: "none", stroke: col, "stroke-width": k.tipo === "su_misura" ? 2 : 3, "stroke-opacity": k.tipo === "su_misura" ? ".75" : "1" }));
    }
    if (s.standard) {
      g.append(svgEl("rect", { x: BUS - 6, y: 86, width: 12, height: 312, rx: 6, fill: "#4f46e5" }));
      g.append(scritta(BUS, 412, E.presa_comune, { "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: "#4f46e5" }));
    }
    ordinate(s.app).forEach((y, i) => {
      nodo(g, X_APP, y, W_APP, sc.app[i].nome, "#eef0ff", "#a5b4fc");
      if (s.standard) { g.append(svgEl("rect", { x: X_APP + W_APP + 2, y: y + 10, width: 20, height: 20, rx: 4, fill: "#16a34a" })); }
    });
    ordinate(s.sistemi).forEach((y, j) => {
      nodo(g, X_SIS, y, W_SIS, sc.sistemi[j].nome, "#f1f5f9", "#cbd2e3");
      if (s.standard) { g.append(svgEl("rect", { x: X_SIS - 22, y: y + 10, width: 20, height: 20, rx: 4, fill: "#f59e0b" })); }
    });
    if (s.standard) {
      g.append(scritta(X_APP + W_APP + 12, 404, E.client, { "text-anchor": "middle", "font-size": 9.5, "font-weight": 800, fill: "#16a34a" }));
      g.append(scritta(X_SIS - 12, 404, E.server, { "text-anchor": "middle", "font-size": 9.5, "font-weight": 800, fill: "#b45309" }));
    }
  }
  function cliccabile(g, ruolo) {
    const gr = svgEl("g", { class: "nodo-cliccabile", tabindex: "0", role: "button", "aria-label": riempi(T.apri_ruolo, { ruolo: E[`ruolo_${ruolo}`] }) });
    const apri = () => cambia({ pezzo: ruolo });
    gr.addEventListener("click", apri);
    gr.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(); } });
    g.append(gr);
    return gr;
  }
  function disegnaCollegamento(g) {
    const sel = (r) => (s.pezzo === r ? "#4f46e5" : "#cbd2e3");
    const host = cliccabile(g, "host");
    host.append(svgEl("rect", { x: 20, y: 60, width: 300, height: 320, rx: 16, fill: "#eef0ff", stroke: sel("host"), "stroke-width": s.pezzo === "host" ? 3 : 1.5 }));
    host.append(scritta(36, 86, riempi(T.host_nome, { app: sc.app[0].nome }), { "font-size": 12.5, "font-weight": 800 }));
    host.append(scritta(36, 104, E.host_sotto, { "font-size": 10, fill: "#5b6684" }));
    // elenco degli strumenti dell'agente
    g.append(svgEl("rect", { x: 40, y: 124, width: 160, height: 120, rx: 10, fill: "#fff", stroke: "#cbd2e3" }));
    g.append(scritta(52, 144, E.elenco_agente, { "font-size": 9.5, "font-weight": 800, fill: "#5b6684" }));
    if (s.passo >= 4) sc.strumenti_annunciati.forEach((t, i) => g.append(scritta(52, 166 + i * 18, t, { "font-size": 10.5, "font-family": "monospace", fill: "#166534" })));
    else g.append(scritta(52, 166, E.elenco_vuoto, { "font-size": 10, fill: "#8a94ae" }));
    const client = cliccabile(g, "client");
    client.append(svgEl("rect", { x: 220, y: 190, width: 90, height: 44, rx: 10, fill: "#16a34a", stroke: sel("client"), "stroke-width": s.pezzo === "client" ? 3 : 1.5 }));
    client.append(scritta(265, 217, E.client, { "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#fff" }));
    const server = cliccabile(g, "server");
    const acceso = s.passo >= 1;
    server.append(svgEl("rect", { x: 440, y: 160, width: 260, height: 104, rx: 16, fill: acceso ? "#fff7ed" : "#f1f5f9", stroke: s.pezzo === "server" ? "#4f46e5" : "#f59e0b", "stroke-width": s.pezzo === "server" ? 3 : 1.5 }));
    server.append(scritta(570, 192, riempi(T.server_di, { sistema: sc.sistemi[0].nome }), { "text-anchor": "middle", "font-size": 12.5, "font-weight": 800 }));
    server.append(scritta(570, 212, acceso ? E.server_acceso : E.server_spento, { "text-anchor": "middle", "font-size": 10, fill: acceso ? "#b45309" : "#8a94ae" }));
    g.append(svgEl("rect", { x: 520, y: 300, width: 100, height: 60, rx: 10, fill: "#f1f5f9", stroke: "#cbd2e3" }));
    g.append(scritta(570, 335, sc.sistemi[0].nome, { "text-anchor": "middle", "font-size": 11.5, "font-weight": 700 }));
    g.append(svgEl("path", { d: "M 570 264 L 570 300", stroke: "#cbd2e3", "stroke-width": 2 }));
    // la linea fra client e server, con il messaggio del passo
    if (s.passo >= 2) {
      g.append(svgEl("path", { d: "M 310 212 L 440 212", stroke: "#4f46e5", "stroke-width": 3 }));
      const p = sc.passi[s.passo - 1];
      if (p.messaggio) {
        const verso = ["client", "entrambi"].includes(p.verso) ? "◀ " : "";
        const coda = ["server", "entrambi"].includes(p.verso) ? " ▶" : "";
        g.append(scritta(375, 200, `${verso}${p.messaggio}${coda}`, { "text-anchor": "middle", "font-size": 10, "font-family": "monospace", fill: "#3730a3", "font-weight": 700 }));
      }
    }
    g.append(scritta(360, 50, riempi(T.passo_di, { n: s.passo, tot: sc.passi.length }), { "text-anchor": "middle", "font-size": 13, "font-weight": 800, fill: "#3730a3" }));
    if (s.passo >= 1) aCapo(sc.passi[s.passo - 1].testo, 100).slice(0, 2).forEach((r, i) => g.append(scritta(360, 396 + i * 14, r, { "text-anchor": "middle", "font-size": 10.5 })));
  }
  function disegnaCatalogo(g) {
    const c = catalogo(sc, s);
    g.append(scritta(360, 46, riempi(T.catalogo_di, { sistema: c.sistema.nome }), { "text-anchor": "middle", "font-size": 14, "font-weight": 800 }));
    const coloriC = { strumenti: "#16a34a", risorse: "#0ea5e9", prompt: "#8b5cf6" };
    c.cassetti.forEach((k, i) => {
      const x = 16 + i * 236;
      g.append(svgEl("rect", { x, y: 64, width: 220, height: 300, rx: 14, fill: coloriC[k.id], "fill-opacity": ".07", stroke: coloriC[k.id], "stroke-width": 1.5 }));
      g.append(scritta(x + 110, 90, E[`cassetto_${k.id}`], { "text-anchor": "middle", "font-size": 13, "font-weight": 800 }));
      g.append(scritta(x + 110, 106, E[`cassetto_${k.id}_sotto`], { "text-anchor": "middle", "font-size": 9.5, fill: "#5b6684" }));
      k.voci.forEach((v, j) => {
        const y = 122 + j * 58;
        g.append(svgEl("rect", { x: x + 12, y, width: 196, height: 48, rx: 9, fill: "#fff", stroke: "#cbd2e3" }));
        g.append(scritta(x + 22, y + 19, v.nome, { "font-size": 10.5, "font-family": "monospace", "font-weight": 700 }));
        if (v.etichetta) {
          const testo = E[`etichetta_${v.etichetta}`];
          g.append(svgEl("rect", { x: x + 22, y: y + 26, width: 100, height: 16, rx: 8, fill: v.garantita ? "#dcfce7" : "#e5e7eb" }));
          g.append(scritta(x + 72, y + 38, testo, { "text-anchor": "middle", "font-size": 9, "font-weight": 700, fill: v.garantita ? "#166534" : "#6b7280" }));
          if (!v.garantita) g.append(scritta(x + 128, y + 38, E.solo_dichiarazione, { "font-size": 8.5, fill: "#9f1239", "font-weight": 700 }));
        }
      });
      // barra della diffusione reale
      g.append(scritta(x + 12, 300, riempi(T.diffusione, { pct: k.diffusione }), { "font-size": 10, "font-weight": 700 }));
      g.append(svgEl("rect", { x: x + 12, y: 308, width: 196, height: 10, rx: 5, fill: "#e5e7eb" }));
      g.append(svgEl("rect", { x: x + 12, y: 308, width: Math.round(196 * k.diffusione / 100), height: 10, rx: 5, fill: coloriC[k.id] }));
      if (k.id === "prompt") g.append(scritta(x + 12, 340, E.prompt_raramente, { "font-size": 9.5, "font-weight": 800, fill: "#9f1239" }));
    });
    g.append(scritta(360, 386, T.fonte_diffusione, { "text-anchor": "middle", "font-size": 9.5, fill: "#5b6684" }));
    if (s.non_fidato) g.append(scritta(360, 406, T.standard_non_basta, { "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#9f1239" }));
  }
  function disegnaScena() {
    gScena.replaceChildren();
    const g = svgEl("g", { class: ridotto ? "" : "entra-svg" });
    gScena.append(g);
    g.append(scritta(360, 22, E[`titolo_scena_${s.vista}`], { "text-anchor": "middle", "font-size": 11.5, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }));
    if (s.vista === "groviglio") disegnaGroviglio(g);
    else if (s.vista === "collegamento") disegnaCollegamento(g);
    else disegnaCatalogo(g);
  }
  function disegnaDestra() {
    const figli = [];
    if (s.vista === "groviglio") {
      titoloDestra.textContent = E.titolo_conti;
      const senza = conteggio(s.app, s.sistemi, false), con = conteggio(s.app, s.sistemi, true);
      figli.push(el("div", { class: "conti" },
        el("div", { class: `conto${s.standard ? "" : " attivo"}` }, E.senza_standard, el("b", {}, riempi(T.conto_senza, { n: s.app, m: s.sistemi, pezzi: senza.pezzi }))),
        el("div", { class: `conto${s.standard ? " attivo" : ""}` }, E.con_standard, el("b", {}, riempi(T.conto_con, { n: s.app, m: s.sistemi, pezzi: con.pezzi }))),
        el("div", { class: "conto" }, riempi(T.costo_sistema, { senza: costoAggiunta(s.app, s.sistemi, false, "sistema"), con: costoAggiunta(s.app, s.sistemi, true, "sistema") }))),
        el("p", { class: "nota" }, T.nota_conto));
    } else if (s.vista === "collegamento") {
      titoloDestra.textContent = E.titolo_passi;
      figli.push(el("ol", { class: "passi" }, sc.passi.map((p, i) => el("li", { class: i + 1 < s.passo ? "fatto" : i + 1 === s.passo ? "ora" : "futuro" }, p.breve))));
      if (s.pezzo) figli.push(el("div", { class: "ruolo" }, el("b", {}, `${E[`ruolo_${s.pezzo}`]}: `), sc.ruoli[s.pezzo]));
      else figli.push(el("p", { class: "nota" }, T.clicca_pezzo));
      const v = verificaRuolo(sc, s);
      if (v) figli.push(el("div", { class: `esito-scheda ${v.giusto ? "ok" : "avviso"}`, style: "margin-top:10px" }, el("div", {}, v.testo)));
    } else {
      titoloDestra.textContent = E.titolo_catalogo;
      figli.push(el("p", { class: "nota" }, T.nota_catalogo));
      figli.push(el("div", { class: `esito-scheda ${s.non_fidato ? "male" : "neutro"}`, style: "margin-top:8px" }, el("div", {}, s.non_fidato ? T.non_fidato_spiega : T.fidato_spiega)));
      if (s.non_fidato) figli.push(el("ul", { class: "passi" }, sc.controlli_prima.map((c) => el("li", {}, c))));
    }
    corpo.replaceChildren(...figli);
    if (!ridotto) corpo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
  }
  function aggiornaComandi() {
    segVista.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.vista)));
    segRuolo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.risposta_ruolo)));
    segServer.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.server_aperto)));
    inStandard.checked = s.standard;
    inFidato.checked = s.non_fidato;
    btnSis.disabled = s.sistemi >= sc.sistemi.length;
    btnApp.disabled = s.app >= sc.app.length;
    btnPasso.disabled = s.passo >= sc.passi.length;
    zonaGroviglio.classList.toggle("nascosto", s.vista !== "groviglio");
    zonaCollegamento.classList.toggle("nascosto", s.vista !== "collegamento");
    zonaCatalogo.classList.toggle("nascosto", s.vista !== "catalogo");
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaDestra(); }
  function cambia(diff) { Object.assign(s, diff); ridisegna(); }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    if (!VISTE.includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!(nuovo.app >= 1 && nuovo.app <= sc.app.length)) throw new Error(`stato_animazione: app fuori scala «${nuovo.app}»`);
    if (!(nuovo.sistemi >= 1 && nuovo.sistemi <= sc.sistemi.length)) throw new Error(`stato_animazione: sistemi fuori scala «${nuovo.sistemi}»`);
    if (!(nuovo.passo >= 0 && nuovo.passo <= sc.passi.length)) throw new Error(`stato_animazione: passo fuori scala «${nuovo.passo}»`);
    for (const k of ["pezzo", "risposta_ruolo"]) if (nuovo[k] !== null && !RUOLI.includes(nuovo[k])) throw new Error(`stato_animazione: ruolo sconosciuto «${nuovo[k]}»`);
    if (!conCatalogo.some((x) => x.id === nuovo.server_aperto)) throw new Error(`stato_animazione: server senza catalogo «${nuovo.server_aperto}»`);
    Object.assign(s, nuovo);
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo */ },
    _prova: { stato: s, cavi: () => cavi(sc, s), catalogo: () => catalogo(sc, s) },
  };
}
