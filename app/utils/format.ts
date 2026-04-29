const IT_MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

/**
 * Returns an Instagram-style handle from a device UUID.
 * e.g. "a1b2c3d4-..." → "@moody_a1b2c3"
 */
export function formatHandle(userId: string): string {
  const slug = userId.replace(/-/g, '').slice(0, 8).toLowerCase();
  return `@moody_${slug}`;
}

/**
 * Returns the short friend code (without @) for sharing.
 * e.g. "a1b2c3d4-..." → "moody_a1b2c3"
 */
export function formatFriendCode(userId: string): string {
  return formatHandle(userId).slice(1); // strip "@"
}
const IT_DAYS   = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return `${IT_DAYS[d.getDay()]} ${day} ${IT_MONTHS[month - 1]}`;
}

export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return '';
  if (price === 0) return 'Gratuito';
  return `€${price % 1 === 0 ? price : price.toFixed(2)}`;
}

export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined) return '';
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function formatEnergyLabel(score: number): string {
  if (score >= 0.8) return 'Alta';
  if (score >= 0.5) return 'Media';
  return 'Bassa';
}

export function formatSocialLabel(score: number): string {
  if (score >= 0.8) return 'Molto sociale';
  if (score >= 0.5) return 'Sociale';
  return 'Intimo';
}

export function formatPeopleCount(count: number): string {
  if (count === 0) return 'Nessuno ancora';
  if (count === 1) return '1 persona';
  return `${count} persone`;
}

export function formatTime(time: string): string {
  if (!time) return '';
  return time.slice(0, 5); // "21:30:00" → "21:30"
}

/**
 * Returns a human-readable countdown to the event.
 * null if the event has already ended (> 2h past start).
 */
export function formatTimeToEvent(date: string, time: string): string | null {
  if (!date || !time) return null;
  const eventDateTime = new Date(`${date}T${time.slice(0, 5)}:00`);
  const now = new Date();
  const diffMs = eventDateTime.getTime() - now.getTime();

  if (diffMs < -2 * 60 * 60 * 1000) return null;          // over 2h ago — hide
  if (diffMs < 0) return 'In corso';
  if (diffMs < 60 * 1000) return 'Sta per iniziare';

  const diffMinutes = Math.round(diffMs / (1000 * 60));
  if (diffMinutes < 60) return `Inizia tra ${diffMinutes} min`;

  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `Inizia tra ${diffHours}h`;

  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return `Tra ${diffDays} ${diffDays === 1 ? 'giorno' : 'giorni'}`;
}
