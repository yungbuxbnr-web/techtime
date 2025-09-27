
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../styles/commonStyles';

interface KeypadProps {
  onNumberPress: (number: string) => void;
  onDeletePress: () => void;
  onSubmitPress: () => void;
  pin: string;
  maxLength?: number;
}

export default function Keypad({ onNumberPress, onDeletePress, onSubmitPress, pin, maxLength = 4 }: KeypadProps) {
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

      {/* Submit Button */}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
  pinDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 16,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  pinDotEmpty: {
    borderColor: colors.border,
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  keypadGrid: {
    gap: 16,
    marginBottom: 32,
  },
  keypadRow: {
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
  },
  button: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.backgroundAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
  },
  buttonText: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
  },
  buttonTextDisabled: {
    color: colors.textSecondary,
  },
  deleteButton: {
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
  deleteButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.background,
  },
  emptyButton: {
    width: 72,
    height: 72,
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
    color: colors.background,
  },
  submitButtonTextInactive: {
    color: colors.textSecondary,
  },
});
