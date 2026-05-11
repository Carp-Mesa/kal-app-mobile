import { MD3DarkTheme, MD3LightTheme } from 'react-native-paper';

export const LightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#007AFF', // Trust Blue
    background: '#FFFFFF',
    surface: '#F5F5F5',
    onSurface: '#000000',
  },
};

export const DarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#CCFF00', // Cyber Lime
    background: '#000000',
    surface: '#121212',
    onSurface: '#FFFFFF',
  },
};
