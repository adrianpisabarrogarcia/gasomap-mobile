import { useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GasStation } from '../types';

export function useGasStations() {
  const [loading, setLoading] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('Descargando base de datos...');
  const [allStations, setAllStations] = useState<GasStation[]>([]);
  const [currentProvinceId, setCurrentProvinceId] = useState<string | null>(null);
  
  const activeProvinceIdRef = useRef<string | null>(null);

  const loadGasStations = async (forceRefresh = false, targetProvinceId: string | null = null) => {
    try {
      setLoading(true);

      // Clean up legacy single-key cache
      try {
        await AsyncStorage.removeItem('gas_stations_db');
      } catch (e) {}

      let provinceId = targetProvinceId;
      if (!provinceId) {
        provinceId = activeProvinceIdRef.current;
      }
      if (!provinceId) {
        const savedProvinceId = await AsyncStorage.getItem('last_province_id');
        provinceId = savedProvinceId || '28'; // Madrid por defecto
      }

      activeProvinceIdRef.current = provinceId;
      setCurrentProvinceId(provinceId);
      await AsyncStorage.setItem('last_province_id', provinceId);

      const cachedCount = await AsyncStorage.getItem(`gas_stations_db_chunks_count_${provinceId}`);
      if (cachedCount && !forceRefresh) {
        const numChunks = parseInt(cachedCount, 10);
        let merged: GasStation[] = [];
        let success = true;

        for (let i = 0; i < numChunks; i++) {
          const chunkStr = await AsyncStorage.getItem(`gas_stations_db_chunk_${provinceId}_${i}`);
          if (chunkStr) {
            merged = merged.concat(JSON.parse(chunkStr));
          } else {
            success = false;
            break;
          }
        }

        if (success && merged.length > 0) {
          setAllStations(merged);
          setLoading(false);
          return;
        }
      }

      setLoadingStatus('Conectando con el Ministerio...');
      const baseUrl = `https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/${provinceId}`;
      const fetchUrl = forceRefresh ? `${baseUrl}?t=${Date.now()}` : baseUrl;
      const response = await fetch(fetchUrl, forceRefresh ? { cache: 'no-store' } : {});
      if (!response.ok) throw new Error('API server error');
      
      setLoadingStatus('Procesando datos...');
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

      // Save chunked data (500 items max per row)
      const CHUNK_SIZE = 500;
      const numChunks = Math.ceil(parsed.length / CHUNK_SIZE);
      await AsyncStorage.setItem(`gas_stations_db_chunks_count_${provinceId}`, String(numChunks));

      for (let i = 0; i < numChunks; i++) {
        const chunk = parsed.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        await AsyncStorage.setItem(`gas_stations_db_chunk_${provinceId}_${i}`, JSON.stringify(chunk));
      }

      setAllStations(parsed);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoadingStatus('Error al conectar. Reintentando...');
      setTimeout(() => loadGasStations(forceRefresh, targetProvinceId), 5000);
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
