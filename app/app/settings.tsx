import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { VIBES } from '../constants/vibes';
import { fetchProfile, updatePreferences } from '../services/api';
import type { UserProfile } from '../services/api';
import { useDeviceId } from '../hooks/useDeviceId';

type BudgetLevel = 'low' | 'medium' | 'high';
type Vibe = keyof typeof VIBES;

const DISTANCE_OPTIONS = [5, 10, 20, 50, 100];
const BUDGET_OPTIONS: { key: BudgetLevel; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'low',    label: 'Economico', sub: 'Gratuito – €15',  icon: 'leaf-outline'    },
  { key: 'medium', label: 'Medio',     sub: '€15 – €50',       icon: 'card-outline'    },
  { key: 'high',   label: 'Premium',   sub: '€50+',            icon: 'diamond-outline' },
];
const LEVEL_STEPS = [0.1, 0.3, 0.5, 0.7, 0.9];
const LEVEL_LABELS = ['Minimo', 'Basso', 'Medio', 'Alto', 'Massimo'];

function nearestStep(v: number) {
  return LEVEL_STEPS.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
}

export default function SettingsScreen() {
  const userId = useDeviceId();
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [profile,  setProfile]  = useState<UserProfile | null>(null);

  // Form state
  const [vibes,       setVibes]       = useState<Set<Vibe>>(new Set());
  const [distance,    setDistance]    = useState(20);
  const [budget,      setBudget]      = useState<BudgetLevel>('medium');
  const [energy,      setEnergy]      = useState(0.5);
  const [social,      setSocial]      = useState(0.5);
  const [exploration, setExploration] = useState(0.3);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const p = await fetchProfile(userId);
      setProfile(p);
      setVibes(new Set((p.preferredVibes ?? []) as Vibe[]));
      setDistance(p.maxDistanceKm ?? 20);
      setBudget((p.budgetLevel as BudgetLevel) ?? 'medium');
      setEnergy(nearestStep(p.energyPreference ?? 0.5));
      setSocial(nearestStep(p.socialPreference ?? 0.5));
      setExploration(nearestStep(p.explorationRate ?? 0.3));
    } catch {
      Alert.alert('Errore', 'Impossibile caricare le preferenze.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const toggleVibe = (v: Vibe) => {
    setVibes((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updatePreferences(userId, {
        preferredVibes:   Array.from(vibes),
        maxDistanceKm:    distance,
        budgetLevel:      budget,
        energyPreference: energy,
        socialPreference: social,
        explorationRate:  exploration,
      });
      router.back();
    } catch {
      Alert.alert('Errore', 'Impossibile salvare le preferenze. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Vibe ── */}
        <Section title="Le tue vibe" sub="Seleziona quelle che ti rappresentano di più">
          <View style={styles.vibeGrid}>
            {(Object.keys(VIBES) as Vibe[]).map((v) => {
              const cfg    = VIBES[v];
              const active = vibes.has(v);
              return (
                <TouchableOpacity
                  key={v}
                  style={[styles.vibeChip, { borderColor: active ? cfg.color : Colors.border, backgroundColor: active ? cfg.color + '22' : Colors.surface }]}
                  onPress={() => toggleVibe(v)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={cfg.icon as any} size={15} color={active ? cfg.color : Colors.textTertiary} />
                  <Text style={[styles.vibeLabel, { color: active ? cfg.color : Colors.textSecondary }]}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* ── Distanza ── */}
        <Section title="Distanza massima" sub="Quanto sei disposto a spostarti per un evento">
          <View style={styles.chipRow}>
            {DISTANCE_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.chip, distance === d && styles.chipActive]}
                onPress={() => setDistance(d)}
                activeOpacity={0.75}
              >
                <Text style={[styles.chipText, distance === d && styles.chipTextActive]}>
                  {d === 100 ? '100+ km' : `${d} km`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* ── Budget ── */}
        <Section title="Budget" sub="Quanto vuoi spendere mediamente per uscire">
          <View style={styles.budgetRow}>
            {BUDGET_OPTIONS.map((b) => (
              <TouchableOpacity
                key={b.key}
                style={[styles.budgetCard, budget === b.key && styles.budgetCardActive]}
                onPress={() => setBudget(b.key)}
                activeOpacity={0.75}
              >
                <Ionicons name={b.icon} size={20} color={budget === b.key ? Colors.accentLight : Colors.textTertiary} />
                <Text style={[styles.budgetLabel, budget === b.key && styles.budgetLabelActive]}>{b.label}</Text>
                <Text style={[styles.budgetSub,   budget === b.key && styles.budgetSubActive]}>{b.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* ── Energia ── */}
        <Section title="Energia preferita" sub="Preferisci serate tranquille o piene di adrenalina?">
          <LevelSelector
            value={energy}
            onChange={setEnergy}
            lowLabel="Rilassato"
            highLabel="Adrenalina"
            color={Colors.vibe.energetic}
          />
        </Section>

        {/* ── Socialità ── */}
        <Section title="Socialità preferita" sub="Preferisci eventi intimi o grandi assembramenti?">
          <LevelSelector
            value={social}
            onChange={setSocial}
            lowLabel="Intimo"
            highLabel="Folla"
            color={Colors.vibe.social}
          />
        </Section>

        {/* ── Esplorazione ── */}
        <Section title="Voglia di scoprire" sub="Quanto ti piace uscire dalla tua comfort zone?">
          <LevelSelector
            value={exploration}
            onChange={setExploration}
            lowLabel="Solito"
            highLabel="Avventuroso"
            color={Colors.accent}
          />
        </Section>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Sticky save ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={save}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator size="small" color={Colors.text} />
            : <Text style={styles.saveBtnText}>Salva preferenze</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── LevelSelector ────────────────────────────────────────────────────────────

function LevelSelector({ value, onChange, lowLabel, highLabel, color }: {
  value: number; onChange: (v: number) => void;
  lowLabel: string; highLabel: string; color: string;
}) {
  return (
    <View style={ls.wrap}>
      <View style={ls.row}>
        {LEVEL_STEPS.map((step, i) => (
          <TouchableOpacity
            key={step}
            style={[ls.dot, { borderColor: color, backgroundColor: value === step ? color : 'transparent' }]}
            onPress={() => onChange(step)}
            activeOpacity={0.75}
          />
        ))}
      </View>
      <View style={ls.labels}>
        <Text style={ls.label}>{lowLabel}</Text>
        <Text style={[ls.current, { color }]}>{LEVEL_LABELS[LEVEL_STEPS.indexOf(value)] ?? 'Medio'}</Text>
        <Text style={ls.label}>{highLabel}</Text>
      </View>
    </View>
  );
}
const ls = StyleSheet.create({
  wrap:    { gap: 8 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  dot:     { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  labels:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:   { fontSize: 11, color: Colors.textTertiary },
  current: { fontSize: 13, fontWeight: '700' },
});

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <View style={sec.wrap}>
      <Text style={sec.title}>{title.toUpperCase()}</Text>
      <Text style={sec.sub}>{sub}</Text>
      <View style={sec.body}>{children}</View>
    </View>
  );
}
const sec = StyleSheet.create({
  wrap:  { gap: 8 },
  title: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 1 },
  sub:   { fontSize: 13, color: Colors.textSecondary, marginTop: -4 },
  body:  { backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.cardBorder },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: Colors.background },
  centered:{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  content: { padding: 20, gap: 24 },

  vibeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vibeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5 },
  vibeLabel:{ fontSize: 13, fontWeight: '600' },

  chipRow:      { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip:         { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 99, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipActive:   { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  chipText:     { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive:{ color: Colors.accentLight },

  budgetRow:         { flexDirection: 'row', gap: 8 },
  budgetCard:        { flex: 1, alignItems: 'center', gap: 4, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  budgetCardActive:  { borderColor: Colors.accent, backgroundColor: Colors.accentDim },
  budgetLabel:       { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  budgetLabelActive: { color: Colors.accentLight },
  budgetSub:         { fontSize: 10, color: Colors.textTertiary, textAlign: 'center' },
  budgetSubActive:   { color: Colors.accent },

  footer:    { padding: 16, paddingBottom: 32, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
  saveBtn:   { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: Colors.text },
});
