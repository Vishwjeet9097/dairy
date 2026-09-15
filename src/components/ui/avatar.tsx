/**
 * Customer avatar — initial on a soft accent disc.
 *
 * Unchanged in behaviour from the original `Avatar`, but now sized from the
 * radius scale and with the text capped against font scaling so a large-font
 * device cannot push the initial outside the circle.
 */

import { StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';

export interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 40 }: AvatarProps) {
  const { accent } = useAppTheme();
  const initial = name?.trim() ? name.trim().charAt(0).toUpperCase() : '?';

  return (
    <View
      accessible={false}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: Radius.full,
          backgroundColor: accent.soft,
        },
      ]}
    >
      <Text
        // Fixed ratio to the disc — must not scale with system font size or the
        // glyph overflows the circle.
        allowFontScaling={false}
        style={{ fontSize: size * 0.4, fontWeight: '800', color: accent.color }}
      >
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
});
