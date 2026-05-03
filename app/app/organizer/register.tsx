import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { registerOrganizer } from '../../services/api';
import { useDeviceId } from '../../hooks/useDeviceId';

const GOLD = '#FFB800';

export default function RegisterOrganizerScreen() {
  const insets = useSafeAreaInsets();
  const userId = useDeviceId();

  const [venueName,   setVenueName]   = useState('');
  const [contactName, setContactName] = useState('');
  const [email,       setEmail]       = useState('');
  const [city,        setCity]        = useState('');
  const [description, setDescription] = useState('');
  const [saving,      setSaving]      = useState(false);

  const canSubmit = venueName.trim() && contactName.trim() && email.trim() && city.trim();

  const handleRegister = async () => {
    if (!userId || !canSubmit) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Email non valida', 'Inserisci un indirizzo email corretto.');
      return;
    }
    setSaving(true);
    try {
      await registerOrganizer({
        userId,
        venueName:   venueName.trim(),
        contactName: contactName.trim(),
        email:       email.trim(),
        city:        city.trim(),
        description: description.trim() || undefined,
      });
      router.replace('/organizer/dashboard');
    } catch (err: any) {
      if (err?.response?.status === 409) {
        // Profilo già esistente — vai direttamente alla dashboard
        router.replace('/organizer/dashboard');
      } else {
        Alert.alert('Errore', 'Registrazione non riuscita. Controlla la connessione e riprova.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.badgeWrap}>
            <Ionicons name="star" size={28} color={GOLD} />
          </View>
          <Text style={styles.heroTitle}>Moody<Text style={{ color: GOLD }}>+</Text></Text>
          <Text style={styles.heroSub}>
            Pubblica i tuoi eventi, raggiungi il pubblico giusto e monitora le performance — tutto da qui.
          </Text>
        </View>

        {/* Perks */}
        <View style={styles.perksRow}>
          <Perk icon="create-outline"    text="100 pubblicazioni gratis" />
          <Perk icon="bar-chart-outline" text="Statistiche in tempo reale" />
          <Perk icon="people-outline"    text="Reach sul target 18-35" />
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.sectionLabel}>IL TUO ACCOUNT</Text>
          <Field
            icon="storefront-outline"
            placeholder="Nome locale / organizzazione *"
            value={venueName}
            onChangeText={setVenueName}
            maxLength={80}
          />
          <Field
            icon="person-outline"
            placeholder="Il tuo nome *"
            value={contactName}
            onChangeText={setContactName}
            maxLength={60}
          />
          <Field
            icon="mail-outline"
            placeholder="Email di contatto *"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            maxLength={100}
          />
          <Field
            icon="location-outline"
            placeholder="Città *"
            value={city}
            onChangeText={setCity}
            maxLength={60}
          />
          <Field
            icon="document-text-outline"
            placeholder="Descrizione (opzionale)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            maxLength={300}
          />
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.cta, (!canSubmit || saving) && styles.ctaDisabled]}
          onPress={handleRegister}
          disabled={!canSubmit || saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator size="small" color={Colors.background} />
            : <>
                <Ionicons name="star" size={16} color={Colors.background} />
                <Text style={styles.ctaText}>Attiva Moody+ gratuitamente</Text>
              </>}
        </TouchableOpacity>

        <Text style={styles.legal}>
          Attivando Moody+ accetti i Termini di Servizio. Il piano gratuito include 100 pubblicazioni.
          Puoi acquistare submission aggiuntive in qualsiasi momento.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Perk({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.perk}>
      <Ionicons name={icon} size={20} color={GOLD} />
      <Text style={styles.perkText}>{text}</Text>
    </View>
  );
}

function Field({
  icon, placeholder, value, onChangeText,
  keyboardType, autoCapitalize, multiline, numberOfLines, maxLength,
}: {
  icon: any; placeholder: string; value: string;
  onChangeText: (v: string) => void;
  keyboardType?: any; autoCapitalize?: any;
  multiline?: boolean; numberOfLines?: number; maxLength?: number;
}) {
  return (
    <View style={[styles.fieldWrap, multiline && styles.fieldMultiline]}>
      <Ionicons name={icon} size={18} color={Colors.textTertiary} style={styles.fieldIcon} />
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMulti]}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize={autoCapitalize ?? 'words'}
        multiline={multiline}
        numberOfLines={numberOfLines}
        maxLength={maxLength}
        returnKeyType={multiline ? 'default' : 'next'}
      />
    </View>
  );
}

const GOLD_DIM = '#FFB80022';

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },

  content: { padding: 20, gap: 20 },

  hero: { alignItems: 'center', paddingVertical: 24, gap: 12 },
  badgeWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: GOLD_DIM,
    borderWidth: 1.5, borderColor: GOLD + '55',
    alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: 32, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
  heroSub:   { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, paddingHorizontal: 12 },

  perksRow: { flexDirection: 'row', gap: 8 },
  perk:     { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 8, backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: GOLD + '33' },
  perkText: { fontSize: 11, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center' },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textTertiary, letterSpacing: 1, textTransform: 'uppercase', marginBottom: -8 },

  form:           { gap: 10 },
  fieldWrap:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, minHeight: 50 },
  fieldMultiline: { alignItems: 'flex-start', paddingVertical: 12 },
  fieldIcon:      { marginRight: 10, marginTop: 1 },
  fieldInput:     { flex: 1, fontSize: 15, color: Colors.text },
  fieldInputMulti:{ minHeight: 70, textAlignVertical: 'top' },

  cta:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: GOLD, borderRadius: 14, paddingVertical: 16, marginTop: 4 },
  ctaDisabled: { opacity: 0.4 },
  ctaText:     { fontSize: 16, fontWeight: '800', color: Colors.background },

  legal: { fontSize: 11, color: Colors.textTertiary, textAlign: 'center', lineHeight: 16 },
});
