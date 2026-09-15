/**
 * Badges, empty states and loading states.
 *
 * The app had no shared empty or loading state — each list inlined its own
 * "No customers found." card with slightly different padding and wording. These
 * make those states look deliberate and identical everywhere.
 */

import type { LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { Duration } from '@/constants/motion';
import { Colors, Radius, Type, cardBorder, cardShadow } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import { useDecorativeMotion } from '@/hooks/use-motion';

/* ─── Badge ──────────────────────────────────────────────────────────────── */

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

/**
 * Static tones. `accent` is absent on purpose — it is resolved at render time
 * from the active theme, so listing a placeholder here would be dead code that
 * looks authoritative.
 */
const TONES: Record<Exclude<BadgeTone, 'accent'>, { background: string; foreground: string }> = {
  neutral: { background: Colors.surface, foreground: Colors.mutedForeground },
  success: { background: Colors.successSoft, foreground: Colors.success },
  warning: { background: Colors.warningSoft, foreground: Colors.warning },
  danger: { background: Colors.dangerSoft, foreground: Colors.danger },
  info: { background: Colors.infoSoft, foreground: Colors.info },
};

export function Badge({
  label,
  tone = 'neutral',
  style,
}: {
  label: string;
  tone?: BadgeTone;
  style?: StyleProp<ViewStyle>;
}) {
  const { accent } = useAppTheme();
  const palette =
    tone === 'accent'
      ? { background: accent.soft, foreground: accent.color }
      : TONES[tone];

  return (
    <View style={[styles.badge, { backgroundColor: palette.background }, style]}>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.3}
        style={[styles.badgeLabel, { color: palette.foreground }]}
      >
        {label}
      </Text>
    </View>
  );
}

/* ─── Empty state ────────────────────────────────────────────────────────── */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  style,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { accent } = useAppTheme();
  const animate = useDecorativeMotion();

  return (
    <Animated.View
      // Fades in rather than appearing abruptly when a search clears the list.
      entering={animate ? FadeIn.duration(Duration.normal) : undefined}
      style={[styles.emptyState, style]}
    >
      {Icon ? (
        <View style={[styles.emptyIcon, { backgroundColor: accent.soft }]}>
          <Icon size={26} color={accent.color} />
        </View>
      ) : null}

      <Text style={styles.emptyTitle}>{title}</Text>

      {description ? <Text style={styles.emptyDescription}>{description}</Text> : null}

      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </Animated.View>
  );
}

/* ─── Loading state ──────────────────────────────────────────────────────── */

export function LoadingState({ label }: { label?: string }) {
  const { accent } = useAppTheme();

  return (
    <View style={styles.loading}>
      <ActivityIndicator color={accent.color} />
      {label ? <Text style={styles.loadingLabel}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: Radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeLabel: {
    ...Type.micro,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  emptyState: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    paddingVertical: 36,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...cardBorder,
    ...cardShadow,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    ...Type.bodyStrong,
    color: Colors.foreground,
    textAlign: 'center',
  },
  emptyDescription: {
    ...Type.callout,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyAction: {
    marginTop: 10,
    alignSelf: 'stretch',
  },
  loading: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingLabel: {
    ...Type.callout,
    color: Colors.mutedForeground,
  },
});
