
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('light');
  const [colors, setColors] = useState(lightColors);

  // Load theme from storage on mount - non-blocking
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      console.log('[ThemeProvider] Loading theme from storage...');
      const settings = await StorageService.getSettings();
      const savedTheme = settings.theme || 'light';
      
      console.log('[ThemeProvider] Theme loaded:', savedTheme);
      setThemeState(savedTheme);
      setColors(savedTheme === 'dark' ? darkColors : lightColors);
    } catch (error) {
      console.log('[ThemeProvider] Error loading theme, using default light theme:', error);
      // Default to light theme on error
      setThemeState('light');
      setColors(lightColors);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    try {
      console.log('[ThemeProvider] Setting theme to:', newTheme);
      setThemeState(newTheme);
      setColors(newTheme === 'dark' ? darkColors : lightColors);
      
      const settings = await StorageService.getSettings();
      await StorageService.saveSettings({ ...settings, theme: newTheme });
      console.log('[ThemeProvider] Theme saved successfully');
    } catch (error) {
      console.log('[ThemeProvider] Error setting theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    await setTheme(newTheme);
  };

  // Render immediately with default theme - theme will update once loaded
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
