import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Booking } from '../../types';
import { Briefcase, MapPin, User, ChevronRight, Phone, Gift } from 'lucide-react';

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

  const updateStatus = async (id: string, status?: Booking['status'], extra?: Record<string, any>) => {
    try {
      const payload = {
        updatedAt: new Date().toISOString(),
        ...(status ? { status } : {}),
        ...extra,
      };

      await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/bookings/${id}`,
        payload,
        { withCredentials: true }
      );
    } catch (e: any) {
      console.error('[AdminBookings] updateStatus failed:', e.response?.data || e.message || e);
    }
  };

  const handleRejectGift = async (booking: Booking) => {
    const reason = window.prompt('Please enter the reason for rejecting this reward:');
    if (!reason?.trim()) return;
    await updateStatus(booking.id, undefined, {
      rewardStatus: 'rejected',
      rewardRejectedReason: reason.trim(),
      rewardRejectedAt: new Date().toISOString(),
    });
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
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-bold text-gray-900">{booking.problem}</h3>
                {booking.appliedOffer && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-amber-50 text-amber-700">
                    <Gift size={12} /> Gift applied
                  </span>
                )}
              </div>
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
                {booking.rewardStatus === 'rejected' && (
                  <div className="mt-2 rounded-2xl bg-rose-50 border border-rose-100 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-rose-700">
                    Reward rejected{booking.rewardRejectedReason ? `: ${booking.rewardRejectedReason}` : ''}
                  </div>
                )}
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
                {booking.giftStatus === 'Gift' && (
                  <button
                    onClick={() =>
                      updateStatus(booking.id, 'approved', {
                        giftStatus: 'Gift dispatched',
                      })
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-bold uppercase shadow-lg shadow-blue-200 flex items-center gap-1"
                  >
                    Approve Gift <ChevronRight size={10} />
                  </button>
                )}

                {booking.appliedOffer && booking.rewardStatus !== 'rejected' && (
                  <button
                    onClick={() => handleRejectGift(booking)}
                    className="px-3 py-2 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-bold uppercase hover:bg-amber-100"
                  >
                    Reject Gift
                  </button>
                )}

                {getStatusAction(booking.status) && booking.giftStatus !== 'Gift' && (
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
