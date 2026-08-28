import { useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GasStation } from '../types';
import { calculateDistance } from '../utils/helpers';
import { PROVINCE_CAPITALS } from '../constants/provinces';

export function useGasStations() {
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Descargando base de datos...');
  const [allStations, setAllStations] = useState<GasStation[]>([]);
  const [currentProvinceId, setCurrentProvinceId] = useState<string | null>(null);
  
  const activeProvinceIdRef = useRef<string | null>(null);

  const loadGasStations = async (
    forceRefresh = false,
    coords?: { latitude: number; longitude: number },
    radius?: number,
    targetProvinceId: string | null = null
  ) => {
    try {
      setLoading(true);

      // Clean up legacy single-key cache
      try {
        await AsyncStorage.removeItem('gas_stations_db');
      } catch (e) {}

      // Calculate which provinces to load based on coords and radius
      let provincesToLoad: string[] = [];
      if (targetProvinceId) {
        provincesToLoad = [targetProvinceId];
      } else if (coords && radius) {
        Object.entries(PROVINCE_CAPITALS).forEach(([provId, cap]) => {
          const dist = calculateDistance(coords.latitude, coords.longitude, cap.lat, cap.lon);
          // If the province capital is within searchRadius + province radius, load it
          if (dist <= radius + cap.r) {
            provincesToLoad.push(provId);
          }
        });
      }

      // Fallback if no province resolved
      if (provincesToLoad.length === 0) {
        let provinceId = activeProvinceIdRef.current;
        if (!provinceId) {
          const savedProvinceId = await AsyncStorage.getItem('last_province_id');
          provinceId = savedProvinceId || '28'; // Madrid por defecto
        }
        provincesToLoad = [provinceId];
      }

      // Determine active province (closest one to user coords, or first in list)
      let activeProvId = provincesToLoad[0];
      if (coords) {
        let minDist = Infinity;
        provincesToLoad.forEach(provId => {
          const cap = PROVINCE_CAPITALS[provId];
          if (cap) {
            const dist = calculateDistance(coords.latitude, coords.longitude, cap.lat, cap.lon);
            if (dist < minDist) {
              minDist = dist;
              activeProvId = provId;
            }
          }
        });
      }

      activeProvinceIdRef.current = activeProvId;
      setCurrentProvinceId(activeProvId);
      await AsyncStorage.setItem('last_province_id', activeProvId);

      const mergedStationsMap = new Map<string, GasStation>();

      // Load data for all resolved provinces
      for (const provId of provincesToLoad) {
        setLoadingStatus(`Cargando provincia ${provId}...`);
        let provStations: GasStation[] = [];
        let loadedFromCache = false;

        if (!forceRefresh) {
          const cachedCount = await AsyncStorage.getItem(`gas_stations_db_chunks_count_${provId}`);
          if (cachedCount) {
            const numChunks = parseInt(cachedCount, 10);
            let mergedChunks: GasStation[] = [];
            let success = true;

            for (let i = 0; i < numChunks; i++) {
              const chunkStr = await AsyncStorage.getItem(`gas_stations_db_chunk_${provId}_${i}`);
              if (chunkStr) {
                mergedChunks = mergedChunks.concat(JSON.parse(chunkStr));
              } else {
                success = false;
                break;
              }
            }

            if (success && mergedChunks.length > 0) {
              provStations = mergedChunks;
              loadedFromCache = true;
            }
          }
        }

        if (!loadedFromCache) {
          setLoadingStatus(`Descargando provincia ${provId}...`);
          const baseUrl = `https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/${provId}`;
          const fetchUrl = forceRefresh ? `${baseUrl}?t=${Date.now()}` : baseUrl;
          const response = await fetch(fetchUrl, forceRefresh ? { cache: 'no-store' } : {});
          if (response.ok) {
            const data = await response.json();
            const list = data.ListaEESSPrecio || [];

            const parsed: GasStation[] = list.map((station: any) => ({
              id: station['IDEESS'],
              name: station['Rótulo'] || 'Sin nombre',
              address: station['Dirección'] || '',
              locality: station['Localidad'] || '',
              latitude: parseFloat(station['Latitud'].replace(',', '.')),
              longitude: parseFloat(station['Longitud (WGS84)'].replace(',', '.')),
              prices: {
                'Precio Gasolina 95 E5': parseFloat(station['Precio Gasolina 95 E5']?.replace(',', '.')) || null,
                'Precio Gasolina 98 E5': parseFloat(station['Precio Gasolina 98 E5']?.replace(',', '.')) || null,
                'Precio Gasoleo A': parseFloat(station['Precio Gasoleo A']?.replace(',', '.')) || null,
                'Precio Gasoleo Premium': parseFloat(station['Precio Gasoleo Premium']?.replace(',', '.')) || null,
                'Precio Gasoleo B': parseFloat(station['Precio Gasoleo B']?.replace(',', '.')) || null,
                'Precio GPL': parseFloat(station['Precio Gases Licuados del Petróleo']?.replace(',', '.')) || null,
                'Precio GNC': parseFloat(station['Precio Gas Natural Comprimido']?.replace(',', '.')) || null,
              }
            })).filter((s: any) => !isNaN(s.latitude) && !isNaN(s.longitude));

            // Cache chunked data
            const CHUNK_SIZE = 500;
            const numChunks = Math.ceil(parsed.length / CHUNK_SIZE);
            await AsyncStorage.setItem(`gas_stations_db_chunks_count_${provId}`, String(numChunks));

            for (let i = 0; i < numChunks; i++) {
              const chunk = parsed.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
              await AsyncStorage.setItem(`gas_stations_db_chunk_${provId}_${i}`, JSON.stringify(chunk));
            }

            provStations = parsed;
          }
        }

        // Add to map to deduplicate by ID
        provStations.forEach(s => {
          mergedStationsMap.set(s.id, s);
        });
      }

      setAllStations(Array.from(mergedStationsMap.values()));
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoadingStatus('Error al conectar. Reintentando...');
      setTimeout(() => loadGasStations(forceRefresh, coords, radius, targetProvinceId), 5000);
    }
  };

  return {
    loading,
    loadingStatus,
    allStations,
    currentProvinceId,
    activeProvinceIdRef,
    loadGasStations,
    setAllStations,
    setLoading
  };
}
