import { getProfile, updateProfile } from '@/src/services/profileService';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import React, { memo, useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  ActivityIndicator,
  Avatar,
  Button,
  Card,
  Divider,
  HelperText,
  List,
  Snackbar,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useAppStore } from '@/src/store/useAppStore';

// ─── Memoized Input (local state — zero lag) ─────────────────────────────────

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

// ─── Memoized Input (local state — zero lag) ─────────────────────────────────

interface FastInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: 'numeric' | 'decimal-pad' | 'default' | 'phone-pad';
  style?: any;
  left?: React.ReactNode;
  dense?: boolean;
  helperText?: string;
  multiline?: boolean;
  numberOfLines?: number;
  autoCapitalize?: 'words' | 'sentences' | 'none';
  returnKeyType?: 'done' | 'next';
  filter?: 'integer' | 'decimal';
}

const FastInput = memo(function FastInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  style,
  left,
  dense = false,
  helperText,
  multiline,
  numberOfLines,
  autoCapitalize,
  returnKeyType,
  filter,
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

  const input = (
    <TextInput
      mode="outlined"
      label={label}
      placeholder={placeholder}
      value={local}
      onChangeText={handleChange}
      onFocus={() => { focused.current = true; }}
      onBlur={() => {
        focused.current = false;
        setLocal(value);
      }}
      keyboardType={keyboardType}
      style={style}
      left={left}
      dense={dense}
      multiline={multiline}
      numberOfLines={numberOfLines}
      autoCapitalize={autoCapitalize}
      returnKeyType={returnKeyType}
    />
  );

  if (helperText) {
    return (
      <View>
        {input}
        <HelperText type="info" visible padding="none" style={styles.helperText}>
          {helperText}
        </HelperText>
      </View>
    );
  }

  return input;
});

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const theme = useTheme();
  const { themeMode, toggleTheme } = useAppStore();
  const queryClient = useQueryClient();
  const clearTokens = useAuthStore(state => state.clearTokens);
  const isInitialized = useRef(false);

  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [bodyFatPercentage, setBodyFatPercentage] = useState('');
  const [weightGoal, setWeightGoal] = useState('');
  const [calorieGoal, setCalorieGoal] = useState('');
  const [waterGoal, setWaterGoal] = useState('');
  const [sleepGoal, setSleepGoal] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: getProfile,
  });

  const updateMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['progressToday'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setSnackbar({ visible: true, message: 'Perfil actualizado correctamente' });
    },
    onError: () => {
      setSnackbar({ visible: true, message: 'Error al actualizar el perfil' });
    },
  });

  useEffect(() => {
    if (profile && !isInitialized.current) {
      setFullName(profile.full_name ?? '');
      setAge(profile.age?.toString() ?? '');
      setHeight(profile.height?.toString() ?? '');
      setCurrentWeight(profile.current_weight?.toString() ?? '');
      setBodyFatPercentage(profile.body_fat_percentage?.toString() ?? '');
      setWeightGoal(profile.weight_goal?.toString() ?? '');
      setCalorieGoal(profile.calorie_goal?.toString() ?? '');
      setWaterGoal(profile.water_goal?.toString() ?? '');
      setSleepGoal(profile.sleep_goal?.toString() ?? '');
      isInitialized.current = true;
    }
  }, [profile]);

  const calculateGoals = () => {
    const weight = parseFloat(currentWeight);
    if (isNaN(weight) || weight <= 0) {
      setSnackbar({ visible: true, message: 'Ingresa un peso actual válido' });
      return;
    }
    const suggestedWater = Math.round(weight * 35);
    const suggestedSleep = 8;
    const bmr = 10 * weight + 6.25 * (parseFloat(height) || 170) - 5 * (parseInt(age) || 25) + 500;
    const suggestedCalories = Math.round(bmr);

    setWaterGoal(suggestedWater.toString());
    setCalorieGoal(suggestedCalories.toString());
    setSleepGoal(suggestedSleep.toString());
    setSnackbar({ visible: true, message: 'Metas sugeridas aplicadas. ¡Guárdalas!' });
  };

  const handleSave = () => {
    updateMutation.mutate({
      full_name: fullName.trim() || undefined,
      age: parseInt(age, 10) || undefined,
      height: parseFloat(height) || undefined,
      current_weight: parseFloat(currentWeight) || undefined,
      body_fat_percentage: parseFloat(bodyFatPercentage) || undefined,
      weight_goal: parseFloat(weightGoal) || undefined,
      calorie_goal: parseInt(calorieGoal, 10) || undefined,
      water_goal: parseInt(waterGoal, 10) || undefined,
      sleep_goal: parseFloat(sleepGoal) || undefined,
    });
  };

  const handleLogout = () => {
    clearTokens();
    router.replace('/(auth)/login');
  };

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
        <View style={styles.headerProfile}>
          <Avatar.Text size={64} label={fullName ? fullName.substring(0,2).toUpperCase() : 'ME'} style={{ backgroundColor: theme.colors.primaryContainer }} color={theme.colors.onPrimaryContainer} />
          <View style={styles.headerProfileText}>
            <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onBackground }]}>
              {fullName || 'Mi Perfil'}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              Personaliza tu información y objetivos.
            </Text>
          </View>
        </View>

        {/* ── Información Personal ──────────────────────────────── */}
        <Card style={styles.card} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
              👤 Información Personal
            </Text>
            <Divider style={styles.divider} />
          <FastInput
            label="Nombre"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Tu nombre"
            style={styles.input}
            left={<TextInput.Icon icon="account-outline" />}
            dense
          />
          <View style={styles.row}>
            <FastInput
            label="Edad"
            value={age}
            onChangeText={setAge}
            placeholder="25"
            keyboardType="numeric"
            filter="integer"
              style={[styles.input, styles.flex1, { marginRight: 8 }]}
              left={<TextInput.Icon icon="calendar-outline" />}
              dense
            />
            <FastInput
            label="Altura (cm)"
            value={height}
            onChangeText={setHeight}
            placeholder="170"
            keyboardType="numeric"
            style={[styles.input, styles.flex1]}
            left={<TextInput.Icon icon="human-male-height" />}
            dense
            filter="integer"
            helperText="En centímetros"
            />
          </View>
          </Card.Content>
        </Card>

        {/* ── Composición Corporal ──────────────────────────────── */}
        <Card style={styles.card} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
              💪 Composición Corporal
            </Text>
            <Divider style={styles.divider} />
          <View style={styles.row}>
            <FastInput
            label="Peso Actual (kg)"
            value={currentWeight}
            onChangeText={setCurrentWeight}
            placeholder="75"
            keyboardType="decimal-pad"
            filter="decimal"
            style={[styles.input, styles.flex1, { marginRight: 8 }]}
              left={<TextInput.Icon icon="weight-kilogram" />}
              dense
            />
            <FastInput
            label="% Grasa"
            value={bodyFatPercentage}
            onChangeText={setBodyFatPercentage}
            placeholder="18"
            keyboardType="decimal-pad"
            filter="decimal"
            style={[styles.input, styles.flex1]}
            left={<TextInput.Icon icon="percent-outline" />}
            dense
            helperText="Porcentaje de grasa corporal"
            />
          </View>
          <FastInput
            label="Peso Meta (kg)"
            value={weightGoal}
            onChangeText={setWeightGoal}
            placeholder="70"
            keyboardType="decimal-pad"
            filter="decimal"
            style={styles.input}
            left={<TextInput.Icon icon="target" />}
            dense
          />
          </Card.Content>
        </Card>

        {/* ── Metas Diarias ─────────────────────────────────────── */}
        <Card style={styles.card} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <View style={styles.sectionHeaderRow}>
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary, marginBottom: 0 }]}>
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
          <HelperText type="info" visible padding="none" style={styles.helperText}>
            Basado en tu peso y composición
          </HelperText>
          <FastInput
            label="Calorías (kcal)"
            value={calorieGoal}
            onChangeText={setCalorieGoal}
            placeholder="2500"
            keyboardType="numeric"
            filter="integer"
            style={styles.input}
            left={<TextInput.Icon icon="fire" />}
            dense
          />
          <View style={styles.row}>
            <FastInput
            label="Agua (ml)"
            value={waterGoal}
            onChangeText={setWaterGoal}
            placeholder="2000"
            keyboardType="numeric"
            filter="integer"
              style={[styles.input, styles.flex1, { marginRight: 8 }]}
              left={<TextInput.Icon icon="cup-water" />}
              dense
            />
            <FastInput
            label="Sueño (h)"
            value={sleepGoal}
            onChangeText={setSleepGoal}
            placeholder="8"
            keyboardType="decimal-pad"
            filter="decimal"
              style={[styles.input, styles.flex1]}
              left={<TextInput.Icon icon="bed" />}
              dense
              helperText="Horas objetivo"
            />
          </View>
          </Card.Content>
        </Card>

        {/* ── Ajustes ────────────────────────────────────────────── */}
        <Card style={styles.card} mode="elevated">
          <Card.Content style={styles.cardContent}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
              ⚙️ Ajustes
            </Text>
            <Divider style={styles.divider} />
          <List.Item
            title="Modo Oscuro"
            description="Cambiar apariencia de la aplicación"
            left={props => <List.Icon {...props} icon="theme-light-dark" />}
            right={props => <Switch value={themeMode === 'dark'} onValueChange={toggleTheme} />}
            style={styles.listItem}
          />
          <List.Item
            title="Historial Nutricional"
            description="Revisa tu progreso semanal"
            left={props => <List.Icon {...props} icon="chart-bar" />}
            onPress={() => router.push('/(tabs)/profile/history')}
            style={styles.listItem}
          />
          <List.Item
            title="Historial de Entrenamientos"
            description="Tus rutinas pasadas"
            left={props => <List.Icon {...props} icon="dumbbell" />}
            onPress={() => router.push('/(tabs)/workout/history')}
            style={styles.listItem}
          />
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

        {/* Logout at bottom */}
        <Button
          mode="text"
          icon="logout"
          onPress={handleLogout}
          style={[styles.logoutButton, { marginTop: 8 }]}
          textColor={theme.colors.error}
          contentStyle={{ height: 48 }}
          labelStyle={{ fontSize: 14 }}
        >
          Cerrar Sesión
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
  headerProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
    gap: 16,
  },
  headerProfileText: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardContent: {
    padding: 16,
    paddingTop: 12,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  input: {
    marginBottom: 10,
  },
  helperText: {
    marginTop: -6,
    marginBottom: 6,
    marginLeft: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  flex1: {
    flex: 1,
  },
  listItem: {
    borderRadius: 12,
    marginVertical: 2,
  },
  saveButton: {
    borderRadius: 14,
    marginTop: 12,
  },
  saveButtonContent: {
    height: 52,
  },
  logoutButton: {
    borderRadius: 14,
    marginTop: 4,
  },
});