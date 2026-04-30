/**
 * Seed script — popola Firestore con eventi di esempio.
 * Uso: node backend/scripts/seed-events.js [--clear]
 *   --clear  elimina tutti gli eventi esistenti prima di inserire
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue }     = require('firebase-admin/firestore');
const { v4: uuidv4 }                   = require('uuid');

// ── Firebase init ─────────────────────────────────────────────────────────────
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

// ── Date helpers ──────────────────────────────────────────────────────────────
function today()  { return new Date().toISOString().split('T')[0]; }
function addDays(d, n) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n); return dt.toISOString().split('T')[0];
}
function weekend() {
  const now = new Date();
  const day = now.getDay();
  const toSat = day === 6 ? 0 : day === 0 ? 6 : 6 - day;
  const toSun = toSat + 1;
  return [addDays(today(), toSat), addDays(today(), toSun)];
}
function nextHours(h) {
  const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + h);
  return d.toTimeString().slice(0, 5);
}

const T  = today();
const T1 = addDays(T, 1);
const T2 = addDays(T, 2);
const [SAT, SUN] = weekend();
const NOW_H = new Date().getHours();

// ── Event factory ─────────────────────────────────────────────────────────────
function ev(title, description, date, time, location, lat, lng, price, vibes, energy, social, source = 'manual') {
  const id        = uuidv4();
  const now       = new Date().toISOString();
  const eventHash = `${title}${date}${location}`.toLowerCase().replace(/[^a-z0-9]/g, '');
  return {
    id, title, description, date, time, location,
    latitude: lat, longitude: lng, price,
    vibes, energyScore: energy, socialScore: social,
    sourceType: source, rawText: null, eventHash,
    popularityBoost: Math.floor(Math.random() * 8),
    createdAt: now, updatedAt: now,
  };
}

const pad = (n) => String(n).padStart(2, '0');
const h   = (n) => `${pad(n)}:00`;

// ── Seed data ─────────────────────────────────────────────────────────────────
const EVENTS = [

  // ── STASERA (tonight = today) ─────────────────────────────────────────────
  ev('Aperitivo in Terrazza', 'Aperitivo con vista sui tetti del centro. DJ set dal vivo e cocktail artigianali.', T, h(19), 'Terrazza Martini, Milano', 45.466, 9.191, 15, ['social','food','chill'], 0.4, 0.9),
  ev('Live Jazz al Blue Note', 'Quartetto jazz d\'eccezione con ospite internazionale. Posti limitati.', T, h(21), 'Blue Note, Milano', 45.480, 9.197, 25, ['music','chill','social'], 0.3, 0.7),
  ev('Serata Stand-Up Comedy', 'Tre comici emergenti della scena italiana. Ospite a sorpresa finale.', T, h(21), 'Comedy Club Zelig, Milano', 45.461, 9.177, 18, ['social','experience'], 0.6, 0.85),
  ev('Cena al Buio', 'Esperienza gastronomica nel buio totale. Menù degustazione 5 portate.', T, h(20), 'Dans le Noir, Milano', 45.471, 9.188, 65, ['food','experience','chill'], 0.2, 0.6),
  ev('Karaoke Night', 'La migliore serata karaoke in città. Prenotazione tavoli consigliata.', T, h(22), 'Sing Sing Karaoke, Milano', 45.458, 9.183, 5, ['social','nightlife','music'], 0.8, 1.0),
  ev('Open Air Cinema', 'Proiezione di "La Dolce Vita" in piazza. Porta il tuo cuscino.', T, h(21), 'Piazza Sempione, Milano', 45.477, 9.173, 8, ['cultural','chill','experience'], 0.2, 0.5),
  ev('Sushi Masterclass', 'Impara a preparare il sushi con uno chef giapponese. Max 12 persone.', T, h(19), 'Scuola di Cucina Brera, Milano', 45.474, 9.186, 45, ['food','experience'], 0.5, 0.7),
  ev('Club Night: Techno', 'Lineup internazionale. 3 room, 8 ore di musica non stop.', T, h(23), 'Fabric Club, Milano', 45.455, 9.178, 20, ['nightlife','energetic','music'], 1.0, 0.8),
  ev('Yoga al Tramonto', 'Sessione di yoga sulla terrazza con vista panoramica. Porta il tuo tappetino.', T, h(18), 'Rooftop Castello, Milano', 45.470, 9.179, 12, ['chill','experience'], 0.1, 0.4),
  ev('Vernissage Fotografico', 'Inaugurazione mostra fotografica "Città e Memoria". Cocktail di benvenuto.', T, h(19), 'Galleria Carla Sozzani, Milano', 45.476, 9.189, 0, ['cultural','social'], 0.2, 0.65),

  // ── LAST-MINUTE (next 1-4h from now) ──────────────────────────────────────
  ev('Brunch Express', 'Tavolo libero al brunch più trendy del quartiere. Solo 2 posti rimasti.', T, nextHours(1), 'Pane e Acqua, Brera', 45.475, 9.187, 22, ['food','social','chill'], 0.3, 0.7),
  ev('Visita Guidata Nascosta', 'Tour dei cortili segreti di Milano. Partenza immediata, max 10 persone.', T, nextHours(1), 'Piazza Duomo (ingresso nord)', 45.464, 9.192, 10, ['cultural','experience'], 0.4, 0.6),
  ev('Escape Room: L\'Assassino', 'Un posto si è liberato. Unisciti al gruppo per la sfida più difficile.', T, nextHours(2), 'Mind The Game, Navigli', 45.451, 9.174, 18, ['experience','energetic','social'], 0.8, 0.9),
  ev('Mercatino Vintage Flash', 'Mercatino pop-up con 30 espositori. Dura solo 3 ore.', T, nextHours(1), 'Piazza Cantore, Navigli', 45.450, 9.172, 0, ['chill','experience','cultural'], 0.3, 0.5),
  ev('Torneo Ping Pong', 'Torneo last-minute! Iscriviti subito. Premi per i top 3.', T, nextHours(2), 'The Oval, Porta Romana', 45.453, 9.195, 8, ['energetic','social'], 0.9, 0.85),
  ev('Tasting Birre Artigianali', 'Degustazione guidata di 6 birre artigianali locali con food pairing.', T, nextHours(1), 'Birrificio Lambrate, Lambrate', 45.478, 9.232, 20, ['food','social','chill'], 0.4, 0.8),
  ev('DJ Set in Cortile', 'DJ set improvvisato nel cortile del palazzo storico. Ingresso libero.', T, nextHours(2), 'Cortile della Rocchetta, Castello', 45.470, 9.179, 0, ['music','social','nightlife'], 0.7, 0.9),

  // ── DOMANI (T1) ───────────────────────────────────────────────────────────
  ev('Colazione da Pasticcere', 'Laboratorio di croissant con pasticcere stellato. Include colazione.', T1, h(9), 'Pasticceria Marchesi, Cordusio', 45.465, 9.188, 35, ['food','experience'], 0.3, 0.5),
  ev('Street Food Festival', 'Oltre 40 stand di street food da tutto il mondo. Ingresso libero.', T1, h(12), 'Piazza Gae Aulenti, Milano', 45.484, 9.189, 0, ['food','social','energetic'], 0.6, 0.85),
  ev('Workshop Ceramica', 'Crea il tuo vaso con un maestro ceramista. Tutti i materiali inclusi.', T1, h(15), 'Atelier Brera, Milano', 45.473, 9.185, 40, ['chill','cultural','experience'], 0.2, 0.5),
  ev('Running Club Navigli', 'Corsa serale lungo i Navigli con il gruppo più social di Milano. 5km.', T1, h(19), 'Darsena, Milano', 45.449, 9.173, 0, ['energetic','social'], 0.95, 0.8),
  ev('Concerto Acustico', 'Singer-songwriter italiana in acustico. Solo 50 posti.', T1, h(21), 'Circolo Arci Bellezza, Milano', 45.458, 9.194, 12, ['music','chill','social'], 0.3, 0.65),

  // ── SABATO (weekend) ─────────────────────────────────────────────────────
  ev('Mercato di Porta Portese', 'Il mercato più grande della città. Vintage, antiquariato, rarità.', SAT, h(8), 'Foro Buonaparte, Milano', 45.470, 9.180, 0, ['cultural','experience','chill'], 0.3, 0.6),
  ev('Trekking Urbano', 'Esplora la Milano nascosta a piedi. 10km con guida esperta.', SAT, h(10), 'Stazione Centrale (piazza)', 45.486, 9.205, 15, ['energetic','cultural','experience'], 0.8, 0.7),
  ev('Brunch con Vista', 'Brunch al rooftop con buffet illimitato e musica live.', SAT, h(11), 'Rooftop Excelsior Hotel, Milano', 45.471, 9.193, 38, ['food','social','chill'], 0.3, 0.8),
  ev('Festival Elettronico', 'Headliner internazionale + 5 act locali. Parco Sempione.', SAT, h(17), 'Parco Sempione, Milano', 45.476, 9.172, 35, ['music','nightlife','energetic'], 1.0, 0.9),
  ev('Tour in Bicicletta', 'Giro guidato dei quartieri emergenti con bike vintage. Max 15 persone.', SAT, h(10), 'Noleggio Bici Duomo, Milano', 45.464, 9.191, 20, ['energetic','cultural','experience'], 0.7, 0.65),
  ev('Workshop Cocktail', 'Impara 3 cocktail signature dal bartender del miglior bar di Milano.', SAT, h(17), 'The Spirit Bar, Brera', 45.474, 9.185, 50, ['food','social','experience'], 0.5, 0.85),
  ev('Mercato Vinili', 'Swap & shop di dischi vinili. 60+ espositori. Ingresso libero.', SAT, h(10), 'Circolo Magnolia, Milano', 45.479, 9.267, 0, ['music','cultural','chill'], 0.2, 0.55),
  ev('Padel Tournament', 'Torneo amatoriale di padel. Coppie miste. Iscrizioni entro venerdì.', SAT, h(9), 'Padel Center Forlanini, Milano', 45.447, 9.237, 25, ['energetic','social'], 0.95, 0.8),
  ev('Visita Notturna Duomo', 'Apertura straordinaria del Duomo alle 22. Atmosfera unica.', SAT, h(22), 'Duomo di Milano', 45.464, 9.192, 15, ['cultural','experience'], 0.2, 0.5),
  ev('Pop-Up Restaurant', 'Chef stellato in location segreta. Menu degustazione 7 portate.', SAT, h(20), 'Rivelata 48h prima via email', 45.464, 9.186, 120, ['food','experience'], 0.4, 0.6),
  ev('Silent Disco', 'Tre canali, una pista, nessun amplificatore. Cuffie in dotazione.', SAT, h(23), 'Magazzini Generali, Milano', 45.447, 9.190, 15, ['nightlife','music','social'], 0.9, 0.95),

  // ── DOMENICA (weekend) ───────────────────────────────────────────────────
  ev('Yoga nel Parco', 'Sessione di hatha yoga al mattino. Porta il tuo tappetino.', SUN, h(9), 'Parco Sempione, Milano', 45.476, 9.172, 0, ['chill','experience'], 0.1, 0.4),
  ev('Mostra Frida Kahlo', 'Ultima settimana! Biglietti last-minute disponibili.', SUN, h(10), 'Palazzo Reale, Milano', 45.463, 9.192, 16, ['cultural'], 0.2, 0.4),
  ev('Pranzo in Vigna', 'Pranzo rustico tra le vigne con vino locale incluso. Transfer da Milano.', SUN, h(12), 'Tenuta Mazzolino, Oltrepò', 45.122, 9.283, 65, ['food','chill','experience'], 0.2, 0.7),
  ev('Bootcamp Domenicale', 'Allenamento HIIT all\'aperto. Tutti i livelli benvenuti.', SUN, h(10), 'Parco Trenno, Milano', 45.488, 9.116, 10, ['energetic'], 1.0, 0.6),
  ev('Aperitivo in Barca', 'Navigazione sui Navigli con aperitivo a bordo. Posti limitatissimi.', SUN, h(17), 'Darsena, Milano', 45.449, 9.173, 30, ['social','chill','experience'], 0.3, 0.9),
  ev('Concerto Sinfonico', 'Orchestra Verdi esegue Beethoven. Ultimo appuntamento della stagione.', SUN, h(16), 'Auditorium di Milano', 45.455, 9.172, 22, ['cultural','music'], 0.1, 0.5),
  ev('Beer Garden Domenica', 'Garden party con 20 birre alla spina, grill e live band country.', SUN, h(14), 'BASE Milano, Via Bergognone', 45.452, 9.177, 0, ['food','social','music'], 0.6, 0.9),
  ev('Escape the City', 'Gioco di ruolo urbano: risolvi il mistero prima del tramonto. Squadre di 4.', SUN, h(15), 'Piazza della Repubblica, Milano', 45.484, 9.198, 20, ['experience','energetic','social'], 0.8, 0.85),

  // ── TRA DUE GIORNI (T2) ───────────────────────────────────────────────────
  ev('Serata Quiz Trivia', 'Gran finale stagionale del pub quiz più amato di Milano. Premi in palio.', T2, h(20), 'The Dublin Inn, Milano', 45.458, 9.183, 5, ['social','experience'], 0.6, 1.0),
  ev('Cena Degustazione Siciliana', 'Chef siciliano prepara un menù tipico a 6 portate con vini abbinati.', T2, h(20), 'Osteria dei Siciliani, Milano', 45.462, 9.188, 55, ['food','experience','cultural'], 0.3, 0.7),
  ev('Climbing Indoor', 'Serata di boulder per tutti i livelli. Istruttore disponibile per principianti.', T2, h(18), 'Climb Milano, Lambrate', 45.478, 9.233, 15, ['energetic','experience','social'], 0.9, 0.7),
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const shouldClear = process.argv.includes('--clear');

  if (shouldClear) {
    console.log('🗑️  Eliminazione eventi esistenti...');
    const snap = await db.collection('events').get();
    const batches = [];
    let batch = db.batch();
    let count = 0;
    snap.docs.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
      if (count % 500 === 0) { batches.push(batch); batch = db.batch(); }
    });
    batches.push(batch);
    await Promise.all(batches.map((b) => b.commit()));
    console.log(`   Eliminati ${snap.size} eventi.`);
  }

  console.log(`\n📅 Date usate:`);
  console.log(`   Oggi:     ${T}`);
  console.log(`   Domani:   ${T1}`);
  console.log(`   Sabato:   ${SAT}`);
  console.log(`   Domenica: ${SUN}`);
  console.log(`   Tra 2gg:  ${T2}`);
  console.log(`\n⏰ Orari last-minute: ${nextHours(1)} e ${nextHours(2)}`);

  console.log(`\n🌱 Inserimento ${EVENTS.length} eventi...`);

  // Batch writes (max 500 per batch)
  let batch = db.batch();
  let i = 0;
  for (const event of EVENTS) {
    const ref = db.collection('events').doc(event.id);
    batch.set(ref, event);
    i++;
    if (i % 500 === 0) {
      await batch.commit();
      batch = db.batch();
    }
  }
  await batch.commit();

  console.log(`✅ ${EVENTS.length} eventi inseriti con successo!\n`);

  // Summary by context
  const byDate = {};
  EVENTS.forEach((e) => { byDate[e.date] = (byDate[e.date] || 0) + 1; });
  Object.entries(byDate).sort().forEach(([d, n]) => console.log(`   ${d}: ${n} eventi`));
  console.log('');
  process.exit(0);
}

main().catch((err) => { console.error('❌', err); process.exit(1); });
