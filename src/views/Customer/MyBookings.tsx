import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Booking } from '../../types';
import axios from 'axios';
import { 
  ChevronLeft, 
  Clock, 
  MapPin, 
  AlertCircle,
  FileText,
  X,
  PhoneCall,
  Navigation,
  CheckCircle2,
  Calendar,
  Smartphone,
  ChevronRight,
  Bike,
  ChevronDown,
  MessageSquare,
  Package,
  Gift as GiftIcon,
  ShieldCheck,
  ExternalLink,
  Target,
  Star,
  Send
} from 'lucide-react';
import { addDoc } from 'firebase/firestore';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';

const markerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const techIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3198/3198336.png', // Bike icon
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16]
});

// Haversine distance formula
function getDistance(p1: {lat: number, lng: number}, p2: {lat: number, lng: number}) {
  const R = 6371; // km
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLon = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MyBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'services' | 'products' | 'rewards'>('services');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFullStatus, setShowFullStatus] = useState(false);
  const [dynamicEta, setDynamicEta] = useState<string | null>(null);

  const [showReview, setShowReview] = useState(false);
  const [reviewData, setReviewData] = useState({
    techRating: 0,
    techFeedback: '',
    appRating: 0,
    appSuggestions: ''
  });

  const submitReview = async () => {
    if (!selectedBooking) return;
    try {
      await addDoc(collection(db, 'reviews'), {
        bookingId: selectedBooking.id,
        customerId: user?.id,
        technicianId: selectedBooking.technicianId,
        ...reviewData,
        createdAt: new Date().toISOString()
      });
      await updateDoc(doc(db, 'bookings', selectedBooking.id), {
        reviewed: true
      });
      setShowReview(false);
      alert('Thank you for your feedback!');
    } catch (e) {
      console.error(e);
      alert('Failed to submit review.');
    }
  };

  useEffect(() => {
    if (selectedBooking?.techLocation && selectedBooking?.location && selectedBooking.status === 'on_the_way') {
      const dist = getDistance(selectedBooking.techLocation, selectedBooking.location as {lat: number, lng: number});
      const travelTime = Math.round(dist * 10); // 10 min per km
      setDynamicEta(`${travelTime}-${travelTime + 2}`);
    } else {
      setDynamicEta(null);
    }
  }, [selectedBooking?.techLocation, selectedBooking?.location, selectedBooking?.status]);

  useEffect(() => {
    if (!user?.id) {
        setLoading(false);
        return;
    }

    let unsubscribeLocal: () => void = () => {};

    const startListener = () => {
      const q = query(
        collection(db, 'bookings'),
        where('customerId', '==', user.id),
        orderBy('createdAt', 'desc')
      );

      unsubscribeLocal = onSnapshot(q, (snapshot) => {
        const updatedBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        setBookings(updatedBookings);
        
        if (selectedBooking) {
          const updated = updatedBookings.find(b => b.id === selectedBooking.id);
          if (updated) setSelectedBooking(updated);
        }
        
        setLoading(false);
      }, (error) => {
        console.warn("Real-time bookings failed, trying API fallback:", error.message);
        fetchViaApi();
      });
    };

    const fetchViaApi = async () => {
      try {
        const { data } = await axios.get('/api/bookings');
        setBookings(data);
        if (selectedBooking) {
          const updated = data.find((b: any) => b.id === selectedBooking.id);
          if (updated) setSelectedBooking(updated);
        }
      } catch (apiErr: any) {
        console.error("Booking fetch failed via both methods:", apiErr.message || apiErr);
      } finally {
        setLoading(false);
      }
    };

    if (auth.currentUser || user) {
      startListener();
    } else {
      fetchViaApi();
    }

    return () => unsubscribeLocal();
  }, [user?.id, selectedBooking?.id]);

  const handleCancel = async (id: string) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        await updateDoc(doc(db, 'bookings', id), {
          status: 'cancelled',
          updatedAt: new Date().toISOString()
        });
        setSelectedBooking(null);
      } catch (e) {
        console.warn("Direct cancel failed, trying API fallback:", e);
        try {
           await axios.patch(`/api/bookings/${id}`, { status: 'cancelled' });
           setSelectedBooking(null);
           // Refresh list
           const { data } = await axios.get('/api/bookings');
           setBookings(data);
        } catch (apiErr) {
           console.error("Failed to cancel via both methods:", apiErr);
        }
      }
    }
  };

  const getStatusLabel = (status: Booking['status']) => {
    switch (status) {
      case 'pending': return 'Booking Received';
      case 'pending_callback': return 'Pending callback';
      case 'approved': return 'Approved';
      case 'dispatched': return 'Dispatched';
      case 'on_the_way': return 'On the way';
      case 'arriving': return 'Arriving to Your Location';
      case 'arrived': return 'Arrived';
      case 'process_started': return 'Process Started';
      case 'repair_started': return 'Repair Started';
      case 'repair_completed': return 'Repair Completed';
      case 'payment_received': return 'Payment Received';
      case 'completed': return 'Completed';
      case 'rejected': return 'Rejected';
      case 'cancelled': return 'Cancelled';
      default: return (status as string).replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    }
  };

  const STATUS_STEPS: Booking['status'][] = [
    'pending_callback',
    'approved',
    'on_the_way',
    'arrived',
    'process_started',
    'repair_started',
    'repair_completed',
    'payment_received',
    'completed'
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-[#2F70E9] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const history = selectedBooking?.statusHistory || [];
  const recentHistory = history.slice(-2).reverse();

  return (
    <div className="bg-[#F8F9FB] min-h-screen">
      <AnimatePresence>
        {selectedBooking && selectedBooking.status === 'completed' && !selectedBooking.reviewed && !showReview && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-24 left-6 right-6 z-[60] bg-[#2F70E9] p-6 rounded-[32px] text-white shadow-2xl shadow-blue-200/50 flex items-center justify-between"
          >
            <div>
              <h4 className="font-black text-sm tracking-tight">Service Completed!</h4>
              <p className="text-[10px] font-bold text-white/70">Share your feedback to earn 10 points</p>
            </div>
            <button 
              onClick={() => setShowReview(true)}
              className="bg-white text-[#2F70E9] px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              Rate Now
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <AnimatePresence>
        {showReview && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReview(false)} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }} 
              className="bg-white w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl relative z-10 p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Your Feedback</h3>
                <button onClick={() => setShowReview(false)} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-400">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-10">
                {/* Tech Review */}
                <section>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4 underline decoration-[#2F70E9] decoration-2 underline-offset-4">Technician Review</label>
                  <div className="flex gap-2 mb-4">
                    {[1,2,3,4,5].map(star => (
                      <button key={star} onClick={() => setReviewData({...reviewData, techRating: star})} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${reviewData.techRating >= star ? 'bg-amber-400 text-white shadow-lg shadow-amber-100' : 'bg-gray-50 text-gray-200'}`}>
                        <Star size={24} fill={reviewData.techRating >= star ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                  <textarea 
                    placeholder="Tell us about the technician's professionalism..."
                    value={reviewData.techFeedback}
                    onChange={e => setReviewData({...reviewData, techFeedback: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-3xl p-6 text-sm font-bold min-h-[100px] outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </section>

                {/* App Review */}
                <section>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-4 underline decoration-[#2F70E9] decoration-2 underline-offset-4">App Ease of Use</label>
                  <div className="flex gap-2 mb-4">
                    {[1,2,3,4,5].map(star => (
                      <button key={star} onClick={() => setReviewData({...reviewData, appRating: star})} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${reviewData.appRating >= star ? 'bg-blue-500 text-white shadow-lg shadow-blue-100' : 'bg-gray-50 text-gray-200'}`}>
                        <Star size={24} fill={reviewData.appRating >= star ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                  <textarea 
                    placeholder="Any suggestions for our platform?"
                    value={reviewData.appSuggestions}
                    onChange={e => setReviewData({...reviewData, appSuggestions: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-3xl p-6 text-sm font-bold min-h-[100px] outline-none focus:ring-4 focus:ring-blue-100 transition-all"
                  />
                </section>

                <button 
                  onClick={submitReview}
                  disabled={!reviewData.techRating || !reviewData.appRating}
                  className="w-full py-5 bg-[#2F70E9] text-white rounded-[28px] font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Send size={18} /> Submit Review
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {!selectedBooking ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="p-6 pb-28 max-w-xl mx-auto"
          >
            <header className="mb-8 text-center sm:text-left">
              <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display mb-6">My Orders</h1>
              
              <div className="flex bg-white p-1.5 rounded-[24px] shadow-sm border border-gray-100">
                <button 
                  onClick={() => setActiveTab('services')}
                  className={`flex-1 py-3 px-4 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'services' ? 'bg-[#2F70E9] text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Bike size={14} /> Services
                </button>
                <button 
                  onClick={() => setActiveTab('products')}
                  className={`flex-1 py-3 px-4 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'products' ? 'bg-[#2F70E9] text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <Package size={14} /> Products
                </button>
                <button 
                  onClick={() => setActiveTab('rewards')}
                  className={`flex-1 py-3 px-4 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'rewards' ? 'bg-[#2F70E9] text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <GiftIcon size={14} /> Rewards
                </button>
              </div>
            </header>

            {activeTab === 'services' && (
              <div className="space-y-5">
                {bookings.length === 0 ? (
                  <div className="bg-white p-14 rounded-[48px] text-center border border-gray-50 shadow-sm mt-10">
                     <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-8">
                        <AlertCircle className="text-gray-200" size={48} />
                     </div>
                     <h3 className="font-black text-2xl text-gray-900 font-display">No active bookings</h3>
                     <p className="text-sm font-bold text-gray-400 mt-3 max-w-[200px] mx-auto leading-relaxed">Book your first service and track it here in real-time.</p>
                     <button 
                      onClick={() => navigate('/')}
                      className="mt-10 bg-[#2F70E9] text-white px-12 py-5 rounded-[28px] text-sm font-black shadow-xl shadow-blue-100/50 active:scale-95 transition-transform"
                     >
                       Book Service
                     </button>
                  </div>
                ) : (
                  bookings.map((booking) => (
                    <motion.div
                      key={booking.id}
                      layoutId={`card-${booking.id}`}
                      onClick={() => setSelectedBooking(booking)}
                      whileTap={{ scale: 0.98 }}
                      className="bg-white p-5 rounded-[28px] border border-gray-50 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex items-center justify-between cursor-pointer group hover:border-[#2F70E9]/20 transition-all font-display"
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2.5 mb-2.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                            booking.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                            booking.status === 'rejected' || booking.status === 'cancelled' ? 'bg-rose-50 text-rose-600' :
                            'bg-blue-50 text-[#2F70E9]'
                          }`}>
                            {booking.status.replace('_', ' ')}
                          </span>
                          <div className="text-[9px] text-gray-300 font-mono font-black">
                             #{booking.id.slice(-6).toUpperCase()}
                          </div>
                        </div>
                        <h4 className="text-base font-black text-gray-900 truncate mb-1">
                          {booking.problem}
                        </h4>
                        <div className="flex items-center gap-2.5">
                           <div className="flex items-center gap-1 text-[10px] font-black text-gray-400">
                              <Calendar size={10} className="text-[#2F70E9]" />
                              {booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'N/A'}
                           </div>
                           <div className="w-1 h-1 bg-gray-100 rounded-full" />
                           <p className="text-[10px] font-black text-[#2F70E9] uppercase tracking-tighter">Rs{booking.total}</p>
                        </div>
                      </div>
                      <div className="w-10 h-10 bg-[#F8F9FB] rounded-xl flex items-center justify-center text-gray-300 group-hover:bg-[#2F70E9] group-hover:text-white transition-all shadow-sm">
                        <ChevronRight size={20} strokeWidth={3} />
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'products' && (
              <div className="bg-white p-14 rounded-[48px] text-center border border-gray-50 shadow-sm mt-10">
                 <div className="w-24 h-24 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-8">
                    <Package className="text-[#2F70E9]" size={48} />
                 </div>
                 <h3 className="font-black text-2xl text-gray-900 font-display">Products Store</h3>
                 <p className="text-sm font-bold text-gray-400 mt-3 max-w-[200px] mx-auto leading-relaxed">Coming soon – Tech gadgets delivery in 1–2 days</p>
              </div>
            )}

            {activeTab === 'rewards' && (
              <div className="space-y-5">
                <div className="bg-white p-14 rounded-[48px] text-center border border-gray-50 shadow-sm mt-10">
                   <div className="w-24 h-24 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-8">
                      <GiftIcon className="text-amber-500" size={48} />
                   </div>
                   <h3 className="font-black text-2xl text-gray-900 font-display">Your Rewards</h3>
                   <p className="text-sm font-bold text-gray-400 mt-3 max-w-[200px] mx-auto leading-relaxed">Claim gifts and track their delivery right here.</p>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="p-6 pb-28 max-w-xl mx-auto"
          >
            {/* Header with Back */}
            <header className="flex items-center gap-4 mb-8">
              <button onClick={() => setSelectedBooking(null)} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
                <ChevronLeft size={24} />
              </button>
              <h1 className="text-xl font-black text-gray-900 tracking-tight font-display">Order Details</h1>
            </header>

            {/* OTP Section IF technician assigned */}
            {selectedBooking.technicianId && selectedBooking.serviceOTP && !selectedBooking.serviceOTPVerified && (
              <div className="bg-gradient-to-r from-[#2F70E9] to-blue-600 p-6 rounded-[32px] shadow-xl shadow-blue-100 flex items-center justify-between mb-6 group overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-500" />
                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-white/70 mb-1">
                    <ShieldCheck size={12} />
                    <span className="text-[10px] font-black uppercase tracking-widest font-mono">Service OTP</span>
                  </div>
                  <p className="text-[11px] font-bold text-white/90 leading-tight">Share this with technician to start service</p>
                </div>
                <div className="relative z-10 bg-white/20 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/30">
                  <span className="text-2xl font-black text-white tracking-[0.2em] font-mono">{selectedBooking.serviceOTP}</span>
                </div>
              </div>
            )}

            {/* Technician Info */}
            {selectedBooking.technicianId && selectedBooking.technicianData && (
              <div className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm mb-6">
                <div className="flex items-center gap-4 mb-6">
                  <img 
                    src={selectedBooking.technicianData.photo || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&q=80&w=200'} 
                    alt="Tech" 
                    className="w-16 h-16 rounded-2xl object-cover shadow-sm bg-gray-100"
                  />
                  <div className="flex-1">
                    <p className="text-[9px] font-black text-[#2F70E9] uppercase tracking-widest mb-0.5">Assigned Technician</p>
                    <h3 className="text-lg font-black text-gray-900">{selectedBooking.technicianData.name}</h3>
                    <p className="text-[10px] font-bold text-gray-400">TurboTech Professional Specialist</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <a href={`tel:${selectedBooking.technicianData.phone}`} className="flex items-center justify-center gap-2 py-4 bg-gray-50 rounded-2xl text-[#2F70E9] font-black text-[12px] uppercase tracking-wider active:bg-gray-100 transition-colors">
                    <PhoneCall size={16} /> Call
                  </a>
                  <a href={`https://wa.me/${selectedBooking.technicianData.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-4 bg-green-50 rounded-2xl text-green-600 font-black text-[12px] uppercase tracking-wider active:bg-green-100 transition-colors">
                    <MessageSquare size={16} /> WhatsApp
                  </a>
                </div>
              </div>
            )}

            {/* Nav Cards */}
            <div className="grid grid-cols-2 gap-4 mb-4">
               <div className="bg-white p-5 rounded-[32px] border border-gray-50 shadow-sm overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-gray-50 rounded-full -mr-8 -mt-8 opacity-50"></div>
                  <div className="flex items-center gap-1.5 text-gray-300 mb-1 relative">
                    <Navigation size={10} className="rotate-45" />
                    <span className="text-[8px] font-black uppercase tracking-widest font-mono">DISTANCE</span>
                  </div>
                  <div className="flex items-baseline gap-1 relative">
                    <span className="text-2xl font-black text-gray-900 font-display">{selectedBooking.distance?.toFixed(1) || '0.0'}</span>
                    <span className="text-[10px] font-black text-gray-400 uppercase">km</span>
                  </div>
               </div>
               <div className="bg-[#2F70E9] p-5 rounded-[32px] shadow-lg shadow-blue-100 overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -mr-8 -mt-8"></div>
                  <div className="flex items-center gap-1.5 text-white/60 mb-1 relative">
                    <Clock size={10} />
                    <span className="text-[8px] font-black uppercase tracking-widest font-mono">TIME ETA</span>
                  </div>
                  <div className="flex items-baseline gap-1 relative">
                    <span className="text-2xl font-black text-white font-display">{dynamicEta || selectedBooking.eta || '20-25'}</span>
                    <span className="text-[10px] font-black text-white/60 uppercase">min</span>
                  </div>
                  {selectedBooking.status === 'on_the_way' && (
                  <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full">
                     <motion.div 
                        initial={{ width: '100%' }}
                        animate={{ width: '0%' }}
                        transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
                        className="h-full bg-white"
                     />
                  </div>
                  )}
               </div>
            </div>

            {/* Status Card */}
            <div className="bg-white p-6 rounded-[32px] border border-gray-50 shadow-[0_10px_30px_rgba(0,0,0,0.02)] mb-4">
               <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-[#2F70E9]">
                      <Bike size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 font-display">Live Tracking</h4>
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest font-mono">{selectedBooking.id.slice(-8).toUpperCase()}</p>
                    </div>
                  </div>
                  <div className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse ${
                    selectedBooking.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-[#2F70E9]'
                  }`}>
                    Live
                  </div>
               </div>
               
               <div className="space-y-5 mb-6 relative">
                  {recentHistory.map((item, idx) => (
                    <div key={idx} className="flex gap-4 items-start relative z-10">
                       <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full border-2 transition-all ${
                            selectedBooking.status === 'rejected' ? 'bg-rose-500 border-rose-100' :
                            idx === 0 ? 'bg-[#2F70E9] border-blue-100 scale-110' : 'bg-gray-100 border-white'
                          }`} />
                          {idx === 0 && recentHistory.length > 1 && <div className="w-0.5 h-6 bg-gray-50" />}
                       </div>
                       <div>
                          <p className={`text-sm font-black ${idx === 0 ? 'text-gray-900' : 'text-gray-300'} font-display leading-tight`}>
                            {getStatusLabel(item.status)}
                          </p>
                          <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mt-0.5 font-mono">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                       </div>
                    </div>
                  ))}
               </div>

               <button 
                onClick={() => setShowFullStatus(!showFullStatus)}
                className="w-full py-3.5 bg-[#F8F9FB] rounded-[20px] text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2 transition-colors hover:text-gray-600"
               >
                 {showFullStatus ? 'Less' : 'More Details'}
                 <ChevronDown size={14} className={`transition-transform duration-300 ${showFullStatus ? 'rotate-180' : ''}`} />
               </button>

               <AnimatePresence>
                 {showFullStatus && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-8 pt-8 border-t border-gray-50 space-y-8">
                          {STATUS_STEPS.map((stepStatus, idx) => {
                            const historyItem = history.find(h => h.status === stepStatus);
                            const isCompleted = history.some(h => h.status === stepStatus && h.status !== selectedBooking.status);
                            const isCurrent = selectedBooking.status === stepStatus;
                            const inHistory = history.some(h => h.status === stepStatus);
                            
                            // Dot Color Logic per user request:
                            // every status is completed: blue dot
                            // pending status (current): yellow dot
                            // rejected status: red dot
                            let dotColor = 'bg-gray-100 border-gray-100';
                            if (selectedBooking.status === 'rejected') {
                               if (isCurrent) dotColor = 'bg-rose-500 border-rose-100';
                               else if (inHistory) dotColor = 'bg-[#007AFF] border-blue-100';
                            } else {
                              if (isCurrent) dotColor = 'bg-[#FFCC00] border-amber-100'; // Yellow dot for pending/current
                              else if (inHistory || isCompleted) dotColor = 'bg-[#007AFF] border-blue-100'; // Blue for completed
                            }

                            return (
                              <div key={stepStatus} className="flex gap-5 items-start group">
                                <div className="flex flex-col items-center">
                                    <div className={`w-8 h-8 rounded-full border border-white shadow-sm flex items-center justify-center text-[11px] font-black transition-all ${dotColor} ${inHistory || isCurrent ? 'text-white' : 'text-gray-300'}`}>
                                      {idx + 1}
                                    </div>
                                    {idx < STATUS_STEPS.length - 1 && (
                                      <div className={`w-0.5 h-10 ${inHistory && !isCurrent ? 'bg-blue-100' : 'bg-gray-50'}`} />
                                    )}
                                </div>
                                <div className="flex-1 pt-1.5 transition-all">
                                    <p className={`text-[14px] font-black ${isCurrent ? 'text-gray-900 scale-105 origin-left' : inHistory ? 'text-gray-600' : 'text-gray-300'} font-display`}>
                                      {getStatusLabel(stepStatus)}
                                    </p>
                                    {isCurrent && (
                                      <motion.div 
                                        initial={{ width: 0 }}
                                        animate={{ width: 'auto' }}
                                        className="inline-flex mt-1.5"
                                      >
                                        <p className="text-[9px] font-black text-[#007AFF] uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded leading-none">AWAITING COMPLETION</p>
                                      </motion.div>
                                    )}
                                    {historyItem && !isCurrent && (
                                      <p className="text-[10px] font-bold text-gray-300 mt-1 uppercase tracking-tight">
                                        {new Date(historyItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    )}
                                </div>
                              </div>
                            );
                          })}
                          {(selectedBooking.status === 'rejected' || selectedBooking.status === 'cancelled') && (
                            <div className="flex gap-5 items-start">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-black border-2 border-white shadow-sm ${selectedBooking.status === 'rejected' ? 'bg-rose-500' : 'bg-gray-500'}`}>
                                !
                              </div>
                              <div className="pt-1.5">
                                  <p className={`text-[14px] font-black font-display ${selectedBooking.status === 'rejected' ? 'text-rose-600' : 'text-gray-600'}`}>
                                    {selectedBooking.status === 'rejected' ? 'Service Rejected' : 'Service Cancelled'}
                                  </p>
                                  <p className="text-[10px] font-bold text-gray-300 mt-1 uppercase tracking-widest">Termination reached</p>
                              </div>
                            </div>
                          )}
                      </div>
                    </motion.div>
                 )}
               </AnimatePresence>
            </div>

            {/* Map */}
            <div className="bg-white p-4 rounded-[48px] border border-gray-50 shadow-[0_12px_40px_rgba(0,0,0,0.02)] mb-5 h-[320px] overflow-hidden relative group">
               <MapContainer 
                  center={[selectedBooking.location?.lat || 12.1186, selectedBooking.location?.lng || 76.6800]} 
                  zoom={14} 
                  style={{ height: '100%', width: '100%', borderRadius: '40px' }}
                  zoomControl={false}
               >
                 <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                 <Marker position={[selectedBooking.location?.lat || 12.1186, selectedBooking.location?.lng || 76.6800]} icon={markerIcon} />
                 {selectedBooking.techLocationShareEnabled && selectedBooking.techLocation && (
                    <Marker position={[selectedBooking.techLocation.lat, selectedBooking.techLocation.lng]} icon={techIcon} />
                 )}
               </MapContainer>
               
               {selectedBooking.techLocationShareEnabled && (
               <div className="absolute top-8 left-8 z-[1000]">
                  <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-xl flex items-center gap-3">
                    <div className="w-2 h-2 bg-[#007AFF] rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest font-mono">Agent on route</span>
                  </div>
               </div>
               )}

               <div className="absolute bottom-8 right-8 z-[1000] flex flex-col gap-2">
                  <button className="w-10 h-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-600 shadow-lg active:scale-95 transition-all text-xl font-black">+</button>
                  <button className="w-10 h-10 bg-white border border-gray-100 rounded-2xl flex items-center justify-center text-gray-600 shadow-lg active:scale-95 transition-all text-xl font-black">−</button>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[48px] border border-gray-50 shadow-[0_12px_40px_rgba(0,0,0,0.02)] mb-5">
               <div className="flex items-center gap-4 p-4 bg-[#F8F9FB] rounded-[28px] border border-gray-100 shadow-inner">
                 <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-[#2F70E9] shadow-sm">
                    <Bike size={20} />
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5 font-mono">CURRENT STAGE</p>
                    <p className="text-[13px] font-black text-gray-900 uppercase tracking-tight">{getStatusLabel(selectedBooking.status)}</p>
                 </div>
               </div>
            </div>

            {/* Service info */}
            <div className="bg-white p-10 rounded-[48px] border border-gray-50 shadow-[0_12px_40px_rgba(0,0,0,0.02)] mb-5">
               <div className="flex justify-between items-start mb-10">
                  <div>
                    <h5 className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2 font-mono">TOTAL CHARGE</h5>
                    <p className="text-4xl font-black text-gray-900 leading-none font-display">Rs{selectedBooking.total}</p>
                  </div>
                  <div className="bg-[#2F70E9]/5 w-14 h-14 rounded-[24px] flex items-center justify-center text-[#2F70E9] border border-blue-50/50">
                    <CheckCircle2 size={32} strokeWidth={2.5} />
                  </div>
               </div>

               <div className="space-y-8">
                  <div className="p-5 bg-gray-50/50 rounded-3xl border border-gray-50">
                    <h6 className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-3 font-mono">DESTINATION</h6>
                    <p className="text-sm font-bold text-gray-900 leading-relaxed">
                      {selectedBooking.address}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-6 px-1">
                    <div>
                      <h6 className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2 font-mono">CLIENT</h6>
                      <p className="text-sm font-black text-gray-900">{selectedBooking.customerName}</p>
                    </div>
                    <div>
                      <h6 className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-2 font-mono">CONTACT</h6>
                      <p className="text-sm font-black text-gray-900">{selectedBooking.phone}</p>
                    </div>
                  </div>
               </div>
            </div>

            {/* Repair Notes */}
            <div className="bg-white p-10 rounded-[48px] border border-gray-50 shadow-[0_12px_40px_rgba(0,0,0,0.02)] mb-5">
               <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gray-50 rounded-[20px] flex items-center justify-center text-gray-400">
                    <AlertCircle size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h5 className="text-[15px] font-black text-gray-900 font-display">Description</h5>
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Client notes</p>
                  </div>
               </div>
               <p className="text-[14px] font-bold text-gray-500 leading-relaxed px-1">
                  {selectedBooking.problem}
               </p>
            </div>

            {/* Photo Preview if exists */}
            {selectedBooking.housePhoto && (
              <div className="bg-white p-10 rounded-[48px] border border-gray-50 shadow-[0_12px_40px_rgba(0,0,0,0.02)] mb-5">
                <header className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gray-50 rounded-[20px] flex items-center justify-center text-gray-400">
                    <MapPin size={24} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h5 className="text-[15px] font-black text-gray-900 font-display">Target Location</h5>
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none mt-1">Identification photo</p>
                  </div>
                </header>
                <img 
                    src={selectedBooking.housePhoto} 
                    alt="House" 
                    className="w-full h-56 object-cover rounded-[32px] border border-gray-50 shadow-inner"
                />
              </div>
            )}

            {/* Invoice */}
            <div className="bg-white p-10 rounded-[48px] border border-gray-50 shadow-[0_12px_40px_rgba(0,0,0,0.02)] mb-8">
                <header className="flex items-center gap-4 mb-8">
                   <div className="w-12 h-12 bg-blue-50 rounded-[20px] flex items-center justify-center text-[#2F70E9]">
                     <FileText size={24} strokeWidth={2.5} />
                   </div>
                   <div>
                    <h5 className="text-[15px] font-black text-gray-900 font-display">Invoice</h5>
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest leading-none mt-1">Payment Breakdown</p>
                  </div>
                </header>
                
                <div className="space-y-5 mb-8 border-b border-gray-50 pb-8">
                   <div className="flex justify-between text-[14px] font-bold text-gray-400">
                      <span>Service Charges</span>
                      <span className="text-gray-900 font-black font-mono">Rs{selectedBooking.serviceCharge}</span>
                   </div>
                   <div className="flex justify-between text-[14px] font-bold text-gray-400">
                      <span>Parts & Components</span>
                      <span className="text-gray-900 font-black font-mono">Rs{selectedBooking.partsCost || 0}</span>
                   </div>
                   <div className="flex justify-between text-xl font-black text-gray-900 pt-4">
                      <span className="font-display">Total Due</span>
                      <span className="text-[#2F70E9] font-mono">Rs{selectedBooking.total}</span>
                   </div>
                </div>

                <div className="bg-[#F8F9FB] p-4 rounded-2xl border border-gray-100 flex items-center gap-3">
                   <AlertCircle size={14} className="text-gray-300" />
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight italic">
                      Breakdown provided by field technician.
                   </p>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-5 mb-5">
               <motion.button 
                whileTap={{ scale: 0.95 }}
                className="bg-white border border-gray-100 py-6 rounded-[32px] text-xs font-black uppercase tracking-widest text-gray-400 shadow-sm active:bg-gray-50 transition-all font-mono"
               >
                 Reschedule
               </motion.button>
               <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCancel(selectedBooking.id)}
                className="bg-rose-500 text-white py-6 rounded-[32px] text-xs font-black uppercase tracking-widest shadow-xl shadow-rose-100 flex items-center justify-center gap-2 active:bg-rose-600 transition-all font-mono"
               >
                 <X size={18} strokeWidth={3} /> Abort
               </motion.button>
            </div>
            
            <div className="grid grid-cols-2 gap-5">
               <motion.button 
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedBooking(null)}
                className="bg-white border border-gray-100 py-6 rounded-[32px] text-xs font-black uppercase tracking-widest text-gray-400 shadow-sm active:bg-gray-50 transition-all font-mono"
               >
                 Go back
               </motion.button>
               <motion.a 
                whileTap={{ scale: 0.95 }}
                href="tel:+919876543210"
                className="bg-[#2F70E9] text-white py-6 rounded-[32px] text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-100/50 flex items-center justify-center gap-2 active:bg-blue-700 transition-all font-mono"
               >
                 <PhoneCall size={18} strokeWidth={3} /> Contact
               </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
