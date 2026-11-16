// Prove della lezione PO3.2 "Il contratto fra le parti" (logica pura, entrambe le lingue).
import { costruisciRichiesta, validaSchema, validaCopia, percorri, assegna, verificaSquadra, testoErrore, posizioniSquadra, aCapo, DIMENSIONI } from "../../webapp/animazioni/contratto_parti.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("contratto_parti.json"), lingua);
  const sc = L.scenario;
  const base = L.segmenti[0].stato_animazione;
  const st = (d) => ({ ...base, ...d, richiesta: { ...base.richiesta, ...((d && d.richiesta) || {}) } });
  const narr = (id) => L.segmenti.find((x) => x.id === id).narrazione.join(" ");
  const regole = (errori) => errori.map((e) => `${e.campo}:${e.regola}`).sort();

  prova(`[${lingua}] contratto_parti: segmenti validi, stesse chiavi di stato, riassunto in 3 frasi`, () => {
    const chiavi = Object.keys(base).sort().join();
    for (const seg of L.segmenti) {
      assert.equal(Object.keys(seg.stato_animazione).sort().join(), chiavi, seg.id);
      const v = percorri(sc, seg.stato_animazione);
      assert.ok(v.tappe.length === 4 && v.esito, seg.id);
      for (const c of seg.concetti) assert.ok(["CO09", "CO10"].includes(c), seg.id);
      if (seg.id !== "riassunto") assert.ok(seg.prova, seg.id);
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
    assert.ok(!L.segmenti.at(-1).prova);
  });

  prova(`[${lingua}] contratto_parti: lo schema dello scenario e' quello di Nebula e i numeri del testo coincidono`, () => {
    const s = sc.schema_richiesta;
    assert.deepEqual(s.required, ["brokerId", "fullName", "email", "phone"]);
    assert.equal(s.additionalProperties, false);
    assert.equal(s.properties.fullName.minLength, 1);
    assert.equal(s.properties.fullName.maxLength, 255);
    assert.equal(s.properties.role.maxLength, 100);
    assert.ok(!s.required.includes("role"));
    assert.ok(sc.schema_risorsa.required.includes("id") && !("id" in s.properties));
    assert.deepEqual(sc.schema_risorsa.properties.email.type, ["string", "null"]);
    const t = narr("contratto");
    for (const n of ["255", "63", "1"]) assert.ok(t.includes(n), n);
    assert.ok(/quattro|four/.test(t));
    for (const c of sc.solo_database) assert.ok(narr("risorsa").includes(c), c);
    assert.ok(narr("due_parti").includes("400") && narr("risorsa").includes("201"));
  });

  prova(`[${lingua}] contratto_parti: il validatore applica required, format, lunghezze, pattern, additionalProperties`, () => {
    const ok = costruisciRichiesta(sc, base.richiesta);
    assert.deepEqual(validaSchema(sc.schema_richiesta, ok), []);
    const err = (r) => regole(validaSchema(sc.schema_richiesta, costruisciRichiesta(sc, { ...base.richiesta, ...r })));
    assert.deepEqual(err({ email: "malformata" }), ["email:format"]);
    assert.deepEqual(err({ email: "assente" }), ["email:required"]);
    assert.deepEqual(err({ phone: "malformato" }), ["phone:pattern"]);
    assert.deepEqual(err({ brokerId: "non_uuid" }), ["brokerId:format"]);
    assert.deepEqual(err({ fullName: "vuoto" }), ["fullName:minLength"]);
    assert.deepEqual(err({ fullName: "troppo_lungo" }), ["fullName:maxLength"]);
    assert.deepEqual(err({ role: "troppo_lungo" }), ["role:maxLength"]);
    assert.deepEqual(err({ role: "valido" }), []);
    assert.deepEqual(err({ extra: "notes" }), ["notes:additional"]);
    assert.deepEqual(err({ extra: "id" }), ["id:additional"]);
    assert.deepEqual(err({ email: "malformata", phone: "assente", extra: "notes" }), ["email:format", "notes:additional", "phone:required"]);
    assert.equal(costruisciRichiesta(sc, { ...base.richiesta, fullName: "troppo_lungo" }).fullName.length, 256);
    for (const e of validaSchema(sc.schema_richiesta, costruisciRichiesta(sc, { ...base.richiesta, email: "malformata", fullName: "vuoto", phone: "malformato", brokerId: "assente", extra: "notes" })))
      assert.ok(!/\{\w+\}|undefined/.test(testoErrore(sc.testi, e)), testoErrore(sc.testi, e));
  });

  prova(`[${lingua}] contratto_parti: ogni comando cambia l'esito atteso del viaggio`, () => {
    assert.equal(percorri(sc, st({})).esito, "salvata");
    assert.equal(percorri(sc, st({})).http, 201);
    const malformata = percorri(sc, st({ richiesta: { email: "malformata" } }));
    assert.equal(malformata.esito, "respinta_modulo");
    assert.equal(malformata.tappe[1].stato, "respinta");
    const diretta = percorri(sc, st({ canale: "diretta", richiesta: { email: "malformata" } }));
    assert.equal(diretta.esito, "respinta_api");
    assert.equal(diretta.http, 400);
    assert.equal(diretta.tappe[1].stato, "saltata");
    const copia = percorri(sc, st({ canale: "diretta", copia_a_mano: true, richiesta: { extra: "notes" } }));
    assert.equal(copia.esito, "fuori_contratto");
    assert.ok(copia.deriva);
    assert.ok("notes" in copia.risorsa, "il campo in piu' finisce nel database");
    assert.deepEqual(regole(copia.errori_risorsa), ["notes:additional"], "la risorsa viola il suo schema");
    // con il modulo davanti la copia a mano non fa danni visibili, ma la deriva resta
    const copiaModulo = percorri(sc, st({ copia_a_mano: true, richiesta: { extra: "notes" } }));
    assert.equal(copiaModulo.esito, "respinta_modulo");
    assert.ok(copiaModulo.deriva);
    assert.equal(percorri(sc, st({ copia_a_mano: true })).deriva, false);
    // la copia a mano controlla meno cose: il telefono sbagliato passa
    assert.equal(validaCopia(sc, costruisciRichiesta(sc, { ...base.richiesta, phone: "malformato" })).length, 0);
    assert.equal(percorri(sc, st({ canale: "diretta", copia_a_mano: true, richiesta: { email: "assente" } })).esito, "respinta_api");
  });

  prova(`[${lingua}] contratto_parti: richiesta e risorsa salvata hanno schemi diversi`, () => {
    const v = percorri(sc, st({ richiesta: { role: "valido" } }));
    assert.equal(v.risorsa.id, sc.id_server);
    assert.ok(!("id" in v.richiesta));
    assert.equal(v.risorsa.accountId, null);
    assert.deepEqual(v.errori_risorsa, []);
    assert.equal(v.id_client, false);
    const inattivo = percorri(sc, st({ broker_inattivo: true }));
    assert.equal(inattivo.risorsa.email, null);
    assert.equal(inattivo.risorsa.phone, null);
    assert.deepEqual(inattivo.errori_risorsa, [], "null e' ammesso dallo schema Contact");
    assert.equal(percorri(sc, st({ richiesta: { extra: "id" } })).esito, "respinta_modulo");
    const idClient = percorri(sc, st({ canale: "diretta", copia_a_mano: true, richiesta: { extra: "id" } }));
    assert.ok(idClient.id_client);
    assert.notEqual(idClient.risorsa.id, sc.id_server);
  });

  prova(`[${lingua}] contratto_parti: perimetri dei ruoli (dentro, fuori con il proprietario, posto sbagliato)`, () => {
    for (const c of sc.compiti) {
      assert.ok(sc.zone.some((z) => z.id === c.zona), c.id);
      if (c.proprietario) {
        assert.equal(assegna(sc, c.id, c.proprietario).esito, "ok", c.id);
        assert.ok(sc.ruoli.find((r) => r.id === c.proprietario).scrive.includes(c.zona));
      } else for (const r of sc.ruoli) assert.equal(assegna(sc, c.id, r.id).esito, "posto");
      for (const r of Object.keys(c.note)) assert.equal(assegna(sc, c.id, r).esito, "fuori", `${c.id}/${r}`);
    }
    const difetto = assegna(sc, "c_difetto", "code-reviewer");
    assert.equal(difetto.esito, "fuori");
    assert.equal(difetto.proprietario.id, "backend-developer");
    assert.ok(difetto.nota.length > 0);
    assert.deepEqual(sc.ruoli.find((r) => r.id === "code-reviewer").scrive, ["status"], "il code reviewer scrive solo STATUS.md");
    assert.equal(assegna(sc, "c_schema", "backend-developer").esito, "fuori");
    assert.equal(assegna(sc, "c_regola", "product-manager").esito, "fuori");
    assert.equal(assegna(sc, "c_schema", "").esito, "vuoto");
    const giuste = Object.fromEntries(sc.compiti.filter((c) => c.proprietario).map((c) => [c.id, c.proprietario]));
    const v = verificaSquadra(sc, giuste);
    assert.equal(v.giusti, v.tot);
    assert.equal(v.tot, sc.compiti.length - 1);
    for (const r of [...v.righe, ...verificaSquadra(sc, { c_difetto: "code-reviewer", c_termine: "architect" }).righe]) assert.ok(!/\{\w+\}|undefined/.test(r.testo), r.testo);
    assert.equal(verificaSquadra(sc, {}).giusti, 0);
  });

  prova(`[${lingua}] contratto_parti: geometria della squadra e testi dentro i riquadri`, () => {
    const { ruoli, zone } = posizioniSquadra(sc);
    const tutte = [...Object.values(ruoli), ...Object.values(zone)];
    for (const p of tutte) assert.ok(p.x >= 0 && p.x + p.w <= DIMENSIONI.w && p.y >= 30 && p.y + p.h <= 404, JSON.stringify(p));
    const z = Object.values(zone);
    for (let i = 0; i < z.length; i++) for (let j = i + 1; j < z.length; j++) {
      const a = z[i], b = z[j];
      assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, "zone sovrapposte");
    }
    for (const zz of sc.zone) assert.ok(zz.nome.length * 9.5 * 0.6 <= zone[zz.id].w - 36, zz.nome);
    for (const r of sc.ruoli) assert.ok(r.nome.length * 11 * 0.6 <= 196 - 20 && `agents/${r.id}/SKILL.md`.length * 9 * 0.6 <= 196 - 14, r.id);
    for (const c of sc.compiti) assert.ok(aCapo(c.testo, 108).length <= 2, c.id);
    // la riga JSON piu' lunga della scheda sta nella scheda
    const lunga = `"brokerId": "${sc.campi_richiesta[0].varianti[0].valore}",`;
    assert.ok(lunga.length * 9 * 0.6 <= DIMENSIONI.scheda.w - 24 - 22, lunga);
  });
}
