/**
 * ResponsiveContainer — Center and constrain content on tablets and wide screens
 * while providing fluid, edge-to-edge layout on mobile phones.
 * Adheres to Apple Human Interface Guidelines for reading width and tap ergonomics.
 */

import React from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useResponsive } from '@/hooks/useResponsive';

export interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Custom max width on tablet (defaults to 740px) */
  maxWidth?: number;
  /** Whether to apply responsive horizontal padding (default false, allowing parent/child to control) */
  applyPadding?: boolean;
  /** Centered alignment on tablet (default true) */
  centered?: boolean;
}

export const ResponsiveContainer = React.memo(function ResponsiveContainer({
  children,
  style,
  maxWidth,
  applyPadding = false,
  centered = true,
}: ResponsiveContainerProps) {
  const { isTablet, contentPadding, maxContentWidth } = useResponsive();

  const effectiveMaxWidth = maxWidth ?? maxContentWidth ?? 740;

  return (
    <View
      style={[
        styles.base,
        isTablet && centered && {
          maxWidth: effectiveMaxWidth,
          alignSelf: 'center',
          width: '100%',
        },
        applyPadding && {
          paddingHorizontal: contentPadding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  base: {
    width: '100%',
  },
});
