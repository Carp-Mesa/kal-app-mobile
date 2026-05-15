import { useCallback } from 'react';
import { useSharedValue, useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';

export const useShake = () => {
  const offset = useSharedValue(0);

  const shake = useCallback(() => {
    offset.value = withSequence(
      withTiming(10, { duration: 60 }),
      withTiming(-10, { duration: 60 }),
      withTiming(6, { duration: 60 }),
      withTiming(-6, { duration: 60 }),
      withTiming(0, { duration: 60 })
    );
  }, [offset]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return { shake, animatedStyle };
};
