
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
    const totalCollected = payments
      .filter(p => p.status === PaymentStatus.VERIFICADO)
      .reduce((acc, p) => acc + p.amount, 0);
    const pendingVerif = payments.filter(p => p.status === PaymentStatus.PENDIENTE).length;
    
    return {
      totalRepresentatives: reps.length,
      totalStudents,
      totalCollected,
      pendingVerif
    };
  }, [reps, payments]);

  const cards = [
    { label: 'Representantes', value: stats.totalRepresentatives, icon: Users, color: 'from-slate-700 to-slate-900' },
    { label: 'Alumnos Inscritos', value: stats.totalStudents, icon: School, color: 'from-blue-700 to-blue-900' },
    { label: 'Recaudación Total', value: `$${stats.totalCollected.toFixed(2)}`, icon: DollarSign, color: 'from-emerald-700 to-emerald-900' },
    { label: 'Pendientes', value: stats.pendingVerif, icon: Clock, color: 'from-amber-700 to-amber-900' },
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
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Panel de Control</h1>
          <p className="text-slate-500 font-medium">Estadísticas y administración del ciclo 2025-2026</p>
        </div>
        <div className="text-[10px] font-bold text-blue-700 bg-blue-100/50 px-4 py-1.5 rounded-full border border-blue-200 flex items-center gap-2 uppercase tracking-widest shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
          Terminal Activo
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="card-stylized p-6 rounded-2xl flex items-center gap-5 border border-white group hover:shadow-xl hover:translate-y-[-2px] transition-all">
              <div className={`bg-gradient-to-br ${card.color} p-4 rounded-xl text-white shadow-lg`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-black text-slate-900">{card.value}</p>
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
              Flujo de Pagos
            </h3>
            <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors">Ver todos</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-slate-400 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Referencia</th>
                  <th className="px-4 py-3">Monto</th>
                  <th className="px-4 py-3">Estatus</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payments.slice(-6).reverse().map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-4 py-4 text-slate-600 font-medium">{p.paymentDate}</td>
                    <td className="px-4 py-4 font-mono text-xs text-slate-400 group-hover:text-slate-900 transition-colors">{p.cedulaRepresentative}</td>
                    <td className="px-4 py-4 font-black text-slate-900">${p.amount.toFixed(2)}</td>
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
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs italic">Sin registros recientes</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-stylized p-6 rounded-2xl border border-white flex flex-col">
          <h3 className="font-black text-lg text-slate-800 mb-6 flex items-center gap-2">
            <Megaphone size={20} className="text-purple-600" />
            Emisión Push
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
            <button 
              type="submit"
              className="w-full button-metallic text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg flex items-center justify-center gap-3"
            >
              <Send size={16} /> Emitir Notificación
            </button>
            {sentStatus && (
              <p className="text-center text-[10px] text-emerald-600 font-black animate-bounce">
                ¡BROADCAST COMPLETADO!
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
