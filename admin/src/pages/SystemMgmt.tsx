import React, { useState, useEffect, useCallback } from 'react';
import { useAdmin, Btn, SearchBar, Modal, AdminAccount, getAdminAccounts, saveAdminAccounts, hashPwd, fmt, StatCard } from '../App';

// ==================== AI Collection Config (localStorage) ====================
interface DataSource {
  id: string; name: string; type: 'api' | 'rss' | 'webhook' | 'ai'; url: string;
  country: string; reliability: number; enabled: boolean; intervalMin: number;
}
interface CollectLog {
  ts: string; source: string; result: 'success' | 'error'; alertsFound: number; duration: number; msg?: string;
}

const SOURCES_KEY = 'wa_ai_sources';
const SCHEDULE_KEY = 'wa_ai_schedule';
const LOG_KEY = 'wa_ai_logs';

const DEFAULT_SOURCES: DataSource[] = [
  { id: 'ua_alerts', name: 'Ukraine Alerts', type: 'api', url: 'alerts.com.ua', country: 'Ukraine', reliability: 0.95, enabled: true, intervalMin: 5 },
  { id: 'il_alerts', name: 'Israel Alerts', type: 'api', url: 'oref.org.il', country: 'Israel', reliability: 0.95, enabled: true, intervalMin: 5 },
  { id: 'sy_alerts', name: 'Syria Alerts', type: 'rss', url: 'syria.liveuamap.com', country: 'Syria', reliability: 0.85, enabled: true, intervalMin: 15 },
  { id: 'tr_alerts', name: 'Turkey Alerts', type: 'api', url: 'deprem.afad.gov.tr', country: 'Turkey', reliability: 0.90, enabled: true, intervalMin: 10 },
  { id: 'ps_alerts', name: 'Palestine Alerts', type: 'rss', url: 'gaza.liveuamap.com', country: 'Palestine', reliability: 0.85, enabled: true, intervalMin: 15 },
  { id: 'ai_analyzer', name: 'MEOO AI Analyzer', type: 'ai', url: 'api.meoo.host', country: 'Global', reliability: 0.80, enabled: true, intervalMin: 10 },
];

function getSources(): DataSource[] {
  try { const s = JSON.parse(localStorage.getItem(SOURCES_KEY) || 'null'); return s || [...DEFAULT_SOURCES]; } catch { return [...DEFAULT_SOURCES]; }
}
function saveSources(s: DataSource[]) { localStorage.setItem(SOURCES_KEY, JSON.stringify(s)); }
function getSchedule(): { enabled: boolean; baseInterval: number; redInterval: number; orangeInterval: number; yellowInterval: number } {
  try { return JSON.parse(localStorage.getItem(SCHEDULE_KEY) || 'null') || { enabled: true, baseInterval: 10, redInterval: 5, orangeInterval: 15, yellowInterval: 30 }; } catch { return { enabled: true, baseInterval: 10, redInterval: 5, orangeInterval: 15, yellowInterval: 30 }; }
}
function saveSchedule(s: any) { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(s)); }
function getLogs(): CollectLog[] { try { return JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); } catch { return []; } }
function addLog(log: CollectLog) { const logs = getLogs(); logs.unshift(log); if (logs.length > 200) logs.length = 200; localStorage.setItem(LOG_KEY, JSON.stringify(logs)); }

export default function SystemMgmtPage({ sub }: { sub: string }) {
  const admin = useAdmin();
  const supabase = (admin as any).supabase;
  const showToast = admin.showToast;
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const triggerMonitor = async () => {
    setMonitorLoading(true);
    try {
      const { error } = await (supabase as any).functions.invoke('monitor', { body: { action: 'collect' } });
      if (error) throw error;
      showToast('监控数据采集成功');
    } catch (e: any) { showToast('失败: ' + (e.message || '未知错误')); }
    setMonitorLoading(false);
  };

  const triggerAI = async () => {
    setAiLoading(true);
    try {
      const { error } = await (supabase as any).functions.invoke('ai-alert', { body: { action: 'check' } });
      if (error) throw error;
      showToast('AI检测已触发');
    } catch (e: any) { showToast('失败: ' + (e.message || '未知错误')); }
    setAiLoading(false);
  };

  if (sub === 'aiCollect') {
    return <AICollectionManagement />;
  }

  if (sub === 'functions') {
    const functions = [
      { name: 'ai-alert', desc: 'AI预警检测与分析 - 24/7监控200+全球数据源', actions: ['check', 'analyze'] },
      { name: 'monitor', desc: '增量监控 - RSS/API/Webhook数据采集与验证', actions: ['collect', 'validate'] },
      { name: 'sos-service', desc: 'SOS服务 - 触发/取消/解救/升级链管理', actions: ['trigger', 'cancel', 'resolve'] },
      { name: 'family-service', desc: '家庭组服务 - 创建/加入/离开/位置同步', actions: ['create', 'join', 'leave'] },
      { name: 'mutual-aid', desc: '互助系统 - 响应匹配/奖励发放/积分管理', actions: ['match', 'reward'] },
      { name: 'subscription', desc: '订阅服务 - 套餐管理/支付/试用/邀请折扣', actions: ['subscribe', 'cancel'] },
      { name: 'simulation-alert', desc: '模拟预警 - 7天试用/多语言模板/全级别测试', actions: ['trigger', 'report'] },
    ];

    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-6">Edge Functions 管理</h2>
        <div className="space-y-4">
          {functions.map(f => (
            <div key={f.name} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <h3 className="font-semibold text-white font-mono">{f.name}</h3>
                </div>
                <span className="text-xs text-green-400">运行中</span>
              </div>
              <p className="text-sm text-slate-400 mb-3">{f.desc}</p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-slate-500">支持操作:</span>
                {f.actions.map(a => (
                  <span key={a} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300 font-mono">{a}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sub === 'notifications') {
    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-6">通知日志</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">通知渠道</h3>
            {[
              { ch: '应用内推送', status: '启用', desc: 'FCM / APNs 推送通知' },
              { ch: 'SMS短信', status: '启用', desc: 'Twilio API - 红色/橙色预警双通道备份' },
              { ch: 'AI语音电话', status: '启用', desc: 'Twilio Voice - SOS升级链第二阶段' },
              { ch: '闪光灯警报', status: '启用', desc: 'Android Camera2 API - 无障碍预警' },
              { ch: '邮件通知', status: '计划中', desc: '救援确认/订阅通知' },
            ].map(n => (
              <div key={n.ch} className="flex items-center justify-between py-3 border-b border-slate-700/50">
                <div>
                  <div className="text-sm text-white">{n.ch}</div>
                  <div className="text-xs text-slate-400">{n.desc}</div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${n.status === '启用' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{n.status}</span>
              </div>
            ))}
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">SOS升级链</h3>
            {[
              { stage: '1', name: '闪光灯预警', time: '90秒', desc: 'SOS闪烁 + 全屏弹窗 + 倒计时' },
              { stage: '2', name: 'AI语音电话', time: '30秒', desc: 'Twilio拨打用户电话核实安全' },
              { stage: '3', name: '救援通知', time: '立即', desc: 'SMS紧急联系人 + 家人 + 互助广播 + 后台提交' },
            ].map(s => (
              <div key={s.stage} className="flex items-start gap-4 py-3 border-b border-slate-700/50">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold shrink-0">{s.stage}</div>
                <div>
                  <div className="text-sm text-white">{s.name} <span className="text-xs text-slate-400">({s.time})</span></div>
                  <div className="text-xs text-slate-400">{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (sub === 'sms') {
    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-6">SMS记录</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <div className="text-xs text-slate-400 mb-1">SMS服务商</div>
            <div className="text-lg font-bold text-white">Twilio</div>
            <div className="text-xs text-green-400 mt-1">已配置</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <div className="text-xs text-slate-400 mb-1">支持场景</div>
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">紧急预警</span>
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">SOS救援</span>
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">验证码</span>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <div className="text-xs text-slate-400 mb-1">多语言支持</div>
            <div className="flex flex-wrap gap-1 mt-2">
              {['中文', 'English', 'Русский', 'العربية', 'Español', 'Français', 'Українська', 'Türkçe', 'עברית'].map(l => (
                <span key={l} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">{l}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="font-semibold text-white mb-4">SMS模板</h3>
          {[
            { name: 'alert_sms', desc: '预警通知短信 - 红色/橙色预警时发送', example: '[WarRescue] {severity}预警: {title} - {city}' },
            { name: 'sos_sms', desc: 'SOS紧急短信 - 发给紧急联系人', example: '[WarRescue] 紧急! {user}需要帮助 位置:{location}' },
            { name: 'rescue_sms', desc: '救援通知 - 发给家人和互助者', example: '[WarRescue] 救援请求 - 请联系{contact} 位置:{location}' },
            { name: 'verify_sms', desc: '验证码短信 - 登录/注册验证', example: '[WarRescue] 您的验证码: {code}, 5分钟有效' },
          ].map(t => (
            <div key={t.name} className="py-3 border-b border-slate-700/50">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-white font-mono">{t.name}</span>
                <span className="text-xs text-green-400">已配置</span>
              </div>
              <div className="text-xs text-slate-400 mb-1">{t.desc}</div>
              <div className="text-xs text-slate-500 font-mono bg-slate-700/50 rounded p-2">{t.example}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (sub === 'admins') {
    return <AdminManagement />;
  }

  // Default: monitor
  return (
    <div>
      <h2 className="text-xl font-bold text-white mb-6">服务监控</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { name: '数据库', desc: 'Supabase PostgreSQL', status: '已连接' },
          { name: 'Edge Functions', desc: 'Deno Runtime', status: '运行中' },
          { name: '认证服务', desc: 'Supabase Auth', status: '正常' },
          { name: '存储服务', desc: 'Supabase Storage', status: '正常' },
        ].map(s => (
          <div key={s.name} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-white font-medium text-sm">{s.name}</span>
            </div>
            <div className="text-sm text-slate-400">{s.desc}</div>
            <div className="text-xs text-green-400 mt-1">{s.status}</div>
          </div>
        ))}
      </div>

      <h3 className="font-semibold text-white mb-4">服务操作</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h4 className="font-medium text-white mb-2">增量监控</h4>
          <p className="text-sm text-slate-400 mb-4">手动触发RSS/API/Webhook数据采集</p>
          <button onClick={triggerMonitor} disabled={monitorLoading} className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors">
            {monitorLoading ? '采集中...' : '触发数据采集'}
          </button>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h4 className="font-medium text-white mb-2">AI预警检测</h4>
          <p className="text-sm text-slate-400 mb-4">手动触发AI分析最新情报生成预警</p>
          <button onClick={triggerAI} disabled={aiLoading} className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-sm text-white transition-colors">
            {aiLoading ? '检测中...' : '触发AI检测'}
          </button>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h4 className="font-medium text-white mb-2">系统信息</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">平台</span><span className="text-white">MEOO Cloud</span></div>
            <div className="flex justify-between"><span className="text-slate-400">数据库</span><span className="text-white">PostgreSQL 15</span></div>
            <div className="flex justify-between"><span className="text-slate-400">运行时</span><span className="text-white">Deno Edge</span></div>
            <div className="flex justify-between"><span className="text-slate-400">语言支持</span><span className="text-white">9种语言</span></div>
            <div className="flex justify-between"><span className="text-slate-400">监控国家</span><span className="text-white">8个</span></div>
            <div className="flex justify-between"><span className="text-slate-400">监控城市</span><span className="text-white">30+</span></div>
          </div>
        </div>
      </div>

      <h3 className="font-semibold text-white mb-4">Android App 服务</h3>
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full"><thead><tr className="border-b border-slate-700">
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">服务名</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">类型</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">描述</th>
        </tr></thead><tbody>
          {[
            { name: 'FlashlightAlertService', type: 'Foreground (Camera)', desc: 'SOS闪光灯模式 - 90秒超时后升级' },
            { name: 'AIVoiceCallService', type: 'Foreground (PhoneCall)', desc: 'AI语音电话核实 - 30秒超时后升级' },
            { name: 'RescueNotificationService', type: 'Foreground (DataSync)', desc: '救援通知 - SMS/通知/互助广播/后台提交' },
            { name: 'TwilioService', type: 'Network', desc: 'SMS和Voice API - 紧急通知双通道' },
            { name: 'DeepSeekService', type: 'Network', desc: 'AI语言处理 - 语音指令/自然语言' },
            { name: 'AliTranslateService', type: 'Network', desc: '实时翻译 - 9种语言支持' },
          ].map(s => (
            <tr key={s.name} className="border-b border-slate-700/50 hover:bg-slate-700/30">
              <td className="p-4 text-sm font-mono text-white">{s.name}</td>
              <td className="p-4 text-sm text-slate-300">{s.type}</td>
              <td className="p-4 text-sm text-slate-400">{s.desc}</td>
            </tr>
          ))}
        </tbody></table>
      </div>
    </div>
  );
}

// ==================== AI Collection Management ====================
function AICollectionManagement() {
  const { supabase, showToast } = useAdmin();
  const [sources, setSources] = useState<DataSource[]>([]);
  const [schedule, setSchedule] = useState(getSchedule());
  const [logs, setLogs] = useState<CollectLog[]>([]);
  const [alertStats, setAlertStats] = useState({ total: 0, ai: 0, today: 0, red: 0, orange: 0, yellow: 0, verified: 0 });
  const [tab, setTab] = useState<'status' | 'sources' | 'schedule' | 'logs'>('status');
  const [busy, setBusy] = useState('');
  const [editSource, setEditSource] = useState<DataSource | null>(null);
  const [showAddSource, setShowAddSource] = useState(false);

  // Form for add/edit source
  const [fName, setFName] = useState('');
  const [fType, setFType] = useState<DataSource['type']>('api');
  const [fUrl, setFUrl] = useState('');
  const [fCountry, setFCountry] = useState('');
  const [fReliability, setFReliability] = useState(0.8);
  const [fInterval, setFInterval] = useState(10);

  const reload = useCallback(() => {
    setSources(getSources());
    setLogs(getLogs());
    setSchedule(getSchedule());
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const [
        { count: total },
        { count: ai },
        { count: todayCount },
        { count: red },
        { count: orange },
        { count: yellow },
        { count: verified },
      ] = await Promise.all([
        supabase.from('alerts').select('*', { count: 'exact', head: true }),
        supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('source', 'AI Analyzer'),
        supabase.from('alerts').select('*', { count: 'exact', head: true }).gte('created_at', today),
        supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('severity', 'red'),
        supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('severity', 'orange'),
        supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('severity', 'yellow'),
        supabase.from('alerts').select('*', { count: 'exact', head: true }).eq('is_verified', true),
      ]);
      setAlertStats({ total: total || 0, ai: ai || 0, today: todayCount || 0, red: red || 0, orange: orange || 0, yellow: yellow || 0, verified: verified || 0 });
    } catch {}
  }, [supabase]);

  useEffect(() => { reload(); loadStats(); }, [reload, loadStats]);

  // Actions
  const invokeFunction = async (fn: string, action: string, label: string) => {
    setBusy(action);
    const t0 = Date.now();
    try {
      const { error } = await (supabase as any).functions.invoke(fn, { body: { action } });
      const dur = Date.now() - t0;
      if (error) throw error;
      addLog({ ts: new Date().toISOString(), source: `${fn}/${action}`, result: 'success', alertsFound: 0, duration: dur });
      showToast(`${label} - 成功 (${dur}ms)`);
    } catch (e: any) {
      const dur = Date.now() - t0;
      addLog({ ts: new Date().toISOString(), source: `${fn}/${action}`, result: 'error', alertsFound: 0, duration: dur, msg: e.message });
      showToast(`${label} - 失败: ${e.message || '未知错误'}`);
    }
    setBusy('');
    reload();
    loadStats();
  };

  const toggleSource = (id: string) => {
    const s = getSources();
    const idx = s.findIndex(x => x.id === id);
    if (idx >= 0) { s[idx].enabled = !s[idx].enabled; saveSources(s); reload(); showToast(s[idx].enabled ? `已启用: ${s[idx].name}` : `已禁用: ${s[idx].name}`); }
  };

  const deleteSource = (id: string) => {
    if (!confirm('确认删除此数据源?')) return;
    const s = getSources().filter(x => x.id !== id);
    saveSources(s); reload(); showToast('已删除');
  };

  const handleSaveSource = (e: React.FormEvent) => {
    e.preventDefault();
    const s = getSources();
    if (editSource) {
      const idx = s.findIndex(x => x.id === editSource.id);
      if (idx >= 0) { s[idx] = { ...s[idx], name: fName, type: fType, url: fUrl, country: fCountry, reliability: fReliability, intervalMin: fInterval }; }
    } else {
      s.push({ id: 'src-' + Date.now(), name: fName, type: fType, url: fUrl, country: fCountry, reliability: fReliability, enabled: true, intervalMin: fInterval });
    }
    saveSources(s); setEditSource(null); setShowAddSource(false); reload(); showToast(editSource ? '已更新' : '已添加');
  };

  const openEditSource = (src: DataSource) => {
    setEditSource(src); setFName(src.name); setFType(src.type); setFUrl(src.url); setFCountry(src.country); setFReliability(src.reliability); setFInterval(src.intervalMin);
  };

  const openAddSource = () => {
    setShowAddSource(true); setEditSource(null); setFName(''); setFType('api'); setFUrl(''); setFCountry(''); setFReliability(0.8); setFInterval(15);
  };

  const handleScheduleSave = () => {
    saveSchedule(schedule); showToast('调度配置已保存');
  };

  const clearLogs = () => { localStorage.setItem(LOG_KEY, '[]'); reload(); showToast('日志已清空'); };

  const typeColor: Record<string, string> = { api: 'bg-blue-500/20 text-blue-400', rss: 'bg-orange-500/20 text-orange-400', webhook: 'bg-purple-500/20 text-purple-400', ai: 'bg-emerald-500/20 text-emerald-400' };

  const enabledCount = sources.filter(s => s.enabled).length;

  // ========== Tab: Status ==========
  const StatusTab = () => (
    <div>
      {/* Top status bar */}
      <div className="flex items-center gap-4 mb-6 bg-slate-800 rounded-xl border border-slate-700 p-4">
        <div className={`w-4 h-4 rounded-full ${schedule.enabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
        <div className="flex-1">
          <div className="text-white font-medium text-sm">{schedule.enabled ? '24h 实时采集运行中' : '采集已暂停'}</div>
          <div className="text-slate-400 text-xs">{enabledCount}/{sources.length} 数据源启用 | 基准频率: 每 {schedule.baseInterval} 分钟</div>
        </div>
        <button onClick={() => { setSchedule(p => { const n = { ...p, enabled: !p.enabled }; saveSchedule(n); return n; }); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${schedule.enabled ? 'bg-red-600/20 text-red-400 hover:bg-red-600/40' : 'bg-green-600/20 text-green-400 hover:bg-green-600/40'}`}>
          {schedule.enabled ? '暂停采集' : '恢复采集'}
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        <StatCard label="总预警数" value={alertStats.total} color="from-slate-700 to-slate-800" />
        <StatCard label="AI生成" value={alertStats.ai} color="from-emerald-900/50 to-emerald-800/30" />
        <StatCard label="今日新增" value={alertStats.today} color="from-blue-900/50 to-blue-800/30" />
        <StatCard label="红色预警" value={alertStats.red} color="from-red-900/50 to-red-800/30" />
        <StatCard label="橙色预警" value={alertStats.orange} color="from-orange-900/50 to-orange-800/30" />
        <StatCard label="黄色预警" value={alertStats.yellow} color="from-yellow-900/50 to-yellow-800/30" />
        <StatCard label="已验证" value={alertStats.verified} color="from-green-900/50 to-green-800/30" />
      </div>

      {/* Action panel */}
      <h3 className="font-semibold text-white mb-3">采集操作</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        {[
          { action: 'collect', fn: 'ai-alert', label: '立即采集', desc: '全量数据源采集', color: 'bg-blue-600 hover:bg-blue-700' },
          { action: 'analyze', fn: 'ai-alert', label: 'AI分析', desc: '触发AI威胁分析', color: 'bg-purple-600 hover:bg-purple-700' },
          { action: 'verify', fn: 'ai-alert', label: 'AI验证', desc: '验证待确认预警', color: 'bg-cyan-600 hover:bg-cyan-700' },
          { action: 'process', fn: 'ai-alert', label: '处理过期', desc: '清理即将过期预警', color: 'bg-yellow-600 hover:bg-yellow-700' },
          { action: 'cleanup', fn: 'ai-alert', label: '数据清理', desc: '删除7天前失效数据', color: 'bg-red-600 hover:bg-red-700' },
        ].map(a => (
          <button key={a.action} onClick={() => invokeFunction(a.fn, a.action, a.label)} disabled={!!busy}
            className={`${a.color} disabled:opacity-50 rounded-xl p-4 text-left transition-colors`}>
            <div className="text-white text-sm font-medium">{busy === a.action ? '执行中...' : a.label}</div>
            <div className="text-white/60 text-xs mt-1">{a.desc}</div>
          </button>
        ))}
      </div>

      {/* Data source quick view */}
      <h3 className="font-semibold text-white mb-3">数据源状态</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {sources.map(src => (
          <div key={src.id} className={`bg-slate-800 rounded-xl border p-4 ${src.enabled ? 'border-slate-700' : 'border-slate-700/50 opacity-60'}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${src.enabled ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
                <span className="text-white text-sm font-medium">{src.name}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${typeColor[src.type]}`}>{src.type}</span>
            </div>
            <div className="text-xs text-slate-400 space-y-1">
              <div className="flex justify-between"><span>地区</span><span className="text-slate-300">{src.country}</span></div>
              <div className="flex justify-between"><span>端点</span><span className="text-slate-300 font-mono">{src.url}</span></div>
              <div className="flex justify-between"><span>频率</span><span className="text-slate-300">每 {src.intervalMin} 分钟</span></div>
              <div className="flex justify-between"><span>可靠度</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden"><div className={`h-full rounded-full ${src.reliability >= 0.9 ? 'bg-green-500' : src.reliability >= 0.8 ? 'bg-blue-500' : 'bg-yellow-500'}`} style={{ width: `${src.reliability * 100}%` }} /></div>
                  <span className="text-slate-300">{(src.reliability * 100).toFixed(0)}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI model info */}
      <h3 className="font-semibold text-white mb-3">AI模型配置</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white font-medium text-sm">MEOO AI (预警分析)</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-slate-400">模型</span><span className="text-white font-mono">qwen3-vl-plus</span></div>
            <div className="flex justify-between"><span className="text-slate-400">API</span><span className="text-white font-mono">api.meoo.host</span></div>
            <div className="flex justify-between"><span className="text-slate-400">类型</span><span className="text-white">多模态 (文本+图片)</span></div>
            <div className="flex justify-between"><span className="text-slate-400">用途</span><span className="text-white">预警生成 / 威胁验证 / 情报分析</span></div>
            <div className="flex justify-between"><span className="text-slate-400">验证阈值</span><span className="text-white">confidence &ge; 0.6</span></div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-white font-medium text-sm">DeepSeek AI (客户端)</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-slate-400">模型</span><span className="text-white font-mono">deepseek-chat</span></div>
            <div className="flex justify-between"><span className="text-slate-400">API</span><span className="text-white font-mono">api.deepseek.com</span></div>
            <div className="flex justify-between"><span className="text-slate-400">类型</span><span className="text-white">自然语言处理</span></div>
            <div className="flex justify-between"><span className="text-slate-400">用途</span><span className="text-white">威胁分析 / 语音指令 / 城市核实</span></div>
            <div className="flex justify-between"><span className="text-slate-400">平台</span><span className="text-white">Android App</span></div>
          </div>
        </div>
      </div>
    </div>
  );

  // ========== Tab: Sources ==========
  const SourcesTab = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-slate-400 text-sm">{enabledCount}/{sources.length} 个数据源启用</div>
        <Btn onClick={openAddSource}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          添加数据源
        </Btn>
      </div>
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-slate-700">
            <th className="text-left p-3 text-xs font-medium text-slate-400">状态</th>
            <th className="text-left p-3 text-xs font-medium text-slate-400">名称</th>
            <th className="text-left p-3 text-xs font-medium text-slate-400">类型</th>
            <th className="text-left p-3 text-xs font-medium text-slate-400">端点</th>
            <th className="text-left p-3 text-xs font-medium text-slate-400">地区</th>
            <th className="text-left p-3 text-xs font-medium text-slate-400">频率</th>
            <th className="text-left p-3 text-xs font-medium text-slate-400">可靠度</th>
            <th className="text-right p-3 text-xs font-medium text-slate-400">操作</th>
          </tr></thead>
          <tbody>
            {sources.map(src => (
              <tr key={src.id} className={`border-b border-slate-700/50 hover:bg-slate-700/30 ${src.enabled ? '' : 'opacity-50'}`}>
                <td className="p-3">
                  <button onClick={() => toggleSource(src.id)} className={`w-9 h-5 rounded-full relative transition-colors ${src.enabled ? 'bg-green-600' : 'bg-slate-600'}`}>
                    <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all ${src.enabled ? 'right-[3px]' : 'left-[3px]'}`} />
                  </button>
                </td>
                <td className="p-3 text-sm text-white font-medium">{src.name}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${typeColor[src.type]}`}>{src.type}</span></td>
                <td className="p-3 text-xs text-slate-300 font-mono">{src.url}</td>
                <td className="p-3 text-sm text-slate-300">{src.country}</td>
                <td className="p-3 text-sm text-slate-300">{src.intervalMin}min</td>
                <td className="p-3 text-sm text-slate-300">{(src.reliability * 100).toFixed(0)}%</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEditSource(src)} className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded text-xs">编辑</button>
                    <button onClick={() => deleteSource(src.id)} className="px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs">删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ========== Tab: Schedule ==========
  const ScheduleTab = () => (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="font-semibold text-white mb-4">自动采集调度</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-300">启用自动采集</span>
              <button onClick={() => setSchedule(p => ({ ...p, enabled: !p.enabled }))}
                className={`w-11 h-6 rounded-full relative transition-colors ${schedule.enabled ? 'bg-green-600' : 'bg-slate-600'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${schedule.enabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">基准采集频率 (分钟)</label>
              <select value={schedule.baseInterval} onChange={e => setSchedule(p => ({ ...p, baseInterval: +e.target.value }))}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                <option value={5}>5 分钟</option><option value={10}>10 分钟</option>
                <option value={15}>15 分钟</option><option value={30}>30 分钟</option><option value={60}>60 分钟</option>
              </select>
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="font-semibold text-white mb-4">预警级别采集频率</h3>
          <p className="text-xs text-slate-400 mb-4">不同预警级别触发不同的采集间隔，越紧急频率越高</p>
          <div className="space-y-3">
            {[
              { key: 'redInterval', label: '红色预警 (立即危险)', color: 'text-red-400', icon: '🔴' },
              { key: 'orangeInterval', label: '橙色预警 (警告)', color: 'text-orange-400', icon: '🟠' },
              { key: 'yellowInterval', label: '黄色预警 (注意)', color: 'text-yellow-400', icon: '🟡' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <span className={`text-sm ${item.color}`}>{item.label}</span>
                <select value={(schedule as any)[item.key]} onChange={e => setSchedule(p => ({ ...p, [item.key]: +e.target.value }))}
                  className="w-28 px-2 py-1.5 bg-slate-700 border border-slate-600 rounded text-white text-sm">
                  <option value={3}>3 min</option><option value={5}>5 min</option><option value={10}>10 min</option>
                  <option value={15}>15 min</option><option value={30}>30 min</option><option value={60}>60 min</option>
                </select>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Btn onClick={handleScheduleSave} variant="success">保存调度配置</Btn>
      </div>

      {/* Pipeline visualization */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mt-6">
        <h3 className="font-semibold text-white mb-4">采集流水线</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {[
            { step: '1', label: '数据源轮询', desc: `${enabledCount} 个源`, color: 'bg-blue-600' },
            { step: '2', label: 'RSS/API 拉取', desc: '增量抓取', color: 'bg-cyan-600' },
            { step: '3', label: 'AI 情报分析', desc: 'qwen3-vl', color: 'bg-purple-600' },
            { step: '4', label: '去重校验', desc: 'source_url', color: 'bg-yellow-600' },
            { step: '5', label: '入库发布', desc: 'alerts 表', color: 'bg-green-600' },
            { step: '6', label: '用户推送', desc: 'FCM+SMS', color: 'bg-red-600' },
          ].map((p, i) => (
            <React.Fragment key={p.step}>
              {i > 0 && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>}
              <div className={`${p.color} rounded-lg px-3 py-2`}>
                <div className="text-white font-medium">{p.step}. {p.label}</div>
                <div className="text-white/60">{p.desc}</div>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );

  // ========== Tab: Logs ==========
  const LogsTab = () => (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="text-slate-400 text-sm">{logs.length} 条记录</div>
        <Btn onClick={clearLogs} variant="danger">清空日志</Btn>
      </div>
      {logs.length === 0 ? (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center text-slate-400 text-sm">
          暂无采集日志。触发采集操作后日志将在此显示。
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-slate-700">
              <th className="text-left p-3 text-xs font-medium text-slate-400">时间</th>
              <th className="text-left p-3 text-xs font-medium text-slate-400">来源/操作</th>
              <th className="text-left p-3 text-xs font-medium text-slate-400">结果</th>
              <th className="text-left p-3 text-xs font-medium text-slate-400">耗时</th>
              <th className="text-left p-3 text-xs font-medium text-slate-400">备注</th>
            </tr></thead>
            <tbody>
              {logs.slice(0, 50).map((log, i) => (
                <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="p-3 text-xs text-slate-300">{fmt(log.ts)}</td>
                  <td className="p-3 text-xs text-white font-mono">{log.source}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${log.result === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {log.result === 'success' ? '成功' : '失败'}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-slate-300">{log.duration}ms</td>
                  <td className="p-3 text-xs text-slate-400 max-w-[200px] truncate">{log.msg || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ========== Source Edit/Add Modal ==========
  const SourceFormModal = () => (
    <Modal title={editSource ? `编辑: ${editSource.name}` : '添加数据源'} onClose={() => { setEditSource(null); setShowAddSource(false); }}>
      <form onSubmit={handleSaveSource}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-slate-400 mb-1">名称</label>
            <input type="text" value={fName} onChange={e => setFName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="如 GDACS Global" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">类型</label>
              <select value={fType} onChange={e => setFType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
                <option value="api">API</option><option value="rss">RSS</option><option value="webhook">Webhook</option><option value="ai">AI</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">地区/国家</label>
              <input type="text" value={fCountry} onChange={e => setFCountry(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" placeholder="如 Global" required />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">端点 URL</label>
            <input type="text" value={fUrl} onChange={e => setFUrl(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm font-mono" placeholder="api.example.com" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-slate-400 mb-1">采集间隔 (分钟)</label>
              <input type="number" value={fInterval} onChange={e => setFInterval(+e.target.value)} min={1} max={1440}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">可靠度 (0-1)</label>
              <input type="number" value={fReliability} onChange={e => setFReliability(+e.target.value)} min={0} max={1} step={0.05}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <Btn onClick={() => { setEditSource(null); setShowAddSource(false); }} variant="secondary">取消</Btn>
          <button type="submit" className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors">
            {editSource ? '保存修改' : '添加数据源'}
          </button>
        </div>
      </form>
    </Modal>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">AI 采集管理</h2>
        <button onClick={() => { reload(); loadStats(); }} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300 transition-colors">刷新</button>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 mb-6 bg-slate-800 rounded-lg p-1 border border-slate-700">
        {([
          { key: 'status', label: '实时状态' },
          { key: 'sources', label: '数据源管理' },
          { key: 'schedule', label: '采集调度' },
          { key: 'logs', label: '采集日志' },
        ] as { key: typeof tab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-md text-sm transition-colors ${tab === t.key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'status' && <StatusTab />}
      {tab === 'sources' && <SourcesTab />}
      {tab === 'schedule' && <ScheduleTab />}
      {tab === 'logs' && <LogsTab />}

      {(editSource || showAddSource) && <SourceFormModal />}
    </div>
  );
}

// ==================== Admin Management Sub-page ====================
function AdminManagement() {
  const adminCtx = useAdmin();
  const showToast = adminCtx.showToast;
  const currentAdmin = adminCtx.currentAdmin;
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editAccount, setEditAccount] = useState<AdminAccount | null>(null);
  const [showPwdModal, setShowPwdModal] = useState<AdminAccount | null>(null);

  // Form state
  const [formUser, setFormUser] = useState('');
  const [formPwd, setFormPwd] = useState('');
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState<'superadmin' | 'admin' | 'viewer'>('admin');
  const [busy, setBusy] = useState(false);

  const reload = () => setAccounts(getAdminAccounts());
  useEffect(() => { reload(); }, []);

  const isSuperAdmin = currentAdmin?.role === 'superadmin';
  const roleName: Record<string, string> = { superadmin: '超级管理员', admin: '管理员', viewer: '只读' };
  const roleColor: Record<string, string> = { superadmin: 'bg-red-500/20 text-red-400', admin: 'bg-blue-500/20 text-blue-400', viewer: 'bg-slate-500/20 text-slate-400' };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    if (formUser.length < 2) { showToast('用户名至少2位'); setBusy(false); return; }
    if (formPwd.length < 6) { showToast('密码至少6位'); setBusy(false); return; }
    const all = getAdminAccounts();
    if (all.find(a => a.username === formUser)) { showToast('用户名已存在'); setBusy(false); return; }
    const hash = await hashPwd(formPwd);
    const newAcc: AdminAccount = {
      id: 'admin-' + Date.now(),
      username: formUser,
      passwordHash: hash,
      displayName: formName || formUser,
      role: formRole,
      createdAt: new Date().toISOString(),
    };
    all.push(newAcc);
    saveAdminAccounts(all.filter(a => a.id !== 'default-admin'));
    showToast('账户已创建: ' + formUser);
    setShowAddModal(false); setFormUser(''); setFormPwd(''); setFormName(''); setFormRole('admin');
    reload(); setBusy(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    if (!editAccount) { setBusy(false); return; }
    const all = getAdminAccounts();
    const idx = all.findIndex(a => a.id === editAccount.id);
    if (idx < 0) { showToast('账户不存在'); setBusy(false); return; }
    all[idx] = { ...all[idx], displayName: formName || all[idx].displayName, role: formRole };
    saveAdminAccounts(all.filter(a => a.id !== 'default-admin'));
    showToast('已更新: ' + all[idx].username);
    setEditAccount(null); reload(); setBusy(false);
  };

  const handleChangePwd = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    if (!showPwdModal) { setBusy(false); return; }
    if (formPwd.length < 6) { showToast('密码至少6位'); setBusy(false); return; }
    const all = getAdminAccounts();
    const idx = all.findIndex(a => a.id === showPwdModal.id);
    if (idx < 0) { showToast('账户不存在'); setBusy(false); return; }
    all[idx].passwordHash = await hashPwd(formPwd);
    saveAdminAccounts(all.filter(a => a.id !== 'default-admin'));
    showToast('密码已更新');
    setShowPwdModal(null); setFormPwd(''); reload(); setBusy(false);
  };

  const handleDelete = (acc: AdminAccount) => {
    if (accounts.length <= 1) { showToast('至少保留一个管理员账户'); return; }
    if (acc.id === currentAdmin?.id) { showToast('不能删除当前登录账户'); return; }
    if (!confirm(`确认删除账户 "${acc.username}" ?`)) return;
    const all = getAdminAccounts().filter(a => a.id !== acc.id);
    saveAdminAccounts(all.filter(a => a.id !== 'default-admin'));
    showToast('已删除: ' + acc.username);
    reload();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">管理员管理</h2>
        <Btn onClick={() => { setFormUser(''); setFormPwd(''); setFormName(''); setFormRole('admin'); setShowAddModal(true); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          新建账户
        </Btn>
      </div>

      {!isSuperAdmin && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mb-6 text-yellow-400 text-xs">
          提示：当前角色为「{roleName[currentAdmin?.role || 'admin']}」，部分操作需要「超级管理员」权限。
        </div>
      )}

      {/* Account list */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-slate-700">
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">用户名</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">显示名</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">角色</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">创建时间</th>
            <th className="text-right p-4 text-xs font-medium text-slate-400 uppercase">操作</th>
          </tr></thead>
          <tbody>
            {accounts.map(acc => (
              <tr key={acc.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600/20 rounded-full flex items-center justify-center text-blue-400 font-bold text-xs">
                      {acc.displayName[0].toUpperCase()}
                    </div>
                    <span className="text-sm text-white font-mono">{acc.username}</span>
                    {acc.id === currentAdmin?.id && <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px]">当前</span>}
                  </div>
                </td>
                <td className="p-4 text-sm text-slate-300">{acc.displayName}</td>
                <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${roleColor[acc.role] || roleColor.admin}`}>{roleName[acc.role] || acc.role}</span></td>
                <td className="p-4 text-sm text-slate-400">{new Date(acc.createdAt).toLocaleDateString('zh-CN')}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => { setEditAccount(acc); setFormName(acc.displayName); setFormRole(acc.role); }}
                      className="px-2.5 py-1 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded text-xs transition-colors">编辑</button>
                    <button onClick={() => { setShowPwdModal(acc); setFormPwd(''); }}
                      className="px-2.5 py-1 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 rounded text-xs transition-colors">改密</button>
                    <button onClick={() => handleDelete(acc)}
                      className="px-2.5 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded text-xs transition-colors">删除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add modal */}
      {showAddModal && (
        <Modal title="新建管理员账户" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAdd}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">用户名</label>
                <input type="text" value={formUser} onChange={e => setFormUser(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" placeholder="登录用户名" required />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">密码</label>
                <input type="password" value={formPwd} onChange={e => setFormPwd(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" placeholder="至少6位" required />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">显示名称</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" placeholder="可选，默认与用户名相同" />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">角色</label>
                <select value={formRole} onChange={e => setFormRole(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="superadmin">超级管理员 - 全部权限</option>
                  <option value="admin">管理员 - 数据管理</option>
                  <option value="viewer">只读 - 仅查看</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Btn onClick={() => setShowAddModal(false)} variant="secondary">取消</Btn>
              <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50">
                {busy ? '创建中...' : '创建账户'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editAccount && (
        <Modal title={`编辑: ${editAccount.username}`} onClose={() => setEditAccount(null)}>
          <form onSubmit={handleEdit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">显示名称</label>
                <input type="text" value={formName} onChange={e => setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" required />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">角色</label>
                <select value={formRole} onChange={e => setFormRole(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
                  <option value="superadmin">超级管理员</option>
                  <option value="admin">管理员</option>
                  <option value="viewer">只读</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Btn onClick={() => setEditAccount(null)} variant="secondary">取消</Btn>
              <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50">保存</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Change password modal */}
      {showPwdModal && (
        <Modal title={`修改密码: ${showPwdModal.username}`} onClose={() => setShowPwdModal(null)}>
          <form onSubmit={handleChangePwd}>
            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">新密码</label>
              <input type="password" value={formPwd} onChange={e => setFormPwd(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" placeholder="至少6位" required />
            </div>
            <div className="flex gap-3">
              <Btn onClick={() => setShowPwdModal(null)} variant="secondary">取消</Btn>
              <button type="submit" disabled={busy} className="flex-1 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50">
                {busy ? '更新中...' : '确认修改'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
