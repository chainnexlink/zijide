import React, { useState, useEffect } from 'react';
import { useAdmin, fmt, stBadge, SearchBar, Btn, DetailRow } from '../App';

export default function MutualAidPage({ sub }: { sub: string }) {
  const { supabase, showToast } = useAdmin();
  const [subs, setSubs] = useState<any[]>([]);
  const [responses, setResponses] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [eventResponses, setEventResponses] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => { load(); }, [sub]);

  const load = async () => {
    const { data: s } = await supabase.from('mutual_aid_subscriptions').select('*').order('created_at', { ascending: false }).limit(200);
    setSubs(s || []);
    const { data: r } = await supabase.from('mutual_aid_responses').select('*').order('created_at', { ascending: false }).limit(200);
    setResponses(r || []);
    const { data: e } = await supabase.from('mutual_aid_events').select('*').order('created_at', { ascending: false }).limit(200);
    setEvents(e || []);
    const { data: sk } = await supabase.from('mutual_aid_skills').select('*').order('created_at', { ascending: false }).limit(200);
    setSkills(sk || []);
    const { data: m } = await supabase.from('mutual_aid_messages').select('*').order('created_at', { ascending: false }).limit(200);
    setMessages(m || []);
    const { data: rv } = await supabase.from('mutual_aid_reviews').select('*').order('created_at', { ascending: false }).limit(200);
    setReviews(rv || []);
    const { data: er } = await supabase.from('mutual_aid_event_responses').select('*').order('created_at', { ascending: false }).limit(200);
    setEventResponses(er || []);
  };

  // ========== Detail Views ==========
  if (detail) {
    const d = detail;
    return (
      <div>
        <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> 返回
        </button>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-6">
            {d._type === 'event' ? '求助事件详情' : d._type === 'skill' ? '技能详情' : d._type === 'review' ? '评价详情' : d._type === 'message' ? '消息详情' : d._type === 'eventResponse' ? '事件响应详情' : d.responder_id ? '互助响应详情' : '互助订阅详情'}
          </h2>
          {d._type === 'event' ? <>
            <DetailRow label="ID" value={d.id} />
            <DetailRow label="用户ID" value={d.user_id} />
            <DetailRow label="类型" value={typeLabel(d.event_type)} />
            <DetailRow label="标题" value={d.title} />
            <DetailRow label="描述" value={d.description} />
            <DetailRow label="紧急程度" value={urgencyLabel(d.urgency)} />
            <DetailRow label="状态" value={eventStatusLabel(d.status)} />
            <DetailRow label="位置" value={`${d.latitude}, ${d.longitude}`} />
            <DetailRow label="地址" value={d.address} />
            <DetailRow label="最大响应人数" value={d.max_responders} />
            <DetailRow label="已响应" value={d.responder_count} />
            <DetailRow label="奖励积分" value={d.reward_points} />
            <DetailRow label="创建时间" value={fmt(d.created_at)} />
            <DetailRow label="过期时间" value={fmt(d.expires_at)} />
            <DetailRow label="解决时间" value={fmt(d.resolved_at)} />
            {/* Event action buttons */}
            <div className="flex gap-3 mt-6">
              {d.status === 'waiting' && <Btn variant="primary" onClick={() => updateEventStatus(d.id, 'cancelled')}>取消事件</Btn>}
              {d.status === 'in_progress' && <Btn variant="primary" onClick={() => updateEventStatus(d.id, 'completed')}>标记完成</Btn>}
            </div>
          </> : d._type === 'skill' ? <>
            <DetailRow label="ID" value={d.id} />
            <DetailRow label="用户ID" value={d.user_id} />
            <DetailRow label="技能类型" value={skillTypeLabel(d.skill_type)} />
            <DetailRow label="技能名称" value={d.skill_name} />
            <DetailRow label="描述" value={d.description} />
            <DetailRow label="已认证" value={d.is_verified ? '是' : '否'} />
            <DetailRow label="创建时间" value={fmt(d.created_at)} />
            <div className="flex gap-3 mt-6">
              <Btn variant="primary" onClick={() => toggleVerify(d.id, !d.is_verified)}>{d.is_verified ? '取消认证' : '认证技能'}</Btn>
            </div>
          </> : d._type === 'review' ? <>
            <DetailRow label="ID" value={d.id} />
            <DetailRow label="事件ID" value={d.event_id} />
            <DetailRow label="评价者" value={d.reviewer_id} />
            <DetailRow label="被评价者" value={d.reviewed_id} />
            <DetailRow label="评分" value={'★'.repeat(d.rating) + '☆'.repeat(5 - d.rating)} />
            <DetailRow label="评论" value={d.comment} />
            <DetailRow label="创建时间" value={fmt(d.created_at)} />
          </> : d._type === 'eventResponse' ? <>
            <DetailRow label="ID" value={d.id} />
            <DetailRow label="事件ID" value={d.event_id} />
            <DetailRow label="响应者" value={d.responder_id} />
            <DetailRow label="状态" value={d.status} />
            <DetailRow label="消息" value={d.message} />
            <DetailRow label="预计到达(分钟)" value={d.eta_minutes} />
            <DetailRow label="接受时间" value={fmt(d.accepted_at)} />
            <DetailRow label="到达时间" value={fmt(d.arrived_at)} />
            <DetailRow label="完成时间" value={fmt(d.completed_at)} />
            <DetailRow label="创建时间" value={fmt(d.created_at)} />
          </> : d.responder_id ? <>
            <DetailRow label="ID" value={d.id} />
            <DetailRow label="SOS ID" value={d.sos_id} />
            <DetailRow label="响应者ID" value={d.responder_id} />
            <DetailRow label="状态" value={d.status} />
            <DetailRow label="备注" value={d.notes} />
            <DetailRow label="奖励金额" value={d.reward_amount ? `¥${d.reward_amount}` : '-'} />
            <DetailRow label="响应时间" value={fmt(d.responded_at)} />
            <DetailRow label="到达时间" value={fmt(d.arrived_at)} />
            <DetailRow label="验证时间" value={fmt(d.verified_at)} />
          </> : <>
            <DetailRow label="ID" value={d.id} />
            <DetailRow label="用户ID" value={d.user_id} />
            <DetailRow label="状态" value={d.is_active ? '活跃' : '未激活'} />
            <DetailRow label="总奖励" value={d.total_rewards ? `¥${d.total_rewards}` : '¥0'} />
            <DetailRow label="上次奖励" value={fmt(d.last_reward_at)} />
            <DetailRow label="订阅时间" value={fmt(d.subscribed_at)} />
            <DetailRow label="退订时间" value={fmt(d.unsubscribed_at)} />
          </>}
          <DetailRow label="创建时间" value={fmt(d.created_at)} />
        </div>
      </div>
    );
  }

  // ========== Analytics Tab ==========
  if (sub === 'analytics') {
    const activeHelpers = subs.filter(s => s.is_active).length;
    const totalEvents = events.length;
    const waitingEvents = events.filter(e => e.status === 'waiting').length;
    const completedEvents = events.filter(e => e.status === 'completed').length;
    const totalResponses = eventResponses.length;
    const totalSkills = skills.length;
    const verifiedSkills = skills.filter(s => s.is_verified).length;
    const totalMessages = messages.length;
    const totalReviews = reviews.length;
    const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : '-';

    // Event type distribution
    const typeDist: Record<string, number> = {};
    events.forEach(e => { typeDist[e.event_type] = (typeDist[e.event_type] || 0) + 1; });

    // Urgency distribution
    const urgDist: Record<string, number> = {};
    events.forEach(e => { urgDist[e.urgency] = (urgDist[e.urgency] || 0) + 1; });

    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-6">互助数据分析</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="活跃互助者" value={activeHelpers} color="text-green-400" />
          <StatCard label="总求助事件" value={totalEvents} color="text-blue-400" />
          <StatCard label="等待响应" value={waitingEvents} color="text-amber-400" />
          <StatCard label="已完成事件" value={completedEvents} color="text-green-400" />
          <StatCard label="总响应次数" value={totalResponses} color="text-blue-400" />
          <StatCard label="注册技能" value={`${verifiedSkills}/${totalSkills}`} color="text-purple-400" />
          <StatCard label="聊天消息" value={totalMessages} color="text-cyan-400" />
          <StatCard label="平均评分" value={avgRating} color="text-amber-400" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">事件类型分布</h3>
            {Object.entries(typeDist).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between py-2 border-b border-slate-700/50">
                <span className="text-sm text-slate-300">{typeLabel(type)}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-slate-700 rounded-full h-2"><div className="bg-blue-400 h-2 rounded-full" style={{ width: `${Math.min(100, (count / totalEvents) * 100)}%` }} /></div>
                  <span className="text-sm text-white w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
            {Object.keys(typeDist).length === 0 && <div className="text-slate-500 text-sm">暂无数据</div>}
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">紧急程度分布</h3>
            {Object.entries(urgDist).map(([urg, count]) => (
              <div key={urg} className="flex items-center justify-between py-2 border-b border-slate-700/50">
                <span className="text-sm text-slate-300">{urgencyLabel(urg)}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-slate-700 rounded-full h-2"><div className={`h-2 rounded-full ${urg === 'urgent' ? 'bg-red-400' : urg === 'normal' ? 'bg-amber-400' : 'bg-slate-400'}`} style={{ width: `${Math.min(100, (count / totalEvents) * 100)}%` }} /></div>
                  <span className="text-sm text-white w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
            {Object.keys(urgDist).length === 0 && <div className="text-slate-500 text-sm">暂无数据</div>}
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">评价分布</h3>
            {[5, 4, 3, 2, 1].map(r => {
              const cnt = reviews.filter(rv => rv.rating === r).length;
              return (
                <div key={r} className="flex items-center justify-between py-2 border-b border-slate-700/50">
                  <span className="text-sm text-amber-400">{'★'.repeat(r)}{'☆'.repeat(5 - r)}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-slate-700 rounded-full h-2"><div className="bg-amber-400 h-2 rounded-full" style={{ width: `${totalReviews > 0 ? (cnt / totalReviews) * 100 : 0}%` }} /></div>
                    <span className="text-sm text-white w-8 text-right">{cnt}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">技能类型分布</h3>
            {(() => {
              const sd: Record<string, number> = {};
              skills.forEach(s => { sd[s.skill_type] = (sd[s.skill_type] || 0) + 1; });
              return Object.entries(sd).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between py-2 border-b border-slate-700/50">
                  <span className="text-sm text-slate-300">{skillTypeLabel(type)}</span>
                  <span className="text-sm text-white">{count}</span>
                </div>
              ));
            })()}
            {skills.length === 0 && <div className="text-slate-500 text-sm">暂无数据</div>}
          </div>
        </div>
      </div>
    );
  }

  // ========== Rewards Tab ==========
  if (sub === 'rewards') {
    const totalRewards = subs.reduce((s, su) => s + (su.total_rewards || 0), 0);
    const activeSubs = subs.filter(s => s.is_active).length;
    const responseRewards = responses.reduce((s, r) => s + (r.reward_amount || 0), 0);
    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-6">奖励管理</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="活跃互助者" value={activeSubs} color="text-white" />
          <StatCard label="总响应次数" value={responses.length} color="text-white" />
          <StatCard label="累计发放奖励" value={`¥${totalRewards}`} color="text-green-400" />
          <StatCard label="本期响应奖励" value={`¥${responseRewards}`} color="text-blue-400" />
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="font-semibold text-white mb-4">奖励规则</h3>
          {[{ action: '接受SOS请求', points: '10积分' }, { action: '到达现场', points: '20积分' }, { action: '完成救助', points: '50积分' }, { action: '获得5星好评', points: '20积分' }].map(r => (
            <div key={r.action} className="flex items-center justify-between py-3 border-b border-slate-700/50">
              <span className="text-sm text-slate-300">{r.action}</span>
              <span className="text-sm text-green-400 font-medium">{r.points}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ========== Events Tab ==========
  if (sub === 'events') {
    const filtered = events.filter(i => !search || JSON.stringify(i).toLowerCase().includes(search.toLowerCase()));
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">求助事件 ({filtered.length})</h2>
          <Btn variant="secondary" onClick={load}>刷新</Btn>
        </div>
        <div className="flex gap-3 mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索事件..." /></div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-slate-700">
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">ID</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">类型</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">标题</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">紧急度</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">状态</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">响应数</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">创建时间</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">操作</th>
          </tr></thead><tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="p-4 text-sm text-white font-mono">{item.id.slice(0, 8)}</td>
                <td className="p-4 text-sm"><span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">{typeLabel(item.event_type)}</span></td>
                <td className="p-4 text-sm text-white max-w-48 truncate">{item.title}</td>
                <td className="p-4 text-sm"><span className={`px-2 py-1 rounded text-xs ${item.urgency === 'urgent' ? 'bg-red-500/20 text-red-400' : item.urgency === 'low' ? 'bg-gray-500/20 text-gray-400' : 'bg-amber-500/20 text-amber-400'}`}>{urgencyLabel(item.urgency)}</span></td>
                <td className="p-4 text-sm"><span className={`px-2 py-1 rounded text-xs ${eventStatusBadge(item.status)}`}>{eventStatusLabel(item.status)}</span></td>
                <td className="p-4 text-sm text-white">{item.responder_count || 0}</td>
                <td className="p-4 text-sm text-slate-400">{fmt(item.created_at)}</td>
                <td className="p-4"><button onClick={() => setDetail({ ...item, _type: 'event' })} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
              </tr>
            ))}
          </tbody></table>
          {filtered.length === 0 && <div className="text-center text-slate-500 py-12">暂无数据</div>}
        </div>
      </div>
    );
  }

  // ========== Skills Tab ==========
  if (sub === 'skills') {
    const filtered = skills.filter(i => !search || JSON.stringify(i).toLowerCase().includes(search.toLowerCase()));
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">技能管理 ({filtered.length})</h2>
          <Btn variant="secondary" onClick={load}>刷新</Btn>
        </div>
        <div className="flex gap-3 mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索技能..." /></div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-slate-700">
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">ID</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">用户</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">类型</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">名称</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">认证</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">创建时间</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">操作</th>
          </tr></thead><tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="p-4 text-sm text-white font-mono">{item.id.slice(0, 8)}</td>
                <td className="p-4 text-sm text-slate-300 font-mono">{item.user_id?.slice(0, 12)}</td>
                <td className="p-4 text-sm"><span className="px-2 py-1 rounded text-xs bg-purple-500/20 text-purple-400">{skillTypeLabel(item.skill_type)}</span></td>
                <td className="p-4 text-sm text-white">{item.skill_name}</td>
                <td className="p-4 text-sm">{item.is_verified ? <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">已认证</span> : <span className="px-2 py-1 rounded text-xs bg-gray-500/20 text-gray-400">未认证</span>}</td>
                <td className="p-4 text-sm text-slate-400">{fmt(item.created_at)}</td>
                <td className="p-4 flex gap-1">
                  <button onClick={() => toggleVerify(item.id, !item.is_verified)} className={`p-1.5 rounded text-xs ${item.is_verified ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}>{item.is_verified ? '取消' : '认证'}</button>
                  <button onClick={() => setDetail({ ...item, _type: 'skill' })} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                </td>
              </tr>
            ))}
          </tbody></table>
          {filtered.length === 0 && <div className="text-center text-slate-500 py-12">暂无数据</div>}
        </div>
      </div>
    );
  }

  // ========== Messages Tab ==========
  if (sub === 'messages') {
    const filtered = messages.filter(i => !search || JSON.stringify(i).toLowerCase().includes(search.toLowerCase()));
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">聊天记录 ({filtered.length})</h2>
          <Btn variant="secondary" onClick={load}>刷新</Btn>
        </div>
        <div className="flex gap-3 mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索消息..." /></div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-slate-700">
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">ID</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">事件ID</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">发送者</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">消息</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">类型</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">时间</th>
          </tr></thead><tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="p-4 text-sm text-white font-mono">{item.id.slice(0, 8)}</td>
                <td className="p-4 text-sm text-slate-300 font-mono">{item.event_id?.slice(0, 8)}</td>
                <td className="p-4 text-sm text-slate-300 font-mono">{item.sender_id?.slice(0, 12)}</td>
                <td className="p-4 text-sm text-white max-w-64 truncate">{item.message}</td>
                <td className="p-4 text-sm"><span className={`px-2 py-1 rounded text-xs ${item.message_type === 'system' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>{item.message_type}</span></td>
                <td className="p-4 text-sm text-slate-400">{fmt(item.created_at)}</td>
              </tr>
            ))}
          </tbody></table>
          {filtered.length === 0 && <div className="text-center text-slate-500 py-12">暂无数据</div>}
        </div>
      </div>
    );
  }

  // ========== Reviews Tab ==========
  if (sub === 'reviews') {
    const filtered = reviews.filter(i => !search || JSON.stringify(i).toLowerCase().includes(search.toLowerCase()));
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">评价管理 ({filtered.length})</h2>
          <Btn variant="secondary" onClick={load}>刷新</Btn>
        </div>
        <div className="flex gap-3 mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索评价..." /></div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-slate-700">
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">ID</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">事件</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">评价者</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">评分</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">评论</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">时间</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">操作</th>
          </tr></thead><tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="p-4 text-sm text-white font-mono">{item.id.slice(0, 8)}</td>
                <td className="p-4 text-sm text-slate-300 font-mono">{item.event_id?.slice(0, 8)}</td>
                <td className="p-4 text-sm text-slate-300 font-mono">{item.reviewer_id?.slice(0, 12)}</td>
                <td className="p-4 text-sm text-amber-400">{'★'.repeat(item.rating || 0)}</td>
                <td className="p-4 text-sm text-white max-w-48 truncate">{item.comment || '-'}</td>
                <td className="p-4 text-sm text-slate-400">{fmt(item.created_at)}</td>
                <td className="p-4"><button onClick={() => setDetail({ ...item, _type: 'review' })} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
              </tr>
            ))}
          </tbody></table>
          {filtered.length === 0 && <div className="text-center text-slate-500 py-12">暂无数据</div>}
        </div>
      </div>
    );
  }

  // ========== Event Responses Tab ==========
  if (sub === 'responses' && eventResponses.length > 0) {
    // Prefer showing event responses if they exist
    const filtered = eventResponses.filter(i => !search || JSON.stringify(i).toLowerCase().includes(search.toLowerCase()));
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">响应记录 ({filtered.length})</h2>
          <Btn variant="secondary" onClick={load}>刷新</Btn>
        </div>
        <div className="flex gap-3 mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索..." /></div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full"><thead><tr className="border-b border-slate-700">
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">ID</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">事件ID</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">响应者</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">状态</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">ETA</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">时间</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">操作</th>
          </tr></thead><tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="p-4 text-sm text-white font-mono">{item.id.slice(0, 8)}</td>
                <td className="p-4 text-sm text-slate-300 font-mono">{item.event_id?.slice(0, 8)}</td>
                <td className="p-4 text-sm text-slate-300 font-mono">{item.responder_id?.slice(0, 12)}</td>
                <td className="p-4 text-sm"><span className={`px-2 py-1 rounded text-xs ${stBadge(item.status)}`}>{item.status}</span></td>
                <td className="p-4 text-sm text-white">{item.eta_minutes ? `${item.eta_minutes}min` : '-'}</td>
                <td className="p-4 text-sm text-slate-400">{fmt(item.created_at)}</td>
                <td className="p-4"><button onClick={() => setDetail({ ...item, _type: 'eventResponse' })} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
              </tr>
            ))}
          </tbody></table>
          {filtered.length === 0 && <div className="text-center text-slate-500 py-12">暂无数据</div>}
        </div>
      </div>
    );
  }

  // ========== Default: Subscriptions / Legacy Responses ==========
  const items = sub === 'responses' ? responses : subs;
  const filtered = items.filter(i => !search || JSON.stringify(i).toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{sub === 'responses' ? '响应记录(旧版)' : '互助订阅'} ({filtered.length})</h2>
        <Btn variant="secondary" onClick={load}>刷新</Btn>
      </div>
      <div className="flex gap-3 mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索..." /></div>
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full"><thead><tr className="border-b border-slate-700">
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">ID</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">{sub === 'responses' ? '响应者' : '用户'}</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">{sub === 'responses' ? 'SOS ID' : '状态'}</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">{sub === 'responses' ? '状态' : '总奖励'}</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">{sub === 'responses' ? '奖励' : '订阅时间'}</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">操作</th>
        </tr></thead><tbody>
          {filtered.map(item => (
            <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
              <td className="p-4 text-sm text-white font-mono">{item.id.slice(0,8)}</td>
              <td className="p-4 text-sm text-slate-300 font-mono">{(item.responder_id || item.user_id)?.slice(0,12)}</td>
              <td className="p-4 text-sm">{sub === 'responses' ? <span className="font-mono text-slate-300">{item.sos_id?.slice(0,8)}</span> : <span className={`px-2 py-1 rounded text-xs ${item.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{item.is_active ? '活跃' : '未激活'}</span>}</td>
              <td className="p-4 text-sm">{sub === 'responses' ? <span className={`px-2 py-1 rounded text-xs ${stBadge(item.status)}`}>{item.status}</span> : <span className="text-green-400">¥{item.total_rewards||0}</span>}</td>
              <td className="p-4 text-sm text-slate-400">{sub === 'responses' ? (item.reward_amount ? `¥${item.reward_amount}` : '-') : fmt(item.subscribed_at)}</td>
              <td className="p-4"><button onClick={() => setDetail(item)} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
            </tr>
          ))}
        </tbody></table>
        {filtered.length === 0 && <div className="text-center text-slate-500 py-12">暂无数据</div>}
      </div>
    </div>
  );

  // ========== Helper functions ==========
  async function updateEventStatus(id: string, status: string) {
    const { error } = await supabase.from('mutual_aid_events').update({ status }).eq('id', id);
    if (error) showToast('更新失败: ' + error.message);
    else { showToast('状态已更新'); setDetail(null); load(); }
  }

  async function toggleVerify(id: string, verified: boolean) {
    const { error } = await supabase.from('mutual_aid_skills').update({ is_verified: verified }).eq('id', id);
    if (error) showToast('操作失败: ' + error.message);
    else { showToast(verified ? '已认证' : '已取消认证'); load(); }
  }
}

// ========== Shared UI Components ==========
function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

// ========== Label helpers ==========
function typeLabel(type: string) {
  const map: Record<string, string> = { medical: '紧急医疗', supply: '物资分享', translate: '翻译协助', transport: '交通援助', shelter: '临时庇护', general: '一般求助' };
  return map[type] || type;
}

function urgencyLabel(urg: string) {
  const map: Record<string, string> = { urgent: '紧急', normal: '普通', low: '低优先级' };
  return map[urg] || urg;
}

function eventStatusLabel(status: string) {
  const map: Record<string, string> = { waiting: '等待响应', responding: '有人响应', in_progress: '进行中', completed: '已完成', cancelled: '已取消', expired: '已过期' };
  return map[status] || status;
}

function eventStatusBadge(status: string) {
  const map: Record<string, string> = { waiting: 'bg-amber-500/20 text-amber-400', responding: 'bg-blue-500/20 text-blue-400', in_progress: 'bg-blue-500/20 text-blue-400', completed: 'bg-green-500/20 text-green-400', cancelled: 'bg-gray-500/20 text-gray-400', expired: 'bg-gray-500/20 text-gray-400' };
  return map[status] || 'bg-gray-500/20 text-gray-400';
}

function skillTypeLabel(type: string) {
  const map: Record<string, string> = { medical: '医疗急救', driving: '驾驶', translation: '翻译', technical: '技术', cooking: '烹饪', other: '其他' };
  return map[type] || type;
}
