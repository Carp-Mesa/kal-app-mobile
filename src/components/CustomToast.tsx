import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CustomToastProps {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  onDismiss: () => void;
  duration?: number;
}

const CYBER = '#CCFF00';
const CARD_BG = '#1A1A1A';
const SILVER = '#888888';
const WHITE = '#FFFFFF';
const ERROR_RED = '#FF4444';
const INFO_BLUE = '#00CCFF';

export const CustomToast = ({
  visible,
  message,
  type = 'success',
  onDismiss,
  duration = 3000,
}: CustomToastProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (visible) {
      if (timerRef.current) clearTimeout(timerRef.current);

      // Slide and Fade In
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    } else {
      hideToast();
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  if (!visible) return null;

  const colorMap = {
    success: CYBER,
    error: ERROR_RED,
    info: INFO_BLUE,
  };

  const iconMap = {
    success: 'check-circle-outline',
    error: 'alert-circle-outline',
    info: 'information-outline',
  };

  const activeColor = colorMap[type] || CYBER;
  const activeIcon = iconMap[type] || 'check-circle-outline';

  return (
    <Animated.View
      style={[
        s.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          borderColor: activeColor,
          shadowColor: activeColor,
        },
      ]}
    >
      <View style={s.content}>
        <MaterialCommunityIcons name={activeIcon as any} size={20} color={activeColor} style={s.icon} />
        <Text style={s.text}>{message}</Text>
        <Pressable onPress={hideToast} hitSlop={12} style={s.closeBtn}>
          <MaterialCommunityIcons name="close" size={16} color={SILVER} />
        </Pressable>
      </View>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    backgroundColor: CARD_BG,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    zIndex: 99999,
    elevation: 99,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  text: {
    flex: 1,
    color: WHITE,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'SpaceMono',
    letterSpacing: 0.2,
  },
  closeBtn: {
    paddingLeft: 8,
  },
});
