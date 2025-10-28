
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
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from storage on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const settings = await StorageService.getSettings();
      const savedTheme = settings.theme || 'light';
      setThemeState(savedTheme);
      setColors(savedTheme === 'dark' ? darkColors : lightColors);
      console.log('Theme loaded:', savedTheme);
    } catch (error) {
      console.log('Error loading theme:', error);
      // Default to light theme
      setThemeState('light');
      setColors(lightColors);
    } finally {
      setIsLoading(false);
    }
  };

  const setTheme = async (newTheme: Theme) => {
    try {
      setThemeState(newTheme);
      setColors(newTheme === 'dark' ? darkColors : lightColors);
      
      const settings = await StorageService.getSettings();
      await StorageService.saveSettings({ ...settings, theme: newTheme });
      console.log('Theme updated to:', newTheme);
    } catch (error) {
      console.log('Error setting theme:', error);
    }
  };

  const toggleTheme = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    await setTheme(newTheme);
  };

  // Don't render children until theme is loaded
  if (isLoading) {
    return null;
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
