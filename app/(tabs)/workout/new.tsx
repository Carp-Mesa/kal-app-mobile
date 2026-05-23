import { useExerciseSuggestions } from '@/src/hooks/useExerciseSuggestions';
import { useShake } from '@/src/hooks/useShake';
import { useAppStore } from '@/src/store/useAppStore';
import { useShadowSyncStore } from '@/src/store/useShadowSyncStore';
import { useWorkoutStore } from '@/src/store/useWorkoutStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Snackbar, Text, TextInput } from 'react-native-paper';
import Animated from 'react-native-reanimated';

// ═══════════════════════════════════════════════════════════════════════════════
// Design Tokens
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
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface SetForm {
  id: string;
  reps: string;
  weight_kg: string;
}

interface ExerciseForm {
  id: string;
  name: string;
  sets: SetForm[];
  rpe: string;
}

interface WorkoutForm {
  name: string;
  notes: string;
  duration_mins: string;
  exercises: ExerciseForm[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

const uid = (): string => Date.now().toString() + Math.random().toString(36).slice(2);

const createEmptySet = (): SetForm => ({ id: uid(), reps: '', weight_kg: '' });

const createInheritedSet = (previous?: SetForm): SetForm => ({
  id: uid(),
  reps: previous?.reps ?? '',
  weight_kg: previous?.weight_kg ?? '',
});

const createEmptyExercise = (): ExerciseForm => ({
  id: uid(),
  name: '',
  sets: [createEmptySet()],
  rpe: '',
});

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

const initialForm = (): WorkoutForm => ({
  name: '',
  notes: '',
  duration_mins: '',
  exercises: [createEmptyExercise()],
});

const filterInteger = (text: string): string => text.replace(/[^0-9]/g, '');
const filterDecimal = (text: string): string => {
  let cleaned = text.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) cleaned = parts[0] + '.' + parts.slice(1).join('');
  return cleaned;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SetRow — Data-table row
// ═══════════════════════════════════════════════════════════════════════════════

interface SetRowProps {
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
  hasRepsError?: boolean;
  hasWeightError?: boolean;
}

const SetRow = memo(function SetRow({
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
  hasRepsError,
  hasWeightError,
}: SetRowProps) {
  const [localReps, setLocalReps] = useState(reps);
  const [localWeight, setLocalWeight] = useState(weightKg);
  const repsFocused = useRef(false);
  const weightFocused = useRef(false);

  useEffect(() => { if (!repsFocused.current) setLocalReps(reps); }, [reps]);
  useEffect(() => { if (!weightFocused.current) setLocalWeight(weightKg); }, [weightKg]);

  const repsOutlineColor = hasRepsError ? ERROR_RED : BORDER;
  const weightOutlineColor = hasWeightError ? ERROR_RED : BORDER;

  return (
    <View style={s.setTableRow}>
      {/* Serie number — non-editable */}
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
        returnKeyType="next"
        style={s.setField}
        theme={{ colors: { primary: hasRepsError ? ERROR_RED : CYBER, onSurfaceVariant: SILVER, onSurface: WHITE } }}
        outlineStyle={{ ...OUTLINE_STYLE, borderColor: repsOutlineColor }}
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
        returnKeyType="done"
        style={s.setField}
        theme={{ colors: { primary: hasWeightError ? ERROR_RED : CYBER, onSurfaceVariant: SILVER, onSurface: WHITE } }}
        outlineStyle={{ ...OUTLINE_STYLE, borderColor: weightOutlineColor }}
        textColor={WHITE}
      />

      {/* Last row: + button. Others: remove button */}
      {isLast ? (
        <Pressable onPress={() => onAddSet?.(exerciseId)} hitSlop={8} style={s.addSetIcon}>
          <MaterialCommunityIcons name="plus-circle-outline" size={20} color={CYBER} />
        </Pressable>
      ) : canRemove ? (
        <Pressable onPress={() => onRemoveSet(exerciseId, setId)} hitSlop={8} style={s.removeIcon}>
          <MaterialCommunityIcons name="close-circle-outline" size={16} color={MUTED} />
        </Pressable>
      ) : (
        <View style={{ width: 16 }} />
      )}
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// RPE Selector
// ═══════════════════════════════════════════════════════════════════════════════

const RPE_SELECTOR = memo(function RpeSelector({
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
// ExerciseCard
// ═══════════════════════════════════════════════════════════════════════════════

interface ExerciseCardProps {
  exercise: ExerciseForm;
  exerciseId: string;
  index: number;
  onUpdateExercise: (id: string, field: 'name' | 'rpe', value: string) => void;
  onUpdateSet: (exerciseId: string, setId: string, field: 'reps' | 'weight_kg', value: string) => void;
  onAddSet: (exerciseId: string) => void;
  onRemoveSet: (exerciseId: string, setId: string) => void;
  onRemoveExercise: (id: string) => void;
  canRemove: boolean;
  suggestions: string[];
  hasNameError?: boolean;
  invalidSetIds?: { reps?: string[]; weight?: string[] };
}

const ExerciseCard = memo(function ExerciseCard({
  exercise,
  exerciseId,
  index,
  onUpdateExercise,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
  onRemoveExercise,
  canRemove,
  suggestions,
  hasNameError,
  invalidSetIds,
}: ExerciseCardProps) {
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

  const totalVolume = exercise.sets.reduce((sum, s) => {
    const r = Number(s.reps) || 0;
    const w = parseFloat(s.weight_kg) || 0;
    return sum + r * w;
  }, 0);

  const nameOutlineColor = hasNameError ? ERROR_RED : BORDER;

  return (
    <View style={s.exerciseCard}>
      {/* Header — Delete on right */}
      <View style={s.exerciseCardHeader}>
        <View style={{ flex: 1 }}>
          <TextInput
            mode="outlined"
            label="Nombre del ejercicio"
            placeholder="Press banca..."
            value={localName}
            onChangeText={(t) => {
              setLocalName(t);
              nameFocusedRef.current = true;
              onUpdateExercise(exerciseId, 'name', t);
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
            style={{ backgroundColor: 'transparent', marginBottom: showSuggestions ? 4 : 12, marginTop: -5 }}
            theme={{ colors: { primary: hasNameError ? ERROR_RED : CYBER, onSurfaceVariant: SILVER, onSurface: WHITE } }}
            outlineStyle={{ ...OUTLINE_STYLE, borderColor: nameOutlineColor }}
            textColor={WHITE}
          />
        </View>

        {canRemove && (
          <Pressable onPress={() => onRemoveExercise(exerciseId)} hitSlop={10} style={{ paddingLeft: 12 }}>
            <MaterialCommunityIcons name="trash-can-outline" size={18} color={MUTED} />
          </Pressable>
        )}
      </View>

      {/* Suggestions */}
      {showSuggestions && (
        <View style={s.suggestionsWrap}>
          {filteredSuggestions.map((sug) => (
            <Pressable
              key={sug}
              onPress={() => {
                justSelectedRef.current = true;
                onUpdateExercise(exerciseId, 'name', sug);
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

      {/* Sets table */}
      <View style={s.setTable}>
        <View style={s.setTableHeader}>
          <Text style={[s.setTableHeaderText, { flex: 0.6 }]}>SERIE</Text>
          <Text style={[s.setTableHeaderText, { flex: 1, textAlign: 'left' }]}>REPS</Text>
          <Text style={[s.setTableHeaderText, { flex: 1, textAlign: 'left' }]}>KG</Text>
          <View style={{ width: 16 }} />
        </View>

        {exercise.sets.map((setItem, sIdx) => (
          <SetRow
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
            exerciseId={exerciseId}
            hasRepsError={invalidSetIds?.reps?.includes(setItem.id)}
            hasWeightError={invalidSetIds?.weight?.includes(setItem.id)}
          />
        ))}
      </View>

      {/* RPE Selector */}
      <RPE_SELECTOR
        value={exercise.rpe}
        onChange={(v) => onUpdateExercise(exerciseId, 'rpe', v)}
      />

      {/* Volume badge */}
      {totalVolume > 0 && (
        <View style={s.volumeBadge}>
          <Text style={s.volumeText}>VOL {totalVolume.toLocaleString('es-CO')} kg</Text>
        </View>
      )}
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// Screen
// ═══════════════════════════════════════════════════════════════════════════════

export default function NewWorkoutScreen() {
  const addWorkout = useWorkoutStore((state) => state.addWorkout);
  const scrollRef = useRef<ScrollView>(null);
  const { data: rawSuggestions = [] } = useExerciseSuggestions();
  const { shake, animatedStyle } = useShake();

  // ── Workout store integration ─────────────────────────────────────────────
  const triggerSaveWorkout = useAppStore(state => state.triggerSaveWorkout);
  const setModalValidationError = useAppStore(state => state.setModalValidationError);
  const triggerRef = useRef(triggerSaveWorkout);
  const handleSaveRef = useRef<() => Promise<void>>(async () => {});

  const suggestions = useMemo(() => {
    return (rawSuggestions as any[]).map((s) =>
      typeof s === 'object' && s !== null ? s.name : String(s)
    );
  }, [rawSuggestions]);

  const [form, setForm] = useState<WorkoutForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [validationErrors, setValidationErrors] = useState<{
    exerciseNameIds: string[];
    setRepsIds: string[];
    setWeightIds: string[];
  }>({ exerciseNameIds: [], setRepsIds: [], setWeightIds: [] });

  // ── Compute validation state continuously ─────────────────────────────────
  const { isFormValid, firstInvalidExerciseId } = useMemo(() => {
    const exerciseNameIds: string[] = [];
    const setRepsIds: string[] = [];
    const setWeightIds: string[] = [];

    if (!form.name.trim()) return { isFormValid: false, firstInvalidExerciseId: null };
    if (form.exercises.length === 0) return { isFormValid: false, firstInvalidExerciseId: null };

    let firstInvalidId: string | null = null;

    for (const ex of form.exercises) {
      if (!ex.name.trim()) {
        exerciseNameIds.push(ex.id);
        if (!firstInvalidId) firstInvalidId = ex.id;
      }
      if (ex.sets.length === 0) {
        if (!firstInvalidId) firstInvalidId = ex.id;
      }
      for (const setItem of ex.sets) {
        const repsNum = Number(setItem.reps) || 0;
        const weightNum = parseFloat(setItem.weight_kg) || 0;
        if (repsNum <= 0) {
          setRepsIds.push(setItem.id);
          if (!firstInvalidId) firstInvalidId = ex.id;
        }
        if (weightNum < 0) {
          setWeightIds.push(setItem.id);
          if (!firstInvalidId) firstInvalidId = ex.id;
        }
      }
    }

    const valid = exerciseNameIds.length === 0 && setRepsIds.length === 0 && setWeightIds.length === 0;
    return { isFormValid: valid, firstInvalidExerciseId: firstInvalidId };
  }, [form]);

  useEffect(() => {
    setModalValidationError(!isFormValid);
  }, [isFormValid, setModalValidationError]);

  useEffect(() => {
    setValidationErrors({ exerciseNameIds: [], setRepsIds: [], setWeightIds: [] });
  }, [form]);

  // ── Listen for save trigger from tab bar ──────────────────────────────────
  useEffect(() => {
    if (triggerSaveWorkout !== triggerRef.current) {
      triggerRef.current = triggerSaveWorkout;
      if (triggerSaveWorkout > 0) {
        handleSaveRef.current();
      }
    }
  }, [triggerSaveWorkout]);

  const updateWorkoutField = useCallback(
    (field: keyof Pick<WorkoutForm, 'name' | 'notes' | 'duration_mins'>, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const updateExerciseField = useCallback((id: string, field: 'name' | 'rpe', value: string) => {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => (ex.id === id ? { ...ex, [field]: value } : ex)),
    }));
  }, []);

  const updateSetField = useCallback(
    (exerciseId: string, setId: string, field: 'reps' | 'weight_kg', value: string) => {
      setForm((prev) => ({
        ...prev,
        exercises: prev.exercises.map((ex) =>
          ex.id === exerciseId
            ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)) }
            : ex,
        ),
      }));
    },
    [],
  );

  const addSet = useCallback((exerciseId: string) => {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) => {
        if (ex.id !== exerciseId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, createInheritedSet(lastSet)] };
      }),
    }));
  }, []);

  const removeSet = useCallback((exerciseId: string, setId: string) => {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id === exerciseId ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex,
      ),
    }));
  }, []);

  const addExercise = useCallback(() => {
    setForm((prev) => ({ ...prev, exercises: [...prev.exercises, createEmptyExercise()] }));
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, []);

  const removeExercise = useCallback((id: string) => {
    setForm((prev) => ({ ...prev, exercises: prev.exercises.filter((ex) => ex.id !== id) }));
  }, []);

  const computeValidationErrors = () => {
    const exerciseNameIds: string[] = [];
    const setRepsIds: string[] = [];
    const setWeightIds: string[] = [];

    for (const ex of form.exercises) {
      if (!ex.name.trim()) exerciseNameIds.push(ex.id);
      for (const setItem of ex.sets) {
        const repsNum = Number(setItem.reps) || 0;
        const weightNum = parseFloat(setItem.weight_kg) || 0;
        if (repsNum <= 0) setRepsIds.push(setItem.id);
        if (weightNum < 0) setWeightIds.push(setItem.id);
      }
    }
    return { exerciseNameIds, setRepsIds, setWeightIds };
  };

  const handleSave = async () => {
    const errs = computeValidationErrors();
    const hasErrors = errs.exerciseNameIds.length > 0 || errs.setRepsIds.length > 0 || errs.setWeightIds.length > 0;

    if (hasErrors) {
      setValidationErrors(errs);
      shake();
      if (firstInvalidExerciseId) {
        setTimeout(() => {
          const idx = form.exercises.findIndex((ex) => ex.id === firstInvalidExerciseId);
          if (idx >= 0 && scrollRef.current) {
            scrollRef.current.scrollTo({ y: idx * 400, animated: true });
          }
        }, 100);
      }
      return;
    }

    setValidationErrors({ exerciseNameIds: [], setRepsIds: [], setWeightIds: [] });

    // ── LOCAL-FIRST: Write to Zustand store synchronously ────────────
    const exercisesPayload = form.exercises.map((ex) => ({
      name: ex.name.trim(),
      sets: ex.sets.map((s) => ({
        reps: Number(s.reps) || 0,
        weight_kg: parseFloat(s.weight_kg) || 0,
      })),
      ...(ex.rpe && { rpe: Number(ex.rpe) || undefined }),
    }));

    addWorkout({
      name: form.name.trim(),
      date: getLocalDateString(),
      notes: form.notes.trim() || undefined,
      duration_mins: Number(form.duration_mins) || 0,
      exercises: exercisesPayload,
    });

    queueMicrotask(() => useShadowSyncStore.getState().enqueueSync());

    // Instant navigation — no HTTP await
    router.back();
  };
  handleSaveRef.current = handleSave;

  return (
    <View style={s.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ═══ Info Card (Profile-style) ═══ */}
          <View style={CARD_STYLE}>
            <Text style={s.screenTitle}>Registra tu entrenamiento</Text>
            <View style={s.dateRow}>
              <MaterialCommunityIcons name="calendar-today" size={14} color={SILVER} />
              <Text style={s.dateText}>{formatDisplayDate()}</Text>
            </View>

            <TextInput
              mode="outlined"
              label="Nombre de la sesión"
              placeholder="Push Day"
              value={form.name}
              onChangeText={(t) => updateWorkoutField('name', t)}
              autoCapitalize="words"
              returnKeyType="next"
              left={<TextInput.Icon icon="dumbbell" color={SILVER} />}
              style={s.cardInput}
              theme={{ colors: { primary: CYBER, onSurfaceVariant: SILVER, onSurface: WHITE } }}
              outlineStyle={OUTLINE_STYLE}
              textColor={WHITE}
            />

            <TextInput
              mode="outlined"
              label="Duración (min)"
              placeholder="60"
              value={form.duration_mins}
              onChangeText={(t) => updateWorkoutField('duration_mins', filterInteger(t))}
              keyboardType="numeric"
              returnKeyType="done"
              left={<TextInput.Icon icon="timer-outline" color={SILVER} />}
              style={s.cardInput}
              theme={{ colors: { primary: CYBER, onSurfaceVariant: SILVER, onSurface: WHITE } }}
              outlineStyle={OUTLINE_STYLE}
              textColor={WHITE}
            />

            <TextInput
              mode="outlined"
              label="Notas"
              placeholder="Deload..."
              value={form.notes}
              onChangeText={(t) => updateWorkoutField('notes', t)}
              multiline
              numberOfLines={2}
              left={<TextInput.Icon icon="note-text-outline" color={SILVER} />}
              style={[s.cardInput, { marginBottom: 0 }]}
              theme={{ colors: { primary: CYBER, onSurfaceVariant: SILVER, onSurface: WHITE } }}
              outlineStyle={OUTLINE_STYLE}
              textColor={WHITE}
            />
          </View>

          {/* ═══ Exercises Section ═══ */}
          <View style={s.exercisesHeader}>
            <Text style={s.sectionLabel}>
              EJERCICIOS ({form.exercises.length})
            </Text>
          </View>

          <Animated.View style={animatedStyle}>
            {form.exercises.map((ex, index) => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                exerciseId={ex.id}
                index={index}
                onUpdateExercise={updateExerciseField}
                onUpdateSet={updateSetField}
                onAddSet={addSet}
                onRemoveSet={removeSet}
                onRemoveExercise={removeExercise}
                canRemove={form.exercises.length > 1}
                suggestions={suggestions}
                hasNameError={validationErrors.exerciseNameIds.includes(ex.id)}
                invalidSetIds={{
                  reps: validationErrors.setRepsIds,
                  weight: validationErrors.setWeightIds,
                }}
              />
            ))}
          </Animated.View>

          {/* Añadir Ejercicio */}
          <Pressable onPress={addExercise} style={s.addExerciseBtn}>
            <MaterialCommunityIcons name="plus" size={18} color={CYBER} />
            <Text style={s.addExerciseText}>AÑADIR EJERCICIO</Text>
          </Pressable>



          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={3500}
        action={{ label: 'OK', onPress: () => setSnackbar({ visible: false, message: '' }) }}
        style={{ backgroundColor: CARD_BG }}
      >
        <Text style={{ color: WHITE }}>{snackbar.message}</Text>
      </Snackbar>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

const PAD = 16;

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BLACK,
  },
  scrollContent: {
    paddingHorizontal: PAD,
    paddingTop: 24,
    paddingBottom: 24,
  },

  // ── Header ───────────────────────────────────────────────────────────────────
  headerSection: {
    marginBottom: 24,
  },
  screenTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: CYBER,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginLeft: 2,
  },

  // ── Info Card ────────────────────────────────────────────────────────────────
  cardInput: {
    backgroundColor: 'transparent',
    marginBottom: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 12,
    marginLeft: 2,
  },
  dateText: {
    fontSize: 12,
    color: SILVER,
    fontWeight: '600',
    fontFamily: 'SpaceMono',
    textTransform: 'capitalize',
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
    width: 100,
    backgroundColor: 'transparent',
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

  // ── Saving banner ────────────────────────────────────────────────────────────
  savingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  savingText: {
    fontSize: 13,
    fontWeight: '600',
    color: CYBER,
  },
});
