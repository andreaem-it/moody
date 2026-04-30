import { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export type UserLocation = {
  lat: number;
  lng: number;
};

type State = {
  location: UserLocation | null;
  /** true mentre stiamo aspettando il permesso o la posizione */
  loading: boolean;
  /** 'denied' | 'unavailable' | null */
  error: 'denied' | 'unavailable' | null;
};

/**
 * Richiede il permesso di geolocalizzazione e restituisce le coordinate
 * dell'utente. Non lancia eccezioni; usa `error` per gestire i casi negativi.
 *
 * La posizione viene aggiornata una volta sola all'avvio (non in watch mode).
 */
export function useUserLocation(): State {
  const [state, setState] = useState<State>({
    location: null,
    loading: true,
    error: null,
  });

  const didAsk = useRef(false);

  useEffect(() => {
    if (didAsk.current) return;
    didAsk.current = true;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setState({ location: null, loading: false, error: 'denied' });
          return;
        }

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setState({
          location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          loading: false,
          error: null,
        });
      } catch {
        setState({ location: null, loading: false, error: 'unavailable' });
      }
    })();
  }, []);

  return state;
}
