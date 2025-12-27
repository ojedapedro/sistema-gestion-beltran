
import React from 'react';
import { 
  LayoutDashboard, 
  UserPlus, 
  CreditCard, 
  CheckCircle, 
  BookOpen, 
  FileText
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'register_student', label: 'Registro de Alumnos', icon: UserPlus },
    { id: 'payments', label: 'Registro de Pagos', icon: CreditCard },
    { id: 'verification', label: 'Verificación', icon: CheckCircle },
    { id: 'ledger', label: 'Cuentas por Cobrar', icon: BookOpen },
    { id: 'reports', label: 'Reportes', icon: FileText },
  ];

  return (
    <aside className="w-64 metallic-dark text-slate-300 min-h-screen flex flex-col fixed left-0 top-0 border-r border-slate-700 shadow-xl">
      <div className="p-6 flex flex-col items-center gap-4 border-b border-slate-800 bg-black/10">
        <div className="w-20 h-20 p-1 rounded-2xl bg-white/10 ring-1 ring-white/20 shadow-inner overflow-hidden flex items-center justify-center">
          <img 
            src="https://i.ibb.co/FbHJbvVT/images.png" 
            alt="Colegio Beltrán Prieto Figueroa Logo"
            className="w-full h-full object-contain"
          />
        </div>
        <div className="text-center">
          <span className="font-bold text-lg text-white tracking-tight leading-tight block">Beltrán Prieto</span>
          <small className="text-blue-400 font-medium tracking-widest uppercase text-[10px]">Figueroa</small>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 translate-x-1' 
                : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} />
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 bg-black/20 border-t border-slate-800">
        <div className="bg-slate-800/50 p-3 rounded-xl text-[10px] text-slate-500 border border-slate-700">
          <p className="font-bold text-slate-400">BPF Sistema Admin</p>
          <p className="mt-1 opacity-70">v1.2 Metallic Pro</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
