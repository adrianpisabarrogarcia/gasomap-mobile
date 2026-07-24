import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Linking,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// Refactored Imports
import { GasStation, SortBy } from './src/types';
import { 
  API_URL, 
  NOMINATIM_URL, 
  MAP_DARK_STYLE, 
  calculateDistance, 
  getPriceLevelStyles,
  FUEL_TYPES
} from './src/utils/helpers';
import Header from './src/components/Header';
import Map from './src/components/Map';
import PreviewCard from './src/components/PreviewCard';
import StationModal from './src/components/StationModal';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.85;
const SHEET_MIN_HEIGHT = 100;
const SHEET_MID_HEIGHT = 360;

function AppContent() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);

  // States
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Descargando base de datos...');
  const [allStations, setAllStations] = useState<GasStation[]>([]);
  const [filteredStations, setFilteredStations] = useState<GasStation[]>([]);
  const [selectedFuel, setSelectedFuel] = useState('Precio Gasolina 95 E5');
  const [searchRadius, setSearchRadius] = useState(5);
  const [sortBy, setSortBy] = useState<SortBy>('price');
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
        
        if (newHeight >= SHEET_MIN_HEIGHT && newHeight <= SHEET_MAX_HEIGHT) {
          animatedHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
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

      // Clean up legacy single-key cache
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

      // Save chunked data (500 items max per row)
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

      // 1. Get cached last known location first (Instant response)
      const lastKnown = await Location.getLastKnownPositionAsync({});
      if (lastKnown) {
        const cachedCoords = {
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        };
        setCurrentCoords(cachedCoords);
        centerMap(cachedCoords.latitude, cachedCoords.longitude);
      }

      // 2. Query GPS in the background to get accurate current position
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

  const openNavigation = (station: GasStation) => {
    triggerHaptic();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" backgroundColor="transparent" translucent />

      {/* Top Status Bar Dark Cover Overlay */}
      <View style={[styles.statusBarCover, { height: insets.top }]} />

      {/* Map View */}
      <Map
        mapRef={mapRef}
        currentCoords={currentCoords}
        filteredStations={filteredStations}
        onMarkerPress={(station) => {
          triggerHaptic();
          setSelectedStationPreview(station);
        }}
      />

      {/* Floating Header UI */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchRadius={searchRadius}
        setSearchRadius={setSearchRadius}
        selectedFuel={selectedFuel}
        setSelectedFuel={setSelectedFuel}
        searchLocation={searchLocation}
        searchingLocation={searchingLocation}
        showFuelModal={showFuelModal}
        setShowFuelModal={setShowFuelModal}
        triggerHaptic={triggerHaptic}
      />

      {/* Floating Geolocalize Button */}
      <TouchableOpacity
        style={[styles.geolocateFloatingBtn, { bottom: (sheetPosition.current === 'collapsed' ? 120 : sheetPosition.current === 'middle' ? 380 : SHEET_MAX_HEIGHT + 20) }]}
        onPress={() => geolocateUser(false)}
      >
        <Text style={styles.geolocateFloatingText}>🎯</Text>
      </TouchableOpacity>

      {/* Floating Preview Card (Map Selection) */}
      {selectedStationPreview && (
        <PreviewCard
          selectedStationPreview={selectedStationPreview}
          setSelectedStationPreview={setSelectedStationPreview}
          setSelectedStationDetail={setSelectedStationDetail}
          triggerHaptic={triggerHaptic}
          bottom={sheetPosition.current === 'collapsed' ? 120 : sheetPosition.current === 'middle' ? 380 : SHEET_MAX_HEIGHT + 20}
        />
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
      <StationModal
        selectedStationDetail={selectedStationDetail}
        setSelectedStationDetail={setSelectedStationDetail}
        selectedFuel={selectedFuel}
        openNavigation={openNavigation}
      />
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
    zIndex: 8,
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
    zIndex: 7,
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
    justifyContent: 'space-between',
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
  statusBarCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#020617',
    zIndex: 99,
  },
});
