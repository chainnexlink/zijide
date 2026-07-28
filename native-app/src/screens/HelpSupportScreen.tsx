import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import type { RootStackParams } from '../navigation/RootNavigator';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParams, 'HelpSupport'>;
const categories = ['功能问题', '账号问题', '预警数据', 'SOS与救援', '地图与定位', '建议'];
const faqs = [
  ['收不到预警通知怎么办？', '请在“权限与诊断”中确认通知已允许、推送设备已注册，并检查“通知设置”中的预警等级与免打扰时段。'],
  ['定位或附近避难所不准确怎么办？', '请允许精确定位并刷新当前位置。危险环境中请以当地官方指引和现场标识为准。'],
  ['SOS 是否等同于报警？', '不是。SOS 会按配置通知家庭、互助人员和后台，但不能替代当地警察、消防、医疗或民防电话。'],
  ['忘记密码怎么办？', '退出登录后在邮箱登录页选择“忘记密码”，打开重置邮件后设置新密码。'],
];

export function HelpSupportScreen({ navigation }: Props) {
  const [category, setCategory] = useState(categories[0]!);
  const [content, setContent] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const loadHistory = async () => { const { data, error } = await supabase.from('user_feedback').select('id,category,content,status,admin_reply,responded_at,created_at').order('created_at', { ascending: false }).limit(20); if (error) Alert.alert('反馈记录加载失败', '请检查网络后重试。'); else setHistory(data || []); };
  useEffect(() => { void loadHistory(); }, []);

  const submit = async () => {
    const clean = content.trim();
    if (clean.length < 10) return Alert.alert('请补充说明', '问题描述至少需要 10 个字，方便我们定位和处理。');
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from('user_feedback').insert({
      user_id: auth.user?.id,
      category,
      content: clean,
      app_version: Constants.expoConfig?.version || '1.1.0',
      platform: Device.osName || 'unknown',
      device_model: Device.modelName || null,
    });
    setBusy(false);
    if (error) return Alert.alert('提交失败', '反馈暂时未能同步，请检查网络后重试。');
    setContent('');
    await loadHistory();
    Alert.alert('提交成功', '反馈已安全同步到后台。紧急情况请直接联系当地紧急服务。');
  };

  return (
    <Screen title="帮助与反馈" subtitle="常见问题、问题反馈与客服联系" action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>}>
      <View style={styles.card}>
        <Text style={styles.title}>常见问题</Text>
        {faqs.map(([question, answer], index) => <Pressable key={question} style={styles.faq} onPress={() => setOpenFaq(openFaq === index ? null : index)}><View style={styles.faqHeader}><Text style={styles.question}>{question}</Text><Text style={styles.chevron}>{openFaq === index ? '−' : '+'}</Text></View>{openFaq === index ? <Text style={styles.answer}>{answer}</Text> : null}</Pressable>)}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>我的反馈</Text>
        {history.map((item) => <View key={item.id} style={styles.feedback}><View style={styles.faqHeader}><Text style={styles.question}>{item.category}</Text><Text style={item.status === 'resolved' ? styles.resolved : styles.pending}>{item.status === 'resolved' ? '已回复' : '处理中'}</Text></View><Text style={styles.answer}>{item.content}</Text>{item.admin_reply ? <View style={styles.reply}><Text style={styles.replyLabel}>客服回复</Text><Text style={styles.answer}>{item.admin_reply}</Text></View> : null}<Text style={styles.counter}>{new Date(item.created_at).toLocaleString('zh-CN')}</Text></View>)}
        {!history.length ? <Text style={styles.body}>暂无提交记录</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>提交问题或建议</Text>
        <Text style={styles.label}>问题类型</Text>
        <View style={styles.categories}>{categories.map((item) => <Pressable key={item} style={[styles.category, category === item && styles.categoryActive]} onPress={() => setCategory(item)}><Text style={[styles.categoryText, category === item && styles.categoryTextActive]}>{item}</Text></Pressable>)}</View>
        <TextInput
          style={styles.input}
          value={content}
          onChangeText={(value) => setContent(value.slice(0, 1000))}
          placeholder="请描述发生了什么、操作步骤和期望结果（至少10字）"
          placeholderTextColor={colors.muted}
          multiline
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={styles.counter}>{content.length}/1000</Text>
        <Pressable style={[styles.submit, busy && styles.disabled]} onPress={() => void submit()} disabled={busy}>{busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.submitText}>提交并同步后台</Text>}</Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>联系客服</Text>
        <Text style={styles.body}>账号、隐私或长期未解决的问题，可发送邮件并附上诊断信息。客服不提供实时紧急救援。</Text>
        <Pressable style={styles.contact} onPress={() => void Linking.openURL('mailto:yicaijingpin@outlook.com?subject=WarRescue%20Support')}><Text style={styles.contactText}>yicaijingpin@outlook.com</Text></Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.info, fontWeight: '800' },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.md },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  faq: { paddingVertical: spacing.sm, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
  faqHeader: { flexDirection: 'row', alignItems: 'center' },
  question: { color: colors.text, flex: 1, fontWeight: '700', lineHeight: 21 },
  chevron: { color: colors.info, fontSize: 22, marginLeft: spacing.sm },
  answer: { color: colors.muted, lineHeight: 20, marginTop: spacing.sm },
  label: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  category: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.round, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  categoryActive: { backgroundColor: '#EF444422', borderColor: colors.danger },
  categoryText: { color: colors.muted, fontWeight: '700' },
  categoryTextActive: { color: colors.danger },
  input: { minHeight: 150, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.text, backgroundColor: colors.background, padding: spacing.md, fontSize: 15, lineHeight: 22 },
  counter: { color: colors.muted, fontSize: 12, textAlign: 'right', marginTop: -spacing.sm },
  submit: { height: 50, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' },
  submitText: { color: colors.white, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  body: { color: colors.muted, lineHeight: 20 },
  contact: { height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.info, alignItems: 'center', justifyContent: 'center' },
  contactText: { color: colors.info, fontWeight: '800' },
  feedback: { paddingVertical: spacing.sm, borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  pending: { color: colors.warning, fontSize: 12, fontWeight: '800' },
  resolved: { color: colors.safe, fontSize: 12, fontWeight: '800' },
  reply: { backgroundColor: colors.surfaceRaised, borderRadius: radius.sm, padding: spacing.md, gap: spacing.xs },
  replyLabel: { color: colors.info, fontWeight: '800', fontSize: 12 },
});
