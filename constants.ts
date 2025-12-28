
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
export const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwM2K3lGjKQifyyxJbXtls1tovqqYCrY4aQZ3OE5sGBPL8HACDsUvhTADjjRsrV9D2lfA/exec'; 
export const SECTIONS = ['A', 'B', 'C', 'D'];
