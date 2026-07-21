import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import type { ProfileRow } from '../types';
import type { RootStackParams } from '../navigation/RootNavigator';

export function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParams>>();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setEmail(data.user.email || '');
      const { data: row } = await supabase.from('profiles').select('id,nickname,avatar_url,email,city,country,blood_type,emergency_contact_name,emergency_contact_phone').eq('id', data.user.id).maybeSingle();
      setProfile(row as ProfileRow | null);
    });
  }, []);

  return (
    <Screen title="??" subtitle="?????????">
      <View style={styles.identity}>
        {profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} /> : <View style={styles.avatar}><Text style={styles.avatarText}>{(profile?.nickname || email || 'W').slice(0, 1).toUpperCase()}</Text></View>}
        <View style={styles.identityText}>
          <Text style={styles.name}>{profile?.nickname || 'WarRescue ??'}</Text>
          <Text style={styles.email}>{email}</Text>
          <Text style={styles.location}>{[profile?.city, profile?.country].filter(Boolean).join(' ? ') || '????????'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>????</Text>
        <Row label="??" value={profile?.blood_type || '???'} />
        <Row label="?????" value={profile?.emergency_contact_name || '???'} />
        <Row label="????" value={profile?.emergency_contact_phone || '???'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>????</Text>
        <Menu label="??????" description="????????????????" onPress={() => navigation.navigate('ProfileEdit')} />
        <Menu label="????" description="???????????????" onPress={() => navigation.navigate('NotificationSettings')} />
        <Menu label="????" description="???????????????" onPress={() => navigation.navigate('MapSettings')} />
        <Menu label="????" description="???????????" onPress={() => navigation.navigate('StorageSettings')} />
        <Menu label="?? / Language" description="9??????????" onPress={() => navigation.navigate('Language')} />
        <Menu label="??????" description="??????????????" onPress={() => navigation.navigate('EmergencyProfile')} />
        <Menu label="SOS ??" description="???????????" onPress={() => navigation.navigate('SOSHistory')} />
        <Menu label="????" description="???????????SOS??" onPress={() => navigation.navigate('Family')} />
        <Menu label="1????" description="????????????????" onPress={() => navigation.navigate('MutualAid')} />
        <Menu label="????" description="?????????????" onPress={() => navigation.navigate('Points')} />
        <Menu label="????" description="????????????5??" onPress={() => navigation.navigate('InviteFriends')} />
        <Menu label="????" description="??/?????Apple?????" onPress={() => navigation.navigate('Subscription')} />
        <Menu label="???????" description="???????????" onPress={() => navigation.navigate('Announcements')} />
        <Menu label="??????" description="??????????????" onPress={() => navigation.navigate('News')} />
        <Menu label="?? WarRescue" description="??????????" onPress={() => navigation.navigate('About')} />
        <Menu label="????" description="??????????????" onPress={() => navigation.navigate('AccountSecurity')} />
        <Menu label="????" description="????????" onPress={() => navigation.navigate('LegalDocument', { kind: 'terms' })} />
        <Menu label="????" description="???????????" onPress={() => navigation.navigate('LegalDocument', { kind: 'privacy' })} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>App ??</Text>
        <Row label="????" value="???" tone={colors.safe} />
        <Row label="????" value="???" tone={colors.safe} />
        <Row label="??" value="1.0.0 Native" />
      </View>

      <Pressable style={styles.logout} onPress={() => void supabase.auth.signOut()}>
        <Text style={styles.logoutText}>????</Text>
      </Pressable>
    </Screen>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={[styles.value, tone ? { color: tone } : null]}>{value}</Text></View>;
}

function Menu({ label, description, onPress }: { label: string; description: string; onPress: () => void }) {
  return <Pressable style={styles.menu} onPress={onPress}><View style={styles.menuText}><Text style={styles.menuLabel}>{label}</Text><Text style={styles.menuDescription}>{description}</Text></View><Text style={styles.chevron}>?</Text></Pressable>;
}

const styles = StyleSheet.create({
  identity: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: spacing.lg },
  avatar: { width: 66, height: 66, borderRadius: 24, backgroundColor: '#EF444422', borderColor: '#EF444455', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.danger, fontSize: 27, fontWeight: '900' },
  identityText: { flex: 1, marginLeft: spacing.md },
  name: { color: colors.text, fontSize: 19, fontWeight: '800' },
  email: { color: colors.muted, marginTop: 4 },
  location: { color: colors.info, fontSize: 12, marginTop: 5 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { color: colors.muted },
  value: { color: colors.text, fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
  logout: { height: 52, borderRadius: radius.md, borderColor: '#EF444466', borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF44440F' },
  logoutText: { color: colors.danger, fontWeight: '800' },
  menu: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  menuText: { flex: 1 },
  menuLabel: { color: colors.text, fontWeight: '800' },
  menuDescription: { color: colors.muted, fontSize: 12, marginTop: 4 },
  chevron: { color: colors.muted, fontSize: 26 },
});
