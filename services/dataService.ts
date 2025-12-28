
import { Representative, PaymentRecord, PaymentStatus, PaymentMethod, PaymentType, AppConfig, Level } from '../types';
import { DEFAULT_CONFIG, WEB_APP_URL } from '../constants';

const STORAGE_KEY_REPRESENTATIVES = 'bpf_representatives';
const STORAGE_KEY_PAYMENTS = 'bpf_payments';
const STORAGE_KEY_CONFIG = 'bpf_config';

async function apiCall(action: string, method: 'GET' | 'POST', data?: any) {
  if (!WEB_APP_URL) {
    console.warn("WEB_APP_URL no configurada.");
    return null;
  }

  const baseUrl = WEB_APP_URL.trim();
  const url = method === 'GET' ? `${baseUrl}?action=${action}` : baseUrl;

  try {
    const options: RequestInit = {
      method: method,
      mode: 'cors',
      // 'follow' es vital para las redirecciones de Google Apps Script
      redirect: 'follow', 
    };

    if (method === 'POST') {
      /**
       * IMPORTANTE: No usamos headers['Content-Type'] = 'application/json'.
       * Google Apps Script acepta JSON enviado como texto plano.
       * Esto evita el pre-vuelo OPTIONS de CORS (Failed to fetch).
       */
      options.body = JSON.stringify({ action, data });
    }

    const response = await fetch(url, options);
    
    // Si la respuesta es de tipo opaco (mode: 'no-cors'), no podremos leer el body.
    // Pero aquí usamos mode: 'cors' y redirect: 'follow' para que funcione correctamente.
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    if (result && result.error) {
      console.error(`Error de Servidor BPF: ${result.error}`);
      return null;
    }
    
    return result;
  } catch (error) {
    console.error(`Fetch Fallido (${action}):`, error);
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
      const bsAmount = amount * rate;
      return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'VES' }).format(bsAmount);
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  },

  getDualAmount: (amountUSD: number) => {
    return `${dataService.formatCurrency(amountUSD, 'USD')} (${dataService.formatCurrency(amountUSD, 'BS')})`;
  },

  getRepresentatives: (): Representative[] => {
    const data = localStorage.getItem(STORAGE_KEY_REPRESENTATIVES);
    return data ? JSON.parse(data) : [];
  },

  syncFromSheets: async () => {
    console.log("Iniciando sincronización robusta...");
    
    const remoteConfig = await apiCall('getConfig', 'GET');
    if (remoteConfig && !remoteConfig.error) {
      const currentConfig = dataService.getConfig();
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify({ ...currentConfig, ...remoteConfig }));
    }

    const remoteReps = await apiCall('getRepresentatives', 'GET');
    if (remoteReps && Array.isArray(remoteReps)) {
      localStorage.setItem(STORAGE_KEY_REPRESENTATIVES, JSON.stringify(remoteReps));
    }

    const remotePayments = await apiCall('getPayments', 'GET');
    if (remotePayments && Array.isArray(remotePayments)) {
      localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(remotePayments));
    }
    
    console.log("Sincronización robusta completada.");
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
    const currentMonthIndex = new Date().getMonth();
    // Año escolar empieza en Septiembre (8)
    const monthsElapsed = currentMonthIndex >= 8 ? (currentMonthIndex - 8 + 1) : (currentMonthIndex + 4 + 1);
    
    let totalOwed = 0;
    rep.students.forEach(s => {
      const fee = config.monthlyFees[s.level] || DEFAULT_CONFIG.monthlyFees[s.level] || 0;
      totalOwed += fee * monthsElapsed;
    });

    const totalPaid = dataService.getPayments()
      .filter(p => p.cedulaRepresentative === cedula && p.status === PaymentStatus.VERIFICADO)
      .reduce((sum, p) => sum + p.amount, 0);

    return Math.max(0, totalOwed - totalPaid);
  }
};
