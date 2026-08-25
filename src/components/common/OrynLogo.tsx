/**
 * OrynLogo — Standardized brand logo component rendering the oryn.svg icon.
 * Supports light stroke, embedded dark rectangle, or transparent background options.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Radius } from '@/constants/theme';

const ORYN_SVG_DATA_URI = `data:image/svg+xml;utf8,<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" fill="%232D2D2D"/><path d="M261.674 295.308V210.709M261.674 295.308C261.674 295.308 278.052 303.873 306.342 317.676C334.632 331.479 396.423 332.815 435.88 317.676C475.337 302.537 450.025 200.128 435.88 191.223C421.735 182.318 333.887 184.099 306.342 191.223C278.796 198.347 261.674 210.709 261.674 210.709M261.674 295.308C261.674 295.308 249.017 306.099 228.172 317.676C207.327 329.253 106.079 335.932 78.5334 317.676C50.988 299.421 43.5431 203.69 78.5334 191.223C113.524 178.756 178.293 181.873 215.516 191.223C252.74 200.573 261.674 210.709 261.674 210.709" stroke="%23CFCFCF" stroke-width="25"/></svg>`;

const ORYN_TRANSPARENT_SVG_DATA_URI = `data:image/svg+xml;utf8,<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M261.674 295.308V210.709M261.674 295.308C261.674 295.308 278.052 303.873 306.342 317.676C334.632 331.479 396.423 332.815 435.88 317.676C475.337 302.537 450.025 200.128 435.88 191.223C421.735 182.318 333.887 184.099 306.342 191.223C278.796 198.347 261.674 210.709 261.674 210.709M261.674 295.308C261.674 295.308 249.017 306.099 228.172 317.676C207.327 329.253 106.079 335.932 78.5334 317.676C50.988 299.421 43.5431 203.69 78.5334 191.223C113.524 178.756 178.293 181.873 215.516 191.223C252.74 200.573 261.674 210.709 261.674 210.709" stroke="%23CFCFCF" stroke-width="25"/></svg>`;

interface OrynLogoProps {
  size?: number;
  transparent?: boolean;
  borderRadius?: number;
  style?: ViewStyle;
}

export function OrynLogo({
  size = 48,
  transparent = false,
  borderRadius = Radius.md,
  style,
}: OrynLogoProps) {
  const uri = transparent ? ORYN_TRANSPARENT_SVG_DATA_URI : ORYN_SVG_DATA_URI;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: transparent ? 0 : borderRadius,
        },
        style,
      ]}
    >
      <Image
        source={{ uri }}
        style={{ width: '100%', height: '100%' }}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
