/**
 * Web fallback for the Map Picker Modal.
 * react-native-maps does not support web out of the box without additional setup.
 * This mock ensures Metro doesn't crash when bundling for web.
 */
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, IconButton, Text } from '@/components/ui';
import { Colors, Layout, Type } from '@/constants/theme';
import { X } from 'lucide-react-native';

export interface MapPickerModalProps {
  visible: boolean;
  initialLatitude?: number;
  initialLongitude?: number;
  initialAddress?: string;
  onConfirm: (address: string, lat: number, lng: number) => void;
  onClose: () => void;
}

export default function MapPickerModalWeb({ visible, onClose }: MapPickerModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <IconButton icon={X} onPress={onClose} accessibilityLabel="Close" />
        </View>
        <View style={styles.content}>
          <Text style={styles.title}>Map Unavailable on Web</Text>
          <Text style={styles.text}>
            Please use the Android or iOS Expo Go app to pick a location on the map.
          </Text>
          <Button label="Go Back" onPress={onClose} full />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: Layout.gutter,
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    padding: Layout.gutter,
    justifyContent: 'center',
    gap: 16,
  },
  title: {
    ...Type.title,
    color: Colors.foreground,
    textAlign: 'center',
  },
  text: {
    ...Type.body,
    color: Colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 20,
  },
});
