import { useScrollToTop } from 'expo-router';
import { IndianRupee, Plus, Receipt } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AnimatedValueText, ListItem } from '@/components/motion';
import { DrawerToggleButton } from 'expo-router/drawer';
import { Badge, BottomFog, Button, Card, EmptyState, HeaderAction, Screen, ScreenHeader, SearchField, TopFog, Text } from '@/components/ui';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Field } from '@/components/ui/field';
import { Colors, Layout, Radius, Type } from '@/constants/theme';
import { useDairyStore, todayISO, uid, money0 } from '@/lib/dairy-store';
import { useT } from '@/lib/i18n';
import { useScreenPadding } from '@/navigation/use-tab-bar-height';

export default function FeedScreen() {
  const t = useT();

  const feedEntries = useDairyStore((s) => s.feedEntries);
  const saveFeedEntry = useDairyStore((s) => s.saveFeedEntry);
  const recordFeedPayment = useDairyStore((s) => s.recordFeedPayment);
  
  const [query, setQuery] = useState('');
  
  // Sheet states
  const [addSheetOpen, setAddSheetOpen] = useState(false);
  const [paySheetOpen, setPaySheetOpen] = useState(false);
  const [selectedFeedId, setSelectedFeedId] = useState<string | null>(null);
  
  // Add Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('kg');
  const [rate, setRate] = useState('');
  
  // Pay Form State
  const [payAmount, setPayAmount] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const paddingBottom = useScreenPadding();

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let sorted = [...feedEntries].sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
    if (!needle) return sorted;
    return sorted.filter(
      (f) => f.name.toLowerCase().includes(needle) || f.category?.toLowerCase().includes(needle),
    );
  }, [feedEntries, query]);

  const totalCost = feedEntries.reduce((sum, f) => sum + f.totalCost, 0);
  const totalDue = feedEntries.reduce((sum, f) => sum + f.remainingAmount, 0);

  const handleSaveFeed = () => {
    const q = parseFloat(qty);
    const r = parseFloat(rate);
    if (!name.trim() || isNaN(q) || isNaN(r) || q <= 0 || r <= 0) return;

    saveFeedEntry({
      id: uid(),
      name: name.trim(),
      category: category.trim(),
      quantity: q,
      unit,
      purchaseDate: todayISO(),
      rate: r,
      totalCost: q * r,
      paidAmount: 0,
      remainingAmount: q * r,
      paymentStatus: 'due',
    });
    
    setAddSheetOpen(false);
    setName(''); setCategory(''); setQty(''); setRate('');
  };

  const handleSavePayment = () => {
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0 || !selectedFeedId) return;
    
    recordFeedPayment(selectedFeedId, amt);
    setPaySheetOpen(false);
    setPayAmount('');
    setSelectedFeedId(null);
  };

  const getStatusTone = (s: string) => {
    if (s === 'paid') return 'success';
    if (s === 'partial') return 'accent';
    return 'danger';
  };

  return (
    <Screen statusBar="light">
      <ScreenHeader
        title={t('title.feed')}
        subtitle={`${feedEntries.length} entries · ${money0(totalDue)} due`}
        leftAction={<DrawerToggleButton tintColor="#FFF" />}
        action={
          <HeaderAction
            icon={Plus}
            onPress={() => setAddSheetOpen(true)}
            accessibilityLabel={t('title.addFeed')}
          />
        }
      >
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={t('placeholder.searchFeed')}
        />
      </ScreenHeader>

      <TopFog />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        <View style={styles.section}>
          <Card padding={0} radius="lg">
            <View style={styles.moneyList}>
              <View style={[styles.moneyRow, styles.moneyBordered]}>
                <View style={[styles.moneyIcon, { backgroundColor: Colors.infoSoft }]}>
                  <Receipt size={16} color={Colors.info} />
                </View>
                <Text style={styles.moneyLabel} numberOfLines={1}>{t('label.totalCost')}</Text>
                <AnimatedValueText value={totalCost} format={money0} style={[styles.moneyValue, { color: Colors.foreground }]} />
              </View>
              <View style={styles.moneyRow}>
                <View style={[styles.moneyIcon, { backgroundColor: totalDue > 0 ? Colors.dangerSoft : Colors.successSoft }]}>
                  <IndianRupee size={16} color={totalDue > 0 ? Colors.danger : Colors.success} />
                </View>
                <Text style={styles.moneyLabel} numberOfLines={1}>{t('label.totalFeedDue')}</Text>
                <AnimatedValueText value={totalDue} format={money0} style={[styles.moneyValue, { color: totalDue > 0 ? Colors.danger : Colors.success }]} />
              </View>
            </View>
          </Card>
        </View>

        <View style={styles.section}>
          {list.map((feed, index) => (
            <ListItem key={feed.id} index={index} style={styles.rowWrap}>
              <View style={styles.feedCard}>
                <View style={styles.feedHeader}>
                  <View style={styles.feedTitleWrap}>
                    <Text style={styles.feedName} numberOfLines={1}>{feed.name}</Text>
                    {feed.category ? <Text style={styles.feedCategory}>{feed.category}</Text> : null}
                  </View>
                  <Badge label={t(`feedStatus.${feed.paymentStatus}` as any)} tone={getStatusTone(feed.paymentStatus)} />
                </View>

                <View style={styles.feedDetails}>
                  <View style={styles.feedStat}>
                    <Text style={styles.feedStatLabel}>{t('label.quantity')}</Text>
                    <Text style={styles.feedStatValue}>{feed.quantity} {feed.unit}</Text>
                  </View>
                  <View style={styles.feedStat}>
                    <Text style={styles.feedStatLabel}>{t('label.rate')}</Text>
                    <Text style={styles.feedStatValue}>{money0(feed.rate)}</Text>
                  </View>
                  <View style={styles.feedStat}>
                    <Text style={styles.feedStatLabel}>{t('label.totalCost')}</Text>
                    <Text style={styles.feedStatValue}>{money0(feed.totalCost)}</Text>
                  </View>
                </View>

                <View style={styles.feedFooter}>
                  <Text style={styles.feedRemaining}>
                    {feed.remainingAmount > 0 
                      ? `${money0(feed.remainingAmount)} ${t('status.unpaid').toLowerCase()}` 
                      : t('status.paid')}
                  </Text>
                  {feed.remainingAmount > 0 && (
                    <Button 
                      label={t('action.recordFeedPayment')} 
                      onPress={() => { setSelectedFeedId(feed.id); setPaySheetOpen(true); }} 
                      size="md" 
                      variant="soft" 
                      pill 
                    />
                  )}
                </View>
              </View>
            </ListItem>
          ))}

          {list.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={query ? t('state.noMatches') : t('state.noFeed')}
              description={query ? 'Try a different feed name.' : 'Record feed and fodder purchases here.'}
              action={query ? undefined : (
                <Button label={t('title.addFeed')} onPress={() => setAddSheetOpen(true)} icon={Plus} size="lg" full />
              )}
            />
          ) : null}
        </View>
      </ScrollView>
      <BottomFog />

      <BottomSheet visible={addSheetOpen} onClose={() => setAddSheetOpen(false)} title={t('title.addFeed')}>
        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Field label={t('label.feedName')} placeholder={t('placeholder.feedName')} value={name} onChangeText={setName} />
          <Field label={t('label.feedCategory')} placeholder={t('placeholder.feedCategory')} value={category} onChangeText={setCategory} />
          
          <View style={styles.formRow}>
            <Field label={t('label.quantity')} placeholder="0" value={qty} onChangeText={setQty} keyboardType="numeric" containerStyle={{ flex: 1 }} />
            <Field label={t('label.unit')} placeholder={t('placeholder.unit')} value={unit} onChangeText={setUnit} containerStyle={{ flex: 1 }} />
          </View>
          
          <Field label={t('label.ratePerUnit')} placeholder="0" value={rate} onChangeText={setRate} keyboardType="numeric" />
          
          <Button label={t('action.save')} onPress={handleSaveFeed} size="lg" full style={{ marginTop: 8 }} />
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={paySheetOpen} onClose={() => setPaySheetOpen(false)} title={t('title.addPayment')}>
        <ScrollView style={{ maxHeight: 450 }} contentContainerStyle={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Field label={t('section.amount')} placeholder="0" value={payAmount} onChangeText={setPayAmount} keyboardType="numeric" autoFocus />
          <Button label={t('action.confirm')} onPress={handleSavePayment} size="lg" full style={{ marginTop: 8 }} />
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 24,
  },
  section: {
    paddingHorizontal: Layout.gutter,
    marginBottom: 24,
  },
  moneyList: {
    paddingVertical: 4,
  },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  moneyBordered: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  moneyIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moneyLabel: {
    flex: 1,
    ...Type.bodyStrong,
    color: Colors.foreground,
  },
  moneyValue: {
    ...Type.title,
  },
  rowWrap: {
    marginBottom: 16,
  },
  feedCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  feedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  feedTitleWrap: {
    flex: 1,
    marginRight: 12,
  },
  feedName: {
    ...Type.bodyStrong,
    color: Colors.foreground,
    marginBottom: 4,
  },
  feedCategory: {
    ...Type.footnote,
    color: Colors.mutedForeground,
  },
  feedDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: Radius.md,
    marginBottom: 16,
  },
  feedStat: {
    alignItems: 'center',
  },
  feedStatLabel: {
    ...Type.micro,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  feedStatValue: {
    ...Type.body,
    fontWeight: '700',
    color: Colors.foreground,
  },
  feedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedRemaining: {
    ...Type.footnote,
    color: Colors.danger,
    fontWeight: '700',
  },
  form: {
    gap: 16,
    paddingBottom: 24,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
