
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StorageService } from '../utils/storage';
import { lightColors, darkColors } from '../styles/commonStyles';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  colors: typeof lightColors;
  toggleTheme: () => Promise<void>;
  setTheme: (theme: Theme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_LOAD_TIMEOUT = 3000; // 3 seconds max for theme loading

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('light');
  const [colors, setColors] = useState(lightColors);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from storage on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const timeoutId = setTimeout(() => {
      console.log('[ThemeProvider] Theme loading timeout - using default light theme');
      setIsLoading(false);
    }, THEME_LOAD_TIMEOUT);

    try {
      console.log('[ThemeProvider] Loading theme...');
      const settings = await StorageService.getSettings();
      const savedTheme = settings.theme || 'light';
      setThemeState(savedTheme);
      setColors(savedTheme === 'dark' ? darkColors : lightColors);
      console.log('[ThemeProvider] Theme loaded:', savedTheme);
    } catch (error) {
      console.log('[ThemeProvider] Error loading theme:', error);
      // Default to light theme
      setThemeState('light');
      setColors(lightColors);
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    try {
      setThemeState(newTheme);
      setColors(newTheme === 'dark' ? darkColors : lightColors);
      
      const settings = await StorageService.getSettings();
      await StorageService.saveSettings({ ...settings, theme: newTheme });
      console.log('[ThemeProvider] Theme updated to:', newTheme);
    } catch (error) {
      console.log('[ThemeProvider] Error setting theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    await setTheme(newTheme);
  };

  // Show loading indicator while theme is loading
  if (isLoading) {
    console.log('[ThemeProvider] Rendering loading indicator...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={lightColors.primary} />
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, colors, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
});
