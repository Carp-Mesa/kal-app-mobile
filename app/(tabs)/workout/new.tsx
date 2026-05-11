import { useExerciseSuggestions } from '@/src/hooks/useExerciseSuggestions';
import { createWorkout, ExercisePayload, SetEntry } from '@/src/services/workoutService';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Divider,
  FAB,
  HelperText,
  IconButton,
  Snackbar,
  Surface,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = (): string => Date.now().toString() + Math.random().toString(36).slice(2);

const createEmptySet = (): SetForm => ({
  id: uid(),
  reps: '',
  weight_kg: '',
});

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

const initialForm = (): WorkoutForm => ({
  name: '',
  notes: '',
  duration_mins: '',
  exercises: [createEmptyExercise()],
});

// ─── Input Filters ───────────────────────────────────────────────────────────

const filterInteger = (text: string): string => text.replace(/[^0-9]/g, '');

const filterDecimal = (text: string): string => {
  let cleaned = text.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  return cleaned;
};

// ─── SetRow (memoized — local state eliminates re-render lag) ────────────────

interface SetRowProps {
  setId: string;
  setIndex: number;
  reps: string;
  weightKg: string;
  onUpdateSet: (exerciseId: string, setId: string, field: 'reps' | 'weight_kg', value: string) => void;
  onRemoveSet: (exerciseId: string, setId: string) => void;
  canRemove: boolean;
  exerciseId: string;
}

const SetRow = memo(function SetRow({
  setId,
  setIndex,
  reps,
  weightKg,
  onUpdateSet,
  onRemoveSet,
  canRemove,
  exerciseId,
}: SetRowProps) {
  const theme = useTheme();
  const [localReps, setLocalReps] = useState(reps);
  const [localWeight, setLocalWeight] = useState(weightKg);
  const repsFocused = useRef(false);
  const weightFocused = useRef(false);

  useEffect(() => {
    if (!repsFocused.current) setLocalReps(reps);
  }, [reps]);

  useEffect(() => {
    if (!weightFocused.current) setLocalWeight(weightKg);
  }, [weightKg]);

  return (
    <View style={styles.setRow}>
      <View style={[styles.setBadge, { backgroundColor: theme.colors.primaryContainer }]}>
        <Text variant="labelSmall" style={{ color: theme.colors.onPrimaryContainer, fontWeight: '700' }}>
          {setIndex + 1}
        </Text>
      </View>
      <TextInput
        mode="outlined"
        label="Reps"
        placeholder="10"
        value={localReps}
        onChangeText={(t) => {
          const filtered = filterInteger(t);
          setLocalReps(filtered);
          repsFocused.current = true;
          onUpdateSet(exerciseId, setId, 'reps', filtered);
        }}
        onFocus={() => { repsFocused.current = true; }}
        onBlur={() => {
          repsFocused.current = false;
          setLocalReps(reps);
        }}
        keyboardType="numeric"
        style={[styles.setField, { marginRight: 6 }]}
        dense
        returnKeyType="next"
      />
      <TextInput
        mode="outlined"
        label="Kg"
        placeholder="80"
        value={localWeight}
        onChangeText={(t) => {
          const filtered = filterDecimal(t);
          setLocalWeight(filtered);
          weightFocused.current = true;
          onUpdateSet(exerciseId, setId, 'weight_kg', filtered);
        }}
        onFocus={() => { weightFocused.current = true; }}
        onBlur={() => {
          weightFocused.current = false;
          setLocalWeight(weightKg);
        }}
        keyboardType="decimal-pad"
        style={styles.setField}
        dense
        returnKeyType="done"
      />
      {canRemove ? (
        <IconButton
          icon="close-circle-outline"
          iconColor={theme.colors.error}
          size={18}
          onPress={() => onRemoveSet(exerciseId, setId)}
          style={styles.removeSetBtn}
        />
      ) : <View style={{ width: 26 }} />}
    </View>
  );
});

// ─── ExerciseCard (memoized) ─────────────────────────────────────────────────

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
}: ExerciseCardProps) {
  const theme = useTheme();
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
    return sum + (r * w);
  }, 0);

  return (
    <Card
      style={[styles.card, styles.exerciseCard, { backgroundColor: theme.colors.surface }]}
      mode="elevated"
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseBadge}>
            <Text variant="labelLarge" style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
              #{index + 1}
            </Text>
          </View>
          <Text variant="titleSmall" style={{ flex: 1, color: theme.colors.onSurface, marginLeft: 4 }}>
            Ejercicio {index + 1}
          </Text>
          {canRemove && (
            <IconButton
              icon="delete-outline"
              iconColor={theme.colors.error}
              size={22}
              onPress={() => onRemoveExercise(exerciseId)}
              style={styles.deleteBtn}
            />
          )}
        </View>

        <Divider style={styles.divider} />

        <TextInput
          mode="outlined"
          label="Ejercicio *"
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
          style={styles.input}
          autoCapitalize="words"
          returnKeyType="next"
          left={<TextInput.Icon icon="magnify" />}
          dense
        />
        <HelperText type="info" visible padding="none" style={styles.helperText}>
          Busca o escribe el nombre
        </HelperText>
        {showSuggestions && (
          <Surface style={[styles.suggestionsContainer, { backgroundColor: theme.colors.surface }]} elevation={4}>
            <View style={styles.suggestionsInner}>
              {filteredSuggestions.map((suggestion) => (
                <Chip
                  key={suggestion}
                  mode="flat"
                  icon="dumbbell"
                  onPress={() => {
                    justSelectedRef.current = true;
                    onUpdateExercise(exerciseId, 'name', suggestion);
                    setLocalName(suggestion);
                    setNameFocused(false);
                  }}
                  style={[styles.suggestionChip, { backgroundColor: theme.colors.secondaryContainer }]}
                  textStyle={{ color: theme.colors.onSecondaryContainer, fontSize: 13 }}
                >
                  {suggestion}
                </Chip>
              ))}
            </View>
          </Surface>
        )}

        <View style={styles.setsSectionHeader}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
            Series ({exercise.sets.length})
          </Text>
          {totalVolume > 0 && (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Vol. {totalVolume.toLocaleString('es-CO')} kg
            </Text>
          )}
        </View>

        {exercise.sets.map((s, sIdx) => (
          <SetRow
            key={s.id}
            setId={s.id}
            setIndex={sIdx}
            reps={s.reps}
            weightKg={s.weight_kg}
            onUpdateSet={onUpdateSet}
            onRemoveSet={onRemoveSet}
            canRemove={exercise.sets.length > 1}
            exerciseId={exerciseId}
          />
        ))}

        <Button
          mode="contained-tonal"
          icon="plus"
          onPress={() => onAddSet(exerciseId)}
          style={styles.addSetBtn}
          contentStyle={{ height: 40 }}
          labelStyle={{ fontSize: 13 }}
          compact
          textColor={theme.colors.primary}
        >
          Añadir Serie
        </Button>

        <TextInput
          mode="outlined"
          label="RPE"
          placeholder="1-10"
          value={exercise.rpe}
          onChangeText={(t) => onUpdateExercise(exerciseId, 'rpe', filterInteger(t))}
          keyboardType="numeric"
          style={[styles.input, { marginTop: 10 }]}
          left={<TextInput.Icon icon="gauge" />}
          dense
          returnKeyType="done"
        />
        <HelperText type="info" visible padding="none" style={styles.helperText}>
          Esfuerzo percibido (1 fácil - 10 máximo)
        </HelperText>
      </Card.Content>
    </Card>
  );
});

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NewWorkoutScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const { data: rawSuggestions = [] } = useExerciseSuggestions();

  const suggestions = useMemo(() => {
    const normalized = (rawSuggestions as any[]).map((s) =>
      typeof s === 'object' && s !== null ? s.name : String(s)
    );
    return normalized;
  }, [rawSuggestions]);

  const [form, setForm] = useState<WorkoutForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const updateWorkoutField = useCallback((field: keyof Pick<WorkoutForm, 'name' | 'notes' | 'duration_mins'>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateExerciseField = useCallback((id: string, field: 'name' | 'rpe', value: string) => {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id === id ? { ...ex, [field]: value } : ex
      ),
    }));
  }, []);

  const updateSetField = useCallback((exerciseId: string, setId: string, field: 'reps' | 'weight_kg', value: string) => {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)) }
          : ex
      ),
    }));
  }, []);

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
        ex.id === exerciseId ? { ...ex, sets: ex.sets.filter((s) => s.id !== setId) } : ex
      ),
    }));
  }, []);

  const addExercise = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      exercises: [...prev.exercises, createEmptyExercise()],
    }));
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  }, []);

  const removeExercise = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((ex) => ex.id !== id),
    }));
  }, []);

  const validate = (): string | null => {
    if (!form.name.trim()) return 'El nombre del entrenamiento es obligatorio.';
    if (form.exercises.length === 0) return 'Agrega al menos un ejercicio.';
    for (let i = 0; i < form.exercises.length; i++) {
      const ex = form.exercises[i];
      if (!ex.name.trim()) return `Ejercicio ${i + 1}: necesita un nombre.`;
      if (ex.sets.length === 0) return `Ejercicio ${i + 1}: necesita al menos una serie.`;
      for (let j = 0; j < ex.sets.length; j++) {
        if (!ex.sets[j].reps) return `Serie ${j + 1} de ${ex.name}: repeticiones requeridas.`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    const error = validate();
    if (error) {
      setSnackbar({ visible: true, message: error });
      return;
    }

    setIsSaving(true);
    try {
      const exercisesPayload: ExercisePayload[] = form.exercises.map((ex) => ({
        name: ex.name.trim(),
        sets: ex.sets.map((s): SetEntry => ({
          reps: Number(s.reps) || 0,
          weight_kg: parseFloat(s.weight_kg) || 0,
        })),
        ...(ex.rpe && { rpe: Number(ex.rpe) || undefined }),
      }));

      await createWorkout({
        name: form.name.trim(),
        date: getLocalDateString(),
        notes: form.notes.trim() || undefined,
        duration_mins: Number(form.duration_mins) || 0,
        exercises: exercisesPayload,
      });

      await queryClient.invalidateQueries({ queryKey: ['progressToday'] });
      await queryClient.invalidateQueries({ queryKey: ['workoutHistory'] });

      Alert.alert('¡Listo!', 'Entrenamiento guardado correctamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ocurrió un error al guardar.';
      setSnackbar({ visible: true, message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text variant="headlineSmall" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Nuevo Entrenamiento
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Registra tu rutina ejercicio por ejercicio.
          </Text>
        </View>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={[styles.cardLabel, { color: theme.colors.primary }]}>
              📋 Info del Entrenamiento
            </Text>
            <TextInput
              mode="outlined"
              label="Nombre *"
              placeholder="Push Day"
              value={form.name}
              onChangeText={(t) => updateWorkoutField('name', t)}
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="next"
              left={<TextInput.Icon icon="dumbbell" />}
              dense
            />
            <TextInput
              mode="outlined"
              label="Notas"
              placeholder="Deload..."
              value={form.notes}
              onChangeText={(t) => updateWorkoutField('notes', t)}
              style={styles.input}
              multiline
              numberOfLines={2}
              left={<TextInput.Icon icon="note-text-outline" />}
              dense
            />
            <TextInput
              mode="outlined"
              label="Duración (mins)"
              placeholder="60"
              value={form.duration_mins}
              onChangeText={(t) => updateWorkoutField('duration_mins', filterInteger(t))}
              style={styles.input}
              keyboardType="numeric"
              returnKeyType="done"
              left={<TextInput.Icon icon="timer-outline" />}
              dense
            />
          </Card.Content>
        </Card>

        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={{ color: theme.colors.onBackground, fontWeight: '700' }}>
            💪 Ejercicios ({form.exercises.length})
          </Text>
        </View>

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
          />
        ))}

        <Button
          mode="outlined"
          icon="plus-circle-outline"
          onPress={addExercise}
          style={styles.addButton}
          contentStyle={styles.addButtonContent}
          labelStyle={{ fontSize: 15 }}
        >
          Añadir Ejercicio
        </Button>

        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB
        icon={isSaving ? () => <ActivityIndicator size={20} color={theme.colors.onPrimary} /> : 'content-save-outline'}
        label={isSaving ? 'Guardando...' : 'Guardar'}
        onPress={handleSave}
        disabled={isSaving}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
      />

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={3500}
        action={{ label: 'OK', onPress: () => setSnackbar({ visible: false, message: '' }) }}
      >
        {snackbar.message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const HORIZONTAL_PADDING = 16;

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 12,
    paddingBottom: 24,
  },
  headerSection: {
    marginBottom: 16,
    gap: 4,
  },
  sectionTitle: {
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 8,
  },
  card: {
    borderRadius: 20,
    marginBottom: 14,
    elevation: 2,
  },
  exerciseCard: {
    borderRadius: 16,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 0,
  },
  cardLabel: {
    fontWeight: '700',
    marginBottom: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0061FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    margin: 0,
  },
  divider: {
    marginBottom: 12,
  },
  input: {
    marginBottom: 10,
    fontSize: 15,
  },
  helperText: {
    marginTop: -6,
    marginBottom: 4,
    marginLeft: 8,
  },
  setsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 6,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  setBadge: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setField: {
    flex: 1,
    fontSize: 14,
  },
  removeSetBtn: {
    margin: 0,
    marginLeft: 2,
  },
  addSetBtn: {
    borderRadius: 14,
    marginBottom: 4,
    marginTop: 2,
  },
  suggestionsContainer: {
    borderRadius: 14,
    marginBottom: 10,
    zIndex: 9999,
    elevation: 4,
  },
  suggestionsInner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 10,
  },
  suggestionChip: {
    borderRadius: 20,
  },
  addButton: {
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 4,
    height: 52,
  },
  addButtonContent: {
    height: 52,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 12,
    borderRadius: 16,
  },
});