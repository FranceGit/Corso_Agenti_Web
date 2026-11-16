// Lezione interattiva "Sicurezza e accessi: i caveau dei dati" (P8.4).
// Scena "Accessi": due caveau (Alfa e Beta, clienti concorrenti) e l'agente di Alfa; la parete sta nell'interfaccia o nei
// dati ([R15]+[EXP]), la richiesta e' scritta bene o male; la chiave del servizio email sta nelle istruzioni o in un servizio
// dei segreti; permessi minimi o "select all". Scena "Dati personali": filtro di mascheramento prima del log, sessione con
// cancellazione automatica (TTL), email ostile con controllo dell'output, luogo di elaborazione con le domande da porre.
// Gioco "Decidi tu" su cinque situazioni. Tutti i testi arrivano dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "caveau_dati";
const VISTE = ["accessi", "dati", "decidi"];
const ISOLAMENTI = ["interfaccia", "dati"];
const RICHIESTE = ["giusta", "malcostruita"];
const SEGRETI = ["istruzioni", "servizio"];
const PERMESSI = ["minimi", "tutti"];
const W = 720, H = 430;
const CAV = { y: 40, h: 165, w: 260, xAlfa: 20, xBeta: 440, leadY: 92, leadPasso: 36, leadW: 220, leadH: 28 };
const AG = { x: 300, y: 222, w: 120, h: 44 };

const STILE = `
.lz-caveau_dati .raggio { transition: opacity .4s ease; }
.lz-caveau_dati .nota { font-size: .78rem; color: var(--tenue); margin: 4px 0 0; }
.lz-caveau_dati .esiti { display: grid; gap: 6px; font-size: .82rem; }
.lz-caveau_dati .esiti div { padding: 7px 10px; border-radius: 10px; background: var(--ok-chiaro); color: #166534; }
.lz-caveau_dati .esiti div.male { background: var(--male-chiaro); color: #9f1239; font-weight: 600; }
.lz-caveau_dati .esiti div.neutro { background: var(--primario-chiaro); color: #3730a3; }
.lz-caveau_dati ul { margin: 6px 0 0; padding-left: 18px; font-size: .8rem; }
.lz-caveau_dati .conta { font-weight: 800; margin: 10px 0 4px; font-size: .86rem; }
.lz-caveau_dati .situazione { display: grid; gap: 3px; margin: 8px 0; font-size: .8rem; }
.lz-caveau_dati .verifica { display: grid; gap: 6px; margin-top: 10px; }
.lz-caveau_dati .verifica .riga { font-size: .8rem; padding: 7px 10px; border-radius: 10px; }
.lz-caveau_dati .verifica .riga.giusto { background: var(--ok-chiaro); color: #166534; }
.lz-caveau_dati .verifica .riga.quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-caveau_dati .verifica .riga.sbagliato, .lz-caveau_dati .verifica .riga.vuoto { background: var(--male-chiaro); color: #9f1239; }
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
function t(attr, testo) {
  const x = svgEl("text", attr);
  x.textContent = testo;
  return x;
}
export function riempi(modello, valori) {
  return modello.replace(/\{(\w+)\}/g, (_, k) => {
    if (!(k in valori)) throw new Error(`segnaposto {${k}} senza valore`);
    return valori[k];
  });
}

// ------------------------------------------------------------------ logica (pura)

/** Sostituisce i dati personali del messaggio con i segnaposto (sostituzioni letterali dichiarate nello scenario). */
export function maschera(sc, testo) {
  return sc.messaggio.sostituzioni.reduce((acc, r) => acc.split(r.trova).join(r.con), testo);
}

/** Che cosa succede con le scelte fatte: fughe, esposizioni, punti deboli aperti per scena. */
export function valuta(sc, s) {
  const [alfa, beta] = sc.clienti;
  const fuga = s.isolamento === "interfaccia" && s.richiesta === "malcostruita";
  const rimbalzo = s.isolamento === "dati" && s.richiesta === "malcostruita";
  const risultati = [...alfa.lead, ...(fuga ? beta.lead : [])];
  const chiave_esposta = s.segreto === "istruzioni";
  const permessi = sc.permessi[s.permessi];
  const extra = permessi.filter((p) => !sc.permessi.minimi.includes(p));
  const log = s.mascheramento ? maschera(sc, sc.messaggio.testo) : sc.messaggio.testo;
  const oltre = s.giorni > sc.giorni.ttl;
  const sessione = !oltre ? "viva" : s.ttl ? "cancellata" : "eterna";
  const uscita = !s.email_ostile ? "quiete" : s.controllo_output ? "bloccata" : "fuga";
  const elab = sc.elaborazioni.find((e) => e.id === s.elaborazione);
  const deboli = {
    accessi: [fuga && "fuga", chiave_esposta && "chiave", extra.length > 0 && "permessi"].filter(Boolean),
    dati: [!s.mascheramento && "log", sessione === "eterna" && "sessione", uscita === "fuga" && "uscita", elab.id === "cloud_extra" && "luogo"].filter(Boolean),
  };
  return { fuga, rimbalzo, risultati, chiave_esposta, permessi, extra, log, sessione, uscita, elab, deboli, totale: deboli.accessi.length + deboli.dati.length };
}

/** Riscontro del gioco "Decidi tu". */
export function verifica(sc, s) {
  const T = sc.testi;
  const righe = sc.situazioni.map((x, i) => {
    const scelta = s.scelte[x.id] || "";
    const esito = !scelta ? "vuoto" : scelta === x.migliore ? "giusto" : x.quasi.includes(scelta) ? "quasi" : "sbagliato";
    return { id: x.id, esito, testo: riempi(T[`ver_${esito}`], { n: i + 1, migliore: sc.opzioni_gioco[x.migliore], spiega: x.spiega }) };
  });
  const giuste = righe.filter((r) => r.esito === "giusto").length;
  return { righe, giuste, totali: righe.length, sintesi: giuste === righe.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righe.length }) };
}

/** Posizione dei lead nei due caveau. */
export function posizioniLead(sc) {
  const pos = {};
  sc.clienti.forEach((c, i) => c.lead.forEach((_, k) => {
    pos[`${c.id}|${k}`] = { x: (i === 0 ? CAV.xAlfa : CAV.xBeta) + (CAV.w - CAV.leadW) / 2, y: CAV.leadY + k * CAV.leadPasso };
  }));
  return pos;
}
export const DIMENSIONI = { w: W, h: H, leadW: CAV.leadW, leadH: CAV.leadH };

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const lingua = contesto && contesto.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));
  const num = (x) => x.toLocaleString(lingua);
  const [alfa, beta] = sc.clienti;

  const s = {
    vista: "accessi", isolamento: "dati", richiesta: "giusta", segreto: "servizio", permessi: "minimi",
    mascheramento: true, ttl: true, giorni: sc.giorni.min, controllo_output: true, email_ostile: false,
    elaborazione: sc.elaborazioni[0].id, scelte: {}, verificato: false,
  };

  // ------------------------------------------------ comandi
  const seg = (valori, etichette, chiave, aria) => el("div", { class: "segmentato", role: "group", "aria-label": aria },
    ...valori.map((v, i) => el("button", { "data-v": v, onclick: () => cambia({ [chiave]: v }) }, etichette[i])));
  const segVista = seg(VISTE, [E.vista_accessi, E.vista_dati, E.vista_decidi], "vista", E.vista);
  const segIso = seg(ISOLAMENTI, [E.iso_interfaccia, E.iso_dati], "isolamento", E.isolamento);
  const segRic = seg(RICHIESTE, [E.ric_giusta, E.ric_malcostruita], "richiesta", E.richiesta);
  const segSeg = seg(SEGRETI, [E.seg_istruzioni, E.seg_servizio], "segreto", E.segreto);
  const segPerm = seg(PERMESSI, [E.perm_minimi, E.perm_tutti], "permessi", E.permessi);
  const segElab = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.elaborazione },
    ...sc.elaborazioni.map((x) => el("button", { "data-v": x.id, onclick: () => cambia({ elaborazione: x.id }) }, x.nome)));
  const chk = (chiave) => el("input", { type: "checkbox", onchange: (e) => cambia({ [chiave]: e.target.checked }) });
  const chkMask = chk("mascheramento"), chkTtl = chk("ttl"), chkOstile = chk("email_ostile"), chkOut = chk("controllo_output");
  const valGiorni = el("b", {});
  const inGiorni = el("input", { type: "range", min: sc.giorni.min, max: sc.giorni.max, step: sc.giorni.passo, "aria-label": E.giorni });
  inGiorni.addEventListener("input", () => cambia({ giorni: Number(inGiorni.value) }));
  const zonaAccessi = el("div", {},
    el("h4", {}, E.isolamento), segIso, el("h4", {}, E.richiesta), segRic, el("p", { class: "nota" }, E.nota_r15),
    el("h4", {}, E.segreto), segSeg, el("h4", {}, E.permessi), segPerm);
  const zonaDati = el("div", {},
    el("label", { class: "interruttore" }, el("span", {}, E.mascheramento), chkMask),
    el("label", { class: "interruttore" }, el("span", {}, E.ttl), chkTtl),
    el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, E.giorni), valGiorni), inGiorni),
    el("label", { class: "interruttore" }, el("span", {}, E.email_ostile), chkOstile),
    el("label", { class: "interruttore" }, el("span", {}, E.controllo_output), chkOut),
    el("h4", {}, E.elaborazione), segElab);
  const tendine = {};
  const zonaDecidi = el("div", {});
  sc.situazioni.forEach((x, i) => {
    const sel = el("select", { "aria-label": riempi(T.situazione, { n: i + 1 }), onchange: (e) => scegli(x.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...x.opzioni.map((o) => el("option", { value: o }, sc.opzioni_gioco[o])));
    tendine[x.id] = sel;
    zonaDecidi.append(el("label", { class: "situazione" }, el("b", {}, riempi(T.situazione, { n: i + 1 })), el("span", {}, x.testo), sel));
  });
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => { s.verificato = true; disegnaDestra(); } }, E.controlla));
  const comandi = el("aside", { class: "pannello" }, el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaAccessi, zonaDati, zonaDecidi);

  // ------------------------------------------------ scena "accessi"
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img" });
  const gAcc = svgEl("g"), gDat = svgEl("g");
  svg.append(gAcc, gDat);
  const pos = posizioniLead(sc);
  const LEAD = {};
  const pareteBeta = svgEl("rect", { x: CAV.xBeta, y: CAV.y, width: CAV.w, height: CAV.h, rx: 14, fill: "none", "stroke-width": 4 });
  for (const [i, c] of sc.clienti.entries()) {
    const x = i === 0 ? CAV.xAlfa : CAV.xBeta;
    gAcc.append(svgEl("rect", { x, y: CAV.y, width: CAV.w, height: CAV.h, rx: 14, fill: c.colore, "fill-opacity": ".07", stroke: c.colore, "stroke-width": 2 }));
    gAcc.append(t({ x: x + CAV.w / 2, y: CAV.y + 24, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: c.colore }, c.nome));
    c.lead.forEach((testo, k) => {
      const p = pos[`${c.id}|${k}`];
      const r = svgEl("rect", { x: p.x, y: p.y, width: CAV.leadW, height: CAV.leadH, rx: 8, fill: "#fff", stroke: "#cbd2e3", "stroke-width": 1.5 });
      gAcc.append(r, t({ x: p.x + 10, y: p.y + 18, "font-size": 10.5, fill: "#17203b" }, testo));
      LEAD[`${c.id}|${k}`] = r;
    });
  }
  gAcc.append(pareteBeta);
  const tParete = t({ x: CAV.xBeta + CAV.w / 2, y: CAV.y + CAV.h + 15, "text-anchor": "middle", "font-size": 9.5, "font-weight": 800 }, "");
  gAcc.append(tParete);
  const raggioAlfa = svgEl("line", { class: "raggio", x1: AG.x + 20, y1: AG.y, x2: CAV.xAlfa + CAV.w / 2, y2: CAV.y + CAV.h, stroke: "#2563eb", "stroke-width": 3 });
  const raggioBeta = svgEl("polyline", { class: "raggio", fill: "none", "stroke-width": 3, "stroke-linejoin": "round" });
  const croce = t({ x: CAV.xBeta + 34, y: CAV.y + CAV.h + 4, "text-anchor": "middle", "font-size": 22, "font-weight": 900, fill: "#dc2626" }, "✕");
  const tNonAut = t({ x: AG.x + AG.w + 8, y: AG.y - 6, "font-size": 10, "font-weight": 800, fill: "#dc2626" }, E.non_autorizzato);
  gAcc.append(raggioAlfa, raggioBeta, croce, tNonAut);
  gAcc.append(svgEl("rect", { x: AG.x, y: AG.y, width: AG.w, height: AG.h, rx: 12, fill: "#eef0ff", stroke: "#4f46e5", "stroke-width": 2 }));
  gAcc.append(t({ x: AG.x + AG.w / 2, y: AG.y + 19, "text-anchor": "middle", "font-size": 11.5, "font-weight": 800, fill: "#312e81" }, E.agente));
  gAcc.append(t({ x: AG.x + AG.w / 2, y: AG.y + 34, "text-anchor": "middle", "font-size": 8.5, fill: "#4338ca" }, sc.identita));
  const tRichiesta = t({ x: W / 2, y: AG.y + AG.h + 16, "text-anchor": "middle", "font-size": 10, fill: "#5b6684" }, "");
  gAcc.append(tRichiesta);
  // segreti
  const yS = 300;
  const boxIstr = svgEl("rect", { x: 20, y: yS, width: 330, height: 78, rx: 12, fill: "#fff", "stroke-width": 2 });
  const boxCass = svgEl("rect", { x: 370, y: yS, width: 330, height: 78, rx: 12, fill: "#fff", "stroke-width": 2 });
  const tChiaveIstr = t({ x: 32, y: yS + 48, "font-size": 10.5, "font-weight": 700, fill: "#be123c" }, sc.chiave);
  const tChiaveCass = t({ x: 382, y: yS + 44, "font-size": 10.5, "font-weight": 700, fill: "#166534" }, sc.chiave);
  const tToken = t({ x: 382, y: yS + 64, "font-size": 8.8, fill: "#166534" }, sc.token);
  const tEspo = t({ x: 32, y: yS + 66, "font-size": 8.5, fill: "#be123c" }, "");
  gAcc.append(boxIstr, boxCass,
    t({ x: 32, y: yS + 22, "font-size": 11, "font-weight": 800, fill: "#17203b" }, E.istruzioni),
    t({ x: 382, y: yS + 22, "font-size": 11, "font-weight": 800, fill: "#17203b" }, E.cassaforte),
    tChiaveIstr, tChiaveCass, tToken, tEspo);
  const gPermessi = svgEl("g");
  gAcc.append(gPermessi);

  // ------------------------------------------------ scena "dati personali"
  gDat.append(t({ x: 14, y: 30, "font-size": 11, "font-weight": 800, fill: "#17203b" }, E.messaggio));
  gDat.append(svgEl("rect", { x: 10, y: 38, width: 332, height: 34, rx: 9, fill: "#fff", stroke: "#cbd2e3" }));
  gDat.append(t({ x: 18, y: 59, "font-size": 9, fill: "#17203b" }, sc.messaggio.testo));
  const filtro = svgEl("rect", { x: 350, y: 38, width: 62, height: 34, rx: 9, "stroke-width": 2 });
  const tFiltro = t({ x: 381, y: 59, "text-anchor": "middle", "font-size": 9.5, "font-weight": 800 }, "");
  const boxLog = svgEl("rect", { x: 420, y: 38, width: 292, height: 34, rx: 9, "stroke-width": 2 });
  const tLog = t({ x: 428, y: 59, "font-size": 9 }, "");
  gDat.append(filtro, tFiltro, boxLog, tLog, t({ x: 424, y: 30, "font-size": 11, "font-weight": 800, fill: "#17203b" }, E.log));
  // sessione e TTL
  const sx0 = 90, sx1 = 700, sy = 110;
  const xg = (g) => sx0 + ((g - sc.giorni.min) / (sc.giorni.max - sc.giorni.min)) * (sx1 - sx0);
  gDat.append(t({ x: 14, y: sy + 5, "font-size": 11, "font-weight": 800, fill: "#17203b" }, E.sessione));
  gDat.append(svgEl("rect", { x: sx0, y: sy - 4, width: sx1 - sx0, height: 8, rx: 4, fill: "#e5e7eb" }));
  const lineaTtl = svgEl("line", { x1: xg(sc.giorni.ttl), y1: sy - 14, x2: xg(sc.giorni.ttl), y2: sy + 14, stroke: "#d97706", "stroke-width": 2, "stroke-dasharray": "4 3" });
  const tTtl = t({ x: xg(sc.giorni.ttl), y: sy - 18, "text-anchor": "middle", "font-size": 9.5, "font-weight": 700, fill: "#d97706" }, `TTL ${num(sc.giorni.ttl)}`);
  const sessioneTondo = svgEl("circle", { cy: sy, r: 10, "stroke-width": 2 });
  const tSessione = t({ x: W / 2, y: sy + 32, "text-anchor": "middle", "font-size": 10, "font-weight": 700 }, "");
  gDat.append(lineaTtl, tTtl, sessioneTondo, tSessione);
  // uscita
  const uy = 170;
  gDat.append(svgEl("rect", { x: 10, y: uy, width: 300, height: 56, rx: 10, fill: "#fff7ed", stroke: "#fdba74" }));
  const tOstile = t({ x: 18, y: uy + 22, "font-size": 9, fill: "#9a3412" }, "");
  const tOstile2 = t({ x: 18, y: uy + 40, "font-size": 8, fill: "#9a3412" }, "");
  gDat.append(tOstile, tOstile2);
  gDat.append(svgEl("rect", { x: 330, y: uy + 8, width: 90, height: 40, rx: 10, fill: "#eef0ff", stroke: "#4f46e5" }));
  gDat.append(t({ x: 375, y: uy + 33, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: "#312e81" }, E.agente));
  const cancelloOut = svgEl("rect", { x: 440, y: uy + 4, width: 18, height: 48, rx: 5, "stroke-width": 2 });
  const frecciaOut = svgEl("line", { x1: 420, y1: uy + 28, x2: 600, y2: uy + 28, "stroke-width": 3 });
  const tUscita = t({ x: 330, y: uy + 70, "font-size": 9.5, "font-weight": 700 }, "");
  gDat.append(frecciaOut, cancelloOut, tUscita, t({ x: 610, y: uy + 32, "font-size": 10, "font-weight": 800, fill: "#17203b" }, E.uscita));
  // luogo di elaborazione
  const py = 270;
  gDat.append(svgEl("rect", { x: 10, y: py, width: 420, height: 150, rx: 14, fill: "#f0fdf4", stroke: "#16a34a", "stroke-width": 2, "stroke-dasharray": "6 4" }));
  gDat.append(t({ x: 22, y: py + 20, "font-size": 11, "font-weight": 800, fill: "#166534" }, E.perimetro));
  gDat.append(svgEl("rect", { x: 40, y: py + 55, width: 100, height: 44, rx: 10, fill: "#eef0ff", stroke: "#4f46e5" }));
  gDat.append(t({ x: 90, y: py + 82, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: "#312e81" }, E.agente));
  const boxLocale = svgEl("rect", { x: 270, y: py + 55, width: 130, height: 44, rx: 10, "stroke-width": 2 });
  const tLocale = t({ x: 335, y: py + 82, "text-anchor": "middle", "font-size": 10, "font-weight": 800 }, sc.elaborazioni[0].nome);
  const boxCloud = svgEl("rect", { x: 470, y: py + 30, width: 240, height: 94, rx: 14, "stroke-width": 2 });
  const tCloud = t({ x: 590, y: py + 62, "text-anchor": "middle", "font-size": 11, "font-weight": 800 }, E.fornitore);
  const tRegione = t({ x: 590, y: py + 84, "text-anchor": "middle", "font-size": 9.5 }, "");
  const frecciaElab = svgEl("line", { y1: py + 77, y2: py + 77, x1: 140, "stroke-width": 3.5 });
  gDat.append(boxLocale, tLocale, boxCloud, tCloud, tRegione, frecciaElab);
  scena.append(svg);

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra", "aria-live": "polite" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  function disegnaScena() {
    const v = valuta(sc, s);
    const vistaScena = s.vista === "dati" ? "dati" : "accessi";
    gAcc.setAttribute("display", vistaScena === "accessi" ? "inline" : "none");
    gDat.setAttribute("display", vistaScena === "dati" ? "inline" : "none");
    svg.setAttribute("aria-label", vistaScena === "dati" ? E.descrizione_dati : E.descrizione_accessi);
    // raggio verso Beta
    const ax = AG.x + AG.w - 20, ay = AG.y;
    if (s.richiesta === "giusta") raggioBeta.setAttribute("opacity", "0");
    else {
      raggioBeta.setAttribute("opacity", "1");
      const bersaglio = v.fuga ? `${CAV.xBeta + CAV.w / 2},${CAV.y + CAV.leadY + 40}` : `${CAV.xBeta + 34},${CAV.y + CAV.h}`;
      raggioBeta.setAttribute("points", `${ax},${ay} ${bersaglio}`);
      raggioBeta.setAttribute("stroke", v.fuga ? "#dc2626" : "#f59e0b");
      raggioBeta.setAttribute("stroke-dasharray", v.fuga ? "" : "6 4");
    }
    croce.setAttribute("opacity", v.rimbalzo ? "1" : "0");
    tNonAut.setAttribute("opacity", v.rimbalzo ? "1" : "0");
    pareteBeta.setAttribute("stroke", s.isolamento === "dati" ? "#16a34a" : "#cbd2e3");
    pareteBeta.setAttribute("stroke-dasharray", s.isolamento === "dati" ? "" : "8 6");
    tParete.textContent = `${E.parete}: ${s.isolamento === "dati" ? E.iso_dati : E.iso_interfaccia}`;
    tParete.setAttribute("fill", s.isolamento === "dati" ? "#166534" : "#92400e");
    beta.lead.forEach((_, k) => { LEAD[`beta|${k}`].setAttribute("stroke", v.fuga ? "#dc2626" : "#cbd2e3"); LEAD[`beta|${k}`].setAttribute("stroke-width", v.fuga ? "3" : "1.5"); });
    tRichiesta.textContent = sc.richieste[s.richiesta];
    boxIstr.setAttribute("stroke", v.chiave_esposta ? "#e11d48" : "#cbd2e3");
    boxCass.setAttribute("stroke", v.chiave_esposta ? "#cbd2e3" : "#16a34a");
    tChiaveIstr.setAttribute("opacity", v.chiave_esposta ? "1" : "0");
    tEspo.textContent = v.chiave_esposta ? sc.esposizioni_chiave.join(" · ") : "";
    tChiaveCass.setAttribute("opacity", v.chiave_esposta ? "0" : "1");
    tToken.setAttribute("opacity", v.chiave_esposta ? "0" : "1");
    gPermessi.replaceChildren();
    const larg = (W - 40) / v.permessi.length;
    v.permessi.forEach((p, i) => {
      const male = v.extra.includes(p);
      gPermessi.append(svgEl("rect", { x: 20 + i * larg + 3, y: 392, width: larg - 6, height: 26, rx: 13, fill: male ? "#fde8ec" : "#e8f8ee", stroke: male ? "#e11d48" : "#16a34a" }),
        t({ x: 20 + i * larg + larg / 2, y: 409, "text-anchor": "middle", "font-size": 9.5, "font-weight": 700, fill: male ? "#9f1239" : "#166534" }, p));
    });
    // dati personali
    filtro.setAttribute("fill", s.mascheramento ? "#e8f8ee" : "#f1f5f9");
    filtro.setAttribute("stroke", s.mascheramento ? "#16a34a" : "#94a3b8");
    tFiltro.textContent = s.mascheramento ? E.filtro : `${E.filtro} ${E.filtro_spento}`;
    tFiltro.setAttribute("fill", s.mascheramento ? "#166534" : "#64748b");
    tLog.textContent = v.log;
    tLog.setAttribute("fill", s.mascheramento ? "#166534" : "#9f1239");
    boxLog.setAttribute("fill", s.mascheramento ? "#f0fdf4" : "#fde8ec");
    boxLog.setAttribute("stroke", s.mascheramento ? "#16a34a" : "#e11d48");
    sessioneTondo.setAttribute("cx", xg(s.giorni));
    const coloreSess = { viva: "#2563eb", cancellata: "#94a3b8", eterna: "#e11d48" }[v.sessione];
    sessioneTondo.setAttribute("fill", v.sessione === "cancellata" ? "#fff" : coloreSess);
    sessioneTondo.setAttribute("stroke", coloreSess);
    lineaTtl.setAttribute("opacity", s.ttl ? "1" : ".25");
    tSessione.textContent = riempi(T[`sessione_${v.sessione}`], { giorni: num(s.giorni), ttl: num(sc.giorni.ttl) });
    tSessione.setAttribute("fill", coloreSess);
    const [o1, ...o2] = sc.email_ostile.split(": ");
    tOstile.textContent = s.email_ostile ? `${o1}:` : "";
    tOstile2.textContent = s.email_ostile ? o2.join(": ") : T.uscita_quiete;
    const coloreUscita = { quiete: "#cbd2e3", bloccata: "#16a34a", fuga: "#dc2626" }[v.uscita];
    frecciaOut.setAttribute("stroke", coloreUscita);
    frecciaOut.setAttribute("stroke-dasharray", v.uscita === "bloccata" ? "4 4" : "");
    cancelloOut.setAttribute("fill", s.controllo_output ? "#16a34a" : "#f1f5f9");
    cancelloOut.setAttribute("stroke", s.controllo_output ? "#166534" : "#94a3b8");
    tUscita.textContent = T[`uscita_${v.uscita}`];
    tUscita.setAttribute("fill", v.uscita === "fuga" ? "#9f1239" : "#475569");
    const locale = !v.elab.fuori;
    boxLocale.setAttribute("fill", locale ? "#dcfce7" : "#fff");
    boxLocale.setAttribute("stroke", locale ? "#16a34a" : "#cbd2e3");
    tLocale.setAttribute("fill", locale ? "#166534" : "#94a3b8");
    const coloreCloud = v.elab.id === "cloud_extra" ? "#dc2626" : v.elab.fuori ? "#d97706" : "#cbd2e3";
    boxCloud.setAttribute("fill", v.elab.fuori ? "#fff7ed" : "#fff");
    boxCloud.setAttribute("stroke", coloreCloud);
    tCloud.setAttribute("fill", v.elab.fuori ? "#9a3412" : "#94a3b8");
    tRegione.textContent = v.elab.fuori ? v.elab.nome : "";
    tRegione.setAttribute("fill", coloreCloud);
    frecciaElab.setAttribute("x2", locale ? "270" : "470");
    frecciaElab.setAttribute("stroke", locale ? "#16a34a" : coloreCloud);
  }

  function disegnaDestra() {
    if (s.vista === "decidi") {
      const figli = [el("h3", {}, E.vista_decidi)];
      if (s.verificato) {
        const v = verifica(sc, s);
        figli.push(el("div", { class: "verifica" }, el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
          ...v.righe.map((r) => el("div", { class: `riga ${r.esito}` }, r.testo))));
      }
      destra.replaceChildren(...figli);
      return;
    }
    const v = valuta(sc, s);
    const riga = (testo, classe) => el("div", { class: classe || "" }, testo);
    const figli = [el("h3", {}, E.titolo_destra)];
    if (s.vista === "accessi") {
      const esitoRic = v.fuga ? riga(riempi(T.esito_passa, { n: num(beta.lead.length) }), "male") : v.rimbalzo ? riga(T.esito_rimbalza)
        : riga(s.isolamento === "dati" ? T.esito_giusta_dati : T.esito_giusta, s.isolamento === "dati" ? "" : "neutro");
      figli.push(el("div", { class: "esiti" }, esitoRic,
        v.chiave_esposta ? riga(riempi(T.chiave_esposta, { dove: sc.esposizioni_chiave.join(", ") }), "male") : riga(T.chiave_sicura),
        riga(riempi(T.danno, { azioni: v.permessi.join(", ") }), v.extra.length ? "male" : "")));
      figli.push(el("h4", {}, E.risultati), el("ul", {}, ...v.risultati.map((x) => el("li", { style: alfa.lead.includes(x) ? "" : "color:#9f1239;font-weight:700" }, x))));
      figli.push(el("div", { class: "conta" }, v.deboli.accessi.length ? riempi(T.conta_problemi, { n: num(v.deboli.accessi.length) }) : T.nessun_problema));
    } else {
      figli.push(el("div", { class: "esiti" },
        riga(s.mascheramento ? T.log_ok : T.log_ko, s.mascheramento ? "" : "male"),
        riga(riempi(T[`sessione_${v.sessione}`], { giorni: num(s.giorni), ttl: num(sc.giorni.ttl) }), v.sessione === "eterna" ? "male" : ""),
        riga(T[`uscita_${v.uscita}`], v.uscita === "fuga" ? "male" : v.uscita === "quiete" ? "neutro" : ""),
        riga(v.elab.nota, v.elab.id === "cloud_extra" ? "male" : "neutro")));
      figli.push(el("h4", {}, E.titolo_domande), el("ul", {}, ...v.elab.domande.map((d) => el("li", {}, d))));
      figli.push(el("div", { class: "conta" }, v.deboli.dati.length ? riempi(T.conta_problemi, { n: num(v.deboli.dati.length) }) : T.nessun_problema));
    }
    destra.replaceChildren(...figli);
    if (!ridotto) destra.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 250 });
  }

  function aggiornaComandi() {
    const premi = (g, v) => g.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
    premi(segVista, s.vista); premi(segIso, s.isolamento); premi(segRic, s.richiesta); premi(segSeg, s.segreto); premi(segPerm, s.permessi); premi(segElab, s.elaborazione);
    chkMask.checked = s.mascheramento; chkTtl.checked = s.ttl; chkOstile.checked = s.email_ostile; chkOut.checked = s.controllo_output;
    inGiorni.value = s.giorni;
    valGiorni.textContent = num(s.giorni);
    zonaAccessi.classList.toggle("nascosto", s.vista !== "accessi");
    zonaDati.classList.toggle("nascosto", s.vista !== "dati");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaDestra(); }
  function cambia(diff) {
    Object.assign(s, diff);
    if (!("verificato" in diff)) s.verificato = false;
    ridisegna();
  }
  function scegli(id, valore) {
    const scelte = { ...s.scelte };
    if (valore) scelte[id] = valore; else delete scelte[id];
    cambia({ scelte });
  }

  function applica(nuovo) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(nuovo || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const n = { ...s, ...(nuovo || {}) };
    const controlla = (val, lista, nome) => { if (!lista.includes(val)) throw new Error(`stato_animazione: ${nome} sconosciuto «${val}»`); };
    controlla(n.vista, VISTE, "vista"); controlla(n.isolamento, ISOLAMENTI, "isolamento"); controlla(n.richiesta, RICHIESTE, "richiesta");
    controlla(n.segreto, SEGRETI, "segreto"); controlla(n.permessi, PERMESSI, "permessi"); controlla(n.elaborazione, sc.elaborazioni.map((x) => x.id), "elaborazione");
    if (!(n.giorni >= sc.giorni.min && n.giorni <= sc.giorni.max)) throw new Error(`stato_animazione: giorni fuori scala «${n.giorni}»`);
    for (const [id, v] of Object.entries(n.scelte || {})) {
      const x = sc.situazioni.find((q) => q.id === id);
      if (!x || !x.opzioni.includes(v)) throw new Error(`stato_animazione: scelta non valida «${id}: ${v}»`);
    }
    Object.assign(s, n, { scelte: { ...(n.scelte || {}) } });
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo */ },
    _prova: { stato: s, valuta: () => valuta(sc, s), verifica: () => verifica(sc, s) },
  };
}
