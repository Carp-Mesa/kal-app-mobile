import React from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Modal, Portal, Text } from 'react-native-paper';

interface CyberModalProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  children: React.ReactNode;
}

export const CyberModal: React.FC<CyberModalProps> = ({ visible, onDismiss, title, children }) => {
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
        dismissable={true}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <Text variant="titleLarge" style={styles.title}>{title}</Text>
            <IconButton icon="close" size={24} iconColor="rgba(255,255,255,0.7)" onPress={onDismiss} />
          </View>
          <View style={styles.content}>
            {children}
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    margin: 0,
    paddingHorizontal: 0,
    paddingBottom: 100, // Safe zone for the central floating button
    paddingTop: 40,
  },
  card: {
    width: '90%',
    maxWidth: 380,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  content: {
    paddingBottom: 4,
  },
});
