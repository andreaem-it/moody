import { Colors } from './colors';

export type Vibe = 'chill' | 'social' | 'energetic' | 'cultural' | 'experience' | 'food' | 'music' | 'nightlife';

export interface VibeConfig {
  label: string;
  icon: string;   // Ionicons icon name
  color: string;
}

export interface MoodConfig {
  label: string;
  icon: string;   // Ionicons icon name
  color: string;
  bg: string;
}

export const VIBES: Record<Vibe, VibeConfig> = {
  chill:      { label: 'Chill',      icon: 'water-outline',          color: Colors.vibe.chill      },
  social:     { label: 'Social',     icon: 'people-outline',         color: Colors.vibe.social     },
  energetic:  { label: 'Energetico', icon: 'flash-outline',          color: Colors.vibe.energetic  },
  cultural:   { label: 'Culturale',  icon: 'color-palette-outline',  color: Colors.vibe.cultural   },
  experience: { label: 'Experience', icon: 'star-outline',           color: Colors.vibe.experience },
  food:       { label: 'Food',       icon: 'restaurant-outline',     color: Colors.vibe.food       },
  music:      { label: 'Musica',     icon: 'musical-notes-outline',  color: Colors.vibe.music      },
  nightlife:  { label: 'Nightlife',  icon: 'moon-outline',           color: Colors.vibe.nightlife  },
};

export function getVibeConfig(vibe: string): VibeConfig {
  return VIBES[vibe as Vibe] ?? { label: vibe, icon: 'help-circle-outline', color: Colors.accent };
}

export const MOOD_CONFIG: Record<string, MoodConfig> = {
  fire: { label: 'Bomba',     icon: 'flame',                 color: Colors.fire, bg: Colors.fireBg },
  mid:  { label: 'Così Così', icon: 'remove-circle-outline', color: Colors.mid,  bg: Colors.midBg  },
  dead: { label: 'Morto',     icon: 'skull-outline',         color: Colors.dead, bg: Colors.deadBg },
};

export type MoodValue = 'fire' | 'mid' | 'dead';
