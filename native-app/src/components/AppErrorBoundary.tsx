import { Component, type ErrorInfo, type PropsWithChildren } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '../theme';

type State = { failed: boolean };

export class AppErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled app error', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <View style={styles.page}><Text style={styles.mark}>WR</Text><Text style={styles.title}>页面遇到问题</Text><Text style={styles.body}>你的账号和后台数据不会丢失。可以重新加载页面；若问题持续，请在帮助与反馈中提交诊断信息。</Text><Pressable style={styles.retry} onPress={() => this.setState({ failed: false })}><Text style={styles.retryText}>重新加载</Text></Pressable></View>;
  }
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  mark: { width: 70, height: 70, borderRadius: 22, backgroundColor: colors.danger, color: colors.white, textAlign: 'center', lineHeight: 70, fontWeight: '900', fontSize: 23 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: spacing.lg },
  body: { color: colors.muted, lineHeight: 22, textAlign: 'center', marginTop: spacing.sm },
  retry: { width: '100%', height: 50, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
  retryText: { color: colors.white, fontWeight: '900' },
});
