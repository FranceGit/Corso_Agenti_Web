// Lezione interattiva "Dal chatbot all'agente": la stessa richiesta entra in due corsie.
// A sinistra il chatbot scrive un testo e si ferma; a destra l'agente fissa l'obiettivo, usa gli strumenti
// (CRM, email, calendario), raccoglie osservazioni e prepara proposte che lo studente approva o scarta.
// Tutti i testi e i numeri arrivano dallo scenario della lezione (API protetta).

const NS = "http://www.w3.org/2000/svg";
const COMP = "chatbot_agente";
const CENTRO = { x: 180, y: 128 };
const POS = { crm: { x: 180, y: 34 }, email: { x: 312, y: 196 }, calendario: { x: 48, y: 196 } };
const COLORE = { crm: "#0ea5e9", email: "#f59e0b", calendario: "#10b981", agente: "#4f46e5", chatbot: "#64748b" };
const ICONE = {
  crm: '<ellipse cx="0" cy="-8" rx="10" ry="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-10,-8 v14 c0,5 20,5 20,0 v-14 M-10,-1 c0,5 20,5 20,0" fill="none" stroke="currentColor" stroke-width="2"/>',
  email: '<rect x="-11" y="-8" width="22" height="16" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-10,-6 L0,2 L10,-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  calendario: '<rect x="-10" y="-8" width="20" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M-10,-2 h20 M-5,-11 v5 M5,-11 v5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="3" cy="4" r="2" fill="currentColor"/>',
  bolla: '<path d="M-10,-8 h20 a3,3 0 0 1 3,3 v10 a3,3 0 0 1 -3,3 h-12 l-6,5 v-5 h-2 a3,3 0 0 1 -3,-3 v-10 a3,3 0 0 1 3,-3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',
  bersaglio: '<circle r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><circle r="1.5" fill="currentColor"/>',
};
const STILE = `
.lz-chatbot_agente .richiesta-card{background:#fff;border:1.5px solid var(--bordo);border-radius:12px;padding:10px 14px;font-weight:600;box-shadow:var(--ombra);text-align:center;margin:4px auto 10px;max-width:520px}
.lz-chatbot_agente .corsie{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:10px}
.lz-chatbot_agente .corsia{background:#fff;border:1px solid var(--bordo);border-radius:12px;padding:10px;min-height:300px;display:flex;flex-direction:column;gap:8px;position:relative}
.lz-chatbot_agente .corsia h5{margin:0;font-size:.82rem;display:flex;align-items:center;gap:8px}
.lz-chatbot_agente .corsia h5 small{font-weight:500;color:var(--tenue)}
.lz-chatbot_agente .corsia h5 svg{width:22px;height:22px}
.lz-chatbot_agente .fumetto{background:#f1f5f9;border-radius:14px 14px 14px 4px;padding:10px 12px;font-size:.88rem;line-height:1.45}
.lz-chatbot_agente .fumetto.agente{background:var(--primario-chiaro)}
.lz-chatbot_agente .attesa{color:var(--tenue-2);font-size:.84rem}
.lz-chatbot_agente .nota{font-size:.78rem;color:var(--tenue)}
.lz-chatbot_agente .contatore{position:absolute;top:8px;right:10px;font-size:.74rem;font-weight:800;padding:.2em .7em;border-radius:999px;background:var(--sfondo-2);color:var(--tenue)}
.lz-chatbot_agente .contatore.agente{background:var(--primario-chiaro);color:var(--primario)}
.lz-chatbot_agente .obiettivo{display:flex;gap:8px;align-items:center;background:#fff7e6;border:1px solid #fde3b0;border-radius:10px;padding:6px 10px;font-size:.82rem;font-weight:600}
.lz-chatbot_agente .obiettivo svg{width:20px;height:20px;flex:0 0 auto;color:var(--avviso)}
.lz-chatbot_agente .proposta{display:grid;grid-template-columns:1fr auto;gap:6px;align-items:center;border:1px solid var(--bordo);border-radius:10px;padding:7px 9px;font-size:.82rem;background:var(--superficie-2);animation:entra .35s ease}
.lz-chatbot_agente .proposta .azioni{display:flex;gap:4px}
.lz-chatbot_agente .proposta .btn{padding:.3em .6em;font-size:.76rem}
.lz-chatbot_agente .proposta.giusta{border-color:var(--ok);background:var(--ok-chiaro)}
.lz-chatbot_agente .proposta.sbagliata{border-color:var(--male);background:var(--male-chiaro)}
.lz-chatbot_agente .proposta .spiega{grid-column:1/-1;font-size:.78rem}
.lz-chatbot_agente .proposta.sbagliata .spiega{color:#9f1239}
.lz-chatbot_agente .proposta.giusta .spiega{color:#166534}
@media (max-width:960px){.lz-chatbot_agente .corsie{grid-template-columns:1fr}}
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
function inietta(id, css) {
  if (document.getElementById(id)) return;
  document.head.append(el("style", { id }, css));
}
const attendi = (ms) => new Promise((ok) => setTimeout(ok, ms));
const morbido = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

// ------------------------------------------------------------------ logica (pura)

export function confronta(sc, s) {
  const T = sc.testi;
  const tx = (k, v) => riempi(T[k], v || {});
  const r = sc.richieste.find((x) => x.id === s.richiesta);
  if (!r) throw new Error(`richiesta sconosciuta: ${s.richiesta}`);
  const chatbot = { passi: 1, testo: r.chatbot };
  const eventi = [];
  let proposte = [];
  let esito;
  if (r.tipo === "testo") {
    eventi.push({ tipo: "obiettivo", testo: tx("obiettivo_testo", { richiesta: r.nome }) });
    eventi.push({ tipo: "ragiona", testo: tx("rag_solo_testo") });
    eventi.push({ tipo: "scrive", testo: r.agente });
    esito = { tipo: "neutro", testo: tx("esito_testo") };
  } else if (!s.strumenti) {
    eventi.push({ tipo: "obiettivo", testo: tx("obiettivo_testo", { richiesta: r.obiettivo }) });
    eventi.push({ tipo: "ragiona", testo: tx("rag_senza_strumenti") });
    eventi.push({ tipo: "scrive", testo: r.senza_strumenti });
    esito = { tipo: "avviso", testo: tx("esito_senza_strumenti") };
  } else {
    eventi.push({ tipo: "obiettivo", testo: tx("obiettivo_testo", { richiesta: r.obiettivo }) });
    eventi.push({ tipo: "ragiona", testo: tx("rag_inizio") });
    for (const p of r.passi) {
      if (!sc.strumenti.some((x) => x.id === p.strumento)) throw new Error(`strumento sconosciuto: ${p.strumento}`);
      eventi.push({ tipo: "chiamata", strumento: p.strumento, testo: p.azione });
      eventi.push({ tipo: "osservazione", strumento: p.strumento, testo: p.osservazione, fatto: p.fatto });
    }
    eventi.push({ tipo: "proposte", testo: tx("proposte_pronte") });
    proposte = r.proposte.map((p) => ({ testo: p.testo, giusta: p.giusta, spiegazione: p.spiegazione }));
    esito = { tipo: "ok", testo: r.esito };
  }
  const passi = eventi.filter((e) => e.tipo === "chiamata" || e.tipo === "scrive" || e.tipo === "proposte").length;
  return { chatbot, eventi, proposte, esito, passi, richiesta: r };
}

export function valutaScelta(proposta, scelta) {
  if (scelta !== "approva" && scelta !== "scarta") throw new Error(`scelta non valida: ${scelta}`);
  return { giusta: proposta.giusta === scelta, spiegazione: proposta.spiegazione };
}

export function riepilogoScelte(sc, proposte, scelte) {
  const fatte = Object.keys(scelte).length;
  const giuste = Object.entries(scelte).filter(([i, v]) => proposte[Number(i)].giusta === v).length;
  const T = sc.testi;
  const base = riempi(T.decisioni, { fatte, totale: proposte.length, giuste });
  if (fatte < proposte.length) return { completo: false, testo: base };
  return { completo: true, tutte: giuste === proposte.length, testo: `${base} ${giuste === proposte.length ? T.tutte_giuste : T.qualche_errore}` };
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez) {
  inietta(`stile-${COMP}`, STILE);
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const tempi = sc.tempi;
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const s = { richiesta: sc.richieste[0].id, mostra_passi: false, strumenti: true };
  let piano = null, indice = 0, inRiproduzione = false, generazione = 0, occupato = false;
  let scelte = {};
  let velocita = tempi.velocita_iniziale;
  const durata = (ms) => (ridotto ? 1 : ms / velocita);

  // comandi
  const comandi = el("aside", { class: "pannello" });
  const segRich = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.richiesta });
  sc.richieste.forEach((r) => segRich.append(el("button", { "data-v": r.id, onclick: () => cambia({ richiesta: r.id }) }, r.nome)));
  const interruttore = (chiave, etichetta) => {
    const input = el("input", { type: "checkbox", onchange: (e) => cambia({ [chiave]: e.target.checked }) });
    return { nodo: el("label", { class: "interruttore" }, el("span", {}, etichetta), input), input };
  };
  const iPassi = interruttore("mostra_passi", E.mostra_passi);
  const iStr = interruttore("strumenti", E.strumenti);
  const avvisoCambio = el("div", { class: "avviso-cambio", "aria-live": "polite" });
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.richiesta), segRich, el("h4", {}, E.opzioni), iPassi.nodo, iStr.nodo, avvisoCambio);

  // scena
  const scena = el("div", { class: "scena" });
  const card = el("div", { class: "richiesta-card" });
  const icona = (k, colore) => `<svg viewBox="-16 -16 32 32" style="color:${colore}">${ICONE[k]}</svg>`;
  const contaBot = el("span", { class: "contatore" });
  const fumettoBot = el("div", {});
  const notaBot = el("div", { class: "nota" });
  const corsiaBot = el("div", { class: "corsia" }, contaBot,
    el("h5", { html: icona("bolla", COLORE.chatbot) }, el("span", {}, E.chatbot, " ", el("small", {}, E.chatbot_breve))), fumettoBot, notaBot);
  const contaAg = el("span", { class: "contatore agente" });
  const obiettivo = el("div", { class: "obiettivo nascosto", html: icona("bersaglio", COLORE.agente) });
  const obiettivoTesto = el("span", {});
  obiettivo.append(obiettivoTesto);
  const svg = svgEl("svg", { viewBox: "0 0 360 236", role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs><radialGradient id="cba-nucleo" cx="40%" cy="35%"><stop offset="0" stop-color="#818cf8"/><stop offset=".6" stop-color="#6366f1"/><stop offset="1" stop-color="#4338ca"/></radialGradient>
    <radialGradient id="cba-spento" cx="40%" cy="35%"><stop offset="0" stop-color="#cbd5e1"/><stop offset="1" stop-color="#64748b"/></radialGradient>
    <filter id="cba-ombra" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#17203b" flood-opacity=".15"/></filter></defs>`;
  const NODI = {};
  for (const st of sc.strumenti) {
    const p = POS[st.id];
    if (!p) throw new Error(`posizione mancante per lo strumento ${st.id}`);
    const linea = svgEl("line", { x1: CENTRO.x, y1: CENTRO.y, x2: p.x, y2: p.y, stroke: "#d6dcea", "stroke-width": 2, "stroke-dasharray": "5 6" });
    svg.append(linea);
    const g = svgEl("g", { transform: `translate(${p.x},${p.y})`, filter: "url(#cba-ombra)" });
    const disco = svgEl("circle", { r: 24, fill: "#fff", stroke: "#dde3f0", "stroke-width": 2 });
    const ic = svgEl("g", { color: "#64748b" }, ICONE[st.id]);
    const nome = svgEl("text", { y: 38, "text-anchor": "middle", "font-size": 11, "font-weight": 700, fill: "#17203b" });
    nome.textContent = st.nome;
    g.append(disco, ic, nome);
    svg.append(g);
    NODI[st.id] = { g, disco, ic, linea, p };
  }
  const nucleo = svgEl("circle", { cx: CENTRO.x, cy: CENTRO.y, r: 38, fill: "url(#cba-nucleo)", filter: "url(#cba-ombra)" });
  const testoNucleo = svgEl("text", { x: CENTRO.x, y: CENTRO.y + 4, "text-anchor": "middle", "font-size": 12, "font-weight": 900, fill: "#fff", "letter-spacing": "1.2" });
  testoNucleo.textContent = E.agente_centro;
  const sottoNucleo = svgEl("text", { x: CENTRO.x, y: CENTRO.y + 56, "text-anchor": "middle", "font-size": 10.5, "font-weight": 700, fill: "#e11d48", opacity: 0 });
  sottoNucleo.textContent = `— ${E.nessuno_strumento} —`;
  const pacchetto = svgEl("g", { opacity: 0 });
  pacchetto.append(svgEl("rect", { x: -10, y: -7, width: 20, height: 14, rx: 4, fill: COLORE.agente }), svgEl("path", { d: "M-6,-2 L0,2 L6,-2", fill: "none", stroke: "#fff", "stroke-width": 2 }));
  svg.append(nucleo, testoNucleo, sottoNucleo, pacchetto);
  const fumettoAg = el("div", {});
  const elencoProposte = el("div", { style: "display:grid;gap:6px" });
  const corsiaAg = el("div", { class: "corsia" }, contaAg,
    el("h5", { html: icona("bersaglio", COLORE.agente) }, el("span", {}, E.agente, " ", el("small", {}, E.agente_breve))), obiettivo, svg, fumettoAg, elencoProposte);
  const btnAvvia = el("button", { class: "btn btn-primario", onclick: () => (inRiproduzione ? pausa() : riproduci()) });
  const btnPasso = el("button", { class: "btn", onclick: () => passoSingolo() }, E.passo);
  const btnCapo = el("button", { class: "btn", onclick: () => reimposta() }, E.ricomincia);
  const vel = el("input", { type: "range", min: tempi.velocita_min, max: tempi.velocita_max, step: 0.25, value: velocita, "aria-label": E.velocita, oninput: (e) => { velocita = Number(e.target.value); } });
  scena.append(card, el("div", { class: "corsie" }, corsiaBot, corsiaAg),
    el("div", { class: "barra-riproduzione" }, btnAvvia, btnPasso, btnCapo, el("label", { class: "velocita" }, E.velocita, vel)));

  // destra
  const destra = el("aside", { class: "pannello destra" });
  const fatti = el("div", { class: "fatti" });
  const diario = el("div", { class: "diario", "aria-live": "polite" });
  const esitoBox = el("div", {});
  const riepilogoBox = el("div", { style: "margin-top:10px" });
  destra.append(el("h3", {}, E.osservazioni), fatti, el("h3", { style: "margin-top:14px" }, E.diario), diario, el("div", { style: "margin-top:12px" }, esitoBox), riepilogoBox);

  radice.replaceChildren(el("div", { class: `banco lz-${COMP}` }, comandi, scena, destra));

  function aggiornaComandi() {
    segRich.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.richiesta)));
    iPassi.input.checked = s.mostra_passi;
    iStr.input.checked = s.strumenti;
    btnAvvia.textContent = inRiproduzione ? E.pausa : E.avvia;
  }
  function cambia(diff) {
    Object.assign(s, diff);
    avvisoCambio.textContent = E.cambiato;
    reimposta();
    riproduci();
  }

  function tween(ms, passo) {
    const gen = generazione;
    return new Promise((ok) => {
      const t0 = performance.now();
      const frame = (ora) => {
        if (gen !== generazione) return ok(false);
        const x = Math.min(1, (ora - t0) / ms);
        passo(morbido(x));
        if (x < 1) requestAnimationFrame(frame); else ok(true);
      };
      requestAnimationFrame(frame);
    });
  }

  function aggiornaContatori(passiAgente) {
    const vis = s.mostra_passi;
    contaBot.classList.toggle("nascosto", !vis);
    contaAg.classList.toggle("nascosto", !vis);
    contaBot.textContent = T.passo_conteggio;
    contaAg.textContent = passiAgente === 1 ? T.passo_conteggio : riempi(T.passi_conteggio, { n: passiAgente });
  }
  let passiFatti = 0;

  async function viaggio(strumento) {
    const N = NODI[strumento];
    N.linea.setAttribute("stroke", COLORE[strumento]);
    N.linea.setAttribute("stroke-width", "3");
    N.disco.setAttribute("stroke", COLORE[strumento]);
    N.ic.setAttribute("color", COLORE[strumento]);
    pacchetto.setAttribute("opacity", "1");
    pacchetto.querySelector("rect").setAttribute("fill", COLORE.agente);
    let ok = await tween(durata(tempi.ms_viaggio), (x) => pacchetto.setAttribute("transform", `translate(${CENTRO.x + (N.p.x - CENTRO.x) * x},${CENTRO.y + (N.p.y - CENTRO.y) * x})`));
    if (!ok) return false;
    N.g.animate([{ transform: `translate(${N.p.x}px,${N.p.y}px) scale(1)` }, { transform: `translate(${N.p.x}px,${N.p.y}px) scale(1.15)` }, { transform: `translate(${N.p.x}px,${N.p.y}px) scale(1)` }], { duration: durata(380) });
    pacchetto.querySelector("rect").setAttribute("fill", COLORE[strumento]);
    ok = await tween(durata(tempi.ms_viaggio), (x) => pacchetto.setAttribute("transform", `translate(${N.p.x + (CENTRO.x - N.p.x) * x},${N.p.y + (CENTRO.y - N.p.y) * x})`));
    pacchetto.setAttribute("opacity", "0");
    N.linea.setAttribute("stroke", "#d6dcea");
    N.linea.setAttribute("stroke-width", "2");
    N.disco.setAttribute("stroke", "#dde3f0");
    N.ic.setAttribute("color", "#64748b");
    return ok;
  }

  function voce(chi, colore, testo) {
    const v = el("div", { class: "voce-diario" },
      el("div", { class: "chip", style: `background:${colore}`, html: `<svg viewBox="-16 -16 32 32" style="color:#fff">${ICONE[chi] || ICONE.bersaglio}</svg>` }),
      el("div", {}, el("div", { class: "testo" }, testo)));
    const vuoto = diario.querySelector(".vuoto");
    if (vuoto) vuoto.remove();
    diario.append(v);
    diario.scrollTop = diario.scrollHeight;
  }

  async function eseguiEvento(ev) {
    const gen = generazione;
    if (ev.tipo === "obiettivo") {
      card.animate([{ transform: "translateY(-24px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: durata(tempi.ms_caduta), easing: "cubic-bezier(.2,.8,.2,1)" });
      // il chatbot risponde subito, in un solo passo
      fumettoBot.replaceChildren(el("div", { class: "fumetto" }, piano.chatbot.testo));
      notaBot.textContent = T.chatbot_fine;
      obiettivo.classList.remove("nascosto");
      obiettivoTesto.textContent = ev.testo;
      obiettivo.animate([{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "none" }], { duration: durata(400) });
      voce("bersaglio", COLORE.agente, ev.testo);
      return true;
    }
    if (ev.tipo === "ragiona") { voce("bersaglio", "#8b5cf6", ev.testo); return true; }
    if (ev.tipo === "chiamata") {
      voce(ev.strumento, COLORE[ev.strumento], ev.testo);
      passiFatti += 1; aggiornaContatori(passiFatti);
      return viaggio(ev.strumento);
    }
    if (ev.tipo === "osservazione") {
      if (gen !== generazione) return false;
      voce(ev.strumento, "#10b981", ev.testo);
      const vuoto = fatti.querySelector(".vuoto");
      if (vuoto) vuoto.remove();
      fatti.append(el("span", {}, ev.fatto));
      return true;
    }
    if (ev.tipo === "scrive") {
      passiFatti += 1; aggiornaContatori(passiFatti);
      voce("bolla", COLORE.agente, ev.testo);
      fumettoAg.replaceChildren(el("div", { class: "fumetto agente" }, ev.testo));
      return true;
    }
    if (ev.tipo === "proposte") {
      passiFatti += 1; aggiornaContatori(passiFatti);
      voce("bolla", COLORE.agente, ev.testo);
      disegnaProposte();
      return true;
    }
    throw new Error(`evento sconosciuto: ${ev.tipo}`);
  }

  function disegnaProposte() {
    elencoProposte.replaceChildren(el("div", { class: "nota" }, E.proposte));
    piano.proposte.forEach((p, i) => {
      const riga = el("div", { class: "proposta" }, el("span", {}, p.testo));
      const azioni = el("div", { class: "azioni" },
        el("button", { class: "btn", onclick: () => scegli(i, "approva", riga) }, E.approva),
        el("button", { class: "btn", onclick: () => scegli(i, "scarta", riga) }, E.scarta));
      riga.append(azioni);
      elencoProposte.append(riga);
    });
  }

  function scegli(i, scelta, riga) {
    const v = valutaScelta(piano.proposte[i], scelta);
    scelte[i] = scelta;
    riga.className = `proposta ${v.giusta ? "giusta" : "sbagliata"}`;
    riga.querySelector(".azioni").replaceChildren(el("b", {}, scelta === "approva" ? E.approvata : E.scartata));
    const vecchia = riga.querySelector(".spiega");
    if (vecchia) vecchia.remove();
    riga.append(el("div", { class: "spiega" }, v.spiegazione));
    if (!v.giusta) riga.animate([{ transform: "translateX(0)" }, { transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }], { duration: durata(360) });
    const r = riepilogoScelte(sc, piano.proposte, scelte);
    riepilogoBox.replaceChildren(el("div", { class: `esito-scheda ${r.completo ? (r.tutte ? "ok" : "avviso") : "neutro"}` }, el("div", {}, r.testo)));
  }

  function mostraEsito() {
    const e = piano.esito;
    esitoBox.replaceChildren(el("div", { class: `esito-scheda ${e.tipo}` }, el("div", {}, el("div", { style: "font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;opacity:.8" }, E.esito), e.testo)));
  }

  async function riproduci() {
    if (!piano) return;
    if (indice >= piano.eventi.length) reimposta();
    inRiproduzione = true;
    aggiornaComandi();
    const gen = generazione;
    while (inRiproduzione && gen === generazione && indice < piano.eventi.length) {
      const ev = piano.eventi[indice];
      indice += 1;
      if (!(await eseguiEvento(ev))) return;
      if (indice >= piano.eventi.length) break;
      await attendi(durata(tempi.ms_per_fase - tempi.ms_viaggio));
    }
    if (gen !== generazione) return;
    if (indice >= piano.eventi.length) mostraEsito();
    inRiproduzione = false;
    aggiornaComandi();
  }
  function pausa() { inRiproduzione = false; aggiornaComandi(); }
  async function passoSingolo() {
    if (!piano || occupato) return;
    inRiproduzione = false;
    aggiornaComandi();
    if (indice >= piano.eventi.length) reimposta();
    occupato = true;
    const ev = piano.eventi[indice];
    indice += 1;
    const ok = await eseguiEvento(ev);
    occupato = false;
    if (ok && indice >= piano.eventi.length) mostraEsito();
  }

  function reimposta() {
    generazione += 1;
    inRiproduzione = false;
    occupato = false;
    piano = confronta(sc, s);
    indice = 0;
    passiFatti = 0;
    scelte = {};
    card.textContent = piano.richiesta.testo;
    fumettoBot.replaceChildren(el("div", { class: "attesa" }, E.in_attesa));
    notaBot.textContent = "";
    fumettoAg.replaceChildren();
    elencoProposte.replaceChildren();
    obiettivo.classList.add("nascosto");
    pacchetto.setAttribute("opacity", "0");
    const senza = piano.richiesta.tipo === "azione" && !s.strumenti;
    for (const N of Object.values(NODI)) { N.g.setAttribute("opacity", s.strumenti ? "1" : "0.25"); N.linea.setAttribute("opacity", s.strumenti ? "1" : "0.2"); }
    nucleo.setAttribute("fill", s.strumenti ? "url(#cba-nucleo)" : "url(#cba-spento)");
    sottoNucleo.setAttribute("opacity", s.strumenti ? "0" : "1");
    if (senza) nucleo.animate([{ transform: "scale(1)" }, { transform: "scale(1.04)" }, { transform: "scale(1)" }], { duration: durata(500) });
    aggiornaContatori(0);
    diario.replaceChildren(el("div", { class: "vuoto" }, E.vuoto));
    fatti.replaceChildren(el("span", { class: "vuoto" }, E.nessun_fatto));
    esitoBox.replaceChildren();
    riepilogoBox.replaceChildren();
    aggiornaComandi();
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    Object.assign(s, stato || {});
    avvisoCambio.textContent = "";
    reimposta();
  }

  reimposta();
  return {
    applica,
    distruggi() { generazione += 1; inRiproduzione = false; },
    _prova: { confronta: () => confronta(sc, s), stato: s },
  };
}
