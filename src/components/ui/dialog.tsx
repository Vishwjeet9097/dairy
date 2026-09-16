/**
 * Dialog.
 *
 * Replaces `Alert.alert` for confirmations that need to match the app's visual
 * language. `Alert` is fine for OS-level messages but it cannot be themed, so a
 * destructive confirm looked like a system error rather than part of the app.
 *
 * Entrance is a fade plus a very slight scale-up from 96%. Dialogs have no
 * spatial origin — they are not "coming from" anywhere — so a slide would imply
 * a direction that doesn't exist. Scale reads as "surfacing".
 */

import type { LucideIcon } from 'lucide-react-native';
import { Modal, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { AppGlassMaterial } from '@/components/ui/glass';
import { DialogTransition, Duration } from '@/constants/motion';
import { Colors, Layout, Radius, Type } from '@/constants/theme';

const AnimatedGlass = Animated.createAnimatedComponent(AppGlassMaterial);

export interface DialogProps {
  visible: boolean;
  title: string;
  message?: string;
  icon?: LucideIcon;
  iconTone?: 'danger' | 'accent';
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
}

export function Dialog({
  visible,
  title,
  message,
  icon: Icon,
  iconTone = 'accent',
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = false,
}: DialogProps) {
  /**
   * `DialogTransition.enter` is a precomputed object, not a factory — this mapper
   * runs on the UI runtime and cannot call a JS function.
   */
  const progress = useDerivedValue(() =>
    withTiming(visible ? 1 : 0, DialogTransition.enter),
  );

  const cardStyle = useAnimatedStyle(() => {
    const from = DialogTransition.fromScale;
    return {
      opacity: progress.value,
      // 0.96 → 1. Any lower and it reads as a pop.
      transform: [{ scale: from + (1 - from) * progress.value }],
    };
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <Animated.View
        entering={FadeIn.duration(Duration.dialog)}
        exiting={FadeOut.duration(Duration.fast)}
        style={styles.backdrop}
      >
        <AnimatedGlass level="elevated" style={[styles.card, cardStyle]}>
          {Icon ? (
            <View
              style={[
                styles.icon,
                {
                  backgroundColor:
                    iconTone === 'danger' ? Colors.dangerSoft : Colors.infoSoft,
                },
              ]}
            >
              <Icon
                size={24}
                color={iconTone === 'danger' ? Colors.danger : Colors.info}
              />
            </View>
          ) : null}

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <View style={styles.actions}>
            <Button
              label={cancelLabel}
              onPress={onCancel}
              variant="soft"
              style={styles.action}
            />
            <Button
              label={confirmLabel}
              onPress={onConfirm}
              variant={destructive ? 'danger' : 'primary'}
              style={styles.action}
            />
          </View>
        </AnimatedGlass>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Layout.gutter,
    backgroundColor: 'rgba(17, 24, 39, 0.4)',
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.xxl,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  title: {
    ...Type.heading,
    color: Colors.foreground,
    textAlign: 'center',
  },
  message: {
    ...Type.callout,
    color: Colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
    alignSelf: 'stretch',
  },
  action: {
    flex: 1,
  },
});
