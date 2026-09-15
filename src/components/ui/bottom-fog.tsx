import MaskedView from '@react-native-masked-view/masked-view';
import { GlassView } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';

export function BottomFog() {
  return (
    <View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          top: 'auto',
          height: 180,
          zIndex: 10, // Sits above scroll content (default 0), but below buttons (usually > 10)
        },
      ]}
    >
      {Platform.OS === 'ios' ? (
        <MaskedView
          style={StyleSheet.absoluteFill}
          maskElement={
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,1)']}
              locations={[0, 0.4]}
              style={StyleSheet.absoluteFill}
            />
          }
        >
          <GlassView glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
        </MaskedView>
      ) : (
        <LinearGradient
          colors={['transparent', Colors.background]}
          locations={[0, 0.6]}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}
