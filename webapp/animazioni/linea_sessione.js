// Lezione interattiva "La linea che si arrotola" (P5.2, sessioni e stato). La chat per un preventivo con la
// Pasticceria Marchi cresce turno dopo turno: a sinistra l'archivio con la storia completa (eventi di 4 tipi), al
// centro cio' che entra davvero nel contesto, a destra lo stato (appunti di lavoro) e il contenitore della memoria.
// Comandi: turni, strategia di compattazione (ultimi N, tetto di token, riassunto), momento (conteggio, tempo,
// evento), riassunto troppo aggressivo (esempio didattico), archivio in memoria o database, riavvio e chiusura.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "linea_sessione";
const RIGA = { y0: 66, passo: 23.5, h: 20 };
const COL = { archivio: { x: 12, w: 196 }, contesto: { x: 222, w: 206 }, stato: { x: 446, y: 50, w: 262, h: 150 }, memoria: { x: 446, y: 214, w: 262, h: 190 } };
const TIPI = ["utente", "agente", "strumento", "risultato"];
const STRATEGIE = ["nessuna", "ultimi", "tetto", "riassunto"];
const TRIGGER = ["conteggio", "tempo", "evento"];

const STILE = `
.lz-linea_sessione .riga-turno { cursor: pointer; }
.lz-linea_sessione .riga-turno:focus-visible rect.fondo { stroke: #4f46e5; stroke-width: 2.5; }
.lz-linea_sessione .card-mem { cursor: pointer; }
.lz-linea_sessione .card-mem:focus-visible rect { stroke: #4f46e5; stroke-width: 2.5; }
.lz-linea_sessione .evento { display: grid; grid-template-columns: 74px 1fr; gap: 6px; font-size: .8rem; padding: 4px 0; border-bottom: 1px dashed #e3e7f1; }
.lz-linea_sessione .evento .tipo { font-size: .66rem; font-weight: 800; text-transform: uppercase; letter-spacing: .05em; }
.lz-linea_sessione .nota { font-size: .78rem; color: var(--tenue); margin: 6px 0 0; }
.lz-linea_sessione .azioni { display: grid; gap: 6px; margin-top: 10px; }
.lz-linea_sessione .azioni .btn { justify-content: center; }
.lz-linea_sessione .etichetta-piccola { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--tenue-2, #7a849e); margin-top: 10px; }
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

/** Eventi di un turno, nei 4 tipi della fonte: messaggio, risposta, chiamata a strumento, risultato. */
export function eventi(t) {
  const ev = [{ tipo: "utente", testo: t.utente }];
  if (t.strumento) ev.push({ tipo: "strumento", testo: t.strumento.nome }, { tipo: "risultato", testo: t.strumento.risultato });
  ev.push({ tipo: "agente", testo: t.agente });
  return ev;
}

/** La sessione e' persa? (riavvio con archivio solo in memoria, oppure sessione chiusa) */
export function persa(s) {
  return s.evento === "chiusa" || (s.evento === "riavviata" && s.archivio === "memoria");
}

/** Lo stato (appunti di lavoro) dopo i turni giocati: ogni turno sovrascrive solo i campi che cambia. */
export function statoSessione(sc, s) {
  const st = { ...sc.stato_iniziale };
  for (const t of sc.turni.slice(0, s.turni)) Object.assign(st, t.stato || {});
  return st;
}

/** Quali turni entrano nel contesto: compattazione, se il momento scelto e' arrivato. */
export function compatta(sc, s) {
  const giocati = sc.turni.slice(0, s.turni);
  const tokenArchivio = giocati.reduce((a, t) => a + t.token, 0);
  const C = sc.compattazione;
  let scattata = false;
  if (s.strategia !== "nessuna") {
    if (s.trigger === "conteggio") scattata = s.strategia === "tetto" ? tokenArchivio > C.tetto_token : s.turni > C.ultimi_n;
    else if (s.trigger === "tempo") scattata = s.turni > C.pausa_dopo_turno;
    else scattata = s.turni > C.evento_al_turno;
  }
  let tenuti = giocati.map((t) => t.id);
  let capsula = null;
  if (scattata && s.strategia === "ultimi") tenuti = tenuti.slice(-C.ultimi_n);
  if (scattata && s.strategia === "tetto") {
    const presi = [];
    let somma = 0;
    for (const t of [...giocati].reverse()) {
      if (somma + t.token > C.tetto_token) break;
      somma += t.token;
      presi.unshift(t.id);
    }
    tenuti = presi;
  }
  if (scattata && s.strategia === "riassunto") {
    const vecchi = giocati.slice(0, -C.recenti_interi);
    tenuti = giocati.slice(-C.recenti_interi).map((t) => t.id);
    const numeri = vecchi.map((t) => sc.turni.indexOf(t) + 1);
    const fatti = C.fatti.filter((f) => numeri.includes(f.turno) && (!s.aggressivo || f.anche_aggressivo));
    capsula = { turni: vecchi.map((t) => t.id), fatti, token: C.token_capsula_base + fatti.length * C.token_per_fatto };
  }
  const tokenContesto = giocati.filter((t) => tenuti.includes(t.id)).reduce((a, t) => a + t.token, 0) + (capsula ? capsula.token : 0);
  const decisione = sc.turni.find((t) => t.decisione);
  const lunedi = s.turni >= sc.turni.indexOf(decisione) + 1 &&
    (tenuti.includes(decisione.id) || Boolean(capsula && capsula.fatti.some((f) => f.decisione)));
  return { scattata, tenuti, capsula, token_archivio: tokenArchivio, token_contesto: tokenContesto, lunedi_nel_contesto: lunedi, eventi_contesto: giocati.filter((t) => tenuti.includes(t.id)).reduce((a, t) => a + eventi(t).length, 0) };
}

/** La risposta dell'agente al turno in cui il cliente chiede quando lo si richiama (nessuna prima di quel turno). */
export function prossimaMossa(sc, s) {
  if (persa(s) || s.turni < sc.turno_domanda) return null;
  const c = compatta(sc, s);
  return { ok: c.lunedi_nel_contesto, testo: c.lunedi_nel_contesto ? sc.testi.mossa_ok : sc.testi.mossa_lunedi };
}

/** Che cosa sopravvive alla fine: con la sessione persa restano solo le card messe in memoria (se gia' dette). */
export function fine(sc, s) {
  const sopravvive = s.evento === "chiusa"
    ? sc.memoria.filter((m) => s.memoria.includes(m.id) && m.turno <= s.turni).map((m) => m.id)
    : [];
  return { persa: persa(s), sopravvive, inutili: sopravvive.filter((id) => sc.memoria.find((m) => m.id === id).inutile) };
}

/** Coordinate delle righe (una per turno) e delle card della memoria: dentro 720 x 412. */
export function posizioni(sc, s) {
  const righe = sc.turni.slice(0, s.turni).map((t, i) => ({ id: t.id, y: RIGA.y0 + i * RIGA.passo, h: RIGA.h }));
  const card = sc.memoria.map((m, i) => ({ id: m.id, x: COL.memoria.x + 10, y: COL.memoria.y + 30 + i * 38, w: COL.memoria.w - 20, h: 32 }));
  return { righe, card };
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
  const num = (x) => x.toLocaleString(lingua);
  const COLORI = sc.colori_tipi;

  const s = { turni: 6, strategia: "nessuna", trigger: "conteggio", aggressivo: false, archivio: "database", evento: "attiva", memoria: [], turno_aperto: sc.turni[0].id };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const valTurni = el("b", {});
  const inTurni = el("input", { type: "range", min: 1, max: sc.turni.length, step: 1, "aria-label": E.turni });
  inTurni.addEventListener("input", () => cambia({ turni: Number(inTurni.value), evento: "attiva" }));
  const segStrategia = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.strategia },
    ...STRATEGIE.map((v) => el("button", { "data-v": v, onclick: () => cambia({ strategia: v }) }, E[`strategia_${v}`])));
  const segTrigger = el("div", { class: "segmentato", role: "group", "aria-label": E.trigger },
    ...TRIGGER.map((v) => el("button", { "data-v": v, onclick: () => cambia({ trigger: v }) }, E[`trigger_${v}`])));
  const inAggr = el("input", { type: "checkbox", onchange: (e) => cambia({ aggressivo: e.target.checked }) });
  const segArchivio = el("div", { class: "segmentato", role: "group", "aria-label": E.archivio },
    el("button", { "data-v": "memoria", onclick: () => cambia({ archivio: "memoria" }) }, E.archivio_memoria),
    el("button", { "data-v": "database", onclick: () => cambia({ archivio: "database" }) }, E.archivio_database));
  const btnRiavvia = el("button", { class: "btn", onclick: () => cambia({ evento: "riavviata" }) }, E.riavvia);
  const btnChiudi = el("button", { class: "btn btn-primario", onclick: () => cambia({ evento: "chiusa" }) }, E.chiudi);
  const btnRiprendi = el("button", { class: "btn", onclick: () => cambia({ evento: "attiva" }) }, E.riprendi);
  comandi.append(el("h3", {}, E.titolo_comandi),
    el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, E.turni), valTurni), inTurni),
    el("h4", {}, E.strategia), segStrategia, el("h4", {}, E.trigger), segTrigger,
    el("label", { class: "interruttore pericolo" }, el("span", {}, E.aggressivo), inAggr),
    el("h4", {}, E.archivio), segArchivio, el("div", { class: "azioni" }, btnRiavvia, btnChiudi, btnRiprendi));

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: "0 0 720 412", role: "img", "aria-label": E.descrizione_scena });
  const gTesta = svgEl("g");
  const gRighe = svgEl("g");
  const gLato = svgEl("g");
  svg.append(gTesta, gRighe, gLato);
  scena.append(svg);

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  const esito = el("div", { "aria-live": "polite" });
  const dettaglio = el("div", {});
  destra.append(el("h3", {}, E.titolo_scheda), esito, dettaglio);
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  function disegnaScena() {
    const c = compatta(sc, s);
    const f = fine(sc, s);
    const pos = posizioni(sc, s);
    const st = statoSessione(sc, s);
    gTesta.replaceChildren(
      testoSvg({ x: COL.archivio.x + COL.archivio.w / 2, y: 22, "text-anchor": "middle", "font-size": 10.5, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".05em" }, E.col_archivio),
      testoSvg({ x: COL.archivio.x + COL.archivio.w / 2, y: 38, "text-anchor": "middle", "font-size": 9.5, fill: "#5b6684" }, f.persa ? "" : riempi(T.token, { n: num(c.token_archivio) })),
      testoSvg({ x: COL.contesto.x + COL.contesto.w / 2, y: 22, "text-anchor": "middle", "font-size": 10.5, "font-weight": 800, fill: "#4f46e5", "letter-spacing": ".05em" }, E.col_contesto),
      testoSvg({ x: COL.contesto.x + COL.contesto.w / 2, y: 38, "text-anchor": "middle", "font-size": 9.5, fill: c.scattata ? "#4f46e5" : "#5b6684", "font-weight": c.scattata ? 800 : 400 }, f.persa ? "" : riempi(c.scattata ? T.token_compattato : T.token, { n: num(c.token_contesto) })));
    const figli = [];
    if (f.persa) {
      figli.push(svgEl("rect", { x: COL.archivio.x, y: RIGA.y0 - 6, width: COL.contesto.x + COL.contesto.w - COL.archivio.x, height: 320, rx: 14, fill: "#f1f5f9", stroke: "#cbd5e1", "stroke-dasharray": "6 4" }));
      figli.push(testoSvg({ x: (COL.archivio.x + COL.contesto.x + COL.contesto.w) / 2, y: 210, "text-anchor": "middle", "font-size": 13, "font-weight": 800, fill: "#64748b" }, s.evento === "chiusa" ? E.sessione_chiusa : E.sessione_persa));
    } else {
      const capsulaRighe = [];
      sc.turni.slice(0, s.turni).forEach((t, i) => {
        const P = pos.righe[i];
        const g = svgEl("g", { class: "riga-turno", tabindex: "0", role: "button", "aria-label": riempi(T.apri_turno, { n: i + 1 }) });
        const aperto = s.turno_aperto === t.id;
        g.append(svgEl("rect", { class: "fondo", x: COL.archivio.x, y: P.y, width: COL.archivio.w, height: P.h, rx: 6, fill: "#f1f5f9", stroke: aperto ? "#4f46e5" : "#e2e8f0", "stroke-width": aperto ? 2 : 1 }));
        g.append(testoSvg({ x: COL.archivio.x + 8, y: P.y + 14, "font-size": 9.5, "font-weight": 800, fill: "#64748b" }, riempi(T.sigla_turno, { n: i + 1 })));
        eventi(t).forEach((ev, k) => g.append(svgEl("rect", { x: COL.archivio.x + 40 + k * 22, y: P.y + 5, width: 18, height: 10, rx: 3, fill: "#94a3b8", "fill-opacity": ".55" })));
        if (t.decisione) g.append(testoSvg({ x: COL.archivio.x + COL.archivio.w - 10, y: P.y + 14, "text-anchor": "end", "font-size": 9, "font-weight": 800, fill: "#b45309" }, E.decisione));
        if (c.tenuti.includes(t.id)) {
          g.append(svgEl("rect", { x: COL.contesto.x, y: P.y, width: COL.contesto.w, height: P.h, rx: 6, fill: "#fff", stroke: aperto ? "#4f46e5" : "#c7d2fe", "stroke-width": aperto ? 2 : 1 }));
          g.append(testoSvg({ x: COL.contesto.x + 8, y: P.y + 14, "font-size": 9.5, "font-weight": 800, fill: "#3730a3" }, riempi(T.sigla_turno, { n: i + 1 })));
          eventi(t).forEach((ev, k) => g.append(svgEl("rect", { x: COL.contesto.x + 40 + k * 22, y: P.y + 5, width: 18, height: 10, rx: 3, fill: COLORI[ev.tipo] })));
          if (t.decisione) g.append(testoSvg({ x: COL.contesto.x + COL.contesto.w - 10, y: P.y + 14, "text-anchor": "end", "font-size": 9, "font-weight": 800, fill: "#b45309" }, E.decisione));
        } else if (c.capsula && c.capsula.turni.includes(t.id)) capsulaRighe.push(P);
        const apri = () => cambia({ turno_aperto: t.id });
        g.addEventListener("click", apri);
        g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(); } });
        figli.push(g);
      });
      if (c.capsula && capsulaRighe.length) {
        const y0 = capsulaRighe[0].y, y1 = capsulaRighe.at(-1).y + RIGA.h;
        figli.push(svgEl("rect", { x: COL.contesto.x, y: y0, width: COL.contesto.w, height: y1 - y0, rx: 12, fill: s.aggressivo ? "#fff1f2" : "#eef2ff", stroke: s.aggressivo ? "#e11d48" : "#6366f1", "stroke-width": 1.8 }));
        figli.push(testoSvg({ x: COL.contesto.x + 10, y: y0 + 16, "font-size": 9.5, "font-weight": 800, fill: s.aggressivo ? "#be123c" : "#3730a3" }, riempi(T.capsula, { n: c.capsula.fatti.length })));
        c.capsula.fatti.slice(0, Math.max(0, Math.floor((y1 - y0 - 22) / 13))).forEach((ft, k) => {
          figli.push(testoSvg({ x: COL.contesto.x + 10, y: y0 + 31 + k * 13, "font-size": 8.8, fill: ft.decisione ? "#b45309" : "#3730a3", "font-weight": ft.decisione ? 800 : 400 }, `• ${accorcia(ft.testo, 34)}`));
        });
      }
    }
    gRighe.replaceChildren(...figli);
    // stato e memoria
    const lato = [];
    lato.push(svgEl("rect", { x: COL.stato.x, y: COL.stato.y, width: COL.stato.w, height: COL.stato.h, rx: 12, fill: "#fff", stroke: "#a5b4fc", "stroke-width": 1.5 }));
    lato.push(testoSvg({ x: COL.stato.x + 12, y: COL.stato.y + 18, "font-size": 10.5, "font-weight": 800, fill: "#3730a3" }, E.col_stato));
    sc.campi_stato.forEach((k, i) => {
      const vuoto = f.persa;
      lato.push(testoSvg({ x: COL.stato.x + 12, y: COL.stato.y + 40 + i * 21, "font-size": 9.5, "font-family": "monospace", fill: k.startsWith("user:") ? "#7c3aed" : "#5b6684" }, k));
      lato.push(testoSvg({ x: COL.stato.x + COL.stato.w - 12, y: COL.stato.y + 40 + i * 21, "text-anchor": "end", "font-size": 9.5, "font-weight": 700, fill: "#17203b" }, vuoto ? "—" : accorcia(String(st[k]), 22)));
    });
    lato.push(svgEl("rect", { x: COL.memoria.x, y: COL.memoria.y, width: COL.memoria.w, height: COL.memoria.h, rx: 12, fill: "#f0fdf4", stroke: "#4ade80", "stroke-width": 1.5, "stroke-dasharray": "6 4" }));
    lato.push(testoSvg({ x: COL.memoria.x + 12, y: COL.memoria.y + 19, "font-size": 10.5, "font-weight": 800, fill: "#166534" }, E.col_memoria));
    sc.memoria.forEach((m, i) => {
      const P = pos.card[i];
      const detto = m.turno <= s.turni;
      const dentro = s.memoria.includes(m.id);
      const salva = f.sopravvive.includes(m.id);
      const svanita = f.persa && !salva;
      const g = svgEl("g", { class: "card-mem", tabindex: "0", role: "button", opacity: !detto || svanita ? ".35" : "1",
        "aria-label": riempi(dentro ? T.togli_memoria : T.metti_memoria, { testo: m.testo }) });
      g.append(svgEl("rect", { x: P.x, y: P.y, width: P.w, height: P.h, rx: 8, fill: dentro ? "#dcfce7" : "#fff", stroke: dentro ? "#16a34a" : "#cbd5e1", "stroke-width": dentro ? 2 : 1 }));
      g.append(testoSvg({ x: P.x + 10, y: P.y + 20, "font-size": 9.8, "font-weight": dentro ? 800 : 500, fill: "#17203b" }, `${dentro ? "✓ " : ""}${accorcia(detto ? m.testo : E.non_ancora, 36)}`));
      const tocca = () => { if (!detto) return; cambia({ memoria: dentro ? s.memoria.filter((x) => x !== m.id) : [...s.memoria, m.id] }); };
      g.addEventListener("click", tocca);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tocca(); } });
      lato.push(g);
    });
    gLato.replaceChildren(...lato);
    if (!ridotto && f.persa) gRighe.animate([{ opacity: 0.3 }, { opacity: 1 }], { duration: 400 });
  }

  function disegnaDestra() {
    const c = compatta(sc, s);
    const f = fine(sc, s);
    const m = prossimaMossa(sc, s);
    let blocco;
    if (s.evento === "chiusa") {
      const sapute = f.sopravvive.map((id) => sc.memoria.find((x) => x.id === id).testo);
      blocco = el("div", { class: `esito-scheda ${sapute.length ? "ok" : "avviso"}` }, el("div", {},
        sapute.length ? riempi(T.fine_memoria, { fatti: sapute.join("; ") }) : T.fine_vuota,
        f.inutili.length ? el("div", { class: "nota" }, T.mem_inutile) : null));
    } else if (s.evento === "riavviata") {
      blocco = el("div", { class: `esito-scheda ${f.persa ? "male" : "ok"}` }, el("div", {}, f.persa ? T.riavvio_perso : T.riavvio_salvo));
    } else if (m) {
      blocco = el("div", { class: `esito-scheda ${m.ok ? "ok" : "male"}` }, el("div", {}, el("b", {}, `${E.prossima_mossa}: `), m.testo));
    } else {
      blocco = el("div", { class: "esito-scheda neutro" }, el("div", {}, riempi(T.mossa_attesa, { n: sc.turno_domanda })));
    }
    const note = [];
    if (!f.persa) {
      note.push(el("p", { class: "nota" }, riempi(T.rimanda, { eventi: c.eventi_contesto, token: num(c.token_contesto) })));
      if (c.scattata) note.push(el("p", { class: "nota" }, T.archivio_resta));
      else if (s.strategia !== "nessuna") note.push(el("p", { class: "nota" }, T[`non_ancora_${s.trigger}`]));
      if (s.aggressivo && s.strategia === "riassunto") note.push(el("p", { class: "nota" }, T.nota_didattica));
    }
    esito.replaceChildren(blocco, ...note);
    const t = sc.turni.find((x) => x.id === s.turno_aperto && sc.turni.indexOf(x) < s.turni) || sc.turni[s.turni - 1];
    const n = sc.turni.indexOf(t) + 1;
    dettaglio.replaceChildren(
      el("div", { class: "etichetta-piccola" }, riempi(T.dettaglio_turno, { n })),
      ...(f.persa ? [el("p", { class: "nota" }, T.dettaglio_perso)] : eventi(t).map((ev) => el("div", { class: "evento" },
        el("span", { class: "tipo", style: `color:${COLORI[ev.tipo]}` }, E[`tipo_${ev.tipo}`]), el("span", {}, ev.testo)))));
  }

  function aggiornaComandi() {
    const premi = (seg, v) => seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === v)));
    premi(segStrategia, s.strategia); premi(segTrigger, s.trigger); premi(segArchivio, s.archivio);
    inTurni.value = s.turni;
    valTurni.textContent = riempi(T.formato_turni, { n: s.turni, tot: sc.turni.length });
    inAggr.checked = s.aggressivo;
  }

  function ridisegna() {
    aggiornaComandi();
    disegnaScena();
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
    if (!(Number.isInteger(nuovo.turni) && nuovo.turni >= 1 && nuovo.turni <= sc.turni.length)) throw new Error(`stato_animazione: turni fuori scala «${nuovo.turni}»`);
    if (!STRATEGIE.includes(nuovo.strategia)) throw new Error(`stato_animazione: strategia sconosciuta «${nuovo.strategia}»`);
    if (!TRIGGER.includes(nuovo.trigger)) throw new Error(`stato_animazione: momento sconosciuto «${nuovo.trigger}»`);
    if (!["memoria", "database"].includes(nuovo.archivio)) throw new Error(`stato_animazione: archivio sconosciuto «${nuovo.archivio}»`);
    if (!["attiva", "riavviata", "chiusa"].includes(nuovo.evento)) throw new Error(`stato_animazione: evento sconosciuto «${nuovo.evento}»`);
    if (typeof nuovo.aggressivo !== "boolean") throw new Error("stato_animazione: aggressivo deve essere vero o falso");
    for (const id of nuovo.memoria) if (!sc.memoria.some((m) => m.id === id)) throw new Error(`stato_animazione: card di memoria sconosciuta «${id}»`);
    if (!sc.turni.some((t) => t.id === nuovo.turno_aperto)) throw new Error(`stato_animazione: turno sconosciuto «${nuovo.turno_aperto}»`);
    Object.assign(s, nuovo, { memoria: [...nuovo.memoria] });
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { /* nessun ciclo di animazione attivo */ },
    _prova: { stato: s, compatta: () => compatta(sc, s), prossimaMossa: () => prossimaMossa(sc, s), fine: () => fine(sc, s) },
  };
}
