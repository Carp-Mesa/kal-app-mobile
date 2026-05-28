import { clearAllStores } from '@/src/store/clearAllStores';
import { useAppStore } from '@/src/store/useAppStore';
import { useAuthStore } from '@/src/store/useAuthStore';
import { useProfileStore } from '@/src/store/useProfileStore';
import { capitalizeName } from '@/src/utils/formatting';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';
import {
  Button,
  Switch,
  Text,
  TextInput,
  useTheme
} from 'react-native-paper';
import { CustomToast } from '@/src/components/CustomToast';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { GlossaryModal } from '@/src/components/modals/GlossaryModal';



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
      marginBottom: 16,
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
  const themeMode = useAppStore((state) => state.themeMode);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const profile = useProfileStore((state) => state.profile);
  const _hasHydrated = useProfileStore((state) => state._hasHydrated);
  const updateProfileStore = useProfileStore((state) => state.updateProfile);
  const clearTokens = useAuthStore(state => state.clearTokens);

  const [activeTab, setActiveTab] = useState<TabType>('Info Personal');
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });
  const [glossaryVisible, setGlossaryVisible] = useState(false);

  // ─── Edit modes ────────────────────────────────────────────────────────────
  const [editingFicha, setEditingFicha] = useState(false);
  const [editingMetas, setEditingMetas] = useState(false);

  // ─── Fields (Initialized directly with local store data to prevent flicker) ──
  const [fullName, setFullName] = useState(() => capitalizeName(profile?.full_name) ?? '');
  const [age, setAge] = useState(() => profile?.age?.toString() ?? '');
  const [height, setHeight] = useState(() => profile?.height?.toString() ?? '');
  const [currentWeight, setCurrentWeight] = useState(() => profile?.current_weight?.toString() ?? '');
  const [bodyFat, setBodyFat] = useState(() => profile?.body_fat_percentage?.toString() ?? '');

  const [targetWeight, setTargetWeight] = useState(() => profile?.weight_goal?.toString() ?? '');
  const [waterGoal, setWaterGoal] = useState(() => profile?.water_goal?.toString() ?? '');
  const [autoCalculateMacros, setAutoCalculateMacros] = useState(() => {
    if (profile?.protein_goal || profile?.carbs_goal || profile?.fats_goal) {
      return false;
    }
    return true;
  });
  const [calorieGoal, setCalorieGoal] = useState(() => profile?.calorie_goal?.toString() ?? '');
  const [proteinGoal, setProteinGoal] = useState(() => profile?.protein_goal?.toString() ?? '');
  const [carbsGoal, setCarbsGoal] = useState(() => profile?.carbs_goal?.toString() ?? '');
  const [fatsGoal, setFatsGoal] = useState(() => profile?.fats_goal?.toString() ?? '');
  const [restTimeSeconds, setRestTimeSeconds] = useState(() => profile?.rest_time_seconds?.toString() ?? '90');

  // ── LOCAL-FIRST: Profile is read from local store (instant) ────────
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile && !editingFicha && !editingMetas) {
      setFullName(capitalizeName(profile.full_name) ?? '');
      setAge(profile.age?.toString() ?? '');
      setHeight(profile.height?.toString() ?? '');
      setCurrentWeight(profile.current_weight?.toString() ?? '');
      setBodyFat(profile.body_fat_percentage?.toString() ?? '');

      setTargetWeight(profile.weight_goal?.toString() ?? '');
      setWaterGoal(profile.water_goal?.toString() ?? '');
      setCalorieGoal(profile.calorie_goal?.toString() ?? '');
      setRestTimeSeconds(profile.rest_time_seconds?.toString() ?? '90');
      if (profile.protein_goal || profile.carbs_goal || profile.fats_goal) {
        setProteinGoal(profile.protein_goal?.toString() ?? '');
        setCarbsGoal(profile.carbs_goal?.toString() ?? '');
        setFatsGoal(profile.fats_goal?.toString() ?? '');
        setAutoCalculateMacros(false);
      }
    }
  }, [profile, editingFicha, editingMetas]);

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

  // ─── Robust numeric parsers: empty string → keep current store value ───────
  const parseNumberOrKeep = (
    input: string,
    currentValue: number | undefined,
    parser: (s: string) => number
  ): number | undefined => {
    const trimmed = input.trim();
    if (trimmed === '') return currentValue;
    const parsed = parser(trimmed);
    return isNaN(parsed) ? currentValue : parsed;
  };

  const parseIntOrKeep = (input: string, currentValue?: number) =>
    parseNumberOrKeep(input, currentValue, (s) => parseInt(s, 10));

  const parseFloatOrKeep = (input: string, currentValue?: number) =>
    parseNumberOrKeep(input, currentValue, parseFloat);

  const handleSave = () => {
    const current = profile;

    const updates = {
      full_name: fullName.trim() || current?.full_name,
      age: parseIntOrKeep(age, current?.age),
      height: parseFloatOrKeep(height, current?.height),
      current_weight: parseFloatOrKeep(currentWeight, current?.current_weight),
      body_fat_percentage: parseFloatOrKeep(bodyFat, current?.body_fat_percentage),
      weight_goal: parseFloatOrKeep(targetWeight, current?.weight_goal),
      water_goal: parseIntOrKeep(waterGoal, current?.water_goal),
      calorie_goal: parseIntOrKeep(calorieGoal, current?.calorie_goal),
      protein_goal: parseIntOrKeep(proteinGoal, current?.protein_goal),
      carbs_goal: parseIntOrKeep(carbsGoal, current?.carbs_goal),
      fats_goal: parseIntOrKeep(fatsGoal, current?.fats_goal),
    };

    // LOCAL-FIRST: Update store immediately → synced: false
    updateProfileStore(updates);
    setSnackbar({ visible: true, message: 'Perfil actualizado correctamente' });
    setEditingFicha(false);
    setEditingMetas(false);
  };

  const handleLogout = () => {
    clearAllStores();
    clearTokens();
    router.replace('/(auth)/login');
  };

  const cardBg = theme.dark ? '#1A1A1A' : theme.colors.surface;
  const labelColor = theme.dark ? '#888888' : '#666666';

  const getStyleCard = () => ({
    backgroundColor: cardBg,
    borderColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
  });

  if (!_hasHydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
    >
      <ScrollView contentContainerStyle={{ padding: 12, paddingTop: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>

        <FilterTabs selected={activeTab} onSelect={(t: TabType) => setActiveTab(t)} theme={theme} />

        {/* Content based on Tab */}
        {activeTab === 'Info Personal' && (
          <View style={getStyleCard()}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.onSurface, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Información Básica
            </Text>

            <View style={s.inputGroup}>
              <Text style={[s.inputLabel, { color: labelColor }]}>NOMBRE COMPLETO</Text>
              <TextInput
                mode="outlined"
                placeholder="Ej: Carp Mesa"
                value={fullName}
                onChangeText={setFullName}
                editable={editingFicha}
                left={<TextInput.Icon icon="account" color={editingFicha ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.2)'} />}
                style={{ backgroundColor: cardBg, height: 52 }}
                outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }}
                textColor={editingFicha ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
                theme={{ colors: { primary: theme.colors.primary } }}
              />
            </View>

            {/* Row 1: Edad & Altura */}
            <View style={s.gridRow}>
              <View style={{ flex: 1 }}>
                <Text style={[s.inputLabel, { color: labelColor }]}>EDAD</Text>
                <TextInput
                  mode="outlined"
                  placeholder="Ej: 28"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  editable={editingFicha}
                  left={<TextInput.Icon icon="calendar-account" color={editingFicha ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.2)'} />}
                  style={{ backgroundColor: cardBg, height: 52 }}
                  outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }}
                  textColor={editingFicha ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
                  theme={{ colors: { primary: theme.colors.primary } }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[s.inputLabel, { color: labelColor }]}>ALTURA (CM)</Text>
                <TextInput
                  mode="outlined"
                  placeholder="Ej: 175"
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                  editable={editingFicha}
                  left={<TextInput.Icon icon="human-male-height" color={editingFicha ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.2)'} />}
                  style={{ backgroundColor: cardBg, height: 52 }}
                  outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }}
                  textColor={editingFicha ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
                  theme={{ colors: { primary: theme.colors.primary } }}
                />
              </View>
            </View>

            {/* Row 2: Peso & % Grasa */}
            <View style={s.gridRow}>
              <View style={{ flex: 1 }}>
                <Text style={[s.inputLabel, { color: labelColor }]}>PESO ACTUAL (KG)</Text>
                <TextInput
                  mode="outlined"
                  placeholder="Ej: 75.5"
                  value={currentWeight}
                  onChangeText={setCurrentWeight}
                  keyboardType="numeric"
                  editable={editingFicha}
                  left={<TextInput.Icon icon="scale-bathroom" color={editingFicha ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.2)'} />}
                  style={{ backgroundColor: cardBg, height: 52 }}
                  outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }}
                  textColor={editingFicha ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
                  theme={{ colors: { primary: theme.colors.primary } }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[s.inputLabel, { color: labelColor }]}>GRASA (%)</Text>
                <TextInput
                  mode="outlined"
                  placeholder="Ej: 15"
                  value={bodyFat}
                  onChangeText={setBodyFat}
                  keyboardType="numeric"
                  editable={editingFicha}
                  left={<TextInput.Icon icon="percent" color={editingFicha ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.2)'} />}
                  style={{ backgroundColor: cardBg, height: 52 }}
                  outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }}
                  textColor={editingFicha ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
                  theme={{ colors: { primary: theme.colors.primary } }}
                />
              </View>
            </View>

            <Button
              mode="contained"
              onPress={editingFicha ? handleSave : () => setEditingFicha(true)}
              loading={isSaving}
              style={{ borderRadius: 12, marginTop: 8 }}
            >
              <Text style={{ fontWeight: '700', color: theme.dark ? '#000' : '#fff' }}>
                {editingFicha ? 'Guardar cambios' : 'Editar ficha'}
              </Text>
            </Button>
          </View>
        )}

        {activeTab === 'Metas' && (
          <View style={getStyleCard()}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.onSurface, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Metas Físicas
            </Text>

            {/* Row 1: Meta de Peso & Meta de Agua */}
            <View style={s.gridRow}>
              <View style={{ flex: 1 }}>
                <Text style={[s.inputLabel, { color: labelColor }]}>META DE PESO (KG)</Text>
                <TextInput
                  mode="outlined"
                  placeholder="Ej: 70"
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  keyboardType="numeric"
                  editable={editingMetas}
                  left={<TextInput.Icon icon="bullseye-arrow" color={editingMetas ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.2)'} />}
                  style={{ backgroundColor: cardBg, height: 52 }}
                  outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }}
                  textColor={editingMetas ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
                  theme={{ colors: { primary: theme.colors.primary } }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[s.inputLabel, { color: labelColor }]}>META DE AGUA (ML)</Text>
                <TextInput
                  mode="outlined"
                  placeholder="Ej: 2000"
                  value={waterGoal}
                  onChangeText={setWaterGoal}
                  keyboardType="numeric"
                  editable={editingMetas}
                  left={<TextInput.Icon icon="water-outline" color={editingMetas ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.2)'} />}
                  style={{ backgroundColor: cardBg, height: 52 }}
                  outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }}
                  textColor={editingMetas ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
                  theme={{ colors: { primary: theme.colors.primary } }}
                />
              </View>
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, marginTop: 4 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.onSurface, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Nutrición
              </Text>
              {editingMetas && (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 11, marginRight: 4, fontWeight: '600' }}>
                    Autocalcular
                  </Text>
                  <Switch
                    value={autoCalculateMacros}
                    onValueChange={setAutoCalculateMacros}
                    color={theme.colors.primary}
                    style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                  />
                </View>
              )}
            </View>

            <View style={s.inputGroup}>
              <Text style={[s.inputLabel, { color: labelColor }]}>CALORÍAS DIARIAS (KCAL)</Text>
              <TextInput
                mode="outlined"
                placeholder="Ej: 2200"
                value={calorieGoal}
                onChangeText={setCalorieGoal}
                keyboardType="numeric"
                editable={editingMetas}
                left={<TextInput.Icon icon="fire" color={editingMetas ? theme.colors.onSurfaceVariant : 'rgba(255,255,255,0.2)'} />}
                style={{ backgroundColor: cardBg, height: 52 }}
                outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }}
                textColor={editingMetas ? theme.colors.onSurface : theme.colors.onSurfaceVariant}
                theme={{ colors: { primary: theme.colors.primary } }}
              />
            </View>

            {/* Row 2: Macros side-by-side (3 columns) */}
            <View style={[s.gridRow, { marginBottom: 16 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.inputLabel, { color: labelColor, fontSize: 8 }]}>PROT (G)</Text>
                <TextInput
                  mode="outlined"
                  placeholder="0"
                  value={proteinGoal}
                  onChangeText={setProteinGoal}
                  keyboardType="numeric"
                  editable={editingMetas && !autoCalculateMacros}
                  style={{ backgroundColor: cardBg, height: 52 }}
                  outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1.5 }}
                  textColor={!editingMetas || autoCalculateMacros ? theme.colors.onSurfaceVariant : theme.colors.onSurface}
                  theme={{ colors: { primary: theme.colors.primary } }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[s.inputLabel, { color: labelColor, fontSize: 8 }]}>CARBS (G)</Text>
                <TextInput
                  mode="outlined"
                  placeholder="0"
                  value={carbsGoal}
                  onChangeText={setCarbsGoal}
                  keyboardType="numeric"
                  editable={editingMetas && !autoCalculateMacros}
                  style={{ backgroundColor: cardBg, height: 52 }}
                  outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1.5 }}
                  textColor={!editingMetas || autoCalculateMacros ? theme.colors.onSurfaceVariant : theme.colors.onSurface}
                  theme={{ colors: { primary: theme.colors.primary } }}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[s.inputLabel, { color: labelColor, fontSize: 8 }]}>GRASAS (G)</Text>
                <TextInput
                  mode="outlined"
                  placeholder="0"
                  value={fatsGoal}
                  onChangeText={setFatsGoal}
                  keyboardType="numeric"
                  editable={editingMetas && !autoCalculateMacros}
                  style={{ backgroundColor: cardBg, height: 52 }}
                  outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1.5 }}
                  textColor={!editingMetas || autoCalculateMacros ? theme.colors.onSurfaceVariant : theme.colors.onSurface}
                  theme={{ colors: { primary: theme.colors.primary } }}
                />
              </View>
            </View>

            <Button
              mode="contained"
              onPress={editingMetas ? handleSave : () => setEditingMetas(true)}
              loading={isSaving}
              style={{ borderRadius: 12 }}
            >
              <Text style={{ fontWeight: '700', color: theme.dark ? '#000' : '#fff' }}>
                {editingMetas ? 'Guardar cambios' : 'Editar metas'}
              </Text>
            </Button>
          </View>
        )}

        {activeTab === 'Ajustes' && (
          <View style={getStyleCard()}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.onSurface, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Preferencias
            </Text>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: theme.colors.onSurface, fontSize: 15 }}>Tema Oscuro</Text>
              <Switch
                value={themeMode === 'dark'}
                onValueChange={() => toggleTheme()}
                color={theme.colors.primary}
              />
            </View>

            <View style={{ marginBottom: 20 }}>
              <Text style={[s.inputLabel, { color: labelColor, marginBottom: 8, fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }]}>TIEMPO DE DESCANSO (SEGUNDOS)</Text>
              <TextInput
                mode="outlined"
                placeholder="Ej: 90"
                value={restTimeSeconds}
                onChangeText={(text) => {
                  const filtered = text.replace(/[^0-9]/g, '');
                  setRestTimeSeconds(filtered);
                  updateProfileStore({ rest_time_seconds: parseInt(filtered, 10) || 90 });
                }}
                keyboardType="numeric"
                left={<TextInput.Icon icon="timer-sand" color={theme.colors.onSurfaceVariant} />}
                style={{ backgroundColor: cardBg, height: 52 }}
                outlineStyle={{ borderRadius: 12, borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1.5 }}
                textColor={theme.colors.onSurface}
                theme={{ colors: { primary: theme.colors.primary } }}
              />
            </View>

            <TouchableOpacity 
              onPress={() => setGlossaryVisible(true)} 
              style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                paddingVertical: 14, 
                paddingHorizontal: 16, 
                backgroundColor: theme.dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', 
                borderColor: 'rgba(255,255,255,0.12)', 
                borderWidth: 1.5, 
                borderRadius: 12, 
                marginBottom: 16,
                gap: 12
              }}
            >
              <MaterialCommunityIcons name="book-open-outline" size={20} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.onSurface, fontSize: 14, fontWeight: '700' }}>Diccionario Científico</Text>
                <Text style={{ color: theme.colors.onSurfaceVariant, fontSize: 10, marginTop: 1 }}>Aprende la ciencia de tus métricas</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
            </TouchableOpacity>

            <TouchableOpacity onPress={handleLogout} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: 'rgba(255, 59, 48, 0.08)', borderRadius: 12, marginTop: 10 }}>
              <Text style={{ color: '#FF3B30', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Cerrar Sesión</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
      <CustomToast
        visible={snackbar.visible}
        message={snackbar.message}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
      />
      <GlossaryModal
        visible={glossaryVisible}
        onDismiss={() => setGlossaryVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
    marginLeft: 2,
    textTransform: 'uppercase',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
});
