
import React, { useState } from 'react';
import { dataService } from '../services/dataService';
import { pdfService } from '../services/pdfService';
import { FileDown, Search, Filter, Calendar, CheckSquare, Square, Layers, BookOpen } from 'lucide-react';
import { PaymentStatus, PaymentRecord, Level } from '../types';
import { SECTIONS } from '../constants';

const Reports: React.FC = () => {
  const [filter, setFilter] = useState({
    cedula: '',
    startDate: '',
    endDate: '',
    solvencyStatus: 'ALL', // ALL, Solvente, Moroso
    verificationStatuses: [] as PaymentStatus[], // Multi-select
    level: 'ALL',
    section: 'ALL'
  });

  const toggleVerificationStatus = (status: PaymentStatus) => {
    setFilter(prev => ({
      ...prev,
      verificationStatuses: prev.verificationStatuses.includes(status)
        ? prev.verificationStatuses.filter(s => s !== status)
        : [...prev.verificationStatuses, status]
    }));
  };

  const handleExportPayments = () => {
    let payments = dataService.getPayments();

    if (filter.cedula) {
      payments = payments.filter(p => p.cedulaRepresentative.includes(filter.cedula));
    }
    if (filter.startDate) {
      payments = payments.filter(p => p.paymentDate >= filter.startDate);
    }
    if (filter.endDate) {
      payments = payments.filter(p => p.paymentDate <= filter.endDate);
    }
    if (filter.verificationStatuses.length > 0) {
      payments = payments.filter(p => filter.verificationStatuses.includes(p.status));
    }
    if (filter.level !== 'ALL') {
      payments = payments.filter(p => p.level.includes(filter.level));
    }
    if (filter.section !== 'ALL') {
      payments = payments.filter(p => p.sections && p.sections.includes(filter.section));
    }

    const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);

    const headers = ['ID', 'Fecha', 'Cédula', 'Método', 'Monto', 'Estado'];
    const data = payments.map(p => [
      p.id,
      p.paymentDate,
      p.cedulaRepresentative,
      p.method,
      `$${p.amount.toFixed(2)}`,
      p.status
    ]);

    // Footer summary row
    const footer = [
      ['', '', '', 'TOTAL RECAUDADO:', `$${totalCollected.toFixed(2)}`, '']
    ];

    pdfService.generateReport(
      'Reporte Detallado de Pagos',
      headers,
      data,
      `reporte-pagos-${new Date().getTime()}`,
      footer
    );
  };

  const handleExportSolvency = () => {
    const reps = dataService.getRepresentatives();
    let ledger = reps.map(r => {
      const balance = dataService.calculatePendingBalance(r.cedula);
      return {
        ...r,
        balance,
        status: balance > 0 ? 'Moroso' : 'Solvente'
      };
    });

    // Apply Filters
    if (filter.solvencyStatus !== 'ALL') {
      ledger = ledger.filter(l => l.status === filter.solvencyStatus);
    }
    if (filter.level !== 'ALL') {
      ledger = ledger.filter(l => l.students.some(s => s.level === filter.level));
    }
    if (filter.section !== 'ALL') {
      ledger = ledger.filter(l => l.students.some(s => s.section === filter.section));
    }

    const headers = ['Nombre', 'Cédula', 'Matrícula', 'Saldo', 'Estado', 'Alumnos/Secciones'];
    const data = ledger.map(l => [
      l.name,
      l.cedula,
      l.matricula,
      `$${l.balance.toFixed(2)}`,
      l.status,
      l.students.map(s => `${s.name} (${s.section})`).join(', ')
    ]);

    pdfService.generateReport(
      'Reporte de Solvencia Académica',
      headers,
      data,
      `reporte-solvencia-${new Date().getTime()}`
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <div className="bg-slate-900 p-2 rounded-xl text-white shadow-lg">
          <FileDown size={24} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Centro de Reportes</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Report 1: Payments */}
        <div className="card-stylized p-8 rounded-2xl border border-white space-y-6 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
              <Calendar size={20} className="text-blue-500" />
              Relación de Pagos
            </h3>
            <span className="text-[10px] bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-blue-200">PDF</span>
          </div>
          
          <div className="space-y-4 flex-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desde</label>
                <input 
                  type="date" 
                  className="w-full text-xs border border-slate-200 p-3 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-blue-500" 
                  onChange={(e) => setFilter({...filter, startDate: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hasta</label>
                <input 
                  type="date" 
                  className="w-full text-xs border border-slate-200 p-3 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-blue-500" 
                  onChange={(e) => setFilter({...filter, endDate: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtrar por Cédula</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-slate-300" size={14} />
                <input 
                  type="text" 
                  className="w-full pl-9 pr-4 py-3 text-xs border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-blue-500" 
                  placeholder="ID del representante..."
                  onChange={(e) => setFilter({...filter, cedula: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Layers size={10} /> Nivel
                </label>
                <select 
                  className="w-full text-xs border border-slate-200 p-3 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setFilter({...filter, level: e.target.value})}
                  value={filter.level}
                >
                  <option value="ALL">Todos</option>
                  {Object.values(Level).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <BookOpen size={10} /> Sección
                </label>
                <select 
                  className="w-full text-xs border border-slate-200 p-3 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => setFilter({...filter, section: e.target.value})}
                  value={filter.section}
                >
                  <option value="ALL">Todas</option>
                  {SECTIONS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estados de Verificación</label>
              <div className="flex flex-wrap gap-2">
                {Object.values(PaymentStatus).map(status => (
                  <button
                    key={status}
                    onClick={() => toggleVerificationStatus(status)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold transition-all border ${
                      filter.verificationStatuses.includes(status)
                        ? 'bg-blue-600 text-white border-blue-700 shadow-md scale-95'
                        : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {filter.verificationStatuses.includes(status) ? <CheckSquare size={12} /> : <Square size={12} />}
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button 
            onClick={handleExportPayments}
            className="w-full button-metallic text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all"
          >
            <FileDown size={18} /> Descargar Reporte de Pagos
          </button>
        </div>

        {/* Report 2: Solvency */}
        <div className="card-stylized p-8 rounded-2xl border border-white space-y-6 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-lg text-slate-800 flex items-center gap-2">
              <Filter size={20} className="text-emerald-500" />
              Estado de Solvencia
            </h3>
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-black uppercase tracking-widest border border-emerald-200">PDF</span>
          </div>
          
          <div className="space-y-6 flex-1">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filtro por Estado</label>
              <div className="flex gap-4">
                {['ALL', 'Solvente', 'Moroso'].map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setFilter({...filter, solvencyStatus: opt})}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold transition-all border ${
                      filter.solvencyStatus === opt
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt === 'ALL' ? 'Todos' : opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Layers size={10} /> Filtrar por Nivel
                </label>
                <select 
                  className="w-full text-xs border border-slate-200 p-3 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-emerald-500"
                  onChange={(e) => setFilter({...filter, level: e.target.value})}
                  value={filter.level}
                >
                  <option value="ALL">Todos los Niveles</option>
                  {Object.values(Level).map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <BookOpen size={10} /> Filtrar por Sección Académica
                </label>
                <select 
                  className="w-full text-xs border border-slate-200 p-3 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-emerald-500"
                  onChange={(e) => setFilter({...filter, section: e.target.value})}
                  value={filter.section}
                >
                  <option value="ALL">Todas las Secciones</option>
                  {SECTIONS.map(sec => <option key={sec} value={sec}>{sec}</option>)}
                </select>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl">
              <p className="text-[10px] text-emerald-800 font-medium leading-relaxed">
                Este reporte genera un listado de los representantes legales, indicando el total de su deuda acumulada y si se encuentran solventes para el mes en curso.
              </p>
            </div>
          </div>

          <button 
            onClick={handleExportSolvency}
            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg flex items-center justify-center gap-3 active:scale-95 transition-all hover:from-emerald-500 hover:to-emerald-600"
          >
            <FileDown size={18} /> Descargar Listado de Solvencia
          </button>
        </div>
      </div>
    </div>
  );
};

export default Reports;
