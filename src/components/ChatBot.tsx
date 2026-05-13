import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, X, User, Phone, Bot } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: string;
}

export default function ChatBot() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hi! I am TurboTech AI. How can I help you today?', sender: 'bot', timestamp: new Date().toISOString() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [step, setStep] = useState<'phone' | 'name' | 'chat'>('chat');
  const [sessionPhone, setSessionPhone] = useState(user?.phone || '');
  const [sessionName, setSessionName] = useState((user as any)?.name || '');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (user) {
      setSessionPhone(user.phone);
      setSessionName((user as any).name || '');
      setStep('chat');
    } else {
      setStep('phone');
    }
  }, [user]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim()) return;

    if (step === 'phone') {
      if (input.length < 10) return;
      setSessionPhone(input);
      setStep('name');
      setMessages([...messages, { id: Date.now().toString(), text: input, sender: 'user', timestamp: new Date().toISOString() }, { id: (Date.now()+1).toString(), text: 'Great! What is your name?', sender: 'bot', timestamp: new Date().toISOString() }]);
      setInput('');
      return;
    }

    if (step === 'name') {
      setSessionName(input);
      setStep('chat');
      setMessages([...messages, { id: Date.now().toString(), text: input, sender: 'user', timestamp: new Date().toISOString() }, { id: (Date.now()+1).toString(), text: `Nice to meet you, ${input}! How can I help you with your tech requirements today?`, sender: 'bot', timestamp: new Date().toISOString() }]);
      setInput('');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          phone: sessionPhone,
          name: sessionName,
          history: messages
        })
      });

      // Simulated auto-response for "Professional" feel
      setTimeout(() => {
        const botResponse: Message = {
          id: (Date.now()+2).toString(),
          text: "I've received your message. Our team is reviewing it and will get back to you on WhatsApp or via call if needed. Is there anything else you'd like to specify?",
          sender: 'bot',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botResponse]);
        setIsTyping(false);
      }, 1500);

    } catch (e) {
      console.error(e);
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[200] w-14 h-14 bg-[#2F70E9] text-white rounded-2xl shadow-xl shadow-blue-200 flex items-center justify-center active:scale-95 transition-all hover:bg-blue-600 group"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={24} />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageSquare size={24} />
            </motion.div>
          )}
        </AnimatePresence>
        {!isOpen && (
           <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-pulse" />
        )}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-[200] w-[calc(100vw-3rem)] max-w-[360px] bg-white rounded-[32px] shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-[500px]"
          >
            {/* Header */}
            <div className="p-5 bg-[#2F70E9] text-white flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm tracking-tight">TurboTech Assistant</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-white/70 uppercase">Online</span>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/50">
              {messages.map((m) => (
                <motion.div 
                  initial={{ opacity: 0, x: m.sender === 'user' ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={m.id} 
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-xs font-bold leading-relaxed ${
                    m.sender === 'user' 
                      ? 'bg-[#2F70E9] text-white rounded-tr-none' 
                      : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none shadow-sm'
                  }`}>
                    {m.text}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white px-4 py-3 rounded-2xl border border-gray-100 rounded-tl-none shadow-sm flex gap-1">
                    <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1 h-1 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100 flex gap-2">
              <input 
                type={step === 'phone' ? 'tel' : 'text'}
                placeholder={step === 'phone' ? 'Enter phone number...' : step === 'name' ? 'Enter your name...' : 'Type your message...'}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 bg-gray-50 border border-transparent focus:border-blue-500 rounded-2xl px-4 py-3 text-xs font-bold outline-none transition-all"
              />
              <button 
                type="submit"
                disabled={!input.trim()}
                className="w-11 h-11 bg-[#2F70E9] text-white rounded-xl flex items-center justify-center active:scale-90 transition-all disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
