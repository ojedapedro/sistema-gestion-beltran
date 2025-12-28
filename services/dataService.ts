
import { Representative, PaymentRecord, PaymentStatus, PaymentMethod, PaymentType, AppConfig, Level, Student } from '../types';
import { DEFAULT_CONFIG, WEB_APP_URL } from '../constants';

const STORAGE_KEY_REPRESENTATIVES = 'bpf_representatives';
const STORAGE_KEY_PAYMENTS = 'bpf_payments';
const STORAGE_KEY_CONFIG = 'bpf_config';

/**
 * Función de llamada a la API optimizada para evitar errores CORS con Google Apps Script.
 * No usamos Content-Type: application/json en POST para evitar el pre-flight OPTIONS.
 */
async function apiCall(action: string, method: 'GET' | 'POST', data?: any) {
  if (!WEB_APP_URL) return null;

  const baseUrl = WEB_APP_URL.trim();
  const url = method === 'GET' ? `${baseUrl}?action=${action}` : baseUrl;

  try {
    const options: RequestInit = {
      method: method,
      mode: 'cors',
      redirect: 'follow',
      credentials: 'omit'
    };

    if (method === 'POST') {
      // Enviamos como texto plano para evitar pre-flight CORS
      options.body = JSON.stringify({ action, data });
    }

    const response = await fetch(url, options);
    
    if (!response.ok) {
      throw new Error(`Error de red: ${response.status}`);
    }

    const result = await response.json();
    if (result && result.error) {
      console.error("Error devuelto por el servidor:", result.error);
      return null;
    }
    
    return result;
  } catch (error) {
    console.error(`Fallo de comunicación (${action}):`, error);
    // En caso de fallo total, retornamos null para que la app use el cache local
    return null;
  }
}

export const dataService = {
  getConfig: (): AppConfig => {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CONFIG);
      const savedConfig = data ? JSON.parse(data) : {};
      return { 
        ...DEFAULT_CONFIG, 
        ...savedConfig,
        monthlyFees: { ...DEFAULT_CONFIG.monthlyFees, ...(savedConfig.monthlyFees || {}) }
      };
    } catch (e) {
      return DEFAULT_CONFIG;
    }
  },

  saveConfig: async (config: AppConfig) => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    return await apiCall('saveConfig', 'POST', config);
  },

  formatCurrency: (amount: number, currency: 'USD' | 'BS' = 'USD') => {
    const config = dataService.getConfig();
    const rate = config.exchangeRate || DEFAULT_CONFIG.exchangeRate;
    if (currency === 'BS') {
      return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(amount * rate);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  },

  getRepresentatives: (): Representative[] => {
    const data = localStorage.getItem(STORAGE_KEY_REPRESENTATIVES);
    return data ? JSON.parse(data) : [];
  },

  syncFromSheets: async () => {
    try {
      const remoteConfig = await apiCall('getConfig', 'GET');
      if (remoteConfig) {
        localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ ...dataService.getConfig(), ...remoteConfig }));
      }

      const remoteReps = await apiCall('getRepresentatives', 'GET');
      if (Array.isArray(remoteReps)) {
        localStorage.setItem(STORAGE_KEY_REPRESENTATIVES, JSON.stringify(remoteReps));
      }

      const remotePayments = await apiCall('getPayments', 'GET');
      if (Array.isArray(remotePayments)) {
        localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(remotePayments));
      }
    } catch (err) {
      console.warn("Sincronización fallida, usando datos locales.");
    }
  },

  saveRepresentative: async (rep: Representative) => {
    const current = dataService.getRepresentatives();
    const exists = current.findIndex(r => r.cedula === rep.cedula);
    if (exists > -1) current[exists] = rep;
    else current.push(rep);
    localStorage.setItem(STORAGE_KEY_REPRESENTATIVES, JSON.stringify(current));
    return await apiCall('saveRepresentative', 'POST', rep);
  },

  getRepresentativeByCedula: (cedula: string): Representative | undefined => {
    return dataService.getRepresentatives().find(r => r.cedula === cedula);
  },

  getPayments: (): PaymentRecord[] => {
    const data = localStorage.getItem(STORAGE_KEY_PAYMENTS);
    return data ? JSON.parse(data) : [];
  },

  addPayment: async (payment: Partial<PaymentRecord>) => {
    const config = dataService.getConfig();
    const current = dataService.getPayments();
    const amount = payment.amount || 0;
    const rate = config.exchangeRate || DEFAULT_CONFIG.exchangeRate;
    
    const newPayment: PaymentRecord = {
      id: `PAY-${Date.now()}`,
      timestamp: new Date().toISOString(),
      paymentDate: payment.paymentDate || new Date().toISOString().split('T')[0],
      cedulaRepresentative: payment.cedulaRepresentative || '',
      matricula: payment.matricula || '',
      level: payment.level || '',
      sections: payment.sections || '',
      method: payment.method || PaymentMethod.EFECTIVO_USD,
      reference: payment.reference || '',
      amount: amount,
      amountBs: amount * rate,
      exchangeRate: rate,
      observations: payment.observations || '',
      status: payment.status || PaymentStatus.PENDIENTE,
      type: payment.type || PaymentType.PAGO_TOTAL,
      pendingBalance: payment.pendingBalance || 0,
    };
    current.push(newPayment);
    localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(current));
    await apiCall('addPayment', 'POST', newPayment);
    return newPayment;
  },

  updatePaymentStatus: async (id: string, status: PaymentStatus) => {
    const current = dataService.getPayments();
    const idx = current.findIndex(p => p.id === id);
    if (idx > -1) {
      current[idx].status = status;
      localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(current));
      return await apiCall('updatePaymentStatus', 'POST', { id, status });
    }
  },

  calculatePendingBalance: (cedula: string): number => {
    const rep = dataService.getRepresentativeByCedula(cedula);
    if (!rep) return 0;
    
    const config = dataService.getConfig();
    const now = new Date();
    
    let totalOwed = 0;
    rep.students.forEach(s => {
      // Determinamos la fecha de inscripción
      const enrollmentDate = s.enrollmentDate ? new Date(s.enrollmentDate) : new Date();
      
      // Calculamos la diferencia de meses
      // Si se inscribe hoy, diffMonths será 1.
      let diffMonths = (now.getFullYear() - enrollmentDate.getFullYear()) * 12 + (now.getMonth() - enrollmentDate.getMonth()) + 1;
      
      // Evitamos meses negativos o cero
      const monthsToPay = Math.max(1, diffMonths);
      
      const fee = config.monthlyFees[s.level] || DEFAULT_CONFIG.monthlyFees[s.level] || 0;
      totalOwed += (fee * monthsToPay);
    });

    // Restamos pagos VERIFICADOS
    const totalPaid = dataService.getPayments()
      .filter(p => p.cedulaRepresentative === cedula && p.status === PaymentStatus.VERIFICADO)
      .reduce((sum, p) => sum + p.amount, 0);

    return Math.max(0, totalOwed - totalPaid);
  }
};
