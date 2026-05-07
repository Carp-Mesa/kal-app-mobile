import { useWorkoutHistory } from '@/src/hooks/useWorkoutHistory';
import { WorkoutExercise, WorkoutHistoryItem } from '@/src/services/workoutService';
import React, { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Divider,
  Icon,
  List,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';

// ─── Workout Card ──────────────────────────────────────────────────────────────

interface WorkoutCardProps {
  item: WorkoutHistoryItem;
}

function WorkoutCard({ item }: WorkoutCardProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const exerciseCount = item.exercises?.length ?? 0;
  
  // Prevenir desajuste de zona horaria al parsear 'YYYY-MM-DD'
  const [year, month, day] = item.date.split('-');
  const formattedDate = new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <Card style={styles.card} mode="elevated" onPress={() => setExpanded(e => !e)}>
      <Card.Content style={styles.cardContent}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
              {item.name}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2, textTransform: 'capitalize' }}>
              {formattedDate}
            </Text>
          </View>
          <Icon
            source={expanded ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={theme.colors.primary}
          />
        </View>

        {/* Quick stats chips */}
        <View style={styles.chipsRow}>
          <Chip
            icon="dumbbell"
            compact
            style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]}
            textStyle={{ color: theme.colors.onSecondaryContainer, fontSize: 12 }}
          >
            {`${exerciseCount} ${exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}`}
          </Chip>
          {item.duration_mins !== undefined && item.duration_mins > 0 && (
            <Chip
              icon="timer-outline"
              compact
              style={[styles.chip, { backgroundColor: theme.colors.tertiaryContainer }]}
              textStyle={{ color: theme.colors.onTertiaryContainer, fontSize: 12 }}
            >
              {`${item.duration_mins} mins`}
            </Chip>
          )}
        </View>

        {/* Expanded detail */}
        {expanded && exerciseCount > 0 && (
          <Surface style={[styles.detailSurface, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
            <Divider style={{ marginBottom: 8 }} />
            {item.exercises.map((ex: WorkoutExercise, idx: number) => (
              <View key={ex.id || idx} style={styles.exerciseRow}>
                <View style={styles.exerciseIndex}>
                  <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>
                    {idx + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                    {ex.name}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {ex.sets} series × {ex.reps} reps{ex.weight_kg > 0 ? ` · ${ex.weight_kg} kg` : ''}
                    {ex.rpe ? ` · RPE ${ex.rpe}` : ''}
                  </Text>
                </View>
              </View>
            ))}
          </Surface>
        )}

        {expanded && exerciseCount === 0 && (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8, fontStyle: 'italic' }}>
            Sin ejercicios registrados.
          </Text>
        )}
      </Card.Content>
    </Card>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkoutHistoryScreen() {
  const theme = useTheme();
  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage, refetch } =
    useWorkoutHistory();

  const workouts = data?.pages.flatMap(p => p.data) ?? [];

  // ── Empty ──────────────────────────────────────────────────────────────────

  if (!isLoading && !isError && workouts.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={styles.emptyEmoji}>🏋️</Text>
        <Text variant="headlineSmall" style={[styles.emptyTitle, { color: theme.colors.onBackground }]}>
          ¡Aún no hay entrenamientos!
        </Text>
        <Text
          variant="bodyMedium"
          style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          Cada gran viaje empieza con un solo paso.{'\n'}¡Ve al gym y registra tu primera rutina!
        </Text>
      </View>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator animating size="large" color={theme.colors.primary} />
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
          Cargando historial…
        </Text>
      </View>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={styles.emptyEmoji}>⚠️</Text>
        <Text variant="titleMedium" style={{ color: theme.colors.error, marginBottom: 12 }}>
          Error al cargar el historial
        </Text>
        <Button mode="contained" onPress={() => refetch()}>
          Reintentar
        </Button>
      </View>
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <WorkoutCard item={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        ListHeaderComponent={
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12, textAlign: 'center' }}
          >
            {data?.pages[0]?.pagination.total ?? 0} entrenamientos registrados
          </Text>
        }
        ListFooterComponent={
          hasNextPage ? (
            <Button
              mode="outlined"
              onPress={() => fetchNextPage()}
              loading={isFetchingNextPage}
              style={styles.loadMoreBtn}
              icon="chevron-down"
            >
              Cargar más
            </Button>
          ) : (
            <View style={{ height: 40 }} />
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  list: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    marginBottom: 14,
  },
  cardContent: {
    paddingVertical: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  chip: {
    borderRadius: 20,
  },
  detailSurface: {
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 10,
  },
  exerciseIndex: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(103,80,164,0.12)',
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtitle: {
    textAlign: 'center',
    lineHeight: 22,
  },
  loadMoreBtn: {
    borderRadius: 14,
    marginHorizontal: 32,
    marginTop: 8,
  },
});
