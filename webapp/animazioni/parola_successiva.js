// Lezione interattiva "Come funziona un LLM (quanto basta)": tre scene manipolabili.
// 1) la parola successiva: frase CRM a token, istogramma delle probabilita' che la temperatura rimodella,
//    5 generazioni riproducibili (PRNG con seme); 2) la finestra di contesto: l'email del cliente a token,
//    i piu' vecchi escono dalla finestra e la risposta sbaglia; 3) la data di conoscenza: i fatti CRM di oggi
//    vanno trascinati nel contesto perche' il modello li usi. Testi e numeri: dallo scenario della lezione.

const NS = "http://www.w3.org/2000/svg";
const COMP = "parola_successiva";
const COLORI_TOKEN = ["#e0e7ff", "#dcfce7", "#fef3c7", "#fce7f3", "#e0f2fe"];
const STILE = `
.lz-parola_successiva .schede-scena{margin-bottom:10px}
.lz-parola_successiva .frase{display:flex;flex-wrap:wrap;gap:3px;align-items:center;font-size:1.05rem;padding:10px 6px}
.lz-parola_successiva .tok{border-radius:6px;padding:.1em .3em;font-family:var(--mono);font-size:.86rem;border:1px solid rgba(0,0,0,.06);transition:opacity .35s,filter .35s,transform .35s,background .35s}
.lz-parola_successiva .buco{min-width:120px;border-bottom:2px dashed var(--primario);color:var(--primario);font-weight:700;padding:0 .3em}
.lz-parola_successiva .contatore{font-size:.8rem;color:var(--tenue);margin:0 6px 6px}
.lz-parola_successiva .generazioni{display:grid;gap:4px;margin-top:6px}
.lz-parola_successiva .generazioni div{font-size:.86rem;background:#fff;border:1px solid var(--bordo);border-radius:9px;padding:5px 10px;animation:entra .3s ease}
.lz-parola_successiva .generazioni b{color:var(--primario)}
.lz-parola_successiva .riquadro{background:#fff;border:1px solid var(--bordo);border-radius:12px;padding:10px;display:flex;flex-wrap:wrap;gap:3px;position:relative}
.lz-parola_successiva .tok.fuori{opacity:.18;filter:grayscale(1)}
.lz-parola_successiva .tok.chiave{background:#fde68a;border-color:#f59e0b}
.lz-parola_successiva .tok.letto{transform:translateY(-2px);box-shadow:0 0 0 2px var(--primario)}
.lz-parola_successiva .tok.dentro{outline:1.5px solid rgba(79,70,229,.35)}
.lz-parola_successiva .domanda{font-weight:600;font-size:.9rem;margin:10px 2px 6px}
.lz-parola_successiva .contesto{min-height:70px;border:2px dashed #a5b4fc;border-radius:12px;background:#f5f7ff;padding:8px;display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start;transition:background .2s,border-color .2s}
.lz-parola_successiva .contesto.sopra{background:#e0e7ff;border-color:var(--primario)}
.lz-parola_successiva .contesto .vuoto{color:var(--tenue-2);font-size:.84rem}
.lz-parola_successiva .fatto{display:inline-flex;gap:6px;align-items:center;background:#ecfdf5;border:1px solid #bbf0d6;color:#047857;border-radius:999px;padding:.25em .4em .25em .8em;font-size:.8rem;cursor:grab;animation:entra .3s ease}
.lz-parola_successiva .fatto .btn{padding:.15em .55em;font-size:.72rem}
.lz-parola_successiva .fatti-oggi{display:flex;flex-wrap:wrap;gap:6px;min-height:34px;margin:6px 0 10px}
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

// PRNG riproducibile: stesso seme, stessa sequenza.
export function mulberry32(seme) {
  let a = seme >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function semeDa(testo) {
  let h = 2166136261;
  for (let i = 0; i < testo.length; i++) { h ^= testo.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Tokenizzatore didattico: la punteggiatura e' un token a se', le parole lunghe si spezzano in pezzi.
export function tokenizza(testo, lunghezzaPezzo) {
  if (!(lunghezzaPezzo > 0)) throw new Error("token.lunghezza_pezzo non valido");
  const out = [];
  for (const parola of testo.split(/\s+/).filter(Boolean)) {
    for (const parte of parola.match(/[\p{L}\p{N}%']+|[^\p{L}\p{N}%'\s]/gu) || []) {
      if (/^[\p{L}\p{N}%']+$/u.test(parte)) {
        for (let i = 0; i < parte.length; i += lunghezzaPezzo) out.push(parte.slice(i, i + lunghezzaPezzo));
      } else out.push(parte);
    }
  }
  return out;
}

export function probabilita(sc, idFrase, temperatura) {
  const f = sc.frasi.find((x) => x.id === idFrase);
  if (!f) throw new Error(`frase sconosciuta: ${idFrase}`);
  const logit = f.candidati.map((c) => c.logit);
  if (temperatura <= sc.temperatura.soglia_sempre_prima) {
    const max = Math.max(...logit);
    const primo = logit.indexOf(max);
    return f.candidati.map((c, i) => ({ parola: c.parola, p: i === primo ? 1 : 0 }));
  }
  const m = Math.max(...logit);
  const e = logit.map((l) => Math.exp((l - m) / temperatura));
  const somma = e.reduce((a, b) => a + b, 0);
  return f.candidati.map((c, i) => ({ parola: c.parola, p: e[i] / somma }));
}

export function genera(sc, s) {
  const probs = probabilita(sc, s.frase, s.temperatura);
  const rng = mulberry32(semeDa(`${s.frase}|${s.temperatura.toFixed(2)}|${s.lancio}`));
  const scelte = [];
  for (let k = 0; k < sc.generazioni; k++) {
    const r = rng();
    let acc = 0, scelta = probs.length - 1;
    for (let i = 0; i < probs.length; i++) { acc += probs[i].p; if (r < acc) { scelta = i; break; } }
    scelte.push(scelta);
  }
  return { scelte, parole: scelte.map((i) => probs[i].parola), diverse: new Set(scelte).size, probs };
}

export function tokenFrase(sc, idFrase) {
  const f = sc.frasi.find((x) => x.id === idFrase);
  if (!f) throw new Error(`frase sconosciuta: ${idFrase}`);
  return tokenizza(f.testo, sc.token.lunghezza_pezzo);
}

export function finestraContesto(sc, s) {
  const F = sc.finestra;
  if (s.finestra < F.min || s.finestra > F.max) throw new Error(`finestra fuori dai limiti: ${s.finestra}`);
  const token = [];
  for (const parte of F.email) for (const t of tokenizza(parte.testo, sc.token.lunghezza_pezzo)) token.push({ t, chiave: parte.chiave });
  const inizio = Math.max(0, token.length - s.finestra);
  token.forEach((x, i) => { x.dentro = i >= inizio; });
  const chiavi = token.filter((x) => x.chiave);
  const dentro = chiavi.filter((x) => x.dentro).length;
  const stato = dentro === chiavi.length ? "dentro" : dentro === 0 ? "fuori" : "parziale";
  const ok = stato === "dentro";
  return { token, totale: token.length, stato, risposta: { tipo: ok ? "ok" : "male", testo: ok ? F.risposta_ok : F.risposta_ko } };
}

export function conoscenza(sc, s) {
  const ids = sc.cutoff.fatti.map((f) => f.id);
  for (const k of s.nel_contesto) if (!ids.includes(k)) throw new Error(`fatto sconosciuto: ${k}`);
  const chiave = [...new Set(s.nel_contesto)].sort().join("+");
  const r = sc.cutoff.risposte.find((x) => [...x.fatti].sort().join("+") === chiave);
  if (!r) throw new Error(`nessuna risposta per i fatti: ${chiave}`);
  return { risposta: { tipo: r.tipo, testo: r.testo }, dentro: [...new Set(s.nel_contesto)] };
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez) {
  inietta(`stile-${COMP}`, STILE);
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const tempi = sc.tempi;
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const durata = (ms) => (ridotto ? 1 : ms);
  const s = { scena: sc.scene[0].id, frase: sc.frasi[0].id, temperatura: 1, lancio: 0, finestra: sc.finestra.max, nel_contesto: [] };
  let generazione = 0;
  let ultimiP = null;
  let generato = false, chiesto = false;

  // ---------------- comandi
  const comandi = el("aside", { class: "pannello" });
  const segScena = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.scena });
  sc.scene.forEach((x) => segScena.append(el("button", { "data-v": x.id, onclick: () => cambia({ scena: x.id }) }, x.nome)));
  const segFrase = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.frase });
  sc.frasi.forEach((f) => segFrase.append(el("button", { "data-v": f.id, onclick: () => cambia({ frase: f.id, lancio: 0 }) }, f.nome)));
  const cursore = (chiave, conf, etichetta, formatta) => {
    const valore = el("b", {});
    const input = el("input", { type: "range", min: conf.min, max: conf.max, step: conf.passo, "aria-label": etichetta });
    input.addEventListener("input", () => { valore.textContent = formatta(Number(input.value)); cambia({ [chiave]: Number(input.value) }, true); });
    const nodo = el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, etichetta), valore), input);
    return { nodo, imposta: (v) => { input.value = v; valore.textContent = formatta(v); } };
  };
  const cTemp = cursore("temperatura", sc.temperatura, E.temperatura, (v) => v.toFixed(1));
  const cFin = cursore("finestra", sc.finestra, E.finestra, (v) => String(v));
  const btnGenera = el("button", { class: "btn btn-primario", onclick: () => { s.lancio += 1; generato = true; disegnaGenerazioni(true); } }, E.genera);
  const btnChiedi = el("button", { class: "btn btn-primario", onclick: () => { chiesto = true; leggiFinestra(); } }, E.chiedi);
  const gruppoParola = el("div", {}, el("h4", {}, E.frase), segFrase, cTemp.nodo, btnGenera);
  const gruppoFinestra = el("div", {}, cFin.nodo, btnChiedi);
  const gruppoCutoff = el("div", {});
  const avvisoCambio = el("div", { class: "avviso-cambio", "aria-live": "polite" });
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.scena), segScena, gruppoParola, gruppoFinestra, gruppoCutoff, avvisoCambio);

  // ---------------- scena
  const scena = el("div", { class: "scena" });
  // scena 1
  const frase = el("div", { class: "frase", "aria-live": "polite" });
  const contaToken = el("div", { class: "contatore" });
  const svgP = svgEl("svg", { viewBox: "0 0 620 250", role: "img", "aria-label": E.descrizione_parola });
  const titoloP = svgEl("text", { x: 10, y: 18, "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" });
  titoloP.textContent = E.probabilita.toUpperCase();
  svgP.append(titoloP);
  const BARRE = [];
  for (let i = 0; i < 6; i++) {
    const y = 34 + i * 35;
    const etichetta = svgEl("text", { x: 190, y: y + 17, "text-anchor": "end", "font-size": 13, fill: "#17203b" });
    const fondo = svgEl("rect", { x: 200, y: y + 3, width: 360, height: 22, rx: 6, fill: "#eef1f8" });
    const barra = svgEl("rect", { x: 200, y: y + 3, width: 0, height: 22, rx: 6, fill: "#6366f1" });
    const perc = svgEl("text", { x: 568, y: y + 19, "font-size": 12, "font-weight": 800, fill: "#17203b" });
    svgP.append(etichetta, fondo, barra, perc);
    BARRE.push({ etichetta, barra, perc });
  }
  const spiegaP = el("div", { class: "contatore" });
  const elencoGen = el("div", { class: "generazioni" });
  const diverseBox = el("div", { class: "contatore" });
  const pannelloParola = el("div", {}, frase, contaToken, svgP, spiegaP, el("h4", { style: "margin:8px 6px 0;font-size:.84rem" }, E.generazioni), diverseBox, elencoGen);
  // scena 2
  const domandaF = el("div", { class: "domanda" }, sc.finestra.domanda);
  const usoF = el("div", { class: "contatore" });
  const riquadro = el("div", { class: "riquadro" });
  const statoChiave = el("div", { class: "contatore" });
  const pannelloFinestra = el("div", {}, usoF, riquadro, statoChiave, domandaF);
  // scena 3
  const svgC = svgEl("svg", { viewBox: "0 0 620 130", role: "img", "aria-label": E.descrizione_cutoff });
  const XC = 360, XO = 590;
  svgC.innerHTML = `<rect x="20" y="40" width="${XC - 20}" height="36" rx="8" fill="#ede9fe"/><rect x="${XC}" y="40" width="${XO + 10 - XC}" height="36" rx="8" fill="#f1f5f9"/>
    <line x1="20" y1="58" x2="${XO + 10}" y2="58" stroke="#94a3b8" stroke-width="2"/>
    <line x1="${XC}" y1="26" x2="${XC}" y2="92" stroke="#8b5cf6" stroke-width="3" stroke-dasharray="6 5"/>
    <circle cx="${XO}" cy="58" r="8" fill="#e11d48"/>`;
  const tx = (x, y, testo, attr) => { const t = svgEl("text", { x, y, "font-size": 12, ...attr }); t.textContent = testo; svgC.append(t); return t; };
  tx(XC, 18, sc.cutoff.data_cutoff, { "text-anchor": "middle", "font-weight": 800, fill: "#7c3aed" });
  tx(XO, 108, sc.cutoff.data_oggi, { "text-anchor": "end", "font-weight": 800, fill: "#e11d48" });
  tx(30, 63, sc.cutoff.zona_nota, { fill: "#5b21b6", "font-weight": 700 });
  tx(XC + 12, 63, sc.cutoff.zona_ignota, { fill: "#5b6684", "font-weight": 700 });
  tx(30, 108, sc.cutoff.fatto_vecchio, { fill: "#5b6684", "font-size": 11 });
  const fattiOggi = el("div", { class: "fatti-oggi" });
  const contesto = el("div", { class: "contesto" });
  const domandaC = el("div", { class: "domanda" }, sc.cutoff.domanda);
  contesto.addEventListener("dragover", (e) => { e.preventDefault(); contesto.classList.add("sopra"); });
  contesto.addEventListener("dragleave", () => contesto.classList.remove("sopra"));
  contesto.addEventListener("drop", (e) => {
    e.preventDefault();
    contesto.classList.remove("sopra");
    const id = e.dataTransfer && e.dataTransfer.getData("text/plain");
    if (id && !s.nel_contesto.includes(id)) cambia({ nel_contesto: [...s.nel_contesto, id] });
  });
  const pannelloCutoff = el("div", {}, svgC, el("h4", { style: "margin:4px 4px;font-size:.84rem" }, E.fatti_oggi), fattiOggi,
    el("h4", { style: "margin:4px 4px;font-size:.84rem" }, E.contesto), contesto, domandaC);
  const schedeScena = el("div", { class: "segmentato schede-scena", role: "tablist" });
  sc.scene.forEach((x) => schedeScena.append(el("button", { "data-v": x.id, role: "tab", onclick: () => cambia({ scena: x.id }) }, x.nome)));
  scena.append(schedeScena, pannelloParola, pannelloFinestra, pannelloCutoff);

  // ---------------- destra
  const destra = el("aside", { class: "pannello destra" });
  const spiegazione = el("div", { style: "font-size:.88rem" });
  const esitoBox = el("div", { style: "margin-top:12px" });
  destra.append(el("h3", {}, E.vede), spiegazione, el("h3", { style: "margin-top:14px" }, E.risposta), esitoBox);

  radice.replaceChildren(el("div", { class: `banco lz-${COMP}` }, comandi, scena, destra));

  // ---------------- disegno
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
  const chipToken = (t, i, extra) => el("span", { class: `tok ${extra || ""}`, style: `background:${COLORI_TOKEN[i % COLORI_TOKEN.length]}` }, t);

  function disegnaParola() {
    const tok = tokenFrase(sc, s.frase);
    frase.replaceChildren(...tok.map((t, i) => chipToken(t, i)), el("span", { class: "buco" }, "…"));
    contaToken.textContent = riempi(T.conta_token, { n: tok.length });
    const probs = probabilita(sc, s.frase, s.temperatura);
    const da = ultimiP && ultimiP.length === probs.length ? ultimiP : probs.map(() => 0);
    probs.forEach((p, i) => { BARRE[i].etichetta.textContent = p.parola; });
    tween(durata(tempi.ms_barre), (x) => {
      probs.forEach((p, i) => {
        const v = da[i] + (p.p - da[i]) * x;
        BARRE[i].barra.setAttribute("width", String(360 * v));
        BARRE[i].perc.textContent = `${Math.round(v * 100)}%`;
      });
    });
    ultimiP = probs.map((p) => p.p);
    const max = Math.max(...probs.map((p) => p.p));
    spiegaP.textContent = s.temperatura <= sc.temperatura.soglia_sempre_prima ? T.spiega_zero
      : riempi(T.spiega_parola, { temperatura: s.temperatura.toFixed(1), percentuale: Math.round(max * 100) });
    spiegazione.textContent = spiegaP.textContent;
    disegnaGenerazioni(false);
  }

  async function disegnaGenerazioni(anima) {
    if (!generato) {
      elencoGen.replaceChildren(el("div", { class: "contatore" }, E.nessuna_generazione));
      diverseBox.textContent = "";
      esitoBox.replaceChildren();
      return;
    }
    const gen = generazione;
    const g = genera(sc, s);
    const testo = sc.frasi.find((f) => f.id === s.frase).testo;
    elencoGen.replaceChildren();
    for (let k = 0; k < g.parole.length; k++) {
      if (gen !== generazione) return;
      elencoGen.append(el("div", {}, `${testo} `, el("b", {}, g.parole[k])));
      if (anima) {
        const b = BARRE[g.scelte[k]].barra;
        b.animate([{ fill: "#6366f1" }, { fill: "#f59e0b" }, { fill: "#6366f1" }], { duration: durata(tempi.ms_generazione) });
        await attendi(durata(tempi.ms_generazione));
      }
    }
    if (gen !== generazione) return;
    diverseBox.textContent = riempi(T.diverse, { n: g.diverse, totale: g.parole.length });
    esitoBox.replaceChildren(el("div", { class: `esito-scheda ${g.diverse === 1 ? "ok" : "neutro"}` }, el("div", {}, diverseBox.textContent)));
  }

  function disegnaFinestra() {
    const f = finestraContesto(sc, s);
    riquadro.replaceChildren(...f.token.map((x, i) => chipToken(x.t, i, `${x.dentro ? "dentro" : "fuori"} ${x.chiave ? "chiave" : ""}`)));
    usoF.textContent = riempi(T.finestra_uso, { totale: f.totale, finestra: s.finestra });
    statoChiave.textContent = T[`chiave_${f.stato}`];
    spiegazione.textContent = statoChiave.textContent;
    if (chiesto) mostraRisposta(f.risposta);
    else esitoBox.replaceChildren(el("div", { class: "contatore" }, E.nessuna_risposta));
  }

  async function leggiFinestra() {
    const gen = generazione;
    const chips = [...riquadro.querySelectorAll(".tok.dentro")];
    for (const c of chips) {
      if (gen !== generazione) return;
      c.classList.add("letto");
      await attendi(durata(tempi.ms_lettura_token));
      c.classList.remove("letto");
    }
    if (gen !== generazione) return;
    mostraRisposta(finestraContesto(sc, s).risposta);
  }

  function mostraRisposta(r) {
    const scheda = el("div", { class: `esito-scheda ${r.tipo}` }, el("div", {}, r.testo));
    esitoBox.replaceChildren(scheda);
  }

  function disegnaCutoff() {
    const c = conoscenza(sc, s);
    fattiOggi.replaceChildren();
    contesto.replaceChildren();
    for (const f of sc.cutoff.fatti) {
      const dentro = c.dentro.includes(f.id);
      const chip = el("span", { class: "fatto", draggable: dentro ? "false" : "true" }, f.testo,
        el("button", { class: "btn", onclick: () => cambia({ nel_contesto: dentro ? s.nel_contesto.filter((x) => x !== f.id) : [...s.nel_contesto, f.id] }) }, dentro ? E.togli : E.metti));
      chip.addEventListener("dragstart", (e) => { if (e.dataTransfer) e.dataTransfer.setData("text/plain", f.id); });
      (dentro ? contesto : fattiOggi).append(chip);
    }
    if (!c.dentro.length) contesto.append(el("span", { class: "vuoto" }, T.contesto_vuoto));
    spiegazione.textContent = sc.cutoff.fatto_vecchio;
    mostraRisposta(c.risposta);
  }

  function disegna() {
    generazione += 1;
    segScena.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.scena)));
    schedeScena.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.scena)));
    segFrase.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.frase)));
    cTemp.imposta(s.temperatura);
    cFin.imposta(s.finestra);
    gruppoParola.classList.toggle("nascosto", s.scena !== "parola");
    pannelloParola.classList.toggle("nascosto", s.scena !== "parola");
    gruppoFinestra.classList.toggle("nascosto", s.scena !== "finestra");
    pannelloFinestra.classList.toggle("nascosto", s.scena !== "finestra");
    gruppoCutoff.classList.toggle("nascosto", s.scena !== "cutoff");
    pannelloCutoff.classList.toggle("nascosto", s.scena !== "cutoff");
    if (s.scena === "parola") disegnaParola();
    else if (s.scena === "finestra") disegnaFinestra();
    else if (s.scena === "cutoff") disegnaCutoff();
    else throw new Error(`scena sconosciuta: ${s.scena}`);
  }

  function cambia(diff, silenzioso) {
    if ("frase" in diff || "scena" in diff) { generato = false; chiesto = false; }
    Object.assign(s, diff);
    if (!silenzioso) avvisoCambio.textContent = E.cambiato;
    disegna();
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    Object.assign(s, stato || {});
    s.nel_contesto = [...s.nel_contesto];
    generato = false; chiesto = false; ultimiP = null;
    avvisoCambio.textContent = "";
    disegna();
  }

  disegna();
  return {
    applica,
    distruggi() { generazione += 1; },
    _prova: { genera: () => genera(sc, s), finestra: () => finestraContesto(sc, s), conoscenza: () => conoscenza(sc, s), stato: s },
  };
}
