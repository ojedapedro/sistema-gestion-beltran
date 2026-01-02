
import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { notificationService } from '../services/notificationService';
import { PaymentRecord, PaymentStatus, NotificationCategory, NotificationRecipient, PaymentType } from '../types';
import { CheckCircle, XCircle, Globe, Smartphone } from 'lucide-react';

const PaymentVerification: React.FC = () => {
  const [internalPayments, setInternalPayments] = useState<PaymentRecord[]>([]);
  const [virtualPayments, setVirtualPayments] = useState<any[]>([]);

  const loadData = () => {
    setInternalPayments(dataService.getPayments());
    setVirtualPayments(dataService.getVirtualPayments());
  };

  useEffect(() => {
    // Carga inicial y auto-refresco silencioso
    loadData();
    dataService.syncFromSheets().then(() => loadData());
  }, []);

  const pendingCombined = useMemo(() => {
    // 1. Pagos internos pendientes
    const internal = internalPayments
      .filter(p => p.status === PaymentStatus.PENDIENTE)
      .map(p => ({ ...p, source: 'INTERNO' }));

    // 2. Identificar referencias que YA han sido procesadas (Verificadas O Rechazadas)
    const processedRefs = new Set(internalPayments
      .filter(p => p.status === PaymentStatus.VERIFICADO || p.status === PaymentStatus.RECHAZADO)
      .map(p => p.reference.toString().trim().toLowerCase())
    );
    
    // 3. Pagos virtuales pendientes
    const virtual = virtualPayments
      .filter(vp => {
        // Normalización de estatus (la hoja puede tener 'Pendiente', vacío o null)
        const status = vp.status || vp.estatus || 'Pendiente';
        return status === 'Pendiente';
      })
      .filter(vp => {
        const ref = (vp.reference || vp.referencia || '').toString().trim().toLowerCase();
        if (!ref) return true;
        // Ocultamos si ya está en la lista de PROCESADOS
        return !processedRefs.has(ref);
      })
      .map(vp => ({
        id: vp.id || `VIRT-${vp.reference || vp.referencia || Date.now()}`,
        paymentDate: vp.paymentDate || vp.fecha || new Date().toISOString().split('T')[0],
        cedulaRepresentative: (vp.cedulaRepresentative || vp.cedula || '').toString(),
        method: vp.method || vp.metodo || 'Pago Móvil',
        reference: (vp.reference || vp.referencia || 'S/R').toString(),
        amount: parseFloat(vp.amount || vp.monto || 0),
        status: PaymentStatus.PENDIENTE,
        source: 'VIRTUAL',
        raw: vp 
      }));

    return [...internal, ...virtual];
  }, [internalPayments, virtualPayments]);

  const handleApprove = async (payment: any) => {
    if (payment.source === 'VIRTUAL') {
      const rep = dataService.getRepresentativeByCedula(payment.cedulaRepresentative);
      
      const newPayment: Partial<PaymentRecord> = {
        cedulaRepresentative: payment.cedulaRepresentative,
        matricula: rep?.matricula || 'SIN_MATRICULA',
        level: rep?.students.map((s:any) => s.level).join(', ') || 'Desconocido',
        sections: rep?.students.map((s:any) => s.section).join(', ') || 'N/A',
        method: payment.method as any,
        amount: payment.amount,
        reference: payment.reference,
        status: PaymentStatus.VERIFICADO,
        type: PaymentType.PAGO_TOTAL,
        observations: 'Verificado desde Oficina Virtual'
      };
      
      await dataService.addPayment(newPayment);
    } else {
      await dataService.updatePaymentStatus(payment.id, PaymentStatus.VERIFICADO);
    }

    notificationService.sendNotification({
      title: `Pago Verificado`,
      message: `El pago por ${payment.amount}$ (Ref: ${payment.reference}) ha sido verificado y conciliado.`,
      category: NotificationCategory.VERIFICATION,
      recipient: NotificationRecipient.REPRESENTATIVE
    });

    // Pequeño delay para permitir que la API responda antes de recargar
    setTimeout(async () => {
      await dataService.syncFromSheets();
      loadData();
    }, 500);
  };

  const handleReject = async (payment: any) => {
    if (payment.source === 'INTERNO') {
      await dataService.updatePaymentStatus(payment.id, PaymentStatus.RECHAZADO);
    } else {
      const rep = dataService.getRepresentativeByCedula(payment.cedulaRepresentative);
      
      const rejectionRecord: Partial<PaymentRecord> = {
        cedulaRepresentative: payment.cedulaRepresentative,
        matricula: rep?.matricula || 'SIN_MATRICULA',
        level: rep?.students.map((s:any) => s.level).join(', ') || 'N/A',
        sections: rep?.students.map((s:any) => s.section).join(', ') || 'N/A',
        method: payment.method as any,
        amount: payment.amount,
        reference: payment.reference,
        status: PaymentStatus.RECHAZADO,
        type: PaymentType.PAGO_TOTAL,
        observations: 'Rechazado desde Validación Virtual'
      };
      
      await dataService.addPayment(rejectionRecord);
    }
    
    notificationService.sendNotification({
      title: `Pago Rechazado`,
      message: `El pago por ${payment.amount}$ (Ref: ${payment.reference}) presenta inconsistencias.`,
      category: NotificationCategory.VERIFICATION,
      recipient: NotificationRecipient.REPRESENTATIVE
    });
    
    setTimeout(async () => {
      await dataService.syncFromSheets();
      loadData();
    }, 500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centro de Verificación</h1>
          <p className="text-slate-500 font-medium text-sm">Validación unificada de transacciones</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden card-stylized">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Origen</th>
                <th className="px-6 py-4">Representante</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Detalles</th>
                <th className="px-6 py-4">Monto</th>
                <th className="px-6 py-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pendingCombined.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                      <CheckCircle size={48} className="text-emerald-500" />
                      <p className="font-bold text-slate-500 uppercase tracking-widest">Todo conciliado</p>
                      <p className="text-xs">No hay pagos pendientes de verificación</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pendingCombined.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[9px] font-black uppercase border w-fit ${
                        p.source === 'VIRTUAL' 
                        ? 'bg-purple-50 text-purple-700 border-purple-100' 
                        : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {p.source === 'VIRTUAL' ? <Globe size={10} /> : <Smartphone size={10} />}
                        {p.source}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-black text-slate-900">C.I. {p.cedulaRepresentative}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                        {dataService.getRepresentativeByCedula(p.cedulaRepresentative)?.name || 'Usuario Externo'}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium text-xs">{p.paymentDate}</td>
                    <td className="px-6 py-4">
                      <p className="text-blue-600 font-black text-[10px] uppercase">{p.method}</p>
                      <p className="font-mono text-xs text-slate-400">Ref: {p.reference}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-black text-slate-900 text-base">{dataService.formatCurrency(p.amount, 'USD')}</p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">
                        {dataService.formatCurrency(p.amount, 'BS')}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleApprove(p)}
                          className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm hover:shadow-emerald-200 active:scale-90"
                          title="Verificar y Abonar"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleReject(p)}
                          className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm hover:shadow-rose-200 active:scale-90"
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
      </div>
    </div>
  );
};

export default PaymentVerification;
