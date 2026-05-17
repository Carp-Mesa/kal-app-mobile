import { NutritionModal } from '@/src/components/modals/NutritionModal';
import { SleepModal } from '@/src/components/modals/SleepModal';
import { WaterModal } from '@/src/components/modals/WaterModal';
import { FadeIn } from '@/src/components/GainsSkeleton';
import { useWaterStore } from '@/src/store/useWaterStore';
import { useNutritionStore } from '@/src/store/useNutritionStore';
import { useSleepStore } from '@/src/store/useSleepStore';
import { useWorkoutStore } from '@/src/store/useWorkoutStore';
import { useProfileStore } from '@/src/store/useProfileStore';
import { useAppStore } from '@/src/store/useAppStore';
import { getLocalDateString } from '@/src/store/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { memo, useMemo, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  Card,
  Portal,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Cards ────────────────────────────────────────────────────────────

const CircularProgressCard = memo(function CircularProgressCard({ title, subtitle, icon, progress, style }: any) {
  const theme = useTheme();
  const size = 110;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - Math.min(progress, 1) * circumference;
  
  return (
    <View style={[{ 
      backgroundColor: theme.dark ? '#1c1c1e' : theme.colors.surface,
      borderColor: 'rgba(255,255,255,0.15)',
      borderWidth: 1.5,
      borderRadius: 16,
      padding: 16,
    }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(204, 255, 0, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
          <MaterialCommunityIcons name={icon} size={20} color={theme.colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.onSurface, fontWeight: '700', fontSize: 16 }} numberOfLines={1}>{title}</Text>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12 }} numberOfLines={1}>{subtitle}</Text>
        </View>
      </View>
      
      <View style={{ alignItems: 'center', justifyContent: 'center', height: size }}>
        <Svg width={size} height={size}>
          <Circle
            stroke={theme.dark ? 'rgba(204,255,0,0.15)' : 'rgba(0,0,0,0.05)'}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            stroke={theme.colors.primary}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="none"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.onSurface, fontSize: 22, fontWeight: 'bold' }}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      </View>
    </View>
  );
});

const WorkoutStatusCard = memo(function WorkoutStatusCard({ title, currentSession, duration, status, onPress }: any) {
  const theme = useTheme();
  return (
    <Card 
      onPress={onPress}
      style={{
        backgroundColor: theme.dark ? '#1c1c1e' : theme.colors.surface,
        borderColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1.5,
        borderRadius: 16,
        marginBottom: 16,
        elevation: 0,
      }}
    >
      <Card.Content style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(204, 255, 0, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
            <MaterialCommunityIcons name="dumbbell" size={20} color={theme.colors.primary} />
          </View>
          <Text style={{ color: theme.colors.onSurface, fontWeight: '700', fontSize: 18 }}>{title}</Text>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ color: theme.colors.onSurface, fontSize: 16 }} numberOfLines={1}>Sesión actual: {currentSession}</Text>
          <Text style={{ color: theme.colors.primary, fontSize: 16 }}>{duration}</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14 }}>Tiempo</Text>
          <Text style={{ color: theme.colors.primary, fontSize: 14 }}>{status}</Text>
        </View>
      </Card.Content>
    </Card>
  );
});

const SleepChartCard = memo(function SleepChartCard({ title, mainValue, subtitle }: any) {
  const theme = useTheme();
  const days = ['L', 'M', 'Mi', 'J', 'V', 'S', 'D'];
  const chartData = [0.5, 0.8, 0.5, 1.0, 0.7, 0.9, 0.6];

  return (
    <View style={{
        backgroundColor: theme.dark ? '#1c1c1e' : theme.colors.surface,
        borderColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1.5,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(204, 255, 0, 0.15)', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
          <MaterialCommunityIcons name="bed" size={20} color={theme.colors.primary} />
        </View>
        <Text style={{ color: theme.colors.onSurface, fontWeight: '700', fontSize: 18 }}>{title}</Text>
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 }}>
        <Text style={{ color: theme.colors.primary, fontSize: 24, fontWeight: 'bold' }}>{mainValue}</Text>
        <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14 }}>{subtitle}</Text>
      </View>

      {/* Bar Chart */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', height: 80, alignItems: 'flex-end', paddingHorizontal: 4 }}>
        {days.map((day, i) => (
          <View key={i} style={{ alignItems: 'center', width: 24 }}>
            <View style={{ 
              width: 18, 
              height: 50 * chartData[i] + 10, 
              backgroundColor: theme.colors.primary, 
              borderRadius: 4,
              marginBottom: 8
            }} />
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, fontWeight: '600' }}>{day}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});



// ─── Dashboard ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const theme = useTheme();
  const modalVisible = useAppStore((state) => state.modalVisible);
  const setModalVisible = useAppStore((state) => state.setModalVisible);

  // ── LOCAL-FIRST: Select raw arrays (stable refs) — never call functions in selectors ──
  // Calling getTodayTotal() etc. inside a selector returns a new reference every render
  // which causes React's useSyncExternalStore to infinite-loop (getSnapshot warning).
  const waterLogs = useWaterStore((state) => state.logs);
  const nutritionLogs = useNutritionStore((state) => state.logs);
  const sleepLogs = useSleepStore((state) => state.logs);
  const workoutLogs = useWorkoutStore((state) => state.logs);
  const profile = useProfileStore((state) => state.profile);

  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const handleSnackbar = (message: string) => setSnackbar({ visible: true, message });

  // ── Goals (from persisted profile or defaults) ─────────────────────────
  const waterGoal = profile?.water_goal || 2000;
  const calorieGoal = profile?.calorie_goal || 2000;

  // ── Derived values — stable via useMemo ─────────────────────────────────
  const today = getLocalDateString();

  const waterTotal = useMemo(
    () => waterLogs.filter((l) => l.created_at.startsWith(today)).reduce((s, l) => s + l.amount_ml, 0),
    [waterLogs, today],
  );

  const nutritionTotals = useMemo(
    () =>
      nutritionLogs
        .filter((l) => l.created_at.startsWith(today))
        .reduce(
          (acc, l) => ({
            calories: acc.calories + l.calories,
            protein: acc.protein + l.protein,
            carbs: acc.carbs + l.carbs,
            fats: acc.fats + l.fats,
          }),
          { calories: 0, protein: 0, carbs: 0, fats: 0 },
        ),
    [nutritionLogs, today],
  );

  const todaySleep = useMemo(() => {
    const log = sleepLogs.find((l) => l.date === today);
    if (!log) return null;
    const diffMs = new Date(log.end_time).getTime() - new Date(log.start_time).getTime();
    const total_minutes = diffMs > 0 ? Math.round(diffMs / 60000) : 0;
    return { ...log, duration: { hours: Math.floor(total_minutes / 60), minutes: total_minutes % 60, total_minutes } };
  }, [sleepLogs, today]);

  const todayWorkouts = useMemo(
    () => workoutLogs.filter((l) => l.date === today),
    [workoutLogs, today],
  );

  // ── Computed UI values ──────────────────────────────────────────────────
  const waterProgress = waterGoal > 0 ? waterTotal / waterGoal : 0;
  const waterLabel = `${waterTotal}/${waterGoal} ml`;

  const nutritionProgress = calorieGoal > 0 ? nutritionTotals.calories / calorieGoal : 0;
  const nutritionLabel = `${nutritionTotals.calories}/${calorieGoal} kcal`;

  const workoutCount = todayWorkouts.length;
  const workoutLabel = workoutCount > 0 ? `${workoutCount} Rutinas` : 'Pendiente';
  const workoutStatus = workoutCount > 0 ? 'Completado' : 'Pendiente';
  const workoutDuration = todayWorkouts.reduce((sum, w) => sum + (w.duration_mins || 0), 0);

  const totalSleepMins = todaySleep?.duration?.total_minutes || 0;
  const sleptHours = Math.floor(totalSleepMins / 60);
  const sleptMins = totalSleepMins % 60;

  const firstName = profile?.full_name?.split(' ')[0] || 'Campeón';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting ───────────────────────────────────────────── */}
        <View style={styles.greetingSection}>
          <FadeIn>
            <Text
              variant="headlineMedium"
              style={[styles.greeting, { color: theme.colors.onBackground }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Hola, {firstName}
            </Text>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Hoy, {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }).replace(' de ', ' de ')}
            </Text>
          </FadeIn>
        </View>

        {/* ── Grid (renders immediately — no skeletons) ──────────── */}
        <FadeIn>
          {/* Row 1: Agua + Nutrición */}
          <View style={styles.gridRow}>
            <CircularProgressCard
              title="Agua"
              subtitle={waterLabel}
              icon="water"
              progress={waterProgress}
              style={styles.halfCard}
            />
            <CircularProgressCard
              title="Nutrición"
              subtitle={nutritionLabel}
              icon="food-apple"
              progress={nutritionProgress}
              style={styles.halfCard}
            />
          </View>

          {/* Row 2: Entrenamiento */}
          <WorkoutStatusCard
            title="Entrenamiento"
            currentSession={workoutLabel}
            duration={`${workoutDuration} mins`}
            status={workoutStatus}
            onPress={() => router.push('/(tabs)/workout')}
          />

          {/* Row 3: Sueño */}
          <SleepChartCard
            title="Sueño"
            mainValue={`${sleptHours}h ${sleptMins}m`}
            subtitle="Horas dormidas"
          />
        </FadeIn>

      </ScrollView>

      <WaterModal
        visible={modalVisible === 'water'}
        onDismiss={() => setModalVisible('none')}
        waterGoal={waterGoal}
        onSuccess={() => handleSnackbar('¡Agua registrada!')}
      />
      <NutritionModal
        visible={modalVisible === 'nutrition'}
        onDismiss={() => setModalVisible('none')}
        onSuccess={() => handleSnackbar('¡Comida registrada!')}
      />
      <SleepModal
        visible={modalVisible === 'sleep'}
        onDismiss={() => setModalVisible('none')}
        onSuccess={() => handleSnackbar('¡Sueño registrado!')}
      />

      <Portal>
        <Snackbar visible={snackbar.visible} onDismiss={() => setSnackbar({ visible: false, message: '' })} duration={3000}>
          {snackbar.message}
        </Snackbar>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  greetingSection: {
    marginTop: -6,
    marginBottom: 20,
    gap: 4,
  },
  greeting: {
    fontWeight: '800',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 0,
    alignItems: 'stretch',
  },
  halfCard: {
    flex: 1,
    marginBottom: 16,
  },
});
