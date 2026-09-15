/**
 * Unmatched route.
 *
 * The app had no not-found route, so a stale deep link or a typo'd path landed
 * on Expo Router's raw debug screen. This keeps the user inside the app with one
 * obvious way back to a known-good destination.
 */

import { Compass } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { AppBar, Button, EmptyState, Screen } from '@/components/ui';
import { Layout } from '@/constants/theme';
import { useT } from '@/lib/i18n';
import { useNavGuard } from '@/navigation/use-nav-guard';

export default function NotFoundScreen() {
  const nav = useNavGuard();
  const t = useT();

  return (
    <Screen>
      <AppBar title={t('state.error')} />
      <View style={styles.body}>
        <EmptyState
          icon={Compass}
          title="This screen doesn't exist"
          description="The link may be out of date. Head back to the dashboard to carry on."
          action={
            /**
             * `replace`, not `push`: the unmatched route should not stay in the
             * history for the user to land on again by pressing back.
             */
            <Button
              label="Go to Home"
              onPress={() => nav.replace('/')}
              variant="primary"
              size="lg"
              full
            />
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: 'center',
    padding: Layout.gutter,
  },
});
