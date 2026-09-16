import MaskedView from '@react-native-masked-view/masked-view';
import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

export function TopFog() {
  const insets = useSafeAreaInsets();
  
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          bottom: 'auto',
          // Make it just tall enough to cover the status bar + a slight fade area
          height: Math.max(insets.top + 30, 80),
          zIndex: 50, // Sits above scroll content
        },
      ]}
    >
      {Platform.OS === 'ios' ? (
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <LinearGradient
              colors={['rgba(0,0,0,1)', 'transparent']}
              locations={[0.5, 1]}
              style={StyleSheet.absoluteFill}
            />
          }
        >
          {/* Light glass effect for apple style subtle blur */}
          <GlassView glassEffectStyle="regular" colorScheme="light" style={StyleSheet.absoluteFill} />
        </MaskedView>
      ) : (
        <LinearGradient
          colors={[Colors.background, 'transparent']}
          locations={[0.3, 1]}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}
