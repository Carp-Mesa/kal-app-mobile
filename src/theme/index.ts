import { MD3LightTheme as DefaultTheme } from 'react-native-paper';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#0061FF',
    primaryContainer: '#D1E4FF',
    onPrimaryContainer: '#001D55',
    secondary: '#535F70',
    secondaryContainer: '#D6E3F7',
    onSecondaryContainer: '#0F1C2B',
    tertiary: '#6B5778',
    tertiaryContainer: '#F2DAFF',
    onTertiaryContainer: '#251431',
    background: '#F5F7FA', // Fondo ligeramente grisáceo
    surface: '#FFFFFF',
    surfaceVariant: '#E1E2EC',
    outline: '#74777F',
  },
};
