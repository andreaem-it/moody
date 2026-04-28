import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/colors';
import { getVibeConfig } from '../constants/vibes';
import { uploadEventImage, createEvent } from '../services/api';
import type { DraftEvent } from '../services/api';

const ALL_VIBES = ['chill', 'social', 'energetic', 'cultural', 'experience', 'food', 'music', 'nightlife'];

export default function UploadScreen() {
  const router = useRouter();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DraftEvent | null>(null);

  // Editable fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [vibes, setVibes] = useState<string[]>([]);

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
      setTitle(extracted.title ?? '');
      setDescription(extracted.description ?? '');
      setDate(extracted.date ?? '');
      setTime(extracted.time ?? '');
      setLocation(extracted.location ?? '');
      setPrice(extracted.price !== null && extracted.price !== undefined ? String(extracted.price) : '');
      setVibes(extracted.vibes ?? []);
    } catch {
      Alert.alert('Estrazione fallita', 'Non è stato possibile estrarre i dati. Inseriscili manualmente.');
      setDraft({ title: '', description: '', date: '', time: '', location: '', price: null, vibes: [], energyScore: 0.5, socialScore: 0.5, sourceType: 'ocr', rawText: '' });
    } finally {
      setProcessing(false);
    }
  };

  const toggleVibe = (v: string) => {
    setVibes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const handleSave = async () => {
    if (!title.trim() || !date.trim() || !time.trim() || !location.trim()) {
      Alert.alert('Campi mancanti', 'Titolo, data, ora e luogo sono obbligatori.');
      return;
    }

    setSaving(true);
    try {
      await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        date: date.trim(),
        time: time.trim(),
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
      Alert.alert('Errore', 'Impossibile salvare l\'evento. Riprova.');
    } finally {
      setSaving(false);
    }
  };

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
              <Text style={styles.imagePlaceholderEmoji}>📷</Text>
              <Text style={styles.imagePlaceholderText}>Scegli una locandina</Text>
              <Text style={styles.imagePlaceholderSub}>JPG, PNG o WEBP · max 10 MB</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Processing indicator */}
        {processing && (
          <View style={styles.processingBox}>
            <ActivityIndicator size="small" color={Colors.accent} />
            <Text style={styles.processingText}>Estrazione dati in corso…</Text>
          </View>
        )}

        {/* Form — shown after processing or on first open */}
        {(draft !== null || !processing) && (
          <View style={styles.form}>
            {draft && (
              <View style={styles.ocrBadge}>
                <Text style={styles.ocrBadgeText}>✨ Dati estratti dalla locandina — modifica se necessario</Text>
              </View>
            )}

            <Field label="Titolo *" value={title} onChangeText={setTitle} placeholder="Nome dell'evento" />
            <Field label="Descrizione" value={description} onChangeText={setDescription} placeholder="Una breve descrizione…" multiline />
            <Field label="Data * (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-05-02" keyboardType="default" />
            <Field label="Ora * (HH:MM)" value={time} onChangeText={setTime} placeholder="21:30" keyboardType="default" />
            <Field label="Luogo *" value={location} onChangeText={setLocation} placeholder="Via Roma 1, Milano" />
            <Field label="Prezzo (€, 0 = gratuito)" value={price} onChangeText={setPrice} placeholder="0" keyboardType="decimal-pad" />

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
                      style={[
                        styles.vibeChip,
                        {
                          borderColor: selected ? cfg.color : Colors.border,
                          backgroundColor: selected ? cfg.color + '22' : Colors.surface,
                        },
                      ]}
                      onPress={() => toggleVibe(v)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.vibeEmoji}>{cfg.emoji}</Text>
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
                <Text style={styles.saveBtnText}>💾 Salva Evento</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'decimal-pad';
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
    gap: 20,
  },
  imagePicker: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  previewImage: {
    width: '100%',
    height: 220,
  },
  imagePlaceholder: {
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
  },
  imagePlaceholderEmoji: { fontSize: 36 },
  imagePlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  imagePlaceholderSub: {
    fontSize: 12,
    color: Colors.textTertiary,
  },
  processingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: Colors.accentDim,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  processingText: {
    color: Colors.accentLight,
    fontSize: 14,
    fontWeight: '500',
  },
  form: {
    gap: 16,
  },
  ocrBadge: {
    backgroundColor: Colors.successBg,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.success + '44',
  },
  ocrBadgeText: {
    color: Colors.success,
    fontSize: 13,
    fontWeight: '500',
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  inputMultiline: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  vibeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  vibeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    borderWidth: 1.5,
  },
  vibeEmoji: { fontSize: 13 },
  vibeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.accent,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  saveBtnText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
});
