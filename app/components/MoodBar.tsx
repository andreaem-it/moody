import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import { MOOD_CONFIG } from '../constants/vibes';
import type { MoodBreakdown } from '../services/api';

interface Props {
  breakdown: MoodBreakdown;
  totalVotes: number;
}

export default function MoodBar({ breakdown, totalVotes }: Props) {
  if (!totalVotes) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Nessun voto ancora — sii il primo!</Text>
      </View>
    );
  }

  const entries = [
    { key: 'fire' as const, pct: breakdown.fire },
    { key: 'mid'  as const, pct: breakdown.mid  },
    { key: 'dead' as const, pct: breakdown.dead  },
  ];

  return (
    <View style={styles.wrapper}>
      {/* Stacked bar */}
      <View style={styles.bar}>
        {entries.map(({ key, pct }) =>
          pct > 0 ? (
            <View
              key={key}
              style={[styles.segment, { flex: pct, backgroundColor: MOOD_CONFIG[key].color }]}
            />
          ) : null
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {entries.map(({ key, pct }) => (
          <View key={key} style={styles.legendItem}>
            <Text style={styles.emoji}>{MOOD_CONFIG[key].emoji}</Text>
            <Text style={[styles.pct, { color: MOOD_CONFIG[key].color }]}>{pct}%</Text>
            <Text style={styles.label}>{MOOD_CONFIG[key].label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.totalText}>{totalVotes} {totalVotes === 1 ? 'voto' : 'voti'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  bar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 99,
    overflow: 'hidden',
    backgroundColor: Colors.cardBorder,
  },
  segment: {
    borderRadius: 99,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    alignItems: 'center',
    gap: 2,
  },
  emoji: {
    fontSize: 16,
  },
  pct: {
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  empty: {
    paddingVertical: 8,
  },
  emptyText: {
    color: Colors.textTertiary,
    fontSize: 13,
    fontStyle: 'italic',
  },
  totalText: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'right',
  },
});
