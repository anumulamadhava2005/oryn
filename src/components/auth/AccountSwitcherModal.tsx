/**
 * AccountSwitcherModal — Bottom sheet modal for switching between college accounts.
 */

import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { useAccountsStore } from '@/store/accounts';
import { hapticMedium, hapticLight } from '@/utils/haptics';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAddAccount: () => void;
}

export function AccountSwitcherModal({ visible, onClose, onAddAccount }: Props) {
  const { accounts, activeAccountId, switchAccount } = useAccountsStore();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.dragHandle} />
          <Text style={styles.title}>Switch Account</Text>

          <View style={styles.accountList}>
            {accounts.map((acc) => {
              const isActive = acc.id === activeAccountId;
              return (
                <Pressable
                  key={acc.id}
                  onPress={() => {
                    hapticMedium();
                    switchAccount(acc.id);
                    onClose();
                  }}
                  style={[styles.accountRow, isActive && styles.accountRowActive]}
                >
                  {acc.user.photo ? (
                    <Image source={{ uri: acc.user.photo }} style={styles.avatar} />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarChar}>{acc.user.name.charAt(0)}</Text>
                    </View>
                  )}

                  <View style={styles.accInfo}>
                    <Text style={styles.accName}>{acc.user.name}</Text>
                    <Text style={styles.accEmail}>{acc.user.email}</Text>
                  </View>

                  {isActive && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.systemBlue} />
                  )}
                </Pressable>
              );
            })}
          </View>

          <Pressable
            onPress={() => {
              hapticLight();
              onClose();
              onAddAccount();
            }}
            style={styles.addBtn}
          >
            <Ionicons name="person-add-outline" size={18} color={Colors.systemBlue} />
            <Text style={styles.addBtnText}>Add College Account</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing[4],
    gap: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
  },
  title: {
    fontSize: Typography.size.md,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  accountList: {
    gap: Spacing[2],
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[3],
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceHigh,
    gap: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accountRowActive: {
    borderColor: Colors.systemBlue,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.systemBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarChar: {
    fontSize: Typography.size.md,
    color: '#FFF',
    fontWeight: Typography.weight.bold,
  },
  accInfo: {
    flex: 1,
  },
  accName: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  accEmail: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceHigh,
  },
  addBtnText: {
    fontSize: Typography.size.sm,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
  },
});
