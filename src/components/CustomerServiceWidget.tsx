import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase/client';

interface Message {
  id: string;
  sender_type: string;
  message: string;
  created_at: string | null;
}

export default function CustomerServiceWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [unread, setUnread] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const sid = localStorage.getItem('cs_session_id') || `cs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    localStorage.setItem('cs_session_id', sid);
    setSessionId(sid);
    initSession(sid);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (isOpen && sessionId) {
      loadMessages();
      setUnread(0);
      pollRef.current = setInterval(loadMessages, 5000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [isOpen, sessionId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initSession = async (sid: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data: existing } = await supabase.from('customer_service_sessions').select('id').eq('session_id', sid).single();
    if (!existing) {
      let userName = '';
      let userCity = '';
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('nickname, city').eq('id', user.id).single();
        userName = profile?.nickname || '';
        userCity = profile?.city || '';
      }
      await supabase.from('customer_service_sessions').insert({
        session_id: sid,
        user_id: user?.id || null,
        user_name: userName || '用户',
        user_city: userCity,
        status: 'open'
      });
    }
  };

  const loadMessages = async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from('customer_service_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(100);
    if (data) {
      if (!isOpen) {
        const adminMsgs = data.filter(m => m.sender_type === 'admin' && !m.is_read);
        setUnread(adminMsgs.length);
      }
      setMessages(data);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('customer_service_messages').insert({
      session_id: sessionId,
      user_id: user?.id || null,
      sender_type: 'user',
      message: input.trim(),
      message_type: 'text'
    });
    await supabase.from('customer_service_sessions').update({
      last_message_at: new Date().toISOString(),
      unread_count: 1,
      updated_at: new Date().toISOString()
    }).eq('session_id', sessionId);
    setInput('');
    setSending(false);
    loadMessages();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const fmtTime = (d: string | null) => {
    if (!d) return '';
    const date = new Date(d);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* 浮动客服按钮 */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-4 z-50 w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center text-white hover:from-blue-600 hover:to-blue-700 transition-all"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        )}
        {unread > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </motion.button>

      {/* 客服聊天窗口 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-40 right-4 z-50 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: '480px' }}
          >
            {/* 头部 */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div className="flex-1">
                <div className="text-white font-semibold text-sm">平台客服</div>
                <div className="text-blue-200 text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                  在线
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/10 rounded text-white/70 hover:text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/></svg>
              </button>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: '280px', maxHeight: '320px' }}>
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <p className="text-slate-400 text-sm">欢迎联系平台客服</p>
                  <p className="text-slate-500 text-xs mt-1">有任何问题都可以在这里咨询</p>
                </div>
              )}
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] ${msg.sender_type === 'user' ? 'order-1' : ''}`}>
                    {msg.sender_type === 'system' ? (
                      <div className="text-center">
                        <span className="text-xs text-slate-500 bg-slate-800 px-3 py-1 rounded-full">{msg.message}</span>
                      </div>
                    ) : (
                      <>
                        <div className={`px-3 py-2 rounded-2xl text-sm ${
                          msg.sender_type === 'user'
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-md'
                        }`}>
                          {msg.message}
                        </div>
                        <div className={`text-[10px] text-slate-500 mt-1 ${msg.sender_type === 'user' ? 'text-right' : ''}`}>
                          {msg.sender_type === 'admin' && <span className="text-blue-400 mr-1">客服</span>}
                          {fmtTime(msg.created_at)}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入框 */}
            <div className="p-3 border-t border-slate-700 bg-slate-800/50">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入消息..."
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="w-9 h-9 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 rounded-xl flex items-center justify-center text-white transition-colors shrink-0"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
              <p className="text-[10px] text-slate-600 mt-1.5 text-center">回车发送 | 工作时间: 9:00-18:00</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
