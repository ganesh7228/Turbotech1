import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Booking } from '../../types';
import { 
  User, 
  Settings, 
  LogOut, 
  ShieldCheck, 
  ChevronRight, 
  MapPin, 
  Bell, 
  CreditCard,
  History,
  Gift,
  Phone
} from 'lucide-react';

export default function AccountView() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [bookingsCount, setBookingsCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'bookings'),
      where('phone', '==', user.phone)
    );
    return onSnapshot(q, (snapshot) => {
      setBookingsCount(snapshot.size);
    });
  }, [user]);

  const menuItems = [
    { icon: User, label: 'Profile Information', desc: 'Name, Email, WhatsApp', path: '/profile', color: 'bg-blue-50 text-blue-600' },
    { icon: History, label: 'Order History', desc: 'Past bookings & Invoices', path: '/history', color: 'bg-emerald-50 text-emerald-600' },
    { icon: Gift, label: 'Rewards & Coupons', desc: 'Loyalty points', path: '/rewards', color: 'bg-amber-50 text-amber-600' },
    { icon: CreditCard, label: 'Payment Methods', desc: 'Saved cards & UPI', path: '/payments', color: 'bg-purple-50 text-purple-600' },
    { icon: MapPin, label: 'Saved Addresses', desc: 'Home, Office, Work', path: '/addresses', color: 'bg-rose-50 text-rose-600' },
    { icon: Bell, label: 'Notifications', desc: 'Alerts & Status bits', path: '/alerts', color: 'bg-indigo-50 text-indigo-600' },
    { icon: ShieldCheck, label: 'Privacy & Security', desc: 'Passwords & GDPR', path: '/security', color: 'bg-teal-50 text-teal-600' },
    { icon: Settings, label: 'App Settings', desc: 'Theme, Language, Support', path: '/settings', color: 'bg-gray-50 text-gray-600' },
  ];

  return (
    <div className="p-6 pb-24 max-w-xl mx-auto">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display">Account</h1>
          <p className="text-[11px] font-bold text-gray-400 mt-1">Manage your profile & settings.</p>
        </div>
        <div className="bg-white px-3 py-1.5 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center">
           <span className="text-lg font-black text-[#2F70E9] leading-none">{bookingsCount}</span>
           <span className="text-[7px] font-black text-gray-300 uppercase tracking-widest mt-0.5">ORDERS</span>
        </div>
      </header>

      {/* Profile Card */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-[32px] border border-gray-50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] mb-8 flex items-center gap-4"
      >
        <div className="w-16 h-16 bg-[#F8F9FB] rounded-[24px] border border-gray-100 flex items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-[#2F70E9] opacity-5 group-hover:opacity-10 transition-opacity" />
          <User size={28} className="text-gray-300 group-hover:text-[#2F70E9] transition-colors" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-black text-gray-900 font-display truncate leading-tight">{user?.name || user?.phone || 'Premium Member'}</h2>
          <div className="flex items-center gap-2 mt-1">
             <div className="w-1 h-1 bg-[#2F70E9] rounded-full animate-pulse" />
             <p className="text-[9px] font-black text-[#2F70E9] uppercase tracking-widest">Active Member</p>
          </div>
        </div>
        <motion.button 
          whileTap={{ scale: 0.95 }}
          className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-gray-200 border border-gray-50 hover:text-gray-400 transition-colors shadow-sm"
        >
          <ChevronRight size={18} />
        </motion.button>
      </motion.div>

      {/* Menu Grid */}
      <div className="grid gap-3 mb-10">
        {menuItems.map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => navigate(item.path)}
            className="bg-white p-4 rounded-[24px] border border-gray-50 shadow-sm flex items-center justify-between group cursor-pointer hover:border-blue-100 transition-all active:translate-x-1"
          >
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm`}>
                 <item.icon size={18} />
              </div>
              <div>
                <h4 className="text-sm font-black text-gray-900 font-display leading-tight">{item.label}</h4>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{item.desc}</p>
              </div>
            </div>
            <div className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-gray-200 group-hover:bg-blue-50 group-hover:text-[#2F70E9] transition-all">
               <ChevronRight size={16} strokeWidth={3} />
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={logout}
        className="w-full bg-white border border-rose-50 text-red-500 p-5 rounded-[24px] font-black text-[11px] uppercase tracking-[2px] flex items-center justify-center gap-2.5 active:bg-red-50 transition-colors shadow-sm"
      >
        <LogOut size={18} strokeWidth={3} />
        Log out securely
      </motion.button>

      <div className="mt-12 text-center">
         <p className="text-[10px] font-black text-gray-200 uppercase tracking-[4px] font-mono">
           Device ID: {Math.random().toString(36).substring(7).toUpperCase()}
         </p>
         <p className="text-[9px] font-bold text-gray-300 mt-2">© 2024 QuickService Pro v2.4.0</p>
      </div>
    </div>
  );
}
