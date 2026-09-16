import { useScrollToTop } from 'expo-router';
import { ChevronRight, Plus } from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Keyboard } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import { ListItem } from '@/components/motion';
import { DrawerToggleButton } from 'expo-router/drawer';
import { Badge, BottomFog, Button, EmptyState, HeaderAction, PressableCard, Screen, ScreenHeader, SearchField, TopFog, Text } from '@/components/ui';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Field } from '@/components/ui/field';
import { PressableScale } from '@/components/motion/pressable-scale';
import { Colors, Layout, Radius, Type } from '@/constants/theme';
import { useDairyStore, type Cow, type CowStatus, todayISO, uid, daysUntilCalving, calcExpectedCalvingDate } from '@/lib/dairy-store';
import { useT } from '@/lib/i18n';
import { useNavGuard } from '@/navigation/use-nav-guard';
import { useScreenPadding } from '@/navigation/use-tab-bar-height';
import { useAppTheme } from '@/context/theme-context';

export default function CowsScreen() {
  const nav = useNavGuard();
  const t = useT();
  const { accent } = useAppTheme();

  const cows = useDairyStore((s) => s.cows);
  const inseminations = useDairyStore((s) => s.inseminations);
  const saveCow = useDairyStore((s) => s.saveCow);
  const saveInsemination = useDairyStore((s) => s.saveInsemination);
  
  const [query, setQuery] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [status, setStatus] = useState<CowStatus>('active');
  const [color, setColor] = useState(''); 
  const [insDate, setInsDate] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [doctor, setDoctor] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const paddingBottom = useScreenPadding();

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = needle 
      ? cows.filter((c) => c.name.toLowerCase().includes(needle) || c.breed.toLowerCase().includes(needle))
      : cows;
      
    return filtered.map((c) => {
      let remainingDays: number | null = null;
      if (c.status === 'pregnant' || c.status === 'dry') {
        const latestIns = inseminations
          .filter((i) => i.cowId === c.id && !i.actualCalvingDate)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        if (latestIns) {
          remainingDays = daysUntilCalving(latestIns.expectedCalvingDate);
        }
      }
      return { ...c, remainingDays };
    });
  }, [cows, query, inseminations]);

  const activeCount = cows.filter((c) => c.status === 'active' || c.status === 'pregnant' || c.status === 'dry').length;

  const handleSave = () => {
    if (!name.trim()) return;
    
    const finalStatus = insDate.trim() ? 'pregnant' : status;
    const cowId = uid();
    
    saveCow({
      id: cowId,
      name: name.trim(),
      breed: breed.trim() || 'Unknown',
      status: finalStatus,
      color: color.trim(),
      createdAt: new Date().toISOString(),
    });
    
    if (insDate.trim()) {
      saveInsemination({
        id: uid(),
        cowId,
        date: insDate.trim(),
        technician: doctor.trim(),
        expectedCalvingDate: calcExpectedCalvingDate(insDate.trim(), 280),
        remindersSent: [],
      });
    }
    
    setSheetOpen(false);
    setName('');
    setBreed('');
    setStatus('active');
    setColor('');
    setInsDate('');
    setDoctor('');
  };

  const getStatusTone = (s: CowStatus) => {
    if (s === 'active') return 'success';
    if (s === 'pregnant') return 'accent';
    if (s === 'dry') return 'warning';
    return 'neutral';
  };

  return (
    <Screen statusBar="light">
      <ScreenHeader
        title={t('title.cows')}
        subtitle={`${activeCount} ${t('cowStatus.active')} · ${cows.length} total`}
        leftAction={<DrawerToggleButton tintColor="#FFF" />}
      >
        <SearchField
          value={query}
          onChangeText={setQuery}
          placeholder={t('placeholder.searchCows')}
        />
      </ScreenHeader>

      <TopFog />

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom }]}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        <View style={styles.overlap}>
          {list.map((cow, index) => (
            <ListItem key={cow.id} index={index} style={styles.rowWrap}>
              <PressableCard
                onPress={() => nav.push(`/cows/${cow.id}`)}
                accessibilityLabel={cow.name}
                padding={16}
              >
                <View style={styles.row}>
                  <View style={[styles.avatar, { backgroundColor: cow.remainingDays !== null ? accent.soft : Colors.surface }]}>
                    {cow.remainingDays !== null && (
                      <View style={styles.daysIconContainer}>
                        <Text style={[styles.avatarText, { color: accent.color }]} numberOfLines={1}>
                          {cow.remainingDays > 0 ? cow.remainingDays : '!'}
                        </Text>
                        {cow.remainingDays > 0 && (
                          <Text style={[styles.daysText, { color: accent.color }]} numberOfLines={1}>
                            {t('label.days')}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.name} numberOfLines={1}>
                      {cow.name}
                    </Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {cow.breed}
                    </Text>
                  </View>

                  <Badge 
                    label={t(`cowStatus.${cow.status}` as any)} 
                    tone={getStatusTone(cow.status)} 
                  />

                  <ChevronRight size={18} color={Colors.border} style={styles.chevron} />
                </View>
              </PressableCard>
            </ListItem>
          ))}

          {list.length === 0 ? (
            <EmptyState
              icon={Plus}
              title={query ? t('state.noMatches') : t('state.noCows')}
              description={query ? t('state.noMatches') : t('state.noCows')}
              action={
                query ? undefined : (
                  <Button
                    label={t('title.addCow')}
                    onPress={() => setSheetOpen(true)}
                    icon={Plus}
                    size="lg"
                  />
                )
              }
            />
          ) : null}
        </View>
      </ScrollView>

      {/* Floating Action Button - Bottom Left */}
      <View style={styles.fabContainer}>
        <Button
          label={t('title.addCow')}
          onPress={() => setSheetOpen(true)}
          icon={Plus}
          size="lg"
          pill
        />
      </View>

      <BottomFog />

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={t('title.addCow')}
      >
        <ScrollView 
          contentContainerStyle={styles.form} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Field
            label={t('label.cowName')}
            placeholder={t('placeholder.cowName')}
            value={name}
            onChangeText={setName}
            autoFocus
          />
          <Field
            label={t('label.breed')}
            placeholder={t('placeholder.breed')}
            value={breed}
            onChangeText={setBreed}
          />
          <Field
            label={t('label.color')}
            placeholder={t('placeholder.color')}
            value={color}
            onChangeText={setColor}
          />
          <Pressable onPress={() => { Keyboard.dismiss(); setShowDatePicker(true); }}>
            <View pointerEvents="none">
              <Field
                label={t('label.inseminationDate')}
                placeholder={t('placeholder.dateOptional')}
                value={insDate}
                onChangeText={setInsDate}
              />
            </View>
          </Pressable>

          <DateTimePickerModal
            isVisible={showDatePicker}
            mode="date"
            date={insDate ? new Date(insDate) : new Date()}
            onConfirm={(date) => {
              setShowDatePicker(false);
              setInsDate(date.toISOString().split('T')[0]);
            }}
            onCancel={() => setShowDatePicker(false)}
            display="inline"
          />
          <Field
            label={t('label.doctorName')}
            placeholder={t('placeholder.doctorName')}
            value={doctor}
            onChangeText={setDoctor}
          />
          <Button 
            label={t('action.save')} 
            onPress={handleSave} 
            size="lg" 
            full 
            disabled={!name.trim()}
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 150,
    right: 24,
    zIndex: 10,
  },
  content: {
    paddingTop: 24,
  },
  overlap: {
    paddingHorizontal: Layout.gutter,
  },
  rowWrap: {
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  name: {
    ...Type.bodyStrong,
    color: Colors.foreground,
    marginBottom: 4,
  },
  meta: {
    ...Type.footnote,
    color: Colors.mutedForeground,
  },
  chevron: {
    marginLeft: 4,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...Type.bodyStrong,
    fontSize: 16,
  },
  daysIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: -2,
    textTransform: 'uppercase',
  },
  form: {
    gap: 16,
    paddingBottom: 24,
  },
  fieldLabel: {
    ...Type.footnote,
    fontWeight: '800',
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  colorRow: {
    gap: 12,
    paddingVertical: 4,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorCircleSelected: {
    borderColor: Colors.foreground,
  }
});
