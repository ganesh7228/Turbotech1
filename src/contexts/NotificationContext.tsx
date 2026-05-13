import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface NotificationContextType {
  notify: (title: string, message: string, type?: Notification['type']) => void;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((title: string, message: string, type: Notification['type'] = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications(prev => [...prev, { id, title, message, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const remove = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              className="pointer-events-auto w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            >
              <div className="p-4 flex gap-3">
                <div className={`p-2 rounded-xl h-fit ${
                  n.type === 'success' ? 'bg-green-50 text-green-500' :
                  n.type === 'error' ? 'bg-red-50 text-red-500' :
                  n.type === 'warning' ? 'bg-orange-50 text-orange-500' :
                  'bg-blue-50 text-[#2F70E9]'
                }`}>
                  <Bell size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-black text-sm text-gray-900 leading-tight mb-0.5">{n.title}</h4>
                  <p className="text-xs text-gray-400 font-bold leading-relaxed">{n.message}</p>
                </div>
                <button onClick={() => remove(n.id)} className="text-gray-300 hover:text-gray-400 transition-colors">
                  <X size={16} />
                </button>
              </div>
              <div className={`h-1 ${
                n.type === 'success' ? 'bg-green-500' :
                n.type === 'error' ? 'bg-red-500' :
                n.type === 'warning' ? 'bg-orange-500' :
                'bg-[#2F70E9]'
              } opacity-20`} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotify() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotify must be used within a NotificationProvider');
  return context;
}
