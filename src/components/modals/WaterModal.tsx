import { useLogWater } from '@/src/hooks/useLogs';
import { useShake } from '@/src/hooks/useShake';
import { useAppStore } from '@/src/store/useAppStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput } from 'react-native-paper';
import Animated from 'react-native-reanimated';
import { CyberModal } from './CyberModal';

const CYBER_LIME = '#CCFF00';
const ERROR_RED = '#FF4444';

interface WaterModalProps {
  visible: boolean;
  onDismiss: () => void;
  waterGoal?: number;
  onSuccess?: () => void;
}

export const WaterModal: React.FC<WaterModalProps> = ({ visible, onDismiss, waterGoal = 2000, onSuccess }) => {
  const triggerSaveModal = useAppStore((state) => state.triggerSaveModal);
  const setModalValidationError = useAppStore((state) => state.setModalValidationError);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const waterMut = useLogWater();
  const { shake, animatedStyle } = useShake();

  const parsedAmount = useMemo(() => {
    const val = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    return isNaN(val) ? 0 : val;
  }, [amount]);

  const isInvalid = parsedAmount <= 0;

  useEffect(() => {
    setModalValidationError(isInvalid);
  }, [isInvalid, setModalValidationError]);

  const handleSave = useCallback(() => {
    if (waterMut.isPending) return;
    const val = parsedAmount;
    if (val <= 0) {
      setError('Ingresa una cantidad válida');
      shake();
      return;
    }
    setError('');
    waterMut.mutate(val, {
      onSuccess: () => {
        setAmount('');
        onSuccess?.();
        onDismiss();
      },
      onError: () => setError('Error al registrar el agua.'),
    });
  }, [waterMut, parsedAmount, shake, onSuccess, onDismiss]);

  const lastTriggerRef = useRef(0);

  useEffect(() => {
    if (visible) {
      setError('');
      lastTriggerRef.current = triggerSaveModal;
    }
  }, [visible]);

  useEffect(() => {
    if (visible && triggerSaveModal > lastTriggerRef.current) {
      lastTriggerRef.current = triggerSaveModal;
      handleSave();
    }
  }, [triggerSaveModal, visible, handleSave]);

  const quickAdd = (ml: number) => {
    setAmount(String(ml));
    setError('');
  };

  const displayAmount = parsedAmount || 0;
  const outlineColor = error ? ERROR_RED : 'rgba(255,255,255,0.2)';

  return (
    <CyberModal visible={visible} onDismiss={onDismiss} title="Registro de agua">
      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>
          {displayAmount}
          <Text style={styles.metaText}> / {waterGoal} ml</Text>
        </Text>
      </View>

      <View style={styles.quickActions}>
        {[250, 500, 1000].map((ml) => (
          <Pressable
            key={ml}
            onPress={() => quickAdd(ml)}
            style={({ pressed }) => [
              styles.circleButton,
              { borderColor: CYBER_LIME, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <MaterialCommunityIcons name="cup-water" size={22} color={CYBER_LIME} />
            <Text style={styles.circleButtonText}>+{ml >= 1000 ? '1L' : `${ml}ml`}</Text>
          </Pressable>
        ))}
      </View>

      <Animated.View style={animatedStyle}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>CANTIDAD PERSONALIZADA (ML)</Text>
          <TextInput
            mode="outlined"
            value={amount}
            onChangeText={(text) => { setAmount(text.replace(/[^0-9]/g, '')); setError(''); }}
            placeholder="Ej: 350"
            keyboardType="numeric"
            style={styles.input}
            outlineColor={outlineColor}
            activeOutlineColor={error ? ERROR_RED : CYBER_LIME}
            textColor="#FFFFFF"
            theme={{ colors: { onSurface: '#FFFFFF', onSurfaceVariant: 'rgba(255,255,255,0.6)' } }}
          />
        </View>
      </Animated.View>
      {error ? <HelperText type="error" visible style={{ color: ERROR_RED }}>{error}</HelperText> : null}
    </CyberModal>
  );
};

const styles = StyleSheet.create({
  counterContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  counterText: {
    fontSize: 48,
    fontWeight: '900',
    color: CYBER_LIME,
    letterSpacing: 1,
  },
  metaText: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginBottom: 24,
  },
  circleButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  circleButtonText: {
    color: CYBER_LIME,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginTop: 8,
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
});
