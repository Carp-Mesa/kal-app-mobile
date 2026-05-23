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
    tag: '01. EVOLUCIÓN',
    title: 'ESTACIÓN DE PODER',
    highlight: 'Toma el control absoluto de tu rendimiento físico y mental.',
    description: 'Centraliza tus entrenamientos, hábitos y descanso en un centro de mando unificado y ultra-rápido.',
    bullets: [
      { icon: 'view-dashboard-outline', text: 'Métricas integrales en tiempo real' },
      { icon: 'chart-timeline-variant', text: 'Historial de progreso visual sin fricciones' },
      { icon: 'brain', text: 'Seguimiento de la conexión cuerpo-mente' }
    ],
    icon: 'lightning-bolt',
  },
  {
    id: '2',
    tag: '02. RENDIMIENTO',
    title: 'PRECISIÓN TÉCNICA',
    highlight: 'Registra tus series y carga progresiva en menos de 10 segundos.',
    description: 'Diseñado por y para atletas que buscan optimizar cada repetición y cuantificar su esfuerzo de forma real.',
    bullets: [
      { icon: 'database-plus-outline', text: 'Registro instantáneo de peso y reps' },
      { icon: 'trending-up', text: 'Cálculo de sobrecarga progresiva eficiente' },
      { icon: 'timer-outline', text: 'Controlador inteligente de descansos' }
    ],
    icon: 'dumbbell',
  },
  {
    id: '3',
    tag: '03. VITALIDAD',
    title: 'COMBUSTIBLE Y REPOSO',
    highlight: 'Optimiza tu hidratación, nutrición y sueño diario.',
    description: 'El rendimiento real ocurre fuera del gimnasio. Monitorea las variables que garantizan tu recuperación de élite.',
    bullets: [
      { icon: 'water-outline', text: 'Monitoreo de hidratación inteligente' },
      { icon: 'food-apple-outline', text: 'Balance calórico y macronutrientes clave' },
      { icon: 'bed-double-outline', text: 'Calidad de sueño y ritmo circadiano' }
    ],
    icon: 'heart-pulse',
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
        <View style={styles.tagBadge}>
          <Text style={styles.tagText}>{item.tag}</Text>
        </View>
      </FadeInUp>

      <FadeInUp delay={200}>
        <View style={styles.iconRing}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name={item.icon as any} size={42} color={CYBER_LIME} />
          </View>
        </View>
      </FadeInUp>

      <FadeInUp delay={300}>
        <Text style={styles.title}>{item.title}</Text>
      </FadeInUp>

      <FadeInUp delay={400}>
        <Text style={styles.highlight}>{item.highlight}</Text>
      </FadeInUp>

      <FadeInUp delay={550}>
        <View style={styles.infoCard}>
          <Text style={styles.description}>{item.description}</Text>
          <View style={styles.divider} />
          <View style={styles.bulletList}>
            {item.bullets.map((bullet, idx) => (
              <View key={idx} style={styles.bulletItem}>
                <View style={styles.bulletIconWrapper}>
                  <MaterialCommunityIcons name={bullet.icon as any} size={18} color={CYBER_LIME} />
                </View>
                <Text style={styles.bulletText}>{bullet.text}</Text>
              </View>
            ))}
          </View>
        </View>
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
    paddingHorizontal: 24,
    paddingBottom: 170,
  },
  tagBadge: {
    borderWidth: 1,
    borderColor: CYBER_LIME,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 5,
    marginBottom: 20,
    backgroundColor: 'rgba(204, 255, 0, 0.05)',
  },
  tagText: {
    color: CYBER_LIME,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  iconRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: 'rgba(204, 255, 0, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(204, 255, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  highlight: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 10,
  },
  infoCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.2,
    borderRadius: 20,
    padding: 20,
    width: width - 48,
  },
  description: {
    color: '#B0B0B0',
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 18.5,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '100%',
    marginBottom: 16,
  },
  bulletList: {
    gap: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bulletIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(204, 255, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulletText: {
    color: '#E0E0E0',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
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
