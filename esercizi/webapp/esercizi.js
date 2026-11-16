// Pagina «Esercizi pratici»: elenco, scheda (consegna, area di lavoro, Verifica), verbale leggibile.
// Servito solo dopo l'accesso da /protetto/esercizi/esercizi.js. Nessun dato di correzione arriva qui:
// tutto cio' che conta (azioni, voto, verbale) lo decide il server.

let C = null;          // contesto dalla shell: { lingua, api, conLingua, avvisa, h }
let T = {};            // testi dell'interfaccia esercizi
let radice = null;
let attesa = null;     // timer del salvataggio dei cursori (esercizio 2)
let selezione = [];    // righe selezionate per l'unione (esercizio 1)

const h = (...a) => C.h(...a);
function t(k, valori) {
  const s = T[k];
  if (s === undefined) { console.error("testo esercizi mancante:", k); return `[${k}]`; }
  return valori ? s.replace(/\{(\w+)\}/g, (_, x) => (x in valori ? valori[x] : `{${x}}`)) : s;
}
function errore(r) {
  const m = r.dati && (r.dati.messaggio || r.dati.detail) ? (r.dati.messaggio || JSON.stringify(r.dati.detail)) : `HTTP ${r.status}`;
  C.avvisa(m, "male");
}
function caricaStile() {
  if (document.getElementById("stile-esercizi")) return;
  document.head.append(h("link", { id: "stile-esercizi", rel: "stylesheet", href: "/protetto/esercizi/esercizi.css" }));
}

export function monta(el, contesto) {
  C = contesto;
  radice = el;
  caricaStile();
  elenco();
  return { distruggi() { clearTimeout(attesa); radice = null; } };
}

// ------------------------------------------------------------------ elenco

async function elenco() {
  const r = await C.api("GET", C.conLingua("/api/esercizi"));
  if (!r.ok) { errore(r); return; }
  T = r.dati.testi;
  if (!radice) return;
  radice.replaceChildren(h("div", { class: "es-pagina entra" },
    h("h1", { class: "es-titolo" }, t("esercizi_titolo")),
    h("p", { class: "es-spiega" }, t("esercizi_spiega")),
    h("div", { class: "es-griglia" }, r.dati.esercizi.map((e) => h("article", { class: `es-carta ${e.superato ? "superato" : ""}`, "data-esercizio": String(e.numero) },
      h("div", { class: "es-numero" }, `${t("esercizio")} ${e.numero}`),
      h("h2", {}, e.titolo),
      h("p", {}, e.sottotitolo),
      h("div", { class: "es-meta" },
        h("span", {}, `${t("soglia")}: ${e.soglia}/100`),
        h("span", {}, e.ultimo_voto === null ? t("mai_verificato") : `${t("ultimo_voto")}: ${e.ultimo_voto}/100`),
        e.superato ? h("span", { class: "es-badge ok" }, t("superato")) : null),
      h("button", { class: "btn btn-primario", onclick: () => scheda(e.numero) }, t("apri")))))));
}

// ------------------------------------------------------------------ scheda

async function scheda(n, dati) {
  let s = dati;
  if (!s) {
    const r = await C.api("GET", C.conLingua(`/api/esercizi/${n}`));
    if (!r.ok) { errore(r); return; }
    s = r.dati;
  }
  if (!radice) return;
  selezione = [];
  const area = h("div", { class: "es-area", id: "es-area" });
  const verbale = h("div", { id: "es-verbale" });
  radice.replaceChildren(h("div", { class: "es-pagina entra", "data-scheda": String(n) },
    h("button", { class: "btn btn-fantasma es-indietro", onclick: elenco }, "← ", t("torna_elenco")),
    h("div", { class: "es-testa" },
      h("div", { class: "es-numero" }, `${t("esercizio")} ${s.numero} · ${t("soglia")} ${s.soglia}/100`),
      h("h1", { class: "es-titolo" }, s.titolo), h("p", { class: "es-spiega" }, s.sottotitolo)),
    h("div", { class: "es-colonne" },
      h("section", { class: "scheda es-consegna" },
        h("h2", {}, t("consegna")), h("ol", {}, s.consegna.map((p) => h("li", {}, p))),
        h("h3", {}, t("controlli_previsti")),
        h("ul", { class: "es-previsti" }, s.controlli.map((c) => h("li", {}, c.nome, " ",
          h("small", {}, `${c.peso} ${t("punti")}`), c.bloccante ? h("span", { class: "es-badge male" }, t("bloccante")) : null)))),
      h("section", { class: "scheda es-lavoro" }, h("h2", {}, t("area_lavoro")), area)),
    h("div", { class: "es-barra-verifica" },
      h("button", { class: "btn btn-primario es-verifica", id: "es-verifica", onclick: () => verifica(n) }, t("verifica")),
      h("button", { class: "btn btn-fantasma", id: "es-ricomincia", onclick: () => ricomincia(n) }, t("ricomincia"))),
    verbale));
  disegnaArea(s, area);
  if (s.ultimo_verbale) disegnaVerbale(n, s.ultimo_verbale, verbale);
}

function disegnaArea(s, area) {
  area.replaceChildren();
  const disegna = { tabella_lead: areaLead, foglio_pesi: areaPesi, pipeline_risposte: areaRisposte }[s.tipo_area];
  if (!disegna) { area.append(h("p", {}, `tipo_area ${s.tipo_area}?`)); return; }
  disegna(s.numero, s.area, area);
}

async function azione(n, nome, parametri, area) {
  const r = await C.api("POST", C.conLingua(`/api/esercizi/${n}/azione`), { nome, parametri: parametri || {} });
  if (!r.ok) { errore(r); return null; }
  if (area && radice) disegnaArea({ numero: n, tipo_area: area.dataset.tipo, area: r.dati.area }, area);
  return r.dati;
}

async function verifica(n) {
  const b = document.getElementById("es-verifica");
  if (b) { b.disabled = true; b.textContent = t("verifica_in_corso"); }
  const r = await C.api("POST", `/api/esercizi/${n}/verifica`);
  if (b) { b.disabled = false; b.textContent = t("verifica"); }
  if (!r.ok) { errore(r); return; }
  const box = document.getElementById("es-verbale");
  if (box) { disegnaVerbale(n, r.dati, box); box.scrollIntoView({ behavior: "smooth", block: "start" }); }
}

async function ricomincia(n) {
  if (!window.confirm(t("ricomincia_conferma"))) return;
  const r = await C.api("POST", C.conLingua(`/api/esercizi/${n}/ricomincia`));
  if (!r.ok) { errore(r); return; }
  scheda(n, r.dati);
}

// ------------------------------------------------------------------ verbale

function disegnaVerbale(n, v, box) {
  const L = C.lingua;
  const esito = h("div", { class: "es-ricorrezione", id: "es-ricorrezione" });
  box.replaceChildren(h("section", { class: `scheda es-verbale ${v.superato ? "ok" : "male"}`, "data-voto": String(v.voto) },
    h("div", { class: "es-verbale-testa" },
      h("div", { class: "es-voto" }, h("b", {}, String(v.voto)), h("span", {}, "/100")),
      h("div", {}, h("h2", {}, t("verbale"), ` · ${t("tentativo")} ${v.tentativo}`), h("p", { class: "es-riassunto" }, v.riassunto[L]))),
    h("ul", { class: "es-controlli" }, v.controlli.map((c) => h("li", { class: c.superato ? "ok" : "male", "data-controllo": c.id },
      h("span", { class: "es-segno", "aria-hidden": "true" }, c.superato ? "✔" : "✘"),
      h("div", {},
        h("div", { class: "es-controllo-nome" }, c.nome[L], " ", h("small", {}, `${c.punti}/${c.peso} ${t("punti")}`),
          c.bloccante ? h("span", { class: "es-badge male" }, t("bloccante")) : null),
        h("div", { class: "es-controllo-spiega" }, c.spiegazione[L]),
        !c.superato ? h("div", { class: "es-aiuto" }, h("b", {}, `${t("come_rimediare")}: `), c.aiuto[L]) : null)))),
    h("div", { class: "es-impronta" }, `${t("impronta")}: ${v.impronta_esito.slice(0, 12)}… `,
      h("button", { class: "btn btn-fantasma", id: "es-ricorreggi", onclick: () => ricorreggi(n, v.tentativo, esito) }, t("ricorreggi"))),
    esito));
}

async function ricorreggi(n, k, box) {
  const r = await C.api("POST", `/api/esercizi/${n}/tentativi/${k}/ricorreggi`);
  if (!r.ok) { errore(r); return; }
  box.textContent = r.dati.identico ? t("ricorretto_identico") : t("ricorretto_diverso");
  box.className = `es-ricorrezione ${r.dati.identico ? "ok" : "male"}`;
}

// ------------------------------------------------------------------ esercizio 1: tabella dei lead

function areaLead(n, a, area) {
  area.dataset.tipo = "tabella_lead";
  const conta = a.contatori;
  const barra = h("div", { class: "es-unione", id: "es-unione" });
  const aggiornaBarra = () => {
    barra.replaceChildren();
    if (selezione.length !== 2) { barra.append(h("span", {}, t("e1_seleziona_due"))); return; }
    const [x, y] = selezione;
    barra.append(
      h("button", { class: "btn", "data-azione": "unisci", onclick: () => azione(n, "unisci", { principale: x, duplicato: y }, area).then(() => { selezione = []; }) }, t("e1_unisci_tieni", { id: x })),
      h("button", { class: "btn", "data-azione": "unisci", onclick: () => azione(n, "unisci", { principale: y, duplicato: x }, area).then(() => { selezione = []; }) }, t("e1_unisci_tieni", { id: y })),
      h("small", {}, t("e1_unisci_spiega")));
  };
  const righe = a.righe.map((r) => {
    const attiva = r.stato === "attivo";
    const email = h("input", { type: "text", value: r.email, class: `es-email ${r.email_valida ? "" : "rotta"}`, "aria-label": t("e1_email"), disabled: !attiva });
    const salva = h("button", { class: "btn btn-piccolo", "data-azione": "correggi_email", disabled: !attiva,
      onclick: () => azione(n, "correggi_email", { contatto: r.id, email: email.value }, area) }, t("e1_salva"));
    const seg = h("select", { "aria-label": t("e1_segmento"), disabled: !attiva, "data-azione": "segmento",
      onchange: (ev) => azione(n, "segmento", { contatto: r.id, valore: ev.target.value }, area) },
      h("option", { value: "" }, "—"), a.segmenti.map((s) => h("option", { value: s, selected: s === r.segmento }, s)));
    const sel = h("input", { type: "checkbox", "aria-label": `#${r.id}`, disabled: !attiva, checked: selezione.includes(r.id),
      onchange: (ev) => {
        selezione = ev.target.checked ? [...selezione, r.id].slice(-2) : selezione.filter((x) => x !== r.id);
        area.querySelectorAll("input.es-sel").forEach((c) => { c.checked = selezione.includes(Number(c.dataset.id)); });
        aggiornaBarra();
      } });
    sel.classList.add("es-sel");
    sel.dataset.id = String(r.id);
    const spunta = (campo, valore, etichetta) => h("label", { class: "es-spunta" },
      h("input", { type: "checkbox", checked: valore, "data-azione": campo, onchange: (ev) => azione(n, campo, { contatto: r.id, valore: ev.target.checked }, area) }), etichetta);
    return h("tr", { class: `stato-${r.stato}`, "data-id": String(r.id) },
      h("td", {}, sel), h("td", { class: "es-mono" }, String(r.id)),
      h("td", {}, `${r.nome} ${r.cognome}`, h("div", { class: "es-tenue" }, r.ruolo)),
      h("td", {}, h("div", { class: "es-email-riga" }, email, salva), !r.email_valida ? h("div", { class: "es-errore" }, t("e1_email_rotta")) : null),
      h("td", {}, r.azienda), h("td", { class: "es-num" }, r.dimensione === null ? h("span", { class: "es-errore" }, t("e1_ignota")) : String(r.dimensione)),
      h("td", {}, seg),
      h("td", {}, t(`stato_${r.stato}`), r.unito_in ? h("div", { class: "es-tenue" }, t("e1_unito_in", { id: r.unito_in })) : null),
      h("td", { class: "es-num" }, String(r.attivita)),
      h("td", {}, spunta("optout", r.optout, t("e1_non_contattare")), spunta("da_completare", r.da_completare, t("e1_da_completare"))),
      h("td", {}, r.stato === "unito" ? "" : h("button", { class: "btn btn-piccolo", "data-azione": attiva ? "escludi" : "riattiva",
        onclick: () => azione(n, attiva ? "escludi" : "riattiva", { contatto: r.id }, area) }, attiva ? t("e1_escludi") : t("e1_riattiva"))));
  });
  aggiornaBarra();
  area.append(
    h("div", { class: "es-contatori" },
      h("b", {}, `${conta.totali} ${t("e1_contatti")}`), ` · ${conta.attivi} ${t("e1_attivi")} · ${conta.uniti} ${t("e1_uniti")} · ${conta.esclusi} ${t("e1_esclusi")}`),
    h("div", { class: "es-nota" }, h("b", {}, `${t("e1_regola")}: `), a.regola_segmenti),
    h("div", { class: "es-nota" }, h("b", {}, `${t("e1_lista_optout")}: `), a.lista_optout.join(", ")),
    barra,
    h("div", { class: "es-scorri" }, h("table", { class: "es-tabella", id: "es-tabella-lead" },
      h("thead", {}, h("tr", {}, ["", "#", t("e1_nome"), t("e1_email"), t("e1_azienda"), t("e1_dimensione"), t("e1_segmento"),
        t("e1_stato"), t("e1_attivita"), "", t("e1_azioni")].map((x) => h("th", {}, x)))),
      h("tbody", {}, righe))));
}

// ------------------------------------------------------------------ esercizio 2: foglio dei pesi

function areaPesi(n, a, area) {
  area.dataset.tipo = "foglio_pesi";
  const regole = JSON.parse(JSON.stringify(a.regole));
  const somma = h("span", { class: `es-somma ${a.somma_pesi === 100 ? "ok" : "male"}`, id: "es-somma" }, `${t("e2_somma")}: ${a.somma_pesi}`);
  const invia = () => {
    clearTimeout(attesa);
    const tot = Object.values(regole.pesi).reduce((x, y) => x + y, 0);
    somma.textContent = `${t("e2_somma")}: ${tot}`;
    somma.className = `es-somma ${tot === 100 ? "ok" : "male"}`;
    attesa = setTimeout(() => azione(n, "imposta_regole", regole, area), 300);
  };
  const cursore = (valore, imposta, etichetta, spiega, nome) => {
    const num = h("output", { class: "es-valore" }, String(valore));
    const inp = h("input", { type: "range", min: a.limiti.min, max: a.limiti.max, step: a.limiti.passo, value: valore, name: nome, "aria-label": etichetta,
      oninput: (ev) => { const v = Number(ev.target.value); num.textContent = String(v); imposta(v); invia(); } });
    return h("div", { class: "es-cursore" }, h("div", { class: "es-cursore-testa" }, h("b", {}, etichetta), num), inp, spiega ? h("small", {}, spiega) : null);
  };
  const conteggio = a.conteggio;
  area.append(
    h("div", { class: "es-pesi" },
      h("div", {}, h("h3", {}, t("e2_pesi"), " ", somma),
        a.criteri.map((c) => cursore(regole.pesi[c.id], (v) => { regole.pesi[c.id] = v; }, c.nome, c.spiega, `peso_${c.id}`))),
      h("div", {}, h("h3", {}, t("e2_soglie")),
        cursore(regole.soglia_alta, (v) => { regole.soglia_alta = v; }, t("e2_soglia_alta"), "", "soglia_alta"),
        cursore(regole.soglia_media, (v) => { regole.soglia_media = v; }, t("e2_soglia_media"), "", "soglia_media"),
        h("div", { class: "es-fasce" }, ["High", "Medium", "Low"].map((f) => h("span", { class: `es-fascia f-${f}` }, `${f}: ${conteggio[f]}`))),
        h("button", { class: "btn btn-primario", id: "es-applica", "data-azione": "applica_al_crm", onclick: () => azione(n, "applica_al_crm", {}, area) }, t("e2_applica")),
        h("p", { class: a.applicata ? "es-ok" : "es-errore" }, a.applicata ? t("e2_applicata") : t("e2_non_applicata")))),
    h("h3", {}, t("e2_classifica")),
    h("div", { class: "es-scorri" }, h("table", { class: "es-tabella", id: "es-classifica" },
      h("thead", {}, h("tr", {}, [t("e1_nome"), t("e2_ruolo"), t("e1_azienda"), t("e2_settore"), t("e2_persone"), t("e2_comportamento"),
        t("e2_punteggio"), t("e2_fascia"), t("e2_fascia_crm")].map((x) => h("th", {}, x)))),
      h("tbody", {}, a.classifica.map((r) => h("tr", {},
        h("td", {}, r.nome), h("td", {}, r.ruolo), h("td", {}, r.azienda),
        h("td", {}, r.settore, r.prioritario ? h("span", { class: "es-badge" }, t("e2_prioritario")) : null),
        h("td", { class: "es-num" }, String(r.dipendenti)), h("td", { class: "es-num" }, `${r.visite} / ${r.download}`),
        h("td", { class: "es-num" }, h("div", { class: "es-barretta" }, h("span", { style: `width:${r.punteggio}%` })), String(r.punteggio)),
        h("td", {}, h("span", { class: `es-fascia f-${r.fascia}` }, r.fascia)),
        h("td", {}, r.fascia_crm ? h("span", { class: `es-fascia f-${r.fascia_crm}` }, r.fascia_crm) : "—")))))));
}

// ------------------------------------------------------------------ esercizio 3: pipeline delle risposte

function areaRisposte(n, a, area) {
  area.dataset.tipo = "pipeline_risposte";
  const cat = Object.fromEntries(a.categorie.map((c) => [c.id, c]));
  const massimo = Math.max(1, ...Object.values(a.report));
  area.append(
    h("h3", {}, `${t("e3_report")} — ${a.campagna}`),
    h("div", { class: "es-report", id: "es-report" }, a.categorie.map((c) => h("div", { class: "es-report-riga" },
      h("span", {}, c.nome), h("div", { class: "es-barretta grande" }, h("span", { style: `width:${(a.report[c.id] / massimo) * 100}%;background:${c.colore}` })),
      h("b", {}, `${a.report[c.id]}/${a.totale}`)))),
    h("h3", {}, t("e3_risposte")),
    h("div", { class: "es-scorri" }, h("table", { class: "es-tabella", id: "es-risposte" },
      h("thead", {}, h("tr", {}, [t("e1_nome"), "", t("e3_tua_etichetta"), t("e3_etichetta_llm"), t("e3_categoria_crm")].map((x) => h("th", {}, x)))),
      h("tbody", {}, a.risposte.map((r) => h("tr", { "data-risposta": r.chiave },
        h("td", {}, r.nome, h("div", { class: "es-tenue" }, r.azienda)),
        h("td", { class: "es-citazione" }, `«${r.testo}»`),
        h("td", {}, h("select", { "data-azione": "etichetta", onchange: (ev) => azione(n, "etichetta", { risposta: r.chiave, valore: ev.target.value }, area) },
          h("option", { value: "" }, t("e3_scegli")), a.categorie.map((c) => h("option", { value: c.id, selected: c.id === r.etichetta_studente }, c.nome)))),
        h("td", { class: "es-mono" }, r.etichetta_llm),
        h("td", {}, r.categoria_crm ? h("span", { class: "es-chip", style: `background:${cat[r.categoria_crm].colore}` }, cat[r.categoria_crm].nome) : "—",
          r.optout ? h("span", { class: "es-badge male" }, t("e3_optout")) : null)))))),
    h("h3", {}, t("e3_stazione")),
    h("div", { class: "es-pipeline", id: "es-stazioni" }, a.stazioni.map((s, i) => [i ? h("span", { class: "es-freccia", "aria-hidden": "true" }, "→") : null,
      h("button", { class: `es-stazione ${a.stazione === s.id ? "scelta" : ""}`, "data-stazione": s.id, "aria-pressed": String(a.stazione === s.id),
        onclick: () => azione(n, "stazione", { valore: s.id }, area) }, s.nome)])),
    h("h3", {}, t("e3_correzione")),
    h("div", { class: "es-correzioni", id: "es-correzioni" }, a.correzioni.map((c) => h("label", { class: `es-opzione ${a.correzione === c.id ? "scelta" : ""}` },
      h("input", { type: "radio", name: "correzione", value: c.id, checked: a.correzione === c.id, onchange: () => azione(n, "correzione", { valore: c.id }, area) }), c.testo))),
    h("div", { class: "es-rilancio" },
      h("button", { class: "btn btn-primario", id: "es-rilancia", "data-azione": "rilancia", onclick: () => azione(n, "rilancia", {}, area) }, t("e3_rilancia")),
      !a.rilancio_aggiornato ? h("span", { class: "es-errore" }, t("e3_da_rilanciare")) : null),
    h("h3", {}, t("e3_posta")),
    a.posta.length ? h("ul", { class: "es-posta", id: "es-posta" }, a.posta.map((m) => h("li", {}, h("b", {}, m.a), " — ", m.oggetto)))
      : h("p", { class: "es-tenue", id: "es-posta" }, t("e3_posta_vuota")),
    h("div", { class: "es-nota" }, h("b", {}, `${t("e1_lista_optout")}: `), a.lista_optout.join(", ") || "—"));
}
