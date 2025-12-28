
import React, { useState, useEffect } from 'react';
import { dataService } from '../services/dataService';
import { AppConfig, Level } from '../types';
import { Settings, DollarSign, TrendingUp, Save, RefreshCw, School } from 'lucide-react';

const Config: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(dataService.getConfig());
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleLevelPriceChange = (level: Level, value: string) => {
    const numValue = parseFloat(value);
    setConfig(prev => ({
      ...prev,
      monthlyFees: {
        ...prev.monthlyFees,
        [level]: isNaN(numValue) ? 0 : numValue
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const newConfig = { ...config, lastUpdated: new Date().toISOString() };
      await dataService.saveConfig(newConfig);
      setMessage({ text: 'Configuración guardada y sincronizada correctamente.', type: 'success' });
    } catch (error) {
      setMessage({ text: 'Error al sincronizar con el servidor.', type: 'error' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-slate-900 p-2 rounded-xl text-white shadow-lg">
            <Settings size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuración del Sistema</h1>
            <p className="text-slate-500 text-sm">Gestiona montos educativos y parámetros financieros</p>
          </div>
        </div>
        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
          Última actualización: {new Date(config.lastUpdated).toLocaleString()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Tasa de Cambio */}
        <section className="card-stylized p-8 rounded-2xl border border-white space-y-6">
          <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp size={16} /> Tasa de Cambio del Día
          </h3>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200/60 text-center space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equivalencia 1 USD a BS</p>
            <div className="relative max-w-[200px] mx-auto">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">Bs.</span>
              <input 
                type="number" 
                step="0.01"
                value={config.exchangeRate}
                onChange={(e) => setConfig({...config, exchangeRate: parseFloat(e.target.value) || 0})}
                className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none text-2xl font-black text-slate-900 transition-all text-center"
              />
            </div>
            <p className="text-[9px] text-slate-400 italic">Esta tasa se aplicará a todos los cálculos de saldo pendiente y reportes actuales.</p>
          </div>
        </section>

        {/* Info Colegio */}
        <section className="card-stylized p-8 rounded-2xl border border-white space-y-6">
          <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest flex items-center gap-2">
            <School size={16} /> Identidad Institucional
          </h3>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Plantel</label>
              <input 
                type="text" 
                value={config.schoolName}
                onChange={(e) => setConfig({...config, schoolName: e.target.value})}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm transition-all"
              />
            </div>
            <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl text-[10px] text-purple-700 font-medium">
              El nombre aparecerá en todos los reportes PDF generados por el sistema.
            </div>
          </div>
        </section>
      </div>

      {/* Montos por Nivel */}
      <section className="card-stylized p-8 rounded-2xl border border-white space-y-8">
        <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
          <DollarSign size={16} /> Costo de Mensualidades (USD)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.values(Level).map((lvl) => (
            <div key={lvl} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-200/60 space-y-3 group hover:border-emerald-200 transition-all">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{lvl}</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 font-bold">$</span>
                <input 
                  type="number" 
                  value={config.monthlyFees[lvl]}
                  onChange={(e) => handleLevelPriceChange(lvl, e.target.value)}
                  className="w-full pl-7 pr-3 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-lg font-black text-slate-800 transition-all"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-black uppercase tracking-widest text-center animate-in zoom-in-95 duration-300 ${message.type === 'success' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
          {message.text}
        </div>
      )}

      <div className="flex justify-center">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="button-metallic text-white px-12 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-xl flex items-center gap-4 disabled:opacity-50"
        >
          {isSaving ? <RefreshCw size={20} className="animate-spin" /> : <Save size={20} />}
          {isSaving ? 'Sincronizando...' : 'Guardar Configuración Global'}
        </button>
      </div>
    </div>
  );
};

export default Config;
