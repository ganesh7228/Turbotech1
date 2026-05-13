import React, { useEffect, useMemo, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, query, doc, getDoc, updateDoc } from 'firebase/firestore';
import { User as UserType } from '../../types';
import { Users, Phone, Calendar, Plus, X } from 'lucide-react';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<UserType[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );

  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsToAdd, setPointsToAdd] = useState<string>('');
  const [pointsAddLoading, setPointsAddLoading] = useState(false);
  const [pointsAddError, setPointsAddError] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    return onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as UserType)));
    });
  }, []);

  const openPointsModal = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setPointsToAdd('');
    setPointsAddError(null);
    setShowPointsModal(true);
  };

  const closePointsModal = () => {
    if (pointsAddLoading) return;
    setShowPointsModal(false);
    setSelectedCustomerId(null);
    setPointsToAdd('');
    setPointsAddError(null);
    setPointsAddLoading(false);
  };

  const handleAddPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;

    const parsed = pointsToAdd.trim().length === 0 ? 0 : Number(pointsToAdd);

    if (Number.isNaN(parsed) || parsed < 0) return;

    setPointsAddLoading(true);
    setPointsAddError(null);

    try {
      const userRef = doc(db, 'users', selectedCustomerId);
      const snap = await getDoc(userRef);

      const currentPoints =
        snap.exists() && typeof snap.data()?.points === 'number' && Number.isFinite(snap.data()?.points)
          ? (snap.data()?.points as number)
          : 0;

      await updateDoc(userRef, {
        points: currentPoints + parsed,
      });

      closePointsModal();
    } catch (err: any) {
      setPointsAddError(err?.message ? String(err.message) : 'Failed to add points');
    } finally {
      setPointsAddLoading(false);
    }
  };

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
          <button
            key={c.id}
            type="button"
            onClick={() => openPointsModal(c.id)}
            className="w-full bg-white p-4 rounded-3xl border border-gray-50 flex items-center gap-4 text-left hover:bg-gray-50 transition-colors active:bg-gray-100"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500 shrink-0">
              {c.phone.slice(-2)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="font-bold flex items-center gap-2 truncate">
                <Phone size={12} className="text-gray-400 shrink-0" /> {c.phone}
              </div>
              <div className="text-[10px] text-gray-400 flex items-center gap-1">
                <Calendar size={10} /> Joined {new Date(c.createdAt).toLocaleDateString()}
              </div>
              <div className="text-[10px] text-gray-500 mt-1">
                <span className="font-black text-gray-700">Points:</span>{' '}
                <span className="font-black text-gray-900">{typeof c.points === 'number' ? c.points : 0}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  c.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                }`}
              >
                {c.role}
              </div>
              <div className="w-8 h-8 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
                <Plus size={16} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {showPointsModal && selectedCustomer && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-md rounded-[40px] p-8 shadow-2xl relative">
            <button onClick={closePointsModal} className="absolute right-6 top-6 text-gray-400" type="button">
              <X size={24} />
            </button>

            <h2 className="text-xl font-bold mb-6">Add Points</h2>

            <div className="bg-gray-50 border border-gray-100 rounded-3xl p-4 mb-5">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Customer</div>
              <div className="font-black text-gray-900">{selectedCustomer.phone}</div>
              <div className="text-[10px] text-gray-500 mt-1">
                Current points:{' '}
                <span className="font-black text-gray-900">
                  {typeof selectedCustomer.points === 'number' ? selectedCustomer.points : 0} PTS
                </span>
              </div>
            </div>

            <form onSubmit={handleAddPoints} className="space-y-4">
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                placeholder="Points to add"
                value={pointsToAdd}
                onChange={(e) => setPointsToAdd(e.target.value)}
                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {pointsAddError && (
                <div className="bg-rose-50 border border-rose-100 text-rose-700 p-3 rounded-2xl text-[10px] font-bold uppercase tracking-tight">
                  {pointsAddError}
                </div>
              )}

              <button
                type="submit"
                disabled={pointsAddLoading}
                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pointsAddLoading ? 'ADDING...' : 'Add Points'}
              </button>

              <button
                type="button"
                onClick={closePointsModal}
                disabled={pointsAddLoading}
                className="w-full py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
