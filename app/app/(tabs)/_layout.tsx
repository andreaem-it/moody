import { Tabs } from 'expo-router';
import TabBar from '../../components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"  options={{ title: 'Eventi' }} />
      <Tabs.Screen name="mood"   options={{ title: 'Mood'   }} />
      <Tabs.Screen name="vai"    options={{ title: 'Vai'    }} />
      <Tabs.Screen name="amici"  options={{ title: 'Amici'  }} />
      <Tabs.Screen name="tu"     options={{ title: 'Tu'     }} />
    </Tabs>
  );
}
