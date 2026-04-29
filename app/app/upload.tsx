import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Image, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';
import { getVibeConfig } from '../constants/vibes';
import { uploadEventImage, createEvent } from '../services/api';
import type { DraftEvent } from '../services/api';

const ALL_VIBES = ['chill', 'social', 'energetic', 'cultural', 'experience', 'food', 'music', 'nightlife'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toTimeString(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDisplayTime(d: Date): string {
  return d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function UploadScreen() {
  const router = useRouter();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftEvent | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [vibes, setVibes] = useState<string[]>([]);

  // Date/time as Date objects for the native pickers
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(21, 0, 0, 0);
    return d;
  });

  // Picker visibility — iOS shows inline, Android uses modal pattern
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  // ── Image ──────────────────────────────────────────────────────────────────

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permesso richiesto', 'Moody ha bisogno di accedere alla galleria.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.85,
    });
    if (result.canceled || !result.assets.length) return;
    const uri = result.assets[0].uri;
    setImageUri(uri);
    await processImage(uri);
  };

  const processImage = async (uri: string) => {
    setProcessing(true);
    try {
      const extracted = await uploadEventImage(uri);
      setDraft(extracted);
      setConfidence(extracted.confidence ?? null);
      setTitle(extracted.title ?? '');
      setDescription(extracted.description ?? '');
      setLocation(extracted.location ?? '');
      setPrice(extracted.price != null ? String(extracted.price) : '');
      setVibes(extracted.vibes ?? []);

      // Sync pickers from extracted date/time strings
      if (extracted.date || extracted.time) {
        const base = extracted.date ? new Date(extracted.date) : new Date();
        if (extracted.time) {
          const [h, m] = extracted.time.split(':').map(Number);
          base.setHours(h || 21, m || 0, 0, 0);
        }
        if (!isNaN(base.getTime())) setSelectedDate(base);
      }
    } catch {
      Alert.alert('Estrazione fallita', 'Non è stato possibile estrarre i dati. Inseriscili manualmente.');
      setDraft({ title: '', description: '', date: '', time: '', location: '', price: null, vibes: [], energyScore: 0.5, socialScore: 0.5, sourceType: 'ocr', rawText: '', confidence: 0 });
    } finally {
      setProcessing(false);
    }
  };

  // ── Pickers ────────────────────────────────────────────────────────────────

  const onDateChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (date) {
      setSelectedDate((prev) => {
        const next = new Date(date);
        next.setHours(prev.getHours(), prev.getMinutes(), 0, 0);
        return next;
      });
    }
  };

  const onTimeChange = (_: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowTimePicker(false);
    if (date) {
      setSelectedDate((prev) => {
        const next = new Date(prev);
        next.setHours(date.getHours(), date.getMinutes(), 0, 0);
        return next;
      });
    }
  };

  // ── Vibes / Save ───────────────────────────────────────────────────────────

  const toggleVibe = (v: string) =>
    setVibes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  const handleSave = async () => {
    if (!title.trim() || !location.trim()) {
      Alert.alert('Campi mancanti', 'Titolo e luogo sono obbligatori.');
      return;
    }
    setSaving(true);
    try {
      await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        date:  toDateString(selectedDate),
        time:  toTimeString(selectedDate),
        location: location.trim(),
        price: price ? parseFloat(price) : null,
        vibes,
        sourceType: 'ocr',
        rawText: draft?.rawText ?? undefined,
      });
      Alert.alert('Evento aggiunto!', 'Il tuo evento è stato salvato.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Errore', "Impossibile salvare l'evento. Riprova.");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Image picker */}
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="camera-outline" size={38} color={Colors.textSecondary} />
              <Text style={styles.imagePlaceholderText}>Scegli una locandina</Text>
              <Text style={styles.imagePlaceholderSub}>JPG, PNG o WEBP · max 10 MB</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Processing */}
        {processing && (
          <View style={styles.processingBox}>
            <ActivityIndicator size="small" color={Colors.accent} />
            <Text style={styles.processingText}>Estrazione dati in corso…</Text>
          </View>
        )}

        {/* Form */}
        {(draft !== null || !processing) && (
          <View style={styles.form}>
            {draft && <ConfidenceBadge confidence={confidence} />}

            <Field label="Titolo *"     value={title}       onChangeText={setTitle}       placeholder="Nome dell'evento" />
            <Field label="Descrizione"  value={description} onChangeText={setDescription} placeholder="Una breve descrizione…" multiline />

            {/* ── Date picker ── */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Data *</Text>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => { setShowTimePicker(false); setShowDatePicker(true); }}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={17} color={Colors.accentLight} />
                <Text style={styles.pickerBtnText}>{formatDisplayDate(selectedDate)}</Text>
                <Ionicons name="chevron-down" size={15} color={Colors.textTertiary} />
              </TouchableOpacity>

              {showDatePicker && (
                Platform.OS === 'ios' ? (
                  <View style={styles.inlinePicker}>
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="inline"
                      onChange={onDateChange}
                      minimumDate={new Date()}
                      themeVariant="dark"
                      accentColor={Colors.accent}
                      textColor={Colors.text}
                      locale="it-IT"
                    />
                    <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.pickerDoneBtnText}>Fatto</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    minimumDate={new Date()}
                  />
                )
              )}
            </View>

            {/* ── Time picker ── */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Ora *</Text>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => { setShowDatePicker(false); setShowTimePicker(true); }}
                activeOpacity={0.8}
              >
                <Ionicons name="time-outline" size={17} color={Colors.accentLight} />
                <Text style={styles.pickerBtnText}>{formatDisplayTime(selectedDate)}</Text>
                <Ionicons name="chevron-down" size={15} color={Colors.textTertiary} />
              </TouchableOpacity>

              {showTimePicker && (
                Platform.OS === 'ios' ? (
                  <View style={styles.inlinePicker}>
                    <DateTimePicker
                      value={selectedDate}
                      mode="time"
                      display="spinner"
                      onChange={onTimeChange}
                      themeVariant="dark"
                      accentColor={Colors.accent}
                      textColor={Colors.text}
                      locale="it-IT"
                      minuteInterval={5}
                    />
                    <TouchableOpacity style={styles.pickerDoneBtn} onPress={() => setShowTimePicker(false)}>
                      <Text style={styles.pickerDoneBtnText}>Fatto</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <DateTimePicker
                    value={selectedDate}
                    mode="time"
                    display="default"
                    onChange={onTimeChange}
                    is24Hour
                  />
                )
              )}
            </View>

            <Field label="Luogo *"              value={location} onChangeText={setLocation} placeholder="Via Roma 1, Milano" />
            <Field label="Prezzo (€, 0 = gratis)" value={price}  onChangeText={setPrice}    placeholder="0" keyboardType="decimal-pad" />

            {/* Vibes */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Vibe</Text>
              <View style={styles.vibeGrid}>
                {ALL_VIBES.map((v) => {
                  const cfg = getVibeConfig(v);
                  const selected = vibes.includes(v);
                  return (
                    <TouchableOpacity
                      key={v}
                      style={[styles.vibeChip, { borderColor: selected ? cfg.color : Colors.border, backgroundColor: selected ? cfg.color + '22' : Colors.surface }]}
                      onPress={() => toggleVibe(v)}
                      activeOpacity={0.75}
                    >
                      <Ionicons name={cfg.icon as any} size={13} color={selected ? cfg.color : Colors.textSecondary} />
                      <Text style={[styles.vibeLabel, selected && { color: cfg.color }]}>{cfg.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Save */}
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={18} color={Colors.text} />
                  <Text style={styles.saveBtnText}>Salva Evento</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Confidence badge ──────────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number | null }) {
  if (confidence === null) return null;
  if (confidence > 0.8) {
    return (
      <View style={[confStyles.badge, confStyles.high]}>
        <Ionicons name="checkmark-circle" size={15} color="#34C759" />
        <Text style={[confStyles.text, confStyles.highText]}>Dati affidabili ({Math.round(confidence * 100)}%)</Text>
      </View>
    );
  }
  if (confidence < 0.6) {
    return (
      <View style={[confStyles.badge, confStyles.low]}>
        <Ionicons name="warning-outline" size={15} color="#FF6B6B" />
        <Text style={[confStyles.text, confStyles.lowText]}>Controlla i dati ({Math.round(confidence * 100)}%) — qualità bassa</Text>
      </View>
    );
  }
  return (
    <View style={[confStyles.badge, confStyles.mid]}>
      <Ionicons name="document-text-outline" size={15} color="#FFD60A" />
      <Text style={[confStyles.text, confStyles.midText]}>Dati estratti — verifica prima di salvare</Text>
    </View>
  );
}

const confStyles = StyleSheet.create({
  badge:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 12, borderWidth: 1 },
  text:    { fontSize: 13, fontWeight: '500', flex: 1 },
  high:    { backgroundColor: '#0A2A14', borderColor: '#34C75944' },
  highText:{ color: '#34C759' },
  low:     { backgroundColor: '#2A0A0A', borderColor: '#FF3B3044' },
  lowText: { color: '#FF6B6B' },
  mid:     { backgroundColor: '#1A1A0A', borderColor: '#FFD60A44' },
  midText: { color: '#FFD60A' },
});

// ─── Field helper ─────────────────────────────────────────────────────────────

function Field({
  label, value, onChangeText, placeholder, multiline = false, keyboardType = 'default',
}: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder?: string; multiline?: boolean; keyboardType?: 'default' | 'decimal-pad';
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
        keyboardType={keyboardType}
        autoCorrect={false}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: 20, paddingBottom: 60, gap: 20 },

  imagePicker:          { borderRadius: 20, overflow: 'hidden', borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed' },
  previewImage:         { width: '100%', height: 220 },
  imagePlaceholder:     { height: 160, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.surface },
  imagePlaceholderText: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  imagePlaceholderSub:  { fontSize: 12, color: Colors.textTertiary },

  processingBox:  { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, backgroundColor: Colors.accentDim, borderWidth: 1, borderColor: Colors.accent + '44' },
  processingText: { color: Colors.accentLight, fontSize: 14, fontWeight: '500' },

  form:       { gap: 16 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.textTertiary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:          { backgroundColor: Colors.card, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text },
  inputMultiline: { height: 100, textAlignVertical: 'top', paddingTop: 12 },

  // Picker button (the tappable "display" row)
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pickerBtnText: { flex: 1, fontSize: 15, color: Colors.text, fontWeight: '500' },

  // Inline picker container (iOS only — expands below the button)
  inlinePicker: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginTop: 4,
  },
  pickerDoneBtn: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  pickerDoneBtnText: { fontSize: 15, fontWeight: '700', color: Colors.accentLight },

  vibeGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vibeChip:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, borderWidth: 1.5 },
  vibeLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent, borderRadius: 16, paddingVertical: 16, marginTop: 8,
    shadowColor: Colors.accent, shadowOpacity: 0.35, shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }, elevation: 6,
  },
  saveBtnText: { color: Colors.text, fontSize: 16, fontWeight: '800' },
});
