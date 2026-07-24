import { GasStation, FuelType } from '../types';

export const API_URL = 'https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/';
export const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search?format=json&countrycodes=es&q=';

export const FUEL_TYPES: FuelType[] = [
  { label: 'Gasolina 95', value: 'Precio Gasolina 95 E5' },
  { label: 'Gasolina 98', value: 'Precio Gasolina 98 E5' },
  { label: 'Diésel A', value: 'Precio Gasoleo A' },
  { label: 'Diésel Premium', value: 'Precio Gasoleo Premium' },
  { label: 'Agrícola', value: 'Precio Gasoleo B' },
  { label: 'Autogás GLP', value: 'Precio GPL' },
  { label: 'Gas GNC', value: 'Precio GNC' },
];

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getPriceLevelStyles = (level?: string) => {
  switch (level) {
    case 'cheapest':
      return { color: '#10b981', label: 'El más barato', badgeBg: 'rgba(16,185,129,0.15)', border: '#10b981' };
    case 'economy':
      return { color: '#14b8a6', label: 'Económico', badgeBg: 'rgba(20,184,166,0.15)', border: '#14b8a6' };
    case 'moderate':
      return { color: '#f59e0b', label: 'Precio Medio', badgeBg: 'rgba(245,158,11,0.15)', border: '#f59e0b' };
    case 'expensive':
      return { color: '#f97316', label: 'Precio Alto', badgeBg: 'rgba(249,115,22,0.15)', border: '#f97316' };
    case 'most-expensive':
      return { color: '#f43f5e', label: 'El más caro', badgeBg: 'rgba(244,63,94,0.15)', border: '#f43f5e' };
    default:
      return { color: '#94a3b8', label: 'Normal', badgeBg: 'rgba(148,163,184,0.15)', border: 'transparent' };
  }
};

export const MAP_DARK_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#0f172a" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#64748b" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#020617" }] },
  { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "administrative.land_parcel", "elementType": "labels.text.fill", "stylers": [{ "color": "#475569" }] },
  { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#090d16" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#0b0f19" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#475569" }] },
  { "featureType": "poi.park", "elementType": "geometry.fill", "stylers": [{ "color": "#052e16" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#334155" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#0f172a" }, { "strokeColor": "#334155" }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#1e293b" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#020617" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#334155" }] }
];
