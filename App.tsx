import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Linking,
  Animated,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// Refactored Imports
import { GasStation, SortBy } from './src/types';
import { 
  calculateDistance, 
  NOMINATIM_URL, 
  getPriceLevelStyles,
} from './src/utils/helpers';
import Header from './src/components/Header';
import Map from './src/components/Map';
import PreviewCard from './src/components/PreviewCard';
import StationModal from './src/components/StationModal';

// Hooks
import { useGasStations } from './src/hooks/useGasStations';
import { useUserLocation } from './src/hooks/useUserLocation';
import { useBottomSheet } from './src/hooks/useBottomSheet';
import { useAppSettings } from './src/hooks/useAppSettings';

function AppContent() {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<any>(null);

  // Custom Hooks
  const {
    loading,
    loadingStatus,
    allStations,
    activeProvinceIdRef,
    loadGasStations,
  } = useGasStations();

  const centerMap = (lat: number, lng: number, zoom = 14) => {
    mapRef.current?.animateToRegion({
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.0922 / (zoom / 10),
      longitudeDelta: 0.0421 / (zoom / 10),
    }, 1000);
  };

  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const {
    currentCoords,
    setCurrentCoords,
    searchingLocation,
    geolocateUser,
    getProvinceIdFromCoords,
  } = useUserLocation({
    activeProvinceIdRef,
    loadGasStations,
    centerMap,
    triggerHaptic,
  });

  const {
    animatedHeight,
    panResponder,
    sheetPosition,
    SHEET_MAX_HEIGHT,
  } = useBottomSheet();

  // App Settings Hook (Persistent)
  const {
    selectedFuel,
    setSelectedFuel,
    searchRadius,
    setSearchRadius,
    sortBy,
    setSortBy,
    isDarkMode,
    setIsDarkMode,
    loadingSettings
  } = useAppSettings();

  // Local UI States
  const [filteredStations, setFilteredStations] = useState<GasStation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchingLocationLocal, setSearchingLocationLocal] = useState(false);
  const [showFuelModal, setShowFuelModal] = useState(false);
  
  const [selectedStationDetail, setSelectedStationDetail] = useState<GasStation | null>(null);
  const [selectedStationPreview, setSelectedStationPreview] = useState<GasStation | null>(null);

  // Initialize
  useEffect(() => {
    const initApp = async () => {
      try {
        const keys = await AsyncStorage.getAllKeys();
        const cacheKeys = keys.filter(k => k.startsWith('gas_stations_db_'));
        await AsyncStorage.multiRemove(cacheKeys);
      } catch (e) {
        console.error('Error clearing cache on startup:', e);
      }
      await loadGasStations();
      geolocateUser(true);
    };
    initApp();
  }, []);

  // Recalculate on filter/coords change
  useEffect(() => {
    updateData();
  }, [allStations, currentCoords, selectedFuel, searchRadius, sortBy]);

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

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;
    setSearchingLocationLocal(true);
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

        const provId = await getProvinceIdFromCoords(newCoords.latitude, newCoords.longitude);
        if (provId && provId !== activeProvinceIdRef.current) {
          await loadGasStations(false, provId);
        }
      } else {
        alert('No se encontró la ubicación.');
      }
    } catch (err) {
      console.error(err);
      alert('Error al buscar la ubicación.');
    } finally {
      setSearchingLocationLocal(false);
    }
  };

  const openNavigation = (station: GasStation) => {
    triggerHaptic();
    const url = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
    Linking.openURL(url);
  };

  if (loadingSettings) {
    return (
      <View style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

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
        isDarkMode={isDarkMode}
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
        searchingLocation={searchingLocation || searchingLocationLocal}
        showFuelModal={showFuelModal}
        setShowFuelModal={setShowFuelModal}
        triggerHaptic={triggerHaptic}
      />

      {/* Floating Theme Toggle Button */}
      <TouchableOpacity
        style={[styles.themeFloatingBtn, { bottom: (sheetPosition.current === 'collapsed' ? 175 : sheetPosition.current === 'middle' ? 435 : SHEET_MAX_HEIGHT + 75) }]}
        onPress={() => {
          triggerHaptic();
          setIsDarkMode(!isDarkMode);
        }}
      >
        <Text style={styles.themeFloatingText}>{isDarkMode ? '☀️' : '🌙'}</Text>
      </TouchableOpacity>

      {/* Floating Geolocalize Button */}
      <TouchableOpacity
        style={[styles.geolocateFloatingBtn, { bottom: (sheetPosition.current === 'collapsed' ? 120 : sheetPosition.current === 'middle' ? 380 : SHEET_MAX_HEIGHT + 20) }]}
        onPress={() => geolocateUser(false)}
      >
        <Text style={styles.geolocateFloatingText}>🎯</Text>
      </TouchableOpacity>

      {/* Floating Refresh Button */}
      <TouchableOpacity
        style={[styles.refreshFloatingBtn, { bottom: (sheetPosition.current === 'collapsed' ? 230 : sheetPosition.current === 'middle' ? 490 : SHEET_MAX_HEIGHT + 130) }]}
        onPress={() => {
          triggerHaptic();
          loadGasStations(true);
        }}
      >
        <Text style={styles.refreshFloatingText}>🔄</Text>
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
  themeFloatingBtn: {
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
  themeFloatingText: {
    fontSize: 18,
  },
  refreshFloatingBtn: {
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
  refreshFloatingText: {
    fontSize: 18,
  },
});
