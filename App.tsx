import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Linking,
  Dimensions,
  Animated,
  PanResponder,
  Keyboard,
  Platform,
  Modal,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// Type definitions
interface GasStation {
  id: string;
  name: string;
  address: string;
  locality: string;
  latitude: number;
  longitude: number;
  prices: { [key: string]: number | null };
  distance?: number;
  price?: number;
  priceLevel?: 'cheapest' | 'economy' | 'moderate' | 'expensive' | 'most-expensive';
}

const API_URL = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search?format=json&countrycodes=es&q=';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.85;
const SHEET_MIN_HEIGHT = 100;
const SHEET_MID_HEIGHT = 360;

// Google Maps Dark Style
const MAP_DARK_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#64748b" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#020617" }] },
  { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#475569" }] },
  { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#090d16" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#0b0f19" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#475569" }] },
  { "featureType": "poi.park", "elementType": "geometry.fill", "stylers": [{ "color": "#052e16" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#334155" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#0f172a" }, { "strokeColor": "#334155" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#020617" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#334155" }] }
];

const FUEL_TYPES = [
  { label: 'Gasolina 95', value: 'Precio Gasolina 95 E5' },
  { label: 'Gasolina 98', value: 'Precio Gasolina 98 E5' },
  { label: 'Diésel A', value: 'Precio Gasoleo A' },
  { label: 'Diésel Premium', value: 'Precio Gasoleo Premium' },
  { label: 'Agrícola', value: 'Precio Gasoleo B' },
  { label: 'Autogás GLP', value: 'Precio GPL' },
  { label: 'Gas GNC', value: 'Precio GNC' },
];

function AppContent() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);

  // States
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Descargando base de datos...');
  const [allStations, setAllStations] = useState<GasStation[]>([]);
  const [filteredStations, setFilteredStations] = useState<GasStation[]>([]);
  const [selectedFuel, setSelectedFuel] = useState('Precio Gasolina 95 E5');
  const [searchRadius, setSearchRadius] = useState(5);
  const [sortBy, setSortBy] = useState<'price' | 'distance'>('price');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [selectedStationDetail, setSelectedStationDetail] = useState<GasStation | null>(null);
  const [selectedStationPreview, setSelectedStationPreview] = useState<GasStation | null>(null);

  const [currentCoords, setCurrentCoords] = useState({
    latitude: 40.416775,
    longitude: -3.703790,
  });

  // Animated Bottom Sheet Setup
  const animatedHeight = useRef(new Animated.Value(SHEET_MID_HEIGHT)).current;
  const sheetPosition = useRef<'collapsed' | 'middle' | 'expanded'>('middle');

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only trigger sheet drag if dragging vertically significantly
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        let newHeight = SHEET_MID_HEIGHT;
        if (sheetPosition.current === 'middle') {
          newHeight = SHEET_MID_HEIGHT - gestureState.dy;
        } else if (sheetPosition.current === 'collapsed') {
          newHeight = SHEET_MIN_HEIGHT - gestureState.dy;
        } else if (sheetPosition.current === 'expanded') {
          newHeight = SHEET_MAX_HEIGHT - gestureState.dy;
        }
        
        // Boundaries check
        if (newHeight >= SHEET_MIN_HEIGHT && newHeight <= SHEET_MAX_HEIGHT) {
          animatedHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Determine snap target
        let targetHeight = SHEET_MID_HEIGHT;
        let finalPosition: 'collapsed' | 'middle' | 'expanded' = 'middle';

        const currentVal = (animatedHeight as any)._value;

        if (currentVal < (SHEET_MID_HEIGHT + SHEET_MIN_HEIGHT) / 2) {
          targetHeight = SHEET_MIN_HEIGHT;
          finalPosition = 'collapsed';
        } else if (currentVal > (SHEET_MAX_HEIGHT + SHEET_MID_HEIGHT) / 2) {
          targetHeight = SHEET_MAX_HEIGHT;
          finalPosition = 'expanded';
        } else {
          targetHeight = SHEET_MID_HEIGHT;
          finalPosition = 'middle';
        }

        sheetPosition.current = finalPosition;
        Animated.spring(animatedHeight, {
          toValue: targetHeight,
          useNativeDriver: false,
          damping: 20,
        }).start();
      }
    })
  ).current;

  // Initialize
  useEffect(() => {
    loadGasStations();
    geolocateUser(true);
  }, []);

  // Recalculate on filter/coords change
  useEffect(() => {
    updateData();
  }, [allStations, currentCoords, selectedFuel, searchRadius, sortBy]);

  const loadGasStations = async () => {
    try {
      setLoading(true);

      // Clean up legacy single-key cache if it exists to prevent SQLite CursorWindow crashes on Android
      try {
        await AsyncStorage.removeItem('gas_stations_db');
      } catch (e) {}

      const cachedCount = await AsyncStorage.getItem('gas_stations_db_chunks_count');
      if (cachedCount) {
        const numChunks = parseInt(cachedCount, 10);
        let merged: GasStation[] = [];
        let success = true;

        for (let i = 0; i < numChunks; i++) {
          const chunkStr = await AsyncStorage.getItem(`gas_stations_db_chunk_${i}`);
          if (chunkStr) {
            merged = merged.concat(JSON.parse(chunkStr));
          } else {
            success = false;
            break;
          }
        }

        if (success && merged.length > 0) {
          setAllStations(merged);
          setLoading(false);
          return;
        }
      }

      setLoadingStatus('Conectando con el Ministerio...');
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('API server error');
      
      setLoadingStatus('Procesando datos...');
      const data = await response.json();
      const list = data.ListaEESSPrecio || [];

      const parsed: GasStation[] = list.map((station: any) => ({
        id: station['IDEESS'],
        name: station['Rótulo'] || 'Sin nombre',
        address: station['Dirección'] || '',
        locality: station['Localidad'] || '',
        latitude: parseFloat(station['Latitud'].replace(',', '.')),
        longitude: parseFloat(station['Longitud (WGS84)'].replace(',', '.')),
        prices: {
          'Precio Gasolina 95 E5': parseFloat(station['Precio Gasolina 95 E5']?.replace(',', '.')) || null,
          'Precio Gasolina 98 E5': parseFloat(station['Precio Gasolina 98 E5']?.replace(',', '.')) || null,
          'Precio Gasoleo A': parseFloat(station['Precio Gasoleo A']?.replace(',', '.')) || null,
          'Precio Gasoleo Premium': parseFloat(station['Precio Gasoleo Premium']?.replace(',', '.')) || null,
          'Precio Gasoleo B': parseFloat(station['Precio Gasoleo B']?.replace(',', '.')) || null,
          'Precio GPL': parseFloat(station['Precio Gases Licuados del Petróleo']?.replace(',', '.')) || null,
          'Precio GNC': parseFloat(station['Precio Gas Natural Comprimido']?.replace(',', '.')) || null,
        }
      })).filter((s: any) => !isNaN(s.latitude) && !isNaN(s.longitude));

      // Save chunked data (500 items max per row) to prevent SQLite CursorWindow limit (2MB) on Android
      const CHUNK_SIZE = 500;
      const numChunks = Math.ceil(parsed.length / CHUNK_SIZE);
      await AsyncStorage.setItem('gas_stations_db_chunks_count', String(numChunks));

      for (let i = 0; i < numChunks; i++) {
        const chunk = parsed.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await AsyncStorage.setItem(`gas_stations_db_chunk_${i}`, JSON.stringify(chunk));
      }

      setAllStations(parsed);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoadingStatus('Error al conectar. Reintentando...');
      setTimeout(loadGasStations, 5000);
    }
  };

  const geolocateUser = async (isInitial = false) => {
    try {
      if (!isInitial) {
        triggerHaptic();
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!isInitial) alert('Permiso de GPS denegado.');
        return;
      }

      // 1. Get cached last known location first (Instant response, no satellite wait)
      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown) {
        const cachedCoords = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
        setCurrentCoords(cachedCoords);
        centerMap(cachedCoords.latitude, cachedCoords.longitude);
      }

      // 2. Query GPS in the background to get highly accurate current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const newCoords = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };

      setCurrentCoords(newCoords);
      centerMap(newCoords.latitude, newCoords.longitude);
    } catch (error) {
      console.warn('Geolocation error:', error);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const updateData = () => {
    if (!allStations.length) return;

    let computed = allStations
      .map(station => {
        const price = station.prices[selectedFuel];
        const distance = calculateDistance(currentCoords.latitude, currentCoords.longitude, station.latitude, station.longitude);
        return { ...station, price, distance };
      })
      .filter(station => station.price !== null && station.distance! <= searchRadius) as GasStation[];

    let minPrice = Infinity;
    let maxPrice = -Infinity;
    computed.forEach(s => {
      if (s.price! < minPrice) minPrice = s.price!;
      if (s.price! > maxPrice) maxPrice = s.price!;
    });

    computed = computed.map(s => {
      const priceRange = maxPrice - minPrice;
      const factor = priceRange > 0 ? (s.price! - minPrice) / priceRange : 0;
      
      let priceLevel: GasStation['priceLevel'] = 'moderate';
      if (s.price === minPrice && computed.length > 1) {
        priceLevel = 'cheapest';
      } else if (s.price === maxPrice && computed.length > 1) {
        priceLevel = 'most-expensive';
      } else if (factor < 0.25) {
        priceLevel = 'economy';
      } else if (factor >= 0.75) {
        priceLevel = 'expensive';
      } else {
        priceLevel = 'moderate';
      }

      return { ...s, priceLevel };
    });

    if (sortBy === 'price') {
      computed.sort((a, b) => a.price! - b.price!);
    } else {
      computed.sort((a, b) => a.distance! - b.distance!);
    }

    setFilteredStations(computed);
  };

  const centerMap = (lat: number, lng: number, zoom = 14) => {
    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.0922 / (zoom / 10),
      longitudeDelta: 0.0421 / (zoom / 10),
    }, 1000);
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    Keyboard.dismiss();
    setSearchingLocation(true);
    triggerHaptic();

    try {
      const response = await fetch(`${NOMINATIM_URL}${encodeURIComponent(searchQuery)}`, {
        headers: {
          'User-Agent': 'GasoMapMobile/1.0 (com.adrianpisabarro.gasomap)'
        }
      });
      if (!response.ok) {
        throw new Error(`Response not OK. Status: ${response.status}`);
      }
      const results = await response.json();

      if (results.length > 0) {
        const newCoords = {
          latitude: parseFloat(results[0].lat),
          longitude: parseFloat(results[0].lon),
        };
        setCurrentCoords(newCoords);
        centerMap(newCoords.latitude, newCoords.longitude);
      } else {
        alert('No se encontró la ubicación.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al buscar la ubicación.');
    } finally {
      setSearchingLocation(false);
    }
  };

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const getPriceLevelStyles = (level?: string) => {
    switch (level) {
      case 'cheapest':
        return { color: '#10b981', label: 'El más barato', badgeBg: 'rgba(16,185,129,0.15)', border: '#10b981' };
      case 'economy':
        return { color: '#14b8a6', label: 'Económico', badgeBg: 'rgba(20,184,166,0.15)', border: '#14b8a6' };
      case 'moderate':
        return { color: '#f59e0b', label: 'Precio Medio', badgeBg: 'rgba(245,158,11,0.15)', border: '#f59e0b' };
      case 'expensive':
        return { color: '#f97316', label: 'Precio Alto', badgeBg: 'rgba(249,115,22,0.15)', border: '#f97316' };
      case 'most-expensive':
        return { color: '#f43f5e', label: 'El más caro', badgeBg: 'rgba(244,63,94,0.15)', border: '#f43f5e' };
      default:
        return { color: '#94a3b8', label: 'Normal', badgeBg: 'rgba(148,163,184,0.15)', border: 'transparent' };
    }
  };

  const openNavigation = (station: GasStation) => {
    triggerHaptic();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
    Linking.openURL(url);
  };

  // Fuel selector item renderer
  const renderFuelOption = (fuel: typeof FUEL_TYPES[0]) => {
    const isSelected = selectedFuel === fuel.value;
    return (
      <TouchableOpacity
        key={fuel.value}
        style={[styles.fuelOption, isSelected && styles.fuelOptionSelected]}
        onPress={() => {
          triggerHaptic();
          setSelectedFuel(fuel.value);
          setShowFuelModal(false);
        }}
      >
        <Text style={[styles.fuelOptionText, isSelected && styles.fuelOptionTextSelected]}>
          {fuel.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Map View */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        customMapStyle={MAP_DARK_STYLE}
        initialRegion={{
          latitude: currentCoords.latitude,
          longitude: currentCoords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* User Marker */}
        <Marker coordinate={{ latitude: currentCoords.latitude, longitude: currentCoords.longitude }}>
          <View style={styles.userMarkerContainer}>
            <View style={styles.userMarkerPulse} />
            <View style={styles.userMarkerCore} />
          </View>
        </Marker>

        {/* Gas Stations Markers */}
        {filteredStations.map(station => {
          const stylesInfo = getPriceLevelStyles(station.priceLevel);
          return (
            <Marker
              key={station.id}
              coordinate={{ latitude: station.latitude, longitude: station.longitude }}
              onPress={() => {
                triggerHaptic();
                centerMap(station.latitude, station.longitude, 16);
                setSelectedStationPreview(station);
              }}
            >
              <View style={[styles.markerBadge, { borderColor: stylesInfo.border }]}>
                <Text style={[styles.markerBadgeText, { color: stylesInfo.color }]}>
                  {station.price?.toFixed(3)}
                </Text>
                <View style={[styles.markerArrow, { borderTopColor: stylesInfo.color }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* Floating Header UI */}
      <View style={[styles.headerContainer, { top: insets.top + 10 }]}>
        <View style={styles.searchRow}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar ciudad o dirección..."
            placeholderTextColor="#64748b"
            style={styles.searchInput}
            onSubmitEditing={searchLocation}
          />
          <TouchableOpacity 
            style={styles.searchBtn} 
            onPress={searchLocation}
            disabled={searchingLocation}
          >
            {searchingLocation ? (
              <ActivityIndicator size="small" color="#020617" />
            ) : (
              <Text style={styles.searchBtnText}>🔎</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Quick Radius Selection & Fuel selection button */}
        <View style={styles.quickFilters}>
          <TouchableOpacity 
            style={styles.fuelBtn}
            onPress={() => {
              triggerHaptic();
              setShowFuelModal(!showFuelModal);
            }}
          >
            <Text style={styles.fuelBtnText}>
              ⛽ {FUEL_TYPES.find(f => f.value === selectedFuel)?.label} ▾
            </Text>
          </TouchableOpacity>

          <View style={styles.radiusContainer}>
            {[2, 5, 10, 20].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusBtn, searchRadius === r && styles.radiusBtnActive]}
                onPress={() => {
                  triggerHaptic();
                  setSearchRadius(r);
                }}
              >
                <Text style={[styles.radiusBtnText, searchRadius === r && styles.radiusBtnTextActive]}>
                  {r}k
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Floating Fuel Select Modal Over Map */}
      {showFuelModal && (
        <View style={[styles.fuelModalContainer, { top: insets.top + 110 }]}>
          <Text style={styles.fuelModalTitle}>Selecciona combustible</Text>
          <View style={styles.fuelModalList}>
            {FUEL_TYPES.map(renderFuelOption)}
          </View>
        </View>
      )}

      {/* Floating Geolocalize Button */}
      <TouchableOpacity
        style={[styles.geolocateFloatingBtn, { bottom: (sheetPosition.current === 'collapsed' ? 120 : sheetPosition.current === 'middle' ? 380 : SHEET_MAX_HEIGHT + 20) }]}
        onPress={() => geolocateUser(false)}
      >
        <Text style={styles.geolocateFloatingText}>🎯</Text>
      </TouchableOpacity>

      {/* Floating Preview Card (Map Selection) */}
      {selectedStationPreview && (
        <View style={[styles.previewCard, { bottom: (sheetPosition.current === 'collapsed' ? 120 : sheetPosition.current === 'middle' ? 380 : SHEET_MAX_HEIGHT + 20) }]}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewName} numberOfLines={1}>{selectedStationPreview.name}</Text>
            <TouchableOpacity 
              onPress={() => setSelectedStationPreview(null)} 
              style={styles.previewCloseBtn}
            >
              <Text style={styles.previewCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.previewAddress} numberOfLines={1}>{selectedStationPreview.address}</Text>
          <View style={styles.previewFooter}>
            <Text style={[styles.previewPrice, { color: getPriceLevelStyles(selectedStationPreview.priceLevel).color }]}>
              {selectedStationPreview.price?.toFixed(3)} <Text style={styles.previewPriceUnit}>€/L</Text>
            </Text>
            <TouchableOpacity
              style={styles.previewDetailBtn}
              onPress={() => {
                triggerHaptic();
                setSelectedStationDetail(selectedStationPreview);
              }}
            >
              <Text style={styles.previewDetailBtnText}>Ver detalles</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Sliding Bottom Sheet */}
      <Animated.View style={[styles.bottomSheet, { height: animatedHeight }]}>
        {/* Handle bar for dragging */}
        <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
          <View style={styles.dragHandle} />
          <View style={styles.sheetHeaderInfo}>
            <Text style={styles.sheetTitle}>Gasolineras Cercanas</Text>
            <Text style={styles.sheetSub}>{filteredStations.length} encontradas ({searchRadius} km)</Text>
          </View>
        </View>

        {/* Sorting controls */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Ordenar:</Text>
          <TouchableOpacity 
            style={[styles.sortBtn, sortBy === 'price' && styles.sortBtnActive]} 
            onPress={() => { triggerHaptic(); setSortBy('price'); }}
          >
            <Text style={[styles.sortBtnText, sortBy === 'price' && styles.sortBtnTextActive]}>Precio</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.sortBtn, sortBy === 'distance' && styles.sortBtnActive]} 
            onPress={() => { triggerHaptic(); setSortBy('distance'); }}
          >
            <Text style={[styles.sortBtnText, sortBy === 'distance' && styles.sortBtnTextActive]}>Distancia</Text>
          </TouchableOpacity>
        </View>

        {/* List of stations */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>{loadingStatus}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredStations}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              const stylesInfo = getPriceLevelStyles(item.priceLevel);
              return (
                <TouchableOpacity
                  style={[styles.card, { borderLeftColor: stylesInfo.color }]}
                  activeOpacity={0.8}
                  onPress={() => {
                    triggerHaptic();
                    setSelectedStationDetail(item);
                  }}
                >
                  <View style={styles.cardMain}>
                    <View style={styles.cardHeader}>
                      <Text style={[styles.cardName, { color: stylesInfo.color }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: stylesInfo.badgeBg }]}>
                        <Text style={[styles.badgeText, { color: stylesInfo.color }]}>
                          {stylesInfo.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.cardAddress} numberOfLines={1}>{item.address}</Text>
                    
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={styles.cardIconBtn}
                        onPress={() => {
                          triggerHaptic();
                          centerMap(item.latitude, item.longitude, 16);
                          setSelectedStationPreview(item);
                          // Smooth collapse sheet to medium height
                          Animated.spring(animatedHeight, {
                            toValue: SHEET_MID_HEIGHT,
                            useNativeDriver: false,
                          }).start();
                          sheetPosition.current = 'middle';
                        }}
                      >
                        <Text style={styles.cardIconText}>🗺️ Ver mapa</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.cardRight}>
                    <Text style={[styles.cardPrice, { color: stylesInfo.color }]}>
                      {item.price?.toFixed(3)}
                    </Text>
                    <Text style={styles.priceUnit}>€/L</Text>
                    
                    <TouchableOpacity 
                      style={styles.routeBtn}
                      onPress={() => openNavigation(item)}
                    >
                      <Text style={styles.routeBtnText}>Ruta</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No hay resultados en esta zona</Text>
                <Text style={styles.emptySub}>Prueba a expandir el radio o a cambiar de ubicación</Text>
              </View>
            }
          />
        )}
      </Animated.View>

      {/* Fullscreen Details Modal */}
      <Modal
        visible={selectedStationDetail !== null}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setSelectedStationDetail(null)}
      >
        <View style={[styles.modalRoot, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setSelectedStationDetail(null)}
            >
              <Text style={styles.modalCloseText}>✕ Cerrar</Text>
            </TouchableOpacity>
            <Text style={styles.modalHeaderTitle} numberOfLines={1}>
              {selectedStationDetail?.name}
            </Text>
          </View>

          {/* Modal Content Scroll */}
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalInfoCard}>
              <Text style={styles.modalInfoName}>{selectedStationDetail?.name}</Text>
              <Text style={styles.modalInfoAddress}>📍 {selectedStationDetail?.address}</Text>
              <Text style={styles.modalInfoLocality}>🏙️ {selectedStationDetail?.locality}</Text>
              <Text style={styles.modalInfoDistance}>🚗 A {selectedStationDetail?.distance?.toFixed(2)} km de tu ubicación</Text>
            </View>

            {/* Prices List */}
            <Text style={styles.modalSectionTitle}>Precios disponibles</Text>
            <View style={styles.priceListContainer}>
              {selectedStationDetail && FUEL_TYPES.map(fuel => {
                const price = selectedStationDetail.prices[fuel.value];
                if (price === null) return null;
                const isSelected = selectedFuel === fuel.value;
                const priceStyles = getPriceLevelStyles(isSelected ? selectedStationDetail.priceLevel : 'normal');

                return (
                  <View 
                    key={fuel.value} 
                    style={[
                      styles.priceRow, 
                      isSelected && { borderLeftColor: getPriceLevelStyles(selectedStationDetail.priceLevel).color, borderLeftWidth: 4, backgroundColor: 'rgba(15, 23, 42, 0.4)' }
                    ]}
                  >
                    <Text style={[styles.priceRowLabel, isSelected && { fontWeight: '800', color: '#f8fafc' }]}>
                      {fuel.label} {isSelected && '•'}
                    </Text>
                    <Text style={[styles.priceRowValue, isSelected && { color: getPriceLevelStyles(selectedStationDetail.priceLevel).color, fontWeight: '900' }]}>
                      {price.toFixed(3)} <Text style={styles.priceRowUnit}>€/L</Text>
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Google Maps directions */}
            <TouchableOpacity
              style={styles.modalRouteBtn}
              onPress={() => selectedStationDetail && openNavigation(selectedStationDetail)}
            >
              <Text style={styles.modalRouteBtnText}>🗺️ Iniciar Ruta en Google Maps</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  userMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
  },
  userMarkerPulse: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.4)',
  },
  userMarkerCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  markerBadge: {
    backgroundColor: '#020617',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  markerArrow: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    alignSelf: 'center',
    marginTop: 1,
  },
  headerContainer: {
    position: 'absolute',
    left: 15,
    right: 15,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 14,
  },
  searchBtn: {
    paddingHorizontal: 8,
  },
  searchBtnText: {
    fontSize: 16,
  },
  quickFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'between',
    marginTop: 10,
    gap: 8,
  },
  fuelBtn: {
    backgroundColor: '#020617',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 32,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  fuelBtnText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
  },
  radiusContainer: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: '#1e293b',
    flex: 1,
    justifyContent: 'space-around',
  },
  radiusBtn: {
    paddingHorizontal: 8,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
  },
  radiusBtnActive: {
    backgroundColor: '#1e293b',
  },
  radiusBtnText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
  },
  radiusBtnTextActive: {
    color: '#10b981',
  },
  geolocateFloatingBtn: {
    position: 'absolute',
    right: 15,
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
  geolocateFloatingText: {
    fontSize: 20,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 24,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  dragHandle: {
    width: 40,
    height: 5,
    backgroundColor: '#334155',
    borderRadius: 3,
    marginBottom: 10,
  },
  sheetHeaderInfo: {
    alignItems: 'center',
  },
  sheetTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sheetSub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0b0f19',
    gap: 8,
  },
  sortLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  sortBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sortBtnActive: {
    borderColor: '#10b981',
  },
  sortBtnText: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
  },
  sortBtnTextActive: {
    color: '#10b981',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginVertical: 4,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    borderRadius: 12,
  },
  cardMain: {
    flex: 1,
    paddingRight: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    maxWidth: 160,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  cardAddress: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 4,
  },
  cardDetails: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
  cardRight: {
    alignItems: 'center',
    width: 80,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '900',
  },
  priceUnit: {
    color: '#64748b',
    fontSize: 9,
    marginTop: -2,
    marginBottom: 6,
  },
  routeBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 8,
  },
  routeBtnText: {
    color: '#020617',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '700',
  },
  emptySub: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 10,
    fontWeight: '600',
  },
  fuelOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  fuelOptionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  fuelOptionText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  fuelOptionTextSelected: {
    color: '#10b981',
    fontWeight: '800',
  },
  fuelModalContainer: {
    position: 'absolute',
    left: 15,
    right: 15,
    backgroundColor: '#0f172a',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
  },
  fuelModalTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  fuelModalList: {
    maxHeight: 280,
  },
  previewCard: {
    position: 'absolute',
    left: 15,
    right: 15,
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  previewName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#f8fafc',
    textTransform: 'uppercase',
    flex: 1,
    marginRight: 10,
  },
  previewCloseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCloseText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  previewAddress: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 8,
  },
  previewFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewPrice: {
    fontSize: 16,
    fontWeight: '900',
  },
  previewPriceUnit: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: 'normal',
  },
  previewDetailBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  previewDetailBtnText: {
    color: '#020617',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  cardIconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardIconText: {
    color: '#e2e8f0',
    fontSize: 9,
    fontWeight: '700',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: '#020617',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  modalCloseBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  modalCloseText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '700',
  },
  modalHeaderTitle: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
    textTransform: 'uppercase',
    flex: 1,
  },
  modalScroll: {
    padding: 16,
    paddingBottom: 60,
  },
  modalInfoCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 20,
  },
  modalInfoName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#f8fafc',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  modalInfoAddress: {
    fontSize: 12,
    color: '#e2e8f0',
    marginBottom: 4,
  },
  modalInfoLocality: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 4,
  },
  modalInfoDistance: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '700',
    marginTop: 4,
  },
  modalSectionTitle: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  priceListContainer: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
    marginBottom: 24,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  priceRowLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  priceRowValue: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '800',
  },
  priceRowUnit: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: 'normal',
  },
  modalRouteBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  modalRouteBtnText: {
    color: '#020617',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
