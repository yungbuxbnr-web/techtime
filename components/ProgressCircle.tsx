
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../contexts/ThemeContext';

interface ProgressCircleProps {
  percentage: number;
  size: number;
  strokeWidth: number;
  color: string;
  backgroundColor?: string;
  centerText?: string;
  centerSubtext?: string;
}

export default function ProgressCircle({
  percentage,
  size,
  strokeWidth,
  color,
  backgroundColor,
  centerText,
  centerSubtext
}: ProgressCircleProps) {
  const { colors } = useTheme();
  const bgColor = backgroundColor || (colors.border || '#e5e7eb');
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        {/* Background circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={bgColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {/* Text in the center */}
      <View style={styles.textContainer}>
        {centerText ? (
          <>
            <Text style={[styles.centerText, { color: colors.text }]}>
              {centerText}
            </Text>
            {centerSubtext && (
              <Text style={[styles.centerSubtext, { color: colors.textSecondary }]}>
                {centerSubtext}
              </Text>
            )}
          </>
        ) : (
          <Text style={[styles.percentageText, { color: colors.text }]}>
            {percentage.toFixed(1)}%
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  svg: {
    position: 'absolute',
  },
  textContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  percentageText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  centerText: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  centerSubtext: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
  },
});
