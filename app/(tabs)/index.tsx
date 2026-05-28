import { FadeIn } from '@/src/components/FadeIn';
import { NutritionModal } from '@/src/components/modals/NutritionModal';
import { SleepModal } from '@/src/components/modals/SleepModal';
import { WaterModal } from '@/src/components/modals/WaterModal';
import { GlossaryModal } from '@/src/components/modals/GlossaryModal';
import { getLocalDateString, isLocalDate } from '@/src/store/types';
import { useAppStore } from '@/src/store/useAppStore';
import { useNutritionStore } from '@/src/store/useNutritionStore';
import { useProfileStore } from '@/src/store/useProfileStore';
import { useSleepStore } from '@/src/store/useSleepStore';
import { useWaterStore } from '@/src/store/useWaterStore';
import { useWorkoutStore } from '@/src/store/useWorkoutStore';
import { useAppDateStore } from '@/src/store/useAppDateStore';
import { useShadowSyncStore } from '@/src/store/useShadowSyncStore';
import { useSleepWeeklyStats } from '@/src/hooks/useSleepWeeklyStats';
import { capitalizeName } from '@/src/utils/formatting';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  AppStateStatus,
  BackHandler,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Button,
  Card,
  Portal,
  Text,
  useTheme,
} from 'react-native-paper';
import { CustomToast } from '@/src/components/CustomToast';
import Svg, { Circle } from 'react-native-svg';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ─── Cards ────────────────────────────────────────────────────────────

const getHpiColor = (HPI: number, theme: any) => {
  if (HPI >= 900) return theme.colors.primary; // Neon green
  if (HPI >= 750) return '#4FC3F7'; // Blue
  if (HPI >= 500) return '#FFB74D'; // Orange
  return '#EF5350'; // Red
};

const getIconBgColor = (color: string, theme: any) => {
  const isPrimary = color === '#CCFF00' || color === theme.colors.primary;
  if (isPrimary) return theme.dark ? 'rgba(204, 255, 0, 0.08)' : 'rgba(204, 255, 0, 0.05)';
  if (color === '#FFB74D') return theme.dark ? 'rgba(255, 183, 77, 0.08)' : 'rgba(255, 183, 77, 0.05)';
  if (color === '#4FC3F7') return theme.dark ? 'rgba(79, 195, 247, 0.08)' : 'rgba(79, 195, 247, 0.05)';
  if (color === '#EF5350') return theme.dark ? 'rgba(239, 83, 80, 0.08)' : 'rgba(239, 83, 80, 0.05)';
  return theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
};

const PillarGridCard = memo(function PillarGridCard({ title, subtitle, icon, valueText, progress, color, onPress }: any) {
  const theme = useTheme();
  const size = 44; // Slightly more compact to gain horizontal text space
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - Math.min(progress, 1) * circumference;

  const isNumeric = /^\d/.test(valueText);
  const activeColor = color || theme.colors.primary;
  const iconBg = getIconBgColor(activeColor, theme);

  return (
    <Card 
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: theme.dark ? '#1c1c1e' : theme.colors.surface,
        borderColor: progress >= 1 ? activeColor : 'rgba(255,255,255,0.12)', // Border color matches its own accent color when completed!
        borderWidth: 1.5,
        borderRadius: 18,
        elevation: 0,
      }}
    >
      <Card.Content style={{ padding: 12 }}>
        {/* Symmetrical Left Grouped Header */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: iconBg, justifyContent: 'center', alignItems: 'center' }}>
            <MaterialCommunityIcons name={icon} size={16} color={activeColor} />
          </View>
          <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>
        </View>

        {/* Dynamic Typography and Spacing to prevent cutting */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'space-between' }}>
          <View style={{ flex: 1, marginRight: 2 }}>
            <Text 
              style={{ 
                color: theme.colors.onSurface, 
                fontSize: isNumeric ? 16 : 14, 
                fontWeight: '900', 
                fontFamily: isNumeric ? 'SpaceMono' : undefined,
              }} 
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {valueText}
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 10, marginTop: 2 }} numberOfLines={1}>{subtitle}</Text>
          </View>

          {/* Symmetrical mini progress wheel */}
          <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={size} height={size}>
              <Circle
                stroke={theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
                fill="none"
              />
              <Circle
                stroke={activeColor}
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
            <View style={{ position: 'absolute' }}>
              <Text style={{ color: theme.colors.onSurface, fontSize: 8.5, fontWeight: '800' }}>
                {Math.round(Math.min(progress, 9.99) * 100)}%
              </Text>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
});

const mockSleepAnalytics = {
  weekly_summary: {
    total_days_with_sleep: 0,
    total_days_in_week: 7,
    average_duration_minutes: 0,
    average_duration_formatted: '0h 0m',
    average_quality_score: 0,
    days_meeting_goal: 0,
    sleep_goal_minutes: 480,
    sleep_goal_hours: 8,
  },
  days: [
    { date: '', day_name: 'Lunes', day_name_short: 'Lun', has_sleep_log: false, total_minutes: 0, hours: 0, minutes: 0, quality_score: null, start_time: null, end_time: null, is_goal_met: false },
    { date: '', day_name: 'Martes', day_name_short: 'Mar', has_sleep_log: false, total_minutes: 0, hours: 0, minutes: 0, quality_score: null, start_time: null, end_time: null, is_goal_met: false },
    { date: '', day_name: 'Miércoles', day_name_short: 'Mie', has_sleep_log: false, total_minutes: 0, hours: 0, minutes: 0, quality_score: null, start_time: null, end_time: null, is_goal_met: false },
    { date: '', day_name: 'Jueves', day_name_short: 'Jue', has_sleep_log: false, total_minutes: 0, hours: 0, minutes: 0, quality_score: null, start_time: null, end_time: null, is_goal_met: false },
    { date: '', day_name: 'Viernes', day_name_short: 'Vie', has_sleep_log: false, total_minutes: 0, hours: 0, minutes: 0, quality_score: null, start_time: null, end_time: null, is_goal_met: false },
    { date: '', day_name: 'Sábado', day_name_short: 'Sab', has_sleep_log: false, total_minutes: 0, hours: 0, minutes: 0, quality_score: null, start_time: null, end_time: null, is_goal_met: false },
    { date: '', day_name: 'Domingo', day_name_short: 'Dom', has_sleep_log: false, total_minutes: 0, hours: 0, minutes: 0, quality_score: null, start_time: null, end_time: null, is_goal_met: false },
  ],
  insights: {
    best_quality_day: null,
    longest_sleep_day: null,
    shortest_sleep_day: null,
    consistency_score: 0,
  },
};

const SleepChartCard = memo(function SleepChartCard({ title, analytics, isLoading }: any) {
  const theme = useTheme();

  const weeklySummary = analytics?.weekly_summary || mockSleepAnalytics.weekly_summary;
  const days = analytics?.days || mockSleepAnalytics.days;
  const insights = analytics?.insights || mockSleepAnalytics.insights;

  const getConsistencyLabel = (score: number) => {
    if (score >= 90) return '¡Excelente ritmo!';
    if (score >= 70) return 'Buen descanso';
    if (score >= 50) return 'Ritmo regular';
    return 'Establece tu rutina';
  };

  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return (
    <Card 
      style={{
        backgroundColor: theme.dark ? '#1c1c1e' : theme.colors.surface,
        borderColor: 'rgba(255,255,255,0.12)',
        borderWidth: 1.5,
        borderRadius: 18,
        marginBottom: 16,
        elevation: 0,
      }}
    >
      <Card.Content style={{ padding: 12 }}>
        {/* Futuristic Cohesive Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', justifyContent: 'center', alignItems: 'center' }}>
              <MaterialCommunityIcons name="bed" size={16} color={theme.colors.primary} />
            </View>
            <View>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 10, marginTop: 1 }}>Consistencia semanal</Text>
            </View>
          </View>
          
          {/* Average Badge */}
          <View style={{ 
            backgroundColor: theme.dark ? 'rgba(204,255,0,0.08)' : 'rgba(0,0,0,0.03)', 
            borderWidth: 1, 
            borderColor: 'rgba(204,255,0,0.15)', 
            borderRadius: 12, 
            paddingHorizontal: 8, 
            paddingVertical: 3 
          }}>
            <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Promedio
            </Text>
          </View>
        </View>

        {/* Cohesive Primary Metric Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16 }}>
          <View>
            <Text style={{ color: theme.colors.primary, fontSize: 24, fontWeight: '900', fontFamily: 'SpaceMono' }}>
              {weeklySummary.average_duration_formatted || '0h 0m'}
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 10, marginTop: 2 }}>
              Duración diaria promedio de descanso
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: theme.colors.onSurface, fontSize: 12, fontWeight: '700', fontFamily: 'SpaceMono' }}>
              {weeklySummary.total_days_with_sleep} / {weeklySummary.total_days_in_week} d
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 9, marginTop: 2 }}>
              Registrados
            </Text>
          </View>
        </View>

        {/* Space-Saving Futuristic Dynamic Bar Chart (No circle row) */}
        <View style={{ 
          flexDirection: 'row', 
          justifyContent: 'space-between', 
          height: 80, 
          alignItems: 'flex-end', 
          paddingHorizontal: 4, 
          marginBottom: 6 
        }}>
          {days.map((day: any, i: number) => {
            const totalMins = day?.total_minutes || 0;
            const hours = totalMins / 60;
            // Scale relative to 12 hours (720 minutes), maximum graph height is 55px to be ultra-clean
            const barHeight = Math.max(Math.min((totalMins / 720) * 55, 55), 4);
            const hasLog = day?.has_sleep_log;
            const isGoalMet = day?.is_goal_met;

            let barBgColor = theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
            if (hasLog) {
              barBgColor = isGoalMet ? theme.colors.primary : '#FFB74D';
            }

            return (
              <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                {hasLog ? (
                  <Text style={{ 
                    color: isGoalMet ? theme.colors.primary : '#FFB74D', 
                    fontSize: 8, 
                    fontWeight: '800', 
                    marginBottom: 2,
                    fontFamily: 'SpaceMono'
                  }}>
                    {hours.toFixed(1)}h
                  </Text>
                ) : (
                  <Text style={{ fontSize: 8, color: 'transparent', marginBottom: 2 }}>-</Text>
                )}
                <View style={{ 
                  width: 12, 
                  height: barHeight, 
                  backgroundColor: barBgColor, 
                  borderRadius: 3,
                  marginBottom: 6
                }} />
                <Text style={{ 
                  color: hasLog ? theme.colors.onSurface : theme.colors.onSurfaceVariant, 
                  fontSize: 9, 
                  fontWeight: '800',
                  opacity: hasLog ? 1 : 0.5
                }}>
                  {day?.day_name_short?.charAt(0) || dayLabels[i]}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 12 }} />

        {/* Highly Cohesive Insights Columns */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
          {/* Consistencia */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(79, 195, 247, 0.12)', justifyContent: 'center', alignItems: 'center' }}>
              <MaterialCommunityIcons name="pulse" size={13} color="#4FC3F7" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 }}>CONSISTENCIA</Text>
              <Text style={{ color: '#4FC3F7', fontSize: 13, fontWeight: '900', fontFamily: 'SpaceMono', marginTop: 1 }}>
                {insights.consistency_score}%
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 8 }} numberOfLines={1}>
                {getConsistencyLabel(insights.consistency_score)}
              </Text>
            </View>
          </View>

          {/* Mejor Calidad */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255, 183, 77, 0.12)', justifyContent: 'center', alignItems: 'center' }}>
              <MaterialCommunityIcons name="star-face" size={13} color="#FFB74D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 }}>MEJOR NOCHE</Text>
              <Text style={{ color: '#FFB74D', fontSize: 13, fontWeight: '900', fontFamily: 'SpaceMono', marginTop: 1 }} numberOfLines={1}>
                {insights.best_quality_day ? insights.best_quality_day.day_name_short : 'Sin datos'}
              </Text>
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 8 }} numberOfLines={1}>
                {insights.best_quality_day ? `Calidad: ${insights.best_quality_day.quality_score}/5` : 'Sin registros'}
              </Text>
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
});







// ─── Dashboard ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const theme = useTheme();
  const modalVisible = useAppStore((state) => state.modalVisible);
  const setModalVisible = useAppStore((state) => state.setModalVisible);

  // ── Hardware Back Button handler to exit app cleanly ────────────────────
  useEffect(() => {
    const onBackPress = () => {
      BackHandler.exitApp();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  // ── LOCAL-FIRST: Select raw arrays (stable refs) — never call functions in selectors ──
  // Calling getTodayTotal() etc. inside a selector returns a new reference every render
  // which causes React's useSyncExternalStore to infinite-loop (getSnapshot warning).
  const waterLogs = useWaterStore((state) => state.logs);
  const nutritionLogs = useNutritionStore((state) => state.logs);
  const sleepLogs = useSleepStore((state) => state.logs);
  const workoutLogs = useWorkoutStore((state) => state.logs);
  const profile = useProfileStore((state) => state.profile);

  const { data: sleepAnalytics, refetch: refetchSleep } = useSleepWeeklyStats();
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const handleSnackbar = (message: string) => setSnackbar({ visible: true, message });

  const syncAll = useShadowSyncStore((state) => state.syncAll);
  const fetchAndMerge = useShadowSyncStore((state) => state.fetchAndMerge);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // 1. Push any unsynced local data to the server
      await syncAll();
      // 2. Fetch recent records from the server and merge them
      await fetchAndMerge(true);
      // 3. Re-fetch sleep analytics
      await refetchSleep();
      handleSnackbar('¡Datos sincronizados!');
    } catch (err) {
      console.error('[Dashboard] Pull-to-refresh error:', err);
      handleSnackbar('Sincronizado en modo local offline.');
    } finally {
      setRefreshing(false);
    }
  }, [syncAll, fetchAndMerge, refetchSleep]);

  // ── Goals (from persisted profile or defaults) ─────────────────────────
  const waterGoal = profile?.water_goal || 2000;
  const calorieGoal = profile?.calorie_goal || 2000;
  const proteinGoal = profile?.protein_goal || 150;
  const carbsGoal = profile?.carbs_goal || 300;
  const fatsGoal = profile?.fats_goal || 70;

  // ── Derived values — stable via useMemo ─────────────────────────────────
  // `today` is reactively synchronized from the global app date store
  // so that when crossing midnight or waking the app, cards reset instantly.
  const today = useAppDateStore((state) => state.currentLocalDate);

  const waterTotal = useMemo(
    () => waterLogs.filter((l) => isLocalDate(l.created_at, today)).reduce((s, l) => s + (Number(l.amount_ml) || 0), 0),
    [waterLogs, today],
  );

  const nutritionTotals = useMemo(
    () =>
      nutritionLogs
        .filter((l) => isLocalDate(l.created_at, today))
        .reduce(
          (acc, l) => ({
            calories: acc.calories + (Number(l.calories) || 0),
            protein: acc.protein + (Number(l.protein) || 0),
            carbs: acc.carbs + (Number(l.carbs) || 0),
            fats: acc.fats + (Number(l.fats) || 0),
          }),
          { calories: 0, protein: 0, carbs: 0, fats: 0 },
        ),
    [nutritionLogs, today],
  );

  const todaySleep = useMemo(() => {
    const log = sleepLogs.find((l) => l.date === today || isLocalDate(l.start_time, today));
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
  const proteinPct = proteinGoal > 0 ? Math.min(nutritionTotals.protein / proteinGoal, 1) : 0;
  const carbsPct = carbsGoal > 0 ? Math.min(nutritionTotals.carbs / carbsGoal, 1) : 0;
  const fatsPct = fatsGoal > 0 ? Math.min(nutritionTotals.fats / fatsGoal, 1) : 0;

  const workoutCount = todayWorkouts.length;
  const workoutLabel = workoutCount > 0 ? `${workoutCount} Rutinas` : 'Pendiente';
  const workoutStatus = workoutCount > 0 ? 'Completado' : 'Pendiente';
  const workoutDuration = todayWorkouts.reduce((sum, w) => sum + (Number(w.duration_mins) || 0), 0);

  const totalSleepMins = todaySleep?.duration?.total_minutes || 0;
  const sleptHours = Math.floor(totalSleepMins / 60);
  const sleptMins = totalSleepMins % 60;

  const HPI = useMemo(() => {
    // 1. Water Score (max 250 points)
    const waterScore = Math.min((waterGoal > 0 ? waterTotal / waterGoal : 0) * 250, 250);

    // 2. Nutrition Score (max 250 points)
    // Calorie score (max 125): penalty for deviation
    const calDiff = Math.abs(nutritionTotals.calories - calorieGoal);
    const calorieScore = calorieGoal > 0 ? Math.max(0, 125 * (1 - (calDiff / calorieGoal))) : 0;
    // Protein score (max 125)
    const proteinScore = proteinGoal > 0 ? Math.min((nutritionTotals.protein / proteinGoal) * 125, 125) : 0;
    const nutritionScore = calorieScore + proteinScore;

    // 3. Sleep Score (max 250 points)
    const sleepGoal = 480; // 8 hours
    const sleepDurationPct = Math.min(totalSleepMins / sleepGoal, 1);
    const sleepDurationScore = sleepDurationPct * 150;
    const sleepQualityScore = todaySleep?.quality_score ? (todaySleep.quality_score / 5) * 100 : 0;
    const sleepScore = sleepDurationScore + sleepQualityScore;

    // 4. Workout Score (max 250 points)
    const workoutScore = workoutCount > 0 ? 250 : 0;

    return Math.round(waterScore + nutritionScore + sleepScore + workoutScore);
  }, [waterTotal, waterGoal, nutritionTotals, calorieGoal, proteinGoal, totalSleepMins, todaySleep, workoutCount]);

  const hpiInsight = useMemo(() => {
    if (waterProgress < 0.6) {
      return "💧 Hidratación crítica. Un 2% de deshidratación reduce tu fuerza física hasta un 15% mañana.";
    }
    if (sleptHours > 0 && sleptHours < 6.5) {
      return "😴 Descanso deficiente. Menos de 7h de sueño reduce la testosterona libre y eleva el cortisol.";
    }
    if (proteinPct < 0.6) {
      return "🍎 Proteína insuficiente. Tus músculos necesitan aminoácidos para recuperarse y evitar catabolismo.";
    }
    if (workoutCount > 0) {
      return "🏋️ ¡Estás en la zona! Tu sesión de hoy estimuló la síntesis de proteína. ¡Buen trabajo!";
    }
    return "🔥 Estado óptimo. Si completas tus metas de hoy, estarás en tu mejor momento de rendimiento.";
  }, [waterProgress, sleptHours, proteinPct, workoutCount]);

  const firstName = capitalizeName(profile?.full_name).split(' ')[0] || 'Campeón';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* ── Control Panel Header ── */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text variant="headlineMedium" style={{ fontWeight: '900', color: theme.colors.onBackground, fontSize: 26, letterSpacing: -0.5 }}>
              Hola, {firstName}
            </Text>
            <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, fontWeight: '600', marginTop: 2, textTransform: 'capitalize' }}>
              Hoy, {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }).replace('.', '')}
            </Text>
          </View>
          
          {/* Glowing HPI Indicator */}
          <TouchableOpacity 
            onPress={() => setModalVisible('glossary')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: theme.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: getHpiColor(HPI, theme),
              gap: 8
            }}
          >
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 8, fontWeight: '800', color: theme.colors.onSurfaceVariant, letterSpacing: 0.5 }}>INDICE HPI</Text>
              <Text style={{ fontSize: 15, fontWeight: '900', color: theme.colors.onSurface, fontFamily: 'SpaceMono' }}>{HPI}</Text>
            </View>
            <View style={{ width: 32, height: 32, borderRadius: 16, borderWidth: 2.5, borderColor: getHpiColor(HPI, theme), justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.1)' }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: getHpiColor(HPI, theme) }}>{Math.round(HPI / 100)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── AI Coach Telemetry Insight Capsule ── */}
        <View style={{ 
          backgroundColor: theme.dark ? 'rgba(204, 255, 0, 0.05)' : 'rgba(204, 255, 0, 0.03)',
          borderColor: 'rgba(204, 255, 0, 0.12)',
          borderWidth: 1,
          borderRadius: 14,
          paddingHorizontal: 12,
          paddingVertical: 8,
          marginBottom: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8
        }}>
          <MaterialCommunityIcons name="brain" size={16} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.onSurface, fontSize: 11, fontWeight: '600', flex: 1, lineHeight: 15 }}>
            {hpiInsight}
          </Text>
        </View>

        {/* ── 2x2 Daily Core Pillars Grid ── */}
        <FadeIn>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <PillarGridCard
              title="Agua"
              subtitle={"de " + waterGoal + " ml"}
              icon="water"
              valueText={`${waterTotal} ml`}
              progress={waterProgress}
              color={theme.colors.primary}
              onPress={() => setModalVisible('water')}
            />
            <PillarGridCard
              title="Nutrición"
              subtitle={"de " + calorieGoal + " kcal"}
              icon="food-apple"
              valueText={`${nutritionTotals.calories} kcal`}
              progress={nutritionProgress}
              color="#FFB74D"
              onPress={() => setModalVisible('nutrition')}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
            <PillarGridCard
              title="Entreno"
              subtitle={workoutCount > 0 ? "Completado" : "Pendiente"}
              icon="dumbbell"
              valueText={workoutCount > 0 ? `${workoutCount} Sesión` : "Pendiente"}
              progress={workoutCount > 0 ? 1 : 0}
              color="#4FC3F7"
              onPress={() => router.push('/(tabs)/workout')}
            />
            <PillarGridCard
              title="Sueño"
              subtitle={todaySleep?.quality_score ? `Calidad: ${todaySleep.quality_score}/5` : "Sin registrar"}
              icon="bed"
              valueText={todaySleep ? `${sleptHours}h ${sleptMins}m` : "Pendiente"}
              progress={todaySleep ? Math.min(totalSleepMins / 480, 1) : 0}
              color="#EF5350"
              onPress={() => setModalVisible('sleep')}
            />
          </View>

          {/* ── Macros Breakdown Bar ── */}
          <Card style={{
            backgroundColor: theme.dark ? '#1c1c1e' : theme.colors.surface,
            borderColor: 'rgba(255,255,255,0.12)',
            borderWidth: 1.5,
            borderRadius: 18,
            marginBottom: 16,
            elevation: 0,
          }}>
            <Card.Content style={{ padding: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 9, fontWeight: '800' }}>PROTEÍNA</Text>
                    <Text style={{ color: '#4FC3F7', fontSize: 9, fontWeight: '800' }}>{nutritionTotals.protein}/{proteinGoal}g</Text>
                  </View>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: '#4FC3F7', width: `${Math.min(proteinPct * 100, 100)}%` }} />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 9, fontWeight: '800' }}>CARBOS</Text>
                    <Text style={{ color: '#FFB74D', fontSize: 9, fontWeight: '800' }}>{nutritionTotals.carbs}/{carbsGoal}g</Text>
                  </View>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: '#FFB74D', width: `${Math.min(carbsPct * 100, 100)}%` }} />
                  </View>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 9, fontWeight: '800' }}>GRASAS</Text>
                    <Text style={{ color: '#EF5350', fontSize: 9, fontWeight: '800' }}>{nutritionTotals.fats}/{fatsGoal}g</Text>
                  </View>
                  <View style={{ height: 4, borderRadius: 2, backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: '#EF5350', width: `${Math.min(fatsPct * 100, 100)}%` }} />
                  </View>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* ── Active Workout Neon Call-To-Action Banner ── */}
          {workoutCount === 0 && (
            <Card 
              onPress={() => router.push('/(tabs)/workout/live')}
              style={{
                backgroundColor: theme.colors.primary,
                borderRadius: 18,
                marginBottom: 16,
                elevation: 0,
                overflow: 'hidden'
              }}
            >
              <Card.Content style={{ paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <MaterialCommunityIcons name="lightning-bolt" size={20} color="#000000" />
                  <View>
                    <Text style={{ color: '#000000', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Entrenamiento en Vivo</Text>
                    <Text style={{ color: 'rgba(0,0,0,0.6)', fontSize: 10, fontWeight: '600' }}>Inicia el cronómetro táctil para tu sesión de hoy</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#000000" />
              </Card.Content>
            </Card>
          )}

          {/* ── Sleep Analytics (Weekly Chart) ── */}
          <SleepChartCard
            title="Análisis de Sueño"
            analytics={sleepAnalytics || mockSleepAnalytics}
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
        onSuccess={() => {
          handleSnackbar('¡Sueño registrado!');
          refetchSleep();
        }}
      />
      <GlossaryModal
        visible={modalVisible === 'glossary'}
        onDismiss={() => setModalVisible('none')}
      />

      <CustomToast
        visible={snackbar.visible}
        message={snackbar.message}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
      />
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
