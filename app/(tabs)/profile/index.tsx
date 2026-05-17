import { updateProfile as updateProfileApi } from '@/src/services/profileService';
import { useProfileStore } from '@/src/store/useProfileStore';
import { useAppStore } from '@/src/store/useAppStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { clearAllStores } from '@/src/store/clearAllStores';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View
} from 'react-native';
import {
  Button,
  Snackbar,
  Switch,
  Text,
  TextInput,
  useTheme
} from 'react-native-paper';

type TabType = 'Info Personal' | 'Metas' | 'Ajustes';

const FilterTabs = ({ selected, onSelect, theme }: any) => {
  const tabs = ['Info Personal', 'Metas', 'Ajustes'];
  return (
    <View style={{
      flexDirection: 'row',
      backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
      borderRadius: 12,
      padding: 2,
      alignItems: 'center',
      marginBottom: 24,
    }}>
      {tabs.map((tab, idx) => {
        const isActive = selected === tab;
        return (
          <React.Fragment key={tab}>
            <TouchableOpacity
              onPress={() => onSelect(tab)}
              style={[
                { flex: 1, paddingVertical: 6, alignItems: 'center', borderRadius: 10 },
                isActive && { backgroundColor: theme.colors.primary }
              ]}
            >
              <Text style={[
                { fontSize: 11, fontWeight: '500', color: theme.dark ? '#aaa' : '#666' },
                isActive && { color: theme.colors.background, fontWeight: 'bold' }
              ]}>
                {tab}
              </Text>
            </TouchableOpacity>
            {idx < tabs.length - 1 && <View style={{ width: 1, height: 16, backgroundColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />}
          </React.Fragment>
        )
      })}
    </View>
  );
};

export default function ProfileScreen() {
  const theme = useTheme();
  const { themeMode, toggleTheme, resetOnboarding } = useAppStore();
  const profile = useProfileStore((state) => state.profile);
  const updateProfileStore = useProfileStore((state) => state.updateProfile);
  const clearTokens = useAuthStore(state => state.clearTokens);
  const isInitialized = useRef(false);

  const [activeTab, setActiveTab] = useState<TabType>('Info Personal');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  // ─── Edit modes ────────────────────────────────────────────────────────────
  const [editingFicha, setEditingFicha] = useState(false);
  const [editingMetas, setEditingMetas] = useState(false);

  // ─── Fields ────────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [height, setHeight] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');

  const [targetWeight, setTargetWeight] = useState('');
  const [waterGoal, setWaterGoal] = useState('');
  const [autoCalculateMacros, setAutoCalculateMacros] = useState(true);
  const [calorieGoal, setCalorieGoal] = useState('');
  const [proteinGoal, setProteinGoal] = useState('');
  const [carbsGoal, setCarbsGoal] = useState('');
  const [fatsGoal, setFatsGoal] = useState('');

  // ── LOCAL-FIRST: Profile is read from local store (instant) ────────
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile && !isInitialized.current) {
      setFullName(profile.full_name ?? '');
      setAge(profile.age?.toString() ?? '');
      setHeight(profile.height?.toString() ?? '');
      setCurrentWeight(profile.current_weight?.toString() ?? '');
      setBodyFat(profile.body_fat_percentage?.toString() ?? '');

      setTargetWeight(profile.weight_goal?.toString() ?? '');
      setWaterGoal(profile.water_goal?.toString() ?? '');
      setCalorieGoal(profile.calorie_goal?.toString() ?? '');
      if (profile.protein_goal || profile.carbs_goal || profile.fats_goal) {
        setProteinGoal(profile.protein_goal?.toString() ?? '');
        setCarbsGoal(profile.carbs_goal?.toString() ?? '');
        setFatsGoal(profile.fats_goal?.toString() ?? '');
        setAutoCalculateMacros(false);
      }
      isInitialized.current = true;
    }
  }, [profile]);

  // Autocalculate macros when calories change and autoCalc is ON
  useEffect(() => {
    if (autoCalculateMacros) {
      const cals = parseInt(calorieGoal, 10);
      if (!isNaN(cals) && cals > 0) {
        // 30% Prot / 40% Carbs / 30% Fats
        // Prot (4 kcal/g), Carbs (4 kcal/g), Fats (9 kcal/g)
        setProteinGoal(Math.round((cals * 0.3) / 4).toString());
        setCarbsGoal(Math.round((cals * 0.4) / 4).toString());
        setFatsGoal(Math.round((cals * 0.3) / 9).toString());
      } else {
        setProteinGoal('');
        setCarbsGoal('');
        setFatsGoal('');
      }
    }
  }, [calorieGoal, autoCalculateMacros]);

  const handleSave = () => {
    const updates = {
      full_name: fullName.trim() || undefined,
      age: parseInt(age, 10) || undefined,
      height: parseFloat(height) || undefined,
      current_weight: parseFloat(currentWeight) || undefined,
      body_fat_percentage: parseFloat(bodyFat) || undefined,
      weight_goal: parseFloat(targetWeight) || undefined,
      water_goal: parseInt(waterGoal, 10) || undefined,
      calorie_goal: parseInt(calorieGoal, 10) || undefined,
      protein_goal: parseInt(proteinGoal, 10) || undefined,
      carbs_goal: parseInt(carbsGoal, 10) || undefined,
      fats_goal: parseInt(fatsGoal, 10) || undefined,
    };

    // LOCAL-FIRST: Update store immediately
    updateProfileStore(updates);
    setSnackbar({ visible: true, message: 'Perfil actualizado correctamente' });
    setEditingFicha(false);
    setEditingMetas(false);

    // Background sync to server (silent)
    updateProfileApi(updates).catch(() => {
      // Swallow — shadow sync will handle retries
    });
  };

  const handleLogout = () => {
    // Wipe all local data so the next user cannot see this user's records
    clearAllStores();
    clearTokens();
    router.replace('/(auth)/login');
  };

  const getStyleCard = () => ({
    backgroundColor: theme.dark ? '#1A1A1A' : theme.colors.surface,
    borderColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  });



  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 32, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

        <FilterTabs selected={activeTab} onSelect={(t: TabType) => setActiveTab(t)} theme={theme} />

        {/* Content based on Tab */}
        {activeTab === 'Info Personal' && (
          <View style={getStyleCard()}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.onSurface, marginBottom: 16 }}>
              Información Básica
            </Text>

            <TextInput
              mode="outlined"
              label="Nombre Completo"
              value={fullName}
              onChangeText={setFullName}
              editable={editingFicha}
              left={<TextInput.Icon icon="account" color={editingFicha ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.2)'} />}
              style={{ backgroundColor: editingFicha ? 'transparent' : 'rgba(255,255,255,0.02)', marginBottom: 16 }}
              outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }}
              textColor={editingFicha ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
              theme={{ colors: { primary: theme.colors.primary } }}
            />
            <TextInput
              mode="outlined"
              label="Edad"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              editable={editingFicha}
              left={<TextInput.Icon icon="calendar-account" color={editingFicha ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.2)'} />}
              style={{ backgroundColor: editingFicha ? 'transparent' : 'rgba(255,255,255,0.02)', marginBottom: 24 }}
              outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }}
              textColor={editingFicha ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
              theme={{ colors: { primary: theme.colors.primary } }}
            />

            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.onSurface, marginBottom: 16 }}>
              Biometría
            </Text>

            <View style={{ gap: 16, marginBottom: 24 }}>
              <TextInput
                mode="outlined"
                label="Altura (cm)"
                value={height}
                onChangeText={setHeight}
                keyboardType="numeric"
                editable={editingFicha}
                left={<TextInput.Icon icon="human-male-height" color={editingFicha ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.2)'} />}
                style={{ backgroundColor: editingFicha ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }}
                textColor={editingFicha ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
                theme={{ colors: { primary: theme.colors.primary } }}
              />
              <TextInput
                mode="outlined"
                label="Peso actual (kg)"
                value={currentWeight}
                onChangeText={setCurrentWeight}
                keyboardType="numeric"
                editable={editingFicha}
                left={<TextInput.Icon icon="scale-bathroom" color={editingFicha ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.2)'} />}
                style={{ backgroundColor: editingFicha ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }}
                textColor={editingFicha ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
                theme={{ colors: { primary: theme.colors.primary } }}
              />
              <TextInput
                mode="outlined"
                label="Porcentaje de grasa (%)"
                value={bodyFat}
                onChangeText={setBodyFat}
                keyboardType="numeric"
                editable={editingFicha}
                left={<TextInput.Icon icon="percent" color={editingFicha ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.2)'} />}
                style={{ backgroundColor: editingFicha ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }}
                textColor={editingFicha ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
                theme={{ colors: { primary: theme.colors.primary } }}
              />
            </View>

            <Button
              mode="contained"
              onPress={editingFicha ? handleSave : () => setEditingFicha(true)}
              loading={isSaving}
              style={{ borderRadius: 12, paddingVertical: 4 }}
            >
              <Text style={{ fontWeight: '700', color: theme.dark ? '#000' : '#fff' }}>
                {editingFicha ? 'Guardar cambios' : 'Editar ficha'}
              </Text>
            </Button>
          </View>
        )}

        {activeTab === 'Metas' && (
          <View style={getStyleCard()}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.onSurface, marginBottom: 16 }}>
              Metas Físicas
            </Text>

            <View style={{ gap: 16, marginBottom: 24 }}>
              <TextInput
                mode="outlined"
                label="Peso Objetivo (kg)"
                value={targetWeight}
                onChangeText={setTargetWeight}
                keyboardType="numeric"
                editable={editingMetas}
                left={<TextInput.Icon icon="bullseye-arrow" color={editingMetas ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.2)'} />}
                style={{ backgroundColor: editingMetas ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }}
                textColor={editingMetas ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
                theme={{ colors: { primary: theme.colors.primary } }}
              />
              <TextInput
                mode="outlined"
                label="Objetivo de Agua (ml)"
                value={waterGoal}
                onChangeText={setWaterGoal}
                keyboardType="numeric"
                editable={editingMetas}
                left={<TextInput.Icon icon="water-outline" color={editingMetas ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.2)'} />}
                style={{ backgroundColor: editingMetas ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }}
                textColor={editingMetas ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
                theme={{ colors: { primary: theme.colors.primary } }}
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.onSurface }}>
                Metas Nutricionales
              </Text>
            </View>

            <TextInput
              mode="outlined"
              label="Calorías Diarias (kcal)"
              value={calorieGoal}
              onChangeText={setCalorieGoal}
              keyboardType="numeric"
              editable={editingMetas}
              left={<TextInput.Icon icon="fire" color={editingMetas ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.2)'} />}
              style={{ backgroundColor: editingMetas ? 'transparent' : 'rgba(255,255,255,0.02)', marginBottom: 20 }}
              outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }}
              textColor={editingMetas ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
              theme={{ colors: { primary: theme.colors.primary } }}
            />

            {editingMetas && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Macros Diarios
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 12, marginRight: 1, fontWeight: '600' }}>
                    Autocalcular
                  </Text>
                  <Switch
                    value={autoCalculateMacros}
                    onValueChange={setAutoCalculateMacros}
                    color={theme.colors.primary}
                  />
                </View>
              </View>
            )}

            <View style={{ gap: 12, marginBottom: 24 }}>
              <TextInput
                mode="outlined"
                label="Proteínas (g)"
                value={proteinGoal}
                onChangeText={setProteinGoal}
                keyboardType="numeric"
                editable={editingMetas && !autoCalculateMacros}
                left={<TextInput.Icon icon="food-steak" color={!editingMetas || autoCalculateMacros ? 'rgba(255,255,255,0.2)' : theme.colors.onSurfaceVariant} />}
                style={{ backgroundColor: !editingMetas || autoCalculateMacros ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1.5 }}
                textColor={!editingMetas || autoCalculateMacros ? theme.colors.onSurfaceVariant : theme.colors.onSurface}
                theme={{ colors: { primary: theme.colors.primary } }}
              />
              <TextInput
                mode="outlined"
                label="Carbohidratos (g)"
                value={carbsGoal}
                onChangeText={setCarbsGoal}
                keyboardType="numeric"
                editable={editingMetas && !autoCalculateMacros}
                left={<TextInput.Icon icon="food-croissant" color={!editingMetas || autoCalculateMacros ? 'rgba(255,255,255,0.2)' : theme.colors.onSurfaceVariant} />}
                style={{ backgroundColor: !editingMetas || autoCalculateMacros ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1.5 }}
                textColor={!editingMetas || autoCalculateMacros ? theme.colors.onSurfaceVariant : theme.colors.onSurface}
                theme={{ colors: { primary: theme.colors.primary } }}
              />
              <TextInput
                mode="outlined"
                label="Grasas (g)"
                value={fatsGoal}
                onChangeText={setFatsGoal}
                keyboardType="numeric"
                editable={editingMetas && !autoCalculateMacros}
                left={<TextInput.Icon icon="oil" color={!editingMetas || autoCalculateMacros ? 'rgba(255,255,255,0.2)' : theme.colors.onSurfaceVariant} />}
                style={{ backgroundColor: !editingMetas || autoCalculateMacros ? 'rgba(255,255,255,0.02)' : 'transparent' }}
                outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1.5 }}
                textColor={!editingMetas || autoCalculateMacros ? theme.colors.onSurfaceVariant : theme.colors.onSurface}
                theme={{ colors: { primary: theme.colors.primary } }}
              />
            </View>

            <Button
              mode="contained"
              onPress={editingMetas ? handleSave : () => setEditingMetas(true)}
              loading={isSaving}
              style={{ borderRadius: 12, paddingVertical: 4 }}
            >
              <Text style={{ fontWeight: '700', color: theme.dark ? '#000' : '#fff' }}>
                {editingMetas ? 'Guardar cambios' : 'Editar metas'}
              </Text>
            </Button>
          </View>
        )}

        {activeTab === 'Ajustes' && (
          <View style={getStyleCard()}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: theme.colors.onSurface, marginBottom: 16 }}>
              Preferencias
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ color: theme.colors.onSurface, fontSize: 16 }}>Tema Oscuro</Text>
              <Switch
                value={themeMode === 'dark'}
                onValueChange={() => toggleTheme()}
                color={theme.colors.primary}
              />
            </View>

            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 24 }} />

            <TouchableOpacity
              onPress={() => {
                resetOnboarding();
                router.replace('/(onboarding)/screen');
              }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginBottom: 12 }}
            >
              <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 14, fontWeight: '600' }}>
                Ver introducción
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 }}>
              <Text style={{ color: '#FF3B30', fontSize: 16, fontWeight: '700' }}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
        style={{ backgroundColor: theme.dark ? '#333' : theme.colors.surfaceVariant }}
      >
        <Text style={{ color: theme.colors.onSurface }}>{snackbar.message}</Text>
      </Snackbar>
    </KeyboardAvoidingView>
  );
}
