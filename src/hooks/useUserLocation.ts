import { useState } from 'react';
import * as Location from 'expo-location';
import { PROVINCES_MAP } from '../constants/provinces';

interface UseUserLocationOptions {
  activeProvinceIdRef: React.MutableRefObject<string | null>;
  loadGasStations: (forceRefresh?: boolean, targetProvinceId?: string | null) => Promise<void>;
  centerMap: (lat: number, lon: number) => void;
  triggerHaptic: () => void;
}

export function useUserLocation({
  activeProvinceIdRef,
  loadGasStations,
  centerMap,
  triggerHaptic,
}: UseUserLocationOptions) {
  const [currentCoords, setCurrentCoords] = useState({
    latitude: 40.416775,
    longitude: -3.703790,
  });
  const [searchingLocation, setSearchingLocation] = useState(false);

  const getProvinceIdFromCoords = async (lat: number, lon: number): Promise<string | null> => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`, {
        headers: {
          'User-Agent': 'GasoMapMobile/1.0 (com.adrianpisabarro.gasomap)'
        }
      });
      if (!response.ok) return null;
      const data = await response.json();
      const province = data.address?.province || data.address?.state || data.address?.region;
      if (!province) return null;

      const normalized = province.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "");

      const foundKey = Object.keys(PROVINCES_MAP).find(key => normalized.includes(key));
      return foundKey ? PROVINCES_MAP[foundKey] : null;
    } catch (e) {
      console.error('Error reverse geocoding:', e);
      return null;
    }
  };

  const geolocateUser = async (isInitial = false) => {
    try {
      setSearchingLocation(true);
      if (!isInitial) {
        triggerHaptic();
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!isInitial) alert('Permiso de GPS denegado.');
        setSearchingLocation(false);
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
        
        // Reverse geocode in background
        getProvinceIdFromCoords(cachedCoords.latitude, cachedCoords.longitude).then(provId => {
          if (provId && provId !== activeProvinceIdRef.current) {
            loadGasStations(false, provId);
          }
        });
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

      const provId = await getProvinceIdFromCoords(newCoords.latitude, newCoords.longitude);
      if (provId && provId !== activeProvinceIdRef.current) {
        await loadGasStations(false, provId);
      }
    } catch (error) {
      console.warn('Geolocation error:', error);
    } finally {
      setSearchingLocation(false);
    }
  };

  return {
    currentCoords,
    setCurrentCoords,
    searchingLocation,
    geolocateUser,
    getProvinceIdFromCoords
  };
}
