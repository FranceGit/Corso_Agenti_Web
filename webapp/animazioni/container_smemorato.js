// Lezione interattiva "Il container che dimentica" (PO1.2, Officina O1). Tre viste:
//  - volume: il CRM minimo salva i lead in /app/dati/lead.json. Si sceglie il montaggio (nessuno, volume anonimo,
//    volume nominato) e si compongono azioni (POST /lead, restart, down + up, down -v + up): la sequenza scorre azione
//    per azione e mostra dove vivono i lead, quanti ne restituisce GET /lead e quali spariscono (o restano orfani).
//  - compose: un compose d'esempio con CRM e database. Porta del CRM su 0.0.0.0 o 127.0.0.1, porta del database
//    pubblicata o no (chi raggiunge chi), depends_on semplice o con condition: service_healthy (linea del tempo
//    dell'avvio: il CRM che parte prima che il database sia pronto e si ferma, oppure aspetta), healthcheck su /salute.
//  - difetto: un compose ispirato al repo adottato, da segnare riga per riga, con il perche' di ogni riga.
// Tutti i testi e i numeri vengono dallo scenario; le righe YAML sono codice (uguali nelle due lingue, salvo i commenti).

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "container_smemorato";
const VISTE = ["volume", "compose", "difetto"];
const MONTAGGI = ["nessuno", "anonimo", "nominato"];
const PORTE = ["tutte", "locale"];
const PORTE_DB = ["nessuna", "tutte"];
const ATTESE = ["nessuna", "salute"];
const W = 720, H = 420;
const CAR = { mono: 0.6, testo: 0.62 };
const YAML = { x: 16, y: 44, w: 318, passo: 13, corpo: 9.5 };
const HOST = { x: 348, y: 44, w: 356, h: 196 };
const STRISCIA = { x: 24, y: 262, w: 64, passo: 68, h: 46 };
const RETE = { x: 352, y: 44, w: 196, h: 200, nodo_w: 168, nodo_h: 58 };
const CLIENT = { x: 584, w: 120, h: 50 };
const TL = { x0: 396, x1: 696, y_db: 288, y_crm: 318, y_assi: 344 };
const RIGA = { x: 16, w: 688, y0: 44, passo: 21, h: 18, corpo: 10, marca_w: 150 };

const STILE = `
.lz-container_smemorato .spiega { font-size: .84rem; margin: 0 0 8px; }
.lz-container_smemorato .nota { font-size: .76rem; color: var(--tenue); margin: 6px 0 0; }
.lz-container_smemorato .terminale { font-family: ui-monospace, Consolas, monospace; font-size: .74rem; background: #0f172a; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; display: grid; gap: 3px; overflow-wrap: anywhere; }
.lz-container_smemorato .terminale .tenue { color: #94a3b8; }
.lz-container_smemorato .terminale .rosso { color: #fda4af; font-weight: 700; }
.lz-container_smemorato .terminale .verde { color: #86efac; }
.lz-container_smemorato .regola { margin-top: 10px; padding: 8px 10px; border-left: 4px solid #10b981; background: #ecfdf5; border-radius: 0 10px 10px 0; font-weight: 700; font-size: .84rem; }
.lz-container_smemorato .esiti-dati { margin-top: 8px; border-top: 1px solid #dfe4f0; padding: 8px 4px 2px; }
.lz-container_smemorato .esiti-dati h4 { margin: 0 0 6px; font-size: .78rem; text-transform: uppercase; letter-spacing: .07em; color: var(--tenue); }
.lz-container_smemorato .esiti-elenco { display: grid; gap: 5px; max-height: 230px; overflow-y: auto; padding-right: 4px; }
.lz-container_smemorato .esiti-elenco div { font-size: .8rem; padding: 6px 9px; border-radius: 9px; overflow-wrap: anywhere; }
.lz-container_smemorato .esiti-elenco .ok { background: var(--ok-chiaro); color: #166534; }
.lz-container_smemorato .esiti-elenco .avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-container_smemorato .esiti-elenco .errore { background: var(--male-chiaro); color: #9f1239; }
.lz-container_smemorato .esiti-elenco .neutro { background: #f1f5f9; color: #334155; }
.lz-container_smemorato .azioni-dati { display: grid; gap: 4px; }
.lz-container_smemorato .azioni-dati .btn { justify-content: flex-start; font-size: .8rem; font-family: ui-monospace, Consolas, monospace; }
.lz-container_smemorato .pulsanti-dati { display: grid; gap: 6px; margin-top: 8px; }
.lz-container_smemorato .pulsanti-dati .btn { justify-content: center; }
.lz-container_smemorato .righe-difetto { display: grid; gap: 4px; }
.lz-container_smemorato .righe-difetto label { display: flex; gap: 6px; align-items: flex-start; font-size: .76rem; font-family: ui-monospace, Consolas, monospace; overflow-wrap: anywhere; }
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

/**
 * Simula una sequenza di azioni sul CRM minimo con un dato montaggio di /app/dati. Per ogni azione: quanti lead
 * restituisce GET /lead, quanti se ne perdono, quanti restano in volumi orfani, il numero del container in uso.
 */
export function simula(sc, montaggio, azioni) {
  const T = sc.testi;
  let cont = 0, vol = 0, orf = 0, gen = 1;
  const visibili = () => (montaggio === "nessuno" ? cont : vol);
  const passi = azioni.map((a) => {
    let persi = 0, tipo = "neutro", chiave;
    if (a === "post") {
      if (montaggio === "nessuno") cont += 1; else vol += 1;
      chiave = `v_post_${montaggio}`;
    } else if (a === "restart") {
      tipo = "ok"; chiave = "v_restart";
    } else if (a === "down_up" || a === "down_v_up") {
      gen += 1;
      const conV = a === "down_v_up";
      if (montaggio === "nessuno") { persi = cont; cont = 0; chiave = "v_down_nessuno"; tipo = persi ? "errore" : "neutro"; }
      else if (montaggio === "anonimo") {
        persi = vol;
        if (!conV) orf += vol;
        vol = 0;
        chiave = conV ? "v_downv_anonimo" : "v_down_anonimo"; tipo = persi ? "errore" : "neutro";
      } else if (conV) { persi = vol; vol = 0; chiave = "v_downv_nominato"; tipo = persi ? "avviso" : "neutro"; }
      else { chiave = "v_down_nominato"; tipo = "ok"; }
    } else throw new Error(`azione sconosciuta «${a}»`);
    return { azione: a, visibili: visibili(), persi, orfani: orf, contenitore: cont, volume: vol, gen, tipo, testo: riempi(T[chiave], { n: visibili(), persi, orfani: orf }) };
  });
  return { passi, finale: { visibili: visibili(), contenitore: cont, volume: vol, orfani: orf, gen } };
}

/** Righe YAML del servizio crm per la vista volume (le righe del volume cambiano con il montaggio). */
export function yamlVolume(sc, montaggio) {
  const Y = sc.yaml_volume;
  return [...Y.base, ...(Y[montaggio] || [])];
}

/** Righe YAML del compose d'esempio (CRM + database) per la vista compose. */
export function yamlCompose(sc, s) {
  const Y = sc.yaml_compose;
  const righe = [...Y.intestazione, ...Y.db];
  if (s.porta_db === "tutte") righe.push(...Y.db_porta);
  if (s.attesa === "salute") righe.push(...Y.db_salute.map((r) => riempi(r, { n: sc.avvio.intervallo_s })));
  righe.push(...Y.crm, ...Y[`porta_${s.porta}`], ...Y[`attesa_${s.attesa}`]);
  if (s.salute_crm) righe.push(...Y.crm_salute);
  return righe;
}

/**
 * La linea del tempo di «docker compose up»: eventi {t, servizio, tipo, testo, stato} e stato finale dei servizi.
 * Senza condizione il CRM parte appena il container del database e' avviato e prova a collegarsi prima che sia pronto.
 */
export function avvio(sc, s) {
  const A = sc.avvio, T = sc.testi;
  const ev = [{ t: 0, servizio: "db", tipo: "neutro", testo: T.av_db_parte, stato: "non_pronto" }];
  let finale;
  if (s.attesa === "nessuna") {
    const tc = A.crm_avvio_s, tx = A.crm_avvio_s + A.crm_collega_dopo_s;
    ev.push({ t: tc, servizio: "crm", tipo: "neutro", testo: riempi(T.av_crm_parte_subito, { t: tc }), stato: "avviato" });
    if (tx < A.db_pronto_s) ev.push({ t: tx, servizio: "crm", tipo: "errore", testo: riempi(T.av_crm_rifiutato, { t: tx }), stato: "uscito" });
    ev.push({ t: A.db_pronto_s, servizio: "db", tipo: "neutro", testo: riempi(T.av_db_pronto_tardi, { t: A.db_pronto_s }), stato: "pronto" });
    finale = { db: "pronto", crm: tx < A.db_pronto_s ? "uscito" : "running", ok: tx >= A.db_pronto_s };
  } else {
    let t = A.intervallo_s;
    while (t < A.db_pronto_s) { ev.push({ t, servizio: "db", tipo: "neutro", testo: riempi(T.av_check_no, { t }), stato: "non_pronto" }); t += A.intervallo_s; }
    const th = t;
    ev.push({ t: th, servizio: "db", tipo: "ok", testo: riempi(T.av_db_healthy, { t: th }), stato: "healthy" });
    ev.push({ t: th, servizio: "crm", tipo: "neutro", testo: riempi(T.av_crm_parte_dopo, { t: th }), stato: "avviato" });
    const tc = th + A.crm_collega_dopo_s;
    ev.push({ t: tc, servizio: "crm", tipo: "ok", testo: riempi(T.av_crm_collegato, { t: tc }), stato: "running" });
    if (s.salute_crm) ev.push({ t: tc + A.intervallo_s, servizio: "crm", tipo: "ok", testo: riempi(T.av_crm_healthy, { t: tc + A.intervallo_s }), stato: "healthy" });
    finale = { db: "healthy", crm: s.salute_crm ? "healthy" : "running", ok: true };
  }
  return { eventi: ev, finale };
}

/** Esito complessivo dell'avvio (ok / errore, piu' l'avviso sul CRM senza controllo di salute). */
export function esitoAvvio(sc, s) {
  const T = sc.testi;
  const a = avvio(sc, s);
  const righe = [a.finale.ok ? { tipo: "ok", testo: T.av_esito_ok } : { tipo: "errore", testo: T.av_esito_ko }];
  if (a.finale.ok) righe.push(s.salute_crm ? { tipo: "ok", testo: T.av_crm_con_salute } : { tipo: "avviso", testo: T.av_crm_senza_salute });
  return righe;
}

/** Chi raggiunge chi: tu e un altro PC verso il CRM, il CRM verso il database (per nome), l'esterno verso il database. */
export function raggiungibilita(sc, s) {
  const T = sc.testi;
  return [
    { id: "tu_crm", da: "tu", a: "crm", ok: true, tipo: "ok", testo: riempi(T.rg_tu_crm, { porta: sc.porte.crm }) },
    s.porta === "tutte"
      ? { id: "altro_crm", da: "altro", a: "crm", ok: true, tipo: "avviso", testo: T.rg_altro_crm_si }
      : { id: "altro_crm", da: "altro", a: "crm", ok: false, tipo: "ok", testo: T.rg_altro_crm_no },
    { id: "crm_db", da: "crm", a: "db", ok: true, tipo: "ok", testo: riempi(T.rg_crm_db, { porta: sc.porte.db }) },
    s.porta_db === "tutte"
      ? { id: "fuori_db", da: "altro", a: "db", ok: true, tipo: "errore", testo: T.rg_db_esposto }
      : { id: "fuori_db", da: "altro", a: "db", ok: false, tipo: "ok", testo: T.rg_db_chiuso },
  ];
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

  const s = { vista: VISTE[0], montaggio: MONTAGGI[0], azioni: [], porta: PORTE[0], porta_db: PORTE_DB[0], attesa: ATTESE[0], salute_crm: false, scelte: {}, verificato: false };
  let timer = [];
  let daAnimare = 0; // nella vista volume: prima azione da far scorrere (le precedenti compaiono subito)
  const pulisci = () => { timer.forEach(clearTimeout); timer = []; };
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
  const segMontaggio = segmentato(E.montaggio, MONTAGGI.map((v) => [v, E[`montaggio_${v}`]]), "montaggio");
  const bottoniAzione = sc.azioni.map((a) => el("button", { class: "btn", "data-a": a.id, onclick: () => aggiungi(a.id) }, a.nome));
  const zonaVolume = el("div", {},
    el("h4", {}, E.montaggio), segMontaggio,
    el("h4", {}, E.azioni), el("div", { class: "azioni-dati", role: "group", "aria-label": E.azioni }, ...bottoniAzione),
    el("div", { class: "pulsanti-dati" },
      el("button", { class: "btn btn-primario", onclick: () => { daAnimare = 0; ridisegna(); } }, E.rivedi),
      el("button", { class: "btn", onclick: () => cambia({ azioni: [] }) }, E.ricomincia)));
  const segPorta = segmentato(E.porta, PORTE.map((v) => [v, E[`porta_${v}`]]), "porta");
  const segPortaDb = segmentato(E.porta_db, PORTE_DB.map((v) => [v, E[`porta_db_${v}`]]), "porta_db");
  const segAttesa = segmentato(E.attesa, ATTESE.map((v) => [v, E[`attesa_${v}`]]), "attesa");
  const inSalute = el("input", { type: "checkbox", onchange: (e) => cambia({ salute_crm: e.target.checked }) });
  const zonaCompose = el("div", {},
    el("h4", {}, E.porta), segPorta,
    el("h4", {}, E.porta_db), segPortaDb,
    el("h4", {}, E.attesa), segAttesa,
    el("label", { class: "interruttore" }, el("span", {}, E.salute_crm), inSalute),
    el("div", { class: "pulsanti-dati" }, el("button", { class: "btn btn-primario", onclick: () => ridisegna() }, E.rilancia)));
  const casella = {};
  const elencoRighe = el("div", { class: "righe-difetto" });
  sc.difetto.righe.forEach((r, i) => {
    if (!r.selezionabile) return;
    const inp = el("input", { type: "checkbox", "aria-label": riempi(T.segna_riga, { n: i + 1 }), onchange: (e) => segna(r.id, e.target.checked) });
    casella[r.id] = inp;
    elencoRighe.append(el("label", {}, inp, el("span", {}, `${i + 1}  ${r.codice.trim()}`)));
  });
  const zonaDifetto = el("div", {}, el("h4", {}, E.segna_righe), elencoRighe, el("div", { class: "pulsanti-dati" },
    el("button", { class: "btn btn-primario", onclick: () => cambia({ verificato: true }, true) }, E.controlla),
    el("button", { class: "btn", onclick: () => cambia({ scelte: {}, verificato: false }) }, E.ricomincia)));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaVolume, zonaCompose, zonaDifetto);

  // ------------------------------------------------ scena (centro): SVG + esiti sotto
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  const titolo = testoSvg({ x: 16, y: 26, "font-size": 11, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".05em" }, "");
  const gScena = svgEl("g");
  svg.append(titolo, gScena);
  const esiti = el("section", { class: "esiti-dati", "aria-live": "polite", "aria-label": E.titolo_esiti });
  const elencoEsiti = el("div", { class: "esiti-elenco" });
  esiti.append(el("h4", {}, E.titolo_esiti), elencoEsiti);
  scena.append(svg, esiti);
  const destra = el("aside", { class: "pannello destra" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  const riga = (r) => el("div", { class: r.tipo }, r.testo);
  const scriviEsiti = (righe) => elencoEsiti.replaceChildren(...righe.map(riga));
  const aggiungiEsito = (r) => elencoEsiti.append(riga(r));

  function disegnaYaml(g, righe, x, y, w, evidenzia) {
    const max = caratteriIn(w - 16, YAML.corpo, "mono");
    g.append(svgEl("rect", { x, y, width: w, height: righe.length * YAML.passo + 30, rx: 10, fill: "#0f172a" }),
      testoSvg({ x: x + 10, y: y + 15, "font-size": 9, "font-weight": 700, fill: "#94a3b8" }, E.file_compose));
    righe.forEach((r, i) => {
      const yy = y + 32 + i * YAML.passo;
      if (evidenzia && evidenzia(r)) g.append(svgEl("rect", { x: x + 4, y: yy - 10, width: w - 8, height: YAML.passo, rx: 3, fill: "#334155" }));
      g.append(testoSvg({ x: x + 10, y: yy, "font-size": YAML.corpo, "font-family": "ui-monospace, Consolas, monospace", fill: evidenzia && evidenzia(r) ? "#fde68a" : "#e2e8f0", style: "white-space:pre" }, r.slice(0, max)));
    });
  }

  // ------------------------------------------------ vista volume
  function disegnaVolume(g) {
    const sim = simula(sc, s.montaggio, s.azioni);
    const righeVol = new Set(sc.yaml_volume[s.montaggio] || []);
    disegnaYaml(g, yamlVolume(sc, s.montaggio), YAML.x, YAML.y, YAML.w, (r) => righeVol.has(r));
    const gHost = svgEl("g");
    g.append(gHost);
    const maxHost = caratteriIn(150 - 12, 10, "testo");
    function host(stato) {
      gHost.replaceChildren();
      gHost.append(svgEl("rect", { x: HOST.x, y: HOST.y, width: HOST.w, height: HOST.h, rx: 14, fill: "#f8fafc", stroke: "#cbd5e1", "stroke-dasharray": "5 4" }),
        testoSvg({ x: HOST.x + 12, y: HOST.y + 18, "font-size": 10, "font-weight": 800, fill: "#64748b" }, E.host));
      const cx = HOST.x + 16, cy = HOST.y + 30;
      gHost.append(svgEl("rect", { x: cx, y: cy, width: 150, height: 150, rx: 12, fill: "#fff", stroke: "#0ea5e9", "stroke-width": 2 }),
        testoSvg({ x: cx + 75, y: cy + 18, "text-anchor": "middle", "font-size": 10.5, "font-weight": 800, fill: "#0369a1" }, riempi(T.contenitore_n, { n: stato.gen }).slice(0, maxHost)),
        svgEl("rect", { x: cx + 10, y: cy + 30, width: 130, height: 108, rx: 8, fill: "#fefce8", stroke: "#eab308", "stroke-dasharray": "4 3" }));
      aCapo(E.strato_scrivibile, maxHost).slice(0, 2).forEach((r, j) => gHost.append(testoSvg({ x: cx + 75, y: cy + 46 + j * 12, "text-anchor": "middle", "font-size": 9.5, "font-weight": 700, fill: "#854d0e" }, r)));
      const vx = HOST.x + 210, vy = HOST.y + 40;
      if (s.montaggio === "nessuno") {
        gHost.append(testoSvg({ x: cx + 75, y: cy + 92, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#854d0e" }, riempi(T.lead_file, { n: stato.contenitore }).slice(0, maxHost)));
        aCapo(E.nessun_volume, caratteriIn(130, 9.5, "testo")).slice(0, 4).forEach((r, j) => gHost.append(testoSvg({ x: vx + 65, y: vy + 40 + j * 13, "text-anchor": "middle", "font-size": 9.5, fill: "#94a3b8" }, r)));
      } else {
        gHost.append(testoSvg({ x: cx + 75, y: cy + 92, "text-anchor": "middle", "font-size": 9.5, fill: "#64748b" }, E.app_dati),
          svgEl("path", { d: `M${cx + 140} ${cy + 88} L${vx - 4} ${vy + 34}`, stroke: "#10b981", "stroke-width": 2, fill: "none" }),
          svgEl("ellipse", { cx: vx + 65, cy: vy + 8, rx: 62, ry: 9, fill: "#d1fae5", stroke: "#10b981" }),
          svgEl("rect", { x: vx + 3, y: vy + 8, width: 124, height: 56, fill: "#d1fae5", stroke: "none" }),
          svgEl("path", { d: `M${vx + 3} ${vy + 8} L${vx + 3} ${vy + 64} A62 9 0 0 0 ${vx + 127} ${vy + 64} L${vx + 127} ${vy + 8}`, fill: "#d1fae5", stroke: "#10b981" }),
          testoSvg({ x: vx + 65, y: vy + 32, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: "#065f46" }, E[`volume_${s.montaggio}`].slice(0, caratteriIn(120, 10, "testo"))),
          testoSvg({ x: vx + 65, y: vy + 50, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#065f46" }, riempi(T.lead_n, { n: stato.volume }).slice(0, caratteriIn(120, 11, "testo"))));
        if (s.montaggio === "anonimo" && stato.orfani > 0) {
          gHost.append(svgEl("rect", { x: vx + 3, y: vy + 92, width: 124, height: 52, rx: 10, fill: "#f1f5f9", stroke: "#94a3b8", "stroke-dasharray": "4 3" }),
            testoSvg({ x: vx + 65, y: vy + 112, "text-anchor": "middle", "font-size": 9.5, "font-weight": 800, fill: "#64748b" }, E.orfano.slice(0, caratteriIn(118, 9.5, "testo"))),
            testoSvg({ x: vx + 65, y: vy + 130, "text-anchor": "middle", "font-size": 10, fill: "#64748b" }, riempi(T.lead_n, { n: stato.orfani }).slice(0, caratteriIn(118, 10, "testo"))));
        }
      }
    }
    host({ contenitore: 0, volume: 0, orfani: 0, gen: 1 });
    // striscia delle azioni: una scheda per azione, con il risultato di GET /lead
    g.append(testoSvg({ x: STRISCIA.x, y: STRISCIA.y - 8, "font-size": 9.5, "font-weight": 700, fill: "#64748b" }, s.azioni.length ? E.striscia : E.striscia_vuota));
    const COL = { ok: "#16a34a", errore: "#e11d48", avviso: "#d97706", neutro: "#0ea5e9" };
    const maxChip = caratteriIn(STRISCIA.w - 6, 9, "mono");
    const totale = testoSvg({ x: STRISCIA.x, y: 360, "font-size": 15, "font-weight": 800, fill: "#0f172a" }, riempi(T.get_ora, { n: 0 }));
    g.append(totale);
    const passi = [];
    const iniziali = [];
    sim.passi.forEach((p, i) => {
      const x = STRISCIA.x + i * STRISCIA.passo;
      const az = sc.azioni.find((a) => a.id === p.azione);
      const gC = svgEl("g", { opacity: "0.12" });
      gC.append(svgEl("rect", { x, y: STRISCIA.y, width: STRISCIA.w, height: STRISCIA.h, rx: 8, fill: "#fff", stroke: COL[p.tipo], "stroke-width": 2 }),
        testoSvg({ x: x + STRISCIA.w / 2, y: STRISCIA.y + 17, "text-anchor": "middle", "font-size": 9, "font-family": "ui-monospace, Consolas, monospace", "font-weight": 700, fill: "#0f172a" }, az.breve.slice(0, maxChip)),
        testoSvg({ x: x + STRISCIA.w / 2, y: STRISCIA.y + 35, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: COL[p.tipo] }, riempi(T.chip_get, { n: p.visibili }).slice(0, caratteriIn(STRISCIA.w - 6, 10, "testo"))));
      g.append(gC);
      const mostra = () => { gC.setAttribute("opacity", "1"); host(p); totale.textContent = riempi(T.get_ora, { n: p.visibili }); aggiungiEsito(p); };
      (i < daAnimare ? iniziali : passi).push(mostra);
    });
    scriviEsiti([{ tipo: "neutro", testo: T[`v_montaggio_${s.montaggio}`] }]);
    iniziali.forEach((f) => f());
    sequenza(passi, P.ms_azione);
    daAnimare = 0;
  }

  // ------------------------------------------------ vista compose
  function disegnaCompose(g) {
    const Y = sc.yaml_compose;
    const opzioni = new Set([...(s.porta_db === "tutte" ? Y.db_porta : []), ...(s.attesa === "salute" ? Y.db_salute.map((x) => riempi(x, { n: sc.avvio.intervallo_s })) : []),
      ...Y[`porta_${s.porta}`], ...Y[`attesa_${s.attesa}`], ...(s.salute_crm ? Y.crm_salute : [])]);
    disegnaYaml(g, yamlCompose(sc, s), YAML.x, YAML.y - 4, YAML.w + 12, (r) => opzioni.has(r));
    const ragg = raggiungibilita(sc, s);
    const a = avvio(sc, s);
    // rete del compose con i due servizi
    g.append(svgEl("rect", { x: RETE.x, y: RETE.y, width: RETE.w, height: RETE.h, rx: 14, fill: "#f8fafc", stroke: "#94a3b8", "stroke-dasharray": "6 4" }),
      testoSvg({ x: RETE.x + 10, y: RETE.y + 16, "font-size": 9.5, "font-weight": 800, fill: "#64748b" }, E.rete.slice(0, caratteriIn(RETE.w - 16, 9.5, "testo"))));
    const nodi = {};
    const maxNodo = caratteriIn(RETE.nodo_w - 12, 10, "testo");
    [["db", RETE.y + 28], ["crm", RETE.y + 128]].forEach(([id, y]) => {
      const x = RETE.x + (RETE.w - RETE.nodo_w) / 2;
      const rect = svgEl("rect", { x, y, width: RETE.nodo_w, height: RETE.nodo_h, rx: 10, fill: "#fff", stroke: "#94a3b8", "stroke-width": 2 });
      const stato = testoSvg({ x: x + RETE.nodo_w / 2, y: y + 42, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: "#64748b" }, "");
      g.append(rect, testoSvg({ x: x + RETE.nodo_w / 2, y: y + 22, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#0f172a" }, E[`servizio_${id}`].slice(0, maxNodo)), stato);
      nodi[id] = { rect, stato, x, y };
    });
    const cx = nodi.crm.x + RETE.nodo_w / 2;
    g.append(svgEl("path", { d: `M${cx} ${nodi.crm.y} L${cx} ${nodi.db.y + RETE.nodo_h}`, stroke: "#10b981", "stroke-width": 2, "stroke-dasharray": "4 3" }),
      testoSvg({ x: cx + 6, y: (nodi.crm.y + nodi.db.y + RETE.nodo_h) / 2 + 4, "font-size": 9.5, "font-family": "ui-monospace, Consolas, monospace", fill: "#047857" }, riempi(T.per_nome, { porta: sc.porte.db })));
    // client fuori dalla rete
    const maxCl = caratteriIn(CLIENT.w - 10, 9.5, "testo");
    const yCl = { tu: RETE.y + 70, altro: RETE.y + 150 };
    for (const id of ["tu", "altro"]) {
      g.append(svgEl("rect", { x: CLIENT.x, y: yCl[id], width: CLIENT.w, height: CLIENT.h, rx: 10, fill: "#fff", stroke: "#64748b", "stroke-width": 1.5 }));
      aCapo(E[`client_${id}`], maxCl).slice(0, 2).forEach((r, j) => g.append(testoSvg({ x: CLIENT.x + CLIENT.w / 2, y: yCl[id] + 20 + j * 13, "text-anchor": "middle", "font-size": 9.5, "font-weight": 700, fill: "#334155" }, r)));
    }
    const freccia = (da, a2, ok, rosso, etichetta) => {
      const x1 = CLIENT.x, y1 = yCl[da] + CLIENT.h / 2;
      const n = nodi[a2];
      const x2 = n.x + RETE.nodo_w, y2 = n.y + RETE.nodo_h / 2;
      const col = !ok ? "#cbd5e1" : rosso ? "#e11d48" : "#16a34a";
      g.append(svgEl("path", { d: `M${x1} ${y1} L${x2} ${y2}`, stroke: col, "stroke-width": ok ? 2.2 : 1.5, "stroke-dasharray": ok ? "none" : "4 4", fill: "none" }));
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      g.append(testoSvg({ x: mx, y: my - 4, "text-anchor": "middle", "font-size": 9, "font-weight": 800, fill: ok ? col : "#94a3b8" }, ok ? etichetta : "✗"));
    };
    const r = Object.fromEntries(ragg.map((x) => [x.id, x]));
    freccia("tu", "crm", true, false, sc.porte.crm);
    freccia("altro", "crm", r.altro_crm.ok, true, sc.porte.crm);
    if (s.porta_db === "tutte") freccia("altro", "db", true, true, sc.porte.db);
    // linea del tempo dell'avvio
    const scala = (TL.x1 - TL.x0) / sc.avvio.durata_s;
    const xt = (t) => TL.x0 + t * scala;
    g.append(testoSvg({ x: RETE.x, y: TL.y_db - 22, "font-size": 9.5, "font-weight": 800, fill: "#64748b" }, E.linea_tempo.slice(0, caratteriIn(TL.x1 - RETE.x, 9.5, "testo"))));
    for (const [id, y] of [["db", TL.y_db], ["crm", TL.y_crm]]) {
      g.append(testoSvg({ x: TL.x0 - 8, y: y + 4, "text-anchor": "end", "font-size": 10, "font-weight": 800, fill: "#334155" }, id),
        svgEl("line", { x1: TL.x0, y1: y, x2: TL.x1, y2: y, stroke: "#e2e8f0", "stroke-width": 6, "stroke-linecap": "round" }));
    }
    for (let t = 0; t <= sc.avvio.durata_s; t += sc.avvio.intervallo_s) {
      g.append(svgEl("line", { x1: xt(t), y1: TL.y_assi - 8, x2: xt(t), y2: TL.y_assi - 4, stroke: "#94a3b8" }),
        testoSvg({ x: xt(t), y: TL.y_assi + 6, "text-anchor": "middle", "font-size": 9, fill: "#64748b" }, riempi(T.secondi, { n: t })));
    }
    const cursore = svgEl("line", { x1: xt(0), y1: TL.y_db - 12, x2: xt(0), y2: TL.y_crm + 12, stroke: "#4f46e5", "stroke-width": 2 });
    g.append(cursore);
    const COL = { ok: "#16a34a", errore: "#e11d48", neutro: "#0ea5e9", avviso: "#d97706" };
    const COLSTATO = { non_pronto: "#d97706", pronto: "#16a34a", healthy: "#16a34a", avviato: "#0ea5e9", running: "#16a34a", uscito: "#e11d48", attende: "#64748b", coda: "#64748b" };
    const statoNodo = (id, st) => {
      nodi[id].stato.textContent = E[`stato_${st}`].slice(0, maxNodo);
      nodi[id].stato.setAttribute("fill", COLSTATO[st]);
      nodi[id].rect.setAttribute("stroke", COLSTATO[st]);
    };
    statoNodo("db", "coda");
    statoNodo("crm", s.attesa === "salute" ? "attende" : "coda");
    scriviEsiti(ragg.map((x) => ({ tipo: x.tipo, testo: x.testo })));
    const passi = a.eventi.map((ev) => () => {
      g.append(svgEl("circle", { cx: xt(ev.t), cy: ev.servizio === "db" ? TL.y_db : TL.y_crm, r: 5, fill: COL[ev.tipo], stroke: "#fff", "stroke-width": 1.5 }));
      cursore.setAttribute("x1", xt(ev.t)); cursore.setAttribute("x2", xt(ev.t));
      statoNodo(ev.servizio, ev.stato);
      aggiungiEsito({ tipo: ev.tipo, testo: riempi(T.evento, { t: ev.t, testo: ev.testo }) });
    });
    passi.push(() => esitoAvvio(sc, s).forEach(aggiungiEsito));
    sequenza(passi, P.ms_evento);
  }

  // ------------------------------------------------ vista difetto
  function disegnaDifetto(g) {
    const v = s.verificato ? verificaDifetto(sc, s.scelte) : null;
    const maxCodice = caratteriIn(RIGA.w - RIGA.marca_w - 40, RIGA.corpo, "mono");
    const passi = [];
    sc.difetto.righe.forEach((r, i) => {
      const y = RIGA.y0 + i * RIGA.passo;
      const segnata = Boolean(s.scelte[r.id]);
      const esito = v && v.righe.find((x) => x.id === r.id);
      const colore = esito ? { trovato: "#16a34a", mancato: "#e11d48", falso: "#d97706", giusto: "#94a3b8" }[esito.esito] : segnata ? "#f97316" : "#cbd5e1";
      const rect = svgEl("rect", { x: RIGA.x, y, width: RIGA.w, height: RIGA.h, rx: 5, fill: segnata ? "#fff7ed" : r.selezionabile ? "#fff" : "#f8fafc", stroke: segnata ? "#f97316" : "#e2e8f0", "stroke-width": segnata ? 2 : 1 });
      g.append(rect,
        testoSvg({ x: RIGA.x + 14, y: y + 13, "text-anchor": "middle", "font-size": 9.5, "font-weight": 800, fill: "#64748b" }, String(i + 1)),
        testoSvg({ x: RIGA.x + 32, y: y + 13, "font-size": RIGA.corpo, "font-family": "ui-monospace, Consolas, monospace", fill: r.selezionabile ? "#0f172a" : "#94a3b8", style: "white-space:pre" }, r.codice.slice(0, maxCodice)));
      const etichetta = esito ? E[`marca_${esito.esito}`] : segnata ? E.marca_segnata : "";
      const marca = testoSvg({ x: RIGA.x + RIGA.w - 8, y: y + 13, "text-anchor": "end", "font-size": 9.5, "font-weight": 800, fill: colore }, etichetta.slice(0, caratteriIn(RIGA.marca_w, 9.5, "testo")));
      g.append(marca);
      if (esito) {
        marca.setAttribute("opacity", ridotto ? "1" : "0");
        passi.push(() => { marca.setAttribute("opacity", "1"); rect.setAttribute("stroke", colore); });
      }
    });
    if (v) scriviEsiti([{ tipo: v.perfetto ? "ok" : "avviso", testo: v.sintesi }, ...v.righe]);
    else scriviEsiti([{ tipo: "neutro", testo: riempi(T.dif_segnate, { n: Object.keys(s.scelte).length }) }]);
    sequenza(passi, P.ms_evento / 2);
  }

  function disegnaScena() {
    titolo.textContent = E[`titolo_${s.vista}`];
    gScena.replaceChildren();
    ({ volume: disegnaVolume, compose: disegnaCompose, difetto: disegnaDifetto })[s.vista](gScena);
  }

  function disegnaDestra() {
    const figli = [el("h3", {}, E[`destra_${s.vista}`]), el("p", { class: "spiega" }, T[`spiega_${s.vista}`])];
    if (s.vista === "volume") {
      const f = simula(sc, s.montaggio, s.azioni).finale;
      const righe = [el("div", { class: "tenue" }, E.intestazione_volumi)];
      if (s.montaggio === "nominato") righe.push(el("div", { class: "verde" }, riempi(T.vol_nominato, { n: f.volume })));
      if (s.montaggio === "anonimo") righe.push(el("div", {}, riempi(T.vol_anonimo, { n: f.volume })));
      if (s.montaggio === "anonimo" && f.orfani > 0) righe.push(el("div", { class: "rosso" }, riempi(T.vol_orfano, { n: f.orfani })));
      if (s.montaggio === "nessuno") righe.push(el("div", { class: "tenue" }, E.vol_nessuno));
      figli.push(el("h4", {}, E.titolo_volumi), el("div", { class: "terminale" }, ...righe));
    } else if (s.vista === "compose") {
      const f = avvio(sc, s).finale;
      figli.push(el("h4", {}, E.titolo_ps), el("div", { class: "terminale" },
        el("div", { class: "tenue" }, E.intestazione_ps),
        el("div", { class: "verde" }, riempi(T.ps_riga, { servizio: "db", stato: E[`stato_${f.db}`], porte: s.porta_db === "tutte" ? sc.porte.ps_db_tutte : sc.porte.ps_db_nessuna })),
        el("div", { class: f.crm === "uscito" ? "rosso" : "verde" }, riempi(T.ps_riga, { servizio: "crm", stato: E[`stato_${f.crm}`], porte: sc.porte[`ps_crm_${s.porta}`] }))));
      figli.push(el("p", { class: "nota" }, T.nota_tempi));
    }
    figli.push(el("div", { class: "regola" }, E[`regola_${s.vista}`]));
    destra.replaceChildren(...figli);
  }

  function aggiornaComandi() {
    const premi = (gruppo, valore) => gruppo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === valore)));
    premi(segVista, s.vista);
    premi(segMontaggio, s.montaggio);
    premi(segPorta, s.porta);
    premi(segPortaDb, s.porta_db);
    premi(segAttesa, s.attesa);
    inSalute.checked = s.salute_crm;
    for (const b of bottoniAzione) b.disabled = s.azioni.length >= P.max_azioni;
    for (const [id, inp] of Object.entries(casella)) inp.checked = Boolean(s.scelte[id]);
    zonaVolume.classList.toggle("nascosto", s.vista !== "volume");
    zonaCompose.classList.toggle("nascosto", s.vista !== "compose");
    zonaDifetto.classList.toggle("nascosto", s.vista !== "difetto");
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaDestra(); }
  function cambia(diff, mantieni) {
    Object.assign(s, diff);
    if (!mantieni) s.verificato = "verificato" in diff ? diff.verificato : false;
    daAnimare = "montaggio" in diff ? 0 : s.azioni.length;
    ridisegna();
  }
  function aggiungi(id) {
    if (s.azioni.length >= P.max_azioni) return;
    s.azioni = [...s.azioni, id];
    daAnimare = s.azioni.length - 1;
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
    const scegli = (k, lista) => { if (!lista.includes(nuovo[k])) throw new Error(`stato_animazione: ${k} sconosciuto «${nuovo[k]}»`); };
    scegli("vista", VISTE); scegli("montaggio", MONTAGGI); scegli("porta", PORTE); scegli("porta_db", PORTE_DB); scegli("attesa", ATTESE);
    if (typeof nuovo.salute_crm !== "boolean") throw new Error("stato_animazione: salute_crm deve essere vero/falso");
    if (typeof nuovo.verificato !== "boolean") throw new Error("stato_animazione: verificato deve essere vero/falso");
    if (!Array.isArray(nuovo.azioni) || nuovo.azioni.length > P.max_azioni) throw new Error(`stato_animazione: azioni deve essere un elenco di al massimo ${P.max_azioni}`);
    for (const a of nuovo.azioni) if (!sc.azioni.some((x) => x.id === a)) throw new Error(`stato_animazione: azione sconosciuta «${a}»`);
    nuovo.azioni = nuovo.azioni.slice();
    nuovo.scelte = { ...(nuovo.scelte || {}) };
    for (const [id, v] of Object.entries(nuovo.scelte)) {
      const r = sc.difetto.righe.find((x) => x.id === id);
      if (!r || !r.selezionabile || v !== true) throw new Error(`stato_animazione: riga da segnare sconosciuta «${id}»`);
    }
    Object.assign(s, nuovo);
    daAnimare = 0;
    ridisegna();
  }
  applica({});
  return {
    applica,
    distruggi() { pulisci(); },
    _prova: { stato: s, simula: () => simula(sc, s.montaggio, s.azioni), avvio: () => avvio(sc, s), raggiungibilita: () => raggiungibilita(sc, s), verifica: () => verificaDifetto(sc, s.scelte), timerAttivi: () => timer.length },
  };
}
