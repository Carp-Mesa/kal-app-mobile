import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Card, Text, useTheme } from 'react-native-paper';

const fetchProgress = async () => {
  // LLAgará el día en que esto pegue directo al backend:
  // const { data } = await api.get('/progress/today');
  // return data;
  
  // Mock UI hasta que la API esté lista:
  return new Promise<any>((resolve) => {
    setTimeout(() => resolve({
      water: { value: 3, max: 8, label: '3/8 Vasos' },
      nutrition: { value: 1800, max: 2000, label: '1800/2000 kcal' },
      workout: { value: 1, max: 1, label: 'Completado' },
      sleep: { value: 6, max: 8, label: '6/8 Horas' },
    }), 800);
  });
};

export default function DashboardScreen() {
  const theme = useTheme();
  const { data, isLoading } = useQuery({ queryKey: ['progressToday'], queryFn: fetchProgress });

  const metrics = [
    { id: 'water', title: 'Agua', icon: 'cup-water', color: '#2196F3', detail: data?.water?.label || '0%' },
    { id: 'nutrition', title: 'Nutrición', icon: 'food-apple', color: '#4CAF50', detail: data?.nutrition?.label || '0%' },
    { id: 'workout', title: 'Entrenamiento', icon: 'dumbbell', color: '#FF9800', detail: data?.workout?.label || '0%' },
    { id: 'sleep', title: 'Sueño', icon: 'bed', color: '#9C27B0', detail: data?.sleep?.label || '0%' },
  ];

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.greeting}>Hola, Campeón</Text>
        <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>Tu progreso de hoy</Text>
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
