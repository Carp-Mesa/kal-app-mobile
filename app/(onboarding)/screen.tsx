import { useAppStore } from '@/src/store/useAppStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, NativeScrollEvent, NativeSyntheticEvent, StyleSheet, View } from 'react-native';
import { Button, Surface, Text } from 'react-native-paper';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    title: 'Simplicidad Extrema',
    subtitle: 'Registra tus métricas de alto rendimiento en menos de 10 segundos diarios.',
    icon: 'lightning-bolt',
  },
  {
    id: '2',
    title: 'Mide lo que Importa',
    subtitle: 'Agua, Nutrición, Entrenamiento y Sueño. Nada más, nada menos.',
    icon: 'chart-box',
  },
  {
    id: '3',
    title: 'Gains Station',
    subtitle: 'Elige tu nivel de compromiso con tu salud y comienza tu nueva vida.',
    icon: 'rocket-launch',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const { completeOnboarding } = useAppStore();

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    setCurrentIndex(Math.round(index));
  };

  const complete = () => {
    completeOnboarding();
    router.replace('/(auth)/login');
  };

  const nextSlide = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      complete();
    }
  };

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
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <Surface style={styles.iconContainer} elevation={4}>
              <MaterialCommunityIcons name={item.icon as any} size={80} color="#000" />
            </Surface>
            <Text variant="displaySmall" style={styles.title}>
              {item.title}
            </Text>
            <Text variant="titleMedium" style={styles.subtitle}>
              {item.subtitle}
            </Text>
          </View>
        )}
      />
      <View style={styles.footer}>
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                currentIndex === index ? styles.activeIndicator : null,
              ]}
            />
          ))}
        </View>
        <Button
          mode="contained"
          onPress={nextSlide}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          {currentIndex === SLIDES.length - 1 ? 'Empezar mi transformación' : 'Siguiente'}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    textAlign: 'center',
    color: '#666',
    paddingHorizontal: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
  },
  indicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ccc',
    marginHorizontal: 5,
  },
  activeIndicator: {
    width: 20,
    backgroundColor: '#000',
  },
  button: {
    borderRadius: 30,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
