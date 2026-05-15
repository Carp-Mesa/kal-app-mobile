import { useAppStore } from '@/src/store/useAppStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, router, useSegments } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Portal, useTheme } from 'react-native-paper';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const TARGET_POSITIONS = [
  { x: -125, y: -30 }, // SUEÑO
  { x: -55, y: -115 }, // COMIDA
  { x: 55,  y: -115 }, // AGUA
  { x: 125,  y: -30 }, // GYM
];

const ActionCard = ({ icon, label, onPress, index, theme, isOpen }: any) => {
  const target = TARGET_POSITIONS[index];
  const progress = useSharedValue(0);

  useEffect(() => {
    if (isOpen) {
      progress.value = withTiming(1, { duration: 100, easing: Easing.out(Easing.quad) });
    } else {
      progress.value = 0;
    }
  }, [isOpen]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateX: target.x },
      { translateY: target.y },
      { scale: 0.8 + (progress.value * 0.2) },
    ],
  }));

  return (
    <Animated.View style={[styles.radialItem, animatedStyle]} pointerEvents={isOpen ? 'auto' : 'none'}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.actionCircle,
          {
            backgroundColor: theme.dark ? '#000000' : '#FFFFFF',
            borderColor: theme.colors.primary,
            shadowColor: theme.colors.primary,
            transform: [{ scale: pressed ? 0.9 : 1 }]
          }
        ]}
      >
        <MaterialCommunityIcons name={icon} size={26} color={theme.colors.primary} />
      </Pressable>
      <Text style={[styles.actionLabel, { color: theme.colors.onSurface }]}>{label}</Text>
    </Animated.View>
  );
};

const ActionMenuOverlay = ({ visible, onClose, theme, setModalVisible }: any) => {
  const bgOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      bgOpacity.value = withTiming(1, { duration: 100, easing: Easing.out(Easing.quad) });
    } else {
      bgOpacity.value = 0;
    }
  }, [visible]);

  const bgStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 100, elevation: 10 }]} pointerEvents={visible ? 'box-none' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)' }, bgStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <View style={styles.radialContainer} pointerEvents={visible ? 'box-none' : 'none'}>
        <ActionCard isOpen={visible} index={0} icon="bed" label="SUEÑO" theme={theme} onPress={() => { onClose(); setModalVisible('sleep'); }} />
        <ActionCard isOpen={visible} index={1} icon="food-apple" label="COMIDA" theme={theme} onPress={() => { onClose(); setModalVisible('nutrition'); }} />
        <ActionCard isOpen={visible} index={2} icon="cup-water" label="AGUA" theme={theme} onPress={() => { onClose(); setModalVisible('water'); }} />
        <ActionCard isOpen={visible} index={3} icon="dumbbell" label="GYM" theme={theme} onPress={() => { onClose(); router.push('/(tabs)/workout/new'); }} />
      </View>
    </View>
  );
};

const AbsoluteMainButton = ({ onPress, isMenuVisible, isWorkoutNew, isModalVisible }: any) => {
  const theme = useTheme();
  const requestSaveWorkout = useAppStore(state => state.requestSaveWorkout);
  const requestSaveModal = useAppStore(state => state.requestSaveModal);
  const setModalVisible = useAppStore(state => state.setModalVisible);
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(isMenuVisible ? 1 : 0, { 
      duration: 150, 
      easing: Easing.out(Easing.quad) 
    });
  }, [isMenuVisible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 135}deg` }],
  }));

  const handlePress = () => {
    if (isWorkoutNew) {
      requestSaveWorkout();
    } else if (isModalVisible) {
      requestSaveModal();
    } else {
      onPress();
    }
  };

  return (
    <View style={styles.absoluteMainButtonWrapper} pointerEvents="box-none">
      <Pressable onPress={handlePress}>
        {isWorkoutNew ? (
          <View style={[styles.mainButton, styles.mainButtonSave]}>
            <MaterialCommunityIcons name="content-save-outline" size={28} color="#000000" />
          </View>
        ) : isModalVisible ? (
          <View style={[styles.mainButton, styles.mainButtonSave, styles.mainButtonGlow]}>
            <MaterialCommunityIcons name="check" size={32} color="#000000" />
          </View>
        ) : (
          <Animated.View style={[styles.mainButton, { backgroundColor: theme.colors.primary }, animatedStyle]}>
            <MaterialCommunityIcons name="plus" size={32} color={theme.colors.background} />
          </Animated.View>
        )}
      </Pressable>
    </View>
  );
};

export default function TabLayout() {
  const theme = useTheme();
  const setModalVisible = useAppStore(state => state.setModalVisible);
  const modalVisible = useAppStore(state => state.modalVisible);
  const [menuVisible, setMenuVisible] = useState(false);

  const isModalVisible = modalVisible !== 'none';

  const segments = useSegments();
  const isWorkoutNew = segments[segments.length - 2] === 'workout' && segments[segments.length - 1] === 'new';

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.outline,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopWidth: 0,
            elevation: 8,
            shadowOpacity: 0.08,
            height: 64,
            paddingBottom: 8,
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Inicio',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="home-variant" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="workout"
          options={{
            title: 'Entrenos',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="dumbbell" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="action"
          options={{
            title: '',
            tabBarIcon: () => null,
            tabBarButton: () => <View style={{ width: 60, marginHorizontal: 10 }} />, // Simple spacer in the TabBar
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault(); // Prevent navigating to dummy screen
            },
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progreso',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="chart-timeline-variant" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Perfil',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="account" color={color} size={size} />
            ),
          }}
        />
      </Tabs>

      <ActionMenuOverlay
        visible={menuVisible && !isModalVisible}
        onClose={() => setMenuVisible(false)}
        theme={theme}
        setModalVisible={setModalVisible}
      />

      <Portal>
        <AbsoluteMainButton 
          isMenuVisible={menuVisible && !isModalVisible}
          isWorkoutNew={isWorkoutNew}
          isModalVisible={isModalVisible}
          onPress={() => {
            if (!isModalVisible) {
              setMenuVisible(!menuVisible);
            }
          }}
        />
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  absoluteMainButtonWrapper: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  mainButtonSave: {
    backgroundColor: '#CCFF00',
  },
  mainButtonGlow: {
    shadowColor: '#CCFF00',
    shadowOpacity: 0.95,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 24,
  },
  radialContainer: {
    position: 'absolute',
    bottom: 45, // Anchored around where the central button is
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialItem: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  actionLabel: {
    marginTop: 6,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    position: 'absolute',
    top: 58,
    textAlign: 'center',
    width: 80,
  },
});