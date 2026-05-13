import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { User as UserType } from '../../types';
import { Users, Phone, Calendar } from 'lucide-react';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<UserType[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    return onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserType)));
    });
  }, []);

  return (
    <div className="p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
           <Users className="text-blue-600" /> Customers
        </h1>
        <p className="text-gray-500">Registered users in Nanjangud</p>
      </header>

      <div className="space-y-3">
        {customers.map((c) => (
          <div key={c.id} className="bg-white p-4 rounded-3xl border border-gray-50 flex items-center gap-4">
             <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500">
                {c.phone.slice(-2)}
             </div>
             <div className="flex-1">
                <div className="font-bold flex items-center gap-2">
                  <Phone size={12} className="text-gray-400" /> {c.phone}
                </div>
                <div className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Calendar size={10} /> Joined {new Date(c.createdAt).toLocaleDateString()}
                </div>
             </div>
             <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                {c.role}
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}
