
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { ParsedJobRow, Job, PDFImportResult } from '../types';
import { StorageService } from '../utils/storage';
import { PDFImportService } from '../utils/pdfImportService';
import NotificationToast from '../components/NotificationToast';
import * as Sharing from 'expo-sharing';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TEMP_IMPORT_KEY = '@pdf_import_temp_data';

interface BulkEditModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (action: string, value: string) => void;
}

const BulkEditModal: React.FC<BulkEditModalProps> = ({ visible, onClose, onApply }) => {
  const { colors } = useTheme();
  const [action, setAction] = useState<string>('setVHC');
  const [value, setValue] = useState<string>('');

  const handleApply = () => {
    if (!value && action !== 'clearAWS') {
      Alert.alert('Error', 'Please enter a value');
      return;
    }
    onApply(action, value);
    setValue('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Bulk Edit</Text>

          <Text style={[styles.label, { color: colors.text }]}>Action:</Text>
          <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Picker
              selectedValue={action}
              onValueChange={setAction}
              style={{ color: colors.text }}
            >
              <Picker.Item label="Set VHC Status" value="setVHC" />
              <Picker.Item label="Find & Replace" value="findReplace" />
              <Picker.Item label="Clear AWS" value="clearAWS" />
            </Picker>
          </View>

          {action === 'setVHC' && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>VHC Status:</Text>
              <View style={[styles.pickerContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Picker
                  selectedValue={value}
                  onValueChange={setValue}
                  style={{ color: colors.text }}
                >
                  <Picker.Item label="Select status..." value="" />
                  <Picker.Item label="Red" value="Red" />
                  <Picker.Item label="Orange" value="Orange" />
                  <Picker.Item label="Green" value="Green" />
                  <Picker.Item label="N/A" value="N/A" />
                </Picker>
              </View>
            </>
          )}

          {action === 'findReplace' && (
            <>
              <Text style={[styles.label, { color: colors.text }]}>Find & Replace (format: find|replace):</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                value={value}
                onChangeText={setValue}
                placeholder="e.g., tyre|tire"
                placeholderTextColor={colors.textSecondary}
              />
            </>
          )}

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={handleApply}
            >
              <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default function PDFImportPreviewScreen() {
  const { colors } = useTheme();
  
  const [rows, setRows] = useState<ParsedJobRow[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [filename, setFilename] = useState('');
  const [hash, setHash] = useState('');
  const [importResult, setImportResult] = useState<PDFImportResult | null>(null);

  useEffect(() => {
    loadPreviewData();
  }, []);

  const loadPreviewData = async () => {
    try {
      console.log('[Preview] Loading preview data...');
      
      const dataStr = await AsyncStorage.getItem(TEMP_IMPORT_KEY);
      if (!dataStr) {
        console.log('[Preview] No preview data found');
        setNotification({
          message: 'No import data found. Please import a PDF first.',
          type: 'error',
        });
        return;
      }
      
      const result: PDFImportResult = JSON.parse(dataStr);
      console.log('[Preview] Loaded ${result.rows.length} rows');
      
      setImportResult(result);
      setRows(result.rows);
      setFilename(result.filename);
      setHash(result.hash);
    } catch (error) {
      console.error('[Preview] Error loading preview data:', error);
      setNotification({
        message: 'Failed to load preview data',
        type: 'error',
      });
    }
  };

  const toggleRowSelection = (rowId: string) => {
    const newSelection = new Set(selectedRows);
    if (newSelection.has(rowId)) {
      newSelection.delete(rowId);
    } else {
      newSelection.add(rowId);
    }
    setSelectedRows(newSelection);
  };

  const selectAll = () => {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.map(r => r.id)));
    }
  };

  const updateCell = (rowId: string, field: keyof ParsedJobRow, value: string) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === rowId) {
          const updated = { ...row, [field]: value };
          
          // Recalculate minutes if AWS changes
          if (field === 'aws') {
            updated.minutes = parseInt(value) * 5;
          }
          
          // Recalculate confidence
          updated.confidence = calculateConfidence(updated);
          
          return updated;
        }
        return row;
      })
    );
    setEditingCell(null);
  };

  const calculateConfidence = (row: ParsedJobRow): number => {
    let confidence = 1.0;
    
    if (row.validationErrors.length > 0) {
      confidence *= 0.7;
    }
    
    if (!row.vehicleReg || row.vehicleReg.length < 4) {
      confidence *= 0.6;
    }
    
    if (row.aws === 0) {
      confidence *= 0.5;
    }
    
    return confidence;
  };

  const applyBulkEdit = (action: string, value: string) => {
    const selectedRowIds = Array.from(selectedRows);
    
    setRows(prevRows =>
      prevRows.map(row => {
        if (!selectedRowIds.includes(row.id)) return row;
        
        const updated = { ...row };
        
        switch (action) {
          case 'setVHC':
            updated.vhcStatus = value as 'Red' | 'Orange' | 'Green' | 'N/A';
            break;
          
          case 'findReplace':
            const [find, replace] = value.split('|');
            if (find && replace) {
              updated.jobDescription = updated.jobDescription.replace(
                new RegExp(find, 'gi'),
                replace
              );
            }
            break;
          
          case 'clearAWS':
            updated.aws = 0;
            updated.minutes = 0;
            break;
        }
        
        updated.confidence = calculateConfidence(updated);
        return updated;
      })
    );
    
    setNotification({
      message: `Bulk edit applied to ${selectedRowIds.length} rows`,
      type: 'success',
    });
  };

  const validateAndConfirm = async () => {
    // Validate all rows
    const errors: string[] = [];
    const duplicateWIPs = new Map<string, number>();
    
    rows.forEach((row, index) => {
      if (row.action === 'Skip') return;
      
      // Check required fields
      if (!row.wipNumber && !row.vehicleReg) {
        errors.push(`Row ${index + 1}: Missing WIP number or vehicle registration`);
      }
      
      if (!row.vehicleReg && !row.startedAt) {
        errors.push(`Row ${index + 1}: Missing vehicle registration or start date`);
      }
      
      // Check for duplicate WIPs within import
      if (row.wipNumber) {
        const count = duplicateWIPs.get(row.wipNumber) || 0;
        duplicateWIPs.set(row.wipNumber, count + 1);
      }
    });
    
    // Check for duplicate WIPs
    duplicateWIPs.forEach((count, wip) => {
      if (count > 1) {
        errors.push(`Duplicate WIP number: ${wip} appears ${count} times`);
      }
    });
    
    if (errors.length > 0) {
      Alert.alert(
        'Validation Errors',
        errors.slice(0, 5).join('\n\n') + (errors.length > 5 ? `\n\n...and ${errors.length - 5} more` : ''),
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Confirm import
    const createCount = rows.filter(r => r.action === 'Create').length;
    const updateCount = rows.filter(r => r.action === 'Update').length;
    const skipCount = rows.filter(r => r.action === 'Skip').length;
    
    Alert.alert(
      'Confirm Import',
      `This will:\n\n• Create ${createCount} new jobs\n• Update ${updateCount} existing jobs\n• Skip ${skipCount} jobs\n\nContinue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: performImport },
      ]
    );
  };

  const performImport = async () => {
    setLoading(true);
    
    try {
      // Load existing jobs
      const existingJobs = await StorageService.getJobs();
      
      // Convert rows to jobs
      const newJobs = PDFImportService.convertRowsToJobs(rows, filename, hash);
      
      // Merge with existing jobs
      const updatedJobs = [...existingJobs];
      let created = 0;
      let updated = 0;
      
      newJobs.forEach(newJob => {
        const existingIndex = updatedJobs.findIndex(j => j.id === newJob.id);
        
        if (existingIndex >= 0) {
          updatedJobs[existingIndex] = newJob;
          updated++;
        } else {
          updatedJobs.push(newJob);
          created++;
        }
      });
      
      // Save jobs
      await StorageService.saveJobs(updatedJobs);
      
      // Clear temp data
      await AsyncStorage.removeItem(TEMP_IMPORT_KEY);
      
      // Navigate to summary
      router.replace({
        pathname: '/pdf-import-summary',
        params: {
          created: created.toString(),
          updated: updated.toString(),
          skipped: rows.filter(r => r.action === 'Skip').length.toString(),
        },
      });
    } catch (error) {
      console.error('[Preview] Error performing import:', error);
      setNotification({
        message: 'Failed to import jobs',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadParseLog = async () => {
    try {
      if (!importResult) {
        Alert.alert('Error', 'No import data available');
        return;
      }
      
      const logUri = await PDFImportService.exportParseLog(
        importResult.parseLog,
        filename
      );
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(logUri, {
          mimeType: 'application/json',
          dialogTitle: 'Export Parse Log',
        });
        
        setNotification({
          message: 'Parse log exported successfully',
          type: 'success',
        });
      } else {
        Alert.alert('Success', `Log saved to: ${logUri}`);
      }
    } catch (error) {
      console.error('[Preview] Error downloading parse log:', error);
      setNotification({
        message: 'Failed to export parse log',
        type: 'error',
      });
    }
  };

  const downloadRowsCSV = async () => {
    try {
      const csvUri = await PDFImportService.exportRowsCSV(rows, filename);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(csvUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Rows CSV',
        });
        
        setNotification({
          message: 'CSV exported successfully',
          type: 'success',
        });
      } else {
        Alert.alert('Success', `CSV saved to: ${csvUri}`);
      }
    } catch (error) {
      console.error('[Preview] Error downloading CSV:', error);
      setNotification({
        message: 'Failed to export CSV',
        type: 'error',
      });
    }
  };

  const renderCell = (row: ParsedJobRow, field: keyof ParsedJobRow, value: string | number) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.field === field;
    
    if (isEditing) {
      return (
        <TextInput
          style={[styles.cellInput, { color: colors.text, borderColor: colors.primary }]}
          value={value.toString()}
          onChangeText={(text) => updateCell(row.id, field, text)}
          onBlur={() => setEditingCell(null)}
          autoFocus
        />
      );
    }
    
    return (
      <TouchableOpacity onPress={() => setEditingCell({ rowId: row.id, field: field as string })}>
        <Text style={[styles.cellText, { color: colors.text }]} numberOfLines={1}>
          {value || '-'}
        </Text>
      </TouchableOpacity>
    );
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#4CAF50';
    if (confidence >= 0.6) return '#FFC107';
    return '#F44336';
  };

  if (rows.length === 0 && importResult) {
    // Show parse log view when no rows found
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Parse Log</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content}>
          <View style={[styles.card, { backgroundColor: colors.card }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>No Data Found</Text>
            <Text style={[styles.cardDescription, { color: colors.textSecondary }]}>
              Could not extract job data from the PDF. Review the parse log below to understand what went wrong.
            </Text>

            <View style={styles.exportButtons}>
              <TouchableOpacity
                style={[styles.exportButton, { backgroundColor: colors.primary }]}
                onPress={downloadParseLog}
              >
                <Text style={styles.exportButtonText}>Download Parse Log</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.logCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.logTitle, { color: colors.text }]}>Parse Log:</Text>
            {importResult.parseLog.map((entry, index) => (
              <View
                key={index}
                style={[
                  styles.logEntry,
                  {
                    backgroundColor: colors.background,
                    borderLeftColor:
                      entry.level === 'error'
                        ? '#F44336'
                        : entry.level === 'warning'
                        ? '#FFC107'
                        : '#4CAF50',
                  },
                ]}
              >
                <Text style={[styles.logLevel, { color: colors.text }]}>
                  {entry.level.toUpperCase()}
                </Text>
                <Text style={[styles.logMessage, { color: colors.textSecondary }]}>
                  {entry.message}
                </Text>
                {entry.rawData && (
                  <Text style={[styles.logRawData, { color: colors.textSecondary }]}>
                    Raw: {entry.rawData}
                  </Text>
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Review Import</Text>
        <TouchableOpacity onPress={downloadParseLog}>
          <Text style={[styles.logButton, { color: colors.primary }]}>Log</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.toolbar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.toolButton, { backgroundColor: colors.primary }]}
          onPress={selectAll}
        >
          <Text style={styles.toolButtonText}>
            {selectedRows.size === rows.length ? 'Deselect All' : 'Select All'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.toolButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowBulkEdit(true)}
          disabled={selectedRows.size === 0}
        >
          <Text style={styles.toolButtonText}>Bulk Edit ({selectedRows.size})</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toolButton, { backgroundColor: colors.primary }]}
          onPress={downloadRowsCSV}
        >
          <Text style={styles.toolButtonText}>CSV</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} horizontal>
        <View>
          {/* Header Row */}
          <View style={[styles.row, styles.headerRow, { backgroundColor: colors.card }]}>
            <View style={[styles.cell, styles.checkboxCell]}>
              <Text style={[styles.headerText, { color: colors.text }]}>✓</Text>
            </View>
            <View style={[styles.cell, styles.wipCell]}>
              <Text style={[styles.headerText, { color: colors.text }]}>WIP</Text>
            </View>
            <View style={[styles.cell, styles.regCell]}>
              <Text style={[styles.headerText, { color: colors.text }]}>Reg</Text>
            </View>
            <View style={[styles.cell, styles.vhcCell]}>
              <Text style={[styles.headerText, { color: colors.text }]}>VHC</Text>
            </View>
            <View style={[styles.cell, styles.descCell]}>
              <Text style={[styles.headerText, { color: colors.text }]}>Description</Text>
            </View>
            <View style={[styles.cell, styles.awsCell]}>
              <Text style={[styles.headerText, { color: colors.text }]}>AWS</Text>
            </View>
            <View style={[styles.cell, styles.timeCell]}>
              <Text style={[styles.headerText, { color: colors.text }]}>Time</Text>
            </View>
            <View style={[styles.cell, styles.dateCell]}>
              <Text style={[styles.headerText, { color: colors.text }]}>Date</Text>
            </View>
            <View style={[styles.cell, styles.confidenceCell]}>
              <Text style={[styles.headerText, { color: colors.text }]}>Conf</Text>
            </View>
            <View style={[styles.cell, styles.actionCell]}>
              <Text style={[styles.headerText, { color: colors.text }]}>Action</Text>
            </View>
          </View>

          {/* Data Rows */}
          {rows.map((row, index) => (
            <View
              key={row.id}
              style={[
                styles.row,
                { backgroundColor: index % 2 === 0 ? colors.background : colors.card },
                row.confidence < 0.7 && styles.lowConfidenceRow,
              ]}
            >
              <View style={[styles.cell, styles.checkboxCell]}>
                <TouchableOpacity onPress={() => toggleRowSelection(row.id)}>
                  <Text style={{ color: colors.text }}>
                    {selectedRows.has(row.id) ? '☑' : '☐'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.cell, styles.wipCell]}>
                {renderCell(row, 'wipNumber', row.wipNumber)}
              </View>
              <View style={[styles.cell, styles.regCell]}>
                {renderCell(row, 'vehicleReg', row.vehicleReg)}
              </View>
              <View style={[styles.cell, styles.vhcCell]}>
                <Text style={[styles.cellText, { color: colors.text }]}>{row.vhcStatus}</Text>
              </View>
              <View style={[styles.cell, styles.descCell]}>
                {renderCell(row, 'jobDescription', row.jobDescription)}
              </View>
              <View style={[styles.cell, styles.awsCell]}>
                {renderCell(row, 'aws', row.aws)}
              </View>
              <View style={[styles.cell, styles.timeCell]}>
                <Text style={[styles.cellText, { color: colors.text }]}>{row.workTime}</Text>
              </View>
              <View style={[styles.cell, styles.dateCell]}>
                <Text style={[styles.cellText, { color: colors.text }]}>
                  {row.jobDate} {row.jobTime}
                </Text>
              </View>
              <View style={[styles.cell, styles.confidenceCell]}>
                <View
                  style={[
                    styles.confidenceBadge,
                    { backgroundColor: getConfidenceColor(row.confidence) },
                  ]}
                >
                  <Text style={styles.confidenceText}>
                    {(row.confidence * 100).toFixed(0)}%
                  </Text>
                </View>
              </View>
              <View style={[styles.cell, styles.actionCell]}>
                <Text
                  style={[
                    styles.actionText,
                    {
                      color:
                        row.action === 'Create'
                          ? '#4CAF50'
                          : row.action === 'Update'
                          ? '#FFC107'
                          : '#999',
                    },
                  ]}
                >
                  {row.action}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={styles.summary}>
          <Text style={[styles.summaryText, { color: colors.text }]}>
            Total: {rows.length} | Create: {rows.filter(r => r.action === 'Create').length} | 
            Update: {rows.filter(r => r.action === 'Update').length} | 
            Skip: {rows.filter(r => r.action === 'Skip').length}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.confirmButton, { backgroundColor: colors.primary }]}
          onPress={validateAndConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Import</Text>
          )}
        </TouchableOpacity>
      </View>

      <BulkEditModal
        visible={showBulkEdit}
        onClose={() => setShowBulkEdit(false)}
        onApply={applyBulkEdit}
      />

      {notification && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
          onHide={() => setNotification(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  logButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  placeholder: {
    width: 60,
  },
  toolbar: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    borderBottomWidth: 1,
  },
  toolButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toolButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerRow: {
    borderBottomWidth: 2,
  },
  lowConfidenceRow: {
    backgroundColor: '#FFF9C4',
  },
  cell: {
    padding: 12,
    justifyContent: 'center',
  },
  checkboxCell: {
    width: 50,
  },
  wipCell: {
    width: 100,
  },
  regCell: {
    width: 120,
  },
  vhcCell: {
    width: 80,
  },
  descCell: {
    width: 200,
  },
  awsCell: {
    width: 80,
  },
  timeCell: {
    width: 100,
  },
  dateCell: {
    width: 150,
  },
  confidenceCell: {
    width: 80,
  },
  actionCell: {
    width: 100,
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  cellText: {
    fontSize: 14,
  },
  cellInput: {
    fontSize: 14,
    borderWidth: 1,
    borderRadius: 4,
    padding: 4,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  confidenceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  summary: {
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: {
    margin: 16,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  exportButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logCard: {
    margin: 16,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  logTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  logEntry: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  logLevel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 14,
    marginBottom: 4,
  },
  logRawData: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});
