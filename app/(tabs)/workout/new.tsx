import { createWorkout, ExercisePayload } from '@/src/services/workoutService';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
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
  Divider,
  FAB,
  IconButton,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExerciseForm {
  id: string; // local key for FlatList
  name: string;
  sets: string;
  reps: string;
  weight_kg: string;
  rpe: string;
}

interface WorkoutForm {
  name: string;
  notes: string;
  exercises: ExerciseForm[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const createEmptyExercise = (): ExerciseForm => ({
  id: Date.now().toString() + Math.random().toString(36).slice(2),
  name: '',
  sets: '',
  reps: '',
  weight_kg: '',
  rpe: '',
});

const initialForm = (): WorkoutForm => ({
  name: '',
  notes: '',
  exercises: [createEmptyExercise()],
});

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function NewWorkoutScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);

  const [form, setForm] = useState<WorkoutForm>(initialForm);
  const [isSaving, setIsSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // ── Form helpers ────────────────────────────────────────────────────────────

  const updateWorkoutField = (field: keyof Pick<WorkoutForm, 'name' | 'notes'>, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateExerciseField = (
    id: string,
    field: keyof Omit<ExerciseForm, 'id'>,
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.map((ex) =>
        ex.id === id ? { ...ex, [field]: value } : ex
      ),
    }));
  };

  const addExercise = () => {
    setForm((prev) => ({
      ...prev,
      exercises: [...prev.exercises, createEmptyExercise()],
    }));
    // Scroll al final después de render
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
  };

  const removeExercise = (id: string) => {
    setForm((prev) => ({
      ...prev,
      exercises: prev.exercises.filter((ex) => ex.id !== id),
    }));
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (): string | null => {
    if (!form.name.trim()) return 'El nombre del entrenamiento es obligatorio.';
    if (form.exercises.length === 0) return 'Agrega al menos un ejercicio.';
    for (let i = 0; i < form.exercises.length; i++) {
      const ex = form.exercises[i];
      if (!ex.name.trim()) return `El ejercicio ${i + 1} necesita un nombre.`;
    }
    return null;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

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
        sets: Number(ex.sets) || 0,
        reps: Number(ex.reps) || 0,
        weight_kg: parseFloat(ex.weight_kg) || 0,
        rpe: Number(ex.rpe) || 0,
      }));

      await createWorkout({
        name: form.name.trim(),
        notes: form.notes.trim() || undefined,
        exercises: exercisesPayload,
      });

      // Invalida el cache del dashboard para mostrar datos actualizados
      await queryClient.invalidateQueries({ queryKey: ['progressToday'] });

      Alert.alert('¡Listo!', 'Entrenamiento guardado correctamente.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Ocurrió un error al guardar.';
      setSnackbar({ visible: true, message });
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

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
        {/* ── Header Info ────────────────────────────────────────────── */}
        <View style={styles.headerSection}>
          <Text variant="headlineSmall" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Nuevo Entrenamiento
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Registra tu rutina y los ejercicios realizados.
          </Text>
        </View>

        {/* ── Workout Info Card ──────────────────────────────────────── */}
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={[styles.cardLabel, { color: theme.colors.primary }]}>
              📋 Info del Entrenamiento
            </Text>
            <TextInput
              mode="outlined"
              label="Nombre del entrenamiento *"
              placeholder="ej. Push Day, Piernas, Full Body"
              value={form.name}
              onChangeText={(t) => updateWorkoutField('name', t)}
              style={styles.input}
              autoCapitalize="words"
              returnKeyType="next"
              left={<TextInput.Icon icon="dumbbell" />}
            />
            <TextInput
              mode="outlined"
              label="Notas (opcional)"
              placeholder="ej. Sesión de deload, enfocado en banca..."
              value={form.notes}
              onChangeText={(t) => updateWorkoutField('notes', t)}
              style={styles.input}
              multiline
              numberOfLines={2}
              left={<TextInput.Icon icon="note-text-outline" />}
            />
          </Card.Content>
        </Card>

        {/* ── Exercises Section ──────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text variant="titleMedium" style={{ color: theme.colors.onBackground, fontWeight: '700' }}>
            💪 Ejercicios ({form.exercises.length})
          </Text>
        </View>

        {form.exercises.map((ex, index) => (
          <ExerciseCard
            key={ex.id}
            exercise={ex}
            index={index}
            onUpdate={(field, value) => updateExerciseField(ex.id, field, value)}
            onRemove={() => removeExercise(ex.id)}
            canRemove={form.exercises.length > 1}
          />
        ))}

        {/* ── Add Exercise Button ────────────────────────────────────── */}
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

        {/* Spacer para que el FAB no tape el último elemento */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Floating Save Button ───────────────────────────────────── */}
      <FAB
        icon={isSaving ? () => <ActivityIndicator size={20} color={theme.colors.onPrimary} /> : 'content-save-outline'}
        label={isSaving ? 'Guardando...' : 'Guardar'}
        onPress={handleSave}
        disabled={isSaving}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        color={theme.colors.onPrimary}
      />

      {/* ── Snackbar ───────────────────────────────────────────────── */}
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

// ─── ExerciseCard Component ───────────────────────────────────────────────────

interface ExerciseCardProps {
  exercise: ExerciseForm;
  index: number;
  onUpdate: (field: keyof Omit<ExerciseForm, 'id'>, value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}

const ExerciseCard = ({
  exercise,
  index,
  onUpdate,
  onRemove,
  canRemove,
}: ExerciseCardProps) => {
  const theme = useTheme();
  return (
    <Card
      style={[
        styles.card,
        styles.exerciseCard,
        { backgroundColor: theme.colors.surface },
      ]}
      mode="elevated"
    >
      <Card.Content style={styles.cardContent}>
        {/* Header del card con número e icono eliminar */}
        <View style={styles.exerciseHeader}>
          <View style={styles.exerciseBadge}>
            <Text
              variant="labelLarge"
              style={{ color: theme.colors.onPrimary, fontWeight: '700' }}
            >
              #{index + 1}
            </Text>
          </View>
          <Text
            variant="titleSmall"
            style={{ flex: 1, color: theme.colors.onSurface, marginLeft: 8 }}
          >
            Ejercicio {index + 1}
          </Text>
          {canRemove && (
            <IconButton
              icon="delete-outline"
              iconColor={theme.colors.error}
              size={22}
              onPress={onRemove}
              style={styles.deleteBtn}
            />
          )}
        </View>

        <Divider style={styles.divider} />

        {/* Nombre del ejercicio */}
        <TextInput
          mode="outlined"
          label="Nombre del ejercicio *"
          placeholder="ej. Press de banca, Sentadilla..."
          value={exercise.name}
          onChangeText={(t) => onUpdate('name', t)}
          style={styles.input}
          autoCapitalize="words"
          returnKeyType="next"
        />

        {/* Fila: Sets y Reps */}
        <View style={styles.row}>
          <TextInput
            mode="outlined"
            label="Series"
            placeholder="4"
            value={exercise.sets}
            onChangeText={(t) => onUpdate('sets', t)}
            keyboardType="numeric"
            style={[styles.input, styles.flex1, styles.marginRight]}
            returnKeyType="next"
            left={<TextInput.Icon icon="repeat" />}
          />
          <TextInput
            mode="outlined"
            label="Reps"
            placeholder="10"
            value={exercise.reps}
            onChangeText={(t) => onUpdate('reps', t)}
            keyboardType="numeric"
            style={[styles.input, styles.flex1, styles.marginLeft]}
            returnKeyType="next"
            left={<TextInput.Icon icon="counter" />}
          />
        </View>

        {/* Fila: Peso y RPE */}
        <View style={styles.row}>
          <TextInput
            mode="outlined"
            label="Peso (kg)"
            placeholder="80.0"
            value={exercise.weight_kg}
            onChangeText={(t) => onUpdate('weight_kg', t)}
            keyboardType="decimal-pad"
            style={[styles.input, styles.flex1, styles.marginRight]}
            returnKeyType="next"
            left={<TextInput.Icon icon="weight-kilogram" />}
          />
          <TextInput
            mode="outlined"
            label="RPE (1-10)"
            placeholder="8"
            value={exercise.rpe}
            onChangeText={(t) => onUpdate('rpe', t)}
            keyboardType="numeric"
            style={[styles.input, styles.flex1, styles.marginLeft]}
            returnKeyType="done"
            left={<TextInput.Icon icon="gauge" />}
          />
        </View>
      </Card.Content>
    </Card>
  );
};

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
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  flex1: {
    flex: 1,
  },
  marginRight: {
    marginRight: 4,
  },
  marginLeft: {
    marginLeft: 4,
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
    bottom: 24,
    borderRadius: 16,
  },
});
