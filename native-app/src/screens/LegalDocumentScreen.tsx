import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '../components/Screen';
import { colors, radius, spacing } from '../theme';
import type { RootStackParams } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParams, 'LegalDocument'>;

const terms = [
  ['服务性质', 'WarRescue 是面向冲突和灾害环境的安全信息辅助工具，提供公开信息聚合、预警、避难所导航、家庭守护、互助和 SOS 功能。它不属于政府官方预警或专业救援机构，不能替代当地政府、警方、消防、医疗机构的指令。'],
  ['账号与使用', '用户应提供真实、有效的联系方式和紧急资料，并妥善保护账号。禁止虚假触发 SOS、滥用互助、干扰救援或上传违法内容。'],
  ['预警与定位', '预警存在来源延迟、网络中断或定位误差。用户应结合官方渠道和现场情况判断，危险时优先遵守当地主管部门指示。'],
  ['SOS与互助', 'SOS会向用户设置的联系人、家庭成员和符合条件的互助人员发送位置及必要救援信息。WarRescue 不承诺救援人员一定到达，也不承担官方紧急呼叫职责。'],
  ['订阅服务', '付费订阅通过 Apple App Store 完成并按 Apple 规则自动续订、取消和退款。恢复购买时以 Apple 验证结果为准。'],
  ['责任与终止', '因不可抗力、通信中断、第三方数据错误导致的服务不可用，将在法律允许范围内处理。严重违规账号可能被暂停或终止。'],
];

const privacy = [
  ['收集的信息', '我们处理账号信息、设备推送标识、精确或粗略位置、用户填写的医疗和紧急联系人资料、家庭关系、SOS及互助记录、订阅状态和必要的诊断信息。'],
  ['使用目的', '信息仅用于身份验证、区域预警、避难导航、家庭位置共享、SOS触达、互助响应、订阅验证、安全审计和客户支持，不用于跨应用广告追踪，也不出售个人信息。'],
  ['紧急共享', '发生 SOS 时，位置、联系方式以及必要医疗资料可提供给用户指定联系人、家庭成员、授权救援人员或响应互助者；非紧急情况下不会公开展示身份和医疗信息。'],
  ['存储与安全', '后台使用访问控制和行级权限限制数据读取。数据保存期限以提供服务、处理争议和满足法律义务所需时间为限。'],
  ['用户权利', '用户可以在 App 中查看和修改资料、管理通知与位置权限、退出家庭、撤回互助订阅，并可申请注销账号和删除关联数据。'],
  ['联系我们', '隐私或账号问题请联系 yicaijingpin@outlook.com。政策更新会在 App 内公告，重大变更会重新征求同意。'],
];

export function LegalDocumentScreen({ route, navigation }: Props) {
  const isPrivacy = route.params.kind === 'privacy';
  const sections = isPrivacy ? privacy : terms;
  return <Screen title={isPrivacy ? '隐私政策' : '用户协议'} subtitle="WarRescue 原生版" action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>返回</Text></Pressable>}>
    <View style={styles.notice}><Text style={styles.noticeText}>生效日期：2026年7月20日</Text></View>
    {sections.map(([title, body]) => <View key={title} style={styles.card}><Text style={styles.title}>{title}</Text><Text style={styles.body}>{body}</Text></View>)}
  </Screen>;
}

const styles = StyleSheet.create({ back: { color: colors.info, fontWeight: '800' }, notice: { backgroundColor: colors.surfaceRaised, borderRadius: radius.sm, padding: spacing.md }, noticeText: { color: colors.muted }, card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.lg, gap: spacing.sm }, title: { color: colors.text, fontSize: 17, fontWeight: '900' }, body: { color: '#CBD5E1', lineHeight: 23 } });
