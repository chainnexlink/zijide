import React, { useState, useEffect } from 'react';
import { useAdmin, fmt, SearchBar, Btn, Modal, DetailRow } from '../App';

const TYPE_LABELS: Record<string, string> = { government: '政府机构', ngo: '红十字/NGO', international: '国际组织', military: '军事救援', medical: '医疗机构', volunteer: '志愿者组织' };
const TYPE_COLORS: Record<string, string> = { government: 'bg-blue-500/20 text-blue-400', ngo: 'bg-red-500/20 text-red-400', international: 'bg-cyan-500/20 text-cyan-400', military: 'bg-slate-500/20 text-slate-300', medical: 'bg-green-500/20 text-green-400', volunteer: 'bg-purple-500/20 text-purple-400' };
const SERVICE_LABELS: Record<string, string> = { emergency_medical: '急救医疗', search_rescue: '搜索救援', ambulance: '救护车', first_aid: '急救', disaster_response: '灾害响应', shelter: '避难所', food_distribution: '食物分发', medical: '医疗', education: '教育', emergency_relief: '紧急救济', firefighting: '消防', hazmat: '危险物质', disaster_management: '灾害管理', protection: '人道保护', family_reunification: '家庭团聚', water_supply: '供水', surgery: '外科手术', mental_health: '心理健康', trauma_care: '创伤护理', health_development: '卫生发展', training: '培训', emergency_response: '应急响应', health_coordination: '卫生协调', epidemic_response: '疫情响应', medical_supply: '医疗物资', demining: '排雷', evacuation: '疏散', blood_services: '血液服务', civil_defense: '民防', shelter_guidance: '避难指导', alert_system: '预警系统', coordination: '协调', needs_assessment: '需求评估', resource_mobilization: '资源动员', information_management: '信息管理', social_services: '社会服务', blood_donation: '献血', refugee_protection: '难民保护', legal_assistance: '法律援助', resettlement: '安置', funding: '筹款' };

const ALL_SERVICES = Object.keys(SERVICE_LABELS);

const STATIC_RESCUE_ORGS = [
  { id: 'ps-001', name: '巴勒斯坦红新月会', name_en: 'Palestine Red Crescent Society', type: 'ngo', country: 'Palestine', city: 'Gaza', phone: '+970-8-2863519', email: 'info@palestinercs.org', website: 'https://www.palestinercs.org', services: ['emergency_medical', 'search_rescue', 'ambulance', 'first_aid', 'disaster_response'], operating_hours: '24/7', is_active: true, last_verified: '2026-04-26', description: '巴勒斯坦最大的人道主义组织，提供紧急医疗救援、搜救和灾害响应服务', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'ps-002', name: '联合国近东救济工程处', name_en: 'UNRWA', type: 'international', country: 'Palestine', city: 'Gaza', phone: '+970-8-6777333', email: 'unrwa@unrwa.org', website: 'https://www.unrwa.org', services: ['shelter', 'food_distribution', 'medical', 'education', 'emergency_relief'], operating_hours: '08:00-17:00', is_active: true, last_verified: '2026-04-26', description: '为巴勒斯坦难民提供教育、医疗、社会服务和紧急援助', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'ps-003', name: '巴勒斯坦民防局', name_en: 'Palestinian Civil Defense', type: 'government', country: 'Palestine', city: 'Gaza', phone: '+970-8-2824444', email: 'civildefense@gov.ps', website: 'https://civildefense.ps', services: ['search_rescue', 'firefighting', 'hazmat', 'disaster_management'], operating_hours: '24/7', is_active: true, last_verified: '2026-04-26', description: '负责搜救、消防、危险物质处理和灾害管理的政府机构', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'ps-004', name: '国际红十字委员会-加沙', name_en: 'ICRC Gaza', type: 'international', country: 'Palestine', city: 'Gaza', phone: '+970-8-2824484', email: 'gaza.gaz@icrc.org', website: 'https://www.icrc.org', services: ['protection', 'family_reunification', 'medical', 'water_supply'], operating_hours: '08:00-17:00', is_active: true, last_verified: '2026-04-26', description: '在冲突地区提供人道保护和援助', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'ps-005', name: '无国界医生-巴勒斯坦', name_en: 'MSF Palestine', type: 'international', country: 'Palestine', city: 'Gaza', phone: '+970-8-2825837', email: 'msf-palestine@msf.org', website: 'https://www.msf.org', services: ['emergency_medical', 'surgery', 'mental_health', 'trauma_care'], operating_hours: '24/7', is_active: true, last_verified: '2026-04-26', description: '在加沙和约旦河西岸提供紧急医疗援助', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'ps-006', name: '巴勒斯坦医疗救济会', name_en: 'MAP', type: 'ngo', country: 'Palestine', city: 'Ramallah', phone: '+970-2-2987804', email: 'info@map.org.uk', website: 'https://www.map.org.uk', services: ['medical', 'health_development', 'training', 'emergency_response'], operating_hours: '08:00-16:00', is_active: true, last_verified: '2026-04-26', description: '为巴勒斯坦人提供医疗援助和卫生发展支持', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'ps-007', name: '世界卫生组织-巴勒斯坦', name_en: 'WHO OPT', type: 'international', country: 'Palestine', city: 'Ramallah', phone: '+970-2-2960592', email: 'emropt@who.int', website: 'https://www.emro.who.int/pse', services: ['health_coordination', 'epidemic_response', 'medical_supply'], operating_hours: '08:00-17:00', is_active: true, last_verified: '2026-04-26', description: '协调卫生紧急响应，支持卫生系统', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'ua-001', name: '乌克兰红十字会', name_en: 'Ukrainian Red Cross Society', type: 'ngo', country: 'Ukraine', city: 'Kyiv', phone: '+380-44-2352053', email: 'office@redcross.org.ua', website: 'https://redcross.org.ua', services: ['emergency_relief', 'medical', 'social_services', 'blood_donation'], operating_hours: '24/7', is_active: true, last_verified: '2026-04-26', description: '乌克兰最大的人道主义组织', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'ua-002', name: '乌克兰国家紧急服务局', name_en: 'State Emergency Service of Ukraine', type: 'government', country: 'Ukraine', city: 'Kyiv', phone: '101', email: 'dsns@dsns.gov.ua', website: 'https://dsns.gov.ua', services: ['search_rescue', 'firefighting', 'demining', 'evacuation'], operating_hours: '24/7', is_active: true, last_verified: '2026-04-26', description: '负责消防、搜救、排雷和紧急响应的国家机构', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'ua-003', name: '联合国人道主义协调办公室-乌克兰', name_en: 'OCHA Ukraine', type: 'international', country: 'Ukraine', city: 'Kyiv', phone: '+380-44-2539363', email: 'ocha-ukraine@un.org', website: 'https://www.unocha.org/ukraine', services: ['coordination', 'needs_assessment', 'resource_mobilization'], operating_hours: '08:00-18:00', is_active: true, last_verified: '2026-04-26', description: '协调人道主义响应', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'il-001', name: '以色列红大卫盾会', name_en: 'Magen David Adom', type: 'ngo', country: 'Israel', city: 'Tel Aviv', phone: '101', email: 'info@mdais.org', website: 'https://www.mdais.org', services: ['emergency_medical', 'ambulance', 'blood_services', 'disaster_response'], operating_hours: '24/7', is_active: true, last_verified: '2026-04-26', description: '以色列国家紧急医疗服务', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'il-002', name: '以色列国防军后方司令部', name_en: 'IDF Home Front Command', type: 'military', country: 'Israel', city: 'Tel Aviv', phone: '104', email: 'info@idf.il', website: 'https://www.oref.org.il', services: ['civil_defense', 'shelter_guidance', 'alert_system', 'evacuation'], operating_hours: '24/7', is_active: true, last_verified: '2026-04-26', description: '负责民防、紧急避难指导和火箭预警系统', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'sy-001', name: '叙利亚白盔组织', name_en: 'White Helmets', type: 'volunteer', country: 'Syria', city: 'Aleppo', phone: '+90-342-2200019', email: 'info@whitehelmets.org', website: 'https://www.whitehelmets.org', services: ['search_rescue', 'firefighting', 'emergency_medical'], operating_hours: '24/7', is_active: true, last_verified: '2026-04-26', description: '在叙利亚冲突区提供搜救和紧急服务的志愿者组织', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'sy-002', name: '叙利亚阿拉伯红新月会', name_en: 'SARC', type: 'ngo', country: 'Syria', city: 'Damascus', phone: '+963-11-2328981', email: 'info@sarc.sy', website: 'https://www.sarc.sy', services: ['emergency_relief', 'food_distribution', 'medical', 'shelter'], operating_hours: '24/7', is_active: true, last_verified: '2026-04-26', description: '叙利亚最大的人道主义组织', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'lb-001', name: '黎巴嫩红十字会', name_en: 'Lebanese Red Cross', type: 'ngo', country: 'Lebanon', city: 'Beirut', phone: '140', email: 'info@redcross.org.lb', website: 'https://www.redcross.org.lb', services: ['emergency_medical', 'ambulance', 'disaster_response'], operating_hours: '24/7', is_active: true, last_verified: '2026-04-26', description: '黎巴嫩主要紧急医疗和救援组织', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'iq-001', name: '伊拉克红新月会', name_en: 'Iraqi Red Crescent', type: 'ngo', country: 'Iraq', city: 'Baghdad', phone: '+964-1-5372364', email: 'info@ircs.org.iq', website: 'https://www.ircs.org.iq', services: ['emergency_relief', 'medical', 'food_distribution'], operating_hours: '24/7', is_active: true, last_verified: '2026-04-26', description: '伊拉克最大的人道主义组织', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'ye-001', name: '也门红新月会', name_en: 'Yemen Red Crescent', type: 'ngo', country: 'Yemen', city: 'Sanaa', phone: '+967-1-203131', email: 'info@yemenrcs.org', website: 'https://www.yemenrcs.org', services: ['emergency_relief', 'medical', 'food_distribution', 'water_supply'], operating_hours: '24/7', is_active: true, last_verified: '2026-04-26', description: '也门主要人道主义组织', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'sd-001', name: '苏丹红新月会', name_en: 'Sudanese Red Crescent', type: 'ngo', country: 'Sudan', city: 'Khartoum', phone: '+249-183-784832', email: 'info@srcs.sd', website: 'https://www.srcs.sd', services: ['emergency_relief', 'medical', 'food_distribution', 'water_supply'], operating_hours: '24/7', is_active: true, last_verified: '2026-04-26', description: '苏丹国家红十字运动组织', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'intl-001', name: '国际红十字与红新月运动', name_en: 'IFRC', type: 'international', country: 'International', city: 'Geneva', phone: '+41-22-7346001', email: 'secretariat@ifrc.org', website: 'https://www.ifrc.org', services: ['disaster_response', 'medical', 'shelter', 'water_supply', 'protection'], operating_hours: '24/7', is_active: true, last_verified: '2026-04-26', description: '全球最大的人道主义网络', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'intl-002', name: '联合国人道主义事务协调厅', name_en: 'UN OCHA', type: 'international', country: 'International', city: 'New York', phone: '+1-212-9631234', email: 'ocha@un.org', website: 'https://www.unocha.org', services: ['coordination', 'funding', 'information_management'], operating_hours: '24/7', is_active: true, last_verified: '2026-04-26', description: '协调全球人道主义紧急响应', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'intl-003', name: '无国界医生', name_en: 'MSF', type: 'international', country: 'International', city: 'Geneva', phone: '+41-22-8498400', email: 'office-gva@geneva.msf.org', website: 'https://www.msf.org', services: ['emergency_medical', 'surgery', 'epidemic_response', 'mental_health'], operating_hours: '24/7', is_active: true, last_verified: '2026-04-26', description: '在全球70多个国家提供紧急医疗援助', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
  { id: 'intl-004', name: '联合国难民署', name_en: 'UNHCR', type: 'international', country: 'International', city: 'Geneva', phone: '+41-22-7398111', email: 'info@unhcr.org', website: 'https://www.unhcr.org', services: ['refugee_protection', 'shelter', 'legal_assistance', 'resettlement'], operating_hours: '08:00-17:00', is_active: true, last_verified: '2026-04-26', description: '保护全球难民和流离失所者权益', created_at: '2026-04-25T00:00:00Z', updated_at: '2026-04-26T00:00:00Z' },
];

export default function RescueOrgMgmtPage({ sub }: { sub: string }) {
  const { supabase, showToast } = useAdmin();
  const [orgs, setOrgs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [aiSchedule, setAiSchedule] = useState({ enabled: true, frequency: 'weekly', lastRun: '2026-04-25T03:00:00Z', nextRun: '2026-05-02T03:00:00Z' });
  const [collecting, setCollecting] = useState<Record<string, boolean>>({});

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await supabase.from('rescue_organizations').select('*').order('created_at', { ascending: false });
    setOrgs((data && data.length > 0) ? data : STATIC_RESCUE_ORGS as any[]);
  };

  const del = async (id: string) => {
    if (!confirm('确定删除该救援组织?')) return;
    await supabase.from('rescue_organizations').delete().eq('id', id);
    showToast('已删除');
    load();
  };

  const triggerCollect = async (country?: string) => {
    const key = country || 'all';
    setCollecting(prev => ({ ...prev, [key]: true }));
    showToast(`${country || '全部国家'} 救援组织AI采集中...`);
    try {
      const { error } = await supabase.functions.invoke('rescue-org', { body: { action: country ? 'collect_country' : 'collect', country } });
      if (error) throw error;
      showToast(`${country || '全部国家'} 采集完成`);
      await load();
    } catch (e: any) {
      showToast(`采集失败: ${e.message || 'Network error'}`);
    } finally { setCollecting(prev => ({ ...prev, [key]: false })); }
  };

  // ==================== Detail View ====================
  if (detail) {
    const d = detail;
    return (
      <div>
        <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> 返回列表
        </button>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-white">{d.name}</h2>
            <span className={`px-2 py-1 rounded text-xs ${TYPE_COLORS[d.type] || 'bg-slate-500/20 text-slate-400'}`}>{TYPE_LABELS[d.type] || d.type}</span>
            {d.is_active ? <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">活跃</span> : <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">停用</span>}
          </div>
          <div className="text-sm text-slate-400 mb-6">{d.name_en}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <DetailRow label="ID" value={d.id} />
              <DetailRow label="名称" value={d.name} />
              <DetailRow label="英文名" value={d.name_en} />
              <DetailRow label="国家" value={d.country} />
              <DetailRow label="城市" value={d.city} />
              <DetailRow label="联系电话" value={d.phone} />
              <DetailRow label="邮箱" value={d.email} />
              <DetailRow label="官网" value={d.website} />
            </div>
            <div>
              <DetailRow label="类型" value={TYPE_LABELS[d.type] || d.type} />
              <DetailRow label="工作时间" value={d.operating_hours} />
              <DetailRow label="状态" value={d.is_active ? '活跃' : '停用'} />
              <DetailRow label="最后验证" value={d.last_verified} />
              <DetailRow label="创建时间" value={fmt(d.created_at)} />
              <DetailRow label="更新时间" value={fmt(d.updated_at)} />
              <h3 className="font-semibold text-white mt-4 mb-2">服务类型</h3>
              <div className="flex flex-wrap gap-2">
                {d.services?.map((s: string) => <span key={s} className="px-2 py-1 bg-slate-600/50 text-slate-300 rounded text-xs">{SERVICE_LABELS[s] || s}</span>)}
              </div>
            </div>
          </div>
          {d.description && (
            <div className="mt-4 p-4 bg-slate-700/30 rounded-lg">
              <div className="text-xs text-slate-400 mb-2">描述</div>
              <div className="text-sm text-white">{d.description}</div>
            </div>
          )}
          <div className="flex gap-3 mt-6 pt-4 border-t border-slate-700">
            <Btn onClick={() => { setEditData(d); setShowForm(true); setDetail(null); }}>编辑</Btn>
            <Btn variant="danger" onClick={() => { del(d.id); setDetail(null); }}>删除</Btn>
          </div>
        </div>
      </div>
    );
  }

  // ==================== AI Schedule View ====================
  if (sub === 'aiSchedule') {
    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-6">AI 自动采集计划</h2>

        {/* Schedule Status */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white">每周自动采集</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={aiSchedule.enabled} onChange={e => setAiSchedule({ ...aiSchedule, enabled: e.target.checked })} className="w-4 h-4 rounded" />
              <span className="text-sm text-slate-300">{aiSchedule.enabled ? '已启用' : '已停用'}</span>
            </label>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-slate-700/30 rounded-lg">
              <div className="text-xs text-slate-400 mb-1">采集频率</div>
              <div className="text-lg font-bold text-white">每周一次</div>
              <div className="text-xs text-slate-500 mt-1">周一 03:00 UTC</div>
            </div>
            <div className="p-4 bg-slate-700/30 rounded-lg">
              <div className="text-xs text-slate-400 mb-1">上次执行</div>
              <div className="text-lg font-bold text-white">{fmt(aiSchedule.lastRun)}</div>
              <div className="text-xs text-green-400 mt-1">成功</div>
            </div>
            <div className="p-4 bg-slate-700/30 rounded-lg">
              <div className="text-xs text-slate-400 mb-1">下次执行</div>
              <div className="text-lg font-bold text-white">{fmt(aiSchedule.nextRun)}</div>
              <div className="text-xs text-blue-400 mt-1">计划中</div>
            </div>
            <div className="p-4 bg-slate-700/30 rounded-lg">
              <div className="text-xs text-slate-400 mb-1">覆盖国家</div>
              <div className="text-lg font-bold text-white">8 + 国际</div>
              <div className="text-xs text-slate-500 mt-1">全部冲突地区</div>
            </div>
          </div>
        </div>

        {/* Manual Trigger */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5 mb-6">
          <h3 className="font-semibold text-white mb-4">手动触发采集</h3>
          <div className="flex gap-3 mb-4">
            <Btn onClick={() => triggerCollect()} disabled={collecting['all']}>{collecting['all'] ? '采集中...' : 'AI 全量采集'}</Btn>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['Palestine', 'Ukraine', 'Israel', 'Syria', 'Lebanon', 'Iraq', 'Yemen', 'Sudan'].map(c => (
              <button key={c} onClick={() => triggerCollect(c)} disabled={collecting[c]}
                className={`p-3 border rounded-lg text-sm text-white transition-colors disabled:opacity-50 ${c === 'Palestine' ? 'bg-rose-600/20 hover:bg-rose-600/30 border-rose-500/30' : 'bg-slate-700/50 hover:bg-slate-700 border-slate-600'}`}>
                {collecting[c] ? '采集中...' : c}
              </button>
            ))}
          </div>
        </div>

        {/* AI Collect Process Description */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
          <h3 className="font-semibold text-white mb-4">采集流程说明</h3>
          <div className="space-y-3 text-sm">
            {[
              { step: '1', title: '数据源扫描', desc: 'AI 扫描各国官方救援机构网站、红十字/红新月官网、联合国人道主义数据库等' },
              { step: '2', title: '信息提取', desc: '提取组织名称、联系方式、服务类型、工作时间等关键信息' },
              { step: '3', title: '数据验证', desc: 'AI 交叉验证联系方式有效性，确认组织运营状态' },
              { step: '4', title: '更新入库', desc: '新增/更新/标记失效组织，保持数据时效性' },
              { step: '5', title: '通知同步', desc: '更新 Android 客户端本地数据，确保离线可用' },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-3 p-3 bg-slate-700/30 rounded-lg">
                <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 text-xs font-bold">{item.step}</span>
                <div>
                  <div className="text-white font-medium">{item.title}</div>
                  <div className="text-slate-400 mt-0.5">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==================== Statistics View ====================
  if (sub === 'statistics') {
    const countByCountry: Record<string, number> = {};
    const countByType: Record<string, number> = {};
    orgs.forEach(o => {
      countByCountry[o.country] = (countByCountry[o.country] || 0) + 1;
      countByType[o.type] = (countByType[o.type] || 0) + 1;
    });
    const activeCount = orgs.filter(o => o.is_active).length;
    const h247Count = orgs.filter(o => o.operating_hours === '24/7').length;

    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-6">救援组织统计</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5"><div className="text-xs text-slate-400 mb-1">总组织数</div><div className="text-2xl font-bold text-white">{orgs.length}</div></div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5"><div className="text-xs text-slate-400 mb-1">活跃组织</div><div className="text-2xl font-bold text-green-400">{activeCount}</div></div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5"><div className="text-xs text-slate-400 mb-1">24/7全天候</div><div className="text-2xl font-bold text-blue-400">{h247Count}</div></div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5"><div className="text-xs text-slate-400 mb-1">覆盖国家</div><div className="text-2xl font-bold text-white">{Object.keys(countByCountry).length}</div></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">按国家/地区分布</h3>
            {Object.entries(countByCountry).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2 border-b border-slate-700/50">
                <span className="text-sm text-slate-300">{k}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-slate-700 rounded-full h-2">
                    <div className={`h-2 rounded-full ${k === 'Palestine' ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${orgs.length ? v / orgs.length * 100 : 0}%` }} />
                  </div>
                  <span className="text-sm text-white w-8 text-right">{v}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">按组织类型分布</h3>
            {Object.entries(countByType).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2 border-b border-slate-700/50">
                <span className="text-sm text-slate-300">{TYPE_LABELS[k] || k}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-slate-700 rounded-full h-2">
                    <div className="h-2 rounded-full bg-cyan-500" style={{ width: `${orgs.length ? v / orgs.length * 100 : 0}%` }} />
                  </div>
                  <span className="text-sm text-white w-12 text-right">{v}/{orgs.length}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==================== List View (default) ====================
  const countries = [...new Set(orgs.map(o => o.country))].sort();
  const types = [...new Set(orgs.map(o => o.type))].sort();
  const filtered = orgs.filter(o => {
    if (filterCountry !== 'all' && o.country !== filterCountry) return false;
    if (filterType !== 'all' && o.type !== filterType) return false;
    if (search) { const q = search.toLowerCase(); return JSON.stringify(o).toLowerCase().includes(q); }
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">救援组织列表 ({orgs.length})</h2>
        <div className="flex gap-3">
          <Btn onClick={() => { setEditData(null); setShowForm(true); }}>+ 新增组织</Btn>
          <Btn variant="secondary" onClick={load}>刷新</Btn>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="搜索组织名/城市/电话/邮箱..." />
        <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)} className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2">
          <option value="all">全部国家</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-2">
          <option value="all">全部类型</option>
          {types.map(t => <option key={t} value={t}>{TYPE_LABELS[t] || t}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(o => (
          <div key={o.id} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white truncate">{o.name}</h3>
              <span className={`px-2 py-1 rounded text-xs shrink-0 ml-2 ${TYPE_COLORS[o.type] || 'bg-slate-500/20 text-slate-400'}`}>{TYPE_LABELS[o.type] || o.type}</span>
            </div>
            <div className="text-xs text-slate-500 mb-2">{o.name_en}</div>
            <div className="space-y-1 text-sm text-slate-400">
              <div>{o.country} · {o.city}</div>
              <div className="text-cyan-400 font-mono text-xs">{o.phone}</div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${o.operating_hours === '24/7' ? 'text-green-400' : 'text-slate-400'}`}>{o.operating_hours}</span>
                {o.is_active
                  ? <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">活跃</span>
                  : <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">停用</span>}
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {o.services?.slice(0, 3).map((s: string) => <span key={s} className="px-1.5 py-0.5 bg-slate-600/50 text-slate-300 rounded text-xs">{SERVICE_LABELS[s] || s}</span>)}
                {o.services?.length > 3 && <span className="px-1.5 py-0.5 bg-slate-600/50 text-slate-400 rounded text-xs">+{o.services.length - 3}</span>}
              </div>
            </div>
            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-700">
              <button onClick={() => setDetail(o)} className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300">详情</button>
              <button onClick={() => { setEditData(o); setShowForm(true); }} className="flex-1 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-sm text-slate-300">编辑</button>
              <button onClick={() => del(o.id)} className="py-1.5 px-3 bg-red-600/20 hover:bg-red-600/40 rounded text-sm text-red-400">删除</button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="col-span-full text-center text-slate-500 py-12">暂无救援组织</div>}
      </div>

      {showForm && <RescueOrgForm data={editData} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); load(); }} />}
    </div>
  );
}

function RescueOrgForm({ data, onClose, onSave }: { data: any; onClose: () => void; onSave: () => void }) {
  const { supabase, showToast } = useAdmin();
  const [f, setF] = useState({
    name: data?.name || '', name_en: data?.name_en || '', type: data?.type || 'ngo',
    country: data?.country || '', city: data?.city || '', phone: data?.phone || '',
    email: data?.email || '', website: data?.website || '', operating_hours: data?.operating_hours || '24/7',
    is_active: data?.is_active ?? true, description: data?.description || '',
    services: data?.services || [] as string[], last_verified: data?.last_verified || new Date().toISOString().split('T')[0],
  });

  const toggleService = (svc: string) => {
    setF(prev => ({
      ...prev,
      services: prev.services.includes(svc)
        ? prev.services.filter((s: string) => s !== svc)
        : [...prev.services, svc]
    }));
  };

  const submit = async () => {
    const payload = {
      name: f.name, name_en: f.name_en || null, type: f.type, country: f.country || null,
      city: f.city || null, phone: f.phone || null, email: f.email || null, website: f.website || null,
      operating_hours: f.operating_hours || null, is_active: f.is_active, description: f.description || null,
      services: f.services, last_verified: f.last_verified || null,
    };
    if (data?.id) {
      const { error } = await supabase.from('rescue_organizations').update(payload).eq('id', data.id);
      if (!error) { showToast('已更新'); onSave(); } else showToast('失败: ' + error.message);
    } else {
      const { error } = await supabase.from('rescue_organizations').insert(payload);
      if (!error) { showToast('已创建'); onSave(); } else showToast('失败: ' + error.message);
    }
  };

  return (
    <Modal title={data ? '编辑救援组织' : '新增救援组织'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm text-slate-400 mb-1">组织名称 *</label><input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-sm text-slate-400 mb-1">英文名</label><input value={f.name_en} onChange={e => setF({ ...f, name_en: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-sm text-slate-400 mb-1">国家</label><input value={f.country} onChange={e => setF({ ...f, country: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-sm text-slate-400 mb-1">城市</label><input value={f.city} onChange={e => setF({ ...f, city: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-sm text-slate-400 mb-1">类型</label>
            <select value={f.type} onChange={e => setF({ ...f, type: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm text-slate-400 mb-1">联系电话</label><input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-sm text-slate-400 mb-1">邮箱</label><input value={f.email} onChange={e => setF({ ...f, email: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm text-slate-400 mb-1">官网</label><input value={f.website} onChange={e => setF({ ...f, website: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
          <div><label className="block text-sm text-slate-400 mb-1">工作时间</label><input value={f.operating_hours} onChange={e => setF({ ...f, operating_hours: e.target.value })} placeholder="24/7 或 08:00-17:00" className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
        </div>
        <div><label className="block text-sm text-slate-400 mb-1">描述</label><textarea value={f.description} onChange={e => setF({ ...f, description: e.target.value })} rows={3} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm text-slate-400 mb-1">最后验证日期</label><input type="date" value={f.last_verified} onChange={e => setF({ ...f, last_verified: e.target.value })} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" /></div>
          <div className="flex items-end"><label className="flex items-center gap-2 cursor-pointer pb-2"><input type="checkbox" checked={f.is_active} onChange={e => setF({ ...f, is_active: e.target.checked })} className="w-4 h-4 rounded" /><span className="text-sm text-slate-300">活跃状态</span></label></div>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-2">服务类型</label>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {ALL_SERVICES.map(svc => (
              <label key={svc} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded cursor-pointer text-xs transition-colors ${f.services.includes(svc) ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50' : 'bg-slate-700/50 text-slate-400 border border-slate-600 hover:bg-slate-700'}`}>
                <input type="checkbox" checked={f.services.includes(svc)} onChange={() => toggleService(svc)} className="hidden" />
                {SERVICE_LABELS[svc] || svc}
              </label>
            ))}
          </div>
        </div>
        <Btn onClick={submit} disabled={!f.name} className="w-full justify-center">{data ? '保存' : '创建'}</Btn>
      </div>
    </Modal>
  );
}
