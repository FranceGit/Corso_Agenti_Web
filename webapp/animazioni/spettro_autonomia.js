// Lezione interattiva "Lo spettro dell'autonomia": un cursore a 5 tacche trasforma lo stesso processo CRM
// da regole fisse a piu' agenti che collaborano; quattro indicatori mostrano il prezzo dell'autonomia.
// Gioco finale: lo studente assegna ogni scenario alla tacca minima che lo risolve e riceve un riscontro motivato.
// Tutti i testi e i numeri arrivano dallo scenario della lezione (API protetta).

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "spettro_autonomia";
const COLORE_IND = { flessibilita: "#0ea5e9", prevedibilita: "#10b981", costo: "#f59e0b", rischio: "#e11d48" };
const COLORE_ESITO = { giusto: "ok", troppo: "avviso", poco: "male" };

const STILE = `
.lz-spettro_autonomia .tacche { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; padding: 8px 6px 4px; position: relative; }
.lz-spettro_autonomia .tacche::before { content: ""; position: absolute; left: 10%; right: 10%; top: 26px; height: 6px; border-radius: 999px;
  background: linear-gradient(90deg, #94a3b8, #8b5cf6 50%, #e11d48); opacity: .35; }
.lz-spettro_autonomia .tacca { position: relative; border: 0; background: transparent; display: grid; justify-items: center; gap: 4px; padding: 4px 2px 6px; border-radius: 12px; min-height: 92px; align-content: start; transition: background .2s; }
.lz-spettro_autonomia .tacca:hover, .lz-spettro_autonomia .tacca.sopra { background: var(--primario-chiaro); }
.lz-spettro_autonomia .tacca .bollo { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; font-weight: 800; font-size: .85rem;
  background: #fff; border: 3px solid #cbd5e1; color: var(--tenue); position: relative; z-index: 1; transition: transform .25s, border-color .25s, background .25s, color .25s; }
.lz-spettro_autonomia .tacca[aria-pressed="true"] .bollo { background: var(--primario); border-color: var(--primario); color: #fff; transform: scale(1.18); box-shadow: 0 4px 14px rgba(79,70,229,.35); }
.lz-spettro_autonomia .tacca .nome { font-size: .74rem; font-weight: 700; color: var(--inchiostro); text-align: center; line-height: 1.2; }
.lz-spettro_autonomia .tacca .posati { display: flex; flex-wrap: wrap; gap: 3px; justify-content: center; }
.lz-spettro_autonomia .tacca .posati span { font-size: .64rem; font-weight: 700; padding: .1em .45em; border-radius: 999px; background: #fff; border: 1px solid var(--bordo); }
.lz-spettro_autonomia .tacca .posati span.giusto { border-color: #86efac; background: var(--ok-chiaro); color: #166534; }
.lz-spettro_autonomia .tacca .posati span.troppo { border-color: #fcd34d; background: var(--avviso-chiaro); color: #92400e; }
.lz-spettro_autonomia .tacca .posati span.poco { border-color: #fda4af; background: var(--male-chiaro); color: #9f1239; }
.lz-spettro_autonomia .tacche.attesa .tacca .bollo { animation: lz-sa-invito 1.4s ease-in-out infinite; }
@keyframes lz-sa-invito { 0%,100% { box-shadow: 0 0 0 0 rgba(79,70,229,.0); } 50% { box-shadow: 0 0 0 6px rgba(79,70,229,.18); } }
.lz-spettro_autonomia .carte { display: grid; gap: 8px; }
.lz-spettro_autonomia .carta { text-align: left; border: 1.5px solid var(--bordo); background: var(--superficie-2); border-radius: 12px; padding: 9px 11px;
  display: grid; grid-template-columns: 1fr auto; gap: 8px; align-items: center; font-size: .84rem; transition: border-color .2s, background .2s, transform .15s; cursor: grab; }
.lz-spettro_autonomia .carta:hover { border-color: #a5b4fc; }
.lz-spettro_autonomia .carta[aria-pressed="true"] { border-color: var(--primario); background: var(--primario-chiaro); transform: translateX(-3px); box-shadow: 0 4px 14px rgba(79,70,229,.18); }
.lz-spettro_autonomia .carta .stato { font-size: .68rem; font-weight: 800; padding: .15em .55em; border-radius: 999px; white-space: nowrap; background: var(--sfondo-2); color: var(--tenue); }
.lz-spettro_autonomia .carta .stato.giusto { background: var(--ok-chiaro); color: #166534; }
.lz-spettro_autonomia .carta .stato.troppo { background: var(--avviso-chiaro); color: #92400e; }
.lz-spettro_autonomia .carta .stato.poco { background: var(--male-chiaro); color: #9f1239; }
.lz-spettro_autonomia .punteggio { font-size: .84rem; color: var(--tenue); margin: 10px 0 6px; }
.lz-spettro_autonomia .punteggio b { color: var(--inchiostro); }
.lz-spettro_autonomia .spiega-livello { font-size: .84rem; color: var(--tenue); margin: 6px 0 0; min-height: 3.2em; }
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
function testoSvg(attr, testo) {
  const t = svgEl("text", attr);
  t.textContent = testo;
  return t;
}
const attendi = (ms) => new Promise((ok) => setTimeout(ok, ms));
const morbido = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// ------------------------------------------------------------------ logica (pura)

function livelloDi(sc, n) {
  const L = sc.livelli.find((l) => l.n === n);
  if (!L) throw new Error(`livello di autonomia sconosciuto: ${n}`);
  return L;
}

/** Valori dei quattro indicatori (0-100) a una tacca del cursore. */
export function indicatori(sc, n) {
  const L = livelloDi(sc, n);
  return sc.indicatori.map((ind) => {
    if (!(ind.id in L.valori)) throw new Error(`livello ${n}: manca il valore dell'indicatore ${ind.id}`);
    return { id: ind.id, nome: ind.nome, freccia: ind.freccia, valore: L.valori[ind.id] };
  });
}

/** Riscontro motivato quando lo studente mette lo scenario `id` sulla tacca `n`. */
export function valuta(sc, id, n) {
  const scen = sc.scenari.find((x) => x.id === id);
  if (!scen) throw new Error(`scenario sconosciuto: ${id}`);
  livelloDi(sc, n);
  const esito = n === scen.giusto ? "giusto" : n > scen.giusto ? "troppo" : "poco";
  const motivo = { giusto: scen.motivo, troppo: scen.se_troppo, poco: scen.se_poco }[esito];
  if (!motivo) throw new Error(`scenario ${id}: manca la spiegazione per l'esito «${esito}»`);
  const testo = riempi(sc.testi[`fb_${esito}`], { scelto: livelloDi(sc, n).nome, giusto: livelloDi(sc, scen.giusto).nome, motivo });
  return { id, esito, testo, scarto: n - scen.giusto };
}

/** Situazione del gioco: valutazioni delle schede gia' posate, quante giuste, testo di sintesi. */
export function riepilogo(sc, assegnazioni) {
  const valutazioni = [];
  for (const scen of sc.scenari) {
    const n = assegnazioni[scen.id];
    if (n === null || n === undefined) continue;
    valutazioni.push(valuta(sc, scen.id, n));
  }
  const giuste = valutazioni.filter((v) => v.esito === "giusto").length;
  const totali = sc.scenari.length;
  const completo = giuste === totali;
  const testo = completo ? sc.testi.gioco_completo : riempi(sc.testi.gioco_punteggio, { giuste, totali });
  return { valutazioni, giuste, totali, completo, testo };
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const tempi = sc.tempi;
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const durata = (ms) => (ridotto ? 1 : ms);
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));

  const s = {
    livello: sc.livelli[0].n,
    assegnazioni: Object.fromEntries(sc.scenari.map((x) => [x.id, null])),
    scheda_attiva: null,
  };
  let generazione = 0;
  let ultimo = null; // ultima valutazione mostrata
  let valoriMostrati = indicatori(sc, s.livello).map((i) => i.valore);

  // ------------------------------------------------ comandi (sinistra)
  const comandi = el("aside", { class: "pannello" });
  const valoreLivello = el("b", {});
  const range = el("input", { type: "range", min: sc.livelli[0].n, max: sc.livelli[sc.livelli.length - 1].n, step: 1, "aria-label": E.cursore });
  range.addEventListener("input", () => cambiaLivello(Number(range.value)));
  const spiegaLivello = el("p", { class: "spiega-livello", "aria-live": "polite" });
  const elencoInd = el("div", {});
  comandi.append(
    el("h3", {}, E.titolo_comandi),
    el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, E.cursore), valoreLivello), range),
    spiegaLivello,
    el("h4", {}, E.regola_titolo),
    el("p", { style: "font-size:.84rem;color:var(--tenue);margin:0" }, E.regola),
    elencoInd);

  // ------------------------------------------------ scena (centro)
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: "0 0 720 420", role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `
    <defs>
      <linearGradient id="sa-ai" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#6d28d9"/></linearGradient>
      <radialGradient id="sa-agente" cx="40%" cy="35%"><stop offset="0" stop-color="#818cf8"/><stop offset=".6" stop-color="#6366f1"/><stop offset="1" stop-color="#4338ca"/></radialGradient>
      <filter id="sa-ombra" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#17203b" flood-opacity=".14"/></filter>
      <filter id="sa-bagliore" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      <marker id="sa-punta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10z" fill="#94a3b8"/></marker>
      <marker id="sa-punta-v" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10z" fill="#8b5cf6"/></marker>
    </defs>`;
  const gDiagramma = svgEl("g");
  const titoloLivello = testoSvg({ x: 360, y: 30, "text-anchor": "middle", "font-size": 17, "font-weight": 800, fill: "#17203b" }, "");
  const didascalia = testoSvg({ x: 360, y: 262, "text-anchor": "middle", "font-size": 12.5, fill: "#5b6684" }, "");
  const gIndicatori = svgEl("g", { transform: "translate(40,290)" });
  svg.append(titoloLivello, gDiagramma, didascalia, svgEl("line", { x1: 30, y1: 278, x2: 690, y2: 278, stroke: "#e3e8f4", "stroke-width": 1.5 }), gIndicatori);

  const barre = {};
  sc.indicatori.forEach((ind, i) => {
    const y = i * 32;
    const g = svgEl("g", { transform: `translate(0,${y})` });
    g.append(testoSvg({ x: 0, y: 17, "font-size": 12.5, "font-weight": 700, fill: "#17203b" }, `${ind.nome} ${ind.freccia}`));
    g.append(svgEl("rect", { x: 190, y: 6, width: 400, height: 14, rx: 7, fill: "#eef1f8" }));
    const barra = svgEl("rect", { x: 190, y: 6, width: 0, height: 14, rx: 7, fill: COLORE_IND[ind.id] || "#6366f1" });
    const valore = testoSvg({ x: 604, y: 18, "font-size": 12, "font-weight": 800, fill: COLORE_IND[ind.id] || "#6366f1" }, "");
    g.append(barra, valore);
    gIndicatori.append(g);
    barre[ind.id] = { barra, valore };
  });

  const tacche = el("div", { class: "tacche", role: "group", "aria-label": E.cursore });
  const bottoniTacca = {};
  sc.livelli.forEach((L) => {
    const posati = el("div", { class: "posati" });
    const b = el("button", { class: "tacca", "data-n": L.n, title: L.breve, onclick: () => cliccaTacca(L.n) },
      el("span", { class: "bollo" }, String(L.n)), el("span", { class: "nome" }, L.nome), posati);
    b.addEventListener("dragover", (e) => { e.preventDefault(); b.classList.add("sopra"); });
    b.addEventListener("dragleave", () => b.classList.remove("sopra"));
    b.addEventListener("drop", (e) => {
      e.preventDefault();
      b.classList.remove("sopra");
      const id = e.dataTransfer ? e.dataTransfer.getData("text/plain") : "";
      if (sc.scenari.some((x) => x.id === id)) assegna(id, L.n);
    });
    tacche.append(b);
    bottoniTacca[L.n] = { b, posati };
  });
  scena.append(svg, tacche);

  // ------------------------------------------------ gioco (destra)
  const destra = el("aside", { class: "pannello destra" });
  const carte = el("div", { class: "carte" });
  const bottoniCarta = {};
  sc.scenari.forEach((scen) => {
    const stato = el("span", { class: "stato" }, E.da_posare);
    const b = el("button", { class: "carta", draggable: "true", onclick: () => scegliCarta(scen.id) }, el("span", {}, scen.nome), stato);
    b.addEventListener("dragstart", (e) => { if (e.dataTransfer) e.dataTransfer.setData("text/plain", scen.id); s.scheda_attiva = scen.id; aggiorna(); });
    carte.append(b);
    bottoniCarta[scen.id] = { b, stato };
  });
  const istruzione = el("p", { style: "font-size:.84rem;color:var(--tenue);margin:0 0 10px" }, E.istruzione_gioco);
  const punteggio = el("div", { class: "punteggio", "aria-live": "polite" });
  const esitoBox = el("div", { "aria-live": "polite" });
  const btnAzzera = el("button", { class: "btn", style: "margin-top:10px", onclick: () => { applicaInterno({ assegnazioni: Object.fromEntries(sc.scenari.map((x) => [x.id, null])), scheda_attiva: null }); } }, E.ricomincia_gioco);
  destra.append(el("h3", {}, E.titolo_gioco), istruzione, carte, punteggio, esitoBox, btnAzzera);

  const radiceLz = el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra);
  radice.replaceChildren(radiceLz);

  // ------------------------------------------------ interazioni
  function cambiaLivello(n) {
    if (n === s.livello) return;
    s.livello = n;
    disegnaLivello();
    aggiorna();
  }
  function cliccaTacca(n) {
    if (s.scheda_attiva) assegna(s.scheda_attiva, n);
    else cambiaLivello(n);
  }
  function scegliCarta(id) {
    s.scheda_attiva = s.scheda_attiva === id ? null : id;
    aggiorna();
  }
  function assegna(id, n) {
    s.assegnazioni[id] = n;
    s.scheda_attiva = null;
    ultimo = valuta(sc, id, n);
    if (s.livello !== n) { s.livello = n; disegnaLivello(); }
    aggiorna();
    const chip = bottoniTacca[n].posati.querySelector(`[data-id="${id}"]`);
    if (chip) chip.animate([{ transform: "scale(.3)", opacity: 0 }, { transform: "scale(1.15)", opacity: 1 }, { transform: "scale(1)" }], { duration: durata(420), easing: "ease-out" });
  }

  // ------------------------------------------------ disegno del diagramma per livello
  function tween(ms, passo) {
    const gen = generazione;
    return new Promise((ok) => {
      const t0 = performance.now();
      const frame = (ora) => {
        if (gen !== generazione) return ok(false);
        const x = Math.min(1, (ora - t0) / Math.max(1, ms));
        passo(morbido(x));
        if (x < 1) requestAnimationFrame(frame); else ok(true);
      };
      requestAnimationFrame(frame);
    });
  }

  function scatola(x, y, w, h, testo, ai, sotto) {
    const g = svgEl("g", { transform: `translate(${x},${y})`, filter: "url(#sa-ombra)" });
    g.append(svgEl("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 14, fill: ai ? "url(#sa-ai)" : "#fff", stroke: ai ? "#7c3aed" : "#d6dcea", "stroke-width": 1.5 }));
    if (ai) g.append(testoSvg({ x: w / 2 - 10, y: -h / 2 + 15, "text-anchor": "end", "font-size": 10, "font-weight": 900, fill: "#ede9fe", "letter-spacing": "1" }, E.ai));
    g.append(testoSvg({ x: 0, y: 5, "text-anchor": "middle", "font-size": 12.5, "font-weight": 700, fill: ai ? "#fff" : "#17203b" }, testo));
    if (sotto) g.append(testoSvg({ x: 0, y: h / 2 + 16, "text-anchor": "middle", "font-size": 10.5, fill: "#8a94ae" }, sotto));
    return g;
  }

  function disegnaLivello() {
    generazione += 1;
    const L = livelloDi(sc, s.livello);
    gDiagramma.replaceChildren();
    titoloLivello.textContent = `${L.n} · ${L.nome}`;
    didascalia.textContent = L.didascalia;
    gDiagramma.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: durata(380), easing: "ease-out" });
    if (s.livello <= 3) disegnaProcesso(L);
    else if (s.livello === 4) disegnaAgente();
    else disegnaMulti();
    animaIndicatori();
  }

  function disegnaProcesso(L) {
    const xs = [100, 273, 446, 619];
    const y = 140;
    const linee = [];
    for (let i = 0; i < xs.length - 1; i++) {
      const linea = svgEl("path", { d: `M${xs[i] + 72},${y} L${xs[i + 1] - 76},${y}`, stroke: "#94a3b8", "stroke-width": 2.5, fill: "none", "marker-end": "url(#sa-punta)" });
      gDiagramma.append(linea);
      linee.push(linea);
    }
    sc.processo.forEach((p, i) => {
      const ai = L.nodi_ai.includes(i);
      gDiagramma.append(scatola(xs[i], y, 140, 62, p.nome, ai, ai ? p.con_ai : p.regola));
    });
    gDiagramma.append(testoSvg({ x: 360, y: 72, "text-anchor": "middle", "font-size": 11.5, fill: "#8a94ae" }, E.frecce_fisse));
    const gettone = svgEl("circle", { r: 8, fill: "#fff", stroke: "#4f46e5", "stroke-width": 3.5, filter: "url(#sa-bagliore)", cx: xs[0], cy: y - 44 });
    gDiagramma.append(gettone);
    if (ridotto) return;
    const gen = generazione;
    (async () => {
      while (gen === generazione) {
        for (let i = 0; i < xs.length; i++) {
          if (gen !== generazione) return;
          const da = i === 0 ? xs[0] : xs[i - 1];
          await tween(tempi.ms_passo, (t) => gettone.setAttribute("cx", da + (xs[i] - da) * t));
          gettone.setAttribute("stroke", L.nodi_ai.includes(i) ? "#8b5cf6" : "#4f46e5");
          await attendi(tempi.ms_sosta);
        }
        await attendi(tempi.ms_sosta);
      }
    })();
  }

  function disegnaAgente() {
    const C = { x: 360, y: 145 };
    const nodi = {};
    const POSIZIONI = [{ x: 130, y: 80 }, { x: 590, y: 80 }, { x: 130, y: 210 }, { x: 590, y: 210 }];
    sc.strumenti_agente.forEach((st, i) => {
      const pos = POSIZIONI[i];
      if (!pos) throw new Error("al massimo quattro strumenti nel disegno dell'agente");
      const g = scatola(pos.x, pos.y, 132, 48, st.nome, false, null);
      gDiagramma.append(g);
      nodi[st.id] = { ...pos, g };
    });
    const linee = svgEl("g");
    gDiagramma.append(linee);
    const ga = svgEl("g", { transform: `translate(${C.x},${C.y})`, filter: "url(#sa-ombra)" });
    const disco = svgEl("circle", { r: 48, fill: "url(#sa-agente)" });
    ga.append(disco, testoSvg({ y: -2, "text-anchor": "middle", "font-size": 14, "font-weight": 900, fill: "#fff", "letter-spacing": "1.2" }, E.agente_centro));
    const pensiero = testoSvg({ y: 16, "text-anchor": "middle", "font-size": 10.5, fill: "#e0e7ff" }, "");
    ga.append(pensiero);
    gDiagramma.append(ga);
    gDiagramma.append(testoSvg({ x: 360, y: 230, "text-anchor": "middle", "font-size": 11.5, fill: "#8b5cf6", "font-weight": 700 }, E.frecce_agente));
    const gen = generazione;
    const disegnaFreccia = async (id, k) => {
      const n = nodi[id];
      if (!n) throw new Error(`strumento dell'agente sconosciuto: ${id}`);
      const dx = n.x - C.x, dy = n.y - C.y, d = Math.hypot(dx, dy);
      const x1 = C.x + (dx / d) * 52, y1 = C.y + (dy / d) * 52;
      const x2 = n.x - (dx / d) * 70, y2 = n.y - (dy / d) * 30;
      const linea = svgEl("path", { d: `M${x1},${y1} L${x2},${y2}`, stroke: "#8b5cf6", "stroke-width": 2.5, fill: "none", "stroke-dasharray": "7 6", "marker-end": "url(#sa-punta-v)", opacity: 0 });
      linee.append(linea);
      linea.setAttribute("data-passo", String(k));
      linea.setAttribute("opacity", "1");
      if (ridotto) return true;
      const lung = Math.hypot(x2 - x1, y2 - y1);
      const ok = await tween(tempi.ms_passo, (t) => linea.setAttribute("d", `M${x1},${y1} L${x1 + (x2 - x1) * t},${y1 + (y2 - y1) * t}`));
      n.g.animate([{ transform: `translate(${n.x}px,${n.y}px) scale(1)` }, { transform: `translate(${n.x}px,${n.y}px) scale(1.08)` }, { transform: `translate(${n.x}px,${n.y}px) scale(1)` }], { duration: durata(360) });
      return ok && lung > 0;
    };
    (async () => {
      let giro = 0;
      while (gen === generazione) {
        const percorso = sc.percorsi_agente[giro % sc.percorsi_agente.length];
        linee.replaceChildren();
        for (let k = 0; k < percorso.length; k++) {
          if (gen !== generazione) return;
          pensiero.textContent = riempi(T.agente_sceglie, { passo: k + 1 });
          await disegnaFreccia(percorso[k], k + 1);
          if (ridotto) continue;
          await attendi(tempi.ms_sosta);
        }
        if (ridotto) return;
        await attendi(tempi.ms_sosta * 3);
        giro += 1;
      }
    })();
  }

  function disegnaMulti() {
    const pos = [{ x: 360, y: 82 }, { x: 170, y: 200 }, { x: 550, y: 200 }];
    const centri = sc.agenti_multi.map((a, i) => {
      const p = pos[i];
      if (!p) throw new Error("al massimo tre agenti nel disegno multi-agente");
      const g = svgEl("g", { transform: `translate(${p.x},${p.y})`, filter: "url(#sa-ombra)" });
      g.append(svgEl("circle", { r: 34, fill: "url(#sa-agente)" }));
      g.append(testoSvg({ y: 4, "text-anchor": "middle", "font-size": 11, "font-weight": 900, fill: "#fff" }, a.nome));
      g.append(testoSvg({ y: 52, "text-anchor": "middle", "font-size": 10.5, fill: "#8a94ae" }, a.compito));
      return { ...p, g };
    });
    for (let i = 0; i < centri.length; i++) for (let j = i + 1; j < centri.length; j++) {
      gDiagramma.append(svgEl("line", { x1: centri[i].x, y1: centri[i].y, x2: centri[j].x, y2: centri[j].y, stroke: "#c4b5fd", "stroke-width": 2, "stroke-dasharray": "4 6" }));
    }
    centri.forEach((c) => gDiagramma.append(c.g));
    const busta = svgEl("g", { opacity: 0 });
    busta.append(svgEl("rect", { x: -11, y: -8, width: 22, height: 16, rx: 3, fill: "#f59e0b" }), svgEl("path", { d: "M-7,-3 L0,2 L7,-3", fill: "none", stroke: "#fff", "stroke-width": 2 }));
    const fumetto = testoSvg({ x: 360, y: 158, "text-anchor": "middle", "font-size": 11.5, "font-weight": 700, fill: "#6d28d9" }, "");
    gDiagramma.append(busta, fumetto);
    if (ridotto) return;
    const gen = generazione;
    (async () => {
      let k = 0;
      while (gen === generazione) {
        const m = sc.messaggi_multi[k % sc.messaggi_multi.length];
        const a = centri[m.da], b = centri[m.a];
        if (!a || !b) throw new Error(`messaggio fra agenti inesistenti: ${m.da} -> ${m.a}`);
        fumetto.textContent = m.testo;
        busta.setAttribute("opacity", "1");
        await tween(tempi.ms_passo * 1.4, (t) => busta.setAttribute("transform", `translate(${a.x + (b.x - a.x) * t},${a.y + (b.y - a.y) * t})`));
        busta.setAttribute("opacity", "0");
        await attendi(tempi.ms_sosta);
        k += 1;
      }
    })();
  }

  function animaIndicatori() {
    const nuovi = indicatori(sc, s.livello);
    const vecchi = valoriMostrati.slice();
    valoriMostrati = nuovi.map((i) => i.valore);
    const imposta = (t) => nuovi.forEach((ind, i) => {
      const v = vecchi[i] + (ind.valore - vecchi[i]) * t;
      barre[ind.id].barra.setAttribute("width", String((v / 100) * 400));
      barre[ind.id].valore.textContent = String(Math.round(v));
    });
    if (ridotto) { imposta(1); return; }
    const t0 = performance.now();
    const ms = tempi.ms_indicatori;
    const frame = (ora) => {
      const x = Math.min(1, (ora - t0) / ms);
      imposta(morbido(x));
      if (x < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------ sincronizzazione
  function aggiorna() {
    const L = livelloDi(sc, s.livello);
    range.value = s.livello;
    valoreLivello.textContent = `${L.n} · ${L.nome}`;
    spiegaLivello.textContent = L.breve;
    elencoInd.replaceChildren(...indicatori(sc, s.livello).map((i) => el("div", { class: "cursore" },
      el("div", { class: "riga" }, el("span", {}, `${i.nome} ${i.freccia}`), el("b", {}, String(i.valore))))));
    for (const [n, { b, posati }] of Object.entries(bottoniTacca)) {
      b.setAttribute("aria-pressed", String(Number(n) === s.livello));
      posati.replaceChildren(...sc.scenari.filter((x) => s.assegnazioni[x.id] === Number(n)).map((x) =>
        el("span", { "data-id": x.id, class: valuta(sc, x.id, Number(n)).esito }, x.sigla)));
    }
    tacche.classList.toggle("attesa", Boolean(s.scheda_attiva));
    for (const scen of sc.scenari) {
      const { b, stato } = bottoniCarta[scen.id];
      b.setAttribute("aria-pressed", String(s.scheda_attiva === scen.id));
      const n = s.assegnazioni[scen.id];
      if (n === null || n === undefined) { stato.className = "stato"; stato.textContent = s.scheda_attiva === scen.id ? E.scegli_tacca : E.da_posare; }
      else { const v = valuta(sc, scen.id, n); stato.className = `stato ${v.esito}`; stato.textContent = `${E["esito_" + v.esito]} · ${n}`; }
    }
    const r = riepilogo(sc, s.assegnazioni);
    punteggio.replaceChildren(el("b", {}, r.testo));
    if (ultimo && s.assegnazioni[ultimo.id] !== null) {
      const scen = sc.scenari.find((x) => x.id === ultimo.id);
      esitoBox.replaceChildren(el("div", { class: `esito-scheda ${COLORE_ESITO[ultimo.esito]}` },
        el("div", {}, el("div", { style: "font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;opacity:.8" }, `${scen.nome} → ${E["esito_" + ultimo.esito]}`), ultimo.testo)));
    } else {
      esitoBox.replaceChildren();
    }
  }

  function applicaInterno(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) {
      if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    }
    const nuovo = { ...s, ...(stato || {}) };
    if (nuovo.assegnazioni) {
      for (const k of Object.keys(nuovo.assegnazioni)) if (!sc.scenari.some((x) => x.id === k)) throw new Error(`stato_animazione: scenario sconosciuto «${k}»`);
      nuovo.assegnazioni = { ...Object.fromEntries(sc.scenari.map((x) => [x.id, null])), ...nuovo.assegnazioni };
    }
    livelloDi(sc, nuovo.livello);
    Object.assign(s, nuovo);
    ultimo = null;
    disegnaLivello();
    aggiorna();
  }

  applicaInterno({});
  return {
    applica: applicaInterno,
    distruggi() { generazione += 1; },
    _prova: { stato: s, indicatori: () => indicatori(sc, s.livello), riepilogo: () => riepilogo(sc, s.assegnazioni) },
  };
}
