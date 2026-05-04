import { Linking, Platform } from 'react-native';

/** Apri Google Maps verso destinazione coordinate o indirizzo testuale. */
export async function openMapsDirections(args: {
  latitude: number;
  longitude: number;
  label?: string;
}): Promise<boolean> {
  const { latitude, longitude, label = 'Evento' } = args;
  const enc = encodeURIComponent(label);
  const url =
    Platform.OS === 'web'
      ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
      : Platform.OS === 'ios'
        ? `maps://?daddr=${latitude},${longitude}&dirflg=d`
        : `geo:0,0?q=${latitude},${longitude}(${enc})`;
  try {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
      return true;
    }
    const fallback = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    await Linking.openURL(fallback);
    return true;
  } catch {
    return false;
  }
}

export async function openMapsQuery(address: string): Promise<boolean> {
  const q = encodeURIComponent(address.trim());
  const url =
    Platform.OS === 'android'
      ? `geo:0,0?q=${q}`
      : `https://www.google.com/maps/search/?api=1&query=${q}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
