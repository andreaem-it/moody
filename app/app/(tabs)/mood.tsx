import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { VIBES } from '../../constants/vibes';
import EventCard from '../../components/EventCard';
import { fetchFeed } from '../../services/api';
import type { Event, ContextMode, FeedbackType } from '../../services/api';
import { useDeviceId } from '../../hooks/useDeviceId';

type Vibe = keyof typeof VIBES;

const MOOD_QUESTIONS = [
  { label: 'Stasera', context: 'tonight'     as ContextMode },
  { label: 'Weekend', context: 'weekend'     as ContextMode },
  { label: 'Subito',  context: 'last-minute' as ContextMode },
];

export default function MoodScreen() {
  const insets = useSafeAreaInsets();
  const userId = useDeviceId();

  const [selectedVibes, setSelectedVibes] = useState<Set<Vibe>>(new Set());
  const [context, setContext] = useState<ContextMode>('tonight');
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await fetchFeed(context, userId);
      setAllEvents(data);
    } catch {
      setAllEvents([]);
    } finally {
      setLoading(false);
    }
  }, [context, userId]);

  useEffect(() => { load(); }, [load]);

  const toggleVibe = (vibe: Vibe) => {
    setSelectedVibes((prev) => {
      const next = new Set(prev);
      next.has(vibe) ? next.delete(vibe) : next.add(vibe);
      return next;
    });
  };

  const filtered = selectedVibes.size === 0
    ? allEvents
    : allEvents.filter((e) => e.vibes.some((v) => selectedVibes.has(v as Vibe)));

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Come ti senti?</Text>
        <Text style={styles.subtitle}>Filtra gli eventi per vibe</Text>
      </View>

      {/* Context pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.contextRow}>
        {MOOD_QUESTIONS.map((q) => (
          <TouchableOpacity
            key={q.context}
            style={[styles.ctxPill, context === q.context && styles.ctxPillActive]}
            onPress={() => setContext(q.context)}
            activeOpacity={0.75}
          >
            <Text style={[styles.ctxLabel, context === q.context && styles.ctxLabelActive]}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Vibe selector */}
      <View style={styles.vibeSection}>
        <Text style={styles.sectionLabel}>SELEZIONA VIBE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vibeRow}>
          {(Object.keys(VIBES) as Vibe[]).map((vibe) => {
            const cfg = VIBES[vibe];
            const active = selectedVibes.has(vibe);
            return (
              <TouchableOpacity
                key={vibe}
                style={[styles.vibeChip, { borderColor: active ? cfg.color : Colors.border, backgroundColor: active ? cfg.color + '25' : Colors.surface }]}
                onPress={() => toggleVibe(vibe)}
                activeOpacity={0.75}
              >
                <Ionicons name={cfg.icon as any} size={14} color={active ? cfg.color : Colors.textTertiary} />
                <Text style={[styles.vibeLabel, { color: active ? cfg.color : Colors.textSecondary }]}>{cfg.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results */}
      <View style={styles.resultsHeader}>
        <Text style={styles.sectionLabel}>
          {filtered.length} {filtered.length === 1 ? 'EVENTO' : 'EVENTI'}
          {selectedVibes.size > 0 ? ` · ${[...selectedVibes].length} VIBE SELEZIONATE` : ''}
        </Text>
        {selectedVibes.size > 0 && (
          <TouchableOpacity onPress={() => setSelectedVibes(new Set())}>
            <Text style={styles.clearBtn}>Rimuovi filtri</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="sad-outline" size={48} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>Nessun evento per queste vibe</Text>
          <TouchableOpacity onPress={() => setSelectedVibes(new Set())} style={styles.resetBtn}>
            <Text style={styles.resetBtnText}>Rimuovi filtri</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(e) => e.id}
          renderItem={({ item }) => <EventCard event={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },

  contextRow: { paddingHorizontal: 20, paddingVertical: 10, gap: 8, alignItems: 'center' },
  ctxPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  ctxPillActive: { backgroundColor: Colors.accentDim, borderColor: Colors.accent },
  ctxLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  ctxLabelActive: { color: Colors.accentLight },

  vibeSection: { paddingBottom: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 1, paddingHorizontal: 20, marginBottom: 8 },
  vibeRow: { paddingHorizontal: 20, gap: 8, alignItems: 'center' },
  vibeChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5 },
  vibeLabel: { fontSize: 13, fontWeight: '600' },

  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  clearBtn: { fontSize: 12, color: Colors.accent, fontWeight: '600' },

  list: { paddingBottom: 110 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  resetBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.accent, marginTop: 4 },
  resetBtnText: { color: Colors.text, fontWeight: '700', fontSize: 14 },
});
