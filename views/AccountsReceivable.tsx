
import React, { useMemo } from 'react';
import { dataService } from '../services/dataService';
// Added Info to the imports from lucide-react
import { BookOpen, AlertCircle, ShieldCheck, Info } from 'lucide-react';

const AccountsReceivable: React.FC = () => {
  const reps = dataService.getRepresentatives();
  
  const ledger = useMemo(() => {
    return reps.map(r => {
      const balance = dataService.calculatePendingBalance(r.cedula);
      return {
        ...r,
        pendingBalance: balance,
        status: balance > 0 ? 'Moroso' : 'Solvente'
      };
    });
  }, [reps]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Libro de Cuentas por Cobrar</h1>
          <p className="text-gray-500">Balance acumulado y estado de solvencia por representante</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Representante</th>
              <th className="px-6 py-4">Matrícula</th>
              <th className="px-6 py-4">Alumnos</th>
              <th className="px-6 py-4">Niveles</th>
              <th className="px-6 py-4">Saldo Pendiente</th>
              <th className="px-6 py-4">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ledger.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                  No hay representantes registrados.
                </td>
              </tr>
            ) : (
              ledger.map((entry) => (
                <tr key={entry.cedula} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-800">{entry.name}</p>
                    <p className="text-xs text-gray-400">C.I. {entry.cedula}</p>
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-500 text-xs">{entry.matricula}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5">
                      {entry.students.map((s, idx) => (
                        <span key={idx} className="text-xs text-gray-700">• {s.name}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {Array.from(new Set(entry.students.map(s => s.level))).map(lvl => (
                        <span key={lvl} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          {lvl}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className={`font-black text-lg ${entry.pendingBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${entry.pendingBalance.toFixed(2)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold w-fit ${
                      entry.status === 'Solvente' 
                        ? 'bg-green-100 text-green-700 border border-green-200' 
                        : 'bg-red-100 text-red-700 border border-red-200'
                    }`}>
                      {entry.status === 'Solvente' ? <ShieldCheck size={14} /> : <AlertCircle size={14} />}
                      {entry.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 flex items-start gap-3">
        <Info className="text-blue-600 mt-1" size={20} />
        <p className="text-sm text-blue-800">
          <strong>Aviso:</strong> El saldo pendiente se calcula mensualmente de forma acumulativa sumando las cuotas correspondientes a cada nivel escolar desde el inicio del período académico actual.
        </p>
      </div>
    </div>
  );
};

export default AccountsReceivable;
