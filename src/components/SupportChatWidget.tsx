import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { SupportNodeId } from "../lib/support/supportLogic";

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
  ts: number;
};

type ChatButton = { label: string; callbackData: SupportNodeId };

type ApiResponse = { text: string; buttons?: ChatButton[] };

const STORAGE_USER_ID_KEY = "turbotech_support_user_id_v1";
const STORAGE_HISTORY_KEY = "turbotech_support_history_v1";

function getOrCreateUserId() {
  try {
    const existing = localStorage.getItem(STORAGE_USER_ID_KEY);
    if (existing) return existing;
    const generated = `web-${Math.random().toString(16).slice(2)}-${Date.now()}`;
    localStorage.setItem(STORAGE_USER_ID_KEY, generated);
    return generated;
  } catch {
    // If storage is blocked, fall back to session-only identity
    return `web-${Math.random().toString(16).slice(2)}-${Date.now()}`;
  }
}

function formatDots(count: number) {
  return ".".repeat(count);
}

export default function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const typingDots = useMemo(() => formatDots(((Date.now() / 500) | 0) % 4), [isTyping]);

  useEffect(() => {
    setUserId(getOrCreateUserId());

    try {
      const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(messages.slice(-200)));
    } catch {
      // ignore
    }
  }, [messages, userId]);

  useEffect(() => {
    if (!open) return;
    // If no conversation exists, trigger initial phone-first prompt
    if (messages.length === 0) {
      void sendMessage(""); // server will respond with phone request; we’ll guard inside sendMessage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping, open]);

  async function sendMessage(rawText?: string) {
    const text = (rawText ?? input).trim();
    if (!userId) return;

    // The backend requires a message; if empty, still start onboarding by asking phone.
    if (!text) {
      setIsTyping(true);
      const botText = "📱 Please enter your phone number to continue.";
      const botMsg: ChatMessage = { id: crypto.randomUUID(), role: "bot", text: botText, ts: Date.now() };
      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
      setInput("");
      return;
    }

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", text, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setError(null);

    setIsTyping(true);
    try {
      const resp = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, message: text }),
      });

      if (!resp.ok) {
        const body = (await resp.json().catch(() => null)) as any;
        throw new Error(body?.error ?? `Request failed (${resp.status})`);
      }

      const data = (await resp.json()) as ApiResponse;

      const botMsg: ChatMessage = { id: crypto.randomUUID(), role: "bot", text: data.text, ts: Date.now() };
      setMessages((prev) => [...prev, botMsg]);

      if (Array.isArray(data.buttons) && data.buttons.length) {
        // Render buttons as a message "shadow" by appending a special bot message that contains text only.
        // We'll store buttons separately in state for the last bot message.
        // For simplicity: store buttons in a local variable map keyed by botMsg.id
        setButtonsForMessage((prev) => ({ ...prev, [botMsg.id]: data.buttons! }));
      }
    } catch (e: any) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      const botText = "⚠️ Sorry, we couldn’t process that. Please try again.";
      const botMsg: ChatMessage = { id: crypto.randomUUID(), role: "bot", text: botText, ts: Date.now() };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
  }

  const [buttonsForMessage, setButtonsForMessage] = useState<Record<string, ChatButton[]>>({});

  const onButtonClick = async (btn: ChatButton) => {
    // Buttons act like user messages sending callbackData.
    await sendMessage(btn.callbackData);
  };

  const onSend = async () => {
    void sendMessage();
  };

  return (
    <>
      {/* Floating button */}
      <div className="fixed right-4 bottom-24 z-[60] sm:bottom-28">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-black shadow-[4px_4px_0_rgba(0,0,0,1)] rounded-full"
          aria-label="Open chat"
        >
          <span className="w-10 h-10 flex items-center justify-center rounded-full bg-[#2F70E9] border-2 border-black shadow-[3px_3px_0_rgba(0,0,0,1)]">
            <span className="text-xl">💬</span>
          </span>
          <span className="hidden sm:inline text-sm font-black tracking-wide">Chat Now</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed right-4 bottom-24 z-[70] w-[92vw] max-w-[420px] h-[62vh] sm:h-[68vh] bg-white border-2 border-black shadow-[6px_6px_0_rgba(0,0,0,1)] rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-[#2F70E9] text-white border-b-2 border-black px-4 py-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-black text-base leading-tight">TurboTech Nova Assistant</span>
                <span className="text-xs opacity-90 leading-tight">Fast help • Menu-based support</span>
              </div>
              <button
                className="ml-3 w-9 h-9 flex items-center justify-center border-2 border-black bg-white text-black rounded-full font-black"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>

            {/* Chat */}
            <div className="h-full flex flex-col">
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-3 py-4 bg-[#F8F9FB]"
              >
                {messages.length === 0 ? (
                  <div className="text-center text-sm text-gray-600 py-10">
                    Tap send to start.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {messages.map((m) => (
                      <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl border-2 border-black px-3 py-2 whitespace-pre-wrap ${
                            m.role === "user"
                              ? "bg-[#2F70E9] text-white shadow-[3px_3px_0_rgba(0,0,0,1)]"
                              : "bg-white text-gray-900 shadow-[3px_3px_0_rgba(0,0,0,1)]"
                          }`}
                        >
                          <div className="text-sm leading-5">{m.text}</div>

                          {/* Buttons for the last bot message */}
                          {m.role === "bot" && buttonsForMessage[m.id] && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {buttonsForMessage[m.id].map((btn, idx) => (
                                <button
                                  key={`${m.id}-${idx}`}
                                  onClick={() => void onButtonClick(btn)}
                                  className="px-3 py-2 text-xs font-black border-2 border-black bg-white rounded-full shadow-[2px_2px_0_rgba(0,0,0,1)] hover:translate-y-[-1px] active:translate-y-[0px] transition-transform"
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="max-w-[85%] rounded-2xl border-2 border-black bg-white px-3 py-2 shadow-[3px_3px_0_rgba(0,0,0,1)]">
                          <div className="text-sm font-black">
                            Typing{typingDots}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-3 border-t-2 border-black bg-white">
                {error && <div className="text-xs text-red-600 font-black mb-2">{error}</div>}
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void onSend();
                    }}
                    placeholder="Type your message…"
                    className="flex-1 rounded-xl border-2 border-black px-3 py-2 text-sm outline-none focus:ring-0"
                  />
                  <button
                    onClick={() => void onSend()}
                    className="w-14 rounded-xl bg-[#2F70E9] border-2 border-black text-white font-black shadow-[3px_3px_0_rgba(0,0,0,1)] hover:translate-y-[-1px] active:translate-y-[0px] transition-transform"
                    aria-label="Send"
                  >
                    ➤
                  </button>
                </div>
                <div className="text-[10px] mt-2 font-bold text-gray-500">
                  Supports menu buttons + quick replies.
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
