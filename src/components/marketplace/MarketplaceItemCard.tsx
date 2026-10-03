import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { hapticLight, hapticSuccess } from '@/utils/haptics';
import type { MarketplaceItem } from '@/store/marketplaceStore';

interface MarketplaceItemCardProps {
  item: MarketplaceItem;
  currentUserId?: string | null;
  onMarkSold: (id: string) => void;
  onDelete: (id: string) => void;
}

export function MarketplaceItemCard({
  item,
  currentUserId,
  onMarkSold,
  onDelete,
}: MarketplaceItemCardProps) {
  const isOwner = currentUserId && (item.sellerId === currentUserId || item.sellerEmail?.includes(currentUserId));
  const isSold = item.status === 'sold';

  const handleContact = () => {
    hapticLight();
    const contactOptions: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' }[] = [
      { text: 'Cancel', style: 'cancel' },
    ];

    if (item.sellerContact) {
      contactOptions.unshift({
        text: `WhatsApp (${item.sellerContact})`,
        onPress: () => {
          const cleanPhone = item.sellerContact!.replace(/[^0-9]/g, '');
          const msg = encodeURIComponent(`Hi ${item.sellerName}, I saw your listing for "${item.title}" on Oryn Campus Marketplace.`);
          Linking.openURL(`whatsapp://send?phone=${cleanPhone}&text=${msg}`).catch(() => {
            Linking.openURL(`https://wa.me/${cleanPhone}?text=${msg}`);
          });
        },
      });
      contactOptions.unshift({
        text: `Call (${item.sellerContact})`,
        onPress: () => {
          Linking.openURL(`tel:${item.sellerContact}`);
        },
      });
    }

    if (item.sellerEmail) {
      contactOptions.unshift({
        text: `Email (${item.sellerEmail})`,
        onPress: () => {
          Linking.openURL(`mailto:${item.sellerEmail}?subject=${encodeURIComponent(`[Oryn Marketplace] ${item.title}`)}`);
        },
      });
    }

    Alert.alert(
      `Contact ${item.sellerName}`,
      `Verified IIITDM student (${item.sellerRoll || 'Student'}). Coordinate physical pickup on campus.`,
      contactOptions
    );
  };

  return (
    <View style={[styles.card, isSold && styles.cardSold]}>
      <View style={styles.cardHeader}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="pricetag-outline" size={32} color={Colors.textMuted} />
          </View>
        )}

        {/* Condition Badge */}
        <View style={styles.conditionBadge}>
          <Text style={styles.conditionText}>{item.condition}</Text>
        </View>

        {/* Price Tag */}
        <View style={[styles.priceBadge, item.price === 0 && styles.freeBadge]}>
          <Text style={[styles.priceText, item.price === 0 && styles.freeText]}>
            {item.price === 0 ? 'FREE' : `₹${item.price.toLocaleString('en-IN')}`}
          </Text>
        </View>

        {isSold && (
          <View style={styles.soldOverlay}>
            <Text style={styles.soldText}>SOLD</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.categoryRow}>
          <Text style={styles.categoryText}>{item.category.toUpperCase()}</Text>
          <Text style={styles.dateText}>
            {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>

        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>

        <Text style={styles.description} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={13} color={Colors.textMuted} style={{ marginRight: 4 }} />
          <Text style={styles.locationText} numberOfLines={1}>
            {item.location}
          </Text>
        </View>

        <View style={styles.sellerRow}>
          <View style={styles.sellerAvatar}>
            <Text style={styles.sellerLetter}>{item.sellerName.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.sellerName} numberOfLines={1}>
              {item.sellerName}
            </Text>
            <Text style={styles.sellerRoll}>{item.sellerRoll} • Verified Student</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          {isSold ? (
            <View style={styles.soldBanner}>
              <Ionicons name="checkmark-done" size={14} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={styles.soldBannerText}>Item Handed Over</Text>
            </View>
          ) : isOwner ? (
            <View style={styles.ownerActions}>
              <Pressable
                style={styles.markSoldBtn}
                onPress={() => {
                  hapticSuccess();
                  onMarkSold(item.id);
                }}
              >
                <Ionicons name="checkmark-circle-outline" size={14} color="#10B981" style={{ marginRight: 4 }} />
                <Text style={styles.markSoldText}>Mark as Sold</Text>
              </Pressable>

              <Pressable
                style={styles.deleteBtn}
                onPress={() => {
                  hapticLight();
                  onDelete(item.id);
                }}
              >
                <Ionicons name="trash-outline" size={14} color="#EF4444" />
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.contactBtn} onPress={handleContact}>
              <Ionicons name="chatbubbles-outline" size={15} color="#000000" style={{ marginRight: 6 }} />
              <Text style={styles.contactBtnText}>Contact Seller</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing[4],
  },
  cardSold: {
    opacity: 0.7,
  },
  cardHeader: {
    height: 170,
    width: '100%',
    position: 'relative',
    backgroundColor: Colors.surface,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceHigh,
  },
  conditionBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  conditionText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  priceBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  freeBadge: {
    backgroundColor: '#10B981',
  },
  priceText: {
    fontSize: 13,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
  freeText: {
    color: '#FFFFFF',
  },
  soldOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldText: {
    fontSize: 20,
    fontWeight: Typography.weight.bold,
    color: '#FFFFFF',
    letterSpacing: 2,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  content: {
    padding: Spacing[3.5],
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: Typography.weight.bold,
    color: Colors.accent,
    letterSpacing: 0.8,
  },
  dateText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  title: {
    fontSize: 15,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  description: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.borderMuted,
    marginBottom: 12,
  },
  sellerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerLetter: {
    fontSize: 11,
    fontWeight: Typography.weight.bold,
    color: Colors.text,
  },
  sellerName: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: Colors.text,
  },
  sellerRoll: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  actionRow: {
    marginTop: 2,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderRadius: Radius.full,
  },
  contactBtnText: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: '#000000',
  },
  ownerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  markSoldBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  markSoldText: {
    fontSize: 12,
    fontWeight: Typography.weight.bold,
    color: '#10B981',
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceHigh,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  soldBannerText: {
    fontSize: 12,
    fontWeight: Typography.weight.semibold,
    color: Colors.textMuted,
  },
});
