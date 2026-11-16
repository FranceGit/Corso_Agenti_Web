// Lezione interattiva "Le istruzioni di sistema": lo studente accende, spegne e riordina sei blocchi di istruzioni
// (Ruolo, Obiettivo, Vincoli, Formato, Esempi, In caso di dubbio) e vede l'email scritta dall'agente cambiare,
// con ogni difetto evidenziato e spiegato. Cinque generazioni mostrano la variabilita'. L'errore classico:
// l'istruzione ambigua e quella contraddittoria (solo li' l'ordine dei blocchi cambia l'esito).
// Tutti i testi e i numeri arrivano dallo scenario della lezione (API protetta).

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "costruttore_istruzioni";
const COLORE_VARIANTE = ["#6366f1", "#0ea5e9", "#f59e0b", "#10b981", "#e11d48", "#8b5cf6"];

const STILE = `
.lz-costruttore_istruzioni .blocchi { display: grid; gap: 6px; }
.lz-costruttore_istruzioni .blocco { display: grid; grid-template-columns: 16px 1fr auto; gap: 8px; align-items: center; padding: 8px 8px 8px 6px;
  border: 1.5px solid var(--bordo); border-radius: 12px; background: var(--superficie-2); transition: border-color .2s, background .2s, opacity .2s, transform .15s; }
.lz-costruttore_istruzioni .blocco.spento { opacity: .55; background: #fff; border-style: dashed; }
.lz-costruttore_istruzioni .blocco.conflitto { border-color: var(--male); background: var(--male-chiaro); }
.lz-costruttore_istruzioni .blocco.trascinato { opacity: .4; }
.lz-costruttore_istruzioni .blocco.sopra { transform: translateY(3px); border-color: var(--primario); }
.lz-costruttore_istruzioni .maniglia { cursor: grab; color: var(--tenue-2); font-size: 14px; line-height: 1; user-select: none; }
.lz-costruttore_istruzioni .blocco .nome { font-weight: 700; font-size: .84rem; display: flex; align-items: center; gap: 8px; }
.lz-costruttore_istruzioni .blocco .istruzione { font-size: .74rem; color: var(--tenue); margin-top: 2px; font-family: var(--mono); }
.lz-costruttore_istruzioni .blocco .comandi-blocco { display: flex; flex-direction: column; gap: 2px; }
.lz-costruttore_istruzioni .blocco .comandi-blocco button { border: 1px solid var(--bordo); background: #fff; border-radius: 6px; width: 24px; height: 20px; padding: 0; font-size: 11px; line-height: 1; color: var(--tenue); }
.lz-costruttore_istruzioni .blocco .comandi-blocco button:disabled { opacity: .3; cursor: default; }
.lz-costruttore_istruzioni .blocco input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--primario); margin: 0; }
.lz-costruttore_istruzioni .email { background: #fff; border: 1px solid var(--bordo); border-radius: 14px; box-shadow: var(--ombra); overflow: hidden; }
.lz-costruttore_istruzioni .email .testa { display: flex; align-items: center; gap: 10px; padding: 10px 14px; background: linear-gradient(90deg, #eef0ff, #f7f9fd); border-bottom: 1px solid var(--bordo); font-size: .78rem; color: var(--tenue); }
.lz-costruttore_istruzioni .email .testa b { color: var(--inchiostro); }
.lz-costruttore_istruzioni .email .corpo { padding: 14px 18px 16px; display: grid; gap: 8px; font-size: .9rem; min-height: 230px; }
.lz-costruttore_istruzioni .riga-email { position: relative; padding: 2px 6px; border-radius: 6px; }
.lz-costruttore_istruzioni .riga-email.oggetto { font-weight: 700; border-bottom: 1px dashed var(--bordo); padding-bottom: 8px; }
.lz-costruttore_istruzioni .riga-email.oggetto::before { content: attr(data-etichetta); font-weight: 600; color: var(--tenue-2); margin-right: 6px; }
.lz-costruttore_istruzioni .riga-email.firma { color: var(--tenue); font-style: italic; }
.lz-costruttore_istruzioni .riga-email.nota { color: #1d4ed8; background: #eff6ff; font-size: .8rem; }
.lz-costruttore_istruzioni .riga-email.difetto { background: var(--male-chiaro); color: #9f1239; box-shadow: inset 3px 0 0 var(--male); }
.lz-costruttore_istruzioni .riga-email.mancante { color: var(--tenue-2); font-style: italic; border: 1px dashed #fda4af; background: #fff7f8; font-size: .8rem; }
.lz-costruttore_istruzioni .riga-email .segno { display: inline-grid; place-items: center; width: 18px; height: 18px; border-radius: 50%; background: var(--male); color: #fff; font-size: .68rem; font-weight: 800; margin-right: 6px; vertical-align: 1px; }
.lz-costruttore_istruzioni .misure { display: flex; flex-wrap: wrap; gap: 8px; margin: 10px 2px 0; font-size: .78rem; color: var(--tenue); }
.lz-costruttore_istruzioni .misure span { background: var(--superficie); border: 1px solid var(--bordo); border-radius: 999px; padding: .2em .7em; }
.lz-costruttore_istruzioni .misure span.male { border-color: #fda4af; color: #9f1239; background: var(--male-chiaro); }
.lz-costruttore_istruzioni .generazioni { margin-top: 12px; background: var(--superficie); border-radius: 12px; border: 1px solid var(--bordo); padding: 10px 12px 6px; }
.lz-costruttore_istruzioni .generazioni .riga { display: flex; align-items: center; gap: 10px; justify-content: space-between; font-size: .82rem; }
.lz-costruttore_istruzioni .contatore { font-weight: 800; font-variant-numeric: tabular-nums; }
.lz-costruttore_istruzioni .contatore.alto { color: var(--male); }
.lz-costruttore_istruzioni .contatore.basso { color: var(--ok); }
.lz-costruttore_istruzioni .difetti { display: grid; gap: 8px; }
.lz-costruttore_istruzioni .difetti .voce { display: grid; grid-template-columns: 22px 1fr; gap: 8px; font-size: .84rem; animation: entra .35s ease; }
.lz-costruttore_istruzioni .difetti .voce .segno { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: var(--male); color: #fff; font-weight: 800; font-size: .72rem; }
.lz-costruttore_istruzioni .difetti .voce b { display: block; font-size: .78rem; text-transform: uppercase; letter-spacing: .05em; color: #9f1239; }
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
function hash(testo) {
  let h = 2166136261;
  for (let i = 0; i < testo.length; i++) { h ^= testo.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const contaParole = (t) => t.split(/\s+/).filter((x) => /[\p{L}\p{N}]/u.test(x)).length;

// ------------------------------------------------------------------ logica (pura)

const VARIANTI_VINCOLI = ["chiaro", "ambiguo", "contraddittorio"];

function controllaStato(sc, s) {
  const ids = sc.blocchi.map((b) => b.id);
  if (s.ordine.length !== ids.length || ids.some((id) => !s.ordine.includes(id))) throw new Error(`ordine dei blocchi non valido: ${s.ordine}`);
  for (const id of ids) if (typeof s.attivi[id] !== "boolean") throw new Error(`blocco ${id}: attivo deve essere vero o falso`);
  if (!VARIANTI_VINCOLI.includes(s.vincoli_testo)) throw new Error(`testo dei vincoli sconosciuto: ${s.vincoli_testo}`);
  if (!sc.lead.some((l) => l.id === s.lead)) throw new Error(`lead sconosciuto: ${s.lead}`);
}

/** Testo che ogni blocco mostra in questo momento (Vincoli e Formato dipendono dalla variante scelta). */
export function testoBlocco(sc, s, id) {
  const b = sc.blocchi.find((x) => x.id === id);
  if (!b) throw new Error(`blocco sconosciuto: ${id}`);
  if (id === "vincoli") return b.varianti[s.vincoli_testo];
  if (id === "formato" && s.vincoli_testo === "contraddittorio") return b.testo_contraddittorio;
  return b.testo;
}

/** Compone l'email che l'agente scriverebbe con queste istruzioni, i difetti e le 5 generazioni di prova. */
export function componi(sc, s) {
  controllaStato(sc, s);
  const F = sc.frasi;
  const P = sc.parametri;
  const A = s.attivi;
  const lead = sc.lead.find((l) => l.id === s.lead);
  const valori = { nome: lead.nome, azienda: sc.azienda };
  const fr = (k) => riempi(F[k], valori);
  const difetti = new Set();

  // Conflitto: solo con la variante "contraddittorio" e con entrambi i blocchi accesi vince quello che viene DOPO.
  const conflitto = s.vincoli_testo === "contraddittorio" && A.vincoli && A.formato;
  let lunghezza = "normale";
  let vince = null;
  if (s.vincoli_testo === "contraddittorio") {
    if (conflitto) {
      vince = s.ordine.indexOf("vincoli") > s.ordine.indexOf("formato") ? "vincoli" : "formato";
      lunghezza = vince === "vincoli" ? "corta" : "lunga";
      difetti.add("conflitto");
    } else if (A.vincoli) lunghezza = "corta";
    else if (A.formato) lunghezza = "lunga";
  }
  if (A.vincoli && s.vincoli_testo === "ambiguo") difetti.add("ambiguo");

  const righe = [];
  const riga = (tipo, chiave, difetto) => {
    righe.push({ tipo, chiave, testo: fr(chiave), difetto: difetto || null });
    if (difetto) difetti.add(difetto);
  };
  if (A.formato) riga("oggetto", "oggetto");
  else righe.push({ tipo: "mancante", chiave: "manca_oggetto", testo: F.manca_oggetto, difetto: "formato" });
  // saluto
  if (lead.ha_nome) riga("saluto", A.ruolo ? "saluto_formale" : "saluto_informale", A.ruolo ? null : "tono");
  else if (A.dubbio) riga("saluto", A.ruolo ? "saluto_neutro" : "saluto_informale_neutro", A.ruolo ? null : "tono");
  else riga("saluto", A.ruolo ? "saluto_segnaposto" : "saluto_informale_segnaposto", "segnaposto");
  if (!A.ruolo) difetti.add("tono");
  riga("testo", A.ruolo ? "intro" : "intro_informale", A.ruolo ? null : "tono");
  if (lunghezza !== "corta") riga("testo", A.ruolo ? "valore" : "valore_informale", A.ruolo ? null : "tono");
  if (lunghezza === "lunga") riga("testo", "dettagli", conflitto ? "conflitto" : null);
  if (!A.obiettivo && lunghezza !== "corta") riga("testo", "divaga", "senza_cta");
  if (!A.obiettivo) difetti.add("senza_cta");
  if (!A.vincoli) riga("testo", "sconto", "sconto");
  if (A.obiettivo) riga("testo", "cta");
  if (A.formato) riga("firma", "firma");
  else righe.push({ tipo: "mancante", chiave: "manca_firma", testo: F.manca_firma, difetto: "formato" });
  if (!lead.ha_nome && A.dubbio) riga("nota", "nota_dubbio");
  if (!A.formato) difetti.add("formato");
  if (!A.esempi) difetti.add("variabilita");

  const parole = righe.filter((r) => r.tipo === "saluto" || r.tipo === "testo").reduce((n, r) => n + contaParole(r.testo), 0);

  // Cinque generazioni: il seme dipende dalle istruzioni, NON dall'ordine dei blocchi (salvo in caso di conflitto).
  const firma = JSON.stringify({ a: A, v: s.vincoli_testo, l: s.lead, o: conflitto ? s.ordine : null });
  const rnd = mulberry32(hash(firma));
  const scarto = (ampiezza) => Math.round((rnd() * 2 - 1) * ampiezza);
  const conAmbiguita = difetti.has("ambiguo") || conflitto;
  const varianti = A.esempi ? (conAmbiguita ? P.varianti_con_esempi_ambiguo : P.varianti_con_esempi) : P.varianti_senza_esempi;
  const generazioni = varianti.map((variante, i) => {
    let n;
    if (difetti.has("ambiguo")) n = P.lunghezze_ambiguo[i];
    else if (conflitto) n = P.schema_conflitto[i] === "lunga" ? P.parole_lunga + scarto(P.scarto_piccolo) : P.parole_corta + scarto(P.scarto_piccolo);
    else if (!A.vincoli) n = parole + scarto(P.scarto_grande);
    else n = parole + scarto(P.scarto_piccolo);
    return { variante, parole: Math.max(P.parole_minime, n) };
  });
  // Variabilita' = quante versioni davvero diverse: stessa struttura (variante) e lunghezza simile contano come una.
  // Le lunghezze si raggruppano in fasce: una nuova fascia comincia quando lo stacco supera passo_lunghezza parole.
  const lunghezze = generazioni.map((g) => g.parole);
  const ordinate = [...new Set(lunghezze)].sort((a, b) => a - b);
  const fascia = {};
  ordinate.forEach((n, i) => { fascia[n] = i === 0 ? 0 : fascia[ordinate[i - 1]] + (n - ordinate[i - 1] > P.passo_lunghezza ? 1 : 0); });
  const firme = new Set(generazioni.map((g) => `${g.variante}:${fascia[g.parole]}`));
  const variabilita = firme.size;

  const ordineDifetti = sc.difetti.map((d) => d.id).filter((id) => difetti.has(id));
  const spiegazioni = ordineDifetti.map((id) => {
    const d = sc.difetti.find((x) => x.id === id);
    return { id, nome: d.nome, testo: riempi(d.spiega, { n: variabilita, min: Math.min(...lunghezze), max: Math.max(...lunghezze), vince: vince ? sc.blocchi.find((b) => b.id === vince).nome : "" }) };
  });
  return { righe, difetti: ordineDifetti, spiegazioni, parole, generazioni, variabilita, conflitto, vince, lunghezza };
}

/** Sposta un blocco nella posizione `verso` (indice) e restituisce il nuovo ordine. */
export function sposta(ordine, id, verso) {
  const da = ordine.indexOf(id);
  if (da < 0) throw new Error(`blocco sconosciuto: ${id}`);
  const a = Math.max(0, Math.min(ordine.length - 1, verso));
  const nuovo = ordine.slice();
  nuovo.splice(da, 1);
  nuovo.splice(a, 0, id);
  return nuovo;
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const P = sc.parametri;
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const durata = (ms) => (ridotto ? 1 : ms);
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));

  const s = {
    attivi: Object.fromEntries(sc.blocchi.map((b) => [b.id, true])),
    ordine: sc.blocchi.map((b) => b.id),
    vincoli_testo: VARIANTI_VINCOLI[0],
    lead: sc.lead[0].id,
  };
  let risultato = null;
  let righePrima = new Set();
  let trascinato = null;
  let generazione = 0;

  // ------------------------------------------------ blocchi (sinistra)
  const comandi = el("aside", { class: "pannello" });
  const elencoBlocchi = el("div", { class: "blocchi", role: "list", "aria-label": E.blocchi });
  const segVincoli = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.testo_vincoli },
    VARIANTI_VINCOLI.map((v) => el("button", { "data-v": v, onclick: () => cambia({ vincoli_testo: v }) }, E[`vincoli_${v}`])));
  const selLead = el("select", { class: "scelta", "aria-label": E.lead, onchange: (e) => cambia({ lead: e.target.value }) },
    sc.lead.map((l) => el("option", { value: l.id }, l.etichetta)));
  comandi.append(
    el("h3", {}, E.titolo_comandi),
    el("p", { style: "font-size:.8rem;color:var(--tenue);margin:0 0 8px" }, E.aiuto_blocchi),
    elencoBlocchi,
    el("h4", { style: "margin-top:14px" }, E.testo_vincoli), segVincoli,
    el("h4", {}, E.lead), selLead);

  // ------------------------------------------------ email (centro)
  const scena = el("div", { class: "scena", style: "padding:14px" });
  const corpo = el("div", { class: "corpo", "aria-live": "polite" });
  const email = el("div", { class: "email" },
    el("div", { class: "testa" }, el("b", {}, E.anteprima), el("span", {}, riempi(E.destinatario, { azienda: sc.azienda }))), corpo);
  const misure = el("div", { class: "misure" });
  const contatore = el("span", { class: "contatore" });
  const svgGen = svgEl("svg", { viewBox: "0 0 520 120", role: "img", "aria-label": E.descrizione_generazioni });
  const btnGenera = el("button", { class: "btn btn-primario", onclick: () => animaGenerazioni(true) }, E.genera);
  const pannelloGen = el("div", { class: "generazioni" },
    el("div", { class: "riga" }, el("span", {}, E.variabilita, " ", contatore), btnGenera), svgGen);
  scena.append(email, misure, pannelloGen);

  // ------------------------------------------------ difetti (destra)
  const destra = el("aside", { class: "pannello destra" });
  const difetti = el("div", { class: "difetti", "aria-live": "polite" });
  destra.append(el("h3", {}, E.titolo_difetti), difetti);

  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  // ------------------------------------------------ disegno
  function disegnaBlocchi() {
    elencoBlocchi.replaceChildren();
    s.ordine.forEach((id, i) => {
      const b = sc.blocchi.find((x) => x.id === id);
      const inConflitto = risultato.conflitto && (id === "vincoli" || id === "formato");
      const casella = el("input", { type: "checkbox", "aria-label": riempi(E.accendi, { blocco: b.nome }), onchange: (e) => cambia({ attivi: { ...s.attivi, [id]: e.target.checked } }) });
      casella.checked = s.attivi[id];
      const riga = el("div", { class: `blocco ${s.attivi[id] ? "" : "spento"} ${inConflitto ? "conflitto" : ""}`, role: "listitem", draggable: "true", "data-id": id },
        el("span", { class: "maniglia", "aria-hidden": "true" }, "⋮⋮"),
        el("div", {},
          el("label", { class: "nome" }, casella, el("span", {}, `${i + 1}. ${b.nome}`), inConflitto ? el("span", { style: "color:var(--male);font-size:.72rem" }, E.in_conflitto) : null),
          el("div", { class: "istruzione" }, testoBlocco(sc, s, id))),
        el("div", { class: "comandi-blocco" },
          el("button", { "aria-label": riempi(E.su, { blocco: b.nome }), disabled: i === 0, onclick: () => cambia({ ordine: sposta(s.ordine, id, i - 1) }) }, "▲"),
          el("button", { "aria-label": riempi(E.giu, { blocco: b.nome }), disabled: i === s.ordine.length - 1, onclick: () => cambia({ ordine: sposta(s.ordine, id, i + 1) }) }, "▼")));
      riga.addEventListener("dragstart", (e) => { trascinato = id; riga.classList.add("trascinato"); if (e.dataTransfer) e.dataTransfer.setData("text/plain", id); });
      riga.addEventListener("dragend", () => { trascinato = null; riga.classList.remove("trascinato"); });
      riga.addEventListener("dragover", (e) => { e.preventDefault(); riga.classList.add("sopra"); });
      riga.addEventListener("dragleave", () => riga.classList.remove("sopra"));
      riga.addEventListener("drop", (e) => {
        e.preventDefault();
        riga.classList.remove("sopra");
        const chi = trascinato || (e.dataTransfer ? e.dataTransfer.getData("text/plain") : "");
        if (chi && chi !== id && s.ordine.includes(chi)) cambia({ ordine: sposta(s.ordine, chi, s.ordine.indexOf(id)) });
      });
      elencoBlocchi.append(riga);
    });
  }

  function disegnaEmail() {
    const numeri = Object.fromEntries(risultato.difetti.map((d, i) => [d, i + 1]));
    const nuove = new Set(risultato.righe.map((r) => r.chiave));
    corpo.replaceChildren();
    risultato.righe.forEach((r, k) => {
      const classi = ["riga-email", r.tipo === "testo" || r.tipo === "saluto" ? "" : r.tipo];
      if (r.difetto && r.tipo !== "mancante") classi.push("difetto");
      const nodo = el("div", { class: classi.join(" "), "data-etichetta": r.tipo === "oggetto" ? E.oggetto : null },
        r.difetto ? el("span", { class: "segno" }, String(numeri[r.difetto])) : null, r.testo);
      corpo.append(nodo);
      if (!righePrima.has(r.chiave)) {
        nodo.animate([{ opacity: 0, transform: "translateX(-8px)", background: "#fef3c7" }, { opacity: 1, transform: "none" }], { duration: durata(P.ms_riga), delay: durata(k * P.ms_ritardo_riga), fill: "backwards", easing: "ease-out" });
      }
      if (r.difetto === "sconto" && !righePrima.has(r.chiave)) {
        nodo.animate([{ transform: "translateX(0)" }, { transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "translateX(0)" }], { duration: durata(360), delay: durata(P.ms_riga) });
      }
    });
    righePrima = nuove;
    const limite = P.limite_parole;
    misure.replaceChildren(
      el("span", { class: risultato.parole > limite && s.attivi.vincoli && s.vincoli_testo === "chiaro" ? "male" : "" }, riempi(E.parole, { n: risultato.parole })),
      el("span", { class: risultato.difetti.length ? "male" : "" }, riempi(E.conta_difetti, { n: risultato.difetti.length })));
  }

  function disegnaDifetti() {
    if (!risultato.spiegazioni.length) {
      difetti.replaceChildren(el("div", { class: "esito-scheda ok" }, el("div", {}, E.nessun_difetto)));
      return;
    }
    difetti.replaceChildren(...risultato.spiegazioni.map((d, i) => el("div", { class: "voce" },
      el("span", { class: "segno" }, String(i + 1)), el("div", {}, el("b", {}, d.nome), d.testo))));
  }

  function animaGenerazioni(daPulsante) {
    generazione += 1;
    const gen = generazione;
    svgGen.replaceChildren();
    const g = risultato.generazioni;
    const massimo = Math.max(P.parole_scala, ...g.map((x) => x.parole));
    const colonne = g.length;
    const passo = 520 / colonne;
    const lettere = [...new Set(g.map((x) => x.variante))];
    g.forEach((x, i) => {
      const h = Math.max(4, (x.parole / massimo) * 78);
      const cx = passo * i + passo / 2;
      const colore = COLORE_VARIANTE[lettere.indexOf(x.variante) % COLORE_VARIANTE.length];
      const gr = svgEl("g", { transform: `translate(${cx},0)` });
      const barra = svgEl("rect", { x: -26, y: 90 - h, width: 52, height: h, rx: 8, fill: colore, opacity: ".85" });
      const t1 = svgEl("text", { x: 0, y: 84 - h, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#17203b" });
      t1.textContent = riempi(E.parole_breve, { n: x.parole });
      const t2 = svgEl("text", { x: 0, y: 108, "text-anchor": "middle", "font-size": 10.5, fill: "#5b6684" });
      t2.textContent = riempi(E.versione, { lettera: x.variante, numero: i + 1 });
      gr.append(barra, t1, t2);
      svgGen.append(gr);
      if (!ridotto) {
        const ritardo = (daPulsante ? P.ms_generazione : P.ms_generazione / 3) * i;
        gr.animate([{ opacity: 0, transform: `translate(${cx}px,14px)` }, { opacity: 1, transform: `translate(${cx}px,0px)` }], { duration: durata(P.ms_riga), delay: ritardo, fill: "backwards", easing: "cubic-bezier(.3,1.4,.5,1)" });
      }
    });
    const alto = risultato.variabilita >= P.soglia_variabilita_alta;
    contatore.className = `contatore ${alto ? "alto" : "basso"}`;
    contatore.textContent = riempi(E.contatore, { n: risultato.variabilita, totale: g.length });
    if (daPulsante && gen === generazione) contatore.animate([{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }], { duration: durata(400), delay: durata(P.ms_generazione * colonne) });
  }

  function aggiornaComandi() {
    segVincoli.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.vincoli_testo)));
    selLead.value = s.lead;
  }

  function ridisegna() {
    risultato = componi(sc, s);
    aggiornaComandi();
    disegnaBlocchi();
    disegnaEmail();
    disegnaDifetti();
    animaGenerazioni(false);
  }

  function cambia(diff) {
    Object.assign(s, diff);
    ridisegna();
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) {
      if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    }
    const nuovo = { ...s, ...(stato || {}) };
    nuovo.attivi = { ...s.attivi, ...((stato && stato.attivi) || {}) };
    controllaStato(sc, nuovo);
    Object.assign(s, nuovo);
    righePrima = new Set();
    ridisegna();
  }

  applica({});
  return {
    applica,
    distruggi() { generazione += 1; },
    _prova: { stato: s, componi: () => componi(sc, s) },
  };
}
