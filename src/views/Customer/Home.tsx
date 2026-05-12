import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Wrench, 
  Plug,
  Wind,
  Droplets,
  Sparkles,
  Zap,
  Gift,
  ChevronRight,
  Bolt
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const SERVICES = [
  { 
    id: '1', 
    title: 'PC Repair', 
    description: 'General PC diagnostics & repair',
    price: 'Rs200+',
    icon: <Wrench className="text-[#2F70E9]" />,
  },
  { 
    id: '2', 
    title: 'Desktop Setup', 
    description: 'New desktop assembly & setup',
    price: 'Rs299+',
    icon: <Zap className="text-[#2F70E9]" />,
  },
  { 
    id: '3', 
    title: 'OS Installation', 
    description: 'Windows/Linux/MacOS setup',
    price: 'Rs400+',
    icon: <Plug className="text-[#2F70E9]" />,
  },
  { 
    id: '4', 
    title: 'Laptop Repair', 
    description: 'Screen, keyboard, and battery repair',
    price: 'Rs500+',
    icon: <Wind className="text-[#2F70E9]" />,
  },
  { 
    id: '5', 
    title: 'Data Recovery', 
    description: 'Lost file & drive recovery',
    price: 'Rs999+',
    icon: <Droplets className="text-[#2F70E9]" />,
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="bg-[#F8F9FB] min-h-screen">
      {/* Blue Header Section */}
      <header className="bg-[#2F70E9] px-6 pt-8 pb-10 rounded-b-[40px] relative overflow-hidden shadow-xl shadow-blue-100/50 max-w-xl mx-auto">
        {/* Background Decorative patterns */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-12 -mb-12 blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="mb-6">
            <p className="text-white/70 text-[10px] font-black uppercase tracking-[2px] mb-1">Welcome back</p>
            <h1 className="text-white text-2xl font-black mb-1 font-display tracking-tight">
              {user ? (user.name || user.phone) : 'New User'}
            </h1>
            <div className="flex items-center gap-2">
              <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse" />
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-tight">Tech services in Nanjangud</p>
            </div>
          </div>

          <motion.button 
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/booking/new?quick=true')}
            className="w-full bg-white/15 backdrop-blur-xl border border-white/20 p-4 rounded-[28px] flex items-center justify-between group active:bg-white/20 transition-all shadow-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform">
                <Zap className="text-[#2F70E9] fill-[#2F70E9]" size={24} />
              </div>
              <div className="text-left">
                <h4 className="text-white font-black text-base font-display leading-tight">Quick Booking</h4>
                <p className="text-white/70 text-[9px] font-bold uppercase tracking-wider">Technician in 15m</p>
              </div>
            </div>
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <ChevronRight className="text-white" size={16} strokeWidth={3} />
            </div>
          </motion.button>
        </div>
      </header>

      <div className="px-6 py-6 max-w-xl mx-auto">
        {/* Active Offers Section */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-gray-900 text-[9px] font-black uppercase tracking-[2px] opacity-40">Active offers</h3>
            <button className="text-[#2F70E9] text-[9px] font-black uppercase tracking-widest bg-blue-50 px-2.5 py-1 rounded-full">View all</button>
          </div>

          <motion.div 
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-r from-[#F06221] to-[#FF930F] p-5 rounded-[32px] flex items-center gap-4 shadow-lg shadow-orange-100/50 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform"></div>
            
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-[20px] flex items-center justify-center border border-white/20 relative z-10">
              <Gift className="text-white" size={24} strokeWidth={2.5} />
            </div>
            
            <div className="relative z-10 text-white">
              <h4 className="text-base font-black leading-tight font-display tracking-tight">Free Gift on First Booking</h4>
              <p className="text-white/80 text-[9px] font-black mt-0.5 uppercase tracking-[1.5px] bg-white/10 px-2 py-0.5 rounded-full inline-block backdrop-blur-sm border border-white/10">Auto-Applied for New Users</p>
            </div>
          </motion.div>
        </section>

        {/* Services List Section */}
        <section className="mb-8">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-gray-900 text-[9px] font-black uppercase tracking-[2px] opacity-40">Local Services</h3>
            <span className="text-[9px] font-black text-gray-300 font-mono tracking-widest">{SERVICES.length} ACTIVE</span>
          </div>
          
          <div className="space-y-3">
            {SERVICES.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-4 rounded-[28px] border border-gray-50 shadow-[0_8px_25px_rgba(0,0,0,0.02)] flex items-center justify-between group hover:border-[#2F70E9]/20 transition-all"
              >
                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                  <div className="w-12 h-12 bg-[#F8F9FB] rounded-xl flex items-center justify-center border border-gray-50 text-[#2F70E9] shrink-0 group-hover:rotate-6 transition-transform">
                    {React.cloneElement(service.icon as React.ReactElement<any>, { size: 20, strokeWidth: 2.5 })}
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="text-sm font-black text-gray-900 font-display truncate leading-tight">{service.title}</h4>
                    <p className="text-[10px] font-bold text-gray-400 line-clamp-1 mb-0.5">{service.description}</p>
                    <p className="text-[10px] font-black text-[#2F70E9] tracking-tight">{service.price}</p>
                  </div>
                </div>
                <button 
                  onClick={() => navigate(`/booking/new?service=${service.title}`)}
                  className="bg-[#2F70E9] text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md shadow-blue-100/30 active:scale-95 transition-all shrink-0"
                >
                  Book now
                </button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* My Bookings Link */}
        <motion.button 
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/booking')}
          className="w-full bg-white p-5 rounded-[28px] border border-gray-100 flex items-center justify-between active:bg-[#F8F9FB] transition-all shadow-sm max-w-xl mx-auto"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#F8F9FB] rounded-xl flex items-center justify-center text-[#2F70E9] border border-gray-50 shadow-sm">
              <Bolt size={16} />
            </div>
            <span className="text-gray-900 font-black text-[13px] font-display tracking-tight">Manage My Bookings</span>
          </div>
          <ChevronRight className="text-gray-200" size={18} strokeWidth={3} />
        </motion.button>
      </div>
      
      {/* Padding for bottom nav */}
      <div className="h-32"></div>
    </div>
  );
}

