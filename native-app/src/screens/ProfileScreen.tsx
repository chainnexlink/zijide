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
    <Screen title="我的" subtitle="个人安全与设备设置">
      <View style={styles.identity}>
        {profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} /> : <View style={styles.avatar}><Text style={styles.avatarText}>{(profile?.nickname || email || 'W').slice(0, 1).toUpperCase()}</Text></View>}
        <View style={styles.identityText}>
          <Text style={styles.name}>{profile?.nickname || 'WarRescue 用户'}</Text>
          <Text style={styles.email}>{email}</Text>
          <Text style={styles.location}>{[profile?.city, profile?.country].filter(Boolean).join(' · ') || '尚未设置常驻地点'}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>紧急资料</Text>
        <Row label="血型" value={profile?.blood_type || '未设置'} />
        <Row label="紧急联系人" value={profile?.emergency_contact_name || '未设置'} />
        <Row label="联系电话" value={profile?.emergency_contact_phone || '未设置'} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>安全服务</Text>
        <Menu label="编辑个人资料" description="头像、昵称、性别、生日和常驻城市" onPress={() => navigation.navigate('ProfileEdit')} />
        <Menu label="通知设置" description="推送、短信、邮件、声音和免打扰" onPress={() => navigation.navigate('NotificationSettings')} />
        <Menu label="地图设置" description="地图类型、路线偏好、图层和单位" onPress={() => navigation.navigate('MapSettings')} />
        <Menu label="存储设置" description="缓存、离线包和本地数据" onPress={() => navigation.navigate('StorageSettings')} />
        <Menu label="语言 / Language" description="9种预警与紧急信息语言" onPress={() => navigation.navigate('Language')} />
        <Menu label="紧急医疗资料" description="血型、病史、用药和紧急联系人" onPress={() => navigation.navigate('EmergencyProfile')} />
        <Menu label="SOS 历史" description="查看求救状态与救援阶段" onPress={() => navigation.navigate('SOSHistory')} />
        <Menu label="家庭守护" description="创建或加入家庭、位置和SOS联动" onPress={() => navigation.navigate('Family')} />
        <Menu label="1公里互助" description="附近求救、响应、到达、完成与积分" onPress={() => navigation.navigate('MutualAid')} />
        <Menu label="互助积分" description="积分明细与兑换免费订阅时长" onPress={() => navigation.navigate('Points')} />
        <Menu label="邀请好友" description="邀请码、分享、注册记录与5折券" onPress={() => navigation.navigate('InviteFriends')} />
        <Menu label="订阅服务" description="个人/家庭方案、Apple购买与恢复" onPress={() => navigation.navigate('Subscription')} />
        <Menu label="公告与安全资讯" description="平台通知和重要安全说明" onPress={() => navigation.navigate('Announcements')} />
        <Menu label="安全资讯文章" description="避险指南、功能说明与风险知识" onPress={() => navigation.navigate('News')} />
        <Menu label="关于 WarRescue" description="使命、版本与重要说明" onPress={() => navigation.navigate('About')} />
        <Menu label="账号安全" description="修改密码、退出设备和注销账号" onPress={() => navigation.navigate('AccountSecurity')} />
        <Menu label="用户协议" description="查看服务使用规则" onPress={() => navigation.navigate('LegalDocument', { kind: 'terms' })} />
        <Menu label="隐私政策" description="查看信息收集与使用说明" onPress={() => navigation.navigate('LegalDocument', { kind: 'privacy' })} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>App 状态</Text>
        <Row label="推送通知" value="已启用" tone={colors.safe} />
        <Row label="安全监测" value="运行中" tone={colors.safe} />
        <Row label="版本" value="1.0.0 Native" />
      </View>

      <Pressable style={styles.logout} onPress={() => void supabase.auth.signOut()}>
        <Text style={styles.logoutText}>退出登录</Text>
      </Pressable>
    </Screen>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <View style={styles.row}><Text style={styles.label}>{label}</Text><Text style={[styles.value, tone ? { color: tone } : null]}>{value}</Text></View>;
}

function Menu({ label, description, onPress }: { label: string; description: string; onPress: () => void }) {
  return <Pressable style={styles.menu} onPress={onPress}><View style={styles.menuText}><Text style={styles.menuLabel}>{label}</Text><Text style={styles.menuDescription}>{description}</Text></View><Text style={styles.chevron}>›</Text></Pressable>;
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
