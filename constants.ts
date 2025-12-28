
import { Level, AppConfig } from './types';

export const DEFAULT_CONFIG: AppConfig = {
  monthlyFees: {
    [Level.MATERNAL]: 80,
    [Level.PRE_ESCOLAR]: 70,
    [Level.PRIMARIA]: 60,
    [Level.SECUNDARIA]: 90
  },
  exchangeRate: 0.00,
  schoolName: 'Luis Beltrán Prieto Figueroa',
  lastUpdated: new Date().toISOString()
};

// IDs extraídos de tus capturas de pantalla
export const ADMIN_SHEET_ID = '1vhTFY-DLkHZIvTozAj-_ZiJDLftgkHmh494OM9EjDdQ';
export const VIRTUAL_SHEET_ID = '17slRl7f9AKQgCEGF5jDLMGfmOc-unp1gXSRpYFGX1Eg';

// URL del script (debe ser la misma para ambos si usas el mismo backend)
export const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyTuMZugViEbgZ2rbgbsbqn5M3dn16Dxhpzxrj4hkZA2Gl7DA6x2K_fWOedIXLOe47eKA/exec';

export const SECTIONS = ['A', 'B', 'C', 'D'];
