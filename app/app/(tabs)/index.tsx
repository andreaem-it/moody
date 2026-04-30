import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/colors';
import ContextSelector from '../../components/ContextSelector';
import EventCard from '../../components/EventCard';
import { fetchFeed } from '../../services/api';
import type { Event, ContextMode, FeedbackType } from '../../services/api';
import { useDeviceId } from '../../hooks/useDeviceId';

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const userId = useDeviceId();

  const [context, setContext] = useState<ContextMode>('tonight');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shownIdsRef = useRef<Set<string>>(new Set());

  const loadFeed = useCallback(async (ctx: ContextMode, isRefresh = false) => {
    if (!userId) return;
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await fetchFeed(ctx, userId);
      setEvents(data);
      shownIdsRef.current = new Set(data.map((e) => e.id));
    } catch {
      setError('Controlla la tua connessione internet e riprova.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  // Avvia il caricamento quando userId è pronto
  useEffect(() => {
    loadFeed(context);
  }, [context, loadFeed]);

  // Timeout di sicurezza: se userId non arriva entro 10s, esci dal loading
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      if (!userId) {
        setLoading(false);
        setError('Controlla la tua connessione internet e riprova.');
      }
    }, 10_000);
    return () => clearTimeout(timer);
  }, [loading, userId]);

  /**
   * Soft update: remove the card immediately, then silently fetch
   * one replacement event that wasn't already shown.
   */
  const handleFeedback = useCallback(async (eventId: string, type: FeedbackType) => {
    if (type !== 'like' && type !== 'skip') return;
    if (!userId) return;

    setEvents((prev) => prev.filter((e) => e.id !== eventId));
    shownIdsRef.current.add(eventId);

    try {
      const freshFeed = await fetchFeed(context, userId);
      const replacement = freshFeed.find((e) => !shownIdsRef.current.has(e.id));
      if (replacement) {
        shownIdsRef.current.add(replacement.id);
        setEvents((prev) => [...prev, replacement]);
      }
    } catch {
      // Not critical — list just stays shorter
    }
  }, [context, userId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadFeed(context, true);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>Moody</Text>
          <Text style={styles.subtitle}>Cosa fare stasera?</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push('/upload')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Context selector */}
      <ContextSelector active={context} onChange={setContext} />

      {/* Feed */}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Costruendo il tuo feed…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={52} color={Colors.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadFeed(context)}>
            <Text style={styles.retryBtnText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <EventCard event={item} onFeedback={handleFeedback} />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={52} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>Nessun evento trovato</Text>
              <Text style={styles.emptyBody}>
                {context === 'last-minute'
                  ? 'Nessun evento nelle prossime 4 ore.'
                  : context === 'weekend'
                  ? 'Nessun evento per questo weekend.'
                  : 'Nessun evento per stasera.'}
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => router.push('/upload')}>
                <Text style={styles.retryBtnText}>Aggiungi un evento</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            events.length > 0 ? (
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {events.length} {events.length === 1 ? 'evento' : 'eventi'} selezionati per te
                </Text>
                <Text style={styles.footerHint}>Scorri su per ricaricare</Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  logo: { fontSize: 32, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  list: { paddingTop: 16, paddingBottom: 110 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 32 },
  loadingText: { color: Colors.textSecondary, fontSize: 15 },
  errorText: { color: Colors.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
  retryBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.accent },
  retryBtnText: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  emptyBody: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  footer: { alignItems: 'center', paddingVertical: 28, gap: 6 },
  footerText: { fontSize: 13, color: Colors.textTertiary, fontWeight: '600' },
  footerHint: { fontSize: 12, color: Colors.textTertiary },
});
