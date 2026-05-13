import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Booking } from '../../types';

import { useAuth } from '../../contexts/AuthContext';
import { 
  MapPin, 
  Phone, 
  CheckCircle2, 
  Navigation, 
  Bike, 
  MapIcon, 
  ShieldCheck, 
  Play, 
  Flag 
} from 'lucide-react';
import { arrayUnion } from 'firebase/firestore';

export default function TechJobs() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Booking[]>([]);
  const [sharing, setSharing] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'bookings'),
      where('status', 'in', [
        'approved', 
        'dispatched', 
        'on_the_way', 
        'arriving', 
        'arrived', 
        'process_started', 
        'repair_started', 
        'repair_completed', 
        'payment_received'
      ])
    );
    return onSnapshot(q, (snapshot) => {
      setJobs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking)));
    });
  }, [user]);

  // Real-time location sharing (send updates via API to avoid Firestore permission issues)
  useEffect(() => {
    let watchId: number | undefined;
    if (sharing) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          axios.patch(
            `${import.meta.env.VITE_API_URL}/api/bookings/${sharing}`,
            {
              techLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude },
              techLocationShareEnabled: true
            },
            { withCredentials: true }
          );
        },
        (err) => console.error(err),
        { enableHighAccuracy: true }
      );
    }
    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [sharing]);

  const updateStatus = async (id: string, status: Booking['status'], extra: any = {}) => {
    const currentJob = jobs.find((j) => j.id === id);

    let giftStatusUpdate: string | undefined;
    if (currentJob?.giftStatus) {
      if (status === 'dispatched') giftStatusUpdate = 'Gift dispatched';
      if (status === 'on_the_way') giftStatusUpdate = 'Gift out for delivery';
      if (status === 'arrived') giftStatusUpdate = 'Gift delivered';
    }

    await axios.patch(
      `${import.meta.env.VITE_API_URL}/api/bookings/${id}`,
      {
        status,
        technicianId: user?.id,
        ...(giftStatusUpdate ? { giftStatus: giftStatusUpdate } : {}),
        ...extra,
      },
      { withCredentials: true }
    );
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

  return (
    <div className="p-6 bg-gray-50 min-h-screen pb-24">
      <header className="mb-8">
        <h1 className="text-2xl font-black tracking-tight">Technician Panel</h1>
        <p className="text-gray-400 font-bold text-sm">Manage assigned jobs in real-time</p>
      </header>

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
                  <div className="bg-white p-2 rounded-xl shadow-sm"><User size={16} /></div>
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

            {/* Controls */}
            <div className="space-y-3">
              {job.status === 'approved' && (
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
                      onClick={async () => {
                        await axios.patch(
                          `${import.meta.env.VITE_API_URL}/api/bookings/${job.id}`,
                          { techLocationShareEnabled: true },
                          { withCredentials: true }
                        );
                        setSharing(job.id);
                      }}
                      className="w-full bg-red-500 text-white py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-100 active:scale-95 transition-all"
                    >
                      <MapIcon size={18} /> Enable Live Location
                    </button>
                  ) : (
                    <div className="py-4 text-center bg-red-50 border border-red-100 rounded-2xl mb-2">
                       <p className="text-[10px] font-black text-red-500 uppercase tracking-widest animate-pulse">Location sharing is ON</p>
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
                <button 
                  onClick={() => updateStatus(job.id, 'process_started')}
                  className="w-full bg-blue-600 text-white py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-100 active:scale-95 transition-all"
                >
                  <Play size={18} /> Start Process
                </button>
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
                  className="w-full bg-green-600 text-white py-5 rounded-[24px] font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-green-100 active:scale-95 transition-all"
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
          </div>
        ))}
      </div>
    </div>
  );
}

function User({ size, className }: { size: number, className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
