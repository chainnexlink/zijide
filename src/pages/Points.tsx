import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Coins,
  ArrowLeft,
  Gift,
  AlertTriangle,
  UserPlus,
  ShieldCheck,
  CreditCard,
  Home,
  Shield,
  Siren,
  Users,
  SlidersHorizontal
} from 'lucide-react';
import { supabase } from '../supabase/client';
import { useI18n } from '../hooks/useI18n';

interface PointTransaction {
  id: string;
  amount: number;
  type: string;
  reason: string | null;
  created_at: string | null;
}

export default function Points() {
  const { t } = useI18n();
  const [balance, setBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPoints();
    fetchTransactions();
  }, []);

  const fetchPoints = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('user_points')
      .select('*')
      .eq('user_id', user.id)
      .single();
    if (data) {
      setBalance(data.balance ?? 0);
      setTotalEarned(data.total_earned ?? 0);
      setTotalSpent(data.total_spent ?? 0);
    }
  };

  const fetchTransactions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setTransactions(data || []);
    setLoading(false);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'earn_rescue': return <ShieldCheck className="w-5 h-5 text-green-400" />;
      case 'earn_alert': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'earn_referral': return <UserPlus className="w-5 h-5 text-blue-400" />;
      case 'earn_admin': return <Gift className="w-5 h-5 text-purple-400" />;
      case 'spend_subscription': return <CreditCard className="w-5 h-5 text-red-400" />;
      default: return <Coins className="w-5 h-5 text-slate-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'earn_rescue': return t('pointsEarnRescue') || '救援奖励';
      case 'earn_alert': return t('pointsEarnAlert') || '预警贡献';
      case 'earn_referral': return t('pointsEarnReferral') || '邀请奖励';
      case 'earn_admin': return t('pointsEarnAdmin') || '平台奖励';
      case 'spend_subscription': return t('pointsSpendSub') || '抵扣订阅';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-24">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Link to="/settings" className="p-2 text-slate-400 hover:text-white">
                <ArrowLeft className="w-6 h-6" />
              </Link>
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">{t('myPoints') || '我的积分'}</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-8 mb-6 text-center"
          >
            <p className="text-slate-400 text-sm mb-2">{t('pointsBalance') || '当前积分'}</p>
            <p className="text-5xl font-bold text-amber-400 mb-4">{balance}</p>
            <p className="text-slate-400 text-xs">{t('pointsDesc') || '积分可抵扣订阅费用'}</p>
            <div className="flex items-center justify-center gap-8 mt-6">
              <div>
                <p className="text-green-400 font-semibold text-lg">+{totalEarned}</p>
                <p className="text-slate-500 text-xs">{t('totalEarned') || '累计获得'}</p>
              </div>
              <div className="w-px h-8 bg-slate-700" />
              <div>
                <p className="text-red-400 font-semibold text-lg">-{totalSpent}</p>
                <p className="text-slate-500 text-xs">{t('totalSpent') || '累计使用'}</p>
              </div>
            </div>
          </motion.div>

          {/* Transaction History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="text-sm font-medium text-slate-400 mb-3 px-1">{t('pointsHistory') || '积分明细'}</h3>
            {loading ? (
              <div className="text-center py-12 text-slate-500">{t('loading') || '加载中...'}</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12">
                <Coins className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500">{t('noPointsRecords') || '暂无积分记录'}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx, i) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 p-4 bg-slate-900 border border-slate-800 rounded-xl"
                  >
                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                      {getTypeIcon(tx.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{getTypeLabel(tx.type)}</p>
                      {tx.reason && (
                        <p className="text-xs text-slate-500 truncate">{tx.reason}</p>
                      )}
                      {tx.created_at && (
                        <p className="text-xs text-slate-600">{new Date(tx.created_at).toLocaleDateString()}</p>
                      )}
                    </div>
                    <span className={`font-bold text-lg ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-around py-2">
            <Link to="/dashboard" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white">
              <Home className="w-6 h-6" />
              <span className="text-xs">{t('home')}</span>
            </Link>
            <Link to="/shelters" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white">
              <Shield className="w-6 h-6" />
              <span className="text-xs">{t('shelters') || '避难所'}</span>
            </Link>
            <Link to="/dashboard" className="flex flex-col items-center gap-1 p-2 -mt-4">
              <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                <Siren className="w-7 h-7 text-white" />
              </div>
            </Link>
            <Link to="/family-settings" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white">
              <Users className="w-6 h-6" />
              <span className="text-xs">{t('family')}</span>
            </Link>
            <Link to="/settings" className="flex flex-col items-center gap-1 p-2 text-slate-400 hover:text-white">
              <SlidersHorizontal className="w-6 h-6" />
              <span className="text-xs">{t('settings')}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
