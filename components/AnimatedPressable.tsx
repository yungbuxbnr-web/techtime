
import React from 'react';
import { TouchableOpacity, ViewStyle } from 'react-native';

interface AnimatedPressableProps {
  children: React.ReactNode;
  onPress: () => void;
  style?: ViewStyle | ViewStyle[];
  scaleValue?: number;
  disabled?: boolean;
}

export default function AnimatedPressable({ 
  children, 
  onPress, 
  style,
  disabled
}: AnimatedPressableProps) {
  return (
    <TouchableOpacity 
      style={style}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={disabled}
    >
      {children}
    </TouchableOpacity>
  );
}
