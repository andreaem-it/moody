import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { fetchOrganizerStats } from '../../services/api';
import type { OrganizerStats, OrganizerEventStats } from '../../services/api';
import { useDeviceId } from '../../hooks/useDeviceId';

const GOLD = '#FFB800';
const GOLD_DIM = '#FFB80018';

export default function OrganizerDashboard() {
  const insets = useSafeAreaInsets();
  const userId = useDeviceId();

  const [data,       setData]       = useState<OrganizerStats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (!userId) return;
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const stats = await fetchOrganizerStats(userId);
      setData(stats);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        router.replace('/organizer/register');
      } else {
        setError('Impossibile caricare la dashboard. Controlla la connessione.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centered}>
        <Ionicons name="wifi-outline" size={40} color={Colors.textTertiary} />
        <Text style={styles.errorText}>{error ?? 'Errore sconosciuto'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => load()} activeOpacity={0.8}>
          <Text style={styles.retryText}>Riprova</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { organizer, events, totals } = data;
  const quotaRemaining = organizer.quotaTotal - organizer.quotaUsed;
  const quotaRatio     = organizer.quotaTotal > 0 ? organizer.quotaUsed / organizer.quotaTotal : 0;
  const quotaLow       = quotaRemaining <= 10;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
    >
      {/* ── Header organizer ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.venueBadge}>
            <Ionicons name="storefront" size={20} color={GOLD} />
          </View>
          <View>
            <Text style={styles.venueName}>{organizer.venueName}</Text>
            <View style={styles.planRow}>
              <Ionicons name="star" size={11} color={GOLD} />
              <Text style={styles.planLabel}>Moody+ Free</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.publishBtn}
          onPress={() => router.push('/upload')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color={Colors.background} />
          <Text style={styles.publishBtnText}>Pubblica</Text>
        </TouchableOpacity>
      </View>

      {/* ── Quota bar ── */}
      <View style={[styles.quotaCard, quotaLow && styles.quotaCardLow]}>
        <View style={styles.quotaTop}>
          <View>
            <Text style={styles.quotaTitle}>Submission usate</Text>
            <Text style={[styles.quotaCount, quotaLow && { color: Colors.danger }]}>
              {organizer.quotaUsed} / {organizer.quotaTotal}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.buyBtn}
            onPress={() => router.push('/organizer/packages')}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle-outline" size={14} color={GOLD} />
            <Text style={styles.buyBtnText}>Aggiungi</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.quotaBarBg}>
          <View style={[styles.quotaBarFill, { width: `${Math.min(quotaRatio * 100, 100)}%` as any, backgroundColor: quotaLow ? Colors.danger : GOLD }]} />
        </View>
        {quotaLow && (
          <Text style={styles.quotaWarning}>
            <Ionicons name="warning-outline" size={12} /> Solo {quotaRemaining} submission rimanenti
          </Text>
        )}
      </View>

      {/* ── Totali ── */}
      <View style={styles.totalsRow}>
        <TotalBlock icon="heart"            color={Colors.like}    value={totals.likes}    label="Piaciuti"  />
        <TotalBlock icon="close-circle"     color={Colors.skip}    value={totals.skips}    label="Saltati"   />
        <TotalBlock icon="checkmark-circle" color={Colors.success} value={totals.checkins} label="Check-in"  />
        <TotalBlock
          icon="trending-up"
          color={Colors.vibe.music}
          value={totals.conversion !== null ? totals.conversion : '—'}
          label="Conv. %"
          suffix={totals.conversion !== null ? '%' : ''}
        />
      </View>

      {/* ── Lista eventi ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>I TUOI EVENTI ({events.length})</Text>
        {events.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={32} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Nessun evento pubblicato</Text>
            <Text style={styles.emptyText}>Pubblica il tuo primo evento per iniziare a raccogliere dati.</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/upload')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={16} color={Colors.background} />
              <Text style={styles.emptyBtnText}>Pubblica ora</Text>
            </TouchableOpacity>
          </View>
        ) : (
          events.map((event) => <EventRow key={event.id} event={event} />)
        )}
      </View>
    </ScrollView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TotalBlock({
  icon, color, value, label, suffix = '',
}: { icon: any; color: string; value: number | string; label: string; suffix?: string }) {
  return (
    <View style={[tbStyles.block, { borderColor: color + '33' }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={[tbStyles.value, { color }]}>{value}{suffix}</Text>
      <Text style={tbStyles.label}>{label}</Text>
    </View>
  );
}
const tbStyles = StyleSheet.create({
  block: { flex: 1, alignItems: 'center', gap: 3, paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.card, borderWidth: 1 },
  value: { fontSize: 18, fontWeight: '800' },
  label: { fontSize: 10, color: Colors.textTertiary },
});

function EventRow({ event }: { event: OrganizerEventStats }) {
  const [expanded, setExpanded] = useState(false);
  const { stats } = event;
  const total = stats.likes + stats.skips;

  return (
    <Pressable style={erStyles.card} onPress={() => setExpanded((v) => !v)}>
      <View style={erStyles.top}>
        <View style={erStyles.topLeft}>
          <Text style={erStyles.title} numberOfLines={1}>{event.title}</Text>
          <View style={erStyles.meta}>
            <Ionicons name="calendar-outline" size={11} color={Colors.textTertiary} />
            <Text style={erStyles.metaText}>{event.date}</Text>
            {event.location ? (
              <>
                <Text style={erStyles.metaDot}>·</Text>
                <Ionicons name="location-outline" size={11} color={Colors.textTertiary} />
                <Text style={erStyles.metaText} numberOfLines={1}>{event.location}</Text>
              </>
            ) : null}
          </View>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textTertiary} />
      </View>

      {/* Stats rapide sempre visibili */}
      <View style={erStyles.quickStats}>
        <QuickStat icon="heart"            color={Colors.like}    value={stats.likes}    />
        <QuickStat icon="close-circle"     color={Colors.skip}    value={stats.skips}    />
        <QuickStat icon="checkmark-circle" color={Colors.success} value={stats.checkins} />
        {stats.conversion !== null && (
          <View style={erStyles.convBadge}>
            <Text style={erStyles.convText}>{stats.conversion}% conv.</Text>
          </View>
        )}
      </View>

      {/* Dettaglio espanso */}
      {expanded && (
        <View style={erStyles.details}>
          <View style={erStyles.detailRow}>
            <Ionicons name="heart" size={14} color={Colors.like} />
            <Text style={erStyles.detailLabel}>Mi piace</Text>
            <Text style={erStyles.detailValue}>{stats.likes}</Text>
          </View>
          <View style={erStyles.detailRow}>
            <Ionicons name="close-circle" size={14} color={Colors.skip} />
            <Text style={erStyles.detailLabel}>Saltati</Text>
            <Text style={erStyles.detailValue}>{stats.skips}</Text>
          </View>
          <View style={erStyles.detailRow}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={erStyles.detailLabel}>Check-in</Text>
            <Text style={erStyles.detailValue}>{stats.checkins}</Text>
          </View>
          <View style={erStyles.detailRow}>
            <Ionicons name="swap-horizontal" size={14} color={Colors.vibe.music} />
            <Text style={erStyles.detailLabel}>Visualizzazioni feed</Text>
            <Text style={erStyles.detailValue}>{total}</Text>
          </View>
          {stats.conversion !== null && (
            <View style={erStyles.detailRow}>
              <Ionicons name="trending-up" size={14} color={Colors.vibe.music} />
              <Text style={erStyles.detailLabel}>Conversion rate</Text>
              <Text style={[erStyles.detailValue, { color: Colors.vibe.music }]}>{stats.conversion}%</Text>
            </View>
          )}
          {/* Barra like/skip */}
          {total > 0 && (
            <View style={erStyles.likeBar}>
              <View style={[erStyles.likeBarFill, { flex: stats.likes }]} />
              <View style={[erStyles.skipBarFill, { flex: stats.skips }]} />
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

function QuickStat({ icon, color, value }: { icon: any; color: string; value: number }) {
  return (
    <View style={erStyles.quickStat}>
      <Ionicons name={icon} size={12} color={color} />
      <Text style={[erStyles.quickStatVal, { color }]}>{value}</Text>
    </View>
  );
}

const erStyles = StyleSheet.create({
  card:       { backgroundColor: Colors.card, borderRadius: 14, padding: 14, gap: 10, borderWidth: 1, borderColor: Colors.border },
  top:        { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  topLeft:    { flex: 1, gap: 4 },
  title:      { fontSize: 15, fontWeight: '700', color: Colors.text },
  meta:       { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap' },
  metaText:   { fontSize: 11, color: Colors.textTertiary, flexShrink: 1 },
  metaDot:    { color: Colors.textTertiary, fontSize: 11 },

  quickStats: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  quickStat:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  quickStatVal:{ fontSize: 13, fontWeight: '700' },
  convBadge:  { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99, backgroundColor: Colors.vibe.music + '22' },
  convText:   { fontSize: 11, fontWeight: '700', color: Colors.vibe.music },

  details:      { gap: 8, paddingTop: 4, borderTopWidth: 1, borderTopColor: Colors.border },
  detailRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel:  { flex: 1, fontSize: 13, color: Colors.textSecondary },
  detailValue:  { fontSize: 13, fontWeight: '700', color: Colors.text },
  likeBar:      { height: 6, borderRadius: 3, overflow: 'hidden', flexDirection: 'row', marginTop: 4 },
  likeBarFill:  { backgroundColor: Colors.like },
  skipBarFill:  { backgroundColor: Colors.border },
});

// ─── Main styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: 16, gap: 16 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },

  errorText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center' },
  retryBtn:  { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.border },
  retryText: { color: Colors.text, fontWeight: '700' },

  header:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerLeft:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  venueBadge:  { width: 44, height: 44, borderRadius: 22, backgroundColor: GOLD_DIM, borderWidth: 1.5, borderColor: GOLD + '55', alignItems: 'center', justifyContent: 'center' },
  venueName:   { fontSize: 17, fontWeight: '800', color: Colors.text },
  planRow:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  planLabel:   { fontSize: 12, fontWeight: '700', color: GOLD },
  publishBtn:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, backgroundColor: GOLD },
  publishBtnText: { fontSize: 14, fontWeight: '800', color: Colors.background },

  quotaCard:    { backgroundColor: Colors.card, borderRadius: 14, padding: 16, gap: 12, borderWidth: 1, borderColor: GOLD + '33' },
  quotaCardLow: { borderColor: Colors.danger + '55' },
  quotaTop:     { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  quotaTitle:   { fontSize: 11, fontWeight: '600', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  quotaCount:   { fontSize: 24, fontWeight: '900', color: GOLD, marginTop: 2 },
  buyBtn:       { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, backgroundColor: GOLD_DIM, borderWidth: 1, borderColor: GOLD + '44' },
  buyBtnText:   { fontSize: 13, fontWeight: '700', color: GOLD },
  quotaBarBg:   { height: 6, borderRadius: 3, backgroundColor: Colors.border, overflow: 'hidden' },
  quotaBarFill: { height: 6, borderRadius: 3 },
  quotaWarning: { fontSize: 12, color: Colors.danger, fontWeight: '600' },

  totalsRow: { flexDirection: 'row', gap: 8 },

  section:       { gap: 10 },
  sectionTitle:  { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 1 },

  emptyCard:    { backgroundColor: Colors.card, borderRadius: 16, padding: 32, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.border },
  emptyTitle:   { fontSize: 16, fontWeight: '700', color: Colors.text },
  emptyText:    { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  emptyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, backgroundColor: GOLD, marginTop: 4 },
  emptyBtnText: { fontSize: 14, fontWeight: '800', color: Colors.background },
});
