
import { Representative, PaymentRecord, PaymentStatus, PaymentMethod, PaymentType, AppConfig, Level, Student } from '../types';
import { DEFAULT_CONFIG, WEB_APP_URL, ADMIN_SHEET_ID, VIRTUAL_SHEET_ID } from '../constants';

const STORAGE_KEY_REPRESENTATIVES = 'bpf_representatives';
const STORAGE_KEY_PAYMENTS = 'bpf_payments';
const STORAGE_KEY_VIRTUAL_PAYMENTS = 'bpf_virtual_payments';
const STORAGE_KEY_CONFIG = 'bpf_config';

async function apiCall(url: string, action: string, method: 'GET' | 'POST', ssid: string, data?: any) {
  if (!url) return null;
  
  // Incluimos el ssid en la URL para GET o en el body para POST
  const targetUrl = method === 'GET' 
    ? `${url}${url.includes('?') ? '&' : '?'}action=${action}&ssid=${ssid}` 
    : url;

  try {
    const options: RequestInit = {
      method: method,
      mode: 'cors',
      cache: 'no-cache',
      redirect: 'follow',
    };

    if (method === 'POST') {
      options.body = JSON.stringify({ action, data, ssid });
    }

    const response = await fetch(targetUrl, options);
    if (!response.ok) return null;

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      console.error("JSON Error:", text);
      return null;
    }
  } catch (error) {
    console.warn(`Error en [${action}]:`, error);
    return null;
  }
}

export const dataService = {
  getConfig: (): AppConfig => {
    try {
      const data = localStorage.getItem(STORAGE_KEY_CONFIG);
      const savedConfig = data ? JSON.parse(data) : {};
      return { ...DEFAULT_CONFIG, ...savedConfig };
    } catch (e) { return DEFAULT_CONFIG; }
  },

  saveConfig: async (config: AppConfig) => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
    return await apiCall(WEB_APP_URL, 'saveConfig', 'POST', ADMIN_SHEET_ID, config);
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

  getVirtualPayments: (): any[] => {
    const data = localStorage.getItem(STORAGE_KEY_VIRTUAL_PAYMENTS);
    return data ? JSON.parse(data) : [];
  },

  syncFromSheets: async () => {
    // 1. Sincronizar Configuración
    const remoteConfig = await apiCall(WEB_APP_URL, 'getConfig', 'GET', ADMIN_SHEET_ID);
    if (remoteConfig && !remoteConfig.error) {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(remoteConfig));
    }

    // 2. Sincronizar Representantes
    const remoteReps = await apiCall(WEB_APP_URL, 'getRepresentatives', 'GET', ADMIN_SHEET_ID);
    if (Array.isArray(remoteReps)) {
      localStorage.setItem(STORAGE_KEY_REPRESENTATIVES, JSON.stringify(remoteReps));
    }

    // 3. Sincronizar Pagos Verificados
    const remotePayments = await apiCall(WEB_APP_URL, 'getPayments', 'GET', ADMIN_SHEET_ID);
    if (Array.isArray(remotePayments)) {
      localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(remotePayments));
    }

    // 4. Sincronizar Pagos de Oficina Virtual
    // Ahora devuelve solo los que NO están procesados
    const virtualPayments = await apiCall(WEB_APP_URL, 'getVirtualPayments', 'GET', ADMIN_SHEET_ID);
    if (Array.isArray(virtualPayments)) {
      localStorage.setItem(STORAGE_KEY_VIRTUAL_PAYMENTS, JSON.stringify(virtualPayments));
    }
  },

  saveRepresentative: async (rep: Representative) => {
    const current = dataService.getRepresentatives();
    const exists = current.findIndex(r => r.cedula === rep.cedula);
    if (exists > -1) current[exists] = rep;
    else current.push(rep);
    localStorage.setItem(STORAGE_KEY_REPRESENTATIVES, JSON.stringify(current));
    return await apiCall(WEB_APP_URL, 'saveRepresentative', 'POST', ADMIN_SHEET_ID, rep);
  },

  getRepresentativeByCedula: (cedula: string): Representative | undefined => {
    return dataService.getRepresentatives().find(r => r.cedula.toString() === (cedula || "").toString());
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
      id: payment.id || `PAY-${Date.now()}`,
      timestamp: new Date().toISOString(),
      paymentDate: payment.paymentDate || new Date().toISOString().split('T')[0],
      cedulaRepresentative: (payment.cedulaRepresentative || '').toString(),
      matricula: payment.matricula || '',
      level: payment.level || '',
      sections: payment.sections || '',
      method: payment.method as any,
      reference: (payment.reference || '').toString(),
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
    
    // Guardamos en la base de Administración
    await apiCall(WEB_APP_URL, 'addPayment', 'POST', ADMIN_SHEET_ID, newPayment);
    return newPayment;
  },

  // Nueva función para marcar un pago como procesado en la hoja de Oficina Virtual
  markVirtualProcessed: async (rowIndex: number, status: 'PROCESADO' | 'RECHAZADO_SISTEMA') => {
    return await apiCall(WEB_APP_URL, 'markVirtualProcessed', 'POST', ADMIN_SHEET_ID, { rowIndex, status });
  },

  updatePaymentStatus: async (id: string, status: PaymentStatus, reference?: string) => {
    const current = dataService.getPayments();
    const idx = current.findIndex(p => p.id === id);
    if (idx > -1) {
      current[idx].status = status;
      localStorage.setItem(STORAGE_KEY_PAYMENTS, JSON.stringify(current));
    }
    // Actualizamos en la base de Administración
    return await apiCall(WEB_APP_URL, 'updatePaymentStatus', 'POST', ADMIN_SHEET_ID, { id, status, reference });
  },

  calculatePendingBalance: (cedula: string): number => {
    const rep = dataService.getRepresentativeByCedula(cedula);
    if (!rep) return 0;
    const config = dataService.getConfig();
    const now = new Date();
    let totalOwed = 0;
    
    rep.students.forEach(s => {
      const enrollmentDate = s.enrollmentDate ? new Date(s.enrollmentDate) : new Date();
      let diffMonths = (now.getFullYear() - enrollmentDate.getFullYear()) * 12 + (now.getMonth() - enrollmentDate.getMonth()) + 1;
      const fees = config.monthlyFees || DEFAULT_CONFIG.monthlyFees;
      const fee = fees[s.level] || 0;
      totalOwed += (fee * Math.max(1, diffMonths));
    });

    const totalPaid = dataService.getPayments()
      .filter(p => p.cedulaRepresentative.toString() === cedula.toString() && p.status === PaymentStatus.VERIFICADO)
      .reduce((sum, p) => sum + p.amount, 0);

    return Math.max(0, totalOwed - totalPaid);
  }
};
