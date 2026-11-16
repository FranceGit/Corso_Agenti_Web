// Prove della lezione P8.4 "Sicurezza e accessi: i caveau dei dati" (logica pura, entrambe le lingue).
import { valuta, verifica, maschera, posizioniLead, DIMENSIONI } from "../../webapp/animazioni/caveau_dati.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("caveau_dati.json"), lingua);
  const sc = L.scenario;
  const base = L.segmenti[1].stato_animazione;
  const st = (diff) => ({ ...base, ...diff });

  prova(`[${lingua}] caveau_dati: dati coerenti, segmenti validi, riassunto in 3 frasi`, () => {
    for (const seg of L.segmenti) {
      const v = valuta(sc, seg.stato_animazione);
      assert.ok(v.risultati.length >= sc.clienti[0].lead.length);
      assert.ok(sc.elaborazioni.some((e) => e.id === seg.stato_animazione.elaborazione));
    }
    for (const r of sc.messaggio.sostituzioni) assert.ok(sc.messaggio.testo.includes(r.trova), r.trova);
    for (const x of sc.situazioni) { assert.ok(x.opzioni.includes(x.migliore)); for (const o of x.opzioni) assert.ok(sc.opzioni_gioco[o], o); }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
  });

  prova(`[${lingua}] caveau_dati: la parete nei dati fa rimbalzare la richiesta scritta male`, () => {
    const dati = valuta(sc, st({ isolamento: "dati", richiesta: "malcostruita" }));
    assert.ok(dati.rimbalzo && !dati.fuga);
    assert.equal(dati.risultati.length, sc.clienti[0].lead.length);
    const ui = valuta(sc, st({ isolamento: "interfaccia", richiesta: "malcostruita" }));
    assert.ok(ui.fuga);
    assert.equal(ui.risultati.length, sc.clienti[0].lead.length + sc.clienti[1].lead.length);
    assert.ok(ui.deboli.accessi.includes("fuga"));
    const uiGiusta = valuta(sc, st({ isolamento: "interfaccia", richiesta: "giusta" }));
    assert.ok(!uiGiusta.fuga, "con la richiesta giusta l'interfaccia regge, finche' nessuno sbaglia");
  });

  prova(`[${lingua}] caveau_dati: segreto nelle istruzioni e permessi "select all" aprono punti deboli`, () => {
    assert.equal(valuta(sc, st({})).deboli.accessi.length, 0);
    const v = valuta(sc, st({ segreto: "istruzioni", permessi: "tutti" }));
    assert.ok(v.chiave_esposta);
    assert.ok(v.extra.length >= 2);
    assert.deepEqual(v.deboli.accessi, ["chiave", "permessi"]);
  });

  prova(`[${lingua}] caveau_dati: mascheramento prima del log`, () => {
    const m = maschera(sc, sc.messaggio.testo);
    for (const r of sc.messaggio.sostituzioni) { assert.ok(!m.includes(r.trova)); assert.ok(m.includes(r.con)); }
    assert.equal(valuta(sc, st({ mascheramento: true })).log, m);
    const chiaro = valuta(sc, st({ mascheramento: false }));
    assert.equal(chiaro.log, sc.messaggio.testo);
    assert.ok(chiaro.deboli.dati.includes("log"));
  });

  prova(`[${lingua}] caveau_dati: TTL cancella la sessione oltre la soglia`, () => {
    const ttl = sc.giorni.ttl;
    assert.equal(valuta(sc, st({ giorni: ttl })).sessione, "viva");
    assert.equal(valuta(sc, st({ giorni: ttl + sc.giorni.passo, ttl: true })).sessione, "cancellata");
    const eterna = valuta(sc, st({ giorni: ttl + sc.giorni.passo, ttl: false }));
    assert.equal(eterna.sessione, "eterna");
    assert.ok(eterna.deboli.dati.includes("sessione"));
  });

  prova(`[${lingua}] caveau_dati: il controllo dell'output ferma l'esfiltrazione; luogo di elaborazione`, () => {
    assert.equal(valuta(sc, st({ email_ostile: false })).uscita, "quiete");
    assert.equal(valuta(sc, st({ email_ostile: true, controllo_output: true })).uscita, "bloccata");
    const fuga = valuta(sc, st({ email_ostile: true, controllo_output: false }));
    assert.equal(fuga.uscita, "fuga");
    assert.ok(fuga.deboli.dati.includes("uscita"));
    const loc = valuta(sc, st({ elaborazione: "locale" })), ue = valuta(sc, st({ elaborazione: "cloud_ue" })), caso = valuta(sc, st({ elaborazione: "cloud_extra" }));
    assert.ok(!loc.elab.fuori && ue.elab.fuori);
    assert.ok(ue.elab.domande.length > loc.elab.domande.length);
    assert.ok(caso.deboli.dati.includes("luogo") && !ue.deboli.dati.includes("luogo"));
  });

  prova(`[${lingua}] caveau_dati: gioco con riscontro spiegato`, () => {
    const vuoto = verifica(sc, st({}));
    assert.ok(vuoto.righe.every((r) => r.esito === "vuoto"));
    const migliori = Object.fromEntries(sc.situazioni.map((x) => [x.id, x.migliore]));
    assert.equal(verifica(sc, st({ scelte: migliori })).giuste, sc.situazioni.length);
    assert.equal(migliori.g4, "ok", "c'e' anche un caso gia' sicuro");
    const misto = verifica(sc, st({ scelte: { ...migliori, g3: "permessi", g2: "ok" } }));
    assert.equal(misto.righe.find((r) => r.id === "g3").esito, "quasi");
    assert.equal(misto.righe.find((r) => r.id === "g2").esito, "sbagliato");
    for (const r of [...vuoto.righe, ...misto.righe]) assert.ok(!/\{\w+\}/.test(r.testo), r.testo);
  });

  prova(`[${lingua}] caveau_dati: lead dentro la scena, deterministici`, () => {
    const p = posizioniLead(sc);
    for (const q of Object.values(p)) assert.ok(q.x >= 0 && q.x + DIMENSIONI.leadW <= DIMENSIONI.w && q.y >= 0 && q.y + DIMENSIONI.leadH <= DIMENSIONI.h, JSON.stringify(q));
    assert.deepEqual(p, posizioniLead(sc));
    assert.deepEqual(valuta(sc, st({ permessi: "tutti" })), valuta(sc, st({ permessi: "tutti" })));
  });
}
