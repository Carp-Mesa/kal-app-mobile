import api from '@/src/services/api';
import { useAppStore } from '@/src/store/useAppStore';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Card, IconButton, Text, useTheme } from 'react-native-paper';

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
  const logout = useAppStore(state => state.logout);
  const { data, isLoading } = useQuery({ queryKey: ['progressToday'], queryFn: fetchProgress });

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const metrics = [
    { id: 'water', title: 'Agua', icon: 'cup-water', color: '#2196F3', detail: data?.water?.label || '0%' },
    { id: 'nutrition', title: 'Nutrición', icon: 'food-apple', color: '#4CAF50', detail: data?.nutrition?.label || '0%' },
    { id: 'workout', title: 'Entrenamiento', icon: 'dumbbell', color: '#FF9800', detail: data?.workout?.label || '0%' },
    { id: 'sleep', title: 'Sueño', icon: 'bed', color: '#9C27B0', detail: data?.sleep?.label || '0%' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
        <View>
          <Text variant="headlineMedium" style={styles.greeting}>Hola, Campeón</Text>
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Tu progreso de hoy</Text>
        </View>
        <IconButton icon="logout" onPress={handleLogout} />
      </View>

      {isLoading ? (
        <ActivityIndicator animating={true} size="large" style={styles.loader} />
      ) : (
        <View style={styles.grid}>
          {metrics.map((m) => (
            <Card key={m.id} style={styles.card} mode="elevated">
              <Card.Title
                title={m.title}
                subtitle={m.detail}
                left={(props) => <Avatar.Icon {...props} icon={m.icon} style={{ backgroundColor: m.color }} />}
              />
            </Card>
          ))}
        </View>
      )}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
    justifyContent: 'space-between',
  },
  card: {
    width: '48%', // Grid de 2 columnas simple
    marginBottom: 15,
  },
});
