import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';
import ContextSelector from '../components/ContextSelector';
import EventCard from '../components/EventCard';
import { fetchFeed } from '../services/api';
import type { Event, ContextMode, FeedbackType } from '../services/api';

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [context, setContext] = useState<ContextMode>('tonight');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track dismissed cards (liked/skipped)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const loadFeed = useCallback(async (ctx: ContextMode, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await fetchFeed(ctx);
      setEvents(data);
      setDismissed(new Set()); // reset on reload
    } catch {
      setError('Impossibile caricare il feed. Assicurati che il backend sia in esecuzione.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFeed(context);
  }, [context, loadFeed]);

  const handleContextChange = (mode: ContextMode) => {
    setContext(mode);
  };

  const handleFeedback = (eventId: string, type: FeedbackType) => {
    if (type === 'like' || type === 'skip') {
      setDismissed((prev) => new Set([...prev, eventId]));
    }
  };

  const visibleEvents = events.filter((e) => !dismissed.has(e.id));

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
          <Text style={styles.addBtnText}>＋</Text>
        </TouchableOpacity>
      </View>

      {/* Context selector */}
      <ContextSelector active={context} onChange={handleContextChange} />

      {/* Feed */}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Costruendo il tuo feed…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorEmoji}>📡</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadFeed(context)}>
            <Text style={styles.retryBtnText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={visibleEvents}
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
              <Text style={styles.emptyEmoji}>🔍</Text>
              <Text style={styles.emptyTitle}>Nessun evento trovato</Text>
              <Text style={styles.emptyBody}>
                {context === 'last-minute'
                  ? 'Nessun evento nelle prossime 4 ore.'
                  : context === 'weekend'
                  ? 'Nessun evento per questo weekend.'
                  : 'Nessun evento per stasera.'}
              </Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => router.push('/upload')}
              >
                <Text style={styles.retryBtnText}>Aggiungi un evento</Text>
              </TouchableOpacity>
            </View>
          }
          ListFooterComponent={
            visibleEvents.length > 0 ? (
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  {visibleEvents.length} {visibleEvents.length === 1 ? 'evento' : 'eventi'} selezionati per te
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
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
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
  addBtnText: {
    fontSize: 22,
    color: Colors.text,
    fontWeight: '300',
    lineHeight: 26,
  },
  list: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  loadingText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  errorEmoji: {
    fontSize: 48,
  },
  errorText: {
    color: Colors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.accent,
  },
  retryBtnText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 10,
  },
  emptyEmoji: { fontSize: 52 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyBody: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 28,
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: Colors.textTertiary,
    fontWeight: '600',
  },
  footerHint: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
});
