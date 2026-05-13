import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { Reward } from '../../types';
import { Gift, Plus, Trash2, Image as ImageIcon, X } from 'lucide-react';

export default function AdminRewards() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', imageUrl: '', pointsRequired: '' });

  useEffect(() => {
    const q = query(collection(db, 'rewards'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      setRewards(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Reward)));
    });
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.description) return;

    const trimmedImage = form.imageUrl.trim();
    const parsedPoints = form.pointsRequired.trim().length === 0 ? 0 : Number(form.pointsRequired);

    if (Number.isNaN(parsedPoints) || parsedPoints < 0) return;

    try {
      await addDoc(collection(db, 'rewards'), {
        title: form.title,
        description: form.description,
        imageUrl: trimmedImage.length > 0 ? trimmedImage : undefined,
        pointsRequired: parsedPoints,
        createdAt: serverTimestamp(),
      });

      setForm({ title: '', description: '', imageUrl: '', pointsRequired: '' });
      setShowAdd(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this reward?')) {
      await deleteDoc(doc(db, 'rewards', id));
    }
  };

  return (
    <div className="p-6 pb-32">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="text-yellow-500" /> Manage Rewards
          </h1>
          <p className="text-gray-500">Add or remove customer incentives</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200"
        >
          <Plus size={20} />
        </button>
      </header>

      {showAdd && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl relative">
            <button onClick={() => setShowAdd(false)} className="absolute right-6 top-6 text-gray-400">
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold mb-6">New Reward</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={e => setForm({...form, description: e.target.value})}
                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="number"
                min={0}
                step={1}
                placeholder="Points Required"
                value={form.pointsRequired}
                onChange={e => setForm({...form, pointsRequired: e.target.value})}
                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <input
                type="text"
                placeholder="Image URL (optional)"
                value={form.imageUrl}
                onChange={e => setForm({...form, imageUrl: e.target.value})}
                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold">
                Create Reward
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {rewards.map(reward => (
          <div key={reward.id} className="bg-white p-4 rounded-[32px] border border-gray-50 flex gap-4 items-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden shrink-0">
               {reward.imageUrl ? (
                 <img src={reward.imageUrl} className="w-full h-full object-cover" />
               ) : (
                 <ImageIcon size={24} className="text-gray-300" />
               )}
            </div>
            <div className="flex-1 min-w-0">
               <h3 className="font-bold text-gray-900 truncate">{reward.title}</h3>
               <p className="text-xs text-gray-500 line-clamp-1">{reward.description}</p>

               <div className="mt-2 inline-flex items-center gap-2 px-2 py-0.5 rounded-xl bg-amber-50 border border-amber-100">
                 <span className="text-[10px] font-bold text-amber-800">Requires</span>
                 <span className="text-[10px] font-black text-amber-900">{reward.pointsRequired ?? 0} PTS</span>
               </div>
            </div>
            <button 
              onClick={() => handleDelete(reward.id)}
              className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
