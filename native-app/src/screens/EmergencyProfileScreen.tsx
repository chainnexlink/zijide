import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '../components/Screen';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import type { RootStackParams } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParams, 'EmergencyProfile'>;
type FormState = {
  nickname: string;
  birth_date: string;
  gender: string;
  language: string;
  blood_type: string;
  allergies: string;
  medical_history: string;
  current_medication: string;
  medical_notes: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relation: string;
};

const initialForm: FormState = {
  nickname: '', birth_date: '', gender: 'secret', language: 'zh',
  blood_type: 'unknown', allergies: '', medical_history: '', current_medication: '', medical_notes: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
};
const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'];

export function EmergencyProfileScreen({ navigation }: Props) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const result = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
      if (result.data) {
        setForm(Object.fromEntries(Object.keys(initialForm).map((key) => [key, String(result.data?.[key] ?? initialForm[key as keyof FormState])])) as FormState);
      }
      setLoading(false);
    });
  }, []);

  const update = (key: keyof FormState, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    const result = auth.user ? await supabase.from('profiles').update({ ...form, birth_date: form.birth_date || null }).eq('id', auth.user.id) : { error: new Error('?????') };
    setSaving(false);
    if (result.error) Alert.alert('????', result.error.message);
    else Alert.alert('???', '?????? SOS ????????????');
  };

  if (loading) return <View style={styles.loading}><ActivityIndicator color={colors.danger} size="large" /></View>;
  return (
    <Screen title="??????" subtitle="???? SOS ??" action={<Pressable onPress={() => navigation.goBack()}><Text style={styles.back}>??</Text></Pressable>}>
      <Text style={styles.notice}>?????????????????????????????????</Text>
      <Section title="????">
        <Field label="??" value={form.nickname} onChangeText={(v) => update('nickname', v)} />
        <Field label="?????YYYY-MM-DD?" value={form.birth_date} onChangeText={(v) => update('birth_date', v)} />
        <Text style={styles.label}>??</Text>
        <View style={styles.choiceRow}>{([['male', '?'], ['female', '?'], ['secret', '???']] as const).map(([value, label]) => <Choice key={value} label={label} selected={form.gender === value} onPress={() => update('gender', value)} />)}</View>
        <Text style={styles.label}>??????</Text>
        <View style={styles.choiceRow}>{([['zh', '??'], ['en', 'English'], ['ru', '???????'], ['uk', '??????????']] as const).map(([value, label]) => <Choice key={value} label={label} selected={form.language === value} onPress={() => update('language', value)} />)}</View>
      </Section>
      <Section title="??">
        <View style={styles.bloodGrid}>{bloodTypes.map((type) => <Pressable key={type} style={[styles.blood, form.blood_type === type && styles.bloodActive]} onPress={() => update('blood_type', type)}><Text style={[styles.bloodText, form.blood_type === type && styles.bloodTextActive]}>{type === 'unknown' ? '??' : type}</Text></Pressable>)}</View>
      </Section>
      <Section title="????">
        <Field label="???" value={form.allergies} onChangeText={(v) => update('allergies', v)} />
        <Field label="????" value={form.medical_history} onChangeText={(v) => update('medical_history', v)} multiline />
        <Field label="????" value={form.current_medication} onChangeText={(v) => update('current_medication', v)} multiline />
        <Field label="??????" value={form.medical_notes} onChangeText={(v) => update('medical_notes', v)} multiline />
      </Section>
      <Section title="?????">
        <Field label="??" value={form.emergency_contact_name} onChangeText={(v) => update('emergency_contact_name', v)} />
        <Field label="??" value={form.emergency_contact_relation} onChangeText={(v) => update('emergency_contact_relation', v)} />
        <Field label="?????????" value={form.emergency_contact_phone} onChangeText={(v) => update('emergency_contact_phone', v)} keyboardType="phone-pad" />
      </Section>
      <Pressable style={styles.save} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>??????</Text>}</Pressable>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <View style={styles.card}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} placeholder={label} placeholderTextColor={colors.muted} style={[styles.input, props.multiline && styles.multiline]} /></View>; }
function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) { return <Pressable style={[styles.choice, selected && styles.choiceActive]} onPress={onPress}><Text style={[styles.choiceText, selected && styles.choiceTextActive]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }, back: { color: colors.info, fontWeight: '800' },
  notice: { color: '#FCA5A5', backgroundColor: '#7F1D1D55', borderColor: '#EF444466', borderWidth: 1, borderRadius: radius.md, padding: spacing.md, lineHeight: 20 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, gap: spacing.md }, sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  bloodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, blood: { width: '18%', minWidth: 52, height: 42, borderRadius: radius.sm, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }, bloodActive: { backgroundColor: colors.danger }, bloodText: { color: colors.muted, fontWeight: '800' }, bloodTextActive: { color: colors.white },
  choiceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, choice: { minHeight: 40, paddingHorizontal: spacing.md, borderRadius: radius.sm, backgroundColor: colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }, choiceActive: { backgroundColor: colors.info }, choiceText: { color: colors.muted, fontWeight: '700' }, choiceTextActive: { color: colors.background },
  field: { gap: 6 }, label: { color: colors.muted, fontSize: 13 }, input: { height: 50, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.text, backgroundColor: colors.background, paddingHorizontal: spacing.md }, multiline: { height: 88, paddingTop: spacing.md, textAlignVertical: 'top' },
  save: { height: 52, borderRadius: radius.md, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center' }, saveText: { color: colors.white, fontWeight: '900', fontSize: 16 },
});
