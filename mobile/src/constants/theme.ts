import '@/global.css';
import { Platform } from 'react-native';

/**
 * Static B&W palette. Screens pull dynamic accent from useAppTheme() instead.
 */
export const Colors = {
  background: '#F7F7F7',
  foreground: '#111111',
  card: '#FFFFFF',
  surface: '#EBEBEB',
  border: '#E0E0E0',
  muted: '#F2F2F2',
  mutedForeground: '#888888',

  danger: '#E11D48',
  dangerSoft: '#FFF1F2',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  info: '#2563EB',
  infoSoft: '#EFF6FF',
  success: '#059669',
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

export const softShadow = {
  elevation: 3,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.06,
  shadowRadius: 12,
};

export const cardShadow = {
  elevation: 2,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 8,
};
