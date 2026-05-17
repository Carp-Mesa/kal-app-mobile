import { useWorkoutHistory } from '@/src/hooks/useWorkoutHistory';
import type { WorkoutLog, ExerciseLog } from '@/src/store/types';
import React, { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import {
    Button,
    Card,
    Chip,
    Divider,
    Icon,
    Surface,
    Text,
    useTheme,
} from 'react-native-paper';

type SetEntry = { reps: number; weight_kg: number };

const formatSetsCompact = (sets: SetEntry[]): string => {
  if (sets.length === 0) return '0 series';
  const firstReps = sets[0].reps || 0;
  const allSameReps = sets.every((s) => s.reps === firstReps);
  if (allSameReps) {
    return `${sets.length}×${firstReps}`;
  }
  return sets.map((s) => `${s.reps || 0}`).join('/');
};

const formatDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

interface WorkoutCardProps {
  item: WorkoutLog;
}

function WorkoutCard({ item }: WorkoutCardProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const exerciseCount = item.exercises?.length ?? 0;

  return (
    <Card 
      style={[
        styles.card, 
        { 
          backgroundColor: theme.colors.surface,
          borderColor: 'rgba(255,255,255,0.05)',
          borderWidth: 1
        }
      ]} 
      mode="elevated" 
      elevation={0}
      onPress={() => setExpanded(e => !e)}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text variant="titleMedium" style={{ fontWeight: '700', color: theme.colors.onSurface }}>
              {item.name}
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 2, fontSize: 11, textTransform: 'capitalize' }}>
              {formatDate(item.date)}
            </Text>
          </View>
          <Icon source={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={theme.colors.primary} />
        </View>

        <View style={styles.chipsWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            <Chip icon="dumbbell" compact style={[styles.chip, { backgroundColor: theme.colors.secondaryContainer }]} textStyle={{ color: theme.colors.onSecondaryContainer, fontSize: 11 }}>
              {`${exerciseCount} ${exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}`}
            </Chip>
            {item.duration_mins !== undefined && item.duration_mins > 0 && (
              <Chip icon="timer-outline" compact style={[styles.chip, { backgroundColor: theme.colors.tertiaryContainer }]} textStyle={{ color: theme.colors.onTertiaryContainer, fontSize: 11 }}>
                {`${item.duration_mins} mins`}
              </Chip>
            )}
          </ScrollView>
        </View>

        {expanded && exerciseCount > 0 && (
          <Surface style={[styles.detailSurface, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
            <Divider style={{ marginBottom: 8 }} />
            {item.exercises.map((ex, idx) => {
              const sets = ex.sets || [];
              return (
                <View key={ex.id || idx} style={styles.exerciseRow}>
                  <View style={styles.exerciseIndex}>
                    <Text variant="labelSmall" style={{ color: theme.colors.primary, fontWeight: '700' }}>{idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyMedium" style={{ fontWeight: '600', color: theme.colors.onSurface }}>
                      {ex.name}
                    </Text>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginBottom: 4 }}>
                      {formatSetsCompact(sets)}
                      {ex.rpe ? ` · RPE ${ex.rpe}` : ''}
                    </Text>
                    {sets.length > 0 && (
                      <View style={styles.setsRow}>
                        {sets.map((s, sIdx) => (
                          <Text key={sIdx} style={[styles.technicalText, { color: 'rgba(255,255,255,0.45)' }]}>
                            S{sIdx + 1}: {(s.reps || 0)} reps ° {(s.weight_kg || 0)}kg{sIdx < sets.length - 1 ? '   ' : ''}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
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

export default function WorkoutHistoryScreen() {
  const theme = useTheme();
  const { data } = useWorkoutHistory();

  const workouts = data?.pages.flatMap((p: any) => p.data) ?? [];

  if (workouts.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={styles.emptyEmoji}>🏋️</Text>
        <Text variant="headlineSmall" style={[styles.emptyTitle, { color: theme.colors.onBackground }]}>
          ¡Aún no hay entrenamientos!
        </Text>
        <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
          Cada gran viaje empieza con un solo paso.{'\n'}¡Ve al gym y registra tu primera rutina!
        </Text>
      </View>
    );
  }



  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <WorkoutCard item={item} />}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        ListHeaderComponent={
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12, textAlign: 'center' }}>
            {data?.pages[0]?.pagination.total ?? 0} entrenamientos registrados
          </Text>
        }
        ListFooterComponent={
          <View style={{ height: 40 }} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  list: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 },
  card: { borderRadius: 20, marginBottom: 14, overflow: 'hidden' },
  cardContent: { padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  chipsWrapper: { marginHorizontal: -4 },
  chipsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  chip: { borderRadius: 20 },
  detailSurface: { borderRadius: 12, padding: 12, marginTop: 12 },
  exerciseRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  exerciseIndex: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(103,80,164,0.12)' },
  setsRow: { flexWrap: 'wrap', flexDirection: 'row', gap: 2, marginTop: 2 },
  technicalText: { fontFamily: 'SpaceMono', fontSize: 10, lineHeight: 14 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  emptySubtitle: { textAlign: 'center', lineHeight: 22 },
  loadMoreBtn: { borderRadius: 14, marginHorizontal: 32, marginTop: 8 },
});