/**
 * Reports.
 *
 * A push inside the More tab, so it gets a back affordance and keeps the bottom
 * navigation — it is a reading screen, not a task.
 */

import { BarChart2, Download, FileText, IndianRupee, Milk, TrendingUp } from 'lucide-react-native';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { DrawerToggleButton } from 'expo-router/drawer';

import { AnimatedValueText, useFeedback } from '@/components/motion';
import { Badge, BottomFog, Card, NavRow, Screen, ScreenHeader, SectionHeading, Text } from '@/components/ui';
import { Colors, Layout, Radius, Type } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import {
  addDaysISO,
  collectionOn,
  milkOn,
  money0,
  todayISO,
  totalOutstanding,
  useDairyStore,
} from '@/lib/dairy-store';
import { useT } from '@/lib/i18n';
import { useScreenPadding } from '@/navigation/use-tab-bar-height';

const CHART_HEIGHT = 88;

export default function ReportsScreen() {
  const { accent } = useAppTheme();
  const t = useT();
  const feedback = useFeedback();

  const customers = useDairyStore((s) => s.customers);
  const deliveries = useDairyStore((s) => s.deliveries);
  const payments = useDairyStore((s) => s.payments);

  const paddingBottom = useScreenPadding();

  /**
   * All seven days computed in one memo against subscribed slices. Previously
   * this ran 14 full scans of `deliveries`/`payments` on every single render,
   * via `getState()` snapshots React knew nothing about.
   */
  const { daily, milk7d, collection7d, outstanding } = useMemo(() => {
    const state = { customers, deliveries, payments } as Parameters<typeof totalOutstanding>[0];
    const today = todayISO();
    const rows: { day: string; milk: number; collection: number }[] = [];
    let milkTotal = 0;
    let collectionTotal = 0;

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = addDaysISO(today, -offset);
      const milk = milkOn(state, date);
      const collection = collectionOn(state, date);
      milkTotal += milk;
      collectionTotal += collection;
      rows.push({
        day: new Date(`${date}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' }),
        milk,
        collection,
      });
    }

    return {
      daily: rows,
      milk7d: milkTotal,
      collection7d: collectionTotal,
      outstanding: totalOutstanding(state),
    };
  }, [customers, deliveries, payments]);

  const maxMilk = Math.max(...daily.map((d) => d.milk), 1);

  return (
    <Screen>
      <ScreenHeader
        title={t('title.reports')}
        subtitle="View farm analytics"
        leftAction={<DrawerToggleButton tintColor="#FFF" />}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Outstanding */}
        <Card radius="xxl" padding={24} style={styles.hero}>
          <Text style={styles.heroLabel}>{t('label.totalOutstanding')}</Text>
          <AnimatedValueText
            value={outstanding}
            format={money0}
            style={[
              styles.heroValue,
              { color: outstanding > 0 ? Colors.danger : Colors.success },
            ]}
          />
          <View style={styles.heroBadge}>
            <TrendingUp size={13} color={accent.color} />
            <Badge label="LIVE" tone="accent" />
          </View>
        </Card>

        <SectionHeading title={t('section.last7Days')} />

        <View style={styles.tiles}>
          <Card radius="xl" padding={18} style={styles.tile}>
            <View style={[styles.tileIcon, { backgroundColor: accent.soft }]}>
              <IndianRupee size={20} color={accent.color} />
            </View>
            <AnimatedValueText
              value={collection7d}
              format={money0}
              style={styles.tileValue}
            />
            <Text style={styles.tileLabel}>{t('label.collected')}</Text>
          </Card>

          <Card radius="xl" padding={18} style={styles.tile}>
            <View style={[styles.tileIcon, { backgroundColor: accent.soft }]}>
              <Milk size={20} color={accent.color} />
            </View>
            <AnimatedValueText
              value={milk7d}
              format={(n) => `${n.toFixed(1)} L`}
              style={styles.tileValue}
            />
            <Text style={styles.tileLabel}>{t('label.delivered')}</Text>
          </Card>
        </View>

        {/* Bar chart */}
        <Card radius="xl" padding={18} style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>{t('label.dailyMilk')}</Text>
            <BarChart2 size={18} color={Colors.mutedForeground} />
          </View>

          <View
            style={styles.chart}
            accessibilityRole="image"
            accessibilityLabel={`Daily milk for the last 7 days, peak ${maxMilk.toFixed(1)} litres`}
          >
            {daily.map((entry, index) => {
              const isToday = index === daily.length - 1;
              const height = Math.max(6, (entry.milk / maxMilk) * (CHART_HEIGHT - 16));

              return (
                <View key={entry.day + index} style={styles.barColumn}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor: isToday ? accent.color : `${accent.color}40`,
                      },
                    ]}
                  />
                  <Text style={styles.barLabel}>{entry.day}</Text>
                </View>
              );
            })}
          </View>
        </Card>

        <Card padding={0}>
          <View style={styles.exportInner}>
            <NavRow
              icon={FileText}
              iconBackground={accent.soft}
              iconColor={accent.color}
              label="Detailed ledger"
              detail="Export"
              onPress={() =>
                // Honest feedback instead of a dead tap: the export pipeline is
                // not built, and silently doing nothing reads as a bug.
                feedback.error(t('error.exportUnavailable'))
              }
              last
            />
          </View>
        </Card>
      </ScrollView>
      <BottomFog />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Layout.gutter,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 22,
  },
  heroLabel: {
    ...Type.caption,
    fontWeight: '700',
    color: Colors.mutedForeground,
    marginBottom: 8,
  },
  heroValue: {
    ...Type.display,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  tiles: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 22,
  },
  tile: {
    flex: 1,
  },
  tileIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tileValue: {
    ...Type.heading,
    fontSize: 20,
    color: Colors.foreground,
  },
  tileLabel: {
    ...Type.caption,
    color: Colors.mutedForeground,
    marginTop: 2,
  },
  chartCard: {
    marginBottom: 22,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  chartTitle: {
    ...Type.body,
    fontWeight: '800',
    color: Colors.foreground,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: CHART_HEIGHT,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  bar: {
    width: 22,
    borderTopLeftRadius: Radius.xs,
    borderTopRightRadius: Radius.xs,
  },
  barLabel: {
    ...Type.micro,
    color: Colors.mutedForeground,
  },
  exportInner: {
    paddingHorizontal: 18,
  },
});
