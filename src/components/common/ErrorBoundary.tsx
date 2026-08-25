/**
 * ErrorBoundary — React error boundary that catches render crashes.
 * Shows a friendly recovery UI instead of crashing the app.
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.iconWrap}>
            <Ionicons name="bug-outline" size={40} color={Colors.systemOrange} />
          </View>
          <Text style={styles.title}>
            {this.props.fallbackTitle ?? 'Something went wrong'}
          </Text>
          <Text style={styles.subtitle}>
            An unexpected error occurred. Try again or restart the app.
          </Text>
          {this.state.error && (
            <ScrollView style={styles.errorBox} contentContainerStyle={styles.errorBoxContent}>
              <Text style={styles.errorText}>
                {this.state.error.message}
              </Text>
            </ScrollView>
          )}
          <Pressable
            onPress={this.handleRetry}
            style={({ pressed }) => [
              styles.retryBtn,
              pressed && styles.retryBtnPressed,
            ]}
          >
            <Ionicons name="refresh-outline" size={16} color="#FFF" />
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[8],
    gap: Spacing[3],
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.warningFaded,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[2],
  },
  title: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.size.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  errorBox: {
    maxHeight: 80,
    width: '100%',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing[2],
  },
  errorBoxContent: {
    padding: Spacing[3],
  },
  errorText: {
    fontSize: Typography.size.xs,
    color: Colors.systemRed,
    fontFamily: 'monospace',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.systemBlue,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    marginTop: Spacing[3],
  },
  retryBtnPressed: {
    opacity: 0.85,
  },
  retryText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.semibold,
    color: '#FFF',
  },
});
