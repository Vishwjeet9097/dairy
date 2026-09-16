/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ACTION FEEDBACK
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Confirms that something completed: a payment recorded, a customer added, a
 * bill generated. Previously these used `Alert.alert`, which stops the app dead
 * and demands a tap to dismiss — heavy punctuation for a success.
 *
 * Design decisions:
 *
 * • Anchored to the *top*, not the bottom. The bottom edge is already crowded
 *   with the tab bar and pinned CTAs, and it is where the user's thumb is. A top
 *   banner can never overlap either, on any screen, whether or not the tab bar
 *   is showing.
 *
 * • Non-blocking (`pointerEvents: 'none'`). The banner is information, not a
 *   decision, so it must never intercept a tap.
 *
 * • Auto-dismisses. A success needs no acknowledgement.
 *
 * • Mounted once at the root, above the navigator, so it survives the
 *   navigation that usually follows the action it is confirming — closing a form
 *   and confirming the save are the same moment.
 */

import { CheckCircle2, AlertCircle } from 'lucide-react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui';
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Curve, Duration, ErrorAnimation, SuccessAnimation } from '@/constants/motion';
import { Colors, Layout, Radius, Type } from '@/constants/theme';

type Tone = 'success' | 'error';

interface FeedbackMessage {
  id: number;
  tone: Tone;
  message: string;
}

interface FeedbackApi {
  /** Confirm a completed action. */
  success: (message: string) => void;
  /** Report a failure. Stays on screen a little longer than a success. */
  error: (message: string) => void;
}

const FeedbackContext = createContext<FeedbackApi>({
  success: () => {},
  error: () => {},
});

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<FeedbackMessage | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const show = useCallback((tone: Tone, message: string) => {
    if (timer.current) clearTimeout(timer.current);

    nextId.current += 1;
    // A fresh id remounts the banner, so a second action re-runs the entrance
    // animation instead of silently swapping the text of a banner already
    // halfway through its dismissal.
    setCurrent({ id: nextId.current, tone, message });

    // Errors are held longer: they carry information that has to be read.
    timer.current = setTimeout(
      () => setCurrent(null),
      tone === 'error' ? ErrorAnimation.holdMs : SuccessAnimation.holdMs,
    );
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const api = useMemo<FeedbackApi>(
    () => ({
      success: (message: string) => show('success', message),
      error: (message: string) => show('error', message),
    }),
    [show],
  );

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      <FeedbackBanner message={current} />
    </FeedbackContext.Provider>
  );
}

function FeedbackBanner({ message }: { message: FeedbackMessage | null }) {
  const insets = useSafeAreaInsets();

  if (!message) return null;

  const isError = message.tone === 'error';
  const Icon = isError ? AlertCircle : CheckCircle2;

  return (
    <View
      // Never intercepts touches — see header note.
      pointerEvents="none"
      style={[styles.host, { top: insets.top + 8 }]}
    >
      <Animated.View
        key={message.id}
        // Explicit initial offset: enters from just above its resting place and
        // settles down. Small travel, so it appears rather than flies in.
        entering={FadeInUp.duration(Duration.feedback)
          .easing(Curve.decelerate)
          .withInitialValues({
            transform: [
              {
                translateY: isError
                  ? ErrorAnimation.travel
                  : SuccessAnimation.travel,
              },
            ],
          })}
        exiting={FadeOut.duration(Duration.normal)}
        style={[
          styles.banner,
          {
            backgroundColor: isError ? Colors.dangerSoft : Colors.successSoft,
            borderColor: isError ? Colors.danger : Colors.success,
          },
        ]}
      >
        <Icon size={19} color={isError ? Colors.danger : Colors.success} />
        <Text
          numberOfLines={2}
          style={[
            styles.text,
            { color: isError ? Colors.danger : Colors.success },
          ]}
        >
          {message.message}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * Access the feedback API.
 *
 *   const feedback = useFeedback();
 *   feedback.success('Payment recorded');
 */
export function useFeedback(): FeedbackApi {
  return useContext(FeedbackContext);
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: Layout.gutter,
    right: Layout.gutter,
    // Above the tab bar (50) and any in-screen chrome.
    zIndex: 100,
    alignItems: 'center',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
    maxWidth: 460,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  text: {
    ...Type.callout,
    fontWeight: '700',
    flex: 1,
  },
});
