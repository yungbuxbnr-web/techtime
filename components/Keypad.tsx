
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface KeypadProps {
  onNumberPress: (number: string) => void;
  onDeletePress: () => void;
  onSubmitPress: () => void;
  pin: string;
  maxLength?: number;
  hideSubmitButton?: boolean;
}

export default function Keypad({ 
  onNumberPress, 
  onDeletePress, 
  onSubmitPress, 
  pin, 
  maxLength = 4,
  hideSubmitButton = false 
}: KeypadProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const numbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'delete']
  ];

  const renderButton = (value: string, index: number) => {
    if (value === '') {
      return <View key={index} style={styles.emptyButton} />;
    }

    if (value === 'delete') {
      return (
        <TouchableOpacity
          key={index}
          style={[styles.button, styles.deleteButton]}
          onPress={onDeletePress}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteButtonText}>⌫</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={index}
        style={[
          styles.button,
          pin.length >= maxLength && styles.buttonDisabled
        ]}
        onPress={() => onNumberPress(value)}
        activeOpacity={0.7}
        disabled={pin.length >= maxLength}
      >
        <Text style={[
          styles.buttonText,
          pin.length >= maxLength && styles.buttonTextDisabled
        ]}>
          {value}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* PIN Display */}
      <View style={styles.pinDisplay}>
        {Array.from({ length: maxLength }, (_, index) => (
          <View
            key={index}
            style={[
              styles.pinDot,
              index < pin.length ? styles.pinDotFilled : styles.pinDotEmpty
            ]}
          />
        ))}
      </View>

      {/* Number Grid */}
      <View style={styles.keypadGrid}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((number, colIndex) => renderButton(number, colIndex))}
          </View>
        ))}
      </View>

      {/* Submit Button - Only show if hideSubmitButton is false */}
      {!hideSubmitButton && (
        <TouchableOpacity
          style={[
            styles.submitButton,
            pin.length === maxLength ? styles.submitButtonActive : styles.submitButtonInactive
          ]}
          onPress={onSubmitPress}
          disabled={pin.length !== maxLength}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.submitButtonText,
            pin.length === maxLength ? styles.submitButtonTextActive : styles.submitButtonTextInactive
          ]}>
            Sign In
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  pinDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 60,
    gap: 20,
  },
  pinDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  pinDotEmpty: {
    borderColor: colors.textSecondary,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  keypadGrid: {
    gap: 20,
    marginBottom: 32,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 20,
    justifyContent: 'center',
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.border,
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 32,
    fontWeight: '600',
    color: colors.text,
  },
  buttonTextDisabled: {
    color: colors.textSecondary,
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    borderColor: '#dc2626',
  },
  deleteButtonText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyButton: {
    width: 80,
    height: 80,
  },
  submitButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 280,
  },
  submitButtonActive: {
    backgroundColor: colors.primary,
  },
  submitButtonInactive: {
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  submitButtonTextActive: {
    color: '#ffffff',
  },
  submitButtonTextInactive: {
    color: colors.textSecondary,
  },
});
