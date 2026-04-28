import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';
import type { ContextMode } from '../services/api';

interface Props {
  active: ContextMode;
  onChange: (mode: ContextMode) => void;
}

const OPTIONS: { key: ContextMode; label: string; emoji: string }[] = [
  { key: 'tonight',     label: 'Stasera',     emoji: '🌙' },
  { key: 'weekend',     label: 'Weekend',     emoji: '☀️' },
  { key: 'last-minute', label: 'Last minute', emoji: '⚡' },
];

export default function ContextSelector({ active, onChange }: Props) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const isActive = active === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.pill, isActive && styles.pillActive]}
            activeOpacity={0.75}
          >
            <Text style={styles.emoji}>{opt.emoji}</Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  pillActive: {
    backgroundColor: Colors.accentDim,
    borderColor: Colors.accent,
  },
  emoji: {
    fontSize: 13,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  labelActive: {
    color: Colors.accentLight,
  },
});
