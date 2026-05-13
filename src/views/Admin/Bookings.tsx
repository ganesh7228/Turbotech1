import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Booking } from '../../types';
import { Briefcase, MapPin, User, ChevronRight, Phone, AlertCircle } from 'lucide-react';

import { arrayUnion } from 'firebase/firestore';

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
      setLoading(false);
    });
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

  return (
    <div className="p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
           <Briefcase className="text-blue-600" /> Admin Dashboard
        </h1>
        <p className="text-gray-500">Live booking management</p>
      </header>

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
