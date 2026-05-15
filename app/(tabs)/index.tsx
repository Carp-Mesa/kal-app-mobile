import { NutritionModal } from '@/src/components/modals/NutritionModal';
import { SleepModal } from '@/src/components/modals/SleepModal';
import { WaterModal } from '@/src/components/modals/WaterModal';
import { useTodaySleep } from '@/src/hooks/useSleep';
import api from '@/src/services/apiClient';
import { getProfile } from '@/src/services/profileService';
import { useAppStore } from '@/src/store/useAppStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Card,
  HelperText,
  Portal,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import Svg, { Circle } from 'react-native-svg';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CHART_WIDTH = SCREEN_WIDTH - 72;

const fetchProgress = async () => {
  try {
    const results = await Promise.allSettled([
      api.get('/water/progress/today'),
      api.get('/nutrition/progress/today'),
      api.get('/workout/progress/today'),
    ]);

    const waterRes = results[0].status === 'fulfilled' ? results[0].value.data : null;
    const nutritionRes = results[1].status === 'fulfilled' ? results[1].value.data : null;
    const workoutRes = results[2].status === 'fulfilled' ? results[2].value.data : null;

    return {
      water: {
        label: waterRes?.goal_ml ? `${waterRes.total_ml}/${waterRes.goal_ml} ml` : '0/2000 ml',
        progress: waterRes?.goal_ml ? (waterRes.total_ml / waterRes.goal_ml) : 0,
      },
      nutrition: {
        label: nutritionRes?.goals ? `${nutritionRes.totals?.calories || 0}/${nutritionRes.goals?.calories || 2000} kcal` : '0/2000 kcal',
        progress: nutritionRes?.goals?.calories ? ((nutritionRes.totals?.calories || 0) / nutritionRes.goals.calories) : 0,
      },
      workout: {
        label: workoutRes?.is_completed
          ? 'Completado'
          : workoutRes?.workouts_count > 0
            ? `${workoutRes.workouts_count} Rutinas`
            : 'Pendiente',
      },
    };
  } catch (error) {
    console.log('Error fetching progress:', error);
    return {
      water: { label: 'Sin datos', progress: 0 },
      nutrition: { label: 'Sin datos', progress: 0 },
      workout: { label: 'Sin datos' },
    };
  }
};

// ─── Input Filters ───────────────────────────────────────────────────────────

const filterInteger = (text: string): string => text.replace(/[^0-9]/g, '');

const filterDecimal = (text: string): string => {
  let cleaned = text.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  return cleaned;
};

// ─── FastInput (memoized — zero lag) ────────────────────────────────────────

interface FastInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'numeric' | 'decimal-pad' | 'default';
  style?: any;
  left?: React.ReactNode;
  dense?: boolean;
  helperText?: string;
  filter?: 'integer' | 'decimal';
}

const FastInput = memo(function FastInput({
  label, value, onChangeText, placeholder, keyboardType = 'default', style, left, dense = false, helperText, filter,
}: FastInputProps) {
  const [local, setLocal] = useState(value);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setLocal(value);
  }, [value]);

  const handleChange = (t: string) => {
    let filtered = t;
    if (filter === 'integer') filtered = filterInteger(t);
    if (filter === 'decimal') filtered = filterDecimal(t);
    setLocal(filtered);
    focused.current = true;
    onChangeText(filtered);
  };

  return (
    <View style={[{ flex: style?.flex }, style?.marginRight !== undefined ? { marginRight: style.marginRight } : {}, style?.marginLeft !== undefined ? { marginLeft: style.marginLeft } : {}, style?.marginHorizontal !== undefined ? { marginHorizontal: style.marginHorizontal } : {}]}>
      <TextInput
        mode="outlined"
        label={label}
        placeholder={placeholder}
        value={local}
        onChangeText={handleChange}
        onFocus={() => { focused.current = true; }}
        onBlur={() => { focused.current = false; setLocal(value); }}
        keyboardType={keyboardType}
        style={[style, { flex: undefined, marginRight: undefined, marginLeft: undefined, marginHorizontal: undefined }]}
        left={left}
        dense={dense}
      />
      {helperText ? (
        <HelperText type="info" visible padding="none" style={{ marginTop: -6, marginLeft: 8 }}>
          {helperText}
        </HelperText>
      ) : null}
    </View>
  );
});

// ─── Metric Card ────────────────────────────────────────────────────────────

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
  const chartData = [0.5, 0.8, 0.5, 1.0, 0.7, 0.9, 0.6]; // Visually pleasing mock data representing the week

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
  const { data, isLoading, refetch } = useQuery({ queryKey: ['progressToday'], queryFn: fetchProgress });
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const { data: sleepData, refetch: refetchSleep } = useTodaySleep();
  const [refreshing, setRefreshing] = useState(false);

  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const handleSnackbar = (message: string) => setSnackbar({ visible: true, message });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetch(), refetchSleep()]);
    setRefreshing(false);
  }, [refetch, refetchSleep]);

  const sleepGoal = profile?.sleep_goal || 8;
  const totalSleepMins = sleepData?.duration?.total_minutes || 0;
  const sleptHours = Math.floor(totalSleepMins / 60);
  const sleptMins = totalSleepMins % 60;
  const sleepProgress = Math.min((totalSleepMins / 60) / sleepGoal, 1);
  const sleepLabel = `${sleptHours}h ${sleptMins}m / ${sleepGoal}h`;

  const firstName = profile?.full_name?.split(' ')[0] || 'Campeón';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Greeting ───────────────────────────────────────────── */}
        <View style={styles.greetingSection}>
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
        </View>

        {/* ── Grid ───────────────────────────────────────────────── */}
        {isLoading && !refreshing ? (
          <ActivityIndicator animating size="large" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Row 1: Agua + Nutrición */}
            <View style={styles.gridRow}>
              <CircularProgressCard
                title="Agua"
                subtitle={data?.water?.label || '0/2000 ml'}
                icon="water"
                progress={data?.water?.progress || 0}
                style={styles.halfCard}
              />
              <CircularProgressCard
                title="Nutrición"
                subtitle={data?.nutrition?.label || '0/2000 kcal'}
                icon="food-apple"
                progress={data?.nutrition?.progress || 0}
                style={styles.halfCard}
              />
            </View>

            {/* Row 2: Entrenamiento */}
            <WorkoutStatusCard
              title="Entrenamiento"
              currentSession={data?.workout?.label || 'Día 1'}
              duration="0 mins"
              status={data?.workout?.label === 'Completado' ? 'Completado' : 'Pendiente'}
              onPress={() => router.push('/(tabs)/workout')}
            />

            {/* Row 3: Sueño */}
            <SleepChartCard
              title="Sueño"
              mainValue={`${sleptHours}h ${sleptMins}m`}
              subtitle="Horas dormidas"
            />
          </>
        )}

      </ScrollView>

      <WaterModal
        visible={modalVisible === 'water'}
        onDismiss={() => setModalVisible('none')}
        waterGoal={profile?.water_goal || 2000}
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
  metricCard: {
    borderRadius: 16,
    marginBottom: 12,
    elevation: 2,
  },
  metricContent: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metricText: {
    flex: 1,
    gap: 2,
  },
  progressBar: {
    height: 6,
  },
  trendsSection: {
    marginTop: 8,
  },
  chartCard: {
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    marginBottom: 12,
  },
  chartHeader: {
    marginBottom: 12,
    gap: 2,
  },
});