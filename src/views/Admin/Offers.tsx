import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Offer } from '../../types';
import { Plus, Trash2, Edit2, Tag, CheckCircle2, XCircle, Gift, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'custom' as Offer['type'],
    threshold: 0,
    autoApply: false,
    enabled: true
  });

  const [globalAutoApply, setGlobalAutoApply] = useState(false);

  useEffect(() => {
    // Sync with a settings document for global toggle
    const unsubSettings = onSnapshot(doc(db, 'settings', 'offers'), (doc) => {
      if (doc.exists()) {
        setGlobalAutoApply(doc.data().autoApplyFirstOrder || false);
      }
    });

    const q = query(collection(db, 'offers'));
    const unsubOffers = onSnapshot(q, (snapshot) => {
      setOffers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Offer)));
      setLoading(false);
    });

    return () => {
      unsubSettings();
      unsubOffers();
    };
  }, []);

  const toggleGlobalAutoApply = async () => {
    const newVal = !globalAutoApply;
    setGlobalAutoApply(newVal);
    await setDoc(doc(db, 'settings', 'offers'), { autoApplyFirstOrder: newVal }, { merge: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingOffer) {
        await updateDoc(doc(db, 'offers', editingOffer.id), {
          ...formData,
          createdAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'offers'), {
          ...formData,
          createdAt: serverTimestamp()
        });
      }
      setIsAdding(false);
      setEditingOffer(null);
      setFormData({
        title: '',
        description: '',
        type: 'custom',
        threshold: 0,
        autoApply: false,
        enabled: true
      });
    } catch (error) {
      console.error('Error saving offer:', error);
    }
  };

  const toggleOffer = async (offer: Offer) => {
    try {
      await updateDoc(doc(db, 'offers', offer.id), {
        enabled: !offer.enabled
      });
    } catch (error) {
      console.error('Error toggling offer:', error);
    }
  };

  const deleteOffer = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this offer?')) {
      try {
        await deleteDoc(doc(db, 'offers', id));
      } catch (error) {
        console.error('Error deleting offer:', error);
      }
    }
  };

  if (loading) return <div className="p-8 text-center">Loading Offers...</div>;

  return (
    <div className="p-6 pb-32 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display">Offers & Rewards</h1>
          <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">Promotion Management</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="w-12 h-12 bg-[#2F70E9] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-100 active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Global Settings */}
      <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center">
            <Gift size={24} />
          </div>
          <div>
            <h3 className="font-black text-gray-900">Auto Apply on First Order</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Automatically reward new customers</p>
          </div>
        </div>
        <button 
          onClick={toggleGlobalAutoApply}
          className={`w-14 h-8 rounded-full transition-all relative ${globalAutoApply ? 'bg-[#2F70E9]' : 'bg-gray-200'}`}
        >
          <div className={`absolute top-1 bottom-1 w-6 bg-white rounded-full shadow-sm transition-all ${globalAutoApply ? 'right-1' : 'left-1'}`} />
        </button>
      </div>

      {/* Offers List */}
      <div className="grid gap-4">
        {offers.map((offer) => (
          <div key={offer.id} className={`bg-white rounded-3xl border ${offer.enabled ? 'border-gray-100' : 'border-gray-200 bg-gray-50'} p-6 shadow-sm`}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex gap-4">
                <div className={`p-3 rounded-2xl ${offer.enabled ? 'bg-blue-50 text-[#2F70E9]' : 'bg-gray-100 text-gray-400'}`}>
                  {offer.type === 'first_order' ? <Gift size={24} /> : <Tag size={24} />}
                </div>
                <div>
                  <h3 className={`font-black text-lg ${offer.enabled ? 'text-gray-900' : 'text-gray-400'}`}>{offer.title}</h3>
                  <p className="text-sm text-gray-400 font-bold">{offer.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleOffer(offer)}
                  className={`p-2 rounded-xl transition-colors ${offer.enabled ? 'text-green-500 bg-green-50' : 'text-gray-400 bg-gray-100'}`}
                >
                  {offer.enabled ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                </button>
                <button 
                  onClick={() => {
                    setEditingOffer(offer);
                    setFormData({
                      title: offer.title,
                      description: offer.description,
                      type: offer.type,
                      threshold: offer.threshold || 0,
                      autoApply: offer.autoApply,
                      enabled: offer.enabled
                    });
                    setIsAdding(true);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 bg-gray-50 rounded-xl"
                >
                  <Edit2 size={20} />
                </button>
                <button 
                  onClick={() => deleteOffer(offer.id)}
                  className="p-2 text-red-400 hover:text-red-600 bg-red-50 rounded-xl"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {offer.autoApply && (
                <span className="px-3 py-1 bg-purple-50 text-purple-600 text-[10px] font-black uppercase tracking-wider rounded-lg">
                  Auto Apply
                </span>
              )}
              {offer.type === 'threshold' && (
                <span className="px-3 py-1 bg-orange-50 text-orange-600 text-[10px] font-black uppercase tracking-wider rounded-lg">
                  Above ₹{offer.threshold}
                </span>
              )}
              <span className="px-3 py-1 bg-gray-50 text-gray-500 text-[10px] font-black uppercase tracking-wider rounded-lg">
                {offer.type.replace('_', ' ')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="p-8">
                <h2 className="text-xl font-black text-gray-900 mb-6">
                  {editingOffer ? 'Edit Offer' : 'Create New Offer'}
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-1 block underline decoration-[#2F70E9] decoration-2 underline-offset-4">Offer Title</label>
                    <input 
                      required
                      value={formData.title}
                      onChange={e => setFormData({...formData, title: e.target.value})}
                      placeholder="e.g. First Order Reward"
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-1 block underline decoration-[#2F70E9] decoration-2 underline-offset-4">Description</label>
                    <textarea 
                      required
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      placeholder="Describe what the user gets..."
                      className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-1 block underline decoration-[#2F70E9] decoration-2 underline-offset-4">Type</label>
                      <select 
                        value={formData.type}
                        onChange={e => setFormData({...formData, type: e.target.value as Offer['type']})}
                        className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all"
                      >
                        <option value="custom">Custom</option>
                        <option value="first_order">First Order</option>
                        <option value="threshold">Threshold Based</option>
                      </select>
                    </div>
                    {formData.type === 'threshold' && (
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4 mb-1 block underline decoration-[#2F70E9] decoration-2 underline-offset-4">Min. Amount</label>
                        <input 
                          type="number"
                          value={formData.threshold}
                          onChange={e => setFormData({...formData, threshold: parseInt(e.target.value)})}
                          className="w-full bg-gray-50 border-none rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-xl text-[#2F70E9]">
                        <CheckCircle2 size={18} />
                      </div>
                      <span className="text-sm font-black text-blue-900">Auto Apply?</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setFormData({...formData, autoApply: !formData.autoApply})}
                      className={`w-12 h-6 rounded-full transition-colors relative ${formData.autoApply ? 'bg-[#2F70E9]' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-1 bottom-1 w-4 bg-white rounded-full transition-all ${formData.autoApply ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 mt-8">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-8 py-4 bg-gray-100 text-gray-500 rounded-3xl font-black text-sm"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-8 py-4 bg-[#2F70E9] text-white rounded-3xl font-black text-sm shadow-lg shadow-blue-200"
                  >
                    {editingOffer ? 'Save Changes' : 'Create Offer'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
