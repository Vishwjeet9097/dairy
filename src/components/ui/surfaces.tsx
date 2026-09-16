/**
 * Surfaces: cards, section headings, dividers, rows.
 *
 * Cards were previously written out longhand on every screen
 * (`rounded-[24px] bg-white p-4` + `[cardBorder, cardShadow]`), so radius and
 * padding quietly diverged. These wrap the same tokens once.
 */

import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text } from '@/components/ui';

import { PressableScale } from '@/components/motion/pressable-scale';
import { Press } from '@/constants/motion';
import { Colors, Layout, Radius, Type, cardBorder, cardShadow } from '@/constants/theme';

/* ─── Card ───────────────────────────────────────────────────────────────── */

export interface CardProps {
  children: ReactNode;
  /** `lg` for nested/secondary surfaces, `xl` (default) for primary cards. */
  radius?: keyof typeof Radius;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, radius = 'xl', padding = 16, style }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        { borderRadius: Radius[radius], padding },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Tappable card. Uses the gentler press scale — big surfaces look odd at 0.97. */
export function PressableCard({
  children,
  onPress,
  radius = 'xl',
  padding = 16,
  style,
  accessibilityLabel,
}: CardProps & { onPress: () => void; accessibilityLabel?: string }) {
  return (
    <PressableScale
      onPress={onPress}
      scale={Press.scaleSubtle}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.card, { borderRadius: Radius[radius], padding }, style]}
    >
      {children}
    </PressableScale>
  );
}

/* ─── Section heading ────────────────────────────────────────────────────── */

export function SectionLabel({ children, style }: { children: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.sectionLabel, style]}>
      <Text style={styles.sectionLabelText}>{children}</Text>
    </View>
  );
}

export function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionHeadingText}>{title}</Text>
      {action}
    </View>
  );
}

/* ─── Divider ────────────────────────────────────────────────────────────── */

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

/* ─── Navigable row ──────────────────────────────────────────────────────── */

export interface NavRowProps {
  icon: LucideIcon;
  iconColor: string;
  iconBackground: string;
  label: string;
  detail?: string;
  onPress: () => void;
  /** Render the label in the danger colour, for destructive rows. */
  destructive?: boolean;
  /** Hide the trailing chevron, e.g. for rows that toggle rather than navigate. */
  showChevron?: boolean;
  last?: boolean;
}

/**
 * The list row used by Customer Detail, More and Settings. Consolidating it
 * means every settings-style row has the same height, icon disc and chevron.
 */
export function NavRow({
  icon: Icon,
  iconColor,
  iconBackground,
  label,
  detail,
  onPress,
  destructive,
  showChevron = true,
  last = false,
}: NavRowProps) {
  return (
    <PressableScale
      onPress={onPress}
      scale={Press.scaleSubtle}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.navRow, last ? null : styles.navRowBordered]}
    >
      <View style={[styles.navRowIcon, { backgroundColor: iconBackground }]}>
        <Icon size={19} color={iconColor} />
      </View>

      <Text
        numberOfLines={1}
        style={[
          styles.navRowLabel,
          { color: destructive ? Colors.danger : Colors.foreground },
        ]}
      >
        {label}
      </Text>

      {detail ? (
        <Text numberOfLines={1} style={styles.navRowDetail}>
          {detail}
        </Text>
      ) : null}

      {showChevron ? (
        <ChevronRight size={18} color={destructive ? Colors.danger : Colors.border} />
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.card,
    ...cardBorder,
    ...cardShadow,
  },
  sectionLabel: {
    marginBottom: 10,
  },
  sectionLabelText: {
    ...Type.overline,
    color: Colors.mutedForeground,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  sectionHeadingText: {
    ...Type.heading,
    color: Colors.foreground,
    flex: 1,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  navRowBordered: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  navRowIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRowLabel: {
    ...Type.body,
    flex: 1,
  },
  navRowDetail: {
    ...Type.callout,
    color: Colors.mutedForeground,
    maxWidth: 140,
  },
});

export const ScreenGutter = Layout.gutter;
