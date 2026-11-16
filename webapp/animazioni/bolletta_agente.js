// Lezione interattiva "La bolletta dell'agente" (P8.5). Cruscotto manipolabile: compiti al mese, token in ingresso
// per chiamata, chiamate per compito, modello piccolo/medio/grande (prezzi d'esempio dichiarati illustrativi),
// uno per tutti o uno per ruolo (classifica, email, offerta), cache della parte ripetuta (e la data in testa che la
// annulla). La bolletta ha due righe: chiamate al modello e rilavorazioni (gli errori da rifare, che dipendono dalla
// qualita' del modello sul ruolo e dalle chiamate mancanti). Si vede il risparmio vero (cache, modello giusto per
// ruolo, meno giri a vuoto) e il falso risparmio (modello troppo piccolo, troppo pochi giri). Gioco "Decidi tu" su
// cinque proposte. Tutti i testi e i numeri vengono dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "bolletta_agente";
const VISTE = ["cruscotto", "decidi"];
const MODALITA = ["unico", "ruoli"];
const W = 720, H = 420;
const RUOLO = { x0: 24, passo: 158, y: 70, w: 140, h: 120 };
const BARRE = { x: 520, y: 70, w: 176, h: 300, larghezza: 60, scarto: 30 };
const CASO = { x: 20, y0: 62, passo: 70, w: 680, h: 60, caratteri: 92 };

const STILE = `
.lz-bolletta_agente .bolletta { display: grid; gap: 6px; font-size: .84rem; }
.lz-bolletta_agente .bolletta .riga { display: flex; justify-content: space-between; gap: 8px; }
.lz-bolletta_agente .bolletta .rientro { padding-left: 12px; color: var(--tenue); font-size: .8rem; }
.lz-bolletta_agente .bolletta b { font-variant-numeric: tabular-nums; }
.lz-bolletta_agente .bolletta .totale { border-top: 2px solid #17203b; padding-top: 6px; font-size: 1.05rem; }
.lz-bolletta_agente .bolletta .totale b { font-size: 1.3rem; }
.lz-bolletta_agente .rossa { color: #e11d48; }
.lz-bolletta_agente .verde { color: #16a34a; }
.lz-bolletta_agente .nota { font-size: .76rem; color: var(--tenue); margin: 4px 0 0; }
.lz-bolletta_agente .esito { padding: 7px 10px; border-radius: 10px; font-weight: 600; font-size: .82rem; margin-top: 8px; }
.lz-bolletta_agente .esito.ok { background: var(--ok-chiaro); color: #166534; }
.lz-bolletta_agente .esito.avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-bolletta_agente .esito.male { background: var(--male-chiaro); color: #9f1239; }
.lz-bolletta_agente .regola { margin-top: 10px; padding: 8px 10px; border-left: 4px solid #8b5cf6; background: #f5f3ff; border-radius: 0 10px 10px 0; font-weight: 700; font-size: .84rem; }
.lz-bolletta_agente .ruolo-comando { display: grid; gap: 3px; margin: 6px 0; font-size: .8rem; }
.lz-bolletta_agente .scelta-gioco { display: grid; gap: 3px; margin: 8px 0; font-size: .82rem; }
.lz-bolletta_agente .verifica { display: grid; gap: 6px; }
.lz-bolletta_agente .verifica .riga { font-size: .82rem; padding: 7px 10px; border-radius: 10px; }
.lz-bolletta_agente .verifica .giusto { background: var(--ok-chiaro); color: #166534; }
.lz-bolletta_agente .verifica .quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-bolletta_agente .verifica .sbagliato, .lz-bolletta_agente .verifica .vuoto { background: var(--male-chiaro); color: #9f1239; }
.lz-bolletta_agente .barra-anim { transition: height .5s ease, y .5s ease; }
.lz-bolletta_agente.ridotto .barra-anim { transition: none; }
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

// ------------------------------------------------------------------ logica (pura)

/** Modello usato da un ruolo nello stato dato. */
export function modelloDi(s, ruolo) {
  return s.modalita === "unico" ? s.modello_unico : s.modelli_ruolo[ruolo];
}
/** Token in ingresso pagati a prezzo pieno equivalente: con la cache la parte ripetuta costa una frazione. */
export function tokenIngressoEffettivi(sc, s) {
  const attiva = s.cache && !s.data_in_testa;
  return attiva ? s.token * (1 - sc.cache.quota_ripetuta * (1 - sc.cache.rapporto_prezzo)) : s.token;
}
/** Qualita' (in %) di un ruolo: dipende dal modello e cala per ogni chiamata che manca al lavoro. */
export function qualita(sc, s, ruolo) {
  const r = sc.ruoli.find((x) => x.id === ruolo);
  const mancanti = Math.max(0, sc.chiamate_necessarie - s.chiamate);
  return Math.max(0, r.qualita[modelloDi(s, ruolo)] - mancanti * sc.penalita_per_chiamata_mancante);
}
/**
 * La bolletta del mese: costo delle chiamate al modello (con il risparmio della cache), rilavorazioni (errori per
 * il loro costo), totale, costo per compito, token al mese, attesa per compito e dettaglio per ruolo.
 */
export function bolletta(sc, s) {
  const prezzi = Object.fromEntries(sc.modelli.map((m) => [m.id, m]));
  const tIn = tokenIngressoEffettivi(sc, s);
  let modello = 0, senzaCache = 0, rilavorazioni = 0, secondi = 0;
  const ruoli = sc.ruoli.map((r) => {
    const m = prezzi[modelloDi(s, r.id)];
    const chiamate = s.chiamate * r.quota_chiamate;
    const perChiamata = (tIn * m.euro_ingresso + sc.token_uscita * m.euro_uscita) / 1e6;
    const perChiamataPiena = (s.token * m.euro_ingresso + sc.token_uscita * m.euro_uscita) / 1e6;
    const costo = s.volume * chiamate * perChiamata;
    const q = qualita(sc, s, r.id);
    const errori = Math.round(s.volume * (1 - q / 100));
    const rilav = errori * r.euro_per_errore;
    modello += costo;
    senzaCache += s.volume * chiamate * perChiamataPiena;
    rilavorazioni += rilav;
    secondi += chiamate * m.secondi;
    return { id: r.id, modello: m.id, chiamate, costo, qualita: q, errori, rilavorazioni: rilav, sotto_soglia: q < sc.soglia_qualita };
  });
  const totale = modello + rilavorazioni;
  return {
    modello, risparmio_cache: senzaCache - modello, rilavorazioni, totale,
    per_compito: totale / s.volume, token_mese: s.volume * s.chiamate * (s.token + sc.token_uscita), secondi, ruoli,
  };
}
/** Giudizio sulle chiamate per compito: giri a vuoto, troppo poche, giuste. */
export function giri(sc, s) {
  const d = s.chiamate - sc.chiamate_necessarie;
  return d > 0 ? { tipo: "vuoto", n: d } : d < 0 ? { tipo: "pochi", n: -d } : { tipo: "giusti", n: 0 };
}
/** Falso risparmio: il costo del modello scende rispetto alla partenza ma il totale sale. */
export function falsoRisparmio(sc, s) {
  const ora = bolletta(sc, s), prima = bolletta(sc, { ...s, ...sc.riferimento });
  return ora.modello < prima.modello && ora.totale > prima.totale;
}
/** Riscontro del gioco "Decidi tu". */
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
/** Altezze delle due barre (partenza e adesso), divise in modello e rilavorazioni, sulla stessa scala. */
export function barre(sc, s) {
  const prima = bolletta(sc, { ...s, ...sc.riferimento }), ora = bolletta(sc, s);
  const massimo = Math.max(prima.totale, ora.totale) || 1;
  const h = (v) => (v / massimo) * BARRE.h;
  return [prima, ora].map((b, i) => ({
    x: BARRE.x + i * (BARRE.larghezza + BARRE.scarto), modello: h(b.modello), rilavorazioni: h(b.rilavorazioni), totale: b.totale,
  }));
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const lingua = contesto && contesto.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante: serve per scrivere i numeri nel formato della lingua");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));
  const num = (x, cifre) => x.toLocaleString(lingua, cifre === undefined ? { maximumFractionDigits: 0 } : { minimumFractionDigits: cifre, maximumFractionDigits: cifre });
  const euro = (x, cifre) => riempi(T.euro, { n: num(x, cifre) });
  const modello = (id) => sc.modelli.find((m) => m.id === id);

  const R0 = sc.riferimento;
  const s = { vista: VISTE[0], volume: R0.volume, token: R0.token, chiamate: R0.chiamate, modalita: R0.modalita, modello_unico: R0.modello_unico,
    modelli_ruolo: { ...R0.modelli_ruolo }, cache: R0.cache, data_in_testa: R0.data_in_testa, scelte: {}, verificato: false };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...VISTE.map((v) => el("button", { "data-v": v, onclick: () => cambia({ vista: v }) }, E[`vista_${v}`])));
  function cursore(def, chiave) {
    const val = el("b", {});
    const inp = el("input", { type: "range", min: def.min, max: def.max, step: def.passo, "aria-label": def.etichetta });
    inp.addEventListener("input", () => cambia({ [chiave]: Number(inp.value) }));
    return { nodo: el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, def.etichetta), val), inp), val, inp };
  }
  const cVolume = cursore(sc.volume, "volume");
  const cToken = cursore(sc.token, "token");
  const cChiamate = cursore(sc.chiamate, "chiamate");
  const segModalita = el("div", { class: "segmentato", role: "group", "aria-label": E.modalita },
    ...MODALITA.map((v) => el("button", { "data-v": v, onclick: () => cambia({ modalita: v }) }, E[`modalita_${v}`])));
  const gruppoModelli = (etichetta, scegliM) => el("div", { class: "segmentato", role: "group", "aria-label": etichetta },
    ...sc.modelli.map((m) => el("button", { "data-v": m.id, onclick: () => scegliM(m.id) }, m.nome)));
  const segUnico = gruppoModelli(E.modalita, (id) => cambia({ modello_unico: id }));
  const segRuoli = {};
  const zonaRuoli = el("div", {});
  for (const r of sc.ruoli) {
    segRuoli[r.id] = gruppoModelli(r.nome, (id) => cambia({ modelli_ruolo: { ...s.modelli_ruolo, [r.id]: id } }));
    zonaRuoli.append(el("div", { class: "ruolo-comando" }, el("span", {}, r.nome), segRuoli[r.id]));
  }
  const interruttore = (testo, chiave) => {
    const inp = el("input", { type: "checkbox", onchange: (e) => cambia({ [chiave]: e.target.checked }) });
    return { nodo: el("label", { class: "interruttore" }, el("span", {}, testo), inp), inp };
  };
  const inCache = interruttore(E.cache, "cache");
  const inData = interruttore(E.data_in_testa, "data_in_testa");
  const zonaCruscotto = el("div", {}, cVolume.nodo, cToken.nodo, cChiamate.nodo, el("h4", {}, E.modalita), segModalita, segUnico, zonaRuoli, inCache.nodo, inData.nodo);
  const tendine = {};
  const zonaDecidi = el("div", {});
  sc.casi.forEach((c, i) => {
    const sel = el("select", { "aria-label": riempi(T.scegli_per, { n: i + 1 }), onchange: (e) => scegli(c.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.risposte_gioco.map((r) => el("option", { value: r.id }, r.nome)));
    tendine[c.id] = sel;
    zonaDecidi.append(el("label", { class: "scelta-gioco" }, el("span", {}, riempi(T.caso, { n: i + 1 })), sel));
  });
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => { s.verificato = true; disegnaDestra(); } }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaCruscotto, zonaDecidi);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  const titolo = testoSvg({ x: W / 2, y: 28, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, "");
  const gScena = svgEl("g");
  svg.append(titolo, gScena);
  scena.append(svg);
  const destra = el("aside", { class: "pannello destra" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}${ridotto ? " ridotto" : ""}` }, comandi, scena, destra));

  function disegnaCruscotto(g) {
    const b = bolletta(sc, s);
    b.ruoli.forEach((r, i) => {
      const def = sc.ruoli[i];
      const m = modello(r.modello);
      const x = RUOLO.x0 + i * RUOLO.passo, y = RUOLO.y;
      if (i > 0) g.append(svgEl("path", { d: `M${x - 16} ${y + RUOLO.h / 2} l12 0 m-5 -5 l5 5 l-5 5`, fill: "none", stroke: "#7c86a2", "stroke-width": 2 }));
      const colore = r.sotto_soglia ? "#e11d48" : "#16a34a";
      g.append(svgEl("rect", { x, y, width: RUOLO.w, height: RUOLO.h, rx: 12, fill: r.sotto_soglia ? "#fff1f2" : "#fff", stroke: colore, "stroke-width": 2 }));
      aCapo(def.nome, 20).forEach((riga, k) => g.append(testoSvg({ x: x + RUOLO.w / 2, y: y + 18 + k * 13, "text-anchor": "middle", "font-size": 10.5, "font-weight": 800, fill: "#17203b" }, riga)));
      g.append(svgEl("circle", { cx: x + 24, cy: y + 56, r: 14, fill: m.colore }),
        testoSvg({ x: x + 24, y: y + 60.5, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#fff" }, m.sigla),
        testoSvg({ x: x + 44, y: y + 60, "font-size": 10.5, "font-weight": 700, fill: m.colore }, m.nome),
        svgEl("rect", { x: x + 10, y: y + 78, width: RUOLO.w - 20, height: 8, rx: 4, fill: "#eef1f8" }),
        svgEl("rect", { x: x + 10, y: y + 78, width: ((RUOLO.w - 20) * r.qualita) / 100, height: 8, rx: 4, fill: colore }),
        testoSvg({ x: x + 10, y: y + 102, "font-size": 10, fill: colore, "font-weight": 700 }, `${E.qualita} ${riempi(T.percento, { n: num(r.qualita) })}`),
        testoSvg({ x: x + 10, y: y + 114, "font-size": 9, fill: "#5b6684" }, riempi(T.chiamate_ruolo, { n: num(r.chiamate, 1) })));
      // errori del ruolo sotto la scatola
      aCapo(riempi(T.errori_ruolo, { n: num(r.errori), errore: def.errore }), 24).slice(0, 3).forEach((riga, k) =>
        g.append(testoSvg({ x: x + RUOLO.w / 2, y: y + RUOLO.h + 20 + k * 13, "text-anchor": "middle", "font-size": 9.5, fill: r.sotto_soglia ? "#e11d48" : "#5b6684" }, riga)));
    });
    // prezzi d'esempio
    sc.modelli.forEach((m, k) => g.append(testoSvg({ x: RUOLO.x0, y: 300 + k * 15, "font-size": 9.5, fill: "#5b6684" },
      riempi(T.prezzo_modello, { nome: m.nome, ingresso: num(m.euro_ingresso, 2), uscita: num(m.euro_uscita, 2) }))));
    aCapo(T.nota_prezzi, 80).slice(0, 3).forEach((riga, k) => g.append(testoSvg({ x: RUOLO.x0, y: 354 + k * 13, "font-size": 9, "font-style": "italic", fill: "#5b6684" }, riga)));
    // due barre: partenza e adesso
    const base = BARRE.y + BARRE.h;
    barre(sc, s).forEach((br, i) => {
      g.append(svgEl("rect", { class: "barra-anim", x: br.x, y: base - br.modello, width: BARRE.larghezza, height: br.modello, fill: "#4f46e5" }),
        svgEl("rect", { class: "barra-anim", x: br.x, y: base - br.modello - br.rilavorazioni, width: BARRE.larghezza, height: br.rilavorazioni, fill: "#e11d48" }),
        testoSvg({ x: br.x + BARRE.larghezza / 2, y: base + 16, "text-anchor": "middle", "font-size": 10.5, "font-weight": 800, fill: "#17203b" }, i ? E.adesso : E.partenza),
        testoSvg({ x: br.x + BARRE.larghezza / 2, y: base - br.modello - br.rilavorazioni - 6, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: "#17203b" }, euro(br.totale)));
    });
  }
  function disegnaDecidi(g) {
    sc.casi.forEach((c, i) => {
      const y = CASO.y0 + i * CASO.passo;
      const scelta = s.scelte[c.id];
      g.append(svgEl("rect", { x: CASO.x, y, width: CASO.w, height: CASO.h, rx: 12, fill: "#fff", stroke: scelta ? "#4f46e5" : "#cbd2e3", "stroke-width": 1.5 }),
        testoSvg({ x: CASO.x + 12, y: y + 18, "font-size": 10.5, "font-weight": 800, fill: "#4f46e5" }, riempi(T.caso, { n: i + 1 })));
      aCapo(c.testo, CASO.caratteri).slice(0, 2).forEach((r, k) => g.append(testoSvg({ x: CASO.x + 12, y: y + 34 + k * 14, "font-size": 10.5, fill: "#17203b" }, r)));
      if (scelta) g.append(testoSvg({ x: CASO.x + CASO.w - 12, y: y + 18, "text-anchor": "end", "font-size": 10, "font-weight": 800, fill: "#4f46e5" }, sc.risposte_gioco.find((r) => r.id === scelta).nome));
    });
  }
  function disegnaScena() {
    titolo.textContent = E[`titolo_${s.vista}`];
    gScena.replaceChildren();
    (s.vista === "decidi" ? disegnaDecidi : disegnaCruscotto)(gScena);
  }

  function disegnaDestra() {
    const figli = [];
    if (s.vista === "decidi") {
      figli.push(el("h3", {}, E.titolo_decidi));
      if (s.verificato) {
        const v = verifica(sc, s);
        figli.push(el("div", { class: "verifica", "aria-live": "polite" },
          el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
          ...v.righe.map((r) => el("div", { class: `riga ${r.esito}` }, r.testo))));
      }
    } else {
      const b = bolletta(sc, s);
      const prima = bolletta(sc, { ...s, ...R0 });
      const delta = b.totale - prima.totale;
      const riga = (etichetta, valore, classe) => el("div", { class: `riga ${classe || ""}` }, el("span", {}, etichetta), el("b", {}, valore));
      figli.push(el("h3", {}, E.titolo_scheda), el("div", { class: "bolletta", "aria-live": "polite" },
        riga(E.riga_modello, euro(b.modello)),
        riga(E.riga_cache, b.risparmio_cache > 0 ? `− ${euro(b.risparmio_cache)}` : euro(0), "rientro"),
        riga(E.riga_rilavorazioni, euro(b.rilavorazioni), b.rilavorazioni > b.modello ? "rossa" : ""),
        riga(E.riga_totale, euro(b.totale), "totale"),
        el("div", { class: `riga ${delta > 0 ? "rossa" : "verde"}` }, riempi(T.confronto, { segno: delta > 0 ? "+" : delta < 0 ? "−" : "", n: num(Math.abs(delta)) })),
        riga(E.per_compito, euro(b.per_compito, 3), "rientro"),
        riga(E.token_mese, num(b.token_mese), "rientro"),
        riga(E.attesa, riempi(T.secondi, { n: num(b.secondi, 1) }), "rientro")));
      const g = giri(sc, s);
      figli.push(el("div", { class: `esito ${g.tipo === "giusti" ? "ok" : g.tipo === "vuoto" ? "avviso" : "male"}` }, riempi(T[`giri_${g.tipo}`], { n: num(g.n) })));
      if (s.cache && s.data_in_testa) figli.push(el("div", { class: "esito avviso" }, T.cache_persa));
      if (falsoRisparmio(sc, s)) figli.push(el("div", { class: "esito male" }, T.falso_risparmio));
      figli.push(el("p", { class: "nota" }, T.nota_errori));
    }
    figli.push(el("div", { class: "regola" }, E.regola));
    destra.replaceChildren(...figli);
    if (!ridotto && destra.animate) destra.animate([{ opacity: 0.6 }, { opacity: 1 }], { duration: 220 });
  }

  function aggiornaComandi() {
    const premi = (gruppo, valore) => gruppo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === valore)));
    premi(segVista, s.vista);
    premi(segModalita, s.modalita);
    premi(segUnico, s.modello_unico);
    for (const r of sc.ruoli) premi(segRuoli[r.id], s.modelli_ruolo[r.id]);
    for (const [c, chiave] of [[cVolume, "volume"], [cToken, "token"], [cChiamate, "chiamate"]]) {
      c.inp.value = s[chiave];
      c.val.textContent = riempi(T.formato_valore, { n: num(s[chiave]) });
    }
    inCache.inp.checked = s.cache;
    inData.inp.checked = s.data_in_testa;
    segUnico.classList.toggle("nascosto", s.modalita !== "unico");
    zonaRuoli.classList.toggle("nascosto", s.modalita !== "ruoli");
    zonaCruscotto.classList.toggle("nascosto", s.vista !== "cruscotto");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaDestra(); }
  function cambia(diff) {
    Object.assign(s, diff);
    s.verificato = false;
    ridisegna();
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
    nuovo.modelli_ruolo = { ...(nuovo.modelli_ruolo || {}) };
    if (!VISTE.includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!MODALITA.includes(nuovo.modalita)) throw new Error(`stato_animazione: modalita' sconosciuta «${nuovo.modalita}»`);
    for (const k of ["volume", "token", "chiamate"]) {
      if (!(nuovo[k] >= sc[k].min && nuovo[k] <= sc[k].max)) throw new Error(`stato_animazione: ${k} fuori scala «${nuovo[k]}»`);
    }
    if (!modello(nuovo.modello_unico)) throw new Error(`stato_animazione: modello sconosciuto «${nuovo.modello_unico}»`);
    const ruoli = sc.ruoli.map((r) => r.id);
    if (Object.keys(nuovo.modelli_ruolo).sort().join() !== [...ruoli].sort().join()) throw new Error(`stato_animazione: modelli_ruolo deve avere i ruoli ${ruoli.join(", ")}`);
    for (const [r, m] of Object.entries(nuovo.modelli_ruolo)) if (!modello(m)) throw new Error(`stato_animazione: modello sconosciuto «${m}» per il ruolo ${r}`);
    for (const [id, r] of Object.entries(nuovo.scelte)) {
      if (!sc.casi.some((c) => c.id === id)) throw new Error(`stato_animazione: proposta sconosciuta «${id}»`);
      if (!sc.risposte_gioco.some((x) => x.id === r)) throw new Error(`stato_animazione: risposta sconosciuta «${r}»`);
    }
    Object.assign(s, nuovo);
    ridisegna();
  }
  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo attivo: le transizioni CSS si fermano con il DOM */ },
    _prova: { stato: s, bolletta: () => bolletta(sc, s), giri: () => giri(sc, s), falsoRisparmio: () => falsoRisparmio(sc, s), verifica: () => verifica(sc, s) },
  };
}
