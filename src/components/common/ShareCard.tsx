/**
 * ShareCard — Beautiful social media image generator for campus email notices using react-native-view-shot.
 * Captures branded image cards for sharing in WhatsApp student groups or Instagram stories.
 */

import React, { useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Share } from 'react-native';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { Ionicons } from '@expo/vector-icons';

import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { CategoryBadge } from '@/components/ui/Badge';
import { OrynLogo } from '@/components/common/OrynLogo';
import { hapticMedium } from '@/utils/haptics';
import type { ParsedEmail } from '@/types/email';

interface Props {
  email: ParsedEmail;
}

export function ShareCardButton({ email }: Props) {
  const viewShotRef = useRef<any>(null);

  const handleShare = useCallback(async () => {
    hapticMedium();
    try {
      if (viewShotRef.current) {
        const uri = await captureRef(viewShotRef, {
          format: 'png',
          quality: 0.95,
        });

        await Share.share({
          url: uri,
          title: `Oryn Notice: ${email.subject}`,
          message: `[Campus Notice via Oryn]\n\n${email.subject}\n\nFrom: ${email.sender}\n${email.deadlineLabel ? `Deadline: ${email.deadlineLabel}\n` : ''}\nShared via Oryn Campus Inbox`,
        });
      }
    } catch (error) {
      console.error('[ShareCard] Share failed:', error);
    }
  }, [email]);

  return (
    <View style={styles.wrap}>
      <View style={styles.offscreenContainer}>
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.95 }} style={styles.card}>
          <View style={styles.badgeRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <OrynLogo size={20} borderRadius={4} />
              <Text style={styles.brandTitle}>ORYN CAMPUS NOTICE</Text>
            </View>
            <CategoryBadge category={email.category} />
          </View>
          <Text style={styles.subject}>{email.subject}</Text>
          <Text style={styles.sender}>Sender: {email.sender}</Text>
          {email.deadlineLabel && (
            <View style={styles.deadlineBox}>
              <Ionicons name="alarm" size={16} color={Colors.systemOrange} />
              <Text style={styles.deadlineText}>{email.deadlineLabel}</Text>
            </View>
          )}
          <Text style={styles.snippet} numberOfLines={3}>{email.snippet}</Text>
          <View style={styles.footer}>
            <Text style={styles.footerTag}>Oryn — Intelligent Academic Inbox</Text>
          </View>
        </ViewShot>
      </View>

      <Pressable onPress={handleShare} style={styles.shareBtn}>
        <Ionicons name="share-social-outline" size={16} color={Colors.systemBlue} />
        <Text style={styles.shareBtnText}>Share Notice Card</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: Spacing[2],
  },
  offscreenContainer: {
    position: 'absolute',
    left: -9999,
    top: -9999,
  },
  card: {
    width: 340,
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing[5],
    gap: Spacing[3],
    borderWidth: 1.5,
    borderColor: Colors.systemBlue + '60',
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.systemBlue,
    letterSpacing: Typography.tracking.widest,
  },
  subject: {
    fontSize: Typography.size.lg,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    lineHeight: 24,
  },
  sender: {
    fontSize: Typography.size.xs,
    color: Colors.textMuted,
  },
  deadlineBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.warningFaded,
    paddingHorizontal: Spacing[3],
    paddingVertical: 6,
    borderRadius: Radius.md,
    alignSelf: 'flex-start',
  },
  deadlineText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.bold,
    color: Colors.systemOrange,
  },
  snippet: {
    fontSize: Typography.size.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  footer: {
    marginTop: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing[2],
  },
  footerTag: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: 'center',
    fontWeight: Typography.weight.semibold,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radius.lg,
    paddingVertical: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  shareBtnText: {
    fontSize: Typography.size.xs,
    fontWeight: Typography.weight.semibold,
    color: Colors.systemBlue,
  },
});
