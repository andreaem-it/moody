# Moody — Event Decision Engine

> "Cosa faccio stasera?" — Moody decide per te.

Moody è un decision engine per eventi reali. Non un aggregatore generico: un motore di ranking che considera i tuoi gusti, il contesto, il budget, la distanza e il mood sociale per restituire 3–10 eventi perfetti per il momento.

---

## Struttura del progetto

```
Moody/
├── backend/          Node.js + Express + SQLite
└── app/              React Native + Expo (Expo Router)
```

---

## Avvio rapido

### 1. Backend

```bash
cd backend
npm install
npm run dev      # porta 3001 (nodemon, auto-reload)
# oppure:
npm start        # porta 3001 (produzione)
```

Il database SQLite (`moody.db`) viene creato automaticamente.
Il seed di **14 eventi** con check-in e mood finti viene eseguito al primo avvio.

### 2. App mobile

```bash
cd app
npm install
```

> **Dispositivo fisico**: cambia `EXPO_PUBLIC_API_URL` in `app/.env` con l'IP locale della tua macchina (es. `http://192.168.1.XX:3001`)

```bash
npm start        # Expo Go
npm run ios      # Simulatore iOS
npm run android  # Emulatore Android
```

---

## API Reference

| Metodo | Path | Descrizione |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/feed?context=tonight\|weekend\|last-minute` | Feed rankato personalizzato |
| GET | `/events` | Lista tutti gli eventi |
| POST | `/events` | Crea evento |
| GET | `/events/:id` | Dettaglio evento + live data |
| DELETE | `/events/:id` | Elimina evento |
| POST | `/events/:id/feedback` | Invia feedback (aggiorna profilo) |
| POST | `/events/:id/checkin` | Check-in (deduplica) |
| GET | `/events/:id/checkins` | Numero persone |
| POST | `/events/:id/mood` | Vota mood (fire/mid/dead) |
| GET | `/events/:id/mood` | Leggi breakdown mood |
| POST | `/upload` | Upload locandina (OCR mock → draft evento) |

### Feedback types
`like` · `skip` · `not_for_me` · `too_far` · `too_expensive` · `wrong_vibe`

### Mood values
`fire` · `mid` · `dead`

### Context modes
`tonight` · `weekend` · `last-minute`

---

## Architettura

```
backend/
  server.js               Entry point
  db/
    database.js           Singleton SQLite (better-sqlite3)
    migrations.js         Crea tabelle idempotentemente
    seed.js               14 eventi + checkins + moods demo
  services/
    ocrService.js         Mock OCR (→ Google Vision in prod)
    enrichmentService.js  Keyword rules → vibes + scores
    rankingService.js     Scoring pesato + recommendation reason
    profileService.js     Profilo adattivo basato su feedback
  controllers/            Logica di business per ogni route
  routes/                 Router Express
  middleware/
    errorHandler.js       Error handler centralizzato

app/
  app/                    Expo Router (file-based routing)
    _layout.tsx           Stack navigator root
    index.tsx             Feed screen (home)
    upload.tsx            Upload locandina
    event/[id].tsx        Dettaglio evento
  components/
    EventCard.tsx         Card evento con quick actions
    ContextSelector.tsx   Stasera / Weekend / Last minute
    MoodBar.tsx           Distribuzione mood (bar + legend)
    LiveLayer.tsx         Persone + mood dominante
  services/
    api.ts                Client Axios tipizzato
  constants/
    colors.ts             Design system dark mode
    vibes.ts              Config vibe + mood (emoji, colori)
  utils/
    format.ts             Date/price/distance formatters
```

---

## Algoritmo di ranking

```
score =
  vibeMatch       × 0.30   (% overlap vibe utente ↔ evento)
  timeScore       × 0.25   (rilevanza temporale per context mode)
  distanceScore   × 0.15   (Haversine vs maxDistanceKm)
  budgetScore     × 0.10   (prezzo vs budgetLevel)
  popularityScore × 0.10   (check-in normalizzati su 30)
  explorationScore× 0.10   (casualità pesata per explorationRate)
```

---

## Profilo adattivo

Il profilo utente si aggiorna silenziosamente ad ogni azione:

| Azione | Effetto |
|--------|---------|
| Like | Aggiunge vibes ai preferiti, +energy/social |
| Check-in | Forte segnale positivo su vibes |
| Not for me / Wrong vibe | Rimuove vibes |
| Too far | Riduce `maxDistanceKm` dell'12% |
| Too expensive | Abbassa `budgetLevel` |

---

## OCR / Integrazione futura

Per attivare Google Cloud Vision, in `backend/services/ocrService.js`:

```js
// Sostituisci il corpo di extractTextFromImage() con:
const vision = require('@google-cloud/vision');
const client = new vision.ImageAnnotatorClient();
const [result] = await client.textDetection(filePath);
return result.textAnnotations[0]?.description || '';
```

---

## Vibe disponibili

`chill` · `social` · `energetic` · `cultural` · `experience` · `food` · `music` · `nightlife`
