/**
 * MapPickerModal
 *
 * Full-screen modal with:
 * - A search bar that geocodes via Nominatim (free, no API key)
 * - A map with a draggable pin (react-native-maps — uses Apple Maps on iOS,
 *   Google Maps on Android with no API key for basic tiles)
 * - A "Confirm Location" button that reverse-geocodes and returns address + lat/lng
 *
 * Nominatim usage policy: https://operations.osmfoundation.org/policies/nominatim/
 * We set a descriptive User-Agent as required.
 */
import MapView, { MapPressEvent, Marker, Region } from 'react-native-maps';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, MapPin, Search, X } from 'lucide-react-native';
import { cardShadow, Colors, softShadow } from '../constants/theme';
import { useAppTheme } from '../context/theme-context';

// Default center: New Delhi
const DEFAULT_LAT = 28.6139;
const DEFAULT_LNG = 77.2090;
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'DairyManagerApp/1.0 (contact@dairymanager.app)';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

async function geocodeQuery(q: string): Promise<NominatimResult[]> {
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=in`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  return res.json();
}

async function reverseGeocode(lat: number, lon: number): Promise<string> {
  const url = `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lon}&format=json`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  const data = await res.json();
  return (data as any).display_name ?? `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

interface Props {
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
}: Props) {
  const { accent } = useAppTheme();
  const insets = useSafeAreaInsets();
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

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setPin({
        lat: initialLatitude ?? DEFAULT_LAT,
        lng: initialLongitude ?? DEFAULT_LNG,
      });
      setSelectedAddress(initialAddress);
      setQuery('');
      setResults([]);
    }
  }, [visible, initialLatitude, initialLongitude, initialAddress]);

  const movePinTo = useCallback(async (lat: number, lng: number, address?: string) => {
    setPin({ lat, lng });
    setResults([]);
    setQuery('');
    mapRef.current?.animateToRegion({
      latitude: lat, longitude: lng,
      latitudeDelta: 0.008, longitudeDelta: 0.008,
    }, 500);
    if (address) {
      setSelectedAddress(address);
    } else {
      setReversing(true);
      try {
        const addr = await reverseGeocode(lat, lng);
        setSelectedAddress(addr);
      } catch {
        setSelectedAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      } finally {
        setReversing(false);
      }
    }
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await geocodeQuery(query.trim());
      setResults(res);
    } catch {
      Alert.alert('Search failed', 'Check your internet connection and try again.');
    } finally {
      setSearching(false);
    }
  };

  const handleMapPress = (e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    movePinTo(latitude, longitude);
  };

  const handleConfirm = () => {
    if (!selectedAddress) {
      Alert.alert('No location selected', 'Please pick a location on the map first.');
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
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="dark-content" />
        <View style={{ flex: 1 }}>

          {/* Search bar overlay */}
          <View style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
            paddingTop: insets.top + 8,
            paddingHorizontal: 16, paddingBottom: 8,
            backgroundColor: Colors.card,
            ...softShadow,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: results.length > 0 ? 8 : 0 }}>
              {/* Close */}
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X size={20} color={Colors.foreground} />
              </TouchableOpacity>

              {/* Input */}
              <View style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
                backgroundColor: Colors.surface, borderRadius: 16,
                paddingHorizontal: 14, paddingVertical: 11,
              }}>
                <Search size={16} color={Colors.mutedForeground} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search address..."
                  placeholderTextColor={Colors.mutedForeground}
                  style={{ flex: 1, fontSize: 14, fontWeight: '600', color: Colors.foreground }}
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                />
              </View>

              {/* Search button */}
              <TouchableOpacity
                onPress={handleSearch}
                style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: accent.value, alignItems: 'center', justifyContent: 'center',
                }}
              >
                {searching
                  ? <ActivityIndicator size="small" color="white" />
                  : <Search size={18} color="white" />
                }
              </TouchableOpacity>
            </View>

            {/* Results */}
            {results.map((r, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => movePinTo(parseFloat(r.lat), parseFloat(r.lon), r.display_name)}
                style={{
                  flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                  paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border,
                }}
              >
                <MapPin size={15} color={accent.value} style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: Colors.foreground }} numberOfLines={2}>
                  {r.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Map */}
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            initialRegion={initialRegion}
            onPress={handleMapPress}
            showsUserLocation
            showsMyLocationButton
          >
            <Marker
              coordinate={{ latitude: pin.lat, longitude: pin.lng }}
              draggable
              onDragEnd={(e) => movePinTo(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
            />
          </MapView>

          {/* Bottom confirm bar */}
          <View style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
            paddingBottom: insets.bottom + 12,
            paddingHorizontal: 16, paddingTop: 14,
            backgroundColor: Colors.card, ...softShadow,
          }}>
            {reversing ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <ActivityIndicator size="small" color={accent.value} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.mutedForeground }}>
                  Fetching address…
                </Text>
              </View>
            ) : selectedAddress ? (
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                <MapPin size={15} color={accent.value} style={{ marginTop: 2 }} />
                <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: Colors.foreground }} numberOfLines={2}>
                  {selectedAddress}
                </Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleConfirm}
              style={{
                backgroundColor: accent.value, borderRadius: 18,
                paddingVertical: 15, flexDirection: 'row', alignItems: 'center',
                justifyContent: 'center', gap: 8,
              }}
            >
              <Check size={20} color="white" strokeWidth={3} />
              <Text style={{ fontSize: 16, fontWeight: '800', color: 'white' }}>Confirm Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
