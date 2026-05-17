import { useWorkoutHistory } from '@/src/hooks/useWorkoutHistory';
import { useWorkoutStore } from '@/src/store/useWorkoutStore';
import type { WorkoutLog, ExerciseLog } from '@/src/store/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import {
  Button,
  Text,
  useTheme
} from 'react-native-paper';

/**
 * Parsea una fecha `YYYY-MM-DD` en hora local, sin desplazamiento UTC.
 */
const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Devuelve el lunes de la semana actual (hora local 00:00:00).
 * En Colombia la semana empieza el lunes.
 */
const getMonday = (ref: Date): Date => {
  const d = new Date(ref);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
};

const formatDate = (dateStr: string): string => {
  return parseLocalDate(dateStr).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).replace(/^\w/, c => c.toUpperCase());
};

const FilterTabs = ({ selected, onSelect, theme }: any) => {
  const tabs = ['Esta semana', 'Mes', 'Ver todo'];
  return (
    <View style={[styles.filterContainer, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
      {tabs.map((tab, idx) => {
        const isActive = selected === tab;
        return (
          <React.Fragment key={tab}>
            <Pressable 
              onPress={() => onSelect(tab)}
              style={[styles.filterTab, isActive && { backgroundColor: theme.colors.primary }]}
            >
              <Text style={[styles.filterTabText, { color: theme.dark ? '#aaa' : '#666' }, isActive && { color: theme.colors.background, fontWeight: 'bold' }]}>
                {tab}
              </Text>
            </Pressable>
            {idx < tabs.length - 1 && <View style={[styles.filterDivider, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />}
          </React.Fragment>
        )
      })}
    </View>
  );
};

interface WorkoutCardProps {
  item: WorkoutLog;
}

function WorkoutCard({ item }: WorkoutCardProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const exerciseCount = item.exercises?.length ?? 0;

  return (
    <Pressable 
      style={[
        styles.card, 
        { 
          backgroundColor: theme.dark ? '#1c1c1e' : theme.colors.surface,
          borderColor: 'rgba(255,255,255,0.15)',
          borderWidth: 1.5,
          borderRadius: 16,
        }
      ]} 
      onPress={() => setExpanded(e => !e)}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
            {item.name}
          </Text>
          <Text style={[styles.cardSubtitle, { color: theme.colors.onSurfaceVariant }]}>
            {formatDate(item.date)}
          </Text>
        </View>
        <View style={styles.cardChips}>
          <View style={[styles.greenChip, { backgroundColor: 'rgba(204, 255, 0, 0.15)' }]}>
            <Text style={[styles.greenChipText, { color: theme.colors.primary }]}>
              {exerciseCount} {exerciseCount === 1 ? 'ejercicio' : 'ejercicios'}
            </Text>
          </View>
          {item.duration_mins !== undefined && item.duration_mins > 0 && (
            <View style={[styles.greenChip, { backgroundColor: 'rgba(204, 255, 0, 0.15)' }]}>
              <Text style={[styles.greenChipText, { color: theme.colors.primary }]}>{item.duration_mins} mins</Text>
            </View>
          )}
          <MaterialCommunityIcons name={expanded ? "chevron-up" : "chevron-down"} color={theme.colors.onSurfaceVariant} size={24} style={{ marginLeft: 4 }} />
        </View>
      </View>

      {expanded && exerciseCount > 0 && (
        <View style={styles.detailsContainer}>
          {item.exercises.map((ex, idx) => {
            const sets = ex.sets || [];
            const isConsistent = sets.length > 0 && sets.every(s => s.reps === sets[0].reps && s.weight_kg === sets[0].weight_kg);

            return (
              <View key={ex.id || idx} style={styles.exerciseRow}>
                <Text style={[styles.exerciseIndex, { color: theme.colors.onSurfaceVariant }]}>{idx + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.exerciseName, { color: theme.colors.onSurface }]}>{ex.name}</Text>
                  
                  <View style={{ marginTop: 4 }}>
                    {isConsistent ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={{ width: 70, color: theme.colors.onSurfaceVariant, fontFamily: 'SpaceMono', fontSize: 13, fontWeight: '500' }}>
                          {sets.length} Series
                        </Text>
                        <Text style={{ width: 16, color: theme.colors.onSurfaceVariant, fontFamily: 'SpaceMono', fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
                          •
                        </Text>
                        <Text style={{ width: 75, color: theme.colors.onSurfaceVariant, fontFamily: 'SpaceMono', fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
                          {sets[0].reps} Reps
                        </Text>
                        <Text style={{ width: 16, color: theme.colors.onSurfaceVariant, fontFamily: 'SpaceMono', fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
                          •
                        </Text>
                        <Text style={{ flex: 1, color: theme.colors.onSurfaceVariant, fontFamily: 'SpaceMono', fontSize: 13, fontWeight: '500', marginLeft: 8 }}>
                          {sets[0].weight_kg} kg
                        </Text>
                      </View>
                    ) : (
                      sets.map((s, sIdx) => (
                        <View key={sIdx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                          <Text style={{ width: 70, color: theme.colors.onSurfaceVariant, fontFamily: 'SpaceMono', fontSize: 13, fontWeight: '500' }}>
                            Serie {sIdx + 1}
                          </Text>
                          <Text style={{ width: 16, color: theme.colors.onSurfaceVariant, fontFamily: 'SpaceMono', fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
                            •
                          </Text>
                          <Text style={{ width: 75, color: theme.colors.onSurfaceVariant, fontFamily: 'SpaceMono', fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
                            {s.reps} Reps
                          </Text>
                          <Text style={{ width: 16, color: theme.colors.onSurfaceVariant, fontFamily: 'SpaceMono', fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
                            •
                          </Text>
                          <Text style={{ flex: 1, color: theme.colors.onSurfaceVariant, fontFamily: 'SpaceMono', fontSize: 13, fontWeight: '500', marginLeft: 8 }}>
                            {s.weight_kg} kg
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {expanded && exerciseCount === 0 && (
        <Text style={{ color: theme.colors.onSurfaceVariant, marginTop: 16, fontStyle: 'italic', textAlign: 'center' }}>
          Sin ejercicios registrados.
        </Text>
      )}
    </Pressable>
  );
}

export default function WorkoutIndexScreen() {
  const theme = useTheme();
  const [filter, setFilter] = useState('Esta semana');
  const { data } = useWorkoutHistory();

  const workouts = useMemo(() => {
    let all = data?.pages.flatMap((p: any) => p.data) ?? [];
    const today = new Date();

    if (filter === 'Esta semana') {
      const startOfWeek = getMonday(today);
      all = all.filter((w: any) => parseLocalDate(w.date) >= startOfWeek);
    } else if (filter === 'Mes') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      all = all.filter((w: any) => parseLocalDate(w.date) >= startOfMonth);
    }
    return all;
  }, [data, filter]);

  if (data?.pages.flatMap((p: any) => p.data).length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Text style={styles.emptyEmoji}>🏋️</Text>
        <Text variant="headlineSmall" style={[styles.emptyTitle, { color: theme.colors.onBackground }]}>
          ¡Aún no hay entrenamientos!
        </Text>
        <Text variant="bodyMedium" style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
          Cada gran viaje empieza con un solo paso.{'\n'}¡Ve al gym y registra tu primera rutina!
        </Text>
        <Button mode="contained" icon="plus" onPress={() => router.push('/(tabs)/workout/new')} style={{ marginTop: 16, borderRadius: 14 }}>
          Nueva Rutina
        </Button>
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
          <View style={{ marginBottom: 16, paddingTop: 16 }}>
            <View style={{ paddingBottom: 16 }}>
              <FilterTabs selected={filter} onSelect={setFilter} theme={theme} />
            </View>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, textAlign: 'center' }}>
              {workouts.length} entrenamientos registrados
            </Text>
          </View>
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
  list: { paddingTop: 16, paddingBottom: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  emptySubtitle: { textAlign: 'center', lineHeight: 22 },
  loadMoreBtn: { borderRadius: 14, marginHorizontal: 32, marginTop: 8 },

  filterContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 2,
    marginHorizontal: 16,
    alignItems: 'center'
  },
  filterTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 10,
  },
  filterTabText: {
    fontSize: 11,
    fontWeight: '500'
  },
  filterDivider: {
    width: 1,
    height: 16,
  },

  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
  },
  cardChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  greenChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  greenChipText: {
    fontSize: 9,
    fontWeight: '700',
  },
  detailsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.1)',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  exerciseIndex: {
    fontSize: 16,
    fontWeight: '700',
    width: 24,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  exerciseName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  exerciseCompact: {
    fontSize: 14,
    fontFamily: 'monospace',
  },
  exerciseVariant: {
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
});