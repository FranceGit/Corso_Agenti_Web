// Lezione interattiva "Il recinto" (PO4.2). Quattro viste sullo stesso principio, il minimo privilegio dei server MCP:
// - recinto: le cartelle del disco una dentro l'altra; si sceglie la radice consentita del server filesystem (/, la
//   home, la cartella di lavoro) e la modalita' (lettura e scrittura / sola lettura); le richieste dell'agente (file
//   di lavoro, ../, link, chiave SSH, /etc/passwd) viaggiano verso il file e vengono accettate o respinte con il
//   messaggio vero del server, calcolato normalizzando il percorso e seguendo i link come fa il server;
// - memoria: il file .jsonl del server memory dentro il container, in node_modules o in un volume; riavvio,
//   aggiornamento e azzeramento mostrano che cosa sopravvive;
// - pagina: una pagina scaricata con fetch contiene un ordine; la catena (leggi .env, invialo fuori) si spezza alla
//   prima difesa accesa (conferma del client, radice stretta, --allowed-hosts);
// - decidi: prevedere l'esito di cinque richieste con radice di lavoro e --read-only.
// Tutti i testi visibili vengono dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "recinto_mcp";
const VISTE = ["recinto", "memoria", "pagina", "decidi"];
const MODALITA = ["scrittura", "lettura"];
const EVENTI = ["", "ricorda", "riavvia", "aggiorna", "azzera"];
const W = 720, H = 420;
const AGENTE = { x: 12, y: 60, w: 124, h: 300 };
const CARTELLE = {
  disco: { x: 150, y: 40, w: 558, h: 370 },
  etc: { x: 166, y: 68, w: 156, h: 64 },
  home: { x: 166, y: 146, w: 530, h: 254 },
  ssh: { x: 182, y: 178, w: 152, h: 64 },
  crm: { x: 348, y: 168, w: 336, h: 222 },
  lavoro: { x: 362, y: 236, w: 310, h: 142 },
};
const FILE = {
  passwd: { x: 180, y: 94, w: 96 }, chiave: { x: 196, y: 204, w: 110 }, env: { x: 472, y: 188, w: 80 },
  listino: { x: 376, y: 266, w: 90 }, lead: { x: 476, y: 266, w: 86 }, riepilogo: { x: 572, y: 266, w: 92 },
  scorciatoia: { x: 376, y: 320, w: 128 },
};
const FILE_H = 26;
const LUOGO = { x0: 16, passo: 232, y: 52, w: 220, h: 200 };
const CATENA = { x: 380, y0: 46, passo: 74, w: 320, h: 44 };
const CASO = { x: 20, y0: 48, passo: 72, w: 680, h: 62, caratteri: 100 };
const A_CAPO = { richiesta: 18, comando: 36, luogo: 30, ricordo: 30, passo: 50, riga_pagina: 46, esito: 96 };
const MS = { viaggio: 520, pausa: 260, riga: 160, evento: 520 };

const STILE = `
.lz-recinto_mcp .rc-esiti { margin-top: 8px; border-top: 1px solid #dfe4f0; padding: 8px 4px 2px; display: grid; gap: 6px; }
.lz-recinto_mcp .rc-esiti h4 { margin: 0; font-size: .74rem; text-transform: uppercase; letter-spacing: .07em; color: var(--tenue); }
.lz-recinto_mcp .rc-codice { margin: 0; padding: 7px 10px; background: #0f172a; color: #e2e8f0; border-radius: 10px; font-family: var(--mono); font-size: .72rem; white-space: pre-wrap; overflow-wrap: anywhere; }
.lz-recinto_mcp .rc-elenco { display: grid; gap: 5px; max-height: 230px; overflow-y: auto; padding-right: 4px; }
.lz-recinto_mcp .rc-elenco div { font-size: .78rem; padding: 6px 9px; border-radius: 9px; overflow-wrap: anywhere; }
.lz-recinto_mcp .rc-elenco code { font-family: var(--mono); font-size: .72rem; }
.lz-recinto_mcp .rc-elenco .ok, .lz-recinto_mcp .rc-elenco .tiene { background: var(--ok-chiaro); color: #166534; }
.lz-recinto_mcp .rc-elenco .avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-recinto_mcp .rc-elenco .male { background: var(--male-chiaro); color: #9f1239; }
.lz-recinto_mcp .rc-elenco .attesa { background: #eef1f8; color: var(--tenue); }
.lz-recinto_mcp .rc-bilancio { display: grid; gap: 4px; margin: 8px 0; font-size: .82rem; }
.lz-recinto_mcp .rc-bilancio div { padding: 5px 8px; border-radius: 8px; background: #f7f9fd; }
.lz-recinto_mcp .rc-bilancio .male { background: var(--male-chiaro); color: #9f1239; font-weight: 700; }
.lz-recinto_mcp .rc-bilancio .ok { background: var(--ok-chiaro); color: #166534; font-weight: 700; }
.lz-recinto_mcp .rc-regola { margin-top: 10px; padding: 8px 10px; border-left: 4px solid #16a34a; background: #f0fdf4; border-radius: 0 10px 10px 0; font-weight: 700; font-size: .82rem; }
.lz-recinto_mcp .rc-scelta { display: grid; gap: 3px; margin: 8px 0; font-size: .82rem; }
.lz-recinto_mcp .rc-eventi { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
.lz-recinto_mcp .rc-eventi button { justify-content: center; font-size: .8rem; }
.lz-recinto_mcp .rc-verifica { display: grid; gap: 6px; }
.lz-recinto_mcp .rc-verifica .riga { font-size: .8rem; padding: 7px 10px; border-radius: 10px; }
.lz-recinto_mcp .rc-verifica .giusto { background: var(--ok-chiaro); color: #166534; }
.lz-recinto_mcp .rc-verifica .quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-recinto_mcp .rc-verifica .sbagliato, .lz-recinto_mcp .rc-verifica .vuoto { background: var(--male-chiaro); color: #9f1239; }
.lz-recinto_mcp .rc-gettone { transition: transform .5s ease; }
.lz-recinto_mcp.ridotto .rc-gettone { transition: none; }
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

/** Normalizza un percorso assoluto POSIX: toglie «.», risolve «..», unisce le barre ripetute. */
export function normalizza(percorso) {
  const parti = [];
  for (const p of String(percorso).split("/")) {
    if (!p || p === ".") continue;
    if (p === "..") parti.pop(); else parti.push(p);
  }
  return "/" + parti.join("/");
}
/** Il percorso sta dentro la radice? Confronto per cartella intera, come il server (lavoro-vecchio non e' dentro lavoro). */
export function dentro(percorso, radice) {
  const p = normalizza(percorso), r = normalizza(radice);
  return r === "/" || p === r || p.startsWith(r + "/");
}
/** Il percorso reale: normalizzato e con i link seguiti. Dice anche se e' passato da un link. */
export function percorsoReale(sc, percorso) {
  let p = normalizza(percorso);
  let viaLink = false;
  for (const l of sc.link) {
    if (p === l.da || p.startsWith(l.da + "/")) { p = normalizza(l.a + p.slice(l.da.length)); viaLink = true; }
  }
  return { reale: p, viaLink };
}
const radiceDi = (sc, id) => sc.radici.find((r) => r.id === id);

/**
 * Esito di una richiesta al server filesystem: ok (file di lavoro accettato), fuga (file sensibile accettato),
 * respinta (fuori dal recinto) o sconosciuto (strumento che scrive con --read-only). Con il messaggio del server.
 */
export function valuta(sc, s, req) {
  const T = sc.testi;
  const radice = radiceDi(sc, s.radice).percorso;
  const { reale, viaLink } = percorsoReale(sc, req.percorso);
  let tipo;
  if (req.scrive && s.modalita === "lettura") tipo = "sconosciuto";
  else if (!dentro(reale, radice)) tipo = "respinta";
  else tipo = req.sensibile ? "fuga" : "ok";
  const valori = { reale, radice, strumento: req.strumento };
  const messaggio = tipo === "respinta" ? riempi(sc.messaggi_server[viaLink ? "link" : "fuori"], valori)
    : tipo === "sconosciuto" ? riempi(T.messaggio_sconosciuto, valori) : "";
  const classe = tipo === "ok" ? "ok" : tipo === "fuga" ? "male" : tipo === "respinta" ? (req.sensibile ? "tiene" : "avviso") : "avviso";
  return { tipo, classe, reale, viaLink, messaggio, testo: riempi(T[`esito_${tipo}`], valori), breve: T[`breve_${tipo}`], cambiato: reale !== req.percorso };
}
/** Le richieste mandate nello stato: tutte o una sola. */
export function richiesteMandate(sc, s) {
  return s.richiesta === "tutte" ? sc.richieste : sc.richieste.filter((r) => r.id === s.richiesta);
}
/** Bilancio della configurazione su tutte le richieste: quante di lavoro passano, quante pericolose passano. */
export function bilancio(sc, s) {
  const lavoro = sc.richieste.filter((r) => !r.sensibile), pericolose = sc.richieste.filter((r) => r.sensibile);
  const passa = (r) => ["ok", "fuga"].includes(valuta(sc, s, r).tipo);
  return { legittime: lavoro.filter(passa).length, tot_legittime: lavoro.length, pericolose: pericolose.filter(passa).length, tot_pericolose: pericolose.length };
}
/** Gli args del server filesystem per lo stato dato. */
export function argsFilesystem(sc, s) {
  return ["-y", sc.pacchetto_fs, ...(s.modalita === "lettura" ? [sc.opzione_sola_lettura] : []), radiceDi(sc, s.radice).percorso];
}
/** Effetto di un evento sul file della memoria: righe dopo l'evento e testo dell'esito. */
export function dopoEvento(sc, dove, righe, evento) {
  const M = sc.memoria;
  if (evento === "ricorda") return righe >= M.max_righe ? { righe, esito: "avviso", testo: M.esiti.pieno } : { righe: righe + 1, esito: "ok", testo: M.esiti.ricorda };
  const testo = M.esiti[`${evento}_${dove}`];
  if (evento === "azzera") return { righe: 0, esito: "neutro", testo };
  const perso = (evento === "riavvia" && dove === "container") || (evento === "aggiorna" && dove !== "volume");
  return { righe: perso ? 0 : righe, esito: perso ? (righe > 0 ? "male" : "avviso") : "ok", testo };
}
/** Stato delle difese contro la pagina ostile, nell'ordine in cui la catena le incontra. */
export function difeseAttive(sc, s) {
  return { client_prudente: s.client_prudente, radice: s.radice === "lavoro", host_consentiti: s.host_consentiti };
}
/** La catena della pagina ostile: fin dove arriva e quale difesa la ferma (null = fuga). */
export function catena(sc, s) {
  const d = difeseAttive(sc, s);
  const P = sc.pagina;
  const ordine = P.difese.map((x) => x.id);
  const ferma = ordine.findIndex((id) => d[id]);
  // la difesa i sta fra il passo i+1 e il passo i+2: con la prima accesa la catena arriva al passo 2 (il modello legge)
  const arrivo = ferma < 0 ? P.passi.length : ferma + 2;
  const testo = ferma < 0 ? P.esito_fuga : `${P.difese[ferma].fermo} ${riempi(P.esito_tenuta, { n: ferma + 3 })}`;
  return { ferma, difesa: ferma < 0 ? null : ordine[ferma], arrivo, fuga: ferma < 0, testo };
}
/** Riscontro del gioco "Decidi tu": la risposta migliore e' quella che calcola valuta() con la configurazione fissa. */
export function esitoCaso(sc, caso) {
  const tipo = valuta(sc, { ...sc.config_decidi }, { ...caso, sensibile: false }).tipo;
  return tipo === "ok" ? "accettata" : tipo;
}
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
/** Punto d'arrivo del gettone: il file se accettata, il bordo del recinto se respinta, il bordo dell'agente se lo strumento non c'e'. */
export function arrivoGettone(sc, s, req) {
  const v = valuta(sc, s, req);
  const f = FILE[req.file];
  const meta = { x: f.x + f.w / 2, y: f.y + FILE_H / 2 };
  const via = { x: AGENTE.x + AGENTE.w - 10, y: AGENTE.y + AGENTE.h / 2 };
  if (v.tipo === "sconosciuto") return { ...via, tipo: v.tipo };
  if (v.tipo !== "respinta") return { ...meta, tipo: v.tipo };
  const r = CARTELLE[s.radice];
  return { x: Math.max(r.x, Math.min(r.x + r.w, meta.x)), y: Math.max(r.y, Math.min(r.y + r.h, meta.y)), tipo: v.tipo };
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const M = sc.memoria;
  const P = sc.pagina;
  const lingua = contesto && contesto.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));

  const s = { vista: "recinto", radice: "lavoro", modalita: "scrittura", richiesta: "tutte", memoria_dove: "volume", memoria_righe: 2, memoria_evento: "",
    client_prudente: true, host_consentiti: true, scelte: {}, verificato: false };
  // sequenza animata: quante richieste sono arrivate (recinto), passo della catena (pagina), righe visibili (memoria)
  let arrivate = Infinity, inViaggio = -1, passoCatena = Infinity, righeVisibili = Infinity, eventoInCorso = false, esitoEvento = null, timer = [];
  const fermaTimer = () => { timer.forEach(clearTimeout); timer = []; };
  const dopo = (ms, fn) => timer.push(setTimeout(fn, ms));

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segmenti = (etichetta, voci, su, verticale) => el("div", { class: `segmentato${verticale ? " verticale" : ""}`, role: "group", "aria-label": etichetta },
    ...voci.map(([v, testo]) => el("button", { "data-v": v, onclick: () => su(v) }, testo)));
  const segVista = segmenti(E.vista, VISTE.map((v) => [v, E[`vista_${v}`]]), (v) => cambia({ vista: v }));
  const vociRadice = sc.radici.map((r) => [r.id, r.nome]);
  const segRadice = segmenti(E.radice, vociRadice, (v) => cambia({ radice: v }, "recinto"), true);
  const segRadice2 = segmenti(E.radice, vociRadice, (v) => cambia({ radice: v }, "pagina"), true);
  const segModalita = segmenti(E.modalita, MODALITA.map((m) => [m, E[`modalita_${m}`]]), (v) => cambia({ modalita: v }, "recinto"));
  const segRichiesta = segmenti(E.richiesta, [...sc.richieste.map((r) => [r.id, r.testo]), ["tutte", E.manda_tutte]], (v) => cambia({ richiesta: v }, "recinto"), true);
  const zonaRecinto = el("div", {}, el("h4", {}, E.radice), segRadice, el("h4", {}, E.modalita), segModalita, el("h4", {}, E.richiesta), segRichiesta);
  const segLuogo = segmenti(E.luogo, M.luoghi.map((l) => [l.id, l.nome]), (v) => cambia({ memoria_dove: v, memoria_evento: "" }, "memoria"), true);
  const zonaEventi = el("div", { class: "rc-eventi" }, ...M.eventi.map((ev) => el("button", { class: "btn", "data-v": ev.id, onclick: () => evento(ev.id) }, ev.nome)));
  const zonaMemoria = el("div", {}, el("h4", {}, E.luogo), segLuogo, el("h4", {}, E.eventi), zonaEventi);
  const interruttore = (testo, chiave) => {
    const inp = el("input", { type: "checkbox", "aria-label": testo, onchange: (e) => cambia({ [chiave]: e.target.checked }, "pagina") });
    return { nodo: el("label", { class: "interruttore" }, el("span", {}, testo), inp), inp };
  };
  const nomeDifesa = (id) => P.difese.find((d) => d.id === id).nome;
  const inClient = interruttore(nomeDifesa("client_prudente"), "client_prudente");
  const inHost = interruttore(nomeDifesa("host_consentiti"), "host_consentiti");
  const zonaPagina = el("div", {}, el("h4", {}, E.difese), inClient.nodo, el("h4", {}, nomeDifesa("radice")), segRadice2, inHost.nodo,
    el("button", { class: "btn", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => cambia({}, "pagina") }, E.rilancia));
  const tendine = {};
  const zonaDecidi = el("div", {});
  sc.casi.forEach((c, i) => {
    const sel = el("select", { class: "scelta", "aria-label": riempi(T.scegli_per, { n: i + 1 }), onchange: (e) => scegli(c.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.risposte_gioco.map((r) => el("option", { value: r.id }, r.nome)));
    tendine[c.id] = sel;
    zonaDecidi.append(el("label", { class: "rc-scelta" }, el("span", {}, riempi(T.caso, { n: i + 1 })), sel));
  });
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => { s.verificato = true; ridisegna(); } }, E.controlla));
  const zone = { recinto: zonaRecinto, memoria: zonaMemoria, pagina: zonaPagina, decidi: zonaDecidi };
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, ...Object.values(zone));

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  const titolo = testoSvg({ x: W / 2, y: 24, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, "");
  const gScena = svgEl("g");
  const gettone = svgEl("g", { class: "rc-gettone" });
  gettone.append(svgEl("circle", { r: 8, fill: "#f59e0b", stroke: "#fff", "stroke-width": 2 }));
  svg.append(titolo, gScena, gettone);
  const codice = el("pre", { class: "rc-codice" });
  const elenco = el("div", { class: "rc-elenco", "aria-live": "polite" });
  const esiti = el("section", { class: "rc-esiti" }, el("h4", {}, E.config_titolo), codice, el("h4", {}, E.esiti_titolo), elenco);
  const elencoVerifica = el("div", { class: "rc-elenco", "aria-live": "polite" });
  const esitiVerifica = el("section", { class: "rc-esiti" }, el("h4", {}, E.esiti_titolo), elencoVerifica);
  scena.append(svg, esiti, esitiVerifica);
  const destra = el("aside", { class: "pannello destra" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}${ridotto ? " ridotto" : ""}` }, comandi, scena, destra));

  const colore = { ok: "#16a34a", tiene: "#16a34a", avviso: "#d97706", male: "#e11d48", neutro: "#4f46e5", attesa: "#94a3b8" };

  // ------------------------------------------------ vista recinto
  function disegnaRecinto(g) {
    g.append(svgEl("rect", { x: AGENTE.x, y: AGENTE.y, width: AGENTE.w, height: AGENTE.h, rx: 14, fill: "#fff", stroke: "#17203b", "stroke-width": 2 }),
      testoSvg({ x: AGENTE.x + 12, y: AGENTE.y + 24, "font-size": 13, "font-weight": 800, fill: "#17203b" }, E.agente));
    aCapo(E.agente_sotto, A_CAPO.richiesta).slice(0, 3).forEach((r, k) => g.append(testoSvg({ x: AGENTE.x + 12, y: AGENTE.y + 42 + k * 12, "font-size": 9.5, fill: "#5b6684" }, r)));
    const mandate = richiesteMandate(sc, s);
    let y = AGENTE.y + 92;
    mandate.forEach((r, i) => {
      const attiva = i === inViaggio;
      const fatta = i < arrivate;
      const v = valuta(sc, s, r);
      aCapo(r.testo, A_CAPO.richiesta).slice(0, 2).forEach((riga, k) => g.append(testoSvg({ x: AGENTE.x + 12, y: y + k * 12, "font-size": 10, "font-weight": attiva ? 800 : 600, fill: attiva ? "#b45309" : fatta ? colore[v.classe] : "#5b6684" }, riga)));
      y += aCapo(r.testo, A_CAPO.richiesta).slice(0, 2).length * 12 + 8;
    });
    // cartelle annidate
    for (const c of sc.cartelle) {
      const b = CARTELLE[c.id];
      const recinto = c.id === s.radice;
      g.append(svgEl("rect", { x: b.x, y: b.y, width: b.w, height: b.h, rx: 10, fill: c.id === "disco" ? "#f8fafc" : "#fff", "fill-opacity": c.id === "disco" ? 1 : 0.85, stroke: recinto ? "#16a34a" : "#cbd2e3", "stroke-width": recinto ? 4 : 1.2, "stroke-dasharray": recinto ? "10 5" : "" }),
        testoSvg({ x: b.x + 8, y: b.y + 15, "font-size": 10.5, "font-weight": 800, "font-family": "monospace", fill: recinto ? "#15803d" : "#5b6684" }, c.etichetta));
      if (recinto) g.append(svgEl("rect", { x: b.x + b.w - 118, y: b.y - 9, width: 112, height: 18, rx: 9, fill: "#16a34a" }),
        testoSvg({ x: b.x + b.w - 62, y: b.y + 4, "text-anchor": "middle", "font-size": 9.5, "font-weight": 800, fill: "#fff" }, E.recinto_tag));
    }
    // link scorciatoia → .ssh
    const fs = FILE.scorciatoia, ssh = CARTELLE.ssh;
    g.append(svgEl("path", { d: `M ${fs.x} ${fs.y + FILE_H / 2} C ${fs.x - 60} ${fs.y + 10}, ${ssh.x + ssh.w + 30} ${ssh.y + ssh.h + 40}, ${ssh.x + ssh.w / 2} ${ssh.y + ssh.h}`, fill: "none", stroke: "#7c3aed", "stroke-width": 1.5, "stroke-dasharray": "4 3" }));
    // file
    const esitoFile = {};
    mandate.forEach((r, i) => { if (i < arrivate) esitoFile[r.file] = valuta(sc, s, r); });
    for (const f of sc.file) {
      const p = FILE[f.id];
      const nascosto = f.id === "riepilogo" && !(esitoFile.riepilogo && esitoFile.riepilogo.tipo === "ok");
      const sensibile = sc.richieste.some((r) => r.file === f.id && r.sensibile);
      g.append(svgEl("rect", { x: p.x, y: p.y, width: p.w, height: FILE_H, rx: 6, fill: nascosto ? "none" : sensibile ? "#fff1f2" : "#f0f9ff", stroke: nascosto ? "#cbd2e3" : sensibile ? "#fda4af" : "#7dd3fc", "stroke-dasharray": nascosto ? "4 3" : "" }),
        testoSvg({ x: p.x + 8, y: p.y + 17, "font-size": 10, "font-family": "monospace", fill: nascosto ? "#94a3b8" : "#17203b" }, f.nome));
    }
    // segni degli esiti arrivati
    mandate.forEach((r, i) => {
      if (i >= arrivate) return;
      const a = arrivoGettone(sc, s, r);
      const v = valuta(sc, s, r);
      const segno = v.tipo === "ok" ? "✓" : v.tipo === "fuga" ? "!" : v.tipo === "respinta" ? "✗" : "?";
      const cx = v.tipo === "sconosciuto" ? a.x : FILE[r.file].x + FILE[r.file].w - 2;
      const cy = v.tipo === "sconosciuto" ? a.y : FILE[r.file].y;
      if (v.tipo === "respinta") g.append(svgEl("line", { x1: a.x, y1: a.y, x2: cx, y2: cy, stroke: "#16a34a", "stroke-width": 1.2, "stroke-dasharray": "2 3" }),
        svgEl("rect", { x: a.x - 5, y: a.y - 5, width: 10, height: 10, rx: 2, fill: "#16a34a" }));
      g.append(svgEl("circle", { cx, cy, r: 9, fill: colore[v.classe], stroke: "#fff", "stroke-width": 2 }),
        testoSvg({ x: cx, y: cy + 4, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#fff" }, segno));
    });
  }

  // ------------------------------------------------ vista memoria
  function disegnaMemoria(g) {
    M.luoghi.forEach((l, i) => {
      const x = LUOGO.x0 + i * LUOGO.passo, y = LUOGO.y;
      const scelto = l.id === s.memoria_dove;
      const volume = l.id === "volume";
      if (volume) {
        g.append(svgEl("path", { d: `M ${x} ${y + 14} a ${LUOGO.w / 2} 14 0 0 1 ${LUOGO.w} 0 v ${LUOGO.h - 28} a ${LUOGO.w / 2} 14 0 0 1 ${-LUOGO.w} 0 z`, fill: scelto ? "#ecfdf5" : "#fff", stroke: scelto ? "#059669" : "#cbd2e3", "stroke-width": scelto ? 3 : 1.4 }),
          svgEl("path", { d: `M ${x} ${y + 14} a ${LUOGO.w / 2} 14 0 0 0 ${LUOGO.w} 0`, fill: "none", stroke: scelto ? "#059669" : "#cbd2e3", "stroke-width": scelto ? 3 : 1.4 }));
      } else {
        g.append(svgEl("rect", { x, y, width: LUOGO.w, height: LUOGO.h, rx: 12, fill: scelto ? (eventoInCorso ? "#fef3c7" : "#eff6ff") : "#fff", stroke: scelto ? "#2563eb" : "#cbd2e3", "stroke-width": scelto ? 3 : 1.4, "stroke-dasharray": l.id === "container" ? "8 4" : "" }));
      }
      aCapo(l.nome, A_CAPO.luogo).slice(0, 2).forEach((r, k) => g.append(testoSvg({ x: x + 12, y: y + 38 + k * 14, "font-size": 11, "font-weight": 800, fill: scelto ? "#17203b" : "#5b6684" }, r)));
      aCapo(l.comando, A_CAPO.comando).slice(0, 3).forEach((r, k) => g.append(testoSvg({ x: x + 12, y: y + 74 + k * 12, "font-size": 8.5, "font-family": "monospace", fill: "#5b6684" }, r)));
      if (scelto) {
        // il file .jsonl con le sue righe
        const fx = x + 12, fy = y + 116;
        g.append(svgEl("rect", { x: fx, y: fy, width: LUOGO.w - 24, height: 76, rx: 6, fill: "#fff", stroke: "#94a3b8" }));
        const n = Math.min(s.memoria_righe, righeVisibili);
        if (!n) g.append(testoSvg({ x: fx + (LUOGO.w - 24) / 2, y: fy + 42, "text-anchor": "middle", "font-size": 10, "font-style": "italic", fill: "#94a3b8" }, T.memoria_vuota));
        for (let k = 0; k < n; k++) {
          const ry = fy + 6 + k * 11.5;
          g.append(svgEl("rect", { x: fx + 6, y: ry, width: 6, height: 7, rx: 1, fill: "#059669" }),
            testoSvg({ x: fx + 16, y: ry + 7, "font-size": 8.5, fill: "#17203b" }, aCapo(M.ricordi[k % M.ricordi.length], A_CAPO.ricordo)[0]));
        }
      }
    });
    // conteggio grande
    const n = Math.min(s.memoria_righe, righeVisibili);
    g.append(testoSvg({ x: W / 2, y: LUOGO.y + LUOGO.h + 48, "text-anchor": "middle", "font-size": 30, "font-weight": 800, fill: n ? "#059669" : "#e11d48" }, String(n)),
      testoSvg({ x: W / 2, y: LUOGO.y + LUOGO.h + 66, "text-anchor": "middle", "font-size": 10.5, fill: "#5b6684" }, E.righe_file));
    if (s.memoria_evento && esitoEvento) {
      const ev = M.eventi.find((x) => x.id === s.memoria_evento);
      const testo = eventoInCorso ? riempi(T.evento_in_corso, { evento: ev.nome }) : ev.nome;
      g.append(testoSvg({ x: W / 2, y: LUOGO.y + LUOGO.h + 92, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: eventoInCorso ? "#b45309" : colore[esitoEvento.esito] }, testo));
      if (!eventoInCorso) aCapo(esitoEvento.testo, A_CAPO.esito).slice(0, 2).forEach((r, k) =>
        g.append(testoSvg({ x: W / 2, y: LUOGO.y + LUOGO.h + 110 + k * 14, "text-anchor": "middle", "font-size": 10.5, fill: "#17203b" }, r)));
    }
  }

  // ------------------------------------------------ vista pagina
  function disegnaPagina(g) {
    const c = catena(sc, s);
    const px = 16, py = 46, pw = 340, ph = 250;
    g.append(svgEl("rect", { x: px, y: py, width: pw, height: ph, rx: 12, fill: "#fff", stroke: "#7c3aed", "stroke-width": 1.6 }),
      testoSvg({ x: px + 12, y: py + 20, "font-size": 11, "font-weight": 800, fill: "#7c3aed" }, E.pagina_titolo),
      testoSvg({ x: px + 12, y: py + 36, "font-size": 9, "font-family": "monospace", fill: "#5b6684" }, P.url));
    let y = py + 58;
    for (const r of P.righe) for (const riga of aCapo(r, A_CAPO.riga_pagina)) { g.append(testoSvg({ x: px + 12, y, "font-size": 10.5, fill: "#17203b" }, riga)); y += 14; }
    y += 6;
    const ostile = aCapo(P.riga_ostile, A_CAPO.riga_pagina);
    g.append(svgEl("rect", { x: px + 8, y: y - 12, width: pw - 16, height: ostile.length * 14 + 10, rx: 6, fill: "#fff1f2", stroke: "#e11d48", "stroke-dasharray": "4 3" }));
    for (const riga of ostile) { g.append(testoSvg({ x: px + 14, y, "font-size": 10.5, "font-weight": 700, fill: "#be123c" }, riga)); y += 14; }
    aCapo(E.compito, A_CAPO.riga_pagina + 4).slice(0, 2).forEach((riga, k) => g.append(testoSvg({ x: px + 12, y: py + ph - 30 + k * 14, "font-size": 10.5, "font-weight": 700, fill: "#2563eb" }, riga)));
    // difese elencate sotto la pagina
    const d = difeseAttive(sc, s);
    P.difese.forEach((x, i) => {
      const yy = py + ph + 22 + i * 20;
      g.append(svgEl("circle", { cx: px + 10, cy: yy - 4, r: 6, fill: d[x.id] ? "#16a34a" : "#cbd2e3" }),
        testoSvg({ x: px + 22, y: yy, "font-size": 10, fill: d[x.id] ? "#17203b" : "#94a3b8" }, `${i + 1}. ${aCapo(x.nome, 54)[0]}`));
    });
    // catena
    P.passi.forEach((p, i) => {
      const yy = CATENA.y0 + i * CATENA.passo;
      const raggiunto = i < Math.min(c.arrivo, passoCatena);
      const fuori = p.id === "fuori" || p.id === "invia" || p.id === "leggi_env";
      g.append(svgEl("rect", { x: CATENA.x, y: yy, width: CATENA.w, height: CATENA.h, rx: 10, fill: raggiunto ? (fuori ? "#fff1f2" : "#eff6ff") : "#f8fafc", stroke: raggiunto ? (fuori ? "#e11d48" : "#2563eb") : "#cbd2e3", "stroke-width": raggiunto ? 2 : 1.2 }),
        testoSvg({ x: CATENA.x + 12, y: yy + 18, "font-size": 10, "font-weight": 800, fill: raggiunto ? "#17203b" : "#94a3b8" }, riempi(T.passo_n, { n: i + 1 })));
      aCapo(p.testo, A_CAPO.passo).slice(0, 2).forEach((r, k) => g.append(testoSvg({ x: CATENA.x + 30, y: yy + 18 + k * 13, "font-size": 10, ...(i >= 2 && i <= 3 ? { "font-family": "monospace" } : {}), fill: raggiunto ? "#17203b" : "#94a3b8" }, r)));
      if (i >= 1 && i <= P.difese.length) {
        const dif = P.difese[i - 1];
        const gy = yy + CATENA.h + (CATENA.passo - CATENA.h) / 2;
        const acceso = d[dif.id];
        const scattata = c.ferma === i - 1 && passoCatena >= c.arrivo;
        g.append(svgEl("rect", { x: CATENA.x + 40, y: gy - 4, width: CATENA.w - 80, height: 8, rx: 4, fill: scattata ? "#16a34a" : acceso ? "#86efac" : "#e2e8f0" }),
          testoSvg({ x: CATENA.x + CATENA.w - 2, y: gy - 7, "text-anchor": "end", "font-size": 8.5, "font-weight": 700, fill: acceso ? "#15803d" : "#94a3b8" }, `${i}. ${acceso ? T.attiva : T.spenta}`));
      }
    });
  }

  // ------------------------------------------------ vista decidi
  function disegnaDecidi(g) {
    const v = s.verificato ? verifica(sc, s) : null;
    sc.casi.forEach((c, i) => {
      const y = CASO.y0 + i * CASO.passo;
      const scelta = s.scelte[c.id];
      const esito = v ? v.righe[i].esito : null;
      const bordo = esito === "giusto" ? "#16a34a" : esito === "quasi" ? "#d97706" : esito ? "#e11d48" : scelta ? "#4f46e5" : "#cbd2e3";
      g.append(svgEl("rect", { x: CASO.x, y, width: CASO.w, height: CASO.h, rx: 12, fill: "#fff", stroke: bordo, "stroke-width": esito ? 2.2 : 1.5 }),
        testoSvg({ x: CASO.x + 12, y: y + 18, "font-size": 10.5, "font-weight": 800, fill: "#4f46e5" }, riempi(T.caso, { n: i + 1 })),
        testoSvg({ x: CASO.x + 12, y: y + 35, "font-size": 10.5, "font-family": "monospace", fill: "#17203b" }, `${c.strumento} ${c.percorso}`),
        testoSvg({ x: CASO.x + 12, y: y + 51, "font-size": 10, "font-style": "italic", fill: "#5b6684" }, aCapo(c.nota, CASO.caratteri)[0]));
      if (scelta) g.append(testoSvg({ x: CASO.x + CASO.w - 12, y: y + 18, "text-anchor": "end", "font-size": 10, "font-weight": 800, fill: bordo }, sc.risposte_gioco.find((r) => r.id === scelta).nome));
    });
  }

  function disegnaScena() {
    titolo.textContent = E[`titolo_scena_${s.vista}`];
    gScena.replaceChildren();
    ({ recinto: disegnaRecinto, memoria: disegnaMemoria, pagina: disegnaPagina, decidi: disegnaDecidi })[s.vista](gScena);
    // gettone
    let pos = null;
    if (s.vista === "recinto" && inViaggio >= 0) {
      const r = richiesteMandate(sc, s)[inViaggio];
      pos = inViaggio < arrivate ? arrivoGettone(sc, s, r) : { x: AGENTE.x + AGENTE.w - 10, y: AGENTE.y + AGENTE.h / 2 };
    } else if (s.vista === "pagina" && passoCatena < Infinity) {
      const i = Math.max(0, Math.min(catena(sc, s).arrivo, passoCatena) - 1);
      pos = { x: CATENA.x - 14, y: CATENA.y0 + i * CATENA.passo + CATENA.h / 2 };
    }
    gettone.style.display = pos ? "" : "none";
    if (pos) gettone.setAttribute("transform", `translate(${pos.x},${pos.y})`);
    disegnaEsiti();
  }

  function disegnaEsiti() {
    esiti.classList.toggle("nascosto", s.vista === "decidi");
    esitiVerifica.classList.toggle("nascosto", s.vista !== "decidi");
    if (s.vista === "decidi") {
      const v = s.verificato ? verifica(sc, s) : null;
      elencoVerifica.replaceChildren(...(v ? v.righe.map((r) => el("div", { class: r.esito === "giusto" ? "ok" : r.esito === "quasi" ? "avviso" : "male" }, r.testo)) : [el("div", { class: "attesa" }, E.consegna_decidi)]));
    }
    const righe = [];
    if (s.vista === "recinto") {
      codice.textContent = `"args": [${argsFilesystem(sc, s).map((a) => JSON.stringify(a)).join(", ")}]`;
      richiesteMandate(sc, s).forEach((r, i) => {
        const v = valuta(sc, s, r);
        const fatta = i < arrivate;
        const dettagli = [el("code", {}, `${r.strumento} ${r.percorso}`)];
        if (fatta) {
          if (v.cambiato) dettagli.push(" — ", riempi(T.risolto, { reale: v.reale }));
          dettagli.push(el("br", {}), el("b", {}, v.breve), ": ", v.testo);
          if (v.messaggio) dettagli.push(el("br", {}), el("code", {}, v.messaggio));
        }
        righe.push(el("div", { class: fatta ? v.classe : "attesa" }, ...dettagli));
      });
    } else if (s.vista === "memoria") {
      const l = M.luoghi.find((x) => x.id === s.memoria_dove);
      codice.textContent = `${l.comando}\n→ ${l.file}`;
      if (esitoEvento && !eventoInCorso) righe.push(el("div", { class: esitoEvento.esito === "neutro" ? "attesa" : esitoEvento.esito }, esitoEvento.testo));
    } else if (s.vista === "pagina") {
      codice.textContent = `"fetch": { "command": "uvx", "args": [${["mcp-server-fetch", ...(s.host_consentiti ? ["--allowed-hosts", P.host_consentito] : [])].map((a) => JSON.stringify(a)).join(", ")}] }\n"filesystem": { "args": [${argsFilesystem(sc, s).map((a) => JSON.stringify(a)).join(", ")}] }`;
      const c = catena(sc, s);
      if (passoCatena >= c.arrivo) righe.push(el("div", { class: c.fuga ? "male" : "tiene" }, c.testo));
    }
    elenco.replaceChildren(...righe);
  }

  function disegnaDestra() {
    const figli = [];
    if (s.vista === "decidi") {
      figli.push(el("h3", {}, E.titolo_decidi));
      if (s.verificato) {
        const v = verifica(sc, s);
        figli.push(el("div", { class: "rc-verifica", "aria-live": "polite" },
          el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)), el("p", {}, E.vedi_sotto)));
      } else figli.push(el("p", {}, E.consegna_decidi));
    } else {
      figli.push(el("h3", {}, E.titolo_destra));
      if (s.vista === "recinto") {
        const mandate = richiesteMandate(sc, s);
        const ultima = mandate[Math.min(mandate.length, arrivate) - 1];
        if (ultima) {
          const v = valuta(sc, s, ultima);
          figli.push(el("div", { class: `esito-scheda ${v.classe === "tiene" ? "ok" : v.classe}`, "aria-live": "polite" }, el("div", {}, `${ultima.testo}: ${v.testo}`)));
        }
        const b = bilancio(sc, s);
        figli.push(el("h4", {}, E.bilancio), el("div", { class: "rc-bilancio" },
          el("div", { class: b.legittime === b.tot_legittime ? "ok" : "" }, riempi(T.bilancio_legittime, { n: b.legittime, totale: b.tot_legittime })),
          el("div", { class: b.pericolose ? "male" : "ok" }, riempi(T.bilancio_pericolose, { n: b.pericolose, totale: b.tot_pericolose }))));
      } else if (s.vista === "memoria") {
        const l = M.luoghi.find((x) => x.id === s.memoria_dove);
        figli.push(el("div", { class: "esito-scheda neutro" }, el("div", {}, `${l.nome}: ${riempi(T.n_righe, { n: s.memoria_righe })}`)));
        if (esitoEvento && !eventoInCorso) figli.push(el("div", { class: `esito-scheda ${esitoEvento.esito}`, "aria-live": "polite" }, el("div", {}, esitoEvento.testo)));
      } else {
        const c = catena(sc, s);
        const d = difeseAttive(sc, s);
        figli.push(el("div", { class: `esito-scheda ${passoCatena >= c.arrivo ? (c.fuga ? "male" : "ok") : "neutro"}`, "aria-live": "polite" }, el("div", {}, passoCatena >= c.arrivo ? c.testo : P.passi[0].testo)));
        figli.push(el("h4", {}, E.difese), el("div", { class: "rc-bilancio" }, ...P.difese.map((x, i) => el("div", { class: d[x.id] ? "ok" : "" }, `${i + 1}. ${x.nome}: ${d[x.id] ? T.attiva : T.spenta}`))));
      }
    }
    figli.push(el("div", { class: "rc-regola" }, E.regola));
    destra.replaceChildren(...figli);
  }

  function aggiornaComandi() {
    const premi = (gruppo, valore) => gruppo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === valore)));
    premi(segVista, s.vista);
    premi(segRadice, s.radice);
    premi(segRadice2, s.radice);
    premi(segModalita, s.modalita);
    premi(segRichiesta, s.richiesta);
    premi(segLuogo, s.memoria_dove);
    premi(zonaEventi, s.memoria_evento);
    inClient.inp.checked = s.client_prudente;
    inHost.inp.checked = s.host_consentiti;
    for (const [v, z] of Object.entries(zone)) z.classList.toggle("nascosto", s.vista !== v);
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaDestra(); }

  // ------------------------------------------------ sequenze animate
  function sequenzaRecinto() {
    const n = richiesteMandate(sc, s).length;
    if (ridotto) { arrivate = n; inViaggio = -1; ridisegna(); return; }
    arrivate = 0; inViaggio = 0;
    ridisegna();
    for (let i = 0; i < n; i++) {
      const t0 = i * (MS.viaggio + MS.pausa);
      dopo(t0 + 30, () => { inViaggio = i; arrivate = i; disegnaScena(); });
      dopo(t0 + MS.viaggio, () => { arrivate = i + 1; ridisegna(); });
    }
    dopo(n * (MS.viaggio + MS.pausa), () => { inViaggio = -1; disegnaScena(); });
  }
  function sequenzaPagina() {
    const arrivo = catena(sc, s).arrivo;
    if (ridotto) { passoCatena = arrivo; ridisegna(); return; }
    passoCatena = 1;
    ridisegna();
    for (let k = 2; k <= arrivo; k++) dopo((k - 1) * MS.viaggio, () => { passoCatena = k; ridisegna(); });
  }
  function sequenzaMemoria() {
    if (ridotto) { righeVisibili = Infinity; ridisegna(); return; }
    righeVisibili = 0;
    ridisegna();
    for (let k = 1; k <= s.memoria_righe; k++) dopo(k * MS.riga, () => { righeVisibili = k; disegnaScena(); });
    dopo((s.memoria_righe + 1) * MS.riga, () => { righeVisibili = Infinity; disegnaScena(); });
  }
  function avvia() {
    fermaTimer();
    arrivate = Infinity; inViaggio = -1; passoCatena = Infinity; righeVisibili = Infinity; eventoInCorso = false;
    if (!s.memoria_evento) esitoEvento = null;
    if (s.vista === "recinto") sequenzaRecinto();
    else if (s.vista === "pagina") sequenzaPagina();
    else if (s.vista === "memoria") sequenzaMemoria();
    else ridisegna();
  }

  // ------------------------------------------------ interazioni
  function cambia(diff, rilancia) {
    Object.assign(s, diff);
    s.verificato = false;
    if (rilancia || diff.vista) avvia();
    else { fermaTimer(); ridisegna(); }
  }
  function evento(id) {
    fermaTimer();
    const r = dopoEvento(sc, s.memoria_dove, s.memoria_righe, id);
    s.memoria_evento = id;
    esitoEvento = r;
    righeVisibili = Infinity;
    if (ridotto || id === "ricorda") { eventoInCorso = false; s.memoria_righe = r.righe; ridisegna(); return; }
    eventoInCorso = true;
    ridisegna();
    dopo(MS.evento, () => { eventoInCorso = false; s.memoria_righe = r.righe; ridisegna(); });
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
    if (!radiceDi(sc, nuovo.radice)) throw new Error(`stato_animazione: radice sconosciuta «${nuovo.radice}»`);
    if (!MODALITA.includes(nuovo.modalita)) throw new Error(`stato_animazione: modalita' sconosciuta «${nuovo.modalita}»`);
    if (nuovo.richiesta !== "tutte" && !sc.richieste.some((r) => r.id === nuovo.richiesta)) throw new Error(`stato_animazione: richiesta sconosciuta «${nuovo.richiesta}»`);
    if (!M.luoghi.some((l) => l.id === nuovo.memoria_dove)) throw new Error(`stato_animazione: luogo della memoria sconosciuto «${nuovo.memoria_dove}»`);
    if (!Number.isInteger(nuovo.memoria_righe) || nuovo.memoria_righe < 0 || nuovo.memoria_righe > M.max_righe) throw new Error(`stato_animazione: memoria_righe fuori scala «${nuovo.memoria_righe}»`);
    if (!EVENTI.includes(nuovo.memoria_evento)) throw new Error(`stato_animazione: evento sconosciuto «${nuovo.memoria_evento}»`);
    for (const k of ["client_prudente", "host_consentiti", "verificato"]) if (typeof nuovo[k] !== "boolean") throw new Error(`stato_animazione: ${k} non booleano`);
    for (const [id, r] of Object.entries(nuovo.scelte)) {
      if (!sc.casi.some((c) => c.id === id)) throw new Error(`stato_animazione: caso sconosciuto «${id}»`);
      if (!sc.risposte_gioco.some((x) => x.id === r)) throw new Error(`stato_animazione: risposta sconosciuta «${r}»`);
    }
    Object.assign(s, nuovo);
    esitoEvento = s.memoria_evento ? dopoEvento(sc, s.memoria_dove, s.memoria_righe, s.memoria_evento) : null;
    avvia();
  }
  applica({});
  return {
    applica,
    distruggi() { fermaTimer(); },
    _prova: { stato: s, bilancio: () => bilancio(sc, s), catena: () => catena(sc, s), verifica: () => verifica(sc, s) },
  };
}
