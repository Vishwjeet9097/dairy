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
