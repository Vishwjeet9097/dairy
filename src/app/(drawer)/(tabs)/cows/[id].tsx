import { useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Edit2, Plus, Trash2 } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable, Keyboard } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import { AppGlassMaterial } from '@/components/ui/glass';
import { Badge, BottomFog, Button, EmptyState, IconButton, Screen, SectionHeading, Text } from '@/components/ui';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Field } from '@/components/ui/field';
import { Colors, Layout, Radius, Type } from '@/constants/theme';
import {
  useDairyStore,
  todayISO,
  uid,
  calcExpectedCalvingDate,
  daysUntilCalving,
} from '@/lib/dairy-store';
import { useT } from '@/lib/i18n';
import { useAppTheme } from '@/context/theme-context';
import { useNavGuard } from '@/navigation/use-nav-guard';
import { useScreenPadding } from '@/navigation/use-tab-bar-height';
import { ListItem } from '@/components/motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const nav = useNavGuard();
  const t = useT();
  const { accent } = useAppTheme();
  const insets = useSafeAreaInsets();
  const paddingBottom = useScreenPadding();

  const cow = useDairyStore((s) => s.cows.find((c) => c.id === id));
  const allInseminations = useDairyStore((s) => s.inseminations);
  const inseminations = useMemo(() => allInseminations.filter((i) => i.cowId === id), [allInseminations, id]);
  const saveInsemination = useDairyStore((s) => s.saveInsemination);
  const saveCow = useDairyStore((s) => s.saveCow);
  const deleteCow = useDairyStore((s) => s.deleteCow);
  const gestationDays = useDairyStore((s) => s.settings.gestationDays);

  // Edit Cow Form State
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editName, setEditName] = useState(cow?.name || '');
  const [editBreed, setEditBreed] = useState(cow?.breed || '');
  const [editColor, setEditColor] = useState(cow?.color || '');

  // AI Form State
  const [sheetOpen, setSheetOpen] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [insDate, setInsDate] = useState(todayISO());
  const [semenInfo, setSemenInfo] = useState('');
  const [technician, setTechnician] = useState('');

  if (!cow) {
    return (
      <Screen>
        <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 20 }}>
          <IconButton icon={ChevronLeft} onPress={() => nav.back()} accessibilityLabel={t('action.back')} />
        </View>
        <EmptyState title={t('state.cowNotFound')} />
      </Screen>
    );
  }

  const handleSaveAI = () => {
    if (!insDate.trim()) return;

    saveInsemination({
      id: uid(),
      cowId: cow.id,
      date: insDate,
      semenInfo: semenInfo.trim(),
      technician: technician.trim(),
      expectedCalvingDate: calcExpectedCalvingDate(insDate, gestationDays),
      remindersSent: [],
    });

    setSheetOpen(false);
    setInsDate(todayISO());
    setSemenInfo('');
    setTechnician('');
  };

  const handleEditCow = () => {
    if (!cow || !editName.trim()) return;
    saveCow({
      ...cow,
      name: editName.trim(),
      breed: editBreed.trim(),
      color: editColor.trim(),
    });
    setEditSheetOpen(false);
  };

  const handleDeleteCow = () => {
    deleteCow(id);
    nav.back();
  };

  const getStatusTone = (s: string) => {
    if (s === 'active') return 'success';
    if (s === 'pregnant') return 'accent';
    if (s === 'dry') return 'warning';
    return 'neutral';
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom }} showsVerticalScrollIndicator={false}>
        <AppGlassMaterial level="elevated" style={[styles.hero, { paddingTop: insets.top + 20 }]}>
          <View style={styles.heroNav}>
            <IconButton icon={ChevronLeft} onPress={() => nav.back()} accessibilityLabel={t('action.back')} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Badge label={t(`cowStatus.${cow.status}` as any)} tone={getStatusTone(cow.status)} />
              <IconButton 
                icon={Edit2} 
                onPress={() => {
                  setEditName(cow.name);
                  setEditBreed(cow.breed);
                  setEditColor(cow.color || '');
                  setEditSheetOpen(true);
                }} 
                accessibilityLabel="Edit Cow" 
                size={36} 
                iconSize={18} 
              />
            </View>
          </View>

          <Text style={styles.cowName}>{cow.name}</Text>
          <Text style={styles.cowBreed}>{cow.breed}</Text>
        </AppGlassMaterial>

        <View style={styles.content}>
          <SectionHeading
            title={t('section.inseminationHistory')}
            action={
              <Button
                label={t('title.addInsemination')}
                onPress={() => setSheetOpen(true)}
                icon={Plus}
                size="md"
                variant="soft"
                pill
              />
            }
          />

          {inseminations.length === 0 ? (
            <EmptyState title={t('state.noInseminations')} description="Record AI details here." />
          ) : (
            <View style={styles.aiList}>
              {inseminations.map((ins, index) => {
                const days = daysUntilCalving(ins.expectedCalvingDate);
                const isOverdue = days < 0;
                
                return (
                  <ListItem key={ins.id} index={index} style={styles.aiCard}>
                    <View style={styles.aiRow}>
                      <View style={styles.aiCol}>
                        <Text style={styles.aiLabel}>{t('label.inseminationDate')}</Text>
                        <Text style={styles.aiValue}>{ins.date}</Text>
                      </View>
                      <View style={styles.aiCol}>
                        <Text style={styles.aiLabel}>{t('label.expectedCalving')}</Text>
                        <Text style={styles.aiValue}>{ins.expectedCalvingDate}</Text>
                      </View>
                    </View>
                    
                    <View style={styles.aiDetails}>
                      {ins.semenInfo ? <Text style={styles.aiMeta}>{ins.semenInfo}</Text> : null}
                      {ins.technician ? <Text style={styles.aiMeta}>{ins.technician}</Text> : null}
                    </View>
                    
                    {!ins.actualCalvingDate && (
                      <View style={[styles.countdownBadge, { backgroundColor: accent.soft }, isOverdue ? styles.countdownOverdue : null]}>
                        <Text style={[styles.countdownText, { color: accent.color }, isOverdue ? styles.countdownTextOverdue : null]}>
                          {Math.abs(days)} {isOverdue ? t('label.daysOverdue') : t('label.daysRemaining')}
                        </Text>
                      </View>
                    )}
                  </ListItem>
                );
              })}
            </View>
          )}

          <View style={{ marginTop: 40, marginBottom: 20 }}>
            <Button
              label="Delete Cow"
              onPress={handleDeleteCow}
              icon={Trash2}
              variant="danger"
              size="lg"
              full
            />
          </View>
        </View>
      </ScrollView>

      <BottomFog />

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title={t('title.addInsemination')}>
        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => { Keyboard.dismiss(); setShowDatePicker(true); }}>
            <View pointerEvents="none">
              <Field
                label={t('label.inseminationDate')}
                placeholder="Select Date"
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
            label={t('label.semenInfo')}
            placeholder={t('placeholder.semenInfo')}
            value={semenInfo}
            onChangeText={setSemenInfo}
          />
          <Field
            label={t('label.technician')}
            placeholder={t('placeholder.technician')}
            value={technician}
            onChangeText={setTechnician}
          />
          <Button
            label={t('action.save')}
            onPress={handleSaveAI}
            size="lg"
            full
            disabled={!insDate.trim()}
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={editSheetOpen} onClose={() => setEditSheetOpen(false)} title="Edit Cow">
        <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Field
            label={t('label.cowName')}
            placeholder={t('placeholder.cowName')}
            value={editName}
            onChangeText={setEditName}
            autoFocus
          />
          <Field
            label={t('label.breed')}
            placeholder={t('placeholder.breed')}
            value={editBreed}
            onChangeText={setEditBreed}
          />
          <Field
            label="Color"
            placeholder="e.g. Red, Brown, Black"
            value={editColor}
            onChangeText={setEditColor}
          />
          <Button
            label={t('action.save')}
            onPress={handleEditCow}
            size="lg"
            full
            disabled={!editName.trim()}
            style={{ marginTop: 8 }}
          />
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: Layout.gutter,
    paddingBottom: 32,
    borderBottomLeftRadius: Radius.xl,
    borderBottomRightRadius: Radius.xl,
    marginBottom: 24,
  },
  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cowName: {
    ...Type.title,
    color: Colors.foreground,
    marginBottom: 4,
  },
  cowBreed: {
    ...Type.body,
    color: Colors.mutedForeground,
  },
  content: {
    paddingHorizontal: Layout.gutter,
  },
  aiList: {
    gap: 12,
  },
  aiCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  aiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  aiCol: {
    flex: 1,
  },
  aiLabel: {
    ...Type.micro,
    color: Colors.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  aiValue: {
    ...Type.bodyStrong,
    color: Colors.foreground,
  },
  aiDetails: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  aiMeta: {
    ...Type.footnote,
    color: Colors.mutedForeground,
  },
  countdownBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)', // fallback if accent.soft isn't accessible in StyleSheet
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  countdownOverdue: {
    backgroundColor: Colors.dangerSoft,
  },
  countdownText: {
    ...Type.caption,
    fontWeight: '700',
    color: '#6366f1', // fallback
  },
  countdownTextOverdue: {
    color: Colors.danger,
  },
  form: {
    gap: 16,
    paddingBottom: 24,
  },
});
