import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Colors } from '../../constants/colors';
import { getVibeConfig, MOOD_CONFIG } from '../../constants/vibes';
import MoodBar from '../../components/MoodBar';
import LiveLayer from '../../components/LiveLayer';
import { fetchEvent, checkIn, voteMood, sendFeedback } from '../../services/api';
import type { Event, MoodValue, FeedbackType } from '../../services/api';
import {
  formatDate, formatPrice, formatTime,
  formatEnergyLabel, formatSocialLabel, formatTimeToEvent,
} from '../../utils/format';
import { useDeviceId } from '../../hooks/useDeviceId';

// ─── Negative feedback options ────────────────────────────────────────────────

const NEGATIVE_ACTIONS: { type: FeedbackType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'too_far',      label: 'Troppo lontano', icon: 'navigate-outline'     },
  { type: 'too_expensive', label: 'Troppo caro',    icon: 'card-outline'         },
  { type: 'wrong_vibe',   label: 'Vibe sbagliata', icon: 'close-circle-outline' },
  { type: 'not_for_me',   label: 'Non fa per me',  icon: 'hand-right-outline'   },
];

// ─── Meta row helper ──────────────────────────────────────────────────────────

function MetaItem({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={16} color={Colors.textTertiary} style={styles.metaIcon} />
      <Text style={styles.metaLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const userId = useDeviceId();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkedIn, setCheckedIn] = useState(false);
  const [userMood, setUserMood] = useState<MoodValue | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchEvent(id);
      setEvent(data);
    } catch {
      setError('Impossibile caricare l\'evento.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleCheckin = async () => {
    if (!event || checkedIn || actionLoading || !userId) return;
    setActionLoading(true);
    try {
      const result = await checkIn(event.id, userId);
      if (result.alreadyCheckedIn) {
        Alert.alert('Già dentro!', 'Sei già registrato a questo evento.');
        setCheckedIn(true);
      } else {
        setCheckedIn(true);
        setEvent((prev) => prev ? { ...prev, peopleCount: result.peopleCount } : prev);
      }
    } catch {
      Alert.alert('Errore', 'Check-in non riuscito. Riprova.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMoodVote = async (value: MoodValue) => {
    if (!event || actionLoading || !userId) return;
    setActionLoading(true);
    try {
      const result = await voteMood(event.id, value, userId);
      setUserMood(value);
      setEvent((prev) => prev ? { ...prev, dominantMood: result.dominantMood, moodBreakdown: result.moodBreakdown, totalVotes: result.totalVotes } : prev);
    } catch {
      Alert.alert('Errore', 'Voto non salvato. Riprova.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFeedback = async (type: FeedbackType) => {
    if (!event || !userId) return;
    try { await sendFeedback(event.id, type, userId); } catch { /* best-effort */ }
    router.back();
  };

  // ── Loading / Error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textSecondary} />
        <Text style={styles.errorText}>{error ?? 'Evento non trovato'}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Torna indietro</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const timeLabel = formatTimeToEvent(event.date, event.time);

  return (
    <>
      <Stack.Screen options={{ title: event.title }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Vibe chips */}
        <View style={styles.vibeRow}>
          {event.vibes.map((v) => {
            const cfg = getVibeConfig(v);
            return (
              <View
                key={v}
                style={[styles.vibeChip, { borderColor: cfg.color + '55', backgroundColor: cfg.color + '18' }]}
              >
                <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
                <Text style={[styles.vibeLabel, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            );
          })}
        </View>

        {/* Title */}
        <Text style={styles.title}>{event.title}</Text>

        {/* Time to event */}
        {timeLabel && (
          <View style={styles.timeBadge}>
            <Ionicons name="timer-outline" size={12} color={Colors.accentLight} />
            <Text style={styles.timeBadgeText}>{timeLabel}</Text>
          </View>
        )}

        {/* Meta grid */}
        <View style={styles.metaGrid}>
          <MetaItem icon="calendar-outline"  label={`${formatDate(event.date)} · ${formatTime(event.time)}`} />
          <MetaItem icon="location-outline"  label={event.location} />
          <MetaItem icon="cash-outline"      label={event.price !== null ? formatPrice(event.price) : 'N/D'} />
          <MetaItem icon="flash-outline"     label={`Energia ${formatEnergyLabel(event.energyScore)}`} />
          <MetaItem icon="people-outline"    label={formatSocialLabel(event.socialScore)} />
        </View>

        {/* Recommendation reason */}
        {event.recommendationReason && (
          <View style={styles.reasonBox}>
            <Ionicons
              name={event.isSurprise ? 'dice-outline' : 'bulb-outline'}
              size={16}
              color={Colors.accentLight}
            />
            <Text style={styles.reasonText}>{event.recommendationReason}</Text>
          </View>
        )}

        {/* Description */}
        {event.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Descrizione</Text>
            <Text style={styles.description}>{event.description}</Text>
          </View>
        ) : null}

        {/* Live layer */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>In questo momento</Text>
          <View style={styles.liveBox}>
            <LiveLayer
              peopleCount={event.peopleCount}
              dominantMood={event.dominantMood}
              momentumCount={event.momentumCount}
            />
          </View>
          <View style={{ marginTop: 16 }}>
            <MoodBar breakdown={event.moodBreakdown} totalVotes={event.totalVotes} />
          </View>
        </View>

        {/* CI VADO */}
        <TouchableOpacity
          style={[styles.checkinBtn, checkedIn && styles.checkinBtnDone]}
          onPress={handleCheckin}
          disabled={checkedIn || actionLoading}
          activeOpacity={0.85}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color={Colors.text} />
          ) : (
            <>
              <Ionicons
                name={checkedIn ? 'checkmark-circle' : 'rocket-outline'}
                size={20}
                color={Colors.text}
              />
              <Text style={styles.checkinBtnText}>
                {checkedIn ? 'Sei dentro!' : 'Ci vado'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Mood voting */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Com'è l'atmosfera?</Text>
          <View style={styles.moodBtns}>
            {(['fire', 'mid', 'dead'] as MoodValue[]).map((m) => {
              const cfg = MOOD_CONFIG[m];
              const isSelected = userMood === m;
              return (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.moodBtn,
                    { borderColor: cfg.color + '55', backgroundColor: isSelected ? cfg.color + '30' : Colors.surface },
                  ]}
                  onPress={() => handleMoodVote(m)}
                  activeOpacity={0.75}
                  disabled={actionLoading}
                >
                  <Ionicons name={cfg.icon as any} size={24} color={isSelected ? cfg.color : Colors.textSecondary} />
                  <Text style={[styles.moodLabel, isSelected && { color: cfg.color }]}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Negative feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Non fa per te?</Text>
          <View style={styles.negativeBtns}>
            {NEGATIVE_ACTIONS.map(({ type, label, icon }) => (
              <TouchableOpacity
                key={type}
                style={styles.negativeBtn}
                onPress={() => handleFeedback(type)}
                activeOpacity={0.75}
              >
                <Ionicons name={icon} size={14} color={Colors.textSecondary} />
                <Text style={styles.negativeBtnText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  content:     { padding: 20, paddingBottom: 60, gap: 20 },
  centered:    { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
  errorText:   { color: Colors.textSecondary, fontSize: 16, textAlign: 'center' },
  btn:         { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.accent },
  btnText:     { color: Colors.text, fontWeight: '700', fontSize: 15 },

  timeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: Colors.accentDim,
    borderWidth: 1,
    borderColor: Colors.accent + '55',
  },
  timeBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.accentLight },

  vibeRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  vibeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1 },
  vibeLabel: { fontSize: 12, fontWeight: '700' },

  title: { fontSize: 26, fontWeight: '800', color: Colors.text, lineHeight: 32 },

  metaGrid: {
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  metaItem:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  metaIcon:  { width: 22 },
  metaLabel: { fontSize: 14, color: Colors.textSecondary, flex: 1 },

  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.accentDim,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  reasonText: { fontSize: 14, color: Colors.accentLight, fontWeight: '500', fontStyle: 'italic', flex: 1 },

  section:      { gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.8 },
  description:  { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },

  liveBox: { backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.cardBorder },

  checkinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: Colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  checkinBtnDone:  { backgroundColor: Colors.success, shadowColor: Colors.success },
  checkinBtnText:  { color: Colors.text, fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },

  moodBtns: { flexDirection: 'row', gap: 10 },
  moodBtn:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  moodLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },

  negativeBtns: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  negativeBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  negativeBtnText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
});
