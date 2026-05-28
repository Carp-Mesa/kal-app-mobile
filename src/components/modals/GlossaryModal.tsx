import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CyberModal } from './CyberModal';

interface GlossaryModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({ visible, onDismiss }) => {
  const terms = [
    {
      id: 'hpi',
      title: 'Índice HPI (High-Performance Index)',
      icon: 'radar',
      color: '#CCFF00',
      description: 'Una métrica algorítmica unificada (escala 0-1000) que calcula tu eficiencia biológica diaria. Evalúa equitativamente: Hidratación (25%), Nutrición (25%), Sueño (25%) y Entrenamiento (25%). Cumplir tus metas eleva tu índice hacia la zona de súper-compensación.',
    },
    {
      id: 'agua',
      title: 'Agua (Hidratación Biológica)',
      icon: 'water',
      color: '#CCFF00',
      description: 'El agua regula la viscosidad sanguínea y la lubricación articular. Perder tan solo un 2% de tu peso corporal en agua puede desencadenar una caída del 15% en el rendimiento atlético y acelerar la fatiga del sistema nervioso.',
    },
    {
      id: 'nutricion',
      title: 'Nutrición y Macronutrientes',
      icon: 'food-apple',
      color: '#FFB74D',
      description: 'El equilibrio de energía y combustibles celulares:\n• Proteína: Bloques de construcción para la síntesis de miofibrillas y reparación muscular.\n• Carbohidratos: Combustible almacenado como glucógeno para contracciones intensas.\n• Grasas: Vitales para la producción de testosterona y absorción de vitaminas.',
    },
    {
      id: 'sueno',
      title: 'Sueño (Reparación Neuroendocrina)',
      icon: 'bed',
      color: '#EF5350',
      description: 'Durante el sueño profundo se libera la mayor cantidad de Hormona de Crecimiento (HGH) y se sintetiza testosterona. Dormir menos de 7h crónicamente bloquea la hipertrofia, eleva el cortisol (hormona del estrés) y reduce la sensibilidad a la insulina.',
    },
    {
      id: 'entrenamiento',
      title: 'Estímulo de Entrenamiento',
      icon: 'dumbbell',
      color: '#4FC3F7',
      description: 'La tensión mecánica y el estrés metabólico indispensables para indicarle al cuerpo que conserve o incremente el tejido muscular. Entrenar hoy bloquea el catabolismo y aumenta tu tasa metabólica basal.',
    },
  ];

  return (
    <CyberModal visible={visible} onDismiss={onDismiss} title="Glosario de Términos">
      <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
        <Text style={styles.introText}>
          Aprende la ciencia detrás del rendimiento atlético y el control de tus variables biológicas cotidianas.
        </Text>
        
        <View style={{ gap: 14 }}>
          {terms.map((term) => (
            <View key={term.id} style={styles.termCard}>
              <View style={styles.termHeader}>
                <View style={[styles.iconContainer, { backgroundColor: `${term.color}15` }]}>
                  <MaterialCommunityIcons name={term.icon as any} size={18} color={term.color} />
                </View>
                <Text style={[styles.termTitle, { color: term.color }]}>{term.title}</Text>
              </View>
              <Text style={styles.termDescription}>{term.description}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </CyberModal>
  );
};

const styles = StyleSheet.create({
  introText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
    fontWeight: '500',
  },
  termCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  termHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  termTitle: {
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  termDescription: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    lineHeight: 15,
  },
});
