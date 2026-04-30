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
  momentumCount?: number;       // checkins in last 2h (for LiveLayer)
  trendingScore?: number;       // 0-1
  popularityBoost?: number;     // duplicate boost counter
  // feed extras
  score?: number;
  recommendationReason?: string;
  isSurprise?: boolean;         // lowest-ranked "wildcard" event
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
  confidence: number;           // 0-1 mock OCR confidence
}

// ─── Feed ────────────────────────────────────────────────────────────────────

export async function fetchFeed(context: ContextMode, userId: string): Promise<Event[]> {
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

export async function sendFeedback(eventId: string, type: FeedbackType, userId: string): Promise<void> {
  await client.post(`/events/${eventId}/feedback`, { userId, type });
}

// ─── Check-in ────────────────────────────────────────────────────────────────

export async function checkIn(eventId: string, userId: string): Promise<{ peopleCount: number; alreadyCheckedIn?: boolean }> {
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

export async function voteMood(eventId: string, value: MoodValue, userId: string): Promise<{
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

// ─── Profile & Activity ───────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  preferredVibes: string[];
  maxDistanceKm: number;
  budgetLevel: 'low' | 'medium' | 'high';
  energyPreference: number;
  socialPreference: number;
  explorationRate: number;
  updatedAt: string;
}

export interface ActivityEvent extends Event {
  isCheckedIn: boolean;
  isLiked: boolean;
}

export interface UserActivity {
  events: ActivityEvent[];
  stats: { likedCount: number; checkinCount: number; moodVoteCount: number };
}

export async function fetchProfile(userId: string): Promise<UserProfile> {
  const res = await client.get(`/profile/${userId}`);
  return res.data;
}

export async function fetchActivity(userId: string): Promise<UserActivity> {
  const res = await client.get(`/profile/${userId}/activity`);
  return res.data;
}

export interface ProfilePreferences {
  preferredVibes:   string[];
  maxDistanceKm:    number;
  budgetLevel:      'low' | 'medium' | 'high';
  energyPreference: number;
  socialPreference: number;
  explorationRate:  number;
}

export async function updatePreferences(userId: string, prefs: Partial<ProfilePreferences>): Promise<UserProfile> {
  const res = await client.patch(`/profile/${userId}/preferences`, prefs);
  return res.data;
}

/**
 * Update display name and/or profile avatar.
 * Uses fetch (not axios) to send multipart/form-data with correct boundary.
 */
export async function updateProfileMeta(
  userId: string,
  params: { displayName?: string; avatarUri?: string },
): Promise<UserProfile> {
  const formData = new FormData();
  if (params.displayName !== undefined) {
    formData.append('displayName', params.displayName);
  }
  if (params.avatarUri) {
    const filename = params.avatarUri.split('/').pop() ?? 'avatar.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimes: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    formData.append('avatar', { uri: params.avatarUri, name: filename, type: mimes[ext] ?? 'image/jpeg' } as any);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(`${BASE_URL}/profile/${userId}`, {
      method: 'PUT',
      body: formData,
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Profile update failed (${res.status})`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ─── Social ───────────────────────────────────────────────────────────────────

export interface Post {
  id: string;
  userId: string;
  eventId: string | null;
  mediaUrl: string | null;
  mediaType: 'photo' | 'video';
  caption: string;
  createdAt: string;
  // joined from events
  eventTitle?: string;
  eventLocation?: string;
  eventDate?: string;
  // joined from user_profiles
  authorDisplayName?: string | null;
  authorAvatarUrl?: string | null;
}

export async function followUser(followerId: string, targetUserId: string): Promise<void> {
  await client.post(`/social/${targetUserId}/follow`, { followerId });
}

export async function unfollowUser(followerId: string, targetUserId: string): Promise<void> {
  await client.delete(`/social/${targetUserId}/follow`, { data: { followerId } });
}

export async function fetchFollowing(userId: string): Promise<{ userId: string; createdAt: string }[]> {
  const res = await client.get(`/social/${userId}/following`);
  return res.data.following;
}

export async function fetchPostFeed(userId: string): Promise<Post[]> {
  const res = await client.get(`/social/posts/feed/${userId}`);
  return res.data.posts;
}

export async function createPost(params: {
  userId: string;
  eventId?: string;
  caption: string;
  imageUri?: string;
}): Promise<Post> {
  const { userId, eventId, caption, imageUri } = params;
  const formData = new FormData();
  formData.append('userId', userId);
  formData.append('caption', caption);
  if (eventId) formData.append('eventId', eventId);
  if (imageUri) {
    const filename = imageUri.split('/').pop() ?? 'photo.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimes: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      webp: 'image/webp', mp4: 'video/mp4', mov: 'video/quicktime',
    };
    // Cast needed: RN's FormData accepts {uri, name, type} objects as file parts
    formData.append('media', { uri: imageUri, name: filename, type: mimes[ext] ?? 'image/jpeg' } as any);
  }

  // Use fetch instead of axios: axios's default Content-Type header conflicts with
  // multipart boundary injection. fetch + FormData body lets RN set the header correctly.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const res = await fetch(`${BASE_URL}/social/posts`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      // Do NOT set Content-Type here — RN will inject multipart/form-data + boundary automatically
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Upload failed (${res.status}): ${text}`);
    }
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function deletePost(postId: string, userId: string): Promise<void> {
  await client.delete(`/social/posts/${postId}`, { data: { userId } });
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
