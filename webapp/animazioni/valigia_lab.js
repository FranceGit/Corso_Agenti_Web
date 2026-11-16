// Lezione interattiva "La valigia del laboratorio" (PO6.1, Officina O6). Un devcontainer.json si compone come una
// valigia: sette oggetti (immagine, feature Docker, macchina, postCreateCommand, porte, segreto, estensioni), ognuno
// con le sue varianti. A sinistra la valigia con il frammento JSON di ogni oggetto, a destra il terminale del codespace
// che si apre riga per riga (sequenza rilanciabile) e mostra che cosa funziona e che cosa manca: Docker assente → O1/O2
// non girano, requisiti non installati → pytest rosso, chiave in containerEnv → bloccante. Sotto la scena gli esiti con
// il perche'; nel pannello destro il devcontainer.json composto e la spiegazione dell'ultimo oggetto toccato. Gioco
// "Trova il difetto": cinque sintomi, un oggetto da sistemare. Tutti i testi e i numeri vengono dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "valigia_lab";
const VISTE = ["valigia", "decidi"];
const LIVELLI = ["ok", "avviso", "errore", "bloccante"];
const W = 720, H = 440;
const VAL = { x: 14, y: 48, w: 340, h: 386, rx0: 26, ry0: 78, passo: 49, rh: 44, rw: 316 };
const TER = { x: 366, y: 48, w: 340, h: 386, ry0: 78, passo: 49 };
const CASO = { x: 20, y0: 56, passo: 74, w: 680, h: 64 };
const COLORE = { ok: "#16a34a", avviso: "#d97706", errore: "#dc2626", bloccante: "#be123c" };
const COLORE_TER = { ok: "#4ade80", avviso: "#fbbf24", errore: "#f87171", bloccante: "#fb7185" };

const STILE = `
.lz-valigia_lab .vl-pulsanti { display: grid; gap: 6px; margin: 8px 0; }
.lz-valigia_lab .vl-pulsanti .btn { justify-content: center; }
.lz-valigia_lab .vl-oggetto { display: grid; gap: 3px; margin: 6px 0; font-size: .8rem; }
.lz-valigia_lab .vl-oggetto > span { font-weight: 700; }
.lz-valigia_lab .vl-codice { margin: 6px 0; padding: 8px 10px; border-radius: 10px; background: #0f172a; color: #e2e8f0; font-family: ui-monospace, Consolas, monospace; font-size: .72rem; line-height: 1.35; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 280px; overflow-y: auto; }
.lz-valigia_lab .vl-codice .vl-segreto { color: #fb7185; font-weight: 700; }
.lz-valigia_lab .vl-nota { font-size: .76rem; color: var(--tenue); margin: 4px 0 0; }
.lz-valigia_lab .vl-spiega { font-size: .82rem; margin-top: 8px; }
.lz-valigia_lab .vl-spiega b { display: block; margin-bottom: 2px; }
.lz-valigia_lab .vl-regola { margin-top: 10px; padding: 8px 10px; border-left: 4px solid #0ea5e9; background: #f0f9ff; border-radius: 0 10px 10px 0; font-weight: 700; font-size: .84rem; }
.lz-valigia_lab .esiti-valigia { margin-top: 10px; border-top: 1px solid #dfe4f0; padding: 10px 4px 2px; }
.lz-valigia_lab .esiti-valigia h4 { margin: 0 0 6px; font-size: .8rem; text-transform: uppercase; letter-spacing: .07em; color: var(--tenue); }
.lz-valigia_lab .vl-conta { font-size: .78rem; color: var(--tenue); margin: 4px 0; }
.lz-valigia_lab .vl-elenco { display: grid; gap: 5px; margin-top: 6px; max-height: 230px; overflow-y: auto; padding-right: 4px; }
.lz-valigia_lab .vl-elenco div { font-size: .78rem; padding: 6px 9px; border-radius: 9px; overflow-wrap: anywhere; }
.lz-valigia_lab .vl-elenco .vl-ok { background: var(--ok-chiaro); color: #166534; }
.lz-valigia_lab .vl-elenco .vl-avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-valigia_lab .vl-elenco .vl-errore { background: var(--male-chiaro); color: #9f1239; }
.lz-valigia_lab .vl-elenco .vl-bloccante { background: #9f1239; color: #fff; font-weight: 700; }
.lz-valigia_lab .vl-scelta { display: grid; gap: 3px; margin: 8px 0; font-size: .82rem; }
.lz-valigia_lab .vl-verifica { display: grid; gap: 6px; }
.lz-valigia_lab .vl-verifica div { font-size: .82rem; padding: 7px 10px; border-radius: 10px; }
.lz-valigia_lab .vl-verifica .vl-giusto { background: var(--ok-chiaro); color: #166534; }
.lz-valigia_lab .vl-verifica .vl-quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-valigia_lab .vl-verifica .vl-sbagliato, .lz-valigia_lab .vl-verifica .vl-vuoto { background: var(--male-chiaro); color: #9f1239; }
.lz-valigia_lab .vl-riga-ter { transition: opacity .25s ease; }
.lz-valigia_lab.vl-ridotto .vl-riga-ter { transition: none; }
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

// ------------------------------------------------------------------ logica (pura)

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
/** Chiavi dello stato che corrispondono agli oggetti della valigia. */
export function chiaviOggetti(sc) {
  return sc.oggetti.map((o) => o.id);
}
/** La variante scelta per un oggetto nello stato dato. */
export function scelto(sc, s, id) {
  const o = sc.oggetti.find((x) => x.id === id);
  if (!o) throw new Error(`oggetto sconosciuto «${id}»`);
  const v = o.valori.find((x) => x.id === s[id]);
  if (!v) throw new Error(`valore sconosciuto «${s[id]}» per l'oggetto ${id}`);
  return v;
}
/** Numeri del piano gratuito per la macchina scelta: quota, core, ore di lavoro (quota ÷ core). */
export function numeri(sc, s) {
  const cpus = scelto(sc, s, "macchina").cpus;
  return { quota: sc.quota_ore_core, cpus, ore: sc.quota_ore_core / cpus };
}
/** Il devcontainer.json composto: nome, poi il JSON di ogni oggetto presente, nell'ordine della valigia. */
export function componi(sc, s) {
  const out = { name: sc.nome_file };
  for (const o of sc.oggetti) {
    const v = scelto(sc, s, o.id);
    if (v.json) Object.assign(out, JSON.parse(JSON.stringify(v.json)));
  }
  return out;
}
export function testoFile(sc, s) {
  return JSON.stringify(componi(sc, s), null, 2);
}
/** Le righe del terminale all'apertura: una per oggetto, con livello, comando, uscita e perche'. */
export function apertura(sc, s) {
  const n = numeri(sc, s);
  return sc.oggetti.map((o) => {
    const v = scelto(sc, s, o.id);
    return { id: o.id, nome: o.nome, livello: v.livello, comando: riempi(o.comando, n), terminale: riempi(v.terminale, n), perche: riempi(v.perche, n) };
  });
}
/** Esame complessivo: conteggi per livello e verdetto (il livello piu' grave presente). */
export function esame(sc, s) {
  const righe = apertura(sc, s);
  const conteggi = Object.fromEntries(LIVELLI.map((l) => [l, righe.filter((r) => r.livello === l).length]));
  const verdetto = [...LIVELLI].reverse().find((l) => conteggi[l] > 0) || "ok";
  return { righe, conteggi, verdetto, testo: sc.testi[`verdetto_${verdetto}`] };
}
/** Riscontro del gioco "Trova il difetto". */
export function verifica(sc, s) {
  const T = sc.testi;
  const nome = (id) => sc.oggetti.find((o) => o.id === id).nome;
  const righe = sc.casi.map((c, i) => {
    const scelta = s.scelte[c.id] || "";
    const esito = !scelta ? "vuoto" : scelta === c.migliore ? "giusto" : c.quasi.includes(scelta) ? "quasi" : "sbagliato";
    return { id: c.id, esito, testo: riempi(T[`ver_${esito}`], { n: i + 1, migliore: nome(c.migliore), spiega: c.spiega }) };
  });
  const giuste = righe.filter((r) => r.esito === "giusto").length;
  return { righe, giuste, totali: righe.length, sintesi: giuste === righe.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righe.length }) };
}
/** Controlla uno stato completo: chiavi note, valori ammessi. Restituisce lo stato normalizzato. */
export function validaStato(sc, base, stato) {
  const ammessi = Object.keys(base);
  for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
  const nuovo = { ...base, ...(stato || {}) };
  nuovo.scelte = { ...(nuovo.scelte || {}) };
  if (!VISTE.includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
  for (const o of sc.oggetti) if (!o.valori.some((v) => v.id === nuovo[o.id])) throw new Error(`stato_animazione: valore sconosciuto «${nuovo[o.id]}» per ${o.id}`);
  for (const [id, r] of Object.entries(nuovo.scelte)) {
    if (!sc.casi.some((c) => c.id === id)) throw new Error(`stato_animazione: sintomo sconosciuto «${id}»`);
    if (!sc.oggetti.some((o) => o.id === r)) throw new Error(`stato_animazione: oggetto sconosciuto «${r}»`);
  }
  if (typeof nuovo.verificato !== "boolean") throw new Error("stato_animazione: verificato deve essere vero o falso");
  return nuovo;
}
export const DIMENSIONI = { w: W, h: H, valigia: VAL, terminale: TER, caso: CASO };

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const lingua = contesto && contesto.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));
  const oggetto = (id) => sc.oggetti.find((o) => o.id === id);

  const s = { vista: VISTE[0], ...sc.riferimento, scelte: {}, verificato: false };
  let ultimo = sc.oggetti[0].id; // oggetto spiegato nel pannello destro (non fa parte dello stato del passo)
  let visibili = sc.oggetti.length; // righe del terminale gia' mostrate
  let timer = [];
  const ferma = () => { for (const t of timer) clearTimeout(t); timer = []; };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...VISTE.map((v) => el("button", { "data-v": v, onclick: () => cambia({ vista: v }, null) }, E[`vista_${v}`])));
  const gruppi = {};
  const zonaValigia = el("div", {});
  for (const o of sc.oggetti) {
    gruppi[o.id] = el("div", { class: "segmentato", role: "group", "aria-label": o.nome },
      ...o.valori.map((v) => el("button", { "data-v": v.id, onclick: () => cambia({ [o.id]: v.id }, o.id) }, v.nome)));
    zonaValigia.append(el("div", { class: "vl-oggetto" }, el("span", {}, o.nome), gruppi[o.id]));
  }
  zonaValigia.append(el("h4", {}, E.preset), el("div", { class: "vl-pulsanti" },
    el("button", { class: "btn", onclick: () => cambia({ ...sc.preset.da_sistemare }, sc.oggetti[0].id, 0) }, E.da_sistemare),
    el("button", { class: "btn", onclick: () => cambia({ ...sc.preset.vuota }, sc.oggetti[0].id, 0) }, E.vuota),
    el("button", { class: "btn btn-primario", onclick: () => cambia({}, null, 0) }, E.riapri)));
  const tendine = {};
  const zonaDecidi = el("div", {});
  sc.casi.forEach((c, i) => {
    const sel = el("select", { "aria-label": riempi(T.scegli_per, { n: i + 1 }), onchange: (e) => scegli(c.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.oggetti.map((o) => el("option", { value: o.id }, o.nome)));
    tendine[c.id] = sel;
    zonaDecidi.append(el("label", { class: "vl-scelta" }, el("span", {}, riempi(T.sintomo, { n: i + 1 })), sel));
  });
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => cambia({ verificato: true }, null) }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaValigia, zonaDecidi);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  const gScena = svgEl("g");
  svg.append(gScena);
  const esiti = el("section", { class: "esiti-valigia", "aria-live": "polite", "aria-label": E.titolo_esiti });
  scena.append(svg, esiti);
  const destra = el("aside", { class: "pannello destra", "aria-live": "polite" });
  const banco = el("div", { class: `banco lz-${COMPONENTE}${ridotto ? " vl-ridotto" : ""}` }, comandi, scena, destra);
  radice.replaceChildren(banco);
  let gTerminale = null;

  function disegnaValigia(g) {
    // maniglia e corpo
    g.append(svgEl("path", { d: `M${VAL.x + VAL.w / 2 - 44} ${VAL.y} v-8 a8 8 0 0 1 8 -8 h72 a8 8 0 0 1 8 8 v8`, fill: "none", stroke: "#7c5a3a", "stroke-width": 5 }),
      svgEl("rect", { x: VAL.x, y: VAL.y, width: VAL.w, height: VAL.h, rx: 16, fill: "#fdf6ec", stroke: "#a16207", "stroke-width": 2.5 }),
      testoSvg({ x: VAL.x + VAL.w / 2, y: VAL.y + 20, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#7c5a3a", "letter-spacing": ".04em" }, E.titolo_valigia));
    sc.oggetti.forEach((o, i) => {
      const v = scelto(sc, s, o.id);
      const x = VAL.rx0, y = VAL.ry0 + i * VAL.passo;
      const presente = Boolean(v.frammento);
      const gr = svgEl("g", { "data-oggetto": o.id });
      gr.append(svgEl("rect", { x, y, width: VAL.rw, height: VAL.rh, rx: 9, fill: presente ? "#fff" : "#fbf3e6", stroke: presente ? "#d6c3a5" : "#c9b38f", "stroke-width": o.id === ultimo ? 2.4 : 1.2, "stroke-dasharray": presente ? "" : "5 4" }),
        svgEl("circle", { cx: x + VAL.rw - 12, cy: y + 12, r: 5.5, fill: COLORE[v.livello] }),
        testoSvg({ x: x + 10, y: y + 14, "font-size": 10, "font-weight": 800, fill: "#3f2d1c" }, riempi(T.titolo_riga, { oggetto: o.nome, valore: v.nome })));
      if (presente) aCapo(v.frammento, sc.a_capo_frammento).slice(0, 2).forEach((r, k) => gr.append(testoSvg({ x: x + 10, y: y + 27 + k * 11, "font-size": 8.5, "font-family": "ui-monospace, Consolas, monospace", fill: v.livello === "bloccante" ? "#be123c" : "#334155" }, r)));
      else gr.append(testoSvg({ x: x + 10, y: y + 30, "font-size": 9, "font-style": "italic", fill: "#a16207" }, E.vuoto));
      g.append(gr);
      if (o.id === ultimo && !ridotto && gr.animate) gr.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 350 });
    });
  }
  function disegnaTerminale() {
    gTerminale.replaceChildren();
    const g = gTerminale;
    g.append(svgEl("rect", { x: TER.x, y: TER.y, width: TER.w, height: TER.h, rx: 14, fill: "#0f172a" }),
      svgEl("rect", { x: TER.x, y: TER.y, width: TER.w, height: 24, rx: 14, fill: "#1e293b" }),
      ...["#f87171", "#fbbf24", "#4ade80"].map((c, k) => svgEl("circle", { cx: TER.x + 14 + k * 12, cy: TER.y + 12, r: 4, fill: c })),
      testoSvg({ x: TER.x + TER.w / 2 + 18, y: TER.y + 16, "text-anchor": "middle", "font-size": 10.5, "font-weight": 800, fill: "#cbd5e1", "letter-spacing": ".04em" }, E.titolo_terminale));
    apertura(sc, s).forEach((r, i) => {
      const y = TER.ry0 + i * TER.passo;
      const vista = i < visibili;
      const gr = svgEl("g", { class: "vl-riga-ter", opacity: vista ? 1 : 0.35, "data-riga": r.id });
      gr.append(testoSvg({ x: TER.x + 14, y: y + 10, "font-size": 9, "font-family": "ui-monospace, Consolas, monospace", fill: "#94a3b8" }, r.comando));
      if (vista) {
        gr.append(svgEl("circle", { cx: TER.x + 18, cy: y + 22, r: 3.5, fill: COLORE_TER[r.livello] }));
        aCapo(r.terminale, sc.a_capo_terminale).slice(0, 2).forEach((riga, k) => gr.append(testoSvg({ x: TER.x + 28, y: y + 25 + k * 12, "font-size": 9.5, "font-weight": r.livello === "bloccante" ? 800 : 500, fill: COLORE_TER[r.livello] }, riga)));
      } else gr.append(testoSvg({ x: TER.x + 28, y: y + 25, "font-size": 9.5, fill: "#64748b" }, E.in_apertura));
      g.append(gr);
    });
  }
  function disegnaDecidi(g) {
    g.append(testoSvg({ x: W / 2, y: 30, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".05em" }, E.titolo_decidi));
    const v = s.verificato ? verifica(sc, s) : null;
    sc.casi.forEach((c, i) => {
      const y = CASO.y0 + i * CASO.passo;
      const scelta = s.scelte[c.id];
      const esito = v ? v.righe[i].esito : null;
      const bordo = esito === "giusto" ? "#16a34a" : esito === "quasi" ? "#d97706" : esito ? "#dc2626" : scelta ? "#0ea5e9" : "#cbd2e3";
      g.append(svgEl("rect", { x: CASO.x, y, width: CASO.w, height: CASO.h, rx: 12, fill: "#fff", stroke: bordo, "stroke-width": esito ? 2.2 : 1.5 }),
        testoSvg({ x: CASO.x + 12, y: y + 18, "font-size": 10.5, "font-weight": 800, fill: "#0369a1" }, riempi(T.sintomo, { n: i + 1 })));
      aCapo(c.testo, sc.a_capo_sintomo).slice(0, 2).forEach((r, k) => g.append(testoSvg({ x: CASO.x + 12, y: y + 35 + k * 14, "font-size": 10.5, fill: "#17203b" }, r)));
      if (scelta) g.append(testoSvg({ x: CASO.x + CASO.w - 12, y: y + 18, "text-anchor": "end", "font-size": 10, "font-weight": 800, fill: bordo }, oggetto(scelta).nome));
    });
  }
  function disegnaScena() {
    gScena.replaceChildren();
    if (s.vista === "decidi") { gTerminale = null; disegnaDecidi(gScena); return; }
    disegnaValigia(gScena);
    gTerminale = svgEl("g");
    gScena.append(gTerminale);
    disegnaTerminale();
  }
  function disegnaEsiti() {
    if (s.vista === "decidi") {
      esiti.replaceChildren(el("h4", {}, E.titolo_verifica), el("p", { class: "vl-nota" }, s.verificato ? verifica(sc, s).sintesi : T.nota_decidi));
      return;
    }
    const e = esame(sc, s);
    const classe = { ok: "ok", avviso: "avviso", errore: "male", bloccante: "male" }[e.verdetto];
    const ordine = [...e.righe].sort((a, b) => LIVELLI.indexOf(b.livello) - LIVELLI.indexOf(a.livello));
    esiti.replaceChildren(el("h4", {}, E.titolo_esiti),
      el("div", { class: `esito-scheda ${classe}` }, el("div", {}, e.testo)),
      el("p", { class: "vl-conta" }, riempi(T.conta, { ok: e.conteggi.ok, avvisi: e.conteggi.avviso, errori: e.conteggi.errore, bloccanti: e.conteggi.bloccante })),
      el("div", { class: "vl-elenco" }, ...ordine.map((r) => el("div", { class: `vl-${r.livello}` }, riempi(T.riga_esito, { livello: E[`livello_${r.livello}`], nome: r.nome, perche: r.perche })))));
  }
  function disegnaDestra() {
    const figli = [];
    if (s.vista === "decidi") {
      figli.push(el("h3", {}, E.titolo_verifica));
      if (s.verificato) {
        const v = verifica(sc, s);
        figli.push(el("div", { class: "vl-verifica" },
          el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
          ...v.righe.map((r) => el("div", { class: `vl-${r.esito}` }, r.testo))));
      } else figli.push(el("p", { class: "vl-nota" }, T.nota_decidi));
    } else {
      const codice = el("pre", { class: "vl-codice" });
      // valori scritti in chiaro (variante bloccante del segreto): le righe che li contengono si colorano
      const vs = scelto(sc, s, "segreto");
      const inChiaro = vs.livello === "bloccante" && vs.json ? Object.values(vs.json).flatMap((x) => Object.values(x)).filter((x) => typeof x === "string") : [];
      for (const riga of testoFile(sc, s).split("\n")) {
        const segreta = inChiaro.some((x) => riga.includes(JSON.stringify(x)));
        codice.append(segreta ? el("span", { class: "vl-segreto" }, riga) : riga, "\n");
      }
      const o = oggetto(ultimo);
      figli.push(el("h3", {}, E.titolo_file), codice, el("p", { class: "vl-nota" }, T.nota_file),
        el("div", { class: "vl-spiega" }, el("b", {}, riempi(E.titolo_spiega, { nome: o.nome })), riempi(o.spiega, numeri(sc, s))));
    }
    figli.push(el("div", { class: "vl-regola" }, E.regola));
    destra.replaceChildren(...figli);
  }
  function aggiornaComandi() {
    const premi = (gruppo, valore) => gruppo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === valore)));
    premi(segVista, s.vista);
    for (const o of sc.oggetti) premi(gruppi[o.id], s[o.id]);
    zonaValigia.classList.toggle("nascosto", s.vista !== "valigia");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }
  // sequenza: il terminale si riapre dalla riga `da` in poi, una riga alla volta
  function apri(da) {
    ferma();
    if (s.vista !== "valigia" || ridotto) { visibili = sc.oggetti.length; if (gTerminale) disegnaTerminale(); return; }
    visibili = Math.max(0, Math.min(da, sc.oggetti.length));
    disegnaTerminale();
    const passo = () => {
      visibili += 1;
      if (gTerminale) disegnaTerminale();
      if (visibili < sc.oggetti.length) timer.push(setTimeout(passo, sc.ms_riga));
    };
    if (visibili < sc.oggetti.length) timer.push(setTimeout(passo, sc.ms_riga));
  }
  function ridisegna(da) { aggiornaComandi(); disegnaScena(); disegnaEsiti(); disegnaDestra(); apri(da); }
  function cambia(diff, toccato, da) {
    Object.assign(s, diff);
    if (!("verificato" in diff)) s.verificato = false;
    if (toccato) ultimo = toccato;
    const indice = toccato ? chiaviOggetti(sc).indexOf(toccato) : sc.oggetti.length;
    ridisegna(da !== undefined ? da : indice);
  }
  function scegli(id, valore) {
    const scelte = { ...s.scelte };
    if (valore) scelte[id] = valore; else delete scelte[id];
    cambia({ scelte }, null);
  }
  function applica(stato) {
    const nuovo = validaStato(sc, s, stato);
    Object.assign(s, nuovo);
    ultimo = sc.oggetti[0].id;
    ridisegna(0);
  }
  applica({});
  return {
    applica,
    distruggi() { ferma(); },
    _prova: { stato: s, esame: () => esame(sc, s), componi: () => componi(sc, s), verifica: () => verifica(sc, s), visibili: () => visibili },
  };
}
