import { ActionModal } from '@/src/components/ActionModal';
import { useLogNutrition, useLogSleep, useLogWater } from '@/src/hooks/useLogs';
import { useTodaySleep } from '@/src/hooks/useSleep';
import { useWeeklyStats } from '@/src/hooks/useWeeklyStats';
import api from '@/src/services/apiClient';
import { getProfile } from '@/src/services/profileService';
import { useIsFocused } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { router, usePathname } from 'expo-router';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  FAB,
  HelperText,
  Portal,
  ProgressBar,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

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

interface MetricCardProps {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  progress?: number;
  onPress?: () => void;
  style?: any;
}

const MetricCard = memo(function MetricCard({ title, subtitle, icon, color, progress, onPress, style }: MetricCardProps) {
  const theme = useTheme();
  return (
    <Card style={[styles.metricCard, style]} mode="elevated" onPress={onPress}>
      <Card.Content style={styles.metricContent}>
        <View style={styles.metricRow}>
          <Avatar.Icon icon={icon} size={40} style={{ backgroundColor: color }} />
          <View style={styles.metricText}>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, fontWeight: '700' }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {title}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {subtitle}
            </Text>
          </View>
        </View>
        {progress !== undefined && progress > 0 && (
          <ProgressBar progress={Math.min(progress, 1)} color={color} style={[styles.progressBar, { borderRadius: 4 }]} />
        )}
      </Card.Content>
    </Card>
  );
});

// ─── Trends Chart ───────────────────────────────────────────────────────────

const TrendsSection = memo(function TrendsSection() {
  const theme = useTheme();
  const { data, isLoading } = useWeeklyStats();

  const chartData = React.useMemo(() => {
    if (!data?.daily_stats || data.daily_stats.length === 0) return null;
    const stats = [...data.daily_stats].sort((a, b) => a.date.localeCompare(b.date));
    const labels = stats.map((s) => {
      const d = new Date(s.date + 'T12:00:00');
      return ['D', 'L', 'M', 'X', 'J', 'V', 'S'][d.getDay()];
    });
    const values = stats.map((s) => s.total_calories);
    return { labels, values, goal: data.calorie_goal };
  }, [data]);

  if (isLoading) {
    return (
      <View style={[styles.chartCard, { backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', height: 260 }]}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (!chartData) {
    return (
      <View style={[styles.chartCard, { backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', height: 180 }]}>
        <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant }}>📊 Sin datos aún</Text>
        <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 4 }}>Registra comidas para ver tendencias</Text>
      </View>
    );
  }

  const chartConfig = {
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    fillShadowGradientFrom: theme.colors.primary,
    fillShadowGradientFromOpacity: 0.3,
    fillShadowGradientTo: theme.colors.primary,
    fillShadowGradientToOpacity: 0.05,
    color: (opacity = 1) => theme.colors.primary,
    labelColor: () => theme.colors.onSurfaceVariant,
    strokeWidth: 4,
    decimalPlaces: 0,
    propsForDots: { r: '4', strokeWidth: '2', stroke: theme.colors.surface, fill: theme.colors.primary },
    propsForBackgroundLines: { strokeDasharray: '4', strokeWidth: 1, stroke: theme.colors.outlineVariant },
  };

  return (
    <View style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.chartHeader}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: '700' }}>
          📈 Tendencias — Calorías
        </Text>
        {chartData.goal ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Meta: {chartData.goal.toLocaleString()} kcal
          </Text>
        ) : null}
      </View>
      <LineChart
        data={{ labels: chartData.labels, datasets: [{ data: chartData.values }] }}
        width={CHART_WIDTH}
        height={200}
        chartConfig={chartConfig}
        bezier
        style={{ borderRadius: 12 }}
        fromZero
        withInnerLines
      />
    </View>
  );
});

// ─── Dashboard ──────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const pathname = usePathname();
  const hideFab = pathname === '/workout/new';
  const theme = useTheme();
  const { data, isLoading, refetch } = useQuery({ queryKey: ['progressToday'], queryFn: fetchProgress });
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: getProfile });
  const { data: sleepData, refetch: refetchSleep } = useTodaySleep();
  const [refreshing, setRefreshing] = useState(false);

  const [fabOpen, setFabOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState<'none' | 'water' | 'nutrition' | 'sleep'>('none');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const [waterAmount, setWaterAmount] = useState('');
  const [nutritionForm, setNutritionForm] = useState({ name: 'Comida', calories: '', protein: '', carbs: '', fats: '' });
  const [sleepForm, setSleepForm] = useState({ startTime: '22:00', endTime: '06:00', qualityScore: '5' });

  const waterMut = useLogWater();
  const nutritionMut = useLogNutrition();
  const sleepMut = useLogSleep();

  const handleSnackbar = (message: string) => setSnackbar({ visible: true, message });

  const submitWater = (amount: number) => {
    waterMut.mutate(amount, {
      onSuccess: () => {
        handleSnackbar('¡Agua registrada!');
        setModalVisible('none');
        setWaterAmount('');
        router.push('/(tabs)');
      },
      onError: () => handleSnackbar('Error al registrar el agua.'),
    });
  };

  const submitNutrition = () => {
    nutritionMut.mutate({
      meal_name: nutritionForm.name,
      calories: Number(nutritionForm.calories),
      protein: Number(nutritionForm.protein),
      carbs: Number(nutritionForm.carbs),
      fats: Number(nutritionForm.fats),
      is_cheat_meal: false,
    }, {
      onSuccess: () => {
        handleSnackbar('¡Comida registrada!');
        setModalVisible('none');
        setNutritionForm({ name: 'Comida', calories: '', protein: '', carbs: '', fats: '' });
        router.push('/(tabs)');
      },
      onError: () => handleSnackbar('Error al registrar la comida.'),
    });
  };

  const submitSleep = () => {
    const now = new Date();
    const [startH, startM] = sleepForm.startTime.split(':').map(Number);
    const [endH, endM] = sleepForm.endTime.split(':').map(Number);
    const endDate = new Date(now);
    endDate.setHours(endH || 0, endM || 0, 0, 0);
    const startDate = new Date(now);
    startDate.setHours(startH || 0, startM || 0, 0, 0);
    if (startDate >= endDate) startDate.setDate(startDate.getDate() - 1);

    sleepMut.mutate({
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      date: endDate.toISOString().split('T')[0],
      quality_score: Number(sleepForm.qualityScore) || 5,
    }, {
      onSuccess: () => {
        handleSnackbar('¡Sueño registrado!');
        setModalVisible('none');
        setSleepForm({ startTime: '22:00', endTime: '06:00', qualityScore: '5' });
        router.push('/(tabs)');
      },
      onError: () => handleSnackbar('Error al registrar el sueño.'),
    });
  };

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
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            Este es tu resumen de hoy
          </Text>
        </View>

        {/* ── Grid ───────────────────────────────────────────────── */}
        {isLoading && !refreshing ? (
          <ActivityIndicator animating size="large" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Row 1: Agua + Nutrición */}
            <View style={styles.gridRow}>
              <MetricCard
                title="Agua"
                subtitle={data?.water?.label || '0/2000 ml'}
                icon="cup-water"
                color="#2196F3"
                progress={data?.water?.progress || 0}
                style={styles.halfCard}
              />
              <MetricCard
                title="Nutrición"
                subtitle={data?.nutrition?.label || '0/2000 kcal'}
                icon="food-apple"
                color="#4CAF50"
                progress={data?.nutrition?.progress || 0}
                style={styles.halfCard}
              />
            </View>

            {/* Row 2: Entrenamiento */}
            <MetricCard
              title="Entrenamiento"
              subtitle={data?.workout?.label || 'Pendiente'}
              icon="dumbbell"
              color="#FF9800"
              onPress={() => router.push('/(tabs)/workout')}
            />

            {/* Row 3: Sueño */}
            <MetricCard
              title="Sueño"
              subtitle={sleepLabel}
              icon="bed"
              color="#9C27B0"
              progress={sleepProgress}
            />
          </>
        )}

        {/* ── Trends ─────────────────────────────────────────────── */}
        <View style={styles.trendsSection}>
          <TrendsSection />
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB ──────────────────────────────────────────────────── */}
      <Portal>
        <FAB.Group
          open={fabOpen}
          visible={!hideFab}
          icon={fabOpen ? 'close' : 'plus'}
          actions={[
            { icon: 'bed', label: 'Sueño', onPress: () => setModalVisible('sleep') },
            { icon: 'food-apple', label: 'Comida', onPress: () => setModalVisible('nutrition') },
            { icon: 'cup-water', label: 'Agua', onPress: () => setModalVisible('water') },
            { icon: 'dumbbell', label: 'Entrenamiento', onPress: () => { setFabOpen(false); router.push('/(tabs)/workout/new'); } },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
          style={styles.fabGroup}
          fabStyle={styles.fab}
        />

        {/* Water Modal */}
        <ActionModal visible={modalVisible === 'water'} onDismiss={() => setModalVisible('none')} title="Registrar Agua">
          <View style={styles.actionRow}>
            <Button mode="contained-tonal" onPress={() => submitWater(250)}>+ 250ml</Button>
            <Button mode="contained-tonal" onPress={() => submitWater(500)}>+ 500ml</Button>
          </View>
          <FastInput
            label="Cantidad (ml)"
            value={waterAmount}
            onChangeText={setWaterAmount}
            placeholder="Ej: 350"
            keyboardType="numeric"
            filter="integer"
            style={styles.input}
          />
          <Button mode="contained" loading={waterMut.isPending} onPress={() => submitWater(Number(waterAmount))} style={styles.submitBtn}>
            Guardar
          </Button>
        </ActionModal>

        {/* Nutrition Modal */}
        <ActionModal visible={modalVisible === 'nutrition'} onDismiss={() => setModalVisible('none')} title="Registrar Comida">
          <FastInput
            label="Nombre"
            value={nutritionForm.name}
            onChangeText={(t) => setNutritionForm(f => ({ ...f, name: t }))}
            placeholder="Ej: Almuerzo"
            style={styles.input}
            left={<TextInput.Icon icon="food" />}
            dense
          />
          <FastInput
            label="Calorías"
            value={nutritionForm.calories}
            onChangeText={(t) => setNutritionForm(f => ({ ...f, calories: t }))}
            placeholder="Ej: 500"
            keyboardType="numeric"
            filter="integer"
            style={styles.input}
            left={<TextInput.Icon icon="fire" />}
            dense
          />
          <HelperText type="info" visible padding="none" style={{ marginTop: -6, marginLeft: 8, marginBottom: 4 }}>
            Describe tus macros por comida
          </HelperText>
          <View style={styles.actionRow}>
            <FastInput label="Proteína (g)" value={nutritionForm.protein} onChangeText={(t) => setNutritionForm(f => ({ ...f, protein: t }))} placeholder="30" keyboardType="numeric" filter="integer" style={[styles.input, { flex: 1, marginRight: 5 }]} dense />
            <FastInput label="Carbos (g)" value={nutritionForm.carbs} onChangeText={(t) => setNutritionForm(f => ({ ...f, carbs: t }))} placeholder="50" keyboardType="numeric" filter="integer" style={[styles.input, { flex: 1, marginHorizontal: 5 }]} dense />
            <FastInput label="Grasas (g)" value={nutritionForm.fats} onChangeText={(t) => setNutritionForm(f => ({ ...f, fats: t }))} placeholder="15" keyboardType="numeric" filter="integer" style={[styles.input, { flex: 1, marginLeft: 5 }]} dense />
          </View>
          <Button mode="contained" loading={nutritionMut.isPending} onPress={submitNutrition} style={styles.submitBtn}>
            Guardar
          </Button>
        </ActionModal>

        {/* Sleep Modal */}
        <ActionModal visible={modalVisible === 'sleep'} onDismiss={() => setModalVisible('none')} title="Registrar Sueño">
          <View style={styles.actionRow}>
            <FastInput label="Se acostó" value={sleepForm.startTime} onChangeText={(t) => setSleepForm(f => ({ ...f, startTime: t }))} placeholder="22:30" style={[styles.input, { flex: 1, marginRight: 5 }]} />
            <FastInput label="Se levantó" value={sleepForm.endTime} onChangeText={(t) => setSleepForm(f => ({ ...f, endTime: t }))} placeholder="06:30" style={[styles.input, { flex: 1, marginLeft: 5 }]} />
          </View>
          <HelperText type="info" visible padding="none" style={{ marginTop: -6, marginLeft: 8 }}>
            Formato HH:MM (24h)
          </HelperText>
          <FastInput label="Calidad (1-5)" value={sleepForm.qualityScore} onChangeText={(t) => setSleepForm(f => ({ ...f, qualityScore: t }))} placeholder="5" keyboardType="numeric" filter="integer" style={styles.input} />
          <Button mode="contained" loading={sleepMut.isPending} onPress={submitSleep} style={styles.submitBtn}>
            Guardar
          </Button>
        </ActionModal>

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
    marginBottom: 20,
    gap: 4,
  },
  greeting: {
    fontWeight: '800',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  halfCard: {
    flex: 1,
    marginBottom: 0,
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
  fabGroup: {
    position: 'absolute',
    right: 0,
    bottom: 60, // raised further to avoid tab bar
  },
  fab: {
    borderRadius: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  input: {
    marginBottom: 10,
  },
  submitBtn: {
    marginTop: 10,
  },
});