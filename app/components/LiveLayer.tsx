import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';
import { MOOD_CONFIG } from '../constants/vibes';
import type { MoodValue } from '../services/api';

interface Props {
  peopleCount: number;
  dominantMood: MoodValue | null;
  momentumCount?: number;
  compact?: boolean;
}

export default function LiveLayer({ peopleCount, dominantMood, momentumCount, compact = false }: Props) {
  const moodCfg = dominantMood ? MOOD_CONFIG[dominantMood] : null;
  const hasMomentum = typeof momentumCount === 'number' && momentumCount > 0;

  if (compact) {
    return (
      <View style={styles.row}>
        <View style={styles.badge}>
          <Ionicons name="people-outline" size={12} color={Colors.textSecondary} />
          <Text style={styles.badgeText}>{peopleCount}</Text>
          {hasMomentum && (
            <Text style={styles.momentum}>+{momentumCount}</Text>
          )}
        </View>
        {moodCfg && (
          <View style={[styles.badge, { backgroundColor: moodCfg.bg ?? Colors.card }]}>
            <Ionicons name={moodCfg.icon as any} size={12} color={moodCfg.color} />
            <Text style={[styles.badgeText, { color: moodCfg.color }]}>{moodCfg.label}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.fullRow}>
      <View style={styles.statBlock}>
        <View style={styles.statNumberRow}>
          <Text style={styles.statNumber}>{peopleCount}</Text>
          {hasMomentum && (
            <View style={styles.momentumBadge}>
              <Ionicons name="trending-up-outline" size={11} color={Colors.success} />
              <Text style={styles.momentumFull}>+{momentumCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.statLabel}>persone</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.statBlock}>
        {moodCfg ? (
          <>
            <Ionicons name={moodCfg.icon as any} size={26} color={moodCfg.color} />
            <Text style={[styles.statLabel, { color: moodCfg.color }]}>{moodCfg.label}</Text>
          </>
        ) : (
          <>
            <Ionicons name="help-circle-outline" size={26} color={Colors.textTertiary} />
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
  momentum: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '700',
  },
  fullRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  statBlock: {
    alignItems: 'center',
    gap: 4,
  },
  statNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  momentumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  momentumFull: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '700',
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
