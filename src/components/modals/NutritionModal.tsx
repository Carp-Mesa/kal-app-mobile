import { useLogNutrition } from '@/src/hooks/useLogs';
import { useShake } from '@/src/hooks/useShake';
import { useAppStore } from '@/src/store/useAppStore';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { HelperText, Switch, Text, TextInput } from 'react-native-paper';
import Animated from 'react-native-reanimated';
import { CyberModal } from './CyberModal';

const CYBER_LIME = '#CCFF00';
const ERROR_RED = '#FF4444';
const COLOR_PROTEIN = '#2196F3';
const COLOR_CARBS = '#FF9800';
const COLOR_FATS = '#E91E63';

interface NutritionModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess?: () => void;
}

function round(val: number): number {
  return Math.round(val);
}

export const NutritionModal: React.FC<NutritionModalProps> = ({ visible, onDismiss, onSuccess }) => {
  const triggerSaveModal = useAppStore((state) => state.triggerSaveModal);
  const setModalValidationError = useAppStore((state) => state.setModalValidationError);
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [autoCalc, setAutoCalc] = useState(true);
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fats, setFats] = useState('');
  const [error, setError] = useState('');
  const [shakingField, setShakingField] = useState<'name' | 'calories' | 'macros' | null>(null);
  const nutritionMut = useLogNutrition();
  const { shake, animatedStyle } = useShake();

  const calNum = useMemo(() => {
    const c = parseInt(calories.replace(/[^0-9]/g, ''), 10);
    return isNaN(c) ? 0 : c;
  }, [calories]);

  const computedMacros = useMemo(() => {
    if (calNum <= 0) return { protein: 0, carbs: 0, fats: 0 };
    const p = round((calNum * 0.30) / 4);
    const c = round((calNum * 0.40) / 4);
    const f = round((calNum * 0.30) / 9);
    return { protein: p, carbs: c, fats: f };
  }, [calNum]);

  const finalMacros = useMemo(() => {
    if (autoCalc && calNum > 0) {
      return computedMacros;
    }
    return {
      protein: parseInt(protein.replace(/[^0-9]/g, ''), 10) || 0,
      carbs: parseInt(carbs.replace(/[^0-9]/g, ''), 10) || 0,
      fats: parseInt(fats.replace(/[^0-9]/g, ''), 10) || 0,
    };
  }, [autoCalc, calNum, computedMacros, protein, carbs, fats]);

  const macroBars = useMemo(() => {
    if (calNum <= 0) return { pPct: 0, cPct: 0, fPct: 0 };
    const totalKcalFromMacros = finalMacros.protein * 4 + finalMacros.carbs * 4 + finalMacros.fats * 9;
    if (totalKcalFromMacros === 0) return { pPct: 0, cPct: 0, fPct: 0 };
    return {
      pPct: Math.min(100, (finalMacros.protein * 4 / totalKcalFromMacros) * 100),
      cPct: Math.min(100, (finalMacros.carbs * 4 / totalKcalFromMacros) * 100),
      fPct: Math.min(100, (finalMacros.fats * 9 / totalKcalFromMacros) * 100),
    };
  }, [calNum, finalMacros]);

  const isInvalid = useMemo(() => {
    if (calNum <= 0) return true;
    if (!name.trim()) return true;
    if (!autoCalc && finalMacros.protein <= 0 && finalMacros.carbs <= 0 && finalMacros.fats <= 0) return true;
    return false;
  }, [calNum, name, autoCalc, finalMacros]);

  useEffect(() => {
    setModalValidationError(isInvalid);
  }, [isInvalid, setModalValidationError]);

  const handleSave = useCallback(() => {
    if (nutritionMut.isPending) return;
    const cal = calNum;
    if (cal <= 0) {
      setError('Ingresa las calorías');
      setShakingField('calories');
      shake();
      return;
    }
    if (!name.trim()) {
      setError('Ingresa el nombre de la comida');
      setShakingField('name');
      shake();
      return;
    }
    const macros = finalMacros;
    if (!autoCalc && (macros.protein <= 0 && macros.carbs <= 0 && macros.fats <= 0)) {
      setError('Ingresa al menos un macro');
      setShakingField('macros');
      shake();
      return;
    }
    setError('');
    setShakingField(null);
    nutritionMut.mutate({
      meal_name: name.trim(),
      calories: cal,
      protein: macros.protein,
      carbs: macros.carbs,
      fats: macros.fats,
      is_cheat_meal: false,
    }, {
      onSuccess: () => {
        setName('');
        setCalories('');
        setProtein('');
        setCarbs('');
        setFats('');
        setShakingField(null);
        onSuccess?.();
        onDismiss();
      },
      onError: () => setError('Error al registrar la comida.'),
    });
  }, [nutritionMut, calNum, name, autoCalc, finalMacros, shake, onSuccess, onDismiss]);

  const lastTriggerRef = useRef(0);

  useEffect(() => {
    if (visible) {
      setError('');
      setShakingField(null);
      lastTriggerRef.current = triggerSaveModal;
    }
  }, [visible]);

  useEffect(() => {
    if (visible && triggerSaveModal > lastTriggerRef.current) {
      lastTriggerRef.current = triggerSaveModal;
      handleSave();
    }
  }, [triggerSaveModal, visible, handleSave]);

  const getOutlineColor = (field: 'name' | 'calories' | 'macros') => {
    if (error && shakingField === field) return ERROR_RED;
    return 'rgba(255,255,255,0.2)';
  };

  const getActiveOutlineColor = (field: 'name' | 'calories' | 'macros', defaultColor: string) => {
    if (error && shakingField === field) return ERROR_RED;
    return defaultColor;
  };

  const MacroBar = ({ label, value, color, pct }: { label: string; value: number; color: string; pct: number }) => (
    <View style={styles.macroBarContainer}>
      <View style={styles.macroBarHeader}>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={[styles.macroValue, { color }]}>{value}g</Text>
      </View>
      <View style={styles.macroBarTrack}>
        <View style={[styles.macroBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );

  return (
    <CyberModal visible={visible} onDismiss={onDismiss} title="Registro de nutrición">
      <Animated.View style={shakingField === 'name' ? animatedStyle : undefined}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>NOMBRE DE LA COMIDA</Text>
          <TextInput
            mode="outlined"
            value={name}
            onChangeText={(t) => { setName(t); setError(''); }}
            placeholder="Ej: Almuerzo"
            style={styles.input}
            outlineColor={getOutlineColor('name')}
            activeOutlineColor={getActiveOutlineColor('name', CYBER_LIME)}
            textColor="#FFFFFF"
            theme={{ colors: { onSurface: '#FFFFFF', onSurfaceVariant: 'rgba(255,255,255,0.6)' } }}
          />
        </View>
      </Animated.View>

      <Animated.View style={shakingField === 'calories' ? animatedStyle : undefined}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>CALORÍAS</Text>
          <TextInput
            mode="outlined"
            value={calories}
            onChangeText={(t) => { setCalories(t.replace(/[^0-9]/g, '')); setError(''); }}
            placeholder="Ej: 500"
            keyboardType="numeric"
            style={styles.input}
            outlineColor={getOutlineColor('calories')}
            activeOutlineColor={getActiveOutlineColor('calories', CYBER_LIME)}
            textColor="#FFFFFF"
            theme={{ colors: { onSurface: '#FFFFFF', onSurfaceVariant: 'rgba(255,255,255,0.6)' } }}
            left={<TextInput.Icon icon="fire" color="rgba(255,255,255,0.5)" />}
          />
        </View>
      </Animated.View>

      <View style={styles.autoCalcRow}>
        <Text style={styles.autoCalcLabel}>Autocalcular macros</Text>
        <Switch
          value={autoCalc}
          onValueChange={setAutoCalc}
          color={CYBER_LIME}
        />
      </View>

      {calNum > 0 && (
        <View style={styles.barsSection}>
          <MacroBar label="Proteína" value={finalMacros.protein} color={COLOR_PROTEIN} pct={macroBars.pPct} />
          <MacroBar label="Carbos" value={finalMacros.carbs} color={COLOR_CARBS} pct={macroBars.cPct} />
          <MacroBar label="Grasa" value={finalMacros.fats} color={COLOR_FATS} pct={macroBars.fPct} />
        </View>
      )}

      {!autoCalc && (
        <Animated.View style={shakingField === 'macros' ? animatedStyle : undefined}>
          <View style={styles.manualMacrosRow}>
            <View style={{ flex: 1, marginRight: 6 }}>
              <Text style={styles.smallInputLabel}>PROT (G)</Text>
              <TextInput
                mode="outlined"
                value={protein}
                onChangeText={(t) => setProtein(t.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                placeholder="0"
                style={styles.smallInput}
                outlineColor="rgba(255,255,255,0.2)"
                activeOutlineColor={COLOR_PROTEIN}
                textColor="#FFFFFF"
                theme={{ colors: { onSurface: '#FFFFFF', onSurfaceVariant: 'rgba(255,255,255,0.6)' } }}
              />
            </View>

            <View style={{ flex: 1, marginHorizontal: 6 }}>
              <Text style={styles.smallInputLabel}>CARB (G)</Text>
              <TextInput
                mode="outlined"
                value={carbs}
                onChangeText={(t) => setCarbs(t.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                placeholder="0"
                style={styles.smallInput}
                outlineColor="rgba(255,255,255,0.2)"
                activeOutlineColor={COLOR_CARBS}
                textColor="#FFFFFF"
                theme={{ colors: { onSurface: '#FFFFFF', onSurfaceVariant: 'rgba(255,255,255,0.6)' } }}
              />
            </View>

            <View style={{ flex: 1, marginLeft: 6 }}>
              <Text style={styles.smallInputLabel}>GRAS (G)</Text>
              <TextInput
                mode="outlined"
                value={fats}
                onChangeText={(t) => setFats(t.replace(/[^0-9]/g, ''))}
                keyboardType="numeric"
                placeholder="0"
                style={styles.smallInput}
                outlineColor="rgba(255,255,255,0.2)"
                activeOutlineColor={COLOR_FATS}
                textColor="#FFFFFF"
                theme={{ colors: { onSurface: '#FFFFFF', onSurfaceVariant: 'rgba(255,255,255,0.6)' } }}
              />
            </View>
          </View>
        </Animated.View>
      )}

      {error ? <HelperText type="error" visible style={{ color: ERROR_RED, marginTop: 8 }}>{error}</HelperText> : null}
    </CyberModal>
  );
};

const styles = StyleSheet.create({
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 6,
    marginLeft: 2,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#1A1A1A',
    height: 52,
  },
  autoCalcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    marginTop: 4,
  },
  autoCalcLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '700',
  },
  barsSection: {
    marginBottom: 8,
  },
  macroBarContainer: {
    marginBottom: 10,
  },
  macroBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  macroLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macroValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  macroBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  macroBarFill: {
    height: 6,
    borderRadius: 3,
  },
  manualMacrosRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  smallInputLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
    marginLeft: 2,
    textTransform: 'uppercase',
  },
  smallInput: {
    backgroundColor: '#1A1A1A',
    height: 48,
  },
});
