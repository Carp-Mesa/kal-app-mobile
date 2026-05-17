import { FadeIn } from '@/src/components/FadeIn';
import type { WorkoutLog } from '@/src/store/types';
import { useWorkoutStore } from '@/src/store/useWorkoutStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import {
  Searchbar,
  Text,
  useTheme
} from 'react-native-paper';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 40;

// ─── Types ───────────────────────────────────────────────────────────────────

interface SetEntry {
  reps: number;
  weight_kg: number;
}

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

const groupExercises = (workouts: WorkoutLog[]): Map<string, ExerciseSession[]> => {
  const map = new Map<string, ExerciseSession[]>();
  for (const workout of workouts) {
    if (!workout.exercises || !Array.isArray(workout.exercises)) continue;
    for (const ex of workout.exercises) {
      const sets = ex.sets || [];
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

const HistoricSessionCard = ({ session, theme }: { session: ExerciseSession, theme: any }) => {
  return (
    <View style={{ marginBottom: 20 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: theme.colors.onSurface, fontWeight: '800', fontSize: 13 }}>
          {formatDateShort(session.date)}
        </Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: '700' }}>
          Vol: <Text style={{ color: theme.colors.onSurface }}>{session.volume}kg</Text>
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        {session.sets.map((s, idx) => (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 2 }}>
            <Text style={{ width: 60, color: theme.colors.primary, fontFamily: 'SpaceMono', fontSize: 11, fontWeight: '700' }}>
              Serie {idx + 1}
            </Text>
            <Text style={{ flex: 1, color: theme.colors.onSurface, fontFamily: 'SpaceMono', fontSize: 13, fontWeight: '500', textAlign: 'center' }}>
              {s.weight_kg}kg  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>x</Text>  {s.reps}
            </Text>
            <View style={{ width: 60 }} />
          </View>
        ))}
      </View>
    </View>
  );
};

const TopCards = ({ lastSession, prevSession, theme }: { lastSession?: ExerciseSession, prevSession?: ExerciseSession, theme: any }) => {
  const getDiff = (curr: number, prev: number) => {
    if (!prev || prev === 0) return null;
    const diff = ((curr - prev) / prev) * 100;
    return diff;
  };

  const diffVol = prevSession ? getDiff(lastSession?.volume || 0, prevSession.volume) : null;
  const isPositive = diffVol !== null && diffVol > 0;
  
  return (
    <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
      <View style={[styles.dashboardCard, { backgroundColor: theme.dark ? '#1A1A1A' : theme.colors.surface, flex: 1, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 6 }}>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Última Sesión</Text>
        </View>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginBottom: 4 }}>
          {lastSession ? formatDateShort(lastSession.date) : '...'}
        </Text>
        <Text style={{ color: theme.colors.onSurface, fontSize: 18, fontWeight: '800', marginBottom: 2 }}>
          {lastSession?.maxWeight || 0} <Text style={{ fontSize: 11, fontWeight: '500', color: theme.colors.onSurfaceVariant }}>kg máx</Text>
        </Text>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 8 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>
            {lastSession?.volume || 0}kg vol.
          </Text>
          <Text style={{ color: isPositive ? theme.colors.primary : theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: isPositive ? '700' : '500' }}>
            {diffVol !== null ? (diffVol > 0 ? `↑ +${diffVol.toFixed(1)}%` : diffVol < 0 ? `↓ ${diffVol.toFixed(1)}%` : 'Sin cambio') : ''}
          </Text>
        </View>
      </View>

      <View style={[styles.dashboardCard, { backgroundColor: theme.dark ? '#1A1A1A' : theme.colors.surface, flex: 1, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 6 }}>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Penúltima Sesión</Text>
        </View>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginBottom: 4 }}>
          {prevSession ? formatDateShort(prevSession.date) : '...'}
        </Text>
        <Text style={{ color: theme.colors.onSurface, fontSize: 18, fontWeight: '800', marginBottom: 2 }}>
          {prevSession?.maxWeight || 0} <Text style={{ fontSize: 11, fontWeight: '500', color: theme.colors.onSurfaceVariant }}>kg máx</Text>
        </Text>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 8 }} />
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11 }}>
          {prevSession?.volume || 0}kg vol.
        </Text>
      </View>
    </View>
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
    backgroundGradientFrom: theme.dark ? '#1A1A1A' : theme.colors.surface,
    backgroundGradientTo: theme.dark ? '#1A1A1A' : theme.colors.surface,
    color: (opacity = 1) => `rgba(204, 255, 0, ${opacity})`,
    labelColor: () => theme.colors.onSurfaceVariant,
    strokeWidth: 3,
    decimalPlaces: 0,
    propsForDots: { r: '4', strokeWidth: '2', stroke: theme.colors.primary },
    propsForBackgroundLines: { strokeDasharray: '4', strokeWidth: 1, stroke: 'rgba(255,255,255,0.05)' },
  };

  const chartWidth = SCREEN_WIDTH - 64; // accounting for container and card padding

  return (
    <View style={[styles.dashboardCard, { backgroundColor: theme.dark ? '#1A1A1A' : theme.colors.surface, borderColor: 'rgba(255, 255, 255, 0.15)', borderWidth: 1.5 }]}>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700', marginBottom: 12 }}>
        📈 Evolución de Volumen
      </Text>
      <View style={{ marginTop: 8 }}>
        <LineChart
          data={{ labels: chartData.labels, datasets: [{ data: chartData.values }] }}
          width={chartWidth}
          height={260}
          chartConfig={chartConfig}
          bezier
          style={{ borderRadius: 12, marginLeft: -16 }}
          fromZero
          withInnerLines
          verticalLabelRotation={30}
        />
      </View>
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const theme = useTheme();
  // ── LOCAL-FIRST: Read all workout data from local store ──────────────
  const allWorkouts = useWorkoutStore((state) => state.logs);

  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const grouped = useMemo(() => {
    if (allWorkouts.length === 0) return new Map<string, ExerciseSession[]>();
    return groupExercises(allWorkouts);
  }, [allWorkouts]);

  const exerciseNames = useMemo(() => {
    const names = Array.from(grouped.keys());
    names.sort((a, b) => {
      const aSessions = grouped.get(a)?.length ?? 0;
      const bSessions = grouped.get(b)?.length ?? 0;
      return bSessions - aSessions;
    });
    return names;
  }, [grouped]);

  const filteredNames = useMemo(() => {
    if (!searchQuery) return [];
    return exerciseNames.filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, exerciseNames]);

  const selectedSessions = selectedExercise ? grouped.get(selectedExercise) ?? [] : [];
  const lastThree = selectedSessions.slice(0, 3);
  const maxVolume = selectedSessions.length > 0
    ? Math.max(...selectedSessions.map((s) => s.volume))
    : 0;



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
    <FadeIn style={{ flex: 1 }}>
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ marginBottom: 24 }}>
        <Searchbar
          placeholder="Buscar ejercicio (ej. Press Militar)"
          onChangeText={(text) => {
            setSearchQuery(text);
            if (selectedExercise && text !== selectedExercise) {
              setSelectedExercise(null);
            }
          }}
          onClearIconPress={() => {
            setSearchQuery('');
            setSelectedExercise(null);
          }}
          value={searchQuery}
          style={{ backgroundColor: theme.dark ? '#1c1c1e' : theme.colors.surface, borderRadius: 16 }}
          iconColor={theme.colors.onSurfaceVariant}
          inputStyle={{ color: theme.colors.onSurface }}
        />
        {!selectedExercise && (
          <View style={{ marginTop: 8, backgroundColor: theme.dark ? '#1c1c1e' : theme.colors.surface, borderRadius: 16, overflow: 'hidden' }}>
            {(searchQuery ? filteredNames : exerciseNames).slice(0, 8).map((name, index, arr) => (
              <TouchableOpacity
                key={name}
                onPress={() => {
                  setSelectedExercise(name);
                  setSearchQuery(name);
                }}
                style={{
                  padding: 16,
                  borderBottomWidth: index === arr.length - 1 ? 0 : 1,
                  borderBottomColor: 'rgba(255,255,255,0.05)',
                  flexDirection: 'row',
                  alignItems: 'center'
                }}
              >
                <MaterialCommunityIcons name="dumbbell" size={20} color={theme.colors.onSurfaceVariant} style={{ marginRight: 12 }} />
                <Text style={{ color: theme.colors.onSurface, fontSize: 15 }}>{name}</Text>
              </TouchableOpacity>
            ))}
            {(searchQuery ? filteredNames : exerciseNames).length === 0 && (
              <View style={{ padding: 16 }}>
                <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>No se encontraron ejercicios</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {!selectedExercise ? (
        <View style={styles.centered}>
          <Text style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 32 }}>
            Busca un ejercicio para ver tu evolución.
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <TopCards lastSession={selectedSessions[0]} prevSession={selectedSessions[1]} theme={theme} />

          <Text style={{ color: theme.colors.onSurface, fontSize: 16, fontWeight: '800', marginBottom: 16 }}>Historial Detallado</Text>
          
          <View style={[styles.dashboardCard, { backgroundColor: theme.dark ? '#1A1A1A' : theme.colors.surface, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 0, marginBottom: 24 }]}>
            {selectedSessions.slice(0, 5).map((session, idx) => (
              <React.Fragment key={idx}>
                <HistoricSessionCard session={session} theme={theme} />
                {idx < Math.min(selectedSessions.length, 5) - 1 && (
                  <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 20, marginHorizontal: -20 }} />
                )}
              </React.Fragment>
            ))}
          </View>

          {selectedSessions.length > 1 && (
            <View style={{ marginBottom: 24 }}>
              <VolumeChart sessions={selectedSessions} />
            </View>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
    </FadeIn>
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
  dashboardCard: {
    borderRadius: 20,
    padding: 16,
  },
});