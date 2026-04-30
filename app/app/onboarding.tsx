import React, { useState, useRef, useEffect, useCallback, useImperativeHandle } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Animated, Dimensions, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform, Image, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../constants/colors';
import { VIBES } from '../constants/vibes';
import { updatePreferences, updateProfileMeta } from '../services/api';
import { useDeviceId } from '../hooks/useDeviceId';

export const ONBOARDING_KEY = 'moody_onboarding_v1';

const { width: SCREEN_W } = Dimensions.get('window');

type BudgetLevel = 'low' | 'medium' | 'high';
type Vibe = keyof typeof VIBES;

const BUDGET_OPTIONS: { key: BudgetLevel; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'low',    label: 'Economico', sub: 'Gratuito – €15',  icon: 'leaf-outline'    },
  { key: 'medium', label: 'Medio',     sub: '€15 – €50',       icon: 'card-outline'    },
  { key: 'high',   label: 'Premium',   sub: '€50+',            icon: 'diamond-outline' },
];
const DISTANCE_OPTIONS = [5, 10, 20, 50, 100];
const LEVEL_STEPS  = [0.1, 0.3, 0.5, 0.7, 0.9];
const LEVEL_LABELS = ['Minimo', 'Basso', 'Medio', 'Alto', 'Massimo'];

const STEP_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  benvenuto: 'hand-left-outline',
  vibe:      'color-palette-outline',
  budget:    'wallet-outline',
  distanza:  'location-outline',
  energia:   'flash-outline',
};

function nearestStep(v: number) {
  return LEVEL_STEPS.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);
}

const STEPS = ['benvenuto', 'vibe', 'budget', 'distanza', 'energia'] as const;
type Step = typeof STEPS[number];

// ─── Processing messages ──────────────────────────────────────────────────────

interface ProcessingMessage {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  hold: number; // ms
}

const SUGGESTION_ICONS: Array<keyof typeof Ionicons.glyphMap> = [
  'musical-notes-outline', 'restaurant-outline', 'color-palette-outline',
  'flash-outline', 'people-outline', 'star-outline', 'moon-outline', 'water-outline',
];

function buildMessages(
  name: string,
  vibes: Set<Vibe>,
  distance: number,
): ProcessingMessage[] {
  const vibeList   = Array.from(vibes);
  const vibeLabels = vibeList.map((v) => VIBES[v]?.label ?? v);

  const vibeText = vibeLabels.length === 0
    ? 'Ti piacciono tutti i tipi di eventi'
    : vibeLabels.length === 1
      ? `Ti piace tutto ciò che è ${vibeLabels[0]}`
      : `Ti piace ${vibeLabels.slice(0, -1).join(', ')} e ${vibeLabels[vibeLabels.length - 1]}`;

  const [icon1, icon2, icon3] = vibeList.length >= 3
    ? vibeList.map((v) => VIBES[v]?.icon as keyof typeof Ionicons.glyphMap)
    : SUGGESTION_ICONS.slice(0, 3);

  const msgs: ProcessingMessage[] = [
    {
      icon: name.trim() ? 'person-circle-outline' : 'hand-left-outline',
      text: name.trim() ? `Ok, ti chiami ${name.trim()}` : 'Ok, benvenuto in Moody.',
      hold: 900,
    },
    {
      icon: vibeList[0] ? (VIBES[vibeList[0]]?.icon as keyof typeof Ionicons.glyphMap) : 'color-palette-outline',
      text: vibeText,
      hold: 1000,
    },
    {
      icon: 'navigate-outline',
      text: `Di solito ti sposti ${distance === 100 ? '100+' : distance} km`,
      hold: 900,
    },
    {
      icon: 'construct-outline',
      text: 'Sto preparando il tuo profilo...',
      hold: 1100,
    },
    {
      icon: icon1 ?? 'star-outline',
      text: 'Forse ti può piacere...',
      hold: 700,
    },
    {
      icon: icon2 ?? 'moon-outline',
      text: 'O magari...',
      hold: 700,
    },
    {
      icon: icon3 ?? 'flash-outline',
      text: 'Credo impazzirai per...',
      hold: 700,
    },
    {
      icon: 'checkmark-circle-outline',
      text: 'Ok ci siamo, vediamo',
      hold: 1000,
    },
  ];
  return msgs;
}

export default function OnboardingScreen() {
  const userId  = useDeviceId();
  const insets  = useSafeAreaInsets();

  const [step,        setStep]        = useState<Step>('benvenuto');
  const [name,        setName]        = useState('');
  const [vibes,       setVibes]       = useState<Set<Vibe>>(new Set());
  const [budget,      setBudget]      = useState<BudgetLevel>('medium');
  const [distance,    setDistance]    = useState(20);
  const [energy,      setEnergy]      = useState(0.5);
  const [social,      setSocial]      = useState(0.5);
  const [exploration, setExploration] = useState(0.3);
  const [saving,      setSaving]      = useState(false);
  const [processing,  setProcessing]  = useState(false);

  const slideX  = useRef(new Animated.Value(0)).current;
  const stepIdx = STEPS.indexOf(step);
  const logoRef = useRef<LogoAnimatedRef>(null);

  function goNext() {
    Keyboard.dismiss();
    const next = STEPS[stepIdx + 1];
    if (!next) { finish(); return; }

    const doTransition = () => {
      Animated.timing(slideX, { toValue: -(stepIdx + 1) * SCREEN_W, duration: 300, useNativeDriver: true }).start();
      setStep(next);
    };

    if (step === 'benvenuto' && logoRef.current) {
      logoRef.current.playExit(doTransition);
    } else {
      doTransition();
    }
  }

  function goBack() {
    if (stepIdx === 0) return;
    Keyboard.dismiss();
    const prev = STEPS[stepIdx - 1];
    // Resetta e avvia l'animazione di ingresso del logo prima di scorrere
    if (prev === 'benvenuto') {
      logoRef.current?.playEnter();
    }
    Animated.timing(slideX, { toValue: -(stepIdx - 1) * SCREEN_W, duration: 300, useNativeDriver: true }).start();
    setStep(prev);
  }

  const toggleVibe = (v: Vibe) => {
    setVibes((prev) => {
      const next = new Set(prev);
      next.has(v) ? next.delete(v) : next.add(v);
      return next;
    });
  };

  function finish() {
    // Mostra subito la schermata di calcolo (non aspetta userId)
    setProcessing(true);
  }

  const onProcessingDone = useCallback(async () => {
    const id = userId;
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    } catch { /* ignore */ }
    router.replace('/(tabs)');
    // Salva preferenze in background
    if (id) {
      Promise.all([
        name.trim() ? updateProfileMeta(id, { displayName: name.trim() }) : Promise.resolve(),
        updatePreferences(id, {
          preferredVibes:   Array.from(vibes),
          maxDistanceKm:    distance,
          budgetLevel:      budget,
          energyPreference: energy,
          socialPreference: social,
          explorationRate:  exploration,
        }),
      ]).catch(() => { /* modificabili da Impostazioni */ });
    }
  }, [userId, name, vibes, distance, budget, energy, social, exploration]);

  const isLast = stepIdx === STEPS.length - 1;

  if (processing) {
    return (
      <ProcessingOverlay
        messages={buildMessages(name, vibes, distance)}
        onDone={onProcessingDone}
        insetTop={insets.top}
        insetBottom={insets.bottom}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((stepIdx + 1) / STEPS.length) * 100}%` as any }]} />
      </View>

      {/* Slides */}
      <Animated.View style={[styles.slider, { width: SCREEN_W * STEPS.length, transform: [{ translateX: slideX }] }]}>

        {/* ── Step 0: Benvenuto ── */}
        <StepWrap>
          <View style={styles.iconWrap}>
            <LogoAnimated ref={logoRef} />
          </View>
          <Text style={styles.stepTitle}>Ciao! Sono Moody.</Text>
          <Text style={styles.stepSub}>
            Ti aiuto a trovare eventi perfetti per come ti senti in questo momento.
            {'\n\n'}In 60 secondi costruiamo insieme il tuo profilo.
          </Text>
          <View style={styles.nameWrap}>
            <Ionicons name="person-outline" size={18} color={Colors.textTertiary} />
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Come ti chiami? (opzionale)"
              placeholderTextColor={Colors.textTertiary}
              maxLength={50}
              returnKeyType="done"
              onSubmitEditing={goNext}
            />
          </View>
        </StepWrap>

        {/* ── Step 1: Vibe ── */}
        <StepWrap>
          <View style={styles.iconWrap}>
            <Ionicons name={STEP_ICONS.vibe} size={48} color={Colors.accent} />
          </View>
          <Text style={styles.stepTitle}>Qual è la tua vibe?</Text>
          <Text style={styles.stepSub}>Seleziona quelle che ti rappresentano di più. Puoi sceglierne quante vuoi.</Text>
          <View style={styles.vibeGrid}>
            {(Object.keys(VIBES) as Vibe[]).map((v) => {
              const cfg    = VIBES[v];
              const active = vibes.has(v);
              return (
                <TouchableOpacity
                  key={v}
                  style={[styles.vibeChip, { borderColor: active ? cfg.color : Colors.border, backgroundColor: active ? cfg.color + '22' : Colors.surface }]}
                  onPress={() => toggleVibe(v)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={cfg.icon as any} size={16} color={active ? cfg.color : Colors.textTertiary} />
                  <Text style={[styles.vibeLabel, { color: active ? cfg.color : Colors.textSecondary }]}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </StepWrap>

        {/* ── Step 2: Budget ── */}
        <StepWrap>
          <View style={styles.iconWrap}>
            <Ionicons name={STEP_ICONS.budget} size={48} color={Colors.accent} />
          </View>
          <Text style={styles.stepTitle}>Quanto vuoi spendere?</Text>
          <Text style={styles.stepSub}>Di solito, per una serata fuori mi spendo…</Text>
          <View style={styles.budgetList}>
            {BUDGET_OPTIONS.map((b) => (
              <TouchableOpacity
                key={b.key}
                style={[styles.budgetRow, budget === b.key && styles.budgetRowActive]}
                onPress={() => setBudget(b.key)}
                activeOpacity={0.75}
              >
                <View style={[styles.budgetIcon, budget === b.key && styles.budgetIconActive]}>
                  <Ionicons name={b.icon} size={22} color={budget === b.key ? Colors.accentLight : Colors.textTertiary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.budgetLabel, budget === b.key && styles.budgetLabelActive]}>{b.label}</Text>
                  <Text style={styles.budgetSub}>{b.sub}</Text>
                </View>
                {budget === b.key && <Ionicons name="checkmark-circle" size={22} color={Colors.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </StepWrap>

        {/* ── Step 3: Distanza ── */}
        <StepWrap>
          <View style={styles.iconWrap}>
            <Ionicons name={STEP_ICONS.distanza} size={48} color={Colors.accent} />
          </View>
          <Text style={styles.stepTitle}>Quanto ti sposti?</Text>
          <Text style={styles.stepSub}>Distanza massima che sei disposto a percorrere per un evento.</Text>
          <View style={styles.distanceGrid}>
            {DISTANCE_OPTIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.distanceChip, distance === d && styles.distanceChipActive]}
                onPress={() => setDistance(d)}
                activeOpacity={0.75}
              >
                <Text style={[styles.distanceValue, distance === d && styles.distanceValueActive]}>
                  {d === 100 ? '100+' : d}
                </Text>
                <Text style={[styles.distanceUnit, distance === d && styles.distanceUnitActive]}>km</Text>
              </TouchableOpacity>
            ))}
          </View>
        </StepWrap>

        {/* ── Step 4: Energia + Socialità ── */}
        <StepWrap>
          <View style={styles.iconWrap}>
            <Ionicons name={STEP_ICONS.energia} size={48} color={Colors.accent} />
          </View>
          <Text style={styles.stepTitle}>Che tipo sei?</Text>
          <Text style={styles.stepSub}>Aiutaci a capire il tuo stile per calibrare i suggerimenti.</Text>

          <View style={styles.levelSection}>
            <Text style={styles.levelTitle}>Energia</Text>
            <Text style={styles.levelSub}>Preferisci serate tranquille o piene di adrenalina?</Text>
            <LevelSelector value={energy} onChange={setEnergy} lowLabel="Relax" highLabel="Adrenalina" color={Colors.vibe.energetic} />
          </View>

          <View style={styles.levelSection}>
            <Text style={styles.levelTitle}>Socialità</Text>
            <Text style={styles.levelSub}>Preferisci eventi intimi o grandi assembramenti?</Text>
            <LevelSelector value={social} onChange={setSocial} lowLabel="Intimo" highLabel="Folla" color={Colors.vibe.social} />
          </View>

          <View style={styles.levelSection}>
            <Text style={styles.levelTitle}>Voglia di scoprire</Text>
            <Text style={styles.levelSub}>Quanto ti piace uscire dalla tua comfort zone?</Text>
            <LevelSelector value={exploration} onChange={setExploration} lowLabel="Solito" highLabel="Avventuroso" color={Colors.accent} />
          </View>
        </StepWrap>

      </Animated.View>

      {/* Navigation */}
      <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom + 12, 28) }]}>
        {stepIdx > 0
          ? (
            <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.75}>
              <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )
          : <View style={{ width: 48 }} />
        }

        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.dot, i === stepIdx && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.nextBtn, saving && { opacity: 0.6 }]}
          onPress={goNext}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator size="small" color={Colors.text} />
            : isLast
              ? <Text style={styles.nextBtnText}>Inizia</Text>
              : <Ionicons name="arrow-forward" size={20} color={Colors.text} />
          }
        </TouchableOpacity>
      </View>

    </KeyboardAvoidingView>
  );
}

// ─── LevelSelector ────────────────────────────────────────────────────────────

function LevelSelector({ value, onChange, lowLabel, highLabel, color }: {
  value: number; onChange: (v: number) => void;
  lowLabel: string; highLabel: string; color: string;
}) {
  return (
    <View style={lv.wrap}>
      <View style={lv.row}>
        {LEVEL_STEPS.map((step) => (
          <TouchableOpacity
            key={step}
            style={[lv.dot, { borderColor: color, backgroundColor: value === step ? color : 'transparent' }]}
            onPress={() => onChange(step)}
            activeOpacity={0.75}
          />
        ))}
      </View>
      <View style={lv.labels}>
        <Text style={lv.label}>{lowLabel}</Text>
        <Text style={[lv.current, { color }]}>{LEVEL_LABELS[LEVEL_STEPS.indexOf(value)] ?? 'Medio'}</Text>
        <Text style={lv.label}>{highLabel}</Text>
      </View>
    </View>
  );
}
const lv = StyleSheet.create({
  wrap:    { gap: 10 },
  row:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  dot:     { width: 32, height: 32, borderRadius: 16, borderWidth: 2.5 },
  labels:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label:   { fontSize: 11, color: Colors.textTertiary },
  current: { fontSize: 13, fontWeight: '700' },
});

// ─── LogoAnimated ─────────────────────────────────────────────────────────────

interface LogoAnimatedRef {
  playExit:  (onDone: () => void) => void;
  playEnter: () => void;
}

const LogoAnimated = React.forwardRef<LogoAnimatedRef>(function LogoAnimated(_, ref) {
  const scale    = useRef(new Animated.Value(1)).current;
  const opacity  = useRef(new Animated.Value(0.78)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const loopAnim = useRef<Animated.CompositeAnimation | null>(null);

  // inputRange [-1,0,1] → ['-360deg','0deg','360deg']:
  //   exit usa 0→1 (senso orario), enter usa -1→0 (antiorario → stessa direzione visiva)
  const rotateStr = rotation.interpolate({
    inputRange:  [-1, 0, 1],
    outputRange: ['-360deg', '0deg', '360deg'],
  });

  const startIdle = useCallback(() => {
    loopAnim.current?.stop();
    loopAnim.current = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.10, duration: 2000, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 1.0,  duration: 2000, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale,   { toValue: 1.0,  duration: 2000, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.78, duration: 2000, useNativeDriver: true }),
        ]),
      ]),
    );
    loopAnim.current.start();
  }, [scale, opacity]);

  useEffect(() => {
    startIdle();
    return () => { loopAnim.current?.stop(); };
  }, [startIdle]);

  useImperativeHandle(ref, () => ({
    playExit: (onDone: () => void) => {
      loopAnim.current?.stop();
      Animated.parallel([
        Animated.timing(rotation, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(scale,    { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity,  { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => onDone());
    },
    playEnter: () => {
      loopAnim.current?.stop();
      // Parte da invisibile e ruotato di -360° (antiorario)
      rotation.setValue(-1);
      scale.setValue(0);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(rotation, { toValue: 0,    duration: 500, useNativeDriver: true }),
        Animated.spring(scale,    { toValue: 1,    friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(opacity,  { toValue: 0.78, duration: 400, useNativeDriver: true }),
      ]).start(() => startIdle());
    },
  }), [rotation, scale, opacity, startIdle]);

  return (
    <Animated.View style={{ transform: [{ scale }, { rotate: rotateStr }], opacity, marginBottom: 50 }}>
      <Image
        source={require('../assets/moody_solo_1024.png')}
        style={la.logo}
        resizeMode="contain"
      />
    </Animated.View>
  );
});

const la = StyleSheet.create({
  logo: { width: 160, height: 160 },
});

// ─── StepWrap ─────────────────────────────────────────────────────────────────

function StepWrap({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      style={{ width: SCREEN_W }}
      contentContainerStyle={sw.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}
const sw = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 28,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 20,
  },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: Colors.background },

  progressBar:  { height: 3, backgroundColor: Colors.border },
  progressFill: { height: 3, backgroundColor: Colors.accent },

  slider:       { flexDirection: 'row', flex: 1 },

  iconWrap:     { alignItems: 'center', paddingVertical: 4 },

  stepTitle:    { fontSize: 26, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  stepSub:      { fontSize: 15, color: Colors.textSecondary, lineHeight: 22, marginTop: -8 },

  nameWrap:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.card, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, paddingVertical: 14 },
  nameInput:    { flex: 1, fontSize: 16, color: Colors.text },

  vibeGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  vibeChip:     { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 99, borderWidth: 1.5 },
  vibeLabel:    { fontSize: 14, fontWeight: '600' },

  budgetList:       { gap: 10 },
  budgetRow:        { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  budgetRowActive:  { borderColor: Colors.accent, backgroundColor: Colors.accentDim },
  budgetIcon:       { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.card },
  budgetIconActive: { backgroundColor: Colors.accentDim },
  budgetLabel:      { fontSize: 15, fontWeight: '700', color: Colors.text },
  budgetLabelActive:{ color: Colors.accentLight },
  budgetSub:        { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },

  distanceGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  distanceChip:        { width: 90, height: 90, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.border, backgroundColor: Colors.surface },
  distanceChipActive:  { borderColor: Colors.accent, backgroundColor: Colors.accentDim },
  distanceValue:       { fontSize: 24, fontWeight: '800', color: Colors.textSecondary },
  distanceValueActive: { color: Colors.accentLight },
  distanceUnit:        { fontSize: 12, color: Colors.textTertiary, marginTop: -2 },
  distanceUnitActive:  { color: Colors.accent },

  levelSection: { gap: 10, backgroundColor: Colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.cardBorder },
  levelTitle:   { fontSize: 14, fontWeight: '700', color: Colors.text },
  levelSub:     { fontSize: 12, color: Colors.textSecondary, marginTop: -6 },

  nav:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.background },
  backBtn:      { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  dots:         { flexDirection: 'row', gap: 6 },
  dot:          { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive:    { width: 20, backgroundColor: Colors.accent },
  nextBtn:      { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accent },
  nextBtnText:  { fontSize: 14, fontWeight: '700', color: Colors.text },
});

// ─── ProcessingOverlay ────────────────────────────────────────────────────────

interface ProcessingOverlayProps {
  messages: ProcessingMessage[];
  onDone: () => void;
  insetTop: number;
  insetBottom: number;
}

function ProcessingOverlay({ messages, onDone, insetTop, insetBottom }: ProcessingOverlayProps) {
  const [idx,     setIdx]     = useState(0);
  const scaleAnim   = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const runMessage = useCallback((i: number) => {
    scaleAnim.setValue(0.6);
    opacityAnim.setValue(0);
    setIdx(i);

    Animated.sequence([
      // Pop in
      Animated.parallel([
        Animated.spring(scaleAnim,   { toValue: 1,   friction: 6, tension: 120, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1,   duration: 180, useNativeDriver: true }),
      ]),
      // Hold
      Animated.delay(messages[i]?.hold ?? 800),
      // Pop out
      Animated.parallel([
        Animated.timing(scaleAnim,   { toValue: 0.6, duration: 160, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 0,   duration: 160, useNativeDriver: true }),
      ]),
    ]).start(() => {
      if (i < messages.length - 1) {
        runMessage(i + 1);
      } else {
        onDone();
      }
    });
  }, [messages, onDone, scaleAnim, opacityAnim]);

  useEffect(() => { runMessage(0); }, [runMessage]);

  const msg = messages[idx];
  if (!msg) return null;

  return (
    <View style={[po.root, { paddingTop: insetTop, paddingBottom: insetBottom }]}>
      <Animated.View style={[po.content, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
        <View style={po.iconCircle}>
          <Ionicons name={msg.icon} size={52} color={Colors.accent} />
        </View>
        <Text style={po.text}>{msg.text}</Text>
      </Animated.View>

      {/* Dots progress */}
      <View style={po.dots}>
        {messages.map((_, i) => (
          <View key={i} style={[po.dot, i === idx && po.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const po = StyleSheet.create({
  root:       { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 40 },
  content:    { alignItems: 'center', gap: 24, width: '100%' },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.accentDim, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.accent + '44' },
  text:       { fontSize: 22, fontWeight: '700', color: Colors.text, textAlign: 'center', lineHeight: 32, letterSpacing: -0.3 },
  dots:       { position: 'absolute', bottom: 40, flexDirection: 'row', gap: 6 },
  dot:        { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.border },
  dotActive:  { width: 16, backgroundColor: Colors.accent },
});
