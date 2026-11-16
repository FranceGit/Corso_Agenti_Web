// Lezione interattiva "Tanti strumenti, poco contesto" (P4.4): la finestra di contesto come una valigia che si
// riempie con le descrizioni degli strumenti (tutto caricato / specialista / scoperta progressiva a tre ripiani);
// i risultati intermedi filtrati o no in una sandbox; il pannello "dichiarato o misurato?" con le cifre del
// repository di esempio. Dimensioni dei blocchi, costi e qualita' sono illustrativi (dichiarati nello scenario).

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "valigia_strumenti";
const VISTE = ["valigia", "sandbox", "misure"];
const MODALITA = ["tutto", "specialista", "progressiva"];
const BARRA = { x: 20, y: 70, w: 680, h: 54 };

const STILE = `
.lz-valigia_strumenti .contatori { display: grid; gap: 10px; }
.lz-valigia_strumenti .contatore { font-size: .82rem; }
.lz-valigia_strumenti .contatore .riga { display: flex; justify-content: space-between; gap: 8px; }
.lz-valigia_strumenti .contatore b { font-variant-numeric: tabular-nums; }
.lz-valigia_strumenti .barra { height: 9px; border-radius: 9px; background: #eef1f8; overflow: hidden; margin-top: 4px; }
.lz-valigia_strumenti .barra span { display: block; height: 100%; border-radius: 9px; transition: width .5s ease; }
.lz-valigia_strumenti .nota { font-size: .78rem; color: var(--tenue); margin: 6px 0 0; }
.lz-valigia_strumenti .entra-svg { animation: lzvs-entra .35s ease; }
@keyframes lzvs-entra { from { opacity: 0; } to { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .lz-valigia_strumenti .barra span { transition: none; } }
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

/** Che cosa entra nella finestra di contesto con il numero di strumenti e la modalita' scelti. */
export function contesto(sc, s) {
  const P = sc.parametri;
  const blocchi = [{ tipo: "base", token: P.token_base }];
  let inValigia;
  if (s.modalita === "tutto") {
    inValigia = s.strumenti;
    for (let i = 0; i < s.strumenti; i++) blocchi.push({ tipo: "strumento", token: P.token_strumento });
  } else if (s.modalita === "specialista") {
    inValigia = Math.min(s.strumenti, P.elenco_specialista);
    for (let i = 0; i < inValigia; i++) blocchi.push({ tipo: "strumento", token: P.token_strumento });
  } else {
    inValigia = P.manuali_aperti;
    blocchi.push({ tipo: "etichette", token: s.strumenti * P.token_etichetta });
    for (let i = 0; i < P.manuali_aperti; i++) blocchi.push({ tipo: "manuale", token: P.token_strumento });
    blocchi.push({ tipo: "allegato", token: P.token_allegato });
  }
  const usati = blocchi.reduce((a, b) => a + b.token, 0);
  const trabocca = usati > P.capienza;
  const pct = Math.round((usati / P.capienza) * 100);
  const costo = Math.round((usati / 1000) * P.euro_per_mille * 1000) / 1000;
  let qualita;
  if (trabocca) qualita = 0;
  else if (s.modalita === "tutto") qualita = Math.max(P.qualita_minima, P.qualita_tutto - Math.max(0, s.strumenti - P.soglia_scelta) * P.calo_per_strumento);
  else if (s.modalita === "specialista") qualita = P.qualita_specialista;
  else qualita = P.qualita_progressiva - Math.floor(s.strumenti / P.calo_progressiva_ogni);
  const copertura = s.modalita === "specialista" ? Math.round((Math.min(s.strumenti, P.elenco_specialista) / s.strumenti) * 100) : 100;
  const avviso = s.modalita === "tutto" && s.strumenti > P.soglia_avviso;
  return { blocchi, usati, capienza: P.capienza, pct, trabocca, costo, qualita, copertura, avviso, inValigia };
}

/** Il risultato di uno strumento (83 trattative): quante righe arrivano al modello e quanto pesano nei passi successivi. */
export function sandbox(sc, s) {
  const P = sc.parametri;
  const dentro = P.righe_risultato;
  const alModello = s.filtro ? sc.righe_filtrate.length : dentro;
  const tokenChiamata = alModello * P.token_per_riga;
  return { dentro, alModello, tokenChiamata, tokenPassi: tokenChiamata * P.passi_successivi, passi: P.passi_successivi };
}

/** Tappa del pannello "dichiarato o misurato?". */
export function misura(sc, s) {
  const t = sc.tappe[s.tappa];
  if (!t) throw new Error(`tappa sconosciuta «${s.tappa}»`);
  return { ...t, mostraTempo: t.id === "misurato" };
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto_) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const P = sc.parametri;
  const lingua = contesto_ && contesto_.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante: serve per scrivere i numeri nel formato della lingua");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));
  const num = (x, d = 0) => x.toLocaleString(lingua, { minimumFractionDigits: d, maximumFractionDigits: d });

  const s = { vista: "valigia", strumenti: sc.strumenti.partenza, modalita: "tutto", filtro: true, tappa: 0 };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const seg = (chiave, voci, verticale) => {
    const g = el("div", { class: `segmentato${verticale ? " verticale" : ""}`, role: "group", "aria-label": E[`grp_${chiave}`] },
      ...voci.map(([v, t]) => el("button", { "data-v": String(v), onclick: () => cambia({ [chiave]: v }) }, t)));
    g.dataset.chiave = chiave;
    return g;
  };
  const segVista = seg("vista", VISTE.map((v) => [v, E[`vista_${v}`]]));
  const segModo = seg("modalita", MODALITA.map((m) => [m, E[`modo_${m}`]]), true);
  const valStr = el("b", {});
  const inStr = el("input", { type: "range", min: sc.strumenti.min, max: sc.strumenti.max, step: 1, "aria-label": E.strumenti });
  inStr.addEventListener("input", () => cambia({ strumenti: Number(inStr.value) }));
  const zonaValigia = el("div", {}, el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, E.strumenti), valStr), inStr),
    el("h4", {}, E.grp_modalita), segModo);
  const inFiltro = el("input", { type: "checkbox", onchange: (e) => cambia({ filtro: e.target.checked }) });
  const zonaSandbox = el("div", {}, el("label", { class: "interruttore" }, el("span", {}, E.filtro), inFiltro), el("p", { class: "nota" }, T.nota_sandbox));
  const segTappa = seg("tappa", sc.tappe.map((t, i) => [i, t.nome]), true);
  const zonaMisure = el("div", {}, el("h4", {}, E.grp_tappa), segTappa);
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaValigia, zonaSandbox, zonaMisure);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: "0 0 720 420", role: "img", "aria-label": E.descrizione_scena });
  const gScena = svgEl("g");
  svg.append(gScena);
  scena.append(svg);
  const destra = el("aside", { class: "pannello destra" });
  const titoloDestra = el("h3", {});
  const corpo = el("div", { "aria-live": "polite" });
  destra.append(titoloDestra, corpo);
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  const scritta = (x, y, testo, attr) => testoSvg({ x, y, "font-size": 11, fill: "#17203b", ...attr }, testo);
  const COL = { base: "#64748b", strumento: "#8b5cf6", etichette: "#c4b5fd", manuale: "#7c3aed", allegato: "#f59e0b", risultato: "#0ea5e9" };

  function barraContesto(g, blocchi, capienza, y = BARRA.y) {
    g.append(svgEl("rect", { x: BARRA.x, y, width: BARRA.w, height: BARRA.h, rx: 12, fill: "#fff", stroke: "#17203b", "stroke-width": 2 }));
    let x = BARRA.x;
    const scala = BARRA.w / capienza;
    for (const b of blocchi) {
      const w = b.token * scala;
      const fine = Math.min(x + w, BARRA.x + BARRA.w);
      if (fine > x) g.append(svgEl("rect", { x: x + 0.5, y: y + 5, width: Math.max(0.5, fine - x - 1), height: BARRA.h - 10, rx: 3, fill: COL[b.tipo] }));
      x += w;
    }
    if (x > BARRA.x + BARRA.w) {
      g.append(svgEl("rect", { x: BARRA.x + BARRA.w - 70, y: y - 6, width: 76, height: BARRA.h + 12, rx: 8, fill: "#e11d48", "fill-opacity": ".85" }));
      g.append(scritta(BARRA.x + BARRA.w - 32, y + BARRA.h / 2 + 4, E.trabocca, { "text-anchor": "middle", "font-size": 10.5, "font-weight": 800, fill: "#fff" }));
    }
  }
  function disegnaValigia(g) {
    const c = contesto(sc, s);
    g.append(scritta(BARRA.x, 60, riempi(T.finestra, { usati: num(c.usati), capienza: num(c.capienza) }), { "font-size": 11, "font-weight": 700, fill: "#5b6684" }));
    barraContesto(g, c.blocchi, c.capienza);
    const legenda = s.modalita === "progressiva" ? ["base", "etichette", "manuale", "allegato"] : ["base", "strumento"];
    legenda.forEach((k, i) => {
      g.append(svgEl("rect", { x: BARRA.x + i * 170, y: 136, width: 12, height: 12, rx: 3, fill: COL[k] }));
      g.append(scritta(BARRA.x + 18 + i * 170, 146, E[`leg_${k}`], { "font-size": 10 }));
    });
    if (c.trabocca) g.append(scritta(360, 176, T.chiamata_fallita, { "text-anchor": "middle", "font-size": 14, "font-weight": 800, fill: "#e11d48" }));
    if (s.modalita === "progressiva") {
      const ripiani = [
        { y: 196, nome: E.ripiano_1, n: s.strumenti, w: 10, col: COL.etichette },
        { y: 276, nome: E.ripiano_2, n: P.manuali_aperti, w: 60, col: COL.manuale },
        { y: 346, nome: E.ripiano_3, n: 1, w: 60, col: COL.allegato },
      ];
      for (const r of ripiani) {
        g.append(svgEl("rect", { x: 20, y: r.y, width: 680, height: r.y === 196 ? 66 : 56, rx: 10, fill: "#faf5ff", stroke: "#ddd6fe" }));
        g.append(scritta(32, r.y + 18, r.nome, { "font-size": 10.5, "font-weight": 800, fill: "#5b21b6" }));
        for (let i = 0; i < r.n; i++) {
          const x = 32 + (i % 50) * (r.w + 3), y = r.y + 26 + Math.floor(i / 50) * 14;
          g.append(svgEl("rect", { x, y, width: r.w, height: r.w === 10 ? 10 : 22, rx: 2, fill: r.col }));
        }
      }
    } else {
      g.append(scritta(20, 200, riempi(T.cassetta, { n: s.strumenti, dentro: c.inValigia }), { "font-size": 10.5, "font-weight": 700, fill: "#5b6684" }));
      for (let i = 0; i < s.strumenti; i++) {
        const x = 20 + (i % 20) * 34, y = 212 + Math.floor(i / 20) * 34;
        const dentro = i < c.inValigia;
        g.append(svgEl("rect", { x, y, width: 28, height: 28, rx: 6, fill: dentro ? COL.strumento : "#e5e7eb", stroke: dentro ? "none" : "#cbd2e3" }));
      }
    }
  }
  function disegnaSandbox(g) {
    const r = sandbox(sc, s);
    g.append(svgEl("rect", { x: 16, y: 50, width: 300, height: 330, rx: 14, fill: "#f8fafc", stroke: "#0ea5e9", "stroke-width": 2, "stroke-dasharray": "7 5" }));
    g.append(scritta(30, 72, E.sandbox, { "font-size": 11.5, "font-weight": 800, fill: "#0369a1" }));
    g.append(scritta(30, 88, riempi(T.dentro_sandbox, { n: r.dentro }), { "font-size": 10, fill: "#5b6684" }));
    for (let i = 0; i < r.dentro; i++) {
      const x = 30 + (i % 10) * 27, y = 100 + Math.floor(i / 10) * 24;
      const scelta = s.filtro && i < sc.righe_filtrate.length;
      g.append(svgEl("rect", { x, y, width: 22, height: 18, rx: 3, fill: scelta ? "#0ea5e9" : "#cbd5e1" }));
    }
    if (s.filtro) {
      g.append(svgEl("path", { d: "M 250 316 L 300 316 L 282 340 L 282 362 L 268 362 L 268 340 Z", fill: "#0ea5e9" }));
      g.append(scritta(30, 360, E.codice_filtra, { "font-size": 10, "font-weight": 700, fill: "#0369a1" }));
    }
    g.append(svgEl("path", { d: "M 320 215 L 392 215", stroke: s.filtro ? "#0ea5e9" : "#e11d48", "stroke-width": s.filtro ? 3 : 9, "stroke-linecap": "round" }));
    g.append(svgEl("rect", { x: 400, y: 50, width: 304, height: 330, rx: 14, fill: "#fff", stroke: "#17203b", "stroke-width": 2 }));
    g.append(scritta(414, 72, E.contesto_modello, { "font-size": 11.5, "font-weight": 800 }));
    g.append(scritta(414, 88, riempi(T.righe_arrivano, { n: r.alModello }), { "font-size": 10, fill: s.filtro ? "#166534" : "#9f1239", "font-weight": 700 }));
    if (s.filtro) sc.righe_filtrate.forEach((t, i) => g.append(scritta(414, 116 + i * 22, `${i + 1}. ${t}`, { "font-size": 11 })));
    else for (let i = 0; i < 24; i++) g.append(svgEl("rect", { x: 414, y: 98 + i * 11, width: 276, height: 7, rx: 2, fill: "#fda4af" }));
    g.append(scritta(552, 400, riempi(T.token_passi, { token: num(r.tokenPassi), passi: r.passi }), { "text-anchor": "middle", "font-size": 10.5, "font-weight": 700, fill: s.filtro ? "#166534" : "#9f1239" }));
  }
  function disegnaMisure(g) {
    const m = misura(sc, s);
    sc.tappe.forEach((t, i) => {
      const y = 60 + i * 66;
      const att = i === s.tappa;
      g.append(scritta(20, y + 14, `${t.nome}: ${num(t.pct, 1)}%`, { "font-size": att ? 13 : 11.5, "font-weight": 800, fill: att ? "#17203b" : "#8a94ae" }));
      g.append(svgEl("rect", { x: 20, y: y + 22, width: 680, height: 18, rx: 9, fill: "#eef1f8" }));
      g.append(svgEl("rect", { x: 20, y: y + 22, width: Math.round(680 * t.pct / 100), height: 18, rx: 9, fill: att ? t.colore : "#cbd2e3" }));
    });
    if (m.mostraTempo) {
      const M = sc.misura_reale;
      const riga = (y, nome, a, b, unita, max) => {
        g.append(scritta(20, y, nome, { "font-size": 11, "font-weight": 800 }));
        g.append(svgEl("rect", { x: 170, y: y - 12, width: Math.round(500 * a / max), height: 12, rx: 6, fill: "#94a3b8" }));
        g.append(svgEl("rect", { x: 170, y: y + 3, width: Math.round(500 * b / max), height: 12, rx: 6, fill: "#0ea5e9" }));
        g.append(scritta(176 + Math.round(500 * a / max), y - 2, `${num(a, unita === "$" ? 3 : 1)} ${unita}`, { "font-size": 9.5 }));
        g.append(scritta(176 + Math.round(500 * b / max), y + 13, `${num(b, unita === "$" ? 3 : 1)} ${unita}`, { "font-size": 9.5, "font-weight": 700 }));
      };
      riga(286, E.tempo, M.tempo_classico, M.tempo_codice, "s", 60);
      riga(330, E.costo, M.costo_classico, M.costo_codice, "$", 0.4);
      g.append(scritta(170, 368, E.legenda_misura, { "font-size": 9.5, fill: "#5b6684" }));
    }
    g.append(scritta(360, 404, T.principio, { "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#3730a3" }));
  }
  function disegnaScena() {
    gScena.replaceChildren();
    const g = svgEl("g", { class: ridotto ? "" : "entra-svg" });
    gScena.append(g);
    g.append(scritta(360, 22, E[`titolo_scena_${s.vista}`], { "text-anchor": "middle", "font-size": 11.5, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }));
    if (s.vista === "valigia") disegnaValigia(g);
    else if (s.vista === "sandbox") disegnaSandbox(g);
    else disegnaMisure(g);
  }
  const barra = (v, max, col) => el("div", { class: "barra" }, el("span", { style: `width:${Math.min(100, Math.round((v / max) * 100))}%;background:${col}` }));
  function contatore(nome, valore, v, max, col, nota) {
    return el("div", { class: "contatore" }, el("div", { class: "riga" }, el("span", {}, nome), el("b", {}, valore)), barra(v, max, col), nota ? el("p", { class: "nota" }, nota) : null);
  }
  function disegnaDestra() {
    const figli = [];
    if (s.vista === "valigia") {
      titoloDestra.textContent = E.titolo_lancette;
      const c = contesto(sc, s);
      figli.push(el("div", { class: "contatori" },
        contatore(E.spazio, `${num(c.pct)}%`, c.pct, 100, c.trabocca ? "#e11d48" : "#8b5cf6"),
        contatore(E.costo, riempi(T.euro, { euro: num(c.costo, 3) }), c.costo, P.costo_scala, "#f59e0b"),
        contatore(E.qualita, c.trabocca ? E.fallita : `${num(c.qualita)}/100`, c.qualita, 100, "#16a34a"),
        s.modalita === "specialista" ? contatore(E.copertura, `${num(c.copertura)}%`, c.copertura, 100, "#0ea5e9", T.nota_specialista) : null));
      if (c.avviso) figli.push(el("div", { class: "esito-scheda avviso", style: "margin-top:10px" }, el("div", {}, T.avviso_tanti)));
      if (c.trabocca) figli.push(el("div", { class: "esito-scheda male", style: "margin-top:10px" }, el("div", {}, T.spiega_fallita)));
      figli.push(el("p", { class: "nota" }, T[`nota_${s.modalita}`]), el("p", { class: "nota" }, E.illustrativo));
    } else if (s.vista === "sandbox") {
      titoloDestra.textContent = E.titolo_sandbox;
      const r = sandbox(sc, s);
      figli.push(el("div", { class: "contatori" },
        contatore(E.righe_modello, `${r.alModello} / ${r.dentro}`, r.alModello, r.dentro, s.filtro ? "#16a34a" : "#e11d48"),
        contatore(riempi(T.token_in_passi, { passi: r.passi }), num(r.tokenPassi), r.tokenPassi, P.capienza, s.filtro ? "#0ea5e9" : "#e11d48", riempi(T.rispetto_capienza, { capienza: num(P.capienza) }))));
      figli.push(el("div", { class: `esito-scheda ${s.filtro ? "ok" : "avviso"}`, style: "margin-top:10px" }, el("div", {}, s.filtro ? T.filtro_si : T.filtro_no)));
      figli.push(el("div", { class: "esito-scheda neutro", style: "margin-top:10px" }, el("div", {}, T.non_fidato)));
    } else {
      titoloDestra.textContent = E.titolo_misure;
      const m = misura(sc, s);
      figli.push(el("div", { class: `esito-scheda ${m.id === "misurato" ? "ok" : "neutro"}` }, el("div", {}, m.spiega)));
      if (m.mostraTempo) figli.push(el("p", { class: "nota" }, T.compromesso));
      figli.push(el("p", { class: "nota" }, T.fonte_misure));
    }
    corpo.replaceChildren(...figli);
    if (!ridotto) corpo.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
  }
  function aggiornaComandi() {
    for (const g of [segVista, segModo, segTappa]) g.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === String(s[g.dataset.chiave]))));
    inStr.value = s.strumenti;
    valStr.textContent = String(s.strumenti);
    inFiltro.checked = s.filtro;
    zonaValigia.classList.toggle("nascosto", s.vista !== "valigia");
    zonaSandbox.classList.toggle("nascosto", s.vista !== "sandbox");
    zonaMisure.classList.toggle("nascosto", s.vista !== "misure");
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaDestra(); }
  function cambia(diff) { Object.assign(s, diff); ridisegna(); }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    if (!VISTE.includes(nuovo.vista)) throw new Error(`stato_animazione: vista sconosciuta «${nuovo.vista}»`);
    if (!MODALITA.includes(nuovo.modalita)) throw new Error(`stato_animazione: modalita sconosciuta «${nuovo.modalita}»`);
    if (!(nuovo.strumenti >= sc.strumenti.min && nuovo.strumenti <= sc.strumenti.max)) throw new Error(`stato_animazione: strumenti fuori scala «${nuovo.strumenti}»`);
    if (!(nuovo.tappa >= 0 && nuovo.tappa < sc.tappe.length)) throw new Error(`stato_animazione: tappa fuori scala «${nuovo.tappa}»`);
    if (typeof nuovo.filtro !== "boolean") throw new Error("stato_animazione: filtro deve essere vero o falso");
    Object.assign(s, nuovo);
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo */ },
    _prova: { stato: s, contesto: () => contesto(sc, s), sandbox: () => sandbox(sc, s) },
  };
}
