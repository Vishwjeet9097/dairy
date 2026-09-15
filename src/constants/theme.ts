import '@/global.css';
import { Platform } from 'react-native';

/**
 * Static B&W palette. Screens pull dynamic accent from useAppTheme() instead.
 */
export const Colors = {
  background: '#F9FAFB',
  foreground: '#111827',
  card: '#FFFFFF',
  surface: '#F3F4F6',
  border: '#E5E7EB',
  borderSubtle: 'rgba(0, 0, 0, 0.04)',
  muted: '#F3F4F6',
  mutedForeground: '#6B7280',

  danger: '#EF4444',
  dangerSoft: '#FEF2F2',
  warning: '#F59E0B',
  warningSoft: '#FFFBEB',
  info: '#3B82F6',
  infoSoft: '#EFF6FF',
  success: '#10B981',
  successSoft: '#ECFDF5',
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Subtle ambient card shadow — soft light falloff, minimal spread */
export const softShadow = {
  elevation: 1,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.02,
  shadowRadius: 10,
};

/** Primary Apple-style card elevation — large, wide blur, low opacity (0.03) */
export const cardShadow = {
  elevation: 1,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.03,
  shadowRadius: 16,
};

/** Raised card elevation */
export const elevatedShadow = {
  elevation: 2,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 3 },
  shadowOpacity: 0.04,
  shadowRadius: 20,
};

/** Floating bar/action sheet shadow — soft diffuse light, no harsh contrast */
export const floatingShadow = {
  elevation: 3,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 24,
};

/** Clean neutral ambient elevation (zero glow, no colored halo) */
export const glowShadow = (_color?: string) => ({
  elevation: 1,
  shadowColor: '#000000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.03,
  shadowRadius: 12,
});

/** Faint highlight border around card edges for crisp Apple hardware definition */
export const cardBorder = {
  borderWidth: 1,
  borderColor: 'rgba(0, 0, 0, 0.04)',
};

/** Clean, bright, flat Apple card surface */
export const luxuryCard = {
  backgroundColor: '#FFFFFF',
  borderRadius: 20,
  ...cardBorder,
  ...cardShadow,
};

/* ─────────────────────────────────────────────────────────────────────────────
 * RADIUS SCALE
 * ─────────────────────────────────────────────────────────────────────────────
 * Corner radii were previously inline literals (rounded-[24px], borderRadius:
 * 20, rounded-2xl…) which made surfaces inconsistent from screen to screen.
 * Use these instead so every card, chip and button agrees.
 */
export const Radius = {
  /** Chips, badges, small tags */
  xs: 8,
  /** Inputs, compact buttons */
  sm: 12,
  /** Inner surfaces nested inside a card */
  md: 16,
  /** Secondary cards, stat tiles */
  lg: 20,
  /** Primary cards — the app's signature radius */
  xl: 24,
  /** Sheets, headers, large containers */
  xxl: 32,
  /** Pills and circular controls */
  full: 999,
} as const;

/* ─────────────────────────────────────────────────────────────────────────────
 * TYPOGRAPHY SCALE
 * ─────────────────────────────────────────────────────────────────────────────
 * A restrained ramp. Premium comes from strong hierarchy and tight tracking on
 * large text, not from many sizes. Spread a token directly into a style prop:
 *
 *   <Text style={Type.title}>…</Text>
 */
export const Type = {
  /** Screen hero numbers */
  display: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  /** Screen headings in coloured headers */
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  /** Section headings */
  heading: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  /** App bar titles, card titles */
  subtitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  /** Emphasised body — customer names, list titles */
  bodyStrong: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  /** Default body */
  body: { fontSize: 15, fontWeight: '600' },
  /** Secondary body, supporting copy */
  callout: { fontSize: 14, fontWeight: '600' },
  /** Metadata, captions */
  caption: { fontSize: 13, fontWeight: '600' },
  /** Labels under icons, dense metadata */
  footnote: { fontSize: 12, fontWeight: '600' },
  /** Uppercase section eyebrows */
  overline: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  /** Tab bar labels, badges */
  micro: { fontSize: 11, fontWeight: '700' },
} as const;

/* ─────────────────────────────────────────────────────────────────────────────
 * LAYOUT METRICS
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const Layout = {
  /** Standard horizontal screen gutter */
  gutter: 24,
  /** Tighter gutter for dense form screens */
  gutterTight: 20,
  /** Minimum tappable target (iOS HIG / Material both land near this) */
  hitSlop: 44,
} as const;

/**
 * Bottom navigation metrics.
 *
 * `height` is the bar's own content height, excluding the safe-area inset.
 * The tab bar is absolutely positioned and content scrolls beneath it, so
 * screens must reserve `height + insets.bottom` of bottom padding — use
 * `useTabBarHeight()` / `useScreenPadding()` rather than hardcoding, and never
 * re-derive these numbers by hand.
 */
export const TabBar = {
  /** Content height of the bar, excluding safe-area inset */
  height: 60,
  /** Extra breathing room between scroll content and the bar */
  contentGap: 16,
  /** Minimum width per tab item — keeps 5 Hindi labels from colliding */
  itemMinWidth: 56,
  /** Icon pill dimensions */
  pillWidth: 44,
  pillHeight: 30,
  /** Cap on label font scaling so large-font settings can't break the bar */
  maxFontScale: 1.25,
  /**
   * Inactive icon/label tint. Deliberately lighter than
   * `Colors.mutedForeground` (#6B7280): at 11px, muted-foreground reads as
   * almost-active and weakens the selected state.
   */
  inactiveTint: '#9CA3AF',
} as const;

/** Standard app bar (non-scrolling header) content height, excluding inset. */
export const AppBarMetrics = {
  height: 52,
  /** Circular back / action button size */
  action: 38,
} as const;
