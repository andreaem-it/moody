import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { fetchPackages, requestPackagePurchase } from '../../services/api';
import type { SubmissionPackage } from '../../services/api';
import { useDeviceId } from '../../hooks/useDeviceId';

const GOLD = '#FFB800';
const GOLD_DIM = '#FFB80018';

const PACK_ICONS: Record<string, { icon: any; color: string }> = {
  pack_10:  { icon: 'flash-outline',    color: Colors.vibe.chill    },
  pack_50:  { icon: 'rocket-outline',   color: Colors.accentLight   },
  pack_100: { icon: 'diamond-outline',  color: GOLD                 },
};

export default function PackagesScreen() {
  const insets = useSafeAreaInsets();
  const userId = useDeviceId();

  const [packages,  setPackages]  = useState<SubmissionPackage[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    fetchPackages()
      .then(setPackages)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async (pkg: SubmissionPackage) => {
    if (!userId) return;
    Alert.alert(
      `Acquistare "${pkg.label}"?`,
      `${pkg.submissions} submission aggiuntive a €${pkg.price.toFixed(2)}.\n\nRiceverai le istruzioni di pagamento via email entro 24h.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Richiedi',
          onPress: async () => {
            setPurchasing(pkg.id);
            try {
              const res = await requestPackagePurchase(userId, pkg.id);
              Alert.alert('Richiesta inviata', res.message, [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch {
              Alert.alert('Errore', 'Impossibile inviare la richiesta. Riprova.');
            } finally {
              setPurchasing(null);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={GOLD} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Aggiungi submission</Text>
        <Text style={styles.heroSub}>
          Scegli il pacchetto più adatto alla tua attività. Le submission non scadono.
        </Text>
      </View>

      {/* Pacchetti */}
      {packages.map((pkg, idx) => {
        const cfg       = PACK_ICONS[pkg.id] ?? { icon: 'add-circle-outline', color: Colors.accent };
        const isPopular = idx === 1; // Pack 50 è il consigliato
        return (
          <View key={pkg.id} style={[styles.card, isPopular && styles.cardPopular]}>
            {isPopular && (
              <View style={styles.popularBadge}>
                <Ionicons name="star" size={10} color={Colors.background} />
                <Text style={styles.popularText}>Più scelto</Text>
              </View>
            )}
            <View style={styles.cardTop}>
              <View style={[styles.iconWrap, { backgroundColor: cfg.color + '22', borderColor: cfg.color + '55' }]}>
                <Ionicons name={cfg.icon} size={22} color={cfg.color} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.packLabel}>{pkg.label}</Text>
                <Text style={styles.packSubs}>{pkg.submissions} submission</Text>
              </View>
              <View style={styles.priceWrap}>
                <Text style={[styles.price, isPopular && { color: GOLD }]}>€{pkg.price.toFixed(2)}</Text>
                <Text style={styles.perUnit}>€{pkg.pricePerUnit.toFixed(2)}/sub</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.buyBtn, isPopular && styles.buyBtnPopular, purchasing === pkg.id && styles.buyBtnLoading]}
              onPress={() => handlePurchase(pkg)}
              disabled={purchasing !== null}
              activeOpacity={0.85}
            >
              {purchasing === pkg.id
                ? <ActivityIndicator size="small" color={isPopular ? Colors.background : GOLD} />
                : <>
                    <Ionicons name="cart-outline" size={16} color={isPopular ? Colors.background : GOLD} />
                    <Text style={[styles.buyBtnText, isPopular && styles.buyBtnTextPopular]}>Acquista</Text>
                  </>}
            </TouchableOpacity>
          </View>
        );
      })}

      {/* Info pagamento */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={16} color={Colors.textTertiary} />
        <Text style={styles.infoText}>
          Il pagamento avviene via bonifico o carta. Riceverai le istruzioni all'email associata al tuo profilo Moody+. Le submission vengono attivate entro 24h dalla conferma del pagamento.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: 20, gap: 16 },
  centered:  { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero:      { alignItems: 'center', paddingVertical: 8, gap: 8 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: Colors.text },
  heroSub:   { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  card:        { backgroundColor: Colors.card, borderRadius: 16, padding: 16, gap: 14, borderWidth: 1, borderColor: Colors.border },
  cardPopular: { borderColor: GOLD + '88', backgroundColor: Colors.card },

  popularBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, backgroundColor: GOLD },
  popularText:  { fontSize: 11, fontWeight: '800', color: Colors.background },

  cardTop:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  cardInfo: { flex: 1, gap: 3 },
  packLabel:{ fontSize: 17, fontWeight: '800', color: Colors.text },
  packSubs: { fontSize: 13, color: Colors.textSecondary },
  priceWrap:{ alignItems: 'flex-end', gap: 2 },
  price:    { fontSize: 22, fontWeight: '900', color: Colors.text },
  perUnit:  { fontSize: 11, color: Colors.textTertiary },

  buyBtn:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: GOLD + '77' },
  buyBtnPopular:  { backgroundColor: GOLD, borderColor: GOLD },
  buyBtnLoading:  { opacity: 0.6 },
  buyBtnText:     { fontSize: 15, fontWeight: '800', color: GOLD },
  buyBtnTextPopular: { color: Colors.background },

  infoBox:  { flexDirection: 'row', gap: 10, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, alignItems: 'flex-start' },
  infoText: { flex: 1, fontSize: 12, color: Colors.textTertiary, lineHeight: 18 },
});
