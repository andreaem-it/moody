import React, { useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';
import { getVibeConfig } from '../constants/vibes';
import LiveLayer from './LiveLayer';
import { formatDate, formatPrice, formatTime } from '../utils/format';
import type { Event, FeedbackType } from '../services/api';
import { sendFeedback } from '../services/api';

interface Props {
  event: Event;
  onFeedback?: (eventId: string, type: FeedbackType) => void;
}

export default function EventCard({ event, onFeedback }: Props) {
  const router = useRouter();

  const handleFeedback = useCallback(
    async (type: FeedbackType) => {
      try {
        await sendFeedback(event.id, type);
        onFeedback?.(event.id, type);
      } catch {
        // Silent: UI should still respond
        onFeedback?.(event.id, type);
      }
    },
    [event.id, onFeedback],
  );

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => router.push(`/event/${event.id}`)}
    >
      {/* Vibe chips */}
      <View style={styles.vibeRow}>
        {event.vibes.slice(0, 3).map((v) => {
          const cfg = getVibeConfig(v);
          return (
            <View key={v} style={[styles.vibeChip, { borderColor: cfg.color + '55', backgroundColor: cfg.color + '18' }]}>
              <Text style={styles.vibeEmoji}>{cfg.emoji}</Text>
              <Text style={[styles.vibeLabel, { color: cfg.color }]}>{cfg.label}</Text>
            </View>
          );
        })}
        {event.price !== null && event.price !== undefined && (
          <View style={styles.priceChip}>
            <Text style={styles.priceText}>{formatPrice(event.price)}</Text>
          </View>
        )}
      </View>

      {/* Title */}
      <Text style={styles.title} numberOfLines={2}>{event.title}</Text>

      {/* Meta row */}
      <View style={styles.metaRow}>
        <Text style={styles.metaText}>🕐 {formatTime(event.time)}</Text>
        <Text style={styles.metaDot}>·</Text>
        <Text style={styles.metaText} numberOfLines={1}>📍 {event.location}</Text>
      </View>

      {/* Date */}
      <Text style={styles.dateText}>{formatDate(event.date)}</Text>

      {/* Live Layer */}
      <View style={styles.liveRow}>
        <LiveLayer peopleCount={event.peopleCount} dominantMood={event.dominantMood} compact />
      </View>

      {/* Separator */}
      <View style={styles.separator} />

      {/* Recommendation reason */}
      {event.recommendationReason && (
        <View style={styles.reasonRow}>
          <Text style={styles.reasonIcon}>💡</Text>
          <Text style={styles.reasonText}>{event.recommendationReason}</Text>
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.skipBtn]}
          onPress={() => handleFeedback('skip')}
          activeOpacity={0.75}
        >
          <Text style={styles.skipBtnText}>Salta</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.likeBtn]}
          onPress={() => handleFeedback('like')}
          activeOpacity={0.75}
        >
          <Text style={styles.likeBtnText}>❤️ Mi piace</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 18,
    gap: 10,
    marginHorizontal: 20,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  vibeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center',
  },
  vibeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  vibeEmoji: { fontSize: 11 },
  vibeLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.2 },
  priceChip: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: Colors.accentDim,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accentLight,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flexShrink: 1,
  },
  metaDot: {
    color: Colors.textTertiary,
    fontSize: 13,
  },
  dateText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  liveRow: {
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginVertical: 2,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reasonIcon: { fontSize: 13 },
  reasonText: {
    fontSize: 13,
    color: Colors.accentLight,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skipBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  likeBtn: {
    backgroundColor: Colors.like + '22',
    borderWidth: 1,
    borderColor: Colors.like + '55',
    flex: 1.5,
  },
  likeBtnText: {
    color: Colors.like,
    fontSize: 14,
    fontWeight: '700',
  },
});
