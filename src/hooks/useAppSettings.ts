import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SortBy } from '../types';

export function useAppSettings() {
  const [selectedFuel, setSelectedFuel] = useState('Precio Gasolina 95 E5');
  const [searchRadius, setSearchRadius] = useState(5);
  const [sortBy, setSortBy] = useState<SortBy>('price');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedFuel = await AsyncStorage.getItem('app_setting_selected_fuel');
        const savedRadius = await AsyncStorage.getItem('app_setting_search_radius');
        const savedSortBy = await AsyncStorage.getItem('app_setting_sort_by');
        const savedDarkMode = await AsyncStorage.getItem('app_setting_is_dark_mode');

        if (savedFuel) setSelectedFuel(savedFuel);
        if (savedRadius) setSearchRadius(Number(savedRadius));
        if (savedSortBy) setSortBy(savedSortBy as SortBy);
        if (savedDarkMode) setIsDarkMode(savedDarkMode === 'true');
      } catch (e) {
        console.error('Error loading settings:', e);
      } finally {
        setLoadingSettings(false);
      }
    };
    loadSettings();
  }, []);

  // Save settings when they change
  useEffect(() => {
    if (loadingSettings) return;
    AsyncStorage.setItem('app_setting_selected_fuel', selectedFuel).catch(console.error);
  }, [selectedFuel, loadingSettings]);

  useEffect(() => {
    if (loadingSettings) return;
    AsyncStorage.setItem('app_setting_search_radius', String(searchRadius)).catch(console.error);
  }, [searchRadius, loadingSettings]);

  useEffect(() => {
    if (loadingSettings) return;
    AsyncStorage.setItem('app_setting_sort_by', sortBy).catch(console.error);
  }, [sortBy, loadingSettings]);

  useEffect(() => {
    if (loadingSettings) return;
    AsyncStorage.setItem('app_setting_is_dark_mode', String(isDarkMode)).catch(console.error);
  }, [isDarkMode, loadingSettings]);

  return {
    selectedFuel,
    setSelectedFuel,
    searchRadius,
    setSearchRadius,
    sortBy,
    setSortBy,
    isDarkMode,
    setIsDarkMode,
    loadingSettings
  };
}
