import { useWeeklyStats } from '@/src/hooks/useWeeklyStats';
import React, { useMemo } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { ActivityIndicator, Card, Text, useTheme } from 'react-native-paper';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_WIDTH = Dimensions.get('window').width;
// Account for horizontal padding in the parent ScrollView (16*2) + Card padding (16*2)
const CHART_WIDTH = SCREEN_WIDTH - 64;

const DAY_LABELS = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generates the last 7 days as 'YYYY-MM-DD' strings (oldest first).
 */
const getLast7Days = (): string[] => {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
};

/**
 * Returns the short day-of-week label (D/L/M/X/J/V/S) for a 'YYYY-MM-DD' date.
 */
const getDayLabel = (dateStr: string): string => {
  const d = new Date(dateStr + 'T12:00:00'); // noon to avoid TZ edge cases
  return DAY_LABELS[d.getDay()];
};

// ─── Sub-components ──────────────────────────────────────────────────────────

const ChartPlaceholder = () => {
  const theme = useTheme();
  return (
    <View style={[styles.placeholder, { borderColor: theme.colors.outlineVariant }]}>
      <Text style={styles.placeholderEmoji}>📊</Text>
      <Text variant="titleSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
        Sin suficientes datos aún
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.outline, textAlign: 'center', marginTop: 4 }}>
        Registra al menos 2 días de comidas para ver tu progreso semanal.
      </Text>
    </View>
  );
};

const ChartSkeleton = () => {
  const theme = useTheme();
  return (
    <View style={[styles.skeleton, { backgroundColor: theme.colors.surfaceVariant }]}>
      <ActivityIndicator size="small" />
    </View>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const WeeklyProgressChart = () => {
  const theme = useTheme();
  const { data, isLoading, isError } = useWeeklyStats();

  // Build a complete 7-day dataset filling missing days with 0
  const chartData = useMemo(() => {
    const last7 = getLast7Days();
    const statsMap: Record<string, number> = {};

    data?.daily_stats?.forEach((s) => {
      statsMap[s.date] = s.total_calories;
    });

    const values = last7.map((d) => statsMap[d] ?? 0);
    const labels = last7.map(getDayLabel);
    const goal = data?.calorie_goal ?? 2000;
    const hasEnoughData = values.filter((v) => v > 0).length >= 2;

    return { values, labels, goal, hasEnoughData };
  }, [data]);

  // ── Chart config ──────────────────────────────────────────────────────────

  const chartConfig = {
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: theme.colors.surface,
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(0, 97, 255, ${opacity})`,   // primary #0061FF
    labelColor: () => theme.colors.onSurfaceVariant,
    barPercentage: 0.55,
    decimalPlaces: 0,
    propsForLabels: {
      fontSize: 11,
      fontWeight: '600',
    },
    propsForBackgroundLines: {
      strokeDasharray: '4',
      strokeWidth: 1,
      stroke: theme.colors.outlineVariant,
    },
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} mode="elevated">
      <Card.Content style={styles.cardContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text
              variant="titleMedium"
              style={{ color: theme.colors.onSurface, fontWeight: '700' }}
            >
              📈 Calorías — Última semana
            </Text>
            {data?.calorie_goal ? (
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                Meta diaria: {data.calorie_goal.toLocaleString()} kcal
              </Text>
            ) : null}
          </View>
        </View>

        {/* Chart area */}
        {isLoading ? (
          <ChartSkeleton />
        ) : isError || !chartData.hasEnoughData ? (
          <ChartPlaceholder />
        ) : (
          <View style={styles.chartWrapper}>
            <BarChart
              data={{
                labels: chartData.labels,
                datasets: [{ data: chartData.values }],
              }}
              width={CHART_WIDTH}
              height={180}
              chartConfig={chartConfig}
              style={styles.chart}
              fromZero
              showValuesOnTopOfBars
              withInnerLines
              flatColor
              yAxisLabel=""
              yAxisSuffix=""
            />

            {/* Goal reference line overlay */}
            <GoalLine
              goal={chartData.goal}
              maxValue={Math.max(...chartData.values, chartData.goal)}
              chartHeight={180}
              chartWidth={CHART_WIDTH}
              color={theme.colors.tertiary}
            />
          </View>
        )}

        {/* Legend */}
        {!isLoading && !isError && chartData.hasEnoughData && (
          <View style={styles.legend}>
            <LegendItem color={theme.colors.primary} label="Consumido" />
            <LegendItem color={theme.colors.tertiary} label="Meta" dotted />
          </View>
        )}
      </Card.Content>
    </Card>
  );
};

// ─── Goal Line Overlay ────────────────────────────────────────────────────────

interface GoalLineProps {
  goal: number;
  maxValue: number;
  chartHeight: number;
  chartWidth: number;
  color: string;
}

/**
 * Renders a horizontal dashed line at the goal calorie level.
 * chart-kit's internal padding: ~54px top, ~28px bottom for labels.
 */
const GoalLine = ({ goal, maxValue, chartHeight, chartWidth, color }: GoalLineProps) => {
  const TOP_PADDING = 54;
  const BOTTOM_PADDING = 28;
  const plotHeight = chartHeight - TOP_PADDING - BOTTOM_PADDING;
  const ratio = maxValue > 0 ? goal / maxValue : 0;
  const topOffset = TOP_PADDING + plotHeight * (1 - ratio);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.goalLine,
        {
          top: topOffset,
          width: chartWidth - 48, // inner chart width accounting for y-axis labels
          borderColor: color,
          left: 48,
        },
      ]}
    />
  );
};

// ─── Legend Item ──────────────────────────────────────────────────────────────

interface LegendItemProps {
  color: string;
  label: string;
  dotted?: boolean;
}

const LegendItem = ({ color, label, dotted }: LegendItemProps) => (
  <View style={styles.legendItem}>
    <View
      style={[
        styles.legendDot,
        {
          backgroundColor: dotted ? 'transparent' : color,
          borderWidth: dotted ? 2 : 0,
          borderColor: color,
          borderStyle: dotted ? 'dashed' : 'solid',
        },
      ]}
    />
    <Text variant="bodySmall" style={{ color, fontWeight: '600', marginLeft: 4 }}>
      {label}
    </Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginHorizontal: 0,
    marginBottom: 16,
    elevation: 2,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  chartWrapper: {
    position: 'relative',
  },
  chart: {
    borderRadius: 12,
    marginLeft: -16, // compensate Card.Content padding so chart aligns edge to edge
  },
  goalLine: {
    position: 'absolute',
    height: 0,
    borderWidth: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  placeholder: {
    height: 140,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 4,
  },
  placeholderEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  skeleton: {
    height: 140,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

export default WeeklyProgressChart;
