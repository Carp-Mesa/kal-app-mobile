import { useAppStore } from '@/src/store/useAppStore';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs, router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { List, Modal, Portal, useTheme } from 'react-native-paper';

const CustomMainButton = ({ children, onPress }: any) => {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.mainButtonContainer}>
      <View style={[styles.mainButton, { backgroundColor: theme.colors.primary }]}>
        <MaterialCommunityIcons name="plus" size={32} color={theme.colors.background} />
      </View>
    </Pressable>
  );
};

export default function TabLayout() {
  const theme = useTheme();
  const setModalVisible = useAppStore(state => state.setModalVisible);
  const [menuVisible, setMenuVisible] = useState(false);

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
            title: 'Entrenamiento',
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
            tabBarButton: (props) => <CustomMainButton {...props} />,
          }}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setMenuVisible(true);
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

      <Portal>
        <Modal
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        >
          <List.Item
            title="Sueño"
            left={props => <List.Icon {...props} icon="bed" color="#9C27B0" />}
            onPress={() => { setMenuVisible(false); setModalVisible('sleep'); }}
          />
          <List.Item
            title="Comida"
            left={props => <List.Icon {...props} icon="food-apple" color="#4CAF50" />}
            onPress={() => { setMenuVisible(false); setModalVisible('nutrition'); }}
          />
          <List.Item
            title="Agua"
            left={props => <List.Icon {...props} icon="cup-water" color="#2196F3" />}
            onPress={() => { setMenuVisible(false); setModalVisible('water'); }}
          />
          <List.Item
            title="Entrenamiento"
            left={props => <List.Icon {...props} icon="dumbbell" color="#FF9800" />}
            onPress={() => { setMenuVisible(false); router.push('/(tabs)/workout/new'); }}
          />
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  mainButtonContainer: {
    top: -20,
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: 60,
    borderRadius: 30,
    marginHorizontal: 10,
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
  modalContainer: {
    margin: 20,
    padding: 10,
    borderRadius: 16,
  },
});