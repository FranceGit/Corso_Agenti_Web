// Shell della piattaforma del corso: accesso, mappa a bersaglio, pillole con lezione interattiva, quiz a due
// livelli con salute, debriefing. Tutti i testi arrivano dalle API: questo file non contiene contenuti del corso.

const S = {
  lingua: null,
  lingue: [],
  testi: {},
  stato: null,
  percorso: null,
  vista: "mappa",
  pid: null,
  contenuto: null,
  linguaContenuto: null,
  segmento: 0,
  scheda: "lezione",
  passoScaletta: null,
  modulo: null,
  quiz: null,
  canone: null,
};

// strumenti del collaudo alpha: li accende/spegne config alpha.modalita_alpha (in beta va spenta)
const alpha = () => Boolean(S.stato && S.stato.alpha && S.stato.alpha.modalita_alpha);
const NUMERI_FINESTRA = ["①", "②", "③", "④", "⑤", "⑥"];

const radice = document.getElementById("radice");
const CHIAVE_LINGUA = "corso_lingua";

// ------------------------------------------------------------------ utilita'

function h(tag, attributi, ...figli) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attributi || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const f of figli.flat()) {
    if (f === null || f === undefined || f === false) continue;
    el.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return el;
}

function t(chiave, valori) {
  const testo = S.testi[chiave];
  if (testo === undefined) {
    console.error("testo di interfaccia mancante:", chiave);
    return `[${chiave}]`;
  }
  return valori ? testo.replace(/\{(\w+)\}/g, (_, k) => (k in valori ? valori[k] : `{${k}}`)) : testo;
}

const ICONE = {
  spunta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7"/></svg>',
  croce: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  lucchetto: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>',
  stella: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l2.6 6.1 6.6.6-5 4.4 1.5 6.5L12 16.7 6.3 20.1l1.5-6.5-5-4.4 6.6-.6z"/></svg>',
  indietro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  avanti: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
  cuore: '<svg viewBox="0 0 24 24" fill="#f43f5e"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.3 3.1 4.5 6.8 4.5c2.1 0 3.6 1.2 5.2 3 1.6-1.8 3.1-3 5.2-3 3.7 0 5.9 3.8 4.4 7.3C19.5 16.4 12 21 12 21z"/></svg>',
  coppa: '<svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 01-8 0V4zM8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8 21h8M9 17h6"/></svg>',
  scudo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/></svg>',
  orologio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  libro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zM4 19a2 2 0 012-2h13"/></svg>',
  lampo: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
};

function icona(nome, classe) {
  const span = h("span", { class: classe || "", "aria-hidden": "true", html: ICONE[nome] });
  return span;
}

function avvisa(testo, tipo) {
  const box = document.getElementById("avvisi");
  const el = h("div", { class: `avviso ${tipo || ""}` }, testo);
  box.append(el);
  setTimeout(() => el.remove(), 6000);
}

function conLingua(url) {
  return url + (url.includes("?") ? "&" : "?") + "lingua=" + encodeURIComponent(S.lingua);
}

async function api(metodo, url, corpo) {
  const opzioni = { method: metodo, headers: {}, credentials: "same-origin" };
  if (corpo !== undefined) {
    opzioni.headers["Content-Type"] = "application/json";
    opzioni.body = JSON.stringify(corpo);
  }
  let risposta;
  try {
    risposta = await fetch(url, opzioni);
  } catch (e) {
    avvisa(`${t("errore")}: ${e.message}`, "male");
    throw e;
  }
  const dati = await risposta.json().catch(() => ({}));
  if (risposta.status === 401 && !url.endsWith("/api/accesso")) {
    mostraAccesso();
    throw new Error("accesso richiesto");
  }
  return { ok: risposta.ok, status: risposta.status, dati };
}

function errore(r) {
  const msg = r.dati && (r.dati.messaggio || r.dati.detail) ? (r.dati.messaggio || JSON.stringify(r.dati.detail)) : `HTTP ${r.status}`;
  avvisa(`${t("errore")}: ${msg}`, "male");
}

function leggiLinguaSalvata() {
  try { return localStorage.getItem(CHIAVE_LINGUA); } catch (e) { return null; }
}
function salvaLingua(l) {
  try { localStorage.setItem(CHIAVE_LINGUA, l); } catch (e) { /* preferenza solo locale: se il browser la blocca resta quella della sessione */ }
}

async function caricaInterfaccia(lingua) {
  const r = await fetch(`/api/interfaccia?lingua=${encodeURIComponent(lingua)}`);
  const dati = await r.json();
  if (!r.ok) throw new Error(dati.messaggio || "interfaccia non disponibile");
  S.lingua = dati.lingua;
  S.lingue = dati.lingue;
  S.testi = dati.testi;
  document.documentElement.lang = S.lingua;
  document.title = t("app_titolo");
}

function selettoreLingua() {
  return h("div", { class: "lingue", role: "group", "aria-label": t("lingua") },
    S.lingue.map((l) => h("button", { "aria-pressed": String(l === S.lingua), onclick: () => cambiaLingua(l) }, l.toUpperCase())));
}

async function cambiaLingua(l) {
  if (l === S.lingua) return;
  salvaLingua(l);
  await caricaInterfaccia(l);
  if (!S.stato) { mostraAccesso(); return; }
  await aggiornaDati();
  if (S.vista === "pillola") await apriPillola(S.pid, { segmento: S.segmento, scheda: S.scheda });
  else if (S.vista === "quiz" && S.quiz && !S.quiz.risposto) await caricaDomandaCorrente();
  else if (S.vista === "riepilogo" && S.pid) await apriRiepilogo(S.pid);
  else disegnaTutto();
}

function marchio() {
  return h("div", { class: "marchio", html:
    '<svg viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="gm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0ea5e9"/><stop offset=".5" stop-color="#8b5cf6"/><stop offset="1" stop-color="#10b981"/></linearGradient></defs>' +
    '<circle cx="20" cy="20" r="17" fill="none" stroke="url(#gm)" stroke-width="3.5" stroke-dasharray="20 6.7"/><circle cx="20" cy="20" r="7" fill="url(#gm)"/></svg>' });
}

// ------------------------------------------------------------------ accesso

function mostraAccesso() {
  S.stato = null;
  distruggiModulo();
  radice.replaceChildren();
  const err = h("div", { class: "accesso-errore", role: "alert" });
  const email = h("input", { id: "email", type: "email", autocomplete: "email", required: true });
  const codice = h("input", { id: "codice", type: "password", autocomplete: "one-time-code", required: true });
  const form = h("form", {
    onsubmit: async (ev) => {
      ev.preventDefault();
      err.textContent = "";
      const r = await api("POST", "/api/accesso", { email: email.value, codice: codice.value });
      if (!r.ok) { err.textContent = r.status === 401 ? t("accesso_negato") : (r.dati.messaggio || `HTTP ${r.status}`); return; }
      await avvia();
    },
  },
    h("div", { class: "campo" }, h("label", { for: "email" }, t("email")), email),
    h("div", { class: "campo" }, h("label", { for: "codice" }, t("codice")), codice),
    h("button", { class: "btn btn-primario", type: "submit" }, t("entra")),
    err);
  radice.append(h("div", { class: "accesso" },
    h("div", { class: "accesso-scheda entra" },
      h("div", { class: "accesso-lingue" }, selettoreLingua()),
      marchio(),
      h("h1", {}, t("accesso_titolo")),
      h("p", {}, t("accesso_spiega")),
      form,
      h("div", { class: "nota-protezione" }, icona("scudo"), t("nota_protezione")))));
  email.focus();
}

// ------------------------------------------------------------------ dati

async function aggiornaDati() {
  const [s, p] = await Promise.all([api("GET", conLingua("/api/stato")), api("GET", conLingua("/api/percorso"))]);
  if (!s.ok) { errore(s); return false; }
  if (!p.ok) { errore(p); return false; }
  S.stato = s.dati;
  S.percorso = p.dati;
  return true;
}

function spicchio(pid) {
  for (const a of S.percorso.anelli) for (const s of a.spicchi) if (s.pillola === pid) return { anello: a, spicchio: s };
  return null;
}

async function avvia() {
  const ok = await aggiornaDati();
  if (!ok) return;
  S.vista = S.stato.convalescenza ? "debriefing" : "mappa";
  disegnaTutto();
  if (S.vista === "debriefing") await apriDebriefing();
}

// ------------------------------------------------------------------ shell

function disegnaTutto() {
  distruggiModulo();
  radice.replaceChildren(testata(), h("div", { class: "corpo" }, laterale(), h("main", { class: "principale", id: "principale" })));
  disegnaPrincipale();
}

function testata() {
  const st = S.stato;
  const quota = Math.round((st.salute / st.salute_massima) * 100);
  const record = st.record
    ? t("record_formato", { quota: Math.round(st.record.quota_passaggi_puliti * 100), salute: st.record.salute_finale })
    : t("record_nessuno");
  return h("header", { class: "testata" },
    marchio(),
    h("div", {}, h("div", { class: "titolo" }, t("app_titolo")), h("div", { class: "sottotitolo" }, S.percorso.corso)),
    h("div", { class: "spazio" }),
    h("div", { class: "salute", id: "salute", title: t("salute_spiega") },
      icona("cuore"),
      h("span", { class: "salute-etichetta" }, t("salute")),
      h("div", { class: "salute-barra", role: "meter", "aria-valuemin": "0", "aria-valuemax": String(st.salute_massima), "aria-valuenow": String(st.salute) },
        h("div", { class: "salute-riempimento", id: "salute-riempimento", style: `width:${quota}%` })),
      h("span", { class: "salute-valore", id: "salute-valore" }, `${st.salute}/${st.salute_massima}`)),
    h("div", { class: "record", title: t("record") }, icona("coppa"), h("span", {}, t("record"), ": ", h("b", {}, record))),
    selettoreLingua(),
    h("button", { class: "btn btn-fantasma", onclick: esci }, t("esci")));
}

function aggiornaSalute(nuova, delta) {
  S.stato.salute = nuova;
  const riemp = document.getElementById("salute-riempimento");
  const val = document.getElementById("salute-valore");
  const box = document.getElementById("salute");
  if (!riemp) return;
  riemp.style.width = `${Math.round((nuova / S.stato.salute_massima) * 100)}%`;
  val.textContent = `${nuova}/${S.stato.salute_massima}`;
  if (delta) {
    const v = h("span", { class: `salute-volante ${delta > 0 ? "su" : ""}` }, `${delta > 0 ? "+" : ""}${delta}`);
    box.append(v);
    setTimeout(() => v.remove(), 1500);
    if (delta < 0) { box.classList.remove("colpita"); void box.offsetWidth; box.classList.add("colpita"); }
  }
}

async function esci() {
  await api("POST", "/api/uscita");
  mostraAccesso();
}

const COLORI_ANELLO = ["#6366f1", "#7c3aed", "#0891b2", "#0d9488", "#2563eb", "#9333ea", "#db2777", "#ea580c"];

function iconaStato(stato) {
  if (stato === "superato") return h("span", { class: "icona-stato", style: "color:var(--ok)", html: ICONE.spunta });
  if (stato === "non_superato") return h("span", { class: "icona-stato", style: "color:var(--male)", html: ICONE.croce });
  if (stato === "in_corso") return h("span", { class: "icona-stato", style: "color:var(--agisce)", html: ICONE.orologio });
  if (stato === "in_preparazione") return h("span", { class: "icona-stato", style: "color:var(--tenue-2)", html: ICONE.libro });
  return h("span", { class: "icona-stato", style: "color:var(--primario)", html: ICONE.lampo });
}

function etichettaAnello(a) {
  const n = S.percorso.anelli.length;
  if (a.numero === 1) return t("anello_esterno");
  if (a.numero === n) return t("anello_interno");
  return "";
}

function laterale() {
  return h("aside", { class: "laterale" },
    // esercizi pratici (cantiere esercizi/): la pagina e' un modulo a parte, caricato dopo l'accesso
    h("button", { class: `voce voce-esercizi ${S.vista === "esercizi" ? "attiva" : ""}`, id: "voce-esercizi",
      onclick: apriEsercizi }, icona("lampo", "icona-stato"), h("span", {}, t("esercizi_pratici"))),
    h("button", { class: `voce voce-bibliografia ${S.vista === "bibliografia" ? "attiva" : ""}`, id: "voce-bibliografia",
      onclick: apriBibliografia }, icona("libro", "icona-stato"), h("span", {}, t("bibliografia"))),
    h("h2", {}, t("missioni")),
    S.percorso.anelli.map((a, i) => h("div", { class: "gruppo-anello" },
      h("h3", {}, h("span", { class: "pallino", style: `background:${COLORI_ANELLO[i % COLORI_ANELLO.length]}` }),
        `${t("anello")} ${a.numero}`, h("small", {}, etichettaAnello(a)), !a.sbloccato ? icona("lucchetto", "icona-stato") : null),
      a.spicchi.map((s) => h("button", {
        class: `voce ${s.stato} ${S.pid === s.pillola && S.vista !== "mappa" ? "attiva" : ""}`,
        disabled: !a.sbloccato,
        title: `${s.pillola} · ${t("stato_" + s.stato)}`,
        onclick: () => apriPillola(s.pillola),
      }, iconaStato(s.stato), h("span", {}, h("span", { class: "sigla" }, s.pillola), " ", s.titolo),
        s.ha_lezione ? h("span", { class: "distintivo" }, t("interattiva")) : "")))));
}

function disegnaPrincipale() {
  const el = document.getElementById("principale");
  if (!el) return;
  el.replaceChildren();
  if (S.vista === "mappa") el.append(vistaMappa());
  if (S.vista === "esercizi") montaEsercizi(el);
  if (S.vista === "bibliografia") montaBibliografia(el);
}

// ------------------------------------------------------------------ bibliografia (dati/bibliografia.json, senza URL)

function apriBibliografia() {
  S.vista = "bibliografia";
  S.pid = null;
  disegnaTutto();
}

async function montaBibliografia(el) {
  el.replaceChildren(h("div", { class: "caricamento" }, t("caricamento")));
  const r = await api("GET", conLingua("/api/bibliografia"));
  if (!r.ok) return errore(r);
  if (S.vista !== "bibliografia") return;
  const b = r.dati;
  el.replaceChildren(h("div", { class: "bibliografia testo-lungo entra" },
    h("h1", {}, t("bibliografia")),
    h("p", { class: "sottotitolo" }, t("bibliografia_spiega")),
    b.esempio ? h("div", { class: "prova-tu", role: "note" }, icona("libro"), h("span", {}, t("bibliografia_esempio"))) : null,
    b.opere.length
      ? h("ol", { class: "opere" }, b.opere.map((o) => h("li", { class: "opera" },
        h("div", { class: "opera-titolo" }, o.titolo, o.tipo ? h("span", { class: "distintivo" }, o.tipo) : null),
        h("div", { class: "opera-dati" }, [o.autori, o.editore, o.anno].filter((x) => x !== undefined && x !== null && x !== "").join(" · ")),
        o.nota ? h("div", { class: "opera-nota" }, o.nota) : null)))
      : h("p", {}, t("bibliografia_vuota"))));
}

// ------------------------------------------------------------------ esercizi pratici (modulo protetto)

function apriEsercizi() {
  S.vista = "esercizi";
  S.pid = null;
  disegnaTutto();
}

async function montaEsercizi(el) {
  try {
    const mod = await import("/protetto/esercizi/esercizi.js");
    S.modulo = mod.monta(el, { lingua: S.lingua, api, conLingua, avvisa, h });
  } catch (e) {
    el.append(h("div", { class: "scheda" }, `${t("errore")}: ${e.message}`));
  }
}

// ------------------------------------------------------------------ mappa a bersaglio

function arco(cx, cy, r1, r2, a1, a2) {
  const p = (r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const grande = a2 - a1 > Math.PI ? 1 : 0;
  const [x1, y1] = p(r2, a1), [x2, y2] = p(r2, a2), [x3, y3] = p(r1, a2), [x4, y4] = p(r1, a1);
  return `M${x1},${y1} A${r2},${r2} 0 ${grande} 1 ${x2},${y2} L${x3},${y3} A${r1},${r1} 0 ${grande} 0 ${x4},${y4} Z`;
}

function coloreSpicchio(s, i) {
  const base = COLORI_ANELLO[i % COLORI_ANELLO.length];
  switch (s.stato) {
    case "superato": return "url(#g-superato)";
    case "in_corso": return "url(#g-in-corso)";
    case "non_superato": return "url(#g-non-superato)";
    case "in_preparazione": return "url(#tratteggio)";
    default: return base;
  }
}

function vistaMappa() {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 600 600");
  svg.setAttribute("class", "mappa-svg");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", t("mappa_titolo"));
  svg.innerHTML = `<defs>
    <linearGradient id="g-superato" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#34d399"/><stop offset="1" stop-color="#059669"/></linearGradient>
    <linearGradient id="g-in-corso" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fcd34d"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>
    <linearGradient id="g-non-superato" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fda4af"/><stop offset="1" stop-color="#e11d48"/></linearGradient>
    <pattern id="tratteggio" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#e8ecf5"/><line x1="0" y1="0" x2="0" y2="8" stroke="#d3d9e8" stroke-width="3"/></pattern>
    <radialGradient id="g-centro"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#eef0ff"/></radialGradient>
  </defs>`;
  const cx = 300, cy = 300, rMax = 292, rMin = 58;
  const n = S.percorso.anelli.length;
  const banda = (rMax - rMin) / n;
  const tip = document.getElementById("suggerimento");
  S.percorso.anelli.forEach((a, i) => {
    const r2 = rMax - i * banda, r1 = r2 - banda + 3;
    const k = a.spicchi.length;
    const passo = (Math.PI * 2) / k;
    const scarto = Math.min(0.025, passo * 0.08);
    const gruppo = document.createElementNS(NS, "g");
    if (!a.sbloccato) gruppo.setAttribute("opacity", "0.35");
    a.spicchi.forEach((s, j) => {
      const a1 = -Math.PI / 2 + j * passo + scarto, a2 = a1 + passo - 2 * scarto;
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", arco(cx, cy, r1, r2, a1, a2));
      path.setAttribute("fill", coloreSpicchio(s, i));
      path.setAttribute("stroke", "#fff");
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("class", `spicchio ${s.ha_lezione && s.stato === "da_iniziare" ? "attesa" : ""}`);
      path.setAttribute("tabindex", a.sbloccato ? "0" : "-1");
      path.setAttribute("role", "button");
      path.setAttribute("aria-label", `${s.pillola} ${s.titolo}: ${t("stato_" + s.stato)}`);
      if (s.stato === "da_iniziare" && !s.ha_lezione) path.setAttribute("fill-opacity", "0.55");
      const apri = () => { if (a.sbloccato) apriPillola(s.pillola); };
      path.addEventListener("click", apri);
      path.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); apri(); } });
      path.addEventListener("mousemove", (e) => {
        tip.textContent = `${s.pillola} · ${s.titolo} — ${t("stato_" + s.stato)}`;
        tip.style.left = `${e.clientX + 14}px`;
        tip.style.top = `${e.clientY + 14}px`;
        tip.classList.add("visibile");
      });
      path.addEventListener("mouseleave", () => tip.classList.remove("visibile"));
      gruppo.append(path);
      if (s.ha_lezione) {
        const am = (a1 + a2) / 2, rm = (r1 + r2) / 2;
        const stella = document.createElementNS(NS, "path");
        const x = cx + rm * Math.cos(am), y = cy + rm * Math.sin(am);
        stella.setAttribute("d", "M0,-7 L2,-2.2 7,-2 3.1,1.2 4.3,6.3 0,3.5 -4.3,6.3 -3.1,1.2 -7,-2 -2,-2.2Z");
        stella.setAttribute("transform", `translate(${x},${y})`);
        stella.setAttribute("fill", "#fff");
        stella.setAttribute("stroke", "rgba(0,0,0,.25)");
        stella.setAttribute("stroke-width", ".8");
        stella.setAttribute("pointer-events", "none");
        gruppo.append(stella);
      }
    });
    svg.append(gruppo);
  });
  const centro = document.createElementNS(NS, "g");
  centro.innerHTML = `<circle cx="${cx}" cy="${cy}" r="${rMin - 4}" fill="url(#g-centro)" stroke="#dfe3f5"/>
    <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="12" font-weight="700" fill="#5b6684">${t("anello")}</text>
    <text x="${cx}" y="${cy + 16}" text-anchor="middle" font-size="18" font-weight="800" fill="#17203b">1 → ${n}</text>`;
  svg.append(centro);

  const st = S.stato;
  const lato = h("div", {},
    h("h1", {}, t("mappa_titolo")),
    h("p", {}, t("mappa_spiega")),
    h("div", { class: "legenda" },
      ["da_iniziare", "in_corso", "superato", "non_superato", "in_preparazione"].map((k) => h("div", {},
        h("i", { style: `background:${{ da_iniziare: "#6366f1", in_corso: "#f59e0b", superato: "#10b981", non_superato: "#e11d48", in_preparazione: "repeating-linear-gradient(45deg,#e8ecf5 0 3px,#d3d9e8 3px 6px)" }[k]}` }),
        iconaStato(k), t("stato_" + k))),
      h("div", {}, h("i", { style: "background:#fff;border:1px solid #ccd;display:grid;place-items:center", html: '<svg viewBox="-8 -8 16 16" width="14" height="14"><path d="M0,-7 L2,-2.2 7,-2 3.1,1.2 4.3,6.3 0,3.5 -4.3,6.3 -3.1,1.2 -7,-2 -2,-2.2Z" fill="#8b5cf6"/></svg>' }), t("interattiva"))),
    st.padronanza.length ? h("div", { class: "scheda" },
      h("h3", { style: "margin:0;font-size:.8rem;text-transform:uppercase;letter-spacing:.08em;color:var(--tenue)" }, t("padronanza")),
      h("div", { class: "padronanza-lista" }, st.padronanza.map((p) => h("div", { class: "riga" },
        h("span", {}, p.nome), h("div", { class: "mini-barra", title: `${p.puliti}/${p.tentativi}` }, h("span", { style: `width:${Math.round((p.puliti / p.tentativi) * 100)}%` })))))) : null);

  const contenitore = h("div", {});
  if (st.debriefing.motivo === "ripasso" && !st.convalescenza) {
    contenitore.append(h("div", { class: "banner-ripasso entra" }, icona("cuore"),
      h("div", { style: "flex:1" }, h("b", {}, t("ripasso_titolo")), " — ", t("ripasso_pronto", { n: st.debriefing.scaduti }), h("div", { style: "font-size:.85rem;color:var(--tenue)" }, t("ripasso_spiega"))),
      h("button", { class: "btn btn-primario", onclick: () => { S.vista = "debriefing"; apriDebriefing(); } }, t("inizia_ripasso"))));
  }
  contenitore.append(h("div", { class: "mappa entra" }, h("div", {}, svg), lato));
  return contenitore;
}

// ------------------------------------------------------------------ pillola

function distruggiModulo() {
  if (S.canone) S.canone.distruggi();
  S.canone = null;
  if (S.modulo && S.modulo.distruggi) S.modulo.distruggi();
  S.modulo = null;
}

async function apriPillola(pid, opzioni) {
  const op = opzioni || {};
  distruggiModulo();
  S.vista = "pillola";
  S.pid = pid;
  S.segmento = op.segmento || 0;
  S.scheda = op.scheda || "lezione";
  S.passoScaletta = typeof op.passo === "number" ? op.passo : null;
  S.linguaContenuto = op.linguaContenuto || S.lingua;
  disegnaTutto();
  const el = document.getElementById("principale");
  el.replaceChildren(h("div", { class: "caricamento" }, t("caricamento")));
  const r = await api("GET", `/api/pillole/${encodeURIComponent(pid)}?lingua=${S.linguaContenuto}`);
  if (!r.ok) {
    if (r.dati.errore === "traduzione_mancante") return disegnaTraduzioneMancante(el, pid);
    errore(r);
    return;
  }
  S.contenuto = r.dati;
  if (S.scheda === "laboratorio" && !r.dati.laboratorio) S.scheda = "lezione";
  const aperta = S.scheda === "laboratorio" ? r.dati.laboratorio : r.dati.lezione;
  if (typeof op.segmento === "string" && aperta) {
    const i = aperta.segmenti.findIndex((s) => s.id === op.segmento);
    S.segmento = i >= 0 ? i : 0;
  }
  if (!r.dati.lezione) S.scheda = "scaletta";
  disegnaPillola(el);
}

function disegnaTraduzioneMancante(el, pid) {
  const altra = S.lingue.find((l) => l !== S.lingua);
  el.replaceChildren(h("div", { class: "scheda entra" },
    h("p", {}, t("traduzione_mancante")),
    h("div", { style: "display:flex;gap:10px" },
      h("button", { class: "btn", onclick: () => { S.vista = "mappa"; S.pid = null; disegnaTutto(); } }, icona("indietro"), t("torna_mappa")),
      altra ? h("button", { class: "btn btn-primario", onclick: () => apriPillola(pid, { linguaContenuto: altra }) }, t("vedi_in_altra_lingua")) : null)));
}

function pulsanteVerifica(sp) {
  if (!sp || sp.stato === "in_preparazione") return null;
  const etichette = { da_iniziare: "vai_verifica", in_corso: "riprendi_verifica", non_superato: "ripeti_verifica", superato: "verifica_superata" };
  return h("button", { class: "btn btn-primario", disabled: sp.stato === "superato", onclick: () => avviaVerifica(sp.pillola) },
    sp.stato === "superato" ? icona("spunta") : icona("avanti"), t(etichette[sp.stato]));
}

// ------------------------------------------------------------------ riepilogo, riassunto e strumenti del collaudo alpha

function riepilogoDisponibile(sp) {
  if (!sp || sp.stato === "in_preparazione") return false;
  if (alpha()) return true;
  const regola = S.stato.alpha ? S.stato.alpha.riepilogo_in_beta : "mai";
  if (regola === "sempre") return sp.stato !== "da_iniziare";
  if (regola === "solo_superato") return sp.stato === "superato";
  return false;
}

/** Striscia ben marcata con gli acceleratori del collaudo: c'e' solo con alpha.modalita_alpha = true. */
function strumentiAlpha(pid, sp) {
  if (!alpha()) return null;
  const erogabile = sp && sp.stato !== "in_preparazione";
  return h("div", { class: "strumenti-alpha", role: "group", "aria-label": t("alpha_etichetta") },
    h("span", { class: "alpha-etichetta" }, t("alpha_etichetta")),
    h("button", { class: "btn", id: "riassumi-spicchio", onclick: () => apriRiassunto(pid) }, icona("libro"), t("riassumi_spicchio")),
    h("button", { class: "btn btn-alpha", id: "assumi-superato", disabled: !erogabile || sp.stato === "superato",
      onclick: () => confermaAssumi(pid) }, icona("lampo"), t("assumi_superato")));
}

function modale(titolo, ...contenuto) {
  const chiudi = () => { sfondo.remove(); document.removeEventListener("keydown", esc); };
  const esc = (e) => { if (e.key === "Escape") chiudi(); };
  const sfondo = h("div", { class: "modale-sfondo", onclick: (e) => { if (e.target === sfondo) chiudi(); } },
    h("div", { class: "modale entra", role: "dialog", "aria-modal": "true", "aria-label": titolo },
      h("div", { class: "modale-testa" }, h("h2", {}, titolo),
        h("button", { class: "btn btn-fantasma", "aria-label": t("chiudi"), onclick: () => chiudi() }, icona("croce"))),
      h("div", { class: "modale-corpo" }, ...contenuto)));
  document.addEventListener("keydown", esc);
  document.body.append(sfondo);
  return { chiudi, nodo: sfondo };
}

/** Riassunto dello spicchio costruito dai dati gia' esistenti della pillola (riassunto della lezione, passi, scaletta). */
function costruisciRiassunto(c) {
  const lez = c.lezione;
  const riassunto = lez ? lez.segmenti.find((s) => s.id === "riassunto") : null;
  const punti = riassunto ? riassunto.narrazione.slice() : c.scaletta.slice();
  const passi = lez ? lez.segmenti.filter((s) => s.id !== "riassunto").map((s) => ({ titolo: s.titolo, prova: s.prova || null })) : [];
  return { titolo: lez ? lez.titolo : c.titolo, obiettivo: c.obiettivo, punti, passi, concetti: c.concetti.map((k) => k.nome) };
}

async function apriRiassunto(pid) {
  let c = S.contenuto && S.contenuto.id === pid ? S.contenuto : null;
  if (!c) {
    const r = await api("GET", conLingua(`/api/pillole/${encodeURIComponent(pid)}`));
    if (!r.ok) return errore(r);
    c = r.dati;
  }
  const R = costruisciRiassunto(c);
  modale(`${t("riassunto_titolo")} · ${pid}`,
    h("p", { class: "alpha-etichetta" }, t("alpha_etichetta")),
    h("h3", {}, R.titolo), h("p", {}, R.obiettivo),
    h("div", { class: "concetti-pill" }, R.concetti.map((n) => h("span", {}, n))),
    h("h4", {}, t("riassunto_punti_chiave")), h("ul", { class: "riassunto-punti" }, R.punti.map((p) => h("li", {}, p))),
    R.passi.length ? h("h4", {}, t("riassunto_passi")) : null,
    R.passi.length ? h("ol", { class: "riassunto-passi" }, R.passi.map((p) => h("li", {}, h("b", {}, p.titolo), p.prova ? h("div", { class: "nota-passo" }, `${t("prova_tu")}: ${p.prova}`) : null))) : null);
}

function confermaAssumi(pid) {
  const m = modale(t("assumi_superato"),
    h("p", { class: "alpha-etichetta" }, t("alpha_etichetta")),
    h("p", {}, t("assumi_conferma")),
    h("div", { class: "azioni-quiz" },
      h("button", { class: "btn", onclick: () => m.chiudi() }, t("chiudi")),
      h("button", { class: "btn btn-alpha", id: "conferma-assumi", onclick: async () => { m.chiudi(); await assumiSuperato(pid); } }, icona("lampo"), t("assumi_superato"))));
}

async function assumiSuperato(pid) {
  // il modulo della lezione si chiude solo a esito positivo: su errore la lezione resta viva
  const r = await api("POST", `/api/spicchi/${encodeURIComponent(pid)}/assumi_superato`);
  if (!r.ok) return errore(r);
  distruggiModulo();
  avvisa(t("assunto_fatto", { pid }));
  await aggiornaDati();
  const prossimo = r.dati.prossimo_spicchio;
  if (prossimo) return apriPillola(prossimo);
  avvisa(t("nessun_successivo"));
  S.vista = "mappa"; S.pid = null; disegnaTutto();
}

/** Riepilogo di fine spicchio: domanda, risposta data, risposta giusta, spiegazione (in beta secondo config). */
async function apriRiepilogo(pid) {
  const r = await api("GET", conLingua(`/api/spicchi/${encodeURIComponent(pid)}/riepilogo`));
  if (!r.ok) return errore(r);
  distruggiModulo();
  // aperto dal quiz (o rimasto aperto dopo un cambio di lingua): si offre il ritorno alla domanda in corso
  const dalQuiz = (S.vista === "quiz" || S.vista === "riepilogo") && S.quiz && S.quiz.contesto === "spicchio" && S.quiz.pid === pid && S.quiz.domanda
    && (S.vista === "quiz" || S.riepilogoDalQuiz);
  S.riepilogoDalQuiz = Boolean(dalQuiz);
  S.vista = "riepilogo";
  S.pid = pid;
  disegnaTutto();
  const R = r.dati;
  const el = document.getElementById("principale");
  const rigaLivello = (L) => {
    const data = L.risposta_data;
    const stato = data ? (L.corretta ? "ok" : "male") : "vuoto";
    return h("div", { class: `riepilogo-livello ${stato}` },
      h("div", { class: "riepilogo-domanda" }, h("span", { class: `livello-badge ${L.livello === 2 ? "l2" : ""}` }, L.livello === 1 ? t("livello1") : t("livello2")), h("b", {}, L.testo)),
      h("p", {}, h("span", { class: "etichetta" }, t("tua_risposta")),
        data ? h("span", { class: "risposta-data" }, L.corretta ? icona("spunta") : icona("croce"), " ", data.testo)
          : h("i", {}, L._l1Sbagliata ? t("non_posta") : t("non_risposta")),
        data && !L.corretta && data.spiegazione ? h("span", { class: "spiega-scelta" }, "→ ", data.spiegazione) : null),
      h("p", {}, h("span", { class: "etichetta" }, t("risposta_giusta")), h("b", {}, L.risposta_giusta)),
      h("p", {}, h("span", { class: "etichetta" }, t("perche")), L.perche));
  };
  el.replaceChildren(h("div", { class: "riepilogo-spicchio entra" },
    h("div", { class: "pillola-testa" },
      h("div", {}, h("div", { class: "sopratitolo" }, pid), h("h1", {}, t("riepilogo_titolo")), h("p", { class: "sottotitolo" }, t("riepilogo_spiega")),
        R.assunto ? h("p", { class: "alpha-etichetta" }, t("spicchio_assunto")) : null),
      h("div", { class: "azioni" },
        dalQuiz ? h("button", { class: "btn btn-primario", id: "riepilogo-torna-quiz", onclick: tornaAlQuiz }, icona("indietro"), t("riprendi_verifica")) : null,
        h("button", { class: "btn", onclick: () => apriPillola(pid) }, icona("indietro"), t("scheda_lezione")),
        h("button", { class: "btn", onclick: () => { S.vista = "mappa"; S.pid = null; disegnaTutto(); } }, t("torna_mappa")))),
    R.voci.map((v) => {
      const [l1, l2] = v.livelli;
      if (l1.risposta_data && !l1.corretta) l2._l1Sbagliata = true;
      return h("section", { class: "domanda-scheda riepilogo-voce" },
        h("div", { class: "passo-di" }, `${t("domanda")} ${v.numero} ${t("di")} ${R.voci.length}`),
        rigaLivello(l1), rigaLivello(l2), riquadroTermini(v.glossario));
    })));
}

/** Dal riepilogo aperto durante la verifica torna alla domanda in corso: col riscontro se era gia' risposta,
 *  altrimenti ricaricata dal server (sola lettura, nella lingua attuale). */
function tornaAlQuiz() {
  S.riepilogoDalQuiz = false;
  S.vista = "quiz";
  disegnaTutto();
  if (S.quiz.risposto && S.quiz.esito) return ripristinaDomanda();
  return caricaDomandaCorrente();
}

function riquadroTermini(voci) {
  if (!voci || !voci.length) return null;
  return h("aside", { class: "glossario", "aria-label": t("termini") },
    h("h4", {}, t("termini")),
    h("dl", {}, voci.flatMap((v) => [h("dt", {}, v.termine), h("dd", {}, v.definizione)])));
}

function disegnaPillola(el) {
  const c = S.contenuto;
  const info = spicchio(c.id);
  // il laboratorio (seconda lezione facoltativa della pillola) ha una scheda tutta sua
  const lab = c.laboratorio;
  const lez = S.scheda === "laboratorio" && lab ? lab : c.lezione;
  el.replaceChildren();
  el.append(h("div", { class: "pillola-testa entra" },
    h("div", {},
      h("div", { class: "sopratitolo" }, `${c.id} · ${info ? info.spicchio.titolo_modulo : ""}`),
      h("h1", {}, lez ? lez.titolo : c.titolo),
      h("p", { class: "sottotitolo" }, lez ? lez.sottotitolo : c.obiettivo),
      h("div", { class: "concetti-pill" }, c.concetti.map((k) => h("span", { title: k.id }, k.nome)))),
    h("div", { class: "azioni" },
      h("button", { class: "btn", onclick: () => { S.vista = "mappa"; S.pid = null; disegnaTutto(); } }, icona("indietro"), t("torna_mappa")),
      riepilogoDisponibile(info && info.spicchio) ? h("button", { class: "btn", id: "apri-riepilogo", onclick: () => apriRiepilogo(c.id) }, icona("libro"), t("apri_riepilogo")) : null,
      pulsanteVerifica(info && info.spicchio))));
  const attrezzi = strumentiAlpha(c.id, info && info.spicchio);
  if (attrezzi) el.append(attrezzi);
  const schede = [
    c.lezione ? ["lezione", t("scheda_lezione")] : null,
    lab ? ["laboratorio", t("scheda_laboratorio")] : null,
    ["scaletta", t("scheda_scaletta")],
  ].filter(Boolean);
  el.append(h("div", { class: "schede-tab", role: "tablist" }, schede.map(([k, etichetta]) => h("button", {
    role: "tab", "aria-selected": String(S.scheda === k),
    onclick: () => { if (S.scheda !== k) S.segmento = 0; distruggiModulo(); S.scheda = k; disegnaPillola(el); },
  }, etichetta))));
  const area = h("div", { id: "area-scheda" });
  el.append(area);
  if ((S.scheda === "lezione" || S.scheda === "laboratorio") && lez) montaLezione(area, lez);
  else disegnaScaletta(area, c);
}

function disegnaScaletta(area, c) {
  area.append(h("div", { class: "testo-lungo entra" },
    !c.lezione ? h("div", { class: "prova-tu", style: "margin-bottom:16px" }, icona("libro"), h("span", {}, t("lezione_non_pronta"))) : null,
    h("h3", {}, t("obiettivo_pillola")), h("p", {}, c.obiettivo),
    h("h3", {}, t("scheda_scaletta")), h("ol", {}, c.scaletta.map((v, k) => h("li", k === S.passoScaletta ? { class: "passo-aiuto" } : {}, v))),
    h("h3", {}, `${t("scheda_animazione_prevista")}: «${c.animazione.titolo}»`),
    h("ul", {}, c.animazione.progetto.split("\n").map((v) => h("li", {}, v.replace(/^- /, ""))))));
}

async function montaLezione(area, lez) {
  const narr = h("section", { class: "narrazione finestra", "aria-live": "polite", "data-finestra": "1" });
  const messaggio = h("div", { class: "guida-messaggio", id: "guida-messaggio", "aria-live": "polite" });
  const guida = h("div", { class: "guida-lezione", id: "guida-lezione" },
    h("div", { class: "avviso-lettura", id: "avviso-lettura" }, icona("libro"), h("span", {}, t("avviso_lettura"))),
    messaggio,
    h("button", { class: "btn", id: "rivedi-animazione", onclick: () => rivediAnimazione(lez) }, icona("orologio"), t("rivedi_animazione")));
  const banco = h("div", { id: "banco" });
  area.append(narr, guida, banco);
  try {
    const mod = await import(`/protetto/animazioni/${lez.componente}.js`);
    S.modulo = mod.monta(banco, lez, { lingua: S.lingua });
  } catch (e) {
    banco.append(h("div", { class: "scheda" }, `${t("errore")}: ${e.message}`));
    console.error(e);
    return;
  }
  disegnaSegmento(narr, lez);
  S.canone = applicaCanone(narr, banco.querySelector(".banco"), messaggio);
}

/** "Rivedi l'animazione": rilancia la sequenza del passo corrente dal suo stato di partenza. */
function rivediAnimazione(lez) {
  const seg = lez.segmenti[S.segmento];
  if (!S.modulo || !S.modulo.applica || !seg) return;
  try { S.modulo.applica(seg.stato_animazione); } catch (e) { console.error(e); avvisa(`${t("errore")}: ${e.message}`, "male"); }
}

// ------------------------------------------------------------------ canone di lettura delle lezioni (componente condiviso)
// Vale per TUTTE le lezioni senza toccarle una per una: ogni componente costruisce il suo banco come
// [comandi, scena, pannello destro]; la shell lo riordina nell'ordine di lettura canonico sinistra→destra
// (① concetto sopra, ② spiegazioni/diario, ③ animazione, ④ comandi), numera le finestre e, quando una
// manipolazione aggiorna una finestra, ne illumina il bordo e scrive il messaggio-guida.

const DURATA_ILLUMINA_MS = 1400;
const ATTESA_GUIDA_MS = 380;

/** Ruolo di ciascun figlio del banco: "scena", "spiegazioni" (pannello destro/diario) o "comandi". */
function ruoliBanco(banco) {
  const figli = [...banco.children];
  return figli.map((f) => (f.classList.contains("scena") ? "scena" : f.classList.contains("destra") ? "spiegazioni" : "comandi"));
}

/** Etichetta succinta del comando toccato (testo del bottone, etichetta del cursore o dell'interruttore). */
function etichettaComando(bersaglio) {
  const el = bersaglio.closest("button, label, select, input, [role=button], [aria-label]") || bersaglio;
  let testo = "";
  if (el.matches("input[type=range]")) {
    const riga = el.closest(".cursore");
    testo = el.getAttribute("aria-label") || (riga && riga.querySelector(".riga span") ? riga.querySelector(".riga span").textContent : "");
  } else if (el.matches("input[type=checkbox], input[type=radio]")) {
    const lab = el.closest("label");
    testo = lab ? lab.textContent : el.getAttribute("aria-label") || "";
  } else if (el.matches("select")) {
    testo = el.getAttribute("aria-label") || (el.selectedOptions && el.selectedOptions[0] ? el.selectedOptions[0].textContent : "");
  } else {
    testo = el.getAttribute("aria-label") || el.textContent || "";
  }
  testo = testo.replace(/\s+/g, " ").trim();
  return testo.length > 48 ? `${testo.slice(0, 47).trimEnd()}…` : testo;
}

function elencoNumeri(numeri) {
  const segni = numeri.map((n) => NUMERI_FINESTRA[n - 1] || String(n));
  if (segni.length <= 1) return segni.join("");
  return `${segni.slice(0, -1).join(", ")}${t("congiunzione_e")}${segni[segni.length - 1]}`;
}

function applicaCanone(narr, banco, messaggio) {
  if (!banco) return { distruggi() {} };
  banco.classList.add("canone");
  const ruoli = ruoliBanco(banco);
  const ORDINE = { spiegazioni: 2, scena: 3, comandi: 4 };
  const NOMI = { spiegazioni: "finestra_spiegazioni", scena: "finestra_scena", comandi: "finestra_comandi" };
  const finestre = [{ nodo: narr, numero: 1, ruolo: "concetto" }];
  [...banco.children].forEach((f, i) => {
    const ruolo = ruoli[i];
    const numero = ORDINE[ruolo];
    f.classList.add("finestra", `finestra-${ruolo}`);
    f.dataset.finestra = String(numero);
    finestre.push({ nodo: f, numero, ruolo });
  });
  // numero disegnato da CSS (::before su data-numero): resiste ai ridisegni dei componenti, che svuotano i pannelli
  for (const w of finestre) {
    const nome = t(w.ruolo === "concetto" ? "finestra_concetto" : NOMI[w.ruolo]);
    w.nodo.dataset.numero = NUMERI_FINESTRA[w.numero - 1];
    w.nodo.setAttribute("aria-roledescription", t("finestra_n", { n: w.numero, nome }));
  }
  let toccate = new Set();
  let origine = null;
  let cosa = "";
  let timer = null;
  const timerLuce = new Map();
  const osservatori = finestre.filter((w) => w.ruolo !== "concetto").map((w) => {
    const o = new MutationObserver(() => { if (origine) toccate.add(w.numero); });
    o.observe(w.nodo, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["class", "style", "transform", "fill", "stroke", "opacity", "d", "aria-pressed", "width", "height", "x", "y"] });
    return o;
  });
  const illumina = (w) => {
    w.nodo.classList.remove("illumina");
    void w.nodo.offsetWidth;
    w.nodo.classList.add("illumina");
    clearTimeout(timerLuce.get(w.numero));
    timerLuce.set(w.numero, setTimeout(() => w.nodo.classList.remove("illumina"), DURATA_ILLUMINA_MS));
  };
  const concludi = () => {
    timer = null;
    const numeri = [...toccate].filter((n) => n !== origine).sort();
    origine = null;
    if (!numeri.length || !cosa) return;
    for (const w of finestre) if (numeri.includes(w.numero)) illumina(w);
    messaggio.textContent = t(numeri.length === 1 ? "guida_una" : "guida_piu", { cosa, n: elencoNumeri(numeri) });
    messaggio.classList.remove("nuovo"); void messaggio.offsetWidth; messaggio.classList.add("nuovo");
  };
  const suInterazione = (ev) => {
    const w = finestre.find((x) => x.ruolo !== "concetto" && x.nodo.contains(ev.target));
    if (!w) return;
    if (ev.type === "input" && !ev.target.matches("input[type=range]")) return;
    origine = w.numero;
    cosa = etichettaComando(ev.target);
    toccate = new Set();
    clearTimeout(timer);
    timer = setTimeout(concludi, ATTESA_GUIDA_MS);
  };
  for (const tipo of ["click", "change", "input"]) banco.addEventListener(tipo, suInterazione, true);
  // l'unico testo che non puo' andare a capo e' la voce scelta di un menu a tendina: ellissi (CSS) + title col testo intero
  const titoloMenu = (s) => { if (s.selectedOptions && s.selectedOptions[0]) s.title = s.selectedOptions[0].textContent; };
  banco.querySelectorAll("select").forEach(titoloMenu);
  banco.addEventListener("change", (ev) => { if (ev.target.matches && ev.target.matches("select")) titoloMenu(ev.target); });
  return {
    finestre: () => finestre.map((w) => ({ numero: w.numero, ruolo: w.ruolo })),
    distruggi() {
      osservatori.forEach((o) => o.disconnect());
      clearTimeout(timer);
      timerLuce.forEach((x) => clearTimeout(x));
      for (const tipo of ["click", "change", "input"]) banco.removeEventListener(tipo, suInterazione, true);
    },
  };
}

function disegnaSegmento(narr, lez) {
  const i = S.segmento;
  const seg = lez.segmenti[i];
  narr.replaceChildren(
    h("div", { class: "entra" },
      h("div", { class: "passo-di" }, `${t("segmento")} ${i + 1} ${t("di")} ${lez.segmenti.length}`),
      h("h2", {}, seg.titolo),
      seg.narrazione.map((p) => h("p", {}, p)),
      seg.prova ? h("div", { class: "prova-tu" }, h("b", {}, `${t("prova_tu")}:`), h("span", {}, seg.prova)) : null),
    h("div", {},
      h("div", { class: "puntini" }, lez.segmenti.map((s, k) => h("button", {
        "aria-label": `${t("segmento")} ${k + 1}: ${s.titolo}`, "aria-current": String(k === i), title: s.titolo,
        onclick: () => { S.segmento = k; disegnaSegmento(narr, lez); },
      }))),
      h("div", { class: "nav-segmenti" },
        h("button", { class: "btn", disabled: i === 0, onclick: () => { S.segmento--; disegnaSegmento(narr, lez); } }, icona("indietro"), t("precedente")),
        i < lez.segmenti.length - 1
          ? h("button", { class: "btn btn-primario", onclick: () => { S.segmento++; disegnaSegmento(narr, lez); } }, t("successivo"), icona("avanti"))
          : pulsanteVerifica(spicchio(S.pid) && spicchio(S.pid).spicchio))));
  narr.dataset.numero = NUMERI_FINESTRA[0];
  const guida = document.getElementById("guida-messaggio");
  if (guida) guida.textContent = "";
  if (S.modulo && S.modulo.applica) S.modulo.applica(seg.stato_animazione);
}

// ------------------------------------------------------------------ verifica (quiz a due livelli)

async function avviaVerifica(pid) {
  distruggiModulo();
  const r = await api("POST", `/api/spicchi/${encodeURIComponent(pid)}/inizia`);
  if (!r.ok) {
    if (r.dati.errore === "convalescenza") { S.vista = "debriefing"; disegnaTutto(); return apriDebriefing(); }
    return errore(r);
  }
  S.vista = "quiz";
  S.pid = pid;
  S.quiz = { contesto: "spicchio", pid, risposto: false };
  disegnaTutto();
  await caricaDomandaCorrente();
}

async function caricaDomandaCorrente() {
  const q = S.quiz;
  const url = q.contesto === "spicchio" ? `/api/spicchi/${encodeURIComponent(q.pid)}/domanda` : "/api/debriefing/domanda";
  const r = await api("GET", conLingua(url));
  if (!r.ok) {
    if (r.dati.errore === "convalescenza") { S.vista = "debriefing"; disegnaTutto(); return apriDebriefing(); }
    return errore(r);
  }
  q.risposto = false;
  q.domanda = r.dati;
  q.progresso = r.dati.progresso;
  if (q.contesto === "spicchio") q.risposteDate = r.dati.progresso.risposte_date || 0;
  disegnaTutto();
  disegnaDomanda();
}

function disegnaDomanda() {
  const el = document.getElementById("principale");
  const q = S.quiz;
  const d = q.domanda;
  const media = d.opzioni.reduce((s, o) => s + o.testo.length, 0) / d.opzioni.length;
  const titolo = q.contesto === "spicchio"
    ? `${t("verifica")} · ${q.pid}`
    : (S.stato.convalescenza ? t("convalescenza_titolo") : t("ripasso_titolo"));
  const pct = Math.round(((q.progresso.striscia - (d.livello === 1 ? 1 : 0.5)) / q.progresso.totale) * 100);
  const opzioni = h("div", { class: `opzioni ${media < 34 ? "compatte" : ""}`, id: "opzioni" },
    d.opzioni.map((o, i) => h("button", { class: "opzione", "data-pos": String(o.posizione), onclick: () => rispondi(o.posizione) },
      h("span", { class: "lettera" }, String.fromCharCode(65 + i)), h("span", {}, o.testo))));
  const indietro = indiceRevisione();
  el.replaceChildren(h("div", { class: "quiz entra" },
    h("div", { class: "quiz-testa" },
      q.contesto === "spicchio" ? h("button", { class: "btn btn-fantasma", "aria-label": t("scheda_lezione"), title: t("scheda_lezione"), onclick: () => apriPillola(q.pid) }, icona("indietro")) : null,
      h("b", {}, titolo),
      h("div", { class: "avanzamento", "aria-hidden": "true" }, h("span", { style: `width:${pct}%` })),
      h("span", { class: "contatore-domanda" }, `${t("domanda")} ${q.progresso.striscia} ${t("di")} ${q.progresso.totale}`),
      h("span", { class: `livello-badge ${d.livello === 2 ? "l2" : ""}` }, d.livello === 1 ? t("livello1") : t("livello2"))),
    alpha() && q.contesto === "spicchio" ? h("div", { class: "quiz-strumenti" },
      h("button", { class: "btn", id: "domanda-precedente", disabled: indietro < 0, onclick: () => disegnaRevisione(indietro) }, icona("indietro"), t("domanda_precedente")),
      h("button", { class: "btn", id: "riepilogo-quiz", onclick: () => apriRiepilogo(q.pid) }, icona("libro"), t("apri_riepilogo"))) : null,
    h("div", { class: "domanda-scheda" }, h("h2", {}, d.testo), opzioni, riquadroTermini(d.glossario), h("div", { id: "riscontro" }))));
}

/** Indice (nelle risposte date dello spicchio) della domanda da rivedere andando "indietro" da quella mostrata. */
function indiceRevisione() {
  const q = S.quiz;
  if (!q || q.contesto !== "spicchio") return -1;
  const n = q.risposteDate || 0;
  return q.risposto ? n - 2 : n - 1;
}

/** Rivede una risposta gia' data (solo alpha): scelta evidenziata, giusta in verde, salute mai ricalcolata. */
async function disegnaRevisione(indice) {
  const q = S.quiz;
  const r = await api("GET", conLingua(`/api/spicchi/${encodeURIComponent(q.pid)}/rivedi/${indice}`));
  if (!r.ok) return errore(r);
  const v = r.dati;
  const el = document.getElementById("principale");
  const opzioni = h("div", { class: "opzioni revisione", id: "opzioni" },
    v.opzioni.map((o, i) => {
      const classe = o.posizione === v.posizione_corretta ? "giusta" : o.posizione === v.posizione_scelta ? "sbagliata" : "spenta";
      return h("button", { class: `opzione ${classe} ${o.posizione === v.posizione_scelta ? "scelta" : ""}`, disabled: true, "data-pos": String(o.posizione) },
        h("span", { class: "lettera" }, String.fromCharCode(65 + i)), h("span", {}, o.testo),
        o.posizione === v.posizione_scelta ? h("span", { class: "segno-scelta" }, t("tua_risposta")) : null);
    }));
  el.replaceChildren(h("div", { class: "quiz entra" },
    h("div", { class: "quiz-testa" },
      h("b", {}, `${t("rivedi_titolo")} · ${q.pid}`),
      h("div", { class: "spazio" }),
      v.striscia ? h("span", { class: "contatore-domanda" }, `${t("domanda")} ${v.striscia} ${t("di")} ${v.strisce}`) : null,
      h("span", { class: `livello-badge ${v.livello === 2 ? "l2" : ""}` }, v.livello === 1 ? t("livello1") : t("livello2"))),
    h("div", { class: "quiz-strumenti" },
      h("button", { class: "btn", id: "revisione-indietro", disabled: indice <= 0, onclick: () => disegnaRevisione(indice - 1) }, icona("indietro"), t("piu_indietro")),
      h("button", { class: "btn", id: "revisione-avanti", disabled: indice >= v.totale - 1, onclick: () => disegnaRevisione(indice + 1) }, t("piu_avanti"), icona("avanti")),
      h("button", { class: "btn btn-primario", id: "torna-domanda", onclick: ripristinaDomanda }, t("torna_domanda_corrente"))),
    h("p", { class: "nota-revisione", role: "note" }, icona("cuore"), " ", t("rivedi_nota")),
    h("div", { class: "domanda-scheda" }, h("h2", {}, v.testo), opzioni, riquadroTermini(v.glossario),
      h("div", { class: `riscontro ${v.corretta ? "ok" : "male"}` },
        h("p", {}, h("span", { class: "etichetta" }, t("tua_risposta")), v.scelta.testo,
          !v.corretta && v.scelta.spiegazione ? h("span", { class: "spiega-scelta" }, "→ ", v.scelta.spiegazione) : null),
        !v.corretta ? h("p", {}, h("span", { class: "etichetta" }, t("risposta_giusta")), h("b", {}, v.opzioni.find((o) => o.posizione === v.posizione_corretta).testo)) : null,
        h("p", {}, h("span", { class: "etichetta" }, t("perche")), v.perche)))));
}

/** Torna alla domanda in corso com'era (con il riscontro, se gia' risposta) senza richiamare il server. */
function ripristinaDomanda() {
  const q = S.quiz;
  disegnaDomanda();
  if (q.risposto && q.esito) {
    segnaOpzioni(q.esito, q.ultimaPosizione);
    disegnaRiscontro(q.esito);
  }
}

function segnaOpzioni(e, posizione) {
  document.querySelectorAll("#opzioni .opzione").forEach((b) => {
    b.disabled = true;
    const p = Number(b.dataset.pos);
    if (p === e.posizione_corretta) b.classList.add("giusta");
    else if (p === posizione) b.classList.add("sbagliata");
    else b.classList.add("spenta");
  });
}

async function rispondi(posizione) {
  const q = S.quiz;
  if (q.risposto) return;
  q.risposto = true;
  document.querySelectorAll("#opzioni .opzione").forEach((b) => { b.disabled = true; });
  const r = await api("POST", conLingua("/api/risposta"), { posizione });
  if (!r.ok) { q.risposto = false; return errore(r); }
  const e = r.dati;
  q.esito = e;
  q.ultimaPosizione = posizione;
  if (q.contesto === "spicchio") q.risposteDate = (q.risposteDate || 0) + 1;
  segnaOpzioni(e, posizione);
  const strumento = document.getElementById("domanda-precedente");
  if (strumento) strumento.disabled = indiceRevisione() < 0;
  const delta = e.salute - S.stato.salute;
  aggiornaSalute(e.salute, delta);
  S.stato.convalescenza = e.convalescenza;
  disegnaRiscontro(e, posizione);
}

function disegnaRiscontro(e) {
  const box = document.getElementById("riscontro");
  const giusta = e.corretta;
  const parti = [
    h("h3", {}, giusta ? icona("spunta") : icona("croce"), giusta ? t("giusto") : t("sbagliato"),
      !giusta && e.scelta.tipo_distrattore ? h("span", { class: "tipo-chip", style: "color:var(--male)" }, t("tipo_" + e.scelta.tipo_distrattore)) : null,
      e.danno ? h("span", { class: "danno-chip" }, `−${e.danno} ${t("danno")}`) : null),
  ];
  if (!giusta) {
    parti.push(h("p", {}, h("span", { class: "etichetta" }, t("hai_scelto")), e.scelta.testo, e.scelta.spiegazione ? h("span", { style: "display:block;color:var(--tenue)" }, "→ ", e.scelta.spiegazione) : null));
    parti.push(h("p", {}, h("span", { class: "etichetta" }, t("risposta_giusta")), h("b", {}, e.risposta_corretta.testo)));
  }
  if (e.prossimo !== "livello2" || !giusta) parti.push(h("p", {}, h("span", { class: "etichetta" }, t("perche")), e.perche));
  if (e.prossimo === "livello2") parti.push(h("p", { style: "font-weight:600;color:#7e22ce" }, t("ora_il_perche")));
  if (e.striscia_pulita) parti.push(h("p", { style: "color:var(--ok);font-weight:600" }, t("striscia_pulita")));
  if (e.recuperato) parti.push(h("p", { style: "color:var(--ok);font-weight:700" }, t("recuperato", { n: e.recuperato })));
  if (e.aiuto) {
    parti.push(h("div", { class: "aiuto" }, icona("libro"),
      h("div", { style: "flex:1" }, h("b", {}, t("aiuto_titolo")), h("div", {}, e.aiuto.tipo === "segmento" ? t("aiuto_segmento") : t("aiuto_pillola"))),
      h("button", { class: "btn", onclick: () => apriPillola(e.aiuto.pillola, e.aiuto.tipo === "segmento"
        ? { segmento: e.aiuto.segmento, scheda: e.aiuto.scheda, passo: e.aiuto.passo }
        : { segmento: 0 }) }, t("apri_aiuto"))));
  }
  box.replaceChildren(h("div", { class: `riscontro ${giusta ? "ok" : "male"}` }, parti),
    h("div", { class: "azioni-quiz" }, h("button", { class: "btn btn-primario", id: "continua", onclick: continua }, t("continua"), icona("avanti"))));
  document.getElementById("continua").focus({ preventScroll: true });
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function continua() {
  const q = S.quiz;
  const e = q.esito;
  if (e.prossimo === "livello2") {
    q.domanda = e.livello2;
    q.risposto = false;
    disegnaDomanda();
    return;
  }
  if (e.prossimo === "debriefing") { await aggiornaDati(); S.vista = "debriefing"; disegnaTutto(); return apriDebriefing(); }
  if (e.prossimo === "striscia_successiva" || e.prossimo === "ripasso_successivo") return caricaDomandaCorrente();
  if (e.prossimo === "spicchio_concluso") return disegnaConclusione(e);
  if (e.prossimo === "debriefing_finito") return disegnaFineDebriefing();
  avvisa(`${t("errore")}: prossimo passo sconosciuto «${e.prossimo}»`, "male");
}

function disegnaConclusione(e) {
  aggiornaDati().then(() => {
    disegnaTutto();
    const el = document.getElementById("principale");
    const sp = e.spicchio;
    const superato = sp.stato === "superato";
    const rp = e.risultato_percorso;
    el.replaceChildren(h("div", { class: "quiz entra" }, h("div", { class: "domanda-scheda conclusione" },
      h("div", { class: "grande" }, superato ? "🎯" : "🔁"),
      h("h2", {}, superato ? t("esito_superato") : t("spicchio_concluso")),
      h("p", {}, t("puliti_su", { puliti: sp.puliti, totale: sp.strisce, soglia: Math.round(sp.soglia * 100) })),
      !superato ? h("p", {}, t("esito_non_superato")) : null,
      rp ? h("div", { class: "scheda", style: "margin:16px auto;max-width:460px" },
        h("p", {}, h("b", {}, t("percorso_completo"))),
        rp.nuovo_record ? h("p", { style: "color:var(--avviso);font-weight:800" }, icona("coppa"), " ", t("nuovo_record")) : null,
        h("p", {}, t("record_formato", { quota: Math.round(rp.record.quota_passaggi_puliti * 100), salute: rp.record.salute_finale }))) : null,
      h("div", { class: "azioni-quiz", style: "justify-content:center" },
        h("button", { class: "btn", onclick: () => { S.vista = "mappa"; S.pid = null; disegnaTutto(); } }, t("torna_mappa")),
        riepilogoDisponibile(sp) ? h("button", { class: "btn", id: "riepilogo-fine", onclick: () => apriRiepilogo(sp.pillola) }, icona("libro"), t("apri_riepilogo")) : null,
        !superato ? h("button", { class: "btn", onclick: () => apriPillola(sp.pillola) }, t("scheda_lezione")) : null,
        !superato ? h("button", { class: "btn btn-primario", onclick: () => avviaVerifica(sp.pillola) }, t("ripeti_verifica")) : null,
        rp ? h("button", { class: "btn btn-primario", onclick: ricominciaPercorso }, t("ricomincia_percorso")) : null))));
    if (superato) coriandoli();
  });
}

async function ricominciaPercorso() {
  const r = await api("POST", "/api/percorso/ricomincia");
  if (!r.ok) return errore(r);
  await aggiornaDati();
  S.vista = "mappa";
  disegnaTutto();
}

function coriandoli() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const tela = h("canvas", { class: "coriandoli" });
  document.body.append(tela);
  const ctx = tela.getContext("2d");
  tela.width = innerWidth; tela.height = innerHeight;
  const colori = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#f43f5e"];
  const pezzi = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 200, y: innerHeight / 3, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4,
    r: Math.random() * 6 + 3, c: colori[Math.floor(Math.random() * colori.length)], a: Math.random() * 6, va: (Math.random() - 0.5) * 0.3,
  }));
  const inizio = performance.now();
  (function frame(ora) {
    ctx.clearRect(0, 0, tela.width, tela.height);
    for (const p of pezzi) {
      p.vy += 0.32; p.x += p.vx; p.y += p.vy; p.a += p.va; p.vx *= 0.99;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); ctx.restore();
    }
    if (ora - inizio < 2600) requestAnimationFrame(frame); else tela.remove();
  })(inizio);
}

// ------------------------------------------------------------------ debriefing (convalescenza e ripasso)

async function apriDebriefing() {
  const el = document.getElementById("principale");
  const r = await api("GET", "/api/debriefing");
  if (!r.ok) return errore(r);
  const info = r.dati;
  const conv = info.motivo === "convalescenza";
  if (!info.in_corso && !info.motivo) { S.vista = "mappa"; disegnaTutto(); return; }
  const avviaRip = async () => {
    const r2 = await api("POST", "/api/debriefing/inizia");
    if (!r2.ok) return errore(r2);
    if (r2.dati.elementi === 0) return disegnaFineDebriefing(true);
    S.quiz = { contesto: "ripasso", risposto: false };
    S.vista = "quiz";
    await caricaDomandaCorrente();
  };
  if (info.in_corso && info.indice < info.elementi) {
    S.quiz = { contesto: "ripasso", risposto: false };
    S.vista = "quiz";
    return caricaDomandaCorrente();
  }
  if (info.in_corso) return disegnaFineDebriefing();
  el.replaceChildren(h("div", { class: "quiz entra" }, h("div", { class: "domanda-scheda conclusione" },
    h("div", { class: "grande" }, conv ? "🛟" : "🧠"),
    h("h2", {}, conv ? t("convalescenza_titolo") : t("ripasso_titolo")),
    h("p", {}, conv ? t("convalescenza_spiega") : t("ripasso_spiega")),
    h("p", {}, t("ripasso_pronto", { n: conv ? info.totale : info.scaduti })),
    h("div", { class: "azioni-quiz", style: "justify-content:center" },
      !conv ? h("button", { class: "btn", onclick: () => { S.vista = "mappa"; disegnaTutto(); } }, t("torna_mappa")) : null,
      h("button", { class: "btn btn-primario", onclick: avviaRip }, t("inizia_ripasso"))))));
}

function disegnaFineDebriefing(vuoto) {
  const el = document.getElementById("principale");
  el.replaceChildren(h("div", { class: "quiz entra" }, h("div", { class: "domanda-scheda conclusione" },
    h("div", { class: "grande" }, "💚"),
    h("h2", {}, S.stato.convalescenza ? t("convalescenza_titolo") : t("ripasso_titolo")),
    vuoto ? h("p", {}, t("ripasso_vuoto")) : null,
    h("div", { class: "azioni-quiz", style: "justify-content:center" },
      h("button", {
        class: "btn btn-primario",
        onclick: async () => {
          const r = await api("POST", "/api/debriefing/concludi");
          if (!r.ok) return errore(r);
          const prima = S.stato.salute;
          await aggiornaDati();
          S.vista = "mappa";
          disegnaTutto();
          aggiornaSalute(r.dati.salute, r.dati.salute - prima);
        },
      }, t("concludi_ripasso"))))));
}

// ------------------------------------------------------------------ avvio

(async function inizio() {
  const preferita = leggiLinguaSalvata();
  const r0 = await fetch("/api/lingue");
  const base = await r0.json();
  const lingua = preferita && base.lingue.includes(preferita) ? preferita : base.predefinita;
  await caricaInterfaccia(lingua);
  const r = await fetch(conLingua("/api/stato"), { credentials: "same-origin" });
  if (r.status === 401) { mostraAccesso(); return; }
  await avvia();
})();
