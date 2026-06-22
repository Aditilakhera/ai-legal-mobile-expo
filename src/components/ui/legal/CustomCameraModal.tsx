import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
// @ts-ignore
import { Ionicons } from '@expo/vector-icons';
import { useThemeContext } from '@/providers';
import * as Linking from 'expo-linking';

export interface CustomCameraModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (uri: string, mode: 'image' | 'document' | 'paper') => void;
}

type CaptureMode = 'image' | 'document' | 'paper';

export const CustomCameraModal: React.FC<CustomCameraModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  const { theme } = useThemeContext();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);
  
  const [captureMode, setCaptureMode] = useState<CaptureMode>('image');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Request permissions when visible changes to true
  useEffect(() => {
    if (visible && (!permission || !permission.granted)) {
      requestPermission();
    }
  }, [visible, permission]);

  if (!visible) return null;

  // Handle permission denied screen
  if (!permission) {
    return null; // Loading permission status
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <SafeAreaView style={[styles.permissionContainer, { backgroundColor: theme.background }]}>
          <View style={styles.permissionContent}>
            <Ionicons name="camera-outline" size={64} color={theme.danger || '#EF4444'} />
            <Text style={[styles.permissionTitle, { color: theme.textPrimary }]}>
              Camera Permission Required
            </Text>
            <Text style={[styles.permissionDesc, { color: theme.textSecondary }]}>
              Please grant camera permissions to scan documents and capture images of legal briefs.
            </Text>
            <TouchableOpacity
              onPress={() => Linking.openSettings()}
              style={[styles.settingsBtn, { backgroundColor: theme.primary || '#6D5DFC' }]}
            >
              <Text style={styles.settingsBtnText}>Open Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.backBtn}>
              <Text style={[styles.backBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  const handleCapture = async () => {
    if (cameraRef.current && !isCapturing) {
      try {
        setIsCapturing(true);
        const options = {
          quality: 0.85,
        };
        const photo = await cameraRef.current.takePictureAsync(options);
        if (photo && photo.uri) {
          setPhotoUri(photo.uri);
        }
      } catch (err) {
        console.error('[CustomCameraModal] Capture error:', err);
        Alert.alert('Capture Error', 'Failed to capture image. Please try again.');
      } finally {
        setIsCapturing(false);
      }
    }
  };

  const handleUsePhoto = () => {
    if (photoUri) {
      onConfirm(photoUri, captureMode);
      setPhotoUri(null);
      onClose();
    }
  };

  const handleRetake = () => {
    setPhotoUri(null);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.container}>
        {photoUri ? (
          // Preview State
          <View style={styles.previewContainer}>
            <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="contain" />
            
            {/* Mode Indicator Overlay */}
            <View style={styles.previewBadge}>
              <Text style={styles.previewBadgeText}>
                {captureMode === 'image' ? '🖼 IMAGE PREVIEW' : captureMode === 'document' ? '📎 DOCUMENT PREVIEW' : '📄 PAPER SCAN PREVIEW'}
              </Text>
            </View>

            <View style={styles.previewBottomActions}>
              <TouchableOpacity onPress={handleRetake} style={styles.actionBtn}>
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Retake</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleUsePhoto} style={[styles.actionBtn, styles.usePhotoBtn]}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Use Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Viewfinder State
          <View style={styles.viewfinderContainer}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              ref={cameraRef}
              facing="back"
            />

            {/* Viewfinder overlay corners for scanning */}
            {captureMode !== 'image' && (
              <View style={styles.scanningFrameContainer}>
                <View style={styles.scanningFrame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                  <Text style={styles.scanningText}>
                    {captureMode === 'document' ? 'Align Document Edge' : 'Position Paper to Scan'}
                  </Text>
                </View>
              </View>
            )}

            {/* Header controls */}
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {captureMode === 'image' ? 'Capture Image' : captureMode === 'document' ? 'Capture Document' : 'Scan Paper'}
              </Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Camera Bottom Panel */}
            <View style={styles.cameraBottomPanel}>
              {/* Capture Mode Tabs */}
              <View style={styles.modeTabs}>
                <TouchableOpacity
                  onPress={() => setCaptureMode('image')}
                  style={[styles.modeTab, captureMode === 'image' && styles.activeModeTab]}
                >
                  <Text style={[styles.modeTabText, captureMode === 'image' && styles.activeModeTabText]}>
                    Photo
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCaptureMode('document')}
                  style={[styles.modeTab, captureMode === 'document' && styles.activeModeTab]}
                >
                  <Text style={[styles.modeTabText, captureMode === 'document' && styles.activeModeTabText]}>
                    Document
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCaptureMode('paper')}
                  style={[styles.modeTab, captureMode === 'paper' && styles.activeModeTab]}
                >
                  <Text style={[styles.modeTabText, captureMode === 'paper' && styles.activeModeTabText]}>
                    Scan
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Shutter & Controls */}
              <View style={styles.shutterRow}>
                <View style={{ width: 44 }} />
                
                <TouchableOpacity
                  onPress={handleCapture}
                  style={styles.shutterOuter}
                  disabled={isCapturing}
                >
                  {isCapturing ? (
                    <ActivityIndicator size="large" color="#6D5DFC" />
                  ) : (
                    <View style={styles.shutterInner} />
                  )}
                </TouchableOpacity>

                <View style={{ width: 44 }} />
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
    textAlign: 'center',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  settingsBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingsBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  backBtn: {
    paddingVertical: 12,
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewfinderContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    zIndex: 10,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scanningFrameContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  scanningFrame: {
    width: '80%',
    aspectRatio: 0.7,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#6D5DFC',
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanningText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    position: 'absolute',
    bottom: 24,
  },
  cameraBottomPanel: {
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingBottom: 24,
    paddingTop: 12,
  },
  modeTabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 16,
  },
  modeTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  activeModeTab: {
    backgroundColor: 'rgba(109, 93, 252, 0.25)',
  },
  modeTabText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '600',
  },
  activeModeTabText: {
    color: '#FFFFFF',
  },
  shutterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFF',
  },
  previewContainer: {
    flex: 1,
    justifyContent: 'space-between',
    backgroundColor: '#111827',
  },
  previewImage: {
    flex: 1,
    width: '100%',
  },
  previewBadge: {
    position: 'absolute',
    top: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(109, 93, 252, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  previewBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  previewBottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingVertical: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#374151',
  },
  usePhotoBtn: {
    backgroundColor: '#10B981',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
