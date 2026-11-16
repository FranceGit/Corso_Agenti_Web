// Lezione interattiva "Il set di valutazione e i test di regressione" (P7.3): lo studente compone il set di prova
// dell'agente che scrive ai lead scegliendo casi tipici, limite e avversari (indicatore di copertura), applica la
// modifica "email piu' brevi" (solo istruzioni) e rilancia: le regressioni compaiono solo se il set contiene i casi
// limite. Un errore di produzione (pollice giu') diventa un caso permanente e il set sale di versione. Gioco finale
// "quando si rilancia il set?". Testi e casi tutti dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "griglia_test";
const VB = { w: 720, h: 400 };
const CELLA = { y0: 88, passo: 54, h: 46, gap: 10 };

const STILE = `
.lz-griglia_test .cella { cursor: pointer; }
.lz-griglia_test .cella rect.fondo { transition: fill .35s ease, stroke .35s ease; }
.lz-griglia_test .cella:focus-visible rect.fondo { stroke: #4f46e5; stroke-width: 3.5; }
.lz-griglia_test .cella.pulsa rect.fondo { animation: lz-gt-pulsa 1.2s ease-in-out 2; }
@keyframes lz-gt-pulsa { 50% { stroke-width: 4; } }
.lz-griglia_test .nota { font-size: .78rem; color: var(--tenue); margin: 4px 0 0; }
.lz-griglia_test .riquadro { padding: 7px 10px; border-radius: 10px; font-size: .82rem; margin-bottom: 6px; }
.lz-griglia_test .riquadro.ok { background: var(--ok-chiaro); color: #166534; }
.lz-griglia_test .riquadro.male { background: var(--male-chiaro); color: #9f1239; }
.lz-griglia_test .riquadro.avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-griglia_test .riquadro.neutro { background: var(--primario-chiaro); color: #3730a3; }
.lz-griglia_test .etichetta-piccola { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--tenue-2, #7a849e); }
.lz-griglia_test .caso { display: grid; gap: 4px; font-size: .83rem; margin-bottom: 8px; }
.lz-griglia_test .copertura { display: grid; gap: 4px; margin: 6px 0; font-size: .8rem; }
.lz-griglia_test .copertura .riga { display: flex; justify-content: space-between; }
.lz-griglia_test .pulsanti { display: grid; gap: 6px; margin-top: 8px; }
.lz-griglia_test .pulsanti .btn { justify-content: center; width: 100%; }
.lz-griglia_test .scelta-gioco { display: grid; gap: 3px; margin: 6px 0; font-size: .82rem; }
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

/** Tutti i casi della riserva, piu' il caso nato in produzione se il pollice giu' e' stato trasformato. */
export function casiDisponibili(sc, s) {
  return s.produzione ? [...sc.casi, sc.caso_produzione] : [...sc.casi];
}

/** Id dei casi nel set: quelli scelti, piu' il caso di produzione (permanente). */
export function casiNelSet(sc, s) {
  const ids = casiDisponibili(sc, s).map((c) => c.id).filter((id) => s.set.includes(id));
  if (s.produzione) ids.push(sc.caso_produzione.id);
  return ids;
}

export function versione(sc, s) {
  return sc.versione_iniziale + (s.produzione ? 1 : 0);
}

/** Copertura delle tre famiglie: quanti casi di ciascuna nel set, e quali mancano. */
export function copertura(sc, s) {
  const nel = new Set(casiNelSet(sc, s));
  const per = Object.fromEntries(sc.famiglie.map((f) => [f.id, casiDisponibili(sc, s).filter((c) => c.famiglia === f.id && nel.has(c.id)).length]));
  const mancano = sc.famiglie.filter((f) => per[f.id] === 0).map((f) => f.id);
  return { per, mancano, completa: mancano.length === 0 };
}

/** Esito di un caso: "fuori" dal set, "dubbio" se le istruzioni sono cambiate e non si e' rilanciato, "ok" o "rosso". */
export function esitoCaso(sc, s, caso) {
  if (!casiNelSet(sc, s).includes(caso.id)) return "fuori";
  const fallisce = caso.fallisce || (s.modifica && caso.regredisce);
  if (!s.rilanciato) {
    if (s.modifica || caso.fallisce) return "dubbio";
    return "ok";
  }
  return fallisce ? "rosso" : "ok";
}

/** Risultato del rilancio: verdi, rossi, regressioni (casi che funzionavano e ora no) e se il set e' "cieco". */
export function rilancio(sc, s) {
  const nel = casiDisponibili(sc, s).filter((c) => casiNelSet(sc, s).includes(c.id));
  const esiti = nel.map((c) => ({ id: c.id, esito: esitoCaso(sc, s, c) }));
  const rossi = esiti.filter((e) => e.esito === "rosso").length;
  const regressioni = nel.filter((c) => s.rilanciato && s.modifica && c.regredisce).length;
  const cieco = s.rilanciato && s.modifica && regressioni === 0 && sc.casi.some((c) => c.regredisce);
  return { tot: nel.length, verdi: esiti.filter((e) => e.esito === "ok").length, rossi, regressioni, cieco };
}

/** Riscontro del gioco "quando si rilancia il set?". */
export function verifica(sc, s) {
  const T = sc.testi;
  const nome = (id) => sc.azioni.find((a) => a.id === id).nome;
  const righe = sc.situazioni.map((x) => {
    const scelta = s.scelte[x.id] || "";
    const esito = !scelta ? "vuoto" : scelta === x.migliore ? "giusto" : "sbagliato";
    return { id: x.id, esito, testo: riempi(T[`ver_${esito}`], { situazione: x.testo, migliore: nome(x.migliore), spiega: x.spiega }) };
  });
  const giuste = righe.filter((r) => r.esito === "giusto").length;
  return { righe, giuste, totali: righe.length, sintesi: giuste === righe.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righe.length }) };
}

/** Posizione di ogni casella nella griglia (colonne per famiglia). */
export function posizioni(sc, s) {
  const pos = {};
  for (const f of sc.famiglie) {
    const casi = casiDisponibili(sc, s).filter((c) => c.famiglia === f.id);
    const w = (f.larghezza - (f.colonne - 1) * CELLA.gap) / f.colonne;
    const righe = Math.ceil(casi.length / f.colonne);
    casi.forEach((c, i) => {
      const col = Math.floor(i / righe), riga = i % righe;
      pos[c.id] = { x: f.x + col * (w + CELLA.gap), y: CELLA.y0 + riga * CELLA.passo, w, h: CELLA.h };
    });
  }
  return pos;
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const lingua = contesto && contesto.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));
  const fam = (id) => sc.famiglie.find((f) => f.id === id);
  const tutti = () => [...sc.casi, sc.caso_produzione];
  const caso = (id) => tutti().find((c) => c.id === id);
  const completo = sc.casi.map((c) => c.id);

  const s = { vista: "griglia", set: [...sc.set_povero], modifica: false, rilanciato: false, produzione: false, caso_aperto: sc.casi[0].id, scelte: {}, verificato: false };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    el("button", { "data-v": "griglia", onclick: () => cambia({ vista: "griglia" }) }, E.vista_griglia),
    el("button", { "data-v": "decidi", onclick: () => cambia({ vista: "decidi" }) }, E.vista_decidi));
  const segPreset = el("div", { class: "segmentato", role: "group", "aria-label": E.preset },
    el("button", { "data-v": "povero", onclick: () => cambia({ set: [...sc.set_povero], rilanciato: false }) }, E.set_povero),
    el("button", { "data-v": "completo", onclick: () => cambia({ set: [...completo], rilanciato: false }) }, E.set_completo));
  const cMod = el("input", { type: "checkbox", onchange: (e) => cambia({ modifica: e.target.checked, rilanciato: false }) });
  const zonaGriglia = el("div", {}, el("h4", {}, E.preset), segPreset,
    el("label", { class: "interruttore" }, el("span", {}, E.modifica), cMod),
    el("div", { class: "pulsanti" },
      el("button", { class: "btn btn-primario", onclick: () => cambia({ rilanciato: true }) }, E.rilancia),
      el("button", { class: "btn btn-fantasma", onclick: () => cambia({ produzione: true, rilanciato: false, caso_aperto: sc.caso_produzione.id }) }, E.pollice),
      el("button", { class: "btn btn-fantasma", onclick: () => { s.verificato = true; disegnaDestra(); } }, E.controlla_set)));
  const tendine = {};
  const zonaDecidi = el("div", {});
  for (const x of sc.situazioni) {
    const sel = el("select", { "aria-label": riempi(T.scegli_per, { situazione: x.testo }), onchange: (e) => scegli(x.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.azioni.map((a) => el("option", { value: a.id }, a.nome)));
    tendine[x.id] = sel;
    zonaDecidi.append(el("label", { class: "scelta-gioco" }, el("span", {}, x.testo), sel));
  }
  zonaDecidi.append(el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => { s.verificato = true; disegnaDestra(); } }, E.controlla));
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaGriglia, zonaDecidi);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${VB.w} ${VB.h}`, role: "img", "aria-label": E.descrizione_scena });
  const titolo = testoSvg({ x: VB.w / 2, y: 24, "text-anchor": "middle", "font-size": 12.5, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".05em" }, "");
  const legenda = testoSvg({ x: VB.w / 2, y: 42, "text-anchor": "middle", "font-size": 10, fill: "#5b6684" }, E.legenda);
  const sintesi = testoSvg({ x: VB.w / 2, y: 390, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "#17203b" }, "");
  const gTeste = svgEl("g"), gCelle = svgEl("g"), gDecidi = svgEl("g");
  svg.append(titolo, legenda, gTeste, gCelle, sintesi, gDecidi);
  const TESTE = {};
  for (const f of sc.famiglie) {
    gTeste.append(svgEl("rect", { x: f.x, y: 56, width: f.larghezza, height: 22, rx: 8, fill: f.colore, "fill-opacity": ".14" }));
    const t = testoSvg({ x: f.x + f.larghezza / 2, y: 71, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: f.colore }, "");
    gTeste.append(t);
    TESTE[f.id] = t;
  }
  const CE = {};
  for (const c of tutti()) {
    const g = svgEl("g", { class: "cella", tabindex: "0", role: "button", "aria-label": riempi(T.apri_caso, { nome: c.nome }) });
    const fondo = svgEl("rect", { class: "fondo", rx: 9, "stroke-width": 1.6 });
    const banda = svgEl("rect", { width: 5, rx: 2.5, fill: fam(c.famiglia).colore });
    const nome = testoSvg({ "font-size": 10.5, "font-weight": 700, fill: "#17203b" }, "");
    const simbolo = testoSvg({ "font-size": 15, "font-weight": 900, "text-anchor": "middle" }, "");
    g.append(fondo, banda, nome, simbolo);
    const apri = () => cambia({ caso_aperto: c.id }, true);
    g.addEventListener("click", apri);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(); } });
    gCelle.append(g);
    CE[c.id] = { g, fondo, banda, nome, simbolo };
  }
  gDecidi.append(testoSvg({ x: VB.w / 2, y: 24, "text-anchor": "middle", "font-size": 12.5, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".05em" }, E.titolo_decidi));
  const RIG_DEC = sc.situazioni.map((x, i) => {
    const y = 60 + i * 80;
    const r = svgEl("rect", { x: 30, y, width: 660, height: 64, rx: 12, fill: "#fff", stroke: "#cbd2e3", "stroke-width": 1.6 });
    const t = testoSvg({ x: 50, y: y + 28, "font-size": 12, "font-weight": 700, fill: "#17203b" }, accorcia(x.testo, 92));
    const sc2 = testoSvg({ x: 50, y: y + 50, "font-size": 11, fill: "#4f46e5", "font-weight": 700 }, "");
    gDecidi.append(r, t, sc2);
    return { r, scelta: sc2 };
  });
  scena.append(svg);

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  const corpo = el("div", { "aria-live": "polite" });
  destra.append(el("h3", {}, E.titolo_caso), corpo);
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno
  const colori = { ok: ["#ecfdf5", "#16a34a"], rosso: ["#fff1f2", "#e11d48"], dubbio: ["#fffbeb", "#d97706"], fuori: ["#f8fafc", "#cbd2e3"] };
  const simboli = { ok: E.simbolo_ok, rosso: E.simbolo_ko, dubbio: E.simbolo_dubbio, fuori: "" };

  function disegnaScena() {
    const griglia = s.vista === "griglia";
    for (const g of [gTeste, gCelle, legenda, sintesi, titolo]) g.setAttribute("display", griglia ? "inline" : "none");
    gDecidi.setAttribute("display", griglia ? "none" : "inline");
    titolo.textContent = riempi(T.titolo_griglia, { v: versione(sc, s) });
    const cop = copertura(sc, s);
    for (const f of sc.famiglie) TESTE[f.id].textContent = `${f.nome.toLocaleUpperCase(lingua)} · ${cop.per[f.id]}`;
    const pos = posizioni(sc, s);
    for (const c of tutti()) {
      const C = CE[c.id];
      const p = pos[c.id];
      if (!p) { C.g.setAttribute("display", "none"); continue; }
      C.g.removeAttribute("display");
      const es = esitoCaso(sc, s, c);
      C.fondo.setAttribute("x", p.x); C.fondo.setAttribute("y", p.y); C.fondo.setAttribute("width", p.w); C.fondo.setAttribute("height", p.h);
      C.fondo.setAttribute("fill", colori[es][0]);
      C.fondo.setAttribute("stroke", c.id === s.caso_aperto ? "#4f46e5" : colori[es][1]);
      C.fondo.setAttribute("stroke-width", c.id === s.caso_aperto ? "3" : "1.6");
      C.fondo.setAttribute("stroke-dasharray", es === "fuori" ? "5 4" : "");
      C.banda.setAttribute("x", p.x); C.banda.setAttribute("y", p.y); C.banda.setAttribute("height", p.h);
      C.banda.setAttribute("opacity", es === "fuori" ? ".35" : "1");
      C.nome.setAttribute("x", p.x + 12); C.nome.setAttribute("y", p.y + p.h / 2 + 4);
      C.nome.textContent = accorcia(c.nome, p.w > 150 ? 22 : 17);
      C.nome.setAttribute("opacity", es === "fuori" ? ".5" : "1");
      C.simbolo.setAttribute("x", p.x + p.w - 14); C.simbolo.setAttribute("y", p.y + p.h / 2 + 5);
      C.simbolo.setAttribute("fill", colori[es][1]);
      C.simbolo.textContent = simboli[es];
      C.g.classList.toggle("pulsa", !ridotto && es === "rosso" && s.modifica && c.regredisce);
    }
    const r = rilancio(sc, s);
    sintesi.textContent = s.rilanciato ? riempi(T.esito_rilancio, { verdi: r.verdi, rossi: r.rossi, tot: r.tot }) : "";
    sc.situazioni.forEach((x, i) => {
      const a = s.scelte[x.id];
      RIG_DEC[i].scelta.textContent = a ? `→ ${sc.azioni.find((z) => z.id === a).nome}` : E.scegli;
      RIG_DEC[i].r.setAttribute("stroke", a ? "#4f46e5" : "#cbd2e3");
    });
  }

  function disegnaDestra() {
    if (s.vista === "decidi") {
      const figli = [];
      if (s.verificato) {
        const v = verifica(sc, s);
        figli.push(el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}`, style: "margin-bottom:8px" }, el("div", {}, v.sintesi)),
          ...v.righe.map((x) => el("div", { class: `riquadro ${x.esito === "giusto" ? "ok" : "male"}` }, x.testo)));
      }
      corpo.replaceChildren(...figli);
      return;
    }
    const c = caso(s.caso_aperto);
    const es = esitoCaso(sc, s, c);
    const strum = c.strumenti.map((id) => sc.nomi_strumenti[id]).join(", ");
    const scheda = el("div", { class: "caso" },
      el("b", { style: `color:${fam(c.famiglia).colore}` }, `${fam(c.famiglia).nome} · ${c.nome}`),
      el("span", { class: "etichetta-piccola" }, E.richiesta), el("span", {}, c.richiesta),
      el("span", { class: "etichetta-piccola" }, E.atteso), el("div", { class: "riquadro ok" }, c.atteso),
      el("span", { class: "nota" }, riempi(T.strumenti, { elenco: strum })));
    if (es === "rosso") scheda.append(el("span", { class: "etichetta-piccola" }, E.ottenuto), el("div", { class: "riquadro male" }, c.effettivo));
    const figli = [scheda];
    if (c.id !== sc.caso_produzione.id) {
      const dentro = s.set.includes(c.id);
      figli.push(el("button", { class: "btn btn-fantasma", style: "width:100%;justify-content:center;margin-bottom:8px", onclick: () => alterna(c.id) }, dentro ? E.togli : E.aggiungi));
    }
    const cop = copertura(sc, s);
    figli.push(el("span", { class: "etichetta-piccola" }, E.titolo_copertura),
      el("div", { class: "copertura" }, sc.famiglie.map((f) => el("div", { class: "riga" }, el("span", { style: `color:${f.colore};font-weight:700` }, riempi(T.copertura_famiglia, { famiglia: f.nome, n: cop.per[f.id] })), el("b", { style: `color:${cop.per[f.id] ? "#16a34a" : "#e11d48"}` }, cop.per[f.id] ? E.simbolo_ok : E.simbolo_ko)))));
    if (s.verificato) figli.push(el("div", { class: `riquadro ${cop.completa ? "ok" : "avviso"}` }, cop.completa ? T.copertura_ok : riempi(T.copertura_manca, { mancano: cop.mancano.map((id) => fam(id).nome).join(", ") })));
    const r = rilancio(sc, s);
    if (s.modifica && !s.rilanciato) figli.push(el("div", { class: "riquadro avviso" }, T.da_rilanciare));
    if (r.cieco) figli.push(el("div", { class: "riquadro avviso" }, T.povero_cieco));
    if (r.regressioni) figli.push(el("div", { class: "riquadro male" }, riempi(T.regressioni, { n: r.regressioni })));
    if (s.produzione) figli.push(el("div", { class: "riquadro neutro" }, riempi(T.nuovo_caso, { v: versione(sc, s) })));
    corpo.replaceChildren(...figli);
    if (!ridotto) corpo.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 250 });
  }

  function aggiornaComandi() {
    segVista.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.vista)));
    const povero = s.set.length === sc.set_povero.length && sc.set_povero.every((id) => s.set.includes(id));
    const pieno = completo.every((id) => s.set.includes(id));
    segPreset.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String((b.dataset.v === "povero" && povero) || (b.dataset.v === "completo" && pieno))));
    cMod.checked = s.modifica;
    zonaGriglia.classList.toggle("nascosto", s.vista !== "griglia");
    zonaDecidi.classList.toggle("nascosto", s.vista !== "decidi");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }

  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaDestra(); }

  function cambia(diff, soloScheda) {
    Object.assign(s, diff);
    if (!soloScheda) s.verificato = false;
    ridisegna();
  }
  function alterna(id) {
    const set = s.set.includes(id) ? s.set.filter((x) => x !== id) : [...s.set, id];
    cambia({ set, rilanciato: false });
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
    if (!["griglia", "decidi"].includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    for (const id of nuovo.set) if (!sc.casi.some((c) => c.id === id)) throw new Error(`stato_animazione: caso sconosciuto «${id}»`);
    if (!caso(nuovo.caso_aperto)) throw new Error(`stato_animazione: caso_aperto sconosciuto «${nuovo.caso_aperto}»`);
    if (nuovo.caso_aperto === sc.caso_produzione.id && !nuovo.produzione) throw new Error("stato_animazione: il caso di produzione non esiste ancora");
    for (const [id, v] of Object.entries(nuovo.scelte)) {
      if (!sc.situazioni.some((x) => x.id === id)) throw new Error(`stato_animazione: situazione sconosciuta «${id}»`);
      if (!sc.azioni.some((a) => a.id === v)) throw new Error(`stato_animazione: azione sconosciuta «${v}»`);
    }
    Object.assign(s, nuovo, { set: [...nuovo.set], scelte: { ...nuovo.scelte } });
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo */ },
    _prova: { stato: s, copertura: () => copertura(sc, s), rilancio: () => rilancio(sc, s), verifica: () => verifica(sc, s) },
  };
}
