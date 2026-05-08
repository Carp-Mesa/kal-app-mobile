import { useWorkoutDetail } from '@/src/hooks/useWorkoutDetail';
import { WorkoutExercise } from '@/src/services/workoutService';
import { useLocalSearchParams, router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  IconButton,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';

const getRpeColor = (rpe: number): string => {
  if (rpe <= 3) return '#4CAF50';
  if (rpe <= 5) return '#8BC34A';
  if (rpe <= 7) return '#FFC107';
  return '#F44336';
};

const getRpeLabel = (rpe: number): string => {
  if (rpe <= 3) return 'Suave';
  if (rpe <= 5) return 'Moderado';
  if (rpe <= 7) return 'Intenso';
  return 'Máximo';
};

const formatDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

interface ExerciseCardProps {
  exercise: WorkoutExercise;
  index: number;
}

function ExerciseCard({ exercise, index }: ExerciseCardProps) {
  const theme = useTheme();

  return (
    <Card style={styles.exerciseCard} mode="elevated">
      <Card.Content style={styles.exerciseContent}>
        <View style={styles.exerciseHeader}>
          <View style={[styles.exerciseBadge, { backgroundColor: theme.colors.primary }]}>
            <Text variant="labelMedium" style={{ color: theme.colors.onPrimary, fontWeight: '700' }}>
              {index + 1}
            </Text>
          </View>
          <Text
            variant="titleMedium"
            style={{ flex: 1, color: theme.colors.onSurface, fontWeight: '600', marginLeft: 10 }}
            numberOfLines={1}
          >
            {exercise.name}
          </Text>
        </View>

        <View style={styles.chipsRow}>
          <Chip
            icon="repeat"
            compact
            mode="outlined"
            style={[styles.metricChip, { borderColor: theme.colors.primaryContainer }]}
            textStyle={{ color: theme.colors.onPrimaryContainer, fontSize: 13, fontWeight: '600' }}
          >
            {`${exercise.sets}×${exercise.reps}`}
          </Chip>

          {exercise.weight_kg > 0 && (
            <Chip
              icon="weight-kilogram"
              compact
              mode="outlined"
              style={[styles.metricChip, { borderColor: theme.colors.tertiaryContainer }]}
              textStyle={{ color: theme.colors.onTertiaryContainer, fontSize: 13, fontWeight: '600' }}
            >
              {`${exercise.weight_kg} kg`}
            </Chip>
          )}

          {exercise.rpe !== undefined && exercise.rpe > 0 && (
            <Chip
              compact
              mode="outlined"
              style={[styles.metricChip, { borderColor: getRpeColor(exercise.rpe) }]}
              textStyle={{ color: getRpeColor(exercise.rpe), fontSize: 13, fontWeight: '600' }}
            >
              {`RPE ${exercise.rpe} · ${getRpeLabel(exercise.rpe)}`}
            </Chip>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

export default function WorkoutDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: workout, isLoading, isError, refetch } = useWorkoutDetail(id ?? '');

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator animating size="large" color={theme.colors.primary} />
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
          Cargando entrenamiento…
        </Text>
      </View>
    );
  }

  if (isError || !workout) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
        <Text variant="titleMedium" style={{ color: theme.colors.error, marginBottom: 8 }}>
          No se pudo cargar el entrenamiento
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 20, textAlign: 'center' }}>
          Es posible que el entrenamiento no exista o haya sido eliminado.
        </Text>
        <Button mode="contained" onPress={() => refetch()} icon="refresh">
          Reintentar
        </Button>
      </View>
    );
  }

  const formattedDate = formatDate(workout.date);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Back + Header ──────────────────────────────────────── */}
      <View style={styles.headerNav}>
        <IconButton
          icon="arrow-left"
          size={24}
          iconColor={theme.colors.onSurface}
          onPress={() => router.back()}
          style={styles.backBtn}
        />
      </View>

      <Surface style={[styles.heroSurface, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
        <Text variant="headlineSmall" style={[styles.heroTitle, { color: theme.colors.onPrimaryContainer }]}>
          {workout.name}
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.heroDate, { color: theme.colors.onPrimaryContainer, opacity: 0.8 }]}
        >
          {formattedDate}
        </Text>

        <View style={styles.heroChips}>
          <Chip
            icon="dumbbell"
            compact
            style={{ backgroundColor: theme.colors.primary }}
            textStyle={{ color: theme.colors.onPrimary, fontSize: 12, fontWeight: '600' }}
          >
            {workout.exercises.length === 1
              ? '1 ejercicio'
              : `${workout.exercises.length} ejercicios`}
          </Chip>

          {workout.duration_mins !== undefined && workout.duration_mins > 0 && (
            <Chip
              icon="timer-outline"
              compact
              style={{ backgroundColor: theme.colors.tertiaryContainer }}
              textStyle={{ color: theme.colors.onTertiaryContainer, fontSize: 12, fontWeight: '600' }}
            >
              {`${workout.duration_mins} min`}
            </Chip>
          )}
        </View>
      </Surface>

      {/* ── Notes ─────────────────────────────────────────────── */}
      {workout.notes && (
        <Card style={styles.notesCard} mode="outlined">
          <Card.Content style={styles.notesContent}>
            <Text variant="labelMedium" style={{ color: theme.colors.primary, fontWeight: '700', marginBottom: 4 }}>
              📝 Notas
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, lineHeight: 20 }}>
              {workout.notes}
            </Text>
          </Card.Content>
        </Card>
      )}

      {/* ── Exercises ───────────────────────────────────────────── */}
      {workout.exercises.length > 0 && (
        <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          💪 Ejercicios
        </Text>
      )}

      {workout.exercises.map((exercise, idx) => (
        <ExerciseCard key={exercise.id || idx} exercise={exercise} index={idx} />
      ))}

      {workout.exercises.length === 0 && (
        <View style={[styles.emptyExercises, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            No se registraron ejercicios para este entrenamiento.
          </Text>
        </View>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 24,
  },
  headerNav: {
    marginLeft: -8,
    marginBottom: 4,
  },
  backBtn: {
    margin: 0,
  },
  heroSurface: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  heroTitle: {
    fontWeight: '800',
    marginBottom: 4,
  },
  heroDate: {
    textTransform: 'capitalize',
    marginBottom: 14,
  },
  heroChips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  notesCard: {
    borderRadius: 16,
    marginBottom: 20,
  },
  notesContent: {
    paddingVertical: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  exerciseCard: {
    borderRadius: 16,
    marginBottom: 12,
  },
  exerciseContent: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  metricChip: {
    borderRadius: 20,
    height: 32,
  },
  emptyExercises: {
    borderRadius: 16,
    padding: 24,
    marginTop: 4,
    alignItems: 'center',
  },
});