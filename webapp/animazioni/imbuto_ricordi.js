// Lezione interattiva "L'imbuto dei ricordi" (P5.3): la memoria a lungo termine di un agente CRM.
// Vista "sessione": le frasi di due chiamate con la stessa cliente scorrono nell'imbuto (estrazione per argomenti
// scelti dallo studente); escono card-ricordo con data e fonte (CRM = alta fiducia, dedotto = meno affidabile).
// Nella seconda chiamata una preferenza cambia: con il consolidamento la vecchia card diventa "superata" (UPDATE),
// senza consolidamento restano due card in conflitto e l'agente sceglie il canale sbagliato. Saluto della seconda
// chiamata con e senza memoria; trigger di estrazione (costo contro freschezza).
// Vista "recupero": per il rinnovo del contratto 3 manopole (rilevanza, recency, importanza) scelgono i 3 ricordi
// che entrano nel contesto. Vista "cassetti": gioco memoria dichiarativa / procedurale con riscontro.
// Tutti i testi arrivano dallo scenario della lezione; tutto deterministico.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "imbuto_ricordi";
const W = 720, H = 412;
const BOLLA = { x: 12, w: 268, h: 42, y0: 66, passo: 52 };
const CARTA = { x: 452, w: 256, h: 42, y0: 66, passo: 50 };
const RIGA = { x: 16, w: 450, h: 38, y0: 70, passo: 46 };
const VISTE = ["sessione", "recupero", "cassetti"];
const CASSETTI = ["dichiarativa", "procedurale"];

const STILE = `
.lz-imbuto_ricordi .bolla, .lz-imbuto_ricordi .carta { transition: opacity .45s ease, transform .5s cubic-bezier(.2,.8,.2,1); }
.lz-imbuto_ricordi .battuta { display: grid; gap: 6px; font-size: .86rem; }
.lz-imbuto_ricordi .battuta blockquote { margin: 0; padding: 8px 10px; border-left: 4px solid #c7d2fe; background: #f7f8fe; border-radius: 0 10px 10px 0; }
.lz-imbuto_ricordi .battuta blockquote.male { border-left-color: #e11d48; background: #fdecef; }
.lz-imbuto_ricordi .battuta blockquote.ok { border-left-color: #16a34a; background: #e8f8ee; }
.lz-imbuto_ricordi .etichetta-piccola { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--tenue-2, #7a849e); margin-top: 6px; }
.lz-imbuto_ricordi .nota { font-size: .78rem; color: var(--tenue); margin: 4px 0 0; }
.lz-imbuto_ricordi .barra { height: 9px; border-radius: 9px; background: #eef1f8; overflow: hidden; margin-top: 3px; }
.lz-imbuto_ricordi .barra span { display: block; height: 100%; border-radius: 9px; transition: width .5s ease; }
.lz-imbuto_ricordi .contatore { font-size: .82rem; margin-top: 8px; }
.lz-imbuto_ricordi .contatore .riga { display: flex; justify-content: space-between; gap: 8px; }
.lz-imbuto_ricordi .ciclo { display: flex; flex-wrap: wrap; gap: 4px; margin: 10px 0 0; }
.lz-imbuto_ricordi .ciclo span { font-size: .72rem; font-weight: 700; padding: .2em .55em; border-radius: 999px; background: #eef1f8; color: var(--tenue); }
.lz-imbuto_ricordi .ciclo span.acceso { background: #7c3aed; color: #fff; }
.lz-imbuto_ricordi .scelta-gioco { display: grid; gap: 3px; margin: 8px 0; font-size: .8rem; }
.lz-imbuto_ricordi .verifica { display: grid; gap: 6px; margin-top: 10px; }
.lz-imbuto_ricordi .verifica .riga { font-size: .8rem; padding: 7px 10px; border-radius: 10px; }
.lz-imbuto_ricordi .verifica .riga.giusto { background: var(--ok-chiaro); color: #166534; }
.lz-imbuto_ricordi .verifica .riga.sbagliato, .lz-imbuto_ricordi .verifica .riga.vuoto { background: var(--male-chiaro); color: #9f1239; }
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

/** Estrazione: solo le frasi che toccano un argomento scelto diventano ricordi (non e' un riassunto di tutto). */
export function estrai(frasi, argomenti, data) {
  return frasi.filter((f) => f.ricordo && argomenti.includes(f.argomento)).map((f) => ({
    id: f.id, testo: f.ricordo, argomento: f.argomento, fonte: f.fonte, data, canale: f.canale || null,
    somiglianza: f.somiglianza || 0, sostituisce: f.sostituisce || null, stato: "attiva", superata_il: null, operazione: "CREATE",
  }));
}

/** L'archivio dei ricordi dopo la chiamata 1 (e, se scelta, la 2): dati caricati dal CRM + ricordi estratti, consolidati o no. */
export function archivio(sc, s) {
  const carte = sc.crm.map((c) => ({ ...c, data: sc.date.crm, stato: "attiva", superata_il: null, operazione: "CRM", canale: null, somiglianza: 0, sostituisce: null }));
  carte.push(...estrai(sc.frasi1, s.argomenti, sc.date.s1));
  if (s.sessione === 2) {
    for (const nuova of estrai(sc.frasi2, s.argomenti, sc.date.s2)) {
      const vecchia = nuova.sostituisce && carte.find((c) => c.id === nuova.sostituisce);
      if (vecchia && s.consolidamento) {
        vecchia.stato = "superata";
        vecchia.superata_il = sc.date.s2;
        nuova.operazione = "UPDATE";
      }
      carte.push(nuova);
    }
  }
  return carte;
}

/** Il saluto all'inizio della chiamata 2: usa i ricordi della chiamata 1 solo se l'agente ha la memoria. */
export function saluto(sc, s) {
  if (!s.memoria) return { testo: sc.testi.saluto_senza, ricordi: 0 };
  const prima = archivio(sc, { ...s, sessione: 1 }).filter((c) => c.operazione !== "CRM");
  const parti = sc.argomenti.map((a) => a.id).filter((a) => prima.some((c) => c.argomento === a) && sc.saluto_parti[a]).map((a) => sc.saluto_parti[a]);
  return { testo: [sc.testi.saluto_con, ...parti].join(" "), ricordi: prima.length };
}

/** Dopo la chiamata 2: quale canale usa l'agente per il seguito? Conta i ricordi "contatto" ancora attivi. */
export function prossimaAzione(sc, s) {
  const T = sc.testi;
  if (!s.memoria) return { testo: T.azione_senza, esito: "neutro", conflitto: false };
  const attive = archivio(sc, { ...s, sessione: 2 }).filter((c) => c.argomento === "contatto" && c.stato === "attiva" && c.canale);
  if (!attive.length) return { testo: T.azione_chiede, esito: "neutro", conflitto: false };
  // il recupero prende il ricordo piu' simile alla richiesta: senza consolidamento vince la card vecchia
  const scelta = attive.reduce((a, b) => (b.somiglianza > a.somiglianza ? b : a));
  const giusta = scelta.canale === sc.canale_giusto;
  const conflitto = attive.length > 1;
  const canale = sc.canali[scelta.canale];
  const testo = riempi(conflitto ? T.azione_conflitto : (giusta ? T.azione_giusta : T.azione_sbagliata), { canale, n: attive.length });
  return { testo, esito: giusta ? "ok" : "male", conflitto, canale: scelta.canale };
}

/** Quando estrarre i ricordi: piu' spesso = piu' freschi ma piu' chiamate al modello (valori illustrativi). */
export function costi(sc, trigger) {
  const t = sc.trigger.find((x) => x.id === trigger);
  if (!t) throw new Error(`trigger sconosciuto «${trigger}»`);
  const max = Math.max(...sc.trigger.map((x) => x.chiamate));
  const maxR = Math.max(...sc.trigger.map((x) => x.ritardo));
  return { ...t, quota_costo: t.chiamate / max, quota_freschezza: 1 - (t.ritardo - 1) / maxR };
}

/** Recupero per il rinnovo: punteggio = somma pesata di rilevanza, recency e importanza; entrano i primi N. */
export function recupera(sc, s) {
  const m = s.manopole;
  const R = sc.recupero;
  const righe = R.ricordi.map((r) => {
    const recency = Math.max(0, 1 - r.eta_giorni / R.orizzonte_giorni);
    const punteggio = m.rilevanza * r.rilevanza + m.recency * recency + m.importanza * r.importanza;
    return { ...r, recency, punteggio: Math.round(punteggio * 100) / 100 };
  });
  const attivo = m.rilevanza + m.recency + m.importanza > 0;
  const ordinati = attivo ? [...righe].sort((a, b) => b.punteggio - a.punteggio || a.id.localeCompare(b.id)) : [];
  const scelti = ordinati.slice(0, R.quanti).map((r) => r.id);
  const vecchi = righe.filter((r) => scelti.includes(r.id) && r.vecchio).length;
  const risposta = attivo ? [sc.testi.rinnovo_inizio, ...ordinati.slice(0, R.quanti).map((r) => r.uso)].join(" ") : sc.testi.rinnovo_vuoto;
  return { righe, scelti, vecchi, risposta, attivo };
}

/** Riscontro del gioco dei cassetti (dichiarativa = sapere cosa, procedurale = sapere come). */
export function verificaCassetti(sc, s) {
  const T = sc.testi;
  const righe = sc.cassetti.map((c) => {
    const scelta = s.scelte[c.id] || "";
    const esito = !scelta ? "vuoto" : scelta === c.giusto ? "giusto" : "sbagliato";
    return { id: c.id, esito, testo: riempi(T[`cas_${esito}`], { ricordo: c.breve, cassetto: sc.nomi_cassetti[c.giusto], spiega: c.spiega }) };
  });
  const giuste = righe.filter((r) => r.esito === "giusto").length;
  return { righe, giuste, totali: righe.length, sintesi: giuste === righe.length ? T.cas_tutto : riempi(T.cas_punteggio, { giuste, totali: righe.length }) };
}

/** Posizioni nella scena: bolle (frasi) a sinistra, card nell'archivio a destra, righe del recupero, cassetti. */
export function posizioni(sc, s) {
  const pos = { bolle: {}, carte: {}, righe: {}, voci: {} };
  const frasi = s.sessione === 2 ? sc.frasi2 : sc.frasi1;
  frasi.forEach((f, i) => { pos.bolle[f.id] = { x: BOLLA.x, y: BOLLA.y0 + i * BOLLA.passo, w: BOLLA.w, h: BOLLA.h }; });
  archivio(sc, s).forEach((c, i) => { pos.carte[c.id] = { x: CARTA.x, y: CARTA.y0 + i * CARTA.passo, w: CARTA.w, h: CARTA.h }; });
  sc.recupero.ricordi.forEach((r, i) => { pos.righe[r.id] = { x: RIGA.x, y: RIGA.y0 + i * RIGA.passo, w: RIGA.w, h: RIGA.h }; });
  const conta = { "": 0, dichiarativa: 0, procedurale: 0 };
  for (const c of sc.cassetti) {
    const dove = s.scelte[c.id] || "";
    const k = conta[dove]++;
    if (dove === "") pos.voci[c.id] = { x: 14 + (k % 3) * 232, y: 62 + Math.floor(k / 3) * 46, w: 224, h: 38 };
    else pos.voci[c.id] = { x: (dove === "dichiarativa" ? 20 : 372) + 8, y: 194 + k * 34, w: 312, h: 30 };
  }
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
  const idArg = sc.argomenti.map((a) => a.id);
  const nomeArg = (id) => sc.argomenti.find((a) => a.id === id).nome;
  const coloreArg = (id) => sc.argomenti.find((a) => a.id === id).colore;

  const s = {
    vista: "sessione", sessione: 1, argomenti: idArg.slice(0, 3), memoria: true, consolidamento: true,
    trigger: sc.trigger[0].id, manopole: { rilevanza: 1, recency: 0, importanza: 0 }, scelte: {}, verificato: false,
  };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...VISTE.map((v) => el("button", { "data-v": v, onclick: () => cambia({ vista: v }) }, E[`vista_${v}`])));
  const segSessione = el("div", { class: "segmentato", role: "group", "aria-label": E.sessione },
    el("button", { "data-v": "1", onclick: () => cambia({ sessione: 1 }) }, E.sessione_1),
    el("button", { "data-v": "2", onclick: () => cambia({ sessione: 2 }) }, E.sessione_2));
  const inArg = {};
  const zonaArg = el("div", {});
  for (const a of sc.argomenti) {
    inArg[a.id] = el("input", { type: "checkbox", "aria-label": a.nome, onchange: (e) => cambia({ argomenti: e.target.checked ? [...s.argomenti, a.id] : s.argomenti.filter((x) => x !== a.id) }) });
    zonaArg.append(el("label", { class: "interruttore" }, el("span", {}, a.nome), inArg[a.id]));
  }
  const segTrigger = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.trigger },
    ...sc.trigger.map((t) => el("button", { "data-v": t.id, onclick: () => cambia({ trigger: t.id }) }, t.nome)));
  const inMemoria = el("input", { type: "checkbox", "aria-label": E.memoria, onchange: (e) => cambia({ memoria: e.target.checked }) });
  const inConsol = el("input", { type: "checkbox", "aria-label": E.consolidamento, onchange: (e) => cambia({ consolidamento: e.target.checked }) });
  const nodoConsol = el("label", { class: "interruttore" }, el("span", {}, E.consolidamento), inConsol);
  const zonaSessione = el("div", {}, el("h4", {}, E.sessione), segSessione, el("h4", {}, E.argomenti), zonaArg,
    el("label", { class: "interruttore" }, el("span", {}, E.memoria), inMemoria), nodoConsol, el("h4", {}, E.trigger), segTrigger);
  const manopole = {};
  const zonaRecupero = el("div", {}, el("p", { class: "nota" }, T.nota_recupero));
  for (const k of ["rilevanza", "recency", "importanza"]) {
    const valore = el("b", {});
    const inp = el("input", { type: "range", min: 0, max: 2, step: 1, "aria-label": E[`man_${k}`] });
    inp.addEventListener("input", () => cambia({ manopole: { ...s.manopole, [k]: Number(inp.value) } }));
    manopole[k] = { inp, valore };
    zonaRecupero.append(el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, E[`man_${k}`]), valore), inp));
  }
  const tendine = {};
  const zonaCassetti = el("div", {}, el("p", { class: "nota" }, T.nota_cassetti));
  for (const c of sc.cassetti) {
    tendine[c.id] = el("select", { class: "scelta", "aria-label": riempi(T.scegli_per, { ricordo: c.breve }), onchange: (e) => scegli(c.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...CASSETTI.map((k) => el("option", { value: k }, sc.nomi_cassetti[k])));
    zonaCassetti.append(el("label", { class: "scelta-gioco" }, el("span", {}, c.breve), tendine[c.id]));
  }
  zonaCassetti.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => { s.verificato = true; disegnaDestra(); } }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaSessione, zonaRecupero, zonaCassetti);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs><filter id="ir-ombra" x="-10%" y="-20%" width="120%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#17203b" flood-opacity=".13"/></filter><marker id="ir-freccia" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="#7c3aed"/></marker></defs>`;
  const titolo = testoSvg({ x: W / 2, y: 26, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, "");
  const sotto = testoSvg({ x: W / 2, y: 44, "text-anchor": "middle", "font-size": 10.5, fill: "#5b6684" }, "");
  const gScena = svgEl("g");
  svg.append(titolo, sotto, gScena);
  scena.append(svg);

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  const corpo = el("div", { class: "battuta", "aria-live": "polite" });
  destra.append(el("h3", {}, E.titolo_destra), corpo);

  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno
  function bollaSvg(f, p, usata) {
    const g = svgEl("g", { class: "bolla", transform: `translate(${p.x},${p.y})`, opacity: usata ? 1 : 0.45 });
    const cliente = f.chi === "cliente";
    g.append(svgEl("rect", { width: p.w, height: p.h, rx: 12, fill: cliente ? "#fff" : "#eef0ff", stroke: usata ? coloreArg(f.argomento) : "#cbd2e3", "stroke-width": usata ? 2.5 : 1.2, filter: "url(#ir-ombra)" }));
    g.append(testoSvg({ x: 10, y: 15, "font-size": 9, "font-weight": 800, fill: "#5b6684" }, cliente ? sc.cliente : E.agente));
    g.append(testoSvg({ x: 10, y: 31, "font-size": 10.2, fill: "#17203b" }, accorcia(f.testo, 50)));
    if (usata) g.append(svgEl("line", { x1: p.w, y1: p.h / 2, x2: 318, y2: 220, stroke: coloreArg(f.argomento), "stroke-opacity": ".45", "stroke-width": 1.4, "stroke-dasharray": "4 3" }));
    return g;
  }
  function cartaSvg(c, p) {
    const g = svgEl("g", { class: "carta", transform: `translate(${p.x},${p.y})`, opacity: c.stato === "superata" ? 0.55 : 1 });
    const colore = c.operazione === "CRM" ? "#0f766e" : coloreArg(c.argomento);
    g.append(svgEl("rect", { width: p.w, height: p.h, rx: 9, fill: "#fff", stroke: colore, "stroke-width": 1.6, filter: "url(#ir-ombra)" }));
    g.append(svgEl("rect", { width: 5, height: p.h, rx: 2.5, fill: colore }));
    const t = testoSvg({ x: 12, y: 17, "font-size": 10.5, "font-weight": 800, fill: "#17203b", "text-decoration": c.stato === "superata" ? "line-through" : "none" }, accorcia(c.testo, 38));
    g.append(t);
    const badge = c.fonte === "crm" ? E.fonte_crm : E.fonte_dedotto;
    const dett = c.stato === "superata" ? riempi(T.superata_il, { data: c.superata_il }) : `${c.data} · ${badge}`;
    g.append(testoSvg({ x: 12, y: 33, "font-size": 9, fill: c.fonte === "crm" ? "#0f766e" : "#7a849e", "font-weight": 700 }, accorcia(dett, 46)));
    if (c.operazione === "UPDATE" || c.operazione === "CREATE") g.append(testoSvg({ x: p.w - 8, y: 33, "text-anchor": "end", "font-size": 8.5, "font-weight": 900, fill: c.operazione === "UPDATE" ? "#7c3aed" : "#94a3b8" }, c.operazione));
    return g;
  }

  function disegnaSessione() {
    const pos = posizioni(sc, s);
    const frasi = s.sessione === 2 ? sc.frasi2 : sc.frasi1;
    titolo.textContent = s.sessione === 2 ? E.titolo_s2 : E.titolo_s1;
    sotto.textContent = E.legenda_sessione;
    const g = svgEl("g");
    // imbuto
    g.append(svgEl("path", { d: "M300,120 L420,120 L378,250 L378,300 L342,300 L342,250 Z", fill: "#f5f3ff", stroke: "#7c3aed", "stroke-width": 1.6 }));
    g.append(testoSvg({ x: 360, y: 145, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: "#6d28d9" }, E.imbuto));
    g.append(testoSvg({ x: 360, y: 160, "text-anchor": "middle", "font-size": 9, fill: "#6d28d9" }, E.imbuto_sotto));
    g.append(svgEl("path", { d: "M378,280 C410,280 420,200 446,190", fill: "none", stroke: "#7c3aed", "stroke-width": 1.6, "marker-end": "url(#ir-freccia)" }));
    g.append(testoSvg({ x: CARTA.x + CARTA.w / 2, y: 58, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: "#5b6684" }, E.archivio));
    for (const f of frasi) g.append(bollaSvg(f, pos.bolle[f.id], f.ricordo && s.argomenti.includes(f.argomento)));
    const carte = archivio(sc, s);
    for (const c of carte) g.append(cartaSvg(c, pos.carte[c.id]));
    if (carte.filter((c) => c.operazione !== "CRM").length === 0) g.append(testoSvg({ x: CARTA.x + CARTA.w / 2, y: CARTA.y0 + CARTA.passo * carte.length + 24, "text-anchor": "middle", "font-size": 10, fill: "#9f1239", "font-weight": 700 }, E.nessun_ricordo));
    gScena.replaceChildren(g);
  }

  function disegnaRecupero() {
    const pos = posizioni(sc, s);
    const r = recupera(sc, s);
    titolo.textContent = E.titolo_recupero;
    sotto.textContent = E.legenda_recupero;
    const g = svgEl("g");
    g.append(svgEl("rect", { x: 500, y: 70, width: 204, height: 300, rx: 14, fill: "#f5f3ff", stroke: "#7c3aed", "stroke-dasharray": "5 4" }));
    g.append(testoSvg({ x: 602, y: 92, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#6d28d9" }, E.contesto));
    const max = 5;
    for (const x of r.righe) {
      const p = pos.righe[x.id];
      const scelto = r.scelti.includes(x.id);
      const gr = svgEl("g", { transform: `translate(${p.x},${p.y})` });
      gr.append(svgEl("rect", { width: p.w, height: p.h, rx: 9, fill: scelto ? "#faf5ff" : "#fff", stroke: scelto ? "#7c3aed" : "#d5dbea", "stroke-width": scelto ? 2.4 : 1.2 }));
      gr.append(testoSvg({ x: 10, y: 15, "font-size": 10.2, "font-weight": 800, fill: x.vecchio && scelto ? "#be123c" : "#17203b" }, accorcia(x.testo, 54)));
      gr.append(testoSvg({ x: 10, y: 30, "font-size": 8.8, fill: "#7a849e" }, riempi(T.riga_recupero, { eta: x.eta_testo, fonte: x.fonte === "crm" ? E.fonte_crm : E.fonte_dedotto })));
      const lung = Math.max(0, Math.min(1, x.punteggio / max)) * 90;
      gr.append(svgEl("rect", { x: p.w - 100, y: 24, width: 90, height: 6, rx: 3, fill: "#eef1f8" }));
      gr.append(svgEl("rect", { x: p.w - 100, y: 24, width: lung, height: 6, rx: 3, fill: "#7c3aed" }));
      gr.append(testoSvg({ x: p.w - 10, y: 16, "text-anchor": "end", "font-size": 9.5, "font-weight": 800, fill: "#6d28d9" }, x.punteggio.toLocaleString(contesto.lingua)));
      g.append(gr);
      if (scelto) {
        const k = r.scelti.indexOf(x.id);
        g.append(svgEl("line", { x1: p.x + p.w, y1: p.y + p.h / 2, x2: 506, y2: 130 + k * 70, stroke: "#7c3aed", "stroke-width": 1.4, "marker-end": "url(#ir-freccia)" }));
        const box = svgEl("g", { transform: `translate(510,${110 + k * 70})` });
        box.append(svgEl("rect", { width: 184, height: 50, rx: 9, fill: "#fff", stroke: x.vecchio ? "#e11d48" : "#7c3aed", "stroke-width": 1.5 }));
        box.append(testoSvg({ x: 8, y: 20, "font-size": 9.5, "font-weight": 800, fill: x.vecchio ? "#be123c" : "#17203b" }, accorcia(x.testo, 34)));
        box.append(testoSvg({ x: 8, y: 37, "font-size": 8.8, fill: "#7a849e" }, x.eta_testo));
        g.append(box);
      }
    }
    if (!r.attivo) g.append(testoSvg({ x: 602, y: 220, "text-anchor": "middle", "font-size": 10, fill: "#9f1239", "font-weight": 700 }, E.contesto_vuoto));
    gScena.replaceChildren(g);
  }

  function disegnaCassetti() {
    const pos = posizioni(sc, s);
    titolo.textContent = E.titolo_cassetti;
    sotto.textContent = E.legenda_cassetti;
    const g = svgEl("g");
    CASSETTI.forEach((k, i) => {
      const x = i === 0 ? 20 : 372;
      g.append(svgEl("rect", { x, y: 160, width: 328, height: 236, rx: 16, fill: i === 0 ? "#eff6ff" : "#fefce8", stroke: i === 0 ? "#2563eb" : "#ca8a04", "stroke-width": 1.6 }));
      g.append(testoSvg({ x: x + 164, y: 182, "text-anchor": "middle", "font-size": 11.5, "font-weight": 800, fill: i === 0 ? "#1d4ed8" : "#a16207" }, sc.nomi_cassetti[k]));
    });
    for (const c of sc.cassetti) {
      const p = pos.voci[c.id];
      const gv = svgEl("g", { class: "carta", transform: `translate(${p.x},${p.y})` });
      gv.append(svgEl("rect", { width: p.w, height: p.h, rx: 9, fill: "#fff", stroke: "#cbd2e3", "stroke-width": 1.3, filter: "url(#ir-ombra)" }));
      gv.append(testoSvg({ x: 10, y: p.h / 2 + 4, "font-size": 10, "font-weight": 700, fill: "#17203b" }, accorcia(c.breve, p.w > 260 ? 52 : 36)));
      g.append(gv);
    }
    gScena.replaceChildren(g);
  }

  function barra(quota, colore) {
    return el("div", { class: "barra" }, el("span", { style: `width:${Math.round(quota * 100)}%;background:${colore}` }));
  }

  function disegnaDestra() {
    const figli = [];
    if (s.vista === "sessione") {
      const carte = archivio(sc, s);
      const nuove = carte.filter((c) => c.operazione !== "CRM");
      figli.push(el("div", { class: "etichetta-piccola" }, E.ricordi_estratti), el("div", {}, riempi(T.conta_ricordi, { n: nuove.filter((c) => c.stato === "attiva").length, crm: carte.length - nuove.length })));
      if (s.sessione === 1) {
        figli.push(el("div", { class: "etichetta-piccola" }, E.provenienza), el("p", { class: "nota" }, T.nota_provenienza));
      } else {
        const sal = saluto(sc, s);
        figli.push(el("div", { class: "etichetta-piccola" }, E.saluto), el("blockquote", { class: s.memoria ? "ok" : "" }, sal.testo));
        const az = prossimaAzione(sc, s);
        figli.push(el("div", { class: "etichetta-piccola" }, E.dopo), el("blockquote", { class: az.esito === "male" ? "male" : az.esito === "ok" ? "ok" : "" }, az.testo));
      }
      const c = costi(sc, s.trigger);
      figli.push(el("div", { class: "contatore" }, el("div", { class: "riga" }, el("span", {}, E.costo), el("b", {}, riempi(T.chiamate, { n: c.chiamate }))), barra(c.quota_costo, "#e11d48")),
        el("div", { class: "contatore" }, el("div", { class: "riga" }, el("span", {}, E.freschezza), el("b", {}, riempi(T.ritardo, { n: c.ritardo }))), barra(c.quota_freschezza, "#16a34a")),
        el("p", { class: "nota" }, T.nota_costi));
      const fase = s.sessione === 2 && s.consolidamento ? 1 : 0;
      figli.push(el("div", { class: "ciclo", "aria-label": E.ciclo }, ...sc.ciclo.map((n, i) => el("span", { class: i === fase || i === 2 ? "acceso" : "" }, n))));
    } else if (s.vista === "recupero") {
      const r = recupera(sc, s);
      figli.push(el("div", { class: "etichetta-piccola" }, E.risposta_rinnovo), el("blockquote", { class: r.vecchi ? "male" : r.attivo ? "ok" : "" }, r.risposta));
      if (r.vecchi) figli.push(el("div", { class: "esito-scheda male" }, el("div", {}, T.avviso_vecchio)));
      figli.push(el("p", { class: "nota" }, T.nota_formula));
    } else {
      figli.push(el("p", { class: "nota" }, T.nota_destra_cassetti));
      if (s.verificato) {
        const v = verificaCassetti(sc, s);
        figli.push(el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
          el("div", { class: "verifica" }, ...v.righe.map((x) => el("div", { class: `riga ${x.esito}` }, x.testo))));
      }
    }
    corpo.replaceChildren(...figli);
    if (!ridotto) corpo.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 260 });
  }

  function aggiornaComandi() {
    segVista.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.vista)));
    segSessione.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(Number(b.dataset.v) === s.sessione)));
    segTrigger.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.trigger)));
    for (const a of idArg) inArg[a].checked = s.argomenti.includes(a);
    inMemoria.checked = s.memoria;
    inConsol.checked = s.consolidamento;
    nodoConsol.classList.toggle("nascosto", s.sessione !== 2);
    for (const [k, m] of Object.entries(manopole)) { m.inp.value = s.manopole[k]; m.valore.textContent = E[`peso_${s.manopole[k]}`]; }
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
    zonaSessione.classList.toggle("nascosto", s.vista !== "sessione");
    zonaRecupero.classList.toggle("nascosto", s.vista !== "recupero");
    zonaCassetti.classList.toggle("nascosto", s.vista !== "cassetti");
  }

  function ridisegna() {
    aggiornaComandi();
    if (s.vista === "sessione") disegnaSessione();
    else if (s.vista === "recupero") disegnaRecupero();
    else disegnaCassetti();
    disegnaDestra();
  }
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

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    if (!VISTE.includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (![1, 2].includes(nuovo.sessione)) throw new Error(`stato_animazione: sessione sconosciuta «${nuovo.sessione}»`);
    for (const a of nuovo.argomenti) if (!idArg.includes(a)) throw new Error(`stato_animazione: argomento sconosciuto «${a}»`);
    if (!sc.trigger.some((t) => t.id === nuovo.trigger)) throw new Error(`stato_animazione: trigger sconosciuto «${nuovo.trigger}»`);
    for (const k of ["rilevanza", "recency", "importanza"]) if (![0, 1, 2].includes(nuovo.manopole[k])) throw new Error(`stato_animazione: manopola «${k}» fuori scala`);
    for (const [id, d] of Object.entries(nuovo.scelte)) {
      if (!sc.cassetti.some((c) => c.id === id)) throw new Error(`stato_animazione: «${id}» non e' un ricordo del gioco`);
      if (!CASSETTI.includes(d)) throw new Error(`stato_animazione: cassetto sconosciuto «${d}»`);
    }
    Object.assign(s, nuovo, { argomenti: [...nuovo.argomenti], manopole: { ...nuovo.manopole }, scelte: { ...nuovo.scelte } });
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo */ },
    _prova: { stato: s, archivio: () => archivio(sc, s), recupera: () => recupera(sc, s), prossimaAzione: () => prossimaAzione(sc, s) },
  };
}
