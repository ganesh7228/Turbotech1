import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { Booking } from '../../types';
import { History, CheckCircle2, XCircle } from 'lucide-react';

export default function AdminHistory() {
  const [history, setHistory] = useState<Booking[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'bookings'),
      where('status', 'in', ['completed', 'rejected']),
      orderBy('updatedAt', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      setHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    });
  }, []);

  return (
    <div className="p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
           <History className="text-gray-400" /> Booking History
        </h1>
        <p className="text-gray-500">Past resolutions</p>
      </header>

      <div className="space-y-4">
        {history.map((h) => (
          <div key={h.id} className="bg-white p-5 rounded-[32px] border border-gray-100 flex items-center gap-4">
             <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${h.status === 'completed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {h.status === 'completed' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
             </div>
             <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 truncate">{h.problem}</h3>
                <p className="text-[10px] text-gray-400">{h.customerName} • {new Date(h.updatedAt).toLocaleDateString()}</p>
             </div>
             <div className="text-[10px] font-mono text-gray-300">#{h.id.slice(-4).toUpperCase()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
