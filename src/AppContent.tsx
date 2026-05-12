import React from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './views/Login';
import CustomerHome from './views/Customer/Home';
import MyBookings from './views/Customer/MyBookings';
import BookingView from './views/Customer/Booking';
import RewardsView from './views/Customer/Rewards';
import AccountView from './views/Customer/Account';
import SuccessView from './views/Customer/Success';

import AdminBookings from './views/Admin/Bookings';
import AdminCustomers from './views/Admin/Customers';
import AdminEarnings from './views/Admin/Earnings';
import AdminHistory from './views/Admin/History';
import AdminRewards from './views/Admin/Rewards';

import TechJobs from './views/Technician/Assigned';
import TechMap from './views/Technician/Map';
import TechHistory from './views/Technician/History';

import { Home, ListTodo, Zap, Gift, User as UserIcon, LayoutDashboard, Users, IndianRupee, History, Briefcase, Map as MapIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AppContent() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) return <div className="h-screen w-screen flex items-center justify-center">Loading...</div>;

  const isAdmin = user?.role === 'admin';
  const isTech = user?.role === 'technician' || user?.role === 'admin';

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FB] overflow-hidden text-gray-900">
      <main className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          <Routes location={location}>
            {/* Public Routes */}
            <Route path="/" element={<CustomerHome />} />
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
            <Route path="/booking/new" element={<BookingView />} />

            {/* Authenticated Customer Routes */}
            <Route path="/booking" element={user ? <MyBookings /> : <Navigate to="/login" />} />
            <Route path="/rewards" element={user ? <RewardsView /> : <Navigate to="/login" />} />
            <Route path="/account" element={user ? <AccountView /> : <Navigate to="/login" />} />
            <Route path="/success/:id" element={user ? <SuccessView /> : <Navigate to="/login" />} />

            {/* Admin Routes */}
            {isAdmin && (
              <>
                <Route path="/admin" element={<AdminBookings />} />
                <Route path="/admin/rewards" element={<AdminRewards />} />
                <Route path="/admin/customers" element={<AdminCustomers />} />
                <Route path="/admin/earnings" element={<AdminEarnings />} />
                <Route path="/admin/history" element={<AdminHistory />} />
              </>
            )}

            {/* Technician Routes */}
            {isTech && (
              <>
                <Route path="/tech" element={<TechJobs />} />
                <Route path="/tech/map" element={<TechMap />} />
                <Route path="/tech/history" element={<TechHistory />} />
              </>
            )}

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Navigation Bars */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-t border-gray-100 px-2 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
        {/* Toggle between roles if Admin */}
        {isAdmin && (
           <div className="bg-gray-50/50 px-4 py-2 flex justify-center gap-4 text-[10px] font-bold uppercase tracking-wider">
             <button onClick={() => navigate('/')} className={`p-1 ${location.pathname === '/' ? 'text-[#2F70E9]' : 'text-gray-400'}`}>Customer View</button>
             <button onClick={() => navigate('/admin')} className={`p-1 ${location.pathname.startsWith('/admin') ? 'text-[#2F70E9]' : 'text-gray-400'}`}>Admin View</button>
             <button onClick={() => navigate('/tech')} className={`p-1 ${location.pathname.startsWith('/tech') ? 'text-[#2F70E9]' : 'text-gray-400'}`}>Tech View</button>
           </div>
        )}

        {/* Customer Nav */}
        {!location.pathname.startsWith('/admin') && !location.pathname.startsWith('/tech') && (
          <nav className="h-16 flex items-center justify-around relative max-w-md mx-auto">
            <NavButton icon={<Home size={20} />} label="Home" active={location.pathname === '/'} onClick={() => navigate('/')} />
            <NavButton icon={<ListTodo size={20} />} label="My Booking" active={location.pathname === '/booking'} onClick={() => navigate('/booking')} />
            
            <div className="relative -top-3.5 px-2 text-center flex flex-col items-center">
               <motion.button 
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  navigate('/booking/new?quick=true');
                }}
                className="w-12 h-12 bg-[#2F70E9] rounded-full flex flex-col items-center justify-center text-white shadow-lg shadow-blue-200/50 active:bg-blue-700 transition-colors"
               >
                 <Zap size={24} className="fill-white" />
               </motion.button>
               <span className="text-[8px] font-black text-[#2F70E9] uppercase tracking-wider mt-1 leading-none">New Booking</span>
            </div>

            <NavButton icon={<Gift size={20} />} label="Rewards" active={location.pathname === '/rewards'} onClick={() => navigate('/rewards')} />
            <NavButton icon={<UserIcon size={20} />} label="Account" active={location.pathname === '/account'} onClick={() => navigate('/account')} />
          </nav>
        )}

        {/* Admin Nav */}
        {location.pathname.startsWith('/admin') && (
          <nav className="h-16 flex items-center justify-around">
            <NavButton icon={<Briefcase size={20} />} label="Bookings" active={location.pathname === '/admin'} onClick={() => navigate('/admin')} />
            <NavButton icon={<Gift size={20} />} label="Rewards" active={location.pathname === '/admin/rewards'} onClick={() => navigate('/admin/rewards')} />
            <NavButton icon={<Users size={20} />} label="Customers" active={location.pathname === '/admin/customers'} onClick={() => navigate('/admin/customers')} />
            <NavButton icon={<IndianRupee size={20} />} label="Earnings" active={location.pathname === '/admin/earnings'} onClick={() => navigate('/admin/earnings')} />
            <NavButton icon={<History size={20} />} label="History" active={location.pathname === '/admin/history'} onClick={() => navigate('/admin/history')} />
          </nav>
        )}

        {/* Tech Nav */}
        {location.pathname.startsWith('/tech') && (
          <nav className="h-16 flex items-center justify-around">
            <NavButton icon={<Briefcase size={20} />} label="Assigned" active={location.pathname === '/tech'} onClick={() => navigate('/tech')} />
            <NavButton icon={<MapIcon size={20} />} label="Map View" active={location.pathname === '/tech/map'} onClick={() => navigate('/tech/map')} />
            <NavButton icon={<History size={20} />} label="History" active={location.pathname === '/tech/history'} onClick={() => navigate('/tech/history')} />
          </nav>
        )}
      </div>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all ${active ? 'text-[#2F70E9]' : 'text-gray-400 hover:text-gray-500'}`}
    >
      <div className="mb-0.5">
        {React.cloneElement(icon as React.ReactElement<any>, { className: active ? 'stroke-[2.5px]' : 'stroke-[2px]' })}
      </div>
      <span className={`text-[9px] font-black uppercase tracking-wider leading-none ${active ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
    </button>
  );
}

