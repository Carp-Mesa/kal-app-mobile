import { getWorkoutHistory, resolveSets, SetEntry, WorkoutHistoryItem } from '@/src/services/workoutService';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import {
  ActivityIndicator,
  Card,
  Chip,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 40;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ExerciseSession {
  workoutId: string;
  workoutName: string;
  date: string;
  volume: number;
  sets: SetEntry[];
  totalReps: number;
  maxWeight: number;
  setCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDateShort = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  });
};

const formatSessionSummary = (sets?: SetEntry[] | null): string => {
  if (!sets || sets.length === 0) return 'Sin series';
  const reps = sets.map((s) => s.reps || 0).join(', ');
  const weights = sets.map((s) => s.weight_kg || 0);
  const allSameWeight = weights.every((w) => w === weights[0]);
  if (allSameWeight && weights[0] > 0) {
    return `${sets.length}×[${reps}] @ ${weights[0]}kg`;
  }
  return `${sets.length}×[${reps}]`;
};

const calculateVolume = (sets?: SetEntry[] | null): number =>
  (sets || []).reduce((sum, s) => sum + (s.reps || 0) * (s.weight_kg || 0), 0);

const groupExercises = (workouts: WorkoutHistoryItem[]): Map<string, ExerciseSession[]> => {
  const map = new Map<string, ExerciseSession[]>();
  for (const workout of workouts) {
    if (!workout.exercises || !Array.isArray(workout.exercises)) continue;
    for (const ex of workout.exercises) {
      const sets = resolveSets(ex);
      if (sets.length === 0) continue;
      const volume = calculateVolume(sets);
      const totalReps = sets.reduce((sum, s) => sum + (s.reps || 0), 0);
      const maxWeight = sets.length > 0 ? Math.max(...sets.map((s) => s.weight_kg || 0)) : 0;
      const session: ExerciseSession = {
        workoutId: workout.id,
        workoutName: workout.name,
        date: workout.date,
        volume,
        sets,
        totalReps,
        maxWeight,
        setCount: sets.length,
      };
      const existing = map.get(ex.name) ?? [];
      existing.push(session);
      map.set(ex.name, existing);
    }
  }
  for (const [name, sessions] of map) {
    sessions.sort((a, b) => b.date.localeCompare(a.date));
    map.set(name, sessions);
  }
  return map;
};

const getTrend = (current: number, previous: number): { label: string; color: string } => {
  if (current > previous) return { label: '¡Progreso!', color: '#4CAF50' };
  if (current < previous) return { label: 'Regresión', color: '#FF9800' };
  return { label: 'Mantuvo', color: '#9E9E9E' };
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const SessionComparisonCard = ({
  session,
  index,
  previousVolume,
  isPR,
}: {
  session: ExerciseSession;
  index: number;
  previousVolume?: number;
  isPR: boolean;
}) => {
  const theme = useTheme();
  const trend = previousVolume !== undefined ? getTrend(session.volume, previousVolume) : null;
  const labels = ['Actual', 'Anterior', 'Antepasada'];
  const label = labels[index] || `Hace ${index} sesiones`;

  return (
    <Card style={[styles.compareCard, { backgroundColor: theme.colors.surface }]} mode="elevated">
      <Card.Content style={styles.compareContent}>
        <View style={styles.compareHeader}>
          <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700' }}>
            {label}
          </Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {isPR && (
              <Chip compact style={[styles.prChip, { backgroundColor: '#E8F5E9' }]} textStyle={{ color: '#2E7D32', fontSize: 11, fontWeight: '700' }}>
                🏆 PR
              </Chip>
            )}
            {trend && (
              <Chip compact style={[styles.trendChip, { backgroundColor: trend.color + '18' }]} textStyle={{ color: trend.color, fontSize: 11, fontWeight: '700' }}>
                {trend.label}
              </Chip>
            )}
          </View>
        </View>

        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 6 }}>
          {formatDateShort(session.date)} · {session.workoutName}
        </Text>

        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 2 }}>
          {formatSessionSummary(session.sets)}
        </Text>

        <View style={styles.compareStats}>
          <View style={styles.statBox}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Volumen</Text>
            <Text variant="titleSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
              {Math.round(session.volume).toLocaleString('es-CO')} kg
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Reps</Text>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              {session.totalReps}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Peso Máx</Text>
            <Text variant="titleSmall" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
              {session.maxWeight} kg
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const VolumeChart = ({ sessions }: { sessions: ExerciseSession[] }) => {
  const theme = useTheme();
  const chartData = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
    return {
      labels: sorted.map((s) => formatDateShort(s.date)),
      values: sorted.map((s) => Math.round(s.volume)),
    };
  }, [sessions]);

  const chartConfig = {
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    color: (opacity = 1) => `rgba(0, 97, 255, ${opacity})`,
    labelColor: () => theme.colors.onSurfaceVariant,
    strokeWidth: 3,
    decimalPlaces: 0,
    propsForDots: { r: '5', strokeWidth: '2', stroke: theme.colors.primary },
    propsForBackgroundLines: { strokeDasharray: '4', strokeWidth: 1, stroke: theme.colors.outlineVariant },
  };

  return (
    <View style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 12 }}>
        📈 Evolución de Volumen
      </Text>
      <LineChart
        data={{ labels: chartData.labels, datasets: [{ data: chartData.values }] }}
        width={CHART_WIDTH}
        height={220}
        chartConfig={chartConfig}
        bezier
        style={{ borderRadius: 12 }}
        fromZero
        withInnerLines
      />
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const theme = useTheme();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['workoutAnalysis'],
    queryFn: () => getWorkoutHistory(100, 0),
  });

  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const grouped = useMemo(() => {
    if (!data?.data) return new Map<string, ExerciseSession[]>();
    return groupExercises(data.data);
  }, [data]);

  const exerciseNames = useMemo(() => {
    const names = Array.from(grouped.keys());
    names.sort((a, b) => {
      const aSessions = grouped.get(a)?.length ?? 0;
      const bSessions = grouped.get(b)?.length ?? 0;
      return bSessions - aSessions;
    });
    return names;
  }, [grouped]);

  const selectedSessions = selectedExercise ? grouped.get(selectedExercise) ?? [] : [];
  const lastThree = selectedSessions.slice(0, 3);
  const maxVolume = selectedSessions.length > 0
    ? Math.max(...selectedSessions.map((s) => s.volume))
    : 0;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator animating size="large" color={theme.colors.primary} />
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
          Analizando datos…
        </Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
        <Text variant="titleMedium" style={{ color: theme.colors.error, marginBottom: 12 }}>
          Error al cargar datos
        </Text>
      </View>
    );
  }

  if (exerciseNames.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>📊</Text>
        <Text variant="headlineSmall" style={{ color: theme.colors.onBackground, fontWeight: '700', marginBottom: 8 }}>
          Sin datos aún
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          Registra entrenamientos para ver tu progreso.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text
          variant="headlineSmall"
          style={[styles.greeting, { color: theme.colors.onBackground }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          Análisis de Progreso
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Compara tus ejercicios y mide tu evolución.
        </Text>
      </View>

      {/* Exercise Selector */}
      <Surface style={[styles.selectorSurface, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text variant="labelLarge" style={{ color: theme.colors.onSurfaceVariant, fontWeight: '700', marginBottom: 10 }}>
          Selecciona un ejercicio
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          {exerciseNames.map((name) => {
            const isSelected = selectedExercise === name;
            return (
              <Chip
                key={name}
                selected={isSelected}
                showSelectedOverlay
                onPress={() => setSelectedExercise(name)}
                style={[
                  styles.exerciseChip,
                  {
                    backgroundColor: isSelected ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
                  },
                ]}
                textStyle={{
                  color: isSelected ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant,
                  fontWeight: isSelected ? '700' : '500',
                }}
              >
                {name}
              </Chip>
            );
          })}
        </ScrollView>
      </Surface>

      {/* Comparison */}
      {selectedExercise && lastThree.length > 0 && (
        <View style={styles.comparisonSection}>
          <Text variant="titleMedium" style={{ color: theme.colors.onBackground, fontWeight: '700', marginBottom: 12 }}>
            Últimas sesiones: {selectedExercise}
          </Text>

          {lastThree.map((session, idx) => (
            <SessionComparisonCard
              key={`${session.workoutId}-${session.date}`}
              session={session}
              index={idx}
              previousVolume={idx < lastThree.length - 1 ? lastThree[idx + 1].volume : undefined}
              isPR={session.volume >= maxVolume * 0.99}
            />
          ))}

          {selectedSessions.length > 1 && (
            <View style={styles.chartSection}>
              <VolumeChart sessions={selectedSessions} />
            </View>
          )}
        </View>
      )}

      {selectedExercise && lastThree.length === 0 && (
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 24 }}>
          No hay sesiones registradas para este ejercicio.
        </Text>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    marginBottom: 20,
    gap: 4,
  },
  greeting: {
    fontWeight: '800',
  },
  selectorSurface: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  chipScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  exerciseChip: {
    borderRadius: 20,
    height: 36,
  },
  comparisonSection: {
    gap: 10,
  },
  compareCard: {
    borderRadius: 16,
    marginBottom: 4,
  },
  compareContent: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  compareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  prChip: {
    borderRadius: 20,
    height: 26,
  },
  trendChip: {
    borderRadius: 20,
    height: 26,
  },
  compareStats: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(103,80,164,0.06)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  chartSection: {
    marginTop: 8,
  },
  chartCard: {
    borderRadius: 16,
    padding: 16,
    elevation: 2,
  },
});