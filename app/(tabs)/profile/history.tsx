import { useNutritionHistory } from '@/src/hooks/useNutritionHistory';
import { DailySummary, SummaryRange } from '@/src/services/historyService';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import {
  ActivityIndicator,
  Button,
  Card,
  Icon,
  ProgressBar,
  SegmentedButtons,
  Surface,
  Text,
  useTheme,
} from 'react-native-paper';

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

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <View style={[styles.card, styles.skeletonCard]}>
      <View style={[styles.skeletonLine, { width: '40%', marginBottom: 12 }]} />
      <View style={[styles.skeletonLine, { width: '100%', marginBottom: 10 }]} />
      <View style={[styles.skeletonLine, { width: '100%' }]} />
    </View>
  );
}

function SkeletonList() {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function NutritionHistoryScreen() {
  const theme = useTheme();
  const [range, setRange] = useState<SummaryRange>('7d');
  const { data, isLoading, isError, refetch, isFetching } = useNutritionHistory(range);

  const totals = useMemo(() => {
    if (!data || data.length === 0) return null;
    const totalCal = data.reduce((sum, d) => sum + d.total_calories, 0);
    const totalWater = data.reduce((sum, d) => sum + d.total_water, 0);
    return { calories: totalCal, water: totalWater };
  }, [data]);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator animating size="large" color={theme.colors.primary} />
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginTop: 12 }}>
          Cargando historial…
        </Text>
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
        <Text variant="titleMedium" style={{ color: theme.colors.error, marginBottom: 12 }}>
          Error al cargar el historial
        </Text>
        <Button mode="contained" onPress={() => refetch()} icon="refresh">
          Reintentar
        </Button>
      </View>
    );
  }

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

      {/* ── Refetch indicator ─────────────────────────────────── */}
      {isFetching && (
        <ActivityIndicator
          animating
          size="small"
          color={theme.colors.primary}
          style={styles.refetchIndicator}
        />
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
  refetchIndicator: {
    marginTop: 8,
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
  skeletonCard: {
    backgroundColor: '#E8E8EE',
    padding: 16,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#D0D0DD',
    borderRadius: 6,
  },
});
