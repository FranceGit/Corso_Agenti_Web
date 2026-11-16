// Lezione interattiva "Kill switch e fail-closed: la plancia di controllo" (P8.3).
// 4 agenti CRM lavorano card per 3 clienti (una card in corso + due in attesa per cella). Interruttori a 4 livelli:
// tutto il sistema, cliente, agente (schema del benchmark [R15]) e strumento (circuit breaker, [WP5 p.22]); stati
// esecuzione / pausa / arresto; momento del controllo (solo all'avvio / prima di ogni azione con effetti); servizio degli
// interruttori irraggiungibile con fail-closed o fail-open; incidente injection con contenere / smistare / risolvere;
// registro delle decisioni con scheda e "perche'?"; gioco "Decidi tu". Tutti i testi arrivano dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "plancia_controllo";
const VISTE = ["plancia", "incidente", "decidi"];
const CONTROLLI = ["avvio", "ogni_azione"];
const GUASTI = ["fail_closed", "fail_open"];
const G = { w: 720, h: 430, x0: 150, colW: 188, y0: 78, rigaH: 68, cartaW: 50, cartaH: 40, cartaPasso: 58, cartaDx: 14, testaY: 56, strumY: 372 };

const STILE = `
.lz-plancia_controllo .cliccabile { cursor: pointer; }
.lz-plancia_controllo .cliccabile:focus-visible rect { stroke: #4f46e5; stroke-width: 3; }
.lz-plancia_controllo .carta rect { transition: fill .35s ease; }
.lz-plancia_controllo .griglia-sel { display: grid; grid-template-columns: 1fr auto; gap: 4px 8px; align-items: center; font-size: .8rem; }
.lz-plancia_controllo .griglia-sel select { font-size: .78rem; }
.lz-plancia_controllo .nota { font-size: .78rem; color: var(--tenue); margin: 4px 0 0; }
.lz-plancia_controllo .contatori { display: grid; gap: 4px; font-size: .82rem; margin-bottom: 10px; }
.lz-plancia_controllo .contatori .male { color: #9f1239; font-weight: 700; }
.lz-plancia_controllo .registro { display: grid; gap: 4px; margin: 6px 0; }
.lz-plancia_controllo .registro button { text-align: left; font-size: .76rem; padding: 5px 8px; border-radius: 8px; border: 1px solid #dfe4f0; background: #fff; cursor: pointer; }
.lz-plancia_controllo .registro button[aria-pressed="true"] { border-color: #4f46e5; background: var(--primario-chiaro); }
.lz-plancia_controllo .registro button.incidente { border-color: #e11d48; }
.lz-plancia_controllo .scheda { display: grid; gap: 5px; font-size: .78rem; padding: 8px 10px; border-radius: 10px; background: #f7f8fe; }
.lz-plancia_controllo .scheda .et { font-size: .68rem; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; color: var(--tenue-2, #7a849e); }
.lz-plancia_controllo .perche { padding: 7px 10px; border-radius: 10px; background: var(--avviso-chiaro); color: #92400e; font-size: .8rem; }
.lz-plancia_controllo .legenda { display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: .72rem; margin-top: 10px; }
.lz-plancia_controllo .legenda span::before { content: ""; display: inline-block; width: 9px; height: 9px; border-radius: 3px; margin-right: 4px; background: var(--c); vertical-align: middle; }
.lz-plancia_controllo .fasi { font-size: .8rem; padding: 7px 10px; border-radius: 10px; background: var(--primario-chiaro); color: #3730a3; margin-top: 8px; }
.lz-plancia_controllo .situazione { display: grid; gap: 3px; margin: 8px 0; font-size: .8rem; }
.lz-plancia_controllo .verifica { display: grid; gap: 6px; margin-top: 10px; }
.lz-plancia_controllo .verifica .riga { font-size: .8rem; padding: 7px 10px; border-radius: 10px; }
.lz-plancia_controllo .verifica .riga.giusto { background: var(--ok-chiaro); color: #166534; }
.lz-plancia_controllo .verifica .riga.quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-plancia_controllo .verifica .riga.sbagliato, .lz-plancia_controllo .verifica .riga.vuoto { background: var(--male-chiaro); color: #9f1239; }
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

// ------------------------------------------------------------------ logica (pura)

/** Il livello piu' restrittivo tra quelli dati (esecuzione < pausa < arresto). */
export function piuRestrittivo(sc, ...livelli) {
  return livelli.reduce((a, b) => (sc.livelli_ordine.indexOf(b) > sc.livelli_ordine.indexOf(a) ? b : a), sc.livelli_ordine[0]);
}

/** Esito di ogni card (agente x cliente x posizione 0 = in corso, 1.. = in attesa) e conteggi. */
export function calcola(sc, s) {
  const strum = Object.fromEntries(sc.strumenti.map((t) => [t.id, t]));
  const gruppo = Object.fromEntries(sc.esiti.map((e) => [e.id, e.gruppo]));
  const inc = sc.incidente;
  const celle = {};
  for (const a of sc.agenti) {
    celle[a.id] = {};
    const t = strum[a.strumento];
    for (const c of sc.clienti) {
      const L = piuRestrittivo(sc, s.globale, s.clienti[c.id], s.agenti[a.id]);
      const carte = [];
      for (let pos = 0; pos < sc.carte_per_cella; pos++) {
        let esito;
        if (!s.strumenti[t.id]) esito = "spenta"; // il circuit breaker agisce sullo strumento: vale sempre
        else if (s.servizio_giu) {
          if (s.guasto === "fail_closed") esito = t.effetti ? "bloccata" : "eseguita";
          else esito = L === "esecuzione" ? "eseguita" : "senza_controllo";
        } else if (s.controllo === "avvio") {
          // all'avvio era tutto in esecuzione: cio' che e' cambiato dopo non viene visto
          esito = L === "esecuzione" || !t.effetti ? "eseguita" : "violazione";
        } else if (L === "esecuzione") esito = "eseguita";
        else if (L === "pausa") esito = pos === 0 ? "finita" : "in_pausa";
        else esito = "non_eseguita";
        const parte = ["eseguita", "finita", "violazione", "senza_controllo"].includes(esito);
        if (parte && s.incidente && c.id === inc.cliente && t.id === inc.strumento && !s.correzione) esito = s.coda_umana ? "coda_umana" : "pericolo";
        carte.push(esito);
      }
      celle[a.id][c.id] = carte;
    }
  }
  const tutte = Object.values(celle).flatMap((r) => Object.values(r).flat());
  const conta = (g) => tutte.filter((e) => gruppo[e] === g).length;
  const qualificaEseguite = Object.values(celle[sc.agenti[0].id]).flat().filter((e) => gruppo[e] === "lavoro").length;
  const fasi = {
    contenere: s.incidente && (!s.strumenti[inc.strumento] || s.correzione),
    smistare: s.incidente && s.coda_umana,
    risolvere: s.incidente && s.correzione,
  };
  return { celle, tot: tutte.length, lavoro: conta("lavoro"), fermo: conta("fermo"), problema: conta("problema"), coda: conta("coda"), qualificaEseguite, fasi };
}

/** Riscontro del gioco "Decidi tu". */
export function verifica(sc, s) {
  const T = sc.testi;
  const righe = sc.situazioni.map((x, i) => {
    const scelta = s.scelte[x.id] || "";
    let esito;
    if (!scelta) esito = "vuoto";
    else if (scelta === x.migliore) esito = "giusto";
    else if (x.quasi.includes(scelta)) esito = "quasi";
    else esito = "sbagliato";
    return { id: x.id, esito, testo: riempi(T[`ver_${esito}`], { n: i + 1, migliore: sc.opzioni_gioco[x.migliore], spiega: x.spiega }) };
  });
  const giuste = righe.filter((r) => r.esito === "giusto").length;
  return { righe, giuste, totali: righe.length, sintesi: giuste === righe.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righe.length }) };
}

/** Righe del registro visibili (quella dell'incidente compare solo con l'allarme acceso). */
export function righeRegistro(sc, s) {
  return sc.registro.filter((r) => !r.incidente || s.incidente);
}

/** Posizione di ogni card nella scena. */
export function posizioni(sc) {
  const pos = {};
  sc.agenti.forEach((a, i) => sc.clienti.forEach((c, j) => {
    for (let k = 0; k < sc.carte_per_cella; k++) pos[`${a.id}|${c.id}|${k}`] = { x: G.x0 + j * G.colW + G.cartaDx + k * G.cartaPasso, y: G.y0 + i * G.rigaH + (G.rigaH - G.cartaH) / 2 - 6 };
  }));
  return pos;
}
export const DIMENSIONI = { w: G.w, h: G.h, cartaW: G.cartaW, cartaH: G.cartaH };

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const lingua = contesto && contesto.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));
  const stato = Object.fromEntries(sc.stati.map((x) => [x.id, x]));
  const esito = Object.fromEntries(sc.esiti.map((x) => [x.id, x]));
  const nomeCliente = Object.fromEntries(sc.clienti.map((c) => [c.id, c.nome]));
  const nomeAgente = Object.fromEntries(sc.agenti.map((a) => [a.id, a.nome]));
  const num = (x) => x.toLocaleString(lingua);
  const LIV = sc.livelli_ordine;

  const s = {
    vista: "plancia", globale: "esecuzione",
    clienti: Object.fromEntries(sc.clienti.map((c) => [c.id, "esecuzione"])),
    agenti: Object.fromEntries(sc.agenti.map((a) => [a.id, "esecuzione"])),
    strumenti: Object.fromEntries(sc.strumenti.map((t) => [t.id, true])),
    controllo: "ogni_azione", servizio_giu: false, guasto: "fail_closed",
    incidente: false, coda_umana: false, correzione: false,
    riga_aperta: sc.registro[0].id, perche: false, scelte: {}, verificato: false,
  };

  // ------------------------------------------------ comandi
  const seg = (valori, etichette, chiave, aria) => el("div", { class: "segmentato", role: "group", "aria-label": aria },
    ...valori.map((v, i) => el("button", { "data-v": v, onclick: () => cambia({ [chiave]: v }) }, etichette[i])));
  const segVista = seg(VISTE, [E.vista_plancia, E.vista_incidente, E.vista_decidi], "vista", E.vista);
  const segGlobale = seg(LIV, LIV.map((l) => stato[l].nome), "globale", E.globale);
  const selCli = {}, selAg = {};
  const selStato = (onch, etichetta) => el("select", { "aria-label": etichetta, onchange: onch }, ...LIV.map((l) => el("option", { value: l }, stato[l].nome)));
  const grigliaCli = el("div", { class: "griglia-sel" });
  for (const c of sc.clienti) { selCli[c.id] = selStato((e) => cambia({ clienti: { ...s.clienti, [c.id]: e.target.value } }), c.nome); grigliaCli.append(el("span", {}, c.nome), selCli[c.id]); }
  const grigliaAg = el("div", { class: "griglia-sel" });
  for (const a of sc.agenti) { selAg[a.id] = selStato((e) => cambia({ agenti: { ...s.agenti, [a.id]: e.target.value } }), a.nome); grigliaAg.append(el("span", {}, a.nome), selAg[a.id]); }
  const chkStr = {};
  const zonaStr = el("div", {});
  for (const t of sc.strumenti) {
    chkStr[t.id] = el("input", { type: "checkbox", onchange: (e) => cambia({ strumenti: { ...s.strumenti, [t.id]: e.target.checked } }) });
    zonaStr.append(el("label", { class: "interruttore" }, el("span", {}, t.nome), chkStr[t.id]));
  }
  const segControllo = seg(CONTROLLI, [E.controllo_avvio, E.controllo_ogni], "controllo", E.controllo);
  const chkServizio = el("input", { type: "checkbox", onchange: (e) => cambia({ servizio_giu: e.target.checked }) });
  const segGuasto = seg(GUASTI, [E.fail_closed, E.fail_open], "guasto", E.guasto);
  const notaStato = el("p", { class: "nota" });
  const chkInc = el("input", { type: "checkbox", onchange: (e) => cambia({ incidente: e.target.checked }) });
  const chkCoda = el("input", { type: "checkbox", onchange: (e) => cambia({ coda_umana: e.target.checked }) });
  const chkCorr = el("input", { type: "checkbox", onchange: (e) => cambia({ correzione: e.target.checked }) });
  const zonaIncidente = el("div", {},
    el("label", { class: "interruttore" }, el("span", {}, E.incidente), chkInc),
    el("p", { class: "nota" }, E.contenere_suggerimento),
    el("label", { class: "interruttore" }, el("span", {}, E.coda_umana), chkCoda),
    el("label", { class: "interruttore" }, el("span", {}, E.correzione), chkCorr));
  const zonaPlancia = el("div", {},
    el("h4", {}, E.globale), segGlobale,
    el("h4", {}, E.clienti), grigliaCli,
    el("h4", {}, E.agenti), grigliaAg,
    el("h4", {}, E.controllo), segControllo,
    el("label", { class: "interruttore" }, el("span", {}, E.servizio_giu), chkServizio),
    el("h4", {}, E.guasto), segGuasto);
  const zonaStrumenti = el("div", {}, el("h4", {}, E.strumenti), zonaStr, notaStato);
  const tendine = {};
  const zonaDecidi = el("div", {});
  sc.situazioni.forEach((x, i) => {
    const sel = el("select", { "aria-label": riempi(T.situazione, { n: i + 1 }), onchange: (e) => scegli(x.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...x.opzioni.map((o) => el("option", { value: o }, sc.opzioni_gioco[o])));
    tendine[x.id] = sel;
    zonaDecidi.append(el("label", { class: "situazione" }, el("b", {}, riempi(T.situazione, { n: i + 1 })), el("span", {}, x.testo), sel));
  });
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => { s.verificato = true; disegnaDestra(); } }, E.controlla));
  const comandi = el("aside", { class: "pannello" }, el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaIncidente, zonaPlancia, zonaStrumenti, zonaDecidi);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${G.w} ${G.h}`, role: "img", "aria-label": E.descrizione_scena });
  const banner = svgEl("g");
  const bannerFondo = svgEl("rect", { x: 10, y: 6, width: G.w - 20, height: 24, rx: 8, fill: "#fde8ec", stroke: "#e11d48" });
  const bannerTesto = testoSvg({ x: G.w / 2, y: 23, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#9f1239" }, "");
  banner.append(bannerFondo, bannerTesto);
  const legendaSvg = testoSvg({ x: G.w / 2, y: 22, "text-anchor": "middle", "font-size": 10.5, fill: "#5b6684" }, E.legenda);
  svg.append(legendaSvg, banner);
  const testeCli = {}, testeAg = {}, CARTE = {};
  const cicla = (attuale) => LIV[(LIV.indexOf(attuale) + 1) % LIV.length];
  sc.clienti.forEach((c, j) => {
    const x = G.x0 + j * G.colW;
    const g = svgEl("g", { class: "cliccabile", tabindex: "0", role: "button" });
    const r = svgEl("rect", { x: x + 4, y: G.testaY - 22, width: G.colW - 8, height: 30, rx: 9, fill: "#fff", stroke: "#cbd2e3", "stroke-width": 1.5 });
    const t1 = testoSvg({ x: x + G.colW / 2, y: G.testaY - 9, "text-anchor": "middle", "font-size": 11.5, "font-weight": 800, fill: "#17203b" }, c.nome);
    const t2 = testoSvg({ x: x + G.colW / 2, y: G.testaY + 3, "text-anchor": "middle", "font-size": 9.5, "font-weight": 700 }, "");
    g.append(r, t1, t2);
    const azione = () => cambia({ clienti: { ...s.clienti, [c.id]: cicla(s.clienti[c.id]) } });
    g.addEventListener("click", azione);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); azione(); } });
    svg.append(g);
    testeCli[c.id] = { g, r, t2 };
  });
  const pos = posizioni(sc);
  sc.agenti.forEach((a, i) => {
    const y = G.y0 + i * G.rigaH;
    svg.append(svgEl("rect", { x: 6, y: y + 2, width: G.w - 12, height: G.rigaH - 4, rx: 10, fill: i % 2 ? "#f6f8fd" : "#fff", stroke: "#e6eaf3" }));
    const g = svgEl("g", { class: "cliccabile", tabindex: "0", role: "button" });
    const r = svgEl("rect", { x: 10, y: y + 10, width: 132, height: G.rigaH - 20, rx: 9, fill: "#fff", stroke: "#cbd2e3", "stroke-width": 1.5 });
    const t1 = testoSvg({ x: 18, y: y + 30, "font-size": 11, "font-weight": 800, fill: "#17203b" }, a.nome);
    const t2 = testoSvg({ x: 18, y: y + 45, "font-size": 9.5, "font-weight": 700 }, "");
    g.append(r, t1, t2);
    const azione = () => cambia({ agenti: { ...s.agenti, [a.id]: cicla(s.agenti[a.id]) } });
    g.addEventListener("click", azione);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); azione(); } });
    svg.append(g);
    testeAg[a.id] = { g, t2 };
    sc.clienti.forEach((c) => {
      for (let k = 0; k < sc.carte_per_cella; k++) {
        const p = pos[`${a.id}|${c.id}|${k}`];
        const gc = svgEl("g", { class: "carta", transform: `translate(${p.x},${p.y})` });
        const rc = svgEl("rect", { width: G.cartaW, height: G.cartaH, rx: 7, fill: "#e5e7eb", stroke: k === 0 ? "#17203b" : "none", "stroke-width": k === 0 ? 1.6 : 0 });
        const tc = testoSvg({ x: G.cartaW / 2, y: 26, "text-anchor": "middle", "font-size": 15, "font-weight": 900, fill: "#fff" }, "");
        const tt = svgEl("title");
        gc.append(rc, tc, tt);
        svg.append(gc);
        CARTE[`${a.id}|${c.id}|${k}`] = { rc, tc, tt };
      }
    });
  });
  const strumG = {};
  const passoStr = (G.w - 20) / sc.strumenti.length;
  sc.strumenti.forEach((t, i) => {
    const x = 10 + i * passoStr;
    const r = svgEl("rect", { x: x + 4, y: G.strumY, width: passoStr - 8, height: 26, rx: 13, fill: "#dcfce7", stroke: "#16a34a" });
    const tx = testoSvg({ x: x + passoStr / 2, y: G.strumY + 17, "text-anchor": "middle", "font-size": 10.5, "font-weight": 700, fill: "#17203b" }, "");
    svg.append(r, tx);
    strumG[t.id] = { r, tx };
  });
  const servizioTesto = testoSvg({ x: G.w / 2, y: G.strumY + 48, "text-anchor": "middle", "font-size": 10.5, "font-weight": 700 }, "");
  svg.append(servizioTesto);
  scena.append(svg);

  // ------------------------------------------------ destra
  const contatori = el("div", { class: "contatori", "aria-live": "polite" });
  const fasi = el("div", { class: "fasi" });
  const registro = el("div", { class: "registro" });
  const scheda = el("div", { class: "scheda", "aria-live": "polite" });
  const zonaVerifica = el("div", { class: "verifica", "aria-live": "polite" });
  const legenda = el("div", { class: "legenda" }, ...sc.esiti.map((x) => el("span", { style: `--c:${x.colore}` }, x.nome)));
  const destra = el("aside", { class: "pannello destra" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  function disegnaScena() {
    const c = calcola(sc, s);
    const inc = s.incidente && s.vista !== "decidi";
    banner.setAttribute("display", inc ? "inline" : "none");
    legendaSvg.setAttribute("display", inc ? "none" : "inline");
    bannerTesto.textContent = riempi(T.banner_incidente, { cliente: nomeCliente[sc.incidente.cliente] });
    for (const cl of sc.clienti) {
      const st = stato[s.clienti[cl.id]];
      testeCli[cl.id].t2.textContent = st.breve;
      testeCli[cl.id].t2.setAttribute("fill", st.colore);
      testeCli[cl.id].r.setAttribute("stroke", st.colore);
      testeCli[cl.id].g.setAttribute("aria-label", riempi(E.cambia_stato, { nome: cl.nome, stato: st.nome }));
    }
    for (const a of sc.agenti) {
      const st = stato[s.agenti[a.id]];
      testeAg[a.id].t2.textContent = `${st.breve} · ${sc.strumenti.find((t) => t.id === a.strumento).nome}`;
      testeAg[a.id].t2.setAttribute("fill", st.colore);
      testeAg[a.id].g.setAttribute("aria-label", riempi(E.cambia_stato, { nome: a.nome, stato: st.nome }));
      for (const cl of sc.clienti) c.celle[a.id][cl.id].forEach((e, k) => {
        const C = CARTE[`${a.id}|${cl.id}|${k}`];
        C.rc.setAttribute("fill", esito[e].colore);
        C.tc.textContent = esito[e].sigla;
        C.tt.textContent = esito[e].nome;
      });
    }
    for (const t of sc.strumenti) {
      const on = s.strumenti[t.id];
      strumG[t.id].r.setAttribute("fill", on ? "#dcfce7" : "#f1f5f9");
      strumG[t.id].r.setAttribute("stroke", on ? "#16a34a" : "#94a3b8");
      strumG[t.id].tx.textContent = `${t.nome}: ${on ? E.acceso : E.spento}`;
    }
    servizioTesto.textContent = `${E.servizio} ${s.servizio_giu ? E.servizio_ko : E.servizio_ok}`;
    servizioTesto.setAttribute("fill", s.servizio_giu ? "#be123c" : "#166534");
  }

  function disegnaDestra() {
    if (s.vista === "decidi") {
      destra.replaceChildren(el("h3", {}, E.vista_decidi), zonaVerifica);
      if (!s.verificato) { zonaVerifica.replaceChildren(); return; }
      const v = verifica(sc, s);
      zonaVerifica.replaceChildren(el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
        ...v.righe.map((r) => el("div", { class: `riga ${r.esito}` }, r.testo)));
      return;
    }
    const c = calcola(sc, s);
    contatori.replaceChildren(
      el("div", {}, riempi(T.conta_lavoro, { n: num(c.lavoro), tot: num(c.tot) })),
      el("div", {}, riempi(T.conta_fermo, { n: num(c.fermo) })),
      el("div", { class: c.problema ? "male" : "" }, riempi(T.conta_problema, { n: num(c.problema) })),
      c.coda ? el("div", {}, riempi(T.conta_coda, { n: num(c.coda) })) : null);
    notaStato.textContent = s.servizio_giu ? (s.guasto === "fail_closed" ? T.nota_closed : T.nota_open) : (s.controllo === "avvio" ? T.nota_avvio : T.nota_ogni);
    const righe = righeRegistro(sc, s);
    if (!righe.some((r) => r.id === s.riga_aperta)) s.riga_aperta = righe[0].id;
    registro.replaceChildren(...righe.map((r) => el("button", {
      class: r.incidente ? "incidente" : "", "aria-pressed": String(r.id === s.riga_aperta),
      "aria-label": riempi(T.apri_riga, { azione: r.azione }),
      onclick: () => cambia({ riga_aperta: r.id, perche: false }, true),
    }, riempi(T.riga_registro, { agente: nomeAgente[r.agente], cliente: nomeCliente[r.cliente], azione: r.azione }))));
    const r = righe.find((x) => x.id === s.riga_aperta);
    const campo = (et, val) => el("div", {}, el("div", { class: "et" }, et), el("div", {}, val));
    scheda.replaceChildren(
      campo(E.campo_input, r.input), campo(E.campo_strumenti, r.strumenti), campo(E.campo_output, r.output),
      campo(E.campo_ragionamento, r.ragionamento), campo(E.campo_tipo, r.tipo === "lettura" ? E.tipo_lettura : E.tipo_effetti),
      campo(E.campo_identita, sc.identita_agenti[r.agente]), campo(E.campo_versione, sc.versione),
      el("button", { class: "btn", onclick: () => cambia({ perche: !s.perche }, true) }, E.perche),
      s.perche ? el("div", { class: "perche" }, r.perche) : null,
      el("p", { class: "nota" }, T.nota_registro));
    if (!ridotto) scheda.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
    const figli = [el("h3", {}, E.titolo_destra), contatori];
    if (s.incidente) {
      const f = (b) => (b ? T.fase_fatta : T.fase_da_fare);
      fasi.replaceChildren(el("div", {}, riempi(T.fasi_incidente, { contenere: f(c.fasi.contenere), smistare: f(c.fasi.smistare), risolvere: f(c.fasi.risolvere) })),
        el("div", {}, riempi(T.incidente_continua, { n: num(c.qualificaEseguite) })));
      figli.push(fasi);
    }
    figli.push(registro, scheda, el("h4", {}, E.titolo_legenda), legenda);
    destra.replaceChildren(...figli);
  }

  function aggiornaComandi() {
    const premi = (g, v) => g.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
    premi(segVista, s.vista); premi(segGlobale, s.globale); premi(segControllo, s.controllo); premi(segGuasto, s.guasto);
    for (const c of sc.clienti) selCli[c.id].value = s.clienti[c.id];
    for (const a of sc.agenti) selAg[a.id].value = s.agenti[a.id];
    for (const t of sc.strumenti) chkStr[t.id].checked = s.strumenti[t.id];
    chkServizio.checked = s.servizio_giu; chkInc.checked = s.incidente; chkCoda.checked = s.coda_umana; chkCorr.checked = s.correzione;
    zonaPlancia.classList.toggle("nascosto", s.vista !== "plancia");
    zonaIncidente.classList.toggle("nascosto", s.vista !== "incidente");
    zonaStrumenti.classList.toggle("nascosto", s.vista === "decidi");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaDestra(); }
  function cambia(diff, soloDestra) {
    Object.assign(s, diff);
    if (!soloDestra && !("verificato" in diff)) s.verificato = false;
    ridisegna();
  }
  function scegli(id, valore) {
    const scelte = { ...s.scelte };
    if (valore) scelte[id] = valore; else delete scelte[id];
    cambia({ scelte });
  }

  function applica(nuovoStato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(nuovoStato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const n = { ...s, ...(nuovoStato || {}) };
    if (!VISTE.includes(n.vista)) throw new Error(`stato_animazione: vista sconosciuta «${n.vista}»`);
    if (!LIV.includes(n.globale)) throw new Error(`stato_animazione: livello sconosciuto «${n.globale}»`);
    for (const [gruppo, elenco] of [["clienti", sc.clienti], ["agenti", sc.agenti]]) {
      const ids = elenco.map((x) => x.id);
      if (Object.keys(n[gruppo]).sort().join() !== [...ids].sort().join()) throw new Error(`stato_animazione: ${gruppo} incompleti`);
      for (const v of Object.values(n[gruppo])) if (!LIV.includes(v)) throw new Error(`stato_animazione: livello sconosciuto «${v}»`);
    }
    if (Object.keys(n.strumenti).sort().join() !== sc.strumenti.map((t) => t.id).sort().join()) throw new Error("stato_animazione: strumenti incompleti");
    if (!CONTROLLI.includes(n.controllo)) throw new Error(`stato_animazione: controllo sconosciuto «${n.controllo}»`);
    if (!GUASTI.includes(n.guasto)) throw new Error(`stato_animazione: guasto sconosciuto «${n.guasto}»`);
    if (!sc.registro.some((r) => r.id === n.riga_aperta)) throw new Error(`stato_animazione: riga sconosciuta «${n.riga_aperta}»`);
    for (const [id, v] of Object.entries(n.scelte || {})) {
      const x = sc.situazioni.find((q) => q.id === id);
      if (!x || !x.opzioni.includes(v)) throw new Error(`stato_animazione: scelta non valida «${id}: ${v}»`);
    }
    Object.assign(s, n, { clienti: { ...n.clienti }, agenti: { ...n.agenti }, strumenti: { ...n.strumenti }, scelte: { ...(n.scelte || {}) } });
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo */ },
    _prova: { stato: s, calcola: () => calcola(sc, s), verifica: () => verifica(sc, s) },
  };
}
