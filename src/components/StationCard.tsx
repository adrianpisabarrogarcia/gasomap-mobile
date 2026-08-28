import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { GasStation } from '../types';
import { getPriceLevelStyles } from '../utils/helpers';

interface StationCardProps {
  item: GasStation;
  triggerHaptic: () => void;
  setSelectedStationDetail: (station: GasStation | null) => void;
  centerMap: (lat: number, lon: number, zoom?: number) => void;
  setSelectedStationPreview: (station: GasStation | null) => void;
  animatedHeight: Animated.Value;
  sheetPosition: React.MutableRefObject<'collapsed' | 'middle' | 'expanded'>;
  SHEET_MID_HEIGHT: number;
  openNavigation: (station: GasStation) => void;
  isDark: boolean;
}

export default function StationCard({
  item,
  triggerHaptic,
  setSelectedStationDetail,
  centerMap,
  setSelectedStationPreview,
  animatedHeight,
  sheetPosition,
  SHEET_MID_HEIGHT,
  openNavigation,
  isDark,
}: StationCardProps) {
  const stylesInfo = getPriceLevelStyles(item.priceLevel);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          borderLeftColor: stylesInfo.color,
          backgroundColor: isDark ? 'rgba(15, 23, 42, 0.4)' : '#ffffff',
          borderBottomColor: isDark ? '#1e293b' : '#e2e8f0',
        }
      ]}
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
        <Text style={[styles.cardAddress, { color: isDark ? '#94a3b8' : '#475569' }]} numberOfLines={1}>
          {item.address}
        </Text>

        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={[styles.cardIconBtn, { backgroundColor: isDark ? '#1e293b' : '#e2e8f0' }]}
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
            <Text style={[styles.cardIconText, { color: isDark ? '#e2e8f0' : '#0f172a' }]}>🗺️ Ver mapa</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.cardRight}>
        <Text style={[styles.cardPrice, { color: stylesInfo.color }]}>
          {item.price?.toFixed(3)}
        </Text>
        <Text style={[styles.priceUnit, { color: isDark ? '#64748b' : '#475569' }]}>€/L</Text>

        <TouchableOpacity style={styles.routeBtn} onPress={() => openNavigation(item)}>
          <Text style={styles.routeBtnText}>Ruta</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
});
