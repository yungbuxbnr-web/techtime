
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

interface ProfileSettingsProps {
  technicianName: string;
  onUpdate: (name: string) => Promise<void>;
  colors: any;
}

export default function ProfileSettings({ technicianName, onUpdate, colors }: ProfileSettingsProps) {
  const [newName, setNewName] = useState(technicianName);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    const trimmedName = newName.trim();
    
    if (!trimmedName) {
      alert('Please enter your name');
      return;
    }

    if (trimmedName.length < 2) {
      alert('Name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 50) {
      alert('Name must be less than 50 characters');
      return;
    }

    setIsUpdating(true);
    try {
      await onUpdate(trimmedName);
    } catch (error) {
      console.log('Error updating name:', error);
      alert('Error updating name');
    } finally {
      setIsUpdating(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>👤 Technician Profile</Text>
      <Text style={styles.sectionDescription}>
        Your name appears throughout the app and on exported reports
      </Text>
      
      <Text style={styles.label}>Current Name</Text>
      <View style={styles.currentNameDisplay}>
        <Text style={styles.currentNameText}>{technicianName || 'Not set'}</Text>
      </View>
      
      <Text style={styles.label}>New Name</Text>
      <TextInput
        style={styles.input}
        value={newName}
        onChangeText={setNewName}
        placeholder="Enter your full name"
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={50}
        editable={!isUpdating}
      />
      
      <TouchableOpacity 
        style={[styles.button, isUpdating && styles.buttonDisabled]} 
        onPress={handleUpdate}
        disabled={isUpdating}
      >
        <Text style={styles.buttonText}>
          {isUpdating ? '🔄 Updating...' : '🔄 Update Name'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  section: {
    marginBottom: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: colors.background,
    color: colors.text,
    marginBottom: 16,
  },
  currentNameDisplay: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
