
import React, { useState } from 'react';
import { dataService } from '../services/dataService';
import { notificationService } from '../services/notificationService';
import { PaymentRecord, PaymentStatus, NotificationCategory, NotificationRecipient } from '../types';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const PaymentVerification: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>(dataService.getPayments());
  const pendingPayments = payments.filter(p => p.status === PaymentStatus.PENDIENTE);

  const handleStatusUpdate = (payment: PaymentRecord, status: PaymentStatus) => {
    dataService.updatePaymentStatus(payment.id, status);
    
    // Notify Representative about the verification status
    notificationService.sendNotification({
      title: `Estatus de Pago: ${status}`,
      message: `Su pago por ${payment.amount}$ (${payment.method}) ha sido ${status.toLowerCase()} por el departamento administrativo.`,
      category: NotificationCategory.VERIFICATION,
      recipient: NotificationRecipient.REPRESENTATIVE
    });

    setPayments(dataService.getPayments());
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Módulo de Verificación</h1>
          <p className="text-gray-500">Pagos de Oficina Virtual y transacciones electrónicas por verificar</p>
        </div>
        <div className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg font-bold border border-amber-200">
          {pendingPayments.length} Pendientes
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Representante / Matrícula</th>
              <th className="px-6 py-4">Fecha</th>
              <th className="px-6 py-4">Método</th>
              <th className="px-6 py-4">Referencia</th>
              <th className="px-6 py-4">Monto</th>
              <th className="px-6 py-4 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pendingPayments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  <CheckCircle size={48} className="mx-auto mb-3 opacity-20 text-green-600" />
                  No hay pagos pendientes por verificar.
                </td>
              </tr>
            ) : (
              pendingPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-800">C.I. {p.cedulaRepresentative}</p>
                    <p className="text-xs text-gray-400 font-mono">{p.matricula}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{p.paymentDate}</td>
                  <td className="px-6 py-4">
                    <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-xs font-bold uppercase">
                      {p.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-600">{p.reference || 'N/A'}</td>
                  <td className="px-6 py-4 font-bold text-blue-700">${p.amount.toFixed(2)}</td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => handleStatusUpdate(p, PaymentStatus.VERIFICADO)}
                        className="p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-600 hover:text-white transition-colors"
                        title="Aprobar"
                      >
                        <CheckCircle size={18} />
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(p, PaymentStatus.RECHAZADO)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-colors"
                        title="Rechazar"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
          <Clock size={20} className="text-gray-400" /> Historial Reciente de Verificación
        </h2>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm text-left opacity-80">
            <tbody className="divide-y divide-gray-100">
              {payments.filter(p => p.status !== PaymentStatus.PENDIENTE).slice(-10).reverse().map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-3 font-medium">{p.cedulaRepresentative}</td>
                  <td className="px-6 py-3">${p.amount}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      p.status === PaymentStatus.VERIFICADO ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right text-gray-400 text-xs">{p.timestamp}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PaymentVerification;
