/**
 * List item entrance / exit.
 *
 * Restrained on purpose. Lists in this app are the main content — a customer
 * list, a delivery round — and the user's goal is to read them, not to watch
 * them assemble. So: a short fade with a few pixels of upward drift, staggered
 * only for the first handful of rows.
 *
 * The stagger cap matters. Without it, a 40-customer list would take
 * 40 × 28ms ≈ 1.1s to finish appearing, and the rows at the bottom would still
 * be animating after the user started scrolling. `Stagger.delay` flattens
 * everything past the sixth row to the same delay.
 *
 * `LinearTransition` handles *movement* — when a row is removed, the rows below
 * slide up into place rather than jumping. That is the part that actually
 * communicates something ("that row is gone"), so it is the part worth keeping
 * even when entrances are disabled.
 */

import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  FadeOut,
  FadeInDown,
  LinearTransition,
} from 'react-native-reanimated';

import { Curve, Duration, ListTransition } from '@/constants/motion';
import { useDecorativeMotion } from '@/hooks/use-motion';

export interface ListItemProps {
  children: ReactNode;
  /** Position in the list — drives the capped entrance stagger. */
  index?: number;
  /**
   * Skip the entrance animation. Set this for rows that were already on screen
   * (e.g. re-renders from a search filter) when you only want layout movement.
   */
  animateEntrance?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ListItem({
  children,
  index = 0,
  animateEntrance = true,
  style,
}: ListItemProps) {
  const decorative = useDecorativeMotion();
  const shouldAnimate = decorative && animateEntrance;

  return (
    <Animated.View
      entering={
        shouldAnimate
          ? FadeInDown.duration(Duration.list)
              .delay(ListTransition.stagger.delay(index))
              // A small drift; a long slide would turn a list into a carousel.
              .withInitialValues({
                transform: [{ translateY: ListTransition.travel }],
              })
              .easing(Curve.decelerate)
          : undefined
      }
      exiting={decorative ? FadeOut.duration(Duration.fast) : undefined}
      // Kept even under reduced motion: this is layout correction, not decoration.
      layout={LinearTransition.duration(Duration.normal).easing(Curve.standard)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}
