
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
    borderColor: 'rgba(255, 255, 255, 0.6)',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    borderColor: '#ffffff',
    backgroundColor: '#ffffff',
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)',
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonTextDisabled: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.8)',
    borderColor: 'rgba(239, 68, 68, 1)',
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
