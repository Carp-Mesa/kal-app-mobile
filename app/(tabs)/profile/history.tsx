import { getLocalDateString } from '@/src/store/types';
import { useNutritionStore } from '@/src/store/useNutritionStore';
import { useProfileStore } from '@/src/store/useProfileStore';
import { useWaterStore } from '@/src/store/useWaterStore';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  Card,
  Icon,
  ProgressBar,
  SegmentedButtons,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';

type SummaryRange = '7d' | '30d';

interface DailySummary {
  date: string;
  total_calories: number;
  total_water: number;
  calorie_goal: number;
  water_goal: number;
}

const RANGE_OPTIONS = [
  { value: '7d' as const, label: 'Última Semana' },
  { value: '30d' as const, label: 'Último Mes' },
];

const formatDate = (dateStr: string): string => {
  const [year, month, day] = dateStr.split('-');
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

const calcProgress = (current: number, goal: number): number => {
  if (goal <= 0) return 0;
  return Math.min(current / goal, 1);
};

const pct = (current: number, goal: number): string => {
  if (goal <= 0) return '0%';
  return `${Math.round((current / goal) * 100)}%`;
};

// ─── Daily Card ──────────────────────────────────────────────────────────────

interface DailyCardProps {
  item: DailySummary;
}

function DailyCard({ item }: DailyCardProps) {
  const theme = useTheme();
  const calProgress = calcProgress(item.total_calories, item.calorie_goal);
  const waterProgress = calcProgress(item.total_water, item.water_goal);

  return (
    <Card style={styles.card} mode="elevated">
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text
            variant="titleSmall"
            style={[styles.dateLabel, { color: theme.colors.onSurface }]}
          >
            {formatDate(item.date)}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {pct(item.total_calories, item.calorie_goal)} kcal
          </Text>
        </View>

        {/* ── Calories Progress ──────────────────────────────────── */}
        <View style={styles.progressRow}>
          <Icon source="fire" size={16} color="#FF6B35" />
          <View style={styles.progressContent}>
            <View style={styles.progressLabelRow}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Calorías
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.total_calories} / {item.calorie_goal} kcal
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
              <ProgressBar
                progress={calProgress}
                color="#FF6B35"
                style={styles.progressBar}
              />
            </View>
          </View>
        </View>

        {/* ── Water Progress ─────────────────────────────────────── */}
        <View style={styles.progressRow}>
          <Icon source="water" size={16} color="#0097A7" />
          <View style={styles.progressContent}>
            <View style={styles.progressLabelRow}>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Agua
              </Text>
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {item.total_water} / {item.water_goal} ml
              </Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceVariant }]}>
              <ProgressBar
                progress={waterProgress}
                color="#0097A7"
                style={styles.progressBar}
              />
            </View>
          </View>
        </View>
      </Card.Content>
    </Card>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function NutritionHistoryScreen() {
  const theme = useTheme();
  const [range, setRange] = useState<SummaryRange>('7d');
  const nutritionLogs = useNutritionStore((state) => state.logs);
  const waterLogs = useWaterStore((state) => state.logs);
  const profile = useProfileStore((state) => state.profile);

  const data = useMemo(() => {
    const days = range === '7d' ? 7 : 30;
    const dateList: string[] = [];
    const dateSet = new Set<string>();

    for (let i = 0; i < days; i += 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = getLocalDateString(d);
      dateList.push(dateStr);
      dateSet.add(dateStr);
    }

    const calorieGoal = profile?.calorie_goal ?? 2000;
    const waterGoal = profile?.water_goal ?? 2000;
    const byDate = new Map<string, DailySummary>();

    const ensure = (date: string) => {
      let entry = byDate.get(date);
      if (!entry) {
        entry = {
          date,
          total_calories: 0,
          total_water: 0,
          calorie_goal: calorieGoal,
          water_goal: waterGoal,
        };
        byDate.set(date, entry);
      }
      return entry;
    };

    for (const log of nutritionLogs) {
      const logDate = getLocalDateString(new Date(log.created_at));
      if (!dateSet.has(logDate)) continue;
      const entry = ensure(logDate);
      entry.total_calories += log.calories;
    }

    for (const log of waterLogs) {
      const logDate = getLocalDateString(new Date(log.created_at));
      if (!dateSet.has(logDate)) continue;
      const entry = ensure(logDate);
      entry.total_water += log.amount_ml;
    }

    return dateList
      .map((date) => byDate.get(date))
      .filter((entry): entry is DailySummary => !!entry && (entry.total_calories > 0 || entry.total_water > 0));
  }, [range, nutritionLogs, waterLogs, profile]);

  const totals = useMemo(() => {
    if (!data || data.length === 0) return null;
    const totalCal = data.reduce((sum, d) => sum + d.total_calories, 0);
    const totalWater = data.reduce((sum, d) => sum + d.total_water, 0);
    return { calories: totalCal, water: totalWater };
  }, [data]);

  // ── Empty ────────────────────────────────────────────────────────────────

  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <SegmentedButtons
          value={range}
          onValueChange={(v) => setRange(v as SummaryRange)}
          buttons={RANGE_OPTIONS}
          style={styles.segmented}
        />
        <View style={[styles.center, { flex: 1 }]}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>📊</Text>
          <Text variant="titleMedium" style={{ color: theme.colors.onBackground, marginBottom: 8 }}>
            Sin datos aún
          </Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
            Comienza a registrar tus comidas y agua para ver tu progreso aquí.
          </Text>
        </View>
      </View>
    );
  }

  // ── List ──────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SegmentedButtons
        value={range}
        onValueChange={(v) => setRange(v as SummaryRange)}
        buttons={RANGE_OPTIONS}
        style={styles.segmented}
      />

      {/* ── Summary Chips ──────────────────────────────────────── */}
      {totals && (
        <Surface style={[styles.summaryBar, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
          <View style={styles.summaryItem}>
            <Icon source="fire" size={16} color={theme.colors.onPrimaryContainer} />
            <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer, marginLeft: 4 }}>
              {totals.calories.toLocaleString()} kcal
            </Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: theme.colors.onPrimaryContainer }]} />
          <View style={styles.summaryItem}>
            <Icon source="water" size={16} color={theme.colors.onPrimaryContainer} />
            <Text variant="labelMedium" style={{ color: theme.colors.onPrimaryContainer, marginLeft: 4 }}>
              {(totals.water / 1000).toFixed(1)} L
            </Text>
          </View>
        </Surface>
      )}

      {/* ── List ──────────────────────────────────────────────── */}
      <FlatList
        data={data}
        keyExtractor={(item) => item.date}
        renderItem={({ item }) => <DailyCard item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  segmented: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
  },
  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 0,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    height: 16,
    marginHorizontal: 14,
    opacity: 0.3,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  card: {
    borderRadius: 16,
    marginBottom: 12,
  },
  cardContent: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateLabel: {
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  progressContent: {
    flex: 1,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
  },
  progressTrack: {
    borderRadius: 3,
    overflow: 'hidden',
  },
});
