/**
 * MapPickerModal — pick a delivery address on a map.
 *
 * Search geocodes via Nominatim (free, no API key); the map is react-native-maps
 * (Apple Maps on iOS, Google Maps on Android). Nominatim's usage policy requires
 * a descriptive User-Agent, which is set below.
 * https://operations.osmfoundation.org/policies/nominatim/
 *
 * Brought onto the shared design system in the consistency pass: it previously
 * hand-rolled its own search input, close button, result rows and CTA with
 * inline styles and raw `TouchableOpacity`, so it was the one screen where press
 * feedback, radii and field styling differed from the rest of the app. It now
 * uses `IconButton`, `Button`, `SearchField`, `PressableScale` and the radius /
 * type tokens.
 *
 * Failures are reported through the shared feedback banner rather than
 * `Alert.alert`, so a failed lookup doesn't block the map behind a system dialog.
 */

import { Check, MapPin, Search, X } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { type MapPressEvent, Marker, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, useFeedback } from '@/components/motion';
import { Button, IconButton, SearchField } from '@/components/ui';
import { Colors, Layout, Radius, Type, softShadow } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';
import { useT } from '@/lib/i18n';

/** Default centre: New Delhi. */
const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.209;
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'DairyManagerApp/1.0 (contact@dairymanager.app)';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function geocodeQuery(query: string): Promise<NominatimResult[]> {
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=in`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  return response.json();
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lon}&format=json`;
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  const data = (await response.json()) as { display_name?: string };
  return data.display_name ?? `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

export interface MapPickerModalProps {
  visible: boolean;
  initialAddress?: string;
  initialLatitude?: number;
  initialLongitude?: number;
  onConfirm: (address: string, lat: number, lng: number) => void;
  onClose: () => void;
}

export default function MapPickerModal({
  visible,
  initialAddress = '',
  initialLatitude,
  initialLongitude,
  onConfirm,
  onClose,
}: MapPickerModalProps) {
  const { accent } = useAppTheme();
  const insets = useSafeAreaInsets();
  const feedback = useFeedback();
  const t = useT();
  const mapRef = useRef<MapView>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(initialAddress);

  const [pin, setPin] = useState({
    lat: initialLatitude ?? DEFAULT_LAT,
    lng: initialLongitude ?? DEFAULT_LNG,
  });

  // Reset to the incoming location each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setPin({
      lat: initialLatitude ?? DEFAULT_LAT,
      lng: initialLongitude ?? DEFAULT_LNG,
    });
    setSelectedAddress(initialAddress);
    setQuery('');
    setResults([]);
  }, [visible, initialLatitude, initialLongitude, initialAddress]);

  const movePinTo = useCallback(
    async (lat: number, lng: number, address?: string) => {
      setPin({ lat, lng });
      setResults([]);
      setQuery('');
      mapRef.current?.animateToRegion(
        { latitude: lat, longitude: lng, latitudeDelta: 0.008, longitudeDelta: 0.008 },
        500,
      );

      if (address) {
        setSelectedAddress(address);
        return;
      }

      setReversing(true);
      try {
        setSelectedAddress(await reverseGeocode(lat, lng));
      } catch {
        // Coordinates are still a usable address; don't lose the user's pick.
        setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } finally {
        setReversing(false);
      }
    },
    [],
  );

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const found = await geocodeQuery(query.trim());
      setResults(found);
      if (found.length === 0) feedback.error(t('error.noAddressFound'));
    } catch {
      feedback.error(t('error.searchFailed'));
    } finally {
      setSearching(false);
    }
  };

  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    void movePinTo(latitude, longitude);
  };

  const handleConfirm = () => {
    if (!selectedAddress) {
      feedback.error(t('error.pickLocation'));
      return;
    }
    onConfirm(selectedAddress, pin.lat, pin.lng);
  };

  const initialRegion: Region = {
    latitude: pin.lat,
    longitude: pin.lng,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      // Android hardware back closes the picker, not the form behind it.
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.flex}>
          {/* ── Search overlay ── */}
          <View style={[styles.searchBar, { paddingTop: insets.top + 8 }]}>
            <View style={styles.searchRow}>
              <IconButton
                icon={X}
                onPress={onClose}
                accessibilityLabel={t('action.close')}
                size={40}
              />

              <View style={styles.flex}>
                <SearchField
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('placeholder.searchAddress')}
                  onSubmitEditing={handleSearch}
                />
              </View>

              {/* Progress is reported in the status row below, so this stays a
                  stable target rather than swapping to a spinner and back. */}
              <IconButton
                icon={Search}
                onPress={handleSearch}
                accessibilityLabel="Search address"
                size={40}
                background={accent.color}
                color="#FFFFFF"
              />
            </View>

            {searching ? (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color={accent.color} />
                <Text style={styles.statusText}>Searching…</Text>
              </View>
            ) : null}

            {results.map((result, index) => (
              <PressableScale
                key={`${result.lat}-${result.lon}-${index}`}
                onPress={() =>
                  void movePinTo(
                    parseFloat(result.lat),
                    parseFloat(result.lon),
                    result.display_name,
                  )
                }
                scale={0.99}
                accessibilityRole="button"
                accessibilityLabel={result.display_name}
                style={styles.resultRow}
              >
                <MapPin size={15} color={accent.color} style={styles.resultIcon} />
                <Text style={styles.resultText} numberOfLines={2}>
                  {result.display_name}
                </Text>
              </PressableScale>
            ))}
          </View>

          {/* ── Map ── */}
          <MapView
            ref={mapRef}
            style={styles.flex}
            initialRegion={initialRegion}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton
          >
            <Marker
              coordinate={{ latitude: pin.lat, longitude: pin.lng }}
              draggable
              onDragEnd={(event) =>
                void movePinTo(
                  event.nativeEvent.coordinate.latitude,
                  event.nativeEvent.coordinate.longitude,
                )
              }
            />
          </MapView>

          {/* ── Confirm ── */}
          <View style={[styles.confirmBar, { paddingBottom: insets.bottom + 12 }]}>
            {reversing ? (
              <View style={styles.statusRow}>
                <ActivityIndicator size="small" color={accent.color} />
                <Text style={styles.statusText}>Fetching address…</Text>
              </View>
            ) : selectedAddress ? (
              <View style={styles.selectedRow}>
                <MapPin size={15} color={accent.color} style={styles.resultIcon} />
                <Text style={styles.selectedText} numberOfLines={2}>
                  {selectedAddress}
                </Text>
              </View>
            ) : (
              <Text style={styles.hintText}>
                Tap the map or drag the pin to choose a location.
              </Text>
            )}

            <Button
              label={t('action.confirmLocation')}
              onPress={handleConfirm}
              icon={Check}
              size="lg"
              full
              disabled={!selectedAddress}
              style={styles.confirmButton}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  searchBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Layout.gutterTight,
    paddingBottom: 10,
    backgroundColor: Colors.card,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    ...softShadow,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  statusText: {
    ...Type.caption,
    color: Colors.mutedForeground,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  resultIcon: {
    marginTop: 2,
  },
  resultText: {
    ...Type.caption,
    color: Colors.foreground,
    flex: 1,
  },
  confirmBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Layout.gutterTight,
    paddingTop: 14,
    backgroundColor: Colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    ...softShadow,
  },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  selectedText: {
    ...Type.caption,
    color: Colors.foreground,
    flex: 1,
  },
  hintText: {
    ...Type.caption,
    color: Colors.mutedForeground,
  },
  confirmButton: {
    marginTop: 12,
  },
});
