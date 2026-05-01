import React, { useState, useEffect, useCallback } from 'react';
import { useAdmin, fmt, Btn } from '../App';

// Demo data for when Supabase is not connected
const DEMO_CRAWL_SOURCES = [
  { source_name: 'ReliefWeb API', last_crawl_at: new Date().toISOString(), items_found: 12, avg_delay_seconds: 185, error: null },
  { source_name: 'GDACS Events', last_crawl_at: new Date(Date.now() - 300000).toISOString(), items_found: 3, avg_delay_seconds: 420, error: null },
  { source_name: 'ACLED Conflict Data', last_crawl_at: new Date(Date.now() - 900000).toISOString(), items_found: 28, avg_delay_seconds: 1260, error: null },
  { source_name: 'Israel Oref Alerts', last_crawl_at: new Date(Date.now() - 60000).toISOString(), items_found: 5, avg_delay_seconds: 15, error: null },
  { source_name: 'Ukraine Live Map', last_crawl_at: new Date(Date.now() - 120000).toISOString(), items_found: 8, avg_delay_seconds: 45, error: null },
];

const DEMO_TIME_ANALYSIS = {
  timeRange: '24h',
  analyzedAlerts: 156,
  delayStats: { average: 248, median: 120, p95: 890, p99: 2400, min: 8, max: 3600, unit: 'seconds' },
  bySource: {
    'ReliefWeb API': { count: 42, totalDelay: 7770, minDelay: 30, maxDelay: 900, avgDelay: 185 },
    'GDACS Events': { count: 18, totalDelay: 7560, minDelay: 60, maxDelay: 1200, avgDelay: 420 },
    'ACLED Conflict Data': { count: 35, totalDelay: 44100, minDelay: 300, maxDelay: 3600, avgDelay: 1260 },
    'Israel Oref Alerts': { count: 38, totalDelay: 570, minDelay: 5, maxDelay: 45, avgDelay: 15 },
    'Ukraine Live Map': { count: 23, totalDelay: 1035, minDelay: 10, maxDelay: 120, avgDelay: 45 },
  },
  byCountry: {
    'Ukraine': { count: 45, totalDelay: 6750, avgDelay: 150 },
    'Israel': { count: 38, totalDelay: 1140, avgDelay: 30 },
    'UAE': { count: 15, totalDelay: 3000, avgDelay: 200 },
    'Syria': { count: 18, totalDelay: 5400, avgDelay: 300 },
    'Iraq': { count: 12, totalDelay: 4800, avgDelay: 400 },
    'Yemen': { count: 8, totalDelay: 4000, avgDelay: 500 },
    'Sudan': { count: 7, totalDelay: 4200, avgDelay: 600 },
    'Lebanon': { count: 6, totalDelay: 1800, avgDelay: 300 },
  },
  bySeverity: {
    'red': { count: 42, avgDelay: 85 },
    'orange': { count: 68, avgDelay: 210 },
    'yellow': { count: 46, avgDelay: 480 },
  },
  performanceGrade: 'B',
  recommendations: [
    'Source "ACLED Conflict Data" has high average delay (1260s). Consider alternative data source.',
    'Source "ACLED Conflict Data" had outlier delay of 3600s. Check for connectivity issues.',
    'Average detection delay exceeds 5 minutes. Consider increasing crawl frequency.',
  ],
};

const DEMO_SHELTER_LOGS = [
  { id: '1', country: 'Ukraine', added: 3, updated: 12, removed: 1, errors: [], ai_response_summary: 'Processed 3 adds, 12 updates, 1 removes', created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: '2', country: 'Israel', added: 1, updated: 8, removed: 0, errors: [], ai_response_summary: 'Processed 1 adds, 8 updates, 0 removes', created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: '3', country: 'Syria', added: 5, updated: 15, removed: 2, errors: ['Timeout on White Helmets source'], ai_response_summary: 'Processed 5 adds, 15 updates, 2 removes', created_at: new Date(Date.now() - 86400000 * 3).toISOString() },
  { id: '4', country: 'UAE', added: 2, updated: 6, removed: 0, errors: [], ai_response_summary: 'Processed 2 adds, 6 updates, 0 removes', created_at: new Date(Date.now() - 86400000 * 4).toISOString() },
  { id: '5', country: 'Lebanon', added: 0, updated: 4, removed: 1, errors: [], ai_response_summary: 'Processed 0 adds, 4 updates, 1 removes', created_at: new Date(Date.now() - 86400000 * 5).toISOString() },
];

function formatDelay(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A': return 'text-green-400 bg-green-500/20';
    case 'B': return 'text-blue-400 bg-blue-500/20';
    case 'C': return 'text-yellow-400 bg-yellow-500/20';
    case 'D': return 'text-red-400 bg-red-500/20';
    default: return 'text-slate-400 bg-slate-500/20';
  }
}

function delayBarColor(seconds: number): string {
  if (seconds < 60) return 'bg-green-500';
  if (seconds < 300) return 'bg-blue-500';
  if (seconds < 900) return 'bg-yellow-500';
  return 'bg-red-500';
}

export default function AIWorkMgmtPage({ sub }: { sub: string }) {
  const { supabase, showToast } = useAdmin();
  const [crawlSources, setCrawlSources] = useState<any[]>([]);
  const [timeAnalysis, setTimeAnalysis] = useState<any>(null);
  const [shelterLogs, setShelterLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const loadData = useCallback(async () => {
    // Try loading from Supabase, fallback to demo data
    const { data: crawlData } = await supabase.from('alert_crawl_state').select('*').order('last_crawl_at', { ascending: false });
    setCrawlSources((crawlData && crawlData.length > 0) ? crawlData : DEMO_CRAWL_SOURCES);

    const { data: logData } = await supabase.from('shelter_update_logs').select('*').order('created_at', { ascending: false }).limit(20);
    setShelterLogs((logData && logData.length > 0) ? logData : DEMO_SHELTER_LOGS);

    setTimeAnalysis(DEMO_TIME_ANALYSIS);
    setLastRefresh(new Date().toLocaleTimeString('zh-CN'));
  }, [supabase]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  const invokeAction = async (functionName: string, action: string, label: string) => {
    setLoading(prev => ({ ...prev, [action]: true }));
    showToast(`${label} 执行中...`);
    try {
      const { data, error } = await supabase.functions.invoke(functionName, { body: { action } });
      if (error) throw error;
      showToast(`${label} 完成`);
      await loadData();
      return data;
    } catch (e: any) {
      showToast(`${label} 失败: ${e.message || 'Network error'}`);
    } finally {
      setLoading(prev => ({ ...prev, [action]: false }));
    }
  };

  // ===================== Sub: Monitor Dashboard =====================
  if (sub === 'monitor') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">AI 实时监控面板</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">最后刷新: {lastRefresh || '-'}</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="w-4 h-4 rounded" />
              <span className="text-sm text-slate-400">自动刷新 (30s)</span>
            </label>
            <Btn variant="secondary" onClick={loadData}>刷新</Btn>
          </div>
        </div>

        {/* Overall Status Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="text-xs text-slate-400 mb-1">监控数据源</div>
            <div className="text-2xl font-bold text-white">{crawlSources.length}</div>
            <div className="text-xs text-green-400 mt-1">{crawlSources.filter(s => !s.error).length} 在线</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="text-xs text-slate-400 mb-1">最近抓取项</div>
            <div className="text-2xl font-bold text-white">{crawlSources.reduce((s, c) => s + (c.items_found || 0), 0)}</div>
            <div className="text-xs text-blue-400 mt-1">本轮增量</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="text-xs text-slate-400 mb-1">平均延迟</div>
            <div className="text-2xl font-bold text-white">{formatDelay(Math.round(crawlSources.reduce((s, c) => s + (c.avg_delay_seconds || 0), 0) / Math.max(crawlSources.length, 1)))}</div>
            <div className="text-xs text-yellow-400 mt-1">检测延迟</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="text-xs text-slate-400 mb-1">性能评级</div>
            <div className={`text-2xl font-bold inline-block px-3 py-0.5 rounded-lg ${gradeColor(timeAnalysis?.performanceGrade || '-')}`}>{timeAnalysis?.performanceGrade || '-'}</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="text-xs text-slate-400 mb-1">错误</div>
            <div className="text-2xl font-bold text-white">{crawlSources.filter(s => s.error).length}</div>
            <div className={`text-xs mt-1 ${crawlSources.filter(s => s.error).length > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {crawlSources.filter(s => s.error).length > 0 ? '需要关注' : '全部正常'}
            </div>
          </div>
        </div>

        {/* Data Source Status Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">数据源状态</h3>
            <div className="flex gap-2">
              <Btn onClick={() => invokeAction('ai-alert', 'realtime_monitor', '实时监控')} disabled={loading['realtime_monitor']}>
                {loading['realtime_monitor'] ? '执行中...' : '触发实时监控'}
              </Btn>
              <Btn variant="secondary" onClick={() => invokeAction('ai-alert', 'incremental_crawl', '增量抓取')} disabled={loading['incremental_crawl']}>
                {loading['incremental_crawl'] ? '执行中...' : '增量抓取'}
              </Btn>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  <th className="pb-3 pr-4">数据源</th>
                  <th className="pb-3 pr-4">状态</th>
                  <th className="pb-3 pr-4">最后抓取</th>
                  <th className="pb-3 pr-4">发现项</th>
                  <th className="pb-3 pr-4">平均延迟</th>
                  <th className="pb-3">延迟可视化</th>
                </tr>
              </thead>
              <tbody>
                {crawlSources.map((src, i) => (
                  <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 pr-4 text-white font-medium">{src.source_name}</td>
                    <td className="py-3 pr-4">
                      {src.error ? (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">异常</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">正常</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-slate-300">{fmt(src.last_crawl_at)}</td>
                    <td className="py-3 pr-4 text-white font-medium">{src.items_found || 0}</td>
                    <td className="py-3 pr-4 text-white">{formatDelay(src.avg_delay_seconds || 0)}</td>
                    <td className="py-3 w-40">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${delayBarColor(src.avg_delay_seconds || 0)}`}
                            style={{ width: `${Math.min(100, (src.avg_delay_seconds || 0) / 36)}%` }} />
                        </div>
                        <span className={`text-xs ${(src.avg_delay_seconds || 0) < 60 ? 'text-green-400' : (src.avg_delay_seconds || 0) < 300 ? 'text-blue-400' : (src.avg_delay_seconds || 0) < 900 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {(src.avg_delay_seconds || 0) < 60 ? 'A' : (src.avg_delay_seconds || 0) < 300 ? 'B' : (src.avg_delay_seconds || 0) < 900 ? 'C' : 'D'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Error Details */}
        {crawlSources.some(s => s.error) && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-red-400 mb-3">异常数据源</h3>
            {crawlSources.filter(s => s.error).map((src, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-red-500/20 last:border-0">
                <span className="text-white">{src.source_name}</span>
                <span className="text-red-400 text-sm">{src.error}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ===================== Sub: Time Analysis =====================
  if (sub === 'timeAnalysis') {
    const analysis = timeAnalysis || DEMO_TIME_ANALYSIS;
    const maxSourceDelay = Math.max(...Object.values(analysis.bySource as Record<string, any>).map((s: any) => s.avgDelay), 1);
    const maxCountryDelay = Math.max(...Object.values(analysis.byCountry as Record<string, any>).map((c: any) => c.avgDelay), 1);

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">时间差分析 - 平台发布 vs 预警检测</h2>
          <div className="flex gap-2">
            <Btn onClick={() => invokeAction('ai-alert', 'time_analysis', '时间差分析')} disabled={loading['time_analysis']}>
              {loading['time_analysis'] ? '分析中...' : '运行分析'}
            </Btn>
            <Btn variant="secondary" onClick={loadData}>刷新</Btn>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 text-center">
            <div className="text-xs text-slate-400 mb-2">分析时段</div>
            <div className="text-2xl font-bold text-white">{analysis.timeRange}</div>
            <div className="text-xs text-slate-500 mt-1">{analysis.analyzedAlerts} 条预警</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 text-center">
            <div className="text-xs text-slate-400 mb-2">性能评级</div>
            <div className={`text-4xl font-bold inline-block px-4 py-1 rounded-xl ${gradeColor(analysis.performanceGrade)}`}>
              {analysis.performanceGrade}
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 text-center">
            <div className="text-xs text-slate-400 mb-2">平均延迟</div>
            <div className="text-2xl font-bold text-white">{formatDelay(analysis.delayStats.average)}</div>
            <div className="text-xs text-slate-500 mt-1">中位数: {formatDelay(analysis.delayStats.median)}</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 text-center">
            <div className="text-xs text-slate-400 mb-2">P95 / P99</div>
            <div className="text-lg font-bold text-white">{formatDelay(analysis.delayStats.p95)}</div>
            <div className="text-xs text-orange-400 mt-1">P99: {formatDelay(analysis.delayStats.p99)}</div>
          </div>
        </div>

        {/* Delay Distribution */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-6">
          <h3 className="font-semibold text-white mb-4">延迟分布概览</h3>
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: '最小', value: analysis.delayStats.min, color: 'text-green-400' },
              { label: '中位数', value: analysis.delayStats.median, color: 'text-blue-400' },
              { label: '平均', value: analysis.delayStats.average, color: 'text-cyan-400' },
              { label: 'P95', value: analysis.delayStats.p95, color: 'text-yellow-400' },
              { label: 'P99', value: analysis.delayStats.p99, color: 'text-orange-400' },
              { label: '最大', value: analysis.delayStats.max, color: 'text-red-400' },
            ].map((item, i) => (
              <div key={i} className="text-center p-3 bg-slate-700/30 rounded-lg">
                <div className="text-xs text-slate-400 mb-1">{item.label}</div>
                <div className={`text-lg font-bold ${item.color}`}>{formatDelay(item.value)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* By Source */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">按数据源延迟</h3>
            <div className="space-y-3">
              {Object.entries(analysis.bySource).sort((a: any, b: any) => a[1].avgDelay - b[1].avgDelay).map(([source, stats]: [string, any]) => (
                <div key={source}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300 truncate mr-2">{source}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium">{formatDelay(stats.avgDelay)}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${stats.avgDelay < 60 ? 'bg-green-500/20 text-green-400' : stats.avgDelay < 300 ? 'bg-blue-500/20 text-blue-400' : stats.avgDelay < 900 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                        {stats.count}条
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${delayBarColor(stats.avgDelay)}`}
                      style={{ width: `${(stats.avgDelay / maxSourceDelay) * 100}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>最小: {formatDelay(stats.minDelay)}</span>
                    <span>最大: {formatDelay(stats.maxDelay)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* By Country */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">按国家/地区延迟</h3>
            <div className="space-y-3">
              {Object.entries(analysis.byCountry).sort((a: any, b: any) => a[1].avgDelay - b[1].avgDelay).map(([country, stats]: [string, any]) => (
                <div key={country}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300">{country}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white font-medium">{formatDelay(stats.avgDelay)}</span>
                      <span className="text-xs text-slate-500">{stats.count}条</span>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${delayBarColor(stats.avgDelay)}`}
                      style={{ width: `${(stats.avgDelay / maxCountryDelay) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* By Severity */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-6">
          <h3 className="font-semibold text-white mb-4">按预警等级延迟</h3>
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(analysis.bySeverity).map(([sev, stats]: [string, any]) => (
              <div key={sev} className={`p-4 rounded-xl border ${sev === 'red' ? 'bg-red-500/10 border-red-500/30' : sev === 'orange' ? 'bg-orange-500/10 border-orange-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-medium ${sev === 'red' ? 'text-red-400' : sev === 'orange' ? 'text-orange-400' : 'text-yellow-400'}`}>
                    {sev === 'red' ? '红色/紧急' : sev === 'orange' ? '橙色/警告' : '黄色/提示'}
                  </span>
                  <span className="text-xs text-slate-400">{stats.count} 条</span>
                </div>
                <div className="text-2xl font-bold text-white">{formatDelay(stats.avgDelay)}</div>
                <div className="text-xs text-slate-400 mt-1">平均检测延迟</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="font-semibold text-white mb-4">AI 优化建议</h3>
          <div className="space-y-2">
            {analysis.recommendations.map((rec: string, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${rec.includes('Critical') || rec.includes('high') ? 'bg-red-500/20 text-red-400' : rec.includes('Excellent') ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                  {i + 1}
                </span>
                <span className="text-sm text-slate-300">{rec}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ===================== Sub: Shelter AI =====================
  if (sub === 'shelterAI') {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">避难所 AI 管理</h2>
          <div className="flex gap-2">
            <Btn onClick={() => invokeAction('shelter-ai', 'weekly_update', '全量更新')} disabled={loading['weekly_update']}>
              {loading['weekly_update'] ? '更新中...' : '触发全量更新'}
            </Btn>
            <Btn variant="secondary" onClick={loadData}>刷新</Btn>
          </div>
        </div>

        {/* Shelter AI Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <div className="text-xs text-slate-400 mb-1">监控国家</div>
            <div className="text-2xl font-bold text-white">8</div>
            <div className="text-xs text-green-400 mt-1">全部在线</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <div className="text-xs text-slate-400 mb-1">最近更新</div>
            <div className="text-2xl font-bold text-white">{shelterLogs.length > 0 ? shelterLogs.reduce((s, l) => s + l.added + l.updated, 0) : 0}</div>
            <div className="text-xs text-blue-400 mt-1">新增+更新</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <div className="text-xs text-slate-400 mb-1">更新频率</div>
            <div className="text-2xl font-bold text-white">每周</div>
            <div className="text-xs text-slate-500 mt-1">周一 03:00 UTC</div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <div className="text-xs text-slate-400 mb-1">错误次数</div>
            <div className="text-2xl font-bold text-white">{shelterLogs.reduce((s, l) => s + (l.errors?.length || 0), 0)}</div>
            <div className={`text-xs mt-1 ${shelterLogs.some(l => l.errors?.length > 0) ? 'text-yellow-400' : 'text-green-400'}`}>
              {shelterLogs.some(l => l.errors?.length > 0) ? '有待处理' : '全部正常'}
            </div>
          </div>
        </div>

        {/* Per-country trigger */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-6">
          <h3 className="font-semibold text-white mb-4">按国家触发更新</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Ukraine', 'Israel', 'UAE', 'Kuwait', 'Bahrain', 'Jordan', 'Haiti', 'Nigeria'].map(country => (
              <button key={country}
                onClick={() => {
                  setLoading(prev => ({ ...prev, [`update_${country}`]: true }));
                  supabase.functions.invoke('shelter-ai', { body: { action: 'weekly_update', country } })
                    .then(() => showToast(`${country} 更新完成`))
                    .catch(() => showToast(`${country} 更新失败`))
                    .finally(() => { setLoading(prev => ({ ...prev, [`update_${country}`]: false })); loadData(); });
                }}
                disabled={loading[`update_${country}`]}
                className="p-3 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm text-white transition-colors disabled:opacity-50">
                {loading[`update_${country}`] ? '更新中...' : country}
              </button>
            ))}
          </div>
        </div>

        {/* Update Logs */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="font-semibold text-white mb-4">更新日志</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-700">
                  <th className="pb-3 pr-4">时间</th>
                  <th className="pb-3 pr-4">国家</th>
                  <th className="pb-3 pr-4">新增</th>
                  <th className="pb-3 pr-4">更新</th>
                  <th className="pb-3 pr-4">移除</th>
                  <th className="pb-3 pr-4">错误</th>
                  <th className="pb-3">摘要</th>
                </tr>
              </thead>
              <tbody>
                {shelterLogs.map((log, i) => (
                  <tr key={log.id || i} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                    <td className="py-3 pr-4 text-slate-300">{fmt(log.created_at)}</td>
                    <td className="py-3 pr-4 text-white font-medium">{log.country}</td>
                    <td className="py-3 pr-4"><span className="text-green-400">+{log.added}</span></td>
                    <td className="py-3 pr-4"><span className="text-blue-400">{log.updated}</span></td>
                    <td className="py-3 pr-4"><span className="text-red-400">-{log.removed}</span></td>
                    <td className="py-3 pr-4">
                      {log.errors?.length > 0 ? (
                        <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">{log.errors.length}</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">0</span>
                      )}
                    </td>
                    <td className="py-3 text-slate-400 text-xs truncate max-w-[200px]">{log.ai_response_summary}</td>
                  </tr>
                ))}
                {shelterLogs.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-500">暂无更新日志</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ===================== Sub: Overview (default) =====================
  const analysis = timeAnalysis || DEMO_TIME_ANALYSIS;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">AI 工作总览</h2>
        <Btn variant="secondary" onClick={loadData}>刷新数据</Btn>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gradient-to-br from-blue-900/40 to-slate-800 rounded-xl border border-blue-500/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-blue-400">预警AI</h3>
            <span className={`text-2xl font-bold px-3 py-1 rounded-lg ${gradeColor(analysis.performanceGrade)}`}>{analysis.performanceGrade}</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">24h 分析预警</span><span className="text-white">{analysis.analyzedAlerts} 条</span></div>
            <div className="flex justify-between"><span className="text-slate-400">平均检测延迟</span><span className="text-white">{formatDelay(analysis.delayStats.average)}</span></div>
            <div className="flex justify-between"><span className="text-slate-400">数据源</span><span className="text-white">{crawlSources.length} 个</span></div>
            <div className="flex justify-between"><span className="text-slate-400">在线率</span><span className="text-green-400">{Math.round(crawlSources.filter(s => !s.error).length / Math.max(crawlSources.length, 1) * 100)}%</span></div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-900/40 to-slate-800 rounded-xl border border-green-500/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-green-400">避难所AI</h3>
            <span className="text-2xl font-bold px-3 py-1 rounded-lg bg-green-500/20 text-green-400">8</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">监控国家</span><span className="text-white">8 个</span></div>
            <div className="flex justify-between"><span className="text-slate-400">总避难所</span><span className="text-white">156 个</span></div>
            <div className="flex justify-between"><span className="text-slate-400">更新频率</span><span className="text-white">每周一次</span></div>
            <div className="flex justify-between"><span className="text-slate-400">最近变更</span><span className="text-white">{shelterLogs.length > 0 ? `+${shelterLogs[0].added} / ${shelterLogs[0].updated}更新` : '-'}</span></div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-900/40 to-slate-800 rounded-xl border border-purple-500/30 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-purple-400">快速操作</h3>
          </div>
          <div className="space-y-2">
            <button onClick={() => invokeAction('ai-alert', 'realtime_monitor', '实时监控')}
              className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-lg text-sm text-blue-400 transition-colors">
              触发实时监控
            </button>
            <button onClick={() => invokeAction('ai-alert', 'time_analysis', '时间差分析')}
              className="w-full py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-lg text-sm text-cyan-400 transition-colors">
              运行时间差分析
            </button>
            <button onClick={() => invokeAction('shelter-ai', 'weekly_update', '避难所更新')}
              className="w-full py-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 rounded-lg text-sm text-green-400 transition-colors">
              触发避难所更新
            </button>
            <button onClick={() => invokeAction('ai-alert', 'collect', '预警采集')}
              className="w-full py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-sm text-purple-400 transition-colors">
              触发预警采集
            </button>
            <button onClick={() => invokeAction('rescue-org', 'collect', '救援组织采集')}
              className="w-full py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 rounded-lg text-sm text-rose-400 transition-colors">
              采集救援组织
            </button>
          </div>
        </div>
      </div>

      {/* Recent Crawl Activity */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
        <h3 className="font-semibold text-white mb-4">最近数据源活动</h3>
        <div className="space-y-3">
          {crawlSources.map((src, i) => (
            <div key={i} className="flex items-center gap-4 p-3 bg-slate-700/30 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${src.error ? 'bg-red-400' : 'bg-green-400'}`} />
              <div className="flex-1">
                <div className="text-sm text-white">{src.source_name}</div>
                <div className="text-xs text-slate-500">{fmt(src.last_crawl_at)}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-white">{src.items_found || 0} 项</div>
                <div className={`text-xs ${(src.avg_delay_seconds || 0) < 120 ? 'text-green-400' : 'text-yellow-400'}`}>
                  延迟: {formatDelay(src.avg_delay_seconds || 0)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
