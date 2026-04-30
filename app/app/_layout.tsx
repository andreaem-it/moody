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
            }}
          >
            <Stack.Screen name="(tabs)"      options={{ headerShown: false }} />
            <Stack.Screen
              name="onboarding"
              options={{ headerShown: false, animation: 'fade' }}
            />
            <Stack.Screen
              name="settings"
              options={{
                title: 'Impostazioni',
                headerBackTitle: '',
                headerStyle: { backgroundColor: Colors.background },
              }}
            />
            <Stack.Screen
              name="event/[id]"
              options={{
                title: 'Evento',
                headerBackTitle: '',
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
          </Stack>
        )}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
