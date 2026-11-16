// Lezione interattiva "Outreach personalizzato e invio sicuro": un'email al lead si compone frase per frase e da
// ogni frase parte una linea verso il dato della scheda che la giustifica (rossa se non c'e' nessun dato, gialla se
// usa un'ipotesi del modello come se fosse un fatto). Le regole di marca accese o spente cambiano davvero l'email
// (testi alternativi dallo scenario). L'invio passa da un ambiente di prova (casella finta) o di produzione, dove un
// lucchetto chiede l'approvazione di una persona con una checklist; "approva sempre" toglie il lucchetto.
// Tutti i testi e i dati arrivano dallo scenario della lezione.

const NS = "http://www.w3.org/2000/svg";
const COMPONENTE = "email_marca";
const COLORE_STATO = {
  dato: "#10b981", domanda: "#0d9488", ipotesi: "#f59e0b", non_supportata: "#e11d48",
  vietata: "#e11d48", promessa: "#e11d48", tono: "#f97316", neutro: "#94a3b8", disiscrizione: "#6366f1",
};
const COLORE_ORIGINE = { crm: "#64748b", fonte: "#2563eb", dedotto: "#d97706" };
const PROBLEMI = ["ipotesi", "non_supportata", "vietata", "promessa"];
const L = { schedaX: 14, schedaW: 214, emailX: 292, emailW: 414, top: 40, rigaCampo: 62, rigaTesto: 16, caratteri: 54 };

const STILE = `
.lz-email_marca .regole .interruttore { padding: 3px 0; font-size: .86rem; }
.lz-email_marca .regole .interruttore small { display: block; color: var(--tenue-2); font-size: .74rem; font-weight: 400; }
.lz-email_marca select { width: 100%; padding: 6px 8px; border-radius: 10px; border: 1px solid #d6dcea; background: #fff; font-size: .82rem; }
.lz-email_marca .frase { cursor: pointer; }
.lz-email_marca .frase:focus-visible rect.sfondo { stroke: #4f46e5; stroke-width: 2.5; }
.lz-email_marca .dettaglio { display: grid; gap: 6px; font-size: .86rem; }
.lz-email_marca .dettaglio .citazione { font-style: italic; padding: 8px 10px; border-radius: 10px; background: #f6f8fd; }
.lz-email_marca .bollino { display: inline-flex; align-items: center; gap: 6px; font-weight: 700; padding: .15em .65em; border-radius: 999px; font-size: .76rem; color: #fff; width: fit-content; }
.lz-email_marca .lista { display: grid; gap: 5px; margin: 8px 0; padding: 0; list-style: none; font-size: .82rem; }
.lz-email_marca .lista li { padding: 6px 9px; border-radius: 9px; }
.lz-email_marca .lista li.ok { background: var(--ok-chiaro); color: #166534; }
.lz-email_marca .lista li.no { background: var(--male-chiaro); color: #9f1239; }
.lz-email_marca .casella { margin-top: 8px; border: 1px dashed #94a3b8; border-radius: 12px; padding: 8px 10px; font-size: .8rem; background: #f8fafc; }
.lz-email_marca .casella b { display: block; }
.lz-email_marca .decisione { display: flex; gap: 8px; margin-top: 8px; }
.lz-email_marca .decisione .btn { flex: 1; justify-content: center; }
.lz-email_marca .avviso-rosso { margin-top: 8px; padding: 8px 10px; border-radius: 10px; background: var(--male-chiaro); color: #9f1239; font-size: .8rem; font-weight: 600; }
.lz-email_marca .nota { font-size: .8rem; color: var(--tenue); margin: 6px 0 0; }
.lz-email_marca .sezione { margin-top: 14px; }
`;

const ICONA_BUSTA = '<rect x="-14" y="-10" width="28" height="20" rx="3" fill="#fff" stroke="currentColor" stroke-width="2"/><path d="M-14,-9 L0,2 L14,-9" fill="none" stroke="currentColor" stroke-width="2"/>';
const ICONA_LUCCHETTO = '<rect x="-9" y="-2" width="18" height="14" rx="3" fill="currentColor"/><path d="M-5.5,-2 v-4.5 a5.5,5.5 0 0 1 11,0 v4.5" fill="none" stroke="currentColor" stroke-width="2.6"/>';

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
function riempi(modello, valori) {
  return modello.replace(/\{(\w+)\}/g, (_, k) => {
    if (!(k in valori)) throw new Error(`segnaposto {${k}} senza valore`);
    return valori[k];
  });
}

// ------------------------------------------------------------------ logica (pura)

/** Spezza un testo in righe di al massimo `max` caratteri (a parole intere). */
export function aCapo(testo, max) {
  const righe = [];
  let riga = "";
  for (const parola of testo.split(/\s+/)) {
    if (riga && (riga + " " + parola).length > max) { righe.push(riga); riga = parola; }
    else riga = riga ? `${riga} ${parola}` : parola;
  }
  if (riga) righe.push(riga);
  return righe;
}

/** Le frasi dell'email con le regole di marca date: per ogni frase testo, stato (dato, ipotesi, ...) e campo di origine. */
export function componi(sc, regole) {
  const frasi = [];
  for (const f of sc.frasi) {
    if (f.regola && !(f.regola in regole)) throw new Error(`regola sconosciuta per la frase ${f.id}: ${f.regola}`);
    const v = f.regola && regole[f.regola] ? f.con : f.base;
    if (!v) continue;
    if (!(v.stato in COLORE_STATO)) throw new Error(`frase ${f.id}: stato sconosciuto ${v.stato}`);
    if (v.campo && !sc.lead.campi.some((c) => c.id === v.campo)) throw new Error(`frase ${f.id}: campo sconosciuto ${v.campo}`);
    frasi.push({ id: f.id, testo: v.testo, stato: v.stato, campo: v.campo || "", regola: f.regola || "" });
  }
  return frasi;
}

/** La checklist del lucchetto: ogni voce ok o no. */
export function checklist(sc, frasi, destinatario) {
  const voci = [
    { id: "disiscrizione", ok: frasi.some((f) => f.stato === "disiscrizione") },
    { id: "promesse", ok: !frasi.some((f) => f.stato === "promessa") },
    { id: "vietate", ok: !frasi.some((f) => f.stato === "vietata") },
    { id: "supportate", ok: !frasi.some((f) => f.stato === "non_supportata" || f.stato === "ipotesi") },
    { id: "destinatario", ok: destinatario === "giusto" },
  ];
  return voci.map((v) => ({ ...v, testo: sc.testi[`check_${v.id}`] }));
}

/** Che fine fa l'email: dipende da ambiente, "approva sempre", invio e decisione della persona. */
export function esito(sc, s) {
  const frasi = componi(sc, s.regole);
  const voci = checklist(sc, frasi, s.destinatario);
  const problemi = voci.filter((v) => !v.ok).length;
  const lucchetto = s.ambiente === "produzione" && !s.approva_sempre;
  let codice;
  if (!s.inviato) codice = "bozza";
  else if (s.ambiente === "prova") codice = "casella_finta";
  else if (s.approva_sempre) codice = problemi ? "danno" : "senza_controllo";
  else if (s.decisione === "nessuna") codice = "in_attesa";
  else if (s.decisione === "approva") codice = problemi ? "approvata_con_errori" : "partita_ok";
  else if (s.decisione === "rimanda") codice = problemi ? "rimandata_giusto" : "rimandata_inutile";
  else throw new Error(`decisione sconosciuta: ${s.decisione}`);
  const buono = ["casella_finta", "partita_ok", "rimandata_giusto"].includes(codice);
  const cattivo = ["danno", "approvata_con_errori"].includes(codice);
  const testo = riempi(sc.testi[`esito_${codice}`], { problemi, nome: sc.lead.nome });
  // dove si ferma la busta: 0 bozza, 1 lucchetto, 2 casella di prova o del cliente; null = torna indietro
  const tappa = codice === "bozza" ? 0 : codice === "in_attesa" ? 1 : codice.startsWith("rimandata") ? null : 2;
  return { codice, testo, problemi, voci, lucchetto, buono, cattivo, tappa };
}

/** Quante frasi per ogni stato (per la legenda e i test). */
export function conteggio(frasi) {
  const c = {};
  for (const f of frasi) c[f.stato] = (c[f.stato] || 0) + 1;
  return c;
}

// ------------------------------------------------------------------ componente visivo

export function monta(radice, lez, contesto) {
  const sc = lez.scenario;
  const E = sc.etichette;
  const T = sc.testi;
  const ridotto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const durata = (ms) => (ridotto ? 1 : ms);
  if (!contesto || !contesto.lingua) throw new Error("contesto.lingua mancante");
  if (!document.getElementById(`stile-${COMPONENTE}`)) document.head.append(el("style", { id: `stile-${COMPONENTE}` }, STILE));

  const regoleVuote = () => Object.fromEntries(sc.regole.map((r) => [r.id, false]));
  const s = {
    regole: regoleVuote(),
    ambiente: "prova",
    approva_sempre: false,
    destinatario: "giusto",
    frase_aperta: sc.frasi[0].id,
    inviato: false,
    decisione: "nessuna",
  };

  // ------------------------------------------------ comandi (sinistra)
  const comandi = el("aside", { class: "pannello" });
  const zonaRegole = el("div", { class: "regole" });
  const inputRegola = {};
  for (const r of sc.regole) {
    const input = el("input", { type: "checkbox", onchange: (e) => cambia({ regole: { ...s.regole, [r.id]: e.target.checked } }) });
    inputRegola[r.id] = input;
    zonaRegole.append(el("label", { class: "interruttore" }, el("span", {}, r.nome, el("small", {}, r.effetto)), input));
  }
  const segAmb = el("div", { class: "segmentato", role: "group", "aria-label": E.ambiente },
    el("button", { "data-v": "prova", onclick: () => cambia({ ambiente: "prova" }) }, E.prova),
    el("button", { "data-v": "produzione", onclick: () => cambia({ ambiente: "produzione" }) }, E.produzione));
  const iSempre = el("input", { type: "checkbox", onchange: (e) => cambia({ approva_sempre: e.target.checked }) });
  const selDest = el("select", { "aria-label": E.destinatario, onchange: (e) => cambia({ destinatario: e.target.value }) },
    ...sc.destinatari.map((d) => el("option", { value: d.id }, d.indirizzo)));
  const btnInvia = el("button", { class: "btn btn-primario", style: "margin-top:12px;width:100%;justify-content:center", onclick: () => invia() }, E.invia);
  comandi.append(
    el("h3", {}, E.titolo_comandi),
    el("h4", {}, E.regole), zonaRegole,
    el("h4", {}, E.destinatario), selDest,
    el("h4", {}, E.ambiente), segAmb,
    el("label", { class: "interruttore", style: "margin-top:8px" }, el("span", {}, E.approva_sempre), iSempre),
    btnInvia);

  // ------------------------------------------------ scena (centro)
  const scena = el("div", { class: "scena" });
  const svg = svgEl("svg", { role: "img", "aria-label": E.descrizione_scena });
  svg.innerHTML = `<defs><filter id="em-ombra" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#17203b" flood-opacity=".12"/></filter></defs>`;
  const gScheda = svgEl("g");
  const gLinee = svgEl("g");
  const gEmail = svgEl("g");
  const gViaggio = svgEl("g");
  svg.append(gScheda, gLinee, gEmail, gViaggio);
  scena.append(svg);

  // scheda del lead (fissa)
  const yCampo = {};
  gScheda.append(testoSvg({ x: L.schedaX, y: 24, "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, E.scheda_lead));
  sc.lead.campi.forEach((c, i) => {
    const y = L.top + i * L.rigaCampo;
    const colore = COLORE_ORIGINE[c.origine];
    if (!colore) throw new Error(`campo ${c.id}: origine sconosciuta ${c.origine}`);
    const r = svgEl("rect", { x: L.schedaX, y, width: L.schedaW, height: L.rigaCampo - 8, rx: 10, fill: "#fff", stroke: colore, "stroke-width": 1.5, filter: "url(#em-ombra)" });
    if (c.origine === "dedotto") r.setAttribute("stroke-dasharray", "5 4");
    gScheda.append(r);
    gScheda.append(testoSvg({ x: L.schedaX + 10, y: y + 15, "font-size": 9.5, "font-weight": 800, fill: colore, "letter-spacing": ".05em" }, `${c.nome.toUpperCase()} · ${E[`origine_${c.origine}`]}`));
    aCapo(c.valore, 31).slice(0, 2).forEach((riga, k) => gScheda.append(testoSvg({ x: L.schedaX + 10, y: y + 30 + k * 13, "font-size": 11, fill: "#17203b" }, riga)));
    yCampo[c.id] = y + (L.rigaCampo - 8) / 2;
  });
  const altezzaScheda = L.top + sc.lead.campi.length * L.rigaCampo;

  // ------------------------------------------------ destra
  const destra = el("aside", { class: "pannello destra" });
  const dettaglio = el("div", { class: "dettaglio", "aria-live": "polite" });
  const zonaInvio = el("div", { class: "sezione", "aria-live": "polite" });
  destra.append(el("h3", {}, E.titolo_frase), dettaglio, zonaInvio);

  radice.replaceChildren(el("div", { class: `banco lz-${COMPONENTE}` }, comandi, scena, destra));

  let frasi = [];
  let busta = null;
  let posTappe = [];

  function disegnaEmail() {
    frasi = componi(sc, s.regole);
    gLinee.replaceChildren();
    gEmail.replaceChildren();
    gEmail.append(testoSvg({ x: L.emailX, y: 24, "font-size": 12, "font-weight": 800, fill: "#5b6684", "letter-spacing": ".06em" }, E.email));
    let y = L.top + 30;
    const blocchi = [];
    for (const f of frasi) {
      const righe = aCapo(f.testo, L.caratteri);
      const h = righe.length * L.rigaTesto + 10;
      blocchi.push({ f, righe, y, h });
      y += h + 6;
    }
    const fine = y + 6;
    gEmail.insertBefore(svgEl("rect", { x: L.emailX - 8, y: L.top, width: L.emailW + 8, height: fine - L.top, rx: 12, fill: "#fff", stroke: "#d6dcea", filter: "url(#em-ombra)" }), gEmail.firstChild.nextSibling);
    const dest = sc.destinatari.find((d) => d.id === s.destinatario);
    gEmail.append(testoSvg({ x: L.emailX + 4, y: L.top + 19, "font-size": 10.5, fill: "#5b6684" }, `${E.a}: ${dest.indirizzo}`));
    for (const b of blocchi) {
      const colore = COLORE_STATO[b.f.stato];
      const aperta = b.f.id === s.frase_aperta;
      const g = svgEl("g", { class: "frase", tabindex: "0", role: "button", "aria-label": riempi(T.apri_frase, { stato: E[`stato_${b.f.stato}`] }) });
      g.append(svgEl("rect", { class: "sfondo", x: L.emailX, y: b.y, width: L.emailW - 8, height: b.h, rx: 7, fill: aperta ? "#eef2ff" : PROBLEMI.includes(b.f.stato) ? "#fff7f7" : "#fff", stroke: aperta ? "#6366f1" : "none" }));
      g.append(svgEl("rect", { x: L.emailX, y: b.y, width: 5, height: b.h, rx: 2.5, fill: colore }));
      b.righe.forEach((riga, k) => {
        const t = testoSvg({ x: L.emailX + 12, y: b.y + 17 + k * L.rigaTesto, "font-size": 12, fill: "#17203b" }, riga);
        if (b.f.stato === "non_supportata" || b.f.stato === "vietata" || b.f.stato === "promessa") t.setAttribute("text-decoration", "underline");
        g.append(t);
      });
      const apri = () => cambia({ frase_aperta: b.f.id }, true);
      g.addEventListener("click", apri);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(); } });
      gEmail.append(g);
      // linea verso il dato (o moncone rosso se non c'e')
      const yF = b.y + b.h / 2;
      if (b.f.campo) {
        const yC = yCampo[b.f.campo];
        const x1 = L.schedaX + L.schedaW, x2 = L.emailX - 2;
        gLinee.append(svgEl("path", { d: `M${x1},${yC} C${x1 + 34},${yC} ${x2 - 34},${yF} ${x2},${yF}`, fill: "none", stroke: colore, "stroke-width": aperta ? 3 : 1.8, "stroke-dasharray": b.f.stato === "ipotesi" ? "5 4" : "none", opacity: aperta ? 1 : 0.75 }));
        gLinee.append(svgEl("circle", { cx: x2, cy: yF, r: 3.5, fill: colore }));
      } else if (PROBLEMI.includes(b.f.stato)) {
        gLinee.append(svgEl("path", { d: `M${L.emailX - 4},${yF} h-26`, stroke: colore, "stroke-width": 2, "stroke-dasharray": "3 3" }));
        gLinee.append(testoSvg({ x: L.emailX - 40, y: yF + 4, "text-anchor": "middle", "font-size": 13, "font-weight": 800, fill: colore }, "?"));
      }
    }
    // viaggio della busta
    const yV = Math.max(fine, altezzaScheda) + 40;
    disegnaViaggio(yV);
    svg.setAttribute("viewBox", `0 0 720 ${yV + 46}`);
  }

  function disegnaViaggio(yV) {
    gViaggio.replaceChildren();
    const lucchetto = s.ambiente === "produzione" && !s.approva_sempre;
    const xs = [70, 360, 640];
    posTappe = xs.map((x) => ({ x, y: yV }));
    gViaggio.append(svgEl("path", { d: `M${xs[0]},${yV} L${xs[2]},${yV}`, stroke: "#d6dcea", "stroke-width": 3, "stroke-dasharray": "6 6" }));
    gViaggio.append(testoSvg({ x: xs[0], y: yV + 30, "text-anchor": "middle", "font-size": 10.5, "font-weight": 700, fill: "#5b6684" }, E.tappa_bozza));
    const gL = svgEl("g", { transform: `translate(${xs[1]},${yV})`, color: lucchetto ? "#d97706" : "#cbd5e1" }, ICONA_LUCCHETTO);
    gViaggio.append(svgEl("circle", { cx: xs[1], cy: yV, r: 17, fill: "#fff", stroke: lucchetto ? "#d97706" : "#e2e8f0", "stroke-width": 2 }), gL);
    gViaggio.append(testoSvg({ x: xs[1], y: yV + 30, "text-anchor": "middle", "font-size": 10.5, "font-weight": 700, fill: lucchetto ? "#92400e" : "#94a3b8" }, lucchetto ? E.tappa_lucchetto : E.tappa_nessun_controllo));
    const prova = s.ambiente === "prova";
    gViaggio.append(svgEl("rect", { x: xs[2] - 50, y: yV - 16, width: 100, height: 32, rx: 8, fill: prova ? "#f1f5f9" : "#fef2f2", stroke: prova ? "#94a3b8" : "#e11d48", "stroke-width": 1.8, "stroke-dasharray": prova ? "4 3" : "none" }));
    gViaggio.append(testoSvg({ x: xs[2], y: yV + 4, "text-anchor": "middle", "font-size": 10, "font-weight": 800, fill: prova ? "#475569" : "#9f1239" }, prova ? E.casella_prova : E.casella_vera));
    gViaggio.append(testoSvg({ x: xs[2], y: yV + 30, "text-anchor": "middle", "font-size": 10.5, "font-weight": 700, fill: "#5b6684" }, prova ? E.nessuno_riceve : sc.destinatari.find((d) => d.id === s.destinatario).nome));
    busta = svgEl("g", { color: "#4f46e5" }, ICONA_BUSTA);
    gViaggio.append(busta);
    posizionaBusta(false);
  }

  function posizionaBusta(animata) {
    const es = esito(sc, s);
    const tappa = es.tappa === null ? 0 : es.tappa;
    const p = posTappe[tappa];
    const prima = busta.getAttribute("transform") || `translate(${posTappe[0].x},${posTappe[0].y - 30})`;
    const dopo = `translate(${p.x},${p.y - 30})`;
    busta.setAttribute("transform", dopo);
    if (animata && !ridotto) {
      const a = (t) => t.replace(/translate\(([-\d.]+),([-\d.]+)\)/, "translate($1px,$2px)");
      busta.animate([{ transform: a(prima) }, { transform: a(dopo) }], { duration: durata(700), easing: "cubic-bezier(.2,.8,.2,1)" });
    }
  }

  function disegnaDettaglio() {
    const f = frasi.find((x) => x.id === s.frase_aperta) || frasi[0];
    const campo = f.campo ? sc.lead.campi.find((c) => c.id === f.campo) : null;
    dettaglio.replaceChildren(
      el("span", { class: "bollino", style: `background:${COLORE_STATO[f.stato]}` }, E[`stato_${f.stato}`]),
      el("div", { class: "citazione" }, f.testo),
      el("div", {}, el("b", {}, `${E.viene_da}: `), campo ? `${campo.nome} (${E[`origine_${campo.origine}`]})` : E.nessun_dato),
      el("div", {}, T[`spiega_${f.stato}`]));
    dettaglio.animate([{ opacity: 0 }, { opacity: 1 }], { duration: durata(250) });
  }

  function disegnaInvio() {
    const es = esito(sc, s);
    const figli = [el("h3", {}, E.titolo_invio)];
    if (s.approva_sempre && s.ambiente === "produzione") figli.push(el("div", { class: "avviso-rosso" }, T.avviso_approva_sempre));
    if (es.lucchetto) {
      figli.push(el("div", { class: "nota" }, T.nota_lucchetto));
      figli.push(el("ul", { class: "lista" }, es.voci.map((v) => el("li", { class: v.ok ? "ok" : "no" }, `${v.ok ? "✓" : "✗"} ${v.testo}`))));
    } else if (s.ambiente === "prova") figli.push(el("div", { class: "nota" }, T.nota_prova));
    figli.push(el("div", { class: `esito-scheda ${es.buono ? "ok" : es.cattivo ? "male" : "avviso"}` }, el("div", {}, es.testo)));
    if (es.codice === "casella_finta") {
      figli.push(el("div", { class: "casella" }, el("b", {}, E.casella_prova), `${E.oggetto}: ${T.oggetto_email}`));
    }
    if (s.inviato && es.lucchetto) {
      figli.push(el("div", { class: "decisione" },
        el("button", { class: "btn btn-primario", "aria-pressed": String(s.decisione === "approva"), onclick: () => decidi("approva") }, E.approva),
        el("button", { class: "btn", "aria-pressed": String(s.decisione === "rimanda"), onclick: () => decidi("rimanda") }, E.rimanda)));
    }
    zonaInvio.replaceChildren(...figli);
  }

  function aggiornaComandi() {
    for (const [id, input] of Object.entries(inputRegola)) input.checked = Boolean(s.regole[id]);
    segAmb.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.v === s.ambiente)));
    iSempre.checked = s.approva_sempre;
    selDest.value = s.destinatario;
  }

  function ridisegna(animata) {
    aggiornaComandi();
    disegnaEmail();
    disegnaDettaglio();
    disegnaInvio();
    if (animata) posizionaBusta(true);
  }

  function cambia(diff, soloScheda) {
    Object.assign(s, diff);
    if (!soloScheda) { s.inviato = false; s.decisione = "nessuna"; }
    ridisegna(false);
  }
  function invia() {
    s.inviato = true;
    s.decisione = "nessuna";
    aggiornaComandi();
    disegnaInvio();
    posizionaBusta(true);
  }
  function decidi(d) {
    s.decisione = d;
    disegnaInvio();
    posizionaBusta(true);
  }

  function applica(stato) {
    const ammessi = Object.keys(s);
    for (const k of Object.keys(stato || {})) if (!ammessi.includes(k)) throw new Error(`stato_animazione: chiave non prevista «${k}»`);
    const nuovo = { ...s, ...(stato || {}) };
    nuovo.regole = { ...regoleVuote(), ...(nuovo.regole || {}) };
    for (const k of Object.keys(nuovo.regole)) if (!sc.regole.some((r) => r.id === k)) throw new Error(`stato_animazione: regola sconosciuta «${k}»`);
    if (!["prova", "produzione"].includes(nuovo.ambiente)) throw new Error(`stato_animazione: ambiente sconosciuto «${nuovo.ambiente}»`);
    if (!sc.destinatari.some((d) => d.id === nuovo.destinatario)) throw new Error(`stato_animazione: destinatario sconosciuto «${nuovo.destinatario}»`);
    if (!sc.frasi.some((f) => f.id === nuovo.frase_aperta)) throw new Error(`stato_animazione: frase sconosciuta «${nuovo.frase_aperta}»`);
    Object.assign(s, nuovo);
    ridisegna(false);
  }

  applica({});
  return {
    applica,
    distruggi() {},
    _prova: { stato: s, frasi: () => componi(sc, s.regole), esito: () => esito(sc, s), invia, decidi },
  };
}
