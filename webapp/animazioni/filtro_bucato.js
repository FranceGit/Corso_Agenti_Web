// Lezione interattiva "Il filtro bucato" (PO2.2, Officina O2). Tre viste del repo adottato:
//  - dipendenze: requirements.txt costruito oggi e fra sei mesi, con o senza versioni fissate, con o senza i pacchetti
//    mai importati, e l'immagine base (3.9 fuori supporto contro 3.12); le righe si installano una dopo l'altra;
//  - chiave e test: dove sta GROQ_API_KEY (repo, variabile d'ambiente, assente) e quale modello usano i test (vero o
//    finto): tre giri dello stesso test mostrano se l'esito e' stabile;
//  - il filtro: 8 risposte tipo (costruite come il banco del correttore) cadono nei cesti Interested / Not Interested /
//    Needs Follow-up / Unknown secondo il classificatore che lo studente configura (ordine dei controlli, contiene o
//    uguale, normalizzazione, pulizia dei ```); la tabella dei test diventa verde/rossa e la striscia "rosso ->
//    correzione -> verde" segue il ciclo del test di regressione. Nessun codice corretto mostrato: solo il codice
//    vero del repo e la versione dello studente descritta a parole. Tutti i testi dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "filtro_bucato";
const W = 720, H = 440;
const ORDINI = ["interested_prima", "not_prima"];
const CONFRONTI = ["contiene", "uguale"];
const QUANDO = ["oggi", "sei_mesi"];
const CHIAVI = ["repo", "ambiente", "assente"];
const MODELLI = ["vero", "finto"];
const CHIP = { x0: 10, passo: 88.75, y: 40, w: 82, h: 50, caratteri: 14 };
const BOX = { x0: 10, passo: 117.3, y: 112, w: 109, h: 66, caratteri: 19 };
const CESTO = { x0: 12, passo: 176.5, y: 202, w: 164, h: 88 };
const CELLA = { x0: 10, passo: 176.5, y: 304, w: 167, h: 60, scarto: 6, caratteri: 30 };
const BASE_CARATTERI = 86;
const DIP = { y0: 76, passo: 27, xRiga: 20, xUso: 196, xOggi: 368, xPoi: 540, wCella: 160 };
const AMB = { y: 54, h: 116, w: 206, xs: [16, 257, 498] };
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
const C = { ok: "#16a34a", okChiaro: "#dcfce7", male: "#e11d48", maleChiaro: "#ffe4e6", avviso: "#d97706", avvisoChiaro: "#fef3c7", tenue: "#5b6684", scuro: "#17203b", bordo: "#cbd2e3", viola: "#4f46e5" };
const COLORE_CESTO = { interested: "#16a34a", not_interested: "#e11d48", follow_up: "#d97706", unknown: "#64748b" };

const STILE = `
.lz-filtro_bucato .esiti-filtro { margin-top: 10px; border-top: 1px solid #dfe4f0; padding: 10px 4px 2px; }
.lz-filtro_bucato .esiti-filtro h4 { margin: 0 0 6px; font-size: .8rem; text-transform: uppercase; letter-spacing: .07em; color: var(--tenue); }
.lz-filtro_bucato .esiti-elenco-fb { display: grid; gap: 5px; max-height: 210px; overflow-y: auto; padding-right: 4px; }
.lz-filtro_bucato .esiti-elenco-fb div { font-size: .78rem; padding: 6px 9px; border-radius: 9px; overflow-wrap: anywhere; }
.lz-filtro_bucato .esiti-elenco-fb .ok { background: var(--ok-chiaro); color: #166534; }
.lz-filtro_bucato .esiti-elenco-fb .avviso { background: var(--avviso-chiaro); color: #92400e; }
.lz-filtro_bucato .esiti-elenco-fb .male { background: var(--male-chiaro); color: #9f1239; }
.lz-filtro_bucato .esiti-elenco-fb .neutro { background: #f1f5f9; color: #334155; }
.lz-filtro_bucato .striscia-fb { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 8px 0 4px; }
.lz-filtro_bucato .striscia-fb span { text-align: center; font-size: .76rem; font-weight: 800; padding: 6px 4px; border-radius: 9px; border: 1.5px dashed #cbd2e3; color: var(--tenue); }
.lz-filtro_bucato .striscia-fb .fatto-rosso { background: var(--male-chiaro); color: #9f1239; border-style: solid; border-color: #e11d48; }
.lz-filtro_bucato .striscia-fb .fatto-giallo { background: var(--avviso-chiaro); color: #92400e; border-style: solid; border-color: #d97706; }
.lz-filtro_bucato .striscia-fb .fatto-verde { background: var(--ok-chiaro); color: #166534; border-style: solid; border-color: #16a34a; }
.lz-filtro_bucato .codice-fb { font-family: ${MONO}; font-size: .74rem; background: #0f172a; color: #e2e8f0; border-radius: 10px; padding: 8px 10px; margin: 4px 0 10px; white-space: pre-wrap; overflow-wrap: anywhere; }
.lz-filtro_bucato .codice-fb .num { color: #94a3b8; }
.lz-filtro_bucato .codice-fb .colpa { color: #fda4af; font-weight: 700; }
.lz-filtro_bucato .parole-fb { margin: 4px 0 10px; padding-left: 1.3em; font-size: .82rem; display: grid; gap: 3px; }
.lz-filtro_bucato .gruppi-fb { display: grid; gap: 4px; font-size: .82rem; margin: 4px 0 8px; }
.lz-filtro_bucato .gruppi-fb .ok { color: #166534; font-weight: 700; }
.lz-filtro_bucato .gruppi-fb .male { color: #9f1239; font-weight: 700; }
.lz-filtro_bucato .nota-fb { font-size: .78rem; color: var(--tenue); margin: 4px 0; }
.lz-filtro_bucato .regola-fb { margin-top: 10px; padding: 8px 10px; border-left: 4px solid #e11d48; background: #fff1f2; border-radius: 0 10px 10px 0; font-weight: 700; font-size: .84rem; }
.lz-filtro_bucato .fila-btn-fb { display: grid; gap: 6px; margin-top: 8px; }
.lz-filtro_bucato .fila-btn-fb .btn { justify-content: center; }
`;

function svgEl(tag, attr) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attr || {})) e.setAttribute(k, v);
  return e;
}
function testoSvg(attr, testo) {
  const t = svgEl("text", attr);
  t.textContent = testo;
  return t;
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
export function riempi(modello, valori) {
  return modello.replace(/\{(\w+)\}/g, (_, k) => {
    if (!(k in valori)) throw new Error(`segnaposto {${k}} senza valore`);
    return valori[k];
  });
}
/** Spezza un testo in righe di al massimo n caratteri (a parole; una parola piu' lunga di n viene spezzata). */
export function aCapo(testo, n) {
  const righe = [];
  let riga = "";
  for (let p of String(testo).split(" ")) {
    while (p.length > n) { if (riga) { righe.push(riga); riga = ""; } righe.push(p.slice(0, n)); p = p.slice(n); }
    if (riga && (riga + " " + p).length > n) { righe.push(riga); riga = p; } else riga = riga ? `${riga} ${p}` : p;
  }
  if (riga) righe.push(riga);
  return righe;
}

// ------------------------------------------------------------------ logica (pura): dipendenze

/** Le righe di requirements.txt con il loro esito oggi e fra sei mesi. */
export function righeRequisiti(sc, s) {
  return sc.requisiti.map((r) => {
    const tolta = s.pulite && r.uso === "inutile";
    return { ...r, tolta, fissata: s.fissate && !tolta, garantita: !tolta && s.fissate };
  });
}
export function riepilogoDipendenze(sc, s) {
  const righe = righeRequisiti(sc, s).filter((r) => !r.tolta);
  return {
    righe: righe.length,
    libere: righe.filter((r) => !r.fissata).length,
    garantite: righe.filter((r) => r.garantita).length,
    inutili: righe.filter((r) => r.uso === "inutile").length,
    base: sc.basi.find((b) => b.id === s.base),
  };
}

// ------------------------------------------------------------------ logica (pura): chiave e modello

/** Tre giri dello stesso test (caso «Not Interested») con la chiave e il modello scelti. */
export function giriTest(sc, s) {
  if (s.modello === "vero" && s.chiave === "assente") return sc.giri_modello_vero.map(() => "errore");
  if (s.modello === "vero") return [...sc.giri_modello_vero];
  const caso = sc.casi.find((c) => c.id === sc.caso_dei_giri);
  const verde = classifica(sc, codiceDi(s), caso.risposta).etichetta === caso.atteso;
  return sc.giri_modello_vero.map(() => (verde ? "verde" : "rosso"));
}
/** Giudizio sui giri: errore, variabili, stabili rossi, stabili verdi. */
export function giudizioGiri(giri) {
  if (giri.every((g) => g === "errore")) return "errore";
  if (new Set(giri).size > 1) return "variabili";
  return giri[0] === "verde" ? "stabili_verdi" : "stabili_rossi";
}

// ------------------------------------------------------------------ logica (pura): il classificatore

export function codiceDi(s) {
  return { ordine: s.ordine, confronto: s.confronto, normalizza: s.normalizza, pulisci: s.pulisci };
}
export function stessoCodice(a, b) {
  return a.ordine === b.ordine && a.confronto === b.confronto && a.normalizza === b.normalizza && a.pulisci === b.pulisci;
}
/**
 * Il classificatore configurato dallo studente, applicato alla risposta del modello finto. Restituisce l'etichetta e
 * il passo che ha deciso: "json" (risposta illeggibile), "primo", "secondo" (i due controlli), "altrimenti".
 */
export function classifica(sc, codice, risposta) {
  const K = sc.classi;
  let testo = risposta;
  if (codice.pulisci) testo = testo.split("```json").join("").split("```").join("").trim();
  let dati;
  try { dati = JSON.parse(testo); } catch (e) { return { etichetta: K.unknown, passo: "json" }; }
  if (!dati || typeof dati !== "object" || Array.isArray(dati)) return { etichetta: K.unknown, passo: "json" };
  const grezza = "classification" in dati ? String(dati.classification) : sc.classe_predefinita;
  const valore = codice.normalizza ? grezza.trim().toLowerCase() : grezza;
  const forma = (e) => (codice.normalizza ? e.toLowerCase() : e);
  const scatta = (e) => (codice.confronto === "contiene" ? valore.includes(forma(e)) : valore === forma(e));
  const ordine = codice.ordine === "not_prima" ? [K.not_interested, K.interested] : [K.interested, K.not_interested];
  for (const [i, e] of ordine.entries()) if (scatta(e)) return { etichetta: e, passo: i === 0 ? "primo" : "secondo" };
  return { etichetta: K.follow_up, passo: "altrimenti" };
}
/** Esegue gli 8 casi: esito per caso e per gruppo. */
export function eseguiTest(sc, codice) {
  const casi = sc.casi.map((c) => {
    const r = classifica(sc, codice, c.risposta);
    return { id: c.id, gruppo: c.gruppo, etichetta: c.etichetta, atteso: c.atteso, uscito: r.etichetta, passo: r.passo, verde: r.etichetta === c.atteso };
  });
  const gruppi = sc.gruppi.map((g) => {
    const dentro = casi.filter((c) => c.gruppo === g.id);
    return { id: g.id, nome: g.nome, verdi: dentro.filter((c) => c.verde).length, totale: dentro.length };
  });
  return { casi, gruppi, verdi: casi.filter((c) => c.verde).length, totale: casi.length };
}
/** Perche' un caso e' rosso (dal suo esito), in una frase. */
export function percheRosso(sc, caso) {
  const T = sc.testi, K = sc.classi;
  const v = { etichetta: caso.etichetta, uscito: caso.uscito, atteso: caso.atteso };
  if (caso.uscito === K.unknown && caso.atteso !== K.unknown) return riempi(T.perche_json, v);
  if (caso.uscito === K.interested && caso.atteso === K.not_interested) return riempi(T.perche_contiene, v);
  if (caso.uscito === K.follow_up && caso.atteso !== K.follow_up) return riempi(T.perche_scrittura, v);
  return riempi(T.perche_altro, v);
}
/** Casi verdi nel lancio precedente e rossi in quello attuale. */
export function regressioni(prima, adesso) {
  if (!prima) return [];
  const verdiPrima = new Set(prima.esiti.casi.filter((c) => c.verde).map((c) => c.id));
  return adesso.esiti.casi.filter((c) => !c.verde && verdiPrima.has(c.id));
}
/**
 * Il ciclo del test di regressione sulla storia dei lanci [{codice, esiti}]: rosso (un lancio ha visto il difetto),
 * correzione (dopo quel lancio il codice e' cambiato), verde (un lancio successivo, con codice cambiato, ha 8 verdi).
 */
export function ciclo(storia, codiceAttuale, idDifetto) {
  const iRosso = storia.findIndex((l) => l.esiti.casi.some((c) => c.id === idDifetto && !c.verde));
  if (iRosso < 0) return { rosso: false, correzione: false, verde: false };
  const base = storia[iRosso].codice;
  const dopo = storia.slice(iRosso + 1);
  const correzione = dopo.some((l) => !stessoCodice(l.codice, base)) || !stessoCodice(codiceAttuale, base);
  const verde = dopo.some((l) => !stessoCodice(l.codice, base) && l.esiti.verdi === l.esiti.totale);
  return { rosso: true, correzione, verde };
}
/** Chiave del cesto per un'etichetta. */
export function cestoDi(sc, etichetta) {
  return Object.keys(sc.classi).find((k) => sc.classi[k] === etichetta);
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  if (!contesto || !contesto.lingua) throw new Error("contesto.lingua mancante");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));

  const s = { vista: sc.viste[0], fissate: false, pulite: false, quando: QUANDO[0], base: sc.basi[0].id, chiave: "ambiente", modello: "vero",
    ...sc.codice_repo, lanciato: false };
  // stato della sequenza animata
  let mostrati = Infinity;     // righe/giri/casi gia' comparsi
  let storia = [];             // lanci del test dall'ultimo applica: [{codice, esiti}]
  let generazione = 0;
  let timer = [];
  const ferma = () => { generazione += 1; timer.forEach(clearTimeout); timer = []; };

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const gruppo = (etichetta, valori, chiave, testo) => el("div", { class: "segmentato", role: "group", "aria-label": etichetta, "data-chiave": chiave },
    ...valori.map((v) => el("button", { "data-v": v, onclick: () => cambia({ [chiave]: v }) }, testo(v))));
  const interruttore = (testo, chiave) => {
    const inp = el("input", { type: "checkbox", "aria-label": testo, onchange: (e) => cambia({ [chiave]: e.target.checked }) });
    return { nodo: el("label", { class: "interruttore" }, el("span", {}, testo), inp), inp, chiave };
  };
  const segVista = gruppo(E.vista, sc.viste, "vista", (v) => E[`vista_${v}`]);
  const segQuando = gruppo(E.quando, QUANDO, "quando", (v) => E[`quando_${v}`]);
  const segBase = gruppo(E.base, sc.basi.map((b) => b.id), "base", (v) => sc.basi.find((b) => b.id === v).immagine);
  const segChiave = gruppo(E.chiave, CHIAVI, "chiave", (v) => E[`chiave_${v}`]);
  const segModello = gruppo(E.modello, MODELLI, "modello", (v) => E[`modello_${v}`]);
  const segOrdine = gruppo(E.ordine, ORDINI, "ordine", (v) => E[`ordine_${v}`]);
  segOrdine.classList.add("verticale");
  const segConfronto = gruppo(E.confronto, CONFRONTI, "confronto", (v) => E[`confronto_${v}`]);
  const inFissate = interruttore(E.fissate, "fissate");
  const inPulite = interruttore(E.pulite, "pulite");
  const inNormalizza = interruttore(E.normalizza, "normalizza");
  const inPulisci = interruttore(E.pulisci, "pulisci");
  const btnLancia = el("button", { class: "btn btn-primario", onclick: lancia }, E.lancia);
  const btnRiparti = el("button", { class: "btn btn-fantasma", onclick: riparti }, E.riparti);
  const zone = {
    dipendenze: el("div", {}, inFissate.nodo, inPulite.nodo, el("h4", {}, E.quando), segQuando, el("h4", {}, E.base), segBase),
    ambiente: el("div", {}, el("h4", {}, E.chiave), segChiave, el("h4", {}, E.modello), segModello),
    filtro: el("div", {}, el("h4", {}, E.ordine), segOrdine, el("h4", {}, E.confronto), segConfronto, inNormalizza.nodo, inPulisci.nodo,
      el("div", { class: "fila-btn-fb" }, btnLancia, btnRiparti)),
  };
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, ...Object.values(zone));

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  const titolo = testoSvg({ x: W / 2, y: 24, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: C.tenue, "letter-spacing": ".06em" }, "");
  const gScena = svgEl("g");
  svg.append(titolo, gScena);
  const esiti = el("section", { class: "esiti-filtro", "aria-live": "polite", "aria-label": E.esiti });
  scena.append(svg, esiti);
  const destra = el("aside", { class: "pannello destra" });
  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}${ridotto ? " ridotto" : ""}` }, comandi, scena, destra));

  const ultimoLancio = () => storia.at(-1) || null;
  const lancioValido = () => s.lanciato && ultimoLancio() && stessoCodice(ultimoLancio().codice, codiceDi(s));

  // ---------------- vista dipendenze
  function disegnaDipendenze(g) {
    const righe = righeRequisiti(sc, s);
    const intest = [[DIP.xRiga, E.col_riga], [DIP.xUso, E.col_uso], [DIP.xOggi, E.col_oggi], [DIP.xPoi, E.col_poi]];
    for (const [x, t] of intest) g.append(testoSvg({ x, y: 54, "font-size": 9.5, "font-weight": 800, fill: C.tenue, "letter-spacing": ".05em" }, t.toUpperCase()));
    righe.forEach((r, i) => {
      if (i >= mostrati) return;
      const y = DIP.y0 + i * DIP.passo;
      const op = r.tolta ? 0.4 : 1;
      const gr = svgEl("g", { opacity: op });
      gr.append(svgEl("rect", { x: 12, y: y - 15, width: W - 24, height: DIP.passo - 4, rx: 7, fill: i % 2 ? "#f8fafc" : "#fff" }));
      gr.append(testoSvg({ x: DIP.xRiga, y, "font-size": 10.5, "font-family": MONO, fill: C.scuro, "text-decoration": r.tolta ? "line-through" : "none" },
        riempi(r.fissata ? T.riga_fissata : T.riga_libera, { nome: r.nome })));
      const inutile = r.uso === "inutile";
      gr.append(svgEl("rect", { x: DIP.xUso, y: y - 12, width: 156, height: 17, rx: 8, fill: inutile ? C.avvisoChiaro : "#eef2ff" }),
        testoSvg({ x: DIP.xUso + 8, y: y + 0.5, "font-size": 9.5, "font-weight": 700, fill: inutile ? "#92400e" : "#3730a3" }, sc.usi[r.uso]));
      const cella = (x, testo, fondo, colore) => {
        gr.append(svgEl("rect", { x, y: y - 12, width: DIP.wCella, height: 17, rx: 8, fill: fondo }),
          testoSvg({ x: x + 8, y: y + 0.5, "font-size": 9.5, "font-weight": 700, fill: colore }, testo));
      };
      if (r.tolta) { cella(DIP.xOggi, T.cella_tolta, "#f1f5f9", C.tenue); cella(DIP.xPoi, T.cella_tolta, "#f1f5f9", C.tenue); }
      else {
        cella(DIP.xOggi, r.fissata ? T.cella_fissata_oggi : T.cella_libera_oggi, r.fissata ? C.okChiaro : "#f1f5f9", r.fissata ? "#166534" : C.scuro);
        if (s.quando === "oggi") cella(DIP.xPoi, T.cella_non_costruita, "#f8fafc", "#94a3b8");
        else cella(DIP.xPoi, r.fissata ? T.cella_fissata_poi : T.cella_libera_poi, r.fissata ? C.okChiaro : C.avvisoChiaro, r.fissata ? "#166534" : "#92400e");
      }
      g.append(gr);
    });
    const R = riepilogoDipendenze(sc, s);
    const yb = DIP.y0 + sc.requisiti.length * DIP.passo + 2;
    const base = R.base;
    g.append(svgEl("rect", { x: 12, y: yb, width: W - 24, height: 40, rx: 9, fill: base.supportata ? C.okChiaro : C.avvisoChiaro, stroke: base.supportata ? C.ok : C.avviso }),
      testoSvg({ x: 24, y: yb + 24, "font-size": 10.5, "font-family": MONO, "font-weight": 700, fill: C.scuro }, `FROM ${base.immagine}`));
    aCapo(riempi(base.supportata ? T.esito_base_ok : T.esito_base_vecchia, { immagine: base.immagine, minimo: sc.python_minimo }), BASE_CARATTERI).slice(0, 2)
      .forEach((r, k) => g.append(testoSvg({ x: 240, y: yb + 17 + k * 13, "font-size": 9.5, fill: base.supportata ? "#166534" : "#92400e" }, r)));
    const ygar = yb + 60;
    g.append(testoSvg({ x: 20, y: ygar, "font-size": 11, "font-weight": 800, fill: R.garantite === R.righe ? C.ok : C.male },
      riempi(T.garantite, { n: R.garantite, totale: R.righe })));
    aCapo(T.nota_versione, 110).slice(0, 1).forEach((r) => g.append(testoSvg({ x: 20, y: ygar + 16, "font-size": 9, "font-style": "italic", fill: C.tenue }, r)));
  }

  // ---------------- vista chiave e test
  function disegnaAmbiente(g) {
    const [xr, xa, xt] = AMB.xs;
    const scatola = (x, titoloBox, colore) => {
      g.append(svgEl("rect", { x, y: AMB.y, width: AMB.w, height: AMB.h, rx: 12, fill: "#fff", stroke: colore, "stroke-width": 1.8 }),
        testoSvg({ x: x + 12, y: AMB.y + 20, "font-size": 11, "font-weight": 800, fill: C.scuro }, titoloBox));
    };
    scatola(xr, E.box_repo, s.chiave === "repo" ? C.male : C.bordo);
    scatola(xa, E.box_ambiente, s.chiave === "ambiente" ? C.ok : C.bordo);
    scatola(xt, E.box_test, C.bordo);
    for (const x of [xr + AMB.w + 4, xa + AMB.w + 4]) g.append(svgEl("path", { d: `M${x} ${AMB.y + AMB.h / 2} l26 0 m-6 -6 l6 6 l-6 6`, fill: "none", stroke: "#7c86a2", "stroke-width": 2 }));
    g.append(testoSvg({ x: xr + 12, y: AMB.y + 44, "font-size": 9.5, "font-family": MONO, fill: C.scuro }, E.riga_esempio));
    const pillola = (x, y, testo, fondo, colore) => {
      const w = Math.min(AMB.w - 24, testo.length * 6 + 16);
      g.append(svgEl("rect", { x, y, width: w, height: 20, rx: 10, fill: fondo }), testoSvg({ x: x + 8, y: y + 14, "font-size": 9.5, "font-weight": 800, "font-family": MONO, fill: colore }, testo));
    };
    if (s.chiave === "repo") {
      aCapo(E.riga_env_repo, 30).forEach((r, k) => g.append(testoSvg({ x: xr + 12, y: AMB.y + 64 + k * 13, "font-size": 9.5, "font-family": MONO, "font-weight": 700, fill: C.male }, r)));
      g.append(testoSvg({ x: xr + 12, y: AMB.y + 104, "font-size": 9.5, "font-weight": 700, fill: C.male }, `⚠ ${E.nella_cronologia}`));
    }
    if (s.chiave === "ambiente") {
      pillola(xa + 12, AMB.y + 36, "GROQ_API_KEY", C.okChiaro, "#166534");
      aCapo(E.segreto, 30).forEach((r, k) => g.append(testoSvg({ x: xa + 12, y: AMB.y + 76 + k * 13, "font-size": 9.5, fill: C.tenue }, r)));
    } else {
      g.append(svgEl("rect", { x: xa + 12, y: AMB.y + 36, width: 130, height: 20, rx: 10, fill: "none", stroke: "#94a3b8", "stroke-dasharray": "4 3" }),
        testoSvg({ x: xa + 22, y: AMB.y + 50, "font-size": 9.5, fill: "#94a3b8" }, E.nessuna_chiave));
    }
    aCapo(E.test_caso, 30).forEach((r, k) => g.append(testoSvg({ x: xt + 12, y: AMB.y + 44 + k * 13, "font-size": 9.5, fill: C.scuro }, r)));
    // modello
    const vero = s.modello === "vero";
    const ym = AMB.y + AMB.h + 18;
    const testoModello = vero ? riempi(E.modello_vero_box, { m: sc.modello_vero, t: sc.temperatura }) : E.modello_finto_box;
    g.append(svgEl("rect", { x: xa, y: ym, width: xt + AMB.w - xa, height: 34, rx: 10, fill: vero ? C.avvisoChiaro : C.okChiaro, stroke: vero ? C.avviso : C.ok }),
      testoSvg({ x: xa + 14, y: ym + 21.5, "font-size": 10.5, "font-weight": 700, fill: vero ? "#92400e" : "#166534" }, aCapo(testoModello, 70)[0]));
    g.append(svgEl("path", { d: `M${xt + AMB.w / 2} ${AMB.y + AMB.h} l0 18`, stroke: "#7c86a2", "stroke-width": 2 }));
    // tre giri
    const giri = giriTest(sc, s);
    const yg = ym + 56;
    giri.forEach((esito, i) => {
      const x = AMB.xs[i];
      const visibile = i < mostrati;
      const colore = !visibile ? C.bordo : esito === "verde" ? C.ok : esito === "rosso" ? C.male : C.tenue;
      const fondo = !visibile ? "#f8fafc" : esito === "verde" ? C.okChiaro : esito === "rosso" ? C.maleChiaro : "#e2e8f0";
      g.append(svgEl("rect", { x, y: yg, width: AMB.w, height: 46, rx: 12, fill: fondo, stroke: colore, "stroke-width": 1.8 }),
        testoSvg({ x: x + 14, y: yg + 19, "font-size": 10.5, "font-weight": 800, fill: C.scuro }, riempi(T.giro, { n: i + 1 })),
        testoSvg({ x: x + 14, y: yg + 36, "font-size": 11, "font-weight": 800, fill: colore }, visibile ? T.giro_esito[esito] : "…"));
    });
    if (mostrati >= giri.length) {
      const giudizio = giudizioGiri(giri);
      aCapo(T[`giri_${giudizio}`], 110).slice(0, 2).forEach((r, k) => g.append(testoSvg({ x: 20, y: yg + 72 + k * 15, "font-size": 10.5, "font-weight": 700,
        fill: giudizio === "stabili_verdi" ? C.ok : giudizio === "stabili_rossi" ? C.male : C.avviso }, r)));
    }
  }

  // ---------------- vista filtro
  function disegnaFiltro(g) {
    const codice = codiceDi(s);
    const lancio = lancioValido() ? ultimoLancio() : null;
    const n = lancio ? Math.min(mostrati, sc.casi.length) : 0;
    const corrente = lancio && n >= 1 && mostrati !== Infinity ? lancio.esiti.casi[n - 1] : null;
    // risposte (chip)
    sc.casi.forEach((c, i) => {
      const x = CHIP.x0 + i * CHIP.passo;
      const fatto = lancio && i < n;
      const caso = lancio ? lancio.esiti.casi[i] : null;
      const attivo = corrente && corrente.id === c.id;
      g.append(svgEl("rect", { x, y: CHIP.y, width: CHIP.w, height: CHIP.h, rx: 10, fill: attivo ? "#eef2ff" : "#fff",
        stroke: attivo ? C.viola : fatto ? (caso.verde ? C.ok : C.male) : C.bordo, "stroke-width": attivo ? 2.4 : 1.5 }));
      g.append(testoSvg({ x: x + 8, y: CHIP.y + 15, "font-size": 10, "font-weight": 800, fill: C.viola }, String(i + 1)));
      aCapo(c.etichetta, CHIP.caratteri).slice(0, 2).forEach((r, k) => g.append(testoSvg({ x: x + 8, y: CHIP.y + 29 + k * 12, "font-size": 9, fill: C.scuro }, r)));
    });
    g.append(svgEl("path", { d: `M${W / 2} ${CHIP.y + CHIP.h + 4} l0 14 m-6 -6 l6 6 l6 -6`, fill: "none", stroke: "#7c86a2", "stroke-width": 2 }));
    // passi del filtro
    const K = sc.classi;
    const [primo, secondo] = codice.ordine === "not_prima" ? [K.not_interested, K.interested] : [K.interested, K.not_interested];
    const conf = T[`confronto_${codice.confronto}`];
    const forma = (e) => (codice.normalizza ? e.toLowerCase() : e);
    const passi = [
      { id: "pulisci", testo: T.box_pulisci, spento: !codice.pulisci },
      { id: "json", testo: T.box_json },
      { id: "normalizza", testo: T.box_normalizza, spento: !codice.normalizza },
      { id: "primo", testo: riempi(T.box_controllo, { n: 1, confronto: conf, etichetta: forma(primo) }), colpa: codice.ordine === "interested_prima" && codice.confronto === "contiene" },
      { id: "secondo", testo: riempi(T.box_controllo, { n: 2, confronto: conf, etichetta: forma(secondo) }) },
      { id: "altrimenti", testo: T.box_altrimenti },
    ];
    passi.forEach((p, i) => {
      const x = BOX.x0 + i * BOX.passo;
      const decide = corrente && corrente.passo === p.id;
      g.append(svgEl("rect", { x, y: BOX.y, width: BOX.w, height: BOX.h, rx: 10, fill: p.spento ? "#f8fafc" : decide ? "#eef2ff" : "#fff",
        stroke: decide ? C.viola : p.colpa ? C.male : p.spento ? "#94a3b8" : C.bordo, "stroke-width": decide ? 2.4 : p.colpa ? 2 : 1.5, "stroke-dasharray": p.spento ? "4 3" : "none" }));
      const righe = aCapo(p.testo, BOX.caratteri).slice(0, p.spento ? 3 : 4);
      righe.forEach((r, k) => g.append(testoSvg({ x: x + 8, y: BOX.y + 16 + k * 12, "font-size": 9.5, "font-weight": 700, fill: p.spento ? "#94a3b8" : C.scuro }, r)));
      if (p.spento) g.append(testoSvg({ x: x + 8, y: BOX.y + BOX.h - 8, "font-size": 9, "font-style": "italic", fill: "#94a3b8" }, T.box_spento));
      if (i < passi.length - 1) g.append(svgEl("path", { d: `M${x + BOX.w + 1} ${BOX.y + BOX.h / 2} l6 0`, stroke: "#7c86a2", "stroke-width": 2 }));
    });
    // cesti
    const chiavi = Object.keys(K);
    chiavi.forEach((k, i) => {
      const x = CESTO.x0 + i * CESTO.passo;
      const dentro = lancio ? lancio.esiti.casi.slice(0, n).map((c, j) => ({ ...c, j })).filter((c) => cestoDi(sc, c.uscito) === k) : [];
      g.append(svgEl("path", { d: `M${x} ${CESTO.y} l12 ${CESTO.h} l${CESTO.w - 24} 0 l12 ${-CESTO.h}`, fill: "#fff", stroke: COLORE_CESTO[k], "stroke-width": 2 }));
      g.append(testoSvg({ x: x + CESTO.w / 2, y: CESTO.y + 18, "text-anchor": "middle", "font-size": 10.5, "font-weight": 800, fill: COLORE_CESTO[k] }, K[k]));
      g.append(testoSvg({ x: x + CESTO.w / 2, y: CESTO.y + 34, "text-anchor": "middle", "font-size": 12, "font-weight": 800, fill: C.scuro }, String(dentro.length)));
      dentro.forEach((c, m) => {
        const cx = x + 30 + (m % 5) * 26, cy = CESTO.y + 52 + Math.floor(m / 5) * 20;
        const pallino = svgEl("circle", { cx, cy, r: 9, fill: c.verde ? C.ok : C.male });
        g.append(pallino, testoSvg({ x: cx, y: cy + 3.5, "text-anchor": "middle", "font-size": 9.5, "font-weight": 800, fill: "#fff" }, String(c.j + 1)));
        if (!ridotto && c.j === n - 1 && n <= sc.casi.length && pallino.animate) pallino.animate([{ transform: "translateY(-40px)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }], { duration: sc.ms.caso * 0.8, easing: "ease-in" });
      });
    });
    // tabella dei test
    sc.casi.forEach((c, i) => {
      const x = CELLA.x0 + (i % 4) * CELLA.passo, y = CELLA.y + Math.floor(i / 4) * (CELLA.h + CELLA.scarto);
      const caso = lancio && i < n ? lancio.esiti.casi[i] : null;
      const vecchio = !lancio && ultimoLancio() ? ultimoLancio().esiti.casi[i] : null;
      const colore = caso ? (caso.verde ? C.ok : C.male) : "#94a3b8";
      g.append(svgEl("rect", { x, y, width: CELLA.w, height: CELLA.h, rx: 10, fill: caso ? (caso.verde ? "#f0fdf4" : "#fff1f2") : "#f8fafc", stroke: colore, "stroke-width": 1.5 }));
      g.append(testoSvg({ x: x + 10, y: y + 16, "font-size": 9.5, "font-weight": 800, fill: C.scuro }, `${i + 1} · ${aCapo(c.etichetta, CELLA.caratteri - 4)[0]}`));
      g.append(testoSvg({ x: x + 10, y: y + 32, "font-size": 9, fill: C.tenue }, riempi(T.atteso, { x: c.atteso })));
      const terza = caso ? riempi(T.uscito, { x: caso.uscito }) : vecchio ? T.da_rilanciare : T.non_lanciato;
      g.append(testoSvg({ x: x + 10, y: y + 48, "font-size": 9, "font-weight": caso ? 700 : 400, fill: caso ? colore : "#94a3b8" }, terza));
      if (caso) g.append(testoSvg({ x: x + CELLA.w - 10, y: y + 50, "text-anchor": "end", "font-size": 16, "font-weight": 800, fill: colore }, caso.verde ? "✓" : "✗"));
    });
  }

  function disegnaScena() {
    titolo.textContent = E[`titolo_${s.vista}`];
    gScena.replaceChildren();
    ({ dipendenze: disegnaDipendenze, ambiente: disegnaAmbiente, filtro: disegnaFiltro })[s.vista](gScena);
  }

  // ---------------- esiti (dentro la scena)
  function righeEsiti() {
    const out = [];
    if (s.vista === "dipendenze") {
      const R = riepilogoDipendenze(sc, s);
      out.push(R.libere ? { tipo: "avviso", testo: riempi(T.esito_libere, { n: R.libere }) } : { tipo: "ok", testo: T.esito_fissate });
      out.push(R.inutili ? { tipo: "avviso", testo: riempi(T.esito_inutili, { n: R.inutili }) } : { tipo: "ok", testo: riempi(T.esito_pulite, { n: R.righe }) });
      out.push({ tipo: R.base.supportata ? "ok" : "avviso", testo: riempi(R.base.supportata ? T.esito_base_ok : T.esito_base_vecchia, { immagine: R.base.immagine, minimo: sc.python_minimo }) });
      if (s.quando === "oggi") out.push({ tipo: "neutro", testo: T.esito_oggi });
    } else if (s.vista === "ambiente") {
      out.push({ tipo: s.chiave === "repo" ? "male" : s.chiave === "ambiente" ? "ok" : "neutro", testo: T[`chiave_${s.chiave}`] });
      out.push({ tipo: s.modello === "vero" ? "avviso" : "ok", testo: s.modello === "vero" ? riempi(T.modello_vero, { t: sc.temperatura }) : T.modello_finto });
      const giudizio = giudizioGiri(giriTest(sc, s));
      out.push({ tipo: giudizio === "stabili_verdi" ? "ok" : giudizio === "stabili_rossi" ? "male" : "avviso", testo: T[`giri_${giudizio}`] });
    } else {
      const l = ultimoLancio();
      if (lancioValido() && mostrati >= sc.casi.length) {
        out.push({ tipo: l.esiti.verdi === l.esiti.totale ? "ok" : "male", testo: riempi(T.risultato_lancio, { n: storia.length, verdi: l.esiti.verdi, totale: l.esiti.totale }) });
        for (const r of regressioni(storia.at(-2), l)) out.push({ tipo: "male", testo: riempi(T.regressione, { etichetta: r.etichetta }) });
        for (const c of l.esiti.casi.filter((x) => !x.verde)) out.push({ tipo: "avviso", testo: percheRosso(sc, c) });
      } else if (l && !lancioValido()) out.push({ tipo: "neutro", testo: T.da_rilanciare });
      else out.push({ tipo: "neutro", testo: T.nota_banco });
    }
    return out;
  }
  function disegnaEsiti() {
    const figli = [el("h4", {}, E.esiti), el("div", { class: "esiti-elenco-fb" }, ...righeEsiti().map((r) => el("div", { class: r.tipo }, r.testo)))];
    if (s.vista === "filtro") {
      const cy = ciclo(storia, codiceDi(s), sc.caso_dei_giri);
      figli.push(el("h4", { style: "margin-top:10px" }, E.ciclo), el("div", { class: "striscia-fb" },
        el("span", { class: cy.rosso ? "fatto-rosso" : "" }, T.ciclo_rosso),
        el("span", { class: cy.correzione ? "fatto-giallo" : "" }, T.ciclo_correzione),
        el("span", { class: cy.verde ? "fatto-verde" : "" }, T.ciclo_verde)));
      const msg = cy.verde ? ["ok", T.ciclo_completo] : cy.correzione ? ["avviso", T.ciclo_da_verde] : cy.rosso ? ["avviso", T.ciclo_da_correggere] : ["neutro", T.ciclo_da_rosso];
      figli.push(el("div", { class: "esiti-elenco-fb" }, el("div", { class: msg[0] }, msg[1])));
    }
    esiti.replaceChildren(...figli);
  }

  // ---------------- pannello destro
  function disegnaDestra() {
    const figli = [];
    if (s.vista === "dipendenze") {
      const R = riepilogoDipendenze(sc, s);
      figli.push(el("h3", {}, E.vista_dipendenze), el("p", { class: "nota-fb" }, riempi(T.garantite, { n: R.garantite, totale: R.righe })),
        el("ul", { class: "parole-fb" }, ...Object.entries(sc.usi).map(([k, t]) => el("li", {}, `${t}: ${sc.requisiti.filter((r) => r.uso === k).map((r) => r.nome).join(", ")}`))),
        el("p", { class: "nota-fb" }, T.nota_versione), el("div", { class: "regola-fb" }, E.regola_dipendenze));
    } else if (s.vista === "ambiente") {
      figli.push(el("h3", {}, E.vista_ambiente), el("p", { class: "nota-fb" }, T[`chiave_${s.chiave}`]),
        el("p", { class: "nota-fb" }, s.modello === "vero" ? riempi(T.modello_vero, { t: sc.temperatura }) : T.modello_finto),
        el("div", { class: "regola-fb" }, E.regola_ambiente));
    } else {
      const codice = codiceDi(s);
      const K = sc.classi;
      const [primo, secondo] = codice.ordine === "not_prima" ? [K.not_interested, K.interested] : [K.interested, K.not_interested];
      const conf = T[`confronto_${codice.confronto}`];
      const forma = (e) => (codice.normalizza ? e.toLowerCase() : e);
      const P = T.versione_parole;
      const pre = el("div", { class: "codice-fb" }, ...sc.righe_repo.map((r) => el("div", { class: r.n === 19 || r.n === 21 ? "colpa" : "" }, el("span", { class: "num" }, `${r.n}  `), r.codice)));
      figli.push(el("h3", {}, E.codice_repo), pre, el("h3", {}, E.versione_parole),
        el("ol", { class: "parole-fb" },
          el("li", {}, codice.pulisci ? P.pulisci_si : P.pulisci_no),
          el("li", {}, T.box_json),
          el("li", {}, codice.normalizza ? P.normalizza_si : P.normalizza_no),
          el("li", {}, riempi(T.box_controllo, { n: 1, confronto: conf, etichetta: forma(primo) })),
          el("li", {}, riempi(T.box_controllo, { n: 2, confronto: conf, etichetta: forma(secondo) })),
          el("li", {}, T.box_altrimenti)));
      if (lancioValido() && mostrati >= sc.casi.length) {
        figli.push(el("h3", {}, E.gruppi), el("div", { class: "gruppi-fb" },
          ...ultimoLancio().esiti.gruppi.map((gr) => el("div", { class: gr.verdi === gr.totale ? "ok" : "male" }, riempi(T.gruppo_riga, { nome: gr.nome, verdi: gr.verdi, totale: gr.totale })))));
      }
      figli.push(el("div", { class: "regola-fb" }, E.regola));
    }
    destra.replaceChildren(...figli);
  }

  function aggiornaComandi() {
    for (const seg of [segVista, segQuando, segBase, segChiave, segModello, segOrdine, segConfronto]) {
      const k = seg.dataset.chiave;
      seg.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s[k])));
    }
    for (const i of [inFissate, inPulite, inNormalizza, inPulisci]) i.inp.checked = s[i.chiave];
    for (const [v, z] of Object.entries(zone)) z.classList.toggle("nascosto", s.vista !== v);
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaEsiti(); disegnaDestra(); }

  // ---------------- sequenze
  function sequenza(totale, ms, gen) {
    if (ridotto) { mostrati = Infinity; ridisegna(); return; }
    mostrati = 0;
    ridisegna();
    const passo = () => {
      if (gen !== generazione) return;
      mostrati += 1;
      if (mostrati >= totale) { mostrati = Infinity; ridisegna(); return; }
      ridisegna();
      timer.push(setTimeout(passo, ms));
    };
    timer.push(setTimeout(passo, ms));
  }
  function avviaVista() {
    ferma();
    const gen = generazione;
    if (s.vista === "dipendenze") sequenza(sc.requisiti.length, sc.ms.riga, gen);
    else if (s.vista === "ambiente") sequenza(sc.giri_modello_vero.length, sc.ms.giro, gen);
    else if (s.lanciato) { registraLancio(); sequenza(sc.casi.length, sc.ms.caso, gen); }
    else { mostrati = Infinity; ridisegna(); }
  }
  function registraLancio() {
    storia.push({ codice: codiceDi(s), esiti: eseguiTest(sc, codiceDi(s)) });
  }

  // ---------------- azioni
  function cambia(diff) {
    const vistaCambiata = "vista" in diff && diff.vista !== s.vista;
    const quandoCambiato = "quando" in diff && diff.quando !== s.quando;
    const giriCambiati = ("chiave" in diff && diff.chiave !== s.chiave) || ("modello" in diff && diff.modello !== s.modello);
    const codiceCambiato = ["ordine", "confronto", "normalizza", "pulisci"].some((k) => k in diff && diff[k] !== s[k]);
    Object.assign(s, diff);
    if (codiceCambiato) s.lanciato = false;
    if (vistaCambiata) { s.lanciato = s.vista === "filtro" && lancioValido() ? s.lanciato : false; ferma(); mostrati = Infinity; ridisegna(); return; }
    if (quandoCambiato || giriCambiati) { avviaVista(); return; }
    ferma();
    mostrati = Infinity;
    ridisegna();
  }
  function lancia() {
    if (s.vista !== "filtro") s.vista = "filtro";
    s.lanciato = true;
    ferma();
    registraLancio();
    sequenza(sc.casi.length, sc.ms.caso, generazione);
  }
  function riparti() {
    ferma();
    Object.assign(s, sc.codice_repo, { lanciato: false });
    storia = [];
    mostrati = Infinity;
    ridisegna();
  }

  // ---------------- applica (sequenza rilanciabile)
  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    const scelta = (k, ammessi) => { if (!ammessi.includes(nuovo[k])) throw new Error(`stato_animazione: ${k} sconosciuto «${nuovo[k]}»`); };
    scelta("vista", sc.viste);
    scelta("quando", QUANDO);
    scelta("base", sc.basi.map((b) => b.id));
    scelta("chiave", CHIAVI);
    scelta("modello", MODELLI);
    scelta("ordine", ORDINI);
    scelta("confronto", CONFRONTI);
    for (const k of ["fissate", "pulite", "normalizza", "pulisci", "lanciato"]) if (typeof nuovo[k] !== "boolean") throw new Error(`stato_animazione: ${k} deve essere vero/falso`);
    Object.assign(s, nuovo);
    storia = [];
    avviaVista();
  }
  applica({});
  return {
    applica,
    distruggi() { ferma(); },
    _prova: { stato: s, lancia, riparti, storia: () => storia.slice(), mostrati: () => mostrati, ciclo: () => ciclo(storia, codiceDi(s), sc.caso_dei_giri) },
  };
}
