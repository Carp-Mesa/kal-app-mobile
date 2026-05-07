import { ActionModal } from '@/src/components/ActionModal';
import WeeklyProgressChart from '@/src/components/WeeklyProgressChart';
import { useLogNutrition, useLogSleep, useLogWater } from '@/src/hooks/useLogs';
import api from '@/src/services/apiClient';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Button, Card, FAB, IconButton, Portal, Snackbar, Text, TextInput, useTheme } from 'react-native-paper';

const fetchProgress = async () => {
  try {
    // Usamos Promise.allSettled por si algunos endpoints aún no existen en el backend (ej. workout o sleep)
    const results = await Promise.allSettled([
      api.get('/water/progress/today'),
      api.get('/nutrition/progress/today'),
      api.get('/workout/progress/today'),
      api.get('/sleep/progress/today'),
    ]);

    const waterRes = results[0].status === 'fulfilled' ? results[0].value.data : null;
    const nutritionRes = results[1].status === 'fulfilled' ? results[1].value.data : null;
    const workoutRes = results[2].status === 'fulfilled' ? results[2].value.data : null;
    const sleepRes = results[3].status === 'fulfilled' ? results[3].value.data : null;

    return {
      water: { 
        label: waterRes?.goal_ml ? `${waterRes.total_ml}/${waterRes.goal_ml} ml` : '0/2000 ml' 
      },
      nutrition: { 
        label: nutritionRes?.goals ? `${nutritionRes.totals?.calories || 0}/${nutritionRes.goals?.calories || 2000} kcal` : '0/2000 kcal' 
      },
      workout: { 
        // Basándome en la nueva respuesta de la API {"is_completed":false,"workouts_count":0,"total_duration":0}
        label: workoutRes?.is_completed 
          ? 'Completado' 
          : workoutRes?.workouts_count > 0 
            ? `${workoutRes.workouts_count} Rutinas`
            : 'Pendiente' 
      },
      sleep: { 
        // Cubrimos tanto si devuelves hours como total_minutes
        label: sleepRes?.hours !== undefined 
          ? `${sleepRes.hours}/8 Hrs` 
          : sleepRes?.total_minutes !== undefined 
            ? `${(sleepRes.total_minutes / 60).toFixed(1)}/8 Hrs` 
            : '0/8 Hrs' 
      },
    };
  } catch (error) {
    console.log('Error general fetching progress:', error);
    return {
      water: { label: 'Sin datos' },
      nutrition: { label: 'Sin datos' },
      workout: { label: 'Sin datos' },
      sleep: { label: 'Sin datos' },
    };
  }
};

export default function DashboardScreen() {
  const theme = useTheme();
  const clearTokens = useAuthStore(state => state.clearTokens);
  const { data, isLoading, refetch } = useQuery({ queryKey: ['progressToday'], queryFn: fetchProgress });
  const [refreshing, setRefreshing] = useState(false);

  // FAB & Modals States
  const [fabOpen, setFabOpen] = useState(false);
  const [modalVisible, setModalVisible] = useState<'none' | 'water' | 'nutrition' | 'sleep'>('none');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // Form States
  const [waterAmount, setWaterAmount] = useState('');
  const [nutritionForm, setNutritionForm] = useState({ name: 'Comida', calories: '', protein: '', carbs: '', fats: '' });
  const [sleepForm, setSleepForm] = useState({ startTime: '22:00', endTime: '06:00', qualityScore: '5' });

  // Mutations
  const waterMut = useLogWater();
  const nutritionMut = useLogNutrition();
  const sleepMut = useLogSleep();

  const handleSnackbar = (message: string) => setSnackbar({ visible: true, message });

  const submitWater = (amount: number) => {
    waterMut.mutate(amount, {
      onSuccess: () => {
        handleSnackbar('¡Agua registrada exitosamente!');
        setModalVisible('none');
        setWaterAmount('');
      },
      onError: () => handleSnackbar('Error al registrar el agua.')
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
        handleSnackbar('¡Comida registrada exitosamente!');
        setModalVisible('none');
        setNutritionForm({ name: 'Comida', calories: '', protein: '', carbs: '', fats: '' });
      },
      onError: () => handleSnackbar('Error al registrar la comida.')
    });
  };

  const submitSleep = () => {
    // Parseamos los tiempos usando HH:MM
    const now = new Date();
    const [startH, startM] = sleepForm.startTime.split(':').map(Number);
    const [endH, endM] = sleepForm.endTime.split(':').map(Number);

    const endDate = new Date(now);
    endDate.setHours(endH || 0, endM || 0, 0, 0);

    const startDate = new Date(now);
    startDate.setHours(startH || 0, startM || 0, 0, 0);

    // Si la hora de dormir es mayor a la de despertar (ej. 22:00 vs 06:00), asumimos que durmió el día anterior
    if (startDate > endDate) {
      startDate.setDate(startDate.getDate() - 1);
    }

    sleepMut.mutate({
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      date: endDate.toISOString().split('T')[0],
      quality_score: Number(sleepForm.qualityScore) || 5
    }, {
      onSuccess: () => {
        handleSnackbar('¡Sueño registrado exitosamente!');
        setModalVisible('none');
        setSleepForm({ startTime: '22:00', endTime: '06:00', qualityScore: '5' });
      },
      onError: () => handleSnackbar('Error al registrar el sueño.')
    });
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleLogout = () => {
    clearTokens();
    router.replace('/(auth)/login');
  };

  const metrics = [
    { id: 'water', title: 'Agua', icon: 'cup-water', color: '#2196F3', detail: data?.water?.label || '0%' },
    { id: 'nutrition', title: 'Nutrición', icon: 'food-apple', color: '#4CAF50', detail: data?.nutrition?.label || '0%' },
    { id: 'workout', title: 'Entrenamiento', icon: 'dumbbell', color: '#FF9800', detail: data?.workout?.label || '0%' },
    { id: 'sleep', title: 'Sueño', icon: 'bed', color: '#9C27B0', detail: data?.sleep?.label || '0%' },
  ];

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />}
    >
      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View>
          <Text variant="headlineMedium" style={styles.greeting}>Hola, Campeón</Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Tu progreso de hoy</Text>
        </View>
        <IconButton icon="logout" onPress={handleLogout} />
      </View>

      {isLoading && !refreshing ? (
        <ActivityIndicator animating={true} size="large" style={styles.loader} />
      ) : (
        <View style={styles.list}>
          {metrics.map((m) => (
            <Card key={m.id} style={styles.card} mode="elevated">
              <Card.Title
                title={m.title}
                titleVariant="titleLarge"
                subtitle={m.detail}
                subtitleVariant="bodyMedium"
                left={(props) => <Avatar.Icon {...props} icon={m.icon} style={{ backgroundColor: m.color }} />}
              />
            </Card>
          ))}
          {/* ── Weekly Progress Chart ─────────────────────────────── */}
          <WeeklyProgressChart />
        </View>
      )}

      {/* FAB */}
      <Portal>
        <FAB.Group
          open={fabOpen}
          visible
          icon={fabOpen ? 'close' : 'plus'}
          actions={[
            { icon: 'bed', label: 'Registrar Sueño', onPress: () => setModalVisible('sleep') },
            { icon: 'food-apple', label: 'Registrar Comida', onPress: () => setModalVisible('nutrition') },
            { icon: 'cup-water', label: 'Registrar Agua', onPress: () => setModalVisible('water') },
          ]}
          onStateChange={({ open }) => setFabOpen(open)}
          onPress={() => {
            if (fabOpen) {
              // do something if the speed dial is open
            }
          }}
        />

        {/* Water Modal */}
        <ActionModal visible={modalVisible === 'water'} onDismiss={() => setModalVisible('none')} title="Registrar Agua">
          <View style={styles.actionRow}>
            <Button mode="contained-tonal" onPress={() => submitWater(250)}>+ 250ml</Button>
            <Button mode="contained-tonal" onPress={() => submitWater(500)}>+ 500ml</Button>
          </View>
          <TextInput
            mode="outlined"
            label="Cantidad personalizada (ml)"
            keyboardType="numeric"
            value={waterAmount}
            onChangeText={setWaterAmount}
            style={styles.input}
          />
          <Button mode="contained" loading={waterMut.isPending} onPress={() => submitWater(Number(waterAmount))} style={styles.submitBtn}>
            Guardar
          </Button>
        </ActionModal>

        {/* Nutrition Modal */}
        <ActionModal visible={modalVisible === 'nutrition'} onDismiss={() => setModalVisible('none')} title="Registrar Comida">
          <TextInput mode="outlined" label="Nombre (ej. Almuerzo)" value={nutritionForm.name} onChangeText={(t) => setNutritionForm(f => ({...f, name: t}))} style={styles.input} />
          <TextInput mode="outlined" label="Calorías" keyboardType="numeric" value={nutritionForm.calories} onChangeText={(t) => setNutritionForm(f => ({...f, calories: t}))} style={styles.input} />
          <View style={styles.actionRow}>
            <TextInput mode="outlined" label="Proteína (g)" keyboardType="numeric" value={nutritionForm.protein} onChangeText={(t) => setNutritionForm(f => ({...f, protein: t}))} style={[styles.input, { flex: 1, marginRight: 5 }]} />
            <TextInput mode="outlined" label="Carbos (g)" keyboardType="numeric" value={nutritionForm.carbs} onChangeText={(t) => setNutritionForm(f => ({...f, carbs: t}))} style={[styles.input, { flex: 1, marginHorizontal: 5 }]} />
            <TextInput mode="outlined" label="Grasas (g)" keyboardType="numeric" value={nutritionForm.fats} onChangeText={(t) => setNutritionForm(f => ({...f, fats: t}))} style={[styles.input, { flex: 1, marginLeft: 5 }]} />
          </View>
          <Button mode="contained" loading={nutritionMut.isPending} onPress={submitNutrition} style={styles.submitBtn}>
            Guardar
          </Button>
        </ActionModal>

        {/* Sleep Modal */}
        <ActionModal visible={modalVisible === 'sleep'} onDismiss={() => setModalVisible('none')} title="Registrar Sueño">
          <View style={styles.actionRow}>
            <TextInput mode="outlined" label="Se acostó (HH:MM)" placeholder="22:30" value={sleepForm.startTime} onChangeText={(t) => setSleepForm(f => ({...f, startTime: t}))} style={[styles.input, { flex: 1, marginRight: 5 }]} />
            <TextInput mode="outlined" label="Se levantó (HH:MM)" placeholder="06:30" value={sleepForm.endTime} onChangeText={(t) => setSleepForm(f => ({...f, endTime: t}))} style={[styles.input, { flex: 1, marginLeft: 5 }]} />
          </View>
          <TextInput mode="outlined" label="Calidad (1 al 5)" keyboardType="numeric" value={sleepForm.qualityScore} onChangeText={(t) => setSleepForm(f => ({...f, qualityScore: t}))} style={styles.input} />
          <Button mode="contained" loading={sleepMut.isPending} onPress={submitSleep} style={styles.submitBtn}>
            Guardar
          </Button>
        </ActionModal>

        {/* Snackbar Feedback */}
        <Snackbar
          visible={snackbar.visible}
          onDismiss={() => setSnackbar({ visible: false, message: '' })}
          duration={3000}
        >
          {snackbar.message}
        </Snackbar>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 20,
  },
  greeting: {
    fontWeight: 'bold',
  },
  loader: {
    marginTop: 50,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    width: '100%',
    marginBottom: 16,
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
  }
});
