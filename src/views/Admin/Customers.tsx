import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, where, getDocs, orderBy } from 'firebase/firestore';
import { User as UserType } from '../../types';
import { Users, Phone, Calendar, Search, UserPlus, MoreVertical, Ban, Trash2, History, Gift, ListTodo, X, ShieldCheck, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<UserType[]>([]);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [userRewards, setUserRewards] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'customer'));
    return onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserType)));
    });
  }, []);

  const fetchUserDetails = async (user: any) => {
    setSelectedUser(user);
    // Fetch orders
    const ordersSnap = await getDocs(query(collection(db, 'bookings'), where('phone', '==', user.phone), orderBy('createdAt', 'desc')));
    setUserOrders(ordersSnap.docs.map(d => ({id: d.id, ...d.data()})));
    
    // Fetch rewards
    const rewardsSnap = await getDocs(query(collection(db, 'rewardClaims'), where('userId', '==', user.id)));
    setUserRewards(rewardsSnap.docs.map(d => ({id: d.id, ...d.data()})));
  };

  const filtered = customers.filter(c => 
    c.phone.includes(search) || (c as any).name?.toLowerCase().includes(search.toLowerCase())
  );

  const blockUser = async (id: string, isBlocked: boolean) => {
    await updateDoc(doc(db, 'users', id), { isBlocked });
  };

  const deleteUser = async (id: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await deleteDoc(doc(db, 'users', id));
    }
  };

  return (
    <div className="p-6 pb-28 min-h-screen bg-[#F8F9FB]">
      <header className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display text-left">Customers</h1>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Platform User Directory</p>
          </div>
          <button className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center text-[#2F70E9] active:scale-95 transition-all">
            <UserPlus size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2F70E9] transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-14 bg-white rounded-3xl pl-12 pr-6 border border-gray-100 outline-none focus:ring-4 focus:ring-blue-100 transition-all font-bold text-sm shadow-sm"
          />
        </div>
      </header>

      <div className="space-y-4">
        {filtered.map((c) => (
          <motion.div 
            layout
            key={c.id} 
            onClick={() => fetchUserDetails(c)}
            className="bg-white p-5 rounded-[32px] border border-gray-100 flex items-center gap-4 shadow-sm active:scale-[0.98] transition-all cursor-pointer group"
          >
             <div className="w-14 h-14 bg-[#2F70E9]/5 rounded-2xl flex items-center justify-center text-[#2F70E9] font-black text-lg group-hover:bg-[#2F70E9] group-hover:text-white transition-colors">
                {(c as any).name?.charAt(0) || <Users size={20} />}
             </div>
             <div className="flex-1 min-w-0">
                <h3 className="font-black text-gray-900 truncate">{(c as any).name || 'Unknown User'}</h3>
                <div className="flex items-center gap-3 mt-1">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-1">
                    <Phone size={10} /> {c.phone}
                  </div>
                  <div className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter hidden sm:flex items-center gap-1">
                    <Calendar size={10} /> {new Date(c.createdAt).toLocaleDateString()}
                  </div>
                </div>
             </div>
             {(c as any).isBlocked && (
               <div className="px-2 py-0.5 bg-rose-50 text-rose-500 text-[8px] font-black uppercase tracking-widest rounded-full">Blocked</div>
             )}
             <ChevronRight className="text-gray-200 group-hover:text-[#2F70E9] transform group-hover:translate-x-1 transition-all" size={20} />
          </motion.div>
        ))}
      </div>

      {/* User Details Modal */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
            <motion.div 
               initial={{ opacity: 0 }} 
               animate={{ opacity: 1 }} 
               exit={{ opacity: 0 }} 
               className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" 
               onClick={() => setSelectedUser(null)} 
            />
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }} 
              className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white/80 backdrop-blur-md px-8 py-6 border-b border-gray-50 flex items-center justify-between z-20">
                <h3 className="text-xl font-black text-gray-900 tracking-tight">User Profile</h3>
                <button onClick={() => setSelectedUser(null)} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                  <X size={20} strokeWidth={3} />
                </button>
              </div>

              <div className="p-8">
                {/* Header Profile */}
                <div className="flex flex-col items-center mb-8">
                  <div className="w-24 h-24 bg-[#2F70E9] rounded-[32px] shadow-xl shadow-blue-100 flex items-center justify-center text-white text-3xl font-black mb-4">
                    {selectedUser.name?.charAt(0) || 'U'}
                  </div>
                  <h4 className="text-2xl font-black text-gray-900">{selectedUser.name || 'Unknown User'}</h4>
                  <p className="text-sm font-bold text-gray-400 mt-1">{selectedUser.phone}</p>
                  
                  <div className="flex gap-2 mt-6">
                    <button 
                      onClick={() => blockUser(selectedUser.id, !selectedUser.isBlocked)}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedUser.isBlocked ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}
                    >
                      <Ban size={14} /> {selectedUser.isBlocked ? 'Unblock User' : 'Block User'}
                    </button>
                    <button 
                      onClick={() => deleteUser(selectedUser.id)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gray-50 text-gray-400 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-10">
                  <div className="bg-[#F8F9FB] p-4 rounded-3xl text-center">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Orders</p>
                    <p className="text-lg font-black text-[#2F70E9]">{userOrders.length}</p>
                  </div>
                  <div className="bg-[#F8F9FB] p-4 rounded-3xl text-center">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Points</p>
                    <p className="text-lg font-black text-orange-500">{selectedUser.turboPoints || 0}</p>
                  </div>
                  <div className="bg-[#F8F9FB] p-4 rounded-3xl text-center">
                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Badge</p>
                    <p className="text-[10px] font-black text-purple-600 uppercase mt-1">{selectedUser.badge || 'Silver'}</p>
                  </div>
                </div>

                {/* Service History */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h5 className="font-black text-gray-900 flex items-center gap-2">
                       <History size={18} className="text-[#2F70E9]" /> Order History
                    </h5>
                  </div>
                  
                  <div className="space-y-3">
                    {userOrders.length === 0 && <p className="text-center py-8 text-gray-400 text-xs font-bold uppercase tracking-widest">No orders found</p>}
                    {userOrders.map((o) => (
                      <div key={o.id} className="bg-white border border-gray-50 p-4 rounded-3xl shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[8px] font-black px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full uppercase">{o.type}</span>
                          <span className="text-[10px] font-bold text-gray-300 font-mono">#{o.id.slice(-4).toUpperCase()}</span>
                        </div>
                        <p className="text-xs font-black text-gray-800 mb-1">{o.problem}</p>
                        <p className="text-[9px] font-bold text-gray-400">{new Date(o.createdAt).toLocaleDateString()} • ₹{o.total || 0}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rewards History */}
                <div className="mt-10 space-y-6">
                  <h5 className="font-black text-gray-900 flex items-center gap-2">
                     <Gift size={18} className="text-pink-500" /> Reward Claims
                  </h5>
                  <div className="space-y-3">
                    {userRewards.length === 0 && <p className="text-center py-8 text-gray-400 text-xs font-bold uppercase tracking-widest">No claims found</p>}
                    {userRewards.map((r) => (
                      <div key={r.id} className="bg-[#F8F9FB] p-4 rounded-3xl border border-gray-100">
                        <div className="flex justify-between items-center">
                          <p className="text-xs font-black text-gray-800">{r.rewardTitle}</p>
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${r.status === 'delivered' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>{r.status}</span>
                        </div>
                   </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
