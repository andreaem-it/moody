import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type ContextMode = 'tonight' | 'weekend' | 'last-minute';
export type FeedbackType = 'like' | 'skip' | 'not_for_me' | 'too_far' | 'too_expensive' | 'wrong_vibe';
export type MoodValue = 'fire' | 'mid' | 'dead';

export interface MoodBreakdown {
  fire: number;
  mid: number;
  dead: number;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  price: number | null;
  vibes: string[];
  energyScore: number;
  socialScore: number;
  sourceType: string;
  rawText: string | null;
  createdAt: string;
  updatedAt: string;
  // live data
  peopleCount: number;
  dominantMood: MoodValue | null;
  moodBreakdown: MoodBreakdown;
  totalVotes: number;
  // feed extras
  score?: number;
  recommendationReason?: string;
}

export interface DraftEvent {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  price: number | null;
  vibes: string[];
  energyScore: number;
  socialScore: number;
  sourceType: string;
  rawText: string;
}

// ─── Feed ────────────────────────────────────────────────────────────────────

export async function fetchFeed(context: ContextMode, userId = 'demo-user'): Promise<Event[]> {
  const res = await client.get('/feed', { params: { context, userId } });
  return res.data.events;
}

// ─── Events ──────────────────────────────────────────────────────────────────

export async function fetchEvents(): Promise<Event[]> {
  const res = await client.get('/events');
  return res.data;
}

export async function fetchEvent(id: string): Promise<Event> {
  const res = await client.get(`/events/${id}`);
  return res.data;
}

export async function createEvent(data: Partial<Event>): Promise<Event> {
  const res = await client.post('/events', data);
  return res.data;
}

export async function deleteEvent(id: string): Promise<void> {
  await client.delete(`/events/${id}`);
}

// ─── Feedback ────────────────────────────────────────────────────────────────

export async function sendFeedback(eventId: string, type: FeedbackType, userId = 'demo-user'): Promise<void> {
  await client.post(`/events/${eventId}/feedback`, { userId, type });
}

// ─── Check-in ────────────────────────────────────────────────────────────────

export async function checkIn(eventId: string, userId = 'demo-user'): Promise<{ peopleCount: number; alreadyCheckedIn?: boolean }> {
  try {
    const res = await client.post(`/events/${eventId}/checkin`, { userId });
    return res.data;
  } catch (err: any) {
    if (err?.response?.status === 409) {
      return { peopleCount: err.response.data.peopleCount ?? 0, alreadyCheckedIn: true };
    }
    throw err;
  }
}

export async function fetchCheckins(eventId: string): Promise<{ peopleCount: number }> {
  const res = await client.get(`/events/${eventId}/checkins`);
  return res.data;
}

// ─── Mood ────────────────────────────────────────────────────────────────────

export async function voteMood(eventId: string, value: MoodValue, userId = 'demo-user'): Promise<{
  dominantMood: MoodValue | null;
  moodBreakdown: MoodBreakdown;
  totalVotes: number;
}> {
  const res = await client.post(`/events/${eventId}/mood`, { userId, value });
  return res.data;
}

export async function fetchMood(eventId: string): Promise<{
  dominantMood: MoodValue | null;
  moodBreakdown: MoodBreakdown;
  totalVotes: number;
}> {
  const res = await client.get(`/events/${eventId}/mood`);
  return res.data;
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export async function uploadEventImage(uri: string): Promise<DraftEvent> {
  const formData = new FormData();
  const filename = uri.split('/').pop() ?? 'image.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const mimeTypes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

  formData.append('image', {
    uri,
    name: filename,
    type: mimeTypes[ext] ?? 'image/jpeg',
  } as any);

  const res = await client.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30_000,
  });
  return res.data;
}
