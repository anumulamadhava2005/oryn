/**
 * OrynLogo — Standardized brand logo component rendering the official logo asset.
 * Supports cross-platform rendering (iOS, Android, Web) using static assets.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, Image as RNImage } from 'react-native';
import { Image } from 'expo-image';
import { Radius, Colors } from '@/constants/theme';

const LOGO_SRC = require('../../../assets/images/logo.png');

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
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: transparent ? 0 : borderRadius,
          backgroundColor: transparent ? 'transparent' : Colors.background,
        },
        style,
      ]}
    >
      <Image
        source={LOGO_SRC}
        style={{ width: '100%', height: '100%' }}
        contentFit="contain"
        transition={200}
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

