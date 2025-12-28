
import React, { useMemo, useState } from 'react';
import { dataService } from '../services/dataService';
import { notificationService } from '../services/notificationService';
import { TrendingUp, Users, DollarSign, Clock, School, Megaphone, Send } from 'lucide-react';
import { PaymentStatus, NotificationCategory, NotificationRecipient } from '../types';

const Dashboard: React.FC = () => {
  const reps = dataService.getRepresentatives();
  const payments = dataService.getPayments();
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });
  const [sentStatus, setSentStatus] = useState(false);

  const stats = useMemo(() => {
    const totalStudents = reps.reduce((acc, r) => acc + r.students.length, 0);
    const totalCollectedUSD = payments
      .filter(p => p.status === PaymentStatus.VERIFICADO)
      .reduce((acc, p) => acc + p.amount, 0);
    const pendingVerif = payments.filter(p => p.status === PaymentStatus.PENDIENTE).length;
    
    return {
      totalRepresentatives: reps.length,
      totalStudents,
      totalCollectedUSD,
      pendingVerif
    };
  }, [reps, payments]);

  const cards = [
    { label: 'Representantes', value: stats.totalRepresentatives, icon: Users, color: 'from-slate-700 to-slate-900', isCurrency: false },
    { label: 'Alumnos Inscritos', value: stats.totalStudents, icon: School, color: 'from-blue-700 to-blue-900', isCurrency: false },
    { label: 'Recaudación Total', value: stats.totalCollectedUSD, icon: DollarSign, color: 'from-emerald-700 to-emerald-900', isCurrency: true },
    { label: 'Pagos Pendientes', value: stats.pendingVerif, icon: Clock, color: 'from-amber-700 to-amber-900', isCurrency: false },
  ];

  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcement.title || !announcement.message) return;
    notificationService.sendNotification({
      title: announcement.title,
      message: announcement.message,
      category: NotificationCategory.ANNOUNCEMENT,
      recipient: NotificationRecipient.ALL
    });
    setSentStatus(true);
    setAnnouncement({ title: '', message: '' });
    setTimeout(() => setSentStatus(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Panel de Gestión</h1>
          <p className="text-slate-500 font-medium">Resumen administrativo Colegio Beltrán Prieto Figueroa</p>
        </div>
        <div className="text-[10px] font-bold text-emerald-700 bg-emerald-100/50 px-4 py-1.5 rounded-full border border-emerald-200 flex items-center gap-2 uppercase tracking-widest shadow-sm">
          Tasa BCV Activa
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="card-stylized p-6 rounded-2xl flex items-center gap-5 border border-white group hover:shadow-xl transition-all">
              <div className={`bg-gradient-to-br ${card.color} p-4 rounded-xl text-white shadow-lg`}>
                <Icon size={24} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{card.label}</p>
                {card.isCurrency ? (
                  <div className="space-y-0.5">
                    <p className="text-xl font-black text-slate-900">{dataService.formatCurrency(card.value as number, 'USD')}</p>
                    <p className="text-[11px] font-bold text-emerald-600">{dataService.formatCurrency(card.value as number, 'BS')}</p>
                  </div>
                ) : (
                  <p className="text-2xl font-black text-slate-900">{card.value}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-stylized p-6 rounded-2xl border border-white overflow-hidden">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-600" />
              Últimas Transacciones (Multimoneda)
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Referencia / CI</th>
                  <th className="px-4 py-3">Monto Total</th>
                  <th className="px-4 py-3">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payments.slice(-6).reverse().map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-4 text-slate-600 font-medium">{p.paymentDate}</td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-slate-900 text-xs">{p.cedulaRepresentative}</p>
                      <p className="text-[10px] text-slate-400">{p.method}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-black text-slate-900">{dataService.formatCurrency(p.amount, 'USD')}</p>
                      <p className="text-[10px] font-bold text-emerald-600">{dataService.formatCurrency(p.amount, 'BS')}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                        p.status === PaymentStatus.VERIFICADO ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                        p.status === PaymentStatus.PENDIENTE ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                        'bg-rose-100 text-rose-700 border border-rose-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-stylized p-6 rounded-2xl border border-white flex flex-col">
          <h3 className="font-black text-lg text-slate-800 mb-6 flex items-center gap-2">
            <Megaphone size={20} className="text-purple-600" />
            Emisión de Comunicados
          </h3>
          <form onSubmit={handleSendAnnouncement} className="space-y-5 flex-1">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Asunto</label>
              <input 
                type="text" 
                value={announcement.title}
                onChange={(e) => setAnnouncement({...announcement, title: e.target.value})}
                placeholder="Título del anuncio..."
                className="w-full px-4 py-3 bg-slate-100/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all shadow-inner"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Contenido</label>
              <textarea 
                value={announcement.message}
                onChange={(e) => setAnnouncement({...announcement, message: e.target.value})}
                placeholder="Mensaje detallado..."
                className="w-full px-4 py-3 bg-slate-100/50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all shadow-inner resize-none"
                rows={4}
              />
            </div>
            <button type="submit" className="w-full button-metallic text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-3">
              <Send size={16} /> Enviar Broadcast
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
