import { useEffect, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';
import { ONBOARDING_KEY } from './onboarding';

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY).then((done) => {
      setReady(true);
      if (!done) {
        // Defer slightly so the navigator is mounted
        setTimeout(() => router.replace('/onboarding'), 0);
      }
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={Colors.background} />
        {!ready ? (
          <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={Colors.accent} size="large" />
          </View>
        ) : (
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: Colors.surface },
              headerTintColor: Colors.text,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: Colors.background },
              headerTitleStyle: { fontWeight: '700', fontSize: 17 },
              animation: 'slide_from_right',
              // Solo freccia, niente testo accanto al pulsante indietro (iOS / comportamento coerente)
              headerBackButtonDisplayMode: 'minimal',
              headerBackTitleVisible: false,
              headerBackTitle: '',
            }}
          >
            <Stack.Screen
              name="(tabs)"
              options={{
                headerShown: false,
                // L'etichetta del back usa il titolo della schermata precedente — evita "(tabs)"
                title: ' ',
                headerBackTitle: ' ',
              }}
            />
            <Stack.Screen
              name="onboarding"
              options={{ headerShown: false, animation: 'fade' }}
            />
            <Stack.Screen
              name="settings"
              options={{
                title: 'Impostazioni',
                headerBackTitle: ' ',
                headerBackTitleVisible: false,
                headerStyle: { backgroundColor: Colors.background },
              }}
            />
            <Stack.Screen
              name="event/[id]"
              options={{
                title: 'Evento',
                headerBackTitle: ' ',
                headerBackTitleVisible: false,
                headerStyle: { backgroundColor: Colors.background },
              }}
            />
            <Stack.Screen
              name="upload"
              options={{
                title: 'Aggiungi Evento',
                presentation: 'modal',
                headerStyle: { backgroundColor: Colors.surface },
              }}
            />
            <Stack.Screen
              name="search"
              options={{
                title: 'Cerca',
                headerBackTitle: ' ',
                headerBackTitleVisible: false,
                headerStyle: { backgroundColor: Colors.background },
              }}
            />
            {/* Moody+ — header e titoli gestiti dallo Stack in organizer/_layout.tsx */}
            <Stack.Screen name="organizer" options={{ headerShown: false }} />
          </Stack>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
