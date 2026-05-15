import { useLogWater } from '@/src/hooks/useLogs';
import { useAppStore } from '@/src/store/useAppStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { HelperText, Text, TextInput } from 'react-native-paper';
import { CyberModal } from './CyberModal';

const CYBER_LIME = '#CCFF00';

interface WaterModalProps {
  visible: boolean;
  onDismiss: () => void;
  waterGoal?: number;
  onSuccess?: () => void;
}

export const WaterModal: React.FC<WaterModalProps> = ({ visible, onDismiss, waterGoal = 2000, onSuccess }) => {
  const triggerSaveModal = useAppStore((state) => state.triggerSaveModal);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const waterMut = useLogWater();

  const parsedAmount = useMemo(() => {
    const val = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    return isNaN(val) ? 0 : val;
  }, [amount]);

  const handleSave = () => {
    if (waterMut.isPending) return;
    const val = parsedAmount;
    if (val <= 0) {
      setError('Ingresa una cantidad válida');
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
  };

  useEffect(() => {
    if (visible) {
      setError('');
    }
  }, [visible]);

  useEffect(() => {
    if (visible && triggerSaveModal > 0) {
      handleSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerSaveModal]);

  const quickAdd = (ml: number) => {
    setAmount(String(ml));
    setError('');
  };

  const displayAmount = parsedAmount || 0;

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

      <TextInput
        mode="outlined"
        label="Cantidad personalizada (ml)"
        value={amount}
        onChangeText={(text) => { setAmount(text.replace(/[^0-9]/g, '')); setError(''); }}
        placeholder="Ej: 350"
        keyboardType="numeric"
        style={styles.input}
        outlineColor="rgba(255,255,255,0.2)"
        activeOutlineColor={CYBER_LIME}
        textColor="#FFFFFF"
        theme={{ colors: { onSurface: '#FFFFFF', onSurfaceVariant: 'rgba(255,255,255,0.6)' } }}
      />
      {error ? <HelperText type="error" visible style={{ color: '#FF4444' }}>{error}</HelperText> : null}
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
  input: {
    backgroundColor: 'transparent',
    marginTop: 8,
  },
});
