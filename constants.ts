
import { Level, AppConfig } from './types';

export const DEFAULT_CONFIG: AppConfig = {
  monthlyFees: {
    [Level.MATERNAL]: 80,
    [Level.PRE_ESCOLAR]: 70,
    [Level.PRIMARIA]: 60,
    [Level.SECUNDARIA]: 90
  },
  exchangeRate: 45.50, // Tasa inicial sugerida
  schoolName: 'Beltrán Prieto Figueroa',
  lastUpdated: new Date().toISOString()
};

export const GOOGLE_SHEET_ID = '1vhTFY-DLkHZIvTozAj-_ZiJDLftgkHmh494OM9EjDdQ';
export const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbx-upEeCkMmb4zdZEIW1OMA3vwjHvKYbZnWICPVkf9SrZOcqEBR_xdZDY2ZbEZTivgHdA/exec'; 
export const SECTIONS = ['A', 'B', 'C', 'D'];
