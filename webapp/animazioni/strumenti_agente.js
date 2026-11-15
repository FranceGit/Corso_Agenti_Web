// Lezione interattiva "Gli strumenti dell'agente": lo studente collega, scollega o guasta gli strumenti,
// cambia le regole dell'orchestrazione e guarda la richiesta del modello (una busta) passare dal controllo,
// arrivare allo strumento e tornare con il risultato. Ogni errore e' spiegato. Testi e numeri: dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const STATI = ["collegato", "scollegato", "guasto"];
const GATE = { x: 334, y: 236 };
const MODELLO = { x: 46, y: 160, w: 196, h: 152 };
const CARTA = { x: 512, w: 232, h: 66, y0: 26, passo: 86 };
const COLORE_STATO = { collegato: "#4f46e5", scollegato: "#94a3b8", guasto: "#e11d48" };

const ICONE = {
  database: '<ellipse cx="0" cy="-8" rx="10" ry="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-10,-8 v14 c0,5 20,5 20,0 v-14 M-10,-1 c0,5 20,5 20,0" fill="none" stroke="currentColor" stroke-width="2"/>',
  matita: '<path d="M-9,9 L-7,2 L5,-10 L10,-5 L-2,7 Z M3,-8 L8,-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  globo: '<circle r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-10,0 h20 M0,-10 c-6,6 -6,14 0,20 M0,-10 c6,6 6,14 0,20" fill="none" stroke="currentColor" stroke-width="1.8"/>',
  busta: '<rect x="-11" y="-8" width="22" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-10,-6 L0,2 L10,-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  calendario: '<rect x="-10" y="-8" width="20" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-10,-2 h20 M-5,-11 v5 M5,-11 v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="3" cy="4" r="2" fill="currentColor"/>',
};

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
const attendi = (ms) => new Promise((ok) => setTimeout(ok, ms));
const morbido = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// ------------------------------------------------------------------ logica (pura)

export function pianifica(sc, s) {
  const T = sc.testi;
  const tx = (k, v) => riempi(T[k], v || {});
  const compito = sc.compiti.find((c) => c.id === s.compito);
  if (!compito) throw new Error(`compito sconosciuto: ${s.compito}`);
  const perId = Object.fromEntries(sc.strumenti.map((x) => [x.id, x]));
  const eventi = [];
  const passi = compito.passi.map((p) => ({ scopo: p.scopo, strumento: p.strumento, esito: "saltato" }));
  const spiegazioni = new Set();
  let fermato = false;
  const inventa = s.comportamento === "inventa";

  compito.passi.forEach((passo, i) => {
    if (fermato) return;
    const st = perId[passo.strumento];
    if (!st) throw new Error(`strumento sconosciuto nel compito: ${passo.strumento}`);
    const stato = s.strumenti[st.id];
    if (!STATI.includes(stato)) throw new Error(`stato dello strumento ${st.id} non valido: ${stato}`);
    const chiude = (esito, chiave) => {
      passi[i].esito = esito;
      if (chiave) spiegazioni.add(chiave);
      eventi.push({ tipo: "esito_passo", indice: i, esito });
    };
    const finge = () => {
      eventi.push({ tipo: "agente", testo: tx("agente_inventa", { scopo: passo.scopo }), classe: "falso" });
      chiude("falso", "inventato");
    };
    eventi.push({ tipo: "richiesta", strumento: st.id, chiamata: st.chiamata, testo: tx("richiesta", { chiamata: st.chiamata, scopo: passo.scopo }) });

    if (stato === "scollegato") {
      eventi.push({ tipo: "cancello", esito: "scollegato", testo: tx("cancello_scollegato") });
      if (inventa) return finge();
      if (!passo.obbligatorio) {
        eventi.push({ tipo: "agente", testo: tx("agente_facoltativo", { senza: passo.senza }) });
        return chiude("limitato", "facoltativo");
      }
      eventi.push({ tipo: "agente", testo: tx("agente_manca", { scopo: passo.scopo, nome: st.nome }), classe: "errore" });
      chiude("no", "scollegato");
      eventi.push({ tipo: "agente", testo: tx("agente_fermo") });
      fermato = true;
      return;
    }
    if (st.scrive && !s.permesso_scrittura) {
      eventi.push({ tipo: "cancello", esito: "negato", testo: tx("cancello_negato") });
      if (inventa) return finge();
      eventi.push({ tipo: "agente", testo: tx("agente_negato") });
      chiude("approvazione", "negato");
      fermato = true;
      return;
    }
    const tentativi = stato === "guasto" && !inventa ? sc.tentativi_su_guasto : 1;
    for (let k = 1; k <= tentativi; k++) {
      if (k > 1) eventi.push({ tipo: "richiesta", strumento: st.id, chiamata: st.chiamata, testo: tx("richiesta", { chiamata: st.chiamata, scopo: passo.scopo }) });
      eventi.push({ tipo: "cancello", esito: "ok", testo: tx("cancello_ok") });
      eventi.push({ tipo: "esecuzione", strumento: st.id, guasto: stato === "guasto" });
      if (stato === "guasto") {
        eventi.push({ tipo: "risultato", strumento: st.id, testo: `${st.nome}: ${T.risposta_guasto}`, classe: "errore" });
        if (k < tentativi) eventi.push({ tipo: "agente", testo: tx("agente_riprovo") });
      } else {
        eventi.push({ tipo: "risultato", strumento: st.id, testo: `${st.nome}: ${st.risultato}` });
      }
    }
    if (stato === "guasto") {
      if (inventa) return finge();
      if (!passo.obbligatorio) {
        eventi.push({ tipo: "agente", testo: tx("agente_facoltativo", { senza: passo.senza }) });
        spiegazioni.add("guasto");
        return chiude("limitato", "facoltativo");
      }
      eventi.push({ tipo: "agente", testo: tx("agente_guasto", { scopo: passo.scopo }), classe: "errore" });
      chiude("no", "guasto");
      fermato = true;
      return;
    }
    eventi.push({ tipo: "agente", testo: tx("agente_ok") });
    chiude("ok", null);
  });

  const esiti = passi.map((p) => p.esito);
  let finale;
  if (esiti.includes("falso")) finale = "falso";
  else if (esiti.includes("no")) finale = "parziale";
  else if (esiti.includes("approvazione")) finale = "approvazione";
  else if (esiti.includes("limitato")) finale = "limitato";
  else finale = "ok";
  if (finale === "ok") spiegazioni.add("ok");
  return { eventi, passi, finale, spiegazioni: [...spiegazioni], compito };
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const tempi = sc.tempi;
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const s = {
    compito: sc.compiti[0].id,
    strumenti: Object.fromEntries(sc.strumenti.map((x) => [x.id, "scollegato"])),
    permesso_scrittura: true,
    comportamento: "onesto",
  };
  let piano = null;
  let indice = 0;
  let inRiproduzione = false;
  let generazione = 0;
  let velocita = tempi.velocita_iniziale;
  const durata = (ms) => (ridotto ? 1 : ms / velocita);

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segCompito = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.compito });
  sc.compiti.forEach((c) => segCompito.append(el("button", { "data-v": c.id, onclick: () => cambia(() => { s.compito = c.id; }) }, c.nome)));
  const frase = el("div", { style: "font-size:.8rem;color:var(--tenue);margin:6px 2px 0" });
  const righeStrumenti = {};
  const listaStrumenti = el("div", { style: "display:grid;gap:8px" });
  sc.strumenti.forEach((st) => {
    const seg = el("div", { class: "segmentato", role: "group", "aria-label": st.nome },
      STATI.map((k) => el("button", { "data-v": k, style: "font-size:.72rem;padding:.3em .4em", onclick: () => cambia(() => { s.strumenti[st.id] = k; }) }, E[k])));
    righeStrumenti[st.id] = seg;
    listaStrumenti.append(el("div", {},
      el("div", { style: "display:flex;align-items:center;gap:6px;font-size:.82rem;font-weight:600;margin-bottom:3px" },
        el("span", { html: `<svg viewBox="-12 -12 24 24" width="16" height="16" style="color:#475569">${ICONE[st.icona]}</svg>` }), st.nome,
        el("span", { style: `margin-left:auto;font-size:.68rem;font-weight:800;color:${st.scrive ? "#b45309" : "#0369a1"}` }, st.scrive ? E.scrive : E.legge)),
      seg));
  });
  const iPermesso = el("input", { type: "checkbox", onchange: (e) => cambia(() => { s.permesso_scrittura = e.target.checked; }) });
  const segComp = el("div", { class: "segmentato", role: "group", "aria-label": E.comportamento },
    ["onesto", "inventa"].map((k) => el("button", { "data-v": k, onclick: () => cambia(() => { s.comportamento = k; }) }, E[k])));
  const avvisoCambio = el("div", { class: "avviso-cambio", "aria-live": "polite" });
  comandi.append(
    el("h4", {}, E.compito), segCompito, frase,
    el("h4", {}, E.strumenti), listaStrumenti,
    el("h4", {}, E.regole),
    el("label", { class: "interruttore" }, el("span", {}, E.permesso_scrittura), iPermesso),
    el("div", { style: "font-size:.8rem;color:var(--tenue);margin:6px 0 4px" }, E.comportamento), segComp,
    avvisoCambio);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: "0 0 760 470", role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs>
      <linearGradient id="sa-modello" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#7c3aed"/></linearGradient>
      <filter id="sa-ombra" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#17203b" flood-opacity=".14"/></filter>
      <filter id="sa-bagliore" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>`;
  // cornice dell'orchestrazione
  const cornice = svgEl("rect", { x: 16, y: 34, width: 318, height: 412, rx: 24, fill: "#f6f4ff", stroke: "#c4b5fd", "stroke-width": 2, "stroke-dasharray": "7 6" });
  svg.append(cornice);
  const [o1, o2] = E.orchestrazione.split(":");
  const tOrch = svgEl("text", { x: 36, y: 62, "font-size": 12.5, "font-weight": 900, fill: "#6d28d9", "letter-spacing": ".6" });
  tOrch.textContent = o1;
  const tOrch2 = svgEl("text", { x: 36, y: 79, "font-size": 11, fill: "#7c3aed" });
  tOrch2.textContent = (o2 || "").trim();
  svg.append(tOrch, tOrch2);

  // modello con rete neurale stilizzata
  const gModello = svgEl("g", { filter: "url(#sa-ombra)" });
  const boxModello = svgEl("rect", { x: MODELLO.x, y: MODELLO.y, width: MODELLO.w, height: MODELLO.h, rx: 22, fill: "url(#sa-modello)", stroke: "transparent", "stroke-width": 4 });
  gModello.append(boxModello);
  const rete = svgEl("g", { opacity: ".55" });
  const nodiRete = [];
  for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) nodiRete.push({ x: MODELLO.x + 34 + c * 42, y: MODELLO.y + 30 + r * 22, c });
  for (const a of nodiRete) for (const b of nodiRete) if (b.c === a.c + 1) rete.append(svgEl("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: "#c7d2fe", "stroke-width": 0.8 }));
  const pallini = nodiRete.map((n) => { const c = svgEl("circle", { cx: n.x, cy: n.y, r: 3.6, fill: "#e0e7ff" }); rete.append(c); return c; });
  gModello.append(rete);
  const tMod = svgEl("text", { x: MODELLO.x + MODELLO.w / 2, y: MODELLO.y + 112, "text-anchor": "middle", "font-size": 17, "font-weight": 900, fill: "#fff", "letter-spacing": "1.5" });
  tMod.textContent = E.modello;
  const tMod2 = svgEl("text", { x: MODELLO.x + MODELLO.w / 2, y: MODELLO.y + 132, "text-anchor": "middle", "font-size": 11, fill: "#e0e7ff" });
  tMod2.textContent = E.modello_sotto;
  gModello.append(tMod, tMod2);
  const timbro = svgEl("g", { opacity: 0, transform: `translate(${MODELLO.x + MODELLO.w / 2},${MODELLO.y - 14}) rotate(-6)` });
  timbro.append(svgEl("rect", { x: -92, y: -15, width: 184, height: 30, rx: 6, fill: "#fff", stroke: "#e11d48", "stroke-width": 3 }));
  const tTimbro = svgEl("text", { y: 6, "text-anchor": "middle", "font-size": 14, "font-weight": 900, fill: "#e11d48", "letter-spacing": "1" });
  tTimbro.textContent = T.esito_falso;
  timbro.append(tTimbro);
  svg.append(gModello, timbro);
  pallini.forEach((p, i) => p.animate([{ opacity: 0.4 }, { opacity: 1 }, { opacity: 0.4 }], { duration: 1800 + (i % 5) * 260, iterations: Infinity, delay: i * 90 }));

  // condotto modello -> controllo
  svg.append(svgEl("path", { d: `M${MODELLO.x + MODELLO.w},${GATE.y} L${GATE.x - 24},${GATE.y}`, stroke: "#c4b5fd", "stroke-width": 3, "stroke-dasharray": "4 5" }));

  // cavi e carte degli strumenti
  const gCavi = svgEl("g");
  const gCarte = svgEl("g");
  const CARTE = {};
  sc.strumenti.forEach((st, i) => {
    const cy = CARTA.y0 + i * CARTA.passo + CARTA.h / 2;
    const presa = { x: CARTA.x, y: cy };
    const dCollegato = `M${GATE.x + 24},${GATE.y} C${GATE.x + 96},${GATE.y} ${CARTA.x - 90},${cy} ${presa.x},${cy}`;
    const dStaccato = `M${GATE.x + 24},${GATE.y} C${GATE.x + 70},${GATE.y} ${GATE.x + 80},${cy + 46} ${GATE.x + 112},${cy + 40}`;
    const cavo = svgEl("path", { d: dCollegato, fill: "none", "stroke-width": 3.2, "stroke-linecap": "round" });
    const flusso = svgEl("path", { d: dCollegato, fill: "none", stroke: "#a5b4fc", "stroke-width": 3.2, "stroke-dasharray": "3 14", "stroke-linecap": "round" });
    const spina = svgEl("g", {}, '<rect x="-6" y="-7" width="14" height="14" rx="3" fill="#94a3b8"/><path d="M8,-4 h6 M8,4 h6" stroke="#94a3b8" stroke-width="2.4" stroke-linecap="round"/>');
    gCavi.append(cavo, flusso, spina);
    const g = svgEl("g", { transform: `translate(${CARTA.x},${CARTA.y0 + i * CARTA.passo})`, style: "cursor:pointer", tabindex: "0", role: "button" });
    const box = svgEl("rect", { x: 0, y: 0, width: CARTA.w, height: CARTA.h, rx: 14, fill: "#fff", stroke: "#dde3f0", "stroke-width": 1.5, filter: "url(#sa-ombra)" });
    const foro = svgEl("circle", { cx: 0, cy: CARTA.h / 2, r: 6.5, fill: "#fff", stroke: "#94a3b8", "stroke-width": 2.4 });
    const ic = svgEl("g", { transform: `translate(26,${CARTA.h / 2})`, color: "#475569" }, ICONE[st.icona]);
    const nome = svgEl("text", { x: 48, y: 27, "font-size": 13.5, "font-weight": 700, fill: "#17203b" });
    nome.textContent = st.nome;
    const desc = svgEl("text", { x: 48, y: 45, "font-size": 10.5, fill: "#64748b" });
    desc.textContent = st.descrizione;
    const tipo = svgEl("text", { x: 48, y: 59, "font-size": 9.5, "font-weight": 800, fill: st.scrive ? "#b45309" : "#0369a1" });
    tipo.textContent = (st.scrive ? E.scrive : E.legge).toUpperCase();
    const badge = svgEl("g", { transform: `translate(${CARTA.w - 12},14)` });
    const badgeBox = svgEl("rect", { x: -78, y: -9, width: 78, height: 18, rx: 9 });
    const badgeTesto = svgEl("text", { x: -39, y: 4, "text-anchor": "middle", "font-size": 9.5, "font-weight": 800, fill: "#fff" });
    badge.append(badgeBox, badgeTesto);
    const scintilla = svgEl("g", { transform: `translate(-14,${CARTA.h / 2})`, opacity: 0 }, '<path d="M-6,-10 L2,-2 L-3,0 L5,10" fill="none" stroke="#e11d48" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>');
    g.append(box, foro, ic, nome, desc, tipo, badge, scintilla);
    const ruota = () => cambia(() => { s.strumenti[st.id] = STATI[(STATI.indexOf(s.strumenti[st.id]) + 1) % STATI.length]; });
    g.addEventListener("click", ruota);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ruota(); } });
    gCarte.append(g);
    CARTE[st.id] = { g, box, foro, ic, badgeBox, badgeTesto, scintilla, cavo, flusso, spina, dCollegato, dStaccato, cy, y: CARTA.y0 + i * CARTA.passo };
  });
  svg.append(gCavi, gCarte);

  // controllo (cancello)
  const gGate = svgEl("g", { transform: `translate(${GATE.x},${GATE.y})` });
  const gateDisco = svgEl("circle", { r: 24, fill: "#fff", stroke: "#a78bfa", "stroke-width": 3, filter: "url(#sa-ombra)" });
  const gateIcona = svgEl("g", { color: "#7c3aed" }, '<path d="M0,-12 L10,-8 V-1 C10,6 5,10 0,12 C-5,10 -10,6 -10,-1 V-8 Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>');
  const gateSegno = svgEl("g", {});
  const gateTesto = svgEl("text", { y: 42, "text-anchor": "middle", "font-size": 10.5, "font-weight": 800, fill: "#6d28d9" });
  gateTesto.textContent = E.cancello;
  const lucchetto = svgEl("g", { transform: "translate(18,-20)", opacity: 0 }, '<circle r="10" fill="#f59e0b"/><rect x="-5" y="-1" width="10" height="8" rx="1.5" fill="#fff"/><path d="M-3,-1 v-3 a3,3 0 0,1 6,0 v3" fill="none" stroke="#fff" stroke-width="1.8"/>');
  gGate.append(gateDisco, gateIcona, gateSegno, gateTesto, lucchetto);
  svg.append(gGate);
  const fumetto = svgEl("g", { opacity: 0 });
  const fumettoBox = svgEl("rect", { rx: 10, fill: "#17203b" });
  const fumettoTesto = svgEl("text", { "font-size": 11, fill: "#fff", "font-weight": 600 });
  fumetto.append(fumettoBox, fumettoTesto);
  svg.append(fumetto);

  // busta e risposta
  const busta = svgEl("g", { opacity: 0, filter: "url(#sa-bagliore)" });
  busta.append(svgEl("rect", { x: -15, y: -10, width: 30, height: 20, rx: 4, fill: "#fff", stroke: "#4f46e5", "stroke-width": 2.2 }),
    svgEl("path", { d: "M-13,-8 L0,2 L13,-8", fill: "none", stroke: "#4f46e5", "stroke-width": 2.2, "stroke-linejoin": "round" }));
  const etichettaBusta = svgEl("text", { y: -18, "text-anchor": "middle", "font-size": 10.5, "font-family": "Consolas, monospace", "font-weight": 700, fill: "#3730a3" });
  busta.append(etichettaBusta);
  const risposta = svgEl("g", { opacity: 0, filter: "url(#sa-bagliore)" });
  const rispostaBox = svgEl("rect", { x: -16, y: -11, width: 32, height: 22, rx: 11 });
  const rispostaSegno = svgEl("path", { fill: "none", stroke: "#fff", "stroke-width": 2.6, "stroke-linecap": "round", "stroke-linejoin": "round" });
  risposta.append(rispostaBox, rispostaSegno);
  svg.append(busta, risposta);

  const btnAvvia = el("button", { class: "btn btn-primario", onclick: () => (inRiproduzione ? pausa() : riproduci()) });
  const btnPasso = el("button", { class: "btn", onclick: () => passoSingolo() }, E.passo);
  const btnCapo = el("button", { class: "btn", onclick: () => reimposta() }, E.ricomincia);
  const vel = el("input", { type: "range", min: tempi.velocita_min, max: tempi.velocita_max, step: 0.25, value: velocita, "aria-label": E.velocita, oninput: (e) => { velocita = Number(e.target.value); } });
  scena.append(svg, el("div", { class: "barra-riproduzione" }, btnAvvia, btnPasso, btnCapo, el("label", { class: "velocita" }, E.velocita, vel)));

  // ------------------------------------------------ registro ed esito
  const destra = el("aside", { class: "pannello destra" });
  const registro = el("div", { class: "diario", "aria-live": "polite" });
  const listaEsiti = el("div", { style: "display:grid;gap:6px" });
  const finaleBox = el("div", {});
  destra.append(el("h3", {}, E.conversazione), registro, el("h3", { style: "margin-top:14px" }, E.esito), listaEsiti, el("div", { style: "margin-top:10px" }, finaleBox));
  radice.replaceChildren(el("div", { class: "banco" }, comandi, scena, destra));

  // ------------------------------------------------ disegno dello stato
  function disegnaStrumenti() {
    for (const st of sc.strumenti) {
      const C = CARTE[st.id];
      const stato = s.strumenti[st.id];
      C.badgeBox.setAttribute("fill", COLORE_STATO[stato]);
      C.badgeTesto.textContent = E[stato].toUpperCase();
      C.box.setAttribute("fill", stato === "scollegato" ? "#f8fafc" : "#fff");
      C.g.setAttribute("opacity", stato === "scollegato" ? "0.75" : "1");
      C.scintilla.setAttribute("opacity", stato === "guasto" ? "1" : "0");
      if (stato === "scollegato") {
        C.cavo.setAttribute("d", C.dStaccato);
        C.cavo.setAttribute("stroke", "#cbd5e1");
        C.cavo.setAttribute("stroke-dasharray", "none");
        C.flusso.setAttribute("opacity", "0");
        C.spina.setAttribute("opacity", "1");
        C.spina.setAttribute("transform", `translate(${GATE.x + 112},${C.cy + 40}) rotate(-8)`);
        C.foro.setAttribute("fill", "#fff");
        C.foro.setAttribute("stroke", "#94a3b8");
      } else {
        C.cavo.setAttribute("d", C.dCollegato);
        C.cavo.setAttribute("stroke", stato === "guasto" ? "#fda4af" : "#818cf8");
        C.cavo.setAttribute("stroke-dasharray", stato === "guasto" ? "8 6" : "none");
        C.flusso.setAttribute("opacity", stato === "guasto" ? "0" : "1");
        C.spina.setAttribute("opacity", "0");
        C.foro.setAttribute("fill", COLORE_STATO[stato]);
        C.foro.setAttribute("stroke", COLORE_STATO[stato]);
      }
    }
    lucchetto.setAttribute("opacity", s.permesso_scrittura ? "0" : "1");
  }

  // flusso continuo lungo i cavi collegati
  const animFlusso = Object.values(CARTE).map((C) => C.flusso.animate([{ strokeDashoffset: 34 }, { strokeDashoffset: 0 }], { duration: 900, iterations: Infinity }));

  function aggiornaComandi() {
    segCompito.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.compito)));
    const c = sc.compiti.find((x) => x.id === s.compito);
    frase.textContent = c.frase;
    for (const [id, seg] of Object.entries(righeStrumenti)) seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.strumenti[id])));
    iPermesso.checked = s.permesso_scrittura;
    segComp.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.comportamento)));
    btnAvvia.textContent = inRiproduzione ? E.pausa : E.avvia;
    disegnaStrumenti();
  }

  function cambia(mutazione) {
    mutazione();
    reimposta();
    avvisoCambio.textContent = E.cambiato;
  }

  // ------------------------------------------------ animazione
  function tween(ms, passo) {
    const gen = generazione;
    return new Promise((ok) => {
      const t0 = performance.now();
      const frame = (ora) => {
        if (gen !== generazione) return ok(false);
        const x = Math.min(1, (ora - t0) / ms);
        passo(morbido(x));
        if (x < 1) requestAnimationFrame(frame); else ok(true);
      };
      requestAnimationFrame(frame);
    });
  }

  function mostraFumetto(testo, colore) {
    fumettoTesto.textContent = testo;
    fumettoBox.setAttribute("fill", colore);
    const larg = Math.min(300, testo.length * 6.1 + 22);
    const x = GATE.x - larg / 2, y = GATE.y - 70;
    fumettoBox.setAttribute("x", x); fumettoBox.setAttribute("y", y); fumettoBox.setAttribute("width", larg); fumettoBox.setAttribute("height", 26);
    fumettoTesto.setAttribute("x", x + 11); fumettoTesto.setAttribute("y", y + 17);
    fumetto.setAttribute("opacity", "1");
    fumetto.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: durata(260) });
  }

  function segnoCancello(esito) {
    const forme = {
      ok: ['<circle r="24" fill="#16a34a"/><path d="M-9,1 L-3,7 L9,-6" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>', "#16a34a"],
      scollegato: ['<circle r="24" fill="#64748b"/><path d="M-8,-8 L8,8 M8,-8 L-8,8" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>', "#64748b"],
      negato: ['<circle r="24" fill="#f59e0b"/><rect x="-7" y="-2" width="14" height="11" rx="2" fill="#fff"/><path d="M-4,-2 v-4 a4,4 0 0,1 8,0 v4" fill="none" stroke="#fff" stroke-width="2.4"/>', "#d97706"],
    };
    const [html, colore] = forme[esito];
    gateSegno.innerHTML = html;
    gateSegno.animate([{ transform: "scale(.4)", opacity: 0 }, { transform: "scale(1)", opacity: 1 }], { duration: durata(300), easing: "cubic-bezier(.3,1.6,.5,1)" });
    return colore;
  }

  async function bustaVerso(daX, daY, aX, aY, ms) {
    return tween(ms, (x) => busta.setAttribute("transform", `translate(${daX + (aX - daX) * x},${daY + (aY - daY) * x})`));
  }

  async function lungoCavo(C, avanti, nodo) {
    const percorso = C.cavo;
    const L = percorso.getTotalLength();
    return tween(durata(tempi.ms_tratto), (x) => {
      const p = percorso.getPointAtLength(L * (avanti ? x : 1 - x));
      nodo.setAttribute("transform", `translate(${p.x},${p.y})`);
    });
  }

  function voceRegistro(chi, colore, testo, classe) {
    const v = el("div", { class: `voce-diario ${classe || ""}` },
      el("div", { class: "chip", style: `background:${colore}` }, chi.slice(0, 1)),
      el("div", {}, el("div", { class: "chi", style: `color:${colore}` }, chi), el("div", { class: "testo" }, testo)));
    const vuoto = registro.querySelector(".vuoto");
    if (vuoto) vuoto.remove();
    registro.append(v);
    registro.scrollTop = registro.scrollHeight;
  }

  const ICONA_ESITO = {
    ok: ["#16a34a", "M5 12.5l4.2 4.2L19 7"],
    limitato: ["#d97706", "M12 7v6M12 16.5v.5"],
    approvazione: ["#d97706", "M12 7v5l3 2"],
    no: ["#e11d48", "M6 6l12 12M18 6L6 18"],
    falso: ["#e11d48", "M12 6v8M12 17.5v.5"],
    saltato: ["#94a3b8", "M6 12h12"],
  };
  const TESTO_ESITO = { ok: "esito_ok", limitato: "esito_limitato", approvazione: "esito_approvazione", no: "esito_no", falso: "esito_falso", saltato: "esito_saltato" };

  function disegnaEsiti(finoA) {
    listaEsiti.replaceChildren(...piano.passi.map((p, i) => {
      const noto = i < finoA.length ? finoA[i] : null;
      const [colore, d] = noto ? ICONA_ESITO[noto] : ["#cbd5e1", "M12 12h.01"];
      return el("div", { style: "display:grid;grid-template-columns:22px 1fr;gap:8px;font-size:.84rem;align-items:start" },
        el("span", { html: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${colore}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke-width="1.6" opacity=".35"/><path d="${d}"/></svg>` }),
        el("div", {}, p.scopo, noto ? el("div", { style: `font-size:.72rem;font-weight:800;color:${colore};text-transform:uppercase;letter-spacing:.05em` }, T[TESTO_ESITO[noto]]) : null));
    }));
  }

  const noti = [];
  function mostraFinale() {
    const tipi = { ok: "ok", limitato: "avviso", approvazione: "avviso", parziale: "male", falso: "male" };
    const testi = { ok: T.finale_ok, limitato: T.finale_limitato, approvazione: T.finale_approvazione, parziale: T.finale_parziale, falso: T.finale_falso };
    finaleBox.replaceChildren(el("div", { class: `esito-scheda ${tipi[piano.finale]}` },
      el("div", {}, el("div", {}, testi[piano.finale]),
        piano.finale === "ok" ? el("div", { style: "font-weight:500;margin-top:4px" }, piano.compito.riuscito) : null,
        el("div", { style: "margin-top:8px;font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;opacity:.8" }, E.perche),
        piano.spiegazioni.map((k) => el("p", { style: "font-weight:500;margin:4px 0 0" }, sc.spiegazioni[k])))));
    if (piano.finale === "falso") {
      timbro.setAttribute("opacity", "1");
      timbro.animate([{ opacity: 0, transform: `translate(${MODELLO.x + MODELLO.w / 2}px,${MODELLO.y - 14}px) rotate(-6deg) scale(2)` }, { opacity: 1, transform: `translate(${MODELLO.x + MODELLO.w / 2}px,${MODELLO.y - 14}px) rotate(-6deg) scale(1)` }], { duration: durata(380), easing: "cubic-bezier(.3,1.4,.5,1)" });
    }
  }

  async function eseguiEvento(ev) {
    const gen = generazione;
    const C = ev.strumento ? CARTE[ev.strumento] : null;
    if (ev.strumento && !C) throw new Error(`strumento sconosciuto: ${ev.strumento}`);
    switch (ev.tipo) {
      case "richiesta": {
        gateSegno.innerHTML = "";
        fumetto.setAttribute("opacity", "0");
        etichettaBusta.textContent = ev.chiamata.length > 34 ? ev.chiamata.slice(0, 32) + "…" : ev.chiamata;
        busta.setAttribute("opacity", "1");
        boxModello.setAttribute("stroke", "#a5b4fc");
        voceRegistro(E.chi_modello, "#6366f1", ev.testo);
        const ok = await bustaVerso(MODELLO.x + MODELLO.w - 10, GATE.y, GATE.x - 34, GATE.y, durata(tempi.ms_tratto));
        boxModello.setAttribute("stroke", "transparent");
        return ok;
      }
      case "cancello": {
        const colore = segnoCancello(ev.esito);
        mostraFumetto(ev.testo, colore);
        voceRegistro(E.chi_orchestrazione, "#7c3aed", ev.testo, ev.esito === "ok" ? "" : "errore");
        if (ev.esito !== "ok") {
          busta.animate([{ transform: `translate(${GATE.x - 34}px,${GATE.y}px)` }, { transform: `translate(${GATE.x - 44}px,${GATE.y}px)` }, { transform: `translate(${GATE.x - 26}px,${GATE.y}px)` }, { transform: `translate(${GATE.x - 34}px,${GATE.y}px)` }], { duration: durata(360) });
          await attendi(durata(380));
          if (gen !== generazione) return false;
          const ok = await tween(durata(tempi.ms_tratto * 0.8), (x) => {
            busta.setAttribute("transform", `translate(${GATE.x - 34 - (GATE.x - 34 - (MODELLO.x + MODELLO.w - 10)) * x},${GATE.y})`);
            busta.setAttribute("opacity", String(1 - x * 0.9));
          });
          busta.setAttribute("opacity", "0");
          return ok;
        }
        return true;
      }
      case "esecuzione": {
        busta.setAttribute("opacity", "1");
        const ok = await lungoCavo(C, true, busta);
        if (!ok) return false;
        busta.setAttribute("opacity", "0");
        C.box.setAttribute("stroke", ev.guasto ? "#e11d48" : "#4f46e5");
        C.box.setAttribute("stroke-width", "3");
        const tx = `translate(${CARTA.x}px,${C.y}px)`;
        C.g.animate(ev.guasto
          ? [{ transform: tx }, { transform: `translate(${CARTA.x + 6}px,${C.y}px)` }, { transform: `translate(${CARTA.x - 5}px,${C.y}px)` }, { transform: tx }]
          : [{ transform: `${tx} scale(1)` }, { transform: `${tx} scale(1.04)` }, { transform: `${tx} scale(1)` }], { duration: durata(420) });
        await attendi(durata(300));
        C.box.setAttribute("stroke", "#dde3f0");
        C.box.setAttribute("stroke-width", "1.5");
        return gen === generazione;
      }
      case "risultato": {
        const errore = ev.classe === "errore";
        rispostaBox.setAttribute("fill", errore ? "#e11d48" : "#16a34a");
        rispostaSegno.setAttribute("d", errore ? "M0,-6 v6 M0,5 v.5" : "M-6,0 L-2,4 L6,-4");
        risposta.setAttribute("opacity", "1");
        voceRegistro(ev.testo.split(":")[0], errore ? "#e11d48" : "#0891b2", ev.testo.slice(ev.testo.indexOf(":") + 1).trim(), errore ? "errore" : "");
        let ok = await lungoCavo(C, false, risposta);
        if (!ok) return false;
        ok = await tween(durata(tempi.ms_tratto * 0.7), (x) => {
          const da = GATE.x + 24, a = MODELLO.x + MODELLO.w - 10;
          risposta.setAttribute("transform", `translate(${da + (a - da) * x},${GATE.y})`);
        });
        risposta.setAttribute("opacity", "0");
        return ok;
      }
      case "agente": {
        voceRegistro(E.chi_modello, ev.classe === "falso" ? "#e11d48" : "#6366f1", ev.testo, ev.classe || "");
        boxModello.setAttribute("stroke", ev.classe === "falso" ? "#e11d48" : ev.classe === "errore" ? "#f59e0b" : "#a5b4fc");
        gModello.animate([{ transform: "scale(1)" }, { transform: "scale(1.02)" }, { transform: "scale(1)" }], { duration: durata(400) });
        await attendi(durata(250));
        boxModello.setAttribute("stroke", "transparent");
        return gen === generazione;
      }
      case "esito_passo": {
        noti[ev.indice] = ev.esito;
        disegnaEsiti(noti);
        return true;
      }
      default:
        throw new Error(`tipo di evento sconosciuto: ${ev.tipo}`);
    }
  }

  async function riproduci() {
    if (!piano) return;
    if (indice >= piano.eventi.length) reimposta();
    avvisoCambio.textContent = "";
    inRiproduzione = true;
    aggiornaComandi();
    const gen = generazione;
    while (inRiproduzione && gen === generazione && indice < piano.eventi.length) {
      const ev = piano.eventi[indice];
      indice += 1;
      if (!(await eseguiEvento(ev))) return;
      if (ev.tipo !== "esito_passo") await attendi(durata(tempi.ms_pausa));
    }
    if (gen !== generazione) return;
    if (indice >= piano.eventi.length) mostraFinale();
    inRiproduzione = false;
    aggiornaComandi();
  }

  function pausa() { inRiproduzione = false; aggiornaComandi(); }

  let occupato = false;
  async function passoSingolo() {
    if (!piano || occupato) return;
    inRiproduzione = false;
    aggiornaComandi();
    if (indice >= piano.eventi.length) reimposta();
    occupato = true;
    let ok = true;
    // un "passo" = fino al prossimo evento visibile (gli esiti dei passi si aggiornano insieme)
    do {
      const ev = piano.eventi[indice];
      indice += 1;
      ok = await eseguiEvento(ev);
    } while (ok && indice < piano.eventi.length && piano.eventi[indice].tipo === "esito_passo");
    occupato = false;
    if (ok && indice >= piano.eventi.length) mostraFinale();
  }

  function reimposta() {
    generazione += 1;
    inRiproduzione = false;
    occupato = false;
    piano = pianifica(sc, s);
    indice = 0;
    noti.length = 0;
    busta.setAttribute("opacity", "0");
    risposta.setAttribute("opacity", "0");
    fumetto.setAttribute("opacity", "0");
    timbro.setAttribute("opacity", "0");
    gateSegno.innerHTML = "";
    boxModello.setAttribute("stroke", "transparent");
    registro.replaceChildren(el("div", { class: "vuoto" }, E.vuoto));
    finaleBox.replaceChildren();
    disegnaEsiti([]);
    aggiornaComandi();
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    if (stato && stato.strumenti) {
      for (const id of Object.keys(s.strumenti)) if (!(id in stato.strumenti)) throw new Error(`stato_animazione.strumenti: manca «${id}»`);
    }
    Object.assign(s, JSON.parse(JSON.stringify(stato || {})));
    avvisoCambio.textContent = "";
    reimposta();
  }

  reimposta();
  return {
    applica,
    distruggi() { generazione += 1; inRiproduzione = false; animFlusso.forEach((a) => a.cancel()); },
    _prova: { pianifica: () => pianifica(sc, s), stato: s },
  };
}
