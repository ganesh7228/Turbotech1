import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Booking } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { History, CheckCircle } from 'lucide-react';

export default function TechHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<Booking[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'bookings'),
      where('technicianId', '==', user.id),
      where('status', '==', 'completed'),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    });
  }, [user]);

  return (
    <div className="p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
           <History className="text-gray-400" /> My Completed Jobs
        </h1>
        <p className="text-gray-500">Your total impact</p>
      </header>

      <div className="space-y-4">
        {history.length === 0 && (
           <div className="py-20 text-center text-gray-400">No completed jobs yet</div>
        )}

        {history.map((h) => (
          <div key={h.id} className="bg-white p-5 rounded-[32px] border border-gray-100 flex items-center gap-4">
             <div className="w-10 h-10 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center">
                <CheckCircle size={24} />
             </div>
             <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{h.problem}</h3>
                <p className="text-[10px] text-gray-400">{h.customerName} • {new Date(h.updatedAt).toLocaleDateString()}</p>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
