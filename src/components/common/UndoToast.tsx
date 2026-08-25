/**
 * UndoToast — Apple HIG styled floating toast with undo action.
 * Auto-dismisses after timeout. Uses Moti for smooth slide-up animation.
 */

import React, { useEffect, useCallback } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';

interface Props {
  visible: boolean;
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
  duration?: number;
}

export function UndoToast({ visible, message, onUndo, onDismiss, duration = 3000 }: Props) {
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [visible, onDismiss, duration]);

  const handleUndo = useCallback(() => {
    onUndo();
    onDismiss();
  }, [onUndo, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <MotiView
          from={{ opacity: 0, translateY: 60 }}
          animate={{ opacity: 1, translateY: 0 }}
          exit={{ opacity: 0, translateY: 60 }}
          transition={{ type: 'spring', damping: 18, stiffness: 200 }}
          style={styles.container}
        >
          <Ionicons name="arrow-undo-outline" size={16} color={Colors.text} />
          <Text style={styles.message} numberOfLines={1}>{message}</Text>
          <Pressable
            onPress={handleUndo}
            hitSlop={8}
            style={({ pressed }) => [styles.undoBtn, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.undoText}>Undo</Text>
          </Pressable>
        </MotiView>
      )}
    </AnimatePresence>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: Spacing[4],
    right: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    ...Shadows.md,
  },
  message: {
    flex: 1,
    fontSize: Typography.size.sm,
    color: Colors.text,
    fontWeight: Typography.weight.medium,
  },
  undoBtn: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
  },
  undoText: {
    fontSize: Typography.size.sm,
    color: Colors.systemBlue,
    fontWeight: Typography.weight.bold,
  },
});
