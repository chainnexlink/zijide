import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAlertLocationSync, usePushRegistration } from '../hooks/useDeviceFeatures';
import { useSession } from '../hooks/useSession';
import { AlertsScreen } from '../screens/AlertsScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { SheltersScreen } from '../screens/SheltersScreen';
import { SOSScreen } from '../screens/SOSScreen';
import { EmergencyProfileScreen } from '../screens/EmergencyProfileScreen';
import { SOSHistoryScreen } from '../screens/SOSHistoryScreen';
import { LegalDocumentScreen } from '../screens/LegalDocumentScreen';
import { AccountSecurityScreen } from '../screens/AccountSecurityScreen';
import { AlertDetailScreen } from '../screens/AlertDetailScreen';
import { AlertHistoryScreen } from '../screens/AlertHistoryScreen';
import { AlertSettingsScreen } from '../screens/AlertSettingsScreen';
import { ShelterDetailScreen } from '../screens/ShelterDetailScreen';
import { FamilyScreen } from '../screens/FamilyScreen';
import { MutualAidScreen } from '../screens/MutualAidScreen';
import { RoutePlanScreen } from '../screens/RoutePlanScreen';
import { ProfileEditScreen } from '../screens/ProfileEditScreen';
import { CitySelectScreen } from '../screens/CitySelectScreen';
import { NotificationSettingsScreen } from '../screens/NotificationSettingsScreen';
import { MapSettingsScreen } from '../screens/MapSettingsScreen';
import { OfflineMapsScreen } from '../screens/OfflineMapsScreen';
import { StorageSettingsScreen } from '../screens/StorageSettingsScreen';
import { DangerZoneScreen } from '../screens/DangerZoneScreen';
import { PointsScreen } from '../screens/PointsScreen';
import { InviteFriendsScreen } from '../screens/InviteFriendsScreen';
import { SubscriptionScreen } from '../screens/SubscriptionScreen';
import { AnnouncementsScreen } from '../screens/AnnouncementsScreen';
import { AnnouncementDetailScreen } from '../screens/AnnouncementDetailScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { PasswordResetScreen } from '../screens/PasswordResetScreen';
import { MonitoredLocationsScreen } from '../screens/MonitoredLocationsScreen';
import { LanguageScreen } from '../screens/LanguageScreen';
import { NewsScreen } from '../screens/NewsScreen';
import { NewsDetailScreen } from '../screens/NewsDetailScreen';
import { colors } from '../theme';

type TabParams = {
  Home: undefined;
  Alerts: undefined;
  SOS: undefined;
  Shelters: undefined;
  Profile: undefined;
};

export type RootStackParams = {
  Auth: undefined;
  MainTabs: undefined;
  EmergencyProfile: undefined;
  SOSHistory: undefined;
  AccountSecurity: undefined;
  LegalDocument: { kind: 'terms' | 'privacy' };
  AlertDetail: { alertId: string };
  AlertHistory: undefined;
  AlertSettings: undefined;
  ShelterDetail: { shelterId: string; distance?: number | null };
  Family: undefined;
  MutualAid: undefined;
  RoutePlan: { latitude: number; longitude: number; name: string };
  ProfileEdit: undefined;
  CitySelect: undefined;
  NotificationSettings: undefined;
  MapSettings: undefined;
  OfflineMaps: undefined;
  StorageSettings: undefined;
  DangerZone: { alertId: string };
  Points: undefined;
  InviteFriends: undefined;
  Subscription: undefined;
  Announcements: undefined;
  AnnouncementDetail: { announcement: { id: string; title: string; content: string; type: string; created_at: string } };
  About: undefined;
  PasswordReset: undefined;
  MonitoredLocations: undefined;
  Language: undefined;
  News: undefined;
  NewsDetail: { article: { id: string; title: string; summary: string | null; content: string; category: string; author: string | null; tags: string[]; published_at: string; view_count: number } };
};

const Tab = createBottomTabNavigator<TabParams>();
const Stack = createNativeStackNavigator<RootStackParams>();

const icons: Record<string, string> = {
  Home: '?',
  Alerts: '!',
  SOS: 'SOS',
  Shelters: '?',
  Profile: '?',
};

export function RootNavigator() {
  const { session, loading } = useSession();
  usePushRegistration(Boolean(session));
  useAlertLocationSync(Boolean(session));

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color={colors.danger} size="large" /></View>;
  }
  return <Stack.Navigator screenOptions={{ headerShown: false }}>
    {!session ? <>
      <Stack.Screen name="Auth" component={AuthScreen} />
      <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
      <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
    </> : <>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="EmergencyProfile" component={EmergencyProfileScreen} />
      <Stack.Screen name="SOSHistory" component={SOSHistoryScreen} />
      <Stack.Screen name="AccountSecurity" component={AccountSecurityScreen} />
      <Stack.Screen name="LegalDocument" component={LegalDocumentScreen} />
      <Stack.Screen name="AlertDetail" component={AlertDetailScreen} />
      <Stack.Screen name="AlertHistory" component={AlertHistoryScreen} />
      <Stack.Screen name="AlertSettings" component={AlertSettingsScreen} />
      <Stack.Screen name="ShelterDetail" component={ShelterDetailScreen} />
      <Stack.Screen name="Family" component={FamilyScreen} />
      <Stack.Screen name="MutualAid" component={MutualAidScreen} />
      <Stack.Screen name="RoutePlan" component={RoutePlanScreen} />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
      <Stack.Screen name="CitySelect" component={CitySelectScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
      <Stack.Screen name="MapSettings" component={MapSettingsScreen} />
      <Stack.Screen name="OfflineMaps" component={OfflineMapsScreen} />
      <Stack.Screen name="StorageSettings" component={StorageSettingsScreen} />
      <Stack.Screen name="DangerZone" component={DangerZoneScreen} />
      <Stack.Screen name="Points" component={PointsScreen} />
      <Stack.Screen name="InviteFriends" component={InviteFriendsScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
      <Stack.Screen name="AnnouncementDetail" component={AnnouncementDetailScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="MonitoredLocations" component={MonitoredLocationsScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
      <Stack.Screen name="News" component={NewsScreen} />
      <Stack.Screen name="NewsDetail" component={NewsDetailScreen} />
      <Stack.Screen name="PasswordReset" component={PasswordResetScreen} />
    </>}
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: '??' }} />
      <Tab.Screen name="Alerts" component={AlertsScreen} options={{ title: '??' }} />
      <Tab.Screen name="SOS" component={SOSScreen} options={{ title: '' }} />
      <Tab.Screen name="Shelters" component={SheltersScreen} options={{ title: '??' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '??' }} />
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
