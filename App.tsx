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
  useColorScheme,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// Refactored Imports
import { GasStation, SortBy } from './src/types';
import { NOMINATIM_URL } from './src/utils/helpers';
import Header from './src/components/Header';
import Map from './src/components/Map';
import PreviewCard from './src/components/PreviewCard';
import StationModal from './src/components/StationModal';
import StationCard from './src/components/StationCard';

// Hooks
import { useGasStations } from './src/hooks/useGasStations';
import { useUserLocation } from './src/hooks/useUserLocation';
import { useBottomSheet } from './src/hooks/useBottomSheet';
import { useAppSettings } from './src/hooks/useAppSettings';
import { useFilteredStations } from './src/hooks/useFilteredStations';

function AppContent() {
  const systemScheme = useColorScheme();
  const isSystemDark = systemScheme === 'dark';
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
    SHEET_MID_HEIGHT,
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
  const filteredStations = useFilteredStations(allStations, currentCoords, selectedFuel, searchRadius, sortBy);
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

  // Load gas stations reactively when user position or search radius changes
  useEffect(() => {
    loadGasStations(false, currentCoords, searchRadius);
  }, [currentCoords.latitude, currentCoords.longitude, searchRadius]);

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
    <View style={[styles.container, { backgroundColor: isSystemDark ? '#020617' : '#f8fafc' }]}>
      <StatusBar style={isSystemDark ? "light" : "dark"} backgroundColor="transparent" translucent />

      {/* Top Status Bar Dark Cover Overlay */}
      <View style={[styles.statusBarCover, { height: insets.top, backgroundColor: isSystemDark ? '#020617' : '#f8fafc' }]} />

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
        onZoomChange={(zoom) => {
          let newRadius = 5;
          if (zoom >= 16) newRadius = 2;
          else if (zoom === 15 || zoom === 14) newRadius = 5;
          else if (zoom === 13) newRadius = 10;
          else if (zoom <= 12) newRadius = 20;

          if (newRadius !== searchRadius) {
            setSearchRadius(newRadius);
          }
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
        searchingLocation={searchingLocation || searchingLocationLocal}
        showFuelModal={showFuelModal}
        setShowFuelModal={setShowFuelModal}
        triggerHaptic={triggerHaptic}
        isDark={isSystemDark}
      />

      {/* Floating Buttons Group (Theme, Geolocalize, Refresh) */}
      <Animated.View
        style={[
          styles.floatingButtonsContainer,
          {
            bottom: Animated.add(animatedHeight, selectedStationPreview ? 140 : 20),
          }
        ]}
      >
        {/* Floating Refresh Button */}
        <TouchableOpacity
          style={styles.floatingActionBtn}
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic();
            loadGasStations(true, currentCoords, searchRadius);
          }}
        >
          <Text style={styles.floatingActionText}>🔄</Text>
        </TouchableOpacity>

        {/* Floating Theme Toggle Button */}
        <TouchableOpacity
          style={styles.floatingActionBtn}
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic();
            setIsDarkMode(!isDarkMode);
          }}
        >
          <Text style={styles.floatingActionText}>{isDarkMode ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>

        {/* Floating Geolocalize Button */}
        <TouchableOpacity
          style={styles.floatingActionBtn}
          activeOpacity={0.8}
          onPress={() => geolocateUser(false)}
        >
          <Text style={styles.floatingActionText}>🎯</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Floating Preview Card (Map Selection) */}
      {selectedStationPreview && (
        <PreviewCard
          selectedStationPreview={selectedStationPreview}
          setSelectedStationPreview={setSelectedStationPreview}
          setSelectedStationDetail={setSelectedStationDetail}
          triggerHaptic={triggerHaptic}
          bottom={Animated.add(animatedHeight, 20)}
          isDark={isSystemDark}
        />
      )}

      {/* Sliding Bottom Sheet */}
      <Animated.View
        style={[
          styles.bottomSheet,
          {
            height: animatedHeight,
            backgroundColor: isSystemDark ? '#0f172a' : '#ffffff',
            borderColor: isSystemDark ? '#1e293b' : '#e2e8f0',
          }
        ]}
      >
        {/* Handle bar for dragging */}
        <View style={[styles.dragHandleContainer, { borderBottomColor: isSystemDark ? '#1e293b' : '#e2e8f0' }]} {...panResponder.panHandlers}>
          <View style={[styles.dragHandle, { backgroundColor: isSystemDark ? '#334155' : '#cbd5e1' }]} />
          <View style={styles.sheetHeaderInfo}>
            <Text style={[styles.sheetTitle, { color: isSystemDark ? '#f8fafc' : '#0f172a' }]}>Gasolineras Cercanas</Text>
            <Text style={styles.sheetSub}>{filteredStations.length} encontradas ({searchRadius} km)</Text>
          </View>
        </View>

        {/* Sorting controls */}
        <View style={[styles.sortContainer, { backgroundColor: isSystemDark ? '#0b0f19' : '#f1f5f9' }]}>
          <Text style={styles.sortLabel}>Ordenar:</Text>
          <TouchableOpacity 
            style={[
              styles.sortBtn,
              {
                backgroundColor: isSystemDark ? '#0f172a' : '#ffffff',
                borderColor: isSystemDark ? '#1e293b' : '#cbd5e1',
              },
              sortBy === 'price' && styles.sortBtnActive
            ]} 
            onPress={() => { triggerHaptic(); setSortBy('price'); }}
          >
            <Text
              style={[
                styles.sortBtnText,
                { color: isSystemDark ? '#64748b' : '#475569' },
                sortBy === 'price' && styles.sortBtnTextActive
              ]}
            >
              Precio
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[
              styles.sortBtn,
              {
                backgroundColor: isSystemDark ? '#0f172a' : '#ffffff',
                borderColor: isSystemDark ? '#1e293b' : '#cbd5e1',
              },
              sortBy === 'distance' && styles.sortBtnActive
            ]} 
            onPress={() => { triggerHaptic(); setSortBy('distance'); }}
          >
            <Text
              style={[
                styles.sortBtnText,
                { color: isSystemDark ? '#64748b' : '#475569' },
                sortBy === 'distance' && styles.sortBtnTextActive
              ]}
            >
              Distancia
            </Text>
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
            renderItem={({ item }) => (
              <StationCard
                item={item}
                triggerHaptic={triggerHaptic}
                setSelectedStationDetail={setSelectedStationDetail}
                centerMap={centerMap}
                setSelectedStationPreview={setSelectedStationPreview}
                animatedHeight={animatedHeight}
                sheetPosition={sheetPosition}
                SHEET_MID_HEIGHT={SHEET_MID_HEIGHT}
                openNavigation={openNavigation}
                isDark={isSystemDark}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: isSystemDark ? '#94a3b8' : '#334155' }]}>No hay resultados en esta zona</Text>
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
        isDark={isSystemDark}
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
  floatingButtonsContainer: {
    position: 'absolute',
    right: 15,
    flexDirection: 'row',
    gap: 10,
    zIndex: 8,
  },
  floatingActionBtn: {
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
  floatingActionText: {
    fontSize: 18,
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
  statusBarCover: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#020617',
    zIndex: 99,
  },
});
