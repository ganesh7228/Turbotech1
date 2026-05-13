import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  serverTimestamp,
  arrayUnion,
  getDoc,
  increment
} from 'firebase/firestore';
import { Booking } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useNotify } from '../../contexts/NotificationContext';
import { 
  MapPin, 
  Phone, 
  CheckCircle2, 
  Navigation, 
  Bike, 
  MapIcon, 
  ShieldCheck, 
  Play, 
  Flag,
  User as UserIcon,
  LayoutDashboard,
  Clock,
  History as HistoryIcon,
  Package,
  Star,
  IndianRupee,
  CheckCircle,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function TechJobs() {
  const { user } = useAuth();
  const { notify } = useNotify();
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [allJobs, setAllJobs] = useState<Booking[]>([]);
  const [sharing, setSharing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifyingOtp, setVerifyingOtp] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');

  const ongoingJobs = jobs.filter(j => !['completed', 'cancelled', 'rejected'].includes(j.status));
  const completedJobs = allJobs.filter(j => j.technicianId === user?.id && j.status === 'completed');
  const todayJobs = allJobs.filter(j => {
    if (!j.createdAt) return false;
    const date = new Date(j.createdAt).toDateString();
    return date === new Date().toDateString() && j.technicianId === user?.id;
  });

  useEffect(() => {
    if (!user) return;
    
    // Listen for jobs assigned to this tech
    const assignedQuery = query(collection(db, 'bookings'), where('technicianId', '==', user.id));
    const unsubAssigned = onSnapshot(assignedQuery, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setJobs(docs);
      setAllJobs(docs); // Use assigned jobs for stats too, as rules prevent reading others
      setLoading(false);
    }, (error) => {
      console.error("Tech jobs lookup failed:", error);
      setLoading(false);
    });

    return () => {
      unsubAssigned();
    };
  }, [user]);

  // Real-time location sharing
  useEffect(() => {
    let watchId: number;
    if (sharing) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          updateDoc(doc(db, 'bookings', sharing), {
            techLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            updatedAt: serverTimestamp()
          });
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [sharing]);

  const updateStatus = async (id: string, status: Booking['status'], extra: any = {}) => {
    try {
      await updateDoc(doc(db, 'bookings', id), {
        status,
        technicianId: user?.id,
        statusHistory: arrayUnion({
          status,
          timestamp: new Date().toISOString()
        }),
        updatedAt: serverTimestamp(),
        ...extra
      });

      // Award Points on completion
      if (status === 'completed') {
        const jobSnap = await getDoc(doc(db, 'bookings', id));
        if (jobSnap.exists()) {
          const booking = jobSnap.data() as Booking;
          const userRef = doc(db, 'users', booking.customerId);
          
          // Add 50 points and increment lifetime points
          await updateDoc(userRef, {
            turboPoints: increment(50),
            lifetimePoints: increment(50)
          });

          // Check for auto-badge promotion
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
             const userData = userSnap.data();
             const lp = userData.lifetimePoints || 0;
             let newBadge = userData.badge || 'Silver';
             
             if (lp >= 5000) newBadge = 'Platinum';
             else if (lp >= 2000) newBadge = 'Gold';
             else newBadge = 'Silver';

             if (newBadge !== userData.badge) {
               await updateDoc(userRef, { badge: newBadge });
             }
          }
        }
      }
    } catch (e) {
      console.error(e);
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

  const handleArrived = async (id: string) => {
    setSharing(null);
    await updateStatus(id, 'arrived', { techLocationShareEnabled: false });
  };

  const StatCircle = ({ icon, label, value, color }: any) => (
    <motion.div 
      whileTap={{ scale: 0.98 }}
      className={`${color} p-4 rounded-[28px] text-white shadow-lg relative overflow-hidden group cursor-pointer`}
    >
      <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500"></div>
      <div className="relative z-10">
        <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mb-3">
          {icon}
        </div>
        <p className="text-[8px] font-black uppercase tracking-widest opacity-80 mb-0.5">{label}</p>
        <h3 className="text-xl font-black font-display">{value}</h3>
      </div>
    </motion.div>
  );

  const handleVerifyOtp = async () => {
    if (!verifyingOtp) return;
    const job = jobs.find(j => j.id === verifyingOtp);
    if (job?.serviceOTP === otpInput) {
       await updateStatus(verifyingOtp, 'process_started', { serviceOTPVerified: true });
       setVerifyingOtp(null);
       setOtpInput('');
       setOtpError('');
    } else {
       setOtpError('Invalid OTP. Please check with customer.');
    }
  };

  if (loading) return <div className="h-screen w-screen flex items-center justify-center">Loading Panel...</div>;

  return (
    <div className="p-6 bg-[#F8F9FB] min-h-screen pb-24">
      <header className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight font-display">Technician Panel</h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Real-time Service Management</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <StatCircle icon={<LayoutDashboard size={18} />} label="Assigned" value={jobs.length} color="bg-[#2F70E9]" />
        <StatCircle icon={<Clock size={18} />} label="Ongoing" value={ongoingJobs.length} color="bg-orange-500" />
        <StatCircle icon={<CheckCircle size={18} />} label="Completed" value={completedJobs.length} color="bg-emerald-500" />
        <StatCircle icon={<Star size={18} />} label="Rating" value="4.9" color="bg-purple-500" />
        <StatCircle icon={<Clock size={18} />} label="Today's jobs" value={todayJobs.length} color="bg-blue-400" />
        <StatCircle icon={<IndianRupee size={18} />} label="Earnings" value="Future" color="bg-gray-400" />
      </div>

      <div className="flex justify-between items-center mb-6 px-1">
        <h2 className="text-xl font-black text-gray-900 tracking-tight font-display">Active Jobs</h2>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-[#2F70E9] rounded-full animate-pulse" />
          <span className="text-[9px] font-black text-[#2F70E9] uppercase tracking-widest">Live Updates</span>
        </div>
      </div>

      <div className="space-y-6">
        {jobs.length === 0 && (
          <div className="py-20 text-center text-gray-400 bg-white rounded-[40px] border border-dashed border-gray-200">
            No active jobs at the moment
          </div>
        )}

        {jobs.map((job) => (
          <div key={job.id} className="bg-white p-6 rounded-[40px] shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-6">
               <div className="flex items-center gap-2">
                 <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                   ['on_the_way', 'arriving', 'process_started', 'repair_started', 'repair_completed', 'payment_received'].includes(job.status) ? 'bg-blue-50 text-blue-600' : 
                   job.status === 'dispatched' ? 'bg-purple-50 text-purple-600' :
                   job.status === 'arrived' ? 'bg-green-50 text-green-600' : 
                   'bg-gray-50 text-gray-400'
                 }`}>
                   {getStatusLabel(job.status)}
                 </span>
                 {job.techLocationShareEnabled && (
                   <span className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-500 text-[10px] font-black rounded-full animate-pulse">
                     <MapIcon size={10} /> LIVE
                   </span>
                 )}
               </div>
               <div className="text-[10px] text-gray-300 font-mono font-black">#{job.id.slice(-6).toUpperCase()}</div>
            </div>

            <h3 className="font-black text-xl mb-6 leading-tight">{job.problem}</h3>

            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-3xl">
                  <div className="bg-white p-2 rounded-xl shadow-sm"><UserIcon size={16} /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Customer</p>
                    <p className="font-black text-xs truncate">{job.customerName}</p>
                  </div>
               </div>
               <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-3xl">
                  <div className="bg-white p-2 rounded-xl shadow-sm"><Phone size={16} className="text-green-500" /></div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Contact</p>
                    <p className="font-black text-xs truncate">{job.phone}</p>
                  </div>
               </div>
            </div>

            <div className="mb-8 p-5 bg-gray-900 rounded-[32px] text-white">
               <div className="flex items-center gap-2 mb-2 text-gray-400">
                  <MapPin size={14} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Location</span>
               </div>
               <p className="text-xs font-bold leading-relaxed">{job.address}</p>
            </div>
              {/* If job is unassigned approved */}
              {!job.technicianId && job.status === 'approved' && (
                <button 
                  onClick={() => updateStatus(job.id, 'approved')} // Just to set technicianId
                  className="w-full bg-[#2F70E9] text-white py-5 rounded-[24px] font-black text-sm shadow-xl shadow-blue-100/50"
                >
                  Accept & Claim Job
                </button>
              )}

              {job.status === 'approved' && job.technicianId === user?.id && (
                <button 
                  onClick={() => updateStatus(job.id, 'dispatched')}
                  className="w-full bg-indigo-600 text-white py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                >
                  <Play size={18} fill="white" /> Start Job / Dispatch
                </button>
              )}

              {job.status === 'dispatched' && (
                <button 
                  onClick={() => updateStatus(job.id, 'on_the_way')}
                  className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95 transition-all"
                >
                  <Bike size={18} /> Start Ride
                </button>
              )}

              {job.status === 'on_the_way' && (
                <>
                  {!job.techLocationShareEnabled ? (
                    <button 
                      onClick={() => {
                        updateDoc(doc(db, 'bookings', job.id), { techLocationShareEnabled: true });
                        setSharing(job.id);
                      }}
                      className="w-full bg-red-500 text-white py-4 rounded-[24px] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-red-100 active:scale-95 transition-all mb-2"
                    >
                      <MapIcon size={14} /> Enable Live Location
                    </button>
                  ) : (
                    <div className="py-3 text-center bg-red-50 border border-red-100 rounded-2xl mb-2">
                       <p className="text-[9px] font-black text-red-500 uppercase tracking-widest animate-pulse">Location sharing is ON</p>
                    </div>
                  )}

                  <button 
                    onClick={() => updateStatus(job.id, 'arriving')}
                    className="w-full bg-blue-500 text-white py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95 transition-all"
                  >
                    <Navigation size={18} /> In Final Approach
                  </button>
                </>
              )}

              {job.status === 'arriving' && (
                <button 
                  onClick={() => handleArrived(job.id)}
                  className="w-full bg-green-600 text-white py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95 transition-all"
                >
                  <Flag size={18} /> Arrived at Location
                </button>
              )}

              {job.status === 'arrived' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                    <p className="text-[10px] font-black text-[#2F70E9] uppercase tracking-widest mb-1">Security Check Required</p>
                    <p className="text-xs font-bold text-gray-500">Ask the customer for their 4-digit Service OTP to begin the process.</p>
                  </div>
                  <button 
                    onClick={() => setVerifyingOtp(job.id)}
                    className="w-full bg-[#2F70E9] text-white py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                  >
                    <ShieldCheck size={18} /> Enter OTP to Start
                  </button>
                </div>
              )}

              {job.status === 'process_started' && (
                <button 
                  onClick={() => updateStatus(job.id, 'repair_started')}
                  className="w-full bg-orange-600 text-white py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-100 active:scale-95 transition-all"
                >
                  <Play size={18} /> Start Repair
                </button>
              )}

              {job.status === 'repair_started' && (
                <button 
                  onClick={() => updateStatus(job.id, 'repair_completed')}
                  className="w-full bg-emerald-600 text-white py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                >
                  <CheckCircle2 size={18} /> Finish Repair
                </button>
              )}

              {job.status === 'repair_completed' && (
                <button 
                  onClick={() => updateStatus(job.id, 'payment_received')}
                  className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95 transition-all"
                >
                  <ShieldCheck size={18} /> Payment Received
                </button>
              )}

              {job.status === 'payment_received' && (
                <button 
                  onClick={() => updateStatus(job.id, 'completed')}
                  className="w-full bg-gray-900 text-white py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"
                >
                  <CheckCircle2 size={18} /> Complete Job
                </button>
              )}
            </div>
        ))}
      </div>

      {/* OTP Verification Modal */}
      <AnimatePresence>
        {verifyingOtp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setVerifyingOtp(null)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl relative z-10 p-8">
              <h3 className="text-xl font-black text-gray-900 tracking-tight text-center mb-6">Verify Service OTP</h3>
              <input 
                type="tel" 
                maxLength={4} 
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g,''))}
                placeholder="4-digit code"
                className="w-full py-5 px-6 bg-gray-50 border border-gray-100 rounded-3xl text-center text-3xl font-black tracking-[0.3em] font-mono outline-none focus:ring-4 focus:ring-blue-100 transition-all mb-4"
              />
              {otpError && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest text-center mb-4">{otpError}</p>}
              <button 
                onClick={handleVerifyOtp}
                className="w-full bg-[#2F70E9] text-white py-5 rounded-[24px] font-black text-sm shadow-xl shadow-blue-100 transition-all"
              >
                Verify & Start Service
              </button>
              <button onClick={() => setVerifyingOtp(null)} className="w-full mt-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cancel</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


