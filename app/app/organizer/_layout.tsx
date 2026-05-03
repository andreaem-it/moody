import { Slot } from 'expo-router';

// Le schermate organizer sono gestite direttamente dal root Stack in app/_layout.tsx.
// Questo layout è un semplice passthrough per non aggiungere un secondo navigator.
export default function OrganizerLayout() {
  return <Slot />;
}
