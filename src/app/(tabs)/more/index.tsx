/**
 * More — the fifth tab.
 *
 * A hub for everything that doesn't earn a permanent tab slot. Reports and
 * Settings used to be tabs; moving them here freed a slot for Delivery, the
 * screen this app exists to serve.
 */

import {
  BarChart3,
  Info,
  Languages,
  Palette,
  Settings as SettingsIcon,
  Store,
} from 'lucide-react-native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  NavRow,
  Screen,
  ScreenHeader,
  SectionLabel,
} from '@/components/ui';
import { Colors, Layout, Radius, Type } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import { useDairyStore } from '@/lib/dairy-store';
import { useT } from '@/lib/i18n';
import { useScreenPadding } from '@/navigation/use-tab-bar-height';
import { useNavGuard } from '@/navigation/use-nav-guard';

export default function MoreScreen() {
  const { accent } = useAppTheme();
  const nav = useNavGuard();
  const t = useT();
  const settings = useDairyStore((s) => s.settings);
  const lang = useDairyStore((s) => s.lang) ?? 'en';

  // Reserves room for the absolutely-positioned tab bar plus the device inset.
  const paddingBottom = useScreenPadding();

  return (
    <Screen statusBar="light">
      <ScreenHeader
        title={t('title.more')}
        subtitle={settings.dairyName}
        bottomInset={44}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Pulled up over the header's rounded edge. */}
        <View style={styles.overlap}>
          <SectionLabel>{t('section.insights')}</SectionLabel>
          <Card padding={0} style={styles.card}>
            <View style={styles.cardInner}>
              <NavRow
                icon={BarChart3}
                iconBackground={accent.soft}
                iconColor={accent.color}
                label={t('title.reports')}
                detail="7-day trends"
                onPress={() => nav.push('/more/reports')}
                last
              />
            </View>
          </Card>

          <SectionLabel>{t('section.configuration')}</SectionLabel>
          <Card padding={0} style={styles.card}>
            <View style={styles.cardInner}>
              <NavRow
                icon={SettingsIcon}
                iconBackground={accent.soft}
                iconColor={accent.color}
                label={t('title.settings')}
                onPress={() => nav.push('/more/settings')}
              />
              <NavRow
                icon={Palette}
                iconBackground={Colors.infoSoft}
                iconColor={Colors.info}
                label={t('section.themeColour')}
                detail={accent.label}
                onPress={() => nav.push('/more/settings')}
              />
              <NavRow
                icon={Languages}
                iconBackground={Colors.warningSoft}
                iconColor={Colors.warning}
                label={t('settings.language')}
                detail={
                  lang === 'hi' ? t('settings.languageHindi') : t('settings.languageEnglish')
                }
                onPress={() => nav.push('/more/settings')}
                last
              />
            </View>
          </Card>

          <SectionLabel>{t('section.about')}</SectionLabel>
          <Card padding={0} style={styles.card}>
            <View style={styles.cardInner}>
              <NavRow
                icon={Store}
                iconBackground={accent.soft}
                iconColor={accent.color}
                label="Dairy Manager"
                detail="Free"
                onPress={() => nav.push('/more/settings')}
                showChevron={false}
              />
              <NavRow
                icon={Info}
                iconBackground={Colors.surface}
                iconColor={Colors.mutedForeground}
                label={t('label.appVersion')}
                detail="1.0.0"
                onPress={() => {}}
                showChevron={false}
                last
              />
            </View>
          </Card>

          <Text style={styles.footer}>{settings.dairyName} · {settings.ownerName}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 0,
  },
  overlap: {
    paddingHorizontal: Layout.gutter,
    marginTop: -24,
  },
  card: {
    marginBottom: 22,
    borderRadius: Radius.xl,
  },
  cardInner: {
    paddingHorizontal: 18,
  },
  footer: {
    ...Type.footnote,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginTop: 4,
  },
});
