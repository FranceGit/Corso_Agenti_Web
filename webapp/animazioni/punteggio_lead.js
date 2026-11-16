// Lezione interattiva "Lead scoring con un LLM": 10 lead in classifica, punteggio a regole (pesi a cursori e fasce)
// affiancato al giudizio di un modello linguistico (valori precalcolati nello scenario, quindi deterministici).
// Istruzioni vaghe = tutti 90-92 "Alta" (il difetto del punteggio senza rubrica); "Valuta 5 volte" mostra la
// dispersione dei tentativi; "Confronto": lo studente marca i disaccordi come "aiuta" o "inventa" dopo aver chiesto
// "Da dove viene?"; "Mista": regole sui campi + modello solo sulle note citate, con la calibrazione sugli esiti reali.
// Tutti i testi e i numeri arrivano dallo scenario della lezione.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "punteggio_lead";
const COLORE_FASCIA = { alta: "#16a34a", media: "#d97706", bassa: "#94a3b8" };
const G = { y0: 46, riga: 40, xNome: 34, xReg: 250, wTraccia: 130, xMod: 452, xCli: 672, larghezza: 720 };

const STILE = `
.lz-punteggio_lead .riga-lead { cursor: pointer; }
.lz-punteggio_lead .riga-lead:focus-visible .sfondo-riga { stroke: #4f46e5; stroke-width: 2.5; }
.lz-punteggio_lead .scheda-lead { display: grid; gap: 6px; font-size: .86rem; }
.lz-punteggio_lead .scheda-lead .titolo { font-weight: 800; font-size: .98rem; }
.lz-punteggio_lead .scheda-lead .sotto { color: var(--tenue); font-size: .8rem; }
.lz-punteggio_lead .scheda-lead dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; margin: 4px 0 0; }
.lz-punteggio_lead .scheda-lead dt { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--tenue-2); padding-top: 2px; }
.lz-punteggio_lead .scheda-lead dd { margin: 0; }
.lz-punteggio_lead .nota-lead { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 6px 8px; border-radius: 6px; font-style: italic; }
.lz-punteggio_lead .motivazione { background: #eef2ff; border-radius: 10px; padding: 8px 10px; font-size: .84rem; }
.lz-punteggio_lead .fonte { margin-top: 6px; padding: 7px 10px; border-radius: 10px; font-size: .82rem; animation: entra .35s ease; }
.lz-punteggio_lead .fonte.scheda { background: var(--ok-chiaro); color: #166534; }
.lz-punteggio_lead .fonte.nota { background: #e0f2fe; color: #075985; }
.lz-punteggio_lead .fonte.nessuna { background: var(--male-chiaro); color: #9f1239; }
.lz-punteggio_lead .marca { display: flex; gap: 6px; margin-top: 8px; }
.lz-punteggio_lead .marca .btn { flex: 1; justify-content: center; }
.lz-punteggio_lead .marca .btn[aria-pressed="true"] { outline: 2px solid #4f46e5; }
.lz-punteggio_lead .riepilogo { margin-top: 12px; display: grid; gap: 4px; font-size: .8rem; color: var(--tenue); }
.lz-punteggio_lead .riepilogo b { color: var(--inchiostro); }
.lz-punteggio_lead .calibrazione { margin-top: 12px; display: grid; gap: 7px; font-size: .82rem; }
.lz-punteggio_lead .calibrazione .voce-cal { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; align-items: center; }
.lz-punteggio_lead .calibrazione .barretta { grid-column: 1 / -1; height: 7px; border-radius: 4px; background: #eef1f8; overflow: hidden; }
.lz-punteggio_lead .calibrazione .barretta i { display: block; height: 100%; background: #6366f1; border-radius: 4px; transition: width .5s; }
.lz-punteggio_lead .calibrazione .voce-cal.mista .barretta i { background: #16a34a; }
.lz-punteggio_lead .verifica { display: grid; gap: 6px; margin-top: 10px; }
.lz-punteggio_lead .verifica .riga { font-size: .82rem; padding: 7px 10px; border-radius: 10px; }
.lz-punteggio_lead .verifica .riga.ok { background: var(--ok-chiaro); color: #166534; }
.lz-punteggio_lead .verifica .riga.no { background: var(--male-chiaro); color: #9f1239; }
.lz-punteggio_lead .verifica .riga.manca { background: var(--avviso-chiaro); color: #92400e; }
.lz-punteggio_lead .nota { font-size: .8rem; color: var(--tenue); margin: 6px 0 0; }
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
function riempi(modello, valori) {
  return modello.replace(/\{(\w+)\}/g, (_, k) => {
    if (!(k in valori)) throw new Error(`segnaposto {${k}} senza valore`);
    return valori[k];
  });
}

// ------------------------------------------------------------------ logica (pura)

/** Valore 0-1 di ogni criterio per un lead, letto dalle regole dello scenario. */
export function valoriCriteri(sc, lead) {
  const R = sc.regole;
  const settore = R.settori[lead.settore];
  if (!settore) throw new Error(`settore sconosciuto: ${lead.settore}`);
  const fascia = R.fasce_dimensione.find((f) => f.fino_a === undefined || lead.dipendenti <= f.fino_a);
  const c = R.comportamento;
  if (!(lead.livello_ruolo in R.valore_ruolo)) throw new Error(`livello di ruolo sconosciuto: ${lead.livello_ruolo}`);
  return {
    settore: settore.prioritario ? R.valore_settore.prioritario : R.valore_settore.altro,
    dimensione: fascia.valore,
    comportamento: Math.min(1, (lead.visite + c.peso_download * lead.download) / c.pieno_a),
    ruolo: R.valore_ruolo[lead.livello_ruolo],
  };
}

/** Punteggio a regole 0-100: media dei valori dei criteri pesata con i cursori. */
export function punteggioRegole(sc, pesi, lead) {
  const v = valoriCriteri(sc, lead);
  let somma = 0, totale = 0;
  for (const cr of sc.criteri) {
    const p = Number(pesi[cr.id] || 0);
    somma += p * v[cr.id];
    totale += p;
  }
  return totale === 0 ? 0 : Math.round((100 * somma) / totale);
}

export function fascia(punti, alta, media) {
  if (punti >= alta) return "alta";
  if (punti >= media) return "media";
  return "bassa";
}

/** Un metodo "indovina" un lead se da' Alta a chi e' diventato cliente e non la da' agli altri. */
function indovinati(righe, chiave) {
  return righe.filter((r) => (r[chiave] === "alta") === r.cliente).length;
}

export function calcola(sc, s) {
  const righe = sc.lead.map((ld) => {
    const regole = punteggioRegole(sc, s.pesi, ld);
    const fReg = fascia(regole, s.soglia_alta, s.soglia_media);
    const vaghe = ld.llm.vaghe.punti[0];
    const espl = ld.llm.esplicite.punti[0];
    const fVaghe = fascia(vaghe, s.soglia_alta, s.soglia_media);
    const fEspl = fascia(espl, s.soglia_alta, s.soglia_media);
    let llm = null, fLlm = null, punti = [];
    if (s.llm === "vaghe") { llm = vaghe; fLlm = fVaghe; punti = ld.llm.vaghe.punti; }
    else if (s.llm === "esplicite") { llm = espl; fLlm = fEspl; punti = ld.llm.esplicite.punti; }
    else if (s.llm !== "nascosto") throw new Error(`llm sconosciuto: ${s.llm}`);
    // mista: le regole decidono, il modello sposta il punteggio solo quando cita la nota scritta
    const mista = ld.llm.esplicite.fonte.tipo === "nota" ? espl : regole;
    const fMista = fascia(mista, s.soglia_alta, s.soglia_media);
    return {
      id: ld.id, regole, fReg, llm, fLlm, punti,
      scarto: punti.length ? Math.max(...punti) - Math.min(...punti) : 0,
      fVaghe, fEspl, mista, fMista,
      disaccordo: fReg !== fEspl,
      fonte: ld.llm.esplicite.fonte.tipo,
      cliente: Boolean(ld.cliente),
    };
  });
  const chiaveOrdine = s.modalita === "mista" ? "mista" : "regole";
  const ordine = [...righe].sort((a, b) => b[chiaveOrdine] - a[chiaveOrdine] || a.id.localeCompare(b.id)).map((r) => r.id);
  const conta = (k) => ({ alta: righe.filter((r) => r[k] === "alta").length, media: righe.filter((r) => r[k] === "media").length, bassa: righe.filter((r) => r[k] === "bassa").length });
  return {
    righe, ordine,
    distribuzione: { regole: conta("fReg"), modello: s.llm === "nascosto" ? null : conta("fLlm") },
    accordo: { regole: indovinati(righe, "fReg"), vaghe: indovinati(righe, "fVaghe"), esplicite: indovinati(righe, "fEspl"), mista: indovinati(righe, "fMista"), totale: righe.length },
  };
}

/** Testo "Da dove viene?" della motivazione del modello (criteri espliciti) per un lead. */
export function testoFonte(sc, lead) {
  const f = lead.llm.esplicite.fonte;
  const T = sc.testi;
  if (f.tipo === "scheda") return riempi(T.fonte_scheda, { testo: f.testo });
  if (f.tipo === "nota") return riempi(T.fonte_nota, { testo: f.testo });
  if (f.tipo === "nessuna") return T.fonte_nessuna;
  throw new Error(`tipo di fonte sconosciuto: ${f.tipo}`);
}

/** Riscontro della modalita' Confronto: per ogni disaccordo, la marcatura dello studente e' giusta? */
export function verifica(sc, s) {
  const T = sc.testi;
  const calc = calcola(sc, { ...s, llm: "esplicite" });
  const righe = calc.righe.filter((r) => r.disaccordo).map((r) => {
    const ld = sc.lead.find((x) => x.id === r.id);
    const atteso = r.fonte === "nessuna" ? "inventa" : "aiuta";
    const scelto = s.marcature[r.id];
    let esito, classe;
    if (!scelto) { esito = "manca"; classe = "manca"; }
    else if (scelto === atteso) { esito = `${atteso}_ok`; classe = "ok"; }
    else { esito = `${scelto}_no`; classe = "no"; }
    return { id: r.id, atteso, scelto: scelto || null, classe, testo: riempi(T[`ver_${esito}`], { nome: ld.nome }) };
  });
  const giusti = righe.filter((r) => r.classe === "ok").length;
  const sintesi = giusti === righe.length ? T.ver_tutto : riempi(T.ver_sintesi, { giusti, totale: righe.length });
  return { righe, giusti, totale: righe.length, sintesi };
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
  const num = (n) => Number(n).toLocaleString(lingua);

  const s = {
    pesi: Object.fromEntries(sc.criteri.map((c) => [c.id, 3])),
    soglia_alta: 70,
    soglia_media: 40,
    llm: "nascosto",
    cinque_volte: false,
    modalita: "classifica",
    marcature: {},
    lead_aperto: sc.lead[0].id,
    fonte_aperta: false,
    verificato: false,
  };
  let calc = null;
  let posizioniPrima = null;

  // ------------------------------------------------ comandi (sinistra)
  const comandi = el("aside", { class: "pannello" });
  const cursore = (etichetta, conf, leggi, scrivi) => {
    const valore = el("b", {});
    const input = el("input", { type: "range", min: conf.min, max: conf.max, step: conf.passo, "aria-label": etichetta });
    input.addEventListener("input", () => { valore.textContent = num(input.value); scrivi(Number(input.value)); });
    const nodo = el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, etichetta), valore), input);
    return { nodo, imposta: () => { input.value = leggi(); valore.textContent = num(leggi()); } };
  };
  const cursori = sc.criteri.map((cr) => cursore(cr.nome, sc.pesi, () => s.pesi[cr.id], (v) => cambia({ pesi: { ...s.pesi, [cr.id]: v } })));
  const cAlta = cursore(sc.soglia_alta.etichetta, sc.soglia_alta, () => s.soglia_alta, (v) => cambia({ soglia_alta: v }));
  const cMedia = cursore(sc.soglia_media.etichetta, sc.soglia_media, () => s.soglia_media, (v) => cambia({ soglia_media: v }));
  const segmentato = (aria, voci, chiave) => {
    const g = el("div", { class: "segmentato", role: "group", "aria-label": aria },
      voci.map((v) => el("button", { "data-v": v, onclick: () => cambia({ [chiave]: v }) }, E[v])));
    return g;
  };
  const segLlm = segmentato(E.modello, ["nascosto", "vaghe", "esplicite"], "llm");
  const btnCinque = el("button", { class: "btn", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => cambia({ cinque_volte: !s.cinque_volte }) }, E.cinque_volte);
  const notaLlm = el("p", { class: "nota" });
  const segModo = segmentato(E.modalita, ["classifica", "confronto", "mista"], "modalita");
  const notaModo = el("p", { class: "nota" });
  comandi.append(
    el("h3", {}, E.titolo_comandi),
    el("h4", {}, E.pesi), cursori.map((c) => c.nodo),
    el("h4", {}, E.soglie), cAlta.nodo, cMedia.nodo,
    el("h4", {}, E.modello), segLlm, btnCinque, notaLlm,
    el("h4", {}, E.modalita), segModo, notaModo);

  // ------------------------------------------------ scena (centro)
  const scena = el("div", { class: "scena" });
  const altezza = G.y0 + sc.lead.length * G.riga + 10;
  const svg = svgEl("svg", { viewBox: `0 0 ${G.larghezza} ${altezza}`, role: "img", "aria-label": E.descrizione_scena });
  const intest = (x, testo, anchor) => testoSvg({ x, y: 26, "font-size": 11.5, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em", "text-anchor": anchor || "start" }, testo);
  const tModello = intest(G.xMod, E.col_modello);
  const tCliente = intest(G.xCli + 18, E.col_cliente, "middle");
  const tRegole = intest(G.xReg, E.col_regole);
  svg.append(intest(G.xNome, E.col_lead), tRegole, tModello, tCliente);
  const gRighe = svgEl("g");
  svg.append(gRighe);
  const RIGHE = {};
  const traccia = (g, x, y) => {
    g.append(svgEl("rect", { x, y: y - 4, width: G.wTraccia, height: 8, rx: 4, fill: "#eef1f8" }));
    for (const t of [0, 50, 100]) g.append(svgEl("line", { x1: x + (t / 100) * G.wTraccia, x2: x + (t / 100) * G.wTraccia, y1: y - 7, y2: y + 7, stroke: "#d6dcea", "stroke-width": 1 }));
  };
  const chip = (g, x, y) => {
    const r = svgEl("rect", { x, y: y - 9, width: 50, height: 18, rx: 9, fill: "#94a3b8" });
    const t = testoSvg({ x: x + 25, y: y + 4, "text-anchor": "middle", "font-size": 10.5, "font-weight": 800, fill: "#fff" }, "");
    g.append(r, t);
    return { r, t };
  };
  sc.lead.forEach((ld) => {
    const g = svgEl("g", { class: "riga-lead", tabindex: "0", role: "button", "aria-label": riempi(T.apri_lead, { nome: ld.nome }) });
    const sfondo = svgEl("rect", { class: "sfondo-riga", x: 4, y: 2, width: G.larghezza - 8, height: G.riga - 4, rx: 10, fill: "#fff", stroke: "#e5e9f3", "stroke-width": 1 });
    const pos = testoSvg({ x: 18, y: 25, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#8a94ae" }, "");
    const nome = testoSvg({ x: G.xNome, y: 18, "font-size": 12.5, "font-weight": 800, fill: "#17203b" }, ld.nome);
    const sotto = testoSvg({ x: G.xNome, y: 32, "font-size": 10, fill: "#5b6684" }, riempi(T.riga_sotto, { ruolo: ld.ruolo, azienda: ld.azienda }));
    const notaIcona = ld.nota ? testoSvg({ x: 224, y: 24, "font-size": 13, fill: "#d97706" }, "✎") : null;
    g.append(sfondo, pos, nome, sotto);
    if (notaIcona) g.append(notaIcona);
    const yc = G.riga / 2;
    traccia(g, G.xReg, yc);
    const barra = svgEl("rect", { x: G.xReg, y: yc - 4, width: 0, height: 8, rx: 4, fill: "#6366f1" });
    const numReg = testoSvg({ x: G.xReg + G.wTraccia + 6, y: yc + 4, "font-size": 11, "font-weight": 800, fill: "#17203b" }, "");
    g.append(barra, numReg);
    const chipReg = chip(g, G.xReg + G.wTraccia + 30, yc);
    const gMod = svgEl("g");
    traccia(gMod, G.xMod, yc);
    const gPunti = svgEl("g");
    const numMod = testoSvg({ x: G.xMod + G.wTraccia + 6, y: yc + 4, "font-size": 11, "font-weight": 800, fill: "#17203b" }, "");
    gMod.append(gPunti, numMod);
    const chipMod = chip(gMod, G.xMod + G.wTraccia + 30, yc);
    g.append(gMod);
    const cliente = testoSvg({ x: G.xCli + 18, y: yc + 5, "text-anchor": "middle", "font-size": 15, "font-weight": 800 }, "");
    g.append(cliente);
    const apri = () => cambia({ lead_aperto: ld.id, fonte_aperta: false }, true);
    g.addEventListener("click", apri);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(); } });
    gRighe.append(g);
    RIGHE[ld.id] = { g, sfondo, pos, barra, numReg, chipReg, gMod, gPunti, numMod, chipMod, cliente };
  });
  scena.append(svg);

  // ------------------------------------------------ scheda (destra)
  const destra = el("aside", { class: "pannello destra" });
  const scheda = el("div", { class: "scheda-lead", "aria-live": "polite" });
  const zonaExtra = el("div", { "aria-live": "polite" });
  const riepilogo = el("div", { class: "riepilogo" });
  destra.append(el("h3", {}, E.titolo_scheda), scheda, zonaExtra, riepilogo);

  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno
  function disegnaScena() {
    calc = calcola(sc, s);
    const mista = s.modalita === "mista";
    tModello.textContent = mista ? E.col_mista : E.col_modello;
    tCliente.setAttribute("opacity", mista ? "1" : "0");
    const nuove = {};
    calc.ordine.forEach((id, i) => { nuove[id] = G.y0 + i * G.riga; });
    for (const r of calc.righe) {
      const R = RIGHE[r.id];
      const y = nuove[r.id];
      const da = posizioniPrima ? posizioniPrima[r.id] : y;
      R.g.setAttribute("transform", `translate(0,${y})`);
      if (da !== y && !ridotto) R.g.animate([{ transform: `translate(0px,${da}px)` }, { transform: `translate(0px,${y}px)` }], { duration: durata(450), easing: "cubic-bezier(.2,.8,.2,1)" });
      R.pos.textContent = String(calc.ordine.indexOf(r.id) + 1);
      R.barra.setAttribute("width", String((r.regole / 100) * G.wTraccia));
      R.numReg.textContent = num(r.regole);
      R.chipReg.r.setAttribute("fill", COLORE_FASCIA[r.fReg]);
      R.chipReg.t.textContent = E[r.fReg];
      // colonna modello (o mista)
      R.gPunti.replaceChildren();
      let valore = null, fasciaCol = null;
      if (mista) { valore = r.mista; fasciaCol = r.fMista; }
      else if (s.llm !== "nascosto") { valore = r.llm; fasciaCol = r.fLlm; }
      R.gMod.setAttribute("opacity", valore === null ? "0.25" : "1");
      if (valore !== null) {
        const yc = G.riga / 2;
        if (!mista && s.cinque_volte) {
          R.gPunti.append(svgEl("rect", { x: G.xMod + (Math.min(...r.punti) / 100) * G.wTraccia, y: yc - 6, width: Math.max(2, (r.scarto / 100) * G.wTraccia), height: 12, rx: 6, fill: "#c7d2fe", opacity: ".7" }));
          r.punti.forEach((p, k) => {
            const c = svgEl("circle", { cx: G.xMod + (p / 100) * G.wTraccia, cy: yc, r: 4, fill: "#4f46e5", stroke: "#fff", "stroke-width": 1.2 });
            R.gPunti.append(c);
            if (!ridotto) c.animate([{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "none" }], { duration: durata(260), delay: k * 60, fill: "backwards" });
          });
        } else {
          R.gPunti.append(svgEl("rect", { x: G.xMod, y: yc - 4, width: (valore / 100) * G.wTraccia, height: 8, rx: 4, fill: mista ? "#16a34a" : "#4f46e5" }));
        }
        R.numMod.textContent = num(valore);
        R.chipMod.r.setAttribute("fill", COLORE_FASCIA[fasciaCol]);
        R.chipMod.t.textContent = E[fasciaCol];
      } else {
        R.numMod.textContent = "";
        R.chipMod.r.setAttribute("fill", "#e5e9f3");
        R.chipMod.t.textContent = "";
      }
      R.cliente.textContent = mista ? (r.cliente ? "✓" : "✗") : "";
      R.cliente.setAttribute("fill", r.cliente ? "#16a34a" : "#94a3b8");
      const evidenzia = s.modalita === "confronto" && r.disaccordo;
      const aperto = r.id === s.lead_aperto;
      R.sfondo.setAttribute("fill", evidenzia ? "#fff7e6" : aperto ? "#f5f7ff" : "#fff");
      R.sfondo.setAttribute("stroke", aperto ? "#6366f1" : evidenzia ? "#f59e0b" : "#e5e9f3");
      R.sfondo.setAttribute("stroke-width", aperto || evidenzia ? "2" : "1");
    }
    posizioniPrima = nuove;
  }

  function disegnaScheda() {
    const ld = sc.lead.find((x) => x.id === s.lead_aperto);
    const r = calc.righe.find((x) => x.id === ld.id);
    const settore = sc.regole.settori[ld.settore];
    const parti = [
      el("div", { class: "titolo" }, ld.nome),
      el("div", { class: "sotto" }, riempi(T.riga_sotto, { ruolo: ld.ruolo, azienda: ld.azienda })),
      el("dl", {},
        el("dt", {}, E.settore), el("dd", {}, settore.nome),
        el("dt", {}, E.dimensione), el("dd", {}, riempi(T.dipendenti, { n: num(ld.dipendenti) })),
        el("dt", {}, E.comportamento), el("dd", {}, riempi(T.comportamento, { visite: num(ld.visite), download: num(ld.download) })),
        el("dt", {}, E.ruolo), el("dd", {}, sc.livelli_ruolo[ld.livello_ruolo]),
        el("dt", {}, E.nota), el("dd", {}, ld.nota ? el("div", { class: "nota-lead" }, ld.nota) : T.nessuna_nota)),
    ];
    const tipoLlm = s.modalita === "classifica" ? s.llm : "esplicite";
    if (tipoLlm !== "nascosto") {
      const dati = ld.llm[tipoLlm];
      parti.push(el("h4", {}, E.motivazione), el("div", { class: "motivazione" }, dati.motivazione));
      if (s.modalita === "classifica" && s.cinque_volte) parti.push(el("div", { class: "sotto" }, riempi(T.dispersione, { min: num(Math.min(...r.punti)), max: num(Math.max(...r.punti)), scarto: num(r.scarto) })));
      if (tipoLlm === "esplicite") {
        parti.push(el("button", { class: "btn", style: "margin-top:6px", "aria-expanded": String(s.fonte_aperta), onclick: () => cambia({ fonte_aperta: !s.fonte_aperta }, true) }, E.da_dove));
        if (s.fonte_aperta) parti.push(el("div", { class: `fonte ${dati.fonte.tipo}` }, testoFonte(sc, ld)));
      }
    }
    if (s.modalita === "confronto" && r.disaccordo) {
      const marca = (v) => el("button", { class: "btn", "aria-pressed": String(s.marcature[ld.id] === v), onclick: () => cambia({ marcature: { ...s.marcature, [ld.id]: v } }) }, E[v]);
      parti.push(el("div", { class: "marca" }, marca("aiuta"), marca("inventa")));
    }
    if (s.modalita === "mista") parti.push(el("div", { class: "sotto" }, ld.cliente ? T.cliente_si : T.cliente_no));
    scheda.replaceChildren(...parti);
    scheda.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: durata(260) });
  }

  function disegnaExtra() {
    const pezzi = [];
    if (s.modalita === "confronto") {
      const dis = calc.righe.filter((r) => r.disaccordo);
      const marcati = dis.filter((r) => s.marcature[r.id]).length;
      pezzi.push(el("p", { class: "nota" }, riempi(T.disaccordi, { n: dis.length, marcati })));
      pezzi.push(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => cambia({ verificato: true }, true) }, E.controlla));
      if (s.verificato) {
        const v = verifica(sc, s);
        pezzi.push(el("div", { class: "verifica" },
          el("div", { class: `esito-scheda ${v.giusti === v.totale ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
          v.righe.map((x) => el("div", { class: `riga ${x.classe}` }, x.testo))));
      }
    }
    if (s.modalita === "mista") {
      const A = calc.accordo;
      const voce = (nome, n, classe) => el("div", { class: `voce-cal ${classe || ""}` }, el("span", {}, nome), el("b", {}, riempi(T.accordo, { giusti: num(n), totale: num(A.totale) })),
        el("div", { class: "barretta" }, el("i", { style: `width:${(100 * n) / A.totale}%` })));
      pezzi.push(el("div", { class: "calibrazione" },
        el("h4", {}, E.calibrazione),
        voce(E.cal_regole, A.regole), voce(E.cal_vaghe, A.vaghe), voce(E.cal_esplicite, A.esplicite), voce(E.cal_mista, A.mista, "mista"),
        el("p", { class: "nota" }, T.spiega_calibrazione)));
    }
    zonaExtra.replaceChildren(...pezzi);
  }

  function disegnaRiepilogo() {
    const D = calc.distribuzione;
    riepilogo.replaceChildren(
      el("div", {}, el("b", {}, E.distribuzione_regole), " ", riempi(T.distribuzione, D.regole)),
      D.modello ? el("div", {}, el("b", {}, E.distribuzione_modello), " ", riempi(T.distribuzione, D.modello)) : null);
  }

  function aggiornaComandi() {
    cursori.forEach((c) => c.imposta());
    cAlta.imposta();
    cMedia.imposta();
    segLlm.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.llm)));
    segModo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.modalita)));
    btnCinque.setAttribute("aria-pressed", String(s.cinque_volte));
    btnCinque.disabled = s.llm === "nascosto" || s.modalita !== "classifica";
    notaLlm.textContent = s.llm === "vaghe" ? T.nota_vaghe : s.llm === "esplicite" ? T.nota_esplicite : "";
    notaModo.textContent = s.modalita === "mista" ? T.nota_mista : "";
  }

  function disegnaTutto() {
    aggiornaComandi();
    disegnaScena();
    disegnaScheda();
    disegnaExtra();
    disegnaRiepilogo();
  }

  // ------------------------------------------------ interazioni
  function cambia(diff, mantieniVerifica) {
    Object.assign(s, diff);
    if (s.modalita !== "classifica" && s.llm === "nascosto") s.llm = "esplicite";
    if (!mantieniVerifica && !("verificato" in diff)) s.verificato = false;
    disegnaTutto();
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) {
      if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    }
    const nuovo = { ...s, ...(stato || {}) };
    nuovo.pesi = { ...s.pesi, ...(nuovo.pesi || {}) };
    for (const k of Object.keys(nuovo.pesi)) if (!sc.criteri.some((c) => c.id === k)) throw new Error(`stato_animazione: criterio sconosciuto «${k}»`);
    if (!sc.lead.some((x) => x.id === nuovo.lead_aperto)) throw new Error(`stato_animazione: lead_aperto sconosciuto «${nuovo.lead_aperto}»`);
    if (!["nascosto", "vaghe", "esplicite"].includes(nuovo.llm)) throw new Error(`stato_animazione: llm sconosciuto «${nuovo.llm}»`);
    if (!["classifica", "confronto", "mista"].includes(nuovo.modalita)) throw new Error(`stato_animazione: modalita sconosciuta «${nuovo.modalita}»`);
    nuovo.marcature = { ...(stato && stato.marcature ? stato.marcature : {}) };
    Object.assign(s, nuovo);
    posizioniPrima = null;
    disegnaTutto();
  }

  applica({});
  return {
    applica,
    distruggi() {},
    _prova: { stato: s, calcola: () => calcola(sc, s), verifica: () => verifica(sc, s) },
  };
}
