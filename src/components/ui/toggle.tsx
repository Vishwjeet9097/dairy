/**
 * Toggle switch.
 *
 * A custom control rather than RN's `Switch` because `Switch` cannot be tinted
 * consistently across platforms — on Android the thumb and track render with
 * Material's own sizing, so the same screen looked different on each OS.
 *
 * The thumb moves on a spring (physical control, physical motion) while the
 * track colour crossfades. Both run on the UI thread, so dragging feels
 * attached to the finger even while JS is busy.
 */

import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PressableScale } from '@/components/motion/pressable-scale';
import { Spring, Timing, spring } from '@/constants/motion';
import { Colors, Radius } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';

/** Built once at module scope so the worklet below can capture it as a value. */
const ToggleSpring = spring(Spring.snappy);

const TRACK_WIDTH = 50;
const TRACK_HEIGHT = 30;
const THUMB_SIZE = 24;
const PADDING = 3;
const TRAVEL = TRACK_WIDTH - THUMB_SIZE - PADDING * 2;

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
  style?: StyleProp<ViewStyle>;
}

export function Toggle({
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel,
  style,
}: ToggleProps) {
  const { accent } = useAppTheme();

  /**
   * Derived from the prop rather than held in a shared value, so the control can
   * never disagree with the state it represents.
   *
   * `ToggleSpring` must be a precomputed object. This mapper runs on the UI
   * runtime, so calling `spring(...)` here threw
   * "[Worklets] Tried to synchronously call a Remote Function" the instant a
   * Toggle mounted — which is every visit to Settings.
   */
  const progress = useDerivedValue(() => withSpring(value ? 1 : 0, ToggleSpring));

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [Colors.border, accent.color],
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * TRAVEL }],
  }));

  return (
    <PressableScale
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      // The control itself moves; scaling the whole switch would be noise.
      scaleDisabled
      dim={false}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={style}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </PressableScale>
  );
}

/** Labelled row wrapper, for settings-style lists. */
export function ToggleRow({
  label,
  description,
  value,
  onValueChange,
  leading,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  leading?: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      {leading}
      <View style={styles.rowText}>
        <Animated.Text style={styles.rowLabel}>{label}</Animated.Text>
        {description ? (
          <Animated.Text style={styles.rowDescription}>{description}</Animated.Text>
        ) : null}
      </View>
      <Toggle value={value} onValueChange={onValueChange} accessibilityLabel={label} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: Radius.full,
    padding: PADDING,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: Radius.full,
    backgroundColor: '#FFFFFF',
    // A whisper of elevation so the thumb reads as sitting above the track.
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
  },
  rowDescription: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.mutedForeground,
    marginTop: 2,
  },
});

/** Re-exported so callers can match the toggle's own timing if needed. */
export const TOGGLE_TIMING = Timing.fast;
