
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { ParseResult } from '../../services/scan/parsers';

export interface ScanResultSheetProps {
  visible: boolean;
  onClose: () => void;
  onApply: (data: { reg?: string; wip?: string; jobNo?: string }) => void;
  reg?: ParseResult;
  wip?: ParseResult;
  jobNo?: ParseResult;
  allCandidates: {
    reg: ParseResult[];
    wip: ParseResult[];
    jobNo: ParseResult[];
  };
}

export default function ScanResultSheet({
  visible,
  onClose,
  onApply,
  reg,
  wip,
  jobNo,
  allCandidates,
}: ScanResultSheetProps) {
  const { colors } = useTheme();
  const [selectedReg, setSelectedReg] = React.useState<string | undefined>(reg?.value);
  const [selectedWip, setSelectedWip] = React.useState<string | undefined>(wip?.value);
  const [selectedJobNo, setSelectedJobNo] = React.useState<string | undefined>(jobNo?.value);

  React.useEffect(() => {
    setSelectedReg(reg?.value);
    setSelectedWip(wip?.value);
    setSelectedJobNo(jobNo?.value);
  }, [reg, wip, jobNo]);

  const handleApply = () => {
    onApply({
      reg: selectedReg,
      wip: selectedWip,
      jobNo: selectedJobNo,
    });
    onClose();
  };

  const hasResults = reg || wip || jobNo;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={[styles.sheet, { backgroundColor: colors.card }]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>
              Scan Results
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {!hasResults && (
              <View style={styles.noResultsContainer}>
                <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                  No data detected. Please try again or enter manually.
                </Text>
              </View>
            )}

            {/* Registration */}
            {allCandidates.reg.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Vehicle Registration
                </Text>
                {allCandidates.reg.map((candidate, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.candidateItem,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      selectedReg === candidate.value && {
                        borderColor: colors.primary,
                        backgroundColor: colors.primary + '10',
                      },
                    ]}
                    onPress={() => setSelectedReg(candidate.value)}
                  >
                    <View style={styles.candidateContent}>
                      <Text style={[styles.candidateValue, { color: colors.text }]}>
                        {candidate.value}
                      </Text>
                      <View style={styles.candidateDetails}>
                        <View
                          style={[
                            styles.confidenceBadge,
                            {
                              backgroundColor:
                                candidate.confidence >= 0.8
                                  ? '#4CAF50'
                                  : candidate.confidence >= 0.6
                                  ? '#FF9800'
                                  : '#F44336',
                            },
                          ]}
                        >
                          <Text style={styles.confidenceText}>
                            {Math.round(candidate.confidence * 100)}%
                          </Text>
                        </View>
                        {index === 0 && (
                          <View style={[styles.topMatchBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.topMatchText}>Top Match</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {candidate.sourceLine && (
                      <Text
                        style={[styles.candidateSource, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        From: {candidate.sourceLine}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* WIP Number */}
            {allCandidates.wip.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  WIP Number
                </Text>
                {allCandidates.wip.map((candidate, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.candidateItem,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      selectedWip === candidate.value && {
                        borderColor: colors.primary,
                        backgroundColor: colors.primary + '10',
                      },
                    ]}
                    onPress={() => setSelectedWip(candidate.value)}
                  >
                    <View style={styles.candidateContent}>
                      <Text style={[styles.candidateValue, { color: colors.text }]}>
                        {candidate.value}
                      </Text>
                      <View style={styles.candidateDetails}>
                        <View
                          style={[
                            styles.confidenceBadge,
                            {
                              backgroundColor:
                                candidate.confidence >= 0.8
                                  ? '#4CAF50'
                                  : candidate.confidence >= 0.6
                                  ? '#FF9800'
                                  : '#F44336',
                            },
                          ]}
                        >
                          <Text style={styles.confidenceText}>
                            {Math.round(candidate.confidence * 100)}%
                          </Text>
                        </View>
                        {index === 0 && (
                          <View style={[styles.topMatchBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.topMatchText}>Top Match</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {candidate.sourceLine && (
                      <Text
                        style={[styles.candidateSource, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        From: {candidate.sourceLine}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Job Number */}
            {allCandidates.jobNo.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Job Number
                </Text>
                {allCandidates.jobNo.map((candidate, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.candidateItem,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      selectedJobNo === candidate.value && {
                        borderColor: colors.primary,
                        backgroundColor: colors.primary + '10',
                      },
                    ]}
                    onPress={() => setSelectedJobNo(candidate.value)}
                  >
                    <View style={styles.candidateContent}>
                      <Text style={[styles.candidateValue, { color: colors.text }]}>
                        {candidate.value}
                      </Text>
                      <View style={styles.candidateDetails}>
                        <View
                          style={[
                            styles.confidenceBadge,
                            {
                              backgroundColor:
                                candidate.confidence >= 0.8
                                  ? '#4CAF50'
                                  : candidate.confidence >= 0.6
                                  ? '#FF9800'
                                  : '#F44336',
                            },
                          ]}
                        >
                          <Text style={styles.confidenceText}>
                            {Math.round(candidate.confidence * 100)}%
                          </Text>
                        </View>
                        {index === 0 && (
                          <View style={[styles.topMatchBadge, { backgroundColor: colors.primary }]}>
                            <Text style={styles.topMatchText}>Top Match</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {candidate.sourceLine && (
                      <Text
                        style={[styles.candidateSource, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        From: {candidate.sourceLine}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.backgroundAlt }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.applyButton, { backgroundColor: colors.primary }]}
              onPress={handleApply}
              disabled={!selectedReg && !selectedWip && !selectedJobNo}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  noResultsContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  candidateItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  candidateContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  candidateValue: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  candidateDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  topMatchBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  topMatchText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  candidateSource: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
