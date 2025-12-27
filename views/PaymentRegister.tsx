
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { notificationService } from '../services/notificationService';
import { Representative, PaymentMethod, PaymentType, PaymentStatus, Level, NotificationCategory, NotificationRecipient } from '../types';
import { CreditCard, Search, DollarSign, Info } from 'lucide-react';

const PaymentRegister: React.FC = () => {
  const [searchCedula, setSearchCedula] = useState('');
  const [rep, setRep] = useState<Representative | null>(null);
  const [pendingBalance, setPendingBalance] = useState(0);
  
  const [formData, setFormData] = useState({
    method: PaymentMethod.EFECTIVO_USD,
    amount: '',
    reference: '',
    observations: '',
    type: PaymentType.PAGO_TOTAL
  });

  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSearch = () => {
    const found = dataService.getRepresentativeByCedula(searchCedula);
    if (found) {
      setRep(found);
      const balance = dataService.calculatePendingBalance(found.cedula);
      setPendingBalance(balance);
      setFormData(prev => ({ ...prev, amount: balance.toString() }));
      setMessage(null);
    } else {
      setRep(null);
      setMessage({ text: 'Representante no encontrado.', type: 'error' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rep) return;

    const amountNum = parseFloat(formData.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setMessage({ text: 'Monto inválido.', type: 'error' });
      return;
    }

    const autoVerified = [
      PaymentMethod.EFECTIVO_BS, 
      PaymentMethod.EFECTIVO_USD, 
      PaymentMethod.EFECTIVO_EUR,
      PaymentMethod.TDC,
      PaymentMethod.TDD
    ].includes(formData.method);

    const newPayment = dataService.addPayment({
      cedulaRepresentative: rep.cedula,
      matricula: rep.matricula,
      level: rep.students.map(s => s.level).join(', '),
      sections: rep.students.map(s => s.section).join(', '),
      method: formData.method,
      amount: amountNum,
      reference: formData.reference,
      observations: formData.observations,
      type: formData.type,
      status: autoVerified ? PaymentStatus.VERIFICADO : PaymentStatus.PENDIENTE,
      pendingBalance: Math.max(0, pendingBalance - amountNum)
    });

    // Notify Admins about the new payment
    notificationService.sendNotification({
      title: `Pago Recibido: ${rep.name}`,
      message: `Se ha registrado un pago por ${amountNum}$ mediante ${formData.method}. ${autoVerified ? 'Verificado.' : 'Requiere Verificación.'}`,
      category: NotificationCategory.PAYMENT,
      recipient: NotificationRecipient.ADMIN
    });

    setMessage({ 
      text: `Pago registrado correctamente. ${autoVerified ? 'Verificado automáticamente.' : 'Pendiente por verificación.'}`, 
      type: 'success' 
    });
    
    setPendingBalance(Math.max(0, pendingBalance - amountNum));
    setFormData(prev => ({ ...prev, amount: '', reference: '', observations: '' }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <CreditCard className="text-blue-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-800">Caja y Registro de Pagos</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <label className="block text-sm font-medium text-gray-600 mb-2">Buscar Representante por Cédula</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input 
              type="text" 
              value={searchCedula}
              onChange={(e) => setSearchCedula(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ingrese C.I. del representante"
            />
          </div>
          <button 
            onClick={handleSearch}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
          >
            Buscar
          </button>
        </div>
      </div>

      {rep && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <h3 className="text-blue-800 font-bold mb-4 flex items-center gap-2">
                <Info size={18} /> Datos del Alumno
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-blue-600 font-bold text-xs uppercase">Representante</p>
                  <p className="font-semibold text-gray-800">{rep.name}</p>
                </div>
                <div>
                  <p className="text-blue-600 font-bold text-xs uppercase">Matrícula</p>
                  <p className="font-mono text-gray-800">{rep.matricula}</p>
                </div>
                <div>
                  <p className="text-blue-600 font-bold text-xs uppercase">Alumnos</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {rep.students.map((s, i) => (
                      <li key={i}>{s.name} <span className="text-gray-400 text-xs">({s.level} - {s.section})</span></li>
                    ))}
                  </ul>
                </div>
                <div className="pt-4 border-t border-blue-200">
                  <p className="text-blue-600 font-bold text-xs uppercase">Saldo Pendiente</p>
                  <p className="text-2xl font-black text-blue-900">${pendingBalance.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Método de Pago</label>
                <select 
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value as PaymentMethod })}
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <optgroup label="Electrónico (Requiere Verificación)">
                    <option value={PaymentMethod.PAGO_MOVIL}>{PaymentMethod.PAGO_MOVIL}</option>
                    <option value={PaymentMethod.TRANSFERENCIA}>{PaymentMethod.TRANSFERENCIA}</option>
                    <option value={PaymentMethod.ZELLE}>{PaymentMethod.ZELLE}</option>
                  </optgroup>
                  <optgroup label="Taquilla (Verificación Instantánea)">
                    <option value={PaymentMethod.EFECTIVO_USD}>{PaymentMethod.EFECTIVO_USD}</option>
                    <option value={PaymentMethod.EFECTIVO_BS}>{PaymentMethod.EFECTIVO_BS}</option>
                    <option value={PaymentMethod.EFECTIVO_EUR}>{PaymentMethod.EFECTIVO_EUR}</option>
                    <option value={PaymentMethod.TDC}>{PaymentMethod.TDC}</option>
                    <option value={PaymentMethod.TDD}>{PaymentMethod.TDD}</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Tipo de Pago</label>
                <select 
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as PaymentType })}
                  className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={PaymentType.PAGO_TOTAL}>Pago Total</option>
                  <option value={PaymentType.ABONO}>Abono (Parcial)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Monto ($)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-400 font-bold">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Referencia</label>
                <input 
                  type="text" 
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Número de confirmación"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Observaciones</label>
              <textarea 
                value={formData.observations}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                rows={2}
                placeholder="Notas adicionales..."
              />
            </div>

            <button 
              type="submit"
              className="w-full flex justify-center items-center gap-2 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 shadow-md transition-all active:scale-95"
            >
              <DollarSign size={20} /> Procesar Pago
            </button>
          </div>
        </form>
      )}

      {message && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-3 ${
          message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.type === 'success' ? '✅' : '❌'} {message.text}
        </div>
      )}
    </div>
  );
};

export default PaymentRegister;
