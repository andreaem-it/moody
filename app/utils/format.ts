const IT_MONTHS = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
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
