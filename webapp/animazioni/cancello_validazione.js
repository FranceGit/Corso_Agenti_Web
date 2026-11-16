// Lezione interattiva "Output strutturati": lo stesso agente valuta un lead e scrive nel CRM.
// Senza formato esce una frase che si incastra al cancello di validazione; con il formato (schema) esce un
// blocco di dati che passa il cancello e compila da solo la scheda del CRM. Lo studente puo' rompere i dati
// e decidere se l'agente riprova con il messaggio d'errore o se il caso passa a una persona.
// Testi, schema, valori e tempi: dallo scenario della lezione.

const NS = "http://www.w3.org/2000/svg";
const COMP = "cancello_validazione";
const GUASTI_AMMESSI = ["nessuno", "fascia", "mancante", "testo", "fuori_scala"];
const P = { agente: { x: 84, y: 120 }, cancello: { x: 360, y: 120 }, crm: { x: 636, y: 120 } };
const COLORE = { agente: "#8b5cf6", ok: "#16a34a", male: "#e11d48", neutro: "#94a3b8", dati: "#4f46e5", frase: "#f59e0b", persona: "#d97706" };
const ICONE = {
  agente: '<rect x="-12" y="-10" width="24" height="20" rx="6" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="-5" cy="0" r="2.6" fill="currentColor"/><circle cx="5" cy="0" r="2.6" fill="currentColor"/><path d="M0,-10 v-5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><circle cx="0" cy="-16" r="2.2" fill="currentColor"/>',
  crm: '<ellipse cx="0" cy="-9" rx="12" ry="4.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M-12,-9 v17 c0,6 24,6 24,0 v-17 M-12,0 c0,6 24,6 24,0" fill="none" stroke="currentColor" stroke-width="2.2"/>',
  persona: '<circle cx="0" cy="-6" r="5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M-10,11 c0,-8 4,-11 10,-11 c6,0 10,3 10,11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  ok: '<path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  male: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
  avviso: '<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 8v5M12 16.5v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
};
const CHI_COLORE = { agente: "#8b5cf6", cancello: "#4f46e5", crm: "#10b981", persona: "#d97706" };
const STILE = `
.lz-cancello_validazione .schema-lista{display:grid;gap:5px;margin-top:6px}
.lz-cancello_validazione .schema-riga{font-size:.76rem;background:var(--superficie-2);border:1px solid var(--bordo);border-radius:9px;padding:5px 8px;transition:opacity .3s}
.lz-cancello_validazione .schema-riga b{font-family:var(--mono);font-size:.74rem;color:var(--primario)}
.lz-cancello_validazione .schema-riga small{display:block;color:var(--tenue)}
.lz-cancello_validazione .schema-spento .schema-riga{opacity:.35}
.lz-cancello_validazione .schema-nota{font-size:.76rem;color:var(--tenue-2);margin-top:4px}
.lz-cancello_validazione .sotto{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px;padding:8px 4px 4px}
.lz-cancello_validazione .riquadro{background:#fff;border:1px solid var(--bordo);border-radius:12px;padding:10px 12px;min-height:150px}
.lz-cancello_validazione .riquadro h5{margin:0 0 8px;font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;color:var(--tenue)}
.lz-cancello_validazione .fumetto{background:#fff7e6;border:1.5px solid #fde3b0;border-radius:14px 14px 14px 4px;padding:10px 12px;font-size:.88rem;animation:entra .35s ease}
.lz-cancello_validazione .coppia{display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;border:1.5px solid var(--bordo);border-radius:10px;padding:6px 8px;margin-bottom:6px;font-size:.84rem;animation:entra .35s ease;background:var(--superficie-2)}
.lz-cancello_validazione .coppia .k{font-weight:700;color:var(--inchiostro)}
.lz-cancello_validazione .coppia .v{overflow-wrap:anywhere}
.lz-cancello_validazione .coppia .tipo{font-size:.66rem;font-weight:800;padding:.15em .55em;border-radius:999px;background:var(--primario-chiaro);color:var(--primario);white-space:nowrap}
.lz-cancello_validazione .coppia.sbagliata{border-color:var(--male);background:var(--male-chiaro)}
.lz-cancello_validazione .coppia.sbagliata .v{color:#9f1239;font-weight:700}
.lz-cancello_validazione .coppia.assente .v{color:var(--male);font-style:italic}
.lz-cancello_validazione pre.grezzo{margin:0;font-family:var(--mono);font-size:.78rem;background:#0f172a;color:#e2e8f0;border-radius:10px;padding:10px;white-space:pre-wrap;overflow-wrap:anywhere}
.lz-cancello_validazione pre.grezzo .rosso{color:#fda4af;font-weight:700}
.lz-cancello_validazione .crm-testa{font-weight:800;font-size:.9rem}
.lz-cancello_validazione .crm-sotto{font-size:.74rem;color:var(--tenue);margin-bottom:8px}
.lz-cancello_validazione .campo-crm{display:grid;grid-template-columns:110px 1fr;gap:8px;align-items:center;margin-bottom:6px;font-size:.84rem}
.lz-cancello_validazione .campo-crm span{color:var(--tenue);font-size:.78rem}
.lz-cancello_validazione .campo-crm div{border:1.5px dashed var(--bordo);border-radius:8px;padding:4px 8px;min-height:28px;color:var(--tenue-2);transition:border-color .3s,background .3s,color .3s}
.lz-cancello_validazione .campo-crm div.pieno{border-style:solid;border-color:var(--ok);background:var(--ok-chiaro);color:#166534;font-weight:600}
.lz-cancello_validazione .campo-crm div.colpevole{border-style:solid;border-color:var(--male);background:var(--male-chiaro)}
.lz-cancello_validazione .contatore{font-size:.78rem;color:var(--tenue);margin-left:auto}
@media (max-width:960px){.lz-cancello_validazione .sotto{grid-template-columns:1fr}}
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

/** Il blocco di dati che l'agente scrive al tentativo n (con formato). Dal secondo tentativo il guasto e' corretto. */
export function datiAgente(sc, s, n) {
  const dati = {};
  for (const c of sc.schema) dati[c.id] = sc.output_corretto[c.id];
  if (n === 1 && s.guasto !== "nessuno") {
    const g = sc.guasti.find((x) => x.id === s.guasto);
    if (!g) throw new Error(`guasto sconosciuto: ${s.guasto}`);
    if (g.azione === "togli") delete dati[g.campo];
    else if (g.azione === "sostituisci") dati[g.campo] = g.valore;
    else throw new Error(`azione di guasto sconosciuta: ${g.azione}`);
  }
  return dati;
}

/** Confronta un blocco di dati con lo schema: elenco degli errori (vuoto = valido). */
export function valida(sc, dati) {
  const T = sc.testi;
  const errori = [];
  for (const c of sc.schema) {
    const v = dati[c.id];
    const base = { campo: c.id };
    if (v === undefined || v === null) {
      if (c.obbligatorio) errori.push({ ...base, testo: riempi(T.err_mancante, { campo: c.nome }) });
      continue;
    }
    if (c.tipo === "numero") {
      if (typeof v !== "number" || !Number.isFinite(v)) errori.push({ ...base, testo: riempi(T.err_numero, { campo: c.nome, valore: String(v) }) });
      else if (v < c.min || v > c.max) errori.push({ ...base, testo: riempi(T.err_scala, { campo: c.nome, min: c.min, max: c.max, valore: v }) });
    } else if (c.tipo === "scelta") {
      if (!c.ammessi.includes(v)) {
        const ammessi = c.ammessi.map((a) => `«${a}»`).join(`, `);
        errori.push({ ...base, testo: riempi(T.err_ammessi, { campo: c.nome, ammessi, valore: String(v) }) });
      }
    } else if (c.tipo === "testo") {
      if (typeof v !== "string" || !v.trim()) errori.push({ ...base, testo: riempi(T.err_testo, { campo: c.nome }) });
    } else throw new Error(`tipo di campo sconosciuto: ${c.tipo}`);
  }
  return errori;
}

/** Il viaggio completo dei dati: eventi da mostrare ed esito finale. */
export function simula(sc, s) {
  const T = sc.testi;
  const tx = (k, v) => riempi(T[k], v || {});
  if (!GUASTI_AMMESSI.includes(s.guasto)) throw new Error(`guasto non previsto: ${s.guasto}`);
  const tentativiMax = s.ritenta ? s.tentativi_max : 1;
  if (!Number.isInteger(tentativiMax) || tentativiMax < 1) throw new Error(`tentativi non validi: ${s.tentativi_max}`);
  const v = { azienda: sc.lead.azienda };
  const eventi = [{ tipo: "pensa", chi: "agente", testo: tx("pensa", v) }];
  if (s.formato) eventi.push({ tipo: "pensa", chi: "agente", testo: tx("pensa_schema") });
  let compilato = null;
  let ultimiErrori = [];
  for (let n = 1; n <= tentativiMax; n++) {
    if (n > 1) {
      if (s.formato) for (const campo of new Set(ultimiErrori.map((e) => e.campo))) eventi.push({ tipo: "pensa", chi: "agente", testo: tx("corregge", { campo: sc.schema.find((c) => c.id === campo).nome }) });
    }
    if (!s.formato) {
      const frase = tx(`frase_${Math.min(n, 3)}`);
      eventi.push({ tipo: "uscita", chi: "agente", tentativo: n, forma: "frase", frase, testo: tx("uscita_frase", { n }) });
      ultimiErrori = [{ campo: null, testo: tx("err_frase") }];
    } else {
      const dati = datiAgente(sc, s, n);
      eventi.push({ tipo: "uscita", chi: "agente", tentativo: n, forma: "dati", dati, testo: tx("uscita_dati", { n, quanti: Object.keys(dati).length }) });
      ultimiErrori = valida(sc, dati);
      if (!ultimiErrori.length) compilato = dati;
    }
    if (!ultimiErrori.length) {
      eventi.push({ tipo: "cancello", chi: "cancello", tentativo: n, ok: true, errori: [], testo: tx("cancello_ok") });
      eventi.push({ tipo: "compila", chi: "crm", dati: compilato, testo: tx("compila", v) });
      return { eventi, compilato, tentativi: n, esito: { tipo: "ok", testo: tx(n === 1 ? "esito_ok" : "esito_ok_ritento") } };
    }
    eventi.push({ tipo: "cancello", chi: "cancello", tentativo: n, ok: false, errori: ultimiErrori, testo: `${tx("cancello_ko", { quanti: ultimiErrori.length })} ${ultimiErrori.map((e) => e.testo).join(" ")}` });
    if (n < tentativiMax) {
      eventi.push({ tipo: "ritorno", chi: "cancello", tentativo: n, testo: s.formato ? tx("ritorno", { errori: ultimiErrori.map((e) => e.testo).join(" ") }) : tx("ritorno_frase") });
    }
  }
  eventi.push({ tipo: "persona", chi: "persona", testo: tx("persona") });
  return { eventi, compilato: null, tentativi: tentativiMax, esito: { tipo: s.formato ? "avviso" : "male", testo: tx(s.formato ? "esito_persona" : "esito_frase") } };
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez) {
  inietta(`stile-${COMP}`, STILE);
  const sc = lez.scenario;
  const E = sc.etichette;
  const tempi = sc.tempi;
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const s = { formato: false, guasto: "nessuno", ritenta: true, tentativi_max: sc.tentativi.min + 1, json_grezzo: false };
  let piano = null, indice = 0, inRiproduzione = false, generazione = 0, occupato = false;
  let velocita = tempi.velocita_iniziale;
  let ultimaUscita = null;
  const durata = (ms) => (ridotto ? 1 : ms / velocita);
  const nomeCampo = Object.fromEntries(sc.schema.map((c) => [c.id, c]));

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const interruttore = (chiave, etichetta, pericolo, soloVista) => {
    const input = el("input", { type: "checkbox", onchange: (e) => (soloVista ? cambiaVista({ [chiave]: e.target.checked }) : cambia({ [chiave]: e.target.checked })) });
    return { nodo: el("label", { class: `interruttore ${pericolo ? "pericolo" : ""}` }, el("span", {}, etichetta), input), input };
  };
  const iFormato = interruttore("formato", E.formato);
  const schemaLista = el("div", { class: "schema-lista" }, sc.schema.map((c) => el("div", { class: "schema-riga" },
    el("b", {}, c.chiave), " · ", c.nome,
    el("small", {}, [sc.tipi[c.tipo],
      c.tipo === "numero" ? riempi(E.da_a, { min: c.min, max: c.max }) : null,
      c.tipo === "scelta" ? c.ammessi.join(" / ") : null,
      c.obbligatorio ? E.obbligatorio : null].filter(Boolean).join(" · ")))));
  const schemaNota = el("div", { class: "schema-nota" });
  const schemaBox = el("div", {}, schemaLista, schemaNota);
  const segGuasto = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.rompi },
    sc.guasti.map((g) => el("button", { "data-v": g.id, onclick: () => cambia({ guasto: g.id }) }, g.nome)));
  const iRitenta = interruttore("ritenta", E.ritenta);
  const valTent = el("b", {});
  const inTent = el("input", { type: "range", min: sc.tentativi.min, max: sc.tentativi.max, step: 1, "aria-label": sc.tentativi.etichetta });
  inTent.addEventListener("input", () => { valTent.textContent = inTent.value; });
  inTent.addEventListener("change", () => cambia({ tentativi_max: Number(inTent.value) }));
  const cTent = el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, sc.tentativi.etichetta), valTent), inTent);
  const iGrezzo = interruttore("json_grezzo", E.json_grezzo, false, true);
  const avvisoCambio = el("div", { class: "avviso-cambio", "aria-live": "polite" });
  comandi.append(el("h3", {}, E.titolo_comandi), iFormato.nodo, el("h4", {}, E.schema), schemaBox,
    el("h4", {}, E.rompi), segGuasto, el("h4", {}, E.controllo), iRitenta.nodo, cTent, iGrezzo.nodo, avvisoCambio);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: "0 0 720 240", role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs>
    <filter id="cv-ombra" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="#17203b" flood-opacity=".14"/></filter>
    <filter id="cv-bagliore" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>`;
  const binario = svgEl("path", { d: `M${P.agente.x + 40},${P.agente.y} L${P.crm.x - 40},${P.crm.y}`, stroke: "#dbe1ef", "stroke-width": 10, "stroke-linecap": "round", fill: "none" });
  const binarioPunti = svgEl("path", { d: `M${P.agente.x + 40},${P.agente.y} L${P.crm.x - 40},${P.crm.y}`, stroke: "#fff", "stroke-width": 2, "stroke-dasharray": "2 10", fill: "none" });
  svg.append(binario, binarioPunti);
  const nodo = (pos, icona, colore, nome) => {
    const g = svgEl("g", { transform: `translate(${pos.x},${pos.y})` });
    const disco = svgEl("circle", { r: 36, fill: "#fff", stroke: colore, "stroke-width": 3.5, filter: "url(#cv-ombra)" });
    const ic = svgEl("g", { color: colore, transform: "scale(1.25)" }, icona);
    const t = svgEl("text", { y: 60, "text-anchor": "middle", "font-size": 14, "font-weight": 800, fill: colore });
    t.textContent = nome;
    g.append(disco, ic, t);
    svg.append(g);
    return { g, disco, ic, t };
  };
  const nAgente = nodo(P.agente, ICONE.agente, COLORE.agente, E.agente);
  const nCrm = nodo(P.crm, ICONE.crm, "#10b981", E.crm);
  // cancello: due pilastri, una sbarra e una spia
  const gCancello = svgEl("g", { transform: `translate(${P.cancello.x},${P.cancello.y})` });
  const pil1 = svgEl("rect", { x: -34, y: -54, width: 14, height: 98, rx: 5, fill: "#e4e9f4", stroke: "#c7cfe2" });
  const pil2 = svgEl("rect", { x: 20, y: -54, width: 14, height: 98, rx: 5, fill: "#e4e9f4", stroke: "#c7cfe2" });
  const sbarra = svgEl("rect", { x: -20, y: -40, width: 40, height: 8, rx: 4, fill: COLORE.neutro });
  const spia = svgEl("circle", { cx: 0, cy: -66, r: 9, fill: COLORE.neutro, filter: "url(#cv-bagliore)" });
  const tCancello = svgEl("text", { y: 66, "text-anchor": "middle", "font-size": 14, "font-weight": 800, fill: "#4f46e5" });
  tCancello.textContent = E.cancello;
  gCancello.append(pil1, pil2, sbarra, spia, tCancello);
  svg.append(gCancello);
  // persona che compare sotto al cancello
  const gPersona = svgEl("g", { transform: `translate(${P.cancello.x},${P.cancello.y + 98})`, opacity: 0 });
  gPersona.append(svgEl("circle", { r: 18, fill: "#fff", stroke: COLORE.persona, "stroke-width": 3 }), svgEl("g", { color: COLORE.persona }, ICONE.persona));
  svg.append(gPersona);
  // pacchetto in viaggio
  const pacchetto = svgEl("g", { opacity: 0 });
  const pacFondo = svgEl("rect", { x: -26, y: -16, width: 52, height: 32, rx: 9, fill: COLORE.dati });
  const pacTesto = svgEl("text", { y: 5, "text-anchor": "middle", "font-size": 14, "font-weight": 900, fill: "#fff", "font-family": "Consolas, monospace" });
  pacchetto.append(pacFondo, pacTesto);
  svg.append(pacchetto);
  const tTentativo = svgEl("text", { x: 360, y: 228, "text-anchor": "middle", "font-size": 12, fill: "#5b6684" });
  svg.append(tTentativo);

  // sotto la scena: uscita dell'agente e scheda CRM
  const vistaUscita = el("div", {});
  const campiCrm = {};
  const schedaCrm = el("div", {}, el("div", { class: "crm-testa" }, sc.lead.azienda), el("div", { class: "crm-sotto" }, sc.lead.riassunto),
    sc.schema.map((c) => { campiCrm[c.id] = el("div", {}); return el("div", { class: "campo-crm" }, el("span", {}, c.nome), campiCrm[c.id]); }));
  const sotto = el("div", { class: "sotto" },
    el("div", { class: "riquadro" }, el("h5", {}, E.uscita), vistaUscita),
    el("div", { class: "riquadro" }, el("h5", {}, E.scheda_crm), schedaCrm));

  const btnAvvia = el("button", { class: "btn btn-primario", onclick: () => (inRiproduzione ? pausa() : riproduci()) });
  const btnPasso = el("button", { class: "btn", onclick: () => passoSingolo() }, E.passo);
  const btnCapo = el("button", { class: "btn", onclick: () => reimposta() }, E.ricomincia);
  const vel = el("input", { type: "range", min: tempi.velocita_min, max: tempi.velocita_max, step: 0.25, value: velocita, "aria-label": E.velocita, oninput: (e) => { velocita = Number(e.target.value); } });
  scena.append(svg, sotto, el("div", { class: "barra-riproduzione" }, btnAvvia, btnPasso, btnCapo, el("label", { class: "velocita" }, E.velocita, vel)));

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  const diario = el("div", { class: "diario", "aria-live": "polite" });
  const esitoBox = el("div", {});
  destra.append(el("h3", {}, E.diario), diario, el("div", { style: "margin-top:12px" }, esitoBox));

  radice.replaceChildren(el("div", { class: `banco lz-${COMP}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno
  function aggiornaComandi() {
    iFormato.input.checked = s.formato; iRitenta.input.checked = s.ritenta; iGrezzo.input.checked = s.json_grezzo;
    segGuasto.querySelectorAll("button").forEach((b) => { b.setAttribute("aria-pressed", String(b.dataset.v === s.guasto)); b.disabled = !s.formato && b.dataset.v !== "nessuno"; });
    inTent.value = s.tentativi_max; valTent.textContent = String(s.tentativi_max); inTent.disabled = !s.ritenta;
    schemaBox.classList.toggle("schema-spento", !s.formato);
    schemaNota.textContent = s.formato ? "" : E.senza_schema;
    btnAvvia.textContent = inRiproduzione ? E.pausa : E.avvia;
  }

  function mostraUscita(ev, errori) {
    ultimaUscita = { ev, errori };
    if (!ev) { vistaUscita.replaceChildren(el("div", { class: "schema-nota" }, E.uscita_vuota)); return; }
    if (ev.forma === "frase") { vistaUscita.replaceChildren(el("div", { class: "fumetto" }, ev.frase)); return; }
    const sbagliati = new Set((errori || []).map((e) => e.campo));
    if (s.json_grezzo) {
      const righe = sc.schema.filter((c) => c.id in ev.dati).map((c) => {
        const v = ev.dati[c.id];
        const val = typeof v === "number" ? String(v) : JSON.stringify(v);
        const riga = `  "${c.chiave}": ${val}`;
        return sbagliati.has(c.id) ? `<span class="rosso">${riga.replace(/</g, "&lt;")}</span>` : riga.replace(/</g, "&lt;");
      });
      vistaUscita.replaceChildren(el("pre", { class: "grezzo", html: `{\n${righe.join(",\n")}\n}` }));
      return;
    }
    vistaUscita.replaceChildren(...sc.schema.map((c) => {
      const presente = c.id in ev.dati;
      return el("div", { class: `coppia ${sbagliati.has(c.id) ? "sbagliata" : ""} ${presente ? "" : "assente"}` },
        el("span", { class: "k" }, c.nome), el("span", { class: "v" }, presente ? String(ev.dati[c.id]) : sc.testi.vuoto_campo), el("span", { class: "tipo" }, sc.tipi[c.tipo]));
    }));
  }

  function svuotaCrm() {
    for (const c of sc.schema) { campiCrm[c.id].className = ""; campiCrm[c.id].textContent = sc.testi.vuoto_campo; }
  }

  function cambia(diff) {
    Object.assign(s, diff);
    avvisoCambio.textContent = E.cambiato;
    reimposta();
    riproduci();
  }
  function cambiaVista(diff) {
    Object.assign(s, diff);
    aggiornaComandi();
    if (ultimaUscita) mostraUscita(ultimaUscita.ev, ultimaUscita.errori);
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
  const posPacchetto = (x) => pacchetto.setAttribute("transform", `translate(${x},${P.agente.y})`);

  function coloraCancello(stato) {
    const c = stato === "ok" ? COLORE.ok : stato === "male" ? COLORE.male : COLORE.neutro;
    spia.setAttribute("fill", c);
    sbarra.setAttribute("fill", c);
    for (const p of [pil1, pil2]) p.setAttribute("stroke", stato === "neutro" ? "#c7cfe2" : c);
  }

  function voce(ev) {
    const nomi = { agente: E.chi_agente, cancello: E.chi_cancello, crm: E.chi_crm, persona: E.chi_persona };
    const icona = { agente: ICONE.agente, cancello: ev.ok === false ? ICONE.male : ICONE.ok, crm: ICONE.crm, persona: ICONE.persona }[ev.chi];
    const vb = ev.chi === "cancello" ? "0 0 24 24" : "-16 -16 32 32";
    return el("div", { class: `voce-diario ${ev.ok === false ? "errore" : ""}` },
      el("div", { class: "chip", style: `background:${ev.ok === false ? COLORE.male : CHI_COLORE[ev.chi]}`, html: `<svg viewBox="${vb}" style="color:#fff">${icona}</svg>` }),
      el("div", {}, el("div", { class: "chi", style: `color:${CHI_COLORE[ev.chi]}` }, nomi[ev.chi]), el("div", { class: "testo" }, ev.testo)));
  }

  async function eseguiEvento(ev) {
    const gen = generazione;
    diario.querySelector(".vuoto")?.remove();
    diario.append(voce(ev));
    diario.scrollTop = diario.scrollHeight;
    if (ev.tipo === "pensa") {
      nAgente.disco.animate([{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }], { duration: durata(520) });
      return true;
    }
    if (ev.tipo === "uscita") {
      tTentativo.textContent = `${E.tentativo} ${ev.tentativo}`;
      coloraCancello("neutro");
      mostraUscita(ev, []);
      pacFondo.setAttribute("fill", ev.forma === "frase" ? COLORE.frase : COLORE.dati);
      pacFondo.setAttribute("rx", ev.forma === "frase" ? "16" : "9");
      pacTesto.textContent = ev.forma === "frase" ? "« … »" : "{ }";
      pacchetto.setAttribute("opacity", "1");
      const da = P.agente.x + 40, a = P.cancello.x - 52;
      return tween(durata(tempi.ms_viaggio), (x) => posPacchetto(da + (a - da) * x));
    }
    if (ev.tipo === "cancello") {
      coloraCancello(ev.ok ? "ok" : "male");
      spia.animate([{ transform: "scale(1)" }, { transform: "scale(1.5)" }, { transform: "scale(1)" }], { duration: durata(500) });
      if (ev.ok) {
        sbarra.animate([{ transform: "translateY(0)" }, { transform: "translateY(-30px)" }], { duration: durata(350), fill: "forwards" });
        const da = P.cancello.x - 52, a = P.crm.x - 46;
        const fatto = await tween(durata(tempi.ms_viaggio), (x) => posPacchetto(da + (a - da) * x));
        pacchetto.setAttribute("opacity", "0");
        return fatto;
      }
      mostraUscita(ultimaUscita.ev, ev.errori);
      for (const e of ev.errori) if (e.campo) campiCrm[e.campo].className = "colpevole";
      gCancello.animate([{ transform: `translate(${P.cancello.x}px,${P.cancello.y}px)` }, { transform: `translate(${P.cancello.x - 5}px,${P.cancello.y}px)` }, { transform: `translate(${P.cancello.x + 5}px,${P.cancello.y}px)` }, { transform: `translate(${P.cancello.x}px,${P.cancello.y}px)` }], { duration: durata(380) });
      pacFondo.setAttribute("fill", COLORE.male);
      const da = P.cancello.x - 52, a = P.agente.x + 40;
      const fatto = await tween(durata(tempi.ms_viaggio), (x) => posPacchetto(da + (a - da) * x));
      pacchetto.setAttribute("opacity", "0");
      return fatto;
    }
    if (ev.tipo === "ritorno") {
      svuotaCrm();
      nAgente.disco.animate([{ stroke: COLORE.male }, { stroke: COLORE.agente }], { duration: durata(700) });
      return true;
    }
    if (ev.tipo === "compila") {
      nCrm.disco.animate([{ transform: "scale(1)" }, { transform: "scale(1.15)" }, { transform: "scale(1)" }], { duration: durata(500) });
      for (const c of sc.schema) {
        if (gen !== generazione) return false;
        const box = campiCrm[c.id];
        box.className = "pieno";
        box.textContent = String(ev.dati[c.id]);
        box.animate([{ transform: "translateX(-14px)", opacity: 0 }, { transform: "none", opacity: 1 }], { duration: durata(tempi.ms_campo * 1.4), easing: "cubic-bezier(.2,.8,.2,1)" });
        await attendi(durata(tempi.ms_campo));
      }
      return gen === generazione;
    }
    if (ev.tipo === "persona") {
      gPersona.setAttribute("opacity", "1");
      gPersona.animate([{ opacity: 0, transform: `translate(${P.cancello.x}px,${P.cancello.y + 118}px)` }, { opacity: 1, transform: `translate(${P.cancello.x}px,${P.cancello.y + 98}px)` }], { duration: durata(450), easing: "ease-out" });
      return true;
    }
    throw new Error(`evento sconosciuto: ${ev.tipo}`);
  }

  function mostraEsito() {
    const e = piano.esito;
    esitoBox.replaceChildren(el("div", { class: `esito-scheda ${e.tipo}`, html: `<svg viewBox="0 0 24 24" style="color:currentColor">${ICONE[e.tipo] || ICONE.ok}</svg>` },
      el("div", {}, el("div", { style: "font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;opacity:.8" }, E.esito), e.testo)));
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
    piano = simula(sc, s);
    indice = 0;
    pacchetto.setAttribute("opacity", "0");
    gPersona.setAttribute("opacity", "0");
    sbarra.getAnimations().forEach((a) => a.cancel());
    coloraCancello("neutro");
    tTentativo.textContent = "";
    mostraUscita(null);
    svuotaCrm();
    diario.replaceChildren(el("div", { class: "vuoto" }, E.vuoto));
    esitoBox.replaceChildren();
    aggiornaComandi();
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    Object.assign(s, stato || {});
    avvisoCambio.textContent = "";
    reimposta();
  }

  if (Object.keys(nomeCampo).length !== sc.schema.length) throw new Error("schema con campi duplicati");
  reimposta();
  return {
    applica,
    distruggi() { generazione += 1; inRiproduzione = false; },
    _prova: { simula: () => simula(sc, s), stato: s },
  };
}
