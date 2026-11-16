// Lezione interattiva "Lo smistatore" (P8.2): le azioni dell'agente CRM passano da un motore di regole fuori dal modello
// e finiscono in quattro uscite (consenti, chiedi conferma, approvazione, ferma). Il livello di rischio nasce dalle quattro
// manopole di OpenAI (legge/scrive, reversibile, permessi, impatto); i rimborsi seguono le soglie d'importo dell'esempio
// Google; un'email sospetta appena letta alza il livello delle risposte verso l'esterno. Pannello "persona": tentativi
// falliti -> operatore, coda di approvazione con pausa/ripresa e identificativo. Guasto del motore: fail-closed contro
// fail-open (regola del benchmark R15, dichiarata nella lezione) e "approva sempre". Gioco "Decidi tu".

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "smistatore_rischio";
const VB = { w: 720, h: 430 };
const MOTORE = { x: 230, y: 40, w: 260, h: 56 };
const CESTO = { x0: 6, passo: 179, w: 172, y: 126, h: 296, testa: 46 };
const CHIP = { w: 152, h: 34, y0: 182, fondo: 414, passoMax: 42 };
const ATTESA = { y: 40, dy: 42, x0: 20, passo: 176, perRiga: 4 };

const STILE = `
.lz-smistatore_rischio .chip { cursor: pointer; }
.lz-smistatore_rischio .chip.mobile { transition: transform .55s cubic-bezier(.2,.8,.2,1); }
.lz-smistatore_rischio .chip:focus-visible rect.fondo { stroke: #4f46e5; stroke-width: 3.5; }
.lz-smistatore_rischio .manopole { display: grid; gap: 6px; }
.lz-smistatore_rischio .manopola { display: grid; gap: 3px; font-size: .78rem; color: var(--tenue); }
.lz-smistatore_rischio .manopole.spenta { opacity: .45; pointer-events: none; }
.lz-smistatore_rischio .nota { font-size: .78rem; color: var(--tenue); margin: 4px 0 0; }
.lz-smistatore_rischio .dettaglio { display: grid; gap: 8px; font-size: .85rem; }
.lz-smistatore_rischio .chi { font-weight: 800; font-size: .95rem; }
.lz-smistatore_rischio .fattori { display: grid; gap: 2px; font-size: .8rem; color: var(--tenue); }
.lz-smistatore_rischio .etichetta-piccola { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--tenue-2, #7a849e); }
.lz-smistatore_rischio .riga-msg { padding: 7px 10px; border-radius: 10px; background: var(--primario-chiaro); color: #3730a3; }
.lz-smistatore_rischio .riga-msg.ok { background: var(--ok-chiaro); color: #166534; }
.lz-smistatore_rischio .riga-msg.male { background: var(--male-chiaro); color: #9f1239; font-weight: 600; }
.lz-smistatore_rischio .riga-msg.avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-smistatore_rischio .bottone-largo { margin-top: 10px; width: 100%; justify-content: center; }
.lz-smistatore_rischio .scelta-gioco { display: grid; gap: 3px; margin: 8px 0; font-size: .82rem; }
.lz-smistatore_rischio .verifica { display: grid; gap: 6px; }
.lz-smistatore_rischio .verifica .riga { font-size: .82rem; padding: 7px 10px; border-radius: 10px; }
.lz-smistatore_rischio .verifica .riga.giusto { background: var(--ok-chiaro); color: #166534; }
.lz-smistatore_rischio .verifica .riga.quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-smistatore_rischio .verifica .riga.sbagliato, .lz-smistatore_rischio .verifica .riga.vuoto { background: var(--male-chiaro); color: #9f1239; }
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

/** Fattori effettivi di una carta: quelli dello scenario piu' i ritocchi dello studente. */
export function fattori(sc, s, id) {
  const c = sc.carte.find((x) => x.id === id);
  if (!c) throw new Error(`carta sconosciuta «${id}»`);
  return { ...c.fattori, ...((s.ritocchi || {})[id] || {}) };
}

/** Punti di rischio e livello dalle quattro manopole (OpenAI: lettura/scrittura, reversibilita', permessi, impatto). */
export function livelloDaFattori(sc, f) {
  const P = sc.punti;
  if (!(f.impatto in P.impatto)) throw new Error(`impatto sconosciuto «${f.impatto}»`);
  const dettaglio = {
    scrive: f.scrive ? P.scrive : 0,
    reversibile: f.reversibile ? 0 : P.irreversibile,
    permessi: f.permessi === "ampi" ? P.permessi_ampi : 0,
    impatto: P.impatto[f.impatto],
  };
  const punti = Object.values(dettaglio).reduce((a, b) => a + b, 0);
  const liv = sc.livelli.find((l) => punti <= l.fino_a);
  return { punti, livello: liv.id, dettaglio };
}

/** Livello per le azioni a importo (soglie dell'esempio Google: conferma da 100, blocco oltre 500). */
export function livelloDaImporto(sc, importo) {
  const I = sc.importo;
  if (importo > I.soglia_blocco) return "alto";
  if (importo >= I.soglia_conferma) return "medio";
  return "basso";
}

const uscitaDi = (sc, livello) => sc.livelli.find((l) => l.id === livello).uscita;

/** Dove finisce ogni azione: livello, uscita, motivo, allarme (azione rischiosa passata senza controllo). */
export function smista(sc, s) {
  const righe = sc.carte.map((c) => {
    const f = fattori(sc, s, c.id);
    const calc = livelloDaFattori(sc, f);
    let livello = c.a_importo ? livelloDaImporto(sc, s.importo) : calc.livello;
    let motivo = c.a_importo ? "importo" : "livello";
    if (s.email_sospetta && c.esterna && livello === "basso") { livello = "medio"; motivo = "sospetta"; }
    let uscita = uscitaDi(sc, livello);
    let allarme = false;
    if (s.sempre_consenti) { uscita = "consenti"; motivo = "sempre"; allarme = livello !== "basso"; }
    else if (!s.servizio_regole) {
      if (s.fail_closed) { uscita = "fermo"; motivo = "fermo"; }
      else { uscita = "consenti"; motivo = "aperto"; allarme = livello !== "basso"; }
    }
    return { id: c.id, livello, uscita, motivo, allarme, punti: calc.punti, dettaglio: calc.dettaglio };
  });
  const per_uscita = Object.fromEntries(sc.uscite.map((u) => [u.id, righe.filter((r) => r.uscita === u.id).length]));
  return { righe, per_uscita, allarmi: righe.filter((r) => r.allarme).length };
}

/** Il secondo trigger di OpenAI: troppi tentativi falliti portano a un operatore umano. */
export function operatore(sc, s) {
  return { passa: s.tentativi >= sc.soglia_tentativi, n: s.tentativi, soglia: sc.soglia_tentativi };
}

/** Coda di approvazione: la prima azione bloccata in attesa di una persona, con pausa, ripresa e identificativo. */
export function approvazione(sc, s) {
  const r = smista(sc, s).righe.find((x) => x.uscita === "approvazione");
  if (!r) return { carta: null, stato: "nessuna", esecuzioni: 0 };
  if (s.approvazione === "attesa") return { carta: r.id, stato: "attesa", esecuzioni: 0 };
  if (s.approvazione === "respinta") return { carta: r.id, stato: "respinta", esecuzioni: 0 };
  return { carta: r.id, stato: s.perdi_id ? "doppia" : "ripresa", esecuzioni: s.perdi_id ? 2 : 1 };
}

/** Riscontro del gioco "Decidi tu". */
export function verifica(sc, s) {
  const T = sc.testi;
  const nome = (u) => sc.uscite.find((x) => x.id === u).nome;
  const righe = sc.gioco.map((g) => {
    const scelta = s.scelte[g.id] || "";
    let esito;
    if (!scelta) esito = "vuoto";
    else if (scelta === g.migliore) esito = "giusto";
    else if (g.quasi.includes(scelta)) esito = "quasi";
    else esito = "sbagliato";
    return { id: g.id, esito, testo: riempi(T[`ver_${esito}`], { situazione: g.breve, migliore: nome(g.migliore), spiega: g.spiega }) };
  });
  const giuste = righe.filter((x) => x.esito === "giusto").length;
  return { righe, giuste, totali: righe.length, sintesi: giuste === righe.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righe.length }) };
}

/** Posizioni dei chip nella scena: nel cesto dell'uscita o, nel gioco, nella fila "da smistare". */
export function posizioni(sc, s) {
  const ids = sc.uscite.map((u) => u.id);
  const elementi = s.vista === "decidi"
    ? sc.gioco.map((g) => ({ id: g.id, dove: s.scelte[g.id] || null }))
    : smista(sc, s).righe.map((r) => ({ id: r.id, dove: r.uscita }));
  const perCesto = {};
  const attesa = [];
  for (const e of elementi) (e.dove ? (perCesto[e.dove] = perCesto[e.dove] || []) : attesa).push(e.id);
  const pos = {};
  for (const [d, lista] of Object.entries(perCesto)) {
    const i = ids.indexOf(d);
    const passo = lista.length <= 1 ? 0 : Math.min(CHIP.passoMax, (CHIP.fondo - CHIP.y0 - CHIP.h) / (lista.length - 1));
    lista.forEach((id, k) => { pos[id] = { x: CESTO.x0 + i * CESTO.passo + (CESTO.w - CHIP.w) / 2, y: CHIP.y0 + k * passo, cesto: d }; });
  }
  attesa.forEach((id, k) => { pos[id] = { x: ATTESA.x0 + (k % ATTESA.perRiga) * ATTESA.passo, y: ATTESA.y + Math.floor(k / ATTESA.perRiga) * ATTESA.dy, cesto: null }; });
  return pos;
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const lingua = contesto && contesto.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante: serve per scrivere i numeri nel formato della lingua");
  const num = (x) => x.toLocaleString(lingua);
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));
  const uscita = (id) => sc.uscite.find((u) => u.id === id);
  const carta = (id) => sc.carte.find((c) => c.id === id);
  const nomeLivello = (id) => sc.livelli.find((l) => l.id === id).nome;

  const s = {
    vista: "nastro", carta: sc.carte[0].id, ritocchi: {}, importo: sc.importo.min, email_sospetta: false, tentativi: 0,
    approvazione: "attesa", perdi_id: false, servizio_regole: true, fail_closed: true, sempre_consenti: false, scelte: {}, verificato: false,
  };
  let primoDisegno = true;

  // ------------------------------------------------ comandi (sinistra)
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    el("button", { "data-v": "nastro", onclick: () => cambia({ vista: "nastro" }) }, E.vista_nastro),
    el("button", { "data-v": "decidi", onclick: () => cambia({ vista: "decidi" }) }, E.vista_decidi));
  const selCarta = el("select", { class: "scelta", "aria-label": E.carta, onchange: (e) => cambia({ carta: e.target.value }) },
    ...sc.carte.map((c) => el("option", { value: c.id }, c.nome)));
  function manopola(titolo, chiave, valori) {
    const seg = el("div", { class: "segmentato", role: "group", "aria-label": titolo },
      ...valori.map(([v, etichetta]) => el("button", { "data-v": String(v), onclick: () => ritocca(chiave, v) }, etichetta)));
    return { nodo: el("div", { class: "manopola" }, el("span", {}, titolo), seg), seg, chiave };
  }
  const MAN = [
    manopola(E.f_scrive, "scrive", [[false, E.legge], [true, E.scrive]]),
    manopola(E.f_reversibile, "reversibile", [[true, E.si], [false, E.no]]),
    manopola(E.f_permessi, "permessi", [["base", E.base], ["ampi", E.ampi]]),
    manopola(E.f_impatto, "impatto", Object.keys(sc.punti.impatto).map((k) => [k, E[k]])),
  ];
  const nodoManopole = el("div", { class: "manopole" }, MAN.map((m) => m.nodo));
  const notaImporto = el("p", { class: "nota" }, E.nota_importo);
  const valoreImporto = el("b", {});
  const inImporto = el("input", { type: "range", min: sc.importo.min, max: sc.importo.max, step: sc.importo.passo, "aria-label": E.importo });
  inImporto.addEventListener("input", () => cambia({ importo: Number(inImporto.value) }));
  const inSospetta = el("input", { type: "checkbox", onchange: (e) => cambia({ email_sospetta: e.target.checked }) });
  const valoreTent = el("b", {});
  const inTent = el("input", { type: "range", min: 0, max: sc.tentativi_max, step: 1, "aria-label": E.tentativi });
  inTent.addEventListener("input", () => cambia({ tentativi: Number(inTent.value) }));
  const segApp = el("div", { class: "segmentato", role: "group", "aria-label": E.approvazione },
    ...["attesa", "approvata", "respinta"].map((v) => el("button", { "data-v": v, onclick: () => cambia({ approvazione: v }) }, E[v])));
  const inPerdi = el("input", { type: "checkbox", onchange: (e) => cambia({ perdi_id: e.target.checked }) });
  const inServizio = el("input", { type: "checkbox", onchange: (e) => cambia({ servizio_regole: e.target.checked }) });
  const segGuasto = el("div", { class: "segmentato", role: "group", "aria-label": E.modo_guasto },
    el("button", { "data-v": "true", onclick: () => cambia({ fail_closed: true }) }, E.fail_closed),
    el("button", { "data-v": "false", onclick: () => cambia({ fail_closed: false }) }, E.fail_open));
  const inSempre = el("input", { type: "checkbox", onchange: (e) => cambia({ sempre_consenti: e.target.checked }) });
  const zonaNastro = el("div", {},
    el("h4", {}, E.carta), selCarta, nodoManopole, notaImporto,
    el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, E.importo), valoreImporto), inImporto),
    el("label", { class: "interruttore" }, el("span", {}, E.email_sospetta), inSospetta),
    el("h4", {}, E.titolo_persona),
    el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, E.tentativi), valoreTent), inTent),
    el("div", { class: "manopola" }, el("span", {}, E.approvazione), segApp),
    el("label", { class: "interruttore pericolo" }, el("span", {}, E.perdi_id), inPerdi),
    el("h4", {}, E.titolo_guasto),
    el("label", { class: "interruttore" }, el("span", {}, E.servizio_regole), inServizio),
    el("div", { class: "manopola" }, el("span", {}, E.modo_guasto), segGuasto),
    el("label", { class: "interruttore pericolo" }, el("span", {}, E.sempre_consenti), inSempre));
  const tendine = {};
  const zonaDecidi = el("div", {});
  const sceltePossibili = sc.uscite.filter((u) => u.id !== "fermo");
  for (const g of sc.gioco) {
    const sel = el("select", { class: "scelta", "aria-label": riempi(T.uscita_per, { azione: g.breve }), onchange: (e) => scegli(g.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sceltePossibili.map((u) => el("option", { value: u.id }, u.nome)));
    tendine[g.id] = sel;
    zonaDecidi.append(el("label", { class: "scelta-gioco" }, el("span", {}, g.testo), sel));
  }
  zonaDecidi.append(el("button", { class: "btn btn-primario bottone-largo", onclick: () => controlla() }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaNastro, zonaDecidi);

  // ------------------------------------------------ scena (centro)
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${VB.w} ${VB.h}`, role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs><filter id="sr-ombra" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#17203b" flood-opacity=".14"/></filter></defs>`;
  const gMotore = svgEl("g");
  const motFondo = svgEl("rect", { x: MOTORE.x, y: MOTORE.y, width: MOTORE.w, height: MOTORE.h, rx: 14, "stroke-width": 2 });
  const motTitolo = testoSvg({ x: MOTORE.x + MOTORE.w / 2, y: MOTORE.y + 24, "text-anchor": "middle", "font-size": 12, "font-weight": 900, fill: "#17203b", "letter-spacing": ".06em" }, E.motore);
  const motStato = testoSvg({ x: MOTORE.x + MOTORE.w / 2, y: MOTORE.y + 42, "text-anchor": "middle", "font-size": 10.5, "font-weight": 700 }, "");
  gMotore.append(motFondo, motTitolo, motStato);
  const imbuto = svgEl("path", { d: `M${MOTORE.x + MOTORE.w / 2} ${MOTORE.y + MOTORE.h} L${MOTORE.x + MOTORE.w / 2} ${CESTO.y - 8}`, stroke: "#94a3b8", "stroke-width": 2, "stroke-dasharray": "4 4" });
  const titoloDecidi = testoSvg({ x: VB.w / 2, y: 30, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, E.titolo_decidi);
  svg.append(gMotore, imbuto, titoloDecidi);
  const CE = {};
  sc.uscite.forEach((u, i) => {
    const x = CESTO.x0 + i * CESTO.passo;
    const g = svgEl("g");
    g.append(svgEl("rect", { x, y: CESTO.y, width: CESTO.w, height: CESTO.h, rx: 14, fill: u.colore, "fill-opacity": ".07", stroke: u.colore, "stroke-opacity": ".5", "stroke-width": 1.5, "stroke-dasharray": u.id === "fermo" ? "5 4" : "" }));
    g.append(svgEl("rect", { x, y: CESTO.y, width: CESTO.w, height: 6, rx: 3, fill: u.colore }));
    g.append(testoSvg({ x: x + CESTO.w / 2, y: CESTO.y + 24, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#17203b" }, accorcia(u.nome, 20)));
    g.append(testoSvg({ x: x + CESTO.w / 2, y: CESTO.y + 39, "text-anchor": "middle", "font-size": 9.5, "font-weight": 700, fill: u.colore }, accorcia(u.sotto, 30)));
    svg.append(g);
    CE[u.id] = g;
  });
  const gChip = svgEl("g");
  svg.append(gChip);
  const CH = {};
  function creaChip(id, nome, cliccabile) {
    const g = svgEl("g", cliccabile ? { class: "chip", tabindex: "0", role: "button", "aria-label": riempi(T.apri_carta, { nome }) } : { class: "chip" });
    const fondo = svgEl("rect", { class: "fondo", x: 0, y: 0, width: CHIP.w, height: CHIP.h, rx: 9, fill: "#fff", stroke: "#cbd2e3", "stroke-width": 1.5, filter: "url(#sr-ombra)" });
    const banda = svgEl("rect", { x: 0, y: 0, width: 5, height: CHIP.h, rx: 2.5, fill: "#cbd2e3" });
    const t = testoSvg({ x: 11, y: 21, "font-size": 10.5, "font-weight": 800, fill: "#17203b" }, accorcia(nome, 18));
    const liv = testoSvg({ x: CHIP.w - 8, y: 21, "text-anchor": "end", "font-size": 8.5, "font-weight": 900 }, "");
    const badge = svgEl("g", { transform: `translate(${CHIP.w - 3},3)`, opacity: 0 });
    badge.append(svgEl("circle", { r: 7.5, fill: "#e11d48" }), testoSvg({ x: 0, y: 3.6, "text-anchor": "middle", "font-size": 10.5, "font-weight": 900, fill: "#fff" }, "!"));
    g.append(fondo, banda, t, liv, badge);
    if (cliccabile) {
      const apri = () => cambia({ carta: id });
      g.addEventListener("click", apri);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(); } });
    }
    gChip.append(g);
    CH[id] = { g, fondo, banda, liv, badge };
  }
  for (const c of sc.carte) creaChip(c.id, c.nome, true);
  for (const g of sc.gioco) creaChip(g.id, g.breve, false);
  scena.append(svg);

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  const dettaglio = el("div", { class: "dettaglio", "aria-live": "polite" });
  destra.append(el("h3", {}, E.titolo_dettaglio), dettaglio);
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno
  function disegnaScena() {
    const calc = smista(sc, s);
    const pos = posizioni(sc, s);
    const gioco = s.vista === "decidi";
    gMotore.setAttribute("display", gioco ? "none" : "inline");
    imbuto.setAttribute("display", gioco ? "none" : "inline");
    titoloDecidi.setAttribute("display", gioco ? "inline" : "none");
    const spento = !s.servizio_regole && !s.sempre_consenti;
    motFondo.setAttribute("fill", spento ? "#f1f5f9" : "#eef0ff");
    motFondo.setAttribute("stroke", spento ? "#64748b" : "#4f46e5");
    motFondo.setAttribute("stroke-dasharray", spento ? "6 4" : "");
    motStato.setAttribute("fill", spento ? "#64748b" : "#4f46e5");
    motStato.textContent = spento ? E.motore_spento : E.motore_attivo;
    CE.fermo.setAttribute("opacity", gioco ? ".25" : "1");
    for (const [id, C] of Object.entries(CH)) {
      const p = pos[id];
      if (!p) { C.g.setAttribute("display", "none"); continue; }
      C.g.removeAttribute("display");
      C.g.classList.toggle("mobile", !ridotto && !primoDisegno);
      C.g.style.transform = `translate(${p.x}px, ${p.y}px)`;
      C.g.setAttribute("transform", `translate(${p.x},${p.y})`);
      const colore = p.cesto ? uscita(p.cesto).colore : "#cbd2e3";
      C.banda.setAttribute("fill", colore);
      const scelta = !gioco && id === s.carta;
      C.fondo.setAttribute("stroke", scelta ? "#4f46e5" : colore);
      C.fondo.setAttribute("stroke-width", scelta ? 3 : 1.5);
      const r = calc.righe.find((x) => x.id === id);
      C.liv.textContent = r && !gioco ? nomeLivello(r.livello) : "";
      C.liv.setAttribute("fill", r ? uscita(sc.livelli.find((l) => l.id === r.livello).uscita).colore : "#5b6684");
      C.badge.setAttribute("opacity", r && r.allarme && !gioco ? "1" : "0");
    }
    primoDisegno = false;
  }

  function msg(classe, testo) { return el("div", { class: `riga-msg ${classe}` }, testo); }

  function disegnaDettaglio() {
    if (s.vista === "decidi") {
      const figli = [];
      if (s.verificato) {
        const v = verifica(sc, s);
        figli.push(el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
          el("div", { class: "verifica" }, v.righe.map((x) => el("div", { class: `riga ${x.esito}` }, x.testo))));
      }
      dettaglio.replaceChildren(...figli);
      return;
    }
    const c = carta(s.carta);
    const calc = smista(sc, s);
    const r = calc.righe.find((x) => x.id === c.id);
    const f = fattori(sc, s, c.id);
    const valori = { scrive: f.scrive ? E.scrive : E.legge, reversibile: f.reversibile ? E.si : E.no, permessi: E[f.permessi], impatto: E[f.impatto] };
    const nomi = { scrive: E.f_scrive, reversibile: E.f_reversibile, permessi: E.f_permessi, impatto: E.f_impatto };
    const nomeU = uscita(r.uscita).nome;
    const I = sc.importo;
    const motivi = {
      livello: () => riempi(T.mot_livello, { livello: nomeLivello(r.livello), uscita: nomeU }),
      importo: () => riempi(T.mot_importo, { importo: riempi(E.formato_importo, { n: num(s.importo) }), soglia1: num(I.soglia_conferma), soglia2: num(I.soglia_blocco), uscita: nomeU }),
      sospetta: () => riempi(T.mot_sospetta, { uscita: nomeU }),
      fermo: () => T.mot_fermo, aperto: () => T.mot_aperto, sempre: () => T.mot_sempre,
    };
    const classe = r.allarme ? "male" : ({ consenti: "ok", conferma: "avviso", approvazione: "male", fermo: "" }[r.uscita]);
    const figli = [
      el("div", {}, el("div", { class: "chi" }, c.nome), el("div", { class: "fattori" }, c.descrizione)),
      el("div", { class: "fattori" }, ...Object.keys(nomi).map((k) => el("div", {}, riempi(T.fattore_riga, { fattore: nomi[k], valore: valori[k], punti: r.dettaglio[k] }))),
        el("b", {}, riempi(T.punteggio, { punti: r.punti, livello: nomeLivello(r.livello) }))),
      msg(classe, motivi[r.motivo]()),
    ];
    if (r.allarme) figli.push(msg("male", riempi(T.allarme, { livello: nomeLivello(r.livello) })));
    const op = operatore(sc, s);
    figli.push(el("div", {}, el("div", { class: "etichetta-piccola" }, E.titolo_operatore),
      msg(op.passa ? "avviso" : "ok", riempi(op.passa ? T.operatore_si : T.operatore_no, { n: op.n, soglia: op.soglia }))));
    const ap = approvazione(sc, s);
    let testoAp;
    if (ap.stato === "nessuna") testoAp = msg("", T.app_nessuna);
    else {
      const azione = carta(ap.carta).nome;
      const F = sc.fotografia;
      const tipi = { attesa: ["avviso", T.app_attesa], ripresa: ["ok", T.app_ripresa], doppia: ["male", T.app_doppia], respinta: ["", T.app_respinta] };
      const [cl, mod] = tipi[ap.stato];
      testoAp = msg(cl, riempi(mod, { azione, messaggi: F.messaggi, strumento: F.strumento, parametri: F.parametri }));
    }
    figli.push(el("div", {}, el("div", { class: "etichetta-piccola" }, E.titolo_coda), testoAp));
    dettaglio.replaceChildren(...figli);
  }

  function aggiornaComandi() {
    segVista.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.vista)));
    selCarta.value = s.carta;
    const f = fattori(sc, s, s.carta);
    for (const m of MAN) m.seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === String(f[m.chiave]))));
    const aImporto = carta(s.carta).a_importo;
    nodoManopole.classList.toggle("spenta", aImporto);
    notaImporto.classList.toggle("nascosto", !aImporto);
    inImporto.value = s.importo;
    valoreImporto.textContent = riempi(E.formato_importo, { n: num(s.importo) });
    inSospetta.checked = s.email_sospetta;
    inTent.value = s.tentativi;
    valoreTent.textContent = num(s.tentativi);
    segApp.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.approvazione)));
    inPerdi.checked = s.perdi_id;
    inServizio.checked = s.servizio_regole;
    segGuasto.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === String(s.fail_closed))));
    inSempre.checked = s.sempre_consenti;
    zonaNastro.classList.toggle("nascosto", s.vista !== "nastro");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }

  function ridisegna() {
    aggiornaComandi();
    disegnaScena();
    disegnaDettaglio();
  }

  function cambia(diff) {
    Object.assign(s, diff);
    if (!("verificato" in diff)) s.verificato = false;
    ridisegna();
  }
  function ritocca(chiave, valore) {
    if (carta(s.carta).a_importo) return;
    const ritocchi = { ...s.ritocchi, [s.carta]: { ...(s.ritocchi[s.carta] || {}), [chiave]: valore } };
    cambia({ ritocchi });
  }
  function scegli(id, valore) {
    const scelte = { ...s.scelte };
    if (valore) scelte[id] = valore; else delete scelte[id];
    cambia({ scelte });
  }
  function controlla() {
    s.verificato = true;
    disegnaDettaglio();
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    nuovo.ritocchi = { ...(nuovo.ritocchi || {}) };
    nuovo.scelte = { ...(nuovo.scelte || {}) };
    for (const [id, rit] of Object.entries(nuovo.ritocchi)) {
      if (!carta(id)) throw new Error(`stato_animazione: carta sconosciuta nei ritocchi «${id}»`);
      for (const k of Object.keys(rit)) if (!["scrive", "reversibile", "permessi", "impatto"].includes(k)) throw new Error(`stato_animazione: fattore sconosciuto «${k}»`);
    }
    for (const [id, u] of Object.entries(nuovo.scelte)) {
      if (!sc.gioco.some((g) => g.id === id)) throw new Error(`stato_animazione: «${id}» non e' un'azione del gioco`);
      if (!sceltePossibili.some((x) => x.id === u)) throw new Error(`stato_animazione: uscita sconosciuta «${u}»`);
    }
    if (!["nastro", "decidi"].includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!carta(nuovo.carta)) throw new Error(`stato_animazione: carta sconosciuta «${nuovo.carta}»`);
    if (!["attesa", "approvata", "respinta"].includes(nuovo.approvazione)) throw new Error(`stato_animazione: approvazione sconosciuta «${nuovo.approvazione}»`);
    if (!(nuovo.importo >= sc.importo.min && nuovo.importo <= sc.importo.max)) throw new Error(`stato_animazione: importo fuori scala «${nuovo.importo}»`);
    if (!(nuovo.tentativi >= 0 && nuovo.tentativi <= sc.tentativi_max)) throw new Error(`stato_animazione: tentativi fuori scala «${nuovo.tentativi}»`);
    Object.assign(s, nuovo);
    primoDisegno = true;
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo: le transizioni CSS si fermano da sole */ },
    _prova: { stato: s, smista: () => smista(sc, s), verifica: () => verifica(sc, s), posizioni: () => posizioni(sc, s) },
  };
}
