import { useAppStore } from '@/src/store/useAppStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const CYBER_LIME = '#CCFF00';

const SLIDES = [
  {
    id: '1',
    title: 'ESTACIÓN DE PODER',
    subtitle: 'Toma el control total de tu rendimiento físico y mental en un solo lugar.',
    icon: 'lightning-bolt',
  },
  {
    id: '2',
    title: 'PRECISIÓN TÉCNICA',
    subtitle: 'Registra tus series y carga progresiva en menos de 10 segundos.',
    icon: 'dumbbell',
  },
  {
    id: '3',
    title: 'COMBUSTIBLE Y REPOSO',
    subtitle: 'Optimiza tu hidratación, nutrición y sueño para una recuperación de élite.',
    icon: 'water',
  },
];

// ─── FadeInUp Component ──────────────────────────────────────────────────────

const FadeInUp = ({
  children,
  delay = 0,
  duration = 600,
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
}) => {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  React.useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
    translateY.value = withDelay(delay, withTiming(0, { duration, easing: Easing.out(Easing.cubic) }));
  }, [delay, duration, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
};

// ─── Slide Item ──────────────────────────────────────────────────────────────

const Slide = ({ item }: { item: typeof SLIDES[0] }) => {
  return (
    <View style={styles.slide}>
      <FadeInUp delay={100}>
        <View style={styles.iconRing}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name={item.icon as any} size={72} color={CYBER_LIME} />
          </View>
        </View>
      </FadeInUp>

      <FadeInUp delay={250}>
        <Text style={styles.title}>{item.title}</Text>
      </FadeInUp>

      <FadeInUp delay={400}>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </FadeInUp>
    </View>
  );
};

// ─── Pagination Dots ─────────────────────────────────────────────────────────

const Pagination = ({ currentIndex }: { currentIndex: number }) => {
  return (
    <View style={styles.pagination}>
      {SLIDES.map((_, index) => {
        const isActive = currentIndex === index;
        return (
          <View
            key={index}
            style={[
              styles.indicator,
              isActive && styles.activeIndicator,
            ]}
          />
        );
      })}
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const { completeOnboarding } = useAppStore();

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentIndex(Math.round(index));
  }, []);

  const complete = () => {
    completeOnboarding();
    router.replace('/(auth)/login');
  };

  const nextSlide = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      complete();
    }
  };

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onMomentumScrollEnd={handleScroll}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Slide item={item} />}
      />

      <View style={styles.footer}>
        <Pagination currentIndex={currentIndex} />

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={nextSlide}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {isLast ? 'INICIAR EXPERIENCIA' : 'Siguiente'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  slide: {
    width,
    height,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 180,
  },
  iconRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1.5,
    borderColor: 'rgba(204, 255, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(204, 255, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: '#A0A0A0',
    fontSize: 15,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  activeIndicator: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: CYBER_LIME,
  },
  button: {
    backgroundColor: CYBER_LIME,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
