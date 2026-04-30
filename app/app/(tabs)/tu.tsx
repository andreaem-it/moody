import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, Share, Image, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { VIBES } from '../../constants/vibes';
import { fetchProfile, fetchActivity, updateProfileMeta } from '../../services/api';
import type { UserProfile, UserActivity } from '../../services/api';
import { useDeviceId } from '../../hooks/useDeviceId';
import { formatHandle, formatFriendCode } from '../../utils/format';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Risolve URL relativi (legacy locale) e URL assoluti (Firebase Storage). */
function resolveMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${BASE_URL}${url}`;
}

type BudgetLevel = 'low' | 'medium' | 'high';
const BUDGET_LABELS: Record<BudgetLevel, { label: string; icon: keyof typeof Ionicons.glyphMap }> = {
  low:    { label: 'Basso',   icon: 'wallet-outline'  },
  medium: { label: 'Medio',   icon: 'card-outline'    },
  high:   { label: 'Alto',    icon: 'diamond-outline' },
};

export default function TuScreen() {
  const insets = useSafeAreaInsets();
  const userId = useDeviceId();

  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [loading, setLoading]   = useState(true);

  // Editing state
  const [showNameModal, setShowNameModal] = useState(false);
  const [pendingName, setPendingName]     = useState('');
  const [savingName, setSavingName]       = useState(false);
  const [savingAvatar, setSavingAvatar]   = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const [p, a] = await Promise.all([fetchProfile(userId), fetchActivity(userId)]);
      setProfile(p);
      setActivity(a);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handle     = userId ? formatHandle(userId)     : '@moody_…';
  const friendCode = userId ? formatFriendCode(userId) : '—';

  // ── Avatar picker ────────────────────────────────────────────────────────────

  const pickAvatar = () => {
    Alert.alert(
      'Foto profilo',
      '',
      [
        { text: 'Fotocamera', onPress: openAvatarCamera },
        { text: 'Galleria',   onPress: openAvatarGallery },
        { text: 'Annulla', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const openAvatarCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso richiesto', "Consenti l'accesso alla fotocamera.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const openAvatarGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso richiesto', "Consenti l'accesso alla galleria.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length) {
      await uploadAvatar(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string) => {
    if (!userId) return;
    setSavingAvatar(true);
    try {
      const updated = await updateProfileMeta(userId, { avatarUri: uri });
      setProfile(updated);
    } catch {
      Alert.alert('Errore', 'Impossibile aggiornare la foto profilo.');
    } finally {
      setSavingAvatar(false);
    }
  };

  // ── Display name ─────────────────────────────────────────────────────────────

  const openNameModal = () => {
    setPendingName(profile?.displayName ?? '');
    setShowNameModal(true);
  };

  const saveName = async () => {
    if (!userId) return;
    setSavingName(true);
    try {
      const updated = await updateProfileMeta(userId, { displayName: pendingName.trim() });
      setProfile(updated);
      setShowNameModal(false);
    } catch {
      Alert.alert('Errore', 'Impossibile aggiornare il nome.');
    } finally {
      setSavingName(false);
    }
  };

  // ── Share ────────────────────────────────────────────────────────────────────

  const shareCode = async () => {
    const name = profile?.displayName ?? `@${friendCode}`;
    try {
      await Share.share({ message: `Aggiungimi su Moody! Il mio handle è: @${friendCode}` });
    } catch { /* dismissed */ }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  const stats = activity?.stats ?? { likedCount: 0, checkinCount: 0, moodVoteCount: 0 };
  const preferredVibes = profile?.preferredVibes ?? [];
  const avatarSrc = resolveMediaUrl(profile?.avatarUrl);
  const displayName = profile?.displayName ?? null;

  return (
    <>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar + name ── */}
        <View style={styles.avatarSection}>
          {/* Avatar circle */}
          <TouchableOpacity style={styles.avatarWrap} onPress={pickAvatar} activeOpacity={0.85}>
            {savingAvatar ? (
              <View style={styles.avatar}>
                <ActivityIndicator size="small" color={Colors.accentLight} />
              </View>
            ) : avatarSrc ? (
              <Image source={{ uri: avatarSrc }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Ionicons name="person" size={36} color={Colors.accentLight} />
              </View>
            )}
            {/* Camera badge */}
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={11} color="#fff" />
            </View>
          </TouchableOpacity>

          {/* Display name — tappable to edit */}
          <TouchableOpacity style={styles.nameRow} onPress={openNameModal} activeOpacity={0.75}>
            <Text style={styles.userName}>
              {displayName ?? handle}
            </Text>
            <Ionicons name="pencil" size={13} color={Colors.textTertiary} style={{ marginTop: 2 }} />
          </TouchableOpacity>

          {/* @handle — always visible as subtitle */}
          {displayName && (
            <Text style={styles.handleSub}>{handle}</Text>
          )}

          <Text style={styles.userSub}>Profilo adattivo anonimo</Text>
        </View>

        {/* ── Handle card ── */}
        <View style={styles.codeCard}>
          <View style={styles.codeLeft}>
            <Text style={styles.codeLabel}>Il tuo handle Moody</Text>
            <Text style={styles.codeValue}>@{friendCode}</Text>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={shareCode} activeOpacity={0.8}>
            <Ionicons name="share-outline" size={18} color={Colors.accentLight} />
            <Text style={styles.shareBtnText}>Condividi</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          <StatBlock icon="heart"            color={Colors.like}    value={stats.likedCount}    label="Piaciuti"  />
          <StatBlock icon="checkmark-circle" color={Colors.success} value={stats.checkinCount}  label="Check-in"  />
          <StatBlock icon="happy"            color={Colors.fire}    value={stats.moodVoteCount} label="Voti mood" />
        </View>

        {/* ── Preferred vibes ── */}
        <Section title="Le tue vibe">
          {preferredVibes.length === 0 ? (
            <Text style={styles.emptyHint}>Usa l'app per costruire il tuo profilo gusti</Text>
          ) : (
            <View style={styles.vibeGrid}>
              {preferredVibes.map((v) => {
                const cfg = VIBES[v as keyof typeof VIBES];
                if (!cfg) return null;
                return (
                  <View key={v} style={[styles.vibeChip, { borderColor: cfg.color + '55', backgroundColor: cfg.color + '18' }]}>
                    <Ionicons name={cfg.icon as any} size={13} color={cfg.color} />
                    <Text style={[styles.vibeLabel, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </Section>

        {/* ── Preferences ── */}
        {profile && (
          <Section title="Preferenze">
            <PrefRow icon="navigate-outline" label="Distanza massima" value={`${Math.round(profile.maxDistanceKm)} km`} />
            <PrefRow
              icon={BUDGET_LABELS[profile.budgetLevel as BudgetLevel]?.icon ?? 'card-outline'}
              label="Budget"
              value={BUDGET_LABELS[profile.budgetLevel as BudgetLevel]?.label ?? profile.budgetLevel}
            />
            <PrefRow icon="flash-outline"   label="Energia preferita"  value={`${Math.round(profile.energyPreference * 100)}%`}  bar={profile.energyPreference}  barColor={Colors.vibe.energetic} />
            <PrefRow icon="people-outline"  label="Socialità preferita" value={`${Math.round(profile.socialPreference * 100)}%`}  bar={profile.socialPreference}  barColor={Colors.vibe.social}    />
            <PrefRow icon="compass-outline" label="Voglia di scoprire"  value={`${Math.round(profile.explorationRate * 100)}%`}   bar={profile.explorationRate}   barColor={Colors.accent}         />

            <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')} activeOpacity={0.8}>
              <Ionicons name="settings-outline" size={16} color={Colors.accentLight} />
              <Text style={styles.settingsBtnText}>Modifica preferenze</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.accent} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          </Section>
        )}

        {/* ── Info ── */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.textTertiary} />
          <Text style={styles.infoText}>
            Il profilo si aggiorna automaticamente in base alle tue interazioni. Nessun dato personale viene raccolto.
          </Text>
        </View>
      </ScrollView>

      {/* ── Edit name modal ── */}
      <Modal visible={showNameModal} transparent animationType="slide" onRequestClose={() => setShowNameModal(false)}>
        <KeyboardAvoidingView
          style={nmStyles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={nmStyles.sheet}>
            <View style={nmStyles.handle} />
            <Text style={nmStyles.title}>Il tuo nome</Text>
            <Text style={nmStyles.sub}>Visibile agli amici. Max 50 caratteri.</Text>

            <View style={nmStyles.inputWrap}>
              <Ionicons name="person-outline" size={18} color={Colors.textTertiary} />
              <TextInput
                style={nmStyles.input}
                value={pendingName}
                onChangeText={setPendingName}
                placeholder="Es. Marco R."
                placeholderTextColor={Colors.textTertiary}
                maxLength={50}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={saveName}
              />
              {pendingName.length > 0 && (
                <TouchableOpacity onPress={() => setPendingName('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={nmStyles.charCount}>{pendingName.length}/50</Text>

            <TouchableOpacity
              style={[nmStyles.saveBtn, savingName && { opacity: 0.6 }]}
              onPress={saveName}
              disabled={savingName}
              activeOpacity={0.85}
            >
              {savingName
                ? <ActivityIndicator size="small" color={Colors.text} />
                : <Text style={nmStyles.saveBtnText}>Salva</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={nmStyles.cancelBtn} onPress={() => setShowNameModal(false)}>
              <Text style={nmStyles.cancelText}>Annulla</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={secStyles.section}>
      <Text style={secStyles.title}>{title.toUpperCase()}</Text>
      <View style={secStyles.body}>{children}</View>
    </View>
  );
}
const secStyles = StyleSheet.create({
  section: { gap: 10 },
  title:   { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 1 },
  body:    { backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 12, borderWidth: 1, borderColor: Colors.cardBorder },
});

function StatBlock({ icon, color, value, label }: { icon: any; color: string; value: number; label: string }) {
  return (
    <View style={[stStyles.block, { borderColor: color + '33' }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[stStyles.value, { color }]}>{value}</Text>
      <Text style={stStyles.label}>{label}</Text>
    </View>
  );
}
const stStyles = StyleSheet.create({
  block: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 14, borderRadius: 14, backgroundColor: Colors.card, borderWidth: 1 },
  value: { fontSize: 22, fontWeight: '800' },
  label: { fontSize: 11, color: Colors.textTertiary },
});

function PrefRow({ icon, label, value, bar, barColor }: { icon: any; label: string; value: string; bar?: number; barColor?: string }) {
  return (
    <View style={prStyles.row}>
      <View style={prStyles.left}>
        <Ionicons name={icon} size={15} color={Colors.textTertiary} />
        <Text style={prStyles.label}>{label}</Text>
      </View>
      <View style={prStyles.right}>
        {bar !== undefined && barColor && (
          <View style={prStyles.barBg}>
            <View style={[prStyles.barFill, { width: `${bar * 100}%` as any, backgroundColor: barColor }]} />
          </View>
        )}
        <Text style={prStyles.value}>{value}</Text>
      </View>
    </View>
  );
}
const prStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  left:  { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontSize: 14, color: Colors.textSecondary },
  value: { fontSize: 13, fontWeight: '700', color: Colors.text, minWidth: 40, textAlign: 'right' },
  barBg: { width: 60, height: 4, borderRadius: 2, backgroundColor: Colors.cardBorder, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },
});

// ─── Name modal styles ────────────────────────────────────────────────────────

const nmStyles = StyleSheet.create({
  overlay:   { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet:     { backgroundColor: Colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, gap: 14 },
  handle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: 4 },
  title:     { fontSize: 20, fontWeight: '800', color: Colors.text },
  sub:       { fontSize: 14, color: Colors.textSecondary, marginTop: -6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12 },
  input:     { flex: 1, fontSize: 16, color: Colors.text },
  charCount: { fontSize: 11, color: Colors.textTertiary, textAlign: 'right', marginTop: -8 },
  saveBtn:   { backgroundColor: Colors.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelText:{ fontSize: 15, color: Colors.textSecondary },
});

// ─── Main styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: 20, paddingBottom: 120, gap: 24 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  avatarSection: { alignItems: 'center', paddingTop: 12, gap: 6 },

  avatarWrap: { position: 'relative', marginBottom: 4 },
  avatar: {
    width: 86, height: 86, borderRadius: 43,
    backgroundColor: Colors.accentDim,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2.5, borderColor: Colors.accent + '66',
    overflow: 'hidden',
  },
  cameraBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: Colors.accent,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.background,
  },

  nameRow:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 20, fontWeight: '700', color: Colors.text },
  handleSub:{ fontSize: 13, color: Colors.textTertiary, letterSpacing: 0.3 },
  userSub:  { fontSize: 12, color: Colors.textTertiary },

  codeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.accentDim },
  codeLeft: { flex: 1, gap: 3 },
  codeLabel:{ fontSize: 11, fontWeight: '600', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  codeValue:{ fontSize: 20, fontWeight: '800', color: Colors.accentLight, letterSpacing: 1 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: Colors.accentDim },
  shareBtnText: { fontSize: 13, fontWeight: '700', color: Colors.accentLight },

  statsRow: { flexDirection: 'row', gap: 10 },

  vibeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vibeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, borderWidth: 1 },
  vibeLabel:{ fontSize: 12, fontWeight: '700' },
  emptyHint:{ fontSize: 13, color: Colors.textTertiary, fontStyle: 'italic' },

  infoBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 14, backgroundColor: Colors.surface, borderRadius: 12 },
  infoText: { flex: 1, fontSize: 12, color: Colors.textTertiary, lineHeight: 18 },

  settingsBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, backgroundColor: Colors.accentDim, marginTop: 4 },
  settingsBtnText: { fontSize: 13, fontWeight: '700', color: Colors.accentLight },
});
