// Lezione interattiva "Ragionare e pianificare": lo stesso compito svolto in due modi.
// ReAct: card Pensiero -> Azione -> Osservazione una alla volta; ogni pensiero cita l'osservazione precedente
// e lo studente puo' indovinare la prossima mossa. Piano: lista di passi approvata all'inizio, riscritta
// quando un passo fallisce. Due contatori confrontano passi totali e punti di approvazione umana.
// Testi, mosse e tempi: dallo scenario della lezione.

const NS = "http://www.w3.org/2000/svg";
const COMP = "react_piano";
const MODALITA = ["react", "piano"];
const IMPREVISTI = ["nessuno", "zero_lead", "email_mancante"];
const COLORE = { pensiero: "#8b5cf6", azione: "#f59e0b", osservazione: "#10b981", fine: "#4f46e5", male: "#e11d48" };
const ICONE = {
  pensiero: '<path d="M-9,4 a6,6 0 0 1 1,-11 a7,7 0 0 1 13,-1 a5.5,5.5 0 0 1 4,10 z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="-7" cy="9" r="1.8" fill="currentColor"/><circle cx="-10" cy="13" r="1.2" fill="currentColor"/>',
  azione: '<circle r="4" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M0,-11 v4 M0,7 v4 M-11,0 h4 M7,0 h4 M-7.8,-7.8 l2.8,2.8 M5,5 l2.8,2.8 M-7.8,7.8 l2.8,-2.8 M5,-5 l2.8,-2.8" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  osservazione: '<circle cx="-2" cy="-2" r="7.5" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M3.5,3.5 L10,10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>',
  fine: '<path d="M-8,0 l5,5 l11,-11" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>',
  persona: '<circle cx="0" cy="-5" r="4.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M-9,10 c0,-7 4,-10 9,-10 c5,0 9,3 9,10" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  ok: '<path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  avviso: '<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 8v5M12 16.5v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
};
const STILE = `
.lz-react_piano .compito{font-size:.84rem;background:var(--primario-chiaro);border-radius:10px;padding:8px 10px;color:#3730a3;font-weight:600}
.lz-react_piano .linea{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:6px 4px;max-height:430px;overflow-y:auto}
.lz-react_piano .carta{position:relative;background:#fff;border:1.5px solid var(--bordo);border-left:5px solid var(--c);border-radius:12px;padding:8px 10px 9px;font-size:.82rem;animation:entra .35s ease;transition:box-shadow .3s,border-color .3s}
.lz-react_piano .carta .testa{display:flex;align-items:center;gap:6px;font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--c);margin-bottom:3px}
.lz-react_piano .carta .testa svg{width:16px;height:16px}
.lz-react_piano .carta .cita{display:block;margin-top:6px;font-size:.72rem;color:#6d28d9;background:#f5f3ff;border-radius:7px;padding:3px 6px}
.lz-react_piano .carta .chip-app{display:inline-block;margin-top:5px;font-size:.66rem;font-weight:800;padding:.12em .5em;border-radius:999px;background:var(--avviso-chiaro);color:#92400e}
.lz-react_piano .carta.citata{box-shadow:0 0 0 3px rgba(139,92,246,.45),0 8px 22px rgba(139,92,246,.25)}
.lz-react_piano .carta.allarme{border-color:var(--male);border-left-color:var(--male);background:var(--male-chiaro)}
.lz-react_piano .carta.allarme .nota{display:block;margin-top:6px;font-size:.74rem;font-weight:700;color:#9f1239}
.lz-react_piano .lista{list-style:none;margin:6px 4px;padding:0;display:grid;gap:7px}
.lz-react_piano .lista li{display:grid;grid-template-columns:28px 1fr auto;gap:8px;align-items:center;background:#fff;border:1.5px solid var(--bordo);border-radius:12px;padding:8px 10px;font-size:.86rem;animation:entra .35s ease;transition:background .3s,border-color .3s}
.lz-react_piano .lista .spunta{width:24px;height:24px;border-radius:50%;border:2px solid #c7cfe2;display:grid;place-items:center;font-weight:900;font-size:.8rem;color:#fff}
.lz-react_piano .lista li.fatto .spunta{background:var(--ok);border-color:var(--ok)}
.lz-react_piano .lista li.fallito{border-color:var(--male);background:var(--male-chiaro)}
.lz-react_piano .lista li.fallito .spunta{background:var(--male);border-color:var(--male)}
.lz-react_piano .lista li.tolto{opacity:.55;text-decoration:line-through}
.lz-react_piano .lista li.nuovo{background:#fffbe6;border-color:#fcd34d}
.lz-react_piano .lista li.attivo{border-color:var(--primario)}
.lz-react_piano .lista .badge{font-size:.64rem;font-weight:800;padding:.12em .5em;border-radius:999px;background:#fde68a;color:#92400e;white-space:nowrap}
.lz-react_piano .lista .badge.app{background:var(--avviso-chiaro)}
.lz-react_piano .timbro{margin:4px 4px 0;font-size:.8rem;font-weight:700;color:var(--avviso);display:flex;gap:6px;align-items:center}
.lz-react_piano .timbro svg{width:18px;height:18px}
.lz-react_piano .contatori{display:grid;grid-template-columns:1fr auto auto;gap:4px 10px;align-items:center;font-size:.8rem}
.lz-react_piano .contatori .tit{font-size:.68rem;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--tenue);text-align:center}
.lz-react_piano .contatori .num{font-size:1.35rem;font-weight:900;text-align:center;font-variant-numeric:tabular-nums;min-width:2.2em;border-radius:10px;padding:2px 4px;transition:background .3s,color .3s;color:var(--tenue-2)}
.lz-react_piano .contatori .num.mio{background:var(--primario-chiaro);color:var(--primario)}
.lz-react_piano .domanda-mossa{margin-top:12px;border:1.5px dashed #a5b4fc;background:#f5f7ff;border-radius:12px;padding:10px 12px;animation:entra .3s ease}
.lz-react_piano .domanda-mossa b{display:block;margin-bottom:8px;font-size:.86rem}
.lz-react_piano .domanda-mossa .btn{width:100%;justify-content:flex-start;margin-bottom:6px;text-align:left;font-weight:600}
.lz-react_piano .domanda-mossa .btn.giusta{border-color:var(--ok);background:var(--ok-chiaro)}
.lz-react_piano .domanda-mossa .btn.sbagliata{border-color:var(--male);background:var(--male-chiaro)}
.lz-react_piano .domanda-mossa .riscontro-mossa{font-size:.82rem;margin:6px 0}
.lz-react_piano .punti-mosse{font-size:.78rem;color:var(--tenue);margin-top:6px}
@media (max-width:960px){.lz-react_piano .linea{grid-template-columns:1fr}}
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

// ------------------------------------------------------------------ logica (pura)

function controlla(s) {
  if (!MODALITA.includes(s.modalita)) throw new Error(`modalita' sconosciuta: ${s.modalita}`);
  if (!IMPREVISTI.includes(s.imprevisto)) throw new Error(`imprevisto sconosciuto: ${s.imprevisto}`);
}

/** Lavoro ReAct: card pensiero/azione/osservazione; ogni pensiero cita l'ultima osservazione. */
export function pianificaReact(sc, s) {
  controlla(s);
  const T = sc.testi;
  const carte = [];
  let ultimaOss = null;
  const pensa = (k, extra) => {
    const c = { tipo: "pensiero", testo: T[k], cita: ultimaOss, ...(extra || {}) };
    if (ultimaOss !== null) c.citaTesto = riempi(T.cita, { frase: carte[ultimaOss].testo });
    carte.push(c);
  };
  const agisci = (mossa, oss) => {
    const m = sc.mosse[mossa];
    if (!m) throw new Error(`mossa sconosciuta: ${mossa}`);
    carte.push({ tipo: "azione", mossa, testo: m.testo, strumento: m.strumento, approvazione: m.approvazione });
    carte.push({ tipo: "osservazione", testo: T[oss] });
    ultimaOss = carte.length - 1;
  };
  pensa("r_p1");
  agisci("cerca_caldi", s.imprevisto === "zero_lead" ? "r_o1_zero" : "r_o1");
  if (s.imprevisto === "zero_lead") { pensa("r_p1z"); agisci("cerca_punteggio", "r_o1z"); }
  pensa("r_p2");
  agisci("valore", s.dato_sbagliato ? "r_o2_sbagliato" : "r_o2");
  if (s.dato_sbagliato) pensa("r_p3_sbagliato", { allarme: true, nota: T.allarme });
  else pensa("r_p3");
  agisci("scrivi", "r_o3");
  pensa("r_p4");
  agisci("rubrica", s.imprevisto === "email_mancante" ? "r_o4_manca" : "r_o4");
  if (s.imprevisto === "email_mancante") { pensa("r_p4m"); agisci("chiedi", "r_o4m"); }
  pensa("r_p5");
  agisci("invia", "r_o5");
  carte.push({ tipo: "fine", testo: T.r_fine, cita: ultimaOss, citaTesto: riempi(T.cita, { frase: carte[ultimaOss].testo }) });
  const azioni = carte.filter((c) => c.tipo === "azione");
  const esito = s.dato_sbagliato ? { tipo: "avviso", testo: T.esito_sbagliato }
    : { tipo: "ok", testo: s.imprevisto === "nessuno" ? T.esito_react : T.esito_react_adatta };
  return { modalita: "react", eventi: carte, contatori: { passi: azioni.length, approvazioni: azioni.filter((a) => a.approvazione).length }, esito };
}

/** Lavoro a piano: lista approvata, passi eseguiti, ripianificazione sul passo che fallisce. */
export function pianificaPiano(sc, s) {
  controlla(s);
  const T = sc.testi;
  const testo = (id) => {
    if (!sc.piano[id]) throw new Error(`passo di piano sconosciuto: ${id}`);
    return sc.piano[id];
  };
  const fallisce = { q1: s.imprevisto === "zero_lead", q3: s.guasto_passo3, q5: s.imprevisto === "email_mancante" };
  const sostituti = { q1: ["q1b"], q3: ["q3a"], q5: ["q5a", "q5b"] };
  const conApprovazione = new Set(["q5", "q5b"]);
  let voci = ["q1", "q2", "q3", "q4", "q5"].map((id) => ({ id, testo: testo(id), stato: "da_fare", nuovo: false, approvazione: conApprovazione.has(id) }));
  const copia = () => voci.map((v) => ({ ...v }));
  const eventi = [{ tipo: "piano", voci: copia(), testo: riempi(T.p_piano, { n: voci.length }) }, { tipo: "approva", testo: T.p_approva }];
  let passi = 0, approvazioni = 1, ripiani = 0;
  for (let i = 0; i < voci.length; i++) {
    const v = voci[i];
    if (v.stato !== "da_fare") continue;
    passi += 1;
    if (fallisce[v.id]) {
      v.stato = "fallito";
      eventi.push({ tipo: "passo", indice: i, esito: "fallito", voci: copia(), testo: riempi(T[`p_fallito_${v.id}`], { n: i + 1 }) });
      v.stato = "tolto";
      const nuove = sostituti[v.id].map((id) => ({ id, testo: testo(id), stato: "da_fare", nuovo: true, approvazione: conApprovazione.has(id) }));
      voci = [...voci.slice(0, i + 1), ...nuove, ...voci.slice(i + 1)];
      ripiani += 1;
      approvazioni += 1;
      eventi.push({ tipo: "ripiano", voci: copia(), testo: riempi(T.p_ripiano, { n: i + 1 }) }, { tipo: "approva", testo: T.p_approva });
      continue;
    }
    v.stato = "fatto";
    if (v.approvazione) approvazioni += 1;
    eventi.push({ tipo: "passo", indice: i, esito: "fatto", voci: copia(), testo: riempi(T.p_ok, { n: i + 1, passo: v.testo }) });
  }
  eventi.push({ tipo: "fine", testo: T.p_fine });
  return { modalita: "piano", eventi, contatori: { passi, approvazioni }, ripiani, esito: { tipo: "ok", testo: ripiani ? T.esito_piano_ripiano : T.esito_piano } };
}

export function pianifica(sc, s) {
  return s.modalita === "react" ? pianificaReact(sc, s) : pianificaPiano(sc, s);
}

/** Valuta la mossa indovinata dallo studente prima di un'azione ReAct. */
export function valutaMossa(sc, mossa, scelta) {
  const m = sc.mosse[mossa];
  if (!m) throw new Error(`mossa sconosciuta: ${mossa}`);
  const opz = m.scelte.find((x) => x.id === scelta);
  if (!opz) throw new Error(`scelta sconosciuta: ${scelta}`);
  return { giusta: opz.giusta, testo: `${opz.giusta ? sc.testi.mossa_giusta : sc.testi.mossa_sbagliata} ${opz.perche}` };
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez) {
  inietta(`stile-${COMP}`, STILE);
  const sc = lez.scenario;
  const E = sc.etichette;
  const tempi = sc.tempi;
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const s = { modalita: "react", imprevisto: "nessuno", guasto_passo3: false, indovina: false, dato_sbagliato: false };
  let piano = null, indice = 0, inRiproduzione = false, generazione = 0, occupato = false, inAttesa = false;
  let velocita = tempi.velocita_iniziale;
  let nodiCarte = [];
  let indovinate = { giuste: 0, totali: 0 };
  const durata = (ms) => (ridotto ? 1 : ms / velocita);

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segModo = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.modalita },
    sc.modalita.map((m) => el("button", { "data-v": m.id, onclick: () => cambia({ modalita: m.id }) }, m.nome)));
  const segImp = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.imprevisto },
    sc.imprevisti.map((m) => el("button", { "data-v": m.id, onclick: () => cambia({ imprevisto: m.id }) }, m.nome)));
  const interruttore = (chiave, etichetta, pericolo) => {
    const input = el("input", { type: "checkbox", onchange: (e) => cambia({ [chiave]: e.target.checked }) });
    return { nodo: el("label", { class: `interruttore ${pericolo ? "pericolo" : ""}` }, el("span", {}, etichetta), input), input };
  };
  const iGuasto = interruttore("guasto_passo3", E.guasto_passo3, true);
  const iIndovina = interruttore("indovina", E.indovina);
  const iSbagliato = interruttore("dato_sbagliato", E.dato_sbagliato, true);
  const avvisoCambio = el("div", { class: "avviso-cambio", "aria-live": "polite" });
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.compito), el("div", { class: "compito" }, sc.compito),
    el("h4", {}, E.modalita), segModo, el("h4", {}, E.imprevisto), segImp, iGuasto.nodo, iIndovina.nodo, iSbagliato.nodo, avvisoCambio);

  // ------------------------------------------------ scena: giro in alto + linea del tempo o lista
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: "0 0 720 92", role: "img", "aria-label": E.descrizione_scena });
  const FASI = [["pensiero", E.giro_pensa, 150], ["azione", E.giro_agisci, 360], ["osservazione", E.giro_osserva, 570]];
  const nodiFase = {};
  svg.append(svgEl("path", { d: "M180,40 H330 M390,40 H540", stroke: "#dbe1ef", "stroke-width": 6, "stroke-linecap": "round", fill: "none" }));
  const ritorno = svgEl("path", { d: "M570,66 C520,96 200,96 150,66", stroke: "#dbe1ef", "stroke-width": 3, "stroke-dasharray": "5 6", fill: "none" });
  svg.append(ritorno);
  for (const [tipo, nome, x] of FASI) {
    const g = svgEl("g", { transform: `translate(${x},40)` });
    const alone = svgEl("circle", { r: 30, fill: COLORE[tipo], opacity: 0 });
    const disco = svgEl("circle", { r: 22, fill: "#fff", stroke: COLORE[tipo], "stroke-width": 3 });
    const ic = svgEl("g", { color: COLORE[tipo] }, ICONE[tipo]);
    const t = svgEl("text", { x: 32, y: 5, "font-size": 14, "font-weight": 800, fill: COLORE[tipo] });
    t.textContent = nome;
    g.append(alone, disco, ic, t);
    svg.append(g);
    nodiFase[tipo] = { g, alone, disco };
  }
  const zona = el("div", {});
  const btnAvvia = el("button", { class: "btn btn-primario", onclick: () => (inRiproduzione ? pausa() : riproduci()) });
  const btnPasso = el("button", { class: "btn", onclick: () => passoSingolo() }, E.passo);
  const btnCapo = el("button", { class: "btn", onclick: () => reimposta() }, E.ricomincia);
  const vel = el("input", { type: "range", min: tempi.velocita_min, max: tempi.velocita_max, step: 0.25, value: velocita, "aria-label": E.velocita, oninput: (e) => { velocita = Number(e.target.value); } });
  scena.append(svg, zona, el("div", { class: "barra-riproduzione" }, btnAvvia, btnPasso, btnCapo, el("label", { class: "velocita" }, E.velocita, vel)));

  // ------------------------------------------------ destra: contatori, domanda, esito
  const destra = el("aside", { class: "pannello destra" });
  const num = { react: { passi: el("div", { class: "num" }), approvazioni: el("div", { class: "num" }) }, piano: { passi: el("div", { class: "num" }), approvazioni: el("div", { class: "num" }) } };
  const contatori = el("div", { class: "contatori" },
    el("span", {}), el("span", { class: "tit" }, E.react_breve), el("span", { class: "tit" }, E.piano_breve),
    el("span", {}, E.passi), num.react.passi, num.piano.passi,
    el("span", {}, E.approvazioni), num.react.approvazioni, num.piano.approvazioni);
  const domandaBox = el("div", {});
  const puntiMosse = el("div", { class: "punti-mosse" });
  const esitoBox = el("div", {});
  destra.append(el("h3", {}, E.contatori), contatori, domandaBox, puntiMosse, el("div", { style: "margin-top:12px" }, esitoBox));

  radice.replaceChildren(el("div", { class: `banco lz-${COMP}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno
  function aggiornaComandi() {
    segModo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.modalita)));
    segImp.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.imprevisto)));
    iGuasto.input.checked = s.guasto_passo3; iIndovina.input.checked = s.indovina; iSbagliato.input.checked = s.dato_sbagliato;
    iGuasto.input.disabled = s.modalita !== "piano";
    iIndovina.input.disabled = s.modalita !== "react";
    iSbagliato.input.disabled = s.modalita !== "react";
    btnAvvia.textContent = inRiproduzione ? E.pausa : E.avvia;
    puntiMosse.textContent = s.modalita === "react" && s.indovina ? riempi(E.punteggio_mosse, indovinate) : "";
  }

  function contaFinora() {
    if (piano.modalita === "react") {
      const fatte = piano.eventi.slice(0, indice).filter((c) => c.tipo === "azione");
      return { passi: fatte.length, approvazioni: fatte.filter((a) => a.approvazione).length };
    }
    let passi = 0, approvazioni = 0;
    for (const ev of piano.eventi.slice(0, indice)) {
      if (ev.tipo === "passo") { passi += 1; if (ev.esito === "fatto" && ev.voci[ev.indice].approvazione) approvazioni += 1; }
      if (ev.tipo === "approva") approvazioni += 1;
    }
    return { passi, approvazioni };
  }

  function aggiornaContatori() {
    const altro = s.modalita === "react" ? "piano" : "react";
    const finale = pianifica(sc, { ...s, modalita: altro }).contatori;
    const mio = contaFinora();
    for (const k of ["passi", "approvazioni"]) {
      num[s.modalita][k].textContent = String(mio[k]);
      num[s.modalita][k].className = "num mio";
      num[altro][k].textContent = String(finale[k]);
      num[altro][k].className = "num";
    }
  }

  function accendiFase(tipo) {
    for (const k of Object.keys(nodiFase)) nodiFase[k].alone.setAttribute("opacity", "0");
    const n = nodiFase[tipo];
    if (!n) return;
    n.alone.animate([{ opacity: 0.35 }, { opacity: 0.12 }], { duration: durata(600), fill: "forwards" });
    n.alone.setAttribute("opacity", "0.12");
    n.disco.animate([{ transform: "scale(1)" }, { transform: "scale(1.15)" }, { transform: "scale(1)" }], { duration: durata(450) });
  }

  function nomeTipo(tipo) {
    return { pensiero: E.pensiero, azione: E.azione, osservazione: E.osservazione, fine: E.pensiero }[tipo];
  }

  function cartaReact(c) {
    const colore = c.allarme ? COLORE.male : COLORE[c.tipo];
    return el("div", { class: `carta ${c.allarme ? "allarme" : ""}`, style: `--c:${colore}` },
      el("div", { class: "testa", html: `<svg viewBox="-16 -16 32 32" style="color:${colore}">${ICONE[c.tipo]}</svg>` }, nomeTipo(c.tipo)),
      el("div", {}, c.tipo === "azione" ? `${c.strumento} · ${c.testo}` : c.testo),
      c.citaTesto ? el("span", { class: "cita" }, `↩ ${c.citaTesto}`) : null,
      c.approvazione ? el("span", { class: "chip-app" }, E.approvazione) : null,
      c.allarme ? el("span", { class: "nota" }, c.nota) : null);
  }

  function disegnaLista(voci, attivo) {
    const ol = el("ol", { class: "lista" }, voci.map((v, i) => el("li", { class: `${v.stato} ${v.nuovo ? "nuovo" : ""} ${i === attivo ? "attivo" : ""}` },
      el("span", { class: "spunta" }, v.stato === "fatto" ? "✓" : v.stato === "fallito" ? "✕" : ""),
      el("span", {}, `${i + 1}. ${v.testo}`),
      el("span", {}, v.nuovo ? el("span", { class: "badge" }, E.nuovo) : null, v.approvazione ? el("span", { class: "badge app" }, E.approvazione) : null))));
    return ol;
  }

  function eseguiEvento(ev) {
    if (piano.modalita === "react") {
      zona.querySelector(".vuoto")?.remove();
      for (const n of nodiCarte) n.classList.remove("citata");
      const nodo = cartaReact(ev);
      linea.append(nodo);
      nodiCarte.push(nodo);
      if (ev.cita !== null && ev.cita !== undefined) nodiCarte[ev.cita].classList.add("citata");
      linea.scrollTop = linea.scrollHeight;
      accendiFase(ev.tipo === "fine" ? "pensiero" : ev.tipo);
      if (ev.tipo === "osservazione") ritorno.animate([{ stroke: COLORE.osservazione }, { stroke: "#dbe1ef" }], { duration: durata(900) });
    } else {
      if (ev.tipo === "piano" || ev.tipo === "ripiano" || ev.tipo === "passo") {
        const lista = disegnaLista(ev.voci, ev.tipo === "passo" ? ev.indice : -1);
        listaBox.replaceChildren(lista);
        accendiFase(ev.tipo === "passo" ? (ev.esito === "fatto" ? "azione" : "osservazione") : "pensiero");
      }
      timbro.replaceChildren(el("span", { html: `<svg viewBox="-16 -16 32 32" style="color:currentColor">${ev.tipo === "approva" ? ICONE.persona : ICONE.fine}</svg>` }), ev.testo);
      timbro.animate([{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: durata(tempi.ms_comparsa) });
    }
    aggiornaContatori();
  }

  // la domanda "indovina la prossima mossa": restituisce una promessa che si risolve quando lo studente continua
  function chiediMossa(ev) {
    const gen = generazione;
    inAttesa = true;
    return new Promise((ok) => {
      const m = sc.mosse[ev.mossa];
      const riscontro = el("div", { class: "riscontro-mossa", "aria-live": "polite" });
      const continua = el("button", { class: "btn btn-primario", style: "display:none", onclick: () => { domandaBox.replaceChildren(); inAttesa = false; ok(gen === generazione); } }, E.continua);
      const bottoni = m.scelte.map((x) => el("button", { class: "btn", onclick: (e) => {
        const r = valutaMossa(sc, ev.mossa, x.id);
        indovinate = { giuste: indovinate.giuste + (r.giusta ? 1 : 0), totali: indovinate.totali + 1 };
        bottoni.forEach((b) => { b.disabled = true; });
        e.currentTarget.classList.add(r.giusta ? "giusta" : "sbagliata");
        riscontro.textContent = r.testo;
        continua.style.display = "";
        aggiornaComandi();
      } }, x.testo));
      domandaBox.replaceChildren(el("div", { class: "domanda-mossa" }, el("b", {}, E.domanda_mossa), bottoni, riscontro, continua));
    });
  }

  function mostraEsito() {
    const e = piano.esito;
    esitoBox.replaceChildren(el("div", { class: `esito-scheda ${e.tipo}`, html: `<svg viewBox="0 0 24 24" style="color:currentColor">${ICONE[e.tipo]}</svg>` },
      el("div", {}, el("div", { style: "font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;opacity:.8" }, E.esito), e.testo)));
  }

  async function prossimo() {
    const ev = piano.eventi[indice];
    if (piano.modalita === "react" && s.indovina && ev.tipo === "azione") {
      if (!(await chiediMossa(ev))) return false;
    }
    indice += 1;
    eseguiEvento(ev);
    return true;
  }

  async function riproduci() {
    if (!piano || inAttesa) return;
    if (indice >= piano.eventi.length) reimposta();
    inRiproduzione = true;
    aggiornaComandi();
    const gen = generazione;
    while (inRiproduzione && gen === generazione && indice < piano.eventi.length) {
      if (!(await prossimo())) return;
      if (indice >= piano.eventi.length) break;
      await attendi(durata(tempi.ms_per_fase));
    }
    if (gen !== generazione) return;
    if (indice >= piano.eventi.length) mostraEsito();
    inRiproduzione = false;
    aggiornaComandi();
  }
  function pausa() { inRiproduzione = false; aggiornaComandi(); }
  async function passoSingolo() {
    if (!piano || occupato || inAttesa) return;
    inRiproduzione = false;
    aggiornaComandi();
    if (indice >= piano.eventi.length) reimposta();
    occupato = true;
    const ok = await prossimo();
    occupato = false;
    if (ok && indice >= piano.eventi.length) mostraEsito();
  }

  let linea = el("div", { class: "linea" });
  const listaBox = el("div", {});
  const timbro = el("div", { class: "timbro", "aria-live": "polite" });

  function reimposta() {
    generazione += 1;
    inRiproduzione = false;
    occupato = false;
    inAttesa = false;
    piano = pianifica(sc, s);
    indice = 0;
    nodiCarte = [];
    indovinate = { giuste: 0, totali: 0 };
    for (const k of Object.keys(nodiFase)) nodiFase[k].alone.setAttribute("opacity", "0");
    linea = el("div", { class: "linea" }, el("div", { class: "vuoto", style: "grid-column:1/-1;color:var(--tenue-2);font-size:.86rem" }, E.vuoto));
    listaBox.replaceChildren(el("div", { class: "vuoto", style: "color:var(--tenue-2);font-size:.86rem;padding:6px" }, E.vuoto));
    timbro.replaceChildren();
    zona.replaceChildren(...(piano.modalita === "react" ? [linea] : [el("h4", { style: "margin:6px 4px" }, E.piano_titolo), listaBox, timbro]));
    ritorno.setAttribute("opacity", piano.modalita === "react" ? "1" : "0.3");
    domandaBox.replaceChildren();
    esitoBox.replaceChildren();
    aggiornaContatori();
    aggiornaComandi();
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    Object.assign(s, stato || {});
    avvisoCambio.textContent = "";
    reimposta();
  }
  function cambia(diff) {
    Object.assign(s, diff);
    avvisoCambio.textContent = E.cambiato;
    reimposta();
    if (!s.indovina || s.modalita !== "react") riproduci();
  }

  reimposta();
  return {
    applica,
    distruggi() { generazione += 1; inRiproduzione = false; },
    _prova: { pianifica: () => pianifica(sc, s), stato: s },
  };
}
