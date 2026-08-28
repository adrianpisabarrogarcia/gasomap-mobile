export const PROVINCES_MAP: { [key: string]: string } = {
  alava: '01', araba: '01', gipuzkoa: '20', guipuzcoa: '20', bizkaia: '48', vizcaya: '48',
  albacete: '02', alicante: '03', alacant: '03', almeria: '04', avila: '05',
  badajoz: '06', baleares: '07', balears: '07', mallorca: '07', menorca: '07', ibiza: '07',
  barcelona: '08', burgos: '09', caceres: '10', cadiz: '11', castellon: '12', castelló: '12',
  ciudadreal: '13', cordoba: '14', coruña: '15', lacoruña: '15', cuenca: '16',
  girona: '17', gerona: '17', granada: '18', guadalajara: '19', huelva: '21',
  huesca: '22', jaen: '23', leon: '24', lleida: '25', lerida: '25', larioja: '26', rioja: '26',
  lugo: '27', madrid: '28', malaga: '29', murcia: '30', navarra: '31', nafarroa: '31',
  ourense: '32', orense: '32', asturias: '33', oviedo: '33', palencia: '34',
  laspalmas: '35', palmas: '35', pontevedra: '36', salamanca: '37',
  tenerife: '38', santacruzdetenerife: '38', cantabria: '39', santander: '39',
  segovia: '40', sevilla: '41', soria: '42', tarragona: '43', teruel: '44',
  toledo: '45', valencia: '46', valència: '46', valladolid: '47',
  zamora: '49', zaragoza: '50', ceuta: '51', melilla: '52'
};

export const PROVINCE_CAPITALS: { [id: string]: { lat: number, lon: number, r: number } } = {
  '01': { lat: 42.8467, lon: -2.6716, r: 40 }, // Álava
  '02': { lat: 38.9943, lon: -1.8585, r: 70 }, // Albacete
  '03': { lat: 38.3452, lon: -0.4810, r: 50 }, // Alicante
  '04': { lat: 36.8340, lon: -2.4637, r: 65 }, // Almería
  '05': { lat: 40.6565, lon: -4.7002, r: 50 }, // Ávila
  '06': { lat: 38.8794, lon: -6.9706, r: 100 }, // Badajoz
  '07': { lat: 39.5696, lon: 2.6502, r: 80 },  // Baleares
  '08': { lat: 41.3851, lon: 2.1734, r: 60 },  // Barcelona
  '09': { lat: 42.3440, lon: -3.6969, r: 85 },  // Burgos
  '10': { lat: 39.4753, lon: -6.3723, r: 100 }, // Cáceres
  '11': { lat: 36.5271, lon: -6.2886, r: 60 },  // Cádiz
  '12': { lat: 39.9864, lon: -0.0513, r: 55 },  // Castellón
  '13': { lat: 38.9848, lon: -3.9274, r: 90 },  // Ciudad Real
  '14': { lat: 37.8882, lon: -4.7794, r: 80 },  // Córdoba
  '15': { lat: 43.3623, lon: -8.4115, r: 65 },  // A Coruña
  '16': { lat: 40.0704, lon: -2.1374, r: 80 },  // Cuenca
  '17': { lat: 41.9794, lon: 2.8214, r: 55 },  // Girona
  '18': { lat: 37.1773, lon: -3.5986, r: 70 },  // Granada
  '19': { lat: 40.6333, lon: -3.1667, r: 65 },  // Guadalajara
  '20': { lat: 43.3183, lon: -1.9812, r: 35 },  // Gipuzkoa
  '21': { lat: 37.2614, lon: -6.9447, r: 55 },  // Huelva
  '22': { lat: 42.1362, lon: -0.4085, r: 80 },  // Huesca
  '23': { lat: 37.7796, lon: -3.7849, r: 65 },  // Jaén
  '24': { lat: 42.5987, lon: -5.5671, r: 85 },  // León
  '25': { lat: 41.6176, lon: 0.6200, r: 85 },   // Lleida
  '26': { lat: 42.4650, lon: -2.4456, r: 60 },  // La Rioja
  '27': { lat: 43.0097, lon: -7.5568, r: 70 },  // Lugo
  '28': { lat: 40.4168, lon: -3.7038, r: 50 },  // Madrid
  '29': { lat: 36.7213, lon: -4.4214, r: 55 },  // Málaga
  '30': { lat: 37.9922, lon: -1.1307, r: 70 },  // Murcia
  '31': { lat: 42.8125, lon: -1.6458, r: 70 },  // Navarra
  '32': { lat: 42.3358, lon: -7.8639, r: 60 },  // Ourense
  '33': { lat: 43.3603, lon: -5.8448, r: 65 },  // Asturias
  '34': { lat: 42.0096, lon: -4.5284, r: 65 },  // Palencia
  '35': { lat: 28.1235, lon: -15.4363, r: 60 }, // Las Palmas
  '36': { lat: 42.4310, lon: -8.6444, r: 40 },  // Pontevedra
  '37': { lat: 40.9701, lon: -5.6635, r: 75 },  // Salamanca
  '38': { lat: 28.4636, lon: -16.2518, r: 60 }, // Santa Cruz de Tenerife
  '39': { lat: 43.4623, lon: -3.8099, r: 55 },  // Cantabria
  '40': { lat: 40.9429, lon: -4.1240, r: 50 },  // Segovia
  '41': { lat: 37.3891, lon: -5.9845, r: 75 },  // Sevilla
  '42': { lat: 41.7640, lon: -2.4688, r: 65 },  // Soria
  '43': { lat: 41.1189, lon: 1.2445, r: 50 },   // Tarragona
  '44': { lat: 40.3456, lon: -1.1065, r: 65 },  // Teruel
  '45': { lat: 39.8628, lon: -4.0273, r: 75 },  // Toledo
  '46': { lat: 39.4699, lon: -0.3763, r: 75 },  // Valencia
  '47': { lat: 41.6523, lon: -4.7245, r: 50 },  // Valladolid
  '48': { lat: 43.2630, lon: -2.9350, r: 35 },  // Bizkaia
  '49': { lat: 41.5042, lon: -5.7485, r: 65 },  // Zamora
  '50': { lat: 41.6488, lon: -0.8891, r: 85 },  // Zaragoza
  '51': { lat: 35.8894, lon: -5.3198, r: 15 },  // Ceuta
  '52': { lat: 35.2923, lon: -2.9381, r: 15 },  // Melilla
};
