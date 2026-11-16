// Pagina «Esercizi pratici»: elenco, scheda (consegna, area di lavoro, Verifica), verbale leggibile.
// Servito solo dopo l'accesso da /protetto/esercizi/esercizi.js. Nessun dato di correzione arriva qui:
// tutto cio' che conta (azioni, voto, verbale) lo decide il server.

let C = null;          // contesto dalla shell: { lingua, api, conLingua, avvisa, h }
let T = {};            // testi dell'interfaccia esercizi
let radice = null;
let attesa = null;     // timer del salvataggio dei cursori (esercizi 2 e 6)
let selezione = [];    // righe selezionate per l'unione (esercizio 1)
let bozze = {};        // testi dei file non ancora salvati (esercizi dell'Officina), per non perderli a ogni ridisegno

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
  bozze = {};
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
  const disegna = { tabella_lead: areaLead, foglio_pesi: areaPesi, pipeline_risposte: areaRisposte, blocchi_prompt: areaBlocchi,
    email_marca: areaEmail, strumenti_agente: areaStrumenti, officina: areaOfficina }[s.tipo_area];
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
    h("div", { class: "es-pipeline", id: "es-stazioni" }, a.stazioni.flatMap((s, i) => [i ? h("span", { class: "es-freccia", "aria-hidden": "true" }, "→") : null,
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

// ------------------------------------------------------------------ esercizio 4: istruzioni a blocchi con rubrica

function areaBlocchi(n, a, area) {
  area.dataset.tipo = "blocchi_prompt";
  const fascia = (f) => (f ? h("span", { class: `es-fascia f-${f}` }, f) : "—");
  area.append(
    h("div", { class: "es-blocchi", id: "es-blocchi" }, a.gruppi.map((g) => h("div", { class: "es-gruppo" },
      h("h3", {}, g.nome),
      g.blocchi.map((b) => h("label", { class: `es-blocco ${b.acceso ? "acceso" : ""}` },
        h("input", { type: "checkbox", checked: b.acceso, "data-blocco": b.id,
          onchange: (ev) => azione(n, "blocco", { blocco: b.id, acceso: ev.target.checked }, area) }),
        h("span", {}, b.testo)))))),
    h("h3", {}, t("e4_anteprima")),
    a.anteprima.length ? h("ol", { class: "es-anteprima", id: "es-anteprima" }, a.anteprima.map((x) => h("li", {}, x)))
      : h("p", { class: "es-errore", id: "es-anteprima" }, t("e4_vuoto")),
    h("div", { class: "es-rilancio" },
      h("button", { class: "btn btn-primario", id: "es-prova", "data-azione": "prova", onclick: () => azione(n, "prova", {}, area) }, t("e4_prova")),
      a.provata && !a.prova_aggiornata ? h("span", { class: "es-errore" }, t("e4_da_riprovare")) : null),
    a.provata ? h("div", { class: "es-contatori", id: "es-riepilogo" },
      h("b", {}, t("e4_valide", { n: a.valide, tot: a.totale })), " · ", t("e4_accordo", { n: a.accordo, tot: a.totale }), " · ",
      Object.entries(a.conteggio).map(([f, q]) => `${f}: ${q}`).join(" · ")) : h("p", { class: "es-tenue" }, t("e4_mai_provata")),
    h("div", { class: "es-scorri" }, h("table", { class: "es-tabella", id: "es-prova-tabella" },
      h("thead", {}, h("tr", {}, [t("e1_nome"), t("e2_ruolo"), t("e4_risposta"), t("e4_json"), t("e2_punteggio"), t("e4_fascia_modello"), t("e4_fascia_regole")].map((x) => h("th", {}, x)))),
      h("tbody", {}, a.righe.map((r) => h("tr", { "data-lead": r.id },
        h("td", {}, r.nome, h("div", { class: "es-tenue" }, r.azienda)),
        h("td", {}, r.ruolo, h("div", { class: "es-tenue" }, `${r.settore} · ${r.dipendenti}`)),
        h("td", { class: "es-mono es-risposta" }, r.risposta === null ? "—" : r.risposta),
        h("td", {}, r.risposta === null ? "—" : r.valida ? h("span", { class: "es-badge ok" }, t("e4_valida")) : h("span", { class: "es-badge male" }, r.motivo)),
        h("td", { class: "es-num" }, r.punteggio === null || r.punteggio === undefined ? "—" : String(r.punteggio)),
        h("td", {}, fascia(r.fascia)),
        h("td", {}, fascia(r.fascia_regole), h("div", { class: "es-tenue" }, String(r.punteggio_regole)))))))));
}

// ------------------------------------------------------------------ esercizio 5: email con regole di marca e approvazione

function areaEmail(n, a, area) {
  area.dataset.tipo = "email_marca";
  const spunta = (voce, nome, chiave, extra) => h("label", { class: `es-blocco ${voce.acceso ? "acceso" : ""}` },
    h("input", { type: "checkbox", checked: voce.acceso, [`data-${chiave}`]: voce.id,
      onchange: (ev) => azione(n, nome, { [chiave]: voce.id, acceso: ev.target.checked }, area) }),
    h("span", {}, h("b", {}, voce.nome), extra));
  const bozze = a.bozze.map((b) => h("article", { class: `es-bozza stato-${b.stato}`, "data-bozza": String(b.id) },
    h("div", { class: "es-bozza-testa" },
      h("div", {}, h("b", {}, b.nome), " ", h("span", { class: "es-tenue" }, `<${b.email}> · ${b.azienda}`),
        b.optout ? h("span", { class: "es-badge male" }, t("e3_optout")) : null),
      h("span", { class: `es-badge ${b.stato === "inviata" ? "ok" : b.stato === "bloccata" || b.stato === "rifiutata" ? "male" : ""}`, "data-stato": b.stato }, t(`e5_stato_${b.stato}`))),
    h("div", { class: "es-tenue" }, `${t("e5_oggetto")}: ${b.oggetto}`),
    h("pre", { class: "es-corpo" }, b.corpo),
    ["in_attesa", "approvata", "rifiutata"].includes(b.stato) ? h("div", { class: "es-decidi" },
      h("button", { class: "btn btn-piccolo", "data-decisione": "approva", "aria-pressed": String(b.stato === "approvata"),
        onclick: () => azione(n, "decidi", { bozza: b.id, decisione: "approva" }, area) }, t("e5_approva")),
      h("button", { class: "btn btn-piccolo btn-fantasma", "data-decisione": "rifiuta", "aria-pressed": String(b.stato === "rifiutata"),
        onclick: () => azione(n, "decidi", { bozza: b.id, decisione: "rifiuta" }, area) }, t("e5_rifiuta"))) : null));
  area.append(
    h("div", { class: "es-pesi" },
      h("div", { id: "es-regole" }, h("h3", {}, t("e5_regole")), a.regole.map((r) => spunta(r, "regola", "regola", h("div", { class: "es-tenue" }, r.effetto)))),
      h("div", { id: "es-campi" }, h("h3", {}, t("e5_campi")), a.campi.map((c) => spunta(c, "campo", "campo", c.sensibile ? h("span", { class: "es-badge male" }, t("e5_sensibile")) : null)),
        a.sensibili_accesi.length ? h("p", { class: "es-errore", id: "es-avviso-campi" }, t("e5_avviso_campi", { campi: a.sensibili_accesi.join(", ") })) : null)),
    h("div", { class: "es-rilancio" },
      h("button", { class: "btn btn-primario", id: "es-genera", "data-azione": "genera", disabled: a.interruttore, onclick: () => azione(n, "genera", {}, area) }, t("e5_genera")),
      a.generate && !a.generazione_aggiornata ? h("span", { class: "es-errore" }, t("e5_da_rigenerare")) : null),
    h("p", { class: "es-tenue" }, t("e5_lingua_bozze")),
    a.generate ? h("div", { class: "es-checklist" }, h("b", {}, t("e5_checklist")), h("ul", {}, a.checklist.map((c) => h("li", {}, c)))) : null,
    h("div", { class: "es-bozze", id: "es-bozze" }, bozze.length ? bozze : h("p", { class: "es-tenue" }, t("e5_nessuna_bozza"))),
    h("div", { class: "es-comandi-invio" },
      h("label", { class: "es-spunta" }, h("input", { type: "checkbox", id: "es-approva-sempre", checked: a.approva_sempre,
        onchange: (ev) => azione(n, "approva_sempre", { valore: ev.target.checked }, area) }), t("e5_approva_sempre")),
      a.approva_sempre ? h("span", { class: "es-errore" }, t("e5_avviso_sempre")) : null,
      h("button", { class: "btn btn-primario", id: "es-invia", "data-azione": "invia", onclick: () => azione(n, "invia", {}, area) }, t("e5_invia")),
      h("label", { class: `es-interruttore ${a.interruttore ? "acceso" : ""}` }, h("input", { type: "checkbox", id: "es-interruttore", checked: a.interruttore,
        onchange: (ev) => azione(n, "interruttore", { valore: ev.target.checked }, area) }), t("e5_interruttore"))),
    h("h3", {}, t("e3_posta")),
    a.posta.length ? h("ul", { class: "es-posta", id: "es-posta" }, a.posta.map((m) => h("li", {}, h("b", {}, m.a), " — ", m.oggetto)))
      : h("p", { class: "es-tenue", id: "es-posta" }, t("e3_posta_vuota")),
    h("h3", {}, t("e5_registro")),
    a.registro.length ? h("ul", { class: "es-posta", id: "es-registro" }, a.registro.map((e) => h("li", { "data-evento": e.azione },
      e.azione === "invio" ? t("e5_ev_invio", { a: e.a, da: e.approvato_da, n: e.approvazione === null ? "—" : e.approvazione })
        : e.azione === "blocco_optout" ? t("e5_ev_optout", { a: e.a }) : t("e5_ev_interruttore", { n: e.bozze.length }))))
      : h("p", { class: "es-tenue", id: "es-registro" }, t("e5_registro_vuoto")),
    h("div", { class: "es-nota" }, h("b", {}, `${t("e1_lista_optout")}: `), a.lista_optout.join(", ") || "—"));
}

// ------------------------------------------------------------------ esercizio 6: strumenti dell'agente

function areaStrumenti(n, a, area) {
  area.dataset.tipo = "strumenti_agente";
  area.dataset.limite = String(a.limite);  // valore salvato sul server (il cursore mostra subito quello locale)
  const valore = h("output", { class: "es-valore", id: "es-limite-valore" }, String(a.limite));
  const limite = h("input", { type: "range", name: "limite", min: a.limiti.min, max: a.limiti.max, step: a.limiti.passo, value: a.limite, "aria-label": t("e6_limite"),
    oninput: (ev) => {
      valore.textContent = ev.target.value;
      clearTimeout(attesa);
      attesa = setTimeout(() => azione(n, "limite", { valore: Number(ev.target.value) }, area), 300);
    } });
  area.append(
    h("div", { class: "es-scorri" }, h("table", { class: "es-tabella", id: "es-strumenti" },
      h("thead", {}, h("tr", {}, [t("e6_strumento"), t("e6_tipo"), t("e6_cosa_fa"), t("e6_permesso")].map((x) => h("th", {}, x)))),
      h("tbody", {}, a.strumenti.map((s) => h("tr", { "data-strumento-riga": s.id, class: `perm-${s.permesso}` },
        h("td", { class: "es-mono" }, s.id), h("td", {}, h("span", { class: "es-badge" }, t(`e6_tipo_${s.tipo}`))), h("td", {}, s.descrizione),
        h("td", {}, h("select", { "data-strumento": s.id, "aria-label": s.id, onchange: (ev) => azione(n, "permesso", { strumento: s.id, valore: ev.target.value }, area) },
          a.permessi.map((p) => h("option", { value: p.id, selected: p.id === s.permesso }, p.nome))))))))),
    h("div", { class: "es-cursore" }, h("div", { class: "es-cursore-testa" }, h("b", {}, t("e6_limite")), valore), limite, h("small", {}, t("e6_limite_spiega"))),
    h("h3", {}, t("e6_richieste")),
    h("div", { class: "es-richieste", id: "es-richieste" }, a.richieste.map((r) => h("article", { class: "es-richiesta", "data-richiesta": r.id },
      h("div", { class: "es-bozza-testa" }, h("span", { class: "es-citazione" }, `«${r.testo}»`),
        h("button", { class: "btn btn-piccolo", "data-azione": "lancia", onclick: () => azione(n, "lancia", { richiesta: r.id }, area) }, t("e6_lancia"))),
      r.diario === null || r.diario === undefined ? h("p", { class: "es-tenue" }, t("e6_mai_lanciata"))
        : h("div", {},
          !r.aggiornato ? h("p", { class: "es-errore" }, t("e6_da_rilanciare")) : null,
          r.diario.length ? h("ol", { class: "es-diario" }, r.diario.map((d) => h("li", { class: `esito-${d.esito}`, "data-esito": d.esito },
            h("span", { class: "es-mono" }, `${d.strumento}(${Object.entries(d.argomenti).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ")})`), " → ", t(`e6_esito_${d.esito}`))))
            : h("p", { class: "es-errore" }, t("e6_piano_illeggibile")))))),
    h("h3", {}, t("e6_crm")),
    h("div", { class: "es-scorri" }, h("table", { class: "es-tabella", id: "es-crm" },
      h("thead", {}, h("tr", {}, [t("e1_nome"), t("e1_azienda"), t("e2_fascia"), t("e1_stato"), t("e1_attivita")].map((x) => h("th", {}, x)))),
      h("tbody", {}, a.contatti.map((c) => h("tr", { class: `stato-${c.stato}` },
        h("td", {}, c.nome), h("td", {}, c.azienda), h("td", {}, c.fascia), h("td", {}, t(`stato_${c.stato}`)), h("td", { class: "es-num" }, String(c.attivita))))))),
    h("p", { class: "es-nota" }, t("e6_bozze", { n: a.bozze })),
    h("h3", {}, t("e3_posta")),
    a.posta.length ? h("ul", { class: "es-posta", id: "es-posta" }, a.posta.map((m) => h("li", {}, h("b", {}, m.a), " — ", m.oggetto)))
      : h("p", { class: "es-tenue", id: "es-posta" }, t("e3_posta_vuota")));
}

// ------------------------------------------------------------------ Officina (esercizi 7-12): file, scelte, pacchetto

function areaOfficina(n, a, area) {
  area.dataset.tipo = "officina";
  const salva = async (f, testo) => {
    const r = await azione(n, "salva_file", { percorso: f.percorso, contenuto: testo }, area);
    if (r) { delete bozze[f.percorso]; C.avvisa(t("o_salvato", { file: f.percorso })); }
  };
  const pacchetto = h("textarea", { class: "es-codice", id: "es-pacchetto", rows: "4", spellcheck: "false", "aria-label": t("o_pacchetto") });
  area.append(
    a.materiale.length ? h("details", { class: "es-materiale", id: "es-materiale" },
      h("summary", {}, `${t("o_materiale")} (${a.materiale.length})`),
      a.materiale.map((m) => h("details", { class: "es-materiale-voce" },
        h("summary", {}, m.titolo, " ", h("small", { class: "es-mono" }, m.percorso)),
        h("pre", { class: "es-codice-lettura" }, m.testo)))) : null,
    h("h3", {}, t("o_file")),
    ...a.file.map((f) => {
      const testo = h("textarea", { class: "es-codice", rows: String(Math.min(22, Math.max(6, f.contenuto.split("\n").length + 1))),
        spellcheck: "false", "data-file": f.percorso, "aria-label": f.percorso,
        oninput: (ev) => { bozze[f.percorso] = ev.target.value; } });
      testo.value = bozze[f.percorso] !== undefined ? bozze[f.percorso] : f.contenuto;
      return h("section", { class: "es-file", "data-percorso": f.percorso },
        h("div", { class: "es-bozza-testa" },
          h("span", {}, h("b", { class: "es-mono" }, f.percorso), " ", f.modificato ? h("span", { class: "es-badge" }, t("o_modificato")) : null),
          h("span", {},
            h("button", { class: "btn btn-piccolo btn-primario", "data-azione": "salva", onclick: () => salva(f, testo.value) }, t("o_salva")),
            " ",
            h("button", { class: "btn btn-piccolo btn-fantasma", "data-azione": "ripristina", onclick: () => {
              if (window.confirm(t("o_ripristina_conferma"))) { delete bozze[f.percorso]; azione(n, "ripristina_file", { percorso: f.percorso }, area); }
            } }, t("o_ripristina")))),
        h("p", { class: "es-tenue" }, f.descrizione),
        testo);
    }),
    a.scelte.length ? h("h3", {}, t("o_scelte")) : null,
    ...a.scelte.map((sc) => h("fieldset", { class: "es-scelta", "data-scelta": sc.id },
      h("legend", {}, sc.domanda),
      sc.opzioni.map((o) => h("label", { class: "es-opzione" },
        h("input", { type: "radio", name: `scelta-${sc.id}`, value: o.id, checked: sc.scelta === o.id,
          onchange: () => azione(n, "scegli", { id: sc.id, valore: o.id }, area) }),
        " ", o.testo)))),
    h("h3", {}, t("o_pacchetto")),
    h("p", { class: "es-tenue" }, t("o_pacchetto_spiega", { comando: a.pacchetto.comando })),
    pacchetto,
    h("button", { class: "btn btn-piccolo", id: "es-importa", onclick: async () => {
      let dati;
      try { dati = JSON.parse(pacchetto.value); } catch (e) { C.avvisa(t("o_json_non_valido"), "male"); return; }
      const r = await azione(n, "importa_pacchetto", { pacchetto: dati }, area);
      if (r) { bozze = {}; C.avvisa(t("o_importati", { n: r.esito.importati.length, ignorati: r.esito.ignorati.length })); }
    } }, t("o_importa")));
}
