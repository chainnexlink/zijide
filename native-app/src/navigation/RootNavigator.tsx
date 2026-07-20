import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { usePushRegistration } from '../hooks/useDeviceFeatures';
import { useSession } from '../hooks/useSession';
import { AlertsScreen } from '../screens/AlertsScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SheltersScreen } from '../screens/SheltersScreen';
import { SOSScreen } from '../screens/SOSScreen';
import { EmergencyProfileScreen } from '../screens/EmergencyProfileScreen';
import { SOSHistoryScreen } from '../screens/SOSHistoryScreen';
import { colors } from '../theme';

type TabParams = {
  Home: undefined;
  Alerts: undefined;
  SOS: undefined;
  Shelters: undefined;
  Profile: undefined;
};

export type RootStackParams = {
  MainTabs: undefined;
  EmergencyProfile: undefined;
  SOSHistory: undefined;
};

const Tab = createBottomTabNavigator<TabParams>();
const Stack = createNativeStackNavigator<RootStackParams>();

const icons: Record<string, string> = {
  Home: '⌂',
  Alerts: '!',
  SOS: 'SOS',
  Shelters: '⌖',
  Profile: '●',
};

export function RootNavigator() {
  const { session, loading } = useSession();
  usePushRegistration(Boolean(session));

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color={colors.danger} size="large" /></View>;
  }
  if (!session) return <AuthScreen />;

  return <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MainTabs" component={MainTabs} />
    <Stack.Screen name="EmergencyProfile" component={EmergencyProfileScreen} />
    <Stack.Screen name="SOSHistory" component={SOSHistoryScreen} />
  </Stack.Navigator>;
}

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: route.name === 'SOS' ? colors.white : colors.danger,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused }) => (
          <View style={[styles.icon, route.name === 'SOS' && styles.sosIcon, focused && route.name !== 'SOS' && styles.iconActive]}>
            <Text style={[styles.iconText, route.name === 'SOS' && styles.sosText]}>{icons[route.name]}</Text>
          </View>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '首页' }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ title: '预警' }} />
      <Tab.Screen name="SOS" component={SOSScreen} options={{ title: '' }} />
      <Tab.Screen name="Shelters" component={SheltersScreen} options={{ title: '避难' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '我的' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  tabBar: { position: 'absolute', height: 82, paddingTop: 8, paddingBottom: 12, backgroundColor: '#0B111CCC', borderTopColor: colors.border },
  tabLabel: { fontSize: 11, fontWeight: '700' },
  icon: { width: 34, height: 30, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  iconActive: { backgroundColor: '#EF444422' },
  iconText: { color: colors.text, fontSize: 20, fontWeight: '900' },
  sosIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.danger, marginTop: -28, borderWidth: 4, borderColor: colors.background },
  sosText: { fontSize: 13, color: colors.white },
});
