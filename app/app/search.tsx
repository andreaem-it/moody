import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator,
  TouchableOpacity, Pressable, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { searchEvents } from '../services/api';
import type { Event } from '../services/api';
import { formatDate, formatTime } from '../utils/format';
import { getVibeConfig } from '../constants/vibes';

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router  = useRouter();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [results, setResults] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 380);
    return () => clearTimeout(t);
  }, [query]);

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await searchEvents(q);
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { runSearch(debounced); }, [debounced, runSearch]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.searchBar}>
        <Ionicons name="search-outline" size={18} color={Colors.textTertiary} />
        <TextInput
          style={styles.input}
          placeholder="Cerca per nome, luogo o vibe…"
          placeholderTextColor={Colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { setQuery(''); Keyboard.dismiss(); }}>
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {debounced.length < 2 ? (
        <View style={styles.empty}>
          <Ionicons name="sparkles-outline" size={40} color={Colors.textTertiary} />
          <Text style={styles.emptyTitle}>Trova il tuo prossimo evento</Text>
          <Text style={styles.emptySub}>Digita almeno 2 caratteri · es. jazz, centro, concerto</Text>
        </View>
      ) : loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>Nessun risultato</Text>
              <Text style={styles.emptySub}>Prova altre parole o controlla l&apos;ortografia</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/event/${item.id}`)}>
              <View style={styles.rowTop}>
                <Text style={styles.rowTitle} numberOfLines={2}>{item.title}</Text>
              </View>
              <Text style={styles.rowMeta}>{formatDate(item.date)} · {formatTime(item.time)} · {item.location}</Text>
              <View style={styles.vibeRow}>
                {item.vibes.slice(0, 4).map((v) => {
                  const c = getVibeConfig(v);
                  return (
                    <View key={v} style={[styles.vibeChip, { borderColor: c.color + '55', backgroundColor: c.color + '15' }]}>
                      <Text style={[styles.vibeTxt, { color: c.color }]}>{c.label}</Text>
                    </View>
                  );
                })}
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 8, marginTop: 8,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
  },
  input: { flex: 1, fontSize: 16, color: Colors.text },
  list:      { paddingBottom: 100, gap: 10 },
  row:       { marginHorizontal: 20, padding: 16, borderRadius: 16, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.cardBorder },
  rowTop:    { marginBottom: 6 },
  rowTitle:  { fontSize: 16, fontWeight: '700', color: Colors.text },
  rowMeta:   { fontSize: 13, color: Colors.textSecondary },
  vibeRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  vibeChip:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, borderWidth: 1 },
  vibeTxt:   { fontSize: 11, fontWeight: '700' },
  centered:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty:     { alignItems: 'center', paddingTop: 60, paddingHorizontal: 36, gap: 8 },
  emptyTitle:{ fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  emptySub:  { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
