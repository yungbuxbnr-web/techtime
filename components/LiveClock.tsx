
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

export default function LiveClock() {
  const { colors } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update time every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.time}>{formatTime(currentTime)}</Text>
      <Text style={styles.date}>{formatDate(currentTime)}</Text>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
    elevation: 2,
    alignItems: 'center',
  },
  time: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
    fontVariant: ['tabular-nums'],
  },
  date: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});
