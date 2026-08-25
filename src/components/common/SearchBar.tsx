/**
 * SearchBar — Apple HIG search input with clear button & Ionicons.
 */

import React, { useRef } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

interface Props {
  value: string;
  onChangeText: (t: string) => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({ value, onChangeText, onSubmitEditing, placeholder = 'Search emails…', autoFocus }: Props) {
  const inputRef = useRef<TextInput>(null);

  return (
    <View style={styles.wrapper}>
      <Ionicons name="search" size={17} color={Colors.textMuted} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        style={styles.input}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        clearButtonMode="never"
      />
      {value.length > 0 && (
        <Pressable
          onPress={() => { onChangeText(''); inputRef.current?.focus(); }}
          hitSlop={8}
          style={styles.clearBtn}
        >
          <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing[3],
    gap: Spacing[2],
    height: 38,
  },
  input: {
    flex: 1,
    fontSize: Typography.size.base,
    color: Colors.text,
    paddingVertical: 0,
    letterSpacing: Typography.tracking.tight,
  },
  clearBtn: {
    padding: 2,
  },
});
