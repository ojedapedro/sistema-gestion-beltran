
import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './views/Dashboard';
import StudentRegistry from './views/StudentRegistry';
import PaymentRegister from './views/PaymentRegister';
import PaymentVerification from './views/PaymentVerification';
import AccountsReceivable from './views/AccountsReceivable';
import Reports from './views/Reports';
import NotificationCenter from './components/NotificationCenter';
import { notificationService } from './services/notificationService';
import { dataService } from './services/dataService';
import { Database, RefreshCw } from 'lucide-react';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    notificationService.requestPermission();
    
    // Sincronización inicial con Google Sheets
    const initSync = async () => {
      setIsSyncing(true);
      await dataService.syncFromSheets();
      setIsSyncing(false);
    };
    initSync();
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    await dataService.syncFromSheets();
    setIsSyncing(false);
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <Dashboard />;
      case 'register_student': return <StudentRegistry />;
      case 'payments': return <PaymentRegister />;
      case 'verification': return <PaymentVerification />;
      case 'ledger': return <AccountsReceivable />;
      case 'reports': return <Reports />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      
      <main className="flex-1 ml-64 p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-center bg-white/40 backdrop-blur-md p-4 rounded-2xl border border-white/60 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 px-4 py-2 rounded-xl shadow-lg border border-slate-700 flex items-center gap-3">
              <Database size={14} className="text-blue-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-widest">Google Cloud DB</span>
              <button 
                onClick={handleSync}
                className={`ml-2 text-slate-400 hover:text-white transition-all ${isSyncing ? 'animate-spin' : ''}`}
                title="Sincronizar ahora"
              >
                <RefreshCw size={14} />
              </button>
            </div>
            
            <div className="bg-blue-600/10 px-4 py-2 rounded-xl border border-blue-200 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-black text-blue-700 uppercase tracking-tighter">Periodo 2025-26</span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <NotificationCenter />
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-black text-slate-800 tracking-tight">Admin Colegio BPF</p>
                <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Cloud Master</p>
              </div>
              <div className="w-10 h-10 metallic-dark text-white rounded-xl flex items-center justify-center font-black shadow-lg border border-slate-700">
                BP
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto pb-12">
          {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;
