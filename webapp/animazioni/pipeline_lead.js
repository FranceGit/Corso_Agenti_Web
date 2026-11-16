// Lezione interattiva "Mappare il processo e i contratti dati" (P3.1): un lead viaggia su un nastro di stazioni
// (pulizia, arricchimento, punteggio, email, classificazione della risposta, CRM). A ogni stazione la scheda del
// lead si allunga con campi colorati per origine. Ogni stazione ha un contratto dati (campi che riceve e consegna):
// spegnendo una stazione, quella dopo si accende di rosso "input mancante" e il lead si ferma. Il "flusso da
// tutorial" toglie le stazioni scomode e i controlli; la "prova di tutta la catena" trova l'errore di mappatura che
// nessuna stazione vede da sola. Tutti i testi e i dati arrivano dallo scenario della lezione.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "pipeline_lead";
const N = { x0: 64, w: 96, passo: 109, y: 40, h: 54, nastro: 112, ingresso: 30 };
const COLORE_STATO = { ok: "#10b981", spenta: "#94a3b8", mancante: "#e11d48", assente: "#cbd5e1", non_raggiunta: "#cbd5e1", in_attesa: "#a5b4fc" };
const FONDO_STATO = { ok: "#ecfdf5", spenta: "#f1f5f9", mancante: "#fdecef", assente: "#f8fafc", non_raggiunta: "#f8fafc", in_attesa: "#ffffff" };

const STILE = `
.lz-pipeline_lead .scheda-lead { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 6px; margin-top: 8px; }
.lz-pipeline_lead .titolo-scheda { display: flex; justify-content: space-between; align-items: baseline; margin: 6px 4px 0; font-size: .8rem; font-weight: 800; color: var(--tenue); text-transform: uppercase; letter-spacing: .06em; }
.lz-pipeline_lead .campo-lead { border-radius: 10px; padding: 6px 8px; font-size: .78rem; background: #fff; border: 1.5px solid var(--bordo); border-left-width: 5px; display: grid; gap: 1px; }
.lz-pipeline_lead .campo-lead .nome { font-size: .66rem; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--tenue); }
.lz-pipeline_lead .campo-lead .valore { font-weight: 600; word-break: break-word; }
.lz-pipeline_lead .campo-lead.nuovo { animation: lz-pl-entra .5s ease; }
.lz-pipeline_lead .campo-lead.manca { border-style: dashed; border-color: var(--male); background: var(--male-chiaro); color: #9f1239; }
.lz-pipeline_lead .campo-lead.rotto .valore { color: #9f1239; }
.lz-pipeline_lead .o-modulo { border-left-color: #94a3b8; }
.lz-pipeline_lead .o-pipeline { border-left-color: #6366f1; }
.lz-pipeline_lead .o-crm { border-left-color: #0ea5e9; }
.lz-pipeline_lead .o-fonte { border-left-color: #14b8a6; }
.lz-pipeline_lead .o-modello { border-left-color: #a855f7; border-style: dashed solid dashed dashed; }
.lz-pipeline_lead .o-cliente { border-left-color: #f59e0b; }
.lz-pipeline_lead .o-persona { border-left-color: #16a34a; }
.lz-pipeline_lead .legenda-origini { display: grid; gap: 4px; font-size: .76rem; margin-top: 4px; }
.lz-pipeline_lead .legenda-origini span { display: flex; align-items: center; gap: 6px; }
.lz-pipeline_lead .legenda-origini i { width: 12px; height: 12px; border-radius: 3px; display: inline-block; border: 1.5px solid; border-left-width: 5px; }
.lz-pipeline_lead .contratto { display: grid; gap: 6px; font-size: .84rem; }
.lz-pipeline_lead .contratto .titolo { font-weight: 800; font-size: .98rem; }
.lz-pipeline_lead .contratto ul { margin: 2px 0 0; padding-left: 0; list-style: none; display: grid; gap: 3px; }
.lz-pipeline_lead .contratto li { display: flex; gap: 6px; align-items: baseline; }
.lz-pipeline_lead .contratto li .segno { font-weight: 800; width: 1em; flex: 0 0 auto; }
.lz-pipeline_lead .contratto li.si .segno { color: var(--ok); }
.lz-pipeline_lead .contratto li.no .segno { color: var(--male); }
.lz-pipeline_lead .contratto .etichetta { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--tenue); margin-top: 4px; }
.lz-pipeline_lead .contratto .origine { font-size: .7rem; color: var(--tenue); }
.lz-pipeline_lead .esiti { display: grid; gap: 6px; margin-top: 12px; }
.lz-pipeline_lead .esiti .riga { font-size: .82rem; padding: 7px 10px; border-radius: 10px; background: var(--male-chiaro); color: #9f1239; animation: entra .35s ease; }
.lz-pipeline_lead .esiti .riga.ok { background: var(--ok-chiaro); color: #166534; }
.lz-pipeline_lead .nota { font-size: .8rem; color: var(--tenue); margin: 6px 0 0; }
.lz-pipeline_lead .fila-btn { display: flex; gap: 6px; flex-wrap: wrap; }
.lz-pipeline_lead .fila-btn .btn { flex: 1 1 auto; justify-content: center; }
.lz-pipeline_lead .stazione { cursor: pointer; }
.lz-pipeline_lead .stazione:focus-visible rect { stroke: #4f46e5; stroke-width: 3.5; }
.lz-pipeline_lead .avanzamento-pl { font-size: .8rem; color: var(--tenue); margin: 6px 0 0; }
@keyframes lz-pl-entra { from { opacity: 0; transform: translateY(6px) scale(.96); } to { opacity: 1; transform: none; } }
@keyframes lz-pl-nastro { to { stroke-dashoffset: -24; } }
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

// ------------------------------------------------------------------ logica (pura)

function campoDi(sc, id) {
  const c = sc.campi.find((x) => x.id === id);
  if (!c) throw new Error(`campo sconosciuto: ${id}`);
  return c;
}
function stazioneCheProduce(sc, idCampo) {
  return sc.stazioni.find((st) => st.uscita.includes(idCampo)) || null;
}

/**
 * Il viaggio del lead lungo il nastro.
 * Per ogni stazione: stato (ok | spenta | mancante | assente | non_raggiunta), campi mancanti, campi prodotti, visto
 * (il lead e' gia' passato di li'). Restituisce anche i campi disponibili alla fine, la scheda visibile e l'esito.
 */
export function percorri(sc, s) {
  const tutorial = s.flusso === "tutorial";
  if (!tutorial && s.flusso !== "completo") throw new Error(`flusso sconosciuto: ${s.flusso}`);
  const rotta = !tutorial && s.mappatura === "sbagliata";
  const valoreDi = (c) => {
    if (tutorial && c.valore_tutorial) return { valore: c.valore_tutorial, rotto: false };
    if (rotta && c.valore_rotto) return { valore: c.valore_rotto, rotto: true };
    return { valore: c.valore, rotto: false };
  };
  const disponibili = new Map();
  for (const id of sc.ingresso) disponibili.set(id, { ...valoreDi(campoDi(sc, id)), stazione: null });
  let fermo = -1;
  const stazioni = sc.stazioni.map((st, i) => {
    const visto = i < s.passo;
    const base = { id: st.id, mancanti: [], prodotti: [], visto };
    if (tutorial && sc.tutorial.assenti.includes(st.id)) return { ...base, stato: "assente" };
    if (!tutorial && !s.attive[st.id]) return { ...base, stato: "spenta" };
    if (fermo >= 0) return { ...base, stato: "non_raggiunta" };
    if (!tutorial) {
      const mancanti = st.ingresso.filter((c) => !disponibili.has(c));
      if (mancanti.length) { fermo = i; return { ...base, stato: "mancante", mancanti }; }
    }
    for (const c of st.uscita) disponibili.set(c, { ...valoreDi(campoDi(sc, c)), stazione: st.id });
    return { ...base, stato: "ok", prodotti: [...st.uscita] };
  });
  const tot = sc.stazioni.length;
  const arrivato = fermo >= 0 ? s.passo > fermo : s.passo >= tot;
  // la scheda mostra i campi del modulo e quelli delle stazioni gia' attraversate
  const visibili = new Set(sc.ingresso);
  stazioni.forEach((x) => { if (x.visto) x.prodotti.forEach((c) => visibili.add(c)); });
  const ultima = stazioni.filter((x) => x.visto && x.stato === "ok").at(-1);
  const scheda = sc.campi.filter((c) => visibili.has(c.id) && disponibili.has(c.id)).map((c) => ({
    id: c.id, nome: c.nome, origine: c.origine, valore: disponibili.get(c.id).valore, rotto: disponibili.get(c.id).rotto,
    nuovo: Boolean(ultima && ultima.prodotti.includes(c.id) && stazioni.indexOf(ultima) === s.passo - 1),
  }));
  const mancantiVisti = fermo >= 0 && stazioni[fermo].visto ? stazioni[fermo].mancanti : [];
  const posizione = fermo >= 0 ? Math.min(s.passo, fermo + 1) : Math.min(s.passo, tot);
  return { stazioni, disponibili, scheda, mancanti: mancantiVisti, fermo, arrivato, posizione, tot, tutorial, rotta };
}

/** Esito leggibile del viaggio: tipo (in_corso | ok | fermo | avviso | tutorial), testo e righe di danno. */
export function esito(sc, s, p) {
  const T = sc.testi;
  const nome = (id) => sc.stazioni.find((x) => x.id === id).nome;
  if (p.tutorial) {
    return { tipo: "tutorial", testo: T.esito_tutorial, righe: sc.tutorial.assenti.map((id) => riempi(T.danno_assente, { stazione: nome(id), danno: sc.stazioni.find((x) => x.id === id).danno_tutorial })) };
  }
  const spente = p.stazioni.filter((x) => x.stato === "spenta").map((x) => x.id);
  const righeSpente = spente.map((id) => riempi(T.danno_spenta, { stazione: nome(id), danno: sc.stazioni.find((x) => x.id === id).danno }));
  if (p.fermo >= 0 && p.arrivato) {
    const campi = p.stazioni[p.fermo].mancanti.map((c) => campoDi(sc, c).nome).join(", ");
    return { tipo: "fermo", testo: riempi(T.esito_fermo, { stazione: nome(sc.stazioni[p.fermo].id), campi }), righe: righeSpente };
  }
  if (!p.arrivato) return { tipo: "in_corso", testo: riempi(T.esito_in_corso, { n: p.posizione, tot: p.tot }), righe: [] };
  if (spente.length) return { tipo: "avviso", testo: T.esito_arrivato_spente, righe: righeSpente };
  return { tipo: "ok", testo: p.rotta ? T.esito_ok_apparente : T.esito_ok, righe: [] };
}

/** "Prova tutta la catena": controlla il risultato finale, non le singole stazioni. */
export function provaCatena(sc, s) {
  const T = sc.testi;
  const p = percorri(sc, { ...s, passo: sc.stazioni.length });
  const nome = (st) => (st ? st.nome : T.origine_modulo);
  if (p.tutorial) {
    const righe = sc.tutorial.assenti.map((id) => sc.stazioni.find((x) => x.id === id).danno_tutorial);
    return { esito: "ko", testo: riempi(T.catena_tutorial, { n: righe.length }), righe };
  }
  if (p.fermo >= 0) return { esito: "interrotta", testo: T.catena_interrotta, righe: [] };
  const righe = [];
  const rotti = sc.campi.filter((c) => p.disponibili.has(c.id) && p.disponibili.get(c.id).rotto);
  if (rotti.length) {
    const radice = rotti[0];
    righe.push(riempi(T.catena_radice, { campo: radice.nome, valore: p.disponibili.get(radice.id).valore, stazione: nome(stazioneCheProduce(sc, radice.id)) }));
    const effetto = rotti.at(-1);
    if (effetto !== radice) righe.push(riempi(T.catena_effetto, { campo: effetto.nome, valore: p.disponibili.get(effetto.id).valore }));
  }
  for (const id of sc.campi_finali) if (!p.disponibili.has(id)) righe.push(riempi(T.catena_manca, { campo: campoDi(sc, id).nome }));
  if (!righe.length) return { esito: "ok", testo: T.catena_ok, righe: [] };
  return { esito: "ko", testo: rotti.length ? T.catena_ko_verde : riempi(T.catena_ko_mancano, { n: righe.length }), righe, radice: rotti.length ? stazioneCheProduce(sc, rotti[0].id).id : null };
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const P = sc.parametri;
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const durata = (ms) => (ridotto ? 1 : ms);
  const lingua = contesto && contesto.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante: serve per scrivere i numeri nel formato della lingua");
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));

  const tutteAccese = () => Object.fromEntries(sc.stazioni.map((x) => [x.id, true]));
  const s = {
    passo: 0,
    attive: tutteAccese(),
    flusso: "completo",
    mappatura: "giusta",
    prova_catena: false,
    stazione_aperta: sc.stazioni[0].id,
  };
  let generazione = 0;
  let viaggio = null;

  // ------------------------------------------------ comandi (sinistra)
  const comandi = el("aside", { class: "pannello" });
  const btnAvanti = el("button", { class: "btn btn-primario", onclick: () => cambia({ passo: Math.min(s.passo + 1, sc.stazioni.length) }) }, E.avanti);
  const btnRiproduci = el("button", { class: "btn", onclick: () => riproduci() }, E.riproduci);
  const btnDaCapo = el("button", { class: "btn", onclick: () => { generazione += 1; cambia({ passo: 0 }); } }, E.ricomincia);
  const avanzamento = el("p", { class: "avanzamento-pl", "aria-live": "polite" });
  const segFlusso = el("div", { class: "segmentato", role: "group", "aria-label": E.flusso },
    el("button", { "data-v": "completo", onclick: () => cambia({ flusso: "completo" }) }, E.completo),
    el("button", { "data-v": "tutorial", onclick: () => cambia({ flusso: "tutorial" }) }, E.tutorial));
  const notaFlusso = el("p", { class: "nota" });
  const zonaStazioni = el("div", {});
  const interruttori = {};
  sc.stazioni.forEach((st) => {
    const input = el("input", { type: "checkbox", onchange: (e) => cambia({ attive: { ...s.attive, [st.id]: e.target.checked } }) });
    zonaStazioni.append(el("label", { class: "interruttore" }, el("span", {}, st.nome), input));
    interruttori[st.id] = input;
  });
  const iMappatura = el("input", { type: "checkbox", onchange: (e) => cambia({ mappatura: e.target.checked ? "giusta" : "sbagliata" }) });
  const btnCatena = el("button", { class: "btn btn-primario", style: "width:100%;justify-content:center;margin-top:8px", onclick: () => cambia({ prova_catena: true }, true) }, E.prova_catena);
  const legenda = el("div", { class: "legenda-origini" }, sc.origini.map((o) => el("span", {}, el("i", { class: `o-${o.id}` }), o.nome)));
  comandi.append(
    el("h3", {}, E.titolo_comandi),
    el("div", { class: "fila-btn" }, btnAvanti, btnRiproduci, btnDaCapo), avanzamento,
    el("h4", {}, E.flusso), segFlusso, notaFlusso,
    el("h4", {}, E.titolo_stazioni), zonaStazioni,
    el("label", { class: "interruttore" }, el("span", {}, E.mappatura), iMappatura),
    btnCatena,
    el("h4", {}, E.legenda), legenda);

  // ------------------------------------------------ scena (centro)
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: "0 0 720 150", role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs><filter id="pl-ombra" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#17203b" flood-opacity=".14"/></filter></defs>`;
  svg.append(svgEl("rect", { x: 10, y: N.nastro - 8, width: 700, height: 16, rx: 8, fill: "#e2e8f0" }));
  const righeNastro = svgEl("line", { x1: 16, y1: N.nastro, x2: 704, y2: N.nastro, stroke: "#94a3b8", "stroke-width": 2, "stroke-dasharray": "6 6" });
  if (!ridotto) righeNastro.setAttribute("style", "animation: lz-pl-nastro 1.2s linear infinite");
  svg.append(righeNastro);
  svg.append(testoSvg({ x: N.ingresso, y: 30, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: "#5b6684" }, E.ingresso));
  svg.append(svgEl("rect", { x: N.ingresso - 16, y: 40, width: 32, height: 40, rx: 4, fill: "#fff", stroke: "#94a3b8", "stroke-width": 1.5 }));
  for (let k = 0; k < 4; k++) svg.append(svgEl("line", { x1: N.ingresso - 10, y1: 50 + k * 7, x2: N.ingresso + 10, y2: 50 + k * 7, stroke: "#cbd5e1", "stroke-width": 2 }));
  const GRAFICA = {};
  sc.stazioni.forEach((st, i) => {
    const x = N.x0 + i * N.passo;
    const g = svgEl("g", { class: "stazione", tabindex: "0", role: "button", "aria-label": riempi(T.apri_stazione, { stazione: st.nome }) });
    const rect = svgEl("rect", { x, y: N.y, width: N.w, height: N.h, rx: 12, "stroke-width": 2, filter: "url(#pl-ombra)" });
    const numero = testoSvg({ x: x + 12, y: N.y + 15, "font-size": 9.5, "font-weight": 800, fill: "#94a3b8" }, String(i + 1));
    const nomeT = testoSvg({ x: x + N.w / 2, y: N.y + 25, "text-anchor": "middle", "font-size": 11.5, "font-weight": 800, fill: "#17203b" }, st.nome);
    const statoT = testoSvg({ x: x + N.w / 2, y: N.y + 42, "text-anchor": "middle", "font-size": 9.5, "font-weight": 700 }, "");
    g.append(rect, numero, nomeT, statoT);
    const apri = () => cambia({ stazione_aperta: st.id }, true);
    g.addEventListener("click", apri);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(); } });
    svg.append(g);
    GRAFICA[st.id] = { g, rect, statoT, x };
  });
  const gettone = svgEl("g", { transform: `translate(${N.ingresso},${N.nastro})` });
  const disco = svgEl("circle", { r: 13, fill: "#4f46e5", stroke: "#fff", "stroke-width": 2.5, filter: "url(#pl-ombra)" });
  gettone.append(disco, testoSvg({ y: 4, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: "#fff" }, sc.lead.iniziali));
  svg.append(gettone);
  const titoloScheda = el("div", { class: "titolo-scheda" }, el("span", {}, E.titolo_scheda_lead), el("span", {}));
  const schedaLead = el("div", { class: "scheda-lead", "aria-live": "polite" });
  scena.append(svg, titoloScheda, schedaLead);

  // ------------------------------------------------ contratto ed esiti (destra)
  const destra = el("aside", { class: "pannello destra" });
  const contratto = el("div", { class: "contratto" });
  const zonaEsito = el("div", { class: "esiti", "aria-live": "polite" });
  const zonaCatena = el("div", { class: "esiti", "aria-live": "polite" });
  destra.append(el("h3", {}, E.titolo_contratto), contratto, zonaEsito, zonaCatena);

  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno
  const xGettone = (pos) => (pos === 0 ? N.ingresso : N.x0 + (pos - 1) * N.passo + N.w / 2);
  let xPrecedente = N.ingresso;

  function disegnaNastro() {
    for (const x of viaggio.stazioni) {
      const G = GRAFICA[x.id];
      const stato = x.stato === "ok" && !x.visto ? "in_attesa" : x.stato === "mancante" && !x.visto ? "in_attesa" : x.stato;
      G.rect.setAttribute("fill", FONDO_STATO[stato]);
      G.rect.setAttribute("stroke", COLORE_STATO[stato]);
      G.rect.setAttribute("stroke-dasharray", stato === "spenta" || stato === "assente" ? "5 4" : "none");
      G.rect.setAttribute("stroke-width", x.id === s.stazione_aperta ? "3.5" : "2");
      G.g.setAttribute("opacity", stato === "assente" ? "0.55" : "1");
      G.statoT.textContent = E[`stato_${stato}`];
      G.statoT.setAttribute("fill", COLORE_STATO[stato] === "#cbd5e1" ? "#94a3b8" : COLORE_STATO[stato]);
      if (stato === "mancante") G.g.animate([{ transform: "translateX(0)" }, { transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "translateX(0)" }], { duration: durata(360) });
    }
    const xa = xGettone(viaggio.posizione);
    disco.setAttribute("fill", viaggio.fermo >= 0 && viaggio.arrivato ? "#e11d48" : "#4f46e5");
    if (ridotto) gettone.setAttribute("transform", `translate(${xa},${N.nastro})`);
    else gettone.animate([{ transform: `translate(${xPrecedente}px,${N.nastro}px)` }, { transform: `translate(${xa}px,${N.nastro}px)` }], { duration: durata(P.ms_gettone), easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
    gettone.setAttribute("transform", `translate(${xa},${N.nastro})`);
    xPrecedente = xa;
  }

  function disegnaScheda() {
    const origine = (id) => sc.origini.find((o) => o.id === id).nome;
    titoloScheda.lastChild.textContent = riempi(T.conta_campi, { n: viaggio.scheda.length });
    schedaLead.replaceChildren(
      ...viaggio.scheda.map((c) => el("div", { class: `campo-lead o-${c.origine}${c.nuovo ? " nuovo" : ""}${c.rotto ? " rotto" : ""}`, title: origine(c.origine) },
        el("span", { class: "nome" }, c.nome), el("span", { class: "valore" }, c.valore))),
      ...viaggio.mancanti.map((id) => el("div", { class: "campo-lead manca" },
        el("span", { class: "nome" }, sc.campi.find((x) => x.id === id).nome), el("span", { class: "valore" }, E.manca))));
  }

  function disegnaContratto() {
    const st = sc.stazioni.find((x) => x.id === s.stazione_aperta);
    const x = viaggio.stazioni.find((y) => y.id === st.id);
    const prima = new Set(sc.ingresso);
    for (const y of viaggio.stazioni) { if (y.id === st.id) break; y.prodotti.forEach((c) => prima.add(c)); }
    const voce = (id, segnato) => {
      const c = sc.campi.find((y) => y.id === id);
      const ha = prima.has(id);
      return el("li", { class: segnato ? (ha ? "si" : "no") : "" },
        el("span", { class: "segno" }, segnato ? (ha ? "✓" : "✗") : "→"),
        el("span", {}, c.nome, " ", el("span", { class: "origine" }, `(${sc.origini.find((o) => o.id === c.origine).nome})`)));
    };
    contratto.replaceChildren(
      el("div", { class: "titolo" }, st.nome),
      el("div", {}, st.compito),
      el("div", { class: "etichetta" }, E.riceve), el("ul", {}, st.ingresso.map((id) => voce(id, !viaggio.tutorial))),
      el("div", { class: "etichetta" }, E.consegna), el("ul", {}, st.uscita.map((id) => voce(id, false))),
      el("div", { class: "etichetta" }, E.senza_stazione), el("div", {}, viaggio.tutorial ? st.danno_tutorial || st.danno : st.danno),
      x.stato === "mancante" ? el("div", { class: "esito-scheda male" }, el("div", {}, E.stato_mancante)) : null);
    contratto.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: durata(260) });
  }

  function disegnaEsito() {
    const e = esito(sc, s, viaggio);
    const classe = { in_corso: "neutro", ok: "ok", fermo: "male", avviso: "avviso", tutorial: "male" }[e.tipo];
    zonaEsito.replaceChildren(el("div", { class: `esito-scheda ${classe}` }, el("div", {}, e.testo)), ...e.righe.map((r) => el("div", { class: "riga" }, r)));
    if (!s.prova_catena) { zonaCatena.replaceChildren(); return; }
    const c = provaCatena(sc, s);
    const cl = { ok: "ok", ko: "male", interrotta: "avviso" }[c.esito];
    zonaCatena.replaceChildren(el("div", { class: `esito-scheda ${cl}` }, el("div", {}, c.testo)), ...c.righe.map((r) => el("div", { class: "riga" }, r)));
  }

  function aggiornaComandi() {
    btnAvanti.disabled = s.passo >= sc.stazioni.length;
    avanzamento.textContent = riempi(T.avanzamento, { n: Math.min(s.passo, sc.stazioni.length), tot: sc.stazioni.length });
    segFlusso.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.flusso)));
    notaFlusso.textContent = s.flusso === "tutorial" ? T.nota_tutorial : T.nota_completo;
    for (const [id, input] of Object.entries(interruttori)) { input.checked = Boolean(s.attive[id]); input.disabled = s.flusso === "tutorial"; }
    iMappatura.checked = s.mappatura === "giusta";
    iMappatura.disabled = s.flusso === "tutorial";
  }

  function ridisegna() {
    viaggio = percorri(sc, s);
    aggiornaComandi();
    disegnaNastro();
    disegnaScheda();
    disegnaContratto();
    disegnaEsito();
  }

  // ------------------------------------------------ interazioni
  function cambia(diff, mantieniCatena) {
    if (!mantieniCatena) s.prova_catena = false;
    Object.assign(s, diff);
    ridisegna();
  }
  function riproduci() {
    generazione += 1;
    const gen = generazione;
    if (ridotto) { cambia({ passo: sc.stazioni.length }); return; }
    cambia({ passo: 0 });
    const prossimo = () => {
      if (gen !== generazione || s.passo >= sc.stazioni.length) return;
      cambia({ passo: s.passo + 1 }, true);
      setTimeout(prossimo, P.ms_passo);
    };
    setTimeout(prossimo, P.ms_passo);
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    nuovo.attive = { ...tutteAccese(), ...(nuovo.attive || {}) };
    for (const k of Object.keys(nuovo.attive)) if (!sc.stazioni.some((x) => x.id === k)) throw new Error(`stato_animazione: stazione sconosciuta «${k}»`);
    if (!sc.stazioni.some((x) => x.id === nuovo.stazione_aperta)) throw new Error(`stato_animazione: stazione_aperta sconosciuta «${nuovo.stazione_aperta}»`);
    if (!["giusta", "sbagliata"].includes(nuovo.mappatura)) throw new Error(`stato_animazione: mappatura sconosciuta «${nuovo.mappatura}»`);
    if (!Number.isInteger(nuovo.passo) || nuovo.passo < 0 || nuovo.passo > sc.stazioni.length) throw new Error(`stato_animazione: passo fuori scala «${nuovo.passo}»`);
    generazione += 1;
    Object.assign(s, nuovo);
    xPrecedente = xGettone(Math.min(s.passo, sc.stazioni.length));
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { generazione += 1; },
    _prova: { stato: s, percorri: () => percorri(sc, s), esito: () => esito(sc, s, percorri(sc, s)), provaCatena: () => provaCatena(sc, s) },
  };
}
