
export enum Level {
  MATERNAL = 'Maternal',
  PRE_ESCOLAR = 'Pre-escolar',
  PRIMARIA = 'Primaria',
  SECUNDARIA = 'Secundaria'
}

export enum PaymentMethod {
  PAGO_MOVIL = 'Pago Móvil',
  TRANSFERENCIA = 'Transferencia',
  ZELLE = 'Zelle',
  EFECTIVO_BS = 'Efectivo Bs',
  EFECTIVO_USD = 'Efectivo $',
  EFECTIVO_EUR = 'Efectivo €',
  TDC = 'TDC',
  TDD = 'TDD'
}

export enum PaymentStatus {
  PENDIENTE = 'Pendiente',
  VERIFICADO = 'Verificado',
  RECHAZADO = 'Rechazado'
}

export enum PaymentType {
  ABONO = 'Abono',
  PAGO_TOTAL = 'Pago Total'
}

export interface Student {
  name: string;
  level: Level;
  section: string;
}

export interface Representative {
  cedula: string;
  name: string;
  matricula: string;
  students: Student[];
}

export interface PaymentRecord {
  id: string;
  timestamp: string;
  paymentDate: string;
  cedulaRepresentative: string;
  matricula: string;
  level: string; // The level(s) of students
  sections: string; // The section(s) of students
  method: PaymentMethod;
  reference: string;
  amount: number;
  observations: string;
  status: PaymentStatus;
  type: PaymentType;
  pendingBalance: number;
}

export interface MonthlyConfig {
  [key: string]: number; // Price per level
}

export interface User {
  cedula: string;
  clave: string;
  nombre: string;
  matricula: string;
}

// New Notification Types
export enum NotificationCategory {
  PAYMENT = 'Pago',
  ANNOUNCEMENT = 'Anuncio',
  SYSTEM = 'Sistema',
  VERIFICATION = 'Verificación'
}

export enum NotificationRecipient {
  ADMIN = 'Administrativo',
  REPRESENTATIVE = 'Representante',
  ALL = 'Todos'
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  recipient: NotificationRecipient;
  timestamp: string;
  read: boolean;
  link?: string;
}
