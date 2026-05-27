import { WheelPicker } from '@/src/components/WheelPicker';
import { getLocalDateString } from '@/src/store/types';
import { useLogSleep } from '@/src/hooks/useLogs';
import { useShake } from '@/src/hooks/useShake';
import { useAppStore } from '@/src/store/useAppStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { HelperText, Text } from 'react-native-paper';
import Animated from 'react-native-reanimated';
import { CyberModal } from './CyberModal';

const CYBER_LIME = '#CCFF00';
const ERROR_RED = '#FF4444';
const MINUTES_IN_DAY = 1440;

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const PERIODS = ['AM', 'PM'];

const QUALITY_ICONS = [
  { name: 'emoticon-dead-outline' as const, label: '1' },
  { name: 'emoticon-sad-outline' as const, label: '2' },
  { name: 'emoticon-neutral-outline' as const, label: '3' },
  { name: 'emoticon-happy-outline' as const, label: '4' },
  { name: 'emoticon-excited-outline' as const, label: '5' },
] as const;

// ─── Math Helpers (Infallible) ──────────────────────────────────────────────

function getMinutesFromMidnight(hour: number, minutes: number, period: 'AM' | 'PM'): number {
  let h = hour;
  if (period === 'PM' && h < 12) {
    h += 12;
  }
  if (period === 'AM' && h === 12) {
    h = 0;
  }
  return h * 60 + minutes;
}

function from24h(h: number, m: number) {
  const periodIndex = h >= 12 ? 1 : 0;
  let hour12 = h % 12;
  if (hour12 === 0) hour12 = 12;
  return { hourIndex: hour12 - 1, minuteIndex: m, periodIndex };
}

function calculateDuration(startMinutes: number, endMinutes: number): number {
  let diff = endMinutes - startMinutes;
  if (diff === 0) {
    return 0;
  }
  if (diff < 0) {
    diff += MINUTES_IN_DAY;
  }
  return diff;
}

function formatDuration(totalMinutes: number): string {
  if (totalMinutes === 0 || totalMinutes === MINUTES_IN_DAY) {
    return '0h 0m';
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface TimeState {
  hourIndex: number;
  minuteIndex: number;
  periodIndex: number;
}

interface SleepModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSuccess?: () => void;
}

// ─── Memoized TimeBlock ─────────────────────────────────────────────────────

const TimeBlock = memo(({
  label,
  state,
  onChange,
}: {
  label: string;
  state: TimeState;
  onChange: (updater: (prev: TimeState) => TimeState) => void;
}) => {
  const onHourChange = useCallback((idx: number) => {
    onChange((prev) => ({ ...prev, hourIndex: idx }));
  }, [onChange]);

  const onMinuteChange = useCallback((idx: number) => {
    onChange((prev) => ({ ...prev, minuteIndex: idx }));
  }, [onChange]);

  const onPeriodChange = useCallback((idx: number) => {
    onChange((prev) => ({ ...prev, periodIndex: idx }));
  }, [onChange]);

  return (
    <View style={timeBlockStyles.container}>
      <Text style={timeBlockStyles.label}>{label}</Text>
      <View style={timeBlockStyles.wheelsRow}>
        <WheelPicker
          data={HOURS}
          selectedIndex={state.hourIndex}
          onChange={onHourChange}
          width={58}
        />
        <Text style={timeBlockStyles.colon}>:</Text>
        <WheelPicker
          data={MINUTES}
          selectedIndex={state.minuteIndex}
          onChange={onMinuteChange}
          width={58}
        />
        <WheelPicker
          data={PERIODS}
          selectedIndex={state.periodIndex}
          onChange={onPeriodChange}
          width={64}
        />
      </View>
    </View>
  );
});

TimeBlock.displayName = 'TimeBlock';

// ─── Main Component ───────────────────────────────────────────────────────────

export const SleepModal: React.FC<SleepModalProps> = ({ visible, onDismiss, onSuccess }) => {
  const triggerSaveModal = useAppStore((state) => state.triggerSaveModal);
  const setModalValidationError = useAppStore((state) => state.setModalValidationError);
  const sleepMut = useLogSleep();
  const { shake, animatedStyle } = useShake();

  const [start, setStart] = useState<TimeState>(() => from24h(22, 0));
  const [end, setEnd] = useState<TimeState>(() => from24h(6, 0));
  const [qualityScore, setQualityScore] = useState(3);
  const [error, setError] = useState('');

  // ── Instant duration (synchronous, no debounce) ───────────────────────────
  const durationDisplay = useMemo(() => {
    const startHour = parseInt(String(start.hourIndex + 1), 10);
    const startMinute = parseInt(String(start.minuteIndex), 10);
    const startPeriod = PERIODS[start.periodIndex] as 'AM' | 'PM';

    const endHour = parseInt(String(end.hourIndex + 1), 10);
    const endMinute = parseInt(String(end.minuteIndex), 10);
    const endPeriod = PERIODS[end.periodIndex] as 'AM' | 'PM';

    const startMinutes = getMinutesFromMidnight(startHour, startMinute, startPeriod);
    const endMinutes = getMinutesFromMidnight(endHour, endMinute, endPeriod);

    const total = calculateDuration(startMinutes, endMinutes);
    return formatDuration(total);
  }, [start, end]);

  const totalMinutes = useMemo(() => {
    const startHour = parseInt(String(start.hourIndex + 1), 10);
    const startMinute = parseInt(String(start.minuteIndex), 10);
    const startPeriod = PERIODS[start.periodIndex] as 'AM' | 'PM';

    const endHour = parseInt(String(end.hourIndex + 1), 10);
    const endMinute = parseInt(String(end.minuteIndex), 10);
    const endPeriod = PERIODS[end.periodIndex] as 'AM' | 'PM';

    const startMinutes = getMinutesFromMidnight(startHour, startMinute, startPeriod);
    const endMinutes = getMinutesFromMidnight(endHour, endMinute, endPeriod);

    return calculateDuration(startMinutes, endMinutes);
  }, [start, end]);

  const isInvalid = totalMinutes === 0;

  useEffect(() => {
    setModalValidationError(isInvalid);
  }, [isInvalid, setModalValidationError]);

  // ── Guard ref to prevent double-fire ─────────────────────────────────────
  const isSavingRef = useRef(false);

  const handleSave = useCallback(() => {
    if (sleepMut.isPending || isSavingRef.current) return;

    const startHour = parseInt(String(start.hourIndex + 1), 10);
    const startMinute = parseInt(String(start.minuteIndex), 10);
    const startPeriod = PERIODS[start.periodIndex] as 'AM' | 'PM';

    const endHour = parseInt(String(end.hourIndex + 1), 10);
    const endMinute = parseInt(String(end.minuteIndex), 10);
    const endPeriod = PERIODS[end.periodIndex] as 'AM' | 'PM';

    const startMinutes = getMinutesFromMidnight(startHour, startMinute, startPeriod);
    const endMinutes = getMinutesFromMidnight(endHour, endMinute, endPeriod);

    const total = calculateDuration(startMinutes, endMinutes);

    if (total === 0) {
      setError('La duración del sueño no puede ser cero.');
      shake();
      return;
    }
    if (total > MINUTES_IN_DAY) {
      setError('El sueño no puede exceder las 24 horas.');
      shake();
      return;
    }

    setError('');
    isSavingRef.current = true;

    // Compute start and end Date objects from the picker values.
    // The user picks clock times (e.g., 10PM start → 6AM end).
    // We anchor both to the CURRENT date, then shift startDate back one day
    // if start >= end (meaning the sleep span crossed midnight).
    //
    // CRITICAL: use getLocalDateString() for the `date` field to avoid UTC
    // timezone shifts that corrupt the date. The `date` represents the LOCAL
    // calendar date the sleep belongs to (the wake-up date).
    const now = new Date();
    const startH = Math.floor(startMinutes / 60);
    const startM = startMinutes % 60;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;

    const endDate = new Date(now);
    endDate.setHours(endH, endM, 0, 0);
    const startDate = new Date(now);
    startDate.setHours(startH, startM, 0, 0);
    if (startDate >= endDate) startDate.setDate(startDate.getDate() - 1);

    sleepMut.mutate({
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      date: getLocalDateString(endDate),
      quality_score: qualityScore,
    }, {
      onSuccess: () => {
        setStart(from24h(22, 0));
        setEnd(from24h(6, 0));
        setQualityScore(3);
        setError('');
        onSuccess?.();
        onDismiss();
        isSavingRef.current = false;
      },
      onError: () => {
        setError('Error al registrar el sueño.');
        isSavingRef.current = false;
      },
    });
  }, [sleepMut, start, end, qualityScore, onSuccess, onDismiss, shake]);

  // Keep a stable ref to the latest handleSave to avoid re-triggering the
  // save effect when the callback identity changes (which happens after
  // form state resets in the success callback).
  const handleSaveRef = useRef(handleSave);
  useLayoutEffect(() => {
    handleSaveRef.current = handleSave;
  }, [handleSave]);

  const lastTriggerRef = useRef(0);

  useEffect(() => {
    if (visible) {
      setError('');
      isSavingRef.current = false;
      lastTriggerRef.current = triggerSaveModal;
    }
  }, [visible]);

  // Listen for external save triggers (from the central ✓ button).
  // IMPORTANT: we use handleSaveRef instead of handleSave to avoid
  // the effect re-running when handleSave's identity changes after
  // the form resets, which was causing a phantom second POST.
  useEffect(() => {
    if (visible && triggerSaveModal > lastTriggerRef.current) {
      lastTriggerRef.current = triggerSaveModal;
      handleSaveRef.current();
    }
  }, [triggerSaveModal, visible]);

  const handleQualityPress = useCallback((score: number) => {
    setQualityScore(score);
    setError('');
  }, []);

  const durationBorderColor = isInvalid ? ERROR_RED : 'transparent';

  return (
    <CyberModal visible={visible} onDismiss={onDismiss} title="Registro de Sueño">
      <View style={styles.container}>
        <TimeBlock
          label="Hora de acostarse"
          state={start}
          onChange={setStart}
        />

        <View style={styles.divider} />

        <TimeBlock
          label="Hora de despertar"
          state={end}
          onChange={setEnd}
        />

        <Animated.View style={[animatedStyle]}>
          <View style={[styles.durationContainer, { borderColor: durationBorderColor, borderWidth: 1.5 }]}>
            <Text style={styles.durationLabel}>TOTAL RECUPERACIÓN</Text>
            <Text style={[styles.durationValue, isInvalid && { color: ERROR_RED }]}>
              {durationDisplay}
            </Text>
          </View>
        </Animated.View>

        <Text style={styles.sectionLabel}>¿Cómo te sentiste?</Text>
        <View style={styles.chipsRow}>
          {QUALITY_ICONS.map((item, index) => {
            const score = index + 1;
            const active = qualityScore === score;
            return (
              <Pressable
                key={score}
                onPress={() => handleQualityPress(score)}
                style={[
                  styles.chip,
                  active && styles.chipActive,
                ]}
              >
                <MaterialCommunityIcons
                  name={item.name}
                  size={22}
                  color={active ? CYBER_LIME : 'rgba(255,255,255,0.5)'}
                />
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {error ? (
          <HelperText type="error" visible style={styles.errorText}>
            {error}
          </HelperText>
        ) : null}
      </View>
    </CyberModal>
  );
};

// ─── Local Styles for TimeBlock ─────────────────────────────────────────────

const timeBlockStyles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  label: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
    marginLeft: 4,
  },
  wheelsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  colon: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 20,
    fontWeight: '700',
    marginHorizontal: 2,
  },
});

// ─── Main Styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingTop: 0,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 8,
  },
  durationContainer: {
    alignItems: 'center',
    marginVertical: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  durationLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  durationValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  chipsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chip: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  chipActive: {
    borderColor: CYBER_LIME,
    backgroundColor: 'rgba(204,255,0,0.15)',
  },
  chipLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  chipLabelActive: {
    color: CYBER_LIME,
  },
  errorText: {
    color: '#FF4444',
    marginTop: 8,
  },
});
