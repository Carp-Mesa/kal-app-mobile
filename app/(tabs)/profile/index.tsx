import { getProfile, updateProfile } from '@/src/services/profileService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';

// ─── Component ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // Form states
  const [fullName, setFullName] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [weightGoal, setWeightGoal] = useState('');
  const [calorieGoal, setCalorieGoal] = useState('');
  const [proteinGoal, setProteinGoal] = useState('');
  const [carbsGoal, setCarbsGoal] = useState('');
  const [fatsGoal, setFatsGoal] = useState('');
  const [waterGoal, setWaterGoal] = useState('');

  // ── Queries and Mutations ──────────────────────────────────────────────────

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      // Invalidar dashboard para que se recalculen los progresos
      queryClient.invalidateQueries({ queryKey: ['progressToday'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSnackbar({ visible: true, message: 'Perfil y metas actualizados correctamente' });
    },
    onError: (error) => {
      setSnackbar({ visible: true, message: 'Error al actualizar el perfil' });
      console.error(error);
    },
  });

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setWeightGoal(profile.weight_goal?.toString() || '');
      setCalorieGoal(profile.calorie_goal?.toString() || '');
      setProteinGoal(profile.protein_goal?.toString() || '');
      setCarbsGoal(profile.carbs_goal?.toString() || '');
      setFatsGoal(profile.fats_goal?.toString() || '');
      setWaterGoal(profile.water_goal?.toString() || '');
    }
  }, [profile]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const calculateGoals = () => {
    const weight = parseFloat(currentWeight);
    if (isNaN(weight) || weight <= 0) {
      setSnackbar({ visible: true, message: 'Ingresa un peso actual válido para calcular' });
      return;
    }

    // Formulas based on weight (kg)
    const suggestedWater = Math.round(weight * 35); // 35 ml per kg
    const suggestedProtein = Math.round(weight * 2); // 2g per kg
    const suggestedFats = Math.round(weight * 1); // 1g per kg
    const suggestedCarbs = Math.round(weight * 4); // 4g per kg
    const suggestedCalories = (suggestedProtein * 4) + (suggestedCarbs * 4) + (suggestedFats * 9);

    setWaterGoal(suggestedWater.toString());
    setProteinGoal(suggestedProtein.toString());
    setFatsGoal(suggestedFats.toString());
    setCarbsGoal(suggestedCarbs.toString());
    setCalorieGoal(suggestedCalories.toString());

    setSnackbar({ visible: true, message: 'Metas sugeridas aplicadas. ¡No olvides guardar!' });
  };

  const handleSave = () => {
    updateMutation.mutate({
      full_name: fullName.trim(),
      weight_goal: parseFloat(weightGoal) || undefined,
      calorie_goal: parseInt(calorieGoal, 10) || undefined,
      protein_goal: parseInt(proteinGoal, 10) || undefined,
      carbs_goal: parseInt(carbsGoal, 10) || undefined,
      fats_goal: parseInt(fatsGoal, 10) || undefined,
      water_goal: parseInt(waterGoal, 10) || undefined,
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
          Ajustes de Perfil
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}>
          Personaliza tu información y metas diarias.
        </Text>

        <Card style={styles.card} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.primary }]}>
              👤 Información Personal
            </Text>
            <TextInput
              mode="outlined"
              label="Nombre Completo"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              left={<TextInput.Icon icon="account-outline" />}
            />
            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label="Peso Actual (kg)"
                value={currentWeight}
                onChangeText={setCurrentWeight}
                keyboardType="numeric"
                style={[styles.input, styles.flex1, { marginRight: 8 }]}
                left={<TextInput.Icon icon="weight-kilogram" />}
              />
              <TextInput
                mode="outlined"
                label="Meta de Peso (kg)"
                value={weightGoal}
                onChangeText={setWeightGoal}
                keyboardType="numeric"
                style={[styles.input, styles.flex1]}
                left={<TextInput.Icon icon="target" />}
              />
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <View style={styles.headerRow}>
              <Text variant="titleMedium" style={[styles.cardTitle, { color: theme.colors.primary, marginBottom: 0 }]}>
                🎯 Metas Diarias
              </Text>
              <Button
                mode="text"
                compact
                icon="calculator"
                onPress={calculateGoals}
                labelStyle={{ fontSize: 13 }}
              >
                Autocalcular
              </Button>
            </View>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
              Las sugerencias se basan en tu peso actual.
            </Text>

            <TextInput
              mode="outlined"
              label="Calorías Diarias (kcal)"
              value={calorieGoal}
              onChangeText={setCalorieGoal}
              keyboardType="numeric"
              style={styles.input}
              left={<TextInput.Icon icon="fire" />}
            />
            
            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label="Proteínas (g)"
                value={proteinGoal}
                onChangeText={setProteinGoal}
                keyboardType="numeric"
                style={[styles.input, styles.flex1, { marginRight: 8 }]}
                left={<TextInput.Icon icon="food-drumstick-outline" />}
              />
              <TextInput
                mode="outlined"
                label="Agua (ml)"
                value={waterGoal}
                onChangeText={setWaterGoal}
                keyboardType="numeric"
                style={[styles.input, styles.flex1]}
                left={<TextInput.Icon icon="cup-water" />}
              />
            </View>

            <View style={styles.row}>
              <TextInput
                mode="outlined"
                label="Carbohidratos (g)"
                value={carbsGoal}
                onChangeText={setCarbsGoal}
                keyboardType="numeric"
                style={[styles.input, styles.flex1, { marginRight: 8 }]}
                left={<TextInput.Icon icon="bread-slice-outline" />}
              />
              <TextInput
                mode="outlined"
                label="Grasas (g)"
                value={fatsGoal}
                onChangeText={setFatsGoal}
                keyboardType="numeric"
                style={[styles.input, styles.flex1]}
                left={<TextInput.Icon icon="cheese" />}
              />
            </View>

          </Card.Content>
        </Card>

        <Button
          mode="contained"
          icon="content-save-outline"
          onPress={handleSave}
          loading={updateMutation.isPending}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          labelStyle={{ fontSize: 16 }}
        >
          Guardar Cambios
        </Button>
        <View style={{ height: 40 }} />
      </ScrollView>

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ visible: false, message: '' })}
        duration={3000}
        action={{ label: 'OK', onPress: () => setSnackbar({ visible: false, message: '' }) }}
      >
        {snackbar.message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  title: {
    fontWeight: 'bold',
  },
  card: {
    borderRadius: 16,
    marginBottom: 16,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  input: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flex1: {
    flex: 1,
  },
  saveButton: {
    borderRadius: 14,
    marginTop: 8,
  },
  saveButtonContent: {
    height: 52,
  },
});
