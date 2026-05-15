import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';

const SHIMMER_COLOR = 'rgba(204, 255, 0, 0.07)';
const BASE_COLOR = '#1A1A1A';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export const SkeletonShimmer: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 12,
  style,
}) => {
  const shimmerPosition = useSharedValue(-100);

  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(100, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [shimmerPosition]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${shimmerPosition.value}%` }],
  }));

  return (
    <View style={[styles.container, { width: width as any, height: height as any, borderRadius }, style]}>
      <View style={[styles.base, { borderRadius }]} />
      <Animated.View style={[styles.shimmerStrip, shimmerStyle]} />
    </View>
  );
};

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
  shimmerStrip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: '40%',
    backgroundColor: SHIMMER_COLOR,
  },
});
