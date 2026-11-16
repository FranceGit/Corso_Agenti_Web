// Lezione interattiva "Il CRM in pianta" (PO3.1, Officina O3). La pianta di nebula-insurance-crm come planimetria:
// l'ala del BLUEPRINT (contesto, piattaforma, moduli e flussi, autorizzazione, API), l'ala delle cartelle accanto
// (decisioni ADR, matrice di autorizzazione, schemi JSON) e il cantiere del codice. Lo studente sceglie una domanda
// concreta, clicca la stanza dove pensa sia la risposta (giusta / vicina / lontana) e poi fa scorrere il percorso:
// le stanze si accendono una dopo l'altra (principio -> meccanismo -> regola puntuale). Vista "moduli": il monolite
// modulare con le entita' possedute da ciascun modulo e chi legge da chi. Vista "Decidi tu": otto frasi da
// classificare in blueprint / architettura / decisione / codice, con il perche'. Tutti i testi vengono dallo scenario.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "pianta_crm";
const VISTE = ["pianta", "moduli", "classifica"];
const W = 720, H = 440;
const ALI = {
  blueprint: { x: 14, y: 40, w: 336, h: 330, sx: 26, sw: 312, sh: 50, y0: 66, passo: 60 },
  cartelle: { x: 366, y: 40, w: 340, h: 222, sx: 378, sw: 316, sh: 54, y0: 66, passo: 64 },
  codice: { x: 366, y: 278, w: 340, h: 92, sx: 378, sw: 316, sh: 54, y0: 304, passo: 64 },
};
const MOD = { x0: 28, passoX: 170, y0: 72, passoY: 166, w: 158, h: 150 };
const FRASE = { x: 20, y0: 44, passo: 46, w: 680, h: 40 };
const COLORE = { giusta: "#16a34a", vicina: "#d97706", lontana: "#dc2626", libera: "#4f46e5" };

const STILE = `
.lz-pianta_crm .stanza, .lz-pianta_crm .modulo { cursor: pointer; }
.lz-pianta_crm .stanza:focus-visible rect, .lz-pianta_crm .modulo:focus-visible rect { stroke: #4f46e5; stroke-width: 3.5; }
.lz-pianta_crm .lettore { transition: transform .5s cubic-bezier(.2,.8,.2,1); }
.lz-pianta_crm.ferma .lettore { transition: none; }
.lz-pianta_crm .nota-pc { font-size: .78rem; color: var(--tenue); margin: 6px 0 0; }
.lz-pianta_crm .domanda-pc { display: grid; gap: 4px; margin: 6px 0; font-size: .82rem; }
.lz-pianta_crm .domanda-pc select { width: 100%; }
.lz-pianta_crm .scelta-pc { display: grid; gap: 3px; margin: 6px 0; font-size: .8rem; }
.lz-pianta_crm .scheda-pc { font-size: .84rem; display: grid; gap: 6px; }
.lz-pianta_crm .scheda-pc code { font-size: .76rem; color: #3730a3; overflow-wrap: anywhere; }
.lz-pianta_crm .regola-pc { margin-top: 10px; padding: 8px 10px; border-left: 4px solid #4f46e5; background: #eef2ff; border-radius: 0 10px 10px 0; font-weight: 700; font-size: .82rem; }
.lz-pianta_crm .esiti-pianta { margin-top: 10px; border-top: 1px solid #dfe4f0; padding: 10px 4px 2px; }
.lz-pianta_crm .esiti-pianta h4 { margin: 0 0 6px; font-size: .8rem; text-transform: uppercase; letter-spacing: .07em; color: var(--tenue); }
.lz-pianta_crm .esiti-righe { display: grid; gap: 5px; margin-top: 6px; max-height: 220px; overflow-y: auto; padding-right: 4px; }
.lz-pianta_crm .esiti-righe div { font-size: .78rem; padding: 6px 9px; border-radius: 9px; overflow-wrap: anywhere; background: #f4f6fb; }
.lz-pianta_crm .esiti-righe .giusto { background: var(--ok-chiaro); color: #166534; }
.lz-pianta_crm .esiti-righe .quasi { background: var(--avviso-chiaro); color: #92400e; }
.lz-pianta_crm .esiti-righe .sbagliato, .lz-pianta_crm .esiti-righe .vuoto { background: var(--male-chiaro); color: #9f1239; }
.lz-pianta_crm .esiti-righe .tappa-pc { background: #eef2ff; color: #3730a3; }
.lz-pianta_crm .esiti-righe .dove-pc { background: var(--ok-chiaro); color: #166534; font-weight: 700; }
`;

function svgEl(tag, attr) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attr || {})) e.setAttribute(k, v);
  return e;
}
function t(attr, testo) {
  const x = svgEl("text", attr);
  x.textContent = testo;
  return x;
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

// ------------------------------------------------------------------ logica (pura)

export function riempi(modello, valori) {
  return modello.replace(/\{(\w+)\}/g, (_, k) => {
    if (!(k in valori)) throw new Error(`segnaposto {${k}} senza valore`);
    return valori[k];
  });
}
/** Spezza un testo in righe di al massimo n caratteri (a parole). */
export function aCapo(testo, n) {
  const righe = [];
  let riga = "";
  for (const p of String(testo).split(" ")) {
    if (riga && (riga + " " + p).length > n) { righe.push(riga); riga = p; } else riga = riga ? `${riga} ${p}` : p;
  }
  if (riga) righe.push(riga);
  return righe;
}
/** Posizione e dimensioni di ogni stanza nella pianta (ala per ala, nell'ordine dello scenario). */
export function posizioniStanze(sc) {
  const conta = { blueprint: 0, cartelle: 0, codice: 0 };
  const pos = {};
  for (const st of sc.stanze) {
    const a = ALI[st.ala];
    if (!a) throw new Error(`stanza ${st.id}: ala sconosciuta «${st.ala}»`);
    const i = conta[st.ala]++;
    pos[st.id] = { x: a.sx, y: a.y0 + i * a.passo, w: a.sw, h: a.sh };
  }
  return pos;
}
/** Posizione di ogni modulo nella griglia 4 x 2 del monolite. */
export function posizioniModuli(sc) {
  return Object.fromEntries(sc.moduli.map((m, i) => [m.id, { x: MOD.x0 + (i % 4) * MOD.passoX, y: MOD.y0 + Math.floor(i / 4) * MOD.passoY, w: MOD.w, h: MOD.h }]));
}
/** Giudizio sulla stanza scelta come risposta: giusta, vicina (ne parla ma non e' la regola precisa), lontana; libera senza domanda. */
export function valutaIpotesi(sc, domandaId, stanzaId) {
  if (!stanzaId) return null;
  if (!domandaId) return "libera";
  const d = sc.domande.find((x) => x.id === domandaId);
  if (!d) throw new Error(`domanda sconosciuta «${domandaId}»`);
  return stanzaId === d.risposta ? "giusta" : d.vicine.includes(stanzaId) ? "vicina" : "lontana";
}
/** Le tappe del percorso di lettura di una domanda (l'ultima e' sempre la stanza della risposta). */
export function percorso(sc, domandaId) {
  const d = sc.domande.find((x) => x.id === domandaId);
  return d ? d.tappe : [];
}
/** Riscontro del gioco "Decidi tu". */
export function verifica(sc, scelte) {
  const T = sc.testi;
  const nome = (id) => sc.categorie.find((c) => c.id === id).nome;
  const righe = sc.frasi.map((f, i) => {
    const scelta = scelte[f.id] || "";
    const esito = !scelta ? "vuoto" : scelta === f.migliore ? "giusto" : f.quasi.includes(scelta) ? "quasi" : "sbagliato";
    return { id: f.id, esito, testo: riempi(T[`ver_${esito}`], { n: i + 1, migliore: nome(f.migliore), spiega: f.spiega }) };
  });
  const giuste = righe.filter((r) => r.esito === "giusto").length;
  return { righe, giuste, totali: righe.length, sintesi: giuste === righe.length ? T.ver_tutto_giusto : riempi(T.ver_punteggio, { giuste, totali: righe.length }) };
}
/** Segmento fra i centri di due riquadri, tagliato sui loro bordi (con un piccolo margine). */
export function freccia(a, b) {
  const ax = a.x + a.w / 2, ay = a.y + a.h / 2, bx = b.x + b.w / 2, by = b.y + b.h / 2;
  const dx = bx - ax, dy = by - ay;
  const taglio = (r) => Math.min(dx ? (r.w / 2 + 4) / Math.abs(dx) : Infinity, dy ? (r.h / 2 + 4) / Math.abs(dy) : Infinity);
  const ta = taglio(a), tb = taglio(b);
  return [ax + dx * ta, ay + dy * ta, bx - dx * tb, by - dy * tb];
}
export const DIMENSIONI = { w: W, h: H, ali: ALI, frase: FRASE };

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const lingua = contesto && contesto.lingua;
  if (!lingua) throw new Error("contesto.lingua mancante");
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));
  const stanza = Object.fromEntries(sc.stanze.map((x) => [x.id, x]));
  const modulo = Object.fromEntries(sc.moduli.map((x) => [x.id, x]));
  const domanda = (id) => sc.domande.find((x) => x.id === id);
  const POS = posizioniStanze(sc);
  const PM = posizioniModuli(sc);

  const s = { vista: "pianta", domanda: "", ipotesi: "", percorso: false, modulo_aperto: sc.moduli[0].id, scelte: {}, verificato: false };
  let rivelate = Infinity; // elementi della scena gia' comparsi nella sequenza di costruzione
  let tappeAccese = 0; // tappe del percorso gia' illuminate
  let timer = [];
  const pulisci = () => { timer.forEach((x) => clearTimeout(x)); timer = []; };
  const dopo = (ms, fn) => { timer.push(setTimeout(fn, ms)); };

  // ------------------------------------------------ comandi
  const segVista = el("div", { class: "segmentato", role: "group", "aria-label": E.vista },
    ...VISTE.map((v) => el("button", { "data-v": v, onclick: () => cambia({ vista: v }) }, E[`vista_${v}`])));
  const selDomanda = el("select", { "aria-label": E.domanda, onchange: (e) => cambia({ domanda: e.target.value, ipotesi: "", percorso: false }) },
    el("option", { value: "" }, E.nessuna_domanda), ...sc.domande.map((d) => el("option", { value: d.id }, d.testo)));
  const btnPercorso = el("button", { class: "btn btn-primario", style: "width:100%;justify-content:center;margin-top:6px", onclick: () => mostraPercorso() }, E.mostra_percorso);
  const zonaPianta = el("div", {}, el("label", { class: "domanda-pc" }, el("span", {}, E.domanda), selDomanda), btnPercorso, el("p", { class: "nota-pc" }, E.nota_pianta));
  const zonaModuli = el("div", {}, el("p", { class: "nota-pc" }, E.nota_moduli));
  const tendine = {};
  const zonaClassifica = el("div", {});
  sc.frasi.forEach((f, i) => {
    const sel = el("select", { "aria-label": riempi(T.scegli_per, { n: i + 1 }), onchange: (e) => scegli(f.id, e.target.value) },
      el("option", { value: "" }, E.scegli), ...sc.categorie.map((c) => el("option", { value: c.id }, c.nome)));
    tendine[f.id] = sel;
    zonaClassifica.append(el("label", { class: "scelta-pc" }, el("span", {}, riempi(T.frase, { n: i + 1 })), sel));
  });
  zonaClassifica.append(el("button", { class: "btn btn-primario", style: "width:100%;justify-content:center;margin-top:6px", onclick: () => cambia({ verificato: true }) }, E.controlla));
  const comandi = el("aside", { class: "pannello" }, el("h3", {}, E.titolo_comandi), el("h4", {}, E.vista), segVista, zonaPianta, zonaModuli, zonaClassifica);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs><marker id="pc-punta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="#16a34a"/></marker></defs>`;
  const titolo = t({ x: W / 2, y: 24, "text-anchor": "middle", "font-size": 11.5, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".05em" }, "");
  const gScena = svgEl("g");
  svg.append(titolo, gScena);
  const esiti = el("section", { class: "esiti-pianta", "aria-live": "polite", "aria-label": E.titolo_esiti });
  scena.append(svg, esiti);
  const destra = el("aside", { class: "pannello destra", "aria-live": "polite" });
  const banco = el("div", { class: `banco lz-${COMPONENTE}${ridotto ? " ferma" : ""}` }, comandi, scena, destra);
  radice.replaceChildren(banco);

  function bottone(g, etichetta, azione) {
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute("aria-label", etichetta);
    g.addEventListener("click", azione);
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); azione(); } });
  }

  function disegnaPianta(g) {
    const tappe = percorso(sc, s.domanda);
    const accese = s.percorso ? tappe.slice(0, tappeAccese) : [];
    const giudizio = valutaIpotesi(sc, s.domanda, s.ipotesi);
    for (const [id, a] of Object.entries(ALI)) {
      g.append(svgEl("rect", { x: a.x, y: a.y, width: a.w, height: a.h, rx: 14, fill: id === "codice" ? "#fff7ed" : "#f5f3ff", stroke: id === "codice" ? "#fdba74" : "#c7d2fe", "stroke-width": 1.5, "stroke-dasharray": id === "codice" ? "6 4" : "none" }),
        t({ x: a.x + 12, y: a.y + 16, "font-size": 9.5, "font-weight": 800, fill: id === "codice" ? "#9a3412" : "#3730a3", "font-family": "monospace" }, E[`ala_${id}`]));
    }
    sc.stanze.forEach((st, k) => {
      const p = POS[st.id];
      const n = accese.findIndex((x) => x.stanza === st.id);
      const finale = n >= 0 && n === tappe.length - 1;
      const aperta = st.id === s.ipotesi;
      const gs = svgEl("g", { class: "stanza", opacity: k < rivelate ? 1 : 0 });
      const bordo = aperta ? COLORE[giudizio] : finale ? COLORE.giusta : n >= 0 ? "#4f46e5" : "#cbd2e3";
      gs.append(svgEl("rect", { x: p.x, y: p.y, width: p.w, height: p.h, rx: 10, fill: finale ? "#ecfdf5" : n >= 0 ? "#eef2ff" : "#fff", stroke: bordo, "stroke-width": aperta || n >= 0 ? 3 : 1.5 }));
      aCapo(st.nome, sc.a_capo.nome_stanza).slice(0, 1).forEach((r) => gs.append(t({ x: p.x + 12, y: p.y + 20, "font-size": 11, "font-weight": 800, fill: "#17203b" }, r)));
      gs.append(t({ x: p.x + 12, y: p.y + 37, "font-size": 9.5, fill: "#5b6684", "font-family": "monospace" }, st.file));
      if (n >= 0) {
        gs.append(svgEl("circle", { cx: p.x + p.w - 20, cy: p.y + p.h / 2, r: 11, fill: finale ? COLORE.giusta : "#4f46e5" }),
          t({ x: p.x + p.w - 20, y: p.y + p.h / 2 + 4, "text-anchor": "middle", "font-size": 11, "font-weight": 800, fill: "#fff" }, finale ? "✓" : String(n + 1)));
      } else if (aperta) {
        gs.append(svgEl("circle", { cx: p.x + p.w - 20, cy: p.y + p.h / 2, r: 7, fill: COLORE[giudizio] }));
      }
      bottone(gs, riempi(T.apri_stanza, { nome: st.nome }), () => cambia({ ipotesi: st.id }, true));
      g.append(gs);
    });
    // il lettore che percorre le tappe
    if (accese.length) {
      const p = POS[accese.at(-1).stanza];
      const lettore = svgEl("g", { class: "lettore" });
      lettore.style.transform = `translate(${p.x + p.w - 46}px, ${p.y + p.h / 2}px)`;
      lettore.setAttribute("transform", `translate(${p.x + p.w - 46},${p.y + p.h / 2})`);
      lettore.append(svgEl("circle", { r: 6, fill: "#f59e0b", stroke: "#fff", "stroke-width": 2 }));
      g.append(lettore);
    }
    // la domanda in fondo alla pianta
    const testo = s.domanda ? domanda(s.domanda).testo : T.nessuna;
    aCapo(testo, 110).slice(0, 3).forEach((r, k) => g.append(t({ x: 20, y: 392 + k * 14, "font-size": 10.5, "font-weight": s.domanda ? 700 : 400, fill: s.domanda ? "#17203b" : "#5b6684", "font-style": s.domanda ? "normal" : "italic" }, r)));
  }

  function disegnaModuli(g) {
    g.append(svgEl("rect", { x: 14, y: 40, width: 692, height: 372, rx: 16, fill: "#f8fafc", stroke: "#94a3b8", "stroke-width": 1.5 }),
      t({ x: 26, y: 58, "font-size": 9.5, "font-weight": 800, fill: "#334155" }, E.monolite));
    const aperto = modulo[s.modulo_aperto];
    sc.moduli.forEach((m, k) => {
      const p = PM[m.id];
      const letto = aperto.legge.includes(m.id);
      const gm = svgEl("g", { class: "modulo", opacity: k < rivelate ? 1 : 0 });
      gm.append(svgEl("rect", { x: p.x, y: p.y, width: p.w, height: p.h, rx: 12, fill: m.id === aperto.id ? "#eef2ff" : letto ? "#f0fdf4" : "#fff", stroke: m.id === aperto.id ? "#4f46e5" : letto ? "#16a34a" : "#cbd2e3", "stroke-width": m.id === aperto.id || letto ? 2.5 : 1.5 }));
      aCapo(m.nome, sc.a_capo.nome_modulo).slice(0, 2).forEach((r, i) => gm.append(t({ x: p.x + 10, y: p.y + 20 + i * 13, "font-size": 10.5, "font-weight": 800, fill: "#17203b" }, r)));
      gm.append(t({ x: p.x + 10, y: p.y + 54, "font-size": 9, "font-weight": 700, fill: "#5b6684", "letter-spacing": ".04em" }, E.possiede));
      const righe = m.entita.length ? aCapo(m.entita.join(", "), sc.a_capo.entita) : [E.nessuna_entita];
      righe.slice(0, 5).forEach((r, i) => gm.append(t({ x: p.x + 10, y: p.y + 70 + i * 14, "font-size": 10, fill: m.entita.length ? "#3730a3" : "#94a3b8", "font-style": m.entita.length ? "normal" : "italic" }, r)));
      bottone(gm, riempi(T.apri_modulo, { nome: m.nome }), () => cambia({ modulo_aperto: m.id }, true));
      g.append(gm);
    });
    // frecce di lettura (dal modulo letto a chi legge), da bordo a bordo, sopra i riquadri
    if (rivelate >= sc.moduli.length) for (const id of aperto.legge) {
      const [x1, y1, x2, y2] = freccia(PM[id], PM[aperto.id]);
      g.append(svgEl("line", { x1, y1, x2, y2, stroke: "#16a34a", "stroke-width": 2.5, "marker-end": "url(#pc-punta)" }));
    }
  }

  function disegnaClassifica(g) {
    const v = s.verificato ? verifica(sc, s.scelte) : null;
    const colore = { giusto: "#16a34a", quasi: "#d97706", sbagliato: "#dc2626", vuoto: "#dc2626" };
    sc.frasi.forEach((f, i) => {
      const y = FRASE.y0 + i * FRASE.passo;
      const scelta = s.scelte[f.id];
      const esito = v ? v.righe[i].esito : null;
      const gf = svgEl("g", { opacity: i < rivelate ? 1 : 0 });
      gf.append(svgEl("rect", { x: FRASE.x, y, width: FRASE.w, height: FRASE.h, rx: 10, fill: "#fff", stroke: esito ? colore[esito] : scelta ? "#4f46e5" : "#cbd2e3", "stroke-width": esito ? 2.5 : 1.5 }),
        t({ x: FRASE.x + 16, y: y + 25, "text-anchor": "middle", "font-size": 12, "font-weight": 900, fill: "#4f46e5" }, String(i + 1)));
      aCapo(f.testo, sc.a_capo.frase).slice(0, 2).forEach((r, k) => gf.append(t({ x: FRASE.x + 32, y: y + 16 + k * 14, "font-size": 10, fill: "#17203b" }, r)));
      if (scelta) gf.append(t({ x: FRASE.x + FRASE.w - 10, y: y + 16, "text-anchor": "end", "font-size": 9.5, "font-weight": 800, fill: esito ? colore[esito] : "#4f46e5" }, sc.categorie.find((c) => c.id === scelta).nome));
      if (esito) gf.append(t({ x: FRASE.x + FRASE.w - 10, y: y + 31, "text-anchor": "end", "font-size": 11, "font-weight": 900, fill: colore[esito] }, esito === "giusto" ? "✓" : esito === "quasi" ? "~" : "✗"));
      g.append(gf);
    });
  }

  function disegnaScena() {
    titolo.textContent = E[`titolo_${s.vista}`];
    gScena.replaceChildren();
    ({ pianta: disegnaPianta, moduli: disegnaModuli, classifica: disegnaClassifica })[s.vista](gScena);
  }

  function disegnaEsiti() {
    const figli = [el("h4", {}, E.titolo_esiti)];
    if (s.vista === "pianta") {
      const giudizio = valutaIpotesi(sc, s.domanda, s.ipotesi);
      const classe = { giusta: "ok", vicina: "avviso", lontana: "male", libera: "neutro" };
      if (!s.ipotesi) figli.push(el("div", { class: "esito-scheda neutro" }, el("div", {}, s.domanda ? T.in_attesa : T.nessuna)));
      else figli.push(el("div", { class: `esito-scheda ${classe[giudizio]}` }, el("div", {}, riempi(T[`ipotesi_${giudizio}`], { stanza: stanza[s.ipotesi].nome }))));
      if (s.percorso) {
        const tappe = percorso(sc, s.domanda);
        const righe = tappe.slice(0, tappeAccese).map((x, i) => el("div", { class: "tappa-pc" }, riempi(T.tappa, { n: i + 1, stanza: stanza[x.stanza].nome, nota: x.nota })));
        if (tappeAccese >= tappe.length) righe.push(el("div", { class: "dove-pc" }, riempi(T.dove, { dove: domanda(s.domanda).dove })));
        figli.push(el("div", { class: "esiti-righe" }, righe));
      }
    } else if (s.vista === "moduli") {
      const m = modulo[s.modulo_aperto];
      figli.push(el("div", { class: "esito-scheda neutro" }, el("div", {}, m.entita.length ? riempi(T.modulo_aperto, { nome: m.nome, entita: m.entita.join(", ") }) : riempi(T.modulo_vuoto, { nome: m.nome }))));
      if (m.legge.length) figli.push(el("div", { class: "esiti-righe" }, el("div", { class: "tappa-pc" }, riempi(T.modulo_legge, { moduli: m.legge.map((id) => modulo[id].nome).join(", ") }))));
    } else if (!s.verificato) {
      figli.push(el("p", { class: "nota-pc" }, T.non_verificato), el("div", { class: "esito-scheda neutro" }, el("div", {}, riempi(T.scelte_fatte, { n: Object.keys(s.scelte).length, tot: sc.frasi.length }))));
    } else {
      const v = verifica(sc, s.scelte);
      figli.push(el("div", { class: `esito-scheda ${v.giuste === v.totali ? "ok" : "avviso"}` }, el("div", {}, v.sintesi)),
        el("div", { class: "esiti-righe" }, v.righe.map((r) => el("div", { class: r.esito }, r.testo))));
    }
    esiti.replaceChildren(...figli);
  }

  function disegnaDestra() {
    const figli = [el("h3", {}, s.vista === "classifica" ? E.titolo_categorie : E.titolo_destra)];
    if (s.vista === "pianta") {
      const tappe = s.percorso ? percorso(sc, s.domanda).slice(0, tappeAccese) : [];
      const id = s.ipotesi || (tappe.length ? tappe.at(-1).stanza : "");
      if (id) {
        const st = stanza[id];
        figli.push(el("div", { class: "scheda-pc" }, el("b", {}, st.nome), el("code", {}, st.file), el("div", {}, st.contiene)));
      } else figli.push(el("p", { class: "nota-pc" }, E.nota_pianta));
    } else if (s.vista === "moduli") {
      const m = modulo[s.modulo_aperto];
      figli.push(el("div", { class: "scheda-pc" }, el("b", {}, m.nome), el("div", {}, m.nota)));
    } else {
      figli.push(el("div", { class: "scheda-pc" }, sc.categorie.map((c) => el("div", {}, el("b", {}, c.nome), ` — ${c.spiega}`))));
    }
    figli.push(el("div", { class: "regola-pc" }, E.regola));
    destra.replaceChildren(...figli);
    if (!ridotto && destra.animate) destra.animate([{ opacity: 0.5 }, { opacity: 1 }], { duration: 200 });
  }

  function aggiornaComandi() {
    segVista.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.vista)));
    selDomanda.value = s.domanda;
    btnPercorso.disabled = !s.domanda;
    zonaPianta.classList.toggle("nascosto", s.vista !== "pianta");
    zonaModuli.classList.toggle("nascosto", s.vista !== "moduli");
    zonaClassifica.classList.toggle("nascosto", s.vista !== "classifica");
    for (const [id, sel] of Object.entries(tendine)) sel.value = s.scelte[id] || "";
  }
  function ridisegna() { aggiornaComandi(); disegnaScena(); disegnaEsiti(); disegnaDestra(); }

  // ------------------------------------------------ sequenze animate
  function quanti() { return s.vista === "pianta" ? sc.stanze.length : s.vista === "moduli" ? sc.moduli.length : sc.frasi.length; }
  function avviaPercorso(ritardo) {
    const n = percorso(sc, s.domanda).length;
    if (ridotto) { tappeAccese = n; ridisegna(); return; }
    tappeAccese = 0;
    ridisegna();
    for (let i = 1; i <= n; i++) dopo(ritardo + i * sc.ms_tappa, () => { tappeAccese = i; ridisegna(); });
  }
  /** Riparte dallo stato corrente: la scena si ricostruisce pezzo per pezzo, poi (se chiesto) si percorrono le tappe. */
  function costruisci() {
    pulisci();
    const n = quanti();
    if (ridotto) { rivelate = Infinity; tappeAccese = s.percorso ? percorso(sc, s.domanda).length : 0; ridisegna(); return; }
    rivelate = 0;
    tappeAccese = 0;
    ridisegna();
    for (let k = 1; k <= n; k++) dopo(k * sc.ms_stanza, () => { rivelate = k === n ? Infinity : k; ridisegna(); });
    if (s.percorso) avviaPercorso(n * sc.ms_stanza);
  }
  function mostraPercorso() {
    if (!s.domanda) return;
    pulisci();
    s.percorso = true;
    rivelate = Infinity;
    avviaPercorso(0);
  }

  // ------------------------------------------------ interazioni
  function cambia(diff, senzaSequenza) {
    const cambiaVista = diff.vista !== undefined && diff.vista !== s.vista;
    if (diff.domanda !== undefined && diff.domanda !== s.domanda) { s.percorso = false; tappeAccese = 0; }
    Object.assign(s, diff);
    if (diff.scelte) s.verificato = false;
    if (cambiaVista && !senzaSequenza) { costruisci(); return; }
    if (!s.percorso) { pulisci(); tappeAccese = 0; rivelate = Infinity; }
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
    const n = { ...s, ...(stato || {}) };
    n.scelte = { ...(n.scelte || {}) };
    if (!VISTE.includes(n.vista)) throw new Error(`stato_animazione: vista sconosciuta «${n.vista}»`);
    if (n.domanda && !domanda(n.domanda)) throw new Error(`stato_animazione: domanda sconosciuta «${n.domanda}»`);
    if (n.ipotesi && !stanza[n.ipotesi]) throw new Error(`stato_animazione: stanza sconosciuta «${n.ipotesi}»`);
    if (typeof n.percorso !== "boolean" || typeof n.verificato !== "boolean") throw new Error("stato_animazione: percorso e verificato sono booleani");
    if (n.percorso && !n.domanda) throw new Error("stato_animazione: il percorso richiede una domanda");
    if (!modulo[n.modulo_aperto]) throw new Error(`stato_animazione: modulo sconosciuto «${n.modulo_aperto}»`);
    for (const [id, c] of Object.entries(n.scelte)) {
      if (!sc.frasi.some((f) => f.id === id)) throw new Error(`stato_animazione: frase sconosciuta «${id}»`);
      if (!sc.categorie.some((x) => x.id === c)) throw new Error(`stato_animazione: categoria sconosciuta «${c}»`);
    }
    Object.assign(s, n);
    costruisci();
  }

  applica({});
  return {
    applica,
    distruggi() { pulisci(); },
    _prova: { stato: s, valuta: () => valutaIpotesi(sc, s.domanda, s.ipotesi), verifica: () => verifica(sc, s.scelte), tappeAccese: () => tappeAccese },
  };
}
