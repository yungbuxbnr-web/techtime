
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface IconProps {
  name: keyof typeof Ionicons.glyphMap;
  size?: number;
  style?: object;
  color?: string;
}

export default function Icon({ name, size = 40, style, color }: IconProps) {
  const { colors } = useTheme();
  const iconColor = color || colors.text;
  
  return (
    <View style={[styles.iconContainer, style]}>
      <Ionicons name={name} size={size} color={iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
