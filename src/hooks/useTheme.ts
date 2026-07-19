import { useColorScheme as RNuseColorScheme } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { Theme } from '../theme';

export function useTheme() {
  const storeTheme = useAppStore((state) => state.theme);
  const systemScheme = RNuseColorScheme();
  
  const activeScheme = storeTheme === 'system' 
    ? (systemScheme === 'dark' ? 'dark' : 'light') 
    : storeTheme;
    
  const isDark = activeScheme === 'dark';
  const colors = isDark ? Theme.colors.dark : Theme.colors.light;
  
  return {
    isDark,
    colors,
    common: Theme.colors.common,
    spacing: Theme.spacing,
    typography: Theme.typography,
    shadows: isDark ? Theme.shadows.dark : Theme.shadows.light,
    layout: Theme.layout,
  };
}
