
import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../services/dataService';
import { notificationService } from '../services/notificationService';
import { PaymentRecord, PaymentStatus, NotificationCategory, NotificationRecipient, PaymentMethod, PaymentType } from '../types';
import { CheckCircle, XCircle, Clock, Globe, Smartphone, RefreshCw, AlertCircle } from 'lucide-react';

const PaymentVerification: React.FC = () => {
  const [internalPayments, setInternalPayments] = useState<PaymentRecord[]>([]);
  const [virtualPayments, setVirtualPayments] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const loadData = () => {
    setInternalPayments(dataService.getPayments());
    setVirtualPayments(dataService.getVirtualPayments());
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    await dataService.syncFromSheets();
    loadData();
    setIsSyncing(false);
  };

  const pendingCombined = useMemo(() => {
    // Pagos internos pendientes
    const internal = internalPayments
      .filter(p => p.status === PaymentStatus.PENDIENTE)
      .map(p => ({ ...p, source: 'INTERNO' }));

    // Pagos virtuales pendientes (suponiendo que la oficina virtual devuelve una lista)
    // Filtramos los que ya han sido 'nacionalizados' revisando referencias
    const existingRefs = new Set(internalPayments.map(p => p.reference));
    
    const virtual = virtualPayments
      .filter(vp => vp.status === 'Pendiente' || !vp.status)
      .filter(vp => !existingRefs.has(vp.reference))
      .map(vp => ({
        id: vp.id || `VIRT-${vp.reference}`,
        paymentDate: vp.paymentDate || vp.fecha || 'N/A',
        cedulaRepresentative: (vp.cedulaRepresentative || vp.cedula || '').toString(),
        method: vp.method || vp.metodo || 'Electrónico',
        reference: vp.reference || vp.referencia || '',
        amount: parseFloat(vp.amount || vp.monto || 0),
        status: PaymentStatus.PENDIENTE,
        source: 'VIRTUAL',
        raw: vp // guardamos original para debugging
      }));

    return [...internal, ...virtual];
  }, [internalPayments, virtualPayments]);

  const handleApprove = async (payment: any) => {
    if (payment.source === 'VIRTUAL') {
      // Si es virtual, debemos buscar al representante para completar los datos
      const rep = dataService.getRepresentativeByCedula(payment.cedulaRepresentative);
      
      const newPayment: Partial<PaymentRecord> = {
        cedulaRepresentative: payment.cedulaRepresentative,
        matricula: rep?.matricula || 'SIN_MATRICULA',
        level: rep?.students.map(s => s.level).join(', ') || 'Desconocido',
        sections: rep?.students.map(s => s.section).join(', ') || 'N/A',
        method: payment.method as any,
        amount: payment.amount,
        reference: payment.reference,
        status: PaymentStatus.VERIFICADO,
        type: PaymentType.PAGO_TOTAL,
        observations: 'Aprobado desde Oficina Virtual'
      };
      
      await dataService.addPayment(newPayment);
    } else {
      // Si es interno, solo actualizamos estatus
      await dataService.updatePaymentStatus(payment.id, PaymentStatus.VERIFICADO);
    }

    notificationService.sendNotification({
      title: `Pago Verificado`,
      message: `El pago por ${payment.amount}$ (${payment.reference}) ha sido verificado y abonado satisfactoriamente.`,
      category: NotificationCategory.VERIFICATION,
      recipient: NotificationRecipient.REPRESENTATIVE
    });

    loadData();
  };

  const handleReject = async (payment: any) => {
    if (payment.source === 'INTERNO') {
      await dataService.updatePaymentStatus(payment.id, PaymentStatus.RECHAZADO);
    }
    // Para virtuales, simplemente se ignoran o se podrían marcar en el futuro
    
    notificationService.sendNotification({
      title: `Pago Rechazado`,
      message: `El pago por ${payment.amount}$ (${payment.reference}) fue rechazado por inconsistencias.`,
      category: NotificationCategory.VERIFICATION,
      recipient: NotificationRecipient.REPRESENTATIVE
    });
    
    loadData();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centro de Verificación</h1>
          <p className="text-slate-500 font-medium text-sm">Validación multicanal: Oficina Virtual + App Administrativa</p>
        </div>
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          Sincronizar Bases de Datos
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
                <th className="px-6 py-4 text-center">Gestión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pendingCombined.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                      <CheckCircle size={48} className="text-emerald-500" />
                      <p className="font-bold text-slate-500 uppercase tracking-widest">No hay conciliaciones pendientes</p>
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
                        {dataService.getRepresentativeByCedula(p.cedulaRepresentative)?.name || 'Externo'}
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
                          title="Aprobar y Abonar"
                        >
                          <CheckCircle size={18} />
                        </button>
                        <button 
                          onClick={() => handleReject(p)}
                          className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm hover:shadow-rose-200 active:scale-90"
                          title="Rechazar Pago"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xl flex items-start gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="font-black text-slate-800 text-sm uppercase tracking-tight">Protocolo de Oficina Virtual</h4>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Los pagos registrados vía web que NO tengan un representante asociado en esta app aparecerán como "Externos". Se recomienda registrar al alumno antes de verificar su primer pago virtual.
            </p>
          </div>
        </div>
        
        <div className="bg-slate-900 p-6 rounded-3xl shadow-xl flex items-start gap-4 text-white">
          <div className="p-3 bg-blue-600/20 text-blue-400 rounded-2xl">
            <Smartphone size={24} />
          </div>
          <div>
            <h4 className="font-black text-blue-400 text-sm uppercase tracking-tight">Seguridad de Abonos</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Al hacer clic en el check verde, el sistema genera automáticamente un registro de pago oficial en la base de datos de administración y descuenta el monto de la deuda del representante.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentVerification;
