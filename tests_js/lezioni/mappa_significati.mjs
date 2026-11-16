// Prove della lezione P5.4 "La mappa dei significati" (logica pura, entrambe le lingue).
import { cerca, misura, rispondi, posizioni, distanza } from "../../webapp/animazioni/mappa_significati.js";

export default function ({ prova, risolvi, leggi, lingua, assert }) {
  const L = risolvi(leggi("mappa_significati.json"), lingua);
  const sc = L.scenario;
  const base = L.segmenti[0].stato_animazione;
  const st = (diff) => ({ ...base, ...diff });
  const tutte = sc.fonti.map((f) => f.id);
  const senzaSegnaposto = (t) => assert.ok(!/\{\w+\}/.test(t), t);

  prova(`[${lingua}] mappa_significati: segmenti validi, risposte senza segnaposto, riassunto in 3 frasi`, () => {
    for (const seg of L.segmenti) {
      const r = rispondi(sc, seg.stato_animazione);
      senzaSegnaposto(r.testo);
      senzaSegnaposto(r.nota);
    }
    assert.equal(L.segmenti.at(-1).id, "riassunto");
    assert.equal(L.segmenti.at(-1).narrazione.length, 3);
    for (const p of sc.porzioni) assert.ok(sc.fonti.some((f) => f.id === p.fonte) && sc.temi.some((t) => t.id === p.tema), p.id);
  });

  prova(`[${lingua}] mappa_significati: k piu' alto = richiamo che sale e precisione che scende`, () => {
    const m1 = misura(sc, st({ k: 1 })), m3 = misura(sc, st({ k: 3 })), m20 = misura(sc, st({ k: 20 }));
    assert.ok(m1.richiamo < m3.richiamo);
    assert.equal(m20.richiamo, 1);
    assert.ok(m1.precisione > m20.precisione);
    assert.equal(cerca(sc, st({ k: 5 })).length, 5);
  });

  prova(`[${lingua}] mappa_significati: le parole chiave non trovano i sinonimi, il significato si'`, () => {
    const parole = st({ domanda: "q_remoto", modo: "parole" });
    assert.equal(cerca(sc, parole).length, 0);
    assert.equal(rispondi(sc, parole).esito, "non_so");
    const sign = rispondi(sc, st({ domanda: "q_remoto", modo: "significato" }));
    assert.equal(sign.esito, "giusta");
    assert.ok(sign.citazioni.length >= 2, "la risposta cita piu' porzioni utili");
  });

  prova(`[${lingua}] mappa_significati: il codice simile inganna il significato, la ricerca ibrida lo corregge`, () => {
    assert.equal(rispondi(sc, st({ domanda: "q_contratto", modo: "significato" })).esito, "sbagliata");
    const ib = rispondi(sc, st({ domanda: "q_contratto", modo: "ibrida" }));
    assert.equal(ib.esito, "giusta");
    assert.equal(ib.citazioni[0], 1);
  });

  prova(`[${lingua}] mappa_significati: il listino vecchio nell'indice porta il prezzo sbagliato, anche col riordino`, () => {
    const con = st({ fonti: tutte });
    assert.equal(rispondi(sc, con).esito, "sbagliata");
    assert.equal(rispondi(sc, st({ fonti: tutte, riordino: true })).esito, "sbagliata");
    const senza = st({ fonti: tutte.filter((f) => !sc.fonti.find((x) => x.id === f).vecchia) });
    assert.equal(rispondi(sc, senza).esito, "giusta");
    assert.ok(!cerca(sc, senza).some((id) => sc.porzioni.find((p) => p.id === id).fonte === "l24"));
  });

  prova(`[${lingua}] mappa_significati: recupera e riordina = 3 porzioni sul tema, precisione piu' alta`, () => {
    const r = st({ k: 20, riordino: true });
    assert.ok(cerca(sc, r).length <= 3);
    assert.ok(misura(sc, r).precisione > misura(sc, st({ k: 20 })).precisione);
  });

  prova(`[${lingua}] mappa_significati: fuori dai documenti "non lo so"; senza istruzione risposta inventata`, () => {
    const si = rispondi(sc, st({ domanda: "q_onlus", non_so: true }));
    const no = rispondi(sc, st({ domanda: "q_onlus", non_so: false }));
    assert.equal(si.esito, "non_so");
    assert.equal(no.esito, "inventata");
    assert.equal(no.citazioni.length, 0, "una cifra inventata non ha citazioni");
    assert.equal(misura(sc, st({ domanda: "q_onlus" })).richiamo, null);
  });

  prova(`[${lingua}] mappa_significati: puntini dentro la mappa, ricerca deterministica`, () => {
    for (const p of Object.values(posizioni(sc))) assert.ok(p.x >= 20 && p.x <= 680 && p.y >= 50 && p.y <= 380, JSON.stringify(p));
    for (const q of sc.domande) assert.deepEqual(cerca(sc, st({ domanda: q.id })), cerca(sc, st({ domanda: q.id })));
    assert.equal(distanza({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  });
}
