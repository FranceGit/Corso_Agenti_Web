// Lezione interattiva "Anatomia di un agente": esploso in quattro blocchi (modello, strumenti,
// orchestrazione, memoria). Lo studente spegne i blocchi e lancia "qualifica i nuovi lead" su una lista
// in cui un lead arriva due volte: ogni blocco mancante produce il suo guasto tipico. In modalita'
// "Trova il guasto" un blocco e' rotto di nascosto e lo studente lo individua dal sintomo.
// Testi e numeri: dallo scenario della lezione.

const NS = "http://www.w3.org/2000/svg";
const COMP = "anatomia_agente";
const BLOCCHI = ["modello", "strumenti", "orchestrazione", "memoria"];
const CENTRO = { x: 320, y: 150 };
const POSTO = { modello: { x: 120, y: 62 }, strumenti: { x: 520, y: 62 }, orchestrazione: { x: 120, y: 238 }, memoria: { x: 520, y: 238 } };
const COLORE = { modello: "#8b5cf6", strumenti: "#f59e0b", orchestrazione: "#0ea5e9", memoria: "#10b981" };
const ICONE = {
  modello: '<rect x="-10" y="-10" width="20" height="20" rx="3" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="-4.5" y="-4.5" width="9" height="9" rx="1.5" fill="currentColor"/><path d="M-6,-10 v-4 M0,-10 v-4 M6,-10 v-4 M-6,10 v4 M0,10 v4 M6,10 v4 M-10,-6 h-4 M-10,0 h-4 M-10,6 h-4 M10,-6 h4 M10,0 h4 M10,6 h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  strumenti: '<path d="M7,-12 a6,6 0 0 0 -6,8 L-11,8 a2.5,2.5 0 0 0 3.5,3.5 L4,-0.5 a6,6 0 0 0 8,-6 l-4,3 l-3,-1 l-1,-3z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/>',
  orchestrazione: '<circle cx="-4" cy="-8" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M-11,12 c0,-9 3,-14 7,-14 c4,0 7,5 7,14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M2,-2 L13,-13" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  memoria: '<rect x="-11" y="-12" width="22" height="24" rx="2.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M-11,-4 h22 M-11,4 h22 M-3,-8 h6 M-3,0 h6 M-3,8 h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  nucleo: '<circle r="6" fill="currentColor"/>',
};
const STILE = `
.lz-anatomia_agente .blocco{cursor:pointer}
.lz-anatomia_agente .blocco:focus-visible{outline:none}
.lz-anatomia_agente .blocco:focus-visible rect.cornice{stroke:#4f46e5;stroke-width:3.5}
.lz-anatomia_agente .filo{stroke-dasharray:6 7}
.lz-anatomia_agente .filo.vivo{animation:lzaa-flusso 1s linear infinite}
@keyframes lzaa-flusso{to{stroke-dashoffset:-26}}
.lz-anatomia_agente .lead-fila{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;padding:4px 6px 6px}
.lz-anatomia_agente .lead-carta{background:#fff;border:1.5px solid var(--bordo);border-radius:12px;padding:8px 10px;font-size:.8rem;transition:border-color .3s,background .3s,transform .3s}
.lz-anatomia_agente .lead-carta b{display:block;font-size:.86rem}
.lz-anatomia_agente .lead-carta .stato{display:inline-block;margin-top:4px;font-size:.7rem;font-weight:800;padding:.15em .55em;border-radius:999px;background:var(--sfondo-2);color:var(--tenue)}
.lz-anatomia_agente .lead-carta.attivo{transform:translateY(-3px);border-color:var(--primario)}
.lz-anatomia_agente .lead-carta.fatto .stato{background:var(--ok-chiaro);color:#166534}
.lz-anatomia_agente .lead-carta.saltato .stato{background:var(--primario-chiaro);color:#3730a3}
.lz-anatomia_agente .lead-carta.doppio{border-color:var(--male);background:var(--male-chiaro)}
.lz-anatomia_agente .lead-carta.doppio .stato{background:var(--male);color:#fff}
.lz-anatomia_agente .lead-carta.ipotesi .stato,.lz-anatomia_agente .lead-carta.fermo .stato{background:var(--avviso-chiaro);color:#92400e}
.lz-anatomia_agente .diagnosi{margin-top:10px;font-size:.86rem}
@media (max-width:960px){.lz-anatomia_agente .lead-fila{grid-template-columns:repeat(2,minmax(0,1fr))}}
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
    else if (k === "html") e.innerHTML = v;
    else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const f of figli.flat()) if (f !== null && f !== undefined && f !== false) e.append(f instanceof Node ? f : document.createTextNode(String(f)));
  return e;
}
function riempi(modello, valori) {
  return modello.replace(/\{(\w+)\}/g, (_, k) => {
    if (!(k in valori)) throw new Error(`segnaposto {${k}} senza valore`);
    return valori[k];
  });
}
function inietta(id, css) {
  if (document.getElementById(id)) return;
  document.head.append(el("style", { id }, css));
}
const attendi = (ms) => new Promise((ok) => setTimeout(ok, ms));
const morbido = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// ------------------------------------------------------------------ logica (pura)

export function blocchiEffettivi(s) {
  if (s.modalita === "diagnosi") {
    if (!BLOCCHI.includes(s.mistero)) throw new Error(`mistero sconosciuto: ${s.mistero}`);
    return Object.fromEntries(BLOCCHI.map((b) => [b, b !== s.mistero]));
  }
  if (s.modalita !== "prova") throw new Error(`modalita sconosciuta: ${s.modalita}`);
  return Object.fromEntries(BLOCCHI.map((b) => [b, Boolean(s[b])]));
}

export function esegui(sc, s) {
  const T = sc.testi;
  const tx = (k, v) => riempi(T[k], v || {});
  const on = blocchiEffettivi(s);
  const perId = Object.fromEntries(sc.lead.map((l) => [l.id, l]));
  const eventi = [];
  const statiLead = sc.arrivi.map(() => "in_coda");
  const manifesti = new Set();
  const visti = new Set();
  for (let i = 0; i < sc.arrivi.length; i++) {
    const lead = perId[sc.arrivi[i]];
    if (!lead) throw new Error(`lead sconosciuto negli arrivi: ${sc.arrivi[i]}`);
    if (!on.orchestrazione && i >= 1) {
      eventi.push({ indice: i, testo: tx("stop", { rimasti: sc.arrivi.length - i }), stato: "avviso", blocco: "orchestrazione" });
      manifesti.add("orchestrazione");
      break;
    }
    const v = { nome: lead.nome, dato: lead.dato, livello: lead.livello };
    const giaVisto = visti.has(lead.id);
    if (!on.modello) {
      eventi.push({ indice: i, testo: tx("nessuno_decide", v), stato: "avviso", blocco: "modello", esitoLead: "fermo" });
      statiLead[i] = "fermo";
      manifesti.add("modello");
      visti.add(lead.id);
      continue;
    }
    if (giaVisto && on.memoria) {
      eventi.push({ indice: i, testo: tx("memoria_salta", v), stato: "ok", blocco: "memoria", esitoLead: "saltato" });
      statiLead[i] = "saltato";
      continue;
    }
    if (giaVisto) eventi.push({ indice: i, testo: tx("memoria_doppio", v), stato: "errore", blocco: "memoria" });
    if (!on.strumenti) {
      eventi.push({ indice: i, testo: tx("ipotesi", v), stato: "avviso", blocco: "strumenti", esitoLead: giaVisto ? "doppio" : "ipotesi" });
      statiLead[i] = giaVisto ? "doppio" : "ipotesi";
      manifesti.add("strumenti");
    } else {
      eventi.push({ indice: i, testo: tx("leggi", v), stato: "ok", blocco: "strumenti" });
      eventi.push({ indice: i, testo: tx("decide", v), stato: giaVisto ? "errore" : "ok", blocco: "modello", esitoLead: giaVisto ? "doppio" : "fatto" });
      statiLead[i] = giaVisto ? "doppio" : "fatto";
    }
    if (giaVisto) manifesti.add("memoria");
    visti.add(lead.id);
  }
  if (on.orchestrazione) eventi.push({ indice: null, testo: tx("fine"), stato: "ok", blocco: "orchestrazione" });
  const sintomi = BLOCCHI.filter((b) => manifesti.has(b)).map((b) => ({ blocco: b, testo: tx(`sintomo_${b}`) }));
  const esito = sintomi.length ? { tipo: "male", testo: tx("esito_male") } : { tipo: "ok", testo: tx("esito_ok") };
  return { eventi, statiLead, sintomi, esito, attivi: on };
}

export function diagnostica(sc, s, scelta) {
  if (s.modalita !== "diagnosi") throw new Error("la diagnosi vale solo in modalita «diagnosi»");
  const perId = Object.fromEntries(sc.blocchi.map((b) => [b.id, b]));
  if (!perId[scelta]) throw new Error(`blocco sconosciuto: ${scelta}`);
  const giusto = scelta === s.mistero;
  const testo = giusto
    ? riempi(sc.testi.diagnosi_giusta, { spiegazione: perId[s.mistero].spiegazione })
    : riempi(sc.testi.diagnosi_sbagliata, { blocco: perId[scelta].nome, indizio: perId[s.mistero].indizio });
  return { giusto, testo };
}

export function prossimoMistero(attuale) {
  const i = BLOCCHI.indexOf(attuale);
  if (i < 0) throw new Error(`mistero sconosciuto: ${attuale}`);
  return BLOCCHI[(i + 1) % BLOCCHI.length];
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez) {
  inietta(`stile-${COMP}`, STILE);
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const tempi = sc.tempi;
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const s = { modello: true, strumenti: true, orchestrazione: true, memoria: true, modalita: "prova", mistero: BLOCCHI[0] };
  for (const b of sc.blocchi) if (!BLOCCHI.includes(b.id)) throw new Error(`blocco non previsto nello scenario: ${b.id}`);
  let piano = null, indice = 0, inRiproduzione = false, generazione = 0, occupato = false;
  let velocita = tempi.velocita_iniziale;
  const risolti = new Set();
  const durata = (ms) => (ridotto ? 1 : ms / velocita);
  const nomeBlocco = Object.fromEntries(sc.blocchi.map((b) => [b.id, b.nome]));

  // comandi
  const comandi = el("aside", { class: "pannello" });
  const segModo = el("div", { class: "segmentato", role: "group", "aria-label": E.modalita },
    el("button", { "data-v": "prova", onclick: () => cambia({ modalita: "prova" }) }, E.prova),
    el("button", { "data-v": "diagnosi", onclick: () => cambia({ modalita: "diagnosi" }) }, E.diagnosi));
  const INT = {};
  const gruppoProva = el("div", {}, el("h4", {}, E.pezzi));
  for (const b of sc.blocchi) {
    const input = el("input", { type: "checkbox", onchange: (e) => cambia({ [b.id]: e.target.checked }) });
    INT[b.id] = input;
    gruppoProva.append(el("label", { class: "interruttore" }, el("span", {}, el("b", { style: `color:${COLORE[b.id]}` }, b.nome), ` · ${b.ruolo}`), input));
  }
  const contaRisolti = el("div", { class: "nota", style: "font-size:.8rem;color:var(--tenue);margin-top:8px" });
  const gruppoDiagnosi = el("div", {}, el("p", { style: "font-size:.84rem;margin:10px 0" }, T.diagnosi_istruzioni),
    el("button", { class: "btn", onclick: () => cambia({ mistero: prossimoMistero(s.mistero) }) }, E.nuovo_mistero), contaRisolti);
  const avvisoCambio = el("div", { class: "avviso-cambio", "aria-live": "polite" });
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.modalita), segModo, gruppoProva, gruppoDiagnosi, avvisoCambio);

  // scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: "0 0 640 300", role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs><radialGradient id="aa-nucleo" cx="40%" cy="35%"><stop offset="0" stop-color="#818cf8"/><stop offset=".6" stop-color="#6366f1"/><stop offset="1" stop-color="#4338ca"/></radialGradient>
    <filter id="aa-ombra" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#17203b" flood-opacity=".14"/></filter></defs>`;
  const compito = svgEl("text", { x: CENTRO.x, y: 18, "text-anchor": "middle", "font-size": 12.5, "font-weight": 800, fill: "#5b6684" });
  compito.textContent = E.compito;
  svg.append(compito);
  const NODI = {};
  const gFili = svgEl("g");
  svg.append(gFili);
  for (const b of sc.blocchi) {
    const p = POSTO[b.id];
    const filo = svgEl("line", { x1: CENTRO.x, y1: CENTRO.y, x2: p.x, y2: p.y, stroke: COLORE[b.id], "stroke-width": 3, class: "filo", opacity: ".6" });
    gFili.append(filo);
    const g = svgEl("g", { class: "blocco", tabindex: "0", role: "button", "aria-label": `${b.nome}: ${b.ruolo}`, transform: `translate(${p.x},${p.y})` });
    const cornice = svgEl("rect", { class: "cornice", x: -92, y: -36, width: 184, height: 72, rx: 16, fill: "#fff", stroke: COLORE[b.id], "stroke-width": 2.5, filter: "url(#aa-ombra)" });
    const disco = svgEl("circle", { cx: -58, cy: 0, r: 22, fill: COLORE[b.id], opacity: ".14" });
    const ic = svgEl("g", { transform: "translate(-58,0)", color: COLORE[b.id] }, ICONE[b.id]);
    const nome = svgEl("text", { x: -28, y: -4, "font-size": 15, "font-weight": 800, fill: "#17203b" });
    nome.textContent = b.nome;
    const ruolo = svgEl("text", { x: -28, y: 14, "font-size": 11, fill: "#5b6684" });
    ruolo.textContent = b.ruolo;
    const spento = svgEl("text", { x: 82, y: -20, "text-anchor": "end", "font-size": 10, "font-weight": 900, fill: "#e11d48", opacity: 0 });
    spento.textContent = E.spento;
    g.append(cornice, disco, ic, nome, ruolo, spento);
    const clic = () => cliccaBlocco(b.id);
    g.addEventListener("click", clic);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); clic(); } });
    svg.append(g);
    NODI[b.id] = { g, cornice, ic, spento, filo, p };
  }
  const nucleo = svgEl("circle", { cx: CENTRO.x, cy: CENTRO.y, r: 44, fill: "url(#aa-nucleo)", filter: "url(#aa-ombra)" });
  const testoNucleo = svgEl("text", { x: CENTRO.x, y: CENTRO.y + 5, "text-anchor": "middle", "font-size": 14, "font-weight": 900, fill: "#fff", "letter-spacing": "1.2" });
  svg.append(nucleo, testoNucleo);
  const fila = el("div", { class: "lead-fila" });
  const carte = sc.arrivi.map((id) => {
    const l = sc.lead.find((x) => x.id === id);
    const stato = el("span", { class: "stato" });
    const c = el("div", { class: "lead-carta" }, el("b", {}, l.nome), el("span", {}, l.dato), el("br"), stato);
    fila.append(c);
    return { c, stato };
  });
  const btnAvvia = el("button", { class: "btn btn-primario", onclick: () => (inRiproduzione ? pausa() : riproduci()) });
  const btnPasso = el("button", { class: "btn", onclick: () => passoSingolo() }, E.passo);
  const btnCapo = el("button", { class: "btn", onclick: () => reimposta(true) }, E.ricomincia);
  const vel = el("input", { type: "range", min: tempi.velocita_min, max: tempi.velocita_max, step: 0.25, value: velocita, "aria-label": E.velocita, oninput: (e) => { velocita = Number(e.target.value); } });
  scena.append(svg, fila, el("div", { class: "barra-riproduzione" }, btnAvvia, btnPasso, btnCapo, el("label", { class: "velocita" }, E.velocita, vel)));

  // destra
  const destra = el("aside", { class: "pannello destra" });
  const diario = el("div", { class: "diario", "aria-live": "polite" });
  const esitoBox = el("div", {});
  const diagnosiBox = el("div", { class: "diagnosi", "aria-live": "polite" });
  destra.append(el("h3", {}, E.diario), diario, el("div", { style: "margin-top:12px" }, esitoBox), diagnosiBox);

  radice.replaceChildren(el("div", { class: `banco lz-${COMP}` }, comandi, scena, destra));

  function aggiornaComandi() {
    segModo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.modalita)));
    for (const b of BLOCCHI) INT[b].checked = s[b];
    gruppoProva.classList.toggle("nascosto", s.modalita !== "prova");
    gruppoDiagnosi.classList.toggle("nascosto", s.modalita !== "diagnosi");
    contaRisolti.textContent = riempi(T.risolti, { n: risolti.size, totale: BLOCCHI.length });
    btnAvvia.textContent = inRiproduzione ? E.pausa : E.avvia;
  }
  function cambia(diff) {
    Object.assign(s, diff);
    avvisoCambio.textContent = E.cambiato;
    reimposta(true);
    riproduci();
  }
  function cliccaBlocco(id) {
    if (s.modalita === "prova") { cambia({ [id]: !s[id] }); return; }
    const d = diagnostica(sc, s, id);
    if (d.giusto) risolti.add(s.mistero);
    diagnosiBox.replaceChildren(el("div", { class: `esito-scheda ${d.giusto ? "ok" : "avviso"}` }, el("div", {}, d.testo)));
    const N = NODI[id];
    N.g.animate(d.giusto
      ? [{ transform: `translate(${N.p.x}px,${N.p.y}px) scale(1)` }, { transform: `translate(${N.p.x}px,${N.p.y}px) scale(1.08)` }, { transform: `translate(${N.p.x}px,${N.p.y}px) scale(1)` }]
      : [{ transform: `translate(${N.p.x}px,${N.p.y}px)` }, { transform: `translate(${N.p.x - 6}px,${N.p.y}px)` }, { transform: `translate(${N.p.x + 6}px,${N.p.y}px)` }, { transform: `translate(${N.p.x}px,${N.p.y}px)` }],
    { duration: durata(420) });
    if (d.giusto) disegnaBlocchi(true);
    aggiornaComandi();
  }

  // In diagnosi i blocchi sembrano tutti accesi finche' il mistero non e' risolto.
  function disegnaBlocchi(rivela) {
    const on = piano.attivi;
    for (const b of BLOCCHI) {
      const visibileSpento = s.modalita === "prova" ? !on[b] : (rivela && !on[b]);
      const N = NODI[b];
      N.g.setAttribute("opacity", visibileSpento ? "0.45" : "1");
      N.cornice.setAttribute("stroke-dasharray", visibileSpento ? "6 5" : "none");
      N.cornice.setAttribute("stroke", visibileSpento ? "#94a3b8" : COLORE[b]);
      N.ic.setAttribute("color", visibileSpento ? "#94a3b8" : COLORE[b]);
      N.spento.setAttribute("opacity", visibileSpento ? "1" : "0");
      N.filo.setAttribute("opacity", visibileSpento ? "0.12" : "0.6");
    }
    testoNucleo.textContent = s.modalita === "diagnosi" && !rivela ? E.mistero_centro : E.agente_centro;
  }

  // L'esploso ha un suo contatore: un nuovo esploso interrompe il precedente, la riproduzione no.
  let esplosione = 0;
  function posa(x) {
    for (const b of BLOCCHI) {
      const p = NODI[b].p;
      NODI[b].g.setAttribute("transform", `translate(${CENTRO.x + (p.x - CENTRO.x) * x},${CENTRO.y + (p.y - CENTRO.y) * x}) scale(${0.4 + 0.6 * x})`);
    }
  }
  function esplodi() {
    const mio = ++esplosione;
    const ms = durata(tempi.ms_esploso);
    posa(0);
    const t0 = performance.now();
    const frame = (ora) => {
      if (mio !== esplosione) return;
      const x = Math.min(1, (ora - t0) / ms);
      posa(morbido(x));
      if (x < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  function voce(ev) {
    const colore = ev.stato === "errore" ? "#e11d48" : COLORE[ev.blocco];
    const v = el("div", { class: `voce-diario ${ev.stato === "errore" ? "errore" : ""}` },
      el("div", { class: "chip", style: `background:${colore}`, html: `<svg viewBox="-16 -16 32 32" style="color:#fff">${ICONE[ev.blocco]}</svg>` }),
      el("div", {}, el("div", { class: "chi", style: `color:${colore}` }, nomeBlocco[ev.blocco]), el("div", { class: "testo" }, ev.testo)));
    const vuoto = diario.querySelector(".vuoto");
    if (vuoto) vuoto.remove();
    diario.append(v);
    diario.scrollTop = diario.scrollHeight;
  }

  async function eseguiEvento(ev) {
    carte.forEach((c, i) => c.c.classList.toggle("attivo", i === ev.indice));
    voce(ev);
    const N = NODI[ev.blocco];
    if (piano.attivi[ev.blocco]) {
      N.filo.classList.add("vivo");
      N.cornice.animate([{ strokeWidth: 2.5 }, { strokeWidth: 5 }, { strokeWidth: 2.5 }], { duration: durata(500) });
    }
    nucleo.animate([{ transform: "scale(1)" }, { transform: "scale(1.05)" }, { transform: "scale(1)" }], { duration: durata(400) });
    if (ev.esitoLead) {
      const c = carte[ev.indice];
      c.c.className = `lead-carta ${ev.esitoLead}`;
      c.stato.textContent = sc.stati_lead[ev.esitoLead];
      if (ev.esitoLead === "doppio") c.c.animate([{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }], { duration: durata(400) });
    }
    await attendi(durata(tempi.ms_per_evento / 2));
    N.filo.classList.remove("vivo");
    return true;
  }

  function mostraEsito() {
    carte.forEach((c) => c.c.classList.remove("attivo"));
    const e = piano.esito;
    esitoBox.replaceChildren(el("div", { class: `esito-scheda ${e.tipo}` }, el("div", {},
      el("div", { style: "font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;opacity:.8" }, E.esito), e.testo,
      piano.sintomi.length ? el("ul", { class: "elenco-errori" }, piano.sintomi.map((x) => el("li", {}, x.testo))) : null)));
  }

  async function riproduci() {
    if (!piano) return;
    if (indice >= piano.eventi.length) reimposta(false);
    inRiproduzione = true;
    aggiornaComandi();
    const gen = generazione;
    while (inRiproduzione && gen === generazione && indice < piano.eventi.length) {
      const ev = piano.eventi[indice];
      indice += 1;
      if (!(await eseguiEvento(ev))) return;
      if (gen !== generazione) return;
      if (indice >= piano.eventi.length) break;
      await attendi(durata(tempi.ms_per_evento / 2));
    }
    if (gen !== generazione) return;
    if (indice >= piano.eventi.length) mostraEsito();
    inRiproduzione = false;
    aggiornaComandi();
  }
  function pausa() { inRiproduzione = false; aggiornaComandi(); }
  async function passoSingolo() {
    if (!piano || occupato) return;
    inRiproduzione = false;
    aggiornaComandi();
    if (indice >= piano.eventi.length) reimposta(false);
    occupato = true;
    const gen = generazione;
    const ev = piano.eventi[indice];
    indice += 1;
    await eseguiEvento(ev);
    occupato = false;
    if (gen === generazione && indice >= piano.eventi.length) mostraEsito();
  }

  function reimposta(conEsploso) {
    generazione += 1;
    inRiproduzione = false;
    occupato = false;
    piano = esegui(sc, s);
    indice = 0;
    disegnaBlocchi(false);
    carte.forEach((c) => { c.c.className = "lead-carta"; c.stato.textContent = sc.stati_lead.in_coda; });
    diario.replaceChildren(el("div", { class: "vuoto" }, E.vuoto));
    esitoBox.replaceChildren();
    diagnosiBox.replaceChildren();
    for (const b of BLOCCHI) NODI[b].filo.classList.remove("vivo");
    if (conEsploso) esplodi();
    aggiornaComandi();
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    Object.assign(s, stato || {});
    avvisoCambio.textContent = "";
    reimposta(true);
  }

  reimposta(true);
  return {
    applica,
    distruggi() { generazione += 1; esplosione += 1; inRiproduzione = false; },
    _prova: { esegui: () => esegui(sc, s), stato: s },
  };
}
