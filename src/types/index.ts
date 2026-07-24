export interface GasStation {
  id: string;
  name: string;
  address: string;
  locality: string;
  latitude: number;
  longitude: number;
  prices: { [key: string]: number | null };
  distance?: number;
  price?: number;
  priceLevel?: 'cheapest' | 'economy' | 'moderate' | 'expensive' | 'most-expensive';
}

export interface FuelType {
  label: string;
  value: string;
}

export type SortBy = 'price' | 'distance';
