import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../contexts/AuthContext';
import { db, auth } from '../../lib/firebase';
import { collection, addDoc, query, where, getDocs, limit } from 'firebase/firestore';
import axios from 'axios';
import { 
  MapPin, 
  ChevronLeft, 
  Clock, 
  Search,
  Navigation,
  Camera,
  ArrowRight,
  ChevronRight,
  CheckCircle2,
  Zap,
  AlertCircle,
  Gift,
  Lock
} from 'lucide-react';

const NANJANGUD_CENTER: [number, number] = [12.1186, 76.6800];
const DISPATCH_POINT: [number, number] = [12.108372, 76.665028];

const SERVICE_PRICES: Record<string, number> = {
  'PC Repair': 200,
  'Desktop Setup': 299,
  'Software Installation': 149,
  'OS Install': 499,
  'Virus Removal': 249,
  'Quick Booking': 149
};

function LocationPicker({ position, setPosition }: { position: [number, number] | null, setPosition: (pos: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });

  const customerIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return position ? <Marker position={position} icon={customerIcon} /> : null;
}

function MapUpdater({ position }: { position: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);
  return null;
}

// Haversine distance formula
function getDistance(p1: [number, number], p2: [number, number]) {
  const R = 6371; // km
  const dLat = (p2[0] - p1[0]) * Math.PI / 180;
  const dLon = (p2[1] - p1[1]) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function BookingView() {
  const { user, login, updateProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const isQuick = searchParams.get('quick') === 'true';
  const initialService = searchParams.get('service') || (isQuick ? 'Quick Booking' : 'PC Repair');
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    problem: initialService,
    date: '',
    timeSlot: '',
    image: null as string | null
  });
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [distance, setDistance] = useState<number | null>(null);
  const [eta, setEta] = useState<string>('15-20 min');
  const [isFirstOrder, setIsFirstOrder] = useState(false);
  
  // Guest Flow States
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        name: user.name || '',
        phone: user.phone || ''
      }));

      // Check if it's the first order
      const checkFirstOrder = async () => {
        // Only attempt if authenticated on frontend
        if (!auth.currentUser) {
          console.log("[Booking] Auth not ready on frontend, skipping direct Firestore check for first order");
          setIsFirstOrder(true);
          return;
        }

        try {
          const q = query(
            collection(db, 'bookings'),
            where('customerId', '==', user.id),
            limit(1)
          );
          const snapshot = await getDocs(q);
          setIsFirstOrder(snapshot.empty);
        } catch (err) {
          console.warn("First order check failed (likely auth), assuming first time:", err);
          setIsFirstOrder(true);
        }
      };
      if (user.id) checkFirstOrder();
    }
  }, [user]);

  useEffect(() => {
    if (position) {
      const d = getDistance(DISPATCH_POINT, position);
      setDistance(d);
      
      // Calculation Logic:
      // Prep: 5 min
      // Travel: 1 km = 10 min (as per user request)
      // Dispatch/Buffer: 5 min
      const travelTime = d * 10;
      const totalMin = Math.round(5 + travelTime + 5);
      setEta(`${totalMin}-${totalMin + 5} min`);
    } else {
      setDistance(null);
      setEta('15-20 min');
    }
  }, [position]);

  const useCurrentLocation = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
      }, (err) => {
        setError("Location access denied or unavailable.");
      });
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        alert('Please upload only JPG or PNG images for security.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const processBooking = async (customerId: string, firstOrder: boolean) => {
    const bookingData = {
      customerId: customerId,
      customerName: form.name,
      phone: form.phone,
      address: form.address,
      problem: form.problem,
      date: isQuick ? null : form.date,
      timeSlot: isQuick ? 'ASAP' : form.timeSlot,
      location: { lat: position![0], lng: position![1] },
      status: 'pending_callback',
      statusHistory: [{
        status: 'pending_callback',
        timestamp: new Date().toISOString()
      }],
      serviceCharge: currentPrice,
      partsCost: 0,
      total: currentPrice,
      housePhoto: form.image,
      distance,
      eta,
      isFirstOrder: firstOrder,
      appliedOffer: firstOrder ? 'First Booking Gift' : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      console.log("Attempting booking with direct Firestore write...");
      const docRef = await addDoc(collection(db, 'bookings'), bookingData);
      navigate(`/success/${docRef.id}`);
    } catch (err: any) {
      console.warn("Direct Firestore write failed, trying API fallback:", err);
      try {
        console.log('[Booking] Using API fallback to create booking...');
        const { data } = await axios.post(`${import.meta.env.VITE_API_URL}/api/bookings`, bookingData);
        console.log('[Booking] Booking created successfully:', data.id);
        navigate(`/success/${data.id}`);
      } catch (apiErr: any) {
        console.error("Booking failed via both direct and API:", apiErr);
        const errorMsg = apiErr.response?.data?.details || apiErr.response?.data?.error || apiErr.message || 'Booking failed. Please try again.';
        throw new Error(errorMsg);
      }
    }
  };

  const handleVerifyAndConfirm = async () => {
    if (otp.length !== 6) return;
    setOtpLoading(true);
    setError('');
    try {
      console.log('[Booking] Verifying OTP...');
      const { user: newUser, isNewUser } = await login(form.phone, otp);
      console.log('[Booking] OTP verified, user:', newUser.id);
      
      // Update name if new user
      if (isNewUser && form.name) {
        await updateProfile(form.name);
      }

      // Check first order logic for newly logged in user
      let isFirst = true;
      if (auth.currentUser) {
        try {
          const q = query(
            collection(db, 'bookings'),
            where('customerId', '==', newUser.id),
            limit(1)
          );
          const snapshot = await getDocs(q);
          isFirst = snapshot.empty;
        } catch (err) {
          console.warn("First order check failed during guest conversion:", err);
        }
      }

      await processBooking(newUser.id, isFirst);
    } catch (err: any) {
      console.error("[Booking] Verification failed:", err);
      const apiError = err.response?.data?.error || err.message || 'Verification failed. Please check the code.';
      setError(apiError);
      setOtpLoading(false);
      // Keep modal open so user can retry
      setOtp(''); // Clear OTP field for a fresh start
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!position) return setError('Please pin your location on the map');
    if (distance && distance > 5) return setError('Service available only within 5km of our dispatch point');
    
    if (!form.name || !form.phone || !form.address || !form.problem) {
      return setError('Please fill all required fields');
    }
    if (!isQuick && (!form.date || !form.timeSlot)) {
      return setError('Please pick a date and time slot');
    }

    if (!user) {
      // Guest Flow: Send OTP
      setLoading(true);
      setError('');
      try {
        console.log('[Booking] Sending OTP to:', form.phone);
        await axios.post(`${import.meta.env.VITE_API_URL}/api/send-otp`, { phone: form.phone });
        setShowOtpModal(true);
      } catch (err: any) {
        console.error('[Booking] Send OTP failed:', err);
        const apiError = err.response?.data?.error || err.message || 'Failed to send OTP';
        setError(apiError);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      if (!user?.id) {
        throw new Error('User context missing. Please sign in again.');
      }
      await processBooking(user.id, isFirstOrder);
    } catch (err: any) {
      console.error("Detailed Booking Error:", err);
      let errorMsg = 'Booking failed. Please try again.';
      
      if (err.code === 'permission-denied') {
        errorMsg = 'Permission denied. You might not have authorization to perform this action. Try logging out and back in.';
      } else if (err.message) {
        errorMsg = `Error: ${err.message}`;
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const currentPrice = SERVICE_PRICES[form.problem] || 149;

  return (
    <div className="bg-[#F8F9FB] min-h-screen pb-10">
      {/* Header */}
      <header className="px-5 py-4 flex items-center bg-white sticky top-0 z-50 shadow-sm border-b border-gray-50">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2.5 text-gray-900 group">
          <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center group-active:bg-gray-100 transition-colors">
            <ChevronLeft size={18} className="text-gray-600" />
          </div>
          <span className="text-sm font-black">Booking info</span>
        </button>
      </header>

      <main className="max-w-xl mx-auto p-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-[32px] border border-gray-100 shadow-[0_8px_40px_rgba(0,0,0,0.02)] overflow-hidden">
          {/* Top Title Section */}
          <div className="px-6 py-6 border-b border-gray-50 bg-[#2F70E9]/5 backdrop-blur-md">
            <p className="text-[9px] font-black text-[#2F70E9] uppercase tracking-widest mb-1.5">Service Details</p>
            <div className="flex justify-between items-start gap-4">
               <div className="flex-1">
                 <h1 className="text-xl font-black text-gray-900 tracking-tight leading-tight font-display">{form.problem}</h1>
                 {isFirstOrder && (
                   <motion.div 
                     initial={{ opacity: 0, x: -10 }}
                     animate={{ opacity: 1, x: 0 }}
                     className="mt-1.5 flex items-center gap-1.5"
                   >
                     <div className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                       <Gift size={10} /> Free Gift Applied
                     </div>
                   </motion.div>
                 )}
               </div>
               <div className="text-right shrink-0">
                <span className="text-[#2F70E9] font-black text-lg font-display">Rs{currentPrice}+</span>
                <p className="text-[9px] font-bold text-gray-400 mt-0.5 uppercase tracking-tighter">ESTIMATED</p>
               </div>
            </div>
          </div>

          <div className="p-6 space-y-8">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-[10px] font-black border border-rose-100 uppercase tracking-tight"
              >
                {error}
              </motion.div>
            )}

            {/* Inputs */}
            <div className="space-y-6">
              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-gray-900 px-1 uppercase tracking-tight opacity-60">Full name</label>
                <input
                  type="text"
                  placeholder="Your Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-5 py-4 bg-[#F8F9FB] border border-gray-100 rounded-2xl focus:ring-4 focus:ring-[#2F70E9]/10 focus:border-[#2F70E9] focus:bg-white focus:outline-none font-black text-gray-900 placeholder:text-gray-400/50 text-sm transition-all"
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-gray-900 px-1 uppercase tracking-tight opacity-60">Mobile number</label>
                <input
                  type="tel"
                  placeholder="10-digit number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className="w-full px-5 py-4 bg-[#F8F9FB] border border-gray-100 rounded-2xl focus:ring-4 focus:ring-[#2F70E9]/10 focus:border-[#2F70E9] focus:bg-white focus:outline-none font-black text-gray-900 placeholder:text-gray-400/50 text-sm transition-all"
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-black text-gray-900 px-1 uppercase tracking-tight opacity-60">Issue description</label>
                <textarea
                  placeholder="What's the issue?"
                  value={form.problem}
                  onChange={(e) => setForm({ ...form, problem: e.target.value })}
                  className="w-full px-5 py-4 bg-[#F8F9FB] border border-gray-100 rounded-2xl focus:ring-4 focus:ring-[#2F70E9]/10 focus:border-[#2F70E9] focus:bg-white focus:outline-none font-black text-gray-900 placeholder:text-gray-400/50 text-sm min-h-[100px] resize-none transition-all"
                />
              </div>
            </div>

            {/* Map Section */}
            <div className="space-y-3.5">
              <div className="flex justify-between items-center px-1">
                <label className="text-[10px] font-black text-gray-900 uppercase tracking-tight opacity-60">Service location</label>
                <button 
                  type="button" 
                  onClick={useCurrentLocation}
                  className="bg-[#2F70E9] text-white px-4 py-2 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-md shadow-blue-100/50 active:scale-95 transition-all uppercase tracking-tighter"
                >
                  <Navigation size={12} fill="white" className="rotate-45" /> Use My GPS
                </button>
              </div>
              <div className="h-48 rounded-[24px] overflow-hidden border border-gray-100 relative shadow-inner z-0">
                <MapContainer 
                  center={NANJANGUD_CENTER} 
                  zoom={14} 
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <LocationPicker position={position} setPosition={setPosition} />
                  <MapUpdater position={position} />
                </MapContainer>
              </div>
            </div>

            {/* Home Address */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-gray-900 px-1 uppercase tracking-tight opacity-60">Address details</label>
              <textarea
                placeholder="Door no, street, landmark..."
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-5 py-4 bg-[#F8F9FB] border border-gray-100 rounded-2xl focus:ring-4 focus:ring-[#2F70E9]/10 focus:border-[#2F70E9] focus:bg-white focus:outline-none font-black text-gray-900 placeholder:text-gray-400/50 text-sm min-h-[80px] resize-none transition-all"
              />
            </div>

            {/* Date Time for Normal Booking */}
            {!isQuick && (
              <div className="space-y-6 pt-1">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-gray-900 px-1 uppercase tracking-tight opacity-60">Select date</label>
                  <input
                    type="date"
                    value={form.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-5 py-4 bg-[#F8F9FB] border border-gray-100 rounded-2xl focus:ring-4 focus:ring-[#2F70E9]/10 focus:border-[#2F70E9] focus:bg-white focus:outline-none font-black text-gray-900 text-sm transition-all shadow-sm"
                  />
                </div>

                <div className="space-y-2.5">
                  <label className="text-[10px] font-black text-gray-900 px-1 uppercase tracking-tight opacity-60">Select time slot</label>
                  <div className="relative">
                    <select
                      value={form.timeSlot}
                      onChange={(e) => setForm({ ...form, timeSlot: e.target.value })}
                      className="w-full px-5 py-4 bg-[#F8F9FB] border border-gray-100 rounded-2xl focus:ring-4 focus:ring-[#2F70E9]/10 focus:border-[#2F70E9] focus:bg-white focus:outline-none font-black text-gray-900 text-sm appearance-none transition-all shadow-sm"
                    >
                      <option value="">Select a slot</option>
                      <option value="9:00 AM - 12:00 PM">09:00 AM - 12:00 PM</option>
                      <option value="12:00 PM - 3:00 PM">12:00 PM - 03:00 PM</option>
                      <option value="3:00 PM - 6:00 PM">03:00 PM - 06:00 PM</option>
                      <option value="6:00 PM - 8:00 PM">06:00 PM - 08:00 PM</option>
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      <ChevronRight size={18} className="rotate-90" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* House Photo */}
            <div className="space-y-3 pt-1">
              <label className="text-[10px] font-black text-gray-900 px-1 uppercase tracking-tight opacity-60">House photo <span className="opacity-40 italic">(Optional)</span></label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  capture="environment"
                  onChange={handleImageChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <motion.div 
                  whileTap={{ scale: 0.98 }}
                  className={`w-full h-40 border-2 border-dashed ${form.image ? 'border-[#2F70E9] bg-[#2F70E9]/5' : 'border-gray-100 bg-[#F8F9FB]'} rounded-[24px] flex flex-col items-center justify-center gap-3 transition-all`}
                >
                  {form.image ? (
                    <img src={form.image} alt="House" className="h-full w-full object-cover rounded-[24px]" />
                  ) : (
                    <>
                      <div className="w-11 h-11 bg-white rounded-2xl shadow-sm border border-gray-50 flex items-center justify-center text-[#2F70E9]">
                        <Camera size={22} strokeWidth={2.5} />
                      </div>
                      <span className="text-[11px] font-black text-[#2F70E9] uppercase tracking-tighter">Snap your house</span>
                    </>
                  )}
                </motion.div>
              </div>
            </div>

            {/* ETA Summary */}
            <div className="bg-[#2F70E9]/5 p-6 rounded-[32px] border border-[#2F70E9]/10 backdrop-blur-sm">
               <div className="flex justify-between items-center mb-5">
                 <div>
                    <h5 className="text-[9px] font-black text-[#2F70E9] uppercase tracking-widest mb-1 font-mono">ESTIMATED ETA</h5>
                    <p className="text-2xl font-black text-gray-900 leading-none font-display">{eta}</p>
                 </div>
                 <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border border-[#2F70E9]/10 shadow-sm shrink-0">
                    <Clock className="text-[#2F70E9]" size={24} />
                 </div>
               </div>
               
               <div className="flex items-center gap-2 p-3 bg-white/50 rounded-xl border border-white/50 backdrop-blur-sm">
                  <div className="w-1.5 h-1.5 bg-[#2F70E9] rounded-full animate-pulse shrink-0" />
                  <p className="text-[10px] font-black text-gray-900 uppercase tracking-tight">
                     {position ? 'Location ready' : 'Pin location above'}
                  </p>
               </div>
            </div>

            <div className="pt-4">
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-[#2F70E9] text-white py-5 rounded-[24px] font-black text-base shadow-xl shadow-blue-100/30 active:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2.5"
              >
                {loading ? (
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Confirm Booking <ArrowRight size={18} strokeWidth={3} />
                  </>
                )}
              </motion.button>
              <p className="text-[9px] font-black text-gray-300 text-center uppercase tracking-widest mt-5">
                Reliable service guaranteed
              </p>
            </div>

          </div>
        </form>
      </main>

      {/* OTP Verification Modal */}
      <AnimatePresence>
        {showOtpModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
              onClick={() => !otpLoading && setShowOtpModal(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl relative z-10 overflow-hidden border border-white/20"
            >
              <div className="p-8">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-[#2F70E9]/10 rounded-full flex items-center justify-center border border-[#2F70E9]/10">
                    <Lock size={32} className="text-[#2F70E9]" strokeWidth={2.5} />
                  </div>
                </div>

                <div className="text-center mb-8">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight mb-2">Verify your number</h3>
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-tight">
                    We've sent a 6-digit code to <br/>
                    <span className="text-[#2F70E9] font-black">{form.phone}</span>
                  </p>
                </div>

                <div className="space-y-6">
                  <input
                    type="tel"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter OTP"
                    className="w-full bg-[#F8F9FB] border border-gray-100 rounded-3xl py-5 px-6 text-center text-2xl font-black tracking-[0.3em] placeholder:tracking-normal placeholder:text-gray-300 focus:ring-4 focus:ring-[#2F70E9]/10 focus:border-[#2F70E9] outline-none transition-all placeholder:text-sm"
                  />

                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center p-3 bg-red-50 rounded-2xl border border-red-100"
                    >
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-tight">
                        {error}
                      </p>
                    </motion.div>
                  )}

                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleVerifyAndConfirm}
                    disabled={otp.length !== 6 || otpLoading}
                    className="w-full bg-[#2F70E9] text-white py-5 rounded-[24px] font-black text-sm shadow-xl shadow-blue-100/50 flex items-center justify-center gap-3 active:bg-blue-700 disabled:opacity-50 transition-all"
                  >
                    {otpLoading ? (
                      <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Verify & Confirm Booking <ArrowRight size={18} strokeWidth={3} />
                      </>
                    )}
                  </motion.button>

                  <button 
                    type="button"
                    onClick={() => setShowOtpModal(false)}
                    disabled={otpLoading}
                    className="w-full py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
