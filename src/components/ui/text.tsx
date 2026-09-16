import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useDairyStore, type FontSize } from '@/lib/dairy-store';

export function Text(props: TextProps) {
  const fontSizeSetting = useDairyStore((s) => s.settings.fontSize);
  // Default base font size is 14. Scale is calculated relative to that.
  const scale = (typeof fontSizeSetting === 'number' ? fontSizeSetting : 14) / 14.0;

  // Optimize for default scale: pass through directly
  if (scale === 1.0) {
    return <RNText {...props} />;
  }

  // Flatten styles to extract current fontSize
  const flatStyle = StyleSheet.flatten(props.style) || {};
  let scaledStyle = props.style;

  // Assuming a default React Native text size of 14 if none is specified
  const baseFontSize = (typeof flatStyle === 'object' && flatStyle !== null && 'fontSize' in flatStyle && typeof (flatStyle as any).fontSize === 'number') 
    ? (flatStyle as any).fontSize 
    : 14;

  const newFontSize = Math.round(baseFontSize * scale);
  // Append the override size so we don't mutate or lose other styles
  scaledStyle = [props.style, { fontSize: newFontSize }];

  return <RNText {...props} style={scaledStyle} />;
}
