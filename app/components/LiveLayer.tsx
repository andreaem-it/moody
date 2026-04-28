import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { MOOD_CONFIG } from '../constants/vibes';
import type { MoodValue } from '../services/api';

interface Props {
  peopleCount: number;
  dominantMood: MoodValue | null;
  compact?: boolean;
}

export default function LiveLayer({ peopleCount, dominantMood, compact = false }: Props) {
  const moodCfg = dominantMood ? MOOD_CONFIG[dominantMood] : null;

  if (compact) {
    return (
      <View style={styles.row}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>👥 {peopleCount}</Text>
        </View>
        {moodCfg && (
          <View style={[styles.badge, { backgroundColor: moodCfg.bg ?? Colors.card }]}>
            <Text style={[styles.badgeText, { color: moodCfg.color }]}>
              {moodCfg.emoji} {moodCfg.label}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.fullRow}>
      <View style={styles.statBlock}>
        <Text style={styles.statNumber}>{peopleCount}</Text>
        <Text style={styles.statLabel}>persone</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.statBlock}>
        {moodCfg ? (
          <>
            <Text style={[styles.statMoodEmoji]}>{moodCfg.emoji}</Text>
            <Text style={[styles.statLabel, { color: moodCfg.color }]}>{moodCfg.label}</Text>
          </>
        ) : (
          <>
            <Text style={styles.statNumber}>–</Text>
            <Text style={styles.statLabel}>nessun voto</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: Colors.card,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  fullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  statBlock: {
    alignItems: 'center',
    gap: 2,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  statMoodEmoji: {
    fontSize: 24,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
});
