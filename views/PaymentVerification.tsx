
import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { notificationService } from '../services/notificationService';
import { PaymentRecord, PaymentStatus, NotificationCategory, NotificationRecipient, PaymentType } from '../types';
import { CheckCircle, XCircle, Globe, Smartphone, RefreshCw, AlertTriangle } from 'lucide-react';

const PaymentVerification: React.FC = () => {
  const [internalPayments, setInternalPayments] = useState<PaymentRecord[]>([]);
  const [virtualPayments, setVirtualPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = () => {
    setInternalPayments(dataService.getPayments());
    setVirtualPayments(dataService.getVirtualPayments());
  };

  const handleSync = async () => {
    setLoading(true);
    await dataService.syncFromSheets();
    loadData();
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    handleSync();
  }, []);

  const parseAmount = (val: any) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    
    let str = val.toString().trim();
    if (!str.match(/\d/)) return 0;

    str = str.replace(/[^\d.,-]/g, '');

    if (str.includes(',') && (!str.includes('.') || str.indexOf(',') > str.indexOf('.'))) {
        str = str.replace(/\./g, '');
        str = str.replace(',', '.');
    } else {
        str = str.replace(/,/g, '');
    }

    return parseFloat(str) || 0;
  };

  const pendingCombined = useMemo(() => {
    // 1. Pagos internos
    const internal = internalPayments
      .filter(p => p.status === PaymentStatus.PENDIENTE)
      .map(p => ({ ...p, source: 'INTERNO', rowIndex: -1 }));

    // 2. Pagos virtuales (Filtramos los que ya devuelve el backend como NO procesados)
    const virtual = virtualPayments.map(vp => {
        const rawAmount = vp.amount || vp.monto || vp.importe || '0';
        const parsedAmount = parseAmount(rawAmount);

        return {
          id: vp.id || `VIRT-${(vp.reference || 'NOREFERENCE')}`,
          paymentDate: vp.paymentDate || vp.fecha || new Date().toISOString().split('T')[0],
          cedulaRepresentative: (vp.cedulaRepresentative || vp.cedula || 'S/I').toString(),
          method: vp.method || vp.metodo || 'Pago Móvil',
          reference: (vp.reference || vp.referencia || 'S/R').toString(),
          amount: parsedAmount,
          status: PaymentStatus.PENDIENTE,
          source: 'VIRTUAL',
          rowIndex: vp._rowIndex, // Índice de fila para actualizar el Excel
          raw: vp 
        };
      });

    return [...internal, ...virtual];
  }, [internalPayments, virtualPayments]);

  const handleApprove = async (payment: any) => {
    setLoading(true);
    
    if (payment.source === 'VIRTUAL') {
      const rep = dataService.getRepresentativeByCedula(payment.cedulaRepresentative);
      
      // 1. Crear el pago oficial en la BD principal
      const newPayment: Partial<PaymentRecord> = {
        cedulaRepresentative: payment.cedulaRepresentative,
        matricula: rep?.matricula || 'SIN_MATRICULA',
        level: rep?.students?.map((s:any) => s.level).join(', ') || 'Desconocido',
        sections: rep?.students?.map((s:any) => s.section).join(', ') || 'N/A',
        method: payment.method as any,
        amount: payment.amount,
        reference: payment.reference,
        status: PaymentStatus.VERIFICADO,
        type: PaymentType.PAGO_TOTAL,
        observations: 'Verificado desde Oficina Virtual'
      };
      
      await dataService.addPayment(newPayment);

      // 2. Marcar en la hoja de Oficina Virtual como PROCESADO para que no salga más
      if (payment.rowIndex && payment.rowIndex > 0) {
        await dataService.markVirtualProcessed(payment.rowIndex, 'PROCESADO');
      }

    } else {
      await dataService.updatePaymentStatus(payment.id, PaymentStatus.VERIFICADO);
    }

    notificationService.sendNotification({
      title: `Pago Aprobado`,
      message: `Monto: ${payment.amount}$ - Ref: ${payment.reference}`,
      category: NotificationCategory.VERIFICATION,
      recipient: NotificationRecipient.REPRESENTATIVE
    });

    // Refrescar lista completa
    await handleSync();
  };

  const handleReject = async (payment: any) => {
    setLoading(true);
    if (payment.source === 'INTERNO') {
      await dataService.updatePaymentStatus(payment.id, PaymentStatus.RECHAZADO);
    } else {
      // 1. Crear registro de rechazo en BD Principal (opcional, para historial)
      const rep = dataService.getRepresentativeByCedula(payment.cedulaRepresentative);
      const rejectionRecord: Partial<PaymentRecord> = {
        cedulaRepresentative: payment.cedulaRepresentative,
        matricula: rep?.matricula || 'SIN_MATRICULA',
        level: 'N/A',
        sections: 'N/A',
        method: payment.method as any,
        amount: payment.amount,
        reference: payment.reference,
        status: PaymentStatus.RECHAZADO,
        type: PaymentType.PAGO_TOTAL,
        observations: 'Rechazado desde Oficina Virtual'
      };
      await dataService.addPayment(rejectionRecord);

      // 2. Marcar en hoja virtual como RECHAZADO para quitarlo de la lista pendiente
      if (payment.rowIndex && payment.rowIndex > 0) {
        await dataService.markVirtualProcessed(payment.rowIndex, 'RECHAZADO_SISTEMA');
      }
    }
    
    notificationService.sendNotification({
      title: `Pago Rechazado`,
      message: `El pago Ref: ${payment.reference} no pudo ser conciliado.`,
      category: NotificationCategory.VERIFICATION,
      recipient: NotificationRecipient.REPRESENTATIVE
    });
    
    await handleSync();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centro de Verificación</h1>
          <p className="text-slate-500 font-medium text-sm">Validación de pagos virtuales y taquilla</p>
        </div>
        <button 
          onClick={handleSync} 
          disabled={loading}
          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          title="Refrescar datos de la nube"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
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
                      <p className="text-blue-600 font-black text-[10px] uppercase truncate max-w-[120px]">{p.method}</p>
                      <p className="font-mono text-xs text-slate-400">Ref: {p.reference}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        {p.amount === 0 ? (
                           <span className="flex items-center gap-1 text-amber-600 text-xs font-bold bg-amber-50 px-2 py-1 rounded-md">
                             <AlertTriangle size={10} /> Revisar
                           </span>
                        ) : (
                          <>
                            <p className="font-black text-slate-900 text-base">{dataService.formatCurrency(p.amount, 'USD')}</p>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">
                              {dataService.formatCurrency(p.amount, 'BS')}
                            </p>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleApprove(p)}
                          className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm hover:shadow-emerald-200 active:scale-90 disabled:opacity-50"
                          title="Verificar, Guardar y Cerrar en Virtual"
                          disabled={loading}
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleReject(p)}
                          className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm hover:shadow-rose-200 active:scale-90 disabled:opacity-50"
                          title="Rechazar"
                          disabled={loading}
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
