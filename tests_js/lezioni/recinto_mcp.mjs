// Prove della lezione PO4.2 "Il recinto" (logica pura, entrambe le lingue).
import { normalizza, dentro, percorsoReale, valuta, bilancio, argsFilesystem, dopoEvento, catena, esitoCaso, verifica, arrivoGettone, richiesteMandate, aCapo } from "../../webapp/animazioni/recinto_mcp.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("recinto_mcp.json"), lingua);
  const sc = L.scenario;
  const base = { ...L.segmenti[0].stato_animazione };
  const st = (d) => ({ ...base, ...d });
  const req = (id) => sc.richieste.find((r) => r.id === id);
  const tipo = (s, id) => valuta(sc, s, req(id)).tipo;
  const narr = (id) => L.segmenti.find((x) => x.id === id).narrazione.join(" ");

  prova(`[${lingua}] recinto_mcp: segmenti validi, stesse chiavi, riassunto in 3 frasi senza prova`, () => {
    const chiavi = Object.keys(base).sort().join();
    for (const seg of L.segmenti) {
      assert.equal(Object.keys(seg.stato_animazione).sort().join(), chiavi, seg.id);
      assert.ok(bilancio(sc, seg.stato_animazione).tot_pericolose > 0);
      assert.ok(catena(sc, seg.stato_animazione).testo);
      if (seg.id !== "riassunto") assert.ok(seg.prova, `${seg.id}: manca la prova`);
    }
    const r = L.segmenti.at(-1);
    assert.equal(r.id, "riassunto");
    assert.equal(r.narrazione.length, 3);
    assert.ok(!r.prova);
    assert.ok(L.segmenti.length - 1 >= 4 && L.segmenti.length - 1 <= 6);
  });

  prova(`[${lingua}] recinto_mcp: normalizzazione e confronto per cartella intera, come il server`, () => {
    assert.equal(normalizza("/home/ada/crm/lavoro/../.env"), "/home/ada/crm/.env");
    assert.equal(normalizza("/home/ada/crm/lavoro/./lead.csv"), "/home/ada/crm/lavoro/lead.csv");
    assert.equal(normalizza("//etc///passwd"), "/etc/passwd");
    assert.equal(normalizza("/../../etc/passwd"), "/etc/passwd");
    assert.ok(dentro("/home/ada/crm/lavoro/lead.csv", "/home/ada/crm/lavoro"));
    assert.ok(dentro("/home/ada/crm/lavoro", "/home/ada/crm/lavoro"));
    assert.ok(!dentro("/home/ada/crm/lavoro-vecchio/listino.csv", "/home/ada/crm/lavoro"), "lavoro-vecchio non e' dentro lavoro");
    assert.ok(dentro("/etc/passwd", "/"));
    assert.deepEqual(percorsoReale(sc, "/home/ada/crm/lavoro/scorciatoia/id_ed25519"), { reale: "/home/ada/.ssh/id_ed25519", viaLink: true });
    assert.deepEqual(percorsoReale(sc, "/home/ada/crm/lavoro/listino.csv"), { reale: "/home/ada/crm/lavoro/listino.csv", viaLink: false });
  });

  prova(`[${lingua}] recinto_mcp: la radice decide che cosa passa (numeri della narrazione)`, () => {
    const disco = st({ radice: "disco" }), home = st({ radice: "home" }), lavoro = st({ radice: "lavoro" });
    assert.equal(tipo(disco, "passwd"), "fuga");
    assert.equal(tipo(home, "passwd"), "respinta");
    assert.equal(tipo(home, "ssh"), "fuga");
    assert.equal(tipo(home, "risali"), "fuga");
    for (const id of ["passwd", "ssh", "risali", "link"]) assert.equal(tipo(lavoro, id), "respinta", id);
    for (const id of ["listino", "riepilogo"]) for (const s of [disco, home, lavoro]) assert.equal(tipo(s, id), "ok", id);
    assert.deepEqual(bilancio(sc, lavoro), { legittime: 2, tot_legittime: 2, pericolose: 0, tot_pericolose: 4 });
    assert.equal(bilancio(sc, home).pericolose, 3);
    assert.equal(bilancio(sc, disco).pericolose, 4);
    assert.ok(narr("radici").includes("/etc/passwd") && narr("radici").includes("/home/ada/crm/lavoro"));
    for (const r of sc.radici) assert.ok(narr("radici").includes(r.percorso), r.percorso);
  });

  prova(`[${lingua}] recinto_mcp: ../ e link danno il messaggio vero del server con il percorso reale`, () => {
    const lavoro = st({ radice: "lavoro" });
    const risali = valuta(sc, lavoro, req("risali"));
    assert.equal(risali.reale, "/home/ada/crm/.env");
    assert.ok(risali.messaggio.startsWith("Access denied - path outside allowed directories: /home/ada/crm/.env not in /home/ada/crm/lavoro"));
    const link = valuta(sc, lavoro, req("link"));
    assert.ok(link.viaLink);
    assert.ok(link.messaggio.startsWith("Access denied - symlink target outside allowed directories: /home/ada/.ssh/id_ed25519"));
    assert.ok(narr("scappatoie").includes("/home/ada/crm/.env") && narr("scappatoie").includes("/home/ada/.ssh"));
    // il gettone si ferma sul bordo del recinto, non sul file
    const a = arrivoGettone(sc, lavoro, req("risali"));
    assert.equal(a.tipo, "respinta");
    assert.ok(a.x >= 362 && a.x <= 672 && a.y >= 236 && a.y <= 378, "dentro il riquadro di lavoro/");
    assert.ok([a.x === 362, a.x === 672, a.y === 236, a.y === 378].some(Boolean), "sul bordo del recinto");
    for (const s of [st({ radice: "home" }), lavoro]) for (const r of sc.richieste) {
      const p = arrivoGettone(sc, s, r);
      assert.ok(p.x >= 0 && p.x <= 720 && p.y >= 0 && p.y <= 420, r.id);
    }
  });

  prova(`[${lingua}] recinto_mcp: --read-only toglie gli strumenti che scrivono, gli args lo mostrano`, () => {
    assert.equal(tipo(st({ radice: "lavoro", modalita: "lettura" }), "riepilogo"), "sconosciuto");
    assert.equal(tipo(st({ radice: "lavoro", modalita: "lettura" }), "listino"), "ok");
    assert.equal(tipo(st({ radice: "disco", modalita: "lettura" }), "riepilogo"), "sconosciuto", "vale con qualunque radice");
    assert.deepEqual(argsFilesystem(sc, st({ radice: "lavoro", modalita: "lettura" })), ["-y", sc.pacchetto_fs, "--read-only", "/home/ada/crm/lavoro"]);
    assert.deepEqual(argsFilesystem(sc, st({ radice: "disco", modalita: "scrittura" })), ["-y", sc.pacchetto_fs, "/"]);
    assert.equal(arrivoGettone(sc, st({ modalita: "lettura" }), req("riepilogo")).tipo, "sconosciuto");
    assert.ok(narr("sola_lettura").includes("--read-only"));
    assert.equal(richiesteMandate(sc, st({ richiesta: "tutte" })).length, sc.richieste.length);
    assert.equal(richiesteMandate(sc, st({ richiesta: "link" })).length, 1);
  });

  prova(`[${lingua}] recinto_mcp: la memoria sopravvive solo nel volume, e si azzera quando lo decidi`, () => {
    const max = sc.memoria.max_righe;
    assert.equal(dopoEvento(sc, "volume", 2, "ricorda").righe, 3);
    assert.equal(dopoEvento(sc, "volume", max, "ricorda").righe, max);
    assert.equal(dopoEvento(sc, "container", 3, "riavvia").righe, 0);
    assert.equal(dopoEvento(sc, "node_modules", 3, "riavvia").righe, 3);
    assert.equal(dopoEvento(sc, "volume", 3, "riavvia").righe, 3);
    assert.equal(dopoEvento(sc, "node_modules", 3, "aggiorna").righe, 0);
    assert.equal(dopoEvento(sc, "container", 3, "aggiorna").righe, 0);
    assert.equal(dopoEvento(sc, "volume", 3, "aggiorna").righe, 3);
    for (const l of sc.memoria.luoghi) assert.equal(dopoEvento(sc, l.id, 4, "azzera").righe, 0);
    assert.equal(dopoEvento(sc, "container", 3, "riavvia").esito, "male");
    for (const l of sc.memoria.luoghi) for (const ev of sc.memoria.eventi) assert.ok(dopoEvento(sc, l.id, 2, ev.id).testo, `${l.id}/${ev.id}`);
    const vol = sc.memoria.luoghi.find((l) => l.id === "volume");
    assert.ok(vol.comando.includes("claude-memory:/app/dist") && narr("memoria").includes("claude-memory") && narr("memoria").includes("/app/dist"));
    assert.ok(sc.memoria.esiti.azzera_volume.includes("docker volume rm claude-memory"));
  });

  prova(`[${lingua}] recinto_mcp: la catena della pagina ostile si spezza alla prima difesa accesa`, () => {
    const tutte = st({ radice: "lavoro", client_prudente: true, host_consentiti: true });
    assert.equal(catena(sc, tutte).difesa, "client_prudente");
    assert.equal(catena(sc, tutte).arrivo, 2);
    assert.equal(catena(sc, { ...tutte, client_prudente: false }).difesa, "radice");
    assert.equal(catena(sc, { ...tutte, client_prudente: false, radice: "home" }).difesa, "host_consentiti");
    const nessuna = catena(sc, { ...tutte, client_prudente: false, radice: "disco", host_consentiti: false });
    assert.ok(nessuna.fuga);
    assert.equal(nessuna.arrivo, sc.pagina.passi.length);
    assert.equal(sc.pagina.difese.length, 3);
    assert.ok(narr("pagina").includes("--allowed-hosts"));
    assert.ok(sc.pagina.url.includes(sc.pagina.host_consentito));
    assert.ok(!sc.pagina.riga_ostile.includes(sc.pagina.host_consentito), "l'host della raccolta non e' quello consentito");
    for (const s of [tutte, { ...tutte, client_prudente: false }, { ...tutte, client_prudente: false, radice: "home" }]) assert.ok(!/\{\w+\}/.test(catena(sc, s).testo));
  });

  prova(`[${lingua}] recinto_mcp: Decidi tu, la risposta migliore e' quella che calcola il recinto`, () => {
    for (const c of sc.casi) assert.equal(esitoCaso(sc, c), c.migliore, c.id);
    const ids = sc.risposte_gioco.map((r) => r.id);
    for (const c of sc.casi) for (const q of c.quasi) assert.ok(ids.includes(q) && q !== c.migliore);
    const tutte = Object.fromEntries(sc.casi.map((c) => [c.id, c.migliore]));
    assert.equal(verifica(sc, st({ scelte: tutte })).giuste, sc.casi.length);
    assert.equal(verifica(sc, st({ scelte: {} })).giuste, 0);
    assert.equal(verifica(sc, st({ scelte: { k4: "respinta" } })).righe[3].esito, "quasi");
    assert.ok(new Set(sc.casi.map((c) => c.migliore)).size === 3, "i tre esiti compaiono tutti");
  });

  prova(`[${lingua}] recinto_mcp: nessun segnaposto aperto, nessun testo vuoto, testi della scena dentro i riquadri`, () => {
    const testi = [];
    const raccogli = (x) => { if (typeof x === "string") testi.push(x); else if (Array.isArray(x)) x.forEach(raccogli); else if (x && typeof x === "object") Object.values(x).forEach(raccogli); };
    raccogli(L.segmenti.map((x) => [x.titolo, x.narrazione, x.prova || "-"])); raccogli(sc.etichette); raccogli(sc.casi); raccogli(sc.memoria);
    raccogli({ ...sc.pagina, esito_tenuta: "-" });
    for (const t of testi) { assert.ok(t.trim().length > 0); assert.ok(!/\{\w+\}/.test(t), `segnaposto in «${t}»`); }
    for (const s of [st({ radice: "disco" }), st({ radice: "home", modalita: "lettura" }), st({ radice: "lavoro" })]) for (const r of sc.richieste) {
      const v = valuta(sc, s, r);
      for (const t of [v.testo, v.breve, v.messaggio]) assert.ok(!/\{\w+\}|undefined|NaN/.test(t), t);
    }
    // nomi dei file (monospace 10 px, circa 6 px a carattere) dentro il loro riquadro; richieste dell'agente in 2 righe da 18
    for (const f of sc.file) assert.ok(f.nome.length * 6 + 10 <= { passwd: 96, chiave: 110, env: 80, listino: 90, lead: 86, riepilogo: 92, scorciatoia: 128 }[f.id], f.nome);
    for (const r of sc.richieste) assert.ok(aCapo(r.testo, 18).length <= 2 && aCapo(r.testo, 18).every((x) => x.length <= 22), r.testo);
    for (const l of sc.memoria.luoghi) { assert.ok(aCapo(l.nome, 30).length <= 2, l.nome); assert.ok(aCapo(l.comando, 36).length <= 3, l.comando); }
    for (const p of sc.pagina.passi) assert.ok(aCapo(p.testo, 50).length <= 2, p.testo);
    assert.ok(aCapo(sc.pagina.riga_ostile, 46).length <= 4);
    for (const c of sc.casi) { assert.ok((c.strumento + " " + c.percorso).length * 6.3 <= 650, c.id); assert.ok(aCapo(c.nota, 100).length === 1, c.id); }
    for (const t of Object.values(sc.memoria.esiti)) assert.ok(aCapo(t, 96).length <= 2, t);
  });
}
