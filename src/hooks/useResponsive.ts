/**
 * useResponsive — Centralized reactive breakpoint & layout hook for Oryn.
 * Powered by React Native's useWindowDimensions.
 * Supports compact phones, standard phones, phablets, tablets, and large displays.
 */

import { useWindowDimensions, type ViewStyle } from 'react-native';
import { Radius, Spacing } from '@/constants/theme';

export type DeviceType = 'compact' | 'phone' | 'tablet' | 'largeTablet';

export interface ResponsiveInfo {
  width: number;
  height: number;
  scale: number;
  fontScale: number;

  /** True if screen width is < 375 (iPhone SE 1st gen, small Android phones ~320-360px) */
  isCompact: boolean;
  /** True if phone size (< 768) */
  isPhone: boolean;
  /** True if tablet size (>= 768) */
  isTablet: boolean;
  /** True if large tablet or desktop size (>= 1024) */
  isLargeTablet: boolean;
  /** True if width > height */
  isLandscape: boolean;

  /** Semantic device classification */
  deviceType: DeviceType;

  /** Dynamic screen horizontal padding: 12 on compact, 16 on phone, 24 on tablet */
  contentPadding: number;

  /** Max width for centered content on tablet screens: 740 on tablet, 840 on large tablet, undefined on phone */
  maxContentWidth: number | undefined;

  /** Helper to select value based on device type */
  select: <T>(options: {
    compact?: T;
    phone: T;
    tablet?: T;
    largeTablet?: T;
  }) => T;

  /** Helper to compute column count for grids */
  getColumns: (phoneCols: number, tabletCols: number, largeTabletCols?: number) => number;

  /** Helper to compute item width for grids */
  getGridItemWidth: (columns: number, gap?: number, padding?: number) => number;

  /** Responsive bottom sheet / modal card styles */
  modalSheetStyles: {
    overlay: ViewStyle;
    sheet: ViewStyle;
  };
}

export function useResponsive(): ResponsiveInfo {
  const { width, height, scale, fontScale } = useWindowDimensions();

  const isCompact = width < 375;
  const isPhone = width < 768;
  const isTablet = width >= 768;
  const isLargeTablet = width >= 1024;
  const isLandscape = width > height;

  const deviceType: DeviceType = isLargeTablet
    ? 'largeTablet'
    : isTablet
    ? 'tablet'
    : isCompact
    ? 'compact'
    : 'phone';

  const contentPadding = isCompact ? Spacing[3] : isTablet ? Spacing[6] : Spacing[4];
  const maxContentWidth = isLargeTablet ? 840 : isTablet ? 740 : undefined;

  const select = <T>(options: {
    compact?: T;
    phone: T;
    tablet?: T;
    largeTablet?: T;
  }): T => {
    if (isLargeTablet && options.largeTablet !== undefined) return options.largeTablet;
    if (isTablet && options.tablet !== undefined) return options.tablet;
    if (isCompact && options.compact !== undefined) return options.compact;
    return options.phone;
  };

  const getColumns = (
    phoneCols: number,
    tabletCols: number,
    largeTabletCols?: number,
  ): number => {
    if (isLargeTablet && largeTabletCols !== undefined) return largeTabletCols;
    if (isTablet) return tabletCols;
    return phoneCols;
  };

  const getGridItemWidth = (
    columns: number,
    gap: number = 12,
    padding: number = contentPadding,
  ): number => {
    const effectiveWidth = maxContentWidth ? Math.min(width, maxContentWidth) : width;
    const totalGap = gap * (columns - 1);
    const totalPadding = padding * 2;
    return Math.floor((effectiveWidth - totalPadding - totalGap) / columns);
  };

  const modalSheetStyles = {
    overlay: isTablet
      ? ({
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.72)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: Spacing[6],
        } as ViewStyle)
      : ({
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.72)',
          justifyContent: 'flex-end',
        } as ViewStyle),
    sheet: isTablet
      ? ({
          width: '100%',
          maxWidth: 560,
          borderRadius: Radius['2xl'],
          maxHeight: '85%',
          overflow: 'hidden',
          alignSelf: 'center',
        } as ViewStyle)
      : ({
          width: '100%',
          borderTopLeftRadius: Radius['2xl'],
          borderTopRightRadius: Radius['2xl'],
          maxHeight: '88%',
          overflow: 'hidden',
        } as ViewStyle),
  };

  return {
    width,
    height,
    scale,
    fontScale,
    isCompact,
    isPhone,
    isTablet,
    isLargeTablet,
    isLandscape,
    deviceType,
    contentPadding,
    maxContentWidth,
    select,
    getColumns,
    getGridItemWidth,
    modalSheetStyles,
  };
}
