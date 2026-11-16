// Lezione interattiva "Dove si nasconde un dato" (P5.5): privacy e qualita' della memoria di un agente CRM.
// Vista "copie": il cellulare personale di un contatto entra una volta e finisce in 5 contenitori (memoria,
// indice vettoriale, log delle sessioni, cache, riassunto di campagna: elenco del corso, illustrativo).
// Comandi: oscuramento dei dati personali prima di salvare, rinuncia ai ricordi (opt-out), dove cancellare e
// bottone "Diritto all'oblio" (onda che attraversa i contenitori), scadenza automatica (TTL) con i mesi che
// passano, revoca di una fonte (cancella tutto cio' che e' toccato / rigenera dalle fonti rimaste, con costo).
// Vista "clienti": due archivi separati da un muro (isolamento per cliente) e un'email ostile che prova ad
// avvelenare la memoria (verifica prima di salvare, provenienza tracciata). Tutti i testi dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "dove_dato";
const W = 720, H = 412;
const VISTE = ["copie", "clienti"];
const REVOCHE = ["nessuna", "tutto", "rigenera"];
const BOX = { x: 300, w: 404, h: 56, y0: 60, passo: 68 };

const STILE = `
.lz-dove_dato .contenitore { transition: opacity .5s ease; }
.lz-dove_dato .battuta { display: grid; gap: 6px; font-size: .85rem; }
.lz-dove_dato .battuta blockquote { margin: 0; padding: 8px 10px; border-left: 4px solid #c7d2fe; background: #f7f8fe; border-radius: 0 10px 10px 0; }
.lz-dove_dato .battuta blockquote.male { border-left-color: #e11d48; background: #fdecef; }
.lz-dove_dato .battuta blockquote.ok { border-left-color: #16a34a; background: #e8f8ee; }
.lz-dove_dato .etichetta-piccola { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--tenue-2, #7a849e); margin-top: 6px; }
.lz-dove_dato .nota { font-size: .76rem; color: var(--tenue); margin: 4px 0 0; }
.lz-dove_dato .ricordi { display: grid; gap: 4px; }
.lz-dove_dato .ricordi div { font-size: .78rem; padding: 4px 8px; border-radius: 8px; background: #f3f5fb; }
.lz-dove_dato .ricordi div.cancellato { text-decoration: line-through; color: #9f1239; background: #fdecef; }
.lz-dove_dato .ricordi div.rigenerato { background: #eef0ff; }
.lz-dove_dato .bottoni { display: flex; gap: 6px; margin-top: 8px; }
.lz-dove_dato .bottoni .btn { flex: 1 1 auto; justify-content: center; }
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

/** Stato di ogni contenitore: c'e' ancora il dato di Marco? in chiaro? cancellato dalla richiesta? scaduto? */
export function contenitori(sc, s) {
  return sc.contenitori.map((c) => {
    const entrato = !(c.id === "memoria" && s.optout);
    const scaduto = entrato && s.ttl && s.mesi >= c.scadenza_mesi;
    const cancellato = entrato && s.oblio && s.cancella.includes(c.id);
    const presente = entrato && !scaduto && !cancellato;
    return { id: c.id, entrato, scaduto, cancellato, presente, personale: presente && !s.oscuramento, testo: !entrato ? sc.testi.vuoto : s.oscuramento ? c.oscurato : c.chiaro };
  });
}

/** Le due prove: Marco richiama (la memoria serve) e un collega chiede il cellulare personale (la fuga). */
export function prove(sc, s) {
  const T = sc.testi;
  const st = contenitori(sc, s);
  const nome = (id) => sc.contenitori.find((c) => c.id === id).nome;
  const mem = st.find((c) => c.id === "memoria");
  let richiama;
  if (mem.presente) richiama = { testo: T.richiama_ricorda, esito: "ok" };
  else if (mem.cancellato) richiama = { testo: T.richiama_oblio, esito: "ok" };
  else if (s.optout) richiama = { testo: T.richiama_optout, esito: "ok" };
  else richiama = { testo: T.richiama_scaduto, esito: "neutro" };
  const fughe = st.filter((c) => c.personale).map((c) => nome(c.id));
  const collega = fughe.length
    ? { testo: riempi(T.collega_trova, { dove: fughe.join(", "), numero: sc.numero }), esito: "male", dove: fughe }
    : { testo: T.collega_niente, esito: "ok", dove: [] };
  const rimaste = st.filter((c) => c.presente).map((c) => nome(c.id));
  let oblio = null;
  if (s.oblio) oblio = rimaste.length ? { testo: riempi(T.oblio_resta, { n: rimaste.length, dove: rimaste.join(", ") }), esito: "male" } : { testo: T.oblio_ovunque, esito: "ok" };
  return { richiama, collega, oblio, rimaste: rimaste.length };
}

/** Revoca della fonte "modulo web": cancella tutto cio' che ne deriva, oppure rigenera dalle fonti rimaste. */
export function revoca(sc, s) {
  const out = sc.ricordi_marco.map((r) => {
    const toccato = r.fonti.includes(sc.fonte_revocata);
    const altre = r.fonti.filter((f) => f !== sc.fonte_revocata);
    let stato = "tenuto";
    if (s.optout) stato = "assente";
    else if (s.revoca === "tutto" && toccato) stato = "cancellato";
    else if (s.revoca === "rigenera" && toccato) stato = altre.length ? "rigenerato" : "cancellato";
    return { id: r.id, stato, valido_perso: stato === "cancellato" && altre.length > 0 };
  });
  return {
    ricordi: out,
    persi_validi: out.filter((r) => r.valido_perso).length,
    costo: out.filter((r) => r.stato === "rigenerato").length * sc.costo_rigenera,
  };
}

/** Vista clienti: risposta al cliente B (isolamento) e preventivo per il cliente A (avvelenamento). */
export function clienti(sc, s) {
  const T = sc.testi;
  const archA = [...sc.cliente_a.ricordi.map((r) => ({ ...r, avvelenato: false }))];
  const veleno = !s.verifica;
  if (veleno) archA.push({ id: "veleno", testo: sc.email_ostile.ricordo, fonte: sc.email_ostile.fonte, avvelenato: true });
  return {
    archivio_a: archA,
    archivio_b: sc.cliente_b.ricordi,
    risposta_b: s.isolamento ? { testo: T.risposta_b_isolata, esito: "ok", fuga: false } : { testo: T.risposta_b_fuga, esito: "male", fuga: true },
    preventivo_a: veleno ? { testo: T.preventivo_avvelenato, esito: "male", avvelenato: true } : { testo: T.preventivo_pulito, esito: "ok", avvelenato: false },
    anomalia: !veleno,
  };
}

/** Riquadri dei contenitori nella scena. */
export function posizioni(sc) {
  const pos = {};
  sc.contenitori.forEach((c, i) => { pos[c.id] = { x: BOX.x, y: BOX.y0 + i * BOX.passo, w: BOX.w, h: BOX.h }; });
  return pos;
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  if (!contesto || !contesto.lingua) throw new Error("contesto.lingua mancante");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));
  const idCont = sc.contenitori.map((c) => c.id);

  const s = {
    vista: "copie", oscuramento: false, optout: false, ttl: false, mesi: 0, cancella: ["memoria"], oblio: false,
    revoca: "nessuna", isolamento: true, verifica: true,
  };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...VISTE.map((v) => el("button", { "data-v": v, onclick: () => cambia({ vista: v }) }, E[`vista_${v}`])));
  const interruttore = (chiave, testo, pericolo) => {
    const inp = el("input", { type: "checkbox", "aria-label": testo, onchange: (e) => cambia({ [chiave]: e.target.checked }) });
    return { inp, nodo: el("label", { class: `interruttore${pericolo ? " pericolo" : ""}` }, el("span", {}, testo), inp) };
  };
  const iOsc = interruttore("oscuramento", E.oscuramento);
  const iOpt = interruttore("optout", E.optout);
  const iTtl = interruttore("ttl", E.ttl);
  const iIso = interruttore("isolamento", E.isolamento);
  const iVer = interruttore("verifica", E.verifica);
  const inCanc = {};
  const zonaCanc = el("div", {});
  for (const c of sc.contenitori) {
    inCanc[c.id] = el("input", { type: "checkbox", "aria-label": riempi(T.cancella_da, { dove: c.nome }), onchange: (e) => cambia({ cancella: e.target.checked ? [...s.cancella, c.id] : s.cancella.filter((x) => x !== c.id) }) });
    zonaCanc.append(el("label", { class: "interruttore" }, el("span", {}, c.nome), inCanc[c.id]));
  }
  const btnOblio = el("button", { class: "btn btn-primario", onclick: () => cambia({ oblio: true }) }, E.oblio);
  const btnRipristina = el("button", { class: "btn", onclick: () => cambia({ oblio: false }) }, E.ripristina);
  const valoreMesi = el("b", {});
  const inMesi = el("input", { type: "range", min: 0, max: sc.mesi_max, step: 1, "aria-label": E.mesi });
  inMesi.addEventListener("input", () => cambia({ mesi: Number(inMesi.value) }));
  const segRevoca = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.revoca },
    ...REVOCHE.map((r) => el("button", { "data-v": r, onclick: () => cambia({ revoca: r }) }, E[`revoca_${r}`])));
  const zonaCopie = el("div", {}, el("h4", {}, E.ingresso), iOsc.nodo, iOpt.nodo,
    el("h4", {}, E.dove_cancellare), zonaCanc, el("div", { class: "bottoni" }, btnOblio, btnRipristina),
    el("h4", {}, E.tempo), iTtl.nodo, el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, E.mesi), valoreMesi), inMesi),
    el("h4", {}, E.revoca), segRevoca);
  const zonaClienti = el("div", {}, el("h4", {}, E.ingresso), iIso.nodo, iVer.nodo, el("p", { class: "nota" }, T.nota_clienti));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaCopie, zonaClienti);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs><filter id="dd-ombra" x="-10%" y="-20%" width="120%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#17203b" flood-opacity=".12"/></filter><marker id="dd-freccia" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#64748b"/></marker></defs>`;
  const titolo = testoSvg({ x: W / 2, y: 24, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, "");
  const gScena = svgEl("g");
  const onda = svgEl("rect", { x: 0, y: 50, width: 26, height: 350, rx: 13, fill: "#16a34a", opacity: 0 });
  svg.append(titolo, gScena, onda);
  scena.append(svg);

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  const corpo = el("div", { class: "battuta", "aria-live": "polite" });
  destra.append(el("h3", {}, E.titolo_destra), corpo);
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  let oblioPrima = false;

  function disegnaCopie() {
    titolo.textContent = E.titolo_copie;
    const st = contenitori(sc, s);
    const pos = posizioni(sc);
    const g = svgEl("g");
    // il dato che entra
    const ing = svgEl("g", { transform: "translate(14,150)" });
    ing.append(svgEl("rect", { width: 200, height: 112, rx: 12, fill: "#fff", stroke: "#cbd2e3", "stroke-width": 1.4, filter: "url(#dd-ombra)" }));
    ing.append(testoSvg({ x: 12, y: 22, "font-size": 10.5, "font-weight": 800, fill: "#17203b" }, sc.contatto));
    sc.frase_ingresso.forEach((riga, i) => ing.append(testoSvg({ x: 12, y: 44 + i * 16, "font-size": 9.8, fill: "#334155" }, riga)));
    ing.append(testoSvg({ x: 12, y: 100, "font-size": 9.5, "font-weight": 800, fill: s.oscuramento ? "#16a34a" : "#be123c" }, s.oscuramento ? E.badge_oscurato : E.badge_chiaro));
    g.append(ing);
    // cancello dell'ingresso
    g.append(svgEl("rect", { x: 236, y: 120, width: 34, height: 172, rx: 10, fill: s.oscuramento ? "#e8f8ee" : "#f1f5f9", stroke: s.oscuramento ? "#16a34a" : "#cbd2e3" }));
    g.append(testoSvg({ x: 253, y: 112, "text-anchor": "middle", "font-size": 9, "font-weight": 800, fill: "#5b6684" }, E.cancello));
    for (const c of st) {
      const p = pos[c.id];
      const info = sc.contenitori.find((x) => x.id === c.id);
      g.append(svgEl("line", { x1: 270, y1: 206, x2: p.x - 4, y2: p.y + p.h / 2, stroke: "#94a3b8", "stroke-width": 1.2, "stroke-dasharray": c.entrato ? "" : "3 4", "marker-end": "url(#dd-freccia)" }));
      const gb = svgEl("g", { class: "contenitore", transform: `translate(${p.x},${p.y})`, opacity: c.scaduto ? 0.3 : 1 });
      const rosso = s.oblio && c.presente;
      const fondo = c.cancellato ? "#e8f8ee" : rosso ? "#fdecef" : "#fff";
      const bordo = c.cancellato ? "#16a34a" : rosso ? "#e11d48" : c.personale ? "#f59e0b" : "#cbd2e3";
      gb.append(svgEl("rect", { width: p.w, height: p.h, rx: 11, fill: fondo, stroke: bordo, "stroke-width": rosso || c.cancellato ? 2.4 : 1.5, filter: "url(#dd-ombra)" }));
      gb.append(testoSvg({ x: 12, y: 20, "font-size": 11, "font-weight": 800, fill: "#17203b" }, info.nome));
      const riga = c.cancellato ? E.stato_cancellato : c.scaduto ? riempi(T.stato_scaduto, { mesi: info.scadenza_mesi }) : c.testo;
      gb.append(testoSvg({ x: 12, y: 40, "font-size": 9.8, fill: c.personale ? "#be123c" : "#475569", "font-weight": c.personale ? 800 : 500 }, accorcia(riga, 66)));
      if (rosso) gb.append(testoSvg({ x: p.w - 12, y: 20, "text-anchor": "end", "font-size": 10, "font-weight": 900, fill: "#e11d48" }, E.copia_rimasta));
      if (c.cancellato) gb.append(testoSvg({ x: p.w - 12, y: 20, "text-anchor": "end", "font-size": 10, "font-weight": 900, fill: "#16a34a" }, "✓"));
      if (s.ttl) gb.append(testoSvg({ x: p.w - 12, y: 40, "text-anchor": "end", "font-size": 8.8, fill: "#7a849e" }, riempi(T.scade_dopo, { mesi: info.scadenza_mesi })));
      g.append(gb);
    }
    gScena.replaceChildren(g);
    if (s.oblio && !oblioPrima && !ridotto) {
      onda.animate([{ opacity: 0.0, transform: "translateX(260px)" }, { opacity: 0.35, transform: "translateX(440px)" }, { opacity: 0, transform: "translateX(700px)" }], { duration: 900, easing: "ease-out" });
    }
    oblioPrima = s.oblio;
  }

  function cartaSvg(x, y, w, testo, sotto, colore, rosso) {
    const g = svgEl("g", { transform: `translate(${x},${y})` });
    g.append(svgEl("rect", { width: w, height: 40, rx: 9, fill: rosso ? "#fdecef" : "#fff", stroke: colore, "stroke-width": rosso ? 2.2 : 1.4, filter: "url(#dd-ombra)" }));
    g.append(testoSvg({ x: 10, y: 17, "font-size": 10, "font-weight": 800, fill: rosso ? "#be123c" : "#17203b" }, accorcia(testo, 44)));
    g.append(testoSvg({ x: 10, y: 32, "font-size": 8.8, fill: rosso ? "#be123c" : "#7a849e", "font-weight": 700 }, accorcia(sotto, 50)));
    return g;
  }

  function disegnaClienti() {
    titolo.textContent = E.titolo_clienti;
    const c = clienti(sc, s);
    const g = svgEl("g");
    const arch = [[20, sc.cliente_a, c.archivio_a, "#2563eb"], [400, sc.cliente_b, c.archivio_b, "#0d9488"]];
    for (const [x, cli, carte, col] of arch) {
      g.append(svgEl("rect", { x, y: 92, width: 300, height: 220, rx: 14, fill: "#f8fafc", stroke: col, "stroke-width": 1.5 }));
      g.append(testoSvg({ x: x + 150, y: 112, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: col }, cli.nome));
      carte.forEach((r, i) => g.append(cartaSvg(x + 12, 124 + i * 46, 276, r.testo, r.avvelenato ? riempi(T.badge_veleno, { fonte: r.fonte }) : riempi(T.badge_fonte, { fonte: r.fonte }), r.avvelenato ? "#e11d48" : col, r.avvelenato)));
    }
    // il muro
    if (s.isolamento) {
      for (let i = 0; i < 9; i++) g.append(svgEl("rect", { x: 334 + (i % 2) * 8, y: 92 + i * 24.4, width: 44, height: 22, rx: 3, fill: "#b45309", opacity: 0.85 }));
      g.append(testoSvg({ x: 360, y: 330, "text-anchor": "middle", "font-size": 9.5, "font-weight": 800, fill: "#92400e" }, E.muro));
    } else {
      g.append(svgEl("line", { x1: 356, y1: 92, x2: 356, y2: 312, stroke: "#e11d48", "stroke-width": 2, "stroke-dasharray": "5 6" }));
      g.append(svgEl("path", { d: "M300,146 C350,146 360,360 470,362", fill: "none", stroke: "#e11d48", "stroke-width": 2, "marker-end": "url(#dd-freccia)" }));
      g.append(testoSvg({ x: 360, y: 330, "text-anchor": "middle", "font-size": 9.5, "font-weight": 800, fill: "#be123c" }, E.muro_spento));
    }
    // l'email ostile e il controllo all'ingresso
    g.append(cartaSvg(20, 44, 300, sc.email_ostile.testo, riempi(T.badge_fonte, { fonte: sc.email_ostile.fonte }), "#f59e0b", false));
    g.append(testoSvg({ x: 334, y: 70, "font-size": 18, "font-weight": 900, fill: c.anomalia ? "#16a34a" : "#e11d48" }, c.anomalia ? "✕" : "↓"));
    g.append(testoSvg({ x: 356, y: 70, "font-size": 9.5, "font-weight": 800, fill: c.anomalia ? "#166534" : "#be123c" }, c.anomalia ? E.scartata : E.salvata));
    // le due risposte
    g.append(cartaSvg(20, 350, 300, E.preventivo_breve, c.preventivo_a.avvelenato ? E.preventivo_male : E.preventivo_ok, c.preventivo_a.avvelenato ? "#e11d48" : "#16a34a", c.preventivo_a.avvelenato));
    g.append(cartaSvg(400, 350, 300, E.risposta_b_breve, c.risposta_b.fuga ? E.risposta_b_male : E.risposta_b_ok, c.risposta_b.fuga ? "#e11d48" : "#16a34a", c.risposta_b.fuga));
    gScena.replaceChildren(g);
  }

  function disegnaDestra() {
    const figli = [];
    if (s.vista === "copie") {
      const p = prove(sc, s);
      figli.push(el("div", { class: "etichetta-piccola" }, E.prova_richiama), el("blockquote", { class: p.richiama.esito === "ok" ? "ok" : "" }, p.richiama.testo),
        el("div", { class: "etichetta-piccola" }, E.prova_collega), el("blockquote", { class: p.collega.esito }, p.collega.testo));
      if (p.oblio) figli.push(el("div", { class: `esito-scheda ${p.oblio.esito}` }, el("div", {}, p.oblio.testo)));
      const rv = revoca(sc, s);
      figli.push(el("div", { class: "etichetta-piccola" }, E.ricordi_marco),
        el("div", { class: "ricordi" }, ...rv.ricordi.map((r) => {
          const info = sc.ricordi_marco.find((x) => x.id === r.id);
          const testo = info.personale && s.oscuramento ? info.testo_oscurato : info.testo;
          return el("div", { class: r.stato }, `${r.stato === "assente" ? "— " : ""}${testo} · ${info.fonti.map((f) => sc.nomi_fonti[f]).join(" + ")}`);
        })),
        el("p", { class: "nota" }, s.optout ? T.nota_optout : riempi(T.nota_revoca, { persi: rv.persi_validi, costo: rv.costo })));
    } else {
      const c = clienti(sc, s);
      figli.push(el("div", { class: "etichetta-piccola" }, E.domanda_b), el("blockquote", {}, T.domanda_b),
        el("div", { class: "etichetta-piccola" }, E.risposta_agente), el("blockquote", { class: c.risposta_b.esito }, c.risposta_b.testo),
        el("div", { class: "etichetta-piccola" }, E.settimana_dopo), el("blockquote", { class: c.preventivo_a.esito }, c.preventivo_a.testo),
        el("p", { class: "nota" }, c.anomalia ? T.nota_anomalia : T.nota_veleno));
    }
    corpo.replaceChildren(...figli);
    if (!ridotto) corpo.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 250 });
  }

  function aggiornaComandi() {
    segVista.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.vista)));
    segRevoca.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.revoca)));
    iOsc.inp.checked = s.oscuramento; iOpt.inp.checked = s.optout; iTtl.inp.checked = s.ttl;
    iIso.inp.checked = s.isolamento; iVer.inp.checked = s.verifica;
    for (const id of idCont) inCanc[id].checked = s.cancella.includes(id);
    inMesi.value = s.mesi;
    valoreMesi.textContent = riempi(T.mesi_valore, { n: s.mesi });
    btnRipristina.disabled = !s.oblio;
    zonaCopie.classList.toggle("nascosto", s.vista !== "copie");
    zonaClienti.classList.toggle("nascosto", s.vista !== "clienti");
  }

  function ridisegna() {
    aggiornaComandi();
    if (s.vista === "copie") disegnaCopie(); else disegnaClienti();
    disegnaDestra();
  }
  function cambia(diff) {
    Object.assign(s, diff);
    ridisegna();
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    if (!VISTE.includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!REVOCHE.includes(nuovo.revoca)) throw new Error(`stato_animazione: revoca sconosciuta «${nuovo.revoca}»`);
    if (!(nuovo.mesi >= 0 && nuovo.mesi <= sc.mesi_max)) throw new Error(`stato_animazione: mesi fuori scala «${nuovo.mesi}»`);
    for (const c of nuovo.cancella) if (!idCont.includes(c)) throw new Error(`stato_animazione: contenitore sconosciuto «${c}»`);
    Object.assign(s, nuovo, { cancella: [...nuovo.cancella] });
    oblioPrima = s.oblio;
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo */ },
    _prova: { stato: s, contenitori: () => contenitori(sc, s), prove: () => prove(sc, s), clienti: () => clienti(sc, s) },
  };
}
