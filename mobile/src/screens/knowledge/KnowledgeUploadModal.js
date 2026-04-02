import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native'
import * as DocumentPicker from 'expo-document-picker'
import { knowledgeService } from '../../services/knowledge'
import { colors } from '../../constants/colors'

export default function KnowledgeUploadModal({
  visible,
  userId,
  hubId,
  onClose,
  onUploaded,
}) {
  const [tab, setTab] = useState("pdf"); // 'pdf' | 'url'
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [pickedFile, setPickedFile] = useState(null);

  const handlePickPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.[0]) {
        setPickedFile(result.assets[0]);
      }
    } catch (e) {
      Alert.alert("Error", "Could not pick file");
    }
  };

  const handleUploadPDF = async () => {
    if (!pickedFile) return;
    setLoading(true);
    console.log(
      "[Upload] Starting PDF upload:",
      pickedFile.uri,
      "hubId:",
      hubId
    );
    try {
      await knowledgeService.uploadPDF(
        userId,
        hubId,
        pickedFile.uri,
        pickedFile.name
      );
      console.log("[Upload] PDF upload success");
      onUploaded();
      onClose();
      setPickedFile(null);
    } catch (e) {
      console.error("[Upload] PDF upload error:", e);
      Alert.alert("Upload failed", e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleUploadURL = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      await knowledgeService.uploadURL(userId, hubId, url.trim());
      onUploaded();
      onClose();
      setUrl("");
    } catch (e) {
      Alert.alert("Upload failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Add source</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabs}>
            {['pdf', 'url'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                  {t.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'pdf' ? (
            <View style={styles.body}>
              <TouchableOpacity style={styles.filePicker} onPress={handlePickPDF}>
                {pickedFile ? (
                  <Text style={styles.fileName} numberOfLines={1}>{pickedFile.name}</Text>
                ) : (
                  <Text style={styles.filePickerText}>Tap to select a PDF</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.uploadBtn, (!pickedFile || loading) && styles.uploadBtnDisabled]}
                onPress={handleUploadPDF}
                disabled={!pickedFile || loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.text.primary} size="small" />
                  : <Text style={styles.uploadBtnText}>Upload & process</Text>
                }
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.body}>
              <TextInput
                style={styles.urlInput}
                value={url}
                onChangeText={setUrl}
                placeholder="https://..."
                placeholderTextColor={colors.text.tertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <TouchableOpacity
                style={[styles.uploadBtn, (!url.trim() || loading) && styles.uploadBtnDisabled]}
                onPress={handleUploadURL}
                disabled={!url.trim() || loading}
              >
                {loading
                  ? <ActivityIndicator color={colors.text.primary} size="small" />
                  : <Text style={styles.uploadBtnText}>Fetch & process</Text>
                }
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.background.secondary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border.primary,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.primary,
  },
  cancel: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  tabBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
  },
  tabBtnActive: {
    backgroundColor: colors.modules.knowledge + '20',
    borderColor: colors.modules.knowledge + '60',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  tabLabelActive: {
    color: colors.modules.knowledge,
  },
  body: {
    paddingHorizontal: 20,
    gap: 12,
  },
  filePicker: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    borderStyle: 'dashed',
    padding: 20,
    alignItems: 'center',
  },
  filePickerText: {
    color: colors.text.tertiary,
    fontSize: 14,
  },
  fileName: {
    color: colors.text.primary,
    fontSize: 14,
  },
  urlInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: colors.border.primary,
    padding: 14,
    color: colors.text.primary,
    fontSize: 14,
  },
  uploadBtn: {
    backgroundColor: colors.modules.knowledge,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  uploadBtnDisabled: {
    opacity: 0.4,
  },
  uploadBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
})