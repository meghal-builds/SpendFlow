import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const Theme = {
  colors: {
    common: {
      primary: '#10B981',      // Emerald Accent
      primaryLight: '#D1FAE5', // Light green tint
      danger: '#EF4444',       // Red accent
      dangerLight: '#FEE2E2',  // Light red tint
      warning: '#F59E0B',      // Warning / Orange accent
      warningLight: '#FEF3C7',  // Light yellow tint
      white: '#FFFFFF',
      black: '#000000',
    },
    light: {
      background: '#F7F8FA',   // Warm off-white
      card: '#FFFFFF',         // White card
      text: '#111827',         // Dark charcoal text
      textSecondary: '#6B7280', // Soft grey text
      border: '#E5E7EB',       // Subtle border
      shadow: '#000000',
      activeTab: '#10B981',
      inactiveTab: '#9CA3AF',
    },
    dark: {
      background: '#0F1115',   // Deep charcoal background
      card: '#181B21',         // Slightly lighter cards
      text: '#F9FAFB',         // Off-white text
      textSecondary: '#9CA3AF', // Muted grey text
      border: '#2D3139',       // Subtle border
      shadow: '#000000',
      activeTab: '#10B981',
      inactiveTab: '#4B5563',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    paddingHorizontal: 16,
  },
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
      mono: 'System', // Tabular/monospaced numbers
    },
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 18,
      xl: 20,
      xxl: 28,
      xxxl: 36,
    },
  },
  shadows: {
    light: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    dark: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 2,
    },
  },
  layout: {
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    borderRadius: {
      sm: 6,
      md: 12,
      lg: 16,
      round: 9999,
    },
  },
};
