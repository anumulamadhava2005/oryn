/**
 * OrynLiveCodeEngine — Custom Provider for Over-The-Air Raw Code Updates.
 *
 * Wraps the application root:
 * - Checks mint_vps for new JavaScript/TypeScript code updates (< 3ms check)
 * - Downloads and atomically installs raw code bundles via native Kotlin bridge
 * - Hot-reloads React Native without rebuilding APK
 * - Self-healing crash guard protects the app from bad code pushes
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, AppState, AppStateStatus, Pressable, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
// @ts-ignore
import resolveAssetSource from 'react-native/Libraries/Image/resolveAssetSource';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

// Ensure assets & fonts resolve correctly from APK when running from dynamic local bundle
if (Platform.OS === 'android') {
  try {
    resolveAssetSource.setCustomSourceTransformer((resolver: any) => {
      if (!resolver.isLoadedFromServer()) {
        return resolver.resourceIdentifierWithoutScale();
      }
      return null;
    });
  } catch {}
}
import {
  checkForCodeUpdate,
  downloadAndInstallCodeUpdate,
  reloadApp,
  markBootSuccess,
  getNativeBundleMetadata,
  rollbackToFactoryDefault,
  CodeBundleMetadata,
} from '@/services/codeUpdateService';

interface CodeUpdateContextValue {
  metadata: CodeBundleMetadata | null;
  isChecking: boolean;
  isDownloading: boolean;
  updateReady: boolean;
  checkForUpdate: () => Promise<void>;
  applyUpdateAndReload: () => Promise<void>;
  rollbackToFactory: () => Promise<void>;
}

const CodeUpdateContext = createContext<CodeUpdateContextValue | null>(null);

export function useCodeUpdate(): CodeUpdateContextValue {
  const ctx = useContext(CodeUpdateContext);
  if (!ctx) {
    throw new Error('useCodeUpdate must be used within an OrynLiveCodeEngine');
  }
  return ctx;
}

interface Props {
  children: React.ReactNode;
}

export function OrynLiveCodeEngine({ children }: Props) {
  const [metadata, setMetadata] = useState<CodeBundleMetadata | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [updateReady, setUpdateReady] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerText, setBannerText] = useState('');

  const bannerAnim = useRef(new Animated.Value(-80)).current;
  const isCheckingRef = useRef(false);

  // Animate banner in/out
  const showBanner = useCallback((text: string) => {
    setBannerText(text);
    setBannerVisible(true);
    Animated.spring(bannerAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
  }, [bannerAnim]);

  const hideBanner = useCallback(() => {
    Animated.timing(bannerAnim, {
      toValue: -80,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setBannerVisible(false));
  }, [bannerAnim]);

  // Main check and install flow
  const runUpdateCheck = useCallback(async (silent = true) => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    setIsChecking(true);

    try {
      const meta = await getNativeBundleMetadata();
      setMetadata(meta);

      const result = await checkForCodeUpdate();

      if (result.updateAvailable && (result.hash || result.targetHash)) {
        setIsDownloading(true);
        if (!silent) {
          showBanner(result.isPatch ? '⚡ Applying instant delta patch...' : '⚡ Downloading live code update...');
        }

        const installed = await downloadAndInstallCodeUpdate(result);

        if (installed) {
          setUpdateReady(true);
          showBanner('⚡ Code update installed! Restarting...');

          // Smooth fast reload
          setTimeout(async () => {
            await reloadApp();
          }, 400);
        }
      } else if (!silent) {
        showBanner('✅ App code is up to date');
        setTimeout(hideBanner, 2500);
      }
    } catch (err) {
      console.warn('[OrynLiveCodeEngine] Update check failed:', err);
    } finally {
      setIsChecking(false);
      setIsDownloading(false);
      isCheckingRef.current = false;
    }
  }, [showBanner, hideBanner]);

  // Pre-load Ionicons font to ensure icons render immediately
  useEffect(() => {
    Font.loadAsync(Ionicons.font).catch(() => {});
  }, []);

  // On mount: mark boot success after 4s & run background check immediately
  useEffect(() => {
    const bootTimer = setTimeout(() => {
      markBootSuccess().catch(() => {});
    }, 4000);

    // Instant update check on launch (0ms delay)
    runUpdateCheck(true);

    return () => {
      clearTimeout(bootTimer);
    };
  }, [runUpdateCheck]);

  // Check on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        runUpdateCheck(true);
      }
    });
    return () => sub.remove();
  }, [runUpdateCheck]);

  const applyUpdateAndReload = useCallback(async () => {
    await reloadApp();
  }, []);

  const rollbackToFactory = useCallback(async () => {
    await rollbackToFactoryDefault();
  }, []);

  const contextValue: CodeUpdateContextValue = {
    metadata,
    isChecking,
    isDownloading,
    updateReady,
    checkForUpdate: () => runUpdateCheck(false),
    applyUpdateAndReload,
    rollbackToFactory,
  };

  return (
    <CodeUpdateContext.Provider value={contextValue}>
      <View style={styles.container}>
        {children}

        {bannerVisible && (
          <Animated.View style={[styles.banner, { transform: [{ translateY: bannerAnim }] }]}>
            <View style={styles.bannerContent}>
              <Ionicons name="flash" size={16} color={Colors.systemYellow} />
              <Text style={styles.bannerText}>{bannerText}</Text>
              {updateReady && (
                <Pressable
                  onPress={applyUpdateAndReload}
                  style={styles.reloadBtn}
                  hitSlop={8}
                >
                  <Text style={styles.reloadBtnText}>Restart Now</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>
        )}
      </View>
    </CodeUpdateContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  banner: {
    position: 'absolute',
    top: 50,
    left: Spacing[4],
    right: Spacing[4],
    zIndex: 99999,
    backgroundColor: '#1E1E2E',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#3E3E5E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing[4],
    gap: Spacing[2],
  },
  bannerText: {
    flex: 1,
    fontSize: Typography.size.xs,
    color: '#FFFFFF',
    fontWeight: Typography.weight.semibold,
  },
  reloadBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  reloadBtnText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: Typography.weight.bold,
  },
});
