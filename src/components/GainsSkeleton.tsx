import React, { memo, useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const BASE_COLOR = '#1A1A1A';
const SHIMMER_COLOR = 'rgba(204, 255, 0, 0.08)';

interface GainsSkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export const GainsSkeleton: React.FC<GainsSkeletonProps> = memo(({
  width = '100%',
  height = 20,
  borderRadius = 20,
  style,
}) => {
  const shimmerPosition = useSharedValue(-1);

  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(2, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [shimmerPosition]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${(shimmerPosition.value - 0.5) * 200}%` }],
  }));

  return (
    <View
      style={[
        styles.container,
        { width: width as any, height: height as any, borderRadius },
        style,
      ]}
    >
      <View style={[styles.base, { borderRadius }]} />
      <Animated.View style={[styles.shimmer, shimmerStyle]}>
        <View style={[styles.shimmerCore, { borderRadius }]} />
      </Animated.View>
    </View>
  );
});

GainsSkeleton.displayName = 'GainsSkeleton';

// ─── Preset Layouts ───────────────────────────────────────────────────────────

export const DashboardSkeleton: React.FC = memo(() => {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
      {/* Row: Agua + Nutrición */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <View style={{ flex: 1, gap: 12 }}>
          <GainsSkeleton width="100%" height={190} borderRadius={16} />
        </View>
        <View style={{ flex: 1, gap: 12 }}>
          <GainsSkeleton width="100%" height={190} borderRadius={16} />
        </View>
      </View>

      {/* Workout card */}
      <GainsSkeleton width="100%" height={140} borderRadius={16} style={{ marginBottom: 16 }} />

      {/* Sleep card */}
      <GainsSkeleton width="100%" height={220} borderRadius={16} style={{ marginBottom: 16 }} />
    </View>
  );
});

DashboardSkeleton.displayName = 'DashboardSkeleton';

export const WorkoutCardSkeleton: React.FC = memo(() => {
  return (
    <View
      style={{
        backgroundColor: BASE_COLOR,
        borderColor: 'rgba(255,255,255,0.15)',
        borderWidth: 1.5,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        marginHorizontal: 16,
        overflow: 'hidden',
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <GainsSkeleton width="70%" height={18} borderRadius={8} />
          <GainsSkeleton width="40%" height={14} borderRadius={6} />
        </View>
        <GainsSkeleton width={60} height={24} borderRadius={8} />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <GainsSkeleton width={80} height={20} borderRadius={8} />
        <GainsSkeleton width={80} height={20} borderRadius={8} />
      </View>
    </View>
  );
});

WorkoutCardSkeleton.displayName = 'WorkoutCardSkeleton';

const SessionCardSkeleton: React.FC<{ style?: ViewStyle }> = memo(({ style }) => {
  return (
    <View
      style={[
        {
          backgroundColor: BASE_COLOR,
          borderColor: 'rgba(255,255,255,0.15)',
          borderWidth: 1.5,
          borderRadius: 16,
          padding: 16,
          gap: 12,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <GainsSkeleton width="80%" height={14} borderRadius={8} />
      <GainsSkeleton width="60%" height={18} borderRadius={8} />
    </View>
  );
});

SessionCardSkeleton.displayName = 'SessionCardSkeleton';

export const ProgressSkeleton: React.FC = memo(() => {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
      {/* Searchbar placeholder */}
      <GainsSkeleton width="100%" height={48} borderRadius={16} style={{ marginBottom: 16 }} />

      {/* Top cards row */}
      <View style={{ flexDirection: 'row', gap: 16, marginBottom: 24 }}>
        <SessionCardSkeleton style={{ flex: 1 }} />
        <SessionCardSkeleton style={{ flex: 1 }} />
      </View>

      {/* Chart placeholder */}
      <GainsSkeleton
        width="100%"
        height={260}
        borderRadius={20}
        style={{ marginBottom: 24, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' }}
      />

      {/* Historic list header */}
      <GainsSkeleton width={140} height={20} borderRadius={8} style={{ marginBottom: 16 }} />
      <View style={{ gap: 12 }}>
        <SessionCardSkeleton />
        <SessionCardSkeleton />
      </View>
    </View>
  );
});

ProgressSkeleton.displayName = 'ProgressSkeleton';

// ─── Fade-in Wrapper ──────────────────────────────────────────────────────────

export const FadeIn: React.FC<{ children: React.ReactNode; style?: ViewStyle }> = memo(({
  children,
  style,
}) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 300 });
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
});

FadeIn.displayName = 'FadeIn';

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: BASE_COLOR,
  },
  base: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BASE_COLOR,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '40%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shimmerCore: {
    width: '100%',
    height: '100%',
    backgroundColor: SHIMMER_COLOR,
  },
});
