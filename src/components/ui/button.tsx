/**
 * Buttons.
 *
 * Four variants cover the whole app. Every one gets the same press feedback
 * from `PressableScale`, so a CTA and a chip feel related.
 *
 * `onPress` is wrapped in a single-fire guard: a double-tap on "Save Customer"
 * or "Record Payment" used to create two records. Callers no longer have to
 * remember to debounce.
 */

import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/motion/pressable-scale';
import { Colors, Radius, Type } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import { useSingleFire } from '@/navigation/use-nav-guard';

export type ButtonVariant = 'primary' | 'soft' | 'outline' | 'danger';
export type ButtonSize = 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
  /** Stretch to fill the parent's cross axis. */
  full?: boolean;
  /** Pill vs. rounded-rect. CTAs are pills, inline actions are rects. */
  pill?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  disabled = false,
  loading = false,
  full = false,
  pill = false,
  style,
}: ButtonProps) {
  const { accent } = useAppTheme();
  // Guards against double-submit at the primitive level.
  const handlePress = useSingleFire(onPress);

  const palette = {
    primary: { background: accent.color, foreground: '#FFFFFF', border: 'transparent' },
    soft: { background: accent.soft, foreground: accent.color, border: 'transparent' },
    outline: { background: 'transparent', foreground: accent.color, border: accent.color },
    danger: { background: Colors.dangerSoft, foreground: Colors.danger, border: 'transparent' },
  }[variant];

  const metrics = size === 'lg' ? { paddingVertical: 16, gap: 8 } : { paddingVertical: 12, gap: 6 };
  const isInert = disabled || loading;

  return (
    <PressableScale
      onPress={handlePress}
      disabled={isInert}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isInert, busy: loading }}
      style={[
        styles.base,
        metrics,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderWidth: variant === 'outline' ? 1.5 : 0,
          borderRadius: pill ? Radius.full : Radius.lg,
        },
        full ? styles.full : null,
        style,
      ]}
    >
      {loading ? (
        // Sized to the label line height so swapping in the spinner does not
        // change the button's height and shift the layout around it.
        <ActivityIndicator size="small" color={palette.foreground} />
      ) : (
        <View style={[styles.content, { gap: metrics.gap }]}>
          {Icon ? <Icon size={size === 'lg' ? 20 : 17} color={palette.foreground} /> : null}
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.4}
            style={[
              size === 'lg' ? styles.labelLg : styles.labelMd,
              { color: palette.foreground },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </PressableScale>
  );
}

/* ─── Icon button ────────────────────────────────────────────────────────── */

export function IconButton({
  icon: Icon,
  onPress,
  accessibilityLabel,
  color = Colors.foreground,
  background = Colors.surface,
  size = 38,
  iconSize = 20,
  style,
}: {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
  color?: string;
  background?: string;
  size?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scale={0.9}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.iconButton,
        { width: size, height: size, backgroundColor: background },
        style,
      ]}
    >
      <Icon size={iconSize} color={color} />
    </PressableScale>
  );
}

/* ─── Segmented control ──────────────────────────────────────────────────── */

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

/**
 * Two-or-more-way switch, used for Delivery's morning/evening slot and the
 * payment-method picker. Replaces two separate hand-rolled pill rows.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { accent } = useAppTheme();

  return (
    <View accessibilityRole="tablist" style={[styles.segmented, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            key={option.value}
            onPress={() => onChange(option.value)}
            scale={0.98}
            dim={false}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            style={[
              styles.segment,
              { backgroundColor: selected ? accent.color : 'transparent' },
            ]}
          >
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
              style={[
                styles.segmentLabel,
                { color: selected ? '#FFFFFF' : Colors.mutedForeground },
              ]}
            >
              {option.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  full: {
    alignSelf: 'stretch',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelMd: {
    ...Type.caption,
    fontWeight: '800',
  },
  labelLg: {
    ...Type.bodyStrong,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  iconButton: {
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.full,
    padding: 5,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: Radius.full,
  },
  segmentLabel: {
    ...Type.caption,
    fontWeight: '800',
  },
});
