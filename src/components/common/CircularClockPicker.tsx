/**
 * CircularClockPicker — Apple HIG / Oryn Dark Themed Analog Clock Time Picker.
 *
 * Allows users to drag around a circular dial to pick:
 * 1. First Hours (1 to 12) with auto-transition on touch release to Minutes
 * 2. Then Minutes (00 to 59)
 * With continuous touch tracking, haptic pulses, and AM/PM toggle.
 * 100% pure React Native (zero native binary dependencies).
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Pressable,
  GestureResponderEvent,
} from 'react-native';
import { Typography, Radius } from '@/constants/theme';
import { hapticLight, hapticSuccess } from '@/utils/haptics';

export interface CircularClockPickerProps {
  hour12: number; // 1 - 12
  minute: number; // 0 - 59
  ampm: 'AM' | 'PM';
  onChange: (hour12: number, minute: number, ampm: 'AM' | 'PM') => void;
}

type ClockMode = 'hours' | 'minutes';

const DIAL_SIZE = 250;
const RADIUS = DIAL_SIZE / 2; // 125
const NUMBER_RADIUS = 92;
const HAND_LENGTH = 84;
const BUBBLE_SIZE = 34;

const HOURS_12 = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MAJOR_MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

export function CircularClockPicker({
  hour12,
  minute,
  ampm,
  onChange,
}: CircularClockPickerProps) {
  const [mode, setMode] = useState<ClockMode>('hours');
  const dialRef = useRef<View>(null);
  const dialLayoutRef = useRef<{ pageX: number; pageY: number }>({ pageX: 0, pageY: 0 });

  const lastHourRef = useRef(hour12);
  const lastMinuteRef = useRef(minute);

  useEffect(() => {
    lastHourRef.current = hour12;
  }, [hour12]);

  useEffect(() => {
    lastMinuteRef.current = minute;
  }, [minute]);

  const updateDialPosition = () => {
    if (dialRef.current) {
      dialRef.current.measure((_x, _y, _width, _height, pageX, pageY) => {
        dialLayoutRef.current = { pageX, pageY };
      });
    }
  };

  /**
   * Calculates angle and updates hour or minute from touch coordinates
   */
  const handleTouch = useCallback(
    (e: GestureResponderEvent, isEnd = false) => {
      const { pageX, pageY } = e.nativeEvent;
      const dialX = dialLayoutRef.current.pageX || 0;
      const dialY = dialLayoutRef.current.pageY || 0;

      // Coordinate relative to dial center
      const touchX = pageX - dialX - RADIUS;
      const touchY = pageY - dialY - RADIUS;

      // Angle in degrees from 12 o'clock (clockwise)
      let deg = Math.atan2(touchY, touchX) * (180 / Math.PI) + 90;
      if (deg < 0) deg += 360;

      if (mode === 'hours') {
        let h = Math.round(deg / 30) % 12;
        if (h === 0) h = 12;

        if (h !== lastHourRef.current) {
          lastHourRef.current = h;
          hapticLight();
          onChange(h, lastMinuteRef.current, ampm);
        }

        if (isEnd) {
          // User finished dragging hour -> auto-transition to minutes!
          setTimeout(() => {
            hapticSuccess();
            setMode('minutes');
          }, 150);
        }
      } else {
        const m = Math.round(deg / 6) % 60;
        if (m !== lastMinuteRef.current) {
          lastMinuteRef.current = m;
          hapticLight();
          onChange(lastHourRef.current, m, ampm);
        }
      }
    },
    [mode, ampm, onChange]
  );

  // PanResponder for smooth dragging around the clock dial
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        updateDialPosition();
        handleTouch(e, false);
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        handleTouch(e, false);
      },
      onPanResponderRelease: (e: GestureResponderEvent) => {
        handleTouch(e, true);
      },
      onPanResponderTerminate: (e: GestureResponderEvent) => {
        handleTouch(e, true);
      },
    })
  ).current;

  // Compute hand rotation angle
  const handAngle = mode === 'hours' ? (hour12 % 12) * 30 : minute * 6;

  // Compute hand tip center coordinates
  const handRad = ((handAngle - 90) * Math.PI) / 180;
  const bubbleX = RADIUS + NUMBER_RADIUS * Math.cos(handRad) - BUBBLE_SIZE / 2;
  const bubbleY = RADIUS + NUMBER_RADIUS * Math.sin(handRad) - BUBBLE_SIZE / 2;

  return (
    <View style={styles.container}>
      {/* Time Header Display: [HH] : [MM] [AM / PM] */}
      <View style={styles.headerRow}>
        <View style={styles.digitsContainer}>
          <Pressable
            style={[styles.digitBox, mode === 'hours' && styles.digitBoxActive]}
            onPress={() => {
              hapticLight();
              setMode('hours');
            }}
          >
            <Text style={[styles.digitText, mode === 'hours' && styles.digitTextActive]}>
              {String(hour12).padStart(2, '0')}
            </Text>
          </Pressable>

          <Text style={styles.colonText}>:</Text>

          <Pressable
            style={[styles.digitBox, mode === 'minutes' && styles.digitBoxActive]}
            onPress={() => {
              hapticLight();
              setMode('minutes');
            }}
          >
            <Text style={[styles.digitText, mode === 'minutes' && styles.digitTextActive]}>
              {String(minute).padStart(2, '0')}
            </Text>
          </Pressable>
        </View>

        {/* AM / PM Toggle Pills */}
        <View style={styles.ampmSwitch}>
          <Pressable
            style={[styles.ampmBtn, ampm === 'AM' && styles.ampmBtnActive]}
            onPress={() => {
              hapticLight();
              onChange(hour12, minute, 'AM');
            }}
          >
            <Text style={[styles.ampmText, ampm === 'AM' && styles.ampmTextActive]}>AM</Text>
          </Pressable>
          <Pressable
            style={[styles.ampmBtn, ampm === 'PM' && styles.ampmBtnActive]}
            onPress={() => {
              hapticLight();
              onChange(hour12, minute, 'PM');
            }}
          >
            <Text style={[styles.ampmText, ampm === 'PM' && styles.ampmTextActive]}>PM</Text>
          </Pressable>
        </View>
      </View>

      {/* Mode Instruction Pill */}
      <View style={styles.modeInstructionWrap}>
        <Text style={styles.modeInstructionText}>
          {mode === 'hours'
            ? 'Touch or drag hand to set Hour (1–12)'
            : 'Touch or drag hand to set Minute (00–59)'}
        </Text>
      </View>

      {/* Analog Clock Face Dial */}
      <View style={styles.dialWrapper}>
        <View
          ref={dialRef}
          onLayout={updateDialPosition}
          style={styles.dialContainer}
          {...panResponder.panHandlers}
        >
          {/* Subtle concentric guide ring */}
          <View style={styles.guideRing} />

          {/* Clock Hand Pointer Bubble (at tip) */}
          <View
            style={[
              styles.handBubble,
              {
                left: bubbleX,
                top: bubbleY,
              },
            ]}
          >
            <Text style={styles.bubbleValueText}>
              {mode === 'hours' ? hour12 : String(minute).padStart(2, '0')}
            </Text>
          </View>

          {/* Clock Hand Line */}
          <View
            style={[
              styles.handLine,
              {
                transform: [
                  { translateY: -HAND_LENGTH / 2 },
                  { rotate: `${handAngle}deg` },
                  { translateY: HAND_LENGTH / 2 },
                ],
              },
            ]}
          />

          {/* Dial Center Pivot */}
          <View style={styles.centerPivot} />

          {/* Dial Numbers: Hours (1–12) */}
          {mode === 'hours' &&
            HOURS_12.map((h) => {
              const rad = ((h * 30 - 90) * Math.PI) / 180;
              const x = RADIUS + NUMBER_RADIUS * Math.cos(rad) - 16;
              const y = RADIUS + NUMBER_RADIUS * Math.sin(rad) - 16;
              const isSelected = h === hour12;

              return (
                <View
                  key={`hour-${h}`}
                  pointerEvents="none"
                  style={[
                    styles.numberCell,
                    {
                      left: x,
                      top: y,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.numberText,
                      isSelected && styles.numberTextSelected,
                    ]}
                  >
                    {h}
                  </Text>
                </View>
              );
            })}

          {/* Dial Numbers: Minutes (00, 05, 10, ... 55 + tick dots) */}
          {mode === 'minutes' && (
            <>
              {MAJOR_MINUTES.map((m) => {
                const rad = ((m * 6 - 90) * Math.PI) / 180;
                const x = RADIUS + NUMBER_RADIUS * Math.cos(rad) - 16;
                const y = RADIUS + NUMBER_RADIUS * Math.sin(rad) - 16;
                const isSelected = m === minute;

                return (
                  <View
                    key={`minute-${m}`}
                    pointerEvents="none"
                    style={[
                      styles.numberCell,
                      {
                        left: x,
                        top: y,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.numberText,
                        styles.minuteNumberText,
                        isSelected && styles.numberTextSelected,
                      ]}
                    >
                      {String(m).padStart(2, '0')}
                    </Text>
                  </View>
                );
              })}

              {/* 60 Minute Tick Marks */}
              {Array.from({ length: 60 }).map((_, i) => {
                if (i % 5 === 0) return null; // Major minutes have numbers
                const rad = ((i * 6 - 90) * Math.PI) / 180;
                const x = RADIUS + NUMBER_RADIUS * Math.cos(rad) - 2;
                const y = RADIUS + NUMBER_RADIUS * Math.sin(rad) - 2;

                return (
                  <View
                    key={`tick-${i}`}
                    pointerEvents="none"
                    style={[styles.minuteTick, { left: x, top: y }]}
                  />
                );
              })}
            </>
          )}
        </View>
      </View>

      {/* Quick Minute Preset Chips */}
      <View style={styles.quickMinutesRow}>
        {[0, 15, 30, 45].map((m) => {
          const isSelected = mode === 'minutes' && minute === m;
          return (
            <Pressable
              key={`quick-${m}`}
              style={[styles.quickMinuteChip, isSelected && styles.quickMinuteChipActive]}
              onPress={() => {
                hapticLight();
                setMode('minutes');
                onChange(hour12, m, ampm);
              }}
            >
              <Text
                style={[
                  styles.quickMinuteText,
                  isSelected && styles.quickMinuteTextActive,
                ]}
              >
                :{String(m).padStart(2, '0')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 10,
  },
  digitsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121212',
    borderRadius: Radius.lg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#262626',
  },
  digitBox: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: '#1C1C1E',
  },
  digitBoxActive: {
    backgroundColor: '#FFFFFF',
  },
  digitText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#8E8E93',
  },
  digitTextActive: {
    color: '#000000',
  },
  colonText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#636366',
    marginHorizontal: 4,
  },
  ampmSwitch: {
    flexDirection: 'column',
    backgroundColor: '#121212',
    borderRadius: Radius.md,
    padding: 3,
    borderWidth: 1,
    borderColor: '#262626',
  },
  ampmBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  ampmBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  ampmText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
  },
  ampmTextActive: {
    color: '#000000',
  },
  modeInstructionWrap: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    backgroundColor: '#1C1C1E',
    borderRadius: Radius.full,
    marginBottom: 12,
  },
  modeInstructionText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#A1A1AA',
  },
  dialWrapper: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  dialContainer: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: RADIUS,
    backgroundColor: '#161618',
    borderWidth: 1.5,
    borderColor: '#2C2C2E',
    position: 'relative',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  guideRing: {
    position: 'absolute',
    left: RADIUS - NUMBER_RADIUS,
    top: RADIUS - NUMBER_RADIUS,
    width: NUMBER_RADIUS * 2,
    height: NUMBER_RADIUS * 2,
    borderRadius: NUMBER_RADIUS,
    borderWidth: 1,
    borderColor: '#222225',
    borderStyle: 'dashed',
  },
  centerPivot: {
    position: 'absolute',
    left: RADIUS - 4,
    top: RADIUS - 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    zIndex: 10,
  },
  handLine: {
    position: 'absolute',
    left: RADIUS - 1,
    top: RADIUS - HAND_LENGTH,
    width: 2,
    height: HAND_LENGTH,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
    zIndex: 5,
  },
  handBubble: {
    position: 'absolute',
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  bubbleValueText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
  },
  numberCell: {
    position: 'absolute',
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 4,
  },
  numberText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D4D4D8',
  },
  minuteNumberText: {
    fontSize: 12,
  },
  numberTextSelected: {
    opacity: 0, // Hidden when inside the white pointer bubble
  },
  minuteTick: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3F3F46',
  },
  quickMinutesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  quickMinuteChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  quickMinuteChipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  quickMinuteText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#A1A1AA',
  },
  quickMinuteTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
});
