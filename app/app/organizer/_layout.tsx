import { Stack } from 'expo-router';
import { Colors } from '../../constants/colors';

/**
 * Stack interno Moody+ — il root Stack nasconde l'header sul segmento "organizer"
 * così non compare il titolo di default "organizer"; solo questi titoli sono visibili.
 */
export default function OrganizerLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle:              { backgroundColor: Colors.surface },
        headerTintColor:          Colors.accentLight,
        headerTitleStyle:         { fontWeight: '700', color: Colors.text, fontSize: 17 },
        headerShadowVisible:      false,
        headerBackButtonDisplayMode: 'minimal',
        headerBackTitleVisible:   false,
        headerBackTitle:          '',
        contentStyle:             { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen
        name="register"
        options={{ title: 'Diventa organizzatore' }}
      />
      <Stack.Screen
        name="dashboard"
        options={{ title: 'Moody+', headerBackVisible: false }}
      />
      <Stack.Screen
        name="packages"
        options={{
          title: 'Acquista submission',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
