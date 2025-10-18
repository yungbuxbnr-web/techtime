
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { GoogleDriveService, GoogleDriveFile, GoogleDriveFolder } from '../utils/googleDriveService';
import NotificationToast from './NotificationToast';
import { useTheme } from '../contexts/ThemeContext';

interface GoogleDriveFolderSelectorProps {
  accessToken: string;
  onFolderSelected: (folder: GoogleDriveFolder) => void;
  onClose: () => void;
}

const GoogleDriveFolderSelector: React.FC<GoogleDriveFolderSelectorProps> = ({
  accessToken,
  onFolderSelected,
  onClose,
}) => {
  const { colors } = useTheme();
  const [folders, setFolders] = useState<GoogleDriveFile[]>([]);
  const [currentPath, setCurrentPath] = useState<string>('Root');
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<GoogleDriveFolder | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
    visible: boolean;
  }>({
    message: '',
    type: 'info',
    visible: false,
  });

  const showNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type, visible: true });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, visible: false }));
  };

  const loadFolders = useCallback(async (parentId?: string) => {
    setIsLoading(true);
    try {
      const result = await GoogleDriveService.listFolders(accessToken, parentId);
      if (result.success) {
        setFolders(result.folders);
      } else {
        showNotification(result.message || 'Failed to load folders', 'error');
      }
    } catch (error) {
      console.log('Error loading folders:', error);
      showNotification('Failed to load folders', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  const handleFolderPress = (folder: GoogleDriveFile) => {
    setCurrentFolderId(folder.id);
    setCurrentPath(prev => `${prev} > ${folder.name}`);
    loadFolders(folder.id);
  };

  const handleBackPress = () => {
    // Simple back navigation - in a real app you'd maintain a proper navigation stack
    const pathParts = currentPath.split(' > ');
    if (pathParts.length > 1) {
      pathParts.pop();
      setCurrentPath(pathParts.join(' > '));
      if (pathParts.length === 1) {
        setCurrentFolderId(undefined);
        loadFolders();
      } else {
        // This is simplified - you'd need to track parent IDs properly
        loadFolders();
      }
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      showNotification('Please enter a folder name', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const result = await GoogleDriveService.createFolder(
        accessToken,
        newFolderName.trim(),
        currentFolderId
      );
      
      if (result.success) {
        showNotification(result.message, 'success');
        setNewFolderName('');
        setShowCreateFolder(false);
        await loadFolders(currentFolderId);
      } else {
        showNotification(result.message, 'error');
      }
    } catch (error) {
      console.log('Error creating folder:', error);
      showNotification('Failed to create folder', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCurrentFolder = () => {
    const folder: GoogleDriveFolder = {
      id: currentFolderId || 'root',
      name: currentPath === 'Root' ? 'Root' : currentPath.split(' > ').pop() || 'Root',
      path: currentPath,
    };
    
    setSelectedFolder(folder);
    
    Alert.alert(
      'Select Backup Folder',
      `Do you want to use "${folder.path}" as your backup folder?\n\nAll future backups will be saved to this location.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Select',
          onPress: () => {
            onFolderSelected(folder);
            onClose();
          },
        },
      ]
    );
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <NotificationToast
        message={notification.message}
        type={notification.type}
        visible={notification.visible}
        onHide={hideNotification}
      />

      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Select Backup Folder</Text>
        <TouchableOpacity onPress={() => setShowCreateFolder(!showCreateFolder)} style={styles.addButton}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pathContainer}>
        <Text style={styles.pathText}>{currentPath}</Text>
        {currentPath !== 'Root' && (
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        )}
      </View>

      {showCreateFolder && (
        <View style={styles.createFolderContainer}>
          <TextInput
            style={styles.folderNameInput}
            value={newFolderName}
            onChangeText={setNewFolderName}
            placeholder="Enter folder name"
            placeholderTextColor={colors.textSecondary}
          />
          <View style={styles.createFolderButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setShowCreateFolder(false);
                setNewFolderName('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.createButton]}
              onPress={handleCreateFolder}
              disabled={isLoading}
            >
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.selectCurrentContainer}>
        <TouchableOpacity
          style={[styles.button, styles.selectCurrentButton]}
          onPress={handleSelectCurrentFolder}
        >
          <Text style={styles.selectCurrentButtonText}>
            📁 Use Current Folder: {currentPath}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading folders...</Text>
        </View>
      ) : (
        <ScrollView style={styles.folderList} showsVerticalScrollIndicator={false}>
          {folders.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No folders found</Text>
              <Text style={styles.emptySubtext}>Create a new folder or select the current location</Text>
            </View>
          ) : (
            folders.map((folder) => (
              <TouchableOpacity
                key={folder.id}
                style={styles.folderItem}
                onPress={() => handleFolderPress(folder)}
              >
                <Text style={styles.folderIcon}>📁</Text>
                <Text style={styles.folderName}>{folder.name}</Text>
                <Text style={styles.folderArrow}>→</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.text,
  },
  addButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 18,
    color: colors.background,
    fontWeight: 'bold',
  },
  pathContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pathText: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
  },
  backButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  backButtonText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  createFolderContainer: {
    padding: 20,
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  folderNameInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
    marginBottom: 10,
  },
  createFolderButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    flex: 1,
  },
  cancelButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: colors.primary,
    flex: 1,
  },
  createButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  selectCurrentContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  selectCurrentButton: {
    backgroundColor: colors.success || colors.primary,
    paddingVertical: 12,
  },
  selectCurrentButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 10,
  },
  folderList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: colors.text,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  folderIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  folderName: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  folderArrow: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});

export default GoogleDriveFolderSelector;
