import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { Booking } from '../../types';
import { Briefcase, MapPin, User, ChevronRight, Phone, AlertCircle, Users, Eye, TrendingUp, IndianRupee, Gift, ListTodo } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { arrayUnion } from 'firebase/firestore';

function StatCard({ icon, label, value, color, onClick, highlight }: any) {
  return (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`${color} p-5 rounded-[32px] text-white shadow-lg relative overflow-hidden group cursor-pointer`}
    >
      <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
            {icon}
          </div>
          {highlight && <div className="w-2 h-2 bg-white rounded-full animate-ping" />}
        </div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">{label}</p>
        <h3 className="text-2xl font-black font-display">{value}</h3>
      </div>
    </motion.div>
  );
}

export default function AdminBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [rewardClaims, setRewardClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubBookings = onSnapshot(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')), (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
      setLoading(false);
    });

    const unsubCustomers = onSnapshot(query(collection(db, 'users'), where('role', '==', 'customer')), (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubRewards = onSnapshot(query(collection(db, 'rewardClaims'), where('status', '==', 'pending')), (snapshot) => {
      setRewardClaims(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubBookings();
      unsubCustomers();
      unsubRewards();
    };
  }, []);

  const updateStatus = async (id: string, status: Booking['status']) => {
    try {
      await updateDoc(doc(db, 'bookings', id), {
        status,
        statusHistory: arrayUnion({
          status,
          timestamp: new Date().toISOString()
        }),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusAction = (status: Booking['status']) => {
    switch (status) {
      case 'pending': return 'pending_callback';
      case 'pending_callback': return 'approved';
      default: return null;
    }
  };

  const totalEarnings = bookings.reduce((sum, b) => b.status === 'completed' ? sum + (b.total || 0) : sum, 0);

  return (
    <div className="p-6 pb-28">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display">Admin Dashboard</h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Real-time Platform Overview</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard 
          icon={<Users size={20} />} 
          label="Total Customers" 
          value={customers.length} 
          color="bg-[#2F70E9]"
          onClick={() => navigate('/admin/customers')}
        />
        <StatCard 
          icon={<Eye size={20} />} 
          label="Website Visits" 
          value="1.2k" 
          color="bg-purple-500"
        />
        <StatCard 
          icon={<TrendingUp size={20} />} 
          label="New Visitors" 
          value="84" 
          color="bg-emerald-500"
        />
        <StatCard 
          icon={<IndianRupee size={20} />} 
          label="Earnings" 
          value={`₹${totalEarnings}`} 
          color="bg-orange-500"
          onClick={() => navigate('/admin/earnings')}
        />
        <StatCard 
          icon={<ListTodo size={20} />} 
          label="Total Bookings" 
          value={bookings.length} 
          color="bg-blue-400"
        />
        <StatCard 
          icon={<Gift size={20} />} 
          label="Reward Requests" 
          value={rewardClaims.length} 
          color="bg-pink-500"
          highlight={rewardClaims.length > 0}
          onClick={() => navigate('/admin/rewards')}
        />
      </div>

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-gray-900 tracking-tight font-display">Live Bookings</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Now</span>
        </div>
      </div>

      <div className="space-y-4">
        {bookings.length === 0 && !loading && (
           <div className="text-center py-12 text-gray-400">No active bookings</div>
        )}

        {bookings.map((booking) => (
          <div key={booking.id} className="bg-white p-5 rounded-[40px] shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase">
                {booking.type}
              </div>
              <div className="text-[10px] text-gray-400 font-mono">#{booking.id.slice(-6).toUpperCase()}</div>
            </div>

            <div className="mb-4">
              <h3 className="font-bold text-gray-900">{booking.problem}</h3>
              <div className="mt-2 space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <User size={12} /> {booking.customerName}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Phone size={12} /> {booking.phone}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin size={12} /> {booking.address}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50">
              <div className="flex flex-col">
                <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Current Status</span>
                <span className="text-xs font-bold text-blue-600 uppercase">{booking.status.replace('_', ' ')}</span>
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => updateStatus(booking.id, 'rejected')}
                  className="px-3 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold uppercase hover:bg-red-100"
                >
                  Reject
                </button>
                {getStatusAction(booking.status) && (
                  <button 
                    onClick={() => updateStatus(booking.id, getStatusAction(booking.status)!)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase shadow-lg shadow-blue-200 flex items-center gap-1"
                  >
                    Set to {getStatusAction(booking.status)?.replace('_', ' ')} <ChevronRight size={10} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
