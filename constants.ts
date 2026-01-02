
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

// IDs unificados a la hoja "SistemLbeltranPfigueroa"
export const ADMIN_SHEET_ID = '1vhTFY-DLkHZIvTozAj-_ZiJDLftgkHmh494OM9EjDdQ';
// Ahora la oficina virtual lee del mismo archivo (Pestaña 'OficinaVirtual')
export const VIRTUAL_SHEET_ID = '1vhTFY-DLkHZIvTozAj-_ZiJDLftgkHmh494OM9EjDdQ';

// URL del script
export const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyev9zo6udHCW4TIuhI9eQk8jQCrQd0xtNgPwU7AoNgxoAQTw-kxugrAUSPhR_Cj1-aIg/exec'; 

export const SECTIONS = ['A', 'B', 'C', 'D'];
