import React, { createContext, useContext, useEffect } from 'react';
import { useDairyStore } from '../lib/dairy-store';

export interface AccentColor {
  id: string;
  label: string;
  value: string;       // hex for icon/text
  dark: string;        // darker variant
  soft: string;        // light bg tint
  header: string;      // header background
}

export const ACCENT_COLORS: AccentColor[] = [
  {
    id: 'mono',
    label: 'Monochrome',
    value: '#1A1A1A',
    dark: '#000000',
    soft: '#F2F2F2',
    header: '#1A1A1A',
  },
  {
    id: 'green',
    label: 'Forest',
    value: '#00A350',
    dark: '#007A3A',
    soft: '#E8F7F0',
    header: '#00A350',
  },
  {
    id: 'blue',
    label: 'Ocean',
    value: '#2563EB',
    dark: '#1D4ED8',
    soft: '#EFF6FF',
    header: '#2563EB',
  },
  {
    id: 'purple',
    label: 'Violet',
    value: '#7C3AED',
    dark: '#6D28D9',
    soft: '#F5F3FF',
    header: '#7C3AED',
  },
  {
    id: 'rose',
    label: 'Rose',
    value: '#E11D48',
    dark: '#BE123C',
    soft: '#FFF1F2',
    header: '#E11D48',
  },
  {
    id: 'amber',
    label: 'Amber',
    value: '#D97706',
    dark: '#B45309',
    soft: '#FFFBEB',
    header: '#D97706',
  },
  {
    id: 'teal',
    label: 'Teal',
    value: '#0D9488',
    dark: '#0F766E',
    soft: '#F0FDFA',
    header: '#0D9488',
  },
  {
    id: 'slate',
    label: 'Slate',
    value: '#475569',
    dark: '#334155',
    soft: '#F8FAFC',
    header: '#475569',
  },
];

export const DEFAULT_ACCENT = ACCENT_COLORS[0]!; // Monochrome

interface ThemeContextValue {
  accent: AccentColor;
  setAccentId: (id: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  accent: DEFAULT_ACCENT,
  setAccentId: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { themeAccentId, setThemeAccentId } = useDairyStore();

  const accent =
    ACCENT_COLORS.find((c) => c.id === themeAccentId) ?? DEFAULT_ACCENT;

  const setAccentId = (id: string) => setThemeAccentId(id);

  return (
    <ThemeContext.Provider value={{ accent, setAccentId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(ThemeContext);
}
