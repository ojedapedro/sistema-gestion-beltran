
import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Megaphone, CreditCard, ShieldCheck, Info } from 'lucide-react';
import { notificationService } from '../services/notificationService';
import { AppNotification, NotificationCategory } from '../types';

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadNotifications = () => {
    setNotifications(notificationService.getNotifications());
  };

  useEffect(() => {
    loadNotifications();
    const handleNew = () => loadNotifications();
    window.addEventListener('new_notification', handleNew);
    
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('new_notification', handleNew);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (category: NotificationCategory) => {
    switch (category) {
      case NotificationCategory.ANNOUNCEMENT: return <Megaphone className="text-purple-500" size={16} />;
      case NotificationCategory.PAYMENT: return <CreditCard className="text-green-500" size={16} />;
      case NotificationCategory.VERIFICATION: return <ShieldCheck className="text-blue-500" size={16} />;
      default: return <Info className="text-gray-500" size={16} />;
    }
  };

  const handleMarkRead = (id: string) => {
    notificationService.markAsRead(id);
    loadNotifications();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 bg-red-500 text-white text-[10px] font-bold px-1 rounded-full min-w-[16px] h-4 flex items-center justify-center border-2 border-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
            <h3 className="font-bold text-gray-800">Notificaciones</h3>
            <button 
              onClick={() => {
                notificationService.markAllAsRead();
                loadNotifications();
              }}
              className="text-xs text-blue-600 font-medium hover:underline"
            >
              Marcar todas como leídas
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">No tienes notificaciones</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors flex gap-3 ${!n.read ? 'bg-blue-50/30' : ''}`}
                >
                  <div className="mt-1">
                    {getIcon(n.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className={`text-sm font-bold ${!n.read ? 'text-gray-900' : 'text-gray-600'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                        {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{n.message}</p>
                    {!n.read && (
                      <button 
                        onClick={() => handleMarkRead(n.id)}
                        className="mt-2 text-[10px] flex items-center gap-1 text-blue-600 font-bold uppercase tracking-wider hover:text-blue-700"
                      >
                        <Check size={10} /> Marcar como leída
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-3 bg-gray-50 text-center border-t border-gray-100">
            <button className="text-xs font-bold text-gray-500 hover:text-gray-700 uppercase tracking-widest">
              Ver Historial Completo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
