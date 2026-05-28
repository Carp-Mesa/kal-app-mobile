import { useExerciseSuggestions } from '@/src/hooks/useExerciseSuggestions';
import { useProfileStore } from '@/src/store/useProfileStore';
import { useShadowSyncStore } from '@/src/store/useShadowSyncStore';
import { useWorkoutStore } from '@/src/store/useWorkoutStore';
import { useLiveWorkoutStore } from '@/src/store/useLiveWorkoutStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useNavigation } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Alert,
  Vibration,
} from 'react-native';
import { Button, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';

// ═══════════════════════════════════════════════════════════════════════════════
// Design Tokens (Cloned exactly from new.tsx)
// ═══════════════════════════════════════════════════════════════════════════════

const CYBER = '#CCFF00';
const BLACK = '#000000';
const CARD_BG = '#1A1A1A';
const BORDER = 'rgba(255,255,255,0.15)';
const SILVER = '#888888';
const WHITE = '#FFFFFF';
const MUTED = '#444444';
const ERROR_RED = '#FF4444';

const CARD_STYLE = {
  backgroundColor: CARD_BG,
  borderColor: BORDER,
  borderWidth: 1.5,
  borderRadius: 20,
  padding: 20,
  marginBottom: 20,
};

const OUTLINE_STYLE = {
  borderRadius: 12,
  borderColor: BORDER,
  borderWidth: 1.5,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

const getLocalDateString = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDisplayDate = (): string => {
  const d = new Date();
  return d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long' })
    .replace(/^\w/, c => c.toUpperCase());
};

const filterInteger = (text: string): string => text.replace(/[^0-9]/g, '');
const filterDecimal = (text: string): string => {
  let cleaned = text.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
  return cleaned;
};

const formatStopwatch = (totalSec: number): string => {
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  
  const mStr = String(mins).padStart(2, '0');
  const sStr = String(secs).padStart(2, '0');
  
  if (hrs > 0) {
    const hStr = String(hrs).padStart(2, '0');
    return `${hStr}:${mStr}:${sStr}`;
  }
  return `${mStr}:${sStr}`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// LiveSetRow — Data-table row with completion checkbox
// ═══════════════════════════════════════════════════════════════════════════════

interface LiveSetRowProps {
  setId: string;
  setIndex: number;
  reps: string;
  weightKg: string;
  onUpdateSet: (exerciseId: string, setId: string, field: 'reps' | 'weight_kg', value: string) => void;
  onRemoveSet: (exerciseId: string, setId: string) => void;
  onAddSet?: (exerciseId: string) => void;
  canRemove: boolean;
  isLast: boolean;
  exerciseId: string;
}

const LiveSetRow = memo(function LiveSetRow({
  setId,
  setIndex,
  reps,
  weightKg,
  onUpdateSet,
  onRemoveSet,
  onAddSet,
  canRemove,
  isLast,
  exerciseId,
}: LiveSetRowProps) {
  const [localReps, setLocalReps] = useState(reps);
  const [localWeight, setLocalWeight] = useState(weightKg);
  const repsFocused = useRef(false);
  const weightFocused = useRef(false);

  useEffect(() => { if (!repsFocused.current) setLocalReps(reps); }, [reps]);
  useEffect(() => { if (!weightFocused.current) setLocalWeight(weightKg); }, [weightKg]);

  return (
    <View style={s.setTableRow}>
      {/* Serie index number */}
      <Text style={s.serieLabel}>{setIndex + 1}</Text>

      {/* REPS input */}
      <TextInput
        mode="outlined"
        dense
        placeholder="0"
        value={localReps}
        onChangeText={(t) => {
          const filtered = filterInteger(t);
          setLocalReps(filtered);
          repsFocused.current = true;
          onUpdateSet(exerciseId, setId, 'reps', filtered);
        }}
        onFocus={() => { repsFocused.current = true; }}
        onBlur={() => { repsFocused.current = false; setLocalReps(reps); }}
        keyboardType="numeric"
        style={s.setField}
        theme={{ colors: { primary: CYBER, onSurfaceVariant: SILVER, onSurface: WHITE } }}
        outlineStyle={OUTLINE_STYLE}
        textColor={WHITE}
      />

      {/* KG input */}
      <TextInput
        mode="outlined"
        dense
        placeholder="0"
        value={localWeight}
        onChangeText={(t) => {
          const filtered = filterDecimal(t);
          setLocalWeight(filtered);
          weightFocused.current = true;
          onUpdateSet(exerciseId, setId, 'weight_kg', filtered);
        }}
        onFocus={() => { weightFocused.current = true; }}
        onBlur={() => { weightFocused.current = false; setLocalWeight(weightKg); }}
        keyboardType="decimal-pad"
        style={s.setField}
        theme={{ colors: { primary: CYBER, onSurfaceVariant: SILVER, onSurface: WHITE } }}
        outlineStyle={OUTLINE_STYLE}
        textColor={WHITE}
      />

      {/* Last row: + button. Others: remove button */}
      {isLast ? (
        <Pressable onPress={() => onAddSet?.(exerciseId)} hitSlop={8} style={s.addSetIcon}>
          <MaterialCommunityIcons name="plus-circle-outline" size={20} color={CYBER} />
        </Pressable>
      ) : canRemove ? (
        <Pressable onPress={() => onRemoveSet(exerciseId, setId)} hitSlop={8} style={s.removeIcon}>
          <MaterialCommunityIcons name="close-circle-outline" size={16} color={SILVER} />
        </Pressable>
      ) : (
        <View style={{ width: 20 }} />
      )}
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// LiveRpeSelector Component
// ═══════════════════════════════════════════════════════════════════════════════

const LiveRpeSelector = memo(function LiveRpeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View>
      <Text style={s.fieldLabel}>RPE (Esfuerzo percibido durante el ejercicio)</Text>
      <View style={s.rpeRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => {
          const selected = value === String(n);
          return (
            <Pressable
              key={n}
              onPress={() => onChange(selected ? '' : String(n))}
              style={[s.rpeDot, selected && s.rpeDotActive]}
            >
              <Text style={[s.rpeText, selected && s.rpeTextActive]}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// LiveExerciseCard Component
// ═══════════════════════════════════════════════════════════════════════════════

interface LiveExerciseCardProps {
  exercise: any;
  index: number;
  suggestions: string[];
  onUpdateExercise: (id: string, field: 'name' | 'rpe', value: string) => void;
  onUpdateSet: (exerciseId: string, setId: string, field: 'reps' | 'weight_kg', value: string) => void;
  onAddSet: (exerciseId: string) => void;
  onRemoveSet: (exerciseId: string, setId: string) => void;
  onRemoveExercise: (id: string) => void;
  canRemove: boolean;
}

const LiveExerciseCard = memo(function LiveExerciseCard({
  exercise,
  index,
  suggestions,
  onUpdateExercise,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  canRemove,
}: LiveExerciseCardProps) {
  const [nameFocused, setNameFocused] = useState(false);
  const [localName, setLocalName] = useState(exercise.name);
  const nameFocusedRef = useRef(false);
  const justSelectedRef = useRef(false);

  useEffect(() => {
    if (!nameFocusedRef.current) setLocalName(exercise.name);
  }, [exercise.name]);

  const filteredSuggestions = useMemo(() => {
    const q = exercise.name.trim().toLowerCase();
    if (!q) return [];
    return suggestions.filter((s) => s.toLowerCase().includes(q)).slice(0, 6);
  }, [exercise.name, suggestions]);

  const showSuggestions = nameFocused && exercise.name.trim().length > 0 && filteredSuggestions.length > 0;

  // Real-time completed sets volume compilation (calculated automatically from valid sets)
  const totalVolume = useMemo(() => {
    return exercise.sets.reduce((sum: number, s: any) => {
      const r = Number(s.reps) || 0;
      const w = parseFloat(s.weight_kg) || 0;
      return sum + r * w;
    }, 0);
  }, [exercise.sets]);

  return (
    <View style={s.exerciseCard}>
      {/* Card Header */}
      <View style={s.exerciseCardHeader}>
        <View style={{ flex: 1 }}>
          <View style={s.inputGroup}>
            <Text style={s.inputLabel}>Nombre del ejercicio</Text>
            <TextInput
              mode="outlined"
              placeholder="Press banca..."
              value={localName}
              onChangeText={(t) => {
                setLocalName(t);
                nameFocusedRef.current = true;
                onUpdateExercise(exercise.id, 'name', t);
              }}
              onFocus={() => { setNameFocused(true); nameFocusedRef.current = true; }}
              onBlur={() => {
                nameFocusedRef.current = false;
                if (!justSelectedRef.current) setNameFocused(false);
                justSelectedRef.current = false;
                setLocalName(exercise.name);
              }}
              autoCapitalize="words"
              returnKeyType="done"
              style={{ backgroundColor: CARD_BG, height: 52 }}
              theme={{ colors: { primary: CYBER, onSurfaceVariant: SILVER, onSurface: WHITE } }}
              outlineStyle={OUTLINE_STYLE}
              textColor={WHITE}
            />
          </View>
        </View>

        {canRemove && (
          <Pressable onPress={() => onRemoveExercise(exercise.id)} hitSlop={10} style={{ paddingLeft: 12, marginTop: 22 }}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={MUTED} />
          </Pressable>
        )}
      </View>

      {/* Suggestions Overlay */}
      {showSuggestions && (
        <View style={s.suggestionsWrap}>
          {filteredSuggestions.map((sug) => (
            <Pressable
              key={sug}
              onPress={() => {
                justSelectedRef.current = true;
                onUpdateExercise(exercise.id, 'name', sug);
                setLocalName(sug);
                setNameFocused(false);
              }}
              style={s.suggestionPill}
            >
              <Text style={s.suggestionText}>{sug}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Sets Table */}
      <View style={s.setTable}>
        {/* Table Header aligned with checkbox-free columns */}
        <View style={s.setTableHeader}>
          <Text style={[s.setTableHeaderText, { flex: 0.6 }]}>SERIE</Text>
          <Text style={[s.setTableHeaderText, { flex: 1, textAlign: 'left' }]}>REPS</Text>
          <Text style={[s.setTableHeaderText, { flex: 1, textAlign: 'left' }]}>KG</Text>
          <View style={{ width: 20 }} />
        </View>

        {/* Set rows */}
        {exercise.sets.map((setItem: any, sIdx: number) => (
          <LiveSetRow
            key={setItem.id}
            setId={setItem.id}
            setIndex={sIdx}
            reps={setItem.reps}
            weightKg={setItem.weight_kg}
            onUpdateSet={onUpdateSet}
            onRemoveSet={onRemoveSet}
            onAddSet={onAddSet}
            canRemove={exercise.sets.length > 1}
            isLast={sIdx === exercise.sets.length - 1}
            exerciseId={exercise.id}
          />
        ))}
      </View>

      {/* RPE Selector */}
      <LiveRpeSelector
        value={exercise.rpe}
        onChange={(v) => onUpdateExercise(exercise.id, 'rpe', v)}
      />

      {/* Volume Badge */}
      {totalVolume > 0 && (
        <View style={s.volumeBadge}>
          <Text style={s.volumeText}>VOL {totalVolume.toLocaleString('es-CO')} kg</Text>
        </View>
      )}
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// LiveWorkoutScreen component
// ═══════════════════════════════════════════════════════════════════════════════

export default function LiveWorkoutScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const addWorkout = useWorkoutStore((state) => state.addWorkout);
  const profile = useProfileStore((state) => state.profile);
  
  // Live workout hooks
  const live = useLiveWorkoutStore();
  const { data: rawSuggestions = [] } = useExerciseSuggestions();

  const suggestions = useMemo(() => {
    return (rawSuggestions as any[]).map((s) =>
      typeof s === 'object' && s !== null ? s.name : String(s)
    );
  }, [rawSuggestions]);

  // Read config timer from profile. Default = 90 seconds (1:30 min)
  const restConfigSeconds = profile?.rest_time_seconds || 90;



  // Dynamic StopWatch ticks
  useEffect(() => {
    let interval: any;
    if (live.isActive) {
      interval = setInterval(() => {
        live.tickSecond();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [live.isActive]);

  // Dynamic RestTimer ticks
  useEffect(() => {
    let interval: any;
    if (live.restTimer.isActive) {
      interval = setInterval(() => {
        live.tickRestTimer();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [live.restTimer.isActive]);

  // Trigger vibration when RestTimer completes
  useEffect(() => {
    if (live.restTimer.isActive && live.restTimer.remaining === 0) {
      // Complete! Vibrate twice to warn user resting period ended
      Vibration.vibrate([0, 400, 150, 400]);
    }
  }, [live.restTimer.remaining, live.restTimer.isActive]);

  // Form modification callbacks
  const handleUpdateExercise = useCallback((id: string, field: 'name' | 'rpe', value: string) => {
    live.updateExerciseField(id, field, value);
  }, []);

  const handleUpdateSet = useCallback((exId: string, setId: string, field: 'reps' | 'weight_kg', value: string) => {
    live.updateSetField(exId, setId, field, value);
  }, []);

  // Confirm cancel dialog
  const handleCancelWorkout = () => {
    Alert.alert(
      '¿Cancelar Entrenamiento?',
      'Se perderá todo el progreso de la sesión en curso. Esta acción no se puede deshacer.',
      [
        { text: 'Continuar entrenando', style: 'cancel' },
        { 
          text: 'Sí, cancelar', 
          style: 'destructive',
          onPress: () => {
            live.cancelWorkout();
            router.replace('/(tabs)/workout');
          }
        }
      ]
    );
  };

  // Complete and log workout
  const handleFinishWorkout = () => {
    // 1. Validations: Make sure at least one set is completed
    let hasAnyCompleted = false;
    for (const ex of live.exercises) {
      for (const s of ex.sets) {
        if (Number(s.reps) > 0) {
          hasAnyCompleted = true;
          break;
        }
      }
    }

    if (!hasAnyCompleted) {
      Alert.alert(
        'Entrenamiento vacío',
        'Por favor, registra al menos una serie con repeticiones para poder guardar tu entrenamiento.'
      );
      return;
    }

    // 2. Filter exercises and sets that have been logged
    const exercisesPayload = live.exercises
      .filter(ex => ex.name.trim().length > 0)
      .map(ex => ({
        name: ex.name.trim(),
        sets: ex.sets
          .filter(s => Number(s.reps) > 0)
          .map(s => ({
            reps: Number(s.reps) || 0,
            weight_kg: parseFloat(s.weight_kg) || 0,
          })),
        ...(ex.rpe && { rpe: Number(ex.rpe) || undefined }),
      }))
      .filter(ex => ex.sets.length > 0);

    if (exercisesPayload.length === 0) {
      Alert.alert('Datos incompletos', 'Asegúrate de llenar las repeticiones y el peso de las series.');
      return;
    }

    // 4. Save workout log local-first
    const elapsedMins = Math.round(live.elapsedSeconds / 60) || 1;
    addWorkout({
      name: live.name.trim() || 'Entrenamiento en Vivo',
      date: getLocalDateString(),
      duration_mins: elapsedMins,
      notes: live.notes.trim() || undefined,
      exercises: exercisesPayload,
    });

    // 5. Sync to backend
    queueMicrotask(() => useShadowSyncStore.getState().enqueueSync());

    // 6. Reset live store
    live.finishWorkout();

    // 7. Success dialog and return
    Alert.alert('¡Excelente Trabajo! 🏆', 'Entrenamiento registrado con éxito. ¡Sigue superándote!');
    router.replace('/(tabs)/workout');
  };

  // If no session is currently active, show a beautiful, clean launch screen that matches CARD_STYLE perfectly.
  // The user can intentionally trigger the stopwatch and tracking from here.
  if (!live.isActive) {
    return (
      <View style={s.root}>
        {/* Custom Compact Header */}
        <View style={s.customHeader}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.customHeaderBackBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={CYBER} />
          </Pressable>
          <Text style={s.customHeaderTitle}>Entrenamiento en Vivo</Text>
        </View>

        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={[CARD_STYLE, { marginHorizontal: PAD, alignItems: 'center', paddingVertical: 40 }]}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(204, 255, 0, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
              <MaterialCommunityIcons name="lightning-bolt" size={36} color={CYBER} />
            </View>
            <Text style={[s.screenTitle, { fontSize: 18, color: WHITE, marginBottom: 12, textAlign: 'center', fontWeight: '800' }]}>
              Entrenamiento en Vivo
            </Text>
            <Text style={{ color: SILVER, fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 24, paddingHorizontal: 10 }}>
              Prepara tu mente y calienta tus músculos. Presiona el botón para iniciar el cronómetro dinámico y registrar tus series en tiempo real.
            </Text>
            <Button
              mode="contained"
              icon="play"
              buttonColor={CYBER}
              textColor={BLACK}
              onPress={() => live.startWorkout('Sesión en Vivo')}
              style={{ borderRadius: 14, height: 50, width: '90%', justifyContent: 'center' }}
              labelStyle={{ fontWeight: '800', fontSize: 14, letterSpacing: 1 }}
            >
              INICIAR ENTRENAMIENTO
            </Button>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Custom Compact Header */}
      <View style={s.customHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={s.customHeaderBackBtn}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={CYBER} />
          </Pressable>
          <Text style={s.customHeaderTitle}>Entrenamiento en Vivo</Text>
        </View>

        {/* Right-aligned rest timer badge */}
        {live.restTimer.isActive && live.restTimer.remaining > 0 && (
          <Pressable
            onPress={() => {
              live.stopRestTimer();
              Alert.alert('Descanso Cancelado', 'El temporizador de descanso ha sido detenido.');
            }}
            hitSlop={8}
            style={({ pressed }) => [
              s.headerRestBadge,
              pressed && { opacity: 0.7 }
            ]}
          >
            <MaterialCommunityIcons name="timer-sand" size={14} color={CYBER} style={{ marginRight: 4 }} />
            <Text style={s.headerRestText}>{formatStopwatch(live.restTimer.remaining)}</Text>
            <MaterialCommunityIcons name="close-circle" size={12} color={SILVER} style={{ marginLeft: 6 }} />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ═══ Info Card (Profile-style - Identical to new.tsx) ═══ */}
          <View style={CARD_STYLE}>
            <Text style={s.screenTitle}>Sesión en Vivo ⚡</Text>

            {/* Stopwatch & Calendar Date Info Row */}
            <View style={s.timerHeaderRow}>
              <View style={s.dateRow}>
                <MaterialCommunityIcons name="calendar-today" size={14} color={SILVER} />
                <Text style={s.dateText}>{formatDisplayDate()}</Text>
              </View>
              <View style={s.stopwatchContainer}>
                <MaterialCommunityIcons name="timer-outline" size={16} color={CYBER} style={{ marginRight: 6 }} />
                <Text style={s.stopwatchText}>{formatStopwatch(live.elapsedSeconds)}</Text>
              </View>
            </View>

            {/* Custom Rest Timer countdown launch trigger */}
            <View style={{ marginBottom: 16 }}>
              <Text style={s.inputLabel}>Iniciar Descanso</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button
                  mode="contained"
                  buttonColor="rgba(204, 255, 0, 0.08)"
                  textColor={CYBER}
                  onPress={() => live.startRestTimer(60)}
                  style={{ flex: 1, borderRadius: 12, height: 42, justifyContent: 'center', borderColor: 'rgba(204, 255, 0, 0.25)', borderWidth: 1 }}
                  labelStyle={{ fontWeight: '800', fontSize: 11 }}
                  disabled={live.restTimer.isActive}
                >
                  1 MIN ⏱️
                </Button>
                <Button
                  mode="contained"
                  buttonColor="rgba(204, 255, 0, 0.08)"
                  textColor={CYBER}
                  onPress={() => live.startRestTimer(120)}
                  style={{ flex: 1, borderRadius: 12, height: 42, justifyContent: 'center', borderColor: 'rgba(204, 255, 0, 0.25)', borderWidth: 1 }}
                  labelStyle={{ fontWeight: '800', fontSize: 11 }}
                  disabled={live.restTimer.isActive}
                >
                  2 MIN ⏱️
                </Button>
                <Button
                  mode="contained"
                  buttonColor="rgba(204, 255, 0, 0.08)"
                  textColor={CYBER}
                  onPress={() => live.startRestTimer(180)}
                  style={{ flex: 1, borderRadius: 12, height: 42, justifyContent: 'center', borderColor: 'rgba(204, 255, 0, 0.25)', borderWidth: 1 }}
                  labelStyle={{ fontWeight: '800', fontSize: 11 }}
                  disabled={live.restTimer.isActive}
                >
                  3 MIN ⏱️
                </Button>
              </View>
            </View>

            {/* Live Rest Countdowns */}
            {live.restTimer.isActive && (
              <View style={s.restOverlay}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="timer-sand" size={20} color={CYBER} style={s.pulsatingTimer} />
                  <View>
                    <Text style={s.restLabel}>DESCANSO ACTIVADO</Text>
                    <Text style={s.restValue}>{live.restTimer.remaining}s restantes</Text>
                  </View>
                </View>
                <Pressable onPress={() => live.stopRestTimer()} style={s.skipRestBtn}>
                  <Text style={s.skipRestText}>OMITIR</Text>
                </Pressable>
              </View>
            )}

            {/* Session Name input */}
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Nombre de la sesión</Text>
              <TextInput
                mode="outlined"
                value={live.name}
                onChangeText={(t) => live.updateName(t)}
                placeholder="Sesión de Fuerza..."
                style={s.cardInput}
                theme={{ colors: { primary: CYBER, onSurfaceVariant: SILVER, onSurface: WHITE } }}
                outlineStyle={OUTLINE_STYLE}
                textColor={WHITE}
                left={<TextInput.Icon icon="dumbbell" color={SILVER} />}
              />
            </View>

            {/* Live Report Notes block */}
            <View style={[s.inputGroup, { marginBottom: 0 }]}>
              <Text style={s.inputLabel}>Notas de la sesión</Text>
              <TextInput
                mode="outlined"
                placeholder="Escribe comentarios o notas del entrenamiento..."
                value={live.notes}
                onChangeText={(t) => live.updateNotes(t)}
                multiline
                numberOfLines={3}
                left={<TextInput.Icon icon="note-text-outline" color={SILVER} />}
                style={[s.cardInput, { height: 80 }]}
                contentStyle={{ textAlignVertical: 'top', paddingTop: 8, paddingBottom: 8 }}
                theme={{ colors: { primary: CYBER, onSurfaceVariant: SILVER, onSurface: WHITE } }}
                outlineStyle={OUTLINE_STYLE}
                textColor={WHITE}
              />
            </View>
          </View>

          {/* ═══ Exercises Section ═══ */}
          <View style={s.exercisesHeader}>
            <Text style={s.sectionLabel}>
              EJERCICIOS ({live.exercises.length})
            </Text>
          </View>

          {live.exercises.map((ex, index) => (
            <LiveExerciseCard
              key={ex.id}
              exercise={ex}
              index={index}
              suggestions={suggestions}
              onUpdateExercise={handleUpdateExercise}
              onUpdateSet={handleUpdateSet}
              onAddSet={live.addSet}
              onRemoveSet={live.removeSet}
              onRemoveExercise={live.removeExercise}
              canRemove={live.exercises.length > 1}
            />
          ))}

          {/* Add Exercise trigger */}
          <Pressable onPress={() => live.addExercise()} style={s.addExerciseBtn}>
            <MaterialCommunityIcons name="plus" size={18} color={CYBER} />
            <Text style={s.addExerciseText}>AÑADIR EJERCICIO</Text>
          </Pressable>

          {/* ACTION BUTTONS (Match the gorgeous new styles) */}
          <View style={{ marginTop: 24, gap: 12 }}>
            <Button
              mode="contained"
              onPress={handleFinishWorkout}
              buttonColor={CYBER}
              textColor={BLACK}
              labelStyle={{ fontWeight: '800', fontSize: 14 }}
              style={{ borderRadius: 14, height: 50, justifyContent: 'center' }}
            >
              FINALIZAR ENTRENAMIENTO
            </Button>

            <Button
              mode="outlined"
              onPress={handleCancelWorkout}
              textColor={ERROR_RED}
              style={{ borderRadius: 14, height: 48, borderColor: ERROR_RED, borderWidth: 1.5, justifyContent: 'center' }}
              labelStyle={{ fontWeight: '700' }}
            >
              CANCELAR ENTRENAMIENTO
            </Button>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles (Mirrors new.tsx perfectly, with checklist capabilities)
// ═══════════════════════════════════════════════════════════════════════════════

const PAD = 16;

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BLACK,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    backgroundColor: BLACK,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  customHeaderBackBtn: {
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customHeaderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: WHITE,
  },
  headerRestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(204, 255, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(204, 255, 0, 0.35)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerRestText: {
    color: CYBER,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },
  scrollContent: {
    paddingHorizontal: PAD,
    paddingTop: 12,
    paddingBottom: 24,
  },

  // ── Header ───────────────────────────────────────────────────────────────────
  screenTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: CYBER,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginLeft: 2,
  },

  // ── Info Card ────────────────────────────────────────────────────────────────
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: SILVER,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
    marginLeft: 2,
    textTransform: 'uppercase',
  },
  cardInput: {
    backgroundColor: CARD_BG,
    height: 52,
  },
  timerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
    marginLeft: 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: SILVER,
    fontWeight: '600',
    fontFamily: 'SpaceMono',
    textTransform: 'capitalize',
  },
  stopwatchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(204, 255, 0, 0.1)',
    borderColor: 'rgba(204, 255, 0, 0.25)',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stopwatchText: {
    fontSize: 13,
    color: CYBER,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
  },

  // ── Rest Countdown ───────────────────────────────────────────────────────────
  restOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F1D00',
    borderColor: CYBER,
    borderWidth: 1.5,
    borderRadius: 14,
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  restLabel: {
    color: '#88AA00',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  restValue: {
    color: CYBER,
    fontSize: 14,
    fontWeight: '800',
  },
  skipRestBtn: {
    backgroundColor: 'rgba(204, 255, 0, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  skipRestText: {
    color: CYBER,
    fontSize: 12,
    fontWeight: '700',
  },
  pulsatingTimer: {
    transform: [{ scale: 1.1 }],
  },

  // ── Exercises header ─────────────────────────────────────────────────────────
  exercisesHeader: {
    marginTop: 8,
    marginBottom: 16,
    marginLeft: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: SILVER,
    letterSpacing: 1.5,
  },

  // ── Exercise Card ────────────────────────────────────────────────────────────
  exerciseCard: {
    backgroundColor: CARD_BG,
    borderWidth: 1.5,
    borderColor: BORDER,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  // ── Suggestions ──────────────────────────────────────────────────────────────
  suggestionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
  },
  suggestionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: 'rgba(204,255,0,0.08)',
  },
  suggestionText: {
    fontSize: 12,
    color: CYBER,
    fontWeight: '600',
  },

  // ── Sets Table ───────────────────────────────────────────────────────────────
  setTable: {
    marginTop: 12,
  },
  setTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  setTableHeaderText: {
    fontSize: 9,
    fontWeight: '700',
    color: SILVER,
    letterSpacing: 1.2,
  },
  setTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  completedRow: {
    opacity: 0.6,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: SILVER,
  },
  checkButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginLeft: 2,
  },
  serieLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: WHITE,
    width: 22,
    textAlign: 'center',
    fontFamily: 'SpaceMono',
    marginLeft: 5,
    marginRight: 20,
  },
  setField: {
    width: 90,
    backgroundColor: CARD_BG,
    height: 40,
  },
  removeIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addSetIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── RPE ──────────────────────────────────────────────────────────────────────
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: SILVER,
    letterSpacing: 1.5,
    marginBottom: 4,
    marginTop: 12,
  },
  rpeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  rpeDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeDotActive: {
    backgroundColor: CYBER,
  },
  rpeText: {
    fontSize: 12,
    fontWeight: '700',
    color: MUTED,
  },
  rpeTextActive: {
    color: BLACK,
  },

  // ── Volume Badge ─────────────────────────────────────────────────────────────
  volumeBadge: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(204,255,0,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  volumeText: {
    fontSize: 10,
    fontWeight: '700',
    color: CYBER,
    letterSpacing: 0.5,
    fontFamily: 'SpaceMono',
  },

  // ── Add Exercise ─────────────────────────────────────────────────────────────
  addExerciseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: CYBER,
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 12,
  },
  addExerciseText: {
    fontSize: 12,
    fontWeight: '700',
    color: CYBER,
    letterSpacing: 1.5,
  },
});
