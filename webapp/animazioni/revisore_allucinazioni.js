// Lezione interattiva "Allucinazioni e grounding": l'agente arricchisce la scheda di un lead.
// Lo studente cambia le fonti date all'agente, le regole (consentire "non lo so", chiedere le citazioni) e il
// tipo di agente (onesto o che inventa) e vede i semafori di ogni campo: verificato, ipotesi, inventato.
// In modalita' revisore i semafori spariscono: lo studente etichetta i campi e riceve il segnale che li tradiva.
// Testi, campi, documenti e tempi: dallo scenario della lezione.

const COMP = "revisore_allucinazioni";
const AGENTI = ["onesto", "inventa"];
const ETICHETTABILI = ["verificato", "ipotesi", "inventato"];
const COLORE = { verificato: "#16a34a", ipotesi: "#d97706", inventato: "#e11d48", sconosciuto: "#64748b" };
const ICONE = {
  doc: '<path d="M-8,-11 h11 l6,6 v16 h-17z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M3,-11 v6 h6 M-4,-1 h9 M-4,4 h9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  ok: '<path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  neutro: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M12 8v5M12 16.5v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  avviso: '<path d="M8 3h8l5 5v8l-5 5H8l-5-5V8z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M12 8v5M12 16.5v.5" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  male: '<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>',
};
const STILE = `
.lz-revisore_allucinazioni .scaffale{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:6px 4px 10px}
.lz-revisore_allucinazioni .doc{display:flex;gap:8px;align-items:center;border:1.5px solid var(--bordo);border-radius:12px;padding:8px 10px;background:#fff;font-size:.8rem;font-weight:600;transition:opacity .35s,border-color .35s,transform .35s}
.lz-revisore_allucinazioni .doc svg{width:26px;height:26px;flex:0 0 auto;color:#4f46e5}
.lz-revisore_allucinazioni .doc.spento{opacity:.35;border-style:dashed;transform:scale(.97)}
.lz-revisore_allucinazioni .doc.spento svg{color:#94a3b8}
.lz-revisore_allucinazioni .nota-fonti{font-size:.8rem;color:var(--tenue-2);padding:0 6px 8px}
.lz-revisore_allucinazioni .scheda-lead{background:#fff;border:1px solid var(--bordo);border-radius:14px;padding:12px 14px;margin:0 4px}
.lz-revisore_allucinazioni .scheda-lead h5{margin:0 0 2px;font-size:1rem}
.lz-revisore_allucinazioni .base{font-size:.78rem;color:var(--tenue);margin-bottom:10px}
.lz-revisore_allucinazioni .riga{display:grid;grid-template-columns:130px 1fr auto;gap:10px;align-items:center;padding:7px 4px;border-top:1px solid #eef1f7;font-size:.86rem;animation:entra .35s ease}
.lz-revisore_allucinazioni .riga .nome{color:var(--tenue);font-size:.8rem}
.lz-revisore_allucinazioni .riga .cit{display:inline-block;margin-left:6px;font-size:.7rem;font-weight:700;color:#4f46e5;background:var(--primario-chiaro);border-radius:6px;padding:.05em .45em}
.lz-revisore_allucinazioni .riga .cit.falsa{color:#4f46e5}
.lz-revisore_allucinazioni .riga.sconosciuto .valore{color:var(--tenue-2);font-style:italic}
.lz-revisore_allucinazioni .semaforo{display:inline-flex;align-items:center;gap:5px;font-size:.7rem;font-weight:800;padding:.2em .6em;border-radius:999px;color:#fff;white-space:nowrap}
.lz-revisore_allucinazioni .etichette{display:inline-flex;gap:4px}
.lz-revisore_allucinazioni .etichette button{width:30px;height:28px;border-radius:8px;border:1.5px solid var(--bordo);background:var(--superficie-2);font-weight:900;color:var(--tenue)}
.lz-revisore_allucinazioni .etichette button[aria-pressed="true"]{color:#fff;border-color:transparent}
.lz-revisore_allucinazioni .verdetto{grid-column:2/-1;font-size:.78rem;border-radius:8px;padding:5px 8px;animation:entra .3s ease}
.lz-revisore_allucinazioni .verdetto.giusto{background:var(--ok-chiaro);color:#166534}
.lz-revisore_allucinazioni .verdetto.sbagliato{background:var(--male-chiaro);color:#9f1239}
.lz-revisore_allucinazioni .barra-sem{display:flex;height:12px;border-radius:999px;overflow:hidden;background:var(--sfondo-2);margin:10px 4px 4px}
.lz-revisore_allucinazioni .barra-sem span{display:block;height:100%;transition:width .6s cubic-bezier(.2,.8,.2,1)}
.lz-revisore_allucinazioni .riepilogo{font-size:.78rem;color:var(--tenue);padding:0 6px}
.lz-revisore_allucinazioni .legenda-sem{display:grid;gap:6px;font-size:.8rem}
.lz-revisore_allucinazioni .legenda-sem div{display:flex;gap:8px;align-items:center}
.lz-revisore_allucinazioni .segnali{margin:0;padding-left:18px;font-size:.8rem;color:var(--tenue)}
.lz-revisore_allucinazioni .segnali li{margin-bottom:4px}
@media (max-width:960px){.lz-revisore_allucinazioni .scaffale{grid-template-columns:1fr}.lz-revisore_allucinazioni .riga{grid-template-columns:1fr auto}.lz-revisore_allucinazioni .riga .nome{grid-column:1/-1}}
`;

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

// ------------------------------------------------------------------ logica (pura)

/** La scheda arricchita: per ogni campo valore mostrato, origine vera, citazione (se c'e') e segnale. */
export function arricchisci(sc, s) {
  if (!AGENTI.includes(s.agente)) throw new Error(`agente sconosciuto: ${s.agente}`);
  if (!Number.isInteger(s.fonti) || s.fonti < sc.fonti.min || s.fonti > sc.fonti.max) throw new Error(`fonti non valide: ${s.fonti}`);
  const T = sc.testi;
  const disponibili = sc.documenti.slice(0, s.fonti);
  const docDi = Object.fromEntries(sc.documenti.map((d) => [d.id, d]));
  const inventa = s.agente === "inventa";
  const campi = sc.campi.map((c) => {
    if (c.fonte !== null && !docDi[c.fonte]) throw new Error(`campo ${c.id}: documento ${c.fonte} inesistente`);
    const doc = c.fonte !== null && disponibili.some((d) => d.id === c.fonte) ? docDi[c.fonte] : null;
    if (doc) {
      return { id: c.id, nome: c.nome, valore: c.valore_fonte, origine: "verificato", citazione: s.citazioni ? doc.nome : null, falsa: false,
        segnale: riempi(s.citazioni ? T.sig_verificato_cit : T.sig_verificato, { doc: doc.nome }) };
    }
    if (c.ipotesi !== null) {
      if (inventa) {
        return { id: c.id, nome: c.nome, valore: c.ipotesi_fatto, origine: "ipotesi", citazione: null, falsa: false,
          segnale: `${riempi(T.sig_ipotesi_fatto, { base: c.base })}${s.citazioni ? ` ${T.sig_senza_cit}` : ""}` };
      }
      return { id: c.id, nome: c.nome, valore: c.ipotesi, origine: "ipotesi", citazione: null, falsa: false, segnale: riempi(T.sig_ipotesi_onesta, { base: c.base }) };
    }
    if (s.non_so && !inventa) return { id: c.id, nome: c.nome, valore: T.sconosciuto, origine: "sconosciuto", citazione: null, falsa: false, segnale: T.sig_sconosciuto };
    const citazioneFalsa = inventa && s.citazioni;
    const coda = citazioneFalsa ? riempi(T.sig_cit_falsa, { falsa: sc.fonte_falsa }) : T.sig_senza_cit;
    return { id: c.id, nome: c.nome, valore: c.inventato, origine: "inventato", citazione: citazioneFalsa ? sc.fonte_falsa : null, falsa: citazioneFalsa, segnale: `${c.segnale} ${coda}` };
  });
  const conteggi = { verificato: 0, ipotesi: 0, inventato: 0, sconosciuto: 0 };
  for (const c of campi) conteggi[c.origine] += 1;
  return { campi, conteggi, riepilogo: riempi(T.riepilogo, conteggi) };
}

/** Correzione della revisione: etichette = {idCampo: "verificato"|"ipotesi"|"inventato"} per ogni campo da etichettare. */
export function correggi(sc, s, etichette) {
  const T = sc.testi;
  const { campi } = arricchisci(sc, s);
  const daEtichettare = campi.filter((c) => c.origine !== "sconosciuto");
  for (const c of daEtichettare) {
    if (!ETICHETTABILI.includes(etichette[c.id])) throw new Error(`campo ${c.id} senza etichetta valida`);
  }
  const risultati = daEtichettare.map((c) => ({
    id: c.id, giusto: etichette[c.id] === c.origine, atteso: c.origine, dato: etichette[c.id], segnale: c.segnale,
    testo: etichette[c.id] === c.origine ? `${T.giusto}: ${c.segnale}` : `${riempi(T.sbagliato, { atteso: sc.origini[c.origine].nome })}: ${c.segnale}`,
  }));
  const giusti = risultati.filter((r) => r.giusto).length;
  const totale = risultati.length;
  const v = { giusti, totale };
  const esito = totale === 0 ? { tipo: "neutro", testo: T.esito_nulla }
    : giusti === totale ? { tipo: "ok", testo: riempi(T.esito_bravo, v) }
      : giusti * 2 >= totale ? { tipo: "avviso", testo: riempi(T.esito_quasi, v) }
        : { tipo: "male", testo: riempi(T.esito_male, v) };
  return { risultati, giusti, totale, esito };
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez) {
  inietta(`stile-${COMP}`, STILE);
  const sc = lez.scenario;
  const E = sc.etichette;
  const tempi = sc.tempi;
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const s = { fonti: sc.fonti.max, non_so: true, citazioni: true, agente: "onesto", revisore: false };
  let generazione = 0;
  let etichette = {};
  let correzione = null;
  let scheda = null;
  const durata = (ms) => (ridotto ? 1 : ms);

  // ------------------------------------------------ comandi
  const comandi = el("aside", { class: "pannello" });
  const valFonti = el("b", {});
  const inFonti = el("input", { type: "range", min: sc.fonti.min, max: sc.fonti.max, step: 1, "aria-label": sc.fonti.etichetta });
  inFonti.addEventListener("input", () => { valFonti.textContent = inFonti.value; });
  inFonti.addEventListener("change", () => cambia({ fonti: Number(inFonti.value) }));
  const cFonti = el("div", { class: "cursore" }, el("div", { class: "riga" }, el("span", {}, sc.fonti.etichetta), valFonti), inFonti);
  const interruttore = (chiave, etichetta) => {
    const input = el("input", { type: "checkbox", onchange: (e) => cambia({ [chiave]: e.target.checked }) });
    return { nodo: el("label", { class: "interruttore" }, el("span", {}, etichetta), input), input };
  };
  const iNonSo = interruttore("non_so", E.non_so);
  const iCit = interruttore("citazioni", E.citazioni);
  const segAgente = el("div", { class: "segmentato verticale", role: "group", "aria-label": E.agente },
    sc.agenti.map((a) => el("button", { "data-v": a.id, onclick: () => cambia({ agente: a.id }) }, a.nome)));
  const iRev = interruttore("revisore", E.revisore);
  const avvisoCambio = el("div", { class: "avviso-cambio", "aria-live": "polite" });
  comandi.append(el("h3", {}, E.titolo_comandi), el("h4", {}, E.fonti_titolo), cFonti, el("h4", {}, E.regole), iNonSo.nodo, iCit.nodo,
    el("h4", {}, E.agente), segAgente, el("h4", {}, E.revisore), iRev.nodo, avvisoCambio);

  // ------------------------------------------------ scena
  const scena = el("div", { class: "scena", role: "img", "aria-label": E.descrizione_scena });
  const nodiDoc = {};
  const scaffale = el("div", { class: "scaffale" }, sc.documenti.map((d) => {
    nodiDoc[d.id] = el("div", { class: "doc", html: `<svg viewBox="-14 -14 28 28">${ICONE.doc}</svg>` }, el("span", {}, d.nome));
    return nodiDoc[d.id];
  }));
  const notaFonti = el("div", { class: "nota-fonti" });
  const righe = el("div", {});
  const barraSem = el("div", { class: "barra-sem" });
  const parti = Object.fromEntries(Object.keys(COLORE).map((k) => [k, el("span", { style: `background:${COLORE[k]};width:0%` })]));
  barraSem.append(...Object.values(parti));
  const riepilogo = el("div", { class: "riepilogo" });
  const btnControlla = el("button", { class: "btn btn-primario", onclick: () => controlla() }, E.controlla);
  const notaControlla = el("span", { style: "font-size:.8rem;color:var(--tenue)" });
  const btnRifai = el("button", { class: "btn", onclick: () => disegna(true) }, E.rifai);
  const barra = el("div", { class: "barra-riproduzione" }, btnRifai, btnControlla, notaControlla);
  scena.append(scaffale, notaFonti,
    el("div", { class: "scheda-lead" }, el("h5", {}, `${E.scheda} · ${sc.lead.azienda}`),
      el("div", { class: "base" }, sc.lead.base.map((b) => `${b.nome}: ${b.valore}`).join(" · "), ` (${E.dal_crm})`), righe),
    barraSem, riepilogo, barra);

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  const esitoBox = el("div", {});
  const legenda = el("div", { class: "legenda-sem" }, Object.entries(sc.origini).map(([k, o]) => el("div", {}, semaforo(k), o.nome)));
  const segnali = el("ul", { class: "segnali" }, sc.segnali_elenco.map((x) => el("li", {}, x)));
  destra.append(el("h3", {}, E.legenda), legenda, el("h3", { style: "margin-top:14px" }, E.segnali), segnali, el("div", { style: "margin-top:12px" }, esitoBox));

  radice.replaceChildren(el("div", { class: `banco lz-${COMP}` }, comandi, scena, destra));

  function semaforo(origine) {
    const o = sc.origini[origine];
    return el("span", { class: "semaforo", style: `background:${COLORE[origine]}` }, o.simbolo, " ", o.nome);
  }

  function aggiornaComandi() {
    inFonti.value = s.fonti; valFonti.textContent = String(s.fonti);
    iNonSo.input.checked = s.non_so; iCit.input.checked = s.citazioni; iRev.input.checked = s.revisore;
    segAgente.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.agente)));
    const daFare = scheda ? scheda.campi.filter((c) => c.origine !== "sconosciuto") : [];
    const completo = daFare.every((c) => etichette[c.id]);
    btnControlla.style.display = s.revisore ? "" : "none";
    btnControlla.disabled = !completo || correzione !== null;
    notaControlla.textContent = s.revisore && !completo ? E.etichetta_tutti : "";
  }

  function rigaCampo(c) {
    const mostraSemaforo = !s.revisore || correzione !== null;
    const valore = el("span", { class: "valore" }, c.valore, c.citazione ? el("span", { class: `cit ${c.falsa ? "falsa" : ""}` }, `[${c.citazione}]`) : null);
    let destraCella = null;
    if (mostraSemaforo) destraCella = semaforo(c.origine);
    else if (c.origine !== "sconosciuto") {
      destraCella = el("span", { class: "etichette" }, ETICHETTABILI.map((k) => el("button", {
        "aria-pressed": String(etichette[c.id] === k), title: sc.origini[k].nome, "aria-label": `${c.nome}: ${sc.origini[k].nome}`,
        style: etichette[c.id] === k ? `background:${COLORE[k]}` : null,
        onclick: () => { etichette[c.id] = k; disegna(false); },
      }, sc.origini[k].simbolo)));
    }
    const riga = el("div", { class: `riga ${c.origine === "sconosciuto" ? "sconosciuto" : ""}` }, el("span", { class: "nome" }, c.nome), valore, destraCella);
    if (correzione) {
      const r = correzione.risultati.find((x) => x.id === c.id);
      if (r) riga.append(el("div", { class: `verdetto ${r.giusto ? "giusto" : "sbagliato"}` }, r.testo));
    }
    return riga;
  }

  async function disegna(animato) {
    const gen = ++generazione;
    scheda = arricchisci(sc, s);
    aggiornaComandi();
    for (const d of sc.documenti) nodiDoc[d.id].classList.toggle("spento", !sc.documenti.slice(0, s.fonti).includes(d));
    notaFonti.textContent = s.fonti === 0 ? E.nessuna_fonte : "";
    const totale = scheda.campi.length;
    const vedoSemafori = !s.revisore || correzione !== null;
    for (const k of Object.keys(parti)) parti[k].style.width = vedoSemafori ? `${(scheda.conteggi[k] / totale) * 100}%` : "0%";
    riepilogo.textContent = vedoSemafori ? scheda.riepilogo : "";
    if (!animato) { righe.replaceChildren(...scheda.campi.map(rigaCampo)); return; }
    righe.replaceChildren();
    for (const c of scheda.campi) {
      if (gen !== generazione) return;
      righe.append(rigaCampo(c));
      const doc = sc.campi.find((x) => x.id === c.id).fonte;
      if (c.origine === "verificato" && nodiDoc[doc]) nodiDoc[doc].animate([{ transform: "scale(1)" }, { transform: "scale(1.06)" }, { transform: "scale(1)" }], { duration: durata(tempi.ms_comparsa) });
      await attendi(durata(tempi.ms_campo));
    }
  }

  function controlla() {
    correzione = correggi(sc, s, etichette);
    const e = correzione.esito;
    esitoBox.replaceChildren(el("div", { class: `esito-scheda ${e.tipo}`, html: `<svg viewBox="0 0 24 24" style="color:currentColor">${ICONE[e.tipo]}</svg>` },
      el("div", {}, el("div", { style: "font-size:.72rem;text-transform:uppercase;letter-spacing:.07em;opacity:.8" }, E.esito), e.testo)));
    disegna(false);
  }

  function reimposta() {
    etichette = {};
    correzione = null;
    esitoBox.replaceChildren();
    disegna(true);
  }
  function cambia(diff) {
    Object.assign(s, diff);
    avvisoCambio.textContent = E.cambiato;
    reimposta();
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
    distruggi() { generazione += 1; },
    _prova: { arricchisci: () => arricchisci(sc, s), stato: s },
  };
}
