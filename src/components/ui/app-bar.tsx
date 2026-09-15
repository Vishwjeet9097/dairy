/**
 * App bars.
 *
 * Two variants, and only two, so headers stop being hand-rolled per screen:
 *
 *   AppBar      — light bar with a back affordance. Push destinations.
 *   ScreenHeader — filled accent block with title/subtitle. Tab roots.
 *
 * Both take their top padding from the real safe-area inset. The old headers
 * hardcoded `pt-14` / `pt-16`, which was wrong on every device with a different
 * status bar height and clipped the title on Dynamic Island phones.
 */

import { ChevronLeft, type LucideIcon } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/motion/pressable-scale';
import { AppBarMetrics, Colors, Layout, Radius, Type, softShadow } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import { useT } from '@/lib/i18n';
import { useNavGuard } from '@/navigation/use-nav-guard';

import { AppGlassMaterial } from './glass';

/* ─── AppBar ─────────────────────────────────────────────────────────────── */

export interface AppBarProps {
  title: string;
  /** Trailing slot — keep to one action. */
  right?: ReactNode;
  /** Hide the back affordance (e.g. a modal root that uses a close button). */
  showBack?: boolean;
  /** Override the back action. Defaults to a guarded `router.back()`. */
  onBack?: () => void;
  /** Swap the back glyph, e.g. an X for modal workflows. */
  backIcon?: LucideIcon;
  style?: StyleProp<ViewStyle>;
}

export function AppBar({
  title,
  right,
  showBack = true,
  onBack,
  backIcon: BackIcon = ChevronLeft,
  style,
}: AppBarProps) {
  const insets = useSafeAreaInsets();
  const nav = useNavGuard();
  const t = useT();

  return (
    <AppGlassMaterial
      level="standard"
      style={[
        styles.appBar,
        { paddingTop: insets.top, height: AppBarMetrics.height + insets.top },
        style,
      ]}
    >
      <View style={styles.appBarRow}>
        <View style={styles.appBarSide}>
          {showBack ? (
            <PressableScale
              // Guarded: a double-tap on back used to pop two screens.
              onPress={onBack ?? nav.back}
              scale={0.9}
              accessibilityRole="button"
              accessibilityLabel={t('action.back')}
              style={styles.action}
            >
              <BackIcon size={22} color={Colors.foreground} />
            </PressableScale>
          ) : null}
        </View>

        <Text
          numberOfLines={1}
          // Long titles shrink rather than pushing the actions off screen.
          maxFontSizeMultiplier={1.4}
          style={styles.appBarTitle}
        >
          {title}
        </Text>

        <View style={[styles.appBarSide, styles.appBarSideRight]}>{right}</View>
      </View>
    </AppGlassMaterial>
  );
}

/* ─── ScreenHeader ───────────────────────────────────────────────────────── */

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  /** Leading icon action, rendered before the title (e.g. Hamburger menu). */
  leftAction?: ReactNode;
  /** Trailing icon action, rendered on a translucent disc. */
  action?: ReactNode;
  /** Content below the titles — typically a search field. */
  children?: ReactNode;
  /**
   * Extra bottom padding. Screens that pull their first card up over the header
   * edge (a negative margin) use this to keep the overlap consistent.
   */
  bottomInset?: number;
  style?: StyleProp<ViewStyle>;
}

export function ScreenHeader({
  title,
  subtitle,
  leftAction,
  action,
  children,
  bottomInset = 16,
  style,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const { accent } = useAppTheme();

  return (
    <AppGlassMaterial
      level="standard"
      tintColor={accent.header + 'E6'} // 90% opacity for glass refraction
      style={[
        styles.header,
        {
          paddingTop: insets.top + 12,
          paddingBottom: bottomInset,
        },
        style,
      ]}
    >
      <View style={styles.headerRow}>
        {leftAction ? <View style={styles.headerLeftAction}>{leftAction}</View> : null}
        <View style={styles.headerTitles}>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.headerTitle}>
            {title}
          </Text>
          {subtitle ? (
            <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.headerSubtitle}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {action ? <View style={styles.headerAction}>{action}</View> : null}
      </View>

      {children ? <View style={styles.headerChildren}>{children}</View> : null}
    </AppGlassMaterial>
  );
}

/**
 * Circular translucent action for use inside a `ScreenHeader`, so every header
 * action looks the same.
 */
export function HeaderAction({
  icon: Icon,
  onPress,
  accessibilityLabel,
}: {
  icon: LucideIcon;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scale={0.9}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.headerActionButton}
    >
      <Icon size={21} color="white" />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  appBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  appBarRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Layout.gutterTight,
  },
  appBarSide: {
    // Fixed and equal on both sides so the title is optically centred whether
    // or not a trailing action exists.
    width: AppBarMetrics.action,
    justifyContent: 'center',
  },
  appBarSideRight: {
    alignItems: 'flex-end',
  },
  appBarTitle: {
    ...Type.subtitle,
    flex: 1,
    textAlign: 'center',
    color: Colors.foreground,
  },
  action: {
    width: AppBarMetrics.action,
    height: AppBarMetrics.action,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  header: {
    paddingHorizontal: Layout.gutter,
    borderBottomLeftRadius: Radius.xxl,
    borderBottomRightRadius: Radius.xxl,
    overflow: 'hidden',
    ...softShadow,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerLeftAction: {
    marginRight: 4,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    ...Type.title,
    color: 'white',
  },
  headerSubtitle: {
    ...Type.caption,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 2,
  },
  headerAction: {
    alignItems: 'flex-end',
  },
  headerActionButton: {
    width: 46,
    height: 46,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  headerChildren: {
    marginTop: 20,
  },
});
