/**
 * ─────────────────────────────────────────────────────────────────────────────
 * DELIVERY STATUS CONTROL
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The single most-tapped control in the app: a milkman walks a round and cycles
 * each customer through pending → delivered → skipped. It has to confirm the tap
 * instantly and unambiguously, because the user is often not looking closely.
 *
 * Implementation note worth keeping: the three states are three stacked,
 * pre-coloured layers that crossfade, **not** an `interpolateColor` across three
 * stops. Interpolating 2 → 0 (skipped back to pending) would travel *through*
 * stop 1, flashing the delivered green on the way — the control would appear to
 * briefly confirm a delivery the user just cancelled. Crossfading independent
 * layers makes every transition direct.
 *
 * The brief pulse on change is the tap receipt. It is capped at 6% and 180ms:
 * enough to feel, too small to notice as an animation.
 */

import { Check, CircleDashed, X } from 'lucide-react-native';
import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/motion/pressable-scale';
import { Curve, Duration, SuccessAnimation, Timing, timing } from '@/constants/motion';
import { Colors, Radius, Type } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import { useDecorativeMotion } from '@/hooks/use-motion';
import type { DeliveryStatus } from '@/lib/dairy-store';
import { useT } from '@/lib/i18n';

/* ─── Cycling toggle ─────────────────────────────────────────────────────── */

export interface StatusToggleProps {
  status: DeliveryStatus;
  onPress: () => void;
  size?: number;
  /** Customer name, so the control announces what it is toggling. */
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

export function StatusToggle({
  status,
  onPress,
  size = 44,
  accessibilityLabel,
  style,
}: StatusToggleProps) {
  const { accent } = useAppTheme();
  const t = useT();
  const pulseEnabled = useDecorativeMotion();

  const delivered = useSharedValue(status === 'delivered' ? 1 : 0);
  const skipped = useSharedValue(status === 'not_delivered' ? 1 : 0);
  const pending = useSharedValue(status === 'pending' ? 1 : 0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    delivered.value = withTiming(status === 'delivered' ? 1 : 0, Timing.fast);
    skipped.value = withTiming(status === 'not_delivered' ? 1 : 0, Timing.fast);
    pending.value = withTiming(status === 'pending' ? 1 : 0, Timing.fast);

    if (pulseEnabled) {
      // The tap receipt. Small and short by design — see the header note.
      pulse.value = withSequence(
        withTiming(1, SuccessAnimation.pulseIn),
        withTiming(0, SuccessAnimation.pulseOut),
      );
    }
  }, [status, delivered, skipped, pending, pulse, pulseEnabled]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * SuccessAnimation.pulseScale }],
  }));

  const deliveredStyle = useAnimatedStyle(() => ({ opacity: delivered.value }));
  const skippedStyle = useAnimatedStyle(() => ({ opacity: skipped.value }));
  const pendingStyle = useAnimatedStyle(() => ({ opacity: pending.value }));

  const statusLabel =
    status === 'delivered'
      ? t('status.delivered')
      : status === 'not_delivered'
        ? t('status.notDelivered')
        : t('status.pending');

  return (
    <PressableScale
      onPress={onPress}
      // The pulse already provides feedback; a press scale on top reads as jitter.
      scaleDisabled
      dim={false}
      accessibilityRole="button"
      accessibilityLabel={`${accessibilityLabel}, ${statusLabel}`}
      accessibilityHint="Cycles delivery status"
      style={style}
    >
      <Animated.View
        style={[
          styles.toggle,
          { width: size, height: size, borderRadius: Radius.full },
          containerStyle,
        ]}
      >
        {/* Independent colour layers — see header note. */}
        <Animated.View
          style={[styles.layer, { backgroundColor: Colors.surface }, pendingStyle]}
        />
        <Animated.View
          style={[styles.layer, { backgroundColor: accent.color }, deliveredStyle]}
        />
        <Animated.View
          style={[styles.layer, { backgroundColor: Colors.danger }, skippedStyle]}
        />

        <Animated.View style={[styles.layer, styles.center, pendingStyle]}>
          <CircleDashed size={19} color={Colors.mutedForeground} />
        </Animated.View>
        <Animated.View style={[styles.layer, styles.center, deliveredStyle]}>
          <Check size={19} color="#FFFFFF" strokeWidth={3} />
        </Animated.View>
        <Animated.View style={[styles.layer, styles.center, skippedStyle]}>
          <X size={19} color="#FFFFFF" strokeWidth={3} />
        </Animated.View>
      </Animated.View>
    </PressableScale>
  );
}

/* ─── Read-only status pill ──────────────────────────────────────────────── */

/**
 * Used in feeds and history lists where status is displayed, not changed.
 * Crossfades for the same reason the toggle does, so a status that updates while
 * on screen (e.g. the Home activity feed after marking a round) changes
 * smoothly rather than snapping.
 */
export function DeliveryStatusBadge({ status }: { status: DeliveryStatus }) {
  const t = useT();

  const tone =
    status === 'delivered'
      ? { background: Colors.successSoft, foreground: Colors.success, label: t('status.delivered') }
      : status === 'not_delivered'
        ? { background: Colors.dangerSoft, foreground: Colors.danger, label: t('status.notDelivered') }
        : { background: Colors.warningSoft, foreground: Colors.warning, label: t('status.pending') };

  const enter = useSharedValue(0);

  useEffect(() => {
    // Re-runs whenever the status changes, fading the new pill in over the old.
    enter.value = 0;
    enter.value = withTiming(1, Timing.enter);
  }, [status, enter]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: 0.4 + enter.value * 0.6 }));

  return (
    <Animated.View
      style={[styles.badge, { backgroundColor: tone.background }, animatedStyle]}
    >
      <Animated.Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={[styles.badgeLabel, { color: tone.foreground }]}
      >
        {tone.label}
      </Animated.Text>
    </Animated.View>
  );
}

/** Non-animated wrapper for measuring/spacing parity in static layouts. */
export function StatusSlot({ children }: { children: React.ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

const styles = StyleSheet.create({
  toggle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  layer: {
    ...StyleSheet.absoluteFill,
    borderRadius: Radius.full,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  badgeLabel: {
    ...Type.micro,
    fontWeight: '800',
  },
});
