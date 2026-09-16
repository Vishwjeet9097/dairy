/**
 * ─────────────────────────────────────────────────────────────────────────────
 * BOTTOM SHEET
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Spring-driven, drag-to-dismiss. Built on RN's `Modal` with its own animation
 * disabled (`animationType="none"`) so we own every frame — mixing Modal's
 * built-in slide with our own transform produced a visible double-animation.
 *
 * Why a spring and not a curve: the sheet is draggable, so the moment the
 * finger lifts the sheet has velocity. A timing curve would discard that and
 * snap, which feels detached. `Spring.sheet` is overshoot-clamped, so it settles
 * without ever bouncing past the resting position.
 *
 * Dismissal follows the platform convention users already expect: drag past a
 * third of the sheet's height *or* flick downward fast enough. Distance alone
 * would make a quick flick feel ignored.
 */

import type { ReactNode } from 'react';
import { useCallback, useEffect } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppGlassMaterial } from '@/components/ui/glass';
import { Duration, SheetTransition } from '@/constants/motion';
import { Colors, Layout, Radius, Type } from '@/constants/theme';

const AnimatedGlass = Animated.createAnimatedComponent(AppGlassMaterial);

const { dismissDistanceRatio, dismissVelocity } = SheetTransition;

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Disable the drag handle and swipe-down when the content must be confirmed. */
  dismissible?: boolean;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  dismissible = true,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  // Measured on layout so the dismiss threshold and the off-screen resting
  // position adapt to however tall the content turns out to be.
  const sheetHeight = useSharedValue(0);
  const translateY = useSharedValue(0);
  const backdrop = useSharedValue(0);

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (visible) {
      backdrop.value = withTiming(1, SheetTransition.backdrop);
      translateY.value = withSpring(0, SheetTransition.open);
    } else {
      backdrop.value = withTiming(0, SheetTransition.close);
      // Park it off-screen so the next open always springs up from below.
      translateY.value = withTiming(sheetHeight.value || 600, SheetTransition.close);
    }
  }, [visible, backdrop, translateY, sheetHeight]);

  const pan = Gesture.Pan()
    .enabled(dismissible)
    .onUpdate((event) => {
      // Downward only. Resisting upward drag stops the sheet detaching from
      // the bottom edge and floating.
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      const threshold = sheetHeight.value * dismissDistanceRatio;
      const shouldDismiss =
        event.translationY > threshold || event.velocityY > dismissVelocity;

      if (shouldDismiss) {
        // Carry the finger's velocity into the exit so it feels continuous.
        translateY.value = withSpring(
          sheetHeight.value,
          { ...SheetTransition.open, velocity: event.velocityY },
          () => runOnJS(close)(),
        );
        backdrop.value = withTiming(0, SheetTransition.close);
      } else {
        translateY.value = withSpring(0, {
          ...SheetTransition.open,
          velocity: event.velocityY,
        });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdrop.value,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      // We drive the motion; Modal's own animation would fight ours.
      animationType="none"
      statusBarTranslucent
      // Android hardware back must close the sheet, not the screen behind it.
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Animated.View
            accessible
            accessibilityRole="button"
            accessibilityLabel="Close"
            onTouchEnd={dismissible ? onClose : undefined}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboardAvoiding}>
          <GestureDetector gesture={pan}>
          <AnimatedGlass
            level="elevated"
            onLayout={(event) => {
              sheetHeight.value = event.nativeEvent.layout.height;
            }}
            style={[
              styles.sheet,
              { paddingBottom: insets.bottom + Layout.gutter, marginTop: insets.top + 10 },
              sheetStyle,
            ]}
          >
            {dismissible ? <View style={styles.grabber} /> : null}
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {children}
          </AnimatedGlass>
        </GestureDetector>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardAvoiding: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    // Restrained: a heavy scrim makes the app feel like it stopped working.
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
  },
  sheet: {
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    paddingHorizontal: Layout.gutter,
    paddingTop: 10,
    overflow: 'hidden',
    flexShrink: 1,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    ...Type.heading,
    color: Colors.foreground,
    marginBottom: 16,
  },
});

export const SHEET_DURATION = Duration.sheet;
