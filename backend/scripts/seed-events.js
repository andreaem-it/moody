/**
 * Seed script — popola Firestore con eventi di esempio intorno a Foligno (PG).
 * Uso: node backend/scripts/seed-events.js [--clear]
 *   --clear  elimina tutti gli eventi esistenti prima di inserire
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore }                 = require('firebase-admin/firestore');
const { v4: uuidv4 }                   = require('uuid');

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
  return [addDays(today(), toSat), addDays(today(), toSat + 1)];
}
function nextHours(h) {
  const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + h);
  return d.toTimeString().slice(0, 5);
}
const pad = (n) => String(n).padStart(2, '0');
const h   = (n) => `${pad(n)}:00`;

const T  = today();
const T1 = addDays(T, 1);
const T2 = addDays(T, 2);
const [SAT, SUN] = weekend();

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
    popularityBoost: Math.floor(Math.random() * 6),
    createdAt: now, updatedAt: now,
  };
}

// ── Luoghi reali intorno a Foligno ────────────────────────────────────────────
// Foligno centro:   42.9540, 12.7026
// Spello:           42.9901, 12.6737  (~4 km)
// Bevagna:          42.9254, 12.6084  (~8 km)
// Trevi:            42.8770, 12.7469  (~9 km)
// Montefalco:       42.8935, 12.6517  (~12 km)
// Assisi:           43.0707, 12.6176  (~14 km)
// Nocera Umbra:     43.1072, 12.7879  (~17 km)
// Spoleto:          42.7346, 12.7377  (~25 km)
// Perugia:          43.1121, 12.3888  (~38 km)

const EVENTS = [

  // ── STASERA ───────────────────────────────────────────────────────────────
  ev('Aperitivo al Palazzo Trinci', 'Aperitivo nei chiostri del Palazzo Trinci con prodotti tipici umbri e vino locale. DJ set ambient.', T, h(19), 'Palazzo Trinci, Piazza della Repubblica, Foligno', 42.9540, 12.7026, 12, ['social','food','chill'], 0.3, 0.85),
  ev('Live Jazz al Caffè del Centro', 'Quartetto jazz folignate. Ingresso libero consumazione. Prenotazione tavolo consigliata.', T, h(21), 'Caffè del Centro, Corso Cavour, Foligno', 42.9536, 12.7024, 0, ['music','chill','social'], 0.3, 0.7),
  ev('Sagra della Bruschetta', 'Serata dedicata alla bruschetta umbra con olio EVO DOP locale. Vino dei Colli Martani incluso.', T, h(19), 'Piazza XX Settembre, Bevagna', 42.9254, 12.6084, 8, ['food','social','cultural'], 0.4, 0.8),
  ev('Cinema all\'Aperto', 'Proiezione "Basilicata Coast to Coast" nella piazza medievale. Ingresso libero.', T, h(21), 'Piazza Silvestri, Bevagna', 42.9254, 12.6084, 0, ['chill','cultural','experience'], 0.2, 0.5),
  ev('Degustazione Sagrantino', 'Degustazione guidata di 5 vini Sagrantino di Montefalco con abbinamenti di salumi locali.', T, h(19), 'Cantine Scacciadiavoli, Montefalco', 42.8935, 12.6517, 20, ['food','experience','chill'], 0.3, 0.65),
  ev('Serata Karaoke al Vecchio Mulino', 'Karaoke bar con selezione italiana e internazionale. Drink list speciale.', T, h(22), 'Pub Il Vecchio Mulino, Via Garibaldi, Foligno', 42.9528, 12.7019, 5, ['social','nightlife','music'], 0.8, 1.0),
  ev('Yoga al Tramonto sul Colle', 'Sessione di yoga con vista sulla Valle Umbra al tramonto. Porta il tuo tappetino.', T, h(18), 'Spello, Belvedere del Colle', 42.9901, 12.6737, 10, ['chill','experience'], 0.15, 0.4),
  ev('Mostra Permanente Giostra', 'Visita guidata serale alla mostra della Giostra della Quintana con abiti storici originali.', T, h(20), 'Museo della Giostra della Quintana, Foligno', 42.9538, 12.7031, 7, ['cultural','experience'], 0.2, 0.5),

  // ── LAST-MINUTE ──────────────────────────────────────────────────────────
  ev('Aperitivo Veloce da Mario', 'Tavolo aperto al bar più frequentato di Foligno. Sfincione, olive, crostini.', T, nextHours(1), 'Bar Mario, Piazza della Repubblica, Foligno', 42.9541, 12.7027, 6, ['food','social','chill'], 0.3, 0.75),
  ev('Passeggiata Notturna Spello', 'Tour guidato last-minute dei vicoli illuminati di Spello. Max 10 persone.', T, nextHours(1), 'Porta Consolare, Spello', 42.9901, 12.6737, 8, ['cultural','experience','chill'], 0.3, 0.6),
  ev('Torneo Burraco al Circolo', 'Posto libero al torneo di burraco del giovedì. Tessera giornaliera disponibile.', T, nextHours(2), 'Circolo Ricreativo ARCI, Via Roma, Foligno', 42.9530, 12.7020, 5, ['social','experience'], 0.5, 0.8),
  ev('Birre Artigianali al Chiostro', 'Birrificio locale serve 4 nuove etichette nel chiostro di San Francesco.', T, nextHours(1), 'Chiostro di San Francesco, Foligno', 42.9545, 12.7035, 15, ['food','social','chill'], 0.4, 0.8),

  // ── DOMANI ────────────────────────────────────────────────────────────────
  ev('Mercatino dell\'Antiquariato', 'Mercato mensile dell\'antiquariato e del vintage nel centro storico.', T1, h(9), 'Piazza della Repubblica, Foligno', 42.9540, 12.7026, 0, ['cultural','experience','chill'], 0.25, 0.55),
  ev('Trekking Valle Umbra', 'Percorso ad anello di 12 km con vista su Foligno e Trevi. Guida naturalistico-ambientale.', T1, h(8), 'Parcheggio Porta Romana, Foligno', 42.9510, 12.7050, 15, ['energetic','experience','cultural'], 0.85, 0.7),
  ev('Laboratorio Ceramica Medievale', 'Corso introduttivo alla ceramica in stile medievale folignate. Materiali inclusi.', T1, h(15), 'Laboratorio Artigianale, Via Garibaldi, Foligno', 42.9530, 12.7019, 35, ['cultural','chill','experience'], 0.2, 0.5),
  ev('Aperitivo con Vista a Trevi', 'Il miglior aperitivo dell\'Umbria con panorama sulla Valle Umbra illuminata.', T1, h(18), 'Piazza Mazzini, Trevi', 42.8770, 12.7469, 10, ['food','chill','social'], 0.2, 0.75),
  ev('Concerto Corale', 'Coro polifonico San Feliciano: brani rinascimentali e contemporanei nel Duomo di Foligno.', T1, h(21), 'Cattedrale di San Feliciano, Foligno', 42.9540, 12.7025, 0, ['cultural','music','chill'], 0.1, 0.5),

  // ── SABATO ────────────────────────────────────────────────────────────────
  ev('Gara Podistica Valle Umbra', 'Corsa non competitiva 10km. Partenza da Foligno, arrivo a Spello. T-shirt inclusa.', SAT, h(9), 'Piazza Garibaldi, Foligno', 42.9520, 12.7015, 12, ['energetic','social'], 0.95, 0.75),
  ev('Mercato Contadino di Campagna Amica', 'Prodotti a km0 di 40 aziende agricole umbre. Degustazioni gratuite.', SAT, h(8), 'Parcheggio Ex Zuccherificio, Foligno', 42.9480, 12.7000, 0, ['food','chill','social'], 0.25, 0.65),
  ev('Visita al Tempio del Clitunno', 'Visita guidata al sito UNESCO Tempio del Clitunno con esperto di storia romana.', SAT, h(10), 'Tempio del Clitunno, Campello sul Clitunno', 42.8230, 12.7230, 10, ['cultural','experience'], 0.2, 0.5),
  ev('Festival Street Food Umbria', 'Oltre 30 stand di street food regionale. Porchetta, torta al testo, crescia.', SAT, h(12), 'Viale Umbria, Foligno', 42.9500, 12.7040, 0, ['food','social','energetic'], 0.55, 0.85),
  ev('Workshop Olio EVO', 'Impara ad assaggiare e distinguere gli oli extravergini DOP umbri con esperto oleario.', SAT, h(17), 'Frantoio Gaudenzi, Trevi', 42.8770, 12.7469, 30, ['food','experience','cultural'], 0.25, 0.6),
  ev('Concerto Rock al Pub Britannia', 'Tre band locali: apertura ore 21, headliner ore 23. Ingresso con tessera.', SAT, h(21), 'Pub Britannia, Via Mazzini, Foligno', 42.9533, 12.7021, 8, ['music','nightlife','energetic'], 0.9, 0.85),
  ev('Escursione Notturna Monte Subasio', 'Trekking notturno sul Monte Subasio con guida. Torce frontali fornite. Max 15 persone.', SAT, h(20), 'Parcheggio Eremo delle Carceri, Assisi', 43.0707, 12.6176, 18, ['energetic','experience'], 0.8, 0.65),
  ev('Cena in Cantina a Montefalco', 'Cena tradizionale umbra direttamente in cantina con abbinamento Sagrantino DOCG.', SAT, h(20), 'Cantina Arnaldo Caprai, Montefalco', 42.8935, 12.6517, 55, ['food','experience','chill'], 0.3, 0.7),

  // ── DOMENICA ─────────────────────────────────────────────────────────────
  ev('Passeggiata tra gli Ulivi', 'Camminata lenta tra i secolari uliveti della Valle Umbra. Guida naturalistica.', SUN, h(9), 'Frantoio di Spello', 42.9901, 12.6737, 8, ['chill','experience','cultural'], 0.15, 0.4),
  ev('Brunch Domenicale al Relais', 'Brunch con prodotti locali a chilometro zero. Prenotazione obbligatoria.', SUN, h(11), 'Relais La Corte di Bettona, Bettona', 43.0127, 12.4884, 28, ['food','chill','social'], 0.2, 0.7),
  ev('Pedalata tra i Borghi', 'Cicloturismo 35km: Foligno → Spello → Assisi → Bastia Umbra. E-bike disponibili.', SUN, h(9), 'Noleggio Bici Foligno, Via Flaminia', 42.9540, 12.7060, 20, ['energetic','experience','cultural'], 0.75, 0.65),
  ev('Antichi Sapori di Bevagna', 'Sagra dei legumi e dei cereali medievali: farro, roveja, cicerchia. Con degustazione.', SUN, h(12), 'Piazza Silvestri, Bevagna', 42.9254, 12.6084, 5, ['food','cultural','chill'], 0.3, 0.7),
  ev('Concerto Pomeridiano', 'Quartetto d\'archi presso la Chiesa di Santa Maria Infraportas. Ingresso libero.', SUN, h(17), 'Chiesa S. Maria Infraportas, Foligno', 42.9545, 12.7010, 0, ['cultural','music','chill'], 0.1, 0.45),
  ev('Escursione alle Cascate di Rasiglia', 'Percorso naturalistico alle sorgenti e cascate di Rasiglia (frazione di Foligno).', SUN, h(10), 'Rasiglia, Foligno', 42.9162, 12.8060, 0, ['energetic','experience','chill'], 0.6, 0.5),
  ev('Aperitivo del Tramonto a Montefalco', 'La "Ringhiera dell\'Umbria": aperitivo panoramico con vista su cinque province.', SUN, h(18), 'Torre Comunale, Montefalco', 42.8935, 12.6517, 10, ['chill','food','social'], 0.2, 0.7),

  // ── TRA 2 GIORNI ─────────────────────────────────────────────────────────
  ev('Serata Quiz sulla Storia di Foligno', 'Pub quiz dedicato alla storia e tradizioni del folignate. Premi per i top 3.', T2, h(20), 'Osteria del Bacco, Via Roma, Foligno', 42.9532, 12.7022, 5, ['social','cultural','experience'], 0.55, 0.9),
  ev('Corso Introduttivo all\'Arrampicata', 'Serata di bouldering per principianti con istruttore CAI. Materiale fornito.', T2, h(18), 'Palestra di Arrampicata, Via dell\'Industria, Foligno', 42.9490, 12.7080, 12, ['energetic','experience','social'], 0.9, 0.7),
  ev('Cena con Delitto al Palazzo', 'Cena interattiva in stile medievale con mistero da risolvere. Menù 4 portate incluso.', T2, h(20), 'Palazzo Deli, Foligno', 42.9542, 12.7028, 48, ['experience','social','cultural'], 0.6, 0.9),
];

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const shouldClear = process.argv.includes('--clear');

  if (shouldClear) {
    console.log('🗑️  Eliminazione eventi esistenti...');
    const snap = await db.collection('events').get();
    let batch = db.batch(); let count = 0;
    snap.docs.forEach((doc) => { batch.delete(doc.ref); count++; });
    if (count > 0) await batch.commit();
    console.log(`   Eliminati ${snap.size} eventi.`);
  }

  console.log(`\n📍 Zona: Foligno (PG) e dintorni`);
  console.log(`📅 Date: Oggi=${T} | Sabato=${SAT} | Domenica=${SUN}\n`);
  console.log(`🌱 Inserimento ${EVENTS.length} eventi...`);

  let batch = db.batch(); let i = 0;
  for (const event of EVENTS) {
    batch.set(db.collection('events').doc(event.id), event);
    i++;
    if (i % 500 === 0) { await batch.commit(); batch = db.batch(); }
  }
  await batch.commit();

  console.log(`✅ ${EVENTS.length} eventi inseriti!\n`);
  const byDate = {};
  EVENTS.forEach((e) => { byDate[e.date] = (byDate[e.date] || 0) + 1; });
  Object.entries(byDate).sort().forEach(([d, n]) => console.log(`   ${d}: ${n} eventi`));
  console.log('');
  process.exit(0);
}

main().catch((err) => { console.error('❌', err); process.exit(1); });
