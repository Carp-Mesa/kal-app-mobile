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
} from 'react-native-paper';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Design Tokens ───────────────────────────────────────────────────────────
const CYBER = '#CCFF00';
const WHITE = '#FFFFFF';
const SILVER = '#888888';
const CARD_BG = '#1A1A1A';
const BORDER_COLOR = 'rgba(255, 255, 255, 0.15)';
const DARK_BG = '#121212';

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
  try {
    const [year, month, day] = dateStr.split('-');
    return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('es-CO', {
      day: 'numeric',
      month: 'short',
    });
  } catch (e) {
    return dateStr;
  }
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

// ─── Sub-Components ──────────────────────────────────────────────────────────

const HistoricSessionCard = ({ session }: { session: ExerciseSession }) => {
  return (
    <View style={{ marginBottom: 20 }}>
      {/* Session Title Bar */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <MaterialCommunityIcons name="calendar-month-outline" size={15} color={CYBER} />
          <Text style={{ color: WHITE, fontWeight: '800', fontSize: 13 }}>
            {formatDateShort(session.date)}
          </Text>
        </View>
        <View style={{ backgroundColor: 'rgba(204, 255, 0, 0.1)', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6 }}>
          <Text style={{ color: CYBER, fontSize: 11, fontWeight: '800' }}>
            Vol: {session.volume.toLocaleString('es-CO')} kg
          </Text>
        </View>
      </View>

      {/* Sets Grid */}
      <View style={{ backgroundColor: 'rgba(0,0,0,0.18)', borderRadius: 12, padding: 10, borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }}>
        {session.sets.map((s, idx) => (
          <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 3, paddingHorizontal: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: SILVER, fontSize: 9, fontWeight: '800' }}>{idx + 1}</Text>
              </View>
              <Text style={{ color: SILVER, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 }}>SERIE</Text>
            </View>
            <Text style={{ color: WHITE, fontFamily: 'SpaceMono', fontSize: 13, fontWeight: '700' }}>
              {s.weight_kg} <Text style={{ fontSize: 10, color: SILVER, fontWeight: '400' }}>kg</Text>  ×  {s.reps} <Text style={{ fontSize: 10, color: SILVER, fontWeight: '400' }}>reps</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const TopCards = ({ lastSession, prevSession }: { lastSession?: ExerciseSession, prevSession?: ExerciseSession }) => {
  const getDiff = (curr: number, prev: number) => {
    if (!prev || prev === 0) return null;
    return ((curr - prev) / prev) * 100;
  };

  const diffVol = prevSession ? getDiff(lastSession?.volume || 0, prevSession.volume) : null;
  const isPositive = diffVol !== null && diffVol > 0;

  return (
    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
      {/* Last Session Card */}
      <View style={[styles.dashboardCard, { flex: 1, borderColor: BORDER_COLOR, borderWidth: 1.5 }]}>
        <Text style={{ color: SILVER, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Última Sesión</Text>
        <Text style={{ color: SILVER, fontSize: 11, marginBottom: 6 }}>
          {lastSession ? formatDateShort(lastSession.date) : 'Sin fecha'}
        </Text>
        <Text style={{ color: WHITE, fontSize: 20, fontWeight: '900', marginBottom: 2 }}>
          {lastSession?.maxWeight || 0} <Text style={{ fontSize: 12, fontWeight: '500', color: SILVER }}>kg max</Text>
        </Text>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 8 }} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: SILVER, fontSize: 11 }}>
            {lastSession?.volume || 0}kg vol.
          </Text>
          {diffVol !== null && (
            <Text style={{ color: isPositive ? CYBER : '#FF4444', fontSize: 11, fontWeight: '900' }}>
              {isPositive ? `↑ +${diffVol.toFixed(0)}%` : `↓ ${diffVol.toFixed(0)}%`}
            </Text>
          )}
        </View>
      </View>

      {/* Penultimate Session Card */}
      <View style={[styles.dashboardCard, { flex: 1, borderColor: BORDER_COLOR, borderWidth: 1.5 }]}>
        <Text style={{ color: SILVER, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Penúltima Sesión</Text>
        <Text style={{ color: SILVER, fontSize: 11, marginBottom: 6 }}>
          {prevSession ? formatDateShort(prevSession.date) : 'Sin fecha'}
        </Text>
        <Text style={{ color: WHITE, fontSize: 20, fontWeight: '900', marginBottom: 2 }}>
          {prevSession?.maxWeight || 0} <Text style={{ fontSize: 12, fontWeight: '500', color: SILVER }}>kg max</Text>
        </Text>
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 8 }} />
        <Text style={{ color: SILVER, fontSize: 11 }}>
          {prevSession?.volume || 0}kg vol.
        </Text>
      </View>
    </View>
  );
};

const VolumeChart = ({ sessions }: { sessions: ExerciseSession[] }) => {
  const chartData = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
    return {
      labels: sorted.map((s) => formatDateShort(s.date)),
      values: sorted.map((s) => Math.round(s.volume)),
    };
  }, [sessions]);

  const chartConfig = {
    backgroundGradientFrom: CARD_BG,
    backgroundGradientTo: CARD_BG,
    color: (opacity = 1) => `rgba(204, 255, 0, ${opacity})`,
    labelColor: () => SILVER,
    strokeWidth: 3,
    decimalPlaces: 0,
    propsForDots: { r: '5', strokeWidth: '2', stroke: CYBER },
    propsForBackgroundLines: { strokeDasharray: '4', strokeWidth: 1, stroke: 'rgba(255,255,255,0.05)' },
  };

  const chartWidth = SCREEN_WIDTH - 64;

  return (
    <View style={[styles.dashboardCard, { borderColor: BORDER_COLOR, borderWidth: 1.5 }]}>
      <Text style={{ color: WHITE, fontWeight: '800', fontSize: 14, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Evolución de Volumen
      </Text>
      <View style={{ marginTop: 8 }}>
        <LineChart
          data={{ labels: chartData.labels, datasets: [{ data: chartData.values }] }}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={{ borderRadius: 12, marginLeft: -16 }}
          fromZero
          withInnerLines
          verticalLabelRotation={15}
        />
      </View>
    </View>
  );
};

// ─── Main Screen Component ───────────────────────────────────────────────────

export default function ProgressScreen() {
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

  // Overall statistics compilation
  const { totalAllTimeSets, totalAllTimeVolume } = useMemo(() => {
    let totalSets = 0;
    let totalVol = 0;
    for (const workout of allWorkouts) {
      if (!workout.exercises || !Array.isArray(workout.exercises)) continue;
      for (const ex of workout.exercises) {
        const sets = ex.sets || [];
        totalSets += sets.length;
        totalVol += sets.reduce((sum, s) => sum + (s.reps || 0) * (s.weight_kg || 0), 0);
      }
    }
    return { totalAllTimeSets: totalSets, totalAllTimeVolume: totalVol };
  }, [allWorkouts]);

  // Favorite / Frequent exercises (Top 4 based on frequency)
  const frequentExercises = useMemo(() => {
    return exerciseNames.slice(0, 4);
  }, [exerciseNames]);

  // Recent unique exercises
  const recentExercises = useMemo(() => {
    const uniques = new Set<string>();
    const sortedWorkouts = [...allWorkouts].sort((a, b) => b.date.localeCompare(a.date));
    for (const w of sortedWorkouts) {
      if (!w.exercises) continue;
      for (const ex of w.exercises) {
        uniques.add(ex.name);
        if (uniques.size >= 5) break;
      }
      if (uniques.size >= 5) break;
    }
    return Array.from(uniques);
  }, [allWorkouts]);

  const filteredNames = useMemo(() => {
    if (!searchQuery) return [];
    return exerciseNames.filter(name => name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, exerciseNames]);

  const selectedSessions = selectedExercise ? grouped.get(selectedExercise) ?? [] : [];
  const maxWeightPR = selectedSessions.length > 0
    ? Math.max(...selectedSessions.map((s) => s.maxWeight))
    : 0;

  if (exerciseNames.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: DARK_BG }]}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(204, 255, 0, 0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: 20 }}>
          <MaterialCommunityIcons name="chart-bell-curve" size={32} color={CYBER} />
        </View>
        <Text style={{ color: WHITE, fontWeight: '900', fontSize: 18, marginBottom: 8 }}>
          Sin datos aún
        </Text>
        <Text style={{ color: SILVER, fontSize: 13, textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 }}>
          Registra tus entrenamientos en vivo o de forma manual para desbloquear analíticas e historial de progreso.
        </Text>
      </View>
    );
  }

  const showSearchDropdown = searchQuery.trim().length > 0 && !selectedExercise;

  return (
    <FadeIn style={{ flex: 1 }}>
      <ScrollView
        style={[styles.container, { backgroundColor: DARK_BG }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══ Header Section ═══ */}
        <View style={{ marginBottom: 16 }}>
          <Searchbar
            placeholder="Buscar ejercicio..."
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
            style={{ backgroundColor: '#1A1A1A', borderRadius: 16, borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }}
            iconColor={SILVER}
            inputStyle={{ color: WHITE, fontSize: 14 }}
            placeholderTextColor={SILVER}
          />

          {/* Search Dropdown / Autocomplete suggestions */}
          {showSearchDropdown && (
            <View style={{ marginTop: 8, backgroundColor: '#1C1C1E', borderRadius: 16, overflow: 'hidden', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 }}>
              {filteredNames.slice(0, 5).map((name, index, arr) => (
                <TouchableOpacity
                  key={name}
                  onPress={() => {
                    setSelectedExercise(name);
                    setSearchQuery(name);
                  }}
                  style={{
                    padding: 14,
                    borderBottomWidth: index === arr.length - 1 ? 0 : 1,
                    borderBottomColor: 'rgba(255,255,255,0.05)',
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                >
                  <MaterialCommunityIcons name="dumbbell" size={16} color={CYBER} style={{ marginRight: 12 }} />
                  <Text style={{ color: WHITE, fontSize: 14, fontWeight: '700' }}>{name}</Text>
                </TouchableOpacity>
              ))}
              {filteredNames.length === 0 && (
                <View style={{ padding: 16 }}>
                  <Text style={{ color: SILVER, textAlign: 'center', fontSize: 13 }}>No se encontraron ejercicios</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* ═══ Main View Toggle (Dashboard vs Specific Exercise progress) ═══ */}
        {!selectedExercise ? (
          <View style={{ flex: 1 }}>
            {/* General Stats Dashboard Hero */}
            <View style={[styles.dashboardCard, { borderColor: BORDER_COLOR, borderWidth: 1.5, marginBottom: 24, padding: 20 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(204, 255, 0, 0.15)', justifyContent: 'center', alignItems: 'center' }}>
                  <MaterialCommunityIcons name="lightning-bolt" size={20} color={CYBER} />
                </View>
                <View>
                  <Text style={{ color: WHITE, fontSize: 15, fontWeight: '900' }}>Resumen de Fuerza</Text>
                  <Text style={{ color: SILVER, fontSize: 11 }}>Tu trayectoria acumulada en Gains Station</Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, alignItems: 'center', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }}>
                  <Text style={{ color: CYBER, fontSize: 18, fontWeight: '900' }}>{allWorkouts.length}</Text>
                  <Text style={{ color: SILVER, fontSize: 9, fontWeight: '800', marginTop: 4 }}>ENTRENOS</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, alignItems: 'center', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }}>
                  <Text style={{ color: WHITE, fontSize: 18, fontWeight: '900' }}>{totalAllTimeSets}</Text>
                  <Text style={{ color: SILVER, fontSize: 9, fontWeight: '800', marginTop: 4 }}>SERIES</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, alignItems: 'center', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }}>
                  <Text style={{ color: WHITE, fontSize: 17, fontWeight: '900' }}>{Math.round(totalAllTimeVolume / 1000)}t</Text>
                  <Text style={{ color: SILVER, fontSize: 9, fontWeight: '800', marginTop: 4 }}>VOL EN TONELADAS</Text>
                </View>
              </View>
            </View>

            {/* Favorite / Frequent exercises */}
            {frequentExercises.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: WHITE, fontSize: 12, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Frecuentes</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {frequentExercises.map((name) => (
                    <TouchableOpacity
                      key={name}
                      onPress={() => {
                        setSelectedExercise(name);
                        setSearchQuery(name);
                      }}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.04)',
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 12,
                        borderColor: 'rgba(255,255,255,0.08)',
                        borderWidth: 1,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <MaterialCommunityIcons name="star" size={14} color={CYBER} />
                      <Text style={{ color: WHITE, fontSize: 13, fontWeight: '700' }}>{name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Recent Exercises List */}
            {recentExercises.length > 0 && (
              <View style={{ marginBottom: 24 }}>
                <Text style={{ color: WHITE, fontSize: 12, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Actividad Reciente 🕒</Text>
                <View style={{ backgroundColor: CARD_BG, borderRadius: 20, borderColor: BORDER_COLOR, borderWidth: 1.5, overflow: 'hidden' }}>
                  {recentExercises.map((exName, index, arr) => {
                    const sessions = grouped.get(exName) || [];
                    const lastSession = sessions[0];
                    return (
                      <TouchableOpacity
                        key={exName}
                        onPress={() => {
                          setSelectedExercise(exName);
                          setSearchQuery(exName);
                        }}
                        style={{
                          padding: 16,
                          borderBottomWidth: index === arr.length - 1 ? 0 : 1,
                          borderBottomColor: 'rgba(255,255,255,0.05)',
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(204, 255, 0, 0.1)', justifyContent: 'center', alignItems: 'center' }}>
                            <MaterialCommunityIcons name="dumbbell" size={16} color={CYBER} />
                          </View>
                          <View>
                            <Text style={{ color: WHITE, fontSize: 14, fontWeight: '700' }}>{exName}</Text>
                            <Text style={{ color: SILVER, fontSize: 11 }}>{sessions.length} sesiones registradas</Text>
                          </View>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: WHITE, fontSize: 14, fontWeight: '900' }}>{lastSession?.maxWeight || 0} kg</Text>
                          <Text style={{ color: SILVER, fontSize: 10 }}>Carga Máx</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Active Exercise Detail Header */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedExercise(null);
                    setSearchQuery('');
                  }}
                  style={{ marginRight: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' }}
                >
                  <MaterialCommunityIcons name="arrow-left" size={20} color={CYBER} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={{ color: WHITE, fontSize: 17, fontWeight: '900' }}>{selectedExercise}</Text>
                  <Text style={{ color: SILVER, fontSize: 11 }}>Historial y analíticas de fuerza</Text>
                </View>
              </View>
              {maxWeightPR > 0 && (
                <View style={{ backgroundColor: 'rgba(204, 255, 0, 0.1)', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderColor: 'rgba(204, 255, 0, 0.25)', borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialCommunityIcons name="trophy" size={13} color={CYBER} />
                  <Text style={{ color: CYBER, fontSize: 11, fontWeight: '900' }}>PR {maxWeightPR} kg</Text>
                </View>
              )}
            </View>

            {/* Last & Penultimate Session Cards */}
            <TopCards lastSession={selectedSessions[0]} prevSession={selectedSessions[1]} />

            {/* Volume Progression Chart */}
            {selectedSessions.length > 1 && (
              <View style={{ marginBottom: 24 }}>
                <VolumeChart sessions={selectedSessions} />
              </View>
            )}

            {/* Detailed Set Logs Cards */}
            <Text style={{ color: WHITE, fontSize: 12, fontWeight: '800', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Historial Detallado</Text>

            <View style={[styles.dashboardCard, { borderColor: BORDER_COLOR, borderWidth: 1.5, paddingBottom: 0, marginBottom: 24 }]}>
              {selectedSessions.slice(0, 5).map((session, idx) => (
                <React.Fragment key={idx}>
                  <HistoricSessionCard session={session} />
                  {idx < Math.min(selectedSessions.length, 5) - 1 && (
                    <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginBottom: 20, marginHorizontal: -16 }} />
                  )}
                </React.Fragment>
              ))}
            </View>
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
    backgroundColor: CARD_BG,
    borderRadius: 20,
    padding: 16,
  },
});