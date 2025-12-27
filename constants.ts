
import { Level } from './types';

export const MONTHLY_FEES: Record<Level, number> = {
  [Level.MATERNAL]: 80,
  [Level.PRE_ESCOLAR]: 70,
  [Level.PRIMARIA]: 60,
  [Level.SECUNDARIA]: 90
};

// ID proporcionado por el usuario
export const GOOGLE_SHEET_ID = '1vhTFY-DLkHZIvTozAj-_ZiJDLftgkHmh494OM9EjDdQ';

// Nota: El usuario debe desplegar el script setup_sheets.gs como Web App y pegar la URL aquí.
// Por ahora, el service manejará un fallback a localStorage si no hay URL.
export const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby4qzP_CCbCpUAwLbHljlWBPRT7a1hftjLRSxX3CFpArsw7LW1pnDc-QFgaD2g6GHWDaA/exec'; 

export const SECTIONS = ['A', 'B', 'C', 'U'];
