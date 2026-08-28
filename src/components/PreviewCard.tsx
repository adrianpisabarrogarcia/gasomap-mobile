import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { GasStation } from '../types';
import { getPriceLevelStyles } from '../utils/helpers';

interface PreviewCardProps {
  selectedStationPreview: GasStation;
  setSelectedStationPreview: (station: GasStation | null) => void;
  setSelectedStationDetail: (station: GasStation | null) => void;
  triggerHaptic: () => void;
  bottom: any;
}

export default function PreviewCard({
  selectedStationPreview,
  setSelectedStationPreview,
  setSelectedStationDetail,
  triggerHaptic,
  bottom,
}: PreviewCardProps) {
  const stylesInfo = getPriceLevelStyles(selectedStationPreview.priceLevel);

  return (
    <Animated.View style={[styles.previewCard, { bottom }]}>
      <View style={styles.previewHeader}>
        <Text style={styles.previewName} numberOfLines={1}>
          {selectedStationPreview.name}
        </Text>
        <TouchableOpacity 
          onPress={() => setSelectedStationPreview(null)} 
          style={styles.previewCloseBtn}
        >
          <Text style={styles.previewCloseText}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.previewAddress} numberOfLines={1}>
        {selectedStationPreview.address}
      </Text>
      <View style={styles.previewFooter}>
        <Text style={[styles.previewPrice, { color: stylesInfo.color }]}>
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
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
    zIndex: 9,
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
});
