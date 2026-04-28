const { v4: uuidv4 } = require('uuid');

function seedDatabase(db) {
  const count = db.prepare('SELECT COUNT(*) as c FROM events').get();
  if (count.c > 0) {
    console.log('✅ Database already seeded, skipping.');
    return;
  }

  const now = new Date();
  const iso = () => new Date().toISOString();

  // Helper: date string for N days from now
  function dateOffset(days) {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }

  const today = dateOffset(0);
  const saturday = dateOffset((6 - now.getDay() + 7) % 7 || 7); // next Saturday
  const sunday = dateOffset((0 - now.getDay() + 7) % 7 || 7);   // next Sunday

  // Two last-minute events: now+2h and now+3h
  function timeOffset(hours) {
    const d = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return d.toTimeString().slice(0, 5);
  }

  const events = [
    // ── TONIGHT ──────────────────────────────────────────────────────
    {
      id: uuidv4(),
      title: 'Aperitivo in Darsena',
      description: 'Il classico aperitivo milanese sul naviglio. Drink, musica soft e buona compagnia con vista sul canale.',
      date: today,
      time: '19:00',
      location: 'Darsena, Milano',
      latitude: 45.4499,
      longitude: 9.1726,
      price: 0,
      vibes: JSON.stringify(['chill', 'social', 'food']),
      energyScore: 0.4,
      socialScore: 0.8,
      sourceType: 'manual',
    },
    {
      id: uuidv4(),
      title: 'Live Jazz al Blue Note',
      description: 'Una serata di jazz live con i migliori musicisti della scena italiana. Atmosfera intima e cocktail d\'autore.',
      date: today,
      time: '21:30',
      location: 'Blue Note Milano, Via Borsieri 37',
      latitude: 45.4854,
      longitude: 9.1867,
      price: 20,
      vibes: JSON.stringify(['music', 'social', 'chill']),
      energyScore: 0.5,
      socialScore: 0.7,
      sourceType: 'manual',
    },
    {
      id: uuidv4(),
      title: 'Club Night @ Fabrique',
      description: 'Notte techno con resident DJ internazionali. 3 floor, light show e sound system da urlo.',
      date: today,
      time: '23:00',
      location: 'Fabrique, Via Fantoli 9',
      latitude: 45.4432,
      longitude: 9.2341,
      price: 15,
      vibes: JSON.stringify(['nightlife', 'energetic', 'music']),
      energyScore: 0.95,
      socialScore: 0.75,
      sourceType: 'manual',
    },
    {
      id: uuidv4(),
      title: 'DJ Set al Circolo Magnolia',
      description: 'Open air sotto le stelle con selezione house e tech. Bar aperto fino all\'alba, ingresso economico.',
      date: today,
      time: '22:00',
      location: 'Circolo Magnolia, Segrate',
      latitude: 45.4657,
      longitude: 9.2721,
      price: 10,
      vibes: JSON.stringify(['nightlife', 'energetic', 'music']),
      energyScore: 0.85,
      socialScore: 0.7,
      sourceType: 'manual',
    },
    {
      id: uuidv4(),
      title: 'Karaoke Night',
      description: 'Microfono aperto per tutti. Cena + karaoke, pizza inclusa nel prezzo d\'ingresso. Vieni con gli amici!',
      date: today,
      time: '21:00',
      location: 'Osteria del Karaoke, Navigli',
      latitude: 45.4523,
      longitude: 9.1743,
      price: 5,
      vibes: JSON.stringify(['social', 'nightlife', 'food']),
      energyScore: 0.7,
      socialScore: 0.95,
      sourceType: 'manual',
    },
    {
      id: uuidv4(),
      title: 'Concerto Rock al Tunnel',
      description: 'Headliner emergente + 2 opening act. Venue storica, capacità limitata. Atmosfera autentica.',
      date: today,
      time: '22:30',
      location: 'Tunnel Club, Via Sammartini 30',
      latitude: 45.4841,
      longitude: 9.2043,
      price: 18,
      vibes: JSON.stringify(['music', 'energetic', 'social']),
      energyScore: 0.9,
      socialScore: 0.65,
      sourceType: 'manual',
    },
    // ── LAST-MINUTE (dinamici) ───────────────────────────────────────
    {
      id: uuidv4(),
      title: 'Aperitivo Rooftop Last Minute',
      description: 'Posto ancora disponibile al rooftop più bello di Milano. Tramonto, spritz e vista panoramica.',
      date: today,
      time: timeOffset(2),
      location: 'Rooftop Terrazza Martini, Piazza Diaz',
      latitude: 45.4620,
      longitude: 9.1896,
      price: 15,
      vibes: JSON.stringify(['social', 'chill', 'food']),
      energyScore: 0.45,
      socialScore: 0.85,
      sourceType: 'manual',
    },
    {
      id: uuidv4(),
      title: 'Pop-up Tasting Vini Naturali',
      description: 'Produttori artigianali presenti. Degustazione libera con piccola selezione di formaggi locali.',
      date: today,
      time: timeOffset(3),
      location: 'Cantina Sociale, Brera',
      latitude: 45.4740,
      longitude: 9.1853,
      price: 12,
      vibes: JSON.stringify(['food', 'chill', 'social']),
      energyScore: 0.3,
      socialScore: 0.6,
      sourceType: 'manual',
    },
    // ── WEEKEND ──────────────────────────────────────────────────────
    {
      id: uuidv4(),
      title: 'Mostra Fotografica – Brera',
      description: 'Esposizione collettiva di fotografi contemporanei milanesi. Opere originali in vendita. Ingresso gratuito il sabato mattina.',
      date: saturday,
      time: '10:00',
      location: 'Galleria Brera, Via Brera 28',
      latitude: 45.4726,
      longitude: 9.1878,
      price: 8,
      vibes: JSON.stringify(['cultural', 'chill']),
      energyScore: 0.2,
      socialScore: 0.4,
      sourceType: 'manual',
    },
    {
      id: uuidv4(),
      title: 'Workshop Pasta Fresca',
      description: 'Impara a fare pasta fresca con uno chef professionista. Massimo 8 partecipanti, include cena finale.',
      date: saturday,
      time: '17:00',
      location: 'Cucina Collettiva, Porta Venezia',
      latitude: 45.4735,
      longitude: 9.2053,
      price: 45,
      vibes: JSON.stringify(['experience', 'food', 'social']),
      energyScore: 0.55,
      socialScore: 0.75,
      sourceType: 'manual',
    },
    {
      id: uuidv4(),
      title: 'Presentazione Libro – Feltrinelli',
      description: 'L\'autore incontra i lettori. Presentazione del nuovo romanzo + Q&A + firma copie. Ingresso libero.',
      date: saturday,
      time: '18:30',
      location: 'Feltrinelli Piazza Duomo',
      latitude: 45.4654,
      longitude: 9.1895,
      price: 0,
      vibes: JSON.stringify(['cultural', 'chill']),
      energyScore: 0.15,
      socialScore: 0.35,
      sourceType: 'manual',
    },
    {
      id: uuidv4(),
      title: 'Mercato di Porta Romana',
      description: 'Mercato biologico e artigianale. Produttori locali, street food etnico e vintage clothes. Atmosfera rilassata.',
      date: sunday,
      time: '09:00',
      location: 'Piazzale Porta Romana, Milano',
      latitude: 45.4488,
      longitude: 9.1981,
      price: 0,
      vibes: JSON.stringify(['food', 'chill', 'social']),
      energyScore: 0.3,
      socialScore: 0.6,
      sourceType: 'manual',
    },
    {
      id: uuidv4(),
      title: 'Yoga al Parco Sempione',
      description: 'Sessione di yoga all\'aperto guidata da istruttrice certificata. Porta il tuo tappetino. Adatto a tutti i livelli.',
      date: sunday,
      time: '10:00',
      location: 'Parco Sempione, Milano',
      latitude: 45.4748,
      longitude: 9.1762,
      price: 0,
      vibes: JSON.stringify(['chill', 'experience']),
      energyScore: 0.35,
      socialScore: 0.4,
      sourceType: 'manual',
    },
    {
      id: uuidv4(),
      title: 'Street Food Festival',
      description: 'Oltre 30 stand di cucina internazionale. Birre artigianali, cocktail, live cooking e musica dal vivo.',
      date: sunday,
      time: '12:00',
      location: 'BASE Milano, Via Bergognone',
      latitude: 45.4557,
      longitude: 9.1712,
      price: 0,
      vibes: JSON.stringify(['food', 'social', 'energetic']),
      energyScore: 0.65,
      socialScore: 0.9,
      sourceType: 'manual',
    },
  ];

  const insertEvent = db.prepare(`
    INSERT INTO events (id, title, description, date, time, location, latitude, longitude, price, vibes, energyScore, socialScore, sourceType, rawText, createdAt, updatedAt)
    VALUES (@id, @title, @description, @date, @time, @location, @latitude, @longitude, @price, @vibes, @energyScore, @socialScore, @sourceType, NULL, @createdAt, @updatedAt)
  `);

  const insertCheckin = db.prepare(`
    INSERT INTO checkins (id, eventId, userId, createdAt)
    VALUES (?, ?, ?, ?)
  `);

  const insertMood = db.prepare(`
    INSERT INTO moods (id, eventId, userId, value, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const seedAll = db.transaction(() => {
    const nowIso = iso();

    for (const event of events) {
      insertEvent.run({ ...event, createdAt: nowIso, updatedAt: nowIso });

      // Fake checkins (random 2–20 per event)
      const checkinCount = Math.floor(Math.random() * 18) + 2;
      for (let i = 0; i < checkinCount; i++) {
        insertCheckin.run(uuidv4(), event.id, `user-seed-${i}`, nowIso);
      }

      // Fake mood votes
      const moodValues = ['fire', 'fire', 'fire', 'mid', 'mid', 'dead'];
      const moodCount = Math.floor(Math.random() * 8) + 3;
      for (let i = 0; i < moodCount; i++) {
        const value = moodValues[Math.floor(Math.random() * moodValues.length)];
        insertMood.run(uuidv4(), event.id, `mood-user-${i}`, value, nowIso, nowIso);
      }
    }

    // Demo user profile
    db.prepare(`
      INSERT INTO user_profiles (id, userId, preferredVibes, maxDistanceKm, budgetLevel, energyPreference, socialPreference, explorationRate, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(), 'demo-user',
      JSON.stringify(['music', 'social', 'chill']),
      15, 'medium', 0.6, 0.7, 0.3,
      nowIso, nowIso,
    );
  });

  seedAll();
  console.log(`✅ Seeded ${events.length} events with checkins and moods.`);
}

module.exports = { seedDatabase };
