import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FUEL_TYPES } from '../utils/helpers';
import { FuelType } from '../types';

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchRadius: number;
  setSearchRadius: (radius: number) => void;
  selectedFuel: string;
  setSelectedFuel: (fuel: string) => void;
  searchLocation: () => void;
  searchingLocation: boolean;
  showFuelModal: boolean;
  setShowFuelModal: (show: boolean) => void;
  triggerHaptic: () => void;
}

export default function Header({
  searchQuery,
  setSearchQuery,
  searchRadius,
  setSearchRadius,
  selectedFuel,
  setSelectedFuel,
  searchLocation,
  searchingLocation,
  showFuelModal,
  setShowFuelModal,
  triggerHaptic,
}: HeaderProps) {
  const insets = useSafeAreaInsets();

  const renderFuelOption = (fuel: FuelType) => {
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
    <>
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

        {/* Quick Radius & Fuel selectors */}
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

      {/* Floating Fuel Select Modal */}
      {showFuelModal && (
        <View style={[styles.fuelModalContainer, { top: insets.top + 110 }]}>
          <Text style={styles.fuelModalTitle}>Selecciona combustible</Text>
          <View style={styles.fuelModalList}>
            {FUEL_TYPES.map(renderFuelOption)}
          </View>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    left: 15,
    right: 15,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    zIndex: 10,
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
    justifyContent: 'space-between',
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
    zIndex: 11,
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
});
