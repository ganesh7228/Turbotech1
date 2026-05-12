import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, CheckCircle2, ShieldCheck, Cpu, RefreshCw, X, Check, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'name'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(60);
  const { login, updateProfile } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let interval: any;
    if (step === 'otp' && timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 10) return setError('Please enter a valid 10-digit number');
    if (isSignup && !name.trim()) return setError('Please enter your name');
    setError('');
    setLoading(true);
    try {
      console.log('[Login] Sending OTP to:', phone);
      await axios.post(`${import.meta.env.VITE_API_URL}/api/send-otp`, { phone });
      setStep('otp');
      setTimer(60);
    } catch (err: any) {
      console.error('[Login] Send OTP failed:', err);
      const apiError = err.response?.data?.error || err.message || 'Failed to send OTP. Try again.';
      setError(apiError);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return setError('Please enter the 6-digit code');
    setError('');
    setLoading(true);
    try {
      const { isNewUser } = await login(phone, code);
      if (isNewUser || (isSignup && name.trim())) {
        if (name.trim()) {
           await updateProfile(name);
           navigate('/');
        } else {
           setStep('name');
        }
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid OTP. Please check and retry.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return setError('Please enter your name');
    setError('');
    setLoading(true);
    try {
      await updateProfile(name);
      navigate('/');
    } catch (err: any) {
      setError('Failed to update name. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const [rememberMe, setRememberMe] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF8F4] via-[#F8F9FF] to-[#EBE7FF] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background soft blurs */}
      <div className="absolute top-[10%] right-[5%] w-64 h-64 bg-[#2F70E9]/5 rounded-full blur-[80px]" />
      <div className="absolute bottom-[10%] left-[5%] w-64 h-64 bg-orange-200/20 rounded-full blur-[80px]" />

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[340px] bg-white rounded-[32px] p-6 shadow-[0_20px_60px_rgba(47,112,233,0.06)] border border-white/50 relative z-10"
      >
        {/* Top Icon */}
        <div className="flex justify-center mb-5">
          <div className="w-14 h-14 bg-[#2F70E9] rounded-[18px] flex items-center justify-center shadow-lg shadow-blue-200/40 rotate-12">
            <Zap className="text-white fill-white" size={24} />
          </div>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-gray-900 mb-1.5 font-display tracking-tight whitespace-nowrap">
            {step === 'name' ? 'One last step' : isSignup ? 'Sign Up' : 'Login'}
          </h1>
          <p className="text-gray-400 text-[12px] font-bold leading-tight">
            {step === 'name' ? 'Tell us your name to get started' : isSignup ? 'Create your professional account' : 'Enter mobile number to continue'}
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-rose-50 border border-rose-100 text-rose-600 p-3 rounded-xl mb-5 text-[9px] font-black uppercase tracking-tight flex items-center gap-2.5"
          >
             <div className="w-1 h-1 bg-rose-600 rounded-full animate-pulse" />
             {error}
          </motion.div>
        )}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-3">
              {isSignup && (
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2F70E9] transition-colors">
                    <CheckCircle2 size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FB] border border-gray-100 rounded-[18px] focus:ring-4 focus:ring-[#2F70E9]/10 focus:border-[#2F70E9] focus:bg-white focus:outline-none transition-all font-black text-gray-900 placeholder:text-gray-400 text-sm"
                    disabled={loading}
                  />
                </div>
              )}
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2F70E9] transition-colors">
                  <Phone size={16} />
                </div>
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FB] border border-gray-100 rounded-[18px] focus:ring-4 focus:ring-[#2F70E9]/10 focus:border-[#2F70E9] focus:bg-white focus:outline-none transition-all font-black text-gray-900 placeholder:text-gray-400 text-sm"
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between px-1">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded-md border-gray-200 text-[#2F70E9] focus:ring-[#2F70E9]/20 transition-all" 
                  />
                  <span className="text-[12px] font-bold text-gray-400 group-hover:text-gray-600">Remember me</span>
                </label>
              </div>
            </div>
            
            <div className="space-y-4 pt-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading || phone.length < 10}
                className="w-full bg-[#2F70E9] text-white py-4 rounded-[18px] font-black text-sm shadow-[0_12px_30px_rgba(47,112,233,0.2)] active:bg-blue-700 transition-all disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : 'Get OTP'}
              </motion.button>
              
              <p className="text-[9px] text-gray-400 text-center font-bold px-4 leading-relaxed uppercase tracking-tight">
                By clicking login you agree to<br/> <button type="button" className="text-[#2F70E9] underline underline-offset-2">Terms and Conditions</button>
              </p>
            </div>
          </form>
        ) : step === 'otp' ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="text-center p-3 bg-[#F8F9FB] rounded-[18px] mb-4 border border-gray-50">
              <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1 font-mono">OTP SENT TO</p>
              <p className="text-base font-black text-gray-900 tracking-tight">{phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}</p>
            </div>

            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2F70E9] transition-colors">
                <ShieldCheck size={18} />
              </div>
              <input
                type="text"
                placeholder="••••••"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FB] border border-gray-100 rounded-[18px] focus:ring-4 focus:ring-[#2F70E9]/10 focus:border-[#2F70E9] focus:bg-white focus:outline-none transition-all font-black text-gray-900 tracking-[0.6em] text-sm placeholder:tracking-normal placeholder:text-gray-300"
                disabled={loading}
              />
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-[#2F70E9] text-white py-4 rounded-[18px] font-black text-sm shadow-[0_12px_30px_rgba(47,112,233,0.2)] active:bg-blue-700 transition-all disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Verify OTP'}
            </motion.button>

            <div className="flex justify-between items-center px-1">
               <button 
                type="button" 
                onClick={() => setStep('phone')}
                className="text-[10px] font-black text-gray-400 hover:text-[#2F70E9] flex items-center gap-1.5 transition-colors uppercase tracking-widest"
               >
                 <RefreshCw size={12} /> Change
               </button>
               <div className="text-[10px] font-black">
                 {timer > 0 ? (
                   <span className="text-gray-400">RESEND <span className="font-mono text-gray-900">{timer}S</span></span>
                  ) : (
                   <button type="button" onClick={handleSendOtp} className="text-[#2F70E9] uppercase tracking-widest">Resend OTP</button>
                 )}
               </div>
            </div>
          </form>
        ) : (
          <form onSubmit={handleUpdateName} className="space-y-4">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2F70E9] transition-colors">
                <CheckCircle2 size={16} />
              </div>
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FB] border border-gray-100 rounded-[18px] focus:ring-4 focus:ring-[#2F70E9]/10 focus:border-[#2F70E9] focus:bg-white focus:outline-none transition-all font-black text-gray-900 placeholder:text-gray-400 text-sm"
                disabled={loading}
                autoFocus
              />
            </div>
            
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || !name.trim()}
              className="w-full bg-[#2F70E9] text-white py-4 rounded-[18px] font-black text-sm shadow-[0_12px_30px_rgba(47,112,233,0.2)] active:bg-blue-700 transition-all disabled:opacity-40 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Continue'}
            </motion.button>
          </form>
        )}

        <div className="mt-8 text-center border-t border-gray-50 pt-6">
           <p className="text-gray-400 text-[13px] font-bold">
             {isSignup ? (
               <>Already have an account? <button onClick={() => { setIsSignup(false); setStep('phone'); }} className="text-[#2F70E9] font-black hover:underline transition-all">Login</button></>
             ) : (
               <>Don't have an account? <button onClick={() => { setIsSignup(true); setStep('phone'); }} className="text-[#2F70E9] font-black hover:underline transition-all">Sign Up</button></>
             )}
           </p>
        </div>

      </motion.div>
    </div>
  );
}
