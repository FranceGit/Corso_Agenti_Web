// Laboratorio "Trova l'errore" (P3.5): il bug reale di una pipeline di lead generation. Il report di campagna dice
// "5 su 5 interessati, punteggio 90-92"; lo studente indaga: sceglie se festeggiare o controllare, etichetta a mano
// le risposte vere dei clienti, segue una risposta stazione per stazione fino al punto in cui il dato diventa
// sbagliato, legge la regola di conversione difettosa (controlla se l'etichetta CONTIENE "Interested" prima di
// "Not Interested") e sceglie la correzione concettuale; infine confronta il report sbagliato con quello vero.
// Tutti i testi e i dati arrivano dallo scenario della lezione.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "trova_errore";
const FASI = ["report", "risposte", "traccia", "regola", "rilancio"];

const STILE = `
.lz-trova_errore .sezione-titolo { font-size: .72rem; font-weight: 800; letter-spacing: .07em; color: var(--tenue); margin: 12px 4px 6px; }
.lz-trova_errore .carte { display: grid; gap: 8px; padding: 0 4px 6px; }
.lz-trova_errore .carta { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 12px; align-items: center; background: #fff; border: 1px solid var(--bordo); border-radius: 12px; padding: 9px 12px; animation: entra .3s ease; }
.lz-trova_errore .carta .chi { font-weight: 800; font-size: .84rem; }
.lz-trova_errore .carta .chi span { font-weight: 500; color: var(--tenue); }
.lz-trova_errore .carta .testo { grid-column: 1 / -1; font-size: .86rem; font-style: italic; color: #26304d; }
.lz-trova_errore .carta .crm { font-size: .75rem; color: var(--tenue); }
.lz-trova_errore .carta select { font: inherit; font-size: .8rem; padding: 3px 6px; border-radius: 8px; border: 1px solid var(--bordo); }
.lz-trova_errore .carta.giusta { border-color: #86efac; background: #f6fef9; }
.lz-trova_errore .carta.sbagliata { border-color: #fda4af; background: #fff7f8; }
.lz-trova_errore .chip { display: inline-block; padding: .1em .55em; border-radius: 999px; font-size: .74rem; font-weight: 700; color: #fff; }
.lz-trova_errore .regole { margin: 0 4px 8px; display: grid; gap: 5px; }
.lz-trova_errore .regole .titoletto { font-size: .74rem; font-weight: 800; color: var(--tenue); margin-top: 4px; }
.lz-trova_errore .regola { font-family: var(--mono); font-size: .78rem; background: #fff; border: 1px solid var(--bordo); border-left: 4px solid #94a3b8; border-radius: 8px; padding: 6px 9px; }
.lz-trova_errore .regola.colpevole { border-left-color: var(--male); background: #fff7f8; }
.lz-trova_errore .regola.morta { opacity: .55; text-decoration: line-through; }
.lz-trova_errore .regola.fissa { border-left-color: var(--ok); background: #f6fef9; }
.lz-trova_errore .regola .mai { font-family: var(--font); font-size: .7rem; font-weight: 700; color: var(--male); margin-left: 6px; text-decoration: none; display: inline-block; }
.lz-trova_errore .taccuino { display: grid; gap: 8px; }
.lz-trova_errore .taccuino .riga { font-size: .82rem; padding: 6px 9px; border-radius: 9px; background: var(--sfondo); animation: entra .3s ease; }
.lz-trova_errore .taccuino .riga.ok { background: var(--ok-chiaro); color: #166534; }
.lz-trova_errore .taccuino .riga.male { background: var(--male-chiaro); color: #9f1239; }
.lz-trova_errore .taccuino .riga.avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-trova_errore .taccuino h4 { margin: 6px 0 0; font-size: .8rem; }
.lz-trova_errore .stazione { cursor: pointer; }
.lz-trova_errore .stazione:focus-visible circle { stroke: #4f46e5; stroke-width: 4; }
.lz-trova_errore .comandi-fase { display: grid; gap: 8px; }
.lz-trova_errore .comandi-fase select { font: inherit; font-size: .84rem; padding: 5px 8px; border-radius: 9px; border: 1px solid var(--bordo); width: 100%; }
.lz-trova_errore .abitudine { display: flex; gap: 8px; align-items: flex-start; font-size: .82rem; padding: 4px 0; cursor: pointer; }
.lz-trova_errore .abitudine input { margin-top: 3px; }
.lz-trova_errore .segmentato.verticale button { font-size: .78rem; line-height: 1.3; }
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

function categoria(sc, id) {
  const c = sc.categorie.find((x) => x.id === id);
  if (!c) throw new Error(`categoria sconosciuta: ${id}`);
  return c;
}
function risposta(sc, id) {
  const r = sc.risposte.find((x) => x.id === id);
  if (!r) throw new Error(`risposta sconosciuta: ${id}`);
  return r;
}

/** Regole in uso: quelle difettose di adesso, oppure quelle della correzione scelta. */
export function regoleDi(sc, correzione) {
  if (!correzione) return sc.regole_bug;
  const c = sc.correzioni.find((x) => x.id === correzione);
  if (!c) throw new Error(`correzione sconosciuta: ${correzione}`);
  return c.regole;
}

/** Il passo di conversione: dall'etichetta dell'LLM a una categoria del CRM, regole lette dall'alto in basso. */
export function converti(regole, r) {
  if (regole.disiscrizione_fissa && r.chiede_disiscrizione) return { categoria: "disiscrizione", regola: 0, parola: "", fissa: true };
  for (let i = 0; i < regole.ordine.length; i++) {
    const [parola, cat] = regole.ordine[i];
    let vale;
    if (regole.confronto === "contiene") vale = r.etichetta_llm.includes(parola);
    else if (regole.confronto === "esatto") vale = r.etichetta_llm === parola;
    else throw new Error(`confronto sconosciuto: ${regole.confronto}`);
    if (vale) return { categoria: cat, regola: i + 1, parola, fissa: false };
  }
  return { categoria: regole.sconosciuta, regola: -1, parola: "", fissa: false };
}

/** Il report di campagna prodotto da un insieme di regole. */
export function report(sc, regole) {
  const conteggi = Object.fromEntries(sc.categorie.map((c) => [c.id, 0]));
  const righe = sc.risposte.map((r) => ({ id: r.id, ...converti(regole, r) }));
  for (const x of righe) conteggi[x.categoria] += 1;
  const n = sc.risposte.length;
  const punteggi = sc.risposte.map((r) => r.punteggio);
  return {
    righe,
    conteggi,
    n,
    perc: Math.round((conteggi.interessato / n) * 100),
    sconosciute: righe.filter((x) => x.regola === -1).length,
    min: Math.min(...punteggi),
    max: Math.max(...punteggi),
    tuttiUguali: Object.values(conteggi).some((v) => v === n),
  };
}

/** Le etichette dello studente confrontate con il CRM (regole difettose) e con quelle giuste. */
export function confronta(sc, etichette) {
  const rep = report(sc, sc.regole_bug);
  const righe = sc.risposte.map((r) => {
    const crm = rep.righe.find((x) => x.id === r.id).categoria;
    const tua = etichette[r.id] || "";
    return { id: r.id, tua, crm, giusta: r.giusta, tuaGiusta: tua === r.giusta, crmGiusto: crm === r.giusta };
  });
  return {
    righe,
    fatte: righe.filter((x) => x.tua).length,
    giuste: righe.filter((x) => x.tuaGiusta).length,
    sbagliateCrm: righe.filter((x) => !x.crmGiusto).length,
    totali: righe.length,
  };
}

/** Prima stazione in cui il dato diventa sbagliato (con le regole difettose), oppure "" se non sbaglia mai. */
export function puntoErrore(sc, idRisposta) {
  const r = risposta(sc, idRisposta);
  const crm = converti(sc.regole_bug, r).categoria;
  if (crm === r.giusta) return "";
  // l'etichetta dell'LLM e' giusta se, letta con un confronto esatto, porta alla categoria giusta; una disiscrizione
  // non e' fra le etichette dell'LLM: la deve riconoscere una regola fissa nella conversione
  const esatta = sc.correzioni.find((c) => c.tipo === "giusta").regole;
  const tabella = Object.fromEntries(esatta.ordine);
  const llmGiusta = tabella[r.etichetta_llm] === r.giusta || r.chiede_disiscrizione;
  return llmGiusta ? "conversione" : "llm";
}

/** Riscontro al clic su una stazione della pipeline. */
export function valutaStazione(sc, idRisposta, stazione) {
  const T = sc.testi;
  const r = risposta(sc, idRisposta);
  const ordine = sc.stazioni.map((s) => s.id);
  if (!stazione) return { esito: "scegli", testo: T.staz_scegli };
  const i = ordine.indexOf(stazione);
  if (i < 0) throw new Error(`stazione sconosciuta: ${stazione}`);
  const punto = puntoErrore(sc, idRisposta);
  if (!punto) return { esito: "nessun_errore", testo: riempi(T.staz_nessun_errore, { nome: r.nome }) };
  const iPunto = ordine.indexOf(punto);
  if (i < iPunto) return { esito: "prima", testo: T.staz_prima };
  if (i > iPunto) return { esito: "dopo", testo: T.staz_dopo };
  const crm = categoria(sc, converti(sc.regole_bug, r).categoria).nome;
  let testo = riempi(T.staz_giusta, { llm: r.etichetta_llm, crm });
  if (r.chiede_disiscrizione) testo += ` ${T.nota_disiscrizione}`;
  return { esito: "giusto", testo };
}

/** Cosa c'e' in ogni stazione per una risposta, con le regole difettose. */
export function valoriStazioni(sc, idRisposta) {
  const T = sc.testi;
  const r = risposta(sc, idRisposta);
  const conv = converti(sc.regole_bug, r);
  const nomeCat = categoria(sc, conv.categoria).nome;
  const giusto = conv.categoria === r.giusta;
  const punto = puntoErrore(sc, idRisposta);
  const ordine = sc.stazioni.map((s) => s.id);
  const iPunto = punto ? ordine.indexOf(punto) : ordine.length;
  return sc.stazioni.map((s, i) => {
    let valore;
    if (s.id === "cliente") valore = riempi(T.valore_cliente, { testo: r.testo });
    else if (s.id === "llm") valore = riempi(T.valore_llm, { etichetta: r.etichetta_llm });
    else if (s.id === "conversione") valore = conv.regola > 0 ? riempi(T.valore_conversione, { n: conv.regola, parola: conv.parola }) : T.valore_conversione_nessuna;
    else if (s.id === "crm") valore = riempi(T.valore_crm, { categoria: nomeCat });
    else if (s.id === "report") valore = riempi(T.valore_report, { categoria: nomeCat });
    else throw new Error(`stazione senza valore: ${s.id}`);
    return { id: s.id, valore, sbagliato: !giusto && i >= iPunto };
  });
}

/** Esito di una correzione: dove finisce ogni risposta e quante sono al posto giusto. */
export function valutaCorrezione(sc, idCorrezione) {
  const c = sc.correzioni.find((x) => x.id === idCorrezione);
  if (!c) throw new Error(`correzione sconosciuta: ${idCorrezione}`);
  const rep = report(sc, c.regole);
  const righe = sc.risposte.map((r) => {
    const x = rep.righe.find((y) => y.id === r.id);
    return { id: r.id, categoria: x.categoria, giusta: x.categoria === r.giusta };
  });
  return { tipo: c.tipo, spiega: c.spiega, righe, giuste: righe.filter((x) => x.giusta).length, totali: righe.length };
}

/** Le abitudini spuntate dallo studente: quante utili e quante rischiose. */
export function valutaAbitudini(sc, scelte) {
  const righe = sc.abitudini.filter((a) => scelte[a.id]).map((a) => ({ id: a.id, buona: a.buona }));
  return {
    righe,
    buone: righe.filter((x) => x.buona).length,
    cattive: righe.filter((x) => !x.buona).length,
    totaliBuone: sc.abitudini.filter((a) => a.buona).length,
  };
}

/** Le righe delle regole da mostrare: testo, colpevole (fa il danno), morta (mai raggiunta). */
export function righeRegole(sc, regole) {
  const T = sc.testi;
  const righe = [];
  if (regole.disiscrizione_fissa) righe.push({ testo: T.regola_fissa, classe: "fissa", mai: false });
  const usate = new Set(sc.risposte.map((r) => converti(regole, r).regola));
  regole.ordine.forEach(([parola, cat], i) => {
    const nome = categoria(sc, cat).nome;
    const testo = regole.confronto === "contiene"
      ? riempi(T.regola_riga, { n: i + 1, parola, categoria: nome })
      : riempi(T.regola_esatta_riga, { parola, categoria: nome });
    // una regola "contiene" e' colpevole se cattura etichette che non sono esattamente la sua parola
    const colpevole = regole.confronto === "contiene" && sc.risposte.some((r) => { const x = converti(regole, r); return x.regola === i + 1 && r.etichetta_llm !== parola; });
    const mai = sc.risposte.some((r) => r.etichetta_llm === parola) && !usate.has(i + 1);
    righe.push({ testo, classe: colpevole ? "colpevole" : mai ? "morta" : "", mai });
  });
  righe.push({ testo: riempi(T.regola_riserva, { categoria: categoria(sc, regole.sconosciuta).nome }), classe: "", mai: false });
  return righe;
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const durata = (ms) => (ridotto ? 1 : ms);
  const lingua = contesto && contesto.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante: serve per scrivere i numeri nel formato della lingua");
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));
  const corretta = sc.correzioni.find((c) => c.tipo === "giusta");

  const s = {
    fase: "report",
    scelta_report: "",
    etichette: {},
    confrontato: false,
    risposta_aperta: sc.risposte[1].id,
    stazione: "",
    correzione: "",
    abitudini: {},
  };
  let distrutto = false;

  // ------------------------------------------------ comandi (sinistra)
  const comandi = el("aside", { class: "pannello" });
  const zone = {};
  // report
  const segScelta = el("div", { class: "segmentato", role: "group", "aria-label": E.titolo_comandi },
    el("button", { "data-v": "festeggia", onclick: () => cambia({ scelta_report: "festeggia" }) }, E.festeggia),
    el("button", { "data-v": "controlla", onclick: () => cambia({ scelta_report: "controlla" }) }, E.controlla));
  zone.report = el("div", { class: "comandi-fase" }, segScelta);
  // risposte
  const btnConfronta = el("button", { class: "btn btn-primario", style: "width:100%;justify-content:center", onclick: () => cambia({ confrontato: true }) }, E.confronta);
  const contaEtichette = el("p", { class: "nota", style: "font-size:.8rem;color:var(--tenue);margin:0" });
  zone.risposte = el("div", { class: "comandi-fase" }, contaEtichette, btnConfronta);
  // traccia
  const selRisposta = el("select", { "aria-label": E.segui_risposta, onchange: (e) => cambia({ risposta_aperta: e.target.value, stazione: "" }) },
    sc.risposte.map((r) => el("option", { value: r.id }, `${r.nome} · ${r.azienda}`)));
  const btnStazioni = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.pipeline },
    sc.stazioni.map((st) => el("button", { "data-v": st.id, onclick: () => cambia({ stazione: st.id }) }, st.nome)));
  zone.traccia = el("div", { class: "comandi-fase" }, el("h4", {}, E.segui_risposta), selRisposta, btnStazioni);
  // regola
  const segCorr = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.correzioni },
    el("button", { "data-v": "", onclick: () => cambia({ correzione: "" }) }, E.nessuna_correzione),
    sc.correzioni.map((c) => el("button", { "data-v": c.id, onclick: () => cambia({ correzione: c.id }) }, c.testo)));
  zone.regola = el("div", { class: "comandi-fase" }, el("h4", {}, E.correzioni), segCorr);
  // rilancio
  const iCorr = el("input", { type: "checkbox", onchange: (e) => cambia({ correzione: e.target.checked ? corretta.id : "" }) });
  const caselleAbitudini = {};
  const listaAbitudini = el("div", {}, sc.abitudini.map((a) => {
    const input = el("input", { type: "checkbox", onchange: (e) => cambia({ abitudini: { ...s.abitudini, [a.id]: e.target.checked } }) });
    caselleAbitudini[a.id] = input;
    return el("label", { class: "abitudine" }, input, el("span", {}, a.testo));
  }));
  zone.rilancio = el("div", { class: "comandi-fase" },
    el("label", { class: "interruttore" }, el("span", {}, E.correzione_attiva), iCorr),
    el("h4", {}, E.abitudini), listaAbitudini);
  comandi.append(el("h3", {}, E.titolo_comandi), ...FASI.map((f) => zone[f]));

  // ------------------------------------------------ scena (centro)
  const scena = el("div", { class: "scena" });
  const svgReport = svgEl("svg", { viewBox: "0 0 720 250", role: "img", "aria-label": E.descrizione_scena });
  const zonaFase = el("div", {});
  scena.append(svgReport, zonaFase);

  // ------------------------------------------------ taccuino (destra)
  const destra = el("aside", { class: "pannello destra" });
  const taccuino = el("div", { class: "taccuino", "aria-live": "polite" });
  destra.append(el("h3", {}, E.titolo_destra), taccuino);

  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno del report (SVG)
  function regoleScena() {
    if (s.fase === "regola" || s.fase === "rilancio") return regoleDi(sc, s.correzione);
    return sc.regole_bug;
  }
  function disegnaReport() {
    const regole = regoleScena();
    const rep = report(sc, regole);
    const nomeCorr = s.correzione && (s.fase === "regola" || s.fase === "rilancio") ? sc.correzioni.find((c) => c.id === s.correzione).testo : "";
    svgReport.replaceChildren();
    svgReport.append(svgEl("rect", { x: 8, y: 6, width: 704, height: 238, rx: 16, fill: "#fff", stroke: "#dce2ef" }));
    svgReport.append(testoSvg({ x: 30, y: 32, "font-size": 11.5, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".07em" }, E.report));
    svgReport.append(testoSvg({ x: 690, y: 32, "text-anchor": "end", "font-size": 11, fill: "#5b6684" }, nomeCorr ? riempi(T.report_corretto, { correzione: nomeCorr.length > 48 ? `${nomeCorr.slice(0, 46)}…` : nomeCorr }) : T.report_bug));
    const titolo = testoSvg({ x: 30, y: 72, "font-size": 30, "font-weight": 800, fill: rep.perc === 100 ? "#16a34a" : "#17203b" }, riempi(T.titolo_report, { perc: rep.perc.toLocaleString(lingua) }));
    svgReport.append(titolo);
    svgReport.append(testoSvg({ x: 30, y: 94, "font-size": 12, fill: "#5b6684" }, riempi(T.sotto_report, { n: rep.n, min: rep.min, max: rep.max })));
    // barra impilata
    let x = 30;
    const w = 660;
    for (const c of sc.categorie) {
      const n = rep.conteggi[c.id];
      if (!n) continue;
      const larg = (n / rep.n) * w;
      const r = svgEl("rect", { x, y: 106, width: Math.max(0, larg - 2), height: 22, rx: 6, fill: c.colore });
      svgReport.append(r);
      if (!ridotto) r.animate([{ opacity: 0 }, { opacity: 1 }], { duration: durata(350) });
      if (larg > 70) svgReport.append(testoSvg({ x: x + 8, y: 121, "font-size": 11, "font-weight": 700, fill: "#fff" }, `${c.nome} ${n}`));
      x += larg;
    }
    // righe dei lead
    rep.righe.forEach((riga, i) => {
      const r = risposta(sc, riga.id);
      const c = categoria(sc, riga.categoria);
      const y = 150 + i * 18;
      svgReport.append(testoSvg({ x: 30, y, "font-size": 11.5, fill: "#17203b" }, `${r.nome} · ${r.azienda}`));
      svgReport.append(svgEl("rect", { x: 330, y: y - 11, width: 130, height: 15, rx: 7.5, fill: c.colore }));
      svgReport.append(testoSvg({ x: 395, y: y, "text-anchor": "middle", "font-size": 10, "font-weight": 700, fill: "#fff" }, c.nome));
      svgReport.append(testoSvg({ x: 690, y, "text-anchor": "end", "font-size": 11.5, "font-weight": 700, fill: "#5b6684" }, String(r.punteggio)));
    });
    svgReport.append(testoSvg({ x: 560, y: 150, "text-anchor": "end", "font-size": 10, fill: "#8a93ad" }, riempi(T.sconosciute, { n: rep.sconosciute })));
  }

  // ------------------------------------------------ disegno della fase (HTML / SVG)
  function disegnaRisposte() {
    const conf = confronta(sc, s.etichette);
    const carte = sc.risposte.map((r) => {
      const riga = conf.righe.find((x) => x.id === r.id);
      const sel = el("select", { "aria-label": `${E.tua_etichetta}: ${r.nome}`, onchange: (e) => cambia({ etichette: { ...s.etichette, [r.id]: e.target.value }, confrontato: false }) },
        el("option", { value: "" }, E.scegli_etichetta),
        sc.categorie.filter((c) => c.id !== "umano").map((c) => el("option", { value: c.id }, c.nome)));
      sel.value = s.etichette[r.id] || "";
      const crm = categoria(sc, riga.crm);
      const classe = s.confrontato ? (riga.crmGiusto ? "giusta" : "sbagliata") : "";
      return el("div", { class: `carta ${classe}` },
        el("div", { class: "chi" }, r.nome, " ", el("span", {}, `· ${r.azienda}`)),
        sel,
        el("div", { class: "testo" }, riempi(T.valore_cliente, { testo: r.testo })),
        el("div", { class: "crm" }, `${E.nel_crm}: `, el("span", { class: "chip", style: `background:${crm.colore}` }, crm.nome)));
    });
    zonaFase.replaceChildren(el("div", { class: "sezione-titolo" }, E.risposte), el("div", { class: "carte" }, carte));
  }

  function disegnaTraccia() {
    const valori = valoriStazioni(sc, s.risposta_aperta);
    const svg = svgEl("svg", { viewBox: "0 0 720 200", role: "img", "aria-label": E.pipeline });
    const n = sc.stazioni.length;
    const passo = 640 / (n - 1);
    svg.append(svgEl("path", { d: `M40,60 H680`, stroke: "#cfd6e6", "stroke-width": 4, "stroke-linecap": "round" }));
    const esito = valutaStazione(sc, s.risposta_aperta, s.stazione);
    sc.stazioni.forEach((st, i) => {
      const cx = 40 + i * passo;
      const v = valori[i];
      const scelta = s.stazione === st.id;
      const colore = v.sbagliato ? "#e11d48" : "#16a34a";
      const g = svgEl("g", { class: "stazione", transform: `translate(${cx},60)`, tabindex: "0", role: "button", "aria-label": riempi(E.apri_stazione, { stazione: st.nome }) });
      const disco = svgEl("circle", { r: scelta ? 20 : 16, fill: "#fff", stroke: s.stazione ? colore : "#94a3b8", "stroke-width": scelta ? 5 : 3 });
      g.append(disco, testoSvg({ y: 5, "text-anchor": "middle", "font-size": 13, "font-weight": 800, fill: "#17203b" }, String(i + 1)));
      const apri = () => cambia({ stazione: st.id });
      g.addEventListener("click", apri);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(); } });
      svg.append(g);
      svg.append(testoSvg({ x: cx, y: 100, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#17203b" }, st.nome));
      // valore della stazione, spezzato su due righe se lungo
      const testo = v.valore;
      const righe = testo.length > 22 ? [testo.slice(0, testo.lastIndexOf(" ", 22) > 0 ? testo.lastIndexOf(" ", 22) : 22), testo.slice(testo.lastIndexOf(" ", 22) > 0 ? testo.lastIndexOf(" ", 22) + 1 : 22)] : [testo];
      righe.slice(0, 2).forEach((riga, k) => {
        const corto = k === 1 && riga.length > 24 ? `${riga.slice(0, 22)}…` : riga;
        svg.append(testoSvg({ x: cx, y: 120 + k * 14, "text-anchor": "middle", "font-size": 10.5, fill: s.stazione && v.sbagliato ? "#9f1239" : "#5b6684" }, corto));
      });
      if (scelta && !ridotto) disco.animate([{ transform: "scale(.6)" }, { transform: "scale(1.15)" }, { transform: "scale(1)" }], { duration: durata(360) });
    });
    if (esito.esito === "giusto") {
      const ix = sc.stazioni.findIndex((x) => x.id === s.stazione);
      const anello = svgEl("circle", { cx: 40 + ix * passo, cy: 60, r: 30, fill: "none", stroke: "#e11d48", "stroke-width": 2.5, "stroke-dasharray": "5 4" });
      svg.append(anello);
      if (!ridotto) anello.animate([{ opacity: 0 }, { opacity: 1 }], { duration: durata(400) });
    }
    zonaFase.replaceChildren(el("div", { class: "sezione-titolo" }, E.pipeline), svg);
  }

  function blocchiRegole(regole) {
    return righeRegole(sc, regole).map((r) => el("div", { class: `regola ${r.classe}` }, r.testo, r.mai ? el("span", { class: "mai" }, T.regola_mai) : null));
  }
  function disegnaRegola() {
    const figli = [el("div", { class: "sezione-titolo" }, E.regole), el("div", { class: "regole" },
      el("div", { class: "titoletto" }, E.regole_adesso), blocchiRegole(sc.regole_bug),
      s.correzione ? el("div", { class: "titoletto" }, E.regole_corrette) : null,
      s.correzione ? blocchiRegole(regoleDi(sc, s.correzione)) : null)];
    zonaFase.replaceChildren(...figli);
  }
  function disegnaRilancio() {
    zonaFase.replaceChildren(el("div", { class: "sezione-titolo" }, E.regole), el("div", { class: "regole" }, blocchiRegole(regoleDi(sc, s.correzione))),
      s.correzione ? el("p", { style: "font-size:.8rem;color:var(--tenue);margin:4px 6px" }, T.nota_punteggio) : null);
  }

  // ------------------------------------------------ taccuino
  function riga(testo, classe) { return el("div", { class: `riga ${classe || ""}` }, testo); }
  function disegnaTaccuino() {
    const figli = [];
    if (s.fase === "report") {
      if (!s.scelta_report) figli.push(riga(T.scegli_prima));
      else {
        figli.push(el("div", { class: `esito-scheda ${s.scelta_report === "controlla" ? "ok" : "avviso"}` }, el("div", {}, s.scelta_report === "controlla" ? T.esito_controlla : T.esito_festeggia)));
        figli.push(el("h4", {}, E.indizi), ...sc.indizi.map((t) => riga(t, "avviso")));
      }
    } else if (s.fase === "risposte") {
      const conf = confronta(sc, s.etichette);
      figli.push(riga(riempi(T.conteggio_etichette, { fatte: conf.fatte, totali: conf.totali })));
      if (s.confrontato) {
        figli.push(el("div", { class: "esito-scheda male" }, el("div", {}, riempi(T.confronto_esito, { sbagliate: conf.sbagliateCrm, giuste: conf.giuste, totali: conf.totali }))));
        for (const x of conf.righe) {
          const r = risposta(sc, x.id);
          figli.push(riga(riempi(T.riga_confronto, { nome: r.nome, tua: x.tua ? categoria(sc, x.tua).nome : T.nessuna_tua, crm: categoria(sc, x.crm).nome, giusta: categoria(sc, x.giusta).nome }), x.crmGiusto ? "ok" : "male"));
        }
      }
    } else if (s.fase === "traccia") {
      const es = valutaStazione(sc, s.risposta_aperta, s.stazione);
      const classe = { giusto: "ok", prima: "avviso", dopo: "avviso", nessun_errore: "neutro", scegli: "neutro" }[es.esito];
      figli.push(el("div", { class: `esito-scheda ${classe}` }, el("div", {}, es.testo)));
    } else if (s.fase === "regola" || s.fase === "rilancio") {
      if (!s.correzione) figli.push(riga(T.corr_scegli));
      else {
        const v = valutaCorrezione(sc, s.correzione);
        const classe = { giusta: "ok", quasi: "avviso", fragile: "avviso", inutile: "male" }[v.tipo];
        figli.push(el("div", { class: `esito-scheda ${classe}` }, el("div", {}, v.spiega)));
        figli.push(riga(riempi(T.corr_punteggio, { giuste: v.giuste, totali: v.totali })));
        for (const x of v.righe) {
          const r = risposta(sc, x.id);
          figli.push(riga(riempi(T.corr_riga, { nome: r.nome, etichetta: r.etichetta_llm, categoria: categoria(sc, x.categoria).nome }), x.giusta ? "ok" : "male"));
        }
      }
      if (s.fase === "rilancio") {
        const a = valutaAbitudini(sc, s.abitudini);
        figli.push(el("h4", {}, E.abitudini), riga(riempi(T.abitudini_esito, { buone: a.buone, totali_buone: a.totaliBuone, cattive: a.cattive }), a.cattive === 0 && a.buone === a.totaliBuone ? "ok" : ""));
        for (const x of a.righe) {
          const ab = sc.abitudini.find((y) => y.id === x.id);
          figli.push(riga(`${ab.testo}: ${x.buona ? T.abitudine_buona : T.abitudine_cattiva}`, x.buona ? "ok" : "male"));
        }
      }
    }
    taccuino.replaceChildren(...figli);
  }

  function aggiornaComandi() {
    for (const f of FASI) zone[f].classList.toggle("nascosto", f !== s.fase);
    segScelta.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.scelta_report)));
    const conf = confronta(sc, s.etichette);
    contaEtichette.textContent = riempi(T.conteggio_etichette, { fatte: conf.fatte, totali: conf.totali });
    selRisposta.value = s.risposta_aperta;
    btnStazioni.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.stazione)));
    segCorr.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.correzione)));
    iCorr.checked = s.correzione === corretta.id;
    for (const [id, input] of Object.entries(caselleAbitudini)) input.checked = Boolean(s.abitudini[id]);
  }

  function disegna() {
    if (distrutto) return;
    aggiornaComandi();
    disegnaReport();
    if (s.fase === "report") zonaFase.replaceChildren();
    else if (s.fase === "risposte") disegnaRisposte();
    else if (s.fase === "traccia") disegnaTraccia();
    else if (s.fase === "regola") disegnaRegola();
    else disegnaRilancio();
    disegnaTaccuino();
  }

  function cambia(diff) {
    Object.assign(s, diff);
    disegna();
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) {
      if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    }
    const nuovo = { ...s, ...(stato || {}) };
    if (!FASI.includes(nuovo.fase)) throw new Error(`stato_animazione: fase sconosciuta «${nuovo.fase}»`);
    if (!["", "festeggia", "controlla"].includes(nuovo.scelta_report)) throw new Error(`stato_animazione: scelta_report sconosciuta «${nuovo.scelta_report}»`);
    risposta(sc, nuovo.risposta_aperta);
    if (nuovo.stazione && !sc.stazioni.some((x) => x.id === nuovo.stazione)) throw new Error(`stato_animazione: stazione sconosciuta «${nuovo.stazione}»`);
    regoleDi(sc, nuovo.correzione);
    for (const [k, v] of Object.entries(nuovo.etichette || {})) { risposta(sc, k); if (v) categoria(sc, v); }
    for (const k of Object.keys(nuovo.abitudini || {})) if (!sc.abitudini.some((a) => a.id === k)) throw new Error(`stato_animazione: abitudine sconosciuta «${k}»`);
    Object.assign(s, nuovo, { etichette: { ...(nuovo.etichette || {}) }, abitudini: { ...(nuovo.abitudini || {}) } });
    disegna();
  }

  applica({});
  return {
    applica,
    distruggi() { distrutto = true; },
    _prova: { stato: s, report: () => report(sc, regoleScena()), confronta: () => confronta(sc, s.etichette) },
  };
}
