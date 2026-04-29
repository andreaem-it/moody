import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={Colors.background} />
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
          {/* Tab group — root of the app */}
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          {/* Full-screen push screens (above the tab bar) */}
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
