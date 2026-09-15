/**
 * Sparkline — a dependency-free trend line.
 *
 * `react-native-svg` is not installed, so this draws the line as a series of
 * rotated 2px views. That sounds crude but it is cheap (one view per segment, no
 * layout passes after mount) and keeps the bundle free of a native dependency
 * for what is a decorative 7-point trend.
 *
 * Extracted from the Home screen so any screen showing a trend uses the same
 * stroke weight, opacity and vertical padding.
 */

import { StyleSheet, View } from 'react-native';

export interface SparklineProps {
  data: number[];
  color: string;
  width?: number;
  height?: number;
  /** Stroke thickness. */
  weight?: number;
}

export function Sparkline({
  data,
  color,
  width = 120,
  height = 40,
  weight = 2,
}: SparklineProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  // Inset by the stroke weight so the line never clips at the edges.
  const inset = weight + 1;

  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * width,
    y: height - (value / max) * (height - inset * 2) - inset,
  }));

  return (
    <View style={{ width, height, overflow: 'hidden' }} accessible={false}>
      {points.slice(0, -1).map((point, index) => {
        const next = points[index + 1]!;
        const dx = next.x - point.x;
        const dy = next.y - point.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        return (
          <View
            key={index}
            style={[
              styles.segment,
              {
                left: point.x,
                top: point.y,
                width: length,
                height: weight,
                borderRadius: weight / 2,
                backgroundColor: color,
                transform: [{ rotate: `${angle}deg` }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    position: 'absolute',
    opacity: 0.75,
    // Rotate about the left edge so consecutive segments join end to end.
    transformOrigin: '0 50%',
  },
});
