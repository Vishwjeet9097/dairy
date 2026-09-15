/**
 * Screen containers.
 *
 * Every route renders inside one of these so background colour, status-bar
 * style and safe-area handling are decided once instead of per screen. Before
 * this, screens set `barStyle` individually and disagreed — some declared
 * `light-content` while showing a white app bar, which made the clock
 * invisible.
 */

import { StatusBar } from 'expo-status-bar';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';

export interface ScreenProps {
  children: ReactNode;
  /**
   * `dark` = dark icons for light backgrounds (the default).
   * `light` = light icons, for screens whose header is a filled accent block.
   */
  statusBar?: 'dark' | 'light';
  /** Override the page background. */
  background?: string;
  style?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  statusBar = 'dark',
  background = Colors.background,
  style,
}: ScreenProps) {
  return (
    <View style={[styles.screen, { backgroundColor: background }, style]}>
      {/*
        `translucent` + edge-to-edge is the default on Android 15+, so the
        status bar is painted by the screen content underneath. We only choose
        the icon colour.
      */}
      <StatusBar style={statusBar} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    // Children position bottom bars and CTAs absolutely against this.
    position: 'relative',
  },
});
