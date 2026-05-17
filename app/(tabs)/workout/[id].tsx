import { useWorkoutDetail } from '@/src/hooks/useWorkoutDetail';
import type { ExerciseLog } from '@/src/store/types';
import { useLocalSearchParams, router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
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

type SetEntry = { reps: number; weight_kg: number };

const formatSets = (sets: SetEntry[]): string => {
  if (sets.length === 0) return '0 series';
  const firstReps = sets[0].reps || 0;
  const allSameReps = sets.every((s) => s.reps === firstReps);
  if (allSameReps) {
    return `${sets.length} × ${firstReps}`;
  }
  return sets.map((s) => `${s.reps || 0}`).join(', ');
};

interface ExerciseCardProps {
  exercise: ExerciseLog;
  index: number;
}

function ExerciseCard({ exercise, index }: ExerciseCardProps) {
  const theme = useTheme();
  const sets = exercise.sets || [];
  const setCount = sets.length;

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

        {/* Sets detail */}
        <View style={styles.setsContainer}>
          {sets.map((set, sIdx) => (
            <View key={sIdx} style={styles.setRow}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, width: 28 }}>
                S{sIdx + 1}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
                {set.reps || 0} reps
              </Text>
              {(set.weight_kg || 0) > 0 && (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {' '}@ {set.weight_kg || 0} kg
                </Text>
              )}
            </View>
          ))}
        </View>

        <View style={styles.chipsRow}>
          <Chip
            icon="repeat"
            compact
            mode="outlined"
            style={[styles.metricChip, { borderColor: theme.colors.primaryContainer }]}
            textStyle={{ color: theme.colors.onPrimaryContainer, fontSize: 13, fontWeight: '600' }}
          >
            {setCount === 0 ? '0 series' : `${setCount} × ${sets[0]?.reps || 0}`}
          </Chip>

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
  const { data: workout } = useWorkoutDetail(id ?? '');


  if (!workout) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
          Entrenamiento no encontrado
        </Text>
        <Button mode="contained" onPress={() => router.back()} icon="arrow-left">
          Volver
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
  setsContainer: {
    marginBottom: 8,
    gap: 4,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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