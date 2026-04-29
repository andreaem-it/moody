import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { getVibeConfig, MOOD_CONFIG } from '../../constants/vibes';
import { fetchActivity } from '../../services/api';
import type { ActivityEvent, UserActivity } from '../../services/api';
import { useDeviceId } from '../../hooks/useDeviceId';
import { formatDate, formatTime, formatPrice } from '../../utils/format';

export default function VaiScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const userId = useDeviceId();

  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!userId) return;
    if (!isRefresh) setLoading(true);
    try {
      const data = await fetchActivity(userId);
      setActivity(data);
    } catch {
      setActivity({ events: [], stats: { likedCount: 0, checkinCount: 0, moodVoteCount: 0 } });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = () => { setRefreshing(true); load(true); };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const stats = activity?.stats ?? { likedCount: 0, checkinCount: 0, moodVoteCount: 0 };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Vai</Text>
        <Text style={styles.subtitle}>I tuoi eventi selezionati</Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <StatBadge icon="heart" color={Colors.like} value={stats.likedCount} label="Piaciuti" />
        <StatBadge icon="checkmark-circle" color={Colors.success} value={stats.checkinCount} label="Check-in" />
        <StatBadge icon="happy" color={Colors.fire} value={stats.moodVoteCount} label="Voti mood" />
      </View>

      <FlatList
        data={activity?.events ?? []}
        keyExtractor={(e) => e.id}
        renderItem={({ item }) => <VaiCard event={item} onPress={() => router.push(`/event/${item.id}`)} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.accent} />}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Ionicons name="bookmark-outline" size={52} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Nessun evento ancora</Text>
            <Text style={styles.emptyBody}>Metti "Mi piace" o fai check-in per trovarli qui</Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Stat badge ───────────────────────────────────────────────────────────────

function StatBadge({ icon, color, value, label }: { icon: any; color: string; value: number; label: string }) {
  return (
    <View style={[statStyles.badge, { borderColor: color + '33' }]}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  badge: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
  },
  value: { fontSize: 20, fontWeight: '800' },
  label: { fontSize: 11, color: Colors.textTertiary, fontWeight: '500' },
});

// ─── Vai card ─────────────────────────────────────────────────────────────────

function VaiCard({ event, onPress }: { event: ActivityEvent; onPress: () => void }) {
  const dominantMoodCfg = event.dominantMood ? MOOD_CONFIG[event.dominantMood] : null;

  return (
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Status badges */}
      <View style={cardStyles.statusRow}>
        {event.isCheckedIn && (
          <View style={[cardStyles.badge, { backgroundColor: Colors.success + '20', borderColor: Colors.success + '55' }]}>
            <Ionicons name="checkmark-circle" size={12} color={Colors.success} />
            <Text style={[cardStyles.badgeText, { color: Colors.success }]}>Check-in</Text>
          </View>
        )}
        {event.isLiked && !event.isCheckedIn && (
          <View style={[cardStyles.badge, { backgroundColor: Colors.like + '20', borderColor: Colors.like + '55' }]}>
            <Ionicons name="heart" size={12} color={Colors.like} />
            <Text style={[cardStyles.badgeText, { color: Colors.like }]}>Piaciuto</Text>
          </View>
        )}
        {dominantMoodCfg && (
          <View style={[cardStyles.badge, { backgroundColor: dominantMoodCfg.bg, borderColor: dominantMoodCfg.color + '55' }]}>
            <Ionicons name={dominantMoodCfg.icon as any} size={12} color={dominantMoodCfg.color} />
            <Text style={[cardStyles.badgeText, { color: dominantMoodCfg.color }]}>{dominantMoodCfg.label}</Text>
          </View>
        )}
        <View style={cardStyles.spacer} />
        {event.price !== null && (
          <Text style={cardStyles.price}>{formatPrice(event.price)}</Text>
        )}
      </View>

      <Text style={cardStyles.title} numberOfLines={2}>{event.title}</Text>

      <View style={cardStyles.metaRow}>
        <Ionicons name="calendar-outline" size={12} color={Colors.textTertiary} />
        <Text style={cardStyles.meta}>{formatDate(event.date)}</Text>
        <Text style={cardStyles.dot}>·</Text>
        <Ionicons name="time-outline" size={12} color={Colors.textTertiary} />
        <Text style={cardStyles.meta}>{formatTime(event.time)}</Text>
      </View>
      <View style={cardStyles.metaRow}>
        <Ionicons name="location-outline" size={12} color={Colors.textTertiary} />
        <Text style={cardStyles.meta} numberOfLines={1}>{event.location}</Text>
      </View>

      {/* Vibe chips */}
      <View style={cardStyles.vibeRow}>
        {event.vibes.slice(0, 3).map((v) => {
          const cfg = getVibeConfig(v);
          return (
            <View key={v} style={[cardStyles.vibeChip, { borderColor: cfg.color + '44', backgroundColor: cfg.color + '15' }]}>
              <Ionicons name={cfg.icon as any} size={10} color={cfg.color} />
              <Text style={[cardStyles.vibeLabel, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          );
        })}
        <View style={cardStyles.spacer} />
        <View style={cardStyles.peopleRow}>
          <Ionicons name="people-outline" size={12} color={Colors.textTertiary} />
          <Text style={cardStyles.meta}>{event.peopleCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: { marginHorizontal: 20, backgroundColor: Colors.card, borderRadius: 18, padding: 16, gap: 9, borderWidth: 1, borderColor: Colors.cardBorder },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 99, borderWidth: 1 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  spacer: { flex: 1 },
  price: { fontSize: 13, fontWeight: '700', color: Colors.accentLight },
  title: { fontSize: 17, fontWeight: '700', color: Colors.text, lineHeight: 22 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { fontSize: 12, color: Colors.textSecondary, flexShrink: 1 },
  dot: { color: Colors.textTertiary, fontSize: 12 },
  vibeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  vibeChip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
  vibeLabel: { fontSize: 10, fontWeight: '700' },
  peopleRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12, gap: 10 },
  list: { paddingTop: 4, paddingBottom: 110 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  emptyBody: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
