import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, Home, List, Phone, Gift } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import axios from 'axios';

export default function SuccessView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);

  useEffect(() => {
    if (id) {
      const fetchBooking = async () => {
        try {
          console.log("Fetching booking via direct Firestore...");
          const docRef = doc(db, 'bookings', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setBooking(docSnap.data());
          } else {
            throw new Error("Doc not found in direct read");
          }
        } catch (err) {
          console.warn("Direct Firestore read failed on success page, trying API fallback:", err);
          try {
            const { data } = await axios.get(`/api/bookings/${id}`);
            setBooking(data);
          } catch (apiErr) {
            console.error("Failed to fetch booking via both methods:", apiErr);
          }
        }
      };
      fetchBooking();
    }
  }, [id]);

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col items-center justify-center p-6 text-center py-20">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 20 }}
        className="bg-white p-10 rounded-[48px] shadow-[0_20px_60px_rgba(0,0,0,0.05)] border border-blue-50 max-w-sm w-full relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2F70E9]/5 rounded-full -mr-16 -mt-16"></div>
        
        <div className="flex justify-center mb-8">
          <div className="bg-[#2F70E9]/10 p-5 rounded-full border border-[#2F70E9]/10 relative z-10">
            <CheckCircle size={56} className="text-[#2F70E9]" strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-2xl font-black text-gray-900 mb-2 font-display tracking-tight">Booking Placed!</h1>
        <div className="text-[10px] font-black bg-gray-50 text-gray-400 py-1.5 px-4 rounded-full inline-block mb-6 uppercase tracking-widest border border-gray-100">
          ORDER #{id?.slice(-6).toUpperCase()}
        </div>

        <AnimatePresence>
          {booking?.appliedOffer && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mb-8 overflow-hidden"
            >
               <div className="bg-gradient-to-r from-orange-400 to-orange-500 p-4 rounded-2xl text-white shadow-lg shadow-orange-100 border border-orange-300/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                      <Gift size={20} className="text-white" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-xs font-black uppercase tracking-tight">First Booking Gift!</h4>
                      <p className="text-[10px] font-bold text-white/90">Successfully auto-applied</p>
                    </div>
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-5 text-gray-500 text-[13px] mb-10 font-bold leading-relaxed">
          <p>Great! Your booking is confirmed. Our specialist will call you in a few minutes to verify details.</p>
          <div className="flex items-center justify-center gap-2 text-[#2F70E9] font-black bg-[#2F70E9]/5 py-3 rounded-2xl border border-[#2F70E9]/10">
             <Phone size={14} fill="#2F70E9" /> 
             Stand by for our call
          </div>
          <p className="opacity-60">Estimated arrival time: <span className="text-gray-900">{booking?.eta || '15–20 minutes'}</span></p>
        </div>

        <div className="space-y-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/booking')}
            className="flex items-center justify-center gap-3 w-full bg-[#2F70E9] text-white py-5 rounded-3xl font-black text-sm shadow-xl shadow-blue-100 transition-all"
          >
            <List size={18} strokeWidth={3} />
            Track Status
          </motion.button>
          
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-3 w-full bg-white text-gray-400 py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:text-gray-900 transition-all border border-gray-50"
          >
            <Home size={18} strokeWidth={3} />
            Back to Home
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
