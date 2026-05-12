import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Booking } from '../../types';
import { IndianRupee, TrendingUp, Calendar } from 'lucide-react';

export default function AdminEarnings() {
  const [completedBookings, setCompletedBookings] = useState<Booking[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'bookings'), where('status', '==', 'completed'));
    return onSnapshot(q, (snapshot) => {
      setCompletedBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    });
  }, []);

  // Simple revenue calculation (e.g., 200 per booking)
  const totalRevenue = completedBookings.length * 200;

  return (
    <div className="p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
           <IndianRupee className="text-green-600" /> Earnings
        </h1>
        <p className="text-gray-500">Revenue overview</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
         <div className="bg-green-600 rounded-[40px] p-8 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10">
               <p className="text-green-100 text-sm font-bold uppercase tracking-widest mb-1">Total Revenue</p>
               <h2 className="text-4xl font-black flex items-center">
                  <IndianRupee size={32} /> {totalRevenue}
               </h2>
               <div className="mt-6 flex items-center gap-2 text-xs bg-green-500/50 w-fit px-3 py-1 rounded-full">
                  <TrendingUp size={12} /> +12% from last week
               </div>
            </div>
            <IndianRupee size={200} className="absolute -right-16 -bottom-16 text-green-500/30 rotate-12" />
         </div>

         <div className="bg-white rounded-[40px] p-6 border border-gray-100 space-y-4">
            <h3 className="font-bold flex items-center gap-2">
               <Calendar size={18} className="text-blue-600" /> Stats Breakdown
            </h3>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
               <span className="text-gray-500 text-sm">Completed Jobs</span>
               <span className="font-bold">{completedBookings.length}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
               <span className="text-gray-500 text-sm">Avg. Ticket Size</span>
               <span className="font-bold">₹ 200</span>
            </div>
            <div className="flex justify-between items-center py-2">
               <span className="text-gray-500 text-sm">Efficiency</span>
               <span className="font-bold text-green-600">98%</span>
            </div>
         </div>
      </div>
    </div>
  );
}
