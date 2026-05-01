import React, { useState, useEffect } from 'react';
import { useAdmin, fmt, stBadge, SearchBar, FilterBtn, Btn, DetailRow, StatCard, Modal } from '../App';

interface Plan {
  id: string;
  name: string;
  name_en: string;
  price: number;
  currency: string;
  duration_days: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const emptyPlan: Omit<Plan, 'created_at' | 'updated_at'> = {
  id: '', name: '', name_en: '', price: 0, currency: 'CNY',
  duration_days: 30, features: [], is_active: true, sort_order: 0,
};

export default function SubscriptionMgmtPage({ sub }: { sub: string }) {
  const { supabase, showToast } = useAdmin();
  const [subs, setSubs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [search, setSearch] = useState('');
  const [detail, setDetail] = useState<any>(null);
  const [editPlan, setEditPlan] = useState<Omit<Plan, 'created_at' | 'updated_at'> | null>(null);
  const [isNewPlan, setIsNewPlan] = useState(false);
  const [featInput, setFeatInput] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [sub]);

  const load = async () => {
    if (sub === 'plans') {
      const { data } = await supabase.from('subscription_plans').select('*').order('sort_order', { ascending: true });
      setPlans((data || []) as Plan[]);
    } else {
      const { data: s } = await supabase.from('subscriptions').select('*').order('created_at', { ascending: false }).limit(200);
      setSubs(s || []);
      const { data: o } = await supabase.from('subscription_orders').select('*').order('created_at', { ascending: false }).limit(200);
      setOrders(o || []);
    }
  };

  // ==================== Plans Management ====================
  if (sub === 'plans') {
    const openEdit = (plan: Plan) => {
      setEditPlan({ id: plan.id, name: plan.name, name_en: plan.name_en, price: plan.price, currency: plan.currency, duration_days: plan.duration_days, features: plan.features || [], is_active: plan.is_active, sort_order: plan.sort_order });
      setFeatInput('');
      setIsNewPlan(false);
    };

    const openNew = () => {
      setEditPlan({ ...emptyPlan });
      setFeatInput('');
      setIsNewPlan(true);
    };

    const savePlan = async () => {
      if (!editPlan) return;
      if (!editPlan.id.trim() || !editPlan.name.trim() || editPlan.price <= 0) {
        showToast('请填写完整信息（ID、名称、价格）');
        return;
      }
      setSaving(true);
      if (isNewPlan) {
        const { error } = await supabase.from('subscription_plans').insert({
          id: editPlan.id, name: editPlan.name, name_en: editPlan.name_en,
          price: editPlan.price, currency: editPlan.currency, duration_days: editPlan.duration_days,
          features: editPlan.features, is_active: editPlan.is_active, sort_order: editPlan.sort_order,
        });
        if (error) { showToast('创建失败: ' + error.message); setSaving(false); return; }
        showToast('方案创建成功');
      } else {
        const { error } = await supabase.from('subscription_plans').update({
          name: editPlan.name, name_en: editPlan.name_en,
          price: editPlan.price, currency: editPlan.currency, duration_days: editPlan.duration_days,
          features: editPlan.features, is_active: editPlan.is_active, sort_order: editPlan.sort_order,
          updated_at: new Date().toISOString(),
        }).eq('id', editPlan.id);
        if (error) { showToast('更新失败: ' + error.message); setSaving(false); return; }
        showToast('方案更新成功');
      }
      setSaving(false);
      setEditPlan(null);
      load();
    };

    const toggleActive = async (plan: Plan) => {
      const { error } = await supabase.from('subscription_plans').update({ is_active: !plan.is_active, updated_at: new Date().toISOString() }).eq('id', plan.id);
      if (error) { showToast('操作失败: ' + error.message); return; }
      showToast(plan.is_active ? '已停用' : '已启用');
      load();
    };

    const deletePlan = async (plan: Plan) => {
      if (!confirm(`确认删除方案「${plan.name}」？此操作不可恢复。`)) return;
      const { error } = await supabase.from('subscription_plans').delete().eq('id', plan.id);
      if (error) { showToast('删除失败: ' + error.message); return; }
      showToast('已删除');
      load();
    };

    const addFeature = () => {
      if (!featInput.trim() || !editPlan) return;
      setEditPlan({ ...editPlan, features: [...editPlan.features, featInput.trim()] });
      setFeatInput('');
    };

    const removeFeature = (idx: number) => {
      if (!editPlan) return;
      setEditPlan({ ...editPlan, features: editPlan.features.filter((_, i) => i !== idx) });
    };

    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">方案管理 ({plans.length})</h2>
          <div className="flex gap-3">
            <Btn variant="secondary" onClick={load}>刷新</Btn>
            <Btn onClick={openNew}>+ 新增方案</Btn>
          </div>
        </div>

        <div className="grid gap-4">
          {plans.map(plan => (
            <div key={plan.id} className={`bg-slate-800 rounded-xl border p-5 ${plan.is_active ? 'border-slate-700' : 'border-slate-700/50 opacity-60'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                    <span className="text-sm text-slate-400">({plan.name_en})</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${plan.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {plan.is_active ? '启用' : '停用'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-3xl font-bold text-blue-400">{plan.currency === 'CNY' ? '¥' : '$'}{Number(plan.price).toFixed(2)}</span>
                    <span className="text-sm text-slate-400">/ {plan.duration_days}天</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(plan.features || []).map((f, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">{f}</span>
                    ))}
                    {(!plan.features || plan.features.length === 0) && <span className="text-xs text-slate-500">暂无功能描述</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-2">
                    ID: <code className="text-slate-400">{plan.id}</code> | 排序: {plan.sort_order} | 更新: {fmt(plan.updated_at)}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
                  <button onClick={() => openEdit(plan)} className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg text-xs transition-colors">编辑</button>
                  <button onClick={() => toggleActive(plan)} className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${plan.is_active ? 'bg-orange-600/20 hover:bg-orange-600/40 text-orange-400' : 'bg-green-600/20 hover:bg-green-600/40 text-green-400'}`}>
                    {plan.is_active ? '停用' : '启用'}
                  </button>
                  <button onClick={() => deletePlan(plan)} className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-xs transition-colors">删除</button>
                </div>
              </div>
            </div>
          ))}
          {plans.length === 0 && <div className="text-center text-slate-500 py-12 bg-slate-800 rounded-xl border border-slate-700">暂无订阅方案，点击「新增方案」创建</div>}
        </div>

        {editPlan && (
          <Modal title={isNewPlan ? '新增订阅方案' : '编辑订阅方案'} onClose={() => setEditPlan(null)}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">方案ID <span className="text-red-400">*</span></label>
                  <input value={editPlan.id} onChange={e => setEditPlan({ ...editPlan, id: e.target.value })} disabled={!isNewPlan}
                    placeholder="如: personal" className={`w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 ${!isNewPlan ? 'opacity-50 cursor-not-allowed' : ''}`} />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">排序</label>
                  <input type="number" value={editPlan.sort_order} onChange={e => setEditPlan({ ...editPlan, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">中文名称 <span className="text-red-400">*</span></label>
                  <input value={editPlan.name} onChange={e => setEditPlan({ ...editPlan, name: e.target.value })}
                    placeholder="如: 个人月卡" className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">英文名称</label>
                  <input value={editPlan.name_en} onChange={e => setEditPlan({ ...editPlan, name_en: e.target.value })}
                    placeholder="如: Personal Monthly" className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">价格 <span className="text-red-400">*</span></label>
                  <input type="number" step="0.01" min="0" value={editPlan.price} onChange={e => setEditPlan({ ...editPlan, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">货币</label>
                  <select value={editPlan.currency} onChange={e => setEditPlan({ ...editPlan, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500">
                    <option value="CNY">CNY (人民币)</option>
                    <option value="USD">USD (美元)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">有效期 (天)</label>
                  <input type="number" min="1" value={editPlan.duration_days} onChange={e => setEditPlan({ ...editPlan, duration_days: parseInt(e.target.value) || 30 })}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">功能特性</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editPlan.features.map((f, i) => (
                    <span key={i} className="flex items-center gap-1 px-2 py-1 bg-slate-600 rounded text-xs text-white">
                      {f}
                      <button onClick={() => removeFeature(i)} className="ml-1 text-slate-400 hover:text-red-400">&times;</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={featInput} onChange={e => setFeatInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                    placeholder="输入功能描述，回车添加" className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500" />
                  <Btn variant="secondary" onClick={addFeature}>添加</Btn>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-slate-400">状态:</label>
                <button onClick={() => setEditPlan({ ...editPlan, is_active: !editPlan.is_active })}
                  className={`relative w-10 h-5 rounded-full transition-colors ${editPlan.is_active ? 'bg-blue-600' : 'bg-slate-600'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${editPlan.is_active ? 'left-5' : 'left-0.5'}`} />
                </button>
                <span className="text-sm text-white">{editPlan.is_active ? '启用' : '停用'}</span>
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
                <Btn variant="secondary" onClick={() => setEditPlan(null)}>取消</Btn>
                <Btn onClick={savePlan} disabled={saving}>{saving ? '保存中...' : '保存'}</Btn>
              </div>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  // ==================== Detail View ====================
  if (detail) {
    const d = detail;
    const isOrder = !!d.plan_id && !!d.final_price;
    return (
      <div>
        <button onClick={() => setDetail(null)} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-4">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg> 返回
        </button>
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h2 className="text-xl font-bold text-white mb-6">{isOrder ? '订单详情' : '订阅详情'}</h2>
          <DetailRow label="ID" value={d.id} />
          <DetailRow label="用户ID" value={d.user_id} />
          <DetailRow label="套餐" value={d.plan_id === 'personal_monthly' ? '个人月卡 ¥39.99' : d.plan_id === 'family_monthly' ? '家庭月卡 ¥99.99' : d.plan_id} />
          {isOrder ? <>
            <DetailRow label="原价" value={`¥${d.original_price}`} />
            <DetailRow label="实付" value={`¥${d.final_price}`} />
            <DetailRow label="邀请折扣" value={d.has_invite_discount ? `¥${d.discount_amount}` : '无'} />
            <DetailRow label="支付方式" value={d.payment_method} />
            <DetailRow label="外部订单号" value={d.external_order_id} />
            <DetailRow label="状态" value={d.status} />
            <DetailRow label="完成时间" value={fmt(d.completed_at)} />
          </> : <>
            <DetailRow label="状态" value={d.status} />
            <DetailRow label="自动续费" value={d.auto_renew ? '是' : '否'} />
            <DetailRow label="开始时间" value={fmt(d.started_at)} />
            <DetailRow label="到期时间" value={fmt(d.expires_at)} />
            {d.status === 'cancelled' && <DetailRow label="取消时间" value={fmt(d.updated_at)} />}
          </>}
          <DetailRow label="创建时间" value={fmt(d.created_at)} />
          <DetailRow label="更新时间" value={fmt(d.updated_at)} />
          {!isOrder && d.status === 'active' && (
            <div className="mt-6 pt-4 border-t border-slate-700 flex gap-3">
              <button onClick={async () => {
                if (!confirm(`确定要取消该用户的订阅吗？用户将保留权益至到期日。`)) return;
                const { error } = await supabase.from('subscriptions').update({
                  status: 'cancelled', auto_renew: false, updated_at: new Date().toISOString()
                }).eq('id', d.id);
                if (error) { showToast('取消失败: ' + error.message); return; }
                showToast('订阅已取消');
                setDetail({ ...d, status: 'cancelled', auto_renew: false });
                load();
              }} className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm transition-colors">
                取消订阅
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==================== Revenue Stats ====================
  if (sub === 'revenue') {
    const totalRevenue = orders.filter(o => o.status === 'completed').reduce((s, o) => s + (o.final_price || 0), 0);
    const totalDiscount = orders.reduce((s, o) => s + (o.discount_amount || 0), 0);
    const personalOrders = orders.filter(o => o.plan_id === 'personal_monthly');
    const familyOrders = orders.filter(o => o.plan_id === 'family_monthly');
    return (
      <div>
        <h2 className="text-xl font-bold text-white mb-6">收入统计</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="总收入" value={`¥${totalRevenue.toFixed(2)}`} color="from-green-600 to-green-800" />
          <StatCard label="总订单" value={orders.length} color="from-blue-600 to-blue-800" />
          <StatCard label="总折扣" value={`¥${totalDiscount.toFixed(2)}`} color="from-orange-600 to-orange-800" />
          <StatCard label="活跃订阅" value={subs.filter(s => s.status === 'active').length} color="from-purple-600 to-purple-800" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">套餐分布</h3>
            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
              <span className="text-sm text-slate-300">个人月卡 (¥39.99)</span>
              <span className="text-white font-medium">{personalOrders.length} 单</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-slate-700/50">
              <span className="text-sm text-slate-300">家庭月卡 (¥99.99)</span>
              <span className="text-white font-medium">{familyOrders.length} 单</span>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
            <h3 className="font-semibold text-white mb-4">订阅状态</h3>
            {['active','expired','cancelled'].map(s => (
              <div key={s} className="flex items-center justify-between py-3 border-b border-slate-700/50">
                <span className="text-sm text-slate-300">{{active:'活跃',expired:'已过期',cancelled:'已取消'}[s]}</span>
                <span className="text-white font-medium">{subs.filter(su => su.status === s).length}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ==================== Subscriptions / Orders List ====================
  const items = sub === 'orders' ? orders : subs;
  const filtered = items.filter(i => !search || JSON.stringify(i).toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-white">{sub === 'orders' ? '订单管理' : '订阅管理'} ({filtered.length})</h2>
        <Btn variant="secondary" onClick={load}>刷新</Btn>
      </div>
      <div className="flex gap-3 mb-4"><SearchBar value={search} onChange={setSearch} placeholder="搜索..." /></div>
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full"><thead><tr className="border-b border-slate-700">
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">ID</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">用户ID</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">套餐</th>
          {sub === 'orders' ? <>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">原价</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">实付</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">折扣</th>
          </> : <>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">自动续费</th>
            <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">到期时间</th>
          </>}
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">状态</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">时间</th>
          <th className="text-left p-4 text-xs font-medium text-slate-400 uppercase">操作</th>
        </tr></thead><tbody>
          {filtered.map(item => (
            <tr key={item.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
              <td className="p-4 text-sm text-white font-mono">{item.id.slice(0,8)}</td>
              <td className="p-4 text-sm text-slate-300 font-mono">{item.user_id.slice(0,12)}</td>
              <td className="p-4 text-sm text-slate-300">{item.plan_id === 'personal' ? '个人' : item.plan_id === 'family' ? '家庭' : item.plan_id}</td>
              {sub === 'orders' ? <>
                <td className="p-4 text-sm text-slate-300">¥{item.original_price}</td>
                <td className="p-4 text-sm text-white font-medium">¥{item.final_price}</td>
                <td className="p-4 text-sm">{item.has_invite_discount ? <span className="text-green-400">¥{item.discount_amount}</span> : '-'}</td>
              </> : <>
                <td className="p-4 text-sm">{item.auto_renew ? <span className="text-green-400">是</span> : <span className="text-slate-400">否</span>}</td>
                <td className="p-4 text-sm text-slate-400">{fmt(item.expires_at)}</td>
              </>}
              <td className="p-4"><span className={`px-2 py-1 rounded text-xs ${stBadge(item.status||'active')}`}>{item.status||'active'}</span></td>
              <td className="p-4 text-sm text-slate-400">{fmt(item.created_at)}</td>
              <td className="p-4"><div className="flex gap-2">
                <button onClick={() => setDetail(item)} className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-slate-300"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                {sub !== 'orders' && item.status === 'active' && (
                  <button onClick={async () => {
                    if (!confirm('确定取消此订阅？')) return;
                    const { error } = await supabase.from('subscriptions').update({ status: 'cancelled', auto_renew: false, updated_at: new Date().toISOString() }).eq('id', item.id);
                    if (error) { showToast('取消失败: ' + error.message); return; }
                    showToast('订阅已取消');
                    load();
                  }} className="p-1.5 bg-red-600/20 hover:bg-red-600/40 rounded text-red-400" title="取消订阅">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  </button>
                )}
              </div></td>
            </tr>
          ))}
        </tbody></table>
        {filtered.length === 0 && <div className="text-center text-slate-500 py-12">暂无数据</div>}
      </div>
    </div>
  );
}
