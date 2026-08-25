/**
 * Typography component — typed text variants used across the app.
 */

import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

export type TextVariant =
  | 'hero'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyBold'
  | 'caption'
  | 'small'
  | 'code'
  | 'overline';

interface Props {
  variant?: TextVariant;
  color?: string;
  style?: TextStyle | TextStyle[];
  children: React.ReactNode;
  numberOfLines?: number;
  onPress?: () => void;
}

const STYLES: Record<TextVariant, TextStyle> = {
  hero: {
    fontSize: Typography.size['3xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    letterSpacing: Typography.tracking.tight,
    lineHeight: Typography.size['3xl'] * Typography.leading.tight,
  },
  title: {
    fontSize: Typography.size['2xl'],
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    letterSpacing: Typography.tracking.tight,
  },
  heading: {
    fontSize: Typography.size.xl,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  subheading: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  body: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.regular,
    color: Colors.text,
    lineHeight: Typography.size.base * Typography.leading.normal,
  },
  bodyBold: {
    fontSize: Typography.size.base,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
    lineHeight: Typography.size.base * Typography.leading.normal,
  },
  caption: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.regular,
    color: Colors.textSecondary,
    lineHeight: Typography.size.sm * Typography.leading.normal,
  },
  small: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.regular,
    color: Colors.textMuted,
  },
  code: {
    fontSize: Typography.size.sm,
    fontFamily: 'monospace' as const,
    color: Colors.accentLight,
    backgroundColor: Colors.accentFaded,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  overline: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: Typography.tracking.widest,
  },
};

export function Txt({
  variant = 'body',
  color,
  style,
  children,
  numberOfLines,
  onPress,
}: Props) {
  const base = STYLES[variant];
  const override: TextStyle = color ? { color } : {};
  return (
    <Text
      style={[base, override, style]}
      numberOfLines={numberOfLines}
      onPress={onPress}
    >
      {children}
    </Text>
  );
}
