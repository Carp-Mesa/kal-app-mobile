import React, { memo, useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

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
