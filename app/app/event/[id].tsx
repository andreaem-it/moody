import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Colors } from '../../constants/colors';
import { getVibeConfig, MOOD_CONFIG } from '../../constants/vibes';
import MoodBar from '../../components/MoodBar';
import LiveLayer from '../../components/LiveLayer';
import {
  fetchEvent,
  checkIn,
  voteMood,
  sendFeedback,
} from '../../services/api';
import type { Event, MoodValue, FeedbackType } from '../../services/api';
import {
  formatDate,
  formatPrice,
  formatTime,
  formatEnergyLabel,
  formatSocialLabel,
  formatPeopleCount,
} from '../../utils/format';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

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

  useEffect(() => {
    load();
  }, [load]);

  const handleCheckin = async () => {
    if (!event || checkedIn || actionLoading) return;
    setActionLoading(true);
    try {
      const result = await checkIn(event.id);
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
    if (!event || actionLoading) return;
    setActionLoading(true);
    try {
      const result = await voteMood(event.id, value);
      setUserMood(value);
      setEvent((prev) =>
        prev
          ? {
              ...prev,
              dominantMood: result.dominantMood,
              moodBreakdown: result.moodBreakdown,
              totalVotes: result.totalVotes,
            }
          : prev,
      );
    } catch {
      Alert.alert('Errore', 'Voto non salvato. Riprova.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFeedback = async (type: FeedbackType) => {
    if (!event) return;
    try {
      await sendFeedback(event.id, type);
      router.back();
    } catch {
      router.back(); // feedback is best-effort
    }
  };

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
        <Text style={styles.errorText}>{error ?? 'Evento non trovato'}</Text>
        <TouchableOpacity style={styles.btn} onPress={() => router.back()}>
          <Text style={styles.btnText}>Torna indietro</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
                <Text style={styles.vibeEmoji}>{cfg.emoji}</Text>
                <Text style={[styles.vibeLabel, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            );
          })}
        </View>

        {/* Title */}
        <Text style={styles.title}>{event.title}</Text>

        {/* Meta */}
        <View style={styles.metaGrid}>
          <MetaItem emoji="📅" label={`${formatDate(event.date)} · ${formatTime(event.time)}`} />
          <MetaItem emoji="📍" label={event.location} />
          <MetaItem emoji="💶" label={event.price !== null ? formatPrice(event.price) : 'N/D'} />
          <MetaItem emoji="⚡" label={`Energia ${formatEnergyLabel(event.energyScore)}`} />
          <MetaItem emoji="🤝" label={formatSocialLabel(event.socialScore)} />
        </View>

        {/* Recommendation reason */}
        {event.recommendationReason && (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonEmoji}>💡</Text>
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

        {/* ── Live layer ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>In questo momento</Text>
          <View style={styles.liveBox}>
            <LiveLayer peopleCount={event.peopleCount} dominantMood={event.dominantMood} />
          </View>
          <View style={{ marginTop: 16 }}>
            <MoodBar breakdown={event.moodBreakdown} totalVotes={event.totalVotes} />
          </View>
        </View>

        {/* ── CI VADO ── */}
        <TouchableOpacity
          style={[styles.checkinBtn, checkedIn && styles.checkinBtnDone]}
          onPress={handleCheckin}
          disabled={checkedIn || actionLoading}
          activeOpacity={0.85}
        >
          {actionLoading ? (
            <ActivityIndicator size="small" color={Colors.text} />
          ) : (
            <Text style={styles.checkinBtnText}>
              {checkedIn ? '✅ Sei dentro!' : '🚀 Ci vado'}
            </Text>
          )}
        </TouchableOpacity>

        {/* ── Come ti sembra? ── */}
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
                  <Text style={styles.moodEmoji}>{cfg.emoji}</Text>
                  <Text style={[styles.moodLabel, isSelected && { color: cfg.color }]}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Feedback negativo ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Non fa per te?</Text>
          <View style={styles.negativeBtns}>
            {(
              [
                { type: 'too_far' as FeedbackType,      label: 'Troppo lontano', emoji: '📏' },
                { type: 'too_expensive' as FeedbackType, label: 'Troppo caro',    emoji: '💸' },
                { type: 'wrong_vibe' as FeedbackType,   label: 'Vibe sbagliata', emoji: '🚫' },
                { type: 'not_for_me' as FeedbackType,   label: 'Non fa per me',  emoji: '👋' },
              ] as const
            ).map(({ type, label, emoji }) => (
              <TouchableOpacity
                key={type}
                style={styles.negativeBtn}
                onPress={() => handleFeedback(type)}
                activeOpacity={0.75}
              >
                <Text style={styles.negativeBtnEmoji}>{emoji}</Text>
                <Text style={styles.negativeBtnText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </>
  );
}

function MetaItem({ emoji, label }: { emoji: string; label: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaEmoji}>{emoji}</Text>
      <Text style={styles.metaLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
    gap: 20,
  },
  centered: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  btn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.accent,
  },
  btnText: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: 15,
  },

  // Vibes
  vibeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  vibeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
  },
  vibeEmoji: { fontSize: 12 },
  vibeLabel: { fontSize: 12, fontWeight: '700' },

  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.text,
    lineHeight: 32,
  },

  // Meta grid
  metaGrid: {
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaEmoji: { fontSize: 16, width: 22 },
  metaLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    flex: 1,
  },

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
  reasonEmoji: { fontSize: 16 },
  reasonText: {
    fontSize: 14,
    color: Colors.accentLight,
    fontWeight: '500',
    fontStyle: 'italic',
    flex: 1,
  },

  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  description: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  liveBox: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },

  checkinBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  checkinBtnDone: {
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
  },
  checkinBtnText: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  moodBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  moodBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  moodEmoji: { fontSize: 22 },
  moodLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },

  negativeBtns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  negativeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  negativeBtnEmoji: { fontSize: 14 },
  negativeBtnText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
