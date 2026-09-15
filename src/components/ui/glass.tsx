import { GlassView } from 'expo-glass-effect';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle, type ViewProps } from 'react-native';

import { GlassTokens } from '@/constants/theme';

export type GlassLevel = 'light' | 'standard' | 'elevated';

export interface AppGlassMaterialProps extends ViewProps {
  level?: GlassLevel;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** Whether the glass is interactive (iOS only). Defaults to false. */
  interactive?: boolean;
  /** Custom tint color to override token background. */
  tintColor?: string;
}

/**
 * Cross-platform glass abstraction.
 * - iOS/visionOS: Uses native Liquid Glass effects via expo-glass-effect.
 * - Android/Web: Degrades gracefully to an adaptive translucent material.
 */
export function AppGlassMaterial({
  level = 'standard',
  style,
  children,
  interactive = false,
  tintColor,
  ...rest
}: AppGlassMaterialProps) {
  const tokens = GlassTokens[level] as any;

  // If native Liquid Glass is supported (iOS 15+, visionOS), use GlassView.
  if (Platform.OS === 'ios' || (Platform.OS as string) === 'visionos') {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme={tokens.tint}
        tintColor={tintColor}
        isInteractive={interactive}
        style={[
          {
            borderWidth: tokens.borderWidth,
            borderColor: tokens.borderColor,
            elevation: tokens.elevation,
            // Native shadow properties are passed through
            shadowColor: tokens.shadowColor,
            shadowOffset: tokens.shadowOffset,
            shadowOpacity: tokens.shadowOpacity,
            shadowRadius: tokens.shadowRadius,
          },
          style,
        ]}
        {...rest}
      >
        {tintColor ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: tintColor, pointerEvents: 'none' },
            ]}
          />
        ) : null}
        {children}
      </GlassView>
    );
  }

  // Fallback for Android and Web. We avoid expensive blur that causes stuttering,
  // and instead use an adaptive translucent tint matching the token definition.
  return (
    <View
      style={[
        {
          backgroundColor: tintColor || tokens.backgroundColor,
          borderWidth: tokens.borderWidth,
          borderColor: tokens.borderColor,
          elevation: tokens.elevation,
          shadowColor: tokens.shadowColor,
          shadowOffset: tokens.shadowOffset,
          shadowOpacity: tokens.shadowOpacity,
          shadowRadius: tokens.shadowRadius,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
