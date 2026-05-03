import { Stack } from 'expo-router';
import { Colors } from '../../constants/colors';

export default function OrganizerLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle:           { backgroundColor: Colors.surface },
        headerTintColor:       Colors.accentLight,
        headerTitleStyle:      { fontWeight: '700', color: Colors.text },
        headerShadowVisible:   false,
        // Nasconde il testo "back" su tutte le piattaforme
        headerBackTitle:       ' ',
        headerBackTitleVisible: false,
        contentStyle:          { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="register"  options={{ title: 'Diventa organizzatore' }} />
      <Stack.Screen name="dashboard" options={{ title: 'Moody+', headerBackVisible: false }} />
      <Stack.Screen name="packages"  options={{ title: 'Acquista submission', presentation: 'modal' }} />
    </Stack>
  );
}
