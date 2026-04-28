import { Colors } from './colors';

export type Vibe = 'chill' | 'social' | 'energetic' | 'cultural' | 'experience' | 'food' | 'music' | 'nightlife';

export interface VibeConfig {
  label: string;
  emoji: string;
  color: string;
}

export const VIBES: Record<Vibe, VibeConfig> = {
  chill:      { label: 'Chill',      emoji: '🌊', color: Colors.vibe.chill },
  social:     { label: 'Social',     emoji: '🎉', color: Colors.vibe.social },
  energetic:  { label: 'Energetico', emoji: '⚡', color: Colors.vibe.energetic },
  cultural:   { label: 'Culturale',  emoji: '🎨', color: Colors.vibe.cultural },
  experience: { label: 'Experience', emoji: '🌟', color: Colors.vibe.experience },
  food:       { label: 'Food',       emoji: '🍕', color: Colors.vibe.food },
  music:      { label: 'Musica',     emoji: '🎵', color: Colors.vibe.music },
  nightlife:  { label: 'Nightlife',  emoji: '🌙', color: Colors.vibe.nightlife },
};

export function getVibeConfig(vibe: string): VibeConfig {
  return VIBES[vibe as Vibe] ?? { label: vibe, emoji: '✨', color: Colors.accent };
}

export const MOOD_CONFIG = {
  fire: { label: 'Bomba',     emoji: '🔥', color: Colors.fire,   bg: Colors.fireBg },
  mid:  { label: 'Così Così', emoji: '😐', color: Colors.mid,    bg: Colors.midBg  },
  dead: { label: 'Morto',     emoji: '💀', color: Colors.dead,   bg: Colors.deadBg },
} as const;

export type MoodValue = keyof typeof MOOD_CONFIG;
