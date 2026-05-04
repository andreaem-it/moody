import { Share, Platform } from 'react-native';
import type { Event } from '../services/api';
import { formatDate, formatTime } from './format';

/**
 * Messaggio di condivisione coerente su iOS/Android/Web.
 */
export async function shareEvent(event: Event): Promise<void> {
  const lines = [
    event.title,
    `${formatDate(event.date)} · ${formatTime(event.time)}`,
    event.location,
    event.price != null ? (event.price === 0 ? 'Ingresso gratis' : `€${event.price}`) : null,
    event.sourceUrl?.trim(),
  ].filter(Boolean) as string[];

  let message = lines.join('\n');
  message += `\n\n— da Moody`;

  const payload =
    Platform.OS === 'web' && typeof globalThis !== 'undefined' && 'location' in globalThis &&
    (globalThis as { location?: { origin?: string } }).location?.origin
      ? {
          title: event.title,
          text: message,
          url: `${(globalThis as { location: { origin: string } }).location.origin}/event/${event.id}`,
        }
      : { title: event.title, message };

  try {
    await Share.share(payload);
  } catch {
    /* utente chiude sheet */
  }
}
