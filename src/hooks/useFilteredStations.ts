import { useMemo } from 'react';
import { GasStation, SortBy } from '../types';
import { calculateDistance } from '../utils/helpers';

export function useFilteredStations(
  allStations: GasStation[],
  currentCoords: { latitude: number; longitude: number },
  selectedFuel: string,
  searchRadius: number,
  sortBy: SortBy
) {
  const filteredStations = useMemo(() => {
    if (!allStations.length) return [];

    let computed = allStations
      .map(station => {
        const price = station.prices[selectedFuel];
        const distance = calculateDistance(
          currentCoords.latitude,
          currentCoords.longitude,
          station.latitude,
          station.longitude
        );
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

    return computed;
  }, [allStations, currentCoords, selectedFuel, searchRadius, sortBy]);

  return filteredStations;
}
