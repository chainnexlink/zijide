import React, { useState, useEffect, useRef } from 'react';
import { useAdmin, fmt, SearchBar, Btn, FilterBtn, DetailRow, Modal } from '../App';

export default function CustomerServicePage({ sub }: { sub: string }) {
  const { supabase, showToast, currentAdmin } = useAdmin();
  const [sessions, setSessions] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => { loadData(); }, [sub]);

  useEffect(() => {
    if (selectedSession) {
      loadChat(selectedSession.session_id);
      pollRef.current = setInterval(() => loadChat(selectedSession.session_id), 3000);
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [selectedSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadData = async () => {
    const { data: s } = await supabase.from('customer_service_sessions').select('*').order('last_message_at', { ascending: false }).limit(200);
    setSessions(s || []);
    if (sub === 'messages') {
      const { data: m } = await supabase.from('customer_service_messages').select('*').order('created_at', { ascending: false }).limit(500);
      setAllMessages(m || []);
    }
  };

  const loadChat = async (sessionId: string) => {
    const { data } = await supabase.from('customer_service_messages').select('*').eq('session_id', sessionId).order('created_at', { ascending: true }).limit(200);
    setChatMessages(data || []);
    await supabase.from('customer_service_messages').update({ is_read: true }).eq('session_id', sessionId).eq('sender_type', 'user').eq('is_read', false);
    await supabase.from('customer_service_sessions').update({ unread_count: 0 }).eq('session_id', sessionId);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selectedSession || sending) return;
    setSending(true);
    await supabase.from('customer_service_messages').insert({
      session_id: selectedSession.session_id,
      user_id: selectedSession.user_id,
      sender_type: 'admin',
      admin_id: currentAdmin?.id || 'admin',
      message: replyText.trim(),
      message_type: 'text'
    });
    await supabase.from('customer_service_sessions').update({
      last_message_at: new Date().toISOString(),
      assigned_admin: currentAdmin?.displayName || 'admin',
      updated_at: new Date().toISOString()
    }).eq('session_id', selectedSession.session_id);
    setReplyText('');
    setSending(false);
    loadChat(selectedSession.session_id);
    loadData();
  };

  const closeSession = async (sessionId: string) => {
    await supabase.from('customer_service_sessions').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('session_id', sessionId);
    await supabase.from('customer_service_messages').insert({
      session_id: sessionId,
      sender_type: 'system',
      message: '会话已关闭',
      message_type: 'system'
    });
    showToast('会话已关闭');
    if (selectedSession?.session_id === sessionId) setSelectedSession(null);
    loadData();
  };

  const reopenSession = async (sessionId: string) => {
    await supabase.from('customer_service_sessions').update({ status: 'open', updated_at: new Date().toISOString() }).eq('session_id', sessionId);
    showToast('会话已重新开启');
    loadData();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendReply();
    }
  };

  // 会话列表 + 聊天面板
  if (sub === 'sessions') {
    const filtered = sessions.filter(s => {
      if (search && !JSON.stringify(s).toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter === 'open') return s.status === 'open';
      if (statusFilter === 'closed') return s.status === 'closed';
      return true;
    });

    const openCount = sessions.filter(s => s.status === 'open').length;
    const unreadTotal = sessions.reduce((sum, s) => sum + (s.unread_count || 0), 0);

    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">客服会话管理</h2>
          <Btn variant="secondary" onClick={loadData}>刷新</Btn>
        </div>

        {/* 统计 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="text-xs text-slate-400 mb-1">总会话数</div>
            <div className="text-2xl font-bold text-white">{sessions.length}</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="text-xs text-slate-400 mb-1">进行中</div>
            <div className="text-2xl font-bold text-green-400">{openCount}</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="text-xs text-slate-400 mb-1">未读消息</div>
            <div className="text-2xl font-bold text-amber-400">{unreadTotal}</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="text-xs text-slate-400 mb-1">已关闭</div>
            <div className="text-2xl font-bold text-slate-400">{sessions.length - openCount}</div>
          </div>
        </div>

        <div className="flex gap-3 mb-4">
          <SearchBar value={search} onChange={setSearch} placeholder="搜索用户/会话..." />
          <FilterBtn active={statusFilter==='all'} onClick={() => setStatusFilter('all')}>全部</FilterBtn>
          <FilterBtn active={statusFilter==='open'} onClick={() => setStatusFilter('open')}>进行中</FilterBtn>
          <FilterBtn active={statusFilter==='closed'} onClick={() => setStatusFilter('closed')}>已关闭</FilterBtn>
        </div>

        <div className="flex gap-4" style={{ height: '560px' }}>
          {/* 左侧会话列表 */}
          <div className="w-80 shrink-0 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-slate-700 text-xs text-slate-400 font-medium">会话列表 ({filtered.length})</div>
            <div className="flex-1 overflow-y-auto">
              {filtered.map(s => (
                <button key={s.id} onClick={() => setSelectedSession(s)}
                  className={`w-full text-left p-3 border-b border-slate-700/50 hover:bg-slate-700/50 transition-colors ${selectedSession?.id === s.id ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-white font-medium truncate">{s.user_name || '匿名用户'}</span>
                    <div className="flex items-center gap-1.5">
                      {(s.unread_count || 0) > 0 && <span className="w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">{s.unread_count}</span>}
                      <span className={`w-2 h-2 rounded-full ${s.status === 'open' ? 'bg-green-400' : 'bg-slate-500'}`} />
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 truncate">{s.user_city || '-'} | {s.session_id.slice(0, 12)}</div>
                  <div className="text-[10px] text-slate-600 mt-0.5">{fmt(s.last_message_at)}</div>
                </button>
              ))}
              {filtered.length === 0 && <div className="text-center text-slate-500 py-8 text-sm">暂无会话</div>}
            </div>
          </div>

          {/* 右侧聊天面板 */}
          <div className="flex-1 bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col">
            {selectedSession ? (
              <>
                {/* 聊天头部 */}
                <div className="p-3 border-b border-slate-700 flex items-center justify-between bg-slate-800">
                  <div>
                    <div className="text-sm text-white font-medium">{selectedSession.user_name || '匿名用户'}</div>
                    <div className="text-xs text-slate-400">{selectedSession.user_city || '-'} | {selectedSession.session_id.slice(0, 16)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs ${selectedSession.status === 'open' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {selectedSession.status === 'open' ? '进行中' : '已关闭'}
                    </span>
                    {selectedSession.status === 'open' ? (
                      <button onClick={() => closeSession(selectedSession.session_id)} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300">关闭会话</button>
                    ) : (
                      <button onClick={() => reopenSession(selectedSession.session_id)} className="px-3 py-1 bg-green-600/20 hover:bg-green-600/40 rounded text-xs text-green-400">重新开启</button>
                    )}
                  </div>
                </div>
                {/* 消息列表 */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_type === 'admin' ? 'justify-end' : msg.sender_type === 'system' ? 'justify-center' : 'justify-start'}`}>
                      {msg.sender_type === 'system' ? (
                        <span className="text-xs text-slate-500 bg-slate-700/50 px-3 py-1 rounded-full">{msg.message}</span>
                      ) : (
                        <div className="max-w-[75%]">
                          <div className={`px-3 py-2 rounded-xl text-sm ${
                            msg.sender_type === 'admin'
                              ? 'bg-blue-600 text-white rounded-br-sm'
                              : 'bg-slate-700 text-slate-200 rounded-bl-sm'
                          }`}>
                            {msg.message}
                          </div>
                          <div className={`text-[10px] text-slate-500 mt-1 ${msg.sender_type === 'admin' ? 'text-right' : ''}`}>
                            {msg.sender_type === 'admin' ? (msg.admin_id || '客服') : '用户'} - {fmt(msg.created_at)}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                  {chatMessages.length === 0 && <div className="text-center text-slate-500 py-12 text-sm">暂无消息</div>}
                </div>
                {/* 回复输入 */}
                {selectedSession.status === 'open' && (
                  <div className="p-3 border-t border-slate-700 bg-slate-800/80">
                    <div className="flex items-center gap-2">
                      <input
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="输入回复..."
                        className="flex-1 px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                      />
                      <Btn onClick={sendReply} disabled={!replyText.trim() || sending}>发送</Btn>
                    </div>
                    <div className="text-[10px] text-slate-600 mt-1">Enter 发送 | 当前客服: {currentAdmin?.displayName || '-'}</div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  </div>
                  <p className="text-slate-400 text-sm">选择一个会话开始回复</p>
                  <p className="text-slate-500 text-xs mt-1">左侧列表中选择用户会话</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 消息记录视图
  const filteredMessages = allMessages.filter(m => !search || JSON.stringify(m).toLowerCase().includes(search.toLowerCase()));
  const userMsgCount = allMessages.filter(m => m.sender_type === 'user').length;
  const adminMsgCount = allMessages.filter(m => m.sender_type === 'admin').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">消息记录 ({allMessages.length})</h2>
        <Btn variant="secondary" onClick={loadData}>刷新</Btn>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="text-xs text-slate-400 mb-1">总消息数</div>
          <div className="text-2xl font-bold text-white">{allMessages.length}</div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="text-xs text-slate-400 mb-1">用户消息</div>
          <div className="text-2xl font-bold text-blue-400">{userMsgCount}</div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
          <div className="text-xs text-slate-400 mb-1">客服回复</div>
          <div className="text-2xl font-bold text-green-400">{adminMsgCount}</div>
        </div>
      </div>

      <div className="flex gap-3 mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索消息内容..." /></div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full"><thead><tr className="border-b border-slate-700">
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">会话ID</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">发送者</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">消息内容</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">类型</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">已读</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">时间</th>
        </tr></thead><tbody>
          {filteredMessages.slice(0, 100).map(m => (
            <tr key={m.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
              <td className="p-4 text-sm text-white font-mono">{m.session_id?.slice(0, 12)}</td>
              <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${m.sender_type === 'admin' ? 'bg-blue-500/20 text-blue-400' : m.sender_type === 'system' ? 'bg-slate-500/20 text-slate-400' : 'bg-green-500/20 text-green-400'}`}>{m.sender_type === 'admin' ? '客服' : m.sender_type === 'system' ? '系统' : '用户'}</span></td>
              <td className="p-4 text-sm text-slate-300 max-w-[300px] truncate">{m.message}</td>
              <td className="p-4 text-sm text-slate-400">{m.message_type}</td>
              <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${m.is_read ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{m.is_read ? '已读' : '未读'}</span></td>
              <td className="p-4 text-sm text-slate-400">{fmt(m.created_at)}</td>
            </tr>
          ))}
        </tbody></table>
        {filteredMessages.length === 0 && <div className="text-center text-slate-500 py-12">暂无消息记录</div>}
      </div>
    </div>
  );
}
