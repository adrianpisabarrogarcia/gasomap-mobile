import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GasStation } from '../types';
import { FUEL_TYPES, getPriceLevelStyles } from '../utils/helpers';

interface StationModalProps {
  selectedStationDetail: GasStation | null;
  setSelectedStationDetail: (station: GasStation | null) => void;
  selectedFuel: string;
  openNavigation: (station: GasStation) => void;
}

export default function StationModal({
  selectedStationDetail,
  setSelectedStationDetail,
  selectedFuel,
  openNavigation,
}: StationModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={selectedStationDetail !== null}
      animationType="slide"
      transparent={false}
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
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
            <Text style={styles.modalInfoDistance}>
              🚗 A {selectedStationDetail?.distance?.toFixed(2)} km de tu ubicación
            </Text>
          </View>

          {/* Prices List */}
          <Text style={styles.modalSectionTitle}>Precios disponibles</Text>
          <View style={styles.priceListContainer}>
            {selectedStationDetail && FUEL_TYPES.map(fuel => {
              const price = selectedStationDetail.prices[fuel.value];
              if (price === null) return null;
              const isSelected = selectedFuel === fuel.value;

              return (
                <View 
                  key={fuel.value} 
                  style={[
                    styles.priceRow, 
                    isSelected && { 
                      borderLeftColor: getPriceLevelStyles(selectedStationDetail.priceLevel).color, 
                      borderLeftWidth: 4, 
                      backgroundColor: 'rgba(15, 23, 42, 0.4)' 
                    }
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
  );
}

const styles = StyleSheet.create({
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
