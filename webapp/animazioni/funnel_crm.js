// Lezione interattiva "Perche' il CRM e' un terreno ideale per gli agenti": un funnel con i lead che scendono,
// un agente agganciato a ogni stadio, il tempo risparmiato che cresce con il volume e i lucchetti di
// approvazione umana che compaiono dove un errore costa caro. Modalita' "Decidi tu": lo studente mette i lucchetti
// e riceve un riscontro stadio per stadio. Tutti i testi e i numeri arrivano dallo scenario della lezione.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "funnel_crm";
const COLORI_STADIO = ["#0ea5e9", "#6366f1", "#8b5cf6", "#a855f7", "#f59e0b", "#10b981"];
const F = { x0: 30, larghezza: 300, y0: 44, altezza: 64, minimo: 92 };
const BARRA = { x: 452, w: 196 };

const STILE = `
.lz-funnel_crm .scheda-stadio { display: grid; gap: 6px; font-size: .86rem; }
.lz-funnel_crm .scheda-stadio .titolo { font-weight: 800; font-size: .98rem; }
.lz-funnel_crm .scheda-stadio .sigla { color: var(--tenue); font-size: .8rem; }
.lz-funnel_crm .scheda-stadio dl { display: grid; grid-template-columns: auto 1fr; gap: 4px 10px; margin: 4px 0 0; }
.lz-funnel_crm .scheda-stadio dt { font-size: .7rem; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; color: var(--tenue-2); padding-top: 2px; }
.lz-funnel_crm .scheda-stadio dd { margin: 0; }
.lz-funnel_crm .controllo { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; padding: .15em .6em; border-radius: 999px; font-size: .78rem; }
.lz-funnel_crm .controllo.si { background: var(--avviso-chiaro); color: #92400e; }
.lz-funnel_crm .controllo.no { background: var(--ok-chiaro); color: #166534; }
.lz-funnel_crm .totale { margin-top: 12px; padding: 10px 12px; border-radius: 12px; background: linear-gradient(90deg, #ecfdf5, #eff6ff); font-size: .86rem; }
.lz-funnel_crm .totale b { font-size: 1.05rem; }
.lz-funnel_crm .verifica { display: grid; gap: 6px; margin-top: 10px; }
.lz-funnel_crm .verifica .riga { font-size: .82rem; padding: 7px 10px; border-radius: 10px; animation: entra .35s ease; }
.lz-funnel_crm .verifica .riga.ok { background: var(--ok-chiaro); color: #166534; }
.lz-funnel_crm .verifica .riga.manca { background: var(--male-chiaro); color: #9f1239; }
.lz-funnel_crm .verifica .riga.inutile { background: var(--avviso-chiaro); color: #92400e; }
.lz-funnel_crm .agente-stadio { cursor: pointer; }
.lz-funnel_crm .agente-stadio:focus-visible circle { stroke: #4f46e5; stroke-width: 4; }
.lz-funnel_crm .lucchetti-scelta .interruttore { padding: 3px 0; }
.lz-funnel_crm .nota { font-size: .8rem; color: var(--tenue); margin: 6px 0 0; }
`;

const ICONA_LUCCHETTO = '<rect x="-8" y="-2" width="16" height="12" rx="3" fill="currentColor"/><path d="M-5,-2 v-4 a5,5 0 0 1 10,0 v4" fill="none" stroke="currentColor" stroke-width="2.4"/>';
const ICONA_AGENTE = '<rect x="-9" y="-7" width="18" height="14" rx="5" fill="none" stroke="currentColor" stroke-width="2.2"/><circle cx="-3.5" cy="0" r="1.8" fill="currentColor"/><circle cx="3.5" cy="0" r="1.8" fill="currentColor"/><path d="M0,-7 v-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="0" cy="-12" r="1.8" fill="currentColor"/>';

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
    else if (k === "html") e.innerHTML = v;
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
function mulberry32(seme) {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------ logica (pura)

function arrotonda(x, cifre) {
  const f = Math.pow(10, cifre);
  return Math.round(x * f) / f;
}

/** Per ogni stadio: lead al giorno, ore risparmiate, lucchetto consigliato e lucchetto in uso. */
export function calcola(sc, s) {
  const p = sc.parametri;
  const fattore = s.dati_puliti ? 1 : p.fattore_dati_sporchi;
  const stadi = sc.stadi.map((st) => {
    const lead = Math.round(s.volume * st.quota_volume);
    const consigliato = st.rischio * s.costo_errore >= p.soglia_lucchetto;
    let lucchetto;
    if (s.modalita === "auto") lucchetto = consigliato;
    else if (s.modalita === "decidi") lucchetto = Boolean(s.lucchetti[st.id]);
    else throw new Error(`modalita sconosciuta: ${s.modalita}`);
    const minutiAgente = lead * st.minuti_per_lead * st.quota_automatizzabile * fattore;
    const minutiControllo = lucchetto ? lead * p.minuti_approvazione : 0;
    const ore = arrotonda(Math.max(0, minutiAgente - minutiControllo) / 60, 1);
    return { id: st.id, lead, ore, consigliato, lucchetto, rischio: st.rischio };
  });
  const totale = arrotonda(stadi.reduce((a, x) => a + x.ore, 0), 1);
  const persone = arrotonda(totale / p.ore_giornata_lavoro, 1);
  return { stadi, totale, persone, massimo: Math.max(...stadi.map((x) => x.ore)) };
}

/** Riscontro della modalita' "Decidi tu": per ogni stadio, il lucchetto messo dallo studente era giusto? */
export function verifica(sc, s) {
  const T = sc.testi;
  const calc = calcola(sc, { ...s, modalita: "decidi" });
  const righe = calc.stadi.map((x) => {
    const st = sc.stadi.find((y) => y.id === x.id);
    const messo = Boolean(s.lucchetti[x.id]);
    let esito;
    if (messo && x.consigliato) esito = "giusto_messo";
    else if (!messo && !x.consigliato) esito = "giusto_tolto";
    else if (!messo && x.consigliato) esito = "manca";
    else esito = "inutile";
    const testo = riempi(T[`ver_${esito}`], { stadio: st.nome, cautela: st.cautela, minuti: sc.parametri.minuti_approvazione });
    return { id: x.id, esito, testo, classe: esito.startsWith("giusto") ? "ok" : esito };
  });
  const giuste = righe.filter((r) => r.classe === "ok").length;
  const sintesi = giuste === righe.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righe.length });
  return { righe, giuste, totali: righe.length, sintesi };
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const P = sc.parametri;
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const durata = (ms) => (ridotto ? 1 : ms);
  const lingua = contesto && contesto.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante: serve per scrivere i numeri nel formato della lingua");
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));

  const s = {
    volume: sc.volume.min,
    costo_errore: sc.costo_errore.min,
    dati_puliti: true,
    modalita: "auto",
    lucchetti: Object.fromEntries(sc.stadi.map((x) => [x.id, false])),
    stadio_aperto: sc.stadi[0].id,
    verificato: false,
  };
  let generazione = 0;
  let calc = null;
  let precedente = null;

  // ------------------------------------------------ comandi (sinistra)
  const comandi = el("aside", { class: "pannello" });
  const cursore = (chiave, conf, formatta) => {
    const valore = el("b", {});
    const input = el("input", { type: "range", min: conf.min, max: conf.max, step: conf.passo, "aria-label": conf.etichetta });
    input.addEventListener("input", () => { valore.textContent = formatta(Number(input.value)); cambia({ [chiave]: Number(input.value) }); });
    const nodo = el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, conf.etichetta), valore), input);
    return { nodo, imposta: (v) => { input.value = v; valore.textContent = formatta(v); } };
  };
  const cVol = cursore("volume", sc.volume, (v) => riempi(T.formato_volume, { n: v }));
  const cCosto = cursore("costo_errore", sc.costo_errore, (v) => riempi(T.formato_costo, { n: v, max: sc.costo_errore.max }));
  const iDati = el("input", { type: "checkbox", onchange: (e) => cambia({ dati_puliti: e.target.checked }) });
  const segModo = el("div", { class: "segmentato", role: "group", "aria-label": E.modalita },
    el("button", { "data-v": "auto", onclick: () => cambia({ modalita: "auto" }) }, E.auto),
    el("button", { "data-v": "decidi", onclick: () => cambia({ modalita: "decidi" }) }, E.decidi));
  const notaModo = el("p", { class: "nota" });
  const sceltaLucchetti = el("div", { class: "lucchetti-scelta" });
  const interruttoriLucchetto = {};
  sc.stadi.forEach((st) => {
    const input = el("input", { type: "checkbox", onchange: (e) => cambia({ lucchetti: { ...s.lucchetti, [st.id]: e.target.checked } }) });
    sceltaLucchetti.append(el("label", { class: "interruttore" }, el("span", {}, st.nome), input));
    interruttoriLucchetto[st.id] = input;
  });
  const btnControlla = el("button", { class: "btn btn-primario", style: "margin-top:8px;width:100%;justify-content:center", onclick: () => controlla() }, E.controlla);
  const zonaDecidi = el("div", {}, el("h4", {}, E.titolo_lucchetti), sceltaLucchetti, btnControlla);
  comandi.append(
    el("h3", {}, E.titolo_comandi),
    cVol.nodo,
    cCosto.nodo,
    el("label", { class: "interruttore" }, el("span", {}, E.dati_puliti), iDati),
    el("h4", {}, E.modalita), segModo, notaModo, zonaDecidi);

  // ------------------------------------------------ scena (centro)
  const scena = el("div", { class: "scena" });
  const altezzaSvg = F.y0 + sc.stadi.length * F.altezza + 30;
  const svg = svgEl("svg", { viewBox: `0 0 720 ${altezzaSvg}`, role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs>
      <filter id="fc-ombra" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#17203b" flood-opacity=".14"/></filter>
      <pattern id="fc-righe" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#fde68a"/><rect width="3" height="6" fill="#fcd34d"/></pattern>
    </defs>`;
  svg.append(testoSvg({ x: F.x0 + F.larghezza / 2, y: 26, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, E.funnel));
  svg.append(testoSvg({ x: BARRA.x, y: 26, "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, E.risparmio));
  const gFunnel = svgEl("g");
  const gPunti = svgEl("g");
  const gLato = svgEl("g");
  svg.append(gFunnel, gPunti, gLato);
  const larghezzaA = (y) => {
    const t = (y - F.y0) / (sc.stadi.length * F.altezza);
    return F.larghezza - (F.larghezza - F.minimo) * t;
  };
  const centroX = F.x0 + F.larghezza / 2;
  const RIGHE = {};
  sc.stadi.forEach((st, i) => {
    const y1 = F.y0 + i * F.altezza, y2 = y1 + F.altezza - 4;
    const w1 = larghezzaA(y1), w2 = larghezzaA(y2);
    const fascia = svgEl("path", { d: `M${centroX - w1 / 2},${y1} L${centroX + w1 / 2},${y1} L${centroX + w2 / 2},${y2} L${centroX - w2 / 2},${y2}Z`, fill: COLORI_STADIO[i % COLORI_STADIO.length], opacity: ".16", stroke: COLORI_STADIO[i % COLORI_STADIO.length], "stroke-width": 1.5, "stroke-opacity": ".5" });
    gFunnel.append(fascia);
    gFunnel.append(testoSvg({ x: centroX, y: y1 + 27, "text-anchor": "middle", "font-size": 13, "font-weight": 800, fill: "#17203b" }, st.nome));
    const leadTesto = testoSvg({ x: centroX, y: y1 + 44, "text-anchor": "middle", "font-size": 10.5, fill: "#5b6684" }, "");
    gFunnel.append(leadTesto);
    const yc = y1 + F.altezza / 2 - 2;
    // aggancio dell'agente
    gLato.append(svgEl("path", { d: `M${centroX + w1 / 2 - 6},${yc} L${372},${yc}`, stroke: "#d6dcea", "stroke-width": 2, "stroke-dasharray": "3 4" }));
    const agente = svgEl("g", { class: "agente-stadio", transform: `translate(392,${yc})`, tabindex: "0", role: "button", "aria-label": riempi(T.apri_scheda, { stadio: st.nome }) });
    const disco = svgEl("circle", { r: 18, fill: "#fff", stroke: COLORI_STADIO[i % COLORI_STADIO.length], "stroke-width": 2.5, filter: "url(#fc-ombra)" });
    agente.append(disco, svgEl("g", { color: COLORI_STADIO[i % COLORI_STADIO.length] }, ICONA_AGENTE));
    const apri = () => cambia({ stadio_aperto: st.id }, true);
    agente.addEventListener("click", apri);
    agente.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(); } });
    gLato.append(agente);
    const lucchetto = svgEl("g", { transform: `translate(428,${yc})`, color: "#d97706", opacity: 0, style: "cursor:pointer" }, ICONA_LUCCHETTO);
    lucchetto.addEventListener("click", () => { if (s.modalita === "decidi") cambia({ lucchetti: { ...s.lucchetti, [st.id]: !s.lucchetti[st.id] } }); });
    gLato.append(lucchetto);
    gLato.append(svgEl("rect", { x: BARRA.x, y: yc - 9, width: BARRA.w, height: 18, rx: 9, fill: "#eef1f8" }));
    const barra = svgEl("rect", { x: BARRA.x, y: yc - 9, width: 0, height: 18, rx: 9, fill: "#10b981" });
    const ore = testoSvg({ x: BARRA.x + BARRA.w + 8, y: yc + 4, "font-size": 11.5, "font-weight": 800, fill: "#047857" }, "");
    gLato.append(barra, ore);
    RIGHE[st.id] = { disco, lucchetto, barra, ore, leadTesto, yc, y1, i };
  });
  scena.append(svg);

  // ------------------------------------------------ scheda (destra)
  const destra = el("aside", { class: "pannello destra" });
  const scheda = el("div", { class: "scheda-stadio", "aria-live": "polite" });
  const totale = el("div", { class: "totale", "aria-live": "polite" });
  const zonaVerifica = el("div", { class: "verifica", "aria-live": "polite" });
  destra.append(el("h3", {}, E.titolo_scheda), scheda, totale, zonaVerifica);

  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  // ------------------------------------------------ pallini che scendono (deterministici)
  let punti = [];
  function preparaPunti() {
    gPunti.replaceChildren();
    const quanti = Math.max(P.punti_minimi, Math.round(P.punti_massimi * (s.volume / sc.volume.max)));
    const rnd = mulberry32(s.volume * 7919 + 17);
    punti = [];
    for (let k = 0; k < quanti; k++) {
      const caso = rnd();
      let fine = 0;
      for (let j = 0; j < sc.stadi.length; j++) if (caso < Math.sqrt(sc.stadi[j].quota_volume)) fine = j;
      const c = svgEl("circle", { r: 3.6, fill: COLORI_STADIO[fine % COLORI_STADIO.length], opacity: 0 });
      gPunti.append(c);
      punti.push({ c, fase: rnd(), lato: rnd() * 2 - 1, fine, velocita: P.velocita_punti * (0.8 + rnd() * 0.4) });
    }
  }
  function animaPunti() {
    const gen = generazione;
    const t0 = performance.now();
    const frame = (ora) => {
      if (gen !== generazione) return;
      const t = (ora - t0) / 1000;
      for (const p of punti) {
        const yFine = F.y0 + (p.fine + 1) * F.altezza - 8;
        const corsa = yFine - F.y0;
        const y = F.y0 + 6 + (((t * p.velocita + p.fase * corsa) % corsa) + corsa) % corsa;
        const w = larghezzaA(y) - 24;
        p.c.setAttribute("cx", String(centroX + p.lato * w / 2));
        p.c.setAttribute("cy", String(y));
        const vicino = (yFine - y) / F.altezza;
        p.c.setAttribute("opacity", String(Math.max(0, Math.min(0.9, vicino * 1.4))));
      }
      requestAnimationFrame(frame);
    };
    if (ridotto) {
      for (const p of punti) {
        const y = F.y0 + 10 + p.fase * ((p.fine + 1) * F.altezza - 20);
        p.c.setAttribute("cx", String(centroX + p.lato * (larghezzaA(y) - 24) / 2));
        p.c.setAttribute("cy", String(y));
        p.c.setAttribute("opacity", "0.8");
      }
      return;
    }
    requestAnimationFrame(frame);
  }

  // ------------------------------------------------ disegno dei valori
  function disegnaValori() {
    const vecchio = precedente;
    calc = calcola(sc, s);
    precedente = calc;
    const scala = Math.max(P.ore_scala_minima, calc.massimo);
    for (const x of calc.stadi) {
      const R = RIGHE[x.id];
      R.leadTesto.textContent = riempi(T.lead_al_giorno, { n: x.lead });
      const da = vecchio ? Number(R.barra.getAttribute("width")) : 0;
      const a = (x.ore / scala) * BARRA.w;
      R.barra.setAttribute("fill", x.lucchetto ? "url(#fc-righe)" : "#10b981");
      R.ore.textContent = riempi(T.ore_al_giorno, { ore: x.ore.toLocaleString(lingua) });
      if (ridotto) R.barra.setAttribute("width", String(a));
      else R.barra.animate([{ width: `${da}px` }, { width: `${a}px` }], { duration: durata(P.ms_barre), easing: "cubic-bezier(.2,.8,.2,1)", fill: "forwards" });
      R.barra.setAttribute("width", String(a));
      const eraChiuso = vecchio ? vecchio.stadi.find((y) => y.id === x.id).lucchetto : false;
      R.lucchetto.setAttribute("opacity", x.lucchetto ? "1" : s.modalita === "decidi" ? "0.22" : "0");
      if (x.lucchetto && !eraChiuso) R.lucchetto.animate([{ transform: `translate(428px,${R.yc}px) scale(.2)` }, { transform: `translate(428px,${R.yc}px) scale(1.3)` }, { transform: `translate(428px,${R.yc}px) scale(1)` }], { duration: durata(420), easing: "ease-out" });
      R.disco.setAttribute("stroke-width", x.id === s.stadio_aperto ? "4.5" : "2.5");
    }
    totale.replaceChildren(el("div", {}, E.totale), el("b", {}, riempi(T.totale, { ore: calc.totale.toLocaleString(lingua), persone: calc.persone.toLocaleString(lingua) })),
      s.dati_puliti ? null : el("div", { style: "margin-top:6px;color:#9f1239" }, T.avviso_dati_sporchi));
  }

  function disegnaScheda() {
    const st = sc.stadi.find((x) => x.id === s.stadio_aperto);
    const x = calc.stadi.find((y) => y.id === st.id);
    const serve = x.consigliato;
    scheda.replaceChildren(
      el("div", { class: "titolo" }, st.nome),
      el("div", { class: "sigla" }, st.spiega),
      el("dl", {},
        el("dt", {}, E.compito), el("dd", {}, st.compito),
        el("dt", {}, E.input), el("dd", {}, st.input),
        el("dt", {}, E.output), el("dd", {}, st.output),
        el("dt", {}, E.controllo_umano), el("dd", {}, el("span", { class: `controllo ${serve ? "si" : "no"}` }, serve ? E.si : E.no)),
        el("dt", {}, E.attenzione), el("dd", {}, st.cautela)));
    scheda.animate([{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }], { duration: durata(300) });
  }

  function disegnaVerifica() {
    if (s.modalita !== "decidi" || !s.verificato) { zonaVerifica.replaceChildren(); return; }
    const v = verifica(sc, s);
    zonaVerifica.replaceChildren(
      el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
      ...v.righe.map((r) => el("div", { class: `riga ${r.classe}` }, r.testo)));
  }

  function aggiornaComandi() {
    cVol.imposta(s.volume);
    cCosto.imposta(s.costo_errore);
    iDati.checked = s.dati_puliti;
    segModo.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.modalita)));
    notaModo.textContent = s.modalita === "auto" ? riempi(T.nota_auto, { soglia: P.soglia_lucchetto }) : T.nota_decidi;
    zonaDecidi.classList.toggle("nascosto", s.modalita !== "decidi");
    for (const [id, input] of Object.entries(interruttoriLucchetto)) input.checked = Boolean(s.lucchetti[id]);
  }

  // ------------------------------------------------ interazioni
  function cambia(diff, soloScheda) {
    const volumeCambiato = "volume" in diff && diff.volume !== s.volume;
    Object.assign(s, diff);
    if (!soloScheda && !("verificato" in diff)) s.verificato = false;
    aggiornaComandi();
    disegnaValori();
    disegnaScheda();
    disegnaVerifica();
    if (volumeCambiato) { generazione += 1; preparaPunti(); animaPunti(); }
  }
  function controlla() {
    s.verificato = true;
    disegnaVerifica();
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) {
      if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    }
    const nuovo = { ...s, ...(stato || {}) };
    nuovo.lucchetti = { ...Object.fromEntries(sc.stadi.map((x) => [x.id, false])), ...(nuovo.lucchetti || {}) };
    for (const k of Object.keys(nuovo.lucchetti)) if (!sc.stadi.some((x) => x.id === k)) throw new Error(`stato_animazione: stadio sconosciuto «${k}»`);
    if (!sc.stadi.some((x) => x.id === nuovo.stadio_aperto)) throw new Error(`stato_animazione: stadio_aperto sconosciuto «${nuovo.stadio_aperto}»`);
    Object.assign(s, nuovo);
    precedente = null;
    generazione += 1;
    aggiornaComandi();
    disegnaValori();
    disegnaScheda();
    disegnaVerifica();
    preparaPunti();
    animaPunti();
  }

  applica({});
  return {
    applica,
    distruggi() { generazione += 1; },
    _prova: { stato: s, calcola: () => calcola(sc, s), verifica: () => verifica(sc, s) },
  };
}
