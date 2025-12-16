
import React from 'react';
import { View, ViewStyle } from 'react-native';

interface AnimatedCardProps {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle | ViewStyle[];
}

export default function AnimatedCard({ children, style }: AnimatedCardProps) {
  return (
    <View style={style}>
      {children}
    </View>
  );
}
